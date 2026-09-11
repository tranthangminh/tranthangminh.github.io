using System;
using System.Collections.Generic;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace BookForge
{
    // 0. ModernContainerPanel with full double-buffering and instant resize redraw
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

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            this.Invalidate(true);
        }
    }

    // 1. RoundedPanel helper container
    public class RoundedPanel : Panel
    {
        private int _borderRadius = 8;
        private Color _borderColor = ThemeTokens.Current.BorderColor;
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

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            this.Invalidate(true);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

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
    }

    // 2. Modern Button styled with ThemeTokens (Aligned with Auto Clicker's RoundedButton)
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
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            // 1. Paint parent background to ensure corners outside rounded path are 100% clean and transparent
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

            using (GraphicsPath path = RoundedPanel.GetRoundedRectangle(rect, BorderRadius))
            {
                using (SolidBrush brush = new SolidBrush(bg))
                {
                    g.FillPath(brush, path);
                }

                // Inset border for non-primary / non-danger buttons or hovered state
                if (Enabled && !IsPrimary && !IsDanger)
                {
                    using (Pen pen = new Pen(isHovered ? t.BorderHover : t.BorderColor, 1f))
                    {
                        pen.Alignment = PenAlignment.Inset;
                        g.DrawPath(pen, path);
                    }
                }
            }

            // Draw crisp ClearType text
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

    // 3. Modern Card Panel (Rounded Container)
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

    // 4. Modern TextBox (Reused from AutoClicker)
    public class ModernTextBox : TextBox
    {
        private const int EM_SETCUEBANNER = 0x1501;

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int SendMessage(IntPtr hWnd, int msg, int wParam, [MarshalAs(UnmanagedType.LPWStr)] string lParam);

        private Color _borderColor = ThemeTokens.Current.BorderColor;
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
            this.BackColor = ThemeTokens.Current.BgTertiary;
            this.ForeColor = ThemeTokens.Current.TextPrimary;
            this.Font = ThemeTokens.FontBody;
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
                try
                {
                    SendMessage(this.Handle, EM_SETCUEBANNER, 1, _placeholderText ?? string.Empty);
                }
                catch { }
            }
        }

        public void ApplyTheme()
        {
            this.BackColor = ThemeTokens.Current.BgTertiary;
            this.ForeColor = ThemeTokens.Current.TextPrimary;
            this.BorderColor = ThemeTokens.Current.BorderColor;
            this.Invalidate();
        }
    }

    // 5. Modern Dropdown (Reused from AutoClicker)
    public class ModernDropdown : Control
    {
        private List<string> _items = new List<string>();
        private int _selectedIndex = -1;
        private bool _isHovered = false;
        private bool _isOpen = false;
        private ContextMenuStrip _popupMenu;

        public event EventHandler SelectedIndexChanged;

        public List<string> Items { get { return _items; } }

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
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw |
                          ControlStyles.SupportsTransparentBackColor, true);
            this.DoubleBuffered = true;
            this.Cursor = Cursors.Hand;
            this.Size = new Size(180, 26);
            this.Font = ThemeTokens.FontBody;
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            Invalidate();
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

            ThemeTokens t = ThemeTokens.Current;
            _popupMenu = new ContextMenuStrip();
            _popupMenu.Renderer = new ModernMenuRenderer(t);
            _popupMenu.ShowImageMargin = false;
            _popupMenu.Font = ThemeTokens.FontBody;
            _popupMenu.Padding = Padding.Empty;
            _popupMenu.Margin = Padding.Empty;
            int targetWidth = this.Width;
            try
            {
                using (Graphics g = this.CreateGraphics())
                {
                    foreach (string itm in _items)
                    {
                        if (string.IsNullOrEmpty(itm)) continue;
                        Size sz = TextRenderer.MeasureText(g, itm, ThemeTokens.FontBody);
                        if (sz.Width + 24 > targetWidth)
                        {
                            targetWidth = sz.Width + 24;
                        }
                    }
                }
            }
            catch { }

            for (int i = 0; i < _items.Count; i++)
            {
                int itemIdx = i;
                string itemText = _items[i];
                ToolStripMenuItem menuItem = new ToolStripMenuItem(itemText != null ? itemText.Replace("&", "&&") : "");
                menuItem.AutoSize = false;
                menuItem.Width = targetWidth;
                menuItem.Height = 26;
                menuItem.Margin = Padding.Empty;
                menuItem.Padding = Padding.Empty;
                menuItem.ForeColor = t.TextPrimary;
                menuItem.Click += (s, e) =>
                {
                    this.SelectedIndex = itemIdx;
                };
                _popupMenu.Items.Add(menuItem);
            }

            _popupMenu.Opened += (s, e) =>
            {
                if (_popupMenu == null) return;
                int fullW = _popupMenu.ClientSize.Width;
                foreach (ToolStripItem it in _popupMenu.Items)
                {
                    it.AutoSize = false;
                    it.Width = fullW;
                    it.Height = 26;
                }
            };

            _popupMenu.Closed += (s, e) =>
            {
                _isOpen = false;
                this.Invalidate();
            };

            _popupMenu.MinimumSize = new Size(targetWidth, 0);
            _popupMenu.Width = targetWidth;
            _popupMenu.Show(this, new Point(0, this.Height));
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = ThemeTokens.Current;

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            Color bg = (!this.Enabled) ? t.BgTertiary : (_isOpen ? t.BgElevated : (_isHovered ? t.BgElevated : t.BgTertiary));
            Color border = (!this.Enabled) ? t.BorderColor : ((_isOpen || _isHovered) ? t.AccentPrimaryHover : t.BorderColor);

            using (GraphicsPath path = RoundedPanel.GetRoundedRectangle(rect, t.RadiusSm))
            using (SolidBrush brush = new SolidBrush(bg))
            using (Pen pen = new Pen(border, 1))
            {
                g.FillPath(brush, path);
                g.DrawPath(pen, path);
            }

            // Text
            string text = (_selectedIndex >= 0 && _selectedIndex < _items.Count) ? _items[_selectedIndex] : "";
            Color textColor = (!this.Enabled) ? t.TextTertiary : t.TextPrimary;

            Rectangle textRect = new Rectangle(8, 0, Math.Max(0, this.Width - 28), this.Height);
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

            // Arrow indicator ▾
            int arrowX = this.Width - 16;
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

    // 6. Drag & Drop Zone Box (Clean, No Icon, Sentence Case, Batch Support)
    public class DragDropBox : Panel
    {
        public event Action<string> OnPathDropped;
        public event Action<string[]> OnPathsDropped;
        public event Action OnClearClicked;

        private class ChipInfo
        {
            public int Index;
            public string Path;
            public Rectangle Bounds;
            public Rectangle CloseBounds;
        }

        private bool isDragOver = false;
        private bool isClearHovered = false;
        private List<string> currentPaths = new List<string>();
        private List<ChipInfo> visibleChips = new List<ChipInfo>();
        private int hoveredCloseIndex = -1;
        private ToolTip chipTip;
        private string lastTooltipPath = null;

        public string EmptyTitle { get; set; }
        public string EmptySubtitle { get; set; }

        public delegate bool PathValidationDelegate(string path, out string reason);
        public PathValidationDelegate PathValidator { get; set; }
        public event Action<string, string> OnPathRejected;

        public Rectangle ClearButtonRect
        {
            get { return new Rectangle(Width - 32, 8, 20, 20); }
        }

        public string SelectedPath
        {
            get { return currentPaths.Count > 0 ? currentPaths[0] : ""; }
            set
            {
                currentPaths.Clear();
                if (!string.IsNullOrEmpty(value))
                {
                    string reason;
                    if (PathValidator == null || PathValidator(value, out reason))
                    {
                        currentPaths.Add(value);
                    }
                }
                hoveredCloseIndex = -1;
                Invalidate();
            }
        }

        public string[] SelectedPaths
        {
            get { return currentPaths.ToArray(); }
            set
            {
                currentPaths.Clear();
                if (value != null)
                {
                    foreach (var p in value)
                    {
                        if (!string.IsNullOrEmpty(p) && !currentPaths.Contains(p))
                        {
                            string reason;
                            if (PathValidator == null || PathValidator(p, out reason))
                            {
                                currentPaths.Add(p);
                            }
                        }
                    }
                }
                hoveredCloseIndex = -1;
                Invalidate();
            }
        }

        public void ClearPaths()
        {
            currentPaths.Clear();
            visibleChips.Clear();
            isClearHovered = false;
            hoveredCloseIndex = -1;
            if (lastTooltipPath != null)
            {
                lastTooltipPath = null;
                chipTip.SetToolTip(this, null);
            }
            Invalidate();
        }

        public void RemovePathAt(int index)
        {
            if (index >= 0 && index < currentPaths.Count)
            {
                currentPaths.RemoveAt(index);
                hoveredCloseIndex = -1;
                if (lastTooltipPath != null)
                {
                    lastTooltipPath = null;
                    chipTip.SetToolTip(this, null);
                }
                Invalidate();
                if (OnPathsDropped != null)
                {
                    OnPathsDropped(currentPaths.ToArray());
                }
                if (currentPaths.Count == 0 && OnClearClicked != null)
                {
                    OnClearClicked();
                }
            }
        }

        public DragDropBox()
        {
            this.DoubleBuffered = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.ResizeRedraw, true);
            AllowDrop = true;
            Cursor = Cursors.Hand;
            BackColor = ThemeTokens.Current.BgSecondary;
            EmptyTitle = "Drag & drop file or book directory here...";
            EmptySubtitle = "Supports .md files or book project folders";

            chipTip = new ToolTip();
            chipTip.InitialDelay = 300;
            chipTip.ReshowDelay = 100;
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            Invalidate();
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            if (currentPaths.Count > 0)
            {
                bool clearHover = ClearButtonRect.Contains(e.Location);
                int closeIndex = -1;
                ChipInfo hoveredChip = null;

                for (int i = 0; i < visibleChips.Count; i++)
                {
                    if (visibleChips[i].CloseBounds.Contains(e.Location))
                    {
                        closeIndex = visibleChips[i].Index;
                    }
                    if (visibleChips[i].Bounds.Contains(e.Location))
                    {
                        hoveredChip = visibleChips[i];
                    }
                }

                if (clearHover != isClearHovered || closeIndex != hoveredCloseIndex)
                {
                    isClearHovered = clearHover;
                    hoveredCloseIndex = closeIndex;
                    Invalidate();
                }

                Cursor = (isClearHovered || hoveredCloseIndex >= 0) ? Cursors.Hand : Cursors.Default;

                string newTip = (hoveredChip != null && closeIndex < 0) ? hoveredChip.Path : null;
                if (newTip != lastTooltipPath)
                {
                    lastTooltipPath = newTip;
                    chipTip.SetToolTip(this, newTip);
                }
            }
            else
            {
                Cursor = Cursors.Hand;
                if (lastTooltipPath != null)
                {
                    lastTooltipPath = null;
                    chipTip.SetToolTip(this, null);
                }
            }
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            bool needRedraw = isClearHovered || hoveredCloseIndex >= 0;
            isClearHovered = false;
            hoveredCloseIndex = -1;
            if (lastTooltipPath != null)
            {
                lastTooltipPath = null;
                chipTip.SetToolTip(this, null);
            }
            if (needRedraw)
            {
                Invalidate();
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left && currentPaths.Count > 0)
            {
                if (ClearButtonRect.Contains(e.Location))
                {
                    ClearPaths();
                    if (OnClearClicked != null)
                    {
                        OnClearClicked();
                    }
                    if (OnPathsDropped != null)
                    {
                        OnPathsDropped(new string[0]);
                    }
                    return;
                }

                ChipInfo clicked = visibleChips.Find(c => c.CloseBounds.Contains(e.Location));
                if (clicked != null && clicked.Index >= 0 && clicked.Index < currentPaths.Count)
                {
                    RemovePathAt(clicked.Index);
                    return;
                }
            }
        }

        protected override void OnDragEnter(DragEventArgs drgevent)
        {
            base.OnDragEnter(drgevent);
            if (drgevent.Data.GetDataPresent(DataFormats.FileDrop))
            {
                drgevent.Effect = DragDropEffects.Copy;
                isDragOver = true;
                Invalidate();
            }
        }

        protected override void OnDragLeave(EventArgs e)
        {
            base.OnDragLeave(e);
            isDragOver = false;
            Invalidate();
        }

        protected override void OnDragDrop(DragEventArgs drgevent)
        {
            base.OnDragDrop(drgevent);
            isDragOver = false;
            if (drgevent.Data.GetDataPresent(DataFormats.FileDrop))
            {
                string[] files = (string[])drgevent.Data.GetData(DataFormats.FileDrop);
                if (files != null && files.Length > 0)
                {
                    List<string> valid = new List<string>();
                    foreach (var f in files)
                    {
                        if (string.IsNullOrEmpty(f)) continue;
                        string reason;
                        if (PathValidator != null)
                        {
                            if (PathValidator(f, out reason))
                            {
                                valid.Add(f);
                            }
                            else
                            {
                                if (OnPathRejected != null)
                                {
                                    OnPathRejected(f, reason);
                                }
                            }
                        }
                        else
                        {
                            valid.Add(f);
                        }
                    }

                    SelectedPaths = valid.ToArray();
                    if (OnPathsDropped != null)
                    {
                        OnPathsDropped(valid.ToArray());
                    }
                    if (OnPathDropped != null && valid.Count > 0)
                    {
                        OnPathDropped(valid[0]);
                    }
                }
            }
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = ThemeTokens.Current;

            Color parentBg = (this.Parent != null) ? this.Parent.BackColor : t.BgPrimary;
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            Rectangle rect = new Rectangle(2, 2, Width - 5, Height - 5);
            using (GraphicsPath path = RoundedPanel.GetRoundedRectangle(rect, t.RadiusMd))
            {
                Color bg = isDragOver ? t.HotkeyBoxBg : BackColor;
                using (SolidBrush brush = new SolidBrush(bg))
                {
                    g.FillPath(brush, path);
                }

                Color borderColor = isDragOver ? t.AccentPrimaryHover : (currentPaths.Count == 0 ? t.BorderColor : t.Success);
                using (Pen pen = new Pen(borderColor, 1.5f))
                {
                    pen.Alignment = PenAlignment.Inset;
                    // Always dashed, never solid
                    pen.DashStyle = DashStyle.Dash;
                    pen.DashPattern = new float[] { 4, 3 };
                    g.DrawPath(pen, path);
                }
            }

            // Draw Texts (Sentence Case, Clean)
            if (currentPaths.Count == 0)
            {
                visibleChips.Clear();
                string title = isDragOver ? "Drop file or book directory here..." : (!string.IsNullOrEmpty(EmptyTitle) ? EmptyTitle : "Drag & drop file or book directory here...");
                string sub = !string.IsNullOrEmpty(EmptySubtitle) ? EmptySubtitle : "Supports .md files or book project folders";

                int contentY = (Height - 42) / 2;
                Rectangle titleRect = new Rectangle(10, contentY, Width - 20, 22);
                Rectangle subRect = new Rectangle(10, contentY + 22, Width - 20, 20);

                TextRenderer.DrawText(g, title, ThemeTokens.FontBodyBold, titleRect, isDragOver ? t.TextPrimary : t.TextPrimary, TextFormatFlags.HorizontalCenter | TextFormatFlags.NoPrefix);
                TextRenderer.DrawText(g, sub, ThemeTokens.FontSmall, subRect, t.TextTertiary, TextFormatFlags.HorizontalCenter | TextFormatFlags.NoPrefix);
            }
            else
            {
                visibleChips.Clear();

                string title;
                if (currentPaths.Count == 1)
                {
                    title = "Selected:";
                }
                else
                {
                    title = string.Format("Selected {0} items (Batch mode):", currentPaths.Count);
                }

                int chipH = 20;
                int spacing = 6;

                Size titleSz = TextRenderer.MeasureText(g, title, ThemeTokens.FontBodyBold);
                Rectangle titleRect = new Rectangle(16, 8, titleSz.Width, chipH);
                TextRenderer.DrawText(g, title, ThemeTokens.FontBodyBold, titleRect, t.Success, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);

                // Clear '✕' button (top right)
                Rectangle btnRect = ClearButtonRect;
                if (isClearHovered)
                {
                    using (SolidBrush hoverBrush = new SolidBrush(t.BgElevated))
                    using (GraphicsPath btnPath = RoundedPanel.GetRoundedRectangle(btnRect, t.RadiusSm))
                    {
                        g.FillPath(hoverBrush, btnPath);
                    }
                }
                Color xColor = isClearHovered ? t.TextPrimary : t.TextTertiary;
                TextRenderer.DrawText(g, "✕", ThemeTokens.FontSmallBold, btnRect, xColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);

                // Pill badges (chips) starting right after the title on Row 1!
                int curRow = 1;
                int curY = 8;
                int curX = 16 + titleSz.Width + 8;

                for (int i = 0; i < currentPaths.Count; i++)
                {
                    string p = currentPaths[i];
                    bool isDir = Directory.Exists(p);
                    string name = Path.GetFileName(p.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
                    if (string.IsNullOrEmpty(name)) name = p;
                    string icon = isDir ? "📁 " : (p.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "📄 " : "📝 ");
                    string chipText = icon + name;
                    Size sz = TextRenderer.MeasureText(g, chipText, ThemeTokens.FontSmall);
                    int chipW = sz.Width + 28; // text + padding + '✕' close button

                    int rowMaxX = (curRow == 1) ? (Width - 36) : (Width - 16);

                    if (curRow == 1)
                    {
                        if (curX + chipW > rowMaxX)
                        {
                            // Wrap to row 2
                            curRow = 2;
                            curY = 32;
                            curX = 16;
                            rowMaxX = Width - 16;
                        }
                    }

                    if (curRow == 2)
                    {
                        if (curX + chipW > rowMaxX)
                        {
                            // Wrap to row 3
                            curRow = 3;
                            curY = 56;
                            curX = 16;
                            rowMaxX = Width - 16;
                        }
                    }

                    if (curRow == 3)
                    {
                        int remainingAfterThis = currentPaths.Count - (i + 1);
                        if (remainingAfterThis > 0)
                        {
                            string moreText = string.Format("+{0} more...", remainingAfterThis);
                            int moreW = TextRenderer.MeasureText(g, moreText, ThemeTokens.FontSmall).Width + 14;
                            if (curX + chipW + spacing + moreW > rowMaxX)
                            {
                                string totalMoreText = string.Format("+{0} more...", remainingAfterThis + 1);
                                int totalMoreW = Math.Min(TextRenderer.MeasureText(g, totalMoreText, ThemeTokens.FontSmall).Width + 14, rowMaxX - curX);
                                Rectangle moreRect = new Rectangle(curX, curY, totalMoreW, chipH);
                                DrawMoreChip(g, t, moreRect, totalMoreText);
                                break;
                            }
                        }
                        else
                        {
                            if (curX + chipW > rowMaxX)
                            {
                                if (curX == 16)
                                {
                                    chipW = rowMaxX - 16;
                                }
                                else
                                {
                                    string totalMoreText = "+1 more...";
                                    int totalMoreW = Math.Min(TextRenderer.MeasureText(g, totalMoreText, ThemeTokens.FontSmall).Width + 14, rowMaxX - curX);
                                    Rectangle moreRect = new Rectangle(curX, curY, totalMoreW, chipH);
                                    DrawMoreChip(g, t, moreRect, totalMoreText);
                                    break;
                                }
                            }
                        }
                    }

                    Rectangle chipRect = new Rectangle(curX, curY, chipW, chipH);
                    Rectangle closeRect = new Rectangle(chipRect.Right - 18, chipRect.Y, 18, chipH);
                    visibleChips.Add(new ChipInfo { Index = i, Path = p, Bounds = chipRect, CloseBounds = closeRect });

                    bool isCloseHovered = (hoveredCloseIndex == i);
                    DrawRemovableChip(g, t, chipRect, closeRect, chipText, isCloseHovered);

                    curX += chipW + spacing;
                }
            }
        }

        private void DrawRemovableChip(Graphics g, ThemeTokens t, Rectangle chipRect, Rectangle closeRect, string text, bool isCloseHovered)
        {
            if (chipRect.Width <= 0 || chipRect.Height <= 0) return;
            using (GraphicsPath cp = RoundedPanel.GetRoundedRectangle(chipRect, t.RadiusSm))
            {
                using (SolidBrush b = new SolidBrush(t.BgElevated))
                {
                    g.FillPath(b, cp);
                }
                using (Pen p = new Pen(t.BorderColor, 1f))
                {
                    g.DrawPath(p, cp);
                }
            }

            if (isCloseHovered)
            {
                Rectangle closeHoverRect = new Rectangle(closeRect.X + 1, closeRect.Y + 2, closeRect.Width - 3, closeRect.Height - 4);
                using (GraphicsPath closePath = RoundedPanel.GetRoundedRectangle(closeHoverRect, 3))
                {
                    using (SolidBrush hoverBg = new SolidBrush(Color.FromArgb(40, t.Danger)))
                    {
                        g.FillPath(hoverBg, closePath);
                    }
                }
            }

            Color xColor = isCloseHovered ? t.Danger : t.TextTertiary;
            TextRenderer.DrawText(g, "✕", ThemeTokens.FontSmallBold, closeRect, xColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);

            Rectangle textRect = new Rectangle(chipRect.X + 6, chipRect.Y, Math.Max(0, chipRect.Width - 26), chipRect.Height);
            TextRenderer.DrawText(g, text, ThemeTokens.FontSmall, textRect, t.TextPrimary, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis | TextFormatFlags.NoPrefix);
        }

        private void DrawMoreChip(Graphics g, ThemeTokens t, Rectangle rect, string text)
        {
            if (rect.Width <= 0 || rect.Height <= 0) return;
            using (GraphicsPath cp = RoundedPanel.GetRoundedRectangle(rect, t.RadiusSm))
            {
                using (SolidBrush b = new SolidBrush(t.HotkeyBoxBg))
                {
                    g.FillPath(b, cp);
                }
                using (Pen p = new Pen(t.AccentPrimaryHover, 1f))
                {
                    g.DrawPath(p, cp);
                }
            }
            Rectangle textRect = new Rectangle(rect.X + 4, rect.Y, Math.Max(0, rect.Width - 8), rect.Height);
            TextRenderer.DrawText(g, text, ThemeTokens.FontSmall, textRect, t.AccentPrimaryHover, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);
        }
    }

    // 7. Modern Progress Bar
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
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            ThemeTokens t = ThemeTokens.Current;

            Color parentBg = (this.Parent != null) ? this.Parent.BackColor : t.BgPrimary;
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath trackPath = RoundedPanel.GetRoundedRectangle(rect, t.RadiusSm))
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
                using (GraphicsPath fillPath = RoundedPanel.GetRoundedRectangle(fillRect, t.RadiusSm))
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

    // 8. Modern Tab Navigation Bar (Sentence Case with Auto Clicker Info button)
    public class ModernTabBar : Panel
    {
        public event Action<int> OnTabChanged;
        private int activeTabIndex = 0;
        private string[] tabTitles = new string[] { "PDF to Markdown", "Markdown to PDF" };
        private bool isHoverInfo = false;
        private int hoverTabIndex = -1;

        public int SelectedIndex
        {
            get { return activeTabIndex; }
            set
            {
                if (activeTabIndex != value && value >= 0 && value <= 2)
                {
                    activeTabIndex = value;
                    if (OnTabChanged != null) OnTabChanged(activeTabIndex);
                    Invalidate();
                }
            }
        }

        public ModernTabBar()
        {
            this.DoubleBuffered = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.ResizeRedraw, true);
            Height = 44;
            BackColor = ThemeTokens.Current.BgPrimary;
            Cursor = Cursors.Hand;
        }

        private Rectangle InfoButtonRect
        {
            get { return new Rectangle(16, (Height - 34) / 2, 34, 34); }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            Invalidate();
        }

        protected override void OnEnabledChanged(EventArgs e)
        {
            base.OnEnabledChanged(e);
            Cursor = Enabled ? Cursors.Hand : Cursors.Default;
            Invalidate();
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            if (!Enabled) return;

            bool oldHoverInfo = isHoverInfo;
            int oldHoverTab = hoverTabIndex;

            isHoverInfo = InfoButtonRect.Contains(e.Location);

            int startX = 58;
            int tabW = Math.Max(1, (Width - startX) / 2);
            if (e.X >= startX && !isHoverInfo)
            {
                hoverTabIndex = (e.X - startX) / tabW;
                if (hoverTabIndex >= 2) hoverTabIndex = 1;
            }
            else
            {
                hoverTabIndex = -1;
            }

            if (isHoverInfo != oldHoverInfo || hoverTabIndex != oldHoverTab)
            {
                Invalidate();
            }
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            isHoverInfo = false;
            hoverTabIndex = -1;
            Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            if (!Enabled) return;
            base.OnMouseDown(e);

            if (InfoButtonRect.Contains(e.Location))
            {
                SelectedIndex = 2; // Info tab
                return;
            }

            int startX = 58;
            if (e.X >= startX)
            {
                int tabW = Math.Max(1, (Width - startX) / 2);
                int clicked = (e.X - startX) / tabW;
                if (clicked == 0) SelectedIndex = 0;
                else if (clicked == 1) SelectedIndex = 1;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            ThemeTokens t = ThemeTokens.Current;

            // 1. Draw Bottom Baseline
            using (Pen pen = new Pen(t.BorderColor, 1f))
            {
                g.DrawLine(pen, 0, Height - 1, Width, Height - 1);
            }

            // 2. Draw Info Button (Auto Clicker style)
            Rectangle infoRect = InfoButtonRect;
            bool isInfoActive = (activeTabIndex == 2);
            Color infoBg = isInfoActive ? t.AccentPrimary : (isHoverInfo ? t.BgElevated : t.BgSecondary);
            Color infoFg = isInfoActive ? Color.White : (isHoverInfo ? t.TextPrimary : t.TextSecondary);

            using (GraphicsPath infoPath = ModernCard.GetRoundedRectangle(infoRect, t.RadiusMd))
            {
                using (SolidBrush brush = new SolidBrush(infoBg))
                {
                    g.FillPath(brush, infoPath);
                }
                if (!isInfoActive)
                {
                    using (Pen borderPen = new Pen(isHoverInfo ? t.BorderHover : t.BorderColor, 1f))
                    {
                        g.DrawPath(borderPen, infoPath);
                    }
                }
            }

            // Draw standard slender "i" icon centered exactly in the middle (matching original size)
            int ix = infoRect.X + (infoRect.Width - 2) / 2;
            int iy = infoRect.Y + (infoRect.Height - 8) / 2;

            using (SolidBrush iconBrush = new SolidBrush(infoFg))
            {
                g.FillEllipse(iconBrush, ix, iy, 2, 2);
                g.FillRectangle(iconBrush, ix, iy + 3, 2, 5);
            }

            // 3. Draw Tab Titles
            int startX = 58;
            int tabW = Math.Max(1, (Width - startX) / 2);

            for (int i = 0; i < tabTitles.Length; i++)
            {
                Rectangle tabRect = new Rectangle(startX + i * tabW, 0, tabW, Height - 1);
                bool isActive = (i == activeTabIndex);

                Color textColor = isActive ? t.TextPrimary : ((i == hoverTabIndex) ? t.TextSecondary : t.TextTertiary);
                Font font = isActive ? ThemeTokens.FontBodyBold : ThemeTokens.FontBody;

                TextRenderer.DrawText(g, tabTitles[i], font, tabRect, textColor,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);

                if (isActive)
                {
                    // Active indicator bar
                    int indW = Math.Min(180, tabW - 40);
                    int indX = tabRect.X + (tabW - indW) / 2;
                    Rectangle indicator = new Rectangle(indX, Height - 3, indW, 3);
                    using (SolidBrush brush = new SolidBrush(t.AccentPrimary))
                    {
                        g.FillRectangle(brush, indicator);
                    }
                }
            }
        }
    }
}


