using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Info
{
    public class InfoTabPanel : Panel
    {
        private ThemeTokens _theme;
        private RoundedPanel pnlInfoCard;
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
        private Label lblLangTitle;
        private RoundedButton btnLangEn;
        private RoundedButton btnLangVi;
        private Panel picLogo;
        private RoundedButton btnCheckUpdates;
        private Label lblUpdateStatus;

        public InfoTabPanel()
        {
            _theme = ThemeTokens.DarkTheme();
            this.Size = new Size(388, 532);
            this.Margin = new Padding(0);
            this.DoubleBuffered = true;

            InitializeComponents();
            ApplyTheme(_theme);
            ApplyLanguage();
            Loc.OnLanguageChanged += ApplyLanguage;
        }

        private void InitializeComponents()
        {
            pnlInfoCard = new RoundedPanel
            {
                Location = new Point(0, 0),
                Size = new Size(388, 508),
                BorderRadius = _theme.RadiusMd,
                BorderSize = 1
            };

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
                Text = AppInfo.Title,
                Location = new Point(48, 16),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(16F, FontStyle.Bold),
                ForeColor = _theme.AccentPrimary
            };

            lblInfoAuthor = new Label
            {
                Text = "This product is developed by Trần Thắng Minh (Max).",
                Location = new Point(20, 46),
                Size = new Size(348, 20),
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Regular),
                ForeColor = _theme.TextPrimary
            };

            lblInfoContact = new Label
            {
                Text = "For feedback, feature requests, or support:",
                Location = new Point(20, 70),
                Size = new Size(348, 18),
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Regular),
                ForeColor = _theme.TextSecondary
            };

            lblFbTitle = new Label
            {
                Text = "• Facebook:",
                Location = new Point(20, 92),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            linkFb = new LinkLabel
            {
                Text = "fb.me/maxiechen",
                Location = new Point(126, 92),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                LinkColor = _theme.AccentPrimary,
                ActiveLinkColor = _theme.AccentPrimaryHover,
                VisitedLinkColor = _theme.AccentPrimary,
                Cursor = Cursors.Hand
            };
            linkFb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://fb.me/maxiechen") { UseShellExecute = true }); } catch { }
            };

            lblWebTitle = new Label
            {
                Text = "• More Products:",
                Location = new Point(20, 114),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            linkWeb = new LinkLabel
            {
                Text = "tranthangminh.github.io/products",
                Location = new Point(126, 114),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                LinkColor = _theme.AccentPrimary,
                ActiveLinkColor = _theme.AccentPrimaryHover,
                VisitedLinkColor = _theme.AccentPrimary,
                Cursor = Cursors.Hand
            };
            linkWeb.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://tranthangminh.github.io/products") { UseShellExecute = true }); } catch { }
            };

            lblSupportTitle = new Label
            {
                Text = "• Support me:",
                Location = new Point(20, 136),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            linkSupport = new LinkLabel
            {
                Text = "ko-fi.com/maxiechen96",
                Location = new Point(126, 136),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                LinkColor = _theme.AccentPrimary,
                ActiveLinkColor = _theme.AccentPrimaryHover,
                VisitedLinkColor = _theme.AccentPrimary,
                Cursor = Cursors.Hand
            };
            linkSupport.LinkClicked += (s, e) =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://ko-fi.com/maxiechen96") { UseShellExecute = true }); } catch { }
            };

            picLogo = new Panel
            {
                Location = new Point((388 - 156) / 2, 166),
                Size = new Size(156, 156),
                BackColor = Color.Transparent
            };
            picLogo.Paint += (s, e) =>
            {
                using (Bitmap bmp = SvgFileRenderer.RenderLogoFromFile(156, 156, _theme != null ? _theme.AccentPrimary : Color.FromArgb(100, 102, 233)))
                {
                    if (bmp != null) e.Graphics.DrawImage(bmp, 0, 0);
                }
            };

            btnCheckUpdates = new RoundedButton
            {
                Text = "Check for Updates",
                Location = new Point((388 - 180) / 2, 336),
                Size = new Size(180, 32),
                BorderRadius = _theme.RadiusMd,
                NormalColor = _theme.AccentPrimary,
                HoverColor = _theme.AccentPrimaryHover,
                ForeColor = Color.White,
                Font = ThemeTokens.FontSegoe(10F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCheckUpdates.Click += (s, e) =>
            {
                btnCheckUpdates.Enabled = false;
                lblUpdateStatus.ForeColor = _theme.TextSecondary;
                lblUpdateStatus.Text = Loc.UpdateChecking;
                UpdateChecker.CheckForUpdatesAsync(true, this.FindForm(), (res) =>
                {
                    btnCheckUpdates.Enabled = true;
                    if (res.Success)
                    {
                        if (res.HasUpdate)
                        {
                            lblUpdateStatus.ForeColor = _theme.CYellow;
                            lblUpdateStatus.Text = Loc.UpdateAvailable(res.RemoteVersion);
                        }
                        else
                        {
                            lblUpdateStatus.ForeColor = _theme.CGreen;
                            lblUpdateStatus.Text = Loc.UpdateLatest(AppInfo.Version);
                        }
                    }
                    else
                    {
                        lblUpdateStatus.ForeColor = _theme.Danger;
                        lblUpdateStatus.Text = Loc.UpdateFailed;
                    }
                });
            };

            lblUpdateStatus = new Label
            {
                Text = Loc.UpdateStatusHint,
                Location = new Point(20, 374),
                Size = new Size(348, 20),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = ThemeTokens.FontSegoe(9.5F, FontStyle.Regular),
                ForeColor = _theme.TextSecondary
            };

            // Language Selector Group
            lblLangTitle = new Label
            {
                Text = Loc.InfoLanguageTitle,
                Location = new Point(20, 412),
                AutoSize = true,
                Font = ThemeTokens.FontSegoe(11.5F, FontStyle.Bold),
                ForeColor = _theme.TextSecondary
            };

            btnLangEn = new RoundedButton
            {
                Text = "English",
                Location = new Point(148, 408),
                Size = new Size(96, 28),
                BorderRadius = _theme.RadiusSm,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLangEn.Click += (s, e) => Loc.CurrentLanguage = AppLanguage.English;

            btnLangVi = new RoundedButton
            {
                Text = "Tiếng Việt",
                Location = new Point(252, 408),
                Size = new Size(100, 28),
                BorderRadius = _theme.RadiusSm,
                Font = ThemeTokens.FontSegoe(11F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLangVi.Click += (s, e) => Loc.CurrentLanguage = AppLanguage.Vietnamese;

            pnlInfoCard.Controls.AddRange(new Control[] {
                picAppIcon, lblInfoTitle, lblInfoAuthor, lblInfoContact,
                lblFbTitle, linkFb, lblWebTitle, linkWeb,
                lblSupportTitle, linkSupport,
                picLogo,
                btnCheckUpdates, lblUpdateStatus,
                lblLangTitle, btnLangEn, btnLangVi
            });

            this.Controls.Add(pnlInfoCard);
        }

        public void ApplyTheme(ThemeTokens t)
        {
            _theme = t;
            this.BackColor = t.BgPrimary;

            if (pnlInfoCard != null)
            {
                pnlInfoCard.BackColor = t.BgSecondary;
                pnlInfoCard.BorderColor = t.BorderColor;
                pnlInfoCard.BorderRadius = t.RadiusMd;
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

            if (btnCheckUpdates != null)
            {
                btnCheckUpdates.NormalColor = t.AccentPrimary;
                btnCheckUpdates.HoverColor = t.AccentPrimaryHover;
                btnCheckUpdates.BorderRadius = t.RadiusMd;
            }
            if (lblUpdateStatus != null)
            {
                lblUpdateStatus.ForeColor = t.TextSecondary;
            }

            if (lblLangTitle != null) lblLangTitle.ForeColor = t.TextSecondary;

            UpdateLanguageButtonsStyle();
        }

        public void ApplyLanguage()
        {
            if (lblInfoAuthor != null) lblInfoAuthor.Text = Loc.InfoAuthor;
            if (lblInfoContact != null) lblInfoContact.Text = Loc.InfoContact;
            if (lblFbTitle != null) lblFbTitle.Text = Loc.InfoFacebookTitle;
            if (lblWebTitle != null) lblWebTitle.Text = Loc.InfoMoreProductsTitle;
            if (lblSupportTitle != null) lblSupportTitle.Text = Loc.InfoSupportTitle;
            if (lblLangTitle != null) lblLangTitle.Text = Loc.InfoLanguageTitle;
            if (btnCheckUpdates != null) btnCheckUpdates.Text = Loc.BtnCheckUpdates;
            if (lblUpdateStatus != null && lblUpdateStatus.Text.StartsWith("Click") || (lblUpdateStatus != null && lblUpdateStatus.Text.StartsWith("Bấm")))
            {
                lblUpdateStatus.Text = Loc.UpdateStatusHint;
            }

            UpdateLanguageButtonsStyle();
        }

        private void UpdateLanguageButtonsStyle()
        {
            ThemeTokens t = _theme ?? ThemeTokens.DarkTheme();
            bool isVi = Loc.IsVietnamese;

            if (btnLangEn != null)
            {
                btnLangEn.NormalColor = !isVi ? t.AccentPrimary : t.BgElevated;
                btnLangEn.HoverColor = !isVi ? t.AccentPrimaryHover : t.AccentPrimary;
                btnLangEn.ForeColor = !isVi ? Color.White : t.TextSecondary;
                btnLangEn.Invalidate();
            }

            if (btnLangVi != null)
            {
                btnLangVi.NormalColor = isVi ? t.AccentPrimary : t.BgElevated;
                btnLangVi.HoverColor = isVi ? t.AccentPrimaryHover : t.AccentPrimary;
                btnLangVi.ForeColor = isVi ? Color.White : t.TextSecondary;
                btnLangVi.Invalidate();
            }
        }
    }
}
