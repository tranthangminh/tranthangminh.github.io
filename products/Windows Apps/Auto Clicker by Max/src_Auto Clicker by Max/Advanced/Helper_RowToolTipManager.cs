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

        public static void AttachHoverTooltip(Control control, Func<string> textProvider)
        {
            if (control == null || textProvider == null) return;
            control.MouseEnter += (s, e) =>
            {
                string text = textProvider();
                if (!string.IsNullOrEmpty(text))
                {
                    Shared.SetToolTip(control, text);
                }
            };
        }
    }
}
