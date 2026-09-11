using System;
using System.Collections.Generic;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public class WindowTracker : IDisposable
    {
        private readonly Timer _timer;
        private string _lastSignature = string.Empty;
        private bool _isPaused = false;

        public event Action OnPositionsChanged;

        // Delegates to query current state from MainForm
        public Func<bool> IsWindowActive { get; set; }
        public Func<bool> IsRunning { get; set; }
        public Func<bool> IsBasicTab { get; set; }
        public Func<bool> IsOverlayInteracting { get; set; }
        public Func<bool> IsShowMapChecked { get; set; }

        // Simple tab context
        public Func<bool> SimpleRelativeToWindow { get; set; }
        public Func<string> SimpleTargetProcessName { get; set; }
        public Func<string> SimpleTargetWindowTitle { get; set; }

        // Advanced tab context
        public Func<List<Advanced.MacroStep>> GetAdvancedSteps { get; set; }

        public WindowTracker(int intervalMs = 250)
        {
            _timer = new Timer { Interval = Math.Max(50, intervalMs) };
            _timer.Tick += Timer_Tick;
        }

        public void Start()
        {
            _timer.Start();
        }

        public void Stop()
        {
            _timer.Stop();
        }

        public void Pause()
        {
            _isPaused = true;
        }

        public void Resume()
        {
            _isPaused = false;
        }

        public void ResetSignature()
        {
            _lastSignature = string.Empty;
        }

        public void CheckNow()
        {
            if (_isPaused) return;
            string currentSig = GetSignature();
            if (currentSig != _lastSignature)
            {
                _lastSignature = currentSig;
                if (OnPositionsChanged != null) OnPositionsChanged();
            }
        }

        private void Timer_Tick(object sender, EventArgs e)
        {
            if (_isPaused) return;

            if (IsShowMapChecked != null && !IsShowMapChecked()) return;
            if (IsWindowActive != null && !IsWindowActive()) return;
            if (IsRunning != null && IsRunning()) return;
            if (IsOverlayInteracting != null && IsOverlayInteracting()) return;

            CheckNow();
        }

        public string GetSignature()
        {
            bool basicTab = IsBasicTab != null && IsBasicTab();

            if (basicTab)
            {
                bool relToWin = SimpleRelativeToWindow != null && SimpleRelativeToWindow();
                string procName = SimpleTargetProcessName != null ? SimpleTargetProcessName() : "";
                string winTitle = SimpleTargetWindowTitle != null ? SimpleTargetWindowTitle() : "";

                if (!relToWin || string.IsNullOrEmpty(procName))
                    return "Desktop";

                IntPtr hWnd = NativeMethods.FindWindowByTarget(procName, winTitle);
                if (hWnd == IntPtr.Zero) return "NotFound";
                NativeMethods.POINT origin = new NativeMethods.POINT { X = 0, Y = 0 };
                NativeMethods.ClientToScreen(hWnd, ref origin);
                return string.Format("{0}:{1},{2}", hWnd, origin.X, origin.Y);
            }
            else
            {
                if (GetAdvancedSteps == null) return "";
                var steps = GetAdvancedSteps();
                if (steps == null || steps.Count == 0) return "";

                // Group by distinct target window to avoid searching the same window 70 times!
                StringBuilder sb = new StringBuilder(128);
                HashSet<string> checkedTargets = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var st in steps)
                {
                    if (st.RelativeToWindow && !string.IsNullOrEmpty(st.ProcessName))
                    {
                        string targetKey = string.Format("{0}|{1}", st.ProcessName, st.WindowTitle ?? "");
                        if (checkedTargets.Add(targetKey))
                        {
                            IntPtr hWnd = NativeMethods.FindWindowByTarget(st.ProcessName, st.WindowTitle);
                            NativeMethods.POINT origin = new NativeMethods.POINT { X = 0, Y = 0 };
                            if (hWnd != IntPtr.Zero)
                            {
                                NativeMethods.ClientToScreen(hWnd, ref origin);
                            }
                            sb.Append(hWnd).Append(':').Append(origin.X).Append(',').Append(origin.Y).Append(';');
                        }
                    }
                }
                return sb.ToString();
            }
        }

        public void Dispose()
        {
            if (_timer != null)
            {
                _timer.Stop();
                _timer.Dispose();
            }
        }
    }
}
