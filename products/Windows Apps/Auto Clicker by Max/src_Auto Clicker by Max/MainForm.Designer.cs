using System;
using System.Drawing;
using System.Windows.Forms;

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
        private Panel pnlTabBar, pnlTabBasic, pnlContentHost, pnlBottomBar;
        private DoubleBufferedTableLayoutPanel tblRoot;
        private CustomTitleBar titleBar;

        // Global Controls (Top Bar)
        private CheckBox chkAlwaysOnTop, chkShowMap, chkFreeMouse, chkSmoothMove, chkHideRunningRing;
        private RoundedButton btnTransformTool;

        // Tab Navigation
        private RoundedButton btnTabInfo, btnTabBasic, btnTabAdvanced;
        private int _currentTabIndex = 1;
        private bool _isBasicTab = true;

        // Target Window Controls (Tab Simple)
        private Label lblHeaderSimpleTarget;
        private ModernDropdownButton btnSimpleTargetWindow;

        // Time / Click Setting Controls (Tab Simple)
        private Label lblHeaderTime, lblInterval, lblMs, lblSimpleLoop, lblSimpleLoopHint, lblSimpleJitter, lblSimpleJitterUnit;
        private NumberInput numInterval, numSimpleLoop, numSimpleJitter;
        private Label lblCurrentTimeTitle, lblCurrentTimeVal;
        private Label lblCurrentClicksTitle, lblCurrentClicksVal, lblClicksUnit2;

        // Click Mode Controls (Tab Simple)
        private RoundedPanel pnlClickMode;
        private Label lblHeaderClickMode;
        private RadioButton radModePoints, radModeCursor;
        private RoundedButton btnThemeToggle;

        // X-Y List Controls & Cursor Guide
        private Label lblHeaderList;
        private PointListControl lstPoints;
        private RoundedButton btnClearList, btnSaveList, btnLoadList;
        private ModernAutoClicker.Simple.CursorModeGuideCard cardCursorGuide;

        // Bottom Action Controls
        private Label lblMainStatusInfo;
        private RoundedButton btnStart;
        private RoundedButton btnStopAll;

        // Simple Mode Profiles (Tabs 1 to 5)
        private Panel pnlSimpleTabs;
        private RoundedButton[] btnSimpleTabs = new RoundedButton[5];
        private int _simpleTabIndex = 0;

        private void InitializeComponent()
        {
            this.Text = "Auto Clicker by Max v1.0";
            this.Icon = AppLogo.GetAppIcon();
            this.AutoSize = true;
            this.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
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
                RowCount = 6,
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
            // 2. TAB NAVIGATION BAR (3 Segmented Tabs: Info, Simple, Advanced)
            // ==========================================
            pnlTabBar = new Panel
            {
                Size = new Size(388, 36),
                Margin = new Padding(0, 0, 0, 8)
            };

            btnTabInfo = new RoundedButton
            {
                Text = "ℹ",
                Location = new Point(0, 0),
                Size = new Size(34, 34),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI Symbol", 10F, FontStyle.Bold),
                NormalColor = currentTheme.BgElevated,
                ForeColor = currentTheme.TextSecondary
            };
            btnTabInfo.Click += (s, e) => SwitchTab(0);

            btnTabBasic = new RoundedButton
            {
                Text = "Simple",
                Location = new Point(40, 0),
                Size = new Size(150, 34),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold)
            };
            btnTabBasic.Click += (s, e) => SwitchTab(1);

            btnTabAdvanced = new RoundedButton
            {
                Text = "Asian Mode",
                Location = new Point(196, 0),
                Size = new Size(192, 34),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold)
            };
            btnTabAdvanced.Click += (s, e) => SwitchTab(2);
            btnTabAdvanced.Paint += (s, e) =>
            {
                if (_currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.VFX != null && pnlTabAdvanced.VFX.IsActive)
                {
                    pnlTabAdvanced.VFX.RenderTabButton(e.Graphics, btnTabAdvanced.ClientRectangle, btnTabAdvanced.BorderRadius, btnTabAdvanced.Text, btnTabAdvanced.Font, true, currentTheme ?? ThemeTokens.DarkTheme());
                }
            };

            pnlTabBar.Controls.AddRange(new Control[] { btnTabInfo, btnTabBasic, btnTabAdvanced });
            tblRoot.Controls.Add(pnlTabBar, 0, 1);

            // ==========================================
            // 3. MAIN CONTENT HOST CONTAINER
            // ==========================================
            pnlContentHost = new Panel
            {
                Size = new Size(388, 342),
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
                Size = new Size(388, 342),
                Margin = new Padding(0)
            };

            // 0. Simple Profiles Tab Bar (Top-Left: 196 x 26)
            pnlSimpleTabs = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(196, 26),
                Margin = new Padding(0)
            };

            int tabBtnW = 36;
            int tabGap = 4;
            for (int i = 0; i < 5; i++)
            {
                int tabIdx = i;
                btnSimpleTabs[i] = new RoundedButton
                {
                    Text = (i + 1).ToString(),
                    Location = new Point(i * (tabBtnW + tabGap), 0),
                    Size = new Size(tabBtnW, 26),
                    BorderRadius = currentTheme.RadiusSm,
                    Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
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

            radModePoints = new RadioButton { Text = "Point List", Checked = true, Location = new Point(10, 26), AutoSize = true, Font = new Font("Segoe UI", 8.5F) };
            radModeCursor = new RadioButton { Text = "Follow Cursor", Location = new Point(94, 26), AutoSize = true, Font = new Font("Segoe UI", 8.5F) };
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
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            btnSimpleTargetWindow.Click += (s, e) => ShowSimpleTargetWindowMenu();
            pnlSimpleTarget.Controls.Add(btnSimpleTargetWindow);

            // 3. Time / Click Setting Card (Btm-Left: 196 x 182)
            pnlTime = CreateCard(196, 182);
            pnlTime.Location = new Point(0, 160);
            lblHeaderTime = CreateHeader("Click Settings");
            lblHeaderTime.Location = new Point(10, 6);
            pnlTime.Controls.Add(lblHeaderTime);

            int tY = 26;
            lblInterval = CreateLabel("Click Every:", 10, tY + 2);
            numInterval = CreateNumberInput(86, tY, 50, 1, 999999, 10, 250);
            numInterval.AllowEmpty = false;
            numInterval.TextChanged += (s, e) => { if (!_isLoadingProfile) UpdateTabStatus(_isBasicTab); };
            lblMs = CreateLabel("ms", 140, tY + 2);

            tY += 27;
            lblSimpleLoop = CreateLabel("Loops:", 10, tY + 2);
            numSimpleLoop = CreateNumberInput(86, tY, 50, 0, 999999, 1, 0);
            numSimpleLoop.AllowEmpty = true;
            numSimpleLoop.TextChanged += (s, e) => SaveSettings();
            lblSimpleLoopHint = CreateLabel("(0 = ∞)", 140, tY + 2);

            tY += 27;
            lblSimpleJitter = CreateLabel("Jitter:", 10, tY + 2);
            numSimpleJitter = CreateNumberInput(86, tY, 50, 0, 999, 1, 0);
            numSimpleJitter.AllowEmpty = true;
            numSimpleJitter.TextChanged += (s, e) => { SyncOverlay(); SaveSettings(); };
            lblSimpleJitterUnit = CreateLabel("± px", 140, tY + 2);

            tY += 31;
            lblCurrentClicksTitle = CreateLabel("Current:", 10, tY);
            lblCurrentClicksVal = CreateValueLabel("0", 86, tY - 1);
            lblClicksUnit2 = CreateLabel("Clicks", 140, tY);

            tY += 25;
            lblCurrentTimeTitle = CreateLabel("Current:", 10, tY);
            lblCurrentTimeVal = CreateValueLabel("00:00:00", 86, tY - 1);

            pnlTime.Controls.AddRange(new Control[] {
                lblInterval, numInterval, lblMs,
                lblSimpleLoop, numSimpleLoop, lblSimpleLoopHint,
                lblSimpleJitter, numSimpleJitter, lblSimpleJitterUnit,
                lblCurrentClicksTitle, lblCurrentClicksVal, lblClicksUnit2,
                lblCurrentTimeTitle, lblCurrentTimeVal
            });

            // 4. Target List Card (Right: 184 x 342)
            pnlList = CreateCard(184, 342);
            pnlList.Location = new Point(204, 0);
            lblHeaderList = CreateHeader("Target (0 Points)");
            lblHeaderList.Location = new Point(10, 8);
            pnlList.Controls.Add(lblHeaderList);

            btnClearList = new RoundedButton
            {
                Text = "Clear",
                Location = new Point(8, 28),
                Size = new Size(52, 22),
                BorderRadius = currentTheme.RadiusSm,
                Font = new Font("Segoe UI", 7.5F, FontStyle.Bold)
            };
            btnClearList.Click += (s, e) => ClearPoints();

            btnSaveList = new RoundedButton
            {
                Text = "Save",
                Location = new Point(64, 28),
                Size = new Size(52, 22),
                BorderRadius = currentTheme.RadiusSm,
                Font = new Font("Segoe UI", 7.5F, FontStyle.Bold)
            };
            btnSaveList.Click += (s, e) => SavePointsToFile();

            btnLoadList = new RoundedButton
            {
                Text = "Load",
                Location = new Point(120, 28),
                Size = new Size(54, 22),
                BorderRadius = currentTheme.RadiusSm,
                Font = new Font("Segoe UI", 7.5F, FontStyle.Bold)
            };
            btnLoadList.Click += (s, e) => LoadPointsFromFile();

            lstPoints = new PointListControl
            {
                Location = new Point(8, 54),
                Size = new Size(168, 280)
            };
            lstPoints.OnPointListChanged += () =>
            {
                UpdatePointsHeader();
                SyncOverlay();
                SaveSettings();
                UpdateStartButtonState();
                if (!_isLoadingProfile) UpdateTabStatus(_isBasicTab);
            };
            lstPoints.OnSelectionChanged += (idx) => SyncOverlay();
            lstPoints.OnPickCoordinateRequested += (idx) => PickCoordinateForSimple(idx);

            cardCursorGuide = new ModernAutoClicker.Simple.CursorModeGuideCard(currentTheme);
            cardCursorGuide.Location = new Point(8, 28);
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

            btnStart = new RoundedButton
            {
                Text = "Start",
                Subtitle = "(F6)",
                Location = new Point(24, 0),
                Size = new Size(118, 44),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI", 10.5F, FontStyle.Bold)
            };
            btnStart.Click += (s, e) => ToggleStartStop();

            btnStopAll = new RoundedButton
            {
                Text = "Stop ALL",
                Subtitle = "(F7)",
                Location = new Point(148, 0),
                Size = new Size(92, 44),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                NormalColor = currentTheme.Danger,
                HoverColor = currentTheme.CRed,
                ForeColor = Color.White
            };
            btnStopAll.Click += (s, e) => StopAll();

            btnTransformTool = new RoundedButton
            {
                Text = "Move &\nScale",
                Location = new Point(246, 0),
                Size = new Size(68, 44),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                NormalColor = currentTheme.BgElevated,
                HoverColor = currentTheme.AccentPrimary,
                ForeColor = currentTheme.TextPrimary
            };
            btnTransformTool.Click += (s, e) => ToggleTransformTool();

            btnThemeToggle = new RoundedButton
            {
                Text = "🔆",
                Location = new Point(320, 0),
                Size = new Size(44, 44),
                BorderRadius = currentTheme.RadiusMd,
                Font = new Font("Segoe UI Symbol", 13F, FontStyle.Regular)
            };
            btnThemeToggle.Click += (s, e) => ToggleTheme();

            pnlBottomBar.Controls.AddRange(new Control[] { btnStart, btnStopAll, btnTransformTool, btnThemeToggle });

            // ==========================================
            // 5. STATUS SUMMARY INFO BAR
            // ==========================================
            lblMainStatusInfo = new Label
            {
                Size = new Size(388, 16),
                Margin = new Padding(0, 2, 0, 4),
                Font = ThemeTokens.GetMonospaceFont(7.5F),
                TextAlign = ContentAlignment.MiddleLeft,
                Text = "Ready"
            };

            tblRoot.Controls.Add(lblMainStatusInfo, 0, 3);
            tblRoot.Controls.Add(pnlBottomBar, 0, 4);

            // ==========================================
            // 6. BOTTOM GLOBAL SETTINGS & HOTKEYS BAR
            // ==========================================
            pnlGlobalSettings = CreateCard(388, 114);
            pnlGlobalSettings.Margin = new Padding(0);

            chkAlwaysOnTop = new CheckBox
            {
                Text = "Window on Top",
                Checked = false,
                Location = new Point(8, 6),
                AutoSize = true
            };
            chkAlwaysOnTop.CheckedChanged += (s, e) => { this.TopMost = chkAlwaysOnTop.Checked; };

            chkShowMap = new CheckBox
            {
                Text = "Show Map Overlay",
                Checked = true,
                Location = new Point(8, 27),
                AutoSize = true
            };
            chkShowMap.CheckedChanged += (s, e) => { SyncOverlay(); };

            chkFreeMouse = new CheckBox
            {
                Text = "Free Mouse Mode",
                Checked = true,
                Location = new Point(8, 48),
                AutoSize = true
            };
            chkFreeMouse.CheckedChanged += (s, e) => UpdateTabStatus(_isBasicTab);

            chkSmoothMove = new CheckBox
            {
                Text = "Smooth Mouse Move",
                Checked = true,
                Location = new Point(8, 69),
                AutoSize = true
            };

            chkHideRunningRing = new CheckBox
            {
                Text = "Hide Running Ring",
                Checked = false,
                Location = new Point(8, 90),
                AutoSize = true
            };

            // Hotkey Help Inset Cards (Independent CS Controls)
            cardSimpleHotkey = new SimpleHotkeyCard(currentTheme);
            cardSimpleHotkey.Location = new Point(156, 22);
            cardSimpleHotkey.Visible = true;

            cardAdvancedHotkey = new ModernAutoClicker.Advanced.AdvancedHotkeyCard(currentTheme);
            cardAdvancedHotkey.Location = new Point(160, 22);
            cardAdvancedHotkey.Visible = false;

            pnlGlobalSettings.Controls.AddRange(new Control[] { chkAlwaysOnTop, chkShowMap, chkFreeMouse, chkSmoothMove, chkHideRunningRing, cardSimpleHotkey, cardAdvancedHotkey });
            tblRoot.Controls.Add(pnlGlobalSettings, 0, 5);

            this.Controls.Add(tblRoot);

            this.FormClosing += (s, e) =>
            {
                StopAll();
                UnregisterGlobalHotkeys();
                SaveSettings();
                if (overlayForm != null && !overlayForm.IsDisposed)
                {
                    overlayForm.Close();
                    overlayForm.Dispose();
                }
            };
        }

        private void SwitchTab(int tabIndex)
        {
            _currentTabIndex = tabIndex;
            _isBasicTab = (tabIndex == 1);

            this.SuspendLayout();
            if (tblRoot != null) tblRoot.SuspendLayout();

            bool isAdvanced = (tabIndex == 2);
            int targetW = isAdvanced ? 590 : 388;
            int targetContentH = isAdvanced ? 484 : (tabIndex == 0 ? 532 : 342);

            // 0. Title Bar
            if (titleBar != null) titleBar.Size = new Size(targetW, 32);

            // 1. Tab Bar
            pnlTabBar.Size = new Size(targetW, 36);
            if (!isAdvanced)
            {
                btnTabInfo.Location = new Point(0, 0);
                btnTabInfo.Size = new Size(34, 34);
                btnTabBasic.Location = new Point(40, 0);
                btnTabBasic.Size = new Size(150, 34);
                btnTabAdvanced.Location = new Point(196, 0);
                btnTabAdvanced.Size = new Size(192, 34);
            }
            else
            {
                btnTabInfo.Location = new Point(0, 0);
                btnTabInfo.Size = new Size(34, 34);
                btnTabBasic.Location = new Point(40, 0);
                btnTabBasic.Size = new Size(150, 34);
                btnTabAdvanced.Location = new Point(196, 0);
                btnTabAdvanced.Size = new Size(394, 34);
            }

            // 2. Content Host & Panels
            pnlContentHost.Size = new Size(targetW, targetContentH);
            pnlTabInfo.Visible = (tabIndex == 0);
            pnlTabBasic.Visible = (tabIndex == 1);
            pnlTabAdvanced.Visible = (tabIndex == 2);

            // 3. Status Info, Bottom Bar & Global Settings
            bool showControls = (tabIndex != 0);
            lblMainStatusInfo.Visible = showControls;
            pnlBottomBar.Visible = showControls;
            pnlGlobalSettings.Visible = showControls;

            lblMainStatusInfo.Size = new Size(targetW, 16);

            // 4. Bottom Action Bar
            pnlBottomBar.Size = new Size(targetW, 46);
            if (!isAdvanced)
            {
                btnStart.Location = new Point(24, 0);
                btnStart.Size = new Size(118, 44);
                if (btnStopAll != null) { btnStopAll.Location = new Point(148, 0); btnStopAll.Size = new Size(92, 44); }
                btnTransformTool.Location = new Point(246, 0);
                btnTransformTool.Size = new Size(68, 44);
                btnThemeToggle.Location = new Point(320, 0);
                btnThemeToggle.Size = new Size(44, 44);
            }
            else
            {
                btnStart.Location = new Point(76, 0);
                btnStart.Size = new Size(170, 44);
                if (btnStopAll != null) { btnStopAll.Location = new Point(254, 0); btnStopAll.Size = new Size(110, 44); }
                btnTransformTool.Location = new Point(372, 0);
                btnTransformTool.Size = new Size(90, 44);
                btnThemeToggle.Location = new Point(470, 0);
                btnThemeToggle.Size = new Size(44, 44);
            }

            // 5. Global Settings & Hotkey Card
            pnlGlobalSettings.Size = new Size(targetW, 114);
            if (!isAdvanced)
            {
                chkAlwaysOnTop.Location = new Point(8, 6);
                chkShowMap.Location = new Point(8, 27);
                chkFreeMouse.Location = new Point(8, 48);
                chkSmoothMove.Location = new Point(8, 69);
                chkHideRunningRing.Location = new Point(8, 90);

                if (cardSimpleHotkey != null)
                {
                    cardSimpleHotkey.Location = new Point(156, 22);
                    cardSimpleHotkey.Visible = (tabIndex == 1);
                }
                if (cardAdvancedHotkey != null)
                {
                    cardAdvancedHotkey.Visible = false;
                }
            }
            else
            {
                chkAlwaysOnTop.Location = new Point(14, 6);
                chkShowMap.Location = new Point(14, 27);
                chkFreeMouse.Location = new Point(14, 48);
                chkSmoothMove.Location = new Point(14, 69);
                chkHideRunningRing.Location = new Point(14, 90);

                if (cardAdvancedHotkey != null)
                {
                    cardAdvancedHotkey.Location = new Point(160, 22);
                    cardAdvancedHotkey.Visible = true;
                }
                if (cardSimpleHotkey != null)
                {
                    cardSimpleHotkey.Visible = false;
                }
            }

            ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();

            btnTabInfo.NormalColor = (tabIndex == 0) ? t.AccentPrimary : t.BgElevated;
            btnTabInfo.ForeColor = (tabIndex == 0) ? Color.White : t.TextSecondary;
            btnTabInfo.HoverColor = (tabIndex == 0) ? t.AccentPrimaryHover : t.BorderHover;
            btnTabInfo.Invalidate();

            btnTabBasic.NormalColor = (tabIndex == 1) ? t.AccentPrimary : t.BgElevated;
            btnTabBasic.ForeColor = (tabIndex == 1) ? Color.White : t.TextSecondary;
            btnTabBasic.HoverColor = (tabIndex == 1) ? t.AccentPrimaryHover : t.BorderHover;
            btnTabBasic.Invalidate();

            btnTabAdvanced.NormalColor = (tabIndex == 2) ? t.AccentPrimary : t.BgElevated;
            btnTabAdvanced.ForeColor = (tabIndex == 2) ? Color.White : t.TextSecondary;
            btnTabAdvanced.HoverColor = (tabIndex == 2) ? t.AccentPrimaryHover : t.BorderHover;
            btnTabAdvanced.Invalidate();

            if (pnlTabAdvanced != null && pnlTabAdvanced.VFX != null)
            {
                if (tabIndex == 2)
                {
                    pnlTabAdvanced.VFX.Attach(this, tblRoot, btnTabAdvanced);
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

            if (IsAnyRunning)
            {
                UpdateMainStatusText();
                return;
            }

            if (_currentTabIndex == 0)
            {
                lblMainStatusInfo.Text = "Auto Clicker by Max • Information";
            }
            else if (_currentTabIndex == 1)
            {
                string modeStr = (chkFreeMouse != null && chkFreeMouse.Checked) ? "Free Mouse" : "Fixed Coordinates";
                int interval = numInterval != null ? numInterval.Value : 100;
                bool isCursor = (radModeCursor != null && radModeCursor.Checked);
                if (isCursor)
                {
                    lblMainStatusInfo.Text = string.Format("Ready | Follow Cursor | Mode: {0} | Every: {1}ms", modeStr, interval);
                }
                else
                {
                    int ptsCount = (lstPoints != null) ? lstPoints.Count : 0;
                    lblMainStatusInfo.Text = string.Format("Ready | Mode: {0} | Every: {1}ms | Points: {2}", modeStr, interval, ptsCount);
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

        public void ApplyTheme(ThemeTokens t)
        {
            currentTheme = t;
            this.BackColor = t.BgPrimary;
            this.ForeColor = t.TextPrimary;

            if (titleBar != null)
            {
                titleBar.ApplyTheme(t);
            }

            btnThemeToggle.Text = t.IsDark ? "🔆" : "⏾";
            btnThemeToggle.NormalColor = t.TextPrimary;
            btnThemeToggle.ForeColor = t.BgPrimary;
            btnThemeToggle.HoverColor = t.TextSecondary;
            btnThemeToggle.Invalidate();

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
            Label[] subLabels = new Label[] {
                lblInterval, lblMs, lblSimpleLoop, lblSimpleJitter,
                lblCurrentClicksTitle, lblCurrentTimeTitle
            };
            foreach (Label l in subLabels)
            {
                if (l != null) l.ForeColor = t.TextSecondary;
            }

            // Hint / Unit labels (TextTertiary)
            Label[] hintLabels = new Label[] { lblSimpleLoopHint, lblSimpleJitterUnit, lblClicksUnit2 };
            foreach (Label hl in hintLabels)
            {
                if (hl != null) hl.ForeColor = t.TextTertiary;
            }

            // Dynamic live value labels (TextPrimary)
            lblCurrentClicksVal.ForeColor = t.TextPrimary;
            lblCurrentTimeVal.ForeColor = t.TextPrimary;

            // Radio & Checkbox
            if (radModePoints != null) radModePoints.ForeColor = t.TextPrimary;
            if (radModeCursor != null) radModeCursor.ForeColor = t.TextPrimary;
            chkAlwaysOnTop.ForeColor = t.TextSecondary;
            if (chkShowMap != null) chkShowMap.ForeColor = t.TextSecondary;
            if (chkFreeMouse != null) chkFreeMouse.ForeColor = t.TextSecondary;
            if (chkSmoothMove != null) chkSmoothMove.ForeColor = t.TextSecondary;
            if (chkHideRunningRing != null) chkHideRunningRing.ForeColor = t.TextSecondary;

            // Inputs
            NumberInput[] nums = new NumberInput[] { numInterval, numSimpleLoop, numSimpleJitter };
            foreach (NumberInput n in nums)
            {
                if (n != null) n.ApplyTheme(t);
            }

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
            btnSaveList.Invalidate();

            btnLoadList.NormalColor = btnBg;
            btnLoadList.ForeColor = btnText;
            btnLoadList.HoverColor = t.AccentSecondary;
            btnLoadList.Invalidate();

            btnTabInfo.NormalColor = (_currentTabIndex == 0) ? t.AccentPrimary : t.BgElevated;
            btnTabInfo.ForeColor = (_currentTabIndex == 0) ? Color.White : t.TextSecondary;
            btnTabInfo.HoverColor = (_currentTabIndex == 0) ? t.AccentPrimaryHover : t.BorderHover;
            btnTabInfo.Invalidate();

            btnTabBasic.NormalColor = (_currentTabIndex == 1) ? t.AccentPrimary : t.BgElevated;
            btnTabBasic.ForeColor = (_currentTabIndex == 1) ? Color.White : t.TextSecondary;
            btnTabBasic.HoverColor = (_currentTabIndex == 1) ? t.AccentPrimaryHover : t.BorderHover;
            btnTabBasic.Invalidate();

            btnTabAdvanced.NormalColor = (_currentTabIndex == 2) ? t.AccentPrimary : t.BgElevated;
            btnTabAdvanced.ForeColor = (_currentTabIndex == 2) ? Color.White : t.TextSecondary;
            btnTabAdvanced.HoverColor = (_currentTabIndex == 2) ? t.AccentPrimaryHover : t.BorderHover;
            btnTabAdvanced.Invalidate();

            // Hotkey help boxes
            if (cardSimpleHotkey != null) cardSimpleHotkey.ApplyTheme(t);
            if (cardAdvancedHotkey != null) cardAdvancedHotkey.ApplyTheme(t);

            // Bottom Buttons
            if (lblMainStatusInfo != null)
            {
                lblMainStatusInfo.ForeColor = t.TextSecondary;
            }

            bool isRunning = IsActiveTabRunning;
            btnStart.NormalColor = isRunning ? t.Danger : t.AccentPrimary;
            btnStart.HoverColor = isRunning ? t.CRed : t.AccentPrimaryHover;
            btnStart.ForeColor = Color.White;
            btnStart.Invalidate();

            if (btnStopAll != null)
            {
                btnStopAll.NormalColor = t.Danger;
                btnStopAll.HoverColor = t.CRed;
                btnStopAll.ForeColor = Color.White;
                btnStopAll.BorderRadius = t.RadiusMd;
                btnStopAll.Invalidate();
            }

            // Button Radius & Border styling
            btnClearList.BorderRadius = t.RadiusMd;
            btnSaveList.BorderRadius = t.RadiusMd;
            btnLoadList.BorderRadius = t.RadiusMd;
            btnStart.BorderRadius = t.RadiusMd;
            btnThemeToggle.BorderRadius = t.RadiusMd;
            btnTabInfo.BorderRadius = t.RadiusMd;
            btnTabBasic.BorderRadius = t.RadiusMd;
            btnTabAdvanced.BorderRadius = t.RadiusMd;
            if (btnTransformTool != null)
            {
                btnTransformTool.NormalColor = t.BgElevated;
                btnTransformTool.HoverColor = t.AccentPrimary;
                btnTransformTool.ForeColor = t.TextPrimary;
                btnTransformTool.BorderRadius = t.RadiusMd;
                btnTransformTool.Invalidate();
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
                Font = new Font("Segoe UI", 10F, FontStyle.Bold),
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
                Font = new Font("Segoe UI", 9F),
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
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                ForeColor = currentTheme.TextPrimary
            };
        }

        private Label CreateHelpLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                Font = ThemeTokens.GetMonospaceFont(8F),
                ForeColor = currentTheme.TextSecondary
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
                Value = val
            };
            ni.ApplyTheme(currentTheme);
            return ni;
        }
    }
}
