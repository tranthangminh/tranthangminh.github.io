using System;
using System.Collections.Generic;

namespace ModernAutoClicker.Advanced
{
    public class MacroProfile
    {
        public string Name { get; set; }
        public bool IsCombine { get; set; }
        public int LoopCount { get; set; } // 0 = Infinite, > 0 = N times
        public int RandomIntervalMs { get; set; } // ± N ms deviation
        public int RandomJitterPx { get; set; } // ± N px coordinate offset radius
        public string DefaultWindowTitle { get; set; }
        public string DefaultProcessName { get; set; }
        public bool DefaultRelativeToWindow { get; set; }
        public List<MacroStep> Steps { get; set; }

        public MacroProfile()
        {
            Name = "New Macro Profile";
            IsCombine = false;
            LoopCount = 0;
            RandomIntervalMs = 0;
            RandomJitterPx = 0;
            DefaultWindowTitle = "";
            DefaultProcessName = "";
            DefaultRelativeToWindow = false;
            Steps = new List<MacroStep>();
        }

        public int CalculateEstimatedCycleMs(List<MacroProfile> allProfiles = null, HashSet<string> visited = null)
        {
            int total = 0;
            if (Steps == null) return 0;
            if (visited == null) visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrEmpty(Name)) visited.Add(Name);

            foreach (MacroStep s in Steps)
            {
                if (s.Enabled)
                {
                    if (s.ActionType == MacroActionType.RunScript && allProfiles != null)
                    {
                        MacroProfile target = null;
                        foreach (MacroProfile p in allProfiles)
                        {
                            if (string.Equals(p.Name, s.KeyData, StringComparison.OrdinalIgnoreCase))
                            {
                                target = p;
                                break;
                            }
                        }
                        if (target != null && target != this && !visited.Contains(target.Name ?? ""))
                        {
                            total += (target.CalculateEstimatedCycleMs(allProfiles, visited) + s.DelayMs) * Math.Max(1, s.RepeatCount);
                        }
                        else
                        {
                            total += s.DelayMs * Math.Max(1, s.RepeatCount);
                        }
                    }
                    else
                    {
                        int stepTime = (s.HoldMs + s.DelayMs) * Math.Max(1, s.RepeatCount);
                        total += stepTime;
                    }
                }
            }
            return total;
        }
    }
}
