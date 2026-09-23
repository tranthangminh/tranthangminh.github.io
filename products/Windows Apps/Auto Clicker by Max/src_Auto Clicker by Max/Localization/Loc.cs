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
        private static AppLanguage _currentLanguage = AppLanguage.English;

        public static event Action OnLanguageChanged;

        public static AppLanguage CurrentLanguage
        {
            get { return _currentLanguage; }
            set
            {
                if (_currentLanguage != value)
                {
                    _currentLanguage = value;
                    if (OnLanguageChanged != null)
                    {
                        OnLanguageChanged();
                    }
                }
            }
        }

        public static bool IsVietnamese
        {
            get { return _currentLanguage == AppLanguage.Vietnamese; }
        }

        public static void SetLanguage(string langCode)
        {
            if (string.Equals(langCode, "vi", StringComparison.OrdinalIgnoreCase))
            {
                CurrentLanguage = AppLanguage.Vietnamese;
            }
            else
            {
                CurrentLanguage = AppLanguage.English;
            }
        }

        public static string CurrentLanguageCode
        {
            get { return _currentLanguage == AppLanguage.Vietnamese ? "vi" : "en"; }
        }

        // ========================================================
        // 1. MAIN TABS & TITLE BAR
        // ========================================================
        public static string TabSimple { get { return IsVietnamese ? "Cơ bản" : "Simple"; } }
        public static string TabAsianMode { get { return IsVietnamese ? "Chế độ Nâng cao" : "Asian Mode"; } }
        public static string LangBadge { get { return IsVietnamese ? "VI" : "EN"; } }
        public static string LangToggleTooltip { get { return IsVietnamese ? "Đổi sang Tiếng Anh (English)" : "Switch to Vietnamese (Tiếng Việt)"; } }

        // ========================================================
        // 2. CLICK MODE CARD
        // ========================================================
        public static string HeaderClickMode { get { return IsVietnamese ? "Chế độ Click" : "Click Mode"; } }
        public static string ModePointList { get { return IsVietnamese ? "Danh sách Tọa độ" : "Point List"; } }
        public static string ModeFollowCursor { get { return IsVietnamese ? "Bám theo Con trỏ" : "Follow Cursor"; } }

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
        public static string LabelClickEvery { get { return IsVietnamese ? "Khoảng cách:" : "Click Every:"; } }
        public static string UnitMs { get { return "ms"; } }
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
        public static string BtnTransformTool { get { return IsVietnamese ? "Di chuyển &\nCo giãn" : "Move &\nScale"; } }
        public static string StatusReady { get { return IsVietnamese ? "Sẵn sàng" : "Ready"; } }
        public static string StatusRunning { get { return IsVietnamese ? "Đang chạy..." : "Running..."; } }
        public static string StatusPaused { get { return IsVietnamese ? "Đang tạm dừng" : "Paused"; } }
        public static string StatusStopped { get { return IsVietnamese ? "Đã dừng" : "Stopped"; } }

        // ========================================================
        // 7. GLOBAL SETTINGS CHECKBOXES
        // ========================================================
        public static string ChkAlwaysOnTop { get { return IsVietnamese ? "Ghim lên đầu" : "Window on Top"; } }
        public static string ChkShowMap { get { return IsVietnamese ? "Hiện Overlay" : "Show Map"; } }
        public static string ChkFreeMouse { get { return IsVietnamese ? "Click ngầm (Tự do chuột)" : "Free Mouse Mode"; } }
        public static string ChkSmoothMove { get { return IsVietnamese ? "Di chuột mượt" : "Smooth Mouse Move"; } }

        // ========================================================
        // 8. HOTKEY CARDS
        // ========================================================
        public static string HotkeySimpleF6 { get { return IsVietnamese ? ": Bắt đầu / Tạm dừng" : ": Start / Stop (Active)"; } }
        public static string HotkeySimpleF7 { get { return IsVietnamese ? ": Dừng TẤT CẢ" : ": Stop ALL"; } }
        public static string HotkeySimpleSpace { get { return IsVietnamese ? ": Thêm tọa độ" : ": Add Point"; } }

        public static string HotkeyAdvF6 { get { return IsVietnamese ? ": Bắt đầu / Tạm dừng" : ": Start / Stop"; } }
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
        // 10. INFO TAB (Preserving Author Name with Diacritics)
        // ========================================================
        public static string InfoAuthor
        {
            get
            {
                return IsVietnamese
                    ? "Sản phẩm này được phát triển bởi Trần Thắng Minh (Max)."
                    : "This product is developed by Trần Thắng Minh (Max).";
            }
        }
        public static string InfoContact
        {
            get
            {
                return IsVietnamese
                    ? "Góp ý, yêu cầu tính năng hoặc hỗ trợ:"
                    : "For feedback, feature requests, or support:";
            }
        }
        public static string InfoFacebookTitle { get { return "• Facebook:"; } }
        public static string InfoMoreProductsTitle { get { return IsVietnamese ? "• Sản phẩm khác:" : "• More Products:"; } }
        public static string InfoSupportTitle { get { return IsVietnamese ? "• Ủng hộ tác giả:" : "• Support me:"; } }
        public static string InfoLanguageTitle { get { return IsVietnamese ? "• Ngôn ngữ:" : "• Language:"; } }
        public static string BtnCheckUpdates { get { return IsVietnamese ? "Kiểm tra cập nhật" : "Check for Updates"; } }
        public static string UpdateStatusHint { get { return IsVietnamese ? "Bấm nút phía trên để kiểm tra bản mới" : "Click above to check for updates"; } }
        public static string UpdateChecking { get { return IsVietnamese ? "Đang kiểm tra cập nhật..." : "Checking for updates..."; } }
        public static string UpdateLatest(string ver)
        {
            return IsVietnamese
                ? string.Format("Bạn đang dùng phiên bản mới nhất (v{0}).", ver)
                : string.Format("You have the latest version (v{0}).", ver);
        }
        public static string UpdateAvailable(string ver)
        {
            return IsVietnamese
                ? string.Format("Đã có phiên bản mới: v{0}!", ver)
                : string.Format("New version available: v{0}!", ver);
        }
        public static string UpdateFailed { get { return IsVietnamese ? "Kiểm tra thất bại. Không có kết nối mạng." : "Check failed. No internet connection."; } }

        // ========================================================
        // 11. ASIAN MODE (ADVANCED TAB) TOOLBAR & BOTTOM BAR
        // ========================================================
        public static string AdvBtnAddStep { get { return IsVietnamese ? "➕ Thêm bước" : "➕ Add Step"; } }
        public static string AdvBtnClone { get { return IsVietnamese ? "Nhân bản" : "Clone"; } }
        public static string AdvBtnSave { get { return IsVietnamese ? "Lưu" : "Save"; } }
        public static string AdvBtnLoad { get { return IsVietnamese ? "Tải" : "Load"; } }
        public static string AdvBtnClear { get { return IsVietnamese ? "Xóa hết" : "Clear"; } }
        public static string AdvBtnTemplate { get { return IsVietnamese ? "Mẫu" : "Template"; } }

        public static string AdvLblLoop { get { return IsVietnamese ? "Lặp:" : "Loop:"; } }
        public static string AdvLblJitter { get { return IsVietnamese ? "Độ lệch: ±" : "Jitter: ±"; } }
        public static string AdvLblInterval { get { return IsVietnamese ? "Khoảng cách: ±" : "Interval: ±"; } }

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
                    case Advanced.MacroActionType.TypeText: return "Type Text";
                    case Advanced.MacroActionType.Delay: return "Delay";
                    case Advanced.MacroActionType.WaitColor: return "Wait Color";
                    case Advanced.MacroActionType.IfColor: return "If Color";
                    case Advanced.MacroActionType.WaitImage: return "Wait Image";
                    case Advanced.MacroActionType.IfImage: return "If Image";
                    case Advanced.MacroActionType.WaitChange: return "Wait Change";
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
                    case Advanced.MacroActionType.TypeText: return "Gõ Văn Bản";
                    case Advanced.MacroActionType.Delay: return "Chờ Đợi";
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
        public static string JumpStop { get { return IsVietnamese ? "Dừng lại" : "Stop"; } }
        public static string JumpStepFormat(int stepIndex)
        {
            return IsVietnamese ? string.Format("Bước {0}", stepIndex) : string.Format("Step {0}", stepIndex);
        }

        public static string LblIfMatch { get { return IsVietnamese ? "Khớp:" : "Match:"; } }
        public static string LblIfUnmatch { get { return IsVietnamese ? "Không khớp:" : "Unmatch:"; } }

        // ========================================================
        // 14. TABLE HEADER COLUMNS
        // ========================================================
        public static string ColNo { get { return "No."; } }
        public static string ColCheck { get { return "✔"; } }
        public static string ColWin { get { return IsVietnamese ? "Cửa sổ" : "Win"; } }
        public static string ColActionType { get { return IsVietnamese ? "Loại Hành Động" : "Action Type"; } }
        public static string ColTarget { get { return IsVietnamese ? "Mục Tiêu" : "Target"; } }
        public static string ColHold { get { return IsVietnamese ? "Giữ (ms)" : "Hold"; } }
        public static string ColDelay { get { return IsVietnamese ? "Chờ (ms)" : "Delay"; } }
        public static string ColRep { get { return IsVietnamese ? "Lặp" : "Rep"; } }
        public static string ColDel { get { return IsVietnamese ? "Xóa" : "Del"; } }
        public static string ColNote { get { return IsVietnamese ? "Ghi Chú" : "Note"; } }

        // ========================================================
        // 15. UPDATE DIALOG
        // ========================================================
        public static string DialogUpdateTitle { get { return IsVietnamese ? "Có Bản Cập Nhật Mới" : "Update Available"; } }
        public static string DialogUpdateHeading { get { return IsVietnamese ? "Đã có phiên bản mới của Auto Clicker by Max!" : "A new version of Auto Clicker by Max is available!"; } }
        public static string DialogUpdateCurrent(string ver) { return IsVietnamese ? string.Format("Phiên bản hiện tại: v{0}", ver) : string.Format("Current version: v{0}", ver); }
        public static string DialogUpdateLatest(string ver) { return IsVietnamese ? string.Format("Phiên bản mới nhất: v{0}", ver) : string.Format("Latest version: v{0}", ver); }
        public static string DialogBtnUpdateNow { get { return IsVietnamese ? "Cập Nhật Ngay" : "Update Now"; } }
        public static string DialogBtnLater { get { return IsVietnamese ? "Để Sau" : "Later"; } }
    }
}
