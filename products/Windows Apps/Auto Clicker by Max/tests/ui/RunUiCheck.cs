using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

// Drives the real MainForm: Simple tab running (clicks posted to this process's hidden window), Asian script of Delay steps only.
// Checks the status line, the running row, the window/content heights, and screenshots each state.
class RunUiCheck
{
    static Assembly asm;
    static BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
    static StringBuilder log = new StringBuilder();
    static int pass, fail;
    static string outDir;

    static object Field(object o, string name)
    {
        for (Type t = o.GetType(); t != null; t = t.BaseType)
        {
            FieldInfo fi = t.GetField(name, bf | BindingFlags.DeclaredOnly);
            if (fi != null) return fi.GetValue(o);
        }
        throw new MissingFieldException(o.GetType().Name, name);
    }

    static object Call(object o, string name, params object[] a)
    {
        return o.GetType().GetMethod(name, bf).Invoke(o, a);
    }

    static void Check(string name, bool ok, string detail)
    {
        if (ok) pass++; else fail++;
        log.AppendLine((ok ? "PASS " : "FAIL ") + name + " :: " + detail);
    }

    [STAThread]
    static void Main(string[] args)
    {
        outDir = args[0];
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        asm = Assembly.LoadFrom(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Auto Clicker by Max.exe"));
        Type appInfo = asm.GetType("ModernAutoClicker.AppInfo");
        appInfo.GetProperty("AppName").SetValue(null, "Auto Clicker by Max", null);
        appInfo.GetProperty("Version").SetValue(null, "9.9.9", null);
        MethodInfo setLang = asm.GetType("MaxApp.Common.Loc").GetMethod("SetLanguage");
        setLang.Invoke(null, new object[] { "en" });

        Form f = (Form)Activator.CreateInstance(asm.GetType("ModernAutoClicker.MainForm"));
        // Off screen but shown: the engine stops on a hidden target
        Form clickTarget = new Form { StartPosition = FormStartPosition.Manual, Location = new Point(-3000, -3000), ShowInTaskbar = true, Text = "RunUiTarget" };
        clickTarget.Show();
        IntPtr targetHwnd = clickTarget.Handle;

        Label status = (Label)Field(f, "lblMainStatusInfo");
        Label row = (Label)Field(f, "lblRunningTasks");
        Control host = (Control)Field(f, "pnlContentHost");
        Array engines = (Array)Field(f, "_simpleEngines");
        object engine0 = engines.GetValue(0);
        object panel = Field(f, "pnlTabAdvanced");

        int simpleIdleH = 0, asianIdleH = 0, asianIdleContent = 0;
        int step = 0;
        Timer t = new Timer { Interval = 1000 };
        t.Tick += (s, e) =>
        {
            log.AppendLine("INFO step " + step + " tab=" + Field(f, "_currentTabIndex"));
            try { Run(step, f, clickTarget, targetHwnd, status, row, host, engine0, panel, setLang, ref simpleIdleH, ref asianIdleH, ref asianIdleContent, t); }
            catch (Exception ex)
            {
                log.AppendLine("EXCEPTION step " + step + ": " + (ex.InnerException ?? ex));
                fail++;
                t.Stop();
                f.Close();
            }
            step++;
        };
        // Corner of the screen, away from a real app window the user may have open in the middle
        f.Shown += (s, e) => { f.Location = new Point(10, 10); f.TopMost = true; t.Start(); };
        f.FormClosed += (s, e) =>
        {
            log.AppendLine(string.Format("RESULT {0} passed, {1} failed", pass, fail));
            File.WriteAllText(Path.Combine(outDir, "run_results.txt"), log.ToString(), Encoding.UTF8);
        };
        Application.Run(f);
    }

    static void StartSafeSimple(object engine, Form f, IntPtr hwnd)
    {
        Process me = Process.GetCurrentProcess();
        Type cfgType = asm.GetType("ModernAutoClicker.ClickConfig");
        object cfg = Activator.CreateInstance(cfgType);
        cfgType.GetProperty("IntervalMs").SetValue(cfg, 20, null);
        cfgType.GetProperty("Loops").SetValue(cfg, 100000, null);
        cfgType.GetProperty("FreeMouseMode").SetValue(cfg, true, null);
        cfgType.GetProperty("RelativeToWindow").SetValue(cfg, true, null);
        cfgType.GetProperty("TargetHwnd").SetValue(cfg, hwnd, null);
        cfgType.GetProperty("TargetPid").SetValue(cfg, (uint)me.Id, null);
        cfgType.GetProperty("TargetProcessName").SetValue(cfg, me.ProcessName, null);
        cfgType.GetProperty("ClickMode").SetValue(cfg, 0, null);
        cfgType.GetProperty("PointsList").SetValue(cfg, new List<Point> { new Point(1, 1) }, null);
        engine.GetType().GetMethod("Start").Invoke(engine, new object[] { cfg });
        Call(f, "UpdateSimpleTabButtons");
        Call(f, "UpdateRunningState", new object[] { null });
        Call(f, "UpdateMainStatusText");
    }

    static void Run(int step, Form f, Form clickTarget, IntPtr hwnd, Label status, Label row, Control host, object engine0, object panel, MethodInfo setLang,
        ref int simpleIdleH, ref int asianIdleH, ref int asianIdleContent, Timer t)
    {
        switch (step)
        {
            case 0:
                Call(f, "SwitchTab", 1);
                Call(f, "SwitchSimpleTab", 0);
                break;
            case 1:
                simpleIdleH = f.Height;
                Check("simple idle: row hidden", !row.Visible, "visible=" + row.Visible);
                Check("simple idle: Ready line", status.Text.StartsWith("Ready"), status.Text);
                Capture(f, "1_simple_idle.png");
                StartSafeSimple(engine0, f, hwnd);
                break;
            case 2:
                Check("simple running: stats line", status.Text.StartsWith("Clicks: ") && status.Text.Contains("| Time: ") && status.Text.Contains("| Loops: "), status.Text);
                Check("simple running: loops show target", status.Text.Contains("/100,000") || status.Text.Contains("/100000"), status.Text);
                Check("simple running: row visible", row.Visible, row.Text);
                Check("simple running: row names tab", row.Text == "Running (1): Simple #1", row.Text);
                Check("simple running: window grew 20px", f.Height == simpleIdleH + 20, simpleIdleH + " -> " + f.Height);
                Capture(f, "2_simple_running.png");
                break;
            case 3:
                // Stats keep moving without any other event
                string before = status.Text;
                Application.DoEvents();
                log.AppendLine("INFO stats later: " + before);
                Call(f, "SwitchSimpleTab", 1);
                break;
            case 4:
                Check("other simple tab idle: Ready line", status.Text.StartsWith("Ready"), status.Text);
                Check("other simple tab idle: row still lists #1", row.Text == "Running (1): Simple #1" && row.Visible, row.Text);
                Capture(f, "3_simple_other_tab.png");
                Call(f, "SwitchSimpleTab", 0);
                break;
            case 5:
                Check("back on running tab: stats line", status.Text.StartsWith("Clicks: "), status.Text);
                Call(f, "SwitchTab", 0);
                break;
            case 6:
                Check("info tab: row hidden", !row.Visible, "visible=" + row.Visible);
                Capture(f, "4_info_while_running.png");
                Call(f, "SwitchTab", 2);
                break;
            case 7:
            {
                // Asian: only Delay steps, verified before starting
                object table = Field(panel, "tableControl");
                Call(table, "ClearAll");
                Type stepType = asm.GetType("ModernAutoClicker.Advanced.MacroStep");
                Type actionType = asm.GetType("ModernAutoClicker.Advanced.MacroActionType");
                for (int i = 0; i < 3; i++)
                {
                    object st = Activator.CreateInstance(stepType);
                    stepType.GetProperty("ActionType").SetValue(st, Enum.Parse(actionType, "Delay"), null);
                    stepType.GetProperty("DelayMs").SetValue(st, 50, null);
                    table.GetType().GetMethod("AddStep").Invoke(table, new object[] { st });
                }
                Check("asian (other tab running): Ready line, not stats", !status.Text.StartsWith("Steps: ") && !status.Text.StartsWith("Clicks: "), status.Text);
                Check("asian (other tab running): row visible", row.Visible, row.Text);
                asianIdleH = f.Height;
                asianIdleContent = host.Height;
                Capture(f, "5_asian_other_running.png");
                break;
            }
            case 8:
            {
                object prof = panel.GetType().GetMethod("GetCurrentProfile").Invoke(panel, null);
                IEnumerable steps = (IEnumerable)prof.GetType().GetProperty("Steps").GetValue(prof, null);
                bool onlyDelay = true;
                foreach (object st in steps) if (st.GetType().GetProperty("ActionType").GetValue(st, null).ToString() != "Delay") onlyDelay = false;
                Check("asian script is Delay-only", onlyDelay, "safety");
                if (!onlyDelay) { t.Stop(); f.Close(); return; }
                Call(f, "StartAsianScript", true);
                Call(f, "UpdateRunningState", new object[] { null });
                Call(f, "UpdateMainStatusText");
                break;
            }
            case 9:
                Check("asian running: stats show Steps not Clicks", status.Text.StartsWith("Steps: ") && status.Text.Contains("| Loops: ") && !status.Text.Contains("Clicks"), status.Text);
                Check("asian running: row lists both", row.Text.StartsWith("Running (2): Simple #1, Asian "), row.Text);
                Check("asian running: window height kept", f.Height == asianIdleH, asianIdleH + " -> " + f.Height);
                Capture(f, "6_asian_running.png");
                setLang.Invoke(null, new object[] { "vi" });
                break;
            case 10:
                Check("VI: stats", status.Text.StartsWith("Bước: ") && status.Text.Contains("Thời gian: ") && status.Text.Contains("Vòng lặp: "), status.Text);
                Check("VI: row", row.Text.StartsWith("Đang chạy (2): Cơ bản #1, Châu Á "), row.Text);
                Capture(f, "7_asian_running_vi.png");
                setLang.Invoke(null, new object[] { "en" });
                Call(f, "ApplyTheme", asm.GetType("MaxApp.Common.ThemeTokens").GetMethod("LightTheme").Invoke(null, null));
                break;
            case 11:
                Capture(f, "8_asian_running_light.png");
                Call(f, "ToggleSettingsCollapse");
                break;
            case 12:
                Check("settings folded: row still visible", row.Visible, row.Text);
                Capture(f, "9_asian_running_folded.png");
                Call(f, "ToggleSettingsCollapse");
                break;
            case 13:
                Call(f, "StopAll");
                break;
            case 14:
                Check("after StopAll: row hidden", !row.Visible, "visible=" + row.Visible);
                Check("after StopAll: content height back", host.Height == asianIdleContent + 20, asianIdleContent + " -> " + host.Height);
                Capture(f, "10_asian_stopped.png");
                Call(f, "SwitchTab", 1);
                break;
            case 15:
                Check("simple after stop: window back to idle height", f.Height == simpleIdleH, simpleIdleH + " -> " + f.Height);
                Call(f, "ApplyTheme", asm.GetType("MaxApp.Common.ThemeTokens").GetMethod("DarkTheme").Invoke(null, null));
                TabBarSheet();
                break;
            case 16:
                // Empty the Delay script so the private test config stays clean
                t.Stop();
                f.Close();
                break;
        }
    }

    // ModeTabBar on its own: 2, 3, 4 tabs, no Info button, narrow width, dark and light
    static void TabBarSheet()
    {
        Type barType = asm.GetType("MaxApp.Common.ModeTabBar");
        Type themeType = asm.GetType("MaxApp.Common.ThemeTokens");
        Form sheet = new Form { FormBorderStyle = FormBorderStyle.None, StartPosition = FormStartPosition.Manual, Location = new Point(10, 10), ClientSize = new Size(640, 330), TopMost = true, ShowInTaskbar = false };
        object light = themeType.GetMethod("LightTheme").Invoke(null, null);
        object dark = themeType.GetMethod("DarkTheme").Invoke(null, null);
        sheet.BackColor = (Color)themeType.GetProperty("BgPrimary") .GetValue(dark, null);
        int y = 10;
        Func<string[], int, bool, object, int, object> add = (titles, width, info, theme, sel) =>
        {
            object bar = Activator.CreateInstance(barType);
            Control c = (Control)bar;
            c.Location = new Point(10, y);
            c.Size = new Size(width, 36);
            barType.GetProperty("ShowInfoButton").SetValue(bar, info, null);
            barType.GetMethod("SetTabs").Invoke(bar, new object[] { titles });
            barType.GetMethod("ApplyTheme").Invoke(bar, new object[] { theme });
            barType.GetProperty("SelectedIndex").SetValue(bar, sel, null);
            sheet.Controls.Add(c);
            y += 44;
            return bar;
        };
        add(new[] { "Simple", "Asian Mode" }, 620, true, dark, 1);
        add(new[] { "One", "Two", "Three" }, 620, true, dark, 2);
        add(new[] { "One", "Two", "Three", "Four" }, 620, true, dark, 0);
        add(new[] { "One", "Two", "Three" }, 620, false, dark, 3);
        add(new[] { "Simple", "Asian Mode", "A much longer tab name" }, 300, true, dark, 3);
        add(new[] { "One", "Two", "Three" }, 620, true, light, 2);
        object renamed = add(new[] { "Old A", "Old B" }, 620, true, dark, 1);
        object btnBefore = barType.GetMethod("GetTabButton").Invoke(renamed, new object[] { 2 });
        barType.GetMethod("SetTabs").Invoke(renamed, new object[] { new[] { "New A", "New B" } });
        object btnAfter = barType.GetMethod("GetTabButton").Invoke(renamed, new object[] { 2 });
        Check("SetTabs rename keeps same button", ReferenceEquals(btnBefore, btnAfter) && ((Control)btnAfter).Text == "New B", ((Control)btnAfter).Text);
        Check("GetTabButton out of range is null", barType.GetMethod("GetTabButton").Invoke(renamed, new object[] { 9 }) == null, "");
        sheet.Show();
        sheet.Refresh();
        Application.DoEvents();
        int raised = -1;
        Action<int> handler = i => raised = i;
        barType.GetEvent("OnTabSelected").AddEventHandler(renamed, handler);
        ((Button)btnAfter).PerformClick();
        Check("click raises OnTabSelected with index", raised == 2, "raised=" + raised);
        Check("click selects tab", (int)barType.GetProperty("SelectedIndex").GetValue(renamed, null) == 2, "");
        sheet.Refresh();
        Application.DoEvents();
        Capture(sheet, "11_tabbar_sheet.png");
        sheet.Close();
    }

    static void Capture(Form f, string name)
    {
        f.Refresh();
        Application.DoEvents();
        Rectangle r = f.Bounds;
        r.Intersect(Screen.FromControl(f).Bounds);
        using (Bitmap bmp = new Bitmap(r.Width, r.Height))
        {
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            bmp.Save(Path.Combine(outDir, name), ImageFormat.Png);
        }
    }
}
