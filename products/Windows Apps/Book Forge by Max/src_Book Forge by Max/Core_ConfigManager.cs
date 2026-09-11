using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace BookForge
{
    public class BookForgeConfig
    {
        // Tab 1: Convert to Markdown
        public string ExtractSourcePath { get; set; }
        public string OutputLocationMode { get; set; } // "SameAsSource", "AppFolder", "CustomFolder"
        public string OutputCustomFolder { get; set; }
        public string SmartChunking { get; set; } // "H2", "H2 & H3", "None (H1 only)"
        public string Threshold { get; set; }
        public bool ExtractImages { get; set; }
        public bool ScaffoldBible { get; set; }
        public bool ExtractSettingsCollapsed { get; set; }

        // Tab 2: Markdown to PDF
        public string PublishFolderPath { get; set; }
        public bool SourceTranslated { get; set; }
        public bool SourceOriginal { get; set; }
        public string PaperSize { get; set; }
        public string FontFamily { get; set; }
        public string MenuDepth { get; set; } // "H1", "H1 & H2", "H1, H2 & H3"
        public string BindingMode { get; set; } // "Print", "Digital"
        public bool IncludeTranslatorNote { get; set; }
        public bool PublishSettingsCollapsed { get; set; }

        // General
        public int SelectedTab { get; set; }
        public bool IsDarkTheme { get; set; }
        public int WindowWidth { get; set; }
        public int WindowHeight { get; set; }

        public BookForgeConfig()
        {
            ExtractSourcePath = "";
            OutputLocationMode = "SameAsSource";
            OutputCustomFolder = "";
            SmartChunking = "H1, H2 & H3";
            Threshold = "25,000 characters (Golden Standard)";
            ExtractImages = true;
            ScaffoldBible = true;
            ExtractSettingsCollapsed = false;

            PublishFolderPath = "";
            SourceTranslated = true;
            SourceOriginal = true;
            PaperSize = "A5";
            FontFamily = "Lora (Recommended)";
            MenuDepth = "H1";
            BindingMode = "Print";
            IncludeTranslatorNote = true;
            PublishSettingsCollapsed = false;

            SelectedTab = 0;
            IsDarkTheme = true;
            WindowWidth = 660;
            WindowHeight = 780;
        }
    }

    public static class ConfigManager
    {
        public const string ConfigFileName = "_BookForgeConfig";
        public const string ConfigFileNameJson = "_BookForgeConfig.json";

        public static string ResolveConfigPath(string specificDir = null)
        {
            string exeDir = "";
            try { exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location); } catch { }

            string baseDir = !string.IsNullOrEmpty(specificDir) && Directory.Exists(specificDir)
                ? specificDir
                : (!string.IsNullOrEmpty(exeDir) && Directory.Exists(exeDir) ? exeDir : AppDomain.CurrentDomain.BaseDirectory);

            string noExtPath = Path.Combine(baseDir, ConfigFileName);
            if (File.Exists(noExtPath)) return noExtPath;

            string jsonPath = Path.Combine(baseDir, ConfigFileNameJson);
            if (File.Exists(jsonPath)) return jsonPath;

            return noExtPath;
        }

        public static bool HasConfig(string specificDir = null)
        {
            string path = ResolveConfigPath(specificDir);
            return File.Exists(path);
        }

        public static BookForgeConfig Load(string explicitFilePath = null)
        {
            string path = !string.IsNullOrEmpty(explicitFilePath)
                ? explicitFilePath
                : ResolveConfigPath();

            if (!File.Exists(path))
            {
                string dir = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(dir))
                {
                    string noExt = Path.Combine(dir, ConfigFileName);
                    if (File.Exists(noExt)) path = noExt;
                    else
                    {
                        string json = Path.Combine(dir, ConfigFileNameJson);
                        if (File.Exists(json)) path = json;
                    }
                }
            }

            if (!File.Exists(path))
            {
                return new BookForgeConfig();
            }

            try
            {
                string content = File.ReadAllText(path, Encoding.UTF8);
                return ParseJson(content);
            }
            catch
            {
                return new BookForgeConfig();
            }
        }

        public static bool Save(BookForgeConfig config, string targetPath = null)
        {
            if (config == null) return false;

            if (string.IsNullOrEmpty(targetPath))
            {
                string exeDir = "";
                try { exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location); } catch { }
                string baseDir = !string.IsNullOrEmpty(exeDir) && Directory.Exists(exeDir) ? exeDir : AppDomain.CurrentDomain.BaseDirectory;
                targetPath = Path.Combine(baseDir, ConfigFileName);
            }

            try
            {
                string dir = Path.GetDirectoryName(targetPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                string json = SerializeJson(config);
                File.WriteAllText(targetPath, json, Encoding.UTF8);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static string SerializeJson(BookForgeConfig c)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine("  \"_comment\": \"BookForge Studio Persistent Configuration\",");
            sb.AppendLine(string.Format("  \"ExtractSourcePath\": \"{0}\",", EscapeJson(c.ExtractSourcePath)));
            sb.AppendLine(string.Format("  \"OutputLocationMode\": \"{0}\",", EscapeJson(c.OutputLocationMode)));
            sb.AppendLine(string.Format("  \"OutputCustomFolder\": \"{0}\",", EscapeJson(c.OutputCustomFolder)));
            sb.AppendLine(string.Format("  \"SmartChunking\": \"{0}\",", EscapeJson(c.SmartChunking)));
            sb.AppendLine(string.Format("  \"Threshold\": \"{0}\",", EscapeJson(c.Threshold)));
            sb.AppendLine(string.Format("  \"ExtractImages\": {0},", c.ExtractImages ? "true" : "false"));
            sb.AppendLine(string.Format("  \"ScaffoldBible\": {0},", c.ScaffoldBible ? "true" : "false"));
            sb.AppendLine(string.Format("  \"ExtractSettingsCollapsed\": {0},", c.ExtractSettingsCollapsed ? "true" : "false"));
            sb.AppendLine(string.Format("  \"PublishFolderPath\": \"{0}\",", EscapeJson(c.PublishFolderPath)));
            sb.AppendLine(string.Format("  \"SourceTranslated\": {0},", c.SourceTranslated ? "true" : "false"));
            sb.AppendLine(string.Format("  \"SourceOriginal\": {0},", c.SourceOriginal ? "true" : "false"));
            sb.AppendLine(string.Format("  \"PaperSize\": \"{0}\",", EscapeJson(c.PaperSize)));
            sb.AppendLine(string.Format("  \"FontFamily\": \"{0}\",", EscapeJson(c.FontFamily)));
            sb.AppendLine(string.Format("  \"MenuDepth\": \"{0}\",", EscapeJson(c.MenuDepth)));
            sb.AppendLine(string.Format("  \"BindingMode\": \"{0}\",", EscapeJson(c.BindingMode)));
            sb.AppendLine(string.Format("  \"IncludeTranslatorNote\": {0},", c.IncludeTranslatorNote ? "true" : "false"));
            sb.AppendLine(string.Format("  \"PublishSettingsCollapsed\": {0},", c.PublishSettingsCollapsed ? "true" : "false"));
            sb.AppendLine(string.Format("  \"SelectedTab\": {0},", c.SelectedTab));
            sb.AppendLine(string.Format("  \"IsDarkTheme\": {0},", c.IsDarkTheme ? "true" : "false"));
            sb.AppendLine(string.Format("  \"WindowWidth\": {0},", c.WindowWidth));
            sb.AppendLine(string.Format("  \"WindowHeight\": {0}", c.WindowHeight));
            sb.AppendLine("}");
            return sb.ToString();
        }

        public static BookForgeConfig ParseJson(string json)
        {
            BookForgeConfig config = new BookForgeConfig();
            if (string.IsNullOrEmpty(json)) return config;

            Regex regex = new Regex("\"(?<key>[a-zA-Z0-9_]+)\"\\s*:\\s*(?:\"(?<val>[^\"]*)\"|(?<val>true|false|-?[0-9]+))", RegexOptions.IgnoreCase);
            MatchCollection matches = regex.Matches(json);

            foreach (Match m in matches)
            {
                string key = m.Groups["key"].Value;
                string val = m.Groups["val"].Value;
                string unescaped = val.Replace("\\\\", "\\").Replace("\\\"", "\"").Replace("\\n", "\n");

                switch (key.ToLowerInvariant())
                {
                    case "extractsourcepath": config.ExtractSourcePath = unescaped; break;
                    case "outputlocationmode": config.OutputLocationMode = unescaped; break;
                    case "outputcustomfolder": config.OutputCustomFolder = unescaped; break;
                    case "smartchunking":
                        string sc = unescaped;
                        if (sc.Equals("H2 & H3", StringComparison.OrdinalIgnoreCase)) sc = "H1, H2 & H3";
                        else if (sc.Equals("H2", StringComparison.OrdinalIgnoreCase)) sc = "H1 & H2";
                        else if (sc.IndexOf("None", StringComparison.OrdinalIgnoreCase) >= 0 || sc.Equals("H1", StringComparison.OrdinalIgnoreCase)) sc = "H1";
                        config.SmartChunking = sc;
                        break;
                    case "splith2h3":
                        if (string.IsNullOrEmpty(config.SmartChunking))
                        {
                            config.SmartChunking = ParseBool(val, true) ? "H1, H2 & H3" : "H1";
                        }
                        break;
                    case "threshold": config.Threshold = unescaped; break;
                    case "extractimages": config.ExtractImages = ParseBool(val, true); break;
                    case "scaffoldbible": config.ScaffoldBible = ParseBool(val, true); break;
                    case "extractsettingscollapsed": config.ExtractSettingsCollapsed = ParseBool(val, false); break;

                    case "publishfolderpath": config.PublishFolderPath = unescaped; break;
                    case "sourcetranslated": config.SourceTranslated = ParseBool(val, true); break;
                    case "sourceoriginal": config.SourceOriginal = ParseBool(val, true); break;
                    case "papersize": config.PaperSize = unescaped; break;
                    case "fontfamily": config.FontFamily = unescaped; break;
                    case "menudepth": config.MenuDepth = unescaped; break;
                    case "bindingmode": config.BindingMode = unescaped; break;
                    case "includetranslatornote": config.IncludeTranslatorNote = ParseBool(val, true); break;
                    case "publishsettingscollapsed": config.PublishSettingsCollapsed = ParseBool(val, false); break;

                    case "selectedtab": config.SelectedTab = ParseInt(val, 0); break;
                    case "isdarktheme": config.IsDarkTheme = ParseBool(val, true); break;
                    case "windowwidth": config.WindowWidth = ParseInt(val, 660); break;
                    case "windowheight": config.WindowHeight = ParseInt(val, 780); break;
                }
            }
            return config;
        }

        private static bool ParseBool(string val, bool fallback)
        {
            if (string.IsNullOrEmpty(val)) return fallback;
            bool result;
            if (bool.TryParse(val, out result)) return result;
            return fallback;
        }

        private static int ParseInt(string val, int fallback)
        {
            if (string.IsNullOrEmpty(val)) return fallback;
            int result;
            if (int.TryParse(val, out result)) return result;
            return fallback;
        }

        private static string EscapeJson(string str)
        {
            if (string.IsNullOrEmpty(str)) return "";
            return str.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
        }
    }
}
