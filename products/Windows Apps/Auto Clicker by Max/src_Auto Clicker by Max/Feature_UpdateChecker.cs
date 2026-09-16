using System;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace ModernAutoClicker
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

    public static class UpdateChecker
    {
        public const string ProductWebPageUrl = "https://tranthangminh.github.io/products/auto-clicker.html";
        public const string DirectExeUrl = "https://tranthangminh.github.io/products/Windows%20Apps/Auto%20Clicker%20by%20Max.exe";

        private static bool _isChecking = false;

        public static void CheckForUpdatesAsync(bool isManual, Form ownerForm, Action<UpdateCheckResult> onCompleted = null)
        {
            if (_isChecking) return;

            // Frequency guard for automatic startup check (at most once per calendar day)
            if (!isManual)
            {
                try
                {
                    AppSettings settings = AppSettings.Load();
                    string today = DateTime.UtcNow.ToString("yyyy-MM-dd");
                    if (string.Equals(settings.LastUpdateCheckDate, today, StringComparison.OrdinalIgnoreCase))
                    {
                        return; // Already checked today
                    }
                }
                catch { }
            }

            _isChecking = true;

            ThreadPool.QueueUserWorkItem((state) =>
            {
                UpdateCheckResult result = new UpdateCheckResult
                {
                    LocalVersion = AppInfo.Version,
                    DownloadUrl = ProductWebPageUrl
                };

                try
                {
                    // CRITICAL for .NET 4.0: Force TLS 1.2 for HTTPS connections (GitHub Pages requires TLS 1.2)
                    ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072;

                    string html;
                    using (WebClient client = new WebClient())
                    {
                        client.Headers[HttpRequestHeader.UserAgent] = "AutoClickerByMax/" + AppInfo.Version;
                        client.Headers[HttpRequestHeader.Accept] = "text/html,application/xhtml+xml";
                        client.Encoding = System.Text.Encoding.UTF8;
                        html = client.DownloadString(ProductWebPageUrl);
                    }

                    string remoteVerStr = ExtractVersionFromHtml(html);
                    if (!string.IsNullOrEmpty(remoteVerStr))
                    {
                        result.RemoteVersion = remoteVerStr;
                        result.HasUpdate = IsRemoteNewer(remoteVerStr, AppInfo.Version);
                        result.Success = true;

                        // Save last checked date
                        try
                        {
                            AppSettings settings = AppSettings.Load();
                            settings.LastUpdateCheckDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
                            AppSettings.Save(settings);
                        }
                        catch { }
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

                // Dispatch to UI Thread
                if (ownerForm != null && !ownerForm.IsDisposed && ownerForm.IsHandleCreated)
                {
                    try
                    {
                        ownerForm.BeginInvoke(new Action(() =>
                        {
                            if (onCompleted != null)
                            {
                                onCompleted(result);
                            }

                            if (result.Success && result.HasUpdate)
                            {
                                ShowUpdateDialog(ownerForm, result.RemoteVersion);
                            }
                            else if (isManual)
                            {
                                if (result.Success && !result.HasUpdate)
                                {
                                    MessageBox.Show(ownerForm,
                                        string.Format("You are running the latest version (v{0}).\nNo updates found.", AppInfo.Version),
                                        "Auto Clicker - Up to Date",
                                        MessageBoxButtons.OK,
                                        MessageBoxIcon.Information);
                                }
                                else if (!result.Success)
                                {
                                    MessageBox.Show(ownerForm,
                                        "Unable to check for updates.\nPlease check your internet connection and try again.\n\nDetails: " + result.ErrorMessage,
                                        "Check for Updates",
                                        MessageBoxButtons.OK,
                                        MessageBoxIcon.Warning);
                                }
                            }
                        }));
                    }
                    catch { }
                }
            });
        }

        public static string ExtractVersionFromHtml(string html)
        {
            if (string.IsNullOrEmpty(html)) return null;

            // 1. First priority: meta tag <meta name="app-latest-version" content="X.X">
            Match metaMatch = Regex.Match(html, @"<meta\s+name=[""']app-latest-version[""']\s+content=[""'](?<v>[\d\.]+)[""']", RegexOptions.IgnoreCase);
            if (metaMatch.Success)
            {
                return metaMatch.Groups["v"].Value.Trim();
            }

            // 2. Second priority: title with vX.X e.g. Auto Clicker by Max v1.1
            Match titleMatch = Regex.Match(html, @"Auto\s+Clicker\s+by\s+Max\s+v(?<v>[\d\.]+)", RegexOptions.IgnoreCase);
            if (titleMatch.Success)
            {
                return titleMatch.Groups["v"].Value.Trim();
            }

            return null;
        }

        public static bool IsRemoteNewer(string remoteVerStr, string localVerStr)
        {
            try
            {
                Version remote = NormalizeVersion(remoteVerStr);
                Version local = NormalizeVersion(localVerStr);
                return remote > local;
            }
            catch
            {
                return false;
            }
        }

        public static Version NormalizeVersion(string verStr)
        {
            if (string.IsNullOrEmpty(verStr)) return new Version(0, 0);
            string[] parts = verStr.Split('.');
            if (parts.Length == 1) return new Version(int.Parse(parts[0]), 0);
            if (parts.Length == 2) return new Version(int.Parse(parts[0]), int.Parse(parts[1]));
            if (parts.Length == 3) return new Version(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]));
            return new Version(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]), int.Parse(parts[3]));
        }

        public static void ShowUpdateDialog(Form parent, string newVersion)
        {
            ThemeTokens theme = ThemeTokens.DarkTheme();

            using (Form dlg = new Form())
            {
                dlg.Text = "Update Available";
                dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
                dlg.MaximizeBox = false;
                dlg.MinimizeBox = false;
                dlg.StartPosition = FormStartPosition.CenterParent;
                dlg.BackColor = theme.BgPrimary;
                dlg.ForeColor = theme.TextPrimary;
                dlg.ClientSize = new Size(380, 180);
                dlg.ShowInTaskbar = false;

                Label lblHeader = new Label
                {
                    Text = "🚀 New Version Available!",
                    Location = new Point(20, 18),
                    AutoSize = true,
                    Font = ThemeTokens.FontSegoe(13F, FontStyle.Bold),
                    ForeColor = theme.AccentPrimary
                };

                Label lblDesc = new Label
                {
                    Text = string.Format("A new version (v{0}) of Auto Clicker by Max is now available!\nYour current version is v{1}.\n\nWould you like to visit the website to download it now?", newVersion, AppInfo.Version),
                    Location = new Point(20, 48),
                    Size = new Size(340, 68),
                    Font = ThemeTokens.FontSegoe(9.5F, FontStyle.Regular),
                    ForeColor = theme.TextPrimary
                };

                RoundedButton btnDownload = new RoundedButton
                {
                    Text = "Update Now",
                    Location = new Point(140, 130),
                    Size = new Size(110, 32),
                    BorderRadius = theme.RadiusMd,
                    NormalColor = theme.AccentPrimary,
                    HoverColor = theme.AccentPrimaryHover,
                    ForeColor = Color.White,
                    Font = ThemeTokens.FontSegoe(10F, FontStyle.Bold)
                };
                btnDownload.Click += (s, e) =>
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo(ProductWebPageUrl) { UseShellExecute = true });
                    }
                    catch { }
                    dlg.Close();
                };

                RoundedButton btnLater = new RoundedButton
                {
                    Text = "Later",
                    Location = new Point(260, 130),
                    Size = new Size(100, 32),
                    BorderRadius = theme.RadiusMd,
                    NormalColor = theme.BgTertiary,
                    HoverColor = theme.BgElevated,
                    ForeColor = theme.TextSecondary,
                    Font = ThemeTokens.FontSegoe(10F, FontStyle.Regular)
                };
                btnLater.Click += (s, e) => dlg.Close();

                dlg.Controls.AddRange(new Control[] { lblHeader, lblDesc, btnDownload, btnLater });
                dlg.ShowDialog(parent);
            }
        }
    }
}
