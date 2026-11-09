using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Window resolution and the engines against real windows in separate processes (WinTarget.exe), in the screen corner.
// Clicks are posted only to those windows; the one physical-mouse case checks the window under the point first and puts the cursor back.
class TargetTest
{
    const string Proc = "WinTarget";
    const int SW_MINIMIZE = 6, SW_HIDE = 0, SW_RESTORE = 9;
    const uint WM_CLOSE = 0x0010;

    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out Point p);
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(Point p);

    class Win
    {
        public Process P;
        public IntPtr H;
        public uint Pid;
        public string Label;
        public Point Corner;
    }

    static string dir;
    static int pass, fail;
    static List<Win> open = new List<Win>();

    static void Check(string name, bool ok, string detail = "")
    {
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + (detail.Length > 0 ? " :: " + detail : ""));
    }

    static void Eq<T>(string name, T actual, T expected)
    {
        Check(name, Equals(actual, expected), "got " + actual + (Equals(actual, expected) ? "" : ", want " + expected));
    }

    static Win Open(string label, string title, int slot, bool topmost = false, string second = null)
    {
        int x = 5 + slot * 250, y = Screen.PrimaryScreen.Bounds.Height - 190;
        string args = string.Format("\"{0}\" \"{1}\" \"{2}\" {3} {4} {5}", dir, label, title, x, y, topmost ? "topmost" : "normal");
        if (second != null) args += " \"" + second + "\"";
        Process p = Process.Start(new ProcessStartInfo(Path.Combine(dir, "WinTarget.exe"), args) { UseShellExecute = false });
        Stopwatch sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < 5000)
        {
            p.Refresh();
            if (p.MainWindowHandle != IntPtr.Zero) break;
            Thread.Sleep(20);
        }
        Thread.Sleep(250); // Distinct start times; the "opened first" order depends on them
        Win w = new Win { P = p, H = p.MainWindowHandle, Pid = (uint)p.Id, Label = label, Corner = new Point(x, y) };
        open.Add(w);
        return w;
    }

    static void Kill(Win w)
    {
        if (!w.P.HasExited) { w.P.Kill(); w.P.WaitForExit(3000); }
        Thread.Sleep(50);
    }

    static void CleanUp()
    {
        foreach (Win w in open) { try { if (!w.P.HasExited) w.P.Kill(); w.P.WaitForExit(2000); } catch { } }
        open.Clear();
        foreach (string f in Directory.GetFiles(dir, "*.clicks")) File.Delete(f);
        Thread.Sleep(1100); // Let the 1-second resolve cache expire so cases stay independent
    }

    static int Clicks(string label)
    {
        string f = Path.Combine(dir, label + ".clicks");
        for (int attempt = 0; attempt < 50; attempt++)
        {
            try { return File.Exists(f) ? File.ReadAllLines(f).Length : 0; }
            catch (IOException) { Thread.Sleep(5); }
        }
        throw new IOException("Cannot read " + f);
    }

    static TargetWindowState State(IntPtr hwnd, uint pid, string title, int index, out IntPtr resolved, string proc = Proc)
    {
        return NativeMethods.GetTargetWindowState(hwnd, pid, proc, title, index, out resolved);
    }

    static void WaitFor(Func<bool> done, int ms)
    {
        Stopwatch sw = Stopwatch.StartNew();
        while (!done() && sw.ElapsedMilliseconds < ms) Thread.Sleep(10);
    }

    static void Main(string[] args)
    {
        dir = args[0];
        try
        {
            FindWithPidLock();
            FindMinimized();
            FindClosed();
            FindPidReused();
            FindAfterReopen();
            FindNoFalseMatches();
            FindSamePidWindows();
            FindHiddenAndDesktop();
            SimpleEngine();
            SimpleMinimized();
            SimplePhysical();
            SimpleAllScreens();
            AsianEngine();
            AsianSubScript();
            AsianWaitStep();
            AsianMinimizedAndUnusedTarget();
            StressKillDuringRun();
        }
        catch (Exception ex)
        {
            fail++;
            Console.WriteLine("EXCEPTION " + ex);
        }
        CleanUp();
        Console.WriteLine(string.Format("RESULT {0} passed, {1} failed", pass, fail));
    }

    static void FindWithPidLock()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1), a3 = Open("a3", "Same", 2);
        IntPtr r;
        Eq("pid lock: Find gets A2 by its PID", NativeMethods.FindWindowByTarget(Proc, "Same", 0, a2.Pid), a2.H);
        Eq("pid lock: state Ok", State(IntPtr.Zero, a2.Pid, "Same", 0, out r), TargetWindowState.Ok);
        Eq("pid lock: resolved A2", r, a2.H);
        Eq("pid lock: valid handle stays", State(a3.H, a3.Pid, "Same", 3, out r), TargetWindowState.Ok);
        Eq("pid lock: resolved A3", r, a3.H);
        Eq("dynamic title: valid handle with an old title stays", State(a1.H, a1.Pid, "An old title", 0, out r), TargetWindowState.Ok);
        CleanUp();
    }

    static void FindMinimized()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1);
        ShowWindow(a1.H, SW_MINIMIZE);
        Thread.Sleep(300);
        IntPtr r;
        Eq("minimized with handle", State(a1.H, a1.Pid, "Same", 0, out r), TargetWindowState.Minimized);
        Eq("minimized with handle: nothing resolved", r, IntPtr.Zero);
        Eq("minimized without handle (cleared by a timer)", State(IntPtr.Zero, a1.Pid, "Same", 0, out r), TargetWindowState.Minimized);
        Eq("minimized, one other window: Find does not take A2", NativeMethods.FindWindowByTarget(Proc, "Same", 0, a1.Pid), IntPtr.Zero);
        Eq("minimized, old title: still not A2", NativeMethods.FindWindowByTarget(Proc, "Old", 0, a1.Pid) == a2.H, false);
        ShowWindow(a1.H, SW_RESTORE);
        Thread.Sleep(300);
        Eq("restored: Ok again", State(IntPtr.Zero, a1.Pid, "Same", 0, out r), TargetWindowState.Ok);
        Eq("restored: resolved A1", r, a1.H);
        CleanUp();
    }

    static void FindClosed()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1), a3 = Open("a3", "Same", 2);
        uint deadPid = a1.Pid;
        IntPtr deadHwnd = a1.H;
        Kill(a1);
        IntPtr r;
        Eq("closed, 2 left, with handle", State(deadHwnd, deadPid, "Same", 0, out r), TargetWindowState.Closed);
        Eq("closed, 2 left: nothing resolved", r, IntPtr.Zero);
        Eq("closed, 2 left, no handle", State(IntPtr.Zero, deadPid, "Same", 0, out r), TargetWindowState.Closed);
        Eq("closed, saved index 1 does not move to A2", NativeMethods.FindWindowByTarget(Proc, "Same", 1, deadPid), IntPtr.Zero);
        Eq("closed, saved index 1 state", State(IntPtr.Zero, deadPid, "Same", 1, out r), TargetWindowState.Closed);
        Kill(a3);
        Eq("closed, 1 left", State(deadHwnd, deadPid, "Same", 0, out r), TargetWindowState.Closed);
        Eq("closed, 1 left: Find does not take it", NativeMethods.FindWindowByTarget(Proc, "Same", 0, deadPid), IntPtr.Zero);
        Win reopened = Open("a1b", "Same", 0);
        Eq("closed and reopened (new PID)", State(deadHwnd, deadPid, "Same", 0, out r), TargetWindowState.Closed);
        Eq("closed and reopened: Find does not bind", NativeMethods.FindWindowByTarget(Proc, "Same", 0, deadPid), IntPtr.Zero);
        Kill(a2);
        Kill(reopened);
        Eq("closed, nothing left", State(deadHwnd, deadPid, "Same", 0, out r), TargetWindowState.Closed);
        CleanUp();
    }

    static void FindPidReused()
    {
        Win a1 = Open("a1", "Same", 0);
        IntPtr r;
        // A live PID that belongs to another program must count as closed, not "still running"
        Eq("pid reused by another program", State(IntPtr.Zero, (uint)Process.GetCurrentProcess().Id, "Same", 0, out r), TargetWindowState.Closed);
        Eq("pid reused: Find finds nothing", NativeMethods.FindWindowByTarget(Proc, "Same", 0, (uint)Process.GetCurrentProcess().Id), IntPtr.Zero);
        CleanUp();
    }

    static void FindAfterReopen()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1), a3 = Open("a3", "Same", 2);
        IntPtr r;
        Eq("reopened app (PID 0): first opened", NativeMethods.FindWindowByTarget(Proc, "Same", 0, 0), a1.H);
        Eq("reopened app: saved index 2", NativeMethods.FindWindowByTarget(Proc, "Same", 2, 0), a2.H);
        Eq("reopened app: saved index beyond the windows", NativeMethods.FindWindowByTarget(Proc, "Same", 5, 0), IntPtr.Zero);
        Eq("reopened app: index beyond, state", State(IntPtr.Zero, 0, "Same", 5, out r), TargetWindowState.NotFound);
        Eq("reopened app: title changed, first opened", NativeMethods.FindWindowByTarget(Proc, "Old title", 0, 0), a1.H);
        ShowWindow(a1.H, SW_MINIMIZE);
        Thread.Sleep(300);
        Thread.Sleep(1100);
        Eq("reopened app: first opened is minimized, state", State(IntPtr.Zero, 0, "Same", 0, out r), TargetWindowState.Minimized);
        Eq("reopened app: first opened is minimized, not the next one", NativeMethods.FindWindowByTarget(Proc, "Same", 0, 0), IntPtr.Zero);
        CleanUp();

        Win only = Open("only", "Doc A", 0);
        Eq("reopened app: single window with another title", NativeMethods.FindWindowByTarget(Proc, "Doc B", 0, 0), only.H);
        Eq("reopened app: single window with stale index", NativeMethods.FindWindowByTarget(Proc, "Doc B", 3, 0), only.H);
        CleanUp();
    }

    static void FindNoFalseMatches()
    {
        Win titled = Open("t", "Unique Title 7421", 0);
        IntPtr r;
        Eq("saved app not running: other app with the same title is not it", NativeMethods.FindWindowByTarget("no_such_process_xyz", "Unique Title 7421", 0, 0), IntPtr.Zero);
        Eq("saved app not running: state", State(IntPtr.Zero, 0, "Unique Title 7421", 0, out r, "no_such_process_xyz"), TargetWindowState.NotFound);
        Eq("title only: real match still works", NativeMethods.FindWindowByTarget("", "Unique Title 7421", 0, 0), titled.H);
        CleanUp();

        Win untitled = Open("u", "", 0);
        IntPtr found = NativeMethods.FindWindowByTarget("", "zz no such title 991", 0, 0);
        Check("title only: an untitled window is not a match", found != untitled.H && found == IntPtr.Zero, "got " + found);
        CleanUp();
    }

    static void FindSamePidWindows()
    {
        Win app = Open("app", "Main W", 0, false, "Second W");
        Thread.Sleep(300);
        IntPtr second = FindWindowEx(IntPtr.Zero, IntPtr.Zero, null, "Second W");
        Check("same PID: second window exists", second != IntPtr.Zero);
        // Process.MainWindowHandle can name either of two windows, depending on which it meets first
        IntPtr main = FindWindowEx(IntPtr.Zero, IntPtr.Zero, null, "Main W");
        Check("same PID: main window exists", main != IntPtr.Zero);
        IntPtr r;

        Eq("same PID: title picks the main window", NativeMethods.FindWindowByTarget(Proc, "Main W", 0, app.Pid), main);
        Eq("same PID: title picks the second window", NativeMethods.FindWindowByTarget(Proc, "Second W", 0, app.Pid), second);
        Eq("same PID: unknown title with 2 windows finds nothing", NativeMethods.FindWindowByTarget(Proc, "Changed", 0, app.Pid), IntPtr.Zero);
        Eq("same PID: unknown title with 2 windows, state", State(IntPtr.Zero, app.Pid, "Changed", 0, out r), TargetWindowState.NotFound);

        ShowWindow(second, SW_MINIMIZE);
        Thread.Sleep(300);
        Thread.Sleep(1100);
        Eq("same PID: second minimized, state", State(second, app.Pid, "Second W", 0, out r), TargetWindowState.Minimized);
        Eq("same PID: second minimized, no move to the main window", NativeMethods.FindWindowByTarget(Proc, "Second W", 0, app.Pid), IntPtr.Zero);
        ShowWindow(second, SW_RESTORE);
        Thread.Sleep(300);

        PostMessage(second, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
        WaitFor(() => !IsWindow(second), 2000);
        Thread.Sleep(1100);
        Eq("same PID: closed window, engine check does not move", State(second, app.Pid, "Second W", 0, out r), TargetWindowState.NotFound);
        Eq("same PID: closed window, nothing resolved", r, IntPtr.Zero);
        // Documented limit: without the old handle, the only window of the app is taken for the target
        Eq("same PID: without a handle the only window is taken", NativeMethods.FindWindowByTarget(Proc, "Second W", 0, app.Pid), main);
        CleanUp();
    }

    static void FindHiddenAndDesktop()
    {
        Win a1 = Open("a1", "Same", 0);
        ShowWindow(a1.H, SW_HIDE);
        Thread.Sleep(200);
        IntPtr r;
        Eq("hidden with handle", State(a1.H, a1.Pid, "Same", 0, out r), TargetWindowState.Hidden);
        Eq("hidden without handle: process runs, no window", State(IntPtr.Zero, a1.Pid, "Same", 0, out r), TargetWindowState.NotFound);
        Check("desktop target resolves", NativeMethods.FindWindowByTarget("explorer", "Windows Desktop", 0, 0) != IntPtr.Zero);
        Eq("desktop target state", State(IntPtr.Zero, 0, "Windows Desktop", 0, out r, "explorer"), TargetWindowState.Ok);
        CleanUp();
    }

    static ClickConfig SimpleConfig(Win w, bool free)
    {
        return new ClickConfig
        {
            IntervalMs = 15,
            Loops = 0,
            FreeMouseMode = free,
            RelativeToWindow = true,
            TargetHwnd = w.H,
            TargetPid = w.Pid,
            TargetProcessName = Proc,
            TargetWindowTitle = "Same",
            ClickMode = 0,
            PointsList = new List<Point> { new Point(20, 20) }
        };
    }

    static void SimpleEngine()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1), a3 = Open("a3", "Same", 2);
        ClickEngine engine = new ClickEngine();
        List<TargetProblem> lost = new List<TargetProblem>();
        int stopped = 0;
        engine.OnTargetLost += p => lost.Add(p);
        engine.OnStopped += () => stopped++;

        engine.Start(SimpleConfig(a1, true));
        Thread.Sleep(500);
        Check("simple free: A1 gets clicks", Clicks("a1") > 0, "a1=" + Clicks("a1"));
        Eq("simple free: A2 gets none", Clicks("a2"), 0);
        Eq("simple free: A3 gets none", Clicks("a3"), 0);
        Eq("simple free: engine count matches", engine.IsRunning, true);

        uint deadPid = a1.Pid;
        Kill(a1);
        WaitFor(() => !engine.IsRunning, 2000);
        Eq("simple closed: engine stopped itself", engine.IsRunning, false);
        Eq("simple closed: one report", lost.Count, 1);
        if (lost.Count > 0)
        {
            Eq("simple closed: state", lost[0].State, TargetWindowState.Closed);
            Eq("simple closed: reports the PID", lost[0].Pid, deadPid);
            Eq("simple closed: StoppedRun", lost[0].StoppedRun, true);
        }
        Eq("simple closed: OnStopped once", stopped, 1);
        Thread.Sleep(200);
        Eq("simple closed: A2 still none", Clicks("a2"), 0);
        Eq("simple closed: A3 still none", Clicks("a3"), 0);

        // Manual Stop is not a lost target
        lost.Clear();
        engine.Start(SimpleConfig(a2, true));
        Thread.Sleep(200);
        engine.Stop();
        Thread.Sleep(100);
        Eq("simple manual stop: no target report", lost.Count, 0);
        CleanUp();
    }

    static void SimpleMinimized()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1);
        ClickEngine engine = new ClickEngine();
        List<TargetProblem> lost = new List<TargetProblem>();
        engine.OnTargetLost += p => lost.Add(p);
        engine.Start(SimpleConfig(a1, true));
        Thread.Sleep(300);
        ShowWindow(a1.H, SW_MINIMIZE);
        WaitFor(() => !engine.IsRunning, 2000);
        Eq("simple minimized: engine stopped", engine.IsRunning, false);
        Eq("simple minimized: state", lost.Count > 0 ? lost[0].State : TargetWindowState.Ok, TargetWindowState.Minimized);
        int after = Clicks("a1");
        Thread.Sleep(300);
        Eq("simple minimized: no more clicks", Clicks("a1"), after);
        Eq("simple minimized: A2 none", Clicks("a2"), 0);
        Eq("simple minimized: window was not restored", IsIconic(a1.H), true);

        // Start while it is minimized
        lost.Clear();
        engine.Start(SimpleConfig(a1, true));
        WaitFor(() => !engine.IsRunning, 2000);
        Eq("simple start while minimized: refused", lost.Count > 0 ? lost[0].State : TargetWindowState.Ok, TargetWindowState.Minimized);
        Eq("simple start while minimized: no clicks", Clicks("a1"), after);
        CleanUp();
    }

    static void SimplePhysical()
    {
        // Target already gone: no mouse movement, no click
        Win a1 = Open("a1", "Same", 0);
        ClickConfig dead = SimpleConfig(a1, false);
        Kill(a1);
        ClickEngine engine = new ClickEngine();
        List<TargetProblem> lost = new List<TargetProblem>();
        engine.OnTargetLost += p => lost.Add(p);
        Point before;
        GetCursorPos(out before);
        engine.Start(dead);
        WaitFor(() => !engine.IsRunning, 2000);
        Point after;
        GetCursorPos(out after);
        Eq("physical, target gone: state", lost.Count > 0 ? lost[0].State : TargetWindowState.Ok, TargetWindowState.Closed);
        Eq("physical, target gone: no clicks counted", engine.TotalClicks, 0L);
        Eq("physical, target gone: cursor not moved", after, before);
        CleanUp();

        // Real mouse on a topmost test window; skipped when something else would be under the point
        Win t = Open("t", "Same", 0, true);
        Thread.Sleep(300);
        Point screen = new Point(t.Corner.X + 60, t.Corner.Y + 60);
        if (WindowFromPoint(screen) != t.H)
        {
            Console.WriteLine("SKIP physical click: the test window is not on top at the point");
            CleanUp();
            return;
        }
        GetCursorPos(out before);
        lost.Clear();
        ClickEngine real = new ClickEngine();
        real.OnTargetLost += p => lost.Add(p);
        ClickConfig cfg = SimpleConfig(t, false);
        cfg.IntervalMs = 100;
        cfg.Loops = 3;
        real.Start(cfg);
        WaitFor(() => !real.IsRunning, 3000);
        SetCursorPos(before.X, before.Y);
        Eq("physical: 3 clicks counted", real.TotalClicks, 3L);
        Thread.Sleep(200);
        Eq("physical: 3 clicks arrived on the target", Clicks("t"), 3);
        Eq("physical: no target report", lost.Count, 0);
        CleanUp();
    }

    static void SimpleAllScreens()
    {
        Win t = Open("t", "Same", 0, true);
        Thread.Sleep(300);
        Point screen = new Point(t.Corner.X + 60, t.Corner.Y + 60);
        if (WindowFromPoint(screen) != t.H)
        {
            Console.WriteLine("SKIP all screens: the test window is not on top at the point");
            CleanUp();
            return;
        }
        ClickEngine engine = new ClickEngine();
        List<TargetProblem> lost = new List<TargetProblem>();
        engine.OnTargetLost += p => lost.Add(p);
        engine.Start(new ClickConfig { IntervalMs = 20, Loops = 3, FreeMouseMode = true, RelativeToWindow = false, ClickMode = 0, PointsList = new List<Point> { screen } });
        WaitFor(() => !engine.IsRunning, 3000);
        Eq("all screens: no target check, 3 clicks", engine.TotalClicks, 3L);
        Eq("all screens: no report", lost.Count, 0);
        Thread.Sleep(200);
        Eq("all screens: clicks arrived", Clicks("t"), 3);
        CleanUp();
    }

    // The target dies at a random moment of the run, over and over: always one report, one stop, nothing on the other window
    static void StressKillDuringRun()
    {
        Random rng = new Random(1234);
        int simpleBad = 0, asianBad = 0, otherClicks = 0;
        for (int round = 0; round < 12; round++)
        {
            Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1);
            bool asian = round % 2 == 1;
            List<TargetProblem> lost = new List<TargetProblem>();
            int stopped = 0;
            Func<bool> running;
            Action stop = () => { };

            if (asian)
            {
                MacroProfile main = new MacroProfile { Name = "Main", LoopCount = 0, Steps = new List<MacroStep> { ClickOn(a1), Wait(), ClickOn(a1) } };
                MacroRunner r = new MacroRunner();
                r.OnTargetLost += p => { lock (lost) lost.Add(p); };
                r.OnStopped += () => stopped++;
                r.Start(main, new List<MacroProfile> { main }, true);
                running = () => r.IsRunning;
            }
            else
            {
                ClickEngine e = new ClickEngine();
                e.OnTargetLost += p => { lock (lost) lost.Add(p); };
                e.OnStopped += () => stopped++;
                e.Start(SimpleConfig(a1, true));
                running = () => e.IsRunning;
            }

            Thread.Sleep(50 + rng.Next(300));
            Kill(a1);
            WaitFor(() => !running() && stopped > 0, 3000);
            bool ok = !running() && stopped == 1 && lost.Count == 1 && lost[0].State == TargetWindowState.Closed;
            if (!ok)
            {
                if (asian) asianBad++; else simpleBad++;
                Console.WriteLine("stress round " + round + " running=" + running() + " stopped=" + stopped + " lost=" + lost.Count + (lost.Count > 0 ? " state=" + lost[0].State : ""));
            }
            otherClicks += Clicks("a2");
            CleanUp();
        }
        Eq("stress: simple runs ended cleanly", simpleBad, 0);
        Eq("stress: asian runs ended cleanly", asianBad, 0);
        Eq("stress: the other window was never clicked", otherClicks, 0);
    }

    static MacroStep ClickOn(Win w, string title = "Same")
    {
        return new MacroStep
        {
            ActionType = MacroActionType.LeftClick,
            RelativeToWindow = true,
            WindowHwnd = w.H,
            TargetPid = w.Pid,
            ProcessName = Proc,
            WindowTitle = title,
            StartPoint = new Point(20, 20),
            HoldMs = 1,
            DelayMs = 10
        };
    }

    static MacroStep Wait()
    {
        return new MacroStep { ActionType = MacroActionType.Delay, HoldMs = 1, DelayMs = 10 };
    }

    static void AsianEngine()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1);
        MacroProfile main = new MacroProfile { Name = "Main", LoopCount = 0, Steps = new List<MacroStep> { Wait(), ClickOn(a1), Wait() } };
        MacroRunner runner = new MacroRunner();
        List<TargetProblem> lost = new List<TargetProblem>();
        int stopped = 0;
        runner.OnTargetLost += p => lost.Add(p);
        runner.OnStopped += () => stopped++;
        runner.Start(main, new List<MacroProfile> { main }, true);
        Thread.Sleep(600);
        Check("asian: A1 gets clicks", Clicks("a1") > 0, "a1=" + Clicks("a1"));
        Eq("asian: A2 gets none", Clicks("a2"), 0);

        uint deadPid = a1.Pid;
        Kill(a1);
        WaitFor(() => !runner.IsRunning, 2000);
        Eq("asian closed: runner stopped", runner.IsRunning, false);
        WaitFor(() => stopped > 0, 2000);
        Eq("asian closed: one report", lost.Count, 1);
        if (lost.Count > 0)
        {
            Eq("asian closed: state", lost[0].State, TargetWindowState.Closed);
            Eq("asian closed: PID", lost[0].Pid, deadPid);
            Eq("asian closed: step number", lost[0].Steps.Count > 0 ? lost[0].Steps[0] : "", "2");
            Eq("asian closed: script", lost[0].RootScriptName, "Main");
        }
        Eq("asian closed: OnStopped once", stopped, 1);
        Thread.Sleep(200);
        Eq("asian closed: A2 still none", Clicks("a2"), 0);

        // Manual stop is not a lost target
        lost.Clear();
        MacroProfile second = new MacroProfile { Name = "Second", LoopCount = 0, Steps = new List<MacroStep> { ClickOn(a2), Wait() } };
        MacroRunner manual = new MacroRunner();
        manual.OnTargetLost += p => lost.Add(p);
        manual.Start(second, new List<MacroProfile> { second }, true);
        Thread.Sleep(300);
        manual.Stop();
        Thread.Sleep(200);
        Eq("asian manual stop: no report", lost.Count, 0);
        CleanUp();
    }

    static void AsianSubScript()
    {
        Win a1 = Open("a1", "Same", 0);
        MacroProfile sub = new MacroProfile { Name = "Sub", LoopCount = 1, Steps = new List<MacroStep> { Wait(), ClickOn(a1) } };
        MacroProfile main = new MacroProfile
        {
            Name = "Main",
            LoopCount = 0,
            Steps = new List<MacroStep> { Wait(), new MacroStep { ActionType = MacroActionType.RunScript, KeyData = "Sub", RepeatCount = 1, DelayMs = 1 } }
        };
        MacroRunner runner = new MacroRunner();
        List<TargetProblem> lost = new List<TargetProblem>();
        runner.OnTargetLost += p => lost.Add(p);
        runner.Start(main, new List<MacroProfile> { main, sub }, true);
        Thread.Sleep(500);
        Check("asian sub-script: clicks arrive", Clicks("a1") > 0, "a1=" + Clicks("a1"));
        Kill(a1);
        WaitFor(() => !runner.IsRunning, 2000);
        Eq("asian sub-script: stopped", runner.IsRunning, false);
        Eq("asian sub-script: names the called script's step", lost.Count > 0 && lost[0].Steps.Count > 0 ? lost[0].Steps[0] : "", "Sub #2");
        CleanUp();
    }

    static void AsianWaitStep()
    {
        Win a1 = Open("a1", "Same", 0);
        MacroStep wait = ClickOn(a1);
        wait.ActionType = MacroActionType.WaitColor;
        wait.TargetColor = Color.FromArgb(1, 2, 3);
        wait.Tolerance = 1;
        MacroProfile main = new MacroProfile { Name = "Main", LoopCount = 0, Steps = new List<MacroStep> { wait } };
        MacroRunner runner = new MacroRunner();
        List<TargetProblem> lost = new List<TargetProblem>();
        runner.OnTargetLost += p => lost.Add(p);
        runner.Start(main, new List<MacroProfile> { main }, true);
        Thread.Sleep(500);
        Eq("asian wait step: still waiting", runner.IsRunning, true);
        Kill(a1);
        Stopwatch sw = Stopwatch.StartNew();
        WaitFor(() => !runner.IsRunning, 3000);
        Eq("asian wait step: stops when the window closes", runner.IsRunning, false);
        Check("asian wait step: stopped quickly", sw.ElapsedMilliseconds < 1000, sw.ElapsedMilliseconds + "ms");
        Eq("asian wait step: state", lost.Count > 0 ? lost[0].State : TargetWindowState.Ok, TargetWindowState.Closed);
        CleanUp();
    }

    static void AsianMinimizedAndUnusedTarget()
    {
        Win a1 = Open("a1", "Same", 0), a2 = Open("a2", "Same", 1);
        MacroProfile main = new MacroProfile { Name = "Main", LoopCount = 0, Steps = new List<MacroStep> { ClickOn(a1), Wait() } };
        MacroRunner runner = new MacroRunner();
        List<TargetProblem> lost = new List<TargetProblem>();
        runner.OnTargetLost += p => lost.Add(p);
        runner.Start(main, new List<MacroProfile> { main }, true);
        Thread.Sleep(300);
        ShowWindow(a1.H, SW_MINIMIZE);
        WaitFor(() => !runner.IsRunning, 2000);
        Eq("asian minimized: stopped", runner.IsRunning, false);
        Eq("asian minimized: state", lost.Count > 0 ? lost[0].State : TargetWindowState.Ok, TargetWindowState.Minimized);
        Eq("asian minimized: not restored", IsIconic(a1.H), true);
        Eq("asian minimized: A2 none", Clicks("a2"), 0);

        // A Delay that happens to store a dead target does not need it
        lost.Clear();
        MacroStep delayWithTarget = ClickOn(a2);
        delayWithTarget.ActionType = MacroActionType.Delay;
        Kill(a2);
        MacroProfile delays = new MacroProfile { Name = "Delays", LoopCount = 2, Steps = new List<MacroStep> { delayWithTarget } };
        MacroRunner delayRunner = new MacroRunner();
        delayRunner.OnTargetLost += p => lost.Add(p);
        delayRunner.Start(delays, new List<MacroProfile> { delays }, true);
        WaitFor(() => !delayRunner.IsRunning, 3000);
        Eq("delay with a dead target: finishes", delayRunner.TotalCyclesCompleted, 2);
        Eq("delay with a dead target: no report", lost.Count, 0);
        Eq("UsesTargetWindow: click yes", ActionExecutor.UsesTargetWindow(ClickOn(a1)), true);
        Eq("UsesTargetWindow: delay no", ActionExecutor.UsesTargetWindow(delayWithTarget), false);
        MacroStep noTarget = new MacroStep { ActionType = MacroActionType.LeftClick };
        Eq("UsesTargetWindow: All Screens no", ActionExecutor.UsesTargetWindow(noTarget), false);
        CleanUp();
    }
}
