using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Modern dark/light themed modal message dialog.
    /// Replaces the legacy Win32 MessageBox with a sleek, rounded, flat dialog.
    /// </summary>
    public class ModernMessageBox : Form
    {
        private ThemeTokens _theme;
        private Label _lblMessage;
        private Label _lblTitle;
        private Panel _pnlHeader;
        private Button _btnClose;
        private FlowLayoutPanel _pnlButtons;
        private MessageBoxIcon _iconType;

        private ModernMessageBox(string message, string title, MessageBoxButtons buttons, MessageBoxIcon icon, ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            _iconType = icon;

            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterParent;
            this.ShowInTaskbar = false;
            this.DoubleBuffered = true;
            this.KeyPreview = true;
            this.BackColor = _theme.BgSecondary;
            this.ForeColor = _theme.TextPrimary;

            InitializeDialog(message, title, buttons);
        }

        public static DialogResult Show(string message, string title = null, MessageBoxButtons buttons = MessageBoxButtons.OK, MessageBoxIcon icon = MessageBoxIcon.None, Form owner = null)
        {
            if (string.IsNullOrEmpty(title))
            {
                title = AppInfo.AppName;
            }

            ThemeTokens t = ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            using (ModernMessageBox dlg = new ModernMessageBox(message, title, buttons, icon, t))
            {
                if (owner != null && owner.IsHandleCreated)
                {
                    return dlg.ShowDialog(owner);
                }
                else
                {
                    dlg.StartPosition = FormStartPosition.CenterScreen;
                    return dlg.ShowDialog();
                }
            }
        }

        private void InitializeDialog(string message, string title, MessageBoxButtons buttons)
        {
            int baseWidth = 380;
            int baseHeight = 160;

            // Header Panel
            _pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 32,
                BackColor = _theme.BgPrimary
            };
            _pnlHeader.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    CommonNativeMethods.ReleaseCapture();
                    CommonNativeMethods.SendMessage(this.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
                }
            };

            _lblTitle = new Label
            {
                Text = title,
                Location = new Point(12, 0),
                Size = new Size(baseWidth - 50, 32),
                TextAlign = ContentAlignment.MiddleLeft,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = _theme.TextPrimary,
                UseMnemonic = false
            };
            _lblTitle.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    CommonNativeMethods.ReleaseCapture();
                    CommonNativeMethods.SendMessage(this.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
                }
            };

            _btnClose = new Button
            {
                Text = "✕",
                Location = new Point(baseWidth - 32, 0),
                Size = new Size(32, 32),
                FlatStyle = FlatStyle.Flat,
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                ForeColor = _theme.TextSecondary,
                Cursor = Cursors.Hand
            };
            _btnClose.FlatAppearance.BorderSize = 0;
            _btnClose.MouseEnter += (s, e) => { _btnClose.BackColor = _theme.Danger; _btnClose.ForeColor = Color.White; };
            _btnClose.MouseLeave += (s, e) => { _btnClose.BackColor = Color.Transparent; _btnClose.ForeColor = _theme.TextSecondary; };
            _btnClose.Click += (s, e) => { this.DialogResult = DialogResult.Cancel; this.Close(); };

            _pnlHeader.Controls.Add(_lblTitle);
            _pnlHeader.Controls.Add(_btnClose);

            // Message label
            int iconOffset = (_iconType != MessageBoxIcon.None) ? 52 : 20;
            int textWidth = baseWidth - iconOffset - 20;

            _lblMessage = new Label
            {
                Text = message,
                Location = new Point(iconOffset, 48),
                Size = new Size(textWidth, 60),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = _theme.TextPrimary,
                UseMnemonic = false
            };

            using (Graphics g = this.CreateGraphics())
            {
                SizeF size = g.MeasureString(message, _lblMessage.Font, textWidth);
                int measuredH = (int)Math.Ceiling(size.Height) + 10;
                if (measuredH > 60)
                {
                    _lblMessage.Height = measuredH;
                    baseHeight += (measuredH - 60);
                }
            }

            // Button container
            _pnlButtons = new FlowLayoutPanel
            {
                Dock = DockStyle.Bottom,
                Height = 46,
                FlowDirection = FlowDirection.RightToLeft,
                Padding = new Padding(12, 6, 12, 6),
                BackColor = _theme.BgPrimary
            };

            AddButtons(buttons);

            this.ClientSize = new Size(baseWidth, baseHeight);
            _lblTitle.Width = this.ClientSize.Width - 40;
            _btnClose.Location = new Point(this.ClientSize.Width - 32, 0);

            this.Controls.Add(_lblMessage);
            this.Controls.Add(_pnlHeader);
            this.Controls.Add(_pnlButtons);

            this.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.Escape)
                {
                    this.DialogResult = DialogResult.Cancel;
                    this.Close();
                }
            };
        }

        private void AddButtons(MessageBoxButtons buttons)
        {
            switch (buttons)
            {
                case MessageBoxButtons.OK:
                    CreateDialogButton(Loc.Common_Ok, DialogResult.OK, true);
                    break;
                case MessageBoxButtons.OKCancel:
                    CreateDialogButton(Loc.Common_Cancel, DialogResult.Cancel, false);
                    CreateDialogButton(Loc.Common_Ok, DialogResult.OK, true);
                    break;
                case MessageBoxButtons.YesNo:
                    CreateDialogButton(Loc.Common_No, DialogResult.No, false);
                    CreateDialogButton(Loc.Common_Yes, DialogResult.Yes, true);
                    break;
                case MessageBoxButtons.YesNoCancel:
                    CreateDialogButton(Loc.Common_Cancel, DialogResult.Cancel, false);
                    CreateDialogButton(Loc.Common_No, DialogResult.No, false);
                    CreateDialogButton(Loc.Common_Yes, DialogResult.Yes, true);
                    break;
            }
        }

        private void CreateDialogButton(string text, DialogResult result, bool isPrimary)
        {
            RoundedButton btn = new RoundedButton
            {
                Text = text,
                Size = new Size(84, 30),
                BorderRadius = _theme.RadiusSm,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                Cursor = Cursors.Hand,
                Margin = new Padding(6, 0, 0, 0)
            };

            if (isPrimary)
            {
                btn.NormalColor = _theme.AccentPrimary;
                btn.HoverColor = _theme.AccentPrimaryHover;
                btn.ForeColor = Color.White;
            }
            else
            {
                btn.NormalColor = _theme.BgTertiary;
                btn.HoverColor = _theme.BgElevated;
                btn.ForeColor = _theme.TextPrimary;
                btn.BorderColor = _theme.BorderColor;
                btn.BorderWidth = 1;
            }

            btn.Click += (s, e) =>
            {
                this.DialogResult = result;
                this.Close();
            };

            _pnlButtons.Controls.Add(btn);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            GraphicsHelper.ApplyHighQuality(g);

            // Outer border
            using (Pen p = new Pen(_theme.BorderColor, 1f))
            {
                g.DrawRectangle(p, 0, 0, this.Width - 1, this.Height - 1);
            }

            // Icon
            if (_iconType != MessageBoxIcon.None)
            {
                DrawIconBadge(g, new Rectangle(16, 48, 24, 24));
            }
        }

        private void DrawIconBadge(Graphics g, Rectangle rect)
        {
            Color iconColor = _theme.AccentPrimary;
            string symbol = "ℹ";

            switch (_iconType)
            {
                case MessageBoxIcon.Information:
                    iconColor = _theme.AccentPrimary;
                    symbol = "ℹ";
                    break;
                case MessageBoxIcon.Warning:
                    iconColor = _theme.CYellow;
                    symbol = "⚠";
                    break;
                case MessageBoxIcon.Error:
                    iconColor = _theme.Danger;
                    symbol = "✕";
                    break;
                case MessageBoxIcon.Question:
                    iconColor = _theme.AccentSecondary;
                    symbol = "?";
                    break;
            }

            using (Font symFont = ThemeTokens.FontSegoeSymbol(14f, FontStyle.Bold))
            {
                TextRenderer.DrawText(g, symbol, symFont, rect, iconColor,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
            }
        }
    }
}
