using System;
using System.Drawing;
using System.Runtime.InteropServices;

namespace ModernAutoClicker
{
    public static class NativeMethods
    {
        public const int WM_HOTKEY = 0x0312;

        public const int HOTKEY_START_ID = 9001;    // F6 / Start or Toggle Active Tab
        public const int HOTKEY_STOP_ALL_ID = 9002; // F7 / Stop ALL
        public const int HOTKEY_SPACE_ID = 9003;    // SPACE / Add Point or Step

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
        public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        public static void SendPhysicalClick(int mouseBtn, int holdMs)
        {
            uint downFlag = MOUSEEVENTF_LEFTDOWN;
            uint upFlag = MOUSEEVENTF_LEFTUP;

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

        public static void SendBackgroundClick(int screenX, int screenY, int mouseBtn, int holdMs = 10)
        {
            POINT screenPt = new POINT { X = screenX, Y = screenY };
            IntPtr hWnd = WindowFromPoint(screenPt);
            if (hWnd == IntPtr.Zero) return;

            POINT clientPt = screenPt;
            ScreenToClient(hWnd, ref clientPt);

            IntPtr child = RealChildWindowFromPoint(hWnd, clientPt);
            if (child != IntPtr.Zero && child != hWnd)
            {
                ScreenToClient(child, ref screenPt);
                hWnd = child;
                clientPt = screenPt;
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
            else // Left
            {
                msgDown = 0x0201; // WM_LBUTTONDOWN
                msgUp = 0x0202;   // WM_LBUTTONUP
                wParam = (IntPtr)0x0001; // MK_LBUTTON
            }

            // 1. Send WM_MOUSEMOVE first so browser/app registers mouse position over the element
            PostMessage(hWnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
            
            // 2. Send Button Down
            PostMessage(hWnd, msgDown, wParam, lParam);
            
            // 3. Hold duration (default 10ms or <= interval)
            if (holdMs > 0)
            {
                System.Threading.Thread.Sleep(holdMs);
            }
            
            // 4. Send Button Up
            PostMessage(hWnd, msgUp, IntPtr.Zero, lParam);
        }

        public static void PerformClickDirectToWindow(IntPtr hWnd, int clientX, int clientY, int mouseBtn, int holdMs)
        {
            if (hWnd == IntPtr.Zero) return;

            // Find child control if any
            POINT clientPt = new POINT { X = clientX, Y = clientY };
            IntPtr child = RealChildWindowFromPoint(hWnd, clientPt);
            if (child != IntPtr.Zero && child != hWnd)
            {
                POINT screenPt = clientPt;
                ClientToScreen(hWnd, ref screenPt);
                ScreenToClient(child, ref screenPt);
                hWnd = child;
                clientPt = screenPt;
            }

            IntPtr lParam = (IntPtr)(((clientPt.Y & 0xFFFF) << 16) | (clientPt.X & 0xFFFF));
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
            else // Left
            {
                msgDown = 0x0201; // WM_LBUTTONDOWN
                msgUp = 0x0202;   // WM_LBUTTONUP
                wParam = (IntPtr)0x0001;
            }

            PostMessage(hWnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
            PostMessage(hWnd, msgDown, wParam, lParam);
            if (holdMs > 0)
            {
                System.Threading.Thread.Sleep(holdMs);
            }
            PostMessage(hWnd, msgUp, IntPtr.Zero, lParam);
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

        [DllImport("user32.dll")]
        public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

        [DllImport("user32.dll")]
        public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

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

            public override string ToString()
            {
                string appName = !string.IsNullOrEmpty(FriendlyAppName) ? FriendlyAppName : ProcessName;
                if (string.IsNullOrEmpty(Title) || string.Equals(Title, appName, StringComparison.OrdinalIgnoreCase))
                    return string.Format("{0}", appName);
                if (Title.Length > 35)
                    return string.Format("{0} - {1}...", appName, Title.Substring(0, 32));
                return string.Format("{0} - {1}", appName, Title);
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

                // 8. Deduplicate identical window entries by (ProcessId + ProcessName + Title)
                string dedupKey = string.Format("{0}_{1}_{2}", pid, procName, title);
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

            return list;
        }

        private class TargetWindowCacheEntry
        {
            public IntPtr Hwnd;
            public DateTime Timestamp;
        }

        private static readonly System.Collections.Generic.Dictionary<string, TargetWindowCacheEntry> _targetWindowCache = new System.Collections.Generic.Dictionary<string, TargetWindowCacheEntry>(StringComparer.OrdinalIgnoreCase);

        public static IntPtr FindWindowByTarget(string procName, string windowTitle)
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

            string cacheKey = string.Format("{0}|{1}", cleanProc, cleanTitle);

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

            IntPtr exactMatch = IntPtr.Zero;
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
                        exactMatch = hWnd;
                        return false; // Stop immediately on exact match
                    }
                    else if (isPidMatch && processMatch == IntPtr.Zero && len > 0)
                    {
                        processMatch = hWnd; // Fallback to process main window
                    }
                }
                return true;
            }, IntPtr.Zero);

            IntPtr resultHwnd = (exactMatch != IntPtr.Zero) ? exactMatch : processMatch;

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
