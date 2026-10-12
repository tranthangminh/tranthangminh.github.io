using MaxApp.Common;
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace BookForge
{
    static class Program
    {
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [DllImport("shcore.dll")]
        private static extern int SetProcessDpiAwareness(int awareness);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        private const int SW_RESTORE = 9;
        private const int SW_SHOW = 5;
        private static System.Threading.Mutex _singleInstanceMutex = null;

        [STAThread]
        static void Main()
        {
            // 0. Set WebBrowser control to IE11 Edge Standards Mode (enables SVG and HTML5/CSS3)
            SetWebBrowserCompatibilityMode();

            // 1. DPI Awareness for crisp modern fonts
            try
            {
                SetProcessDpiAwareness(1); // Process_System_DPI_Aware
            }
            catch
            {
                try { SetProcessDPIAware(); } catch { }
            }

            // 2. Prevent duplicate instance from running simultaneously via Mutex
            const string mutexName = "Local\\BookForge_by_Max_SingleInstance_Mutex";
            bool isNewInstance;
            try
            {
                _singleInstanceMutex = new System.Threading.Mutex(true, mutexName, out isNewInstance);
            }
            catch
            {
                isNewInstance = true;
            }

            if (!isNewInstance)
            {
                try
                {
                    IntPtr hwnd = FindWindow(null, "Book Forge by Max v1.0 (Beta)");
                    if (hwnd == IntPtr.Zero) hwnd = FindWindow(null, "Book Forge by Max");
                    if (hwnd == IntPtr.Zero) hwnd = FindWindow(null, "Book Forge by Max Studio");
                    if (hwnd == IntPtr.Zero) hwnd = FindWindow(null, "BookForge Studio");
                    if (hwnd != IntPtr.Zero)
                    {
                        ShowWindow(hwnd, SW_RESTORE);
                        ShowWindow(hwnd, SW_SHOW);
                        SetForegroundWindow(hwnd);
                    }
                }
                catch { }

                if (_singleInstanceMutex != null)
                {
                    try { _singleInstanceMutex.Dispose(); } catch { }
                    _singleInstanceMutex = null;
                }
                return; // Exit duplicate
            }

            AppInfo.Init("Book Forge by Max", "v1.0 (Beta)", "book-forge.html");

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try
            {
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                string crashReport = string.Format("[CRASH REPORT - {0}]\n{1}", DateTime.UtcNow.ToString("o"), ex.ToString());
                try
                {
                    string crashPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log");
                    System.IO.File.WriteAllText(crashPath, crashReport);
                }
                catch { }

                string friendlyMsg = "An unexpected error occurred and Book Forge needs to close.\nDetails have been logged to crash.log.\n\nError: " + ex.Message;
                MessageBox.Show(friendlyMsg, "Book Forge by Max", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                if (_singleInstanceMutex != null)
                {
                    if (isNewInstance)
                    {
                        try { _singleInstanceMutex.ReleaseMutex(); } catch { }
                    }
                    try { _singleInstanceMutex.Dispose(); } catch { }
                    _singleInstanceMutex = null;
                }
            }
        }

        public static void SetWebBrowserCompatibilityMode()
        {
            try
            {
                string appName = System.IO.Path.GetFileName(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName);
                using (Microsoft.Win32.RegistryKey rk = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION"))
                {
                    if (rk != null)
                    {
                        // 11001 (0x2AF9) = Internet Explorer 11 Edge mode
                        rk.SetValue(appName, 11001, Microsoft.Win32.RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }
    }
}
