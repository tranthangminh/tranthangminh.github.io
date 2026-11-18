using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public static class KeyboardSimulator
    {
        public static void ParseKeyCombo(string combo, out List<byte> modifiersDown, out byte mainVk)
        {
            modifiersDown = new List<byte>();
            mainVk = 0;
            if (string.IsNullOrWhiteSpace(combo)) return;

            string[] parts = combo.Split(new char[] { '+', '-', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return;

            for (int i = 0; i < parts.Length; i++)
            {
                string p = parts[i].Trim();
                if (string.Equals(p, "Ctrl", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p, "Control", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p, "LCtrl", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p, "RCtrl", StringComparison.OrdinalIgnoreCase))
                {
                    if (!modifiersDown.Contains(0x11)) modifiersDown.Add(0x11); // VK_CONTROL
                }
                else if (string.Equals(p, "Shift", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "LShift", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "RShift", StringComparison.OrdinalIgnoreCase))
                {
                    if (!modifiersDown.Contains(0x10)) modifiersDown.Add(0x10); // VK_SHIFT
                }
                else if (string.Equals(p, "Alt", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "Menu", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "LAlt", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "RAlt", StringComparison.OrdinalIgnoreCase))
                {
                    if (!modifiersDown.Contains(0x12)) modifiersDown.Add(0x12); // VK_MENU
                }
                else if (string.Equals(p, "Win", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "Windows", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "Cmd", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "LWin", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(p, "RWin", StringComparison.OrdinalIgnoreCase))
                {
                    if (!modifiersDown.Contains(0x5B)) modifiersDown.Add(0x5B); // VK_LWIN
                }
                else
                {
                    byte vk = ParseVirtualKeyCode(p);
                    if (vk != 0) mainVk = vk;
                }
            }
        }

        public static void KeyDown(string combo)
        {
            if (string.IsNullOrWhiteSpace(combo)) return;
            List<byte> modifiersDown;
            byte mainVk;
            ParseKeyCombo(combo, out modifiersDown, out mainVk);

            List<NativeMethods.INPUT> inputs = new List<NativeMethods.INPUT>();
            foreach (byte mod in modifiersDown)
            {
                inputs.Add(CreateKeyInput(mod, false));
            }
            if (mainVk != 0)
            {
                inputs.Add(CreateKeyInput(mainVk, false));
            }

            if (inputs.Count > 0)
            {
                NativeMethods.SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(NativeMethods.INPUT)));
            }
        }

        public static void KeyUp(string combo)
        {
            if (string.IsNullOrWhiteSpace(combo)) return;
            List<byte> modifiersDown;
            byte mainVk;
            ParseKeyCombo(combo, out modifiersDown, out mainVk);

            List<NativeMethods.INPUT> inputs = new List<NativeMethods.INPUT>();
            if (mainVk != 0)
            {
                inputs.Add(CreateKeyInput(mainVk, true));
            }
            for (int i = modifiersDown.Count - 1; i >= 0; i--)
            {
                inputs.Add(CreateKeyInput(modifiersDown[i], true));
            }

            if (inputs.Count > 0)
            {
                NativeMethods.SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(NativeMethods.INPUT)));
            }
        }

        public static void ReleaseAllKeys()
        {
            // Only release modifiers that are actually held: a stray Alt/Win key-up can activate menus in the target app
            byte[] allMods = new byte[] { 0x11, 0x10, 0x12, 0x5B, 0x5C };
            List<NativeMethods.INPUT> inputs = new List<NativeMethods.INPUT>();
            for (int i = 0; i < allMods.Length; i++)
            {
                if (NativeMethods.IsKeyDown(allMods[i])) inputs.Add(CreateKeyInput(allMods[i], true));
            }
            if (inputs.Count == 0) return;
            NativeMethods.SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(NativeMethods.INPUT)));
        }

        public static void ExecuteKeyPress(string combo, int holdMs)
        {
            if (string.IsNullOrWhiteSpace(combo)) return;
            KeyDown(combo);
            Thread.Sleep(Math.Max(5, holdMs));
            KeyUp(combo);
        }

        public static void ExecuteTypeText(string text, int totalDurationMs)
        {
            if (string.IsNullOrEmpty(text)) return;

            // Line breaks are typed as a real Enter key (many apps such as browsers ignore a unicode LF); '\r' is dropped
            text = text.Replace("\r", "");
            int len = text.Length;
            if (len == 0) return;

            // 1. Instant / Fast Batch Typing: If Hold is small (<= 20ms), send all characters in ONE batch call
            if (totalDurationMs <= 20)
            {
                List<NativeMethods.INPUT> batchInputs = new List<NativeMethods.INPUT>(len * 2);
                for (int i = 0; i < len; i++)
                {
                    AddCharInputs(batchInputs, text[i]);
                }
                NativeMethods.SendInput((uint)batchInputs.Count, batchInputs.ToArray(), Marshal.SizeOf(typeof(NativeMethods.INPUT)));
                return;
            }

            // 2. Gradual Typing: Paced smoothly across totalDurationMs
            int delayPerChar = Math.Max(1, totalDurationMs / len);
            List<NativeMethods.INPUT> charInputs = new List<NativeMethods.INPUT>(2);

            for (int i = 0; i < len; i++)
            {
                charInputs.Clear();
                AddCharInputs(charInputs, text[i]);
                NativeMethods.SendInput((uint)charInputs.Count, charInputs.ToArray(), Marshal.SizeOf(typeof(NativeMethods.INPUT)));

                if (delayPerChar > 0)
                {
                    Thread.Sleep(delayPerChar);
                }
            }
        }

        // ---- Free Mouse: keys sent as messages to a window, so they reach it while another window is in front ----
        // A posted key does not change the keyboard state the app reads with GetKeyState: plain keys and text work in most apps,
        // Ctrl / Alt combinations only where the app reads the key messages themselves.

        // The control that has the keyboard inside the window's thread, even while the window is not in front
        public static IntPtr KeyTarget(IntPtr window)
        {
            IntPtr top = NativeMethods.GetTopLevelWindow(window);
            if (top == IntPtr.Zero) return IntPtr.Zero;
            uint pid;
            uint thread = NativeMethods.GetWindowThreadProcessId(top, out pid);
            GUITHREADINFO info = new GUITHREADINFO { cbSize = Marshal.SizeOf(typeof(GUITHREADINFO)) };
            if (GetGUIThreadInfo(thread, ref info) && info.hwndFocus != IntPtr.Zero && (info.hwndFocus == top || NativeMethods.IsChild(top, info.hwndFocus)))
            {
                return info.hwndFocus;
            }
            IntPtr special = SpecialApps.SpecialAppRegistry.ResolveTargetHandle(top, System.Drawing.Point.Empty);
            return special != IntPtr.Zero ? special : top;
        }

        public static void PostKeyDown(IntPtr target, string combo)
        {
            if (target == IntPtr.Zero) return;
            List<byte> modifiers;
            byte mainVk;
            ParseKeyCombo(combo, out modifiers, out mainVk);
            bool alt = modifiers.Contains(0x12);
            foreach (byte mod in modifiers) PostKey(target, mod, false, alt);
            if (mainVk != 0) PostKey(target, mainVk, false, alt);
        }

        public static void PostKeyUp(IntPtr target, string combo)
        {
            if (target == IntPtr.Zero) return;
            List<byte> modifiers;
            byte mainVk;
            ParseKeyCombo(combo, out modifiers, out mainVk);
            bool alt = modifiers.Contains(0x12);
            if (mainVk != 0) PostKey(target, mainVk, true, alt);
            for (int i = modifiers.Count - 1; i >= 0; i--) PostKey(target, modifiers[i], true, alt);
        }

        public static void PostKeyPress(IntPtr target, string combo, int holdMs)
        {
            if (string.IsNullOrWhiteSpace(combo) || target == IntPtr.Zero) return;
            FocusGuard.NoteBackgroundInput(target);
            NativeMethods.PostActivation(target);
            PostKeyDown(target, combo);
            Thread.Sleep(Math.Max(5, holdMs));
            PostKeyUp(target, combo);
        }

        // Each character goes as WM_CHAR, which is what a text box types; a line break is a real Enter key
        public static void PostTypeText(IntPtr target, string text, int totalDurationMs)
        {
            if (string.IsNullOrEmpty(text) || target == IntPtr.Zero) return;
            text = text.Replace("\r", "");
            if (text.Length == 0) return;
            FocusGuard.NoteBackgroundInput(target);
            NativeMethods.PostActivation(target);

            int delayPerChar = totalDurationMs <= 20 ? 0 : Math.Max(1, totalDurationMs / text.Length);
            foreach (char ch in text)
            {
                if (ch == '\n')
                {
                    PostKey(target, 0x0D, false, false);
                    PostKey(target, 0x0D, true, false);
                }
                else
                {
                    NativeMethods.PostMessage(target, 0x0102 /* WM_CHAR */, (IntPtr)ch, (IntPtr)1);
                }
                if (delayPerChar > 0) Thread.Sleep(delayPerChar);
            }
        }

        private static void PostKey(IntPtr target, byte vk, bool keyUp, bool altHeld)
        {
            uint scan = NativeMethods.MapVirtualKey(vk, 0);
            long lParam = 1 | (scan << 16);
            if (IsExtendedKey(vk)) lParam |= 1L << 24;
            if (altHeld) lParam |= 1L << 29;
            if (keyUp) lParam |= (1L << 30) | (1L << 31);

            // With Alt held Windows sends the SYS variants, which is what menus and Alt shortcuts listen to
            uint msg = altHeld ? (keyUp ? 0x0105u /* WM_SYSKEYUP */ : 0x0104u /* WM_SYSKEYDOWN */) : (keyUp ? 0x0101u /* WM_KEYUP */ : 0x0100u /* WM_KEYDOWN */);
            NativeMethods.PostMessage(target, msg, (IntPtr)vk, (IntPtr)unchecked((int)lParam));
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GUITHREADINFO
        {
            public int cbSize;
            public uint flags;
            public IntPtr hwndActive;
            public IntPtr hwndFocus;
            public IntPtr hwndCapture;
            public IntPtr hwndMenuOwner;
            public IntPtr hwndMoveSize;
            public IntPtr hwndCaret;
            public NativeMethods.RECT rcCaret;
        }

        [DllImport("user32.dll")]
        private static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO info);

        private static void AddCharInputs(List<NativeMethods.INPUT> inputs, char ch)
        {
            if (ch == '\n')
            {
                inputs.Add(CreateKeyInput(0x0D, false)); // VK_RETURN
                inputs.Add(CreateKeyInput(0x0D, true));
                return;
            }

            NativeMethods.INPUT down = new NativeMethods.INPUT();
            down.type = NativeMethods.INPUT_KEYBOARD;
            down.u.ki.wScan = (ushort)ch;
            down.u.ki.dwFlags = NativeMethods.KEYEVENTF_UNICODE;
            inputs.Add(down);

            NativeMethods.INPUT up = new NativeMethods.INPUT();
            up.type = NativeMethods.INPUT_KEYBOARD;
            up.u.ki.wScan = (ushort)ch;
            up.u.ki.dwFlags = NativeMethods.KEYEVENTF_UNICODE | NativeMethods.KEYEVENTF_KEYUP;
            inputs.Add(up);
        }

        private static NativeMethods.INPUT CreateKeyInput(byte vk, bool keyUp)
        {
            NativeMethods.INPUT inp = new NativeMethods.INPUT();
            inp.type = NativeMethods.INPUT_KEYBOARD;
            inp.u.ki.wVk = vk;
            inp.u.ki.wScan = (ushort)NativeMethods.MapVirtualKey(vk, 0);
            inp.u.ki.dwFlags = keyUp ? NativeMethods.KEYEVENTF_KEYUP : 0;
            if (IsExtendedKey(vk))
            {
                inp.u.ki.dwFlags |= NativeMethods.KEYEVENTF_EXTENDEDKEY;
            }
            inp.u.ki.time = 0;
            inp.u.ki.dwExtraInfo = IntPtr.Zero;
            return inp;
        }

        private static bool IsExtendedKey(byte vk)
        {
            return (vk == 0x21 || // VK_PRIOR (PageUp)
                    vk == 0x22 || // VK_NEXT (PageDown)
                    vk == 0x23 || // VK_END
                    vk == 0x24 || // VK_HOME
                    vk == 0x25 || // VK_LEFT
                    vk == 0x26 || // VK_UP
                    vk == 0x27 || // VK_RIGHT
                    vk == 0x28 || // VK_DOWN
                    vk == 0x2D || // VK_INSERT
                    vk == 0x2E || // VK_DELETE
                    vk == 0x5B || // VK_LWIN
                    vk == 0x5C || // VK_RWIN
                    vk == 0x5D || // VK_APPS
                    vk == 0x90 || // VK_NUMLOCK
                    vk == 0x14);  // VK_CAPITAL
        }

        public static byte ParseVirtualKeyCode(string keyName)
        {
            if (string.IsNullOrWhiteSpace(keyName)) return 0;
            keyName = keyName.Trim();

            // Special names
            if (string.Equals(keyName, "Space", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Spacebar", StringComparison.OrdinalIgnoreCase)) return 0x20;
            if (string.Equals(keyName, "Enter", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Return", StringComparison.OrdinalIgnoreCase)) return 0x0D;
            if (string.Equals(keyName, "Esc", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Escape", StringComparison.OrdinalIgnoreCase)) return 0x1B;
            if (string.Equals(keyName, "Tab", StringComparison.OrdinalIgnoreCase)) return 0x09;
            if (string.Equals(keyName, "Backspace", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Back", StringComparison.OrdinalIgnoreCase)) return 0x08;
            if (string.Equals(keyName, "Delete", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Del", StringComparison.OrdinalIgnoreCase)) return 0x2E;
            if (string.Equals(keyName, "Insert", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Ins", StringComparison.OrdinalIgnoreCase)) return 0x2D;
            if (string.Equals(keyName, "Home", StringComparison.OrdinalIgnoreCase)) return 0x24;
            if (string.Equals(keyName, "End", StringComparison.OrdinalIgnoreCase)) return 0x23;
            if (string.Equals(keyName, "PageUp", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "PgUp", StringComparison.OrdinalIgnoreCase)) return 0x21;
            if (string.Equals(keyName, "PageDown", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "PgDn", StringComparison.OrdinalIgnoreCase)) return 0x22;
            if (string.Equals(keyName, "Up", StringComparison.OrdinalIgnoreCase)) return 0x26;
            if (string.Equals(keyName, "Down", StringComparison.OrdinalIgnoreCase)) return 0x28;
            if (string.Equals(keyName, "Left", StringComparison.OrdinalIgnoreCase)) return 0x25;
            if (string.Equals(keyName, "Right", StringComparison.OrdinalIgnoreCase)) return 0x27;
            if (string.Equals(keyName, "CapsLock", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Caps", StringComparison.OrdinalIgnoreCase)) return 0x14;
            if (string.Equals(keyName, "PrintScreen", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "PrtSc", StringComparison.OrdinalIgnoreCase)) return 0x2C;
            if (string.Equals(keyName, "ScrollLock", StringComparison.OrdinalIgnoreCase)) return 0x91;
            if (string.Equals(keyName, "Pause", StringComparison.OrdinalIgnoreCase) || string.Equals(keyName, "Break", StringComparison.OrdinalIgnoreCase)) return 0x13;

            // F1 to F24
            for (int f = 1; f <= 24; f++)
            {
                if (string.Equals(keyName, "F" + f, StringComparison.OrdinalIgnoreCase))
                {
                    return (byte)(0x70 + (f - 1));
                }
            }

            // NumPad 0-9
            for (int n = 0; n <= 9; n++)
            {
                if (string.Equals(keyName, "Num" + n, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(keyName, "NumPad" + n, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(keyName, "Numpad" + n, StringComparison.OrdinalIgnoreCase))
                {
                    return (byte)(0x60 + n);
                }
            }

            // Single Character A-Z, 0-9
            if (keyName.Length == 1)
            {
                char c = char.ToUpperInvariant(keyName[0]);
                if (c >= 'A' && c <= 'Z') return (byte)c;
                if (c >= '0' && c <= '9') return (byte)c;

                // Common symbols
                switch (c)
                {
                    case ';': case ':': return 0xBA; // VK_OEM_1
                    case '=': case '+': return 0xBB; // VK_OEM_PLUS
                    case ',': case '<': return 0xBC; // VK_OEM_COMMA
                    case '-': case '_': return 0xBD; // VK_OEM_MINUS
                    case '.': case '>': return 0xBE; // VK_OEM_PERIOD
                    case '/': case '?': return 0xBF; // VK_OEM_2
                    case '`': case '~': return 0xC0; // VK_OEM_3
                    case '[': case '{': return 0xDB; // VK_OEM_4
                    case '\\': case '|': return 0xDC; // VK_OEM_5
                    case ']': case '}': return 0xDD; // VK_OEM_6
                    case '\'': case '"': return 0xDE; // VK_OEM_7
                }
            }

            // Try Enum.TryParse with System.Windows.Forms.Keys
            Keys k;
            if (Enum.TryParse<Keys>(keyName, true, out k))
            {
                return (byte)k;
            }

            return 0;
        }
    }
}
