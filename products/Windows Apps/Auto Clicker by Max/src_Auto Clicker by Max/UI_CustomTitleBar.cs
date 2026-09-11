using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using ModernAutoClicker.Info;

namespace ModernAutoClicker
{
    public class CustomTitleBar : Panel
    {
        private ThemeTokens _theme;
        private string _titleText = "Auto Clicker by Max v1.0";
        private bool _isHoverClose = false;
        private bool _isHoverMin = false;
        private bool _isRunning = false;

        private const int BTN_WIDTH = 44;
        private const int TITLE_HEIGHT = 32;

        public event Action OnCloseRequested;
        public event Action OnMinimizeRequested;

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

        private Rectangle CloseButtonRect
        {
            get { return new Rectangle(this.Width - BTN_WIDTH, 0, BTN_WIDTH, this.Height); }
        }

        private Rectangle MinButtonRect
        {
            get { return new Rectangle(this.Width - BTN_WIDTH * 2, 0, BTN_WIDTH, this.Height); }
        }

        private void TitleBar_MouseMove(object sender, MouseEventArgs e)
        {
            bool oldClose = _isHoverClose;
            bool oldMin = _isHoverMin;

            _isHoverClose = !_isRunning && CloseButtonRect.Contains(e.Location);
            _isHoverMin = MinButtonRect.Contains(e.Location);

            if (_isHoverClose != oldClose || _isHoverMin != oldMin)
            {
                Invalidate();
            }
        }

        private void TitleBar_MouseLeave(object sender, EventArgs e)
        {
            _isHoverClose = false;
            _isHoverMin = false;
            Invalidate();
        }

        private void TitleBar_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                if (CloseButtonRect.Contains(e.Location))
                {
                    // Handled on MouseUp / Click
                    return;
                }
                if (MinButtonRect.Contains(e.Location))
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

            // 2. App Icon (18x18)
            Image appIcon = SvgFileRenderer.GetAppIconImage(18);
            if (appIcon != null)
            {
                g.DrawImage(appIcon, 10, (this.Height - 18) / 2, 18, 18);
            }

            // 3. Title Text (Vertically Centered across full bar height)
            using (Font titleFont = new Font("Segoe UI", 9F, FontStyle.Bold))
            {
                Rectangle textRect = new Rectangle(34, 0, this.Width - (BTN_WIDTH * 2 + 38), this.Height);
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

            // 5. Close Button
            Rectangle closeRect = CloseButtonRect;
            Color closeFg = _isRunning ? Color.FromArgb(70, t.TextSecondary) : t.TextSecondary;
            if (!_isRunning && _isHoverClose)
            {
                // Modern Windows 11 red hover
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
