using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

namespace BookForge
{
    public class InfoTabPanel : Panel
    {
        private ThemeTokens _theme;
        private Panel pnlInfoCard;
        private Panel picAppIcon;
        private Label lblInfoTitle;
        private Label lblInfoAuthor;
        private Label lblInfoContact;
        private Label lblFbTitle;
        private LinkLabel linkFb;
        private Label lblWebTitle;
        private LinkLabel linkWeb;
        private Label lblSupportTitle;
        private LinkLabel linkSupport;
        private Panel picLogo;

        public InfoTabPanel()
        {
            _theme = ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.UserPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);

            InitializeComponents();
            ApplyTheme(_theme);
        }

        private void InitializeComponents()
        {
            pnlInfoCard = new Panel
            {
                Location = new Point(16, 8),
                Size = new Size(Math.Max(300, this.Width - 32), Math.Max(300, this.Height - 16)),
                BackColor = _theme.BgSecondary
            };
            pnlInfoCard.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                ThemeTokens t = _theme ?? ThemeTokens.Current;
                int radius = t.RadiusMd;
                Rectangle r = new Rectangle(0, 0, pnlInfoCard.Width - 1, pnlInfoCard.Height - 1);
                using (GraphicsPath path = GetRoundedPath(r, radius))
                {
                    using (SolidBrush bg = new SolidBrush(t.BgSecondary))
                    {
                        e.Graphics.FillPath(bg, path);
                    }
                    using (Pen pen = new Pen(t.BorderColor, 1f))
                    {
                        e.Graphics.DrawPath(pen, path);
                    }
                }
            };

            picAppIcon = new Panel
            {
                Location = new Point(24, 20),
                Size = new Size(24, 24),
                BackColor = Color.Transparent
            };
            picAppIcon.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                Image img = Core_SvgRenderer.GetAppIconImage(24);
                if (img != null)
                {
                    e.Graphics.DrawImage(img, 0, 0, 24, 24);
                }
            };

            lblInfoTitle = new Label
            {
                Text = "Book Forge by Max v1.0 (Beta)",
                Location = new Point(56, 18),
                AutoSize = true,
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                ForeColor = _theme.AccentPrimary,
                BackColor = Color.Transparent
            };

            lblInfoAuthor = new Label
            {
                Text = "This product is developed by Trần Thắng Minh (Max).",
                Location = new Point(24, 52),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                ForeColor = _theme.TextPrimary,
                BackColor = Color.Transparent
            };

            lblInfoContact = new Label
            {
                Text = "For feedback, feature requests, or support:",
                Location = new Point(24, 78),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                ForeColor = _theme.TextSecondary,
                BackColor = Color.Transparent
            };

            lblFbTitle = new Label
            {
                Text = "• Facebook:",
                Location = new Point(24, 102),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary,
                BackColor = Color.Transparent
            };

            linkFb = new LinkLabel
            {
                Text = "fb.me/maxiechen",
                Location = new Point(145, 102),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                LinkColor = _theme.AccentPrimary,
                ActiveLinkColor = _theme.AccentPrimaryHover,
                VisitedLinkColor = _theme.AccentPrimary,
                BackColor = Color.Transparent,
                Cursor = Cursors.Hand
            };
            linkFb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://fb.me/maxiechen") { UseShellExecute = true }); } catch { }
            };

            lblWebTitle = new Label
            {
                Text = "• Other Products:",
                Location = new Point(24, 126),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary,
                BackColor = Color.Transparent
            };

            linkWeb = new LinkLabel
            {
                Text = "tranthangminh.github.io/products",
                Location = new Point(145, 126),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                LinkColor = _theme.AccentPrimary,
                ActiveLinkColor = _theme.AccentPrimaryHover,
                VisitedLinkColor = _theme.AccentPrimary,
                BackColor = Color.Transparent,
                Cursor = Cursors.Hand
            };
            linkWeb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://tranthangminh.github.io/products") { UseShellExecute = true }); } catch { }
            };

            lblSupportTitle = new Label
            {
                Text = "• Support me:",
                Location = new Point(24, 150),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary,
                BackColor = Color.Transparent
            };

            linkSupport = new LinkLabel
            {
                Text = "ko-fi.com/maxiechen96",
                Location = new Point(145, 150),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                LinkColor = _theme.AccentPrimary,
                ActiveLinkColor = _theme.AccentPrimaryHover,
                VisitedLinkColor = _theme.AccentPrimary,
                BackColor = Color.Transparent,
                Cursor = Cursors.Hand
            };
            linkSupport.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://ko-fi.com/maxiechen96") { UseShellExecute = true }); } catch { }
            };

            picLogo = new Panel
            {
                Size = new Size(200, 200),
                BackColor = Color.Transparent
            };
            picLogo.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                Color tint = (_theme != null) ? _theme.AccentPrimary : Color.FromArgb(41, 128, 185);
                using (Bitmap bmp = Core_SvgRenderer.RenderLogoFromFile(picLogo.Width, picLogo.Height, tint))
                {
                    if (bmp != null) e.Graphics.DrawImage(bmp, 0, 0);
                }
            };

            pnlInfoCard.Controls.AddRange(new Control[] {
                picAppIcon, lblInfoTitle, lblInfoAuthor, lblInfoContact,
                lblFbTitle, linkFb, lblWebTitle, linkWeb,
                lblSupportTitle, linkSupport,
                picLogo
            });

            this.Controls.Add(pnlInfoCard);
        }

        public void UpdateLayout()
        {
            if (pnlInfoCard == null) return;

            int cardW = Math.Max(200, this.ClientSize.Width - 32);
            int cardH = Math.Max(200, this.ClientSize.Height - 16);
            pnlInfoCard.SetBounds(16, 8, cardW, cardH);

            if (picLogo != null)
            {
                int logoSize = Math.Min(220, Math.Max(140, Math.Min(cardW - 40, cardH - 220)));
                picLogo.Size = new Size(logoSize, logoSize);
                int logoX = (cardW - logoSize) / 2;
                int remainingH = cardH - 180;
                int logoY = 180 + Math.Max(10, (remainingH - logoSize) / 2);
                picLogo.Location = new Point(logoX, logoY);
            }

            pnlInfoCard.Invalidate();
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            UpdateLayout();
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            this.BackColor = t.BgPrimary;

            if (pnlInfoCard != null)
            {
                pnlInfoCard.BackColor = t.BgSecondary;
                pnlInfoCard.Invalidate();
            }

            if (picAppIcon != null) picAppIcon.Invalidate();
            if (lblInfoTitle != null) lblInfoTitle.ForeColor = t.AccentPrimary;
            if (lblInfoAuthor != null) lblInfoAuthor.ForeColor = t.TextPrimary;
            if (lblInfoContact != null) lblInfoContact.ForeColor = t.TextSecondary;
            if (lblFbTitle != null) lblFbTitle.ForeColor = t.TextSecondary;
            if (lblWebTitle != null) lblWebTitle.ForeColor = t.TextSecondary;
            if (lblSupportTitle != null) lblSupportTitle.ForeColor = t.TextSecondary;

            if (linkFb != null)
            {
                linkFb.LinkColor = t.AccentPrimary;
                linkFb.ActiveLinkColor = t.AccentPrimaryHover;
                linkFb.VisitedLinkColor = t.AccentPrimary;
            }

            if (linkWeb != null)
            {
                linkWeb.LinkColor = t.AccentPrimary;
                linkWeb.ActiveLinkColor = t.AccentPrimaryHover;
                linkWeb.VisitedLinkColor = t.AccentPrimary;
            }

            if (linkSupport != null)
            {
                linkSupport.LinkColor = t.AccentPrimary;
                linkSupport.ActiveLinkColor = t.AccentPrimaryHover;
                linkSupport.VisitedLinkColor = t.AccentPrimary;
            }

            if (picLogo != null) picLogo.Invalidate();
            Invalidate(true);
        }

        private static GraphicsPath GetRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            if (diameter > rect.Width) diameter = rect.Width;
            if (diameter > rect.Height) diameter = rect.Height;

            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }
}
