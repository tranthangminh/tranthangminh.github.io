using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Modern Borderless Window TitleBar with built-in Window Controls (Close, Maximize, Minimize),
    /// Utility Buttons (Admin status/elevation, Theme toggle, Bilingual toggle),
    /// Drag-to-move, Double-click to Maximize, and Dynamic Auto-Layout.
    /// 
    /// PRINCIPLE: All 6 buttons are 100% built-in. Any application can toggle button visibility
    /// from outside via properties (e.g. titleBar.ShowMaximizeButton = true; titleBar.ShowAdminButton = false;).
    /// The titlebar automatically recalculates button positions right-to-left without gaps.
    /// </summary>
    public class CustomTitleBar : Panel
    {
        private ThemeTokens _theme;
        private string _titleText = null;
        private bool _isRunning = false;
        private ToolTip _toolTip;
        private string _currentTooltipText = "";
        private Image _cachedIcon = null;

        private const int BTN_WIDTH = 34;
        private const int PREF_BTN_SIZE = 30;
        private const int TITLE_HEIGHT = 32;

        // Button Visibility Feature Toggles (Configurable from outside, 0 modifications to Common)
        private bool _showClose = true;
        private bool _showMax = false;
        private bool _showMin = true;
        private bool _showLang = true;
        private bool _showTheme = true;
        private bool _showAdmin = true;
        private bool _showAppIcon = true;

        // Dynamic Layout Rectangles (Recalculated automatically)
        private Rectangle _rectClose = Rectangle.Empty;
        private Rectangle _rectMax = Rectangle.Empty;
        private Rectangle _rectMin = Rectangle.Empty;
        private Rectangle _rectLang = Rectangle.Empty;
        private Rectangle _rectTheme = Rectangle.Empty;
        private Rectangle _rectAdmin = Rectangle.Empty;
        private int _textRightBound = 50;

        // Hover States
        private bool _isHoverClose = false;
        private bool _isHoverMax = false;
        private bool _isHoverMin = false;
        private bool _isHoverLang = false;
        private bool _isHoverTheme = false;
        private bool _isHoverAdmin = false;

        // Events
        public event Action OnCloseRequested;
        public event Action OnMaximizeRestoreRequested;
        public event Action OnMinimizeRequested;
        public event Action OnLanguageToggleRequested;
        public event Action OnThemeToggleRequested;

        public bool ShowCloseButton
        {
            get { return _showClose; }
            set { if (_showClose != value) { _showClose = value; RecalculateLayout(); } }
        }

        public bool ShowMaximizeButton
        {
            get { return _showMax; }
            set { if (_showMax != value) { _showMax = value; RecalculateLayout(); } }
        }

        public bool ShowMinimizeButton
        {
            get { return _showMin; }
            set { if (_showMin != value) { _showMin = value; RecalculateLayout(); } }
        }

        public bool ShowLanguageButton
        {
            get { return _showLang; }
            set { if (_showLang != value) { _showLang = value; RecalculateLayout(); } }
        }

        public bool ShowThemeButton
        {
            get { return _showTheme; }
            set { if (_showTheme != value) { _showTheme = value; RecalculateLayout(); } }
        }

        public bool ShowAdminButton
        {
            get { return _showAdmin; }
            set { if (_showAdmin != value) { _showAdmin = value; RecalculateLayout(); } }
        }

        public bool ShowAppIcon
        {
            get { return _showAppIcon; }
            set { if (_showAppIcon != value) { _showAppIcon = value; Invalidate(); } }
        }

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
            get { return _titleText ?? AppInfo.Title; }
            set { _titleText = value; Invalidate(); }
        }

        private Form _parentForm = null;
        public Form ParentForm
        {
            get { return _parentForm ?? this.FindForm(); }
            set { _parentForm = value; }
        }

        public CustomTitleBar() : this(null) { }

        public CustomTitleBar(Form parentForm)
        {
            _parentForm = parentForm;
            _theme = ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            this.Height = TITLE_HEIGHT;
            this.Dock = DockStyle.Top;
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
            this.MouseDoubleClick += TitleBar_MouseDoubleClick;

            RecalculateLayout();
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            RecalculateLayout();
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            _theme = theme;
            this.BackColor = theme.BgPrimary;
            RecalculateLayout();
        }

        public void ApplyLanguage()
        {
            UpdateTooltips();
            Invalidate();
        }

        /// <summary>
        /// Dynamic Right-to-Left Auto-Layout Engine.
        /// Recalculates positions dynamically so hidden buttons leave zero gaps.
        /// </summary>
        public void RecalculateLayout()
        {
            int curX = this.Width;

            // 1. Window action buttons (Close -> Maximize -> Minimize)
            if (_showClose)
            {
                curX -= BTN_WIDTH;
                _rectClose = new Rectangle(curX, 0, BTN_WIDTH, this.Height);
            }
            else
            {
                _rectClose = Rectangle.Empty;
            }

            if (_showMax)
            {
                curX -= BTN_WIDTH;
                _rectMax = new Rectangle(curX, 0, BTN_WIDTH, this.Height);
            }
            else
            {
                _rectMax = Rectangle.Empty;
            }

            if (_showMin)
            {
                curX -= BTN_WIDTH;
                _rectMin = new Rectangle(curX, 0, BTN_WIDTH, this.Height);
            }
            else
            {
                _rectMin = Rectangle.Empty;
            }

            // 2. Utility buttons (Language -> Theme -> Admin)
            int toolY = (this.Height - PREF_BTN_SIZE) / 2;

            if (_showLang)
            {
                curX -= (4 + PREF_BTN_SIZE);
                _rectLang = new Rectangle(curX, toolY, PREF_BTN_SIZE, PREF_BTN_SIZE);
            }
            else
            {
                _rectLang = Rectangle.Empty;
            }

            if (_showTheme)
            {
                curX -= (4 + PREF_BTN_SIZE);
                _rectTheme = new Rectangle(curX, toolY, PREF_BTN_SIZE, PREF_BTN_SIZE);
            }
            else
            {
                _rectTheme = Rectangle.Empty;
            }

            if (_showAdmin)
            {
                curX -= (4 + PREF_BTN_SIZE);
                _rectAdmin = new Rectangle(curX, toolY, PREF_BTN_SIZE, PREF_BTN_SIZE);
            }
            else
            {
                _rectAdmin = Rectangle.Empty;
            }

            _textRightBound = Math.Max(50, curX - 6);
            Invalidate();
        }

        public void ToggleMaximizeRestore()
        {
            Form parent = this.FindForm();
            if (parent != null)
            {
                parent.WindowState = (parent.WindowState == FormWindowState.Maximized)
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
                RecalculateLayout();
            }
        }

        private void TitleBar_MouseMove(object sender, MouseEventArgs e)
        {
            bool oldClose = _isHoverClose;
            bool oldMax = _isHoverMax;
            bool oldMin = _isHoverMin;
            bool oldLang = _isHoverLang;
            bool oldTheme = _isHoverTheme;
            bool oldAdmin = _isHoverAdmin;

            _isHoverClose = !_isRunning && _showClose && _rectClose.Contains(e.Location);
            _isHoverMax = _showMax && _rectMax.Contains(e.Location);
            _isHoverMin = _showMin && _rectMin.Contains(e.Location);
            _isHoverLang = _showLang && _rectLang.Contains(e.Location);
            _isHoverTheme = _showTheme && _rectTheme.Contains(e.Location);
            _isHoverAdmin = _showAdmin && _rectAdmin.Contains(e.Location);

            if (_isHoverLang || _isHoverTheme || _isHoverAdmin)
            {
                this.Cursor = Cursors.Hand;
            }
            else
            {
                this.Cursor = Cursors.Default;
            }

            if (_isHoverClose != oldClose || _isHoverMax != oldMax || _isHoverMin != oldMin ||
                _isHoverLang != oldLang || _isHoverTheme != oldTheme || _isHoverAdmin != oldAdmin)
            {
                UpdateTooltips();
                Invalidate();
            }
        }

        private void UpdateTooltips()
        {
            if (_toolTip == null) return;
            string tip = null;

            if (_isHoverClose)
            {
                tip = Loc.Close;
            }
            else if (_isHoverMax)
            {
                Form parent = this.FindForm();
                bool isMaximized = (parent != null && parent.WindowState == FormWindowState.Maximized);
                tip = isMaximized ? Loc.Restore : Loc.Maximize;
            }
            else if (_isHoverMin)
            {
                tip = Loc.Minimize;
            }
            else if (_isHoverLang)
            {
                tip = Loc.IsVietnamese ? Loc.SwitchToEn : Loc.SwitchToVi;
            }
            else if (_isHoverTheme)
            {
                bool isDark = _theme != null && _theme.IsDark;
                tip = isDark ? Loc.SwitchToLight : Loc.SwitchToDark;
            }
            else if (_isHoverAdmin)
            {
                bool isAdmin = UacHelper.IsRunningAsAdmin();
                tip = isAdmin ? Loc.AdminRunning : Loc.AdminRequest;
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
            _isHoverMax = false;
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
                if ((_showClose && _rectClose.Contains(e.Location)) ||
                    (_showMax && _rectMax.Contains(e.Location)) ||
                    (_showMin && _rectMin.Contains(e.Location)) ||
                    (_showLang && _rectLang.Contains(e.Location)) ||
                    (_showTheme && _rectTheme.Contains(e.Location)) ||
                    (_showAdmin && _rectAdmin.Contains(e.Location)))
                {
                    return;
                }

                // Drag window
                Form parent = this.FindForm();
                if (parent != null)
                {
                    CommonNativeMethods.ReleaseCapture();
                    CommonNativeMethods.SendMessage(parent.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
                }
            }
        }

        private void TitleBar_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left && _showMax)
            {
                if ((_showClose && _rectClose.Contains(e.Location)) ||
                    (_showMax && _rectMax.Contains(e.Location)) ||
                    (_showMin && _rectMin.Contains(e.Location)) ||
                    (_showLang && _rectLang.Contains(e.Location)) ||
                    (_showTheme && _rectTheme.Contains(e.Location)) ||
                    (_showAdmin && _rectAdmin.Contains(e.Location)))
                {
                    return;
                }

                if (OnMaximizeRestoreRequested != null)
                {
                    OnMaximizeRestoreRequested();
                }
                else
                {
                    ToggleMaximizeRestore();
                }
            }
        }

        private void TitleBar_MouseUp(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                if (_showClose && _rectClose.Contains(e.Location))
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
                else if (_showMax && _rectMax.Contains(e.Location))
                {
                    if (OnMaximizeRestoreRequested != null)
                    {
                        OnMaximizeRestoreRequested();
                    }
                    else
                    {
                        ToggleMaximizeRestore();
                    }
                }
                else if (_showMin && _rectMin.Contains(e.Location))
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
                else if (_showLang && _rectLang.Contains(e.Location))
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
                else if (_showTheme && _rectTheme.Contains(e.Location))
                {
                    if (OnThemeToggleRequested != null)
                    {
                        OnThemeToggleRequested();
                    }
                }
                else if (_showAdmin && _rectAdmin.Contains(e.Location))
                {
                    if (!UacHelper.IsRunningAsAdmin())
                    {
                        DialogResult dr = MessageBox.Show(
                            Loc.AdminRestartPrompt,
                            Loc.AdminPromptTitle,
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

        private Image GetAppIcon()
        {
            if (_cachedIcon != null) return _cachedIcon;

            try
            {
                Image svgIcon = SvgFileRenderer.GetAppIconImage(18);
                if (svgIcon != null)
                {
                    _cachedIcon = svgIcon;
                    return _cachedIcon;
                }

                Form parent = this.FindForm();
                if (parent != null && parent.Icon != null)
                {
                    using (Bitmap bmp = parent.Icon.ToBitmap())
                    {
                        _cachedIcon = new Bitmap(bmp, 18, 18);
                        return _cachedIcon;
                    }
                }
            }
            catch { }

            return null;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            GraphicsHelper.ApplyHighQuality(g);

            ThemeTokens t = _theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();

            // 1. Background
            using (SolidBrush bgBrush = new SolidBrush(t.BgPrimary))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            // 2. App Icon (18x18, Y-centered at X = 0 or 8)
            int iconX = 0;
            int textStartX = 22;

            if (_showAppIcon)
            {
                Image appIcon = GetAppIcon();
                if (appIcon != null)
                {
                    g.DrawImage(appIcon, iconX, (this.Height - 18) / 2, 18, 18);
                }
                else
                {
                    textStartX = 8;
                }
            }
            else
            {
                textStartX = 8;
            }

            // 3. Title Text
            using (Font titleFont = ThemeTokens.FontButton(FontStyle.Bold))
            {
                int textW = Math.Max(0, _textRightBound - textStartX);
                Rectangle textRect = new Rectangle(textStartX, 0, textW, this.Height);
                TextRenderer.DrawText(g, TitleText, titleFont, textRect, t.TextPrimary,
                    TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPrefix);
            }

            // 4. Admin Button
            if (_showAdmin && !_rectAdmin.IsEmpty)
            {
                bool isCurrentAdmin = UacHelper.IsRunningAsAdmin();
                Color adminBg;
                Color adminBorder;

                if (isCurrentAdmin)
                {
                    adminBg = _isHoverAdmin ? Color.FromArgb(235, 160, 20) : Color.FromArgb(210, 140, 10);
                    adminBorder = _isHoverAdmin ? Color.FromArgb(255, 190, 40) : Color.FromArgb(245, 180, 30);
                }
                else
                {
                    adminBg = _isHoverAdmin ? t.BgElevated : t.BgSecondary;
                    adminBorder = _isHoverAdmin ? t.AccentPrimary : t.BorderColor;
                }

                using (GraphicsPath aPath = GraphicsHelper.GetRoundedRectangle(_rectAdmin, 4))
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

                Image adminIcon = SvgFileRenderer.GetCachedTintedIcon("admin.svg", 16, 16, t.TextPrimary);
                if (adminIcon != null)
                {
                    int ax = _rectAdmin.X + (_rectAdmin.Width - 16) / 2;
                    int ay = _rectAdmin.Y + (_rectAdmin.Height - 16) / 2;
                    g.DrawImage(adminIcon, ax, ay, 16, 16);
                }
                else
                {
                    using (Font shFont = ThemeTokens.FontSegoeSymbol(ThemeTokens.FontSizeBase, FontStyle.Regular))
                    {
                        TextRenderer.DrawText(g, "🛡", shFont, _rectAdmin, t.TextPrimary,
                            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPadding);
                    }
                }
            }

            // 5. Theme Button
            if (_showTheme && !_rectTheme.IsEmpty)
            {
                Color themeBg = _isHoverTheme ? t.TextSecondary : t.TextPrimary;
                Color themeBorder = _isHoverTheme ? t.AccentPrimary : t.BorderColor;

                using (GraphicsPath themePath = GraphicsHelper.GetRoundedRectangle(_rectTheme, 4))
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

                Image themeIcon = SvgFileRenderer.GetThemeIconImage(t.IsDark, 16);
                if (themeIcon != null)
                {
                    int tx = _rectTheme.X + (_rectTheme.Width - 16) / 2;
                    int ty = _rectTheme.Y + (_rectTheme.Height - 16) / 2;
                    g.DrawImage(themeIcon, tx, ty, 16, 16);
                }
                else
                {
                    using (Font fbFont = ThemeTokens.FontSegoeSymbol(ThemeTokens.FontSizeBase, FontStyle.Regular))
                    {
                        TextRenderer.DrawText(g, t.IsDark ? "🔆" : "🌙", fbFont, _rectTheme, t.AccentPrimary,
                            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPadding);
                    }
                }
            }

            // 6. Language Button
            if (_showLang && !_rectLang.IsEmpty)
            {
                Color langBg = _isHoverLang ? t.BgElevated : t.BgSecondary;
                Color langBorder = _isHoverLang ? t.AccentPrimary : t.BorderColor;
                Color langFg = _isHoverLang ? t.AccentPrimary : t.TextPrimary;

                using (GraphicsPath langPath = GraphicsHelper.GetRoundedRectangle(_rectLang, 4))
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
                    TextRenderer.DrawText(g, langStr, langFont, _rectLang, langFg,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPadding);
                }
            }

            // 7. Minimize Button
            if (_showMin && !_rectMin.IsEmpty)
            {
                if (_isHoverMin)
                {
                    using (SolidBrush hoverBrush = new SolidBrush(t.BgElevated))
                    {
                        g.FillRectangle(hoverBrush, _rectMin);
                    }
                }
                int minIconX = _rectMin.X + (_rectMin.Width - 10) / 2;
                int minIconY = _rectMin.Y + _rectMin.Height / 2;
                using (Pen minPen = new Pen(_isHoverMin ? t.TextPrimary : t.TextSecondary, 1.5f))
                {
                    g.DrawLine(minPen, minIconX, minIconY, minIconX + 10, minIconY);
                }
            }

            // 8. Maximize / Restore Button
            if (_showMax && !_rectMax.IsEmpty)
            {
                if (_isHoverMax)
                {
                    using (SolidBrush hoverBrush = new SolidBrush(t.BgElevated))
                    {
                        g.FillRectangle(hoverBrush, _rectMax);
                    }
                }

                Form parent = this.FindForm();
                bool isMaximized = (parent != null && parent.WindowState == FormWindowState.Maximized);
                Color maxFg = _isHoverMax ? t.TextPrimary : t.TextSecondary;

                using (Pen maxPen = new Pen(maxFg, 1.5f))
                {
                    if (isMaximized)
                    {
                        // Restore icon: 2 overlapping squares
                        int rx = _rectMax.X + (_rectMax.Width - 10) / 2;
                        int ry = _rectMax.Y + (_rectMax.Height - 10) / 2;
                        g.DrawRectangle(maxPen, rx + 2, ry, 7, 7);
                        using (SolidBrush frontFill = new SolidBrush(_isHoverMax ? t.BgElevated : t.BgPrimary))
                        {
                            g.FillRectangle(frontFill, rx, ry + 2, 8, 8);
                        }
                        g.DrawRectangle(maxPen, rx, ry + 2, 7, 7);
                    }
                    else
                    {
                        // Maximize icon: single square (9x9)
                        int mx = _rectMax.X + (_rectMax.Width - 10) / 2;
                        int my = _rectMax.Y + (_rectMax.Height - 10) / 2;
                        g.DrawRectangle(maxPen, mx, my, 9, 9);
                    }
                }
            }

            // 9. Close Button
            if (_showClose && !_rectClose.IsEmpty)
            {
                Color closeFg = _isRunning ? Color.FromArgb(70, t.TextSecondary) : t.TextSecondary;
                if (!_isRunning && _isHoverClose)
                {
                    using (SolidBrush closeHoverBrush = new SolidBrush(t.Danger))
                    {
                        g.FillRectangle(closeHoverBrush, _rectClose);
                    }
                    closeFg = Color.White;
                }

                int cx = _rectClose.X + _rectClose.Width / 2;
                int cy = _rectClose.Y + _rectClose.Height / 2;
                int sz = 4;
                using (Pen closePen = new Pen(closeFg, 1.5f))
                {
                    g.DrawLine(closePen, cx - sz, cy - sz, cx + sz, cy + sz);
                    g.DrawLine(closePen, cx + sz, cy - sz, cx - sz, cy + sz);
                }
            }
        }
    }
}
