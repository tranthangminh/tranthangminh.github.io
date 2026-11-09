using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Drives the real MainForm against real windows (WinTarget.exe): Start checks, stops while running, the popup and changing the target.
// Every click goes to a WinTarget window. Args: outDir mode (full | reopen)
class TargetUi
{
    const string Proc = "WinTarget";
    const int SW_MINIMIZE = 6, SW_RESTORE = 9;
    static BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;

    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumThreadWindows(uint thread, EnumProc cb, IntPtr l);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();

    class Win { public Process P; public IntPtr H; public uint Pid; public string Label; public string Title; }

    static string outDir, tgDir;
    static StringBuilder log = new StringBuilder();
    static int pass, fail;
    static Form f;
    static List<Win> open = new List<Win>();
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

    static Win Open(string label, string title, int slot)
    {
        int x = 5 + slot * 250, y = Screen.PrimaryScreen.Bounds.Height - 190;
        string args = string.Format("\"{0}\" \"{1}\" \"{2}\" {3} {4} normal", tgDir, label, title, x, y);
        Process p = Process.Start(new ProcessStartInfo(Path.Combine(tgDir, "WinTarget.exe"), args) { UseShellExecute = false });
        Stopwatch sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < 5000)
        {
            p.Refresh();
            if (p.MainWindowHandle != IntPtr.Zero) break;
            System.Threading.Thread.Sleep(20);
        }
        System.Threading.Thread.Sleep(200);
        Win w = new Win { P = p, H = p.MainWindowHandle, Pid = (uint)p.Id, Label = label, Title = title };
        open.Add(w);
        return w;
    }

    static void Kill(Win w)
    {
        if (!w.P.HasExited) { w.P.Kill(); w.P.WaitForExit(3000); }
    }

    static int Clicks(string label)
    {
        string file = Path.Combine(tgDir, label + ".clicks");
        for (int attempt = 0; attempt < 50; attempt++)
        {
            try { return File.Exists(file) ? File.ReadAllLines(file).Length : 0; }
            catch (IOException) { System.Threading.Thread.Sleep(5); }
        }
        throw new IOException("Cannot read " + file);
    }

    static Form Dlg()
    {
        foreach (Form x in Application.OpenForms)
        {
            if (x.GetType().Name == "TargetProblemDialog") return x;
        }
        return null;
    }

    static void CollectTexts(Control c, List<string> into)
    {
        foreach (Control child in c.Controls)
        {
            if (!string.IsNullOrEmpty(child.Text)) into.Add(child.Text);
            CollectTexts(child, into);
        }
    }

    static string DlgText()
    {
        List<string> texts = new List<string>();
        CollectTexts(Dlg(), texts);
        return string.Join(" | ", texts.ToArray());
    }

    static void CollectButtons(Control c, List<Button> into)
    {
        foreach (Control child in c.Controls)
        {
            Button b = child as Button;
            if (b != null && !string.IsNullOrEmpty(b.Text)) into.Add(b);
            CollectButtons(child, into);
        }
    }

    static List<Button> DlgButtons()
    {
        List<Button> buttons = new List<Button>();
        CollectButtons(Dlg(), buttons);
        return buttons;
    }

    static void PressDlg(string text)
    {
        foreach (Button b in DlgButtons())
        {
            if (b.Text == text) { b.PerformClick(); return; }
        }
        throw new Exception("No button '" + text + "' in: " + DlgText());
    }

    static IDictionary Choices()
    {
        return (IDictionary)GetF(Dlg(), "_choices");
    }

    static List<TargetProblem> ChoiceKeys()
    {
        List<TargetProblem> keys = new List<TargetProblem>();
        foreach (object k in Choices().Keys) keys.Add((TargetProblem)k);
        return keys;
    }

    static string ChoiceSummary()
    {
        StringBuilder sb = new StringBuilder();
        foreach (DictionaryEntry e in Choices())
        {
            NativeMethods.WindowTargetInfo w = ((TargetChoice)e.Value).Window;
            sb.Append(w == null ? "AllScreens" : w.ProcessName + "#" + w.ProcessId).Append(';');
        }
        return sb.ToString();
    }

    static void Capture(Form form, string name)
    {
        form.Refresh();
        Application.DoEvents();
        Rectangle r = form.Bounds;
        r.Intersect(Screen.FromControl(form).Bounds);
        using (Bitmap bmp = new Bitmap(r.Width, r.Height))
        {
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            bmp.Save(Path.Combine(outDir, name), ImageFormat.Png);
        }
    }

    static string Status() { return ((Label)GetF(f, "lblMainStatusInfo")).Text; }
    static bool RowVisible() { return (bool)GetF(f, "_runningRowShown"); }
    static bool ActiveRunning() { return (bool)GetF(f, "IsActiveTabRunning"); }
    static bool AnyRunning() { return (bool)GetF(f, "IsAnyRunning"); }

    static void SetSimpleTarget(Win w)
    {
        SetF(f, "_simpleRelativeToWindow", true);
        SetF(f, "_simpleTargetProcessName", Proc);
        SetF(f, "_simpleTargetWindowTitle", w.Title);
        SetF(f, "_simpleTargetWindowIndex", 0);
        SetF(f, "_simpleTargetHwnd", w.H);
        SetF(f, "_simpleTargetPid", w.Pid);
        Call(f, "UpdateSimpleTargetWindowButtonDisplay");
    }

    static void SetSimplePoints()
    {
        object list = GetF(f, "lstPoints");
        Call(list, "SetPoints", new List<Point> { new Point(20, 20) });
        Call(f, "UpdatePointsHeader");
        Call(f, "UpdateStartButtonState");
    }

    // Through a posted call: the popup is modal and must not run inside the timer tick that drives this test
    static void PostStart()
    {
        f.BeginInvoke((Action)(() => Call(f, "StartAutoClick")));
    }

    static MacroStep ClickOn(Win w)
    {
        return new MacroStep
        {
            ActionType = MacroActionType.LeftClick,
            RelativeToWindow = true,
            WindowHwnd = w.H,
            TargetPid = w.Pid,
            ProcessName = Proc,
            WindowTitle = w.Title,
            StartPoint = new Point(20, 20),
            HoldMs = 1,
            DelayMs = 20
        };
    }

    static List<Func<bool>> steps = new List<Func<bool>>();
    static void Do(Action a) { steps.Add(() => { a(); return true; }); }
    static void WaitUntil(string what, Func<bool> cond)
    {
        int tries = 0;
        steps.Add(() =>
        {
            if (cond()) return true;
            if (++tries > 30) { Check("timed out waiting: " + what, false, Dlg() != null ? DlgText() : Status()); return true; }
            return false;
        });
    }
    static void Pause(int ticks)
    {
        for (int i = 0; i < ticks; i++) Do(() => { });
    }

    [STAThread]
    static void Main(string[] args)
    {
        outDir = args[0];
        tgDir = args[1];
        string mode = args[2];
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        Assembly asm = typeof(ClickEngine).Assembly;
        Type appInfo = asm.GetType("ModernAutoClicker.AppInfo");
        appInfo.GetProperty("AppName").SetValue(null, "Auto Clicker by Max", null);
        appInfo.GetProperty("Version").SetValue(null, "9.9.9", null);
        setLang = asm.GetType("MaxApp.Common.Loc").GetMethod("SetLanguage");
        setLang.Invoke(null, new object[] { "en" });

        Application.ThreadException += (s, e) => Check("UNHANDLED in the app", false, e.Exception.ToString());

        f = (Form)Activator.CreateInstance(asm.GetType("ModernAutoClicker.MainForm"));
        if (mode == "reopen") BuildReopen(); else BuildFull();

        int index = 0;
        Timer t = new Timer { Interval = 300 };
        bool busy = false;
        t.Tick += (s, e) =>
        {
            if (busy) return;
            busy = true;
            try
            {
                if (index >= steps.Count)
                {
                    t.Stop();
                    f.Close();
                    return;
                }
                if (steps[index]()) index++;
            }
            catch (Exception ex)
            {
                Check("EXCEPTION at step " + index, false, (ex.InnerException ?? ex).ToString());
                t.Stop();
                Form d = Dlg();
                if (d != null) d.Close();
                f.BeginInvoke((Action)(() => f.Close()));
            }
            finally { busy = false; }
        };
        f.Shown += (s, e) => { f.Location = new Point(10, 10); f.TopMost = true; t.Start(); };
        f.FormClosed += (s, e) =>
        {
            foreach (Win w in open) { try { if (!w.P.HasExited) w.P.Kill(); } catch { } }
            log.AppendLine(string.Format("RESULT {0} passed, {1} failed", pass, fail));
            File.WriteAllText(Path.Combine(outDir, "target_" + mode + ".txt"), log.ToString(), Encoding.UTF8);
        };
        Application.Run(f);
    }

    static void BuildFull()
    {
        Win a1 = null, a2 = null, a3 = null, a4 = null, b1 = null, b2 = null;
        uint a1Pid = 0;

        // ----- Simple: closed while running -----
        Do(() =>
        {
            foreach (string file in Directory.GetFiles(tgDir, "*.clicks")) File.Delete(file);
            Call(f, "SwitchTab", 1);
            Call(f, "SwitchSimpleTab", 0);
            ((RadioButton)GetF(f, "radModePoints")).Checked = true;
            ((CheckBox)GetF(f, "chkFreeMouse")).Checked = true;
            ((CheckBox)GetF(f, "chkShowMap")).Checked = false;
            a1 = Open("a1", "Notes A", 0);
            a2 = Open("a2", "Notes B", 1);
            a3 = Open("a3", "Notes C", 2);
            a1Pid = a1.Pid;
            SetSimplePoints();
            SetSimpleTarget(a1);
            PostStart();
        });
        WaitUntil("simple started", () => ActiveRunning() && Clicks("a1") > 0);
        Do(() =>
        {
            Check("simple running: stats line", Status().StartsWith("Clicks: "), Status());
            Check("simple running: only A1 clicked", Clicks("a2") == 0 && Clicks("a3") == 0, "a2=" + Clicks("a2") + " a3=" + Clicks("a3"));
            Kill(a1);
        });
        WaitUntil("closed popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO closed popup: " + text);
            Check("closed: stopped", !AnyRunning());
            Check("closed: title", text.Contains("Target window was closed"), text);
            Check("closed: shows PID", text.Contains("PID " + a1Pid), text);
            Check("closed: shows title", text.Contains("\"Notes A\""), text);
            Check("closed: says stopped", text.Contains("Simple #1 was stopped"), text);
            Check("closed: lists other PIDs", text.Contains("PID " + a2.Pid) && text.Contains("PID " + a3.Pid), text);
            Check("closed: offers a new target", text.Contains("New target:"), text);
            Check("closed: two buttons", DlgButtons().Count == 2, text);
            Check("closed: suggests the window opened first", ChoiceSummary().Contains("#" + a2.Pid), ChoiceSummary());
            Check("closed: running row gone", !RowVisible());
            Check("closed: title bar unlocked", !(bool)GetF(GetF(f, "titleBar"), "IsRunning"));
            Capture(Dlg(), "t1_closed_running_en.png");

            // F6 while the popup is open does nothing
            SetF(f, "_lastToggleTime", DateTime.MinValue);
            Call(f, "ToggleStartStop");
            Check("F6 with popup open: no second run", !AnyRunning());
        });
        Do(() =>
        {
            // The list is the normal one: All Screens plus every window, minimized ones included
            ShowWindow(a3.H, SW_MINIMIZE);
        });
        Pause(2);
        Do(() =>
        {
            TargetProblem problem = ChoiceKeys()[0];
            Control picker = null;
            foreach (Control c in ((Panel)GetF(Dlg(), "Body")).Controls) if (c.GetType().Name == "ModernDropdownButton") picker = c;
            Call(Dlg(), "ShowTargetMenu", problem, picker);
        });
        Pause(2);
        Do(() =>
        {
            uint thread = GetCurrentThreadId();
            ToolStripDropDown menu = null;
            EnumThreadWindows(thread, (h, l) =>
            {
                ToolStripDropDown dd = Control.FromHandle(h) as ToolStripDropDown;
                if (dd != null && dd.Visible) menu = dd;
                return true;
            }, IntPtr.Zero);
            Check("menu: opened", menu != null);
            if (menu == null) return;
            List<string> items = new List<string>();
            foreach (ToolStripItem i in menu.Items) items.Add(i.Text);
            string all = string.Join(" | ", items.ToArray());
            log.AppendLine("INFO menu: " + all);
            Check("menu: All Screens", all.Contains("All Screens"), all);
            Check("menu: open window", all.Contains("PID: " + a2.Pid), all);
            Check("menu: minimized window is offered too", all.Contains("PID: " + a3.Pid), all);
            Rectangle r = menu.Bounds;
            r.Intersect(Screen.PrimaryScreen.Bounds);
            using (Bitmap bmp = new Bitmap(r.Width, r.Height))
            {
                using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
                bmp.Save(Path.Combine(outDir, "t1b_menu.png"), ImageFormat.Png);
            }
            menu.Close();
        });
        Pause(1);
        Do(() =>
        {
            ShowWindow(a3.H, SW_RESTORE);
            PressDlg("Got it, keep the target");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            Check("keep target: PID unchanged", (uint)GetF(f, "_simpleTargetPid") == a1Pid);
            Check("keep target: title unchanged", (string)GetF(f, "_simpleTargetWindowTitle") == "Notes A");
            PostStart();
        });

        // ----- Simple: Start with the closed target, then Change Target -----
        WaitUntil("blocked start popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            Check("start blocked: nothing running", !AnyRunning());
            Check("start blocked: says not started", text.Contains("Simple #1 did not start"), text);
            Check("start blocked: A2 not clicked", Clicks("a2") == 0);
            Capture(Dlg(), "t2_closed_start_en.png");
            PressDlg("Change target");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            Check("change: PID is A2", (uint)GetF(f, "_simpleTargetPid") == a2.Pid);
            Check("change: title is A2", (string)GetF(f, "_simpleTargetWindowTitle") == "Notes B");
            Check("change: does not start by itself", !AnyRunning());
            Check("change: status says press Start", Status() == "Target changed. Press Start to run.", Status());
            Capture(f, "t3_after_change.png");
            PostStart();
        });
        WaitUntil("runs on A2", () => ActiveRunning() && Clicks("a2") > 0);
        Do(() =>
        {
            Check("runs on A2: A3 untouched", Clicks("a3") == 0);

            // ----- Simple: minimized while running -----
            ShowWindow(a2.H, SW_MINIMIZE);
        });
        WaitUntil("minimized popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO minimized popup: " + text);
            Check("minimized: stopped", !AnyRunning());
            Check("minimized: title", text.Contains("Target window is minimized"), text);
            Check("minimized: tells not to minimize", text.Contains("must not be minimized"), text);
            Check("minimized: shows PID", text.Contains("PID " + a2.Pid), text);
            Check("minimized: no target picker", !text.Contains("New target:"), text);
            Check("minimized: one button", DlgButtons().Count == 1, text);
            Check("minimized: window stays minimized", IsIconic(a2.H));
            Capture(Dlg(), "t4_minimized_running_en.png");
            PressDlg("Got it");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() => PostStart());
        WaitUntil("minimized start popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            Check("start while minimized: blocked", !AnyRunning() && text.Contains("did not start") && text.Contains("minimized"), text);
            Check("start while minimized: stays minimized", IsIconic(a2.H));
            PressDlg("Got it");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            ShowWindow(a2.H, SW_RESTORE);
        });
        Pause(2);
        Do(() =>
        {
            Check("target kept after minimize", (uint)GetF(f, "_simpleTargetPid") == a2.Pid);
            PostStart();
        });
        WaitUntil("runs again after restore", () => ActiveRunning());
        Pause(2);
        Do(() => Call(f, "StopAll"));
        Pause(1);

        // ----- Simple: a tab that is not on screen -----
        Do(() =>
        {
            SetSimpleTarget(a3);
            PostStart();
        });
        WaitUntil("tab 1 runs on A3", () => ActiveRunning() && Clicks("a3") > 0);
        Do(() =>
        {
            Call(f, "SwitchSimpleTab", 1);
            SetSimplePoints();
            SetF(f, "_simpleRelativeToWindow", false);
            SetF(f, "_simpleTargetProcessName", "");
            SetF(f, "_simpleTargetWindowTitle", "");
            SetF(f, "_simpleTargetHwnd", IntPtr.Zero);
            SetF(f, "_simpleTargetPid", (uint)0);
            Call(f, "UpdateSimpleTargetWindowButtonDisplay");
            Check("other tab open: tab 1 still runs", AnyRunning() && !ActiveRunning());
            Check("other tab open: Ready line", Status().StartsWith("Ready"), Status());
            a4 = Open("a4", "Notes D", 3);
            Kill(a3);
        });
        WaitUntil("background tab popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            Check("background tab: names the tab", text.Contains("Simple #1 was stopped"), text);
            Check("background tab: suggests opened first (A2)", ChoiceSummary().Contains("#" + a2.Pid), ChoiceSummary());
            TargetProblem problem = ChoiceKeys()[0];
            Control picker = null;
            foreach (Control c in ((Panel)GetF(Dlg(), "Body")).Controls) if (c.GetType().Name == "ModernDropdownButton") picker = c;
            NativeMethods.WindowTargetInfo a4Info = NativeMethods.GetOpenWindows().Find(w => w.ProcessId == a4.Pid);
            Call(Dlg(), "SetChoice", problem, picker, a4Info);
            PressDlg("Change target");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            Check("background tab: session arrays moved", ((uint[])GetF(f, "_simpleTargetPids"))[0] == a4.Pid);
            Check("background tab: open tab untouched", !(bool)GetF(f, "_simpleRelativeToWindow"));
            AppSettings config = AppSettings.Load();
            Check("background tab: saved title", config.GetProfile(0).SimpleTargetWindowTitle == "Notes D", config.GetProfile(0).SimpleTargetWindowTitle);
            Check("background tab: open tab settings untouched", string.IsNullOrEmpty(config.GetProfile(1).SimpleTargetProcessName));
            Call(f, "SwitchSimpleTab", 0);
        });
        Pause(1);
        Do(() =>
        {
            Check("back on tab 1: shows the new target", (string)GetF(f, "_simpleTargetWindowTitle") == "Notes D" && (uint)GetF(f, "_simpleTargetPid") == a4.Pid);
            PostStart();
        });
        WaitUntil("tab 1 runs on A4", () => ActiveRunning() && Clicks("a4") > 0);
        Do(() => Call(f, "StopAll"));
        Pause(1);

        // ----- Simple: pick All Screens in the popup -----
        Do(() =>
        {
            Kill(a4);
            PostStart();
        });
        WaitUntil("popup for All Screens", () => Dlg() != null);
        Do(() =>
        {
            TargetProblem problem = ChoiceKeys()[0];
            Control picker = null;
            foreach (Control c in ((Panel)GetF(Dlg(), "Body")).Controls) if (c.GetType().Name == "ModernDropdownButton") picker = c;
            Call(Dlg(), "SetChoice", problem, picker, null);
            Check("All Screens: shown in the picker", picker.Text.Contains("All Screens"), picker.Text);
            Capture(Dlg(), "t5_all_screens_choice.png");
            PressDlg("Change target");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            Check("All Screens: no window target", !(bool)GetF(f, "_simpleRelativeToWindow"));
            Check("All Screens: PID cleared", (uint)GetF(f, "_simpleTargetPid") == 0);

            // No check for All Screens: Start goes through without a popup (no points would be clicked: the list is emptied first)
            object list = GetF(f, "lstPoints");
            Call(list, "SetPoints", new List<Point>());
            Call(f, "UpdateStartButtonState");
            Check("All Screens: target check passes", (bool)Call(f, "CheckTargetsBeforeStart"));
            Check("All Screens: no popup", Dlg() == null);
        });

        // ----- Asian: blocked Start with two lost targets, one in a called script -----
        Do(() =>
        {
            Call(f, "SwitchTab", 2);
            object panel = GetF(f, "pnlTabAdvanced");
            object table = GetF(panel, "tableControl");
            Call(table, "ClearAll");
            b1 = Open("b1", "Bot 1", 0);
            b2 = Open("b2", "Bot 2", 1);
            MethodInfo add = table.GetType().GetMethod("AddStep");
            add.Invoke(table, new object[] { ClickOn(b1) });
            add.Invoke(table, new object[] { new MacroStep { ActionType = MacroActionType.Delay, HoldMs = 1, DelayMs = 20 } });
            add.Invoke(table, new object[] { ClickOn(b2) });
            add.Invoke(table, new object[] { new MacroStep { ActionType = MacroActionType.RunScript, KeyData = "SubT", RepeatCount = 1, DelayMs = 1 } });

            List<MacroProfile> all = (List<MacroProfile>)panel.GetType().GetMethod("GetAllProfiles").Invoke(panel, null);
            all.RemoveAll(p => p.Name == "SubT");
            all.Add(new MacroProfile { Name = "SubT", LoopCount = 1, Steps = new List<MacroStep> { ClickOn(b1) } });
            PostStart();
        });
        WaitUntil("asian runs", () => ActiveRunning() && Clicks("b1") > 0 && Clicks("b2") > 0);
        Do(() =>
        {
            Check("asian running: stats show steps", Status().StartsWith("Steps: "), Status());
            Capture(f, "t6_asian_running.png");
            Call(f, "StopAll");
        });
        Pause(1);
        Do(() =>
        {
            Kill(b1);
            Kill(b2);
            PostStart();
        });
        WaitUntil("asian two targets popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO asian popup: " + text);
            Check("asian blocked: nothing running", !AnyRunning());
            Check("asian blocked: first target and its steps", text.Contains("\"Bot 1\"") && text.Contains("1, SubT #1"), text);
            Check("asian blocked: second target and its step", text.Contains("\"Bot 2\"") && text.Contains("using this target: 3."), text);
            Capture(Dlg(), "t7_asian_two_targets_en.png");

            List<TargetProblem> keys = ChoiceKeys();
            Check("asian blocked: both have a suggestion", keys.Count == 2, ChoiceSummary());
            List<Control> pickers = new List<Control>();
            foreach (Control c in ((Panel)GetF(Dlg(), "Body")).Controls) if (c.GetType().Name == "ModernDropdownButton") pickers.Add(c);
            Check("asian blocked: one picker per target", pickers.Count == 2);
            TargetProblem secondProblem = keys.Find(p => p.WindowTitle == "Bot 2");
            Call(Dlg(), "SetChoice", secondProblem, pickers[1], null);
            PressDlg("Change target");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            object panel = GetF(f, "pnlTabAdvanced");
            List<MacroProfile> all = (List<MacroProfile>)panel.GetType().GetMethod("GetAllProfiles").Invoke(panel, null);
            MacroProfile main = all.Find(p => p.Steps != null && p.Steps.Count == 4);
            MacroProfile sub = all.Find(p => p.Name == "SubT");
            Check("asian change: step 1 moved to A2", main.Steps[0].TargetPid == a2.Pid && main.Steps[0].WindowTitle == "Notes B", main.Steps[0].WindowTitle);
            Check("asian change: called script moved too", sub.Steps[0].TargetPid == a2.Pid, sub.Steps[0].WindowTitle);
            Check("asian change: step 3 is All Screens", !main.Steps[2].RelativeToWindow && main.Steps[2].TargetPid == 0);
            Check("asian change: does not start", !AnyRunning());
            Check("asian change: status", Status() == "Target changed. Press Start to run.", Status());
            Capture(f, "t8_asian_after_change.png");

            // Remove the All Screens click: it would click real screen coordinates
            Call(GetF(panel, "tableControl"), "ClearAll");
            object table = GetF(panel, "tableControl");
            table.GetType().GetMethod("AddStep").Invoke(table, new object[] { new MacroStep { ActionType = MacroActionType.Delay, HoldMs = 1, DelayMs = 20 } });
            table.GetType().GetMethod("AddStep").Invoke(table, new object[] { ClickOn(a2) });
            setLang.Invoke(null, new object[] { "vi" });
            Call(f, "ApplyTheme", typeof(ClickEngine).Assembly.GetType("MaxApp.Common.ThemeTokens").GetMethod("LightTheme").Invoke(null, null));
            PostStart();
        });

        // ----- Asian while running: minimized and closed, Vietnamese and light theme -----
        WaitUntil("asian runs on A2", () => ActiveRunning());
        Pause(2);
        Do(() => ShowWindow(a2.H, SW_MINIMIZE));
        WaitUntil("asian minimized popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO asian minimized popup: " + text);
            Check("asian minimized: stopped", !AnyRunning());
            Check("asian minimized: Vietnamese", text.Contains("Cửa sổ target đang thu nhỏ") && text.Contains("Không được thu nhỏ app target"), text);
            Check("asian minimized: step number", text.Contains("đã dừng ở bước 2"), text);
            Check("asian minimized: no picker", !text.Contains("Target mới:"), text);
            Check("asian minimized: editing unlocked", !(bool)GetF(f, "_runningRowShown"));
            Capture(Dlg(), "t9_minimized_vi_light.png");
            PressDlg("Đã hiểu");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() => ShowWindow(a2.H, SW_RESTORE));
        Pause(2);
        Do(() => PostStart());
        WaitUntil("asian runs again", () => ActiveRunning());
        Pause(2);
        Do(() => Kill(a2));
        WaitUntil("asian closed popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO asian closed popup: " + text);
            Check("asian closed: Vietnamese", text.Contains("Cửa sổ target đã bị tắt"), text);
            Check("asian closed: buttons", DlgButtons().Count == 2, text);
            Capture(Dlg(), "t10_closed_vi_light.png");
            PressDlg("Đã hiểu, không đổi target");
        });
        WaitUntil("popup closed", () => Dlg() == null);

        // ----- Two tabs lose one window together: one popup. F7 with the popup open. -----
        Win c1 = null, c2 = null;
        Do(() =>
        {
            setLang.Invoke(null, new object[] { "en" });
            Call(f, "ApplyTheme", typeof(ClickEngine).Assembly.GetType("MaxApp.Common.ThemeTokens").GetMethod("DarkTheme").Invoke(null, null));
            Call(f, "SwitchTab", 1);
            Call(f, "SwitchSimpleTab", 0);
            c1 = Open("c1", "Shared", 0);
            c2 = Open("c2", "Other", 1);
            SetSimplePoints();
            SetSimpleTarget(c1);
            PostStart();
        });
        WaitUntil("tab 1 on C1", () => ActiveRunning());
        Do(() =>
        {
            Call(f, "SwitchSimpleTab", 1);
            SetSimplePoints();
            SetSimpleTarget(c1);
            PostStart();
        });
        WaitUntil("tab 2 on C1", () => ActiveRunning());
        Do(() =>
        {
            Call(f, "SwitchSimpleTab", 2);
            SetSimplePoints();
            SetSimpleTarget(c2);
            PostStart();
        });
        WaitUntil("tab 3 on C2", () => ActiveRunning());
        Do(() => Kill(c1));
        WaitUntil("shared popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO shared popup: " + text);
            Check("shared: one popup with both tabs", text.Contains("Simple #1 was stopped") && text.Contains("Simple #2 was stopped"), text);
            Check("shared: third tab keeps running", AnyRunning());
            Capture(Dlg(), "t11_shared_two_tabs.png");

            // F7 with the popup open
            Call(f, "StopAll");
            Check("F7 with popup open: everything stopped", !AnyRunning());
        });
        Pause(1);
        Do(() => PressDlg("Got it, keep the target"));
        WaitUntil("popup closed", () => Dlg() == null);

        // ----- Auto Clicker itself minimized when the target closes; Enter and Esc change nothing -----
        Win d1 = null, d2 = null;
        Do(() =>
        {
            Call(f, "SwitchSimpleTab", 0);
            d1 = Open("d1", "Key One", 0);
            d2 = Open("d2", "Key Two", 1);
            SetSimplePoints();
            SetSimpleTarget(d1);
            PostStart();
        });
        WaitUntil("runs on D1", () => ActiveRunning());
        Do(() =>
        {
            f.WindowState = FormWindowState.Minimized;
        });
        Pause(2);
        Do(() => Kill(d1));
        WaitUntil("popup while minimized", () => Dlg() != null);
        Do(() =>
        {
            Check("own window minimized: comes back for the popup", f.WindowState == FormWindowState.Normal, f.WindowState.ToString());
            Check("own window minimized: popup visible", Dlg().Visible);
            Check("Enter is the keep button", ((Button)GetF(Dlg(), "AcceptButton")).Text == "Got it, keep the target");
            Check("Esc is the keep button", ((Button)GetF(Dlg(), "CancelButton")).Text == "Got it, keep the target");
            Call(Dlg(), "ProcessDialogKey", Keys.Enter);
        });
        WaitUntil("Enter closed the popup", () => Dlg() == null);
        Do(() =>
        {
            Check("Enter: target unchanged", (string)GetF(f, "_simpleTargetWindowTitle") == "Key One");
            PostStart();
        });
        WaitUntil("popup again", () => Dlg() != null);
        Do(() => Call(Dlg(), "ProcessDialogKey", Keys.Escape));
        WaitUntil("Esc closed the popup", () => Dlg() == null);
        Do(() =>
        {
            Check("Esc: target unchanged", (string)GetF(f, "_simpleTargetWindowTitle") == "Key One");
            Check("Esc: D2 untouched", Clicks("d2") == 0);
        });

        Do(() =>
        {
            // Saved for the "reopen" run: this tab targets by name only after a restart
            Call(f, "SwitchSimpleTab", 0);
        });
        Pause(1);
        Do(() =>
        {
            SetF(f, "_simpleTargetWindowTitle", "Reopen Title");
            SetF(f, "_simpleTargetProcessName", Proc);
            SetF(f, "_simpleRelativeToWindow", true);
            SetF(f, "_simpleTargetPid", (uint)0);
            SetF(f, "_simpleTargetHwnd", IntPtr.Zero);
            SetF(f, "_simpleTargetWindowIndex", 0);
            ((CheckBox)GetF(f, "chkFreeMouse")).Checked = true;
            SetSimplePoints();
            Call(f, "SaveSettings");
        });
    }

    // Second process: Auto Clicker was reopened, so there is no session PID for the saved target
    static void BuildReopen()
    {
        Win r1 = null, r2 = null;

        Do(() =>
        {
            foreach (string file in Directory.GetFiles(tgDir, "*.clicks")) File.Delete(file);
            Call(f, "SwitchTab", 1);
            Call(f, "SwitchSimpleTab", 0);
            ((RadioButton)GetF(f, "radModePoints")).Checked = true;
            Check("reopen: saved target loaded without a PID", (string)GetF(f, "_simpleTargetWindowTitle") == "Reopen Title" && (uint)GetF(f, "_simpleTargetPid") == 0, (string)GetF(f, "_simpleTargetWindowTitle"));
            PostStart();
        });
        WaitUntil("reopen: app not open, popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            log.AppendLine("INFO reopen popup: " + text);
            Check("reopen, app not open: not found", text.Contains("Target window not found") && !text.Contains("(PID"), text);
            Check("reopen, app not open: offers a target", text.Contains("New target:"), text);
            Capture(Dlg(), "t12_reopen_not_found.png");
            PressDlg("Got it, keep the target");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() =>
        {
            r1 = Open("r1", "Reopen Title", 0);
            r2 = Open("r2", "Reopen Title", 1);
            ShowWindow(r1.H, SW_MINIMIZE);
        });
        Pause(5);
        Do(() => PostStart());
        WaitUntil("reopen: first opened minimized popup", () => Dlg() != null);
        Do(() =>
        {
            string text = DlgText();
            Check("reopen, first opened minimized: says minimized", text.Contains("Target window is minimized"), text);
            Check("reopen, first opened minimized: no run on the next one", !AnyRunning() && Clicks("r2") == 0);
            PressDlg("Got it");
        });
        WaitUntil("popup closed", () => Dlg() == null);
        Do(() => ShowWindow(r1.H, SW_RESTORE));
        Pause(5);
        Do(() => PostStart());
        WaitUntil("reopen: runs on the first opened", () => ActiveRunning() && Clicks("r1") > 0);
        Do(() =>
        {
            Check("reopen: locked to the first opened", (uint)GetF(f, "_simpleTargetPid") == r1.Pid);
            Check("reopen: second window untouched", Clicks("r2") == 0);
            Call(f, "StopAll");

            // The saved file never holds a PID or handle
            string configPath = null;
            foreach (string file in Directory.GetFiles(AppDomain.CurrentDomain.BaseDirectory, "_AutoClickerConfig.json", SearchOption.AllDirectories)) configPath = file;
            Call(f, "SaveSettings");
            string json = configPath != null ? File.ReadAllText(configPath) : "";
            Check("config written", json.Length > 0);
            Check("config holds no PID or handle", !json.Contains("TargetPid") && !json.Contains("Hwnd") && !json.Contains(r1.Pid.ToString()), "len " + json.Length);
        });
    }
}
