using System;
using System.Collections.Generic;
using System.Drawing;
using System.Text;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Registry and dispatcher for all special application adapters.
    /// Easily extendable by adding new ISpecialAppAdapter implementations to _adapters list.
    /// </summary>
    public static class SpecialAppRegistry
    {
        private static readonly List<ISpecialAppAdapter> _adapters = new List<ISpecialAppAdapter>();

        static SpecialAppRegistry()
        {
            // Register built-in adapters in priority order
            _adapters.Add(new BlueStacksAdapter());
            _adapters.Add(new DesktopAdapter());
            _adapters.Add(new WindowsExplorerAdapter());
        }

        /// <summary>
        /// Registers a new adapter dynamically.
        /// </summary>
        public static void RegisterAdapter(ISpecialAppAdapter adapter)
        {
            if (adapter != null && !_adapters.Contains(adapter))
            {
                _adapters.Add(adapter);
            }
        }

        /// <summary>
        /// Finds matching adapter for the given process name, title, and class name.
        /// </summary>
        public static ISpecialAppAdapter FindAdapter(string processName, string windowTitle, string className)
        {
            string proc = processName ?? "";
            string title = windowTitle ?? "";
            string cls = className ?? "";

            for (int i = 0; i < _adapters.Count; i++)
            {
                if (_adapters[i].IsMatch(proc, title, cls))
                {
                    return _adapters[i];
                }
            }
            return null;
        }

        /// <summary>
        /// Finds matching adapter for a given window handle.
        /// </summary>
        public static ISpecialAppAdapter FindAdapter(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero || !NativeMethods.IsWindow(hWnd)) return null;

            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(hWnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();

            int len = NativeMethods.GetWindowTextLength(hWnd);
            string title = "";
            if (len > 0)
            {
                StringBuilder sbTitle = new StringBuilder(len + 1);
                NativeMethods.GetWindowText(hWnd, sbTitle, sbTitle.Capacity);
                title = sbTitle.ToString();
            }

            uint pid;
            NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
            string proc = "";
            if (pid != 0)
            {
                try
                {
                    using (var p = System.Diagnostics.Process.GetProcessById((int)pid))
                    {
                        proc = p.ProcessName;
                    }
                }
                catch { }
            }

            ISpecialAppAdapter directAdapter = FindAdapter(proc, title, cls);
            if (directAdapter != null) return directAdapter;

            // Fallback to top-level window if hWnd is a child window
            IntPtr top = NativeMethods.GetTopLevelWindow(hWnd);
            if (top != IntPtr.Zero && top != hWnd)
            {
                return FindAdapter(top);
            }

            return null;
        }

        /// <summary>
        /// Resolves target handle using matching adapter or returns IntPtr.Zero if no special handle found.
        /// </summary>
        public static IntPtr ResolveTargetHandle(IntPtr topHwnd, Point screenPt)
        {
            if (topHwnd == IntPtr.Zero) return IntPtr.Zero;

            ISpecialAppAdapter adapter = FindAdapter(topHwnd);
            if (adapter != null)
            {
                IntPtr resolved = adapter.ResolveTargetHandle(topHwnd, screenPt);
                if (resolved != IntPtr.Zero) return resolved;
            }

            return IntPtr.Zero;
        }

        /// <summary>
        /// Attempts background click using matching adapter. Returns true if handled.
        /// </summary>
        public static bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            ISpecialAppAdapter adapter = FindAdapter(targetHwnd);
            if (adapter != null)
            {
                return adapter.TryBackgroundClick(targetHwnd, clientPt, mouseBtn, holdMs);
            }

            return false;
        }
    }
}
