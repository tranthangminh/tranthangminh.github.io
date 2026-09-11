using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Xml;

namespace ModernAutoClicker.Info
{
    public static class SvgFileRenderer
    {
        private static string _lastLoadedPath = null;
        private static DateTime _lastLoadedTime = DateTime.MinValue;
        private static GraphicsPath _cachedPath = null;
        private static RectangleF _cachedViewBox = RectangleF.Empty;
        private static Image _cachedAppIconImage = null;
        private static int _cachedAppIconSize = 0;

        public static string FindAppSvgFile()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            List<string> searchPaths = new List<string>();
            try
            {
                foreach (string d in Directory.GetDirectories(baseDir, "src_*"))
                {
                    searchPaths.Add(Path.Combine(d, "app.svg"));
                    searchPaths.Add(Path.Combine(d, "Info", "app.svg"));
                }
            }
            catch { }
            searchPaths.Add(Path.Combine(baseDir, "app.svg"));
            searchPaths.Add(Path.Combine(baseDir, "Info", "app.svg"));

            foreach (string p in searchPaths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        public static Image GetAppIconImage(int size = 26)
        {
            if (_cachedAppIconImage != null && _cachedAppIconSize == size)
                return _cachedAppIconImage;

            try
            {
                Icon ico = AppLogo.GetAppIcon();
                if (ico != null)
                {
                    _cachedAppIconImage = new Bitmap(ico.ToBitmap(), new Size(size, size));
                    _cachedAppIconSize = size;
                    return _cachedAppIconImage;
                }
            }
            catch { }

            return null;
        }

        public static string FindLogoFile()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            List<string> searchPaths = new List<string>();
            try
            {
                foreach (string d in Directory.GetDirectories(baseDir, "src_*"))
                {
                    searchPaths.Add(Path.Combine(d, "Info", "logo-MAX.svg"));
                    searchPaths.Add(Path.Combine(d, "logo-MAX.svg"));
                    searchPaths.Add(Path.Combine(d, "Info", "logo-MAX.png"));
                    searchPaths.Add(Path.Combine(d, "logo-MAX.png"));
                    searchPaths.Add(Path.Combine(d, "app.svg"));
                }
            }
            catch { }
            searchPaths.Add(Path.Combine(baseDir, "Info", "logo-MAX.svg"));
            searchPaths.Add(Path.Combine(baseDir, "logo-MAX.svg"));
            searchPaths.Add(Path.Combine(baseDir, "logo-MAX.png"));
            searchPaths.Add(Path.Combine(baseDir, "app.svg"));

            foreach (string p in searchPaths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        public static Bitmap RenderLogoFromFile(int targetWidth, int targetHeight, Color? tintColor = null)
        {
            string filePath = FindLogoFile();
            if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath))
            {
                // Fallback default
                return AppLogo.RenderLogo(targetWidth, targetHeight, tintColor);
            }

            string ext = Path.GetExtension(filePath).ToLowerInvariant();
            if (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".bmp" || ext == ".gif")
            {
                try
                {
                    using (Image img = Image.FromFile(filePath))
                    {
                        Bitmap bmp = new Bitmap(targetWidth, targetHeight);
                        using (Graphics g = Graphics.FromImage(bmp))
                        {
                            g.SmoothingMode = SmoothingMode.AntiAlias;
                            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                            g.Clear(Color.Transparent);

                            float scale = Math.Min((float)targetWidth / img.Width, (float)targetHeight / img.Height);
                            float w = img.Width * scale;
                            float h = img.Height * scale;
                            float x = (targetWidth - w) / 2.0f;
                            float y = (targetHeight - h) / 2.0f;

                            g.DrawImage(img, x, y, w, h);
                        }
                        return bmp;
                    }
                }
                catch
                {
                    return AppLogo.RenderLogo(targetWidth, targetHeight, tintColor);
                }
            }

            // SVG Parser
            try
            {
                DateTime lastWrite = File.GetLastWriteTime(filePath);
                if (_cachedPath == null || _lastLoadedPath != filePath || _lastLoadedTime != lastWrite)
                {
                    LoadSvgGeometry(filePath);
                }

                if (_cachedPath == null || _cachedViewBox.Width <= 0 || _cachedViewBox.Height <= 0)
                {
                    return AppLogo.RenderLogo(targetWidth, targetHeight, tintColor);
                }

                Bitmap bmp = new Bitmap(targetWidth, targetHeight);
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.Clear(Color.Transparent);

                    float scaleX = targetWidth / _cachedViewBox.Width;
                    float scaleY = targetHeight / _cachedViewBox.Height;
                    float scale = Math.Min(scaleX, scaleY) * 0.92f;

                    float drawW = _cachedViewBox.Width * scale;
                    float drawH = _cachedViewBox.Height * scale;
                    float offX = (targetWidth - drawW) / 2.0f - (_cachedViewBox.X * scale);
                    float offY = (targetHeight - drawH) / 2.0f - (_cachedViewBox.Y * scale);

                    using (Matrix mat = new Matrix())
                    {
                        mat.Translate(offX, offY);
                        mat.Scale(scale, scale);

                        using (GraphicsPath transformed = (GraphicsPath)_cachedPath.Clone())
                        {
                            transformed.Transform(mat);
                            Color c = tintColor ?? Color.FromArgb(100, 102, 233);
                            using (SolidBrush brush = new SolidBrush(c))
                            {
                                g.FillPath(brush, transformed);
                            }
                        }
                    }
                }
                return bmp;
            }
            catch
            {
                return AppLogo.RenderLogo(targetWidth, targetHeight, tintColor);
            }
        }

        private static void LoadSvgGeometry(string filePath)
        {
            XmlDocument doc = new XmlDocument();
            doc.Load(filePath);

            XmlNode svgNode = doc.DocumentElement;
            if (svgNode == null || svgNode.Name.ToLowerInvariant() != "svg") return;

            RectangleF viewBox = RectangleF.Empty;
            XmlAttribute vbAttr = svgNode.Attributes["viewBox"];
            if (vbAttr != null && !string.IsNullOrEmpty(vbAttr.Value))
            {
                string[] parts = vbAttr.Value.Trim().Split(new char[] { ' ', ',', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 4)
                {
                    float vx = float.Parse(parts[0], CultureInfo.InvariantCulture);
                    float vy = float.Parse(parts[1], CultureInfo.InvariantCulture);
                    float vw = float.Parse(parts[2], CultureInfo.InvariantCulture);
                    float vh = float.Parse(parts[3], CultureInfo.InvariantCulture);
                    viewBox = new RectangleF(vx, vy, vw, vh);
                }
            }

            // Identify "none" fill styles or classes
            HashSet<string> noneFillClasses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            XmlNodeList styleNodes = doc.GetElementsByTagName("style");
            foreach (XmlNode st in styleNodes)
            {
                string css = st.InnerText;
                MatchCollection mc = Regex.Matches(css, @"\.([a-zA-Z0-9_\-]+)\s*\{[^}]*fill\s*:\s*none[^}]*\}", RegexOptions.IgnoreCase);
                foreach (Match m in mc)
                {
                    if (m.Groups.Count > 1) noneFillClasses.Add(m.Groups[1].Value);
                }
            }

            GraphicsPath totalPath = new GraphicsPath(FillMode.Alternate);

            // 1. Polygons & Polylines
            XmlNodeList polygons = doc.GetElementsByTagName("polygon");
            foreach (XmlNode poly in polygons)
            {
                if (IsElementNoneFill(poly, noneFillClasses)) continue;
                XmlAttribute ptsAttr = poly.Attributes["points"];
                if (ptsAttr != null && !string.IsNullOrEmpty(ptsAttr.Value))
                {
                    PointF[] pts = ParsePoints(ptsAttr.Value);
                    if (pts != null && pts.Length >= 3)
                    {
                        totalPath.AddPolygon(pts);
                    }
                }
            }

            XmlNodeList polylines = doc.GetElementsByTagName("polyline");
            foreach (XmlNode poly in polylines)
            {
                if (IsElementNoneFill(poly, noneFillClasses)) continue;
                XmlAttribute ptsAttr = poly.Attributes["points"];
                if (ptsAttr != null && !string.IsNullOrEmpty(ptsAttr.Value))
                {
                    PointF[] pts = ParsePoints(ptsAttr.Value);
                    if (pts != null && pts.Length >= 3)
                    {
                        totalPath.AddPolygon(pts);
                    }
                }
            }

            // 2. Paths
            XmlNodeList paths = doc.GetElementsByTagName("path");
            foreach (XmlNode p in paths)
            {
                if (IsElementNoneFill(p, noneFillClasses)) continue;
                XmlAttribute dAttr = p.Attributes["d"];
                if (dAttr != null && !string.IsNullOrEmpty(dAttr.Value))
                {
                    AppendSvgPathToGraphicsPath(dAttr.Value, totalPath);
                }
            }

            // 3. Rectangles
            XmlNodeList rects = doc.GetElementsByTagName("rect");
            foreach (XmlNode r in rects)
            {
                if (IsElementNoneFill(r, noneFillClasses)) continue;
                float x = GetFloatAttr(r, "x", 0);
                float y = GetFloatAttr(r, "y", 0);
                float w = GetFloatAttr(r, "width", 0);
                float h = GetFloatAttr(r, "height", 0);
                if (w > 0 && h > 0)
                {
                    totalPath.AddRectangle(new RectangleF(x, y, w, h));
                }
            }

            // 4. Circles & Ellipses
            XmlNodeList circles = doc.GetElementsByTagName("circle");
            foreach (XmlNode c in circles)
            {
                if (IsElementNoneFill(c, noneFillClasses)) continue;
                float cx = GetFloatAttr(c, "cx", 0);
                float cy = GetFloatAttr(c, "cy", 0);
                float r = GetFloatAttr(c, "r", 0);
                if (r > 0)
                {
                    totalPath.AddEllipse(cx - r, cy - r, r * 2, r * 2);
                }
            }

            if (viewBox.IsEmpty || viewBox.Width <= 0 || viewBox.Height <= 0)
            {
                RectangleF bounds = totalPath.GetBounds();
                if (!bounds.IsEmpty && bounds.Width > 0 && bounds.Height > 0)
                {
                    viewBox = bounds;
                }
                else
                {
                    viewBox = new RectangleF(0, 0, 100, 100);
                }
            }

            _cachedPath = totalPath;
            _cachedViewBox = viewBox;
            _lastLoadedPath = filePath;
            _lastLoadedTime = File.GetLastWriteTime(filePath);
        }

        private static bool IsElementNoneFill(XmlNode node, HashSet<string> noneFillClasses)
        {
            XmlAttribute classAttr = node.Attributes["class"];
            if (classAttr != null && !string.IsNullOrEmpty(classAttr.Value))
            {
                string[] classes = classAttr.Value.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string cl in classes)
                {
                    if (noneFillClasses.Contains(cl)) return true;
                }
            }

            XmlAttribute fillAttr = node.Attributes["fill"];
            if (fillAttr != null && fillAttr.Value.Trim().Equals("none", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            XmlAttribute styleAttr = node.Attributes["style"];
            if (styleAttr != null && styleAttr.Value.IndexOf("fill:none", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            return false;
        }

        private static float GetFloatAttr(XmlNode node, string name, float defaultVal)
        {
            XmlAttribute attr = node.Attributes[name];
            if (attr == null || string.IsNullOrEmpty(attr.Value)) return defaultVal;
            float val;
            if (float.TryParse(attr.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out val)) return val;
            return defaultVal;
        }

        private static PointF[] ParsePoints(string pointsStr)
        {
            List<float> nums = ParseNumbers(pointsStr);
            if (nums.Count < 2) return null;
            int count = nums.Count / 2;
            PointF[] pts = new PointF[count];
            for (int i = 0; i < count; i++)
            {
                pts[i] = new PointF(nums[i * 2], nums[i * 2 + 1]);
            }
            return pts;
        }

        private static List<float> ParseNumbers(string text)
        {
            List<float> result = new List<float>();
            MatchCollection matches = Regex.Matches(text, @"[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?");
            foreach (Match m in matches)
            {
                float val;
                if (float.TryParse(m.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out val))
                {
                    result.Add(val);
                }
            }
            return result;
        }

        private static void AppendSvgPathToGraphicsPath(string d, GraphicsPath path)
        {
            if (string.IsNullOrEmpty(d)) return;

            MatchCollection tokens = Regex.Matches(d, @"([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)");
            if (tokens.Count == 0) return;

            char currentCmd = 'M';
            int i = 0;
            PointF cur = new PointF(0, 0);
            List<PointF> currentFigure = new List<PointF>();

            Action finishSubFigure = () =>
            {
                if (currentFigure.Count >= 3)
                {
                    path.AddPolygon(currentFigure.ToArray());
                }
                else if (currentFigure.Count == 2)
                {
                    path.AddLine(currentFigure[0], currentFigure[1]);
                }
                currentFigure.Clear();
            };

            while (i < tokens.Count)
            {
                string tok = tokens[i].Value;
                if (char.IsLetter(tok[0]))
                {
                    currentCmd = tok[0];
                    i++;
                }

                switch (currentCmd)
                {
                    case 'M':
                    case 'm':
                        {
                            finishSubFigure();
                            if (i >= tokens.Count) break;
                            float x = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float y = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            if (currentCmd == 'm') { cur = new PointF(cur.X + x, cur.Y + y); }
                            else { cur = new PointF(x, y); }

                            currentFigure.Add(cur);
                            currentCmd = (currentCmd == 'm') ? 'l' : 'L';
                        }
                        break;

                    case 'L':
                    case 'l':
                        {
                            if (i >= tokens.Count) break;
                            float x = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float y = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            PointF next = (currentCmd == 'l') ? new PointF(cur.X + x, cur.Y + y) : new PointF(x, y);
                            currentFigure.Add(next);
                            cur = next;
                        }
                        break;

                    case 'H':
                    case 'h':
                        {
                            if (i >= tokens.Count) break;
                            float x = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            PointF next = (currentCmd == 'h') ? new PointF(cur.X + x, cur.Y) : new PointF(x, cur.Y);
                            currentFigure.Add(next);
                            cur = next;
                        }
                        break;

                    case 'V':
                    case 'v':
                        {
                            if (i >= tokens.Count) break;
                            float y = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            PointF next = (currentCmd == 'v') ? new PointF(cur.X, cur.Y + y) : new PointF(cur.X, y);
                            currentFigure.Add(next);
                            cur = next;
                        }
                        break;

                    case 'C':
                    case 'c':
                        {
                            if (i + 5 >= tokens.Count) { i = tokens.Count; break; }
                            float x1 = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float y1 = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float x2 = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float y2 = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float x = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);
                            float y = float.Parse(tokens[i++].Value, CultureInfo.InvariantCulture);

                            PointF cp1 = (currentCmd == 'c') ? new PointF(cur.X + x1, cur.Y + y1) : new PointF(x1, y1);
                            PointF cp2 = (currentCmd == 'c') ? new PointF(cur.X + x2, cur.Y + y2) : new PointF(x2, y2);
                            PointF end = (currentCmd == 'c') ? new PointF(cur.X + x, cur.Y + y) : new PointF(x, y);

                            for (int step = 1; step <= 8; step++)
                            {
                                float t = step / 8.0f;
                                float u = 1.0f - t;
                                float px = u * u * u * cur.X + 3 * u * u * t * cp1.X + 3 * u * t * t * cp2.X + t * t * t * end.X;
                                float py = u * u * u * cur.Y + 3 * u * u * t * cp1.Y + 3 * u * t * t * cp2.Y + t * t * t * end.Y;
                                currentFigure.Add(new PointF(px, py));
                            }
                            cur = end;
                        }
                        break;

                    case 'Z':
                    case 'z':
                        {
                            finishSubFigure();
                        }
                        break;

                    default:
                        i++;
                        break;
                }
            }

            finishSubFigure();
        }
    }
}
