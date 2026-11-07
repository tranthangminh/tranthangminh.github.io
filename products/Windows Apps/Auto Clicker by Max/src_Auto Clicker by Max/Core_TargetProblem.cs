using System;
using System.Collections.Generic;

namespace ModernAutoClicker
{
    public enum TargetWindowState
    {
        Ok,
        Minimized,
        Hidden,      // The window exists but is not shown (e.g. the app went to the tray)
        Closed,      // The process of the session PID is gone
        NotFound     // No session PID to report, or the process still runs without this window
    }

    /// <summary>
    /// A window target that stopped a run or blocked a Start. One problem per target window; Asian steps sharing a target are listed together.
    /// </summary>
    public class TargetProblem
    {
        public const int NoSimpleTab = -1;

        public TargetWindowState State { get; set; }
        public string ProcessName { get; set; }
        public string WindowTitle { get; set; }
        public int WindowIndex { get; set; }
        public uint Pid { get; set; }

        // Where the target is used: a Simple tab, or an Asian script and the steps inside it
        public int SimpleTabIndex { get; set; }
        public string RootScriptName { get; set; }

        // True when a run was stopped by this problem, false when it only blocked a Start
        public bool StoppedRun { get; set; }
        public List<string> Steps { get; private set; }

        public TargetProblem()
        {
            SimpleTabIndex = NoSimpleTab;
            Steps = new List<string>();
        }

        public bool IsSimple { get { return SimpleTabIndex != NoSimpleTab; } }

        // Closed or missing windows need a new target; a minimized or hidden one just has to be shown again
        public bool NeedsNewTarget { get { return State == TargetWindowState.Closed || State == TargetWindowState.NotFound; } }

        public string TargetKey
        {
            get
            {
                string source = IsSimple ? "simple:" + SimpleTabIndex : "script:" + RootScriptName;
                return string.Format("{0}|{1}|{2}|{3}", source, ProcessName, WindowTitle, WindowIndex);
            }
        }

        // e.g. 5 in the root script, or "Sub #5" for a step of a script called through RunScript
        public void AddStep(string scriptName, int stepNumber)
        {
            bool isRoot = string.IsNullOrEmpty(scriptName) || string.Equals(scriptName, RootScriptName, StringComparison.OrdinalIgnoreCase);
            Steps.Add(isRoot ? stepNumber.ToString() : string.Format("{0} #{1}", scriptName, stepNumber));
        }
    }
}
