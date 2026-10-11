using MaxApp.Common;
using Loc = ModernAutoClicker.Localization.Loc;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class ModernImageDialog : Form
    {
        private Bitmap _currentBitmap;
        private Bitmap _initialBitmap;
        private int _similarity;
        private bool _isChanged = false;
        private ThemeTokens _theme;

        private Panel pnlHeader;
        private Label lblHeaderTitle;
        private Button btnHeaderClose;

        private Panel pnlPreview;
        private Label lblDimensions;
        private RoundedButton btnCapture;
        private RoundedButton btnImport;
        private RoundedButton btnExport;
        private RoundedButton btnClear;
        private Label lblSim;
        private NumberInput numSimilarity;
        private RoundedButton btnApply;
        private RoundedButton btnCancel;

        public Bitmap SelectedBitmap { get { return _currentBitmap; } }
        public int Similarity { get { return _similarity; } }
        public bool ImageChanged { get { return _isChanged; } }

        public ModernImageDialog(Bitmap initialBitmap, int initialSimilarity, ThemeTokens theme)
        {
            _initialBitmap = initialBitmap;
            _currentBitmap = initialBitmap != null ? new Bitmap(initialBitmap) : null;
            _similarity = Math.Max(50, Math.Min(100, initialSimilarity > 0 ? initialSimilarity : 90));
            _theme = theme ?? ThemeTokens.DarkTheme();

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterParent;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.ShowInTaskbar = false;
            this.Size = new Size(414, 286);
            this.Text = Loc.IsVietnamese ? "Tùy chọn Hình ảnh Mẫu" : "Template Image Options";
            this.BackColor = _theme.BgPrimary;
            this.ForeColor = _theme.TextPrimary;
            this.DoubleBuffered = true;
            this.KeyPreview = true;

            // 0. Custom Dark Titlebar
            pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 32,
                BackColor = _theme.BgPrimary
            };
            pnlHeader.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    CommonNativeMethods.ReleaseCapture();
                    CommonNativeMethods.SendMessage(this.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
                }
            };

            lblHeaderTitle = new Label
            {
                Text = Loc.IsVietnamese ? "Tùy chọn Hình ảnh Mẫu" : "Template Image Options",
                Location = new Point(12, 0),
                Size = new Size(this.Width - 48, 32),
                TextAlign = ContentAlignment.MiddleLeft,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = _theme.TextPrimary,
                UseMnemonic = false
            };
            lblHeaderTitle.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    CommonNativeMethods.ReleaseCapture();
                    CommonNativeMethods.SendMessage(this.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
                }
            };

            btnHeaderClose = new Button
            {
                Text = "✕",
                Location = new Point(this.Width - 36, 0),
                Size = new Size(36, 32),
                FlatStyle = FlatStyle.Flat,
                Font = ThemeTokens.FontSegoeSymbol(10),
                ForeColor = _theme.TextSecondary,
                BackColor = _theme.BgPrimary,
                Cursor = Cursors.Hand
            };
            btnHeaderClose.FlatAppearance.BorderSize = 0;
            btnHeaderClose.MouseEnter += (s, e) =>
            {
                btnHeaderClose.BackColor = _theme.Danger;
                btnHeaderClose.ForeColor = Color.White;
            };
            btnHeaderClose.MouseLeave += (s, e) =>
            {
                btnHeaderClose.BackColor = _theme.BgPrimary;
                btnHeaderClose.ForeColor = _theme.TextSecondary;
            };
            btnHeaderClose.Click += (s, e) =>
            {
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            };

            pnlHeader.Controls.AddRange(new Control[] { lblHeaderTitle, btnHeaderClose });

            // 1. Image Preview Panel (Left Top)
            pnlPreview = new Panel
            {
                Location = new Point(16, 44),
                Size = new Size(180, 126),
                BackColor = _theme.BgSecondary,
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

                    using (Pen borderPen = new Pen(_theme.CPurple, 1.5f))
                    {
                        g.DrawRectangle(borderPen, dx - 1, dy - 1, dw + 1, dh + 1);
                    }
                }
                else
                {
                    using (Pen dashedPen = new Pen(_theme.TextTertiary, 1))
                    {
                        dashedPen.DashStyle = DashStyle.Dash;
                        g.DrawRectangle(dashedPen, 2, 2, pnlPreview.Width - 5, pnlPreview.Height - 5);
                    }
                    
                    // Clean vector camera icon (no unicode/emoji dependency)
                    using (Pen iconPen = new Pen(_theme.TextTertiary, 1.5f))
                    {
                        int icW = 32;
                        int icH = 20;
                        int icX = (pnlPreview.Width - icW) / 2;
                        int icY = 34;
                        g.DrawRectangle(iconPen, icX, icY, icW, icH);
                        g.DrawEllipse(iconPen, icX + 9, icY + 3, 14, 14);
                        using (SolidBrush topBrush = new SolidBrush(_theme.TextTertiary))
                        {
                            g.FillRectangle(topBrush, icX + 5, icY - 3, 7, 3);
                        }
                    }

                    using (Font textFont = ThemeTokens.FontBase(FontStyle.Regular))
                    using (SolidBrush textBrush = new SolidBrush(_theme.TextTertiary))
                    {
                        string msg = Loc.IsVietnamese ? "Chưa có hình ảnh" : "No image selected";
                        SizeF sz = g.MeasureString(msg, textFont);
                        g.DrawString(msg, textFont, textBrush, (pnlPreview.Width - sz.Width) / 2, 68);
                    }
                }
            };
            pnlPreview.DoubleClick += (s, e) => ShowFullPreview();

            // 2. Dimensions info under preview
            lblDimensions = new Label
            {
                Location = new Point(16, 174),
                Size = new Size(180, 18),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = _theme.TextSecondary,
                TextAlign = ContentAlignment.MiddleCenter,
                Text = GetDimensionText()
            };

            // 3. Action Buttons (Right Top)
            int btnX = 210;
            int btnW = 188;
            int btnH = 26;

            btnCapture = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Chụp từ màn hình" : "Capture from Screen",
                Location = new Point(btnX, 44),
                Size = new Size(btnW, btnH),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.AccentPrimary,
                HoverColor = _theme.AccentPrimaryHover,
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
                Text = Loc.IsVietnamese ? "Tải ảnh từ file..." : "Import from File...",
                Location = new Point(btnX, 74),
                Size = new Size(btnW, btnH),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.TextPrimary
            };
            btnImport.Click += (s, e) =>
            {
                using (OpenFileDialog ofd = new OpenFileDialog())
                {
                    ofd.Title = Loc.IsVietnamese ? "Tải ảnh mẫu" : "Import Template Image";
                    ofd.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|All Files (*.*)|*.*";
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
                            MessageBox.Show(this, "Failed to load image file:\n" + ex.Message, "Import Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                }
            };

            btnExport = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Lưu ảnh ra file..." : "Export to File...",
                Location = new Point(btnX, 104),
                Size = new Size(btnW, btnH),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.TextPrimary,
                Enabled = (_currentBitmap != null)
            };
            btnExport.Click += (s, e) =>
            {
                if (_currentBitmap == null) return;
                using (SaveFileDialog sfd = new SaveFileDialog())
                {
                    sfd.Title = Loc.IsVietnamese ? "Lưu ảnh mẫu" : "Export Template Image";
                    sfd.Filter = "PNG Image (*.png)|*.png|All Files (*.*)|*.*";
                    sfd.FileName = "Template_Image.png";
                    if (sfd.ShowDialog(this) == DialogResult.OK)
                    {
                        try
                        {
                            _currentBitmap.Save(sfd.FileName, System.Drawing.Imaging.ImageFormat.Png);
                        }
                        catch (Exception ex)
                        {
                            MessageBox.Show(this, "Failed to export image file:\n" + ex.Message, "Export Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                }
            };

            btnClear = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Xóa ảnh mẫu" : "Clear Template Image",
                Location = new Point(btnX, 134),
                Size = new Size(btnW, btnH),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.Danger,
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
                Text = Loc.IsVietnamese ? "Độ khớp ảnh (Similarity 50..100%):" : "Similarity (50..100%):",
                Location = new Point(16, 202),
                Size = new Size(260, 20),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            numSimilarity = new NumberInput
            {
                Location = new Point(280, 200),
                Size = new Size(118, 24),
                Minimum = 50,
                Maximum = 100,
                Step = 1,
                Value = _similarity,
                Font = ThemeTokens.FontButton(FontStyle.Bold)
            };
            numSimilarity.ApplyTheme(_theme);
            numSimilarity.TextChanged += (s, e) =>
            {
                _similarity = Math.Max(50, Math.Min(100, numSimilarity.Value));
            };

            // 5. Apply and Cancel Buttons (Bottom) - Apply uses AccentPrimary!
            btnApply = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Áp dụng" : "Apply",
                Location = new Point(16, 238),
                Size = new Size(180, 32),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontButton(FontStyle.Bold),
                NormalColor = _theme.AccentPrimary,
                HoverColor = _theme.AccentPrimaryHover,
                ForeColor = Color.White
            };
            btnApply.Click += (s, e) =>
            {
                _similarity = Math.Max(50, Math.Min(100, numSimilarity.Value));
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            btnCancel = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Hủy" : "Cancel",
                Location = new Point(210, 238),
                Size = new Size(188, 32),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontButton(FontStyle.Bold),
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
                pnlHeader,
                pnlPreview, lblDimensions,
                btnCapture, btnImport, btnExport, btnClear,
                lblSim, numSimilarity,
                btnApply, btnCancel
            });

            this.AcceptButton = btnApply;
            this.CancelButton = btnCancel;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            using (Pen p = new Pen(_theme.BorderColor, 1))
            {
                e.Graphics.DrawRectangle(p, 0, 0, this.Width - 1, this.Height - 1);
            }
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            base.OnKeyDown(e);
            if (e.KeyCode == Keys.Escape)
            {
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            }
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
                previewForm.Text = string.Format(Loc.IsVietnamese ? "Xem trước ảnh ({0} x {1} px)" : "Image Preview ({0} x {1} px)", _currentBitmap.Width, _currentBitmap.Height);
                previewForm.FormBorderStyle = FormBorderStyle.Sizable;
                previewForm.StartPosition = FormStartPosition.CenterParent;
                previewForm.BackColor = _theme.BgPrimary;
                previewForm.ForeColor = _theme.TextPrimary;
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
    }
}
