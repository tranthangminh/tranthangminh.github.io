using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Advanced
{
    public class MacroTableControl : RoundedPanel
    {
        private Panel pnlHeader;
        private Panel pnlScrollContainer;
        private Panel pnlContent;
        private ModernScrollBar scrollBar;

        private Label _lblColNo;
        private Label _lblColCheck;
        private Label _lblColWin;
        private Label _lblColAction;
        private Label _lblColTarget;
        private Label _lblColHold;
        private Label _lblColDelay;
        private Label _lblColRep;
        private Label _lblColDel;
        private Label _lblColNote;

        private int _selectedIndex = -1;
        private HashSet<int> _selectedIndices = new HashSet<int>();
        private int _lastAnchorIndex = -1;
        private int _dropTargetIndex = -1;
        private bool _dropBelow = false;
        private List<MacroRowControl> _rows = new List<MacroRowControl>();
        private List<MacroRowControl> _rowPool = new List<MacroRowControl>();
        private List<string> _availableScripts = new List<string>();
        private ThemeTokens _theme;
        private ToolTip _headerToolTip;
        private MacroRowDragFilter _dragFilter = null;
        private bool _isEditingLocked = false;
        public bool IsEditingLocked { get { return _isEditingLocked; } }

        public void SetEditingLocked(bool isLocked)
        {
            _isEditingLocked = isLocked;
            foreach (var r in _rows)
            {
                if (r != null) r.SetRowEditingLocked(isLocked);
            }
        }

        public event Action OnTableDataChanged;
        public event Action<int> OnSelectionChanged;
        public event Action<bool, string, string, int, uint> OnDefaultWindowBatchChanged;

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.Style |= 0x02000000; // WS_CLIPCHILDREN
                return cp;
            }
        }

        public int SelectedIndex { get { return _selectedIndex; } }
        public HashSet<int> SelectedIndices { get { return _selectedIndices; } }
        public List<MacroRowControl> SelectedRows
        {
            get
            {
                List<MacroRowControl> list = new List<MacroRowControl>();
                foreach (int idx in _selectedIndices)
                {
                    if (idx >= 0 && idx < _rows.Count) list.Add(_rows[idx]);
                }
                return list;
            }
        }

        public void SetAvailableScripts(List<string> scriptNames)
        {
            _availableScripts = scriptNames ?? new List<string>();
            bool prevLoading = _isLoading;
            _isLoading = true;
            try
            {
                foreach (MacroRowControl r in _rows)
                {
                    r.SetAvailableScripts(_availableScripts);
                }
            }
            finally
            {
                _isLoading = prevLoading;
            }
        }

        public List<MacroStep> GetSteps()
        {
            List<MacroStep> steps = new List<MacroStep>();
            foreach (MacroRowControl r in _rows)
            {
                steps.Add(r.Step);
            }
            return steps;
        }

        public MacroTableControl()
        {
            _theme = ThemeTokens.DarkTheme();
            this.Size = new Size(542, 384);
            this.BorderRadius = _theme.RadiusMd;
            this.BorderSize = 2;
            this.BorderColor = _theme.AccentPrimary;
            this.BackColor = _theme.BgPrimary;
            this.DoubleBuffered = true;

            InitializeTable();
            ApplyTheme(_theme);
        }

        private void InitializeTable()
        {
            _headerToolTip = MacroDescriptions.CreateFastToolTip();

            // 1. Table Header Bar (Compact)
            pnlHeader = new Panel
            {
                Location = new Point(1, 1),
                Size = new Size(540, 24),
                Margin = new Padding(0)
            };

            int x = 2;
            int colGap = 5;

            _lblColNo = CreateColLabel(Loc.ColNo, x, 34, true, MacroDescriptions.GetHeaderDescription("No."), () => ToggleAllSelection());
            pnlHeader.Controls.Add(_lblColNo); x += 34 + colGap;

            _lblColCheck = CreateColLabel(Loc.ColCheck, x, 20, true, MacroDescriptions.GetHeaderDescription("✔"), () => ToggleAllCheckboxes());
            pnlHeader.Controls.Add(_lblColCheck); x += 20 + colGap;
            
            _lblColWin = CreateColLabel(Loc.ColWin, x, 30, true, MacroDescriptions.GetHeaderDescription("Win"), null);
            _lblColWin.Click += (s, e) => ShowBatchWindowMenu(_lblColWin);
            pnlHeader.Controls.Add(_lblColWin); x += 30 + colGap;

            _lblColAction = CreateColLabel(Loc.ColActionType, x, 112, true, MacroDescriptions.GetHeaderDescription("Action Type"), null);
            _lblColAction.Click += (s, e) => ShowBatchActionTypeMenu(_lblColAction);
            pnlHeader.Controls.Add(_lblColAction); x += 112 + colGap;

            _lblColTarget = CreateColLabel(Loc.ColTarget, x, 116, true, MacroDescriptions.GetHeaderDescription("Target"), () => BatchSetTargetCoordinates());
            pnlHeader.Controls.Add(_lblColTarget); x += 116 + colGap;

            _lblColHold = CreateColLabel(Loc.ColHold, x, 44, true, MacroDescriptions.GetHeaderDescription("Hold"), () =>
            {
                var targets = GetTargetRowsForBatch();
                string title = targets.Count == _rows.Count
                    ? (Loc.IsVietnamese ? "Cài đặt hàng loạt Thời gian Giữ (Tất cả bước)" : "Batch Set Hold Duration (All Steps)")
                    : (Loc.IsVietnamese ? string.Format("Cài đặt hàng loạt Thời gian Giữ ({0} bước đã chọn)", targets.Count) : string.Format("Batch Set Hold Duration ({0} Selected Steps)", targets.Count));
                string prompt = Loc.IsVietnamese
                    ? string.Format("Nhập Thời gian Giữ (ms) cho {0} bước:\n(Thời gian hoàn thành từng bước)", targets.Count)
                    : string.Format("Enter Hold Duration (ms) for {0} steps:\n(Time to complete each step)", targets.Count);
                PromptBatchNumber(title, prompt, 1, 999999, 10, (val) =>
                {
                    foreach (MacroRowControl r in targets) r.UpdateHoldValue(val);
                    if (OnTableDataChanged != null) OnTableDataChanged();
                });
            });
            pnlHeader.Controls.Add(_lblColHold); x += 44 + colGap;

            _lblColDelay = CreateColLabel(Loc.ColDelay, x, 46, true, MacroDescriptions.GetHeaderDescription("Delay"), () =>
            {
                var targets = GetTargetRowsForBatch();
                string title = targets.Count == _rows.Count
                    ? (Loc.IsVietnamese ? "Cài đặt hàng loạt Thời gian Chờ (Tất cả bước)" : "Batch Set Delay Duration (All Steps)")
                    : (Loc.IsVietnamese ? string.Format("Cài đặt hàng loạt Thời gian Chờ ({0} bước đã chọn)", targets.Count) : string.Format("Batch Set Delay Duration ({0} Selected Steps)", targets.Count));
                string prompt = Loc.IsVietnamese
                    ? string.Format("Nhập Thời gian Chờ (ms) cho {0} bước:\n(Thời gian chờ chuyển sang bước kế tiếp)", targets.Count)
                    : string.Format("Enter Delay Duration (ms) for {0} steps:\n(Wait or travel time to next step)", targets.Count);
                PromptBatchNumber(title, prompt, 0, 999999, 240, (val) =>
                {
                    foreach (MacroRowControl r in targets) r.UpdateDelayValue(val);
                    if (OnTableDataChanged != null) OnTableDataChanged();
                });
            });
            pnlHeader.Controls.Add(_lblColDelay); x += 46 + colGap;

            _lblColRep = CreateColLabel(Loc.ColRep, x, 30, true, MacroDescriptions.GetHeaderDescription("Rep"), () =>
            {
                var targets = GetTargetRowsForBatch();
                string title = targets.Count == _rows.Count
                    ? (Loc.IsVietnamese ? "Cài đặt hàng loạt Số lần Lặp (Tất cả bước)" : "Batch Set Repeat Count (All Steps)")
                    : (Loc.IsVietnamese ? string.Format("Cài đặt hàng loạt Số lần Lặp ({0} bước đã chọn)", targets.Count) : string.Format("Batch Set Repeat Count ({0} Selected Steps)", targets.Count));
                string prompt = Loc.IsVietnamese
                    ? string.Format("Nhập Số lần Lặp cho {0} bước:", targets.Count)
                    : string.Format("Enter Repeat Count for {0} steps:", targets.Count);
                PromptBatchNumber(title, prompt, 1, 999999, 1, (val) =>
                {
                    foreach (MacroRowControl r in targets) r.UpdateRepeatValue(val);
                    if (OnTableDataChanged != null) OnTableDataChanged();
                });
            });
            pnlHeader.Controls.Add(_lblColRep); x += 30 + colGap;

            _lblColDel = CreateColLabel(Loc.ColDel, x, 34, true, MacroDescriptions.GetHeaderDescription("Del"), () =>
            {
                var targets = GetTargetRowsForBatch();
                if (targets == null || targets.Count == 0) return;

                string confirmMsg = targets.Count == _rows.Count
                    ? (Loc.IsVietnamese ? string.Format("Bạn có chắc chắn muốn xóa TẤT CẢ {0} bước trong script này không?", targets.Count) : string.Format("Are you sure you want to delete ALL {0} steps in this script?", targets.Count))
                    : (Loc.IsVietnamese ? string.Format("Bạn có chắc chắn muốn xóa {0} bước đã chọn không?", targets.Count) : string.Format("Are you sure you want to delete {0} selected step(s)?", targets.Count));

                string dialogTitle = Loc.IsVietnamese ? "Xóa hàng loạt Bước" : "Batch Delete Steps";
                if (MessageBox.Show(this.FindForm(), confirmMsg, dialogTitle, MessageBoxButtons.YesNo, MessageBoxIcon.Warning) == DialogResult.Yes)
                {
                    BatchDeleteRows(targets);
                }
            });
            pnlHeader.Controls.Add(_lblColDel); x += 34 + colGap;

            _lblColNote = CreateColLabel(Loc.ColNote, x, 72, true, MacroDescriptions.GetHeaderDescription("Note"), () =>
            {
                var targets = GetTargetRowsForBatch();
                if (targets == null || targets.Count == 0) return;

                string title = targets.Count == _rows.Count
                    ? (Loc.IsVietnamese ? "Cài đặt hàng loạt Ghi chú (Tất cả bước)" : "Batch Set Note (All Steps)")
                    : (Loc.IsVietnamese ? string.Format("Cài đặt hàng loạt Ghi chú ({0} bước đã chọn)", targets.Count) : string.Format("Batch Set Note ({0} Selected Steps)", targets.Count));
                string prompt = Loc.IsVietnamese
                    ? string.Format("Nhập ghi chú tùy chỉnh cho {0} bước:", targets.Count)
                    : string.Format("Enter custom note for {0} step(s):", targets.Count);
                PromptBatchText(title, prompt, "", (val) =>
                {
                    foreach (MacroRowControl r in targets) r.UpdateNoteValue(val);
                    if (OnTableDataChanged != null) OnTableDataChanged();
                });
            });
            pnlHeader.Controls.Add(_lblColNote);

            // 2. Viewport & Scrollable Content (AutoScroll = false to avoid default white OS scrollbars)
            pnlScrollContainer = new Panel
            {
                Location = new Point(0, 24),
                Size = new Size(434, 176),
                AutoScroll = false,
                AllowDrop = true,
                Margin = new Padding(0)
            };

            pnlContent = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(434, 176),
                AllowDrop = true,
                Margin = new Padding(0)
            };
            pnlContent.Paint += Content_Paint;

            pnlScrollContainer.Controls.Add(pnlContent);

            // 3. Custom Modern Scrollbar (bg primary track, bg tertiary thumb)
            scrollBar = new ModernScrollBar
            {
                Location = new Point(434, 24),
                Size = new Size(8, 176),
                Visible = false
            };
            scrollBar.ValueChanged += (val) =>
            {
                pnlContent.Top = -val;
            };

            // Hook wheel events on containers
            this.MouseWheel += (s, e) => { if (scrollBar.Visible) scrollBar.DoMouseWheel(e.Delta); };
            pnlScrollContainer.MouseWheel += (s, e) => { if (scrollBar.Visible) scrollBar.DoMouseWheel(e.Delta); };
            pnlContent.MouseWheel += (s, e) => { if (scrollBar.Visible) scrollBar.DoMouseWheel(e.Delta); };
            this.Controls.Add(pnlHeader);
            this.Controls.Add(pnlScrollContainer);
            this.Controls.Add(scrollBar);
        }

        private Label CreateColLabel(string text, int x, int width, bool interactive, string tooltipText, Action clickAction)
        {
            Color defaultColor = interactive ? (_theme != null ? _theme.AccentPrimary : Color.FromArgb(96, 165, 250)) : (_theme != null ? _theme.TextSecondary : Color.FromArgb(160, 160, 160));

            Label lbl = new Label
            {
                Text = text,
                Location = new Point(x, 2),
                Size = new Size(width, 18),
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                ForeColor = defaultColor,
                Tag = interactive
            };

            if (interactive)
            {
                lbl.Cursor = Cursors.Hand;
                lbl.MouseEnter += (s, e) => { lbl.ForeColor = _theme != null ? _theme.AccentPrimaryHover : Color.White; };
                lbl.MouseLeave += (s, e) => { lbl.ForeColor = _theme != null ? _theme.AccentPrimary : Color.FromArgb(96, 165, 250); };
                if (clickAction != null)
                {
                    lbl.Click += (s, e) =>
                    {
                        if (_isEditingLocked) return;
                        clickAction();
                    };
                }
            }
            else
            {
                lbl.Cursor = Cursors.Default;
            }

            if (!string.IsNullOrEmpty(tooltipText) && _headerToolTip != null)
            {
                _headerToolTip.SetToolTip(lbl, tooltipText);
            }

            return lbl;
        }

        public List<MacroRowControl> GetTargetRowsForBatch()
        {
            List<MacroRowControl> selectedRows = new List<MacroRowControl>();
            foreach (MacroRowControl r in _rows)
            {
                if (r.IsSelected)
                {
                    selectedRows.Add(r);
                }
            }
            return selectedRows.Count > 0 ? selectedRows : _rows;
        }

        public void ToggleAllCheckboxes()
        {
            if (_rows.Count == 0) return;

            bool anyUnchecked = false;
            foreach (MacroRowControl r in _rows)
            {
                if (!r.IsChecked)
                {
                    anyUnchecked = true;
                    break;
                }
            }

            bool targetState = anyUnchecked;
            foreach (MacroRowControl r in _rows)
            {
                r.SetCheckedDirect(targetState);
            }

            if (OnTableDataChanged != null) OnTableDataChanged();
        }

        public void ShowBatchWindowMenu(Control anchor)
        {
            if (_rows.Count == 0) return;
            var targets = GetTargetRowsForBatch();

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(_theme);
            menu.ShowImageMargin = true;

            ToolStripMenuItem itemDesktop = new ToolStripMenuItem(Loc.IsVietnamese ? "Toàn màn hình (Desktop)" : "All Screens (Desktop)");
            itemDesktop.Image = IconCache.DesktopIcon;
            itemDesktop.Click += (s, e) =>
            {
                foreach (MacroRowControl r in targets)
                {
                    r.SetTargetWindowDirect(false, "", "", IntPtr.Zero, 0, 0);
                }
                if (OnDefaultWindowBatchChanged != null) OnDefaultWindowBatchChanged(false, "", "", 0, 0);
                if (OnTableDataChanged != null) OnTableDataChanged();
            };
            menu.Items.Add(itemDesktop);
            menu.Items.Add(new ToolStripSeparator());

            var windows = NativeMethods.GetOpenWindows();
            if (windows.Count == 0)
            {
                var itemEmpty = new ToolStripMenuItem(Loc.IsVietnamese ? "(Không phát hiện cửa sổ đang mở)" : "(No open windows detected)");
                itemEmpty.Enabled = false;
                menu.Items.Add(itemEmpty);
            }
            else
            {
                foreach (var win in windows)
                {
                    var targetWin = win;
                    ToolStripMenuItem itemWin = new ToolStripMenuItem(win.ToString());
                    itemWin.Image = targetWin.AppIcon ?? IconCache.GenericAppIcon;
                    itemWin.Click += (s, e) =>
                    {
                        if (targetWin.AppIcon != null)
                        {
                            IconCache.CacheProcessIcon(targetWin.ProcessName, targetWin.AppIcon);
                        }
                        foreach (MacroRowControl r in targets)
                        {
                            r.SetTargetWindowDirect(true, targetWin.ProcessName, targetWin.Title, targetWin.Hwnd, targetWin.WindowIndex, targetWin.ProcessId);
                        }
                        if (OnDefaultWindowBatchChanged != null) OnDefaultWindowBatchChanged(true, targetWin.ProcessName, targetWin.Title, targetWin.WindowIndex, targetWin.ProcessId);
                        if (OnTableDataChanged != null) OnTableDataChanged();
                    };
                    menu.Items.Add(itemWin);
                }
            }

            menu.Show(anchor, new Point(0, anchor.Height));
        }

        public void ShowBatchActionTypeMenu(Control anchor)
        {
            if (_rows.Count == 0) return;
            var targets = GetTargetRowsForBatch();

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(_theme);
            menu.ShowImageMargin = true;

            MacroActionType[] types = new MacroActionType[]
            {
                MacroActionType.LeftClick,
                MacroActionType.RightClick,
                MacroActionType.MiddleClick,
                MacroActionType.DoubleClick,
                MacroActionType.DragDrop,
                MacroActionType.KeyPress,
                MacroActionType.TypeText,
                MacroActionType.Delay,
                MacroActionType.RepeatTimer,
                MacroActionType.IfColor,
                MacroActionType.WaitChange,
                MacroActionType.IfImage,
                MacroActionType.RunScript
            };

            for (int i = 0; i < types.Length; i++)
            {
                MacroActionType actionType = types[i];
                ToolStripMenuItem item = new ToolStripMenuItem(Loc.GetActionTypeName(actionType));
                item.ForeColor = MacroRowControl.GetActionTypeColor(actionType, _theme);
                item.Click += (s, e) =>
                {
                    foreach (MacroRowControl r in targets)
                    {
                        r.SetActionTypeDirect(actionType);
                    }
                    if (OnTableDataChanged != null) OnTableDataChanged();
                };
                menu.Items.Add(item);
            }

            menu.Show(anchor, new Point(0, anchor.Height));
        }

        private void PromptBatchNumber(string title, string fieldLabel, int min, int max, int defaultVal, Action<int> onValueConfirmed)
        {
            if (_rows.Count == 0) return;

            Form parentForm = this.FindForm();
            using (BatchNumberInputDialog dlg = new BatchNumberInputDialog(title, fieldLabel, min, max, defaultVal, _theme))
            {
                if (dlg.ShowDialog(parentForm) == DialogResult.OK && dlg.ResultValue.HasValue)
                {
                    onValueConfirmed(dlg.ResultValue.Value);
                }
            }
        }

        private void PromptBatchText(string title, string fieldLabel, string defaultVal, Action<string> onValueConfirmed)
        {
            if (_rows.Count == 0) return;

            Form parentForm = this.FindForm();
            using (BatchTextInputDialog dlg = new BatchTextInputDialog(title, fieldLabel, defaultVal, _theme))
            {
                if (dlg.ShowDialog(parentForm) == DialogResult.OK && dlg.ResultValue != null)
                {
                    onValueConfirmed(dlg.ResultValue);
                }
            }
        }

        public void BatchSetTargetCoordinates()
        {
            if (_isEditingLocked || _rows.Count == 0) return;
            var targets = GetTargetRowsForBatch();
            if (targets == null || targets.Count == 0) return;

            CoordinatePicker picker = new CoordinatePicker();
            picker.OnTargetSelectedWithWindow += (screenA, screenB, color, winInfo, clientPtA, clientPtB, isArea) =>
            {
                foreach (MacroRowControl r in targets)
                {
                    if (r == null || !r.SupportsCoordinates()) continue;
                    r.ApplyPickedCoordinates(screenA, screenB, color, winInfo, clientPtA, clientPtB, isArea);
                }
                if (OnTableDataChanged != null) OnTableDataChanged();
            };
            picker.Show();
        }

        private bool _isLoading = false;

        public void AddStep(MacroStep step = null)
        {
            if (_isEditingLocked) return;
            AddStepInternal(step);
            ReorderRows();
            SelectRow(_rows.Count - 1);

            if (!_isLoading && OnTableDataChanged != null) OnTableDataChanged();
        }

        private void HandleRowClicked(MacroRowControl row, bool isShift, bool isCtrl)
        {
            if (row == null) return;
            if (isShift && _lastAnchorIndex >= 0 && _lastAnchorIndex < _rows.Count)
            {
                SelectRange(_lastAnchorIndex, row.Index);
            }
            else if (isCtrl)
            {
                ToggleSelect(row.Index);
            }
            else
            {
                if (!_selectedIndices.Contains(row.Index))
                {
                    SelectOnly(row.Index);
                }
            }
        }

        public void DuplicateSelectedSteps()
        {
            if (_isEditingLocked || _rows.Count == 0) return;

            List<MacroRowControl> targets = GetTargetRowsForBatch();
            if (targets == null || targets.Count == 0) return;

            List<MacroStep> oldOrder = GetCurrentStepsSnapshot();

            List<MacroStep> stepsToClone = new List<MacroStep>();
            int maxIdx = -1;
            foreach (var r in targets)
            {
                if (r.Index > maxIdx) maxIdx = r.Index;
                stepsToClone.Add(r.Step.Clone());
            }

            int insertIndex = maxIdx + 1;
            if (insertIndex < 0 || insertIndex > _rows.Count) insertIndex = _rows.Count;

            pnlContent.SuspendLayout();
            try
            {
                List<MacroRowControl> newRows = new List<MacroRowControl>();
                List<Control> newlyCreatedControls = new List<Control>();
                for (int i = 0; i < stepsToClone.Count; i++)
                {
                    MacroStep s = stepsToClone[i];
                    bool isNewlyCreated;
                    MacroRowControl row = GetOrCreateRow(s, insertIndex + i, out isNewlyCreated);
                    newRows.Add(row);
                    if (isNewlyCreated)
                    {
                        newlyCreatedControls.Add(row);
                    }
                }

                if (insertIndex >= _rows.Count)
                {
                    foreach (var row in newRows)
                    {
                        _rows.Add(row);
                    }
                }
                else
                {
                    for (int k = 0; k < newRows.Count; k++)
                    {
                        _rows.Insert(insertIndex + k, newRows[k]);
                    }
                }

                if (newlyCreatedControls.Count > 0)
                {
                    pnlContent.Controls.AddRange(newlyCreatedControls.ToArray());
                }

                ReorderRows();
                RelinkStepReferences(oldOrder);

                // Select and highlight all newly cloned rows
                _selectedIndices.Clear();
                for (int k = 0; k < newRows.Count; k++)
                {
                    _selectedIndices.Add(insertIndex + k);
                }
                _lastAnchorIndex = insertIndex + newRows.Count - 1;
                _selectedIndex = _lastAnchorIndex;

                UpdateRowSelectionVisuals();
                EnsureRowVisible(_lastAnchorIndex);
            }
            finally
            {
                pnlContent.ResumeLayout();
            }

            if (OnTableDataChanged != null) OnTableDataChanged();
        }

        private MacroRowControl CreateRowControl(MacroStep step, int index)
        {
            MacroRowControl row = new MacroRowControl(step, index, _theme);
            row.SetAvailableScripts(_availableScripts);
            row.SetRowEditingLocked(_isEditingLocked);
            row.Width = pnlContent.Width;
            row.AllowDrop = true;
            row.OnDeleteRequested += (r) => RemoveRow(r);
            row.OnRowClicked += (r, isShift, isCtrl) => HandleRowClicked(r, isShift, isCtrl);
            row.OnRowClickConfirmed += (r) =>
            {
                if (_selectedIndices.Count > 1) SelectOnly(r.Index);
            };
            row.OnDragStarted += (r) => StartRowDrag(r.Index);
            row.OnStepChanged += () =>
            {
                if (!_isLoading)
                {
                    ReorderRows();
                    if (OnTableDataChanged != null) OnTableDataChanged();
                }
            };
            HookMouseWheelRecursively(row);
            return row;
        }

        private MacroRowControl GetOrCreateRow(MacroStep step, int index, out bool isNewlyCreated)
        {
            if (_rowPool.Count > 0)
            {
                int poolLastIdx = _rowPool.Count - 1;
                MacroRowControl row = _rowPool[poolLastIdx];
                _rowPool.RemoveAt(poolLastIdx);
                row.Visible = true;
                row.Width = pnlContent.Width;
                row.BindStep(step, index);
                row.SetAvailableScripts(_availableScripts);
                row.SetRowEditingLocked(_isEditingLocked);
                isNewlyCreated = false;
                return row;
            }
            else
            {
                MacroRowControl row = CreateRowControl(step, index);
                isNewlyCreated = true;
                return row;
            }
        }

        private void AddStepInternal(MacroStep step)
        {
            if (step == null)
            {
                step = new MacroStep { Name = string.Format("Step {0}", _rows.Count + 1) };
            }

            bool isNewlyCreated;
            MacroRowControl row = GetOrCreateRow(step, _rows.Count, out isNewlyCreated);
            _rows.Add(row);
            if (isNewlyCreated)
            {
                pnlContent.Controls.Add(row);
            }
        }

        private void HookMouseWheelRecursively(Control c)
        {
            c.MouseWheel += (s, e) =>
            {
                if (c is NumberInput && c.Focused) return;
                if (scrollBar != null && scrollBar.Visible)
                {
                    scrollBar.DoMouseWheel(e.Delta);
                }
            };
            foreach (Control child in c.Controls)
            {
                HookMouseWheelRecursively(child);
            }
        }

        public void MoveRow(int srcIndex, int targetIndex)
        {
            if (_isEditingLocked || srcIndex < 0 || srcIndex >= _rows.Count || targetIndex < 0 || targetIndex >= _rows.Count || srcIndex == targetIndex) return;

            SelectOnly(srcIndex);
            MoveSelectedRows(targetIndex, targetIndex > srcIndex);
        }

        public void MoveSelectedRows(int targetIdx, bool dropBelow)
        {
            if (_isEditingLocked || _rows.Count <= 1 || targetIdx < 0 || targetIdx >= _rows.Count) return;

            if (_selectedIndices.Count == 0)
            {
                if (_selectedIndex >= 0 && _selectedIndex < _rows.Count)
                {
                    _selectedIndices.Add(_selectedIndex);
                }
                else
                {
                    return;
                }
            }

            List<MacroStep> oldOrder = GetCurrentStepsSnapshot();

            List<MacroRowControl> selectedControls = new List<MacroRowControl>();
            List<MacroRowControl> unselectedControls = new List<MacroRowControl>();

            for (int i = 0; i < _rows.Count; i++)
            {
                if (_selectedIndices.Contains(i))
                {
                    selectedControls.Add(_rows[i]);
                }
                else
                {
                    unselectedControls.Add(_rows[i]);
                }
            }

            if (selectedControls.Count == 0 || unselectedControls.Count == 0)
            {
                return;
            }

            MacroRowControl targetRow = _rows[targetIdx];
            int insertPos = 0;

            if (_selectedIndices.Contains(targetIdx))
            {
                if (targetIdx == 0 && !dropBelow)
                {
                    insertPos = 0;
                }
                else if (targetIdx == _rows.Count - 1 && dropBelow)
                {
                    insertPos = unselectedControls.Count;
                }
                else
                {
                    return;
                }
            }
            else
            {
                int unselectedIdx = unselectedControls.IndexOf(targetRow);
                if (unselectedIdx < 0) return;

                insertPos = dropBelow ? (unselectedIdx + 1) : unselectedIdx;
            }

            insertPos = Math.Max(0, Math.Min(unselectedControls.Count, insertPos));

            unselectedControls.InsertRange(insertPos, selectedControls);
            _rows = unselectedControls;

            ReorderRows();
            RelinkStepReferences(oldOrder);

            _selectedIndices.Clear();
            for (int i = 0; i < selectedControls.Count; i++)
            {
                _selectedIndices.Add(insertPos + i);
            }
            _selectedIndex = insertPos;
            _lastAnchorIndex = insertPos;

            UpdateRowSelectionVisuals();
            EnsureRowVisible(_selectedIndex);

            if (OnSelectionChanged != null) OnSelectionChanged(_selectedIndex);
            if (OnTableDataChanged != null) OnTableDataChanged();
        }

        public void StartRowDrag(int srcIndex)
        {
            if (_isEditingLocked || srcIndex < 0 || srcIndex >= _rows.Count || _rows.Count <= 1) return;

            if (!_selectedIndices.Contains(srcIndex))
            {
                SelectOnly(srcIndex);
            }

            foreach (int idx in _selectedIndices)
            {
                if (idx >= 0 && idx < _rows.Count)
                {
                    _rows[idx].IsBeingDragged = true;
                }
            }

            if (_dragFilter != null)
            {
                Application.RemoveMessageFilter(_dragFilter);
                _dragFilter = null;
            }
            _dragFilter = new MacroRowDragFilter(this, _rows[srcIndex]);
            Application.AddMessageFilter(_dragFilter);
        }

        public void UpdateRowDragPosition(MacroRowControl row, Point screenPos)
        {
            if (_rows.Count <= 1) return;

            Point clientPt = pnlContent.PointToClient(screenPos);
            Point containerPt = pnlScrollContainer.PointToClient(screenPos);

            // Auto-scroll when dragging near top/bottom edges
            if (containerPt.Y < 25 && scrollBar.Visible && scrollBar.Value > 0)
            {
                scrollBar.Value = Math.Max(0, scrollBar.Value - 10);
                clientPt = pnlContent.PointToClient(screenPos);
            }
            else if (containerPt.Y > pnlScrollContainer.Height - 25 && scrollBar.Visible && scrollBar.Value < scrollBar.MaxScrollValue)
            {
                scrollBar.Value = Math.Min(scrollBar.MaxScrollValue, scrollBar.Value + 10);
                clientPt = pnlContent.PointToClient(screenPos);
            }

            int targetIdx = -1;
            bool dropBelow = false;

            if (clientPt.Y < 2)
            {
                targetIdx = 0;
                dropBelow = false;
            }
            else
            {
                for (int i = 0; i < _rows.Count; i++)
                {
                    var r = _rows[i];
                    if (clientPt.Y >= r.Top && clientPt.Y <= r.Bottom + 4)
                    {
                        targetIdx = i;
                        dropBelow = clientPt.Y >= (r.Top + r.Height / 2);
                        break;
                    }
                }
                if (targetIdx == -1)
                {
                    targetIdx = _rows.Count - 1;
                    dropBelow = true;
                }
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
                var r = _rows[targetIdx];
                float lineY = _dropBelow ? (r.Bottom + 2) : (r.Top - 2);
                DragDropReorderHelper.DrawInsertionLineAtY(e.Graphics, lineY, 4, pnlContent.Width - 4, _theme != null ? _theme.AccentPrimary : Color.Cyan);
            }
        }

        public void FinishRowDrag(MacroRowControl row, int fromIndex, bool wasDragging)
        {
            _dragFilter = null;
            foreach (MacroRowControl r in _rows)
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
                MoveSelectedRows(targetIdx, dropBelow);
            }
        }

        public void CancelRowDrag()
        {
            _dragFilter = null;
            _dropTargetIndex = -1;
            _dropBelow = false;
            foreach (MacroRowControl r in _rows)
            {
                r.ResetDragState();
            }
            pnlContent.Invalidate();
        }

        public void SelectOnly(int index, bool ensureVisible = true)
        {
            _selectedIndices.Clear();
            if (index >= 0 && index < _rows.Count)
            {
                _selectedIndices.Add(index);
                _selectedIndex = index;
                _lastAnchorIndex = index;
            }
            else
            {
                _selectedIndex = -1;
                _lastAnchorIndex = -1;
            }

            UpdateRowSelectionVisuals();
            if (ensureVisible && _selectedIndex >= 0)
            {
                EnsureRowVisible(_selectedIndex);
            }
            if (OnSelectionChanged != null) OnSelectionChanged(_selectedIndex);
        }

        public void ToggleSelect(int index)
        {
            if (index < 0 || index >= _rows.Count) return;
            if (_selectedIndices.Contains(index))
            {
                _selectedIndices.Remove(index);
                if (_selectedIndex == index)
                {
                    _selectedIndex = _selectedIndices.Count > 0 ? _lastAnchorIndex : -1;
                }
            }
            else
            {
                _selectedIndices.Add(index);
                _lastAnchorIndex = index;
                _selectedIndex = index;
            }

            UpdateRowSelectionVisuals();
            if (OnSelectionChanged != null) OnSelectionChanged(_selectedIndex);
        }

        public void SelectRange(int anchorIndex, int targetIndex)
        {
            if (_rows.Count == 0) return;
            int start = Math.Max(0, Math.Min(anchorIndex, targetIndex));
            int end = Math.Min(_rows.Count - 1, Math.Max(anchorIndex, targetIndex));

            _selectedIndices.Clear();
            for (int i = start; i <= end; i++)
            {
                _selectedIndices.Add(i);
            }
            _selectedIndex = targetIndex;

            UpdateRowSelectionVisuals();
            EnsureRowVisible(targetIndex);
            if (OnSelectionChanged != null) OnSelectionChanged(_selectedIndex);
        }

        public void SelectAll()
        {
            _selectedIndices.Clear();
            for (int i = 0; i < _rows.Count; i++)
            {
                _selectedIndices.Add(i);
            }
            if (_rows.Count > 0)
            {
                _selectedIndex = 0;
                _lastAnchorIndex = 0;
            }
            UpdateRowSelectionVisuals();
            if (OnSelectionChanged != null) OnSelectionChanged(_selectedIndex);
        }

        public void ClearSelection()
        {
            _selectedIndices.Clear();
            _selectedIndex = -1;
            _lastAnchorIndex = -1;
            UpdateRowSelectionVisuals();
            if (OnSelectionChanged != null) OnSelectionChanged(-1);
        }

        public void ToggleAllSelection()
        {
            if (_rows.Count == 0) return;
            if (_selectedIndices.Count == _rows.Count)
            {
                ClearSelection();
            }
            else
            {
                SelectAll();
            }
        }

        public void SelectRow(int index)
        {
            SelectOnly(index);
        }

        private void UpdateRowSelectionVisuals()
        {
            for (int i = 0; i < _rows.Count; i++)
            {
                bool shouldBeSelected = _selectedIndices.Contains(i);
                if (_rows[i].IsSelected != shouldBeSelected)
                {
                    _rows[i].IsSelected = shouldBeSelected;
                }
            }
        }

        public void EnsureRowVisible(int index)
        {
            if (index < 0 || index >= _rows.Count || scrollBar == null) return;
            var r = _rows[index];
            int rowTop = r.Top;
            int rowBottom = r.Bottom;
            int visibleTop = scrollBar.Value;
            int visibleBottom = visibleTop + pnlScrollContainer.Height;

            if (rowTop < visibleTop)
            {
                scrollBar.Value = rowTop;
            }
            else if (rowBottom > visibleBottom)
            {
                scrollBar.Value = Math.Min(scrollBar.MaxScrollValue, rowBottom - pnlScrollContainer.Height + 4);
            }
        }

        public void DeleteSelectedRow()
        {
            if (_isEditingLocked) return;
            List<MacroRowControl> targets = new List<MacroRowControl>();
            foreach (MacroRowControl r in _rows)
            {
                if (r.IsSelected) targets.Add(r);
            }

            if (targets.Count > 0)
            {
                foreach (MacroRowControl r in targets)
                {
                    RemoveRow(r);
                }
            }
            else if (_selectedIndex >= 0 && _selectedIndex < _rows.Count)
            {
                RemoveRow(_rows[_selectedIndex]);
            }
        }

        public void RemoveRow(MacroRowControl row)
        {
            if (_isEditingLocked) return;
            if (_rows.Contains(row))
            {
                List<MacroStep> oldOrder = GetCurrentStepsSnapshot();
                int removedIdx = _rows.IndexOf(row);
                _rows.Remove(row);
                row.Visible = false;
                row.Location = new Point(-2000, -2000);
                _rowPool.Add(row);
                ReorderRows();
                RelinkStepReferences(oldOrder);

                _selectedIndices.Remove(removedIdx);
                HashSet<int> updated = new HashSet<int>();
                foreach (int idx in _selectedIndices)
                {
                    if (idx > removedIdx) updated.Add(idx - 1);
                    else updated.Add(idx);
                }
                _selectedIndices = updated;

                if (_rows.Count == 0)
                {
                    ClearSelection();
                }
                else
                {
                    if (_selectedIndices.Count == 0)
                    {
                        int newSelect = Math.Min(removedIdx, _rows.Count - 1);
                        SelectOnly(newSelect);
                    }
                    else
                    {
                        UpdateRowSelectionVisuals();
                    }
                }

                if (OnTableDataChanged != null) OnTableDataChanged();
            }
        }

        public void BatchDeleteRows(List<MacroRowControl> targets)
        {
            if (_isEditingLocked || targets == null || targets.Count == 0) return;

            List<MacroStep> oldOrder = GetCurrentStepsSnapshot();
            pnlContent.SuspendLayout();
            try
            {
                foreach (MacroRowControl row in targets)
                {
                    if (_rows.Remove(row))
                    {
                        row.Visible = false;
                        row.Location = new Point(-2000, -2000);
                        _rowPool.Add(row);
                    }
                }
                ReorderRows();
                RelinkStepReferences(oldOrder);
                ClearSelection();
            }
            finally
            {
                pnlContent.ResumeLayout();
            }

            if (OnTableDataChanged != null) OnTableDataChanged();
        }

        public void UpdateStepPoint(int stepIndex, bool isStart, Point newPt)
        {
            if (stepIndex >= 0 && stepIndex < _rows.Count)
            {
                if (isStart) _rows[stepIndex].Step.StartPoint = newPt;
                else _rows[stepIndex].Step.EndPoint = newPt;
                _rows[stepIndex].RefreshDisplay();
            }
        }

        public void UpdateStepPointOnly(int stepIndex, bool isStart, Point newPt)
        {
            if (stepIndex >= 0 && stepIndex < _rows.Count)
            {
                if (isStart) _rows[stepIndex].Step.StartPoint = newPt;
                else _rows[stepIndex].Step.EndPoint = newPt;
                _rows[stepIndex].UpdateCoordinatesOnly();
            }
        }

        public void UpdateStepArea(int stepIndex, Point startPt, Point endPt)
        {
            if (stepIndex >= 0 && stepIndex < _rows.Count)
            {
                _rows[stepIndex].Step.StartPoint = startPt;
                _rows[stepIndex].Step.EndPoint = endPt;
                _rows[stepIndex].RefreshDisplay();
            }
        }

        public void UpdateStepAreaOnly(int stepIndex, Point startPt, Point endPt)
        {
            if (stepIndex >= 0 && stepIndex < _rows.Count)
            {
                _rows[stepIndex].Step.StartPoint = startPt;
                _rows[stepIndex].Step.EndPoint = endPt;
                _rows[stepIndex].UpdateCoordinatesOnly();
            }
        }

        public void RefreshAllDisplays()
        {
            foreach (var row in _rows)
            {
                row.RefreshDisplay();
            }
        }

        public void RefreshAllTimingDisplays(int speedPercent)
        {
            foreach (var row in _rows)
            {
                if (row != null)
                {
                    row.UpdateTimingDisplay(speedPercent);
                }
            }
        }

        private List<MacroStep> GetCurrentStepsSnapshot()
        {
            List<MacroStep> list = new List<MacroStep>(_rows.Count);
            for (int i = 0; i < _rows.Count; i++)
            {
                if (_rows[i] != null && _rows[i].Step != null)
                {
                    list.Add(_rows[i].Step);
                }
            }
            return list;
        }

        private void RelinkStepReferences(List<MacroStep> oldOrder)
        {
            if (oldOrder == null || oldOrder.Count == 0 || _rows == null || _rows.Count == 0) return;

            List<MacroStep> newOrder = GetCurrentStepsSnapshot();

            foreach (var step in newOrder)
            {
                if (step == null) continue;

                // 1. IfTrueStep
                if (step.IfTrueStep > 0)
                {
                    int oldTargetIdx = step.IfTrueStep - 1;
                    if (oldTargetIdx >= 0 && oldTargetIdx < oldOrder.Count)
                    {
                        MacroStep targetStep = oldOrder[oldTargetIdx];
                        int newIdx = newOrder.IndexOf(targetStep);
                        if (newIdx >= 0)
                        {
                            step.IfTrueStep = newIdx + 1;
                        }
                        else
                        {
                            step.IfTrueStep = 0; // Target step was deleted -> Next Step
                        }
                    }
                    else if (step.IfTrueStep > newOrder.Count)
                    {
                        step.IfTrueStep = 0;
                    }
                }

                // 2. IfFalseStep
                if (step.IfFalseStep > 0)
                {
                    int oldTargetIdx = step.IfFalseStep - 1;
                    if (oldTargetIdx >= 0 && oldTargetIdx < oldOrder.Count)
                    {
                        MacroStep targetStep = oldOrder[oldTargetIdx];
                        int newIdx = newOrder.IndexOf(targetStep);
                        if (newIdx >= 0)
                        {
                            step.IfFalseStep = newIdx + 1;
                        }
                        else
                        {
                            step.IfFalseStep = 0; // Target step was deleted -> Next Step
                        }
                    }
                    else if (step.IfFalseStep > newOrder.Count)
                    {
                        step.IfFalseStep = 0;
                    }
                }

                // 3. RepeatTimerTargetStep
                if (step.RepeatTimerTargetStep > 0)
                {
                    int oldTargetIdx = step.RepeatTimerTargetStep - 1;
                    if (oldTargetIdx >= 0 && oldTargetIdx < oldOrder.Count)
                    {
                        MacroStep targetStep = oldOrder[oldTargetIdx];
                        int newIdx = newOrder.IndexOf(targetStep);
                        if (newIdx >= 0)
                        {
                            step.RepeatTimerTargetStep = newIdx + 1;
                        }
                        else
                        {
                            step.RepeatTimerTargetStep = Math.Min(1, newOrder.Count);
                        }
                    }
                    else if (step.RepeatTimerTargetStep > newOrder.Count)
                    {
                        step.RepeatTimerTargetStep = Math.Min(1, newOrder.Count);
                    }
                }
            }

            // Refresh UI dropdowns for all rows
            foreach (var r in _rows)
            {
                if (r != null)
                {
                    r.RefreshJumpDropdowns();
                }
            }
        }

        public void SetDefaultWindowForAllSteps(string procName, string winTitle, IntPtr hwnd = default(IntPtr), int windowIndex = 0, uint targetPid = 0)
        {
            if (_rows == null || _rows.Count == 0) return;
            bool isRel = (hwnd != IntPtr.Zero) || !string.IsNullOrEmpty(procName);
            pnlContent.SuspendLayout();
            try
            {
                foreach (var row in _rows)
                {
                    row.SetTargetWindowDirect(isRel, procName, winTitle, hwnd, windowIndex, targetPid);
                }
            }
            finally
            {
                pnlContent.ResumeLayout();
            }
            if (OnTableDataChanged != null) OnTableDataChanged();
        }

        public void ClearAll()
        {
            pnlContent.SuspendLayout();
            foreach (MacroRowControl r in _rows)
            {
                r.Visible = false;
                r.Location = new Point(-2000, -2000);
                _rowPool.Add(r);
            }
            _rows.Clear();
            pnlContent.ResumeLayout();

            ReorderRows();
            ClearSelection();
            if (OnTableDataChanged != null) OnTableDataChanged();
        }

        public void LoadProfile(MacroProfile profile)
        {
            _isLoading = true;
            bool handleCreated = pnlContent.IsHandleCreated;
            if (handleCreated)
            {
                NativeMethods.SendMessage(pnlContent.Handle, NativeMethods.WM_SETREDRAW, (IntPtr)0, IntPtr.Zero);
            }
            pnlContent.SuspendLayout();
            try
            {
                List<MacroStep> stepsToLoad = (profile != null && profile.Steps != null) ? profile.Steps : new List<MacroStep>();
                int targetCount = stepsToLoad.Count;
                int currentCount = _rows.Count;

                // 1. In-place re-use and bind existing active rows (ultra-fast 0-7ms!)
                int reuseCount = Math.Min(currentCount, targetCount);
                for (int i = 0; i < reuseCount; i++)
                {
                    _rows[i].Visible = true;
                    _rows[i].BindStep(stepsToLoad[i], i);
                    _rows[i].SetAvailableScripts(_availableScripts);
                }

                // 2. If target profile has more steps: first take from _rowPool, then create new only if pool empty
                if (targetCount > currentCount)
                {
                    List<Control> newlyCreatedControls = new List<Control>();
                    for (int i = currentCount; i < targetCount; i++)
                    {
                        bool isNewlyCreated;
                        MacroRowControl row = GetOrCreateRow(stepsToLoad[i], i, out isNewlyCreated);
                        _rows.Add(row);
                        if (isNewlyCreated)
                        {
                            newlyCreatedControls.Add(row);
                        }
                    }
                    if (newlyCreatedControls.Count > 0)
                    {
                        pnlContent.Controls.AddRange(newlyCreatedControls.ToArray());
                    }
                }
                // 3. If target profile has fewer steps, recycle excess rows into _rowPool (never Dispose!)
                else if (targetCount < currentCount)
                {
                    for (int i = currentCount - 1; i >= targetCount; i--)
                    {
                        MacroRowControl r = _rows[i];
                        _rows.RemoveAt(i);
                        r.Visible = false;
                        r.Location = new Point(-2000, -2000);
                        _rowPool.Add(r);
                    }
                }

                ReorderRows();
                ClearSelection();
                RefreshAllTimingDisplays(profile != null ? profile.SpeedPercent : 100);
            }
            finally
            {
                pnlContent.ResumeLayout();
                if (handleCreated)
                {
                    NativeMethods.SendMessage(pnlContent.Handle, NativeMethods.WM_SETREDRAW, (IntPtr)1, IntPtr.Zero);
                    pnlContent.Invalidate(true);
                }
                _isLoading = false;
            }
        }

        public void ApplyLanguage()
        {
            if (_lblColNo != null)
            {
                _lblColNo.Text = Loc.ColNo;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColNo, MacroDescriptions.GetHeaderDescription("No."));
            }
            if (_lblColCheck != null)
            {
                _lblColCheck.Text = Loc.ColCheck;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColCheck, MacroDescriptions.GetHeaderDescription("✔"));
            }
            if (_lblColWin != null)
            {
                _lblColWin.Text = Loc.ColWin;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColWin, MacroDescriptions.GetHeaderDescription("Win"));
            }
            if (_lblColAction != null)
            {
                _lblColAction.Text = Loc.ColActionType;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColAction, MacroDescriptions.GetHeaderDescription("Action Type"));
            }
            if (_lblColTarget != null)
            {
                _lblColTarget.Text = Loc.ColTarget;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColTarget, MacroDescriptions.GetHeaderDescription("Target"));
            }
            if (_lblColHold != null)
            {
                _lblColHold.Text = Loc.ColHold;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColHold, MacroDescriptions.GetHeaderDescription("Hold"));
            }
            if (_lblColDelay != null)
            {
                _lblColDelay.Text = Loc.ColDelay;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColDelay, MacroDescriptions.GetHeaderDescription("Delay"));
            }
            if (_lblColRep != null)
            {
                _lblColRep.Text = Loc.ColRep;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColRep, MacroDescriptions.GetHeaderDescription("Rep"));
            }
            if (_lblColDel != null)
            {
                _lblColDel.Text = Loc.ColDel;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColDel, MacroDescriptions.GetHeaderDescription("Del"));
            }
            if (_lblColNote != null)
            {
                _lblColNote.Text = Loc.ColNote;
                if (_headerToolTip != null) _headerToolTip.SetToolTip(_lblColNote, MacroDescriptions.GetHeaderDescription("Note"));
            }

            // Freeze redraw to avoid any flicker when updating all rows
            bool handleCreated = pnlContent != null && pnlContent.IsHandleCreated;
            if (handleCreated)
            {
                NativeMethods.SendMessage(pnlContent.Handle, NativeMethods.WM_SETREDRAW, (IntPtr)0, IntPtr.Zero);
            }
            try
            {
                foreach (MacroRowControl r in _rows)
                {
                    r.ApplyLanguage();
                }
                foreach (MacroRowControl r in _rowPool)
                {
                    r.ApplyLanguage();
                }
            }
            finally
            {
                if (handleCreated)
                {
                    NativeMethods.SendMessage(pnlContent.Handle, NativeMethods.WM_SETREDRAW, (IntPtr)1, IntPtr.Zero);
                    pnlContent.Invalidate(true);
                }
            }
        }

        private void ReorderRows()
        {
            pnlContent.SuspendLayout();
            int currentY = 2;

            for (int i = 0; i < _rows.Count; i++)
            {
                _rows[i].Index = i;
                _rows[i].Location = new Point(0, currentY);
                _rows[i].Width = pnlContent.Width;
                _rows[i].SetTotalStepCount(_rows.Count);
                currentY += _rows[i].Height + 4;
            }
            int totalH = currentY + 2;
            pnlContent.Height = Math.Max(pnlScrollContainer.Height, totalH);
            pnlContent.ResumeLayout();

            scrollBar.Maximum = totalH;
            scrollBar.LargeChange = pnlScrollContainer.Height;
            scrollBar.SmallChange = 38;
            scrollBar.Visible = (totalH > pnlScrollContainer.Height);

            if (!scrollBar.Visible)
            {
                scrollBar.Value = 0;
                pnlContent.Top = 0;
            }
            else
            {
                int maxScroll = Math.Max(0, totalH - pnlScrollContainer.Height);
                if (scrollBar.Value > maxScroll) scrollBar.Value = maxScroll;
                pnlContent.Top = -scrollBar.Value;
            }
        }

        public void HighlightStep(int stepIndex)
        {
            for (int i = 0; i < _rows.Count; i++)
            {
                _rows[i].SetExecutingHighlight(i == stepIndex);
            }
        }

        public void ClearHighlights()
        {
            for (int i = 0; i < _rows.Count; i++)
            {
                _rows[i].SetExecutingHighlight(false);
            }
        }

        private const int WM_PAINT = 0x000F;

        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

            if (m.Msg == WM_PAINT && this.IsHandleCreated && !this.Disposing && !this.IsDisposed)
            {
                using (Graphics g = Graphics.FromHwnd(this.Handle))
                {
                    DrawBorderOnTop(g);
                }
            }
        }

        private void DrawBorderOnTop(Graphics g)
        {
            if (this.BorderSize <= 0 || this.Width <= 0 || this.Height <= 0) return;

            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            using (System.Drawing.Drawing2D.GraphicsPath path = GetRoundedRectangle(rect, this.BorderRadius))
            using (Pen pen = new Pen(this.BorderColor, this.BorderSize))
            {
                pen.Alignment = System.Drawing.Drawing2D.PenAlignment.Inset;
                g.DrawPath(pen, path);
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (pnlHeader == null || pnlScrollContainer == null || scrollBar == null || _rows == null) return;

            int borderPad = Math.Max(1, this.BorderSize);
            int headerH = 22;
            int scrollBarW = 8;
            int availW = Math.Max(100, this.Width - (borderPad * 2) - scrollBarW);
            int availH = Math.Max(50, this.Height - headerH - (borderPad * 2));

            pnlHeader.Location = new Point(borderPad, borderPad);
            pnlHeader.Size = new Size(this.Width - (borderPad * 2), headerH);
            if (_lblColNote != null)
            {
                _lblColNote.Width = Math.Max(72, pnlHeader.Width - _lblColNote.Left - 4);
            }
            pnlScrollContainer.Location = new Point(borderPad, headerH + borderPad);
            pnlScrollContainer.Size = new Size(availW, availH);
            scrollBar.Location = new Point(this.Width - borderPad - scrollBarW, headerH + borderPad);
            scrollBar.Size = new Size(scrollBarW, availH);

            UpdateLayoutSizes(availW, availH);
        }

        private void UpdateLayoutSizes(int availW, int availH)
        {
            if (pnlContent == null) return;

            bool widthChanged = (pnlContent.Width != availW);
            if (widthChanged)
            {
                pnlContent.Width = availW;
                pnlContent.SuspendLayout();
                for (int i = 0; i < _rows.Count; i++)
                {
                    if (_rows[i].Width != availW)
                    {
                        _rows[i].Width = availW;
                    }
                }
                pnlContent.ResumeLayout(true);
            }

            int totalH = (_rows.Count > 0) ? (_rows[_rows.Count - 1].Bottom + 2) : 2;
            pnlContent.Height = Math.Max(availH, totalH);

            scrollBar.Maximum = totalH;
            scrollBar.LargeChange = availH;
            scrollBar.SmallChange = 38;
            scrollBar.Visible = (totalH > availH);

            if (!scrollBar.Visible)
            {
                scrollBar.Value = 0;
                pnlContent.Top = 0;
            }
            else
            {
                int maxScroll = Math.Max(0, totalH - availH);
                if (scrollBar.Value > maxScroll) scrollBar.Value = maxScroll;
                pnlContent.Top = -scrollBar.Value;
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            this.BorderColor = t.AccentPrimary;
            this.BorderRadius = t.RadiusMd;
            this.BorderSize = 2;
            this.BackColor = t.BgPrimary;

            pnlHeader.BackColor = t.BgTertiary;
            foreach (Control c in pnlHeader.Controls)
            {
                Label lbl = c as Label;
                if (lbl != null)
                {
                    bool isInteractive = (lbl.Tag is bool) && (bool)lbl.Tag;
                    lbl.ForeColor = isInteractive ? t.AccentPrimary : t.TextSecondary;
                }
            }

            pnlScrollContainer.BackColor = t.BgPrimary;
            pnlContent.BackColor = t.BgPrimary;

            scrollBar.ApplyTheme(t);

            foreach (MacroRowControl r in _rows)
            {
                r.ApplyTheme(t);
            }

            this.Invalidate();
        }

        private bool HandleTextControlSelectAll()
        {
            Form form = this.FindForm();
            Control focused = null;

            try
            {
                IntPtr hFocus = NativeMethods.GetFocus();
                if (hFocus != IntPtr.Zero)
                {
                    focused = Control.FromHandle(hFocus);
                }
            }
            catch { }

            if (focused == null && form != null)
            {
                focused = GetDeepActiveControl(form);
            }

            if (focused == null) return false;

            // 1. Direct TextBoxBase (TextBox, ModernTextBox, RichTextBox)
            if (focused is TextBoxBase)
            {
                ((TextBoxBase)focused).SelectAll();
                return true;
            }

            // 2. Direct NumberInput
            if (focused is NumberInput)
            {
                ((NumberInput)focused).SelectAll();
                return true;
            }

            // 3. Child control inside NumberInput (e.g. inner edit box)
            if (focused.Parent is NumberInput)
            {
                ((NumberInput)focused.Parent).SelectAll();
                return true;
            }

            // 4. Type name matching for custom or nested edit boxes
            string typeName = focused.GetType().Name;
            if (typeName.IndexOf("TextBox", StringComparison.OrdinalIgnoreCase) >= 0 ||
                typeName.IndexOf("NumberInput", StringComparison.OrdinalIgnoreCase) >= 0 ||
                typeName.IndexOf("UpDownEdit", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                try
                {
                    var mi = focused.GetType().GetMethod("SelectAll", Type.EmptyTypes);
                    if (mi != null)
                    {
                        mi.Invoke(focused, null);
                        return true;
                    }
                }
                catch { }

                if (focused is TextBoxBase)
                {
                    ((TextBoxBase)focused).SelectAll();
                    return true;
                }
            }

            // 5. Win32 Edit control check via GetClassName and EM_SETSEL
            try
            {
                IntPtr hFocus = NativeMethods.GetFocus();
                if (hFocus != IntPtr.Zero)
                {
                    System.Text.StringBuilder className = new System.Text.StringBuilder(64);
                    if (NativeMethods.GetClassName(hFocus, className, className.Capacity) > 0)
                    {
                        string cls = className.ToString().ToLowerInvariant();
                        if (cls == "edit" || cls.Contains("edit"))
                        {
                            NativeMethods.SendMessage(hFocus, 0x00B1 /* EM_SETSEL */, (IntPtr)0, (IntPtr)(-1));
                            return true;
                        }
                    }
                }
            }
            catch { }

            return false;
        }

        private static Control GetDeepActiveControl(ContainerControl container)
        {
            if (container == null) return null;
            Control c = container.ActiveControl;
            while (c is ContainerControl)
            {
                Control child = ((ContainerControl)c).ActiveControl;
                if (child == null) break;
                c = child;
            }
            return c;
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == (Keys.Control | Keys.A))
            {
                if (HandleTextControlSelectAll())
                {
                    return true;
                }
                SelectAll();
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_dragFilter != null)
                {
                    try { Application.RemoveMessageFilter(_dragFilter); } catch { }
                    _dragFilter = null;
                }
                if (_headerToolTip != null)
                {
                    try { _headerToolTip.Dispose(); } catch { }
                    _headerToolTip = null;
                }
                if (_rows != null)
                {
                    foreach (var row in _rows)
                    {
                        try { row.Dispose(); } catch { }
                    }
                    _rows.Clear();
                }
                if (_rowPool != null)
                {
                    foreach (var row in _rowPool)
                    {
                        try { row.Dispose(); } catch { }
                    }
                    _rowPool.Clear();
                }
            }
            base.Dispose(disposing);
        }
    }

    public class BatchNumberInputDialog : Form
    {
        private NumberInput numInput;
        private RoundedButton btnApply;
        private RoundedButton btnCancel;
        public int? ResultValue { get; private set; }

        public BatchNumberInputDialog(string title, string fieldLabel, int min, int max, int defaultVal, ThemeTokens theme)
        {
            theme = theme ?? ThemeTokens.DarkTheme();
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterParent;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.ShowInTaskbar = false;
            this.Size = new Size(280, 160);
            this.Text = title;
            this.BackColor = theme.BgPrimary;
            this.ForeColor = theme.TextPrimary;

            Label lblTitle = new Label
            {
                Text = fieldLabel,
                Location = new Point(20, 16),
                Size = new Size(224, 20),
                Font = ThemeTokens.FontButton(FontStyle.Bold),
                ForeColor = theme.AccentPrimary
            };

            numInput = new NumberInput
            {
                Location = new Point(20, 42),
                Size = new Size(224, 26),
                Minimum = min,
                Maximum = max,
                AllowEmpty = true,
                Value = defaultVal,
                BackColor = theme.BgTertiary,
                ForeColor = theme.TextPrimary,
                Font = ThemeTokens.FontCard(FontStyle.Bold)
            };

            btnApply = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Áp dụng" : "Apply All",
                Location = new Point(20, 78),
                Size = new Size(108, 28),
                BorderRadius = theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = theme.AccentPrimary,
                HoverColor = theme.AccentPrimaryHover,
                ForeColor = Color.White
            };
            btnApply.Click += (s, e) =>
            {
                if (string.IsNullOrEmpty(numInput.Text.Trim()))
                {
                    ResultValue = null;
                }
                else
                {
                    ResultValue = numInput.Value;
                }
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            btnCancel = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Hủy" : "Cancel",
                Location = new Point(136, 78),
                Size = new Size(108, 28),
                BorderRadius = theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = theme.BgElevated,
                HoverColor = theme.BgTertiary,
                ForeColor = theme.TextSecondary
            };
            btnCancel.Click += (s, e) =>
            {
                ResultValue = null;
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            };

            this.Controls.AddRange(new Control[] { lblTitle, numInput, btnApply, btnCancel });
            this.AcceptButton = btnApply;
            this.CancelButton = btnCancel;

            this.Shown += (s, e) =>
            {
                numInput.Focus();
                numInput.SelectAll();
            };
        }
    }

    public class BatchTextInputDialog : Form
    {
        private TextBox txtInput;
        private RoundedButton btnApply;
        private RoundedButton btnCancel;
        public string ResultValue { get; private set; }

        public BatchTextInputDialog(string title, string fieldLabel, string defaultVal, ThemeTokens theme)
        {
            theme = theme ?? ThemeTokens.DarkTheme();
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterParent;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.ShowInTaskbar = false;
            this.Size = new Size(320, 160);
            this.Text = title;
            this.BackColor = theme.BgPrimary;
            this.ForeColor = theme.TextPrimary;

            Label lblTitle = new Label
            {
                Text = fieldLabel,
                Location = new Point(20, 16),
                Size = new Size(264, 20),
                Font = ThemeTokens.FontButton(FontStyle.Bold),
                ForeColor = theme.AccentPrimary
            };

            txtInput = new TextBox
            {
                Location = new Point(20, 42),
                Size = new Size(264, 26),
                Text = defaultVal ?? "",
                BackColor = theme.BgTertiary,
                ForeColor = theme.TextPrimary,
                Font = ThemeTokens.FontButton(FontStyle.Regular)
            };

            btnApply = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Áp dụng" : "Apply All",
                Location = new Point(20, 78),
                Size = new Size(128, 28),
                BorderRadius = theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = theme.AccentPrimary,
                HoverColor = theme.AccentPrimaryHover,
                ForeColor = Color.White
            };
            btnApply.Click += (s, e) =>
            {
                ResultValue = txtInput.Text;
                this.DialogResult = DialogResult.OK;
                this.Close();
            };

            btnCancel = new RoundedButton
            {
                Text = Loc.IsVietnamese ? "Hủy" : "Cancel",
                Location = new Point(156, 78),
                Size = new Size(128, 28),
                BorderRadius = theme.RadiusMd,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = theme.BgElevated,
                HoverColor = theme.BgTertiary,
                ForeColor = theme.TextSecondary
            };
            btnCancel.Click += (s, e) =>
            {
                ResultValue = null;
                this.DialogResult = DialogResult.Cancel;
                this.Close();
            };

            this.Controls.AddRange(new Control[] { lblTitle, txtInput, btnApply, btnCancel });
            this.AcceptButton = btnApply;
            this.CancelButton = btnCancel;

            this.Shown += (s, e) =>
            {
                txtInput.Focus();
                txtInput.SelectAll();
            };
        }
    }
}
