using System;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace BookForge
{
    public partial class MainForm : Form
    {
        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
        private const int EM_GETFIRSTVISIBLELINE = 0x00CE;
        private const int EM_GETLINECOUNT = 0x00BA;
        private const int EM_LINESCROLL = 0x00B6;

        private bool isSyncingLogScroll = false;
        private bool isExtractSettingsCollapsed = false;
        private bool isPublishSettingsCollapsed = false;
        private bool isExecuting = false;
        private ToolTip toolTipValidation = new ToolTip();
        private EngineRunner runner = new EngineRunner();
        private string activeBookDir = "";
        private string generatedPdfPath = "";
        private Action<string> currentRunLogger = null;

        public MainForm()
        {
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.ResizeRedraw |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.UserPaint, true);

            InitializeComponent();
            SetupEvents();
            SetupLogScrollbar();
            ApplyCustomStyles();
            LoadConfig();
            UpdatePublishProjectInspector(txtPublishFolder.Text);
            UpdateDynamicLayout();
            UpdateActionButtonsValidation();
        }

        private void SetupEvents()
        {
            // Tab change event
            tabBar.OnTabChanged += (index) =>
            {
                pnlTabExtract.Visible = (index == 0);
                pnlTabPublish.Visible = (index == 1);
                if (pnlTabInfo != null) pnlTabInfo.Visible = (index == 2);

                bool isInfo = (index == 2);
                if (rtbLogExtract != null) rtbLogExtract.Visible = (!isInfo && index == 0);
                if (rtbLogPublish != null) rtbLogPublish.Visible = (!isInfo && index == 1);

                UpdateDynamicLayout();
                SyncLogScrollbar();
            };

            // Hook validators & rejection handlers for DragDropBox
            dropExtract.PathValidator = ValidateExtractInput;
            dropExtract.OnPathRejected += (path, reason) =>
            {
                AppendLogExtract(string.Format("[SKIP] Skipped '{0}': {1}.", Path.GetFileName(path), reason));
            };

            dropPublish.PathValidator = ValidatePublishInput;
            dropPublish.OnPathRejected += (path, reason) =>
            {
                AppendLogPublish(string.Format("[SKIP] Skipped '{0}': {1}.", Path.GetFileName(path), reason));
            };

            // Drag & Drop handlers
            dropExtract.OnPathsDropped += (paths) =>
            {
                if (paths != null && paths.Length > 0)
                {
                    txtExtractSource.Text = (paths.Length > 1) ? string.Join("; ", paths) : paths[0];
                    AppendLogExtract(string.Format("[OK] Added {0} valid file(s) to extraction queue.", paths.Length));
                }
                else
                {
                    txtExtractSource.Text = "";
                    AppendLogExtract("[WARNING] No valid .pdf or .md file(s) were added.");
                }
                UpdateExtractTargetPreview();
                UpdateActionButtonsValidation();
            };
            dropExtract.OnClearClicked += () =>
            {
                txtExtractSource.Text = "";
                UpdateExtractTargetPreview();
                UpdateActionButtonsValidation();
            };

            dropPublish.OnPathsDropped += (paths) =>
            {
                if (paths != null && paths.Length > 0)
                {
                    txtPublishFolder.Text = (paths.Length > 1) ? string.Join("; ", paths) : paths[0];
                    activeBookDir = paths[0];
                    AppendLogPublish(string.Format("[OK] Added {0} valid item(s) to publishing queue.", paths.Length));
                }
                else
                {
                    txtPublishFolder.Text = "";
                    activeBookDir = "";
                    AppendLogPublish("[WARNING] No valid .md file(s) or Book Project folder(s) were added.");
                }
                UpdatePublishProjectInspector(txtPublishFolder.Text);
                UpdateActionButtonsValidation();
            };
            dropPublish.OnClearClicked += () =>
            {
                txtPublishFolder.Text = "";
                activeBookDir = "";
                UpdatePublishProjectInspector("");
                UpdateActionButtonsValidation();
            };

            // Live Output preview updates
            rbOutputSameSource.CheckedChanged += (s, e) => { if (rbOutputSameSource.Checked) UpdateExtractTargetPreview(); };
            rbOutputAppFolder.CheckedChanged += (s, e) => { if (rbOutputAppFolder.Checked) UpdateExtractTargetPreview(); };
            rbOutputCustom.CheckedChanged += (s, e) => { if (rbOutputCustom.Checked) UpdateExtractTargetPreview(); };
            txtOutputCustom.TextChanged += (s, e) => { if (rbOutputCustom.Checked) UpdateExtractTargetPreview(); };
            txtExtractSource.TextChanged += (s, e) => {
                var pList = ParsePaths(txtExtractSource.Text);
                dropExtract.SelectedPaths = pList.ToArray();
                UpdateExtractTargetPreview();
                UpdateActionButtonsValidation();
            };
            txtPublishFolder.TextChanged += (s, e) => {
                var pList = ParsePaths(txtPublishFolder.Text);
                dropPublish.SelectedPaths = pList.ToArray();
                if (pList.Count > 0) activeBookDir = pList[0];
                UpdatePublishProjectInspector(txtPublishFolder.Text);
                UpdateActionButtonsValidation();
            };

            // Translator note checkbox toggle
            chkTranslatorNote.CheckedChanged += (s, e) =>
            {
                btnEditNote.Enabled = chkTranslatorNote.Checked;
                lblNoteHint.Enabled = chkTranslatorNote.Checked;
            };

            // Engine runner events
            runner.OnLogReceived += (log) =>
            {
                Action<string> logger = currentRunLogger ?? AppendLog;
                if (InvokeRequired)
                {
                    Invoke(logger, log);
                }
                else
                {
                    logger(log);
                }
            };

            runner.OnProgressUpdated += (percent, status) =>
            {
                if (InvokeRequired)
                {
                    Invoke(new Action<int, string>(UpdateProgress), percent, status);
                }
                else
                {
                    UpdateProgress(percent, status);
                }
            };
        }

        private void ApplyCustomStyles()
        {
            ThemeTokens t = ThemeTokens.Current;
            BackColor = t.BgPrimary;
            ForeColor = t.TextPrimary;
            Font = ThemeTokens.FontBody;

            // Load app icon
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src_Book Forge by Max", "app.ico");
                if (!File.Exists(iconPath)) iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src_BookForge", "app.ico");
                if (!File.Exists(iconPath))
                {
                    try
                    {
                        string[] srcDirs = Directory.GetDirectories(AppDomain.CurrentDomain.BaseDirectory, "src_*");
                        if (srcDirs.Length > 0) iconPath = Path.Combine(srcDirs[0], "app.ico");
                    }
                    catch { }
                }

                if (File.Exists(iconPath))
                {
                    Icon = new Icon(iconPath);
                }
                else if (File.Exists("app.ico"))
                {
                    Icon = new Icon("app.ico");
                }
            }
            catch { }
        }

        private void btnThemeToggle_Click(object sender, EventArgs e)
        {
            ThemeTokens t = ThemeTokens.Current;
            if (t.IsDark)
            {
                CopyThemeValues(ThemeTokens.LightTheme(), t);
                btnThemeToggle.Text = "Theme: Light";
            }
            else
            {
                CopyThemeValues(ThemeTokens.DarkTheme(), t);
                btnThemeToggle.Text = "Theme: Dark";
            }
            ApplyThemeToAllControls();
        }

        private void CopyThemeValues(ThemeTokens src, ThemeTokens dest)
        {
            dest.IsDark = src.IsDark;
            dest.BgPrimary = src.BgPrimary;
            dest.BgSecondary = src.BgSecondary;
            dest.BgTertiary = src.BgTertiary;
            dest.BgElevated = src.BgElevated;
            dest.TextPrimary = src.TextPrimary;
            dest.TextSecondary = src.TextSecondary;
            dest.TextTertiary = src.TextTertiary;
            dest.AccentPrimary = src.AccentPrimary;
            dest.AccentPrimaryHover = src.AccentPrimaryHover;
            dest.BorderColor = src.BorderColor;
            dest.BorderHover = src.BorderHover;
            dest.Success = src.Success;
            dest.Danger = src.Danger;
            dest.Warning = src.Warning;
            dest.HotkeyBoxBg = src.HotkeyBoxBg;
            dest.HotkeyBoxText = src.HotkeyBoxText;
        }

        private void ApplyThemeToAllControls()
        {
            ThemeTokens t = ThemeTokens.Current;
            BackColor = t.BgPrimary;
            ForeColor = t.TextPrimary;

            if (titleBarCustom != null) titleBarCustom.ApplyTheme(t);

            tabBar.BackColor = t.BgPrimary;
            tabBar.Invalidate();

            pnlTabExtract.BackColor = t.BgPrimary;
            pnlTabExtract.Invalidate();

            pnlTabPublish.BackColor = t.BgPrimary;
            pnlTabPublish.Invalidate();

            if (pnlTabInfo != null) pnlTabInfo.ApplyTheme(t);

            dropExtract.BackColor = t.BgSecondary;
            dropExtract.Invalidate();

            dropPublish.BackColor = t.BgSecondary;
            dropPublish.Invalidate();

            cardOutputLocation.ApplyTheme();
            cardExtractOptions.ApplyTheme();
            cardPublishOptions.ApplyTheme();

            lblOutTitle.ForeColor = t.AccentPrimary;
            lblOptTitle.ForeColor = t.AccentPrimary;
            lblPubTitle.ForeColor = t.AccentPrimary;

            lblTargetPreview.ForeColor = t.TextSecondary;
            lblSmartChunking.ForeColor = t.TextSecondary;
            lblThreshold.ForeColor = t.TextSecondary;
            lblSrcChoice.ForeColor = t.TextSecondary;
            lblPaper.ForeColor = t.TextSecondary;
            lblFont.ForeColor = t.TextSecondary;
            lblMenuDepth.ForeColor = t.TextSecondary;
            lblGutter.ForeColor = t.TextSecondary;
            lblNoteHint.ForeColor = t.TextSecondary;
            lblStatus.ForeColor = t.TextSecondary;

            rbOutputSameSource.ForeColor = t.TextPrimary;
            rbOutputAppFolder.ForeColor = t.TextPrimary;
            rbOutputCustom.ForeColor = t.TextPrimary;
            chkExtractImages.ForeColor = t.TextPrimary;
            chkScaffoldBible.ForeColor = t.TextPrimary;

            chkSourceTranslated.ForeColor = t.TextPrimary;
            chkSourceOriginal.ForeColor = t.TextPrimary;
            rbGutterPrint.ForeColor = t.TextPrimary;
            rbGutterDigital.ForeColor = t.TextPrimary;
            chkTranslatorNote.ForeColor = t.TextPrimary;

            txtExtractSource.ApplyTheme();
            txtOutputCustom.ApplyTheme();
            txtPublishFolder.ApplyTheme();

            cbSmartChunking.Invalidate();
            cbThreshold.Invalidate();
            cbPaperSize.Invalidate();
            cbFont.Invalidate();
            cbMenuDepth.Invalidate();

            btnBrowseSource.Invalidate();
            btnBrowsePublishFolder.Invalidate();
            btnToggleExtractSettings.Invalidate();
            btnTogglePublishSettings.Invalidate();
            btnStartExtract.Invalidate();
            btnOpenOutputFolder.Invalidate();
            btnThemeToggle.Invalidate();
            btnEditNote.Invalidate();
            btnRunAudit.Invalidate();
            btnStartPublish.Invalidate();
            btnOpenPdf.Invalidate();

            UpdatePublishProjectInspector(txtPublishFolder.Text);

            progressBar.BackColor = t.BgTertiary;
            progressBar.Invalidate();

            if (rtbLogExtract != null)
            {
                rtbLogExtract.BackColor = t.IsDark ? Color.FromArgb(20, 20, 20) : Color.FromArgb(245, 245, 245);
                rtbLogExtract.ForeColor = t.TextPrimary;
            }
            if (rtbLogPublish != null)
            {
                rtbLogPublish.BackColor = t.IsDark ? Color.FromArgb(20, 20, 20) : Color.FromArgb(245, 245, 245);
                rtbLogPublish.ForeColor = t.TextPrimary;
            }
            if (scrollBarLog != null) scrollBarLog.ApplyTheme(t);

            Invalidate(true);
        }

        private RichTextBox ActiveLog
        {
            get { return (tabBar != null && tabBar.SelectedIndex == 1) ? rtbLogPublish : rtbLogExtract; }
        }

        private void AppendLog(string text)
        {
            AppendLogTo(ActiveLog, text);
        }

        private void AppendLogExtract(string text)
        {
            AppendLogTo(rtbLogExtract, text);
        }

        private void AppendLogPublish(string text)
        {
            AppendLogTo(rtbLogPublish, text);
        }

        private void AppendLogTo(RichTextBox targetLog, string text)
        {
            if (targetLog == null || string.IsNullOrEmpty(text)) return;

            ThemeTokens t = ThemeTokens.Current;
            Color c = t.TextPrimary;
            if (text.Contains("[OK]") || text.Contains("COMPLETE") || text.Contains("Passed QA") || text.StartsWith("✓") || text.Contains("Successfully") || text.Contains("Thành công"))
            {
                c = t.Success;
            }
            else if (text.Contains("[ERROR]") || text.Contains("[STDERR]") || text.Contains("[EXCEPTION]") || text.StartsWith("✗") || text.Contains("Failed") || text.Contains("Lỗi"))
            {
                c = t.Danger;
            }
            else if (text.Contains("[*]") || text.Contains("⚡") || text.StartsWith("[INFO]") || text.StartsWith("ℹ"))
            {
                c = t.AccentPrimaryHover;
            }
            else if (text.Contains("[SKIP]") || text.Contains("[!]") || text.Contains("WARNING") || text.Contains("[ATTENTION]"))
            {
                c = t.Warning;
            }

            targetLog.SelectionStart = targetLog.TextLength;
            targetLog.SelectionLength = 0;
            targetLog.SelectionColor = c;
            targetLog.AppendText(text + Environment.NewLine);
            targetLog.ScrollToCaret();
            if (targetLog == ActiveLog)
            {
                SyncLogScrollbar();
            }
        }

        private void SetupLogScrollbar()
        {
            if (scrollBarLog == null) return;
            scrollBarLog.Visible = true;

            scrollBarLog.ValueChanged += (val) =>
            {
                RichTextBox active = ActiveLog;
                if (isSyncingLogScroll || active == null || !active.IsHandleCreated) return;
                isSyncingLogScroll = true;
                try
                {
                    int first = (int)SendMessage(active.Handle, EM_GETFIRSTVISIBLELINE, IntPtr.Zero, IntPtr.Zero);
                    int delta = val - first;
                    if (delta != 0)
                    {
                        SendMessage(active.Handle, EM_LINESCROLL, IntPtr.Zero, (IntPtr)delta);
                    }
                }
                finally
                {
                    isSyncingLogScroll = false;
                }
            };

            Action<RichTextBox> wireEvents = (rtb) =>
            {
                if (rtb == null) return;
                rtb.MouseWheel += (s, e) =>
                {
                    if (scrollBarLog.Visible) scrollBarLog.DoMouseWheel(e.Delta);
                };
                rtb.TextChanged += (s, e) => { if (rtb == ActiveLog) SyncLogScrollbar(); };
                rtb.Resize += (s, e) => { if (rtb == ActiveLog) SyncLogScrollbar(); };
            };

            wireEvents(rtbLogExtract);
            wireEvents(rtbLogPublish);
        }

        private void SyncLogScrollbar()
        {
            RichTextBox active = ActiveLog;
            if (isSyncingLogScroll || active == null || !active.IsHandleCreated || scrollBarLog == null) return;
            isSyncingLogScroll = true;
            try
            {
                int total = (int)SendMessage(active.Handle, EM_GETLINECOUNT, IntPtr.Zero, IntPtr.Zero);
                int lineH = Math.Max(12, active.Font.Height);
                int visible = Math.Max(1, active.ClientSize.Height / lineH);

                if (total > visible)
                {
                    scrollBarLog.Visible = true;
                    scrollBarLog.Minimum = 0;
                    scrollBarLog.Maximum = total;
                    scrollBarLog.LargeChange = visible;
                    scrollBarLog.SmallChange = 3;

                    int first = (int)SendMessage(active.Handle, EM_GETFIRSTVISIBLELINE, IntPtr.Zero, IntPtr.Zero);
                    scrollBarLog.Value = Math.Min(first, scrollBarLog.MaxScrollValue);
                }
                else
                {
                    scrollBarLog.Visible = false;
                }
            }
            finally
            {
                isSyncingLogScroll = false;
            }
        }

        private void UpdateProgress(int percent, string status)
        {
            progressBar.Value = percent;
            progressBar.StatusText = status;
            lblStatus.Text = status;
        }

        private void SetExecutionState(bool isRunning, string actionType = "")
        {
            isExecuting = isRunning;
            if (titleBarCustom != null) titleBarCustom.IsRunning = isRunning;

            // Lock top-level tabs navigation
            tabBar.Enabled = !isRunning;
            if (pnlTabInfo != null) pnlTabInfo.Enabled = !isRunning;

            // Lock Tab 1 inputs and cards
            dropExtract.Enabled = !isRunning;
            txtExtractSource.Enabled = !isRunning;
            btnBrowseSource.Enabled = !isRunning;
            btnToggleExtractSettings.Enabled = !isRunning;
            cardOutputLocation.Enabled = !isRunning;
            cardExtractOptions.Enabled = !isRunning;
            btnOpenOutputFolder.Enabled = !isRunning && !string.IsNullOrEmpty(activeBookDir) && Directory.Exists(activeBookDir);
            btnThemeToggle.Enabled = !isRunning;

            // Lock Tab 2 inputs and cards
            dropPublish.Enabled = !isRunning;
            txtPublishFolder.Enabled = !isRunning;
            btnBrowsePublishFolder.Enabled = !isRunning;
            btnTogglePublishSettings.Enabled = !isRunning;
            cardPublishOptions.Enabled = !isRunning;
            cbMenuDepth.Enabled = !isRunning;
            btnOpenPdf.Enabled = !isRunning && !string.IsNullOrEmpty(generatedPdfPath) && File.Exists(generatedPdfPath);

            // Configure Trigger / Action buttons
            if (isRunning)
            {
                if (actionType == "extract")
                {
                    btnStartExtract.Enabled = true;
                    btnStartExtract.Text = "Stop";
                    btnStartExtract.IsDanger = true;
                    btnStartExtract.IsPrimary = false;

                    btnStartPublish.Enabled = false;
                    btnRunAudit.Enabled = false;
                }
                else if (actionType == "publish")
                {
                    btnStartPublish.Enabled = true;
                    btnStartPublish.Text = "Stop";
                    btnStartPublish.IsDanger = true;
                    btnStartPublish.IsPrimary = false;

                    btnStartExtract.Enabled = false;
                    btnRunAudit.Enabled = false;
                }
                else if (actionType == "audit")
                {
                    btnRunAudit.Enabled = true;
                    btnRunAudit.Text = "Stop";
                    btnRunAudit.IsDanger = true;
                    btnRunAudit.IsPrimary = false;

                    btnStartExtract.Enabled = false;
                    btnStartPublish.Enabled = false;
                }
            }
            else
            {
                btnStartExtract.Text = "Extract Content";
                btnStartExtract.IsDanger = false;
                btnStartExtract.IsPrimary = true;

                btnStartPublish.Text = "Publish PDF Book";
                btnStartPublish.IsDanger = false;
                btnStartPublish.IsPrimary = true;

                btnRunAudit.Text = "Run QA Audit";
                btnRunAudit.IsDanger = false;
                btnRunAudit.IsPrimary = false;

                UpdateActionButtonsValidation();
            }

            btnStartExtract.Invalidate();
            btnStartPublish.Invalidate();
            btnRunAudit.Invalidate();
            tabBar.Invalidate();
        }

        private static System.Collections.Generic.List<string> ParsePaths(string input)
        {
            System.Collections.Generic.List<string> result = new System.Collections.Generic.List<string>();
            if (string.IsNullOrWhiteSpace(input)) return result;

            string[] rawParts = input.Split(new char[] { ';', '\r', '\n', '|' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var part in rawParts)
            {
                string clean = part.Trim().Trim('"', '\'');
                if (!string.IsNullOrEmpty(clean) && (File.Exists(clean) || Directory.Exists(clean)))
                {
                    if (!result.Contains(clean)) result.Add(clean);
                }
            }

            if (result.Count == 0 && input.Contains("\""))
            {
                var matches = System.Text.RegularExpressions.Regex.Matches(input, "\"([^\"]+)\"");
                foreach (System.Text.RegularExpressions.Match m in matches)
                {
                    string clean = m.Groups[1].Value.Trim();
                    if (!string.IsNullOrEmpty(clean) && (File.Exists(clean) || Directory.Exists(clean)))
                    {
                        if (!result.Contains(clean)) result.Add(clean);
                    }
                }
            }

            if (result.Count == 0)
            {
                string clean = input.Trim().Trim('"', '\'');
                if (!string.IsNullOrEmpty(clean) && (File.Exists(clean) || Directory.Exists(clean)))
                {
                    result.Add(clean);
                }
            }

            return result;
        }

        public static bool ValidateExtractInput(string path, out string reason)
        {
            if (string.IsNullOrEmpty(path))
            {
                reason = "Path is empty";
                return false;
            }

            if (Directory.Exists(path))
            {
                reason = "Is a directory (Tab 'PDF to Markdown' only accepts .pdf or .md source files)";
                return false;
            }

            if (!File.Exists(path))
            {
                reason = "File does not exist on the system";
                return false;
            }

            string ext = Path.GetExtension(path);
            if (ext.Equals(".pdf", StringComparison.OrdinalIgnoreCase) || ext.Equals(".md", StringComparison.OrdinalIgnoreCase))
            {
                reason = "";
                return true;
            }

            reason = string.Format("File format '{0}' is not supported (only .pdf or .md accepted)", ext);
            return false;
        }

        public static bool ValidatePublishInput(string path, out string reason)
        {
            if (string.IsNullOrEmpty(path))
            {
                reason = "Path is empty";
                return false;
            }

            if (File.Exists(path))
            {
                string ext = Path.GetExtension(path);
                if (ext.Equals(".md", StringComparison.OrdinalIgnoreCase))
                {
                    reason = "";
                    return true;
                }
                reason = string.Format("File '{0}' is not supported (Tab 'Markdown to PDF' only accepts .md files or Book Project folders)", ext);
                return false;
            }

            if (Directory.Exists(path))
            {
                string transDir = Path.Combine(path, "chapters_translated");
                string origDir = Path.Combine(path, "chapters_original");
                int transCount = Directory.Exists(transDir) ? Directory.GetFiles(transDir, "*.md").Length : 0;
                int origCount = Directory.Exists(origDir) ? Directory.GetFiles(origDir, "*.md").Length : 0;

                if (transCount > 0 || origCount > 0)
                {
                    reason = "";
                    return true;
                }

                reason = "Folder is not a valid Book Project structure (must contain 'chapters_translated' or 'chapters_original' with .md files)";
                return false;
            }

            reason = "Path does not exist on the system";
            return false;
        }

        private bool IsValidExtractSource(string path)
        {
            var list = ParsePaths(path);
            if (list.Count > 0)
            {
                foreach (var p in list)
                {
                    string r;
                    if (ValidateExtractInput(p, out r)) return true;
                }
            }
            return false;
        }

        private bool IsValidPublishSource(string path)
        {
            var list = ParsePaths(path);
            if (list.Count > 0)
            {
                foreach (var p in list)
                {
                    string r;
                    if (ValidatePublishInput(p, out r)) return true;
                }
            }
            return false;
        }

        private void UpdatePublishProjectInspector(string path)
        {
            if (lblPublishInspector == null) return;
            ThemeTokens t = ThemeTokens.Current;

            var items = ParsePaths(path);

            if (items.Count == 0)
            {
                lblPublishInspector.ForeColor = t.TextTertiary;
                lblPublishInspector.Text = "● Ready: Select or drop a book project folder or a single .md file above.";
                chkSourceTranslated.Enabled = true;
                chkSourceOriginal.Enabled = true;
                return;
            }

            if (items.Count == 1)
            {
                string clean = items[0];
                if (File.Exists(clean) && clean.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                {
                    FileInfo fi = new FileInfo(clean);
                    long kb = (fi.Length + 1023) / 1024;
                    string fn = Path.GetFileName(clean);
                    bool isTrans = fn.IndexOf("translated", StringComparison.OrdinalIgnoreCase) >= 0 || fn.IndexOf("dich", StringComparison.OrdinalIgnoreCase) >= 0;
                    bool isOrig = fn.IndexOf("original", StringComparison.OrdinalIgnoreCase) >= 0;

                    lblPublishInspector.ForeColor = t.Success;
                    if (isTrans)
                    {
                        chkSourceTranslated.Checked = true;
                        chkSourceOriginal.Checked = false;
                        lblPublishInspector.Text = string.Format("● Single Markdown File ({0} KB) • [Translated Edition] • Running Header & Translator Note supported", kb);
                    }
                    else if (isOrig)
                    {
                        chkSourceOriginal.Checked = true;
                        chkSourceTranslated.Checked = false;
                        lblPublishInspector.Text = string.Format("● Single Markdown File ({0} KB) • [Original Edition] • Running Header & Preface Note supported", kb);
                    }
                    else
                    {
                        lblPublishInspector.Text = string.Format("● Single Markdown File ({0} KB) • Direct PDF publication mode", kb);
                    }

                    chkSourceTranslated.Enabled = true;
                    chkSourceOriginal.Enabled = true;
                    return;
                }

                if (Directory.Exists(clean))
                {
                    chkSourceTranslated.Enabled = true;
                    chkSourceOriginal.Enabled = true;

                    string transDir = Path.Combine(clean, "chapters_translated");
                    string origDir = Path.Combine(clean, "chapters_original");

                    int transCount = Directory.Exists(transDir) ? Directory.GetFiles(transDir, "*.md").Length : 0;
                    int origCount = Directory.Exists(origDir) ? Directory.GetFiles(origDir, "*.md").Length : 0;

                    if (transCount > 0 || origCount > 0)
                    {
                        lblPublishInspector.ForeColor = t.Success;
                        lblPublishInspector.Text = string.Format("● Book Project: {0} translated chapter(s), {1} original chapter(s) detected.", transCount, origCount);

                        // Smart auto-source selection:
                        if (origCount > 0 && transCount == 0)
                        {
                            chkSourceOriginal.Checked = true;
                            chkSourceTranslated.Checked = false;
                        }
                        else if (transCount > 0 && origCount == 0)
                        {
                            chkSourceTranslated.Checked = true;
                            chkSourceOriginal.Checked = false;
                        }
                    }
                    else
                    {
                        int rootMdCount = Directory.GetFiles(clean, "*.md").Length;
                        if (rootMdCount > 0)
                        {
                            lblPublishInspector.ForeColor = t.Warning;
                            lblPublishInspector.Text = string.Format("● Folder has {0} markdown file(s), but missing chapters_original / chapters_translated subfolders.", rootMdCount);
                        }
                        else
                        {
                            lblPublishInspector.ForeColor = t.Warning;
                            lblPublishInspector.Text = "● Directory selected, but no chapters found in chapters_translated or chapters_original.";
                        }
                    }
                    return;
                }
            }
            else
            {
                // Multi-item Batch Queue Analysis
                int projectFolders = 0;
                int transMdFiles = 0;
                int origMdFiles = 0;
                int plainMdFiles = 0;
                int otherItems = 0;

                foreach (var item in items)
                {
                    if (Directory.Exists(item))
                    {
                        string transDir = Path.Combine(item, "chapters_translated");
                        string origDir = Path.Combine(item, "chapters_original");
                        if (Directory.Exists(transDir) || Directory.Exists(origDir))
                        {
                            projectFolders++;
                        }
                        else
                        {
                            otherItems++;
                        }
                    }
                    else if (File.Exists(item) && item.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                    {
                        string fn = Path.GetFileName(item);
                        if (fn.IndexOf("translated", StringComparison.OrdinalIgnoreCase) >= 0 || fn.IndexOf("dich", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            transMdFiles++;
                        }
                        else if (fn.IndexOf("original", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            origMdFiles++;
                        }
                        else
                        {
                            plainMdFiles++;
                        }
                    }
                    else
                    {
                        otherItems++;
                    }
                }

                System.Collections.Generic.List<string> details = new System.Collections.Generic.List<string>();
                if (projectFolders > 0) details.Add(string.Format("{0} Book Project{1}", projectFolders, projectFolders > 1 ? "s" : ""));
                if (transMdFiles > 0) details.Add(string.Format("{0} Translated .md", transMdFiles));
                if (origMdFiles > 0) details.Add(string.Format("{0} Original .md", origMdFiles));
                if (plainMdFiles > 0) details.Add(string.Format("{0} Direct .md", plainMdFiles));
                if (otherItems > 0) details.Add(string.Format("{0} other item{1}", otherItems, otherItems > 1 ? "s" : ""));

                lblPublishInspector.ForeColor = t.Success;
                lblPublishInspector.Text = string.Format("● Batch Queue: {0} item(s) detected • ({1})", items.Count, string.Join(", ", details.ToArray()));
                chkSourceTranslated.Enabled = true;
                chkSourceOriginal.Enabled = true;
                return;
            }

            lblPublishInspector.ForeColor = t.Danger;
            lblPublishInspector.Text = "● Path does not exist. Please specify a valid book folder or .md file.";
        }

        private void UpdateActionButtonsValidation()
        {
            if (isExecuting) return;

            bool canExtract = IsValidExtractSource(txtExtractSource.Text);
            btnStartExtract.Enabled = canExtract;
            toolTipValidation.SetToolTip(btnStartExtract, canExtract 
                ? "Click to extract book content and decompose into chapters" 
                : "Please select or drop a valid book file (PDF or Markdown) first");

            bool canPublish = IsValidPublishSource(txtPublishFolder.Text);
            btnStartPublish.Enabled = canPublish;
            toolTipValidation.SetToolTip(btnStartPublish, canPublish 
                ? "Click to publish print-ready PDF book" 
                : "Please select or drop a valid book project folder or single .md file first");

            var pubItems = ParsePaths(txtPublishFolder.Text);
            bool canAudit = false;
            foreach (var pi in pubItems)
            {
                if (Directory.Exists(pi)) { canAudit = true; break; }
            }
            btnRunAudit.Enabled = canAudit;
            toolTipValidation.SetToolTip(btnRunAudit, canAudit 
                ? "Click to run QA syntax & parity audit" 
                : "QA Audit requires a book project folder structure");

            bool hasActiveBook = !string.IsNullOrEmpty(activeBookDir) && Directory.Exists(activeBookDir);
            btnOpenOutputFolder.Enabled = hasActiveBook;

            btnStartExtract.Invalidate();
            btnStartPublish.Invalidate();
            btnRunAudit.Invalidate();
            btnOpenOutputFolder.Invalidate();
        }

        private void UpdateExtractTargetPreview()
        {
            var list = ParsePaths(txtExtractSource.Text);
            if (list.Count == 0)
            {
                lblTargetPreview.Text = "Output directory: (Select or drop a book file above to preview output path)";
                activeBookDir = "";
                return;
            }

            WorkspaceScaffolder.OutputLocationMode mode = WorkspaceScaffolder.OutputLocationMode.SameAsSource;
            if (rbOutputAppFolder.Checked) mode = WorkspaceScaffolder.OutputLocationMode.AppFolder;
            else if (rbOutputCustom.Checked) mode = WorkspaceScaffolder.OutputLocationMode.CustomFolder;

            if (list.Count == 1)
            {
                string target = WorkspaceScaffolder.ResolveBookTargetDirectory(list[0], mode, txtOutputCustom.Text.Trim());
                lblTargetPreview.Text = "Output directory: " + target;
                activeBookDir = target;
            }
            else
            {
                string firstTarget = WorkspaceScaffolder.ResolveBookTargetDirectory(list[0], mode, txtOutputCustom.Text.Trim());
                string parentBase = Path.GetDirectoryName(firstTarget);
                lblTargetPreview.Text = string.Format("Output directory: [Batch {0} books] -> Separate workspace folders in: {1}", list.Count, parentBase);
                activeBookDir = firstTarget;
            }
        }

        // Action Handlers
        private void btnBrowseSource_Click(object sender, EventArgs e)
        {
            using (OpenFileDialog ofd = new OpenFileDialog())
            {
                ofd.Filter = "Book Files (*.pdf;*.md)|*.pdf;*.md|All Files (*.*)|*.*";
                ofd.Title = "Select source PDF or Markdown file(s) to extract";
                ofd.Multiselect = true;
                if (ofd.ShowDialog() == DialogResult.OK)
                {
                    var valid = new System.Collections.Generic.List<string>();
                    foreach (var fn in ofd.FileNames)
                    {
                        string reason;
                        if (ValidateExtractInput(fn, out reason))
                        {
                            valid.Add(fn);
                        }
                        else
                        {
                            AppendLogExtract(string.Format("[SKIP] Skipped '{0}': {1}.", Path.GetFileName(fn), reason));
                        }
                    }

                    if (valid.Count > 0)
                    {
                        txtExtractSource.Text = (valid.Count > 1) ? string.Join("; ", valid) : valid[0];
                        AppendLogExtract(string.Format("[OK] Added {0} valid file(s) to extraction queue.", valid.Count));
                    }
                    else
                    {
                        txtExtractSource.Text = "";
                        AppendLogExtract("[WARNING] No valid .pdf or .md file(s) were selected.");
                    }
                    UpdateExtractTargetPreview();
                    UpdateActionButtonsValidation();
                }
            }
        }

        private void btnBrowsePublishFolder_Click(object sender, EventArgs e)
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            ThemeTokens t = ThemeTokens.Current;
            menu.Renderer = new ModernMenuRenderer(t);
            menu.ShowImageMargin = false;
            menu.BackColor = t.BgSecondary;

            ToolStripMenuItem itemFolder = new ToolStripMenuItem("📁 Select Book Project Folder...");
            itemFolder.ForeColor = t.TextPrimary;
            itemFolder.Font = ThemeTokens.FontBody;
            itemFolder.Padding = new Padding(6, 6, 6, 6);
            itemFolder.Click += (s, ev) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Select book project folder to publish PDF";
                    string current = txtPublishFolder.Text.Trim().Trim('"', '\'');
                    if (Directory.Exists(current))
                    {
                        fbd.SelectedPath = current;
                    }
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        string reason;
                        if (ValidatePublishInput(fbd.SelectedPath, out reason))
                        {
                            txtPublishFolder.Text = fbd.SelectedPath;
                            activeBookDir = fbd.SelectedPath;
                            AppendLogPublish(string.Format("[OK] Selected Book Project folder: '{0}'.", Path.GetFileName(fbd.SelectedPath)));
                            UpdatePublishProjectInspector(fbd.SelectedPath);
                            UpdateActionButtonsValidation();
                        }
                        else
                        {
                            AppendLogPublish(string.Format("[SKIP] Skipped '{0}': {1}.", Path.GetFileName(fbd.SelectedPath), reason));
                        }
                    }
                }
            };

            ToolStripMenuItem itemFile = new ToolStripMenuItem("📄 Select Markdown File(s) (.md)...");
            itemFile.ForeColor = t.TextPrimary;
            itemFile.Font = ThemeTokens.FontBody;
            itemFile.Padding = new Padding(6, 6, 6, 6);
            itemFile.Click += (s, ev) =>
            {
                using (OpenFileDialog ofd = new OpenFileDialog())
                {
                    ofd.Filter = "Markdown Files (*.md)|*.md|All Files (*.*)|*.*";
                    ofd.Title = "Select Markdown file(s) to publish";
                    ofd.Multiselect = true;
                    string current = txtPublishFolder.Text.Trim().Trim('"', '\'');
                    if (File.Exists(current))
                    {
                        ofd.InitialDirectory = Path.GetDirectoryName(current);
                        ofd.FileName = Path.GetFileName(current);
                    }
                    else if (Directory.Exists(current))
                    {
                        ofd.InitialDirectory = current;
                    }

                    if (ofd.ShowDialog() == DialogResult.OK)
                    {
                        var valid = new System.Collections.Generic.List<string>();
                        foreach (var fn in ofd.FileNames)
                        {
                            string reason;
                            if (ValidatePublishInput(fn, out reason))
                            {
                                valid.Add(fn);
                            }
                            else
                            {
                                AppendLogPublish(string.Format("[SKIP] Skipped '{0}': {1}.", Path.GetFileName(fn), reason));
                            }
                        }

                        if (valid.Count > 0)
                        {
                            txtPublishFolder.Text = (valid.Count > 1) ? string.Join("; ", valid) : valid[0];
                            activeBookDir = valid[0];
                            AppendLogPublish(string.Format("[OK] Added {0} valid .md file(s) to publishing queue.", valid.Count));
                        }
                        else
                        {
                            txtPublishFolder.Text = "";
                            activeBookDir = "";
                            AppendLogPublish("[WARNING] No valid .md file(s) were selected.");
                        }
                        UpdatePublishProjectInspector(txtPublishFolder.Text);
                        UpdateActionButtonsValidation();
                    }
                }
            };

            menu.Items.Add(itemFolder);
            menu.Items.Add(itemFile);

            menu.Show(btnBrowsePublishFolder, new Point(0, btnBrowsePublishFolder.Height + 2));
        }


        private async void btnStartExtract_Click(object sender, EventArgs e)
        {
            if (isExecuting)
            {
                runner.Cancel();
                btnStartExtract.Enabled = false;
                btnStartExtract.Text = "Stopping...";
                btnStartExtract.Invalidate();
                AppendLog("[!] Stop request received. Terminating process tree...");
                UpdateProgress(progressBar.Value, "Stopping process...");
                return;
            }

            var items = ParsePaths(txtExtractSource.Text);
            if (items.Count == 0)
            {
                AppendLog("[!] Please select or drop valid PDF/Markdown book file(s) first.");
                UpdateProgress(0, "No valid book file selected.");
                return;
            }

            WorkspaceScaffolder.OutputLocationMode mode = WorkspaceScaffolder.OutputLocationMode.SameAsSource;
            if (rbOutputAppFolder.Checked) mode = WorkspaceScaffolder.OutputLocationMode.AppFolder;
            else if (rbOutputCustom.Checked) mode = WorkspaceScaffolder.OutputLocationMode.CustomFolder;

            // Threshold parsing
            int threshold = 25000;
            if (cbThreshold.SelectedItem != null)
            {
                string sel = cbThreshold.SelectedItem.ToString();
                string digits = System.Text.RegularExpressions.Regex.Replace(sel, @"\D", "");
                int val;
                if (int.TryParse(digits, out val) && val > 0)
                {
                    threshold = val;
                }
            }

            // Smart chunking mode
            string splitArg = "h2-h3";
            if (cbSmartChunking.SelectedItem != null)
            {
                string selChunk = cbSmartChunking.SelectedItem.ToString().Trim();
                if (selChunk.IndexOf("H3", StringComparison.OrdinalIgnoreCase) >= 0) splitArg = "h2-h3";
                else if (selChunk.IndexOf("H2", StringComparison.OrdinalIgnoreCase) >= 0) splitArg = "h2";
                else splitArg = "none";
            }

            runner.Reset();
            currentRunLogger = AppendLogExtract;
            SetExecutionState(true, "extract");
            try
            {
                rtbLogExtract.Clear();
                int successCount = 0;
                System.Collections.Generic.List<string> createdBookDirs = new System.Collections.Generic.List<string>();

                for (int itemIdx = 0; itemIdx < items.Count; itemIdx++)
                {
                    if (runner.IsCancelled) break;

                    string src = items[itemIdx];
                    string bookTargetDir = WorkspaceScaffolder.ResolveBookTargetDirectory(src, mode, txtOutputCustom.Text.Trim());
                    if (string.IsNullOrEmpty(bookTargetDir)) continue;

                    createdBookDirs.Add(bookTargetDir);
                    activeBookDir = bookTargetDir;

                    int baseProg = (itemIdx * 100) / items.Count;
                    int spanProg = 100 / items.Count;

                    AppendLog("════════════════════════════════════════════════════════════════");
                    AppendLog(string.Format("[*] [{0}/{1}] Starting Book Extraction: {2}", itemIdx + 1, items.Count, Path.GetFileName(src)));
                    AppendLog(string.Format("[*] Target Workspace: {0}", bookTargetDir));
                    AppendLog("════════════════════════════════════════════════════════════════");

                    UpdateProgress(baseProg + (5 * spanProg / 100), string.Format("Batch [{0}/{1}]: Setting up workspace...", itemIdx + 1, items.Count));

                    // 1. Scaffold Workspace
                    if (chkScaffoldBible.Checked)
                    {
                        WorkspaceScaffolder.ScaffoldWorkspace(bookTargetDir);
                        AppendLog("[OK] Scaffolded workspace folders: chapters_original, chapters_translated, images, translation_bible.");
                    }

                    if (runner.IsCancelled) break;

                    bool isPdf = src.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);

                    if (isPdf)
                    {
                        if (chkExtractImages.Checked)
                        {
                            UpdateProgress(baseProg + (25 * spanProg / 100), string.Format("Batch [{0}/{1}]: Extracting images...", itemIdx + 1, items.Count));
                            bool imgOk = await runner.RunCommandAsync(bookTargetDir, "04__image_extractor.js", string.Format("\"{0}\" \"{1}\"", src, bookTargetDir));
                            if (runner.IsCancelled) break;
                        }

                        if (runner.IsCancelled) break;

                        UpdateProgress(baseProg + (50 * spanProg / 100), string.Format("Batch [{0}/{1}]: Extracting chapters & Markdown structure...", itemIdx + 1, items.Count));
                        bool extractOk = await runner.RunCommandAsync(bookTargetDir, "05__chapter_extractor.js", string.Format("\"{0}\" \"{1}\"", src, bookTargetDir));
                        if (runner.IsCancelled) break;
                        if (!extractOk)
                        {
                            AppendLog(string.Format("[ERROR] PDF extraction failed for: {0}. Continuing...", Path.GetFileName(src)));
                            continue;
                        }

                        if (runner.IsCancelled) break;

                        UpdateProgress(baseProg + (80 * spanProg / 100), string.Format("Batch [{0}/{1}]: Compiling master book...", itemIdx + 1, items.Count));
                        await runner.RunCommandAsync(bookTargetDir, "06__book_compiler.js", "--source=chapters_original");
                        if (runner.IsCancelled) break;

                        successCount++;
                    }
                    else
                    {
                        // Markdown file
                        UpdateProgress(baseProg + (40 * spanProg / 100), string.Format("Batch [{0}/{1}]: Decomposing chapters recursively...", itemIdx + 1, items.Count));
                        string targetMd = Path.Combine(bookTargetDir, Path.GetFileName(src));
                        if (!File.Exists(targetMd))
                        {
                            try { File.Copy(src, targetMd, true); } catch { }
                        }

                        if (runner.IsCancelled) break;

                        string splitterArgs = string.Format("\"{0}\" --threshold={1} --split={2}", targetMd, threshold, splitArg);
                        await runner.RunCommandAsync(bookTargetDir, "05_md_chapter_splitter.js", splitterArgs);
                        if (runner.IsCancelled) break;

                        UpdateProgress(baseProg + (80 * spanProg / 100), string.Format("Batch [{0}/{1}]: Compiling master book...", itemIdx + 1, items.Count));
                        await runner.RunCommandAsync(bookTargetDir, "06__book_compiler.js", "--source=chapters_original");
                        if (runner.IsCancelled) break;

                        successCount++;
                    }
                }

                if (runner.IsCancelled)
                {
                    UpdateProgress(0, "Process stopped.");
                    AppendLog("[*] Extraction stopped by user.");
                }
                else
                {
                    UpdateProgress(100, string.Format("Batch extraction completed ({0}/{1} books processed).", successCount, items.Count));
                    AppendLog("════════════════════════════════════════════════════════════════");
                    AppendLog(string.Format("[COMPLETED] Finished extracting {0}/{1} book(s) successfully.", successCount, items.Count));
                    AppendLog("════════════════════════════════════════════════════════════════");

                    btnOpenOutputFolder.Enabled = !string.IsNullOrEmpty(activeBookDir) && Directory.Exists(activeBookDir);

                    if (createdBookDirs.Count > 0)
                    {
                        string nextPath = (createdBookDirs.Count > 1) ? string.Join("; ", createdBookDirs.ToArray()) : createdBookDirs[0];
                        txtPublishFolder.Text = nextPath;
                        UpdatePublishProjectInspector(nextPath);
                    }

                    AppendLog("[NEXT STEP] Project ready! Switch to Tab 2 ('Markdown to PDF') to publish your PDF book(s).");
                }
            }
            finally
            {
                currentRunLogger = null;
                SetExecutionState(false);
            }
        }

        private async void btnStartPublish_Click(object sender, EventArgs e)
        {
            if (isExecuting)
            {
                runner.Cancel();
                btnStartPublish.Enabled = false;
                btnStartPublish.Text = "Stopping...";
                btnStartPublish.Invalidate();
                AppendLog("[!] Stop request received. Terminating process tree...");
                UpdateProgress(progressBar.Value, "Stopping process...");
                return;
            }

            var items = ParsePaths(txtPublishFolder.Text);
            if (items.Count == 0)
            {
                AppendLog("[!] Please select or drop valid book project directory(ies) or Markdown (.md) file(s) first.");
                UpdateProgress(0, "No valid book source selected.");
                return;
            }

            bool hasProjectFolder = false;
            foreach (var it in items)
            {
                if (Directory.Exists(it)) { hasProjectFolder = true; break; }
            }

            if (hasProjectFolder && !chkSourceTranslated.Checked && !chkSourceOriginal.Checked)
            {
                AppendLog("[!] Please select at least one content source (Translated or Original)!");
                UpdateProgress(0, "No content source selected.");
                return;
            }

            runner.Reset();
            currentRunLogger = AppendLogPublish;
            SetExecutionState(true, "publish");
            try
            {
                rtbLogPublish.Clear();
                UpdateProgress(5, "Starting book publication...");

                // Paper profile
                string profile = PaperProfiles.GetSelectedKey(cbPaperSize);

                // Binding mode
                string bindingMode = rbGutterPrint.Checked ? "print" : "screen";

                // Menu Depth
                string tocArg = " --toc=h1";
                string selectedMenu = cbMenuDepth.SelectedItem != null ? cbMenuDepth.SelectedItem.ToString() : "H1";
                if (selectedMenu.IndexOf("H3", StringComparison.OrdinalIgnoreCase) >= 0)
                    tocArg = " --toc=h1-h2-h3";
                else if (selectedMenu.IndexOf("H2", StringComparison.OrdinalIgnoreCase) >= 0)
                    tocArg = " --toc=h1-h2";

                bool allSuccess = true;
                string lastPdf = "";
                int successCount = 0;

                for (int itemIdx = 0; itemIdx < items.Count; itemIdx++)
                {
                    if (runner.IsCancelled) break;
                    string targetInput = items[itemIdx];

                    int baseProg = (itemIdx * 100) / items.Count;
                    int spanProg = 100 / items.Count;

                    bool isSingleMd = File.Exists(targetInput) && targetInput.EndsWith(".md", StringComparison.OrdinalIgnoreCase);
                    string itemName = Path.GetFileName(targetInput.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));

                    AppendLog("════════════════════════════════════════════════════════════════");
                    AppendLog(string.Format("[*] [{0}/{1}] Publishing: {2}", itemIdx + 1, items.Count, itemName));
                    AppendLog("════════════════════════════════════════════════════════════════");

                    if (isSingleMd)
                    {
                        // Single Markdown File Direct Publication Mode
                        string workingDir = Path.GetDirectoryName(targetInput);
                        string fileName = Path.GetFileName(targetInput);
                        string baseName = Path.GetFileNameWithoutExtension(targetInput);

                        bool isTrans = fileName.IndexOf("translated", StringComparison.OrdinalIgnoreCase) >= 0 || fileName.IndexOf("dich", StringComparison.OrdinalIgnoreCase) >= 0;
                        bool isOrig = fileName.IndexOf("original", StringComparison.OrdinalIgnoreCase) >= 0;

                        string noteArg = " --note=none";
                        if (chkTranslatorNote.Checked)
                        {
                            if (isTrans)
                            {
                                noteArg = " --note=_TRANSLATOR_NOTE_translated.md";
                            }
                            else if (isOrig)
                            {
                                noteArg = " --note=_TRANSLATOR_NOTE_original.md";
                            }
                            else
                            {
                                string transNote = Path.Combine(workingDir, "_TRANSLATOR_NOTE_translated.md");
                                string origNote = Path.Combine(workingDir, "_TRANSLATOR_NOTE_original.md");
                                if (File.Exists(transNote))
                                {
                                    noteArg = " --note=_TRANSLATOR_NOTE_translated.md";
                                }
                                else if (File.Exists(origNote))
                                {
                                    noteArg = " --note=_TRANSLATOR_NOTE_original.md";
                                }
                            }
                        }

                        UpdateProgress(baseProg + (30 * spanProg / 100), string.Format("Batch [{0}/{1}]: Rendering Markdown PDF ({2})...", itemIdx + 1, items.Count, fileName));
                        string pubArgs = string.Format("--input=\"{0}\" --project=\"{1}\" --profile={2} --binding={3}{4}{5}", fileName, workingDir, profile, bindingMode, noteArg, tocArg);

                        bool pubOk = await runner.RunCommandAsync(workingDir, "07__pdf_publisher.js", pubArgs);
                        if (runner.IsCancelled)
                        {
                            AppendLog("[*] Publication stopped by user.");
                            allSuccess = false;
                            break;
                        }
                        if (pubOk)
                        {
                            string bindingSuffix = (bindingMode == "screen") ? "-screen" : "";
                            string expectedPdf = Path.Combine(workingDir, string.Format("{0} ({1}{2}).pdf", baseName, profile, bindingSuffix));
                            if (File.Exists(expectedPdf))
                            {
                                lastPdf = expectedPdf;
                                generatedPdfPath = expectedPdf;
                            }
                            successCount++;
                        }
                        else
                        {
                            AppendLog(string.Format("[ERROR] PDF render for {0} failed!", fileName));
                            allSuccess = false;
                        }
                    }
                    else if (Directory.Exists(targetInput))
                    {
                        // Book Project Directory Mode
                        string bookDir = targetInput;
                        string bookName = Path.GetFileName(bookDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));

                        System.Collections.Generic.List<string> sourcesToRun = new System.Collections.Generic.List<string>();
                        if (chkSourceTranslated.Checked) sourcesToRun.Add("translated");
                        if (chkSourceOriginal.Checked) sourcesToRun.Add("original");

                        for (int i = 0; i < sourcesToRun.Count; i++)
                        {
                            if (runner.IsCancelled)
                            {
                                AppendLog("[*] Publication stopped by user.");
                                allSuccess = false;
                                break;
                            }

                            string srcType = sourcesToRun[i];
                            string srcFolder = (srcType == "translated") ? "chapters_translated" : "chapters_original";
                            string srcLabel = (srcType == "translated") ? "Translated" : "Original";

                            string fullSrcFolder = Path.Combine(bookDir, srcFolder);
                            if (!Directory.Exists(fullSrcFolder) || Directory.GetFiles(fullSrcFolder, "*.md").Length == 0)
                            {
                                AppendLog(string.Format("[INFO] Skipping {0} edition for '{1}': '{2}' not found or empty.", srcLabel, bookName, srcFolder));
                                continue;
                            }

                            int subProgBase = baseProg + (i * spanProg / sourcesToRun.Count);
                            int subProgSpan = spanProg / sourcesToRun.Count;

                            UpdateProgress(subProgBase + (10 * subProgSpan / 100), string.Format("Batch [{0}/{1}]: Compiling master ({2})...", itemIdx + 1, items.Count, srcLabel));
                            bool compOk = await runner.RunCommandAsync(bookDir, "06__book_compiler.js", string.Format("--source={0}", srcFolder));
                            if (runner.IsCancelled)
                            {
                                AppendLog("[*] Publication stopped by user.");
                                allSuccess = false;
                                break;
                            }
                            if (!compOk)
                            {
                                AppendLog(string.Format("[ERROR] Compilation for {0} failed!", srcLabel));
                                allSuccess = false;
                                continue;
                            }

                            UpdateProgress(subProgBase + (40 * subProgSpan / 100), string.Format("Batch [{0}/{1}]: Rendering PDF ({2})...", itemIdx + 1, items.Count, srcLabel));
                            string mdFileName = string.Format("{0}-{1}.md", bookName, srcType);
                            string noteArg = "";
                            if (!chkTranslatorNote.Checked)
                            {
                                noteArg = " --note=none";
                            }
                            else
                            {
                                string noteFile = (srcType == "translated") ? "_TRANSLATOR_NOTE_translated.md" : "_TRANSLATOR_NOTE_original.md";
                                noteArg = string.Format(" --note={0}", noteFile);
                            }

                            string pubArgs = string.Format("--input=\"{0}\" --profile={1} --binding={2}{3}{4}", mdFileName, profile, bindingMode, noteArg, tocArg);
                            bool pubOk = await runner.RunCommandAsync(bookDir, "07__pdf_publisher.js", pubArgs);
                            if (runner.IsCancelled)
                            {
                                AppendLog("[*] Publication stopped by user.");
                                allSuccess = false;
                                break;
                            }
                            if (pubOk)
                            {
                                string bindingSuffix = (bindingMode == "screen") ? "-screen" : "";
                                string expectedPdf = Path.Combine(bookDir, string.Format("{0}-{1} ({2}{3}).pdf", bookName, srcType, profile, bindingSuffix));
                                if (File.Exists(expectedPdf))
                                {
                                    lastPdf = expectedPdf;
                                    generatedPdfPath = expectedPdf;
                                }
                                successCount++;
                            }
                            else
                            {
                                AppendLog(string.Format("[ERROR] PDF render for {0} failed!", srcLabel));
                                allSuccess = false;
                            }
                        }
                    }
                }

                if (!string.IsNullOrEmpty(lastPdf))
                {
                    generatedPdfPath = lastPdf;
                    btnOpenPdf.Enabled = true;
                }

                if (runner.IsCancelled)
                {
                    UpdateProgress(0, "Process stopped.");
                }
                else if (allSuccess)
                {
                    UpdateProgress(100, string.Format("PUBLICATION SUCCESSFUL! Generated {0} PDF book(s).", successCount));
                    AppendLog("════════════════════════════════════════════════════════════════");
                    AppendLog(string.Format("[COMPLETED] Batch publication finished. Successfully generated {0} PDF book(s).", successCount));
                    AppendLog("════════════════════════════════════════════════════════════════");
                }
                else
                {
                    UpdateProgress(100, string.Format("Completed publication with warnings/errors ({0} succeeded).", successCount));
                }
            }
            finally
            {
                currentRunLogger = null;
                SetExecutionState(false);
            }
        }

        private async void btnRunAudit_Click(object sender, EventArgs e)
        {
            if (isExecuting)
            {
                runner.Cancel();
                btnRunAudit.Enabled = false;
                btnRunAudit.Text = "Stopping...";
                btnRunAudit.Invalidate();
                AppendLog("[!] Stop request received. Terminating process tree...");
                UpdateProgress(progressBar.Value, "Stopping process...");
                return;
            }

            var items = ParsePaths(txtPublishFolder.Text);
            System.Collections.Generic.List<string> bookDirs = new System.Collections.Generic.List<string>();
            foreach (var it in items)
            {
                if (Directory.Exists(it))
                {
                    if (!bookDirs.Contains(it)) bookDirs.Add(it);
                }
                else if (File.Exists(it))
                {
                    string parent = Path.GetDirectoryName(it);
                    if (!bookDirs.Contains(parent)) bookDirs.Add(parent);
                }
            }

            if (bookDirs.Count == 0)
            {
                AppendLog("[!] QA Audit requires a valid book project directory containing chapter folders.");
                UpdateProgress(0, "No valid book directory selected.");
                return;
            }

            runner.Reset();
            currentRunLogger = AppendLogPublish;
            SetExecutionState(true, "audit");
            try
            {
                rtbLogPublish.Clear();
                for (int i = 0; i < bookDirs.Count; i++)
                {
                    if (runner.IsCancelled) break;
                    string bookDir = bookDirs[i];
                    UpdateProgress((i * 100) / bookDirs.Count + 10, string.Format("Running QA audit on [{0}/{1}]: {2}...", i + 1, bookDirs.Count, Path.GetFileName(bookDir)));
                    await runner.RunCommandAsync(bookDir, "audit_pdf_vs_md.js", "");
                }

                if (runner.IsCancelled)
                {
                    UpdateProgress(0, "Process stopped.");
                    AppendLog("[*] QA Audit stopped by user.");
                }
                else
                {
                    UpdateProgress(100, "QA Audit completed.");
                }
            }
            finally
            {
                currentRunLogger = null;
                SetExecutionState(false);
            }
        }

        private void btnOpenOutput_Click(object sender, EventArgs e)
        {
            if (!string.IsNullOrEmpty(activeBookDir) && Directory.Exists(activeBookDir))
            {
                try { System.Diagnostics.Process.Start("explorer.exe", activeBookDir); } catch { }
            }
        }

        private void btnOpenPdf_Click(object sender, EventArgs e)
        {
            if (!string.IsNullOrEmpty(generatedPdfPath) && File.Exists(generatedPdfPath))
            {
                try { System.Diagnostics.Process.Start(generatedPdfPath); } catch { }
            }
        }

        private void btnEditNote_Click(object sender, EventArgs e)
        {
            string bookDir = txtPublishFolder.Text.Trim();
            if (File.Exists(bookDir))
            {
                bookDir = Path.GetDirectoryName(bookDir);
            }
            else if (string.IsNullOrEmpty(bookDir) || !Directory.Exists(bookDir))
            {
                bookDir = activeBookDir;
            }

            // Determine initial edition based on selected Content source
            string initialDoc = (!chkSourceTranslated.Checked && chkSourceOriginal.Checked)
                ? "Original"
                : "Translated";

            string activePaper = PaperProfiles.GetSelectedKey(cbPaperSize);

            using (FrontMatterEditorForm editor = new FrontMatterEditorForm(bookDir, initialDoc, activePaper))
            {
                editor.ShowDialog(this);
                if (!string.IsNullOrEmpty(editor.SelectedPaperSize))
                {
                    PaperProfiles.SetSelectedKey(cbPaperSize, editor.SelectedPaperSize);
                }
            }
        }

        private void btnToggleExtractSettings_Click(object sender, EventArgs e)
        {
            isExtractSettingsCollapsed = !isExtractSettingsCollapsed;
            UpdateCollapseButtonVisuals();
            UpdateDynamicLayout();
        }

        private void btnTogglePublishSettings_Click(object sender, EventArgs e)
        {
            isPublishSettingsCollapsed = !isPublishSettingsCollapsed;
            UpdateCollapseButtonVisuals();
            UpdateDynamicLayout();
        }

        private void UpdateCollapseButtonVisuals()
        {
            btnToggleExtractSettings.Text = isExtractSettingsCollapsed ? "Settings ▼" : "Settings ▲";
            fastTip.SetToolTip(btnToggleExtractSettings, isExtractSettingsCollapsed
                ? "Expand Settings:\nRestore full configuration options."
                : "Collapse Settings:\nHide configuration options to maximize the live log terminal window.");

            btnTogglePublishSettings.Text = isPublishSettingsCollapsed ? "Settings ▼" : "Settings ▲";
            fastTip.SetToolTip(btnTogglePublishSettings, isPublishSettingsCollapsed
                ? "Expand Settings:\nRestore full configuration options."
                : "Collapse Settings:\nHide configuration options to maximize the live log terminal window.");
        }

        private void UpdateDynamicLayout()
        {
            this.SuspendLayout();

            // Tab 1 (PDF to Markdown) Layout
            if (isExtractSettingsCollapsed)
            {
                cardOutputLocation.Visible = false;
                cardExtractOptions.Visible = false;
                btnStartExtract.Top = 140;
                btnOpenOutputFolder.Top = 140;
                btnThemeToggle.Top = 140;
                pnlTabExtract.Height = 188;
            }
            else
            {
                cardOutputLocation.Visible = true;
                cardExtractOptions.Visible = true;
                cardOutputLocation.Top = 140;
                cardExtractOptions.Top = 288;
                btnStartExtract.Top = 458;
                btnOpenOutputFolder.Top = 458;
                btnThemeToggle.Top = 458;
                pnlTabExtract.Height = 504;
            }

            // Tab 2 (Markdown to PDF) Layout
            lblPublishInspector.Top = 132;
            if (isPublishSettingsCollapsed)
            {
                cardPublishOptions.Visible = false;
                btnRunAudit.Top = 158;
                btnStartPublish.Top = 158;
                btnOpenPdf.Top = 158;
                pnlTabPublish.Height = 204;
            }
            else
            {
                cardPublishOptions.Visible = true;
                cardPublishOptions.Top = 154;
                btnRunAudit.Top = 412;
                btnStartPublish.Top = 412;
                btnOpenPdf.Top = 412;
                pnlTabPublish.Height = 460;
            }

            // Check if Info tab is active
            bool isInfoTab = (tabBar.SelectedIndex == 2);
            pnlTabExtract.Visible = (tabBar.SelectedIndex == 0);
            pnlTabPublish.Visible = (tabBar.SelectedIndex == 1);
            if (pnlTabInfo != null) pnlTabInfo.Visible = isInfoTab;

            lblStatus.Visible = !isInfoTab;
            progressBar.Visible = !isInfoTab;
            if (rtbLogExtract != null) rtbLogExtract.Visible = (!isInfoTab && tabBar.SelectedIndex == 0);
            if (rtbLogPublish != null) rtbLogPublish.Visible = (!isInfoTab && tabBar.SelectedIndex == 1);
            scrollBarLog.Visible = !isInfoTab;

            if (isInfoTab)
            {
                if (pnlTabInfo != null)
                {
                    pnlTabInfo.SetBounds(0, 78, this.ClientSize.Width, Math.Max(100, this.ClientSize.Height - 78));
                    pnlTabInfo.UpdateLayout();
                }
                this.ResumeLayout(true);
                this.Invalidate(true);
                return;
            }

            // Determine active panel & panel bottom
            ModernContainerPanel activePanel = (tabBar.SelectedIndex == 0) ? pnlTabExtract : pnlTabPublish;
            int panelBottom = activePanel.Top + activePanel.Height;

            // Reposition Bottom Section
            int statusY = panelBottom + 8;
            lblStatus.Top = statusY;

            int progressY = statusY + 22;
            progressBar.Top = progressY;

            int logY = progressY + 30;
            int clientH = this.ClientSize.Height;
            int clientW = this.ClientSize.Width;
            int logHeight = Math.Max(80, clientH - logY - 16);

            int logWidth = Math.Max(100, clientW - 42);
            if (rtbLogExtract != null) rtbLogExtract.SetBounds(16, logY, logWidth, logHeight);
            if (rtbLogPublish != null) rtbLogPublish.SetBounds(16, logY, logWidth, logHeight);
            scrollBarLog.SetBounds(Math.Max(100, clientW - 24), logY, 8, logHeight);

            this.ResumeLayout(true);
            this.Invalidate(true);
            SyncLogScrollbar();
        }

        protected override CreateParams CreateParams
        {
            get
            {
                const int CS_DROPSHADOW = 0x00020000;
                const int WS_MINIMIZEBOX = 0x00020000;
                CreateParams cp = base.CreateParams;
                cp.Style |= 0x02000000; // WS_CLIPCHILDREN
                cp.Style |= WS_MINIMIZEBOX;
                cp.ClassStyle |= CS_DROPSHADOW;
                return cp;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (this.FormBorderStyle == FormBorderStyle.None)
            {
                ThemeTokens t = ThemeTokens.Current ?? ThemeTokens.DarkTheme();
                using (Pen borderPen = new Pen(t.BorderColor, 1))
                {
                    e.Graphics.DrawRectangle(borderPen, 0, 0, this.ClientSize.Width - 1, this.ClientSize.Height - 1);
                }
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            try
            {
                this.MaximizedBounds = Screen.FromHandle(this.Handle).WorkingArea;
            }
            catch { }
            if (titleBarCustom != null) titleBarCustom.Invalidate();
            UpdateDynamicLayout();
            this.Invalidate(true);
        }

        protected override void WndProc(ref Message m)
        {
            const int WM_NCHITTEST = 0x0084;
            if (m.Msg == WM_NCHITTEST)
            {
                base.WndProc(ref m);
                if (this.WindowState == FormWindowState.Normal)
                {
                    int x = (short)(m.LParam.ToInt32() & 0xFFFF);
                    int y = (short)((m.LParam.ToInt32() >> 16) & 0xFFFF);
                    Point pos = this.PointToClient(new Point(x, y));
                    int grip = 6;
                    bool left = pos.X <= grip;
                    bool right = pos.X >= this.ClientSize.Width - grip;
                    bool top = pos.Y <= grip;
                    bool bottom = pos.Y >= this.ClientSize.Height - grip;

                    if (top && left) { m.Result = (IntPtr)13; return; } // HTTOPLEFT
                    if (top && right) { m.Result = (IntPtr)14; return; } // HTTOPRIGHT
                    if (bottom && left) { m.Result = (IntPtr)16; return; } // HTBOTTOMLEFT
                    if (bottom && right) { m.Result = (IntPtr)17; return; } // HTBOTTOMRIGHT
                    if (left) { m.Result = (IntPtr)10; return; } // HTLEFT
                    if (right) { m.Result = (IntPtr)11; return; } // HTRIGHT
                    if (top) { m.Result = (IntPtr)12; return; } // HTTOP
                    if (bottom) { m.Result = (IntPtr)15; return; } // HTBOTTOM
                }
                return;
            }
            base.WndProc(ref m);
        }

        protected override void OnResizeEnd(EventArgs e)
        {
            base.OnResizeEnd(e);
            this.Invalidate(true);
            this.Update();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            SaveConfig();
            base.OnFormClosing(e);
        }

        private void LoadConfig()
        {
            if (!ConfigManager.HasConfig()) return;

            try
            {
                BookForgeConfig c = ConfigManager.Load();
                if (c == null) return;

                // 1. Tab 1: Extraction settings
                if (!string.IsNullOrEmpty(c.ExtractSourcePath))
                {
                    txtExtractSource.Text = c.ExtractSourcePath;
                    dropExtract.SelectedPath = c.ExtractSourcePath;
                }

                if (string.Equals(c.OutputLocationMode, "AppFolder", StringComparison.OrdinalIgnoreCase))
                {
                    rbOutputAppFolder.Checked = true;
                }
                else if (string.Equals(c.OutputLocationMode, "CustomFolder", StringComparison.OrdinalIgnoreCase))
                {
                    rbOutputCustom.Checked = true;
                    if (!string.IsNullOrEmpty(c.OutputCustomFolder))
                    {
                        txtOutputCustom.Text = c.OutputCustomFolder;
                    }
                }
                else
                {
                    rbOutputSameSource.Checked = true;
                }

                if (!string.IsNullOrEmpty(c.SmartChunking))
                {
                    cbSmartChunking.SelectedItem = c.SmartChunking;
                    if (cbSmartChunking.SelectedIndex < 0)
                    {
                        if (c.SmartChunking.IndexOf("H3", StringComparison.OrdinalIgnoreCase) >= 0)
                            cbSmartChunking.SelectedIndex = 2;
                        else if (c.SmartChunking.IndexOf("H2", StringComparison.OrdinalIgnoreCase) >= 0)
                            cbSmartChunking.SelectedIndex = 1;
                        else
                            cbSmartChunking.SelectedIndex = 0;
                    }
                }

                if (!string.IsNullOrEmpty(c.Threshold))
                {
                    cbThreshold.SelectedItem = c.Threshold;
                    if (cbThreshold.SelectedIndex < 0)
                    {
                        for (int i = 0; i < cbThreshold.Items.Count; i++)
                        {
                            if (cbThreshold.Items[i].IndexOf(c.Threshold, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                c.Threshold.IndexOf(cbThreshold.Items[i], StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                cbThreshold.SelectedIndex = i;
                                break;
                            }
                        }
                    }
                }

                chkExtractImages.Checked = c.ExtractImages;
                chkScaffoldBible.Checked = c.ScaffoldBible;
                UpdateExtractTargetPreview();

                // 2. Tab 2: Publish settings
                if (!string.IsNullOrEmpty(c.PublishFolderPath))
                {
                    txtPublishFolder.Text = c.PublishFolderPath;
                    dropPublish.SelectedPath = c.PublishFolderPath;
                    activeBookDir = c.PublishFolderPath;
                }

                chkSourceTranslated.Checked = c.SourceTranslated;
                chkSourceOriginal.Checked = c.SourceOriginal;

                if (!string.IsNullOrEmpty(c.PaperSize))
                {
                    PaperProfiles.SetSelectedKey(cbPaperSize, c.PaperSize);
                }

                if (!string.IsNullOrEmpty(c.FontFamily))
                {
                    cbFont.SelectedItem = c.FontFamily;
                    if (cbFont.SelectedIndex < 0)
                    {
                        for (int i = 0; i < cbFont.Items.Count; i++)
                        {
                            if (cbFont.Items[i].IndexOf(c.FontFamily, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                c.FontFamily.IndexOf(cbFont.Items[i], StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                cbFont.SelectedIndex = i;
                                break;
                            }
                        }
                    }
                }

                if (!string.IsNullOrEmpty(c.MenuDepth))
                {
                    cbMenuDepth.SelectedItem = c.MenuDepth;
                    if (cbMenuDepth.SelectedIndex < 0)
                    {
                        for (int i = 0; i < cbMenuDepth.Items.Count; i++)
                        {
                            if (cbMenuDepth.Items[i].IndexOf(c.MenuDepth, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                c.MenuDepth.IndexOf(cbMenuDepth.Items[i], StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                cbMenuDepth.SelectedIndex = i;
                                break;
                            }
                        }
                    }
                }

                if (string.Equals(c.BindingMode, "Digital", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(c.BindingMode, "Screen", StringComparison.OrdinalIgnoreCase))
                {
                    rbGutterDigital.Checked = true;
                }
                else
                {
                    rbGutterPrint.Checked = true;
                }

                chkTranslatorNote.Checked = c.IncludeTranslatorNote;
                btnEditNote.Enabled = c.IncludeTranslatorNote;

                // 3. General UI State
                if (c.SelectedTab == 2)
                {
                    tabBar.SelectedIndex = 2;
                    pnlTabExtract.Visible = false;
                    pnlTabPublish.Visible = false;
                    if (pnlTabInfo != null) pnlTabInfo.Visible = true;
                }
                else if (c.SelectedTab == 1)
                {
                    tabBar.SelectedIndex = 1;
                    pnlTabExtract.Visible = false;
                    pnlTabPublish.Visible = true;
                    if (pnlTabInfo != null) pnlTabInfo.Visible = false;
                }
                else
                {
                    tabBar.SelectedIndex = 0;
                    pnlTabExtract.Visible = true;
                    pnlTabPublish.Visible = false;
                    if (pnlTabInfo != null) pnlTabInfo.Visible = false;
                }

                // Theme
                ThemeTokens t = ThemeTokens.Current;
                if (c.IsDarkTheme != t.IsDark)
                {
                    if (c.IsDarkTheme)
                    {
                        CopyThemeValues(ThemeTokens.DarkTheme(), t);
                        btnThemeToggle.Text = "Theme: Dark";
                    }
                    else
                    {
                        CopyThemeValues(ThemeTokens.LightTheme(), t);
                        btnThemeToggle.Text = "Theme: Light";
                    }
                    ApplyThemeToAllControls();
                }

                // Collapse states
                isExtractSettingsCollapsed = c.ExtractSettingsCollapsed;
                isPublishSettingsCollapsed = c.PublishSettingsCollapsed;
                UpdateCollapseButtonVisuals();

                // Window dimensions (if valid and within screen bounds)
                if (c.WindowWidth >= MinimumSize.Width && c.WindowHeight >= MinimumSize.Height)
                {
                    int screenW = Screen.PrimaryScreen.WorkingArea.Width;
                    int screenH = Screen.PrimaryScreen.WorkingArea.Height;
                    int targetW = Math.Min(c.WindowWidth, screenW);
                    int targetH = Math.Min(c.WindowHeight, screenH);
                    this.Size = new Size(targetW, targetH);
                }

                UpdateDynamicLayout();
                AppendLog("[OK] Restored previous settings from _BookForgeConfig");
            }
            catch (Exception ex)
            {
                AppendLog(string.Format("[WARN] Could not restore config: {0}", ex.Message));
            }
        }

        private void SaveConfig()
        {
            try
            {
                BookForgeConfig c = new BookForgeConfig();

                // Tab 1
                c.ExtractSourcePath = txtExtractSource.Text.Trim();
                if (rbOutputAppFolder.Checked) c.OutputLocationMode = "AppFolder";
                else if (rbOutputCustom.Checked) c.OutputLocationMode = "CustomFolder";
                else c.OutputLocationMode = "SameAsSource";
                c.OutputCustomFolder = txtOutputCustom.Text.Trim();
                c.SmartChunking = cbSmartChunking.SelectedItem != null ? cbSmartChunking.SelectedItem.ToString() : cbSmartChunking.Text;
                c.Threshold = cbThreshold.SelectedItem != null ? cbThreshold.SelectedItem.ToString() : cbThreshold.Text;
                c.ExtractImages = chkExtractImages.Checked;
                c.ScaffoldBible = chkScaffoldBible.Checked;
                c.ExtractSettingsCollapsed = isExtractSettingsCollapsed;

                // Tab 2
                c.PublishFolderPath = txtPublishFolder.Text.Trim();
                c.SourceTranslated = chkSourceTranslated.Checked;
                c.SourceOriginal = chkSourceOriginal.Checked;
                c.PaperSize = PaperProfiles.GetSelectedKey(cbPaperSize);
                c.FontFamily = cbFont.SelectedItem != null ? cbFont.SelectedItem.ToString() : cbFont.Text;
                c.MenuDepth = cbMenuDepth.SelectedItem != null ? cbMenuDepth.SelectedItem.ToString() : "H1";
                c.BindingMode = rbGutterDigital.Checked ? "Digital" : "Print";
                c.IncludeTranslatorNote = chkTranslatorNote.Checked;
                c.PublishSettingsCollapsed = isPublishSettingsCollapsed;

                // General
                c.SelectedTab = tabBar.SelectedIndex;
                c.IsDarkTheme = ThemeTokens.Current.IsDark;

                if (this.WindowState == FormWindowState.Normal)
                {
                    c.WindowWidth = this.Width;
                    c.WindowHeight = this.Height;
                }
                else
                {
                    c.WindowWidth = this.RestoreBounds.Width;
                    c.WindowHeight = this.RestoreBounds.Height;
                }

                ConfigManager.Save(c);
            }
            catch { }
        }
    }
}
