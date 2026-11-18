using System;
using System.Drawing;
using System.Runtime.InteropServices;

namespace ModernAutoClicker
{
    public static class NativeMethods
    {
        public static readonly uint CurrentProcessId = ReadCurrentProcessId();

        private static uint ReadCurrentProcessId()
        {
            using (System.Diagnostics.Process current = System.Diagnostics.Process.GetCurrentProcess())
            {
                return (uint)current.Id;
            }
        }

        public const int WM_SETREDRAW = 0x000B;
        public const int WM_HOTKEY = 0x0312;

        public const int HOTKEY_START_ID = 9001;    // F6 / Start or Toggle Active Tab
        public const int HOTKEY_STOP_ALL_ID = 9002; // F7 / Stop ALL

        public const int INPUT_MOUSE = 0;
        public const int INPUT_KEYBOARD = 1;
        public const int INPUT_HARDWARE = 2;

        public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        public const uint KEYEVENTF_KEYUP = 0x0002;
        public const uint KEYEVENTF_UNICODE = 0x0004;
        public const uint KEYEVENTF_SCANCODE = 0x0008;

        public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        public const uint MOUSEEVENTF_LEFTUP = 0x0004;
        public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        public const uint MOUSEEVENTF_WHEEL = 0x0800;

        public const int SW_HIDE = 0;
        public const int SW_SHOWNOACTIVATE = 4;
        public const int GWL_EXSTYLE = -20;
        public const int WS_EX_TRANSPARENT = 0x00000020;

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        public static extern uint MapVirtualKey(uint uCode, uint uMapType);

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        public static extern IntPtr GetFocus();

        [DllImport("user32.dll")]
        public static extern IntPtr GetWindowDC(IntPtr hWnd);

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Explicit)]
        public struct InputUnion
        {
            [FieldOffset(0)]
            public MOUSEINPUT mi;
            [FieldOffset(0)]
            public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        public static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentThreadId();

        public const int SW_RESTORE = 9;

        public static void ForceSetForegroundWindow(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero || !IsWindow(hWnd)) return;

            IntPtr fgWnd = GetForegroundWindow();
            if (fgWnd == hWnd) return;

            if (IsIconic(hWnd))
            {
                ShowWindow(hWnd, SW_RESTORE);
            }

            uint fgThread = 0;
            if (fgWnd != IntPtr.Zero)
            {
                GetWindowThreadProcessId(fgWnd, out fgThread);
            }
            uint currentThread = GetCurrentThreadId();

            bool attached = false;
            if (fgThread != 0 && fgThread != currentThread)
            {
                attached = AttachThreadInput(currentThread, fgThread, true);
            }

            try
            {
                BringWindowToTop(hWnd);
                SetForegroundWindow(hWnd);
            }
            finally
            {
                if (attached)
                {
                    AttachThreadInput(currentThread, fgThread, false);
                }
            }
        }

        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
        private static extern IntPtr GetWindowLong32(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
        private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
        private static extern IntPtr SetWindowLong32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
        private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        [DllImport("user32.dll")]
        public static extern IntPtr GetDC(IntPtr hwnd);

        [DllImport("user32.dll")]
        public static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);

        [DllImport("gdi32.dll")]
        public static extern uint GetPixel(IntPtr hdc, int nXPos, int nYPos);

        public static Color GetPixelColor(int x, int y)
        {
            IntPtr hdc = GetDC(IntPtr.Zero);
            try
            {
                uint pixel = GetPixel(hdc, x, y);
                if (pixel == 0xFFFFFFFF) return Color.Black;
                byte r = (byte)(pixel & 0x000000FF);
                byte g = (byte)((pixel & 0x0000FF00) >> 8);
                byte b = (byte)((pixel & 0x00FF0000) >> 16);
                return Color.FromArgb(r, g, b);
            }
            catch
            {
                return Color.Black;
            }
            finally
            {
                ReleaseDC(IntPtr.Zero, hdc);
            }
        }

        public static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex)
        {
            if (IntPtr.Size == 8)
                return GetWindowLongPtr64(hWnd, nIndex);
            else
                return GetWindowLong32(hWnd, nIndex);
        }

        public static IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong)
        {
            if (IntPtr.Size == 8)
                return SetWindowLongPtr64(hWnd, nIndex, dwNewLong);
            else
                return SetWindowLong32(hWnd, nIndex, dwNewLong);
        }

        public const uint GA_ROOT = 2;

        [DllImport("user32.dll")]
        public static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);

        public static IntPtr GetTopLevelWindow(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return IntPtr.Zero;
            IntPtr root = GetAncestor(hWnd, GA_ROOT);
            return (root != IntPtr.Zero) ? root : hWnd;
        }

        [DllImport("user32.dll")]
        public static extern IntPtr WindowFromPoint(POINT Point);

        [DllImport("user32.dll")]
        public static extern IntPtr RealChildWindowFromPoint(IntPtr hwndParent, POINT ptParentClientCoords);

        [DllImport("user32.dll")]
        public static extern bool ScreenToClient(IntPtr hWnd, ref POINT lpPoint);

        [DllImport("user32.dll")]
        public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern bool IsChild(IntPtr hWndParent, IntPtr hWnd);

        public const uint WDA_NONE = 0x00000000;
        public const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        public const uint PW_CLIENTONLY = 0x00000001;
        public const uint PW_RENDERFULLCONTENT = 0x00000002;

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

        [DllImport("gdi32.dll")]
        public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

        [DllImport("gdi32.dll")]
        public static extern bool DeleteDC(IntPtr hdc);

        [DllImport("gdi32.dll")]
        public static extern bool DeleteObject(IntPtr hObject);

        [DllImport("user32.dll")]
        public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        public static void SendPhysicalClick(int mouseBtn, int holdMs)
        {
            uint downFlag = MOUSEEVENTF_LEFTDOWN;
            uint upFlag = MOUSEEVENTF_LEFTUP;

            if (mouseBtn == 3) // Double Click
            {
                // Click 1
                INPUT[] d1 = new INPUT[1];
                d1[0].type = INPUT_MOUSE;
                d1[0].u.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
                SendInput(1, d1, Marshal.SizeOf(typeof(INPUT)));
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                INPUT[] u1 = new INPUT[1];
                u1[0].type = INPUT_MOUSE;
                u1[0].u.mi.dwFlags = MOUSEEVENTF_LEFTUP;
                SendInput(1, u1, Marshal.SizeOf(typeof(INPUT)));

                System.Threading.Thread.Sleep(30);

                // Click 2
                INPUT[] d2 = new INPUT[1];
                d2[0].type = INPUT_MOUSE;
                d2[0].u.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
                SendInput(1, d2, Marshal.SizeOf(typeof(INPUT)));
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                INPUT[] u2 = new INPUT[1];
                u2[0].type = INPUT_MOUSE;
                u2[0].u.mi.dwFlags = MOUSEEVENTF_LEFTUP;
                SendInput(1, u2, Marshal.SizeOf(typeof(INPUT)));
                return;
            }

            if (mouseBtn == 1) // Right
            {
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
            }
            else if (mouseBtn == 2) // Middle
            {
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
            }

            INPUT[] inputDown = new INPUT[1];
            inputDown[0].type = INPUT_MOUSE;
            inputDown[0].u.mi.dwFlags = downFlag;
            SendInput(1, inputDown, Marshal.SizeOf(typeof(INPUT)));

            if (holdMs > 0)
            {
                System.Threading.Thread.Sleep(holdMs);
            }

            INPUT[] inputUp = new INPUT[1];
            inputUp[0].type = INPUT_MOUSE;
            inputUp[0].u.mi.dwFlags = upFlag;
            SendInput(1, inputUp, Marshal.SizeOf(typeof(INPUT)));
        }

        [DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);

        public static bool IsKeyDown(int vKey)
        {
            return (GetAsyncKeyState(vKey) & 0x8000) != 0;
        }

        /// <summary>
        /// Releases only the mouse buttons that are actually held down (e.g. a script stopped mid-drag).
        /// Sending an unconditional RIGHTUP makes Windows raise WM_CONTEXTMENU, i.e. a phantom right-click.
        /// </summary>
        public static void ReleaseAllMouseButtons()
        {
            System.Collections.Generic.List<INPUT> upInputs = new System.Collections.Generic.List<INPUT>();
            if (IsKeyDown(0x01)) upInputs.Add(CreateMouseInput(MOUSEEVENTF_LEFTUP));   // VK_LBUTTON
            if (IsKeyDown(0x02)) upInputs.Add(CreateMouseInput(MOUSEEVENTF_RIGHTUP));  // VK_RBUTTON
            if (IsKeyDown(0x04)) upInputs.Add(CreateMouseInput(MOUSEEVENTF_MIDDLEUP)); // VK_MBUTTON
            if (upInputs.Count > 0)
            {
                SendInput((uint)upInputs.Count, upInputs.ToArray(), Marshal.SizeOf(typeof(INPUT)));
            }
        }

        private static INPUT CreateMouseInput(uint flags)
        {
            INPUT inp = new INPUT();
            inp.type = INPUT_MOUSE;
            inp.u.mi.dwFlags = flags;
            return inp;
        }

        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);

        [DllImport("user32.dll")]
        public static extern IntPtr ChildWindowFromPointEx(IntPtr hWndParent, POINT pt, uint uFlags);

        public static IntPtr FindDeepestChild(IntPtr parent, POINT screenPt)
        {
            if (parent == IntPtr.Zero) return IntPtr.Zero;

            // 0. Check registered Special App Adapters (BlueStacks, Desktop, Chromium, etc.)
            IntPtr specialChild = ModernAutoClicker.SpecialApps.SpecialAppRegistry.ResolveTargetHandle(parent, new Point(screenPt.X, screenPt.Y));
            if (specialChild != IntPtr.Zero) return specialChild;

            // Recursive search down child window tree (up to 12 levels)
            IntPtr current = parent;
            for (int depth = 0; depth < 12; depth++)
            {
                POINT ptInCurrent = screenPt;
                if (!ScreenToClient(current, ref ptInCurrent)) break;

                IntPtr nextChild = RealChildWindowFromPoint(current, ptInCurrent);
                if (nextChild == IntPtr.Zero || nextChild == current)
                {
                    // Fallback to ChildWindowFromPointEx (CWP_SKIPINVISIBLE | CWP_SKIPTRANSPARENT = 0x0005)
                    nextChild = ChildWindowFromPointEx(current, ptInCurrent, 0x0005);
                    if (nextChild == IntPtr.Zero || nextChild == current)
                    {
                        break; // Reached leaf window
                    }
                }
                current = nextChild;
            }
            return current;
        }

        // MK_* key flags carried by mouse messages: a background click cannot change the target's keyboard state, so a held
        // Ctrl / Shift (Press & Click) is passed in the message itself, which is what most apps read for Ctrl+Click / Shift+Click
        public const int MK_SHIFT = 0x0004;
        public const int MK_CONTROL = 0x0008;

        public static void SendBackgroundClick(int screenX, int screenY, int mouseBtn, int holdMs = 10, int keyFlags = 0)
        {
            POINT screenPt = new POINT { X = screenX, Y = screenY };
            IntPtr topHwnd = WindowFromPoint(screenPt);
            if (topHwnd == IntPtr.Zero) return;

            PostClickAt(topHwnd, screenPt, mouseBtn, holdMs, keyFlags);
        }

        public static void PerformClickDirectToWindow(IntPtr hWnd, int clientX, int clientY, int mouseBtn, int holdMs, int keyFlags = 0)
        {
            if (hWnd == IntPtr.Zero) return;
            POINT screenPt = new POINT { X = clientX, Y = clientY };
            ClientToScreen(hWnd, ref screenPt);
            PostClickAt(hWnd, screenPt, mouseBtn, holdMs, keyFlags);
        }

        // Posts a click to the deepest child of parent under screenPt; the real cursor and the foreground window stay where they are
        private static void PostClickAt(IntPtr parent, POINT screenPt, int mouseBtn, int holdMs, int keyFlags)
        {
            IntPtr targetHwnd = FindDeepestChild(parent, screenPt);
            if (targetHwnd == IntPtr.Zero) targetHwnd = parent;

            POINT clientPt = screenPt;
            ScreenToClient(targetHwnd, ref clientPt);
            FocusGuard.NoteBackgroundInput(targetHwnd);

            if (ModernAutoClicker.SpecialApps.SpecialAppRegistry.TryBackgroundClick(targetHwnd, new Point(clientPt.X, clientPt.Y), mouseBtn, holdMs))
            {
                return;
            }

            IntPtr lParam = MakeLParam(clientPt.X, clientPt.Y);
            PrepareBackgroundTarget(targetHwnd, lParam, keyFlags);

            uint msgDown = WM_LBUTTONDOWN, msgUp = WM_LBUTTONUP;
            int button = MK_LBUTTON;
            if (mouseBtn == 1) { msgDown = WM_RBUTTONDOWN; msgUp = WM_RBUTTONUP; button = MK_RBUTTON; }
            else if (mouseBtn == 2) { msgDown = WM_MBUTTONDOWN; msgUp = WM_MBUTTONUP; button = MK_MBUTTON; }

            PostMessage(targetHwnd, msgDown, (IntPtr)(button | keyFlags), lParam);
            if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
            PostMessage(targetHwnd, msgUp, (IntPtr)keyFlags, lParam);

            if (mouseBtn == 3) // Double click: the second press arrives as WM_LBUTTONDBLCLK, as Windows sends it for a real one
            {
                System.Threading.Thread.Sleep(30);
                PostMessage(targetHwnd, WM_LBUTTONDBLCLK, (IntPtr)(MK_LBUTTON | keyFlags), lParam);
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                PostMessage(targetHwnd, WM_LBUTTONUP, (IntPtr)keyFlags, lParam);
            }
        }

        public const uint WM_ACTIVATE = 0x0006, WM_ACTIVATEAPP = 0x001C, WM_MOUSEMOVE = 0x0200;
        public const uint WM_LBUTTONDOWN = 0x0201, WM_LBUTTONUP = 0x0202, WM_LBUTTONDBLCLK = 0x0203;
        public const uint WM_RBUTTONDOWN = 0x0204, WM_RBUTTONUP = 0x0205, WM_MBUTTONDOWN = 0x0207, WM_MBUTTONUP = 0x0208;
        public const int MK_LBUTTON = 0x0001, MK_RBUTTON = 0x0002, MK_MBUTTON = 0x0010;

        public static IntPtr MakeLParam(int x, int y)
        {
            return (IntPtr)(((y & 0xFFFF) << 16) | (x & 0xFFFF));
        }

        // A window behind others often drops posted mouse input: many games only read the mouse while they believe they are the
        // active app, and many buttons only react to a press the pointer has hovered first. So the window is told it is active
        // (a message in its own queue: the real foreground window does not change) and the pointer is moved there before the press.
        // The window in front gets nothing extra, as before.
        public static void PrepareBackgroundTarget(IntPtr targetHwnd, IntPtr lParam, int keyFlags)
        {
            if (PostActivation(targetHwnd)) PostMessage(targetHwnd, WM_MOUSEMOVE, (IntPtr)keyFlags, lParam);
        }

        // False for the window in front, which needs nothing
        public static bool PostActivation(IntPtr hwnd)
        {
            IntPtr top = GetTopLevelWindow(hwnd);
            if (top == IntPtr.Zero || GetForegroundWindow() == top) return false;
            PostMessage(top, WM_ACTIVATEAPP, (IntPtr)1, IntPtr.Zero);
            PostMessage(top, WM_ACTIVATE, (IntPtr)1 /* WA_ACTIVE */, IntPtr.Zero);
            return true;
        }

        // The child under a screen point of parent, or of whatever window is on top there when parent is zero (All Screens)
        private static IntPtr ChildAt(IntPtr parent, POINT screenPt)
        {
            if (parent == IntPtr.Zero) parent = WindowFromPoint(screenPt);
            if (parent == IntPtr.Zero) return IntPtr.Zero;
            IntPtr child = FindDeepestChild(parent, screenPt);
            return child != IntPtr.Zero ? child : parent;
        }

        // A drag sent as messages to the window under the start point: press, moves with the button held, release
        public static void PostDrag(IntPtr parent, Point start, Point end, int durationMs, int dragButton, int keyFlags)
        {
            IntPtr target = ChildAt(parent, new POINT { X = start.X, Y = start.Y });
            if (target == IntPtr.Zero) return;
            FocusGuard.NoteBackgroundInput(target);

            uint msgDown = WM_LBUTTONDOWN, msgUp = WM_LBUTTONUP;
            int button = MK_LBUTTON;
            if (dragButton == 1) { msgDown = WM_RBUTTONDOWN; msgUp = WM_RBUTTONUP; button = MK_RBUTTON; }
            else if (dragButton == 2) { msgDown = WM_MBUTTONDOWN; msgUp = WM_MBUTTONUP; button = MK_MBUTTON; }

            Func<int, int, IntPtr> clientLParam = (x, y) =>
            {
                POINT c = new POINT { X = x, Y = y };
                ScreenToClient(target, ref c);
                return MakeLParam(c.X, c.Y);
            };

            PostActivation(target);
            PostMessage(target, WM_MOUSEMOVE, (IntPtr)keyFlags, clientLParam(start.X, start.Y));
            PostMessage(target, msgDown, (IntPtr)(button | keyFlags), clientLParam(start.X, start.Y));

            int duration = Math.Max(20, durationMs);
            int steps = Math.Max(2, duration / 10);
            for (int i = 1; i <= steps; i++)
            {
                System.Threading.Thread.Sleep(duration / steps);
                int x = start.X + (end.X - start.X) * i / steps;
                int y = start.Y + (end.Y - start.Y) * i / steps;
                PostMessage(target, WM_MOUSEMOVE, (IntPtr)(button | keyFlags), clientLParam(x, y));
            }
            PostMessage(target, msgUp, (IntPtr)keyFlags, clientLParam(end.X, end.Y));
        }

        // One press or release on its own, for Press & Click with the click first: the key goes between the two
        public static void PostButton(IntPtr parent, Point screenPt, int mouseBtn, bool down, int keyFlags)
        {
            POINT sp = new POINT { X = screenPt.X, Y = screenPt.Y };
            IntPtr target = ChildAt(parent, sp);
            if (target == IntPtr.Zero) return;
            POINT c = sp;
            ScreenToClient(target, ref c);
            IntPtr lParam = MakeLParam(c.X, c.Y);

            int button = mouseBtn == 1 ? MK_RBUTTON : (mouseBtn == 2 ? MK_MBUTTON : MK_LBUTTON);
            if (down)
            {
                FocusGuard.NoteBackgroundInput(target);
                PrepareBackgroundTarget(target, lParam, keyFlags);
                PostMessage(target, mouseBtn == 1 ? WM_RBUTTONDOWN : (mouseBtn == 2 ? WM_MBUTTONDOWN : WM_LBUTTONDOWN), (IntPtr)(button | keyFlags), lParam);
            }
            else
            {
                PostMessage(target, mouseBtn == 1 ? WM_RBUTTONUP : (mouseBtn == 2 ? WM_MBUTTONUP : WM_LBUTTONUP), (IntPtr)keyFlags, lParam);
            }
        }

        // Wheel notches sent to the window under the point; WM_MOUSEWHEEL carries screen coordinates
        public static void PostWheel(IntPtr parent, Point screenPt, int notches, int singleDelta, int delayPerNotch)
        {
            IntPtr target = ChildAt(parent, new POINT { X = screenPt.X, Y = screenPt.Y });
            if (target == IntPtr.Zero) return;
            FocusGuard.NoteBackgroundInput(target);
            PostActivation(target);

            IntPtr wParam = (IntPtr)((int)((uint)(ushort)(short)singleDelta << 16));
            IntPtr lParam = MakeLParam(screenPt.X, screenPt.Y);
            for (int i = 0; i < notches; i++)
            {
                PostMessage(target, 0x020A /* WM_MOUSEWHEEL */, wParam, lParam);
                if (delayPerNotch > 0) System.Threading.Thread.Sleep(delayPerNotch);
            }
        }

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public const int WM_GETICON = 0x007F;
        public const int ICON_SMALL = 0;
        public const int ICON_BIG = 1;
        public const int ICON_SMALL2 = 2;
        public const int GCLP_HICON = -14;
        public const int GCLP_HICONSM = -34;

        [DllImport("user32.dll", EntryPoint = "GetClassLong")]
        private static extern IntPtr GetClassLong32(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "GetClassLongPtr")]
        private static extern IntPtr GetClassLongPtr64(IntPtr hWnd, int nIndex);

        public static IntPtr GetClassLongPtr(IntPtr hWnd, int nIndex)
        {
            if (IntPtr.Size == 8)
                return GetClassLongPtr64(hWnd, nIndex);
            else
                return GetClassLong32(hWnd, nIndex);
        }

        public static string GetFriendlyAppName(System.Diagnostics.Process proc)
        {
            if (proc == null) return "App";
            try
            {
                if (proc.MainModule != null && !string.IsNullOrEmpty(proc.MainModule.FileName))
                {
                    var vi = System.Diagnostics.FileVersionInfo.GetVersionInfo(proc.MainModule.FileName);
                    if (!string.IsNullOrEmpty(vi.FileDescription) && vi.FileDescription.Trim().Length > 0)
                        return vi.FileDescription.Trim();
                    if (!string.IsNullOrEmpty(vi.ProductName) && vi.ProductName.Trim().Length > 0)
                        return vi.ProductName.Trim();
                }
            }
            catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }

            try
            {
                if (!string.IsNullOrEmpty(proc.ProcessName))
                {
                    return proc.ProcessName;
                }
            }
            catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }

            return "App";
        }

        public static string GetProcessFriendlyName(string processName)
        {
            if (string.IsNullOrEmpty(processName)) return "";
            try
            {
                var procs = System.Diagnostics.Process.GetProcessesByName(processName);
                try
                {
                    if (procs.Length > 0)
                    {
                        return GetFriendlyAppName(procs[0]);
                    }
                }
                finally
                {
                    foreach (var p in procs) p.Dispose();
                }
            }
            catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
            return processName;
        }

        public class WindowTargetInfo
        {
            public IntPtr Hwnd { get; set; }
            public string Title { get; set; }
            public string ProcessName { get; set; }
            public string FriendlyAppName { get; set; }
            public string ClassName { get; set; }
            public Image AppIcon { get; set; }
            public uint ProcessId { get; set; }
            public DateTime StartTime { get; set; }

            public int WindowIndex { get; set; }

            public override string ToString()
            {
                string appName = !string.IsNullOrEmpty(FriendlyAppName) ? FriendlyAppName : ProcessName;
                string baseDisplay;
                if (string.IsNullOrEmpty(Title) || string.Equals(Title, appName, StringComparison.OrdinalIgnoreCase))
                    baseDisplay = string.Format("{0}", appName);
                else if (Title.Length > 30)
                    baseDisplay = string.Format("{0} - {1}...", appName, Title.Substring(0, 27));
                else
                    baseDisplay = string.Format("{0} - {1}", appName, Title);

                if (ProcessId > 0)
                {
                    if (WindowIndex > 0)
                    {
                        return string.Format("{0} [PID: {1} #{2}]", baseDisplay, ProcessId, WindowIndex);
                    }
                    return string.Format("{0} [PID: {1}]", baseDisplay, ProcessId);
                }

                if (WindowIndex > 0)
                {
                    return string.Format("{0} ({1})", baseDisplay, WindowIndex);
                }
                return baseDisplay;
            }
        }

        public const int WS_EX_TOOLWINDOW = 0x00000080;
        public const int WS_EX_APPWINDOW = 0x00040000;
        public const uint GW_OWNER = 4;
        public const int DWMWA_CLOAKED = 14;

        [DllImport("user32.dll")]
        public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

        [DllImport("dwmapi.dll")]
        public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);

        public static System.Collections.Generic.List<WindowTargetInfo> GetOpenWindows()
        {
            var list = new System.Collections.Generic.List<WindowTargetInfo>();
            uint myPid = NativeMethods.CurrentProcessId;
            var seenKeys = new System.Collections.Generic.HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // 0. Explicitly include Windows Desktop
            IntPtr progman = FindWindow("Progman", null);
            if (progman != IntPtr.Zero && IsWindow(progman))
            {
                list.Add(new WindowTargetInfo
                {
                    Hwnd = progman,
                    Title = "Windows Desktop",
                    ProcessName = "explorer",
                    FriendlyAppName = "Windows Desktop",
                    ClassName = "Progman",
                    AppIcon = IconCache.GetWindowAppIcon(progman)
                });
                seenKeys.Add(progman.ToInt64().ToString());
            }

            EnumWindows((hWnd, lParam) =>
            {
                string title, className;
                if (!TryGetPickableWindowInfo(hWnd, out title, out className)) return true;

                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid == myPid || pid == 0) return true;

                string procName = "App";
                string friendlyName = "App";
                DateTime startTime = DateTime.MinValue;
                try
                {
                    var p = System.Diagnostics.Process.GetProcessById((int)pid);
                    procName = p.ProcessName;
                    friendlyName = GetFriendlyAppName(p);
                    try { startTime = p.StartTime; } catch (Exception) { /* An elevated or system process hides its start time: it simply sorts last */ }
                    p.Dispose();
                }
                catch (Exception) { /* The process ended while the windows were being listed */ }

                // 8. Deduplicate identical window entries by hWnd
                string dedupKey = hWnd.ToInt64().ToString();
                if (seenKeys.Contains(dedupKey))
                {
                    return true;
                }
                seenKeys.Add(dedupKey);

                Image appIcon = IconCache.GetWindowAppIcon(hWnd);
                if (appIcon == null)
                {
                    appIcon = IconCache.GenericAppIcon;
                }

                list.Add(new WindowTargetInfo
                {
                    Hwnd = hWnd,
                    Title = title,
                    ProcessName = procName,
                    FriendlyAppName = friendlyName,
                    ClassName = className,
                    AppIcon = appIcon,
                    ProcessId = pid,
                    StartTime = startTime
                });

                return true;
            }, IntPtr.Zero);

            // Differentiate windows that share the exact same ProcessName and Title
            var groups = new System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<WindowTargetInfo>>(StringComparer.OrdinalIgnoreCase);
            foreach (var item in list)
            {
                string key = string.Format("{0}|{1}", item.ProcessName, item.Title);
                System.Collections.Generic.List<WindowTargetInfo> group;
                if (!groups.TryGetValue(key, out group))
                {
                    group = new System.Collections.Generic.List<WindowTargetInfo>();
                    groups[key] = group;
                }
                group.Add(item);
            }

            foreach (var kvp in groups)
            {
                var group = kvp.Value;
                if (group.Count > 1)
                {
                    // Deterministic sorting: Earliest process StartTime first (Instance 1), then PID ascending, then HWND ascending
                    group.Sort((a, b) =>
                    {
                        if (a.StartTime != DateTime.MinValue && b.StartTime != DateTime.MinValue && a.StartTime != b.StartTime)
                        {
                            return a.StartTime.CompareTo(b.StartTime);
                        }
                        int cmp = a.ProcessId.CompareTo(b.ProcessId);
                        if (cmp != 0) return cmp;
                        return a.Hwnd.ToInt64().CompareTo(b.Hwnd.ToInt64());
                    });

                    for (int i = 0; i < group.Count; i++)
                    {
                        group[i].WindowIndex = i + 1;
                    }
                }
            }

            return list;
        }

        // True for a real top-level app window a user could pick as a target (minimized ones included)
        private static bool TryGetPickableWindowInfo(IntPtr hWnd, out string title, out string className)
        {
            title = "";
            className = "";

            // 1. Basic visibility check
            if (!IsWindowVisible(hWnd)) return false;

            // 2. Cloaked Window check (DWMWA_CLOAKED filters out background UWP/PowerToys/Snipping Tool instances)
            int cloaked = 0;
            if (DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out cloaked, sizeof(int)) == 0 && cloaked != 0)
            {
                return false;
            }

            // 3. Extended styles: ignore tool windows, tooltip popups unless explicitly an AppWindow
            int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
            if ((exStyle & WS_EX_TOOLWINDOW) != 0 && (exStyle & WS_EX_APPWINDOW) == 0)
            {
                return false;
            }

            // 4. Owner window check: ignore child / popup / owned dialogs of other windows
            IntPtr owner = GetWindow(hWnd, GW_OWNER);
            if (owner != IntPtr.Zero && (exStyle & WS_EX_APPWINDOW) == 0)
            {
                return false;
            }

            // 5. Dimension check: ignore zero-sized / off-screen phantom windows
            RECT rect;
            if (GetWindowRect(hWnd, out rect))
            {
                if (rect.Right - rect.Left <= 10 || rect.Bottom - rect.Top <= 10)
                {
                    return false;
                }
            }

            // 6. Title length and content check
            title = GetWindowTitleText(hWnd).Trim();
            if (string.IsNullOrEmpty(title)) return false;

            // Blacklisted system titles
            if (title == "Default IME" || title == "MSCTFIME UI" || title == "MediaContextNotificationWindow" ||
                title == "Task Switching" || title == "Windows Shell Experience Host" || title == "PopupHost")
            {
                return false;
            }

            var sbClass = new System.Text.StringBuilder(256);
            GetClassName(hWnd, sbClass, sbClass.Capacity);
            className = sbClass.ToString();

            // 7. Blacklisted system window classes
            if (className == "Progman" || className == "WorkerW" ||
                className == "Shell_TrayWnd" || className == "Shell_SecondaryTrayWnd" ||
                className == "Windows.UI.Core.CoreWindow" || className == "EdgeUiInputTopWndClass" ||
                className == "EdgeUiInputWndClass" || className == "DummyDWMListenerWindow" ||
                className == "MsgrIMEWindowClass" || className == "SysDragImage" ||
                className == "ApplicationFrameTitleBarWindow")
            {
                return false;
            }

            return true;
        }

        public static int ResolveWindowIndex(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return 0;
            var windows = GetOpenWindows();
            foreach (var win in windows)
            {
                if (win.Hwnd == hWnd)
                {
                    return win.WindowIndex;
                }
            }
            return 0;
        }


        public static bool IsValidWindowHandle(IntPtr hWnd, uint targetPid = 0, string procName = null)
        {
            if (hWnd == IntPtr.Zero) return false;
            if (!IsWindow(hWnd) || !IsWindowVisible(hWnd) || IsIconic(hWnd)) return false;

            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == 0) return false;

            if (targetPid > 0)
            {
                return pid == targetPid;
            }

            if (!string.IsNullOrEmpty(procName))
            {
                string actualName = GetProcessNameCached(hWnd, pid);
                if (actualName == null) return false;

                string clean = procName.Trim();
                if (clean.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                {
                    clean = clean.Substring(0, clean.Length - 4);
                }
                return string.Equals(actualName, clean, StringComparison.OrdinalIgnoreCase);
            }
            return true;
        }

        private class ProcessNameCacheEntry
        {
            public uint Pid;
            public string Name;
        }

        private static readonly System.Collections.Generic.Dictionary<IntPtr, ProcessNameCacheEntry> _processNameCache = new System.Collections.Generic.Dictionary<IntPtr, ProcessNameCacheEntry>();

        /// <summary>
        /// Returns the process name owning hWnd without calling Process.GetProcessById on every click.
        /// Cached per window handle: a live HWND that still reports the same PID belongs to the same process,
        /// so the entry cannot go stale (a dead window or a reused PID changes the HWND/PID pair). Returns null on failure (never cached).
        /// </summary>
        public static string GetProcessNameCached(IntPtr hWnd, uint pid)
        {
            if (hWnd == IntPtr.Zero || pid == 0) return null;

            lock (_processNameCache)
            {
                ProcessNameCacheEntry entry;
                if (_processNameCache.TryGetValue(hWnd, out entry) && entry.Pid == pid)
                {
                    return entry.Name;
                }
            }

            string name;
            try
            {
                using (var p = System.Diagnostics.Process.GetProcessById((int)pid))
                {
                    name = p.ProcessName;
                }
            }
            catch
            {
                return null;
            }

            lock (_processNameCache)
            {
                if (_processNameCache.Count >= 256) _processNameCache.Clear();
                _processNameCache[hWnd] = new ProcessNameCacheEntry { Pid = pid, Name = name };
            }
            return name;
        }

        private class TargetWindowCacheEntry
        {
            public IntPtr Hwnd;
            public DateTime Timestamp;
        }

        private static readonly System.Collections.Generic.Dictionary<string, TargetWindowCacheEntry> _targetWindowCache = new System.Collections.Generic.Dictionary<string, TargetWindowCacheEntry>(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Finds the usable target window, or Zero when there is none right now (a minimized window is not usable).
        /// A session PID is a hard lock: while targetPid > 0 only windows of that exact process can match, whatever else is open.
        /// Searching by saved identity (process, title, index) only happens with targetPid == 0, i.e. after Auto Clicker was reopened.
        /// </summary>
        public static IntPtr FindWindowByTarget(string procName, string windowTitle, int windowIndex = 0, uint targetPid = 0)
        {
            string cacheKey = string.Format("{0}|{1}|{2}|{3}", CleanProcessName(procName), CleanWindowTitle(windowTitle), windowIndex, targetPid);

            lock (_targetWindowCache)
            {
                TargetWindowCacheEntry entry;
                if (_targetWindowCache.TryGetValue(cacheKey, out entry) && entry != null)
                {
                    if ((DateTime.Now - entry.Timestamp).TotalMilliseconds < 1000)
                    {
                        if (entry.Hwnd != IntPtr.Zero && IsWindow(entry.Hwnd) && IsWindowVisible(entry.Hwnd) && !IsIconic(entry.Hwnd))
                        {
                            if (targetPid > 0)
                            {
                                uint checkPid;
                                GetWindowThreadProcessId(entry.Hwnd, out checkPid);
                                if (checkPid == targetPid) return entry.Hwnd;
                            }
                            else
                            {
                                return entry.Hwnd;
                            }
                        }
                    }
                }
            }

            IntPtr resultHwnd = ResolveTargetWindow(procName, windowTitle, windowIndex, targetPid, true);
            if (resultHwnd == IntPtr.Zero || IsIconic(resultHwnd)) return IntPtr.Zero;

            lock (_targetWindowCache)
            {
                _targetWindowCache[cacheKey] = new TargetWindowCacheEntry
                {
                    Hwnd = resultHwnd,
                    Timestamp = DateTime.Now
                };
            }
            return resultHwnd;
        }

        /// <summary>
        /// Says whether a target can be used now and why not. resolved is the window to use when the state is Ok.
        /// Cheap while the session handle is still good (no window enumeration), so the engines call it before every action.
        /// </summary>
        public static TargetWindowState GetTargetWindowState(IntPtr hWnd, uint targetPid, string procName, string windowTitle, int windowIndex, out IntPtr resolved)
        {
            resolved = IntPtr.Zero;
            if (IsValidWindowHandle(hWnd, targetPid, procName))
            {
                resolved = hWnd;
                return TargetWindowState.Ok;
            }

            string cleanProc = CleanProcessName(procName);

            // The exact window of this session still exists: report what happened to it and never look at its siblings
            if (hWnd != IntPtr.Zero && IsWindow(hWnd) && IsSameTargetProcess(hWnd, targetPid, cleanProc))
            {
                if (IsIconic(hWnd)) return TargetWindowState.Minimized;
                if (!IsWindowVisible(hWnd)) return TargetWindowState.Hidden;
            }

            // A non-zero handle that no longer exists means that window was really closed, so "the only window left" is not the same window
            IntPtr candidate = ResolveTargetWindow(procName, windowTitle, windowIndex, targetPid, hWnd == IntPtr.Zero);
            if (candidate != IntPtr.Zero)
            {
                if (IsIconic(candidate)) return TargetWindowState.Minimized;
                resolved = candidate;
                return TargetWindowState.Ok;
            }

            if (targetPid > 0 && !IsTargetProcessAlive(targetPid, cleanProc)) return TargetWindowState.Closed;
            return TargetWindowState.NotFound;
        }

        private static string CleanProcessName(string procName)
        {
            string cleanProc = (procName ?? "").Trim();
            if (cleanProc.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
            {
                cleanProc = cleanProc.Substring(0, cleanProc.Length - 4);
            }
            return cleanProc;
        }

        private static string CleanWindowTitle(string windowTitle)
        {
            string cleanTitle = (windowTitle ?? "").Trim();
            while (cleanTitle.EndsWith("."))
            {
                cleanTitle = cleanTitle.Substring(0, cleanTitle.Length - 1).Trim();
            }
            return cleanTitle;
        }

        private static bool IsSameTargetProcess(IntPtr hWnd, uint targetPid, string cleanProc)
        {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == 0) return false;
            if (targetPid > 0) return pid == targetPid;
            if (string.IsNullOrEmpty(cleanProc)) return true;
            return string.Equals(GetProcessNameCached(hWnd, pid), cleanProc, StringComparison.OrdinalIgnoreCase);
        }

        // Windows can hand a dead PID to another program, so the name has to match too. ProcessName (unlike HasExited) also works on elevated processes.
        private static bool IsTargetProcessAlive(uint targetPid, string cleanProc)
        {
            try
            {
                using (var p = System.Diagnostics.Process.GetProcessById((int)targetPid))
                {
                    string name = p.ProcessName;
                    return string.IsNullOrEmpty(cleanProc) || string.Equals(name, cleanProc, StringComparison.OrdinalIgnoreCase);
                }
            }
            catch
            {
                return false;
            }
        }

        private static bool TitlesMatch(string cleanTitle, string title)
        {
            if (string.IsNullOrEmpty(cleanTitle) || string.IsNullOrEmpty(title)) return false;
            return title.IndexOf(cleanTitle, StringComparison.OrdinalIgnoreCase) >= 0 ||
                   cleanTitle.IndexOf(title, StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static string GetWindowTitleText(IntPtr hWnd)
        {
            int len = GetWindowTextLength(hWnd);
            if (len <= 0) return "";
            var sb = new System.Text.StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            return sb.ToString();
        }

        // May return a minimized window: the caller decides what that means
        private static IntPtr ResolveTargetWindow(string procName, string windowTitle, int windowIndex, uint targetPid, bool allowOnlyWindowFallback)
        {
            string cleanProc = CleanProcessName(procName);
            string cleanTitle = CleanWindowTitle(windowTitle);

            if (string.IsNullOrEmpty(cleanProc) && string.IsNullOrEmpty(cleanTitle) && targetPid == 0)
                return IntPtr.Zero;

            // Fast resolution for Windows Desktop
            if (cleanTitle.Equals("Windows Desktop", StringComparison.OrdinalIgnoreCase) ||
                cleanTitle.Equals("Program Manager", StringComparison.OrdinalIgnoreCase))
            {
                IntPtr pDesk = FindWindow("Progman", null);
                if (pDesk != IntPtr.Zero && IsWindow(pDesk)) return pDesk;
            }

            if (targetPid > 0)
            {
                return ResolveWithinProcess(targetPid, cleanProc, cleanTitle, windowIndex, allowOnlyWindowFallback);
            }
            return ResolveBySavedIdentity(cleanProc, cleanTitle, windowIndex);
        }

        // Session lock: only this PID. Several windows can share one PID (Chrome, VS Code), so among them only a title match counts,
        // or the app's only window (its title may have changed since it was picked).
        private static IntPtr ResolveWithinProcess(uint targetPid, string cleanProc, string cleanTitle, int windowIndex, bool allowOnlyWindowFallback)
        {
            if (!IsTargetProcessAlive(targetPid, cleanProc)) return IntPtr.Zero;

            System.Collections.Generic.List<IntPtr> titleMatches = new System.Collections.Generic.List<IntPtr>();
            System.Collections.Generic.List<IntPtr> appWindows = new System.Collections.Generic.List<IntPtr>();

            EnumWindows((hWnd, lParam) =>
            {
                if (IsWindowVisible(hWnd))
                {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    if (pid == targetPid)
                    {
                        if (TitlesMatch(cleanTitle, GetWindowTitleText(hWnd))) titleMatches.Add(hWnd);

                        string title, className;
                        if (TryGetPickableWindowInfo(hWnd, out title, out className)) appWindows.Add(hWnd);
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (titleMatches.Count > 0)
            {
                titleMatches.Sort((a, b) => a.ToInt64().CompareTo(b.ToInt64()));
                if (windowIndex <= 0) return titleMatches[0];
                return windowIndex <= titleMatches.Count ? titleMatches[windowIndex - 1] : IntPtr.Zero;
            }

            return (allowOnlyWindowFallback && appWindows.Count == 1) ? appWindows[0] : IntPtr.Zero;
        }

        // No session PID (Auto Clicker was reopened): saved process, title and index, and among equal candidates the process opened first.
        private static IntPtr ResolveBySavedIdentity(string cleanProc, string cleanTitle, int windowIndex)
        {
            System.Collections.Generic.List<System.Diagnostics.Process> runningProcs = new System.Collections.Generic.List<System.Diagnostics.Process>();
            if (!string.IsNullOrEmpty(cleanProc))
            {
                try
                {
                    var procs = System.Diagnostics.Process.GetProcessesByName(cleanProc);
                    runningProcs.AddRange(procs);
                }
                catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }

                // The saved app is not running: a window of another app that happens to share the title is not the target
                if (runningProcs.Count == 0) return IntPtr.Zero;
            }

            // Deterministic sorting: Earliest opened process first (Instance 1, 2...)
            if (runningProcs.Count > 1)
            {
                runningProcs.Sort((a, b) =>
                {
                    DateTime tA = DateTime.MaxValue, tB = DateTime.MaxValue;
                    try { tA = a.StartTime; } catch (Exception) { /* An elevated or system process hides its start time: it simply sorts last */ }
                    try { tB = b.StartTime; } catch (Exception) { /* An elevated or system process hides its start time: it simply sorts last */ }
                    int c = tA.CompareTo(tB);
                    if (c != 0) return c;
                    return a.Id.CompareTo(b.Id);
                });
            }

            System.Collections.Generic.List<uint> prioritizedPids = new System.Collections.Generic.List<uint>();
            foreach (var p in runningProcs)
            {
                prioritizedPids.Add((uint)p.Id);
                p.Dispose();
            }

            System.Collections.Generic.List<IntPtr> matchingHwnds = new System.Collections.Generic.List<IntPtr>();
            System.Collections.Generic.List<IntPtr> allAppWindows = new System.Collections.Generic.List<IntPtr>();

            // Minimized windows stay in the lists so that "the one opened first" does not silently become the next one when it is minimized
            EnumWindows((hWnd, lParam) =>
            {
                if (IsWindowVisible(hWnd))
                {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);

                    bool isPidMatch = prioritizedPids.Count > 0 && prioritizedPids.Contains(pid);
                    if (prioritizedPids.Count > 0 && !isPidMatch)
                    {
                        return true;
                    }

                    string title = GetWindowTitleText(hWnd);

                    if (isPidMatch && title.Length > 0)
                    {
                        allAppWindows.Add(hWnd);
                    }

                    if (TitlesMatch(cleanTitle, title))
                    {
                        matchingHwnds.Add(hWnd);
                    }
                    else if (string.IsNullOrEmpty(cleanTitle) && isPidMatch)
                    {
                        matchingHwnds.Add(hWnd);
                    }
                }
                return true;
            }, IntPtr.Zero);

            Comparison<IntPtr> openedFirst = (a, b) =>
            {
                uint pidA, pidB;
                GetWindowThreadProcessId(a, out pidA);
                GetWindowThreadProcessId(b, out pidB);
                int idxA = prioritizedPids.IndexOf(pidA);
                int idxB = prioritizedPids.IndexOf(pidB);
                if (idxA >= 0 && idxB >= 0 && idxA != idxB) return idxA.CompareTo(idxB);
                int cmp = pidA.CompareTo(pidB);
                if (cmp != 0) return cmp;
                return a.ToInt64().CompareTo(b.ToInt64());
            };
            matchingHwnds.Sort(openedFirst);
            allAppWindows.Sort(openedFirst);

            // A title that matches wins; otherwise the title has changed since it was picked (Chrome, Word, Notepad...)
            System.Collections.Generic.List<IntPtr> candidates = matchingHwnds.Count > 0 ? matchingHwnds : allAppWindows;
            if (candidates.Count == 0) return IntPtr.Zero;
            if (windowIndex <= 0) return candidates[0];
            if (candidates.Count == 1 && candidates == allAppWindows) return candidates[0];

            // An explicit instance that does not exist is never replaced by another one
            return windowIndex <= candidates.Count ? candidates[windowIndex - 1] : IntPtr.Zero;
        }
    }
}
