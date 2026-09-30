using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Advanced
{
    public class AdvancedHotkeyCard : RoundedPanel
    {
        private Label lblHelp1;
        private Label lblHelpVal1;
        private Label lblHelp2;
        private Label lblHelpVal2;
        private Label lblHelp3;
        private Label lblHelpVal3;

        private Label lblTip1;
        private Label lblTip2;
        private ThemeTokens _theme;

        public AdvancedHotkeyCard(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();
            this.BorderRadius = _theme.RadiusMd;
            this.BorderSize = 0;
            this.Size = new Size(408, 74);

            // Left Section: Hotkeys
            lblHelp1 = CreateKeyLabel("[F6]", 6, 8);
            lblHelpVal1 = CreateTextLabel(Loc.HotkeyAdvF6, 60, 8);

            lblHelp2 = CreateKeyLabel("[F7]", 6, 30);
            lblHelpVal2 = CreateTextLabel(Loc.HotkeyAdvF7, 60, 30);

            lblHelp3 = CreateKeyLabel("[SPACE]", 6, 52);
            lblHelpVal3 = CreateTextLabel(Loc.HotkeyAdvSpace, 60, 52);

            // Right Section: Usage Tips
            lblTip1 = CreateTextLabel(Loc.HotkeyAdvTip1, 148, 15);
            lblTip2 = CreateTextLabel(Loc.HotkeyAdvTip2, 148, 41);

            this.Controls.AddRange(new Control[] {
                lblHelp1, lblHelpVal1,
                lblHelp2, lblHelpVal2,
                lblHelp3, lblHelpVal3,
                lblTip1, lblTip2
            });

            this.Paint += AdvancedHotkeyCard_Paint;
            ApplyTheme(theme);
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        public void ApplyLanguage()
        {
            if (lblHelpVal1 != null) lblHelpVal1.Text = Loc.HotkeyAdvF6;
            if (lblHelpVal2 != null) lblHelpVal2.Text = Loc.HotkeyAdvF7;
            if (lblHelpVal3 != null) lblHelpVal3.Text = Loc.HotkeyAdvSpace;
            if (lblTip1 != null) lblTip1.Text = Loc.HotkeyAdvTip1;
            if (lblTip2 != null) lblTip2.Text = Loc.HotkeyAdvTip2;
        }

        private void AdvancedHotkeyCard_Paint(object sender, PaintEventArgs e)
        {
            // Subtle vertical separator between hotkeys and tips
            Color divColor = _theme != null ? _theme.BorderColor : Color.FromArgb(40, 255, 255, 255);
            using (Pen pen = new Pen(divColor, 1))
            {
                e.Graphics.DrawLine(pen, 138, 8, 138, 66);
            }
        }

        private Label CreateKeyLabel(string text, int x, int y, int width = 50, int height = 15)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(width, height),
                AutoSize = false,
                TextAlign = ContentAlignment.TopRight,
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
        }

        private Label CreateTextLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
        }

        public void ApplyTheme(ThemeTokens t)
        {
            if (t == null) return;
            _theme = t;
            this.BackColor = t.HotkeyBoxBg;
            this.BorderRadius = t.RadiusMd;

            if (lblHelp1 != null) lblHelp1.ForeColor = t.HotkeyBoxText;
            if (lblHelp2 != null) lblHelp2.ForeColor = t.HotkeyBoxText;
            if (lblHelp3 != null) lblHelp3.ForeColor = t.HotkeyBoxText;
            if (lblHelpVal1 != null) lblHelpVal1.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;
            if (lblHelpVal2 != null) lblHelpVal2.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;
            if (lblHelpVal3 != null) lblHelpVal3.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;

            if (lblTip1 != null) lblTip1.ForeColor = t.TextSecondary;
            if (lblTip2 != null) lblTip2.ForeColor = t.TextSecondary;

            this.Invalidate();
        }
    }
}
