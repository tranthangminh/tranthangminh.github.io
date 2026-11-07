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
│   ├── UI_ModeTabBar.cs             # Thanh tab trên cùng: nút Info + bao nhiêu tab tùy ý trong một khung bo góc
│   ├── UI_ModernScrollBar.cs        # Thanh cuộn vẽ tay GDI+ mượt mà, đồng bộ Theme
│   ├── UI_ModernDialog.cs           # Khung popup dùng chung: chế độ chặn (ShowModal) và song song (ShowParallel)
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
│   ├── CommonIcons.cs               # Nơi duy nhất khai báo tên icon của Common
│   ├── AppLog.cs                    # Ghi lỗi vào error.log, không bao giờ ném lỗi, có giới hạn dung lượng
│   ├── ExternalLink.cs              # Mở trang web, báo cho người dùng nếu không mở được
│   ├── JobObjectHelper.cs           # Windows Job Object: tiến trình con tự tắt theo tiến trình cha
│   └── CommonNativeMethods.cs       # Win32 API thiết yếu (ReleaseCapture, SendMessage, WM_SETREDRAW, DWM Dark Mode)
│
└── Assets/                          # TÀI NGUYÊN VECTOR SVG DÙNG CHUNG
    ├── admin.svg                    # Icon Administrator
    ├── dark-mode.svg                # Icon Chế độ Tối
    ├── info.svg                     # Icon nút Info của ModeTabBar
    ├── light-mode.svg               # Icon Chế độ Sáng
    ├── logo-MAX.svg                 # Logo thương hiệu MAX
    ├── lang-EN.svg                  # Icon cờ tiếng Anh (Language English)
    ├── lang-VN.svg                  # Icon cờ tiếng Việt (Language Vietnamese)
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
| `ShowLanguageButton` | `bool` | `true` | Nút chuyển ngôn ngữ hiển thị icon vector cờ `[ lang-VN.svg ]` / `[ lang-EN.svg ]`. Click để chuyển đổi ngôn ngữ toàn app. |
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

#### 4.2.1. Cơ Chế Tự Động Co Giãn Thông Minh (Responsive Auto-Layout)
- `InfoTabPanel` được thiết kế tương thích với **bất kỳ kích thước Form nào**: từ cửa sổ nhỏ hẹp (`Width = 388` như Auto Clicker), cửa sổ rộng (`Width = 660` như Book Forge), đến khi phóng to toàn màn hình (Maximize).
- Thẻ Card bên trong tự động co giãn với lề chuẩn `padX = 16`, `padY = 8` (`Size = (Width - 32, Height - 16)`).
- Cả hai view Tiếng Anh (`InfoView_En`) và Tiếng Việt (`InfoView_Vi`) đều lắng nghe sự kiện `OnResize` và tự động tính toán căn giữa tuyệt đối `(this.Width - itemWidth) / 2` cho Logo MAX và nút Check for Updates.
- Khi chuyển tab hoặc resize Form từ bên ngoài, chỉ cần gọi `infoTab.UpdateLayout()`.

---

### 4.3. Thanh Tab Trên Cùng (`ModeTabBar`)

Nút Info và các tab chế độ nằm trong một khung bo góc. Tab số `0` luôn là Info, các tab chế độ là `1..n`. Tên tab do app truyền vào, Common không chứa chữ riêng của app.

```csharp
tabBar = new ModeTabBar { Size = new Size(388, 36) };
tabBar.SetTabs("Simple", "Asian Mode");   // Bao nhiêu tab cũng được; gọi lại khi đổi ngôn ngữ
tabBar.SetTabFixedWidth(1, 147);          // Tùy chọn; các tab còn lại chia đều phần dư
tabBar.OnTabSelected += SwitchTab;        // App tự đổi panel theo số tab
tabBar.SelectedIndex = 1;                 // Đổi tab từ code, không phát OnTabSelected
tabBar.ApplyTheme(theme);
tabBar.GetTabButton(2).Paint += ...;      // Gắn hiệu ứng hoặc tooltip riêng của app
```

| Thuộc tính | Kiểu | Mặc định | Ý nghĩa & Hành vi |
| :--- | :---: | :---: | :--- |
| `ShowInfoButton` | `bool` | `true` | Ẩn nút Info thì khung tab tự dồn sát mép trái. |

---

### 4.4. Thiết Lập Ứng Dụng (`AppInfo`)

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
- Hộp thoại thông báo tối/sáng hiện đại, dựng trên `ModernDialog`. Dùng thay cho `MessageBox` của Windows. `owner` là form hoặc control bất kỳ nằm trên form đó:
```csharp
ModernMessageBox.Show("Thao tác đã hoàn tất thành công!", "Thông Báo", MessageBoxButtons.OK, MessageBoxIcon.Information, this);
```
- Chỉ giữ `MessageBox` của Windows cho lỗi lúc khởi động trong `Program.cs`, khi giao diện có thể chưa dùng được.

### 7.1. `ModernDialog` (Khung popup dùng chung)
- **Popup mới bắt buộc kế thừa class này**, không tự chép thanh tiêu đề, viền hay Esc. Khung lo: thanh tiêu đề `CustomTitleBar` (kéo được, nút X), viền và bo góc, Esc/Enter, thân popup tự cuộn khi quá cao, thanh nút tự co theo chữ, đổi theme và ngôn ngữ.
- Popup chỉ thêm control vào `Body` (tọa độ tính từ 0,0), gọi `SetBodySize` và `AddButton`:
```csharp
public class AskNameDialog : ModernDialog
{
    public string ResultName { get; private set; }

    public AskNameDialog(ThemeTokens theme) : base("Name", theme)
    {
        TextBox input = new TextBox { Location = new Point(16, 12), Width = 248 };
        Body.Controls.Add(input);

        // Nút xếp từ trái sang phải; beforeClose chạy trước khi popup đóng
        this.AcceptButton = AddButton("Apply", DialogResult.OK, true, () => { ResultName = input.Text; });
        this.CancelButton = AddButton("Cancel", DialogResult.Cancel, false);

        SetBodySize(280, 48);
        this.Shown += (s, e) => input.Focus(); // Popup nhập liệu tự chuyển focus; mặc định focus vào AcceptButton
    }
}
```
- **Người gọi chọn cách mở:**

| Cách mở | Main window | Dùng khi |
| :--- | :--- | :--- |
| `dialog.ShowModal(owner)` | Khóa đến khi xử lý xong popup. Bấm vào main thì popup nhảy lên trước và viền nháy. | Mặc định. Cần câu trả lời ngay rồi mới làm tiếp. |
| `ModernDialog.ShowParallel(owner, () => new MyDialog())` | Vẫn dùng bình thường. Popup nổi trên main, thu nhỏ và tắt theo main, tự dispose khi đóng. | Hai bên cùng thao tác. |

```csharp
// Chặn
using (AskNameDialog dialog = new AskNameDialog(theme))
{
    if (dialog.ShowModal(this) == DialogResult.OK) Rename(dialog.ResultName);
}

// Song song: mỗi loại chỉ mở một cái, gọi lại thì cái đang mở nhảy lên trước
ToolDialog tool = ModernDialog.ShowParallel(this, () => new ToolDialog(theme));
```
- **Lưu ý cho popup song song:** kết quả trả về qua event (`FormClosed`, `DialogResult`), không `using`. Main vẫn đổi được dữ liệu trong lúc popup mở, nên popup không được giữ dữ liệu cũ của tab hay script đã đổi. Override `ApplyTheme` và `ApplyLanguage` để nội dung đổi theo app.
- **Phím tắt toàn cục:** dùng `WindowHelper.IsBlockedByDialog(form)` để biết có popup đang khóa cửa sổ không. `Control.Enabled` không dùng được cho việc này.
- `ThemeTokens.Current` là nguồn theme chung của popup: app phải gán lại khi đổi theme, `ModernDialog` tự nhận qua `ThemeTokens.OnThemeChanged`.
- **Không dùng khung này cho:** lớp phủ toàn màn hình như `CoordinatePicker`, popup bám theo ô đang sửa, tự đóng khi mất focus, và cửa sổ kéo giãn được.

### 7.2. `AppLog` và `ExternalLink`
- `AppLog.Error(context, ex)` ghi lỗi vào `error.log` cạnh app, hoặc vào LocalAppData nếu thư mục app không cho ghi. File tự xóa khi quá 1 MB.
- `AppLog.Caught(ex)` dùng trong `catch` xử lý xong rồi chạy tiếp. Mỗi vị trí chỉ ghi vài lần nên an toàn trong vòng lặp. Không để `catch` rỗng: lỗi đã biết trước thì ghi lý do trong khối `catch`, còn lại thì gọi hàm này.
- `ExternalLink.Open(url, owner)` mở trang web và báo cho người dùng nếu không mở được.

### 8. `FirstRunLanguageDialog`
- Hộp thoại chào mừng lần đầu mở ứng dụng với 2 thẻ cờ vector 100x100 sắc nét, bo góc và nhãn chữ "English" / "Tiếng Việt" trực quan bên dưới:
```csharp
using (FirstRunLanguageDialog dlg = new FirstRunLanguageDialog())
{
    if (dlg.ShowDialog(this) == DialogResult.OK)
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

**Tên icon:** code trong `Common` gọi icon qua `CommonIcons` (ví dụ `CommonIcons.Admin`), không ghi tên file `.svg`. Thêm icon mới thì thả file vào `Assets/` và thêm 1 dòng vào `CommonIcons.cs`. Icon riêng của từng app khai báo ở app đó (Auto Clicker: `AppIcons` trong `UI_AppIcons.cs`).
