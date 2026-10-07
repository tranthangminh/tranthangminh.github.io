using System;
using System.Drawing;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Plug & Play Reusable Info Tab Panel container.
    /// Manages independent language views (InfoView_En and InfoView_Vi)
    /// and exposes feature toggles to configure or hide sub-items without modifying Common.
    /// </summary>
    public class InfoTabPanel : Panel
    {
        private ThemeTokens _theme;
        private RoundedPanel pnlInfoCard;
        private InfoView_En _viewEn;
        private InfoView_Vi _viewVi;

        // Feature Toggles (Configurable from outside)
        public bool ShowDonationQr
        {
            get { return _viewVi != null && _viewVi.ShowDonationQr; }
            set { if (_viewVi != null) _viewVi.ShowDonationQr = value; }
        }

        public bool ShowBunGioHeo
        {
            get { return _viewVi != null && _viewVi.ShowBunGioHeo; }
            set { if (_viewVi != null) _viewVi.ShowBunGioHeo = value; }
        }

        public bool ShowKoFi
        {
            get { return _viewEn != null && _viewEn.ShowKoFi; }
            set { if (_viewEn != null) _viewEn.ShowKoFi = value; }
        }

        public bool ShowCheckUpdates
        {
            get { return _viewEn != null && _viewEn.ShowCheckUpdates; }
            set
            {
                if (_viewEn != null) _viewEn.ShowCheckUpdates = value;
                if (_viewVi != null) _viewVi.ShowCheckUpdates = value;
            }
        }

        public bool ShowLanguageSelector
        {
            get { return _viewEn != null && _viewEn.ShowLanguageSelector; }
            set
            {
                if (_viewEn != null) _viewEn.ShowLanguageSelector = value;
                if (_viewVi != null) _viewVi.ShowLanguageSelector = value;
            }
        }

        public InfoTabPanel()
        {
            _theme = ThemeTokens.Current ?? ThemeTokens.DarkTheme();
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

            _viewEn = new InfoView_En
            {
                Location = new Point(0, 0),
                Size = new Size(388, 508),
                Visible = true
            };

            _viewVi = new InfoView_Vi
            {
                Location = new Point(0, 0),
                Size = new Size(388, 508),
                Visible = false
            };

            pnlInfoCard.Controls.AddRange(new Control[] { _viewEn, _viewVi });
            this.Controls.Add(pnlInfoCard);
        }

        public void ApplyTheme(ThemeTokens t = null)
        {
            _theme = t ?? ThemeTokens.Current ?? ThemeTokens.DarkTheme();
            this.BackColor = _theme.BgPrimary;

            if (pnlInfoCard != null)
            {
                pnlInfoCard.BackColor = _theme.BgSecondary;
                pnlInfoCard.BorderColor = _theme.BorderColor;
                pnlInfoCard.BorderRadius = _theme.RadiusMd;
                pnlInfoCard.Invalidate();
            }

            if (_viewEn != null) _viewEn.ApplyTheme(_theme);
            if (_viewVi != null) _viewVi.ApplyTheme(_theme);
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            UpdateLayout();
        }

        public void UpdateLayout()
        {
            if (pnlInfoCard != null)
            {
                int padX = 16;
                int padY = 8;
                int cardW = Math.Max(300, this.Width - (padX * 2));
                int cardH = Math.Max(300, this.Height - (padY * 2));

                pnlInfoCard.Location = new Point(padX, padY);
                pnlInfoCard.Size = new Size(cardW, cardH);

                if (_viewEn != null)
                {
                    _viewEn.Location = new Point(0, 0);
                    _viewEn.Size = new Size(cardW, cardH);
                    _viewEn.RelayoutContent();
                }
                if (_viewVi != null)
                {
                    _viewVi.Location = new Point(0, 0);
                    _viewVi.Size = new Size(cardW, cardH);
                    _viewVi.RelayoutContent();
                }
            }
            Invalidate();
        }

        public void ApplyLanguage()
        {
            bool isVi = Loc.IsVietnamese;

            if (_viewVi != null)
            {
                _viewVi.Visible = isVi;
                if (isVi) _viewVi.UpdateLanguageButtonsStyle();
            }

            if (_viewEn != null)
            {
                _viewEn.Visible = !isVi;
                if (!isVi) _viewEn.UpdateLanguageButtonsStyle();
            }
        }
    }
}
