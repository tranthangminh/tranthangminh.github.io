using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public static class KeyboardSimulator
    {
        public static void ExecuteKeyPress(string combo, int holdMs)
        {
            if (string.IsNullOrWhiteSpace(combo)) return;

            string[] parts = combo.Split(new char[] { '+', '-', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return;

            List<byte> modifiersDown = new List<byte>();
            byte mainVk = 0;

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

            // Build SendInput list
            List<NativeMethods.INPUT> inputs = new List<NativeMethods.INPUT>();

            // 1. Modifiers Down
            foreach (byte mod in modifiersDown)
            {
                inputs.Add(CreateKeyInput(mod, false));
            }

            // 2. Main Key Down
            if (mainVk != 0)
            {
                inputs.Add(CreateKeyInput(mainVk, false));
            }

            if (inputs.Count > 0)
            {
                NativeMethods.SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(NativeMethods.INPUT)));
            }

            // 3. Hold duration
            Thread.Sleep(Math.Max(5, holdMs));

            // 4. Main Key Up and Modifiers Up in Reverse Order
            inputs.Clear();
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

        public static void ExecuteTypeText(string text, int totalDurationMs)
        {
            if (string.IsNullOrEmpty(text)) return;

            int len = text.Length;

            // 1. Instant / Fast Batch Typing: If Hold is small (<= 20ms), send all unicode characters in ONE batch call
            if (totalDurationMs <= 20)
            {
                NativeMethods.INPUT[] batchInputs = new NativeMethods.INPUT[len * 2];
                for (int i = 0; i < len; i++)
                {
                    char ch = text[i];

                    batchInputs[i * 2].type = NativeMethods.INPUT_KEYBOARD;
                    batchInputs[i * 2].u.ki.wScan = (ushort)ch;
                    batchInputs[i * 2].u.ki.dwFlags = NativeMethods.KEYEVENTF_UNICODE;

                    batchInputs[(i * 2) + 1].type = NativeMethods.INPUT_KEYBOARD;
                    batchInputs[(i * 2) + 1].u.ki.wScan = (ushort)ch;
                    batchInputs[(i * 2) + 1].u.ki.dwFlags = NativeMethods.KEYEVENTF_UNICODE | NativeMethods.KEYEVENTF_KEYUP;
                }
                NativeMethods.SendInput((uint)batchInputs.Length, batchInputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));
                return;
            }

            // 2. Gradual Typing: Paced smoothly across totalDurationMs
            int delayPerChar = Math.Max(1, totalDurationMs / len);
            NativeMethods.INPUT[] charInputs = new NativeMethods.INPUT[2];

            for (int i = 0; i < len; i++)
            {
                char ch = text[i];

                charInputs[0].type = NativeMethods.INPUT_KEYBOARD;
                charInputs[0].u.ki.wScan = (ushort)ch;
                charInputs[0].u.ki.dwFlags = NativeMethods.KEYEVENTF_UNICODE;

                charInputs[1].type = NativeMethods.INPUT_KEYBOARD;
                charInputs[1].u.ki.wScan = (ushort)ch;
                charInputs[1].u.ki.dwFlags = NativeMethods.KEYEVENTF_UNICODE | NativeMethods.KEYEVENTF_KEYUP;

                NativeMethods.SendInput(2, charInputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));

                if (delayPerChar > 0)
                {
                    Thread.Sleep(delayPerChar);
                }
            }
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
