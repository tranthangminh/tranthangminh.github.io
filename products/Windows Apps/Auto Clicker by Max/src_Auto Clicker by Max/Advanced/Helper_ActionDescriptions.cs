using System;
using System.Drawing;
using System.Windows.Forms;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker.Advanced
{
    public static class MacroDescriptions
    {
        // 1. Action Type Detailed Descriptions
        public static string GetActionTypeDescription(MacroActionType type)
        {
            if (Loc.IsVietnamese)
            {
                switch (type)
                {
                    case MacroActionType.LeftClick:
                        return "Click Chuột Trái:\nThực hiện một cú nhấp chuột chính tại tọa độ (X, Y) được chỉ định.";
                    case MacroActionType.RightClick:
                        return "Click Chuột Phải:\nThực hiện một cú nhấp chuột phụ (menu ngữ cảnh) tại tọa độ (X, Y).";
                    case MacroActionType.MiddleClick:
                        return "Click Giữa / Cuộn Chuột:\nNhấp nút chuột giữa tại (X, Y) hoặc cuộn con lăn chuột.\n• 0: Click chuột giữa\n• Dương (+): Cuộn lên\n• Âm (-): Cuộn xuống";
                    case MacroActionType.DoubleClick:
                        return "Click Đúp (Nhấp Đôi):\nThực hiện nhấp đôi chuột trái nhanh tại tọa độ (X, Y).";
                    case MacroActionType.DragDrop:
                        return "Kéo & Thả (Drag & Drop):\nNhấp và kéo con trỏ mượt mà từ Điểm A đến Điểm B trong khoảng thời gian Giữ (Hold) đã cài đặt.";
                    case MacroActionType.KeyPress:
                        return "Nhấn Phím:\nNhấn một phím đơn hoặc tổ hợp phím tắt (ví dụ Space, Enter, Ctrl+C, Alt+F4) trong khoảng thời gian Giữ (Hold).";
                    case MacroActionType.TypeText:
                        return "Gõ Văn Bản:\nTự động gõ một chuỗi ký tự hoặc văn bản Unicode vào ô nhập liệu đang hoạt động.";
                    case MacroActionType.Delay:
                        return "Chờ Đợi (Delay):\nTạm dừng thực thi kịch bản (chuột đứng yên trong Hold, sau đó chờ hoặc di chuyển đến bước kế trong Delay).";
                    case MacroActionType.WaitColor:
                        return "Chờ Màu Xuất Hiện:\nTạm dừng thực thi cho đến khi mã màu HEX mục tiêu xuất hiện tại điểm hoặc trong vùng đã chọn (trong phạm vi sai số).";
                    case MacroActionType.IfColor:
                        return "Nếu Đúng Màu (Rẽ nhánh điều kiện):\n" +
                               "Kiểm tra màu HEX mục tiêu tại điểm hoặc quét toàn bộ vùng đã chọn:\n" +
                               "• Khớp: Hành động khi màu khớp (Click Mục tiêu, Nhảy đến bước X, hoặc Dừng).\n" +
                               "• Không khớp: Hành động khi màu không khớp (Bước kế tiếp, Nhảy đến bước X, Dừng, hoặc Click Mục tiêu).";
                    case MacroActionType.IfColorArea:
                        return "Nếu Đúng Màu trong Vùng:\n" +
                               "Quét toàn bộ vùng giới hạn (Điểm A đến Điểm B) để tìm màu mục tiêu.";
                    case MacroActionType.WaitChange:
                        return "Chờ Đổi Màu:\nTạm dừng thực thi cho đến khi màu pixel tại (X, Y) thay đổi so với màu ban đầu.";
                    case MacroActionType.RunScript:
                        return "Gọi Script Phụ:\nChạy một script tab khác đã lưu như một chương trình con với số lần lặp đã chỉ định.";
                    case MacroActionType.WaitImage:
                        return "Chờ Hình Ảnh:\nTạm dừng thực thi cho đến khi hình ảnh mẫu xuất hiện trong vùng tìm kiếm trong phạm vi độ tương đồng hoặc hết thời gian chờ.";
                    case MacroActionType.IfImage:
                        return "Nếu Thấy Hình Ảnh (Template Matching):\n" +
                               "Tìm kiếm hình ảnh mẫu trên màn hình hoặc vùng chỉ định:\n" +
                               "• Thấy: Hành động khi tìm thấy ảnh (Click Tâm ảnh, Nhảy đến bước X, Bước kế tiếp, hoặc Dừng).\n" +
                               "• Không thấy: Hành động khi không tìm thấy (Bước kế tiếp, Nhảy đến bước X, hoặc Dừng).";
                    default:
                        return "Bước Macro: Thực hiện một hành động tự động hóa.";
                }
            }

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
                    return "Wait Color:\nPauses execution until the target HEX color appears at the point or within the selected area (Wait Area) within tolerance.";
                case MacroActionType.IfColor:
                    return "If Color (Conditional Branching):\n" +
                           "Checks the target HEX color at the specified point or scans the entire selected area:\n" +
                           "• Match: Action when color matches (Click Target, Jump to Step X, or Stop).\n" +
                           "• Unmatch: Action when color does not match (Next Step, Jump to Step X, Stop, or Click Target).";
                case MacroActionType.IfColorArea:
                    return "If Color Area:\n" +
                           "Scans the bounding box area (Point A to Point B) for the target color.";
                case MacroActionType.WaitChange:
                    return "Wait Change:\nPauses execution until the pixel color at (X, Y) changes from its initial color.";
                case MacroActionType.RunScript:
                    return "Run Script:\nExecutes another saved script tab as a sub-routine for the specified repeat count.";
                case MacroActionType.WaitImage:
                    return "Wait Image:\nPauses execution until the template image appears within the search area within similarity tolerance or timeout.";
                case MacroActionType.IfImage:
                    return "If Image (Template Matching):\n" +
                           "Searches for the template image within the screen or designated area:\n" +
                           "• Found: Action when image is found (Click Center, Jump to Step X, Next Step, or Stop).\n" +
                           "• Not Found: Action when image is missing (Next Step, Jump to Step X, or Stop).";
                default:
                    return "Macro Action: Performs an automated input step.";
            }
        }

        // 2. Hold Duration Tooltip (Thời gian hoàn tất một Step)
        public static string GetHoldDescription(MacroActionType type)
        {
            if (Loc.IsVietnamese)
            {
                switch (type)
                {
                    case MacroActionType.Delay:
                        return "Giữ (ms) - Thời Gian Đứng Yên:\nKhoảng thời gian chuột giữ nguyên vị trí không di chuyển.";
                    case MacroActionType.DragDrop:
                        return "Giữ (ms) - Thời Gian Hoàn Tất Kéo:\nThời gian kéo mượt mà con trỏ chuột từ Điểm A đến Điểm B.";
                    case MacroActionType.TypeText:
                        return "Giữ (ms) - Thời Gian Hoàn Tất Gõ:\nTổng thời gian để gõ xong toàn bộ chuỗi ký tự.";
                    case MacroActionType.KeyPress:
                        return "Giữ (ms) - Thời Gian Nhấn Phím:\nThời gian giữ phím hoặc tổ hợp phím trước khi nhả ra.";
                    case MacroActionType.LeftClick:
                    case MacroActionType.RightClick:
                    case MacroActionType.MiddleClick:
                    case MacroActionType.DoubleClick:
                        return "Giữ (ms) - Thời Gian Nhấn Chuột:\nThời gian nút chuột được nhấn giữ xuống trước khi nhả ra.";
                    default:
                        return "Giữ (ms) - Thời Gian Thực Thi:\nKhoảng thời gian để hoàn thành bước hành động này.";
                }
            }

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
            if (Loc.IsVietnamese)
            {
                return "Chờ (ms) - Thời Gian Chờ Đến Bước Kế / Di Chuyển:\n" +
                       "Thời gian chờ trước khi chuyển sang bước tiếp theo, hoặc thời gian chuột di chuyển mượt đến bước kế tiếp (khi bật Di chuột mượt).";
            }

            return "Delay (ms) - Next Step Wait / Travel Time:\n" +
                   "Wait time before proceeding to the next step, or mouse travel duration to the next step (when Smooth Mouse Move is enabled).";
        }

        // 4. Repeat Count Tooltip
        public static string GetRepeatDescription(MacroActionType type)
        {
            if (Loc.IsVietnamese)
            {
                if (type == MacroActionType.RunScript)
                {
                    return "Lặp (Số Lần Lặp):\nSố lần liên tiếp thực thi script con mục tiêu.";
                }
                return "Lặp (Số Lần Lặp):\nSố lần thực hiện lặp lại bước hành động này trước khi chuyển bước.";
            }

            if (type == MacroActionType.RunScript)
            {
                return "Rep (Repeat Count):\nNumber of times to execute the target sub-script consecutively.";
            }
            return "Rep (Repeat Count):\nNumber of consecutive times to repeat this action before continuing.";
        }

        // 5. Target / Key / Coordinate Column Tooltip
        public static string GetTargetKeyDescription(MacroStep step)
        {
            if (step == null)
            {
                return Loc.IsVietnamese
                    ? "Mục Tiêu:\nTọa độ mục tiêu, phím tắt, văn bản cần gõ, hoặc tên script con."
                    : "Target:\nTarget coordinates, key shortcut, typed text, or sub-script name.";
            }

            bool isArea = (step.EndPoint != Point.Empty && step.EndPoint != step.StartPoint);
            int areaW = isArea ? Math.Abs(step.EndPoint.X - step.StartPoint.X) : 0;
            int areaH = isArea ? Math.Abs(step.EndPoint.Y - step.StartPoint.Y) : 0;

            if (Loc.IsVietnamese)
            {
                switch (step.ActionType)
                {
                    case MacroActionType.DragDrop:
                        return string.Format("Đường Kéo:\nTừ Điểm A ({0}, {1}) đến Điểm B ({2}, {3}). Nhấp vào tọa độ hoặc 🎯 để chọn.",
                            step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y);
                    case MacroActionType.MiddleClick:
                        if (isArea)
                        {
                            return string.Format("Vùng Click Giữa / Cuộn (Click Ngẫu Nhiên trong Vùng):\nVùng: ({0}, {1}) đến ({2}, {3}) [{4}×{5} px] và nấc cuộn: {6}.\n• 0: Click chuột giữa ngẫu nhiên trong vùng\n• Dương (+): Cuộn lên\n• Âm (-): Cuộn xuống\nNhấp 🎯 để chọn.",
                                step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH, step.ScrollStep);
                        }
                        return string.Format("Tọa Độ & Cuộn Chuột:\nTọa độ ({0}, {1}) và nấc cuộn: {2}.\n• 0: Click chuột giữa\n• Dương (+): Cuộn lên\n• Âm (-): Cuộn xuống\nNhấp 🎯 để chọn tọa độ.",
                            step.StartPoint.X, step.StartPoint.Y, step.ScrollStep);
                    case MacroActionType.KeyPress:
                        return string.Format("Phím Tắt: [{0}]\nBấm phím bất kỳ hoặc tổ hợp phím trong ô để ghi lại.",
                            !string.IsNullOrEmpty(step.KeyData) ? step.KeyData : "Space");
                    case MacroActionType.TypeText:
                        return "Gõ Văn Bản:\nNhập chuỗi văn bản cần tự động gõ (hỗ trợ tiếng Việt Unicode).";
                    case MacroActionType.Delay:
                        return "Hành Động Chờ:\nTạm dừng thực thi (Giữ: chuột đứng yên, Chờ: chờ đến bước kế).";
                    case MacroActionType.WaitColor:
                    case MacroActionType.IfColor:
                    case MacroActionType.IfColorArea:
                        if (isArea || step.ActionType == MacroActionType.IfColorArea)
                        {
                            return string.Format("Tìm Màu Trong Vùng:\nVùng quét ({0}, {1}) đến ({2}, {3}) [{4}×{5} px] khớp màu HEX {6} (Sai số ±{7}). Nhấp ô màu để đổi màu, 🎯 để chọn.",
                                step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH, step.ColorHex, step.Tolerance);
                        }
                        return string.Format("Kiểm Tra Màu Pixel:\nPixel ({0}, {1}) khớp màu HEX {2} (Sai số ±{3}). Nhấp ô màu để đổi màu, 🎯 để chọn.",
                            step.StartPoint.X, step.StartPoint.Y, step.ColorHex, step.Tolerance);
                    case MacroActionType.WaitChange:
                        return string.Format("Theo Dõi Đổi Màu:\nQuan sát pixel ({0}, {1}) cho đến khi đổi màu so với ban đầu. Nhấp 🎯 để chọn.",
                            step.StartPoint.X, step.StartPoint.Y);
                    case MacroActionType.RunScript:
                        return string.Format("Script Con: [{0}]\nChọn script tab khác để chạy lồng (script hiện tại được loại trừ).",
                            !string.IsNullOrEmpty(step.KeyData) ? step.KeyData : "(Chưa chọn)");
                    case MacroActionType.WaitImage:
                    case MacroActionType.IfImage:
                        if (isArea)
                        {
                            return string.Format("Tìm Hình Ảnh Trong Vùng:\nGiới hạn tìm ({0}, {1}) đến ({2}, {3}) [{4}×{5} px]. Độ khớp: {6}%. Nhấp ảnh thu nhỏ để cắt ảnh hoặc 🎯 để đặt vùng quét.",
                                step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH, step.Similarity);
                        }
                        return string.Format("Tìm Hình Ảnh (Toàn Màn Hình):\nĐộ khớp: {0}%. Nhấp ảnh thu nhỏ để cắt ảnh hoặc 🎯 để giới hạn vùng tìm.",
                            step.Similarity);
                    default:
                        if (isArea)
                        {
                            return string.Format("Mục Tiêu Vùng (Click Ngẫu Nhiên):\nVùng ({0}, {1}) đến ({2}, {3}) [{4}×{5} px]. Click ngẫu nhiên bên trong vùng mỗi lần. Nhấp 🎯 để chọn.",
                                step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH);
                        }
                        return string.Format("Tọa Độ Mục Tiêu ({0}, {1}):\nNhấp vào tọa độ hoặc 🎯 để chọn với kính lúp phóng to.",
                            step.StartPoint.X, step.StartPoint.Y);
                }
            }

            switch (step.ActionType)
            {
                case MacroActionType.DragDrop:
                    return string.Format("Drag Path:\nFrom Point A ({0}, {1}) to Point B ({2}, {3}). Click coordinate text or 🎯 to pick.",
                        step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y);
                case MacroActionType.MiddleClick:
                    if (isArea)
                    {
                        return string.Format("Area Middle Click / Scroll (Random Click in Area):\nArea: ({0}, {1}) to ({2}, {3}) [{4}×{5} px] and Scroll step: {6}.\n• 0: Random Middle Click in area\n• Positive (+): Scroll Up\n• Negative (-): Scroll Down\nClick 🎯 to pick.",
                            step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH, step.ScrollStep);
                    }
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
                case MacroActionType.IfColorArea:
                    if (isArea || step.ActionType == MacroActionType.IfColorArea)
                    {
                        return string.Format("Area Color Search:\nBounding box ({0}, {1}) to ({2}, {3}) [{4}×{5} px] matching HEX {6} (Tolerance ±{7}). Click swatch to change color, 🎯 to pick.",
                            step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH, step.ColorHex, step.Tolerance);
                    }
                    return string.Format("Color Check:\nPixel ({0}, {1}) matching HEX {2} (Tolerance ±{3}). Click swatch to change color, 🎯 to pick.",
                        step.StartPoint.X, step.StartPoint.Y, step.ColorHex, step.Tolerance);
                case MacroActionType.WaitChange:
                    return string.Format("Watch Color Change:\nMonitors pixel ({0}, {1}) until its color changes from initial state. Click 🎯 to pick.",
                        step.StartPoint.X, step.StartPoint.Y);
                case MacroActionType.RunScript:
                    return string.Format("Sub-Script: [{0}]\nSelect another script tab to run nestedly (current script is excluded).",
                        !string.IsNullOrEmpty(step.KeyData) ? step.KeyData : "(None)");
                case MacroActionType.WaitImage:
                case MacroActionType.IfImage:
                    if (isArea)
                    {
                        return string.Format("Template Image Search in Area:\nSearch bounds ({0}, {1}) to ({2}, {3}) [{4}×{5} px]. Sim: {6}%. Click thumbnail to crop image or 🎯 to set search area.",
                            step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH, step.Similarity);
                    }
                    return string.Format("Template Image Search (Full Screen):\nSim: {0}%. Click thumbnail to crop image or 🎯 to restrict search area.",
                        step.Similarity);
                default:
                    if (isArea)
                    {
                        return string.Format("Area Target (Random Click):\nBounding box ({0}, {1}) to ({2}, {3}) [{4}×{5} px]. Randomly clicks inside this area each time. Click 🎯 to pick.",
                            step.StartPoint.X, step.StartPoint.Y, step.EndPoint.X, step.EndPoint.Y, areaW, areaH);
                    }
                    return string.Format("Target Point ({0}, {1}):\nClick coordinate text or 🎯 to pick with magnifier crosshair.",
                        step.StartPoint.X, step.StartPoint.Y);
            }
        }

        // 6. Header Column Tooltips
        public static string GetHeaderDescription(string colName)
        {
            if (Loc.IsVietnamese)
            {
                switch (colName)
                {
                    case "No.":
                        return "Số Thứ Tự Bước (#):\nKéo tay cầm để sắp xếp lại thứ tự bước.\nNhấp chuột để chọn dòng (Shift+Click để chọn vùng, Ctrl+Click để chọn nhiều dòng, Ctrl+A để chọn tất cả).";
                    case "✔":
                        return "Bật / Tắt Tất Cả Các Bước (✔):\nNhấp tiêu đề để bật/tắt toàn bộ các bước trong script này.\n(Các bước bị tắt sẽ không chạy khi thực thi và không hiển thị trên overlay).";
                    case "Win":
                        return "Cửa Sổ Mục Tiêu (🪟):\nNhấp tiêu đề để gán hàng loạt Cửa sổ Mục tiêu cho các bước đang chọn (hoặc tất cả bước nếu chưa chọn dòng nào).";
                    case "Action Type":
                        return "Loại Hành Động:\nNhấp tiêu đề để đổi hàng loạt Loại Hành Động cho các bước đang chọn (hoặc tất cả bước nếu chưa chọn dòng nào).";
                    case "Target":
                        return "Tọa Độ Mục Tiêu / Phím Tắt (🎯):\nNhấp tiêu đề để chọn và gán hàng loạt Tọa Độ cho các bước đang chọn (hoặc tất cả bước nếu chưa chọn dòng nào).";
                    case "Hold":
                        return "Giữ (ms) - Thời Gian Hoàn Tất Bước:\n" +
                               "Thời gian thực thi để hoàn thành bước này (ví dụ: giữ nút chuột, giữ phím, hoặc thời gian kéo chuột).\n" +
                               "Nhấp tiêu đề để đặt hàng loạt thời gian Giữ cho các bước đã chọn.";
                    case "Delay":
                        return "Chờ (ms) - Thời Gian Chờ Đến Bước Kế / Di Chuyển:\n" +
                               "Thời gian chờ trước khi chuyển sang bước tiếp theo, hoặc thời gian chuột di chuyển mượt đến bước kế tiếp (khi bật Di chuột mượt).\n" +
                               "Nhấp tiêu đề để đặt hàng loạt thời gian Chờ cho các bước đã chọn.";
                    case "Rep":
                        return "Số Lần Lặp (Lặp):\nNhấp tiêu đề để đặt hàng loạt số lần Lặp cho các bước đang chọn (hoặc tất cả bước nếu chưa chọn dòng nào).";
                    case "Del":
                        return "Xóa Hàng Loạt (✕):\nNhấp tiêu đề để xóa hàng loạt các bước đang chọn (hoặc tất cả bước nếu chưa chọn dòng nào).";
                    case "Note":
                        return "Ghi Chú Hàng Loạt:\nNhấp tiêu đề để đặt ghi chú hàng loạt cho các bước đang chọn (hoặc tất cả bước nếu chưa chọn dòng nào).";
                    default:
                        return colName;
                }
            }

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
