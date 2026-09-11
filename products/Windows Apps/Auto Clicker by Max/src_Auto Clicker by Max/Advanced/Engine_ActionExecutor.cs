using System;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public static class ActionExecutor
    {
        [ThreadStatic]
        private static Random _random;
        private static Random Rng
        {
            get
            {
                if (_random == null) _random = new Random(Environment.TickCount ^ Thread.CurrentThread.ManagedThreadId);
                return _random;
            }
        }

        public static Point ApplyJitter(Point pt, int jitterPx)
        {
            if (pt == Point.Empty || jitterPx <= 0) return pt;
            int dx = Rng.Next(-jitterPx, jitterPx + 1);
            int dy = Rng.Next(-jitterPx, jitterPx + 1);
            return new Point(Math.Max(0, pt.X + dx), Math.Max(0, pt.Y + dy));
        }

        public static int ApplyHoldInterval(int baseHoldMs, int randIntervalMs)
        {
            if (randIntervalMs <= 0) return Math.Max(1, baseHoldMs);
            int delta = Rng.Next(-randIntervalMs, randIntervalMs + 1);
            return Math.Max(1, baseHoldMs + delta); // Never < 1ms
        }

        public static int ApplyDelayInterval(int baseDelayMs, int randIntervalMs)
        {
            if (randIntervalMs <= 0) return Math.Max(0, baseDelayMs);
            int delta = Rng.Next(-randIntervalMs, randIntervalMs + 1);
            return Math.Max(0, baseDelayMs + delta); // Never < 0ms
        }

        public static bool MatchesColor(Color actual, Color target, int tolerance = 10)
        {
            int dr = Math.Abs((int)actual.R - (int)target.R);
            int dg = Math.Abs((int)actual.G - (int)target.G);
            int db = Math.Abs((int)actual.B - (int)target.B);
            return (dr <= tolerance && dg <= tolerance && db <= tolerance);
        }

        public static Point FindMatchingPixelInArea(Rectangle area, Color target, int tolerance = 10)
        {
            if (area.Width <= 0 || area.Height <= 0) return Point.Empty;

            int minX = SystemInformation.VirtualScreen.Left;
            int minY = SystemInformation.VirtualScreen.Top;
            int maxX = SystemInformation.VirtualScreen.Right;
            int maxY = SystemInformation.VirtualScreen.Bottom;

            int left = Math.Max(minX, area.Left);
            int top = Math.Max(minY, area.Top);
            int right = Math.Min(maxX, area.Right);
            int bottom = Math.Min(maxY, area.Bottom);

            int width = right - left;
            int height = bottom - top;

            if (width <= 0 || height <= 0) return Point.Empty;

            try
            {
                using (Bitmap bmp = new Bitmap(width, height, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
                {
                    using (Graphics g = Graphics.FromImage(bmp))
                    {
                        g.CopyFromScreen(left, top, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy);
                    }

                    System.Drawing.Imaging.BitmapData data = bmp.LockBits(
                        new Rectangle(0, 0, width, height),
                        System.Drawing.Imaging.ImageLockMode.ReadOnly,
                        System.Drawing.Imaging.PixelFormat.Format32bppArgb);

                    try
                    {
                        int targetR = target.R;
                        int targetG = target.G;
                        int targetB = target.B;

                        int stride = data.Stride;
                        IntPtr scan0 = data.Scan0;
                        int bytesPerPixel = 4;

                        byte[] rowBuffer = new byte[width * bytesPerPixel];

                        for (int y = 0; y < height; y++)
                        {
                            IntPtr rowPtr = new IntPtr(scan0.ToInt64() + y * stride);
                            Marshal.Copy(rowPtr, rowBuffer, 0, rowBuffer.Length);

                            for (int x = 0; x < width; x++)
                            {
                                int idx = x * 4;
                                int b = rowBuffer[idx];
                                int gVal = rowBuffer[idx + 1];
                                int r = rowBuffer[idx + 2];

                                if (Math.Abs(r - targetR) <= tolerance &&
                                    Math.Abs(gVal - targetG) <= tolerance &&
                                    Math.Abs(b - targetB) <= tolerance)
                                {
                                    return new Point(left + x, top + y);
                                }
                            }
                        }
                    }
                    finally
                    {
                        bmp.UnlockBits(data);
                    }
                }
            }
            catch { }

            return Point.Empty;
        }

        public static Point ResolveActualScreenPoint(MacroStep step, Point localPt)
        {
            if (localPt == Point.Empty) return Point.Empty;
            if (step == null || !step.RelativeToWindow || string.IsNullOrEmpty(step.ProcessName)) return localPt;

            IntPtr hWnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle);
            if (hWnd != IntPtr.Zero)
            {
                NativeMethods.POINT origin = new NativeMethods.POINT { X = 0, Y = 0 };
                if (NativeMethods.ClientToScreen(hWnd, ref origin))
                {
                    return new Point(origin.X + localPt.X, origin.Y + localPt.Y);
                }
            }

            return localPt;
        }

        public static void Execute(MacroStep step, bool freeMouseMode, int randIntervalMs = 0, int randJitterPx = 0)
        {
            if (step == null) return;

            int hold = ApplyHoldInterval(step.HoldMs, randIntervalMs);
            Point rawStart = ApplyJitter(step.StartPoint, randJitterPx);
            Point rawEnd = ApplyJitter(step.EndPoint, randJitterPx);

            Point startPt = ResolveActualScreenPoint(step, rawStart);
            Point endPt = ResolveActualScreenPoint(step, rawEnd);

            IntPtr directHwnd = IntPtr.Zero;
            if (freeMouseMode && step.RelativeToWindow && !string.IsNullOrEmpty(step.ProcessName))
            {
                directHwnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle);
            }

            switch (step.ActionType)
            {
                case MacroActionType.LeftClick:
                    if (directHwnd != IntPtr.Zero && rawStart != Point.Empty)
                        PerformClickDirectToWindow(directHwnd, rawStart, 0, hold);
                    else
                        PerformClick(startPt, 0, hold, freeMouseMode);
                    break;

                case MacroActionType.RightClick:
                    if (directHwnd != IntPtr.Zero && rawStart != Point.Empty)
                        PerformClickDirectToWindow(directHwnd, rawStart, 1, hold);
                    else
                        PerformClick(startPt, 1, hold, freeMouseMode);
                    break;

                case MacroActionType.MiddleClick:
                    PerformMiddleScroll(startPt, step.ScrollStep, hold, freeMouseMode);
                    break;

                case MacroActionType.DoubleClick:
                    if (directHwnd != IntPtr.Zero && rawStart != Point.Empty)
                    {
                        PerformClickDirectToWindow(directHwnd, rawStart, 0, hold);
                        Thread.Sleep(Math.Max(20, System.Windows.Forms.SystemInformation.DoubleClickTime / 3));
                        PerformClickDirectToWindow(directHwnd, rawStart, 0, hold);
                    }
                    else
                    {
                        PerformClick(startPt, 0, hold, freeMouseMode);
                        Thread.Sleep(Math.Max(20, System.Windows.Forms.SystemInformation.DoubleClickTime / 3));
                        PerformClick(startPt, 0, hold, freeMouseMode);
                    }
                    break;

                case MacroActionType.DragDrop:
                    PerformDrag(startPt, endPt, hold);
                    break;

                case MacroActionType.KeyPress:
                    KeyboardSimulator.ExecuteKeyPress(step.KeyData, hold);
                    break;

                case MacroActionType.TypeText:
                    KeyboardSimulator.ExecuteTypeText(step.KeyData, hold);
                    break;

                case MacroActionType.Delay:
                    if (hold > 0)
                    {
                        int elapsed = 0;
                        while (elapsed < hold)
                        {
                            int chunk = Math.Min(20, hold - elapsed);
                            Thread.Sleep(chunk);
                            elapsed += chunk;
                        }
                    }
                    break;

                case MacroActionType.WaitColor:
                case MacroActionType.IfColor:
                case MacroActionType.WaitChange:
                    // Handled in MacroRunner
                    break;
            }
        }

        private static void PerformClickDirectToWindow(IntPtr hWnd, Point clientPt, int button, int holdMs)
        {
            IntPtr lParam = (IntPtr)(((clientPt.Y & 0xFFFF) << 16) | (clientPt.X & 0xFFFF));
            uint downMsg = (button == 1) ? 0x0204u : (button == 2 ? 0x0207u : 0x0201u);
            uint upMsg = (button == 1) ? 0x0205u : (button == 2 ? 0x0208u : 0x0202u);
            IntPtr wParam = (button == 1) ? (IntPtr)0x0002 : (button == 2 ? (IntPtr)0x0010 : (IntPtr)0x0001);

            NativeMethods.PostMessage(hWnd, 0x0200 /* WM_MOUSEMOVE */, IntPtr.Zero, lParam);
            NativeMethods.PostMessage(hWnd, downMsg, wParam, lParam);
            if (holdMs > 0) Thread.Sleep(holdMs);
            NativeMethods.PostMessage(hWnd, upMsg, IntPtr.Zero, lParam);
        }

        private static void PerformClick(Point pt, int button, int holdMs, bool freeMouseMode)
        {
            if (pt != Point.Empty)
            {
                if (freeMouseMode)
                {
                    IntPtr targetHwnd = NativeMethods.WindowFromPoint(new NativeMethods.POINT { X = pt.X, Y = pt.Y });
                    if (targetHwnd != IntPtr.Zero)
                    {
                        NativeMethods.POINT screenPt = new NativeMethods.POINT { X = pt.X, Y = pt.Y };
                        NativeMethods.ScreenToClient(targetHwnd, ref screenPt);
                        IntPtr lParam = (IntPtr)(((screenPt.Y & 0xFFFF) << 16) | (screenPt.X & 0xFFFF));

                        uint downMsg = 0x0201; // WM_LBUTTONDOWN
                        uint upMsg = 0x0202;   // WM_LBUTTONUP
                        IntPtr wParam = (IntPtr)0x0001; // MK_LBUTTON

                        if (button == 1) // Right
                        {
                            downMsg = 0x0204;
                            upMsg = 0x0205;
                            wParam = (IntPtr)0x0002;
                        }
                        else if (button == 2) // Middle
                        {
                            downMsg = 0x0207;
                            upMsg = 0x0208;
                            wParam = (IntPtr)0x0010;
                        }

                        NativeMethods.PostMessage(targetHwnd, downMsg, wParam, lParam);
                        Thread.Sleep(holdMs);
                        NativeMethods.PostMessage(targetHwnd, upMsg, IntPtr.Zero, lParam);
                        return;
                    }
                }

                NativeMethods.SetCursorPos(pt.X, pt.Y);
                Thread.Sleep(5);
            }

            uint dwDown = NativeMethods.MOUSEEVENTF_LEFTDOWN;
            uint dwUp = NativeMethods.MOUSEEVENTF_LEFTUP;

            if (button == 1)
            {
                dwDown = NativeMethods.MOUSEEVENTF_RIGHTDOWN;
                dwUp = NativeMethods.MOUSEEVENTF_RIGHTUP;
            }
            else if (button == 2)
            {
                dwDown = NativeMethods.MOUSEEVENTF_MIDDLEDOWN;
                dwUp = NativeMethods.MOUSEEVENTF_MIDDLEUP;
            }

            NativeMethods.INPUT[] inputs = new NativeMethods.INPUT[1];
            inputs[0].type = NativeMethods.INPUT_MOUSE;
            inputs[0].u.mi.dwFlags = dwDown;
            NativeMethods.SendInput(1, inputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));

            Thread.Sleep(holdMs);

            inputs[0].u.mi.dwFlags = dwUp;
            NativeMethods.SendInput(1, inputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));
        }

        private static void PerformMiddleScroll(Point pt, int scrollStep, int holdMs, bool freeMouseMode)
        {
            // 1. If scrollStep == 0 -> Perform Middle Click
            if (scrollStep == 0)
            {
                PerformClick(pt, 2, holdMs, freeMouseMode);
                return;
            }

            // 2. If scrollStep != 0 -> Emulate physical mouse wheel notches paced by Hold (ms)
            int totalNotches = Math.Abs(scrollStep);
            int direction = Math.Sign(scrollStep); // +1: Up, -1: Down
            int singleDelta = direction * 120; // 1 notch = 120 in Windows API

            // Total hold duration divided evenly by total notches: e.g. Hold 300ms / 3 notches = 100ms per notch
            int delayPerNotch = (totalNotches > 0 && holdMs > 0) ? Math.Max(1, holdMs / totalNotches) : 10;

            if (pt != Point.Empty)
            {
                if (freeMouseMode)
                {
                    NativeMethods.POINT screenPt = new NativeMethods.POINT { X = pt.X, Y = pt.Y };
                    IntPtr targetHwnd = NativeMethods.WindowFromPoint(screenPt);
                    if (targetHwnd != IntPtr.Zero)
                    {
                        NativeMethods.POINT clientPt = screenPt;
                        NativeMethods.ScreenToClient(targetHwnd, ref clientPt);
                        IntPtr child = NativeMethods.RealChildWindowFromPoint(targetHwnd, clientPt);
                        if (child != IntPtr.Zero && child != targetHwnd)
                        {
                            targetHwnd = child;
                        }

                        short deltaShort = (short)singleDelta;
                        IntPtr wParam = (IntPtr)((int)((uint)(ushort)deltaShort << 16));
                        IntPtr lParam = (IntPtr)(((ushort)screenPt.Y << 16) | (ushort)screenPt.X);

                        for (int i = 0; i < totalNotches; i++)
                        {
                            NativeMethods.PostMessage(targetHwnd, 0x020A /* WM_MOUSEWHEEL */, wParam, lParam);
                            if (delayPerNotch > 0)
                            {
                                Thread.Sleep(delayPerNotch);
                            }
                        }
                        return;
                    }
                }

                NativeMethods.SetCursorPos(pt.X, pt.Y);
                Thread.Sleep(5);
            }

            // Physical multi-notch wheel dispatch (Identical to physical mouse hardware)
            NativeMethods.INPUT[] inputs = new NativeMethods.INPUT[1];
            inputs[0].type = NativeMethods.INPUT_MOUSE;
            inputs[0].u.mi.dwFlags = NativeMethods.MOUSEEVENTF_WHEEL;
            inputs[0].u.mi.mouseData = (uint)singleDelta;

            for (int i = 0; i < totalNotches; i++)
            {
                NativeMethods.SendInput(1, inputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));
                if (delayPerNotch > 0)
                {
                    Thread.Sleep(delayPerNotch);
                }
            }
        }

        private static void PerformDrag(Point start, Point end, int durationMs)
        {
            if (start == Point.Empty && end == Point.Empty) return;

            durationMs = Math.Max(20, durationMs);

            // Move to start point
            NativeMethods.SetCursorPos(start.X, start.Y);
            Thread.Sleep(10);

            // Left Down
            NativeMethods.INPUT[] inputs = new NativeMethods.INPUT[1];
            inputs[0].type = NativeMethods.INPUT_MOUSE;
            inputs[0].u.mi.dwFlags = NativeMethods.MOUSEEVENTF_LEFTDOWN;
            NativeMethods.SendInput(1, inputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));
            Thread.Sleep(10);

            // Smooth mouse move from start to end over durationMs
            MouseMovementSimulator.MoveSmoothly(start, end, durationMs);
            Thread.Sleep(10);

            // Left Up
            inputs[0].u.mi.dwFlags = NativeMethods.MOUSEEVENTF_LEFTUP;
            NativeMethods.SendInput(1, inputs, Marshal.SizeOf(typeof(NativeMethods.INPUT)));
        }
    }
}
