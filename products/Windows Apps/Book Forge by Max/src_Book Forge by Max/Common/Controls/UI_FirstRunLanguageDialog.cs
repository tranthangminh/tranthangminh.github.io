using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Interactive card for language selection featuring a prominent 100x100 vector flag
    /// and clean typography label below.
    /// </summary>
    public class LanguageChoiceCard : Control
    {
        private bool _isHover = false;
        private bool _isPressed = false;
        private ThemeTokens _theme;
        private Image _flagImage;
        private string _title;

        public LanguageChoiceCard(string title, bool isVietnamese, ThemeTokens theme)
        {
            _title = title;
            _theme = theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            this.Size = new Size(140, 154);
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);

            // 100x100 flag image
            _flagImage = SvgFileRenderer.GetLanguageIconImage(isVietnamese, 100);

            this.MouseEnter += (s, e) => { _isHover = true; Invalidate(); };
            this.MouseLeave += (s, e) => { _isHover = false; _isPressed = false; Invalidate(); };
            this.MouseDown += (s, e) => { if (e.Button == MouseButtons.Left) { _isPressed = true; Invalidate(); } };
            this.MouseUp += (s, e) => { if (e.Button == MouseButtons.Left) { _isPressed = false; Invalidate(); } };
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            GraphicsHelper.ApplyHighQuality(g);
            ThemeTokens t = _theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();

            Rectangle cardRect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            using (GraphicsPath cardPath = GraphicsHelper.GetRoundedRectangle(cardRect, t.RadiusMd))
            {
                // Background
                Color bg = _isPressed ? t.BgPrimary : (_isHover ? t.BgElevated : t.BgTertiary);
                using (SolidBrush bgBrush = new SolidBrush(bg))
                {
                    g.FillPath(bgBrush, cardPath);
                }

                // 100x100 flag area
                int flagSize = 100;
                int flagX = (this.Width - flagSize) / 2;
                int flagY = 12;
                Rectangle flagRect = new Rectangle(flagX, flagY, flagSize, flagSize);

                using (GraphicsPath flagPath = GraphicsHelper.GetRoundedRectangle(flagRect, 8))
                {
                    using (SolidBrush flagBg = new SolidBrush(t.BgSecondary))
                    {
                        g.FillPath(flagBg, flagPath);
                    }

                    if (_flagImage != null)
                    {
                        GraphicsState state = g.Save();
                        g.SetClip(flagPath);
                        g.DrawImage(_flagImage, flagRect);
                        if (_isHover)
                        {
                            using (SolidBrush hoverOverlay = new SolidBrush(Color.FromArgb(30, 255, 255, 255)))
                            {
                                g.FillPath(hoverOverlay, flagPath);
                            }
                        }
                        g.Restore(state);
                    }

                    Color flagBorder = _isHover ? t.AccentPrimary : t.BorderColor;
                    using (Pen flagPen = new Pen(flagBorder, 1f))
                    {
                        g.DrawPath(flagPen, flagPath);
                    }
                }

                // Text under flag
                Rectangle textRect = new Rectangle(4, 120, this.Width - 8, 24);
                Color textFg = _isHover ? t.AccentPrimaryHover : t.TextPrimary;
                using (Font titleFont = ThemeTokens.FontCard(FontStyle.Bold))
                {
                    TextRenderer.DrawText(g, _title, titleFont, textRect, textFg,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPrefix);
                }

                // Card Border
                Color cardBorder = _isHover ? t.AccentPrimary : t.BorderColor;
                using (Pen cardPen = new Pen(cardBorder, _isHover ? 1.5f : 1f))
                {
                    g.DrawPath(cardPen, cardPath);
                }
            }
        }
    }

    /// <summary>
    /// First-run modal welcome dialog that invites users to choose their preferred language (English or Vietnamese)
    /// using prominent 100x100 vector flag cards with labels below.
    /// </summary>
    public class FirstRunLanguageDialog : Form
    {
        public AppLanguage SelectedLanguage { get; private set; }

        private ThemeTokens _theme;
        private LanguageChoiceCard _cardEnglish;
        private LanguageChoiceCard _cardVietnamese;

        public FirstRunLanguageDialog(ThemeTokens theme = null)
        {
            SelectedLanguage = AppLanguage.English;
            _theme = theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();

            InitializeComponent();

            if (this.IsHandleCreated)
            {
                WindowHelper.ApplyRoundedCorners(this);
            }
            else
            {
                this.HandleCreated += (s, e) => WindowHelper.ApplyRoundedCorners(this);
            }
        }

        private void InitializeComponent()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterParent;
            this.ShowInTaskbar = false;
            this.ClientSize = new Size(340, 244);
            this.BackColor = _theme.BgSecondary;
            this.ForeColor = _theme.TextPrimary;
            this.DoubleBuffered = true;
            this.KeyPreview = true;

            // Title Header
            Label lblTitle = new Label
            {
                Text = "Select Language / Chọn ngôn ngữ",
                Location = new Point(10, 15),
                Size = new Size(320, 24),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = _theme.TextPrimary,
                BackColor = Color.Transparent,
                TextAlign = ContentAlignment.MiddleCenter
            };
            EnableDrag(lblTitle);

            // English Card (US Flag 100x100 + "English" label)
            _cardEnglish = new LanguageChoiceCard("English", false, _theme)
            {
                Location = new Point(20, 46)
            };
            _cardEnglish.Click += (s, e) =>
            {
                SelectedLanguage = AppLanguage.English;
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            // Vietnamese Card (VN Flag 100x100 + "Tiếng Việt" label)
            _cardVietnamese = new LanguageChoiceCard("Tiếng Việt", true, _theme)
            {
                Location = new Point(180, 46)
            };
            _cardVietnamese.Click += (s, e) =>
            {
                SelectedLanguage = AppLanguage.Vietnamese;
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            // Footer hint
            Label lblFooter = new Label
            {
                Text = "Tip: You can switch language anytime via Title Bar",
                Location = new Point(10, 210),
                Size = new Size(320, 22),
                Font = ThemeTokens.FontMicro(FontStyle.Italic),
                ForeColor = _theme.TextTertiary,
                BackColor = Color.Transparent,
                TextAlign = ContentAlignment.MiddleCenter
            };
            EnableDrag(lblFooter);

            this.Controls.AddRange(new Control[] { lblTitle, _cardEnglish, _cardVietnamese, lblFooter });

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
                        CommonNativeMethods.ReleaseCapture();
                        CommonNativeMethods.SendMessage(this.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
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
            GraphicsHelper.ApplyHighQuality(g);

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

    /// <summary>
    /// Backward-compatibility class alias for UI_FirstRunLanguageDialog.
    /// </summary>
    public class UI_FirstRunLanguageDialog : FirstRunLanguageDialog
    {
    }
}
