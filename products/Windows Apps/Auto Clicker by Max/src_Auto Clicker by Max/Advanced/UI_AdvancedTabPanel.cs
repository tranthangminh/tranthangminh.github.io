using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Advanced
{
    public class AdvancedTabPanel : Panel
    {
        private ThemeTokens _theme;

        // Sub-Tab Bar for Multi-Scripts
        private ProfileTabControl profileTabBar;
        private List<MacroProfile> _profiles = new List<MacroProfile>();
        private int _activeProfileIndex = 0;

        // Main Body Card ("Bảng Lớn") wrapping action buttons, table, and bottom options
        private RoundedPanel pnlBodyCard;

        // Top Toolbar Controls
        private RoundedButton btnAddStep;
        private RoundedButton btnCloneSelected;
        private RoundedButton btnClearAll;
        private RoundedButton btnSaveProfile;
        private RoundedButton btnLoadProfile;
        private ModernDropdownButton btnTemplate;

        // Bottom Options Controls (Loop, Jitter, Time)
        private Label lblLoop;
        private NumberInput numLoop;
        private Label lblLoopHint;
        private Label lblRandJitter;
        private NumberInput numRandJitter;
        private Label lblRandJitterUnit;
        private Label lblRandInterval;
        private NumberInput numRandInterval;
        private Label lblRandIntervalUnit;
        private Label lblSpeed;
        private NumberInput numSpeed;
        private Label lblSpeedUnit;

        // Table (Shared across all profiles)
        private MacroTableControl tableControl;

        private string _statusText = string.Empty;
        private VFX_AsianDragonOverdrive _vfxOverdrive;

        public event Action OnActiveScriptChanged;
        public event Action<string> OnStatusChanged;

        public MacroTableControl Table { get { return tableControl; } }
        public int ActiveProfileIndex { get { return _activeProfileIndex; } }
        public string StatusText { get { return _statusText; } }
        public VFX_AsianDragonOverdrive VFX { get { return _vfxOverdrive; } }

        public MacroProfile GetCurrentProfile()
        {
            FlushCurrentProfileFromUI();
            EnsureProfileExists();
            return _profiles[_activeProfileIndex];
        }

        public List<MacroProfile> GetAllProfiles()
        {
            FlushCurrentProfileFromUI();
            EnsureProfileExists();
            return _profiles;
        }

        public List<string> GetAvailableScriptNames(int excludeIndex = -1)
        {
            List<string> list = new List<string>();
            for (int i = 0; i < _profiles.Count; i++)
            {
                if (excludeIndex >= 0 && i == excludeIndex) continue;
                list.Add(!string.IsNullOrEmpty(_profiles[i].Name) ? _profiles[i].Name : string.Format("Script {0}", i + 1));
            }
            return list;
        }

        public int CurrentJitterPx
        {
            get { return numRandJitter != null ? numRandJitter.Value : 0; }
        }

        public AdvancedTabPanel()
        {
            _theme = ThemeTokens.DarkTheme();
            this.Size = new Size(590, 482);
            this.DoubleBuffered = true;
            this.BackColor = _theme.BgPrimary;
            _vfxOverdrive = new VFX_AsianDragonOverdrive();
            _vfxOverdrive.Attach(this);

            InitializeComponents();
            ApplyTheme(_theme);
            ApplyLanguage();
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        public void ApplyLanguage()
        {
            if (btnAddStep != null) btnAddStep.Text = Loc.AdvBtnAddStep;
            if (btnCloneSelected != null) btnCloneSelected.Text = Loc.AdvBtnClone;
            if (btnSaveProfile != null) btnSaveProfile.Text = Loc.AdvBtnSave;
            if (btnLoadProfile != null) btnLoadProfile.Text = Loc.AdvBtnLoad;
            if (btnClearAll != null) btnClearAll.Text = Loc.AdvBtnClear;
            if (btnTemplate != null) btnTemplate.Text = Loc.AdvBtnTemplate;
            if (lblLoop != null) lblLoop.Text = Loc.AdvLblLoop;
            if (lblRandJitter != null) lblRandJitter.Text = Loc.AdvLblJitter;
            if (lblRandInterval != null) lblRandInterval.Text = Loc.AdvLblInterval;
            if (lblSpeed != null) lblSpeed.Text = Loc.AdvLblSpeed;

            if (tableControl != null) tableControl.ApplyLanguage();
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);

            int w = this.Width;
            int h = this.Height;
            if (w <= 0 || h <= 0) return;

            this.SuspendLayout();

            // 1. Profile tabs & Template button outside on top (Y = 0, Height = 26)
            if (profileTabBar != null) profileTabBar.Size = new Size(Math.Max(50, w - 86 - 6), 26);
            if (btnTemplate != null) btnTemplate.Location = new Point(w - 86, 0);

            // 2. The Main Body Card ("Bảng Lớn") wrapping all step controls (Y = 26)
            int bodyCardH = Math.Max(150, h - 26);
            if (pnlBodyCard != null)
            {
                pnlBodyCard.Location = new Point(0, 26);
                pnlBodyCard.Size = new Size(w, bodyCardH);
                pnlBodyCard.SuspendLayout();

                int bw = pnlBodyCard.Width;
                int bh = pnlBodyCard.Height;

                // Toolbar right buttons (Y = 8)
                if (btnLoadProfile != null) btnLoadProfile.Location = new Point(bw - 8 - 88, 8);
                if (btnSaveProfile != null) btnSaveProfile.Location = new Point(bw - 8 - 88 - 6 - 88, 8);

                // Macro table (Y = 38)
                int tableH = Math.Max(100, bh - 38 - 34);
                if (tableControl != null)
                {
                    tableControl.Location = new Point(8, 38);
                    tableControl.Size = new Size(Math.Max(200, bw - 16), tableH);
                }

                // Bottom options (Y = bh - 26)
                int optY = bh - 26;
                if (lblLoop != null && lblLoop.Top != optY) lblLoop.Top = optY;
                if (numLoop != null && numLoop.Top != optY - 1) numLoop.Top = optY - 1;
                if (lblLoopHint != null && lblLoopHint.Top != optY) lblLoopHint.Top = optY;
                if (lblRandJitter != null && lblRandJitter.Top != optY) lblRandJitter.Top = optY;
                if (numRandJitter != null && numRandJitter.Top != optY - 1) numRandJitter.Top = optY - 1;
                if (lblRandJitterUnit != null && lblRandJitterUnit.Top != optY) lblRandJitterUnit.Top = optY;
                if (lblRandInterval != null && lblRandInterval.Top != optY) lblRandInterval.Top = optY;
                if (numRandInterval != null && numRandInterval.Top != optY - 1) numRandInterval.Top = optY - 1;
                if (lblRandIntervalUnit != null && lblRandIntervalUnit.Top != optY) lblRandIntervalUnit.Top = optY;
                if (lblSpeed != null && lblSpeed.Top != optY) lblSpeed.Top = optY;
                if (numSpeed != null && numSpeed.Top != optY - 1) numSpeed.Top = optY - 1;
                if (lblSpeedUnit != null && lblSpeedUnit.Top != optY) lblSpeedUnit.Top = optY;

                pnlBodyCard.ResumeLayout(true);
            }

            this.ResumeLayout(true);
        }

        private void EnsureProfileExists()
        {
            if (_profiles == null) _profiles = new List<MacroProfile>();

            if (_profiles.Count == 0)
            {
                MacroProfile defaultScript = new MacroProfile { Name = "Script 1", Steps = new List<MacroStep>() };
                _profiles.Add(defaultScript);
            }

            if (_activeProfileIndex < 0 || _activeProfileIndex >= _profiles.Count)
            {
                _activeProfileIndex = 0;
            }
        }

        private void InitializeComponents()
        {
            // 1. Profile Sub-Tab Bar & Template Button (outside, on top: Y = 0, Height = 26)
            profileTabBar = new ProfileTabControl
            {
                Location = new Point(4, 0),
                Size = new Size(590 - 86 - 8, 26)
            };
            profileTabBar.OnActiveTabChanged += (idx) => SwitchActiveProfile(idx);
            profileTabBar.OnTabRenamed += (idx, name) => RenameProfile(idx, name);
            profileTabBar.OnTabClosed += (idx) => CloseProfile(idx);
            profileTabBar.OnTabDuplicated += (idx) => DuplicateProfile(idx);
            profileTabBar.OnTabReordered += (fromIdx, toIdx) => ReorderProfile(fromIdx, toIdx);
            profileTabBar.OnAddTabRequested += () => AddNewProfile();

            btnTemplate = new ModernDropdownButton
            {
                Text = "Template",
                Location = new Point(590 - 86, 0),
                Size = new Size(86, 26),
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btnTemplate.Click += (s, e) => ShowTemplateMenu();

            // 2. The Main Body Card ("Bảng Lớn") wrapping all step controls (Y = 26)
            pnlBodyCard = new RoundedPanel
            {
                Location = new Point(0, 26),
                Size = new Size(590, 482 - 26),
                BorderRadius = _theme.RadiusMd,
                BorderSize = 1,
                BorderColor = _theme.BorderColor,
                BackColor = _theme.BgSecondary
            };

            // Top Toolbar inside pnlBodyCard (Y = 8, Height = 24)
            // Left Side: Step-level operations
            btnAddStep = new RoundedButton
            {
                Text = "➕ Add Step",
                Location = new Point(8, 8),
                Size = new Size(96, 24),
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btnAddStep.Click += (s, e) =>
            {
                MacroStep step = new MacroStep();
                if (_activeProfileIndex >= 0 && _activeProfileIndex < _profiles.Count)
                {
                    MacroProfile cur = _profiles[_activeProfileIndex];
                    if (cur.DefaultRelativeToWindow && !string.IsNullOrEmpty(cur.DefaultProcessName))
                    {
                        step.RelativeToWindow = true;
                        step.ProcessName = cur.DefaultProcessName;
                        step.WindowTitle = cur.DefaultWindowTitle;
                    }
                    if (cur.SpeedPercent > 0 && cur.SpeedPercent != 100)
                    {
                        step.HoldMs = Math.Max(1, (int)Math.Round(step.BaseHoldMs * 100.0 / cur.SpeedPercent));
                        step.DelayMs = Math.Max(0, (int)Math.Round(step.BaseDelayMs * 100.0 / cur.SpeedPercent));
                    }
                }
                tableControl.AddStep(step);
                UpdateStatus();
            };

            btnCloneSelected = new RoundedButton
            {
                Text = "Clone Step(s)",
                Location = new Point(110, 8),
                Size = new Size(112, 24),
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btnCloneSelected.Click += (s, e) =>
            {
                tableControl.DuplicateSelectedSteps();
                UpdateStatus();
            };

            btnClearAll = new RoundedButton
            {
                Text = "Clear All Steps",
                Location = new Point(228, 8),
                Size = new Size(116, 24),
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btnClearAll.Click += (s, e) =>
            {
                tableControl.ClearAll();
                UpdateStatus();
            };

            // Right Side: Script file operations (aligned with right edge of body card)
            btnSaveProfile = new RoundedButton
            {
                Text = "Save Script",
                Location = new Point(400, 8),
                Size = new Size(88, 24),
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btnSaveProfile.Click += (s, e) => SaveProfile();

            btnLoadProfile = new RoundedButton
            {
                Text = "Load Script",
                Location = new Point(494, 8),
                Size = new Size(88, 24),
                Font = ThemeTokens.FontBase(FontStyle.Bold)
            };
            btnLoadProfile.Click += (s, e) => LoadProfile();

            // 3. Shared Macro Table Control inside pnlBodyCard (Y = 38, Height = 384)
            tableControl = new MacroTableControl
            {
                Location = new Point(8, 38),
                Size = new Size(574, 384)
            };
            tableControl.OnTableDataChanged += () =>
            {
                if (!_isLoadingUI)
                {
                    UpdateStatus();
                    if (OnActiveScriptChanged != null) OnActiveScriptChanged();
                }
            };
            tableControl.OnDefaultWindowBatchChanged += (rel, proc, title, winIdx, pid) =>
            {
                if (_activeProfileIndex >= 0 && _activeProfileIndex < _profiles.Count)
                {
                    _profiles[_activeProfileIndex].DefaultRelativeToWindow = rel;
                    _profiles[_activeProfileIndex].DefaultProcessName = proc ?? "";
                    _profiles[_activeProfileIndex].DefaultWindowTitle = title ?? "";
                    _profiles[_activeProfileIndex].DefaultWindowIndex = winIdx;
                    _profiles[_activeProfileIndex].DefaultTargetPid = pid;
                }
            };

            // 4. Bottom Options Row (Y = 452, Height = 24)
            lblLoop = new Label
            {
                Text = "Loop:",
                Location = new Point(8, 454),
                Size = new Size(36, 20),
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleRight
            };

            numLoop = new NumberInput
            {
                Location = new Point(46, 453),
                Size = new Size(44, 22),
                Minimum = 0,
                Maximum = 999999,
                Step = 1,
                AllowEmpty = true,
                Value = 0,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numLoop.TextChanged += (s, e) => UpdateStatus();

            lblLoopHint = new Label
            {
                Text = "(0=∞)",
                Location = new Point(92, 454),
                Size = new Size(42, 20),
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblRandJitter = new Label
            {
                Text = "Jitter: ±",
                Location = new Point(148, 454),
                Size = new Size(52, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleRight
            };

            numRandJitter = new NumberInput
            {
                Location = new Point(202, 453),
                Size = new Size(36, 22),
                Minimum = 0,
                Maximum = 100,
                Step = 1,
                AllowEmpty = true,
                Value = 0,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numRandJitter.TextChanged += (s, e) =>
            {
                UpdateStatus();
                if (OnActiveScriptChanged != null) OnActiveScriptChanged();
            };

            lblRandJitterUnit = new Label
            {
                Text = "px",
                Location = new Point(240, 454),
                Size = new Size(20, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblRandInterval = new Label
            {
                Text = "Interval: ±",
                Location = new Point(272, 454),
                Size = new Size(62, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleRight
            };

            numRandInterval = new NumberInput
            {
                Location = new Point(336, 453),
                Size = new Size(38, 22),
                Minimum = 0,
                Maximum = 10000,
                Step = 5,
                AllowEmpty = true,
                Value = 0,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numRandInterval.TextChanged += (s, e) => UpdateStatus();

            lblRandIntervalUnit = new Label
            {
                Text = "ms",
                Location = new Point(376, 454),
                Size = new Size(22, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblSpeed = new Label
            {
                Text = Loc.AdvLblSpeed,
                Location = new Point(410, 454),
                Size = new Size(50, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleRight
            };

            numSpeed = new NumberInput
            {
                Location = new Point(464, 453),
                Size = new Size(42, 22),
                Minimum = 10,
                Maximum = 2000,
                Step = 10,
                AllowEmpty = false,
                Value = 100,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numSpeed.TextChanged += (s, e) =>
            {
                if (_isLoadingUI) return;
                int speedVal = numSpeed.Value;
                if (speedVal < 10) speedVal = 10;
                if (speedVal > 2000) speedVal = 2000;
                ApplySpeedPercentToCurrentProfile(speedVal);
            };

            lblSpeedUnit = new Label
            {
                Text = "%",
                Location = new Point(508, 454),
                Size = new Size(18, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            pnlBodyCard.Controls.AddRange(new Control[] {
                btnAddStep, btnCloneSelected, btnSaveProfile, btnLoadProfile, btnClearAll,
                tableControl,
                lblLoop, numLoop, lblLoopHint,
                lblRandJitter, numRandJitter, lblRandJitterUnit,
                lblRandInterval, numRandInterval, lblRandIntervalUnit,
                lblSpeed, numSpeed, lblSpeedUnit
            });

            this.Controls.AddRange(new Control[] {
                profileTabBar, btnTemplate, pnlBodyCard
            });

            // Initialize with default Profile
            EnsureProfileExists();
            ReloadProfileTabs(0);
        }

        private bool _isLoadingUI = false;

        private void FlushCurrentProfileFromUI()
        {
            if (_isLoadingUI) return;
            EnsureProfileExists();

            if (_activeProfileIndex >= 0 && _activeProfileIndex < _profiles.Count)
            {
                _profiles[_activeProfileIndex].Steps = tableControl.GetSteps();
                _profiles[_activeProfileIndex].LoopCount = numLoop != null ? numLoop.Value : 0;
                _profiles[_activeProfileIndex].RandomIntervalMs = numRandInterval != null ? numRandInterval.Value : 0;
                _profiles[_activeProfileIndex].RandomJitterPx = numRandJitter != null ? numRandJitter.Value : 0;
                _profiles[_activeProfileIndex].SpeedPercent = numSpeed != null ? numSpeed.Value : 100;
            }
        }

        private void ReloadProfileTabs(int activeIndex)
        {
            EnsureProfileExists();

            List<string> names = new List<string>();
            for (int i = 0; i < _profiles.Count; i++)
            {
                names.Add(!string.IsNullOrEmpty(_profiles[i].Name) ? _profiles[i].Name : string.Format("Script {0}", i + 1));
            }

            _activeProfileIndex = Math.Max(0, Math.Min(_profiles.Count - 1, activeIndex));
            profileTabBar.LoadTabs(names, _activeProfileIndex);
            LoadProfileToUI(_profiles[_activeProfileIndex]);
        }

        private void LoadProfileToUI(MacroProfile p)
        {
            if (p == null) return;
            bool wasLoading = _isLoadingUI;
            _isLoadingUI = true;
            try
            {
                tableControl.LoadProfile(p);
                tableControl.SetAvailableScripts(GetAvailableScriptNames(_activeProfileIndex));

                if (numLoop != null) numLoop.Value = p.LoopCount;
                if (numRandJitter != null) numRandJitter.Value = p.RandomJitterPx;
                if (numRandInterval != null) numRandInterval.Value = p.RandomIntervalMs;
                if (numSpeed != null) numSpeed.Value = p.SpeedPercent > 0 ? p.SpeedPercent : 100;

                UpdateStatus();
            }
            finally
            {
                _isLoadingUI = wasLoading;
            }
        }

        public void SwitchActiveProfile(int newIdx)
        {
            if (newIdx < 0 || newIdx >= _profiles.Count || newIdx == _activeProfileIndex) return;

            FlushCurrentProfileFromUI();
            _isLoadingUI = true;
            try
            {
                _activeProfileIndex = newIdx;
                profileTabBar.SetActiveIndex(_activeProfileIndex);
                LoadProfileToUI(_profiles[_activeProfileIndex]);
            }
            finally
            {
                _isLoadingUI = false;
            }

            if (OnActiveScriptChanged != null) OnActiveScriptChanged();
        }

        public void AddNewProfile(MacroProfile p = null)
        {
            FlushCurrentProfileFromUI();

            if (p == null)
            {
                p = new MacroProfile
                {
                    Name = string.Format("Script {0}", _profiles.Count + 1),
                    LoopCount = 0,
                    RandomIntervalMs = 0,
                    RandomJitterPx = 0,
                    Steps = new List<MacroStep>()
                };
            }

            _profiles.Add(p);
            ReloadProfileTabs(_profiles.Count - 1);

            if (OnActiveScriptChanged != null) OnActiveScriptChanged();
        }

        public void DuplicateProfile(int index)
        {
            if (index < 0 || index >= _profiles.Count) return;
            FlushCurrentProfileFromUI();

            MacroProfile src = _profiles[index];
            MacroProfile dup = new MacroProfile
            {
                Name = src.Name + " (Copy)",
                LoopCount = src.LoopCount,
                RandomIntervalMs = src.RandomIntervalMs,
                RandomJitterPx = src.RandomJitterPx,
                SpeedPercent = src.SpeedPercent,
                Steps = new List<MacroStep>()
            };
            foreach (MacroStep s in src.Steps)
            {
                dup.Steps.Add(s.Clone());
            }

            _profiles.Insert(index + 1, dup);
            ReloadProfileTabs(index + 1);

            if (OnActiveScriptChanged != null) OnActiveScriptChanged();
        }

        private void ApplySpeedPercentToCurrentProfile(int newSpeed)
        {
            if (_activeProfileIndex < 0 || _activeProfileIndex >= _profiles.Count) return;
            var prof = _profiles[_activeProfileIndex];
            prof.SpeedPercent = newSpeed;

            var steps = tableControl.GetSteps();
            for (int i = 0; i < steps.Count; i++)
            {
                var s = steps[i];
                if (s == null) continue;
                if (s.BaseHoldMs <= 0) s.BaseHoldMs = Math.Max(1, s.HoldMs);
                if (s.BaseDelayMs <= 0 && s.DelayMs > 0) s.BaseDelayMs = s.DelayMs;

                if (newSpeed == 100)
                {
                    s.HoldMs = Math.Max(1, s.BaseHoldMs);
                    s.DelayMs = Math.Max(0, s.BaseDelayMs);
                }
                else
                {
                    s.HoldMs = Math.Max(1, (int)Math.Round(s.BaseHoldMs * 100.0 / newSpeed));
                    s.DelayMs = Math.Max(0, (int)Math.Round(s.BaseDelayMs * 100.0 / newSpeed));
                }
            }

            tableControl.RefreshAllTimingDisplays(newSpeed);
            UpdateStatus();
        }

        public void ReorderProfile(int fromIndex, int toIndex)
        {
            if (fromIndex == toIndex || fromIndex < 0 || fromIndex >= _profiles.Count || toIndex < 0 || toIndex >= _profiles.Count) return;

            FlushCurrentProfileFromUI();

            MacroProfile item = _profiles[fromIndex];
            _profiles.RemoveAt(fromIndex);
            _profiles.Insert(toIndex, item);

            _activeProfileIndex = toIndex;
            ReloadProfileTabs(_activeProfileIndex);

            if (OnActiveScriptChanged != null) OnActiveScriptChanged();
        }

        public void CloseProfile(int index)
        {
            if (index < 0 || index >= _profiles.Count) return;

            FlushCurrentProfileFromUI();

            MacroProfile target = _profiles[index];
            bool isEmpty = (target.Steps == null || target.Steps.Count == 0);

            if (!isEmpty)
            {
                DialogResult dr = MessageBox.Show(
                    string.Format("Are you sure you want to delete '{0}'?", target.Name),
                    "Confirm Delete Script",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );

                if (dr != DialogResult.Yes) return;
            }

            _profiles.RemoveAt(index);

            if (_profiles.Count == 0)
            {
                _profiles.Add(new MacroProfile
                {
                    Name = "Script 1",
                    LoopCount = 0,
                    RandomIntervalMs = 0,
                    RandomJitterPx = 0,
                    Steps = new List<MacroStep>()
                });
                _activeProfileIndex = 0;
            }
            else if (_activeProfileIndex >= _profiles.Count)
            {
                _activeProfileIndex = _profiles.Count - 1;
            }

            ReloadProfileTabs(_activeProfileIndex);

            if (OnActiveScriptChanged != null) OnActiveScriptChanged();
        }

        public void RenameProfile(int index, string newName)
        {
            if (index >= 0 && index < _profiles.Count && !string.IsNullOrEmpty(newName))
            {
                _profiles[index].Name = newName;
                tableControl.SetAvailableScripts(GetAvailableScriptNames(_activeProfileIndex));
                UpdateStatus();
            }
        }

        public void SetAllProfiles(List<MacroProfile> profiles, int activeIdx = 0)
        {
            _isLoadingUI = true;
            try
            {
                _profiles = profiles ?? new List<MacroProfile>();
                EnsureProfileExists();
                _activeProfileIndex = Math.Max(0, Math.Min(_profiles.Count - 1, activeIdx));
                ReloadProfileTabs(_activeProfileIndex);
            }
            finally
            {
                _isLoadingUI = false;
            }

            if (OnActiveScriptChanged != null) OnActiveScriptChanged();
        }

        public void HighlightExecutingStep(int stepIdx)
        {
            tableControl.HighlightStep(stepIdx);
        }

        public void ClearHighlights()
        {
            if (tableControl != null) tableControl.ClearHighlights();
        }

        public void UpdateStatus(string customStatus = null)
        {
            if (!string.IsNullOrEmpty(customStatus))
            {
                _statusText = customStatus;
            }
            else
            {
                EnsureProfileExists();
                MacroProfile p = (_activeProfileIndex >= 0 && _activeProfileIndex < _profiles.Count) ? _profiles[_activeProfileIndex] : _profiles[0];

                if (!_isLoadingUI)
                {
                    p.Steps = tableControl.GetSteps();
                    p.LoopCount = numLoop != null ? numLoop.Value : 0;
                    p.RandomJitterPx = numRandJitter != null ? numRandJitter.Value : 0;
                    p.RandomIntervalMs = numRandInterval != null ? numRandInterval.Value : 0;
                }

                int cycleMs = p.CalculateEstimatedCycleMs(_profiles);
                string loopStr = p.LoopCount <= 0 ? "Loop: Infinite" : string.Format("Loop: {0} {1}", p.LoopCount, p.LoopCount == 1 ? "time" : "times");
                string jitterStr = (p.RandomIntervalMs > 0 || p.RandomJitterPx > 0)
                    ? string.Format(" | Rand: ±{0}px, ±{1}ms", p.RandomJitterPx, p.RandomIntervalMs)
                    : "";

                _statusText = string.Format("Ready | Script: {0} | Steps: {1} | Est: ~{2:F1}s | {3}{4}",
                    !string.IsNullOrEmpty(p.Name) ? p.Name : "Script",
                    p.Steps != null ? p.Steps.Count : 0,
                    cycleMs / 1000.0,
                    loopStr,
                    jitterStr);
            }

            if (OnStatusChanged != null)
            {
                OnStatusChanged(_statusText);
            }
        }

        private bool IsCurrentScriptEmpty()
        {
            List<MacroStep> steps = tableControl != null ? tableControl.GetSteps() : null;
            if (steps == null || steps.Count == 0) return true;

            foreach (var s in steps)
            {
                if (s.StartPoint != Point.Empty || s.EndPoint != Point.Empty)
                {
                    return false;
                }
                if (s.ActionType == MacroActionType.TypeText && !string.IsNullOrEmpty(s.KeyData))
                {
                    return false;
                }
            }
            return true;
        }

        private void SaveProfile()
        {
            FlushCurrentProfileFromUI();
            EnsureProfileExists();
            MacroProfile cur = _profiles[_activeProfileIndex];
            FileManager.SaveProfileWithDialog((IWin32Window)this.FindForm() ?? this, cur);
        }

        private void LoadProfile()
        {
            FileManager.LoadScriptsWithDialog((IWin32Window)this.FindForm() ?? this, (loadedProfiles) =>
            {
                if (loadedProfiles == null || loadedProfiles.Count == 0) return;

                FlushCurrentProfileFromUI();
                EnsureProfileExists();

                bool isCurrentEmpty = IsCurrentScriptEmpty();

                if (isCurrentEmpty)
                {
                    // Replace the currently selected empty script with the 1st loaded script
                    _profiles[_activeProfileIndex] = loadedProfiles[0];

                    // Append any additional loaded scripts as new tabs
                    for (int i = 1; i < loadedProfiles.Count; i++)
                    {
                        _profiles.Add(loadedProfiles[i]);
                    }

                    ReloadProfileTabs(_activeProfileIndex);
                }
                else
                {
                    // Current script is not empty: append all loaded scripts as new tabs
                    int firstNewIndex = _profiles.Count;
                    foreach (var p in loadedProfiles)
                    {
                        _profiles.Add(p);
                    }

                    ReloadProfileTabs(firstNewIndex);
                }

                UpdateStatus();
                if (OnActiveScriptChanged != null) OnActiveScriptChanged();
            });
        }

        private void ShowTemplateMenu()
        {
            if (btnTemplate == null) return;
            btnTemplate.IsOpen = true;

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Renderer = new ModernMenuRenderer(_theme);
            menu.ShowImageMargin = false;
            menu.Closed += (s, e) => { btnTemplate.IsOpen = false; };

            var templates = BuiltInTemplates.GetAllTemplates();

            if (templates == null || templates.Count == 0)
            {
                ToolStripMenuItem emptyItem = new ToolStripMenuItem("(No templates found)");
                emptyItem.Enabled = false;
                menu.Items.Add(emptyItem);
            }
            else
            {
                foreach (var kvp in templates)
                {
                    string templateName = kvp.Key;
                    string templateJson = kvp.Value;

                    ToolStripMenuItem item = new ToolStripMenuItem(templateName);
                    item.Click += (s, e) => LoadTemplateContent(templateName, templateJson);
                    menu.Items.Add(item);
                }
            }

            menu.Show(btnTemplate, new Point(0, btnTemplate.Height));
        }

        private void LoadTemplateContent(string templateName, string jsonContent)
        {
            if (string.IsNullOrEmpty(jsonContent)) return;

            try
            {
                MacroProject proj = MacroStorage.ProjectFromJson(jsonContent);
                if (proj != null && proj.Profiles != null && proj.Profiles.Count > 0)
                {
                    List<MacroProfile> loadedProfiles = new List<MacroProfile>();
                    foreach (var profile in proj.Profiles)
                    {
                        if (string.IsNullOrEmpty(profile.Name))
                        {
                            profile.Name = !string.IsNullOrEmpty(templateName) ? templateName : "Template";
                        }
                        loadedProfiles.Add(profile);
                    }

                    if (loadedProfiles.Count > 0)
                    {
                        FlushCurrentProfileFromUI();
                        EnsureProfileExists();

                        bool isCurrentEmpty = IsCurrentScriptEmpty();

                        if (isCurrentEmpty)
                        {
                            _profiles[_activeProfileIndex] = loadedProfiles[0];
                            for (int i = 1; i < loadedProfiles.Count; i++)
                            {
                                _profiles.Add(loadedProfiles[i]);
                            }
                            ReloadProfileTabs(_activeProfileIndex);
                        }
                        else
                        {
                            int firstNewIndex = _profiles.Count;
                            foreach (var p in loadedProfiles)
                            {
                                _profiles.Add(p);
                            }
                            ReloadProfileTabs(firstNewIndex);
                        }

                        UpdateStatus();
                        if (OnActiveScriptChanged != null) OnActiveScriptChanged();
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "Failed to load template:\n" + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            this.BackColor = t.BgPrimary;

            if (profileTabBar != null)
            {
                profileTabBar.ApplyTheme(t);
            }

            RoundedButton[] buttons = new RoundedButton[] { btnAddStep, btnCloneSelected, btnClearAll, btnSaveProfile, btnLoadProfile };
            foreach (RoundedButton btn in buttons)
            {
                if (btn != null)
                {
                    btn.NormalColor = t.BgElevated;
                    btn.ForeColor = t.TextPrimary;
                    btn.HoverColor = (btn == btnClearAll) ? t.Danger : t.AccentPrimary;
                    btn.BorderRadius = t.RadiusSm;
                    btn.Invalidate();
                }
            }
            if (btnTemplate != null) btnTemplate.ApplyTheme(t);

            Label[] labels = new Label[] { lblLoop, lblRandJitter, lblRandInterval, lblSpeed };
            foreach (Label lbl in labels)
            {
                if (lbl != null) lbl.ForeColor = t.TextSecondary;
            }

            Label[] hintLabels = new Label[] { lblLoopHint, lblRandJitterUnit, lblRandIntervalUnit, lblSpeedUnit };
            foreach (Label lbl in hintLabels)
            {
                if (lbl != null) lbl.ForeColor = t.TextTertiary;
            }

            NumberInput[] numInputs = new NumberInput[] { numLoop, numRandJitter, numRandInterval, numSpeed };
            foreach (NumberInput num in numInputs)
            {
                if (num != null) num.ApplyTheme(t);
            }

            if (tableControl != null)
            {
                tableControl.ApplyTheme(t);
            }

            if (pnlBodyCard != null)
            {
                pnlBodyCard.BackColor = t.BgSecondary;
                pnlBodyCard.BorderColor = t.BorderColor;
                pnlBodyCard.BorderRadius = t.RadiusMd;
                pnlBodyCard.BorderSize = 1;
                pnlBodyCard.Invalidate();
            }

            this.Invalidate();
        }

        public void SetScriptRunning(string scriptName, bool isRunning)
        {
            if (profileTabBar != null)
            {
                profileTabBar.SetTabRunningByTitle(scriptName, isRunning);
            }
        }

        public void SetScriptEditingLocked(bool isLocked)
        {
            if (tableControl != null) tableControl.SetEditingLocked(isLocked);
            if (btnAddStep != null) btnAddStep.Enabled = !isLocked;
            if (btnCloneSelected != null) btnCloneSelected.Enabled = !isLocked;
            if (btnClearAll != null) btnClearAll.Enabled = !isLocked;
            if (btnLoadProfile != null) btnLoadProfile.Enabled = !isLocked;
            if (btnTemplate != null) btnTemplate.Enabled = !isLocked;
            if (numLoop != null) numLoop.Enabled = !isLocked;
            if (numRandJitter != null) numRandJitter.Enabled = !isLocked;
            if (numRandInterval != null) numRandInterval.Enabled = !isLocked;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_vfxOverdrive != null)
                {
                    _vfxOverdrive.Dispose();
                    _vfxOverdrive = null;
                }
            }
            base.Dispose(disposing);
        }
    }
}
