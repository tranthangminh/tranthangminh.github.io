using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class ProfileTabItem : Panel
    {
        private string _title = "Script";
        private bool _isActive = false;
        private bool _canClose = true;
        private bool _isPinned = false;
        private int _index = 0;
        private ThemeTokens _theme;
        private ProfileTabControl _parentControl;

        private Label lblTitle;
        private Label btnClose;
        private TextBox txtEdit;
        private bool _isEditing = false;

        private bool _isRunning = false;

        public ProfileTabControl ParentTabControl
        {
            get { return _parentControl; }
            set { _parentControl = value; }
        }

        public bool IsRunning
        {
            get { return _isRunning; }
            set
            {
                if (_isRunning != value)
                {
                    _isRunning = value;
                    if (lblTitle != null) lblTitle.Text = _title;
                    if (_canClose && btnClose != null) btnClose.Visible = !_isRunning && !_isPinned;
                    UpdateAppearance();
                    AdjustSize();
                }
            }
        }

        public string Title
        {
            get { return _title; }
            set
            {
                _title = !string.IsNullOrEmpty(value) ? value.Trim() : "Script";
                if (lblTitle != null) lblTitle.Text = _title;
                AdjustSize();
            }
        }

        public bool IsActive
        {
            get { return _isActive; }
            set
            {
                _isActive = value;
                UpdateAppearance();
            }
        }

        public bool IsPinned
        {
            get { return _isPinned; }
            set
            {
                _isPinned = value;
                if (_isPinned)
                {
                    _canClose = false;
                    if (btnClose != null) btnClose.Visible = false;
                    this.ContextMenuStrip = null;
                    if (lblTitle != null) lblTitle.ContextMenuStrip = null;
                }
                UpdateAppearance();
                AdjustSize();
            }
        }

        public bool CanClose
        {
            get { return _canClose; }
            set
            {
                if (_isPinned) return;
                _canClose = value;
                if (btnClose != null) btnClose.Visible = _canClose;
                AdjustSize();
            }
        }

        public int Index
        {
            get { return _index; }
            set { _index = value; }
        }

        public event Action<ProfileTabItem> OnClosed;
        public event Action<ProfileTabItem, string> OnRenamed;
        public event Action<ProfileTabItem> OnDuplicated;

        public ProfileTabItem(string title, int index, bool isActive, bool canClose, ThemeTokens theme)
        {
            _title = title;
            _index = index;
            _isActive = isActive;
            _canClose = canClose;
            _theme = theme ?? ThemeTokens.DarkTheme();

            this.Height = 24;
            this.DoubleBuffered = true;
            this.Cursor = Cursors.Hand;
            this.Margin = new Padding(0, 0, 4, 0);

            InitializeComponents();
            UpdateAppearance();
            AdjustSize();
        }

        private void InitializeComponents()
        {
            // Context Menu
            ContextMenuStrip contextMenu = new ContextMenuStrip();
            ToolStripMenuItem mnuRename = new ToolStripMenuItem("Rename Script");
            mnuRename.Click += (s, e) => StartRename();

            ToolStripMenuItem mnuDuplicate = new ToolStripMenuItem("Duplicate Script");
            mnuDuplicate.Click += (s, e) => { if (OnDuplicated != null) OnDuplicated(this); };

            ToolStripMenuItem mnuDelete = new ToolStripMenuItem("Delete Script");
            mnuDelete.Click += (s, e) => { if (_canClose && OnClosed != null) OnClosed(this); };

            contextMenu.Items.AddRange(new ToolStripItem[] { mnuRename, mnuDuplicate, new ToolStripSeparator(), mnuDelete });
            this.ContextMenuStrip = contextMenu;

            // Title Label
            lblTitle = new Label
            {
                Text = _title,
                Location = new Point(8, 4),
                AutoSize = true,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
                Cursor = Cursors.Hand,
                BackColor = Color.Transparent,
                ContextMenuStrip = contextMenu
            };
            lblTitle.MouseDown += HandleTabMouseDown;
            lblTitle.MouseMove += HandleTabMouseMove;
            lblTitle.MouseUp += HandleTabMouseUp;
            lblTitle.DoubleClick += (s, e) => StartRename();

            this.MouseDown += HandleTabMouseDown;
            this.MouseMove += HandleTabMouseMove;
            this.MouseUp += HandleTabMouseUp;
            this.DoubleClick += (s, e) => StartRename();

            // Close Button "✕"
            btnClose = new Label
            {
                Text = "✕",
                Size = new Size(16, 18),
                Font = new Font("Segoe UI", 7F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Cursor = Cursors.Hand,
                BackColor = Color.Transparent,
                ForeColor = _theme.TextTertiary,
                Visible = _canClose
            };
            btnClose.MouseEnter += (s, e) => { btnClose.ForeColor = _theme.Danger; };
            btnClose.MouseLeave += (s, e) => { btnClose.ForeColor = _isActive ? _theme.TextSecondary : _theme.TextTertiary; };
            btnClose.Click += (s, e) =>
            {
                if (_canClose && OnClosed != null) OnClosed(this);
            };

            // Inline Rename TextBox
            txtEdit = new TextBox
            {
                BorderStyle = BorderStyle.FixedSingle,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                Visible = false,
                MaxLength = 30
            };
            txtEdit.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.Enter)
                {
                    CommitRename();
                    e.SuppressKeyPress = true;
                    e.Handled = true;
                }
                else if (e.KeyCode == Keys.Escape)
                {
                    CancelRename();
                    e.SuppressKeyPress = true;
                    e.Handled = true;
                }
            };
            txtEdit.Leave += (s, e) => CommitRename();

            this.Controls.AddRange(new Control[] { lblTitle, btnClose, txtEdit });
        }

        private Point _dragStartPos = Point.Empty;
        private bool _isMouseDown = false;

        private void HandleTabMouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left && !_isEditing && _parentControl != null)
            {
                _isMouseDown = true;
                _dragStartPos = Cursor.Position;
                _parentControl.SelectTab(this);
            }
        }

        private void HandleTabMouseMove(object sender, MouseEventArgs e)
        {
            if (_isMouseDown && !_isEditing && (e.Button & MouseButtons.Left) == MouseButtons.Left && _parentControl != null)
            {
                Point cur = Cursor.Position;
                int dx = Math.Abs(cur.X - _dragStartPos.X);
                int dy = Math.Abs(cur.Y - _dragStartPos.Y);

                if (dx > 5 || dy > 5)
                {
                    _isMouseDown = false;
                    _dragStartPos = Point.Empty;
                    _parentControl.StartTabDrag(this);
                }
            }
        }

        private void HandleTabMouseUp(object sender, MouseEventArgs e)
        {
            if (_isMouseDown)
            {
                _isMouseDown = false;
                _dragStartPos = Point.Empty;
            }
        }

        public void ResetDragState()
        {
            _isMouseDown = false;
            _dragStartPos = Point.Empty;
        }

        public void StartRename()
        {
            if (_isEditing || _isPinned) return;
            _isEditing = true;

            txtEdit.Location = new Point(lblTitle.Left, 2);
            txtEdit.Size = new Size(Math.Max(60, lblTitle.Width + 10), 20);
            txtEdit.Text = _title;
            txtEdit.BackColor = _theme.BgPrimary;
            txtEdit.ForeColor = _theme.TextPrimary;
            txtEdit.Visible = true;
            txtEdit.BringToFront();
            txtEdit.SelectAll();
            txtEdit.Focus();
        }

        private void CommitRename()
        {
            if (!_isEditing) return;
            _isEditing = false;
            txtEdit.Visible = false;

            string newTitle = txtEdit.Text.Trim();
            if (!string.IsNullOrEmpty(newTitle) && newTitle != _title)
            {
                _title = newTitle;
                lblTitle.Text = _isRunning ? "🟢 " + _title : _title;
                AdjustSize();
                if (OnRenamed != null) OnRenamed(this, _title);
            }
        }

        private void CancelRename()
        {
            if (!_isEditing) return;
            _isEditing = false;
            txtEdit.Visible = false;
        }

        private void AdjustSize()
        {
            string displayTitle = _title;
            int textW = TextRenderer.MeasureText(displayTitle, lblTitle.Font).Width;
            bool showClose = _canClose && !_isRunning && !_isPinned;
            int totalW = 8 + textW + (showClose ? 20 : 8);
            totalW = Math.Max(50, Math.Min(180, totalW));

            this.Width = totalW;
            lblTitle.Location = new Point(6, 4);
            lblTitle.MaximumSize = new Size(totalW - (showClose ? 24 : 12), 18);
            if (showClose)
            {
                btnClose.Location = new Point(totalW - 18, 3);
            }
            UpdateRegion();
        }

        private void UpdateRegion()
        {
            if (this.Width <= 0 || this.Height <= 0) return;
            Rectangle rect = new Rectangle(0, 0, this.Width, this.Height);
            using (GraphicsPath path = RoundedPanel.GetTopRoundedRectangle(rect, _theme != null ? _theme.RadiusMd : 6))
            {
                this.Region = new Region(path);
            }
            this.Invalidate();
        }

        private void UpdateAppearance()
        {
            if (_isActive)
            {
                this.BackColor = _theme.AccentPrimary;
                lblTitle.ForeColor = Color.White;
                btnClose.ForeColor = _theme.TextSecondary;
            }
            else
            {
                this.BackColor = _theme.BgElevated;
                lblTitle.ForeColor = _isRunning ? Color.FromArgb(100, 255, 140) : _theme.TextSecondary;
                btnClose.ForeColor = _theme.TextTertiary;
            }
            this.Invalidate();
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            UpdateAppearance();
            UpdateRegion();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Draw top-rounded tab background
            Rectangle rect = new Rectangle(0, 0, this.Width, this.Height);
            using (GraphicsPath path = RoundedPanel.GetTopRoundedRectangle(rect, _theme != null ? _theme.RadiusMd : 6))
            using (SolidBrush brush = new SolidBrush(this.BackColor))
            {
                g.FillPath(brush, path);
            }

            if (_isRunning)
            {
                Rectangle borderRect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
                using (GraphicsPath borderPath = RoundedPanel.GetTopRoundedRectangle(borderRect, _theme != null ? _theme.RadiusMd : 6))
                using (Pen pen = new Pen(Color.FromArgb(46, 204, 113), 2f))
                {
                    pen.Alignment = PenAlignment.Inset;
                    g.DrawPath(pen, borderPath);
                }
            }
        }
    }

    public class ProfileTabControl : Panel
    {
        private List<ProfileTabItem> _tabItems = new List<ProfileTabItem>();
        private FlowLayoutPanel pnlTabList;
        private RoundedButton btnAddTab;
        private int _activeIndex = 0;
        private ThemeTokens _theme;
        private TabDragMessageFilter _dragFilter = null;

        public int ActiveIndex { get { return _activeIndex; } }
        public int TabCount { get { return _tabItems.Count; } }

        public event Action<int> OnActiveTabChanged;
        public event Action<int, string> OnTabRenamed;
        public event Action<int> OnTabClosed;
        public event Action<int> OnTabDuplicated;
        public event Action<int, int> OnTabReordered;
        public event Action OnAddTabRequested;

        public ProfileTabControl()
        {
            _theme = ThemeTokens.DarkTheme();
            this.Height = 28;
            this.DoubleBuffered = true;

            InitializeLayout();
        }

        private void InitializeLayout()
        {
            this.AutoScroll = false;
            this.MouseWheel += HandleMouseWheel;

            pnlTabList = new FlowLayoutPanel
            {
                Location = new Point(0, 0),
                Height = 28,
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                WrapContents = false,
                Margin = new Padding(0),
                Padding = new Padding(0)
            };
            pnlTabList.MouseWheel += HandleMouseWheel;

            btnAddTab = new RoundedButton
            {
                Text = "＋",
                Size = new Size(26, 24),
                Location = new Point(0, 2),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                BorderRadius = _theme.RadiusSm,
                NormalColor = _theme.BgElevated,
                ForeColor = _theme.TextPrimary,
                HoverColor = _theme.AccentPrimary,
                Margin = new Padding(0, 0, 0, 0)
            };
            btnAddTab.Click += (s, e) =>
            {
                if (OnAddTabRequested != null) OnAddTabRequested();
            };
            btnAddTab.MouseWheel += HandleMouseWheel;

            this.Controls.Add(pnlTabList);
        }

        private void HookTabMouseWheel(Control c)
        {
            if (c == null) return;
            c.MouseWheel -= HandleMouseWheel;
            c.MouseWheel += HandleMouseWheel;
            foreach (Control child in c.Controls)
            {
                HookTabMouseWheel(child);
            }
        }

        private void HandleMouseWheel(object sender, MouseEventArgs e)
        {
            int maxScroll = Math.Max(0, pnlTabList.Width - this.Width);
            if (maxScroll <= 0)
            {
                if (pnlTabList.Left != 0) pnlTabList.Left = 0;
                return;
            }

            int step = (e.Delta > 0 ? -50 : 50);
            int currentOffset = -pnlTabList.Left;
            int targetOffset = Math.Max(0, Math.Min(maxScroll, currentOffset + step));
            pnlTabList.Left = -targetOffset;
        }

        public void EnsureTabVisible(int index)
        {
            if (index < 0 || index >= _tabItems.Count) return;
            ProfileTabItem tab = _tabItems[index];

            int maxScroll = Math.Max(0, pnlTabList.Width - this.Width);
            if (maxScroll <= 0)
            {
                pnlTabList.Left = 0;
                return;
            }

            int tabLeft = tab.Left + pnlTabList.Left;
            int tabRight = tabLeft + tab.Width;

            if (tabLeft < 0)
            {
                int newLeft = -tab.Left;
                pnlTabList.Left = Math.Max(-maxScroll, Math.Min(0, newLeft));
            }
            else if (tabRight > this.Width)
            {
                int newLeft = this.Width - (tab.Left + tab.Width + 4);
                pnlTabList.Left = Math.Max(-maxScroll, Math.Min(0, newLeft));
            }
        }

        public int GetTabIndex(ProfileTabItem tab)
        {
            return _tabItems.IndexOf(tab);
        }

        public void StartTabDrag(ProfileTabItem tab)
        {
            if (_tabItems.Count <= 1) return;
            if (_dragFilter != null)
            {
                Application.RemoveMessageFilter(_dragFilter);
                _dragFilter = null;
            }
            _dragFilter = new TabDragMessageFilter(this, tab);
            Application.AddMessageFilter(_dragFilter);
        }

        public void UpdateTabDragPosition(ProfileTabItem tab, Point screenPos)
        {
            Point pnlPt = pnlTabList.PointToClient(screenPos);
            int curIdx = _tabItems.IndexOf(tab);
            if (curIdx < 0) return;

            for (int i = 0; i < _tabItems.Count; i++)
            {
                if (i == curIdx) continue;
                ProfileTabItem other = _tabItems[i];
                Rectangle bounds = other.Bounds;
                int midX = bounds.Left + bounds.Width / 2;

                if (i < curIdx && pnlPt.X < midX)
                {
                    SwapTabs(curIdx, i);
                    break;
                }
                else if (i > curIdx && pnlPt.X > midX)
                {
                    SwapTabs(curIdx, i);
                    break;
                }
            }
        }

        private void SwapTabs(int idxA, int idxB)
        {
            if (idxA < 0 || idxA >= _tabItems.Count || idxB < 0 || idxB >= _tabItems.Count || idxA == idxB) return;

            ProfileTabItem item = _tabItems[idxA];
            _tabItems.RemoveAt(idxA);
            _tabItems.Insert(idxB, item);

            pnlTabList.SuspendLayout();
            for (int i = 0; i < _tabItems.Count; i++)
            {
                _tabItems[i].Index = i;
                pnlTabList.Controls.SetChildIndex(_tabItems[i], i);
            }
            pnlTabList.Controls.SetChildIndex(btnAddTab, _tabItems.Count);
            pnlTabList.ResumeLayout();
        }

        public void FinishTabDrag(ProfileTabItem tab, int fromIndex, bool wasDragging)
        {
            _dragFilter = null;
            foreach (ProfileTabItem t in _tabItems)
            {
                t.ResetDragState();
            }

            if (wasDragging)
            {
                int toIndex = _tabItems.IndexOf(tab);
                if (fromIndex >= 0 && toIndex >= 0 && fromIndex != toIndex)
                {
                    if (OnTabReordered != null)
                    {
                        OnTabReordered(fromIndex, toIndex);
                    }
                }
            }
            else
            {
                Tab_OnSelected(tab);
            }
        }

        public void SelectTab(ProfileTabItem tab)
        {
            Tab_OnSelected(tab);
        }

        public void CancelTabDrag()
        {
            _dragFilter = null;
            foreach (ProfileTabItem t in _tabItems)
            {
                t.ResetDragState();
            }
        }

        public void LoadTabs(List<string> scriptNames, int activeIndex = 0)
        {
            pnlTabList.SuspendLayout();
            pnlTabList.Controls.Clear();
            _tabItems.Clear();

            if (scriptNames == null || scriptNames.Count == 0)
            {
                scriptNames = new List<string> { "Script 1" };
            }

            _activeIndex = Math.Max(0, Math.Min(scriptNames.Count - 1, activeIndex));

            for (int i = 0; i < scriptNames.Count; i++)
            {
                bool canClose = true;

                ProfileTabItem tab = new ProfileTabItem(
                    scriptNames[i],
                    i,
                    i == _activeIndex,
                    canClose,
                    _theme
                );

                tab.ParentTabControl = this;
                tab.OnClosed += Tab_OnClosed;
                tab.OnRenamed += Tab_OnRenamed;
                tab.OnDuplicated += Tab_OnDuplicated;

                _tabItems.Add(tab);
                pnlTabList.Controls.Add(tab);
            }

            pnlTabList.Controls.Add(btnAddTab);
            pnlTabList.ResumeLayout();

            HookTabMouseWheel(this);
            EnsureTabVisible(_activeIndex);
        }

        private void Tab_OnSelected(ProfileTabItem selectedTab)
        {
            int idx = _tabItems.IndexOf(selectedTab);
            if (idx >= 0 && idx != _activeIndex)
            {
                SetActiveIndex(idx);
                if (OnActiveTabChanged != null) OnActiveTabChanged(_activeIndex);
            }
        }

        private void Tab_OnClosed(ProfileTabItem tab)
        {
            int idx = _tabItems.IndexOf(tab);
            if (idx >= 0)
            {
                if (OnTabClosed != null) OnTabClosed(idx);
            }
        }

        private void Tab_OnRenamed(ProfileTabItem tab, string newTitle)
        {
            int idx = _tabItems.IndexOf(tab);
            if (idx >= 0)
            {
                if (OnTabRenamed != null) OnTabRenamed(idx, newTitle);
            }
        }

        private void Tab_OnDuplicated(ProfileTabItem tab)
        {
            int idx = _tabItems.IndexOf(tab);
            if (idx >= 0)
            {
                if (OnTabDuplicated != null) OnTabDuplicated(idx);
            }
        }

        public void SetActiveIndex(int index)
        {
            if (index < 0 || index >= _tabItems.Count) return;
            _activeIndex = index;

            for (int i = 0; i < _tabItems.Count; i++)
            {
                _tabItems[i].IsActive = (i == _activeIndex);
            }
            EnsureTabVisible(_activeIndex);
        }

        public void SetTabRunning(int index, bool isRunning)
        {
            if (index >= 0 && index < _tabItems.Count)
            {
                _tabItems[index].IsRunning = isRunning;
            }
        }

        public void SetTabRunningByTitle(string title, bool isRunning)
        {
            foreach (var tab in _tabItems)
            {
                if (string.Equals(tab.Title, title, StringComparison.OrdinalIgnoreCase))
                {
                    tab.IsRunning = isRunning;
                }
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            btnAddTab.NormalColor = t.BgElevated;
            btnAddTab.ForeColor = t.TextPrimary;
            btnAddTab.HoverColor = t.AccentPrimary;
            btnAddTab.BorderRadius = t.RadiusSm;
            btnAddTab.Invalidate();

            foreach (ProfileTabItem item in _tabItems)
            {
                item.ApplyTheme(t);
            }
        }
    }
}
