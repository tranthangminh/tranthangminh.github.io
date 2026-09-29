using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Specialized adapter for BlueStacks 5 Android Emulator (HD-Player.exe).
    /// BlueStacks 5 encapsulates guest Android frame rendering and Qt event routing inside
    /// the child "HD-Player" container window. Background mouse messages (WM_LBUTTONDOWN/UP)
    /// must be posted directly to the "HD-Player" child window with at least 15ms hold duration
    /// to ensure Android's 60Hz input pipeline registers the touch event.
    /// </summary>
    public class BlueStacksAdapter : ISpecialAppAdapter
    {
        public string Name { get { return "BlueStacks"; } }

        public bool RequiresPhysicalClick { get { return false; } }

        public string OptimizationNote
        {
            get
            {
                return "Optimized for BlueStacks 5 (HD-Player). Free Mouse Mode clicks directly into the emulator guest window.";
            }
        }

        public bool IsMatch(string processName, string windowTitle, string className)
        {
            string proc = (processName ?? "").Trim();
            string title = (windowTitle ?? "").Trim();
            string cls = (className ?? "").Trim();

            if (proc.IndexOf("HD-Player", StringComparison.OrdinalIgnoreCase) >= 0 ||
                proc.IndexOf("BlueStacks", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            if (title.IndexOf("BlueStacks", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("HD-Player", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            if (cls.IndexOf("BlueStacksApp", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            if (cls.IndexOf("Qt", StringComparison.OrdinalIgnoreCase) >= 0 &&
                (title.IndexOf("BlueStacks", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 title.IndexOf("HD-Player", StringComparison.OrdinalIgnoreCase) >= 0))
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

            // 1. If passed BlueStacksApp (direct render surface), redirect to its parent HD-Player which handles input
            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(topHwnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();

            if (cls.IndexOf("BlueStacksApp", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                IntPtr parent = GetParent(topHwnd);
                if (parent != IntPtr.Zero) return parent;
                return topHwnd;
            }

            // 2. If already the HD-Player input container, return itself
            StringBuilder sbTitle = new StringBuilder(256);
            NativeMethods.GetWindowText(topHwnd, sbTitle, sbTitle.Capacity);
            string title = sbTitle.ToString();

            if (string.Equals(title, "HD-Player", StringComparison.OrdinalIgnoreCase))
            {
                return topHwnd;
            }

            // 3. Drill down into child windows to find the HD-Player input window
            IntPtr foundHdPlayer = IntPtr.Zero;
            IntPtr foundRenderSurface = IntPtr.Zero;
            IntPtr candidateSurface = IntPtr.Zero;
            int maxArea = 0;

            EnumChildWindows(topHwnd, (childHwnd, lParam) =>
            {
                if (!NativeMethods.IsWindowVisible(childHwnd)) return true;

                StringBuilder csbTitle = new StringBuilder(256);
                NativeMethods.GetWindowText(childHwnd, csbTitle, csbTitle.Capacity);
                string childTitle = csbTitle.ToString();

                StringBuilder csbClass = new StringBuilder(256);
                NativeMethods.GetClassName(childHwnd, csbClass, csbClass.Capacity);
                string childClass = csbClass.ToString();

                NativeMethods.RECT rc;
                if (NativeMethods.GetWindowRect(childHwnd, out rc))
                {
                    int w = rc.Right - rc.Left;
                    int h = rc.Bottom - rc.Top;
                    int area = w * h;
                    bool containsPt = (screenPt == Point.Empty) ||
                                      (screenPt.X >= rc.Left && screenPt.X <= rc.Right &&
                                       screenPt.Y >= rc.Top && screenPt.Y <= rc.Bottom);

                    // Primary target: BlueStacks 5 HD-Player input window
                    if (string.Equals(childTitle, "HD-Player", StringComparison.OrdinalIgnoreCase))
                    {
                        if (containsPt)
                        {
                            foundHdPlayer = childHwnd;
                            return false; // Found exact match
                        }
                        if (foundHdPlayer == IntPtr.Zero) foundHdPlayer = childHwnd;
                    }

                    // Direct match on legacy DirectX render surface (BlueStacks 4 / older builds)
                    if (childClass.IndexOf("Intermediate D3D Window", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (containsPt)
                        {
                            foundRenderSurface = childHwnd;
                        }
                        else if (foundRenderSurface == IntPtr.Zero)
                        {
                            foundRenderSurface = childHwnd;
                        }
                    }
                    else if (area > maxArea && (childClass.IndexOf("Qt", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                childClass.IndexOf("subWin", StringComparison.OrdinalIgnoreCase) >= 0))
                    {
                        maxArea = area;
                        if (containsPt)
                        {
                            candidateSurface = childHwnd;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (foundHdPlayer != IntPtr.Zero) return foundHdPlayer;
            if (foundRenderSurface != IntPtr.Zero) return foundRenderSurface;
            if (candidateSurface != IntPtr.Zero) return candidateSurface;

            return topHwnd;
        }

        public bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            IntPtr topHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (topHwnd == IntPtr.Zero) topHwnd = targetHwnd;

            // 1. Check if target or its child is BlueStacksApp (direct Android render surface)
            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(targetHwnd, sbClass, sbClass.Capacity);
            bool isBlueStacksApp = sbClass.ToString().IndexOf("BlueStacksApp", StringComparison.OrdinalIgnoreCase) >= 0;

            IntPtr childApp = IntPtr.Zero;
            if (isBlueStacksApp)
            {
                childApp = targetHwnd;
                IntPtr parent = GetParent(targetHwnd);
                if (parent != IntPtr.Zero) topHwnd = parent;
            }
            else
            {
                childApp = NativeMethods.FindWindowEx(targetHwnd, IntPtr.Zero, "BlueStacksApp", null);
            }

            // 2. Safety check: If target is the outer top window, resolve to HD-Player child and convert client coords
            StringBuilder sbTitle = new StringBuilder(256);
            NativeMethods.GetWindowText(targetHwnd, sbTitle, sbTitle.Capacity);
            if (!string.Equals(sbTitle.ToString(), "HD-Player", StringComparison.OrdinalIgnoreCase) && !isBlueStacksApp)
            {
                IntPtr resolved = ResolveTargetHandle(targetHwnd, Point.Empty);
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
            else // Left
            {
                msgDown = 0x0201;
                msgUp = 0x0202;
                wParam = (IntPtr)0x0001; // MK_LBUTTON
            }

            // 3. Win32 Background Activation Handshake (Notifies Qt event pump of active client click without stealing user focus)
            try
            {
                // Send WM_MOUSEACTIVATE to notify window of impending click on HTCLIENT
                IntPtr mouseActLParam = (IntPtr)((int)((uint)(ushort)msgDown << 16 | 1 /* HTCLIENT */));
                NativeMethods.SendMessage(targetHwnd, 0x0021 /* WM_MOUSEACTIVATE */, topHwnd, mouseActLParam);

                // Send synthetic WM_ACTIVATE (WA_ACTIVE = 1) without stealing system-wide foreground
                NativeMethods.SendMessage(targetHwnd, 0x0006 /* WM_ACTIVATE */, (IntPtr)1 /* WA_ACTIVE */, IntPtr.Zero);

                // Send synthetic WM_SETFOCUS
                NativeMethods.SendMessage(targetHwnd, 0x0007 /* WM_SETFOCUS */, IntPtr.Zero, IntPtr.Zero);
            }
            catch { }

            // 4. Send WM_SETCURSOR with HTCLIENT to prepare BlueStacks Qt surface
            IntPtr setCursorLParam = (IntPtr)((0x0200 << 16) | 1 /* HTCLIENT */);
            NativeMethods.PostMessage(targetHwnd, 0x0020 /* WM_SETCURSOR */, targetHwnd, setCursorLParam);

            // 5. Send WM_MOUSEMOVE
            NativeMethods.PostMessage(targetHwnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);

            // 6. Send Button Down with MK_LBUTTON / MK_RBUTTON to target window
            NativeMethods.PostMessage(targetHwnd, msgDown, wParam, lParam);

            // Forward to BlueStacksApp render surface if present
            if (childApp != IntPtr.Zero && childApp != targetHwnd)
            {
                NativeMethods.POINT ptOnChild = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
                NativeMethods.ClientToScreen(targetHwnd, ref ptOnChild);
                NativeMethods.ScreenToClient(childApp, ref ptOnChild);
                IntPtr childLParam = (IntPtr)(((ptOnChild.Y & 0xFFFF) << 16) | (ptOnChild.X & 0xFFFF));

                NativeMethods.PostMessage(childApp, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, childLParam);
                NativeMethods.PostMessage(childApp, msgDown, wParam, childLParam);
            }

            // 7. Hold: ensure at least 15ms so Android OS 60Hz touch pipeline samples the touch down
            int actualHold = Math.Max(15, holdMs);
            Thread.Sleep(actualHold);

            // 8. Send Button Up
            NativeMethods.PostMessage(targetHwnd, msgUp, IntPtr.Zero, lParam);
            if (childApp != IntPtr.Zero && childApp != targetHwnd)
            {
                NativeMethods.POINT ptOnChild = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
                NativeMethods.ClientToScreen(targetHwnd, ref ptOnChild);
                NativeMethods.ScreenToClient(childApp, ref ptOnChild);
                IntPtr childLParam = (IntPtr)(((ptOnChild.Y & 0xFFFF) << 16) | (ptOnChild.X & 0xFFFF));
                NativeMethods.PostMessage(childApp, msgUp, IntPtr.Zero, childLParam);
            }

            return true;
        }
    }
}
