using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class AdvancedTabPanel : RoundedPanel
    {
        private ThemeTokens _theme;

        // Sub-Tab Bar for Multi-Scripts
        private ProfileTabControl profileTabBar;
        private List<MacroProfile> _profiles = new List<MacroProfile>();
        private int _activeProfileIndex = 0;

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
            this.BorderRadius = _theme.RadiusMd;
            this.BorderSize = 1;
            this.DoubleBuffered = true;

            _vfxOverdrive = new VFX_AsianDragonOverdrive();
            _vfxOverdrive.Attach(this);

            InitializeComponents();
            ApplyTheme(_theme);
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
            // 1. Profile Sub-Tab Bar & Template Button (Y = 6, Height = 28)
            profileTabBar = new ProfileTabControl
            {
                Location = new Point(8, 6),
                Size = new Size(574 - 90, 28)
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
                Location = new Point(8 + 574 - 86, 6),
                Size = new Size(86, 28),
                Font = new Font("Segoe UI", 7.5F, FontStyle.Bold)
            };
            btnTemplate.Click += (s, e) => ShowTemplateMenu();

            // 2. Top Toolbar (Y = 36, Height = 24)
            int x = 8;
            btnAddStep = new RoundedButton
            {
                Text = "➕ Add Step",
                Location = new Point(x, 36),
                Size = new Size(88, 24),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
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
                }
                tableControl.AddStep(step);
                UpdateStatus();
            };
            x += 92;

            btnCloneSelected = new RoundedButton
            {
                Text = "Clone",
                Location = new Point(x, 36),
                Size = new Size(54, 24),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            btnCloneSelected.Click += (s, e) =>
            {
                tableControl.DuplicateSelectedSteps();
                UpdateStatus();
            };
            x += 58;

            btnSaveProfile = new RoundedButton
            {
                Text = "Save",
                Location = new Point(x, 36),
                Size = new Size(48, 24),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            btnSaveProfile.Click += (s, e) => SaveProfile();
            x += 52;

            btnLoadProfile = new RoundedButton
            {
                Text = "Load",
                Location = new Point(x, 36),
                Size = new Size(48, 24),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            btnLoadProfile.Click += (s, e) => LoadProfile();
            x += 52;

            btnClearAll = new RoundedButton
            {
                Text = "Clear",
                Location = new Point(x, 36),
                Size = new Size(48, 24),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold)
            };
            btnClearAll.Click += (s, e) =>
            {
                tableControl.ClearAll();
                UpdateStatus();
            };
            x += 52;

            // 3. Shared Macro Table Control (Y = 64, Height = 382)
            tableControl = new MacroTableControl
            {
                Location = new Point(8, 64),
                Size = new Size(574, 382)
            };
            tableControl.OnTableDataChanged += () =>
            {
                UpdateStatus();
                if (OnActiveScriptChanged != null) OnActiveScriptChanged();
            };
            tableControl.OnDefaultWindowBatchChanged += (rel, proc, title) =>
            {
                if (_activeProfileIndex >= 0 && _activeProfileIndex < _profiles.Count)
                {
                    _profiles[_activeProfileIndex].DefaultRelativeToWindow = rel;
                    _profiles[_activeProfileIndex].DefaultProcessName = proc ?? "";
                    _profiles[_activeProfileIndex].DefaultWindowTitle = title ?? "";
                }
            };

            // 4. Bottom Options Row (Y = 452, Height = 24)
            lblLoop = new Label
            {
                Text = "Loop:",
                Location = new Point(8, 454),
                Size = new Size(36, 20),
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
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
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numLoop.TextChanged += (s, e) => UpdateStatus();

            lblLoopHint = new Label
            {
                Text = "(0=∞)",
                Location = new Point(92, 454),
                Size = new Size(42, 20),
                Font = new Font("Segoe UI", 7.5F),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblRandJitter = new Label
            {
                Text = "Jitter: ±",
                Location = new Point(148, 454),
                Size = new Size(52, 20),
                Font = new Font("Segoe UI", 8F),
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
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
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
                Font = new Font("Segoe UI", 8F),
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblRandInterval = new Label
            {
                Text = "Interval: ±",
                Location = new Point(272, 454),
                Size = new Size(62, 20),
                Font = new Font("Segoe UI", 8F),
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
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                TextAlign = HorizontalAlignment.Center
            };
            numRandInterval.TextChanged += (s, e) => UpdateStatus();

            lblRandIntervalUnit = new Label
            {
                Text = "ms",
                Location = new Point(376, 454),
                Size = new Size(22, 20),
                Font = new Font("Segoe UI", 8F),
                TextAlign = ContentAlignment.MiddleLeft
            };

            this.Controls.AddRange(new Control[] {
                profileTabBar, btnTemplate,
                btnAddStep, btnCloneSelected, btnSaveProfile, btnLoadProfile, btnClearAll,
                tableControl,
                lblLoop, numLoop, lblLoopHint,
                lblRandJitter, numRandJitter, lblRandJitterUnit,
                lblRandInterval, numRandInterval, lblRandIntervalUnit
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
            _isLoadingUI = true;
            try
            {
                tableControl.SetAvailableScripts(GetAvailableScriptNames(_activeProfileIndex));
                tableControl.LoadProfile(p);

                if (numLoop != null) numLoop.Value = p.LoopCount;
                if (numRandJitter != null) numRandJitter.Value = p.RandomJitterPx;
                if (numRandInterval != null) numRandInterval.Value = p.RandomIntervalMs;

                UpdateStatus();
            }
            finally
            {
                _isLoadingUI = false;
            }
        }

        public void SwitchActiveProfile(int newIdx)
        {
            if (newIdx < 0 || newIdx >= _profiles.Count || newIdx == _activeProfileIndex) return;

            FlushCurrentProfileFromUI();
            _activeProfileIndex = newIdx;
            profileTabBar.SetActiveIndex(_activeProfileIndex);
            LoadProfileToUI(_profiles[_activeProfileIndex]);

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

                p.Steps = tableControl.GetSteps();
                p.LoopCount = numLoop != null ? numLoop.Value : 0;
                p.RandomJitterPx = numRandJitter != null ? numRandJitter.Value : 0;
                p.RandomIntervalMs = numRandInterval != null ? numRandInterval.Value : 0;

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
            this.BackColor = t.BgSecondary;
            this.BorderColor = t.BorderColor;
            this.BorderRadius = t.RadiusMd;

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

            Label[] labels = new Label[] { lblLoop, lblRandJitter, lblRandInterval };
            foreach (Label lbl in labels)
            {
                if (lbl != null) lbl.ForeColor = t.TextSecondary;
            }

            Label[] hintLabels = new Label[] { lblLoopHint, lblRandJitterUnit, lblRandIntervalUnit };
            foreach (Label lbl in hintLabels)
            {
                if (lbl != null) lbl.ForeColor = t.TextTertiary;
            }

            NumberInput[] numInputs = new NumberInput[] { numLoop, numRandJitter, numRandInterval };
            foreach (NumberInput num in numInputs)
            {
                if (num != null) num.ApplyTheme(t);
            }

            if (tableControl != null)
            {
                tableControl.ApplyTheme(t);
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
            if (tableControl != null) tableControl.Enabled = !isLocked;
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
