using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Info
{
    public class InfoView_Vi : Panel
    {
        private ThemeTokens _theme;
        private Panel picAppIcon;
        private Label lblInfoTitle;
        private Label lblInfoAuthor;
        private Label lblInfoContact;
        private Label lblFbTitle;
        private LinkLabel linkFb;
        private Label lblWebTitle;
        private LinkLabel linkWeb;
        private LinkLabel linkBunGioHeo;
        private Label lblSupportTitle;
        private LinkLabel linkSupport;
        private Panel picLogo;
        private RoundedButton btnCheckUpdates;
        private Label lblUpdateStatus;
        private Label lblLangTitle;
        private RoundedButton btnLangEn;
        private RoundedButton btnLangVi;

        public InfoView_Vi()
        {
            this.Size = new Size(388, 508);
            this.Margin = new Padding(0);
            this.BackColor = Color.Transparent;
            this.DoubleBuffered = true;

            InitializeComponents();
        }

        private void InitializeComponents()
        {
            picAppIcon = new Panel
            {
                Location = new Point(20, 15),
                Size = new Size(24, 24),
                BackColor = Color.Transparent
            };
            picAppIcon.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                e.Graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                Image img = SvgFileRenderer.GetAppIconImage(24);
                if (img != null)
                {
                    e.Graphics.DrawImage(img, 0, 0, 24, 24);
                }
            };

            lblInfoTitle = new Label
            {
                Text = GetAppTitle(),
                Location = new Point(48, 16),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(16F, FontStyle.Bold),
                UseMnemonic = false
            };

            lblInfoAuthor = new Label
            {
                Text = "Sản phẩm này được phát triển bởi Trần Thắng Minh (Max).",
                Location = new Point(20, 46),
                Size = new Size(348, 20),
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Regular),
                UseMnemonic = false
            };

            lblInfoContact = new Label
            {
                Text = "Góp ý, yêu cầu tính năng hoặc hỗ trợ:",
                Location = new Point(20, 68),
                Size = new Size(348, 18),
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Regular),
                UseMnemonic = false
            };

            lblFbTitle = new Label
            {
                Text = "• Facebook:",
                Location = new Point(20, 90),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                UseMnemonic = false
            };

            linkFb = new LinkLabel
            {
                Text = "fb.me/maxiechen",
                Location = new Point(136, 90),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            linkFb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://fb.me/maxiechen") { UseShellExecute = true }); } catch { }
            };

            lblWebTitle = new Label
            {
                Text = "• Sản phẩm khác:",
                Location = new Point(20, 112),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                UseMnemonic = false
            };

            linkWeb = new LinkLabel
            {
                Text = "tranthangminh.github.io/products",
                Location = new Point(136, 112),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            linkWeb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://tranthangminh.github.io/products") { UseShellExecute = true }); } catch { }
            };

            // Mục Ủng Hộ Tác Giả (Text Link click mở popup QR) - Nằm trên Bún Giò Heo
            lblSupportTitle = new Label
            {
                Text = "• Ủng hộ tác giả:",
                Location = new Point(20, 134),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                UseMnemonic = false
            };

            linkSupport = new LinkLabel
            {
                Text = "[Quét mã QR Ngân Hàng ↗]",
                Location = new Point(136, 134),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            linkSupport.LinkClicked += (s, e) =>
            {
                using (QrModal modal = new QrModal(_theme))
                {
                    modal.ShowDialog(this.FindForm());
                }
            };

            // Mục Quán Bún Giò Heo Minh Nhật - Nằm dưới Ủng hộ tác giả
            linkBunGioHeo = new LinkLabel
            {
                Text = "• Ủng hộ Bún Giò Heo Minh Nhật nhà tui",
                Location = new Point(20, 156),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                UseMnemonic = false
            };
            int bgStart = linkBunGioHeo.Text.IndexOf("Bún Giò Heo Minh Nhật");
            if (bgStart >= 0)
            {
                linkBunGioHeo.LinkArea = new LinkArea(bgStart, "Bún Giò Heo Minh Nhật".Length);
            }
            linkBunGioHeo.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://maps.app.goo.gl/uAK6PqGx5X3GuMFF8") { UseShellExecute = true }); } catch { }
            };

            // LOGO MAX SVG LỚN Ở VỊ TRÍ TRUNG TÂM (150 x 150) - CỐ ĐỊNH Y = 180
            picLogo = new Panel
            {
                Location = new Point((388 - 150) / 2, 180),
                Size = new Size(150, 150),
                BackColor = Color.Transparent
            };
            picLogo.Paint += (s, e) =>
            {
                Color accent = (_theme != null) ? _theme.AccentPrimary : Color.FromArgb(100, 102, 233);
                using (Bitmap bmp = SvgFileRenderer.RenderLogoFromFile(150, 150, accent))
                {
                    if (bmp != null) e.Graphics.DrawImage(bmp, 0, 0);
                }
            };

            btnCheckUpdates = new RoundedButton
            {
                Text = "Kiểm tra cập nhật",
                Location = new Point((388 - 180) / 2, 344),
                Size = new Size(180, 32),
                ForeColor = Color.White,
                Font = ThemeTokens.FontSegoe(10F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCheckUpdates.Click += (s, e) =>
            {
                btnCheckUpdates.Enabled = false;
                if (_theme != null) lblUpdateStatus.ForeColor = _theme.TextSecondary;
                lblUpdateStatus.Text = "Đang kiểm tra cập nhật...";
                UpdateChecker.CheckForUpdatesAsync(true, this.FindForm(), (res) =>
                {
                    btnCheckUpdates.Enabled = true;
                    if (res.Success)
                    {
                        if (res.HasUpdate)
                        {
                            if (_theme != null) lblUpdateStatus.ForeColor = _theme.CYellow;
                            lblUpdateStatus.Text = string.Format("Đã có phiên bản mới: v{0}!", res.RemoteVersion);
                        }
                        else
                        {
                            if (_theme != null) lblUpdateStatus.ForeColor = _theme.CGreen;
                            lblUpdateStatus.Text = string.Format("Bạn đang dùng phiên bản mới nhất (v{0}).", GetAppVersion());
                        }
                    }
                    else
                    {
                        if (_theme != null) lblUpdateStatus.ForeColor = _theme.Danger;
                        lblUpdateStatus.Text = "Kiểm tra thất bại. Không có kết nối mạng.";
                    }
                });
            };

            lblUpdateStatus = new Label
            {
                Text = "Bấm nút phía trên để kiểm tra bản mới",
                Location = new Point(20, 380),
                Size = new Size(348, 20),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = ThemeTokens.FontSegoe(9.5F, FontStyle.Regular),
                UseMnemonic = false
            };

            lblLangTitle = new Label
            {
                Text = "• Ngôn ngữ:",
                Location = new Point(20, 412),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                UseMnemonic = false
            };

            btnLangEn = new RoundedButton
            {
                Text = "English",
                Location = new Point(148, 408),
                Size = new Size(96, 28),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLangEn.Click += (s, e) => Loc.CurrentLanguage = AppLanguage.English;

            btnLangVi = new RoundedButton
            {
                Text = "Tiếng Việt",
                Location = new Point(252, 408),
                Size = new Size(100, 28),
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLangVi.Click += (s, e) => Loc.CurrentLanguage = AppLanguage.Vietnamese;

            this.Controls.AddRange(new Control[] {
                picAppIcon, lblInfoTitle, lblInfoAuthor, lblInfoContact,
                lblFbTitle, linkFb, lblWebTitle, linkWeb,
                lblSupportTitle, linkSupport,
                linkBunGioHeo,
                picLogo,
                btnCheckUpdates, lblUpdateStatus,
                lblLangTitle, btnLangEn, btnLangVi
            });
        }

        private string GetAppTitle()
        {
            try { return AppInfo.Title; } catch { }
            try { return Application.ProductName; } catch { }
            return "Auto Clicker by Max";
        }

        private string GetAppVersion()
        {
            try { return AppInfo.Version; } catch { }
            try { return Application.ProductVersion; } catch { }
            return "1.0";
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            if (t == null) return;

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
            if (linkBunGioHeo != null)
            {
                linkBunGioHeo.ForeColor = t.TextSecondary;
                linkBunGioHeo.LinkColor = t.AccentPrimary;
                linkBunGioHeo.ActiveLinkColor = t.AccentPrimaryHover;
                linkBunGioHeo.VisitedLinkColor = t.AccentPrimary;
            }
            if (linkSupport != null)
            {
                linkSupport.LinkColor = t.AccentPrimary;
                linkSupport.ActiveLinkColor = t.AccentPrimaryHover;
                linkSupport.VisitedLinkColor = t.AccentPrimary;
            }

            if (picAppIcon != null) picAppIcon.Invalidate();
            if (picLogo != null) picLogo.Invalidate();

            if (btnCheckUpdates != null)
            {
                btnCheckUpdates.NormalColor = t.AccentPrimary;
                btnCheckUpdates.HoverColor = t.AccentPrimaryHover;
                btnCheckUpdates.BorderRadius = t.RadiusMd;
            }
            if (lblUpdateStatus != null) lblUpdateStatus.ForeColor = t.TextSecondary;
            if (lblLangTitle != null) lblLangTitle.ForeColor = t.TextSecondary;

            UpdateLanguageButtonsStyle();
        }

        public void UpdateLanguageButtonsStyle()
        {
            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();
            bool isVi = Loc.IsVietnamese;

            if (btnLangEn != null)
            {
                btnLangEn.NormalColor = !isVi ? t.AccentPrimary : t.BgElevated;
                btnLangEn.HoverColor = !isVi ? t.AccentPrimaryHover : t.AccentPrimary;
                btnLangEn.ForeColor = !isVi ? Color.White : t.TextSecondary;
                btnLangEn.BorderRadius = t.RadiusSm;
                btnLangEn.Invalidate();
            }

            if (btnLangVi != null)
            {
                btnLangVi.NormalColor = isVi ? t.AccentPrimary : t.BgElevated;
                btnLangVi.HoverColor = isVi ? t.AccentPrimaryHover : t.AccentPrimary;
                btnLangVi.ForeColor = isVi ? Color.White : t.TextSecondary;
                btnLangVi.BorderRadius = t.RadiusSm;
                btnLangVi.Invalidate();
            }
        }
    }
}
