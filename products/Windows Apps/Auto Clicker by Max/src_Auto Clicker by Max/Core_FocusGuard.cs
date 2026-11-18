using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using MaxApp.Common;

namespace ModernAutoClicker
{
    /// <summary>
    /// Chrome, Edge and other Chromium windows bring themselves to the front when they get a posted click, even from another app,
    /// so a Free Mouse run on one of them keeps taking the keyboard away from the window the user works in.
    /// The guard puts the user's window back when the front window changes to a window that just got background input,
    /// unless the user switched on purpose: Alt or Win pressed (Alt+Tab, Win+number) or a click outside the front window (taskbar, the window itself).
    ///
    /// It runs only while background input is being sent and stops on its own a few seconds after the last one.
    /// The physical keyboard and mouse are read through Raw Input only to tell "the user pressed Alt / Win" and
    /// "the user clicked outside the front window" apart from everything else; no key is recorded or kept.
    /// </summary>
    public static class FocusGuard
    {
        private const int CausedByInputMs = 1000; // a front-window change this soon after background input to that window is taken as caused by it
        private const int UserSwitchMs = 1000;    // a switch this soon after Alt / Win or an outside click is the user's
        private const int IdleStopMs = 5000;

        private static readonly object Gate = new object();
        private static readonly Dictionary<IntPtr, int> _recentTargets = new Dictionary<IntPtr, int>();
        private static Thread _thread;
        private static int _lastNoteTick;
        private static IntPtr _startForeground;

        // Guard thread only
        private static IntPtr _userWindow;
        private static int _lastSwitchKeyTick = Environment.TickCount - UserSwitchMs * 2;
        private static int _lastClickTick = Environment.TickCount - UserSwitchMs * 2;
        private static IntPtr _lastClickWindow;
        private static WinEventDelegate _onForeground; // kept in a field: the hook calls it after this method returns

        public static void NoteBackgroundInput(IntPtr targetHwnd)
        {
            IntPtr top = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (top == IntPtr.Zero) return;
            lock (Gate)
            {
                _lastNoteTick = Environment.TickCount;
                _recentTargets[top] = _lastNoteTick;
                if (_thread != null) return;
                _startForeground = NativeMethods.GetForegroundWindow(); // before the click goes out, so a switch it causes is seen even while the guard starts
                _thread = new Thread(Run) { IsBackground = true, Name = "FocusGuard" };
                _thread.SetApartmentState(ApartmentState.STA);
                _thread.Start();
            }
        }

        private static void Run()
        {
            IntPtr hook = IntPtr.Zero;
            InputSink sink = null;
            try
            {
                lock (Gate) { _userWindow = _startForeground; }
                _onForeground = OnForegroundChanged;
                hook = SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, IntPtr.Zero, _onForeground, 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS);
                sink = new InputSink();
                IntPtr now = NativeMethods.GetForegroundWindow();
                if (now != _userWindow) OnForegroundChanged(hook, EVENT_SYSTEM_FOREGROUND, now, 0, 0, 0, 0);

                System.Windows.Forms.Timer idle = new System.Windows.Forms.Timer { Interval = 1000 };
                idle.Tick += (s, e) =>
                {
                    lock (Gate)
                    {
                        if (unchecked(Environment.TickCount - _lastNoteTick) < IdleStopMs) return;
                        _thread = null; // a note from now on starts a new guard
                        _recentTargets.Clear();
                    }
                    idle.Stop();
                    Application.ExitThread();
                };
                idle.Start();
                Application.Run();
                idle.Dispose();
            }
            catch (Exception ex)
            {
                AppLog.Error("Focus guard", ex);
                lock (Gate) { _thread = null; }
            }
            finally
            {
                if (hook != IntPtr.Zero) UnhookWinEvent(hook);
                if (sink != null) sink.Close();
            }
        }

        private static void OnForegroundChanged(IntPtr hook, uint evt, IntPtr hwnd, int idObject, int idChild, uint thread, uint time)
        {
            if (hwnd == IntPtr.Zero) return;
            int now = Environment.TickCount;
            bool causedByUs;
            lock (Gate)
            {
                int noted;
                causedByUs = _recentTargets.TryGetValue(hwnd, out noted) && unchecked(now - noted) < CausedByInputMs;
            }
            IntPtr back = _userWindow;
            bool userSwitched = unchecked(now - _lastSwitchKeyTick) < UserSwitchMs ||
                                (unchecked(now - _lastClickTick) < UserSwitchMs && _lastClickWindow != back);

            if (causedByUs && !userSwitched && back != hwnd && back != IntPtr.Zero &&
                NativeMethods.IsWindow(back) && NativeMethods.IsWindowVisible(back) && !NativeMethods.IsIconic(back))
            {
                // Windows refuses to change the front window for a process that did not give the last input.
                // A mouse move of 0 pixels counts as that input without moving the cursor; Windows takes it in a moment later, hence the retries.
                NativeMethods.INPUT[] still = new NativeMethods.INPUT[1];
                still[0].type = NativeMethods.INPUT_MOUSE;
                still[0].u.mi.dwFlags = 0x0001; // MOUSEEVENTF_MOVE
                NativeMethods.SendInput(1, still, Marshal.SizeOf(typeof(NativeMethods.INPUT)));
                for (int attempt = 0; attempt < 10 && NativeMethods.GetForegroundWindow() != back; attempt++)
                {
                    NativeMethods.ForceSetForegroundWindow(back);
                    if (NativeMethods.GetForegroundWindow() != back) Thread.Sleep(10);
                }
                return;
            }
            _userWindow = hwnd;
        }

        private static void OnPhysicalInput(bool isKeyboard, int vKeyOrButtons)
        {
            if (isKeyboard)
            {
                if (vKeyOrButtons == 0x12 || vKeyOrButtons == 0xA4 || vKeyOrButtons == 0xA5 || vKeyOrButtons == 0x5B || vKeyOrButtons == 0x5C) // Alt, Win
                {
                    _lastSwitchKeyTick = Environment.TickCount;
                }
                return;
            }

            // Which window was clicked, not the front window now: the switch a click causes may already have happened
            NativeMethods.POINT cursor;
            if (!NativeMethods.GetCursorPos(out cursor)) return;
            _lastClickWindow = NativeMethods.GetTopLevelWindow(NativeMethods.WindowFromPoint(cursor));
            _lastClickTick = Environment.TickCount;
        }

        // A message-only window that receives the physical keyboard and mouse while another app is in front
        private class InputSink : NativeWindow
        {
            private const int WM_INPUT = 0x00FF;
            private const uint RIDEV_INPUTSINK = 0x00000100, RIDEV_REMOVE = 0x00000001, RID_INPUT = 0x10000003;
            private const uint RIM_TYPEMOUSE = 0, RIM_TYPEKEYBOARD = 1;
            private const int MouseButtonDownFlags = 0x0001 | 0x0004 | 0x0010 | 0x0040 | 0x0100;

            private readonly int _headerSize = 8 + IntPtr.Size * 2;

            public InputSink()
            {
                CreateHandle(new CreateParams { Parent = (IntPtr)(-3) /* HWND_MESSAGE */ });
                Register(0);
            }

            public void Close()
            {
                Register(RIDEV_REMOVE);
                DestroyHandle();
            }

            private void Register(uint flags)
            {
                bool remove = flags == RIDEV_REMOVE;
                RAWINPUTDEVICE[] devices =
                {
                    new RAWINPUTDEVICE { UsagePage = 0x01, Usage = 0x02, Flags = remove ? RIDEV_REMOVE : RIDEV_INPUTSINK, Target = remove ? IntPtr.Zero : Handle }, // mouse
                    new RAWINPUTDEVICE { UsagePage = 0x01, Usage = 0x06, Flags = remove ? RIDEV_REMOVE : RIDEV_INPUTSINK, Target = remove ? IntPtr.Zero : Handle }  // keyboard
                };
                RegisterRawInputDevices(devices, (uint)devices.Length, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICE)));
            }

            protected override void WndProc(ref Message m)
            {
                if (m.Msg == WM_INPUT) Read(m.LParam);
                base.WndProc(ref m);
            }

            private void Read(IntPtr hRawInput)
            {
                uint size = 0;
                GetRawInputData(hRawInput, RID_INPUT, null, ref size, (uint)_headerSize);
                if (size < _headerSize + 8 || size > 1024) return;
                byte[] data = new byte[size];
                if (GetRawInputData(hRawInput, RID_INPUT, data, ref size, (uint)_headerSize) != size) return;

                uint type = BitConverter.ToUInt32(data, 0);
                long device = IntPtr.Size == 8 ? BitConverter.ToInt64(data, 8) : BitConverter.ToInt32(data, 8);
                if (device == 0) return; // injected input (SendInput) has no device: it is not the user

                if (type == RIM_TYPEKEYBOARD)
                {
                    bool keyDown = (BitConverter.ToUInt16(data, _headerSize + 2) & 0x01) == 0; // RI_KEY_BREAK is a release
                    if (keyDown) OnPhysicalInput(true, BitConverter.ToUInt16(data, _headerSize + 6));
                }
                else if (type == RIM_TYPEMOUSE)
                {
                    int buttonFlags = BitConverter.ToUInt16(data, _headerSize + 4);
                    if ((buttonFlags & MouseButtonDownFlags) != 0) OnPhysicalInput(false, buttonFlags);
                }
            }
        }

        private delegate void WinEventDelegate(IntPtr hook, uint evt, IntPtr hwnd, int idObject, int idChild, uint thread, uint time);

        private const uint EVENT_SYSTEM_FOREGROUND = 0x0003;
        private const uint WINEVENT_OUTOFCONTEXT = 0x0000, WINEVENT_SKIPOWNPROCESS = 0x0002;

        [DllImport("user32.dll")]
        private static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr hmod, WinEventDelegate callback, uint idProcess, uint idThread, uint flags);

        [DllImport("user32.dll")]
        private static extern bool UnhookWinEvent(IntPtr hook);

        [StructLayout(LayoutKind.Sequential)]
        private struct RAWINPUTDEVICE
        {
            public ushort UsagePage;
            public ushort Usage;
            public uint Flags;
            public IntPtr Target;
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterRawInputDevices(RAWINPUTDEVICE[] devices, uint count, uint size);

        [DllImport("user32.dll")]
        private static extern uint GetRawInputData(IntPtr hRawInput, uint command, byte[] data, ref uint size, uint headerSize);
    }
}
