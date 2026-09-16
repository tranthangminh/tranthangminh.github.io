using System;
using System.Drawing;
using System.Windows.Forms;

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

        public AdvancedHotkeyCard(ThemeTokens theme)
        {
            theme = theme ?? ThemeTokens.DarkTheme();
            this.BorderRadius = theme.RadiusMd;
            this.BorderSize = 0;
            this.Size = new Size(408, 74);

            // Left Section: Hotkeys
            lblHelp1 = CreateKeyLabel("[F6]", 10, 8);
            lblHelpVal1 = CreateTextLabel(": Start / Stop", 46, 8);

            lblHelp2 = CreateKeyLabel("[F7]", 10, 30);
            lblHelpVal2 = CreateTextLabel(": Stop ALL", 46, 30);

            lblHelp3 = CreateKeyLabel("[SPACE]", 10, 52);
            lblHelpVal3 = CreateTextLabel(": Add Step", 58, 52);

            // Right Section: Usage Tips
            lblTip1 = CreateTextLabel("• Multi-select: Hold Ctrl or Shift to select rows", 146, 15);
            lblTip2 = CreateTextLabel("• Batch edit: Click column header to edit rows", 146, 41);

            this.Controls.AddRange(new Control[] {
                lblHelp1, lblHelpVal1,
                lblHelp2, lblHelpVal2,
                lblHelp3, lblHelpVal3,
                lblTip1, lblTip2
            });

            this.Paint += AdvancedHotkeyCard_Paint;
            ApplyTheme(theme);
        }

        private void AdvancedHotkeyCard_Paint(object sender, PaintEventArgs e)
        {
            // Subtle vertical separator between hotkeys and tips
            Color divColor = Color.FromArgb(40, 255, 255, 255);
            using (Pen pen = new Pen(divColor, 1))
            {
                e.Graphics.DrawLine(pen, 136, 8, 136, 66);
            }
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

        private Label CreateTextLabel(string text, int x, int y, float pixelSize = 11F)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(pixelSize, FontStyle.Regular)
            };
        }

        public void ApplyTheme(ThemeTokens t)
        {
            if (t == null) return;
            this.BackColor = t.HotkeyBoxBg;
            this.BorderRadius = t.RadiusMd;

            if (lblHelp1 != null) lblHelp1.ForeColor = t.HotkeyBoxText;
            if (lblHelp2 != null) lblHelp2.ForeColor = t.HotkeyBoxText;
            if (lblHelpVal1 != null) lblHelpVal1.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;
            if (lblHelpVal2 != null) lblHelpVal2.ForeColor = t.IsDark ? t.TextPrimary : t.TextSecondary;

            if (lblTip1 != null) lblTip1.ForeColor = t.IsDark ? Color.FromArgb(220, 225, 235) : t.TextSecondary;
            if (lblTip2 != null) lblTip2.ForeColor = t.IsDark ? Color.FromArgb(220, 225, 235) : t.TextSecondary;

            this.Invalidate();
        }
    }
}
