using System;
using System.Drawing;
using System.Windows.Forms;

namespace ModernAutoClicker.Advanced
{
    public static class MacroDescriptions
    {
        // 1. Action Type Detailed Descriptions
        public static string GetActionTypeDescription(MacroActionType type)
        {
            switch (type)
            {
                case MacroActionType.LeftClick:
                    return "Left Click:\nPerforms a standard primary mouse click at the specified (X, Y) coordinates.";
                case MacroActionType.RightClick:
                    return "Right Click:\nPerforms a secondary mouse click (right-click / context menu) at (X, Y).";
                case MacroActionType.MiddleClick:
                    return "Middle Click / Scroll:\nClicks middle mouse button at (X, Y) or scrolls mouse wheel.\n• 0: Middle Click\n• Positive (+): Scroll Up\n• Negative (-): Scroll Down";
                case MacroActionType.DoubleClick:
                    return "Double Click:\nPerforms a rapid double left-click at the specified (X, Y) coordinates.";
                case MacroActionType.DragDrop:
                    return "Drag & Drop:\nSmoothly clicks and drags cursor from Point A to Point B over the configured Hold duration.";
                case MacroActionType.KeyPress:
                    return "Key Press:\nPresses a single key or shortcut combination (e.g. Space, Enter, Ctrl+C, Alt+F4) for Hold ms.";
                case MacroActionType.TypeText:
                    return "Type Text:\nTypes a string of text or Unicode characters automatically into the active input field.";
                case MacroActionType.Delay:
                    return "Delay:\nPauses script execution with mouse staying still during Hold, then waits or travels to next step during Delay.";
                case MacroActionType.WaitColor:
                    return "Wait Color:\nPauses execution until the pixel at (X, Y) matches the target HEX color within tolerance.";
                case MacroActionType.IfColor:
                    return "If Color (Conditional Branching):\n" +
                           "Checks the pixel color at (X, Y) immediately:\n" +
                           "• Match: Action when color matches (Click Target, Jump to Step X, or Stop).\n" +
                           "• Unmatch: Action when color does not match (Jump to Step X, Stop, or Click Target).";
                case MacroActionType.IfColorArea:
                    return "If Color Area (Region Color Search & Branching):\n" +
                           "Scans the bounding box area (Point A to Point B) for the target color:\n" +
                           "• Match: Action when color is found (Click Target pixel, Jump to Step X, or Stop).\n" +
                           "• Unmatch: Action when color is not found in area (Next Step, Jump to Step X, or Stop).";
                case MacroActionType.WaitChange:
                    return "Wait Change:\nPauses execution until the pixel color at (X, Y) changes from its initial color.";
                case MacroActionType.RunScript:
                    return "Run Script:\nExecutes another saved script tab as a sub-routine for the specified repeat count.";
                default:
                    return "Macro Action: Performs an automated input step.";
            }
        }

        // 2. Hold Duration Tooltip (Thời gian hoàn tất một Step)
        public static string GetHoldDescription(MacroActionType type)
        {
            switch (type)
            {
                case MacroActionType.Delay:
                    return "Hold (ms) - Still / Pause Duration:\nDuration the mouse stays completely still without moving.";
                case MacroActionType.DragDrop:
                    return "Hold (ms) - Step Completion Duration:\nDuration taken to smoothly drag cursor from Point A to Point B.";
                case MacroActionType.TypeText:
                    return "Hold (ms) - Step Completion Duration:\nTotal duration to complete typing the entire text string.";
                case MacroActionType.KeyPress:
                    return "Hold (ms) - Step Completion Duration:\nDuration to keep the key or shortcut pressed down before releasing.";
                case MacroActionType.LeftClick:
                case MacroActionType.RightClick:
                case MacroActionType.MiddleClick:
                case MacroActionType.DoubleClick:
                    return "Hold (ms) - Step Completion Duration:\nDuration the mouse button is held down to complete the click action.";
                default:
                    return "Hold (ms) - Step Completion Duration:\nExecution duration to complete this step.";
            }
        }

        // 3. Delay Duration Tooltip (Thời gian chờ đến step tiếp theo hoặc thời gian di chuyển chuột)
        public static string GetDelayDescription(MacroActionType type)
        {
            return "Delay (ms) - Next Step Wait / Travel Time:\n" +
                   "Wait time before proceeding to the next step, or mouse travel duration to the next step (when Smooth Mouse Move is enabled).";
        }

        // 4. Repeat Count Tooltip
        public static string GetRepeatDescription(MacroActionType type)
        {
            if (type == MacroActionType.RunScript)
            {
                return "Rep (Repeat Count):\nNumber of times to execute the target sub-script consecutively.";
            }
            return "Rep (Repeat Count):\nNumber of consecutive times to repeat this action before continuing.";
        }

        // 5. Target / Key / Coordinate Column Tooltip
        public static string GetTargetKeyDescription(MacroStep step)
        {
            if (step == null) return "Target:\nTarget coordinates, key shortcut, typed text, or sub-script name.";
            switch (step.ActionType)
            {
                case MacroActionType.DragDrop:
                    return string.Format("Drag Path:\nFrom Point A ({0}, {1}) to Point B ({2}, {3}). Click coordinate text or 🎯 to pick.",
                        step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y);
                case MacroActionType.MiddleClick:
                    return string.Format("Target & Scroll:\nCoordinates ({0}, {1}) and Scroll step: {2}.\n• 0: Middle Click\n• Positive (+): Scroll Up\n• Negative (-): Scroll Down\nClick 🎯 to pick coordinate.",
                        step.StartPoint.X, step.StartPoint.Y, step.ScrollStep);
                case MacroActionType.KeyPress:
                    return string.Format("Key Shortcut: [{0}]\nPress any key or shortcut combination inside the box to record.",
                        !string.IsNullOrEmpty(step.KeyData) ? step.KeyData : "Space");
                case MacroActionType.TypeText:
                    return "Type Text:\nEnter the text string to type automatically (Unicode supported).";
                case MacroActionType.Delay:
                    return "Delay Action:\nPauses execution (Hold: mouse still, Delay: next step wait/travel).";
                case MacroActionType.WaitColor:
                case MacroActionType.IfColor:
                    return string.Format("Color Check:\nPixel ({0}, {1}) matching HEX {2} (Tolerance ±{3}). Click swatch to change color, 🎯 to pick.",
                        step.StartPoint.X, step.StartPoint.Y, step.ColorHex, step.Tolerance);
                case MacroActionType.IfColorArea:
                    return string.Format("Area Color Search:\nFrom Point A ({0}, {1}) to Point B ({2}, {3}) matching HEX {4} (Tolerance ±{5}). Click swatch to change color, 🎯 to drag area.",
                        step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, step.ColorHex, step.Tolerance);
                case MacroActionType.WaitChange:
                    return string.Format("Watch Color Change:\nMonitors pixel ({0}, {1}) until its color changes from initial state. Click 🎯 to pick.",
                        step.StartPoint.X, step.StartPoint.Y);
                case MacroActionType.RunScript:
                    return string.Format("Sub-Script: [{0}]\nSelect another script tab to run nestedly (current script is excluded).",
                        !string.IsNullOrEmpty(step.KeyData) ? step.KeyData : "(None)");
                default:
                    return string.Format("Target Point ({0}, {1}):\nClick coordinate text or 🎯 to pick with magnifier crosshair.",
                        step.StartPoint.X, step.StartPoint.Y);
            }
        }

        // 6. Header Column Tooltips
        public static string GetHeaderDescription(string colName)
        {
            switch (colName)
            {
                case "No.":
                    return "Step Number (#):\nDrag handle to reorder steps.\nClick to select row (Shift+Click for range selection, Ctrl+Click for multi-select, Ctrl+A to select all).";
                case "✔":
                    return "Enable / Disable All Steps (✔):\nClick header to toggle enable/disable for all steps in this script.\n(Disabled steps will not run during execution and will not show on the map overlay).";
                case "Win":
                    return "Target Window (🪟):\nClick header to batch assign Target Window to highlighted/selected steps (or all steps if none selected).";
                case "Action Type":
                    return "Action Type:\nClick header to batch change Action Type for highlighted/selected steps (or all steps if none selected).";
                case "Target":
                    return "Target Coordinate / Key / Action Target (🎯):\nClick header to batch pick and set Target Coordinates for highlighted/selected steps (or all steps if none selected).";
                case "Hold":
                    return "Hold (ms) - Step Completion Duration:\n" +
                           "Execution time to complete this step (e.g. mouse button hold, keystroke press, or drag duration).\n" +
                           "Click header to batch set Hold for selected steps.";
                case "Delay":
                    return "Delay (ms) - Next Step Wait / Travel Time:\n" +
                           "Wait time before proceeding to the next step, or mouse travel duration to the next step (when Smooth Mouse Move is enabled).\n" +
                           "Click header to batch set Delay for selected steps.";
                case "Rep":
                    return "Repeat Count (Rep):\nClick header to batch set Repeat count for highlighted/selected steps (or all steps if none selected).";
                case "Del":
                    return "Batch Delete Steps (✕):\nClick header to batch delete highlighted/selected steps (or all steps if none selected).";
                case "Note":
                    return "Batch Set Note:\nClick header to batch set custom note for highlighted/selected steps (or all steps if none selected).";
                default:
                    return colName;
            }
        }

        // 7. ToolTip Configurator with fast pop-up
        public static ToolTip CreateFastToolTip()
        {
            return new ToolTip
            {
                InitialDelay = 50,      // Display almost immediately on hover
                ReshowDelay = 50,       // Instant reshow when moving between items
                AutoPopDelay = 20000,   // Stay visible for 20 seconds
                ShowAlways = true
            };
        }
    }
}
