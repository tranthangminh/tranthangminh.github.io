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

        private int _maxWidth = 1920;
        private int _maxHeight = 1080;
        private int _moveStep = 10;
        private int _currentScale = 100;
        private bool _isApplyingScale = false;

        // UI Controls
        private NumberInput numScale;
        private RoundedButton btnResetScale;
        private RoundedButton btnStep1;
        private RoundedButton btnStep10;
        private RoundedButton btnStep100;
        private RoundedButton btnUp;
        private RoundedButton btnDown;
        private RoundedButton btnLeft;
        private RoundedButton btnRight;
        private Label lblBounds;
        private RoundedButton btnResetAll;
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
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterParent;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.ShowInTaskbar = false;
            this.Size = new Size(268, 286);
            this.Text = "Move & Scale Points";
            this.BackColor = _theme.BgPrimary;
            this.ForeColor = _theme.TextPrimary;
            this.DoubleBuffered = true;

            // 1. Scale Section
            Label lblScaleHeader = new Label
            {
                Text = "Scale (Origin 0,0):",
                Location = new Point(16, 12),
                Size = new Size(220, 16),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.AccentPrimary
            };

            numScale = new NumberInput
            {
                Location = new Point(16, 32),
                Size = new Size(116, 24),
                Minimum = 10,
                Maximum = 500,
                Step = 1,
                Value = 100,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            numScale.ApplyTheme(_theme);
            numScale.TextChanged += (s, e) =>
            {
                if (_isApplyingScale) return;
                ApplyScale(numScale.Value);
            };

            btnResetScale = new RoundedButton
            {
                Text = "↺ 100%",
                Location = new Point(138, 32),
                Size = new Size(96, 24),
                BorderRadius = _theme.RadiusSm,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
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
            Label lblMoveHeader = new Label
            {
                Text = "Move Step (px):",
                Location = new Point(16, 64),
                Size = new Size(220, 16),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.AccentPrimary
            };

            btnStep1 = CreateStepButton("1px", 1, 16, 84, 66);
            btnStep10 = CreateStepButton("10px", 10, 88, 84, 72);
            btnStep100 = CreateStepButton("100px", 100, 166, 84, 68);
            UpdateStepButtonStyles();

            // 3. Directional D-Pad Buttons (1 on Top, 3 on Bottom)
            int dpadCenterX = 125;
            int btnW = 44;
            int btnH = 26;

            btnUp = CreateDirectionButton("▲", dpadCenterX - (btnW / 2), 114, btnW, btnH, 0, -1);
            btnLeft = CreateDirectionButton("◄", dpadCenterX - (btnW / 2) - btnW - 4, 144, btnW, btnH, -1, 0);
            btnDown = CreateDirectionButton("▼", dpadCenterX - (btnW / 2), 144, btnW, btnH, 0, 1);
            btnRight = CreateDirectionButton("►", dpadCenterX + (btnW / 2) + 4, 144, btnW, btnH, 1, 0);

            // 4. Bounds Indicator
            lblBounds = new Label
            {
                Text = "Bounds: (0, 0)",
                Location = new Point(12, 178),
                Size = new Size(228, 16),
                Font = ThemeTokens.GetMonospaceFont(7F),
                ForeColor = _theme.TextTertiary,
                TextAlign = ContentAlignment.MiddleCenter
            };

            // 5. Action Buttons (Reset Position & Close)
            btnResetAll = new RoundedButton
            {
                Text = "↺ Reset",
                Location = new Point(16, 200),
                Size = new Size(106, 28),
                BorderRadius = _theme.RadiusMd,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.BgTertiary,
                ForeColor = _theme.TextSecondary
            };
            btnResetAll.Click += (s, e) => ResetToBase();

            btnClose = new RoundedButton
            {
                Text = "Close",
                Location = new Point(128, 200),
                Size = new Size(106, 28),
                BorderRadius = _theme.RadiusMd,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
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
                lblScaleHeader, numScale, btnResetScale,
                lblMoveHeader, btnStep1, btnStep10, btnStep100,
                btnUp, btnLeft, btnDown, btnRight,
                lblBounds, btnResetAll, btnClose
            });

            this.AcceptButton = btnClose;
            this.CancelButton = btnClose;
        }

        private RoundedButton CreateStepButton(string text, int stepVal, int x, int y, int w)
        {
            RoundedButton btn = new RoundedButton
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(w, 22),
                BorderRadius = _theme.RadiusSm,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
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
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
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

            _baseSimplePoints = new List<Point>();
            if (points != null)
            {
                foreach (Point pt in points)
                {
                    _baseSimplePoints.Add(new Point(pt.X, pt.Y));
                }
            }

            _isApplyingScale = true;
            _currentScale = 100;
            if (numScale != null) numScale.Value = 100;
            _isApplyingScale = false;

            UpdateBoundsDisplay();
        }

        public void LoadAdvancedSteps(List<MacroStep> steps, int maxW, int maxH)
        {
            _isAdvancedMode = true;
            _activeAdvancedSteps = steps;
            _maxWidth = Math.Max(100, maxW);
            _maxHeight = Math.Max(100, maxH);

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
            // 1. Calculate current bounding box of all active points
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
                foreach (var s in _activeAdvancedSteps)
                {
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
                    var s = _activeAdvancedSteps[i];
                    if (s.StartPoint != Point.Empty) s.StartPoint = new Point(s.StartPoint.X + clampedDx, s.StartPoint.Y + clampedDy);
                    if (s.EndPoint != Point.Empty) s.EndPoint = new Point(s.EndPoint.X + clampedDx, s.EndPoint.Y + clampedDy);
                }
                for (int i = 0; i < _baseAdvancedSteps.Count; i++)
                {
                    var snap = _baseAdvancedSteps[i];
                    if (snap.StartPoint != Point.Empty) snap.StartPoint = new Point(snap.StartPoint.X + clampedDx, snap.StartPoint.Y + clampedDy);
                    if (snap.EndPoint != Point.Empty) snap.EndPoint = new Point(snap.EndPoint.X + clampedDx, snap.EndPoint.Y + clampedDy);
                }

                if (OnAdvancedStepsTransformed != null) OnAdvancedStepsTransformed(_activeAdvancedSteps);
            }

            UpdateBoundsDisplay();
        }

        private void ResetToBase()
        {
            _isApplyingScale = true;
            _currentScale = 100;
            if (numScale != null) numScale.Value = 100;
            _isApplyingScale = false;

            ApplyScale(100);
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
                    foreach (var s in _activeAdvancedSteps)
                    {
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
