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
        // A script can come from anywhere. Values stay inside what the engine can work with, whatever the file says; the UI's own limits are tighter where it has one.
        private const int MaxCoordinate = 100000;
        private const int MaxLoopCount = 999999;
        private const int MaxJitterPx = 100;
        private const int MaxRandomIntervalMs = 10000;
        private const int MinSpeedPercent = 10;
        private const int MaxSpeedPercent = 2000;
        private const int MaxDurationMs = 24 * 60 * 60 * 1000;
        private const int MaxRepeat = 999999;
        private const int MaxScrollStep = 99;
        private const int MaxColorTolerance = 255;
        private const int MaxSimilarity = 100;
        private const int MaxTimeoutSec = 24 * 60 * 60;
        private const int MaxTimerSeconds = 30 * 24 * 60 * 60;
        private const int MaxStepNumber = 999999;
        private const int LowestJumpCode = -3; // -1 Stop, -2 Click Target, -3 Repeat this Step
        private const int MaxMouseButton = 2;
        private const int MaxPressClickMode = 3;
        private const int MaxPressClickOrder = 1;

        private static int Clamp(int value, int min, int max)
        {
            return Math.Max(min, Math.Min(max, value));
        }

        private static Point ClampPoint(Point pt)
        {
            return new Point(Clamp(pt.X, -MaxCoordinate, MaxCoordinate), Clamp(pt.Y, -MaxCoordinate, MaxCoordinate));
        }

        private static void ClampProfile(MacroProfile profile)
        {
            profile.LoopCount = Clamp(profile.LoopCount, 0, MaxLoopCount);
            profile.RandomJitterPx = Clamp(profile.RandomJitterPx, 0, MaxJitterPx);
            profile.RandomIntervalMs = Clamp(profile.RandomIntervalMs, 0, MaxRandomIntervalMs);
            profile.SpeedPercent = Clamp(profile.SpeedPercent, MinSpeedPercent, MaxSpeedPercent);
        }

        private static void ClampStep(MacroStep s)
        {
            s.StartPoint = ClampPoint(s.StartPoint);
            s.EndPoint = ClampPoint(s.EndPoint);
            s.HoldMs = Clamp(s.HoldMs, 0, MaxDurationMs);
            s.DelayMs = Clamp(s.DelayMs, 0, MaxDurationMs);
            s.BaseHoldMs = Clamp(s.BaseHoldMs, 0, MaxDurationMs);
            s.BaseDelayMs = Clamp(s.BaseDelayMs, 0, MaxDurationMs);
            s.RepeatCount = Clamp(s.RepeatCount, 1, MaxRepeat);
            s.ScrollStep = Clamp(s.ScrollStep, -MaxScrollStep, MaxScrollStep);
            s.DragButton = Clamp(s.DragButton, 0, MaxMouseButton);
            s.Tolerance = Clamp(s.Tolerance, 0, MaxColorTolerance);
            s.IfTrueStep = Clamp(s.IfTrueStep, LowestJumpCode, MaxStepNumber);
            s.IfFalseStep = Clamp(s.IfFalseStep, LowestJumpCode, MaxStepNumber);
            s.Similarity = Clamp(s.Similarity, 0, MaxSimilarity);
            s.TimeoutSec = Clamp(s.TimeoutSec, 0, MaxTimeoutSec);
            s.RepeatTimerSeconds = Clamp(s.RepeatTimerSeconds, 0, MaxTimerSeconds);
            s.RepeatTimerTargetStep = Clamp(s.RepeatTimerTargetStep, 0, MaxStepNumber);
            s.PressClickMode = Clamp(s.PressClickMode, 0, MaxPressClickMode);
            s.PressClickOrder = Clamp(s.PressClickOrder, 0, MaxPressClickOrder);
        }

        public static string ToJson(MacroProfile profile)
        {
            if (profile == null) return "{}";

            StringBuilder sb = new StringBuilder();
            AppendProfile(sb, profile, "", false);
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
                AppendProfile(sb, profiles[p], "    ", p < profiles.Count - 1);
            }

            sb.AppendLine("  ]");
            sb.AppendLine("}");
            return sb.ToString();
        }

        private static void AppendProfile(StringBuilder sb, MacroProfile profile, string indent, bool trailingComma)
        {
            string k = indent + "  ";
            sb.AppendLine(indent + "{");
            sb.AppendLine(string.Format("{0}\"Name\": \"{1}\",", k, Escape(profile.Name)));
            sb.AppendLine(string.Format("{0}\"IsCombine\": {1},", k, profile.IsCombine ? "true" : "false"));
            sb.AppendLine(string.Format("{0}\"LoopCount\": {1},", k, profile.LoopCount));
            sb.AppendLine(string.Format("{0}\"RandomIntervalMs\": {1},", k, profile.RandomIntervalMs));
            sb.AppendLine(string.Format("{0}\"RandomJitterPx\": {1},", k, profile.RandomJitterPx));
            sb.AppendLine(string.Format("{0}\"SpeedPercent\": {1},", k, profile.SpeedPercent > 0 ? profile.SpeedPercent : 100));
            sb.AppendLine(string.Format("{0}\"DefaultWindowTitle\": \"{1}\",", k, Escape(profile.DefaultWindowTitle)));
            sb.AppendLine(string.Format("{0}\"DefaultProcessName\": \"{1}\",", k, Escape(profile.DefaultProcessName)));
            sb.AppendLine(string.Format("{0}\"DefaultRelativeToWindow\": {1},", k, profile.DefaultRelativeToWindow ? "true" : "false"));
            sb.AppendLine(string.Format("{0}\"DefaultWindowIndex\": {1},", k, profile.DefaultWindowIndex));
            sb.AppendLine(k + "\"Steps\": [");

            if (profile.Steps != null && profile.Steps.Count > 0)
            {
                for (int i = 0; i < profile.Steps.Count; i++)
                {
                    AppendStep(sb, profile.Steps[i], k + "  ", i < profile.Steps.Count - 1);
                }
            }

            sb.AppendLine(k + "]");
            sb.AppendLine(indent + (trailingComma ? "}," : "}"));
        }

        private static void AppendStep(StringBuilder sb, MacroStep s, string indent, bool trailingComma)
        {
            string k = indent + "  ";
            sb.AppendLine(indent + "{");
            sb.AppendLine(string.Format("{0}\"Id\": \"{1}\",", k, Escape(s.Id)));
            sb.AppendLine(string.Format("{0}\"Name\": \"{1}\",", k, Escape(s.Name)));
            sb.AppendLine(string.Format("{0}\"ActionType\": {1},", k, (int)s.ActionType));
            sb.AppendLine(string.Format("{0}\"Enabled\": {1},", k, s.Enabled ? "true" : "false"));
            sb.AppendLine(string.Format("{0}\"IsChecked\": {1},", k, s.IsChecked ? "true" : "false"));
            sb.AppendLine(string.Format("{0}\"StartX\": {1},", k, s.StartPoint.X));
            sb.AppendLine(string.Format("{0}\"StartY\": {1},", k, s.StartPoint.Y));
            sb.AppendLine(string.Format("{0}\"EndX\": {1},", k, s.EndPoint.X));
            sb.AppendLine(string.Format("{0}\"EndY\": {1},", k, s.EndPoint.Y));
            sb.AppendLine(string.Format("{0}\"HoldMs\": {1},", k, s.HoldMs));
            sb.AppendLine(string.Format("{0}\"DelayMs\": {1},", k, s.DelayMs));
            sb.AppendLine(string.Format("{0}\"DelayUnit\": {1},", k, s.DelayUnit));
            sb.AppendLine(string.Format("{0}\"BaseHoldMs\": {1},", k, s.BaseHoldMs > 0 ? s.BaseHoldMs : s.HoldMs));
            sb.AppendLine(string.Format("{0}\"BaseDelayMs\": {1},", k, s.BaseDelayMs >= 0 ? s.BaseDelayMs : s.DelayMs));
            sb.AppendLine(string.Format("{0}\"RepeatCount\": {1},", k, s.RepeatCount));
            sb.AppendLine(string.Format("{0}\"ScrollStep\": {1},", k, s.ScrollStep));
            sb.AppendLine(string.Format("{0}\"DragButton\": {1},", k, s.DragButton));
            sb.AppendLine(string.Format("{0}\"KeyData\": \"{1}\",", k, Escape(s.KeyData)));
            sb.AppendLine(string.Format("{0}\"ColorHex\": \"{1}\",", k, Escape(!string.IsNullOrEmpty(s.ColorHex) ? s.ColorHex : "#00FF00")));
            sb.AppendLine(string.Format("{0}\"Tolerance\": {1},", k, s.Tolerance));
            sb.AppendLine(string.Format("{0}\"IfTrueStep\": {1},", k, s.IfTrueStep));
            sb.AppendLine(string.Format("{0}\"IfFalseStep\": {1},", k, s.IfFalseStep));
            sb.AppendLine(string.Format("{0}\"WindowTitle\": \"{1}\",", k, Escape(s.WindowTitle)));
            sb.AppendLine(string.Format("{0}\"ProcessName\": \"{1}\",", k, Escape(s.ProcessName)));
            sb.AppendLine(string.Format("{0}\"RelativeToWindow\": {1},", k, s.RelativeToWindow ? "true" : "false"));
            sb.AppendLine(string.Format("{0}\"WindowIndex\": {1},", k, s.WindowIndex));
            sb.AppendLine(string.Format("{0}\"ImageBase64\": \"{1}\",", k, Escape(s.ImageBase64)));
            sb.AppendLine(string.Format("{0}\"Similarity\": {1},", k, s.Similarity > 0 ? s.Similarity : 90));
            sb.AppendLine(string.Format("{0}\"TimeoutSec\": {1},", k, s.TimeoutSec > 0 ? s.TimeoutSec : 10));
            sb.AppendLine(string.Format("{0}\"RepeatTimerMode\": {1},", k, s.RepeatTimerMode));
            sb.AppendLine(string.Format("{0}\"RepeatTimerSeconds\": {1},", k, s.RepeatTimerSeconds > 0 ? s.RepeatTimerSeconds : 300));
            sb.AppendLine(string.Format("{0}\"RepeatTimerTargetStep\": {1},", k, s.RepeatTimerTargetStep > 0 ? s.RepeatTimerTargetStep : 1));
            sb.AppendLine(string.Format("{0}\"PressClickMode\": {1},", k, s.PressClickMode));
            sb.AppendLine(string.Format("{0}\"PressClickOrder\": {1},", k, s.PressClickOrder));
            sb.AppendLine(string.Format("{0}\"Note\": \"{1}\"", k, Escape(s.Note)));
            sb.AppendLine(indent + (trailingComma ? "}," : "}"));
        }

        public static void SaveToFile(MacroProfile profile, string filePath)
        {
            ModernAutoClicker.FileManager.AtomicWriteAllText(filePath, ToJson(profile), Encoding.UTF8);
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

            int speedPercent;
            if (ExtractInt(json, "\"SpeedPercent\"", out speedPercent)) profile.SpeedPercent = speedPercent > 0 ? speedPercent : 100;
            else profile.SpeedPercent = 100;

            string defWinTitle = ExtractString(json, "\"DefaultWindowTitle\"");
            if (!string.IsNullOrEmpty(defWinTitle)) profile.DefaultWindowTitle = defWinTitle;

            string defProcName = ExtractString(json, "\"DefaultProcessName\"");
            if (!string.IsNullOrEmpty(defProcName)) profile.DefaultProcessName = defProcName;

            bool defRel;
            if (ExtractBool(json, "\"DefaultRelativeToWindow\"", out defRel)) profile.DefaultRelativeToWindow = defRel;

            int defWinIdx;
            if (ExtractInt(json, "\"DefaultWindowIndex\"", out defWinIdx)) profile.DefaultWindowIndex = defWinIdx;

            // Extract Steps
            string stepsArrayContent = ExtractArrayContent(json, "\"Steps\"");
            if (stepsArrayContent != null)
            {
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

                    int delayUnit;
                    if (ExtractInt(block, "\"DelayUnit\"", out delayUnit)) s.DelayUnit = TimeUnit.Clamp(delayUnit);

                    int baseHold;
                    if (ExtractInt(block, "\"BaseHoldMs\"", out baseHold)) s.BaseHoldMs = baseHold;
                    else s.BaseHoldMs = s.HoldMs;

                    int baseDelay;
                    if (ExtractInt(block, "\"BaseDelayMs\"", out baseDelay)) s.BaseDelayMs = baseDelay;
                    else s.BaseDelayMs = s.DelayMs;

                    int repeat;
                    if (ExtractInt(block, "\"RepeatCount\"", out repeat)) s.RepeatCount = Math.Max(1, repeat);

                    int scrollStep;
                    if (ExtractInt(block, "\"ScrollStep\"", out scrollStep)) s.ScrollStep = scrollStep;

                    int dragButton;
                    if (ExtractInt(block, "\"DragButton\"", out dragButton)) s.DragButton = dragButton;
                    else s.DragButton = 0;

                    s.KeyData = ExtractString(block, "\"KeyData\"") ?? "Space";
                    string colorHex = ExtractString(block, "\"ColorHex\"");
                    if (!string.IsNullOrEmpty(colorHex))
                    {
                        s.ColorHex = colorHex;
                        try
                        {
                            s.TargetColor = ColorTranslator.FromHtml(colorHex);
                        }
                        catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
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

                    int winIdx;
                    if (ExtractInt(block, "\"WindowIndex\"", out winIdx)) s.WindowIndex = winIdx;

                    string imgB64 = ExtractString(block, "\"ImageBase64\"");
                    if (!string.IsNullOrEmpty(imgB64)) s.ImageBase64 = imgB64;

                    int sim;
                    if (ExtractInt(block, "\"Similarity\"", out sim)) s.Similarity = sim;
                    else s.Similarity = 90;

                    int timeoutSec;
                    if (ExtractInt(block, "\"TimeoutSec\"", out timeoutSec)) s.TimeoutSec = timeoutSec;
                    else s.TimeoutSec = 10;

                    int repeatTimerMode;
                    if (ExtractInt(block, "\"RepeatTimerMode\"", out repeatTimerMode)) s.RepeatTimerMode = repeatTimerMode;

                    int repeatTimerSec;
                    if (ExtractInt(block, "\"RepeatTimerSeconds\"", out repeatTimerSec)) s.RepeatTimerSeconds = repeatTimerSec;

                    int repeatTimerTarget;
                    if (ExtractInt(block, "\"RepeatTimerTargetStep\"", out repeatTimerTarget)) s.RepeatTimerTargetStep = repeatTimerTarget;

                    int pressClickMode;
                    if (ExtractInt(block, "\"PressClickMode\"", out pressClickMode)) s.PressClickMode = pressClickMode;

                    int pressClickOrder;
                    if (ExtractInt(block, "\"PressClickOrder\"", out pressClickOrder)) s.PressClickOrder = pressClickOrder;

                    s.Note = ExtractString(block, "\"Note\"") ?? "";

                    ClampStep(s);
                    profile.Steps.Add(s);
                }
            }

            ClampProfile(profile);
            return profile;
        }

        public static MacroProject ProjectFromJson(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;

            MacroProject project = new MacroProject();

            if (IndexOfKey(json, "\"Profiles\"") >= 0)
            {
                int activeIdx;
                if (ExtractInt(json, "\"ActiveIndex\"", out activeIdx)) project.ActiveIndex = activeIdx;

                string profArrayContent = ExtractArrayContent(json, "\"Profiles\"");
                if (profArrayContent != null)
                {
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

        /// <summary>
        /// Finds a JSON key token (e.g. "\"Name\"") that is followed by ':' and is not inside a string value.
        /// Returns the index of the key's opening quote, or -1.
        /// </summary>
        private static int IndexOfKey(string json, string key)
        {
            int i = 0;
            while (i < json.Length)
            {
                if (json[i] != '\"')
                {
                    i++;
                    continue;
                }

                int tokenStart = i;
                int tokenEnd = SkipString(json, i);
                if (tokenEnd < 0) return -1;

                if (tokenEnd - tokenStart + 1 == key.Length && string.CompareOrdinal(json, tokenStart, key, 0, key.Length) == 0)
                {
                    int next = tokenEnd + 1;
                    while (next < json.Length && char.IsWhiteSpace(json[next])) next++;
                    if (next < json.Length && json[next] == ':') return tokenStart;
                }
                i = tokenEnd + 1;
            }
            return -1;
        }

        // Returns the index of the closing quote of the string starting at quoteIdx, or -1 if unterminated
        private static int SkipString(string json, int quoteIdx)
        {
            for (int i = quoteIdx + 1; i < json.Length; i++)
            {
                if (json[i] == '\\') i++;
                else if (json[i] == '\"') return i;
            }
            return -1;
        }

        /// <summary>
        /// Returns the index of the bracket that closes the '[' or '{' at openIdx, ignoring brackets inside string values; -1 if not found.
        /// </summary>
        public static int FindClosingBracket(string json, int openIdx)
        {
            if (json == null || openIdx < 0 || openIdx >= json.Length) return -1;
            int depth = 0;
            for (int i = openIdx; i < json.Length; i++)
            {
                char c = json[i];
                if (c == '\"')
                {
                    i = SkipString(json, i);
                    if (i < 0) return -1;
                }
                else if (c == '[' || c == '{')
                {
                    depth++;
                }
                else if (c == ']' || c == '}')
                {
                    depth--;
                    if (depth == 0) return i;
                }
            }
            return -1;
        }

        private static string ExtractArrayContent(string json, string key)
        {
            int kIdx = IndexOfKey(json, key);
            if (kIdx < 0) return null;
            int arrStart = json.IndexOf('[', kIdx + key.Length);
            if (arrStart < 0) return null;
            int arrEnd = FindClosingBracket(json, arrStart);
            if (arrEnd < 0) arrEnd = json.LastIndexOf(']');
            if (arrEnd <= arrStart) return null;
            return json.Substring(arrStart + 1, arrEnd - arrStart - 1);
        }

        private static string ExtractString(string json, string key)
        {
            int kIdx = IndexOfKey(json, key);
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
            int kIdx = IndexOfKey(json, key);
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
            int kIdx = IndexOfKey(json, key);
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

        /// <summary>
        /// Splits the content of a JSON array into its top-level object blocks, ignoring braces inside string values.
        /// </summary>
        public static string[] SplitJsonObjects(string arrayContent)
        {
            List<string> blocks = new List<string>();
            int braceLevel = 0;
            int blockStart = -1;

            for (int i = 0; i < arrayContent.Length; i++)
            {
                char c = arrayContent[i];
                if (c == '\"')
                {
                    int close = SkipString(arrayContent, i);
                    if (close < 0) break;
                    i = close;
                }
                else if (c == '{')
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
