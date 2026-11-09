using System;
using System.Collections.Generic;
using System.Drawing;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker;
using ModernAutoClicker.Advanced;

// Drives ActionRecorder's hook handlers with key/mouse event sequences (real time, fake key state) and checks the recorded steps.
class PressClickTest
{
    [DllImport("user32.dll")] static extern uint MapVirtualKey(uint uCode, uint uMapType);

    static int pass = 0, fail = 0;
    static ActionRecorder rec;
    static HashSet<int> down = new HashSet<int>();
    static List<MacroStep> steps = new List<MacroStep>();
    static BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic;

    static void Call(string name, params object[] args) { rec.GetType().GetMethod(name, bf).Invoke(rec, args); }
    static void SetField(string name, object v) { rec.GetType().GetField(name, bf).SetValue(rec, v); }

    static void Start()
    {
        rec = new ActionRecorder();
        down.Clear();
        lock (steps) steps.Clear();
        // Like GetAsyncKeyState: the generic Ctrl / Shift / Alt codes report either side
        rec.IsKeyPhysicallyDown = vk =>
        {
            lock (down)
            {
                if (vk == (int)Keys.ControlKey) return down.Contains((int)Keys.LControlKey) || down.Contains((int)Keys.RControlKey);
                if (vk == (int)Keys.ShiftKey) return down.Contains((int)Keys.LShiftKey) || down.Contains((int)Keys.RShiftKey);
                if (vk == (int)Keys.Menu) return down.Contains((int)Keys.LMenu) || down.Contains((int)Keys.RMenu);
                return down.Contains(vk);
            }
        };
        rec.OnActionCaptured += s => { lock (steps) steps.Add(s); };
        SetField("_isRecording", true);
    }

    // The hook runs before the system key state changes, so the handler is called first, then the state is updated
    static void KD(Keys k) { Call("HandleKeyDown", (uint)k, MapVirtualKey((uint)k, 0), Environment.TickCount); lock (down) down.Add((int)k); }
    static void KRepeat(Keys k) { Call("HandleKeyDown", (uint)k, MapVirtualKey((uint)k, 0), Environment.TickCount); }
    static void KU(Keys k) { Call("HandleKeyUp", (uint)k, Environment.TickCount); lock (down) down.Remove((int)k); }
    static void Tap(Keys k, int holdMs) { KD(k); W(holdMs); KU(k); }
    static void MD(int btn) { Call("HandleMouseDown", new Point(100, 100), btn); lock (down) down.Add(btn == 0 ? 1 : (btn == 1 ? 2 : 4)); }
    static void MU(int btn, Point pt) { Call("HandleMouseUp", pt, btn); lock (down) down.Remove(btn == 0 ? 1 : (btn == 1 ? 2 : 4)); }
    static void MU(int btn) { MU(btn, new Point(100, 100)); }
    static void W(int ms) { Thread.Sleep(ms); }

    static string Describe(MacroStep s)
    {
        switch (s.ActionType)
        {
            case MacroActionType.PressAndClick:
                return string.Format("PnC[{0}|order{1}|mode{2}|btn{3}]", s.KeyData, s.PressClickOrder, s.PressClickMode, s.DragButton);
            case MacroActionType.KeyPress: return "Key[" + s.KeyData + "]";
            case MacroActionType.TypeText: return "Text[" + s.KeyData.Replace("\n", "\\n") + "]";
            default: return s.ActionType.ToString();
        }
    }

    static List<MacroStep> Finish()
    {
        rec.StopRecording();
        W(100);
        lock (steps) return new List<MacroStep>(steps);
    }

    static void Check(string name, List<MacroStep> got, params string[] expected)
    {
        List<string> d = got.ConvertAll(Describe);
        bool ok = string.Join(", ", d.ToArray()) == string.Join(", ", expected);
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + " -> " + string.Join(", ", d.ToArray()) + (ok ? "" : "   expected " + string.Join(", ", expected)));
    }

    static void CheckHold(string name, MacroStep s, int min, int max)
    {
        bool ok = s.HoldMs >= min && s.HoldMs <= max;
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + " -> Hold " + s.HoldMs + "ms (want " + min + "-" + max + ")");
    }

    static void CheckDelay(string name, MacroStep s, int min, int max)
    {
        bool ok = s.DelayMs >= min && s.DelayMs <= max && s.BaseDelayMs == s.DelayMs;
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + " -> Delay " + s.DelayMs + "ms (want " + min + "-" + max + ")");
    }

    static void Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        List<MacroStep> r;

        Start(); KD(Keys.LControlKey); W(80); MD(0); W(60); MU(0); KU(Keys.LControlKey);
        Check("Ctrl held + click", Finish(), "PnC[Ctrl|order0|mode0|btn0]");

        Start(); KD(Keys.LControlKey); KD(Keys.LShiftKey); W(80); MD(0); W(60); MU(0); KU(Keys.LShiftKey); KU(Keys.LControlKey);
        Check("Ctrl+Shift held + click", Finish(), "PnC[Ctrl+Shift|order0|mode0|btn0]");

        Start(); KD(Keys.LControlKey); W(50); MD(0); W(40); MU(0); W(80); MD(0); W(40); MU(0); KU(Keys.LControlKey);
        Check("Ctrl held + 2 clicks (multi-select)", Finish(), "PnC[Ctrl|order0|mode0|btn0]", "PnC[Ctrl|order0|mode0|btn0]");

        Start(); KD(Keys.Space); W(150); MD(0); W(60); MU(0); KU(Keys.Space);
        Check("Space held + click: no extra Key Press", Finish(), "PnC[Space|order0|mode0|btn0]");

        Start(); Tap(Keys.Space, 120);
        r = Finish(); Check("Space tap", r, "Key[Space]"); CheckHold("Space tap hold time", r[0], 110, 200);

        Start(); KD(Keys.A); W(300); MD(0); W(60); MU(0); KU(Keys.A);
        Check("A held alone + click: no Type Text", Finish(), "PnC[A|order0|mode0|btn0]");

        Start(); KD(Keys.A); W(1800); MD(0); W(60); MU(0); KU(Keys.A);
        Check("A held 1.8s (past text pause) + click", Finish(), "PnC[A|order0|mode0|btn0]");

        Start(); Tap(Keys.H, 40); W(40); Tap(Keys.E, 40); W(40); Tap(Keys.L, 40); W(40); Tap(Keys.L, 40); W(40);
        KD(Keys.O); W(60); MD(0); W(40); MU(0); KU(Keys.O);
        Check("typing 'hello' and clicking while 'o' is still down", Finish(), "Text[hello]", "LeftClick");

        Start(); KD(Keys.Space); for (int i = 0; i < 6; i++) { W(35); KRepeat(Keys.Space); } W(30); KU(Keys.Space);
        r = Finish(); Check("held Space with auto-repeat", r, "Key[Space]"); CheckHold("held Space hold time", r[0], 230, 400);

        Start(); KD(Keys.A); for (int i = 0; i < 6; i++) { W(35); KRepeat(Keys.A); } KU(Keys.A);
        Check("held A with auto-repeat", Finish(), "Key[a]");

        Start(); MD(0); W(50); KD(Keys.LControlKey); W(60); KU(Keys.LControlKey); W(30); MU(0);
        Check("click first: button, then Ctrl", Finish(), "PnC[Ctrl|order1|mode0|btn0]");

        Start(); MD(0); W(50); KD(Keys.E); W(200); KU(Keys.E); W(30); MU(0);
        r = Finish(); Check("click first: button, then E", r, "PnC[E|order1|mode0|btn0]"); CheckHold("click first key hold", r[0], 190, 280);

        Start(); MD(0); W(30); KD(Keys.LControlKey); W(30); KD(Keys.C); W(40); KU(Keys.C); KU(Keys.LControlKey); MU(0);
        Check("click first: button, Ctrl, then C", Finish(), "PnC[Ctrl+C|order1|mode0|btn0]");

        Start(); KD(Keys.LControlKey); W(50); MD(1); SetField("_isDragging", true); W(60); MU(1, new Point(300, 200)); KU(Keys.LControlKey);
        r = Finish(); Check("Ctrl + right-button drag", r, "PnC[Ctrl|order0|mode3|btn1]");
        bool endOk = r.Count == 1 && r[0].EndPoint == new Point(300, 200) && r[0].StartPoint == new Point(100, 100);
        if (endOk) pass++; else fail++;
        Console.WriteLine((endOk ? "PASS " : "FAIL ") + "drag start/end points kept");

        Start(); KD(Keys.LControlKey); Tap(Keys.C, 40); KU(Keys.LControlKey); W(30); KD(Keys.LWin); Tap(Keys.D, 40); KU(Keys.LWin);
        Check("shortcuts Ctrl+C and Win+D", Finish(), "Key[Ctrl+C]", "Key[Win+D]");

        Start(); Tap(Keys.Tab, 60); W(30); Tap(Keys.A, 40); Tap(Keys.B, 40);
        Check("Tab then typing", Finish(), "Key[Tab]", "Text[ab]");

        Start(); KD(Keys.Up); W(150); Tap(Keys.Space, 60); W(100); KU(Keys.Up);
        r = Finish(); Check("Up held, Space tapped meanwhile: kept in press order", r, "Key[Up]", "Key[Space]");
        if (r.Count == 2) CheckHold("Up recorded with hold until Space", r[0], 140, 260);

        Start(); foreach (Keys k in new[] { Keys.H, Keys.I, Keys.Space, Keys.T, Keys.H, Keys.E, Keys.R, Keys.E }) { Tap(k, 30); W(30); }
        Check("text with space stays one Type Text", Finish(), "Text[hi there]");

        Start(); KD(Keys.LShiftKey); Tap(Keys.H, 40); KU(Keys.LShiftKey); Tap(Keys.E, 40); Tap(Keys.Y, 40);
        Check("Shift for a capital while typing", Finish(), "Text[Hey]");

        Start(); Tap(Keys.A, 30); Tap(Keys.B, 30); Tap(Keys.C, 30);
        Check("stop recording keeps text still being typed", Finish(), "Text[abc]");

        Start(); MD(0); W(40); MU(0);
        Check("stop recording keeps a click waiting for double-click", Finish(), "LeftClick");

        Start(); KD(Keys.Space); W(60); lock (down) down.Remove((int)Keys.Space); W(30); MD(0); W(40); MU(0);
        Check("missed key-up: Space released unseen, then click", Finish(), "Key[Space]", "LeftClick");

        Start(); KD(Keys.LControlKey); W(40); KU(Keys.LControlKey); W(40); MD(0); W(40); MU(0);
        Check("Ctrl pressed and released before click", Finish(), "LeftClick");

        Start(); MD(0); W(40); MU(0); W(60); MD(0); W(40); MU(0);
        Check("double click", Finish(), "DoubleClick");

        // Delays: the pause after each action belongs to that step (the player waits after the action)
        int delayEvents = 0;
        Start(); rec.OnStepDelayChanged += s => delayEvents++;
        MD(0); W(50); MU(0); W(400); Tap(Keys.Tab, 60); W(300); Tap(Keys.A, 30); Tap(Keys.B, 30); W(250); MD(1); W(40); MU(1);
        r = Finish();
        Check("delay sequence steps", r, "LeftClick", "Key[Tab]", "Text[ab]", "RightClick");
        if (r.Count == 4)
        {
            CheckDelay("click -> Tab pause", r[0], 390, 460);
            CheckDelay("Tab -> typing pause", r[1], 290, 360);
            CheckDelay("typing -> right click pause", r[2], 240, 320);
            CheckDelay("last step keeps default", r[3], 240, 240);
        }
        bool evOk = delayEvents == 3;
        if (evOk) pass++; else fail++;
        Console.WriteLine((evOk ? "PASS " : "FAIL ") + "delay-changed events: " + delayEvents + " (want 3)");

        Start(); KD(Keys.Up); W(150); Tap(Keys.Space, 60); W(100); KU(Keys.Up);
        r = Finish();
        if (r.Count == 2) CheckDelay("overlapping keys: minimum delay", r[0], 30, 30);

        Console.WriteLine("pass=" + pass + " fail=" + fail);
    }
}
