using System;
using System.Drawing;

namespace MaxApp.Common
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
        public int FormRadius { get { return RadiusMd; } } // 6px - Standardized window corner radius token

        // Rainbow Palette
        public Color CRed { get; set; }
        public Color COrange { get; set; }
        public Color CYellow { get; set; }
        public Color CGreen { get; set; }
        public Color CCyan { get; set; }
        public Color CBlue { get; set; }
        public Color CPurple { get; set; }

        // Backgrounds
        public Color BgPrimary { get; set; }
        public Color BgSecondary { get; set; }
        public Color BgTertiary { get; set; }
        public Color BgElevated { get; set; }

        // Typography
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
        private static ThemeTokens _current = null;
        public static ThemeTokens Current
        {
            get
            {
                if (_current == null) _current = DarkTheme();
                return _current;
            }
            set
            {
                _current = value;
            }
        }

        static ThemeTokens()
        {
            _current = DarkTheme();
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

        // ========================================================
        // Typography Scale Constants (Pixel-locked, DPI Immune)
        // ========================================================
        public static float FontSizeMicro   { get { return 9.5F; } }  // Badge, chip, sub-status, hint
        public static float FontSizeSmall   { get { return 10.5F; } } // Caption, units, small labels
        public static float FontSizeBase    { get { return 11.5F; } } // Regular text, info rows, main form labels
        public static float FontSizeButton  { get { return 12.5F; } } // Primary & Secondary buttons
        public static float FontSizeCard    { get { return 14.0F; } } // Group box, Card header
        public static float FontSizeTitle   { get { return 16.0F; } } // Main App Title

        // Pixel-locked font helpers to guarantee DPI immunity across 100%, 125%, 150%+ display scales
        public static Font FontSegoe(float pixelSize, FontStyle style = FontStyle.Regular)
        {
            return new Font("Segoe UI", pixelSize, style, GraphicsUnit.Pixel);
        }

        public static Font FontSegoeSymbol(float pixelSize, FontStyle style = FontStyle.Regular)
        {
            return new Font("Segoe UI Symbol", pixelSize, style, GraphicsUnit.Pixel);
        }

        public static Font FontMicro(FontStyle style = FontStyle.Regular)
        {
            return FontSegoe(FontSizeMicro, style);
        }

        public static Font FontSmall(FontStyle style = FontStyle.Regular)
        {
            return FontSegoe(FontSizeSmall, style);
        }

        public static Font FontBase(FontStyle style = FontStyle.Regular)
        {
            return FontSegoe(FontSizeBase, style);
        }

        public static Font FontButton(FontStyle style = FontStyle.Bold)
        {
            return FontSegoe(FontSizeButton, style);
        }

        public static Font FontCard(FontStyle style = FontStyle.Bold)
        {
            return FontSegoe(FontSizeCard, style);
        }

        public static Font FontTitle(FontStyle style = FontStyle.Bold)
        {
            return FontSegoe(FontSizeTitle, style);
        }

        // Cross-platform Monospace font resolver with strict GraphicsUnit.Pixel
        public static Font GetMonospaceFont(float pixelSize, FontStyle style = FontStyle.Regular)
        {
            string[] preferredFonts = new string[] {
                "Consolas", "Menlo", "DejaVu Sans Mono", "Cascadia Mono", "SF Mono", "Liberation Mono", "Courier New"
            };

            foreach (string fontName in preferredFonts)
            {
                try
                {
                    using (Font test = new Font(fontName, pixelSize, style, GraphicsUnit.Pixel))
                    {
                        if (string.Equals(test.Name, fontName, StringComparison.OrdinalIgnoreCase))
                        {
                            return new Font(fontName, pixelSize, style, GraphicsUnit.Pixel);
                        }
                    }
                }
                catch { }
            }

            return new Font(FontFamily.GenericMonospace, pixelSize, style, GraphicsUnit.Pixel);
        }

        // Backward compatibility standard fonts
        public static Font FontHeading { get { return FontSegoe(14.0f, FontStyle.Bold); } }
        public static Font FontSubHeading { get { return FontSegoe(11.5f, FontStyle.Bold); } }
        public static Font FontBody { get { return FontSegoe(11.5f, FontStyle.Regular); } }
        public static Font FontBodyBold { get { return FontSegoe(11.5f, FontStyle.Bold); } }
        public static Font FontSmallBold { get { return FontSegoe(10.5f, FontStyle.Bold); } }
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

        protected override void OnRenderImageMargin(System.Windows.Forms.ToolStripRenderEventArgs e)
        {
            using (SolidBrush b = new SolidBrush(_theme.BgSecondary))
            {
                e.Graphics.FillRectangle(b, e.AffectedBounds);
            }
        }

        protected override void OnRenderItemImage(System.Windows.Forms.ToolStripItemImageRenderEventArgs e)
        {
            if (e.Image != null)
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                e.Graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                e.Graphics.DrawImage(e.Image, e.ImageRectangle);
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
