using System;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public class PointRowControl : UserControl
    {
        private Point _point;
        private int _index;
        private ThemeTokens _theme;
        private bool _isSelected = false;
        private bool _isBeingDragged = false;

        // Controls
        private Label lblIndex;
        private Label lblCoord;
        private Label btnDelete;

        public event Action<PointRowControl> OnDeleteRequested;
        public event Action<PointRowControl> OnRowSelected;
        public event Action<PointRowControl> OnDragStarted;
        public event Action<PointRowControl> OnPickCoordinateRequested;

        public Point Point { get { return _point; } set { _point = value; RefreshDisplay(); } }
        public int Index
        {
            get { return _index; }
            set
            {
                _index = value;
                if (lblIndex != null) lblIndex.Text = string.Format("#{0}", _index + 1);
            }
        }

        public bool IsSelected
        {
            get { return _isSelected; }
            set
            {
                _isSelected = value;
                UpdateRowBackground();
            }
        }

        public bool IsBeingDragged
        {
            get { return _isBeingDragged; }
            set
            {
                _isBeingDragged = value;
                UpdateRowBackground();
            }
        }

        public void ResetDragState()
        {
            _isMouseDown = false;
            _dragStartPos = Point.Empty;
            _isBeingDragged = false;
            UpdateRowBackground();
        }

        public PointRowControl(Point pt, int index, ThemeTokens theme)
        {
            _point = pt;
            _index = index;
            _theme = theme ?? ThemeTokens.DarkTheme();

            this.Size = new Size(160, 18);
            this.Margin = new Padding(0, 0, 0, 1);
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;

            this.MouseDown += Row_MouseDown;
            this.MouseMove += Row_MouseMove;
            this.MouseUp += Row_MouseUp;

            InitializeRow();
            ApplyTheme(_theme);
        }

        private Point _dragStartPos = Point.Empty;
        private bool _isMouseDown = false;

        private void Row_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                _isMouseDown = true;
                _dragStartPos = Cursor.Position;
                if (OnRowSelected != null) OnRowSelected(this);
            }
        }

        private void Row_MouseMove(object sender, MouseEventArgs e)
        {
            if (_isMouseDown && (e.Button & MouseButtons.Left) == MouseButtons.Left)
            {
                Point cur = Cursor.Position;
                int dx = Math.Abs(cur.X - _dragStartPos.X);
                int dy = Math.Abs(cur.Y - _dragStartPos.Y);

                if (dx > 5 || dy > 5)
                {
                    _isMouseDown = false;
                    _dragStartPos = Point.Empty;
                    if (OnDragStarted != null) OnDragStarted(this);
                }
            }
        }

        private void Row_MouseUp(object sender, MouseEventArgs e)
        {
            if (_isMouseDown)
            {
                _isMouseDown = false;
                _dragStartPos = Point.Empty;
            }
        }

        private void InitializeRow()
        {
            int x = 4;

            // 1. Index (Drag Handle)
            lblIndex = new Label
            {
                Text = string.Format("#{0}", _index + 1),
                Location = new Point(x, 0),
                Size = new Size(24, 18),
                Font = new Font("Segoe UI", 7.0F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
                Cursor = Cursors.SizeAll
            };
            lblIndex.MouseDown += Row_MouseDown;
            lblIndex.MouseMove += Row_MouseMove;
            lblIndex.MouseUp += Row_MouseUp;
            x += 25;

            // 2. Coordinates Label
            lblCoord = new Label
            {
                Text = string.Format("({0}, {1})", _point.X, _point.Y),
                Location = new Point(x, 0),
                Size = new Size(106, 18),
                Font = ThemeTokens.GetMonospaceFont(7.0F),
                TextAlign = ContentAlignment.MiddleLeft,
                Cursor = Cursors.Hand
            };
            lblCoord.Click += (s, e) =>
            {
                if (OnRowSelected != null) OnRowSelected(this);
                if (OnPickCoordinateRequested != null) OnPickCoordinateRequested(this);
            };

            // 3. Delete Button "✕"
            btnDelete = new Label
            {
                Text = "✕",
                Location = new Point(140, 0),
                Size = new Size(16, 18),
                Font = new Font("Segoe UI", 7.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Cursor = Cursors.Hand,
                ForeColor = _theme.Danger
            };
            btnDelete.MouseEnter += (s, e) => { btnDelete.ForeColor = _theme.CRed; };
            btnDelete.MouseLeave += (s, e) => { btnDelete.ForeColor = _theme.Danger; };
            btnDelete.Click += (s, e) => { if (OnDeleteRequested != null) OnDeleteRequested(this); };

            this.Controls.AddRange(new Control[] { lblIndex, lblCoord, btnDelete });
        }

        public void RefreshDisplay()
        {
            if (lblCoord != null) lblCoord.Text = string.Format("({0}, {1})", _point.X, _point.Y);
        }

        private void UpdateRowBackground()
        {
            if (_isBeingDragged)
            {
                this.BackColor = Color.FromArgb(30, _theme.AccentPrimary.R, _theme.AccentPrimary.G, _theme.AccentPrimary.B);
            }
            else if (_isSelected)
            {
                this.BackColor = Color.FromArgb(45, _theme.AccentPrimary.R, _theme.AccentPrimary.G, _theme.AccentPrimary.B);
            }
            else
            {
                this.BackColor = _theme.BgTertiary;
            }
            this.Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (_isSelected && !_isBeingDragged)
            {
                using (SolidBrush accentBrush = new SolidBrush(_theme.AccentPrimary))
                {
                    e.Graphics.FillRectangle(accentBrush, 0, 0, 3, this.Height);
                }
                using (Pen borderPen = new Pen(Color.FromArgb(120, _theme.AccentPrimary.R, _theme.AccentPrimary.G, _theme.AccentPrimary.B), 1))
                {
                    e.Graphics.DrawRectangle(borderPen, 0, 0, this.Width - 1, this.Height - 1);
                }
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            UpdateRowBackground();
            if (lblIndex != null) lblIndex.ForeColor = t.TextSecondary;
            if (lblCoord != null) lblCoord.ForeColor = t.TextPrimary;
            if (btnDelete != null) btnDelete.ForeColor = t.Danger;
            this.Invalidate();
        }
    }
}
