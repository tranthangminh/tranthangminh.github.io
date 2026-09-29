using System;
using System.Drawing;
using System.Text;
using System.Threading;
using System.Windows.Automation;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Specialized adapter for Windows File Explorer (CabinetWClass).
    /// Leverages UI Automation (UIA) to hit-test and seamlessly select, open, and click
    /// files, folders, tabs, navigation trees, and toolbar buttons completely in the background (Free Mouse Mode).
    /// </summary>
    public class WindowsExplorerAdapter : ISpecialAppAdapter
    {
        public string Name { get { return "File Explorer"; } }

        public bool RequiresPhysicalClick { get { return false; } }

        public string OptimizationNote
        {
            get
            {
                return "File Explorer uses DirectUI and modern XAML. Free Mouse Mode uses UI Automation to seamlessly click, select, and open files, folders, tabs, and buttons in the background.";
            }
        }

        public bool IsMatch(string processName, string windowTitle, string className)
        {
            string cls = (className ?? "").Trim();
            string proc = (processName ?? "").Trim();
            string title = (windowTitle ?? "").Trim();

            // Ignore Desktop classes
            if (cls.Equals("Progman", StringComparison.OrdinalIgnoreCase) ||
                cls.Equals("WorkerW", StringComparison.OrdinalIgnoreCase) ||
                cls.Equals("SysListView32", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (cls.Equals("CabinetWClass", StringComparison.OrdinalIgnoreCase) ||
                cls.Equals("ExploreWClass", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (proc.Equals("explorer", StringComparison.OrdinalIgnoreCase))
            {
                if (cls.Equals("ShellTabWindowClass", StringComparison.OrdinalIgnoreCase) ||
                    cls.Equals("DUIViewWndClassName", StringComparison.OrdinalIgnoreCase) ||
                    cls.Equals("DirectUIHWND", StringComparison.OrdinalIgnoreCase) ||
                    cls.IndexOf("Cabinet", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }

                if (title.IndexOf("File Explorer", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Explorer", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }
            }

            return false;
        }

        public IntPtr ResolveTargetHandle(IntPtr topHwnd, Point screenPt)
        {
            if (topHwnd == IntPtr.Zero) return IntPtr.Zero;
            return NativeMethods.GetTopLevelWindow(topHwnd);
        }

        private static string _lastHitElementId = "";
        private static DateTime _lastClickTime = DateTime.MinValue;
        private static readonly object _lock = new object();

        public bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            IntPtr topHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (topHwnd == IntPtr.Zero) topHwnd = targetHwnd;

            NativeMethods.POINT screenPt = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
            NativeMethods.ClientToScreen(targetHwnd, ref screenPt);

            try
            {
                AutomationElement root = AutomationElement.FromHandle(topHwnd);
                if (root != null)
                {
                    OrCondition orCond = new OrCondition(
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ListItem),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TreeItem),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.SplitButton),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TabItem),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.CheckBox),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem),
                        new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Hyperlink)
                    );

                    AutomationElementCollection elements = root.FindAll(TreeScope.Descendants, orCond);
                    AutomationElement hitElement = null;
                    double minArea = double.MaxValue;

                    // 1. Try screenPt (translated via ClientToScreen)
                    for (int i = 0; i < elements.Count; i++)
                    {
                        AutomationElement el = elements[i];
                        try
                        {
                            System.Windows.Rect r = el.Current.BoundingRectangle;
                            if (r.Contains(screenPt.X, screenPt.Y))
                            {
                                double area = r.Width * r.Height;
                                if (area < minArea)
                                {
                                    minArea = area;
                                    hitElement = el;
                                }
                            }
                        }
                        catch { }
                    }

                    // 2. Dual Hit-Test Fallback: If screenPt didn't hit, check if clientPt is already a valid screen coordinate
                    if (hitElement == null)
                    {
                        NativeMethods.RECT winRect;
                        if (NativeMethods.GetWindowRect(topHwnd, out winRect))
                        {
                            if (clientPt.X >= winRect.Left && clientPt.X <= winRect.Right &&
                                clientPt.Y >= winRect.Top && clientPt.Y <= winRect.Bottom)
                            {
                                double minAreaDirect = double.MaxValue;
                                for (int i = 0; i < elements.Count; i++)
                                {
                                    AutomationElement el = elements[i];
                                    try
                                    {
                                        System.Windows.Rect r = el.Current.BoundingRectangle;
                                        if (r.Contains(clientPt.X, clientPt.Y))
                                        {
                                            double area = r.Width * r.Height;
                                            if (area < minAreaDirect)
                                            {
                                                minAreaDirect = area;
                                                hitElement = el;
                                            }
                                        }
                                    }
                                    catch { }
                                }
                                if (hitElement != null)
                                {
                                    screenPt = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
                                }
                            }
                        }
                    }

                    if (hitElement != null)
                    {
                        bool isDoubleClick = (mouseBtn == 3);
                        string elemKey = (hitElement.Current.Name ?? "") + "|" + (hitElement.Current.AutomationId ?? "");

                        lock (_lock)
                        {
                            DateTime now = DateTime.UtcNow;
                            if (!isDoubleClick && _lastHitElementId == elemKey && (now - _lastClickTime).TotalMilliseconds < 650)
                            {
                                isDoubleClick = true;
                                _lastHitElementId = "";
                                _lastClickTime = DateTime.MinValue;
                            }
                            else
                            {
                                _lastHitElementId = elemKey;
                                _lastClickTime = now;
                            }
                        }

                        if (mouseBtn == 1) // Right Click
                        {
                            // Select element then post context menu message
                            object selObj;
                            if (hitElement.TryGetCurrentPattern(SelectionItemPattern.Pattern, out selObj))
                            {
                                try { ((SelectionItemPattern)selObj).Select(); } catch { }
                            }

                            IntPtr leafHwnd = DrillDownToLeaf(targetHwnd, screenPt);
                            NativeMethods.POINT leafClientPt = screenPt;
                            NativeMethods.ScreenToClient(leafHwnd, ref leafClientPt);

                            IntPtr lParam = (IntPtr)(((leafClientPt.Y & 0xFFFF) << 16) | (leafClientPt.X & 0xFFFF));
                            NativeMethods.PostMessage(leafHwnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
                            NativeMethods.PostMessage(leafHwnd, 0x0204 /* WM_RBUTTONDOWN */, (IntPtr)0x0002, lParam);
                            if (holdMs > 0) Thread.Sleep(holdMs);
                            NativeMethods.PostMessage(leafHwnd, 0x0205 /* WM_RBUTTONUP */, IntPtr.Zero, lParam);
                            NativeMethods.PostMessage(leafHwnd, 0x007B /* WM_CONTEXTMENU */, leafHwnd, (IntPtr)(((screenPt.Y & 0xFFFF) << 16) | (screenPt.X & 0xFFFF)));
                            return true;
                        }

                        if (isDoubleClick)
                        {
                            // Double Click: Invoke / Open
                            object invObj;
                            if (hitElement.TryGetCurrentPattern(InvokePattern.Pattern, out invObj))
                            {
                                try { ((InvokePattern)invObj).Invoke(); return true; } catch { }
                            }

                            object expObj;
                            if (hitElement.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out expObj))
                            {
                                try
                                {
                                    var ec = (ExpandCollapsePattern)expObj;
                                    if (ec.Current.ExpandCollapseState == ExpandCollapseState.Collapsed)
                                        ec.Expand();
                                    else if (ec.Current.ExpandCollapseState == ExpandCollapseState.Expanded)
                                        ec.Collapse();
                                    return true;
                                }
                                catch { }
                            }

                            object selObj;
                            if (hitElement.TryGetCurrentPattern(SelectionItemPattern.Pattern, out selObj))
                            {
                                try { ((SelectionItemPattern)selObj).Select(); } catch { }
                            }

                            // 1. Primary: Open / Navigate via Windows Shell COM
                            string itemName = "";
                            try { itemName = hitElement.Current.Name ?? ""; } catch { }
                            bool opened = TryOpenViaShell(topHwnd, itemName);

                            // 2. Fallback: Win32 background DBLCLK and VK_RETURN to leaf DirectUIHWND
                            if (!opened)
                            {
                                IntPtr leafHwnd = DrillDownToLeaf(targetHwnd, screenPt);
                                NativeMethods.POINT leafClientPt = screenPt;
                                NativeMethods.ScreenToClient(leafHwnd, ref leafClientPt);
                                IntPtr lParam = (IntPtr)(((leafClientPt.Y & 0xFFFF) << 16) | (leafClientPt.X & 0xFFFF));

                                NativeMethods.PostMessage(leafHwnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
                                NativeMethods.PostMessage(leafHwnd, 0x0201 /* WM_LBUTTONDOWN */, (IntPtr)0x0001, lParam);
                                if (holdMs > 0) Thread.Sleep(holdMs);
                                NativeMethods.PostMessage(leafHwnd, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);
                                Thread.Sleep(20);
                                NativeMethods.PostMessage(leafHwnd, 0x0203 /* WM_LBUTTONDBLCLK */, (IntPtr)0x0001, lParam);
                                if (holdMs > 0) Thread.Sleep(holdMs);
                                NativeMethods.PostMessage(leafHwnd, 0x0202 /* WM_LBUTTONUP */, IntPtr.Zero, lParam);

                                // Send VK_RETURN (Enter key) to activate selected item in Explorer
                                NativeMethods.PostMessage(leafHwnd, 0x0100 /* WM_KEYDOWN */, (IntPtr)0x0D /* VK_RETURN */, (IntPtr)0x001C0001);
                                Thread.Sleep(15);
                                NativeMethods.PostMessage(leafHwnd, 0x0101 /* WM_KEYUP */, (IntPtr)0x0D /* VK_RETURN */, (IntPtr)0xC01C0001);
                            }
                            return true;
                        }
                        else // Single Left Click
                        {
                            // Edit: Focus
                            if (hitElement.Current.ControlType == ControlType.Edit)
                            {
                                try { hitElement.SetFocus(); return true; } catch { }
                            }

                            // Button, SplitButton, MenuItem, Hyperlink: Invoke
                            if (hitElement.Current.ControlType == ControlType.Button ||
                                hitElement.Current.ControlType == ControlType.SplitButton ||
                                hitElement.Current.ControlType == ControlType.MenuItem ||
                                hitElement.Current.ControlType == ControlType.Hyperlink)
                            {
                                object invObj;
                                if (hitElement.TryGetCurrentPattern(InvokePattern.Pattern, out invObj))
                                {
                                    ((InvokePattern)invObj).Invoke();
                                    return true;
                                }
                            }

                            // CheckBox: Toggle
                            if (hitElement.Current.ControlType == ControlType.CheckBox)
                            {
                                object togObj;
                                if (hitElement.TryGetCurrentPattern(TogglePattern.Pattern, out togObj))
                                {
                                    ((TogglePattern)togObj).Toggle();
                                    return true;
                                }
                            }

                            // ListItem, TreeItem, TabItem: Select
                            object selObj;
                            if (hitElement.TryGetCurrentPattern(SelectionItemPattern.Pattern, out selObj))
                            {
                                ((SelectionItemPattern)selObj).Select();
                                return true;
                            }

                            // Fallback invoke
                            object fallbackInv;
                            if (hitElement.TryGetCurrentPattern(InvokePattern.Pattern, out fallbackInv))
                            {
                                ((InvokePattern)fallbackInv).Invoke();
                                return true;
                            }
                        }

                        return true;
                    }
                }
            }
            catch { }

            // Fallback to Win32 message dispatch to leaf window if UIA hit-test didn't match (e.g. whitespace)
            IntPtr leafTarget = DrillDownToLeaf(targetHwnd, screenPt);
            NativeMethods.POINT lPt = screenPt;
            NativeMethods.ScreenToClient(leafTarget, ref lPt);

            IntPtr lP = (IntPtr)(((lPt.Y & 0xFFFF) << 16) | (lPt.X & 0xFFFF));
            NativeMethods.PostMessage(leafTarget, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lP);
            NativeMethods.PostMessage(leafTarget, (uint)(mouseBtn == 1 ? 0x0204 : 0x0201), (IntPtr)(mouseBtn == 1 ? 0x0002 : 0x0001), lP);
            if (holdMs > 0) Thread.Sleep(holdMs);
            NativeMethods.PostMessage(leafTarget, (uint)(mouseBtn == 1 ? 0x0205 : 0x0202), IntPtr.Zero, lP);

            return true;
        }

        private static IntPtr DrillDownToLeaf(IntPtr parent, NativeMethods.POINT screenPt)
        {
            IntPtr current = parent;
            for (int depth = 0; depth < 10; depth++)
            {
                NativeMethods.POINT ptCur = screenPt;
                if (!NativeMethods.ScreenToClient(current, ref ptCur)) break;

                IntPtr next = NativeMethods.RealChildWindowFromPoint(current, ptCur);
                if (next == IntPtr.Zero || next == current)
                {
                    next = NativeMethods.ChildWindowFromPointEx(current, ptCur, 0x0005);
                    if (next == IntPtr.Zero || next == current) break;
                }
                current = next;
            }
            return current;
        }

        private static bool TryOpenViaShell(IntPtr topHwnd, string itemName)
        {
            if (topHwnd == IntPtr.Zero) return false;
            try
            {
                Type shellType = Type.GetTypeFromProgID("Shell.Application");
                if (shellType == null) return false;
                dynamic shell = Activator.CreateInstance(shellType);
                if (shell == null) return false;
                dynamic windows = shell.Windows();
                if (windows == null) return false;

                foreach (dynamic w in windows)
                {
                    try
                    {
                        if ((long)w.HWND == topHwnd.ToInt64())
                        {
                            // 1. Check selected items first
                            dynamic sel = w.Document != null ? w.Document.SelectedItems() : null;
                            if (sel != null && sel.Count > 0)
                            {
                                dynamic firstItem = sel.Item(0);
                                if (firstItem != null)
                                {
                                    if (firstItem.IsFolder)
                                    {
                                        w.Navigate2(firstItem.Path);
                                        return true;
                                    }
                                    else
                                    {
                                        try { firstItem.InvokeVerb("open"); return true; } catch { }
                                        try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(firstItem.Path) { UseShellExecute = true }); return true; } catch { }
                                    }
                                }
                            }

                            // 2. If no selected item or mismatch, look by name in current folder items
                            if (!string.IsNullOrEmpty(itemName) && w.Document != null && w.Document.Folder != null)
                            {
                                dynamic items = w.Document.Folder.Items();
                                if (items != null)
                                {
                                    for (int i = 0; i < items.Count; i++)
                                    {
                                        dynamic it = items.Item(i);
                                        if (it != null && string.Equals(it.Name, itemName, StringComparison.OrdinalIgnoreCase))
                                        {
                                            if (it.IsFolder)
                                            {
                                                w.Navigate2(it.Path);
                                                return true;
                                            }
                                            else
                                            {
                                                try { it.InvokeVerb("open"); return true; } catch { }
                                                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(it.Path) { UseShellExecute = true }); return true; } catch { }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                }
            }
            catch { }
            return false;
        }
    }
}
