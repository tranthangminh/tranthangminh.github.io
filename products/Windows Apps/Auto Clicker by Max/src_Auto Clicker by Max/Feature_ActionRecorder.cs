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
    /// Left Click, Right Click, Middle / Scroll, Double Click, Drag &amp; Drop,
    /// Press &amp; Click, Key Press, Type Text.
    /// Press &amp; Click: a key held while a mouse button goes down (key first), or a key pressed while a button is held (click first).
    /// Key Press steps are recorded when the key is released, so a key that turns into a Press &amp; Click is not recorded twice.
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
        private const uint VK_PACKET = 0xE7;      // Unicode character injected with KEYEVENTF_UNICODE (scanCode holds the UTF-16 unit)
        private const uint LLKHF_INJECTED = 0x10; // Sent by software (e.g. Unikey/EVKey rewriting a word), not by the physical keyboard

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
        // The Delay of an already captured step was set (the pause until the next action is now known)
        public event Action<MacroStep> OnStepDelayChanged;
        public event Action<bool> OnRecordingStateChanged;

        // Hooks and delegates
        private IntPtr _mouseHook = IntPtr.Zero;
        private IntPtr _keyboardHook = IntPtr.Zero;
        private HookProc _mouseProc;
        private HookProc _keyboardProc;
        private bool _isRecording = false;

        // Thread synchronization context to marshal events safely to UI
        private SynchronizationContext _syncContext;

        // Delay timing: the last captured step gets the pause between its end and the start of the next action
        private const int MinRecordedDelayMs = 30;
        private const int MaxRecordedDelayMs = 30000;
        private MacroStep _lastCapturedStep;
        private int _lastCapturedEndTick;
        private int _textStartTick;
        private int _textEndTick;

        // Mouse tracking state
        private bool _isMouseDown = false;
        private Point _mouseDownPoint = Point.Empty;
        private int _mouseDownTick = 0;
        private bool _isDragging = false;
        private int _activeMouseButton = 0; // 0: Left, 1: Right, 2: Middle

        // Double click detection state
        private MacroStep _pendingSingleClick = null;
        private int _pendingClickStartTick;
        private int _pendingClickEndTick;
        private System.Threading.Timer _clickTimer = null;
        private Point _lastClickUpPoint = Point.Empty;
        private int _lastClickUpTick = 0;

        // Keys currently held down, by virtual-key code
        private sealed class HeldKey
        {
            public string Name;             // key name as stored in KeyData ("Space", "A", "F5"...)
            public bool IsModifier;
            public int DownTick;
            public string TypedText;        // what this key added to the text being typed, if anything
            public bool IsPendingKeyPress;  // a Key Press step that is recorded when the key is released
        }
        private readonly Dictionary<uint, HeldKey> _heldKeys = new Dictionary<uint, HeldKey>();

        // Press & Click state of the current mouse gesture
        private const int PressClickNone = -1;
        private const int PressClickKeyFirst = 0;   // MacroStep.PressClickOrder values
        private const int PressClickClickFirst = 1;
        // A key that typed a character joins a click only when it was pressed on its own or held this long (not just the end of fast typing)
        private const int PressClickTypingHoldMs = 500;
        private int _pressClickOrder = PressClickNone;
        private string _pressClickKey = "";
        private bool _pressClickHasMainKey;
        private uint _pressClickKeyVk;
        private int _pressClickKeyDownTick;
        private int _pressClickKeyHoldMs;           // click first: how long the key was held, 0 while it is still down

        // Real-time key state (GetAsyncKeyState); replaceable so recorded event sequences can be tested
        public Func<int, bool> IsKeyPhysicallyDown { get; set; }

        // Text debouncing buffer: a pause this long ends the current Type Text step
        private const int TypingPauseMs = 1500;
        private readonly RecordedTextBuffer _textBuffer = new RecordedTextBuffer();
        private System.Threading.Timer _textTimer = null;
        private readonly object _lock = new object();
        // Caps Lock tracked from the keys seen while recording: the per-thread key state is stale while another app has focus
        private bool _capsLockOn = false;

        public ActionRecorder()
        {
            _mouseProc = LowLevelMouseProc;
            _keyboardProc = LowLevelKeyboardProc;
            IsKeyPhysicallyDown = NativeMethods.IsKeyDown;
        }

        public bool StartRecording()
        {
            if (_isRecording) return true;

            _syncContext = SynchronizationContext.Current;

            RecordedCount = 0;
            _heldKeys.Clear();
            _isMouseDown = false;
            _isDragging = false;
            _pressClickOrder = PressClickNone;
            _pendingSingleClick = null;
            _lastCapturedStep = null;
            lock (_lock)
            {
                _textBuffer.Take();
            }
            _capsLockOn = Control.IsKeyLocked(Keys.CapsLock);

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

            if (OnRecordingStateChanged != null) OnRecordingStateChanged(true);
            return true;
        }

        public void StopRecording()
        {
            if (!_isRecording) return;

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

            // Flush any remaining buffers while still recording (EmitCapturedStep drops steps once recording has stopped)
            EmitPendingKeyPresses(Environment.TickCount);
            FlushPendingSingleClick();
            FlushTextBuffer();
            _isRecording = false;

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
                // A press that started outside is still followed onto the window, so its release (drop) is not lost.
                bool isFollowingPress = _isMouseDown && IsMouseButtonHeld(_activeMouseButton);
                if (!isFollowingPress && IsClickOnAppWindow != null && IsClickOnAppWindow(pt))
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
                        int wheelTick = Environment.TickCount;
                        EmitPendingKeyPresses(wheelTick);
                        // A click still waiting for a possible double click happened before any text typed after it
                        FlushPendingSingleClick();
                        FlushTextBuffer();
                        short delta = (short)((hookStruct.mouseData >> 16) & 0xFFFF);
                        MacroStep scrollStep = new MacroStep
                        {
                            ActionType = MacroActionType.MiddleClick,
                            StartPoint = pt,
                            ScrollStep = delta,
                            HoldMs = 10
                        };
                        EmitCapturedStep(scrollStep, wheelTick, wheelTick);
                        break;
                }
            }

            return CallNextHookEx(_mouseHook, nCode, wParam, lParam);
        }

        private void HandleMouseDown(Point pt, int button)
        {
            int now = Environment.TickCount;

            // Keys held when the button goes down make this a Press & Click (key first). Decided before the typed text is
            // flushed, because the held key may have typed the last character and has to be taken back out of the text.
            string heldCombo = TakeHeldKeysForClick(now);
            _pressClickOrder = heldCombo.Length > 0 ? PressClickKeyFirst : PressClickNone;
            _pressClickKey = heldCombo;

            // Flush any typed text before click
            FlushTextBuffer();

            _isMouseDown = true;
            _mouseDownPoint = pt;
            _mouseDownTick = now;
            _isDragging = false;
            _activeMouseButton = button;
        }

        /// <summary>
        /// Builds the key combination of a key-first Press &amp; Click from the keys held right now ("" when none qualifies):
        /// the held modifiers plus, at most, the most recently pressed other key. That key must be a Key Press still waiting
        /// for its release, or a key that typed the last character on its own or has been held a while; a key that merely ends
        /// fast typing stays text. The chosen key is taken out of the text / pending Key Press so it is not recorded twice.
        /// </summary>
        private string TakeHeldKeysForClick(int now)
        {
            ForgetReleasedKeys(now);

            HeldKey mainKey = null;
            lock (_lock)
            {
                foreach (HeldKey key in _heldKeys.Values)
                {
                    if (key.IsModifier) continue;
                    bool qualifies = key.IsPendingKeyPress ||
                                     (key.TypedText != null && _textBuffer.EndsWith(key.TypedText) &&
                                      (_textBuffer.Length == key.TypedText.Length || unchecked(now - key.DownTick) >= PressClickTypingHoldMs));
                    if (qualifies && (mainKey == null || unchecked(key.DownTick - mainKey.DownTick) > 0))
                    {
                        mainKey = key;
                    }
                }

                string combo = BuildHeldCombo(mainKey != null ? mainKey.Name : null, null);
                if (combo.Length == 0) return "";

                if (mainKey != null)
                {
                    if (mainKey.TypedText != null) _textBuffer.RemoveLast(mainKey.TypedText);
                    mainKey.TypedText = null;
                    mainKey.IsPendingKeyPress = false;
                }
                return combo;
            }
        }

        // "Ctrl+Shift+A": the held modifiers in a fixed order, then the main key (null for modifiers only).
        // modifierPressedNow is the modifier of the current key-down event, which the real-time key state does not report as down yet.
        private string BuildHeldCombo(string mainKeyName, string modifierPressedNow)
        {
            List<string> parts = new List<string>();
            if (modifierPressedNow == "Ctrl" || IsKeyPhysicallyDown((int)Keys.ControlKey)) parts.Add("Ctrl");
            if (modifierPressedNow == "Shift" || IsKeyPhysicallyDown((int)Keys.ShiftKey)) parts.Add("Shift");
            if (modifierPressedNow == "Alt" || IsKeyPhysicallyDown((int)Keys.Menu)) parts.Add("Alt");
            if (modifierPressedNow == "Win" || IsKeyPhysicallyDown((int)Keys.LWin) || IsKeyPhysicallyDown((int)Keys.RWin)) parts.Add("Win");
            if (mainKeyName != null) parts.Add(mainKeyName);
            return string.Join("+", parts.ToArray());
        }

        // button: 0 left, 1 right, 2 middle (logical, as in the hook messages). GetAsyncKeyState reports physical buttons.
        private bool IsMouseButtonHeld(int button)
        {
            int vk = button == 2 ? 0x04 : (button == 1 ? 0x02 : 0x01); // VK_MBUTTON / VK_RBUTTON / VK_LBUTTON
            if (button != 2 && SystemInformation.MouseButtonsSwapped) vk = (vk == 0x01) ? 0x02 : 0x01;
            return IsKeyPhysicallyDown(vk);
        }

        private static string GetModifierName(uint vkCode)
        {
            Keys k = (Keys)vkCode;
            if (k == Keys.ControlKey || k == Keys.LControlKey || k == Keys.RControlKey) return "Ctrl";
            if (k == Keys.ShiftKey || k == Keys.LShiftKey || k == Keys.RShiftKey) return "Shift";
            if (k == Keys.Menu || k == Keys.LMenu || k == Keys.RMenu) return "Alt";
            if (k == Keys.LWin || k == Keys.RWin) return "Win";
            return null; // the menu (Apps) key counts as a modifier for recording but is not part of combinations
        }

        // A key whose key-up never reached the hook (e.g. swallowed by another program) is treated as released now
        private void ForgetReleasedKeys(int now)
        {
            List<uint> released = new List<uint>();
            foreach (uint vk in _heldKeys.Keys)
            {
                if (!IsKeyPhysicallyDown((int)vk)) released.Add(vk);
            }
            foreach (uint vk in released)
            {
                HandleKeyUp(vk, now);
            }
        }

        private void HandleMouseUp(Point pt, int button)
        {
            if (!_isMouseDown) return;
            _isMouseDown = false;
            int now = Environment.TickCount;
            int holdTime = Math.Max(10, now - _mouseDownTick);

            // 1. Press & Click (key held with the click, either order)
            if (_pressClickOrder != PressClickNone)
            {
                int order = _pressClickOrder;
                _pressClickOrder = PressClickNone;
                FlushPendingSingleClick();

                int mode = _isDragging ? 3 : button; // 0: Left, 1: Right, 2: Middle, 3: Drag & Drop
                // Click first replays as button down -> key held for Hold -> button up, so Hold is the key's hold time;
                // otherwise (key first, or a drag) Hold is the click / drag time, as for plain clicks and drags
                int hold = holdTime;
                if (order == PressClickClickFirst && mode != 3)
                {
                    hold = _pressClickKeyHoldMs > 0 ? _pressClickKeyHoldMs : Math.Max(10, unchecked(now - _pressClickKeyDownTick));
                }

                MacroStep pncStep = new MacroStep
                {
                    ActionType = MacroActionType.PressAndClick,
                    KeyData = _pressClickKey,
                    PressClickMode = mode,
                    PressClickOrder = order,
                    DragButton = button,
                    StartPoint = _mouseDownPoint,
                    EndPoint = _isDragging ? pt : Point.Empty,
                    HoldMs = hold
                };

                EmitCapturedStep(pncStep, _mouseDownTick, now);
                _isDragging = false;
                return;
            }

            // 2. Drag & Drop
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
                EmitCapturedStep(dragStep, _mouseDownTick, now);
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
                EmitCapturedStep(rightStep, _mouseDownTick, now);
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
                EmitCapturedStep(midStep, _mouseDownTick, now);
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
                    EmitCapturedStep(dcStep, _pendingClickStartTick, now);
                    return;
                }
                else
                {
                    FlushPendingSingleClick();
                }
            }

            _lastClickUpPoint = pt;
            _lastClickUpTick = now;
            _pendingClickStartTick = _mouseDownTick;
            _pendingClickEndTick = now;
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
            int startTick = 0, endTick = 0;
            lock (_lock)
            {
                if (_pendingSingleClick != null)
                {
                    stepToEmit = _pendingSingleClick;
                    startTick = _pendingClickStartTick;
                    endTick = _pendingClickEndTick;
                    _pendingSingleClick = null;
                }
            }

            if (stepToEmit != null)
            {
                EmitCapturedStep(stepToEmit, startTick, endTick);
            }
        }

        private void CancelClickTimer()
        {
            if (_clickTimer != null)
            {
                try { _clickTimer.Dispose(); } catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
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
                    bool injected = (kbdStruct.flags & LLKHF_INJECTED) != 0;
                    if (!injected || !HandleInjectedTextKey(vkCode, kbdStruct.scanCode, (int)kbdStruct.time))
                    {
                        HandleKeyDown(vkCode, kbdStruct.scanCode, (int)kbdStruct.time);
                    }
                }
                else if (msg == WM_KEYUP || msg == WM_SYSKEYUP)
                {
                    HandleKeyUp(vkCode, (int)kbdStruct.time);
                }
            }

            return CallNextHookEx(_keyboardHook, nCode, wParam, lParam);
        }

        /// <summary>
        /// Software-injected keys that edit the text being typed (input-method rewrites): Unicode packets, Backspace and printable keys.
        /// Returns false for anything else, which is then recorded like a normal key.
        /// </summary>
        private bool HandleInjectedTextKey(uint vkCode, uint scanCode, int tick)
        {
            if (vkCode == VK_PACKET)
            {
                lock (_lock)
                {
                    AddTypedText(((char)scanCode).ToString(), true, tick);
                }
                return true;
            }

            if (vkCode == (uint)Keys.Back)
            {
                // An input method rewriting a word that was already emitted has nothing left to edit; the edit is dropped
                lock (_lock)
                {
                    if (_textBuffer.Backspace(true, tick)) _textEndTick = tick;
                    RestartTextTimer();
                }
                return true;
            }

            if (IsModifierKey(vkCode)) return true;

            string ch = GetCharFromKey(vkCode, scanCode);
            if (string.IsNullOrEmpty(ch) || char.IsControl(ch[0])) return false;
            lock (_lock)
            {
                AddTypedText(ch, true, tick);
            }
            return true;
        }

        // Call inside _lock. Also remembers when the text started and was last edited, for the Delays around the Type Text step.
        private void AddTypedText(string text, bool injected, int tick)
        {
            if (_textBuffer.Length == 0) _textStartTick = tick;
            if (injected) _textBuffer.AddInjectedText(text, tick);
            else _textBuffer.AddRealText(text, tick);
            _textEndTick = tick;
            RestartTextTimer();
        }

        private void HandleKeyDown(uint vkCode, uint scanCode, int tick)
        {
            HeldKey existing;
            if (_heldKeys.TryGetValue(vkCode, out existing))
            {
                // Windows repeats a held key: it is recorded once, with how long it was held
                if (IsKeyPhysicallyDown((int)vkCode)) return;
                // Not down any more: its key-up was missed, so this is a new press
                HandleKeyUp(vkCode, tick);
            }

            string keyName = FormatKeyName(vkCode);
            HeldKey held = new HeldKey { Name = keyName, IsModifier = IsModifierKey(vkCode), DownTick = tick };
            _heldKeys[vkCode] = held;

            // Caps Lock only changes how the following letters are typed
            if (vkCode == (uint)Keys.CapsLock)
            {
                _capsLockOn = !_capsLockOn;
                return;
            }

            // 1. A key pressed while a mouse button is held: Press & Click, click first
            //    (checked against the real button state too, in case a button release never reached the hook)
            if (_isMouseDown && IsMouseButtonHeld(_activeMouseButton))
            {
                AddKeyToHeldClick(vkCode, held, tick);
                return;
            }

            // 2. Is this a standalone modifier key press (Ctrl/Shift/Alt/Win)?
            if (held.IsModifier)
            {
                // Modifier keys alone don't emit steps; they wait for either another key or a mouse click
                return;
            }

            // Any other key ends a Key Press still being held, which is then recorded first (keys stay in the order pressed)
            EmitPendingKeyPresses(tick);

            // 3. Is this a keyboard shortcut (Ctrl+..., Alt+..., Win+...)?
            // Real-time key state: GetKeyState only tracks keys sent to this app, but while recording the user types into another app
            bool isCtrl = IsKeyPhysicallyDown((int)Keys.ControlKey);
            bool isAlt = IsKeyPhysicallyDown((int)Keys.Menu);
            bool isWin = IsKeyPhysicallyDown((int)Keys.LWin) || IsKeyPhysicallyDown((int)Keys.RWin);
            if (isCtrl || isAlt || isWin)
            {
                // A click still waiting for a possible double click happened before any text typed after it
                FlushPendingSingleClick();
                FlushTextBuffer();

                MacroStep step = new MacroStep
                {
                    ActionType = MacroActionType.KeyPress,
                    KeyData = BuildHeldCombo(keyName, null),
                    HoldMs = 20
                };
                EmitCapturedStep(step, tick, tick);
                return;
            }

            // 4. While text is being typed, Space / Enter belong to it and Backspace edits it;
            //    on their own (nothing typed yet) they stay separate Key Press steps (e.g. jump in a game, confirm a dialog)
            if (vkCode == (uint)Keys.Space || vkCode == (uint)Keys.Return || vkCode == (uint)Keys.Back)
            {
                lock (_lock)
                {
                    bool handled;
                    if (vkCode == (uint)Keys.Back)
                    {
                        handled = _textBuffer.Backspace(false, tick);
                        if (handled)
                        {
                            _textEndTick = tick;
                            RestartTextTimer();
                        }
                    }
                    else
                    {
                        handled = _textBuffer.Length > 0;
                        if (handled)
                        {
                            held.TypedText = vkCode == (uint)Keys.Space ? " " : "\n";
                            AddTypedText(held.TypedText, false, tick);
                        }
                    }
                    if (handled) return;
                }
            }

            // 5. Regular Printable Characters (a-z, 0-9, punctuation) -> Buffer for Type Text
            string ch = IsControlOrFunctionKey(vkCode) ? null : GetCharFromKey(vkCode, scanCode);
            if (!string.IsNullOrEmpty(ch) && !char.IsControl(ch[0]))
            {
                lock (_lock)
                {
                    held.TypedText = ch;
                    AddTypedText(ch, false, tick);
                }
                return;
            }

            // 6. Control / Navigation / Function keys (Enter, Tab, Esc, Backspace, Arrows, F1-F12) and other non-printable keys:
            //    a Key Press recorded when the key is released (with how long it was held), unless a click happens first
            FlushPendingSingleClick();
            FlushTextBuffer();
            held.IsPendingKeyPress = true;
        }

        private void HandleKeyUp(uint vkCode, int tick)
        {
            HeldKey held;
            if (!_heldKeys.TryGetValue(vkCode, out held)) return;
            _heldKeys.Remove(vkCode);

            if (held.IsPendingKeyPress) EmitKeyPress(held, tick);

            // Click first: the key was released while the button is still held
            if (_pressClickOrder == PressClickClickFirst && _pressClickKeyVk == vkCode && _pressClickKeyHoldMs == 0)
            {
                _pressClickKeyHoldMs = Math.Max(10, unchecked(tick - _pressClickKeyDownTick));
            }
        }

        /// <summary>
        /// A key pressed while a mouse button is held makes the gesture a click-first Press &amp; Click; the key is not recorded on its own.
        /// The first key decides, except that a modifier can be followed by a main key (button held, then Ctrl, then C).
        /// A key-first gesture already has its keys, so keys pressed during it are ignored.
        /// </summary>
        private void AddKeyToHeldClick(uint vkCode, HeldKey held, int tick)
        {
            if (_pressClickOrder == PressClickKeyFirst) return;
            if (_pressClickOrder == PressClickClickFirst && (_pressClickHasMainKey || held.IsModifier)) return;
            if (held.IsModifier && GetModifierName(vkCode) == null) return;

            _pressClickOrder = PressClickClickFirst;
            _pressClickHasMainKey = !held.IsModifier;
            _pressClickKey = held.IsModifier ? BuildHeldCombo(null, GetModifierName(vkCode)) : BuildHeldCombo(held.Name, null);
            _pressClickKeyVk = vkCode;
            _pressClickKeyDownTick = tick;
            _pressClickKeyHoldMs = 0;
        }

        private void EmitKeyPress(HeldKey held, int releaseTick)
        {
            held.IsPendingKeyPress = false;
            MacroStep step = new MacroStep
            {
                ActionType = MacroActionType.KeyPress,
                KeyData = held.Name,
                HoldMs = Math.Max(20, unchecked(releaseTick - held.DownTick))
            };
            EmitCapturedStep(step, held.DownTick, releaseTick);
        }

        // Records the Key Presses still held (oldest first), with how long they have been held so far
        private void EmitPendingKeyPresses(int tick)
        {
            List<HeldKey> pending = new List<HeldKey>();
            foreach (HeldKey key in _heldKeys.Values)
            {
                if (key.IsPendingKeyPress) pending.Add(key);
            }
            pending.Sort((a, b) => unchecked(a.DownTick - b.DownTick));
            foreach (HeldKey key in pending)
            {
                EmitKeyPress(key, tick);
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

        private string GetCharFromKey(uint vkCode, uint scanCode)
        {
            try
            {
                // Only Shift and Caps Lock matter here (Ctrl/Alt combos are recorded as shortcuts before this point),
                // and both come from real-time / tracked state rather than this app's stale keyboard state
                byte[] keyboardState = new byte[256];
                keyboardState[(int)Keys.ShiftKey] = (byte)(IsKeyPhysicallyDown((int)Keys.ShiftKey) ? 0x80 : 0);
                keyboardState[(int)Keys.Capital] = (byte)(_capsLockOn ? 0x01 : 0);

                StringBuilder sb = new StringBuilder(16);
                int rc = ToUnicode(vkCode, scanCode, keyboardState, sb, sb.Capacity, 0);
                if (rc > 0)
                {
                    return sb.ToString();
                }
            }
            catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
            return null;
        }

        // Call inside _lock after every text edit
        private void RestartTextTimer()
        {
            if (_textTimer == null)
            {
                _textTimer = new System.Threading.Timer(TextTimerCallback, null, TypingPauseMs, Timeout.Infinite);
            }
            else
            {
                _textTimer.Change(TypingPauseMs, Timeout.Infinite);
            }
        }

        // Runs on a pool thread: the held-key state belongs to the hook (UI) thread, so the check is posted there
        private void TextTimerCallback(object state)
        {
            if (_syncContext != null) _syncContext.Post(_ => FlushTextBufferAfterPause(), null);
            else FlushTextBufferAfterPause();
        }

        private void FlushTextBufferAfterPause()
        {
            if (!_isRecording) return;
            // A key still held after typing may yet become the key of a Press & Click, so its character is kept until it is released
            foreach (KeyValuePair<uint, HeldKey> entry in _heldKeys)
            {
                if (entry.Value.TypedText != null && IsKeyPhysicallyDown((int)entry.Key))
                {
                    lock (_lock)
                    {
                        RestartTextTimer();
                    }
                    return;
                }
            }
            FlushTextBuffer();
        }

        private void FlushTextBuffer()
        {
            string textToEmit = null;
            int startTick = 0, endTick = 0;
            lock (_lock)
            {
                if (_textBuffer.Length > 0)
                {
                    textToEmit = _textBuffer.Take();
                    startTick = _textStartTick;
                    endTick = _textEndTick;
                }
            }

            if (!string.IsNullOrEmpty(textToEmit))
            {
                MacroStep step = new MacroStep();
                // A single isolated letter/digit -> KeyPress (e.g. 'E' in a game); an accented letter like 'à' has no key, so it stays Type Text
                char only = textToEmit[0];
                if (textToEmit.Length == 1 && only < 128 && char.IsLetterOrDigit(only))
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
                EmitCapturedStep(step, startTick, endTick);
            }
        }

        private void CancelTextTimer()
        {
            if (_textTimer != null)
            {
                try { _textTimer.Dispose(); } catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
                _textTimer = null;
            }
        }

        #endregion

        /// <summary>
        /// Records a step. startTick / endTick are when its action began and finished. The player runs a step's action and then
        /// waits its Delay, so the pause between two actions becomes the Delay of the earlier step, set once the next action
        /// arrives (OnStepDelayChanged). The last step keeps the default Delay.
        /// </summary>
        private void EmitCapturedStep(MacroStep step, int startTick, int endTick)
        {
            if (step == null || !_isRecording) return;

            step.BaseDelayMs = step.DelayMs;
            step.BaseHoldMs = step.HoldMs;
            step.Enabled = true;

            MacroStep previous;
            lock (_lock)
            {
                previous = _lastCapturedStep;
                if (previous != null)
                {
                    previous.DelayMs = Math.Max(MinRecordedDelayMs, Math.Min(MaxRecordedDelayMs, unchecked(startTick - _lastCapturedEndTick)));
                    previous.BaseDelayMs = previous.DelayMs;
                }
                _lastCapturedStep = step;
                _lastCapturedEndTick = endTick;
                RecordedCount++;
            }

            if (_syncContext != null)
            {
                _syncContext.Post(_ => RaiseStepEvents(previous, step), null);
            }
            else
            {
                RaiseStepEvents(previous, step);
            }
        }

        private void RaiseStepEvents(MacroStep previous, MacroStep step)
        {
            if (previous != null && OnStepDelayChanged != null) OnStepDelayChanged(previous);
            if (OnActionCaptured != null) OnActionCaptured(step);
        }

        public void Dispose()
        {
            StopRecording();
            if (_clickTimer != null)
            {
                try { _clickTimer.Dispose(); } catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
                _clickTimer = null;
            }
            if (_textTimer != null)
            {
                try { _textTimer.Dispose(); } catch (Exception caught) { MaxApp.Common.AppLog.Caught(caught); }
                _textTimer = null;
            }
        }
    }
}
