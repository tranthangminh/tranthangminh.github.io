using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using ModernAutoClicker.Advanced;

namespace ModernAutoClicker
{
    /// <summary>
    /// Universal Multi-Tier Pixel & Screen Sampler.
    /// Supports reading pixels and capturing areas both on the visible screen
    /// and from background windows occluded/covered by other windows (BlueStacks, Chrome, Games, etc.)
    /// via DWM DirectComposition (PW_RENDERFULLCONTENT) and GDI PrintWindow.
    /// </summary>
    public static class PixelSampler
    {
        private static IntPtr GetWindowUnderOurOverlay(NativeMethods.POINT pt)
        {
            uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
            IntPtr wnd = NativeMethods.WindowFromPoint(pt);
            while (wnd != IntPtr.Zero)
            {
                uint pid;
                NativeMethods.GetWindowThreadProcessId(wnd, out pid);
                if (pid != myPid && pid != 0)
                {
                    return wnd;
                }
                wnd = NativeMethods.GetWindow(wnd, 2 /* GW_HWNDNEXT */);
            }
            return IntPtr.Zero;
        }

        /// <summary>
        /// Gets the pixel color for a macro step. If the target window is specified and currently
        /// occluded by another window or Map Overlay, samples directly from the target window's background surface.
        /// </summary>
        public static Color GetPixelColor(MacroStep step, Point sampleScreenPt)
        {
            if (sampleScreenPt == Point.Empty) return Color.Black;

            IntPtr hWnd = IntPtr.Zero;
            if (step != null && step.RelativeToWindow && (step.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(step.ProcessName)))
            {
                hWnd = step.WindowHwnd;
                if (!NativeMethods.IsValidWindowHandle(hWnd, step.ProcessName))
                {
                    hWnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle, step.WindowIndex);
                    if (hWnd != IntPtr.Zero) step.WindowHwnd = hWnd;
                }
            }

            NativeMethods.POINT sPt = new NativeMethods.POINT { X = sampleScreenPt.X, Y = sampleScreenPt.Y };
            IntPtr topAtPt = NativeMethods.WindowFromPoint(sPt);
            uint topPid = 0;
            if (topAtPt != IntPtr.Zero) NativeMethods.GetWindowThreadProcessId(topAtPt, out topPid);
            uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
            bool isOurOverlay = (topPid == myPid);

            if (hWnd != IntPtr.Zero)
            {
                bool isDirectlyVisible = !isOurOverlay &&
                                         (topAtPt == hWnd ||
                                          NativeMethods.IsChild(hWnd, topAtPt) ||
                                          (topAtPt != IntPtr.Zero && NativeMethods.GetTopLevelWindow(topAtPt) == NativeMethods.GetTopLevelWindow(hWnd)));

                // Fast Path: Point is directly visible on screen (not covered by an unrelated window or our overlay)
                if (isDirectlyVisible)
                {
                    return NativeMethods.GetPixelColor(sampleScreenPt.X, sampleScreenPt.Y);
                }

                // Background Path: Point is occluded by another window or our Map Overlay -> Sample from target's backing surface
                Color bgCol;
                if (TrySampleWindowPixel(hWnd, sampleScreenPt, out bgCol))
                {
                    return bgCol;
                }
            }
            else if (isOurOverlay)
            {
                // RelativeToWindow is off, but Map Overlay is covering the sampled pixel -> Bypass overlay
                IntPtr underWnd = GetWindowUnderOurOverlay(sPt);
                if (underWnd != IntPtr.Zero)
                {
                    Color bgCol;
                    if (TrySampleWindowPixel(underWnd, sampleScreenPt, out bgCol))
                    {
                        return bgCol;
                    }
                }
            }

            // Default Fallback: Sample composited screen DC
            return NativeMethods.GetPixelColor(sampleScreenPt.X, sampleScreenPt.Y);
        }

        /// <summary>
        /// Attempts to sample a pixel from the specified window using multi-tier fallback:
        /// Tier 1: DWM DirectComposition (PW_RENDERFULLCONTENT = 2) for modern GPU/accelerated apps
        /// Tier 2: Classic GDI PrintWindow (PW_CLIENTONLY = 1)
        /// Tier 3: Direct Client DC (GetDC)
        /// </summary>
        private static bool TrySampleWindowPixel(IntPtr targetHwnd, Point screenPt, out Color color)
        {
            color = Color.Black;
            if (targetHwnd == IntPtr.Zero || !NativeMethods.IsWindow(targetHwnd)) return false;

            IntPtr topHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (topHwnd == IntPtr.Zero) topHwnd = targetHwnd;

            NativeMethods.POINT clientPt = new NativeMethods.POINT { X = screenPt.X, Y = screenPt.Y };
            if (!NativeMethods.ScreenToClient(topHwnd, ref clientPt)) return false;

            NativeMethods.RECT rc;
            if (!NativeMethods.GetClientRect(topHwnd, out rc)) return false;

            int w = rc.Right - rc.Left;
            int h = rc.Bottom - rc.Top;
            if (w <= 0 || h <= 0) return false;
            if (clientPt.X < 0 || clientPt.X >= w || clientPt.Y < 0 || clientPt.Y >= h) return false;

            IntPtr screenDc = NativeMethods.GetDC(IntPtr.Zero);
            if (screenDc == IntPtr.Zero) return false;

            IntPtr memDc = NativeMethods.CreateCompatibleDC(screenDc);
            IntPtr hBmp = NativeMethods.CreateCompatibleBitmap(screenDc, w, h);
            IntPtr oldBmp = NativeMethods.SelectObject(memDc, hBmp);

            try
            {
                // Tier 1: DWM DirectComposition Surface (covers BlueStacks, Chrome, Discord, DirectX windowed games)
                bool pwSuccess = NativeMethods.PrintWindow(topHwnd, memDc, NativeMethods.PW_RENDERFULLCONTENT);

                // Tier 2: Classic GDI Fallback
                if (!pwSuccess)
                {
                    pwSuccess = NativeMethods.PrintWindow(topHwnd, memDc, NativeMethods.PW_CLIENTONLY);
                }

                // Tier 3: If target is a specific child, attempt direct capture on child window
                if (!pwSuccess && targetHwnd != topHwnd)
                {
                    NativeMethods.POINT childPt = new NativeMethods.POINT { X = screenPt.X, Y = screenPt.Y };
                    if (NativeMethods.ScreenToClient(targetHwnd, ref childPt))
                    {
                        pwSuccess = NativeMethods.PrintWindow(targetHwnd, memDc, NativeMethods.PW_CLIENTONLY);
                        if (pwSuccess)
                        {
                            clientPt = childPt;
                        }
                    }
                }

                if (pwSuccess)
                {
                    uint pixel = NativeMethods.GetPixel(memDc, clientPt.X, clientPt.Y);
                    if (pixel != 0xFFFFFFFF)
                    {
                        byte r = (byte)(pixel & 0x000000FF);
                        byte g = (byte)((pixel & 0x0000FF00) >> 8);
                        byte b = (byte)((pixel & 0x00FF0000) >> 16);
                        color = Color.FromArgb(r, g, b);
                        return true;
                    }
                }

                // Tier 4: Direct Client DC
                IntPtr winDc = NativeMethods.GetDC(targetHwnd);
                if (winDc != IntPtr.Zero)
                {
                    try
                    {
                        NativeMethods.POINT cPt = new NativeMethods.POINT { X = screenPt.X, Y = screenPt.Y };
                        NativeMethods.ScreenToClient(targetHwnd, ref cPt);
                        uint pixel = NativeMethods.GetPixel(winDc, cPt.X, cPt.Y);
                        if (pixel != 0xFFFFFFFF)
                        {
                            byte r = (byte)(pixel & 0x000000FF);
                            byte g = (byte)((pixel & 0x0000FF00) >> 8);
                            byte b = (byte)((pixel & 0x00FF0000) >> 16);
                            color = Color.FromArgb(r, g, b);
                            return true;
                        }
                    }
                    finally
                    {
                        NativeMethods.ReleaseDC(targetHwnd, winDc);
                    }
                }
            }
            catch { }
            finally
            {
                NativeMethods.SelectObject(memDc, oldBmp);
                NativeMethods.DeleteObject(hBmp);
                NativeMethods.DeleteDC(memDc);
                NativeMethods.ReleaseDC(IntPtr.Zero, screenDc);
            }

            return false;
        }

        /// <summary>
        /// Captures an area bitmap for image or color search. Automatically resolves
        /// background surfaces if the target window is occluded.
        /// Caller is responsible for disposing the returned Bitmap!
        /// </summary>
        public static Bitmap CaptureAreaBitmap(MacroStep step, Rectangle scanRect)
        {
            if (scanRect.Width <= 0 || scanRect.Height <= 0) return null;

            int minX = SystemInformation.VirtualScreen.Left;
            int minY = SystemInformation.VirtualScreen.Top;
            int maxX = SystemInformation.VirtualScreen.Right;
            int maxY = SystemInformation.VirtualScreen.Bottom;

            int left = Math.Max(minX, scanRect.Left);
            int top = Math.Max(minY, scanRect.Top);
            int right = Math.Min(maxX, scanRect.Right);
            int bottom = Math.Min(maxY, scanRect.Bottom);

            int width = right - left;
            int height = bottom - top;
            if (width <= 0 || height <= 0) return null;

            Point centerPt = new Point(left + width / 2, top + height / 2);
            NativeMethods.POINT sCenterPt = new NativeMethods.POINT { X = centerPt.X, Y = centerPt.Y };
            IntPtr topAtPt = NativeMethods.WindowFromPoint(sCenterPt);
            uint topPid = 0;
            if (topAtPt != IntPtr.Zero) NativeMethods.GetWindowThreadProcessId(topAtPt, out topPid);
            uint myPid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
            bool isOurOverlay = (topPid == myPid);

            // Check if covered window background capture is required
            if (step != null && step.RelativeToWindow && (step.WindowHwnd != IntPtr.Zero || !string.IsNullOrEmpty(step.ProcessName)))
            {
                IntPtr hWnd = step.WindowHwnd;
                if (!NativeMethods.IsValidWindowHandle(hWnd, step.ProcessName))
                {
                    hWnd = NativeMethods.FindWindowByTarget(step.ProcessName, step.WindowTitle, step.WindowIndex);
                    if (hWnd != IntPtr.Zero) step.WindowHwnd = hWnd;
                }

                if (hWnd != IntPtr.Zero)
                {
                    bool isDirectlyVisible = !isOurOverlay &&
                                              (topAtPt == hWnd ||
                                               NativeMethods.IsChild(hWnd, topAtPt) ||
                                               (topAtPt != IntPtr.Zero && NativeMethods.GetTopLevelWindow(topAtPt) == NativeMethods.GetTopLevelWindow(hWnd)));

                    if (!isDirectlyVisible)
                    {
                        Bitmap bgBmp = TryCaptureWindowArea(hWnd, new Rectangle(left, top, width, height));
                        if (bgBmp != null) return bgBmp;
                    }
                }
            }
            else if (isOurOverlay)
            {
                IntPtr underWnd = GetWindowUnderOurOverlay(sCenterPt);
                if (underWnd != IntPtr.Zero)
                {
                    Bitmap bgBmp = TryCaptureWindowArea(underWnd, new Rectangle(left, top, width, height));
                    if (bgBmp != null) return bgBmp;
                }
            }

            // Fast Path: Capture from visible screen
            try
            {
                Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.CopyFromScreen(left, top, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy);
                }
                return bmp;
            }
            catch
            {
                return null;
            }
        }

        private static Bitmap TryCaptureWindowArea(IntPtr targetHwnd, Rectangle screenRect)
        {
            if (targetHwnd == IntPtr.Zero || !NativeMethods.IsWindow(targetHwnd)) return null;

            IntPtr topHwnd = NativeMethods.GetTopLevelWindow(targetHwnd);
            if (topHwnd == IntPtr.Zero) topHwnd = targetHwnd;

            NativeMethods.RECT rc;
            if (!NativeMethods.GetClientRect(topHwnd, out rc)) return null;

            int winW = rc.Right - rc.Left;
            int winH = rc.Bottom - rc.Top;
            if (winW <= 0 || winH <= 0) return null;

            NativeMethods.POINT pTopLeft = new NativeMethods.POINT { X = screenRect.Left, Y = screenRect.Top };
            if (!NativeMethods.ScreenToClient(topHwnd, ref pTopLeft)) return null;

            IntPtr screenDc = NativeMethods.GetDC(IntPtr.Zero);
            if (screenDc == IntPtr.Zero) return null;

            IntPtr memDc = NativeMethods.CreateCompatibleDC(screenDc);
            IntPtr hBmp = NativeMethods.CreateCompatibleBitmap(screenDc, winW, winH);
            IntPtr oldBmp = NativeMethods.SelectObject(memDc, hBmp);

            Bitmap result = null;
            try
            {
                bool pwSuccess = NativeMethods.PrintWindow(topHwnd, memDc, NativeMethods.PW_RENDERFULLCONTENT);
                if (!pwSuccess)
                {
                    pwSuccess = NativeMethods.PrintWindow(topHwnd, memDc, NativeMethods.PW_CLIENTONLY);
                }

                if (pwSuccess)
                {
                    using (Bitmap fullWindowBmp = Bitmap.FromHbitmap(hBmp))
                    {
                        int srcX = Math.Max(0, Math.Min(winW - 1, pTopLeft.X));
                        int srcY = Math.Max(0, Math.Min(winH - 1, pTopLeft.Y));
                        int cropW = Math.Max(1, Math.Min(screenRect.Width, winW - srcX));
                        int cropH = Math.Max(1, Math.Min(screenRect.Height, winH - srcY));

                        Rectangle cropRect = new Rectangle(srcX, srcY, cropW, cropH);
                        result = fullWindowBmp.Clone(cropRect, PixelFormat.Format32bppArgb);
                    }
                }
            }
            catch { }
            finally
            {
                NativeMethods.SelectObject(memDc, oldBmp);
                NativeMethods.DeleteObject(hBmp);
                NativeMethods.DeleteDC(memDc);
                NativeMethods.ReleaseDC(IntPtr.Zero, screenDc);
            }

            return result;
        }

        /// <summary>
        /// Finds matching pixel inside an area, supporting both direct screen and occluded windows.
        /// </summary>
        public static Point FindMatchingPixelInArea(MacroStep step, Rectangle area, Color target, int tolerance = 10)
        {
            if (area.Width <= 0 || area.Height <= 0) return Point.Empty;

            using (Bitmap bmp = CaptureAreaBitmap(step, area))
            {
                if (bmp == null) return Point.Empty;

                int width = bmp.Width;
                int height = bmp.Height;

                BitmapData data = bmp.LockBits(
                    new Rectangle(0, 0, width, height),
                    ImageLockMode.ReadOnly,
                    PixelFormat.Format32bppArgb);

                try
                {
                    int targetR = target.R;
                    int targetG = target.G;
                    int targetB = target.B;

                    int stride = data.Stride;
                    IntPtr scan0 = data.Scan0;
                    byte[] rowBuffer = new byte[width * 4];

                    for (int y = 0; y < height; y++)
                    {
                        IntPtr rowPtr = new IntPtr(scan0.ToInt64() + y * stride);
                        Marshal.Copy(rowPtr, rowBuffer, 0, rowBuffer.Length);

                        for (int x = 0; x < width; x++)
                        {
                            int idx = x * 4;
                            int b = rowBuffer[idx];
                            int g = rowBuffer[idx + 1];
                            int r = rowBuffer[idx + 2];

                            int dr = Math.Abs(r - targetR);
                            int dg = Math.Abs(g - targetG);
                            int db = Math.Abs(b - targetB);

                            if (dr <= tolerance && dg <= tolerance && db <= tolerance)
                            {
                                return new Point(area.Left + x, area.Top + y);
                            }
                        }
                    }
                }
                finally
                {
                    bmp.UnlockBits(data);
                }
            }

            return Point.Empty;
        }

        /// <summary>
        /// Finds template image inside an area, supporting both direct screen and occluded windows.
        /// </summary>
        public static bool FindTemplateInArea(MacroStep step, Rectangle scanArea, Bitmap templateBmp, int similarityPercent, out Point foundCenter)
        {
            foundCenter = Point.Empty;
            if (scanArea.Width <= 0 || scanArea.Height <= 0 || templateBmp == null) return false;

            using (Bitmap screenBmp = CaptureAreaBitmap(step, scanArea))
            {
                if (screenBmp == null) return false;

                Point localCenter;
                if (ActionExecutor.FindTemplateInBitmap(screenBmp, templateBmp, similarityPercent, out localCenter))
                {
                    foundCenter = new Point(scanArea.Left + localCenter.X, scanArea.Top + localCenter.Y);
                    return true;
                }
            }

            return false;
        }
    }
}
