using System;
using System.Drawing;
using System.Windows.Forms;
using MaxApp.Common;

namespace ModernAutoClicker
{
    // ========================================================
    // Backward Compatibility Bridge to MaxApp.Common
    // ========================================================

    public static class AppInfo
    {
        public static string AppName { get { return MaxApp.Common.AppInfo.AppName; } set { MaxApp.Common.AppInfo.AppName = value; } }
        public static string Version { get { return MaxApp.Common.AppInfo.Version; } set { MaxApp.Common.AppInfo.Version = value; } }
        public static string Title { get { return MaxApp.Common.AppInfo.Title; } }
        public static string WebsiteSlug { get { return MaxApp.Common.AppInfo.WebsiteSlug; } set { MaxApp.Common.AppInfo.WebsiteSlug = value; } }
    }

    public static class UacHelper
    {
        public static bool IsRunningAsAdmin() { return MaxApp.Common.UacHelper.IsRunningAsAdmin(); }
        public static bool IsProcessElevated(IntPtr hWnd) { return MaxApp.Common.UacHelper.IsProcessElevated(hWnd); }
        public static bool IsProcessElevated(int pid) { return MaxApp.Common.UacHelper.IsProcessElevated(pid); }
        public static bool RestartAsAdmin(string extraArgs = null) { return MaxApp.Common.UacHelper.RestartAsAdmin(extraArgs); }
    }

    public static class UpdateChecker
    {
        public static void CheckForUpdatesAsync(bool isManual, Form ownerForm, Action<UpdateCheckResult> onCompleted = null)
        {
            MaxApp.Common.UpdateChecker.CheckForUpdatesAsync(isManual, ownerForm, onCompleted);
        }
    }

    public class CustomTitleBar : MaxApp.Common.CustomTitleBar
    {
        public CustomTitleBar() : base(null) { }
        public CustomTitleBar(Form parent) : base(parent) { }
    }

    public class RoundedButton : MaxApp.Common.RoundedButton { }
    public class RoundedPanel : MaxApp.Common.RoundedPanel { }
    public class ModernTextBox : MaxApp.Common.ModernTextBox { }
    public class NumberInput : MaxApp.Common.NumberInput { }
    public class ModernDropdown : MaxApp.Common.ModernDropdown { }
    public class ModernDropdownButton : MaxApp.Common.ModernDropdownButton { }
    public class NoScrollComboBox : MaxApp.Common.NoScrollComboBox { }
    public class SvgIconButton : MaxApp.Common.SvgIconButton { }
    public class DoubleBufferedTableLayoutPanel : MaxApp.Common.DoubleBufferedTableLayoutPanel { }
    public class ModernScrollBar : MaxApp.Common.ModernScrollBar { }
    public class UI_FirstRunLanguageDialog : MaxApp.Common.FirstRunLanguageDialog { }
}

namespace ModernAutoClicker.Info
{
    public class InfoTabPanel : MaxApp.Common.InfoTabPanel { }

    public class QrModal : MaxApp.Common.QrModal
    {
        public QrModal(ThemeTokens theme) : base(theme) { }
    }

    public static class SvgFileRenderer
    {
        public static Image GetCachedTintedIcon(string nameOrPath, int width, int height, Color tintColor)
        {
            return MaxApp.Common.SvgFileRenderer.GetCachedTintedIcon(nameOrPath, width, height, tintColor);
        }

        public static Bitmap RenderSvg(string nameOrPath, int targetWidth, int targetHeight, Color? tintColor = null)
        {
            return MaxApp.Common.SvgFileRenderer.RenderSvg(nameOrPath, targetWidth, targetHeight, tintColor);
        }

        public static Bitmap RenderLogoFromFile(int targetWidth, int targetHeight, Color? customAccent = null)
        {
            return MaxApp.Common.SvgFileRenderer.RenderLogoFromFile(targetWidth, targetHeight, customAccent);
        }

        public static Image GetThemeIconImage(bool isDark, int size)
        {
            return MaxApp.Common.SvgFileRenderer.GetThemeIconImage(isDark, size);
        }

        public static Image GetAppIconImage(int size)
        {
            return MaxApp.Common.SvgFileRenderer.GetAppIconImage(size);
        }
    }
}
