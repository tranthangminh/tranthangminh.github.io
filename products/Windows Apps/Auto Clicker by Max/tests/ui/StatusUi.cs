using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// The real MainForm: the Click Settings card without its two counters, and the status line keeping the last run's numbers.
// Simple clicks go to a WinTarget window only. Args: outDir tgDir
class StatusUi
{
    static BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
    static string outDir, tgDir;
    static StringBuilder log = new StringBuilder();
    static int pass, fail;
    static Form f;
    static Process target;
    static MethodInfo setLang;

    static void Check(string name, bool ok, string detail = "")
    {
        if (ok) pass++; else fail++;
        log.AppendLine((ok ? "PASS " : "FAIL ") + name + (detail.Length > 0 ? " :: " + detail : ""));
    }

    static object GetF(object o, string name)
    {
        for (Type t = o.GetType(); t != null; t = t.BaseType)
        {
            FieldInfo fi = t.GetField(name, bf | BindingFlags.DeclaredOnly);
            if (fi != null) return fi.GetValue(o);
            PropertyInfo pi = t.GetProperty(name, bf | BindingFlags.DeclaredOnly);
            if (pi != null) return pi.GetValue(o, null);
        }
        throw new MissingFieldException(o.GetType().Name, name);
    }

    static void SetF(object o, string name, object value)
    {
        for (Type t = o.GetType(); t != null; t = t.BaseType)
        {
            FieldInfo fi = t.GetField(name, bf | BindingFlags.DeclaredOnly);
            if (fi != null) { fi.SetValue(o, value); return; }
            PropertyInfo pi = t.GetProperty(name, bf | BindingFlags.DeclaredOnly);
            if (pi != null) { pi.SetValue(o, value, null); return; }
        }
        throw new MissingFieldException(o.GetType().Name, name);
    }

    static object Call(object o, string name, params object[] a)
    {
        for (Type t = o.GetType(); t != null; t = t.BaseType)
        {
            MethodInfo mi = t.GetMethod(name, bf | BindingFlags.DeclaredOnly);
            if (mi != null) return mi.Invoke(o, a);
        }
        throw new MissingMethodException(o.GetType().Name, name);
    }

    static string Status() { return ((Label)GetF(f, "lblMainStatusInfo")).Text; }
    static bool ActiveRunning() { return (bool)GetF(f, "IsActiveTabRunning"); }

    static void CollectTexts(Control c, List<string> into)
    {
        foreach (Control child in c.Controls)
        {
            if (!string.IsNullOrEmpty(child.Text)) into.Add(child.Text);
            CollectTexts(child, into);
        }
    }

    static void Capture(string name)
    {
        f.Refresh();
        Application.DoEvents();
        Rectangle r = f.Bounds;
        using (Bitmap bmp = new Bitmap(r.Width, r.Height))
        {
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            bmp.Save(Path.Combine(outDir, name), ImageFormat.Png);
        }
    }

    static void SetUpSimpleRun(int loops)
    {
        SetF(f, "_simpleRelativeToWindow", true);
        SetF(f, "_simpleTargetProcessName", "WinTarget");
        SetF(f, "_simpleTargetWindowTitle", "Status target");
        SetF(f, "_simpleTargetWindowIndex", 0);
        SetF(f, "_simpleTargetHwnd", target.MainWindowHandle);
        SetF(f, "_simpleTargetPid", (uint)target.Id);
        Call(f, "UpdateSimpleTargetWindowButtonDisplay");
        Call(GetF(f, "lstPoints"), "SetPoints", new List<Point> { new Point(20, 20) });
        Call(f, "UpdatePointsHeader");
        SetF(GetF(f, "numInterval"), "ValueMs", 40);
        SetF(GetF(f, "numSimpleLoop"), "Value", loops);
        Call(f, "UpdateStartButtonState");
    }

    static List<Func<bool>> steps = new List<Func<bool>>();
    static void Do(Action a) { steps.Add(() => { a(); return true; }); }
    static void WaitUntil(string what, Func<bool> cond)
    {
        int tries = 0;
        steps.Add(() =>
        {
            if (cond()) return true;
            if (++tries > 40) { Check("timed out waiting: " + what, false, Status()); return true; }
            return false;
        });
    }
    static void Pause(int ticks) { for (int i = 0; i < ticks; i++) Do(() => { }); }

    [STAThread]
    static void Main(string[] args)
    {
        outDir = args[0];
        tgDir = args[1];
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        Assembly asm = typeof(ClickEngine).Assembly;
        Type appInfo = asm.GetType("ModernAutoClicker.AppInfo");
        appInfo.GetProperty("AppName").SetValue(null, "Auto Clicker by Max", null);
        appInfo.GetProperty("Version").SetValue(null, "9.9.9", null);
        setLang = asm.GetType("MaxApp.Common.Loc").GetMethod("SetLanguage");
        setLang.Invoke(null, new object[] { "en" });
        Application.ThreadException += (s, e) => Check("UNHANDLED in the app", false, e.Exception.ToString());

        int y = Screen.PrimaryScreen.Bounds.Height - 190;
        target = Process.Start(new ProcessStartInfo(Path.Combine(tgDir, "WinTarget.exe"), string.Format("\"{0}\" \"status\" \"Status target\" 5 {1} topmost", tgDir, y)) { UseShellExecute = false });
        for (int i = 0; i < 100 && target.MainWindowHandle == IntPtr.Zero; i++) { System.Threading.Thread.Sleep(50); target.Refresh(); }
        File.Delete(Path.Combine(tgDir, "status.clicks"));

        f = (Form)Activator.CreateInstance(asm.GetType("ModernAutoClicker.MainForm"));
        string firstStats = null;

        // ----- Target card: list and Follow Cursor card stay inside, same margin on every side -----
        Do(() =>
        {
            Call(f, "SwitchTab", 1);
            Call(f, "SwitchSimpleTab", 0);
            Control card = (Control)GetF(f, "pnlList");
            Control lst = (Control)GetF(f, "lstPoints");
            Control inner = (Control)GetF(lst, "pnlScrollContainer");
            Control bar = (Control)GetF(lst, "scrollBar");
            Call(lst, "SetPoints", new List<Point> { new Point(1, 1), new Point(2, 2) });
            Check("list ends 8px above the card bottom", card.Height - lst.Bottom == 8, "card " + card.Height + " list bottom " + lst.Bottom);
            Check("list has the same margin left and right", lst.Left == card.Width - lst.Right, lst.Left + " / " + (card.Width - lst.Right));
            Check("short list: rows use the full width", inner.Width == lst.Width && !bar.Visible, inner.Width + " of " + lst.Width + ", bar " + bar.Visible);
            List<Point> many = new List<Point>();
            for (int i = 0; i < 20; i++) many.Add(new Point(i, i));
            Call(lst, "SetPoints", many);
            Check("long list: scroll bar inside the list", bar.Visible && inner.Width == lst.Width - bar.Width && bar.Right == lst.Width, "inner " + inner.Width + " bar " + bar.Bounds + " list " + lst.Width);
            Call(lst, "SetPoints", new List<Point>());

            Control guide = (Control)GetF(f, "cardCursorGuide");
            Check("Follow Cursor card ends 8px above the card bottom", card.Height - guide.Bottom == 8 && guide.Left == card.Width - guide.Right, guide.Bounds + " in " + card.Size);
            foreach (string lang in new[] { "en", "vi" })
            {
                setLang.Invoke(null, new object[] { lang });
                Call(guide, "ApplyLanguage");
                int bottom = 0;
                foreach (Control c in guide.Controls) bottom = Math.Max(bottom, c.Bottom);
                Check("Follow Cursor text fits the card (" + lang + ")", bottom <= guide.Height - 6, "content ends at " + bottom + " of " + guide.Height);
            }
            ((RadioButton)GetF(f, "radModeCursor")).Checked = true;
            Capture("simple_cursor_vi.png");
            ((RadioButton)GetF(f, "radModePoints")).Checked = true;
            setLang.Invoke(null, new object[] { "en" });
            Call(guide, "ApplyLanguage");
        });

        // ----- Click Settings card -----
        Do(() =>
        {
            Call(f, "SwitchTab", 1);
            Call(f, "SwitchSimpleTab", 0);
            Control time = (Control)GetF(f, "pnlTime");
            Control list = (Control)GetF(f, "pnlList");
            List<string> texts = new List<string>();
            CollectTexts(time, texts);
            string all = string.Join(" | ", texts.ToArray());
            Check("card has no Current rows", all.IndexOf("Current", StringComparison.Ordinal) < 0 && all.IndexOf("Clicks", StringComparison.Ordinal) < 0 && all.IndexOf("00:00:00", StringComparison.Ordinal) < 0, all);
            Check("card holds 9 controls", time.Controls.Count == 10, time.Controls.Count + " (header + 9)");
            Check("cards end on the same line", time.Bottom == list.Bottom, "time " + time.Bounds + " list " + list.Bounds);
            Check("Click Settings card 128 high", time.Height == 128, time.Height.ToString());
            Check("content host 288 high", ((Control)GetF(f, "pnlContentHost")).Height == 288, ((Control)GetF(f, "pnlContentHost")).Height.ToString());
            Check("tab never run shows Ready", Status().StartsWith("Ready |"), Status());
            log.AppendLine("INFO simple window " + f.Width + "x" + f.Height);
            Capture("simple_before.png");
        });

        // ----- Simple run to its loop limit -----
        Do(() => { SetUpSimpleRun(3); Call(f, "StartAutoClick"); });
        WaitUntil("simple run ends", () => !ActiveRunning());
        Pause(2);
        Do(() =>
        {
            firstStats = Status();
            Check("after the run: last numbers kept", firstStats.StartsWith("Clicks: 3 | Time: 00:00:0") && firstStats.EndsWith("Loops: 3/3"), firstStats);
            Check("after the run: 3 clicks arrived", File.Exists(Path.Combine(tgDir, "status.clicks")) && File.ReadAllLines(Path.Combine(tgDir, "status.clicks")).Length == 3);
        });
        Pause(5);
        Do(() => Check("time no longer counts after the run", Status() == firstStats, Status()));
        Do(() =>
        {
            SetF(GetF(f, "numInterval"), "ValueMs", 60);
            Call(f, "UpdateTabStatus", true);
            Check("editing settings keeps the numbers", Status() == firstStats, Status());
            Capture("simple_after.png");
        });
        Do(() => { Call(f, "SwitchSimpleTab", 1); Check("another Simple tab that never ran shows Ready", Status().StartsWith("Ready |"), Status()); });
        Do(() => { Call(f, "SwitchSimpleTab", 0); Check("back on the tab: its numbers again", Status() == firstStats, Status()); });
        Do(() => { Call(f, "SwitchTab", 0); Check("Info tab shows its own line", Status() == "Auto Clicker by Max • Information", Status()); });
        Do(() => { Call(f, "SwitchTab", 1); Check("back from Info: numbers again", Status() == firstStats, Status()); });

        // ----- Running again starts from zero -----
        Do(() => { SetF(GetF(f, "numInterval"), "ValueMs", 40); SetF(GetF(f, "numSimpleLoop"), "Value", 2); Call(f, "StartAutoClick"); });
        WaitUntil("second run ends", () => !ActiveRunning());
        Pause(2);
        Do(() => Check("second run: new numbers", Status().StartsWith("Clicks: 2 |") && Status().EndsWith("Loops: 2/2"), Status()));

        // ----- Stopped by hand -----
        Do(() => { SetF(GetF(f, "numSimpleLoop"), "Value", 0); Call(f, "StartAutoClick"); });
        Pause(3);
        Do(() => Call(f, "StopAll"));
        Pause(2);
        string stopped = null;
        Do(() =>
        {
            stopped = Status();
            Check("stopped by hand: numbers kept", stopped.StartsWith("Clicks: ") && stopped.EndsWith("Loops: " + stopped.Substring(stopped.LastIndexOf(' ') + 1)) && !ActiveRunning(), stopped);
        });
        Pause(4);
        Do(() => Check("stopped by hand: time frozen", Status() == stopped, Status()));

        // ----- Language -----
        Do(() =>
        {
            setLang.Invoke(null, new object[] { "vi" });
            Call(f, "UpdateTabStatus", true);
            Check("Vietnamese numbers", Status().StartsWith("Click: ") && Status().Contains("Thời gian:") && Status().Contains("Vòng lặp:"), Status());
            Call(f, "SwitchSimpleTab", 2);
            Check("Vietnamese Ready line", Status().StartsWith("Sẵn sàng |"), Status());
            setLang.Invoke(null, new object[] { "en" });
            Call(f, "SwitchSimpleTab", 0);
        });

        // ----- Asian -----
        Do(() =>
        {
            Call(f, "SwitchTab", 2);
            object panel = GetF(f, "pnlTabAdvanced");
            MacroProfile p = new MacroProfile { Name = "StatusScript", LoopCount = 2, SpeedPercent = 100, Steps = new List<MacroStep> { new MacroStep { ActionType = MacroActionType.Delay, HoldMs = 1, DelayMs = 30, Enabled = true } } };
            Call(panel, "SetAllProfiles", new List<MacroProfile> { p }, 0);
            Check("Asian script never run: no numbers", !Status().StartsWith("Steps:"), Status());
            Call(f, "StartAutoClick");
        });
        WaitUntil("asian run ends", () => !ActiveRunning());
        Pause(2);
        string asian = null;
        Do(() => { asian = Status(); Check("Asian: last numbers kept", asian.StartsWith("Steps: 2 | Time: 00:00:0") && asian.EndsWith("Loops: 2/2"), asian); });
        Pause(4);
        Do(() =>
        {
            Check("Asian: time frozen", Status() == asian, Status());
            Call(GetF(f, "pnlTabAdvanced"), "UpdateStatus", (object)null);
            Check("Asian: panel status update keeps the numbers", Status() == asian, Status());
        });

        int index = 0;
        Timer t = new Timer { Interval = 300 };
        bool busy = false;
        t.Tick += (s, e) =>
        {
            if (busy) return;
            busy = true;
            try
            {
                if (index >= steps.Count) { t.Stop(); f.Close(); return; }
                if (steps[index]()) index++;
            }
            catch (Exception ex)
            {
                Check("EXCEPTION at step " + index, false, (ex.InnerException ?? ex).ToString());
                t.Stop();
                f.BeginInvoke((Action)(() => f.Close()));
            }
            finally { busy = false; }
        };
        f.Shown += (s, e) => { f.Location = new Point(10, 10); f.TopMost = true; t.Start(); };
        f.FormClosed += (s, e) =>
        {
            try { if (!target.HasExited) target.Kill(); } catch (Exception) { }
            log.AppendLine(string.Format("RESULT {0} passed, {1} failed", pass, fail));
            File.WriteAllText(Path.Combine(outDir, "status_ui.txt"), log.ToString(), Encoding.UTF8);
        };
        Application.Run(f);
    }
}
