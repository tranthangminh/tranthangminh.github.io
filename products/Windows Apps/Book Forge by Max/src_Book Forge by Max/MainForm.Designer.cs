using System;
using System.Drawing;
using System.Windows.Forms;

namespace BookForge
{
    partial class MainForm
    {
        private System.ComponentModel.IContainer components = null;

        // Shared ToolTip for instant hover display
        private ToolTip fastTip;

        // Shared Navigation & Status
        private CustomTitleBar titleBarCustom;
        private ModernTabBar tabBar;
        private ModernProgressBar progressBar;
        private Label lblStatus;
        private RichTextBox rtbLogExtract;
        private RichTextBox rtbLogPublish;
        private ModernScrollBar scrollBarLog;
        private InfoTabPanel pnlTabInfo;

        // Tab 1: Convert to Markdown
        private ModernContainerPanel pnlTabExtract;
        private DragDropBox dropExtract;
        private ModernTextBox txtExtractSource;
        private ModernButton btnBrowseSource;
        private ModernCard cardOutputLocation;
        private Label lblOutTitle;
        private RadioButton rbOutputSameSource;
        private RadioButton rbOutputAppFolder;
        private RadioButton rbOutputCustom;
        private ModernTextBox txtOutputCustom;
        private Label lblTargetPreview;
        private ModernCard cardExtractOptions;
        private Label lblOptTitle;
        private Label lblSmartChunking;
        private ModernDropdown cbSmartChunking;
        private Label lblThreshold;
        private ModernDropdown cbThreshold;
        private CheckBox chkExtractImages;
        private CheckBox chkScaffoldBible;
        private ModernButton btnStartExtract;
        private ModernButton btnOpenOutputFolder;
        private ModernButton btnThemeToggle;
        private ModernButton btnToggleExtractSettings;

        // Tab 2: Markdown to PDF
        private ModernContainerPanel pnlTabPublish;
        private DragDropBox dropPublish;
        private ModernTextBox txtPublishFolder;
        private ModernButton btnBrowsePublishFolder;
        private Label lblPublishInspector;
        private ModernCard cardPublishOptions;
        private Label lblPubTitle;
        private Label lblSrcChoice;
        private CheckBox chkSourceTranslated;
        private CheckBox chkSourceOriginal;
        private Label lblPaper;
        private ModernDropdown cbPaperSize;
        private Label lblFont;
        private ModernDropdown cbFont;
        private Label lblMenuDepth;
        private ModernDropdown cbMenuDepth;
        private Label lblGutter;
        private RadioButton rbGutterPrint;
        private RadioButton rbGutterDigital;
        private CheckBox chkTranslatorNote;
        private ModernButton btnEditNote;
        private Label lblNoteHint;
        private ModernButton btnRunAudit;
        private ModernButton btnStartPublish;
        private ModernButton btnOpenPdf;
        private ModernButton btnTogglePublishSettings;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            ThemeTokens t = ThemeTokens.Current;

            // 0. Fast ToolTip Initialization (Instant pop-up like AutoClicker)
            this.fastTip = new ToolTip();
            this.fastTip.InitialDelay = 50;      // 50ms: appears almost immediately on hover
            this.fastTip.ReshowDelay = 50;       // instant reshow between controls
            this.fastTip.AutoPopDelay = 20000;   // stays visible for 20 seconds
            this.fastTip.ShowAlways = true;

            this.titleBarCustom = new CustomTitleBar();
            this.tabBar = new ModernTabBar();
            this.progressBar = new ModernProgressBar();
            this.lblStatus = new Label();
            this.rtbLogExtract = new RichTextBox();
            this.rtbLogPublish = new RichTextBox();
            this.scrollBarLog = new ModernScrollBar();
            this.pnlTabInfo = new InfoTabPanel();

            // Tab 1 Controls
            this.pnlTabExtract = new ModernContainerPanel();
            this.dropExtract = new DragDropBox();
            this.txtExtractSource = new ModernTextBox();
            this.btnBrowseSource = new ModernButton();
            this.cardOutputLocation = new ModernCard();
            this.lblOutTitle = new Label();
            this.rbOutputSameSource = new RadioButton();
            this.rbOutputAppFolder = new RadioButton();
            this.rbOutputCustom = new RadioButton();
            this.txtOutputCustom = new ModernTextBox();
            this.lblTargetPreview = new Label();
            this.cardExtractOptions = new ModernCard();
            this.lblOptTitle = new Label();
            this.lblSmartChunking = new Label();
            this.cbSmartChunking = new ModernDropdown();
            this.lblThreshold = new Label();
            this.cbThreshold = new ModernDropdown();
            this.chkExtractImages = new CheckBox();
            this.chkScaffoldBible = new CheckBox();
            this.btnStartExtract = new ModernButton();
            this.btnOpenOutputFolder = new ModernButton();
            this.btnThemeToggle = new ModernButton();
            this.btnToggleExtractSettings = new ModernButton();

            // Tab 2 Controls
            this.pnlTabPublish = new ModernContainerPanel();
            this.dropPublish = new DragDropBox();
            this.txtPublishFolder = new ModernTextBox();
            this.btnBrowsePublishFolder = new ModernButton();
            this.lblPublishInspector = new Label();
            this.cardPublishOptions = new ModernCard();
            this.lblPubTitle = new Label();
            this.lblSrcChoice = new Label();
            this.chkSourceTranslated = new CheckBox();
            this.chkSourceOriginal = new CheckBox();
            this.lblPaper = new Label();
            this.cbPaperSize = new ModernDropdown();
            this.lblFont = new Label();
            this.cbFont = new ModernDropdown();
            this.lblMenuDepth = new Label();
            this.cbMenuDepth = new ModernDropdown();
            this.lblGutter = new Label();
            this.rbGutterPrint = new RadioButton();
            this.rbGutterDigital = new RadioButton();
            this.chkTranslatorNote = new CheckBox();
            this.btnEditNote = new ModernButton();
            this.lblNoteHint = new Label();
            this.btnRunAudit = new ModernButton();
            this.btnStartPublish = new ModernButton();
            this.btnOpenPdf = new ModernButton();
            this.btnTogglePublishSettings = new ModernButton();

            this.SuspendLayout();

            // Form Properties
            this.FormBorderStyle = FormBorderStyle.None;
            this.ClientSize = new Size(660, 812);
            this.MinimumSize = new Size(640, 532);
            this.Text = "Book Forge by Max v1.0 (Beta)";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = t.BgPrimary;

            // 0. Custom Title Bar (Auto Clicker by Max style)
            this.titleBarCustom.Dock = DockStyle.Top;
            this.titleBarCustom.Height = 32;
            this.titleBarCustom.TitleText = "Book Forge by Max v1.0 (Beta)";
            this.titleBarCustom.OnCloseRequested += () => this.Close();
            this.titleBarCustom.OnMinimizeRequested += () => this.WindowState = FormWindowState.Minimized;
            this.titleBarCustom.OnMaximizeRestoreRequested += () =>
            {
                this.WindowState = (this.WindowState == FormWindowState.Maximized) ? FormWindowState.Normal : FormWindowState.Maximized;
            };

            // 1. Top Tab Bar (Sentence Case, No Icons)
            this.tabBar.Dock = DockStyle.None;
            this.tabBar.Location = new Point(0, 32);
            this.tabBar.Size = new Size(660, 44);
            this.tabBar.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            // 2. Tab 1 Panel (Convert to Markdown)
            this.pnlTabExtract.Location = new Point(0, 78);
            this.pnlTabExtract.Size = new Size(660, 504);
            this.pnlTabExtract.BackColor = t.BgPrimary;
            this.pnlTabExtract.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            // DropZone Tab 1
            this.dropExtract.Location = new Point(16, 8);
            this.dropExtract.Size = new Size(628, 88);
            this.dropExtract.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            this.dropExtract.EmptyTitle = "Drag & drop file here...";
            this.dropExtract.EmptySubtitle = "Supports .pdf, .md files (Creates \"Book Project\")";
            this.fastTip.SetToolTip(this.dropExtract, "Drag and drop .pdf, .md source files here.");

            // Source Input Box & Action Row
            this.txtExtractSource.Location = new Point(16, 104);
            this.txtExtractSource.Size = new Size(396, 24);
            this.txtExtractSource.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            this.fastTip.SetToolTip(this.txtExtractSource, "Path to source PDF or Markdown file.");

            this.btnBrowseSource.Location = new Point(422, 102);
            this.btnBrowseSource.Size = new Size(96, 28);
            this.btnBrowseSource.Text = "Browse...";
            this.btnBrowseSource.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            this.btnBrowseSource.Click += new EventHandler(this.btnBrowseSource_Click);
            this.fastTip.SetToolTip(this.btnBrowseSource, "Browse for source PDF or Markdown file.");

            this.btnToggleExtractSettings.Location = new Point(526, 102);
            this.btnToggleExtractSettings.Size = new Size(118, 28);
            this.btnToggleExtractSettings.Text = "Settings ▲";
            this.btnToggleExtractSettings.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            this.btnToggleExtractSettings.Click += new EventHandler(this.btnToggleExtractSettings_Click);
            this.fastTip.SetToolTip(this.btnToggleExtractSettings, "Toggle Settings:\nCollapse or expand settings to give more vertical space to the live log window.");

            // Card 1: Output Location
            this.cardOutputLocation.Location = new Point(16, 140);
            this.cardOutputLocation.Size = new Size(628, 140);
            this.cardOutputLocation.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            this.lblOutTitle.Text = "Output directory configuration:";
            this.lblOutTitle.Font = ThemeTokens.FontBodyBold;
            this.lblOutTitle.ForeColor = t.AccentPrimary;
            this.lblOutTitle.Location = new Point(16, 12);
            this.lblOutTitle.AutoSize = true;

            this.rbOutputSameSource.Text = "Same as source directory";
            this.rbOutputSameSource.Checked = true;
            this.rbOutputSameSource.Location = new Point(18, 36);
            this.rbOutputSameSource.Size = new Size(220, 22);
            this.rbOutputSameSource.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.rbOutputSameSource, "Same as source directory:\nAutomatically creates a book project folder adjacent to the source file.");

            this.rbOutputAppFolder.Text = "App directory";
            this.rbOutputAppFolder.Location = new Point(18, 60);
            this.rbOutputAppFolder.Size = new Size(220, 22);
            this.rbOutputAppFolder.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.rbOutputAppFolder, "App directory:\nSaves into Book Forge by Max-Files adjacent to the application for centralized management.");

            this.rbOutputCustom.Text = "Custom:";
            this.rbOutputCustom.Location = new Point(18, 84);
            this.rbOutputCustom.Size = new Size(95, 22);
            this.rbOutputCustom.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.rbOutputCustom, "Custom directory:\nChoose any folder on your computer to store the book project.");

            this.txtOutputCustom.Location = new Point(120, 84);
            this.txtOutputCustom.Size = new Size(490, 24);
            this.txtOutputCustom.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            // Target preview: Text-secondary, Italic
            this.lblTargetPreview.Location = new Point(18, 112);
            this.lblTargetPreview.Size = new Size(592, 20);
            this.lblTargetPreview.AutoEllipsis = true;
            this.lblTargetPreview.ForeColor = t.TextSecondary;
            this.lblTargetPreview.Font = new Font(ThemeTokens.FontSmall.FontFamily, ThemeTokens.FontSmall.Size, FontStyle.Italic);
            this.lblTargetPreview.Text = "Output directory: (Will appear when file is selected)";

            this.cardOutputLocation.Controls.Add(this.lblOutTitle);
            this.cardOutputLocation.Controls.Add(this.rbOutputSameSource);
            this.cardOutputLocation.Controls.Add(this.rbOutputAppFolder);
            this.cardOutputLocation.Controls.Add(this.rbOutputCustom);
            this.cardOutputLocation.Controls.Add(this.txtOutputCustom);
            this.cardOutputLocation.Controls.Add(this.lblTargetPreview);

            // Card 2: Extract Options (Vertical Layout, Short Labels, Instant ToolTips)
            this.cardExtractOptions.Location = new Point(16, 288);
            this.cardExtractOptions.Size = new Size(628, 162);
            this.cardExtractOptions.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            this.lblOptTitle.Text = "Smart extraction options for AI:";
            this.lblOptTitle.Font = ThemeTokens.FontBodyBold;
            this.lblOptTitle.ForeColor = t.AccentPrimary;
            this.lblOptTitle.Location = new Point(16, 12);
            this.lblOptTitle.AutoSize = true;

            // Line 1: Smart chunking dropdown
            this.lblSmartChunking.Text = "Smart chunking:";
            this.lblSmartChunking.Location = new Point(18, 38);
            this.lblSmartChunking.AutoSize = true;
            this.lblSmartChunking.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblSmartChunking, "Smart chunking depth:\nChoose whether to split by H2 only, or H2 & H3 for long chapters to prevent AI token overflow.");

            this.cbSmartChunking.Items.AddRange(new string[] { "H1", "H1 & H2", "H1, H2 & H3" });
            this.cbSmartChunking.SelectedIndex = 2;
            this.cbSmartChunking.Location = new Point(135, 34);
            this.cbSmartChunking.Size = new Size(275, 26);
            this.fastTip.SetToolTip(this.cbSmartChunking, "Smart chunking depth:\n- H1: Keeps full chapters intact at H1 level.\n- H1 & H2: Splits by H1 and H2 only (avoids splitting chapters into too many tiny pieces).\n- H1, H2 & H3: Splits by H1, H2, and further splits long sections by H3 if exceeding threshold.");

            // Line 2: Indented threshold option (Short Label)
            this.lblThreshold.Text = "Split threshold:";
            this.lblThreshold.Location = new Point(18, 70);
            this.lblThreshold.AutoSize = true;
            this.lblThreshold.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblThreshold, "Chapter split threshold:\nMaximum characters per file chunk. Default 25,000 chars (~3,500 words) is the golden standard for Claude 3.5 Sonnet & Gemini Pro.");

            this.cbThreshold.Items.AddRange(new string[] { "15,000 characters", "20,000 characters", "25,000 characters (Golden Standard)", "30,000 characters", "40,000 characters" });
            this.cbThreshold.SelectedIndex = 2;
            this.cbThreshold.Location = new Point(135, 66);
            this.cbThreshold.Size = new Size(275, 26);
            this.fastTip.SetToolTip(this.cbThreshold, "Chapter split threshold:\nMaximum characters per file chunk. Default 25,000 chars (~3,500 words) is the golden standard for Claude 3.5 Sonnet & Gemini Pro.");

            // Line 3: Extract Images (Short Label)
            this.chkExtractImages.Text = "Extract images & vectors";
            this.chkExtractImages.UseMnemonic = false;
            this.chkExtractImages.Checked = true;
            this.chkExtractImages.Location = new Point(18, 102);
            this.chkExtractImages.Size = new Size(240, 22);
            this.chkExtractImages.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.chkExtractImages, "Extract images & vectors:\nAutomatically extracts illustrations, diagrams, and vectors into images_original.");

            // Line 4: Scaffold Bible (Short Label)
            this.chkScaffoldBible.Text = "Scaffold translation_bible";
            this.chkScaffoldBible.Checked = true;
            this.chkScaffoldBible.Location = new Point(18, 130);
            this.chkScaffoldBible.Size = new Size(240, 22);
            this.chkScaffoldBible.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.chkScaffoldBible, "Standard translation_bible:\nInitializes standard translation guides: Style-Guide, Glossary, Character-Voice, Context-Anchor.");

            this.cardExtractOptions.Controls.Add(this.lblOptTitle);
            this.cardExtractOptions.Controls.Add(this.lblSmartChunking);
            this.cardExtractOptions.Controls.Add(this.cbSmartChunking);
            this.cardExtractOptions.Controls.Add(this.lblThreshold);
            this.cardExtractOptions.Controls.Add(this.cbThreshold);
            this.cardExtractOptions.Controls.Add(this.chkExtractImages);
            this.cardExtractOptions.Controls.Add(this.chkScaffoldBible);

            // Extract Action Buttons
            this.btnStartExtract.Location = new Point(16, 458);
            this.btnStartExtract.Size = new Size(180, 36);
            this.btnStartExtract.Text = "Extract Content";
            this.btnStartExtract.IsPrimary = true;
            this.btnStartExtract.Click += new EventHandler(this.btnStartExtract_Click);
            this.fastTip.SetToolTip(this.btnStartExtract, "Extract Content:\nStart content extraction and smart chapter decomposition pipeline.");

            this.btnOpenOutputFolder.Location = new Point(206, 458);
            this.btnOpenOutputFolder.Size = new Size(160, 36);
            this.btnOpenOutputFolder.Text = "Open Output Folder";
            this.btnOpenOutputFolder.Click += new EventHandler(this.btnOpenOutput_Click);
            this.fastTip.SetToolTip(this.btnOpenOutputFolder, "Open Output Folder:\nOpen the generated book directory in Windows Explorer.");

            this.btnThemeToggle.Location = new Point(376, 458);
            this.btnThemeToggle.Size = new Size(98, 36);
            this.btnThemeToggle.Text = "Theme";
            this.btnThemeToggle.Click += new EventHandler(this.btnThemeToggle_Click);
            this.fastTip.SetToolTip(this.btnThemeToggle, "Toggle Theme:\nSwitch between Dark Mode and Light Mode.");

            this.pnlTabExtract.Controls.Add(this.dropExtract);
            this.pnlTabExtract.Controls.Add(this.txtExtractSource);
            this.pnlTabExtract.Controls.Add(this.btnBrowseSource);
            this.pnlTabExtract.Controls.Add(this.btnToggleExtractSettings);
            this.pnlTabExtract.Controls.Add(this.cardOutputLocation);
            this.pnlTabExtract.Controls.Add(this.cardExtractOptions);
            this.pnlTabExtract.Controls.Add(this.btnStartExtract);
            this.pnlTabExtract.Controls.Add(this.btnOpenOutputFolder);
            this.pnlTabExtract.Controls.Add(this.btnThemeToggle);

            // 3. Tab 2 Panel (Markdown to PDF)
            this.pnlTabPublish.Location = new Point(0, 78);
            this.pnlTabPublish.Size = new Size(660, 460);
            this.pnlTabPublish.BackColor = t.BgPrimary;
            this.pnlTabPublish.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            this.pnlTabPublish.Visible = false;

            // DropZone Tab 2
            this.dropPublish.Location = new Point(16, 8);
            this.dropPublish.Size = new Size(628, 88);
            this.dropPublish.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            this.dropPublish.EmptyTitle = "Drag & drop file or book directory here...";
            this.dropPublish.EmptySubtitle = "Supports .md files or \"Book Project\" folders";
            this.fastTip.SetToolTip(this.dropPublish, "Drag & drop book project folder or .md file here to compile and publish PDF.");

            // Folder Input Box & Action Row
            this.txtPublishFolder.Location = new Point(16, 104);
            this.txtPublishFolder.Size = new Size(396, 24);
            this.txtPublishFolder.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            this.fastTip.SetToolTip(this.txtPublishFolder, "Path to book project folder or single .md file.");

            this.btnBrowsePublishFolder.Location = new Point(422, 102);
            this.btnBrowsePublishFolder.Size = new Size(96, 28);
            this.btnBrowsePublishFolder.Text = "Browse...";
            this.btnBrowsePublishFolder.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            this.btnBrowsePublishFolder.Click += new EventHandler(this.btnBrowsePublishFolder_Click);
            this.fastTip.SetToolTip(this.btnBrowsePublishFolder, "Browse for book project folder or single .md file.");

            this.btnTogglePublishSettings.Location = new Point(526, 102);
            this.btnTogglePublishSettings.Size = new Size(118, 28);
            this.btnTogglePublishSettings.Text = "Settings ▲";
            this.btnTogglePublishSettings.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            this.btnTogglePublishSettings.Click += new EventHandler(this.btnTogglePublishSettings_Click);
            this.fastTip.SetToolTip(this.btnTogglePublishSettings, "Toggle Settings:\nCollapse or expand settings to give more vertical space to the live log window.");

            // Project Inspector Live Status
            this.lblPublishInspector.Location = new Point(18, 132);
            this.lblPublishInspector.Size = new Size(624, 20);
            this.lblPublishInspector.Font = ThemeTokens.FontSmall;
            this.lblPublishInspector.ForeColor = t.TextTertiary;
            this.lblPublishInspector.AutoEllipsis = true;
            this.lblPublishInspector.Text = "● Ready: Select or drop a book project folder or a single .md file above.";

            // Card 3: Publish Options (Vertical Layout, Short Labels, Instant ToolTips)
            this.cardPublishOptions.Location = new Point(16, 154);
            this.cardPublishOptions.Size = new Size(628, 248);
            this.cardPublishOptions.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            this.lblPubTitle.Text = "Professional print book layout settings:";
            this.lblPubTitle.Font = ThemeTokens.FontBodyBold;
            this.lblPubTitle.ForeColor = t.AccentPrimary;
            this.lblPubTitle.Location = new Point(16, 12);
            this.lblPubTitle.AutoSize = true;

            // Row 1: Source (Checkboxes! Can select both!)
            this.lblSrcChoice.Text = "Content source:";
            this.lblSrcChoice.Location = new Point(18, 38);
            this.lblSrcChoice.AutoSize = true;
            this.lblSrcChoice.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblSrcChoice, "Content source:\nSelect Translated, Original, or both simultaneously.");

            this.chkSourceTranslated.Text = "Translated";
            this.chkSourceTranslated.Checked = true;
            this.chkSourceTranslated.Location = new Point(150, 36);
            this.chkSourceTranslated.Size = new Size(110, 22);
            this.chkSourceTranslated.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.chkSourceTranslated, "Translated:\nCompile and publish from chapters_translated.");

            this.chkSourceOriginal.Text = "Original";
            this.chkSourceOriginal.Checked = true;
            this.chkSourceOriginal.Location = new Point(270, 36);
            this.chkSourceOriginal.Size = new Size(110, 22);
            this.chkSourceOriginal.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.chkSourceOriginal, "Original:\nCompile and publish from chapters_original.");

            // Row 2: Paper Size (Short Label)
            this.lblPaper.Text = "Paper size:";
            this.lblPaper.Location = new Point(18, 68);
            this.lblPaper.AutoSize = true;
            this.lblPaper.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblPaper, "Paper size profile:\nA5 is the standard international format for printed books.");

            PaperProfiles.PopulateDropdown(this.cbPaperSize, "A5");
            this.cbPaperSize.Location = new Point(150, 64);
            this.cbPaperSize.Size = new Size(260, 26);
            this.fastTip.SetToolTip(this.cbPaperSize, "Paper size profile:\nStandard print formats: A5 (Standard Book), B5 (Monograph), A4 (Document), A6 (Pocket), US-Trade, US-Letter, Mass-Market, Kindle, Crown.");

            // Row 3: Font (Placed directly under Paper Size as requested!)
            this.lblFont.Text = "Typography font:";
            this.lblFont.Location = new Point(18, 100);
            this.lblFont.AutoSize = true;
            this.lblFont.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblFont, "Typography font:\nLora is an elegant literary serif typeface engineered for book printing.");

            this.cbFont.Items.AddRange(new string[] { "Lora (Recommended)", "Times New Roman", "Garamond", "Georgia", "Palatino" });
            this.cbFont.SelectedIndex = 0;
            this.cbFont.Location = new Point(150, 96);
            this.cbFont.Size = new Size(260, 26);
            this.fastTip.SetToolTip(this.cbFont, "Typography font:\nLora is an elegant literary serif typeface engineered for book printing.");

            // Row 4: Menu Depth (H1 / H1 & H2 / H1, H2 & H3)
            this.lblMenuDepth.Text = "Menu depth:";
            this.lblMenuDepth.Location = new Point(18, 132);
            this.lblMenuDepth.AutoSize = true;
            this.lblMenuDepth.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblMenuDepth, "Menu depth:\nSelect heading levels included in the Table of Contents and PDF Document Outline (Bookmarks).");

            this.cbMenuDepth.Items.AddRange(new string[] { "H1", "H1 & H2", "H1, H2 & H3" });
            this.cbMenuDepth.SelectedIndex = 0;
            this.cbMenuDepth.Location = new Point(150, 128);
            this.cbMenuDepth.Size = new Size(260, 26);
            this.fastTip.SetToolTip(this.cbMenuDepth, "Menu depth:\nH1: Chapters only (Default)\nH1 & H2: Chapters and major sections\nH1, H2 & H3: Chapters, sections, and sub-sections");

            // Row 5: Binding Gutter Mode (Short Label)
            this.lblGutter.Text = "Binding mode:";
            this.lblGutter.Location = new Point(18, 164);
            this.lblGutter.AutoSize = true;
            this.lblGutter.ForeColor = t.TextSecondary;
            this.fastTip.SetToolTip(this.lblGutter, "Binding gutter mode:\nSelect alternating gutter margins for printed books or symmetrical margins for digital screens.");

            this.rbGutterPrint.Text = "Print book (Gutter)";
            this.rbGutterPrint.Checked = true;
            this.rbGutterPrint.Location = new Point(150, 162);
            this.rbGutterPrint.Size = new Size(150, 22);
            this.rbGutterPrint.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.rbGutterPrint, "Print book (Gutter):\nAlternating inside (22mm) and outside (14mm) gutter margins for book binding.");

            this.rbGutterDigital.Text = "Digital screen (Even)";
            this.rbGutterDigital.Location = new Point(310, 162);
            this.rbGutterDigital.Size = new Size(160, 22);
            this.rbGutterDigital.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.rbGutterDigital, "Digital screen (Even):\nSymmetrical 18mm margins optimized for tablets, phones, and desktop screens.");

            // Row 6: Translator Note (Checkbox & Header/Note editor button)
            this.chkTranslatorNote.Text = "Include translator note";
            this.chkTranslatorNote.Checked = true;
            this.chkTranslatorNote.Location = new Point(18, 194);
            this.chkTranslatorNote.Size = new Size(165, 22);
            this.chkTranslatorNote.ForeColor = t.TextPrimary;
            this.fastTip.SetToolTip(this.chkTranslatorNote, "Translator note:\nAutomatically injects _TRANSLATOR_NOTE_translated.md or _TRANSLATOR_NOTE_original.md depending on the selected Content source.");

            this.btnEditNote.Location = new Point(195, 190);
            this.btnEditNote.Size = new Size(230, 28);
            this.btnEditNote.Text = "Edit Header and Translator Note";
            this.btnEditNote.Click += new EventHandler(this.btnEditNote_Click);
            this.fastTip.SetToolTip(this.btnEditNote, "Edit Header and Translator Note:\nOpen Markdown editor and live A5 page preview to edit running headers and translator notes.");

            // Row 7: Note Hint
            this.lblNoteHint.Text = "\u2139 Note: Auto-selects translated/original note. Unfilled fields auto-use project metadata.";
            this.lblNoteHint.Location = new Point(18, 222);
            this.lblNoteHint.AutoSize = true;
            this.lblNoteHint.ForeColor = t.TextSecondary;
            this.lblNoteHint.Font = new Font("Segoe UI", 8.25f, FontStyle.Italic);
            this.fastTip.SetToolTip(this.lblNoteHint, "Metadata fallback:\nFields like Original Title or Reference Source default to project folder name if omitted.");

            this.cardPublishOptions.Controls.Add(this.lblPubTitle);
            this.cardPublishOptions.Controls.Add(this.lblSrcChoice);
            this.cardPublishOptions.Controls.Add(this.chkSourceTranslated);
            this.cardPublishOptions.Controls.Add(this.chkSourceOriginal);
            this.cardPublishOptions.Controls.Add(this.lblPaper);
            this.cardPublishOptions.Controls.Add(this.cbPaperSize);
            this.cardPublishOptions.Controls.Add(this.lblFont);
            this.cardPublishOptions.Controls.Add(this.cbFont);
            this.cardPublishOptions.Controls.Add(this.lblMenuDepth);
            this.cardPublishOptions.Controls.Add(this.cbMenuDepth);
            this.cardPublishOptions.Controls.Add(this.lblGutter);
            this.cardPublishOptions.Controls.Add(this.rbGutterPrint);
            this.cardPublishOptions.Controls.Add(this.rbGutterDigital);
            this.cardPublishOptions.Controls.Add(this.chkTranslatorNote);
            this.cardPublishOptions.Controls.Add(this.btnEditNote);
            this.cardPublishOptions.Controls.Add(this.lblNoteHint);

            // Action Buttons Tab 2
            this.btnRunAudit.Location = new Point(16, 412);
            this.btnRunAudit.Size = new Size(140, 36);
            this.btnRunAudit.Text = "Run QA Audit";
            this.btnRunAudit.Click += new EventHandler(this.btnRunAudit_Click);
            this.fastTip.SetToolTip(this.btnRunAudit, "Run QA Audit:\nValidate Markdown syntax, unclosed tags, and paragraph parity.");

            this.btnStartPublish.Location = new Point(166, 412);
            this.btnStartPublish.Size = new Size(180, 36);
            this.btnStartPublish.Text = "Publish PDF Book";
            this.btnStartPublish.IsPrimary = true;
            this.btnStartPublish.Click += new EventHandler(this.btnStartPublish_Click);
            this.fastTip.SetToolTip(this.btnStartPublish, "Publish PDF Book:\nCompile master document and render print-ready PDF via headless Edge engine.");

            this.btnOpenPdf.Location = new Point(356, 412);
            this.btnOpenPdf.Size = new Size(140, 36);
            this.btnOpenPdf.Text = "Open PDF File";
            this.btnOpenPdf.Enabled = false;
            this.btnOpenPdf.Click += new EventHandler(this.btnOpenPdf_Click);
            this.fastTip.SetToolTip(this.btnOpenPdf, "Open PDF File:\nOpen generated PDF book with default viewer.");

            this.pnlTabPublish.Controls.Add(this.dropPublish);
            this.pnlTabPublish.Controls.Add(this.txtPublishFolder);
            this.pnlTabPublish.Controls.Add(this.btnBrowsePublishFolder);
            this.pnlTabPublish.Controls.Add(this.btnTogglePublishSettings);
            this.pnlTabPublish.Controls.Add(this.lblPublishInspector);
            this.pnlTabPublish.Controls.Add(this.cardPublishOptions);
            this.pnlTabPublish.Controls.Add(this.btnRunAudit);
            this.pnlTabPublish.Controls.Add(this.btnStartPublish);
            this.pnlTabPublish.Controls.Add(this.btnOpenPdf);

            // 4. Bottom Section: Progress & Live Log Box
            this.lblStatus.Location = new Point(16, 532);
            this.lblStatus.Size = new Size(628, 20);
            this.lblStatus.Text = "Ready.";
            this.lblStatus.ForeColor = t.TextSecondary;
            this.lblStatus.Anchor = AnchorStyles.Left | AnchorStyles.Right;

            this.progressBar.Location = new Point(16, 554);
            this.progressBar.Size = new Size(628, 24);
            this.progressBar.Anchor = AnchorStyles.Left | AnchorStyles.Right;

            this.rtbLogExtract.Location = new Point(16, 586);
            this.rtbLogExtract.Size = new Size(618, 172);
            this.rtbLogExtract.BackColor = Color.FromArgb(20, 20, 20);
            this.rtbLogExtract.ForeColor = t.TextPrimary;
            this.rtbLogExtract.BorderStyle = BorderStyle.None;
            this.rtbLogExtract.Font = ThemeTokens.GetMonospaceFont(9f);
            this.rtbLogExtract.ReadOnly = true;
            this.rtbLogExtract.ScrollBars = RichTextBoxScrollBars.None;
            this.rtbLogExtract.Anchor = AnchorStyles.Left | AnchorStyles.Right;

            this.rtbLogPublish.Location = new Point(16, 586);
            this.rtbLogPublish.Size = new Size(618, 172);
            this.rtbLogPublish.BackColor = Color.FromArgb(20, 20, 20);
            this.rtbLogPublish.ForeColor = t.TextPrimary;
            this.rtbLogPublish.BorderStyle = BorderStyle.None;
            this.rtbLogPublish.Font = ThemeTokens.GetMonospaceFont(9f);
            this.rtbLogPublish.ReadOnly = true;
            this.rtbLogPublish.ScrollBars = RichTextBoxScrollBars.None;
            this.rtbLogPublish.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            this.rtbLogPublish.Visible = false;

            this.scrollBarLog.Location = new Point(636, 586);
            this.scrollBarLog.Size = new Size(8, 172);
            this.scrollBarLog.Anchor = AnchorStyles.Right;

            // 5. Tab Info Panel
            this.pnlTabInfo.Location = new Point(0, 78);
            this.pnlTabInfo.Size = new Size(660, 700);
            this.pnlTabInfo.Visible = false;
            this.pnlTabInfo.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;

            // Add Controls to Form
            this.Controls.Add(this.tabBar);
            this.Controls.Add(this.titleBarCustom);
            this.Controls.Add(this.pnlTabExtract);
            this.Controls.Add(this.pnlTabPublish);
            this.Controls.Add(this.pnlTabInfo);
            this.Controls.Add(this.lblStatus);
            this.Controls.Add(this.progressBar);
            this.Controls.Add(this.scrollBarLog);
            this.Controls.Add(this.rtbLogExtract);
            this.Controls.Add(this.rtbLogPublish);

            this.ResumeLayout(false);
        }
    }
}
