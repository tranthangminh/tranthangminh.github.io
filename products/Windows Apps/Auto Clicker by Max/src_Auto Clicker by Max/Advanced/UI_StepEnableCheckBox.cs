using MaxApp.Common;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    /// <summary>
    /// The enable/disable check box of a step row, painted in the step's action colour instead of the system blue.
    /// Checked: filled box in the action colour with a check mark in the page background colour.
    /// Unchecked: grey outline only (outline turns to the action colour on hover).
    /// </summary>
    public class StepEnableCheckBox : CheckBox
    {
        private const int BoxSize = 14;
        private Color _checkColor = Color.White;
        private ThemeTokens _theme = ThemeTokens.DarkTheme();
        private bool _isHovered;

        public StepEnableCheckBox()
        {
            SetStyle(ControlStyles.UserPaint |
                     ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.ResizeRedraw, true);
        }

        public void SetColors(Color checkColor, ThemeTokens theme)
        {
            ThemeTokens newTheme = theme ?? ThemeTokens.DarkTheme();
            if (_checkColor == checkColor && _theme == newTheme) return;
            _checkColor = checkColor;
            _theme = newTheme;
            Invalidate();
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            _isHovered = true;
            Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _isHovered = false;
            Invalidate();
        }

        protected override void OnEnabledChanged(EventArgs e)
        {
            base.OnEnabledChanged(e);
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            // The row's own background shows through: a selected row has a semi-transparent tint that a plain fill cannot reproduce
            ButtonRenderer.DrawParentBackground(g, this.ClientRectangle, this);
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle box = new Rectangle((this.Width - BoxSize) / 2, (this.Height - BoxSize) / 2, BoxSize - 1, BoxSize - 1);
            int alpha = this.Enabled ? 255 : 110;

            using (GraphicsPath path = GraphicsHelper.GetRoundedRectangle(box, 3))
            {
                if (this.Checked)
                {
                    using (SolidBrush fill = new SolidBrush(Color.FromArgb(alpha, _checkColor)))
                    {
                        g.FillPath(fill, path);
                    }
                    using (Pen tick = new Pen(Color.FromArgb(alpha, _theme.BgPrimary), 2f))
                    {
                        tick.StartCap = LineCap.Round;
                        tick.EndCap = LineCap.Round;
                        tick.LineJoin = LineJoin.Round;
                        g.DrawLines(tick, new PointF[]
                        {
                            new PointF(box.X + 3.5f, box.Y + 7f),
                            new PointF(box.X + 5.8f, box.Y + 9.5f),
                            new PointF(box.X + 10f, box.Y + 4f)
                        });
                    }
                }
                else
                {
                    Color outline = (_isHovered && this.Enabled) ? _checkColor : _theme.TextTertiary;
                    using (Pen border = new Pen(Color.FromArgb(alpha, outline), 1.5f))
                    {
                        g.DrawPath(border, path);
                    }
                }
            }
        }
    }
}
