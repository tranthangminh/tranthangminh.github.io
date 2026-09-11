using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class ModernColorDialog : Form
    {
        private Color _selectedColor;
        private int _tolerance;
        private ThemeTokens _theme;

        private Panel pnlPreview;
        private ModernTextBox txtHex;
        private NumberInput numTolerance;
        private RoundedButton btnPickScreen;
        private RoundedButton btnSystemPalette;
        private RoundedButton btnApply;
        private RoundedButton btnCancel;

        public Color SelectedColor { get { return _selectedColor; } }
        public string ColorHex { get { return string.Format("#{0:X2}{1:X2}{2:X2}", _selectedColor.R, _selectedColor.G, _selectedColor.B); } }
        public int Tolerance { get { return _tolerance; } }

        public ModernColorDialog(Color initialColor, int initialTolerance, ThemeTokens theme)
        {
            _selectedColor = initialColor;
            _tolerance = Math.Max(0, Math.Min(255, initialTolerance));
            _theme = theme ?? ThemeTokens.DarkTheme();

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterParent;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.ShowInTaskbar = false;
            this.Size = new Size(330, 310);
            this.Text = "Select Target Color";
            this.BackColor = _theme.BgPrimary;
            this.ForeColor = _theme.TextPrimary;

            // 1. Color Preview Swatch (Left Top)
            pnlPreview = new Panel
            {
                Location = new Point(16, 16),
                Size = new Size(74, 74),
                BackColor = _selectedColor
            };
            pnlPreview.Paint += (s, e) =>
            {
                using (Pen p = new Pen(_theme.BorderColor, 2))
                {
                    e.Graphics.DrawRectangle(p, 1, 1, pnlPreview.Width - 2, pnlPreview.Height - 2);
                }
            };

            // 2. HEX Code Input (Right Top)
            Label lblHex = new Label
            {
                Text = "HEX Color Code:",
                Location = new Point(102, 14),
                Size = new Size(200, 16),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            txtHex = new ModernTextBox
            {
                Location = new Point(102, 32),
                Size = new Size(200, 24),
                Text = this.ColorHex,
                Font = ThemeTokens.GetMonospaceFont(9F),
                PlaceholderText = "#RRGGBB"
            };
            txtHex.ApplyTheme(_theme);
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
                    catch { }
                }
            };

            // 3. Tolerance Input
            Label lblTol = new Label
            {
                Text = "Tolerance (± 0..255):",
                Location = new Point(102, 60),
                Size = new Size(200, 16),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            numTolerance = new NumberInput
            {
                Location = new Point(102, 78),
                Size = new Size(200, 24),
                Minimum = 0,
                Maximum = 255,
                Value = _tolerance,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            numTolerance.ApplyTheme(_theme);
            numTolerance.TextChanged += (s, e) =>
            {
                _tolerance = Math.Max(0, Math.Min(255, numTolerance.Value));
            };

            // 4. Quick Palette Section
            Label lblPalette = new Label
            {
                Text = "Quick Palette:",
                Location = new Point(16, 108),
                Size = new Size(286, 16),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            Panel pnlQuick = new Panel
            {
                Location = new Point(16, 126),
                Size = new Size(286, 26)
            };

            Color[] quickColors = new Color[]
            {
                Color.FromArgb(239, 68, 68),   // Red
                Color.FromArgb(34, 197, 94),   // Green
                Color.FromArgb(59, 130, 246),  // Blue
                Color.FromArgb(234, 179, 8),   // Yellow
                Color.FromArgb(249, 115, 22),  // Orange
                Color.FromArgb(168, 85, 247),  // Purple
                Color.FromArgb(255, 255, 255), // White
                Color.FromArgb(15, 23, 42)     // Dark
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
                    using (Pen p = new Pen(Color.FromArgb(120, 255, 255, 255), 1))
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

            // 5. Action Buttons (Pick from Screen & System Palette)
            btnPickScreen = new RoundedButton
            {
                Text = "🎯 Pick from Screen",
                Location = new Point(16, 164),
                Size = new Size(138, 30),
                BorderRadius = _theme.RadiusMd,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                NormalColor = _theme.AccentPrimary,
                HoverColor = _theme.AccentPrimaryHover,
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
                Text = "🎨 Color Wheel...",
                Location = new Point(164, 164),
                Size = new Size(138, 30),
                BorderRadius = _theme.RadiusMd,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.TextPrimary
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

            // 6. Dialog Result Buttons (Apply & Cancel)
            btnApply = new RoundedButton
            {
                Text = "Apply",
                Location = new Point(16, 218),
                Size = new Size(138, 32),
                BorderRadius = _theme.RadiusMd,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                NormalColor = _theme.CGreen,
                HoverColor = Color.FromArgb(Math.Min(255, _theme.CGreen.R + 20), Math.Min(255, _theme.CGreen.G + 20), Math.Min(255, _theme.CGreen.B + 20)),
                ForeColor = Color.White
            };
            btnApply.Click += (s, e) =>
            {
                _tolerance = Math.Max(0, Math.Min(255, numTolerance.Value));
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            btnCancel = new RoundedButton
            {
                Text = "Cancel",
                Location = new Point(164, 218),
                Size = new Size(138, 32),
                BorderRadius = _theme.RadiusMd,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.TextSecondary
            };
            btnCancel.Click += (s, e) =>
            {
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            };

            this.Controls.AddRange(new Control[]
            {
                pnlPreview, lblHex, txtHex, lblTol, numTolerance,
                lblPalette, pnlQuick, btnPickScreen, btnSystemPalette,
                btnApply, btnCancel
            });

            this.AcceptButton = btnApply;
            this.CancelButton = btnCancel;
        }
    }
}
