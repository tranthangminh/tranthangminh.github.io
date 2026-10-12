using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using ModernAutoClicker.Advanced;

namespace ModernAutoClicker
{
    /// <summary>
    /// High-performance Action Recorder for Asian Mode.
    /// Uses Win32 Low-Level Hooks (WH_MOUSE_LL & WH_KEYBOARD_LL) to capture
    /// user actions system-wide and classifies them into MacroSteps with zero collision:
    /// Left Click, Right Click, Middle / Scroll, Double Click, Drag n Drop,
    /// Press n Click, Key Press, Type Text.
    /// </summary>
    public class ActionRecorder : IDisposable
    {
        #region Win32 P/Invoke & Structures

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int x;
            public int y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MSLLHOOKSTRUCT
        {
            public POINT pt;
            public uint mouseData;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KBDLLHOOKSTRUCT
        {
            public uint vkCode;
            public uint scanCode;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll")]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern int ToUnicode(uint wVirtKey, uint wScanCode, byte[] lpKeyState, [Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pwszBuff, int cchBuff, uint wFlags);

        [DllImport("user32.dll")]
        private static extern bool GetKeyboardState(byte[] lpKeyState);

        [DllImport("user32.dll")]
        private static extern short GetKeyState(int nVirtKey);

        private const int WH_MOUSE_LL = 14;
        private const int WH_KEYBOARD_LL = 13;

        private const int WM_MOUSEMOVE = 0x0200;
        private const int WM_LBUTTONDOWN = 0x0201;
        private const int WM_LBUTTONUP = 0x0202;
        private const int WM_RBUTTONDOWN = 0x0204;
        private const int WM_RBUTTONUP = 0x0205;
        private const int WM_MBUTTONDOWN = 0x0207;
        private const int WM_MBUTTONUP = 0x0208;
        private const int WM_MOUSEWHEEL = 0x020A;

        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;

        private const int VK_F6 = 0x72;

        #endregion

        // Singleton instance for easy shared access
        private static ActionRecorder _instance;
        public static ActionRecorder Instance
        {
            get
            {
                if (_instance == null) _instance = new ActionRecorder();
                return _instance;
            }
        }

        // State properties
        public bool IsRecording { get { return _isRecording; } }
        public int RecordedCount { get; private set; }

        // Callback to check if point is inside Auto Clicker main form to prevent recording self-clicks
        public Func<Point, bool> IsClickOnAppWindow { get; set; }

        // Events
        public event Action<MacroStep> OnActionCaptured;
        public event Action<bool> OnRecordingStateChanged;

        // Hooks and delegates
        private IntPtr _mouseHook = IntPtr.Zero;
        private IntPtr _keyboardHook = IntPtr.Zero;
        private HookProc _mouseProc;
        private HookProc _keyboardProc;
        private bool _isRecording = false;

        // Thread synchronization context to marshal events safely to UI
        private SynchronizationContext _syncContext;

        // Timing stopwatch
        private Stopwatch _stepStopwatch = new Stopwatch();

        // Mouse tracking state
        private bool _isMouseDown = false;
        private Point _mouseDownPoint = Point.Empty;
        private int _mouseDownTick = 0;
        private bool _isDragging = false;
        private int _activeMouseButton = 0; // 0: Left, 1: Right, 2: Middle

        // Double click detection state
        private MacroStep _pendingSingleClick = null;
        private System.Threading.Timer _clickTimer = null;
        private Point _lastClickUpPoint = Point.Empty;
        private int _lastClickUpTick = 0;

        // Keyboard tracking state
        private Dictionary<uint, string> _activeDownKeys = new Dictionary<uint, string>();
        private HashSet<string> _consumedPressClickKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Press n Click detection state
        private bool _isPressAndClickPending = false;
        private string _pressClickKey = "";

        // Text debouncing buffer
        private StringBuilder _textBuffer = new StringBuilder();
        private System.Threading.Timer _textTimer = null;
        private readonly object _lock = new object();

        public ActionRecorder()
        {
            _mouseProc = LowLevelMouseProc;
            _keyboardProc = LowLevelKeyboardProc;
        }

        public bool StartRecording()
        {
            if (_isRecording) return true;

            _syncContext = SynchronizationContext.Current;

            RecordedCount = 0;
            _activeDownKeys.Clear();
            _consumedPressClickKeys.Clear();
            _isMouseDown = false;
            _isDragging = false;
            _isPressAndClickPending = false;
            _pendingSingleClick = null;
            lock (_lock)
            {
                _textBuffer.Length = 0;
            }

            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule)
            {
                IntPtr hModule = GetModuleHandle(curModule.ModuleName);
                _mouseHook = SetWindowsHookEx(WH_MOUSE_LL, _mouseProc, hModule, 0);
                _keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, _keyboardProc, hModule, 0);
            }

            if (_mouseHook == IntPtr.Zero || _keyboardHook == IntPtr.Zero)
            {
                StopRecording();
                return false;
            }

            _isRecording = true;
            _stepStopwatch.Restart();

            if (OnRecordingStateChanged != null) OnRecordingStateChanged(true);
            return true;
        }

        public void StopRecording()
        {
            if (!_isRecording) return;
            _isRecording = false;

            if (_mouseHook != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_mouseHook);
                _mouseHook = IntPtr.Zero;
            }
            if (_keyboardHook != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_keyboardHook);
                _keyboardHook = IntPtr.Zero;
            }

            // Flush any remaining buffers
            FlushPendingSingleClick();
            FlushTextBuffer();

            CancelClickTimer();
            CancelTextTimer();

            if (OnRecordingStateChanged != null) OnRecordingStateChanged(false);
        }

        public void ToggleRecording()
        {
            if (_isRecording)
                StopRecording();
            else
                StartRecording();
        }

        #region Low-Level Mouse Hook Handler

        private IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && _isRecording)
            {
                MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
                Point pt = new Point(hookStruct.pt.x, hookStruct.pt.y);
                int msg = wParam.ToInt32();

                // If user clicks on Auto Clicker app window, do not record self clicks!
                if (IsClickOnAppWindow != null && IsClickOnAppWindow(pt))
                {
                    return CallNextHookEx(_mouseHook, nCode, wParam, lParam);
                }

                switch (msg)
                {
                    case WM_LBUTTONDOWN:
                        HandleMouseDown(pt, 0);
                        break;

                    case WM_RBUTTONDOWN:
                        HandleMouseDown(pt, 1);
                        break;

                    case WM_MBUTTONDOWN:
                        HandleMouseDown(pt, 2);
                        break;

                    case WM_MOUSEMOVE:
                        if (_isMouseDown)
                        {
                            int dist = Math.Abs(pt.X - _mouseDownPoint.X) + Math.Abs(pt.Y - _mouseDownPoint.Y);
                            if (dist > 10)
                            {
                                _isDragging = true;
                            }
                        }
                        break;

                    case WM_LBUTTONUP:
                        HandleMouseUp(pt, 0);
                        break;

                    case WM_RBUTTONUP:
                        HandleMouseUp(pt, 1);
                        break;

                    case WM_MBUTTONUP:
                        HandleMouseUp(pt, 2);
                        break;

                    case WM_MOUSEWHEEL:
                        FlushTextBuffer();
                        FlushPendingSingleClick();
                        short delta = (short)((hookStruct.mouseData >> 16) & 0xFFFF);
                        MacroStep scrollStep = new MacroStep
                        {
                            ActionType = MacroActionType.MiddleClick,
                            StartPoint = pt,
                            ScrollStep = delta,
                            HoldMs = 10
                        };
                        EmitCapturedStep(scrollStep);
                        break;
                }
            }

            return CallNextHookEx(_mouseHook, nCode, wParam, lParam);
        }

        private void HandleMouseDown(Point pt, int button)
        {
            // Flush any typed text before click
            FlushTextBuffer();

            _isMouseDown = true;
            _mouseDownPoint = pt;
            _mouseDownTick = Environment.TickCount;
            _isDragging = false;
            _activeMouseButton = button;

            // Check if any key is currently held down -> This will be a Press n Click!
            if (_activeDownKeys.Count > 0)
            {
                _isPressAndClickPending = true;
                // Grab the most recently pressed key
                foreach (var kvp in _activeDownKeys)
                {
                    _pressClickKey = kvp.Value;
                }
            }
            else
            {
                _isPressAndClickPending = false;
            }
        }

        private void HandleMouseUp(Point pt, int button)
        {
            if (!_isMouseDown) return;
            _isMouseDown = false;
            int now = Environment.TickCount;
            int holdTime = Math.Max(10, now - _mouseDownTick);

            // 1. Press n Click (Simultaneous Key + Mouse)
            if (_isPressAndClickPending)
            {
                _isPressAndClickPending = false;
                FlushPendingSingleClick();

                int mode = button; // 0: Left, 1: Right, 2: Middle
                if (_isDragging) mode = 3; // DragDrop

                MacroStep pncStep = new MacroStep
                {
                    ActionType = MacroActionType.PressAndClick,
                    KeyData = !string.IsNullOrEmpty(_pressClickKey) ? _pressClickKey : "Ctrl",
                    PressClickMode = mode,
                    PressClickOrder = 0, // PressFirst
                    StartPoint = _mouseDownPoint,
                    EndPoint = _isDragging ? pt : Point.Empty,
                    HoldMs = holdTime
                };

                _consumedPressClickKeys.Add(_pressClickKey);
                EmitCapturedStep(pncStep);
                _isDragging = false;
                return;
            }

            // 2. Drag n Drop
            if (_isDragging)
            {
                _isDragging = false;
                FlushPendingSingleClick();

                MacroStep dragStep = new MacroStep
                {
                    ActionType = MacroActionType.DragDrop,
                    StartPoint = _mouseDownPoint,
                    EndPoint = pt,
                    DragButton = button,
                    HoldMs = holdTime
                };
                EmitCapturedStep(dragStep);
                return;
            }

            // 3. Right Click
            if (button == 1)
            {
                FlushPendingSingleClick();
                MacroStep rightStep = new MacroStep
                {
                    ActionType = MacroActionType.RightClick,
                    StartPoint = pt,
                    HoldMs = holdTime
                };
                EmitCapturedStep(rightStep);
                return;
            }

            // 4. Middle Click
            if (button == 2)
            {
                FlushPendingSingleClick();
                MacroStep midStep = new MacroStep
                {
                    ActionType = MacroActionType.MiddleClick,
                    StartPoint = pt,
                    ScrollStep = 0,
                    HoldMs = holdTime
                };
                EmitCapturedStep(midStep);
                return;
            }

            // 5. Left Click vs Double Click
            int dcTime = SystemInformation.DoubleClickTime;
            if (_pendingSingleClick != null)
            {
                int dist = Math.Abs(pt.X - _lastClickUpPoint.X) + Math.Abs(pt.Y - _lastClickUpPoint.Y);
                if ((now - _lastClickUpTick) <= dcTime && dist <= 6)
                {
                    // It's a DOUBLE CLICK!
                    CancelClickTimer();
                    _pendingSingleClick.ActionType = MacroActionType.DoubleClick;
                    _pendingSingleClick.StartPoint = pt;
                    MacroStep dcStep = _pendingSingleClick;
                    _pendingSingleClick = null;
                    EmitCapturedStep(dcStep);
                    return;
                }
                else
                {
                    FlushPendingSingleClick();
                }
            }

            _lastClickUpPoint = pt;
            _lastClickUpTick = now;
            _pendingSingleClick = new MacroStep
            {
                ActionType = MacroActionType.LeftClick,
                StartPoint = pt,
                HoldMs = holdTime
            };

            int waitMs = Math.Min(350, dcTime);
            if (_clickTimer == null)
            {
                _clickTimer = new System.Threading.Timer(ClickTimerCallback, null, waitMs, Timeout.Infinite);
            }
            else
            {
                _clickTimer.Change(waitMs, Timeout.Infinite);
            }
        }

        private void ClickTimerCallback(object state)
        {
            FlushPendingSingleClick();
        }

        private void FlushPendingSingleClick()
        {
            MacroStep stepToEmit = null;
            lock (_lock)
            {
                if (_pendingSingleClick != null)
                {
                    stepToEmit = _pendingSingleClick;
                    _pendingSingleClick = null;
                }
            }

            if (stepToEmit != null)
            {
                EmitCapturedStep(stepToEmit);
            }
        }

        private void CancelClickTimer()
        {
            if (_clickTimer != null)
            {
                try { _clickTimer.Dispose(); } catch { }
                _clickTimer = null;
            }
        }

        #endregion

        #region Low-Level Keyboard Hook Handler

        private IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && _isRecording)
            {
                KBDLLHOOKSTRUCT kbdStruct = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
                uint vkCode = kbdStruct.vkCode;
                int msg = wParam.ToInt32();

                // F6 Hotkey intercept: Immediately stop recording & swallow F6!
                if (vkCode == VK_F6)
                {
                    if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN)
                    {
                        if (_syncContext != null)
                        {
                            _syncContext.Post(_ => StopRecording(), null);
                        }
                        else
                        {
                            StopRecording();
                        }
                    }
                    return (IntPtr)1; // Swallow F6 so no application reacts
                }

                if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN)
                {
                    HandleKeyDown(vkCode, kbdStruct.scanCode);
                }
                else if (msg == WM_KEYUP || msg == WM_SYSKEYUP)
                {
                    HandleKeyUp(vkCode);
                }
            }

            return CallNextHookEx(_keyboardHook, nCode, wParam, lParam);
        }

        private void HandleKeyDown(uint vkCode, uint scanCode)
        {
            bool isCtrl = (GetKeyState((int)Keys.ControlKey) & 0x80) != 0;
            bool isShift = (GetKeyState((int)Keys.ShiftKey) & 0x80) != 0;
            bool isAlt = (GetKeyState((int)Keys.Menu) & 0x80) != 0;
            bool isWin = (GetKeyState((int)Keys.LWin) & 0x80) != 0 || (GetKeyState((int)Keys.RWin) & 0x80) != 0;

            string keyName = FormatKeyName(vkCode);
            _activeDownKeys[vkCode] = keyName;

            // 1. Is this a standalone modifier key press (Ctrl/Shift/Alt)?
            if (IsModifierKey(vkCode))
            {
                // Modifier keys alone don't emit steps immediately; they wait for either another key or a mouse click
                return;
            }

            // 2. Is this a keyboard shortcut (Ctrl+..., Alt+..., Win+...)?
            if (isCtrl || isAlt || isWin)
            {
                FlushTextBuffer();
                FlushPendingSingleClick();

                string combo = FormatKeyCombination(vkCode, isCtrl, isShift, isAlt);
                MacroStep step = new MacroStep
                {
                    ActionType = MacroActionType.KeyPress,
                    KeyData = combo,
                    HoldMs = 20
                };
                EmitCapturedStep(step);
                return;
            }

            // 3. Is this a Control / Navigation / Function key (Enter, Tab, Esc, Backspace, Arrows, F1-F12)?
            if (IsControlOrFunctionKey(vkCode))
            {
                FlushTextBuffer();
                FlushPendingSingleClick();

                MacroStep step = new MacroStep
                {
                    ActionType = MacroActionType.KeyPress,
                    KeyData = keyName,
                    HoldMs = 20
                };
                EmitCapturedStep(step);
                return;
            }

            // 4. Regular Printable Characters (a-z, 0-9, punctuation) -> Buffer for Type Text
            string ch = GetCharFromKey(vkCode, scanCode);
            if (!string.IsNullOrEmpty(ch) && !char.IsControl(ch[0]))
            {
                AppendToTextBuffer(ch);
            }
            else
            {
                // Fallback: if not printable, emit as KeyPress
                FlushTextBuffer();
                MacroStep step = new MacroStep
                {
                    ActionType = MacroActionType.KeyPress,
                    KeyData = keyName,
                    HoldMs = 20
                };
                EmitCapturedStep(step);
            }
        }

        private void HandleKeyUp(uint vkCode)
        {
            if (_activeDownKeys.ContainsKey(vkCode))
            {
                string name = _activeDownKeys[vkCode];
                _activeDownKeys.Remove(vkCode);

                // If this key was already consumed by a Press n Click, suppress any key up logic
                if (_consumedPressClickKeys.Contains(name))
                {
                    _consumedPressClickKeys.Remove(name);
                }
            }
        }

        private bool IsModifierKey(uint vkCode)
        {
            return vkCode == (uint)Keys.ControlKey || vkCode == (uint)Keys.LControlKey || vkCode == (uint)Keys.RControlKey ||
                   vkCode == (uint)Keys.ShiftKey || vkCode == (uint)Keys.LShiftKey || vkCode == (uint)Keys.RShiftKey ||
                   vkCode == (uint)Keys.Menu || vkCode == (uint)Keys.LMenu || vkCode == (uint)Keys.RMenu ||
                   vkCode == (uint)Keys.LWin || vkCode == (uint)Keys.RWin || vkCode == (uint)Keys.Apps;
        }

        private bool IsControlOrFunctionKey(uint vkCode)
        {
            Keys k = (Keys)vkCode;
            return k == Keys.Return || k == Keys.Escape || k == Keys.Tab || k == Keys.Back ||
                   k == Keys.Delete || k == Keys.Insert || k == Keys.Home || k == Keys.End ||
                   k == Keys.PageUp || k == Keys.PageDown || k == Keys.Up || k == Keys.Down ||
                   k == Keys.Left || k == Keys.Right || k == Keys.Space ||
                   (k >= Keys.F1 && k <= Keys.F24) || k == Keys.PrintScreen || k == Keys.Pause;
        }

        private string FormatKeyName(uint vkCode)
        {
            Keys k = (Keys)vkCode;
            if (k >= Keys.A && k <= Keys.Z) return k.ToString().ToUpper();
            if (k >= Keys.D0 && k <= Keys.D9) return ((int)k - (int)Keys.D0).ToString();
            if (k >= Keys.NumPad0 && k <= Keys.NumPad9) return "Num" + ((int)k - (int)Keys.NumPad0).ToString();
            if (k == Keys.Space) return "Space";
            if (k == Keys.Return) return "Enter";
            if (k == Keys.Escape) return "Esc";
            if (k == Keys.Back) return "Backspace";
            if (k == Keys.Delete) return "Delete";
            if (k == Keys.Insert) return "Insert";
            if (k == Keys.Home) return "Home";
            if (k == Keys.End) return "End";
            if (k == Keys.PageUp) return "PageUp";
            if (k == Keys.PageDown) return "PageDown";
            if (k == Keys.Up) return "Up";
            if (k == Keys.Down) return "Down";
            if (k == Keys.Left) return "Left";
            if (k == Keys.Right) return "Right";
            if (k == Keys.Tab) return "Tab";
            if (k >= Keys.F1 && k <= Keys.F24) return k.ToString();
            return k.ToString();
        }

        private string FormatKeyCombination(uint vkCode, bool ctrl, bool shift, bool alt)
        {
            List<string> parts = new List<string>();
            if (ctrl) parts.Add("Ctrl");
            if (shift) parts.Add("Shift");
            if (alt) parts.Add("Alt");

            string name = FormatKeyName(vkCode);
            if (!parts.Contains(name) && !IsModifierKey(vkCode))
            {
                parts.Add(name);
            }

            return string.Join("+", parts.ToArray());
        }

        private string GetCharFromKey(uint vkCode, uint scanCode)
        {
            try
            {
                byte[] keyboardState = new byte[256];
                if (!GetKeyboardState(keyboardState)) return null;

                keyboardState[(int)Keys.ShiftKey] = (byte)((GetKeyState((int)Keys.ShiftKey) & 0x80) != 0 ? 0x80 : 0);
                keyboardState[(int)Keys.Capital] = (byte)(GetKeyState((int)Keys.Capital) & 0x01);

                StringBuilder sb = new StringBuilder(16);
                int rc = ToUnicode(vkCode, scanCode, keyboardState, sb, sb.Capacity, 0);
                if (rc > 0)
                {
                    return sb.ToString();
                }
            }
            catch { }
            return null;
        }

        private void AppendToTextBuffer(string chars)
        {
            lock (_lock)
            {
                _textBuffer.Append(chars);
                if (_textTimer == null)
                {
                    _textTimer = new System.Threading.Timer(TextTimerCallback, null, 600, Timeout.Infinite);
                }
                else
                {
                    _textTimer.Change(600, Timeout.Infinite);
                }
            }
        }

        private void TextTimerCallback(object state)
        {
            FlushTextBuffer();
        }

        private void FlushTextBuffer()
        {
            string textToEmit = null;
            lock (_lock)
            {
                if (_textBuffer.Length > 0)
                {
                    textToEmit = _textBuffer.ToString();
                    _textBuffer.Length = 0;
                }
            }

            if (!string.IsNullOrEmpty(textToEmit))
            {
                MacroStep step = new MacroStep();
                // If single character isolated -> KeyPress (e.g. 'E' in a game)
                if (textToEmit.Length == 1)
                {
                    step.ActionType = MacroActionType.KeyPress;
                    step.KeyData = textToEmit;
                    step.HoldMs = 20;
                }
                // If 2 or more characters typed together -> TypeText
                else
                {
                    step.ActionType = MacroActionType.TypeText;
                    step.KeyData = textToEmit;
                    step.HoldMs = 10;
                }
                EmitCapturedStep(step);
            }
        }

        private void CancelTextTimer()
        {
            if (_textTimer != null)
            {
                try { _textTimer.Dispose(); } catch { }
                _textTimer = null;
            }
        }

        #endregion

        private void EmitCapturedStep(MacroStep step)
        {
            if (step == null || !_isRecording) return;

            int elapsed = (int)_stepStopwatch.ElapsedMilliseconds;
            _stepStopwatch.Restart();

            step.DelayMs = Math.Max(30, Math.Min(30000, elapsed));
            step.BaseDelayMs = step.DelayMs;
            step.BaseHoldMs = step.HoldMs;
            step.Enabled = true;

            RecordedCount++;

            if (_syncContext != null)
            {
                _syncContext.Post(_ =>
                {
                    if (OnActionCaptured != null) OnActionCaptured(step);
                }, null);
            }
            else
            {
                if (OnActionCaptured != null) OnActionCaptured(step);
            }
        }

        public void Dispose()
        {
            StopRecording();
            if (_clickTimer != null)
            {
                try { _clickTimer.Dispose(); } catch { }
                _clickTimer = null;
            }
            if (_textTimer != null)
            {
                try { _textTimer.Dispose(); } catch { }
                _textTimer = null;
            }
        }
    }
}
