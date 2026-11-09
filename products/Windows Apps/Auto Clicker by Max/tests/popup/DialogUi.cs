using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using MaxApp.Common;
using ModernAutoClicker.Advanced;

// The shared popup frame: both ways of opening it, and every real popup on it, on the real MainForm.
// The physical clicks land only on this harness's own topmost windows, and the cursor goes back where it was.
class TestPopup : ModernDialog
{
    public static List<string> Order = new List<string>();
    public TextBox Input;
    public Label Note;
    public MaxApp.Common.RoundedButton Ok;
    public MaxApp.Common.RoundedButton No;
    public int LanguageCalls;

    public TestPopup(int contentHeight = 60, int maxHeight = int.MaxValue, bool setCancel = true) : base("Test & popup")
    {
        Input = new TextBox { Location = new Point(10, 10), Width = 200 };
        Note = new Label { Location = new Point(10, 40), Size = new Size(200, 20), Text = "note" };
        Body.Controls.Add(Input);
        Body.Controls.Add(Note);
        Ok = AddButton("Test OK", DialogResult.OK, true, () => { Order.Add("before:" + this.IsDisposed + ":" + Input.Text); });
        No = AddButton("Test No", DialogResult.Cancel, false);
        this.AcceptButton = Ok;
        if (setCancel) this.CancelButton = No;
        SetBodySize(280, contentHeight, maxHeight);
    }

    protected override void ApplyLanguage()
    {
        LanguageCalls++;
        Title = "Reworded";
        Ok.Text = "A much longer test button";
    }

    public Panel BodyPanel { get { return Body; } }
}

class OtherPopup : ModernDialog
{
    public OtherPopup() : base("Other popup")
    {
        AcceptButton = AddButton("Other OK", DialogResult.OK, true);
        SetBodySize(200, 40);
    }
}

class DialogUi
{
    const string Proc = "WinTarget";
    const uint WM_KEYDOWN = 0x0100, WM_CHAR = 0x0102, WM_HOTKEY = 0x0312;
    const int VK_RETURN = 0x0D, VK_ESCAPE = 0x1B;
    static BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;

    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(uint f, int x, int y, uint d, UIntPtr e);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(Point p);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h, uint flags);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);

    class Win { public Process P; public IntPtr H; public uint Pid; public string Label; public string Title; }

    static string outDir, tgDir;
    static StringBuilder log = new StringBuilder();
    static int pass, fail;
    static Form f;
    static Form host;
    static int hostClicks;
    static Panel hostPanel;
    static List<Win> open = new List<Win>();
    static MethodInfo setLang;
    static Point savedCursor;
    static DialogResult lastResult;
    static bool resultReady;
    static int createCount;

    static void Check(string name, bool ok, string detail = "")
    {
        if (ok) pass++; else fail++;
        log.AppendLine((ok ? "PASS " : "FAIL ") + name + (detail.Length > 0 ? " :: " + detail : ""));
        File.WriteAllText(Path.Combine(outDir, "dialog_progress.txt"), log.ToString(), Encoding.UTF8);
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

    static void ClickAt(int x, int y)
    {
        SetCursorPos(x, y);
        mouse_event(2, 0, 0, 0, UIntPtr.Zero);
        mouse_event(4, 0, 0, 0, UIntPtr.Zero);
    }

    static void Wheel(int x, int y, int delta)
    {
        SetCursorPos(x, y);
        mouse_event(0x0800, 0, 0, (uint)delta, UIntPtr.Zero);
    }

    static void Key(Control c, int vk)
    {
        PostMessage(c.Handle, WM_KEYDOWN, (IntPtr)vk, IntPtr.Zero);
    }

    static T Find<T>() where T : Form
    {
        foreach (Form x in Application.OpenForms)
        {
            T found = x as T;
            if (found != null) return found;
        }
        return null;
    }

    static Form FindByName(string name)
    {
        foreach (Form x in Application.OpenForms)
        {
            if (x.GetType().Name == name) return x;
        }
        return null;
    }

    static void Capture(Form form, string name)
    {
        form.Refresh();
        Application.DoEvents();
        Rectangle r = form.Bounds;
        using (Bitmap bmp = new Bitmap(r.Width, r.Height))
        {
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(r.Location, Point.Empty, r.Size);
            bmp.Save(Path.Combine(outDir, name), ImageFormat.Png);
        }
    }

    static Color PixelAt(int x, int y)
    {
        using (Bitmap bmp = new Bitmap(1, 1))
        {
            using (Graphics g = Graphics.FromImage(bmp)) g.CopyFromScreen(x, y, 0, 0, new Size(1, 1));
            return bmp.GetPixel(0, 0);
        }
    }

    // The top-level window at a point, so a child control counts as its form
    static IntPtr TopAt(Point p)
    {
        return GetAncestor(WindowFromPoint(p), 2);
    }

    static bool ColorsClose(Color a, Color b)
    {
        return Math.Abs(a.R - b.R) < 12 && Math.Abs(a.G - b.G) < 12 && Math.Abs(a.B - b.B) < 12;
    }

    static List<Button> ButtonsOf(Control c)
    {
        List<Button> found = new List<Button>();
        foreach (Control child in c.Controls)
        {
            Button b = child as Button;
            if (b != null && !string.IsNullOrEmpty(b.Text)) found.Add(b);
            found.AddRange(ButtonsOf(child));
        }
        return found;
    }

    static void Press(Form form, string text)
    {
        foreach (Button b in ButtonsOf(form))
        {
            if (b.Text == text) { b.PerformClick(); return; }
        }
        throw new Exception("No button '" + text + "' on " + form.GetType().Name);
    }

    static T FirstOf<T>(Control c) where T : Control
    {
        foreach (Control child in c.Controls)
        {
            T hit = child as T;
            if (hit != null) return hit;
            T deep = FirstOf<T>(child);
            if (deep != null) return deep;
        }
        return null;
    }

    static Win OpenTarget(string label, string title, int slot)
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

    static List<Func<bool>> steps = new List<Func<bool>>();
    static void Do(Action a) { steps.Add(() => { a(); return true; }); }
    static void WaitUntil(string what, Func<bool> cond)
    {
        int tries = 0;
        steps.Add(() =>
        {
            if (cond()) return true;
            if (++tries > 50) { Check("timed out waiting: " + what, false); return true; }
            return false;
        });
    }
    static void Pause(int ticks)
    {
        for (int i = 0; i < ticks; i++) Do(() => { });
    }

    // Opens through a posted call: the popup is modal and must not run inside the timer tick that drives this test
    static void PostModal(Func<DialogResult> open)
    {
        resultReady = false;
        f.BeginInvoke((Action)(() =>
        {
            lastResult = open();
            resultReady = true;
        }));
    }

    [STAThread]
    static void Main(string[] args)
    {
        outDir = args[0];
        tgDir = args[1];
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        Assembly asm = typeof(ModernDialog).Assembly;
        Type appInfo = asm.GetType("ModernAutoClicker.AppInfo");
        appInfo.GetProperty("AppName").SetValue(null, "Auto Clicker by Max", null);
        appInfo.GetProperty("Version").SetValue(null, "9.9.9", null);
        setLang = asm.GetType("MaxApp.Common.Loc").GetMethod("SetLanguage");
        setLang.Invoke(null, new object[] { "en" });
        savedCursor = Cursor.Position;

        Application.ThreadException += (s, e) => Check("UNHANDLED in the app", false, e.Exception.ToString());

        f = (Form)Activator.CreateInstance(asm.GetType("ModernAutoClicker.MainForm"));

        BuildFrame();
        BuildParallel();
        BuildMessageBox();
        BuildRealPopups();
        BuildHotkeys();

        int index = 0;
        Timer t = new Timer { Interval = 120 };
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
                foreach (Form x in new List<Form>(EnumerateForms()))
                {
                    if (x != f) x.Close();
                }
                f.BeginInvoke((Action)(() => f.Close()));
            }
            finally { busy = false; }
        };
        f.Shown += (s, e) =>
        {
            f.Location = new Point(450, 10);
            f.TopMost = true;

            host = new Form { Text = "Harness host", TopMost = true, StartPosition = FormStartPosition.Manual, Location = new Point(10, 10), Size = new Size(420, 320), FormBorderStyle = FormBorderStyle.None, BackColor = Color.DimGray };
            Button hostButton = new Button { Text = "host", Location = new Point(4, 4), Size = new Size(70, 26) };
            hostButton.Click += (s2, e2) => hostClicks++;
            hostPanel = new Panel { Location = new Point(4, 280), Size = new Size(50, 30) };
            host.Controls.Add(hostButton);
            host.Controls.Add(hostPanel);
            host.Show();
            t.Start();
        };
        f.FormClosed += (s, e) =>
        {
            SetCursorPos(savedCursor.X, savedCursor.Y);
            foreach (Win w in open) { try { if (!w.P.HasExited) w.P.Kill(); } catch { } }
            log.AppendLine(string.Format("RESULT {0} passed, {1} failed", pass, fail));
            File.WriteAllText(Path.Combine(outDir, "dialog_results.txt"), log.ToString(), Encoding.UTF8);
        };
        Application.Run(f);
    }

    static IEnumerable<Form> EnumerateForms()
    {
        foreach (Form x in Application.OpenForms) yield return x;
    }

    // ---------- The frame and the modal way ----------
    static void BuildFrame()
    {
        TestPopup popup = null;

        Do(() =>
        {
            ClickAt(host.Left + 200, host.Top + 200); // The harness gets the foreground
        });
        Pause(4); // The click has to land before a popup opens under the cursor
        Do(() =>
        {
            hostClicks = 0;
            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(host); });
        });
        WaitUntil("modal open", () => popup != null && popup.Visible);
        Pause(3);
        Do(() =>
        {
            Check("modal: host is locked", WindowHelper.IsBlockedByDialog(host));
            Check("modal: Enabled property alone cannot tell", host.Enabled);
            Check("modal: foreground is the popup", GetForegroundWindow() == popup.Handle);
            Check("modal: starts on the main button", popup.ActiveControl == popup.Ok);
            Check("modal: no blink when it opens", (int)GetF(popup, "_attentionTicksLeft") == 0);
            Check("modal: not in the taskbar", !popup.ShowInTaskbar);

            int cx = host.Left + (host.Width - popup.Width) / 2, cy = host.Top + (host.Height - popup.Height) / 2;
            Check("modal: centered over the owner", Math.Abs(popup.Left - cx) <= 1 && Math.Abs(popup.Top - cy) <= 1, popup.Location + " vs " + cx + "," + cy);

            Control footer = popup.Ok.Parent;
            Check("buttons left to right", popup.Ok.Right <= popup.No.Left, popup.Ok.Bounds + " " + popup.No.Bounds);
            Check("buttons end at the right pad", footer.Width - popup.No.Right == 12, (footer.Width - popup.No.Right).ToString());
            Check("buttons fit their text", popup.Ok.Width >= TextRenderer.MeasureText(popup.Ok.Text, popup.Ok.Font).Width);
            Capture(popup, "m1_open.png");

            // Physical click on the locked host
            ClickAt(host.Left + 30, host.Top + 15);
        });
        Do(() =>
        {
            // Watch the left edge of the popup through the whole blink
            Theme_ThemeBorderSamples(popup);
        });
        Do(() =>
        {
            Check("modal: click on the host does nothing there", hostClicks == 0, hostClicks.ToString());
            Check("modal: click on the host leaves the popup in front", GetForegroundWindow() == popup.Handle);
            SetCursorPos(savedCursor.X, savedCursor.Y);
        });
        Pause(10);
        Do(() =>
        {
            Check("modal: blink ended", (int)GetF(popup, "_attentionTicksLeft") == 0);

            // Going to another window and back is not a click on the host
            OpenTarget("other", "Other window", 0);
        });
        Do(() => ClickAt(open[0].P.MainWindowHandle == IntPtr.Zero ? 50 : 50, Screen.PrimaryScreen.Bounds.Height - 150));
        Pause(4);
        Do(() =>
        {
            Check("activation: another app took the foreground", GetForegroundWindow() != popup.Handle);
            ClickAt(popup.Left + 200, popup.Top + 60);
        });
        Pause(4);
        Do(() =>
        {
            Check("activation: back on the popup", GetForegroundWindow() == popup.Handle);
            Check("activation: no blink for a normal switch", (int)GetF(popup, "_attentionTicksLeft") == 0);
            if (!open[0].P.HasExited) open[0].P.Kill();
            open.Clear();

            // Drag by the title bar
            Point start = popup.Location;
            SetCursorPos(popup.Left + 100, popup.Top + 16);
            mouse_event(2, 0, 0, 0, UIntPtr.Zero);
            popup.Tag = start;
        });
        Do(() => SetCursorPos(popup.Left + 100 + 40, popup.Top + 16 + 25));
        Do(() => mouse_event(4, 0, 0, 0, UIntPtr.Zero));
        Pause(2);
        Do(() =>
        {
            Point start = (Point)popup.Tag;
            Check("title bar drags the popup", popup.Left != start.X || popup.Top != start.Y, start + " -> " + popup.Location);

            // Enter runs the main button, with the popup still alive
            TestPopup.Order.Clear();
            popup.Input.Text = "typed";
            Key(popup.ActiveControl, VK_RETURN);
        });
        WaitUntil("enter closed it", () => resultReady);
        Do(() =>
        {
            Check("enter: main button result", lastResult == DialogResult.OK, lastResult.ToString());
            Check("enter: beforeClose saw the live popup", TestPopup.Order.Count == 1 && TestPopup.Order[0] == "before:False:typed", string.Join(",", TestPopup.Order.ToArray()));
            Check("closed: host unlocked", !WindowHelper.IsBlockedByDialog(host));
            Check("closed: disposed", popup.IsDisposed);
            popup = null;
            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(host); });
        });
        WaitUntil("second modal", () => popup != null && popup.Visible);
        Do(() => Key(popup.ActiveControl, VK_ESCAPE));
        WaitUntil("esc closed it", () => resultReady);
        Do(() =>
        {
            Check("esc: cancel button result", lastResult == DialogResult.Cancel, lastResult.ToString());
            popup = null;
            PostModal(() => { popup = new TestPopup(60, int.MaxValue, false); using (popup) return popup.ShowModal(host); });
        });
        WaitUntil("modal without cancel", () => popup != null && popup.Visible);
        Do(() => Key(popup.ActiveControl, VK_ESCAPE));
        WaitUntil("esc closed it too", () => resultReady);
        Do(() =>
        {
            Check("esc without a cancel button still closes", lastResult == DialogResult.Cancel, lastResult.ToString());
            popup = null;
            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(host); });
        });
        WaitUntil("modal for X", () => popup != null && popup.Visible);
        Do(() => ClickAt(popup.Right - 17, popup.Top + 16));
        WaitUntil("X closed it", () => resultReady);
        Do(() =>
        {
            Check("X: cancels", lastResult == DialogResult.Cancel, lastResult.ToString());
            SetCursorPos(savedCursor.X, savedCursor.Y);

            // Over the screen edge: stays inside the working area
            Rectangle area = Screen.PrimaryScreen.WorkingArea;
            host.Location = new Point(area.Right - 100, area.Bottom - 60);
            popup = null;
            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(host); });
        });
        WaitUntil("modal at the edge", () => popup != null && popup.Visible);
        Do(() =>
        {
            Check("edge: popup stays on screen", Screen.PrimaryScreen.WorkingArea.Contains(popup.Bounds), popup.Bounds.ToString());
            popup.Close();
        });
        WaitUntil("edge closed", () => resultReady);
        Do(() =>
        {
            host.Location = new Point(10, 10);

            // Too tall: scrolls, and the popup grows by the scrollbar
            popup = null;
            PostModal(() => { popup = new TestPopup(1000, 200); using (popup) return popup.ShowModal(host); });
        });
        WaitUntil("tall popup", () => popup != null && popup.Visible);
        Pause(2);
        Do(() =>
        {
            Check("scroll: height is capped", popup.ClientSize.Height == 32 + 200 + 46 + 2, popup.ClientSize.ToString());
            Check("scroll: grows by the scrollbar", popup.ClientSize.Width == 280 + 10 + 2, popup.ClientSize.ToString());
            Check("scroll: no native scrollbar", !popup.BodyPanel.AutoScroll && !((Panel)popup.BodyPanel.Parent).AutoScroll);
            Check("scroll: starts at the top", popup.BodyPanel.Top == 0);
            Capture(popup, "m2_scroll.png");
            Wheel(popup.Left + 200, popup.Top + 140, -120);
        });
        Pause(3);
        Do(() =>
        {
            Check("scroll: wheel moves the body", popup.BodyPanel.Top == -40, popup.BodyPanel.Top.ToString());
            for (int i = 0; i < 40; i++) Wheel(popup.Left + 200, popup.Top + 140, -120);
        });
        Pause(3);
        Do(() =>
        {
            Check("scroll: stops at the bottom", popup.BodyPanel.Top == -(1000 - 200), popup.BodyPanel.Top.ToString());
            Wheel(popup.Left + 200, popup.Top + 140, 120);
        });
        Pause(2);
        Do(() =>
        {
            Check("scroll: wheel goes back up", popup.BodyPanel.Top == -(1000 - 200) + 40, popup.BodyPanel.Top.ToString());
            SetCursorPos(savedCursor.X, savedCursor.Y);
            popup.No.PerformClick();
        });
        WaitUntil("tall closed", () => resultReady);
    }

    static void Theme_ThemeBorderSamples(TestPopup popup)
    {
        ThemeTokens t = ThemeTokens.Current;
        bool lit = false, normal = false, sawTicks = false;
        Stopwatch sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < 1100)
        {
            Application.DoEvents();
            if ((int)GetF(popup, "_attentionTicksLeft") > 0) sawTicks = true;
            Color c = PixelAt(popup.Left, popup.Top + popup.Height / 2);
            if (ColorsClose(c, t.AccentPrimary)) lit = true;
            if (ColorsClose(c, t.BorderColor)) normal = true;
            System.Threading.Thread.Sleep(15);
        }
        Check("modal: click on the host starts the blink", sawTicks);
        Check("modal: border lights up", lit, "accent " + t.AccentPrimary);
        Check("modal: border returns to normal", normal, "border " + t.BorderColor);
    }

    // ---------- The parallel way ----------
    static void BuildParallel()
    {
        TestPopup popup = null;
        int themeHandlersBefore = 0;
        Do(() =>
        {
            themeHandlersBefore = ThemeHandlers();
            hostClicks = 0;
            createCount = 0;
            popup = ModernDialog.ShowParallel(host, () => { createCount++; return new TestPopup(); });
        });
        Pause(3);
        Do(() =>
        {
            Check("parallel: open", popup.Visible);
            Check("parallel: host not locked", !WindowHelper.IsBlockedByDialog(host) && IsWindowEnabled(host.Handle));
            Check("parallel: owned by the host", popup.Owner == host);
            Check("parallel: not modal", !popup.Modal);
            int cx = host.Left + (host.Width - popup.Width) / 2, cy = host.Top + (host.Height - popup.Height) / 2;
            Check("parallel: centered too", Math.Abs(popup.Left - cx) <= 1 && Math.Abs(popup.Top - cy) <= 1, popup.Location + " vs " + cx + "," + cy);
            ClickAt(host.Left + 30, host.Top + 15);
        });
        Pause(3);
        Do(() =>
        {
            Check("parallel: host button works", hostClicks == 1, hostClicks.ToString());
            Check("parallel: popup stays above the host", TopAt(new Point(popup.Left + 100, popup.Top + 8)) == popup.Handle);
            ClickAt(popup.Left + popup.Input.Left + 40 + 1, popup.Top + 32 + 1 + popup.Input.Top + 8);
        });
        Pause(3);
        Do(() =>
        {
            Check("parallel: a click brings the focus back", GetForegroundWindow() == popup.Handle);
            Check("parallel: input has the focus", popup.Input.Focused);
            PostMessage(popup.Input.Handle, WM_CHAR, (IntPtr)'x', IntPtr.Zero);
        });
        Pause(2);
        Do(() =>
        {
            Check("parallel: typing reaches the popup", popup.Input.Text == "x", popup.Input.Text);
            ClickAt(host.Left + 30, host.Top + 15);
        });
        Pause(3);
        Do(() =>
        {
            Check("parallel: back and forth, host again", hostClicks == 2, hostClicks.ToString());
            Check("parallel: no blink ever", (int)GetF(popup, "_attentionTicksLeft") == 0);
            SetCursorPos(savedCursor.X, savedCursor.Y);
            TestPopup again = ModernDialog.ShowParallel(host, () => { createCount++; return new TestPopup(); });
            Check("parallel: one of a kind, the same one comes back", again == popup && createCount == 1, createCount.ToString());
            OtherPopup other = ModernDialog.ShowParallel(host, () => new OtherPopup());
            Check("parallel: another kind opens next to it", other.Visible && popup.Visible);
            other.Close();
            Check("parallel: closing one leaves the other", popup.Visible && other.IsDisposed);

            // Minimize and restore with the host
            ShowWindow(host.Handle, 6);
        });
        Pause(4);
        Do(() =>
        {
            Check("parallel: minimizes with the host", !IsWindowVisible(popup.Handle));
            ShowWindow(host.Handle, 9);
        });
        Pause(4);
        Do(() =>
        {
            Check("parallel: restores with the host", IsWindowVisible(popup.Handle));

            // Theme and language change while it is open
            ThemeTokens light = ThemeTokens.LightTheme();
            ThemeTokens.Current = light;
            popup.Refresh();
            Check("theme: body follows", popup.BodyPanel.BackColor == light.BgSecondary);
            Check("theme: buttons follow", popup.No.NormalColor == light.BgTertiary && popup.Ok.NormalColor == light.AccentPrimary);
            Check("theme: footer follows", popup.Ok.Parent.BackColor == light.BgPrimary);
            Capture(popup, "p1_parallel_light.png");
            ThemeTokens dark = ThemeTokens.DarkTheme();
            ThemeTokens.Current = dark;
            Check("theme: and back", popup.BodyPanel.BackColor == dark.BgSecondary);

            int rightBefore = popup.No.Right;
            setLang.Invoke(null, new object[] { "vi" });
            Check("language: popup told", popup.LanguageCalls == 1, popup.LanguageCalls.ToString());
            Check("language: title changes", (string)GetF(popup, "Title") == "Reworded");
            Check("language: row keeps its right edge", popup.No.Right == rightBefore, rightBefore + " -> " + popup.No.Right);
            Check("language: button grew", popup.Ok.Width >= TextRenderer.MeasureText(popup.Ok.Text, popup.Ok.Font).Width);
            setLang.Invoke(null, new object[] { "en" });
        });
        TestPopup modal = null;
        Do(() =>
        {
            PostModal(() => { modal = new TestPopup(); using (modal) return modal.ShowModal(host); });
        });
        WaitUntil("modal on top of parallel", () => modal != null && modal.Visible);
        Pause(2);
        Do(() =>
        {
            Check("modal over parallel: host locked", !IsWindowEnabled(host.Handle));
            Check("modal over parallel: parallel locked too", !IsWindowEnabled(popup.Handle));
            modal.No.PerformClick();
        });
        WaitUntil("modal over parallel closed", () => resultReady);
        Do(() =>
        {
            Check("modal closed: host free", IsWindowEnabled(host.Handle));
            Check("modal closed: parallel free", IsWindowEnabled(popup.Handle));
            popup.Activate();
        });
        Pause(2);
        Do(() =>
        {
            TestPopup.Order.Clear();
            popup.Input.Text = "done";
            popup.FormClosed += (s, e) => { lastResult = popup.DialogResult; resultReady = true; };
            resultReady = false;
            Key(popup.ActiveControl, VK_RETURN);
        });
        WaitUntil("parallel closed by enter", () => resultReady);
        Do(() =>
        {
            Check("parallel: result reaches the caller", lastResult == DialogResult.OK, lastResult.ToString());
            Check("parallel: beforeClose ran", TestPopup.Order.Count == 1 && TestPopup.Order[0] == "before:False:done", string.Join(",", TestPopup.Order.ToArray()));
            Check("parallel: disposes itself", popup.IsDisposed);
            Check("parallel: host stays", host.Visible);
            Check("parallel: theme handler released", ThemeHandlers() == themeHandlersBefore, themeHandlersBefore + " -> " + ThemeHandlers());
            ThemeTokens.Current = ThemeTokens.DarkTheme();

            popup = ModernDialog.ShowParallel(host, () => { createCount++; return new TestPopup(); });
            Check("parallel: a closed one opens fresh", createCount == 2 && !popup.IsDisposed, createCount.ToString());
        });
        Pause(2);
        Do(() =>
        {
            popup.Activate();
            Key(popup.ActiveControl, VK_ESCAPE);
        });
        WaitUntil("parallel esc", () => popup.IsDisposed);
        Do(() =>
        {
            Check("parallel: esc closes only the popup", host.Visible);

            // Closing the owner takes the popup with it
            Form owner2 = new Form { TopMost = true, StartPosition = FormStartPosition.Manual, Location = new Point(10, 340), Size = new Size(300, 200), FormBorderStyle = FormBorderStyle.None, BackColor = Color.Gray };
            owner2.Show();
            popup = ModernDialog.ShowParallel(owner2, () => new TestPopup());
            Check("owner closes: open", popup.Visible);
            owner2.Close();
        });
        Pause(3);
        Do(() =>
        {
            Check("owner closes: popup gone", popup.IsDisposed);
            Check("owner closes: no handle left", ThemeHandlers() == themeHandlersBefore, themeHandlersBefore + " -> " + ThemeHandlers());
        });
    }

    static int ThemeHandlers()
    {
        FieldInfo fi = typeof(ThemeTokens).GetField("OnThemeChanged", BindingFlags.Static | BindingFlags.NonPublic | BindingFlags.Public);
        Delegate d = (Delegate)fi.GetValue(null);
        return d == null ? 0 : d.GetInvocationList().Length;
    }

    // ---------- ModernMessageBox ----------
    static void BoxCase(string name, MessageBoxButtons buttons, MessageBoxIcon icon, Action<Form> act, DialogResult expected, Action<Form> extra = null)
    {
        Form box = null;
        Do(() =>
        {
            PostModal(() => ModernMessageBox.Show("Message for " + name, "Title & " + name, buttons, icon, host));
        });
        WaitUntil("box " + name, () => { box = Find<ModernMessageBox>(); return box != null && box.Visible; });
        Do(() =>
        {
            if (extra != null) extra(box);
            act(box);
        });
        WaitUntil("box closed " + name, () => resultReady);
        Do(() => Check("box " + name + ": result", lastResult == expected, lastResult.ToString()));
    }

    static void BuildMessageBox()
    {
        BoxCase("ok-enter", MessageBoxButtons.OK, MessageBoxIcon.Information, b => Key(b.ActiveControl, VK_RETURN), DialogResult.OK, b =>
        {
            Check("box: owner resolved", b.Owner == host);
            Check("box: host locked", !IsWindowEnabled(host.Handle));
            Check("box: focus on the button", b.ActiveControl is Button && ((Button)b.ActiveControl).Text == "OK");
            Capture(b, "b1_info.png");
        });
        BoxCase("ok-esc", MessageBoxButtons.OK, MessageBoxIcon.Warning, b => Key(b.ActiveControl, VK_ESCAPE), DialogResult.OK, b => Capture(b, "b2_warning.png"));
        BoxCase("okcancel-enter", MessageBoxButtons.OKCancel, MessageBoxIcon.Error, b => Key(b.ActiveControl, VK_RETURN), DialogResult.OK, b => Capture(b, "b3_error.png"));
        BoxCase("okcancel-esc", MessageBoxButtons.OKCancel, MessageBoxIcon.Question, b => Key(b.ActiveControl, VK_ESCAPE), DialogResult.Cancel, b => Capture(b, "b4_question.png"));
        BoxCase("yesno-enter", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, b => Key(b.ActiveControl, VK_RETURN), DialogResult.Yes);
        BoxCase("yesno-esc", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, b => Key(b.ActiveControl, VK_ESCAPE), DialogResult.No);
        BoxCase("yesno-no", MessageBoxButtons.YesNo, MessageBoxIcon.None, b => Press(b, "No"), DialogResult.No, b => Capture(b, "b5_noicon.png"));
        BoxCase("ync-no", MessageBoxButtons.YesNoCancel, MessageBoxIcon.Question, b => Press(b, "No"), DialogResult.No);
        BoxCase("ync-esc", MessageBoxButtons.YesNoCancel, MessageBoxIcon.Question, b => Key(b.ActiveControl, VK_ESCAPE), DialogResult.Cancel);

        // A control as the owner, no owner at all, a long message, the theme
        Form box = null;
        Do(() => PostModal(() => ModernMessageBox.Show("From a panel", "Panel", MessageBoxButtons.OK, MessageBoxIcon.None, hostPanel)));
        WaitUntil("box from a control", () => { box = Find<ModernMessageBox>(); return box != null && box.Visible; });
        Do(() =>
        {
            Check("box: a control resolves to its form", box.Owner == host);
            Press(box, "OK");
        });
        WaitUntil("control box closed", () => resultReady);
        Do(() => PostModal(() => ModernMessageBox.Show("No owner")));
        WaitUntil("box without owner", () => { box = Find<ModernMessageBox>(); return box != null && box.Visible; });
        Do(() =>
        {
            Check("box: default title is the app name", (string)GetF(box, "Title") == "Auto Clicker by Max", (string)GetF(box, "Title"));
            Press(box, "OK");
        });
        WaitUntil("no-owner box closed", () => resultReady);
        Do(() =>
        {
            StringBuilder longText = new StringBuilder();
            for (int i = 0; i < 80; i++) longText.AppendLine("A very long error line number " + i + " that also wraps because it keeps going on and on.");
            PostModal(() => ModernMessageBox.Show(longText.ToString(), "Long", MessageBoxButtons.OK, MessageBoxIcon.Error, host));
        });
        WaitUntil("long box", () => { box = Find<ModernMessageBox>(); return box != null && box.Visible; });
        Pause(2);
        Do(() =>
        {
            Check("box: long text stays on screen", Screen.PrimaryScreen.WorkingArea.Contains(box.Bounds), box.Bounds.ToString());
            Check("box: long text scrolls", FirstOf<ModernScrollBar>(box) != null);
            Capture(box, "b6_long.png");
            Press(box, "OK");
        });
        WaitUntil("long box closed", () => resultReady);
        Do(() =>
        {
            Call(f, "ApplyTheme", ThemeTokens.LightTheme());
            Check("main window sets the shared theme", ThemeTokens.Current.IsDark == false);
            PostModal(() => ModernMessageBox.Show("In light", "Light", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, f));
        });
        WaitUntil("light box", () => { box = Find<ModernMessageBox>(); return box != null && box.Visible; });
        Pause(2);
        Do(() =>
        {
            Check("box: follows the app's theme", box.BackColor == ThemeTokens.LightTheme().BgSecondary);
            Capture(box, "b7_light.png");
            Press(box, "No");
        });
        WaitUntil("light box closed", () => resultReady);
        Do(() => Call(f, "ApplyTheme", ThemeTokens.DarkTheme()));
    }

    // ---------- The real popups, on the real main window ----------
    static void BuildRealPopups()
    {
        BatchNumberInputDialog num = null;
        Do(() =>
        {
            f.Activate();
            PostModal(() => { num = new BatchNumberInputDialog("Set Delay", "Delay (ms)", 0, 1000, 100, ThemeTokens.Current); using (num) return num.ShowModal(f); });
        });
        WaitUntil("number popup", () => num != null && num.Visible);
        Pause(2);
        Do(() =>
        {
            Check("number: main window locked", WindowHelper.IsBlockedByDialog(f));
            Check("number: the input has the focus", num.ActiveControl is NumberInput || FirstOf<ModernAutoClicker.NumberInput>(num).Focused);
            FirstOf<ModernAutoClicker.NumberInput>(num).Value = 250;
            Key(num.ActiveControl, VK_RETURN);
        });
        WaitUntil("number closed", () => resultReady);
        Do(() =>
        {
            Check("number: enter applies", lastResult == DialogResult.OK && num.ResultValue == 250, lastResult + " " + num.ResultValue);
            Check("number: main window free", !WindowHelper.IsBlockedByDialog(f));
            num = null;
            PostModal(() => { num = new BatchNumberInputDialog("Set Delay", "Delay (ms)", 0, 1000, 100, ThemeTokens.Current); using (num) return num.ShowModal(f); });
        });
        WaitUntil("number popup 2", () => num != null && num.Visible);
        Do(() => num.Close());
        WaitUntil("number X", () => resultReady);
        Do(() =>
        {
            Check("number: closing gives nothing", lastResult == DialogResult.Cancel && num.ResultValue == null, lastResult.ToString());
            num = null;
            PostModal(() => { num = new BatchNumberInputDialog("Set", "Duration", 0, 100000, 1500, ThemeTokens.Current, 0); using (num) return num.ShowModal(f); });
        });
        WaitUntil("duration popup", () => num != null && num.Visible);
        Do(() => Press(num, Loc.IsVietnamese ? "Áp dụng" : "Apply All"));
        WaitUntil("duration closed", () => resultReady);
        Do(() => Check("duration: value comes back in ms", lastResult == DialogResult.OK && num.ResultValue == 1500, lastResult + " " + num.ResultValue));

        BatchTextInputDialog text = null;
        Do(() => PostModal(() => { text = new BatchTextInputDialog("Set Text", "Text", "hello", ThemeTokens.Current); using (text) return text.ShowModal(f); }));
        WaitUntil("text popup", () => text != null && text.Visible);
        Pause(2);
        Do(() =>
        {
            TextBox box = FirstOf<TextBox>(text);
            Check("text: the input has the focus and is selected", box.Focused && box.SelectionLength == 5);
            box.Text = "changed";
            Key(box, VK_RETURN);
        });
        WaitUntil("text closed", () => resultReady);
        Do(() => Check("text: enter applies", lastResult == DialogResult.OK && text.ResultValue == "changed", lastResult + " " + text.ResultValue));
        Do(() => { text = null; PostModal(() => { text = new BatchTextInputDialog("Set Text", "Text", "hello", ThemeTokens.Current); using (text) return text.ShowModal(f); }); });
        WaitUntil("text popup 2", () => text != null && text.Visible);
        Do(() => Key(FirstOf<TextBox>(text), VK_ESCAPE));
        WaitUntil("text esc", () => resultReady);
        Do(() => Check("text: esc gives nothing", lastResult == DialogResult.Cancel && text.ResultValue == null, lastResult.ToString()));

        ModernColorDialog color = null;
        Do(() => PostModal(() => { color = new ModernColorDialog(Color.Tomato, 12, ThemeTokens.Current); using (color) return color.ShowModal(f); }));
        WaitUntil("color popup", () => color != null && color.Visible);
        Pause(2);
        Do(() =>
        {
            Check("color: starts on Apply, not in an input", color.ActiveControl == color.AcceptButton);
            FirstOf<ModernAutoClicker.NumberInput>(color).Value = 40;
            FirstOf<ModernAutoClicker.ModernTextBox>(color).Text = "#102030";
            color.BeginInvoke((Action)(() => Press(color, "Pick from Screen"))); // Opens a modal picker, not inside the timer tick
        });
        WaitUntil("picker over the popup", () => FindByName("CoordinatePicker") != null);
        Pause(2);
        Do(() =>
        {
            Check("color pick: popup steps aside", !IsWindowVisible(color.Handle));
            Check("color pick: main window still locked", WindowHelper.IsBlockedByDialog(f));
            FindByName("CoordinatePicker").Close();
        });
        WaitUntil("popup back after the picker", () => FindByName("CoordinatePicker") == null && color.Visible);
        Pause(2);
        Do(() =>
        {
            Check("color pick: popup is back", IsWindowVisible(color.Handle) && !resultReady);
            Check("color pick: main window still locked after", WindowHelper.IsBlockedByDialog(f));
            Press(color, "Apply");
        });
        WaitUntil("color closed", () => resultReady);
        Do(() => Check("color: apply keeps the values", lastResult == DialogResult.OK && color.ColorHex == "#102030" && color.Tolerance == 40, lastResult + " " + color.ColorHex + " " + color.Tolerance));

        ModernImageDialog image = null;
        Bitmap sample = new Bitmap(60, 40);
        Do(() => PostModal(() => { image = new ModernImageDialog(sample, 80, ThemeTokens.Current); using (image) return image.ShowModal(f); }));
        WaitUntil("image popup", () => image != null && image.Visible);
        Pause(2);
        Do(() =>
        {
            Check("image: starts on Apply", image.ActiveControl == image.AcceptButton);
            FirstOf<ModernAutoClicker.NumberInput>(image).Value = 77;
            Press(image, Loc.IsVietnamese ? "Xóa ảnh mẫu" : "Clear Template Image");
            Check("image: clear works inside the frame", image.SelectedBitmap == null && image.ImageChanged);
            image.BeginInvoke((Action)(() => Press(image, Loc.IsVietnamese ? "Chụp từ màn hình" : "Capture from Screen")));
        });
        WaitUntil("snip over the popup", () => FindByName("CoordinatePicker") != null);
        Pause(2);
        Do(() =>
        {
            Check("image snip: popup steps aside", !IsWindowVisible(image.Handle));
            FindByName("CoordinatePicker").Close();
        });
        WaitUntil("popup back after the snip", () => FindByName("CoordinatePicker") == null && image.Visible);
        Pause(2);
        Do(() =>
        {
            Check("image snip: popup is back", IsWindowVisible(image.Handle) && !resultReady);
            Press(image, Loc.IsVietnamese ? "Áp dụng" : "Apply");
        });
        WaitUntil("image closed", () => resultReady);
        int similarity = 0;
        Do(() =>
        {
            Check("image: apply keeps the similarity", lastResult == DialogResult.OK && (similarity = (int)GetF(image, "_similarity")) == 77, lastResult + " " + similarity);
        });

        // Move & Scale, through the real button handler
        Form move = null;
        Do(() =>
        {
            Call(f, "SwitchTab", 1);
            Call(f, "SwitchSimpleTab", 0);
            ((RadioButton)GetF(f, "radModePoints")).Checked = true;
            Call(GetF(f, "lstPoints"), "SetPoints", new List<Point> { new Point(100, 100) });
            f.BeginInvoke((Action)(() => Call(f, "ToggleTransformTool")));
        });
        WaitUntil("move popup", () => { move = FindByName("MapTransformToolWindow"); return move != null && move.Visible; });
        Pause(2);
        Do(() =>
        {
            Check("move: main window locked", WindowHelper.IsBlockedByDialog(f));
            Check("move: starts on Close, not in the scale box", move.ActiveControl == move.AcceptButton);
            Capture(move, "r1_move.png");
            ((Button)GetF(move, "btnRight")).PerformClick();
            ((Button)GetF(move, "btnDown")).PerformClick();
            List<Point> pts = (List<Point>)Call(GetF(f, "lstPoints"), "GetPoints");
            Check("move: arrows move the point right away", pts[0] == new Point(110, 110), pts[0].ToString());
            Key(move.ActiveControl, VK_ESCAPE);
        });
        WaitUntil("move esc", () => FindByName("MapTransformToolWindow") == null);
        Do(() =>
        {
            List<Point> pts = (List<Point>)Call(GetF(f, "lstPoints"), "GetPoints");
            Check("move: esc keeps the moves", pts[0] == new Point(110, 110), pts[0].ToString());
            Check("move: main window free", !WindowHelper.IsBlockedByDialog(f));
            ((CheckBox)GetF(f, "chkShowMap")).Checked = false;
        });
    }

    // ---------- F6 and F7 around popups ----------
    static void SendHotkey(string constName)
    {
        Type nm = typeof(ModernDialog).Assembly.GetType("ModernAutoClicker.NativeMethods");
        FieldInfo id = nm.GetField(constName, BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
        SetF(f, "_lastToggleTime", DateTime.MinValue);
        PostMessage(f.Handle, WM_HOTKEY, (IntPtr)Convert.ToInt32(id.GetValue(null)), IntPtr.Zero);
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

    static bool ActiveRunning() { return (bool)GetF(f, "IsActiveTabRunning"); }
    static bool AnyRunning() { return (bool)GetF(f, "IsAnyRunning"); }

    static void BuildHotkeys()
    {
        Win target = null;
        TestPopup popup = null;
        Do(() =>
        {
            foreach (string file in Directory.GetFiles(tgDir, "*.clicks")) File.Delete(file);
            target = OpenTarget("hk", "Hotkey target", 1);
            ((CheckBox)GetF(f, "chkFreeMouse")).Checked = true;
            SetF(f, "_simpleRelativeToWindow", true);
            SetF(f, "_simpleTargetProcessName", Proc);
            SetF(f, "_simpleTargetWindowTitle", target.Title);
            SetF(f, "_simpleTargetWindowIndex", 0);
            SetF(f, "_simpleTargetHwnd", target.H);
            SetF(f, "_simpleTargetPid", target.Pid);
            Call(f, "UpdateSimpleTargetWindowButtonDisplay");
            Call(GetF(f, "lstPoints"), "SetPoints", new List<Point> { new Point(20, 20) });
            Call(f, "UpdatePointsHeader");
            Call(f, "UpdateStartButtonState");

            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(f); });
        });
        WaitUntil("modal on the main window", () => popup != null && popup.Visible);
        Do(() => SendHotkey("HOTKEY_START_ID"));
        Pause(5);
        Do(() =>
        {
            Check("F6 with a modal popup: nothing starts", !AnyRunning());
            Check("F6 with a modal popup: popup untouched", popup.Visible && !resultReady);
            popup.No.PerformClick();
        });
        WaitUntil("modal closed", () => resultReady);
        Do(() => SendHotkey("HOTKEY_START_ID"));
        WaitUntil("F6 with no popup starts", () => ActiveRunning() && Clicks("hk") > 0);
        Do(() =>
        {
            Check("F6 with no popup: runs", ActiveRunning());
            popup = null;
            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(f); });
        });
        WaitUntil("modal during a run", () => popup != null && popup.Visible);
        Do(() => Check("modal during a run: still running", ActiveRunning()));
        Do(() => SendHotkey("HOTKEY_START_ID"));
        WaitUntil("F6 stops behind a modal", () => !ActiveRunning());
        Do(() =>
        {
            Check("F6 with a modal popup: a run can be stopped", !AnyRunning());
            Check("F6 stop: popup stays", popup.Visible && !resultReady);
            SendHotkey("HOTKEY_START_ID");
        });
        Pause(5);
        Do(() =>
        {
            Check("F6 again: does not start behind the modal", !AnyRunning());
            popup.No.PerformClick();
        });
        WaitUntil("modal closed 2", () => resultReady);
        Do(() => SendHotkey("HOTKEY_START_ID"));
        WaitUntil("started again", () => ActiveRunning());
        Do(() =>
        {
            popup = null;
            PostModal(() => { popup = new TestPopup(); using (popup) return popup.ShowModal(f); });
        });
        WaitUntil("modal for F7", () => popup != null && popup.Visible);
        Do(() => SendHotkey("HOTKEY_STOP_ALL_ID"));
        WaitUntil("F7 stops behind a modal", () => !AnyRunning());
        Do(() =>
        {
            Check("F7 with a modal popup: stops", !AnyRunning());
            popup.No.PerformClick();
        });
        WaitUntil("modal closed 3", () => resultReady);

        // Next to a parallel popup the main window works as usual
        Do(() =>
        {
            popup = ModernDialog.ShowParallel(f, () => new TestPopup());
            SendHotkey("HOTKEY_START_ID");
        });
        WaitUntil("F6 starts next to a parallel popup", () => ActiveRunning());
        Do(() =>
        {
            Check("parallel on main: F6 starts", ActiveRunning());
            Check("parallel on main: popup stays open", popup.Visible);
            SendHotkey("HOTKEY_START_ID");
        });
        WaitUntil("F6 stops next to a parallel popup", () => !AnyRunning());
        Do(() =>
        {
            Check("parallel on main: F6 stops", !AnyRunning());
            target.P.Kill();
            target.P.WaitForExit(2000);
            popup.Close();
            ((CheckBox)GetF(f, "chkFreeMouse")).Checked = false;
            SetF(f, "_simpleRelativeToWindow", false);
            SetF(f, "_simpleTargetProcessName", "");
            SetF(f, "_simpleTargetWindowTitle", "");
            SetF(f, "_simpleTargetHwnd", IntPtr.Zero);
            SetF(f, "_simpleTargetPid", (uint)0);
        });
    }
}
