using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;
using MaxApp.Common;

namespace ModernAutoClicker.Advanced
{
    public class MacroRunner
    {
        private volatile bool _isRunning = false;
        private volatile bool _freeMouseMode = false;
        private Thread _workerThread = null;
        private bool _hasRun = false;
        private volatile int _totalCyclesCompleted = 0;
        private long _stepsExecuted = 0;
        private int _targetLoops = 0;

        public bool IsRunning { get { return _isRunning; } }
        public int TotalCyclesCompleted { get { return _totalCyclesCompleted; } }
        public int TargetLoops { get { return _targetLoops; } }
        // The run clock stops with the run, so the numbers of the last run stay on screen after it ends
        public TimeSpan Elapsed { get { return _runClock.Elapsed; } }
        public bool HasRun { get { return _hasRun; } }

        // Another tab started while this one moves the real mouse: from the next step on this run clicks in the background too,
        // or the two runs would fight over the cursor and the front window
        public void SwitchToFreeMouse() { _freeMouseMode = true; }

        // Every enabled step the run has gone through, including the steps of scripts called via RunScript and steps repeated by a jump
        public long StepsExecuted { get { return Interlocked.Read(ref _stepsExecuted); } }

        public event Action<int, string> OnStepExecuting; // stepIndex, stepName
        public event Action<TargetProblem> OnTargetLost; // Raised on the worker thread before OnStopped
        public event Action<Exception> OnRunFailed; // Raised on the worker thread before OnStopped
        public event Action OnStopped;

        private string _rootScriptName = "";
        private string _currentScriptName = "";

        // A step with nothing to wait for (a call to a missing script, a loop block) runs tens of thousands of times a second.
        // Reporting each one would bury the UI thread, F7 included, so the UI hears about a step at most this often.
        private const int StepReportIntervalMs = 33;
        private readonly Stopwatch _runClock = new Stopwatch();
        private long _nextStepReportMs = 0;

        // For the same reason the thread rests now and then, whatever the steps do
        private const int StepsBetweenRests = 256;
        private int _stepsSinceRest = 0;

        private class RepeatTimerSession
        {
            public bool IsActive;
            public int RemainingCount;
            public DateTime Deadline;
        }

        private readonly Dictionary<string, RepeatTimerSession> _repeatTimerStates = new Dictionary<string, RepeatTimerSession>(StringComparer.OrdinalIgnoreCase);

        // Scripts currently on the RunScript call chain (prevents A -> B -> A infinite recursion / StackOverflow)
        private readonly HashSet<string> _scriptCallChain = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        public void Start(MacroProfile profile, List<MacroProfile> allProfiles, bool freeMouseMode, bool smoothMouseMove = false)
        {
            if (_isRunning || profile == null) return;
            if (profile.Steps == null || profile.Steps.Count == 0) return;

            List<MacroStep> stepsToRun = new List<MacroStep>();
            foreach (MacroStep s in profile.Steps)
            {
                stepsToRun.Add(s.Clone());
            }

            if (stepsToRun.Count == 0)
            {
                _isRunning = false;
                if (OnStopped != null) OnStopped();
                return;
            }

            // Clone all sub-profiles so mutations during execution don't cause collection errors
            Dictionary<string, List<MacroStep>> subProfilesMap = new Dictionary<string, List<MacroStep>>(StringComparer.OrdinalIgnoreCase);
            if (allProfiles != null)
            {
                foreach (MacroProfile p in allProfiles)
                {
                    if (!p.IsCombine && p.Steps != null)
                    {
                        List<MacroStep> stepList = new List<MacroStep>();
                        foreach (MacroStep s in p.Steps)
                        {
                            stepList.Add(s.Clone());
                        }
                        subProfilesMap[p.Name ?? ""] = stepList;
                    }
                }
            }

            _isRunning = true;
            _freeMouseMode = freeMouseMode;
            _totalCyclesCompleted = 0;
            _stepsExecuted = 0;
            _targetLoops = profile.LoopCount;
            _rootScriptName = profile.Name ?? "";
            _currentScriptName = _rootScriptName;
            _hasRun = true;
            _runClock.Restart();
            _nextStepReportMs = 0;
            _stepsSinceRest = 0;
            _repeatTimerStates.Clear();
            _scriptCallChain.Clear();
            _scriptCallChain.Add(profile.Name ?? "");

            int targetLoops = profile.LoopCount;
            int randIntervalMs = Math.Max(0, profile.RandomIntervalMs);
            int randJitterPx = Math.Max(0, profile.RandomJitterPx);

            _workerThread = new Thread(() =>
            {
                Exception failure = null;
                try
                {
                    RunLoops(stepsToRun, subProfilesMap, smoothMouseMove, targetLoops, randIntervalMs, randJitterPx);
                }
                catch (Exception ex)
                {
                    failure = ex;
                }
                FinishRun(failure);
            })
            {
                IsBackground = true,
                Name = "MacroRunnerThread"
            };

            _workerThread.Start();
        }

        // Whatever went wrong inside a run, it ends here: an exception on this thread would close the whole app with keys and buttons still held down
        private void FinishRun(Exception failure)
        {
            EndRun();
            try
            {
                KeyboardSimulator.ReleaseAllKeys();
                NativeMethods.ReleaseAllMouseButtons();
                if (failure != null)
                {
                    AppLog.Error("Running script " + _rootScriptName, failure);
                    if (OnRunFailed != null) OnRunFailed(failure);
                }
                if (OnStopped != null) OnStopped();
            }
            catch (Exception ex)
            {
                AppLog.Error("Ending a script run", ex);
            }
        }

        private void RunLoops(List<MacroStep> stepsToRun, Dictionary<string, List<MacroStep>> subProfilesMap, bool smoothMouseMove, int targetLoops, int randIntervalMs, int randJitterPx)
        {
        Thread.Sleep(60);

        // Initial settle and focus for first step (prevents missed first click)
        if (!_freeMouseMode && stepsToRun.Count > 0)
        {
            MacroStep firstStep = stepsToRun.Find(s => s.Enabled && (s.StartPoint != Point.Empty || s.RelativeToWindow));
            if (firstStep != null && EnsureStepTarget(firstStep, stepsToRun.IndexOf(firstStep)))
            {
                if (firstStep.RelativeToWindow)
                {
                    IntPtr fHwnd = firstStep.WindowHwnd;
                    if (!NativeMethods.IsValidWindowHandle(fHwnd, firstStep.TargetPid, firstStep.ProcessName))
                    {
                        fHwnd = NativeMethods.FindWindowByTarget(firstStep.ProcessName, firstStep.WindowTitle, firstStep.WindowIndex, firstStep.TargetPid);
                        if (fHwnd != IntPtr.Zero)
                        {
                            firstStep.WindowHwnd = fHwnd;
                            uint p;
                            NativeMethods.GetWindowThreadProcessId(fHwnd, out p);
                            if (p > 0) firstStep.TargetPid = p;
                        }
                        else
                        {
                            firstStep.WindowHwnd = IntPtr.Zero;
                        }
                    }
                    if (fHwnd != IntPtr.Zero)
                    {
                        NativeMethods.ForceSetForegroundWindow(fHwnd);
                        Thread.Sleep(30);
                    }
                }

                if (firstStep.StartPoint != Point.Empty)
                {
                    Point targetPt = ActionExecutor.ResolveActualScreenPoint(firstStep, firstStep.StartPoint);
                    if (smoothMouseMove)
                    {
                        MouseMovementSimulator.MoveSmoothly(Point.Empty, targetPt, 120, () => _isRunning);
                    }
                    else
                    {
                        NativeMethods.SetCursorPos(targetPt.X, targetPt.Y);
                    }
                    Thread.Sleep(30); // Allow OS and target app to update hover & focus
                }
            }
        }

        int currentLoop = 0;

        while (_isRunning)
        {
            currentLoop++;

            for (int i = 0; i < stepsToRun.Count; i++)
            {
                if (!_isRunning) break;
                MacroStep step = stepsToRun[i];
                if (!step.Enabled) continue;

                if (OnStepExecuting != null && _runClock.ElapsedMilliseconds >= _nextStepReportMs)
                {
                    _nextStepReportMs = _runClock.ElapsedMilliseconds + StepReportIntervalMs;
                    string stepDesc = step.Name;
                    if (step.ActionType == MacroActionType.RunScript)
                    {
                        stepDesc = string.Format("Run {0} (x{1})", step.KeyData, step.RepeatCount);
                    }
                    else if (step.ActionType == MacroActionType.Delay)
                    {
                        stepDesc = string.Format("Delay {0}ms", step.DelayMs);
                    }
                    else if (step.ActionType == MacroActionType.RepeatTimer)
                    {
                        string key = !string.IsNullOrEmpty(step.Id) ? step.Id : i.ToString();
                        RepeatTimerSession sess;
                        _repeatTimerStates.TryGetValue(key, out sess);
                        int targetStep = (step.RepeatTimerTargetStep > 0) ? step.RepeatTimerTargetStep : 1;
                        if (step.RepeatTimerMode == 1) // Timer
                        {
                            if (sess != null && sess.IsActive)
                            {
                                TimeSpan left = sess.Deadline - DateTime.Now;
                                if (left.TotalSeconds < 0) left = TimeSpan.Zero;
                                stepDesc = string.Format("Repeat/Timer: {0:D2}:{1:D2} left -> Step {2}",
                                    (int)left.TotalMinutes, left.Seconds, targetStep);
                            }
                            else
                            {
                                int m = step.RepeatTimerSeconds / 60;
                                int s = step.RepeatTimerSeconds % 60;
                                stepDesc = string.Format("Repeat/Timer: {0:D2}:{1:D2} -> Step {2}",
                                    m, s, targetStep);
                            }
                        }
                        else // Times
                        {
                            int rem = (sess != null && sess.IsActive) ? sess.RemainingCount : step.RepeatCount;
                            stepDesc = string.Format("Repeat/Timer: {0}/{1} times -> Step {2}",
                                rem, step.RepeatCount, targetStep);
                        }
                    }
                    OnStepExecuting(i, stepDesc);
                }

                ExecuteSingleStep(step, stepsToRun, ref i, subProfilesMap, randIntervalMs, randJitterPx, smoothMouseMove);
            }

            _totalCyclesCompleted = currentLoop;

            if (targetLoops > 0 && currentLoop >= targetLoops)
            {
                break;
            }
        }
        }

        private void ExecuteStepList(List<MacroStep> steps, Dictionary<string, List<MacroStep>> subProfilesMap, int randIntervalMs, int randJitterPx, bool smoothMouseMove)
        {
            for (int i = 0; i < steps.Count; i++)
            {
                if (!_isRunning) break;
                MacroStep step = steps[i];
                if (!step.Enabled) continue;

                ExecuteSingleStep(step, steps, ref i, subProfilesMap, randIntervalMs, randJitterPx, smoothMouseMove);
            }
        }

        private static Rectangle GetScanRectangle(MacroStep step)
        {
            Point screenA = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
            Point screenB = ActionExecutor.ResolveActualScreenPoint(step, step.EndPoint);
            int ax = Math.Min(screenA.X, screenB.X);
            int ay = Math.Min(screenA.Y, screenB.Y);
            int aw = Math.Max(1, Math.Abs(screenB.X - screenA.X));
            int ah = Math.Max(1, Math.Abs(screenB.Y - screenA.Y));
            return new Rectangle(ax, ay, aw, ah);
        }

        // Stops the run and reports why when the step's target window cannot be used.
        // A running script never moves to another window: without its window, a click would land somewhere else.
        private bool EnsureStepTarget(MacroStep step, int stepIndex)
        {
            if (!ActionExecutor.UsesTargetWindow(step)) return true;

            IntPtr hWnd;
            TargetWindowState state = NativeMethods.GetTargetWindowState(step.WindowHwnd, step.TargetPid, step.ProcessName, step.WindowTitle, step.WindowIndex, out hWnd);
            if (state == TargetWindowState.Ok)
            {
                step.WindowHwnd = hWnd;
                if (step.TargetPid == 0)
                {
                    uint pid;
                    NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                    step.TargetPid = pid;
                }
                return true;
            }

            EndRun();
            if (OnTargetLost != null)
            {
                TargetProblem problem = new TargetProblem
                {
                    State = state,
                    ProcessName = step.ProcessName,
                    WindowTitle = step.WindowTitle,
                    WindowIndex = step.WindowIndex,
                    Pid = step.TargetPid,
                    RootScriptName = _rootScriptName,
                    StoppedRun = true
                };
                problem.AddStep(_currentScriptName, stepIndex + 1);
                OnTargetLost(problem);
            }
            return false;
        }

        // -3 repeats this step, N goes to step N. Everything else moves on: past the last step ends this pass, so a main script wraps to step 1 through the outer loop (a counted cycle) and a called script returns to its caller.
        private static int GetJumpTarget(int jumpAction, int i)
        {
            if (jumpAction == -3) return i;
            if (jumpAction > 0) return jumpAction - 1;
            return i + 1;
        }

        // The for loop around the step adds one to i, so the next step is targetIdx
        private static void MoveToStep(int targetIdx, int stepCount, ref int i)
        {
            i = (targetIdx >= 0 && targetIdx < stepCount) ? targetIdx - 1 : stepCount;
        }

        private void ClickFoundSpot(MacroStep step, Point startPoint, int i, int randIntervalMs, int randJitterPx)
        {
            MacroStep clickStep = step.Clone();
            clickStep.ActionType = MacroActionType.LeftClick;
            clickStep.HoldMs = Math.Max(1, step.HoldMs);
            clickStep.EndPoint = Point.Empty; // Click at the exact spot
            clickStep.StartPoint = startPoint;

            int clickReps = Math.Max(1, step.RepeatCount);
            for (int cr = 0; cr < clickReps; cr++)
            {
                if (!_isRunning || !EnsureStepTarget(step, i)) break;
                ActionExecutor.Execute(clickStep, _freeMouseMode, randIntervalMs, randJitterPx);
                if (cr < clickReps - 1 && step.DelayMs > 0)
                {
                    SleepWhileRunning(ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs));
                }
            }
        }

        private void WaitAfterNoMatch(MacroStep step, int jumpAction, int targetIdx, int stepCount, int randIntervalMs)
        {
            if (jumpAction == -3)
            {
                int repDelay = step.DelayMs > 0 ? ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs) : 20;
                if (repDelay > 0 && _isRunning) SleepWhileRunning(repDelay);
            }
            else if ((targetIdx == 0 || targetIdx >= stepCount) && _isRunning)
            {
                Thread.Sleep(1);
            }
        }

        private void ExecuteSingleStep(MacroStep step, List<MacroStep> stepList, ref int i, Dictionary<string, List<MacroStep>> subProfilesMap, int randIntervalMs, int randJitterPx, bool smoothMouseMove)
        {
            if (++_stepsSinceRest >= StepsBetweenRests)
            {
                _stepsSinceRest = 0;
                Thread.Sleep(1);
            }

            if (!EnsureStepTarget(step, i)) return;

            Interlocked.Increment(ref _stepsExecuted);

            // 1. RunScript Action
            if (step.ActionType == MacroActionType.RunScript)
            {
                string subName = step.KeyData ?? "";
                List<MacroStep> subSteps;
                if (!_scriptCallChain.Contains(subName) && subProfilesMap != null && subProfilesMap.TryGetValue(subName, out subSteps) && subSteps != null && subSteps.Count > 0)
                {
                    _scriptCallChain.Add(subName);
                    string callerScript = _currentScriptName;
                    _currentScriptName = subName;
                    try
                    {
                        int scriptReps = Math.Max(1, step.RepeatCount);
                        for (int sr = 0; sr < scriptReps; sr++)
                        {
                            if (!_isRunning) break;
                            ExecuteStepList(subSteps, subProfilesMap, randIntervalMs, randJitterPx, smoothMouseMove);
                        }
                    }
                    finally
                    {
                        _currentScriptName = callerScript;
                        _scriptCallChain.Remove(subName);
                    }
                }

                int postDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (postDelay > 0 && _isRunning)
                {
                    SleepWhileRunning(postDelay);
                }
                return;
            }

                // 2. WaitColor Condition
            if (step.ActionType == MacroActionType.WaitColor)
            {
                int tol = step.Tolerance > 0 ? step.Tolerance : 10;
                bool isArea = (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);
                while (_isRunning)
                {
                    if (!EnsureStepTarget(step, i)) return;

                    if (isArea)
                    {
                        Rectangle scanRect = GetScanRectangle(step);

                        Point foundPt = PixelSampler.FindMatchingPixelInArea(step, scanRect, step.TargetColor, tol);
                        if (foundPt != Point.Empty)
                        {
                            break;
                        }
                    }
                    else
                    {
                        Point samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                        Color curr = PixelSampler.GetPixelColor(step, samplePt);
                        if (ActionExecutor.MatchesColor(curr, step.TargetColor, tol))
                        {
                            break;
                        }
                    }
                    Thread.Sleep(20);
                }
                int delay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (delay > 0 && _isRunning) SleepWhileRunning(delay);
                return;
            }

            // 3. WaitImage Condition
            if (step.ActionType == MacroActionType.WaitImage)
            {
                Rectangle scanRect = SystemInformation.VirtualScreen;
                bool isArea = (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);
                if (isArea)
                {
                    scanRect = GetScanRectangle(step);
                }

                Bitmap template = step.GetTemplateBitmap();
                int sim = step.Similarity > 0 ? step.Similarity : 90;
                int timeoutMs = (step.TimeoutSec > 0 ? step.TimeoutSec : 10) * 1000;
                long startTicks = Environment.TickCount;

                while (_isRunning && template != null)
                {
                    if (!EnsureStepTarget(step, i)) return;

                    Point foundCenter;
                    if (PixelSampler.FindTemplateInArea(step, scanRect, template, sim, out foundCenter))
                    {
                        break;
                    }
                    if (timeoutMs > 0 && (Environment.TickCount - startTicks) >= timeoutMs)
                    {
                        break;
                    }
                    Thread.Sleep(30);
                }

                int delay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (delay > 0 && _isRunning) SleepWhileRunning(delay);
                return;
            }

            // 4. WaitChange Condition
            if (step.ActionType == MacroActionType.WaitChange)
            {
                int tol = step.Tolerance > 0 ? step.Tolerance : 10;
                Point samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                Color baseColor = PixelSampler.GetPixelColor(step, samplePt);
                while (_isRunning)
                {
                    if (!EnsureStepTarget(step, i)) return;

                    samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Color curr = PixelSampler.GetPixelColor(step, samplePt);
                    if (!ActionExecutor.MatchesColor(curr, baseColor, tol))
                    {
                        break;
                    }
                    Thread.Sleep(20);
                }
                int delay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (delay > 0 && _isRunning) SleepWhileRunning(delay);
                return;
            }

            // 5. IfColor / IfColorArea Condition
            if (step.ActionType == MacroActionType.IfColor || step.ActionType == MacroActionType.IfColorArea)
            {
                int tol = step.Tolerance > 0 ? step.Tolerance : 10;
                bool matched = false;
                Point samplePt = Point.Empty;
                bool isArea = (step.ActionType == MacroActionType.IfColorArea) || (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);

                if (isArea)
                {
                    Rectangle scanRect = GetScanRectangle(step);

                    Point foundPt = PixelSampler.FindMatchingPixelInArea(step, scanRect, step.TargetColor, tol);
                    if (foundPt != Point.Empty)
                    {
                        matched = true;
                        samplePt = foundPt;
                    }
                    else
                    {
                        matched = false;
                        samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    }
                }
                else
                {
                    samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Color curr = PixelSampler.GetPixelColor(step, samplePt);
                    matched = ActionExecutor.MatchesColor(curr, step.TargetColor, tol);
                }

                int jumpAction = matched ? step.IfTrueStep : step.IfFalseStep;

                if (jumpAction == -1)
                {
                    // Stop Script
                    EndRun();
                    return;
                }

                if (jumpAction == -2 && matched && samplePt != Point.Empty)
                {
                    // Click Target: only an area search found a spot of its own
                    ClickFoundSpot(step, isArea ? ActionExecutor.ResolveScreenPointToRelative(step, samplePt) : step.StartPoint, i, randIntervalMs, randJitterPx);
                }

                int targetIdx = GetJumpTarget(jumpAction, i);

                if (matched)
                {
                    int actualDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                    if (actualDelay > 0 && _isRunning)
                    {
                        if (smoothMouseMove && !_freeMouseMode && actualDelay > 20)
                        {
                            Point nextTarget = Point.Empty;
                            int previewIdx = (targetIdx >= stepList.Count) ? 0 : targetIdx;
                            if (previewIdx >= 0 && previewIdx < stepList.Count)
                            {
                                MacroStep nextStep = stepList[previewIdx];
                                if (nextStep.Enabled && nextStep.StartPoint != Point.Empty)
                                {
                                    nextTarget = ActionExecutor.ResolveActualScreenPoint(nextStep, nextStep.StartPoint);
                                }
                            }

                            if (nextTarget != Point.Empty)
                            {
                                Point currPt = (samplePt != Point.Empty) ? samplePt : Cursor.Position;
                                MouseMovementSimulator.MoveSmoothly(currPt, nextTarget, actualDelay, () => _isRunning);
                            }
                            else
                            {
                                SleepWhileRunning(actualDelay);
                            }
                        }
                        else
                        {
                            SleepWhileRunning(actualDelay);
                        }
                    }
                }
                else
                {
                    WaitAfterNoMatch(step, jumpAction, targetIdx, stepList.Count, randIntervalMs);
                }

                MoveToStep(targetIdx, stepList.Count, ref i);
                return;
            }

            // 6. IfImage Condition
            if (step.ActionType == MacroActionType.IfImage)
            {
                Rectangle scanRect = SystemInformation.VirtualScreen;
                bool isArea = (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);
                if (isArea)
                {
                    scanRect = GetScanRectangle(step);
                }

                Bitmap template = step.GetTemplateBitmap();
                int sim = step.Similarity > 0 ? step.Similarity : 90;
                Point foundCenter = Point.Empty;
                bool matched = false;

                if (template != null)
                {
                    matched = PixelSampler.FindTemplateInArea(step, scanRect, template, sim, out foundCenter);
                }

                int jumpAction = matched ? step.IfTrueStep : step.IfFalseStep;

                if (jumpAction == -1)
                {
                    // Stop Script
                    EndRun();
                    return;
                }

                if (jumpAction == -2 && matched && foundCenter != Point.Empty)
                {
                    // Click Center of the matched template image
                    ClickFoundSpot(step, ActionExecutor.ResolveScreenPointToRelative(step, foundCenter), i, randIntervalMs, randJitterPx);
                }

                int targetIdx = GetJumpTarget(jumpAction, i);

                if (matched)
                {
                    int actualDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                    if (actualDelay > 0 && _isRunning)
                    {
                        SleepWhileRunning(actualDelay);
                    }
                }
                else
                {
                    WaitAfterNoMatch(step, jumpAction, targetIdx, stepList.Count, randIntervalMs);
                }

                MoveToStep(targetIdx, stepList.Count, ref i);
                return;
            }

            // 6.5 RepeatTimer Action / Loop Block
            if (step.ActionType == MacroActionType.RepeatTimer)
            {
                string key = !string.IsNullOrEmpty(step.Id) ? step.Id : i.ToString();
                RepeatTimerSession sess;
                lock (_repeatTimerStates)
                {
                    if (!_repeatTimerStates.TryGetValue(key, out sess) || sess == null || !sess.IsActive)
                    {
                        sess = new RepeatTimerSession();
                        sess.IsActive = true;
                        sess.RemainingCount = Math.Max(1, step.RepeatCount);
                        int totalSec = Math.Max(1, step.RepeatTimerSeconds);
                        sess.Deadline = DateTime.Now.AddSeconds(totalSec);
                        _repeatTimerStates[key] = sess;
                    }
                }

                int targetStep = (step.RepeatTimerTargetStep > 0) ? step.RepeatTimerTargetStep : 1;
                int targetIdx = targetStep - 1;
                if (targetIdx < 0 || targetIdx >= stepList.Count) targetIdx = 0;

                bool shouldLoop = false;

                if (step.RepeatTimerMode == 1) // Timer mode (Countdown duration)
                {
                    if (DateTime.Now < sess.Deadline)
                    {
                        shouldLoop = true;
                    }
                    else
                    {
                        // Time expired: advance to next step and reset
                        shouldLoop = false;
                        lock (_repeatTimerStates)
                        {
                            sess.IsActive = false;
                            sess.RemainingCount = Math.Max(1, step.RepeatCount);
                        }
                    }
                }
                else // Times mode (Count down encounters)
                {
                    sess.RemainingCount--;
                    if (sess.RemainingCount > 0)
                    {
                        shouldLoop = true;
                    }
                    else
                    {
                        // Remaining count reached 0: advance to next step and reset
                        shouldLoop = false;
                        lock (_repeatTimerStates)
                        {
                            sess.IsActive = false;
                            sess.RemainingCount = Math.Max(1, step.RepeatCount);
                        }
                    }
                }

                int delay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (delay > 0 && _isRunning) SleepWhileRunning(delay);

                if (shouldLoop)
                {
                    i = targetIdx - 1; // Outer for-loop increments i, so next step will be targetIdx
                }
                else
                {
                    // Finished loop condition: check step.IfFalseStep
                    // 0: Next Step (default), -1: Stop Script, >0: Jump to Step
                    if (step.IfFalseStep == -1)
                    {
                        EndRun();
                        return;
                    }
                    else if (step.IfFalseStep > 0)
                    {
                        int jumpIdx = step.IfFalseStep - 1;
                        if (jumpIdx >= 0 && jumpIdx < stepList.Count)
                        {
                            i = jumpIdx - 1;
                        }
                        else
                        {
                            i = stepList.Count;
                        }
                    }
                }
                return;
            }

            // 7. Standard Action Execution
            int repeats = Math.Max(1, step.RepeatCount);
            for (int r = 0; r < repeats; r++)
            {
                if (!_isRunning || !EnsureStepTarget(step, i)) break;

                ActionExecutor.Execute(step, _freeMouseMode, randIntervalMs, randJitterPx);

                int actualDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (actualDelay > 0 && _isRunning)
                {
                    if (smoothMouseMove && !_freeMouseMode && actualDelay > 20)
                    {
                        Point nextTarget = Point.Empty;
                        if (r < repeats - 1)
                        {
                            nextTarget = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                        }
                        else
                        {
                            // Search ahead for next enabled step with valid coordinates
                            for (int k = i + 1; k < stepList.Count; k++)
                            {
                                MacroStep ns = stepList[k];
                                if (ns.Enabled && ns.StartPoint != Point.Empty)
                                {
                                    nextTarget = ActionExecutor.ResolveActualScreenPoint(ns, ns.StartPoint);
                                    break;
                                }
                            }

                            // If not found in remaining steps, look at beginning (for continuous loop)
                            if (nextTarget == Point.Empty && stepList.Count > 1)
                            {
                                for (int k = 0; k <= i; k++)
                                {
                                    MacroStep ns = stepList[k];
                                    if (ns.Enabled && ns.StartPoint != Point.Empty)
                                    {
                                        nextTarget = ActionExecutor.ResolveActualScreenPoint(ns, ns.StartPoint);
                                        break;
                                    }
                                }
                            }
                        }

                        if (nextTarget != Point.Empty)
                        {
                            Point currPt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                            MouseMovementSimulator.MoveSmoothly(currPt, nextTarget, actualDelay, () => _isRunning);
                        }
                        else
                        {
                            SleepWhileRunning(actualDelay);
                        }
                    }
                    else
                    {
                        SleepWhileRunning(actualDelay);
                    }
                }
            }
        }

        // User-set waits can be minutes long, so they must end as soon as Stop is pressed
        private void SleepWhileRunning(int ms)
        {
            CancellableSleep.Sleep(ms, () => _isRunning);
        }

        // Every way a run ends goes through here, so the clock stops with it
        private void EndRun()
        {
            _isRunning = false;
            _runClock.Stop();
        }

        public void Stop()
        {
            EndRun();
            if (_workerThread != null && _workerThread.IsAlive)
            {
                try
                {
                    _workerThread.Join(200);
                }
                catch (Exception caught) { AppLog.Caught(caught); }
            }
            KeyboardSimulator.ReleaseAllKeys();
            NativeMethods.ReleaseAllMouseButtons();
            lock (_repeatTimerStates)
            {
                _repeatTimerStates.Clear();
            }
        }
    }
}
