using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Specialized adapter for Web Browsers & Electron apps (Chrome, Edge, Brave, Opera, Firefox, etc.).
    /// Resolves the cursor-flickering and stutter issues when multiple windows of the same browser are open:
    ///   1. Zero-Flicker: Omits background WM_MOUSEMOVE. Web DOM elements process clicks directly from
    ///      lParam of WM_LBUTTONDOWN/UP without needing mouse movement. This stops Chromium from calling
    ///      ::SetCursor(), completely eliminating cursor fluttering on concurrent windows.
    ///   2. Zero-Capture Lag: Applies optimized low-latency hold duration (1-5ms) to immediately release
    ///      Win32 SetCapture, keeping physical mouse movement on concurrent windows 100% fluid.
    ///   3. Deep Sink Routing: Bypasses outer frame (Chrome_WidgetWin_1) and DirectX swapchain
    ///      (Intermediate D3D Window) directly into Chrome_RenderWidgetHostHWND / MozillaContentWindowClass.
    /// </summary>
    public class ChromiumBrowserAdapter : ISpecialAppAdapter
    {
        public string Name { get { return "Web Browsers (Chrome / Edge / Firefox)"; } }

        public bool RequiresPhysicalClick { get { return false; } }

        public string OptimizationNote
        {
            get
            {
                return "Zero-Flicker Browser Mode: Suppresses background cursor thrashing and SetCapture contention across concurrent windows.";
            }
        }

        public bool IsMatch(string processName, string windowTitle, string className)
        {
            string proc = (processName ?? "").Trim();
            string title = (windowTitle ?? "").Trim();
            string cls = (className ?? "").Trim();

            // Do not match emulators that might have embedded web helpers
            if (proc.IndexOf("crosvm", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("HD-Player", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("BlueStacks", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("BlueStacks", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("CROSVM", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return false;
            }

            // 1. Process matching for major web browsers & Electron shells
            if (proc.Equals("chrome", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("msedge", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("brave", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("firefox", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("opera", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("vivaldi", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("coccoc", StringComparison.OrdinalIgnoreCase) ||
                proc.IndexOf("browser", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.Equals("discord", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("slack", StringComparison.OrdinalIgnoreCase) ||
                proc.Equals("electron", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // 2. Class name matching
            if (cls.IndexOf("Chrome_WidgetWin", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("Chrome_RenderWidgetHostHWND", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("MozillaWindowClass", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("MozillaContentWindowClass", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            // 3. Title matching
            if (title.IndexOf("Google Chrome", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("Microsoft Edge", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("Mozilla Firefox", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("Brave", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            return false;
        }

        private delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumChildWindows(IntPtr hWndParent, EnumChildProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern IntPtr GetParent(IntPtr hWnd);

        public IntPtr ResolveTargetHandle(IntPtr topHwnd, Point screenPt)
        {
            if (topHwnd == IntPtr.Zero) return IntPtr.Zero;

            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(topHwnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();

            // If already the actual inner render widget sink, return itself
            if (cls.IndexOf("Chrome_RenderWidgetHostHWND", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("MozillaContentWindowClass", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return topHwnd;
            }

            // If passed Intermediate D3D Window, try to resolve to its sibling or parent render widget
            if (cls.IndexOf("Intermediate D3D Window", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                IntPtr parent = GetParent(topHwnd);
                if (parent != IntPtr.Zero)
                {
                    IntPtr sibling = NativeMethods.FindWindowEx(parent, IntPtr.Zero, "Chrome_RenderWidgetHostHWND", null);
                    if (sibling != IntPtr.Zero) return sibling;
                    return parent;
                }
            }

            IntPtr foundRenderWidget = IntPtr.Zero;
            IntPtr candidateWidget = IntPtr.Zero;
            int maxArea = 0;

            EnumChildWindows(topHwnd, (childHwnd, lParam) =>
            {
                if (!NativeMethods.IsWindowVisible(childHwnd)) return true;

                StringBuilder csbClass = new StringBuilder(256);
                NativeMethods.GetClassName(childHwnd, csbClass, csbClass.Capacity);
                string childClass = csbClass.ToString();

                // Skip Intermediate D3D Window (pure Direct3D swapchain surface without input pump)
                if (childClass.IndexOf("Intermediate D3D Window", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }

                NativeMethods.RECT rc;
                if (NativeMethods.GetWindowRect(childHwnd, out rc))
                {
                    int w = rc.Right - rc.Left;
                    int h = rc.Bottom - rc.Top;
                    int area = w * h;

                    bool containsPt = (screenPt == Point.Empty) ||
                                      (screenPt.X >= rc.Left && screenPt.X <= rc.Right &&
                                       screenPt.Y >= rc.Top && screenPt.Y <= rc.Bottom);

                    // Primary target: Chrome_RenderWidgetHostHWND or MozillaContentWindowClass
                    if (childClass.IndexOf("Chrome_RenderWidgetHostHWND", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        childClass.IndexOf("MozillaContentWindowClass", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (containsPt)
                        {
                            foundRenderWidget = childHwnd;
                            return false; // Found exact match
                        }
                        if (foundRenderWidget == IntPtr.Zero) foundRenderWidget = childHwnd;
                    }
                    else if (area > maxArea && (childClass.IndexOf("Chrome_WidgetWin", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                childClass.IndexOf("MozillaWindowClass", StringComparison.OrdinalIgnoreCase) >= 0))
                    {
                        maxArea = area;
                        if (containsPt)
                        {
                            candidateWidget = childHwnd;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (foundRenderWidget != IntPtr.Zero) return foundRenderWidget;
            if (candidateWidget != IntPtr.Zero) return candidateWidget;

            return topHwnd;
        }

        public bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            IntPtr topHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (topHwnd == IntPtr.Zero) topHwnd = targetHwnd;

            // 1. Resolve to inner render widget (Chrome_RenderWidgetHostHWND) if not already
            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(targetHwnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();

            if (cls.IndexOf("Chrome_RenderWidgetHostHWND", StringComparison.OrdinalIgnoreCase) < 0 &&
                cls.IndexOf("MozillaContentWindowClass", StringComparison.OrdinalIgnoreCase) < 0)
            {
                IntPtr resolved = ResolveTargetHandle(topHwnd, Point.Empty);
                if (resolved != IntPtr.Zero && resolved != targetHwnd)
                {
                    NativeMethods.POINT screenPt = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
                    NativeMethods.ClientToScreen(targetHwnd, ref screenPt);
                    NativeMethods.ScreenToClient(resolved, ref screenPt);
                    targetHwnd = resolved;
                    clientPt = new Point(screenPt.X, screenPt.Y);
                }
            }

            IntPtr lParam = (IntPtr)(((clientPt.Y & 0xFFFF) << 16) | (clientPt.X & 0xFFFF));

            uint msgDown, msgUp;
            IntPtr wParam;

            if (mouseBtn == 1) // Right
            {
                msgDown = 0x0204;
                msgUp = 0x0205;
                wParam = (IntPtr)0x0002; // MK_RBUTTON
            }
            else if (mouseBtn == 2) // Middle
            {
                msgDown = 0x0207;
                msgUp = 0x0208;
                wParam = (IntPtr)0x0010; // MK_MBUTTON
            }
            else // Left or Double Click
            {
                msgDown = 0x0201;
                msgUp = 0x0202;
                wParam = (IntPtr)0x0001; // MK_LBUTTON
            }

            // 2. ZERO-FLICKER CRITICAL DESIGN:
            // DO NOT send WM_MOUSEACTIVATE or WM_MOUSEMOVE!
            // When WM_MOUSEACTIVATE or WM_MOUSEMOVE is posted to a background Chrome window, Chromium
            // recalculates the cursor style and calls ::SetCursor(hCursor). Because Windows has only one
            // global system cursor, this causes the mouse cursor over the user's active window to rapidly flicker!
            // Web DOM elements process click events directly from the client coordinates inside lParam
            // of WM_LBUTTONDOWN and WM_LBUTTONUP without requiring mouse movement or activation handshakes.

            // 3. Send Button Down with target coordinates
            NativeMethods.PostMessage(targetHwnd, msgDown, wParam, lParam);

            // 4. ZERO-CAPTURE CONTENTION:
            // Chromium web DOM elements process click events directly from the message queue.
            // When holdMs <= 0, release button immediately (0ms) to prevent SetCapture contention.
            // If explicit hold is requested (> 0), hold for min(5, holdMs).
            int webHold = (holdMs > 0) ? Math.Min(5, holdMs) : 0;
            if (webHold > 0)
            {
                Thread.Sleep(webHold);
            }

            // 5. Send Button Up
            NativeMethods.PostMessage(targetHwnd, msgUp, IntPtr.Zero, lParam);

            // 7. Handle Double Click if requested
            if (mouseBtn == 3)
            {
                Thread.Sleep(20);
                NativeMethods.PostMessage(targetHwnd, 0x0203 /* WM_LBUTTONDBLCLK */, wParam, lParam);
                Thread.Sleep(webHold);
                NativeMethods.PostMessage(targetHwnd, msgUp, IntPtr.Zero, lParam);
            }

            return true;
        }
    }
}
