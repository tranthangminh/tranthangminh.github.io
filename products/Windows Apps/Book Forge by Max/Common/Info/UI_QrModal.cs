using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Modal dialog displaying the Vietcombank donation QR code.
    /// Supports high-fidelity multi-color SVG rendering with fallback placeholders.
    /// </summary>
    public class QrModal : Form
    {
        private ThemeTokens _theme;
        private Button btnCloseIcon;
        private Panel pnlQrCard;
        private Label lblThank;
        private RoundedButton btnClose;

        public QrModal(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();

            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.StartPosition = FormStartPosition.CenterParent;
            this.Size = new Size(320, 368);
            this.DoubleBuffered = true;
            this.KeyPreview = true;

            this.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    CommonNativeMethods.ReleaseCapture();
                    CommonNativeMethods.SendMessage(this.Handle, CommonNativeMethods.WM_NCLBUTTONDOWN, (IntPtr)CommonNativeMethods.HTCAPTION, IntPtr.Zero);
                }
            };

            this.KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.Escape)
                {
                    this.Close();
                }
            };

            InitializeComponents();
            ApplyTheme(_theme);
        }

        private void InitializeComponents()
        {
            // Close Icon [✕]
            btnCloseIcon = new Button
            {
                Text = "✕",
                Location = new Point(282, 10),
                Size = new Size(26, 26),
                FlatStyle = FlatStyle.Flat,
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                Cursor = Cursors.Hand
            };
            btnCloseIcon.FlatAppearance.BorderSize = 0;
            btnCloseIcon.Click += (s, e) => this.Close();

            // QR Display Card (240 x 240)
            pnlQrCard = new Panel
            {
                Location = new Point((320 - 240) / 2, 36),
                Size = new Size(240, 240),
                BackColor = Color.Transparent
            };
            pnlQrCard.Paint += DrawQrContent;

            // Thank you label
            lblThank = new Label
            {
                Text = Loc.QrThankYou,
                Location = new Point(10, 286),
                Size = new Size(300, 22),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                UseMnemonic = false
            };

            // Close Button
            btnClose = new RoundedButton
            {
                Text = Loc.Close,
                Location = new Point((320 - 110) / 2, 318),
                Size = new Size(110, 32),
                Font = ThemeTokens.FontSmall(FontStyle.Bold),
                ForeColor = Color.White,
                Cursor = Cursors.Hand
            };
            btnClose.Click += (s, e) => this.Close();

            this.Controls.AddRange(new Control[] {
                btnCloseIcon, pnlQrCard, lblThank, btnClose
            });
        }

        private void DrawQrContent(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            GraphicsHelper.ApplyHighQuality(g);

            int w = 240;
            int h = 240;

            // 1. Render vector SVG QR_Vietcombank.svg
            Bitmap bmpQr = SvgFileRenderer.RenderSvg("QR_Vietcombank.svg", 232, 232, null);
            if (bmpQr == null)
            {
                bmpQr = SvgFileRenderer.RenderSvg("qr-bank.svg", 220, 220, Color.FromArgb(18, 18, 18));
            }
            if (bmpQr == null)
            {
                bmpQr = TryLoadRasterQr(220, 220);
            }

            if (bmpQr != null)
            {
                using (GraphicsPath cardPath = GraphicsHelper.GetRoundedRectangle(new Rectangle(0, 0, w, h), 8))
                {
                    using (SolidBrush whiteBrush = new SolidBrush(Color.White))
                    {
                        g.FillPath(whiteBrush, cardPath);
                    }
                    Color borderColor = (_theme != null) ? _theme.BorderColor : Color.FromArgb(200, 200, 200);
                    using (Pen borderPen = new Pen(borderColor, 1))
                    {
                        g.DrawPath(borderPen, cardPath);
                    }
                }

                int drawX = (w - bmpQr.Width) / 2;
                int drawY = (h - bmpQr.Height) / 2;
                g.DrawImage(bmpQr, drawX, drawY);
                bmpQr.Dispose();
            }
            else
            {
                RenderQrPlaceholder(g, w, h);
            }
        }

        private void RenderQrPlaceholder(Graphics g, int w, int h)
        {
            Color bg = (_theme != null) ? _theme.BgTertiary : Color.FromArgb(35, 35, 45);
            Color border = (_theme != null) ? _theme.BorderColor : Color.FromArgb(70, 70, 85);
            Color textPrimary = (_theme != null) ? _theme.TextPrimary : Color.White;
            Color textSecondary = (_theme != null) ? _theme.TextSecondary : Color.FromArgb(160, 160, 175);
            Color accent = (_theme != null) ? _theme.AccentPrimary : Color.FromArgb(100, 102, 233);

            using (GraphicsPath path = GraphicsHelper.GetRoundedRectangle(new Rectangle(0, 0, w, h), 8))
            {
                using (SolidBrush bgBrush = new SolidBrush(bg))
                {
                    g.FillPath(bgBrush, path);
                }
                using (Pen pen = new Pen(border, 1.5f))
                {
                    pen.DashStyle = DashStyle.Dash;
                    g.DrawPath(pen, path);
                }
            }

            int iconSize = 64;
            int iconX = (w - iconSize) / 2;
            int iconY = 32;
            int arm = 16;

            using (Pen iconPen = new Pen(accent, 2.5f))
            {
                iconPen.StartCap = LineCap.Round;
                iconPen.EndCap = LineCap.Round;

                // Top-left
                g.DrawLine(iconPen, iconX, iconY + arm, iconX, iconY);
                g.DrawLine(iconPen, iconX, iconY, iconX + arm, iconY);

                // Top-right
                g.DrawLine(iconPen, iconX + iconSize - arm, iconY, iconX + iconSize, iconY);
                g.DrawLine(iconPen, iconX + iconSize, iconY, iconX + iconSize, iconY + arm);

                // Bottom-left
                g.DrawLine(iconPen, iconX, iconY + iconSize - arm, iconX, iconY + iconSize);
                g.DrawLine(iconPen, iconX, iconY + iconSize, iconX + arm, iconY + iconSize);

                // Bottom-right
                g.DrawLine(iconPen, iconX + iconSize - arm, iconY + iconSize, iconX + iconSize, iconY + iconSize);
                g.DrawLine(iconPen, iconX + iconSize, iconY + iconSize - arm, iconX + iconSize, iconY + iconSize);

                using (SolidBrush dotBrush = new SolidBrush(accent))
                {
                    g.FillEllipse(dotBrush, iconX + 22, iconY + 22, 20, 20);
                }
            }

            using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                using (Font fontTitle = ThemeTokens.FontCard(FontStyle.Bold))
                using (SolidBrush brushTitle = new SolidBrush(textPrimary))
                {
                    g.DrawString("[ QR Code ]", fontTitle, brushTitle, new RectangleF(10, 116, w - 20, 24), sf);
                }

                using (Font fontSub = ThemeTokens.FontSmall(FontStyle.Regular))
                using (SolidBrush brushSub = new SolidBrush(textSecondary))
                {
                    g.DrawString("Vietcombank QR", fontSub, brushSub, new RectangleF(10, 148, w - 20, 20), sf);
                }
            }
        }

        private Bitmap TryLoadRasterQr(int maxW, int maxH)
        {
            string[] names = new string[] { "qr-bank.png", "qr-bank.jpg", "qr-bank.jpeg" };
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            foreach (string name in names)
            {
                string p1 = Path.Combine(baseDir, name);
                if (File.Exists(p1)) return LoadImageSafely(p1, maxW, maxH);

                string p2 = Path.Combine(baseDir, "Info", name);
                if (File.Exists(p2)) return LoadImageSafely(p2, maxW, maxH);
            }
            return null;
        }

        private Bitmap LoadImageSafely(string file, int maxW, int maxH)
        {
            try
            {
                using (FileStream fs = new FileStream(file, FileMode.Open, FileAccess.Read))
                {
                    using (Image orig = Image.FromStream(fs))
                    {
                        Bitmap bmp = new Bitmap(maxW, maxH);
                        using (Graphics g = Graphics.FromImage(bmp))
                        {
                            GraphicsHelper.ApplyHighQuality(g);
                            g.DrawImage(orig, 0, 0, maxW, maxH);
                        }
                        return bmp;
                    }
                }
            }
            catch { return null; }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            GraphicsHelper.ApplyHighQuality(g);

            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            using (GraphicsPath path = GraphicsHelper.GetRoundedRectangle(rect, 8))
            {
                using (SolidBrush brush = new SolidBrush(this.BackColor))
                {
                    g.FillPath(brush, path);
                }
                Color border = (_theme != null) ? _theme.BorderColor : Color.FromArgb(70, 70, 85);
                using (Pen pen = new Pen(border, 1.2f))
                {
                    g.DrawPath(pen, path);
                }
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            if (t == null) return;

            this.BackColor = t.BgSecondary;

            if (btnCloseIcon != null)
            {
                btnCloseIcon.BackColor = Color.Transparent;
                btnCloseIcon.ForeColor = t.TextSecondary;
            }
            if (lblThank != null) lblThank.ForeColor = t.TextPrimary;

            if (btnClose != null)
            {
                btnClose.NormalColor = t.AccentPrimary;
                btnClose.HoverColor = t.AccentPrimaryHover;
                btnClose.BorderRadius = t.RadiusMd;
            }

            if (pnlQrCard != null) pnlQrCard.Invalidate();
            this.Invalidate();
        }
    }
}
