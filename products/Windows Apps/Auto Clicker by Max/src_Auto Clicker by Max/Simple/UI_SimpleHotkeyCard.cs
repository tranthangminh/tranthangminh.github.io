using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker
{
    public class SimpleHotkeyCard : RoundedPanel
    {
        private Label lblHelp1;
        private Label lblHelpVal1;
        private Label lblHelp2;
        private Label lblHelpVal2;
        private Label lblHelp3;
        private Label lblHelpVal3;

        public SimpleHotkeyCard(ThemeTokens theme)
        {
            theme = theme ?? ThemeTokens.DarkTheme();
            this.BorderRadius = theme.RadiusMd;
            this.BorderSize = 0;
            this.Size = new Size(224, 74);

            lblHelp1 = CreateKeyLabel("[F6]", 8, 8);
            lblHelpVal1 = CreateTextLabel(Loc.HotkeySimpleF6, 54, 8);

            lblHelp2 = CreateKeyLabel("[F7]", 8, 30);
            lblHelpVal2 = CreateTextLabel(Loc.HotkeySimpleF7, 54, 30);

            lblHelp3 = CreateKeyLabel("[SPACE]", 8, 52);
            lblHelpVal3 = CreateTextLabel(Loc.HotkeySimpleSpace, 64, 52);

            this.Controls.AddRange(new Control[] {
                lblHelp1, lblHelpVal1,
                lblHelp2, lblHelpVal2,
                lblHelp3, lblHelpVal3
            });

            ApplyTheme(theme);
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        public void ApplyLanguage()
        {
            if (lblHelpVal1 != null) lblHelpVal1.Text = Loc.HotkeySimpleF6;
            if (lblHelpVal2 != null) lblHelpVal2.Text = Loc.HotkeySimpleF7;
            if (lblHelpVal3 != null) lblHelpVal3.Text = Loc.HotkeySimpleSpace;
        }

        private Label CreateKeyLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold)
            };
        }

        private Label CreateTextLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Regular)
            };
        }

        public void ApplyTheme(ThemeTokens t)
        {
            if (t == null) return;
            this.BackColor = t.HotkeyBoxBg;
            this.BorderRadius = t.RadiusMd;

            if (lblHelp1 != null) lblHelp1.ForeColor = t.HotkeyBoxText;
            if (lblHelp2 != null) lblHelp2.ForeColor = t.HotkeyBoxText;
            if (lblHelp3 != null) lblHelp3.ForeColor = t.HotkeyBoxText;
            if (lblHelpVal1 != null) lblHelpVal1.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;
            if (lblHelpVal2 != null) lblHelpVal2.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;
            if (lblHelpVal3 != null) lblHelpVal3.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;

            this.Invalidate();
        }
    }
}
