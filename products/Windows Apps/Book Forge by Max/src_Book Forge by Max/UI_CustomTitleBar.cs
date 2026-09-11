using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace BookForge
{
    public class CustomTitleBar : Panel
    {
        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

        private ThemeTokens _theme;
        private string _titleText = "Book Forge by Max v1.0 (Beta)";
        private bool _isHoverClose = false;
        private bool _isHoverMax = false;
        private bool _isHoverMin = false;
        private bool _isRunning = false;
        private bool _showMaximize = true;
        private Image _cachedIcon = null;

        private const int BTN_WIDTH = 44;
        private const int TITLE_HEIGHT = 32;

        public event Action OnCloseRequested;
        public event Action OnMinimizeRequested;
        public event Action OnMaximizeRestoreRequested;

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
            set
            {
                _titleText = value;
                Invalidate();
            }
        }

        public bool ShowMaximizeButton
        {
            get { return _showMaximize; }
            set
            {
                _showMaximize = value;
                Invalidate();
            }
        }

        public CustomTitleBar()
        {
            _theme = ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            this.Height = TITLE_HEIGHT;
            this.Dock = DockStyle.Top;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);

            this.MouseMove += TitleBar_MouseMove;
            this.MouseLeave += TitleBar_MouseLeave;
            this.MouseDown += TitleBar_MouseDown;
            this.MouseUp += TitleBar_MouseUp;
            this.MouseDoubleClick += TitleBar_MouseDoubleClick;
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            _theme = theme;
            this.BackColor = theme.BgPrimary;
            Invalidate();
        }

        private Rectangle CloseButtonRect
        {
            get { return new Rectangle(this.Width - BTN_WIDTH, 0, BTN_WIDTH, this.Height); }
        }

        private Rectangle MaxButtonRect
        {
            get
            {
                if (!_showMaximize) return Rectangle.Empty;
                return new Rectangle(this.Width - BTN_WIDTH * 2, 0, BTN_WIDTH, this.Height);
            }
        }

        private Rectangle MinButtonRect
        {
            get
            {
                int offset = _showMaximize ? BTN_WIDTH * 3 : BTN_WIDTH * 2;
                return new Rectangle(this.Width - offset, 0, BTN_WIDTH, this.Height);
            }
        }

        private void TitleBar_MouseMove(object sender, MouseEventArgs e)
        {
            bool oldClose = _isHoverClose;
            bool oldMax = _isHoverMax;
            bool oldMin = _isHoverMin;

            _isHoverClose = !_isRunning && CloseButtonRect.Contains(e.Location);
            _isHoverMax = _showMaximize && MaxButtonRect.Contains(e.Location);
            _isHoverMin = MinButtonRect.Contains(e.Location);

            if (_isHoverClose != oldClose || _isHoverMax != oldMax || _isHoverMin != oldMin)
            {
                Invalidate();
            }
        }

        private void TitleBar_MouseLeave(object sender, EventArgs e)
        {
            _isHoverClose = false;
            _isHoverMax = false;
            _isHoverMin = false;
            Invalidate();
        }

        private void TitleBar_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                if (CloseButtonRect.Contains(e.Location) ||
                    (_showMaximize && MaxButtonRect.Contains(e.Location)) ||
                    MinButtonRect.Contains(e.Location))
                {
                    // Handled on MouseUp
                    return;
                }

                // Native window drag
                Form parent = this.FindForm();
                if (parent != null)
                {
                    ReleaseCapture();
                    SendMessage(parent.Handle, 0x00A1, (IntPtr)2, IntPtr.Zero);
                }
            }
        }

        private void TitleBar_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left && _showMaximize)
            {
                if (!CloseButtonRect.Contains(e.Location) &&
                    !MaxButtonRect.Contains(e.Location) &&
                    !MinButtonRect.Contains(e.Location))
                {
                    ToggleMaximizeRestore();
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
                else if (_showMaximize && MaxButtonRect.Contains(e.Location))
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
            }
        }

        private void ToggleMaximizeRestore()
        {
            Form parent = this.FindForm();
            if (parent != null)
            {
                parent.WindowState = (parent.WindowState == FormWindowState.Maximized)
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
                Invalidate();
            }
        }

        private Image GetAppIcon()
        {
            if (_cachedIcon != null) return _cachedIcon;
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string[] candidates = new string[]
                {
                    Path.Combine(baseDir, "src_Book Forge by Max", "app.png"),
                    Path.Combine(baseDir, "src_BookForge", "app.png"),
                    Path.Combine(baseDir, "app.png")
                };

                foreach (string p in candidates)
                {
                    if (File.Exists(p))
                    {
                        using (Bitmap bmp = new Bitmap(p))
                        {
                            _cachedIcon = new Bitmap(bmp, 18, 18);
                            return _cachedIcon;
                        }
                    }
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
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = _theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();

            // 1. Background
            using (SolidBrush bgBrush = new SolidBrush(t.BgPrimary))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            // 2. App Icon (18x18, Y-centered)
            Image appIcon = GetAppIcon();
            if (appIcon != null)
            {
                g.DrawImage(appIcon, 10, (this.Height - 18) / 2, 18, 18);
            }

            // 3. Title Text
            int totalRightButtonsWidth = BTN_WIDTH * (_showMaximize ? 3 : 2);
            using (Font titleFont = new Font("Segoe UI", 9F, FontStyle.Bold))
            {
                Rectangle textRect = new Rectangle(34, 0, Math.Max(0, this.Width - (totalRightButtonsWidth + 38)), this.Height);
                TextRenderer.DrawText(g, _titleText, titleFont, textRect, t.TextPrimary,
                    TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine | TextFormatFlags.NoPrefix);
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

            // 5. Maximize / Restore Button (if enabled)
            if (_showMaximize)
            {
                Rectangle maxRect = MaxButtonRect;
                if (_isHoverMax)
                {
                    using (SolidBrush hoverBrush = new SolidBrush(t.BgElevated))
                    {
                        g.FillRectangle(hoverBrush, maxRect);
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
                        int rx = maxRect.X + (maxRect.Width - 10) / 2;
                        int ry = maxRect.Y + (maxRect.Height - 10) / 2;
                        // Back square
                        g.DrawRectangle(maxPen, rx + 2, ry, 7, 7);
                        // Front square (filled bg to occlude back square line)
                        using (SolidBrush frontFill = new SolidBrush(_isHoverMax ? t.BgElevated : t.BgPrimary))
                        {
                            g.FillRectangle(frontFill, rx, ry + 2, 8, 8);
                        }
                        g.DrawRectangle(maxPen, rx, ry + 2, 7, 7);
                    }
                    else
                    {
                        // Maximize icon: single square (9x9)
                        int mx = maxRect.X + (maxRect.Width - 10) / 2;
                        int my = maxRect.Y + (maxRect.Height - 10) / 2;
                        g.DrawRectangle(maxPen, mx, my, 9, 9);
                    }
                }
            }

            // 6. Close Button
            Rectangle closeRect = CloseButtonRect;
            Color closeFg = _isRunning ? Color.FromArgb(70, t.TextSecondary) : t.TextSecondary;
            if (!_isRunning && _isHoverClose)
            {
                // Windows 11 accent red hover
                using (SolidBrush closeHoverBrush = new SolidBrush(Color.FromArgb(232, 17, 35)))
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
