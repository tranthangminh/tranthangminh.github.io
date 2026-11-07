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

    /// <summary>
    /// Lets a left click anywhere inside a step row (inputs, dropdowns, labels, buttons) select that row, with Ctrl/Shift taking priority.
    /// Also keeps the hand cursor over rows while Ctrl/Shift is held.
    /// </summary>
    public class MacroRowSelectFilter : IMessageFilter
    {
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_MOUSEMOVE = 0x0200;
        private const int WM_LBUTTONDOWN = 0x0201;
        private const int VK_SHIFT = 0x10;
        private const int VK_CONTROL = 0x11;
        private readonly MacroTableControl _owner;

        public MacroRowSelectFilter(MacroTableControl owner)
        {
            _owner = owner;
        }

        public bool PreFilterMessage(ref Message m)
        {
            if (_owner == null || _owner.IsDisposed) return false;

            if (m.Msg == WM_LBUTTONDOWN)
            {
                return _owner.HandleRowAreaMouseDown(m.HWnd);
            }

            bool isModifierKeyMsg = (m.Msg == WM_KEYDOWN || m.Msg == WM_KEYUP) &&
                                    (m.WParam.ToInt32() == VK_SHIFT || m.WParam.ToInt32() == VK_CONTROL);
            if (m.Msg == WM_MOUSEMOVE || isModifierKeyMsg)
            {
                // Real-time key state: a Ctrl/Shift released while another window had focus still re-enables the hints
                bool modifierHeld = NativeMethods.IsKeyDown(VK_SHIFT) || NativeMethods.IsKeyDown(VK_CONTROL);
                RowToolTipManager.SetSuppressed(modifierHeld);
                _owner.ApplySelectModifierCursor();
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
