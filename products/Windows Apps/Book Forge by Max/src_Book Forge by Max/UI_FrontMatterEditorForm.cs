using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace BookForge
{
    public class FrontMatterEditorForm : Form
    {
        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
        private const int EM_GETFIRSTVISIBLELINE = 0x00CE;
        private const int EM_GETLINECOUNT = 0x00BA;
        private const int EM_LINESCROLL = 0x00B6;

        private string bookDir;
        private string currentDocSelection;
        private bool isSuppressingEvents = false;
        private bool isSyncingMarkdownScroll = false;
        private Timer debounceTimer;

        // Toolbar controls
        private Panel pnlHeader;
        private Label lblFileSelect;
        private ModernDropdown cbTargetFile;
        private ModernButton btnResetTemplate;
        private ModernButton btnSave;
        private ModernButton btnClose;
        private Label lblStatus;

        // Split Editor & Preview
        private SplitContainer splitEditor;

        // Left Panel (Editor Side)
        private Panel pnlLeftTopHeader;
        private Label lblLeftTitle;
        private ModernButton btnCollapseHeader;

        // Header Section (2 Columns for 4 Slots)
        private Panel pnlHeaderCard;
        private Panel pnlH_Left;
        private Label lblH_LeftGroup;
        private Label lblH_L1_Title;
        private ModernTextBox txtH_L1;
        private Label lblH_L2_Title;
        private ModernTextBox txtH_L2;

        private Panel pnlH_Right;
        private Label lblH_RightGroup;
        private Label lblH_R1_Title;
        private ModernTextBox txtH_R1;
        private Label lblH_R2_Title;
        private ModernTextBox txtH_R2;

        // Ratio Controls (Customizable 5% Steps)
        private Panel pnlRatioRow;
        private Label lblRatioTitle;
        private ModernButton btnRatioMinus;
        private ModernDropdown cbHeaderRatio;
        private ModernButton btnRatioPlus;

        private static readonly int[] RatioSteps = new int[] {
            15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85
        };

        // Note Markdown Editor Section
        private Panel pnlNoteHeader;
        private Label lblNoteTitle;
        private Panel pnlMarkdownContainer;
        private RichTextBox txtMarkdown;
        private ModernScrollBar scrollBarMarkdown;

        // Right Panel (Live Preview Side)
        private Panel pnlRightHeader;
        private Label lblRightTitle;
        private Label lblPaperSize;
        private ModernDropdown cbPreviewPaperSize;
        private WebBrowser browserPreview;
        private string currentPaperSize = "A5";

        public string SelectedPaperSize
        {
            get { return currentPaperSize; }
        }

        private ToolTip formTip;

        static FrontMatterEditorForm()
        {
            Program.SetWebBrowserCompatibilityMode();
        }

        public FrontMatterEditorForm(string initialBookDir, string initialSelection, string initialPaperSize = "A5")
        {
            this.bookDir = initialBookDir ?? "";
            this.currentDocSelection = NormalizeSelection(initialSelection);
            this.currentPaperSize = NormalizePaperSize(initialPaperSize);

            isSuppressingEvents = true;
            InitializeForm();
            SetupTimer();
            ApplyTheme();
            isSuppressingEvents = false;

            LoadSelectedDocument(this.currentDocSelection);
        }

        private string NormalizeSelection(string sel)
        {
            if (string.IsNullOrEmpty(sel)) return "Translated";
            if (sel.IndexOf("original", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Original";
            }
            return "Translated";
        }

        private string NormalizePaperSize(string val)
        {
            return PaperProfiles.Find(val).Key;
        }

        private void InitializeForm()
        {
            this.Text = "Book Forge by Max - Front Matter & Header Editor (Markdown + Live Preview)";
            this.Size = new Size(1160, 780);
            this.MinimumSize = new Size(900, 600);
            this.StartPosition = FormStartPosition.CenterParent;
            this.FormBorderStyle = FormBorderStyle.Sizable;

            formTip = new ToolTip();
            formTip.InitialDelay = 50;
            formTip.AutoPopDelay = 10000;

            // App icon
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

                if (File.Exists(iconPath)) this.Icon = new Icon(iconPath);
                else if (File.Exists("app.ico")) this.Icon = new Icon("app.ico");
            }
            catch { }

            // 1. Toolbar Panel
            pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 52;
            pnlHeader.Padding = new Padding(14, 10, 14, 10);

            lblFileSelect = new Label();
            lblFileSelect.Text = "Target Edition:";
            lblFileSelect.AutoSize = true;
            lblFileSelect.Location = new Point(14, 16);
            lblFileSelect.Font = ThemeTokens.FontBodyBold;

            cbTargetFile = new ModernDropdown();
            cbTargetFile.Items.AddRange(new string[] {
                "Translated",
                "Original"
            });
            cbTargetFile.Location = new Point(120, 12);
            cbTargetFile.Size = new Size(130, 28);
            cbTargetFile.SelectedIndexChanged += new EventHandler(cbTargetFile_SelectedIndexChanged);

            int foundIdx = cbTargetFile.Items.IndexOf(this.currentDocSelection);
            if (foundIdx >= 0) cbTargetFile.SelectedIndex = foundIdx;
            else cbTargetFile.SelectedIndex = 0;

            btnResetTemplate = new ModernButton();
            btnResetTemplate.Text = "Reset to Template";
            btnResetTemplate.Location = new Point(262, 10);
            btnResetTemplate.Size = new Size(140, 32);
            btnResetTemplate.Click += new EventHandler(btnResetTemplate_Click);

            btnSave = new ModernButton();
            btnSave.Text = "Save to Project";
            btnSave.IsPrimary = true;
            btnSave.Location = new Point(412, 10);
            btnSave.Size = new Size(130, 32);
            btnSave.Click += new EventHandler(btnSave_Click);

            lblStatus = new Label();
            lblStatus.Text = "";
            lblStatus.AutoSize = true;
            lblStatus.Location = new Point(556, 17);
            lblStatus.Font = ThemeTokens.FontBody;

            btnClose = new ModernButton();
            btnClose.Text = "Close";
            btnClose.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            btnClose.Location = new Point(this.ClientSize.Width - 110, 10);
            btnClose.Size = new Size(96, 32);
            btnClose.Click += new EventHandler((s, e) => this.Close());

            pnlHeader.Controls.Add(lblFileSelect);
            pnlHeader.Controls.Add(cbTargetFile);
            pnlHeader.Controls.Add(btnResetTemplate);
            pnlHeader.Controls.Add(btnSave);
            pnlHeader.Controls.Add(lblStatus);
            pnlHeader.Controls.Add(btnClose);

            // 2. Split Container (Editor & Live Preview)
            splitEditor = new SplitContainer();
            splitEditor.Dock = DockStyle.Fill;
            splitEditor.SplitterWidth = 6;
            splitEditor.Orientation = Orientation.Vertical;

            // Left Panel Header (Header Bar Controls)
            pnlLeftTopHeader = new Panel();
            pnlLeftTopHeader.Dock = DockStyle.Top;
            pnlLeftTopHeader.Height = 32;
            pnlLeftTopHeader.Padding = new Padding(12, 6, 12, 6);

            lblLeftTitle = new Label();
            lblLeftTitle.Text = "Header Setting";
            lblLeftTitle.AutoSize = true;
            lblLeftTitle.Location = new Point(12, 7);
            lblLeftTitle.Font = ThemeTokens.FontSmallBold;

            btnCollapseHeader = new ModernButton();
            btnCollapseHeader.Text = "[-] Hide Header";
            btnCollapseHeader.Size = new Size(110, 24);
            btnCollapseHeader.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            btnCollapseHeader.Location = new Point(splitEditor.Panel1.Width - 125, 4);
            btnCollapseHeader.Click += new EventHandler(btnCollapseHeader_Click);

            pnlLeftTopHeader.Controls.Add(lblLeftTitle);
            pnlLeftTopHeader.Controls.Add(btnCollapseHeader);

            // Header Section: 2 Columns (Height ~125px)
            InitializeHeaderCard();

            // Note Markdown Section
            pnlNoteHeader = new Panel();
            pnlNoteHeader.Dock = DockStyle.Top;
            pnlNoteHeader.Height = 28;
            pnlNoteHeader.Padding = new Padding(12, 5, 12, 5);

            lblNoteTitle = new Label();
            lblNoteTitle.Text = "Translator Note (Markdown)";
            lblNoteTitle.AutoSize = true;
            lblNoteTitle.Location = new Point(12, 5);
            lblNoteTitle.Font = ThemeTokens.FontSmallBold;

            pnlNoteHeader.Controls.Add(lblNoteTitle);

            pnlMarkdownContainer = new Panel();
            pnlMarkdownContainer.Dock = DockStyle.Fill;
            pnlMarkdownContainer.Padding = new Padding(0);

            scrollBarMarkdown = new ModernScrollBar();
            scrollBarMarkdown.Dock = DockStyle.Right;
            scrollBarMarkdown.Width = 8;
            scrollBarMarkdown.Visible = true;

            txtMarkdown = new RichTextBox();
            txtMarkdown.Dock = DockStyle.Fill;
            txtMarkdown.BorderStyle = BorderStyle.None;
            txtMarkdown.Font = new Font("Consolas", 10.5f, FontStyle.Regular);
            txtMarkdown.AcceptsTab = true;
            txtMarkdown.DetectUrls = false;
            txtMarkdown.ScrollBars = RichTextBoxScrollBars.None;
            txtMarkdown.TextChanged += new EventHandler(txtMarkdown_TextChanged);

            pnlMarkdownContainer.Controls.Add(txtMarkdown);
            pnlMarkdownContainer.Controls.Add(scrollBarMarkdown);

            SetupMarkdownScrollbar();

            // Add left panel controls in bottom-to-top dock order
            splitEditor.Panel1.Controls.Add(pnlMarkdownContainer);
            splitEditor.Panel1.Controls.Add(pnlNoteHeader);
            splitEditor.Panel1.Controls.Add(pnlHeaderCard);
            splitEditor.Panel1.Controls.Add(pnlLeftTopHeader);

            // Right Panel: Live Preview
            pnlRightHeader = new Panel();
            pnlRightHeader.Dock = DockStyle.Top;
            pnlRightHeader.Height = 32;
            pnlRightHeader.Padding = new Padding(12, 4, 12, 4);

            lblRightTitle = new Label();
            lblRightTitle.Text = "Print Preview";
            lblRightTitle.AutoSize = true;
            lblRightTitle.Location = new Point(12, 7);
            lblRightTitle.Font = ThemeTokens.FontSmallBold;

            lblPaperSize = new Label();
            lblPaperSize.Text = "Paper size:";
            lblPaperSize.AutoSize = true;
            lblPaperSize.Font = ThemeTokens.FontSmallBold;

            cbPreviewPaperSize = new ModernDropdown();
            cbPreviewPaperSize.Size = new Size(185, 24);
            PaperProfiles.PopulateDropdown(cbPreviewPaperSize, currentPaperSize);
            cbPreviewPaperSize.SelectedIndexChanged += new EventHandler(cbPreviewPaperSize_SelectedIndexChanged);

            formTip.SetToolTip(cbPreviewPaperSize, "Simulated Paper Size:\nSwitch between all standard book & document formats to preview typography & header layout.");
            formTip.SetToolTip(lblPaperSize, "Simulated Paper Size:\nSwitch between all standard book & document formats to preview typography & header layout.");

            pnlRightHeader.Controls.Add(lblRightTitle);
            pnlRightHeader.Controls.Add(lblPaperSize);
            pnlRightHeader.Controls.Add(cbPreviewPaperSize);

            browserPreview = new WebBrowser();
            browserPreview.Dock = DockStyle.Fill;
            browserPreview.ScriptErrorsSuppressed = true;
            browserPreview.IsWebBrowserContextMenuEnabled = false;

            splitEditor.Panel2.Controls.Add(browserPreview);
            splitEditor.Panel2.Controls.Add(pnlRightHeader);

            // Add main layout controls to Form
            this.Controls.Add(splitEditor);
            this.Controls.Add(pnlHeader);

            // Form Shown handler
            this.Shown += new EventHandler((s, e) =>
            {
                try
                {
                    splitEditor.SplitterDistance = Math.Min(480, (int)(splitEditor.Width * 0.42));
                    btnCollapseHeader.Location = new Point(splitEditor.Panel1.Width - 125, 4);
                    RelayoutHeaderCard();
                    RelayoutRightHeader();
                }
                catch { }
            });

            splitEditor.Panel1.Resize += (s, e) =>
            {
                btnCollapseHeader.Location = new Point(splitEditor.Panel1.Width - 125, 4);
                RelayoutHeaderCard();
            };

            pnlRightHeader.Resize += (s, e) =>
            {
                RelayoutRightHeader();
            };
        }

        private void InitializeHeaderCard()
        {
            pnlHeaderCard = new Panel();
            pnlHeaderCard.Dock = DockStyle.Top;
            pnlHeaderCard.Height = 118;
            pnlHeaderCard.Padding = new Padding(8, 4, 8, 4);

            // Left column: Lines 1 & 2
            pnlH_Left = new Panel();
            pnlH_Left.Location = new Point(8, 4);
            pnlH_Left.Size = new Size(220, 110);

            lblH_LeftGroup = new Label();
            lblH_LeftGroup.Text = "Header Left (empty = dynamic H1):";
            lblH_LeftGroup.Font = ThemeTokens.FontSmallBold;
            lblH_LeftGroup.Location = new Point(2, 2);
            lblH_LeftGroup.AutoSize = true;

            lblH_L1_Title = new Label();
            lblH_L1_Title.Text = "Line 1:";
            lblH_L1_Title.Font = ThemeTokens.FontSmall;
            lblH_L1_Title.Location = new Point(2, 22);
            lblH_L1_Title.AutoSize = true;

            txtH_L1 = new ModernTextBox();
            txtH_L1.Location = new Point(48, 20);
            txtH_L1.Size = new Size(168, 22);
            txtH_L1.PlaceholderText = "H1 chapter title (auto-detected if blank)";
            txtH_L1.TextChanged += new EventHandler(HeaderInput_TextChanged);

            lblH_L2_Title = new Label();
            lblH_L2_Title.Text = "Line 2:";
            lblH_L2_Title.Font = ThemeTokens.FontSmall;
            lblH_L2_Title.Location = new Point(2, 48);
            lblH_L2_Title.AutoSize = true;

            txtH_L2 = new ModernTextBox();
            txtH_L2.Location = new Point(48, 46);
            txtH_L2.Size = new Size(168, 22);
            txtH_L2.PlaceholderText = "Subtitle / sub-heading (optional)";
            txtH_L2.TextChanged += new EventHandler(HeaderInput_TextChanged);

            pnlH_Left.Controls.Add(lblH_LeftGroup);
            pnlH_Left.Controls.Add(lblH_L1_Title);
            pnlH_Left.Controls.Add(txtH_L1);
            pnlH_Left.Controls.Add(lblH_L2_Title);
            pnlH_Left.Controls.Add(txtH_L2);

            // Right column: Lines 3 & 4
            pnlH_Right = new Panel();
            pnlH_Right.Location = new Point(240, 4);
            pnlH_Right.Size = new Size(220, 110);

            lblH_RightGroup = new Label();
            lblH_RightGroup.Text = "Header Right (Translator / Info):";
            lblH_RightGroup.Font = ThemeTokens.FontSmallBold;
            lblH_RightGroup.Location = new Point(2, 2);
            lblH_RightGroup.AutoSize = true;

            lblH_R1_Title = new Label();
            lblH_R1_Title.Text = "Line 3:";
            lblH_R1_Title.Font = ThemeTokens.FontSmall;
            lblH_R1_Title.Location = new Point(2, 22);
            lblH_R1_Title.AutoSize = true;

            txtH_R1 = new ModernTextBox();
            txtH_R1.Location = new Point(48, 20);
            txtH_R1.Size = new Size(168, 22);
            txtH_R1.PlaceholderText = "Role / prefix (e.g. Translated by:)";
            txtH_R1.TextChanged += new EventHandler(HeaderInput_TextChanged);

            lblH_R2_Title = new Label();
            lblH_R2_Title.Text = "Line 4:";
            lblH_R2_Title.Font = ThemeTokens.FontSmall;
            lblH_R2_Title.Location = new Point(2, 48);
            lblH_R2_Title.AutoSize = true;

            txtH_R2 = new ModernTextBox();
            txtH_R2.Location = new Point(48, 46);
            txtH_R2.Size = new Size(168, 22);
            txtH_R2.PlaceholderText = "Translator name or markdown link";
            txtH_R2.TextChanged += new EventHandler(HeaderInput_TextChanged);

            // Hover tooltips for header fields
            ToolTip headerTip = new ToolTip();
            headerTip.InitialDelay = 50;
            headerTip.AutoPopDelay = 10000;
            headerTip.SetToolTip(txtH_L1, "Line 1: Main chapter/section title. If left blank, automatically uses the H1 heading from the chapter.");
            headerTip.SetToolTip(txtH_L2, "Line 2: Subtitle or additional section description (optional).");
            headerTip.SetToolTip(txtH_R1, "Line 3: Role or attribution prefix, e.g. 'Translated by:' or 'Compiled by:'.");
            headerTip.SetToolTip(txtH_R2, "Line 4: Contributor name or markdown link, e.g. 'Max' or '[BookForge](url)'.");

            pnlH_Right.Controls.Add(lblH_RightGroup);
            pnlH_Right.Controls.Add(lblH_R1_Title);
            pnlH_Right.Controls.Add(txtH_R1);
            pnlH_Right.Controls.Add(lblH_R2_Title);
            pnlH_Right.Controls.Add(txtH_R2);

            // Ratio Row (Width Split in 5% Steps)
            pnlRatioRow = new Panel();
            pnlRatioRow.Location = new Point(8, 78);
            pnlRatioRow.Size = new Size(460, 32);

            lblRatioTitle = new Label();
            lblRatioTitle.Text = "Width split ratio (5% step):";
            lblRatioTitle.Font = ThemeTokens.FontSmallBold;
            lblRatioTitle.Location = new Point(2, 6);
            lblRatioTitle.AutoSize = true;

            btnRatioMinus = new ModernButton();
            btnRatioMinus.Text = "-";
            btnRatioMinus.Size = new Size(28, 24);
            btnRatioMinus.Location = new Point(190, 3);
            btnRatioMinus.Click += new EventHandler(btnRatioMinus_Click);

            cbHeaderRatio = new ModernDropdown();
            cbHeaderRatio.Size = new Size(202, 24);
            cbHeaderRatio.Location = new Point(222, 3);
            foreach (int step in RatioSteps)
            {
                string label = string.Format("Left {0}% | Right {1}%", step, 100 - step);
                if (step == 70) label += " (Default)";
                else if (step == 50) label += " (Equal)";
                cbHeaderRatio.Items.Add(label);
            }
            cbHeaderRatio.SelectedIndex = 11; // 70% is index 11
            cbHeaderRatio.SelectedIndexChanged += new EventHandler(cbHeaderRatio_SelectedIndexChanged);

            btnRatioPlus = new ModernButton();
            btnRatioPlus.Text = "+";
            btnRatioPlus.Size = new Size(28, 24);
            btnRatioPlus.Location = new Point(428, 3);
            btnRatioPlus.Click += new EventHandler(btnRatioPlus_Click);

            headerTip.SetToolTip(cbHeaderRatio, "Header Width Ratio:\nAdjust column split between Chapter title (Left) and Translator attribution (Right) in 5% increments.");
            headerTip.SetToolTip(btnRatioMinus, "Decrease Left Header width by 5%");
            headerTip.SetToolTip(btnRatioPlus, "Increase Left Header width by 5%");

            pnlRatioRow.Controls.Add(lblRatioTitle);
            pnlRatioRow.Controls.Add(btnRatioMinus);
            pnlRatioRow.Controls.Add(cbHeaderRatio);
            pnlRatioRow.Controls.Add(btnRatioPlus);

            pnlHeaderCard.Controls.Add(pnlH_Left);
            pnlHeaderCard.Controls.Add(pnlH_Right);
            pnlHeaderCard.Controls.Add(pnlRatioRow);
        }

        private void RelayoutHeaderCard()
        {
            if (pnlHeaderCard == null) return;
            int totalWidth = pnlHeaderCard.ClientSize.Width;
            int half = (totalWidth - 28) / 2;
            if (half < 140) half = 140;

            pnlH_Left.Location = new Point(8, 4);
            pnlH_Left.Size = new Size(half, 72);

            txtH_L1.Width = half - 56;
            txtH_L2.Width = half - 56;

            pnlH_Right.Location = new Point(half + 16, 4);
            pnlH_Right.Size = new Size(half, 72);

            txtH_R1.Width = half - 56;
            txtH_R2.Width = half - 56;

            if (pnlRatioRow != null)
            {
                pnlRatioRow.Location = new Point(8, 78);
                pnlRatioRow.Size = new Size(Math.Max(460, totalWidth - 16), 32);
            }
        }

        private void RelayoutRightHeader()
        {
            if (pnlRightHeader == null || cbPreviewPaperSize == null) return;
            int right = pnlRightHeader.ClientSize.Width - 12;
            cbPreviewPaperSize.Location = new Point(Math.Max(120, right - cbPreviewPaperSize.Width), 4);
            if (lblPaperSize != null)
            {
                lblPaperSize.Location = new Point(cbPreviewPaperSize.Left - lblPaperSize.PreferredWidth - 6, 8);
            }
        }

        private void SetPaperSizeSelection(string size)
        {
            currentPaperSize = PaperProfiles.Find(size).Key;
            PaperProfiles.SetSelectedKey(cbPreviewPaperSize, currentPaperSize);
        }

        private void cbPreviewPaperSize_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (cbPreviewPaperSize == null || cbPreviewPaperSize.SelectedItem == null) return;
            currentPaperSize = PaperProfiles.GetSelectedKey(cbPreviewPaperSize);

            if (!isSuppressingEvents)
            {
                UpdatePreview();
            }
        }

        private void btnRatioMinus_Click(object sender, EventArgs e)
        {
            if (cbHeaderRatio != null && cbHeaderRatio.SelectedIndex > 0)
            {
                cbHeaderRatio.SelectedIndex--;
            }
        }

        private void btnRatioPlus_Click(object sender, EventArgs e)
        {
            if (cbHeaderRatio != null && cbHeaderRatio.SelectedIndex < RatioSteps.Length - 1)
            {
                cbHeaderRatio.SelectedIndex++;
            }
        }

        private void cbHeaderRatio_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (!isSuppressingEvents)
            {
                UpdatePreview();
            }
        }

        private int GetCurrentSplitRatio()
        {
            int idx = cbHeaderRatio != null ? cbHeaderRatio.SelectedIndex : -1;
            if (idx >= 0 && idx < RatioSteps.Length)
            {
                return RatioSteps[idx];
            }
            return 70;
        }

        private void SetSplitRatio(int leftPercent)
        {
            int bestIdx = 11; // 70% is default
            int minDiff = 999;
            for (int i = 0; i < RatioSteps.Length; i++)
            {
                int diff = Math.Abs(RatioSteps[i] - leftPercent);
                if (diff < minDiff)
                {
                    minDiff = diff;
                    bestIdx = i;
                }
            }
            if (cbHeaderRatio != null)
            {
                cbHeaderRatio.SelectedIndex = bestIdx;
            }
        }

        private void SetupTimer()
        {
            debounceTimer = new Timer();
            debounceTimer.Interval = 160;
            debounceTimer.Tick += new EventHandler((s, e) =>
            {
                debounceTimer.Stop();
                UpdatePreview();
            });
        }

        private void ApplyTheme()
        {
            ThemeTokens t = ThemeTokens.Current;

            this.BackColor = t.BgPrimary;
            this.ForeColor = t.TextPrimary;

            pnlHeader.BackColor = t.BgSecondary;
            lblFileSelect.ForeColor = t.TextSecondary;
            lblStatus.ForeColor = t.Success;

            pnlLeftTopHeader.BackColor = t.BgTertiary;
            lblLeftTitle.ForeColor = t.AccentPrimary;

            pnlHeaderCard.BackColor = t.BgSecondary;
            pnlH_Left.BackColor = t.BgSecondary;
            pnlH_Right.BackColor = t.BgSecondary;

            lblH_LeftGroup.ForeColor = t.AccentPrimary;
            lblH_RightGroup.ForeColor = t.AccentPrimary;
            lblH_L1_Title.ForeColor = t.TextSecondary;
            lblH_L2_Title.ForeColor = t.TextSecondary;
            lblH_R1_Title.ForeColor = t.TextSecondary;
            lblH_R2_Title.ForeColor = t.TextSecondary;

            txtH_L1.BackColor = t.BgPrimary;
            txtH_L1.ForeColor = t.TextPrimary;
            txtH_L1.BorderColor = t.BorderColor;
            txtH_L2.BackColor = t.BgPrimary;
            txtH_L2.ForeColor = t.TextPrimary;
            txtH_L2.BorderColor = t.BorderColor;
            txtH_R1.BackColor = t.BgPrimary;
            txtH_R1.ForeColor = t.TextPrimary;
            txtH_R1.BorderColor = t.BorderColor;
            txtH_R2.BackColor = t.BgPrimary;
            txtH_R2.ForeColor = t.TextPrimary;
            txtH_R2.BorderColor = t.BorderColor;

            pnlNoteHeader.BackColor = t.BgTertiary;
            lblNoteTitle.ForeColor = t.AccentPrimary;

            txtMarkdown.BackColor = t.BgPrimary;
            txtMarkdown.ForeColor = t.TextPrimary;
            txtMarkdown.SelectAll();
            txtMarkdown.SelectionColor = t.TextPrimary;
            txtMarkdown.Select(0, 0);

            if (pnlMarkdownContainer != null) pnlMarkdownContainer.BackColor = t.BgPrimary;
            if (scrollBarMarkdown != null) scrollBarMarkdown.ApplyTheme(t);

            pnlRightHeader.BackColor = t.BgTertiary;
            lblRightTitle.ForeColor = t.AccentPrimary;

            splitEditor.BackColor = t.BorderColor;
            splitEditor.Panel1.BackColor = t.BgPrimary;
            splitEditor.Panel2.BackColor = t.BgTertiary;

            btnResetTemplate.Invalidate();
            btnSave.Invalidate();
            btnClose.Invalidate();
            cbTargetFile.Invalidate();
            btnCollapseHeader.Invalidate();

            if (pnlRatioRow != null) pnlRatioRow.BackColor = t.BgSecondary;
            if (lblRatioTitle != null) lblRatioTitle.ForeColor = t.TextPrimary;
            if (btnRatioMinus != null) btnRatioMinus.Invalidate();
            if (cbHeaderRatio != null) cbHeaderRatio.Invalidate();
            if (btnRatioPlus != null) btnRatioPlus.Invalidate();

            if (lblPaperSize != null) lblPaperSize.ForeColor = t.TextSecondary;
            if (cbPreviewPaperSize != null) cbPreviewPaperSize.Invalidate();
        }

        private void btnCollapseHeader_Click(object sender, EventArgs e)
        {
            pnlHeaderCard.Visible = !pnlHeaderCard.Visible;
            btnCollapseHeader.Text = pnlHeaderCard.Visible ? "[-] Hide Header" : "[+] Show Header";
        }

        private void SetupMarkdownScrollbar()
        {
            if (scrollBarMarkdown == null || txtMarkdown == null) return;

            scrollBarMarkdown.ValueChanged += (val) =>
            {
                if (isSyncingMarkdownScroll || !txtMarkdown.IsHandleCreated) return;
                isSyncingMarkdownScroll = true;
                try
                {
                    int first = (int)SendMessage(txtMarkdown.Handle, EM_GETFIRSTVISIBLELINE, IntPtr.Zero, IntPtr.Zero);
                    int delta = val - first;
                    if (delta != 0)
                    {
                        SendMessage(txtMarkdown.Handle, EM_LINESCROLL, IntPtr.Zero, (IntPtr)delta);
                    }
                }
                finally
                {
                    isSyncingMarkdownScroll = false;
                }
            };

            txtMarkdown.MouseWheel += (s, e) =>
            {
                if (scrollBarMarkdown.Visible)
                {
                    scrollBarMarkdown.DoMouseWheel(e.Delta);
                }
            };

            txtMarkdown.SelectionChanged += (s, e) =>
            {
                txtMarkdown.SelectionColor = ThemeTokens.Current.TextPrimary;
                SyncMarkdownScrollbar();
            };
            txtMarkdown.TextChanged += (s, e) => SyncMarkdownScrollbar();
            txtMarkdown.Resize += (s, e) => SyncMarkdownScrollbar();
        }

        private void SyncMarkdownScrollbar()
        {
            if (isSyncingMarkdownScroll || !txtMarkdown.IsHandleCreated || scrollBarMarkdown == null) return;
            isSyncingMarkdownScroll = true;
            try
            {
                int total = (int)SendMessage(txtMarkdown.Handle, EM_GETLINECOUNT, IntPtr.Zero, IntPtr.Zero);
                int lineH = Math.Max(14, txtMarkdown.Font.Height);
                int visible = Math.Max(1, txtMarkdown.ClientSize.Height / lineH);

                if (total > visible)
                {
                    scrollBarMarkdown.Visible = true;
                    scrollBarMarkdown.Minimum = 0;
                    scrollBarMarkdown.Maximum = total;
                    scrollBarMarkdown.LargeChange = visible;
                    scrollBarMarkdown.SmallChange = 3;

                    int first = (int)SendMessage(txtMarkdown.Handle, EM_GETFIRSTVISIBLELINE, IntPtr.Zero, IntPtr.Zero);
                    scrollBarMarkdown.Value = Math.Min(first, scrollBarMarkdown.MaxScrollValue);
                }
                else
                {
                    scrollBarMarkdown.Visible = false;
                }
            }
            finally
            {
                isSyncingMarkdownScroll = false;
            }
        }

        private void cbTargetFile_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (isSuppressingEvents) return;
            if (cbTargetFile.SelectedItem == null) return;

            string selected = cbTargetFile.SelectedItem.ToString();
            LoadSelectedDocument(selected);
        }

        private void LoadSelectedDocument(string selection)
        {
            this.currentDocSelection = NormalizeSelection(selection);
            bool isVietnamese = currentDocSelection.Equals("Translated", StringComparison.OrdinalIgnoreCase);

            string headerFileName = isVietnamese ? "_HEADER-translated.md" : "_HEADER-original.md";
            string noteFileName = isVietnamese ? "_TRANSLATOR_NOTE_translated.md" : "_TRANSLATOR_NOTE_original.md";

            // Load Header file into slots
            string headerContent = LoadFileOrTemplate(headerFileName);
            string[] hLines = (headerContent ?? "").Split(new string[] { "\r\n", "\n" }, StringSplitOptions.None);

            isSuppressingEvents = true;
            txtH_L1.Text = hLines.Length > 0 ? hLines[0] : "";
            txtH_L2.Text = hLines.Length > 1 ? hLines[1] : "";
            txtH_R1.Text = hLines.Length > 2 ? hLines[2] : "";
            txtH_R2.Text = hLines.Length > 3 ? hLines[3] : "";

            int loadedRatio = 70;
            for (int i = 4; i < hLines.Length; i++)
            {
                string line = hLines[i].Trim();
                if (!string.IsNullOrEmpty(line))
                {
                    Match m = Regex.Match(line, @"\d+");
                    if (m.Success)
                    {
                        int val;
                        if (int.TryParse(m.Value, out val) && val >= 10 && val <= 90)
                        {
                            loadedRatio = val;
                            break;
                        }
                    }
                }
            }
            SetSplitRatio(loadedRatio);

            // Load Note file into Markdown editor
            string noteContent = LoadFileOrTemplate(noteFileName);
            SetMarkdownText(noteContent);
            isSuppressingEvents = false;

            SyncMarkdownScrollbar();
            SetStatus(string.Format("Loaded {0} successfully.", selection), false);
            UpdatePreview();
        }

        private void SetMarkdownText(string text)
        {
            txtMarkdown.Text = text ?? "";
            txtMarkdown.ForeColor = ThemeTokens.Current.TextPrimary;
            txtMarkdown.SelectAll();
            txtMarkdown.SelectionColor = ThemeTokens.Current.TextPrimary;
            txtMarkdown.Select(0, 0);
        }

        private string LoadFileOrTemplate(string fileName)
        {
            string projectFilePath = !string.IsNullOrEmpty(bookDir) ? Path.Combine(bookDir, fileName) : "";
            if (!string.IsNullOrEmpty(projectFilePath) && File.Exists(projectFilePath))
            {
                try
                {
                    return File.ReadAllText(projectFilePath, Encoding.UTF8);
                }
                catch { }
            }

            string tmpl = FindTemplatePath(fileName);
            if (File.Exists(tmpl))
            {
                try
                {
                    return File.ReadAllText(tmpl, Encoding.UTF8);
                }
                catch { }
            }

            return "";
        }

        private string FindTemplatePath(string fileName)
        {
            string asmDir = "";
            try { asmDir = Path.GetDirectoryName(typeof(FrontMatterEditorForm).Assembly.Location); } catch { }

            System.Collections.Generic.List<string> probePaths = new System.Collections.Generic.List<string>();
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            if (!string.IsNullOrEmpty(asmDir))
            {
                probePaths.Add(Path.Combine(asmDir, "src_Book Forge by Max", "Templates", fileName));
                probePaths.Add(Path.Combine(asmDir, "src_BookForge", "Templates", fileName));
                probePaths.Add(Path.Combine(asmDir, "Templates", fileName));
            }

            probePaths.Add(Path.Combine(baseDir, "src_Book Forge by Max", "Templates", fileName));
            probePaths.Add(Path.Combine(baseDir, "src_BookForge", "Templates", fileName));
            probePaths.Add(Path.Combine(baseDir, "Templates", fileName));
            probePaths.Add(Path.Combine("src_Book Forge by Max", "Templates", fileName));
            probePaths.Add(Path.Combine("src_BookForge", "Templates", fileName));
            probePaths.Add(Path.Combine("Templates", fileName));

            try
            {
                string[] srcDirs = Directory.GetDirectories(baseDir, "src_*");
                foreach (string sDir in srcDirs)
                {
                    probePaths.Add(Path.Combine(sDir, "Templates", fileName));
                }
            }
            catch { }

            foreach (string p in probePaths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }
            return "";
        }

        private void HeaderInput_TextChanged(object sender, EventArgs e)
        {
            if (isSuppressingEvents) return;
            if (debounceTimer != null)
            {
                debounceTimer.Stop();
                debounceTimer.Start();
            }
        }

        private void txtMarkdown_TextChanged(object sender, EventArgs e)
        {
            if (isSuppressingEvents) return;
            if (debounceTimer != null)
            {
                debounceTimer.Stop();
                debounceTimer.Start();
            }
        }

        private void btnResetTemplate_Click(object sender, EventArgs e)
        {
            DialogResult dr = MessageBox.Show(
                string.Format("Reset settings for \"{0}\" to default templates?\nAny unsaved edits will be replaced.", currentDocSelection),
                "Reset Confirmation",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (dr != DialogResult.Yes) return;

            bool isVietnamese = currentDocSelection.Equals("Translated", StringComparison.OrdinalIgnoreCase);
            string hFile = isVietnamese ? "_HEADER-translated.md" : "_HEADER-original.md";
            string nFile = isVietnamese ? "_TRANSLATOR_NOTE_translated.md" : "_TRANSLATOR_NOTE_original.md";

            string hPath = FindTemplatePath(hFile);
            string nPath = FindTemplatePath(nFile);

            isSuppressingEvents = true;
            if (File.Exists(hPath))
            {
                string[] lines = File.ReadAllText(hPath, Encoding.UTF8).Split(new string[] { "\r\n", "\n" }, StringSplitOptions.None);
                txtH_L1.Text = lines.Length > 0 ? lines[0] : "";
                txtH_L2.Text = lines.Length > 1 ? lines[1] : "";
                txtH_R1.Text = lines.Length > 2 ? lines[2] : "";
                txtH_R2.Text = lines.Length > 3 ? lines[3] : "";

                int loadedRatio = 70;
                for (int i = 4; i < lines.Length; i++)
                {
                    string line = lines[i].Trim();
                    if (!string.IsNullOrEmpty(line))
                    {
                        Match m = Regex.Match(line, @"\d+");
                        if (m.Success)
                        {
                            int val;
                            if (int.TryParse(m.Value, out val) && val >= 10 && val <= 90)
                            {
                                loadedRatio = val;
                                break;
                            }
                        }
                    }
                }
                SetSplitRatio(loadedRatio);
            }
            if (File.Exists(nPath))
            {
                SetMarkdownText(File.ReadAllText(nPath, Encoding.UTF8));
            }
            isSuppressingEvents = false;

            SyncMarkdownScrollbar();
            UpdatePreview();
            SetStatus("Reset to default templates.", false);
        }

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(bookDir) || !Directory.Exists(bookDir))
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Select target book project folder to save:";
                    if (fbd.ShowDialog(this) == DialogResult.OK)
                    {
                        bookDir = fbd.SelectedPath;
                    }
                    else
                    {
                        return;
                    }
                }
            }

            try
            {
                bool isVietnamese = currentDocSelection.Equals("Translated", StringComparison.OrdinalIgnoreCase);
                string hFile = isVietnamese ? "_HEADER-translated.md" : "_HEADER-original.md";
                string nFile = isVietnamese ? "_TRANSLATOR_NOTE_translated.md" : "_TRANSLATOR_NOTE_original.md";

                // 1. Save Header file
                string hTarget = Path.Combine(bookDir, hFile);
                int splitRatio = GetCurrentSplitRatio();
                string hContent = string.Format("{0}\r\n{1}\r\n{2}\r\n{3}\r\n{4}% / {5}%",
                    txtH_L1.Text, txtH_L2.Text, txtH_R1.Text, txtH_R2.Text, splitRatio, 100 - splitRatio);
                File.WriteAllText(hTarget, hContent, Encoding.UTF8);

                // 2. Save Note file
                string nTarget = Path.Combine(bookDir, nFile);
                File.WriteAllText(nTarget, txtMarkdown.Text, Encoding.UTF8);

                SetStatus(string.Format("Saved {0} & {1} to project folder.", hFile, nFile), false);
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Failed to save files: {0}", ex.Message), "Save Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                SetStatus("Save failed.", true);
            }
        }

        private void SetStatus(string message, bool isError)
        {
            if (lblStatus == null) return;
            lblStatus.Text = message;
            lblStatus.ForeColor = isError ? ThemeTokens.Current.Danger : ThemeTokens.Current.Success;
        }

        private void UpdatePreview()
        {
            if (browserPreview == null) return;
            string html = RenderUnifiedPageSimulationHtml();
            browserPreview.DocumentText = html;
        }

        /// <summary>
        /// Renders unified A5 book page simulation:
        /// Top margin features the Running Header bar (Left 2 lines, Right 2 lines, and Divider line),
        /// followed by the formatted Translator Note page body.
        /// </summary>
        private string RenderUnifiedPageSimulationHtml()
        {
            string l1 = txtH_L1 != null ? txtH_L1.Text.Trim() : "";
            string l2 = txtH_L2 != null ? txtH_L2.Text.Trim() : "";
            string r1 = txtH_R1 != null ? txtH_R1.Text.Trim() : "";
            string r2 = txtH_R2 != null ? txtH_R2.Text.Trim() : "";

            string noteMd = txtMarkdown != null ? txtMarkdown.Text : "";
            bool isVietnamese = currentDocSelection.Equals("Translated", StringComparison.OrdinalIgnoreCase);
            int splitLeft = GetCurrentSplitRatio();
            int splitRight = 100 - splitLeft;

            PaperProfileInfo pInfo = PaperProfiles.Find(currentPaperSize);
            int paperMaxWidth = pInfo.MaxWidthPx;
            int paperMinHeight = pInfo.MinHeightPx;
            string paperPadding = pInfo.Padding;
            string paperFontSize = pInfo.FontSize;

            // 1. Build Left Header Slot
            string leftHtml = "";
            if (string.IsNullOrEmpty(l1) && string.IsNullOrEmpty(l2))
            {
                // Dynamic fallback: extract H1 title from note if available, else standard section name
                string detectedTitle = ExtractH1TitleFromMarkdown(noteMd);
                if (string.IsNullOrEmpty(detectedTitle))
                {
                    detectedTitle = isVietnamese ? "LỜI NGƯỜI CHUYỂN NGỮ" : "TRANSLATOR'S NOTE";
                }
                leftHtml = string.Format("<div style=\"color: #1e40af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 13px;\">{0}</div>", detectedTitle);
            }
            else
            {
                StringBuilder sbL = new StringBuilder();
                if (!string.IsNullOrEmpty(l1))
                {
                    sbL.Append(string.Format("<div style=\"color: #1e40af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 13px;\">{0}</div>", FormatInline(l1)));
                }
                if (!string.IsNullOrEmpty(l2))
                {
                    sbL.Append(string.Format("<div style=\"color: #4b5563; font-size: 11px; margin-top: 2px;\">{0}</div>", FormatInline(l2)));
                }
                leftHtml = sbL.ToString();
            }

            // 2. Build Right Header Slot
            string rightHtml = "";
            if (string.IsNullOrEmpty(r1) && string.IsNullOrEmpty(r2))
            {
                string defaultR1 = isVietnamese ? "Chuyển ngữ:" : "Converter:";
                string defaultR2 = "Trần Thắng Minh";
                rightHtml = string.Format("<div style=\"color: #4b5563; font-size: 11px; margin-bottom: 2px;\">{0}</div><div style=\"color: #111827; font-weight: 700; font-size: 13.5px;\">{1}</div>", defaultR1, defaultR2);
            }
            else
            {
                StringBuilder sbR = new StringBuilder();
                if (!string.IsNullOrEmpty(r1))
                {
                    sbR.Append(string.Format("<div style=\"color: #4b5563; font-size: 11px; margin-bottom: 2px;\">{0}</div>", FormatInline(r1)));
                }
                if (!string.IsNullOrEmpty(r2))
                {
                    sbR.Append(string.Format("<div style=\"color: #111827; font-weight: 700; font-size: 13.5px;\">{0}</div>", FormatInline(r2)));
                }
                rightHtml = sbR.ToString();
            }

            // 3. Render Translator Note Body HTML
            string renderedNoteBody = RenderMarkdownBodyHtml(noteMd, bookDir);

            // 4. Construct complete HTML document
            StringBuilder html = new StringBuilder();
            html.AppendLine("<!DOCTYPE html>");
            html.AppendLine("<html>");
            html.AppendLine("<head>");
            html.AppendLine("  <meta charset=\"utf-8\" />");
            html.AppendLine("  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />");
            html.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
            html.AppendLine("  <style>");
            html.AppendLine("    * { box-sizing: border-box; }");
            html.AppendLine("    ::-webkit-scrollbar { width: 8px; height: 8px; }");
            html.AppendLine("    ::-webkit-scrollbar-track { background: #191919; }");
            html.AppendLine("    ::-webkit-scrollbar-thumb { background: #343434; border-radius: 4px; }");
            html.AppendLine("    ::-webkit-scrollbar-thumb:hover { background: #464646; }");
            html.AppendLine("    html, body {");
            html.AppendLine("      margin: 0; padding: 0;");
            html.AppendLine("      width: 100%;");
            html.AppendLine("      overflow-x: hidden;");
            html.AppendLine("      background-color: #242428;");
            html.AppendLine("      scrollbar-face-color: #343434;");
            html.AppendLine("      scrollbar-track-color: #191919;");
            html.AppendLine("      scrollbar-arrow-color: #343434;");
            html.AppendLine("      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;");
            html.AppendLine("    }");
            html.AppendLine("    .page-wrapper {");
            html.AppendLine("      padding: 24px 16px 40px 16px;");
            html.AppendLine("      text-align: center;");
            html.AppendLine("    }");
            html.AppendLine("    .simulation-badge {");
            html.AppendLine("      display: inline-block;");
            html.AppendLine("      background: #38383e;");
            html.AppendLine("      color: #38bdf8;");
            html.AppendLine("      font-size: 11px;");
            html.AppendLine("      font-weight: 600;");
            html.AppendLine("      padding: 4px 14px;");
            html.AppendLine("      border-radius: 12px;");
            html.AppendLine("      margin-bottom: 14px;");
            html.AppendLine("      letter-spacing: 0.04em;");
            html.AppendLine("    }");
            html.AppendLine("    .a5-paper {");
            html.AppendLine("      background-color: #ffffff;");
            html.AppendLine("      width: 100%;");
            html.AppendLine("      max-width: " + paperMaxWidth + "px;");
            html.AppendLine("      margin: 0 auto;");
            html.AppendLine("      text-align: left;");
            html.AppendLine("      box-sizing: border-box;");
            html.AppendLine("      min-height: " + paperMinHeight + "px;");
            html.AppendLine("      padding: " + paperPadding + ";");
            html.AppendLine("      box-shadow: 0 6px 24px rgba(0,0,0,0.45);");
            html.AppendLine("      border-radius: 2px;");
            html.AppendLine("      color: #1a1a1a;");
            html.AppendLine("      font-family: 'Lora', 'Georgia', 'Times New Roman', serif;");
            html.AppendLine("      font-size: " + paperFontSize + ";");
            html.AppendLine("      line-height: 1.62;");
            html.AppendLine("    }");
            html.AppendLine("    /* ── Running Header (In Green Oval Zone) ── */");
            html.AppendLine("    .running-header-zone {");
            html.AppendLine("      width: 100%;");
            html.AppendLine("      margin-bottom: 24px;");
            html.AppendLine("    }");
            html.AppendLine("    .header-bar {");
            html.AppendLine("      display: table;");
            html.AppendLine("      width: 100%;");
            html.AppendLine("      table-layout: fixed;");
            html.AppendLine("      padding-bottom: 8px;");
            html.AppendLine("      border-bottom: 1px solid #d0d0d0;");
            html.AppendLine("    }");
            html.AppendLine("    .header-left {");
            html.AppendLine("      display: table-cell;");
            html.AppendLine("      width: " + splitLeft + "%;");
            html.AppendLine("      text-align: left;");
            html.AppendLine("      vertical-align: bottom;");
            html.AppendLine("      padding-right: 12px;");
            html.AppendLine("    }");
            html.AppendLine("    .header-right {");
            html.AppendLine("      display: table-cell;");
            html.AppendLine("      width: " + splitRight + "%;");
            html.AppendLine("      text-align: right;");
            html.AppendLine("      vertical-align: bottom;");
            html.AppendLine("      padding-left: 12px;");
            html.AppendLine("    }");
            html.AppendLine("    /* ── Note Content Typography ── */");
            html.AppendLine("    .note-content h1 {");
            html.AppendLine("      font-size: 20px;");
            html.AppendLine("      font-weight: 700;");
            html.AppendLine("      text-align: center;");
            html.AppendLine("      text-transform: uppercase;");
            html.AppendLine("      letter-spacing: 0.06em;");
            html.AppendLine("      margin-top: 10px;");
            html.AppendLine("      margin-bottom: 22px;");
            html.AppendLine("      color: #111111;");
            html.AppendLine("    }");
            html.AppendLine("    .note-content h2 { font-size: 17px; text-align: center; margin-top: 18px; margin-bottom: 10px; }");
            html.AppendLine("    .note-content h3 { font-size: 15px; text-align: center; margin-top: 14px; margin-bottom: 8px; }");
            html.AppendLine("    .note-content p { margin-top: 0; margin-bottom: 12px; text-align: justify; text-justify: inter-word; line-height: 1.62; }");
            html.AppendLine("    .note-content blockquote {");
            html.AppendLine("      margin: 14px 0;");
            html.AppendLine("      padding: 10px 16px;");
            html.AppendLine("      border-left: 3px solid #888888;");
            html.AppendLine("      background-color: #f7f8f9;");
            html.AppendLine("      font-style: italic;");
            html.AppendLine("    }");
            html.AppendLine("    .note-content blockquote p { margin-bottom: 4px; }");
            html.AppendLine("    .note-content ul { margin: 8px 0 14px 20px; padding: 0; }");
            html.AppendLine("    .note-content li { margin-bottom: 4px; }");
            html.AppendLine("    .note-content hr { border: 0; border-top: 1px solid #e0e0e0; margin: 18px 0; }");
            html.AppendLine("    a { color: #0284c7; text-decoration: none; }");
            html.AppendLine("    a:hover { text-decoration: underline; }");
            html.AppendLine("    /* ── Alignment Rules (Right, Center, Left) ── */");
            html.AppendLine("    div[align=\"right\"], div[align=\"right\"] *,");
            html.AppendLine("    div[style*=\"text-align: right\"], div[style*=\"text-align:right\"],");
            html.AppendLine("    div[style*=\"text-align: right\"] *, div[style*=\"text-align:right\"] *,");
            html.AppendLine("    p[align=\"right\"], p[align=\"right\"] *,");
            html.AppendLine("    p[style*=\"text-align: right\"], p[style*=\"text-align:right\"],");
            html.AppendLine("    p[style*=\"text-align: right\"] *, p[style*=\"text-align:right\"] *,");
            html.AppendLine("    .text-right, .text-right * {");
            html.AppendLine("      text-align: right !important;");
            html.AppendLine("    }");
            html.AppendLine("    div[align=\"center\"], div[align=\"center\"] *,");
            html.AppendLine("    div[style*=\"text-align: center\"], div[style*=\"text-align:center\"],");
            html.AppendLine("    div[style*=\"text-align: center\"] *, div[style*=\"text-align:center\"] *,");
            html.AppendLine("    center, center *,");
            html.AppendLine("    p[align=\"center\"], p[align=\"center\"] *,");
            html.AppendLine("    p[style*=\"text-align: center\"], p[style*=\"text-align:center\"],");
            html.AppendLine("    p[style*=\"text-align: center\"] *, p[style*=\"text-align:center\"] *,");
            html.AppendLine("    .text-center, .text-center * {");
            html.AppendLine("      text-align: center !important;");
            html.AppendLine("    }");
            html.AppendLine("    div[align=\"left\"], div[align=\"left\"] *,");
            html.AppendLine("    div[style*=\"text-align: left\"], div[style*=\"text-align:left\"],");
            html.AppendLine("    div[style*=\"text-align: left\"] *, div[style*=\"text-align:left\"] *,");
            html.AppendLine("    p[align=\"left\"], p[align=\"left\"] *,");
            html.AppendLine("    p[style*=\"text-align: left\"], p[style*=\"text-align:left\"],");
            html.AppendLine("    p[style*=\"text-align: left\"] *, p[style*=\"text-align:left\"] *,");
            html.AppendLine("    .text-left, .text-left * {");
            html.AppendLine("      text-align: left !important;");
            html.AppendLine("    }");
            html.AppendLine("    div[align=\"center\"] img,");
            html.AppendLine("    div[style*=\"text-align: center\"] img,");
            html.AppendLine("    div[style*=\"text-align:center\"] img,");
            html.AppendLine("    center img,");
            html.AppendLine("    p[align=\"center\"] img,");
            html.AppendLine("    p[style*=\"text-align: center\"] img,");
            html.AppendLine("    p[style*=\"text-align:center\"] img {");
            html.AppendLine("      display: inline-block !important;");
            html.AppendLine("      margin: 0 auto !important;");
            html.AppendLine("    }");
            html.AppendLine("    div[align=\"right\"] img,");
            html.AppendLine("    div[style*=\"text-align: right\"] img,");
            html.AppendLine("    div[style*=\"text-align:right\"] img,");
            html.AppendLine("    p[align=\"right\"] img,");
            html.AppendLine("    p[style*=\"text-align: right\"] img,");
            html.AppendLine("    p[style*=\"text-align:right\"] img {");
            html.AppendLine("      display: inline-block !important;");
            html.AppendLine("      margin-left: auto !important;");
            html.AppendLine("      margin-right: 0 !important;");
            html.AppendLine("    }");
            html.AppendLine("    img { max-width: 100%; height: auto; display: inline-block; vertical-align: middle; }");
            html.AppendLine("  </style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("  <div class=\"page-wrapper\">");
            html.AppendLine("    <div class=\"simulation-badge\">LIVE " + currentPaperSize + " BOOK PAGE PREVIEW (RUNNING HEADER + TRANSLATOR NOTE)</div>");
            html.AppendLine("    <div class=\"a5-paper\">");
            html.AppendLine("      <!-- 1. Running Header in Top Zone -->");
            html.AppendLine("      <div class=\"running-header-zone\">");
            html.AppendLine("        <div class=\"header-bar\">");
            html.AppendLine("          <div class=\"header-left\">" + leftHtml + "</div>");
            html.AppendLine("          <div class=\"header-right\">" + rightHtml + "</div>");
            html.AppendLine("        </div>");
            html.AppendLine("      </div>");
            html.AppendLine("      <!-- 2. Translator Note Content -->");
            html.AppendLine("      <div class=\"note-content\">");
            html.AppendLine(renderedNoteBody);
            html.AppendLine("      </div>");
            html.AppendLine("    </div>");
            html.AppendLine("  </div>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

        private string ExtractH1TitleFromMarkdown(string md)
        {
            if (string.IsNullOrEmpty(md)) return "";
            Match m = Regex.Match(md, @"^#\s+(.+)$", RegexOptions.Multiline);
            if (m.Success)
            {
                return m.Groups[1].Value.Trim();
            }
            return "";
        }

        private string RenderMarkdownBodyHtml(string markdown, string baseDir)
        {
            if (string.IsNullOrEmpty(markdown))
            {
                return "<p><em>(Empty document)</em></p>";
            }

            string processed = ResolveImageSources(markdown, baseDir);
            string[] lines = processed.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.None);
            StringBuilder sb = new StringBuilder();

            bool inList = false;
            bool inBlockquote = false;
            int htmlBlockDepth = 0;

            for (int i = 0; i < lines.Length; i++)
            {
                string rawLine = lines[i];
                string trimmed = rawLine.Trim();

                // Empty line
                if (string.IsNullOrEmpty(trimmed))
                {
                    if (inList) { sb.AppendLine("</ul>"); inList = false; }
                    if (inBlockquote) { sb.AppendLine("</blockquote>"); inBlockquote = false; }
                    continue;
                }

                // Check HTML block tags
                bool isHtmlOpen = trimmed.StartsWith("<div", StringComparison.OrdinalIgnoreCase) ||
                                  trimmed.StartsWith("<center", StringComparison.OrdinalIgnoreCase) ||
                                  trimmed.StartsWith("<table", StringComparison.OrdinalIgnoreCase) ||
                                  trimmed.StartsWith("<figure", StringComparison.OrdinalIgnoreCase);

                bool isHtmlClose = trimmed.StartsWith("</div>", StringComparison.OrdinalIgnoreCase) ||
                                   trimmed.StartsWith("</center>", StringComparison.OrdinalIgnoreCase) ||
                                   trimmed.StartsWith("</table>", StringComparison.OrdinalIgnoreCase) ||
                                   trimmed.StartsWith("</figure>", StringComparison.OrdinalIgnoreCase);

                if (isHtmlOpen)
                {
                    if (inList) { sb.AppendLine("</ul>"); inList = false; }
                    if (inBlockquote) { sb.AppendLine("</blockquote>"); inBlockquote = false; }
                    htmlBlockDepth++;
                    sb.AppendLine(FormatInline(rawLine));
                    continue;
                }

                if (isHtmlClose)
                {
                    htmlBlockDepth = Math.Max(0, htmlBlockDepth - 1);
                    sb.AppendLine(FormatInline(rawLine));
                    continue;
                }

                // If inside an HTML block container, render directly without wrapping in <p>
                if (htmlBlockDepth > 0)
                {
                    sb.AppendLine(FormatInline(rawLine));
                    continue;
                }

                // List items
                if (trimmed.StartsWith("* ") || trimmed.StartsWith("- "))
                {
                    if (!inList)
                    {
                        sb.AppendLine("<ul>");
                        inList = true;
                    }
                    string itemText = trimmed.Substring(2);
                    sb.AppendLine(string.Format("  <li>{0}</li>", FormatInline(itemText)));
                    continue;
                }
                else if (inList)
                {
                    sb.AppendLine("</ul>");
                    inList = false;
                }

                // Blockquote items
                if (trimmed.StartsWith("> "))
                {
                    if (!inBlockquote)
                    {
                        sb.AppendLine("<blockquote>");
                        inBlockquote = true;
                    }
                    string qText = trimmed.Substring(2);
                    sb.AppendLine(string.Format("  <p>{0}</p>", FormatInline(qText)));
                    continue;
                }
                else if (inBlockquote)
                {
                    sb.AppendLine("</blockquote>");
                    inBlockquote = false;
                }

                // Headings
                if (trimmed.StartsWith("###### ")) { sb.AppendLine(string.Format("<h6>{0}</h6>", FormatInline(trimmed.Substring(7)))); continue; }
                if (trimmed.StartsWith("##### ")) { sb.AppendLine(string.Format("<h5>{0}</h5>", FormatInline(trimmed.Substring(6)))); continue; }
                if (trimmed.StartsWith("#### ")) { sb.AppendLine(string.Format("<h4>{0}</h4>", FormatInline(trimmed.Substring(5)))); continue; }
                if (trimmed.StartsWith("### ")) { sb.AppendLine(string.Format("<h3>{0}</h3>", FormatInline(trimmed.Substring(4)))); continue; }
                if (trimmed.StartsWith("## ")) { sb.AppendLine(string.Format("<h2>{0}</h2>", FormatInline(trimmed.Substring(3)))); continue; }
                if (trimmed.StartsWith("# ")) { sb.AppendLine(string.Format("<h1>{0}</h1>", FormatInline(trimmed.Substring(2)))); continue; }

                // Horizontal Rule
                if (trimmed == "---" || trimmed == "***" || trimmed == "___")
                {
                    sb.AppendLine("<hr />");
                    continue;
                }

                // HTML block elements that don't need wrapping (e.g. <p>...</p>, <hr/>)
                if (trimmed.StartsWith("<p", StringComparison.OrdinalIgnoreCase) || trimmed.StartsWith("</p>", StringComparison.OrdinalIgnoreCase) ||
                    trimmed.StartsWith("<hr", StringComparison.OrdinalIgnoreCase))
                {
                    sb.AppendLine(FormatInline(rawLine));
                    continue;
                }

                // Normal paragraph
                sb.AppendLine(string.Format("<p>{0}</p>", FormatInline(trimmed)));
            }

            if (inList) sb.AppendLine("</ul>");
            if (inBlockquote) sb.AppendLine("</blockquote>");

            return sb.ToString();
        }

        private string FormatInline(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";

            // Bold + Italic: ***text*** or ___text___
            text = Regex.Replace(text, @"\*\*\*([^\*]+?)\*\*\*", "<strong><em>$1</em></strong>");
            text = Regex.Replace(text, @"___([^_]+?)___", "<strong><em>$1</em></strong>");

            // Bold: **text** or __text__
            text = Regex.Replace(text, @"\*\*(.+?)\*\*", "<strong>$1</strong>");
            text = Regex.Replace(text, @"__(.+?)__", "<strong>$1</strong>");

            // Italic: *text* or _text_
            text = Regex.Replace(text, @"(?<!\*)\*([^\*]+?)\*(?!\*)", "<em>$1</em>");
            text = Regex.Replace(text, @"(?<!_)_([^_]+?)_(?!_)", "<em>$1</em>");

            // Links: [label](url)
            text = Regex.Replace(text, @"\[([^\]]+)\]\(([^)]+)\)", "<a href=\"$2\" target=\"_blank\">$1</a>");

            return text;
        }

        private string ResolveImageSources(string md, string baseDir)
        {
            if (string.IsNullOrEmpty(md)) return "";

            // Replace src="..." in <img> tags
            md = Regex.Replace(md, @"src=""([^""]+)""", new MatchEvaluator(m =>
            {
                string src = m.Groups[1].Value;
                string resolved = ResolvePathToDataUri(src, baseDir);
                return string.Format("src=\"{0}\"", resolved);
            }));

            // Replace src='...' in <img> tags
            md = Regex.Replace(md, @"src='([^']+)'", new MatchEvaluator(m =>
            {
                string src = m.Groups[1].Value;
                string resolved = ResolvePathToDataUri(src, baseDir);
                return string.Format("src=\"{0}\"", resolved);
            }));

            // Replace ![alt](src)
            md = Regex.Replace(md, @"!\[(.*?)\]\((.*?)\)", new MatchEvaluator(m =>
            {
                string alt = m.Groups[1].Value;
                string src = m.Groups[2].Value;
                string resolved = ResolvePathToDataUri(src, baseDir);
                return string.Format("<img alt=\"{0}\" src=\"{1}\" />", alt, resolved);
            }));

            return md;
        }

        private string ResolvePathToDataUri(string relativePath, string baseDir)
        {
            if (string.IsNullOrEmpty(relativePath)) return "";

            if (relativePath.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                relativePath.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
                relativePath.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                return relativePath;
            }

            string cleanPath = relativePath;
            if (cleanPath.StartsWith("file:///", StringComparison.OrdinalIgnoreCase))
            {
                cleanPath = cleanPath.Substring(8).Replace('/', '\\');
            }

            string foundPath = FindExistingImagePath(cleanPath, baseDir);
            if (!string.IsNullOrEmpty(foundPath) && File.Exists(foundPath))
            {
                try
                {
                    byte[] bytes = File.ReadAllBytes(foundPath);
                    string ext = Path.GetExtension(foundPath).ToLowerInvariant();
                    string mime = "application/octet-stream";
                    switch (ext)
                    {
                        case ".svg": mime = "image/svg+xml"; break;
                        case ".png": mime = "image/png"; break;
                        case ".jpg":
                        case ".jpeg": mime = "image/jpeg"; break;
                        case ".gif": mime = "image/gif"; break;
                        case ".bmp": mime = "image/bmp"; break;
                        case ".webp": mime = "image/webp"; break;
                        case ".ico": mime = "image/x-icon"; break;
                    }
                    return string.Format("data:{0};base64,{1}", mime, Convert.ToBase64String(bytes));
                }
                catch { }
            }

            return relativePath;
        }

        private string FindExistingImagePath(string relativePath, string baseDir)
        {
            string normRel = relativePath.Replace('/', Path.DirectorySeparatorChar);
            string fileName = Path.GetFileName(normRel);

            if (!string.IsNullOrEmpty(baseDir) && Directory.Exists(baseDir))
            {
                string p1 = Path.Combine(baseDir, normRel);
                if (File.Exists(p1)) return p1;

                string p2 = Path.Combine(baseDir, "images_translated", fileName);
                if (File.Exists(p2)) return p2;

                string p3 = Path.Combine(baseDir, "images_original", fileName);
                if (File.Exists(p3)) return p3;

                string p4 = Path.Combine(baseDir, "images", fileName);
                if (File.Exists(p4)) return p4;

                string p5 = Path.Combine(baseDir, fileName);
                if (File.Exists(p5)) return p5;
            }

            // Check templates and assembly directory
            string tmpl = FindTemplatePath(fileName);
            if (!string.IsNullOrEmpty(tmpl) && File.Exists(tmpl)) return tmpl;

            string asmDir = "";
            try { asmDir = Path.GetDirectoryName(typeof(FrontMatterEditorForm).Assembly.Location); } catch { }
            System.Collections.Generic.List<string> probeList = new System.Collections.Generic.List<string>();
            string appBaseDir = AppDomain.CurrentDomain.BaseDirectory;

            if (!string.IsNullOrEmpty(asmDir))
            {
                probeList.Add(Path.Combine(asmDir, "src_Book Forge by Max", "Templates", fileName));
                probeList.Add(Path.Combine(asmDir, "src_BookForge", "Templates", fileName));
                probeList.Add(Path.Combine(asmDir, "Templates", fileName));
                probeList.Add(Path.Combine(asmDir, "src_Book Forge by Max", fileName));
                probeList.Add(Path.Combine(asmDir, "src_BookForge", fileName));
                probeList.Add(Path.Combine(asmDir, fileName));
            }

            probeList.Add(Path.Combine(appBaseDir, "src_Book Forge by Max", "Templates", fileName));
            probeList.Add(Path.Combine(appBaseDir, "src_BookForge", "Templates", fileName));
            probeList.Add(Path.Combine(appBaseDir, "Templates", fileName));
            probeList.Add(Path.Combine(appBaseDir, "src_Book Forge by Max", fileName));
            probeList.Add(Path.Combine(appBaseDir, "src_BookForge", fileName));
            probeList.Add(Path.Combine(appBaseDir, fileName));

            try
            {
                string[] srcDirs = Directory.GetDirectories(appBaseDir, "src_*");
                foreach (string sDir in srcDirs)
                {
                    probeList.Add(Path.Combine(sDir, "Templates", fileName));
                    probeList.Add(Path.Combine(sDir, fileName));
                }
            }
            catch { }

            foreach (string p in probeList)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

            return "";
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (debounceTimer != null)
                {
                    debounceTimer.Stop();
                    debounceTimer.Dispose();
                }
            }
            base.Dispose(disposing);
        }
    }
}
