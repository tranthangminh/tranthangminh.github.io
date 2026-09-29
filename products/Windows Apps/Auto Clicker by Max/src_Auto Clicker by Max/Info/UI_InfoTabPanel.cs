using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Info
{
    /// <summary>
    /// Plug & Play Reusable Info Tab Panel container.
    /// Manages independent language views (UI_InfoView_En and UI_InfoView_Vi)
    /// and propagates theme / language events cleanly without spaghetti UI shifting.
    /// </summary>
    public class InfoTabPanel : Panel
    {
        private ThemeTokens _theme;
        private RoundedPanel pnlInfoCard;
        private InfoView_En _viewEn;
        private InfoView_Vi _viewVi;

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

            if (_viewEn != null) _viewEn.ApplyTheme(t);
            if (_viewVi != null) _viewVi.ApplyTheme(t);
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
