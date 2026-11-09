using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Every jump of IfColor, IfColorArea and IfImage, found and not found. The output is compared between the old and the new build.
class JumpTest
{
    static string tgDir;
    static Process target;

    static MacroStep Rel(MacroActionType type)
    {
        return new MacroStep { ActionType = type, RelativeToWindow = true, WindowHwnd = target.MainWindowHandle, TargetPid = (uint)target.Id, ProcessName = "WinTarget", WindowTitle = "Jump target", StartPoint = new Point(20, 20), HoldMs = 1, DelayMs = 10 };
    }

    static int Clicks()
    {
        string file = Path.Combine(tgDir, "jump.clicks");
        for (int attempt = 0; attempt < 50; attempt++)
        {
            try { return File.Exists(file) ? File.ReadAllLines(file).Length : 0; }
            catch (IOException) { Thread.Sleep(5); }
        }
        throw new IOException(file);
    }

    static void Run(string kind, bool found, int jump)
    {
        File.Delete(Path.Combine(tgDir, "jump.clicks"));

        MacroStep check;
        if (kind == "color")
        {
            check = Rel(MacroActionType.IfColor);
            check.Tolerance = found ? 255 : 1;
            check.TargetColor = Color.Magenta;
        }
        else if (kind == "area")
        {
            check = Rel(MacroActionType.IfColorArea);
            check.EndPoint = new Point(60, 40);
            check.Tolerance = found ? 255 : 1;
            check.TargetColor = Color.Magenta;
        }
        else
        {
            check = Rel(MacroActionType.IfImage);
            check.EndPoint = new Point(100, 60);
            check.Similarity = 90;
            check.TimeoutSec = 1;
            using (Bitmap template = new Bitmap(16, 16))
            {
                using (Graphics g = Graphics.FromImage(template)) g.Clear(found ? SystemColors.Control : Color.Magenta);
                check.SetTemplateBitmap(template);
            }
        }
        check.IfTrueStep = found ? jump : 0;
        check.IfFalseStep = found ? 0 : jump;

        MacroProfile prof = new MacroProfile { Name = "J", LoopCount = 1, SpeedPercent = 100, Steps = new List<MacroStep> { check, Rel(MacroActionType.LeftClick), Rel(MacroActionType.LeftClick) } };
        MacroRunner runner = new MacroRunner();
        runner.Start(prof, new List<MacroProfile> { prof }, true);
        Thread.Sleep(700);
        bool running = runner.IsRunning;
        runner.Stop();
        Thread.Sleep(100);
        Console.WriteLine(string.Format("{0} found={1} jump={2}: clicks={3} stillRunning={4} cycles={5}", kind, found, jump, Clicks(), running, runner.TotalCyclesCompleted));
    }

    [STAThread]
    static void Main(string[] a)
    {
        tgDir = a[0];
        int y = Screen.PrimaryScreen.Bounds.Height - 190;
        target = Process.Start(new ProcessStartInfo(Path.Combine(tgDir, "WinTarget.exe"), string.Format("\"{0}\" \"jump\" \"Jump target\" 5 {1} topmost", tgDir, y)) { UseShellExecute = false });
        for (int i = 0; i < 100 && target.MainWindowHandle == IntPtr.Zero; i++) { Thread.Sleep(50); target.Refresh(); }
        Thread.Sleep(300);
        try
        {
            foreach (string kind in new[] { "color", "area", "image" })
            {
                foreach (bool found in new[] { true, false })
                {
                    foreach (int jump in new[] { 0, -1, -2, -3, 3, 99 })
                    {
                        Run(kind, found, jump);
                    }
                }
            }
        }
        finally
        {
            if (!target.HasExited) target.Kill();
        }
    }
}
