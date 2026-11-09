# Bộ Test Auto Clicker

Mỗi file `.cs` là một chương trình nhỏ, được biên dịch kèm `Auto Clicker by Max.exe` rồi điều khiển code thật của app: mở cửa sổ chính, bấm Start, đọc dòng trạng thái, mở cửa sổ đích để app click vào, làm hỏng file cấu hình... Kết quả là các dòng `PASS` / `FAIL`.

`build.bat` chỉ biên dịch `src_*`, nên thư mục này không lọt vào exe. Kết quả và bản build của test nằm trong `out/` (đã gitignore).

## Cách chạy

```powershell
.\run-tests.ps1 -Group ui            # một nhóm
.\run-tests.ps1 -Group ui,popup      # vài nhóm
.\run-tests.ps1 -Changed             # tự chọn nhóm theo file đã sửa trong git
.\run-tests.ps1 -All                 # tất cả: trước khi commit hoặc phát hành
.\run-tests.ps1 -All -NoMouse        # bỏ các bộ dùng chuột thật
.\run-tests.ps1 -Tool PageShot       # chụp ảnh Simple/Asian cho trang web
```

Lệnh tự build app nếu source mới hơn exe, chỉ biên dịch lại test nào đã đổi, và in bảng số `PASS` / `FAIL` cùng thời gian của từng bộ. Mỗi bộ chạy trong thư mục riêng với cấu hình mẫu, không đụng tới cấu hình thật của người dùng.

**Nhóm `popup` và `target` dùng chuột thật và đưa cửa sổ lên trước.** Đừng dùng máy trong lúc chạy.

## Các nhóm

| Nhóm | Bộ | Kiểm gì | Thời gian |
| :--- | :--- | :--- | ---: |
| `ui` | `ui/StatusUi.cs` | Thẻ Cài đặt Click, danh sách điểm và thẻ Follow Cursor nằm trọn trong khung, dòng trạng thái giữ số liệu lần chạy cuối | 17s |
| `ui` | `ui/RunUiCheck.cs` | Cửa sổ chính khi chạy: dòng "Running", chiều cao cửa sổ, chuyển tab, theme | 18s |
| `ui` | `audit/FixTest.cs` (hotkey) | Cảnh báo khi F6/F7 bị app khác chiếm | 15s |
| `popup` | `popup/DialogUi.cs` | Khung popup, Enter/Esc, F6/F7 khi popup mở, viền nháy, popup song song | 39s |
| `engine` | `engine/RunStatsTest.cs` | Số click, số bước, vòng lặp, thời gian | 2s |
| `engine` | `engine/PressClickTest.cs`, `engine/RecTest.cs` | Recorder: Nhấn & Click, gõ văn bản | 12s |
| `engine` | `engine/JumpTest.cs` | Nhảy bước của IfColor, IfColorArea, IfImage, so với `shared/jump-expected.txt` | 30s |
| `engine` | `audit/FixTest.cs` (engine) | Script lỗi không làm văng app, giới hạn giá trị, F7 dừng được script quá nhanh | 36s |
| `storage` | `audit/FixTest.cs` (storage) | Cấu hình hỏng hoặc cụt, khôi phục `.bak`, không ghi đè khi đọc lỗi | 3s |
| `target` | `target/TargetTest.cs` | Tìm cửa sổ, khóa PID, mất target, click thật lên cửa sổ đích | 71s |
| `target` | `target/TargetUi.cs` | Popup mất target, đổi target, mở lại app | 50s |
| `common` | `common/*.cs` | Link cập nhật, tên icon của `Common`, khung popup trong Book Forge | 5s |

Chạy hết (`-All`) mất khoảng 5 phút.

## Nhóm nào cho file nào (`-Changed`)

| Sửa | Nhóm |
| :--- | :--- |
| `MainForm*`, `UI_*`, `Localization/` | `ui` |
| File có `Dialog`, `Popup`, `MessageBox` | `popup`, `ui` |
| `Simple/Engine_*`, `Advanced/Engine_*`, recorder | `engine` |
| `Storage_*`, `Advanced/Model_*` | `storage`, `engine` |
| `Core_NativeMethods`, `Feature_CoordinatePicker*`, `SpecialApps/` | `target`, `engine` |
| `Common/`, `tests/shared/`, hoặc file không có trong bảng | tất cả |

## Thư mục khác

- `shared/`: cửa sổ đích `WinTarget.cs` (mỗi lần bị click ghi một dòng vào `<tên>.clicks`), cấu hình mẫu, kết quả nhảy bước chuẩn.
- `tools/`: không phải test. `PageShot` chụp ảnh cho trang web, `RepeatClick` lặp 60 lần một ca click bằng chuột thật, `Speed` đo số bước mỗi giây, `IcoBuild` dựng `app.ico` từ các ảnh PNG.

## Khi thêm hoặc sửa test

- Dữ liệu mẫu không được chứa tên cửa sổ, đường dẫn hay dữ liệu riêng của người dùng: repo là công khai.
- Một hành vi chỉ kiểm ở một bộ. Dòng trạng thái kiểm ở `StatusUi`, không lặp lại ở bộ khác.
- App đổi hành vi theo yêu cầu thì sửa test theo, và ghi rõ trong báo cáo là test đã đổi.
