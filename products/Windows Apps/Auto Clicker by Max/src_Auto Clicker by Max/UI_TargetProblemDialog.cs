using MaxApp.Common;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using Loc = ModernAutoClicker.Localization.Loc;

namespace ModernAutoClicker
{
    /// <summary>The new target picked for a problem: a window, or All Screens (Window is null).</summary>
    public class TargetChoice
    {
        public NativeMethods.WindowTargetInfo Window { get; set; }
    }

    /// <summary>
    /// Tells why a run stopped or could not start because of its target window.
    /// A closed or missing window also offers a new target (the same list as everywhere else); a minimized or hidden one only explains what to do.
    /// Nothing changes until the user presses Change Target, and pressing it never starts a run.
    /// </summary>
    public class TargetProblemDialog : ModernDialog
    {
        private const int DialogWidth = 460;
        private const int SidePad = 16;
        private const int ContentWidth = DialogWidth - SidePad * 2;
        private const int MaxBodyHeight = 460;
        private const int LongTitleLimit = 60;
        private const int StepListLimit = 10;
        private const int PidListLimit = 6;

        private readonly Dictionary<TargetProblem, TargetChoice> _choices = new Dictionary<TargetProblem, TargetChoice>();
        private readonly List<NativeMethods.WindowTargetInfo> _openWindows;
        private MaxApp.Common.RoundedButton _btnChange;

        public Dictionary<TargetProblem, TargetChoice> Choices { get { return _choices; } }

        public TargetProblemDialog(List<TargetProblem> problems, ThemeTokens theme)
            : base(Loc.TargetDialogTitle, theme)
        {
            _openWindows = NativeMethods.GetOpenWindows();
            this.TopMost = true; // F6 can come from another app, with Auto Clicker behind it

            int y = 14;
            bool offersNewTarget = false;
            foreach (TargetProblem problem in problems)
            {
                AddProblem(problem, ref y);
                offersNewTarget = offersNewTarget || problem.NeedsNewTarget;
                y += 18;
            }

            AddDialogButtons(offersNewTarget);
            SetBodySize(DialogWidth, y - 4, MaxBodyHeight);

            UpdateChangeButton();
        }

        private void AddProblem(TargetProblem problem, ref int y)
        {
            Color titleColor = problem.NeedsNewTarget ? Theme.Danger : Theme.CYellow;
            AddText(GetStateTitle(problem), ThemeTokens.FontCard(FontStyle.Bold), titleColor, ref y);
            AddText(DescribeTarget(problem), ThemeTokens.FontBase(FontStyle.Bold), Theme.TextPrimary, ref y);
            AddText(DescribeScope(problem), ThemeTokens.FontBase(FontStyle.Regular), Theme.TextSecondary, ref y);
            AddText(DescribeNextStep(problem), ThemeTokens.FontBase(FontStyle.Regular), Theme.TextSecondary, ref y);

            if (!problem.NeedsNewTarget) return;

            y += 4;
            AddText(Loc.TargetNewTargetLabel, ThemeTokens.FontBase(FontStyle.Bold), Theme.TextPrimary, ref y);

            ModernDropdownButton picker = new ModernDropdownButton
            {
                Location = new Point(SidePad, y),
                Size = new Size(ContentWidth, 30),
                Text = Loc.TargetPickWindow,
                Image = IconCache.GenericAppIcon
            };
            picker.ApplyTheme(Theme);
            picker.Click += (s, e) => ShowTargetMenu(problem, picker);
            Body.Controls.Add(picker);
            y += picker.Height;

            NativeMethods.WindowTargetInfo preselected = FindOpenedFirst(problem.ProcessName);
            if (preselected != null) SetChoice(problem, picker, preselected);
        }

        private void AddText(string text, Font font, Color color, ref int y)
        {
            if (string.IsNullOrEmpty(text)) return;

            Size measured = TextRenderer.MeasureText(text, font, new Size(ContentWidth, 0), TextFormatFlags.WordBreak | TextFormatFlags.NoPrefix);
            Label label = new Label
            {
                Text = text,
                Location = new Point(SidePad, y),
                Size = new Size(ContentWidth, measured.Height),
                Font = font,
                ForeColor = color,
                UseMnemonic = false
            };
            Body.Controls.Add(label);
            y += measured.Height + 4;
        }

        private void AddDialogButtons(bool offersNewTarget)
        {
            MaxApp.Common.RoundedButton dismiss;
            if (offersNewTarget)
            {
                dismiss = AddButton(Loc.TargetBtnKeep, DialogResult.Cancel, false);
                _btnChange = AddButton(Loc.TargetBtnChange, DialogResult.OK, true);
            }
            else
            {
                dismiss = AddButton(Loc.TargetBtnGotIt, DialogResult.Cancel, true);
            }

            // Enter and Esc never change anything
            this.AcceptButton = dismiss;
            this.CancelButton = dismiss;
        }

        // The same list as the target buttons in the main window, read when the list opens
        private void ShowTargetMenu(TargetProblem problem, ModernDropdownButton picker)
        {
            picker.IsOpen = true;
            TargetWindowMenu.Show(picker, Theme, (window) => SetChoice(problem, picker, window), () => { picker.IsOpen = false; });
        }

        private void SetChoice(TargetProblem problem, ModernDropdownButton picker, NativeMethods.WindowTargetInfo window)
        {
            _choices[problem] = new TargetChoice { Window = window };
            if (window == null)
            {
                picker.Text = Loc.TargetAllScreens;
                picker.Image = IconCache.DesktopIcon;
            }
            else
            {
                picker.Text = window.ToString();
                picker.Image = window.AppIcon ?? IconCache.GenericAppIcon;
            }
            UpdateChangeButton();
        }

        private void UpdateChangeButton()
        {
            if (_btnChange != null) _btnChange.Enabled = _choices.Count > 0;
        }

        // Only a suggestion, nothing happens until Change Target: the window of the same app that was opened first and can be used right now
        private NativeMethods.WindowTargetInfo FindOpenedFirst(string processName)
        {
            NativeMethods.WindowTargetInfo best = null;
            foreach (NativeMethods.WindowTargetInfo win in SameAppWindows(processName))
            {
                if (NativeMethods.IsIconic(win.Hwnd)) continue;
                if (best == null || CompareOpenedFirst(win, best) < 0) best = win;
            }
            return best;
        }

        private static int CompareOpenedFirst(NativeMethods.WindowTargetInfo a, NativeMethods.WindowTargetInfo b)
        {
            int byTime = a.StartTime.CompareTo(b.StartTime);
            if (byTime != 0) return byTime;
            int byPid = a.ProcessId.CompareTo(b.ProcessId);
            if (byPid != 0) return byPid;
            return a.Hwnd.ToInt64().CompareTo(b.Hwnd.ToInt64());
        }

        private List<NativeMethods.WindowTargetInfo> SameAppWindows(string processName)
        {
            List<NativeMethods.WindowTargetInfo> result = new List<NativeMethods.WindowTargetInfo>();
            if (string.IsNullOrEmpty(processName)) return result;

            string clean = processName.Trim();
            if (clean.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) clean = clean.Substring(0, clean.Length - 4);

            foreach (NativeMethods.WindowTargetInfo win in _openWindows)
            {
                if (string.Equals(win.ProcessName, clean, StringComparison.OrdinalIgnoreCase)) result.Add(win);
            }
            return result;
        }

        private static string GetStateTitle(TargetProblem problem)
        {
            switch (problem.State)
            {
                case TargetWindowState.Closed: return Loc.TargetTitleClosed;
                case TargetWindowState.Minimized: return Loc.TargetTitleMinimized;
                case TargetWindowState.Hidden: return Loc.TargetTitleHidden;
                default: return Loc.TargetTitleNotFound;
            }
        }

        // notepad (PID 1234) "Notes A". The PID shows which instance is meant, so "closed" is not mistaken for another window of the same app that is still open.
        private static string DescribeTarget(TargetProblem problem)
        {
            StringBuilder sb = new StringBuilder(string.IsNullOrEmpty(problem.ProcessName) ? "?" : problem.ProcessName);
            if (problem.Pid > 0) sb.AppendFormat(" (PID {0})", problem.Pid);

            string title = (problem.WindowTitle ?? "").Trim();
            if (title.Length > LongTitleLimit) title = title.Substring(0, LongTitleLimit - 3) + "...";
            if (title.Length > 0) sb.AppendFormat(" \"{0}\"", title);
            return sb.ToString();
        }

        private static string DescribeScope(TargetProblem problem)
        {
            string name = problem.IsSimple ? Loc.RunningSimpleName(problem.SimpleTabIndex + 1) : Loc.RunningAsianName(problem.RootScriptName);
            if (problem.StoppedRun)
            {
                return problem.Steps.Count > 0 ? Loc.TargetRunStoppedAtStep(name, problem.Steps[0]) : Loc.TargetRunStopped(name);
            }

            string notStarted = Loc.TargetRunNotStarted(name);
            if (problem.Steps.Count == 0) return notStarted;

            List<string> shown = problem.Steps.Count > StepListLimit ? problem.Steps.GetRange(0, StepListLimit) : problem.Steps;
            string steps = string.Join(", ", shown.ToArray()) + (problem.Steps.Count > StepListLimit ? ", ..." : "");
            return notStarted + " " + Loc.TargetStepsUsing(steps);
        }

        private string DescribeNextStep(TargetProblem problem)
        {
            if (problem.State == TargetWindowState.Minimized) return Loc.TargetHintMinimized;
            if (problem.State == TargetWindowState.Hidden) return Loc.TargetHintHidden;

            List<string> pids = new List<string>();
            foreach (NativeMethods.WindowTargetInfo win in SameAppWindows(problem.ProcessName))
            {
                string pid = "PID " + win.ProcessId;
                if (!pids.Contains(pid)) pids.Add(pid);
            }

            if (pids.Count == 0) return Loc.TargetHintNoOtherWindows;

            int total = pids.Count;
            if (total > PidListLimit) pids = pids.GetRange(0, PidListLimit);
            string list = string.Join(", ", pids.ToArray()) + (total > PidListLimit ? ", ..." : "");
            return Loc.TargetHintOtherWindows(problem.ProcessName, list);
        }
    }
}
