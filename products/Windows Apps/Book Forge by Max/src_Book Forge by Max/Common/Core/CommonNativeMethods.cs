using System;
using System.Runtime.InteropServices;

namespace MaxApp.Common
{
    /// <summary>
    /// Core Win32 P/Invoke declarations and window manipulation helpers for the Common library.
    /// </summary>
    public static class CommonNativeMethods
    {
        public const int WM_NCLBUTTONDOWN = 0x00A1;
        public const int HTCAPTION = 0x0002;
        public const int WM_NCHITTEST = 0x0084;
        public const int HTTRANSPARENT = -1;
        public const int HTCLIENT = 1;
        public const int WM_SETREDRAW = 0x000B;
        public const int CS_DROPSHADOW = 0x00020000;

        public const int DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 = 19;
        public const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
        public const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;

        public enum DwmWindowCornerPreference
        {
            Default = 0,
            DoNotRound = 1,
            Round = 2,
            RoundSmall = 3
        }

        [DllImport("gdi32.dll")]
        public static extern IntPtr CreateRoundRectRgn(int x1, int y1, int x2, int y2, int cx, int cy);

        [DllImport("user32.dll")]
        public static extern int SetWindowRgn(IntPtr hWnd, IntPtr hRgn, bool bRedraw);

        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern IntPtr GetWindowDC(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("dwmapi.dll")]
        public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        /// <summary>
        /// Enables or disables Windows 10/11 immersive dark mode on a window frame.
        /// </summary>
        public static bool SetWindowDarkMode(IntPtr hWnd, bool enable)
        {
            if (hWnd == IntPtr.Zero || Environment.OSVersion.Version.Major < 10)
                return false;

            int useDarkMode = enable ? 1 : 0;
            int res = DwmSetWindowAttribute(hWnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDarkMode, sizeof(int));
            if (res != 0)
            {
                res = DwmSetWindowAttribute(hWnd, DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1, ref useDarkMode, sizeof(int));
            }
            return res == 0;
        }

        /// <summary>
        /// Temporarily stops or resumes window painting to eliminate flickering during batch UI changes.
        /// </summary>
        public static void SetRedraw(IntPtr hWnd, bool enable)
        {
            if (hWnd != IntPtr.Zero)
            {
                SendMessage(hWnd, WM_SETREDRAW, enable ? (IntPtr)1 : (IntPtr)0, IntPtr.Zero);
            }
        }
    }
}
