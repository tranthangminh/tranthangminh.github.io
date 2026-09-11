using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class MacroRowControl : UserControl
    {
        private MacroStep _step;
        private int _index;
        private ThemeTokens _theme;
        private bool _isExecuting = false;
        private bool _isSelected = false;
        private bool _isBeingDragged = false;
        private bool _isBinding = false;

        // Controls
        private Label lblIndex;
        private CheckBox chkSelect;
        private Label lblWindowIcon;
        private ModernDropdown cboActionType;
        private ModernDropdown cboTargetScript;
        private List<string> _availableScripts = new List<string>();
        private Label lblCoord;
        private RoundedButton btnPickCoord;
        private NumberInput numScroll;
        private ModernTextBox txtKeyData;
        private Panel pnlColorSwatch;
        private NumberInput numHold;
        private NumberInput numDelay;
        private NumberInput numRepeat;
        private Label lblIfMatch;
        private ModernDropdown cboIfTrue;
        private Label lblIfUnmatch;
        private ModernDropdown cboIfFalse;
        private int _totalStepCount = 0;
        private Label btnDelete;
        private ModernTextBox txtNote;

        public event Action<MacroRowControl> OnDeleteRequested;
        public event Action<MacroRowControl, bool, bool> OnRowClicked;
        public event Action<MacroRowControl> OnRowClickConfirmed;
        public event Action<MacroRowControl> OnDragStarted;
        public event Action OnStepChanged;

        public MacroStep Step
        {
            get
            {
                if (_step != null && chkSelect != null)
                {
                    _step.IsChecked = chkSelect.Checked;
                }
                return _step;
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
            _dragInitiated = false;
            _dragStartPos = Point.Empty;
            _isBeingDragged = false;
            UpdateRowBackground();
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
        public bool IsChecked
        {
            get { return chkSelect != null && chkSelect.Checked; }
            set
            {
                if (chkSelect != null) chkSelect.Checked = value;
            }
        }

        public void SetCheckedDirect(bool isChecked)
        {
            if (chkSelect != null)
            {
                chkSelect.Checked = isChecked;
            }
            if (_step != null)
            {
                _step.Enabled = isChecked;
                _step.IsChecked = isChecked;
            }
        }

        public int Index
        {
            get { return _index; }
            set
            {
                _index = value;
                if (lblIndex != null) lblIndex.Text = (_index + 1).ToString();
                UpdateRowTooltips();
            }
        }

        public MacroRowControl(MacroStep step, int index, ThemeTokens theme)
        {
            _step = step ?? new MacroStep();
            _index = index;
            _theme = theme ?? ThemeTokens.DarkTheme();

            this.Size = new Size(532, 34);
            this.Margin = new Padding(0, 0, 0, 4);
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;

            this.MouseDown += Row_MouseDown;
            this.MouseMove += Row_MouseMove;
            this.MouseUp += Row_MouseUp;

            InitializeRow();
            ApplyTheme(_theme);
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.Style |= 0x02000000; // WS_CLIPCHILDREN
                return cp;
            }
        }

        private Point _dragStartPos = Point.Empty;
        private bool _isMouseDown = false;
        private bool _dragInitiated = false;

        private void Row_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                _isMouseDown = true;
                _dragInitiated = false;
                _dragStartPos = Cursor.Position;
                bool isShift = (Control.ModifierKeys & Keys.Shift) == Keys.Shift;
                bool isCtrl = (Control.ModifierKeys & Keys.Control) == Keys.Control;
                if (OnRowClicked != null)
                {
                    OnRowClicked(this, isShift, isCtrl);
                }
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
                    _dragInitiated = true;
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
                bool isShift = (Control.ModifierKeys & Keys.Shift) == Keys.Shift;
                bool isCtrl = (Control.ModifierKeys & Keys.Control) == Keys.Control;
                if (!isShift && !isCtrl && !_dragInitiated)
                {
                    if (OnRowClickConfirmed != null)
                    {
                        OnRowClickConfirmed(this);
                    }
                }
            }
        }

        private void InitializeRow()
        {
            int x = 2;

            // 1. Index (No prefix #, wider for numbers >= 10)
            lblIndex = new Label
            {
                Text = (_index + 1).ToString(),
                Location = new Point(x, 8),
                Size = new Size(28, 18),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Cursor = Cursors.SizeAll
            };
            lblIndex.MouseDown += Row_MouseDown;
            lblIndex.MouseMove += Row_MouseMove;
            lblIndex.MouseUp += Row_MouseUp;
            x += 30;

            // 2. Checkbox (Enable / Disable Step)
            chkSelect = new CheckBox
            {
                Checked = _step != null ? _step.Enabled : true,
                Location = new Point(x, 8),
                Size = new Size(18, 18)
            };
            chkSelect.CheckedChanged += (s, e) =>
            {
                if (_step != null)
                {
                    _step.Enabled = chkSelect.Checked;
                    _step.IsChecked = chkSelect.Checked;
                }
                if (!_isBinding && OnStepChanged != null) OnStepChanged();
            };
            x += 20;

            // 3. Window Icon (Win)
            lblWindowIcon = new Label
            {
                Location = new Point(x, 6),
                Size = new Size(24, 22),
                Font = new Font("Segoe UI Emoji", 9F),
                TextAlign = ContentAlignment.MiddleCenter,
                Cursor = Cursors.Hand
            };
            UpdateWindowIconDisplay();
            lblWindowIcon.Click += (s, e) => ShowWindowSelectMenu(lblWindowIcon);
            x += 26;

            // 4. Action Type Dropdown
            cboActionType = new ModernDropdown
            {
                Location = new Point(x, 6),
                Size = new Size(116, 22),
                Font = new Font("Segoe UI", 8F, FontStyle.Regular)
            };
            cboActionType.Items.AddRange(new string[] {
                "Left Click",
                "Right Click",
                "Middle / Scroll",
                "Double Click",
                "Drag & Drop",
                "Key Press",
                "Type Text",
                "Delay",
                "Wait Color",
                "If Color",
                "If Color Area",
                "Wait Change",
                "Run Script"
            });
            cboActionType.ItemColorProvider = (idx) => GetActionTypeColor((MacroActionType)idx, _theme);
            cboActionType.SelectedIndex = (int)_step.ActionType;
            cboActionType.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding) return;
                MacroActionType oldType = _step.ActionType;
                MacroActionType newType = (MacroActionType)cboActionType.SelectedIndex;
                _step.ActionType = newType;

                if (newType == MacroActionType.RunScript)
                {
                    _step.HoldMs = 0;
                    if (numHold != null) numHold.Value = 0;
                    if (string.IsNullOrEmpty(_step.KeyData) || _step.KeyData == "Space")
                    {
                        if (_availableScripts.Count > 0) _step.KeyData = _availableScripts[0];
                    }
                }
                else if (newType == MacroActionType.KeyPress)
                {
                    if (oldType != MacroActionType.KeyPress)
                    {
                        // Reset to clean default key if switching from TypeText or other action
                        _step.KeyData = "Space";
                        txtKeyData.Text = "Space";
                        _step.HoldMs = 10;
                        if (numHold != null) numHold.Value = 10;
                    }
                }
                else if (newType == MacroActionType.TypeText)
                {
                    if (oldType != MacroActionType.TypeText)
                    {
                        // Reset to empty for user to type fresh text
                        _step.KeyData = "";
                        txtKeyData.Text = "";
                        _step.HoldMs = 100;
                        if (numHold != null) numHold.Value = 100;
                    }
                }
                else if (newType == MacroActionType.DragDrop)
                {
                    if (_step.HoldMs < 100)
                    {
                        _step.HoldMs = 500;
                        if (numHold != null) numHold.Value = 500;
                    }
                }
                else if (newType == MacroActionType.Delay)
                {
                    _step.HoldMs = 1250;
                    if (numHold != null) numHold.Value = 1250;
                    _step.DelayMs = 250;
                    if (numDelay != null) numDelay.Value = 250;
                }
                else if (newType == MacroActionType.WaitColor || newType == MacroActionType.IfColor || newType == MacroActionType.IfColorArea || newType == MacroActionType.WaitChange)
                {
                    _step.HoldMs = 0;
                    if (numHold != null) numHold.Value = 0;
                    if (_step.DelayMs < 50)
                    {
                        _step.DelayMs = 100;
                        if (numDelay != null) numDelay.Value = 100;
                    }
                    if (newType == MacroActionType.IfColor || newType == MacroActionType.IfColorArea)
                    {
                        if (_step.IfTrueStep == 0) _step.IfTrueStep = -2; // Click Target
                        // _step.IfFalseStep = 0; // Next Step
                    }
                }
                else
                {
                    // Click actions (Left, Right, Middle, Double)
                    if (_step.DelayMs == 1500 || (_step.HoldMs == 1250 && _step.DelayMs == 250))
                    {
                        _step.DelayMs = 240;
                        if (numDelay != null) numDelay.Value = 240;
                        _step.HoldMs = 10;
                        if (numHold != null) numHold.Value = 10;
                    }
                    if (_step.HoldMs == 100 || _step.HoldMs == 500)
                    {
                        _step.HoldMs = 10;
                        if (numHold != null) numHold.Value = 10;
                    }
                }

                UpdateDynamicFields();
                if (OnStepChanged != null) OnStepChanged();
            };
            x += 118;

            // 5. Coordinate Text / Key Text / Scroll Step (Column Width = 118px)
            lblCoord = new Label
            {
                Location = new Point(x, 8),
                Size = new Size(72, 18),
                Font = ThemeTokens.GetMonospaceFont(7.5F),
                TextAlign = ContentAlignment.MiddleRight,
                Cursor = Cursors.Hand
            };
            lblCoord.MouseDown += (s, e) =>
            {
                bool isShift = (Control.ModifierKeys & Keys.Shift) == Keys.Shift;
                bool isCtrl = (Control.ModifierKeys & Keys.Control) == Keys.Control;
                if (isShift || isCtrl)
                {
                    Row_MouseDown(this, e);
                }
            };
            lblCoord.Click += (s, e) =>
            {
                bool isShift = (Control.ModifierKeys & Keys.Shift) == Keys.Shift;
                bool isCtrl = (Control.ModifierKeys & Keys.Control) == Keys.Control;
                if (!isShift && !isCtrl)
                {
                    PickCoordinate();
                }
            };

            btnPickCoord = new RoundedButton
            {
                Text = "🎯",
                Location = new Point(x + 74, 6),
                Size = new Size(22, 22),
                Font = new Font("Segoe UI Symbol", 8F)
            };
            btnPickCoord.Click += (s, e) => PickCoordinate();

            numScroll = new NumberInput
            {
                Location = new Point(x + 72, 6),
                Width = 36,
                Minimum = -99,
                Maximum = 99,
                Step = 1,
                Value = _step.ScrollStep,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                Visible = false
            };
            numScroll.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.ScrollStep = numScroll.Value;
                if (OnStepChanged != null) OnStepChanged();
            };

            txtKeyData = new ModernTextBox
            {
                Text = _step.KeyData,
                Location = new Point(x + 2, 6),
                Size = new Size(114, 22),
                Font = new Font("Segoe UI", 8F),
                Visible = false
            };
            txtKeyData.KeyDown += (s, e) =>
            {
                if (_step.ActionType == MacroActionType.KeyPress)
                {
                    Keys key = e.KeyCode;

                    // Ignore modifier keys pressed alone
                    if (key == Keys.ControlKey || key == Keys.LControlKey || key == Keys.RControlKey ||
                        key == Keys.ShiftKey || key == Keys.LShiftKey || key == Keys.RShiftKey ||
                        key == Keys.Menu || key == Keys.LMenu || key == Keys.RMenu ||
                        key == Keys.Apps)
                    {
                        e.SuppressKeyPress = true;
                        e.Handled = true;
                        return;
                    }

                    System.Collections.Generic.List<string> parts = new System.Collections.Generic.List<string>();
                    if (e.Control) parts.Add("Ctrl");
                    if (e.Shift) parts.Add("Shift");
                    if (e.Alt) parts.Add("Alt");

                    string keyName;
                    if (key >= Keys.A && key <= Keys.Z)
                    {
                        keyName = key.ToString().ToUpper();
                    }
                    else if (key >= Keys.D0 && key <= Keys.D9)
                    {
                        keyName = ((int)key - (int)Keys.D0).ToString();
                    }
                    else if (key >= Keys.NumPad0 && key <= Keys.NumPad9)
                    {
                        keyName = "Num" + ((int)key - (int)Keys.NumPad0).ToString();
                    }
                    else if (key == Keys.Space) keyName = "Space";
                    else if (key == Keys.Return) keyName = "Enter";
                    else if (key == Keys.Escape) keyName = "Esc";
                    else if (key == Keys.Back) keyName = "Backspace";
                    else if (key == Keys.Delete) keyName = "Delete";
                    else if (key == Keys.Insert) keyName = "Insert";
                    else if (key == Keys.Home) keyName = "Home";
                    else if (key == Keys.End) keyName = "End";
                    else if (key == Keys.PageUp) keyName = "PageUp";
                    else if (key == Keys.PageDown) keyName = "PageDown";
                    else if (key == Keys.Up) keyName = "Up";
                    else if (key == Keys.Down) keyName = "Down";
                    else if (key == Keys.Left) keyName = "Left";
                    else if (key == Keys.Right) keyName = "Right";
                    else if (key == Keys.Tab) keyName = "Tab";
                    else if (key >= Keys.F1 && key <= Keys.F24) keyName = key.ToString();
                    else keyName = key.ToString();

                    parts.Add(keyName);
                    string finalKey = string.Join("+", parts.ToArray());

                    _step.KeyData = finalKey;
                    txtKeyData.Text = finalKey;
                    e.SuppressKeyPress = true;
                    e.Handled = true;
                    if (OnStepChanged != null) OnStepChanged();
                }
            };
            txtKeyData.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.KeyData = txtKeyData.Text ?? "";
                if (OnStepChanged != null) OnStepChanged();
            };

            // Target Script Dropdown (for Run Script action)
            cboTargetScript = new ModernDropdown
            {
                Location = new Point(x + 2, 6),
                Size = new Size(114, 22),
                Font = new Font("Segoe UI", 8F, FontStyle.Regular),
                Visible = false
            };
            cboTargetScript.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding) return;
                if (cboTargetScript.SelectedItem != null && _step.ActionType == MacroActionType.RunScript)
                {
                    _step.KeyData = cboTargetScript.SelectedItem;
                    if (OnStepChanged != null) OnStepChanged();
                }
            };

            // Color Swatch Box (Click to customize color with ColorDialog)
            pnlColorSwatch = new Panel
            {
                Location = new Point(x + 2, 8),
                Size = new Size(18, 18),
                Cursor = Cursors.Hand,
                Visible = false
            };
            pnlColorSwatch.Paint += (s, e) =>
            {
                using (SolidBrush b = new SolidBrush(_step.TargetColor))
                using (Pen p = new Pen(Color.FromArgb(200, 255, 255, 255), 1))
                {
                    e.Graphics.FillRectangle(b, 0, 0, 17, 17);
                    e.Graphics.DrawRectangle(p, 0, 0, 17, 17);
                }
            };
            pnlColorSwatch.Click += (s, e) =>
            {
                using (ModernColorDialog mcd = new ModernColorDialog(_step.TargetColor, _step.Tolerance, _theme))
                {
                    if (mcd.ShowDialog(this.FindForm()) == DialogResult.OK)
                    {
                        _step.TargetColor = mcd.SelectedColor;
                        _step.ColorHex = mcd.ColorHex;
                        _step.Tolerance = mcd.Tolerance;
                        pnlColorSwatch.Invalidate();
                        UpdateRowTooltips();
                        if (OnStepChanged != null) OnStepChanged();
                    }
                }
            };
            x += 120;

            // 6. Hold Duration (Hold ms)
            numHold = new NumberInput
            {
                Location = new Point(x + 2, 6),
                Width = 46,
                Minimum = 1,
                Maximum = 999999,
                Step = 10,
                Value = Math.Max(1, _step.HoldMs),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            numHold.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.HoldMs = Math.Max(1, numHold.Value);
                if (OnStepChanged != null) OnStepChanged();
            };
            x += 50;

            // 7. Delay After (Delay ms)
            numDelay = new NumberInput
            {
                Location = new Point(x + 2, 6),
                Width = 48,
                Minimum = 0,
                Maximum = 999999,
                Step = 10,
                Value = Math.Max(0, _step.DelayMs),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            numDelay.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.DelayMs = Math.Max(0, numDelay.Value);
                if (OnStepChanged != null) OnStepChanged();
            };
            x += 52;

            // IfColor Branch Line 2 Controls (Match Jump & Unmatch Jump)
            lblIfMatch = new Label
            {
                Text = "Match:",
                Location = new Point(80, 34),
                AutoSize = true,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.CGreen,
                Visible = false
            };

            cboIfTrue = new ModernDropdown
            {
                Location = new Point(124, 31),
                Size = new Size(96, 22),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                CustomBackColor = Color.FromArgb(40, 22, 101, 52),
                CustomBorderColor = Color.FromArgb(140, 34, 197, 94),
                Visible = false
            };
            cboIfTrue.ItemColorProvider = (idx) =>
            {
                if (idx >= 0 && idx < cboIfTrue.Items.Count)
                {
                    string text = cboIfTrue.Items[idx];
                    if (text == "Click Target" || text == "Next Step") return _theme.CGreen;
                    if (text == "Stop") return _theme.Danger;
                }
                return _theme.TextPrimary;
            };
            cboIfTrue.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding || _isPopulatingJumps) return;
                if ((_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea) && cboIfTrue.SelectedItem != null)
                {
                    string sel = cboIfTrue.SelectedItem;
                    if (sel == "Click Target") _step.IfTrueStep = -2;
                    else if (sel == "Next Step") _step.IfTrueStep = 0;
                    else if (sel == "Stop") _step.IfTrueStep = -1;
                    else if (sel.StartsWith("Step "))
                    {
                        int val;
                        if (int.TryParse(sel.Substring(5), out val)) _step.IfTrueStep = val;
                    }
                    if (OnStepChanged != null) OnStepChanged();
                }
            };

            lblIfUnmatch = new Label
            {
                Text = "Unmatch:",
                Location = new Point(228, 34),
                AutoSize = true,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                ForeColor = _theme.Danger,
                Visible = false
            };

            cboIfFalse = new ModernDropdown
            {
                Location = new Point(286, 31),
                Size = new Size(96, 22),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                CustomBackColor = Color.FromArgb(45, 127, 29, 29),
                CustomBorderColor = Color.FromArgb(140, 239, 68, 68),
                Visible = false
            };
            cboIfFalse.ItemColorProvider = (idx) =>
            {
                if (idx >= 0 && idx < cboIfFalse.Items.Count)
                {
                    string text = cboIfFalse.Items[idx];
                    if (text == "Click Target" || text == "Next Step") return _theme.CGreen;
                    if (text == "Stop") return _theme.Danger;
                }
                return _theme.TextPrimary;
            };
            cboIfFalse.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding || _isPopulatingJumps) return;
                if ((_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea) && cboIfFalse.SelectedItem != null)
                {
                    string sel = cboIfFalse.SelectedItem;
                    if (sel == "Click Target") _step.IfFalseStep = -2;
                    else if (sel == "Next Step") _step.IfFalseStep = 0;
                    else if (sel == "Stop") _step.IfFalseStep = -1;
                    else if (sel.StartsWith("Step "))
                    {
                        int val;
                        if (int.TryParse(sel.Substring(5), out val)) _step.IfFalseStep = val;
                    }
                    if (OnStepChanged != null) OnStepChanged();
                }
            };

            // 8. Repeat Count (Rep)
            numRepeat = new NumberInput
            {
                Location = new Point(x + 2, 6),
                Width = 28,
                Minimum = 1,
                Maximum = 9999,
                Step = 1,
                Value = Math.Max(1, _step.RepeatCount),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            numRepeat.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.RepeatCount = Math.Max(1, numRepeat.Value);
                if (OnStepChanged != null) OnStepChanged();
            };
            x += 32;

            // 9. Delete Button "✕" (Matching Simple style)
            btnDelete = new Label
            {
                Text = "✕",
                Location = new Point(x + 1, 5),
                Size = new Size(24, 24),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Cursor = Cursors.Hand,
                ForeColor = _theme.Danger
            };
            btnDelete.MouseEnter += (s, e) => { btnDelete.ForeColor = _theme.CRed; };
            btnDelete.MouseLeave += (s, e) => { btnDelete.ForeColor = _theme.Danger; };
            btnDelete.Click += (s, e) =>
            {
                if (OnDeleteRequested != null) OnDeleteRequested(this);
            };
            x += 26;

            // 10. Note / Ghi chú TextBox (Placed after Del)
            txtNote = new ModernTextBox
            {
                Text = _step.Note ?? "",
                Location = new Point(x + 2, 6),
                Size = new Size(96, 22),
                Font = new Font("Segoe UI", 8F),
                MaxLength = 50
            };
            txtNote.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.Note = txtNote.Text;
                if (OnStepChanged != null) OnStepChanged();
            };

            this.Controls.AddRange(new Control[] {
                lblIndex, chkSelect, lblWindowIcon, cboActionType,
                cboTargetScript, pnlColorSwatch, lblCoord, btnPickCoord, numScroll, txtKeyData,
                numHold, numDelay, numRepeat, lblIfMatch, cboIfTrue, lblIfUnmatch, cboIfFalse, btnDelete, txtNote
            });

            HookRowSelectionRecursively(this);
            UpdateDynamicFields();
            UpdateRowTooltips();
        }

        public void UpdateWindowIconDisplay()
        {
            if (lblWindowIcon == null) return;
            lblWindowIcon.ImageAlign = ContentAlignment.MiddleCenter;
            lblWindowIcon.Text = "";

            if (_step.RelativeToWindow && !string.IsNullOrEmpty(_step.ProcessName))
            {
                lblWindowIcon.Image = IconCache.GetProcessIcon(_step.ProcessName, _step.WindowTitle) ?? IconCache.GenericAppIcon;
                string tip = string.Format("Target Window: [{0}] {1}\n(Click to change target)", _step.ProcessName, _step.WindowTitle);
                RowToolTipManager.SetToolTip(lblWindowIcon, tip);
            }
            else
            {
                lblWindowIcon.Image = IconCache.DesktopIcon;
                RowToolTipManager.SetToolTip(lblWindowIcon, "Target Window: All Screens (Desktop mode)\n(Click to bind window)");
            }
        }

        private void UpdateRowTooltips()
        {
            RowToolTipManager.SetToolTip(lblIndex, string.Format("Step #{0}:\nDrag the ≡ handle to reorder steps. Click to select row.", _index + 1));
            RowToolTipManager.SetToolTip(chkSelect, string.Format("Enable / Disable Step #{0}:\nWhen unchecked, this step will not run during execution and will not show on the map overlay.", _index + 1));
            UpdateWindowIconDisplay();

            if (cboActionType != null)
                RowToolTipManager.SetToolTip(cboActionType, MacroDescriptions.GetActionTypeDescription(_step.ActionType));

            string targetDesc = MacroDescriptions.GetTargetKeyDescription(_step);
            if (lblCoord != null) RowToolTipManager.SetToolTip(lblCoord, targetDesc);
            if (btnPickCoord != null) RowToolTipManager.SetToolTip(btnPickCoord, targetDesc);
            if (numScroll != null) RowToolTipManager.SetToolTip(numScroll, targetDesc);
            if (txtKeyData != null) RowToolTipManager.SetToolTip(txtKeyData, targetDesc);
            if (cboTargetScript != null) RowToolTipManager.SetToolTip(cboTargetScript, targetDesc);
            if (pnlColorSwatch != null) RowToolTipManager.SetToolTip(pnlColorSwatch, targetDesc);

            if (numHold != null)
                RowToolTipManager.SetToolTip(numHold, MacroDescriptions.GetHoldDescription(_step.ActionType));

            if (numDelay != null)
                RowToolTipManager.SetToolTip(numDelay, MacroDescriptions.GetDelayDescription(_step.ActionType));

            if (numRepeat != null)
                RowToolTipManager.SetToolTip(numRepeat, MacroDescriptions.GetRepeatDescription(_step.ActionType));

            if (cboIfTrue != null)
                RowToolTipManager.SetToolTip(cboIfTrue, "Match Condition (Jump Destination):\n" +
                                                       "If the pixel color at (X, Y) MATCHES the target color:\n" +
                                                       "• Jump to your selected step # to execute next.\n" +
                                                       "• [Stop]: Immediately stop script execution.");

            if (cboIfFalse != null)
                RowToolTipManager.SetToolTip(cboIfFalse, "Unmatch Condition (Jump Destination):\n" +
                                                        "If the pixel color at (X, Y) does NOT match the target color:\n" +
                                                        "• Jump to your selected step # to execute next.\n" +
                                                        "• [Stop]: Immediately stop script execution.");

            if (btnDelete != null)
                RowToolTipManager.SetToolTip(btnDelete, string.Format("Delete Step #{0}:\nRemoves this step from the current script.", _index + 1));

            if (txtNote != null)
                RowToolTipManager.SetToolTip(txtNote, "Step Note:\nCustom notes or description for this specific step.");
        }

        private void ShowWindowSelectMenu(Control anchor)
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(_theme);
            menu.ShowImageMargin = true;

            ToolStripMenuItem itemDesktop = new ToolStripMenuItem("All Screens (Desktop)");
            itemDesktop.Image = IconCache.DesktopIcon;
            itemDesktop.Click += (s, e) =>
            {
                _step.RelativeToWindow = false;
                _step.ProcessName = "";
                _step.WindowTitle = "";
                UpdateWindowIconDisplay();
                if (OnStepChanged != null) OnStepChanged();
            };
            menu.Items.Add(itemDesktop);
            menu.Items.Add(new ToolStripSeparator());

            var windows = NativeMethods.GetOpenWindows();
            if (windows.Count == 0)
            {
                var itemEmpty = new ToolStripMenuItem("(No open windows detected)");
                itemEmpty.Enabled = false;
                menu.Items.Add(itemEmpty);
            }
            else
            {
                foreach (var win in windows)
                {
                    var targetWin = win;
                    string label = win.ToString();
                    ToolStripMenuItem itemWin = new ToolStripMenuItem(label);
                    itemWin.Image = targetWin.AppIcon ?? IconCache.GenericAppIcon;
                    itemWin.Click += (s, e) =>
                    {
                        _step.RelativeToWindow = true;
                        _step.ProcessName = targetWin.ProcessName;
                        _step.WindowTitle = targetWin.Title;
                        if (targetWin.AppIcon != null)
                        {
                            IconCache.CacheProcessIcon(targetWin.ProcessName, targetWin.AppIcon);
                        }
                        UpdateWindowIconDisplay();
                        if (OnStepChanged != null) OnStepChanged();
                    };
                    menu.Items.Add(itemWin);
                }
            }

            menu.Show(anchor, new Point(0, anchor.Height));
        }

        public void BindStep(MacroStep step, int index)
        {
            _isBinding = true;
            try
            {
                _step = step ?? new MacroStep();
                _index = index;
                if (lblIndex != null) lblIndex.Text = (_index + 1).ToString();
                if (chkSelect != null) chkSelect.Checked = _step.Enabled;
                if (cboActionType != null && cboActionType.SelectedIndex != (int)_step.ActionType)
                {
                    cboActionType.SelectedIndex = (int)_step.ActionType;
                }
                if (numHold != null) numHold.Value = _step.HoldMs;
                if (numDelay != null) numDelay.Value = _step.DelayMs;
                if (numRepeat != null) numRepeat.Value = _step.RepeatCount;
                if (numScroll != null) numScroll.Value = _step.ScrollStep;
                if (txtKeyData != null) txtKeyData.Text = _step.KeyData ?? "";
                if (txtNote != null) txtNote.Text = _step.Note ?? "";
                
                UpdateWindowIconDisplay();
                UpdateDynamicFields();
                UpdateRowTooltips();
                this.Invalidate();
            }
            finally
            {
                _isBinding = false;
            }
        }

        public void RefreshDisplay()
        {
            if (numHold != null && numHold.Value != _step.HoldMs) numHold.Value = _step.HoldMs;
            if (numDelay != null && numDelay.Value != _step.DelayMs) numDelay.Value = _step.DelayMs;
            if (numRepeat != null && numRepeat.Value != _step.RepeatCount) numRepeat.Value = _step.RepeatCount;
            if (numScroll != null && numScroll.Value != _step.ScrollStep) numScroll.Value = _step.ScrollStep;
            if (txtKeyData != null && txtKeyData.Text != _step.KeyData) txtKeyData.Text = _step.KeyData ?? "";
            if (txtNote != null && txtNote.Text != _step.Note) txtNote.Text = _step.Note ?? "";
            UpdateWindowIconDisplay();
            UpdateDynamicFields();
            UpdateRowTooltips();
            this.Invalidate();
        }

        private void UpdateDynamicFields()
        {
            int colX = cboActionType.Location.X + cboActionType.Width + 2;
            int colW = 118;

            if (cboIfTrue != null) cboIfTrue.Visible = false;
            if (cboIfFalse != null) cboIfFalse.Visible = false;

            if (_step.ActionType == MacroActionType.RunScript)
            {
                pnlColorSwatch.Visible = false;
                lblCoord.Visible = false;
                btnPickCoord.Visible = false;
                numScroll.Visible = false;
                txtKeyData.Visible = false;

                if (cboTargetScript != null)
                {
                    cboTargetScript.Location = new Point(colX + 2, 6);
                    cboTargetScript.Size = new Size(colW - 4, 22);
                    cboTargetScript.Visible = true;
                    PopulateScriptList();
                }

                numHold.Visible = false;
                numDelay.Visible = true;
                numRepeat.Visible = true;
            }
            else
            {
                if (cboTargetScript != null) cboTargetScript.Visible = false;

                if (_step.ActionType == MacroActionType.KeyPress || _step.ActionType == MacroActionType.TypeText)
                {
                    pnlColorSwatch.Visible = false;
                    lblCoord.Visible = false;
                    btnPickCoord.Visible = false;
                    numScroll.Visible = false;
                    txtKeyData.PlaceholderText = (_step.ActionType == MacroActionType.TypeText) ? "Input some text..." : "Key";
                    txtKeyData.Location = new Point(colX + 2, 6);
                    txtKeyData.Size = new Size(colW - 4, 22);
                    txtKeyData.Visible = true;
                    numHold.Visible = true;
                    numDelay.Visible = true;
                    numRepeat.Visible = true;
                }
                else if (_step.ActionType == MacroActionType.Delay)
                {
                    pnlColorSwatch.Visible = false;
                    lblCoord.Visible = false;
                    btnPickCoord.Visible = false;
                    numScroll.Visible = false;
                    txtKeyData.Visible = false;
                    numHold.Visible = true;
                    numDelay.Visible = true;
                    numRepeat.Visible = true;
                }
            else if (_step.ActionType == MacroActionType.DragDrop)
            {
                pnlColorSwatch.Visible = false;

                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 2, 2);
                lblCoord.Size = new Size(90, 30);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(6.5F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = string.Format("A: {0},{1}\nB: {2},{3}", _step.StartPoint.X, _step.StartPoint.Y, _step.EndPoint.X, _step.EndPoint.Y);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;
                numHold.Visible = true;
                numDelay.Visible = true;
                numRepeat.Visible = true;
            }
            else if (_step.ActionType == MacroActionType.MiddleClick)
            {
                pnlColorSwatch.Visible = false;

                // Sub-item: Scroll Step Input aligned to Left
                numScroll.Location = new Point(colX + 2, 6);
                numScroll.Size = new Size(34, 22);
                numScroll.Visible = true;

                // Coordinate Text + Pick Button aligned to Right
                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 38, 8);
                lblCoord.Size = new Size(54, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = (_step.StartPoint == Point.Empty) ? "(0,0)" : string.Format("({0},{1})", _step.StartPoint.X, _step.StartPoint.Y);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                txtKeyData.Visible = false;
                numHold.Visible = true;
                numDelay.Visible = true;
                numRepeat.Visible = true;
            }
            else if (_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea)
            {
                this.Height = 58;

                // Sub-item: Color Swatch aligned to Left
                pnlColorSwatch.Location = new Point(colX + 2, 8);
                pnlColorSwatch.Visible = true;
                pnlColorSwatch.Invalidate();

                // Coordinate Text + Pick Button aligned to Right
                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                if (_step.ActionType == MacroActionType.IfColorArea)
                {
                    lblCoord.Location = new Point(colX + 18, 2);
                    lblCoord.Size = new Size(74, 30);
                    lblCoord.Font = ThemeTokens.GetMonospaceFont(6.5F);
                    lblCoord.TextAlign = ContentAlignment.MiddleRight;
                    lblCoord.Text = string.Format("A:{0},{1}\nB:{2},{3}", _step.StartPoint.X, _step.StartPoint.Y, _step.EndPoint.X, _step.EndPoint.Y);
                }
                else
                {
                    lblCoord.Location = new Point(colX + 20, 8);
                    lblCoord.Size = new Size(72, 18);
                    lblCoord.Font = ThemeTokens.GetMonospaceFont(7.5F);
                    lblCoord.TextAlign = ContentAlignment.MiddleRight;
                    lblCoord.Text = (_step.StartPoint == Point.Empty) ? "(0, 0)" : string.Format("({0}, {1})", _step.StartPoint.X, _step.StartPoint.Y);
                }

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;
                numHold.Visible = false;
                numDelay.Visible = true;
                numRepeat.Visible = false;

                if (lblIfMatch != null) lblIfMatch.Visible = true;
                if (cboIfTrue != null) cboIfTrue.Visible = true;
                if (lblIfUnmatch != null) lblIfUnmatch.Visible = true;
                if (cboIfFalse != null) cboIfFalse.Visible = true;
                PopulateIfJumpLists();
            }
            else if (_step.ActionType == MacroActionType.WaitColor)
            {
                this.Height = 34;

                // Sub-item: Color Swatch aligned to Left
                pnlColorSwatch.Location = new Point(colX + 2, 8);
                pnlColorSwatch.Visible = true;
                pnlColorSwatch.Invalidate();

                // Coordinate Text + Pick Button aligned to Right
                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 20, 8);
                lblCoord.Size = new Size(72, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7.5F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = (_step.StartPoint == Point.Empty) ? "(0, 0)" : string.Format("({0}, {1})", _step.StartPoint.X, _step.StartPoint.Y);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;
                numHold.Visible = false;
                numDelay.Visible = true;
                numRepeat.Visible = true;

                if (lblIfMatch != null) lblIfMatch.Visible = false;
                if (cboIfTrue != null) cboIfTrue.Visible = false;
                if (lblIfUnmatch != null) lblIfUnmatch.Visible = false;
                if (cboIfFalse != null) cboIfFalse.Visible = false;
            }
            else if (_step.ActionType == MacroActionType.WaitChange)
            {
                this.Height = 34;
                pnlColorSwatch.Visible = false;

                // Coordinate Text + Pick Button aligned to Right
                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 2, 8);
                lblCoord.Size = new Size(90, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = (_step.StartPoint == Point.Empty) ? "🔄 (0, 0)" : string.Format("🔄 ({0},{1})", _step.StartPoint.X, _step.StartPoint.Y);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;
                numHold.Visible = false;
                numDelay.Visible = true;
                numRepeat.Visible = true;
                if (lblIfMatch != null) lblIfMatch.Visible = false;
                if (cboIfTrue != null) cboIfTrue.Visible = false;
                if (lblIfUnmatch != null) lblIfUnmatch.Visible = false;
                if (cboIfFalse != null) cboIfFalse.Visible = false;
            }
            else
            {
                this.Height = 34;
                // LeftClick, RightClick, DoubleClick
                pnlColorSwatch.Visible = false;

                // Coordinate Text + Pick Button aligned to Right
                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 2, 8);
                lblCoord.Size = new Size(90, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7.5F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = (_step.StartPoint == Point.Empty) ? "(0, 0)" : string.Format("({0}, {1})", _step.StartPoint.X, _step.StartPoint.Y);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;
                numHold.Visible = true;
                numDelay.Visible = true;
                numRepeat.Visible = true;
                if (lblIfMatch != null) lblIfMatch.Visible = false;
                if (cboIfTrue != null) cboIfTrue.Visible = false;
                if (lblIfUnmatch != null) lblIfUnmatch.Visible = false;
                if (cboIfFalse != null) cboIfFalse.Visible = false;
            }
            }
            UpdateRowBackground();
            UpdateRowTooltips();
        }

        public void SetTotalStepCount(int count)
        {
            if (_totalStepCount == count) return;
            _totalStepCount = count;
            if (_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea)
            {
                PopulateIfJumpLists();
            }
        }

        private bool _isPopulatingJumps = false;

        private void PopulateIfJumpLists()
        {
            if (cboIfTrue == null || cboIfFalse == null) return;
            _isPopulatingJumps = true;
            try
            {
                int currentRow = _index + 1;
                int maxStepNeeded = Math.Max(1, _totalStepCount);
                if (_step.IfTrueStep > maxStepNeeded) maxStepNeeded = _step.IfTrueStep;
                if (_step.IfFalseStep > maxStepNeeded) maxStepNeeded = _step.IfFalseStep;

                // 1. Populate items (Click Target, Next Step, Step 1..maxStepNeeded, Stop)
                cboIfTrue.Items.Clear();
                cboIfFalse.Items.Clear();

                cboIfTrue.Items.Add("Click Target");
                cboIfTrue.Items.Add("Next Step");
                cboIfFalse.Items.Add("Click Target");
                cboIfFalse.Items.Add("Next Step");

                for (int i = 1; i <= maxStepNeeded; i++)
                {
                    string stepName = string.Format("Step {0}", i);
                    cboIfTrue.Items.Add(stepName);
                    cboIfFalse.Items.Add(stepName);
                }
                cboIfTrue.Items.Add("Stop");
                cboIfFalse.Items.Add("Stop");

                // 2. Resolve True selection (Default: Click Target, value = -2)
                string trueTarget;
                if (_step.IfTrueStep == -2)
                {
                    trueTarget = "Click Target";
                }
                else if (_step.IfTrueStep == 0)
                {
                    trueTarget = "Next Step";
                }
                else if (_step.IfTrueStep == -1)
                {
                    trueTarget = "Stop";
                }
                else if (_step.IfTrueStep > 0)
                {
                    trueTarget = string.Format("Step {0}", _step.IfTrueStep);
                }
                else
                {
                    // Brand new step: default to Click Target (-2)
                    trueTarget = "Click Target";
                    _step.IfTrueStep = -2;
                }

                int trueIdx = cboIfTrue.Items.IndexOf(trueTarget);
                cboIfTrue.SelectedIndex = trueIdx >= 0 ? trueIdx : 0;

                // 3. Resolve False selection (Default: Next Step, value = 0)
                string falseTarget;
                if (_step.IfFalseStep == -2)
                {
                    falseTarget = "Click Target";
                }
                else if (_step.IfFalseStep == 0)
                {
                    falseTarget = "Next Step";
                }
                else if (_step.IfFalseStep == -1)
                {
                    falseTarget = "Stop";
                }
                else if (_step.IfFalseStep > 0)
                {
                    falseTarget = string.Format("Step {0}", _step.IfFalseStep);
                }
                else
                {
                    // Brand new step: default to Next Step (0)
                    falseTarget = "Next Step";
                    _step.IfFalseStep = 0;
                }

                int falseIdx = cboIfFalse.Items.IndexOf(falseTarget);
                cboIfFalse.SelectedIndex = falseIdx >= 0 ? falseIdx : 0;
            }
            finally
            {
                _isPopulatingJumps = false;
            }
        }

        public void SetAvailableScripts(List<string> scripts)
        {
            _availableScripts = scripts ?? new List<string>();
            PopulateScriptList();
        }

        private void PopulateScriptList()
        {
            if (cboTargetScript == null) return;
            cboTargetScript.Items.Clear();

            if (_availableScripts == null || _availableScripts.Count == 0)
            {
                if (!string.IsNullOrEmpty(_step.KeyData))
                {
                    cboTargetScript.Items.Add(_step.KeyData);
                    cboTargetScript.SelectedIndex = 0;
                    cboTargetScript.Enabled = true;
                }
                else
                {
                    cboTargetScript.Items.Add("(No other scripts)");
                    cboTargetScript.SelectedIndex = 0;
                    cboTargetScript.Enabled = false;
                }
                return;
            }

            cboTargetScript.Enabled = true;
            int selectedIdx = -1;
            for (int i = 0; i < _availableScripts.Count; i++)
            {
                cboTargetScript.Items.Add(_availableScripts[i]);
                if (string.Equals(_availableScripts[i], _step.KeyData, StringComparison.OrdinalIgnoreCase))
                {
                    selectedIdx = i;
                }
            }

            if (selectedIdx >= 0)
            {
                cboTargetScript.SelectedIndex = selectedIdx;
            }
            else if (!string.IsNullOrEmpty(_step.KeyData))
            {
                cboTargetScript.Items.Insert(0, _step.KeyData);
                cboTargetScript.SelectedIndex = 0;
            }
            else if (cboTargetScript.Items.Count > 0)
            {
                cboTargetScript.SelectedIndex = 0;
                _step.KeyData = cboTargetScript.SelectedItem;
            }
        }

        public static Color GetActionTypeColor(MacroActionType actionType, ThemeTokens theme)
        {
            if (theme == null) return Color.White;
            switch (actionType)
            {
                case MacroActionType.KeyPress:
                case MacroActionType.TypeText:
                    return theme.COrange;
                case MacroActionType.Delay:
                    return theme.CGreen;
                case MacroActionType.WaitColor:
                case MacroActionType.IfColor:
                case MacroActionType.IfColorArea:
                case MacroActionType.WaitChange:
                    return theme.CBlue;
                case MacroActionType.RunScript:
                    return theme.CYellow;
                default:
                    return theme.TextPrimary;
            }
        }

        private void HookRowSelectionRecursively(Control c)
        {
            if (c != btnDelete && c != chkSelect && c != this && c != lblIndex && c != lblCoord)
            {
                c.MouseDown += Row_MouseDown;
            }
            foreach (Control child in c.Controls)
            {
                HookRowSelectionRecursively(child);
            }
        }

        private void PickCoordinate()
        {
            if (_step.ActionType == MacroActionType.Delay ||
                _step.ActionType == MacroActionType.KeyPress ||
                _step.ActionType == MacroActionType.TypeText)
            {
                return; // Ignore coordinate pick requests for non-coordinate actions
            }

            CoordinatePicker picker = new CoordinatePicker();
            if (_step.ActionType == MacroActionType.DragDrop)
            {
                picker.OnPointSelectedWithWindow += (ptA, colorA, winInfoA, clientPtA) =>
                {
                    if (_step.RelativeToWindow && !string.IsNullOrEmpty(_step.ProcessName))
                    {
                        IntPtr hWnd = NativeMethods.FindWindowByTarget(_step.ProcessName, _step.WindowTitle);
                        if (hWnd != IntPtr.Zero)
                        {
                            NativeMethods.POINT np = new NativeMethods.POINT { X = ptA.X, Y = ptA.Y };
                            if (NativeMethods.ScreenToClient(hWnd, ref np))
                            {
                                _step.StartPoint = new Point(np.X, np.Y);
                            }
                            else _step.StartPoint = ptA;
                        }
                        else if (winInfoA != null)
                        {
                            _step.StartPoint = clientPtA;
                            _step.ProcessName = winInfoA.ProcessName;
                            _step.WindowTitle = winInfoA.Title;
                        }
                        else _step.StartPoint = ptA;
                    }
                    else if (winInfoA != null && !string.IsNullOrEmpty(winInfoA.ProcessName))
                    {
                        _step.RelativeToWindow = true;
                        _step.ProcessName = winInfoA.ProcessName;
                        _step.WindowTitle = winInfoA.Title;
                        _step.StartPoint = clientPtA;
                    }
                    else
                    {
                        _step.StartPoint = ptA;
                    }
                    RefreshDisplay();
                    if (OnStepChanged != null) OnStepChanged();

                    // Open picker for End Point B
                    CoordinatePicker pickerB = new CoordinatePicker();
                    pickerB.OnPointSelectedWithWindow += (ptB, colorB, winInfoB, clientPtB) =>
                    {
                        if (_step.RelativeToWindow && !string.IsNullOrEmpty(_step.ProcessName))
                        {
                            IntPtr hWnd = NativeMethods.FindWindowByTarget(_step.ProcessName, _step.WindowTitle);
                            if (hWnd != IntPtr.Zero)
                            {
                                NativeMethods.POINT np = new NativeMethods.POINT { X = ptB.X, Y = ptB.Y };
                                if (NativeMethods.ScreenToClient(hWnd, ref np))
                                {
                                    _step.EndPoint = new Point(np.X, np.Y);
                                }
                                else _step.EndPoint = ptB;
                            }
                            else if (winInfoB != null)
                            {
                                _step.EndPoint = clientPtB;
                            }
                            else _step.EndPoint = ptB;
                        }
                        else if (winInfoB != null && !string.IsNullOrEmpty(winInfoB.ProcessName))
                        {
                            _step.EndPoint = clientPtB;
                        }
                        else
                        {
                            _step.EndPoint = ptB;
                        }
                        RefreshDisplay();
                        if (OnStepChanged != null) OnStepChanged();
                    };
                    pickerB.Show();
                };
                picker.Show();
            }
            else if (_step.ActionType == MacroActionType.IfColorArea)
            {
                picker.IsAreaSelectionMode = true;
                picker.OnAreaSelectedWithWindow += (screenA, screenB, color, winInfo, clientA, clientB) =>
                {
                    if (_step.RelativeToWindow && !string.IsNullOrEmpty(_step.ProcessName))
                    {
                        IntPtr hWnd = NativeMethods.FindWindowByTarget(_step.ProcessName, _step.WindowTitle);
                        if (hWnd != IntPtr.Zero)
                        {
                            NativeMethods.POINT npA = new NativeMethods.POINT { X = screenA.X, Y = screenA.Y };
                            NativeMethods.POINT npB = new NativeMethods.POINT { X = screenB.X, Y = screenB.Y };
                            if (NativeMethods.ScreenToClient(hWnd, ref npA) && NativeMethods.ScreenToClient(hWnd, ref npB))
                            {
                                _step.StartPoint = new Point(npA.X, npA.Y);
                                _step.EndPoint = new Point(npB.X, npB.Y);
                            }
                            else
                            {
                                _step.StartPoint = screenA;
                                _step.EndPoint = screenB;
                            }
                        }
                        else if (winInfo != null)
                        {
                            _step.StartPoint = clientA;
                            _step.EndPoint = clientB;
                        }
                        else
                        {
                            _step.StartPoint = screenA;
                            _step.EndPoint = screenB;
                        }
                    }
                    else if (winInfo != null && !string.IsNullOrEmpty(winInfo.ProcessName))
                    {
                        _step.RelativeToWindow = true;
                        _step.ProcessName = winInfo.ProcessName;
                        _step.WindowTitle = winInfo.Title;
                        _step.StartPoint = clientA;
                        _step.EndPoint = clientB;
                    }
                    else
                    {
                        _step.StartPoint = screenA;
                        _step.EndPoint = screenB;
                    }

                    _step.TargetColor = color;
                    _step.ColorHex = string.Format("#{0:X2}{1:X2}{2:X2}", color.R, color.G, color.B);
                    RefreshDisplay();
                    if (OnStepChanged != null) OnStepChanged();
                };
                picker.Show();
            }
            else if (_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor)
            {
                picker.OnPointSelectedWithWindow += (pt, color, winInfo, clientPt) =>
                {
                    if (_step.RelativeToWindow && !string.IsNullOrEmpty(_step.ProcessName))
                    {
                        IntPtr hWnd = NativeMethods.FindWindowByTarget(_step.ProcessName, _step.WindowTitle);
                        if (hWnd != IntPtr.Zero)
                        {
                            NativeMethods.POINT np = new NativeMethods.POINT { X = pt.X, Y = pt.Y };
                            if (NativeMethods.ScreenToClient(hWnd, ref np))
                            {
                                _step.StartPoint = new Point(np.X, np.Y);
                            }
                            else _step.StartPoint = pt;
                        }
                        else if (winInfo != null)
                        {
                            _step.StartPoint = clientPt;
                            _step.ProcessName = winInfo.ProcessName;
                            _step.WindowTitle = winInfo.Title;
                        }
                        else _step.StartPoint = pt;
                    }
                    else if (winInfo != null && !string.IsNullOrEmpty(winInfo.ProcessName))
                    {
                        _step.RelativeToWindow = true;
                        _step.ProcessName = winInfo.ProcessName;
                        _step.WindowTitle = winInfo.Title;
                        _step.StartPoint = clientPt;
                    }
                    else
                    {
                        _step.StartPoint = pt;
                    }
                    _step.TargetColor = color;
                    _step.ColorHex = string.Format("#{0:X2}{1:X2}{2:X2}", color.R, color.G, color.B);
                    RefreshDisplay();
                    if (OnStepChanged != null) OnStepChanged();
                };
                picker.Show();
            }
            else
            {
                picker.OnPointSelectedWithWindow += (pt, color, winInfo, clientPt) =>
                {
                    if (_step.RelativeToWindow && !string.IsNullOrEmpty(_step.ProcessName))
                    {
                        IntPtr hWnd = NativeMethods.FindWindowByTarget(_step.ProcessName, _step.WindowTitle);
                        if (hWnd != IntPtr.Zero)
                        {
                            NativeMethods.POINT np = new NativeMethods.POINT { X = pt.X, Y = pt.Y };
                            if (NativeMethods.ScreenToClient(hWnd, ref np))
                            {
                                _step.StartPoint = new Point(np.X, np.Y);
                            }
                            else _step.StartPoint = pt;
                        }
                        else if (winInfo != null)
                        {
                            _step.StartPoint = clientPt;
                            _step.ProcessName = winInfo.ProcessName;
                            _step.WindowTitle = winInfo.Title;
                        }
                        else _step.StartPoint = pt;
                    }
                    else if (winInfo != null && !string.IsNullOrEmpty(winInfo.ProcessName))
                    {
                        _step.RelativeToWindow = true;
                        _step.ProcessName = winInfo.ProcessName;
                        _step.WindowTitle = winInfo.Title;
                        _step.StartPoint = clientPt;
                    }
                    else
                    {
                        _step.StartPoint = pt;
                    }
                    RefreshDisplay();
                    if (OnStepChanged != null) OnStepChanged();
                };
                picker.Show();
            }
        }

        private void UpdateRowBackground()
        {
            Color actionColor = GetActionTypeColor(_step != null ? _step.ActionType : MacroActionType.LeftClick, _theme);
            bool isDark = _theme == null || _theme.IsDark;

            if (_isBeingDragged)
            {
                this.BackColor = isDark ? Color.FromArgb(40, 50, 70) : Color.FromArgb(220, 230, 245);
            }
            else if (_isExecuting)
            {
                this.BackColor = isDark ? Color.FromArgb(60, _theme.Danger.R, _theme.Danger.G, _theme.Danger.B) : Color.FromArgb(254, 226, 226);
            }
            else if (_isSelected)
            {
                if (isDark)
                {
                    if (_step != null && _step.ActionType == MacroActionType.Delay)
                    {
                        this.BackColor = Color.FromArgb(20, 52, 34); // Xanh lá
                    }
                    else if (_step != null && (_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.WaitChange))
                    {
                        this.BackColor = Color.FromArgb(22, 48, 82); // Xanh dương
                    }
                    else if (_step != null && _step.ActionType == MacroActionType.RunScript)
                    {
                        this.BackColor = Color.FromArgb(56, 48, 16); // Vàng
                    }
                    else if (_step != null && (_step.ActionType == MacroActionType.KeyPress || _step.ActionType == MacroActionType.TypeText))
                    {
                        this.BackColor = Color.FromArgb(56, 36, 16); // Cam
                    }
                    else
                    {
                        // Clicks (Trắng): nền trắng bạc nổi bật
                        this.BackColor = Color.FromArgb(55, 62, 75);
                    }
                }
                else
                {
                    // Light Mode
                    if (_step != null && _step.ActionType == MacroActionType.Delay)
                    {
                        this.BackColor = Color.FromArgb(215, 248, 225); // Xanh lá pastel
                    }
                    else if (_step != null && (_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.WaitChange))
                    {
                        this.BackColor = Color.FromArgb(220, 240, 255); // Xanh dương pastel
                    }
                    else if (_step != null && _step.ActionType == MacroActionType.RunScript)
                    {
                        this.BackColor = Color.FromArgb(254, 246, 205); // Vàng pastel
                    }
                    else if (_step != null && (_step.ActionType == MacroActionType.KeyPress || _step.ActionType == MacroActionType.TypeText))
                    {
                        this.BackColor = Color.FromArgb(255, 235, 215); // Cam pastel
                    }
                    else
                    {
                        // Clicks (Trắng): nền trắng tinh khiết
                        this.BackColor = Color.FromArgb(255, 255, 255);
                    }
                }
            }
            else
            {
                this.BackColor = _theme != null ? _theme.BgSecondary : Color.FromArgb(34, 34, 34);
            }

            if (lblIndex != null)
            {
                lblIndex.ForeColor = actionColor;
            }

            this.Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Color actionColor = GetActionTypeColor(_step != null ? _step.ActionType : MacroActionType.LeftClick, _theme);

            if (_isExecuting)
            {
                using (SolidBrush execBrush = new SolidBrush(_theme.Danger))
                {
                    e.Graphics.FillRectangle(execBrush, 0, 0, 4, this.Height);
                }
                using (Pen borderPen = new Pen(_theme.Danger, 1.5f))
                {
                    e.Graphics.DrawRectangle(borderPen, 0, 0, this.Width - 1, this.Height - 1);
                }
            }
            else if (_isSelected && !_isBeingDragged)
            {
                // Chỉ hiện thanh màu và viền bao quanh khi ĐƯỢC SELECT
                using (SolidBrush accentBrush = new SolidBrush(actionColor))
                {
                    e.Graphics.FillRectangle(accentBrush, 0, 0, 4, this.Height);
                }
                using (Pen borderPen = new Pen(Color.FromArgb(220, actionColor.R, actionColor.G, actionColor.B), 1.5f))
                {
                    e.Graphics.DrawRectangle(borderPen, 0, 0, this.Width - 1, this.Height - 1);
                }
            }
            // Khi không được select: không vẽ thanh màu phía trước
        }

        public void SetExecutingHighlight(bool executing)
        {
            _isExecuting = executing;
            UpdateRowBackground();
        }

        public void SetEnabledDirect(bool val)
        {
            SetCheckedDirect(val);
        }

        public void SetActionTypeDirect(MacroActionType type)
        {
            _step.ActionType = type;
            if (cboActionType != null)
            {
                cboActionType.SelectedIndex = (int)type;
            }
            UpdateDynamicFields();
        }

        public void SetTargetWindowDirect(bool rel, string proc, string title)
        {
            _step.RelativeToWindow = rel;
            _step.ProcessName = proc ?? "";
            _step.WindowTitle = title ?? "";
            UpdateWindowIconDisplay();
        }

        public void UpdateHoldValue(int val)
        {
            _step.HoldMs = val;
            if (numHold != null) numHold.Value = val;
        }

        public void UpdateDelayValue(int val)
        {
            _step.DelayMs = val;
            if (numDelay != null) numDelay.Value = val;
        }

        public void UpdateRepeatValue(int val)
        {
            _step.RepeatCount = val;
            if (numRepeat != null) numRepeat.Value = val;
        }

        public void UpdateStartPoint(Point pt)
        {
            _step.StartPoint = pt;
            if (lblCoord != null)
            {
                if (_step.ActionType == MacroActionType.DragDrop)
                {
                    lblCoord.Text = string.Format("A: {0},{1}", _step.StartPoint.X, _step.StartPoint.Y);
                }
                else
                {
                    lblCoord.Text = string.Format("{0}, {1}", _step.StartPoint.X, _step.StartPoint.Y);
                }
            }
            this.Invalidate();
        }

        public void UpdateColor(Color col)
        {
            _step.TargetColor = col;
            if (pnlColorSwatch != null)
            {
                pnlColorSwatch.BackColor = col;
                pnlColorSwatch.Invalidate();
            }
        }

        public void UpdateNoteValue(string note)
        {
            _step.Note = note ?? "";
            if (txtNote != null)
            {
                txtNote.Text = _step.Note;
            }
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();
            UpdateRowBackground();

            Color actionColor = GetActionTypeColor(_step != null ? _step.ActionType : MacroActionType.LeftClick, _theme);
            if (lblIndex != null) lblIndex.ForeColor = actionColor;
            if (cboActionType != null)
            {
                cboActionType.ApplyTheme(_theme);
            }
            if (cboTargetScript != null)
            {
                cboTargetScript.ApplyTheme(_theme);
            }
            if (lblCoord != null) lblCoord.ForeColor = _theme.TextPrimary;
            if (btnPickCoord != null)
            {
                btnPickCoord.NormalColor = _theme.BgTertiary;
                btnPickCoord.HoverColor = _theme.AccentPrimary;
                btnPickCoord.ForeColor = _theme.TextPrimary;
            }
            if (numScroll != null) numScroll.ApplyTheme(_theme);
            if (txtKeyData != null) txtKeyData.ApplyTheme(_theme);
            if (numHold != null) numHold.ApplyTheme(_theme);
            if (numDelay != null) numDelay.ApplyTheme(_theme);
            if (numRepeat != null) numRepeat.ApplyTheme(_theme);
            if (lblIfMatch != null) lblIfMatch.ForeColor = _theme.CGreen;
            if (lblIfUnmatch != null) lblIfUnmatch.ForeColor = _theme.Danger;
            if (cboIfTrue != null)
            {
                cboIfTrue.CustomBackColor = Color.FromArgb(40, 22, 101, 52);
                cboIfTrue.CustomBorderColor = Color.FromArgb(140, _theme.CGreen.R, _theme.CGreen.G, _theme.CGreen.B);
                cboIfTrue.ApplyTheme(_theme);
            }
            if (cboIfFalse != null)
            {
                cboIfFalse.CustomBackColor = Color.FromArgb(45, 127, 29, 29);
                cboIfFalse.CustomBorderColor = Color.FromArgb(140, _theme.Danger.R, _theme.Danger.G, _theme.Danger.B);
                cboIfFalse.ApplyTheme(_theme);
            }
            if (txtNote != null) txtNote.ApplyTheme(_theme);
            if (btnDelete != null) btnDelete.ForeColor = _theme.Danger;
            UpdateWindowIconDisplay();
        }
    }
}
