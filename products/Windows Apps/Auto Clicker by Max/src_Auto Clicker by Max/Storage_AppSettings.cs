using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace ModernAutoClicker
{
    public class SimpleProfileConfig
    {
        public int TabIndex { get; set; }
        public int IntervalMs { get; set; }
        public int SimpleLoops { get; set; }
        public int SimpleJitterPx { get; set; }
        public int MouseButton { get; set; } // 0: Left, 1: Right, 2: Middle
        public int SimpleClickMode { get; set; } // 0: PointList, 1: CurrentCursor
        public string SimpleTargetProcessName { get; set; }
        public string SimpleTargetWindowTitle { get; set; }
        public bool SimpleRelativeToWindow { get; set; }
        public List<Point> Points { get; set; }

        public SimpleProfileConfig(int tabIndex = 0)
        {
            TabIndex = tabIndex;
            IntervalMs = 250;
            SimpleLoops = 0;
            SimpleJitterPx = 0;
            MouseButton = 0;
            SimpleClickMode = 0;
            SimpleTargetProcessName = "";
            SimpleTargetWindowTitle = "";
            SimpleRelativeToWindow = false;
            Points = new List<Point>();
        }

        public SimpleProfileConfig Clone()
        {
            var c = new SimpleProfileConfig(TabIndex)
            {
                IntervalMs = this.IntervalMs,
                SimpleLoops = this.SimpleLoops,
                SimpleJitterPx = this.SimpleJitterPx,
                MouseButton = this.MouseButton,
                SimpleClickMode = this.SimpleClickMode,
                SimpleTargetProcessName = this.SimpleTargetProcessName,
                SimpleTargetWindowTitle = this.SimpleTargetWindowTitle,
                SimpleRelativeToWindow = this.SimpleRelativeToWindow,
                Points = new List<Point>()
            };
            if (this.Points != null)
            {
                foreach (var pt in this.Points) c.Points.Add(pt);
            }
            return c;
        }
    }

    public class AppSettings
    {
        public bool AlwaysOnTop { get; set; }
        public bool ShowMapOverlay { get; set; }
        public bool FreeMouseMode { get; set; }
        public bool SmoothMouseMove { get; set; }
        public bool HideRunningRing { get; set; }
        public bool IsDarkTheme { get; set; }
        public bool IsAdvancedTab { get; set; }
        public string AdvancedProfileJson { get; set; }

        public int ActiveSimpleTabIndex { get; set; }
        public List<SimpleProfileConfig> SimpleProfiles { get; set; }

        // Legacy compatibility properties delegating to SimpleProfiles[0]
        public int IntervalMs
        {
            get { return GetProfile(0).IntervalMs; }
            set { GetProfile(0).IntervalMs = value; }
        }
        public int SimpleLoops
        {
            get { return GetProfile(0).SimpleLoops; }
            set { GetProfile(0).SimpleLoops = value; }
        }
        public int SimpleJitterPx
        {
            get { return GetProfile(0).SimpleJitterPx; }
            set { GetProfile(0).SimpleJitterPx = value; }
        }
        public int MouseButton
        {
            get { return GetProfile(0).MouseButton; }
            set { GetProfile(0).MouseButton = value; }
        }
        public int SimpleClickMode
        {
            get { return GetProfile(0).SimpleClickMode; }
            set { GetProfile(0).SimpleClickMode = value; }
        }
        public string SimpleTargetProcessName
        {
            get { return GetProfile(0).SimpleTargetProcessName; }
            set { GetProfile(0).SimpleTargetProcessName = value; }
        }
        public string SimpleTargetWindowTitle
        {
            get { return GetProfile(0).SimpleTargetWindowTitle; }
            set { GetProfile(0).SimpleTargetWindowTitle = value; }
        }
        public bool SimpleRelativeToWindow
        {
            get { return GetProfile(0).SimpleRelativeToWindow; }
            set { GetProfile(0).SimpleRelativeToWindow = value; }
        }
        public List<Point> Points
        {
            get { return GetProfile(0).Points; }
            set { GetProfile(0).Points = value; }
        }

        public SimpleProfileConfig GetProfile(int index)
        {
            if (SimpleProfiles == null) SimpleProfiles = new List<SimpleProfileConfig>();
            while (SimpleProfiles.Count <= index)
            {
                SimpleProfiles.Add(new SimpleProfileConfig(SimpleProfiles.Count));
            }
            return SimpleProfiles[index];
        }

        public AppSettings()
        {
            AlwaysOnTop = false;
            ShowMapOverlay = true;
            FreeMouseMode = true;
            SmoothMouseMove = true;
            HideRunningRing = false;
            IsDarkTheme = true;
            IsAdvancedTab = false;
            AdvancedProfileJson = null;
            ActiveSimpleTabIndex = 0;
            SimpleProfiles = new List<SimpleProfileConfig>();
            for (int i = 0; i < 5; i++)
            {
                SimpleProfiles.Add(new SimpleProfileConfig(i));
            }
        }

        public static string GetSaveLoadDirectory()
        {
            string dir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AutoClicker-Save&Load");
            if (!Directory.Exists(dir))
            {
                try
                {
                    Directory.CreateDirectory(dir);
                }
                catch { }
            }
            return dir;
        }

        public static string GetSettingsFilePath()
        {
            return Path.Combine(GetSaveLoadDirectory(), "_AutoClickerConfig.json");
        }

        public static AppSettings Load()
        {
            AppSettings settings = new AppSettings();
            string path = GetSettingsFilePath();

            if (!File.Exists(path))
            {
                return settings;
            }

            try
            {
                string json = File.ReadAllText(path, Encoding.UTF8);

                settings.AlwaysOnTop = GetBool(json, "AlwaysOnTop", false);
                settings.ShowMapOverlay = GetBool(json, "ShowMapOverlay", true);
                settings.FreeMouseMode = GetBool(json, "FreeMouseMode", true);
                settings.SmoothMouseMove = GetBool(json, "SmoothMouseMove", true);
                settings.HideRunningRing = GetBool(json, "HideRunningRing", false);
                settings.IsDarkTheme = GetBool(json, "IsDarkTheme", true);
                settings.IsAdvancedTab = GetBool(json, "IsAdvancedTab", false);
                settings.ActiveSimpleTabIndex = Math.Max(0, Math.Min(4, GetInt(json, "ActiveSimpleTabIndex", 0)));

                // Try parsing SimpleProfiles array
                int spIdx = json.IndexOf("\"SimpleProfiles\"", StringComparison.OrdinalIgnoreCase);
                if (spIdx >= 0)
                {
                    int arrStart = json.IndexOf('[', spIdx);
                    if (arrStart >= 0)
                    {
                        int depth = 0;
                        int arrEnd = -1;
                        for (int i = arrStart; i < json.Length; i++)
                        {
                            if (json[i] == '[') depth++;
                            else if (json[i] == ']')
                            {
                                depth--;
                                if (depth == 0) { arrEnd = i; break; }
                            }
                        }

                        if (arrEnd > arrStart)
                        {
                            string arrContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
                            int objDepth = 0;
                            int objStart = -1;
                            List<string> objJsons = new List<string>();
                            for (int i = 0; i < arrContent.Length; i++)
                            {
                                if (arrContent[i] == '{')
                                {
                                    if (objDepth == 0) objStart = i;
                                    objDepth++;
                                }
                                else if (arrContent[i] == '}')
                                {
                                    objDepth--;
                                    if (objDepth == 0 && objStart >= 0)
                                    {
                                        objJsons.Add(arrContent.Substring(objStart, i - objStart + 1));
                                        objStart = -1;
                                    }
                                }
                            }

                            if (objJsons.Count > 0)
                            {
                                settings.SimpleProfiles.Clear();
                                for (int i = 0; i < objJsons.Count && i < 5; i++)
                                {
                                    string pJson = objJsons[i];
                                    SimpleProfileConfig prof = new SimpleProfileConfig(i);
                                    prof.TabIndex = GetInt(pJson, "TabIndex", i);
                                    prof.IntervalMs = GetInt(pJson, "IntervalMs", 250);
                                    prof.SimpleLoops = GetInt(pJson, "SimpleLoops", 0);
                                    prof.SimpleJitterPx = GetInt(pJson, "SimpleJitterPx", 0);
                                    prof.MouseButton = GetInt(pJson, "MouseButton", 0);
                                    prof.SimpleClickMode = GetInt(pJson, "SimpleClickMode", 0);
                                    prof.SimpleTargetProcessName = GetString(pJson, "SimpleTargetProcessName", "");
                                    prof.SimpleTargetWindowTitle = GetString(pJson, "SimpleTargetWindowTitle", "");
                                    prof.SimpleRelativeToWindow = GetBool(pJson, "SimpleRelativeToWindow", false);

                                    Match ptsMatch = Regex.Match(pJson, @"""Points""\s*:\s*\[([^\]]*)\]");
                                    if (ptsMatch.Success)
                                    {
                                        string ptsContent = ptsMatch.Groups[1].Value;
                                        MatchCollection ptMatches = Regex.Matches(ptsContent, @"\{\s*""X""\s*:\s*(-?\d+)\s*,\s*""Y""\s*:\s*(-?\d+)\s*\}");
                                        foreach (Match m in ptMatches)
                                        {
                                            int x = int.Parse(m.Groups[1].Value);
                                            int y = int.Parse(m.Groups[2].Value);
                                            prof.Points.Add(new Point(x, y));
                                        }
                                    }
                                    settings.SimpleProfiles.Add(prof);
                                }
                            }
                        }
                    }
                }

                // Ensure exactly 5 profiles exist
                while (settings.SimpleProfiles.Count < 5)
                {
                    settings.SimpleProfiles.Add(new SimpleProfileConfig(settings.SimpleProfiles.Count));
                }

                // Fallback for legacy config: if SimpleProfiles wasn't present, populate profile 0 from legacy fields
                if (spIdx < 0)
                {
                    settings.SimpleProfiles[0].IntervalMs = GetInt(json, "IntervalMs", 250);
                    settings.SimpleProfiles[0].SimpleLoops = GetInt(json, "SimpleLoops", 0);
                    settings.SimpleProfiles[0].SimpleJitterPx = GetInt(json, "SimpleJitterPx", 0);
                    settings.SimpleProfiles[0].MouseButton = GetInt(json, "MouseButton", 0);
                    settings.SimpleProfiles[0].SimpleClickMode = GetInt(json, "SimpleClickMode", 0);
                    settings.SimpleProfiles[0].SimpleTargetProcessName = GetString(json, "SimpleTargetProcessName", "");
                    settings.SimpleProfiles[0].SimpleTargetWindowTitle = GetString(json, "SimpleTargetWindowTitle", "");
                    settings.SimpleRelativeToWindow = GetBool(json, "SimpleRelativeToWindow", false);

                    Match pointsMatch = Regex.Match(json, @"""Points""\s*:\s*\[([^\]]*)\]");
                    if (pointsMatch.Success)
                    {
                        string pointsContent = pointsMatch.Groups[1].Value;
                        MatchCollection ptMatches = Regex.Matches(pointsContent, @"\{\s*""X""\s*:\s*(-?\d+)\s*,\s*""Y""\s*:\s*(-?\d+)\s*\}");
                        foreach (Match m in ptMatches)
                        {
                            int x = int.Parse(m.Groups[1].Value);
                            int y = int.Parse(m.Groups[2].Value);
                            settings.SimpleProfiles[0].Points.Add(new Point(x, y));
                        }
                    }
                }

                // Parse AdvancedProfile object
                int advIdx = json.IndexOf("\"AdvancedProfile\"", StringComparison.OrdinalIgnoreCase);
                if (advIdx >= 0)
                {
                    int objStart = json.IndexOf('{', advIdx);
                    if (objStart >= 0)
                    {
                        int braceDepth = 0;
                        int objEnd = -1;
                        for (int i = objStart; i < json.Length; i++)
                        {
                            if (json[i] == '{') braceDepth++;
                            else if (json[i] == '}')
                            {
                                braceDepth--;
                                if (braceDepth == 0)
                                {
                                    objEnd = i;
                                    break;
                                }
                            }
                        }
                        if (objEnd > objStart)
                        {
                            settings.AdvancedProfileJson = json.Substring(objStart, objEnd - objStart + 1);
                        }
                    }
                }
            }
            catch
            {
                // Fallback to defaults on error
            }

            return settings;
        }

        public static void Save(AppSettings settings)
        {
            try
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("{");
                sb.AppendLine(string.Format("  \"ActiveSimpleTabIndex\": {0},", settings.ActiveSimpleTabIndex));
                sb.AppendLine(string.Format("  \"AlwaysOnTop\": {0},", settings.AlwaysOnTop.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"ShowMapOverlay\": {0},", settings.ShowMapOverlay.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"FreeMouseMode\": {0},", settings.FreeMouseMode.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"SmoothMouseMove\": {0},", settings.SmoothMouseMove.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"HideRunningRing\": {0},", settings.HideRunningRing.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"IsDarkTheme\": {0},", settings.IsDarkTheme.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"IsAdvancedTab\": {0},", settings.IsAdvancedTab.ToString().ToLower()));

                // Save 5 SimpleProfiles
                sb.AppendLine("  \"SimpleProfiles\": [");
                for (int i = 0; i < settings.SimpleProfiles.Count; i++)
                {
                    var p = settings.SimpleProfiles[i];
                    sb.AppendLine("    {");
                    sb.AppendLine(string.Format("      \"TabIndex\": {0},", p.TabIndex));
                    sb.AppendLine(string.Format("      \"IntervalMs\": {0},", p.IntervalMs));
                    sb.AppendLine(string.Format("      \"SimpleLoops\": {0},", p.SimpleLoops));
                    sb.AppendLine(string.Format("      \"SimpleJitterPx\": {0},", p.SimpleJitterPx));
                    sb.AppendLine(string.Format("      \"MouseButton\": {0},", p.MouseButton));
                    sb.AppendLine(string.Format("      \"SimpleClickMode\": {0},", p.SimpleClickMode));
                    sb.AppendLine(string.Format("      \"SimpleTargetProcessName\": \"{0}\",", EscapeJson(p.SimpleTargetProcessName ?? "")));
                    sb.AppendLine(string.Format("      \"SimpleTargetWindowTitle\": \"{0}\",", EscapeJson(p.SimpleTargetWindowTitle ?? "")));
                    sb.AppendLine(string.Format("      \"SimpleRelativeToWindow\": {0},", p.SimpleRelativeToWindow.ToString().ToLower()));
                    sb.Append("      \"Points\": [");
                    if (p.Points != null && p.Points.Count > 0)
                    {
                        sb.AppendLine();
                        for (int ptIdx = 0; ptIdx < p.Points.Count; ptIdx++)
                        {
                            Point pt = p.Points[ptIdx];
                            sb.Append(string.Format("        {{ \"X\": {0}, \"Y\": {1} }}", pt.X, pt.Y));
                            if (ptIdx < p.Points.Count - 1) sb.Append(",");
                            sb.AppendLine();
                        }
                        sb.AppendLine("      ]");
                    }
                    else
                    {
                        sb.AppendLine("]");
                    }
                    sb.Append("    }");
                    if (i < settings.SimpleProfiles.Count - 1) sb.Append(",");
                    sb.AppendLine();
                }
                sb.AppendLine("  ],");

                // Legacy fields for backward compatibility (mirrors Profile 0)
                var p0 = settings.GetProfile(0);
                sb.AppendLine(string.Format("  \"IntervalMs\": {0},", p0.IntervalMs));
                sb.AppendLine(string.Format("  \"SimpleLoops\": {0},", p0.SimpleLoops));
                sb.AppendLine(string.Format("  \"SimpleJitterPx\": {0},", p0.SimpleJitterPx));
                sb.AppendLine(string.Format("  \"MouseButton\": {0},", p0.MouseButton));
                sb.AppendLine(string.Format("  \"SimpleClickMode\": {0},", p0.SimpleClickMode));
                sb.AppendLine(string.Format("  \"SimpleTargetProcessName\": \"{0}\",", EscapeJson(p0.SimpleTargetProcessName ?? "")));
                sb.AppendLine(string.Format("  \"SimpleTargetWindowTitle\": \"{0}\",", EscapeJson(p0.SimpleTargetWindowTitle ?? "")));
                sb.AppendLine(string.Format("  \"SimpleRelativeToWindow\": {0},", p0.SimpleRelativeToWindow.ToString().ToLower()));
                sb.Append("  \"Points\": [");
                if (p0.Points != null && p0.Points.Count > 0)
                {
                    sb.AppendLine();
                    for (int i = 0; i < p0.Points.Count; i++)
                    {
                        Point p = p0.Points[i];
                        sb.Append(string.Format("    {{ \"X\": {0}, \"Y\": {1} }}", p.X, p.Y));
                        if (i < p0.Points.Count - 1) sb.Append(",");
                        sb.AppendLine();
                    }
                    sb.AppendLine("  ],");
                }
                else
                {
                    sb.AppendLine("],");
                }

                if (!string.IsNullOrEmpty(settings.AdvancedProfileJson))
                {
                    sb.AppendLine(string.Format("  \"AdvancedProfile\": {0}", settings.AdvancedProfileJson.Trim()));
                }
                else
                {
                    sb.AppendLine("  \"AdvancedProfile\": null");
                }

                sb.AppendLine("}");

                File.WriteAllText(GetSettingsFilePath(), sb.ToString(), Encoding.UTF8);
            }
            catch
            {
                // Fail silently if directory is write-protected
            }
        }

        private static int GetInt(string json, string key, int defaultVal)
        {
            Match m = Regex.Match(json, @"""" + key + @"""\s*:\s*(-?\d+)");
            if (m.Success)
            {
                int val;
                if (int.TryParse(m.Groups[1].Value, out val)) return val;
            }
            return defaultVal;
        }

        private static string GetString(string json, string key, string defaultVal)
        {
            Match m = Regex.Match(json, @"""" + key + @"""\s*:\s*""([^""]*)""");
            if (m.Success)
            {
                return m.Groups[1].Value;
            }
            return defaultVal;
        }

        private static bool GetBool(string json, string key, bool defaultVal)
        {
            Match m = Regex.Match(json, @"""" + key + @"""\s*:\s*(true|false)", RegexOptions.IgnoreCase);
            if (m.Success)
            {
                return m.Groups[1].Value.Equals("true", StringComparison.OrdinalIgnoreCase);
            }
            return defaultVal;
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
        }
    }
}
