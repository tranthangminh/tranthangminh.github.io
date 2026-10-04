using System;
using System.Drawing;

namespace ModernAutoClicker.Advanced
{
    public class MacroStep
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public MacroActionType ActionType { get; set; }
        public bool Enabled { get; set; }
        public bool IsChecked
        {
            get { return Enabled; }
            set { Enabled = value; }
        }
        public Point StartPoint { get; set; }
        public Point EndPoint { get; set; }
        public int HoldMs { get; set; }
        public int DelayMs { get; set; }
        public int BaseHoldMs { get; set; }
        public int BaseDelayMs { get; set; }
        public int RepeatCount { get; set; }
        public int ScrollStep { get; set; }
        public int DragButton { get; set; } // 0: Left, 1: Right, 2: Middle
        public string KeyData { get; set; }
        public string Note { get; set; }

        // Color Trigger Properties
        public Color TargetColor { get; set; }
        public string ColorHex { get; set; }
        public int Tolerance { get; set; }
        public int IfTrueStep { get; set; }  // 0: Next Step, >0: Step Number
        public int IfFalseStep { get; set; } // 0: Next Step, -1: Stop Script, >0: Step Number

        // Window Target Properties (Relative Coordinates)
        [System.Xml.Serialization.XmlIgnore]
        public IntPtr WindowHwnd { get; set; }
        [System.Xml.Serialization.XmlIgnore]
        public uint TargetPid { get; set; }
        public string WindowTitle { get; set; }
        public string ProcessName { get; set; }
        public bool RelativeToWindow { get; set; }
        public int WindowIndex { get; set; }

        // Image Recognition Properties
        public string ImageBase64 { get; set; }
        public int Similarity { get; set; } // 50 - 100, default 90 (%)
        public int TimeoutSec { get; set; } // Default 10 (seconds) for WaitImage

        // Repeat / Timer Loop Block Properties
        public int RepeatTimerMode { get; set; } // 0 = Times (Số lần), 1 = Timer (Thời gian)
        public int RepeatTimerSeconds { get; set; } // Total seconds, default 300 (00:05:00)
        public int RepeatTimerTargetStep { get; set; } // 1-based target step number to loop back to, default 1

        // Runtime Cached Bitmap (Not serialized, freed when changed/disposed)
        private Bitmap _cachedBitmap;
        public Bitmap GetTemplateBitmap()
        {
            if (_cachedBitmap != null) return _cachedBitmap;
            if (string.IsNullOrEmpty(ImageBase64)) return null;
            try
            {
                byte[] bytes = Convert.FromBase64String(ImageBase64);
                using (System.IO.MemoryStream ms = new System.IO.MemoryStream(bytes))
                {
                    _cachedBitmap = new Bitmap(Image.FromStream(ms));
                }
                return _cachedBitmap;
            }
            catch
            {
                return null;
            }
        }

        public void SetTemplateBitmap(Bitmap bmp)
        {
            InvalidateImageCache();
            if (bmp == null)
            {
                ImageBase64 = "";
                return;
            }
            using (System.IO.MemoryStream ms = new System.IO.MemoryStream())
            {
                bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                ImageBase64 = Convert.ToBase64String(ms.ToArray());
            }
            _cachedBitmap = new Bitmap(bmp);
        }

        public void InvalidateImageCache()
        {
            if (_cachedBitmap != null)
            {
                try { _cachedBitmap.Dispose(); } catch { }
                _cachedBitmap = null;
            }
        }

        public MacroStep()
        {
            Id = Guid.NewGuid().ToString("N");
            Name = "Step";
            ActionType = MacroActionType.LeftClick;
            Enabled = true;
            StartPoint = Point.Empty;
            EndPoint = Point.Empty;
            HoldMs = 10;
            DelayMs = 240;
            BaseHoldMs = 10;
            BaseDelayMs = 240;
            RepeatCount = 1;
            ScrollStep = 0;
            DragButton = 0;
            KeyData = "Space";
            Note = "";
            TargetColor = Color.FromArgb(0, 255, 0);
            ColorHex = "#00FF00";
            Tolerance = 10;
            IfTrueStep = -2; // Default: Click Target
            IfFalseStep = -3; // Default: Repeat this Step
            WindowHwnd = IntPtr.Zero;
            TargetPid = 0;
            WindowTitle = "";
            ProcessName = "";
            RelativeToWindow = false;
            WindowIndex = 0;
            ImageBase64 = "";
            Similarity = 90;
            TimeoutSec = 10;
            RepeatTimerMode = 0;
            RepeatTimerSeconds = 300;
            RepeatTimerTargetStep = 1;
        }

        public MacroStep Clone()
        {
            return new MacroStep
            {
                Id = Guid.NewGuid().ToString("N"),
                Name = this.Name,
                ActionType = this.ActionType,
                Enabled = this.Enabled,
                StartPoint = this.StartPoint,
                EndPoint = this.EndPoint,
                HoldMs = this.HoldMs,
                DelayMs = this.DelayMs,
                BaseHoldMs = this.BaseHoldMs > 0 ? this.BaseHoldMs : this.HoldMs,
                BaseDelayMs = this.BaseDelayMs >= 0 ? this.BaseDelayMs : this.DelayMs,
                RepeatCount = this.RepeatCount,
                ScrollStep = this.ScrollStep,
                DragButton = this.DragButton,
                KeyData = this.KeyData,
                Note = this.Note,
                TargetColor = this.TargetColor,
                ColorHex = this.ColorHex,
                Tolerance = this.Tolerance,
                IfTrueStep = this.IfTrueStep,
                IfFalseStep = this.IfFalseStep,
                WindowHwnd = this.WindowHwnd,
                TargetPid = this.TargetPid,
                WindowTitle = this.WindowTitle,
                ProcessName = this.ProcessName,
                RelativeToWindow = this.RelativeToWindow,
                WindowIndex = this.WindowIndex,
                ImageBase64 = this.ImageBase64,
                Similarity = this.Similarity,
                TimeoutSec = this.TimeoutSec,
                RepeatTimerMode = this.RepeatTimerMode,
                RepeatTimerSeconds = this.RepeatTimerSeconds,
                RepeatTimerTargetStep = this.RepeatTimerTargetStep
            };
        }
    }
}
