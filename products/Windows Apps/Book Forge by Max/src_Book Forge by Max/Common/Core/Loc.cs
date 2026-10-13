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
        // Common TitleBar & Admin
        // ========================================================
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
        public static string AdminPromptTitle { get { return IsVietnamese ? "Quyền Quản trị viên" : "Administrator Rights"; } }

        // ========================================================
        // Common Buttons & Messages
        // ========================================================
        public static string Common_Ok { get { return "OK"; } }
        public static string Common_Cancel { get { return IsVietnamese ? "Hủy" : "Cancel"; } }
        public static string Common_Yes { get { return IsVietnamese ? "Có" : "Yes"; } }
        public static string Common_No { get { return IsVietnamese ? "Không" : "No"; } }
    }
}
