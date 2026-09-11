using System;
using System.Collections.Generic;
using System.Drawing;
using System.Threading;

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
        public string TargetProcessName { get; set; }
        public string TargetWindowTitle { get; set; }
        public bool RelativeToWindow { get; set; }
        public List<Point> PointsList { get; set; }
    }

    public class ClickEngine
    {
        private volatile bool _isRunning = false;
        private Thread _workerThread = null;
        private long _totalClicks = 0;
        private DateTime _startTime;
        private static readonly Random _rng = new Random();

        public bool IsRunning { get { return _isRunning; } }
        public long TotalClicks { get { return _totalClicks; } }

        public event Action<long, TimeSpan> OnProgressUpdated;
        public event Action<int> OnPointExecuting;
        public event Action OnStopped;

        private Point ApplyJitter(Point pt, int jitterPx)
        {
            if (jitterPx <= 0) return pt;
            int dx = _rng.Next(-jitterPx, jitterPx + 1);
            int dy = _rng.Next(-jitterPx, jitterPx + 1);
            return new Point(pt.X + dx, pt.Y + dy);
        }

        private Point ResolveActualPoint(Point localPt, string procName, string winTitle, bool relativeToWin)
        {
            if (!relativeToWin || (string.IsNullOrEmpty(procName) && string.IsNullOrEmpty(winTitle)))
                return localPt;

            IntPtr hWnd = NativeMethods.FindWindowByTarget(procName, winTitle);
            if (hWnd != IntPtr.Zero)
            {
                NativeMethods.POINT pt = new NativeMethods.POINT { X = localPt.X, Y = localPt.Y };
                if (NativeMethods.ClientToScreen(hWnd, ref pt))
                {
                    return new Point(pt.X, pt.Y);
                }
            }
            return localPt;
        }

        public void Start(ClickConfig config)
        {
            if (_isRunning) return;

            _isRunning = true;
            _totalClicks = 0;
            _startTime = DateTime.Now;

            _workerThread = new Thread(() =>
            {
                int interval = Math.Max(1, config.IntervalMs);
                int holdMs = Math.Min(10, interval); // Default 10ms, but <= interval (e.g. if interval=5 -> hold=5, if interval=1 -> hold=1)
                int restMs = Math.Max(0, interval - holdMs);
                int pointIndex = 0;
                int currentLoop = 0;
                bool hasPoints = (config.ClickMode == 0) && config.PointsList != null && config.PointsList.Count > 0;
                DateTime lastUiUpdate = DateTime.MinValue;

                while (_isRunning)
                {
                    if (config.FreeMouseMode)
                    {
                        // Background Click (Free Mouse Mode)
                        if (hasPoints)
                        {
                            int currIdx = pointIndex % config.PointsList.Count;
                            if (OnPointExecuting != null) OnPointExecuting(currIdx);

                            Point rawPt = config.PointsList[currIdx];
                            Point pt = ApplyJitter(rawPt, config.JitterPx);
                            IntPtr targetHwnd = config.RelativeToWindow ? NativeMethods.FindWindowByTarget(config.TargetProcessName, config.TargetWindowTitle) : IntPtr.Zero;
                            if (targetHwnd != IntPtr.Zero)
                            {
                                NativeMethods.PerformClickDirectToWindow(targetHwnd, pt.X, pt.Y, config.MouseButton, holdMs);
                            }
                            else
                            {
                                Point actPt = ResolveActualPoint(pt, config.TargetProcessName, config.TargetWindowTitle, config.RelativeToWindow);
                                NativeMethods.SendBackgroundClick(actPt.X, actPt.Y, config.MouseButton, holdMs);
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
                        if (hasPoints)
                        {
                            int currIdx = pointIndex % config.PointsList.Count;
                            if (OnPointExecuting != null) OnPointExecuting(currIdx);

                            Point rawPt = config.PointsList[currIdx];
                            Point pt = ApplyJitter(rawPt, config.JitterPx);
                            Point actPt = ResolveActualPoint(pt, config.TargetProcessName, config.TargetWindowTitle, config.RelativeToWindow);
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

                    // Realtime callback update: every single click for normal speeds, 25ms throttle for ultra-fast speeds
                    DateTime now = DateTime.Now;
                    if (interval >= 10 || (now - lastUiUpdate).TotalMilliseconds >= 25 || _totalClicks == 1 || (config.Loops > 0 && currentLoop >= config.Loops))
                    {
                        lastUiUpdate = now;
                        if (OnProgressUpdated != null)
                        {
                            OnProgressUpdated(_totalClicks, now - _startTime);
                        }
                    }

                    // Check Loops limit
                    if (config.Loops > 0 && currentLoop >= config.Loops)
                    {
                        _isRunning = false;
                        if (OnProgressUpdated != null) OnProgressUpdated(_totalClicks, DateTime.Now - _startTime);
                        if (OnPointExecuting != null) OnPointExecuting(-1);
                        if (OnStopped != null) OnStopped();
                        break;
                    }

                    if (restMs > 0)
                    {
                        if (config.SmoothMouseMove && !config.FreeMouseMode && hasPoints && config.PointsList.Count > 1 && restMs > 20)
                        {
                            int nextIdx = pointIndex % config.PointsList.Count;
                            Point nextPt = config.PointsList[nextIdx];
                            Point actNextPt = ResolveActualPoint(nextPt, config.TargetProcessName, config.TargetWindowTitle, config.RelativeToWindow);
                            MouseMovementSimulator.MoveSmoothly(Point.Empty, actNextPt, restMs, () => _isRunning);
                        }
                        else
                        {
                            Thread.Sleep(restMs);
                        }
                    }
                }
            });

            _workerThread.IsBackground = true;
            _workerThread.Start();
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
            _workerThread = null;
        }
    }
}
