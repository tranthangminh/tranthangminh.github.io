using System;
using System.Drawing;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Modern dark/light themed message dialog on the shared popup frame.
    /// Replaces the legacy Win32 MessageBox.
    /// </summary>
    public class ModernMessageBox : ModernDialog
    {
        private const int DialogWidth = 380;
        private const int MaxBodyHeight = 420;
        private const int TopPad = 16;
        private const int BottomPad = 16;
        private const int IconSize = 24;
        private const int InfoIconSize = 20;
        private const int IconLeft = 16;
        private const int TextLeftWithIcon = 52;
        private const int TextLeftNoIcon = 20;
        private const int TextRightPad = 20;

        private readonly MessageBoxIcon _iconType;

        private ModernMessageBox(string message, string title, MessageBoxButtons buttons, MessageBoxIcon icon)
            : base(title)
        {
            _iconType = icon;

            int textLeft = (icon != MessageBoxIcon.None) ? TextLeftWithIcon : TextLeftNoIcon;
            int textWidth = DialogWidth - textLeft - TextRightPad;
            Font font = ThemeTokens.FontBase(FontStyle.Regular);
            int textHeight = TextRenderer.MeasureText(message, font, new Size(textWidth, 0), TextFormatFlags.WordBreak | TextFormatFlags.NoPrefix).Height;

            Body.Controls.Add(new Label
            {
                Text = message,
                Location = new Point(textLeft, TopPad),
                Size = new Size(textWidth, textHeight),
                Font = font,
                ForeColor = Theme.TextPrimary,
                UseMnemonic = false
            });
            Body.Paint += (s, e) => DrawIconBadge(e.Graphics);

            AddButtons(buttons);
            SetBodySize(DialogWidth, TopPad + Math.Max(textHeight, IconSize) + BottomPad, MaxBodyHeight);
        }

        /// <summary>Owner is the window to lock: a form, or any control on it.</summary>
        public static DialogResult Show(string message, string title = null, MessageBoxButtons buttons = MessageBoxButtons.OK, MessageBoxIcon icon = MessageBoxIcon.None, IWin32Window owner = null)
        {
            Control ownerControl = owner as Control;
            Form ownerForm = ownerControl != null ? ownerControl.FindForm() : null;

            using (ModernMessageBox dialog = new ModernMessageBox(message, string.IsNullOrEmpty(title) ? AppInfo.AppName : title, buttons, icon))
            {
                return dialog.ShowModal(ownerForm != null && ownerForm.IsHandleCreated ? ownerForm : null);
            }
        }

        private void AddButtons(MessageBoxButtons buttons)
        {
            switch (buttons)
            {
                case MessageBoxButtons.OK:
                    this.AcceptButton = AddButton(Loc.Common_Ok, DialogResult.OK, true);
                    this.CancelButton = this.AcceptButton;
                    break;
                case MessageBoxButtons.OKCancel:
                    this.AcceptButton = AddButton(Loc.Common_Ok, DialogResult.OK, true);
                    this.CancelButton = AddButton(Loc.Common_Cancel, DialogResult.Cancel, false);
                    break;
                case MessageBoxButtons.YesNo:
                    this.AcceptButton = AddButton(Loc.Common_Yes, DialogResult.Yes, true);
                    this.CancelButton = AddButton(Loc.Common_No, DialogResult.No, false);
                    break;
                case MessageBoxButtons.YesNoCancel:
                    this.AcceptButton = AddButton(Loc.Common_Yes, DialogResult.Yes, true);
                    AddButton(Loc.Common_No, DialogResult.No, false);
                    this.CancelButton = AddButton(Loc.Common_Cancel, DialogResult.Cancel, false);
                    break;
            }
        }

        private void DrawIconBadge(Graphics g)
        {
            if (_iconType == MessageBoxIcon.None) return;

            GraphicsHelper.ApplyHighQuality(g);

            // The font's info sign renders as a tiny dot and stroke, so this one comes from the shared icon set
            if (_iconType == MessageBoxIcon.Information)
            {
                Image info = SvgFileRenderer.GetCachedTintedIcon("info.svg", InfoIconSize, InfoIconSize, Theme.AccentPrimary);
                if (info != null)
                {
                    int offset = (IconSize - InfoIconSize) / 2;
                    g.DrawImage(info, IconLeft + offset, TopPad + offset, InfoIconSize, InfoIconSize);
                }
                return;
            }

            Color iconColor = Theme.AccentPrimary;
            string symbol = "";

            switch (_iconType)
            {
                case MessageBoxIcon.Warning:
                    iconColor = Theme.CYellow;
                    symbol = "⚠";
                    break;
                case MessageBoxIcon.Error:
                    iconColor = Theme.Danger;
                    symbol = "✕";
                    break;
                case MessageBoxIcon.Question:
                    iconColor = Theme.AccentSecondary;
                    symbol = "?";
                    break;
            }

            using (Font symFont = ThemeTokens.FontSegoeSymbol(14f, FontStyle.Bold))
            {
                TextRenderer.DrawText(g, symbol, symFont, new Rectangle(IconLeft, TopPad, IconSize, IconSize), iconColor,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
            }
        }
    }
}
