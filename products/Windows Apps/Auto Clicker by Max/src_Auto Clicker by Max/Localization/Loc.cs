using System;
using System.Collections.Generic;

namespace ModernAutoClicker.Localization
{
    public enum AppLanguage
    {
        English = 0,
        Vietnamese = 1
    }

    public static class Loc
    {
        public static event Action OnLanguageChanged
        {
            add { MaxApp.Common.Loc.OnLanguageChanged += value; }
            remove { MaxApp.Common.Loc.OnLanguageChanged -= value; }
        }

        public static AppLanguage CurrentLanguage
        {
            get { return (AppLanguage)MaxApp.Common.Loc.CurrentLanguage; }
            set { MaxApp.Common.Loc.CurrentLanguage = (MaxApp.Common.AppLanguage)value; }
        }

        public static bool IsVietnamese
        {
            get { return MaxApp.Common.Loc.IsVietnamese; }
        }

        public static void SetLanguage(string langCode)
        {
            MaxApp.Common.Loc.SetLanguage(langCode);
        }

        public static string CurrentLanguageCode
        {
            get { return MaxApp.Common.Loc.CurrentLanguageCode; }
        }

        // ========================================================
        // 1. MAIN TABS
        // ========================================================
        public static string TabSimple { get { return IsVietnamese ? "Cơ bản" : "Simple"; } }
        public static string TabAsianMode { get { return IsVietnamese ? "Chế độ \"Châu Á\"" : "Asian Mode"; } }

        // ========================================================
        // 2. CLICK MODE CARD
        // ========================================================
        public static string HeaderClickMode { get { return IsVietnamese ? "Chế độ Click" : "Click Mode"; } }
        public static string ModePointList { get { return IsVietnamese ? "DS Điểm" : "Point List"; } }
        public static string ModeFollowCursor { get { return IsVietnamese ? "Theo Chuột" : "Follow Cursor"; } }

        // ========================================================
        // 3. TARGET WINDOW CARD
        // ========================================================
        public static string HeaderTargetWindow { get { return IsVietnamese ? "Cửa sổ Mục tiêu" : "Target Window"; } }
        public static string TargetEntireScreen { get { return IsVietnamese ? "Toàn màn hình (Tọa độ ảo)" : "Entire Screen (Virtual Screen)"; } }
        public static string TargetActiveWindow { get { return IsVietnamese ? "Cửa sổ đang hoạt động" : "Active Window"; } }

        // ========================================================
        // 4. CLICK SETTINGS CARD
        // ========================================================
        public static string HeaderClickSettings { get { return IsVietnamese ? "Cài đặt Click" : "Click Settings"; } }
        public static string LabelClickEvery { get { return IsVietnamese ? "Click mỗi" : "Click Every:"; } }
        public static string LabelLoops { get { return IsVietnamese ? "Vòng lặp:" : "Loops:"; } }
        public static string LoopHintInfinite { get { return "(0 = ∞)"; } }
        public static string LabelJitter { get { return IsVietnamese ? "Độ lệch:" : "Jitter:"; } }
        public static string UnitJitterPx { get { return "± px"; } }
        public static string LabelCurrentClicks { get { return IsVietnamese ? "Đã click:" : "Current:"; } }
        public static string UnitClicks { get { return IsVietnamese ? "Lần" : "Clicks"; } }
        public static string LabelCurrentTime { get { return IsVietnamese ? "Thời gian:" : "Current:"; } }

        // ========================================================
        // 5. TARGET LIST CARD
        // ========================================================
        public static string HeaderTargetPoints(int count)
        {
            return IsVietnamese
                ? string.Format("Mục tiêu ({0} Tọa độ)", count)
                : string.Format("Target ({0} Points)", count);
        }
        public static string BtnClear { get { return IsVietnamese ? "Xóa hết" : "Clear"; } }
        public static string BtnSave { get { return IsVietnamese ? "Lưu" : "Save"; } }
        public static string BtnLoad { get { return IsVietnamese ? "Tải" : "Load"; } }

        // ========================================================
        // 6. BOTTOM ACTION BUTTONS & STATUS
        // ========================================================
        public static string BtnStart { get { return IsVietnamese ? "Bắt đầu" : "Start"; } }
        public static string BtnPause { get { return IsVietnamese ? "Tạm dừng" : "Pause"; } }
        public static string BtnResume { get { return IsVietnamese ? "Tiếp tục" : "Resume"; } }
        public static string BtnStopAll { get { return IsVietnamese ? "Dừng HẾT" : "Stop ALL"; } }
        public static string BtnTransformToolTip { get { return IsVietnamese ? "Di chuyển & thu phóng toàn bộ điểm click" : "Move and scale all click points"; } }
        public static string StatusReady { get { return IsVietnamese ? "Sẵn sàng" : "Ready"; } }
        public static string StatusRunning { get { return IsVietnamese ? "Đang chạy..." : "Running..."; } }
        public static string StatusPaused { get { return IsVietnamese ? "Đang tạm dừng" : "Paused"; } }
        public static string StatusStopped { get { return IsVietnamese ? "Đã dừng" : "Stopped"; } }
        public static string RunStatsSimple(long clicks, string time, string loops)
        {
            return string.Format(IsVietnamese ? "Click: {0:N0} | Thời gian: {1} | Vòng lặp: {2}" : "Clicks: {0:N0} | Time: {1} | Loops: {2}", clicks, time, loops);
        }
        public static string RunStatsAsian(long steps, string time, string loops)
        {
            return string.Format(IsVietnamese ? "Bước: {0:N0} | Thời gian: {1} | Vòng lặp: {2}" : "Steps: {0:N0} | Time: {1} | Loops: {2}", steps, time, loops);
        }
        public static string RunningTasks(int count, string names)
        {
            return string.Format(IsVietnamese ? "Đang chạy ({0}): {1}" : "Running ({0}): {1}", count, names);
        }
        public static string RunningSimpleName(int tabNumber)
        {
            return string.Format(IsVietnamese ? "Cơ bản #{0}" : "Simple #{0}", tabNumber);
        }
        public static string RunningAsianName(string scriptName)
        {
            return string.Format(IsVietnamese ? "Châu Á {0}" : "Asian {0}", scriptName);
        }

        // Target window problem popup
        public static string SettingsProblemTitle { get { return IsVietnamese ? "Cài đặt của ứng dụng" : "App settings"; } }
        public static string SettingsCouldNotRead { get { return IsVietnamese ? "Không đọc được file cài đặt, có thể chương trình khác đang giữ file.\n\nFile vẫn còn nguyên, nhưng trong lần mở này app sẽ không lưu gì để tránh ghi đè. Hãy đóng app, đợi chút rồi mở lại." : "The settings file could not be read. Another program may be holding it.\n\nThe file is untouched, but nothing will be saved this session so it cannot be overwritten. Close the app, wait a moment and open it again."; } }
        public static string SettingsRestored { get { return IsVietnamese ? "File cài đặt bị hỏng nên app đã khôi phục từ bản sao gần nhất. Một vài thay đổi mới nhất có thể bị mất.\n\nFile hỏng được giữ lại trong thư mục AutoClicker-Save&Load." : "The settings file was damaged, so the app restored its latest backup. The newest changes may be missing.\n\nThe damaged file was kept in the AutoClicker-Save&Load folder."; } }
        public static string SettingsReset { get { return IsVietnamese ? "File cài đặt bị hỏng và không có bản sao dùng được, nên app đã quay về mặc định.\n\nFile hỏng được giữ lại trong thư mục AutoClicker-Save&Load." : "The settings file was damaged and no usable backup exists, so the app went back to its defaults.\n\nThe damaged file was kept in the AutoClicker-Save&Load folder."; } }
        public static string SettingsCouldNotSave { get { return IsVietnamese ? "Không lưu được cài đặt, nên các thay đổi vừa rồi có thể bị mất khi tắt app.\n\nHãy kiểm tra ổ đĩa còn trống và thư mục của app có cho phép ghi không." : "Settings could not be saved, so recent changes may be lost when the app closes.\n\nCheck that the disk has free space and that the app's folder can be written to."; } }
        public static string RunFailedTitle { get { return IsVietnamese ? "Script gặp lỗi" : "Script error"; } }
        public static string RunFailedMessage(string name, string error) { return string.Format(IsVietnamese ? "{0} đã dừng vì gặp lỗi:\n\n{1}\n\nCác tab khác vẫn chạy bình thường. Chi tiết nằm trong file error.log." : "{0} stopped because of an error:\n\n{1}\n\nOther tabs keep running. Details are in error.log.", name, error); }
        public static string HotkeyTakenTitle { get { return IsVietnamese ? "Phím tắt đang bị chiếm" : "Hotkey in use"; } }
        public static string HotkeyTakenMessage(string keys) { return string.Format(IsVietnamese ? "Một ứng dụng khác đang dùng {0}, nên phím này không hoạt động khi bạn ở ngoài Auto Clicker.\n\nHãy đóng ứng dụng đó rồi mở lại Auto Clicker. Các nút Bắt đầu và Dừng trong app vẫn dùng được." : "Another app is using {0}, so it will not work while you are outside Auto Clicker.\n\nClose that app and reopen Auto Clicker. The Start and Stop buttons in the app still work.", keys); }

        public static string TargetDialogTitle { get { return IsVietnamese ? "Cửa sổ target" : "Target window"; } }
        public static string TargetTitleClosed { get { return IsVietnamese ? "Cửa sổ target đã bị tắt" : "Target window was closed"; } }
        public static string TargetTitleMinimized { get { return IsVietnamese ? "Cửa sổ target đang thu nhỏ" : "Target window is minimized"; } }
        public static string TargetTitleHidden { get { return IsVietnamese ? "Cửa sổ target đang bị ẩn" : "Target window is hidden"; } }
        public static string TargetTitleNotFound { get { return IsVietnamese ? "Không tìm thấy cửa sổ target" : "Target window not found"; } }
        public static string TargetHintMinimized { get { return IsVietnamese ? "Không được thu nhỏ app target khi chạy. Hãy mở cửa sổ đó lên rồi bấm Start lại." : "The target app must not be minimized while running. Restore the window, then press Start again."; } }
        public static string TargetHintHidden { get { return IsVietnamese ? "Hãy mở cửa sổ đó lên rồi bấm Start lại." : "Show the window again, then press Start again."; } }
        public static string TargetHintNoOtherWindows { get { return IsVietnamese ? "Hãy mở lại app rồi chọn lại target, hoặc chọn target khác." : "Open the app again and pick it as the target, or pick another target."; } }
        public static string TargetHintOtherWindows(string appName, string pidList)
        {
            return string.Format(IsVietnamese
                ? "Đang có cửa sổ {0} khác mở: {1}. App không tự chuyển sang cửa sổ khác, hãy chọn target nếu muốn dùng chúng."
                : "Other {0} windows are open: {1}. The app does not switch to another window on its own, so pick one if you want to use it.", appName, pidList);
        }
        public static string TargetRunStopped(string name)
        {
            return string.Format(IsVietnamese ? "{0} đã dừng." : "{0} was stopped.", name);
        }
        public static string TargetRunStoppedAtStep(string name, string step)
        {
            return string.Format(IsVietnamese ? "{0} đã dừng ở bước {1}." : "{0} was stopped at step {1}.", name, step);
        }
        public static string TargetRunNotStarted(string name)
        {
            return string.Format(IsVietnamese ? "{0} chưa chạy." : "{0} did not start.", name);
        }
        public static string TargetStepsUsing(string steps)
        {
            return string.Format(IsVietnamese ? "Các bước dùng target này: {0}." : "Steps using this target: {0}.", steps);
        }
        public static string TargetNewTargetLabel { get { return IsVietnamese ? "Target mới:" : "New target:"; } }
        public static string TargetPickWindow { get { return IsVietnamese ? "Chọn cửa sổ..." : "Pick a window..."; } }
        public static string TargetAllScreens { get { return IsVietnamese ? "Toàn màn hình (Desktop)" : "All Screens (Desktop)"; } }
        public static string TargetNoOpenWindows { get { return IsVietnamese ? "(Không phát hiện cửa sổ đang mở)" : "(No open windows detected)"; } }
        public static string TargetBtnKeep { get { return IsVietnamese ? "Đã hiểu, không đổi target" : "Got it, keep the target"; } }
        public static string TargetBtnChange { get { return IsVietnamese ? "Đổi target" : "Change target"; } }
        public static string TargetBtnGotIt { get { return IsVietnamese ? "Đã hiểu" : "Got it"; } }
        public static string TargetChangedPressStart { get { return IsVietnamese ? "Đã đổi target. Bấm Start để chạy." : "Target changed. Press Start to run."; } }

        // ========================================================
        // 7. GLOBAL SETTINGS CHECKBOXES
        // ========================================================
        public static string ChkAlwaysOnTop { get { return IsVietnamese ? "Ghim lên đầu" : "Window on Top"; } }
        public static string ChkShowMap { get { return IsVietnamese ? "Hiện Map" : "Show Map"; } }
        public static string ChkFreeMouse { get { return IsVietnamese ? "Chuột Tự Do" : "Free Mouse Mode"; } }
        public static string ChkSmoothMove { get { return IsVietnamese ? "Di chuột mượt" : "Smooth Mouse Move"; } }
        public static string ChkFreeMouseTooltip
        {
            get
            {
                return IsVietnamese
                    ? "Free Mouse Mode (Click ngầm không chiếm chuột):\n" +
                      "Cho phép tự động click dưới nền ngay cả khi cửa sổ mục tiêu bị che khuất hoặc không active.\n\n" +
                      "Các ứng dụng và trình giả lập đã được hỗ trợ tối ưu:\n" +
                      " • BlueStacks 5 (HD-Player)\n" +
                      " • Google Play Games trên PC (crosvm)\n" +
                      " • Windows Desktop (Màn hình chính & biểu tượng)\n" +
                      " • File Explorer (Quản lý tệp Windows)\n" +
                      " • Các ứng dụng Win32 & trình duyệt thông thường (Chrome, Edge, Firefox, Notepad...)\n\n" +
                      "* Lưu ý: Nếu app mục tiêu chạy quyền Administrator, hãy chạy Auto Clicker bằng Administrator để click hoạt động."
                    : "Free Mouse Mode (Background click without stealing physical cursor):\n" +
                      "Allows clicking in the background even when the target window is covered or unfocused.\n\n" +
                      "Supported & optimized applications:\n" +
                      " • BlueStacks 5 (HD-Player)\n" +
                      " • Google Play Games on PC (crosvm)\n" +
                      " • Windows Desktop (Desktop icons)\n" +
                      " • File Explorer (CabinetWClass)\n" +
                      " • Standard Win32 apps & web browsers (Chrome, Edge, Firefox, Notepad...)\n\n" +
                      "* Note: If the target app runs as Administrator, run Auto Clicker as Administrator as well.";
            }
        }

        // ========================================================
        // 8. HOTKEY CARDS
        // ========================================================
        public static string HotkeySimpleF6 { get { return IsVietnamese ? ": Bắt đầu / Dừng" : ": Start / Stop (Active)"; } }
        public static string HotkeySimpleF7 { get { return IsVietnamese ? ": Dừng TẤT CẢ" : ": Stop ALL"; } }
        public static string HotkeySimpleSpace { get { return IsVietnamese ? ": Thêm tọa độ" : ": Add Point"; } }

        public static string HotkeyAdvF6 { get { return IsVietnamese ? ": Bắt đầu / Dừng" : ": Start / Stop"; } }
        public static string HotkeyAdvF7 { get { return IsVietnamese ? ": Dừng TẤT CẢ" : ": Stop ALL"; } }
        public static string HotkeyAdvSpace { get { return IsVietnamese ? ": Thêm bước" : ": Add Step"; } }
        public static string HotkeyAdvTip1 { get { return IsVietnamese ? "• Chọn nhiều hàng: Giữ Ctrl hoặc Shift để chọn" : "• Multi-select: Hold Ctrl or Shift to select rows"; } }
        public static string HotkeyAdvTip2 { get { return IsVietnamese ? "• Sửa hàng loạt: Nhấp vào tiêu đề cột để sửa" : "• Batch edit: Click column header to edit rows"; } }

        // ========================================================
        // 9. CURSOR MODE GUIDE CARD
        // ========================================================
        public static string CursorGuideBadge { get { return IsVietnamese ? "⚠ CẢNH BÁO" : "⚠ CAUTION"; } }
        public static string CursorGuideTitle { get { return IsVietnamese ? "Chế độ Bám Con trỏ" : "Follow Cursor Mode"; } }
        public static string CursorGuideDesc
        {
            get
            {
                return IsVietnamese
                    ? "Click liên tục bất cứ nơi nào con trỏ chuột di chuyển tới.\n\nSau khi bắt đầu, việc dùng chuột để bấm nút Dừng sẽ gần như bất khả thi!"
                    : "Clicks continuously wherever your mouse moves.\n\nOnce started, clicking the Stop button with the mouse will be nearly impossible!";
            }
        }
        public static string CursorGuideHotkeyKey { get { return IsVietnamese ? "SẴN SÀNG PHÍM F6" : "KEEP F6 READY"; } }
        public static string CursorGuideHotkeyDesc
        {
            get
            {
                return IsVietnamese
                    ? "Luôn nhấn phím [F6] trên bàn phím để Dừng bất kỳ lúc nào."
                    : "Always press [F6] on your keyboard to Stop anytime.";
            }
        }
        public static string CursorGuideTip
        {
            get
            {
                return IsVietnamese
                    ? "• Di chuột tự do.\n• Áp dụng bộ hẹn giờ khoảng cách."
                    : "• Move mouse freely.\n• Interval timer applies.";
            }
        }



        // ========================================================
        // 11. ASIAN MODE (ADVANCED TAB) TOOLBAR & BOTTOM BAR
        // ========================================================
        public static string AdvBtnAddStep { get { return IsVietnamese ? "Thêm Bước" : "Add Step"; } }
        public static string AdvBtnClone { get { return IsVietnamese ? "Nhân Bản Bước" : "Clone Step(s)"; } }
        public static string AdvBtnClear { get { return IsVietnamese ? "Xóa Hết Bước" : "Clear All Steps"; } }
        public static string AdvClearAllConfirmTitle { get { return IsVietnamese ? "Xóa hết bước" : "Clear all steps"; } }
        public static string AdvClearAllConfirmMsg(int count)
        {
            return IsVietnamese
                ? string.Format("Xóa toàn bộ {0} bước trong script này?", count)
                : string.Format("Delete all {0} steps in this script?", count);
        }
        public static string AdvBtnSave { get { return IsVietnamese ? "Lưu Script" : "Save Script"; } }
        public static string AdvBtnLoad { get { return IsVietnamese ? "Tải Script" : "Load Script"; } }
        public static string AdvBtnTemplate { get { return IsVietnamese ? "Mẫu" : "Template"; } }

        public static string AdvLblLoop { get { return IsVietnamese ? "Số lần\nlặp:" : "Loop\nCount:"; } }
        public static string AdvLblJitter { get { return IsVietnamese ? "Độ lệch\nchuột:" : "Random\nJitter:"; } }
        public static string AdvLblInterval { get { return IsVietnamese ? "Khoảng\ncách:" : "Interval\nTime:"; } }
        public static string AdvLblSpeed { get { return IsVietnamese ? "Tốc độ\nchạy:" : "Execution\nSpeed:"; } }

        // ========================================================
        // 12. MACRO STEP ACTION TYPE NAMES
        // ========================================================
        public static string GetActionTypeName(Advanced.MacroActionType type)
        {
            if (!IsVietnamese)
            {
                switch (type)
                {
                    case Advanced.MacroActionType.LeftClick: return "Left Click";
                    case Advanced.MacroActionType.RightClick: return "Right Click";
                    case Advanced.MacroActionType.MiddleClick: return "Middle / Scroll";
                    case Advanced.MacroActionType.DoubleClick: return "Double Click";
                    case Advanced.MacroActionType.DragDrop: return "Drag & Drop";
                    case Advanced.MacroActionType.KeyPress: return "Key Press";
                    case Advanced.MacroActionType.PressAndClick: return "Press & Click";
                    case Advanced.MacroActionType.TypeText: return "Type Text";
                    case Advanced.MacroActionType.Delay: return "Delay";
                    case Advanced.MacroActionType.RepeatTimer: return "Repeat / Timer";
                    case Advanced.MacroActionType.WaitColor: return "Wait Color";
                    case Advanced.MacroActionType.IfColor: return "If Color";
                    case Advanced.MacroActionType.WaitImage: return "Wait Image";
                    case Advanced.MacroActionType.IfImage: return "If Image";
                    case Advanced.MacroActionType.WaitChange: return "Wait Color Change";
                    case Advanced.MacroActionType.RunScript: return "Run Script";
                    default: return type.ToString();
                }
            }
            else
            {
                switch (type)
                {
                    case Advanced.MacroActionType.LeftClick: return "Click Trái";
                    case Advanced.MacroActionType.RightClick: return "Click Phải";
                    case Advanced.MacroActionType.MiddleClick: return "Cuộn / Giữa";
                    case Advanced.MacroActionType.DoubleClick: return "Click Đúp";
                    case Advanced.MacroActionType.DragDrop: return "Kéo & Thả";
                    case Advanced.MacroActionType.KeyPress: return "Nhấn Phím";
                    case Advanced.MacroActionType.PressAndClick: return "Nhấn & Click";
                    case Advanced.MacroActionType.TypeText: return "Gõ Văn Bản";
                    case Advanced.MacroActionType.Delay: return "Chờ Đợi";
                    case Advanced.MacroActionType.RepeatTimer: return "Lặp / Bấm giờ";
                    case Advanced.MacroActionType.WaitColor: return "Chờ Màu";
                    case Advanced.MacroActionType.IfColor: return "Nếu Màu";
                    case Advanced.MacroActionType.WaitImage: return "Chờ Hình Ảnh";
                    case Advanced.MacroActionType.IfImage: return "Nếu Hình Ảnh";
                    case Advanced.MacroActionType.WaitChange: return "Chờ Đổi Màu";
                    case Advanced.MacroActionType.RunScript: return "Gọi Script";
                    default: return type.ToString();
                }
            }
        }

        // ========================================================
        // 13. JUMP OPTIONS (If Color & If Image Branches)
        // ========================================================
        public static string JumpClickTarget { get { return IsVietnamese ? "Click Mục tiêu" : "Click Target"; } }
        public static string JumpClickCenter { get { return IsVietnamese ? "Click Tâm ảnh" : "Click Center"; } }
        public static string JumpNextStep { get { return IsVietnamese ? "Bước kế tiếp" : "Next Step"; } }
        public static string JumpRepeatStep { get { return IsVietnamese ? "Lặp Lại Bước Này" : "Repeat this Step"; } }
        public static string JumpStop { get { return IsVietnamese ? "Dừng lại" : "Stop"; } }

        // ========================================================
        // 14. REPEAT / TIMER LOOP LABELS
        // ========================================================
        public static string LoopToStep { get { return IsVietnamese ? "Lặp về:" : "Loop to:"; } }
        public static string LoopWhenFinished { get { return IsVietnamese ? "Sau đó:" : "Then:"; } }
        public static string LoopModeTimes { get { return IsVietnamese ? "Số lần" : "Times"; } }
        public static string LoopModeTimer { get { return IsVietnamese ? "Bấm giờ" : "Timer"; } }
        public static string JumpStepFormat(int stepIndex)
        {
            return IsVietnamese ? string.Format("Bước {0}", stepIndex) : string.Format("Step {0}", stepIndex);
        }

        public static string LblIfMatch { get { return IsVietnamese ? "Khớp:" : "Match:"; } }
        public static string LblIfUnmatch { get { return IsVietnamese ? "Không khớp:" : "Unmatch:"; } }

        // ========================================================
        // 14. PRESS & CLICK STRINGS
        // ========================================================
        public static string OrderPressClick { get { return IsVietnamese ? "Phím ➔ Click" : "Key ➔ Click"; } }
        public static string OrderClickPress { get { return IsVietnamese ? "Click ➔ Phím" : "Click ➔ Key"; } }
        public static string LabelPressKey { get { return IsVietnamese ? "Phím:" : "Key:"; } }
        public static string LabelPressMode { get { return IsVietnamese ? "Chuột:" : "Mouse:"; } }
        public static string ModePressLeft { get { return IsVietnamese ? "Click Trái" : "Left Click"; } }
        public static string ModePressRight { get { return IsVietnamese ? "Click Phải" : "Right Click"; } }
        public static string ModePressMiddle { get { return IsVietnamese ? "Click Giữa" : "Middle Click"; } }
        public static string ModePressDrag { get { return IsVietnamese ? "Kéo & Thả" : "Drag & Drop"; } }
        public static string DragButtonLeft { get { return IsVietnamese ? "Chuột trái" : "Left Mouse"; } }
        public static string DragButtonRight { get { return IsVietnamese ? "Chuột phải" : "Right Mouse"; } }
        public static string DragButtonMiddle { get { return IsVietnamese ? "Chuột giữa" : "Middle Mouse"; } }

        // Key Press / Type Text inputs
        public static string KeyPlaceholder { get { return IsVietnamese ? "Phím" : "Key"; } }
        public static string TypeTextPlaceholder { get { return IsVietnamese ? "Nhập văn bản..." : "Input some text..."; } }
        public static string TypeTextEditorHint { get { return IsVietnamese ? "Enter: xuống dòng • Ctrl+Enter: OK • Esc: hủy" : "Enter: new line • Ctrl+Enter: OK • Esc: cancel"; } }

        public static string SettingsHeader { get { return IsVietnamese ? "Cài đặt & phím tắt" : "Settings & hotkeys"; } }

        // Record banner (Asian Mode)
        public static string RecordIdleTitle { get { return IsVietnamese ? "Ghi lại thao tác của bạn" : "Record your actions"; } }
        public static string RecordIdleSub { get { return IsVietnamese ? "Tự động ghi: Chuột, Double Click, Kéo & Thả, Phím, Nhập văn bản, Nhấn & Click" : "Auto-captures: Clicks, Double Click, Drag & Drop, Keys, Type Text, Press & Click"; } }
        public static string RecordIdleButton { get { return IsVietnamese ? "Ghi thao tác" : "Record"; } }
        public static string RecordActiveTitle(int count)
        {
            return IsVietnamese ? string.Format("Đang ghi · {0} bước", count) : string.Format("Recording · {0} steps", count);
        }
        public static string RecordActiveSub { get { return IsVietnamese ? "Bấm F6 hoặc bấm vào khung này để dừng ghi" : "Press F6 or click this box to stop recording"; } }
        public static string RecordActiveButton { get { return IsVietnamese ? "Dừng ghi (F6)" : "Stop (F6)"; } }

        // Time units: short names show in the closed dropdown, full names in its list
        public static string TimeUnitShortMs { get { return "ms"; } }
        public static string TimeUnitShortSec { get { return IsVietnamese ? "g" : "s"; } }
        public static string TimeUnitShortMin { get { return IsVietnamese ? "p" : "m"; } }
        public static string TimeUnitNameMs { get { return IsVietnamese ? "Mili giây" : "Milliseconds"; } }
        public static string TimeUnitNameSec { get { return IsVietnamese ? "Giây" : "Seconds"; } }
        public static string TimeUnitNameMin { get { return IsVietnamese ? "Phút" : "Minutes"; } }

        // ========================================================
        // 15. TABLE HEADER COLUMNS
        // ========================================================
        public static string ColNo { get { return "No."; } }
        public static string ColCheck { get { return "✔"; } }
        public static string ColWin { get { return "Win"; } }
        public static string ColActionType { get { return IsVietnamese ? "Loại Hành Động" : "Action Type"; } }
        public static string ColTarget { get { return IsVietnamese ? "Mục Tiêu/Cài Đặt" : "Target/Setting"; } }
        public static string ColHold { get { return IsVietnamese ? "Giữ" : "Hold"; } }
        public static string ColDelay { get { return IsVietnamese ? "Chờ" : "Delay"; } }
        public static string ColRep { get { return IsVietnamese ? "Lặp" : "Rep"; } }
        public static string ColDel { get { return IsVietnamese ? "Xóa" : "Del"; } }
        public static string ColNote { get { return IsVietnamese ? "Ghi Chú" : "Note"; } }

        // ========================================================
        // 16. SCRIPT TABS (DELETE GUARDS & IN-USE MARKER)
        // ========================================================
        public static string TabInUseSuffix { get { return IsVietnamese ? " (Đang dùng)" : " (In use)"; } }
        public static string TabMenuRename { get { return IsVietnamese ? "Đổi tên Script" : "Rename Script"; } }
        public static string TabMenuDuplicate { get { return IsVietnamese ? "Nhân bản Script" : "Duplicate Script"; } }
        public static string TabMenuDelete { get { return IsVietnamese ? "Xóa Script" : "Delete Script"; } }

        public static string DeleteScriptRunningTitle { get { return IsVietnamese ? "Script đang chạy" : "Script Is Running"; } }
        public static string DeleteScriptRunningMsg(string name)
        {
            return IsVietnamese
                ? string.Format("'{0}' đang chạy. Hãy dừng script trước khi xóa (F7 dừng tất cả).", name)
                : string.Format("'{0}' is running. Stop it before deleting (F7 stops all tasks).", name);
        }

        public static string DeleteScriptInUseTitle { get { return IsVietnamese ? "Script đang được dùng" : "Script Is In Use"; } }
        public static string DeleteScriptInUseMsg(string name, string callers)
        {
            return IsVietnamese
                ? string.Format("'{0}' đang được gọi bởi bước Gọi Script trong: {1}.\nCác bước đó sẽ không làm gì nữa sau khi xóa.\n\nVẫn xóa?", name, callers)
                : string.Format("'{0}' is used by RunScript in: {1}.\nThose steps will do nothing after it is deleted.\n\nDelete anyway?", name, callers);
        }

        public static string DeleteScriptConfirmTitle { get { return IsVietnamese ? "Xác nhận xóa script" : "Confirm Delete Script"; } }
        public static string DeleteScriptConfirmMsg(string name)
        {
            return IsVietnamese
                ? string.Format("Bạn có chắc muốn xóa '{0}'?", name)
                : string.Format("Are you sure you want to delete '{0}'?", name);
        }

        // ========================================================
        // POPUPS, FILES AND MESSAGES
        // ========================================================
        public static string StatusRecordingStopped { get { return IsVietnamese ? "Đã dừng ghi bước (F6)" : "Recording stopped (F6)"; } }
        public static string BtnStopRun { get { return IsVietnamese ? "Dừng" : "Stop"; } }
        public static string BtnStopRunHint { get { return IsVietnamese ? "(F6 để dừng)" : "(F6 to stop)"; } }
        public static string TipStopActiveTab { get { return IsVietnamese ? "Dừng tab đang hoạt động (F6)" : "Stop active tab (F6)"; } }
        public static string TipAddPointsOrSteps { get { return IsVietnamese ? "Vui lòng thêm tọa độ hoặc bước để bắt đầu" : "Please add points or steps to start"; } }
        public static string TipNoPoints { get { return IsVietnamese ? "Chưa có tọa độ. Vui lòng thêm ít nhất 1 tọa độ để bắt đầu (Nhấn Space để lấy tọa độ)" : "No points set. Please add at least 1 point to start (Press Space to capture point)"; } }
        public static string TipNoSteps { get { return IsVietnamese ? "Chưa có bước hợp lệ. Vui lòng thêm ít nhất 1 bước để bắt đầu (Bấm + Thêm bước)" : "No active steps. Please add at least 1 step to start (Click + Add Step)"; } }
        public static string TipSwitchTab { get { return IsVietnamese ? "Chuyển sang tab Cơ bản hoặc Nâng cao để bắt đầu" : "Switch to Simple or Asian Mode to start"; } }
        public static string TipStartActiveTab { get { return IsVietnamese ? "Bắt đầu tab đang hoạt động (F6)" : "Start active tab (F6)"; } }
        public static string ModeFreeMouse { get { return IsVietnamese ? "Chuột tự do" : "Free Mouse"; } }
        public static string ModeFixedCoordinates { get { return IsVietnamese ? "Tọa độ cố định" : "Fixed Coordinates"; } }
        public static string StepIfFound { get { return IsVietnamese ? "Nếu Thấy:" : "If Found:"; } }
        public static string StepIfMissing { get { return IsVietnamese ? "Nếu Thiếu:" : "If Missing:"; } }
        public static string BatchHoldSelected(int count) { return string.Format(IsVietnamese ? "Cài đặt hàng loạt Thời gian Giữ ({0} bước đã chọn)" : "Batch Set Hold Duration ({0} Selected Steps)", count); }
        public static string BatchDelaySelected(int count) { return string.Format(IsVietnamese ? "Cài đặt hàng loạt Thời gian Chờ ({0} bước đã chọn)" : "Batch Set Delay Duration ({0} Selected Steps)", count); }
        public static string BatchRepeatSelected(int count) { return string.Format(IsVietnamese ? "Cài đặt hàng loạt Số lần Lặp ({0} bước đã chọn)" : "Batch Set Repeat Count ({0} Selected Steps)", count); }
        public static string BatchDeleteAllConfirm(int count) { return string.Format(IsVietnamese ? "Bạn có chắc chắn muốn xóa TẤT CẢ {0} bước trong script này không?" : "Are you sure you want to delete ALL {0} steps in this script?", count); }
        public static string BatchDeleteSelectedConfirm(int count) { return string.Format(IsVietnamese ? "Bạn có chắc chắn muốn xóa {0} bước đã chọn không?" : "Are you sure you want to delete {0} selected step(s)?", count); }
        public static string BatchNoteSelected(int count) { return string.Format(IsVietnamese ? "Cài đặt hàng loạt Ghi chú ({0} bước đã chọn)" : "Batch Set Note ({0} Selected Steps)", count); }
        public static string BatchHoldAll { get { return IsVietnamese ? "Cài đặt hàng loạt Thời gian Giữ (Tất cả bước)" : "Batch Set Hold Duration (All Steps)"; } }
        public static string BatchDelayAll { get { return IsVietnamese ? "Cài đặt hàng loạt Thời gian Chờ (Tất cả bước)" : "Batch Set Delay Duration (All Steps)"; } }
        public static string BatchRepeatAll { get { return IsVietnamese ? "Cài đặt hàng loạt Số lần Lặp (Tất cả bước)" : "Batch Set Repeat Count (All Steps)"; } }
        public static string BatchDeleteTitle { get { return IsVietnamese ? "Xóa hàng loạt Bước" : "Batch Delete Steps"; } }
        public static string BatchNoteAll { get { return IsVietnamese ? "Cài đặt hàng loạt Ghi chú (Tất cả bước)" : "Batch Set Note (All Steps)"; } }
        public static string DialogApplyAll { get { return IsVietnamese ? "Áp dụng" : "Apply All"; } }
        public static string DialogCancel { get { return IsVietnamese ? "Hủy" : "Cancel"; } }
        public static string ImageDialogTitle { get { return IsVietnamese ? "Tùy chọn Hình ảnh Mẫu" : "Template Image Options"; } }
        public static string ImageNone { get { return IsVietnamese ? "Chưa có hình ảnh" : "No image selected"; } }
        public static string ImageCapture { get { return IsVietnamese ? "Chụp từ màn hình" : "Capture from Screen"; } }
        public static string ImageImport { get { return IsVietnamese ? "Tải ảnh từ file..." : "Import from File..."; } }
        public static string ImageImportTitle { get { return IsVietnamese ? "Tải ảnh mẫu" : "Import Template Image"; } }
        public static string ImageExport { get { return IsVietnamese ? "Lưu ảnh ra file..." : "Export to File..."; } }
        public static string ImageExportTitle { get { return IsVietnamese ? "Lưu ảnh mẫu" : "Export Template Image"; } }
        public static string ImageClear { get { return IsVietnamese ? "Xóa ảnh mẫu" : "Clear Template Image"; } }
        public static string ImageSimilarity { get { return IsVietnamese ? "Độ khớp ảnh (Similarity 50..100%):" : "Similarity (50..100%):"; } }
        public static string DialogApply { get { return IsVietnamese ? "Áp dụng" : "Apply"; } }
        public static string ImagePreviewFormat { get { return IsVietnamese ? "Xem trước ảnh ({0} x {1} px)" : "Image Preview ({0} x {1} px)"; } }
        public static string TipMapOpacity { get { return IsVietnamese ? "Độ mờ của Map (bấm để đổi, hoặc chuột phải vào Hiện Map)" : "Overlay Map Opacity (Click to change, or Right-click Show Map)"; } }
        public static string StatusCannotStart(string reason) { return (IsVietnamese ? "Chưa chạy được: " : "Cannot start: ") + reason; }
        public static string HeaderFollowCursorMode { get { return IsVietnamese ? "Chế độ Theo Chuột" : "Follow Cursor Mode"; } }
        public static string LblSimilarityShort { get { return IsVietnamese ? "Giống:" : "Sim:"; } }
        public static string ImageImportMenu { get { return IsVietnamese ? "Tải ảnh từ file..." : "Import Image from File..."; } }
        public static string ImagePreviewMenu { get { return IsVietnamese ? "Xem kích thước gốc" : "Preview Full Size"; } }
        public static string ImageExportMenu { get { return IsVietnamese ? "Lưu ảnh ra file..." : "Export Image to File..."; } }
        public static string ImageImportErrorTitle { get { return IsVietnamese ? "Lỗi tải ảnh" : "Import Error"; } }
        public static string ImageExportErrorTitle { get { return IsVietnamese ? "Lỗi lưu ảnh" : "Export Error"; } }
        public static string ImageImportFailed(string error) { return (IsVietnamese ? "Không tải được file ảnh:\n" : "Failed to load image file:\n") + error; }
        public static string ImageExportFailed(string error) { return (IsVietnamese ? "Không lưu được file ảnh:\n" : "Failed to export image file:\n") + error; }
        public static string FileFilterImages { get { return IsVietnamese ? "File ảnh (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|Tất cả file (*.*)|*.*" : "Image Files (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|All Files (*.*)|*.*"; } }
        public static string FileFilterPng { get { return IsVietnamese ? "Ảnh PNG (*.png)|*.png|Tất cả file (*.*)|*.*" : "PNG Image (*.png)|*.png|All Files (*.*)|*.*"; } }
        public static string FileFilterScripts { get { return IsVietnamese ? "Script (*.json)|*.json|Tất cả file (*.*)|*.*" : "Macro Script (*.json)|*.json|All Files (*.*)|*.*"; } }
        public static string FileFilterText { get { return IsVietnamese ? "File văn bản (*.txt)|*.txt|Tất cả file (*.*)|*.*" : "Text Files (*.txt)|*.txt|All Files (*.*)|*.*"; } }
        public static string FileSaveScriptTitle { get { return IsVietnamese ? "Lưu Script" : "Save Macro Script"; } }
        public static string FileLoadScriptTitle { get { return IsVietnamese ? "Tải Script" : "Load Macro Script(s)"; } }
        public static string FileSavePointsTitle { get { return IsVietnamese ? "Lưu danh sách tọa độ" : "Save Coordinates List"; } }
        public static string FileLoadPointsTitle { get { return IsVietnamese ? "Tải danh sách tọa độ" : "Load Coordinates List"; } }
        public static string FileErrorSaveTitle { get { return IsVietnamese ? "Lỗi lưu file" : "Save Error"; } }
        public static string FileErrorLoadTitle { get { return IsVietnamese ? "Lỗi tải file" : "Load Error"; } }
        public static string FileNoticeTitle { get { return IsVietnamese ? "Thông báo" : "Notice"; } }
        public static string FileWarningTitle { get { return IsVietnamese ? "Cảnh báo" : "Warning"; } }
        public static string FileSuccessTitle { get { return IsVietnamese ? "Thành công" : "Success"; } }
        public static string FileSaveScriptFailed(string error) { return (IsVietnamese ? "Không lưu được script:\n" : "Failed to save macro script:\n") + error; }
        public static string FileLoadScriptFailed(string error) { return (IsVietnamese ? "Không tải được file script:\n" : "Failed to load macro file(s):\n") + error; }
        public static string FileNoValidScript { get { return IsVietnamese ? "Không tìm thấy script hợp lệ trong file đã chọn!" : "No valid macro script found in selected file(s)!"; } }
        public static string FileNoPointsToSave { get { return IsVietnamese ? "Danh sách tọa độ đang trống, không có gì để lưu!" : "Point list is empty. Nothing to save!"; } }
        public static string FilePointsSaved(int count) { return string.Format(IsVietnamese ? "Đã lưu {0} tọa độ!" : "Successfully saved {0} coordinates!", count); }
        public static string FilePointsLoaded(int count) { return string.Format(IsVietnamese ? "Đã tải {0} tọa độ!" : "Successfully loaded {0} coordinates!", count); }
        public static string FilePointsLoadedFromFiles(int count, int files) { return string.Format(IsVietnamese ? "Đã tải {0} tọa độ từ {1} file!" : "Successfully loaded {0} coordinates from {1} files!", count, files); }
        public static string FileSavePointsFailed(string error) { return (IsVietnamese ? "Không lưu được tọa độ:\n" : "Failed to save coordinates:\n") + error; }
        public static string FileLoadPointsFailed(string error) { return (IsVietnamese ? "Không tải được file tọa độ:\n" : "Failed to load coordinates file(s):\n") + error; }
        public static string FileNoValidPoints { get { return IsVietnamese ? "Không tìm thấy tọa độ hợp lệ trong file đã chọn!" : "No valid coordinates found in selected file(s)!"; } }
        public static string TemplateNoneFound { get { return IsVietnamese ? "(Không có script mẫu)" : "(No templates found)"; } }
        public static string TemplateLoadFailed(string error) { return (IsVietnamese ? "Không tải được script mẫu:\n" : "Failed to load template:\n") + error; }
        public static string ErrorTitle { get { return IsVietnamese ? "Lỗi" : "Error"; } }
        public static string ColorDialogTitle { get { return IsVietnamese ? "Chọn màu mục tiêu" : "Select Target Color"; } }
        public static string ColorHexLabel { get { return IsVietnamese ? "Mã màu HEX:" : "HEX Color Code:"; } }
        public static string ColorToleranceLabel { get { return IsVietnamese ? "Độ lệch cho phép (± 0..255):" : "Tolerance (± 0..255):"; } }
        public static string ColorPaletteLabel { get { return IsVietnamese ? "Bảng màu nhanh:" : "Quick Palette:"; } }
        public static string ColorPickScreen { get { return IsVietnamese ? "Lấy từ màn hình" : "Pick from Screen"; } }
        public static string ColorWheel { get { return IsVietnamese ? "Bảng màu..." : "Color Wheel..."; } }
        public static string MoveDialogTitle { get { return IsVietnamese ? "Di chuyển & Co giãn điểm" : "Move & Scale Points"; } }
        public static string MoveAllSteps { get { return IsVietnamese ? "Tất cả bước" : "All Steps"; } }
        public static string MoveSelectedSteps(int count) { return string.Format(IsVietnamese ? "Đã chọn ({0})" : "Selected ({0})", count); }
        public static string MoveScaleLabel { get { return IsVietnamese ? "Co giãn (gốc 0,0):" : "Scale (Origin 0,0):"; } }
        public static string MoveStepLabel { get { return IsVietnamese ? "Bước di chuyển (px):" : "Move Step (px):"; } }
        public static string MoveClose { get { return IsVietnamese ? "Đóng" : "Close"; } }
        public static string MoveBounds(int minX, int maxX, int minY, int maxY) { return string.Format(IsVietnamese ? "Phạm vi: X:{0}..{1} | Y:{2}..{3}" : "Bounds: X:{0}..{1} | Y:{2}..{3}", minX, maxX, minY, maxY); }
        public static string MoveBoundsEmpty { get { return IsVietnamese ? "Phạm vi: Chưa có điểm" : "Bounds: No points"; } }
    }
}
