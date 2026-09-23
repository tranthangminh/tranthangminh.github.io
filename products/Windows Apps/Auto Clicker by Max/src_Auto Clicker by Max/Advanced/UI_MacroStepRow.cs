using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

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
        private Panel pnlImageThumb;
        private NumberInput numSimilarity;
        private NumberInput numTimeout;
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

        private static readonly MacroActionType[] ActionTypeDisplayList = new MacroActionType[]
        {
            MacroActionType.LeftClick,
            MacroActionType.RightClick,
            MacroActionType.MiddleClick,
            MacroActionType.DoubleClick,
            MacroActionType.DragDrop,
            MacroActionType.KeyPress,
            MacroActionType.TypeText,
            MacroActionType.Delay,
            MacroActionType.WaitColor,
            MacroActionType.IfColor,
            MacroActionType.WaitImage,
            MacroActionType.IfImage,
            MacroActionType.WaitChange,
            MacroActionType.RunScript
        };

        private static int GetActionTypeIndex(MacroActionType actionType)
        {
            if (actionType == MacroActionType.IfColorArea) return 9; // Map to IfColor
            for (int i = 0; i < ActionTypeDisplayList.Length; i++)
            {
                if (ActionTypeDisplayList[i] == actionType) return i;
            }
            return 0;
        }

        private static MacroActionType GetActionTypeFromIndex(int index)
        {
            if (index >= 0 && index < ActionTypeDisplayList.Length)
            {
                return ActionTypeDisplayList[index];
            }
            return MacroActionType.LeftClick;
        }

        private void PopulateActionTypes()
        {
            if (cboActionType == null) return;
            cboActionType.Items.Clear();
            for (int i = 0; i < ActionTypeDisplayList.Length; i++)
            {
                cboActionType.Items.Add(Loc.GetActionTypeName(ActionTypeDisplayList[i]));
            }
        }

        private void InitializeRow()
        {
            this.SuspendLayout();

            int x = 6;

            // 1. Reorder Handle / Step Index Label (Width = 42px)
            lblIndex = new Label
            {
                Text = (_index + 1).ToString(),
                Location = new Point(x, 6),
                Size = new Size(42, 22),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Cursor = Cursors.SizeAll
            };
            lblIndex.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left && OnDragStarted != null)
                {
                    OnDragStarted(this);
                }
            };
            x += 44;

            // 2. Enable/Disable Step CheckBox (Width = 18px)
            chkSelect = new CheckBox
            {
                Checked = _step.Enabled,
                Location = new Point(x, 9),
                Size = new Size(18, 18),
                Cursor = Cursors.Hand
            };
            chkSelect.CheckedChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.Enabled = chkSelect.Checked;
                if (OnStepChanged != null) OnStepChanged();
            };
            x += 20;

            // 3. Process / Window Icon Indicator (Width = 22px)
            lblWindowIcon = new Label
            {
                Location = new Point(x, 6),
                Size = new Size(20, 20),
                Cursor = Cursors.Hand,
                TextAlign = ContentAlignment.MiddleCenter
            };
            lblWindowIcon.Click += (s, e) => ShowWindowSelectMenu(lblWindowIcon);
            x += 22;

            // 4. Action Type Dropdown (Width = 116px)
            cboActionType = new ModernDropdown
            {
                Location = new Point(x, 6),
                Size = new Size(116, 22),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Regular)
            };
            PopulateActionTypes();
            cboActionType.ItemColorProvider = (idx) => GetActionTypeColor(GetActionTypeFromIndex(idx), _theme);
            cboActionType.SelectedIndex = GetActionTypeIndex(_step.ActionType);
            cboActionType.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding) return;
                MacroActionType oldType = _step.ActionType;
                MacroActionType newType = GetActionTypeFromIndex(cboActionType.SelectedIndex);
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
                else if (newType == MacroActionType.WaitColor || newType == MacroActionType.IfColor || newType == MacroActionType.IfColorArea || newType == MacroActionType.WaitChange || newType == MacroActionType.WaitImage || newType == MacroActionType.IfImage)
                {
                    _step.HoldMs = 0;
                    if (numHold != null) numHold.Value = 0;
                    if (_step.DelayMs < 50)
                    {
                        _step.DelayMs = 100;
                        if (numDelay != null) numDelay.Value = 100;
                    }
                    if (newType == MacroActionType.IfColor || newType == MacroActionType.IfColorArea || newType == MacroActionType.IfImage)
                    {
                        if (_step.IfTrueStep == 0) _step.IfTrueStep = -2; // Click Target
                        // _step.IfFalseStep = 0; // Next Step
                    }
                    if (newType == MacroActionType.WaitImage)
                    {
                        if (_step.TimeoutSec <= 0) _step.TimeoutSec = 10;
                        if (numTimeout != null) numTimeout.Value = _step.TimeoutSec;
                    }
                    if (newType == MacroActionType.WaitImage || newType == MacroActionType.IfImage)
                    {
                        if (_step.Similarity <= 0) _step.Similarity = 90;
                        if (numSimilarity != null) numSimilarity.Value = _step.Similarity;
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
                Font = ThemeTokens.GetMonospaceFont(10.5F),
                TextAlign = ContentAlignment.MiddleRight,
                Cursor = Cursors.Hand
            };
            lblCoord.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Right && (_step.ActionType == MacroActionType.WaitImage || _step.ActionType == MacroActionType.IfImage))
                {
                    _step.StartPoint = Point.Empty;
                    _step.EndPoint = Point.Empty;
                    RefreshDisplay();
                    if (OnStepChanged != null) OnStepChanged();
                    return;
                }
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
                Font = ThemeTokens.FontSegoeSymbol(11F)
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
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
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
                Font = ThemeTokens.FontSegoe(11F),
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
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Regular),
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

            // Image Thumbnail Box (Click to crop, right-click for options)
            pnlImageThumb = new Panel
            {
                Location = new Point(x + 2, 7),
                Size = new Size(32, 20),
                Cursor = Cursors.Hand,
                Visible = false
            };
            pnlImageThumb.Paint += (s, e) =>
            {
                Graphics g = e.Graphics;
                Bitmap bmp = _step != null ? _step.GetTemplateBitmap() : null;
                if (bmp != null)
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    float scale = Math.Min(30f / bmp.Width, 18f / bmp.Height);
                    int dw = Math.Max(1, (int)(bmp.Width * scale));
                    int dh = Math.Max(1, (int)(bmp.Height * scale));
                    int dx = (32 - dw) / 2;
                    int dy = (20 - dh) / 2;
                    g.DrawImage(bmp, dx, dy, dw, dh);
                    using (Pen borderPen = new Pen(_theme.CPurple, 1))
                    {
                        g.DrawRectangle(borderPen, 0, 0, 31, 19);
                    }
                }
                else
                {
                    using (Pen dashedPen = new Pen(_theme.TextTertiary, 1))
                    {
                        dashedPen.DashStyle = System.Drawing.Drawing2D.DashStyle.Dot;
                        g.DrawRectangle(dashedPen, 0, 0, 31, 19);
                    }
                    using (Font symFont = ThemeTokens.FontSegoeSymbol(8.5F))
                    using (SolidBrush symBrush = new SolidBrush(_theme.TextTertiary))
                    {
                        g.DrawString("📷", symFont, symBrush, 5, 2);
                    }
                }
            };
            pnlImageThumb.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Right)
                {
                    ShowImageContextMenu(pnlImageThumb, e.Location);
                }
                else if (e.Button == MouseButtons.Left)
                {
                    PickImageSnipping();
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
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold)
            };
            numHold.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.HoldMs = Math.Max(1, numHold.Value);
                if (OnStepChanged != null) OnStepChanged();
            };

            // Image Similarity Input (50 - 100%)
            numSimilarity = new NumberInput
            {
                Location = new Point(x + 2, 6),
                Width = 46,
                Minimum = 50,
                Maximum = 100,
                Step = 1,
                Value = _step.Similarity > 0 ? _step.Similarity : 90,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Visible = false
            };
            numSimilarity.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.Similarity = Math.Max(50, Math.Min(100, numSimilarity.Value));
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
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold)
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
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                ForeColor = _theme.CGreen,
                Visible = false
            };

            cboIfTrue = new ModernDropdown
            {
                Location = new Point(124, 31),
                Size = new Size(96, 22),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                CustomBackColor = Color.FromArgb(40, 22, 101, 52),
                CustomBorderColor = Color.FromArgb(140, 34, 197, 94),
                Visible = false
            };
            cboIfTrue.ItemColorProvider = (idx) =>
            {
                if (idx >= 0 && idx < cboIfTrue.Items.Count)
                {
                    if (idx == 0 || idx == 1) return _theme.CGreen;
                    if (idx == cboIfTrue.Items.Count - 1) return _theme.Danger;
                }
                return _theme.TextPrimary;
            };
            cboIfTrue.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding || _isPopulatingJumps) return;
                if ((_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea || _step.ActionType == MacroActionType.IfImage))
                {
                    int idx = cboIfTrue.SelectedIndex;
                    if (idx == 0) _step.IfTrueStep = -2;
                    else if (idx == 1) _step.IfTrueStep = 0;
                    else if (idx == cboIfTrue.Items.Count - 1) _step.IfTrueStep = -1;
                    else if (idx >= 2) _step.IfTrueStep = idx - 1;

                    if (OnStepChanged != null) OnStepChanged();
                }
            };

            lblIfUnmatch = new Label
            {
                Text = "Unmatch:",
                Location = new Point(228, 34),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                ForeColor = _theme.Danger,
                Visible = false
            };

            cboIfFalse = new ModernDropdown
            {
                Location = new Point(286, 31),
                Size = new Size(96, 22),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                CustomBackColor = Color.FromArgb(45, 127, 29, 29),
                CustomBorderColor = Color.FromArgb(140, 239, 68, 68),
                Visible = false
            };
            cboIfFalse.ItemColorProvider = (idx) =>
            {
                if (idx >= 0 && idx < cboIfFalse.Items.Count)
                {
                    if (idx == 0 || idx == 1) return _theme.CGreen;
                    if (idx == cboIfFalse.Items.Count - 1) return _theme.Danger;
                }
                return _theme.TextPrimary;
            };
            cboIfFalse.SelectedIndexChanged += (s, e) =>
            {
                if (_isBinding || _isPopulatingJumps) return;
                if ((_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea || _step.ActionType == MacroActionType.IfImage))
                {
                    int idx = cboIfFalse.SelectedIndex;
                    if (idx == 0) _step.IfFalseStep = -2;
                    else if (idx == 1) _step.IfFalseStep = 0;
                    else if (idx == cboIfFalse.Items.Count - 1) _step.IfFalseStep = -1;
                    else if (idx >= 2) _step.IfFalseStep = idx - 1;

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
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold)
            };
            numRepeat.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.RepeatCount = Math.Max(1, numRepeat.Value);
                if (OnStepChanged != null) OnStepChanged();
            };

            // Image Timeout Input (seconds)
            numTimeout = new NumberInput
            {
                Location = new Point(x + 2, 6),
                Width = 28,
                Minimum = 0,
                Maximum = 9999,
                Step = 1,
                Value = _step.TimeoutSec > 0 ? _step.TimeoutSec : 10,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Visible = false
            };
            numTimeout.TextChanged += (s, e) =>
            {
                if (_isBinding) return;
                _step.TimeoutSec = Math.Max(0, numTimeout.Value);
                if (OnStepChanged != null) OnStepChanged();
            };
            x += 32;

            // 9. Delete Button "✕" (Matching Simple style)
            btnDelete = new Label
            {
                Text = "✕",
                Location = new Point(x + 1, 5),
                Size = new Size(24, 24),
                Font = ThemeTokens.FontSegoe(12F, FontStyle.Bold),
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
                Font = ThemeTokens.FontSegoe(11F),
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
                cboTargetScript, pnlColorSwatch, pnlImageThumb, lblCoord, btnPickCoord, numScroll, txtKeyData,
                numHold, numSimilarity, numDelay, numRepeat, numTimeout, lblIfMatch, cboIfTrue, lblIfUnmatch, cboIfFalse, btnDelete, txtNote
            });

            HookRowSelectionRecursively(this);
            UpdateWindowIconDisplay();
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
                string tip = Loc.IsVietnamese
                    ? string.Format("Cửa sổ Mục tiêu: [{0}] {1}\n(Bấm để đổi mục tiêu)", _step.ProcessName, _step.WindowTitle)
                    : string.Format("Target Window: [{0}] {1}\n(Click to change target)", _step.ProcessName, _step.WindowTitle);
                RowToolTipManager.SetToolTip(lblWindowIcon, tip);
            }
            else
            {
                lblWindowIcon.Image = IconCache.DesktopIcon;
                string tip = Loc.IsVietnamese
                    ? "Cửa sổ Mục tiêu: Toàn màn hình (Chế độ Desktop)\n(Bấm để gắn vào cửa sổ)"
                    : "Target Window: All Screens (Desktop mode)\n(Click to bind window)";
                RowToolTipManager.SetToolTip(lblWindowIcon, tip);
            }
        }

        public void ApplyLanguage()
        {
            bool prevBinding = _isBinding;
            _isBinding = true;
            try
            {
                if (cboActionType != null)
                {
                    int sel = cboActionType.SelectedIndex;
                    PopulateActionTypes();
                    cboActionType.SelectedIndex = (sel >= 0 && sel < cboActionType.Items.Count) ? sel : 0;
                }
                if (_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea || _step.ActionType == MacroActionType.IfImage)
                {
                    PopulateIfJumpLists();
                }
                UpdateDynamicFields();
                UpdateWindowIconDisplay();
                UpdateRowTooltips();
            }
            finally
            {
                _isBinding = prevBinding;
            }
        }

        private void UpdateRowTooltips()
        {
            RowToolTipManager.SetToolTip(lblIndex, Loc.IsVietnamese
                ? string.Format("Bước #{0}:\nKéo nút ≡ để sắp xếp lại các bước. Nhấp để chọn hàng.", _index + 1)
                : string.Format("Step #{0}:\nDrag the ≡ handle to reorder steps. Click to select row.", _index + 1));
            RowToolTipManager.SetToolTip(chkSelect, Loc.IsVietnamese
                ? string.Format("Bật / Tắt Bước #{0}:\nKhi bỏ chọn, bước này sẽ không chạy khi thực thi và không hiển thị trên bản đồ overlay.", _index + 1)
                : string.Format("Enable / Disable Step #{0}:\nWhen unchecked, this step will not run during execution and will not show on the map overlay.", _index + 1));

            if (cboActionType != null)
                RowToolTipManager.SetToolTip(cboActionType, MacroDescriptions.GetActionTypeDescription(_step.ActionType));

            string targetDesc = MacroDescriptions.GetTargetKeyDescription(_step);
            if (lblCoord != null) RowToolTipManager.SetToolTip(lblCoord, targetDesc);
            if (btnPickCoord != null) RowToolTipManager.SetToolTip(btnPickCoord, targetDesc);
            if (numScroll != null) RowToolTipManager.SetToolTip(numScroll, targetDesc);
            if (txtKeyData != null) RowToolTipManager.SetToolTip(txtKeyData, targetDesc);
            if (cboTargetScript != null) RowToolTipManager.SetToolTip(cboTargetScript, targetDesc);
            if (pnlColorSwatch != null) RowToolTipManager.SetToolTip(pnlColorSwatch, targetDesc);
            if (pnlImageThumb != null)
            {
                string imgDesc;
                if (Loc.IsVietnamese)
                {
                    imgDesc = (_step != null && !string.IsNullOrEmpty(_step.ImageBase64))
                        ? "Hình ảnh Mẫu:\nChuột trái: Chụp ảnh mới từ màn hình.\nChuột phải: Nhập / Xuất / Xem trước / Xóa."
                        : "Hình ảnh Mẫu:\nChuột trái: Chụp ảnh mẫu từ màn hình.\nChuột phải để mở tùy chọn.";
                }
                else
                {
                    imgDesc = (_step != null && !string.IsNullOrEmpty(_step.ImageBase64))
                        ? "Template Image:\nLeft-click: Capture new image from screen.\nRight-click: Import / Export / Preview / Clear."
                        : "Template Image:\nLeft-click to capture template image from screen.\nRight-click for options.";
                }
                RowToolTipManager.SetToolTip(pnlImageThumb, imgDesc);
            }

            if (numSimilarity != null)
                RowToolTipManager.SetToolTip(numSimilarity, Loc.IsVietnamese
                    ? "Độ tương đồng (%):\nNgưỡng khớp chấp nhận được (50% - 100%, Mặc định: 90%)."
                    : "Similarity (%):\nAcceptable match threshold (50% - 100%, Default: 90%).");

            if (numTimeout != null)
                RowToolTipManager.SetToolTip(numTimeout, Loc.IsVietnamese
                    ? "Thời gian chờ (giây):\nThời gian tối đa chờ hình ảnh mẫu xuất hiện. 0 = chờ vô hạn."
                    : "Timeout (seconds):\nMaximum duration to wait for the template image to appear. 0 = wait indefinitely.");

            if (numHold != null)
                RowToolTipManager.SetToolTip(numHold, MacroDescriptions.GetHoldDescription(_step.ActionType));

            if (numDelay != null)
                RowToolTipManager.SetToolTip(numDelay, MacroDescriptions.GetDelayDescription(_step.ActionType));

            if (numRepeat != null)
                RowToolTipManager.SetToolTip(numRepeat, MacroDescriptions.GetRepeatDescription(_step.ActionType));

            if (cboIfTrue != null)
            {
                if (_step.ActionType == MacroActionType.IfImage)
                {
                    RowToolTipManager.SetToolTip(cboIfTrue, Loc.IsVietnamese
                        ? "Nếu Thấy (Hành động khi tìm thấy hình ảnh mẫu):\n" +
                          "• [Click Tâm ảnh]: Click vào điểm giữa hình tìm thấy.\n" +
                          "• [Bước kế tiếp]: Tiếp tục thực hiện bước kế tiếp.\n" +
                          "• Nhảy đến số bước đã chọn để thực hiện tiếp.\n" +
                          "• [Dừng lại]: Dừng chạy script ngay lập tức."
                        : "If Found (Action when template image is found):\n" +
                          "• [Click Center]: Click at the center of the found image.\n" +
                          "• [Next Step]: Continue to the next step.\n" +
                          "• Jump to your selected step # to execute next.\n" +
                          "• [Stop]: Immediately stop script execution.");
                }
                else
                {
                    RowToolTipManager.SetToolTip(cboIfTrue, Loc.IsVietnamese
                        ? "Điều kiện Khớp (Điểm nhảy tới):\n" +
                          "Nếu màu pixel tại (X, Y) TRÙNG KHỚP với màu mục tiêu:\n" +
                          "• Nhảy đến số bước đã chọn để thực hiện tiếp.\n" +
                          "• [Dừng lại]: Dừng chạy script ngay lập tức."
                        : "Match Condition (Jump Destination):\n" +
                          "If the pixel color at (X, Y) MATCHES the target color:\n" +
                          "• Jump to your selected step # to execute next.\n" +
                          "• [Stop]: Immediately stop script execution.");
                }
            }

            if (cboIfFalse != null)
            {
                if (_step.ActionType == MacroActionType.IfImage)
                {
                    RowToolTipManager.SetToolTip(cboIfFalse, Loc.IsVietnamese
                        ? "Nếu Thiếu (Hành động khi không thấy hình ảnh mẫu):\n" +
                          "• [Bước kế tiếp]: Tiếp tục thực hiện bước kế tiếp.\n" +
                          "• Nhảy đến số bước đã chọn để thực hiện tiếp.\n" +
                          "• [Dừng lại]: Dừng chạy script ngay lập tức."
                        : "If Not Found (Action when template image is missing):\n" +
                          "• [Next Step]: Continue to the next step.\n" +
                          "• Jump to your selected step # to execute next.\n" +
                          "• [Stop]: Immediately stop script execution.");
                }
                else
                {
                    RowToolTipManager.SetToolTip(cboIfFalse, Loc.IsVietnamese
                        ? "Điều kiện Không khớp (Điểm nhảy tới):\n" +
                          "Nếu màu pixel tại (X, Y) KHÔNG trùng khớp với màu mục tiêu:\n" +
                          "• Nhảy đến số bước đã chọn để thực hiện tiếp.\n" +
                          "• [Dừng lại]: Dừng chạy script ngay lập tức."
                        : "Unmatch Condition (Jump Destination):\n" +
                          "If the pixel color at (X, Y) does NOT match the target color:\n" +
                          "• Jump to your selected step # to execute next.\n" +
                          "• [Stop]: Immediately stop script execution.");
                }
            }

            if (btnDelete != null)
                RowToolTipManager.SetToolTip(btnDelete, Loc.IsVietnamese
                    ? string.Format("Xóa Bước #{0}:\nXóa bước này khỏi script hiện tại.", _index + 1)
                    : string.Format("Delete Step #{0}:\nRemoves this step from the current script.", _index + 1));

            if (txtNote != null)
                RowToolTipManager.SetToolTip(txtNote, Loc.IsVietnamese
                    ? "Ghi chú Bước:\nGhi chú tùy chỉnh hoặc mô tả cho bước này."
                    : "Step Note:\nCustom notes or description for this specific step.");
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
                _step.WindowHwnd = IntPtr.Zero;
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
                        _step.WindowHwnd = targetWin.Hwnd;
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
                if (cboActionType != null && cboActionType.SelectedIndex != GetActionTypeIndex(_step.ActionType))
                {
                    cboActionType.SelectedIndex = GetActionTypeIndex(_step.ActionType);
                }
                if (numHold != null) numHold.Value = _step.HoldMs;
                if (numSimilarity != null) numSimilarity.Value = _step.Similarity > 0 ? _step.Similarity : 90;
                if (numDelay != null) numDelay.Value = _step.DelayMs;
                if (numRepeat != null) numRepeat.Value = _step.RepeatCount;
                if (numTimeout != null) numTimeout.Value = _step.TimeoutSec > 0 ? _step.TimeoutSec : 10;
                if (numScroll != null) numScroll.Value = _step.ScrollStep;
                if (txtKeyData != null) txtKeyData.Text = _step.KeyData ?? "";
                if (txtNote != null) txtNote.Text = _step.Note ?? "";
                if (pnlImageThumb != null) pnlImageThumb.Invalidate();
                
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
            if (numSimilarity != null && numSimilarity.Value != _step.Similarity) numSimilarity.Value = _step.Similarity > 0 ? _step.Similarity : 90;
            if (numDelay != null && numDelay.Value != _step.DelayMs) numDelay.Value = _step.DelayMs;
            if (numRepeat != null && numRepeat.Value != _step.RepeatCount) numRepeat.Value = _step.RepeatCount;
            if (numTimeout != null && numTimeout.Value != _step.TimeoutSec) numTimeout.Value = _step.TimeoutSec > 0 ? _step.TimeoutSec : 10;
            if (numScroll != null && numScroll.Value != _step.ScrollStep) numScroll.Value = _step.ScrollStep;
            if (txtKeyData != null && txtKeyData.Text != _step.KeyData) txtKeyData.Text = _step.KeyData ?? "";
            if (txtNote != null && txtNote.Text != _step.Note) txtNote.Text = _step.Note ?? "";
            if (pnlImageThumb != null) pnlImageThumb.Invalidate();
            UpdateWindowIconDisplay();
            UpdateDynamicFields();
            UpdateRowTooltips();
            this.Invalidate();
        }

        private string GetCoordDisplayText(bool compactForColorSwatch = false)
        {
            if (_step.ActionType == MacroActionType.WaitImage || _step.ActionType == MacroActionType.IfImage)
            {
                bool isAreaImg = (_step.EndPoint != Point.Empty && _step.EndPoint != _step.StartPoint);
                if (isAreaImg)
                {
                    int w = Math.Abs(_step.EndPoint.X - _step.StartPoint.X);
                    int h = Math.Abs(_step.EndPoint.Y - _step.StartPoint.Y);
                    return string.Format("⛶ {0}×{1}", w, h);
                }
                if (_step.StartPoint != Point.Empty)
                {
                    return string.Format("({0},{1})", _step.StartPoint.X, _step.StartPoint.Y);
                }
                return "Full Screen";
            }

            if (_step.ActionType == MacroActionType.DragDrop)
            {
                return string.Format("A:{0},{1}\nB:{2},{3}", _step.StartPoint.X, _step.StartPoint.Y, _step.EndPoint.X, _step.EndPoint.Y);
            }

            bool isArea = (_step.EndPoint != Point.Empty && _step.EndPoint != _step.StartPoint);
            if (isArea)
            {
                int w = Math.Abs(_step.EndPoint.X - _step.StartPoint.X);
                int h = Math.Abs(_step.EndPoint.Y - _step.StartPoint.Y);
                return string.Format("⛶ {0}×{1}", w, h);
            }

            if (_step.StartPoint == Point.Empty)
            {
                return compactForColorSwatch ? "(0,0)" : "(0, 0)";
            }
            return compactForColorSwatch ? string.Format("({0},{1})", _step.StartPoint.X, _step.StartPoint.Y) : string.Format("({0}, {1})", _step.StartPoint.X, _step.StartPoint.Y);
        }

        private void UpdateDynamicFields()
        {
            int colX = cboActionType.Location.X + cboActionType.Width + 2;
            int colW = 118;

            if (cboIfTrue != null) cboIfTrue.Visible = false;
            if (cboIfFalse != null) cboIfFalse.Visible = false;
            if (lblIfMatch != null) lblIfMatch.Visible = false;
            if (lblIfUnmatch != null) lblIfUnmatch.Visible = false;
            if (pnlImageThumb != null) pnlImageThumb.Visible = false;
            if (numSimilarity != null) numSimilarity.Visible = false;
            if (numTimeout != null) numTimeout.Visible = false;

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
                lblCoord.Text = GetCoordDisplayText();

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
                lblCoord.Text = GetCoordDisplayText(true);

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
                lblCoord.Location = new Point(colX + 20, 8);
                lblCoord.Size = new Size(72, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7.5F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = GetCoordDisplayText(true);

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
                lblCoord.Text = GetCoordDisplayText(true);

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
            else if (_step.ActionType == MacroActionType.WaitImage)
            {
                this.Height = 34;
                pnlColorSwatch.Visible = false;

                pnlImageThumb.Location = new Point(colX + 2, 7);
                pnlImageThumb.Visible = true;
                pnlImageThumb.Invalidate();

                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 36, 8);
                lblCoord.Size = new Size(56, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = GetCoordDisplayText(true);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;

                numHold.Visible = false;
                numSimilarity.Location = new Point(numHold.Location.X, 6);
                numSimilarity.Value = _step.Similarity > 0 ? _step.Similarity : 90;
                numSimilarity.Visible = true;

                numDelay.Visible = true;

                numRepeat.Visible = false;
                numTimeout.Location = new Point(numRepeat.Location.X, 6);
                numTimeout.Value = _step.TimeoutSec > 0 ? _step.TimeoutSec : 10;
                numTimeout.Visible = true;

                if (lblIfMatch != null) lblIfMatch.Visible = false;
                if (cboIfTrue != null) cboIfTrue.Visible = false;
                if (lblIfUnmatch != null) lblIfUnmatch.Visible = false;
                if (cboIfFalse != null) cboIfFalse.Visible = false;
            }
            else if (_step.ActionType == MacroActionType.IfImage)
            {
                this.Height = 58;
                pnlColorSwatch.Visible = false;

                pnlImageThumb.Location = new Point(colX + 2, 7);
                pnlImageThumb.Visible = true;
                pnlImageThumb.Invalidate();

                lblCoord.Visible = true;
                lblCoord.Cursor = Cursors.Hand;
                lblCoord.Location = new Point(colX + 36, 8);
                lblCoord.Size = new Size(56, 18);
                lblCoord.Font = ThemeTokens.GetMonospaceFont(7F);
                lblCoord.TextAlign = ContentAlignment.MiddleRight;
                lblCoord.Text = GetCoordDisplayText(true);

                btnPickCoord.Location = new Point(colX + 94, 6);
                btnPickCoord.Size = new Size(22, 22);
                btnPickCoord.Visible = true;

                numScroll.Visible = false;
                txtKeyData.Visible = false;

                numHold.Visible = false;
                numSimilarity.Location = new Point(numHold.Location.X, 6);
                numSimilarity.Value = _step.Similarity > 0 ? _step.Similarity : 90;
                numSimilarity.Visible = true;

                numDelay.Visible = true;

                numRepeat.Visible = false;
                numTimeout.Visible = false;

                if (lblIfMatch != null) lblIfMatch.Visible = true;
                if (cboIfTrue != null) cboIfTrue.Visible = true;
                if (lblIfUnmatch != null) lblIfUnmatch.Visible = true;
                if (cboIfFalse != null) cboIfFalse.Visible = true;
                PopulateIfJumpLists();
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
                lblCoord.Text = GetCoordDisplayText(false);

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
            if (_step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea || _step.ActionType == MacroActionType.IfImage)
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
                if (_step.ActionType == MacroActionType.IfImage)
                {
                    lblIfMatch.Text = Loc.IsVietnamese ? "Nếu Thấy:" : "If Found:";
                    lblIfMatch.Location = new Point(68, 34);
                    cboIfTrue.Location = new Point(134, 31);
                    cboIfTrue.Size = new Size(106, 22);

                    lblIfUnmatch.Text = Loc.IsVietnamese ? "Nếu Thiếu:" : "If Missing:";
                    lblIfUnmatch.Location = new Point(248, 34);
                    cboIfFalse.Location = new Point(320, 31);
                    cboIfFalse.Size = new Size(106, 22);
                }
                else
                {
                    lblIfMatch.Text = Loc.LblIfMatch;
                    lblIfMatch.Location = new Point(80, 34);
                    cboIfTrue.Location = new Point(124, 31);
                    cboIfTrue.Size = new Size(96, 22);

                    lblIfUnmatch.Text = Loc.LblIfUnmatch;
                    lblIfUnmatch.Location = Loc.IsVietnamese ? new Point(216, 34) : new Point(228, 34);
                    cboIfFalse.Location = new Point(286, 31);
                    cboIfFalse.Size = new Size(96, 22);
                }

                int currentRow = _index + 1;
                int maxStepNeeded = Math.Max(1, _totalStepCount);
                if (_step.IfTrueStep > maxStepNeeded) maxStepNeeded = _step.IfTrueStep;
                if (_step.IfFalseStep > maxStepNeeded) maxStepNeeded = _step.IfFalseStep;

                // 1. Populate items (Click Target / Click Center, Next Step, Step 1..maxStepNeeded, Stop)
                cboIfTrue.Items.Clear();
                cboIfFalse.Items.Clear();

                string clickActionLabel = (_step.ActionType == MacroActionType.IfImage) ? Loc.JumpClickCenter : Loc.JumpClickTarget;
                string nextStepLabel = Loc.JumpNextStep;
                string stopLabel = Loc.JumpStop;

                cboIfTrue.Items.Add(clickActionLabel);
                cboIfTrue.Items.Add(nextStepLabel);
                cboIfFalse.Items.Add(clickActionLabel);
                cboIfFalse.Items.Add(nextStepLabel);

                for (int i = 1; i <= maxStepNeeded; i++)
                {
                    string stepName = Loc.JumpStepFormat(i);
                    cboIfTrue.Items.Add(stepName);
                    cboIfFalse.Items.Add(stepName);
                }
                cboIfTrue.Items.Add(stopLabel);
                cboIfFalse.Items.Add(stopLabel);

                // 2. Resolve True selection (Default: Click Target / Click Center, value = -2)
                int trueIdx = 0;
                if (_step.IfTrueStep == -2) trueIdx = 0;
                else if (_step.IfTrueStep == 0) trueIdx = 1;
                else if (_step.IfTrueStep == -1) trueIdx = cboIfTrue.Items.Count - 1;
                else if (_step.IfTrueStep > 0 && _step.IfTrueStep <= maxStepNeeded) trueIdx = _step.IfTrueStep + 1;
                else
                {
                    trueIdx = 0;
                    _step.IfTrueStep = -2;
                }
                cboIfTrue.SelectedIndex = (trueIdx >= 0 && trueIdx < cboIfTrue.Items.Count) ? trueIdx : 0;

                // 3. Resolve False selection (Default: Next Step, value = 0)
                int falseIdx = 1;
                if (_step.IfFalseStep == -2) falseIdx = 0;
                else if (_step.IfFalseStep == 0) falseIdx = 1;
                else if (_step.IfFalseStep == -1) falseIdx = cboIfFalse.Items.Count - 1;
                else if (_step.IfFalseStep > 0 && _step.IfFalseStep <= maxStepNeeded) falseIdx = _step.IfFalseStep + 1;
                else
                {
                    falseIdx = 1;
                    _step.IfFalseStep = 0;
                }
                cboIfFalse.SelectedIndex = (falseIdx >= 0 && falseIdx < cboIfFalse.Items.Count) ? falseIdx : 0;
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
            bool prevBinding = _isBinding;
            _isBinding = true;
            try
            {
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
            finally
            {
                _isBinding = prevBinding;
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
                case MacroActionType.WaitImage:
                case MacroActionType.IfImage:
                    return theme.CPurple;
                case MacroActionType.RunScript:
                    return theme.CYellow;
                default:
                    return theme.TextPrimary;
            }
        }

        private void HookRowSelectionRecursively(Control c)
        {
            if (c != btnDelete && c != chkSelect && c != this && c != lblIndex && c != lblCoord && c != pnlImageThumb)
            {
                c.MouseDown += Row_MouseDown;
            }
            foreach (Control child in c.Controls)
            {
                HookRowSelectionRecursively(child);
            }
        }

        private void ApplyPickedCoordinates(Point screenA, Point screenB, Color color, NativeMethods.WindowTargetInfo winInfo, Point clientPtA, Point clientPtB, bool isArea)
        {
            Point finalA = screenA;
            Point finalB = screenB;

            if (_step.RelativeToWindow)
            {
                IntPtr hWnd = _step.WindowHwnd;
                if (!NativeMethods.IsValidWindowHandle(hWnd, _step.ProcessName))
                {
                    if (winInfo != null && winInfo.Hwnd != IntPtr.Zero && NativeMethods.IsValidWindowHandle(winInfo.Hwnd, winInfo.ProcessName))
                    {
                        hWnd = winInfo.Hwnd;
                        _step.WindowHwnd = hWnd;
                        _step.ProcessName = winInfo.ProcessName;
                        _step.WindowTitle = winInfo.Title;
                    }
                    else
                    {
                        hWnd = NativeMethods.FindWindowByTarget(_step.ProcessName, _step.WindowTitle);
                        if (hWnd != IntPtr.Zero) _step.WindowHwnd = hWnd;
                    }
                }

                if (hWnd != IntPtr.Zero)
                {
                    NativeMethods.POINT npA = new NativeMethods.POINT { X = screenA.X, Y = screenA.Y };
                    if (NativeMethods.ScreenToClient(hWnd, ref npA))
                    {
                        finalA = new Point(npA.X, npA.Y);
                    }
                    else finalA = screenA;

                    if (isArea || _step.ActionType == MacroActionType.DragDrop)
                    {
                        NativeMethods.POINT npB = new NativeMethods.POINT { X = screenB.X, Y = screenB.Y };
                        if (NativeMethods.ScreenToClient(hWnd, ref npB))
                        {
                            finalB = new Point(npB.X, npB.Y);
                        }
                        else finalB = screenB;
                    }
                }
                else if (winInfo != null)
                {
                    finalA = clientPtA;
                    finalB = clientPtB;
                    _step.WindowHwnd = winInfo.Hwnd;
                    _step.ProcessName = winInfo.ProcessName;
                    _step.WindowTitle = winInfo.Title;
                }
                else
                {
                    finalA = screenA;
                    finalB = screenB;
                }
            }
            else if (winInfo != null && !string.IsNullOrEmpty(winInfo.ProcessName))
            {
                _step.RelativeToWindow = true;
                _step.WindowHwnd = winInfo.Hwnd;
                _step.ProcessName = winInfo.ProcessName;
                _step.WindowTitle = winInfo.Title;
                finalA = clientPtA;
                finalB = clientPtB;
            }
            else
            {
                _step.WindowHwnd = IntPtr.Zero;
                finalA = screenA;
                finalB = screenB;
            }

            _step.StartPoint = finalA;
            if (_step.ActionType == MacroActionType.DragDrop || isArea)
            {
                _step.EndPoint = finalB;
            }
            else
            {
                _step.EndPoint = Point.Empty;
            }

            if (_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.IfColorArea)
            {
                _step.TargetColor = color;
                _step.ColorHex = string.Format("#{0:X2}{1:X2}{2:X2}", color.R, color.G, color.B);
            }

            RefreshDisplay();
            if (OnStepChanged != null) OnStepChanged();
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
            picker.OnTargetSelectedWithWindow += (screenA, screenB, color, winInfo, clientPtA, clientPtB, isArea) =>
            {
                if (_step.ActionType == MacroActionType.DragDrop && !isArea)
                {
                    // User clicked once for DragDrop: record Point A and open picker for Point B
                    ApplyPickedCoordinates(screenA, Point.Empty, color, winInfo, clientPtA, Point.Empty, false);

                    CoordinatePicker pickerB = new CoordinatePicker();
                    pickerB.OnTargetSelectedWithWindow += (sA2, sB2, color2, winInfo2, cPtA2, cPtB2, isArea2) =>
                    {
                        Point endScreen = isArea2 ? sB2 : sA2;
                        Point endClient = isArea2 ? cPtB2 : cPtA2;
                        ApplyPickedCoordinates(_step.StartPoint, endScreen, color2, winInfo2, _step.StartPoint, endClient, true);
                    };
                    pickerB.Show();
                    return;
                }

                ApplyPickedCoordinates(screenA, screenB, color, winInfo, clientPtA, clientPtB, isArea);
            };
            picker.Show();
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
                cboActionType.SelectedIndex = GetActionTypeIndex(type);
            }
            UpdateDynamicFields();
        }

        public void SetTargetWindowDirect(bool rel, string proc, string title, IntPtr hwnd = default(IntPtr))
        {
            _step.RelativeToWindow = rel;
            _step.WindowHwnd = hwnd;
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
                lblCoord.Text = GetCoordDisplayText(_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.MiddleClick);
            }
            this.Invalidate();
        }

        public void UpdateEndPoint(Point pt)
        {
            _step.EndPoint = pt;
            if (lblCoord != null)
            {
                lblCoord.Text = GetCoordDisplayText(_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.MiddleClick);
            }
            this.Invalidate();
        }

        public void UpdateArea(Point ptA, Point ptB)
        {
            _step.StartPoint = ptA;
            _step.EndPoint = ptB;
            if (lblCoord != null)
            {
                lblCoord.Text = GetCoordDisplayText(_step.ActionType == MacroActionType.WaitColor || _step.ActionType == MacroActionType.IfColor || _step.ActionType == MacroActionType.MiddleClick);
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
            if (numSimilarity != null) numSimilarity.ApplyTheme(_theme);
            if (numTimeout != null) numTimeout.ApplyTheme(_theme);
            if (txtNote != null) txtNote.ApplyTheme(_theme);
            if (btnDelete != null) btnDelete.ForeColor = _theme.Danger;
            UpdateWindowIconDisplay();
        }

        private void ShowImageContextMenu(Control parent, Point pt)
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(_theme);
            menu.ShowImageMargin = false;

            ToolStripMenuItem itemCapture = new ToolStripMenuItem("Capture from Screen");
            itemCapture.Click += (s, e) => PickImageSnipping();
            menu.Items.Add(itemCapture);

            ToolStripMenuItem itemImport = new ToolStripMenuItem("Import Image from File...");
            itemImport.Click += (s, e) => ImportImageFromFile();
            menu.Items.Add(itemImport);

            menu.Items.Add(new ToolStripSeparator());

            bool hasImg = _step != null && !string.IsNullOrEmpty(_step.ImageBase64);

            ToolStripMenuItem itemPreview = new ToolStripMenuItem("Preview Full Size");
            itemPreview.Enabled = hasImg;
            itemPreview.Click += (s, e) => PreviewTemplateImage();
            menu.Items.Add(itemPreview);

            ToolStripMenuItem itemExport = new ToolStripMenuItem("Export Image to File...");
            itemExport.Enabled = hasImg;
            itemExport.Click += (s, e) => ExportImageToFile();
            menu.Items.Add(itemExport);

            menu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem itemClear = new ToolStripMenuItem("Clear Template Image");
            itemClear.Enabled = hasImg;
            itemClear.ForeColor = _theme.Danger;
            itemClear.Click += (s, e) =>
            {
                if (_step != null)
                {
                    _step.ImageBase64 = null;
                    _step.InvalidateImageCache();
                    pnlImageThumb.Invalidate();
                    UpdateRowTooltips();
                    if (OnStepChanged != null) OnStepChanged();
                }
            };
            menu.Items.Add(itemClear);

            menu.Show(parent, pt);
        }

        private void PickImageSnipping()
        {
            CoordinatePicker picker = new CoordinatePicker();
            picker.IsImageSnippingMode = true;
            picker.OnImageCaptured += (bmp) =>
            {
                if (bmp != null && _step != null)
                {
                    _step.SetTemplateBitmap(bmp);
                    pnlImageThumb.Invalidate();
                    UpdateRowTooltips();
                    if (OnStepChanged != null) OnStepChanged();
                }
            };
            picker.Show();
        }

        private void ImportImageFromFile()
        {
            using (OpenFileDialog ofd = new OpenFileDialog())
            {
                ofd.Title = "Import Template Image";
                ofd.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|All Files (*.*)|*.*";
                if (ofd.ShowDialog(this.FindForm()) == DialogResult.OK)
                {
                    try
                    {
                        using (Image loaded = Image.FromFile(ofd.FileName))
                        {
                            Bitmap bmp = new Bitmap(loaded);
                            if (_step != null)
                            {
                                _step.SetTemplateBitmap(bmp);
                                pnlImageThumb.Invalidate();
                                UpdateRowTooltips();
                                if (OnStepChanged != null) OnStepChanged();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show("Failed to load image file:\n" + ex.Message, "Import Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
        }

        private void ExportImageToFile()
        {
            if (_step == null) return;
            Bitmap bmp = _step.GetTemplateBitmap();
            if (bmp == null) return;

            using (SaveFileDialog sfd = new SaveFileDialog())
            {
                sfd.Title = "Export Template Image";
                sfd.Filter = "PNG Image (*.png)|*.png|All Files (*.*)|*.*";
                sfd.FileName = string.Format("Template_Step_{0}.png", _index + 1);
                if (sfd.ShowDialog(this.FindForm()) == DialogResult.OK)
                {
                    try
                    {
                        bmp.Save(sfd.FileName, System.Drawing.Imaging.ImageFormat.Png);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show("Failed to export image file:\n" + ex.Message, "Export Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
        }

        private void PreviewTemplateImage()
        {
            if (_step == null) return;
            Bitmap bmp = _step.GetTemplateBitmap();
            if (bmp == null) return;

            using (Form previewForm = new Form())
            {
                previewForm.Text = string.Format("Template Image Preview - Step #{0} ({1}×{2} px)", _index + 1, bmp.Width, bmp.Height);
                previewForm.FormBorderStyle = FormBorderStyle.Sizable;
                previewForm.StartPosition = FormStartPosition.CenterParent;
                previewForm.BackColor = _theme.BgPrimary;
                previewForm.ForeColor = _theme.TextPrimary;
                previewForm.ShowInTaskbar = false;
                previewForm.KeyPreview = true;
                previewForm.KeyDown += (s, e) =>
                {
                    if (e.KeyCode == Keys.Escape) previewForm.Close();
                };

                int margin = 32;
                int maxW = Math.Min(1000, Screen.PrimaryScreen.WorkingArea.Width - 100);
                int maxH = Math.Min(800, Screen.PrimaryScreen.WorkingArea.Height - 100);
                int targetW = Math.Max(240, Math.Min(maxW, bmp.Width + margin * 2));
                int targetH = Math.Max(180, Math.Min(maxH, bmp.Height + margin * 2 + 30));
                previewForm.ClientSize = new Size(targetW, targetH);

                PictureBox pb = new PictureBox
                {
                    Dock = DockStyle.Fill,
                    SizeMode = (bmp.Width > previewForm.ClientSize.Width - 20 || bmp.Height > previewForm.ClientSize.Height - 40) ? PictureBoxSizeMode.Zoom : PictureBoxSizeMode.CenterImage,
                    Image = bmp,
                    BackColor = Color.FromArgb(24, 24, 28)
                };
                pb.Click += (s, e) => previewForm.Close();

                Panel pnlBottom = new Panel
                {
                    Dock = DockStyle.Bottom,
                    Height = 32,
                    BackColor = _theme.BgSecondary
                };

                Label lblDim = new Label
                {
                    Text = string.Format("Size: {0} × {1} px  |  Click anywhere or press ESC to close", bmp.Width, bmp.Height),
                    Dock = DockStyle.Fill,
                    TextAlign = ContentAlignment.MiddleCenter,
                    Font = ThemeTokens.FontSegoe(9.5F, FontStyle.Regular),
                    ForeColor = _theme.TextSecondary
                };
                lblDim.Click += (s, e) => previewForm.Close();
                pnlBottom.Controls.Add(lblDim);

                previewForm.Controls.Add(pb);
                previewForm.Controls.Add(pnlBottom);

                previewForm.ShowDialog(this.FindForm());
            }
        }
    }
}
