# HƯỚNG DẪN SỬ DỤNG THƯ VIỆN DÙNG CHUNG (MAXAPP.COMMON FRAMEWORK)
> **Tác giả:** Trần Thắng Minh (Max)  
> **Dành cho:** Tất cả các dự án Windows Forms Portable (.NET 4.x / C#) của Max.

---

## 1. NGUYÊN TẮC VÀNG (THE GOLDEN RULE)

> [!IMPORTANT]
> **THƯ MỤC `Common/` LÀ BẤT BIẾN TUYỆT ĐỐI (READ-ONLY / ZERO-MODIFICATION).**
> - Khi copy thư mục `Common/` sang bất kỳ dự án nào (ví dụ `Book Forge by Max` hay các app sau này), **tuyệt đối KHÔNG ĐƯỢC CHỈNH SỬA, THÊM BỚT HAY XÓA BẤT KỲ DÒNG CODE NÀO BÊN TRONG `Common/`**.
> - **Mọi tính năng, nút bấm, thành phần giao diện đều đã được viết sẵn 100% trong `Common`**.
> - Nếu một ứng dụng không cần dùng nút nào hoặc tính năng nào, **chỉ cần tắt nó từ bên ngoài** (thông qua các thuộc tính tại `MainForm.cs` hoặc `Program.cs`). Thanh tiêu đề và các panel sẽ tự động dồn vị trí (Dynamic Auto-Layout) mà không để lại khoảng trống thừa.

---

## 2. CẤU TRÚC THƯ MỤC & Ý NGHĨA TỪNG FILE

```text
Common/
│
├── COMMON_GUIDE.md                  # Tài liệu hướng dẫn này (đọc là hiểu ngay cách dùng)
│
├── Theme/                           # HỆ THỐNG GIAO DIỆN & MÀU SẮC
│   └── UI_Theme.cs                  # Bảng màu chuẩn MAX (Dark/Light), Typography Scale khóa pixel, ModernMenuRenderer
│
├── Controls/                        # BỘ ĐIỀU KHIỂN GIAO DIỆN HIỆN ĐẠI
│   ├── UI_CustomTitleBar.cs         # Thanh tiêu đề không viền (Close, Max, Min, Lang, Theme, Admin, Drag, DoubleClick Max)
│   ├── UI_CustomControls.cs         # RoundedButton, ModernButton, ModernCard, ModernTextBox, NumberInput, ModernDropdown...
│   ├── UI_ModernScrollBar.cs        # Thanh cuộn vẽ tay GDI+ mượt mà, đồng bộ Theme
│   ├── UI_ModernMessageBox.cs       # Hộp thoại thông báo phẳng tối/sáng thay thế MessageBox cũ
│   └── UI_FirstRunLanguageDialog.cs # Hộp thoại chọn ngôn ngữ lần đầu mở app (English / Tiếng Việt)
│
├── Info/                            # TAB THÔNG TIN BẢN QUYỀN & ỦNG HỘ
│   ├── UI_InfoTabPanel.cs           # Container Tab Info "cắm là chạy", tự động đổi theo Theme & Ngôn ngữ
│   ├── UI_InfoView_En.cs            # Giao diện thông tin Tiếng Anh (Logo MAX, Ko-fi, Check Updates)
│   ├── UI_InfoView_Vi.cs            # Giao diện thông tin Tiếng Việt (Logo MAX, QR Vietcombank, Quán Bún Giò Heo)
│   └── UI_QrModal.cs                # Cửa sổ hộp thoại modal quét mã QR Vietcombank
│
├── Core/                            # CÁC TIỆN ÍCH NỀN TẢNG CỐT LÕI
│   ├── AppInfo.cs                   # Single Source of Truth cho Tên app, Phiên bản, Title, Website Slug
│   ├── UacHelper.cs                 # Kiểm tra quyền Admin (UAC) và khởi động lại với quyền Administrator
│   ├── Loc.cs                       # Động cơ đa ngôn ngữ (EN / VI) và các chuỗi text dùng chung
│   ├── UpdateChecker.cs             # Kiểm tra bản cập nhật từ xa qua HTTPS TLS 1.2 (Zero UI Freeze)
│   ├── GraphicsHelper.cs            # Toán học & hình học GDI+ (bo góc, fill, outline, anti-aliasing)
│   ├── SvgFileRenderer.cs           # Bộ vẽ vector SVG ra Bitmap GDI+ siêu nét, hỗ trợ đổi màu (tint)
│   ├── BuiltInSvgAssets.cs          # Chuỗi vector SVG nhúng sẵn (Zero-Resource Fallback, không sợ thiếu file)
│   └── CommonNativeMethods.cs       # Win32 API thiết yếu (ReleaseCapture, SendMessage, WM_SETREDRAW, DWM Dark Mode)
│
└── Assets/                          # TÀI NGUYÊN VECTOR SVG DÙNG CHUNG
    ├── admin.svg                    # Icon Administrator
    ├── dark-mode.svg                # Icon Chế độ Tối
    ├── light-mode.svg               # Icon Chế độ Sáng
    ├── logo-MAX.svg                 # Logo thương hiệu MAX
    └── QR_Vietcombank.svg           # Mã QR thanh toán Vietcombank
```

---

## 3. HƯỚNG DẪN TÍCH HỢP 3 BƯỚC (QUICK START - 3 MINUTES)

### Bước 1: Copy thư mục `Common/`
Copy nguyên vẹn thư mục `Common/` vào thư mục mã nguồn của ứng dụng mới:
`src_TenUngDung/Common/`

### Bước 2: Khai báo namespace
Trong bất kỳ file nào muốn dùng các thành phần giao diện, chỉ cần thêm 1 dòng:
```csharp
using MaxApp.Common;
```

### Bước 3: Gắn Thanh tiêu đề & Tab Info vào `MainForm.cs`
```csharp
using System.Windows.Forms;
using MaxApp.Common;

public class MainForm : Form
{
    private CustomTitleBar titleBar;
    private InfoTabPanel infoTab;

    public MainForm()
    {
        InitializeComponent();

        // 1. Khởi tạo & Gắn thanh tiêu đề dùng chung (Tự động căn lề 8px/16px & bo góc Native Windows 11)
        titleBar = new CustomTitleBar(this);
        titleBar.AttachToForm(this); // Cách đỉnh 8px, lề trái/phải 16px, tự động bo tròn cửa sổ GPU siêu mượt!
        
        // Cấu hình tính năng từ bên ngoài (TÙY THEO NHU CẦU CỦA APP):
        titleBar.ShowMaximizeButton = true;   // Bật nút Maximize (nếu form cho phép phóng to)
        titleBar.ShowAdminButton = false;      // Tắt nút Admin (nếu app không cần can thiệp quyền Admin)

        // 2. Gắn Tab Info vào container nội dung
        infoTab = new InfoTabPanel();
        // infoTab.ShowBunGioHeo = false;     // Tùy chọn: tắt thông tin quán nếu không cần
        pnlInfoContainer.Controls.Add(infoTab);
    }
}
```

---

## 4. BẢNG TRA CỨU CÁC CỜ BẬT/TẮT NGOẠI VI (FEATURE TOGGLES CHEAT SHEET)

### 4.1. Thanh Tiêu Đề (`CustomTitleBar`)

Mọi nút bấm đều có sẵn, được điều khiển qua các property sau:

| Thuộc tính | Kiểu | Mặc định | Ý nghĩa & Hành vi |
| :--- | :---: | :---: | :--- |
| `ShowCloseButton` | `bool` | `true` | Nút đóng cửa sổ `[ X ]`. Hover đổi màu đỏ, click đóng form. |
| `ShowMaximizeButton` | `bool` | `false` | Nút phóng to `[ 🗖 / 🗗 ]`. Click hoặc nhấp đúp tiêu đề để phóng to/khôi phục. *(Book Forge bật `true`, Auto Clicker tắt `false`)* |
| `ShowMinimizeButton` | `bool` | `true` | Nút thu nhỏ `[ ─ ]`. Thu nhỏ cửa sổ xuống Taskbar. |
| `ShowLanguageButton` | `bool` | `true` | Nút chuyển ngôn ngữ `[ EN ] / [ VI ]`. Tự động đảo ngôn ngữ toàn app. |
| `ShowThemeButton` | `bool` | `true` | Nút đổi theme `[ ☀️ / 🌙 ]`. Phát sự kiện `OnThemeToggleRequested`. |
| `ShowAdminButton` | `bool` | `true` | Nút Administrator `[ admin.svg ]`. Highlight màu vàng hổ phách khi đang là Admin; click hỏi xác nhận nâng quyền. |
| `ShowAppIcon` | `bool` | `true` | Hiển thị icon vector ứng dụng ở góc trái tiêu đề. |
| `TitleText` | `string` | `AppInfo.Title` | Chuỗi văn bản hiển thị trên thanh tiêu đề. |
| `IsRunning` | `bool` | `false` | Khóa nút Close (mờ đi) khi ứng dụng đang chạy tác vụ nền (chống bấm tắt nhầm). |

> [!TIP]
> **Thuật toán Dồn Vị Trí Tự Động (Auto-Layout):**  
> Khi bạn set bất kỳ cờ nào thành `false`, nút đó sẽ biến mất hoàn toàn và các nút bên cạnh tự động dồn sát mép phải. Không bao giờ bị khoảng hở xấu xí!

---

### 4.2. Tab Thông Tin Bản Quyền (`InfoTabPanel`)

| Thuộc tính | Kiểu | Mặc định | Ý nghĩa & Hành vi |
| :--- | :---: | :---: | :--- |
| `ShowDonationQr` | `bool` | `true` | Cụm nút `[Quét mã QR Ngân Hàng ↗]` mở modal QR Vietcombank ở View Tiếng Việt. |
| `ShowBunGioHeo` | `bool` | `true` | Cụm thông tin Quán Bún Giò Heo Minh Nhật ở View Tiếng Việt. |
| `ShowKoFi` | `bool` | `true` | Link ủng hộ qua Ko-fi ở View Tiếng Anh. |
| `ShowCheckUpdates`| `bool` | `true` | Nút bấm "Check for Updates" / "Kiểm tra Cập nhật". |
| `ShowLanguageSelector` | `bool` | `true` | Cụm nút chọn ngôn ngữ EN/VI ở cuối tab Info. |

#### 4.2.1. Cơ Chế Tự Động Co Giãn Thông Minh (Responsive Auto-Layout)
- `InfoTabPanel` được thiết kế tương thích với **bất kỳ kích thước Form nào**: từ cửa sổ nhỏ hẹp (`Width = 388` như Auto Clicker), cửa sổ rộng (`Width = 660` như Book Forge), đến khi phóng to toàn màn hình (Maximize).
- Thẻ Card bên trong tự động co giãn với lề chuẩn `padX = 16`, `padY = 8` (`Size = (Width - 32, Height - 16)`).
- Cả hai view Tiếng Anh (`InfoView_En`) và Tiếng Việt (`InfoView_Vi`) đều lắng nghe sự kiện `OnResize` và tự động tính toán căn giữa tuyệt đối `(this.Width - itemWidth) / 2` cho Logo MAX, nút Check for Updates, và cụm Language Selector.
- Khi chuyển tab hoặc resize Form từ bên ngoài, chỉ cần gọi `infoTab.UpdateLayout()`.

---

### 4.3. Thiết Lập Ứng Dụng (`AppInfo`)

`AppInfo` tự động đọc tên và version từ `[assembly: AssemblyProduct]` và `[assembly: AssemblyVersion]`.  
Nếu muốn cấu hình thủ công trong `Program.cs`, chỉ cần gọi 1 dòng:
```csharp
AppInfo.Init(
    appName: "Book Forge by Max",
    version: "1.0 (Beta)",
    websiteSlug: "book-forge.html",
    latestVersionMetaTag: "book-forge-latest-version"
);
```

---

## 5. BỘ ĐIỀU KHIỂN GIAO DIỆN (CUSTOM CONTROLS CATALOG)

Toàn bộ các control dưới đây nằm trong namespace `MaxApp.Common` và đã sẵn sàng sử dụng:

### 1. `RoundedButton` & `ModernButton`
- Nút bấm bo góc phẳng, hỗ trợ Dark/Light Theme.
- Hỗ trợ icon vector SVG / Bitmap, badge số đếm, loading animation.
- Hỗ trợ các thuộc tính tương thích Book Forge: `IsPrimary = true`, `IsDanger = true`, `BorderRadius = 6`.

### 2. `RoundedPanel` & `ModernCard`
- Container bo góc mềm mại, chống nháy hình (Double Buffered).
- `ModernCard`: Preset thẻ chứa nội dung chuẩn MAX với padding 14px và viền tinh tế.

### 3. `ModernTextBox`, `NumberInput`, `ModernTextArea`
- `ModernTextBox`: Hộp nhập văn bản phẳng bo tròn, viền sáng màu `AccentPrimary` khi focus, hỗ trợ placeholder mờ và menu chuột phải chuẩn theme.
- `NumberInput`: Hộp nhập số an toàn, chặn hoàn toàn ký tự lạ, giới hạn `Minimum` - `Maximum`, hỗ trợ lăn chuột hoặc phím mũi tên Lên/Xuống để tăng giảm.
- `ModernTextArea`: Hộp nhập văn bản nhiều dòng, kết nối mượt mà với `ModernScrollBar`.

### 4. `ModernDropdown` & `NoScrollComboBox`
- `NoScrollComboBox`: ComboBox chuẩn nhưng triệt tiêu sự kiện cuộn chuột vô ý khi người dùng đang lướt trang.
- `ModernDropdown`: Dropdown tùy chỉnh 100% vẽ GDI+, popup xổ xuống phẳng bo góc, chống giật nhấp nháy.

### 5. `ModernScrollBar`
- Thanh cuộn vẽ tay GDI+ thay thế thanh cuộn xám xấu xí của Windows.
- Tự động đổi màu theo ThemeTokens sáng/tối.

### 6. `ModernProgressBar`
- Thanh tiến trình phẳng bo tròn mềm mại, dải màu gradient mượt mà hiển thị phần trăm `%` và text trạng thái tùy biến.

### 7. `ModernMessageBox`
- Hộp thoại thông báo tối/sáng hiện đại:
```csharp
ModernMessageBox.Show("Thao tác đã hoàn tất thành công!", "Thông Báo", MessageBoxButtons.OK, MessageBoxIcon.Information, this);
```

### 8. `FirstRunLanguageDialog`
- Hộp thoại chào mừng lần đầu mở ứng dụng, mời người dùng chọn Tiếng Anh hoặc Tiếng Việt:
```csharp
using (FirstRunLanguageDialog dlg = new FirstRunLanguageDialog())
{
    if (dlg.ShowDialog() == DialogResult.OK)
    {
        Loc.CurrentLanguage = dlg.SelectedLanguage;
    }
}
```

---

## 6. HỆ THỐNG MÀU SẮC & TYPOGRAPHY SCALE (PIXEL-LOCKED)

### 6.1. Bảng Màu ThemeTokens
Truy cập qua `ThemeTokens.Current` hoặc khởi tạo qua `ThemeTokens.DarkTheme()` / `ThemeTokens.LightTheme()`:
- Nền: `BgPrimary` (#191919), `BgSecondary` (#222222), `BgTertiary` (#343434), `BgElevated` (#464646).
- Chữ: `TextPrimary` (#ffffff), `TextSecondary` (#bbbbbb), `TextTertiary` (#888888).
- Điểm nhấn: `AccentPrimary` (#196ebf), `AccentPrimaryHover` (#38f9ff), `AccentSecondary` (#b19ffb).
- Trạng thái: `Success` (#34d399), `Danger` (#ef4444), `Warning` (#e5c158).

### 6.2. Thang Đo Cỡ Chữ (Khóa Cứng Pixel - Miễn Nhiễm DPI Scaling)
Để chữ không bao giờ bị vỡ layout khi người dùng chỉnh DPI Windows 100%, 125%, 150%:
```csharp
ThemeTokens.FontMicro()     // 9.5px  - Badge, chip nhỏ, gợi ý
ThemeTokens.FontSmall()     // 10.5px - Chú thích, đơn vị tính
ThemeTokens.FontBase()      // 11.5px - Nhãn form, văn bản chính
ThemeTokens.FontButton()    // 12.5px - Nút bấm chính
ThemeTokens.FontCard()      // 14.0px - Tiêu đề nhóm, card header
ThemeTokens.FontTitle()     // 16.0px - Tiêu đề cửa sổ ứng dụng
ThemeTokens.GetMonospaceFont(12f) // Font code Consolas/Menlo khóa pixel
```

### 6.3. Thang Đo Bo Góc (Radius Tokens & Window Rounding)
```csharp
t.RadiusSm   // 4px  - Badge, chip nhỏ
t.RadiusMd   // 6px  - Nút bấm, input, card vừa
t.RadiusLg   // 10px - Modal, card lớn
t.FormRadius // 6px  - Chuẩn hóa bo góc cửa sổ Form (RadiusMd = 6px)
```

**Chuẩn Hóa Bo Góc Cửa Sổ Form (`WindowHelper`):**
- Mặc định sử dụng chế độ cân bằng `RoundSmall` của GPU DWM Windows 11 và fallback `FormRadius` (6px) trên Win32 GDI.
- Trong `OnPaint`: Sử dụng `WindowHelper.DrawWindowBorder(e.Graphics, this, t.BorderColor, t.FormRadius);` để viền bao quanh khớp chính xác 100% với đường cong bo góc, khử răng cưa mượt mà.

---

## 7. CƠ CHẾ DỰ PHÒNG VECTOR SVG (ZERO-RESOURCE FALLBACK)

Trong `BuiltInSvgAssets.cs`, toàn bộ mã vector XML của `logo-MAX.svg`, `admin.svg`, `dark-mode.svg`, `light-mode.svg` và `QR_Vietcombank.svg` đã được nhúng sẵn dưới dạng chuỗi C#.

**Lợi ích đột phá:**  
Dù file `build.bat` của dự án mới chưa được cấu hình dòng lệnh nhúng resource `/resource:*.svg`, **ứng dụng vẫn hiển thị 100% đầy đủ logo MAX, icon Dark/Light, icon Admin và mã QR Vietcombank** mà không bao giờ bị crash hay văng lỗi thiếu file!
