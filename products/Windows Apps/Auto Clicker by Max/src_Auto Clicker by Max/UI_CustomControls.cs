using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public class DoubleBufferedTableLayoutPanel : TableLayoutPanel
    {
        public DoubleBufferedTableLayoutPanel()
        {
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);
        }
    }

    public class RoundedPanel : Panel
    {
        private int _borderRadius = 8;
        private Color _borderColor = ThemeTokens.DarkTheme().BorderColor;
        private int _borderSize = 1;

        public int BorderRadius
        {
            get { return _borderRadius; }
            set { _borderRadius = value; Invalidate(); }
        }

        public Color BorderColor
        {
            get { return _borderColor; }
            set { _borderColor = value; Invalidate(); }
        }

        public int BorderSize
        {
            get { return _borderSize; }
            set { _borderSize = value; Invalidate(); }
        }

        public RoundedPanel()
        {
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw |
                          ControlStyles.SupportsTransparentBackColor, true);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            // Fill parent background color on corners
            Color parentBg = this.Parent != null ? this.Parent.BackColor : this.BackColor;
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            using (GraphicsPath path = GetRoundedRectangle(rect, BorderRadius))
            using (SolidBrush brush = new SolidBrush(this.BackColor))
            {
                g.FillPath(brush, path);
                if (BorderSize > 0)
                {
                    using (Pen pen = new Pen(BorderColor, BorderSize))
                    {
                        pen.Alignment = PenAlignment.Inset;
                        g.DrawPath(pen, path);
                    }
                }
            }
        }

        public static GraphicsPath GetRoundedRectangle(Rectangle bounds, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            if (radius <= 0)
            {
                path.AddRectangle(bounds);
                return path;
            }

            int diameter = radius * 2;
            Rectangle arc = new Rectangle(bounds.X, bounds.Y, diameter, diameter);

            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - diameter;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }

        public static GraphicsPath GetTopRoundedRectangle(Rectangle bounds, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            if (radius <= 0)
            {
                path.AddRectangle(bounds);
                return path;
            }

            int diameter = radius * 2;
            Rectangle arc = new Rectangle(bounds.X, bounds.Y, diameter, diameter);

            // Top-left arc
            path.AddArc(arc, 180, 90);
            // Top-right arc
            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);
            // Flat bottom
            path.AddLine(bounds.Right, bounds.Bottom, bounds.Left, bounds.Bottom);
            path.CloseFigure();
            return path;
        }
    }

    public class RoundedButton : Button
    {
        private int _borderRadius = 6;
        private Color _normalColor = ThemeTokens.DarkTheme().AccentPrimary;
        private Color _hoverColor = ThemeTokens.DarkTheme().AccentPrimaryHover;
        private Color _pressedColor = ThemeTokens.DarkTheme().BgElevated;
        private bool _isHovered = false;
        private bool _isPressed = false;
        private bool _isDisabled = false;

        public bool IsDisabled
        {
            get { return _isDisabled || !this.Enabled; }
            set
            {
                if (_isDisabled != value)
                {
                    _isDisabled = value;
                    this.Cursor = _isDisabled ? Cursors.Default : Cursors.Hand;
                    Invalidate();
                }
            }
        }

        public int BorderRadius
        {
            get { return _borderRadius; }
            set { _borderRadius = value; Invalidate(); }
        }

        public Color NormalColor
        {
            get { return _normalColor; }
            set { _normalColor = value; Invalidate(); }
        }

        public Color HoverColor
        {
            get { return _hoverColor; }
            set { _hoverColor = value; Invalidate(); }
        }

        public Color PressedColor
        {
            get { return _pressedColor; }
            set { _pressedColor = value; Invalidate(); }
        }

        private string _subtitle = string.Empty;
        private Color _borderColor = Color.Empty;
        private int _borderWidth = 0;

        public Color BorderColor
        {
            get { return _borderColor; }
            set { _borderColor = value; Invalidate(); }
        }

        public int BorderWidth
        {
            get { return _borderWidth; }
            set { _borderWidth = value; Invalidate(); }
        }

        public string Subtitle
        {
            get { return _subtitle; }
            set { _subtitle = value; Invalidate(); }
        }

        public RoundedButton()
        {
            this.FlatStyle = FlatStyle.Flat;
            this.FlatAppearance.BorderSize = 0;
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer, true);
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            if (IsDisabled) return;
            _isHovered = true;
            Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _isHovered = false;
            _isPressed = false;
            Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs mevent)
        {
            base.OnMouseDown(mevent);
            if (IsDisabled) return;
            _isPressed = true;
            Invalidate();
        }

        protected override void OnMouseUp(MouseEventArgs mevent)
        {
            base.OnMouseUp(mevent);
            _isPressed = false;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Color parentBg = this.Parent != null ? this.Parent.BackColor : SystemColors.Control;
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            Color currentColor = _normalColor;
            if (IsDisabled)
            {
                currentColor = Color.FromArgb(
                    Math.Min(255, (parentBg.R * 3 + _normalColor.R) / 4),
                    Math.Min(255, (parentBg.G * 3 + _normalColor.G) / 4),
                    Math.Min(255, (parentBg.B * 3 + _normalColor.B) / 4));
            }
            else if (_isPressed)
            {
                currentColor = _pressedColor;
            }
            else if (_isHovered)
            {
                currentColor = _hoverColor;
            }

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            using (GraphicsPath path = RoundedPanel.GetRoundedRectangle(rect, BorderRadius))
            {
                using (SolidBrush brush = new SolidBrush(currentColor))
                {
                    g.FillPath(brush, path);
                }

                if (_borderWidth > 0 && _borderColor != Color.Empty && _borderColor.A > 0)
                {
                    using (Pen pen = new Pen(_borderColor, _borderWidth))
                    {
                        pen.Alignment = PenAlignment.Inset;
                        g.DrawPath(pen, path);
                    }
                }
            }

            // 1. Draw Image if present
            int textLeft = 0;
            int textRight = this.Width;

            if (this.Image != null)
            {
                int imgW = Math.Min(this.Image.Width, 16);
                int imgH = Math.Min(this.Image.Height, 16);
                int imgY = (this.Height - imgH) / 2;

                if (this.ImageAlign == ContentAlignment.MiddleLeft || this.TextImageRelation == TextImageRelation.ImageBeforeText)
                {
                    int imgX = 8;
                    g.DrawImage(this.Image, new Rectangle(imgX, imgY, imgW, imgH));
                    textLeft = imgX + imgW + 6;
                }
                else if (this.ImageAlign == ContentAlignment.MiddleRight)
                {
                    int imgX = this.Width - imgW - 8;
                    g.DrawImage(this.Image, new Rectangle(imgX, imgY, imgW, imgH));
                    textRight = imgX - 6;
                }
                else if (this.ImageAlign == ContentAlignment.MiddleCenter)
                {
                    int imgX = (this.Width - imgW) / 2;
                    g.DrawImage(this.Image, new Rectangle(imgX, imgY, imgW, imgH));
                }
                else
                {
                    int imgX = 8;
                    g.DrawImage(this.Image, new Rectangle(imgX, imgY, imgW, imgH));
                    textLeft = imgX + imgW + 6;
                }
            }

            // 2. Determine text alignment
            StringAlignment stringAlign = StringAlignment.Center;
            if (this.TextAlign == ContentAlignment.MiddleLeft || this.TextAlign == ContentAlignment.TopLeft || this.TextAlign == ContentAlignment.BottomLeft)
            {
                stringAlign = StringAlignment.Near;
                if (this.Image == null) textLeft = 8;
            }
            else if (this.TextAlign == ContentAlignment.MiddleRight || this.TextAlign == ContentAlignment.TopRight || this.TextAlign == ContentAlignment.BottomRight)
            {
                stringAlign = StringAlignment.Far;
                if (this.Image == null) textRight = this.Width - 8;
            }

            // 3. Draw Button Text with optional regular subtitle
            using (StringFormat sf = new StringFormat
            {
                Alignment = stringAlign,
                LineAlignment = StringAlignment.Center,
                Trimming = StringTrimming.EllipsisCharacter,
                FormatFlags = (this.Text != null && this.Text.Contains("\n")) ? (StringFormatFlags)0 : StringFormatFlags.NoWrap
            })
            using (SolidBrush textBrush = new SolidBrush((IsDisabled) ? Color.FromArgb(100, this.ForeColor) : this.ForeColor))
            {
                if (!string.IsNullOrEmpty(_subtitle))
                {
                    RectangleF topRect = new RectangleF(textLeft, 4, Math.Max(0, textRight - textLeft), 20);
                    RectangleF btmRect = new RectangleF(textLeft, 22, Math.Max(0, textRight - textLeft), 16);

                    g.DrawString(this.Text, this.Font, textBrush, topRect, sf);

                    using (Font subFont = new Font(this.Font.FontFamily, 8F, FontStyle.Regular))
                    {
                        g.DrawString(_subtitle, subFont, textBrush, btmRect, sf);
                    }
                }
                else
                {
                    RectangleF textRect = new RectangleF(textLeft, 0, Math.Max(0, textRight - textLeft), this.Height);
                    g.DrawString(this.Text, this.Font, textBrush, textRect, sf);
                }
            }
        }
    }

    public class ModernTextBox : TextBox
    {
        private const int EM_SETCUEBANNER = 0x1501;

        [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern int SendMessage(IntPtr hWnd, int msg, int wParam, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPWStr)] string lParam);

        private Color _borderColor = ThemeTokens.DarkTheme().BorderColor;
        private string _placeholderText = string.Empty;

        public Color BorderColor
        {
            get { return _borderColor; }
            set { _borderColor = value; Invalidate(); }
        }

        public string PlaceholderText
        {
            get { return _placeholderText; }
            set
            {
                _placeholderText = value;
                UpdateCueBanner();
            }
        }

        public ModernTextBox()
        {
            this.BorderStyle = BorderStyle.FixedSingle;
            this.BackColor = ThemeTokens.DarkTheme().BgTertiary;
            this.ForeColor = ThemeTokens.DarkTheme().TextPrimary;
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            UpdateCueBanner();
        }

        private void UpdateCueBanner()
        {
            if (this.IsHandleCreated)
            {
                SendMessage(this.Handle, EM_SETCUEBANNER, 1, _placeholderText ?? string.Empty);
            }
        }

        public void ApplyTheme(ThemeTokens theme)
        {
            if (theme == null) return;
            this.BackColor = theme.BgTertiary;
            this.ForeColor = theme.TextPrimary;
            this.BorderColor = theme.BorderColor;
            this.Invalidate();
        }

        private const int WM_NCPAINT = 0x0085;
        private const int WM_PAINT = 0x000F;

        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

            if (m.Msg == WM_NCPAINT || m.Msg == WM_PAINT)
            {
                if (!this.IsHandleCreated) return;
                IntPtr hdc = NativeMethods.GetWindowDC(this.Handle);
                if (hdc != IntPtr.Zero)
                {
                    try
                    {
                        using (Graphics g = Graphics.FromHdc(hdc))
                        using (Pen pen = new Pen(_borderColor, 1))
                        {
                            g.DrawRectangle(pen, 0, 0, this.Width - 1, this.Height - 1);
                        }
                    }
                    finally
                    {
                        NativeMethods.ReleaseDC(this.Handle, hdc);
                    }
                }
            }
        }
    }

    public class NumberInput : ModernTextBox
    {
        public int Minimum { get; set; }
        public int Maximum { get; set; }
        public int Step { get; set; }
        public bool AllowEmpty { get; set; }

        private int _value = 0;
        public int Value
        {
            get { return _value; }
            set
            {
                _value = Math.Max(Minimum, Math.Min(Maximum, value));
                if (_value == 0 && AllowEmpty)
                {
                    this.Text = "";
                }
                else
                {
                    this.Text = _value.ToString();
                }
            }
        }

        public NumberInput()
        {
            Minimum = 0;
            Maximum = 999999;
            Step = 1;
            AllowEmpty = false;
            this.TextAlign = HorizontalAlignment.Right;
            this.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
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
            if (char.IsControl(e.KeyChar))
            {
                base.OnKeyPress(e);
                return;
            }

            if (e.KeyChar == '-' && Minimum < 0 && !this.Text.Contains("-"))
            {
                base.OnKeyPress(e);
                return;
            }

            if (!char.IsDigit(e.KeyChar))
            {
                e.Handled = true;
                return;
            }

            base.OnKeyPress(e);
        }

        protected override void OnTextChanged(EventArgs e)
        {
            if (this.Text.Trim() == "-" && Minimum < 0)
            {
                _value = 0;
                base.OnTextChanged(e);
                return;
            }

            int parsed;
            if (int.TryParse(this.Text.Trim(), out parsed))
            {
                _value = Math.Max(Minimum, Math.Min(Maximum, parsed));
            }
            else
            {
                if (AllowEmpty) _value = 0;
                else _value = Minimum;
            }
            base.OnTextChanged(e);
        }

        protected override void OnLeave(EventArgs e)
        {
            base.OnLeave(e);
            if (string.IsNullOrEmpty(this.Text.Trim()) || (this.Text.Trim() == "-" && Minimum < 0))
            {
                if (AllowEmpty)
                {
                    _value = 0;
                    this.Text = "";
                }
                else
                {
                    _value = Minimum;
                    this.Text = Minimum.ToString();
                }
            }
            else
            {
                int parsed;
                if (!int.TryParse(this.Text.Trim(), out parsed) || parsed < Minimum)
                {
                    if (AllowEmpty && parsed == 0)
                    {
                        _value = 0;
                        this.Text = "";
                    }
                    else
                    {
                        _value = Minimum;
                        this.Text = Minimum.ToString();
                    }
                }
                else
                {
                    _value = Math.Min(Maximum, parsed);
                    this.Text = _value.ToString();
                }
            }
        }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            if (this.Focused)
            {
                if (e.Delta > 0)
                {
                    Value = Math.Min(Maximum, _value + Step);
                }
                else if (e.Delta < 0)
                {
                    Value = Math.Max(Minimum, _value - Step);
                }

                HandledMouseEventArgs hme = e as HandledMouseEventArgs;
                if (hme != null)
                {
                    hme.Handled = true;
                }
            }
            else
            {
                base.OnMouseWheel(e);
            }
        }
    }

    public class NoScrollComboBox : ComboBox
    {
        private const int WM_MOUSEWHEEL = 0x020A;

        public NoScrollComboBox()
        {
            this.DropDownStyle = ComboBoxStyle.DropDownList;
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_MOUSEWHEEL)
            {
                if (this.DroppedDown)
                {
                    base.WndProc(ref m);
                }
                else
                {
                    if (this.Parent != null)
                    {
                        NativeMethods.SendMessage(this.Parent.Handle, m.Msg, m.WParam, m.LParam);
                    }
                }
                return;
            }
            base.WndProc(ref m);
        }
    }

    public class ModernDropdown : Control
    {
        private System.Collections.Generic.List<string> _items = new System.Collections.Generic.List<string>();
        private int _selectedIndex = -1;
        private bool _isHovered = false;
        private bool _isOpen = false;
        private ThemeTokens _theme;
        private ContextMenuStrip _popupMenu;

        public event EventHandler SelectedIndexChanged;
        public Func<int, Color> ItemColorProvider { get; set; }
        public string PrefixText { get; set; }
        public Color PrefixColor { get; set; }
        public Color CustomBackColor { get; set; }
        public Color CustomBorderColor { get; set; }

        public System.Collections.Generic.List<string> Items { get { return _items; } }

        public int SelectedIndex
        {
            get { return _selectedIndex; }
            set
            {
                int newIdx = Math.Max(-1, Math.Min(_items.Count - 1, value));
                if (_selectedIndex != newIdx)
                {
                    _selectedIndex = newIdx;
                    this.Invalidate();
                    if (SelectedIndexChanged != null) SelectedIndexChanged(this, EventArgs.Empty);
                }
            }
        }

        public string SelectedItem
        {
            get
            {
                if (_selectedIndex >= 0 && _selectedIndex < _items.Count) return _items[_selectedIndex];
                return null;
            }
            set
            {
                int idx = _items.IndexOf(value);
                SelectedIndex = idx;
            }
        }

        public ModernDropdown()
        {
            _theme = ThemeTokens.DarkTheme();
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw |
                          ControlStyles.SupportsTransparentBackColor, true);
            this.DoubleBuffered = true;
            this.Cursor = Cursors.Hand;
            this.Size = new Size(116, 22);
            this.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t ?? ThemeTokens.DarkTheme();
            this.Invalidate();
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            _isHovered = true;
            this.Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _isHovered = false;
            this.Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left)
            {
                ShowDropdown();
            }
        }

        public void ShowDropdown()
        {
            if (!this.Enabled || _items.Count == 0) return;
            if (_popupMenu != null)
            {
                _popupMenu.Close();
                _popupMenu.Dispose();
                _popupMenu = null;
            }

            _isOpen = true;
            this.Invalidate();

            _popupMenu = new ContextMenuStrip();
            _popupMenu.Renderer = new ModernMenuRenderer(_theme);
            _popupMenu.ShowImageMargin = false;
            _popupMenu.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            _popupMenu.AutoSize = true;

            for (int i = 0; i < _items.Count; i++)
            {
                int itemIdx = i;
                string itemText = _items[i];
                string displayLabel = !string.IsNullOrEmpty(PrefixText) ? (PrefixText + " " + itemText) : itemText;
                ToolStripMenuItem menuItem = new ToolStripMenuItem(displayLabel);

                if (ItemColorProvider != null)
                {
                    menuItem.ForeColor = ItemColorProvider(itemIdx);
                }
                else
                {
                    menuItem.ForeColor = _theme.TextPrimary;
                }

                menuItem.Click += (s, e) =>
                {
                    this.SelectedIndex = itemIdx;
                };

                _popupMenu.Items.Add(menuItem);
            }

            _popupMenu.Closed += (s, e) =>
            {
                _isOpen = false;
                this.Invalidate();
            };

            _popupMenu.MinimumSize = new Size(this.Width, 0);
            _popupMenu.Show(this, new Point(0, this.Height));
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            Color bg = (!this.Enabled) ? t.BgTertiary : (CustomBackColor != Color.Empty ? (_isHovered || _isOpen ? Color.FromArgb(Math.Min(255, CustomBackColor.R + 25), Math.Min(255, CustomBackColor.G + 25), Math.Min(255, CustomBackColor.B + 25)) : CustomBackColor) : (_isOpen ? t.BgElevated : (_isHovered ? t.BgElevated : t.BgTertiary)));
            Color border = (!this.Enabled) ? t.BorderColor : (CustomBorderColor != Color.Empty ? (_isHovered || _isOpen ? Color.FromArgb(Math.Min(255, CustomBorderColor.R + 40), Math.Min(255, CustomBorderColor.G + 40), Math.Min(255, CustomBorderColor.B + 40)) : CustomBorderColor) : ((_isOpen || _isHovered) ? t.BorderHover : t.BorderColor));

            using (GraphicsPath path = RoundedPanel.GetRoundedRectangle(rect, t.RadiusSm))
            using (SolidBrush brush = new SolidBrush(bg))
            using (Pen pen = new Pen(border, 1))
            {
                g.FillPath(brush, path);
                g.DrawPath(pen, path);
            }

            // 1. Text with optional Prefix
            string text = (_selectedIndex >= 0 && _selectedIndex < _items.Count) ? _items[_selectedIndex] : "";
            Color textColor = (!this.Enabled) ? t.TextTertiary : t.TextPrimary;
            if (this.Enabled && _selectedIndex >= 0 && ItemColorProvider != null)
            {
                textColor = ItemColorProvider(_selectedIndex);
            }

            int textLeft = 4;
            if (!string.IsNullOrEmpty(PrefixText))
            {
                Color pColor = PrefixColor != Color.Empty ? PrefixColor : textColor;
                using (SolidBrush pb = new SolidBrush(pColor))
                using (StringFormat psf = new StringFormat { LineAlignment = StringAlignment.Center, Alignment = StringAlignment.Near })
                {
                    SizeF pSize = g.MeasureString(PrefixText, this.Font);
                    int pW = Math.Max(8, (int)pSize.Width - 2);
                    RectangleF pRect = new RectangleF(textLeft, 0, pW, this.Height);
                    g.DrawString(PrefixText, this.Font, pb, pRect, psf);
                    textLeft += pW;
                }
            }

            Rectangle textRect = new Rectangle(textLeft, 0, Math.Max(0, this.Width - textLeft - 11), this.Height);
            using (SolidBrush textBrush = new SolidBrush(textColor))
            using (StringFormat sf = new StringFormat
            {
                LineAlignment = StringAlignment.Center,
                Alignment = StringAlignment.Near,
                Trimming = StringTrimming.EllipsisCharacter,
                FormatFlags = StringFormatFlags.NoWrap
            })
            {
                g.DrawString(text, this.Font, textBrush, textRect, sf);
            }

            // 2. Arrow indicator ▾
            int arrowX = this.Width - 11;
            int arrowY = this.Height / 2 - 2;
            Point[] arrowPts = new Point[]
            {
                new Point(arrowX, arrowY),
                new Point(arrowX + 5, arrowY),
                new Point(arrowX + 2, arrowY + 3)
            };
            using (SolidBrush arrowBrush = new SolidBrush(_isHovered || _isOpen ? t.TextPrimary : t.TextTertiary))
            {
                g.FillPolygon(arrowBrush, arrowPts);
            }
        }
    }

    public class ModernDropdownButton : Control
    {
        private Image _image;
        private string _text = string.Empty;
        private bool _isHovered = false;
        private bool _isOpen = false;
        private ThemeTokens _theme;
        private Color _customTextColor = Color.Empty;

        public Image Image
        {
            get { return _image; }
            set { _image = value; Invalidate(); }
        }

        public override string Text
        {
            get { return _text; }
            set { _text = value ?? string.Empty; Invalidate(); }
        }

        public Color CustomTextColor
        {
            get { return _customTextColor; }
            set { _customTextColor = value; Invalidate(); }
        }

        public bool IsOpen
        {
            get { return _isOpen; }
            set { _isOpen = value; Invalidate(); }
        }

        public ModernDropdownButton()
        {
            _theme = ThemeTokens.DarkTheme();
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw |
                          ControlStyles.SupportsTransparentBackColor, true);
            this.DoubleBuffered = true;
            this.Cursor = Cursors.Hand;
            this.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t ?? ThemeTokens.DarkTheme();
            this.Invalidate();
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            _isHovered = true;
            Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _isHovered = false;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            Color bg = (!this.Enabled) ? t.BgTertiary : (_isOpen || _isHovered ? t.BgElevated : t.BgTertiary);
            Color border = (!this.Enabled) ? t.BorderColor : (_isOpen || _isHovered ? t.BorderHover : t.BorderColor);

            using (GraphicsPath path = RoundedPanel.GetRoundedRectangle(rect, t.RadiusMd))
            using (SolidBrush brush = new SolidBrush(bg))
            using (Pen pen = new Pen(border, 1))
            {
                g.FillPath(brush, path);
                g.DrawPath(pen, path);
            }

            // 1. Draw Image on the Left
            int textLeft = 8;
            if (_image != null)
            {
                int imgW = Math.Min(_image.Width, 16);
                int imgH = Math.Min(_image.Height, 16);
                int imgY = (this.Height - imgH) / 2;
                g.DrawImage(_image, new Rectangle(textLeft, imgY, imgW, imgH));
                textLeft += imgW + 6;
            }

            // 2. Text
            int textRight = this.Width - 18;
            Color textColor = (!this.Enabled) ? t.TextTertiary : (_customTextColor != Color.Empty ? _customTextColor : t.TextPrimary);

            RectangleF textRect = new RectangleF(textLeft, 0, Math.Max(0, textRight - textLeft), this.Height);
            using (SolidBrush textBrush = new SolidBrush(textColor))
            using (StringFormat sf = new StringFormat
            {
                LineAlignment = StringAlignment.Center,
                Alignment = StringAlignment.Near,
                Trimming = StringTrimming.EllipsisCharacter,
                FormatFlags = StringFormatFlags.NoWrap
            })
            {
                g.DrawString(_text, this.Font, textBrush, textRect, sf);
            }

            // 3. Arrow indicator ▾ on the right
            int arrowX = this.Width - 13;
            int arrowY = this.Height / 2 - 2;
            Point[] arrowPts = new Point[]
            {
                new Point(arrowX, arrowY),
                new Point(arrowX + 6, arrowY),
                new Point(arrowX + 3, arrowY + 4)
            };
            using (SolidBrush arrowBrush = new SolidBrush(_isHovered || _isOpen ? t.TextPrimary : t.TextTertiary))
            {
                g.FillPolygon(arrowBrush, arrowPts);
            }
        }
    }
}
