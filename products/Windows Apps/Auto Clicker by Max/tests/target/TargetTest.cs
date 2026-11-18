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

    static Win Open(string label, string title, int slot, bool topmost = false, string second = null, string mode = null)
    {
        int x = 5 + slot * 250, y = Screen.PrimaryScreen.Bounds.Height - 190;
        string args = string.Format("\"{0}\" \"{1}\" \"{2}\" {3} {4} {5}", dir, label, title, x, y, mode ?? (topmost ? "topmost" : "normal"));
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
        foreach (string ext in new[] { "*.clicks", "*.keys", "*.drags", "*.wheel" })
            foreach (string f in Directory.GetFiles(dir, ext)) File.Delete(f);
        Thread.Sleep(1100); // Let the 1-second resolve cache expire so cases stay independent
    }

    static int Clicks(string label, string ext = ".clicks")
    {
        return Logged(label, ext).Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;
    }

    static string Logged(string label, string ext)
    {
        string f = Path.Combine(dir, label + ext);
        for (int attempt = 0; attempt < 50; attempt++)
        {
            try { return File.Exists(f) ? File.ReadAllText(f) : ""; }
            catch (IOException) { Thread.Sleep(5); }
        }
        throw new IOException("Cannot read " + f);
    }

    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();

    // The test window that stands for the window the user works in. False when Windows would not let it come to the front.
    static bool PutInFront(Win w)
    {
        NativeMethods.ForceSetForegroundWindow(w.H);
        WaitFor(() => GetForegroundWindow() == w.H, 1500);
        return GetForegroundWindow() == w.H;
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
            BackgroundGameWindows();
            BackgroundDragWheelKeys();
            FocusGuardPutsUserWindowBack();
            SwitchToFreeMouseWhileRunning();
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

    static MacroRunner RunScript(params MacroStep[] steps)
    {
        MacroProfile p = new MacroProfile { Name = "S" + Environment.TickCount, LoopCount = 0, Steps = new List<MacroStep>(steps) };
        MacroRunner r = new MacroRunner();
        r.Start(p, new List<MacroProfile> { p }, true);
        return r;
    }

    // Two windows of a game that only takes a click while it believes it is active, and another window in front:
    // two scripts at once, like the reported case, and the All Screens target the reported script used
    static void BackgroundGameWindows()
    {
        Win g1 = Open("g1", "Game", 0, false, null, "game"), g2 = Open("g2", "Game", 1, false, null, "game"), front = Open("front", "Front", 2);
        if (!PutInFront(front))
        {
            Console.WriteLine("SKIP background game: the front test window could not come to the front");
            CleanUp();
            return;
        }

        MacroRunner r1 = RunScript(ClickOn(g1, "Game"), Wait()), r2 = RunScript(ClickOn(g2, "Game"), Wait());
        Thread.Sleep(700);
        r1.Stop(); r2.Stop();
        Thread.Sleep(150);
        Check("background game: window 1 takes clicks", Clicks("g1") > 0, "g1=" + Clicks("g1"));
        Check("background game: window 2 takes clicks", Clicks("g2") > 0, "g2=" + Clicks("g2"));
        Eq("background game: the front window stays in front", GetForegroundWindow(), front.H);

        ClickEngine simple = new ClickEngine();
        int before = Clicks("g2");
        simple.Start(SimpleConfig(g2, true));
        Thread.Sleep(400);
        simple.Stop();
        Thread.Sleep(150);
        Check("background game: Simple tab clicks it too", Clicks("g2") > before, "g2 " + before + " -> " + Clicks("g2"));

        Point screen = new Point(g1.Corner.X + 60, g1.Corner.Y + 60);
        if (WindowFromPoint(screen) == g1.H)
        {
            before = Clicks("g1");
            MacroRunner all = RunScript(new MacroStep { ActionType = MacroActionType.LeftClick, StartPoint = screen, HoldMs = 1, DelayMs = 20 });
            Thread.Sleep(400);
            all.Stop();
            Thread.Sleep(150);
            Check("background game: All Screens step clicks it", Clicks("g1") > before, "g1 " + before + " -> " + Clicks("g1"));
        }
        else Console.WriteLine("SKIP background game, All Screens: the game window is not on top at the point");
        Eq("background game: the front window is still in front", GetForegroundWindow(), front.H);
        CleanUp();
    }

    // Free Mouse sends drag, wheel, keys and text to the step's window as messages, while another window stays in front
    static void BackgroundDragWheelKeys()
    {
        Win t = Open("t", "Same", 0), front = Open("front", "Front", 1);
        if (!PutInFront(front))
        {
            Console.WriteLine("SKIP background drag/wheel/keys: the front test window could not come to the front");
            CleanUp();
            return;
        }

        MacroStep drag = ClickOn(t); drag.ActionType = MacroActionType.DragDrop; drag.EndPoint = new Point(120, 50); drag.HoldMs = 60;
        MacroStep wheel = ClickOn(t); wheel.ActionType = MacroActionType.MiddleClick; wheel.ScrollStep = -3; wheel.HoldMs = 30;
        MacroStep key = ClickOn(t); key.ActionType = MacroActionType.KeyPress; key.KeyData = "a"; key.HoldMs = 10;
        MacroStep text = ClickOn(t); text.ActionType = MacroActionType.TypeText; text.KeyData = "Hi"; text.HoldMs = 10;
        MacroStep ctrlClick = ClickOn(t); ctrlClick.ActionType = MacroActionType.PressAndClick; ctrlClick.KeyData = "Ctrl"; ctrlClick.PressClickMode = 0; ctrlClick.PressClickOrder = 0; ctrlClick.HoldMs = 10;

        Point cursorBefore;
        GetCursorPos(out cursorBefore);
        MacroProfile p = new MacroProfile { Name = "Bg", LoopCount = 1, Steps = new List<MacroStep> { drag, wheel, key, text, ctrlClick } };
        MacroRunner r = new MacroRunner();
        r.Start(p, new List<MacroProfile> { p }, true);
        WaitFor(() => !r.IsRunning, 5000);
        Thread.Sleep(200);
        Point cursorAfter;
        GetCursorPos(out cursorAfter);

        Eq("background drag: one drag arrived", Clicks("t", ".drags"), 1);
        Eq("background wheel: 3 notches arrived", Clicks("t", ".wheel"), 3);
        Eq("background keys: key then text arrived", Logged("t", ".keys"), "aHi");
        Check("background Press & Click: the click carries Ctrl", Logged("t", ".clicks").Contains("xc"), Logged("t", ".clicks").Replace("\n", " "));
        Eq("background: the front window stays in front", GetForegroundWindow(), front.H);
        Eq("background: the real cursor did not move", cursorAfter, cursorBefore);
        CleanUp();
    }

    // A window that brings itself to the front when it gets a click (as Chrome does): the guard puts the user's window back
    static void FocusGuardPutsUserWindowBack()
    {
        Win grab = Open("grab", "Grab", 0, false, null, "grabby"), front = Open("front", "Front", 1);
        if (!PutInFront(front))
        {
            Console.WriteLine("SKIP focus guard: the front test window could not come to the front");
            CleanUp();
            return;
        }

        ClickConfig cfg = SimpleConfig(grab, true);
        cfg.TargetWindowTitle = "Grab";
        cfg.IntervalMs = 200;
        cfg.Loops = 6;
        ClickEngine engine = new ClickEngine();
        engine.Start(cfg);

        int samples = 0, grabInFront = 0, steals = 0;
        IntPtr last = front.H;
        Stopwatch sw = Stopwatch.StartNew();
        while ((engine.IsRunning || sw.ElapsedMilliseconds < 300) && sw.ElapsedMilliseconds < 5000)
        {
            IntPtr fg = GetForegroundWindow();
            samples++;
            if (fg == grab.H) { grabInFront++; if (last != grab.H) steals++; }
            last = fg;
            Thread.Sleep(5);
        }
        Thread.Sleep(400);

        Eq("focus guard: all clicks arrived", Clicks("grab"), 6);
        if (steals == 0) Console.WriteLine("SKIP focus guard: the test window never took the front, nothing to put back");
        else
        {
            Check("focus guard: the grabbing window was in front only briefly", grabInFront * 4 < samples, grabInFront + " of " + samples + " samples, " + steals + " steals");
            Eq("focus guard: the user's window is in front after the run", GetForegroundWindow(), front.H);
        }
        CleanUp();
    }

    // A run that started with the real mouse clicks in the background once another tab starts
    static void SwitchToFreeMouseWhileRunning()
    {
        Win t = Open("t", "Same", 0);
        MacroStep click = ClickOn(t);
        click.DelayMs = 30;
        MacroProfile p = new MacroProfile { Name = "Real", LoopCount = 0, Steps = new List<MacroStep> { click } };
        MacroRunner r = new MacroRunner();
        Point cursorBefore;
        GetCursorPos(out cursorBefore);
        // A real-mouse run here would move the cursor; switching right after Start keeps this case from touching the mouse
        r.Start(p, new List<MacroProfile> { p }, false);
        r.SwitchToFreeMouse();
        Thread.Sleep(500);
        r.Stop();
        Thread.Sleep(150);
        Point cursorAfter;
        GetCursorPos(out cursorAfter);
        Check("switch to free mouse: clicks arrive in the background", Clicks("t") > 0, "t=" + Clicks("t"));
        Eq("switch to free mouse: the real cursor did not move", cursorAfter, cursorBefore);
        CleanUp();
    }
}
