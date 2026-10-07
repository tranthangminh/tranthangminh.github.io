using System;
using System.Collections.Generic;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using MaxApp.Common;

namespace BookForge
{
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

                Color borderColor = isDragOver ? t.AccentPrimaryHover : t.BorderColor;
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
                TextRenderer.DrawText(g, sub, ThemeTokens.FontSmall(), subRect, t.TextTertiary, TextFormatFlags.HorizontalCenter | TextFormatFlags.NoPrefix);
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
                TextRenderer.DrawText(g, title, ThemeTokens.FontBodyBold, titleRect, t.AccentPrimary, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);

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
                    Size sz = TextRenderer.MeasureText(g, chipText, ThemeTokens.FontSmall());
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
                            int moreW = TextRenderer.MeasureText(g, moreText, ThemeTokens.FontSmall()).Width + 14;
                            if (curX + chipW + spacing + moreW > rowMaxX)
                            {
                                string totalMoreText = string.Format("+{0} more...", remainingAfterThis + 1);
                                int totalMoreW = Math.Min(TextRenderer.MeasureText(g, totalMoreText, ThemeTokens.FontSmall()).Width + 14, rowMaxX - curX);
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
                                    int totalMoreW = Math.Min(TextRenderer.MeasureText(g, totalMoreText, ThemeTokens.FontSmall()).Width + 14, rowMaxX - curX);
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
            TextRenderer.DrawText(g, text, ThemeTokens.FontSmall(), textRect, t.TextPrimary, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis | TextFormatFlags.NoPrefix);
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
            TextRenderer.DrawText(g, text, ThemeTokens.FontSmall(), textRect, t.AccentPrimaryHover, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);
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
            get { return new Rectangle(0, (Height - 34) / 2, 34, 34); }
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

            int startX = 42;
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

            int startX = 42;
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

            // Draw standard info "ℹ" icon centered in the box (matching Auto Clicker btnTabInfo style)
            TextRenderer.DrawText(g, "ℹ", ThemeTokens.FontSegoeSymbol(ThemeTokens.FontSizeCard, FontStyle.Bold), infoRect, infoFg,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);

            // 3. Draw Tab Titles
            int startX = 42;
            int tabW = Math.Max(1, (Width - startX) / 2);

            for (int i = 0; i < tabTitles.Length; i++)
            {
                Rectangle tabRect = new Rectangle(startX + i * tabW, 0, tabW, Height - 1);
                bool isActive = (i == activeTabIndex);

                Color textColor = isActive ? t.TextPrimary : ((i == hoverTabIndex) ? t.TextPrimary : t.TextSecondary);
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
