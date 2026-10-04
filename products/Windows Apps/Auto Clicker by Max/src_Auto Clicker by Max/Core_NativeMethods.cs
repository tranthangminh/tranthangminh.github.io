using System;
using System.Drawing;
using System.Runtime.InteropServices;

namespace ModernAutoClicker
{
    public static class NativeMethods
    {
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

        public static void SendBackgroundClick(int screenX, int screenY, int mouseBtn, int holdMs = 10)
        {
            POINT screenPt = new POINT { X = screenX, Y = screenY };
            IntPtr topHwnd = WindowFromPoint(screenPt);
            if (topHwnd == IntPtr.Zero) return;

            IntPtr targetHwnd = FindDeepestChild(topHwnd, screenPt);
            if (targetHwnd == IntPtr.Zero) targetHwnd = topHwnd;

            POINT clientPt = screenPt;
            ScreenToClient(targetHwnd, ref clientPt);

            // Check if special adapter handles this target's background click
            if (ModernAutoClicker.SpecialApps.SpecialAppRegistry.TryBackgroundClick(targetHwnd, new Point(clientPt.X, clientPt.Y), mouseBtn, holdMs))
            {
                return;
            }

            IntPtr lParam = (IntPtr)(((clientPt.Y & 0xFFFF) << 16) | (clientPt.X & 0xFFFF));

            uint msgDown, msgUp;
            IntPtr wParam;

            if (mouseBtn == 1) // Right
            {
                msgDown = 0x0204; // WM_RBUTTONDOWN
                msgUp = 0x0205;   // WM_RBUTTONUP
                wParam = (IntPtr)0x0002; // MK_RBUTTON
            }
            else if (mouseBtn == 2) // Middle
            {
                msgDown = 0x0207; // WM_MBUTTONDOWN
                msgUp = 0x0208;   // WM_MBUTTONUP
                wParam = (IntPtr)0x0010; // MK_MBUTTON
            }
            else if (mouseBtn == 3) // Double Click (Generic fallback)
            {
                PostMessage(targetHwnd, 0x0201 /* WM_LBUTTONDOWN */, (IntPtr)0x0001, lParam);
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                PostMessage(targetHwnd, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);
                System.Threading.Thread.Sleep(30);
                PostMessage(targetHwnd, 0x0203 /* WM_LBUTTONDBLCLK */, (IntPtr)0x0001, lParam);
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                PostMessage(targetHwnd, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);
                return;
            }
            else // Left
            {
                msgDown = 0x0201; // WM_LBUTTONDOWN
                msgUp = 0x0202;   // WM_LBUTTONUP
                wParam = (IntPtr)0x0001; // MK_LBUTTON
            }

            // 1. Send Button Down (Omit WM_MOUSEMOVE to prevent WM_SETCURSOR cursor fluttering)
            PostMessage(targetHwnd, msgDown, wParam, lParam);
            
            // 2. Hold duration (default 10ms or <= interval)
            if (holdMs > 0)
            {
                System.Threading.Thread.Sleep(holdMs);
            }
            
            // 3. Send Button Up
            PostMessage(targetHwnd, msgUp, IntPtr.Zero, lParam);
        }

        public static void PerformClickDirectToWindow(IntPtr hWnd, int clientX, int clientY, int mouseBtn, int holdMs)
        {
            if (hWnd == IntPtr.Zero) return;

            // Convert client coordinate of hWnd to screen coordinates
            POINT screenPt = new POINT { X = clientX, Y = clientY };
            ClientToScreen(hWnd, ref screenPt);

            // Drill down to the deepest leaf child window at this position
            IntPtr targetHwnd = FindDeepestChild(hWnd, screenPt);
            if (targetHwnd == IntPtr.Zero) targetHwnd = hWnd;

            POINT targetClientPt = screenPt;
            ScreenToClient(targetHwnd, ref targetClientPt);

            // Check if special adapter handles this target's background click
            if (ModernAutoClicker.SpecialApps.SpecialAppRegistry.TryBackgroundClick(targetHwnd, new Point(targetClientPt.X, targetClientPt.Y), mouseBtn, holdMs))
            {
                return;
            }

            IntPtr lParam = (IntPtr)(((targetClientPt.Y & 0xFFFF) << 16) | (targetClientPt.X & 0xFFFF));
            uint msgDown, msgUp;
            IntPtr wParam;

            if (mouseBtn == 1) // Right
            {
                msgDown = 0x0204; // WM_RBUTTONDOWN
                msgUp = 0x0205;   // WM_RBUTTONUP
                wParam = (IntPtr)0x0002;
            }
            else if (mouseBtn == 2) // Middle
            {
                msgDown = 0x0207; // WM_MBUTTONDOWN
                msgUp = 0x0208;   // WM_MBUTTONUP
                wParam = (IntPtr)0x0010;
            }
            else if (mouseBtn == 3) // Double Click (Generic fallback)
            {
                PostMessage(targetHwnd, 0x0201 /* WM_LBUTTONDOWN */, (IntPtr)0x0001, lParam);
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                PostMessage(targetHwnd, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);
                System.Threading.Thread.Sleep(30);
                PostMessage(targetHwnd, 0x0203 /* WM_LBUTTONDBLCLK */, (IntPtr)0x0001, lParam);
                if (holdMs > 0) System.Threading.Thread.Sleep(holdMs);
                PostMessage(targetHwnd, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);
                return;
            }
            else // Left
            {
                msgDown = 0x0201; // WM_LBUTTONDOWN
                msgUp = 0x0202;   // WM_LBUTTONUP
                wParam = (IntPtr)0x0001;
            }

            PostMessage(targetHwnd, msgDown, wParam, lParam);
            if (holdMs > 0)
            {
                System.Threading.Thread.Sleep(holdMs);
            }
            PostMessage(targetHwnd, msgUp, IntPtr.Zero, lParam);
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
            catch { }

            try
            {
                if (!string.IsNullOrEmpty(proc.ProcessName))
                {
                    return proc.ProcessName;
                }
            }
            catch { }

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
            catch { }
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

            public int WindowIndex { get; set; }

            public override string ToString()
            {
                string appName = !string.IsNullOrEmpty(FriendlyAppName) ? FriendlyAppName : ProcessName;
                string baseDisplay;
                if (string.IsNullOrEmpty(Title) || string.Equals(Title, appName, StringComparison.OrdinalIgnoreCase))
                    baseDisplay = string.Format("{0}", appName);
                else if (Title.Length > 35)
                    baseDisplay = string.Format("{0} - {1}...", appName, Title.Substring(0, 32));
                else
                    baseDisplay = string.Format("{0} - {1}", appName, Title);

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
            uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
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
                // 1. Basic visibility check
                if (!IsWindowVisible(hWnd)) return true;

                // 2. Cloaked Window check (DWMWA_CLOAKED filters out background UWP/PowerToys/Snipping Tool instances)
                int cloaked = 0;
                if (DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out cloaked, sizeof(int)) == 0 && cloaked != 0)
                {
                    return true;
                }

                // 3. Extended styles: ignore tool windows, tooltip popups unless explicitly an AppWindow
                int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
                if ((exStyle & WS_EX_TOOLWINDOW) != 0 && (exStyle & WS_EX_APPWINDOW) == 0)
                {
                    return true;
                }

                // 4. Owner window check: ignore child / popup / owned dialogs of other windows
                IntPtr owner = GetWindow(hWnd, GW_OWNER);
                if (owner != IntPtr.Zero && (exStyle & WS_EX_APPWINDOW) == 0)
                {
                    return true;
                }

                // 5. Dimension check: ignore zero-sized / off-screen phantom windows
                RECT rect;
                if (GetWindowRect(hWnd, out rect))
                {
                    if (rect.Right - rect.Left <= 10 || rect.Bottom - rect.Top <= 10)
                    {
                        return true;
                    }
                }

                // 6. Title length and content check
                int len = GetWindowTextLength(hWnd);
                if (len <= 0) return true;

                var sb = new System.Text.StringBuilder(len + 1);
                GetWindowText(hWnd, sb, sb.Capacity);
                string title = sb.ToString().Trim();
                if (string.IsNullOrEmpty(title)) return true;

                // Blacklisted system titles
                if (title == "Default IME" || title == "MSCTFIME UI" || title == "MediaContextNotificationWindow" ||
                    title == "Task Switching" || title == "Windows Shell Experience Host" || title == "PopupHost")
                {
                    return true;
                }

                var sbClass = new System.Text.StringBuilder(256);
                GetClassName(hWnd, sbClass, sbClass.Capacity);
                string className = sbClass.ToString();

                // 7. Blacklisted system window classes
                if (className == "Progman" || className == "WorkerW" ||
                    className == "Shell_TrayWnd" || className == "Shell_SecondaryTrayWnd" ||
                    className == "Windows.UI.Core.CoreWindow" || className == "EdgeUiInputTopWndClass" ||
                    className == "EdgeUiInputWndClass" || className == "DummyDWMListenerWindow" ||
                    className == "MsgrIMEWindowClass" || className == "SysDragImage" ||
                    className == "ApplicationFrameTitleBarWindow")
                {
                    return true;
                }

                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid == myPid || pid == 0) return true;

                string procName = "App";
                string friendlyName = "App";
                try
                {
                    var p = System.Diagnostics.Process.GetProcessById((int)pid);
                    procName = p.ProcessName;
                    friendlyName = GetFriendlyAppName(p);
                }
                catch { }

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
                    AppIcon = appIcon
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
                    // Deterministic stable sorting by PID ascending, then HWND ascending
                    group.Sort((a, b) =>
                    {
                        uint pidA, pidB;
                        GetWindowThreadProcessId(a.Hwnd, out pidA);
                        GetWindowThreadProcessId(b.Hwnd, out pidB);
                        int cmp = pidA.CompareTo(pidB);
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

        public static bool IsValidWindowHandle(IntPtr hWnd, string procName = null)
        {
            if (hWnd == IntPtr.Zero) return false;
            if (!IsWindow(hWnd) || !IsWindowVisible(hWnd) || IsIconic(hWnd)) return false;
            if (!string.IsNullOrEmpty(procName))
            {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid == 0) return false;
                try
                {
                    var p = System.Diagnostics.Process.GetProcessById((int)pid);
                    string clean = procName.Trim();
                    if (clean.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        clean = clean.Substring(0, clean.Length - 4);
                    }
                    bool match = string.Equals(p.ProcessName, clean, StringComparison.OrdinalIgnoreCase);
                    p.Dispose();
                    return match;
                }
                catch
                {
                    return false;
                }
            }
            return true;
        }

        private class TargetWindowCacheEntry
        {
            public IntPtr Hwnd;
            public DateTime Timestamp;
        }

        private static readonly System.Collections.Generic.Dictionary<string, TargetWindowCacheEntry> _targetWindowCache = new System.Collections.Generic.Dictionary<string, TargetWindowCacheEntry>(StringComparer.OrdinalIgnoreCase);

        public static IntPtr FindWindowByTarget(string procName, string windowTitle, int windowIndex = 0)
        {
            string cleanProc = (procName ?? "").Trim();
            if (cleanProc.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
            {
                cleanProc = cleanProc.Substring(0, cleanProc.Length - 4);
            }

            string cleanTitle = (windowTitle ?? "").Trim();
            while (cleanTitle.EndsWith("."))
            {
                cleanTitle = cleanTitle.Substring(0, cleanTitle.Length - 1).Trim();
            }

            if (string.IsNullOrEmpty(cleanProc) && string.IsNullOrEmpty(cleanTitle))
                return IntPtr.Zero;

            // Fast resolution for Windows Desktop
            if (cleanTitle.Equals("Windows Desktop", StringComparison.OrdinalIgnoreCase) ||
                cleanTitle.Equals("Program Manager", StringComparison.OrdinalIgnoreCase))
            {
                IntPtr pDesk = FindWindow("Progman", null);
                if (pDesk != IntPtr.Zero && IsWindow(pDesk)) return pDesk;
            }

            string cacheKey = string.Format("{0}|{1}|{2}", cleanProc, cleanTitle, windowIndex);

            lock (_targetWindowCache)
            {
                TargetWindowCacheEntry entry;
                if (_targetWindowCache.TryGetValue(cacheKey, out entry) && entry != null)
                {
                    if ((DateTime.Now - entry.Timestamp).TotalMilliseconds < 1000)
                    {
                        if (entry.Hwnd == IntPtr.Zero)
                        {
                            return IntPtr.Zero;
                        }
                        if (IsWindow(entry.Hwnd) && IsWindowVisible(entry.Hwnd) && !IsIconic(entry.Hwnd))
                        {
                            return entry.Hwnd;
                        }
                    }
                }
            }

            // Find matching PIDs for process name
            System.Collections.Generic.HashSet<uint> targetPids = new System.Collections.Generic.HashSet<uint>();
            if (!string.IsNullOrEmpty(cleanProc))
            {
                try
                {
                    var procs = System.Diagnostics.Process.GetProcessesByName(cleanProc);
                    foreach (var p in procs)
                    {
                        targetPids.Add((uint)p.Id);
                        p.Dispose();
                    }
                }
                catch { }

                // If a process name was specified but process is not running, do not search further
                if (targetPids.Count == 0 && string.IsNullOrEmpty(cleanTitle))
                {
                    return IntPtr.Zero;
                }
            }

            System.Collections.Generic.List<IntPtr> matchingHwnds = new System.Collections.Generic.List<IntPtr>();
            IntPtr processMatch = IntPtr.Zero;

            EnumWindows((hWnd, lParam) =>
            {
                if (IsWindowVisible(hWnd) && !IsIconic(hWnd))
                {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);

                    bool isPidMatch = targetPids.Count > 0 && targetPids.Contains(pid);

                    // If target process was specified and running, skip non-matching process windows
                    if (targetPids.Count > 0 && !isPidMatch)
                    {
                        return true;
                    }

                    int len = GetWindowTextLength(hWnd);
                    string title = "";
                    if (len > 0)
                    {
                        var sb = new System.Text.StringBuilder(len + 1);
                        GetWindowText(hWnd, sb, sb.Capacity);
                        title = sb.ToString();
                    }

                    bool titleMatch = !string.IsNullOrEmpty(cleanTitle) && title.IndexOf(cleanTitle, StringComparison.OrdinalIgnoreCase) >= 0;

                    if (titleMatch && (targetPids.Count == 0 || isPidMatch))
                    {
                        matchingHwnds.Add(hWnd);
                    }
                    else if (isPidMatch && processMatch == IntPtr.Zero && len > 0)
                    {
                        processMatch = hWnd; // Fallback to process main window
                    }
                }
                return true;
            }, IntPtr.Zero);

            // Deterministic stable sorting by PID ascending, then HWND ascending
            if (matchingHwnds.Count > 1)
            {
                matchingHwnds.Sort((a, b) =>
                {
                    uint pidA, pidB;
                    GetWindowThreadProcessId(a, out pidA);
                    GetWindowThreadProcessId(b, out pidB);
                    int cmp = pidA.CompareTo(pidB);
                    if (cmp != 0) return cmp;
                    return a.ToInt64().CompareTo(b.ToInt64());
                });
            }

            IntPtr resultHwnd = IntPtr.Zero;
            if (matchingHwnds.Count > 0)
            {
                if (windowIndex > 0 && windowIndex <= matchingHwnds.Count)
                {
                    resultHwnd = matchingHwnds[windowIndex - 1];
                }
                else
                {
                    resultHwnd = matchingHwnds[0];
                }
            }
            else
            {
                resultHwnd = processMatch;
            }

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
    }
}
