using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    /// <summary>
    /// High-performance GDI+ VFX engine for Asian Mode: "Asian Dragon Overdrive".
    /// Renders dynamic fiery flame borders, breathing neon energy glow, and floating embers.
    /// Fully optimized (Double-Buffered, 0% CPU when idle or switched away).
    /// </summary>
    public class VFX_AsianDragonOverdrive : IDisposable
    {
        private Control _targetPanel;
        private Control _targetRoot;
        private Control _targetTabButton;
        private Timer _animTimer;
        private bool _isActive = false;

        // Animation state
        private float _sweepAngle = 0f;
        private float _pulsePhase = 0f;
        private Random _rng = new Random();

        // Flame Embers Particle Pool
        private const int MAX_EMBERS = 14;
        private struct FlameEmber
        {
            public float X;
            public float Y;
            public float Vx;
            public float Vy;
            public float Alpha;
            public float MaxAlpha;
            public float Size;
            public float Decay;
            public bool IsActive;
            public Color Color;
        }
        private FlameEmber[] _embers = new FlameEmber[MAX_EMBERS];

        // Color Palette: Deep Blue -> Electric Cyan -> Cyber Azure -> Ice White (Matching Theme)
        private static readonly Color ColorDeepBlue = Color.FromArgb(25, 110, 191);      // #196ebf
        private static readonly Color ColorElectricCyan = Color.FromArgb(56, 249, 255);  // #38f9ff
        private static readonly Color ColorCyberCyan = Color.FromArgb(141, 242, 242);    // #8DF2F2
        private static readonly Color ColorAzureBlue = Color.FromArgb(96, 165, 250);     // #60a5fa
        private static readonly Color ColorNeonIceWhite = Color.FromArgb(235, 250, 255);
        private static readonly Color ColorDarkBlueBg = Color.FromArgb(15, 35, 65);

        public bool IsActive { get { return _isActive; } }

        public VFX_AsianDragonOverdrive()
        {
            _animTimer = new Timer();
            _animTimer.Interval = 30; // ~33 FPS for butter smooth animation with ~0% CPU
            _animTimer.Tick += OnAnimationTick;
        }

        public void Attach(Control targetPanel, Control targetRoot = null, Control targetTabButton = null)
        {
            _targetPanel = targetPanel;
            _targetRoot = targetRoot;
            _targetTabButton = targetTabButton;
        }

        public void Start()
        {
            if (_isActive) return;
            _isActive = true;

            // Reset particles
            for (int i = 0; i < MAX_EMBERS; i++)
            {
                SpawnEmber(i, true);
            }

            _animTimer.Start();
            InvalidateTargets();
        }

        public void Stop()
        {
            if (!_isActive) return;
            _isActive = false;
            _animTimer.Stop();
            InvalidateTargets();
        }

        private void OnAnimationTick(object sender, EventArgs e)
        {
            if (!_isActive) return;

            if (_targetPanel != null)
            {
                Form frm = _targetPanel as Form ?? _targetPanel.FindForm();
                if (frm != null && frm.WindowState == FormWindowState.Minimized) return;
            }

            // Update angle and pulse
            _sweepAngle += 4.5f;
            if (_sweepAngle >= 360f) _sweepAngle -= 360f;

            _pulsePhase += 0.08f;
            if (_pulsePhase >= Math.PI * 2) _pulsePhase -= (float)(Math.PI * 2);

            // Update embers
            Control boundsCtrl = _targetRoot ?? _targetPanel;
            if (boundsCtrl != null && boundsCtrl.Width > 20 && boundsCtrl.Height > 20)
            {
                int w = boundsCtrl.Width;
                int h = boundsCtrl.Height;

                for (int i = 0; i < MAX_EMBERS; i++)
                {
                    if (!_embers[i].IsActive)
                    {
                        SpawnEmber(i, false);
                        continue;
                    }

                    _embers[i].X += _embers[i].Vx;
                    _embers[i].Y += _embers[i].Vy;
                    _embers[i].Alpha -= _embers[i].Decay;

                    if (_embers[i].Alpha <= 0 || _embers[i].X < -10 || _embers[i].X > w + 10 || _embers[i].Y < -10 || _embers[i].Y > h + 10)
                    {
                        SpawnEmber(i, false);
                    }
                }
            }

            InvalidateTargets();
        }

        private void SpawnEmber(int index, bool randomY)
        {
            Control boundsCtrl = _targetRoot ?? _targetPanel;
            if (boundsCtrl == null || boundsCtrl.Width <= 0 || boundsCtrl.Height <= 0) return;

            int w = boundsCtrl.Width;
            int h = boundsCtrl.Height;

            // Spawn along perimeter
            int side = _rng.Next(4);
            float x = 0, y = 0;
            float vx = 0, vy = 0;

            if (side == 0) // Top edge
            {
                x = (float)(_rng.NextDouble() * w);
                y = randomY ? (float)(_rng.NextDouble() * h) : (float)(_rng.NextDouble() * 12);
                vx = (float)((_rng.NextDouble() - 0.5) * 0.8);
                vy = (float)(-_rng.NextDouble() * 1.5 - 0.4);
            }
            else if (side == 1) // Bottom edge
            {
                x = (float)(_rng.NextDouble() * w);
                y = h - (float)(_rng.NextDouble() * 8);
                vx = (float)((_rng.NextDouble() - 0.5) * 0.8);
                vy = (float)(-_rng.NextDouble() * 1.8 - 0.5);
            }
            else if (side == 2) // Left edge
            {
                x = (float)(_rng.NextDouble() * 8);
                y = (float)(_rng.NextDouble() * h);
                vx = (float)(-_rng.NextDouble() * 0.8 - 0.2);
                vy = (float)(-_rng.NextDouble() * 1.2 - 0.2);
            }
            else // Right edge
            {
                x = w - (float)(_rng.NextDouble() * 8);
                y = (float)(_rng.NextDouble() * h);
                vx = (float)(_rng.NextDouble() * 0.8 + 0.2);
                vy = (float)(-_rng.NextDouble() * 1.2 - 0.2);
            }

            _embers[index].X = x;
            _embers[index].Y = y;
            _embers[index].Vx = vx;
            _embers[index].Vy = vy;
            _embers[index].MaxAlpha = (float)(140 + _rng.Next(115));
            _embers[index].Alpha = _embers[index].MaxAlpha;
            _embers[index].Size = (float)(2.0 + _rng.NextDouble() * 3.2);
            _embers[index].Decay = (float)(3.0 + _rng.NextDouble() * 4.5);
            _embers[index].IsActive = true;

            int cType = _rng.Next(3);
            if (cType == 0) _embers[index].Color = ColorElectricCyan;
            else if (cType == 1) _embers[index].Color = ColorCyberCyan;
            else _embers[index].Color = ColorAzureBlue;
        }

        private void InvalidateTargets()
        {
            if (_targetRoot != null && !_targetRoot.IsDisposed && _targetRoot.IsHandleCreated)
            {
                _targetRoot.Invalidate();
            }
            else if (_targetPanel != null && !_targetPanel.IsDisposed && _targetPanel.IsHandleCreated)
            {
                _targetPanel.Invalidate();
            }

            if (_targetTabButton != null && !_targetTabButton.IsDisposed && _targetTabButton.IsHandleCreated)
            {
                _targetTabButton.Invalidate();
            }
        }

        /// <summary>
        /// Renders the Asian Dragon Overdrive fiery flame border on the panel or form window.
        /// </summary>
        public void RenderPanelBorder(Graphics g, Rectangle clientRect, int borderRadius, Color baseBackColor)
        {
            RenderPanelBorder(g, clientRect, borderRadius, true, baseBackColor);
        }

        public void RenderPanelBorder(Graphics g, Rectangle clientRect, int borderRadius, bool fillBackground, Color baseBackColor)
        {
            if (clientRect.Width <= 4 || clientRect.Height <= 4) return;

            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            Rectangle rect = new Rectangle(0, 0, clientRect.Width - 1, clientRect.Height - 1);

            using (GraphicsPath path = GetRoundedRectangle(rect, borderRadius))
            {
                // 1. Fill base card background if requested
                if (fillBackground)
                {
                    using (SolidBrush bgBrush = new SolidBrush(baseBackColor))
                    {
                        g.FillPath(bgBrush, path);
                    }
                }

                if (!_isActive)
                {
                    // Regular inactive border
                    using (Pen defaultPen = new Pen(Color.FromArgb(50, 255, 255, 255), 1))
                    {
                        defaultPen.Alignment = PenAlignment.Inset;
                        g.DrawPath(defaultPen, path);
                    }
                    return;
                }

                // =========================================================
                // 2. ASIAN DRAGON OVERDRIVE: Cyber Blue / Cyan Sweep Border (Outward Bold VFX)
                // =========================================================
                float pulse = (float)(Math.Sin(_pulsePhase) * 0.5 + 0.5); // 0.0 to 1.0

                // Layer A1: Wide Outer Soft Ambient Halo (9px)
                int wideGlowAlpha = (int)(35 + pulse * 55); // 35 to 90
                using (Pen wideGlowPen = new Pen(Color.FromArgb(wideGlowAlpha, ColorDeepBlue), 9f))
                {
                    wideGlowPen.Alignment = PenAlignment.Center;
                    g.DrawPath(wideGlowPen, path);
                }

                // Layer A2: Mid Intense Electric Cyan Aura (6px)
                int midGlowAlpha = (int)(60 + pulse * 70); // 60 to 130
                using (Pen midGlowPen = new Pen(Color.FromArgb(midGlowAlpha, ColorElectricCyan), 6f))
                {
                    midGlowPen.Alignment = PenAlignment.Center;
                    g.DrawPath(midGlowPen, path);
                }

                // Layer B: Core Rotating Multi-Stop Cyan/Blue Gradient (4.0px Bold Line)
                using (LinearGradientBrush brush = new LinearGradientBrush(
                    rect,
                    ColorDeepBlue,
                    ColorElectricCyan,
                    _sweepAngle))
                {
                    ColorBlend blend = new ColorBlend(5);
                    blend.Colors = new Color[] {
                        ColorDeepBlue,
                        ColorElectricCyan,
                        ColorNeonIceWhite,
                        ColorAzureBlue,
                        ColorDeepBlue
                    };
                    blend.Positions = new float[] { 0.0f, 0.25f, 0.5f, 0.75f, 1.0f };
                    brush.InterpolationColors = blend;

                    using (Pen flamePen = new Pen(brush, 4.0f))
                    {
                        flamePen.Alignment = PenAlignment.Center;
                        g.DrawPath(flamePen, path);
                    }
                }

                // Layer B2: Inner Ice-White Highlight (1.5px)
                using (Pen hotPen = new Pen(Color.FromArgb((int)(160 + pulse * 90), ColorNeonIceWhite), 1.5f))
                {
                    hotPen.Alignment = PenAlignment.Inset;
                    g.DrawPath(hotPen, path);
                }

                // Layer D: Floating Flame Embers / Sparks (Bolder sizes)
                for (int i = 0; i < MAX_EMBERS; i++)
                {
                    if (!_embers[i].IsActive || _embers[i].Alpha <= 5) continue;

                    int alpha = (int)Math.Min(255, _embers[i].Alpha);
                    Color emberColor = Color.FromArgb(alpha, _embers[i].Color);

                    using (SolidBrush emberBrush = new SolidBrush(emberColor))
                    {
                        float sz = _embers[i].Size * 1.4f;
                        g.FillEllipse(emberBrush, _embers[i].X - sz / 2f, _embers[i].Y - sz / 2f, sz, sz);
                    }
                }
            }
        }

        /// <summary>
        /// Renders the Asian Mode tab button flame glow effect.
        /// </summary>
        public void RenderTabButton(Graphics g, Rectangle bounds, int borderRadius, string text, Font font, bool isSelected, ThemeTokens theme)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            Rectangle rect = new Rectangle(0, 0, bounds.Width - 1, bounds.Height - 1);
            if (rect.Width <= 0 || rect.Height <= 0) return;

            using (GraphicsPath path = GetRoundedRectangle(rect, borderRadius))
            {
                if (isSelected && _isActive)
                {
                    float pulse = (float)(Math.Sin(_pulsePhase) * 0.5 + 0.5);

                    // Outer soft glow for tab button
                    using (Pen glowPen = new Pen(Color.FromArgb((int)(40 + pulse * 60), ColorElectricCyan), 5f))
                    {
                        glowPen.Alignment = PenAlignment.Center;
                        g.DrawPath(glowPen, path);
                    }

                    // Cyber blue background gradient
                    using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                        rect,
                        Color.FromArgb(90, ColorDarkBlueBg),
                        Color.FromArgb(60, ColorDeepBlue),
                        LinearGradientMode.Vertical))
                    {
                        g.FillPath(bgBrush, path);
                    }

                    // Rotating bold cyber border (3.0px)
                    using (LinearGradientBrush borderBrush = new LinearGradientBrush(rect, ColorDeepBlue, ColorElectricCyan, _sweepAngle))
                    {
                        ColorBlend blend = new ColorBlend(4);
                        blend.Colors = new Color[] { ColorDeepBlue, ColorElectricCyan, ColorAzureBlue, ColorDeepBlue };
                        blend.Positions = new float[] { 0.0f, 0.33f, 0.66f, 1.0f };
                        borderBrush.InterpolationColors = blend;

                        using (Pen pen = new Pen(borderBrush, 3.0f))
                        {
                            pen.Alignment = PenAlignment.Center;
                            g.DrawPath(pen, path);
                        }
                    }

                    // Glowing text with dragon badge
                    string fullText = "🥢 Asian Mode ⚡";
                    Size textSize = TextRenderer.MeasureText(fullText, font);
                    Point textPt = new Point((bounds.Width - textSize.Width) / 2, (bounds.Height - textSize.Height) / 2);

                    Color textColor = Color.FromArgb(255, (int)(180 + pulse * 75), 255, 255);
                    TextRenderer.DrawText(g, fullText, font, textPt, textColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                }
                else
                {
                    // Inactive normal tab render
                    Color bg = isSelected ? theme.BgElevated : theme.BgSecondary;
                    using (SolidBrush brush = new SolidBrush(bg))
                    {
                        g.FillPath(brush, path);
                    }

                    using (Pen pen = new Pen(isSelected ? theme.AccentPrimary : theme.BorderColor, 1))
                    {
                        pen.Alignment = PenAlignment.Inset;
                        g.DrawPath(pen, path);
                    }

                    Color textColor = isSelected ? theme.AccentPrimary : theme.TextSecondary;
                    TextRenderer.DrawText(g, text, font, bounds, textColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                }
            }
        }

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
            path.AddArc(arc, 180, 90);

            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);

            arc.Y = bounds.Bottom - diameter;
            path.AddArc(arc, 0, 90);

            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);

            path.CloseFigure();
            return path;
        }

        public void Dispose()
        {
            if (_animTimer != null)
            {
                _animTimer.Stop();
                _animTimer.Dispose();
                _animTimer = null;
            }
        }
    }
}
