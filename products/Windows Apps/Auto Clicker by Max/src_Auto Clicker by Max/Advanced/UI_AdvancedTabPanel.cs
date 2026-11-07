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
        private IconTextButton btnAddStep;
        private IconTextButton btnCloneSelected;
        private IconTextButton btnClearAll;
        private const int FileBtnW = 112;
        private IconTextButton btnSaveProfile;
        private IconTextButton btnLoadProfile;
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

        // Name of the open script. Unlike GetCurrentProfile it does not sync the step table, so a timer can poll it
        public string ActiveScriptName
        {
            get { return (_activeProfileIndex >= 0 && _activeProfileIndex < _profiles.Count) ? _profiles[_activeProfileIndex].Name : null; }
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

        /// <summary>
        /// Script names are the key for runners, RunScript targets and tab running state, so they must be unique (case-insensitive) and non-empty.
        /// Returns desired if free, otherwise "desired (2)", "desired (3)"...
        /// </summary>
        private string MakeUniqueName(string desired, int ownIndex)
        {
            string baseName = !string.IsNullOrEmpty(desired) ? desired.Trim() : "";
            if (baseName.Length == 0) baseName = string.Format("Script {0}", ownIndex + 1);

            string candidate = baseName;
            int suffix = 2;
            while (IsNameTaken(candidate, ownIndex))
            {
                candidate = string.Format("{0} ({1})", baseName, suffix++);
            }
            return candidate;
        }

        private bool IsNameTaken(string name, int ownIndex)
        {
            for (int i = 0; i < _profiles.Count; i++)
            {
                if (i == ownIndex) continue;
                if (string.Equals(_profiles[i].Name, name, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        // Keeps the first occurrence of each name, suffixes later duplicates (used when a whole profile list is loaded)
        private void NormalizeProfileNames()
        {
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < _profiles.Count; i++)
            {
                string baseName = !string.IsNullOrEmpty(_profiles[i].Name) ? _profiles[i].Name.Trim() : "";
                if (baseName.Length == 0) baseName = string.Format("Script {0}", i + 1);

                string candidate = baseName;
                int suffix = 2;
                while (seen.Contains(candidate))
                {
                    candidate = string.Format("{0} ({1})", baseName, suffix++);
                }
                _profiles[i].Name = candidate;
                seen.Add(candidate);
            }
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
            if (profileTabBar != null) profileTabBar.RefreshTabTitles();
            if (btnCloneSelected != null) btnCloneSelected.Text = Loc.AdvBtnClone;
            if (btnSaveProfile != null) btnSaveProfile.Text = Loc.AdvBtnSave;
            if (btnLoadProfile != null) btnLoadProfile.Text = Loc.AdvBtnLoad;
            if (btnClearAll != null) btnClearAll.Text = Loc.AdvBtnClear;
            if (btnTemplate != null) btnTemplate.Text = Loc.AdvBtnTemplate;

            LayoutBottomOptions();

            if (tableControl != null) tableControl.ApplyLanguage();
        }

        private void LayoutBottomOptions()
        {
            if (pnlBodyCard == null || lblLoop == null) return;

            int bh = pnlBodyCard.Height;
            int optY = Math.Max(10, bh - 38);
            int rowH = 30;
            int inputH = 22;
            int inputTop = optY + ((rowH - inputH) / 2); // Perfectly centered vertically
            int curX = 10;
            const int gapInput = 5;
            const int gapUnit = 5;
            const int groupGap = 20;

            // Group 1: Loop
            if (lblLoop != null)
            {
                lblLoop.Text = Loc.AdvLblLoop;
                Size sz = TextRenderer.MeasureText(lblLoop.Text, lblLoop.Font);
                lblLoop.Location = new Point(curX, optY);
                lblLoop.Size = new Size(sz.Width + 2, rowH);
                curX += lblLoop.Width + gapInput;
            }
            if (numLoop != null)
            {
                numLoop.Location = new Point(curX, inputTop);
                numLoop.Size = new Size(40, inputH);
                curX += 40 + gapUnit;
            }
            if (lblLoopHint != null)
            {
                lblLoopHint.Text = "(0 = ∞)";
                Size sz = TextRenderer.MeasureText(lblLoopHint.Text, lblLoopHint.Font);
                lblLoopHint.Location = new Point(curX, inputTop);
                lblLoopHint.Size = new Size(sz.Width + 2, inputH);
                curX += lblLoopHint.Width + groupGap;
            }

            // Group 2: Jitter
            if (lblRandJitter != null)
            {
                lblRandJitter.Text = Loc.AdvLblJitter;
                Size sz = TextRenderer.MeasureText(lblRandJitter.Text, lblRandJitter.Font);
                lblRandJitter.Location = new Point(curX, optY);
                lblRandJitter.Size = new Size(sz.Width + 2, rowH);
                curX += lblRandJitter.Width + gapInput;
            }
            if (numRandJitter != null)
            {
                numRandJitter.Location = new Point(curX, inputTop);
                numRandJitter.Size = new Size(40, inputH);
                curX += 40 + gapUnit;
            }
            if (lblRandJitterUnit != null)
            {
                lblRandJitterUnit.Text = "± px";
                Size sz = TextRenderer.MeasureText(lblRandJitterUnit.Text, lblRandJitterUnit.Font);
                lblRandJitterUnit.Location = new Point(curX, inputTop);
                lblRandJitterUnit.Size = new Size(sz.Width + 2, inputH);
                curX += lblRandJitterUnit.Width + groupGap;
            }

            // Group 3: Interval
            if (lblRandInterval != null)
            {
                lblRandInterval.Text = Loc.AdvLblInterval;
                Size sz = TextRenderer.MeasureText(lblRandInterval.Text, lblRandInterval.Font);
                lblRandInterval.Location = new Point(curX, optY);
                lblRandInterval.Size = new Size(sz.Width + 2, rowH);
                curX += lblRandInterval.Width + gapInput;
            }
            if (numRandInterval != null)
            {
                numRandInterval.Location = new Point(curX, inputTop);
                numRandInterval.Size = new Size(40, inputH);
                curX += 40 + gapUnit;
            }
            if (lblRandIntervalUnit != null)
            {
                lblRandIntervalUnit.Text = "± ms";
                Size sz = TextRenderer.MeasureText(lblRandIntervalUnit.Text, lblRandIntervalUnit.Font);
                lblRandIntervalUnit.Location = new Point(curX, inputTop);
                lblRandIntervalUnit.Size = new Size(sz.Width + 2, inputH);
                curX += lblRandIntervalUnit.Width + groupGap;
            }

            // Group 4: Speed
            if (lblSpeed != null)
            {
                lblSpeed.Text = Loc.AdvLblSpeed;
                Size sz = TextRenderer.MeasureText(lblSpeed.Text, lblSpeed.Font);
                lblSpeed.Location = new Point(curX, optY);
                lblSpeed.Size = new Size(sz.Width + 2, rowH);
                curX += lblSpeed.Width + gapInput;
            }
            if (numSpeed != null)
            {
                numSpeed.Location = new Point(curX, inputTop);
                numSpeed.Size = new Size(40, inputH);
                curX += 40 + gapUnit;
            }
            if (lblSpeedUnit != null)
            {
                lblSpeedUnit.Text = "%";
                Size sz = TextRenderer.MeasureText(lblSpeedUnit.Text, lblSpeedUnit.Font);
                lblSpeedUnit.Location = new Point(curX, inputTop);
                lblSpeedUnit.Size = new Size(sz.Width + 2, inputH);
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);

            int w = this.Width;
            int h = this.Height;
            if (w <= 0 || h <= 0) return;

            this.SuspendLayout();

            // 1. Profile tabs & Template button outside on top (Y = 0, Height = 26)
            bool showTemplate = btnTemplate != null && btnTemplate.Visible;
            if (profileTabBar != null) profileTabBar.Size = new Size(Math.Max(50, showTemplate ? w - 86 - 6 : w - 8), 26);
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
                if (btnLoadProfile != null) btnLoadProfile.Location = new Point(bw - 8 - FileBtnW, 8);
                if (btnSaveProfile != null) btnSaveProfile.Location = new Point(bw - 8 - FileBtnW - 6 - FileBtnW, 8);

                // Macro table (Y = 38)
                int tableH = Math.Max(100, bh - 38 - 46);
                if (tableControl != null)
                {
                    tableControl.Location = new Point(8, 38);
                    tableControl.Size = new Size(Math.Max(200, bw - 16), tableH);
                }

                // Bottom options layout (Dynamic measured 2-line labels & 40px inputs)
                LayoutBottomOptions();

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
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                // Hidden for now at the author's request; the template menu and data are kept to bring it back later
                Visible = false
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
            // Toolbar buttons carry an icon left of the text (sized to fit both)
            btnAddStep = new IconTextButton
            {
                Text = "Add Step",
                Location = new Point(8, 8),
                Size = new Size(108, 24),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
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

            btnCloneSelected = new IconTextButton
            {
                Text = "Clone Step(s)",
                Location = new Point(122, 8),
                Size = new Size(132, 24),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            btnCloneSelected.Click += (s, e) =>
            {
                tableControl.DuplicateSelectedSteps();
                UpdateStatus();
            };

            btnClearAll = new IconTextButton
            {
                Text = "Clear All Steps",
                Location = new Point(260, 8),
                Size = new Size(138, 24),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            btnClearAll.Click += (s, e) =>
            {
                int count = tableControl.GetSteps().Count;
                if (count == 0) return;
                if (ModernMessageBox.Show(Loc.AdvClearAllConfirmMsg(count), Loc.AdvClearAllConfirmTitle,
                    MessageBoxButtons.YesNo, MessageBoxIcon.Warning, this) != DialogResult.Yes) return;
                tableControl.ClearAll();
                UpdateStatus();
            };

            // Right Side: Script file operations (aligned with right edge of body card)
            btnSaveProfile = new IconTextButton
            {
                Text = "Save Script",
                Location = new Point(400, 8),
                Size = new Size(FileBtnW, 24),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
            };
            btnSaveProfile.Click += (s, e) => SaveProfile();

            btnLoadProfile = new IconTextButton
            {
                Text = "Load Script",
                Location = new Point(494, 8),
                Size = new Size(FileBtnW, 24),
                Font = ThemeTokens.FontBase(FontStyle.Regular)
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

            // 4. Bottom Options Row (2-line labels & unified 40px NumberInputs)
            lblLoop = new Label
            {
                Text = Loc.AdvLblLoop,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleRight
            };

            numLoop = new NumberInput
            {
                Size = new Size(40, 22),
                Minimum = 0,
                Maximum = 999999,
                Step = 1,
                AllowEmpty = true,
                Value = 0,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numLoop.TextChanged += (s, e) => UpdateStatus();

            lblLoopHint = new Label
            {
                Text = "(0 = ∞)",
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblRandJitter = new Label
            {
                Text = Loc.AdvLblJitter,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleRight
            };

            numRandJitter = new NumberInput
            {
                Size = new Size(40, 22),
                Minimum = 0,
                Maximum = 100,
                Step = 1,
                AllowEmpty = true,
                Value = 0,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
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
                Text = "± px",
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblRandInterval = new Label
            {
                Text = Loc.AdvLblInterval,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleRight
            };

            numRandInterval = new NumberInput
            {
                Size = new Size(40, 22),
                Minimum = 0,
                Maximum = 10000,
                Step = 5,
                AllowEmpty = true,
                Value = 0,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numRandInterval.TextChanged += (s, e) => UpdateStatus();

            lblRandIntervalUnit = new Label
            {
                Text = "± ms",
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblSpeed = new Label
            {
                Text = Loc.AdvLblSpeed,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleRight
            };

            numSpeed = new NumberInput
            {
                Size = new Size(40, 22),
                Minimum = 10,
                Maximum = 2000,
                Step = 10,
                AllowEmpty = false,
                Value = 100,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
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
                Font = ThemeTokens.FontSmall(FontStyle.Regular),
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

            LayoutBottomOptions();

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
            ApplyTabMarkers();
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
            p.Name = MakeUniqueName(p.Name, _profiles.Count - 1);
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
            dup.Name = MakeUniqueName(dup.Name, index + 1);
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

            // Deleting a running script would leave its runner clicking in the background with no tab to stop it from
            if (_runningScripts.Contains(_profiles[index].Name ?? ""))
            {
                ModernMessageBox.Show(
                    Loc.DeleteScriptRunningMsg(_profiles[index].Name),
                    Loc.DeleteScriptRunningTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information,
                    this);
                return;
            }

            FlushCurrentProfileFromUI();

            MacroProfile target = _profiles[index];
            bool isEmpty = (target.Steps == null || target.Steps.Count == 0);
            List<string> callers = FindRunScriptCallers(target.Name, index);

            if (callers.Count > 0)
            {
                DialogResult dr = ModernMessageBox.Show(
                    Loc.DeleteScriptInUseMsg(target.Name, string.Join(", ", callers.ToArray())),
                    Loc.DeleteScriptInUseTitle,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning,
                    this
                );

                if (dr != DialogResult.Yes) return;
            }
            else if (!isEmpty)
            {
                DialogResult dr = ModernMessageBox.Show(
                    Loc.DeleteScriptConfirmMsg(target.Name),
                    Loc.DeleteScriptConfirmTitle,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question,
                    this
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
                FlushCurrentProfileFromUI();
                string oldName = _profiles[index].Name;
                string uniqueName = MakeUniqueName(newName, index);
                _profiles[index].Name = uniqueName;
                if (uniqueName != newName.Trim()) profileTabBar.SetTabTitle(index, uniqueName);
                if (!string.Equals(oldName, uniqueName, StringComparison.Ordinal))
                {
                    UpdateRunScriptReferences(oldName, uniqueName);
                    foreach (HashSet<string> called in _calledByRunning.Values)
                    {
                        if (called.Remove(oldName)) called.Add(uniqueName);
                    }
                    ApplyTabMarkers();
                }
                tableControl.SetAvailableScripts(GetAvailableScriptNames(_activeProfileIndex));
                UpdateStatus();
            }
        }

        // RunScript steps reference their target by name (KeyData), so a rename must follow through every script
        private void UpdateRunScriptReferences(string oldName, string newName)
        {
            if (string.IsNullOrEmpty(oldName)) return;
            foreach (MacroProfile p in _profiles)
            {
                if (p.Steps == null) continue;
                foreach (MacroStep s in p.Steps)
                {
                    if (s.ActionType == MacroActionType.RunScript && string.Equals(s.KeyData, oldName, StringComparison.OrdinalIgnoreCase))
                    {
                        s.KeyData = newName;
                    }
                }
            }
        }

        public void SetAllProfiles(List<MacroProfile> profiles, int activeIdx = 0)
        {
            _isLoadingUI = true;
            try
            {
                _profiles = profiles ?? new List<MacroProfile>();
                EnsureProfileExists();
                NormalizeProfileNames();
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
            UpdateToolbarButtonStates();
        }

        // Clone and Clear All have nothing to act on in an empty script: they stay gray (still clickable, as no-ops) until there are steps
        private void UpdateToolbarButtonStates()
        {
            if (tableControl == null || _theme == null) return;
            bool hasSteps = tableControl.GetSteps().Count > 0;
            StyleToolbarButton(btnCloneSelected, AppIcons.Clone, hasSteps, _theme.AccentPrimary);
            StyleToolbarButton(btnClearAll, AppIcons.Clear, hasSteps, _theme.Danger);
        }

        private void StyleToolbarButton(RoundedButton btn, string icon, bool usable, Color hoverColor)
        {
            if (btn == null) return;
            Color fore = usable ? _theme.TextPrimary : _theme.TextTertiary;
            Color hover = usable ? hoverColor : _theme.BgElevated;
            if (btn.ForeColor == fore && btn.HoverColor == hover && btn.Image != null) return;
            btn.ForeColor = fore;
            btn.HoverColor = hover;
            AppIcons.Set(btn, icon, fore);
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
                    loadedProfiles[0].Name = MakeUniqueName(loadedProfiles[0].Name, _activeProfileIndex);

                    // Append any additional loaded scripts as new tabs
                    for (int i = 1; i < loadedProfiles.Count; i++)
                    {
                        _profiles.Add(loadedProfiles[i]);
                        loadedProfiles[i].Name = MakeUniqueName(loadedProfiles[i].Name, _profiles.Count - 1);
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
                        p.Name = MakeUniqueName(p.Name, _profiles.Count - 1);
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
                ToolStripMenuItem emptyItem = new ToolStripMenuItem(Loc.TemplateNoneFound);
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
                            loadedProfiles[0].Name = MakeUniqueName(loadedProfiles[0].Name, _activeProfileIndex);
                            for (int i = 1; i < loadedProfiles.Count; i++)
                            {
                                _profiles.Add(loadedProfiles[i]);
                                loadedProfiles[i].Name = MakeUniqueName(loadedProfiles[i].Name, _profiles.Count - 1);
                            }
                            ReloadProfileTabs(_activeProfileIndex);
                        }
                        else
                        {
                            int firstNewIndex = _profiles.Count;
                            foreach (var p in loadedProfiles)
                            {
                                _profiles.Add(p);
                                p.Name = MakeUniqueName(p.Name, _profiles.Count - 1);
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
                ModernMessageBox.Show(Loc.TemplateLoadFailed(ex.Message), Loc.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, this);
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
            AppIcons.Set(btnAddStep, AppIcons.Add, t.TextPrimary);
            AppIcons.Set(btnSaveProfile, AppIcons.Save, t.TextPrimary);
            AppIcons.Set(btnLoadProfile, AppIcons.Import, t.TextPrimary);
            UpdateToolbarButtonStates();
            if (btnTemplate != null) btnTemplate.ApplyTheme(t);

            Label[] labels = new Label[] { lblLoop, lblRandJitter, lblRandInterval, lblSpeed };
            foreach (Label lbl in labels)
            {
                if (lbl != null) lbl.ForeColor = t.TextPrimary;
            }

            Label[] hintLabels = new Label[] { lblLoopHint, lblRandJitterUnit, lblRandIntervalUnit, lblSpeedUnit };
            foreach (Label lbl in hintLabels)
            {
                if (lbl != null) lbl.ForeColor = t.TextSecondary;
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

        // Kept here (not on tab items) because LoadTabs recreates every tab item on add/duplicate/load
        private readonly HashSet<string> _runningScripts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        // Running script -> scripts it calls via RunScript, captured at start (the runner works on a snapshot taken at the same moment)
        private readonly Dictionary<string, HashSet<string>> _calledByRunning = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        public void SetScriptRunning(string scriptName, bool isRunning)
        {
            if (string.IsNullOrEmpty(scriptName)) return;

            if (isRunning)
            {
                _runningScripts.Add(scriptName);
                _calledByRunning[scriptName] = CollectCalledScripts(scriptName);
            }
            else
            {
                _runningScripts.Remove(scriptName);
                _calledByRunning.Remove(scriptName);
            }
            ApplyTabMarkers();
        }

        private void ApplyTabMarkers()
        {
            if (profileTabBar == null) return;
            for (int i = 0; i < _profiles.Count; i++)
            {
                string name = _profiles[i].Name ?? "";
                bool running = _runningScripts.Contains(name);
                bool inUse = false;
                if (!running)
                {
                    foreach (HashSet<string> called in _calledByRunning.Values)
                    {
                        if (called.Contains(name)) { inUse = true; break; }
                    }
                }
                profileTabBar.SetTabRunning(i, running);
                profileTabBar.SetTabInUse(i, inUse);
            }
        }

        // All scripts reachable from rootName through enabled RunScript steps (nested calls included, root excluded)
        private HashSet<string> CollectCalledScripts(string rootName)
        {
            HashSet<string> result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            Queue<string> pending = new Queue<string>();
            pending.Enqueue(rootName);

            while (pending.Count > 0)
            {
                string current = pending.Dequeue();
                MacroProfile p = _profiles.Find(x => string.Equals(x.Name, current, StringComparison.OrdinalIgnoreCase));
                if (p == null || p.Steps == null) continue;

                foreach (MacroStep s in p.Steps)
                {
                    if (!s.Enabled || s.ActionType != MacroActionType.RunScript || string.IsNullOrEmpty(s.KeyData)) continue;
                    if (string.Equals(s.KeyData, rootName, StringComparison.OrdinalIgnoreCase)) continue;
                    if (result.Add(s.KeyData)) pending.Enqueue(s.KeyData);
                }
            }
            return result;
        }

        // A script plus every script it can run through RunScript: the steps a run of rootName can reach
        public List<MacroProfile> GetProfilesUsedBy(string rootName)
        {
            FlushCurrentProfileFromUI();

            List<MacroProfile> result = new List<MacroProfile>();
            MacroProfile root = _profiles.Find(x => string.Equals(x.Name, rootName, StringComparison.OrdinalIgnoreCase));
            if (root != null) result.Add(root);

            foreach (string name in CollectCalledScripts(rootName))
            {
                MacroProfile called = _profiles.Find(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase));
                if (called != null && !called.IsCombine) result.Add(called);
            }
            return result;
        }

        // Moves every step of rootName and the scripts it calls from one target window to another (null window = All Screens)
        public void ReplaceWindowTarget(string rootName, string oldProcess, string oldTitle, int oldIndex, NativeMethods.WindowTargetInfo newWindow)
        {
            foreach (MacroProfile p in GetProfilesUsedBy(rootName))
            {
                if (p.Steps == null) continue;
                foreach (MacroStep s in p.Steps)
                {
                    if (!s.RelativeToWindow || s.WindowIndex != oldIndex) continue;
                    if (!string.Equals(s.ProcessName ?? "", oldProcess ?? "", StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.Equals(s.WindowTitle ?? "", oldTitle ?? "", StringComparison.OrdinalIgnoreCase)) continue;

                    s.RelativeToWindow = newWindow != null;
                    s.WindowHwnd = newWindow != null ? newWindow.Hwnd : IntPtr.Zero;
                    s.TargetPid = newWindow != null ? newWindow.ProcessId : 0;
                    s.ProcessName = newWindow != null ? newWindow.ProcessName : "";
                    s.WindowTitle = newWindow != null ? newWindow.Title : "";
                    s.WindowIndex = newWindow != null ? newWindow.WindowIndex : 0;
                }
            }
            tableControl.RefreshWindowIcons();
        }

        // Names of other scripts that have a RunScript step targeting scriptName (disabled steps included: they break if re-enabled)
        private List<string> FindRunScriptCallers(string scriptName, int ownIndex)
        {
            List<string> callers = new List<string>();
            for (int i = 0; i < _profiles.Count; i++)
            {
                if (i == ownIndex || _profiles[i].Steps == null) continue;
                foreach (MacroStep s in _profiles[i].Steps)
                {
                    if (s.ActionType == MacroActionType.RunScript && string.Equals(s.KeyData, scriptName, StringComparison.OrdinalIgnoreCase))
                    {
                        callers.Add(_profiles[i].Name);
                        break;
                    }
                }
            }
            return callers;
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
                Loc.OnLanguageChanged -= ApplyLanguage;
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
