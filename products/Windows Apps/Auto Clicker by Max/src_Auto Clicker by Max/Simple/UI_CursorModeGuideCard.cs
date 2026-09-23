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
        private Label lblTip;

        public CursorModeGuideCard(ThemeTokens theme)
        {
            theme = theme ?? ThemeTokens.DarkTheme();
            this.BorderRadius = theme.RadiusMd;
            this.BorderSize = 1;
            this.Size = new Size(168, 306);
            this.Padding = new Padding(8);

            // 1. Warning Badge
            lblBadge = new Label
            {
                Text = Loc.CursorGuideBadge,
                Location = new Point(8, 12),
                Size = new Size(152, 20),
                Font = ThemeTokens.FontSegoe(12F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };

            // 2. Mode Title
            lblTitle = new Label
            {
                Text = Loc.CursorGuideTitle,
                Location = new Point(8, 36),
                Size = new Size(152, 20),
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };

            // 3. Warning Description
            lblDesc = new Label
            {
                Text = Loc.CursorGuideDesc,
                Location = new Point(8, 62),
                Size = new Size(152, 95),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Regular),
                TextAlign = ContentAlignment.TopLeft
            };

            // 4. Highlighted Hotkey Box
            pnlHotkeyBox = new RoundedPanel
            {
                Location = new Point(8, 164),
                Size = new Size(152, 70),
                BorderRadius = theme.RadiusSm,
                BorderSize = 0
            };

            lblHotkeyKey = new Label
            {
                Text = Loc.CursorGuideHotkeyKey,
                Location = new Point(4, 8),
                Size = new Size(144, 18),
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };

            lblHotkeyDesc = new Label
            {
                Text = Loc.CursorGuideHotkeyDesc,
                Location = new Point(6, 28),
                Size = new Size(140, 36),
                Font = ThemeTokens.FontSegoe(10F, FontStyle.Regular),
                TextAlign = ContentAlignment.TopCenter
            };

            pnlHotkeyBox.Controls.AddRange(new Control[] { lblHotkeyKey, lblHotkeyDesc });

            // 5. Bottom Tip
            lblTip = new Label
            {
                Text = Loc.CursorGuideTip,
                Location = new Point(8, 244),
                Size = new Size(152, 48),
                Font = ThemeTokens.FontSegoe(10F, FontStyle.Regular),
                TextAlign = ContentAlignment.TopLeft
            };

            this.Controls.AddRange(new Control[] {
                lblBadge, lblTitle, lblDesc,
                pnlHotkeyBox, lblTip
            });

            ApplyTheme(theme);
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        public void ApplyLanguage()
        {
            if (lblBadge != null) lblBadge.Text = Loc.CursorGuideBadge;
            if (lblTitle != null) lblTitle.Text = Loc.CursorGuideTitle;
            if (lblDesc != null) lblDesc.Text = Loc.CursorGuideDesc;
            if (lblHotkeyKey != null) lblHotkeyKey.Text = Loc.CursorGuideHotkeyKey;
            if (lblHotkeyDesc != null) lblHotkeyDesc.Text = Loc.CursorGuideHotkeyDesc;
            if (lblTip != null) lblTip.Text = Loc.CursorGuideTip;
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

            lblTip.ForeColor = t.TextTertiary;

            this.Invalidate();
        }
    }
}
