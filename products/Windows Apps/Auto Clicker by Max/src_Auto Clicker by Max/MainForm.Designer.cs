using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker
{
    public partial class MainForm
    {
        // Panels
        private RoundedPanel pnlGlobalSettings, pnlTime, pnlSimpleTarget, pnlList;
        private SimpleHotkeyCard cardSimpleHotkey;
        private ModernAutoClicker.Advanced.AdvancedHotkeyCard cardAdvancedHotkey;
        private ModernAutoClicker.Advanced.AdvancedTabPanel pnlTabAdvanced;
        private ModernAutoClicker.Info.InfoTabPanel pnlTabInfo;
        private Panel pnlTabBasic, pnlContentHost, pnlBottomBar;
        private DoubleBufferedTableLayoutPanel tblRoot;
        private CustomTitleBar titleBar;

        // Global Controls (Top Bar)
        private CheckBox chkAlwaysOnTop, chkShowMap, chkFreeMouse, chkSmoothMove;
        private RoundedButton btnMapOpacity;
        private RoundedButton btnTransformTool;

        // Tab Navigation
        private ModeTabBar tabBar;
        // Simple keeps a fixed width; Asian takes the rest of the frame
        private const int SimpleModeTabW = 147;
        private const int RunBarIconW = 44;
        // Height of the Simple tab content: the Click Mode and Target cards (160) above the Click Settings card (128)
        private const int SimpleContentHeight = 288;

        // Collapsible bottom settings card: header row + body (checkboxes and hotkey card)
        private Label lblSettingsHeader;
        private Panel pnlSettingsBody;
        private bool _settingsCollapsed = false;
        private const int SettingsHeaderH = 22;
        private const int SettingsBodyTop = 16; // body overlaps the header's bottom padding; its controls already have a 7px top inset
        private const int SettingsBodyH = 86;
        private const int SettingsCollapsedH = 26;
        // Fixed Asian chrome height (title, mode bar, status, run bar, margins) without the settings card
        private const int AsianChromeBaseH = 186;
        // "Running: ..." row under the settings card (label 16px + 4px margin), present only while a task runs
        private const int RunningRowH = 20;
        private Label lblRunningTasks;
        private bool _runningRowShown = false;

        private int SettingsCardHeight
        {
            get { return _settingsCollapsed ? SettingsCollapsedH : SettingsBodyTop + SettingsBodyH; }
        }

        private int RunningRowHeight
        {
            get { return _runningRowShown ? RunningRowH : 0; }
        }

        // Height the settings card gives up when folded
        private const int SettingsFoldDelta = SettingsBodyTop + SettingsBodyH - SettingsCollapsedH;

        // Asian window minimum height: folding the settings card lowers it by the same amount the card shrinks
        private int AsianMinHeight
        {
            get { return _settingsCollapsed ? 760 - SettingsFoldDelta : 760; }
        }

        private void LayoutSettingsCardChrome(int targetW)
        {
            if (lblSettingsHeader != null) lblSettingsHeader.Size = new Size(targetW - 20, SettingsHeaderH - 4);
            if (pnlSettingsBody != null) pnlSettingsBody.Size = new Size(targetW - 2, SettingsBodyH);
        }

        private void ToggleSettingsCollapse()
        {
            _settingsCollapsed = !_settingsCollapsed;
            ApplySettingsCollapse();
            if (_currentTabIndex == 2 && this.WindowState == FormWindowState.Normal)
            {
                // Like Simple, the window itself shrinks/grows by the card's height; the step table keeps its size
                int newH = this.ClientSize.Height + (_settingsCollapsed ? -SettingsFoldDelta : SettingsFoldDelta);
                if (_settingsCollapsed) this.MinimumSize = new Size(700, AsianMinHeight);
                this.ClientSize = new Size(this.ClientSize.Width, Math.Max(AsianMinHeight, newH));
                if (!_settingsCollapsed) this.MinimumSize = new Size(700, AsianMinHeight);
                ApplyAsianDynamicLayout(this.ClientSize.Width, this.ClientSize.Height);
            }
            SaveSettings();
        }

        // Simple shrinks/grows with the card (the form auto-sizes); Asian keeps its window size
        private void ApplySettingsCollapse()
        {
            if (pnlGlobalSettings == null) return;
            pnlSettingsBody.Visible = !_settingsCollapsed;
            pnlGlobalSettings.Size = new Size(pnlGlobalSettings.Width, SettingsCardHeight);
            UpdateSettingsHeader();
        }

        private void UpdateSettingsHeader()
        {
            if (lblSettingsHeader == null) return;
            string title = (_settingsCollapsed ? "▸ " : "▾ ") + Loc.SettingsHeader;
            if (_settingsCollapsed)
            {
                System.Collections.Generic.List<string> on = new System.Collections.Generic.List<string>();
                if (chkFreeMouse != null && chkFreeMouse.Checked) on.Add(chkFreeMouse.Text);
                if (chkShowMap != null && chkShowMap.Checked) on.Add(chkShowMap.Text + " " + _mapOverlayOpacity + "%");
                if (chkSmoothMove != null && chkSmoothMove.Checked) on.Add(chkSmoothMove.Text);
                if (chkAlwaysOnTop != null && chkAlwaysOnTop.Checked) on.Add(chkAlwaysOnTop.Text);
                if (on.Count > 0) title += "   ·   " + string.Join(" · ", on.ToArray());
            }
            lblSettingsHeader.Text = title;
        }
        private int _currentTabIndex = 1;
        private bool _isBasicTab = true;

        // Target Window Controls (Tab Simple)
        private Label lblHeaderSimpleTarget;
        private ModernDropdownButton btnSimpleTargetWindow;

        // Time / Click Setting Controls (Tab Simple)
        private Label lblHeaderTime, lblInterval, lblSimpleLoop, lblSimpleLoopHint, lblSimpleJitter, lblSimpleJitterUnit;
        private NumberInput numSimpleLoop, numSimpleJitter;
        private DurationInput numInterval;
        private ModernDropdown cboIntervalUnit;

        // Click Mode Controls (Tab Simple)
        private RoundedPanel pnlClickMode;
        private Label lblHeaderClickMode;
        private RadioButton radModePoints, radModeCursor;

        // X-Y List Controls & Cursor Guide
        private Label lblHeaderList;
        private PointListControl lstPoints;
        private RoundedButton btnClearList, btnSaveList, btnLoadList;
        private ModernAutoClicker.Simple.CursorModeGuideCard cardCursorGuide;

        // Bottom Action Controls
        private Label lblMainStatusInfo;
        private IconTextButton btnStart;
        private RoundedButton btnStopAll;

        // Simple Mode Profiles (Tabs 1 to 5)
        private Panel pnlSimpleTabs;
        private RoundedButton[] btnSimpleTabs = new RoundedButton[AppSettings.SimpleTabCount];
        private int _simpleTabIndex = 0;

        private void InitializeComponent()
        {
            this.Text = AppInfo.Title;
            this.Icon = AppLogo.GetAppIcon();
            this.AutoSize = true;
            this.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Font = ThemeTokens.FontBase(FontStyle.Regular);
            this.FormBorderStyle = FormBorderStyle.None;
            this.MaximizeBox = false;

            // ==========================================
            // 1. ROOT CONTAINER (Auto-sizing layout)
            // ==========================================
            tblRoot = new DoubleBufferedTableLayoutPanel
            {
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink,
                ColumnCount = 1,
                RowCount = 7,
                Padding = new Padding(12, 8, 12, 12),
                Margin = new Padding(0)
            };
            tblRoot.Paint += (s, e) =>
            {
                if (_currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.VFX != null && pnlTabAdvanced.VFX.IsActive)
                {
                    ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();
                    pnlTabAdvanced.VFX.RenderPanelBorder(e.Graphics, tblRoot.ClientRectangle, t.RadiusSm, false, this.BackColor);
                }
            };

            // ==========================================
            // 0. CUSTOM TITLE BAR (Window Controls & Drag)
            // ==========================================
            titleBar = new CustomTitleBar
            {
                Size = new Size(388, 32),
                Margin = new Padding(0, 0, 0, 8)
            };
            titleBar.OnCloseRequested += () =>
            {
                if (IsAnyRunning) return;
                this.Close();
            };
            titleBar.OnMinimizeRequested += () => this.WindowState = FormWindowState.Minimized;

            tblRoot.Controls.Add(titleBar, 0, 0);

            // ==========================================
            // 2. MODERN TAB BAR
            // ==========================================
            tabBar = new ModeTabBar
            {
                Size = new Size(388, 36),
                Margin = new Padding(0, 0, 0, 8)
            };
            tabBar.SetTabs(Loc.TabSimple, Loc.TabAsianMode);
            tabBar.SetTabFixedWidth(1, SimpleModeTabW);
            tabBar.OnTabSelected += SwitchTab;

            MaxApp.Common.RoundedButton btnTabAdvanced = tabBar.GetTabButton(2);
            btnTabAdvanced.Paint += (s, e) =>
            {
                if (_currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.VFX != null && pnlTabAdvanced.VFX.IsActive)
                {
                    pnlTabAdvanced.VFX.RenderTabButton(e.Graphics, btnTabAdvanced.ClientRectangle, btnTabAdvanced.BorderRadius, btnTabAdvanced.Text, btnTabAdvanced.Font, true, currentTheme ?? ThemeTokens.DarkTheme());
                }
            };

            tblRoot.Controls.Add(tabBar, 0, 1);

            // ==========================================
            // 3. MAIN CONTENT HOST CONTAINER
            // ==========================================
            pnlContentHost = new Panel
            {
                Size = new Size(388, SimpleContentHeight),
                Margin = new Padding(0, 0, 0, 6)
            };

            // 3.0 Info Tab Panel (388 x 532)
            pnlTabInfo = new ModernAutoClicker.Info.InfoTabPanel
            {
                Location = new Point(0, 0),
                Size = new Size(388, 532),
                Margin = new Padding(0),
                Visible = false
            };

            // 3.1 Basic Tab Panel (196px Left Column + 8px Gap + 184px Right Column = 388px)
            pnlTabBasic = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(388, SimpleContentHeight),
                Margin = new Padding(0)
            };

            // 0. Simple Profiles Tab Bar (Top row, spans into the empty space above the point list)
            int tabBtnW = 36;
            int tabGap = 4;
            pnlSimpleTabs = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(AppSettings.SimpleTabCount * (tabBtnW + tabGap) - tabGap, 26),
                Margin = new Padding(0)
            };

            for (int i = 0; i < AppSettings.SimpleTabCount; i++)
            {
                int tabIdx = i;
                btnSimpleTabs[i] = new RoundedButton
                {
                    Text = (i + 1).ToString(),
                    Location = new Point(i * (tabBtnW + tabGap), 0),
                    Size = new Size(tabBtnW, 26),
                    BorderRadius = currentTheme.RadiusSm,
                    Font = ThemeTokens.FontBase(FontStyle.Regular),
                    NormalColor = (i == _simpleTabIndex) ? currentTheme.AccentPrimary : currentTheme.BgElevated,
                    ForeColor = (i == _simpleTabIndex) ? Color.White : currentTheme.TextSecondary
                };
                btnSimpleTabs[i].Click += (s, e) => SwitchSimpleTab(tabIdx);
                pnlSimpleTabs.Controls.Add(btnSimpleTabs[i]);
            }

            // 1. Click Mode Card (Mid-Left: 196 x 56)
            pnlClickMode = CreateCard(196, 56);
            pnlClickMode.Location = new Point(0, 30);
            lblHeaderClickMode = CreateHeader("Click Mode");
            lblHeaderClickMode.Location = new Point(10, 5);
            pnlClickMode.Controls.Add(lblHeaderClickMode);

            radModePoints = new RadioButton { Text = "Point List", Checked = true, Location = new Point(10, 26), AutoSize = true, Font = ThemeTokens.FontBase(FontStyle.Regular) };
            radModeCursor = new RadioButton { Text = "Follow Cursor", Location = new Point(94, 26), AutoSize = true, Font = ThemeTokens.FontBase(FontStyle.Regular) };
            radModePoints.CheckedChanged += (s, e) => { if (radModePoints.Checked) SetSimpleClickMode(0); };
            radModeCursor.CheckedChanged += (s, e) => { if (radModeCursor.Checked) SetSimpleClickMode(1); };

            pnlClickMode.Controls.AddRange(new Control[] { radModePoints, radModeCursor });

            // 2. Target Window Card (Mid-Left: 196 x 66)
            pnlSimpleTarget = CreateCard(196, 66);
            pnlSimpleTarget.Location = new Point(0, 90);
            lblHeaderSimpleTarget = CreateHeader("Target Window");
            lblHeaderSimpleTarget.Location = new Point(10, 5);
            pnlSimpleTarget.Controls.Add(lblHeaderSimpleTarget);

            btnSimpleTargetWindow = new ModernDropdownButton
            {
                Location = new Point(10, 26),
                Size = new Size(176, 32),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            btnSimpleTargetWindow.Click += (s, e) => ShowSimpleTargetWindowMenu();
            pnlSimpleTarget.Controls.Add(btnSimpleTargetWindow);

            // 3. Time / Click Setting Card (Btm-Left: 196 x 128)
            pnlTime = CreateCard(196, SimpleContentHeight - 160);
            pnlTime.Location = new Point(0, 160);
            lblHeaderTime = CreateHeader("Click Settings");
            lblHeaderTime.Location = new Point(10, 6);
            pnlTime.Controls.Add(lblHeaderTime);

            int tY = 26;
            lblInterval = CreateLabel("Click Every:", 10, tY + 2);
            // Interval is stored in ms; the unit dropdown only changes how it is shown and typed (ms / s / mm:ss)
            numInterval = new DurationInput
            {
                Location = new Point(86, tY),
                Width = 50,
                MinimumMs = 1,
                ValueMs = 250
            };
            numInterval.ApplyTheme(currentTheme);
            numInterval.ValueChanged += () => { if (!_isLoadingProfile) UpdateTabStatus(_isBasicTab); };
            cboIntervalUnit = TimeUnitDropdown.Create(TimeUnit.Milliseconds);
            cboIntervalUnit.Location = new Point(140, tY);
            cboIntervalUnit.Size = new Size(46, numInterval.Height);
            cboIntervalUnit.ApplyTheme(currentTheme);
            cboIntervalUnit.SelectedIndexChanged += (s, e) =>
            {
                numInterval.Unit = cboIntervalUnit.SelectedIndex;
                if (!_isLoadingProfile) UpdateTabStatus(_isBasicTab);
            };

            tY += 28;
            lblSimpleLoop = CreateLabel("Loops:", 10, tY + 2);
            numSimpleLoop = CreateNumberInput(86, tY, 50, 0, 999999, 1, 0);
            numSimpleLoop.AllowEmpty = true;
            numSimpleLoop.TextChanged += (s, e) => SaveSettings();
            lblSimpleLoopHint = CreateLabel("(0 = ∞)", 140, tY + 2);

            tY += 28;
            lblSimpleJitter = CreateLabel("Jitter:", 10, tY + 2);
            numSimpleJitter = CreateNumberInput(86, tY, 50, 0, 999, 1, 0);
            numSimpleJitter.AllowEmpty = true;
            numSimpleJitter.TextChanged += (s, e) => { SyncOverlay(); SaveSettings(); };
            lblSimpleJitterUnit = CreateLabel("± px", 140, tY + 2);

            pnlTime.Controls.AddRange(new Control[] {
                lblInterval, numInterval, cboIntervalUnit,
                lblSimpleLoop, numSimpleLoop, lblSimpleLoopHint,
                lblSimpleJitter, numSimpleJitter, lblSimpleJitterUnit
            });

            // 4. Target List Card (Right: 184 x 258, lowered to Y = 30 to align with pnlClickMode)
            pnlList = CreateCard(184, SimpleContentHeight - 30);
            pnlList.Location = new Point(204, 30);
            lblHeaderList = CreateHeader("Target (0 Points)");
            lblHeaderList.Location = new Point(10, 8);
            pnlList.Controls.Add(lblHeaderList);

            // Icon-only list buttons (names in tooltips, see ApplyLanguage); icons are tinted in ApplyTheme
            btnClearList = new RoundedButton
            {
                Location = new Point(8, 28),
                Size = new Size(52, 22),
                BorderRadius = currentTheme.RadiusSm
            };
            btnClearList.Click += (s, e) => ClearPoints();

            btnSaveList = new RoundedButton
            {
                Location = new Point(64, 28),
                Size = new Size(52, 22),
                BorderRadius = currentTheme.RadiusSm
            };
            btnSaveList.Click += (s, e) => SavePointsToFile();

            btnLoadList = new RoundedButton
            {
                Location = new Point(120, 28),
                Size = new Size(54, 22),
                BorderRadius = currentTheme.RadiusSm
            };
            btnLoadList.Click += (s, e) => LoadPointsFromFile();

            // The list and the Follow Cursor card keep the card's 8px inset on every side
            lstPoints = new PointListControl
            {
                Location = new Point(8, 54),
                Size = new Size(168, pnlList.Height - 54 - 8)
            };
            lstPoints.OnPointListChanged += () =>
            {
                UpdatePointsHeader();
                SyncOverlay();
                SaveSettings();
                UpdateStartButtonState();
                if (!_isLoadingProfile) UpdateTabStatus(_isBasicTab);
                UpdateSimpleTabButtons();
            };
            lstPoints.OnSelectionChanged += (idx) => SyncOverlay();
            lstPoints.OnPickCoordinateRequested += (idx) => PickCoordinateForSimple(idx);

            cardCursorGuide = new ModernAutoClicker.Simple.CursorModeGuideCard(currentTheme);
            cardCursorGuide.Location = new Point(8, 28);
            cardCursorGuide.Size = new Size(168, pnlList.Height - 28 - 8);
            cardCursorGuide.Visible = false;

            pnlList.Controls.AddRange(new Control[] {
                lblHeaderList,
                btnClearList, btnSaveList, btnLoadList,
                lstPoints,
                cardCursorGuide
            });

            pnlTabBasic.Controls.AddRange(new Control[] { pnlSimpleTabs, pnlClickMode, pnlSimpleTarget, pnlTime, pnlList });

            // 3.2 Advanced Tab Panel
            pnlTabAdvanced = new ModernAutoClicker.Advanced.AdvancedTabPanel();
            pnlTabAdvanced.Location = new Point(0, 0);
            pnlTabAdvanced.Size = new Size(590, 484);
            pnlTabAdvanced.Visible = false;

            pnlContentHost.Controls.AddRange(new Control[] { pnlTabInfo, pnlTabBasic, pnlTabAdvanced });
            tblRoot.Controls.Add(pnlContentHost, 0, 2);

            // ==========================================
            // 4. ACTION BUTTONS BAR (Stop ALL, Start, Move & Scale, Theme)
            // ==========================================
            pnlBottomBar = new Panel
            {
                Size = new Size(388, 46),
                Margin = new Padding(0, 0, 0, 8)
            };

            btnStart = new IconTextButton
            {
                Text = "Start",
                Subtitle = "(F6)",
                Location = new Point(24, 0),
                Size = new Size(118, 44),
                BorderRadius = currentTheme.RadiusMd,
                Font = ThemeTokens.FontCard(FontStyle.Bold)
            };
            btnStart.Click += (s, e) => ToggleStartStop();

            btnStopAll = new RoundedButton
            {
                Text = "Stop ALL",
                Subtitle = "(F7)",
                Location = new Point(148, 0),
                Size = new Size(92, 44),
                BorderRadius = currentTheme.RadiusMd,
                Font = ThemeTokens.FontCard(FontStyle.Bold),
                NormalColor = currentTheme.Danger,
                HoverColor = currentTheme.CRed,
                ForeColor = Color.White,
                Enabled = false
            };
            btnStopAll.Click += (s, e) => StopAll();

            // Icon-only so it never wraps; the name lives in its tooltip (set in ApplyLanguage), the icon is tinted in ApplyTheme
            btnTransformTool = new RoundedButton
            {
                Location = new Point(344, 0),
                Size = new Size(RunBarIconW, 44),
                BorderRadius = currentTheme.RadiusMd,
                NormalColor = currentTheme.BgElevated,
                HoverColor = currentTheme.AccentPrimary,
                ForeColor = currentTheme.TextPrimary
            };
            btnTransformTool.Click += (s, e) => ToggleTransformTool();

            pnlBottomBar.Controls.AddRange(new Control[] { btnStart, btnStopAll, btnTransformTool });

            // ==========================================
            // 5. STATUS SUMMARY INFO BAR
            // ==========================================
            lblMainStatusInfo = new Label
            {
                Size = new Size(388, 16),
                Margin = new Padding(0, 2, 0, 4),
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft,
                Text = "Ready"
            };

            tblRoot.Controls.Add(lblMainStatusInfo, 0, 3);
            tblRoot.Controls.Add(pnlBottomBar, 0, 4);

            // ==========================================
            // 6. BOTTOM GLOBAL SETTINGS & HOTKEYS BAR
            // ==========================================
            pnlGlobalSettings = CreateCard(388, SettingsBodyTop + SettingsBodyH);
            pnlGlobalSettings.Margin = new Padding(0);

            // Clickable header row folds the card; when folded it lists the options that are on
            lblSettingsHeader = new Label
            {
                Location = new Point(10, 3),
                Size = new Size(368, SettingsHeaderH - 4),
                AutoSize = false,
                AutoEllipsis = true,
                UseMnemonic = false,
                TextAlign = ContentAlignment.MiddleLeft,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                ForeColor = currentTheme.TextSecondary,
                Cursor = Cursors.Hand
            };
            lblSettingsHeader.Click += (s, e) => ToggleSettingsCollapse();

            // Body keeps the original control positions; folding just hides it
            pnlSettingsBody = new Panel
            {
                Location = new Point(1, SettingsBodyTop),
                Size = new Size(386, SettingsBodyH),
                BackColor = currentTheme.BgSecondary
            };

            chkAlwaysOnTop = new CheckBox
            {
                Text = "Window on Top",
                Checked = false,
                Location = new Point(8, 7),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            chkAlwaysOnTop.CheckedChanged += (s, e) => { this.TopMost = chkAlwaysOnTop.Checked; UpdateSettingsHeader(); };

            chkShowMap = new CheckBox
            {
                Text = "Show Map",
                Checked = true,
                Location = new Point(8, 27),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            chkShowMap.CheckedChanged += (s, e) => { SyncOverlay(); UpdateSettingsHeader(); };

            btnMapOpacity = new RoundedButton
            {
                Text = "60% ▾",
                Location = new Point(90, 26),
                Size = new Size(48, 19),
                BorderRadius = 3,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                NormalColor = currentTheme.BgElevated,
                ForeColor = currentTheme.TextSecondary,
                HoverColor = currentTheme.AccentPrimary
            };

            chkFreeMouse = new CheckBox
            {
                Text = "Free Mouse Mode",
                Checked = true,
                Location = new Point(8, 47),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            chkFreeMouse.CheckedChanged += (s, e) => { UpdateTabStatus(_isBasicTab); UpdateSettingsHeader(); };

            chkSmoothMove = new CheckBox
            {
                Text = "Smooth Mouse Move",
                Checked = true,
                Location = new Point(8, 67),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            chkSmoothMove.CheckedChanged += (s, e) => UpdateSettingsHeader();

            // Hotkey Help Inset Cards (Independent CS Controls)
            cardSimpleHotkey = new SimpleHotkeyCard(currentTheme);
            cardSimpleHotkey.Location = new Point(152, 8);
            cardSimpleHotkey.Visible = true;

            cardAdvancedHotkey = new ModernAutoClicker.Advanced.AdvancedHotkeyCard(currentTheme);
            cardAdvancedHotkey.Location = new Point(170, 8);
            cardAdvancedHotkey.Visible = false;

            pnlSettingsBody.Controls.AddRange(new Control[] { chkAlwaysOnTop, chkShowMap, btnMapOpacity, chkFreeMouse, chkSmoothMove, cardSimpleHotkey, cardAdvancedHotkey });
            pnlGlobalSettings.Controls.AddRange(new Control[] { lblSettingsHeader, pnlSettingsBody });
            tblRoot.Controls.Add(pnlGlobalSettings, 0, 5);

            // ==========================================
            // 7. RUNNING TASKS ROW (only while a task runs)
            // ==========================================
            lblRunningTasks = new Label
            {
                Size = new Size(388, 16),
                Margin = new Padding(0, RunningRowH - 16, 0, 0),
                AutoSize = false,
                AutoEllipsis = true,
                UseMnemonic = false,
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft,
                Visible = false
            };
            tblRoot.Controls.Add(lblRunningTasks, 0, 6);

            this.Controls.Add(tblRoot);
        }

        public void ApplyAsianDynamicLayout(int clientW, int clientH)
        {
            if (_currentTabIndex != 2) return;

            int minW = 700;
            int minH = AsianMinHeight;
            int curW = Math.Max(minW, clientW);
            int curH = Math.Max(minH, clientH);

            int targetW = curW - 24;
            int targetContentH = curH - AsianChromeBaseH - SettingsCardHeight - RunningRowHeight;

            if (tblRoot != null)
            {
                tblRoot.SuspendLayout();
                if (tblRoot.Width != curW || tblRoot.Height != curH)
                {
                    tblRoot.Size = new Size(curW, curH);
                }
            }

            // 0. Title Bar
            if (titleBar != null && titleBar.Width != targetW) titleBar.Size = new Size(targetW, 32);

            // 1. Tab Bar
            if (tabBar != null && tabBar.Width != targetW) tabBar.Size = new Size(targetW, 36);

            // 2. Content Host & Advanced Tab Panel
            if (pnlContentHost != null && (pnlContentHost.Width != targetW || pnlContentHost.Height != targetContentH))
            {
                pnlContentHost.Size = new Size(targetW, targetContentH);
            }
            if (pnlTabAdvanced != null && (pnlTabAdvanced.Width != targetW || pnlTabAdvanced.Height != targetContentH))
            {
                pnlTabAdvanced.Size = new Size(targetW, targetContentH);
            }

            // 3. Status Info
            if (lblMainStatusInfo != null && lblMainStatusInfo.Width != targetW) lblMainStatusInfo.Size = new Size(targetW, 16);
            if (lblRunningTasks != null && lblRunningTasks.Width != targetW) lblRunningTasks.Size = new Size(targetW, 16);

            // 4. Bottom Action Bar
            if (pnlBottomBar != null)
            {
                if (pnlBottomBar.Width != targetW) pnlBottomBar.Size = new Size(targetW, 46);
                LayoutRunBar(targetW, true);
            }

            // 5. Global Settings & Hotkey Card
            if (pnlGlobalSettings != null)
            {
                if (pnlGlobalSettings.Width != targetW || pnlGlobalSettings.Height != SettingsCardHeight) pnlGlobalSettings.Size = new Size(targetW, SettingsCardHeight);
                LayoutSettingsCardChrome(targetW);
                if (cardAdvancedHotkey != null)
                {
                    int cardW = Math.Max(408, targetW - 170 - 12);
                    if (cardAdvancedHotkey.Width != cardW) cardAdvancedHotkey.Size = new Size(cardW, 74);
                }
            }

            if (tblRoot != null) tblRoot.ResumeLayout(true);
        }

        // Start is the one wide button; Stop ALL is narrower and Move & Scale is a small icon button.
        // Simple fills its 388px width; the wider Asian window keeps the group a fixed size and centred.
        private void LayoutRunBar(int targetW, bool isAdvanced)
        {
            if (btnStart == null || btnStopAll == null || btnTransformTool == null) return;
            int gap = 6;
            int stopW = isAdvanced ? 130 : 104;
            int startW = isAdvanced ? 260 : targetW - stopW - RunBarIconW - gap * 2;
            int startX = isAdvanced ? Math.Max(10, (targetW - (startW + stopW + RunBarIconW + gap * 2)) / 2) : 0;

            btnStart.Location = new Point(startX, 0);
            btnStart.Size = new Size(startW, 44);
            btnStopAll.Location = new Point(startX + startW + gap, 0);
            btnStopAll.Size = new Size(stopW, 44);
            btnTransformTool.Location = new Point(startX + startW + gap + stopW + gap, 0);
            btnTransformTool.Size = new Size(RunBarIconW, 44);
        }

        private void SwitchTab(int tabIndex)
        {
            if (_currentTabIndex == 2 && this.WindowState != FormWindowState.Minimized)
            {
                _savedAsianWidth = Math.Max(700, this.Width);
                _savedAsianHeight = Math.Max(AsianMinHeight, this.Height);
            }

            _currentTabIndex = tabIndex;
            _isBasicTab = (tabIndex == 1);
            UpdateRunningTasksRow(false);

            this.SuspendLayout();
            if (tblRoot != null) tblRoot.SuspendLayout();

            bool isAdvanced = (tabIndex == 2);
            if (tblRoot != null)
            {
                tblRoot.EnableBorderHitTestTransparent = isAdvanced;
            }

            if (!isAdvanced)
            {
                this.MinimumSize = Size.Empty;
                this.MaximumSize = Size.Empty;
                this.AutoSize = true;
                this.AutoSizeMode = AutoSizeMode.GrowAndShrink;
                if (tblRoot != null)
                {
                    tblRoot.AutoSize = true;
                    tblRoot.AutoSizeMode = AutoSizeMode.GrowAndShrink;
                }
            }
            else
            {
                this.AutoSize = false;
                if (tblRoot != null) tblRoot.AutoSize = false;
                this.MinimumSize = new Size(700, AsianMinHeight);
                this.MaximumSize = Size.Empty;
                int targetFormW = Math.Max(700, _savedAsianWidth);
                int targetFormH = Math.Max(AsianMinHeight, _savedAsianHeight);
                this.ClientSize = new Size(targetFormW, targetFormH);
            }

            int targetW = isAdvanced ? (this.ClientSize.Width - 24) : 388;
            int targetContentH = isAdvanced ? (this.ClientSize.Height - AsianChromeBaseH - SettingsCardHeight - RunningRowHeight) : (tabIndex == 0 ? 508 : SimpleContentHeight);

            // 0. Title Bar
            if (titleBar != null) titleBar.Size = new Size(targetW, 32);

            // 1. Tab Bar
            tabBar.Size = new Size(targetW, 36);
            tabBar.SelectedIndex = tabIndex;

            // 2. Content Host & Panels
            pnlContentHost.Size = new Size(targetW, targetContentH);
            pnlTabInfo.Visible = (tabIndex == 0);
            pnlTabBasic.Visible = (tabIndex == 1);
            pnlTabAdvanced.Visible = (tabIndex == 2);
            if (isAdvanced && pnlTabAdvanced != null)
            {
                pnlTabAdvanced.Size = new Size(targetW, targetContentH);
            }

            // 3. Status Info, Bottom Bar & Global Settings
            bool showControls = (tabIndex != 0);
            lblMainStatusInfo.Visible = showControls;
            pnlBottomBar.Visible = showControls;
            pnlGlobalSettings.Visible = showControls;

            lblMainStatusInfo.Size = new Size(targetW, 16);
            lblRunningTasks.Size = new Size(targetW, 16);

            // 4. Bottom Action Bar
            pnlBottomBar.Size = new Size(targetW, 46);
            LayoutRunBar(targetW, isAdvanced);

            // 5. Global Settings & Hotkey Card
            pnlGlobalSettings.Size = new Size(targetW, SettingsCardHeight);
            LayoutSettingsCardChrome(targetW);
            if (!isAdvanced)
            {
                chkAlwaysOnTop.Location = new Point(8, 7);
                chkShowMap.Location = new Point(8, 27);
                if (btnMapOpacity != null)
                {
                    btnMapOpacity.Location = new Point(90, 26);
                    btnMapOpacity.Size = new Size(48, 19);
                }
                chkFreeMouse.Location = new Point(8, 47);
                chkSmoothMove.Location = new Point(8, 67);

                if (cardSimpleHotkey != null)
                {
                    cardSimpleHotkey.Location = new Point(152, 8);
                    cardSimpleHotkey.Size = new Size(224, 74);
                    cardSimpleHotkey.Visible = (tabIndex == 1);
                }
                if (cardAdvancedHotkey != null)
                {
                    cardAdvancedHotkey.Visible = false;
                }
            }
            else
            {
                chkAlwaysOnTop.Location = new Point(14, 7);
                chkShowMap.Location = new Point(14, 27);
                if (btnMapOpacity != null)
                {
                    btnMapOpacity.Location = new Point(94, 26);
                    btnMapOpacity.Size = new Size(48, 19);
                }
                chkFreeMouse.Location = new Point(14, 47);
                chkSmoothMove.Location = new Point(14, 67);

                if (cardAdvancedHotkey != null)
                {
                    cardAdvancedHotkey.Location = new Point(170, 8);
                    cardAdvancedHotkey.Size = new Size(Math.Max(408, targetW - 170 - 12), 74);
                    cardAdvancedHotkey.Visible = true;
                }
                if (cardSimpleHotkey != null)
                {
                    cardSimpleHotkey.Visible = false;
                }
            }

            if (pnlTabAdvanced != null && pnlTabAdvanced.VFX != null)
            {
                if (tabIndex == 2)
                {
                    pnlTabAdvanced.VFX.Attach(this, tblRoot, tabBar.GetTabButton(2));
                    pnlTabAdvanced.VFX.Start();
                }
                else
                {
                    pnlTabAdvanced.VFX.Stop();
                }
                this.Invalidate();
                if (tblRoot != null) tblRoot.Invalidate();
            }

            if (tblRoot != null) tblRoot.ResumeLayout(true);
            this.ResumeLayout(true);

            UpdateFormRegion();
            SyncOverlay();
            UpdateTabStatus(_isBasicTab);
            UpdateStartButtonState();
        }

        private void UpdateTabStatus(bool isBasic)
        {
            if (lblMainStatusInfo == null) return;

            string runStats = GetTabRunStats();
            if (runStats != null)
            {
                ShowRunStats(runStats);
                return;
            }
            _statusShowsRunStats = false;

            if (_currentTabIndex == 0)
            {
                lblMainStatusInfo.Text = Loc.StatusInfoTab(AppInfo.AppName);
            }
            else if (_currentTabIndex == 1)
            {
                string modeStr = (chkFreeMouse != null && chkFreeMouse.Checked)
                    ? (Loc.ModeFreeMouse)
                    : (Loc.ModeFixedCoordinates);
                // Shown in the unit picked next to "Click Every", e.g. "250 ms", "1.5 s", "02:30 m"
                string interval = numInterval != null
                    ? TimeUnit.Format(numInterval.ValueMs, numInterval.Unit) + " " + TimeUnit.ShortName(numInterval.Unit)
                    : "100 ms";
                bool isCursor = (radModeCursor != null && radModeCursor.Checked);
                if (isCursor)
                {
                    lblMainStatusInfo.Text = Loc.StatusReadyFollowCursor(modeStr, interval);
                }
                else
                {
                    int ptsCount = (lstPoints != null) ? lstPoints.Count : 0;
                    lblMainStatusInfo.Text = Loc.StatusReadyPoints(modeStr, interval, ptsCount);
                }
            }
            else
            {
                if (pnlTabAdvanced != null)
                {
                    pnlTabAdvanced.UpdateStatus();
                }
            }
        }

        public void ApplyLanguage()
        {
            this.SuspendLayout();
            try
            {
                // Title bar
                if (titleBar != null) titleBar.ApplyLanguage();

                // Tabs
                if (tabBar != null) tabBar.SetTabs(Loc.TabSimple, Loc.TabAsianMode);

                // Click Mode Card
                if (lblHeaderClickMode != null) lblHeaderClickMode.Text = Loc.HeaderClickMode;
                if (radModePoints != null) radModePoints.Text = Loc.ModePointList;
                if (radModeCursor != null) radModeCursor.Text = Loc.ModeFollowCursor;

                // Target Window Card
                if (lblHeaderSimpleTarget != null) lblHeaderSimpleTarget.Text = Loc.HeaderTargetWindow;
                UpdateSimpleTargetWindowButtonDisplay();

                // Click Settings Card
                if (lblHeaderTime != null) lblHeaderTime.Text = Loc.HeaderClickSettings;
                if (lblInterval != null) lblInterval.Text = Loc.LabelClickEvery;
                TimeUnitDropdown.RefreshText(cboIntervalUnit);
                if (lblSimpleLoop != null) lblSimpleLoop.Text = Loc.LabelLoops;
                if (lblSimpleLoopHint != null) lblSimpleLoopHint.Text = Loc.LoopHintInfinite;
                if (lblSimpleJitter != null) lblSimpleJitter.Text = Loc.LabelJitter;
                if (lblSimpleJitterUnit != null) lblSimpleJitterUnit.Text = Loc.UnitJitterPx;

                // Target List Card
                UpdatePointsHeader();
                // List buttons are icon-only (the card is too narrow for icon + text); their names live in tooltips
                if (_startToolTip != null)
                {
                    if (btnClearList != null) _startToolTip.SetToolTip(btnClearList, Loc.BtnClear);
                    if (btnSaveList != null) _startToolTip.SetToolTip(btnSaveList, Loc.BtnSave);
                    if (btnLoadList != null) _startToolTip.SetToolTip(btnLoadList, Loc.BtnLoad);
                }

                // Action Buttons
                UpdateStartButtonState();
                if (btnStopAll != null) btnStopAll.Text = Loc.BtnStopAll;
                if (btnTransformTool != null && _startToolTip != null) _startToolTip.SetToolTip(btnTransformTool, Loc.BtnTransformToolTip);

                // Checkboxes
                if (chkAlwaysOnTop != null) chkAlwaysOnTop.Text = Loc.ChkAlwaysOnTop;
                if (chkShowMap != null) chkShowMap.Text = Loc.ChkShowMap;
                if (chkFreeMouse != null)
                {
                    chkFreeMouse.Text = Loc.ChkFreeMouse;
                    if (_startToolTip != null)
                    {
                        _startToolTip.SetToolTip(chkFreeMouse, Loc.ChkFreeMouseTooltip);
                    }
                }
                if (chkSmoothMove != null) chkSmoothMove.Text = Loc.ChkSmoothMove;
                UpdateSettingsHeader();

                // Advanced Tab & Info Tab
                if (pnlTabAdvanced != null) pnlTabAdvanced.ApplyLanguage();
                if (pnlTabInfo != null) pnlTabInfo.ApplyLanguage();

                // Status info
                UpdateRunningTasksRow(true);
                UpdateTabStatus(_isBasicTab);
            }
            finally
            {
                this.ResumeLayout();
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            currentTheme = t;
            ThemeTokens.Current = t;
            this.BackColor = t.BgPrimary;
            this.ForeColor = t.TextPrimary;

            if (titleBar != null)
            {
                titleBar.ApplyTheme(t);
            }

            // Cards
            RoundedPanel[] cards = new RoundedPanel[] { pnlGlobalSettings, pnlClickMode, pnlSimpleTarget, pnlTime, pnlList };
            foreach (RoundedPanel card in cards)
            {
                if (card != null)
                {
                    card.BackColor = t.BgSecondary;
                    card.BorderColor = t.BorderColor;
                    card.BorderRadius = t.RadiusMd;
                    card.Invalidate();
                }
            }
            if (pnlSettingsBody != null) pnlSettingsBody.BackColor = t.BgSecondary;
            if (lblSettingsHeader != null) lblSettingsHeader.ForeColor = t.TextSecondary;

            if (pnlTabInfo != null)
            {
                pnlTabInfo.ApplyTheme(t);
            }

            if (pnlTabAdvanced != null)
            {
                pnlTabAdvanced.ApplyTheme(t);
            }

            if (cardCursorGuide != null)
            {
                cardCursorGuide.ApplyTheme(t);
            }

            // Headers
            Label[] headers = new Label[] { lblHeaderClickMode, lblHeaderSimpleTarget, lblHeaderTime, lblHeaderList };
            foreach (Label h in headers)
            {
                if (h != null) h.ForeColor = t.AccentPrimary;
            }

            if (lblHeaderSimpleTarget != null && radModeCursor != null && radModeCursor.Checked)
            {
                lblHeaderSimpleTarget.ForeColor = t.TextSecondary;
            }

            if (btnSimpleTargetWindow != null)
            {
                btnSimpleTargetWindow.ApplyTheme(t);
                UpdateSimpleTargetWindowButtonDisplay();
            }

            // Sub labels
            Label[] subLabels = new Label[] { lblInterval, lblSimpleLoop, lblSimpleJitter };
            foreach (Label l in subLabels)
            {
                if (l != null) l.ForeColor = t.TextSecondary;
            }

            // Hint / Unit labels (TextTertiary)
            Label[] hintLabels = new Label[] { lblSimpleLoopHint, lblSimpleJitterUnit };
            foreach (Label hl in hintLabels)
            {
                if (hl != null) hl.ForeColor = t.TextTertiary;
            }

            // Radio & Checkbox
            if (radModePoints != null) radModePoints.ForeColor = t.TextPrimary;
            if (radModeCursor != null) radModeCursor.ForeColor = t.TextPrimary;
            chkAlwaysOnTop.ForeColor = t.TextSecondary;
            if (chkShowMap != null) chkShowMap.ForeColor = t.TextSecondary;
            if (btnMapOpacity != null)
            {
                btnMapOpacity.NormalColor = t.BgElevated;
                btnMapOpacity.ForeColor = t.TextSecondary;
                btnMapOpacity.HoverColor = t.AccentPrimary;
                btnMapOpacity.Invalidate();
            }
            if (chkFreeMouse != null) chkFreeMouse.ForeColor = t.TextSecondary;
            if (chkSmoothMove != null) chkSmoothMove.ForeColor = t.TextSecondary;

            // Inputs
            NumberInput[] nums = new NumberInput[] { numSimpleLoop, numSimpleJitter };
            foreach (NumberInput n in nums)
            {
                if (n != null) n.ApplyTheme(t);
            }
            if (numInterval != null) numInterval.ApplyTheme(t);
            if (cboIntervalUnit != null) cboIntervalUnit.ApplyTheme(t);

            lstPoints.ApplyTheme(t);

            // List Buttons
            Color btnBg = t.BgElevated;
            Color btnText = t.TextPrimary;

            btnClearList.NormalColor = btnBg;
            btnClearList.ForeColor = btnText;
            btnClearList.HoverColor = t.Danger;
            btnClearList.Invalidate();

            btnSaveList.NormalColor = btnBg;
            btnSaveList.ForeColor = btnText;
            btnSaveList.HoverColor = t.AccentSecondary;
            AppIcons.Set(btnSaveList, AppIcons.Save, btnText, ContentAlignment.MiddleCenter);

            btnLoadList.NormalColor = btnBg;
            btnLoadList.ForeColor = btnText;
            btnLoadList.HoverColor = t.AccentSecondary;
            AppIcons.Set(btnLoadList, AppIcons.Import, btnText, ContentAlignment.MiddleCenter);

            tabBar.ApplyTheme(t);

            // Hotkey help boxes
            if (cardSimpleHotkey != null) cardSimpleHotkey.ApplyTheme(t);
            if (cardAdvancedHotkey != null) cardAdvancedHotkey.ApplyTheme(t);

            // Bottom Buttons
            if (lblMainStatusInfo != null)
            {
                lblMainStatusInfo.ForeColor = t.TextSecondary;
            }
            if (lblRunningTasks != null) lblRunningTasks.ForeColor = t.Success;

            bool isRunning = IsActiveTabRunning;
            btnStart.NormalColor = isRunning ? t.Danger : t.AccentPrimary;
            btnStart.HoverColor = isRunning ? t.CRed : t.AccentPrimaryHover;
            btnStart.ForeColor = Color.White;
            btnStart.Invalidate();

            if (btnStopAll != null) btnStopAll.BorderRadius = t.RadiusMd;
            UpdateStopAllButtonLook();

            // Button Radius & Border styling
            btnClearList.BorderRadius = t.RadiusMd;
            btnSaveList.BorderRadius = t.RadiusMd;
            btnLoadList.BorderRadius = t.RadiusMd;
            btnStart.BorderRadius = t.RadiusMd;
            if (btnTransformTool != null)
            {
                btnTransformTool.NormalColor = t.BgElevated;
                btnTransformTool.HoverColor = t.AccentPrimary;
                btnTransformTool.ForeColor = t.TextPrimary;
                btnTransformTool.BorderRadius = t.RadiusMd;
                AppIcons.Set(btnTransformTool, AppIcons.MoveAndScale, t.TextPrimary, ContentAlignment.MiddleCenter);
            }
            if (btnSimpleTargetWindow != null) btnSimpleTargetWindow.ApplyTheme(t);

            UpdateSimpleTabButtons();
            SwitchTab(_currentTabIndex);

            SyncOverlay();
            this.Invalidate(true);
        }

        private RoundedPanel CreateCard(int w, int h)
        {
            return new RoundedPanel
            {
                Size = new Size(w, h),
                BackColor = currentTheme.BgSecondary,
                BorderColor = currentTheme.BorderColor,
                BorderRadius = currentTheme.RadiusMd,
                BorderSize = 1
            };
        }

        private Label CreateHeader(string title)
        {
            return new Label
            {
                Text = title,
                Location = new Point(14, 10),
                AutoSize = true,
                Font = ThemeTokens.FontCard(FontStyle.Bold),
                ForeColor = currentTheme.AccentPrimary
            };
        }

        private Label CreateLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.FontButton(FontStyle.Regular),
                ForeColor = currentTheme.TextSecondary
            };
        }

        private Label CreateValueLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.FontCard(FontStyle.Regular),
                ForeColor = currentTheme.TextPrimary
            };
        }

        private NumberInput CreateNumberInput(int x, int y, int w, int min, int max, int step, int val)
        {
            NumberInput ni = new NumberInput
            {
                Location = new Point(x, y),
                Width = w,
                Minimum = min,
                Maximum = max,
                Step = step,
                Value = val,
                // Inputs use regular weight; NumberInput (Common) defaults to bold
                Font = ThemeTokens.FontCard(FontStyle.Regular)
            };
            ni.ApplyTheme(currentTheme);
            return ni;
        }
    }
}
