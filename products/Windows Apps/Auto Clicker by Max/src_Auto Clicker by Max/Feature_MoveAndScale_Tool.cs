using Loc = ModernAutoClicker.Localization.Loc;
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

    public class MapTransformToolWindow : ModernDialog
    {
        private bool _isAdvancedMode = false;
        private List<Point> _baseSimplePoints = new List<Point>();
        private List<StepPointSnapshot> _baseAdvancedSteps = new List<StepPointSnapshot>();
        private HashSet<int> _selectedIndices = new HashSet<int>();

        private int _maxWidth = 1920;
        private int _maxHeight = 1080;
        private int _moveStep = 10;
        private int _currentScale = 100;
        private bool _isApplyingScale = false;

        // The D-pad buttons are only 26px tall, a full 16px triangle would crowd them
        private const int DirectionIconSize = 12;
        private const int BodyWidth = 250;
        private const int BodyHeight = 198;

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

        // Callback events to update MainForm / OverlayForm
        public event Action<List<Point>> OnSimplePointsTransformed;
        public event Action<List<MacroStep>> OnAdvancedStepsTransformed;

        // Keep references to active lists to mutate in place
        private List<Point> _activeSimplePoints;
        private List<MacroStep> _activeAdvancedSteps;

        public MapTransformToolWindow(ThemeTokens theme)
            : base(Loc.MoveDialogTitle, theme)
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            // 0.1 Scope Section (Asian Mode only)
            pnlScope = new Panel
            {
                Location = new Point(16, 6),
                Size = new Size(218, 26),
                Visible = false
            };
            rdoAllSteps = new RadioButton
            {
                Text = Loc.MoveAllSteps,
                Location = new Point(0, 2),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = Theme.TextPrimary,
                Checked = true,
                Cursor = Cursors.Hand
            };
            rdoSelectedSteps = new RadioButton
            {
                Text = Loc.MoveSelectedSteps(0),
                Location = new Point(96, 2),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                ForeColor = Theme.TextPrimary,
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
                Text = Loc.MoveScaleLabel,
                Location = new Point(16, 8),
                Size = new Size(220, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = Theme.AccentPrimary
            };

            numScale = new NumberInput
            {
                Location = new Point(16, 28),
                Size = new Size(116, 24),
                Minimum = 10,
                Maximum = 500,
                Step = 1,
                Value = 100,
                Font = ThemeTokens.FontButton(FontStyle.Bold)
            };
            numScale.ApplyTheme(Theme);
            numScale.TextChanged += (s, e) =>
            {
                if (_isApplyingScale) return;
                ApplyScale(numScale.Value);
            };

            btnResetScale = new RoundedButton
            {
                Text = "100%",
                Location = new Point(138, 28),
                Size = new Size(96, 24),
                BorderRadius = Theme.RadiusSm,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = Theme.BgElevated,
                HoverColor = Theme.BgTertiary,
                ForeColor = Theme.TextPrimary
            };
            btnResetScale.Click += (s, e) =>
            {
                numScale.Value = 100;
                ApplyScale(100);
            };

            // 2. Move Step Selector
            lblMoveHeader = new Label
            {
                Text = Loc.MoveStepLabel,
                Location = new Point(16, 60),
                Size = new Size(220, 16),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                ForeColor = Theme.AccentPrimary
            };

            btnStep1 = CreateStepButton("1px", 1, 16, 80, 66);
            btnStep10 = CreateStepButton("10px", 10, 88, 80, 72);
            btnStep100 = CreateStepButton("100px", 100, 166, 80, 68);
            UpdateStepButtonStyles();

            // 3. Directional D-Pad Buttons (1 on Top, 3 on Bottom)
            int dpadCenterX = 125;
            int btnW = 44;
            int btnH = 26;

            btnUp = CreateDirectionButton(AppIcons.Up, dpadCenterX - (btnW / 2), 110, btnW, btnH, 0, -1);
            btnLeft = CreateDirectionButton(AppIcons.Left, dpadCenterX - (btnW / 2) - btnW - 4, 140, btnW, btnH, -1, 0);
            btnDown = CreateDirectionButton(AppIcons.Down, dpadCenterX - (btnW / 2), 140, btnW, btnH, 0, 1);
            btnRight = CreateDirectionButton(AppIcons.Right, dpadCenterX + (btnW / 2) + 4, 140, btnW, btnH, 1, 0);

            // 4. Bounds Indicator
            lblBounds = new Label
            {
                Text = Loc.MoveBoundsEmpty,
                Location = new Point(16, 174),
                Size = new Size(218, 16),
                Font = ThemeTokens.GetMonospaceFont(ThemeTokens.FontSizeSmall),
                ForeColor = Theme.TextTertiary,
                TextAlign = ContentAlignment.MiddleCenter
            };

            Body.Controls.AddRange(new Control[]
            {
                pnlScope,
                lblScaleHeader, numScale, btnResetScale,
                lblMoveHeader, btnStep1, btnStep10, btnStep100,
                btnUp, btnLeft, btnDown, btnRight,
                lblBounds
            });

            // 5. Close / Apply Button: moves are applied as they happen, so every way out keeps them
            this.AcceptButton = AddButton(Loc.MoveClose, DialogResult.OK, true);
            this.CancelButton = this.AcceptButton;

            SetBodySize(BodyWidth, BodyHeight);
        }

        private void UpdateLayoutForMode(bool isAdvanced)
        {
            _isAdvancedMode = isAdvanced;
            pnlScope.Visible = isAdvanced;
            int offset = isAdvanced ? 30 : 0;

            lblScaleHeader.Top = 8 + offset;
            numScale.Top = 28 + offset;
            btnResetScale.Top = 28 + offset;

            lblMoveHeader.Top = 60 + offset;
            btnStep1.Top = 80 + offset;
            btnStep10.Top = 80 + offset;
            btnStep100.Top = 80 + offset;

            int dpadCenterX = 125;
            int btnW = 44;
            btnUp.Location = new Point(dpadCenterX - (btnW / 2), 110 + offset);
            btnLeft.Location = new Point(dpadCenterX - (btnW / 2) - btnW - 4, 140 + offset);
            btnDown.Location = new Point(dpadCenterX - (btnW / 2), 140 + offset);
            btnRight.Location = new Point(dpadCenterX + (btnW / 2) + 4, 140 + offset);

            lblBounds.Top = 174 + offset;

            SetBodySize(BodyWidth, BodyHeight + offset);
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
                BorderRadius = Theme.RadiusSm,
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
            btn.NormalColor = active ? Theme.AccentPrimary : Theme.BgTertiary;
            btn.HoverColor = active ? Theme.AccentPrimaryHover : Theme.BgElevated;
            btn.ForeColor = active ? Color.White : Theme.TextSecondary;
            btn.Invalidate();
        }

        private RoundedButton CreateDirectionButton(string icon, int x, int y, int w, int h, int dirX, int dirY)
        {
            RoundedButton btn = new RoundedButton
            {
                Location = new Point(x, y),
                Size = new Size(w, h),
                BorderRadius = Theme.RadiusSm,
                NormalColor = Theme.BgElevated,
                HoverColor = Theme.AccentPrimary,
                ForeColor = Theme.TextPrimary,
                Image = AppIcons.Get(icon, Theme.TextPrimary, DirectionIconSize),
                ImageAlign = ContentAlignment.MiddleCenter
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
                rdoSelectedSteps.Text = Loc.MoveSelectedSteps(_selectedIndices.Count);
                rdoSelectedSteps.Enabled = true;
            }
            else
            {
                rdoSelectedSteps.Text = Loc.MoveSelectedSteps(0);
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
                lblBounds.Text = Loc.MoveBounds(minX, maxX, minY, maxY);
            }
            else
            {
                lblBounds.Text = Loc.MoveBoundsEmpty;
            }
        }
    }
}
