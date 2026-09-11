using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public class OverlayForm : Form
    {
        private List<Point> _points = new List<Point>();
        private List<ModernAutoClicker.Advanced.MacroStep> _advancedSteps = new List<ModernAutoClicker.Advanced.MacroStep>();
        private bool _isAdvancedMode = false;
        private int _selectedIndex = -1;
        private int _executingIndex = -1;
        private int _jitterRadius = 0;
        private Color _accentColor = ThemeTokens.DarkTheme().AccentPrimary;
        private bool _isRunningMode = false;
        private Point _lastCursorPos = Point.Empty;
        private System.Windows.Forms.Timer _cursorTrackerTimer;

        // Extensibility slot for future custom crosshair/marker icons
        public Image CustomCrosshairIcon { get; set; }

        public event Action<int> OnPointSelected;
        public event Action<int, Point> OnPointMoved;
        public event Action OnPointMoveFinished;

        public event Action<int, bool, Point> OnAdvancedPointMoved; // stepIndex, isStartPoint, newPoint
        public event Action<int, Point, Point> OnAdvancedAreaMoved; // stepIndex, newStartPoint, newEndPoint

        public void SetExecutingIndex(int index)
        {
            if (_executingIndex != index)
            {
                _executingIndex = index;
                this.Invalidate();
            }
        }

        private const int WM_NCHITTEST = 0x0084;
        private const int WM_MOUSEACTIVATE = 0x0021;
        private const int HTTRANSPARENT = -1;
        private const int HTCLIENT = 1;
        private const int MA_NOACTIVATE = 3;
        private bool _isDragging = false;
        private int _draggedPointIndex = -1;
        private bool _draggedIsStartPoint = true;
        private Point _dragOffset = Point.Empty;
        private Point _dragAreaOffset = Point.Empty;

        public bool IsInteracting
        {
            get { return _isDragging; }
        }

        public OverlayForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.TopMost = true;
            this.StartPosition = FormStartPosition.Manual;
            this.Location = SystemInformation.VirtualScreen.Location;
            this.Size = SystemInformation.VirtualScreen.Size;
            this.BackColor = Color.Magenta;
            this.TransparencyKey = Color.Magenta;
            this.Opacity = 0.60;
            this.DoubleBuffered = true;

            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.SupportsTransparentBackColor, true);
        }

        // CRITICAL: Prevent OverlayForm from ever stealing focus when shown or clicked!
        protected override bool ShowWithoutActivation
        {
            get { return true; }
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                // WS_EX_NOACTIVATE (0x08000000): Doesn't steal focus
                // WS_EX_TOOLWINDOW (0x80): Doesn't show in Alt+Tab
                // WS_EX_TOPMOST (0x08): Always on top
                cp.ExStyle |= 0x08000000 | 0x80 | 0x08;
                return cp;
            }
        }

        private bool _isClickThrough = false;

        public void SetClickThrough(bool clickThrough)
        {
            _isClickThrough = clickThrough;
            if (!this.IsHandleCreated) return;
            IntPtr exStyle = NativeMethods.GetWindowLongPtr(this.Handle, NativeMethods.GWL_EXSTYLE);
            long currentStyle = exStyle.ToInt64();
            if (clickThrough)
            {
                currentStyle |= NativeMethods.WS_EX_TRANSPARENT;
            }
            else
            {
                currentStyle &= ~NativeMethods.WS_EX_TRANSPARENT;
            }
            NativeMethods.SetWindowLongPtr(this.Handle, NativeMethods.GWL_EXSTYLE, (IntPtr)currentStyle);
        }

        protected override void WndProc(ref Message m)
        {
            if (_isClickThrough)
            {
                base.WndProc(ref m);
                return;
            }
            if (m.Msg == WM_MOUSEACTIVATE)
            {
                // CRITICAL: Handle mouse clicks and dragging WITHOUT deactivating MainForm!
                m.Result = (IntPtr)MA_NOACTIVATE;
                return;
            }
            if (m.Msg == WM_NCHITTEST)
            {
                int x = (short)(m.LParam.ToInt32() & 0xFFFF);
                int y = (short)((m.LParam.ToInt32() >> 16) & 0xFFFF);
                Point clientPt = this.PointToClient(new Point(x, y));

                bool isStart;
                if (GetPointAt(clientPt, out isStart) != -1)
                {
                    m.Result = (IntPtr)HTCLIENT;
                    return;
                }
                else
                {
                    m.Result = (IntPtr)HTTRANSPARENT;
                    return;
                }
            }
            base.WndProc(ref m);
        }

        private Rectangle GetMarkerHitRectangle(Point pt, string text)
        {
            int charCount = string.IsNullOrEmpty(text) ? 2 : text.Length;
            int textWidth = Math.Max(24, charCount * 8 + 10);
            int totalWidth = 20 + textWidth; // from pt.X - 15 to pt.X + 5 + textWidth
            return new Rectangle(pt.X - 15, pt.Y - 18, totalWidth, 34);
        }

        private int GetPointAt(Point p, out bool isStartPoint)
        {
            isStartPoint = true;

            if (_isAdvancedMode)
            {
                if (_advancedSteps == null || _advancedSteps.Count == 0) return -1;

                for (int i = _advancedSteps.Count - 1; i >= 0; i--)
                {
                    var s = _advancedSteps[i];
                    if (!s.Enabled) continue;

                    if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.DragDrop)
                    {
                        // Check EndPoint first
                        if (s.EndPoint != Point.Empty)
                        {
                            string endText = GetAdvancedStepLabel(s, i, false);
                            Rectangle endHit = GetMarkerHitRectangle(s.EndPoint, endText);
                            if (endHit.Contains(p))
                            {
                                isStartPoint = false;
                                return i;
                            }
                        }

                        // Check StartPoint
                        if (s.StartPoint != Point.Empty)
                        {
                            string startText = GetAdvancedStepLabel(s, i, true);
                            Rectangle startHit = GetMarkerHitRectangle(s.StartPoint, startText);
                            if (startHit.Contains(p))
                            {
                                isStartPoint = true;
                                return i;
                            }
                        }
                    }
                    else if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.IfColorArea)
                    {
                        if (s.StartPoint != Point.Empty && s.EndPoint != Point.Empty)
                        {
                            string text = string.Format("{0}: If Area", i + 1);
                            Rectangle hitMarker = GetMarkerHitRectangle(s.StartPoint, text);
                            int rx = Math.Min(s.StartPoint.X, s.EndPoint.X);
                            int ry = Math.Min(s.StartPoint.Y, s.EndPoint.Y);
                            int rw = Math.Max(1, Math.Abs(s.EndPoint.X - s.StartPoint.X));
                            int rh = Math.Max(1, Math.Abs(s.EndPoint.Y - s.StartPoint.Y));
                            Rectangle areaRect = new Rectangle(rx, ry, rw, rh);

                            if (hitMarker.Contains(p) || areaRect.Contains(p))
                            {
                                isStartPoint = true;
                                return i;
                            }
                        }
                    }
                    else if (HasCoordinates(s.ActionType))
                    {
                        if (s.StartPoint != Point.Empty)
                        {
                            string text = GetAdvancedStepLabel(s, i, true);
                            Rectangle hitRect = GetMarkerHitRectangle(s.StartPoint, text);
                            if (hitRect.Contains(p))
                            {
                                isStartPoint = true;
                                return i;
                            }
                        }
                    }
                }
                return -1;
            }
            else
            {
                if (_points == null || _points.Count == 0) return -1;
                
                for (int i = _points.Count - 1; i >= 0; i--)
                {
                    Point pt = _points[i];
                    string text = (i + 1).ToString();
                    Rectangle hitRect = GetMarkerHitRectangle(pt, text);
                    if (hitRect.Contains(p))
                    {
                        return i;
                    }
                }
                return -1;
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left)
            {
                bool isStart;
                int hitIdx = GetPointAt(e.Location, out isStart);
                if (hitIdx != -1)
                {
                    _isDragging = true;
                    _draggedPointIndex = hitIdx;
                    _draggedIsStartPoint = isStart;
                    _selectedIndex = hitIdx;

                    Point targetPt = Point.Empty;
                    if (_isAdvancedMode)
                    {
                        var hitStep = _advancedSteps[hitIdx];
                        if (hitStep.ActionType == ModernAutoClicker.Advanced.MacroActionType.IfColorArea)
                        {
                            targetPt = hitStep.StartPoint;
                            _dragAreaOffset = new Point(hitStep.EndPoint.X - hitStep.StartPoint.X, hitStep.EndPoint.Y - hitStep.StartPoint.Y);
                        }
                        else
                        {
                            targetPt = isStart ? hitStep.StartPoint : hitStep.EndPoint;
                        }
                    }
                    else
                    {
                        targetPt = _points[hitIdx];
                    }

                    _dragOffset = new Point(e.X - targetPt.X, e.Y - targetPt.Y);
                    this.Cursor = Cursors.SizeAll;
                    this.Invalidate();

                    if (OnPointSelected != null)
                    {
                        OnPointSelected(hitIdx);
                    }
                }
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            if (_isDragging && _draggedPointIndex >= 0)
            {
                Point newPt = new Point(e.X - _dragOffset.X, e.Y - _dragOffset.Y);

                if (_isAdvancedMode && _draggedPointIndex < _advancedSteps.Count)
                {
                    var s = _advancedSteps[_draggedPointIndex];
                    if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.IfColorArea)
                    {
                        s.StartPoint = newPt;
                        s.EndPoint = new Point(newPt.X + _dragAreaOffset.X, newPt.Y + _dragAreaOffset.Y);

                        this.Invalidate();
                        if (OnAdvancedAreaMoved != null)
                        {
                            OnAdvancedAreaMoved(_draggedPointIndex, s.StartPoint, s.EndPoint);
                        }
                    }
                    else
                    {
                        if (_draggedIsStartPoint) s.StartPoint = newPt;
                        else s.EndPoint = newPt;

                        this.Invalidate();
                        if (OnAdvancedPointMoved != null)
                        {
                            OnAdvancedPointMoved(_draggedPointIndex, _draggedIsStartPoint, newPt);
                        }
                    }
                }
                else if (!_isAdvancedMode && _draggedPointIndex < _points.Count)
                {
                    _points[_draggedPointIndex] = newPt;
                    this.Invalidate();
                    if (OnPointMoved != null)
                    {
                        OnPointMoved(_draggedPointIndex, newPt);
                    }
                }
            }
            else
            {
                bool isStart;
                int hitIdx = GetPointAt(e.Location, out isStart);
                this.Cursor = (hitIdx != -1) ? Cursors.Hand : Cursors.Default;
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (_isDragging)
            {
                _isDragging = false;
                _draggedPointIndex = -1;
                this.Cursor = Cursors.Default;

                if (OnPointMoveFinished != null)
                {
                    OnPointMoveFinished();
                }
            }
        }

        private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        private const uint SWP_NOSIZE = 0x0001;
        private const uint SWP_NOMOVE = 0x0002;
        private const uint SWP_NOACTIVATE = 0x0010;
        private const uint SWP_SHOWWINDOW = 0x0040;

        public void ShowOverlay()
        {
            if (!this.IsHandleCreated)
            {
                this.CreateHandle();
            }
            NativeMethods.SetWindowPos(this.Handle, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
            NativeMethods.ShowWindow(this.Handle, NativeMethods.SW_SHOWNOACTIVATE);
        }

        public void ClearAndHide()
        {
            _points.Clear();
            _advancedSteps.Clear();
            _selectedIndex = -1;
            _executingIndex = -1;
            this.Invalidate();
            this.Update();
            if (this.IsHandleCreated)
            {
                NativeMethods.ShowWindow(this.Handle, NativeMethods.SW_HIDE);
            }
        }

        public void UpdatePoints(List<Point> points, int selectedIndex, Color accent, Color secondary, int jitterRadius = 0)
        {
            _isAdvancedMode = false;
            _jitterRadius = Math.Max(0, jitterRadius);
            if (!_isDragging)
            {
                _points = (points != null && points.Count > 0) ? new List<Point>(points) : new List<Point>();
                _selectedIndex = selectedIndex;
            }
            _accentColor = accent;
            this.Invalidate();
        }

        public void UpdateAdvancedSteps(List<ModernAutoClicker.Advanced.MacroStep> steps, int selectedIndex, Color accent, Color secondary, int jitterRadius = 0)
        {
            _isAdvancedMode = true;
            _jitterRadius = Math.Max(0, jitterRadius);
            if (!_isDragging)
            {
                _advancedSteps = (steps != null && steps.Count > 0) ? new List<ModernAutoClicker.Advanced.MacroStep>(steps) : new List<ModernAutoClicker.Advanced.MacroStep>();
                _selectedIndex = selectedIndex;
            }
            _accentColor = accent;
            this.Invalidate();
        }

        public void SetRunningMode(bool running, Color accentColor)
        {
            _isRunningMode = running;
            _accentColor = accentColor;

            if (_isRunningMode)
            {
                SetClickThrough(true);
                if (_cursorTrackerTimer == null)
                {
                    _cursorTrackerTimer = new System.Windows.Forms.Timer { Interval = 16 }; // ~60 FPS
                    _cursorTrackerTimer.Tick += (s, e) =>
                    {
                        if (!_isRunningMode || !this.IsHandleCreated || this.IsDisposed)
                        {
                            if (_cursorTrackerTimer != null) _cursorTrackerTimer.Stop();
                            return;
                        }

                        NativeMethods.POINT p;
                        if (NativeMethods.GetCursorPos(out p))
                        {
                            Point curScreenPt = new Point(p.X, p.Y);
                            Point clientPt = this.PointToClient(curScreenPt);

                            if (clientPt != _lastCursorPos)
                            {
                                Rectangle oldRect = new Rectangle(_lastCursorPos.X - 22, _lastCursorPos.Y - 22, 44, 44);
                                Rectangle newRect = new Rectangle(clientPt.X - 22, clientPt.Y - 22, 44, 44);
                                _lastCursorPos = clientPt;

                                if (oldRect.Width > 0 && oldRect.Height > 0) this.Invalidate(oldRect);
                                if (newRect.Width > 0 && newRect.Height > 0) this.Invalidate(newRect);
                            }
                        }
                    };
                }
                _cursorTrackerTimer.Start();
                ShowOverlay();
            }
            else
            {
                if (_cursorTrackerTimer != null)
                {
                    _cursorTrackerTimer.Stop();
                }
                if (_lastCursorPos != Point.Empty)
                {
                    Rectangle oldRect = new Rectangle(_lastCursorPos.X - 22, _lastCursorPos.Y - 22, 44, 44);
                    _lastCursorPos = Point.Empty;
                    this.Invalidate(oldRect);
                }
            }
            this.Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            if (_isAdvancedMode)
            {
                if (_advancedSteps != null && _advancedSteps.Count > 0)
                {
                    DrawAdvancedOverlay(e.Graphics);
                }
            }
            else
            {
                if (_points != null && _points.Count > 0)
                {
                    DrawBasicOverlay(e.Graphics);
                }
            }

            // Draw 2px Accent Primary Cursor Ring when Running
            if (_isRunningMode && _lastCursorPos != Point.Empty)
            {
                DrawCursorRing(e.Graphics, _lastCursorPos);
            }
        }

        private void DrawCursorRing(Graphics g, Point pt)
        {
            g.SmoothingMode = SmoothingMode.None; // Zero magenta fringing
            using (Pen pen = new Pen(_accentColor, 2f))
            {
                g.DrawEllipse(pen, pt.X - 16, pt.Y - 16, 32, 32);
            }
        }

        private void DrawBasicOverlay(Graphics g)
        {
            g.SmoothingMode = SmoothingMode.None;
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.None;
            g.TextRenderingHint = TextRenderingHint.SingleBitPerPixelGridFit;

            using (SolidBrush blackBrush = new SolidBrush(Color.Black))
            using (SolidBrush whiteBrush = new SolidBrush(Color.White))
            using (SolidBrush highlightBrush = new SolidBrush(_accentColor))
            using (Font numFont = new Font("Tahoma", 8.5F, FontStyle.Bold))
            {
                for (int i = 0; i < _points.Count; i++)
                {
                    Point pt = _points[i];
                    string label = (i + 1).ToString();
                    bool isSelected = (i == _selectedIndex);
                    bool isExecuting = (i == _executingIndex);
                    DrawSingleMarker(g, pt, label, isSelected, isExecuting, blackBrush, whiteBrush, highlightBrush, numFont);
                }
            }
        }

        private void DrawAdvancedOverlay(Graphics g)
        {
            // CRITICAL: Use SmoothingMode.None to prevent anti-aliasing against the Magenta TransparencyKey, eliminating all purple/magenta fringing
            g.SmoothingMode = SmoothingMode.None;
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.None;
            g.TextRenderingHint = TextRenderingHint.SingleBitPerPixelGridFit;

            Color selectBlue = Color.FromArgb(14, 165, 233);
            Color execRed = Color.FromArgb(239, 68, 68);

            using (SolidBrush blackBrush = new SolidBrush(Color.Black))
            using (SolidBrush whiteBrush = new SolidBrush(Color.White))
            using (SolidBrush selectBrush = new SolidBrush(selectBlue))
            using (SolidBrush execBrush = new SolidBrush(execRed))
            using (Pen selectPen = new Pen(selectBlue, 5))
            using (Pen execPen = new Pen(execRed, 5))
            using (Pen blackOutlinePen = new Pen(Color.Black, 3))
            using (Pen whiteDashPen = new Pen(Color.White, 1))
            {
                whiteDashPen.DashPattern = new float[] { 4, 3 };

                // 1. Draw connecting dashed lines and arrowheads for Drag & Drop steps
                for (int i = 0; i < _advancedSteps.Count; i++)
                {
                    var s = _advancedSteps[i];
                    if (!s.Enabled) continue;

                    if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.DragDrop)
                    {
                        if (s.StartPoint != Point.Empty && s.EndPoint != Point.Empty && s.StartPoint != s.EndPoint)
                        {
                            bool isSelected = (i == _selectedIndex);
                            bool isExecuting = (i == _executingIndex);

                            Point p1 = s.StartPoint;
                            Point p2 = s.EndPoint;
                            double dx = p2.X - p1.X;
                            double dy = p2.Y - p1.Y;
                            double len = Math.Sqrt(dx * dx + dy * dy);

                            if (len > 8)
                            {
                                double ux = dx / len;
                                double uy = dy / len;
                                double nx = -uy;
                                double ny = ux;

                                Point pBase = new Point((int)Math.Round(p2.X - ux * 10), (int)Math.Round(p2.Y - uy * 10));

                                // 1.1 Line from p1 to pBase
                                if (isExecuting)
                                {
                                    g.DrawLine(execPen, p1, pBase);
                                }
                                else if (isSelected)
                                {
                                    g.DrawLine(selectPen, p1, pBase);
                                }
                                g.DrawLine(blackOutlinePen, p1, pBase);
                                g.DrawLine(whiteDashPen, p1, pBase);

                                // 1.2 Arrow Head Polygons
                                if (isExecuting)
                                {
                                    Point[] execHead = new Point[]
                                    {
                                        new Point((int)Math.Round(p2.X + ux * 2), (int)Math.Round(p2.Y + uy * 2)),
                                        new Point((int)Math.Round(p2.X - ux * 13 + nx * 7), (int)Math.Round(p2.Y - uy * 13 + ny * 7)),
                                        new Point((int)Math.Round(p2.X - ux * 13 - nx * 7), (int)Math.Round(p2.Y - uy * 13 - ny * 7))
                                    };
                                    g.FillPolygon(execBrush, execHead);
                                }
                                else if (isSelected)
                                {
                                    Point[] selHead = new Point[]
                                    {
                                        new Point((int)Math.Round(p2.X + ux * 2), (int)Math.Round(p2.Y + uy * 2)),
                                        new Point((int)Math.Round(p2.X - ux * 13 + nx * 7), (int)Math.Round(p2.Y - uy * 13 + ny * 7)),
                                        new Point((int)Math.Round(p2.X - ux * 13 - nx * 7), (int)Math.Round(p2.Y - uy * 13 - ny * 7))
                                    };
                                    g.FillPolygon(selectBrush, selHead);
                                }

                                Point[] blackHead = new Point[]
                                {
                                    new Point((int)Math.Round(p2.X + ux * 1), (int)Math.Round(p2.Y + uy * 1)),
                                    new Point((int)Math.Round(p2.X - ux * 11 + nx * 5.5), (int)Math.Round(p2.Y - uy * 11 + ny * 5.5)),
                                    new Point((int)Math.Round(p2.X - ux * 11 - nx * 5.5), (int)Math.Round(p2.Y - uy * 11 - ny * 5.5))
                                };
                                g.FillPolygon(blackBrush, blackHead);

                                Point[] whiteHead = new Point[]
                                {
                                    new Point(p2.X, p2.Y),
                                    new Point((int)Math.Round(p2.X - ux * 9 + nx * 3.5), (int)Math.Round(p2.Y - uy * 9 + ny * 3.5)),
                                    new Point((int)Math.Round(p2.X - ux * 9 - nx * 3.5), (int)Math.Round(p2.Y - uy * 9 - ny * 3.5))
                                };
                                g.FillPolygon(whiteBrush, whiteHead);
                            }
                        }
                    }
                    else if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.IfColorArea)
                    {
                        if (s.StartPoint != Point.Empty && s.EndPoint != Point.Empty)
                        {
                            bool isSelected = (i == _selectedIndex);
                            bool isExecuting = (i == _executingIndex);

                            int rx = Math.Min(s.StartPoint.X, s.EndPoint.X);
                            int ry = Math.Min(s.StartPoint.Y, s.EndPoint.Y);
                            int rw = Math.Max(1, Math.Abs(s.EndPoint.X - s.StartPoint.X));
                            int rh = Math.Max(1, Math.Abs(s.EndPoint.Y - s.StartPoint.Y));
                            Rectangle rect = new Rectangle(rx, ry, rw, rh);

                            if (isExecuting) g.DrawRectangle(execPen, rect);
                            else if (isSelected) g.DrawRectangle(selectPen, rect);
                            g.DrawRectangle(blackOutlinePen, rect);
                            g.DrawRectangle(whiteDashPen, rect);
                        }
                    }
                }
            }

            // 2. Draw crisp 1-bit markers
            using (SolidBrush blackBrush = new SolidBrush(Color.Black))
            using (SolidBrush whiteBrush = new SolidBrush(Color.White))
            using (SolidBrush highlightBrush = new SolidBrush(selectBlue))
            using (Font numFont = new Font("Tahoma", 8.5F, FontStyle.Bold))
            {
                for (int i = 0; i < _advancedSteps.Count; i++)
                {
                    var s = _advancedSteps[i];
                    if (!s.Enabled) continue;

                    bool isSelected = (i == _selectedIndex);
                    bool isExecuting = (i == _executingIndex);

                    if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.DragDrop)
                    {
                        if (s.StartPoint != Point.Empty)
                        {
                            DrawSingleMarker(g, s.StartPoint, GetAdvancedStepLabel(s, i, true), isSelected, isExecuting, blackBrush, whiteBrush, highlightBrush, numFont);
                        }
                        if (s.EndPoint != Point.Empty)
                        {
                            DrawSingleMarker(g, s.EndPoint, GetAdvancedStepLabel(s, i, false), isSelected, isExecuting, blackBrush, whiteBrush, highlightBrush, numFont);
                        }
                    }
                    else if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.IfColorArea)
                    {
                        if (s.StartPoint != Point.Empty)
                        {
                            DrawSingleMarker(g, s.StartPoint, string.Format("{0}: If Area", i + 1), isSelected, isExecuting, blackBrush, whiteBrush, highlightBrush, numFont);
                        }
                    }
                    else if (HasCoordinates(s.ActionType))
                    {
                        if (s.StartPoint != Point.Empty)
                        {
                            DrawSingleMarker(g, s.StartPoint, GetAdvancedStepLabel(s, i, true), isSelected, isExecuting, blackBrush, whiteBrush, highlightBrush, numFont);
                        }
                    }
                }
            }
        }

        private void DrawSingleMarker(Graphics g, Point pt, string text, bool isSelected, bool isExecuting, SolidBrush blackBrush, SolidBrush whiteBrush, SolidBrush highlightBrush, Font font)
        {
            const int arm = 10;
            int cx = pt.X;
            int cy = pt.Y;
            int nx = cx + 4;
            int ny = cy - 13;

            // Extensibility check: If custom icon is assigned in the future, render image icon!
            if (CustomCrosshairIcon != null)
            {
                int iconW = CustomCrosshairIcon.Width;
                int iconH = CustomCrosshairIcon.Height;
                g.DrawImage(CustomCrosshairIcon, cx - (iconW / 2), cy - (iconH / 2), iconW, iconH);
                return;
            }

            // LAYER -1: RANDOM JITTER RADIUS CIRCLE (Visible when Jitter > 0)
            if (_jitterRadius > 0)
            {
                int r = _jitterRadius;
                Rectangle jitterRect = new Rectangle(cx - r, cy - r, r * 2, r * 2);
                using (Pen blackPen = new Pen(Color.Black, 3))
                using (Pen dashPen = new Pen(Color.FromArgb(245, 158, 11), 1)) // Vibrant Jitter Amber
                {
                    dashPen.DashPattern = new float[] { 3, 2 };
                    g.DrawEllipse(blackPen, jitterRect);
                    g.DrawEllipse(dashPen, jitterRect);
                }
            }

            // LAYER 0: LIVE EXECUTING GLOW (Vibrant Red / Danger Ring & Underlay)
            if (isExecuting)
            {
                Color execColor = Color.FromArgb(239, 68, 68); // Live Active Red
                using (SolidBrush execBrush = new SolidBrush(execColor))
                {
                    g.FillRectangle(execBrush, cx - arm - 6, cy - 7, (arm * 2) + 13, 15);
                    g.FillRectangle(execBrush, cx - 7, cy - arm - 6, 15, (arm * 2) + 13);

                    for (int ox = -6; ox <= 6; ox++)
                    {
                        for (int oy = -6; oy <= 6; oy++)
                        {
                            int maxDist = Math.Max(Math.Abs(ox), Math.Abs(oy));
                            if (maxDist >= 2 && maxDist <= 6)
                            {
                                g.DrawString(text, font, execBrush, nx + ox, ny + oy, StringFormat.GenericTypographic);
                            }
                        }
                    }
                }
            }
            // LAYER 1: SELECTION HIGHLIGHT UNDERLAY
            else if (isSelected)
            {
                g.FillRectangle(highlightBrush, cx - arm - 4, cy - 5, (arm * 2) + 9, 11);
                g.FillRectangle(highlightBrush, cx - 5, cy - arm - 4, 11, (arm * 2) + 9);

                for (int ox = -5; ox <= 5; ox++)
                {
                    for (int oy = -5; oy <= 5; oy++)
                    {
                        int maxDist = Math.Max(Math.Abs(ox), Math.Abs(oy));
                        if (maxDist >= 2 && maxDist <= 5)
                        {
                            g.DrawString(text, font, highlightBrush, nx + ox, ny + oy, StringFormat.GenericTypographic);
                        }
                    }
                }
            }

            // LAYER 2: 1px BLACK OUTLINE
            g.FillRectangle(blackBrush, cx - arm, cy - 1, (arm * 2) + 1, 3);
            g.FillRectangle(blackBrush, cx - 1, cy - arm, 3, (arm * 2) + 1);

            int[] dx = new int[] { -1, 0, 1, -1, 1, -1, 0, 1 };
            int[] dy = new int[] { -1, -1, -1, 0, 0, 1, 1, 1 };
            for (int k = 0; k < 8; k++)
            {
                g.DrawString(text, font, blackBrush, nx + dx[k], ny + dy[k], StringFormat.GenericTypographic);
            }

            // LAYER 3: 1px WHITE CORE
            g.FillRectangle(whiteBrush, cx - arm + 1, cy, (arm * 2) - 1, 1);
            g.FillRectangle(whiteBrush, cx, cy - arm + 1, 1, (arm * 2) - 1);
            g.DrawString(text, font, whiteBrush, nx, ny, StringFormat.GenericTypographic);
        }

        public static string GetAdvancedStepLabel(ModernAutoClicker.Advanced.MacroStep s, int index, bool isStart)
        {
            int num = index + 1;
            if (s.ActionType == ModernAutoClicker.Advanced.MacroActionType.DragDrop)
            {
                return isStart ? string.Format("{0}A (Start)", num) : string.Format("{0}B (End)", num);
            }

            string typeName;
            switch (s.ActionType)
            {
                case ModernAutoClicker.Advanced.MacroActionType.LeftClick:
                    typeName = "Left";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.RightClick:
                    typeName = "Right";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.MiddleClick:
                    typeName = "Middle";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.DoubleClick:
                    typeName = "Double";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.WaitColor:
                    typeName = "Wait Color";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.IfColor:
                    typeName = "If Color";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.IfColorArea:
                    typeName = "If Area";
                    break;
                case ModernAutoClicker.Advanced.MacroActionType.WaitChange:
                    typeName = "Wait Change";
                    break;
                default:
                    typeName = "Click";
                    break;
            }

            return string.Format("{0}: {1}", num, typeName);
        }

        public static bool HasCoordinates(ModernAutoClicker.Advanced.MacroActionType actionType)
        {
            return actionType != ModernAutoClicker.Advanced.MacroActionType.KeyPress &&
                   actionType != ModernAutoClicker.Advanced.MacroActionType.TypeText &&
                   actionType != ModernAutoClicker.Advanced.MacroActionType.Delay &&
                   actionType != ModernAutoClicker.Advanced.MacroActionType.RunScript;
        }
    }
}
