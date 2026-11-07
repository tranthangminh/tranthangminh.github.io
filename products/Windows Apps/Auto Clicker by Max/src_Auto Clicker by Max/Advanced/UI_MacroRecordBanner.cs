using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    /// <summary>
    /// Step Record banner for Asian Mode.
    /// Rendered with dashed border, 3x step height (~90px),
    /// and interactive visual states for Idle and Recording.
    /// Clicking triggers Start / Stop Action Recording.
    /// </summary>
    public class MacroRecordBanner : Control
    {
        private ThemeTokens _theme;
        private bool _isHovered = false;
        private bool _isPulsing = false;
        private System.Windows.Forms.Timer _pulseTimer;

        public event Action OnRecordToggleRequested;

        public MacroRecordBanner()
        {
            this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                           ControlStyles.UserPaint |
                           ControlStyles.OptimizedDoubleBuffer |
                           ControlStyles.ResizeRedraw, true);

            this.DoubleBuffered = true;
            this.Cursor = Cursors.Hand;
            this.Height = 88;

            _theme = ThemeTokens.DarkTheme();

            _pulseTimer = new System.Windows.Forms.Timer();
            _pulseTimer.Interval = 500;
            _pulseTimer.Tick += (s, e) =>
            {
                if (ActionRecorder.Instance.IsRecording)
                {
                    _isPulsing = !_isPulsing;
                    this.Invalidate();
                }
            };

            ActionRecorder.Instance.OnRecordingStateChanged += (isRec) =>
            {
                if (isRec)
                {
                    _isPulsing = true;
                    _pulseTimer.Start();
                }
                else
                {
                    _pulseTimer.Stop();
                    _isPulsing = false;
                }
                this.Invalidate();
            };

            ActionRecorder.Instance.OnActionCaptured += (step) =>
            {
                this.Invalidate();
            };
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();
            this.Invalidate();
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            _isHovered = true;
            this.Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _isHovered = false;
            this.Invalidate();
        }

        protected override void OnClick(EventArgs e)
        {
            base.OnClick(e);
            if (OnRecordToggleRequested != null)
            {
                OnRecordToggleRequested();
            }
            else
            {
                ActionRecorder.Instance.ToggleRecording();
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();
            bool isRec = ActionRecorder.Instance.IsRecording;
            int count = ActionRecorder.Instance.RecordedCount;

            Rectangle rect = new Rectangle(4, 4, this.Width - 9, this.Height - 9);
            if (rect.Width <= 10 || rect.Height <= 10) return;

            int radius = 8;

            // 1. Fill Background: a red tint while recording (pulsing), derived from the theme so it also works in light mode
            Color bgColor = isRec
                ? Blend(t.BgSecondary, t.Danger, _isPulsing ? 0.22 : 0.12)
                : t.BgSecondary;

            using (GraphicsPath path = GetRoundedRectangle(rect, radius))
            using (SolidBrush bgBrush = new SolidBrush(bgColor))
            {
                g.FillPath(bgBrush, path);
            }

            // 2. Border: dashed "drop zone" style when idle, solid red while recording so the state reads at a glance
            Color borderColor = isRec ? t.Danger : (_isHovered ? t.Danger : t.BorderColor);
            using (GraphicsPath path = GetRoundedRectangle(rect, radius))
            using (Pen borderPen = new Pen(borderColor, isRec ? 2f : 1.5f))
            {
                if (!isRec)
                {
                    borderPen.DashStyle = DashStyle.Custom;
                    borderPen.DashPattern = new float[] { 5, 4 };
                }
                g.DrawPath(borderPen, path);
            }

            // 3. Layout Icon, Text, and Pill Badge
            int iconX = rect.Left + 18;
            int iconY = rect.Top + (rect.Height / 2) - 10;
            int iconSize = 20;

            // Record Dot Icon
            if (isRec)
            {
                // Pulsing glowing red dot with outer ring
                using (Pen ringPen = new Pen(Color.FromArgb(120, t.Danger), 2f))
                {
                    g.DrawEllipse(ringPen, iconX - 3, iconY - 3, iconSize + 6, iconSize + 6);
                }
                using (SolidBrush dotBrush = new SolidBrush(t.Danger))
                {
                    g.FillEllipse(dotBrush, iconX, iconY, iconSize, iconSize);
                }
            }
            else
            {
                // Idle: solid red record dot
                using (SolidBrush dotBrush = new SolidBrush(t.Danger))
                {
                    g.FillEllipse(dotBrush, iconX + 2, iconY + 2, iconSize - 4, iconSize - 4);
                }
            }

            // Text section
            int textX = iconX + iconSize + 14;
            int rightBadgeW = 136;
            int maxTextW = rect.Width - (textX - rect.Left) - rightBadgeW - 10;

            using (Font titleFont = ThemeTokens.FontBase(FontStyle.Bold))
            using (Font subFont = ThemeTokens.FontSmall(FontStyle.Regular))
            {
                string titleText;
                Color titleColor;
                string subText;
                Color subColor;

                if (isRec)
                {
                    titleText = Loc.RecordActiveTitle(count);
                    titleColor = t.Danger;
                    subText = Loc.RecordActiveSub;
                    subColor = t.TextPrimary;
                }
                else
                {
                    titleText = Loc.RecordIdleTitle;
                    titleColor = t.TextPrimary;
                    subText = Loc.RecordIdleSub;
                    subColor = t.TextTertiary;
                }

                using (StringFormat sf = new StringFormat { Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap })
                using (SolidBrush tb = new SolidBrush(titleColor))
                {
                    g.DrawString(titleText, titleFont, tb, new RectangleF(textX, rect.Top + 20, Math.Max(50, maxTextW), 24), sf);
                }
                using (StringFormat sf = new StringFormat { Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap })
                using (SolidBrush sb = new SolidBrush(subColor))
                {
                    g.DrawString(subText, subFont, sb, new RectangleF(textX, rect.Top + 46, Math.Max(50, maxTextW), 22), sf);
                }
            }

            // 4. Right Side Pill Badge (Styled exactly like Image 1)
            int badgeW = 124;
            int badgeH = 30;
            int badgeX = rect.Right - badgeW - 14;
            int badgeY = rect.Top + (rect.Height - badgeH) / 2;
            Rectangle badgeRect = new Rectangle(badgeX, badgeY, badgeW, badgeH);

            // The button is always red so it reads as "record"; hover deepens it
            Color pillBg = (_isHovered || isRec) ? t.CRed : t.Danger;
            Color pillFg = Color.White;
            string pillText = isRec ? Loc.RecordActiveButton : Loc.RecordIdleButton;

            using (GraphicsPath pillPath = GetRoundedRectangle(badgeRect, 6))
            using (SolidBrush pillBrush = new SolidBrush(pillBg))
            {
                g.FillPath(pillBrush, pillPath);
            }

            using (Font badgeFont = ThemeTokens.FontBase(FontStyle.Bold))
            using (SolidBrush textBrush = new SolidBrush(pillFg))
            {
                SizeF sz = g.MeasureString(pillText, badgeFont);
                int iconD = 8;
                int totalContentW = iconD + 8 + (int)sz.Width;
                int startX = badgeX + (badgeW - totalContentW) / 2;
                int contentY = badgeY + (badgeH - (int)sz.Height) / 2;
                int iconYPos = badgeY + (badgeH - iconD) / 2;

                if (isRec)
                {
                    // Draw small square stop symbol
                    g.FillRectangle(textBrush, startX, iconYPos, iconD, iconD);
                }
                else
                {
                    // Draw small circular record dot symbol
                    g.FillEllipse(textBrush, startX, iconYPos, iconD, iconD);
                }

                g.DrawString(pillText, badgeFont, textBrush, startX + iconD + 8, contentY);
            }
        }

        private static Color Blend(Color baseColor, Color tint, double amount)
        {
            return Color.FromArgb(
                (int)(baseColor.R + (tint.R - baseColor.R) * amount),
                (int)(baseColor.G + (tint.G - baseColor.G) * amount),
                (int)(baseColor.B + (tint.B - baseColor.B) * amount));
        }

        private static GraphicsPath GetRoundedRectangle(Rectangle bounds, int radius)
        {
            return GraphicsHelper.GetRoundedRectangle(bounds, radius);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_pulseTimer != null)
                {
                    _pulseTimer.Stop();
                    _pulseTimer.Dispose();
                    _pulseTimer = null;
                }
            }
            base.Dispose(disposing);
        }
    }
}
