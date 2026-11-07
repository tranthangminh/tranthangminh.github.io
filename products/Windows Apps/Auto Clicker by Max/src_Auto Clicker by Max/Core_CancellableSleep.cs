using System;
using System.Diagnostics;
using System.Threading;

namespace ModernAutoClicker
{
    /// <summary>
    /// Waits in short slices so a long wait (minutes) ends within one slice of Stop instead of running to the end.
    /// The deadline is measured with a Stopwatch, so slicing does not stretch the total wait.
    /// </summary>
    public static class CancellableSleep
    {
        private const int SliceMs = 50;

        public static void Sleep(int ms, Func<bool> keepWaiting)
        {
            if (ms <= 0) return;
            if (ms <= SliceMs || keepWaiting == null)
            {
                Thread.Sleep(ms);
                return;
            }

            Stopwatch sw = Stopwatch.StartNew();
            while (keepWaiting())
            {
                long remaining = ms - sw.ElapsedMilliseconds;
                if (remaining <= 0) break;
                Thread.Sleep((int)Math.Min(remaining, SliceMs));
            }
        }
    }
}
