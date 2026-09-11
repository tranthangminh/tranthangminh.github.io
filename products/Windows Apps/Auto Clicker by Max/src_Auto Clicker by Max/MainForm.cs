using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public partial class MainForm : Form
    {
        private ClickEngine[] _simpleEngines = new ClickEngine[5];
        private Dictionary<string, ModernAutoClicker.Advanced.MacroRunner> _asianRunners = new Dictionary<string, ModernAutoClicker.Advanced.MacroRunner>(StringComparer.OrdinalIgnoreCase);
        private ModernAutoClicker.Advanced.MacroRunner _defaultAsianRunner = new ModernAutoClicker.Advanced.MacroRunner();

        // Legacy compatibility properties delegating to active tab engine/runner
        private ClickEngine engine { get { return (_simpleEngines != null && _simpleTabIndex >= 0 && _simpleTabIndex < 5) ? _simpleEngines[_simpleTabIndex] : null; } }
        private ModernAutoClicker.Advanced.MacroRunner macroRunner
        {
            get
            {
                if (pnlTabAdvanced != null)
                {
                    var prof = pnlTabAdvanced.GetCurrentProfile();
                    if (prof != null && !string.IsNullOrEmpty(prof.Name) && _asianRunners.ContainsKey(prof.Name))
                    {
                        return _asianRunners[prof.Name];
                    }
                }
                return _defaultAsianRunner;
            }
        }

        public bool IsAnyRunning
        {
            get
            {
                if (_simpleEngines != null)
                {
                    for (int i = 0; i < 5; i++)
                    {
                        if (_simpleEngines[i] != null && _simpleEngines[i].IsRunning) return true;
                    }
                }
                if (_asianRunners != null)
                {
                    foreach (var r in _asianRunners.Values)
                    {
                        if (r != null && r.IsRunning) return true;
                    }
                }
                return false;
            }
        }

        public bool IsActiveTabRunning
        {
            get
            {
                if (_currentTabIndex == 1)
                {
                    return _simpleEngines != null && _simpleTabIndex >= 0 && _simpleTabIndex < 5 &&
                           _simpleEngines[_simpleTabIndex] != null && _simpleEngines[_simpleTabIndex].IsRunning;
                }
                else if (_currentTabIndex == 2)
                {
                    if (pnlTabAdvanced != null)
                    {
                        var prof = pnlTabAdvanced.GetCurrentProfile();
                        if (prof != null && !string.IsNullOrEmpty(prof.Name) && _asianRunners.ContainsKey(prof.Name))
                        {
                            return _asianRunners[prof.Name] != null && _asianRunners[prof.Name].IsRunning;
                        }
                    }
                }
                return false;
            }
        }

        private ThemeTokens currentTheme;
        private List<Point> pointList { get { return lstPoints != null ? lstPoints.GetPoints() : new List<Point>(); } }
        private OverlayForm overlayForm;

        private const int WM_ACTIVATE = 0x0006;
        private const int WM_ACTIVATEAPP = 0x001C;
        private const int WM_NCACTIVATE = 0x0086;
        private const int WA_INACTIVE = 0;
        private bool _isWindowActive = true;

        private string _simpleTargetProcessName = "";
        private string _simpleTargetWindowTitle = "";
        private bool _simpleRelativeToWindow = false;
        private WindowTracker _windowTracker;
        private UnfocusClickFilter _unfocusFilter;
        private ToolTip _startToolTip;
        private bool _isLoadingProfile = false;

        protected override CreateParams CreateParams
        {
            get
            {
                const int CS_DROPSHADOW = 0x00020000;
                CreateParams cp = base.CreateParams;
                cp.Style |= 0x02000000; // WS_CLIPCHILDREN
                cp.ClassStyle |= CS_DROPSHADOW;
                return cp;
            }
        }

        public MainForm()
        {
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);

            currentTheme = ThemeTokens.DarkTheme();
            InitializeComponent();
            ApplyTheme(currentTheme);

            _startToolTip = new ToolTip
            {
                InitialDelay = 150,
                ReshowDelay = 100,
                AutoPopDelay = 6000,
                ShowAlways = true
            };

            LoadSettings();

            _unfocusFilter = new UnfocusClickFilter(this);
            Application.AddMessageFilter(_unfocusFilter);

            for (int i = 0; i < 5; i++)
            {
                int tabIdx = i;
                _simpleEngines[i] = new ClickEngine();
                _simpleEngines[i].OnProgressUpdated += (clicks, elapsed) =>
                {
                    if (this.IsHandleCreated)
                    {
                        this.BeginInvoke((Action)(() =>
                        {
                            if (_currentTabIndex == 1 && _simpleTabIndex == tabIdx)
                            {
                                lblCurrentClicksVal.Text = clicks.ToString();
                                lblCurrentTimeVal.Text = string.Format("{0:D2}:{1:D2}:{2:D2}",
                                    (int)elapsed.TotalHours, elapsed.Minutes, elapsed.Seconds);
                            }
                        }));
                    }
                };

                _simpleEngines[i].OnPointExecuting += (idx) =>
                {
                    if (this.IsHandleCreated)
                    {
                        this.BeginInvoke((Action)(() =>
                        {
                            if (_currentTabIndex == 1 && _simpleTabIndex == tabIdx)
                            {
                                if (overlayForm != null)
                                {
                                    overlayForm.SetExecutingIndex(idx);
                                }
                            }
                        }));
                    }
                };

                _simpleEngines[i].OnStopped += () =>
                {
                    if (this.IsHandleCreated)
                    {
                        this.BeginInvoke((Action)(() =>
                        {
                            HandleSimpleEngineStopped(tabIdx);
                        }));
                    }
                };
            }

            if (pnlTabAdvanced != null)
            {
                pnlTabAdvanced.OnActiveScriptChanged += () =>
                {
                    UpdateRunningState();
                    UpdateStartButtonState();
                    SyncOverlay();
                };

                pnlTabAdvanced.OnStatusChanged += (status) =>
                {
                    if (!_isBasicTab && lblMainStatusInfo != null && !IsAnyRunning)
                    {
                        lblMainStatusInfo.Text = status;
                    }
                };

                if (pnlTabAdvanced.Table != null)
                {
                    pnlTabAdvanced.Table.OnTableDataChanged += () =>
                    {
                        SyncOverlay();
                        SaveSettings();
                        UpdateStartButtonState();
                    };
                    pnlTabAdvanced.Table.OnSelectionChanged += (selIdx) => SyncOverlay();
                }
            }

            _windowTracker = new WindowTracker(250);
            _windowTracker.IsShowMapChecked = () => chkShowMap != null && chkShowMap.Checked;
            _windowTracker.IsWindowActive = () => _isWindowActive;
            _windowTracker.IsRunning = () => IsAnyRunning;
            _windowTracker.IsBasicTab = () => _currentTabIndex == 1;
            _windowTracker.IsOverlayInteracting = () => overlayForm != null && overlayForm.IsInteracting;
            _windowTracker.SimpleRelativeToWindow = () => _simpleRelativeToWindow;
            _windowTracker.SimpleTargetProcessName = () => _simpleTargetProcessName;
            _windowTracker.SimpleTargetWindowTitle = () => _simpleTargetWindowTitle;
            _windowTracker.GetAdvancedSteps = () => (pnlTabAdvanced != null && pnlTabAdvanced.Table != null) ? pnlTabAdvanced.Table.GetSteps() : null;
            _windowTracker.OnPositionsChanged += () => SyncOverlay();
            _windowTracker.Start();
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            _isWindowActive = true;
            this.Activate();
            this.Focus();
            NativeMethods.SetForegroundWindow(this.Handle);

            RegisterGlobalHotkeys();

            // Sync and show overlay with loaded points immediately
            UpdateFormRegion();
            SyncOverlay();
            UpdateTabStatus(_isBasicTab);
            UpdateStartButtonState();
        }

        public void UpdateFormRegion()
        {
            if (this.FormBorderStyle == FormBorderStyle.None && this.Width > 10 && this.Height > 10)
            {
                ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();
                int radius = t.RadiusSm; // 4px border-radius-sm
                using (GraphicsPath path = ModernAutoClicker.Advanced.VFX_AsianDragonOverdrive.GetRoundedRectangle(new Rectangle(0, 0, this.Width, this.Height), radius))
                {
                    Region oldRegion = this.Region;
                    this.Region = new Region(path);
                    if (oldRegion != null) oldRegion.Dispose();
                }
            }
            else
            {
                Region oldRegion = this.Region;
                this.Region = null;
                if (oldRegion != null) oldRegion.Dispose();
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            UpdateFormRegion();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (this.FormBorderStyle == FormBorderStyle.None && _currentTabIndex != 2)
            {
                ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();
                int radius = t.RadiusSm;
                using (GraphicsPath path = ModernAutoClicker.Advanced.VFX_AsianDragonOverdrive.GetRoundedRectangle(new Rectangle(0, 0, this.Width - 1, this.Height - 1), radius))
                using (Pen borderPen = new Pen(t.BorderColor, 1))
                {
                    e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                    e.Graphics.DrawPath(borderPen, path);
                }
            }
        }

        private void RegisterGlobalHotkeys()
        {
            if (this.IsHandleCreated)
            {
                NativeMethods.UnregisterHotKey(this.Handle, NativeMethods.HOTKEY_START_ID);
                NativeMethods.UnregisterHotKey(this.Handle, NativeMethods.HOTKEY_STOP_ALL_ID);

                NativeMethods.RegisterHotKey(this.Handle, NativeMethods.HOTKEY_START_ID, 0, (uint)Keys.F6);
                NativeMethods.RegisterHotKey(this.Handle, NativeMethods.HOTKEY_STOP_ALL_ID, 0, (uint)Keys.F7);
            }
        }

        private void UnregisterGlobalHotkeys()
        {
            if (this.IsHandleCreated)
            {
                NativeMethods.UnregisterHotKey(this.Handle, NativeMethods.HOTKEY_START_ID);
                NativeMethods.UnregisterHotKey(this.Handle, NativeMethods.HOTKEY_STOP_ALL_ID);
            }
        }

        private DateTime _lastToggleTime = DateTime.MinValue;

        private void ToggleStartStop()
        {
            if (this.IsDisposed || !this.IsHandleCreated) return;

            if (this.InvokeRequired)
            {
                this.BeginInvoke((Action)(() => ToggleStartStop()));
                return;
            }

            if ((DateTime.Now - _lastToggleTime).TotalMilliseconds < 250)
            {
                return;
            }
            _lastToggleTime = DateTime.Now;

            if (IsActiveTabRunning)
            {
                StopAutoClick();
            }
            else
            {
                if (!CanStartAutoClick())
                {
                    string reason = "Please add points or steps to start";
                    if (_currentTabIndex == 1 && radModePoints != null && radModePoints.Checked)
                    {
                        reason = "Please add at least 1 point to start (Press Space to capture point)";
                    }
                    else if (_currentTabIndex == 2)
                    {
                        reason = "Please add at least 1 active step to start (Click + Add Step)";
                    }
                    else if (_currentTabIndex == 0)
                    {
                        reason = "Cannot start from Info tab. Switch to Simple or Asian Mode!";
                    }

                    if (lblMainStatusInfo != null)
                    {
                        lblMainStatusInfo.Text = "Cannot start: " + reason;
                    }

                    if (_startToolTip != null && btnStart != null && btnStart.IsHandleCreated)
                    {
                        _startToolTip.Show(reason, btnStart, btnStart.Width / 2, btnStart.Height + 4, 3000);
                    }

                    try { System.Media.SystemSounds.Beep.Play(); } catch { }
                    return;
                }
                StartAutoClick();
            }
        }

        private bool IsAppFocused()
        {
            IntPtr fg = NativeMethods.GetForegroundWindow();
            if (fg == IntPtr.Zero) return true; // Transition safety
            if (fg == this.Handle) return true;
            if (overlayForm != null && overlayForm.IsHandleCreated && fg == overlayForm.Handle) return true;
            if (overlayForm != null && overlayForm.IsInteracting) return true;

            try
            {
                uint fgPid;
                NativeMethods.GetWindowThreadProcessId(fg, out fgPid);
                uint currentPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
                if (fgPid == currentPid)
                {
                    return true;
                }
            }
            catch { }

            return false;
        }

        // =========================================================================
        // CENTRALIZED WINDOW FOCUS LIFECYCLE
        // =========================================================================
        private void HandleWindowFocusChanged(bool isFocused)
        {
            bool active = isFocused || IsAppFocused();
            if (_isWindowActive == active) return;
            _isWindowActive = active;

            // 1. Map Overlay: ONLY visible when AutoClicker window is selected/focused
            SyncOverlay();

            // 2. Refresh UI
            this.Invalidate();
        }

        private const int WM_ENTERSIZEMOVE = 0x0231;
        private const int WM_EXITSIZEMOVE = 0x0232;

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_ENTERSIZEMOVE)
            {
                if (_windowTracker != null) _windowTracker.Pause();
            }
            else if (m.Msg == WM_EXITSIZEMOVE)
            {
                if (_windowTracker != null)
                {
                    _windowTracker.Resume();
                    _windowTracker.CheckNow();
                }
            }
            else if (m.Msg == WM_ACTIVATE)
            {
                int state = m.WParam.ToInt32() & 0xFFFF;
                HandleWindowFocusChanged(state != WA_INACTIVE || IsAppFocused());
            }
            else if (m.Msg == WM_ACTIVATEAPP)
            {
                bool appActive = (m.WParam.ToInt32() != 0);
                HandleWindowFocusChanged(appActive || IsAppFocused());
            }
            else if (m.Msg == NativeMethods.WM_HOTKEY)
            {
                int id = m.WParam.ToInt32();
                if (id == NativeMethods.HOTKEY_START_ID)
                {
                    ToggleStartStop();
                }
                else if (id == NativeMethods.HOTKEY_STOP_ALL_ID)
                {
                    StopAll();
                }
            }
            base.WndProc(ref m);
        }

        private void CaptureCurrentMousePoint()
        {
            NativeMethods.POINT p;
            if (NativeMethods.GetCursorPos(out p))
            {
                Point screenPt = new Point(p.X, p.Y);

                if (_isBasicTab)
                {
                    Point finalPt = screenPt;
                    if (_simpleRelativeToWindow && (!string.IsNullOrEmpty(_simpleTargetProcessName) || !string.IsNullOrEmpty(_simpleTargetWindowTitle)))
                    {
                        IntPtr hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle);
                        if (hWnd != IntPtr.Zero)
                        {
                            NativeMethods.RECT clientRect;
                            NativeMethods.POINT origin = new NativeMethods.POINT { X = 0, Y = 0 };
                            if (NativeMethods.GetClientRect(hWnd, out clientRect) && NativeMethods.ClientToScreen(hWnd, ref origin))
                            {
                                Rectangle screenBounds = new Rectangle(origin.X, origin.Y, clientRect.Right - clientRect.Left, clientRect.Bottom - clientRect.Top);
                                if (screenBounds.Contains(screenPt))
                                {
                                    finalPt = new Point(screenPt.X - origin.X, screenPt.Y - origin.Y);
                                }
                            }
                        }
                    }
                    if (lstPoints != null) lstPoints.AddPoint(finalPt);
                    UpdatePointsHeader();
                }
                else
                {
                    if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                    {
                        bool isInsideTarget = false;
                        Point finalStartPt = screenPt;
                        string targetProc = "";
                        string targetTitle = "";

                        // Smart dynamic window detection: check the actual window under cursor
                        IntPtr hWnd = NativeMethods.WindowFromPoint(p);
                        if (hWnd != IntPtr.Zero)
                        {
                            hWnd = NativeMethods.GetTopLevelWindow(hWnd);
                        }

                        if (hWnd != IntPtr.Zero && NativeMethods.IsWindow(hWnd) && NativeMethods.IsWindowVisible(hWnd) && !NativeMethods.IsIconic(hWnd))
                        {
                            uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
                            uint pid;
                            NativeMethods.GetWindowThreadProcessId(hWnd, out pid);

                            if (pid != myPid && pid != 0)
                            {
                                var sbClass = new System.Text.StringBuilder(256);
                                NativeMethods.GetClassName(hWnd, sbClass, sbClass.Capacity);
                                string className = sbClass.ToString();

                                if (className != "Progman" && className != "WorkerW" && className != "Shell_TrayWnd" && className != "Windows.UI.Core.CoreWindow")
                                {
                                    string pName = "";
                                    try
                                    {
                                        var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                                        pName = proc.ProcessName;
                                    }
                                    catch { }

                                    int len = NativeMethods.GetWindowTextLength(hWnd);
                                    string title = "";
                                    if (len > 0)
                                    {
                                        var sb = new System.Text.StringBuilder(len + 1);
                                        NativeMethods.GetWindowText(hWnd, sb, sb.Capacity);
                                        title = sb.ToString().Trim();
                                    }

                                    if (!string.IsNullOrEmpty(pName))
                                    {
                                        NativeMethods.RECT clientRect;
                                        NativeMethods.POINT origin = new NativeMethods.POINT { X = 0, Y = 0 };
                                        if (NativeMethods.GetClientRect(hWnd, out clientRect) && NativeMethods.ClientToScreen(hWnd, ref origin))
                                        {
                                            Rectangle clientBounds = new Rectangle(origin.X, origin.Y, clientRect.Right - clientRect.Left, clientRect.Bottom - clientRect.Top);
                                            if (clientBounds.Contains(screenPt))
                                            {
                                                isInsideTarget = true;
                                                targetProc = pName;
                                                targetTitle = title;
                                                finalStartPt = new Point(screenPt.X - origin.X, screenPt.Y - origin.Y);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        ModernAutoClicker.Advanced.MacroStep newStep = new ModernAutoClicker.Advanced.MacroStep
                        {
                            Name = string.Format("Step {0}", pnlTabAdvanced.Table.GetSteps().Count + 1),
                            ActionType = ModernAutoClicker.Advanced.MacroActionType.LeftClick,
                            RelativeToWindow = isInsideTarget,
                            ProcessName = isInsideTarget ? targetProc : "",
                            WindowTitle = isInsideTarget ? targetTitle : "",
                            StartPoint = finalStartPt,
                            DelayMs = 240,
                            HoldMs = 10,
                            RepeatCount = 1,
                            Enabled = true
                        };
                        pnlTabAdvanced.Table.AddStep(newStep);
                        pnlTabAdvanced.UpdateStatus();
                    }
                }
                _isWindowActive = true;
                SyncOverlay();
            }
        }

        private void ShowSimpleTargetWindowMenu()
        {
            if (btnSimpleTargetWindow == null) return;
            btnSimpleTargetWindow.IsOpen = true;

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(currentTheme);
            menu.ShowImageMargin = true;
            menu.Closed += (s, e) => { btnSimpleTargetWindow.IsOpen = false; btnSimpleTargetWindow.BeginInvoke((Action)(() => menu.Dispose())); };

            ToolStripMenuItem itemDesktop = new ToolStripMenuItem("All Screens (Desktop)");
            itemDesktop.Image = IconCache.DesktopIcon;
            itemDesktop.Click += (s, e) =>
            {
                _simpleRelativeToWindow = false;
                _simpleTargetProcessName = "";
                _simpleTargetWindowTitle = "";
                UpdateSimpleTargetWindowButtonDisplay();
                SyncOverlay();
                SaveSettings();
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
                        _simpleRelativeToWindow = true;
                        _simpleTargetProcessName = targetWin.ProcessName;
                        _simpleTargetWindowTitle = targetWin.Title;
                        if (targetWin.AppIcon != null)
                        {
                            IconCache.CacheProcessIcon(targetWin.ProcessName, targetWin.AppIcon);
                        }
                        UpdateSimpleTargetWindowButtonDisplay();
                        SyncOverlay();
                        SaveSettings();
                    };
                    menu.Items.Add(itemWin);
                }
            }

            menu.Show(btnSimpleTargetWindow, new Point(0, btnSimpleTargetWindow.Height));
        }

        private void UpdateSimpleTargetWindowButtonDisplay()
        {
            if (btnSimpleTargetWindow == null) return;

            if (_simpleRelativeToWindow && !string.IsNullOrEmpty(_simpleTargetProcessName))
            {
                string appName = NativeMethods.GetProcessFriendlyName(_simpleTargetProcessName);
                if (string.IsNullOrEmpty(appName)) appName = _simpleTargetProcessName;

                btnSimpleTargetWindow.Image = IconCache.GetProcessIcon(_simpleTargetProcessName, _simpleTargetWindowTitle) ?? IconCache.GenericAppIcon;
                btnSimpleTargetWindow.Text = appName;
                btnSimpleTargetWindow.CustomTextColor = currentTheme != null ? currentTheme.CBlue : Color.White;
            }
            else
            {
                btnSimpleTargetWindow.Image = IconCache.DesktopIcon;
                btnSimpleTargetWindow.Text = "All Screens (Desktop)";
                btnSimpleTargetWindow.CustomTextColor = currentTheme != null ? currentTheme.TextPrimary : Color.White;
            }
            btnSimpleTargetWindow.Invalidate();
        }

        private void AddPoint(Point pt)
        {
            if (_isBasicTab)
            {
                if (lstPoints != null) lstPoints.AddPoint(pt);
                UpdatePointsHeader();
                UpdateTabStatus(_isBasicTab);
            }
            else
            {
                if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                {
                    ModernAutoClicker.Advanced.MacroStep newStep = new ModernAutoClicker.Advanced.MacroStep
                    {
                        Name = string.Format("Step {0}", pnlTabAdvanced.Table.GetSteps().Count + 1),
                        ActionType = ModernAutoClicker.Advanced.MacroActionType.LeftClick,
                        StartPoint = pt,
                        DelayMs = 240,
                        HoldMs = 10,
                        RepeatCount = 1,
                        Enabled = true
                    };
                    pnlTabAdvanced.Table.AddStep(newStep);
                    pnlTabAdvanced.UpdateStatus();
                }
            }
            _isWindowActive = true;
            SyncOverlay();
        }

        private void ClearPoints()
        {
            if (lstPoints != null) lstPoints.ClearPoints();
            UpdatePointsHeader();
            SyncOverlay();
            UpdateStartButtonState();
            UpdateTabStatus(_isBasicTab);
        }

        private void PickCoordinateForSimple(int index)
        {
            if (index < 0 || lstPoints == null || index >= lstPoints.Count) return;

            CoordinatePicker picker = new CoordinatePicker();
            picker.OnPointSelectedWithWindow += (screenPt, color, winInfo, clientPt) =>
            {
                Point finalPt = screenPt;
                if (_simpleRelativeToWindow && (!string.IsNullOrEmpty(_simpleTargetProcessName) || !string.IsNullOrEmpty(_simpleTargetWindowTitle)))
                {
                    IntPtr hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle);
                    if (hWnd != IntPtr.Zero)
                    {
                        NativeMethods.POINT np = new NativeMethods.POINT { X = screenPt.X, Y = screenPt.Y };
                        if (NativeMethods.ScreenToClient(hWnd, ref np))
                        {
                            finalPt = new Point(np.X, np.Y);
                        }
                    }
                }

                lstPoints.UpdatePoint(index, finalPt);
                lstPoints.SelectRow(index);
                SyncOverlay();
                SaveSettings();
            };
            picker.Show();
        }

        private void SetSimpleClickMode(int mode)
        {
            bool isCursorMode = (mode == 1);
            if (btnSimpleTargetWindow != null)
            {
                btnSimpleTargetWindow.Enabled = !isCursorMode;
            }
            if (lblHeaderSimpleTarget != null)
            {
                ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();
                lblHeaderSimpleTarget.ForeColor = isCursorMode ? t.TextSecondary : t.AccentPrimary;
            }

            if (lblHeaderList != null)
            {
                if (isCursorMode)
                {
                    lblHeaderList.Text = "Follow Cursor Mode";
                }
                else
                {
                    UpdatePointsHeader();
                }
            }

            if (btnClearList != null) btnClearList.Visible = !isCursorMode;
            if (btnSaveList != null) btnSaveList.Visible = !isCursorMode;
            if (btnLoadList != null) btnLoadList.Visible = !isCursorMode;
            if (lstPoints != null) lstPoints.Visible = !isCursorMode;
            if (cardCursorGuide != null) cardCursorGuide.Visible = isCursorMode;

            SyncOverlay();
            SaveSettings();
            UpdateStartButtonState();
            UpdateTabStatus(_isBasicTab);
        }

        private void UpdatePointsHeader()
        {
            if (radModeCursor != null && radModeCursor.Checked)
            {
                if (lblHeaderList != null) lblHeaderList.Text = "Follow Cursor Mode";
                return;
            }
            if (lblHeaderList != null && lstPoints != null)
            {
                lblHeaderList.Text = string.Format("Target ({0} {1})", lstPoints.Count, lstPoints.Count == 1 ? "Point" : "Points");
            }
        }

        private void InitOverlayForm()
        {
            if (overlayForm != null && !overlayForm.IsDisposed) return;

            overlayForm = new OverlayForm();
            if (this.IsHandleCreated)
            {
                overlayForm.Owner = this;
            }

            overlayForm.OnPointSelected += (index) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        if (_isBasicTab)
                        {
                            if (lstPoints != null)
                            {
                                lstPoints.SelectRow(index);
                            }
                        }
                        else
                        {
                            if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                            {
                                pnlTabAdvanced.Table.SelectRow(index);
                            }
                        }
                    }));
                }
            };

            overlayForm.OnPointMoved += (index, newPt) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        if (lstPoints != null && index >= 0 && index < lstPoints.Count)
                        {
                            Point savePt = newPt;
                            if (_isBasicTab && _simpleRelativeToWindow)
                            {
                                IntPtr hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle);
                                if (hWnd != IntPtr.Zero)
                                {
                                    NativeMethods.POINT np = new NativeMethods.POINT { X = newPt.X, Y = newPt.Y };
                                    if (NativeMethods.ScreenToClient(hWnd, ref np))
                                    {
                                        savePt = new Point(np.X, np.Y);
                                    }
                                }
                            }
                            lstPoints.UpdatePoint(index, savePt);
                        }
                    }));
                }
            };

            overlayForm.OnAdvancedPointMoved += (stepIdx, isStart, newPt) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                        {
                            Point savePt = newPt;
                            var steps = pnlTabAdvanced.Table.GetSteps();
                            if (steps != null && stepIdx >= 0 && stepIdx < steps.Count)
                            {
                                var s = steps[stepIdx];
                                if (s.RelativeToWindow && !string.IsNullOrEmpty(s.ProcessName))
                                {
                                    IntPtr hWnd = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle);
                                    if (hWnd != IntPtr.Zero)
                                    {
                                        NativeMethods.POINT np = new NativeMethods.POINT { X = newPt.X, Y = newPt.Y };
                                        if (NativeMethods.ScreenToClient(hWnd, ref np))
                                        {
                                            savePt = new Point(np.X, np.Y);
                                        }
                                    }
                                }
                            }
                            pnlTabAdvanced.Table.UpdateStepPoint(stepIdx, isStart, savePt);
                            pnlTabAdvanced.UpdateStatus();
                        }
                    }));
                }
            };

            overlayForm.OnAdvancedAreaMoved += (stepIdx, startPt, endPt) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                        {
                            Point saveStartPt = startPt;
                            Point saveEndPt = endPt;
                            var steps = pnlTabAdvanced.Table.GetSteps();
                            if (steps != null && stepIdx >= 0 && stepIdx < steps.Count)
                            {
                                var s = steps[stepIdx];
                                if (s.RelativeToWindow && !string.IsNullOrEmpty(s.ProcessName))
                                {
                                    IntPtr hWnd = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle);
                                    if (hWnd != IntPtr.Zero)
                                    {
                                        NativeMethods.POINT npA = new NativeMethods.POINT { X = startPt.X, Y = startPt.Y };
                                        NativeMethods.POINT npB = new NativeMethods.POINT { X = endPt.X, Y = endPt.Y };
                                        if (NativeMethods.ScreenToClient(hWnd, ref npA) && NativeMethods.ScreenToClient(hWnd, ref npB))
                                        {
                                            saveStartPt = new Point(npA.X, npA.Y);
                                            saveEndPt = new Point(npB.X, npB.Y);
                                        }
                                    }
                                }
                            }
                            pnlTabAdvanced.Table.UpdateStepArea(stepIdx, saveStartPt, saveEndPt);
                            pnlTabAdvanced.UpdateStatus();
                        }
                    }));
                }
            };

            overlayForm.OnPointMoveFinished += () =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        SyncOverlay();
                    }));
                }
            };

            // Always show the transparent layer immediately upon creation!
            overlayForm.ShowOverlay();
        }

        private void SyncOverlay()
        {
            InitOverlayForm();
            if (overlayForm != null)
            {
                bool showMap = (chkShowMap != null && chkShowMap.Checked);
                bool isRunning = IsActiveTabRunning;
                bool shouldShow = _isWindowActive && !isRunning && showMap && (_currentTabIndex != 0);

                if (!shouldShow)
                {
                    overlayForm.ClearAndHide();
                    return;
                }

                overlayForm.ShowOverlay();

                if (_isBasicTab)
                {
                    if (radModeCursor != null && radModeCursor.Checked)
                    {
                        overlayForm.UpdatePoints(null, -1, currentTheme.AccentPrimary, currentTheme.AccentSecondary);
                        return;
                    }

                    int selectedIdx = (lstPoints != null) ? lstPoints.SelectedIndex : -1;
                    List<Point> pts = (lstPoints != null) ? lstPoints.GetPoints() : null;
                    if (pts != null && _simpleRelativeToWindow)
                    {
                        List<Point> screenPts = new List<Point>();
                        IntPtr hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle);
                        foreach (var p in pts)
                        {
                            if (hWnd != IntPtr.Zero)
                            {
                                NativeMethods.POINT np = new NativeMethods.POINT { X = p.X, Y = p.Y };
                                if (NativeMethods.ClientToScreen(hWnd, ref np))
                                {
                                    screenPts.Add(new Point(np.X, np.Y));
                                }
                                else screenPts.Add(p);
                            }
                            else screenPts.Add(p);
                        }
                        pts = screenPts;
                    }
                    int simpleJitter = (numSimpleJitter != null) ? numSimpleJitter.Value : 0;
                    overlayForm.UpdatePoints((pts != null && pts.Count > 0) ? pts : null, selectedIdx, currentTheme.AccentPrimary, currentTheme.AccentSecondary, simpleJitter);
                }
                else
                {
                    if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                    {
                        int selectedIdx = pnlTabAdvanced.Table.SelectedIndex;
                        int jitterPx = pnlTabAdvanced.CurrentJitterPx;
                        List<ModernAutoClicker.Advanced.MacroStep> rawSteps = pnlTabAdvanced.Table.GetSteps();
                        List<ModernAutoClicker.Advanced.MacroStep> screenSteps = null;

                        if (rawSteps != null && rawSteps.Count > 0)
                        {
                            screenSteps = new List<ModernAutoClicker.Advanced.MacroStep>();
                            foreach (var s in rawSteps)
                            {
                                var clone = s.Clone();
                                if (s.RelativeToWindow && !string.IsNullOrEmpty(s.ProcessName))
                                {
                                    IntPtr hWnd = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle);
                                    if (hWnd != IntPtr.Zero)
                                    {
                                        if (clone.StartPoint != Point.Empty)
                                        {
                                            NativeMethods.POINT np = new NativeMethods.POINT { X = clone.StartPoint.X, Y = clone.StartPoint.Y };
                                            if (NativeMethods.ClientToScreen(hWnd, ref np))
                                            {
                                                clone.StartPoint = new Point(np.X, np.Y);
                                            }
                                        }
                                        if (clone.EndPoint != Point.Empty)
                                        {
                                            NativeMethods.POINT np2 = new NativeMethods.POINT { X = clone.EndPoint.X, Y = clone.EndPoint.Y };
                                            if (NativeMethods.ClientToScreen(hWnd, ref np2))
                                            {
                                                clone.EndPoint = new Point(np2.X, np2.Y);
                                            }
                                        }
                                    }
                                }
                                screenSteps.Add(clone);
                            }
                        }

                        overlayForm.UpdateAdvancedSteps(screenSteps, selectedIdx, currentTheme.AccentPrimary, currentTheme.AccentSecondary, jitterPx);
                    }
                }
            }
            if (_windowTracker != null) _windowTracker.ResetSignature();
        }

        private void ToggleTransformTool()
        {
            Rectangle bounds = SystemInformation.VirtualScreen;
            int maxW = bounds.Width;
            int maxH = bounds.Height;

            if (chkShowMap != null && !chkShowMap.Checked)
            {
                chkShowMap.Checked = true;
            }

            using (MapTransformToolWindow dlg = new MapTransformToolWindow(currentTheme))
            {
                dlg.OnSimplePointsTransformed += (pts) =>
                {
                    if (lstPoints != null)
                    {
                        lstPoints.UpdateAllPoints(pts);
                        UpdatePointsHeader();
                        SyncOverlay();
                        SaveSettings();
                        UpdateStartButtonState();
                    }
                };

                dlg.OnAdvancedStepsTransformed += (steps) =>
                {
                    if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                    {
                        pnlTabAdvanced.Table.RefreshAllDisplays();
                        SyncOverlay();
                        SaveSettings();
                        UpdateStartButtonState();
                    }
                };

                if (_isBasicTab)
                {
                    List<Point> pts = (lstPoints != null) ? lstPoints.GetPoints() : new List<Point>();
                    dlg.LoadSimplePoints(pts, maxW, maxH);
                }
                else
                {
                    List<ModernAutoClicker.Advanced.MacroStep> steps = (pnlTabAdvanced != null && pnlTabAdvanced.Table != null) ? pnlTabAdvanced.Table.GetSteps() : new List<ModernAutoClicker.Advanced.MacroStep>();
                    dlg.LoadAdvancedSteps(steps, maxW, maxH);
                }

                dlg.ShowDialog(this);
            }

            SyncOverlay();
            SaveSettings();
        }

        private void DeleteSelectedPoint()
        {
            if (_isBasicTab)
            {
                // Deletion handled via click on X in PointRowControl
            }
            else
            {
                if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                {
                    pnlTabAdvanced.Table.DeleteSelectedRow();
                }
            }
        }

        private Control GetDeepActiveControl()
        {
            Control c = this.ActiveControl;
            while (c is ContainerControl)
            {
                Control child = ((ContainerControl)c).ActiveControl;
                if (child == null) break;
                c = child;
            }
            return c;
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.F7)
            {
                StopAll();
                return true;
            }

            if (keyData == Keys.F6)
            {
                ToggleStartStop();
                return true;
            }

            // If focused in a TextBox or NumberInput anywhere in the control hierarchy, don't steal Space
            Control deepActive = GetDeepActiveControl();
            bool isTextInputFocused = (deepActive is TextBox || deepActive is NumberInput);

            if (keyData == Keys.Space)
            {
                if (!isTextInputFocused)
                {
                    // If the active tab is not currently running, capture point/step
                    if (!IsActiveTabRunning)
                    {
                        CaptureCurrentMousePoint();
                    }
                    return true;
                }
            }

            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void ToggleTheme()
        {
            if (currentTheme.IsDark)
            {
                ApplyTheme(ThemeTokens.LightTheme());
            }
            else
            {
                ApplyTheme(ThemeTokens.DarkTheme());
            }
        }

        private bool CanStartAutoClick()
        {
            if (IsActiveTabRunning)
            {
                return true;
            }

            if (_currentTabIndex == 1) // Simple Tab
            {
                if (radModePoints != null && radModePoints.Checked)
                {
                    return pointList != null && pointList.Count > 0;
                }
                return true; // Cursor Mode (Follow mouse)
            }
            else if (_currentTabIndex == 2) // Asian Mode (Advanced)
            {
                if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                {
                    List<ModernAutoClicker.Advanced.MacroStep> steps = pnlTabAdvanced.Table.GetSteps();
                    if (steps != null && steps.Count > 0)
                    {
                        return steps.Exists(s => s.Enabled);
                    }
                }
                return false;
            }
            return false;
        }

        private void UpdateStartButtonState()
        {
            if (btnStart == null) return;

            bool isRunning = IsActiveTabRunning;
            if (isRunning)
            {
                btnStart.IsDisabled = false;
                btnStart.Text = "Stop";
                btnStart.Subtitle = "(F6 to stop)";
                btnStart.NormalColor = currentTheme.Danger;
                btnStart.HoverColor = currentTheme.CRed;
                btnStart.ForeColor = Color.White;
                if (_startToolTip != null) _startToolTip.SetToolTip(btnStart, "Stop active tab (F6)");
                btnStart.Invalidate();
                return;
            }

            btnStart.Text = "Start";
            btnStart.Subtitle = "(F6)";
            btnStart.NormalColor = currentTheme.AccentPrimary;
            btnStart.HoverColor = currentTheme.AccentPrimaryHover;
            btnStart.ForeColor = Color.White;

            bool canStart = CanStartAutoClick();
            btnStart.IsDisabled = !canStart;

            if (!canStart)
            {
                string tip = "Please add points or steps to start";
                if (_currentTabIndex == 1 && radModePoints != null && radModePoints.Checked)
                {
                    tip = "No points set. Please add at least 1 point to start (Press Space to capture point)";
                }
                else if (_currentTabIndex == 2)
                {
                    tip = "No active steps. Please add at least 1 step to start (Click + Add Step)";
                }
                else if (_currentTabIndex == 0)
                {
                    tip = "Switch to Simple or Asian Mode to start";
                }

                if (_startToolTip != null)
                {
                    _startToolTip.SetToolTip(btnStart, tip);
                }
            }
            else
            {
                if (_startToolTip != null)
                {
                    _startToolTip.SetToolTip(btnStart, "Start active tab (F6)");
                }
            }
            btnStart.Invalidate();
        }

        private void StartAutoClick()
        {
            if (IsActiveTabRunning) return;
            if (!CanStartAutoClick()) return;

            // Auto-force FreeMouseMode if there will be >= 2 tasks running simultaneously
            int runningCount = GetTotalRunningCount();
            bool forceFreeMouse = (chkFreeMouse != null && chkFreeMouse.Checked) || runningCount >= 1;

            if (_currentTabIndex == 1)
            {
                StartSimpleTab(_simpleTabIndex, forceFreeMouse);
            }
            else if (_currentTabIndex == 2)
            {
                StartAsianScript(forceFreeMouse);
            }

            InitOverlayForm();
            if (overlayForm != null)
            {
                overlayForm.SetClickThrough(true);
                bool showRing = (chkHideRunningRing == null || !chkHideRunningRing.Checked);
                overlayForm.SetRunningMode(showRing, currentTheme.AccentPrimary);
            }

            UpdateRunningState();
            UpdateMainStatusText();
            if (titleBar != null) titleBar.IsRunning = true;
        }

        private void StopAutoClick()
        {
            if (_currentTabIndex == 1)
            {
                StopSimpleTab(_simpleTabIndex);
            }
            else if (_currentTabIndex == 2)
            {
                StopActiveAsianScript();
            }

            if (!IsAnyRunning)
            {
                if (overlayForm != null)
                {
                    overlayForm.SetRunningMode(false, currentTheme.AccentPrimary);
                    overlayForm.SetClickThrough(false);
                }
                if (titleBar != null) titleBar.IsRunning = false;
            }

            UpdateRunningState();
            UpdateMainStatusText();
            HandleWindowFocusChanged(true);
        }

        private void StartSimpleTab(int tabIndex, bool forceFreeMouse)
        {
            if (tabIndex < 0 || tabIndex >= 5) return;
            if (_simpleEngines[tabIndex] != null && _simpleEngines[tabIndex].IsRunning) return;

            SaveActiveSimpleProfileFromUI();
            AppSettings config = AppSettings.Load();
            SimpleProfileConfig prof = config.GetProfile(tabIndex);

            int clickMode = prof.SimpleClickMode;
            ClickConfig clickConfig = new ClickConfig
            {
                IntervalMs = Math.Max(1, prof.IntervalMs),
                Loops = prof.SimpleLoops,
                JitterPx = prof.SimpleJitterPx,
                MouseButton = 0,
                ClickMode = clickMode,
                FreeMouseMode = forceFreeMouse,
                SmoothMouseMove = (chkSmoothMove != null && chkSmoothMove.Checked),
                TargetProcessName = prof.SimpleTargetProcessName,
                TargetWindowTitle = prof.SimpleTargetWindowTitle,
                RelativeToWindow = prof.SimpleRelativeToWindow,
                PointsList = (clickMode == 0 && prof.Points != null && prof.Points.Count > 0) ? new List<Point>(prof.Points) : null
            };

            _simpleEngines[tabIndex].Start(clickConfig);
            UpdateSimpleTabButtons();
            UpdateSimpleLocalUILock();
        }

        private void StopSimpleTab(int tabIndex)
        {
            if (tabIndex < 0 || tabIndex >= 5) return;
            if (_simpleEngines[tabIndex] != null && _simpleEngines[tabIndex].IsRunning)
            {
                _simpleEngines[tabIndex].Stop();
            }
            UpdateSimpleTabButtons();
            UpdateSimpleLocalUILock();
        }

        private void HandleSimpleEngineStopped(int tabIndex)
        {
            UpdateSimpleTabButtons();
            UpdateSimpleLocalUILock();
            UpdateRunningState();
            UpdateMainStatusText();

            if (!IsAnyRunning)
            {
                if (overlayForm != null)
                {
                    overlayForm.SetExecutingIndex(-1);
                    overlayForm.SetClickThrough(false);
                    overlayForm.SetRunningMode(false, currentTheme.AccentPrimary);
                }
                if (titleBar != null) titleBar.IsRunning = false;
                HandleWindowFocusChanged(true);
            }
        }

        private void StartAsianScript(bool forceFreeMouse)
        {
            if (pnlTabAdvanced == null) return;
            var prof = pnlTabAdvanced.GetCurrentProfile();
            if (prof == null) return;
            string scriptKey = !string.IsNullOrEmpty(prof.Name) ? prof.Name : "Script";

            if (_asianRunners.ContainsKey(scriptKey) && _asianRunners[scriptKey].IsRunning) return;

            var runner = new ModernAutoClicker.Advanced.MacroRunner();
            _asianRunners[scriptKey] = runner;

            runner.OnStepExecuting += (idx, name) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        if (_currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.GetCurrentProfile().Name == scriptKey)
                        {
                            pnlTabAdvanced.HighlightExecutingStep(idx);
                            pnlTabAdvanced.UpdateStatus(string.Format("Running Step {0}: {1}", idx + 1, name));
                            if (overlayForm != null)
                            {
                                overlayForm.SetExecutingIndex(idx);
                            }
                        }
                    }));
                }
            };

            runner.OnProgressUpdated += (cycles, elapsed) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        if (_currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.GetCurrentProfile().Name == scriptKey)
                        {
                            lblCurrentClicksVal.Text = cycles.ToString();
                            lblCurrentTimeVal.Text = string.Format("{0:D2}:{1:D2}:{2:D2}",
                                (int)elapsed.TotalHours, elapsed.Minutes, elapsed.Seconds);
                        }
                    }));
                }
            };

            runner.OnStopped += () =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        HandleAsianRunnerStopped(scriptKey);
                    }));
                }
            };

            runner.Start(prof, pnlTabAdvanced.GetAllProfiles(), forceFreeMouse, chkSmoothMove != null && chkSmoothMove.Checked);
            pnlTabAdvanced.SetScriptRunning(scriptKey, true);
            pnlTabAdvanced.SetScriptEditingLocked(true);
        }

        private void StopActiveAsianScript()
        {
            if (pnlTabAdvanced == null) return;
            var prof = pnlTabAdvanced.GetCurrentProfile();
            if (prof == null) return;
            string scriptKey = !string.IsNullOrEmpty(prof.Name) ? prof.Name : "Script";

            if (_asianRunners.ContainsKey(scriptKey) && _asianRunners[scriptKey].IsRunning)
            {
                _asianRunners[scriptKey].Stop();
            }
        }

        private void HandleAsianRunnerStopped(string scriptKey)
        {
            if (pnlTabAdvanced != null)
            {
                pnlTabAdvanced.SetScriptRunning(scriptKey, false);
                if (pnlTabAdvanced.GetCurrentProfile() != null && pnlTabAdvanced.GetCurrentProfile().Name == scriptKey)
                {
                    pnlTabAdvanced.ClearHighlights();
                    pnlTabAdvanced.UpdateStatus();
                    pnlTabAdvanced.SetScriptEditingLocked(false);
                }
            }

            UpdateRunningState();
            UpdateMainStatusText();

            if (!IsAnyRunning)
            {
                if (overlayForm != null)
                {
                    overlayForm.SetExecutingIndex(-1);
                    overlayForm.SetClickThrough(false);
                    overlayForm.SetRunningMode(false, currentTheme.AccentPrimary);
                }
                if (titleBar != null) titleBar.IsRunning = false;
                HandleWindowFocusChanged(true);
            }
        }

        public void StopAll()
        {
            if (this.IsDisposed || !this.IsHandleCreated) return;
            if (this.InvokeRequired)
            {
                this.BeginInvoke((Action)(() => StopAll()));
                return;
            }

            // 1. Stop all 5 Simple engines
            for (int i = 0; i < 5; i++)
            {
                if (_simpleEngines[i] != null && _simpleEngines[i].IsRunning)
                {
                    _simpleEngines[i].Stop();
                }
            }

            // 2. Stop all Asian runners
            foreach (var kvp in _asianRunners)
            {
                if (kvp.Value != null && kvp.Value.IsRunning)
                {
                    kvp.Value.Stop();
                }
            }

            if (pnlTabAdvanced != null)
            {
                pnlTabAdvanced.ClearHighlights();
                pnlTabAdvanced.UpdateStatus();
                foreach (var name in pnlTabAdvanced.GetAvailableScriptNames())
                {
                    pnlTabAdvanced.SetScriptRunning(name, false);
                }
                pnlTabAdvanced.SetScriptEditingLocked(false);
            }

            if (overlayForm != null)
            {
                overlayForm.SetRunningMode(false, currentTheme.AccentPrimary);
                overlayForm.SetClickThrough(false);
                overlayForm.SetExecutingIndex(-1);
            }

            if (titleBar != null) titleBar.IsRunning = false;

            UpdateSimpleTabButtons();
            UpdateSimpleLocalUILock();
            UpdateRunningState();

            if (lblMainStatusInfo != null)
            {
                lblMainStatusInfo.Text = "Stopped ALL tasks.";
            }

            HandleWindowFocusChanged(true);
        }

        private int GetTotalRunningCount()
        {
            int count = 0;
            for (int i = 0; i < 5; i++)
            {
                if (_simpleEngines[i] != null && _simpleEngines[i].IsRunning) count++;
            }
            foreach (var r in _asianRunners.Values)
            {
                if (r != null && r.IsRunning) count++;
            }
            return count;
        }

        private void UpdateMainStatusText()
        {
            List<string> runningNames = new List<string>();
            for (int i = 0; i < 5; i++)
            {
                if (_simpleEngines[i] != null && _simpleEngines[i].IsRunning)
                {
                    runningNames.Add("Simple #" + (i + 1));
                }
            }
            if (_asianRunners != null)
            {
                foreach (var kvp in _asianRunners)
                {
                    if (kvp.Value != null && kvp.Value.IsRunning)
                    {
                        runningNames.Add("Asian " + kvp.Key);
                    }
                }
            }

            if (lblMainStatusInfo != null)
            {
                if (runningNames.Count == 0)
                {
                    UpdateTabStatus(_isBasicTab);
                }
                else if (runningNames.Count == 1)
                {
                    lblMainStatusInfo.Text = "Running: " + runningNames[0];
                }
                else
                {
                    lblMainStatusInfo.Text = string.Format("Running: {0} tasks ({1})", runningNames.Count, string.Join(", ", runningNames.ToArray()));
                }
            }
        }

        private void UpdateRunningState(bool? runningOverride = null)
        {
            bool isCurrentRunning = runningOverride.HasValue ? runningOverride.Value : IsActiveTabRunning;

            if (isCurrentRunning)
            {
                btnStart.Text = "Stop";
                btnStart.Subtitle = "(F6 to stop)";
                btnStart.NormalColor = currentTheme.Danger;
                btnStart.HoverColor = currentTheme.CRed;
                btnStart.ForeColor = Color.White;
                btnStart.IsDisabled = false;
                btnStart.Enabled = true;
                if (_startToolTip != null) _startToolTip.SetToolTip(btnStart, "Stop active tab (F6)");
                btnStart.Invalidate();
            }
            else
            {
                btnStart.Text = "Start";
                btnStart.Subtitle = "(F6)";
                btnStart.NormalColor = currentTheme.AccentPrimary;
                btnStart.HoverColor = currentTheme.AccentPrimaryHover;
                btnStart.ForeColor = Color.White;
                btnStart.Invalidate();
                UpdateStartButtonState();
            }

            // Local Lockout:
            // Tab navigation, 5 Simple tab buttons, and Global Settings are ALWAYS enabled!
            if (pnlTabBar != null) pnlTabBar.Enabled = true;
            if (pnlContentHost != null) pnlContentHost.Enabled = true;
            if (pnlGlobalSettings != null) pnlGlobalSettings.Enabled = true;
            if (btnTransformTool != null) btnTransformTool.Enabled = !isCurrentRunning;
            if (btnThemeToggle != null) btnThemeToggle.Enabled = true;

            if (_currentTabIndex == 1)
            {
                UpdateSimpleLocalUILock();
            }
            else if (_currentTabIndex == 2 && pnlTabAdvanced != null)
            {
                pnlTabAdvanced.SetScriptEditingLocked(isCurrentRunning);
            }

            if (titleBar != null) titleBar.IsRunning = IsAnyRunning;
        }

        public void SwitchSimpleTab(int targetIdx)
        {
            if (targetIdx < 0 || targetIdx >= 5 || targetIdx == _simpleTabIndex) return;

            // 1. Save current UI to old tab's profile
            SaveActiveSimpleProfileFromUI();

            // 2. Switch index
            _simpleTabIndex = targetIdx;
            AppSettings config = AppSettings.Load();
            config.ActiveSimpleTabIndex = targetIdx;

            // 3. Load target tab's profile to UI
            LoadSimpleProfileToUI(targetIdx, config);

            // 4. Update tab button visuals (active accent, running green dots)
            UpdateSimpleTabButtons();

            // 5. Update local UI lock (if target tab is running, lock edit controls)
            UpdateSimpleLocalUILock();

            // 6. Update Start button (Start / Stop) for the target tab
            UpdateStartButtonState();

            // 7. Update timer/clicks stats display
            UpdateSimpleStatsDisplay(targetIdx);

            // 8. Sync Map Overlay with target tab's points
            SyncOverlay();

            // 9. Update status bar with target tab's details
            UpdateTabStatus(_isBasicTab);
            UpdateMainStatusText();

            // 10. Persist active tab selection
            AppSettings.Save(config);
        }

        private void SaveActiveSimpleProfileFromUI()
        {
            AppSettings config = AppSettings.Load();
            SimpleProfileConfig prof = config.GetProfile(_simpleTabIndex);

            prof.IntervalMs = numInterval != null ? numInterval.Value : 250;
            prof.SimpleLoops = numSimpleLoop != null ? numSimpleLoop.Value : 0;
            prof.SimpleJitterPx = numSimpleJitter != null ? numSimpleJitter.Value : 0;
            prof.SimpleClickMode = (radModeCursor != null && radModeCursor.Checked) ? 1 : 0;
            prof.SimpleTargetProcessName = _simpleTargetProcessName ?? "";
            prof.SimpleTargetWindowTitle = _simpleTargetWindowTitle ?? "";
            prof.SimpleRelativeToWindow = _simpleRelativeToWindow;
            prof.Points = (lstPoints != null) ? lstPoints.GetPoints() : new List<Point>();

            AppSettings.Save(config);
        }

        private void LoadSimpleProfileToUI(int index, AppSettings config = null)
        {
            _isLoadingProfile = true;
            try
            {
                if (config == null) config = AppSettings.Load();
                SimpleProfileConfig prof = config.GetProfile(index);

                if (numInterval != null) numInterval.Value = Math.Max(1, prof.IntervalMs);
                if (numSimpleLoop != null) numSimpleLoop.Value = Math.Max(0, prof.SimpleLoops);
                if (numSimpleJitter != null) numSimpleJitter.Value = Math.Max(0, prof.SimpleJitterPx);

                if (prof.SimpleClickMode == 1)
                {
                    if (radModeCursor != null) radModeCursor.Checked = true;
                    SetSimpleClickMode(1);
                }
                else
                {
                    if (radModePoints != null) radModePoints.Checked = true;
                    SetSimpleClickMode(0);
                }

                _simpleTargetProcessName = prof.SimpleTargetProcessName ?? "";
                _simpleTargetWindowTitle = prof.SimpleTargetWindowTitle ?? "";
                _simpleRelativeToWindow = prof.SimpleRelativeToWindow;
                UpdateSimpleTargetWindowButtonDisplay();

                if (lstPoints != null)
                {
                    lstPoints.SetPoints(prof.Points ?? new List<Point>());
                }
                UpdatePointsHeader();
            }
            finally
            {
                _isLoadingProfile = false;
            }
            UpdateTabStatus(_isBasicTab);
        }

        private void UpdateSimpleStatsDisplay(int tabIdx)
        {
            if (_simpleEngines[tabIdx] != null && _simpleEngines[tabIdx].IsRunning)
            {
                lblCurrentClicksVal.Text = _simpleEngines[tabIdx].TotalClicks.ToString();
            }
            else
            {
                lblCurrentClicksVal.Text = "0";
                lblCurrentTimeVal.Text = "00:00:00";
            }
        }

        private void UpdateSimpleLocalUILock()
        {
            bool isCurrentRunning = _simpleEngines != null && _simpleTabIndex >= 0 && _simpleTabIndex < 5 &&
                                    _simpleEngines[_simpleTabIndex] != null && _simpleEngines[_simpleTabIndex].IsRunning;

            if (pnlClickMode != null) pnlClickMode.Enabled = !isCurrentRunning;
            if (pnlSimpleTarget != null) pnlSimpleTarget.Enabled = !isCurrentRunning;
            if (numInterval != null) numInterval.Enabled = !isCurrentRunning;
            if (numSimpleLoop != null) numSimpleLoop.Enabled = !isCurrentRunning;
            if (numSimpleJitter != null) numSimpleJitter.Enabled = !isCurrentRunning;
            if (btnClearList != null) btnClearList.Enabled = !isCurrentRunning;
            if (btnSaveList != null) btnSaveList.Enabled = !isCurrentRunning;
            if (btnLoadList != null) btnLoadList.Enabled = !isCurrentRunning;
            if (lstPoints != null) lstPoints.Enabled = !isCurrentRunning;
        }

        private void UpdateSimpleTabButtons()
        {
            ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();
            for (int i = 0; i < 5; i++)
            {
                if (btnSimpleTabs[i] == null) continue;

                bool isRunning = _simpleEngines != null && _simpleEngines[i] != null && _simpleEngines[i].IsRunning;
                bool isSelected = (i == _simpleTabIndex);

                string numStr = (i + 1).ToString();
                btnSimpleTabs[i].Text = numStr;

                if (isRunning)
                {
                    btnSimpleTabs[i].BorderWidth = 2;
                    btnSimpleTabs[i].BorderColor = Color.FromArgb(46, 204, 113);
                }
                else
                {
                    btnSimpleTabs[i].BorderWidth = 0;
                    btnSimpleTabs[i].BorderColor = Color.Empty;
                }

                if (isSelected)
                {
                    btnSimpleTabs[i].NormalColor = t.AccentPrimary;
                    btnSimpleTabs[i].HoverColor = t.AccentPrimaryHover;
                    btnSimpleTabs[i].ForeColor = Color.White;
                }
                else
                {
                    btnSimpleTabs[i].NormalColor = t.BgElevated;
                    btnSimpleTabs[i].HoverColor = isRunning ? Color.FromArgb(40, 180, 80) : t.AccentPrimary;
                    btnSimpleTabs[i].ForeColor = isRunning ? Color.FromArgb(100, 255, 140) : t.TextSecondary;
                }
                btnSimpleTabs[i].Invalidate();
            }
        }

        private void SavePointsToFile()
        {
            FileManager.SavePointsWithDialog(this, pointList);
        }

        private void LoadPointsFromFile()
        {
            FileManager.LoadPointsWithDialog(this, (points) =>
            {
                ClearPoints();
                foreach (Point p in points)
                {
                    AddPoint(p);
                }
            });
        }

        private void LoadSettings()
        {
            AppSettings config = AppSettings.Load();

            _simpleTabIndex = Math.Max(0, Math.Min(4, config.ActiveSimpleTabIndex));
            LoadSimpleProfileToUI(_simpleTabIndex, config);
            UpdateSimpleTabButtons();

            chkAlwaysOnTop.Checked = config.AlwaysOnTop;
            this.TopMost = config.AlwaysOnTop;

            chkShowMap.Checked = config.ShowMapOverlay;
            if (chkFreeMouse != null) chkFreeMouse.Checked = config.FreeMouseMode;
            if (chkSmoothMove != null) chkSmoothMove.Checked = config.SmoothMouseMove;
            if (chkHideRunningRing != null) chkHideRunningRing.Checked = config.HideRunningRing;

            if (!config.IsDarkTheme)
            {
                ApplyTheme(ThemeTokens.LightTheme());
            }

            if (!string.IsNullOrEmpty(config.AdvancedProfileJson))
            {
                ModernAutoClicker.Advanced.MacroProject project = ModernAutoClicker.Advanced.MacroStorage.ProjectFromJson(config.AdvancedProfileJson);
                if (project != null && project.Profiles != null && project.Profiles.Count > 0 && pnlTabAdvanced != null)
                {
                    pnlTabAdvanced.SetAllProfiles(project.Profiles, project.ActiveIndex);
                }
            }

            if (config.IsAdvancedTab)
            {
                SwitchTab(2);
            }
            else
            {
                SwitchTab(1);
            }
        }

        private void SaveSettings()
        {
            AppSettings config = AppSettings.Load();

            // 1. Sync current UI into active Simple profile
            SimpleProfileConfig prof = config.GetProfile(_simpleTabIndex);
            prof.IntervalMs = (numInterval != null) ? numInterval.Value : 250;
            prof.SimpleLoops = (numSimpleLoop != null) ? numSimpleLoop.Value : 0;
            prof.SimpleJitterPx = (numSimpleJitter != null) ? numSimpleJitter.Value : 0;
            prof.SimpleClickMode = (radModeCursor != null && radModeCursor.Checked) ? 1 : 0;
            prof.SimpleTargetProcessName = _simpleTargetProcessName ?? "";
            prof.SimpleTargetWindowTitle = _simpleTargetWindowTitle ?? "";
            prof.SimpleRelativeToWindow = _simpleRelativeToWindow;
            prof.Points = (lstPoints != null) ? lstPoints.GetPoints() : new List<Point>();

            // 2. Global settings
            config.ActiveSimpleTabIndex = _simpleTabIndex;
            config.AlwaysOnTop = chkAlwaysOnTop.Checked;
            config.ShowMapOverlay = chkShowMap.Checked;
            config.FreeMouseMode = (chkFreeMouse != null && chkFreeMouse.Checked);
            config.SmoothMouseMove = (chkSmoothMove != null && chkSmoothMove.Checked);
            config.HideRunningRing = (chkHideRunningRing != null && chkHideRunningRing.Checked);
            config.IsDarkTheme = currentTheme.IsDark;
            config.IsAdvancedTab = !_isBasicTab;
            config.AdvancedProfileJson = (pnlTabAdvanced != null) ? ModernAutoClicker.Advanced.MacroStorage.ProjectToJson(pnlTabAdvanced.GetAllProfiles(), pnlTabAdvanced.ActiveProfileIndex) : null;

            AppSettings.Save(config);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            SaveSettings();
            UnregisterGlobalHotkeys();
            StopAll();
            if (overlayForm != null && !overlayForm.IsDisposed)
            {
                overlayForm.Close();
            }
            if (_unfocusFilter != null)
            {
                Application.RemoveMessageFilter(_unfocusFilter);
            }
            if (_windowTracker != null)
            {
                _windowTracker.Dispose();
                _windowTracker = null;
            }
            if (_startToolTip != null)
            {
                _startToolTip.Dispose();
                _startToolTip = null;
            }
        }
    }

    public class UnfocusClickFilter : IMessageFilter
    {
        private readonly Form _form;

        public UnfocusClickFilter(Form form)
        {
            _form = form;
        }

        public bool PreFilterMessage(ref Message m)
        {
            // WM_LBUTTONDOWN = 0x0201, WM_RBUTTONDOWN = 0x0204, WM_NCLBUTTONDOWN = 0x00A1
            if (m.Msg == 0x0201 || m.Msg == 0x0204 || m.Msg == 0x00A1)
            {
                if (_form != null && !_form.IsDisposed && _form.IsHandleCreated)
                {
                    Control deep = GetDeepActiveControl(_form);
                    if (deep is TextBox || deep is NumberInput)
                    {
                        Control clicked = Control.FromHandle(m.HWnd);
                        if (clicked == null || (clicked != deep && !IsChildOf(clicked, deep)))
                        {
                            if (clicked != null && clicked.CanFocus && !(clicked is Panel) && !(clicked is Label))
                            {
                                clicked.Focus();
                            }
                            else
                            {
                                _form.ActiveControl = null;
                            }
                        }
                    }
                }
            }
            return false;
        }

        private static Control GetDeepActiveControl(ContainerControl container)
        {
            if (container == null) return null;
            Control c = container.ActiveControl;
            while (c is ContainerControl)
            {
                Control child = ((ContainerControl)c).ActiveControl;
                if (child == null) break;
                c = child;
            }
            return c;
        }

        private static bool IsChildOf(Control child, Control parent)
        {
            Control current = child;
            while (current != null)
            {
                if (current == parent) return true;
                current = current.Parent;
            }
            return false;
        }
    }
}
