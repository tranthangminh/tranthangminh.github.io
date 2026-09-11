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
        public int RepeatCount { get; set; }
        public int ScrollStep { get; set; }
        public string KeyData { get; set; }
        public string Note { get; set; }

        // Color Trigger Properties
        public Color TargetColor { get; set; }
        public string ColorHex { get; set; }
        public int Tolerance { get; set; }
        public int IfTrueStep { get; set; }  // 0: Next Step, >0: Step Number
        public int IfFalseStep { get; set; } // 0: Next Step, -1: Stop Script, >0: Step Number

        // Window Target Properties (Relative Coordinates)
        public string WindowTitle { get; set; }
        public string ProcessName { get; set; }
        public bool RelativeToWindow { get; set; }

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
            RepeatCount = 1;
            ScrollStep = 0;
            KeyData = "Space";
            Note = "";
            TargetColor = Color.FromArgb(0, 255, 0);
            ColorHex = "#00FF00";
            Tolerance = 10;
            IfTrueStep = -2; // Default: Click Target
            IfFalseStep = 0;  // Default: Next Step
            WindowTitle = "";
            ProcessName = "";
            RelativeToWindow = false;
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
                RepeatCount = this.RepeatCount,
                ScrollStep = this.ScrollStep,
                KeyData = this.KeyData,
                Note = this.Note,
                TargetColor = this.TargetColor,
                ColorHex = this.ColorHex,
                Tolerance = this.Tolerance,
                IfTrueStep = this.IfTrueStep,
                IfFalseStep = this.IfFalseStep,
                WindowTitle = this.WindowTitle,
                ProcessName = this.ProcessName,
                RelativeToWindow = this.RelativeToWindow
            };
        }
    }
}
