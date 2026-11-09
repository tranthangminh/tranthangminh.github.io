using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Steps per second of a fast script, compiled and run against the old and the new build.
class SpeedTest
{
    static Process target;

    static MacroStep Step(MacroActionType type)
    {
        return new MacroStep { ActionType = type, RelativeToWindow = true, WindowHwnd = target.MainWindowHandle, TargetPid = (uint)target.Id, ProcessName = "WinTarget", WindowTitle = "Speed target", StartPoint = new Point(20, 20), HoldMs = 1, DelayMs = 1 };
    }

    static double Measure(MacroActionType type, int stepsPerCycle, int seconds)
    {
        List<MacroStep> steps = new List<MacroStep>();
        for (int i = 0; i < stepsPerCycle; i++) steps.Add(Step(type));
        MacroProfile prof = new MacroProfile { Name = "S", LoopCount = 0, SpeedPercent = 100, Steps = steps };
        MacroRunner runner = new MacroRunner();
        runner.Start(prof, new List<MacroProfile> { prof }, true);
        Stopwatch sw = Stopwatch.StartNew();
        Thread.Sleep(seconds * 1000);
        int cycles = runner.TotalCyclesCompleted;
        double elapsed = sw.Elapsed.TotalSeconds;
        runner.Stop();
        Thread.Sleep(200);
        return cycles * stepsPerCycle / elapsed;
    }

    [STAThread]
    static void Main(string[] a)
    {
        string dir = a[0];
        int y = Screen.PrimaryScreen.Bounds.Height - 190;
        target = Process.Start(new ProcessStartInfo(Path.Combine(dir, "WinTarget.exe"), string.Format("\"{0}\" \"speed\" \"Speed target\" 5 {1} topmost", dir, y)) { UseShellExecute = false });
        for (int i = 0; i < 100 && target.MainWindowHandle == IntPtr.Zero; i++) { Thread.Sleep(50); target.Refresh(); }
        Thread.Sleep(300);
        try
        {
            Console.WriteLine(string.Format("click {0:F0} steps/s", Measure(MacroActionType.LeftClick, 5, 5)));
            Console.WriteLine(string.Format("delay {0:F0} steps/s", Measure(MacroActionType.Delay, 5, 5)));
        }
        finally
        {
            if (!target.HasExited) target.Kill();
            try { File.Delete(Path.Combine(dir, "speed.clicks")); } catch (IOException) { }
        }
    }
}
