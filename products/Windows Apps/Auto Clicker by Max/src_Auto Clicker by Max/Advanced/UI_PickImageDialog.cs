using MaxApp.Common;
using Loc = ModernAutoClicker.Localization.Loc;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class ModernImageDialog : ModernDialog
    {
        private Bitmap _currentBitmap;
        private Bitmap _initialBitmap;
        private int _similarity;
        private bool _isChanged = false;

        private Panel pnlPreview;
        private Label lblDimensions;
        private RoundedButton btnCapture;
        private RoundedButton btnImport;
        private RoundedButton btnExport;
        private RoundedButton btnClear;
        private Label lblSim;
        private NumberInput numSimilarity;

        public Bitmap SelectedBitmap { get { return _currentBitmap; } }
        public int Similarity { get { return _similarity; } }
        public bool ImageChanged { get { return _isChanged; } }

        public ModernImageDialog(Bitmap initialBitmap, int initialSimilarity, ThemeTokens theme)
            : base(Loc.ImageDialogTitle, theme)
        {
            _initialBitmap = initialBitmap;
            _currentBitmap = initialBitmap != null ? new Bitmap(initialBitmap) : null;
            _similarity = Math.Max(50, Math.Min(100, initialSimilarity > 0 ? initialSimilarity : 90));

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            // 1. Image Preview Panel (Left Top)
            pnlPreview = new Panel
            {
                Location = new Point(16, 12),
                Size = new Size(180, 126),
                BackColor = Theme.BgPrimary,
                Cursor = Cursors.Hand
            };
            pnlPreview.Paint += (s, e) =>
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;

                if (_currentBitmap != null)
                {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    float scale = Math.Min((float)(pnlPreview.Width - 8) / _currentBitmap.Width, (float)(pnlPreview.Height - 8) / _currentBitmap.Height);
                    int dw = Math.Max(1, (int)(_currentBitmap.Width * scale));
                    int dh = Math.Max(1, (int)(_currentBitmap.Height * scale));
                    int dx = (pnlPreview.Width - dw) / 2;
                    int dy = (pnlPreview.Height - dh) / 2;

                    g.DrawImage(_currentBitmap, dx, dy, dw, dh);

                    using (Pen borderPen = new Pen(Theme.CPurple, 1.5f))
                    {
                        g.DrawRectangle(borderPen, dx - 1, dy - 1, dw + 1, dh + 1);
                    }
                }
                else
                {
                    using (Pen dashedPen = new Pen(Theme.TextTertiary, 1))
                    {
                        dashedPen.DashStyle = DashStyle.Dash;
                        g.DrawRectangle(dashedPen, 2, 2, pnlPreview.Width - 5, pnlPreview.Height - 5);
                    }
                    
                    // Clean vector camera icon (no unicode/emoji dependency)
                    using (Pen iconPen = new Pen(Theme.TextTertiary, 1.5f))
                    {
                        int icW = 32;
                        int icH = 20;
                        int icX = (pnlPreview.Width - icW) / 2;
                        int icY = 34;
                        g.DrawRectangle(iconPen, icX, icY, icW, icH);
                        g.DrawEllipse(iconPen, icX + 9, icY + 3, 14, 14);
                        using (SolidBrush topBrush = new SolidBrush(Theme.TextTertiary))
                        {
                            g.FillRectangle(topBrush, icX + 5, icY - 3, 7, 3);
                        }
                    }

                    using (Font textFont = ThemeTokens.FontBase(FontStyle.Regular))
                    using (SolidBrush textBrush = new SolidBrush(Theme.TextTertiary))
                    {
                        string msg = Loc.ImageNone;
                        SizeF sz = g.MeasureString(msg, textFont);
                        g.DrawString(msg, textFont, textBrush, (pnlPreview.Width - sz.Width) / 2, 68);
                    }
                }
            };
            pnlPreview.DoubleClick += (s, e) => ShowFullPreview();

            // 2. Dimensions info under preview
            lblDimensions = new Label
            {
                Location = new Point(16, 142),
                Size = new Size(180, 18),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = Theme.TextSecondary,
                TextAlign = ContentAlignment.MiddleCenter,
                Text = GetDimensionText()
            };

            // 3. Action Buttons (Right Top)
            int btnX = 210;
            int btnW = 188;
            int btnH = 26;

            btnCapture = new RoundedButton
            {
                Text = Loc.ImageCapture,
                Location = new Point(btnX, 12),
                Size = new Size(btnW, btnH),
                BorderRadius = Theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.AccentPrimary,
                HoverColor = Theme.AccentPrimaryHover,
                ForeColor = Color.White
            };
            btnCapture.Click += (s, e) =>
            {
                this.Visible = false;
                using (CoordinatePicker cp = new CoordinatePicker())
                {
                    cp.IsImageSnippingMode = true;
                    cp.OnImageCaptured += (bmp) =>
                    {
                        if (bmp != null)
                        {
                            this.BeginInvoke((Action)(() =>
                            {
                                if (_currentBitmap != null && _currentBitmap != _initialBitmap)
                                {
                                    _currentBitmap.Dispose();
                                }
                                _currentBitmap = new Bitmap(bmp);
                                _isChanged = true;
                                UpdatePreview();
                                try { bmp.Dispose(); } catch (Exception caught) { AppLog.Caught(caught); }
                            }));
                        }
                    };
                    cp.ShowDialog();
                }
                this.Visible = true;
                this.BringToFront();
            };

            btnImport = new RoundedButton
            {
                Text = Loc.ImageImport,
                Location = new Point(btnX, 42),
                Size = new Size(btnW, btnH),
                BorderRadius = Theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.BgElevated,
                HoverColor = Theme.BgTertiary,
                ForeColor = Theme.TextPrimary
            };
            btnImport.Click += (s, e) =>
            {
                using (OpenFileDialog ofd = new OpenFileDialog())
                {
                    ofd.Title = Loc.ImageImportTitle;
                    ofd.Filter = Loc.FileFilterImages;
                    if (ofd.ShowDialog(this) == DialogResult.OK)
                    {
                        try
                        {
                            using (Image loaded = Image.FromFile(ofd.FileName))
                            {
                                if (_currentBitmap != null && _currentBitmap != _initialBitmap)
                                {
                                    _currentBitmap.Dispose();
                                }
                                _currentBitmap = new Bitmap(loaded);
                                _isChanged = true;
                                UpdatePreview();
                            }
                        }
                        catch (Exception ex)
                        {
                            ModernMessageBox.Show(Loc.ImageImportFailed(ex.Message), Loc.ImageImportErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, this);
                        }
                    }
                }
            };

            btnExport = new RoundedButton
            {
                Text = Loc.ImageExport,
                Location = new Point(btnX, 72),
                Size = new Size(btnW, btnH),
                BorderRadius = Theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.BgElevated,
                HoverColor = Theme.BgTertiary,
                ForeColor = Theme.TextPrimary,
                Enabled = (_currentBitmap != null)
            };
            btnExport.Click += (s, e) =>
            {
                if (_currentBitmap == null) return;
                using (SaveFileDialog sfd = new SaveFileDialog())
                {
                    sfd.Title = Loc.ImageExportTitle;
                    sfd.Filter = Loc.FileFilterPng;
                    sfd.FileName = "Template_Image.png";
                    if (sfd.ShowDialog(this) == DialogResult.OK)
                    {
                        try
                        {
                            _currentBitmap.Save(sfd.FileName, System.Drawing.Imaging.ImageFormat.Png);
                        }
                        catch (Exception ex)
                        {
                            ModernMessageBox.Show(Loc.ImageExportFailed(ex.Message), Loc.ImageExportErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, this);
                        }
                    }
                }
            };

            btnClear = new RoundedButton
            {
                Text = Loc.ImageClear,
                Location = new Point(btnX, 102),
                Size = new Size(btnW, btnH),
                BorderRadius = Theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.BgElevated,
                HoverColor = Theme.BgTertiary,
                ForeColor = Theme.Danger,
                Enabled = (_currentBitmap != null)
            };
            btnClear.Click += (s, e) =>
            {
                if (_currentBitmap != null && _currentBitmap != _initialBitmap)
                {
                    _currentBitmap.Dispose();
                }
                _currentBitmap = null;
                _isChanged = true;
                UpdatePreview();
            };

            // 4. Similarity Setting
            lblSim = new Label
            {
                Text = Loc.ImageSimilarity,
                Location = new Point(16, 170),
                Size = new Size(260, 20),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = Theme.TextSecondary
            };

            numSimilarity = new NumberInput
            {
                Location = new Point(280, 168),
                Size = new Size(118, 24),
                Minimum = 50,
                Maximum = 100,
                Step = 1,
                Value = _similarity,
                Font = ThemeTokens.FontButton(FontStyle.Bold)
            };
            numSimilarity.ApplyTheme(Theme);
            numSimilarity.TextChanged += (s, e) =>
            {
                _similarity = Math.Max(50, Math.Min(100, numSimilarity.Value));
            };

            Body.Controls.AddRange(new Control[]
            {
                pnlPreview, lblDimensions,
                btnCapture, btnImport, btnExport, btnClear,
                lblSim, numSimilarity
            });

            // 5. Apply and Cancel Buttons
            this.AcceptButton = AddButton(Loc.DialogApply, DialogResult.OK, true, () =>
            {
                _similarity = Math.Max(50, Math.Min(100, numSimilarity.Value));
            });
            this.CancelButton = AddButton(Loc.DialogCancel, DialogResult.Cancel, false);

            SetBodySize(412, 204);
        }

        private string GetDimensionText()
        {
            if (_currentBitmap != null)
            {
                return string.Format("{0} x {1} px", _currentBitmap.Width, _currentBitmap.Height);
            }
            return "";
        }

        private void UpdatePreview()
        {
            pnlPreview.Invalidate();
            lblDimensions.Text = GetDimensionText();
            btnExport.Enabled = (_currentBitmap != null);
            btnClear.Enabled = (_currentBitmap != null);
        }

        private void ShowFullPreview()
        {
            if (_currentBitmap == null) return;
            using (Form previewForm = new Form())
            {
                previewForm.Text = string.Format(Loc.ImagePreviewFormat, _currentBitmap.Width, _currentBitmap.Height);
                previewForm.FormBorderStyle = FormBorderStyle.Sizable;
                previewForm.StartPosition = FormStartPosition.CenterParent;
                previewForm.BackColor = Theme.BgPrimary;
                previewForm.ForeColor = Theme.TextPrimary;
                previewForm.ShowInTaskbar = false;
                previewForm.KeyPreview = true;
                previewForm.Size = new Size(Math.Max(320, _currentBitmap.Width + 40), Math.Max(240, _currentBitmap.Height + 60));

                PictureBox pb = new PictureBox
                {
                    Dock = DockStyle.Fill,
                    SizeMode = PictureBoxSizeMode.CenterImage,
                    Image = _currentBitmap
                };
                previewForm.Controls.Add(pb);
                previewForm.KeyDown += (s, e) => { if (e.KeyCode == Keys.Escape) previewForm.Close(); };
                previewForm.ShowDialog(this);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_currentBitmap != null)
                {
                    try { _currentBitmap.Dispose(); } catch (Exception caught) { AppLog.Caught(caught); }
                    _currentBitmap = null;
                }
            }
            base.Dispose(disposing);
        }
    }
}
