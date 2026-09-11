using System;
using System.Diagnostics;
using System.Drawing;
using System.Threading;

namespace ModernAutoClicker
{
    public static class MouseMovementSimulator
    {
        public static void MoveSmoothly(Point start, Point end, int durationMs, Func<bool> isRunningCheck = null)
        {
            if (isRunningCheck != null && !isRunningCheck()) return;

            // If start point is not provided, get the real cursor position on screen
            if (start == Point.Empty)
            {
                NativeMethods.POINT curPos;
                if (NativeMethods.GetCursorPos(out curPos))
                {
                    start = new Point(curPos.X, curPos.Y);
                }
                else
                {
                    start = end;
                }
            }

            if (end == Point.Empty)
            {
                if (durationMs > 0) Thread.Sleep(durationMs);
                return;
            }

            // Fast path for very short delay or zero distance
            if (durationMs <= 20 || (start.X == end.X && start.Y == end.Y))
            {
                NativeMethods.SetCursorPos(end.X, end.Y);
                if (durationMs > 0)
                {
                    Thread.Sleep(durationMs);
                }
                return;
            }

            // Smooth Ease-in-Out interpolation across durationMs
            Stopwatch sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < durationMs)
            {
                if (isRunningCheck != null && !isRunningCheck()) break;

                float t = (float)sw.ElapsedMilliseconds / durationMs;
                if (t > 1.0f) t = 1.0f;

                // Cubic smoothstep curve for natural deceleration & acceleration
                float smoothT = t * t * (3f - 2f * t);
                int currX = (int)(start.X + (end.X - start.X) * smoothT);
                int currY = (int)(start.Y + (end.Y - start.Y) * smoothT);

                NativeMethods.SetCursorPos(currX, currY);
                Thread.Sleep(10); // ~100 updates per second for butter smoothness
            }
            sw.Stop();

            if (isRunningCheck == null || isRunningCheck())
            {
                NativeMethods.SetCursorPos(end.X, end.Y);
            }
        }
    }
}
