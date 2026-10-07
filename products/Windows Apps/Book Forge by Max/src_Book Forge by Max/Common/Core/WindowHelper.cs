using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace MaxApp.Common
{
    /// <summary>
    /// Native Window Frame and Corner Management Utility for MaxApp Framework.
    /// Provides hardware-accelerated (DWM GPU) anti-aliased rounded corners on Windows 11+,
    /// and clean symmetrical fallback clipping on Windows 10, eliminating aliasing and elliptical distortion.
    /// </summary>
    public static class WindowHelper
    {
        /// <summary>
        /// Applies ultra-smooth anti-aliased rounded corners to a Form.
        /// - On Windows 11 (Build >= 22000): Engages native DWM GPU compositor (0% aliasing, native drop shadow).
        /// - On Windows 10 / Fallback: Creates clean, symmetrical Win32 GDI RoundRect Region.
        /// </summary>
        /// <param name="form">Target Form</param>
        /// <param name="smallCorners">True for balanced radius (~6px RoundSmall / RadiusMd), false for standard radius (~10-12px Round)</param>
        /// <param name="fallbackRadius">Fallback radius in pixels for Windows 10 (default -1 to use ThemeTokens.Current.FormRadius)</param>
        public static void ApplyRoundedCorners(Form form, bool smallCorners = true, int fallbackRadius = -1)
        {
            if (form == null || form.IsDisposed) return;
            if (!form.IsHandleCreated) return;

            // 1. Windows 11+ Native GPU Hardware Compositor (DWMWA_WINDOW_CORNER_PREFERENCE)
            try
            {
                int pref = smallCorners
                    ? (int)CommonNativeMethods.DwmWindowCornerPreference.RoundSmall
                    : (int)CommonNativeMethods.DwmWindowCornerPreference.Round;

                int res = CommonNativeMethods.DwmSetWindowAttribute(
                    form.Handle,
                    CommonNativeMethods.DWMWA_WINDOW_CORNER_PREFERENCE,
                    ref pref,
                    sizeof(int));

                if (res == 0)
                {
                    // Successfully engaged Windows 11 Native GPU corner rounding.
                    // Release software Region clipping so DWM handles subpixel anti-aliasing!
                    if (form.Region != null)
                    {
                        Region old = form.Region;
                        form.Region = null;
                        try { old.Dispose(); } catch { }
                    }
                    return;
                }
            }
            catch { }

            // 2. Windows 10 / Legacy Fallback (Symmetrical Win32 GDI RoundRect Region)
            if (form.FormBorderStyle == FormBorderStyle.None && form.Width > 10 && form.Height > 10)
            {
                try
                {
                    int r = fallbackRadius > 0 ? fallbackRadius : (ThemeTokens.Current != null ? ThemeTokens.Current.FormRadius : 6);
                    int d = r * 2;
                    IntPtr hRgn = CommonNativeMethods.CreateRoundRectRgn(0, 0, form.Width + 1, form.Height + 1, d, d);
                    if (hRgn != IntPtr.Zero)
                    {
                        CommonNativeMethods.SetWindowRgn(form.Handle, hRgn, true);
                    }
                }
                catch { }
            }
        }

        /// <summary>
        /// Draws an anti-aliased subtle 1px border around the borderless form inside OnPaint.
        /// </summary>
        public static void DrawWindowBorder(Graphics g, Form form, Color borderColor, int radius = -1)
        {
            if (g == null || form == null || form.Width <= 2 || form.Height <= 2) return;

            int r = radius > 0 ? radius : (ThemeTokens.Current != null ? ThemeTokens.Current.FormRadius : 6);
            GraphicsHelper.ApplyHighQuality(g);
            Rectangle rect = new Rectangle(0, 0, form.Width - 1, form.Height - 1);
            using (Pen pen = new Pen(borderColor, 1f))
            {
                pen.Alignment = PenAlignment.Inset;
                GraphicsHelper.DrawRoundedRectangle(g, pen, rect, r);
            }
        }
    }
}
