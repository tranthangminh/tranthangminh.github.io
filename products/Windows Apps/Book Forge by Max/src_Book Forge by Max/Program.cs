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

            // 2. Prevent duplicate instance from running simultaneously
            try
            {
                Process current = Process.GetCurrentProcess();
                Process[] processes = Process.GetProcessesByName(current.ProcessName);
                foreach (Process p in processes)
                {
                    if (p.Id != current.Id)
                    {
                        try
                        {
                            IntPtr hwnd = p.MainWindowHandle;
                            if (hwnd == IntPtr.Zero)
                            {
                                hwnd = FindWindow(null, "Book Forge by Max v1.0 (Beta)");
                            }
                            if (hwnd == IntPtr.Zero)
                            {
                                hwnd = FindWindow(null, "Book Forge by Max");
                            }
                            if (hwnd == IntPtr.Zero)
                            {
                                hwnd = FindWindow(null, "Book Forge by Max Studio");
                            }
                            if (hwnd == IntPtr.Zero)
                            {
                                hwnd = FindWindow(null, "BookForge Studio");
                            }
                            if (hwnd != IntPtr.Zero)
                            {
                                ShowWindow(hwnd, SW_RESTORE);
                                ShowWindow(hwnd, SW_SHOW);
                                SetForegroundWindow(hwnd);
                            }
                        }
                        catch { }
                        return; // Exit duplicate
                    }
                }
            }
            catch { }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try
            {
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                string err = "FATAL ERROR:\n" + ex.ToString();
                Console.WriteLine(err);
                System.IO.File.WriteAllText("crash.log", err);
                MessageBox.Show(err, "Book Forge by Max Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
