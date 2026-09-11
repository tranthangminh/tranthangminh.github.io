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

        [STAThread]
        static void Main()
        {
            // 1. Check if another live AutoClicker process is running
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
                                hwnd = FindWindow(null, "Auto Clicker by Max v1.0");
                            }
                            if (hwnd == IntPtr.Zero)
                            {
                                hwnd = FindWindow(null, "Auto Clicker");
                            }
                            if (hwnd != IntPtr.Zero)
                            {
                                ShowWindow(hwnd, SW_RESTORE);
                                ShowWindow(hwnd, SW_SHOW);
                                SetForegroundWindow(hwnd);
                            }
                        }
                        catch { }
                        return; // Exit duplicate instance
                    }
                }
            }
            catch { }

            // Global Exception Handlers
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) =>
            {
                System.IO.File.WriteAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "error.log"), e.Exception.ToString());
                MessageBox.Show("Application error: " + e.Exception.ToString(), "Auto Clicker Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                Exception ex = e.ExceptionObject as Exception;
                string msg = ex != null ? ex.ToString() : "Unknown error";
                System.IO.File.WriteAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "error.log"), msg);
                MessageBox.Show("Unhandled error: " + msg, "Auto Clicker Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
                System.IO.File.WriteAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "error.log"), ex.ToString());
                MessageBox.Show("Startup error: " + ex.ToString(), "Auto Clicker Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
