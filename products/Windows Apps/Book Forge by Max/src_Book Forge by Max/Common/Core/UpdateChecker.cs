using System;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace MaxApp.Common
{
    public class UpdateCheckResult
    {
        public bool Success { get; set; }
        public bool HasUpdate { get; set; }
        public string RemoteVersion { get; set; }
        public string LocalVersion { get; set; }
        public string DownloadUrl { get; set; }
        public string ErrorMessage { get; set; }
    }

    /// <summary>
    /// Lightweight, asynchronous remote update checker with Zero UI Freeze.
    /// Operates over HTTPS TLS 1.2, scraping version metadata from GitHub Pages without requiring dedicated backend servers.
    /// </summary>
    public static class UpdateChecker
    {
        private static bool _isChecking = false;
        private static string _inMemoryLastCheckDate = null;

        /// <summary>
        /// Optional delegate to retrieve the persistent last-checked date (format "yyyy-MM-dd") from app settings.
        /// </summary>
        public static Func<string> GetLastCheckDateHandler { get; set; }

        /// <summary>
        /// Optional delegate to save the persistent last-checked date to app settings.
        /// </summary>
        public static Action<string> SetLastCheckDateHandler { get; set; }

        /// <summary>
        /// Checks for updates in the background.
        /// </summary>
        /// <param name="isManual">If true, ignores daily rate limit and shows dialogs on completion.</param>
        /// <param name="ownerForm">The form to invoke callbacks and modal dialogs on.</param>
        /// <param name="onCompleted">Optional callback invoked with the result.</param>
        public static void CheckForUpdatesAsync(bool isManual, Form ownerForm, Action<UpdateCheckResult> onCompleted = null)
        {
            if (_isChecking) return;

            string today = DateTime.UtcNow.ToString("yyyy-MM-dd");

            // Daily rate limit for automatic background checks
            if (!isManual)
            {
                try
                {
                    string lastDate = GetLastCheckDateHandler != null
                        ? GetLastCheckDateHandler()
                        : _inMemoryLastCheckDate;

                    if (string.Equals(lastDate, today, StringComparison.OrdinalIgnoreCase))
                    {
                        return;
                    }
                }
                catch { }
            }

            _isChecking = true;

            ThreadPool.QueueUserWorkItem((state) =>
            {
                string targetUrl = string.Format("https://tranthangminh.github.io/products/{0}", AppInfo.WebsiteSlug);
                UpdateCheckResult result = new UpdateCheckResult
                {
                    LocalVersion = AppInfo.Version,
                    DownloadUrl = targetUrl
                };

                try
                {
                    // Force TLS 1.2 for .NET 4.x compatibility with GitHub Pages
                    ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072;

                    string html;
                    using (WebClient client = new WebClient())
                    {
                        client.Headers[HttpRequestHeader.UserAgent] = AppInfo.AppName + "/" + AppInfo.Version;
                        client.Headers[HttpRequestHeader.Accept] = "text/html,application/xhtml+xml";
                        client.Encoding = System.Text.Encoding.UTF8;
                        html = client.DownloadString(targetUrl);
                    }

                    string remoteVerStr = ExtractVersionFromHtml(html);
                    if (!string.IsNullOrEmpty(remoteVerStr))
                    {
                        result.RemoteVersion = remoteVerStr;
                        result.HasUpdate = IsRemoteNewer(remoteVerStr, AppInfo.Version);
                        result.Success = true;

                        _inMemoryLastCheckDate = today;
                        if (SetLastCheckDateHandler != null)
                        {
                            try { SetLastCheckDateHandler(today); } catch { }
                        }
                    }
                    else
                    {
                        result.Success = false;
                        result.ErrorMessage = "Could not parse version from web page.";
                    }
                }
                catch (Exception ex)
                {
                    result.Success = false;
                    result.ErrorMessage = ex.Message;
                }
                finally
                {
                    _isChecking = false;
                }

                if (ownerForm != null && ownerForm.IsHandleCreated)
                {
                    try
                    {
                        ownerForm.BeginInvoke(new Action(() =>
                        {
                            if (onCompleted != null)
                            {
                                onCompleted(result);
                            }

                            if (isManual)
                            {
                                ShowUpdateDialog(ownerForm, result);
                            }
                        }));
                    }
                    catch { }
                }
                else
                {
                    if (onCompleted != null)
                    {
                        onCompleted(result);
                    }
                }
            });
        }

        private static string ExtractVersionFromHtml(string html)
        {
            if (string.IsNullOrEmpty(html)) return null;

            // Priority 1: Specific meta tag
            string metaName = AppInfo.LatestVersionMetaTag;
            string patternMeta = string.Format(@"<meta\s+name=[""']{0}[""']\s+content=[""'](?<v>[\d\.]+)[""']", Regex.Escape(metaName));
            Match m = Regex.Match(html, patternMeta, RegexOptions.IgnoreCase);
            if (m.Success)
            {
                return m.Groups["v"].Value.Trim();
            }

            // Priority 2: Generic app-latest-version meta tag
            Match mGeneric = Regex.Match(html, @"<meta\s+name=[""']app-latest-version[""']\s+content=[""'](?<v>[\d\.]+)[""']", RegexOptions.IgnoreCase);
            if (mGeneric.Success)
            {
                return mGeneric.Groups["v"].Value.Trim();
            }

            // Priority 3: Title tag with version
            string patternTitle = string.Format(@"{0}\s+v(?<v>[\d\.]+)", Regex.Escape(AppInfo.AppName));
            Match mTitle = Regex.Match(html, patternTitle, RegexOptions.IgnoreCase);
            if (mTitle.Success)
            {
                return mTitle.Groups["v"].Value.Trim();
            }

            return null;
        }

        public static bool IsRemoteNewer(string remoteStr, string localStr)
        {
            try
            {
                Version remoteVer = NormalizeVersion(remoteStr);
                Version localVer = NormalizeVersion(localStr);
                return remoteVer > localVer;
            }
            catch
            {
                return false;
            }
        }

        private static Version NormalizeVersion(string verStr)
        {
            if (string.IsNullOrEmpty(verStr)) return new Version(0, 0);

            // Strip prefix 'v' or suffixes
            verStr = Regex.Replace(verStr.Trim(), @"^[vV]", "");
            Match m = Regex.Match(verStr, @"^\d+(\.\d+)*");
            if (m.Success) verStr = m.Value;

            string[] parts = verStr.Split('.');
            if (parts.Length == 1) return new Version(int.Parse(parts[0]), 0);
            if (parts.Length == 2) return new Version(int.Parse(parts[0]), int.Parse(parts[1]));
            if (parts.Length == 3) return new Version(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]));
            if (parts.Length >= 4) return new Version(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]), int.Parse(parts[3]));

            return new Version(0, 0);
        }

        private static void ShowUpdateDialog(Form owner, UpdateCheckResult result)
        {
            bool isVi = Loc.IsVietnamese;

            if (result.Success && result.HasUpdate)
            {
                string msg = isVi
                    ? string.Format("Đã có phiên bản mới {0} v{1}!\n(Phiên bản hiện tại của bạn: v{2})\n\nBạn có muốn mở trang tải về ngay bây giờ không?", AppInfo.AppName, result.RemoteVersion, result.LocalVersion)
                    : string.Format("A new version of {0} is available: v{1}!\n(Your current version: v{2})\n\nWould you like to open the download page now?", AppInfo.AppName, result.RemoteVersion, result.LocalVersion);

                string title = isVi ? "Cập Nhật Mới" : "Update Available";

                DialogResult dr = MessageBox.Show(owner, msg, title, MessageBoxButtons.YesNo, MessageBoxIcon.Information);
                if (dr == DialogResult.Yes)
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo(result.DownloadUrl) { UseShellExecute = true });
                    }
                    catch { }
                }
            }
            else if (result.Success && !result.HasUpdate)
            {
                string msg = isVi
                    ? string.Format("Bạn đang sử dụng phiên bản mới nhất ({0} v{1}).", AppInfo.AppName, result.LocalVersion)
                    : string.Format("You are running the latest version of {0} (v{1}).", AppInfo.AppName, result.LocalVersion);

                string title = isVi ? "Kiểm Tra Cập Nhật" : "Check for Updates";
                MessageBox.Show(owner, msg, title, MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                string msg = isVi
                    ? "Không thể kết nối đến máy chủ kiểm tra cập nhật.\nVui lòng kiểm tra lại kết nối mạng của bạn."
                    : "Unable to check for updates.\nPlease check your internet connection.";

                string title = isVi ? "Lỗi Kiểm Tra Cập Nhật" : "Update Check Failed";
                MessageBox.Show(owner, msg, title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
    }
}
