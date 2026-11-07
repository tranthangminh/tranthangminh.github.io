using System;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    /// <summary>
    /// RoundedButton with an icon drawn right next to its text, the pair centred as one group.
    /// RoundedButton (Common, read-only) pins its image to the left edge and centres the text in the remaining space,
    /// which leaves a wide gap on wide buttons. Here the base paints background, border and subtitle only
    /// (its text is hidden during that call) and this class draws icon + text itself.
    /// </summary>
    public class IconTextButton : RoundedButton
    {
        private const int IconTextGap = 5;
        private Image _icon;
        private bool _isPaintingBase;

        public Image Icon
        {
            get { return _icon; }
            set
            {
                _icon = value;
                Invalidate();
            }
        }

        // Hidden from the base paint so it does not draw the text a second time
        public override string Text
        {
            get { return _isPaintingBase ? string.Empty : base.Text; }
            set { base.Text = value; }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            _isPaintingBase = true;
            try
            {
                base.OnPaint(e);
            }
            finally
            {
                _isPaintingBase = false;
            }

            Graphics g = e.Graphics;
            string text = this.Text ?? string.Empty;

            // Same text band as RoundedButton: with a subtitle the caption sits in the top 20px of a 36px block
            RectangleF band = new RectangleF(0, 0, this.Width, this.Height);
            if (!string.IsNullOrEmpty(this.Subtitle))
            {
                float startY = Math.Max(2f, (this.Height - 36f) / 2f);
                band = new RectangleF(0, startY, this.Width, 20f);
            }

            int iconSize = (_icon != null) ? Math.Min(16, _icon.Width) : 0;
            float textW = string.IsNullOrEmpty(text) ? 0f : g.MeasureString(text, this.Font).Width;
            float groupW = iconSize + (iconSize > 0 && textW > 0 ? IconTextGap : 0) + textW;
            float x = Math.Max(4f, (this.Width - groupW) / 2f);

            if (_icon != null)
            {
                int iconY = (int)(band.Y + (band.Height - iconSize) / 2f);
                g.DrawImage(_icon, new Rectangle((int)x, iconY, iconSize, iconSize));
                x += iconSize + IconTextGap;
            }

            if (textW > 0)
            {
                Color fore = this.IsDisabled ? Color.FromArgb(100, this.ForeColor) : this.ForeColor;
                using (SolidBrush brush = new SolidBrush(fore))
                using (StringFormat sf = new StringFormat
                {
                    Alignment = StringAlignment.Near,
                    LineAlignment = StringAlignment.Center,
                    Trimming = StringTrimming.EllipsisCharacter,
                    FormatFlags = StringFormatFlags.NoWrap
                })
                {
                    g.DrawString(text, this.Font, brush, new RectangleF(x, band.Y, Math.Max(0f, this.Width - x - 4f), band.Height), sf);
                }
            }
        }
    }
}
