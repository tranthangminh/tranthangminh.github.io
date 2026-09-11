using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace BookForge
{
    public class ModernScrollBar : Control
    {
        private int _minimum = 0;
        private int _maximum = 100;
        private int _value = 0;
        private int _largeChange = 10;
        private int _smallChange = 10;

        private Color _trackColor = Color.FromArgb(25, 25, 25);
        private Color _thumbColor = Color.FromArgb(52, 52, 52);
        private Color _thumbHoverColor = Color.FromArgb(70, 70, 70);

        private bool _isDragging = false;
        private bool _isHovered = false;
        private int _dragStartMouseY = 0;
        private int _dragStartThumbY = 0;

        public event EventHandler Scroll;
        public event Action<int> ValueChanged;

        public int Minimum
        {
            get { return _minimum; }
            set { _minimum = value; Invalidate(); }
        }

        public int Maximum
        {
            get { return _maximum; }
            set
            {
                _maximum = Math.Max(_minimum, value);
                Value = Math.Min(_value, MaxScrollValue);
                Invalidate();
            }
        }

        public int LargeChange
        {
            get { return _largeChange; }
            set
            {
                _largeChange = Math.Max(1, value);
                Value = Math.Min(_value, MaxScrollValue);
                Invalidate();
            }
        }

        public int SmallChange
        {
            get { return _smallChange; }
            set { _smallChange = Math.Max(1, value); }
        }

        public int MaxScrollValue
        {
            get { return Math.Max(_minimum, _maximum - _largeChange); }
        }

        public int Value
        {
            get { return _value; }
            set
            {
                int clamped = Math.Max(_minimum, Math.Min(MaxScrollValue, value));
                if (_value != clamped)
                {
                    _value = clamped;
                    Invalidate();
                    if (Scroll != null) Scroll(this, EventArgs.Empty);
                    if (ValueChanged != null) ValueChanged(_value);
                }
            }
        }

        public Color TrackColor
        {
            get { return _trackColor; }
            set { _trackColor = value; Invalidate(); }
        }

        public Color ThumbColor
        {
            get { return _thumbColor; }
            set { _thumbColor = value; Invalidate(); }
        }

        public Color ThumbHoverColor
        {
            get { return _thumbHoverColor; }
            set { _thumbHoverColor = value; Invalidate(); }
        }

        public ModernScrollBar()
        {
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);
            this.Width = 8;
            this.Cursor = Cursors.Default;
        }

        private Rectangle GetThumbRectangle()
        {
            int pad = 1;
            int availH = this.Height - 2 * pad;
            if (availH <= 0 || _maximum <= _minimum) return Rectangle.Empty;

            int valRange = MaxScrollValue - _minimum;
            int thumbH = Math.Max(20, (int)((float)_largeChange / _maximum * availH));
            if (thumbH > availH) thumbH = availH;

            int trackRange = availH - thumbH;
            int thumbY = pad;
            if (valRange > 0 && trackRange > 0)
            {
                thumbY = pad + (int)((float)(_value - _minimum) / valRange * trackRange);
            }

            return new Rectangle(pad, thumbY, Math.Max(2, this.Width - 2 * pad), thumbH);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // 1. Draw Track (bg primary)
            using (SolidBrush trackBrush = new SolidBrush(_trackColor))
            {
                g.FillRectangle(trackBrush, this.ClientRectangle);
            }

            // 2. Draw Thumb (bg tertiary / hover bg elevated)
            if (_maximum > _largeChange)
            {
                Rectangle thumbRect = GetThumbRectangle();
                if (thumbRect.Width > 0 && thumbRect.Height > 0)
                {
                    Color currentThumb = (_isDragging || _isHovered) ? _thumbHoverColor : _thumbColor;
                    using (SolidBrush thumbBrush = new SolidBrush(currentThumb))
                    {
                        using (GraphicsPath path = CreateRoundedRectangle(thumbRect, Math.Min(3, thumbRect.Width / 2)))
                        {
                            g.FillPath(thumbBrush, path);
                        }
                    }
                }
            }
        }

        private GraphicsPath CreateRoundedRectangle(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            if (radius <= 0)
            {
                path.AddRectangle(rect);
                return path;
            }
            int diameter = radius * 2;
            Rectangle arcRect = new Rectangle(rect.Location, new Size(diameter, diameter));

            path.AddArc(arcRect, 180, 90);
            arcRect.X = rect.Right - diameter;
            path.AddArc(arcRect, 270, 90);
            arcRect.Y = rect.Bottom - diameter;
            path.AddArc(arcRect, 0, 90);
            arcRect.X = rect.Left;
            path.AddArc(arcRect, 90, 90);
            path.CloseFigure();
            return path;
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left && _maximum > _largeChange)
            {
                Rectangle thumbRect = GetThumbRectangle();
                if (thumbRect.Contains(e.Location))
                {
                    _isDragging = true;
                    _dragStartMouseY = e.Y;
                    _dragStartThumbY = thumbRect.Y;
                    Invalidate();
                }
                else if (e.Y < thumbRect.Top)
                {
                    Value -= _largeChange;
                }
                else if (e.Y > thumbRect.Bottom)
                {
                    Value += _largeChange;
                }
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            Rectangle thumbRect = GetThumbRectangle();

            if (_isDragging)
            {
                int pad = 1;
                int availH = this.Height - 2 * pad;
                int thumbH = thumbRect.Height;
                int trackRange = availH - thumbH;
                int valRange = MaxScrollValue - _minimum;

                if (trackRange > 0 && valRange > 0)
                {
                    int deltaY = e.Y - _dragStartMouseY;
                    int newThumbY = _dragStartThumbY + deltaY;
                    newThumbY = Math.Max(pad, Math.Min(pad + trackRange, newThumbY));

                    float ratio = (float)(newThumbY - pad) / trackRange;
                    Value = _minimum + (int)Math.Round(ratio * valRange);
                }
            }
            else
            {
                bool hovered = thumbRect.Contains(e.Location);
                if (_isHovered != hovered)
                {
                    _isHovered = hovered;
                    Invalidate();
                }
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (_isDragging)
            {
                _isDragging = false;
                Invalidate();
            }
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            if (_isHovered)
            {
                _isHovered = false;
                Invalidate();
            }
        }

        public void DoMouseWheel(int delta)
        {
            if (_maximum > _largeChange)
            {
                int ticks = delta / 120;
                Value -= ticks * _smallChange;
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            if (t == null) return;
            _trackColor = t.BgPrimary;
            _thumbColor = t.BgTertiary;
            _thumbHoverColor = t.BgElevated;
            Invalidate();
        }
    }
}
