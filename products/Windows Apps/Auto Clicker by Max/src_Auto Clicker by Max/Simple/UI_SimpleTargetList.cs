using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public class PointListControl : UserControl
    {
        private Panel pnlScrollContainer;
        private Panel pnlContent;
        private ModernScrollBar scrollBar;

        private List<PointRowControl> _rows = new List<PointRowControl>();
        private int _selectedIndex = -1;
        private int _dropTargetIndex = -1;
        private bool _dropBelow = false;
        private ThemeTokens _theme;
        private PointRowDragFilter _dragFilter = null;

        public event Action OnPointListChanged;
        public event Action<int> OnSelectionChanged;
        public event Action<int> OnPickCoordinateRequested;

        public int SelectedIndex { get { return _selectedIndex; } }
        public int Count { get { return _rows.Count; } }

        public PointListControl()
        {
            _theme = ThemeTokens.DarkTheme();
            this.Size = new Size(165, 178);
            this.DoubleBuffered = true;

            pnlScrollContainer = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(157, 178),
                AutoScroll = false,
                Margin = new Padding(0)
            };

            pnlContent = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(157, 178),
                Margin = new Padding(0)
            };
            pnlContent.Paint += Content_Paint;
            pnlScrollContainer.Controls.Add(pnlContent);

            scrollBar = new ModernScrollBar
            {
                Location = new Point(157, 0),
                Size = new Size(8, 178),
                Visible = false
            };
            scrollBar.ValueChanged += (val) =>
            {
                pnlContent.Top = -val;
            };

            this.MouseWheel += (s, e) => { if (scrollBar.Visible) scrollBar.DoMouseWheel(e.Delta); };
            pnlScrollContainer.MouseWheel += (s, e) => { if (scrollBar.Visible) scrollBar.DoMouseWheel(e.Delta); };
            pnlContent.MouseWheel += (s, e) => { if (scrollBar.Visible) scrollBar.DoMouseWheel(e.Delta); };

            this.Controls.Add(pnlScrollContainer);
            this.Controls.Add(scrollBar);

            ApplyTheme(_theme);
        }

        public List<Point> GetPoints()
        {
            List<Point> pts = new List<Point>();
            foreach (PointRowControl r in _rows)
            {
                pts.Add(r.Point);
            }
            return pts;
        }

        public void AddPoint(Point pt)
        {
            PointRowControl row = new PointRowControl(pt, _rows.Count, _theme);
            row.Location = new Point(0, _rows.Count * 19);
            row.Width = pnlContent.Width;
            row.OnDeleteRequested += (r) => RemoveRow(r);
            row.OnRowSelected += (r) => SelectRow(r.Index);
            row.OnDragStarted += (r) => StartRowDrag(r.Index);
            row.OnPickCoordinateRequested += (r) =>
            {
                if (OnPickCoordinateRequested != null) OnPickCoordinateRequested(r.Index);
            };

            HookMouseWheel(row);

            _rows.Add(row);
            pnlContent.Controls.Add(row);

            ReorderRows();
            SelectRow(_rows.Count - 1);

            if (OnPointListChanged != null) OnPointListChanged();
        }

        private void HookMouseWheel(Control c)
        {
            c.MouseWheel += (s, e) =>
            {
                if (scrollBar != null && scrollBar.Visible)
                {
                    scrollBar.DoMouseWheel(e.Delta);
                }
            };
            foreach (Control child in c.Controls)
            {
                HookMouseWheel(child);
            }
        }

        public void RemoveRow(PointRowControl row)
        {
            if (_rows.Contains(row))
            {
                int removedIdx = _rows.IndexOf(row);
                _rows.Remove(row);
                pnlContent.Controls.Remove(row);
                row.Dispose();
                ReorderRows();

                if (_rows.Count == 0)
                {
                    SelectRow(-1);
                }
                else if (_selectedIndex >= _rows.Count)
                {
                    SelectRow(_rows.Count - 1);
                }
                else if (_selectedIndex == removedIdx)
                {
                    SelectRow(Math.Min(removedIdx, _rows.Count - 1));
                }

                if (OnPointListChanged != null) OnPointListChanged();
            }
        }

        public void MovePoint(int srcIndex, int targetIndex)
        {
            if (srcIndex < 0 || srcIndex >= _rows.Count || targetIndex < 0 || targetIndex >= _rows.Count || srcIndex == targetIndex) return;

            PointRowControl item = _rows[srcIndex];
            _rows.RemoveAt(srcIndex);
            _rows.Insert(targetIndex, item);

            ReorderRows();
            SelectRow(targetIndex);

            if (OnPointListChanged != null) OnPointListChanged();
        }

        public void ClearPoints()
        {
            pnlContent.SuspendLayout();
            foreach (PointRowControl r in _rows)
            {
                pnlContent.Controls.Remove(r);
                r.Dispose();
            }
            _rows.Clear();
            pnlContent.ResumeLayout();

            ReorderRows();
            SelectRow(-1);
            if (OnPointListChanged != null) OnPointListChanged();
        }

        public void UpdatePoint(int index, Point pt)
        {
            if (index >= 0 && index < _rows.Count)
            {
                _rows[index].Point = pt;
            }
        }

        public void UpdateAllPoints(List<Point> points)
        {
            if (points == null) return;
            for (int i = 0; i < points.Count && i < _rows.Count; i++)
            {
                _rows[i].Point = points[i];
            }
            if (OnPointListChanged != null) OnPointListChanged();
        }

        public void SetPoints(List<Point> points)
        {
            ClearPoints();
            if (points != null)
            {
                pnlContent.SuspendLayout();
                foreach (Point pt in points)
                {
                    AddPoint(pt);
                }
                pnlContent.ResumeLayout();
            }
        }

        public void SelectRow(int index)
        {
            if (index < 0 || index >= _rows.Count)
            {
                _selectedIndex = -1;
            }
            else
            {
                _selectedIndex = index;
            }

            for (int i = 0; i < _rows.Count; i++)
            {
                _rows[i].IsSelected = (i == _selectedIndex);
            }

            if (_selectedIndex >= 0 && _selectedIndex < _rows.Count)
            {
                int rowTop = _selectedIndex * 19;
                int rowBottom = rowTop + 19;
                int visibleTop = scrollBar.Value;
                int visibleBottom = visibleTop + pnlScrollContainer.Height;

                if (rowTop < visibleTop)
                {
                    scrollBar.Value = rowTop;
                }
                else if (rowBottom > visibleBottom)
                {
                    scrollBar.Value = rowBottom - pnlScrollContainer.Height;
                }
            }

            if (OnSelectionChanged != null) OnSelectionChanged(_selectedIndex);
        }

        private void ReorderRows()
        {
            pnlContent.SuspendLayout();
            int totalH = 4 + _rows.Count * 21;
            pnlContent.Height = Math.Max(pnlScrollContainer.Height, totalH);

            for (int i = 0; i < _rows.Count; i++)
            {
                _rows[i].Index = i;
                _rows[i].Location = new Point(0, 2 + i * 21);
                _rows[i].Width = pnlContent.Width;
            }
            pnlContent.ResumeLayout();

            scrollBar.Maximum = totalH;
            scrollBar.LargeChange = pnlScrollContainer.Height;
            scrollBar.SmallChange = 21;
            scrollBar.Visible = (totalH > pnlScrollContainer.Height);

            if (!scrollBar.Visible)
            {
                scrollBar.Value = 0;
                pnlContent.Top = 0;
            }
            else
            {
                pnlContent.Top = -scrollBar.Value;
            }
        }

        public void StartRowDrag(int srcIndex)
        {
            if (srcIndex < 0 || srcIndex >= _rows.Count || _rows.Count <= 1) return;
            if (_dragFilter != null)
            {
                Application.RemoveMessageFilter(_dragFilter);
                _dragFilter = null;
            }
            _dragFilter = new PointRowDragFilter(this, _rows[srcIndex]);
            Application.AddMessageFilter(_dragFilter);
        }

        public void UpdateRowDragPosition(PointRowControl row, Point screenPos)
        {
            if (_rows.Count <= 1) return;

            Point clientPt = pnlContent.PointToClient(screenPos);
            Point containerPt = pnlScrollContainer.PointToClient(screenPos);

            // Auto-scroll when near edges
            if (containerPt.Y < 20 && scrollBar.Visible && scrollBar.Value > 0)
            {
                scrollBar.Value = Math.Max(0, scrollBar.Value - 10);
                clientPt = pnlContent.PointToClient(screenPos);
            }
            else if (containerPt.Y > pnlScrollContainer.Height - 20 && scrollBar.Visible && scrollBar.Value < scrollBar.MaxScrollValue)
            {
                scrollBar.Value = Math.Min(scrollBar.MaxScrollValue, scrollBar.Value + 10);
                clientPt = pnlContent.PointToClient(screenPos);
            }

            int targetIdx;
            bool dropBelow;

            if (clientPt.Y < 2)
            {
                targetIdx = 0;
                dropBelow = false;
            }
            else if (clientPt.Y >= 2 + _rows.Count * 21)
            {
                targetIdx = _rows.Count - 1;
                dropBelow = true;
            }
            else
            {
                targetIdx = Math.Max(0, Math.Min(_rows.Count - 1, (clientPt.Y - 2) / 21));
                int slotTop = 2 + targetIdx * 21;
                dropBelow = clientPt.Y >= (slotTop + 10);
            }

            if (_dropTargetIndex == targetIdx && _dropBelow == dropBelow)
            {
                return;
            }

            _dropTargetIndex = targetIdx;
            _dropBelow = dropBelow;
            pnlContent.Invalidate();
        }

        private void Content_Paint(object sender, PaintEventArgs e)
        {
            if (_dropTargetIndex >= 0 && _rows.Count > 0)
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                int targetIdx = Math.Max(0, Math.Min(_rows.Count - 1, _dropTargetIndex));
                float lineY = _dropBelow ? (2 + (targetIdx + 1) * 21 - 1.5f) : (2 + targetIdx * 21 - 1.5f);
                DragDropReorderHelper.DrawInsertionLineAtY(e.Graphics, lineY, 2, pnlContent.Width - 2, _theme != null ? _theme.AccentPrimary : Color.Cyan);
            }
        }

        public void FinishRowDrag(PointRowControl row, int fromIndex, bool wasDragging)
        {
            _dragFilter = null;
            foreach (PointRowControl r in _rows)
            {
                r.ResetDragState();
            }

            int targetIdx = _dropTargetIndex;
            bool dropBelow = _dropBelow;

            _dropTargetIndex = -1;
            _dropBelow = false;
            pnlContent.Invalidate();

            if (wasDragging && targetIdx >= 0)
            {
                int finalTarget = DragDropReorderHelper.CalculateTargetIndex(fromIndex, targetIdx, dropBelow, _rows.Count);
                if (fromIndex >= 0 && fromIndex < _rows.Count && finalTarget >= 0 && finalTarget < _rows.Count && fromIndex != finalTarget)
                {
                    MovePoint(fromIndex, finalTarget);
                }
            }
            else if (!wasDragging)
            {
                SelectRow(row.Index);
            }
        }

        public void CancelRowDrag()
        {
            _dragFilter = null;
            _dropTargetIndex = -1;
            _dropBelow = false;
            foreach (PointRowControl r in _rows)
            {
                r.ResetDragState();
            }
            pnlContent.Invalidate();
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (pnlScrollContainer == null || scrollBar == null || _rows == null) return;

            int scrollBarW = 8;
            int availW = Math.Max(50, this.Width - scrollBarW);
            int availH = this.Height;

            pnlScrollContainer.Size = new Size(availW, availH);
            scrollBar.Location = new Point(availW, 0);
            scrollBar.Size = new Size(scrollBarW, availH);
            ReorderRows();
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            pnlScrollContainer.BackColor = t.BgTertiary;
            pnlContent.BackColor = t.BgTertiary;

            scrollBar.ApplyTheme(t);

            foreach (PointRowControl r in _rows)
            {
                r.ApplyTheme(t);
            }
        }
    }
}
