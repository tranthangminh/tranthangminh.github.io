using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;

namespace ModernAutoClicker
{
    public static class IconCache
    {
        private static Image _sharedDesktopIcon = null;
        private static Image _sharedGenericAppIcon = null;
        private static readonly Dictionary<string, Image> _processIconCache = new Dictionary<string, Image>(StringComparer.OrdinalIgnoreCase);

        public static Image DesktopIcon
        {
            get
            {
                if (_sharedDesktopIcon == null)
                {
                    _sharedDesktopIcon = GenerateDesktopIcon();
                }
                return _sharedDesktopIcon;
            }
        }

        public static Image GenericAppIcon
        {
            get
            {
                if (_sharedGenericAppIcon == null)
                {
                    _sharedGenericAppIcon = GenerateGenericAppIcon();
                }
                return _sharedGenericAppIcon;
            }
        }

        public static Image CreateDesktopIcon()
        {
            return DesktopIcon;
        }

        public static Image CreateGenericAppIcon()
        {
            return GenericAppIcon;
        }

        private static Bitmap GenerateDesktopIcon()
        {
            Bitmap bmp = new Bitmap(16, 16);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (SolidBrush fill = new SolidBrush(Color.FromArgb(96, 165, 250)))
                using (Pen border = new Pen(Color.FromArgb(220, 255, 255, 255), 1))
                {
                    g.FillRectangle(fill, 1, 2, 14, 9);
                    g.DrawRectangle(border, 1, 2, 13, 8);
                    g.FillRectangle(Brushes.White, 7, 11, 2, 2);
                    g.FillRectangle(Brushes.White, 4, 13, 8, 1);
                }
            }
            return bmp;
        }

        private static Bitmap GenerateGenericAppIcon()
        {
            Bitmap bmp = new Bitmap(16, 16);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                using (SolidBrush fill = new SolidBrush(Color.FromArgb(129, 140, 248)))
                using (Pen border = new Pen(Color.FromArgb(220, 255, 255, 255), 1))
                {
                    g.FillRectangle(fill, 1, 1, 14, 14);
                    g.DrawRectangle(border, 1, 1, 13, 13);
                    g.FillRectangle(Brushes.White, 1, 1, 14, 4);
                }
            }
            return bmp;
        }

        public static Image GetWindowAppIcon(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return null;
            try
            {
                // 1. Try WM_GETICON
                IntPtr hIcon = NativeMethods.SendMessage(hWnd, NativeMethods.WM_GETICON, (IntPtr)NativeMethods.ICON_SMALL2, IntPtr.Zero);
                if (hIcon == IntPtr.Zero)
                    hIcon = NativeMethods.SendMessage(hWnd, NativeMethods.WM_GETICON, (IntPtr)NativeMethods.ICON_SMALL, IntPtr.Zero);
                if (hIcon == IntPtr.Zero)
                    hIcon = NativeMethods.SendMessage(hWnd, NativeMethods.WM_GETICON, (IntPtr)NativeMethods.ICON_BIG, IntPtr.Zero);

                // 2. Try Class Long
                if (hIcon == IntPtr.Zero)
                    hIcon = NativeMethods.GetClassLongPtr(hWnd, NativeMethods.GCLP_HICONSM);
                if (hIcon == IntPtr.Zero)
                    hIcon = NativeMethods.GetClassLongPtr(hWnd, NativeMethods.GCLP_HICON);

                if (hIcon != IntPtr.Zero)
                {
                    using (Icon ico = Icon.FromHandle(hIcon))
                    {
                        return new Bitmap(ico.ToBitmap(), new Size(16, 16));
                    }
                }

                // 3. Fallback: Extract from process executable
                uint pid;
                NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                if (pid != 0)
                {
                    var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                    string exePath = proc.MainModule.FileName;
                    if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                    {
                        using (Icon ico = Icon.ExtractAssociatedIcon(exePath))
                        {
                            if (ico != null) return new Bitmap(ico.ToBitmap(), new Size(16, 16));
                        }
                    }
                }
            }
            catch { }

            return null;
        }

        public static void CacheProcessIcon(string processName, Image icon)
        {
            if (string.IsNullOrEmpty(processName) || icon == null) return;
            lock (_processIconCache)
            {
                _processIconCache[processName] = icon;
            }
        }

        public static Image GetProcessIcon(string processName, string windowTitle = null)
        {
            if (string.IsNullOrEmpty(processName)) return null;

            lock (_processIconCache)
            {
                Image cached;
                if (_processIconCache.TryGetValue(processName, out cached) && cached != null)
                {
                    return cached;
                }
            }

            Image extracted = null;

            // 1. Try resolving directly from open window (retrieves runtime icons e.g. Plants vs. Zombies)
            try
            {
                IntPtr hWnd = NativeMethods.FindWindowByTarget(processName, windowTitle);
                if (hWnd != IntPtr.Zero)
                {
                    extracted = GetWindowAppIcon(hWnd);
                }
            }
            catch { }

            // 2. Fallback: Extract from process executable file
            if (extracted == null)
            {
                try
                {
                    var procs = System.Diagnostics.Process.GetProcessesByName(processName);
                    if (procs.Length > 0)
                    {
                        string exePath = procs[0].MainModule.FileName;
                        if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                        {
                            using (Icon ico = Icon.ExtractAssociatedIcon(exePath))
                            {
                                if (ico != null) extracted = new Bitmap(ico.ToBitmap(), new Size(16, 16));
                            }
                        }
                        foreach (var p in procs) p.Dispose();
                    }
                }
                catch { }
            }

            Image result = extracted ?? GenericAppIcon;
            lock (_processIconCache)
            {
                _processIconCache[processName] = result;
            }

            return result;
        }
    }
}
