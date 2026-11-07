using System;
using System.Drawing;
using System.Windows.Forms;
using MaxApp.Common;

namespace ModernAutoClicker
{
    /// <summary>
    /// Text box for a duration stored in ms but shown and typed in a chosen TimeUnit (ms / s / mm:ss).
    /// NumberInput (Common, read-only) only holds integers, so this keeps its look and Enter/Esc/wheel behaviour for durations.
    /// With ShowUnitButton the unit sits inside the box as a small button that opens the unit list.
    /// ValueChanged / UnitChanged are raised only for user edits, not when ValueMs or Unit is set from code.
    /// </summary>
    public class DurationInput : ModernTextBox
    {
        private const int EM_SETMARGINS = 0xD3;
        private const int EC_RIGHTMARGIN = 0x2;

        private int _valueMs;
        private int _unit = TimeUnit.Milliseconds;
        private bool _isSettingText;
        private Label _unitButton;
        private ThemeTokens _theme = ThemeTokens.DarkTheme();

        public int MinimumMs { get; set; }
        public int MaximumMs { get; set; }

        public event Action ValueChanged;
        public event Action UnitChanged;

        public DurationInput()
        {
            MinimumMs = 0;
            MaximumMs = TimeUnit.MaxMs;
            this.TextAlign = HorizontalAlignment.Right;
            this.Font = ThemeTokens.FontCard(FontStyle.Regular);
        }

        public int ValueMs
        {
            get { return _valueMs; }
            set
            {
                _valueMs = ClampMs(value);
                ShowValue();
            }
        }

        public int Unit
        {
            get { return _unit; }
            set
            {
                _unit = TimeUnit.Clamp(value);
                RefreshUnitText();
                ShowValue();
            }
        }

        public bool ShowUnitButton
        {
            get { return _unitButton != null; }
            set
            {
                if (value == (_unitButton != null)) return;
                if (value)
                {
                    _unitButton = new Label
                    {
                        Dock = DockStyle.Right,
                        TextAlign = ContentAlignment.MiddleCenter,
                        Font = ThemeTokens.FontMicro(FontStyle.Bold),
                        Cursor = Cursors.Hand,
                        BackColor = this.BackColor,
                        ForeColor = this.ForeColor
                    };
                    // Fixed to the widest name so the box does not shift when the unit changes
                    _unitButton.Width = TextRenderer.MeasureText(TimeUnit.ShortName(TimeUnit.Milliseconds), _unitButton.Font).Width + 2;
                    _unitButton.MouseEnter += (s, e) => { _unitButton.ForeColor = _theme.AccentPrimary; };
                    _unitButton.MouseLeave += (s, e) => { _unitButton.ForeColor = this.ForeColor; };
                    _unitButton.MouseClick += (s, e) => { if (e.Button == MouseButtons.Left) ShowUnitMenu(); };
                    this.Controls.Add(_unitButton);
                    RefreshUnitText();
                }
                else
                {
                    this.Controls.Remove(_unitButton);
                    _unitButton.Dispose();
                    _unitButton = null;
                }
                ApplyUnitMargin();
            }
        }

        // Hides the Common method only to remember the theme for the unit button hover and menu; ModernTextBox does not keep it
        public new void ApplyTheme(ThemeTokens theme = null)
        {
            if (theme != null) _theme = theme;
            base.ApplyTheme(_theme);
        }

        // Re-reads the short unit name, e.g. after a language switch ("s" <-> "g")
        public void RefreshUnitText()
        {
            if (_unitButton != null) _unitButton.Text = TimeUnit.ShortName(_unit);
        }

        private void ShowUnitMenu()
        {
            ContextMenuStrip menu = new ContextMenuStrip
            {
                Renderer = new ModernMenuRenderer(_theme),
                ShowImageMargin = false,
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            for (int i = 0; i < TimeUnit.Count; i++)
            {
                int unit = i;
                ToolStripMenuItem item = new ToolStripMenuItem(TimeUnit.FullName(unit))
                {
                    ForeColor = _theme.TextPrimary,
                    Font = ThemeTokens.FontBase(unit == _unit ? FontStyle.Bold : FontStyle.Regular)
                };
                item.Click += (s, e) =>
                {
                    if (unit == _unit) return;
                    Unit = unit;
                    if (UnitChanged != null) UnitChanged();
                };
                menu.Items.Add(item);
            }
            menu.Closed += (s, e) => this.BeginInvoke((Action)menu.Dispose);
            menu.Show(this, new Point(this.Width - (_unitButton != null ? _unitButton.Width : 0), this.Height));
        }

        // Keeps the typed text clear of the unit button; the edit control drops its margins whenever the font changes
        private void ApplyUnitMargin()
        {
            if (!this.IsHandleCreated) return;
            int right = (_unitButton != null) ? _unitButton.Width + 2 : 0;
            NativeMethods.SendMessage(this.Handle, EM_SETMARGINS, (IntPtr)EC_RIGHTMARGIN, (IntPtr)(right << 16));
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            ApplyUnitMargin();
        }

        protected override void OnFontChanged(EventArgs e)
        {
            base.OnFontChanged(e);
            ApplyUnitMargin();
        }

        protected override void OnBackColorChanged(EventArgs e)
        {
            base.OnBackColorChanged(e);
            if (_unitButton != null) _unitButton.BackColor = this.BackColor;
        }

        protected override void OnForeColorChanged(EventArgs e)
        {
            base.OnForeColorChanged(e);
            if (_unitButton != null) _unitButton.ForeColor = this.ForeColor;
        }

        private int WheelStepMs
        {
            get { return _unit == TimeUnit.Minutes ? 1000 : (_unit == TimeUnit.Seconds ? 100 : 10); }
        }

        private int ClampMs(int ms)
        {
            return Math.Max(MinimumMs, Math.Min(MaximumMs, ms));
        }

        private void ShowValue()
        {
            string text = TimeUnit.Format(_valueMs, _unit);
            if (this.Text == text) return;
            _isSettingText = true;
            try
            {
                this.Text = text;
            }
            finally
            {
                _isSettingText = false;
            }
        }

        protected override void OnTextChanged(EventArgs e)
        {
            base.OnTextChanged(e);
            if (_isSettingText) return;

            // Half-typed text ("", "1.", "2:") keeps the last valid value until it parses
            int parsed;
            if (!TimeUnit.TryParse(this.Text, _unit, out parsed)) return;
            int clamped = ClampMs(parsed);
            if (clamped == _valueMs) return;
            _valueMs = clamped;
            if (ValueChanged != null) ValueChanged();
        }

        protected override void OnLeave(EventArgs e)
        {
            base.OnLeave(e);
            // Normalise what was typed ("2" -> "02:00", "1,5" -> "1.5"); invalid text falls back to the last valid value
            ShowValue();
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Return || e.KeyCode == Keys.Escape)
            {
                if (this.Parent != null)
                {
                    this.Parent.Focus();
                }
                e.SuppressKeyPress = true;
                e.Handled = true;
                return;
            }
            base.OnKeyDown(e);
        }

        protected override void OnKeyPress(KeyPressEventArgs e)
        {
            char c = e.KeyChar;
            bool allowed = char.IsControl(c) || char.IsDigit(c) ||
                           (_unit == TimeUnit.Seconds && (c == '.' || c == ',')) ||
                           (_unit == TimeUnit.Minutes && c == ':');
            if (!allowed)
            {
                e.Handled = true;
                return;
            }
            base.OnKeyPress(e);
        }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            if (!this.Focused)
            {
                base.OnMouseWheel(e);
                return;
            }

            int next = ClampMs(_valueMs + (e.Delta > 0 ? WheelStepMs : (e.Delta < 0 ? -WheelStepMs : 0)));
            if (next != _valueMs)
            {
                ValueMs = next;
                if (ValueChanged != null) ValueChanged();
            }

            HandledMouseEventArgs hme = e as HandledMouseEventArgs;
            if (hme != null)
            {
                hme.Handled = true;
            }
        }
    }

    /// <summary>
    /// The unit picker shown next to a DurationInput: the closed box shows "ms / s / m" ("ms / g / p" in Vietnamese), the list shows the full names.
    /// </summary>
    public static class TimeUnitDropdown
    {
        public static ModernDropdown Create(int unit)
        {
            ModernDropdown dd = new ModernDropdown
            {
                Size = new Size(34, 22),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            for (int i = 0; i < TimeUnit.Count; i++)
            {
                dd.Items.Add(TimeUnit.FullName(i));
            }
            dd.CollapsedTextProvider = (idx) => TimeUnit.ShortName(idx);
            dd.SelectedIndex = TimeUnit.Clamp(unit);
            return dd;
        }

        // Re-reads the unit names after a language switch
        public static void RefreshText(ModernDropdown dd)
        {
            if (dd == null) return;
            for (int i = 0; i < TimeUnit.Count && i < dd.Items.Count; i++)
            {
                dd.Items[i] = TimeUnit.FullName(i);
            }
            dd.Invalidate();
        }
    }
}
