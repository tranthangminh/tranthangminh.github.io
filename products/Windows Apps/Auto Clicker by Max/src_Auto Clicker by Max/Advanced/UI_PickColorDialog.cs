using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class ModernColorDialog : ModernDialog
    {
        private Color _selectedColor;
        private int _tolerance;

        private Panel pnlPreview;
        private ModernTextBox txtHex;
        private NumberInput numTolerance;
        private RoundedButton btnPickScreen;
        private RoundedButton btnSystemPalette;

        public Color SelectedColor { get { return _selectedColor; } }
        public string ColorHex { get { return string.Format("#{0:X2}{1:X2}{2:X2}", _selectedColor.R, _selectedColor.G, _selectedColor.B); } }
        public int Tolerance { get { return _tolerance; } }

        public ModernColorDialog(Color initialColor, int initialTolerance, ThemeTokens theme)
            : base(Loc.ColorDialogTitle, theme)
        {
            _selectedColor = initialColor;
            _tolerance = Math.Max(0, Math.Min(255, initialTolerance));

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            // 1. Color Preview Swatch (Left Top)
            pnlPreview = new Panel
            {
                Location = new Point(16, 12),
                Size = new Size(74, 74),
                BackColor = _selectedColor
            };
            pnlPreview.Paint += (s, e) =>
            {
                using (Pen p = new Pen(Theme.BorderColor, 2))
                {
                    e.Graphics.DrawRectangle(p, 1, 1, pnlPreview.Width - 2, pnlPreview.Height - 2);
                }
            };

            // 2. HEX Code Input (Right Top)
            Label lblHex = new Label
            {
                Text = Loc.ColorHexLabel,
                Location = new Point(102, 10),
                Size = new Size(200, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = Theme.TextSecondary
            };

            txtHex = new ModernTextBox
            {
                Location = new Point(102, 28),
                Size = new Size(200, 24),
                Text = this.ColorHex,
                Font = ThemeTokens.GetMonospaceFont(ThemeTokens.FontSizeButton),
                PlaceholderText = "#RRGGBB"
            };
            txtHex.ApplyTheme(Theme);
            txtHex.TextChanged += (s, e) =>
            {
                string raw = txtHex.Text.Trim();
                if (raw.StartsWith("#")) raw = raw.Substring(1);
                if (raw.Length == 6)
                {
                    try
                    {
                        int r = Convert.ToInt32(raw.Substring(0, 2), 16);
                        int g = Convert.ToInt32(raw.Substring(2, 2), 16);
                        int b = Convert.ToInt32(raw.Substring(4, 2), 16);
                        _selectedColor = Color.FromArgb(r, g, b);
                        pnlPreview.BackColor = _selectedColor;
                        pnlPreview.Invalidate();
                    }
                    catch (Exception) { /* Not a color yet, the user is still typing: the preview keeps the last valid one */ }
                }
            };

            // 3. Tolerance Input
            Label lblTol = new Label
            {
                Text = Loc.ColorToleranceLabel,
                Location = new Point(102, 56),
                Size = new Size(200, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = Theme.TextSecondary
            };

            numTolerance = new NumberInput
            {
                Location = new Point(102, 74),
                Size = new Size(200, 24),
                Minimum = 0,
                Maximum = 255,
                Value = _tolerance,
                Font = ThemeTokens.FontButton(FontStyle.Bold)
            };
            numTolerance.ApplyTheme(Theme);
            numTolerance.TextChanged += (s, e) =>
            {
                _tolerance = Math.Max(0, Math.Min(255, numTolerance.Value));
            };

            // 4. Quick Palette Section
            Label lblPalette = new Label
            {
                Text = Loc.ColorPaletteLabel,
                Location = new Point(16, 102),
                Size = new Size(286, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = Theme.TextSecondary
            };

            Panel pnlQuick = new Panel
            {
                Location = new Point(16, 120),
                Size = new Size(286, 26)
            };

            Color[] quickColors = new Color[]
            {
                Theme.CRed,
                Theme.CGreen,
                Theme.CBlue,
                Theme.CYellow,
                Theme.COrange,
                Theme.CPurple,
                Theme.TextPrimary,
                Theme.BgPrimary
            };

            int qX = 0;
            for (int i = 0; i < quickColors.Length; i++)
            {
                Color qc = quickColors[i];
                Panel swatchBtn = new Panel
                {
                    Location = new Point(qX, 2),
                    Size = new Size(28, 22),
                    BackColor = qc,
                    Cursor = Cursors.Hand
                };
                swatchBtn.Paint += (s, e) =>
                {
                    using (Pen p = new Pen(Theme.BorderColor, 1))
                    {
                        e.Graphics.DrawRectangle(p, 0, 0, swatchBtn.Width - 1, swatchBtn.Height - 1);
                    }
                };
                swatchBtn.Click += (s, e) =>
                {
                    _selectedColor = qc;
                    txtHex.Text = string.Format("#{0:X2}{1:X2}{2:X2}", qc.R, qc.G, qc.B);
                    pnlPreview.BackColor = _selectedColor;
                    pnlPreview.Invalidate();
                };
                pnlQuick.Controls.Add(swatchBtn);
                qX += 36;
            }

            // 5. Action Buttons (Pick from Screen & System Palette) - Clean text without emoji
            btnPickScreen = new RoundedButton
            {
                Text = Loc.ColorPickScreen,
                Location = new Point(16, 156),
                Size = new Size(138, 30),
                BorderRadius = Theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.AccentPrimary,
                HoverColor = Theme.AccentPrimaryHover,
                ForeColor = Color.White
            };
            btnPickScreen.Click += (s, e) =>
            {
                this.Visible = false;
                using (CoordinatePicker cp = new CoordinatePicker())
                {
                    cp.OnPointAndColorPicked += (pt, clr) =>
                    {
                        this.BeginInvoke((Action)(() =>
                        {
                            _selectedColor = clr;
                            txtHex.Text = string.Format("#{0:X2}{1:X2}{2:X2}", clr.R, clr.G, clr.B);
                            pnlPreview.BackColor = _selectedColor;
                            pnlPreview.Invalidate();
                        }));
                    };
                    cp.ShowDialog();
                }
                this.Visible = true;
                this.BringToFront();
            };

            btnSystemPalette = new RoundedButton
            {
                Text = Loc.ColorWheel,
                Location = new Point(164, 156),
                Size = new Size(138, 30),
                BorderRadius = Theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.BgElevated,
                HoverColor = Theme.BgTertiary,
                ForeColor = Theme.TextPrimary
            };
            btnSystemPalette.Click += (s, e) =>
            {
                using (ColorDialog cd = new ColorDialog())
                {
                    cd.Color = _selectedColor;
                    if (cd.ShowDialog() == DialogResult.OK)
                    {
                        _selectedColor = cd.Color;
                        txtHex.Text = string.Format("#{0:X2}{1:X2}{2:X2}", cd.Color.R, cd.Color.G, cd.Color.B);
                        pnlPreview.BackColor = _selectedColor;
                        pnlPreview.Invalidate();
                    }
                }
            };

            Body.Controls.AddRange(new Control[]
            {
                pnlPreview, lblHex, txtHex, lblTol, numTolerance,
                lblPalette, pnlQuick, btnPickScreen, btnSystemPalette
            });

            // 6. Dialog Result Buttons (Apply & Cancel)
            this.AcceptButton = AddButton(Loc.DialogApply, DialogResult.OK, true, () =>
            {
                _tolerance = Math.Max(0, Math.Min(255, numTolerance.Value));
            });
            this.CancelButton = AddButton(Loc.DialogCancel, DialogResult.Cancel, false);

            SetBodySize(318, 198);
        }
    }
}
