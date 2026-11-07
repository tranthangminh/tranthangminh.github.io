using System;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public static class RowToolTipManager
    {
        private static ToolTip _sharedToolTip;

        public static ToolTip Shared
        {
            get
            {
                if (_sharedToolTip == null)
                {
                    _sharedToolTip = MacroDescriptions.CreateFastToolTip();
                }
                return _sharedToolTip;
            }
        }

        // Hidden while Ctrl/Shift is held so the hints do not get in the way of selecting rows
        public static void SetSuppressed(bool suppressed)
        {
            if (_sharedToolTip == null) return;
            bool active = !suppressed;
            if (_sharedToolTip.Active != active) _sharedToolTip.Active = active;
        }

        public static void SetToolTip(Control control, string text)
        {
            if (control == null) return;
            if (string.IsNullOrEmpty(text))
            {
                Shared.SetToolTip(control, null);
            }
            else
            {
                Shared.SetToolTip(control, text);
            }
        }
    }
}
