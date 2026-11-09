using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Engine counters only. Asian runs use Delay/RunScript steps (no input); Simple posts its clicks to this test's own hidden window or to a window that does not exist.
class RunStatsTest
{
    static int pass, fail;

    static void Check(string name, object actual, object expected)
    {
        bool ok = Equals(Convert.ToInt64(actual), Convert.ToInt64(expected));
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + ": " + actual + (ok ? "" : " (expected " + expected + ")"));
    }

    static MacroStep Delay(bool enabled = true)
    {
        return new MacroStep { ActionType = MacroActionType.Delay, DelayMs = 1, Enabled = enabled };
    }

    static void WaitFor(Func<bool> done, int ms)
    {
        Stopwatch sw = Stopwatch.StartNew();
        while (!done() && sw.ElapsedMilliseconds < ms)
        {
            Application.DoEvents(); // The clicks are delivered to a window owned by this thread
            Thread.Sleep(5);
        }
    }

    [STAThread]
    static void Main()
    {
        // 1. Asian: 3 enabled + 1 disabled step, 2 loops
        MacroProfile main = new MacroProfile { Name = "Main", LoopCount = 2, Steps = new List<MacroStep> { Delay(), Delay(false), Delay(), Delay() } };
        MacroRunner runner = new MacroRunner();
        runner.Start(main, new List<MacroProfile> { main }, true);
        WaitFor(() => !runner.IsRunning, 5000);
        Check("asian steps (3 enabled x 2 loops, disabled skipped)", runner.StepsExecuted, 6);
        Check("asian loops", runner.TotalCyclesCompleted, 2);
        Check("asian target", runner.TargetLoops, 2);

        // 2. Asian: RunScript counts itself plus the called script's steps per repeat
        MacroProfile sub = new MacroProfile { Name = "Sub", LoopCount = 1, Steps = new List<MacroStep> { Delay(), Delay() } };
        MacroProfile caller = new MacroProfile
        {
            Name = "Caller",
            LoopCount = 1,
            Steps = new List<MacroStep> { Delay(), new MacroStep { ActionType = MacroActionType.RunScript, KeyData = "Sub", RepeatCount = 2, DelayMs = 1 } }
        };
        MacroRunner runner2 = new MacroRunner();
        runner2.Start(caller, new List<MacroProfile> { caller, sub }, true);
        WaitFor(() => !runner2.IsRunning, 5000);
        Check("asian steps with RunScript (1 + 1 + 2x2)", runner2.StepsExecuted, 6);

        // 3. Asian: counters reset on the next run of the same runner
        runner.Start(main, new List<MacroProfile> { main }, true);
        WaitFor(() => !runner.IsRunning, 5000);
        Check("asian steps reset on restart", runner.StepsExecuted, 6);

        // 4. Asian: infinite loop keeps counting and elapsed grows
        MacroProfile infinite = new MacroProfile { Name = "Inf", LoopCount = 0, Steps = new List<MacroStep> { Delay() } };
        MacroRunner runner3 = new MacroRunner();
        runner3.Start(infinite, new List<MacroProfile> { infinite }, true);
        Thread.Sleep(300);
        long steps1 = runner3.StepsExecuted;
        Thread.Sleep(200);
        long steps2 = runner3.StepsExecuted;
        Check("asian infinite still counting", steps2 > steps1 ? 1 : 0, 1);
        Check("asian infinite target 0", runner3.TargetLoops, 0);
        Check("asian elapsed >= 450ms", runner3.Elapsed.TotalMilliseconds >= 450 ? 1 : 0, 1);
        runner3.Stop();

        // 5. Simple: clicks to this process's own hidden window
        using (Form target = new Form { StartPosition = FormStartPosition.Manual, Location = new Point(-3000, -3000), ShowInTaskbar = false, Text = "RunStatsTarget" })
        {
            target.Show(); // The engine only accepts a visible window as its target
            IntPtr hwnd = target.Handle;
            Process me = Process.GetCurrentProcess();
            ClickEngine engine = new ClickEngine();
            engine.Start(new ClickConfig
            {
                IntervalMs = 5,
                Loops = 3,
                FreeMouseMode = true,
                RelativeToWindow = true,
                TargetHwnd = hwnd,
                TargetPid = (uint)me.Id,
                TargetProcessName = me.ProcessName,
                ClickMode = 0,
                PointsList = new List<Point> { new Point(1, 1), new Point(2, 2) }
            });
            WaitFor(() => !engine.IsRunning, 5000);
            Check("simple clicks (2 points x 3 loops)", engine.TotalClicks, 6);
            Check("simple loops", engine.CompletedLoops, 3);
            Check("simple target", engine.TargetLoops, 3);
        }

        // 6. Simple: target window gone -> no click counted, loops still advance
        ClickEngine missing = new ClickEngine();
        missing.Start(new ClickConfig
        {
            IntervalMs = 5,
            Loops = 2,
            FreeMouseMode = true,
            RelativeToWindow = true,
            TargetProcessName = "no_such_process_xyz",
            ClickMode = 0,
            PointsList = new List<Point> { new Point(1, 1) }
        });
        WaitFor(() => !missing.IsRunning, 5000);
        Check("missing window: the run stops by itself", missing.IsRunning ? 1 : 0, 0);
        Check("missing window: no clicks", missing.TotalClicks, 0);
        Check("missing window: no loops", missing.CompletedLoops, 0);

        Console.WriteLine(string.Format("RESULT {0} passed, {1} failed", pass, fail));
    }
}
