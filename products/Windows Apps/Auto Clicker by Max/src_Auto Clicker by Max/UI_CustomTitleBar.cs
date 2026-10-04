using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using ModernAutoClicker.Info;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker
{
    public class CustomTitleBar : Panel
    {
        private ThemeTokens _theme;
        private string _titleText = AppInfo.Title;
        private bool _isHoverClose = false;
        private bool _isHoverMin = false;
        private bool _isHoverLang = false;
        private bool _isHoverTheme = false;
        private bool _isHoverAdmin = false;
        private bool _isRunning = false;
        private ToolTip _toolTip;
        private string _currentTooltipText = "";

        private const int BTN_WIDTH = 34;
        private const int PREF_BTN_SIZE = 30;
        private const int TITLE_HEIGHT = 32;

        public event Action OnCloseRequested;
        public event Action OnMinimizeRequested;
        public event Action OnLanguageToggleRequested;
        public event Action OnThemeToggleRequested;

        public bool IsRunning
        {
            get { return _isRunning; }
            set
            {
                if (_isRunning != value)
                {
                    _isRunning = value;
                    if (_isRunning) _isHoverClose = false;
                    Invalidate();
                }
            }
        }

        public string TitleText
        {
            get { return _titleText; }
            set { _titleText = value; Invalidate(); }
        }

        public CustomTitleBar()
        {
            _theme = ThemeTokens.DarkTheme();
            this.Height = TITLE_HEIGHT;
            this.Dock = DockStyle.None;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);

            _toolTip = new ToolTip();
            _toolTip.InitialDelay = 300;
            _toolTip.ReshowDelay = 100;
            _toolTip.AutoPopDelay = 5000;

            this.MouseMove += TitleBar_MouseMove;
            this.MouseLeave += TitleBar_MouseLeave;
            this.MouseDown += TitleBar_MouseDown;
            this.MouseUp += TitleBar_MouseUp;
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            _theme = theme;
            this.BackColor = theme.BgPrimary;
            Invalidate();
        }

        public void ApplyLanguage()
        {
            Invalidate();
        }

        private Rectangle CloseButtonRect
        {
            get { return new Rectangle(this.Width - BTN_WIDTH, 0, BTN_WIDTH, this.Height); }
        }

        private Rectangle MinButtonRect
        {
            get { return new Rectangle(this.Width - BTN_WIDTH * 2, 0, BTN_WIDTH, this.Height); }
        }

        private Rectangle LangButtonRect
        {
            get { return new Rectangle(this.Width - BTN_WIDTH * 2 - 4 - PREF_BTN_SIZE, (this.Height - PREF_BTN_SIZE) / 2, PREF_BTN_SIZE, PREF_BTN_SIZE); }
        }

        private Rectangle ThemeButtonRect
        {
            get { return new Rectangle(LangButtonRect.Left - 4 - PREF_BTN_SIZE, (this.Height - PREF_BTN_SIZE) / 2, PREF_BTN_SIZE, PREF_BTN_SIZE); }
        }

        private Rectangle AdminButtonRect
        {
            get
            {
                return new Rectangle(ThemeButtonRect.Left - 4 - PREF_BTN_SIZE, (this.Height - PREF_BTN_SIZE) / 2, PREF_BTN_SIZE, PREF_BTN_SIZE);
            }
        }

        private void TitleBar_MouseMove(object sender, MouseEventArgs e)
        {
            bool oldClose = _isHoverClose;
            bool oldMin = _isHoverMin;
            bool oldLang = _isHoverLang;
            bool oldTheme = _isHoverTheme;
            bool oldAdmin = _isHoverAdmin;

            _isHoverClose = !_isRunning && CloseButtonRect.Contains(e.Location);
            _isHoverMin = MinButtonRect.Contains(e.Location);
            _isHoverLang = LangButtonRect.Contains(e.Location);
            _isHoverTheme = ThemeButtonRect.Contains(e.Location);
            _isHoverAdmin = AdminButtonRect.Contains(e.Location);

            if (_isHoverLang || _isHoverTheme || _isHoverAdmin)
            {
                this.Cursor = Cursors.Hand;
            }
            else
            {
                this.Cursor = Cursors.Default;
            }

            if (_isHoverClose != oldClose || _isHoverMin != oldMin || _isHoverLang != oldLang || _isHoverTheme != oldTheme || _isHoverAdmin != oldAdmin)
            {
                UpdateTooltips();
                Invalidate();
            }
        }

        private void UpdateTooltips()
        {
            if (_toolTip == null) return;
            string tip = null;
            if (_isHoverClose) tip = Loc.IsVietnamese ? "Đóng" : "Close";
            else if (_isHoverMin) tip = Loc.IsVietnamese ? "Thu nhỏ" : "Minimize";
            else if (_isHoverLang) tip = Loc.IsVietnamese ? "Đổi sang Tiếng Anh (English)" : "Chuyển sang Tiếng Việt (Vietnamese)";
            else if (_isHoverTheme)
            {
                bool isDark = _theme != null && _theme.IsDark;
                tip = isDark ? (Loc.IsVietnamese ? "Chuyển sang Giao diện Sáng" : "Switch to Light Mode") : (Loc.IsVietnamese ? "Chuyển sang Giao diện Tối" : "Switch to Dark Mode");
            }
            else if (_isHoverAdmin)
            {
                bool isAdmin = UacHelper.IsRunningAsAdmin();
                if (isAdmin)
                {
                    tip = Loc.IsVietnamese ? "Ứng dụng đang chạy với quyền Quản trị viên (Administrator)" : "Running with Administrator privileges";
                }
                else
                {
                    tip = Loc.IsVietnamese ? "Chạy quyền Administrator (Bấm để khởi động lại)" : "Run as Administrator (Click to restart)";
                }
            }

            if (tip != _currentTooltipText)
            {
                _currentTooltipText = tip;
                _toolTip.SetToolTip(this, tip);
            }
        }

        private void TitleBar_MouseLeave(object sender, EventArgs e)
        {
            _isHoverClose = false;
            _isHoverMin = false;
            _isHoverLang = false;
            _isHoverTheme = false;
            _isHoverAdmin = false;
            _currentTooltipText = "";
            if (_toolTip != null) _toolTip.SetToolTip(this, null);
            this.Cursor = Cursors.Default;
            Invalidate();
        }

        private void TitleBar_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                if (CloseButtonRect.Contains(e.Location) || MinButtonRect.Contains(e.Location) || LangButtonRect.Contains(e.Location) || ThemeButtonRect.Contains(e.Location) || AdminButtonRect.Contains(e.Location))
                {
                    return;
                }

                // Drag window
                Form parent = this.FindForm();
                if (parent != null)
                {
                    NativeMethods.ReleaseCapture();
                    NativeMethods.SendMessage(parent.Handle, 0x00A1, (IntPtr)2, IntPtr.Zero);
                }
            }
        }

        private void TitleBar_MouseUp(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                if (CloseButtonRect.Contains(e.Location))
                {
                    if (_isRunning) return;
                    if (OnCloseRequested != null)
                    {
                        OnCloseRequested();
                    }
                    else
                    {
                        Form parent = this.FindForm();
                        if (parent != null) parent.Close();
                    }
                }
                else if (MinButtonRect.Contains(e.Location))
                {
                    if (OnMinimizeRequested != null)
                    {
                        OnMinimizeRequested();
                    }
                    else
                    {
                        Form parent = this.FindForm();
                        if (parent != null) parent.WindowState = FormWindowState.Minimized;
                    }
                }
                else if (LangButtonRect.Contains(e.Location))
                {
                    if (OnLanguageToggleRequested != null)
                    {
                        OnLanguageToggleRequested();
                    }
                    else
                    {
                        Loc.CurrentLanguage = Loc.IsVietnamese ? AppLanguage.English : AppLanguage.Vietnamese;
                    }
                }
                else if (ThemeButtonRect.Contains(e.Location))
                {
                    if (OnThemeToggleRequested != null)
                    {
                        OnThemeToggleRequested();
                    }
                }
                else if (AdminButtonRect.Contains(e.Location))
                {
                    if (!UacHelper.IsRunningAsAdmin())
                    {
                        DialogResult dr = MessageBox.Show(
                            Loc.IsVietnamese 
                                ? "Bạn có muốn khởi động lại ứng dụng dưới quyền Quản trị viên (Administrator) không?" 
                                : "Do you want to restart Auto Clicker with Administrator privileges?",
                            "Administrator Rights",
                            MessageBoxButtons.YesNo,
                            MessageBoxIcon.Question);
                        if (dr == DialogResult.Yes)
                        {
                            UacHelper.RestartAsAdmin();
                        }
                    }
                }
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();

            // 1. Background
            using (SolidBrush bgBrush = new SolidBrush(t.BgPrimary))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            // 2. App Icon (18x18, aligned with Info button [ i ] below at X = 0)
            Image appIcon = SvgFileRenderer.GetAppIconImage(18);
            if (appIcon != null)
            {
                g.DrawImage(appIcon, 0, (this.Height - 18) / 2, 18, 18);
            }

            // 3. Title Text (Vertically Centered across full bar height, ending before admin button)
            using (Font titleFont = ThemeTokens.FontButton(FontStyle.Bold))
            {
                int textRightBound = Math.Max(50, AdminButtonRect.Left - 6);
                Rectangle textRect = new Rectangle(22, 0, textRightBound - 22, this.Height);
                TextRenderer.DrawText(g, _titleText, titleFont, textRect, t.TextPrimary, 
                    TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPrefix);
            }

            // 3.3. Admin Button [ admin.svg ] (Turns golden amber background when running as Administrator)
            Rectangle adminRect = AdminButtonRect;
            bool isCurrentAdmin = UacHelper.IsRunningAsAdmin();
            Rectangle adminVisual = new Rectangle(adminRect.X, (this.Height - PREF_BTN_SIZE) / 2, PREF_BTN_SIZE, PREF_BTN_SIZE);

            Color adminBg;
            Color adminBorder;

            if (isCurrentAdmin)
            {
                // Active Admin: Changed background color (golden amber recognition)
                adminBg = _isHoverAdmin ? Color.FromArgb(235, 160, 20) : Color.FromArgb(210, 140, 10);
                adminBorder = _isHoverAdmin ? Color.FromArgb(255, 190, 40) : Color.FromArgb(245, 180, 30);
            }
            else
            {
                // Non-Admin: Secondary background, hover elevated
                adminBg = _isHoverAdmin ? t.BgElevated : t.BgSecondary;
                adminBorder = _isHoverAdmin ? t.AccentPrimary : t.BorderColor;
            }

            using (GraphicsPath aPath = ModernAutoClicker.Advanced.VFX_AsianDragonOverdrive.GetRoundedRectangle(adminVisual, 4))
            {
                using (SolidBrush aBrush = new SolidBrush(adminBg))
                {
                    g.FillPath(aBrush, aPath);
                }
                using (Pen aPen = new Pen(adminBorder, 1f))
                {
                    g.DrawPath(aPen, aPath);
                }
            }

            // Draw Admin SVG Icon (16x16) centered inside with text-primary color
            Image adminIcon = SvgFileRenderer.GetCachedTintedIcon("admin.svg", 16, 16, t.TextPrimary);
            if (adminIcon != null)
            {
                int iconX = adminVisual.X + (adminVisual.Width - 16) / 2;
                int iconY = adminVisual.Y + (adminVisual.Height - 16) / 2;
                g.DrawImage(adminIcon, iconX, iconY, 16, 16);
            }
            else
            {
                // Fallback emoji if SVG is missing
                using (Font shFont = ThemeTokens.FontSegoeSymbol(ThemeTokens.FontSizeBase, FontStyle.Regular))
                {
                    TextRenderer.DrawText(g, "🛡", shFont, adminVisual, t.TextPrimary,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPadding);
                }
            }

            // 3.4. Theme Toggle Button (30x30)
            Rectangle themeRect = ThemeButtonRect;
            Color themeBg = _isHoverTheme ? t.TextSecondary : t.TextPrimary;
            Color themeBorder = _isHoverTheme ? t.AccentPrimary : t.BorderColor;

            Rectangle themeVisual = new Rectangle(themeRect.X, (this.Height - PREF_BTN_SIZE) / 2, PREF_BTN_SIZE, PREF_BTN_SIZE);
            using (GraphicsPath themePath = ModernAutoClicker.Advanced.VFX_AsianDragonOverdrive.GetRoundedRectangle(themeVisual, 4))
            {
                using (SolidBrush themeBrush = new SolidBrush(themeBg))
                {
                    g.FillPath(themeBrush, themePath);
                }
                using (Pen themePen = new Pen(themeBorder, 1f))
                {
                    g.DrawPath(themePen, themePath);
                }
            }

            // Draw Theme SVG Icon (16x16) centered inside
            Image themeIcon = SvgFileRenderer.GetThemeIconImage(t.IsDark, 16);
            if (themeIcon != null)
            {
                int iconX = themeVisual.X + (themeVisual.Width - 16) / 2;
                int iconY = themeVisual.Y + (themeVisual.Height - 16) / 2;
                g.DrawImage(themeIcon, iconX, iconY, 16, 16);
            }
            else
            {
                // Fallback emoji if SVG is missing
                using (Font fbFont = ThemeTokens.FontSegoeSymbol(ThemeTokens.FontSizeBase, FontStyle.Regular))
                {
                    TextRenderer.DrawText(g, t.IsDark ? "🔆" : "🌙", fbFont, themeVisual, t.AccentPrimary,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPadding);
                }
            }

            // 3.5. Language Toggle Button [ VI ] / [ EN ] (30x30)
            Rectangle langRect = LangButtonRect;
            Color langBg = _isHoverLang ? t.BgElevated : t.BgSecondary;
            Color langBorder = _isHoverLang ? t.AccentPrimary : t.BorderColor;
            Color langFg = _isHoverLang ? t.AccentPrimary : t.TextPrimary;

            Rectangle langVisual = new Rectangle(langRect.X, (this.Height - PREF_BTN_SIZE) / 2, PREF_BTN_SIZE, PREF_BTN_SIZE);
            using (GraphicsPath langPath = ModernAutoClicker.Advanced.VFX_AsianDragonOverdrive.GetRoundedRectangle(langVisual, 4))
            {
                using (SolidBrush langBrush = new SolidBrush(langBg))
                {
                    g.FillPath(langBrush, langPath);
                }
                using (Pen langPen = new Pen(langBorder, 1f))
                {
                    g.DrawPath(langPen, langPath);
                }
            }
            using (Font langFont = ThemeTokens.FontMicro(FontStyle.Bold))
            {
                string langStr = Loc.IsVietnamese ? "VI" : "EN";
                TextRenderer.DrawText(g, langStr, langFont, langVisual, langFg,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPadding);
            }

            // 4. Minimize Button
            Rectangle minRect = MinButtonRect;
            if (_isHoverMin)
            {
                using (SolidBrush hoverBrush = new SolidBrush(t.BgElevated))
                {
                    g.FillRectangle(hoverBrush, minRect);
                }
            }
            int minIconX = minRect.X + (minRect.Width - 10) / 2;
            int minIconY = minRect.Y + minRect.Height / 2;
            using (Pen minPen = new Pen(_isHoverMin ? t.TextPrimary : t.TextSecondary, 1.5f))
            {
                g.DrawLine(minPen, minIconX, minIconY, minIconX + 10, minIconY);
            }

            // 5. Close Button
            Rectangle closeRect = CloseButtonRect;
            Color closeFg = _isRunning ? Color.FromArgb(70, t.TextSecondary) : t.TextSecondary;
            if (!_isRunning && _isHoverClose)
            {
                // Modern theme danger red hover
                using (SolidBrush closeHoverBrush = new SolidBrush(t.Danger))
                {
                    g.FillRectangle(closeHoverBrush, closeRect);
                }
                closeFg = Color.White;
            }

            int cx = closeRect.X + closeRect.Width / 2;
            int cy = closeRect.Y + closeRect.Height / 2;
            int sz = 4;
            using (Pen closePen = new Pen(closeFg, 1.5f))
            {
                g.DrawLine(closePen, cx - sz, cy - sz, cx + sz, cy + sz);
                g.DrawLine(closePen, cx + sz, cy - sz, cx - sz, cy + sz);
            }
        }
    }
}
