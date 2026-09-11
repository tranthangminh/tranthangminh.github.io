using System;
using System.Drawing;

namespace BookForge
{
    public class ThemeTokens
    {
        // Sizing & Radius Constants
        public int BtnHeightSm { get { return 28; } }
        public int BtnHeightMd { get { return 34; } }
        public int BtnHeightLg { get { return 40; } }

        public int RadiusSm { get { return 4; } }
        public int RadiusMd { get { return 6; } }
        public int RadiusLg { get { return 10; } }

        // Rainbow Palette
        public Color CRed { get; set; }
        public Color COrange { get; set; }
        public Color CYellow { get; set; }
        public Color CGreen { get; set; }
        public Color CCyan { get; set; }
        public Color CBlue { get; set; }
        public Color CPurple { get; set; }

        // Backgrounds (Preserved MAX Colors)
        public Color BgPrimary { get; set; }
        public Color BgSecondary { get; set; }
        public Color BgTertiary { get; set; }
        public Color BgElevated { get; set; }

        // Typography Colors (Preserved MAX Colors)
        public Color TextPrimary { get; set; }
        public Color TextSecondary { get; set; }
        public Color TextTertiary { get; set; }

        // Semantic Accents
        public Color AccentPrimary { get; set; }
        public Color AccentPrimaryHover { get; set; }
        public Color AccentSecondary { get; set; }
        public Color BorderColor { get; set; }
        public Color BorderHover { get; set; }

        // Semantic States
        public Color Success { get; set; }
        public Color Danger { get; set; }
        public Color Warning { get; set; }
        public Color HotkeyBoxBg { get; set; }
        public Color HotkeyBoxText { get; set; }

        public bool IsDark { get; set; }

        // Global Active Theme Token
        public static ThemeTokens Current { get; private set; }

        static ThemeTokens()
        {
            Current = DarkTheme();
        }

        // 🌙 Dark Theme (Directly from "MAX - All for Designers/theme.css")
        public static ThemeTokens DarkTheme()
        {
            return new ThemeTokens
            {
                IsDark = true,
                CRed = ColorTranslator.FromHtml("#ef4444"),
                COrange = ColorTranslator.FromHtml("#f97316"),
                CYellow = ColorTranslator.FromHtml("#e5c158"),
                CGreen = ColorTranslator.FromHtml("#34d399"),
                CCyan = ColorTranslator.FromHtml("#8DF2F2"),
                CBlue = ColorTranslator.FromHtml("#60a5fa"),
                CPurple = ColorTranslator.FromHtml("#b19ffb"),

                // 1. Backgrounds (Preserved MAX Colors)
                BgPrimary = ColorTranslator.FromHtml("#191919"),
                BgSecondary = ColorTranslator.FromHtml("#222222"),
                BgTertiary = ColorTranslator.FromHtml("#343434"),
                BgElevated = ColorTranslator.FromHtml("#464646"),

                // 2. Typography Colors (Preserved MAX Colors)
                TextPrimary = ColorTranslator.FromHtml("#ffffff"),
                TextSecondary = ColorTranslator.FromHtml("#bbbbbb"),
                TextTertiary = ColorTranslator.FromHtml("#888888"),

                // 3. Accents & Borders
                AccentPrimary = ColorTranslator.FromHtml("#196ebf"),
                AccentPrimaryHover = ColorTranslator.FromHtml("#38f9ff"),
                AccentSecondary = ColorTranslator.FromHtml("#b19ffb"),
                BorderColor = ColorTranslator.FromHtml("#3a3a3a"),
                BorderHover = ColorTranslator.FromHtml("#8a8a8a"),

                Success = ColorTranslator.FromHtml("#34d399"),
                Danger = ColorTranslator.FromHtml("#ef4444"),
                Warning = ColorTranslator.FromHtml("#e5c158"),
                HotkeyBoxBg = ColorTranslator.FromHtml("#1e3a5f"),
                HotkeyBoxText = ColorTranslator.FromHtml("#8DF2F2")
            };
        }

        // ☀️ Light Theme (Directly from "MAX - All for Designers/theme.css")
        public static ThemeTokens LightTheme()
        {
            return new ThemeTokens
            {
                IsDark = false,
                CRed = ColorTranslator.FromHtml("#dc2626"),
                COrange = ColorTranslator.FromHtml("#ea580c"),
                CYellow = ColorTranslator.FromHtml("#d97706"),
                CGreen = ColorTranslator.FromHtml("#16a34a"),
                CCyan = ColorTranslator.FromHtml("#65d8f8"),
                CBlue = ColorTranslator.FromHtml("#2563eb"),
                CPurple = ColorTranslator.FromHtml("#7c3aed"),

                // 1. Backgrounds (Preserved MAX Light Colors)
                BgPrimary = ColorTranslator.FromHtml("#ffffff"),
                BgSecondary = ColorTranslator.FromHtml("#f6f6f6"),
                BgTertiary = ColorTranslator.FromHtml("#e8e8e8"),
                BgElevated = ColorTranslator.FromHtml("#e0e0e0"),

                // 2. Typography Colors (Preserved MAX Light Colors)
                TextPrimary = ColorTranslator.FromHtml("#000000"),
                TextSecondary = ColorTranslator.FromHtml("#666666"),
                TextTertiary = ColorTranslator.FromHtml("#999999"),

                // 3. Accents & Borders
                AccentPrimary = ColorTranslator.FromHtml("#196ebf"),
                AccentPrimaryHover = ColorTranslator.FromHtml("#0369a1"),
                AccentSecondary = ColorTranslator.FromHtml("#7c3aed"),
                BorderColor = ColorTranslator.FromHtml("#c4c4c4"),
                BorderHover = ColorTranslator.FromHtml("#888888"),

                Success = ColorTranslator.FromHtml("#16a34a"),
                Danger = ColorTranslator.FromHtml("#dc2626"),
                Warning = ColorTranslator.FromHtml("#d97706"),
                HotkeyBoxBg = ColorTranslator.FromHtml("#e0f2fe"),
                HotkeyBoxText = ColorTranslator.FromHtml("#0369a1")
            };
        }

        // Cross-platform Monospace font resolver
        public static Font GetMonospaceFont(float size, FontStyle style = FontStyle.Regular)
        {
            string[] preferredFonts = new string[] {
                "Consolas", "Menlo", "DejaVu Sans Mono", "Cascadia Mono", "SF Mono", "Liberation Mono", "Courier New"
            };

            foreach (string fontName in preferredFonts)
            {
                try
                {
                    using (Font test = new Font(fontName, size, style))
                    {
                        if (string.Equals(test.Name, fontName, StringComparison.OrdinalIgnoreCase))
                        {
                            return new Font(fontName, size, style);
                        }
                    }
                }
                catch { }
            }

            return new Font(FontFamily.GenericMonospace, size, style);
        }

        // Standard Application Fonts
        public static Font FontHeading { get { return new Font("Segoe UI", 13.5f, FontStyle.Bold); } }
        public static Font FontSubHeading { get { return new Font("Segoe UI", 10.5f, FontStyle.Bold); } }
        public static Font FontBody { get { return new Font("Segoe UI", 9.25f, FontStyle.Regular); } }
        public static Font FontBodyBold { get { return new Font("Segoe UI", 9.25f, FontStyle.Bold); } }
        public static Font FontSmall { get { return new Font("Segoe UI", 8.25f, FontStyle.Regular); } }
        public static Font FontSmallBold { get { return new Font("Segoe UI", 8.25f, FontStyle.Bold); } }
    }

    public class ModernMenuRenderer : System.Windows.Forms.ToolStripProfessionalRenderer
    {
        private ThemeTokens _theme;

        public ModernMenuRenderer(ThemeTokens theme) : base(new ModernMenuColorTable(theme))
        {
            _theme = theme ?? ThemeTokens.DarkTheme();
        }

        protected override void OnRenderItemText(System.Windows.Forms.ToolStripItemTextRenderEventArgs e)
        {
            if (e.Item.Selected)
            {
                e.TextColor = Color.White;
            }
            else if (e.Item.ForeColor != Color.Empty && e.Item.ForeColor != SystemColors.ControlText)
            {
                e.TextColor = e.Item.ForeColor;
            }
            else
            {
                e.TextColor = _theme.TextPrimary;
            }
            base.OnRenderItemText(e);
        }

        protected override void OnRenderMenuItemBackground(System.Windows.Forms.ToolStripItemRenderEventArgs e)
        {
            int w = e.Item.Width;
            if (e.ToolStrip != null && e.ToolStrip.ClientSize.Width > w)
            {
                w = e.ToolStrip.ClientSize.Width;
            }

            if (e.Item.Selected)
            {
                Rectangle rc = new Rectangle(2, 0, Math.Max(0, w - 4), e.Item.Height);
                using (SolidBrush b = new SolidBrush(_theme.AccentPrimary))
                {
                    e.Graphics.FillRectangle(b, rc);
                }
            }
            else
            {
                Rectangle rc = new Rectangle(0, 0, w, e.Item.Height);
                using (SolidBrush b = new SolidBrush(_theme.BgSecondary))
                {
                    e.Graphics.FillRectangle(b, rc);
                }
            }
        }
    }

    public class ModernMenuColorTable : System.Windows.Forms.ProfessionalColorTable
    {
        private ThemeTokens _theme;

        public ModernMenuColorTable(ThemeTokens theme)
        {
            _theme = theme ?? ThemeTokens.DarkTheme();
        }

        public override Color ToolStripDropDownBackground { get { return _theme.BgSecondary; } }
        public override Color MenuBorder { get { return _theme.BorderColor; } }
        public override Color MenuItemBorder { get { return Color.Transparent; } }
        public override Color MenuItemSelected { get { return _theme.AccentPrimary; } }
        public override Color ImageMarginGradientBegin { get { return _theme.BgSecondary; } }
        public override Color ImageMarginGradientMiddle { get { return _theme.BgSecondary; } }
        public override Color ImageMarginGradientEnd { get { return _theme.BgSecondary; } }
        public override Color SeparatorDark { get { return _theme.BorderColor; } }
        public override Color SeparatorLight { get { return Color.Transparent; } }
    }
}
