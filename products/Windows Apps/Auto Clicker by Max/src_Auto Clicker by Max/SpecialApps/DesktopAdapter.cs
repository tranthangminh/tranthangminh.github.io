using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Specialized adapter for Windows Desktop (Win 7, 10, 11).
    /// Resolves through complex DWM WorkerW/Progman hierarchies to find the true SysListView32 icon view.
    /// In Free Mouse Mode, Windows Explorer drops simulated double-click messages on SysListView32.
    /// This adapter performs Hit-Testing on the desktop item at client coordinates and reliably
    /// opens folders, shortcuts, files, and shell items when double clicked or clicked in succession.
    /// </summary>
    public class DesktopAdapter : ISpecialAppAdapter
    {
        public string Name { get { return "Windows Desktop"; } }

        public bool RequiresPhysicalClick { get { return false; } }

        public string OptimizationNote
        {
            get
            {
                return "Desktop icons are hosted in SysListView32 under Explorer's SHELLDLL_DefView. Free Mouse Mode accurately selects and opens desktop items.";
            }
        }

        public bool IsMatch(string processName, string windowTitle, string className)
        {
            string cls = (className ?? "").Trim();
            string proc = (processName ?? "").Trim();
            string title = (windowTitle ?? "").Trim();

            if (cls.Equals("Progman", StringComparison.OrdinalIgnoreCase) ||
                cls.Equals("WorkerW", StringComparison.OrdinalIgnoreCase) ||
                cls.Equals("SHELLDLL_DefView", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (cls.Equals("SysListView32", StringComparison.OrdinalIgnoreCase) &&
                (title.IndexOf("FolderView", StringComparison.OrdinalIgnoreCase) >= 0 ||
                 proc.Equals("explorer", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            if (proc.Equals("explorer", StringComparison.OrdinalIgnoreCase) &&
                (title.Equals("Program Manager", StringComparison.OrdinalIgnoreCase) ||
                 title.IndexOf("Desktop", StringComparison.OrdinalIgnoreCase) >= 0))
            {
                return true;
            }

            return false;
        }

        public IntPtr ResolveTargetHandle(IntPtr topHwnd, Point screenPt)
        {
            if (topHwnd == IntPtr.Zero) return IntPtr.Zero;

            // If already SysListView32, return it directly
            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(topHwnd, sbClass, sbClass.Capacity);
            if (sbClass.ToString().Equals("SysListView32", StringComparison.OrdinalIgnoreCase))
            {
                return topHwnd;
            }

            // 1. Check Progman directly
            IntPtr progman = NativeMethods.FindWindow("Progman", null);
            IntPtr shellView = IntPtr.Zero;

            if (progman != IntPtr.Zero)
            {
                shellView = NativeMethods.FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
            }

            // 2. If not in Progman, Windows 10/11 creates WorkerW windows
            if (shellView == IntPtr.Zero)
            {
                NativeMethods.EnumWindows((hWnd, lParam) =>
                {
                    StringBuilder sb = new StringBuilder(256);
                    NativeMethods.GetClassName(hWnd, sb, sb.Capacity);
                    if (sb.ToString().Equals("WorkerW", StringComparison.OrdinalIgnoreCase))
                    {
                        IntPtr sv = NativeMethods.FindWindowEx(hWnd, IntPtr.Zero, "SHELLDLL_DefView", null);
                        if (sv != IntPtr.Zero)
                        {
                            shellView = sv;
                            return false; // Found
                        }
                    }
                    return true;
                }, IntPtr.Zero);
            }

            if (shellView != IntPtr.Zero)
            {
                // In classic Desktop, icons are inside SysListView32
                IntPtr listView = NativeMethods.FindWindowEx(shellView, IntPtr.Zero, "SysListView32", null);
                if (listView != IntPtr.Zero)
                {
                    return listView;
                }
                return shellView;
            }

            return IntPtr.Zero;
        }

        private static int _lastHitItem = -1;
        private static DateTime _lastClickTime = DateTime.MinValue;
        private static readonly object _lock = new object();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr VirtualAllocEx(IntPtr hProcess, IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool VirtualFreeEx(IntPtr hProcess, IntPtr lpAddress, uint dwSize, uint dwFreeType);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, uint nSize, out IntPtr lpNumberOfBytesRead);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool WriteProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, uint nSize, out IntPtr lpNumberOfBytesWritten);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        [StructLayout(LayoutKind.Sequential)]
        private struct LVHITTESTINFO
        {
            public int ptX, ptY;
            public uint flags;
            public int iItem, iSubItem, iGroup;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct LVITEM
        {
            public uint mask;
            public int iItem, iSubItem;
            public uint state, stateMask;
            public IntPtr pszText;
            public int cchTextMax;
            public int iImage;
            public IntPtr lParam;
            public int iIndent, iGroupId;
            public uint cColumns;
            public IntPtr puColumns, piColFmt;
            public int iGroup;
        }

        private static string GetItemNameAtPoint(IntPtr listView, int x, int y, out int itemIndex)
        {
            itemIndex = -1;
            if (listView == IntPtr.Zero) return "";

            uint pid;
            GetWindowThreadProcessId(listView, out pid);
            if (pid == 0) return "";

            IntPtr hProc = OpenProcess(0x0438 /* PROCESS_VM_OPERATION | PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_QUERY_INFORMATION */, false, pid);
            if (hProc == IntPtr.Zero)
            {
                hProc = OpenProcess(0x001F0FFF /* PROCESS_ALL_ACCESS */, false, pid);
            }
            if (hProc == IntPtr.Zero) return "";

            string name = "";
            try
            {
                int htiSize = Marshal.SizeOf(typeof(LVHITTESTINFO));
                int lviSize = Marshal.SizeOf(typeof(LVITEM));
                IntPtr mem = VirtualAllocEx(hProc, IntPtr.Zero, 1024, 0x1000 | 0x2000, 4);
                if (mem == IntPtr.Zero) return "";

                try
                {
                    LVHITTESTINFO hti = new LVHITTESTINFO { ptX = x, ptY = y };
                    byte[] htiBytes = new byte[htiSize];
                    IntPtr ptrHti = Marshal.AllocHGlobal(htiSize);
                    Marshal.StructureToPtr(hti, ptrHti, false);
                    Marshal.Copy(ptrHti, htiBytes, 0, htiSize);
                    Marshal.FreeHGlobal(ptrHti);

                    IntPtr written;
                    WriteProcessMemory(hProc, mem, htiBytes, (uint)htiSize, out written);

                    int hit = (int)NativeMethods.SendMessage(listView, 0x1012 /* LVM_HITTEST */, (IntPtr)(-1), mem);
                    if (hit >= 0)
                    {
                        itemIndex = hit;
                        IntPtr memText = (IntPtr)(mem.ToInt64() + 256);
                        LVITEM lvi = new LVITEM { iSubItem = 0, cchTextMax = 256, pszText = memText };
                        byte[] lviBytes = new byte[lviSize];
                        IntPtr ptrLvi = Marshal.AllocHGlobal(lviSize);
                        Marshal.StructureToPtr(lvi, ptrLvi, false);
                        Marshal.Copy(ptrLvi, lviBytes, 0, lviSize);
                        Marshal.FreeHGlobal(ptrLvi);

                        WriteProcessMemory(hProc, mem, lviBytes, (uint)lviSize, out written);
                        NativeMethods.SendMessage(listView, 0x1073 /* LVM_GETITEMTEXTW */, (IntPtr)hit, mem);

                        byte[] textBuf = new byte[512];
                        IntPtr read;
                        ReadProcessMemory(hProc, memText, textBuf, 512, out read);
                        string raw = Encoding.Unicode.GetString(textBuf);
                        int nullIdx = raw.IndexOf('\0');
                        name = (nullIdx >= 0 ? raw.Substring(0, nullIdx) : raw).Trim();
                    }
                }
                finally
                {
                    VirtualFreeEx(hProc, mem, 0, 0x8000);
                }
            }
            finally
            {
                CloseHandle(hProc);
            }
            return name;
        }

        private static DateTime _lastLaunchTime = DateTime.MinValue;
        private static string _lastLaunchedName = "";

        private static void LaunchDesktopItem(string name)
        {
            if (string.IsNullOrEmpty(name)) return;

            lock (_lock)
            {
                DateTime now = DateTime.UtcNow;
                if (string.Equals(name, _lastLaunchedName, StringComparison.OrdinalIgnoreCase) &&
                    (now - _lastLaunchTime).TotalMilliseconds < 1200)
                {
                    return; // Prevent duplicate rapid launches
                }
                _lastLaunchTime = now;
                _lastLaunchedName = name;
            }

            ThreadPool.QueueUserWorkItem(state =>
            {
                try
                {
                    string[] candidates = GetDesktopDirectories();
                    foreach (var dir in candidates)
                    {
                        if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir)) continue;

                        string pLnk = Path.Combine(dir, name + ".lnk");
                        if (File.Exists(pLnk))
                        {
                            Process.Start(new ProcessStartInfo(pLnk) { UseShellExecute = true });
                            return;
                        }

                        string pUrl = Path.Combine(dir, name + ".url");
                        if (File.Exists(pUrl))
                        {
                            Process.Start(new ProcessStartInfo(pUrl) { UseShellExecute = true });
                            return;
                        }

                        string pExact = Path.Combine(dir, name);
                        if (File.Exists(pExact) || Directory.Exists(pExact))
                        {
                            Process.Start(new ProcessStartInfo(pExact) { UseShellExecute = true });
                            return;
                        }

                        // Search for files starting with name.* (e.g. extension hidden)
                        try
                        {
                            string[] matching = Directory.GetFiles(dir, name + ".*");
                            if (matching != null && matching.Length > 0)
                            {
                                Process.Start(new ProcessStartInfo(matching[0]) { UseShellExecute = true });
                                return;
                            }
                        }
                        catch { }
                    }

                    // Fallback to Shell COM for special shell namespace items (This PC, Recycle Bin, etc.)
                    Type shellType = Type.GetTypeFromProgID("Shell.Application");
                    if (shellType != null)
                    {
                        dynamic shell = Activator.CreateInstance(shellType);
                        dynamic desktop = shell.NameSpace(0);
                        if (desktop != null)
                        {
                            dynamic item = desktop.ParseName(name);
                            if (item == null) item = desktop.ParseName(name + ".lnk");
                            if (item != null)
                            {
                                string path = (string)item.Path;
                                if (!string.IsNullOrEmpty(path) && path.StartsWith("::"))
                                {
                                    Process.Start(new ProcessStartInfo("explorer.exe", path) { UseShellExecute = true });
                                    return;
                                }
                                item.InvokeVerb("open");
                                return;
                            }

                            dynamic items = desktop.Items();
                            for (int i = 0; i < (int)items.Count; i++)
                            {
                                dynamic it = items.Item(i);
                                if (string.Equals((string)it.Name, name, StringComparison.OrdinalIgnoreCase))
                                {
                                    string path = (string)it.Path;
                                    if (!string.IsNullOrEmpty(path) && path.StartsWith("::"))
                                    {
                                        Process.Start(new ProcessStartInfo("explorer.exe", path) { UseShellExecute = true });
                                        return;
                                    }
                                    it.InvokeVerb("open");
                                    return;
                                }
                            }
                        }
                    }
                }
                catch { }
            });
        }

        private static string[] GetDesktopDirectories()
        {
            var list = new System.Collections.Generic.List<string>();
            try
            {
                string d1 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                if (!string.IsNullOrEmpty(d1) && !list.Contains(d1)) list.Add(d1);
            }
            catch { }
            try
            {
                string d2 = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                if (!string.IsNullOrEmpty(d2) && !list.Contains(d2)) list.Add(d2);
            }
            catch { }
            try
            {
                string d3 = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);
                if (!string.IsNullOrEmpty(d3) && !list.Contains(d3)) list.Add(d3);
            }
            catch { }
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"))
                {
                    if (key != null)
                    {
                        string d = key.GetValue("Desktop") as string;
                        if (!string.IsNullOrEmpty(d))
                        {
                            d = Environment.ExpandEnvironmentVariables(d);
                            if (!list.Contains(d)) list.Add(d);
                        }
                    }
                }
            }
            catch { }
            try
            {
                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                if (!string.IsNullOrEmpty(userProfile))
                {
                    string classicDesk = Path.Combine(userProfile, "Desktop");
                    if (!list.Contains(classicDesk) && Directory.Exists(classicDesk)) list.Add(classicDesk);

                    string oneDriveDesk = Path.Combine(userProfile, "OneDrive", "Desktop");
                    if (!list.Contains(oneDriveDesk) && Directory.Exists(oneDriveDesk)) list.Add(oneDriveDesk);

                    string oneDriveDeskVn = Path.Combine(userProfile, "OneDrive", "Máy tính");
                    if (!list.Contains(oneDriveDeskVn) && Directory.Exists(oneDriveDeskVn)) list.Add(oneDriveDeskVn);
                }
            }
            catch { }
            return list.ToArray();
        }

        public bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            // Ensure targetHwnd is SysListView32
            IntPtr listView = targetHwnd;
            StringBuilder sbClass = new StringBuilder(256);
            NativeMethods.GetClassName(targetHwnd, sbClass, sbClass.Capacity);
            string cls = sbClass.ToString();
            if (!cls.Equals("SysListView32", StringComparison.OrdinalIgnoreCase))
            {
                IntPtr resolved = ResolveTargetHandle(targetHwnd, Point.Empty);
                if (resolved != IntPtr.Zero)
                {
                    listView = resolved;
                }
            }

            IntPtr lParam = (IntPtr)(((clientPt.Y & 0xFFFF) << 16) | (clientPt.X & 0xFFFF));

            // Right Click / Middle Click: standard Win32 dispatch
            if (mouseBtn == 1) // Right Click
            {
                NativeMethods.PostMessage(listView, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
                NativeMethods.PostMessage(listView, 0x0204 /* WM_RBUTTONDOWN */, (IntPtr)0x0002, lParam);
                if (holdMs > 0) Thread.Sleep(holdMs);
                NativeMethods.PostMessage(listView, 0x0205 /* WM_RBUTTONUP */, IntPtr.Zero, lParam);
                return true;
            }
            if (mouseBtn == 2) // Middle Click
            {
                NativeMethods.PostMessage(listView, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
                NativeMethods.PostMessage(listView, 0x0207 /* WM_MBUTTONDOWN */, (IntPtr)0x0010, lParam);
                if (holdMs > 0) Thread.Sleep(holdMs);
                NativeMethods.PostMessage(listView, 0x0208 /* WM_MBUTTONUP */, IntPtr.Zero, lParam);
                return true;
            }

            // Left Click (0) or Double Click (3):
            // 1. Post visual selection messages to SysListView32
            NativeMethods.PostMessage(listView, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
            NativeMethods.PostMessage(listView, 0x0201 /* WM_LBUTTONDOWN */, (IntPtr)0x0001, lParam);
            if (holdMs > 0) Thread.Sleep(holdMs);
            NativeMethods.PostMessage(listView, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);

            // 2. Query item at coordinates
            int hitIndex;
            string itemName = GetItemNameAtPoint(listView, clientPt.X, clientPt.Y, out hitIndex);

            if (hitIndex >= 0 && !string.IsNullOrEmpty(itemName))
            {
                bool isDoubleClick = (mouseBtn == 3);

                lock (_lock)
                {
                    DateTime now = DateTime.UtcNow;
                    if (!isDoubleClick && _lastHitItem == hitIndex && (now - _lastClickTime).TotalMilliseconds < 650)
                    {
                        isDoubleClick = true;
                        _lastHitItem = -1;
                        _lastClickTime = DateTime.MinValue;
                    }
                    else
                    {
                        _lastHitItem = hitIndex;
                        _lastClickTime = now;
                    }
                }

                if (isDoubleClick)
                {
                    // Send DBLCLK message to SysListView32 for state consistency
                    NativeMethods.PostMessage(listView, 0x0203 /* WM_LBUTTONDBLCLK */, (IntPtr)0x0001, lParam);
                    NativeMethods.PostMessage(listView, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);

                    // Launch the Desktop item (folder, shortcut, file, or shell object)
                    LaunchDesktopItem(itemName);
                }
            }

            return true;
        }
    }
}
