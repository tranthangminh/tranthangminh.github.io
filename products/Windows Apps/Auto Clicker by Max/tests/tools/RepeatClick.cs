using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using ModernAutoClicker;

// The case that once gave 2 clicks instead of 3: real mouse, 100 ms, 3 loops, on a topmost test window. Repeated many times.
class RepeatClick
{
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(Point p);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out Point p);
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr h, ref Point p);

    static string dir;

    static int Clicks()
    {
        string file = Path.Combine(dir, "rep.clicks");
        for (int i = 0; i < 50; i++)
        {
            try { return File.Exists(file) ? File.ReadAllLines(file).Length : 0; }
            catch (IOException) { Thread.Sleep(5); }
        }
        return -1;
    }

    [STAThread]
    static int Main(string[] a)
    {
        dir = a[0];
        int rounds = int.Parse(a[1]);
        int y = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Height - 190;
        Process target = Process.Start(new ProcessStartInfo(Path.Combine(dir, "WinTarget.exe"), string.Format("\"{0}\" \"rep\" \"Repeat target\" 5 {1} topmost", dir, y)) { UseShellExecute = false });
        for (int i = 0; i < 100 && target.MainWindowHandle == IntPtr.Zero; i++) { Thread.Sleep(50); target.Refresh(); }
        Thread.Sleep(400);
        IntPtr h = target.MainWindowHandle;
        Point screen = new Point(20, 20);
        ClientToScreen(h, ref screen);
        if (WindowFromPoint(screen) != h) { Console.WriteLine("SKIP window not on top"); target.Kill(); return 2; }

        Point before;
        GetCursorPos(out before);
        int wrong = 0, moved = 0;
        for (int r = 1; r <= rounds; r++)
        {
            File.Delete(Path.Combine(dir, "rep.clicks"));
            ClickEngine engine = new ClickEngine();
            engine.Start(new ClickConfig
            {
                IntervalMs = 100, Loops = 3, FreeMouseMode = false, RelativeToWindow = true,
                TargetHwnd = h, TargetPid = (uint)target.Id, TargetProcessName = "WinTarget", TargetWindowTitle = "Repeat target",
                ClickMode = 0, PointsList = new List<Point> { new Point(20, 20) }
            });
            Stopwatch sw = Stopwatch.StartNew();
            while (engine.IsRunning && sw.ElapsedMilliseconds < 4000) Thread.Sleep(5);
            Point during;
            GetCursorPos(out during);
            if (during != screen) moved++;
            Thread.Sleep(250);
            int got = Clicks();
            long counted = engine.TotalClicks;
            if (got != 3 || counted != 3)
            {
                wrong++;
                Console.WriteLine(string.Format("WRONG round {0}: arrived={1} counted={2} cursor={3}", r, got, counted, during));
            }
        }
        SetCursorPos(before.X, before.Y);
        target.Kill();
        Console.WriteLine(string.Format("RESULT rounds={0} wrong={1} cursorMovedDuringRun={2}", rounds, wrong, moved));
        return wrong == 0 ? 0 : 1;
    }
}
