using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Xml;

namespace ModernAutoClicker.Info
{
    public static class SvgFileRenderer
    {
        private class SvgShapeItem
        {
            public GraphicsPath Path;
            public Color Color;
        }

        private class SvgTextItem
        {
            public string Content;
            public float X, Y;
            public float FontSize;
            public Color Color;
        }

        private class SvgData
        {
            public GraphicsPath Path;
            public RectangleF ViewBox;
            public List<SvgShapeItem> Shapes;
            public List<SvgTextItem> Texts;
            public bool IsMultiColor;
        }

        private static readonly Dictionary<string, SvgData> _svgCache =
            new Dictionary<string, SvgData>(StringComparer.OrdinalIgnoreCase);

        private static Image _cachedAppIconImage = null;
        private static int _cachedAppIconSize = 0;

        /// <summary>
        /// Universal SVG renderer: renders directly from embedded resource inside exe, or from file on disk.
        /// Supports both single-tint monochrome icons and multi-color high-fidelity illustrations (e.g. QR_Vietcombank.svg).
        /// </summary>
        public static Bitmap RenderSvg(string nameOrPath, int targetWidth, int targetHeight, Color? tintColor = null)
        {
            try
            {
                SvgData data;
                if (!_svgCache.TryGetValue(nameOrPath, out data))
                {
                    XmlDocument doc = LoadSvgDocument(nameOrPath);
                    if (doc != null)
                    {
                        data = ParseSvgDocument(doc);
                        if (data != null)
                        {
                            _svgCache[nameOrPath] = data;
                        }
                    }
                }

                if (data == null || data.Path == null || data.ViewBox.Width <= 0 || data.ViewBox.Height <= 0)
                {
                    return null;
                }

                Bitmap bmp = new Bitmap(targetWidth, targetHeight);
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.Clear(Color.Transparent);

                    if (tintColor == null && data.IsMultiColor && data.Shapes != null && data.Shapes.Count > 0)
                    {
                        // Multi-color SVG high-fidelity rendering (e.g. QR_Vietcombank.svg)
                        float scale = Math.Min(targetWidth / data.ViewBox.Width, targetHeight / data.ViewBox.Height);
                        float offX = (targetWidth - data.ViewBox.Width * scale) / 2.0f;
                        float offY = (targetHeight - data.ViewBox.Height * scale) / 2.0f;

                        using (Matrix mat = new Matrix())
                        {
                            mat.Translate(offX, offY);
                            mat.Scale(scale, scale);

                            foreach (SvgShapeItem s in data.Shapes)
                            {
                                using (GraphicsPath transformed = (GraphicsPath)s.Path.Clone())
                                {
                                    transformed.Transform(mat);
                                    using (SolidBrush brush = new SolidBrush(s.Color))
                                    {
                                        g.FillPath(brush, transformed);
                                    }
                                }
                            }

                            if (data.Texts != null && data.Texts.Count > 0)
                            {
                                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
                                foreach (SvgTextItem txt in data.Texts)
                                {
                                    PointF[] pt = new PointF[] { new PointF(txt.X, txt.Y) };
                                    mat.TransformPoints(pt);
                                    float scaledFont = txt.FontSize * scale;
                                    using (Font font = new Font("Segoe UI", scaledFont * 0.72f, FontStyle.Bold, GraphicsUnit.Pixel))
                                    using (SolidBrush b = new SolidBrush(txt.Color))
                                    {
                                        g.DrawString(txt.Content, font, b, pt[0].X, pt[0].Y - (scaledFont * 0.85f));
                                    }
                                }
                            }
                        }
                    }
                    else
                    {
                        // Monochrome icon rendering with tintColor (e.g. logo-MAX.svg)
                        float scaleX = targetWidth / data.ViewBox.Width;
                        float scaleY = targetHeight / data.ViewBox.Height;
                        float scale = Math.Min(scaleX, scaleY) * 0.92f;

                        float drawW = data.ViewBox.Width * scale;
                        float drawH = data.ViewBox.Height * scale;
                        float offX = (targetWidth - drawW) / 2.0f - (data.ViewBox.X * scale);
                        float offY = (targetHeight - drawH) / 2.0f - (data.ViewBox.Y * scale);

                        using (Matrix mat = new Matrix())
                        {
                            mat.Translate(offX, offY);
                            mat.Scale(scale, scale);

                            using (GraphicsPath transformed = (GraphicsPath)data.Path.Clone())
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
                }
                return bmp;
            }
            catch
            {
                return null;
            }
        }

        private static XmlDocument LoadSvgDocument(string nameOrPath)
        {
            try
            {
                // 1. Try embedded resource inside exe
                Assembly asm = Assembly.GetExecutingAssembly();
                string[] resNames = asm.GetManifestResourceNames();
                foreach (string res in resNames)
                {
                    if (res.Equals(nameOrPath, StringComparison.OrdinalIgnoreCase) ||
                        res.EndsWith("." + nameOrPath, StringComparison.OrdinalIgnoreCase))
                    {
                        using (Stream s = asm.GetManifestResourceStream(res))
                        {
                            if (s != null)
                            {
                                XmlDocument d = new XmlDocument();
                                d.Load(s);
                                return d;
                            }
                        }
                    }
                }

                // 2. Try file system
                string path = nameOrPath;
                if (!File.Exists(path))
                {
                    string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                    string p1 = Path.Combine(baseDir, nameOrPath);
                    if (File.Exists(p1)) path = p1;
                    else
                    {
                        string p2 = Path.Combine(baseDir, "Info", nameOrPath);
                        if (File.Exists(p2)) path = p2;
                        else
                        {
                            string pSvg = Path.Combine(baseDir, "svg", nameOrPath);
                            if (File.Exists(pSvg)) path = pSvg;
                            else
                            {
                                foreach (string d in Directory.GetDirectories(baseDir, "src_*"))
                                {
                                    string p3 = Path.Combine(d, nameOrPath);
                                    if (File.Exists(p3)) { path = p3; break; }
                                    string p4 = Path.Combine(d, "Info", nameOrPath);
                                    if (File.Exists(p4)) { path = p4; break; }
                                    string p5 = Path.Combine(d, "svg", nameOrPath);
                                    if (File.Exists(p5)) { path = p5; break; }
                                }
                            }
                        }
                    }
                }

                if (File.Exists(path))
                {
                    XmlDocument d = new XmlDocument();
                    d.Load(path);
                    return d;
                }
            }
            catch { }

            return null;
        }

        private static Image _cachedSunIcon = null;
        private static Image _cachedMoonIcon = null;
        private static int _cachedThemeIconSize = 0;

        public static Image GetThemeIconImage(bool isDark, int size = 18)
        {
            if (_cachedThemeIconSize != size)
            {
                _cachedSunIcon = null;
                _cachedMoonIcon = null;
                _cachedThemeIconSize = size;
            }

            if (isDark)
            {
                if (_cachedSunIcon == null)
                {
                    // Sun icon for switching to Light Mode
                    _cachedSunIcon = RenderSvg("light-mode.svg", size, size, Color.FromArgb(243, 176, 78));
                }
                return _cachedSunIcon;
            }
            else
            {
                if (_cachedMoonIcon == null)
                {
                    // Moon icon for switching to Dark Mode
                    _cachedMoonIcon = RenderSvg("dark-mode.svg", size, size, Color.FromArgb(235, 160, 40));
                }
                return _cachedMoonIcon;
            }
        }

        public static Image GetAppIconImage(int size = 26)
        {
            if (_cachedAppIconImage != null && _cachedAppIconSize == size)
                return _cachedAppIconImage;

            // Keep original app icon (.ico / image)
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

        public static Bitmap RenderLogoFromFile(int targetWidth, int targetHeight, Color? tintColor = null)
        {
            // Max Logo in Info tab: uses logo-MAX.svg
            Bitmap bmp = RenderSvg("logo-MAX.svg", targetWidth, targetHeight, tintColor);
            if (bmp != null) return bmp;

            return AppLogo.RenderLogo(targetWidth, targetHeight, tintColor);
        }

        private static SvgData ParseSvgDocument(XmlDocument doc)
        {
            XmlNode svgNode = doc.DocumentElement;
            if (svgNode == null || svgNode.Name.ToLowerInvariant() != "svg") return null;

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

            // Parse styles & classes
            Dictionary<string, Color> classColors = new Dictionary<string, Color>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, float> classFontSizes = new Dictionary<string, float>(StringComparer.OrdinalIgnoreCase);
            HashSet<string> noneFillClasses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            XmlNodeList styleNodes = doc.GetElementsByTagName("style");
            foreach (XmlNode st in styleNodes)
            {
                string css = st.InnerText;
                MatchCollection mc = Regex.Matches(css, @"([^{]+)\{([^}]+)\}");
                foreach (Match m in mc)
                {
                    string selectors = m.Groups[1].Value;
                    string body = m.Groups[2].Value;

                    Match mFill = Regex.Match(body, @"fill\s*:\s*(#[a-fA-F0-9]{3,6}|[a-zA-Z]+)");
                    Color? ruleColor = null;
                    bool isNoneFill = false;
                    if (mFill.Success)
                    {
                        string fv = mFill.Groups[1].Value.Trim();
                        if (fv.Equals("none", StringComparison.OrdinalIgnoreCase))
                        {
                            isNoneFill = true;
                        }
                        else
                        {
                            ruleColor = ParseColor(fv, Color.Black);
                        }
                    }

                    float? ruleFontSize = null;
                    Match fontMatch = Regex.Match(body, @"font-size\s*:\s*([0-9.]+)");
                    if (fontMatch.Success)
                    {
                        float fs;
                        if (float.TryParse(fontMatch.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out fs))
                        {
                            ruleFontSize = fs;
                        }
                    }

                    foreach (string sel in selectors.Split(','))
                    {
                        string s = sel.Trim();
                        if (s.StartsWith(".")) s = s.Substring(1);
                        if (isNoneFill)
                        {
                            noneFillClasses.Add(s);
                        }
                        else if (ruleColor.HasValue)
                        {
                            classColors[s] = ruleColor.Value;
                        }
                        if (ruleFontSize.HasValue)
                        {
                            classFontSizes[s] = ruleFontSize.Value;
                        }
                    }
                }
            }

            GraphicsPath totalPath = new GraphicsPath(FillMode.Alternate);
            List<SvgShapeItem> shapeList = new List<SvgShapeItem>();
            List<SvgTextItem> textList = new List<SvgTextItem>();
            HashSet<Color> uniqueColors = new HashSet<Color>();

            // 1. Rectangles (in painter's algorithm order, background rect is first)
            XmlNodeList rects = doc.GetElementsByTagName("rect");
            foreach (XmlNode r in rects)
            {
                if (IsElementNoneFill(r, noneFillClasses)) continue;
                float x = GetFloatAttr(r, "x", 0);
                float y = GetFloatAttr(r, "y", 0);
                float w = GetFloatAttr(r, "width", 0);
                float h = GetFloatAttr(r, "height", 0);
                float rx = GetFloatAttr(r, "rx", 0);
                float ry = GetFloatAttr(r, "ry", 0);
                if (w > 0 && h > 0)
                {
                    GraphicsPath p = new GraphicsPath(FillMode.Winding);
                    if (rx > 0 || ry > 0)
                    {
                        float rad = Math.Max(rx, ry);
                        rad = Math.Min(rad, Math.Min(w / 2f, h / 2f));
                        float d = rad * 2f;
                        p.AddArc(x, y, d, d, 180, 90);
                        p.AddArc(x + w - d, y, d, d, 270, 90);
                        p.AddArc(x + w - d, y + h - d, d, d, 0, 90);
                        p.AddArc(x, y + h - d, d, d, 90, 90);
                        p.CloseFigure();
                    }
                    else
                    {
                        p.AddRectangle(new RectangleF(x, y, w, h));
                    }
                    Color col = GetElementColor(r, classColors, Color.Black);
                    shapeList.Add(new SvgShapeItem { Path = p, Color = col });
                    uniqueColors.Add(col);

                    totalPath.AddPath(p, false);
                }
            }

            // 2. Polygons & Polylines
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
                        GraphicsPath p = new GraphicsPath(FillMode.Winding);
                        p.AddPolygon(pts);
                        Color col = GetElementColor(poly, classColors, Color.Black);
                        shapeList.Add(new SvgShapeItem { Path = p, Color = col });
                        uniqueColors.Add(col);

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
                        GraphicsPath p = new GraphicsPath(FillMode.Winding);
                        p.AddPolygon(pts);
                        Color col = GetElementColor(poly, classColors, Color.Black);
                        shapeList.Add(new SvgShapeItem { Path = p, Color = col });
                        uniqueColors.Add(col);

                        totalPath.AddPolygon(pts);
                    }
                }
            }

            // 3. Paths
            XmlNodeList paths = doc.GetElementsByTagName("path");
            foreach (XmlNode pNode in paths)
            {
                if (IsElementNoneFill(pNode, noneFillClasses)) continue;
                XmlAttribute dAttr = pNode.Attributes["d"];
                if (dAttr != null && !string.IsNullOrEmpty(dAttr.Value))
                {
                    GraphicsPath p = new GraphicsPath(FillMode.Winding);
                    AppendSvgPathToGraphicsPath(dAttr.Value, p);
                    Color col = GetElementColor(pNode, classColors, Color.Black);
                    shapeList.Add(new SvgShapeItem { Path = p, Color = col });
                    uniqueColors.Add(col);

                    totalPath.AddPath(p, false);
                }
            }

            // 4. Circles
            XmlNodeList circles = doc.GetElementsByTagName("circle");
            foreach (XmlNode c in circles)
            {
                if (IsElementNoneFill(c, noneFillClasses)) continue;
                float cx = GetFloatAttr(c, "cx", 0);
                float cy = GetFloatAttr(c, "cy", 0);
                float r = GetFloatAttr(c, "r", 0);
                if (r > 0)
                {
                    GraphicsPath p = new GraphicsPath(FillMode.Winding);
                    p.AddEllipse(cx - r, cy - r, r * 2, r * 2);
                    Color col = GetElementColor(c, classColors, Color.Black);
                    shapeList.Add(new SvgShapeItem { Path = p, Color = col });
                    uniqueColors.Add(col);

                    totalPath.AddEllipse(cx - r, cy - r, r * 2, r * 2);
                }
            }

            // 5. Lines
            XmlNodeList lines = doc.GetElementsByTagName("line");
            foreach (XmlNode line in lines)
            {
                if (IsElementNoneFill(line, noneFillClasses)) continue;
                float x1 = GetFloatAttr(line, "x1", 0);
                float y1 = GetFloatAttr(line, "y1", 0);
                float x2 = GetFloatAttr(line, "x2", 0);
                float y2 = GetFloatAttr(line, "y2", 0);
                float strokeWidth = GetFloatAttr(line, "stroke-width", 2f);
                if (strokeWidth <= 0) strokeWidth = 2f;

                using (GraphicsPath lp = new GraphicsPath())
                {
                    lp.AddLine(x1, y1, x2, y2);
                    using (Pen p = new Pen(Color.Black, strokeWidth))
                    {
                        p.StartCap = LineCap.Round;
                        p.EndCap = LineCap.Round;
                        try { lp.Widen(p); } catch { }
                    }
                    Color col = GetElementColor(line, classColors, Color.Black);
                    GraphicsPath cp = (GraphicsPath)lp.Clone();
                    shapeList.Add(new SvgShapeItem { Path = cp, Color = col });
                    uniqueColors.Add(col);

                    totalPath.AddPath(lp, false);
                }
            }

            // 6. Texts
            XmlNodeList textNodes = doc.GetElementsByTagName("text");
            foreach (XmlNode t in textNodes)
            {
                float tx = GetFloatAttr(t, "x", 0);
                float ty = GetFloatAttr(t, "y", 0);
                XmlAttribute trAttr = t.Attributes["transform"];
                if (trAttr != null)
                {
                    Match tm = Regex.Match(trAttr.Value, @"translate\(\s*([0-9\.\-]+)[\s,]+([0-9\.\-]+)\s*\)");
                    if (tm.Success)
                    {
                        tx = float.Parse(tm.Groups[1].Value, CultureInfo.InvariantCulture);
                        ty = float.Parse(tm.Groups[2].Value, CultureInfo.InvariantCulture);
                    }
                }
                float fsize = GetFloatAttr(t, "font-size", 0);
                if (fsize <= 0)
                {
                    XmlAttribute clsAttr = t.Attributes["class"];
                    if (clsAttr != null && classFontSizes.ContainsKey(clsAttr.Value.Trim()))
                    {
                        fsize = classFontSizes[clsAttr.Value.Trim()];
                    }
                    else
                    {
                        fsize = 47.15f;
                    }
                }
                Color col = GetElementColor(t, classColors, Color.FromArgb(3, 76, 45));
                string content = t.InnerText.Trim();
                if (!string.IsNullOrEmpty(content))
                {
                    textList.Add(new SvgTextItem { Content = content, X = tx, Y = ty, FontSize = fsize, Color = col });
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

            SvgData result = new SvgData();
            result.Path = totalPath;
            result.ViewBox = viewBox;
            result.Shapes = shapeList;
            result.Texts = textList;
            result.IsMultiColor = (uniqueColors.Count > 1 || textList.Count > 0);
            return result;
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

        private static Color ParseColor(string str, Color defaultColor)
        {
            if (string.IsNullOrEmpty(str)) return defaultColor;
            str = str.Trim();
            if (str.Equals("#fff", StringComparison.OrdinalIgnoreCase)) return Color.White;
            try
            {
                return ColorTranslator.FromHtml(str);
            }
            catch
            {
                return defaultColor;
            }
        }

        private static Color GetElementColor(XmlNode n, Dictionary<string, Color> classColors, Color def)
        {
            if (n.Attributes["class"] != null)
            {
                string[] classes = n.Attributes["class"].Value.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string cl in classes)
                {
                    Color c;
                    if (classColors.TryGetValue(cl, out c)) return c;
                }
            }
            if (n.Attributes["fill"] != null)
            {
                string fv = n.Attributes["fill"].Value.Trim();
                if (!fv.Equals("none", StringComparison.OrdinalIgnoreCase))
                {
                    return ParseColor(fv, def);
                }
            }
            if (n.Attributes["style"] != null)
            {
                Match m = Regex.Match(n.Attributes["style"].Value, @"fill\s*:\s*([^;]+)");
                if (m.Success)
                {
                    string fv = m.Groups[1].Value.Trim();
                    if (!fv.Equals("none", StringComparison.OrdinalIgnoreCase))
                    {
                        return ParseColor(fv, def);
                    }
                }
            }
            return def;
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

            MatchCollection mc = Regex.Matches(d, @"([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)");
            if (mc.Count == 0) return;

            List<string> tokens = new List<string>(mc.Count);
            for (int t = 0; t < mc.Count; t++) tokens.Add(mc[t].Value);

            int i = 0;
            char cmd = 'M';
            char lastCmd = ' ';
            float cx = 0, cy = 0;
            float startX = 0, startY = 0;
            float lastCpX = 0, lastCpY = 0;

            while (i < tokens.Count)
            {
                string tok = tokens[i];
                if (char.IsLetter(tok[0]))
                {
                    cmd = tok[0];
                    i++;
                }

                switch (cmd)
                {
                    case 'M':
                        if (i + 1 < tokens.Count)
                        {
                            cx = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            cy = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            startX = cx; startY = cy;
                            path.StartFigure();
                            lastCmd = cmd;
                            cmd = 'L';
                        }
                        break;

                    case 'm':
                        if (i + 1 < tokens.Count)
                        {
                            cx += float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            cy += float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            startX = cx; startY = cy;
                            path.StartFigure();
                            lastCmd = cmd;
                            cmd = 'l';
                        }
                        break;

                    case 'L':
                        if (i + 1 < tokens.Count)
                        {
                            float nx = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float ny = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddLine(cx, cy, nx, ny);
                            cx = nx; cy = ny;
                            lastCmd = cmd;
                        }
                        break;

                    case 'l':
                        if (i + 1 < tokens.Count)
                        {
                            float nx = cx + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float ny = cy + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddLine(cx, cy, nx, ny);
                            cx = nx; cy = ny;
                            lastCmd = cmd;
                        }
                        break;

                    case 'H':
                        if (i < tokens.Count)
                        {
                            float nx = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddLine(cx, cy, nx, cy);
                            cx = nx;
                            lastCmd = cmd;
                        }
                        break;

                    case 'h':
                        if (i < tokens.Count)
                        {
                            float nx = cx + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddLine(cx, cy, nx, cy);
                            cx = nx;
                            lastCmd = cmd;
                        }
                        break;

                    case 'V':
                        if (i < tokens.Count)
                        {
                            float ny = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddLine(cx, cy, cx, ny);
                            cy = ny;
                            lastCmd = cmd;
                        }
                        break;

                    case 'v':
                        if (i < tokens.Count)
                        {
                            float ny = cy + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddLine(cx, cy, cx, ny);
                            cy = ny;
                            lastCmd = cmd;
                        }
                        break;

                    case 'C':
                        if (i + 5 < tokens.Count)
                        {
                            float x1 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y1 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float x2 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y2 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float x3 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y3 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddBezier(cx, cy, x1, y1, x2, y2, x3, y3);
                            lastCpX = x2; lastCpY = y2;
                            cx = x3; cy = y3;
                            lastCmd = cmd;
                        }
                        break;

                    case 'c':
                        if (i + 5 < tokens.Count)
                        {
                            float x1 = cx + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y1 = cy + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float x2 = cx + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y2 = cy + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float x3 = cx + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y3 = cy + float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            path.AddBezier(cx, cy, x1, y1, x2, y2, x3, y3);
                            lastCpX = x2; lastCpY = y2;
                            cx = x3; cy = y3;
                            lastCmd = cmd;
                        }
                        break;

                    case 'S':
                    case 's':
                        if (i + 3 < tokens.Count)
                        {
                            float cp1X = (lastCmd == 'C' || lastCmd == 'c' || lastCmd == 'S' || lastCmd == 's') ? (2 * cx - lastCpX) : cx;
                            float cp1Y = (lastCmd == 'C' || lastCmd == 'c' || lastCmd == 'S' || lastCmd == 's') ? (2 * cy - lastCpY) : cy;
                            float x2 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y2 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float x3 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            float y3 = float.Parse(tokens[i++], CultureInfo.InvariantCulture);
                            if (cmd == 's')
                            {
                                x2 += cx; y2 += cy;
                                x3 += cx; y3 += cy;
                            }
                            path.AddBezier(cx, cy, cp1X, cp1Y, x2, y2, x3, y3);
                            lastCpX = x2; lastCpY = y2;
                            cx = x3; cy = y3;
                            lastCmd = cmd;
                        }
                        break;

                    case 'Z':
                    case 'z':
                        path.CloseFigure();
                        cx = startX; cy = startY;
                        lastCmd = cmd;
                        break;

                    default:
                        i++;
                        break;
                }
            }
            path.CloseFigure();
        }
    }
}
