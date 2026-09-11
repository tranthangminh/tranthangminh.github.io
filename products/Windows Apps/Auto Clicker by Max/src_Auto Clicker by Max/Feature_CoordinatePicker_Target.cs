using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public class CoordinatePicker : Form
    {
        public event Action<Point> OnPointPicked;
        public event Action<Point, Color> OnPointAndColorPicked;
        public event Action<Point, Color, NativeMethods.WindowTargetInfo, Point> OnPointSelectedWithWindow; // screenPt, color, winInfo, clientPt
        public event Action<Point, Point, Color, NativeMethods.WindowTargetInfo, Point, Point> OnAreaSelectedWithWindow; // screenA, screenB, color, winInfo, clientA, clientB

        public bool IsAreaSelectionMode { get; set; }

        private Bitmap _screenBitmap;
        private Point _currentMouse = Point.Empty;
        private Color _currentColor = Color.Black;
        private bool _isDraggingArea = false;
        private Point _dragStartPoint = Point.Empty;

        public CoordinatePicker()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.Manual;
            this.ShowInTaskbar = false;
            this.TopMost = true;
            this.Cursor = Cursors.Cross;
            this.DoubleBuffered = true;

            int minX = 0, minY = 0, maxX = 0, maxY = 0;
            foreach (Screen screen in Screen.AllScreens)
            {
                minX = Math.Min(minX, screen.Bounds.X);
                minY = Math.Min(minY, screen.Bounds.Y);
                maxX = Math.Max(maxX, screen.Bounds.Right);
                maxY = Math.Max(maxY, screen.Bounds.Bottom);
            }
            Rectangle totalBounds = new Rectangle(minX, minY, maxX - minX, maxY - minY);
            this.Bounds = totalBounds;

            // Capture frozen desktop screen for 100% reliable click capture and native cross cursor
            try
            {
                _screenBitmap = new Bitmap(totalBounds.Width, totalBounds.Height);
                using (Graphics g = Graphics.FromImage(_screenBitmap))
                {
                    g.CopyFromScreen(totalBounds.X, totalBounds.Y, 0, 0, totalBounds.Size, CopyPixelOperation.SourceCopy);
                }
                this.BackgroundImage = _screenBitmap;
            }
            catch
            {
                _screenBitmap = null;
            }

            NativeMethods.POINT p;
            if (NativeMethods.GetCursorPos(out p))
            {
                _currentMouse = new Point(p.X, p.Y);
                _currentColor = NativeMethods.GetPixelColor(p.X, p.Y);
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            Point pt = new Point(this.Left + e.X, this.Top + e.Y);
            _currentMouse = pt;

            if (_screenBitmap != null && e.X >= 0 && e.X < _screenBitmap.Width && e.Y >= 0 && e.Y < _screenBitmap.Height)
            {
                _currentColor = _screenBitmap.GetPixel(e.X, e.Y);
            }
            else
            {
                _currentColor = NativeMethods.GetPixelColor(pt.X, pt.Y);
            }

            this.Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left)
            {
                Point pt = new Point(this.Left + e.X, this.Top + e.Y);
                if (IsAreaSelectionMode)
                {
                    _isDraggingArea = true;
                    _dragStartPoint = pt;
                    this.Invalidate();
                }
                else
                {
                    ConfirmPoint(pt);
                }
            }
            else if (e.Button == MouseButtons.Right)
            {
                ClosePicker();
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (IsAreaSelectionMode && _isDraggingArea && e.Button == MouseButtons.Left)
            {
                _isDraggingArea = false;
                Point ptEnd = new Point(this.Left + e.X, this.Top + e.Y);
                ConfirmArea(_dragStartPoint, ptEnd);
            }
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            base.OnKeyDown(e);
            if (e.KeyCode == Keys.Space || e.KeyCode == Keys.Enter)
            {
                if (IsAreaSelectionMode)
                {
                    Point pt = _currentMouse;
                    ConfirmArea(new Point(pt.X - 50, pt.Y - 50), new Point(pt.X + 50, pt.Y + 50));
                }
                else
                {
                    ConfirmPoint(_currentMouse);
                }
            }
            else if (e.KeyCode == Keys.Escape)
            {
                ClosePicker();
            }
        }

        private void ConfirmPoint(Point pt)
        {
            Color pickedColor = _currentColor;
            if (pickedColor == Color.Black)
            {
                pickedColor = NativeMethods.GetPixelColor(pt.X, pt.Y);
            }

            // Detect window under cursor
            NativeMethods.POINT nativePt = new NativeMethods.POINT { X = pt.X, Y = pt.Y };
            IntPtr hWnd = NativeMethods.WindowFromPoint(nativePt);
            if (hWnd != IntPtr.Zero)
            {
                hWnd = NativeMethods.GetTopLevelWindow(hWnd);
            }
            NativeMethods.WindowTargetInfo winInfo = null;
            Point clientPt = pt;

            if (hWnd != IntPtr.Zero)
            {
                uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
                uint pid;
                NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                if (pid != myPid && pid != 0)
                {
                    string pName = "App";
                    try
                    {
                        var p = System.Diagnostics.Process.GetProcessById((int)pid);
                        pName = p.ProcessName;
                    }
                    catch { }

                    int len = NativeMethods.GetWindowTextLength(hWnd);
                    string title = "";
                    if (len > 0)
                    {
                        var sb = new System.Text.StringBuilder(len + 1);
                        NativeMethods.GetWindowText(hWnd, sb, sb.Capacity);
                        title = sb.ToString().Trim();
                    }

                    NativeMethods.POINT cPt = nativePt;
                    NativeMethods.ScreenToClient(hWnd, ref cPt);
                    clientPt = new Point(cPt.X, cPt.Y);

                    winInfo = new NativeMethods.WindowTargetInfo
                    {
                        Hwnd = hWnd,
                        ProcessName = pName,
                        Title = title
                    };
                }
            }

            if (OnPointPicked != null)
            {
                OnPointPicked(pt);
            }
            if (OnPointAndColorPicked != null)
            {
                OnPointAndColorPicked(pt, pickedColor);
            }
            if (OnPointSelectedWithWindow != null)
            {
                OnPointSelectedWithWindow(pt, pickedColor, winInfo, clientPt);
            }
            ClosePicker();
        }

        private void ConfirmArea(Point ptA, Point ptB)
        {
            Color pickedColor = _currentColor;
            if (pickedColor == Color.Black)
            {
                pickedColor = NativeMethods.GetPixelColor(ptB.X, ptB.Y);
            }

            // Ensure minimal 10x10 area if user just clicked
            if (Math.Abs(ptB.X - ptA.X) < 5 && Math.Abs(ptB.Y - ptA.Y) < 5)
            {
                ptA = new Point(ptA.X - 25, ptA.Y - 25);
                ptB = new Point(ptB.X + 25, ptB.Y + 25);
            }

            Point normA = new Point(Math.Min(ptA.X, ptB.X), Math.Min(ptA.Y, ptB.Y));
            Point normB = new Point(Math.Max(ptA.X, ptB.X), Math.Max(ptA.Y, ptB.Y));

            // Detect window under cursor
            NativeMethods.POINT nativePtA = new NativeMethods.POINT { X = normA.X, Y = normA.Y };
            NativeMethods.POINT nativePtB = new NativeMethods.POINT { X = normB.X, Y = normB.Y };

            IntPtr hWnd = NativeMethods.WindowFromPoint(nativePtA);
            if (hWnd == IntPtr.Zero) hWnd = NativeMethods.WindowFromPoint(nativePtB);
            if (hWnd != IntPtr.Zero) hWnd = NativeMethods.GetTopLevelWindow(hWnd);

            NativeMethods.WindowTargetInfo winInfo = null;
            Point clientPtA = normA;
            Point clientPtB = normB;

            if (hWnd != IntPtr.Zero)
            {
                uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
                uint pid;
                NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                if (pid != myPid && pid != 0)
                {
                    string pName = "App";
                    try
                    {
                        var p = System.Diagnostics.Process.GetProcessById((int)pid);
                        pName = p.ProcessName;
                    }
                    catch { }

                    int len = NativeMethods.GetWindowTextLength(hWnd);
                    string title = "";
                    if (len > 0)
                    {
                        var sb = new System.Text.StringBuilder(len + 1);
                        NativeMethods.GetWindowText(hWnd, sb, sb.Capacity);
                        title = sb.ToString().Trim();
                    }

                    NativeMethods.POINT cPtA = nativePtA;
                    NativeMethods.ScreenToClient(hWnd, ref cPtA);
                    clientPtA = new Point(cPtA.X, cPtA.Y);

                    NativeMethods.POINT cPtB = nativePtB;
                    NativeMethods.ScreenToClient(hWnd, ref cPtB);
                    clientPtB = new Point(cPtB.X, cPtB.Y);

                    winInfo = new NativeMethods.WindowTargetInfo
                    {
                        Hwnd = hWnd,
                        ProcessName = pName,
                        Title = title
                    };
                }
            }

            if (OnAreaSelectedWithWindow != null)
            {
                OnAreaSelectedWithWindow(normA, normB, pickedColor, winInfo, clientPtA, clientPtB);
            }
            ClosePicker();
        }

        private void ClosePicker()
        {
            this.Close();
            this.Dispose();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            if (_currentMouse == Point.Empty) return;

            Point clientPt = this.PointToClient(_currentMouse);

            // Draw Area Drag Rectangle if currently selecting area
            if (IsAreaSelectionMode && _isDraggingArea)
            {
                Point clientStart = this.PointToClient(_dragStartPoint);
                int rx = Math.Min(clientStart.X, clientPt.X);
                int ry = Math.Min(clientStart.Y, clientPt.Y);
                int rw = Math.Max(1, Math.Abs(clientPt.X - clientStart.X));
                int rh = Math.Max(1, Math.Abs(clientPt.Y - clientStart.Y));
                Rectangle dragRect = new Rectangle(rx, ry, rw, rh);

                using (SolidBrush areaFill = new SolidBrush(Color.FromArgb(45, 59, 130, 246)))
                using (Pen areaBorder = new Pen(Color.FromArgb(230, 59, 130, 246), 2))
                {
                    areaBorder.DashStyle = DashStyle.Dash;
                    g.FillRectangle(areaFill, dragRect);
                    g.DrawRectangle(areaBorder, dragRect);
                }

                // Draw size badge
                string dimText = string.Format("Area: {0} x {1} px", rw, rh);
                using (Font dimFont = new Font("Segoe UI", 9F, FontStyle.Bold))
                using (SolidBrush badgeBg = new SolidBrush(Color.FromArgb(200, 15, 23, 42)))
                using (SolidBrush badgeText = new SolidBrush(Color.FromArgb(240, 240, 240)))
                {
                    SizeF dimSize = g.MeasureString(dimText, dimFont);
                    RectangleF badgeRect = new RectangleF(dragRect.X + 4, dragRect.Y - dimSize.Height - 4, dimSize.Width + 8, dimSize.Height + 2);
                    if (badgeRect.Y < 4) badgeRect.Y = dragRect.Y + 4;
                    g.FillRectangle(badgeBg, badgeRect);
                    g.DrawString(dimText, dimFont, badgeText, badgeRect.X + 4, badgeRect.Y + 1);
                }
            }

            // Draw Coordinate + Real-time Color Swatch Tooltip Box next to the cursor
            string hexStr = string.Format("#{0:X2}{1:X2}{2:X2}", _currentColor.R, _currentColor.G, _currentColor.B);
            string text = IsAreaSelectionMode
                ? string.Format("({0}, {1})   {2}\n[Drag mouse to Select Area | Esc Cancel]", _currentMouse.X, _currentMouse.Y, hexStr)
                : string.Format("({0}, {1})   {2}\n[Click/Space to Pick | Esc Cancel]", _currentMouse.X, _currentMouse.Y, hexStr);

            using (Font font = new Font("Segoe UI", 9F, FontStyle.Bold))
            {
                SizeF size = g.MeasureString(text, font);
                float boxW = size.Width + 36;
                float boxH = size.Height + 8;
                RectangleF boxRect = new RectangleF(clientPt.X + 18, clientPt.Y + 18, boxW, boxH);

                // Prevent going off screen
                if (boxRect.Right > this.Width) boxRect.X = clientPt.X - boxW - 10;
                if (boxRect.Bottom > this.Height) boxRect.Y = clientPt.Y - boxH - 10;

                ThemeTokens theme = ThemeTokens.DarkTheme();
                using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(240, theme.BgPrimary.R, theme.BgPrimary.G, theme.BgPrimary.B)))
                using (Pen borderPen = new Pen(theme.BorderColor, 1))
                {
                    g.FillRectangle(bgBrush, boxRect);
                    g.DrawRectangle(borderPen, boxRect.X, boxRect.Y, boxRect.Width, boxRect.Height);
                }

                // Draw live color swatch mini square
                RectangleF swatchRect = new RectangleF(boxRect.X + 8, boxRect.Y + 6, 14, 14);
                using (SolidBrush colorBrush = new SolidBrush(_currentColor))
                using (Pen swatchBorder = new Pen(theme.BorderColor, 1))
                {
                    g.FillRectangle(colorBrush, swatchRect);
                    g.DrawRectangle(swatchBorder, swatchRect.X, swatchRect.Y, swatchRect.Width, swatchRect.Height);
                }

                using (SolidBrush textBrush = new SolidBrush(theme.TextPrimary))
                {
                    g.DrawString(text, font, textBrush, boxRect.X + 28, boxRect.Y + 4);
                }
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing && _screenBitmap != null)
            {
                _screenBitmap.Dispose();
                _screenBitmap = null;
            }
            base.Dispose(disposing);
        }
    }
}
