using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace MaxApp.Common
{
    public class DoubleBufferedTableLayoutPanel : TableLayoutPanel
    {
        private const int WM_NCHITTEST = 0x0084;
        private const int HTTRANSPARENT = -1;

        public bool EnableBorderHitTestTransparent { get; set; }

        public DoubleBufferedTableLayoutPanel()
        {
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_NCHITTEST && EnableBorderHitTestTransparent)
            {
                int x = (short)(m.LParam.ToInt32() & 0xFFFF);
                int y = (short)((m.LParam.ToInt32() >> 16) & 0xFFFF);
                Point pt = this.PointToClient(new Point(x, y));
                const int grip = 8;
                if (pt.X <= grip || pt.X >= this.ClientSize.Width - grip ||
                    pt.Y <= grip || pt.Y >= this.ClientSize.Height - grip)
                {
                    m.Result = (IntPtr)HTTRANSPARENT;
                    return;
                }
            }
            base.WndProc(ref m);
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

            Color parentBg = SystemColors.Control;
            Control p = this.Parent;
            while (p != null)
            {
                if (p.BackColor != Color.Transparent && p.BackColor != Color.Empty)
                {
                    parentBg = p.BackColor;
                    break;
                }
                p = p.Parent;
            }
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
                    float totalTextH = 36f;
                    float startY = Math.Max(2f, (this.Height - totalTextH) / 2f);
                    RectangleF topRect = new RectangleF(textLeft, startY, Math.Max(0, textRight - textLeft), 20);
                    RectangleF btmRect = new RectangleF(textLeft, startY + 20, Math.Max(0, textRight - textLeft), 16);

                    g.DrawString(this.Text, this.Font, textBrush, topRect, sf);

                    using (Font subFont = new Font(this.Font.FontFamily, ThemeTokens.FontSizeSmall, FontStyle.Regular, GraphicsUnit.Pixel))
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

        public void ApplyTheme(ThemeTokens theme = null)
        {
            if (theme == null) theme = ThemeTokens.Current;
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
                IntPtr hdc = CommonNativeMethods.GetWindowDC(this.Handle);
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
                        CommonNativeMethods.ReleaseDC(this.Handle, hdc);
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
            this.Font = ThemeTokens.FontCard(FontStyle.Bold);
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
                        CommonNativeMethods.SendMessage(this.Parent.Handle, m.Msg, m.WParam, m.LParam);
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
        public Func<int, string> CollapsedTextProvider { get; set; }
        public Func<int, Image> ItemImageProvider { get; set; }
        public bool ShowCollapsedImageOnly { get; set; }
        public ThemeTokens Theme { get { return _theme; } }
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
            this.Font = ThemeTokens.FontBase(FontStyle.Regular);
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

            bool hasImages = (ItemImageProvider != null);
            _popupMenu = new ContextMenuStrip();
            _popupMenu.Renderer = new ModernMenuRenderer(_theme);
            _popupMenu.ShowImageMargin = hasImages;
            if (hasImages)
            {
                _popupMenu.ImageScalingSize = new Size(16, 16);
            }
            _popupMenu.Font = ThemeTokens.FontBase(FontStyle.Regular);
            _popupMenu.AutoSize = true;

            for (int i = 0; i < _items.Count; i++)
            {
                int itemIdx = i;
                string itemText = _items[i];
                string displayLabel = !string.IsNullOrEmpty(PrefixText) ? (PrefixText + " " + itemText) : itemText;
                ToolStripMenuItem menuItem = new ToolStripMenuItem(displayLabel);

                if (hasImages)
                {
                    menuItem.Image = ItemImageProvider(itemIdx);
                }

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

            // 1. Text or Image with optional Prefix
            Image itemImg = (ItemImageProvider != null && _selectedIndex >= 0) ? ItemImageProvider(_selectedIndex) : null;
            string text = (_selectedIndex >= 0 && _selectedIndex < _items.Count)
                ? (CollapsedTextProvider != null ? CollapsedTextProvider(_selectedIndex) : _items[_selectedIndex])
                : "";
            Color textColor = (!this.Enabled) ? t.TextTertiary : t.TextPrimary;
            if (this.Enabled && _selectedIndex >= 0 && ItemColorProvider != null)
            {
                textColor = ItemColorProvider(_selectedIndex);
            }

            int textLeft = 4;
            int arrowX = this.Width - 11;

            if (ShowCollapsedImageOnly || (itemImg != null && string.IsNullOrEmpty(text) && string.IsNullOrEmpty(PrefixText)))
            {
                if (itemImg != null)
                {
                    int imgW = Math.Min(16, itemImg.Width);
                    int imgH = Math.Min(16, itemImg.Height);
                    int availW = arrowX;
                    int imgX = Math.Max(2, (availW - imgW) / 2);
                    int imgY = Math.Max(0, (this.Height - imgH) / 2);
                    g.DrawImage(itemImg, new Rectangle(imgX, imgY, imgW, imgH));
                }
            }
            else
            {
                if (itemImg != null)
                {
                    int imgW = Math.Min(16, itemImg.Width);
                    int imgH = Math.Min(16, itemImg.Height);
                    int imgY = Math.Max(0, (this.Height - imgH) / 2);
                    g.DrawImage(itemImg, new Rectangle(textLeft, imgY, imgW, imgH));
                    textLeft += imgW + 4;
                }

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

                Rectangle textRect = new Rectangle(textLeft, 0, Math.Max(0, arrowX - textLeft), this.Height);
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
            }

            // 2. Arrow indicator â–¾
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
            this.Font = ThemeTokens.FontBase(FontStyle.Bold);
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

            // 3. Arrow indicator â–¾ on the right
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

    public class SvgIconButton : Control
    {
        private string _svgName;
        private bool _isHovered = false;
        private bool _isPressed = false;
        private bool _isExternalHovered = false;
        private ThemeTokens _theme;
        private int _iconWidth = 14;
        private int _iconHeight = 16;

        public string SvgName
        {
            get { return _svgName; }
            set
            {
                if (_svgName != value)
                {
                    _svgName = value;
                    Invalidate();
                }
            }
        }

        public int IconWidth
        {
            get { return _iconWidth; }
            set
            {
                if (_iconWidth != value)
                {
                    _iconWidth = value;
                    Invalidate();
                }
            }
        }

        public int IconHeight
        {
            get { return _iconHeight; }
            set
            {
                if (_iconHeight != value)
                {
                    _iconHeight = value;
                    Invalidate();
                }
            }
        }

        public int IconSize
        {
            get { return Math.Max(_iconWidth, _iconHeight); }
            set
            {
                _iconWidth = value;
                _iconHeight = value;
                Invalidate();
            }
        }

        public bool IsExternalHovered
        {
            get { return _isExternalHovered; }
            set
            {
                if (_isExternalHovered != value)
                {
                    _isExternalHovered = value;
                    Invalidate();
                }
            }
        }

        public SvgIconButton()
        {
            _theme = ThemeTokens.DarkTheme();
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw |
                          ControlStyles.SupportsTransparentBackColor, true);
            this.DoubleBuffered = true;
            this.Cursor = Cursors.Hand;
            this.Size = new Size(16, 22);
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t ?? ThemeTokens.DarkTheme();
            Invalidate();
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
            _isPressed = false;
            Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left)
            {
                _isPressed = true;
                Invalidate();
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (_isPressed)
            {
                _isPressed = false;
                Invalidate();
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (string.IsNullOrEmpty(_svgName)) return;

            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();
            Color tint;
            if (!this.Enabled)
            {
                tint = t.TextTertiary;
            }
            else if (_isPressed || _isHovered || _isExternalHovered)
            {
                tint = t.AccentPrimary;
            }
            else
            {
                tint = t.TextPrimary;
            }

            Image img = SvgFileRenderer.GetCachedTintedIcon(_svgName, _iconWidth, _iconHeight, tint);
            if (img != null)
            {
                int x = (this.Width - _iconWidth) / 2;
                int y = (this.Height - _iconHeight) / 2;
                g.DrawImage(img, new Rectangle(x, y, _iconWidth, _iconHeight));
            }
        }
    }

    // Container Panel with double-buffering and instant resize redraw (Book Forge compatible)
    public class ModernContainerPanel : Panel
    {
        public ModernContainerPanel()
        {
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.UserPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);
        }
    }

    // Modern Card Panel (Rounded Container compatible with Book Forge)
    public class ModernCard : RoundedPanel
    {
        public ModernCard()
        {
            BorderRadius = ThemeTokens.Current.RadiusLg;
            BackColor = ThemeTokens.Current.BgSecondary;
            BorderColor = ThemeTokens.Current.BorderColor;
            Padding = new Padding(14);
        }

        public void ApplyTheme()
        {
            BackColor = ThemeTokens.Current.BgSecondary;
            BorderColor = ThemeTokens.Current.BorderColor;
            Invalidate();
        }
    }

    // Modern Button styled with ThemeTokens (Book Forge compatible)
    public class ModernButton : Button
    {
        private bool isHovered = false;
        private bool isPressed = false;

        public bool IsPrimary { get; set; }
        public bool IsDanger { get; set; }
        public int BorderRadius { get; set; }

        public ModernButton()
        {
            this.FlatStyle = FlatStyle.Flat;
            this.FlatAppearance.BorderSize = 0;
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);

            BorderRadius = ThemeTokens.Current.RadiusMd;
            Font = ThemeTokens.FontBodyBold;
            Size = new Size(140, ThemeTokens.Current.BtnHeightMd);
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            this.Invalidate();
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            isHovered = true;
            Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            isHovered = false;
            isPressed = false;
            Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs mevent)
        {
            base.OnMouseDown(mevent);
            isPressed = true;
            Invalidate();
        }

        protected override void OnMouseUp(MouseEventArgs mevent)
        {
            base.OnMouseUp(mevent);
            isPressed = false;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs pevent)
        {
            Graphics g = pevent.Graphics;
            GraphicsHelper.ApplyHighQuality(g);
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            Color parentBg = (this.Parent != null) ? this.Parent.BackColor : ThemeTokens.Current.BgPrimary;
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            ThemeTokens t = ThemeTokens.Current;
            Color bg;
            Color fg;

            if (!Enabled)
            {
                bg = t.BgTertiary;
                fg = t.TextTertiary;
            }
            else if (IsDanger)
            {
                bg = isPressed ? Color.FromArgb(170, 30, 30) : (isHovered ? Color.FromArgb(235, 60, 60) : t.Danger);
                fg = Color.White;
            }
            else if (IsPrimary)
            {
                bg = isPressed ? Color.FromArgb(18, 90, 160) : (isHovered ? t.AccentPrimaryHover : t.AccentPrimary);
                fg = Color.White;
            }
            else
            {
                bg = isPressed ? t.BgSecondary : (isHovered ? t.BgElevated : t.BgTertiary);
                fg = isHovered ? Color.White : t.TextPrimary;
            }

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            using (GraphicsPath path = GraphicsHelper.GetRoundedRectangle(rect, BorderRadius))
            {
                using (SolidBrush brush = new SolidBrush(bg))
                {
                    g.FillPath(brush, path);
                }

                if (Enabled && !IsPrimary && !IsDanger)
                {
                    using (Pen pen = new Pen(isHovered ? t.BorderHover : t.BorderColor, 1f))
                    {
                        pen.Alignment = PenAlignment.Inset;
                        g.DrawPath(pen, path);
                    }
                }
            }

            using (StringFormat sf = new StringFormat
            {
                Alignment = StringAlignment.Center,
                LineAlignment = StringAlignment.Center,
                Trimming = StringTrimming.EllipsisCharacter,
                FormatFlags = (this.Text != null && this.Text.Contains("\n")) ? (StringFormatFlags)0 : StringFormatFlags.NoWrap
            })
            using (SolidBrush textBrush = new SolidBrush(fg))
            {
                RectangleF textRect = new RectangleF(0, 0, this.Width, this.Height);
                g.DrawString(this.Text, this.Font, textBrush, textRect, sf);
            }
        }
    }

    // Modern Progress Bar (Book Forge compatible)
    public class ModernProgressBar : Control
    {
        private int currentValue = 0;
        private int maximumValue = 100;
        private string customStatusText = "";

        public int Value
        {
            get { return currentValue; }
            set
            {
                currentValue = Math.Max(0, Math.Min(maximumValue, value));
                Invalidate();
            }
        }

        public int Maximum
        {
            get { return maximumValue; }
            set
            {
                maximumValue = Math.Max(1, value);
                Invalidate();
            }
        }

        public string StatusText
        {
            get { return customStatusText; }
            set
            {
                customStatusText = value;
                Invalidate();
            }
        }

        public ModernProgressBar()
        {
            this.DoubleBuffered = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.ResizeRedraw, true);
            Height = 26;
            BackColor = ThemeTokens.Current.BgTertiary;
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            GraphicsHelper.ApplyHighQuality(g);

            ThemeTokens t = ThemeTokens.Current;

            Color parentBg = (this.Parent != null) ? this.Parent.BackColor : t.BgPrimary;
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath trackPath = GraphicsHelper.GetRoundedRectangle(rect, t.RadiusSm))
            {
                using (SolidBrush brush = new SolidBrush(BackColor))
                {
                    g.FillPath(brush, trackPath);
                }
                using (Pen pen = new Pen(t.BorderColor, 1f))
                {
                    pen.Alignment = PenAlignment.Inset;
                    g.DrawPath(pen, trackPath);
                }
            }

            // Fill Bar
            float percent = (float)currentValue / (float)maximumValue;
            int fillWidth = (int)((Width - 2) * percent);

            if (fillWidth > 4)
            {
                Rectangle fillRect = new Rectangle(1, 1, fillWidth, Height - 2);
                using (GraphicsPath fillPath = GraphicsHelper.GetRoundedRectangle(fillRect, t.RadiusSm))
                {
                    using (LinearGradientBrush brush = new LinearGradientBrush(fillRect, t.AccentPrimary, t.AccentPrimaryHover, LinearGradientMode.Horizontal))
                    {
                        g.FillPath(brush, fillPath);
                    }
                }
            }

            // Display text
            string displayText = string.IsNullOrEmpty(customStatusText) 
                ? string.Format("{0}%", (int)(percent * 100))
                : string.Format("{0} ({1}%)", customStatusText, (int)(percent * 100));

            TextRenderer.DrawText(g, displayText, ThemeTokens.FontBodyBold, rect, Color.White, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }
}