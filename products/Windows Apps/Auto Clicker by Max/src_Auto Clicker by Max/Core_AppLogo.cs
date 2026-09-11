using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public static class AppLogo
    {
        [DllImport("user32.dll")]
        private static extern bool DestroyIcon(IntPtr handle);

        private static Icon _cachedIcon = null;

        public static Icon GetAppIcon()
        {
            if (_cachedIcon != null) return _cachedIcon;

            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string[] possibleDirs = Directory.GetDirectories(baseDir, "src_*");
                foreach (string d in possibleDirs)
                {
                    string p = Path.Combine(d, "app.ico");
                    if (File.Exists(p))
                    {
                        _cachedIcon = new Icon(p);
                        return _cachedIcon;
                    }
                }
                string icoPath = Path.Combine(baseDir, "app.ico");
                if (File.Exists(icoPath))
                {
                    _cachedIcon = new Icon(icoPath);
                    return _cachedIcon;
                }
            }
            catch { }

            try
            {
                Icon exeIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (exeIcon != null)
                {
                    _cachedIcon = exeIcon;
                    return _cachedIcon;
                }
            }
            catch { }

            // Dynamic fallback: Generate from vector geometry
            try
            {
                using (Bitmap bmp = RenderLogo(32, 32, Color.FromArgb(100, 102, 233)))
                {
                    IntPtr hIcon = bmp.GetHicon();
                    using (Icon tempIcon = Icon.FromHandle(hIcon))
                    {
                        _cachedIcon = (Icon)tempIcon.Clone();
                    }
                    DestroyIcon(hIcon);
                    return _cachedIcon;
                }
            }
            catch
            {
                return null;
            }
        }

        public static Bitmap RenderLogo(int width, int height, Color? fillColor = null)
        {
            Bitmap bmp = new Bitmap(width, height);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.Clear(Color.Transparent);

                float scale = (Math.Min(width, height) * 0.90f) / 24.0f;
                float offsetX = (width - (24.0f * scale)) / 2.0f;
                float offsetY = (height - (24.0f * scale)) / 2.0f;

                Color color = fillColor ?? Color.FromArgb(100, 102, 233);
                using (SolidBrush brush = new SolidBrush(color))
                {
                    // Path 1
                    using (GraphicsPath p1 = new GraphicsPath())
                    {
                        PointF[] pts1 = new PointF[]
                        {
                            new PointF(offsetX + 16.31f * scale, offsetY + 4.22f * scale),
                            new PointF(offsetX + 16.08f * scale, offsetY + 4.22f * scale),
                            new PointF(offsetX + 8.20f * scale, offsetY + 19.76f * scale),
                            new PointF(offsetX + 11.81f * scale, offsetY + 19.76f * scale),
                            new PointF(offsetX + 17.99f * scale, offsetY + 7.55f * scale),
                            new PointF(offsetX + 16.30f * scale, offsetY + 4.20f * scale)
                        };
                        p1.AddPolygon(pts1);
                        g.FillPath(brush, p1);
                    }

                    // Path 2
                    using (GraphicsPath p2 = new GraphicsPath())
                    {
                        PointF[] pts2 = new PointF[]
                        {
                            new PointF(offsetX + 24.0f * scale, offsetY + 4.70f * scale),
                            new PointF(offsetX + 20.39f * scale, offsetY + 4.70f * scale),
                            new PointF(offsetX + 15.42f * scale, offsetY + 14.50f * scale),
                            new PointF(offsetX + 18.09f * scale, offsetY + 19.77f * scale),
                            new PointF(offsetX + 21.70f * scale, offsetY + 19.77f * scale),
                            new PointF(offsetX + 19.03f * scale, offsetY + 14.50f * scale),
                            new PointF(offsetX + 24.0f * scale, offsetY + 4.70f * scale)
                        };
                        p2.AddPolygon(pts2);
                        g.FillPath(brush, p2);
                    }

                    // Path 3
                    using (GraphicsPath p3 = new GraphicsPath())
                    {
                        PointF[] pts3 = new PointF[]
                        {
                            new PointF(offsetX + 7.88f * scale, offsetY + 4.22f * scale),
                            new PointF(offsetX + 0.0f * scale, offsetY + 19.78f * scale),
                            new PointF(offsetX + 3.61f * scale, offsetY + 19.78f * scale),
                            new PointF(offsetX + 7.87f * scale, offsetY + 11.37f * scale),
                            new PointF(offsetX + 8.11f * scale, offsetY + 11.37f * scale),
                            new PointF(offsetX + 9.79f * scale, offsetY + 14.69f * scale),
                            new PointF(offsetX + 11.60f * scale, offsetY + 11.13f * scale),
                            new PointF(offsetX + 8.10f * scale, offsetY + 4.23f * scale),
                            new PointF(offsetX + 7.88f * scale, offsetY + 4.22f * scale)
                        };
                        p3.AddPolygon(pts3);
                        g.FillPath(brush, p3);
                    }
                }
            }
            return bmp;
        }
    }
}
