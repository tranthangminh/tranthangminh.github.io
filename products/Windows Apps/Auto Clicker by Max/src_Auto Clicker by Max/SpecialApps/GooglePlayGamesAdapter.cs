using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Specialized adapter for Google Play Games on PC (crosvm / client.exe / bstrace.exe).
    /// Google Play Games on PC virtualizes Android games via a specialized crosvm hypervisor on top of WHPX.
    /// The window hierarchy consists of:
    ///   - Top-level WPF container: "HwndWrapper[DefaultDomain;...]"
    ///   - Host VM message container: "CROSVM_1" (running gpu_display_wndproc)
    ///   - Inner presentation/touch surface: "subWin" (Vulkan / DirectX render surface)
    ///   - Launcher / Store CEF host: "Chrome_RenderWidgetHostHWND"
    /// 
    /// Standard Win32 child traversal stops at the top WPF wrapper, which ignores background mouse messages.
    /// This adapter resolves directly to the inner "subWin" presentation surface or "CROSVM_1" container,
    /// converts client coordinates accurately, conducts a Win32 activation handshake without stealing OS focus,
    /// primes the pointer position via WM_MOUSEMOVE with a 10ms settling delay, and dual-dispatches mouse down/up
    /// with a minimum 35ms hold duration synchronized with Android's guest VSync loop.
    /// </summary>
    public class GooglePlayGamesAdapter : ISpecialAppAdapter
    {
        public string Name { get { return "Google Play Games PC"; } }

        public bool RequiresPhysicalClick { get { return false; } }

        public string OptimizationNote
        {
            get
            {
                return "Optimized for Google Play Games on PC (crosvm). Routes input directly to subWin and CROSVM_1 with Android VSync synchronization.";
            }
        }

        public bool IsMatch(string processName, string windowTitle, string className)
        {
            string proc = (processName ?? "").Trim();
            string title = (windowTitle ?? "").Trim();
            string cls = (className ?? "").Trim();

            // 1. Process matching
            if (proc.IndexOf("crosvm", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("GooglePlayGames", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("ServiceProcess", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("bootstrapper", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("playgames", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("bstrace", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.Equals("client", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // 2. Window title matching
            if (title.IndexOf("Google Play Games", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("Play Games", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            // 3. Class matching (crosvm host or subWin presentation surface)
            if (cls.IndexOf("CROSVM", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            // 4. Class + process heuristic (WPF wrapper or Chromium widget)
            if ((cls.IndexOf("Chrome_WidgetWin", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 cls.IndexOf("HwndWrapper", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 cls.IndexOf("crosvm", StringComparison.OrdinalIgnoreCase) >= 0) &&
                (proc.IndexOf("crosvm", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 proc.IndexOf("GooglePlayGames", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 proc.Equals("client", StringComparison.OrdinalIgnoreCase) ||
                 title.IndexOf("Play Games", StringComparison.OrdinalIgnoreCase) >= 0))
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

            // 1. Check class of current window
            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(topHwnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();

            // If already the actual inner subWin surface or Chromium render widget sink, return itself
            if (cls.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0 ||
                cls.IndexOf("Chrome_RenderWidgetHostHWND", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return topHwnd;
            }

            // If passed Intermediate D3D Window, try to resolve to its sibling or parent
            if (cls.IndexOf("Intermediate D3D Window", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                IntPtr parent = GetParent(topHwnd);
                if (parent != IntPtr.Zero)
                {
                    IntPtr siblingSub = NativeMethods.FindWindowEx(parent, IntPtr.Zero, "subWin", null);
                    if (siblingSub != IntPtr.Zero) return siblingSub;

                    IntPtr siblingRender = NativeMethods.FindWindowEx(parent, IntPtr.Zero, "Chrome_RenderWidgetHostHWND", null);
                    if (siblingRender != IntPtr.Zero) return siblingRender;

                    return parent;
                }
            }

            // 2. Drill down into child windows to find:
            // a) subWin (the DirectX/Vulkan game rendering and touch input surface)
            // b) CROSVM_* (the crosvm host window running gpu_display_wndproc)
            // c) Chrome_RenderWidgetHostHWND (Chromium CEF render sink for GPG launcher)
            // d) Chrome_WidgetWin / largest visible child
            IntPtr foundSubWin = IntPtr.Zero;
            IntPtr foundCrosvm = IntPtr.Zero;
            IntPtr foundRenderWidget = IntPtr.Zero;
            IntPtr candidateWidget = IntPtr.Zero;
            int maxArea = 0;

            EnumChildWindows(topHwnd, (childHwnd, lParam) =>
            {
                if (!NativeMethods.IsWindowVisible(childHwnd)) return true;

                StringBuilder csbClass = new StringBuilder(256);
                NativeMethods.GetClassName(childHwnd, csbClass, csbClass.Capacity);
                string childClass = csbClass.ToString();

                // Skip Intermediate D3D Window (pure swapchain presentation surface without input pump)
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

                    // Priority 1: subWin (the direct guest game input and rendering surface)
                    if (childClass.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (containsPt)
                        {
                            foundSubWin = childHwnd;
                            return false; // Direct hit
                        }
                        if (foundSubWin == IntPtr.Zero) foundSubWin = childHwnd;
                    }
                    // Priority 2: CROSVM host window (runs gpu_display_wndproc)
                    else if (childClass.IndexOf("CROSVM", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (containsPt)
                        {
                            foundCrosvm = childHwnd;
                        }
                        else if (foundCrosvm == IntPtr.Zero)
                        {
                            foundCrosvm = childHwnd;
                        }
                    }
                    // Priority 3: Chromium RenderWidgetHost (CEF launcher/store UI)
                    else if (childClass.IndexOf("Chrome_RenderWidgetHostHWND", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (containsPt)
                        {
                            foundRenderWidget = childHwnd;
                            return false;
                        }
                        if (foundRenderWidget == IntPtr.Zero) foundRenderWidget = childHwnd;
                    }
                    else if (area > maxArea && (childClass.IndexOf("Chrome_WidgetWin", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                childClass.IndexOf("HwndWrapper", StringComparison.OrdinalIgnoreCase) >= 0))
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

            if (foundSubWin != IntPtr.Zero) return foundSubWin;
            if (foundCrosvm != IntPtr.Zero) return foundCrosvm;
            if (foundRenderWidget != IntPtr.Zero) return foundRenderWidget;
            if (candidateWidget != IntPtr.Zero) return candidateWidget;

            return topHwnd;
        }

        public bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            IntPtr topHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (topHwnd == IntPtr.Zero) topHwnd = targetHwnd;

            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(targetHwnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();

            IntPtr subWinHwnd = IntPtr.Zero;
            IntPtr crosvmHwnd = IntPtr.Zero;

            // 1. Identify subWin and CROSVM windows
            if (cls.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                subWinHwnd = targetHwnd;
                crosvmHwnd = GetParent(targetHwnd);
            }
            else if (cls.IndexOf("CROSVM", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                crosvmHwnd = targetHwnd;
                subWinHwnd = NativeMethods.FindWindowEx(crosvmHwnd, IntPtr.Zero, "subWin", null);
            }
            else
            {
                // targetHwnd is top-level container or intermediate window: resolve to subWin / crosvm
                IntPtr resolved = ResolveTargetHandle(topHwnd, Point.Empty);
                if (resolved != IntPtr.Zero && resolved != targetHwnd)
                {
                    NativeMethods.POINT screenPt = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
                    NativeMethods.ClientToScreen(targetHwnd, ref screenPt);
                    NativeMethods.ScreenToClient(resolved, ref screenPt);
                    targetHwnd = resolved;
                    clientPt = new Point(screenPt.X, screenPt.Y);

                    StringBuilder rClass = new StringBuilder(256);
                    NativeMethods.GetClassName(targetHwnd, rClass, rClass.Capacity);
                    string resolvedCls = rClass.ToString();
                    if (resolvedCls.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        subWinHwnd = targetHwnd;
                        crosvmHwnd = GetParent(targetHwnd);
                    }
                    else if (resolvedCls.IndexOf("CROSVM", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        crosvmHwnd = targetHwnd;
                        subWinHwnd = NativeMethods.FindWindowEx(crosvmHwnd, IntPtr.Zero, "subWin", null);
                    }
                }
            }

            // 2. Compute coordinates for each window layer
            IntPtr primaryHwnd = (subWinHwnd != IntPtr.Zero) ? subWinHwnd : targetHwnd;
            Point ptPrimary = clientPt;
            if (primaryHwnd != targetHwnd)
            {
                NativeMethods.POINT sPt = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
                NativeMethods.ClientToScreen(targetHwnd, ref sPt);
                NativeMethods.ScreenToClient(primaryHwnd, ref sPt);
                ptPrimary = new Point(sPt.X, sPt.Y);
            }
            IntPtr lParamPrimary = (IntPtr)(((ptPrimary.Y & 0xFFFF) << 16) | (ptPrimary.X & 0xFFFF));

            IntPtr lParamCrosvm = IntPtr.Zero;
            if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
            {
                NativeMethods.POINT sPt = new NativeMethods.POINT { X = ptPrimary.X, Y = ptPrimary.Y };
                NativeMethods.ClientToScreen(primaryHwnd, ref sPt);
                NativeMethods.ScreenToClient(crosvmHwnd, ref sPt);
                lParamCrosvm = (IntPtr)(((sPt.Y & 0xFFFF) << 16) | (sPt.X & 0xFFFF));
            }

            IntPtr lParamTop = IntPtr.Zero;
            if (topHwnd != IntPtr.Zero && topHwnd != primaryHwnd && topHwnd != crosvmHwnd)
            {
                NativeMethods.POINT sPt = new NativeMethods.POINT { X = ptPrimary.X, Y = ptPrimary.Y };
                NativeMethods.ClientToScreen(primaryHwnd, ref sPt);
                NativeMethods.ScreenToClient(topHwnd, ref sPt);
                lParamTop = (IntPtr)(((sPt.Y & 0xFFFF) << 16) | (sPt.X & 0xFFFF));
            }

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

            // 3. Win32 Background Activation Handshake
            try
            {
                IntPtr mouseActLParam = (IntPtr)((int)((uint)(ushort)msgDown << 16 | 1 /* HTCLIENT */));
                NativeMethods.SendMessage(primaryHwnd, 0x0021 /* WM_MOUSEACTIVATE */, topHwnd, mouseActLParam);
                if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
                {
                    NativeMethods.SendMessage(crosvmHwnd, 0x0021 /* WM_MOUSEACTIVATE */, topHwnd, mouseActLParam);
                }

                NativeMethods.PostMessage(primaryHwnd, 0x0006 /* WM_ACTIVATE */, (IntPtr)1 /* WA_ACTIVE */, IntPtr.Zero);
                if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
                {
                    NativeMethods.PostMessage(crosvmHwnd, 0x0006 /* WM_ACTIVATE */, (IntPtr)1 /* WA_ACTIVE */, IntPtr.Zero);
                }
                if (topHwnd != IntPtr.Zero && topHwnd != primaryHwnd && topHwnd != crosvmHwnd)
                {
                    NativeMethods.PostMessage(topHwnd, 0x0006 /* WM_ACTIVATE */, (IntPtr)1 /* WA_ACTIVE */, IntPtr.Zero);
                }

                NativeMethods.PostMessage(primaryHwnd, 0x0007 /* WM_SETFOCUS */, IntPtr.Zero, IntPtr.Zero);
                if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
                {
                    NativeMethods.PostMessage(crosvmHwnd, 0x0007 /* WM_SETFOCUS */, IntPtr.Zero, IntPtr.Zero);
                }
            }
            catch { }

            // 4. Send WM_SETCURSOR with HTCLIENT
            IntPtr setCursorLParam = (IntPtr)((0x0200 << 16) | 1 /* HTCLIENT */);
            NativeMethods.PostMessage(primaryHwnd, 0x0020 /* WM_SETCURSOR */, primaryHwnd, setCursorLParam);
            if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
            {
                NativeMethods.PostMessage(crosvmHwnd, 0x0020 /* WM_SETCURSOR */, crosvmHwnd, setCursorLParam);
            }

            // 5. Send WM_MOUSEMOVE first so crosvm virtio-input driver updates pointer position
            NativeMethods.PostMessage(primaryHwnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParamPrimary);
            if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
            {
                NativeMethods.PostMessage(crosvmHwnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParamCrosvm);
            }
            if (topHwnd != IntPtr.Zero && topHwnd != primaryHwnd && topHwnd != crosvmHwnd)
            {
                NativeMethods.PostMessage(topHwnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParamTop);
            }

            // Pacing delay (10ms) to let crosvm WindowProcedureThread and mouse_input_manager update cached coordinates
            Thread.Sleep(10);

            // 6. Send Button Down to both primary (subWin) and crosvm container
            NativeMethods.PostMessage(primaryHwnd, msgDown, wParam, lParamPrimary);
            if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
            {
                NativeMethods.PostMessage(crosvmHwnd, msgDown, wParam, lParamCrosvm);
            }
            if (topHwnd != IntPtr.Zero && topHwnd != primaryHwnd && topHwnd != crosvmHwnd)
            {
                NativeMethods.PostMessage(topHwnd, msgDown, wParam, lParamTop);
            }

            // 7. Hold duration: Ensure at least 35ms so Android OS 60Hz/120Hz touch loop catches the down-press
            int actualHold = Math.Max(35, holdMs);
            Thread.Sleep(actualHold);

            // 8. Send Button Up
            NativeMethods.PostMessage(primaryHwnd, msgUp, IntPtr.Zero, lParamPrimary);
            if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
            {
                NativeMethods.PostMessage(crosvmHwnd, msgUp, IntPtr.Zero, lParamCrosvm);
            }
            if (topHwnd != IntPtr.Zero && topHwnd != primaryHwnd && topHwnd != crosvmHwnd)
            {
                NativeMethods.PostMessage(topHwnd, msgUp, IntPtr.Zero, lParamTop);
            }

            // 9. Handle Double Click if requested
            if (mouseBtn == 3)
            {
                Thread.Sleep(30);
                NativeMethods.PostMessage(primaryHwnd, 0x0203 /* WM_LBUTTONDBLCLK */, wParam, lParamPrimary);
                if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
                {
                    NativeMethods.PostMessage(crosvmHwnd, 0x0203 /* WM_LBUTTONDBLCLK */, wParam, lParamCrosvm);
                }
                Thread.Sleep(actualHold);
                NativeMethods.PostMessage(primaryHwnd, msgUp, IntPtr.Zero, lParamPrimary);
                if (crosvmHwnd != IntPtr.Zero && crosvmHwnd != primaryHwnd)
                {
                    NativeMethods.PostMessage(crosvmHwnd, msgUp, IntPtr.Zero, lParamCrosvm);
                }
            }

            return true;
        }
    }
}
