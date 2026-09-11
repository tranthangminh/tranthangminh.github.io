using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Advanced;

namespace ModernAutoClicker
{
    public static class DragDropReorderHelper
    {
        public static int CalculateTargetIndex(int srcIdx, int targetIdx, bool dropBelow, int totalCount)
        {
            if (totalCount <= 0) return -1;
            targetIdx = Math.Max(0, Math.Min(targetIdx, totalCount - 1));

            if (dropBelow && targetIdx < totalCount - 1)
            {
                if (srcIdx > targetIdx) targetIdx++;
            }
            else if (!dropBelow && srcIdx < targetIdx)
            {
                targetIdx--;
            }

            return targetIdx;
        }

        public static void DrawInsertionLine(Graphics g, Rectangle bounds, Color accentColor, bool dropBelow)
        {
            int lineY = dropBelow ? (bounds.Bottom - 2) : (bounds.Top);
            using (SolidBrush lineBrush = new SolidBrush(accentColor))
            using (Pen linePen = new Pen(accentColor, 2f))
            {
                g.DrawLine(linePen, bounds.Left + 4, lineY, bounds.Right - 4, lineY);
                g.FillEllipse(lineBrush, bounds.Left + 1, lineY - 2, 5, 5);
                g.FillEllipse(lineBrush, bounds.Right - 6, lineY - 2, 5, 5);
            }
        }

        public static void DrawInsertionLineAtY(Graphics g, float lineY, int left, int right, Color accentColor)
        {
            using (SolidBrush lineBrush = new SolidBrush(accentColor))
            using (Pen linePen = new Pen(accentColor, 2f))
            {
                g.DrawLine(linePen, left + 4, lineY, right - 4, lineY);
                g.FillEllipse(lineBrush, left + 1, lineY - 2.5f, 5, 5);
                g.FillEllipse(lineBrush, right - 6, lineY - 2.5f, 5, 5);
            }
        }
    }

    public class PointRowDragFilter : IMessageFilter
    {
        private PointListControl _owner;
        private PointRowControl _row;
        private int _fromIndex = -1;

        private const int WM_MOUSEMOVE = 0x0200;
        private const int WM_LBUTTONUP = 0x0202;
        private const int WM_RBUTTONDOWN = 0x0204;
        private const int WM_KEYDOWN = 0x0100;
        private const int VK_ESCAPE = 0x1B;

        public PointRowDragFilter(PointListControl owner, PointRowControl row)
        {
            _owner = owner;
            _row = row;
            _fromIndex = row.Index;
            _row.IsBeingDragged = true;
            Cursor.Current = Cursors.SizeNS;
        }

        public bool PreFilterMessage(ref Message m)
        {
            if (m.Msg == WM_MOUSEMOVE)
            {
                Cursor.Current = Cursors.SizeNS;
                _owner.UpdateRowDragPosition(_row, Cursor.Position);
                return false;
            }
            else if (m.Msg == WM_LBUTTONUP)
            {
                Application.RemoveMessageFilter(this);
                _row.IsBeingDragged = false;
                Cursor.Current = Cursors.Default;
                _owner.FinishRowDrag(_row, _fromIndex, true);
                return false;
            }
            else if (m.Msg == WM_RBUTTONDOWN || (m.Msg == WM_KEYDOWN && (int)m.WParam == VK_ESCAPE))
            {
                Application.RemoveMessageFilter(this);
                _row.IsBeingDragged = false;
                Cursor.Current = Cursors.Default;
                _owner.CancelRowDrag();
                return true;
            }
            return false;
        }
    }

    public class MacroRowDragFilter : IMessageFilter
    {
        private MacroTableControl _owner;
        private MacroRowControl _row;
        private int _fromIndex = -1;

        private const int WM_MOUSEMOVE = 0x0200;
        private const int WM_LBUTTONUP = 0x0202;
        private const int WM_RBUTTONDOWN = 0x0204;
        private const int WM_KEYDOWN = 0x0100;
        private const int VK_ESCAPE = 0x1B;

        public MacroRowDragFilter(MacroTableControl owner, MacroRowControl row)
        {
            _owner = owner;
            _row = row;
            _fromIndex = row.Index;
            _row.IsBeingDragged = true;
            Cursor.Current = Cursors.SizeNS;
        }

        public bool PreFilterMessage(ref Message m)
        {
            if (m.Msg == WM_MOUSEMOVE)
            {
                Cursor.Current = Cursors.SizeNS;
                _owner.UpdateRowDragPosition(_row, Cursor.Position);
                return false;
            }
            else if (m.Msg == WM_LBUTTONUP)
            {
                Application.RemoveMessageFilter(this);
                _row.IsBeingDragged = false;
                Cursor.Current = Cursors.Default;
                _owner.FinishRowDrag(_row, _fromIndex, true);
                return false;
            }
            else if (m.Msg == WM_RBUTTONDOWN || (m.Msg == WM_KEYDOWN && (int)m.WParam == VK_ESCAPE))
            {
                Application.RemoveMessageFilter(this);
                _row.IsBeingDragged = false;
                Cursor.Current = Cursors.Default;
                _owner.CancelRowDrag();
                return true;
            }
            return false;
        }
    }

    public class TabDragMessageFilter : IMessageFilter
    {
        private ProfileTabControl _owner;
        private ProfileTabItem _tab;
        private int _fromIndex = -1;

        private const int WM_MOUSEMOVE = 0x0200;
        private const int WM_LBUTTONUP = 0x0202;
        private const int WM_RBUTTONDOWN = 0x0204;
        private const int WM_KEYDOWN = 0x0100;
        private const int VK_ESCAPE = 0x1B;

        public TabDragMessageFilter(ProfileTabControl owner, ProfileTabItem tab)
        {
            _owner = owner;
            _tab = tab;
            _fromIndex = _owner.GetTabIndex(tab);
        }

        public bool PreFilterMessage(ref Message m)
        {
            if (m.Msg == WM_MOUSEMOVE)
            {
                _owner.UpdateTabDragPosition(_tab, Cursor.Position);
                return false;
            }
            else if (m.Msg == WM_LBUTTONUP)
            {
                Application.RemoveMessageFilter(this);
                _owner.FinishTabDrag(_tab, _fromIndex, true);
                return false;
            }
            else if (m.Msg == WM_RBUTTONDOWN || (m.Msg == WM_KEYDOWN && (int)m.WParam == VK_ESCAPE))
            {
                Application.RemoveMessageFilter(this);
                _owner.CancelTabDrag();
                return true;
            }
            return false;
        }
    }
}
