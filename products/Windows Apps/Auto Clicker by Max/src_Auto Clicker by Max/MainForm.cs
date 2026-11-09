using Loc = ModernAutoClicker.Localization.Loc;
using AppLanguage = ModernAutoClicker.Localization.AppLanguage;
using MaxApp.Common;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker
{
    public partial class MainForm : Form
    {
        private ClickEngine[] _simpleEngines = new ClickEngine[AppSettings.SimpleTabCount];
        private Dictionary<string, ModernAutoClicker.Advanced.MacroRunner> _asianRunners = new Dictionary<string, ModernAutoClicker.Advanced.MacroRunner>(StringComparer.OrdinalIgnoreCase);
        private ModernAutoClicker.Advanced.MacroRunner _defaultAsianRunner = new ModernAutoClicker.Advanced.MacroRunner();

        // Legacy compatibility properties delegating to active tab engine/runner
        private ClickEngine engine { get { return (_simpleEngines != null && _simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) ? _simpleEngines[_simpleTabIndex] : null; } }
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
                    for (int i = 0; i < AppSettings.SimpleTabCount; i++)
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
                    return _simpleEngines != null && _simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount &&
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

        // The status line above Start shows the open tab's live numbers while it runs; the Asian runner only reports at the end of a loop, so the UI polls
        private const int RunStatsRefreshMs = 250;
        private System.Windows.Forms.Timer _runStatsTimer;
        private bool _statusShowsRunStats = false;

        // Tabs that lose the same window notice it within a moment of each other: wait briefly so one popup covers them
        private const int TargetProblemBatchMs = 300;
        private System.Windows.Forms.Timer _targetProblemTimer;
        private readonly List<TargetProblem> _pendingTargetProblems = new List<TargetProblem>();
        private bool _targetDialogOpen = false;

        private ThemeTokens currentTheme;
        private List<Point> pointList { get { return lstPoints != null ? lstPoints.GetPoints() : new List<Point>(); } }
        private OverlayForm overlayForm;
        private int _mapOverlayOpacity = 60;
        private bool _isOverlayDragDispatching = false;

        private const int WM_ACTIVATE = 0x0006;
        private const int WM_ACTIVATEAPP = 0x001C;
        private const int WM_NCACTIVATE = 0x0086;
        private const int WA_INACTIVE = 0;
        private bool _isWindowActive = true;

        private const int WM_NCHITTEST = 0x0084;
        private const int HTLEFT = 10;
        private const int HTRIGHT = 11;
        private const int HTTOP = 12;
        private const int HTTOPLEFT = 13;
        private const int HTTOPRIGHT = 14;
        private const int HTBOTTOM = 15;
        private const int HTBOTTOMLEFT = 16;
        private const int HTBOTTOMRIGHT = 17;

        private int _savedAsianWidth = 700;
        private int _savedAsianHeight = 760;
        private bool _isResizing = false;

        private string _simpleTargetProcessName = "";
        private string _simpleTargetWindowTitle = "";
        private bool _simpleRelativeToWindow = false;
        private int[] _simpleTargetWindowIndices = new int[AppSettings.SimpleTabCount];
        private int _simpleTargetWindowIndex
        {
            get { return (_simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) ? _simpleTargetWindowIndices[_simpleTabIndex] : 0; }
            set { if (_simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) _simpleTargetWindowIndices[_simpleTabIndex] = value; }
        }
        private IntPtr[] _simpleTargetHwnds = new IntPtr[AppSettings.SimpleTabCount];
        private IntPtr _simpleTargetHwnd
        {
            get { return (_simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) ? _simpleTargetHwnds[_simpleTabIndex] : IntPtr.Zero; }
            set { if (_simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) _simpleTargetHwnds[_simpleTabIndex] = value; }
        }
        private uint[] _simpleTargetPids = new uint[AppSettings.SimpleTabCount];
        private uint _simpleTargetPid
        {
            get { return (_simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) ? _simpleTargetPids[_simpleTabIndex] : 0; }
            set { if (_simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount) _simpleTargetPids[_simpleTabIndex] = value; }
        }
        private WindowTracker _windowTracker;
        private UnfocusClickFilter _unfocusFilter;
        private ToolTip _startToolTip;
        private bool _isLoadingProfile = false;
        private bool _isFirstRun = false;

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
            AppInfo.WebsiteSlug = "auto-clicker.html";
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
                AutoPopDelay = 12000,
                ShowAlways = true
            };

            _runStatsTimer = new System.Windows.Forms.Timer { Interval = RunStatsRefreshMs };
            _runStatsTimer.Tick += (s, e) => RefreshRunStats();

            _targetProblemTimer = new System.Windows.Forms.Timer { Interval = TargetProblemBatchMs };
            _targetProblemTimer.Tick += (s, e) => ShowPendingTargetProblems();

            if (chkFreeMouse != null)
            {
                _startToolTip.SetToolTip(chkFreeMouse, Loc.ChkFreeMouseTooltip);
            }

            if (btnMapOpacity != null)
            {
                btnMapOpacity.Click += (s, e) => ShowOpacityMenu();
                _startToolTip.SetToolTip(btnMapOpacity, Loc.TipMapOpacity);
            }
            if (chkShowMap != null)
            {
                chkShowMap.MouseUp += (s, e) =>
                {
                    if (e.Button == MouseButtons.Right)
                    {
                        ShowOpacityMenu(Cursor.Position);
                    }
                };
            }

            if (titleBar != null)
            {
                titleBar.OnLanguageToggleRequested += () =>
                {
                    Loc.CurrentLanguage = Loc.IsVietnamese ? AppLanguage.English : AppLanguage.Vietnamese;
                    SaveSettings();
                };
                titleBar.OnThemeToggleRequested += () =>
                {
                    ToggleTheme();
                };
            }

            Loc.OnLanguageChanged += () =>
            {
                ApplyLanguage();
            };

            LoadSettings();

            _unfocusFilter = new UnfocusClickFilter(this);
            Application.AddMessageFilter(_unfocusFilter);

            for (int i = 0; i < AppSettings.SimpleTabCount; i++)
            {
                int tabIdx = i;
                _simpleEngines[i] = new ClickEngine();
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

                _simpleEngines[i].OnTargetLost += (problem) =>
                {
                    if (this.IsHandleCreated)
                    {
                        problem.SimpleTabIndex = tabIdx;
                        this.BeginInvoke((Action)(() => QueueTargetProblem(problem)));
                    }
                };

                _simpleEngines[i].OnRunFailed += (ex) =>
                {
                    if (this.IsHandleCreated)
                    {
                        this.BeginInvoke((Action)(() => ShowRunFailure(Loc.RunningSimpleName(tabIdx + 1), ex)));
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
                    if (!_isBasicTab && lblMainStatusInfo != null && GetTabRunStats() == null)
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
            _windowTracker.SimpleTargetHwnd = () => _simpleTargetHwnd;
            _windowTracker.SimpleTargetProcessName = () => _simpleTargetProcessName;
            _windowTracker.SimpleTargetWindowTitle = () => _simpleTargetWindowTitle;
            _windowTracker.SimpleTargetWindowIndex = () => _simpleTargetWindowIndex;
            _windowTracker.SimpleTargetPid = () => _simpleTargetPid;
            _windowTracker.GetAdvancedSteps = () => (pnlTabAdvanced != null && pnlTabAdvanced.Table != null) ? pnlTabAdvanced.Table.GetSteps() : null;
            _windowTracker.OnPositionsChanged += () => SyncOverlay();
            _windowTracker.Start();

            ActionRecorder.Instance.IsClickOnAppWindow = (pt) =>
            {
                try
                {
                    if (this.IsDisposed) return false;
                    if (this.Bounds.Contains(pt)) return true;
                    foreach (Form owned in this.OwnedForms)
                    {
                        if (owned != null && owned.Visible && owned.Bounds.Contains(pt)) return true;
                    }
                }
                catch (Exception caught) { AppLog.Caught(caught); }
                return false;
            };
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
            UpdateRunningState();
            UpdateStartButtonState();

            // First-launch language prompt
            if (_isFirstRun)
            {
                _isFirstRun = false;
                using (UI_FirstRunLanguageDialog langDlg = new UI_FirstRunLanguageDialog())
                {
                    if (langDlg.ShowDialog(this) == DialogResult.OK)
                    {
                        Loc.CurrentLanguage = (AppLanguage)langDlg.SelectedLanguage;
                    }
                    else
                    {
                        Loc.CurrentLanguage = AppLanguage.English;
                    }
                    SaveSettings();
                }
            }

            // Background automatic update check (Runs after 2.5s, checks at most once a day, never blocks UI)
            MaxApp.Common.UpdateChecker.GetLastCheckDateHandler = () => { try { return AppSettings.Load().LastUpdateCheckDate; } catch { return null; } };
            MaxApp.Common.UpdateChecker.SetLastCheckDateHandler = (d) => { try { var cfg = AppSettings.Load(); cfg.LastUpdateCheckDate = d; AppSettings.Save(cfg); } catch (Exception caught) { AppLog.Caught(caught); } };

            System.Windows.Forms.Timer autoUpdateTimer = new System.Windows.Forms.Timer { Interval = 2500 };
            autoUpdateTimer.Tick += (s, args) =>
            {
                autoUpdateTimer.Stop();
                autoUpdateTimer.Dispose();
                UpdateChecker.CheckForUpdatesAsync(false, this);
            };
            autoUpdateTimer.Start();

            ReportSettingsProblem();
        }

        private readonly HashSet<SettingsProblem> _reportedSettingsProblems = new HashSet<SettingsProblem>();

        // Saving happens all the time, so each kind of problem is told once per session
        private void ReportSettingsProblem()
        {
            if (!this.IsHandleCreated) return;

            SettingsProblem problem = AppSettings.TakeProblem();
            if (problem == SettingsProblem.None || !_reportedSettingsProblems.Add(problem)) return;

            string message;
            switch (problem)
            {
                case SettingsProblem.CouldNotRead: message = Loc.SettingsCouldNotRead; break;
                case SettingsProblem.RestoredFromBackup: message = Loc.SettingsRestored; break;
                case SettingsProblem.ResetToDefaults: message = Loc.SettingsReset; break;
                default: message = Loc.SettingsCouldNotSave; break;
            }
            this.BeginInvoke((Action)(() => ModernMessageBox.Show(message, Loc.SettingsProblemTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning, this)));
        }

        private void ShowRunFailure(string runName, Exception ex)
        {
            ModernMessageBox.Show(Loc.RunFailedMessage(runName, ex.Message), Loc.RunFailedTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, this);
        }

        public void UpdateFormRegion()
        {
            WindowHelper.ApplyRoundedCorners(this, smallCorners: true);
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (_currentTabIndex == 2 && this.WindowState != FormWindowState.Minimized)
            {
                ApplyAsianDynamicLayout(this.ClientSize.Width, this.ClientSize.Height);
            }
            if (!_isResizing)
            {
                UpdateFormRegion();
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (this.FormBorderStyle == FormBorderStyle.None && _currentTabIndex != 2)
            {
                ThemeTokens t = currentTheme ?? ThemeTokens.DarkTheme();
                WindowHelper.DrawWindowBorder(e.Graphics, this, t.BorderColor, t.FormRadius);
            }
        }

        private void RegisterGlobalHotkeys()
        {
            if (this.IsHandleCreated)
            {
                NativeMethods.UnregisterHotKey(this.Handle, NativeMethods.HOTKEY_START_ID);
                NativeMethods.UnregisterHotKey(this.Handle, NativeMethods.HOTKEY_STOP_ALL_ID);

                List<string> taken = new List<string>();
                if (!NativeMethods.RegisterHotKey(this.Handle, NativeMethods.HOTKEY_START_ID, 0, (uint)Keys.F6)) taken.Add("F6");
                if (!NativeMethods.RegisterHotKey(this.Handle, NativeMethods.HOTKEY_STOP_ALL_ID, 0, (uint)Keys.F7)) taken.Add("F7");

                // Without F7 there is no way to stop a run from another window, so this cannot stay silent
                if (taken.Count > 0)
                {
                    string keys = string.Join(", ", taken.ToArray());
                    this.BeginInvoke((Action)(() => ModernMessageBox.Show(Loc.HotkeyTakenMessage(keys), Loc.HotkeyTakenTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning, this)));
                }
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

            // If user is currently recording actions, pressing F6 stops the recording
            if (ActionRecorder.Instance.IsRecording)
            {
                ActionRecorder.Instance.StopRecording();
                if (lblMainStatusInfo != null)
                {
                    lblMainStatusInfo.Text = Loc.StatusRecordingStopped;
                }
                return;
            }

            if (IsActiveTabRunning)
            {
                StopAutoClick();
            }
            else
            {
                // Global hotkeys still arrive while a popup locks this window: a run can be stopped, nothing new may start
                if (WindowHelper.IsBlockedByDialog(this)) return;

                if (!CanStartAutoClick())
                {
                    string reason = Loc.TipAddPointsOrSteps;
                    if (_currentTabIndex == 1 && radModePoints != null && radModePoints.Checked)
                    {
                        reason = Loc.TipNoPoints;
                    }
                    else if (_currentTabIndex == 2)
                    {
                        reason = Loc.TipNoSteps;
                    }
                    else if (_currentTabIndex == 0)
                    {
                        reason = Loc.TipSwitchTab;
                    }

                    if (lblMainStatusInfo != null)
                    {
                        lblMainStatusInfo.Text = Loc.StatusCannotStart(reason);
                    }

                    if (_startToolTip != null && btnStart != null && btnStart.IsHandleCreated)
                    {
                        _startToolTip.Show(reason, btnStart, btnStart.Width / 2, btnStart.Height + 4, 3000);
                    }

                    try { System.Media.SystemSounds.Beep.Play(); } catch (Exception caught) { AppLog.Caught(caught); }
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
                uint currentPid = NativeMethods.CurrentProcessId;
                if (fgPid == currentPid)
                {
                    return true;
                }
            }
            catch (Exception caught) { AppLog.Caught(caught); }

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
            if (m.Msg == WM_NCHITTEST && _currentTabIndex == 2)
            {
                int x = (short)(m.LParam.ToInt32() & 0xFFFF);
                int y = (short)((m.LParam.ToInt32() >> 16) & 0xFFFF);
                Point pt = this.PointToClient(new Point(x, y));
                const int grip = 8;

                bool left = pt.X <= grip;
                bool right = pt.X >= this.ClientSize.Width - grip;
                bool top = pt.Y <= grip;
                bool bottom = pt.Y >= this.ClientSize.Height - grip;

                if (top && left) { m.Result = (IntPtr)HTTOPLEFT; return; }
                if (top && right) { m.Result = (IntPtr)HTTOPRIGHT; return; }
                if (bottom && left) { m.Result = (IntPtr)HTBOTTOMLEFT; return; }
                if (bottom && right) { m.Result = (IntPtr)HTBOTTOMRIGHT; return; }
                if (left) { m.Result = (IntPtr)HTLEFT; return; }
                if (right) { m.Result = (IntPtr)HTRIGHT; return; }
                if (top) { m.Result = (IntPtr)HTTOP; return; }
                if (bottom) { m.Result = (IntPtr)HTBOTTOM; return; }
            }
            if (m.Msg == WM_ENTERSIZEMOVE)
            {
                _isResizing = true;
                if (pnlTabAdvanced != null && pnlTabAdvanced.VFX != null && pnlTabAdvanced.VFX.IsActive)
                {
                    pnlTabAdvanced.VFX.Stop();
                }
                if (_windowTracker != null) _windowTracker.Pause();
            }
            else if (m.Msg == WM_EXITSIZEMOVE)
            {
                _isResizing = false;
                if (_currentTabIndex == 2 && this.WindowState != FormWindowState.Minimized)
                {
                    _savedAsianWidth = Math.Max(700, this.Width);
                    _savedAsianHeight = Math.Max(AsianMinHeight, this.Height);
                    SaveSettings();
                }
                UpdateFormRegion();
                if (_currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.VFX != null)
                {
                    pnlTabAdvanced.VFX.Start();
                }
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
                    if (_simpleRelativeToWindow && (_simpleTargetHwnd != IntPtr.Zero || !string.IsNullOrEmpty(_simpleTargetProcessName) || !string.IsNullOrEmpty(_simpleTargetWindowTitle)))
                    {
                        IntPtr hWnd = _simpleTargetHwnd;
                        if (!NativeMethods.IsValidWindowHandle(hWnd, _simpleTargetPid, _simpleTargetProcessName))
                        {
                            hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle, _simpleTargetWindowIndex, _simpleTargetPid);
                            if (hWnd != IntPtr.Zero)
                            {
                                _simpleTargetHwnd = hWnd;
                                uint pr;
                                NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                if (pr > 0) _simpleTargetPid = pr;
                            }
                            else
                            {
                                _simpleTargetHwnd = IntPtr.Zero;
                            }
                        }
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

                        uint pid = 0;
                        if (hWnd != IntPtr.Zero && NativeMethods.IsWindow(hWnd) && NativeMethods.IsWindowVisible(hWnd) && !NativeMethods.IsIconic(hWnd))
                        {
                            uint myPid = NativeMethods.CurrentProcessId;
                            NativeMethods.GetWindowThreadProcessId(hWnd, out pid);

                            if (pid != myPid && pid != 0)
                            {
                                var sbClass = new System.Text.StringBuilder(256);
                                NativeMethods.GetClassName(hWnd, sbClass, sbClass.Capacity);
                                string className = sbClass.ToString();

                                if (className != "WorkerW" && className != "Shell_TrayWnd" && className != "Windows.UI.Core.CoreWindow")
                                {
                                    string pName = "";
                                    try
                                    {
                                        var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                                        pName = proc.ProcessName;
                                    }
                                    catch (Exception) { /* The process ended or cannot be opened: the name stays empty */ }

                                    int len = NativeMethods.GetWindowTextLength(hWnd);
                                    string title = "";
                                    if (len > 0)
                                    {
                                        var sb = new System.Text.StringBuilder(len + 1);
                                        NativeMethods.GetWindowText(hWnd, sb, sb.Capacity);
                                        title = sb.ToString().Trim();
                                    }

                                    if (className == "Progman")
                                    {
                                        title = "Windows Desktop";
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
                            WindowHwnd = isInsideTarget ? hWnd : IntPtr.Zero,
                            TargetPid = isInsideTarget ? pid : 0,
                            ProcessName = isInsideTarget ? targetProc : "",
                            WindowTitle = isInsideTarget ? targetTitle : "",
                            WindowIndex = isInsideTarget ? NativeMethods.ResolveWindowIndex(hWnd) : 0,
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

            TargetWindowMenu.Show(btnSimpleTargetWindow, currentTheme, (window) =>
            {
                _simpleRelativeToWindow = window != null;
                _simpleTargetHwnd = window != null ? window.Hwnd : IntPtr.Zero;
                _simpleTargetPid = window != null ? window.ProcessId : 0;
                _simpleTargetProcessName = window != null ? window.ProcessName : "";
                _simpleTargetWindowTitle = window != null ? window.Title : "";
                _simpleTargetWindowIndex = window != null ? window.WindowIndex : 0;
                UpdateSimpleTargetWindowButtonDisplay();
                SyncOverlay();
                SaveSettings();
            }, () => { btnSimpleTargetWindow.IsOpen = false; });
        }

        private void UpdateSimpleTargetWindowButtonDisplay()
        {
            if (btnSimpleTargetWindow == null) return;

            if (_simpleRelativeToWindow && !string.IsNullOrEmpty(_simpleTargetProcessName))
            {
                string appName = NativeMethods.GetProcessFriendlyName(_simpleTargetProcessName);
                if (string.IsNullOrEmpty(appName)) appName = _simpleTargetProcessName;

                string title = (_simpleTargetWindowTitle ?? "").Trim();
                string display;
                if (!string.IsNullOrEmpty(title) && !string.Equals(title, appName, StringComparison.OrdinalIgnoreCase))
                {
                    if (title.IndexOf("BlueStacks", StringComparison.OrdinalIgnoreCase) >= 0)
                        display = title;
                    else
                        display = string.Format("{0} - {1}", appName, title);
                }
                else
                {
                    display = appName;
                }

                if (_simpleTargetPid > 0)
                {
                    string winSuffix = _simpleTargetWindowIndex > 0 ? string.Format(" #{0}", _simpleTargetWindowIndex) : "";
                    display = string.Format("{0} [{1}{2}]", display, _simpleTargetPid, winSuffix);
                }
                else if (_simpleTargetWindowIndex > 0)
                {
                    display = string.Format("{0} ({1})", display, _simpleTargetWindowIndex);
                }

                if (display.Length > 27) display = display.Substring(0, 24) + "...";

                btnSimpleTargetWindow.Image = IconCache.GetProcessIcon(_simpleTargetProcessName, _simpleTargetWindowTitle) ?? IconCache.GenericAppIcon;
                btnSimpleTargetWindow.Text = display;
                btnSimpleTargetWindow.CustomTextColor = currentTheme != null ? currentTheme.CBlue : Color.Empty;
            }
            else
            {
                btnSimpleTargetWindow.Image = IconCache.DesktopIcon;
                btnSimpleTargetWindow.Text = Loc.TargetAllScreens;
                btnSimpleTargetWindow.CustomTextColor = currentTheme != null ? currentTheme.TextPrimary : Color.Empty;
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
                if (_simpleRelativeToWindow)
                {
                    IntPtr hWnd = _simpleTargetHwnd;
                    if (!NativeMethods.IsValidWindowHandle(hWnd, _simpleTargetPid, _simpleTargetProcessName))
                    {
                        if (winInfo != null && winInfo.Hwnd != IntPtr.Zero && NativeMethods.IsValidWindowHandle(winInfo.Hwnd, winInfo.ProcessId, winInfo.ProcessName))
                        {
                            hWnd = winInfo.Hwnd;
                            _simpleTargetHwnd = hWnd;
                            _simpleTargetPid = winInfo.ProcessId;
                            _simpleTargetProcessName = winInfo.ProcessName;
                            _simpleTargetWindowTitle = winInfo.Title;
                            _simpleTargetWindowIndex = winInfo.WindowIndex;
                            UpdateSimpleTargetWindowButtonDisplay();
                        }
                        else
                        {
                            hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle, _simpleTargetWindowIndex, _simpleTargetPid);
                            if (hWnd != IntPtr.Zero)
                            {
                                _simpleTargetHwnd = hWnd;
                                uint pr;
                                NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                if (pr > 0) _simpleTargetPid = pr;
                            }
                        }
                    }

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
                    lblHeaderList.Text = Loc.HeaderFollowCursorMode;
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
                if (lblHeaderList != null) lblHeaderList.Text = Loc.CursorGuideTitle;
                return;
            }
            if (lblHeaderList != null && lstPoints != null)
            {
                lblHeaderList.Text = Loc.HeaderTargetPoints(lstPoints.Count);
            }
        }

        private void InitOverlayForm()
        {
            if (overlayForm != null && !overlayForm.IsDisposed) return;

            overlayForm = new OverlayForm();
            overlayForm.SetMapOpacity(_mapOverlayOpacity);
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
                                IntPtr hWnd = _simpleTargetHwnd;
                                if (!NativeMethods.IsValidWindowHandle(hWnd, _simpleTargetPid, _simpleTargetProcessName))
                                {
                                    hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle, _simpleTargetWindowIndex, _simpleTargetPid);
                                    if (hWnd != IntPtr.Zero)
                                    {
                                        _simpleTargetHwnd = hWnd;
                                        uint pr;
                                        NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                        if (pr > 0) _simpleTargetPid = pr;
                                    }
                                }
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
                    if (_isOverlayDragDispatching) return;
                    _isOverlayDragDispatching = true;
                    this.BeginInvoke((Action)(() =>
                    {
                        try
                        {
                            if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                            {
                                Point savePt = newPt;
                                var steps = pnlTabAdvanced.Table.GetSteps();
                                if (steps != null && stepIdx >= 0 && stepIdx < steps.Count)
                                {
                                    var s = steps[stepIdx];
                                    if (s.RelativeToWindow && (s.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(s.ProcessName)))
                                    {
                                        IntPtr hWnd = s.WindowHwnd;
                                        if (!NativeMethods.IsValidWindowHandle(hWnd, s.TargetPid, s.ProcessName))
                                        {
                                            hWnd = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle, s.WindowIndex, s.TargetPid);
                                            if (hWnd != IntPtr.Zero)
                                            {
                                                s.WindowHwnd = hWnd;
                                                uint pr;
                                                NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                                if (pr > 0) s.TargetPid = pr;
                                            }
                                        }
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
                                pnlTabAdvanced.Table.UpdateStepPointOnly(stepIdx, isStart, savePt);
                            }
                        }
                        finally
                        {
                            _isOverlayDragDispatching = false;
                        }
                    }));
                }
            };

            overlayForm.OnAdvancedAreaMoved += (stepIdx, startPt, endPt) =>
            {
                if (this.IsHandleCreated)
                {
                    if (_isOverlayDragDispatching) return;
                    _isOverlayDragDispatching = true;
                    this.BeginInvoke((Action)(() =>
                    {
                        try
                        {
                            if (pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
                            {
                                Point saveStartPt = startPt;
                                Point saveEndPt = endPt;
                                var steps = pnlTabAdvanced.Table.GetSteps();
                                if (steps != null && stepIdx >= 0 && stepIdx < steps.Count)
                                {
                                    var s = steps[stepIdx];
                                    if (s.RelativeToWindow && (s.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(s.ProcessName)))
                                    {
                                        IntPtr hWnd = s.WindowHwnd;
                                        if (!NativeMethods.IsValidWindowHandle(hWnd, s.TargetPid, s.ProcessName))
                                        {
                                            hWnd = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle, s.WindowIndex, s.TargetPid);
                                            if (hWnd != IntPtr.Zero)
                                            {
                                                s.WindowHwnd = hWnd;
                                                uint pr;
                                                NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                                if (pr > 0) s.TargetPid = pr;
                                            }
                                        }
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
                                pnlTabAdvanced.Table.UpdateStepAreaOnly(stepIdx, saveStartPt, saveEndPt);
                            }
                        }
                        finally
                        {
                            _isOverlayDragDispatching = false;
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
                        if (pnlTabAdvanced != null)
                        {
                            pnlTabAdvanced.UpdateStatus();
                        }
                        SyncOverlay();
                    }));
                }
            };

            // Always show the transparent layer immediately upon creation!
            overlayForm.ShowOverlay();
        }

        private void SetMapOverlayOpacity(int percent)
        {
            _mapOverlayOpacity = Math.Max(10, Math.Min(100, percent));
            if (btnMapOpacity != null)
            {
                btnMapOpacity.Text = _mapOverlayOpacity + "% ▾";
            }
            UpdateSettingsHeader();
            InitOverlayForm();
            if (overlayForm != null)
            {
                overlayForm.SetMapOpacity(_mapOverlayOpacity);
            }
            if (chkShowMap != null && !chkShowMap.Checked)
            {
                chkShowMap.Checked = true;
            }
            else
            {
                SyncOverlay();
            }
            SaveSettings();
        }

        private void ShowOpacityMenu(Point? screenPos = null)
        {
            if (btnMapOpacity == null) return;

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(currentTheme);
            menu.ShowImageMargin = false;
            menu.Closed += (s, e) => { btnMapOpacity.BeginInvoke((Action)(() => menu.Dispose())); };

            int[] presets = new int[] { 100, 80, 60, 40, 20 };

            for (int i = 0; i < presets.Length; i++)
            {
                int val = presets[i];
                string lbl = (val == _mapOverlayOpacity) ? "● " + val + "%" : "   " + val + "%";

                ToolStripMenuItem item = new ToolStripMenuItem(lbl);
                if (val == _mapOverlayOpacity)
                {
                    item.Font = ThemeTokens.FontBase(FontStyle.Bold);
                }
                int chosenVal = val;
                item.Click += (s, e) =>
                {
                    SetMapOverlayOpacity(chosenVal);
                };
                menu.Items.Add(item);
            }

            Point pt = screenPos.HasValue ? screenPos.Value : btnMapOpacity.PointToScreen(new Point(0, btnMapOpacity.Height + 2));
            menu.Show(pt);
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
                        IntPtr hWnd = _simpleTargetHwnd;
                        if (!NativeMethods.IsValidWindowHandle(hWnd, _simpleTargetPid, _simpleTargetProcessName))
                        {
                            hWnd = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle, _simpleTargetWindowIndex, _simpleTargetPid);
                            if (hWnd != IntPtr.Zero)
                            {
                                _simpleTargetHwnd = hWnd;
                                uint pr;
                                NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                if (pr > 0) _simpleTargetPid = pr;
                            }
                            else
                            {
                                _simpleTargetHwnd = IntPtr.Zero;
                            }
                        }
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
                                if (s.RelativeToWindow && (s.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(s.ProcessName)))
                                {
                                    IntPtr hWnd = s.WindowHwnd;
                                    if (!NativeMethods.IsValidWindowHandle(hWnd, s.TargetPid, s.ProcessName))
                                    {
                                        hWnd = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle, s.WindowIndex, s.TargetPid);
                                        if (hWnd != IntPtr.Zero)
                                        {
                                            s.WindowHwnd = hWnd;
                                            uint pr;
                                            NativeMethods.GetWindowThreadProcessId(hWnd, out pr);
                                            if (pr > 0) s.TargetPid = pr;
                                        }
                                        else
                                        {
                                            s.WindowHwnd = IntPtr.Zero;
                                        }
                                    }
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
                    HashSet<int> selectedIndices = (pnlTabAdvanced != null && pnlTabAdvanced.Table != null) ? pnlTabAdvanced.Table.SelectedIndices : new HashSet<int>();
                    dlg.LoadAdvancedSteps(steps, maxW, maxH, selectedIndices);
                }

                dlg.ShowModal(this);
            }

            SyncOverlay();
            SaveSettings();
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
                if (ActionRecorder.Instance.IsRecording)
                {
                    ActionRecorder.Instance.StopRecording();
                    if (lblMainStatusInfo != null)
                    {
                        lblMainStatusInfo.Text = Loc.StatusRecordingStopped;
                    }
                    return true;
                }
                ToggleStartStop();
                return true;
            }

            // Ctrl+A on the Asian tab must not depend on focus being inside the step table (clicking labels or empty space never moves focus there)
            if (keyData == (Keys.Control | Keys.A) && _currentTabIndex == 2 && pnlTabAdvanced != null && pnlTabAdvanced.Table != null)
            {
                pnlTabAdvanced.Table.HandleSelectAllShortcut();
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
                btnStart.Icon = null;
                btnStart.Text = Loc.BtnStopRun;
                btnStart.Subtitle = Loc.BtnStopRunHint;
                btnStart.NormalColor = currentTheme.Danger;
                btnStart.HoverColor = currentTheme.CRed;
                btnStart.ForeColor = Color.White;
                if (_startToolTip != null) _startToolTip.SetToolTip(btnStart, Loc.TipStopActiveTab);
                btnStart.Invalidate();
                return;
            }

            btnStart.Text = Loc.BtnStart;
            btnStart.Subtitle = "(F6)";
            btnStart.NormalColor = currentTheme.AccentPrimary;
            btnStart.HoverColor = currentTheme.AccentPrimaryHover;
            btnStart.ForeColor = Color.White;

            bool canStart = CanStartAutoClick();
            btnStart.IsDisabled = !canStart;

            if (!canStart)
            {
                // Nothing to run yet: neutral gray instead of a faded accent
                btnStart.NormalColor = currentTheme.BgElevated;
                btnStart.HoverColor = currentTheme.BgElevated;
                btnStart.ForeColor = currentTheme.TextSecondary;
                AppIcons.Set(btnStart, AppIcons.Start, currentTheme.TextSecondary);

                string tip = Loc.TipAddPointsOrSteps;
                if (_currentTabIndex == 1 && radModePoints != null && radModePoints.Checked)
                {
                    tip = Loc.TipNoPoints;
                }
                else if (_currentTabIndex == 2)
                {
                    tip = Loc.TipNoSteps;
                }
                else if (_currentTabIndex == 0)
                {
                    tip = Loc.TipSwitchTab;
                }

                if (_startToolTip != null)
                {
                    _startToolTip.SetToolTip(btnStart, tip);
                }
            }
            else
            {
                AppIcons.Set(btnStart, AppIcons.Start, Color.White);
                if (_startToolTip != null)
                {
                    _startToolTip.SetToolTip(btnStart, Loc.TipStartActiveTab);
                }
            }
            btnStart.Invalidate();
        }

        private void StartAutoClick()
        {
            if (IsActiveTabRunning) return;
            if (!CanStartAutoClick()) return;
            if (!CheckTargetsBeforeStart()) return;

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
            }

            UpdateRunningState();
            UpdateMainStatusText();
            if (titleBar != null) titleBar.IsRunning = true;
        }

        // Blocks the Start and shows the popup when a target window of the open tab cannot be used.
        // A target without a session PID (Auto Clicker was reopened) gets locked here to the window it resolves to.
        private bool CheckTargetsBeforeStart()
        {
            if (_targetDialogOpen) return false;

            List<TargetProblem> problems = (_currentTabIndex == 1) ? FindSimpleTargetProblems() : FindAsianTargetProblems();
            if (problems.Count == 0) return true;

            ShowTargetProblems(problems);
            return false;
        }

        private List<TargetProblem> FindSimpleTargetProblems()
        {
            List<TargetProblem> problems = new List<TargetProblem>();
            bool hasTarget = _simpleRelativeToWindow && (_simpleTargetHwnd != IntPtr.Zero || !string.IsNullOrEmpty(_simpleTargetProcessName) || !string.IsNullOrEmpty(_simpleTargetWindowTitle) || _simpleTargetPid != 0);
            if (!hasTarget) return problems;

            IntPtr hWnd;
            TargetWindowState state = NativeMethods.GetTargetWindowState(_simpleTargetHwnd, _simpleTargetPid, _simpleTargetProcessName, _simpleTargetWindowTitle, _simpleTargetWindowIndex, out hWnd);
            if (state == TargetWindowState.Ok)
            {
                _simpleTargetHwnd = hWnd;
                uint pid;
                NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                if (pid != _simpleTargetPid)
                {
                    _simpleTargetPid = pid;
                    UpdateSimpleTargetWindowButtonDisplay();
                }
                return problems;
            }

            problems.Add(new TargetProblem
            {
                State = state,
                ProcessName = _simpleTargetProcessName,
                WindowTitle = _simpleTargetWindowTitle,
                WindowIndex = _simpleTargetWindowIndex,
                Pid = _simpleTargetPid,
                SimpleTabIndex = _simpleTabIndex
            });
            return problems;
        }

        private List<TargetProblem> FindAsianTargetProblems()
        {
            List<TargetProblem> problems = new List<TargetProblem>();
            if (pnlTabAdvanced == null) return problems;

            ModernAutoClicker.Advanced.MacroProfile root = pnlTabAdvanced.GetCurrentProfile();
            if (root == null) return problems;

            foreach (ModernAutoClicker.Advanced.MacroProfile script in pnlTabAdvanced.GetProfilesUsedBy(root.Name))
            {
                if (script.Steps == null) continue;
                for (int i = 0; i < script.Steps.Count; i++)
                {
                    ModernAutoClicker.Advanced.MacroStep s = script.Steps[i];
                    if (!s.Enabled || !ModernAutoClicker.Advanced.ActionExecutor.UsesTargetWindow(s)) continue;

                    IntPtr hWnd;
                    TargetWindowState state = NativeMethods.GetTargetWindowState(s.WindowHwnd, s.TargetPid, s.ProcessName, s.WindowTitle, s.WindowIndex, out hWnd);
                    if (state == TargetWindowState.Ok)
                    {
                        s.WindowHwnd = hWnd;
                        uint pid;
                        NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                        s.TargetPid = pid;
                        continue;
                    }

                    TargetProblem candidate = new TargetProblem
                    {
                        State = state,
                        ProcessName = s.ProcessName,
                        WindowTitle = s.WindowTitle,
                        WindowIndex = s.WindowIndex,
                        Pid = s.TargetPid,
                        RootScriptName = root.Name
                    };
                    TargetProblem problem = problems.Find(x => x.TargetKey == candidate.TargetKey);
                    if (problem == null)
                    {
                        problem = candidate;
                        problems.Add(problem);
                    }
                    problem.AddStep(script.Name, i + 1);
                }
            }
            return problems;
        }

        private void QueueTargetProblem(TargetProblem problem)
        {
            if (!_pendingTargetProblems.Exists(x => x.TargetKey == problem.TargetKey))
            {
                _pendingTargetProblems.Add(problem);
            }
            _targetProblemTimer.Stop();
            _targetProblemTimer.Start();
        }

        private void ShowPendingTargetProblems()
        {
            _targetProblemTimer.Stop();
            if (_targetDialogOpen || _pendingTargetProblems.Count == 0) return;

            List<TargetProblem> problems = new List<TargetProblem>(_pendingTargetProblems);
            _pendingTargetProblems.Clear();
            ShowTargetProblems(problems);

            // Tabs that lost their target while the popup was open
            if (_pendingTargetProblems.Count > 0) _targetProblemTimer.Start();
        }

        private void ShowTargetProblems(List<TargetProblem> problems)
        {
            if (this.IsDisposed) return;

            _targetDialogOpen = true;
            try
            {
                // The popup belongs to this window: it would stay out of sight with it
                if (this.WindowState == FormWindowState.Minimized) this.WindowState = FormWindowState.Normal;

                using (TargetProblemDialog dialog = new TargetProblemDialog(problems, currentTheme))
                {
                    if (dialog.ShowModal(this) != DialogResult.OK) return;

                    foreach (KeyValuePair<TargetProblem, TargetChoice> pair in dialog.Choices)
                    {
                        ApplyTargetChoice(pair.Key, pair.Value.Window);
                    }
                }

                SyncOverlay();
                SaveSettings();
                if (!IsActiveTabRunning) lblMainStatusInfo.Text = Loc.TargetChangedPressStart;
            }
            finally
            {
                _targetDialogOpen = false;
            }
        }

        private void ApplyTargetChoice(TargetProblem problem, NativeMethods.WindowTargetInfo window)
        {
            if (window != null && window.AppIcon != null)
            {
                IconCache.CacheProcessIcon(window.ProcessName, window.AppIcon);
            }

            if (!problem.IsSimple)
            {
                pnlTabAdvanced.ReplaceWindowTarget(problem.RootScriptName, problem.ProcessName, problem.WindowTitle, problem.WindowIndex, window);
                return;
            }

            int tab = problem.SimpleTabIndex;
            _simpleTargetHwnds[tab] = window != null ? window.Hwnd : IntPtr.Zero;
            _simpleTargetPids[tab] = window != null ? window.ProcessId : 0;
            _simpleTargetWindowIndices[tab] = window != null ? window.WindowIndex : 0;

            string processName = window != null ? window.ProcessName : "";
            string windowTitle = window != null ? window.Title : "";

            if (tab == _simpleTabIndex)
            {
                _simpleRelativeToWindow = window != null;
                _simpleTargetProcessName = processName;
                _simpleTargetWindowTitle = windowTitle;
                UpdateSimpleTargetWindowButtonDisplay();
            }
            else
            {
                // A tab that is not on screen only lives in the settings until it is opened
                AppSettings config = AppSettings.Load();
                SimpleProfileConfig prof = config.GetProfile(tab);
                prof.SimpleRelativeToWindow = window != null;
                prof.SimpleTargetProcessName = processName;
                prof.SimpleTargetWindowTitle = windowTitle;
                prof.SimpleTargetWindowIndex = _simpleTargetWindowIndices[tab];
                AppSettings.Save(config);
            }
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
            if (tabIndex < 0 || tabIndex >= AppSettings.SimpleTabCount) return;
            if (_simpleEngines[tabIndex] != null && _simpleEngines[tabIndex].IsRunning) return;

            SaveActiveSimpleProfileFromUI();
            AppSettings config = AppSettings.Load();
            SimpleProfileConfig prof = config.GetProfile(tabIndex);

            int clickMode = prof.SimpleClickMode;
            uint tabPid = (tabIndex >= 0 && tabIndex < AppSettings.SimpleTabCount) ? _simpleTargetPids[tabIndex] : 0;
            IntPtr tabHwnd = (tabIndex >= 0 && tabIndex < AppSettings.SimpleTabCount) ? _simpleTargetHwnds[tabIndex] : IntPtr.Zero;
            if (prof.SimpleRelativeToWindow && !NativeMethods.IsValidWindowHandle(tabHwnd, tabPid, prof.SimpleTargetProcessName))
            {
                tabHwnd = NativeMethods.FindWindowByTarget(prof.SimpleTargetProcessName, prof.SimpleTargetWindowTitle, prof.SimpleTargetWindowIndex, tabPid);
                if (tabHwnd != IntPtr.Zero && tabIndex >= 0 && tabIndex < AppSettings.SimpleTabCount)
                {
                    _simpleTargetHwnds[tabIndex] = tabHwnd;
                    uint p;
                    NativeMethods.GetWindowThreadProcessId(tabHwnd, out p);
                    if (p > 0)
                    {
                        tabPid = p;
                        _simpleTargetPids[tabIndex] = p;
                    }
                }
                else if (tabIndex >= 0 && tabIndex < AppSettings.SimpleTabCount)
                {
                    _simpleTargetHwnds[tabIndex] = IntPtr.Zero;
                }
            }

            if (!UacHelper.IsRunningAsAdmin() && prof.SimpleRelativeToWindow && tabHwnd != IntPtr.Zero && UacHelper.IsProcessElevated(tabHwnd))
            {
                DialogResult dr = ModernMessageBox.Show(
                    Loc.IsVietnamese
                        ? "Cửa sổ mục tiêu đang chạy với quyền Administrator.\nĐể gửi phím/chuột vào cửa sổ này, Auto Clicker cần quyền Administrator.\n\nBạn có muốn khởi động lại ứng dụng dưới quyền Administrator ngay bây giờ?"
                        : "Target window is running with Administrator privileges.\nTo send input to this window, Auto Clicker requires Administrator privileges.\n\nWould you like to restart Auto Clicker as Administrator now?",
                    "Administrator Required",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning,
                    this);

                if (dr == DialogResult.Yes)
                {
                    SaveSettings();
                    UacHelper.RestartAsAdmin();
                    return;
                }
            }

            ClickConfig clickConfig = new ClickConfig
            {
                IntervalMs = Math.Max(1, prof.IntervalMs),
                Loops = prof.SimpleLoops,
                JitterPx = prof.SimpleJitterPx,
                MouseButton = prof.MouseButton,
                ClickMode = clickMode,
                FreeMouseMode = forceFreeMouse,
                SmoothMouseMove = (chkSmoothMove != null && chkSmoothMove.Checked),
                TargetHwnd = tabHwnd,
                TargetPid = tabPid,
                TargetProcessName = prof.SimpleTargetProcessName,
                TargetWindowTitle = prof.SimpleTargetWindowTitle,
                TargetWindowIndex = prof.SimpleTargetWindowIndex,
                RelativeToWindow = prof.SimpleRelativeToWindow,
                PointsList = (clickMode == 0 && prof.Points != null && prof.Points.Count > 0) ? new List<Point>(prof.Points) : null
            };

            _simpleEngines[tabIndex].Start(clickConfig);
            UpdateSimpleTabButtons();
            UpdateSimpleLocalUILock();
        }

        private void StopSimpleTab(int tabIndex)
        {
            if (tabIndex < 0 || tabIndex >= AppSettings.SimpleTabCount) return;
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

            if (!UacHelper.IsRunningAsAdmin() && prof.Steps != null)
            {
                bool targetIsElevated = false;
                foreach (var s in prof.Steps)
                {
                    if (s.Enabled && s.RelativeToWindow && (s.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(s.ProcessName)))
                    {
                        IntPtr win = s.WindowHwnd;
                        if (!NativeMethods.IsValidWindowHandle(win, s.TargetPid, s.ProcessName))
                        {
                            win = NativeMethods.FindWindowByTarget(s.ProcessName, s.WindowTitle, s.WindowIndex, s.TargetPid);
                            if (win != IntPtr.Zero)
                            {
                                s.WindowHwnd = win;
                                uint p;
                                NativeMethods.GetWindowThreadProcessId(win, out p);
                                if (p > 0) s.TargetPid = p;
                            }
                            else
                            {
                                s.WindowHwnd = IntPtr.Zero;
                            }
                        }
                        if (win != IntPtr.Zero && UacHelper.IsProcessElevated(win))
                        {
                            targetIsElevated = true;
                            break;
                        }
                    }
                }

                if (targetIsElevated)
                {
                    DialogResult dr = ModernMessageBox.Show(
                        Loc.IsVietnamese
                            ? "Cửa sổ mục tiêu trong kịch bản đang chạy với quyền Administrator.\nĐể gửi phím/chuột vào cửa sổ này, Auto Clicker cần quyền Administrator.\n\nBạn có muốn khởi động lại ứng dụng dưới quyền Administrator ngay bây giờ?"
                            : "A target window in this script is running with Administrator privileges.\nTo send input to this window, Auto Clicker requires Administrator privileges.\n\nWould you like to restart Auto Clicker as Administrator now?",
                        "Administrator Required",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning,
                        this);

                    if (dr == DialogResult.Yes)
                    {
                        SaveSettings();
                        UacHelper.RestartAsAdmin();
                        return;
                    }
                }
            }

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

            runner.OnTargetLost += (problem) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() => QueueTargetProblem(problem)));
                }
            };

            runner.OnRunFailed += (ex) =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() => ShowRunFailure(Loc.RunningAsianName(scriptKey), ex)));
                }
            };

            runner.OnStopped += () =>
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        // A runner replaced by a newer Start of the same script must not mark that new run as stopped
                        ModernAutoClicker.Advanced.MacroRunner current;
                        if (_asianRunners.TryGetValue(scriptKey, out current) && current != runner) return;
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
                }
                if (titleBar != null) titleBar.IsRunning = false;
                HandleWindowFocusChanged(true);
            }
        }

        public void StopAll()
        {
            if (this.IsDisposed || !this.IsHandleCreated) return;
            if (!IsAnyRunning) return;
            if (this.InvokeRequired)
            {
                this.BeginInvoke((Action)(() => StopAll()));
                return;
            }

            // 1. Stop all Simple engines
            for (int i = 0; i < AppSettings.SimpleTabCount; i++)
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
                overlayForm.SetClickThrough(false);
                overlayForm.SetExecutingIndex(-1);
            }

            if (titleBar != null) titleBar.IsRunning = false;

            UpdateSimpleTabButtons();
            UpdateSimpleLocalUILock();
            UpdateRunningState();
            UpdateMainStatusText();

            HandleWindowFocusChanged(true);
        }

        private int GetTotalRunningCount()
        {
            int count = 0;
            for (int i = 0; i < AppSettings.SimpleTabCount; i++)
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
            UpdateRunningTasksRow(true);
            UpdateTabStatus(_isBasicTab);
            if (_runStatsTimer != null && IsAnyRunning) _runStatsTimer.Start();
        }

        // Timer tick: only touches the status line when it shows, or has to stop showing, the live numbers (the Ready text is costly to rebuild)
        private void RefreshRunStats()
        {
            UpdateRunningTasksRow(true);

            string stats = GetTabRunStats();
            if (stats != null)
            {
                ShowRunStats(stats);
            }
            else if (_statusShowsRunStats)
            {
                UpdateTabStatus(_isBasicTab);
            }

            if (!IsAnyRunning) _runStatsTimer.Stop();
        }

        private void ShowRunStats(string stats)
        {
            _statusShowsRunStats = true;
            if (lblMainStatusInfo.Text != stats) lblMainStatusInfo.Text = stats;
        }

        // Numbers of the tab on screen: live while it runs, then those of its last run until it starts again.
        // Null before that tab has run in this session.
        private string GetTabRunStats()
        {
            if (_currentTabIndex == 1)
            {
                if (_simpleEngines == null || _simpleTabIndex < 0 || _simpleTabIndex >= AppSettings.SimpleTabCount) return null;
                ClickEngine engine = _simpleEngines[_simpleTabIndex];
                if (engine == null || !engine.HasRun) return null;
                return Loc.RunStatsSimple(engine.TotalClicks, FormatElapsed(engine.Elapsed), FormatLoops(engine.CompletedLoops, engine.TargetLoops));
            }

            if (_currentTabIndex == 2 && pnlTabAdvanced != null)
            {
                string scriptName = pnlTabAdvanced.ActiveScriptName;
                ModernAutoClicker.Advanced.MacroRunner runner;
                if (string.IsNullOrEmpty(scriptName) || !_asianRunners.TryGetValue(scriptName, out runner) || runner == null || !runner.HasRun) return null;
                return Loc.RunStatsAsian(runner.StepsExecuted, FormatElapsed(runner.Elapsed), FormatLoops(runner.TotalCyclesCompleted, runner.TargetLoops));
            }

            return null;
        }

        private static string FormatElapsed(TimeSpan elapsed)
        {
            return string.Format("{0:D2}:{1:D2}:{2:D2}", (int)elapsed.TotalHours, elapsed.Minutes, elapsed.Seconds);
        }

        private static string FormatLoops(int completed, int target)
        {
            return target > 0 ? completed + "/" + target : completed.ToString();
        }

        // The row under the settings card lists every running task and only exists while something runs.
        // relayout: false when the caller (SwitchTab) lays the window out itself right after.
        private void UpdateRunningTasksRow(bool relayout)
        {
            if (lblRunningTasks == null) return;

            List<string> runningNames = new List<string>();
            if (_simpleEngines != null)
            {
                for (int i = 0; i < AppSettings.SimpleTabCount; i++)
                {
                    if (_simpleEngines[i] != null && _simpleEngines[i].IsRunning)
                    {
                        runningNames.Add(Loc.RunningSimpleName(i + 1));
                    }
                }
            }
            foreach (var kvp in _asianRunners)
            {
                if (kvp.Value != null && kvp.Value.IsRunning)
                {
                    runningNames.Add(Loc.RunningAsianName(kvp.Key));
                }
            }

            bool show = runningNames.Count > 0 && _currentTabIndex != 0;
            if (show)
            {
                string text = Loc.RunningTasks(runningNames.Count, string.Join(", ", runningNames.ToArray()));
                if (lblRunningTasks.Text != text)
                {
                    lblRunningTasks.Text = text;
                    if (_startToolTip != null) _startToolTip.SetToolTip(lblRunningTasks, text);
                }
            }

            if (_runningRowShown == show) return;
            _runningRowShown = show;
            lblRunningTasks.Visible = show;

            // Simple's form auto-sizes around the row; Asian keeps its window size and gives the height to the step table
            if (relayout && _currentTabIndex == 2 && this.WindowState != FormWindowState.Minimized)
            {
                ApplyAsianDynamicLayout(this.ClientSize.Width, this.ClientSize.Height);
            }
        }

        private void UpdateRunningState(bool? runningOverride = null)
        {
            bool isCurrentRunning = runningOverride.HasValue ? runningOverride.Value : IsActiveTabRunning;

            if (isCurrentRunning)
            {
                btnStart.Icon = null;
                btnStart.Text = Loc.BtnStopRun;
                btnStart.Subtitle = Loc.BtnStopRunHint;
                btnStart.NormalColor = currentTheme.Danger;
                btnStart.HoverColor = currentTheme.CRed;
                btnStart.ForeColor = Color.White;
                btnStart.IsDisabled = false;
                btnStart.Enabled = true;
                if (_startToolTip != null) _startToolTip.SetToolTip(btnStart, Loc.TipStopActiveTab);
                btnStart.Invalidate();
            }
            else
            {
                btnStart.Text = Loc.BtnStart;
                btnStart.Subtitle = "(F6)";
                btnStart.NormalColor = currentTheme.AccentPrimary;
                btnStart.HoverColor = currentTheme.AccentPrimaryHover;
                btnStart.ForeColor = Color.White;
                btnStart.Invalidate();
                UpdateStartButtonState();
            }

            // Local Lockout:
            // Tab navigation, Simple tab buttons, and Global Settings are ALWAYS enabled!
            if (tabBar != null) tabBar.Enabled = true;
            if (pnlContentHost != null) pnlContentHost.Enabled = true;
            if (pnlGlobalSettings != null) pnlGlobalSettings.Enabled = true;
            if (btnTransformTool != null) btnTransformTool.Enabled = !isCurrentRunning;

            if (_currentTabIndex == 1)
            {
                UpdateSimpleLocalUILock();
            }
            else if (_currentTabIndex == 2 && pnlTabAdvanced != null)
            {
                pnlTabAdvanced.SetScriptEditingLocked(isCurrentRunning);
            }

            if (titleBar != null) titleBar.IsRunning = IsAnyRunning;
            UpdateStopAllButtonLook();
        }

        // Stop ALL only takes its red color while something is running; otherwise it stays neutral gray
        private void UpdateStopAllButtonLook()
        {
            if (btnStopAll == null || currentTheme == null) return;
            bool anyRunning = IsAnyRunning;
            btnStopAll.Enabled = anyRunning;
            btnStopAll.NormalColor = anyRunning ? currentTheme.Danger : currentTheme.BgElevated;
            btnStopAll.HoverColor = anyRunning ? currentTheme.CRed : currentTheme.BgElevated;
            btnStopAll.ForeColor = anyRunning ? Color.White : currentTheme.TextTertiary;
            btnStopAll.Invalidate();
        }

        public void SwitchSimpleTab(int targetIdx)
        {
            if (targetIdx < 0 || targetIdx >= AppSettings.SimpleTabCount || targetIdx == _simpleTabIndex) return;

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

            // 7. Sync Map Overlay with target tab's points
            SyncOverlay();

            // 8. Update status bar with target tab's details
            UpdateTabStatus(_isBasicTab);
            UpdateMainStatusText();

            // 10. Persist active tab selection
            AppSettings.Save(config);
        }

        private void SaveActiveSimpleProfileFromUI()
        {
            AppSettings config = AppSettings.Load();
            SimpleProfileConfig prof = config.GetProfile(_simpleTabIndex);

            prof.IntervalMs = numInterval != null ? numInterval.ValueMs : 250;
            prof.IntervalUnit = numInterval != null ? numInterval.Unit : TimeUnit.Milliseconds;
            prof.SimpleLoops = numSimpleLoop != null ? numSimpleLoop.Value : 0;
            prof.SimpleJitterPx = numSimpleJitter != null ? numSimpleJitter.Value : 0;
            prof.SimpleClickMode = (radModeCursor != null && radModeCursor.Checked) ? 1 : 0;
            prof.SimpleTargetProcessName = _simpleTargetProcessName ?? "";
            prof.SimpleTargetWindowTitle = _simpleTargetWindowTitle ?? "";
            prof.SimpleTargetWindowIndex = _simpleTargetWindowIndex;
            prof.SimpleTargetPid = _simpleTargetPid;
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

                if (numInterval != null)
                {
                    numInterval.Unit = prof.IntervalUnit;
                    numInterval.ValueMs = Math.Max(1, prof.IntervalMs);
                }
                if (cboIntervalUnit != null) cboIntervalUnit.SelectedIndex = TimeUnit.Clamp(prof.IntervalUnit);
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
                _simpleTargetWindowIndex = prof.SimpleTargetWindowIndex;
                if (_simpleTargetPid == 0 && prof.SimpleTargetPid > 0)
                {
                    try
                    {
                        using (var p = System.Diagnostics.Process.GetProcessById((int)prof.SimpleTargetPid))
                        {
                            if (!p.HasExited) _simpleTargetPid = prof.SimpleTargetPid;
                            else { _simpleTargetPid = 0; prof.SimpleTargetPid = 0; }
                        }
                    }
                    catch
                    {
                        _simpleTargetPid = 0;
                        prof.SimpleTargetPid = 0;
                    }
                }
                _simpleRelativeToWindow = prof.SimpleRelativeToWindow;
                if (_simpleRelativeToWindow && index >= 0 && index < AppSettings.SimpleTabCount)
                {
                    if (!NativeMethods.IsValidWindowHandle(_simpleTargetHwnds[index], _simpleTargetPids[index], _simpleTargetProcessName))
                    {
                        _simpleTargetHwnds[index] = NativeMethods.FindWindowByTarget(_simpleTargetProcessName, _simpleTargetWindowTitle, _simpleTargetWindowIndex, _simpleTargetPids[index]);
                        if (_simpleTargetHwnds[index] != IntPtr.Zero)
                        {
                            uint pr;
                            NativeMethods.GetWindowThreadProcessId(_simpleTargetHwnds[index], out pr);
                            if (pr > 0)
                            {
                                _simpleTargetPids[index] = pr;
                                _simpleTargetPid = pr;
                            }
                        }
                    }
                    _simpleTargetHwnd = _simpleTargetHwnds[index];
                }
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

        private void UpdateSimpleLocalUILock()
        {
            bool isCurrentRunning = _simpleEngines != null && _simpleTabIndex >= 0 && _simpleTabIndex < AppSettings.SimpleTabCount &&
                                    _simpleEngines[_simpleTabIndex] != null && _simpleEngines[_simpleTabIndex].IsRunning;

            if (pnlClickMode != null) pnlClickMode.Enabled = !isCurrentRunning;
            if (pnlSimpleTarget != null) pnlSimpleTarget.Enabled = !isCurrentRunning;
            if (numInterval != null) numInterval.Enabled = !isCurrentRunning;
            if (cboIntervalUnit != null) cboIntervalUnit.Enabled = !isCurrentRunning;
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
            AppSettings config = AppSettings.Load();
            for (int i = 0; i < AppSettings.SimpleTabCount; i++)
            {
                if (btnSimpleTabs[i] == null) continue;

                bool isRunning = _simpleEngines != null && _simpleEngines[i] != null && _simpleEngines[i].IsRunning;
                bool isSelected = (i == _simpleTabIndex);

                bool hasSteps = false;
                if (i == _simpleTabIndex)
                {
                    hasSteps = (lstPoints != null && lstPoints.Count > 0);
                }
                else
                {
                    var prof = (config != null) ? config.GetProfile(i) : null;
                    hasSteps = (prof != null && prof.Points != null && prof.Points.Count > 0);
                }

                string numStr = (i + 1).ToString();
                btnSimpleTabs[i].Text = numStr;

                if (isRunning)
                {
                    btnSimpleTabs[i].BorderWidth = 2;
                    btnSimpleTabs[i].BorderColor = t.Success;
                }
                else if (hasSteps)
                {
                    btnSimpleTabs[i].BorderWidth = 2;
                    btnSimpleTabs[i].BorderColor = t.CBlue;
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
                    btnSimpleTabs[i].HoverColor = isRunning ? Color.FromArgb(180, t.Success) : (hasSteps ? Color.FromArgb(180, t.CBlue) : t.AccentPrimary);
                    btnSimpleTabs[i].ForeColor = isRunning ? t.Success : (hasSteps ? t.CBlue : t.TextSecondary);
                }
                btnSimpleTabs[i].Invalidate();
            }
            UpdateSimpleListButtonLook();
        }

        // "Clear" has nothing to clear on an empty point list: gray text and no danger hover until points exist
        private void UpdateSimpleListButtonLook()
        {
            if (btnClearList == null || currentTheme == null) return;
            bool hasPoints = lstPoints != null && lstPoints.Count > 0;
            btnClearList.ForeColor = hasPoints ? currentTheme.TextPrimary : currentTheme.TextTertiary;
            btnClearList.HoverColor = hasPoints ? currentTheme.Danger : currentTheme.BgElevated;
            AppIcons.Set(btnClearList, AppIcons.Clear, btnClearList.ForeColor, ContentAlignment.MiddleCenter);
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
            _isFirstRun = config.IsFirstRun;

            _simpleTabIndex = Math.Max(0, Math.Min(AppSettings.SimpleTabCount - 1, config.ActiveSimpleTabIndex));
            LoadSimpleProfileToUI(_simpleTabIndex, config);
            UpdateSimpleTabButtons();

            chkAlwaysOnTop.Checked = config.AlwaysOnTop;
            this.TopMost = config.AlwaysOnTop;

            chkShowMap.Checked = config.ShowMapOverlay;
            _mapOverlayOpacity = Math.Max(10, Math.Min(100, config.MapOverlayOpacity));
            if (btnMapOpacity != null)
            {
                btnMapOpacity.Text = _mapOverlayOpacity + "% ▾";
            }
            if (overlayForm != null)
            {
                overlayForm.SetMapOpacity(_mapOverlayOpacity);
            }
            if (chkFreeMouse != null) chkFreeMouse.Checked = config.FreeMouseMode;
            if (chkSmoothMove != null) chkSmoothMove.Checked = config.SmoothMouseMove;
            _settingsCollapsed = config.SettingsCollapsed;
            ApplySettingsCollapse();

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

            _savedAsianWidth = Math.Max(700, config.AsianWindowWidth);
            _savedAsianHeight = Math.Max(AsianMinHeight, config.AsianWindowHeight);

            if (config.IsAdvancedTab)
            {
                SwitchTab(2);
            }
            else
            {
                SwitchTab(1);
            }

            Loc.SetLanguage(config.Language);
            ApplyLanguage();
        }

        private void SaveSettings()
        {
            AppSettings config = AppSettings.Load();

            // 1. Sync current UI into active Simple profile
            SimpleProfileConfig prof = config.GetProfile(_simpleTabIndex);
            prof.IntervalMs = (numInterval != null) ? numInterval.ValueMs : 250;
            prof.IntervalUnit = (numInterval != null) ? numInterval.Unit : TimeUnit.Milliseconds;
            prof.SimpleLoops = (numSimpleLoop != null) ? numSimpleLoop.Value : 0;
            prof.SimpleJitterPx = (numSimpleJitter != null) ? numSimpleJitter.Value : 0;
            prof.SimpleClickMode = (radModeCursor != null && radModeCursor.Checked) ? 1 : 0;
            prof.SimpleTargetProcessName = _simpleTargetProcessName ?? "";
            prof.SimpleTargetWindowTitle = _simpleTargetWindowTitle ?? "";
            prof.SimpleTargetWindowIndex = _simpleTargetWindowIndex;
            prof.SimpleRelativeToWindow = _simpleRelativeToWindow;
            prof.Points = (lstPoints != null) ? lstPoints.GetPoints() : new List<Point>();

            // 2. Global settings
            config.ActiveSimpleTabIndex = _simpleTabIndex;
            config.AlwaysOnTop = chkAlwaysOnTop.Checked;
            config.ShowMapOverlay = chkShowMap.Checked;
            config.MapOverlayOpacity = _mapOverlayOpacity;
            config.SettingsCollapsed = _settingsCollapsed;
            config.FreeMouseMode = (chkFreeMouse != null && chkFreeMouse.Checked);
            config.SmoothMouseMove = (chkSmoothMove != null && chkSmoothMove.Checked);
            config.IsDarkTheme = currentTheme.IsDark;
            config.IsAdvancedTab = !_isBasicTab;
            config.Language = Loc.CurrentLanguageCode;
            if (_currentTabIndex == 2 && this.WindowState != FormWindowState.Minimized)
            {
                _savedAsianWidth = Math.Max(700, this.Width);
                _savedAsianHeight = Math.Max(AsianMinHeight, this.Height);
            }
            config.AsianWindowWidth = _savedAsianWidth;
            config.AsianWindowHeight = _savedAsianHeight;
            config.AdvancedProfileJson = (pnlTabAdvanced != null) ? ModernAutoClicker.Advanced.MacroStorage.ProjectToJson(pnlTabAdvanced.GetAllProfiles(), pnlTabAdvanced.ActiveProfileIndex) : null;

            AppSettings.Save(config);
            ReportSettingsProblem();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            ActionRecorder.Instance.StopRecording();
            SaveSettings();
            UnregisterGlobalHotkeys();
            StopAll();
            if (_runStatsTimer != null)
            {
                _runStatsTimer.Stop();
                _runStatsTimer.Dispose();
                _runStatsTimer = null;
            }
            _targetProblemTimer.Stop();
            _targetProblemTimer.Dispose();
            if (overlayForm != null && !overlayForm.IsDisposed)
            {
                overlayForm.Close();
                overlayForm.Dispose();
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

            base.OnFormClosing(e);
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
