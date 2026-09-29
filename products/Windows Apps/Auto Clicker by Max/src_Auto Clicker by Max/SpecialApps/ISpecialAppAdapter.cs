using System;
using System.Drawing;

namespace ModernAutoClicker.SpecialApps
{
    /// <summary>
    /// Contract for application-specific input adapters (e.g., BlueStacks, Desktop, File Explorer, etc.).
    /// Allows seamless, modular extensions for complex or non-standard Win32/DirectX/Qt window hierarchies.
    /// </summary>
    public interface ISpecialAppAdapter
    {
        /// <summary>
        /// Display name of the special app adapter (e.g. "BlueStacks 5", "Windows Desktop", "File Explorer").
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Determines whether this adapter handles the specified window target.
        /// </summary>
        bool IsMatch(string processName, string windowTitle, string className);

        /// <summary>
        /// Drills down to the specific input/rendering child window handle if applicable.
        /// Return IntPtr.Zero to delegate to standard Win32 child enumeration.
        /// </summary>
        IntPtr ResolveTargetHandle(IntPtr topHwnd, Point screenPt);

        /// <summary>
        /// Executes a custom background click on the target window handle.
        /// Returns true if handled, or false to fallback to standard Win32 PostMessage.
        /// </summary>
        bool TryBackgroundClick(IntPtr targetHwnd, Point clientPt, int mouseBtn, int holdMs);

        /// <summary>
        /// True if this target strictly requires Physical Hardware Mouse clicks (SendInput)
        /// because the OS or engine blocks cross-process background PostMessage.
        /// </summary>
        bool RequiresPhysicalClick { get; }

        /// <summary>
        /// Optimization tip or note for user guidance.
        /// </summary>
        string OptimizationNote { get; }
    }
}
