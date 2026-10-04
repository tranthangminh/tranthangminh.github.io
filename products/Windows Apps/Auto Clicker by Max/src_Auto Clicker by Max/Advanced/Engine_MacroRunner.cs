using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public class MacroRunner
    {
        private volatile bool _isRunning = false;
        private Thread _workerThread = null;
        private DateTime _startTime;
        private int _totalCyclesCompleted = 0;

        public bool IsRunning { get { return _isRunning; } }
        public int TotalCyclesCompleted { get { return _totalCyclesCompleted; } }

        public event Action<int, string> OnStepExecuting; // stepIndex, stepName
        public event Action<int, TimeSpan> OnProgressUpdated; // cycles, elapsed
        public event Action OnStopped;

        private class RepeatTimerSession
        {
            public bool IsActive;
            public int RemainingCount;
            public DateTime Deadline;
        }

        private readonly Dictionary<string, RepeatTimerSession> _repeatTimerStates = new Dictionary<string, RepeatTimerSession>(StringComparer.OrdinalIgnoreCase);

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
            _totalCyclesCompleted = 0;
            _startTime = DateTime.Now;
            _repeatTimerStates.Clear();

            int targetLoops = profile.LoopCount;
            int randIntervalMs = Math.Max(0, profile.RandomIntervalMs);
            int randJitterPx = Math.Max(0, profile.RandomJitterPx);

            _workerThread = new Thread(() =>
            {
                Thread.Sleep(60);

                // Initial settle and focus for first step (prevents missed first click)
                if (!freeMouseMode && stepsToRun.Count > 0)
                {
                    MacroStep firstStep = stepsToRun.Find(s => s.Enabled && (s.StartPoint != Point.Empty || s.RelativeToWindow));
                    if (firstStep != null)
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

                        if (OnStepExecuting != null)
                        {
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

                        ExecuteSingleStep(step, stepsToRun, ref i, subProfilesMap, freeMouseMode, randIntervalMs, randJitterPx, smoothMouseMove);
                    }

                    _totalCyclesCompleted = currentLoop;
                    if (OnProgressUpdated != null)
                    {
                        TimeSpan elapsed = DateTime.Now - _startTime;
                        OnProgressUpdated(_totalCyclesCompleted, elapsed);
                    }

                    if (targetLoops > 0 && currentLoop >= targetLoops)
                    {
                        break;
                    }
                }

                _isRunning = false;
                if (OnStopped != null) OnStopped();
            })
            {
                IsBackground = true,
                Name = "MacroRunnerThread"
            };

            _workerThread.Start();
        }

        private void ExecuteStepList(List<MacroStep> steps, Dictionary<string, List<MacroStep>> subProfilesMap, bool freeMouseMode, int randIntervalMs, int randJitterPx, bool smoothMouseMove)
        {
            for (int i = 0; i < steps.Count; i++)
            {
                if (!_isRunning) break;
                MacroStep step = steps[i];
                if (!step.Enabled) continue;

                ExecuteSingleStep(step, steps, ref i, subProfilesMap, freeMouseMode, randIntervalMs, randJitterPx, smoothMouseMove);
            }
        }

        private void ExecuteSingleStep(MacroStep step, List<MacroStep> stepList, ref int i, Dictionary<string, List<MacroStep>> subProfilesMap, bool freeMouseMode, int randIntervalMs, int randJitterPx, bool smoothMouseMove)
        {
            // 1. RunScript Action
            if (step.ActionType == MacroActionType.RunScript)
            {
                List<MacroStep> subSteps;
                if (subProfilesMap != null && subProfilesMap.TryGetValue(step.KeyData ?? "", out subSteps) && subSteps != null && subSteps.Count > 0)
                {
                    int scriptReps = Math.Max(1, step.RepeatCount);
                    for (int sr = 0; sr < scriptReps; sr++)
                    {
                        if (!_isRunning) break;
                        ExecuteStepList(subSteps, subProfilesMap, freeMouseMode, randIntervalMs, randJitterPx, smoothMouseMove);
                    }
                }

                int postDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (postDelay > 0 && _isRunning)
                {
                    Thread.Sleep(postDelay);
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
                    if (isArea)
                    {
                        Point screenA = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                        Point screenB = ActionExecutor.ResolveActualScreenPoint(step, step.EndPoint);
                        int ax = Math.Min(screenA.X, screenB.X);
                        int ay = Math.Min(screenA.Y, screenB.Y);
                        int aw = Math.Max(1, Math.Abs(screenB.X - screenA.X));
                        int ah = Math.Max(1, Math.Abs(screenB.Y - screenA.Y));
                        Rectangle scanRect = new Rectangle(ax, ay, aw, ah);

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
                if (delay > 0 && _isRunning) Thread.Sleep(delay);
                return;
            }

            // 3. WaitImage Condition
            if (step.ActionType == MacroActionType.WaitImage)
            {
                Rectangle scanRect = SystemInformation.VirtualScreen;
                bool isArea = (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);
                if (isArea)
                {
                    Point screenA = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Point screenB = ActionExecutor.ResolveActualScreenPoint(step, step.EndPoint);
                    int ax = Math.Min(screenA.X, screenB.X);
                    int ay = Math.Min(screenA.Y, screenB.Y);
                    int aw = Math.Max(1, Math.Abs(screenB.X - screenA.X));
                    int ah = Math.Max(1, Math.Abs(screenB.Y - screenA.Y));
                    scanRect = new Rectangle(ax, ay, aw, ah);
                }

                Bitmap template = step.GetTemplateBitmap();
                int sim = step.Similarity > 0 ? step.Similarity : 90;
                int timeoutMs = (step.TimeoutSec > 0 ? step.TimeoutSec : 10) * 1000;
                long startTicks = Environment.TickCount;

                while (_isRunning && template != null)
                {
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
                if (delay > 0 && _isRunning) Thread.Sleep(delay);
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
                    samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Color curr = PixelSampler.GetPixelColor(step, samplePt);
                    if (!ActionExecutor.MatchesColor(curr, baseColor, tol))
                    {
                        break;
                    }
                    Thread.Sleep(20);
                }
                int delay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (delay > 0 && _isRunning) Thread.Sleep(delay);
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
                    Point screenA = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Point screenB = ActionExecutor.ResolveActualScreenPoint(step, step.EndPoint);
                    int ax = Math.Min(screenA.X, screenB.X);
                    int ay = Math.Min(screenA.Y, screenB.Y);
                    int aw = Math.Max(1, Math.Abs(screenB.X - screenA.X));
                    int ah = Math.Max(1, Math.Abs(screenB.Y - screenA.Y));
                    Rectangle scanRect = new Rectangle(ax, ay, aw, ah);

                    Point foundPt = PixelSampler.FindMatchingPixelInArea(step, scanRect, step.TargetColor, tol);
                    if (foundPt != Point.Empty)
                    {
                        matched = true;
                        samplePt = foundPt;
                    }
                    else
                    {
                        matched = false;
                        samplePt = screenA;
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
                    _isRunning = false;
                    return;
                }

                int targetIdx;
                if (jumpAction == -2)
                {
                    // Click Target: Click at target pixel if matched, then proceed to next step (or wrap to Step 1)
                    if (matched && samplePt != Point.Empty)
                    {
                        MacroStep clickStep = step.Clone();
                        clickStep.ActionType = MacroActionType.LeftClick;
                        clickStep.HoldMs = Math.Max(1, step.HoldMs);
                        clickStep.EndPoint = Point.Empty; // Click at the exact found pixel point

                        if (isArea)
                        {
                            if (step.RelativeToWindow && (step.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(step.ProcessName)))
                            {
                                IntPtr hWnd = step.WindowHwnd;
                                if (!NativeMethods.IsValidWindowHandle(hWnd, step.TargetPid, step.ProcessName))
                                {
                                    hWnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle, step.WindowIndex, step.TargetPid);
                                    if (hWnd != IntPtr.Zero)
                                    {
                                        step.WindowHwnd = hWnd;
                                        uint p;
                                        NativeMethods.GetWindowThreadProcessId(hWnd, out p);
                                        if (p > 0) step.TargetPid = p;
                                    }
                                }
                                if (hWnd != IntPtr.Zero)
                                {
                                    NativeMethods.POINT np = new NativeMethods.POINT { X = samplePt.X, Y = samplePt.Y };
                                    if (NativeMethods.ScreenToClient(hWnd, ref np))
                                    {
                                        clickStep.StartPoint = new Point(np.X, np.Y);
                                    }
                                    else clickStep.StartPoint = samplePt;
                                }
                                else clickStep.StartPoint = samplePt;
                            }
                            else
                            {
                                clickStep.StartPoint = samplePt;
                            }
                        }

                        int clickReps = Math.Max(1, step.RepeatCount);
                        for (int cr = 0; cr < clickReps; cr++)
                        {
                            if (!_isRunning) break;
                            ActionExecutor.Execute(clickStep, freeMouseMode, randIntervalMs, randJitterPx);
                            if (cr < clickReps - 1 && step.DelayMs > 0)
                            {
                                Thread.Sleep(ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs));
                            }
                        }
                    }

                    targetIdx = (i + 1 < stepList.Count) ? (i + 1) : 0;
                }
                else if (jumpAction == -3)
                {
                    // Repeat this Step: loop back to current step i
                    targetIdx = i;
                }
                else if (jumpAction > 0)
                {
                    targetIdx = jumpAction - 1;
                }
                else
                {
                    // Next Step (jumpAction == 0): Advance to next step, or wrap around to Step 1 if at the end
                    targetIdx = (i + 1 < stepList.Count) ? (i + 1) : 0;
                }

                if (matched)
                {
                    int actualDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                    if (actualDelay > 0 && _isRunning)
                    {
                        if (smoothMouseMove && !freeMouseMode && actualDelay > 20)
                        {
                            Point nextTarget = Point.Empty;
                            if (targetIdx >= 0 && targetIdx < stepList.Count)
                            {
                                MacroStep nextStep = stepList[targetIdx];
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
                                Thread.Sleep(actualDelay);
                            }
                        }
                        else
                        {
                            Thread.Sleep(actualDelay);
                        }
                    }
                }
                else
                {
                    // Unmatched
                    if (jumpAction == -3)
                    {
                        int repDelay = step.DelayMs > 0 ? ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs) : 20;
                        if (repDelay > 0 && _isRunning) Thread.Sleep(repDelay);
                    }
                    else if (targetIdx == 0 && _isRunning)
                    {
                        Thread.Sleep(1);
                    }
                }

                if (targetIdx >= 0 && targetIdx < stepList.Count)
                {
                    i = targetIdx - 1; // Outer for-loop will increment i, so next step is targetIdx
                }
                else
                {
                    i = stepList.Count; // End of script
                }
                return;
            }

            // 6. IfImage Condition
            if (step.ActionType == MacroActionType.IfImage)
            {
                Rectangle scanRect = SystemInformation.VirtualScreen;
                bool isArea = (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);
                if (isArea)
                {
                    Point screenA = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Point screenB = ActionExecutor.ResolveActualScreenPoint(step, step.EndPoint);
                    int ax = Math.Min(screenA.X, screenB.X);
                    int ay = Math.Min(screenA.Y, screenB.Y);
                    int aw = Math.Max(1, Math.Abs(screenB.X - screenA.X));
                    int ah = Math.Max(1, Math.Abs(screenB.Y - screenA.Y));
                    scanRect = new Rectangle(ax, ay, aw, ah);
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
                    _isRunning = false;
                    return;
                }

                int targetIdx;
                if (jumpAction == -2)
                {
                    // Click Center of the matched template image
                    if (matched && foundCenter != Point.Empty)
                    {
                        MacroStep clickStep = step.Clone();
                        clickStep.ActionType = MacroActionType.LeftClick;
                        clickStep.HoldMs = Math.Max(1, step.HoldMs);
                        clickStep.EndPoint = Point.Empty;

                        if (step.RelativeToWindow && (step.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(step.ProcessName)))
                        {
                            IntPtr hWnd = step.WindowHwnd;
                            if (!NativeMethods.IsValidWindowHandle(hWnd, step.TargetPid, step.ProcessName))
                            {
                                hWnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle, step.WindowIndex, step.TargetPid);
                                if (hWnd != IntPtr.Zero)
                                {
                                    step.WindowHwnd = hWnd;
                                    uint p;
                                    NativeMethods.GetWindowThreadProcessId(hWnd, out p);
                                    if (p > 0) step.TargetPid = p;
                                }
                            }
                            if (hWnd != IntPtr.Zero)
                            {
                                NativeMethods.POINT np = new NativeMethods.POINT { X = foundCenter.X, Y = foundCenter.Y };
                                if (NativeMethods.ScreenToClient(hWnd, ref np))
                                {
                                    clickStep.StartPoint = new Point(np.X, np.Y);
                                }
                                else clickStep.StartPoint = foundCenter;
                            }
                            else clickStep.StartPoint = foundCenter;
                        }
                        else
                        {
                            clickStep.StartPoint = foundCenter;
                        }

                        int clickReps = Math.Max(1, step.RepeatCount);
                        for (int cr = 0; cr < clickReps; cr++)
                        {
                            if (!_isRunning) break;
                            ActionExecutor.Execute(clickStep, freeMouseMode, randIntervalMs, randJitterPx);
                            if (cr < clickReps - 1 && step.DelayMs > 0)
                            {
                                Thread.Sleep(ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs));
                            }
                        }
                    }

                    targetIdx = (i + 1 < stepList.Count) ? (i + 1) : 0;
                }
                else if (jumpAction == -3)
                {
                    // Repeat this Step: loop back to current step i
                    targetIdx = i;
                }
                else if (jumpAction > 0)
                {
                    targetIdx = jumpAction - 1;
                }
                else
                {
                    // Next Step (jumpAction == 0)
                    targetIdx = (i + 1 < stepList.Count) ? (i + 1) : 0;
                }

                if (matched)
                {
                    int actualDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                    if (actualDelay > 0 && _isRunning)
                    {
                        Thread.Sleep(actualDelay);
                    }
                }
                else
                {
                    if (jumpAction == -3)
                    {
                        int repDelay = step.DelayMs > 0 ? ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs) : 20;
                        if (repDelay > 0 && _isRunning) Thread.Sleep(repDelay);
                    }
                    else if (targetIdx == 0 && _isRunning)
                    {
                        Thread.Sleep(1);
                    }
                }

                if (targetIdx >= 0 && targetIdx < stepList.Count)
                {
                    i = targetIdx - 1;
                }
                else
                {
                    i = stepList.Count;
                }
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
                if (delay > 0 && _isRunning) Thread.Sleep(delay);

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
                        _isRunning = false;
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
                if (!_isRunning) break;

                ActionExecutor.Execute(step, freeMouseMode, randIntervalMs, randJitterPx);

                int actualDelay = ActionExecutor.ApplyDelayInterval(step.DelayMs, randIntervalMs);
                if (actualDelay > 0 && _isRunning)
                {
                    if (smoothMouseMove && !freeMouseMode && actualDelay > 20)
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
                            Thread.Sleep(actualDelay);
                        }
                    }
                    else
                    {
                        Thread.Sleep(actualDelay);
                    }
                }
            }
        }

        public void Stop()
        {
            _isRunning = false;
            if (_workerThread != null && _workerThread.IsAlive)
            {
                try
                {
                    _workerThread.Join(200);
                }
                catch { }
            }
            lock (_repeatTimerStates)
            {
                _repeatTimerStates.Clear();
            }
        }
    }
}
