using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Simple
{
    public class CursorModeGuideCard : RoundedPanel
    {
        private Label lblBadge;
        private Label lblTitle;
        private Label lblDesc;
        private RoundedPanel pnlHotkeyBox;
        private Label lblHotkeyKey;
        private Label lblHotkeyDesc;

        public CursorModeGuideCard(ThemeTokens theme)
        {
            theme = theme ?? ThemeTokens.DarkTheme();
            this.BorderRadius = theme.RadiusMd;
            this.BorderSize = 1;
            this.Size = new Size(168, 276);
            this.Padding = new Padding(8);

            // 1. Warning Badge
            lblBadge = new Label
            {
                Text = Loc.CursorGuideBadge,
                Location = new Point(8, 8),
                Size = new Size(152, 18),
                Font = ThemeTokens.FontButton(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };

            // 2. Mode Title
            lblTitle = new Label
            {
                Text = Loc.CursorGuideTitle,
                Location = new Point(8, 28),
                Size = new Size(152, 18),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };

            // 3. Warning Description
            lblDesc = new Label
            {
                Text = Loc.CursorGuideDesc,
                Location = new Point(8, 50),
                Size = new Size(152, 80),
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.TopLeft
            };

            // 4. Highlighted Hotkey Box
            pnlHotkeyBox = new RoundedPanel
            {
                Location = new Point(8, 134),
                Size = new Size(152, 64),
                BorderRadius = theme.RadiusSm,
                BorderSize = 0
            };

            lblHotkeyKey = new Label
            {
                Text = Loc.CursorGuideHotkeyKey,
                Location = new Point(4, 6),
                Size = new Size(144, 18),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };

            lblHotkeyDesc = new Label
            {
                Text = Loc.CursorGuideHotkeyDesc,
                Location = new Point(6, 26),
                Size = new Size(140, 32),
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.TopCenter
            };

            pnlHotkeyBox.Controls.AddRange(new Control[] { lblHotkeyKey, lblHotkeyDesc });

            this.Controls.AddRange(new Control[] {
                lblBadge, lblTitle, lblDesc,
                pnlHotkeyBox
            });

            ApplyTheme(theme);
            LayoutContent();
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        public void ApplyLanguage()
        {
            if (lblBadge != null) lblBadge.Text = Loc.CursorGuideBadge;
            if (lblTitle != null) lblTitle.Text = Loc.CursorGuideTitle;
            if (lblDesc != null) lblDesc.Text = Loc.CursorGuideDesc;
            if (lblHotkeyKey != null) lblHotkeyKey.Text = Loc.CursorGuideHotkeyKey;
            if (lblHotkeyDesc != null) lblHotkeyDesc.Text = Loc.CursorGuideHotkeyDesc;
            LayoutContent();
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            LayoutContent();
        }

        // Each block is as tall as its text needs in the current language, stacked from the top,
        // so the card fits the space under the list buttons
        private void LayoutContent()
        {
            if (pnlHotkeyBox == null) return;
            const int Inset = 8, Gap = 6;
            int w = this.Width - Inset * 2;

            int y = PlaceLabel(lblBadge, Inset, Inset, w);
            y = PlaceLabel(lblTitle, Inset, y + 2, w);
            y = PlaceLabel(lblDesc, Inset, y + Gap, w);

            int boxW = w;
            PlaceLabel(lblHotkeyKey, 4, 6, boxW - 8);
            int keyBottom = PlaceLabel(lblHotkeyDesc, 6, lblHotkeyKey.Bottom + 2, boxW - 12);
            pnlHotkeyBox.Location = new Point(Inset, y + Gap);
            pnlHotkeyBox.Size = new Size(boxW, keyBottom + 6);
        }

        private static int PlaceLabel(Label label, int x, int y, int width)
        {
            Size need = TextRenderer.MeasureText(label.Text, label.Font, new Size(width, int.MaxValue), TextFormatFlags.WordBreak);
            label.Location = new Point(x, y);
            label.Size = new Size(width, need.Height);
            return label.Bottom;
        }

        public void ApplyTheme(ThemeTokens t)
        {
            if (t == null) return;

            this.BackColor = t.BgTertiary;
            this.BorderColor = t.Warning;

            lblBadge.ForeColor = t.Danger;
            lblTitle.ForeColor = t.TextPrimary;
            lblDesc.ForeColor = t.TextSecondary;

            pnlHotkeyBox.BackColor = t.HotkeyBoxBg;
            lblHotkeyKey.ForeColor = t.HotkeyBoxText;
            lblHotkeyDesc.ForeColor = t.TextPrimary;


            this.Invalidate();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                Loc.OnLanguageChanged -= ApplyLanguage;
            }
            base.Dispose(disposing);
        }
    }
}
