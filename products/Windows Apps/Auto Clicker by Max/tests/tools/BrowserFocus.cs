using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using ModernAutoClicker;

// Free Mouse clicks on one window of a real browser while another window of it is in front.
// The browser brings the clicked window to the front on every posted click; the focus guard must put the other one back.
// Uses a throwaway profile in <dir>\profile, so the user's own browser and tabs are not touched. Args: dir
class BrowserFocus
{
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool repaint);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);

    static IntPtr FindTop(string titlePrefix)
    {
        IntPtr found = IntPtr.Zero;
        EnumWindows((h, l) =>
        {
            StringBuilder s = new StringBuilder(256);
            GetWindowText(h, s, 256);
            if (IsWindowVisible(h) && s.ToString().StartsWith(titlePrefix)) { found = h; return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    static void Open(string browser, string profile, string title)
    {
        string page = "data:text/html,<title>" + title + "</title><body style='background:%23ddd'>" + title + "</body>";
        Process.Start(browser, string.Format("--user-data-dir=\"{0}\" --no-first-run --no-default-browser-check --new-window \"{1}\"", profile, page));
    }

    static void Main(string[] a)
    {
        string dir = a[0];
        string[] browsers =
        {
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            Environment.ExpandEnvironmentVariables(@"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
        };
        string browser = Array.Find(browsers, File.Exists);
        if (browser == null) { Console.WriteLine("SKIP no Chrome or Edge found"); return; }
        string profile = Path.Combine(dir, "profile");
        Directory.CreateDirectory(profile);

        Open(browser, profile, "FOCUSPROBE1");
        Thread.Sleep(4000);
        Open(browser, profile, "FOCUSPROBE2");
        Thread.Sleep(3000);
        IntPtr w1 = FindTop("FOCUSPROBE1"), w2 = FindTop("FOCUSPROBE2");
        try
        {
            if (w1 == IntPtr.Zero || w2 == IntPtr.Zero) { Console.WriteLine("FAIL the browser windows did not open"); return; }
            MoveWindow(w1, 0, 0, 500, 400, true);
            MoveWindow(w2, 520, 0, 500, 400, true);
            for (int k = 0; k < 5 && GetForegroundWindow() != w2; k++) { NativeMethods.ForceSetForegroundWindow(w2); Thread.Sleep(200); }
            if (GetForegroundWindow() != w2) { Console.WriteLine("SKIP window 2 could not come to the front"); return; }

            uint pid;
            NativeMethods.GetWindowThreadProcessId(w1, out pid);
            StringBuilder t = new StringBuilder(256);
            GetWindowText(w1, t, 256);
            ClickEngine engine = new ClickEngine();
            engine.Start(new ClickConfig
            {
                IntervalMs = 300, Loops = 8, FreeMouseMode = true, RelativeToWindow = true, ClickMode = 0,
                TargetHwnd = w1, TargetPid = pid, TargetProcessName = Path.GetFileNameWithoutExtension(browser), TargetWindowTitle = t.ToString(),
                PointsList = new List<Point> { new Point(100, 100) }
            });

            int samples = 0, w1InFront = 0, steals = 0;
            IntPtr last = w2;
            Stopwatch sw = Stopwatch.StartNew();
            while ((engine.IsRunning || sw.ElapsedMilliseconds < 500) && sw.ElapsedMilliseconds < 8000)
            {
                IntPtr fg = GetForegroundWindow();
                samples++;
                if (fg == w1) { w1InFront++; if (last != w1) steals++; }
                last = fg;
                Thread.Sleep(5);
            }
            Thread.Sleep(500);

            Console.WriteLine(string.Format("{0}: {1} clicks, window 1 took the front {2} times, in front {3} of {4} samples", Path.GetFileName(browser), engine.TotalClicks, steals, w1InFront, samples));
            Console.WriteLine((GetForegroundWindow() == w2 ? "PASS" : "FAIL") + " window 2 is in front after the run");
            Console.WriteLine((w1InFront * 4 < samples ? "PASS" : "FAIL") + " window 1 was in front only briefly");
        }
        finally
        {
            if (w1 != IntPtr.Zero) PostMessage(w1, 0x0010 /* WM_CLOSE */, IntPtr.Zero, IntPtr.Zero);
            if (w2 != IntPtr.Zero) PostMessage(w2, 0x0010, IntPtr.Zero, IntPtr.Zero);
        }
    }
}
