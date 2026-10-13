using System;
using System.Drawing;
using System.Windows.Forms;

namespace MaxApp.Common
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
        private Label lblSupportTitle;
        private LinkLabel linkSupport;
        private Label lblBunGioHeoPrefix;
        private LinkLabel linkBunGioHeo;
        private Label lblBunGioHeoSuffix;
        private Panel picLogo;
        private RoundedButton btnCheckUpdates;
        private Label lblUpdateStatus;

        // Feature Toggles
        private bool _showDonationQr = true;
        private bool _showBunGioHeo = true;
        private bool _showCheckUpdates = true;

        public bool ShowDonationQr
        {
            get { return _showDonationQr; }
            set { if (_showDonationQr != value) { _showDonationQr = value; RelayoutContent(); } }
        }

        public bool ShowBunGioHeo
        {
            get { return _showBunGioHeo; }
            set { if (_showBunGioHeo != value) { _showBunGioHeo = value; RelayoutContent(); } }
        }

        public bool ShowCheckUpdates
        {
            get { return _showCheckUpdates; }
            set { if (_showCheckUpdates != value) { _showCheckUpdates = value; RelayoutContent(); } }
        }

        public InfoView_Vi()
        {
            this.Size = new Size(388, 508);
            this.Margin = new Padding(0);
            this.BackColor = Color.Transparent;
            this.DoubleBuffered = true;

            InitializeComponents();
            RelayoutContent();
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
                GraphicsHelper.ApplyHighQuality(e.Graphics);
                Image img = SvgFileRenderer.GetAppIconImage(24);
                if (img != null)
                {
                    e.Graphics.DrawImage(img, 0, 0, 24, 24);
                }
            };

            lblInfoTitle = new Label
            {
                Text = AppInfo.Title,
                Location = new Point(48, 16),
                AutoSize = true,
                Font = ThemeTokens.FontTitle(FontStyle.Bold),
                UseMnemonic = false
            };

            lblInfoAuthor = new Label
            {
                Text = "Sản phẩm này được phát triển bởi Trần Thắng Minh (Max).",
                Location = new Point(20, 46),
                Size = new Size(348, 20),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                UseMnemonic = false
            };

            lblInfoContact = new Label
            {
                Text = "Góp ý, yêu cầu tính năng hoặc hỗ trợ:",
                Location = new Point(20, 68),
                Size = new Size(348, 18),
                Font = ThemeTokens.FontBase(FontStyle.Regular),
                UseMnemonic = false
            };

            lblFbTitle = new Label
            {
                Text = "• Facebook:",
                Location = new Point(20, 90),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                UseMnemonic = false
            };

            linkFb = new LinkLabel
            {
                Text = "fb.me/maxiechen",
                Location = new Point(136, 90),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
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
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                UseMnemonic = false
            };

            linkWeb = new LinkLabel
            {
                Text = "tranthangminh.github.io/products",
                Location = new Point(136, 112),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            linkWeb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://tranthangminh.github.io/products.html?lang=vi") { UseShellExecute = true }); } catch { }
            };

            // Support (Vietcombank QR)
            lblSupportTitle = new Label
            {
                Text = "• Ủng hộ tui:",
                Location = new Point(20, 134),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                UseMnemonic = false
            };

            linkSupport = new LinkLabel
            {
                Text = "[Quét mã QR Ngân Hàng ↗]",
                Location = new Point(136, 134),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            linkSupport.LinkClicked += (s, e) =>
            {
                using (QrModal modal = new QrModal(_theme))
                {
                    modal.ShowDialog(this.FindForm());
                }
            };

            // Bun Gio Heo Minh Nhat
            lblBunGioHeoPrefix = new Label
            {
                Text = "• Ủng hộ ",
                Location = new Point(20, 156),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                UseMnemonic = false
            };

            linkBunGioHeo = new LinkLabel
            {
                Text = "Bún Giò Heo Minh Nhật",
                Location = new Point(74, 156),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                Cursor = Cursors.Hand,
                UseMnemonic = false
            };
            linkBunGioHeo.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://maps.app.goo.gl/uAK6PqGx5X3GuMFF8") { UseShellExecute = true }); } catch { }
            };

            lblBunGioHeoSuffix = new Label
            {
                Text = "nhà tui",
                Location = new Point(214, 156),
                AutoSize = true,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
                UseMnemonic = false
            };

            // Logo MAX
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
                Text = "Kiểm tra Cập nhật",
                Location = new Point((388 - 180) / 2, 344),
                Size = new Size(180, 32),
                ForeColor = Color.White,
                Font = ThemeTokens.FontBase(FontStyle.Bold),
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
                            lblUpdateStatus.Text = string.Format("Bạn đang dùng phiên bản mới nhất (v{0}).", AppInfo.Version);
                        }
                    }
                    else
                    {
                        if (_theme != null) lblUpdateStatus.ForeColor = _theme.Danger;
                        lblUpdateStatus.Text = "Kiểm tra thất bại. Vui lòng thử lại sau.";
                    }
                });
            };

            lblUpdateStatus = new Label
            {
                Text = "",
                Location = new Point(20, 382),
                Size = new Size(348, 18),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = ThemeTokens.FontSmall(FontStyle.Italic),
                UseMnemonic = false
            };
            this.Controls.AddRange(new Control[] {
                picAppIcon, lblInfoTitle, lblInfoAuthor, lblInfoContact,
                lblFbTitle, linkFb, lblWebTitle, linkWeb,
                lblSupportTitle, linkSupport,
                lblBunGioHeoPrefix, linkBunGioHeo, lblBunGioHeoSuffix,
                picLogo,
                btnCheckUpdates, lblUpdateStatus
            });
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            RelayoutContent();
        }

        public void RelayoutContent()
        {
            if (lblInfoAuthor != null) lblInfoAuthor.Size = new Size(Math.Max(300, this.Width - 40), 20);
            if (lblInfoContact != null) lblInfoContact.Size = new Size(Math.Max(300, this.Width - 40), 18);
            if (lblInfoTitle != null) lblInfoTitle.Text = AppInfo.Title;

            if (lblSupportTitle != null) lblSupportTitle.Visible = _showDonationQr;
            if (linkSupport != null) linkSupport.Visible = _showDonationQr;

            if (lblBunGioHeoPrefix != null) lblBunGioHeoPrefix.Visible = _showBunGioHeo;
            if (linkBunGioHeo != null) linkBunGioHeo.Visible = _showBunGioHeo;
            if (lblBunGioHeoSuffix != null) lblBunGioHeoSuffix.Visible = _showBunGioHeo;

            if (btnCheckUpdates != null) btnCheckUpdates.Visible = _showCheckUpdates;
            if (lblUpdateStatus != null) lblUpdateStatus.Visible = _showCheckUpdates;

            int curY = 90;
            if (lblFbTitle != null) lblFbTitle.Location = new Point(20, curY);
            if (linkFb != null) linkFb.Location = new Point(136, curY);
            curY += 22;

            if (lblWebTitle != null) lblWebTitle.Location = new Point(20, curY);
            if (linkWeb != null) linkWeb.Location = new Point(136, curY);
            curY += 22;

            if (_showDonationQr && lblSupportTitle != null && linkSupport != null)
            {
                lblSupportTitle.Location = new Point(20, curY);
                linkSupport.Location = new Point(136, curY);
                curY += 22;
            }

            if (_showBunGioHeo && lblBunGioHeoPrefix != null && linkBunGioHeo != null && lblBunGioHeoSuffix != null)
            {
                lblBunGioHeoPrefix.Location = new Point(20, curY);
                linkBunGioHeo.Location = new Point(74, curY);
                lblBunGioHeoSuffix.Location = new Point(214, curY);
                curY += 22;
            }

            curY = Math.Max(curY + 10, 175);

            if (picLogo != null)
            {
                int logoSize = 150;
                picLogo.Size = new Size(logoSize, logoSize);
                picLogo.Location = new Point(Math.Max(0, (this.Width - logoSize) / 2), curY);
                curY += logoSize + 14;
            }

            if (btnCheckUpdates != null)
            {
                int btnW = 180;
                btnCheckUpdates.Size = new Size(btnW, 32);
                btnCheckUpdates.Location = new Point(Math.Max(0, (this.Width - btnW) / 2), curY);
                curY += 32 + 6;
            }

            if (lblUpdateStatus != null)
            {
                lblUpdateStatus.Location = new Point(20, curY);
                lblUpdateStatus.Size = new Size(Math.Max(200, this.Width - 40), 18);
                curY += 18;
            }

            Invalidate();
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
            if (lblBunGioHeoPrefix != null) lblBunGioHeoPrefix.ForeColor = t.TextSecondary;
            if (lblBunGioHeoSuffix != null) lblBunGioHeoSuffix.ForeColor = t.TextSecondary;

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
            if (linkBunGioHeo != null)
            {
                linkBunGioHeo.LinkColor = t.AccentPrimary;
                linkBunGioHeo.ActiveLinkColor = t.AccentPrimaryHover;
                linkBunGioHeo.VisitedLinkColor = t.AccentPrimary;
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
        }
    }
}
