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

            int targetLoops = profile.LoopCount;
            int randIntervalMs = Math.Max(0, profile.RandomIntervalMs);
            int randJitterPx = Math.Max(0, profile.RandomJitterPx);

            _workerThread = new Thread(() =>
            {
                Thread.Sleep(60);

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
                while (_isRunning)
                {
                    Point samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Color curr = NativeMethods.GetPixelColor(samplePt.X, samplePt.Y);
                    if (ActionExecutor.MatchesColor(curr, step.TargetColor, tol))
                    {
                        break;
                    }
                    Thread.Sleep(20);
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
                Color baseColor = NativeMethods.GetPixelColor(samplePt.X, samplePt.Y);
                while (_isRunning)
                {
                    samplePt = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Color curr = NativeMethods.GetPixelColor(samplePt.X, samplePt.Y);
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

                if (step.ActionType == MacroActionType.IfColorArea)
                {
                    Point screenA = ActionExecutor.ResolveActualScreenPoint(step, step.StartPoint);
                    Point screenB = ActionExecutor.ResolveActualScreenPoint(step, step.EndPoint);
                    int ax = Math.Min(screenA.X, screenB.X);
                    int ay = Math.Min(screenA.Y, screenB.Y);
                    int aw = Math.Max(1, Math.Abs(screenB.X - screenA.X));
                    int ah = Math.Max(1, Math.Abs(screenB.Y - screenA.Y));
                    Rectangle scanRect = new Rectangle(ax, ay, aw, ah);

                    Point foundPt = ActionExecutor.FindMatchingPixelInArea(scanRect, step.TargetColor, tol);
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
                    Color curr = NativeMethods.GetPixelColor(samplePt.X, samplePt.Y);
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
                        clickStep.HoldMs = Math.Max(10, step.HoldMs);

                        if (step.ActionType == MacroActionType.IfColorArea)
                        {
                            if (step.RelativeToWindow && !string.IsNullOrEmpty(step.ProcessName))
                            {
                                IntPtr hWnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle);
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

                        ActionExecutor.Execute(clickStep, freeMouseMode, randIntervalMs, randJitterPx);
                    }

                    targetIdx = (i + 1 < stepList.Count) ? (i + 1) : 0;
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
                    // Unmatched: zero delay to enable instant reaction times; sleep 1ms only at end of loop
                    if (targetIdx == 0 && _isRunning)
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

            // 6. Standard Action Execution
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
        }
    }
}
