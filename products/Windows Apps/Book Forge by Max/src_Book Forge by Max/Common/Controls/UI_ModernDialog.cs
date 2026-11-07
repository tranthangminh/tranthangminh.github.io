using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// The frame every popup shares: title bar, border and rounded corners, Esc and Enter, a body that scrolls when it is too tall, and a button row.
    /// A popup only fills Body, calls SetBodySize and adds its buttons. The caller picks how it opens:
    /// ShowModal locks the main window until the popup is dealt with, ShowParallel keeps both usable.
    /// </summary>
    public class ModernDialog : Form
    {
        private const int BorderWidth = 1;
        private const int FooterHeight = 46;
        private const int FooterSidePad = 12;
        private const int ButtonHeight = 30;
        private const int ButtonMinWidth = 84;
        private const int ButtonTextPad = 28;
        private const int ButtonGap = 6;
        private const int ScrollBarWidth = 10;
        private const int ScrollStep = 40;

        private const int WM_NCACTIVATE = 0x0086;
        // Clicking the locked main window makes Windows flash the popup with a burst of these, much faster than any real change of the active window
        private const int FlashBurstGapMs = 150;
        private const int AttentionTickMs = 110;
        private const int AttentionTicks = 6;

        private readonly CustomTitleBar _titleBar;
        private readonly Panel _viewport;
        private readonly Panel _footer;
        private readonly List<RoundedButton> _buttons = new List<RoundedButton>();
        private readonly HashSet<RoundedButton> _primaryButtons = new HashSet<RoundedButton>();
        private ModernScrollBar _scrollBar;

        private int _lastNcActivateTick;
        private bool _hasNcActivate = false;
        private Timer _attentionTimer;
        private int _attentionTicksLeft = 0;

        protected ThemeTokens Theme { get; private set; }
        protected Panel Body { get; private set; }

        protected string Title
        {
            get { return _titleBar.TitleText; }
            set
            {
                _titleBar.TitleText = value;
                this.Text = value;
            }
        }

        public ModernDialog(string title, ThemeTokens theme = null)
        {
            Theme = theme ?? ThemeTokens.Current;

            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterParent;
            this.ShowInTaskbar = false;
            this.DoubleBuffered = true;
            this.Padding = new Padding(BorderWidth);

            _titleBar = new CustomTitleBar(this)
            {
                ShowMinimizeButton = false,
                ShowLanguageButton = false,
                ShowThemeButton = false,
                ShowAdminButton = false,
                ShowAppIcon = false
            };
            Title = title;

            _viewport = new Panel { Dock = DockStyle.Fill };
            Body = new Panel { Location = Point.Empty };
            _viewport.Controls.Add(Body);

            _footer = new Panel { Dock = DockStyle.Bottom, Height = FooterHeight, Visible = false };
            _footer.Resize += (s, e) => LayoutFooter();

            // The control added first is docked last: it takes what the title bar and the buttons leave
            this.Controls.Add(_viewport);
            this.Controls.Add(_footer);
            this.Controls.Add(_titleBar);

            ApplyFrameTheme();

            ThemeTokens.OnThemeChanged += HandleThemeChanged;
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        /// <summary>Opens the popup and locks the main window until it is closed.</summary>
        public DialogResult ShowModal(Form owner)
        {
            if (owner == null)
            {
                this.StartPosition = FormStartPosition.CenterScreen;
                return this.ShowDialog();
            }

            CenterOver(owner);
            return this.ShowDialog(owner);
        }

        /// <summary>
        /// Opens the popup next to a main window that stays usable. It floats above that window, minimizes and closes with it, and disposes itself when closed.
        /// Only one of each kind: when T is already open it comes to the front and is returned, so hook events only when it is new.
        /// </summary>
        public static T ShowParallel<T>(Form owner, Func<T> create) where T : ModernDialog
        {
            foreach (Form open in Application.OpenForms)
            {
                T existing = open as T;
                if (existing != null)
                {
                    existing.Activate();
                    return existing;
                }
            }

            T dialog = create();
            dialog.CenterOver(owner);
            dialog.Show(owner);
            return dialog;
        }

        /// <summary>Follows the app's theme. A popup that stays open next to the main window overrides this to recolor its own content.</summary>
        public virtual void ApplyTheme(ThemeTokens theme)
        {
            Theme = theme;
            ApplyFrameTheme();
        }

        /// <summary>A popup that stays open next to the main window overrides this to reword its own content, Title and buttons included.</summary>
        protected virtual void ApplyLanguage() { }

        /// <summary>
        /// Sizes the popup to its content (Body is laid out from 0,0). Taller than maxHeight, the body scrolls and the popup grows by the scrollbar so the content keeps its width.
        /// </summary>
        protected void SetBodySize(int width, int contentHeight, int maxHeight = int.MaxValue)
        {
            bool scrolls = contentHeight > maxHeight;
            int visibleHeight = scrolls ? maxHeight : contentHeight;

            if (scrolls && _scrollBar == null)
            {
                _scrollBar = new ModernScrollBar { Dock = DockStyle.Right, Width = ScrollBarWidth, SmallChange = ScrollStep };
                _scrollBar.ApplyTheme(Theme);
                _scrollBar.ValueChanged += (value) => { Body.Top = -value; };
                _viewport.Controls.Add(_scrollBar);
            }

            if (_scrollBar != null)
            {
                _scrollBar.Visible = scrolls;
                _scrollBar.Maximum = contentHeight;
                _scrollBar.LargeChange = visibleHeight;
            }

            Body.Size = new Size(width, contentHeight);

            // Control.Visible reads false until the form is on screen, so the button count tells whether the row is there
            int footerHeight = _buttons.Count > 0 ? FooterHeight : 0;
            this.ClientSize = new Size(
                width + (scrolls ? ScrollBarWidth : 0) + BorderWidth * 2,
                _titleBar.Height + visibleHeight + footerHeight + BorderWidth * 2);
        }

        /// <summary>Adds a button to the row at the bottom, left to right. Clicking runs beforeClose, then closes the popup with this result.</summary>
        protected RoundedButton AddButton(string text, DialogResult result, bool isPrimary, Action beforeClose = null)
        {
            RoundedButton button = new RoundedButton
            {
                Text = text,
                Height = ButtonHeight,
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            button.Click += (s, e) =>
            {
                if (beforeClose != null) beforeClose();
                this.DialogResult = result;
                this.Close();
            };
            button.TextChanged += (s, e) => LayoutFooter();

            if (isPrimary) _primaryButtons.Add(button);
            StyleButton(button);

            _buttons.Add(button);
            _footer.Controls.Add(button);
            if (_buttons.Count == 1)
            {
                _footer.Visible = true;
                this.ClientSize = new Size(this.ClientSize.Width, this.ClientSize.Height + FooterHeight);
            }
            LayoutFooter();
            return button;
        }

        private void LayoutFooter()
        {
            int total = 0;
            foreach (RoundedButton button in _buttons)
            {
                button.Width = Math.Max(ButtonMinWidth, TextRenderer.MeasureText(button.Text, button.Font).Width + ButtonTextPad);
                total += button.Width + ButtonGap;
            }

            int x = _footer.Width - FooterSidePad - (total - ButtonGap);
            int y = (_footer.Height - ButtonHeight) / 2;
            foreach (RoundedButton button in _buttons)
            {
                button.Location = new Point(x, y);
                x += button.Width + ButtonGap;
            }
        }

        private void StyleButton(RoundedButton button)
        {
            bool isPrimary = _primaryButtons.Contains(button);
            button.BorderRadius = Theme.RadiusSm;
            button.NormalColor = isPrimary ? Theme.AccentPrimary : Theme.BgTertiary;
            button.HoverColor = isPrimary ? Theme.AccentPrimaryHover : Theme.BgElevated;
            button.ForeColor = isPrimary ? Color.White : Theme.TextPrimary;
            if (!isPrimary)
            {
                button.BorderColor = Theme.BorderColor;
                button.BorderWidth = 1;
            }
        }

        private void ApplyFrameTheme()
        {
            this.BackColor = Theme.BgSecondary;
            this.ForeColor = Theme.TextPrimary;
            _titleBar.ApplyTheme(Theme);
            _viewport.BackColor = Theme.BgSecondary;
            Body.BackColor = Theme.BgSecondary;
            _footer.BackColor = Theme.BgPrimary;
            foreach (RoundedButton button in _buttons) StyleButton(button);
            if (_scrollBar != null) _scrollBar.ApplyTheme(Theme);
            RefreshBorder();
        }

        private void HandleThemeChanged()
        {
            ApplyTheme(ThemeTokens.Current);
        }

        // ShowDialog's CenterParent ignores the screen edges and Show ignores it altogether
        private void CenterOver(Form owner)
        {
            Rectangle anchor = owner.WindowState == FormWindowState.Minimized ? owner.RestoreBounds : owner.Bounds;
            Rectangle area = Screen.FromRectangle(anchor).WorkingArea;

            int x = anchor.Left + (anchor.Width - this.Width) / 2;
            int y = anchor.Top + (anchor.Height - this.Height) / 2;

            this.StartPosition = FormStartPosition.Manual;
            this.Location = new Point(
                Math.Max(area.Left, Math.Min(x, area.Right - this.Width)),
                Math.Max(area.Top, Math.Min(y, area.Bottom - this.Height)));
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            WindowHelper.ApplyRoundedCorners(this);
            WindowHelper.SetSystemBorderColor(this, CurrentBorderColor);
        }

        // Odd ticks are the lit half of the blink
        private Color CurrentBorderColor
        {
            get { return (_attentionTicksLeft % 2 == 1) ? Theme.AccentPrimary : Theme.BorderColor; }
        }

        private void RefreshBorder()
        {
            WindowHelper.SetSystemBorderColor(this, CurrentBorderColor);
            this.Invalidate();
        }

        // Starts on the main button rather than the first input, where an arrow key or the wheel would change a value by accident.
        // A popup made for typing moves the focus to its input in Shown.
        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            if (this.AcceptButton != null) this.ActiveControl = (Control)this.AcceptButton;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            WindowHelper.DrawWindowBorder(e.Graphics, this, CurrentBorderColor, Theme.FormRadius);
        }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            base.OnMouseWheel(e);
            if (_scrollBar != null && _scrollBar.Visible)
            {
                // By the amount turned: Windows merges fast wheel turns into one message with a bigger delta
                _scrollBar.Value -= e.Delta * ScrollStep / SystemInformation.MouseWheelScrollDelta;
            }
        }

        protected override bool ProcessDialogKey(Keys keyData)
        {
            if (keyData == Keys.Escape && this.CancelButton == null)
            {
                this.Close();
                return true;
            }
            return base.ProcessDialogKey(keyData);
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_NCACTIVATE && this.Modal) NoteActivationChange();
            base.WndProc(ref m);
        }

        private void NoteActivationChange()
        {
            int now = Environment.TickCount;
            bool isBurst = _hasNcActivate && now - _lastNcActivateTick < FlashBurstGapMs;
            _hasNcActivate = true;
            _lastNcActivateTick = now;

            if (isBurst && _attentionTicksLeft == 0) StartAttentionBlink();
        }

        // The title bar of a borderless window does not flash, so the border does it: this popup has to be dealt with first
        private void StartAttentionBlink()
        {
            if (_attentionTimer == null)
            {
                _attentionTimer = new Timer { Interval = AttentionTickMs };
                _attentionTimer.Tick += (s, e) =>
                {
                    _attentionTicksLeft--;
                    if (_attentionTicksLeft <= 0) _attentionTimer.Stop();
                    RefreshBorder();
                };
            }

            _attentionTicksLeft = AttentionTicks + 1;
            _attentionTimer.Start();
            RefreshBorder();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                ThemeTokens.OnThemeChanged -= HandleThemeChanged;
                Loc.OnLanguageChanged -= ApplyLanguage;
                if (_attentionTimer != null)
                {
                    _attentionTimer.Dispose();
                    _attentionTimer = null;
                }
            }
            base.Dispose(disposing);
        }
    }
}
