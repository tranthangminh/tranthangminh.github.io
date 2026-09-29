using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace ModernAutoClicker.Info
{
    public class QrModal : Form
    {
        private ThemeTokens _theme;
        private Label lblTitle;
        private Button btnCloseIcon;
        private Panel pnlQrCard;
        private Label lblQrHint;
        private Label lblThank;
        private RoundedButton btnClose;

        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();
        [DllImport("user32.dll")]
        private static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);
        private const int WM_NCLBUTTONDOWN = 0xA1;
        private const int HTCAPTION = 0x2;

        public QrModal(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();

            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.StartPosition = FormStartPosition.CenterParent;
            this.Size = new Size(320, 420);
            this.DoubleBuffered = true;
            this.KeyPreview = true;

            this.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    ReleaseCapture();
                    SendMessage(this.Handle, WM_NCLBUTTONDOWN, HTCAPTION, 0);
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
            // Title
            lblTitle = new Label
            {
                Text = "Ủng hộ tác giả (Chuyển khoản / QR)",
                Location = new Point(16, 16),
                Size = new Size(250, 20),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                UseMnemonic = false
            };
            lblTitle.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    ReleaseCapture();
                    SendMessage(this.Handle, WM_NCLBUTTONDOWN, HTCAPTION, 0);
                }
            };

            // Close Icon [✕]
            btnCloseIcon = new Button
            {
                Text = "✕",
                Location = new Point(282, 12),
                Size = new Size(26, 26),
                FlatStyle = FlatStyle.Flat,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Regular),
                Cursor = Cursors.Hand
            };
            btnCloseIcon.FlatAppearance.BorderSize = 0;
            btnCloseIcon.Click += (s, e) => this.Close();

            // QR Display Card (240 x 240)
            pnlQrCard = new Panel
            {
                Location = new Point((320 - 240) / 2, 48),
                Size = new Size(240, 240),
                BackColor = Color.Transparent
            };
            pnlQrCard.Paint += DrawQrContent;

            // Hint label
            lblQrHint = new Label
            {
                Text = "Mở App Ngân Hàng hoặc Ví MoMo để quét mã",
                Location = new Point(10, 298),
                Size = new Size(300, 18),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = ThemeTokens.FontSegoe(9.5F, FontStyle.Regular),
                UseMnemonic = false
            };

            // Thank you label
            lblThank = new Label
            {
                Text = "Cảm ơn bạn đã ủng hộ tác giả!",
                Location = new Point(10, 320),
                Size = new Size(300, 20),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = ThemeTokens.FontSegoe(10F, FontStyle.Bold),
                UseMnemonic = false
            };

            // Close Button
            btnClose = new RoundedButton
            {
                Text = "Đóng",
                Location = new Point((320 - 110) / 2, 356),
                Size = new Size(110, 32),
                Font = ThemeTokens.FontSegoe(10F, FontStyle.Bold),
                ForeColor = Color.White,
                Cursor = Cursors.Hand
            };
            btnClose.Click += (s, e) => this.Close();

            this.Controls.AddRange(new Control[] {
                lblTitle, btnCloseIcon, pnlQrCard, lblQrHint, lblThank, btnClose
            });
        }

        private void DrawQrContent(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            int w = 240;
            int h = 240;

            // 1. Kiểm tra render vector SVG QR_Vietcombank.svg (multi-color) hoặc fallback qr-bank.svg
            Bitmap bmpQr = SvgFileRenderer.RenderSvg("QR_Vietcombank.svg", 232, 232, null);
            if (bmpQr == null)
            {
                bmpQr = SvgFileRenderer.RenderSvg("qr-bank.svg", 220, 220, Color.FromArgb(18, 18, 18));
            }
            if (bmpQr == null)
            {
                // Fallback nạp raster png / jpg nếu có
                bmpQr = TryLoadRasterQr(220, 220);
            }

            if (bmpQr != null)
            {
                // Có mã QR: Vẽ card trắng sáng với bo góc 8px để đạt độ tương phản quét tối đa
                using (GraphicsPath cardPath = CreateRoundedPath(new Rectangle(0, 0, w, h), 8))
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
                // Chưa có file QR: Hiển thị placeholder lớn sang trọng theo theme
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

            using (GraphicsPath path = CreateRoundedPath(new Rectangle(0, 0, w, h), 8))
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

            // Biểu tượng khung ngắm quét QR lớn
            int iconSize = 64;
            int iconX = (w - iconSize) / 2;
            int iconY = 32;
            int arm = 16;

            using (Pen iconPen = new Pen(accent, 2.5f))
            {
                iconPen.StartCap = LineCap.Round;
                iconPen.EndCap = LineCap.Round;

                // Góc trên trái
                g.DrawLine(iconPen, iconX, iconY + arm, iconX, iconY);
                g.DrawLine(iconPen, iconX, iconY, iconX + arm, iconY);

                // Góc trên phải
                g.DrawLine(iconPen, iconX + iconSize - arm, iconY, iconX + iconSize, iconY);
                g.DrawLine(iconPen, iconX + iconSize, iconY, iconX + iconSize, iconY + arm);

                // Góc dưới trái
                g.DrawLine(iconPen, iconX, iconY + iconSize - arm, iconX, iconY + iconSize);
                g.DrawLine(iconPen, iconX, iconY + iconSize, iconX + arm, iconY + iconSize);

                // Góc dưới phải
                g.DrawLine(iconPen, iconX + iconSize - arm, iconY + iconSize, iconX + iconSize, iconY + iconSize);
                g.DrawLine(iconPen, iconX + iconSize, iconY + iconSize - arm, iconX + iconSize, iconY + iconSize);

                // Chấm quét trung tâm
                using (SolidBrush dotBrush = new SolidBrush(accent))
                {
                    g.FillEllipse(dotBrush, iconX + 22, iconY + 22, 20, 20);
                }
            }

            // Text placeholder
            using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                using (Font fontTitle = ThemeTokens.FontSegoe(13F, FontStyle.Bold))
                using (SolidBrush brushTitle = new SolidBrush(textPrimary))
                {
                    g.DrawString("[ Mã QR Chuyển Khoản ]", fontTitle, brushTitle, new RectangleF(10, 116, w - 20, 24), sf);
                }

                using (Font fontSub = ThemeTokens.FontSegoe(10F, FontStyle.Regular))
                using (SolidBrush brushSub = new SolidBrush(textSecondary))
                {
                    g.DrawString("(Chưa có file qr-bank.svg)", fontSub, brushSub, new RectangleF(10, 148, w - 20, 20), sf);
                }

                using (Font fontGuide = ThemeTokens.FontSegoe(9F, FontStyle.Italic))
                using (SolidBrush brushGuide = new SolidBrush(accent))
                {
                    g.DrawString("Thêm file qr-bank.svg vào thư mục Info/", fontGuide, brushGuide, new RectangleF(10, 174, w - 20, 36), sf);
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
                            g.SmoothingMode = SmoothingMode.AntiAlias;
                            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                            g.DrawImage(orig, 0, 0, maxW, maxH);
                        }
                        return bmp;
                    }
                }
            }
            catch { return null; }
        }

        private GraphicsPath CreateRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

            // Vẽ viền và nền form bo góc
            Rectangle rect = new Rectangle(0, 0, this.Width - 1, this.Height - 1);
            using (GraphicsPath path = CreateRoundedPath(rect, 8))
            {
                using (SolidBrush brush = new SolidBrush(this.BackColor))
                {
                    e.Graphics.FillPath(brush, path);
                }
                Color border = (_theme != null) ? _theme.BorderColor : Color.FromArgb(70, 70, 85);
                using (Pen pen = new Pen(border, 1.2f))
                {
                    e.Graphics.DrawPath(pen, path);
                }
            }
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            if (t == null) return;

            this.BackColor = t.BgSecondary;

            if (lblTitle != null) lblTitle.ForeColor = t.TextPrimary;
            if (btnCloseIcon != null)
            {
                btnCloseIcon.BackColor = Color.Transparent;
                btnCloseIcon.ForeColor = t.TextSecondary;
            }
            if (lblQrHint != null) lblQrHint.ForeColor = t.TextSecondary;
            if (lblThank != null) lblThank.ForeColor = t.AccentPrimary;

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
