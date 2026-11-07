using Loc = ModernAutoClicker.Localization.Loc;
using MaxApp.Common;
using System;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    /// <summary>
    /// Floating multi-line editor for Type Text steps, opened over the row's one-line preview.
    /// OK, Ctrl+Enter or clicking outside commits; Esc cancels. Line breaks are returned as "\n".
    /// </summary>
    public class TypeTextEditorPopup : Form
    {
        private const int EditorWidth = 320;
        private const int EditorHeight = 150;
        private const int Pad = 8;

        private readonly ThemeTokens _theme;
        private TextBox txtEditor;
        private Label lblHint;
        private RoundedButton btnOk;
        private bool _isClosing = false;

        public event Action<string> OnCommitted;

        public TypeTextEditorPopup(string text, ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();

            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.StartPosition = FormStartPosition.Manual;
            this.TopMost = true; // Stay above the map overlay
            this.KeyPreview = true;
            this.DoubleBuffered = true;
            this.BackColor = _theme.BgSecondary;
            this.Size = new Size(EditorWidth, EditorHeight);

            txtEditor = new TextBox
            {
                Multiline = true,
                AcceptsReturn = true,
                AcceptsTab = false,
                WordWrap = true,
                ScrollBars = ScrollBars.Vertical,
                BorderStyle = BorderStyle.None,
                BackColor = _theme.BgPrimary,
                ForeColor = _theme.TextPrimary,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                Text = (text ?? "").Replace("\r\n", "\n").Replace("\n", "\r\n")
            };

            lblHint = new Label
            {
                Text = Loc.TypeTextEditorHint,
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleLeft,
                ForeColor = _theme.TextTertiary,
                BackColor = Color.Transparent,
                Font = ThemeTokens.FontMicro(FontStyle.Regular)
            };

            btnOk = new RoundedButton
            {
                Text = "OK",
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                NormalColor = _theme.BgElevated,
                HoverColor = _theme.AccentPrimary,
                ForeColor = _theme.TextPrimary,
                BorderRadius = _theme.RadiusSm
            };
            btnOk.Click += (s, e) => Commit();

            this.Controls.AddRange(new Control[] { txtEditor, lblHint, btnOk });
            LayoutControls();

            this.Deactivate += (s, e) => Commit();
            this.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.Escape)
                {
                    e.Handled = true;
                    e.SuppressKeyPress = true;
                    Cancel();
                }
                else if (e.KeyCode == Keys.Enter && e.Control)
                {
                    e.Handled = true;
                    e.SuppressKeyPress = true;
                    Commit();
                }
            };
        }

        private void LayoutControls()
        {
            int w = this.ClientSize.Width;
            int h = this.ClientSize.Height;
            int btnW = 60;
            int btnH = 24;

            txtEditor.Location = new Point(Pad, Pad);
            txtEditor.Size = new Size(w - Pad * 2, h - Pad * 3 - btnH);
            btnOk.Location = new Point(w - Pad - btnW, h - Pad - btnH);
            btnOk.Size = new Size(btnW, btnH);
            lblHint.Location = new Point(Pad, h - Pad - btnH);
            lblHint.Size = new Size(w - Pad * 3 - btnW, btnH);
        }

        /// <summary>
        /// Shows the editor with its top-left corner at the anchor (overlapping the table), kept inside the screen's working area.
        /// </summary>
        public void ShowAt(IWin32Window owner, Point anchorScreenPt, int anchorWidth)
        {
            this.Width = Math.Max(EditorWidth, anchorWidth);
            LayoutControls();

            Rectangle area = Screen.FromPoint(anchorScreenPt).WorkingArea;
            int x = Math.Max(area.Left, Math.Min(anchorScreenPt.X, area.Right - this.Width));
            int y = Math.Max(area.Top, Math.Min(anchorScreenPt.Y, area.Bottom - this.Height));
            this.Location = new Point(x, y);

            this.Show(owner);
            this.Activate();
            txtEditor.Focus();
            txtEditor.SelectionStart = txtEditor.TextLength;
        }

        private void Commit()
        {
            if (_isClosing) return;
            _isClosing = true;
            string result = txtEditor.Text.Replace("\r\n", "\n");
            if (OnCommitted != null) OnCommitted(result);
            this.Close();
        }

        private void Cancel()
        {
            if (_isClosing) return;
            _isClosing = true;
            this.Close();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            using (Pen pen = new Pen(_theme.AccentPrimary, 1f))
            {
                e.Graphics.DrawRectangle(pen, 0, 0, this.Width - 1, this.Height - 1);
            }
        }
    }
}
