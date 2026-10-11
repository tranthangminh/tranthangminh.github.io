using MaxApp.Common;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using ModernAutoClicker.Advanced;

namespace ModernAutoClicker
{
    public class StepPointSnapshot
    {
        public int StepIndex { get; set; }
        public Point StartPoint { get; set; }
        public Point EndPoint { get; set; }
    }

    public class MapTransformToolWindow : Form
    {
        private ThemeTokens _theme;
        private bool _isAdvancedMode = false;
        private List<Point> _baseSimplePoints = new List<Point>();
        private List<StepPointSnapshot> _baseAdvancedSteps = new List<StepPointSnapshot>();
        private HashSet<int> _selectedIndices = new HashSet<int>();

        private int _maxWidth = 1920;
        private int _maxHeight = 1080;
        private int _moveStep = 10;
        private int _currentScale = 100;
        private bool _isApplyingScale = false;

        // Custom Titlebar
        private Panel pnlHeader;
        private Label lblHeaderTitle;
        private Button btnHeaderClose;

        // Scope Selection (Asian Mode only)
        private Panel pnlScope;
        private RadioButton rdoAllSteps;
        private RadioButton rdoSelectedSteps;

        // UI Controls
        private Label lblScaleHeader;
        private NumberInput numScale;
        private RoundedButton btnResetScale;
        private Label lblMoveHeader;
        private RoundedButton btnStep1;
        private RoundedButton btnStep10;
        private RoundedButton btnStep100;
        private RoundedButton btnUp;
        private RoundedButton btnDown;
        private RoundedButton btnLeft;
        private RoundedButton btnRight;
        private Label lblBounds;
        private RoundedButton btnClose;

        // Callback events to update MainForm / OverlayForm
        public event Action<List<Point>> OnSimplePointsTransformed;
        public event Action<List<MacroStep>> OnAdvancedStepsTransformed;

        // Keep references to active lists to mutate in place
        private List<Point> _activeSimplePoints;
        private List<MacroStep> _activeAdvancedSteps;

        public MapTransformToolWindow(ThemeTokens theme)
        {
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
            this.Size = new Size(268, 296);
            this.Text = "Move & Scale Points";
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
                Text = "Move & Scale Points",
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
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            pnlHeader.Controls.AddRange(new Control[] { lblHeaderTitle, btnHeaderClose });

            // 0.1 Scope Section (Asian Mode only)
            pnlScope = new Panel
            {
                Location = new Point(16, 38),
                Size = new Size(236, 26),
                Visible = false
            };
            rdoAllSteps = new RadioButton
            {
                Text = "All Steps",
                Location = new Point(0, 2),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = _theme.TextPrimary,
                Checked = true,
                Cursor = Cursors.Hand
            };
            rdoSelectedSteps = new RadioButton
            {
                Text = "Selected (0)",
                Location = new Point(96, 2),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = _theme.TextPrimary,
                Checked = false,
                Cursor = Cursors.Hand
            };
            rdoAllSteps.CheckedChanged += (s, e) =>
            {
                if (rdoAllSteps.Checked) UpdateBoundsDisplay();
            };
            rdoSelectedSteps.CheckedChanged += (s, e) =>
            {
                if (rdoSelectedSteps.Checked) UpdateBoundsDisplay();
            };
            pnlScope.Controls.AddRange(new Control[] { rdoAllSteps, rdoSelectedSteps });

            // 1. Scale Section
            lblScaleHeader = new Label
            {
                Text = "Scale (Origin 0,0):",
                Location = new Point(16, 40),
                Size = new Size(220, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = _theme.AccentPrimary
            };

            numScale = new NumberInput
            {
                Location = new Point(16, 60),
                Size = new Size(116, 24),
                Minimum = 10,
                Maximum = 500,
                Step = 1,
                Value = 100,
                Font = ThemeTokens.FontButton(FontStyle.Bold)
            };
            numScale.ApplyTheme(_theme);
            numScale.TextChanged += (s, e) =>
            {
                if (_isApplyingScale) return;
                ApplyScale(numScale.Value);
            };

            btnResetScale = new RoundedButton
            {
                Text = "100%",
                Location = new Point(138, 60),
                Size = new Size(96, 24),
                BorderRadius = _theme.RadiusSm,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.TextPrimary
            };
            btnResetScale.Click += (s, e) =>
            {
                numScale.Value = 100;
                ApplyScale(100);
            };

            // 2. Move Step Selector
            lblMoveHeader = new Label
            {
                Text = "Move Step (px):",
                Location = new Point(16, 92),
                Size = new Size(220, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = _theme.AccentPrimary
            };

            btnStep1 = CreateStepButton("1px", 1, 16, 112, 66);
            btnStep10 = CreateStepButton("10px", 10, 88, 112, 72);
            btnStep100 = CreateStepButton("100px", 100, 166, 112, 68);
            UpdateStepButtonStyles();

            // 3. Directional D-Pad Buttons (1 on Top, 3 on Bottom)
            int dpadCenterX = 125;
            int btnW = 44;
            int btnH = 26;

            btnUp = CreateDirectionButton("▲", dpadCenterX - (btnW / 2), 142, btnW, btnH, 0, -1);
            btnLeft = CreateDirectionButton("◄", dpadCenterX - (btnW / 2) - btnW - 4, 172, btnW, btnH, -1, 0);
            btnDown = CreateDirectionButton("▼", dpadCenterX - (btnW / 2), 172, btnW, btnH, 0, 1);
            btnRight = CreateDirectionButton("►", dpadCenterX + (btnW / 2) + 4, 172, btnW, btnH, 1, 0);

            // 4. Bounds Indicator
            lblBounds = new Label
            {
                Text = "Bounds: 0, 0",
                Location = new Point(12, 206),
                Size = new Size(236, 16),
                Font = ThemeTokens.GetMonospaceFont(ThemeTokens.FontSizeSmall),
                ForeColor = _theme.TextTertiary,
                TextAlign = ContentAlignment.MiddleCenter
            };

            // 5. Close / Apply Button
            btnClose = new RoundedButton
            {
                Text = "Close",
                Location = new Point(16, 228),
                Size = new Size(236, 30),
                BorderRadius = _theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.AccentPrimary,
                HoverColor = _theme.AccentPrimaryHover,
                ForeColor = Color.White
            };
            btnClose.Click += (s, e) =>
            {
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            this.Controls.AddRange(new Control[]
            {
                pnlHeader, pnlScope,
                lblScaleHeader, numScale, btnResetScale,
                lblMoveHeader, btnStep1, btnStep10, btnStep100,
                btnUp, btnLeft, btnDown, btnRight,
                lblBounds, btnClose
            });

            this.AcceptButton = btnClose;
            this.CancelButton = btnClose;
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
                this.DialogResult = DialogResult.OK;
                this.Close();
            }
        }

        private void UpdateLayoutForMode(bool isAdvanced)
        {
            _isAdvancedMode = isAdvanced;
            pnlScope.Visible = isAdvanced;
            int offset = isAdvanced ? 30 : 0;

            lblScaleHeader.Top = 40 + offset;
            numScale.Top = 60 + offset;
            btnResetScale.Top = 60 + offset;

            lblMoveHeader.Top = 92 + offset;
            btnStep1.Top = 112 + offset;
            btnStep10.Top = 112 + offset;
            btnStep100.Top = 112 + offset;

            int dpadCenterX = 125;
            int btnW = 44;
            btnUp.Location = new Point(dpadCenterX - (btnW / 2), 142 + offset);
            btnLeft.Location = new Point(dpadCenterX - (btnW / 2) - btnW - 4, 172 + offset);
            btnDown.Location = new Point(dpadCenterX - (btnW / 2), 172 + offset);
            btnRight.Location = new Point(dpadCenterX + (btnW / 2) + 4, 172 + offset);

            lblBounds.Top = 206 + offset;
            btnClose.Location = new Point(16, 228 + offset);

            this.ClientSize = new Size(268, 270 + offset);
        }

        private bool IsTargetStep(int index)
        {
            if (!_isAdvancedMode || rdoAllSteps == null || rdoAllSteps.Checked) return true;
            return _selectedIndices != null && _selectedIndices.Contains(index);
        }

        private RoundedButton CreateStepButton(string text, int stepVal, int x, int y, int w)
        {
            RoundedButton btn = new RoundedButton
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(w, 22),
                BorderRadius = _theme.RadiusSm,
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btn.Click += (s, e) =>
            {
                _moveStep = stepVal;
                UpdateStepButtonStyles();
            };
            return btn;
        }

        private void UpdateStepButtonStyles()
        {
            SetStepBtnActive(btnStep1, _moveStep == 1);
            SetStepBtnActive(btnStep10, _moveStep == 10);
            SetStepBtnActive(btnStep100, _moveStep == 100);
        }

        private void SetStepBtnActive(RoundedButton btn, bool active)
        {
            if (btn == null) return;
            btn.NormalColor = active ? _theme.AccentPrimary : _theme.BgTertiary;
            btn.HoverColor = active ? _theme.AccentPrimaryHover : _theme.BgElevated;
            btn.ForeColor = active ? Color.White : _theme.TextSecondary;
            btn.Invalidate();
        }

        private RoundedButton CreateDirectionButton(string text, int x, int y, int w, int h, int dirX, int dirY)
        {
            RoundedButton btn = new RoundedButton
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(w, h),
                BorderRadius = _theme.RadiusSm,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.AccentPrimary,
                ForeColor = _theme.TextPrimary
            };
            btn.Click += (s, e) =>
            {
                ApplyMove(dirX * _moveStep, dirY * _moveStep);
            };
            return btn;
        }

        // =========================================================================
        // DATA BINDING & SNAPSHOTS
        // =========================================================================
        public void LoadSimplePoints(List<Point> points, int maxW, int maxH)
        {
            _isAdvancedMode = false;
            _activeSimplePoints = points;
            _maxWidth = Math.Max(100, maxW);
            _maxHeight = Math.Max(100, maxH);
            _selectedIndices = new HashSet<int>();

            _baseSimplePoints = new List<Point>();
            if (points != null)
            {
                foreach (Point pt in points)
                {
                    _baseSimplePoints.Add(new Point(pt.X, pt.Y));
                }
            }

            UpdateLayoutForMode(false);

            _isApplyingScale = true;
            _currentScale = 100;
            if (numScale != null) numScale.Value = 100;
            _isApplyingScale = false;

            UpdateBoundsDisplay();
        }

        public void LoadAdvancedSteps(List<MacroStep> steps, int maxW, int maxH, HashSet<int> selectedIndices = null)
        {
            _isAdvancedMode = true;
            _activeAdvancedSteps = steps;
            _maxWidth = Math.Max(100, maxW);
            _maxHeight = Math.Max(100, maxH);
            _selectedIndices = selectedIndices != null ? new HashSet<int>(selectedIndices) : new HashSet<int>();

            _baseAdvancedSteps = new List<StepPointSnapshot>();
            if (steps != null)
            {
                for (int i = 0; i < steps.Count; i++)
                {
                    var s = steps[i];
                    _baseAdvancedSteps.Add(new StepPointSnapshot
                    {
                        StepIndex = i,
                        StartPoint = new Point(s.StartPoint.X, s.StartPoint.Y),
                        EndPoint = new Point(s.EndPoint.X, s.EndPoint.Y)
                    });
                }
            }

            rdoAllSteps.Checked = true;
            if (_selectedIndices.Count > 0)
            {
                rdoSelectedSteps.Text = string.Format("Selected ({0})", _selectedIndices.Count);
                rdoSelectedSteps.Enabled = true;
            }
            else
            {
                rdoSelectedSteps.Text = "Selected (0)";
                rdoSelectedSteps.Enabled = false;
            }

            UpdateLayoutForMode(true);

            _isApplyingScale = true;
            _currentScale = 100;
            if (numScale != null) numScale.Value = 100;
            _isApplyingScale = false;

            UpdateBoundsDisplay();
        }

        // =========================================================================
        // TRANSFORMATION ALGORITHMS (SCALE & MOVE WITH BOUNDS CLAMPING)
        // =========================================================================
        private void ApplyScale(int scalePercent)
        {
            _currentScale = Math.Max(10, Math.Min(500, scalePercent));
            double factor = _currentScale / 100.0;

            if (!_isAdvancedMode)
            {
                if (_activeSimplePoints == null || _baseSimplePoints == null) return;
                for (int i = 0; i < _baseSimplePoints.Count && i < _activeSimplePoints.Count; i++)
                {
                    Point bp = _baseSimplePoints[i];
                    int nx = (int)Math.Round(bp.X * factor);
                    int ny = (int)Math.Round(bp.Y * factor);
                    _activeSimplePoints[i] = new Point(Math.Max(0, Math.Min(_maxWidth, nx)), Math.Max(0, Math.Min(_maxHeight, ny)));
                }

                if (OnSimplePointsTransformed != null) OnSimplePointsTransformed(_activeSimplePoints);
            }
            else
            {
                if (_activeAdvancedSteps == null || _baseAdvancedSteps == null) return;
                for (int i = 0; i < _baseAdvancedSteps.Count && i < _activeAdvancedSteps.Count; i++)
                {
                    if (!IsTargetStep(i)) continue;

                    var snap = _baseAdvancedSteps[i];
                    var step = _activeAdvancedSteps[i];

                    if (snap.StartPoint != Point.Empty)
                    {
                        int nx = (int)Math.Round(snap.StartPoint.X * factor);
                        int ny = (int)Math.Round(snap.StartPoint.Y * factor);
                        step.StartPoint = new Point(Math.Max(0, Math.Min(_maxWidth, nx)), Math.Max(0, Math.Min(_maxHeight, ny)));
                    }

                    if (snap.EndPoint != Point.Empty)
                    {
                        int nx = (int)Math.Round(snap.EndPoint.X * factor);
                        int ny = (int)Math.Round(snap.EndPoint.Y * factor);
                        step.EndPoint = new Point(Math.Max(0, Math.Min(_maxWidth, nx)), Math.Max(0, Math.Min(_maxHeight, ny)));
                    }
                }

                if (OnAdvancedStepsTransformed != null) OnAdvancedStepsTransformed(_activeAdvancedSteps);
            }

            UpdateBoundsDisplay();
        }

        private void ApplyMove(int deltaX, int deltaY)
        {
            // 1. Calculate current bounding box of target points
            int minX = int.MaxValue, maxX = int.MinValue;
            int minY = int.MaxValue, maxY = int.MinValue;
            int count = 0;

            if (!_isAdvancedMode)
            {
                if (_activeSimplePoints == null || _activeSimplePoints.Count == 0) return;
                foreach (Point p in _activeSimplePoints)
                {
                    minX = Math.Min(minX, p.X);
                    maxX = Math.Max(maxX, p.X);
                    minY = Math.Min(minY, p.Y);
                    maxY = Math.Max(maxY, p.Y);
                    count++;
                }
            }
            else
            {
                if (_activeAdvancedSteps == null || _activeAdvancedSteps.Count == 0) return;
                for (int i = 0; i < _activeAdvancedSteps.Count; i++)
                {
                    if (!IsTargetStep(i)) continue;
                    var s = _activeAdvancedSteps[i];
                    if (s.StartPoint != Point.Empty)
                    {
                        minX = Math.Min(minX, s.StartPoint.X);
                        maxX = Math.Max(maxX, s.StartPoint.X);
                        minY = Math.Min(minY, s.StartPoint.Y);
                        maxY = Math.Max(maxY, s.StartPoint.Y);
                        count++;
                    }
                    if (s.EndPoint != Point.Empty)
                    {
                        minX = Math.Min(minX, s.EndPoint.X);
                        maxX = Math.Max(maxX, s.EndPoint.X);
                        minY = Math.Min(minY, s.EndPoint.Y);
                        maxY = Math.Max(maxY, s.EndPoint.Y);
                        count++;
                    }
                }
            }

            if (count == 0) return;

            // 2. Clamp deltaX and deltaY against 4 boundaries [0.._maxWidth, 0.._maxHeight]
            int clampedDx = deltaX;
            int clampedDy = deltaY;

            if (clampedDx < 0)
            {
                clampedDx = Math.Max(clampedDx, -minX); // Don't move left past 0
            }
            else if (clampedDx > 0)
            {
                clampedDx = Math.Min(clampedDx, _maxWidth - maxX); // Don't move right past _maxWidth
            }

            if (clampedDy < 0)
            {
                clampedDy = Math.Max(clampedDy, -minY); // Don't move top past 0
            }
            else if (clampedDy > 0)
            {
                clampedDy = Math.Min(clampedDy, _maxHeight - maxY); // Don't move bottom past _maxHeight
            }

            if (clampedDx == 0 && clampedDy == 0) return;

            // 3. Shift active points and base snapshots synchronously
            if (!_isAdvancedMode)
            {
                for (int i = 0; i < _activeSimplePoints.Count; i++)
                {
                    _activeSimplePoints[i] = new Point(_activeSimplePoints[i].X + clampedDx, _activeSimplePoints[i].Y + clampedDy);
                }
                for (int i = 0; i < _baseSimplePoints.Count; i++)
                {
                    _baseSimplePoints[i] = new Point(_baseSimplePoints[i].X + clampedDx, _baseSimplePoints[i].Y + clampedDy);
                }

                if (OnSimplePointsTransformed != null) OnSimplePointsTransformed(_activeSimplePoints);
            }
            else
            {
                for (int i = 0; i < _activeAdvancedSteps.Count; i++)
                {
                    if (!IsTargetStep(i)) continue;
                    var s = _activeAdvancedSteps[i];
                    if (s.StartPoint != Point.Empty) s.StartPoint = new Point(s.StartPoint.X + clampedDx, s.StartPoint.Y + clampedDy);
                    if (s.EndPoint != Point.Empty) s.EndPoint = new Point(s.EndPoint.X + clampedDx, s.EndPoint.Y + clampedDy);
                }
                for (int i = 0; i < _baseAdvancedSteps.Count; i++)
                {
                    if (!IsTargetStep(i)) continue;
                    var snap = _baseAdvancedSteps[i];
                    if (snap.StartPoint != Point.Empty) snap.StartPoint = new Point(snap.StartPoint.X + clampedDx, snap.StartPoint.Y + clampedDy);
                    if (snap.EndPoint != Point.Empty) snap.EndPoint = new Point(snap.EndPoint.X + clampedDx, snap.EndPoint.Y + clampedDy);
                }

                if (OnAdvancedStepsTransformed != null) OnAdvancedStepsTransformed(_activeAdvancedSteps);
            }

            UpdateBoundsDisplay();
        }

        private void UpdateBoundsDisplay()
        {
            if (lblBounds == null) return;
            int minX = int.MaxValue, maxX = int.MinValue;
            int minY = int.MaxValue, maxY = int.MinValue;
            int count = 0;

            if (!_isAdvancedMode)
            {
                if (_activeSimplePoints != null)
                {
                    foreach (Point p in _activeSimplePoints)
                    {
                        minX = Math.Min(minX, p.X);
                        maxX = Math.Max(maxX, p.X);
                        minY = Math.Min(minY, p.Y);
                        maxY = Math.Max(maxY, p.Y);
                        count++;
                    }
                }
            }
            else
            {
                if (_activeAdvancedSteps != null)
                {
                    for (int i = 0; i < _activeAdvancedSteps.Count; i++)
                    {
                        if (!IsTargetStep(i)) continue;
                        var s = _activeAdvancedSteps[i];
                        if (s.StartPoint != Point.Empty)
                        {
                            minX = Math.Min(minX, s.StartPoint.X);
                            maxX = Math.Max(maxX, s.StartPoint.X);
                            minY = Math.Min(minY, s.StartPoint.Y);
                            maxY = Math.Max(maxY, s.StartPoint.Y);
                            count++;
                        }
                        if (s.EndPoint != Point.Empty)
                        {
                            minX = Math.Min(minX, s.EndPoint.X);
                            maxX = Math.Max(maxX, s.EndPoint.X);
                            minY = Math.Min(minY, s.EndPoint.Y);
                            maxY = Math.Max(maxY, s.EndPoint.Y);
                            count++;
                        }
                    }
                }
            }

            if (count > 0)
            {
                lblBounds.Text = string.Format("Bounds: X:{0}..{1} | Y:{2}..{3}", minX, maxX, minY, maxY);
            }
            else
            {
                lblBounds.Text = "Bounds: No points";
            }
        }
    }
}
