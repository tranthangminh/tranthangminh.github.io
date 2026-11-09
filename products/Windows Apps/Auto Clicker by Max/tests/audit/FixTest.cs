using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Proof that the audit findings are fixed. Runs from a scratch folder, one process per case. Every click goes to a WinTarget window.
class FixTest
{
    [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h, int id, uint mod, uint vk);
    [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeoutMs, out IntPtr result);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);

    const string Proc = "WinTarget";
    static BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
    static int fails = 0;

    static void Check(string name, bool ok, string detail = "")
    {
        if (!ok) fails++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + (detail.Length > 0 ? " :: " + detail : ""));
        Console.Out.Flush();
    }

    static object Get(object o, string n)
    {
        for (Type ty = o.GetType(); ty != null; ty = ty.BaseType)
        {
            FieldInfo fi = ty.GetField(n, bf | BindingFlags.DeclaredOnly);
            if (fi != null) return fi.GetValue(o);
            PropertyInfo pi = ty.GetProperty(n, bf | BindingFlags.DeclaredOnly);
            if (pi != null) return pi.GetValue(o, null);
        }
        throw new MissingFieldException(n);
    }

    static AppSettings Rich()
    {
        AppSettings s = new AppSettings();
        for (int i = 0; i < 4; i++) s.GetProfile(i).Points.Add(new Point(10 + i, 20 + i));
        s.AdvancedProfileJson = MacroStorage.ProjectToJson(new List<MacroProfile> { new MacroProfile { Name = "Keep me", Steps = new List<MacroStep> { new MacroStep { Name = "S1" } } } }, 0);
        return s;
    }

    static int Tabs(AppSettings s)
    {
        int tabs = 0;
        for (int i = 0; i < AppSettings.SimpleTabCount; i++) if (s.GetProfile(i).Points.Count > 0) tabs++;
        return tabs;
    }

    static bool HasScript(AppSettings s) { return s.AdvancedProfileJson != null && s.AdvancedProfileJson.Contains("Keep me"); }

    static void SaveCycle()
    {
        AppSettings c = AppSettings.Load();
        c.GetProfile(0).Points = new List<Point> { new Point(10, 20) };
        AppSettings.Save(c);
    }

    // Each case starts a fresh process, so nothing is remembered from an earlier read: this is opening the app
    static string Dir() { return Path.GetDirectoryName(AppSettings.GetSettingsFilePath()); }

    static void Clean()
    {
        foreach (string f in Directory.GetFiles(Dir())) File.Delete(f);
    }

    static void LossPrepare()
    {
        Clean();
        AppSettings.Save(Rich()); // first save
        AppSettings.Save(Rich()); // second save: now a backup exists
        Check("prepare: settings written", Tabs(AppSettings.Load()) == 4);
        Check("prepare: backup exists", File.Exists(AppSettings.GetSettingsFilePath() + ".bak"));
    }

    static void HeldThenSave()
    {
        string path = AppSettings.GetSettingsFilePath();
        AppSettings first = AppSettings.Load();
        Check("session: read ok before", Tabs(first) == 4);
        using (FileStream hold = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Delete))
        {
            SaveCycle();
        }
        AppSettings after = AppSettings.Load();
        Check("held during a session: tabs kept", Tabs(after) == 4, Tabs(after).ToString());
        Check("held during a session: script kept", HasScript(after));
    }

    static void HeldAtStart()
    {
        string path = AppSettings.GetSettingsFilePath();
        string before = File.ReadAllText(path);
        using (FileStream hold = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Delete))
        {
            AppSettings c = AppSettings.Load();
            Check("held at start: problem reported", AppSettings.TakeProblem() == SettingsProblem.CouldNotRead);
            c.GetProfile(0).Points.Clear();
            AppSettings.Save(c);
        }
        Check("held at start: file untouched", File.ReadAllText(path) == before);
        AppSettings.Save(new AppSettings());
        Check("held at start: saving stays off for the session", File.ReadAllText(path) == before);
    }

    static void CutInHalf()
    {
        string path = AppSettings.GetSettingsFilePath();
        string full = File.ReadAllText(path);
        File.WriteAllText(path, full.Substring(0, full.Length / 2));
        AppSettings c = AppSettings.Load();
        Check("cut in half: restored from backup", AppSettings.TakeProblem() == SettingsProblem.RestoredFromBackup);
        Check("cut in half: tabs back", Tabs(c) == 4, Tabs(c).ToString());
        Check("cut in half: script back", HasScript(c));
        Check("cut in half: damaged file kept", Directory.GetFiles(Dir(), "*.corrupt-*").Length == 1);
        SaveCycle();
        Check("cut in half: survives the next save", Tabs(AppSettings.Load()) == 4);
    }

    static void CutNoBackup()
    {
        string path = AppSettings.GetSettingsFilePath();
        string full = File.ReadAllText(path);
        File.WriteAllText(path, full.Substring(0, full.Length / 2));
        File.Delete(path + ".bak");
        AppSettings c = AppSettings.Load();
        Check("no backup: told about the reset", AppSettings.TakeProblem() == SettingsProblem.ResetToDefaults);
        Check("no backup: not treated as first run", !c.IsFirstRun);
        Check("no backup: damaged file kept", Directory.GetFiles(Dir(), "*.corrupt-*").Length >= 1);
    }

    static void EmptyFile()
    {
        string path = AppSettings.GetSettingsFilePath();
        File.WriteAllText(path, "");
        AppSettings c = AppSettings.Load();
        Check("empty file: restored from backup", AppSettings.TakeProblem() == SettingsProblem.RestoredFromBackup && Tabs(c) == 4);
    }

    static void BigNumber()
    {
        string path = AppSettings.GetSettingsFilePath();
        string full = File.ReadAllText(path);
        File.WriteAllText(path, full.Replace("\"X\": 11", "\"X\": 99999999999"));
        AppSettings c = AppSettings.Load();
        Check("number too big: no problem raised", AppSettings.TakeProblem() == SettingsProblem.None);
        Check("number too big: only that point goes", Tabs(c) == 3, Tabs(c).ToString());
        Check("number too big: script kept", HasScript(c));
    }

    static void HugeCoordinates()
    {
        string path = AppSettings.GetSettingsFilePath();
        File.WriteAllText(path, File.ReadAllText(path).Replace("\"X\": 11", "\"X\": 2000000000"));
        AppSettings c = AppSettings.Load();
        Check("huge coordinate: limited", c.GetProfile(1).Points.Count == 1 && c.GetProfile(1).Points[0].X == 100000, c.GetProfile(1).Points.Count > 0 ? c.GetProfile(1).Points[0].ToString() : "none");
    }

    static void ReadOnlySave()
    {
        string path = AppSettings.GetSettingsFilePath();
        AppSettings c = AppSettings.Load();
        AppSettings.TakeProblem();
        using (FileStream hold = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            AppSettings.Save(c);
        }
        Check("save blocked by another program: told", AppSettings.TakeProblem() == SettingsProblem.CouldNotSave);
        Check("save blocked: file still whole", Tabs(AppSettings.Load()) == 4);
        Check("save blocked: no leftovers", Directory.GetFiles(Dir(), "*.old").Length == 0 && Directory.GetFiles(Dir(), "*.tmp.*").Length == 0);
    }

    static Process OpenTarget(string tgDir)
    {
        int y = Screen.PrimaryScreen.Bounds.Height - 190;
        Process p = Process.Start(new ProcessStartInfo(Path.Combine(tgDir, "WinTarget.exe"), string.Format("\"{0}\" \"fix\" \"Fix target\" 5 {1} normal", tgDir, y)) { UseShellExecute = false });
        for (int i = 0; i < 100 && p.MainWindowHandle == IntPtr.Zero; i++) { Thread.Sleep(50); p.Refresh(); }
        Thread.Sleep(200);
        return p;
    }

    static MacroStep Rel(Process t, MacroActionType type)
    {
        return new MacroStep { ActionType = type, RelativeToWindow = true, WindowHwnd = t.MainWindowHandle, TargetPid = (uint)t.Id, ProcessName = Proc, WindowTitle = "Fix target", StartPoint = new Point(20, 20), HoldMs = 1, DelayMs = 10 };
    }

    // The engine catches what the file limits did not: values set directly, past the limits
    static void EngineFailure(string tgDir, string which)
    {
        AppDomain.CurrentDomain.UnhandledException += (s, e) => { Console.WriteLine("FAIL app crashed: " + e.ExceptionObject); Console.Out.Flush(); };
        Process t = OpenTarget(tgDir);
        try
        {
            MacroProfile prof = new MacroProfile { Name = "H", LoopCount = 0, SpeedPercent = 100 };
            MacroStep st = Rel(t, MacroActionType.LeftClick);
            if (which == "area") st.EndPoint = new Point(int.MaxValue, int.MaxValue);
            else if (which == "jitter") prof.RandomJitterPx = int.MaxValue;
            else if (which == "interval") prof.RandomIntervalMs = int.MaxValue;
            prof.Steps = new List<MacroStep> { st };

            Exception failed = null;
            bool stopped = false;
            MacroRunner runner = new MacroRunner();
            runner.OnRunFailed += ex => failed = ex;
            runner.OnStopped += () => stopped = true;
            runner.Start(prof, new List<MacroProfile> { prof }, true);
            Thread.Sleep(1200);
            Check(which + ": run ended instead of the app", !runner.IsRunning);
            Check(which + ": failure reported", failed != null, failed != null ? failed.GetType().Name : "none");
            Check(which + ": stopped raised", stopped);
        }
        finally { if (!t.HasExited) t.Kill(); }
    }

    static void ScriptLimits()
    {
        string json = "{ \"Name\": \"H\", \"LoopCount\": -5, \"RandomIntervalMs\": 2147483647, \"RandomJitterPx\": 2147483647, \"SpeedPercent\": 999999, \"Steps\": [ { \"ActionType\": 0, \"StartX\": 2147483647, \"StartY\": -2147483647, \"EndX\": 2147483647, \"EndY\": 2147483647, \"HoldMs\": -5, \"DelayMs\": 2147483647, \"RepeatCount\": -5, \"Tolerance\": 999, \"IfTrueStep\": -99, \"Similarity\": 999, \"DragButton\": 9, \"PressClickMode\": 9 } ] }";
        MacroProfile p = MacroStorage.FromJson(json);
        MacroStep s = p.Steps[0];
        Check("limits: profile", p.LoopCount == 0 && p.RandomIntervalMs == 10000 && p.RandomJitterPx == 100 && p.SpeedPercent == 2000);
        Check("limits: points", s.StartPoint == new Point(100000, -100000) && s.EndPoint == new Point(100000, 100000), s.StartPoint + " " + s.EndPoint);
        Check("limits: times", s.HoldMs == 0 && s.DelayMs == 86400000 && s.RepeatCount == 1);
        Check("limits: the rest", s.Tolerance == 255 && s.IfTrueStep == -3 && s.Similarity == 100 && s.DragButton == 2 && s.PressClickMode == 3);

        MacroProfile real = MacroStorage.FromJson(MacroStorage.ToJson(new MacroProfile { Name = "Real", LoopCount = 7, RandomIntervalMs = 30, RandomJitterPx = 4, SpeedPercent = 150, Steps = new List<MacroStep> { new MacroStep { StartPoint = new Point(1920, 1080), EndPoint = new Point(-1920, 5), HoldMs = 500, DelayMs = 1234, RepeatCount = 3, Tolerance = 12, IfTrueStep = -2, IfFalseStep = -3, Similarity = 85 } } }));
        MacroStep rs = real.Steps[0];
        Check("limits: normal script unchanged", real.LoopCount == 7 && real.RandomIntervalMs == 30 && real.RandomJitterPx == 4 && real.SpeedPercent == 150 && rs.StartPoint == new Point(1920, 1080) && rs.EndPoint == new Point(-1920, 5) && rs.HoldMs == 500 && rs.DelayMs == 1234 && rs.RepeatCount == 3 && rs.Tolerance == 12 && rs.IfTrueStep == -2 && rs.IfFalseStep == -3 && rs.Similarity == 85);
    }

    static Form StartMain()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Assembly asm = typeof(ClickEngine).Assembly;
        asm.GetType("MaxApp.Common.Loc").GetMethod("SetLanguage").Invoke(null, new object[] { "en" });
        return (Form)Activator.CreateInstance(asm.GetType("ModernAutoClicker.MainForm"));
    }

    static Form FindBox()
    {
        foreach (Form x in Application.OpenForms) if (x.GetType().Name == "ModernMessageBox") return x;
        return null;
    }

    static string Texts(Control c)
    {
        StringBuilder sb = new StringBuilder();
        foreach (Control child in c.Controls)
        {
            if (!string.IsNullOrEmpty(child.Text)) sb.Append(child.Text).Append(" | ");
            sb.Append(Texts(child));
        }
        return sb.ToString();
    }

    // A real start with a damaged file: the message appears, the data is on screen
    static void StartupRestored()
    {
        Form f = StartMain();
        System.Windows.Forms.Timer t = new System.Windows.Forms.Timer { Interval = 300 };
        int n = 0;
        t.Tick += (s, e) =>
        {
            n++;
            Form box = FindBox();
            if (box != null)
            {
                t.Stop();
                Check("real start: told about the restore", Texts(box).Contains("restored its latest backup"), Texts(box));
                object list = Get(f, "lstPoints");
                Check("real start: points back on screen", ((int)Get(list, "Count")) == 1);
                box.Close();
                f.BeginInvoke((Action)(() => f.Close()));
            }
            else if (n > 20) { t.Stop(); Check("real start: told about the restore", false, "no message"); f.Close(); }
        };
        f.Shown += (s, e) => t.Start();
        Application.Run(f);
        Check("real start: scripts survive closing", HasScript(AppSettings.Load()));
    }

    // Another process holds F7
    static void HotkeyTaken()
    {
        Form f = StartMain();
        System.Windows.Forms.Timer t = new System.Windows.Forms.Timer { Interval = 300 };
        int n = 0;
        t.Tick += (s, e) =>
        {
            n++;
            Form box = FindBox();
            if (box != null)
            {
                t.Stop();
                string text = Texts(box);
                Check("hotkey: names F7", text.Contains("F7"), text);
                Check("hotkey: does not blame F6", !text.Contains("F6"), text);
                box.Close();
                f.BeginInvoke((Action)(() => f.Close()));
            }
            else if (n > 15) { t.Stop(); Check("hotkey: warned", false, "no message"); f.Close(); }
        };
        f.Shown += (s, e) => t.Start();
        Application.Run(f);
    }

    static void HotkeyFree()
    {
        Form f = StartMain();
        System.Windows.Forms.Timer t = new System.Windows.Forms.Timer { Interval = 1500 };
        t.Tick += (s, e) =>
        {
            t.Stop();
            Check("hotkey free: no warning", FindBox() == null);
            f.Close();
        };
        f.Shown += (s, e) => t.Start();
        Application.Run(f);
    }

    static void HoldF7(string seconds)
    {
        bool ok = RegisterHotKey(IntPtr.Zero, 7777, 0, (uint)Keys.F7);
        Console.WriteLine("holder has F7: " + ok);
        Console.Out.Flush();
        Thread.Sleep(int.Parse(seconds) * 1000);
    }

    static void Responsive(string tgDir, string kind)
    {
        Form f = StartMain();
        Process target = (kind == "click" || kind == "simple1ms") ? OpenTarget(tgDir) : null;
        Thread dog = new Thread(() => { Thread.Sleep(40000); Console.WriteLine("FAIL watchdog: UI never came back"); Console.Out.Flush(); Environment.Exit(3); });
        dog.IsBackground = true;
        dog.Start();

        f.Shown += (s, e) =>
        {
            f.Location = new Point(10, 10);
            IntPtr handle = f.Handle;
            if (kind == "simple1ms")
            {
                f.GetType().GetMethod("SwitchTab", bf).Invoke(f, new object[] { 1 });
                FieldInfo dummy = null;
                ((CheckBox)Get(f, "chkFreeMouse")).Checked = true;
                f.GetType().GetField("_simpleRelativeToWindow", bf).SetValue(f, true);
                f.GetType().GetField("_simpleTargetProcessName", bf).SetValue(f, Proc);
                f.GetType().GetField("_simpleTargetWindowTitle", bf).SetValue(f, "Fix target");
                f.GetType().GetProperty("_simpleTargetHwnd", bf).SetValue(f, target.MainWindowHandle, null);
                f.GetType().GetProperty("_simpleTargetPid", bf).SetValue(f, (uint)target.Id, null);
                object list = Get(f, "lstPoints");
                list.GetType().GetMethod("SetPoints", bf).Invoke(list, new object[] { new List<Point> { new Point(20, 20) } });
                object interval = Get(f, "numInterval");
                interval.GetType().GetProperty("ValueMs").SetValue(interval, 1, null);
                f.GetType().GetMethod("UpdateStartButtonState", bf).Invoke(f, null);
            }
            else
            {
                f.GetType().GetMethod("SwitchTab", bf).Invoke(f, new object[] { 2 });
                object panel = Get(f, "pnlTabAdvanced");
                object table = Get(panel, "Table");
                table.GetType().GetMethod("ClearAll", bf).Invoke(table, null);
                MethodInfo add = table.GetType().GetMethod("AddStep");
                if (kind == "click")
                {
                    MacroStep c = Rel(target, MacroActionType.LeftClick);
                    c.DelayMs = 0;
                    add.Invoke(table, new object[] { c });
                }
                else if (kind == "repeat")
                {
                    add.Invoke(table, new object[] { new MacroStep { ActionType = MacroActionType.RepeatTimer, RepeatCount = 2000000000, RepeatTimerMode = 0, RepeatTimerTargetStep = 1, DelayMs = 0, HoldMs = 1 } });
                }
                else
                {
                    add.Invoke(table, new object[] { new MacroStep { ActionType = MacroActionType.RunScript, KeyData = "Missing", RepeatCount = 1, HoldMs = 0, DelayMs = 0 } });
                }
                ((CheckBox)Get(f, "chkFreeMouse")).Checked = true;
            }
            f.BeginInvoke((Action)(() => f.GetType().GetMethod("StartAutoClick", bf).Invoke(f, null)));

            Thread probe = new Thread(() =>
            {
                Thread.Sleep(600);
                long worst = 0;
                int hung = 0;
                for (int i = 0; i < 12; i++)
                {
                    Stopwatch sw = Stopwatch.StartNew();
                    IntPtr res;
                    IntPtr ok = SendMessageTimeout(handle, 0, IntPtr.Zero, IntPtr.Zero, 2, 3000, out res);
                    if (sw.ElapsedMilliseconds > worst) worst = sw.ElapsedMilliseconds;
                    if (ok == IntPtr.Zero) hung++;
                    Thread.Sleep(500);
                }
                Check(kind + ": UI answers while running", hung == 0 && worst < 500, "worst " + worst + " ms, timed out " + hung);
                long mb = Process.GetCurrentProcess().PrivateMemorySize64 / (1024 * 1024);
                Check(kind + ": memory stays flat", mb < 120, mb + " MB");

                Type nm = typeof(ClickEngine).Assembly.GetType("ModernAutoClicker.NativeMethods");
                int stopId = Convert.ToInt32(nm.GetField("HOTKEY_STOP_ALL_ID", BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic).GetValue(null));
                bool wasRunning = false;
                f.Invoke((Action)(() => wasRunning = (bool)Get(f, "IsAnyRunning")));
                Check(kind + ": was running", wasRunning);
                Stopwatch stop = Stopwatch.StartNew();
                PostMessage(handle, 0x0312, (IntPtr)stopId, IntPtr.Zero);
                bool running = true;
                while (running && stop.ElapsedMilliseconds < 20000)
                {
                    f.Invoke((Action)(() => running = (bool)Get(f, "IsAnyRunning")));
                    Thread.Sleep(5);
                }
                Check(kind + ": F7 stops quickly", !running && stop.ElapsedMilliseconds < 500, stop.ElapsedMilliseconds + " ms");
                if (target != null && !target.HasExited) target.Kill();
                f.BeginInvoke((Action)(() => f.Close()));
            });
            probe.IsBackground = true;
            probe.Start();
        };
        Application.Run(f);
    }

    [STAThread]
    static int Main(string[] a)
    {
        switch (a[0])
        {
            case "prepare": LossPrepare(); break;
            case "held": HeldThenSave(); break;
            case "heldstart": HeldAtStart(); break;
            case "cut": CutInHalf(); break;
            case "cutnobak": CutNoBackup(); break;
            case "empty": EmptyFile(); break;
            case "bignum": BigNumber(); break;
            case "hugexy": HugeCoordinates(); break;
            case "savefail": ReadOnlySave(); break;
            case "engine": EngineFailure(a[1], a[2]); break;
            case "limits": ScriptLimits(); break;
            case "startup": StartupRestored(); break;
            case "hotkeytaken": HotkeyTaken(); break;
            case "hotkeyfree": HotkeyFree(); break;
            case "holdf7": HoldF7(a[1]); break;
            case "responsive": Responsive(a[1], a[2]); break;
        }
        return fails;
    }
}
