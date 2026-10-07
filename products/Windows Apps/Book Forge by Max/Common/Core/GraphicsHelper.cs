using System;
using System.Drawing;
using System.Drawing.Drawing2D;

namespace MaxApp.Common
{
    /// <summary>
    /// GDI+ geometry, anti-aliasing, and rounded rectangle drawing utilities.
    /// Eliminates coupling to application-specific VFX/math classes.
    /// </summary>
    public static class GraphicsHelper
    {
        /// <summary>
        /// Creates a closed GraphicsPath representing a rectangle with rounded corners.
        /// </summary>
        public static GraphicsPath GetRoundedRectangle(Rectangle bounds, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            if (radius <= 0 || diameter > bounds.Width || diameter > bounds.Height)
            {
                path.AddRectangle(bounds);
                return path;
            }

            Rectangle arc = new Rectangle(bounds.Location, new Size(diameter, diameter));

            // Top-Left
            path.AddArc(arc, 180, 90);

            // Top-Right
            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);

            // Bottom-Right
            arc.Y = bounds.Bottom - diameter;
            path.AddArc(arc, 0, 90);

            // Bottom-Left
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);

            path.CloseFigure();
            return path;
        }

        /// <summary>
        /// Fills a rounded rectangle with the specified brush.
        /// </summary>
        public static void FillRoundedRectangle(Graphics g, Brush brush, Rectangle bounds, int radius)
        {
            if (g == null || brush == null || bounds.Width <= 0 || bounds.Height <= 0) return;
            using (GraphicsPath path = GetRoundedRectangle(bounds, radius))
            {
                g.FillPath(brush, path);
            }
        }

        /// <summary>
        /// Outlines a rounded rectangle with the specified pen.
        /// </summary>
        public static void DrawRoundedRectangle(Graphics g, Pen pen, Rectangle bounds, int radius)
        {
            if (g == null || pen == null || bounds.Width <= 0 || bounds.Height <= 0) return;
            using (GraphicsPath path = GetRoundedRectangle(bounds, radius))
            {
                g.DrawPath(pen, path);
            }
        }

        /// <summary>
        /// Applies high quality anti-aliasing and rendering hints to a Graphics surface.
        /// </summary>
        public static void ApplyHighQuality(Graphics g)
        {
            if (g == null) return;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        }
    }
}
