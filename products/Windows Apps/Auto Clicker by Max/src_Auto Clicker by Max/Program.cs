using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace ModernAutoClicker
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
        private const string SingleInstanceMutexName = "Local\\AutoClickerByMax_SingleInstance_Mutex";

        [STAThread]
        static void Main(string[] args)
        {
            AppInfo.WebsiteSlug = "auto-clicker.html";
            int waitForPid = 0;
            if (args != null && args.Length >= 2 && args[0] == "--restart")
            {
                int.TryParse(args[1], out waitForPid);
                if (waitForPid > 0)
                {
                    try
                    {
                        Process oldProc = Process.GetProcessById(waitForPid);
                        if (oldProc != null && !oldProc.HasExited)
                        {
                            oldProc.WaitForExit(3000);
                        }
                    }
                    catch { }
                }
            }

            // 1. Single Instance Check using Named Mutex
            bool createdNew = false;
            System.Threading.Mutex mutex = null;
            try
            {
                mutex = new System.Threading.Mutex(true, SingleInstanceMutexName, out createdNew);
            }
            catch
            {
                createdNew = true;
            }

            if (!createdNew)
            {
                try
                {
                    if (waitForPid > 0 && mutex != null)
                    {
                        try { createdNew = mutex.WaitOne(2000); } catch { }
                    }

                    if (!createdNew)
                    {
                        IntPtr hwnd = FindWindow(null, AppInfo.Title);
                        if (hwnd == IntPtr.Zero)
                        {
                            hwnd = FindWindow(null, AppInfo.AppName);
                        }
                        if (hwnd != IntPtr.Zero)
                        {
                            ShowWindow(hwnd, SW_RESTORE);
                            ShowWindow(hwnd, SW_SHOW);
                            SetForegroundWindow(hwnd);
                        }
                        return; // Exit duplicate instance
                    }
                }
                catch
                {
                    return;
                }
            }

            try
            {
                // Global Exception Handlers
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                Application.ThreadException += (s, e) =>
                {
                    ShowErrorDialog("Thread Exception", e.Exception);
                };
                AppDomain.CurrentDomain.UnhandledException += (s, e) =>
                {
                    ShowErrorDialog("Domain Exception", e.ExceptionObject as Exception);
                };

                // Enable Per-Monitor High DPI Awareness
                try
                {
                    SetProcessDpiAwareness(2);
                }
                catch
                {
                    try { SetProcessDPIAware(); } catch { }
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                try
                {
                    Application.Run(new MainForm());
                }
                catch (Exception ex)
                {
                    ShowErrorDialog("Startup/Runtime Exception", ex);
                }
            }
            finally
            {
                if (mutex != null)
                {
                    if (createdNew)
                    {
                        try { mutex.ReleaseMutex(); } catch { }
                    }
                    try { mutex.Dispose(); } catch { }
                }
            }
        }

        private static void SafeLogException(string context, Exception ex)
        {
            try
            {
                string logPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "error.log");
                string logText = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] [{1}] {2}\r\n\r\n",
                    DateTime.Now, context, ex != null ? ex.ToString() : "Unknown exception");
                System.IO.File.AppendAllText(logPath, logText, System.Text.Encoding.UTF8);
            }
            catch
            {
                // Directory might be write-protected (e.g. Program Files); fallback safely to LocalAppData
                try
                {
                    string fallbackDir = System.IO.Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AutoClickerByMax");
                    if (!System.IO.Directory.Exists(fallbackDir)) System.IO.Directory.CreateDirectory(fallbackDir);
                    string fallbackPath = System.IO.Path.Combine(fallbackDir, "error.log");
                    string logText = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] [{1}] {2}\r\n\r\n",
                        DateTime.Now, context, ex != null ? ex.ToString() : "Unknown exception");
                    System.IO.File.AppendAllText(fallbackPath, logText, System.Text.Encoding.UTF8);
                }
                catch { }
            }
        }

        private static void ShowErrorDialog(string context, Exception ex)
        {
            SafeLogException(context, ex);
            string errorSummary = ex != null ? ex.Message : "Unknown application error.";
            string msg = string.Format(
                "An unexpected application error occurred:\n\n{0}\n\nTechnical details have been saved to error.log.\nIf this issue persists, please report it to the author (Trần Thắng Minh).",
                errorSummary);
            try
            {
                MessageBox.Show(msg, "Auto Clicker by Max - Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch { }
        }
    }
}
