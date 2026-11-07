using System;
using System.Diagnostics;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>Opens a web page in the default browser, and says so when it cannot instead of doing nothing.</summary>
    public static class ExternalLink
    {
        public static void Open(string url, IWin32Window owner)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                AppLog.Error("Opening " + url, ex);
                ModernMessageBox.Show(Loc.Common_OpenLinkFailed(url), AppInfo.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning, owner);
            }
        }
    }
}
