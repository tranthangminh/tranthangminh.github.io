using System;

namespace MaxApp.Common
{
    public enum AppLanguage
    {
        English = 0,
        Vietnamese = 1
    }

    /// <summary>
    /// Core Localization engine for MaxApp.Common.
    /// Provides language state management, event notification, and essential common UI strings.
    /// Application-specific strings can extend this class via partial classes in the same namespace.
    /// </summary>
    public static partial class Loc
    {
        private static AppLanguage _currentLanguage = AppLanguage.English;

        public static event Action OnLanguageChanged;

        public static AppLanguage CurrentLanguage
        {
            get { return _currentLanguage; }
            set
            {
                if (_currentLanguage != value)
                {
                    _currentLanguage = value;
                    if (OnLanguageChanged != null)
                    {
                        OnLanguageChanged();
                    }
                }
            }
        }

        public static bool IsVietnamese
        {
            get { return _currentLanguage == AppLanguage.Vietnamese; }
        }

        public static void SetLanguage(string langCode)
        {
            if (string.Equals(langCode, "vi", StringComparison.OrdinalIgnoreCase))
            {
                CurrentLanguage = AppLanguage.Vietnamese;
            }
            else
            {
                CurrentLanguage = AppLanguage.English;
            }
        }

        public static string CurrentLanguageCode
        {
            get { return _currentLanguage == AppLanguage.Vietnamese ? "vi" : "en"; }
        }

        // ========================================================
        // Common TitleBar & Window Controls
        // ========================================================
        public static string Close { get { return IsVietnamese ? "Đóng" : "Close"; } }
        public static string Minimize { get { return IsVietnamese ? "Thu nhỏ" : "Minimize"; } }
        public static string Maximize { get { return IsVietnamese ? "Phóng to" : "Maximize"; } }
        public static string Restore { get { return IsVietnamese ? "Khôi phục" : "Restore"; } }
        public static string SwitchToEn { get { return "Đổi sang Tiếng Anh (English)"; } }
        public static string SwitchToVi { get { return "Chuyển sang Tiếng Việt (Vietnamese)"; } }
        public static string SwitchToLight { get { return IsVietnamese ? "Chuyển sang Giao diện Sáng" : "Switch to Light Mode"; } }
        public static string SwitchToDark { get { return IsVietnamese ? "Chuyển sang Giao diện Tối" : "Switch to Dark Mode"; } }
        public static string AdminRunning { get { return IsVietnamese ? "Ứng dụng đang chạy với quyền Quản trị viên (Administrator)" : "Running with Administrator privileges"; } }
        public static string AdminRequest { get { return IsVietnamese ? "Chạy quyền Administrator (Bấm để khởi động lại)" : "Run as Administrator (Click to restart)"; } }
        public static string AdminRestartPrompt
        {
            get
            {
                return IsVietnamese
                    ? string.Format("Bạn có muốn khởi động lại {0} dưới quyền Quản trị viên (Administrator) không?", AppInfo.AppName)
                    : string.Format("Do you want to restart {0} with Administrator privileges?", AppInfo.AppName);
            }
        }
        public static string AdminPromptTitle { get { return "Administrator Rights"; } }

        // ========================================================
        // Common Buttons & Messages
        // ========================================================
        public static string Common_Ok { get { return "OK"; } }
        public static string Common_Cancel { get { return IsVietnamese ? "Hủy" : "Cancel"; } }
        public static string Common_Yes { get { return IsVietnamese ? "Có" : "Yes"; } }
        public static string Common_No { get { return IsVietnamese ? "Không" : "No"; } }

        // ========================================================
        // Common Info Tab Strings
        // ========================================================
        public static string DevelopedBy { get { return IsVietnamese ? "Sản phẩm này được phát triển bởi Trần Thắng Minh (Max)." : "This product is developed by Trần Thắng Minh (Max)."; } }
        public static string FeedbackAndSupport { get { return IsVietnamese ? "Góp ý, yêu cầu tính năng hoặc hỗ trợ:" : "For feedback, feature requests, or support:"; } }
        public static string Facebook { get { return "Facebook:"; } }
        public static string MoreProducts { get { return IsVietnamese ? "Sản phẩm khác:" : "More Products:"; } }
        public static string SupportMe { get { return IsVietnamese ? "Ủng hộ tui:" : "Support me:"; } }
        public static string ScanQr { get { return "[Quét mã QR Ngân Hàng ↗]"; } }
        public static string BunGioHeoPrefix { get { return "• Ủng hộ "; } }
        public static string BunGioHeoName { get { return "Bún Giò Heo Minh Nhật"; } }
        public static string BunGioHeoSuffix { get { return "nhà tui"; } }
        public static string CheckForUpdates { get { return IsVietnamese ? "Kiểm tra Cập nhật" : "Check for Updates"; } }
        public static string CheckingUpdates { get { return IsVietnamese ? "Đang kiểm tra cập nhật..." : "Checking for updates..."; } }
        public static string UpdateAvailable { get { return IsVietnamese ? "Đã có phiên bản mới: v{0}!" : "New version available: v{0}!"; } }
        public static string LatestVersion { get { return IsVietnamese ? "Bạn đang dùng phiên bản mới nhất (v{0})." : "You have the latest version (v{0})."; } }
        public static string CheckFailed { get { return IsVietnamese ? "Kiểm tra thất bại. Vui lòng thử lại sau." : "Check failed. No internet connection."; } }
        public static string LanguageLabel { get { return IsVietnamese ? "Ngôn ngữ / Language:" : "Language / Ngôn ngữ:"; } }
        public static string QrThankYou { get { return IsVietnamese ? "Cám ơn bạn đã ủng hộ tác giả!" : "Thank you for supporting the author!"; } }
    }
}
