using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using MaxApp.Common;

namespace ModernAutoClicker
{
    public class ClickConfig
    {
        public int IntervalMs { get; set; }
        public int MouseButton { get; set; } // 0: Left, 1: Right, 2: Middle
        public int ClickMode { get; set; } // 0: PointList, 1: CurrentCursor
        public int Loops { get; set; } // 0 = unlimited / infinite, > 0 = specific loop count
        public int JitterPx { get; set; } // 0 = no jitter, > 0 = ± N px random offset
        public bool FreeMouseMode { get; set; }
        public bool SmoothMouseMove { get; set; }
        public IntPtr TargetHwnd { get; set; }
        public string TargetProcessName { get; set; }
        public string TargetWindowTitle { get; set; }
        public int TargetWindowIndex { get; set; }
        public bool RelativeToWindow { get; set; }
        public uint TargetPid { get; set; }
        public List<Point> PointsList { get; set; }
    }

    public class ClickEngine
    {
        private volatile bool _isRunning = false;
        private volatile Thread _workerThread = null;
        private long _totalClicks = 0;
        private volatile int _completedLoops = 0;
        private int _targetLoops = 0;

        // Stops with the run, so the numbers of the last run stay on screen after it ends
        private readonly Stopwatch _runClock = new Stopwatch();
        private bool _hasRun = false;

        [ThreadStatic]
        private static Random _rngInstance;
        private static Random Rng
        {
            get
            {
                if (_rngInstance == null) _rngInstance = new Random(Environment.TickCount ^ Thread.CurrentThread.ManagedThreadId);
                return _rngInstance;
            }
        }

        public bool IsRunning { get { return _isRunning; } }
        public long TotalClicks { get { return Interlocked.Read(ref _totalClicks); } }
        public int CompletedLoops { get { return _completedLoops; } }
        public int TargetLoops { get { return _targetLoops; } }
        public TimeSpan Elapsed { get { return _runClock.Elapsed; } }
        public bool HasRun { get { return _hasRun; } }

        private volatile ClickConfig _config;

        // Another tab started while this one moves the real mouse: from the next click on this run clicks in the background too
        public void SwitchToFreeMouse()
        {
            ClickConfig config = _config;
            if (config != null) config.FreeMouseMode = true;
        }

        // The engine is reused across runs: after Stop + Start, an old worker still waiting out its interval sees a newer thread here and exits instead of clicking alongside the new run
        private bool IsCurrentRunActive { get { return _isRunning && _workerThread == Thread.CurrentThread; } }

        public event Action<int> OnPointExecuting;
        public event Action<TargetProblem> OnTargetLost; // Raised on the worker thread before OnStopped
        public event Action<Exception> OnRunFailed; // Raised on the worker thread before OnStopped
        public event Action OnStopped;

        private Point ApplyJitter(Point pt, int jitterPx)
        {
            if (jitterPx <= 0) return pt;
            int dx = Rng.Next(-jitterPx, jitterPx + 1);
            int dy = Rng.Next(-jitterPx, jitterPx + 1);
            return new Point(pt.X + dx, pt.Y + dy);
        }

        private static bool HasWindowTarget(ClickConfig config)
        {
            return config.RelativeToWindow && (config.TargetHwnd != IntPtr.Zero || !string.IsNullOrEmpty(config.TargetProcessName) || !string.IsNullOrEmpty(config.TargetWindowTitle) || config.TargetPid != 0);
        }

        // Window points become screen points through the checked target handle. False means the window just went away,
        // and the point must not be used: as it stands it is relative to a window, so it would click some other place on the screen.
        private static bool TryGetScreenPoint(ClickConfig config, Point localPt, out Point screenPt)
        {
            screenPt = localPt;
            if (!HasWindowTarget(config)) return true;

            NativeMethods.POINT pt = new NativeMethods.POINT { X = localPt.X, Y = localPt.Y };
            if (!NativeMethods.ClientToScreen(config.TargetHwnd, ref pt)) return false;

            screenPt = new Point(pt.X, pt.Y);
            return true;
        }

        // Stops the run and reports why when the target window cannot be used. A running tab never moves to another window.
        private bool EnsureTargetReady(ClickConfig config)
        {
            if (!HasWindowTarget(config)) return true;

            IntPtr hWnd;
            TargetWindowState state = NativeMethods.GetTargetWindowState(config.TargetHwnd, config.TargetPid, config.TargetProcessName, config.TargetWindowTitle, config.TargetWindowIndex, out hWnd);
            if (state == TargetWindowState.Ok)
            {
                config.TargetHwnd = hWnd;
                if (config.TargetPid == 0)
                {
                    uint pid;
                    NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
                    config.TargetPid = pid;
                }
                return true;
            }

            // Only the current run may end the engine; a superseded worker just exits
            if (_workerThread == Thread.CurrentThread)
            {
                EndRun();
                if (OnTargetLost != null)
                {
                    OnTargetLost(new TargetProblem
                    {
                        State = state,
                        ProcessName = config.TargetProcessName,
                        WindowTitle = config.TargetWindowTitle,
                        WindowIndex = config.TargetWindowIndex,
                        Pid = config.TargetPid,
                        StoppedRun = true
                    });
                }
                if (OnPointExecuting != null) OnPointExecuting(-1);
                if (OnStopped != null) OnStopped();
            }
            return false;
        }

        public void Start(ClickConfig config)
        {
            if (_isRunning) return;

            _isRunning = true;
            _config = config;
            _totalClicks = 0;
            _completedLoops = 0;
            _targetLoops = config.Loops;
            _hasRun = true;
            _runClock.Restart();

            _workerThread = new Thread(() =>
            {
                try
                {
                    RunClicks(config);
                }
                catch (Exception ex)
                {
                    FailRun(ex);
                }
            });

            _workerThread.IsBackground = true;
            _workerThread.Start();
        }

        // Whatever went wrong inside a run, it ends here: an exception on this thread would close the whole app with a button still held down.
        // Only the current run may end the engine; a superseded worker just exits.
        private void FailRun(Exception failure)
        {
            AppLog.Error("Running a Simple tab", failure);
            if (_workerThread != Thread.CurrentThread) return;

            EndRun();
            try
            {
                NativeMethods.ReleaseAllMouseButtons();
                if (OnRunFailed != null) OnRunFailed(failure);
                if (OnPointExecuting != null) OnPointExecuting(-1);
                if (OnStopped != null) OnStopped();
            }
            catch (Exception ex)
            {
                AppLog.Error("Ending a Simple run", ex);
            }
        }

        private void RunClicks(ClickConfig config)
        {
        int interval = Math.Max(1, config.IntervalMs);
        int holdMs = Math.Min(10, interval); // Default 10ms, but <= interval (e.g. if interval=5 -> hold=5, if interval=1 -> hold=1)
        int restMs = Math.Max(0, interval - holdMs);
        int pointIndex = 0;
        int currentLoop = 0;
        bool hasPoints = (config.ClickMode == 0) && config.PointsList != null && config.PointsList.Count > 0;

        if (!EnsureTargetReady(config)) return;

        // Initial settle and focus for first point (prevents missed first click)
        if (!config.FreeMouseMode && hasPoints)
        {
            if (HasWindowTarget(config))
            {
                NativeMethods.ForceSetForegroundWindow(config.TargetHwnd);
                Thread.Sleep(30);
            }

            Point firstRaw = config.PointsList[0];
            Point firstPt = ApplyJitter(firstRaw, config.JitterPx);
            Point firstAct;
            if (TryGetScreenPoint(config, firstPt, out firstAct))
            {
                if (config.SmoothMouseMove)
                {
                    MouseMovementSimulator.MoveSmoothly(Point.Empty, firstAct, 120, () => IsCurrentRunActive);
                }
                else
                {
                    NativeMethods.SetCursorPos(firstAct.X, firstAct.Y);
                }
                Thread.Sleep(30);
            }
        }

        while (IsCurrentRunActive)
        {
            if (!EnsureTargetReady(config)) break;

            if (config.FreeMouseMode)
            {
                // Background Click (Free Mouse Mode)
                if (hasPoints)
                {
                    int currIdx = pointIndex % config.PointsList.Count;
                    if (OnPointExecuting != null) OnPointExecuting(currIdx);

                    Point rawPt = config.PointsList[currIdx];
                    Point pt = ApplyJitter(rawPt, config.JitterPx);

                    if (HasWindowTarget(config))
                    {
                        NativeMethods.PerformClickDirectToWindow(config.TargetHwnd, pt.X, pt.Y, config.MouseButton, holdMs);
                    }
                    else
                    {
                        NativeMethods.SendBackgroundClick(pt.X, pt.Y, config.MouseButton, holdMs);
                    }
                    pointIndex++;
                    if (pointIndex % config.PointsList.Count == 0)
                    {
                        currentLoop++;
                    }
                }
                else
                {
                    NativeMethods.POINT cur;
                    if (NativeMethods.GetCursorPos(out cur))
                    {
                        Point pt = ApplyJitter(new Point(cur.X, cur.Y), config.JitterPx);
                        NativeMethods.SendBackgroundClick(pt.X, pt.Y, config.MouseButton, holdMs);
                    }
                    currentLoop++;
                }
            }
            else
            {
                // Physical Hardware Cursor Click
                if (HasWindowTarget(config))
                {
                    IntPtr currFg = NativeMethods.GetForegroundWindow();
                    if (currFg != config.TargetHwnd)
                    {
                        NativeMethods.ForceSetForegroundWindow(config.TargetHwnd);
                        Thread.Sleep(25);
                    }
                }

                if (hasPoints)
                {
                    int currIdx = pointIndex % config.PointsList.Count;
                    if (OnPointExecuting != null) OnPointExecuting(currIdx);

                    Point rawPt = config.PointsList[currIdx];
                    Point pt = ApplyJitter(rawPt, config.JitterPx);
                    Point actPt;
                    if (!TryGetScreenPoint(config, pt, out actPt)) continue;
                    NativeMethods.SetCursorPos(actPt.X, actPt.Y);
                    pointIndex++;
                    if (pointIndex % config.PointsList.Count == 0)
                    {
                        currentLoop++;
                    }
                }
                else
                {
                    if (config.JitterPx > 0)
                    {
                        NativeMethods.POINT cur;
                        if (NativeMethods.GetCursorPos(out cur))
                        {
                            Point pt = ApplyJitter(new Point(cur.X, cur.Y), config.JitterPx);
                            NativeMethods.SetCursorPos(pt.X, pt.Y);
                        }
                    }
                    currentLoop++;
                }

                NativeMethods.SendPhysicalClick(config.MouseButton, holdMs);
            }

            Interlocked.Increment(ref _totalClicks);
            _completedLoops = currentLoop;

            // Check Loops limit
            if (config.Loops > 0 && currentLoop >= config.Loops)
            {
                // Only the current run may end the engine; a superseded worker just exits
                if (_workerThread == Thread.CurrentThread)
                {
                    EndRun();
                    if (OnPointExecuting != null) OnPointExecuting(-1);
                    if (OnStopped != null) OnStopped();
                }
                break;
            }

            if (restMs > 0)
            {
                if (config.SmoothMouseMove && !config.FreeMouseMode && hasPoints && config.PointsList.Count > 1 && restMs > 20)
                {
                    int nextIdx = pointIndex % config.PointsList.Count;
                    Point nextPt = config.PointsList[nextIdx];
                    Point actNextPt;
                    if (TryGetScreenPoint(config, nextPt, out actNextPt))
                    {
                        MouseMovementSimulator.MoveSmoothly(Point.Empty, actNextPt, restMs, () => IsCurrentRunActive);
                    }
                }
                else
                {
                    CancellableSleep.Sleep(restMs, () => IsCurrentRunActive);
                }
            }
        }
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
            _workerThread = null;
        }
    }
}
