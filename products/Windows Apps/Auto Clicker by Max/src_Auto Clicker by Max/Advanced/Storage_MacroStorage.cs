using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;

namespace ModernAutoClicker.Advanced
{
    public class MacroProject
    {
        public int ActiveIndex { get; set; }
        public List<MacroProfile> Profiles { get; set; }

        public MacroProject()
        {
            ActiveIndex = 0;
            Profiles = new List<MacroProfile>();
        }
    }

    public static class MacroStorage
    {
        public static string ToJson(MacroProfile profile)
        {
            if (profile == null) return "{}";

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine(string.Format("  \"Name\": \"{0}\",", Escape(profile.Name)));
            sb.AppendLine(string.Format("  \"IsCombine\": {0},", profile.IsCombine ? "true" : "false"));
            sb.AppendLine(string.Format("  \"LoopCount\": {0},", profile.LoopCount));
            sb.AppendLine(string.Format("  \"RandomIntervalMs\": {0},", profile.RandomIntervalMs));
            sb.AppendLine(string.Format("  \"RandomJitterPx\": {0},", profile.RandomJitterPx));
            sb.AppendLine(string.Format("  \"DefaultWindowTitle\": \"{0}\",", Escape(profile.DefaultWindowTitle)));
            sb.AppendLine(string.Format("  \"DefaultProcessName\": \"{0}\",", Escape(profile.DefaultProcessName)));
            sb.AppendLine(string.Format("  \"DefaultRelativeToWindow\": {0},", profile.DefaultRelativeToWindow ? "true" : "false"));
            sb.AppendLine("  \"Steps\": [");

            if (profile.Steps != null && profile.Steps.Count > 0)
            {
                for (int i = 0; i < profile.Steps.Count; i++)
                {
                    MacroStep s = profile.Steps[i];
                    sb.AppendLine("    {");
                    sb.AppendLine(string.Format("      \"Id\": \"{0}\",", Escape(s.Id)));
                    sb.AppendLine(string.Format("      \"Name\": \"{0}\",", Escape(s.Name)));
                    sb.AppendLine(string.Format("      \"ActionType\": {0},", (int)s.ActionType));
                    sb.AppendLine(string.Format("      \"Enabled\": {0},", s.Enabled ? "true" : "false"));
                    sb.AppendLine(string.Format("      \"IsChecked\": {0},", s.IsChecked ? "true" : "false"));
                    sb.AppendLine(string.Format("      \"StartX\": {0},", s.StartPoint.X));
                    sb.AppendLine(string.Format("      \"StartY\": {0},", s.StartPoint.Y));
                    sb.AppendLine(string.Format("      \"EndX\": {0},", s.EndPoint.X));
                    sb.AppendLine(string.Format("      \"EndY\": {0},", s.EndPoint.Y));
                    sb.AppendLine(string.Format("      \"HoldMs\": {0},", s.HoldMs));
                    sb.AppendLine(string.Format("      \"DelayMs\": {0},", s.DelayMs));
                    sb.AppendLine(string.Format("      \"RepeatCount\": {0},", s.RepeatCount));
                    sb.AppendLine(string.Format("      \"ScrollStep\": {0},", s.ScrollStep));
                    sb.AppendLine(string.Format("      \"KeyData\": \"{0}\",", Escape(s.KeyData)));
                    sb.AppendLine(string.Format("      \"ColorHex\": \"{0}\",", Escape(!string.IsNullOrEmpty(s.ColorHex) ? s.ColorHex : "#00FF00")));
                    sb.AppendLine(string.Format("      \"Tolerance\": {0},", s.Tolerance));
                    sb.AppendLine(string.Format("      \"IfTrueStep\": {0},", s.IfTrueStep));
                    sb.AppendLine(string.Format("      \"IfFalseStep\": {0},", s.IfFalseStep));
                    sb.AppendLine(string.Format("      \"WindowTitle\": \"{0}\",", Escape(s.WindowTitle)));
                    sb.AppendLine(string.Format("      \"ProcessName\": \"{0}\",", Escape(s.ProcessName)));
                    sb.AppendLine(string.Format("      \"RelativeToWindow\": {0},", s.RelativeToWindow ? "true" : "false"));
                    sb.AppendLine(string.Format("      \"Note\": \"{0}\"", Escape(s.Note)));
                    sb.AppendLine(i < profile.Steps.Count - 1 ? "    }," : "    }");
                }
            }

            sb.AppendLine("  ]");
            sb.AppendLine("}");
            return sb.ToString();
        }

        public static string ProjectToJson(List<MacroProfile> profiles, int activeIndex = 0)
        {
            if (profiles == null || profiles.Count == 0) return "{}";

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine(string.Format("  \"ActiveIndex\": {0},", activeIndex));
            sb.AppendLine("  \"Profiles\": [");

            for (int p = 0; p < profiles.Count; p++)
            {
                MacroProfile profile = profiles[p];
                sb.AppendLine("    {");
                sb.AppendLine(string.Format("      \"Name\": \"{0}\",", Escape(profile.Name)));
                sb.AppendLine(string.Format("      \"IsCombine\": {0},", profile.IsCombine ? "true" : "false"));
                sb.AppendLine(string.Format("      \"LoopCount\": {0},", profile.LoopCount));
                sb.AppendLine(string.Format("      \"RandomIntervalMs\": {0},", profile.RandomIntervalMs));
                sb.AppendLine(string.Format("      \"RandomJitterPx\": {0},", profile.RandomJitterPx));
                sb.AppendLine(string.Format("      \"DefaultWindowTitle\": \"{0}\",", Escape(profile.DefaultWindowTitle)));
                sb.AppendLine(string.Format("      \"DefaultProcessName\": \"{0}\",", Escape(profile.DefaultProcessName)));
                sb.AppendLine(string.Format("      \"DefaultRelativeToWindow\": {0},", profile.DefaultRelativeToWindow ? "true" : "false"));
                sb.AppendLine("      \"Steps\": [");

                if (profile.Steps != null && profile.Steps.Count > 0)
                {
                    for (int i = 0; i < profile.Steps.Count; i++)
                    {
                        MacroStep s = profile.Steps[i];
                        sb.AppendLine("        {");
                        sb.AppendLine(string.Format("          \"Id\": \"{0}\",", Escape(s.Id)));
                        sb.AppendLine(string.Format("          \"Name\": \"{0}\",", Escape(s.Name)));
                        sb.AppendLine(string.Format("          \"ActionType\": {0},", (int)s.ActionType));
                        sb.AppendLine(string.Format("          \"Enabled\": {0},", s.Enabled ? "true" : "false"));
                        sb.AppendLine(string.Format("          \"IsChecked\": {0},", s.IsChecked ? "true" : "false"));
                        sb.AppendLine(string.Format("          \"StartX\": {0},", s.StartPoint.X));
                        sb.AppendLine(string.Format("          \"StartY\": {0},", s.StartPoint.Y));
                        sb.AppendLine(string.Format("          \"EndX\": {0},", s.EndPoint.X));
                        sb.AppendLine(string.Format("          \"EndY\": {0},", s.EndPoint.Y));
                        sb.AppendLine(string.Format("          \"HoldMs\": {0},", s.HoldMs));
                        sb.AppendLine(string.Format("          \"DelayMs\": {0},", s.DelayMs));
                        sb.AppendLine(string.Format("          \"RepeatCount\": {0},", s.RepeatCount));
                        sb.AppendLine(string.Format("          \"ScrollStep\": {0},", s.ScrollStep));
                        sb.AppendLine(string.Format("          \"KeyData\": \"{0}\",", Escape(s.KeyData)));
                        sb.AppendLine(string.Format("          \"ColorHex\": \"{0}\",", Escape(!string.IsNullOrEmpty(s.ColorHex) ? s.ColorHex : "#00FF00")));
                        sb.AppendLine(string.Format("          \"Tolerance\": {0},", s.Tolerance));
                        sb.AppendLine(string.Format("          \"IfTrueStep\": {0},", s.IfTrueStep));
                        sb.AppendLine(string.Format("          \"IfFalseStep\": {0},", s.IfFalseStep));
                        sb.AppendLine(string.Format("          \"WindowTitle\": \"{0}\",", Escape(s.WindowTitle)));
                        sb.AppendLine(string.Format("          \"ProcessName\": \"{0}\",", Escape(s.ProcessName)));
                        sb.AppendLine(string.Format("          \"RelativeToWindow\": {0},", s.RelativeToWindow ? "true" : "false"));
                        sb.AppendLine(string.Format("          \"Note\": \"{0}\"", Escape(s.Note)));
                        sb.AppendLine(i < profile.Steps.Count - 1 ? "        }," : "        }");
                    }
                }

                sb.AppendLine("      ]");
                sb.AppendLine(p < profiles.Count - 1 ? "    }," : "    }");
            }

            sb.AppendLine("  ]");
            sb.AppendLine("}");
            return sb.ToString();
        }

        public static void SaveToFile(MacroProfile profile, string filePath)
        {
            File.WriteAllText(filePath, ToJson(profile), Encoding.UTF8);
        }

        public static void SaveProjectToFile(List<MacroProfile> profiles, int activeIndex, string filePath)
        {
            File.WriteAllText(filePath, ProjectToJson(profiles, activeIndex), Encoding.UTF8);
        }

        public static MacroProfile FromJson(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;

            MacroProfile profile = new MacroProfile();

            string name = ExtractString(json, "\"Name\"");
            if (!string.IsNullOrEmpty(name)) profile.Name = name;

            bool isComb;
            if (ExtractBool(json, "\"IsCombine\"", out isComb))
            {
                profile.IsCombine = isComb;
            }
            else if (string.Equals(profile.Name, "Combine", StringComparison.OrdinalIgnoreCase))
            {
                profile.IsCombine = true;
            }

            int loopCount;
            if (ExtractInt(json, "\"LoopCount\"", out loopCount)) profile.LoopCount = loopCount;

            int randInterval;
            if (ExtractInt(json, "\"RandomIntervalMs\"", out randInterval)) profile.RandomIntervalMs = randInterval;

            int randJitter;
            if (ExtractInt(json, "\"RandomJitterPx\"", out randJitter)) profile.RandomJitterPx = randJitter;

            string defWinTitle = ExtractString(json, "\"DefaultWindowTitle\"");
            if (!string.IsNullOrEmpty(defWinTitle)) profile.DefaultWindowTitle = defWinTitle;

            string defProcName = ExtractString(json, "\"DefaultProcessName\"");
            if (!string.IsNullOrEmpty(defProcName)) profile.DefaultProcessName = defProcName;

            bool defRel;
            if (ExtractBool(json, "\"DefaultRelativeToWindow\"", out defRel)) profile.DefaultRelativeToWindow = defRel;

            // Extract Steps
            int stepsIdx = json.IndexOf("\"Steps\"");
            if (stepsIdx >= 0)
            {
                int arrStart = json.IndexOf('[', stepsIdx);
                int arrEnd = json.LastIndexOf(']');
                if (arrStart >= 0 && arrEnd > arrStart)
                {
                    string stepsArrayContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
                    string[] stepBlocks = SplitJsonObjects(stepsArrayContent);

                    profile.Steps = new List<MacroStep>();
                    foreach (string block in stepBlocks)
                    {
                        MacroStep s = new MacroStep();
                        s.Id = ExtractString(block, "\"Id\"") ?? Guid.NewGuid().ToString("N");
                        s.Name = ExtractString(block, "\"Name\"") ?? "Step";

                        int actionTypeInt;
                        if (ExtractInt(block, "\"ActionType\"", out actionTypeInt)) s.ActionType = (MacroActionType)actionTypeInt;

                        bool enabled;
                        if (ExtractBool(block, "\"Enabled\"", out enabled)) s.Enabled = enabled;
                        else if (ExtractBool(block, "\"IsChecked\"", out enabled)) s.Enabled = enabled;

                        int sx = 0, sy = 0, ex = 0, ey = 0;
                        ExtractInt(block, "\"StartX\"", out sx);
                        ExtractInt(block, "\"StartY\"", out sy);
                        ExtractInt(block, "\"EndX\"", out ex);
                        ExtractInt(block, "\"EndY\"", out ey);
                        s.StartPoint = new Point(sx, sy);
                        s.EndPoint = new Point(ex, ey);

                        int hold;
                        if (ExtractInt(block, "\"HoldMs\"", out hold)) s.HoldMs = hold;

                        int delay;
                        if (ExtractInt(block, "\"DelayMs\"", out delay)) s.DelayMs = delay;

                        int repeat;
                        if (ExtractInt(block, "\"RepeatCount\"", out repeat)) s.RepeatCount = Math.Max(1, repeat);

                        int scrollStep;
                        if (ExtractInt(block, "\"ScrollStep\"", out scrollStep)) s.ScrollStep = scrollStep;

                        s.KeyData = ExtractString(block, "\"KeyData\"") ?? "Space";
                        string colorHex = ExtractString(block, "\"ColorHex\"");
                        if (!string.IsNullOrEmpty(colorHex))
                        {
                            s.ColorHex = colorHex;
                            try
                            {
                                s.TargetColor = ColorTranslator.FromHtml(colorHex);
                            }
                            catch { }
                        }
                        int tolerance;
                        if (ExtractInt(block, "\"Tolerance\"", out tolerance)) s.Tolerance = tolerance;

                        int ifTrueStep;
                        if (ExtractInt(block, "\"IfTrueStep\"", out ifTrueStep)) s.IfTrueStep = ifTrueStep;

                        int ifFalseStep;
                        if (ExtractInt(block, "\"IfFalseStep\"", out ifFalseStep)) s.IfFalseStep = ifFalseStep;

                        string winTitle = ExtractString(block, "\"WindowTitle\"");
                        if (!string.IsNullOrEmpty(winTitle)) s.WindowTitle = winTitle;

                        string procName = ExtractString(block, "\"ProcessName\"");
                        if (!string.IsNullOrEmpty(procName)) s.ProcessName = procName;

                        bool relToWin;
                        if (ExtractBool(block, "\"RelativeToWindow\"", out relToWin)) s.RelativeToWindow = relToWin;

                        s.Note = ExtractString(block, "\"Note\"") ?? "";

                        profile.Steps.Add(s);
                    }
                }
            }

            return profile;
        }

        public static MacroProject ProjectFromJson(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;

            MacroProject project = new MacroProject();

            int profilesIdx = json.IndexOf("\"Profiles\"");
            if (profilesIdx >= 0)
            {
                int activeIdx;
                if (ExtractInt(json, "\"ActiveIndex\"", out activeIdx)) project.ActiveIndex = activeIdx;

                int arrStart = json.IndexOf('[', profilesIdx);
                int arrEnd = json.LastIndexOf(']');
                if (arrStart >= 0 && arrEnd > arrStart)
                {
                    string profArrayContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
                    string[] profBlocks = SplitJsonObjects(profArrayContent);

                    foreach (string pBlock in profBlocks)
                    {
                        MacroProfile p = FromJson(pBlock);
                        if (p != null) project.Profiles.Add(p);
                    }
                }
            }
            else
            {
                MacroProfile single = FromJson(json);
                if (single != null)
                {
                    project.Profiles.Add(single);
                }
            }

            if (project.Profiles.Count == 0)
            {
                project.Profiles.Add(new MacroProfile { Name = "Script 1" });
            }

            project.ActiveIndex = Math.Max(0, Math.Min(project.Profiles.Count - 1, project.ActiveIndex));
            return project;
        }

        public static MacroProfile LoadFromFile(string filePath)
        {
            if (!File.Exists(filePath)) throw new FileNotFoundException("File not found", filePath);
            string json = File.ReadAllText(filePath, Encoding.UTF8);
            return FromJson(json);
        }

        public static MacroProject LoadProjectFromFile(string filePath)
        {
            if (!File.Exists(filePath)) throw new FileNotFoundException("File not found", filePath);
            string json = File.ReadAllText(filePath, Encoding.UTF8);
            return ProjectFromJson(json);
        }

        private static string Escape(string val)
        {
            if (string.IsNullOrEmpty(val)) return "";
            return val.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
        }

        private static string ExtractString(string json, string key)
        {
            int kIdx = json.IndexOf(key);
            if (kIdx < 0) return null;
            int colonIdx = json.IndexOf(':', kIdx + key.Length);
            if (colonIdx < 0) return null;
            int quoteStart = json.IndexOf('\"', colonIdx + 1);
            if (quoteStart < 0) return null;

            StringBuilder sb = new StringBuilder();
            bool esc = false;
            for (int i = quoteStart + 1; i < json.Length; i++)
            {
                char c = json[i];
                if (esc)
                {
                    if (c == 'n') sb.Append('\n');
                    else if (c == 'r') { }
                    else if (c == 't') sb.Append('\t');
                    else sb.Append(c);
                    esc = false;
                }
                else if (c == '\\')
                {
                    esc = true;
                }
                else if (c == '\"')
                {
                    return sb.ToString();
                }
                else
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }

        private static bool ExtractInt(string json, string key, out int value)
        {
            value = 0;
            int kIdx = json.IndexOf(key);
            if (kIdx < 0) return false;
            int colonIdx = json.IndexOf(':', kIdx + key.Length);
            if (colonIdx < 0) return false;

            int start = colonIdx + 1;
            while (start < json.Length && (json[start] == ' ' || json[start] == '\t' || json[start] == '\r' || json[start] == '\n')) start++;

            int end = start;
            while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '-')) end++;

            if (end > start)
            {
                string numStr = json.Substring(start, end - start);
                return int.TryParse(numStr, out value);
            }
            return false;
        }

        private static bool ExtractBool(string json, string key, out bool value)
        {
            value = false;
            int kIdx = json.IndexOf(key);
            if (kIdx < 0) return false;
            int colonIdx = json.IndexOf(':', kIdx + key.Length);
            if (colonIdx < 0) return false;

            int start = colonIdx + 1;
            while (start < json.Length && (json[start] == ' ' || json[start] == '\t' || json[start] == '\r' || json[start] == '\n')) start++;

            if (json.Length >= start + 4 && json.Substring(start, 4).ToLower() == "true")
            {
                value = true;
                return true;
            }
            if (json.Length >= start + 5 && json.Substring(start, 5).ToLower() == "false")
            {
                value = false;
                return true;
            }
            return false;
        }

        private static string[] SplitJsonObjects(string arrayContent)
        {
            List<string> blocks = new List<string>();
            int braceLevel = 0;
            int blockStart = -1;

            for (int i = 0; i < arrayContent.Length; i++)
            {
                char c = arrayContent[i];
                if (c == '{')
                {
                    if (braceLevel == 0) blockStart = i;
                    braceLevel++;
                }
                else if (c == '}')
                {
                    braceLevel--;
                    if (braceLevel == 0 && blockStart >= 0)
                    {
                        blocks.Add(arrayContent.Substring(blockStart, i - blockStart + 1));
                        blockStart = -1;
                    }
                }
            }
            return blocks.ToArray();
        }
    }
}
