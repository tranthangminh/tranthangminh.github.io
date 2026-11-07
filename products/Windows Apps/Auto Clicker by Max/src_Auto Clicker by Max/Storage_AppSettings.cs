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
        public int IntervalUnit { get; set; } // Display/input unit of IntervalMs (TimeUnit); the value itself is always stored in ms
        public int SimpleLoops { get; set; }
        public int SimpleJitterPx { get; set; }
        public int MouseButton { get; set; } // 0: Left, 1: Right, 2: Middle
        public int SimpleClickMode { get; set; } // 0: PointList, 1: CurrentCursor
        public string SimpleTargetProcessName { get; set; }
        public string SimpleTargetWindowTitle { get; set; }
        public int SimpleTargetWindowIndex { get; set; }
        public bool SimpleRelativeToWindow { get; set; }
        [System.Xml.Serialization.XmlIgnore]
        public uint SimpleTargetPid { get; set; }
        public List<Point> Points { get; set; }

        public SimpleProfileConfig(int tabIndex = 0)
        {
            TabIndex = tabIndex;
            IntervalMs = 250;
            IntervalUnit = TimeUnit.Milliseconds;
            SimpleLoops = 0;
            SimpleJitterPx = 0;
            MouseButton = 0;
            SimpleClickMode = 0;
            SimpleTargetProcessName = "";
            SimpleTargetWindowTitle = "";
            SimpleTargetWindowIndex = 0;
            SimpleRelativeToWindow = false;
            SimpleTargetPid = 0;
            Points = new List<Point>();
        }

        public SimpleProfileConfig Clone()
        {
            var c = new SimpleProfileConfig(TabIndex)
            {
                IntervalMs = this.IntervalMs,
                IntervalUnit = this.IntervalUnit,
                SimpleLoops = this.SimpleLoops,
                SimpleJitterPx = this.SimpleJitterPx,
                MouseButton = this.MouseButton,
                SimpleClickMode = this.SimpleClickMode,
                SimpleTargetProcessName = this.SimpleTargetProcessName,
                SimpleTargetWindowTitle = this.SimpleTargetWindowTitle,
                SimpleTargetWindowIndex = this.SimpleTargetWindowIndex,
                SimpleRelativeToWindow = this.SimpleRelativeToWindow,
                SimpleTargetPid = this.SimpleTargetPid,
                Points = new List<Point>()
            };
            if (this.Points != null)
            {
                foreach (var pt in this.Points) c.Points.Add(pt);
            }
            return c;
        }
    }

    public enum SettingsProblem
    {
        None,
        CouldNotRead,
        RestoredFromBackup,
        ResetToDefaults,
        CouldNotSave
    }

    public class AppSettings
    {
        // Number of fixed Simple tabs; older configs with fewer profiles are padded with empty ones on load
        public const int SimpleTabCount = 8;

        private const string BackupSuffix = ".bak";
        private const int MaxCoordinate = 100000;
        private const int MaxJitterPx = 999;
        private const int MaxLoops = 999999;

        // Everything is saved by reading the file, changing it and writing it back. These make sure a read that fails never turns into writing empty values over the user's data.
        private static string _lastGoodJson = null;
        private static bool _saveBlocked = false;
        private static SettingsProblem _problem = SettingsProblem.None;

        /// <summary>The problem met since the last call, for the main window to report.</summary>
        public static SettingsProblem TakeProblem()
        {
            SettingsProblem problem = _problem;
            _problem = SettingsProblem.None;
            return problem;
        }

        public bool AlwaysOnTop { get; set; }
        public bool ShowMapOverlay { get; set; }
        public bool FreeMouseMode { get; set; }
        public bool SmoothMouseMove { get; set; }
        public bool SettingsCollapsed { get; set; } // Bottom settings + hotkey card folded down to its header row
        public int MapOverlayOpacity { get; set; }
        public bool IsDarkTheme { get; set; }
        public bool IsAdvancedTab { get; set; }
        public string AdvancedProfileJson { get; set; }
        public string LastUpdateCheckDate { get; set; }
        public string Language { get; set; }
        public bool IsFirstRun { get; set; }
        public int AsianWindowWidth { get; set; }
        public int AsianWindowHeight { get; set; }

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
        public int SimpleTargetWindowIndex
        {
            get { return GetProfile(0).SimpleTargetWindowIndex; }
            set { GetProfile(0).SimpleTargetWindowIndex = value; }
        }
        public bool SimpleRelativeToWindow
        {
            get { return GetProfile(0).SimpleRelativeToWindow; }
            set { GetProfile(0).SimpleRelativeToWindow = value; }
        }
        [System.Xml.Serialization.XmlIgnore]
        public uint SimpleTargetPid
        {
            get { return GetProfile(0).SimpleTargetPid; }
            set { GetProfile(0).SimpleTargetPid = value; }
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
            MapOverlayOpacity = 60;
            IsDarkTheme = true;
            IsAdvancedTab = false;
            AdvancedProfileJson = null;
            LastUpdateCheckDate = "";
            Language = "en";
            AsianWindowWidth = 700;
            AsianWindowHeight = 760;
            ActiveSimpleTabIndex = 0;
            SimpleProfiles = new List<SimpleProfileConfig>();
            for (int i = 0; i < SimpleTabCount; i++)
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
                catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
            }
            return dir;
        }

        public static string GetSettingsFilePath()
        {
            return Path.Combine(GetSaveLoadDirectory(), "_AutoClickerConfig.json");
        }

        public static AppSettings Load()
        {
            string path = GetSettingsFilePath();

            if (!File.Exists(path))
            {
                if (_lastGoodJson != null) return Parse(_lastGoodJson);

                AppSettings firstRun = new AppSettings();
                firstRun.IsFirstRun = true;
                return firstRun;
            }

            string json;
            if (!TryReadFile(path, out json))
            {
                if (_lastGoodJson != null) return Parse(_lastGoodJson);

                // Nothing is known about the file yet: this session's empty values must not replace it
                _saveBlocked = true;
                _problem = SettingsProblem.CouldNotRead;
                return new AppSettings();
            }

            if (IsCompleteJson(json))
            {
                try
                {
                    AppSettings parsed = Parse(json);
                    _lastGoodJson = json;
                    return parsed;
                }
                catch (Exception ex)
                {
                    MaxApp.Common.AppLog.Error("Reading settings", ex);
                }
            }

            return RecoverFromBadFile(path);
        }

        // The bad file is kept under another name, in case something in it can still be rescued by hand
        private static AppSettings RecoverFromBadFile(string path)
        {
            try
            {
                File.Move(path, path + ".corrupt-" + DateTime.Now.ToString("yyyyMMdd-HHmmss"));
            }
            catch (Exception ex)
            {
                MaxApp.Common.AppLog.Error("Keeping a damaged settings file", ex);
            }

            string good = _lastGoodJson;
            if (good == null)
            {
                string backup;
                if (TryReadFile(path + BackupSuffix, out backup) && IsCompleteJson(backup)) good = backup;
            }

            if (good != null)
            {
                try
                {
                    AppSettings restored = Parse(good);
                    _lastGoodJson = good;
                    _problem = SettingsProblem.RestoredFromBackup;
                    return restored;
                }
                catch (Exception ex)
                {
                    MaxApp.Common.AppLog.Error("Reading the settings backup", ex);
                }
            }

            _problem = SettingsProblem.ResetToDefaults;
            return new AppSettings();
        }

        private static bool TryReadFile(string path, out string text)
        {
            const int Attempts = 3;
            const int WaitMs = 50;

            text = null;
            for (int attempt = 1; attempt <= Attempts; attempt++)
            {
                try
                {
                    text = File.ReadAllText(path, Encoding.UTF8);
                    return true;
                }
                catch (IOException ex)
                {
                    MaxApp.Common.AppLog.Caught(ex);
                }
                catch (UnauthorizedAccessException ex)
                {
                    MaxApp.Common.AppLog.Caught(ex);
                }
                if (attempt < Attempts) System.Threading.Thread.Sleep(WaitMs);
            }
            return false;
        }

        // A cut-off file parses without any error and would silently read as mostly empty
        private static bool IsCompleteJson(string json)
        {
            if (string.IsNullOrEmpty(json)) return false;
            int start = json.IndexOf('{');
            if (start < 0 || json.Substring(0, start).Trim().Length > 0) return false;
            int end = Advanced.MacroStorage.FindClosingBracket(json, start);
            return end >= 0 && json.Substring(end + 1).Trim().Length == 0;
        }

        private static AppSettings Parse(string json)
        {
            AppSettings settings = new AppSettings();
            settings.AlwaysOnTop = GetBool(json, "AlwaysOnTop", false);
            settings.ShowMapOverlay = GetBool(json, "ShowMapOverlay", true);
            settings.FreeMouseMode = GetBool(json, "FreeMouseMode", true);
            settings.SmoothMouseMove = GetBool(json, "SmoothMouseMove", true);
            settings.SettingsCollapsed = GetBool(json, "SettingsCollapsed", false);
            settings.MapOverlayOpacity = Math.Max(10, Math.Min(100, GetInt(json, "MapOverlayOpacity", 60)));
            settings.IsDarkTheme = GetBool(json, "IsDarkTheme", true);
            settings.IsAdvancedTab = GetBool(json, "IsAdvancedTab", false);
            settings.ActiveSimpleTabIndex = Math.Max(0, Math.Min(SimpleTabCount - 1, GetInt(json, "ActiveSimpleTabIndex", 0)));
            settings.LastUpdateCheckDate = GetString(json, "LastUpdateCheckDate", "");
            settings.Language = GetString(json, "Language", "en");
            settings.AsianWindowWidth = Math.Max(700, GetInt(json, "AsianWindowWidth", 700));
            settings.AsianWindowHeight = Math.Max(760, GetInt(json, "AsianWindowHeight", 760));

            // Try parsing SimpleProfiles array
            int spIdx = json.IndexOf("\"SimpleProfiles\"", StringComparison.OrdinalIgnoreCase);
            if (spIdx >= 0)
            {
                int arrStart = json.IndexOf('[', spIdx);
                if (arrStart >= 0)
                {
                    int arrEnd = Advanced.MacroStorage.FindClosingBracket(json, arrStart);

                    if (arrEnd > arrStart)
                    {
                        string arrContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
                        string[] objJsons = Advanced.MacroStorage.SplitJsonObjects(arrContent);

                        if (objJsons.Length > 0)
                        {
                            settings.SimpleProfiles.Clear();
                            for (int i = 0; i < objJsons.Length && i < SimpleTabCount; i++)
                            {
                                string pJson = objJsons[i];
                                SimpleProfileConfig prof = new SimpleProfileConfig(i);
                                prof.TabIndex = GetInt(pJson, "TabIndex", i);
                                prof.IntervalMs = GetInt(pJson, "IntervalMs", 250);
                                prof.IntervalUnit = TimeUnit.Clamp(GetInt(pJson, "IntervalUnit", TimeUnit.Milliseconds));
                                prof.SimpleLoops = Math.Max(0, Math.Min(MaxLoops, GetInt(pJson, "SimpleLoops", 0)));
                                prof.SimpleJitterPx = Math.Max(0, Math.Min(MaxJitterPx, GetInt(pJson, "SimpleJitterPx", 0)));
                                prof.MouseButton = GetInt(pJson, "MouseButton", 0);
                                prof.SimpleClickMode = GetInt(pJson, "SimpleClickMode", 0);
                                prof.SimpleTargetProcessName = GetString(pJson, "SimpleTargetProcessName", "");
                                prof.SimpleTargetWindowTitle = GetString(pJson, "SimpleTargetWindowTitle", "");
                                prof.SimpleTargetWindowIndex = GetInt(pJson, "SimpleTargetWindowIndex", 0);
                                prof.SimpleRelativeToWindow = GetBool(pJson, "SimpleRelativeToWindow", false);

                                Match ptsMatch = Regex.Match(pJson, @"""Points""\s*:\s*\[([^\]]*)\]");
                                if (ptsMatch.Success)
                                {
                                    AddPoints(prof.Points, ptsMatch.Groups[1].Value);
                                }
                                settings.SimpleProfiles.Add(prof);
                            }
                        }
                    }
                }
            }

            // Ensure exactly SimpleTabCount profiles exist (configs saved with 5 tabs get empty tabs 6-8)
            while (settings.SimpleProfiles.Count < SimpleTabCount)
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
                settings.SimpleProfiles[0].SimpleTargetWindowIndex = GetInt(json, "SimpleTargetWindowIndex", 0);
                settings.SimpleRelativeToWindow = GetBool(json, "SimpleRelativeToWindow", false);

                Match pointsMatch = Regex.Match(json, @"""Points""\s*:\s*\[([^\]]*)\]");
                if (pointsMatch.Success)
                {
                    AddPoints(settings.SimpleProfiles[0].Points, pointsMatch.Groups[1].Value);
                }
            }

            // Parse AdvancedProfile object
            int advIdx = json.IndexOf("\"AdvancedProfile\"", StringComparison.OrdinalIgnoreCase);
            if (advIdx >= 0)
            {
                int objStart = json.IndexOf('{', advIdx);
                if (objStart >= 0)
                {
                    int objEnd = Advanced.MacroStorage.FindClosingBracket(json, objStart);
                    if (objEnd > objStart)
                    {
                        settings.AdvancedProfileJson = json.Substring(objStart, objEnd - objStart + 1);
                    }
                }
            }

            return settings;
        }

        // Numbers that do not fit are skipped one by one, so one bad point does not cost the rest of the file
        private static void AddPoints(List<Point> points, string pointsJson)
        {
            foreach (Match m in Regex.Matches(pointsJson, @"\{\s*""X""\s*:\s*(-?\d+)\s*,\s*""Y""\s*:\s*(-?\d+)\s*\}"))
            {
                int x, y;
                if (int.TryParse(m.Groups[1].Value, out x) && int.TryParse(m.Groups[2].Value, out y))
                {
                    points.Add(new Point(Math.Max(-MaxCoordinate, Math.Min(MaxCoordinate, x)), Math.Max(-MaxCoordinate, Math.Min(MaxCoordinate, y))));
                }
            }
        }

        public static void Save(AppSettings settings)
        {
            if (_saveBlocked) return;

            try
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("{");
                sb.AppendLine(string.Format("  \"ActiveSimpleTabIndex\": {0},", settings.ActiveSimpleTabIndex));
                sb.AppendLine(string.Format("  \"AlwaysOnTop\": {0},", settings.AlwaysOnTop.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"ShowMapOverlay\": {0},", settings.ShowMapOverlay.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"FreeMouseMode\": {0},", settings.FreeMouseMode.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"SmoothMouseMove\": {0},", settings.SmoothMouseMove.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"SettingsCollapsed\": {0},", settings.SettingsCollapsed.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"MapOverlayOpacity\": {0},", settings.MapOverlayOpacity));
                sb.AppendLine(string.Format("  \"IsDarkTheme\": {0},", settings.IsDarkTheme.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"IsAdvancedTab\": {0},", settings.IsAdvancedTab.ToString().ToLower()));
                sb.AppendLine(string.Format("  \"LastUpdateCheckDate\": \"{0}\",", EscapeJson(settings.LastUpdateCheckDate ?? "")));
                sb.AppendLine(string.Format("  \"Language\": \"{0}\",", EscapeJson(settings.Language ?? "en")));
                sb.AppendLine(string.Format("  \"AsianWindowWidth\": {0},", Math.Max(700, settings.AsianWindowWidth)));
                sb.AppendLine(string.Format("  \"AsianWindowHeight\": {0},", Math.Max(760, settings.AsianWindowHeight)));

                // Save all SimpleProfiles
                sb.AppendLine("  \"SimpleProfiles\": [");
                for (int i = 0; i < settings.SimpleProfiles.Count; i++)
                {
                    var p = settings.SimpleProfiles[i];
                    sb.AppendLine("    {");
                    sb.AppendLine(string.Format("      \"TabIndex\": {0},", p.TabIndex));
                    sb.AppendLine(string.Format("      \"IntervalMs\": {0},", p.IntervalMs));
                    sb.AppendLine(string.Format("      \"IntervalUnit\": {0},", p.IntervalUnit));
                    sb.AppendLine(string.Format("      \"SimpleLoops\": {0},", p.SimpleLoops));
                    sb.AppendLine(string.Format("      \"SimpleJitterPx\": {0},", p.SimpleJitterPx));
                    sb.AppendLine(string.Format("      \"MouseButton\": {0},", p.MouseButton));
                    sb.AppendLine(string.Format("      \"SimpleClickMode\": {0},", p.SimpleClickMode));
                    sb.AppendLine(string.Format("      \"SimpleTargetProcessName\": \"{0}\",", EscapeJson(p.SimpleTargetProcessName ?? "")));
                    sb.AppendLine(string.Format("      \"SimpleTargetWindowTitle\": \"{0}\",", EscapeJson(p.SimpleTargetWindowTitle ?? "")));
                    sb.AppendLine(string.Format("      \"SimpleTargetWindowIndex\": {0},", p.SimpleTargetWindowIndex));
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
                sb.AppendLine(string.Format("  \"SimpleTargetWindowIndex\": {0},", p0.SimpleTargetWindowIndex));
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

                string content = sb.ToString();
                string path = GetSettingsFilePath();
                FileManager.AtomicWriteAllText(path, content, Encoding.UTF8, path + BackupSuffix);
                _lastGoodJson = content;
            }
            catch (Exception ex)
            {
                MaxApp.Common.AppLog.Error("Saving settings", ex);
                _problem = SettingsProblem.CouldNotSave;
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
            Match m = Regex.Match(json, @"""" + key + @"""\s*:\s*""((?:\\.|[^""\\])*)""");
            if (m.Success)
            {
                return UnescapeJson(m.Groups[1].Value);
            }
            return defaultVal;
        }

        // Reverses EscapeJson so values like "C:\\Folder" round-trip without doubling backslashes on every save
        private static string UnescapeJson(string s)
        {
            if (string.IsNullOrEmpty(s) || s.IndexOf('\\') < 0) return s;
            StringBuilder sb = new StringBuilder(s.Length);
            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                if (c == '\\' && i + 1 < s.Length)
                {
                    char next = s[++i];
                    if (next == 'n') sb.Append('\n');
                    else if (next == 't') sb.Append('\t');
                    else if (next == 'r') { }
                    else sb.Append(next);
                }
                else
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
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
