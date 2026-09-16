# DỰ ÁN AUTO CLICKER BY MAX - QUY TẮC PHÁT TRIỂN & BẢO TOÀN HIỆU NĂNG

> **Mục đích:** File quy chuẩn kỹ thuật bắt buộc dành riêng cho dự án **Auto Clicker by Max**. Bất kỳ AI Agent hay lập trình viên nào can thiệp vào mã nguồn dự án này đều **bắt buộc phải đọc và tuân thủ tuyệt đối** các điều khoản bên dưới trước khi viết hoặc sửa đổi bất kỳ dòng code nào.

---

# 1. BẢN SẮC KIẾN TRÚC DỰ ÁN (ARCHITECTURE & STACK)

## 1.1 Ngôn Ngữ & Nền Tảng Kỹ Thuật
- **Công nghệ cốt lõi:** C# (.NET Framework 4.x / C# 5).
- **Giao diện:** Windows Forms (WinForms) thuần, vẽ tùy chỉnh (GDI+ Double Buffering, Owner Draw).
- **Biên dịch & Đóng gói:** Single-file Portable `.exe` (~350KB), không cần cài đặt, không dependencies bên ngoài, biên dịch thông qua `build.bat` bằng trình biên dịch tích hợp sẵn của Windows (`csc.exe`).
- **Giao tiếp Hệ điều hành:** Win32 P/Invoke API (`SendInput`, `PostMessage`, `SendMessage`, `FindWindowEx`, `GetPixel`, `RegisterHotKey`...).

## 1.2 Ranh Giới Ngôn Ngữ (English-First UI)
- **Giao diện 100% Tiếng Anh:** Toàn bộ văn bản hiển thị trên UI (Button, Label, Tooltip, Dialog, Placeholder, Menu, Log) đều phải là **Tiếng Anh chuẩn**. Tuyệt đối không hardcode tiếng Việt hay nửa Anh nửa Việt vào giao diện ứng dụng.
- **Khung Chat & Trao Đổi:** Sử dụng **Tiếng Việt** (xưng *"tao"* - gọi *"mày"*, thẳng thắn, trung thực, không né tránh sai sót kỹ thuật).

## 1.3 Quản Lý Phiên Bản & Tiêu Đề Duy Nhất (Single Source of Truth)
- **Tập trung hóa tuyệt đối:** Toàn bộ tiêu đề cửa sổ, tab thông tin (`InfoTab`), thanh tiêu đề tùy chỉnh (`CustomTitleBar`) và cơ chế phát hiện instance chạy ngầm (`Program.cs`) **bắt buộc phải gọi qua `AppInfo.Title` hoặc `AppInfo.Version`** (`Core_AppInfo.cs`).
- **Cấm hardcode chuỗi phiên bản:** Tuyệt đối không gán cứng các chuỗi dạng `"Auto Clicker by Max vX.X"` vào các file giao diện.
- **Nâng cấp phiên bản nhanh gọn:** Khi bump version ứng dụng, **chỉ sửa duy nhất tại `Properties/AssemblyInfo.cs`** (và `app.manifest`). Toàn bộ mã nguồn sẽ tự động phản ánh phiên bản mới 100%.

## 1.4 Kỷ Luật Kết Nối Mạng & Tự Động Cập Nhật (Network & Update Integrity)
- **Kích hoạt TLS 1.2:** Vì .NET Framework 4.0 mặc định dùng SSL 3.0 / TLS 1.0 (bị GitHub Pages từ chối kết nối), mọi tác vụ tải web HTTPS **bắt buộc phải kích hoạt TLS 1.2** bằng `ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072;`.
- **Hoàn toàn bất đồng bộ (Zero UI Freeze):** Kiểm tra cập nhật phải chạy 100% trên Background Thread (`ThreadPool.QueueUserWorkItem`), không bao giờ làm trễ chu kỳ khởi động của Form.
- **Giới hạn tần suất kiểm tra ngầm:** Silent check lúc mở app chỉ được phép gọi tối đa 1 lần / 24 giờ (`LastUpdateCheckDate`), tránh spam request lên trang web máy chủ.

---

# 2. BẢO TOÀN HIỆU NĂNG UI & QUẢN LÝ WINFORMS CONTROLS (PERFORMANCE CRITICAL RULES)

> [!CAUTION]
> **ĐÂY LÀ KHU VỰC TỬ HUYỆT ĐÃ TỪNG BỊ LỖI LẶP LẠI NHIỀU LẦN.**
> WinForms xử lý mỗi UserControl con như một Win32 Window Handle (`HWND`). Việc tùy tiện tạo mới hoặc hủy bỏ hàng loạt controls trên UI Thread sẽ làm treo cứng ứng dụng (UI Freeze) và gây giật lag nghiêm trọng.

## 2.1 Tuyệt Đối Không Hủy Diệt & Tái Tạo Controls Khi Chuyển Tab (No Re-creation Loop)
- **Vấn đề đã xảy ra:** Mỗi `MacroRowControl` chứa tới ~20 controls con. Với script từ 50-100 steps, có tới 1000 - 2000 Win32 handles. Khi chuyển tab từ script ít step sang script nhiều step, nếu code cũ gọi `Dispose()` các row thừa rồi `new` lại các row đó khi quay lại, Windows bị ép gọi `CreateWindowEx` hàng ngàn lần -> UI bị đơ cứng từ 1 đến 2 giây.
- **Quy tắc bắt buộc (Control Pooling / Row Recycling):**
  1. **Khi chuyển sang script ít bước hơn:** **CẤM GỌI `Dispose()` hay `Controls.Remove()`** đối với các row thừa. Chỉ được phép ẩn đi (`Visible = false`) và đưa vào danh sách chờ (`_rowPool`).
  2. **Khi chuyển sang script nhiều bước hơn:** **BẮT BUỘC** kiểm tra và lấy lại các row đã có sẵn từ `_rowPool`, bật lại `Visible = true`, và gọi `BindStep(step, index)` để nạp dữ liệu.
  3. **Chỉ khởi tạo mới (`new MacroRowControl`)** khi số lượng bước của script vượt quá tổng số row đang có trong cả danh sách hiển thị lẫn trong `_rowPool`.
  4. **Giải phóng tài nguyên sạch sẽ:** Chỉ gọi `Dispose()` trên toàn bộ `_rows` và `_rowPool` khi `MacroTableControl` thực sự bị đóng/hủy (trong hàm `Dispose(bool disposing)`).

## 2.2 Bắt Buộc Đóng Băng Vẽ Với Win32 `WM_SETREDRAW` Khi Thao Tác Bảng
- Mọi hàm nạp lại bảng dữ liệu (`LoadProfile`, `ReloadProfileTabs`, `SetAllProfiles`) hoặc thao tác hàng loạt trên nhiều rows **BẮT BUỘC** phải được bọc trong cặp lệnh:
  ```csharp
  NativeMethods.SendMessage(pnlContent.Handle, NativeMethods.WM_SETREDRAW, (IntPtr)0, IntPtr.Zero);
  pnlContent.SuspendLayout();
  try
  {
      // Thao tác nạp, sắp xếp, ẩn/hiện rows
  }
  finally
  {
      pnlContent.ResumeLayout();
      NativeMethods.SendMessage(pnlContent.Handle, NativeMethods.WM_SETREDRAW, (IntPtr)1, IntPtr.Zero);
      pnlContent.Invalidate(true);
  }
  ```
- `SuspendLayout()` của WinForms chỉ hoãn layout, **không ngăn được** Windows bắn các thông điệp vẽ và khởi tạo handle. Chỉ có Win32 `WM_SETREDRAW` mới triệt tiêu hoàn toàn hiện tượng nhấp nháy và nghẽn message pump.

## 2.3 Quản Lý Tooltip Cực Kỳ Tiết Kiệm (Lazy / Zero-Overhead Tooltips)
- **Cấm gọi Win32 `ToolTip.SetToolTip()` hàng loạt:** Gọi `SetToolTip` trên hàng trăm control con cùng lúc sẽ ép WinForms tạo handle sớm cho toàn bộ cây controls.
- **Giải pháp:**
  - Chỉ gán tooltip tĩnh 1 lần khi khởi tạo control.
  - Hoặc sử dụng cơ chế Lazy Tooltip (`AttachHoverTooltip`), chỉ truy vấn và gán chuỗi mô tả khi người dùng thực sự di chuột (`MouseEnter`) vào control đó.
- **Không gọi trùng lặp:** Không lồng lệnh gọi `UpdateWindowIconDisplay()` hoặc `UpdateRowTooltips()` nhiều lần trong cùng một chu kỳ bind dữ liệu.

## 2.4 Tuyệt Đối Ngăn Chặn Ghi Đè Dữ Liệu Chéo Giữa Các Tab (Anti-Ghost Flush & Event Suppression)
- **Nguy cơ tử huyệt:** Khi chuyển tab, việc thay đổi chỉ mục tab (`_activeProfileIndex`) diễn ra trong trạng thái quá độ. Nếu có bất kỳ sự kiện WinForms nào (như `SelectedIndexChanged` khi nạp lại dropdown) bị kích hoạt ngầm, hàm đồng bộ dữ liệu (`FlushCurrentProfileFromUI` hoặc `UpdateStatus`) sẽ lấy dữ liệu của tab cũ trên bảng ghi đè thẳng vào tab mới trong RAM -> **MẤT TRẮNG DỮ LIỆU CỦA NGƯỜI DÙNG**.
- **Quy tắc bắt buộc:**
  1. **Khóa toàn diện chu trình chuyển tab:** Biến cờ `_isLoadingUI = true` phải bao bọc toàn bộ chu trình từ trước khi đổi `_activeProfileIndex` cho đến khi `LoadProfileToUI` hoàn tất $100\%$.
  2. **Thứ tự nạp dữ liệu chuẩn:** Bắt buộc nạp dữ liệu bước vào bảng (`tableControl.LoadProfile(p)`) TRƯỚC, sau khi các hàng mới đã an vị trên bảng mới được gọi cập nhật danh sách script phụ thuộc (`SetAvailableScripts`).
  3. **Triệt tiêu sự kiện ngầm khi repopulate dropdown:** Mọi thao tác làm mới danh sách item (`Items.Clear()`, `Items.Add()`, gán `SelectedIndex`) trong controls hàng phải luôn được bọc trong cờ `_isBinding = true` (hoặc `_isLoading = true`) để ngăn chặn việc phát tín hiệu `OnStepChanged` / `OnTableDataChanged`.
  4. **Cấm đồng bộ dữ liệu khi đang Load:** Trong `UpdateStatus()` và các sự kiện lắng nghe bảng `OnTableDataChanged`, **CẤM TUYỆT ĐỐI** gọi `p.Steps = tableControl.GetSteps()` nếu `_isLoadingUI == true`.

---

# 3. QUẢN LÝ TIẾN TRÌNH & CỬA SỔ MỤC TIÊU (WINDOW TARGETING & CACHING)

## 3.1 Nhận Diện Cửa Sổ Thông Minh & Đa Cửa Sổ (Multi-Window Instance)
- **Ưu tiên Window Handle (HWND):** Khi người dùng đã chấm chọn một cửa sổ cụ thể (ví dụ 1 trong 2 cửa sổ Chrome), app phải lưu và ưu tiên kiểm tra `WindowHwnd` trước.
  - Nếu `IsValidWindowHandle(WindowHwnd, ProcessName)` hợp lệ -> Tác vụ click thực thi ngay lập tức (0 ms delay), không cần quét lại toàn bộ màn hình.
  - Chỉ khi handle bị mất (cửa sổ bị đóng hoặc mở lại) mới kích hoạt cơ chế fallback tìm kiếm theo tên (`ProcessName` / `WindowTitle`).
- **Cache có thời hạn (TTL Caching):**
  - Mọi hàm quét cửa sổ như `FindWindowByTarget` và trích xuất icon `GetProcessIcon` phải có bộ nhớ đệm (cache) tối thiểu 1000ms.
  - Tuyệt đối không gọi `Process.GetProcessesByName()` hoặc `EnumWindows` lặp đi lặp lại trong các vòng lặp UI hay vòng lặp render overlay.

---

# 4. BẢO VỆ ĐỘNG CƠ TỰ ĐỘNG HÓA & ĐA LUỒNG (ENGINE INTEGRITY & THREADING)

## 4.1 Tách Biệt Tuyệt Đối UI Thread và Engine Thread
- Quá trình chạy macro (`Engine_MacroRunner`) và click tự động (`Engine_SimpleClicker`) **phải luôn chạy trên Background Worker Thread**.
- Tuyệt đối không thực hiện `Thread.Sleep()`, quét pixel nặng, hoặc vòng lặp chờ đợi trên UI Thread.
- Mọi cập nhật từ Runner lên giao diện (đổi màu row đang chạy, cập nhật text trạng thái, đếm loop) **bắt buộc phải qua `Control.BeginInvoke` hoặc `Invoke`**.

## 4.2 Bảo Toàn Chế Độ Click Ngầm (Free Mouse Mode)
- Luôn kiểm tra tính tương thích giữa tọa độ màn hình thực tế (Screen Coordinates) và tọa độ client nội bộ của cửa sổ (Client Coordinates) thông qua `ScreenToClient` / `ClientToScreen`.
- Hỗ trợ đầy đủ cả 2 chế độ:
  - `FreeMouseMode = false`: Di chuột phần cứng thật bằng `SendInput`.
  - `FreeMouseMode = true`: Gửi message ngầm trực tiếp qua `PostMessage` (`WM_LBUTTONDOWN`, `WM_LBUTTONUP`, `WM_MOUSEMOVE`) mà không chiếm chuột của người dùng.

---

# 5. KỶ LUẬT LƯU TRỮ & TƯƠNG THÍCH NGƯỢC (STORAGE & BACKWARD COMPATIBILITY)

## 5.1 Tương Thích Ngược Schema (100% Backward Compatible)
- Mọi bản nâng cấp tính năng mới (ví dụ: Tọa độ Vùng, Random Click trong Vùng, Action mới) **tuyệt đối không được làm hỏng việc đọc các file JSON macro cũ** của người dùng.
- Các trường dữ liệu mới phải luôn có giá trị mặc định an toàn khi Deserialize các file cấu hình cũ (như `PvZ Coins.json`, `PvZ Water.json`, `_AutoClickerConfig.json`).

## 5.2 Lưu Dữ Liệu Tự Động & An Toàn (Atomic Save)
- Mọi thay đổi cấu hình cần được ghi xuống đĩa một cách an toàn, tránh ghi đè lỗi làm hỏng toàn bộ file config khi app bị tắt đột ngột.
- Khi người dùng bấm chuyển tab, phải gọi `FlushCurrentProfileFromUI()` để đồng bộ trạng thái của tab hiện tại vào bộ nhớ trước khi nạp dữ liệu tab mới.