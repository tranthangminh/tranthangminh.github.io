using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker
{
    public class UI_FirstRunLanguageDialog : Form
    {
        public AppLanguage SelectedLanguage { get; private set; }

        private ThemeTokens _theme;
        private RoundedButton _btnEnglish;
        private RoundedButton _btnVietnamese;

        public UI_FirstRunLanguageDialog()
        {
            SelectedLanguage = AppLanguage.English;
            _theme = ThemeTokens.DarkTheme();

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterParent;
            this.ShowInTaskbar = false;
            this.ClientSize = new Size(340, 118);
            this.BackColor = _theme.BgSecondary;
            this.ForeColor = _theme.TextPrimary;
            this.DoubleBuffered = true;
            this.KeyPreview = true;

            // English Button (Vertically & Horizontally centered text)
            _btnEnglish = new RoundedButton
            {
                Text = "English",
                Subtitle = null,
                Location = new Point(25, 20),
                Size = new Size(135, 46),
                BorderRadius = _theme.RadiusMd,
                NormalColor = _theme.AccentPrimary,
                HoverColor = _theme.AccentPrimaryHover,
                PressedColor = _theme.BgElevated,
                ForeColor = Color.White,
                Font = ThemeTokens.FontSegoe(13.5F, FontStyle.Bold)
            };
            _btnEnglish.Click += (s, e) =>
            {
                SelectedLanguage = AppLanguage.English;
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            // Vietnamese Button (Vertically & Horizontally centered text)
            _btnVietnamese = new RoundedButton
            {
                Text = "Tiếng Việt",
                Subtitle = null,
                Location = new Point(180, 20),
                Size = new Size(135, 46),
                BorderRadius = _theme.RadiusMd,
                NormalColor = _theme.BgTertiary,
                HoverColor = _theme.BgElevated,
                PressedColor = _theme.BgPrimary,
                BorderColor = _theme.BorderColor,
                BorderWidth = 1,
                ForeColor = Color.White,
                Font = ThemeTokens.FontSegoe(13.5F, FontStyle.Bold)
            };
            _btnVietnamese.Click += (s, e) =>
            {
                SelectedLanguage = AppLanguage.Vietnamese;
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            // Footer tip (Centered)
            Label lblFooter = new Label
            {
                Text = "Tip: You can switch language anytime via VI / EN on Title Bar",
                Location = new Point(10, 78),
                Size = new Size(320, 24),
                Font = ThemeTokens.FontSegoe(9.5F, FontStyle.Italic),
                ForeColor = _theme.TextTertiary,
                BackColor = Color.Transparent,
                TextAlign = ContentAlignment.MiddleCenter
            };
            EnableDrag(lblFooter);

            this.Controls.Add(_btnEnglish);
            this.Controls.Add(_btnVietnamese);
            this.Controls.Add(lblFooter);

            EnableDrag(this);
        }

        private void EnableDrag(Control c)
        {
            c.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    try
                    {
                        NativeMethods.ReleaseCapture();
                        NativeMethods.SendMessage(this.Handle, 0x00A1, (IntPtr)2, IntPtr.Zero);
                    }
                    catch { }
                }
            };
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Enter || keyData == Keys.E || keyData == Keys.D1 || keyData == Keys.NumPad1)
            {
                SelectedLanguage = AppLanguage.English;
                this.DialogResult = DialogResult.OK;
                this.Close();
                return true;
            }
            if (keyData == Keys.V || keyData == Keys.D2 || keyData == Keys.NumPad2)
            {
                SelectedLanguage = AppLanguage.Vietnamese;
                this.DialogResult = DialogResult.OK;
                this.Close();
                return true;
            }
            if (keyData == Keys.Escape)
            {
                SelectedLanguage = AppLanguage.English;
                this.DialogResult = DialogResult.OK;
                this.Close();
                return true;
            }

            return base.ProcessCmdKey(ref msg, keyData);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Top decorative accent line
            using (SolidBrush accentBrush = new SolidBrush(_theme.AccentPrimary))
            {
                g.FillRectangle(accentBrush, 0, 0, this.Width, 3);
            }

            // Outer border
            using (Pen borderPen = new Pen(_theme.BorderColor, 1f))
            {
                g.DrawRectangle(borderPen, 0, 0, this.Width - 1, this.Height - 1);
            }
        }
    }
}
