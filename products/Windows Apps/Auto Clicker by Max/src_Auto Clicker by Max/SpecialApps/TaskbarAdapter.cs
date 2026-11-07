using System;
using System.Drawing;
using System.Threading;
using System.Windows.Automation;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Specialized adapter for the Windows taskbar (Shell_TrayWnd / Shell_SecondaryTrayWnd).
    /// The Windows 11 taskbar is drawn by XAML and ignores posted mouse messages, so Free Mouse Mode cannot click it in the background.
    /// Left clicks on tray icons and the Start / Task View / Widgets buttons go through UI Automation (Invoke / Toggle) without moving the mouse.
    /// App buttons expose neither pattern, and right / middle / double clicks have no UIA equivalent, so those use a quick physical click:
    /// the cursor jumps to the point, clicks, and is put back.
    /// </summary>
    public class TaskbarAdapter : ISpecialAppAdapter
    {
        private const int SettleMs = 20;

        public string Name { get { return "Windows Taskbar"; } }

        public bool RequiresPhysicalClick { get { return true; } }

        public string OptimizationNote
        {
            get
            {
                return "The Windows 11 taskbar ignores background clicks. Free Mouse Mode clicks tray icons and the Start button through UI Automation, and briefly borrows the mouse for app buttons and right/middle/double clicks.";
            }
        }

        public bool IsMatch(string processName, string windowTitle, string className)
        {
            string cls = (className ?? "").Trim();

            // Top-level taskbars, plus the Win32 children that only exist inside the taskbar
            return cls.Equals("Shell_TrayWnd", StringComparison.OrdinalIgnoreCase) ||
                   cls.Equals("Shell_SecondaryTrayWnd", StringComparison.OrdinalIgnoreCase) ||
                   cls.Equals("MSTaskSwWClass", StringComparison.OrdinalIgnoreCase) ||
                   cls.Equals("MSTaskListWClass", StringComparison.OrdinalIgnoreCase) ||
                   cls.Equals("TrayNotifyWnd", StringComparison.OrdinalIgnoreCase);
        }

        public IntPtr ResolveTargetHandle(IntPtr topHwnd, Point screenPt)
        {
            if (topHwnd == IntPtr.Zero) return IntPtr.Zero;
            // Work on the taskbar root: its child HWNDs do not map to the XAML buttons
            return NativeMethods.GetTopLevelWindow(topHwnd);
        }

        public bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs)
        {
            if (targetHwnd == IntPtr.Zero) return false;

            IntPtr rootHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (rootHwnd == IntPtr.Zero) rootHwnd = targetHwnd;

            NativeMethods.POINT screenPt = new NativeMethods.POINT { X = clientPt.X, Y = clientPt.Y };
            NativeMethods.ClientToScreen(targetHwnd, ref screenPt);

            if (mouseBtn == 0 && TryAutomationClick(rootHwnd, screenPt))
            {
                return true;
            }

            QuickPhysicalClick(screenPt, mouseBtn, holdMs);
            return true;
        }

        private static bool TryAutomationClick(IntPtr rootHwnd, NativeMethods.POINT screenPt)
        {
            try
            {
                AutomationElement root = AutomationElement.FromHandle(rootHwnd);
                if (root == null) return false;

                // AutomationElement.FromPoint only returns the XAML host pane here, so hit-test the buttons by their bounds
                AutomationElementCollection buttons = root.FindAll(TreeScope.Descendants,
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button));
                AutomationElement hit = null;
                double minArea = double.MaxValue;
                for (int i = 0; i < buttons.Count; i++)
                {
                    try
                    {
                        System.Windows.Rect r = buttons[i].Current.BoundingRectangle;
                        if (r.Contains(screenPt.X, screenPt.Y) && r.Width * r.Height < minArea)
                        {
                            minArea = r.Width * r.Height;
                            hit = buttons[i];
                        }
                    }
                    catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
                }
                if (hit == null) return false;

                object pattern;
                if (hit.TryGetCurrentPattern(InvokePattern.Pattern, out pattern))
                {
                    ((InvokePattern)pattern).Invoke();
                    return true;
                }
                if (hit.TryGetCurrentPattern(TogglePattern.Pattern, out pattern))
                {
                    ((TogglePattern)pattern).Toggle();
                    return true;
                }
            }
            catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
            return false;
        }

        private static void QuickPhysicalClick(NativeMethods.POINT screenPt, int mouseBtn, int holdMs)
        {
            NativeMethods.POINT original;
            bool hasOriginal = NativeMethods.GetCursorPos(out original);

            NativeMethods.SetCursorPos(screenPt.X, screenPt.Y);
            // Let the taskbar hit-test the new position before the button goes down
            Thread.Sleep(SettleMs);
            try
            {
                NativeMethods.SendPhysicalClick(mouseBtn, holdMs);
                // The button-up must be handled at the click point, not at the restored position
                Thread.Sleep(SettleMs);
            }
            finally
            {
                if (hasOriginal) NativeMethods.SetCursorPos(original.X, original.Y);
            }
        }
    }
}
