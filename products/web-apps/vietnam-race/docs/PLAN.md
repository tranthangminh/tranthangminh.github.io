# KẾ HOẠCH DỰ ÁN CHI TIẾT: VIETNAM RACE (WEB 3D PROCEDURAL REAL-MAP GAME)

> **Mục tiêu:** Xây dựng web game 3D thế giới thực (đua xe / xe bay / khám phá thành phố) chạy mượt mà trực tiếp trên trình duyệt web máy tính và điện thoại. 
> Toàn bộ thế giới được dựng tự động từ dữ liệu bản đồ mở thực tế (OpenStreetMap, DEM độ cao địa hình), kết hợp công nghệ dựng hình thủ tục (Procedural Generation), đồ họa Low-Poly cách điệu và văn hóa đường phố đặc trưng của Việt Nam.

---

## 1. ĐÁNH GIÁ ĐỘ KHẢ THI & NỀN TẢNG CÔNG NGHỆ

### 1.1 Độ khả thi tổng thể: 9.5 / 10
- **Minh chứng thực tế:** Tựa game tham chiếu `xe-bay-ha-noi.vercel.app` đã chứng minh web 3D (Three.js) có thể dựng và chạy mượt mà cả nội thành Hà Nội (~$22 \times 19\text{ km}$), Đà Nẵng, đèo dốc Đà Lạt ngay trên trình duyệt di động mà không cần cài đặt.
- **Chi phí vận hành: 0 VNĐ (Không tốn tiền API):** 
  - 100% sử dụng dữ liệu mở miễn phí: **OpenStreetMap (OSM)**, **Overture Maps**, **Google Open Buildings**, **Copernicus DEM (30m)**.
  - Tuyệt đối không dùng Google Maps API (vừa đắt đỏ tính tiền theo lượt gọi, vừa cấm tải dữ liệu thô về lưu trữ).

---

## 2. HỆ THỐNG KIẾN TRÚC & BIẾN THỂ NHÀ CỬA (BUILDING SYSTEM)

### 2.1 Quy tắc đùn khối thủ tục (Procedural Extrusion)
- Lấy đa giác móng nhà (`footprint polygon`) từ OSM và Google Open Buildings.
- Phân loại cấp nhà dựa theo diện tích móng ($S$) và số tầng (`building:levels`):
  - Dùng thuật toán băm tọa độ: `seed = hash(centerX, centerZ) % variant_count` để gán cố định biến thể mà không cần lưu model vào file.

| Cấp độ nhà | Diện tích móng ($S$) & Số tầng | 7 - 10 Biến thể kiến trúc Việt Nam đặc trưng |
| :--- | :--- | :--- |
| **Nhà ống / Nhà ngõ** | $S < 80\text{m}^2$, $2 - 5$ tầng | 1. Mái bằng gắn bồn nước inox Tân Á/Sơn Hà.<br/>2. Chuồng cọp sắt hàn kín phơi quần áo tầng thượng.<br/>3. Mái tôn dốc màu xanh dương / đỏ gạch sẫm.<br/>4. Ban công đua ra ngoài ngõ có chậu cây xanh.<br/>5. Tum thang nhô cao + giàn phơi đồ.<br/>6. Tầng 1 lùi vào làm cửa cuốn xám / chỗ để xe máy.<br/>7. Biển hiệu cửa hàng tạp hóa, quán phở tầng 1. |
| **Nhà phố / Shophouse / Biệt thự** | $80\text{m}^2 \le S < 250\text{m}^2$, $3 - 6$ tầng | 1. Mái ngói vát 4 chiều kiểu Pháp cổ điển.<br/>2. Mái Thái chóp nhọn nhiều tầng lớp.<br/>3. Sân thượng có mái che pergola và cây cảnh.<br/>4. Tầng trệt cửa kính lớn shophouse + mái hiên di động.<br/>5. Cửa sổ lá chớp màu xanh lục kiểu thuộc địa.<br/>6. Khối hộp hiện đại ốp nan gỗ trang trí mặt tiền. |
| **Trường học / Bệnh viện / TTTM** | $250\text{m}^2 \le S < 1000\text{m}^2$, $4 - 8$ tầng | 1. Khối chữ U hoặc chữ L có sân chào cờ/sân đỗ xe giữa.<br/>2. Mái bằng lớn gắn dàn điều hòa trung tâm (chillers).<br/>3. Tòa nhà hành chính có sảnh đón cột tròn lớn.<br/>4. Trung tâm thương mại mặt tiền khối kính lớn.<br/>5. Khối nhà giật cấp có vườn treo trên mái. |
| **Cao ốc / Chung cư (Skyscrapers)** | $S \ge 1000\text{m}^2$ hoặc tầng $\ge 10$ | 1. Tháp kính văn phòng hiện đại bo tròn góc.<br/>2. Khối hộp giật cấp 3 tầng đế thương mại.<br/>3. Chung cư ban công sọc đứng song song phơi đồ.<br/>4. Đỉnh tháp vát nhọn gắn cột ăng-ten phát sóng.<br/>5. Nóc tháp có bãi đỗ trực thăng (Helipad tròn chữ H). |

### 2.2 Danh mục Landmark đặc biệt (Custom Low-Poly Models)
Khi nạp ô bản đồ có chứa tọa độ của các công trình biểu tượng, engine bỏ qua khối sinh ngẫu nhiên và nạp mô hình Low-Poly được tối ưu riêng (~$50 - 150\text{KB}$):
- **TP. Hồ Chí Minh:**
  - *Tháp Bitexco:* Tòa tháp búp sen có sân đỗ trực thăng vươn ra ở tầng 52.
  - *Landmark 81:* Tháp bó tre giật cấp cao nhất Việt Nam.
  - *Nhà thờ Đức Bà:* Hai tháp chuông chóp nhọn, tường gạch đỏ cổ kính.
  - *Chợ Bến Thành:* Tháp đồng hồ 4 mặt với cửa Nam đặc trưng.
  - *Cầu Ba Son (Thủ Thiêm 2):* Cột tháp nghiêng dây văng hướng về trung tâm.
- **Hà Nội:**
  - *Cầu Long Biên:* Nhịp dầm thép nhấp nhô cổ kính bắc qua sông Hồng.
  - *Cầu Nhật Tân:* 5 trụ tháp kim cương dây văng hiện đại.
  - *Tháp Rùa & Cầu Thê Húc:* Quần thể di tích Hồ Gươm sơn son đỏ thắm.
  - *Keangnam Landmark 72 & Lotte Center:* Hai tòa tháp biểu tượng phía Tây.
  - *Chùa Một Cột:* Kiến trúc hoa sen trên một trụ đá độc đáo.

---

## 3. HỆ THỐNG MÔI TRƯỜNG TỰ NHIÊN, RỪNG & MẶT NƯỚC

### 3.1 Phân vùng thực vật từ OpenStreetMap
- **Vùng rừng (`landuse=forest` hoặc `natural=wood`):**
  - Rừng phòng hộ, đồi thông Đà Lạt, rừng ngập mặn Cần Giờ.
  - **Quy tắc:** Tuyệt đối **không sinh nhà**, chỉ rải cây xanh rậm rạp theo thuật toán phân bố ngẫu nhiên (Poisson disk sampling), chỉ giữ lại các cung đường đèo hoặc đường mòn (`highway=track/path`).
- **Vùng công viên (`leisure=park` / `landuse=grass`):**
  - Công viên Tao Đàn, Thống Nhất, Lê Văn Tám.
  - Thảm cỏ xanh mướt, lối đi bộ quanh co và các cụm cây bóng mát.
- **Mặt nước (`natural=water` / `waterway=river/canal`):**
  - Sông Hồng, Sông Sài Gòn, Hồ Tây, Hồ Gươm, Kênh Nhiêu Lộc.
  - Render mặt nước phẳng có shader phản chiếu bầu trời và gợn sóng nhẹ chuyển động, mang lại tầm nhìn thoáng đãng khi đua dọc bờ sông.

### 3.2 6 Biến thể cây cối Low-Poly (InstancedMesh)
1. *Cây xà cừ cổ thụ:* Thân to nâu xám, tán nấm tròn rậm rạp đặc trưng phố cổ.
2. *Cây hoa phượng / bằng lăng:* Tán xòe ngang, điểm hạt đỏ rực hoặc tím nhạt.
3. *Cây thông Đà Lạt:* Dáng tháp nhọn tam giác màu xanh rêu sẫm.
4. *Cây dừa / cọ:* Thân uốn cong mảnh khảnh, lá xòe (thích hợp ven sông hồ, bờ biển).
5. *Cây bàng ta:* Thân khẳng khiu, tán lá phân tầng nằm ngang theo từng bậc.
6. *Bụi hoa & Cây cảnh dải phân cách:* Dáng bán cầu nhỏ thấp chạy dọc vỉa hè.

---

## 4. HỆ THỐNG PHÂN LÀN & GIAO THÔNG AI (TRAFFIC SIMULATION)

### 4.1 Quy tắc phân làn từ thẻ OSM
- **Xe máy Only (Cấm ô tô):**
  - Ngõ hẹp nội đô: `highway=service/path` hoặc độ rộng `width < 2.5m`.
  - Cầu sắt cũ / cầu bộ hành: `motorcar=no`, `motorcycle=yes`.
  - Làn xe máy riêng trên đại lộ (Võ Văn Kiệt, Mai Chí Thọ): OSM thể hiện thành đường độc lập có tag `motorcycle=designated`.
  - $\to$ **Hành vi AI:** Chỉ spawn xe máy, mật độ cao, chạy lạng lách luồn lách.
- **Xe hơi Only (Cấm xe máy):**
  - Đường cao tốc, đường vành đai trên cao: `highway=motorway`, `motorcycle=no`.
  - $\to$ **Hành vi AI:** Chỉ spawn ô tô, xe tải, container, chạy tốc độ cao ($80 - 100\text{ km/h}$).
- **Đường hỗn hợp:**
  - Hầu hết các tuyến phố: `highway=primary/secondary/residential`.
  - $\to$ **Tỉ lệ spawn:** 70% xe máy + 30% ô tô.

### 4.2 Biến thể phương tiện AI Low-Poly
- **Xe máy đường phố:**
  - *Xe số (Wave / Dream):* Chở theo thùng carton hoặc két bia/nước ngọt đằng sau.
  - *Xe tay ga (Lead / Vision):* Nhân vật trùm kín áo chống nắng hoa ("Ninja Lead").
  - *Xe ôm công nghệ:* Áo khoác & mũ bảo hiểm màu xanh lá (Grab), vàng (Be), cam (ShopeeFood).
- **Ô tô đường phố:**
  - *Taxi:* Xe điện xanh ngọc (Xanh SM), taxi trắng-đỏ (Vinasun), xanh lá (Mai Linh).
  - *Xe buýt:* Khối hộp vàng-đỏ (Hà Nội) hoặc xanh lá cây (TP.HCM).
  - *Xe tải / Xe container:* Xuất hiện trên quốc lộ, cảng biển và cao tốc.

---

## 5. VĂN HÓA ĐƯỜNG PHỐ & TÍNH NĂNG "ĐẶC SẢN" VIỆT NAM

### 5.1 Cầu vượt ngã tư, Cầu cạn & Hầm chui
- Nhận diện qua tag `bridge=yes`, `layer=1` (cầu vượt thép, đường vành đai trên cao) và `tunnel=yes`, `layer=-1` (hầm Kim Liên, hầm Thủ Thiêm).
- Đường dẫn lên cầu cạn có trụ cầu bê tông tròn và lan can bảo vệ; trong hầm chui có dải đèn neon vàng dẫn lối.

### 5.2 Chu kỳ Ngày - Đêm & Thời tiết nhiệt đới
- **Ban đêm:** Bầu trời tối, hàng nghìn đốm đèn pha vàng/trắng của dòng xe di chuyển, đèn đường cao áp rực rỡ và cửa sổ các tòa nhà phát sáng ngẫu nhiên.
- **Mưa rào nhiệt đới:** Hiệu ứng mưa rơi nhẹ, mặt đường chuyển sang shader ướt bóng loáng phản chiếu vệt đèn xe đỏ rực.
- **Sương mù phố núi (Map đèo dốc):** Dùng Fog tăng dần theo độ cao địa hình tạo cảm giác săn mây khi leo đèo.

### 5.3 Chi tiết vỉa hè & Chướng ngại vật
- **Quán trà đá vỉa hè / Cà phê cóc:** Cụm bàn ghế nhựa con màu đỏ và xanh dương kê sát lề đường.
- **Lô cốt công trình:** Rào chắn quây tôn xanh lá/xanh dương dọc đường làm chướng ngại vật buộc người chơi phải bẻ lái né tránh.
- **Vạch sang đường (Zebra Crossing) & Đèn giao thông:** Đổi màu xanh/đỏ tại các ngã tư lớn.

### 5.4 Âm thanh thuần Web Audio API (Zero External Media)
- Sử dụng bộ tổng hợp âm thanh (Synthesizer) từ Oscillator:
  - **Tiếng còi xe máy "bim bim":** Phát ngẫu nhiên từ các xe AI xung quanh.
  - **Tiếng rít động cơ / tiếng gió:** Tự động điều biến tần số (frequency modulation) theo vận tốc xe.
  - **Tiếng ve sầu râm ran:** Phát ngầm khi xe chạy ngang qua các công viên hoặc hàng cây xà cừ.

---

## 6. KIẾN TRÚC KỸ THUẬT & QUY TRÌNH DỮ LIỆU (TECHNICAL PIPELINE)

```
[Dữ liệu mở: OpenStreetMap (OSM) + Copernicus DEM (30m)]
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│             PIPELINE XỬ LÝ DỮ LIỆU OFFLINE (PYTHON)          │
│                                                             │
│ 1. Chuyển đổi tọa độ: GPS (lat, lon) ──▶ Tọa độ mét (x, z) │
│ 2. Lọc đường: Cấp đường, số làn, phân làn xe máy / ô tô     │
│ 3. Lọc vùng: Vùng rừng (wood), công viên (park), sông hồ   │
│ 4. Lọc móng nhà: Gán diện tích, tầng cao, cờ landmark       │
│ 5. Cắt lưới: Phân chia thành các ô vuông 500m × 500m        │
│ 6. Xuất file nhẹ: tile_X_Z.json (vài chục KB) + dem.bin     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼ (HTTP Fetch nạp/hủy ô theo vị trí xe)
┌─────────────────────────────────────────────────────────────┐
│                    GAME CLIENT (THREE.JS)                   │
│                                                             │
│  ┌──────────────────────┐     ┌──────────────────────────┐  │
│  │ Chunk Manager        │     │ Road & Bridge Extruder   │  │
│  │ Bán kính 1.5 - 2.5km │────▶│ Mặt đường theo số làn,   │  │
│  │ Xóa ô xa, nạp ô gần  │     │ vạch kẻ, vỉa hè, cầu cạn │  │
│  └──────────────────────┘     └──────────────────────────┘  │
│             │                              │                │
│             ▼                              ▼                │
│  ┌──────────────────────┐     ┌──────────────────────────┐  │
│  │ Building & Landmark  │     │ Traffic AI & Nature      │  │
│  │ Đùn khối + 10 variant│     │ Xe máy lách ngõ, ô tô    │  │
│  │ Nạp Landmark riêng   │     │ cao tốc, rừng cây cối    │  │
│  └──────────────────────┘     └──────────────────────────┘  │
│             │                              │                │
│             └──────────────┬───────────────┘                │
│                            ▼                                │
│              ┌──────────────────────────┐                   │
│              │ Tối ưu hóa cực hạn WebGL │                   │
│              │ - BufferGeometry.merge   │                   │
│              │ - InstancedMesh (cây/cột)│                   │
│              │ - Canvas 2D ProceduralTex│                   │
│              └──────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Cấu trúc Thư mục & Quản lý Tài nguyên Hybrid (Assets Architecture)
- **Thư mục chứa file 3D `.glb` (`assets/models/`):** Chỉ chứa các model độc bản quan trọng (xe người chơi `car_player_vf3.glb`, landmark `landmark_hcm_bitexco.glb`).
- **Module sinh thủ tục (`assets.js`):** Quản lý tập trung toàn bộ hình học của cây cối (`tree_xacu`, `tree_phuong`), cột đèn đường cao áp, quán trà đá vỉa hè, xe máy và taxi AI để đảm bảo hiệu năng 60 FPS.

---

## 7. LỘ TRÌNH TRIỂN KHAI TỪNG BƯỚC (ROADMAP & MILESTONES)

### Giai đoạn 1: Công cụ tiền xử lý dữ liệu (Offline Data Tools)
- [ ] Viết script Python (`tools/build_map.py`) dùng `osmnx` tải dữ liệu thử nghiệm bán kính $2\text{ km}$ (khuyên chọn khu vực Hồ Bán Nguyệt Q7 hoặc Hoàn Kiếm Hà Nội).
- [ ] Đổi tọa độ GPS sang mét Đề-các $(x, z)$.
- [ ] Trích xuất cờ phân làn (làn xe máy only, đường hẹp ngõ ngách, cao tốc cấm xe máy).
- [ ] Trích xuất đa giác vùng rừng, công viên, sông hồ và móng nhà.
- [ ] Cắt dữ liệu thành các ô $500\text{m} \times 500\text{m}$ và xuất ra các file JSON gọn nhẹ.
- [ ] Viết script Python (`tools/build_terrain.py`) nén dữ liệu độ cao DEM thành `dem.bin`.

### Giai đoạn 2: Nền tảng WebGL & Dựng đường xá, Sông hồ
- [ ] Khởi tạo trang web `index.html` với canvas Three.js (ES Module minimal).
- [ ] Xây dựng `ChunkManager`: tự động nạp các ô trong bán kính $2\text{ km}$ quanh camera và hủy các ô phía sau.
- [ ] Viết thuật toán Extrude đường: sinh mặt đường theo bề rộng thật, vạch sơn phân làn, vỉa hè và dải phân cách.
- [ ] Dựng mặt nước phẳng chuyển động nhẹ cho sông hồ và cầu cạn (`layer=1`).

### Giai đoạn 3: Dựng nhà Procedural (Variants), Cây cối & Landmark
- [ ] Lập trình thuật toán đùn khối nhà theo chu vi móng đa giác.
- [ ] Viết module sinh 7 - 10 biến thể nóc nhà đặc trưng Việt Nam (bồn nước inox, chuồng cọp, ban công, mái ngói).
- [ ] Phân vùng rừng/công viên: chỉ rải cây xanh (`InstancedMesh`), không sinh nhà.
- [ ] Tạo 1-2 model Landmark Low-Poly đại diện (Bitexco / Chợ Bến Thành / Cầu Long Biên) và code logic ghi đè vị trí.

### Giai đoạn 4: Điều khiển xe & Vật lý va chạm (Vehicle Physics)
- [ ] Dựng model xe người chơi (xe thể thao hoặc xe bay phản lực hovercraft Low-Poly).
- [ ] Lập trình hệ thống điều khiển: Phím WASD, phím mũi tên, hỗ trợ phím ảo/vuốt trên màn hình cảm ứng điện thoại.
- [ ] Lập trình raycast bám mặt đường/địa hình theo thời gian thực và camera bám đuôi mượt mà (smooth chase camera).

### Giai đoạn 5: Cảnh quan chi tiết, Giao thông AI & Âm thanh
- [ ] Đặt cột đèn đường, biển báo, bàn ghế quán cóc, rào chắn công trình bằng `InstancedMesh`.
- [ ] Xây dựng đồ thị giao thông (Directed Graph) và lập trình xe máy, ô tô AI chạy theo luật phân làn.
- [ ] Tạo các biến thể xe AI (xe ôm công nghệ, ninja lead, taxi xanh, xe buýt).
- [ ] Tổng hợp âm thanh bằng **Web Audio API**: tiếng còi xe bim bim, tiếng rít động cơ, tiếng ve kêu.

### Giai đoạn 6: Hoàn thiện Gameplay & Tối ưu hóa hiệu năng
- [ ] Thêm chế độ tính giờ (Time Trial), trạm checkpoint đón năng lượng qua các danh lam thắng cảnh.
- [ ] Tích hợp chu kỳ Ngày - Đêm (đèn đường, đèn xe phát sáng) và thời tiết mưa ướt đường.
- [ ] Kiểm thử và tối ưu Draw Call đảm bảo đạt 60 FPS mượt mà trên cả điện thoại di động tầm trung.

---

## 8. KẾ HOẠCH TRIỂN KHAI NÂNG CẤP CHI TIẾT (SPRINT 2: PHYSICS, AI, COLLISION & 3D STUDIO)

### 8.1 File cấu hình thông số xe tập trung ([`vehicles-config.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicles-config.js))
- Tạo mới module cấu hình chứa dữ liệu vật lý chuẩn hóa: `accel0To100Time`, `maxSpeedKmH`, `nitroTopSpeedKmH` (699 km/h), `nitroAccel`, `brakeDecel`, `turnSpeed`, `massKg`, `dimensions`.
- Áp dụng chung cho cả xe người chơi (`car.js`) lẫn xe AI giao thông (`traffic.js`).

### 8.2 Khắc phục triệt để lỗi kẹp tốc độ Nitro ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js))
- Gỡ bỏ giới hạn `speed = MAX_SPEED` khi đang nhấn ga tiến kết hợp bấm Nitro `Shift`.
- Khi kích hoạt Nitro, trần vận tốc mở rộng đến `NITRO_TOP_SPEED` ($194.2\text{ m/s} = 699\text{ km/h}$).

### 8.3 Chuẩn hóa làn đường & AI né vượt thông minh ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic.js))
- Đảo vector pháp tuyến theo quy chuẩn giao thông Việt Nam (xe bám làn phải).
- Tích hợp radar quét $12\text{m}$ phía trước: khi phát hiện chướng ngại vật hoặc xe đi chậm, AI tự động lách sang làn bên cạnh để vượt rồi nhập lại làn ban đầu.

### 8.4 Tối ưu va chạm AABB Box sát mép model ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js) & [`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/map-saigon.js))
- Đổi từ bounding sphere $R = \max(W, D)/1.8$ sang AABB Box `{ type: 'box', x, z, w, d }` cho các tòa nhà và công trình.
- Xe cọ sát mép tường trong cự ly $0.15\text{m} - 0.20\text{m}$ cực chuẩn xác, triệt tiêu hoàn toàn "tường vô hình".

### 8.5 Đặt đèn giao thông chính xác tại góc vỉa hè các nút giao ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/map-saigon.js))
- Đặt tại tọa độ giao nhau thực tế của các trục đường: Lê Lợi x Nguyễn Huệ, Hàm Nghi x Tôn Đức Thắng, Lê Lợi x Pasteur, Lê Lợi x NKKN, Chợ Bến Thành.

### 8.6 Nâng cấp Showroom thành 3D Asset Studio tương tác ([`showroom.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/showroom.js))
- Thiết kế bệ xoay studio có ánh sáng chiếu điểm.
- Thanh Sidebar bên hông phân loại 5 danh mục: Cây cối, Đạo cụ, Phương tiện AI, 7 Biến thể nhà, Landmark.
- Điều khiển xoay tự do 360°, phóng to/thu nhỏ bằng con lăn chuột, nút Auto Spin.
- Thẻ thông số kỹ thuật (Kích thước thực tế $D \times R \times C$, Asset ID, nút Copy ID).
- Hỗ trợ tham số URL `?mode=showroom`.

---

## 9. KẾ HOẠCH TRIỂN KHAI SPRINT 3 (AERODYNAMICS, HEALTH, FIRE FX & MOMENTUM)

### 9.1 Mô hình Động lực học Thuần Lực & Quán tính ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js))
- **Xóa bỏ triệt để hardcode kẹp tốc độ (`clamp speed`):** Tốc độ tối đa là điểm cân bằng tự nhiên giữa lực kéo động cơ và tổng lực cản ($F_{drive} = F_{drag} + F_{roll}$).
- **Cản gió bậc hai tự nhiên:** Khi nhả ga ở $600\text{ km/h}$, gió cản cực mạnh ghì xe từ từ về $400 \to 250\text{ km/h}$; khi ở $40\text{ km/h}$, gió cản gần bằng 0 giúp xe trôi trớn êm ái hàng chục mét.
- **Phanh chân thực bị giới hạn bởi độ bám lốp ($\mu \cdot m \cdot g$):** Phanh ở $669\text{ km/h}$ phải mất $15 - 20\text{s}$ và quãng đường trượt $1.2 - 1.8\text{ km}$ theo đúng quán tính động năng $26.5\text{ MJ}$.
- **Hệ thống lái biến thiên (Speed-sensitive steering):** Giảm dần góc quay bánh trước khi vận tốc tăng cao.

### 9.2 Cấu hình thông số xe theo Mã lực & Khí động học ([`vehicles-config.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicles-config.js))
- Bổ sung `horsepowerHP`, `dragCoeff`, `frontalArea`, `tireGrip`, `nitroHorsepower`.
- Xóa bỏ các thuộc tính rác không dùng để code gọn nhẹ.

### 9.3 Hệ thống Máu xe & Hiệu ứng Khói Lửa 3D ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js))
- Quản lý `health: 100`, trừ máu theo xung lực va chạm $\Delta v$.
- Tạo cụm hạt khói/lửa 3D ở khoang động cơ:
  - $HP < 50\%$: Khói xám mỏng.
  - $HP < 25\%$: Khói đen đặc cuồn cuộn.
  - $HP = 0\%$: Xe bốc cháy ngùn ngụt, tắt máy, dừng xe, cảnh báo hư hỏng trên HUD.

### 9.4 Vật lý va chạm theo khối lượng $p = m \cdot v$ ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic.js))
- Xe thể thao ($1.540\text{ kg}$) tông xe máy ($115\text{ kg}$): Xe máy bị bắn văng $10 - 15\text{m}$, xe hơi lướt tiếp.
- Xe thể thao tông xe buýt ($9.500\text{ kg}$): Xe buýt cản đứng xe hơi, xe hơi dội ngược và mất máu.

### 9.5 Giao diện HUD Thanh máu & Cảnh báo bốc cháy ([`app.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/app.js), HTML, CSS)
- Thanh đo máu xe động đổi màu xanh $\to$ vàng $\to$ đỏ nhấp nháy.
- Màn hình cảnh báo "XE BỊ PHÁ HỦY - BẤM R ĐỂ HỒI SINH".

---

## 10. KẾ HOẠCH TRIỂN KHAI SPRINT 4 (SETTINGS, PERSISTENCE, TRAFFIC DENSITY & GOD MODE)

### 10.1 Quản lý Cài đặt & Chuẩn Lưu trữ Bền vững ([`settings.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/settings.js))
- Khai báo hằng bất biến `DEFAULT_SETTINGS` theo chuẩn `_MAX-RULES.md` Mục 5.
- Cơ chế Safe Merger tự động hợp nhất dữ liệu từ `localStorage.getItem('vietnam_race_settings')` với giá trị mặc định, chống lỗi dữ liệu hỏng.
- Các hàm giao tiếp: `get(key)`, `set(key, val)`, `load()`, `save()`, `open()`, `close()`.

### 10.2 Tùy chỉnh Mật độ Xe NPC Trực tiếp ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic.js))
- Hỗ trợ 4 mức độ:
  - `none`: $0$ xe (đường phố trống rỗng hoàn toàn, tối ưu cho thử nghiệm tốc độ cực đại $699\text{ km/h}$).
  - `low`: Nhân hệ số $0.5\times$ ($\approx 14$ xe, đường phố thông thoáng).
  - `normal`: Nhân hệ số $1.0\times$ ($\approx 28$ xe, chuẩn mặc định).
  - `dense`: Nhân hệ số $2.0\times$ ($\approx 56$ xe, mô phỏng giờ cao điểm kẹt xe).
- Hàm `reloadTraffic(scene, density)` dọn dẹp các mesh cũ và sinh luồng xe mới ngay lập tức mà không cần tải lại trang.

### 10.3 Chế độ Xe Bất Tử - God Mode ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js) & [`app.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/app.js))
- Miễn nhiễm hoàn toàn sát thương va chạm khi bật God Mode.
- Nếu người chơi đang cháy xe hoặc đã hỏng xe mà mở bảng bật God Mode $\to$ tự động phục hồi $100\%$ máu, dập tắt lửa và ẩn màn hình hỏng.
- HUD máu chuyển sang màu hoàng kim với chữ hiển thị `∞ GOD`.

### 10.4 Giao diện Bảng Cài đặt & Song ngữ ([`vietnam-race.html`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race.html), CSS, i18n)
- Thêm nút cài đặt ⚙️ trên thanh header.
- Modal giao diện Glassmorphism mờ sang trọng với nút chọn mật độ xe dạng thẻ và cần gạt Toggle Switch cho God Mode.
- Tự động đóng modal khi nhấn phím `Escape`, nút Đóng, hoặc nhấp ra nền mờ.
- Tích hợp từ điển song ngữ Việt - Anh đầy đủ trong [`vietnam-race-i18n.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vietnam-race-i18n.js).

---

## 11. KẾ HOẠCH TRIỂN KHAI SPRINT 5 (FIX BLANK SCREEN & NON-LINEAR DECELERATION/BRAKING)

### 11.1 Khắc phục Triệt để Lỗi Trắng Màn hình khi Nhấn Ga ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js) & [`app.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/app.js))
- Sửa lỗi gọi sai biến chữ hoa `this.TURN_SPEED` sang `this.turnSpeed` có fallback, triệt tiêu hoàn toàn phép toán `0 * undefined = NaN`.
- Tự động nạp cấu hình `this.applyProfile('player_sport')` ngay lúc khởi tạo `createCar()`.
- Thiết lập chốt an toàn NaN Safety Guard trong `update()` và `updateCamera()` để bảo vệ ma trận ViewMatrix của Three.js.

### 11.2 Mô hình Hãm Phi Tuyến 3 Tầng khi Thả Ga ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js))
- Ở tốc độ siêu cao ($300 - 699\text{ km/h}$): Cản gió siêu thanh phi tuyến kết hợp hãm máy cực đại ghì tốc độ tụt nhanh **$90 - 120\text{ km/h/s}$**.
- Ở dải $150 - 300\text{ km/h}$: Giảm tốc vừa phải $\sim 25 - 35\text{ km/h/s}$.
- Ở dải $< 40\text{ km/h}$: Động cơ nhả ly hợp mượt mà, chỉ còn ma sát lăn cơ học cực nhỏ ($0.15\text{ m/s}^2$), xe trôi êm ái hàng chục mét rồi dừng hẳn.

### 11.3 Phanh Động Lực Khí Động & Chống Giật Lùi ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/car.js))
- Kết hợp độ bám lốp Michelin với lực cản áp suất gió: Phanh cực mạnh ở tốc độ cao ($130 - 160\text{ km/h/s}$), ổn định và êm ái ở tốc độ đô thị ($38\text{ km/h/s}$).
- Chặn đứng hiện tượng đảo chiều tức thì: Đang chạy tới thì phanh chỉ giảm về 0, dừng hẳn xe mới vào số lùi $R$.

### 11.4 Bảng Cấu hình Động cơ & Khí động ([`vehicles-config.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicles-config.js))
- Bổ sung `engineBrakeCoeff` và `hyperAeroCoeff` chuẩn hóa cho từng dòng xe.

### 11.5 Khôi phục Luồng Xe AI Giao thông Trên Mọi Tuyến Phố ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic/traffic.js))
- Khắc phục lỗi biến `PHYSICS_MAX_SPEED` cũ bị `undefined` khiến vận tốc xe NPC thành `NaN`.
- Đồng bộ sang công thức vận tốc chuẩn `nominalTopKmH / 3.6`.
- Thiết lập tọa độ 3D và góc xoay ngay khi sinh xe trong `init()`.
- Bổ sung luồng xe chạy trên Đại lộ Nguyễn Huệ để người chơi thấy xe NPC ngay khi xuất phát.

---

## 12. KẾ HOẠCH TRIỂN KHAI SPRINT 6 (RESTRUCTURE & 3D PARABOLIC FLIGHT INTERACTION)

### 12.1 Tái Cấu Trúc Toàn Diện Dự Án (Modular Directory Layout)
- Tuân thủ nghiêm ngặt **Mục 4 `_MAX-RULES.md`**: Phân chia thành 8 thư mục con chuyên trách: `core/`, `vehicle/`, `world/`, `traffic/`, `ui/`, `assets/`, `css/`, `docs/`.
- Cập nhật 6 tầng nạp phụ thuộc trong [`vietnam-race.html`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race.html).

### 12.2 Vật Lý Tương Tác Va Chạm Bay 3D ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic/traffic.js))
- Xe máy ($115\text{ kg}$) nhận $93\%$ xung lực khi bị xe người chơi ($1.540\text{ kg}$) tông trúng $\to$ bị hất tung bay lên không trung theo Parabol 3D ($v_y = 8 - 24\text{ m/s}$, cao $3 - 14\text{m}$).
- Xoay nhào lộn hỗn loạn 3 trục (Pitch/Roll/Yaw) trên không trung.
- Rơi đập đất nảy tưng đàn hồi ($e = 0.35$), trượt dài và nằm đổ bẹp góc $85^\circ$ bên lề đường.
- Xe buýt ($9.500\text{ kg}$) nhận $14\%$ lực $\to$ đứng yên bất động, xe người chơi dội ngược lại.
- Tự động hồi phục hiện trường sau $4.5\text{ giây}$ để tiếp tục lưu thông.

---

## 13. KẾ HOẠCH TRIỂN KHAI SPRINT 7 (REAL MAP OSM/GEOJSON PIPELINE & DISTRICT 1 EXPANSION)

### 13.1 Bộ Phân Tích & Dựng Hình Bản Đồ Thực Tế ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Chuyển đổi tọa độ GPS WGS84 (`lat`, `lon`) sang tọa độ 3D mét game thông qua phép chiếu Web Mercator / Equirectangular với tâm mốc góc **Nguyễn Huệ – Lê Lợi – Chợ Bến Thành** ($10.7735^\circ\text{N}, 106.7035^\circ\text{E}$).
- Bộ phân tích đa định dạng: Đọc trực tiếp `.geojson`, `.osm` (XML) và `.json` (Overpass JSON).
- Tự động trích xuất các tuyến đường (`highways`) theo phân cấp: đại lộ ($24\text{m}$), đường chính ($18\text{m}$), đường nhánh ($12\text{m}$), phố đi bộ ($8\text{m}$).
- Đùn khối 3D (`buildings`) đa giác và hộp kiến trúc đô thị theo chiều cao tầng thực tế.
- Hỗ trợ cơ chế Kéo & Thả (Drag & Drop) trực tiếp file bản đồ vào cửa sổ trình duyệt và nạp tức thì.

### 13.2 Bộ Tuyến Phố Thực Tế Mở Rộng Quận 1 (Built-in Saigon District 1 Grid)
- Cung cấp sẵn 20+ tuyến đường trung tâm Sài Gòn (Lê Thánh Tôn, Lý Tự Trọng, Nguyễn Du, Lê Duẩn, Mạc Đĩnh Chi, Đinh Tiên Hoàng, Phan Bội Châu, Phan Chu Trinh, Nguyễn An Ninh, Calmette, Ký Con, Yersin, Phó Đức Chính, Nguyễn Thái Bình, Hồ Tùng Mậu, Ngô Đức Kế, Mạc Thị Bưởi, Đông Du, Lam Sơn, Thi Sách).
- Cho phép người chơi kích hoạt ngay mà không cần đợi tải file.

### 13.3 Đồng Bộ Hóa Hệ Thống Radar & AI Giao Thông
- Radar Minimap 2D tự động cập nhật mọi cung đường mới được import hoặc mở rộng.
- AI Traffic tự động kích hoạt luồng tuần tra và di chuyển trên các tuyến phố thực tế mới.

---

## 14. KẾ HOẠCH TRIỂN KHAI SPRINT 8 (PERMANENT REAL OSM MAP & ROAD CLEARANCE GUARD)

### 14.1 Triệt Tiêu Hoàn Toàn Bản Đồ Tạm Thời ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js))
- Xóa bỏ hoàn toàn hàm `buildRoads()` và `buildCityBlocks()` chứa các tuyến đường và block nhà giả lập cũ.
- Tái định vị tất cả Landmark 3D theo tọa độ GPS vệ tinh thực tế:
  - Bitexco: `(108.6, 0, 219.7)`
  - Chợ Bến Thành: `(-672.6, 0, 77.7)`
  - Nhà thờ Đức Bà: `(-447.8, 0, -681.2)`
  - Bưu điện Trung tâm TP: `(-359.8, 0, -692.7)`
  - Dinh Độc Lập: `(-869.8, 0, -410.7)`
  - Cầu Ba Son: `(551.2, 0, -775.2)`
- Mở rộng mặt nền đô thị lên $3.600\text{m} \times 3.600\text{m}$, đưa Sông Sài Gòn về đúng phía Đông ($X > 345$).

### 14.2 Thuật Toán Bảo Vệ Mặt Đường Thông Thoáng (Road Clearance Guard) ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Kiểm tra khoảng cách hình học từ mỗi tòa nhà tới các đoạn tim đường thực tế:
  $$d < \frac{w_{\text{road}}}{2} + \frac{\max(w_{\text{bld}}, d_{\text{bld}})}{2} + 2.0\text{m} \implies \text{DROPPED}$$
- Loại bỏ $100\%$ các tòa nhà lấn lòng đường, chỉ giữ lại các tòa nhà nằm hoàn toàn trên vỉa hè / trong ô phố.
- Tự động nạp trực tiếp `saigon-d1-data.js` ngay lúc mở trang web.

### 14.3 Tái Định Vị Xe Người Chơi & Luồng Xe AI
- Xe người chơi xuất phát chuẩn trên phố đi bộ Nguyễn Huệ `(-160, 0, -220)` hướng ra Bến Bạch Đằng ($yaw = 0.82\text{ rad}$).
- Xe NPC tuần tra dọc các đại lộ Nguyễn Huệ, Lê Lợi, Tôn Đức Thắng, Hàm Nghi, Đồng Khởi.
- HUD tự động hiển thị tên phố thực tế khi xe lướt qua.

---

## 15. KẾ HOẠCH TRIỂN KHAI SPRINT 9 (NETWORK INTERSECTION NAVIGATION & ORGANIC LANE CHANGING)

### 15.1 Điều Hướng Liên Tục Qua Các Ngã Tư Ngã Ba ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic/traffic.js))
- Xóa bỏ cơ chế `progress` bị wrap loop cục bộ trên một đoạn đường ngắn.
- Xây dựng thuật toán `transitionToNextRoad(v)`: Tìm kiếm các đoạn đường nối tiếp trong bán kính 16m tại mút kết thúc.
- Xác suất rẽ nhánh: $72\%$ ưu tiên giữ cùng trục đường (chạy thẳng đại lộ), $28\%$ rẽ sang các đường giao cắt (Lê Lợi, Đồng Khởi, Ngô Đức Kế, Hải Triều...).
- Mượt hóa chuyển hướng góc lái `currentYaw` theo thời gian thực để xe vào cua êm ái, không bị teleport hay giật hình.

### 15.2 Hệ Thống Chuyển Làn Hữu Cơ (Organic Lane Changing) ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic/traffic.js))
- Bộ đếm thời gian chuyển làn tự nhiên `laneTimer` ($3.5\text{s} - 8.5\text{s}$).
- Xe máy định kỳ lượn chuyển giữa làn sát lề và làn giữa ($0.22w - 0.38w$), kèm hiệu ứng nghiêng thân xe tự nhiên (`tiltZ`).
- Ô tô/Taxi chọn làn giữa và làn trong, chủ động né và vượt xe phía trước mượt mà.

---

## 16. KẾ HOẠCH TRIỂN KHAI SPRINT 10 (SIGNED REVERSE SPEED & FORWARD-ONLY NITRO LOCKOUT)

### 16.1 Đồng Hồ Vận Tốc Âm Khi Đi Lùi ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicle/car.js))
- Trả về số nguyên có dấu $v_{\text{km/h}} = \text{round}(v \times 3.6)$.
- Khi xe lùi, đồng hồ HUD hiển thị trực tiếp giá trị âm (ví dụ: `-12`, `-25` KM/H), phản ánh chính xác trạng thái chuyển động lùi.

### 16.2 Phản Lực Tên Lửa Nitro Luôn Tiến ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicle/car.js))
- Nitro kích hoạt mọi lúc khi giữ `Shift` hoặc chạm nút Boost trên màn hình (kể cả khi đứng yên ở 0 km/h).
- Phản lực tên lửa cực đại luôn hướng thẳng về phía đầu xe theo vector chỉ hướng, không bao giờ phóng giật lùi.

---

## 17. KẾ HOẠCH TRIỂN KHAI SPRINT 11 (SPATIAL CHUNK CULLING, ZERO BOUNDS & GTA TRAFFIC BUBBLE)

### 17.1 Triệt Tiêu Giới Hạn Bounding Box Bức Tường Ảo ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicle/car.js), [`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js))
- Xóa bỏ hoàn toàn kiểm tra biên cứng nhân tạo trong xe và collider bờ kè 3.6km. Xe tự do phóng xuyên suốt toàn bộ bản đồ mở Sài Gòn mà không bị va phải bức tường vô hình.

### 17.2 Tối Ưu Hóa Phân Ô Không Gian Spatial Chunk Grid Culling ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js), [`app.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/core/app.js))
- Chia bản đồ quận 1 thành lưới ô $250\text{m} \times 250\text{m}$ (Spatial Chunks).
- Nâng dung lượng sinh nhà lên $3,400+$ tòa nhà dày đặc chân thực với kiểm tra hành lang đường nghiêm ngặt.
- Culling động: Trong vòng lặp render, chỉ giữ hiển thị (`visible = true`) các ô nằm trong bán kính $1.2\text{km}$ quanh xe người chơi, ẩn toàn bộ ô xa xôi để giữ vững tốc độ khung hình mượt mà $60\text{ FPS}$.

### 17.3 Bong Bóng Giao Thông Liên Tục Kiểu GTA (GTA-Style Traffic Bubble) ([`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic/traffic.js))
- Duy trì cố định $45 - 64$ phương tiện AI (xe máy, giao hàng, taxi, buýt) trong bong bóng bán kính $350\text{m} - 400\text{m}$ quanh người chơi.
- Khi xe NPC dạt xa quá $420\text{m}$ hoặc gặp ngõ cụt: tự động tái sinh (recycle) lên cung đường phía trước người chơi ($120\text{m} - 380\text{m}$) theo hướng di chuyển của camera. Đường phố luôn tấp nập xe cộ bất kể người chơi lái xe đến góc nào của thành phố.

---

## 18. KẾ HOẠCH TRIỂN KHAI SPRINT 12 (MINIMAP 2X ZOOM, REAL CURVED RIVER, SCALED TREES & BA SON BRIDGE)

### 18.1 Radar Minimap Phóng To Gấp Đôi & Zoom Out Thích Ứng Tốc Độ ([`minimap.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/ui/minimap.js), [`vietnam-race.css`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/css/vietnam-race.css))
- Mở rộng kích thước radar từ $140\text{px}$ lên $270\text{px}$ (mobile từ $110\text{px}$ lên $170\text{px}$) với viền neon phản quang.
- Cơ chế camera zoom thích ứng vận tốc: Khi xe tăng tốc từ 0 đến $130+\text{ km/h}$, radar tự động zoom out mượt mà từ $1.0\times$ tới mức tối đa $2.0\times$ (mở rộng tầm quan sát từ $350\text{m}$ lên $700\text{m}$ phía trước).

### 18.2 Tái Tạo Đa Giác Mặt Nước Sông Sài Gòn Thực Tế ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js), [`minimap.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/ui/minimap.js))
- Loại bỏ hoàn toàn khối hộp phẳng vuông cũ và gờ tường thẳng.
- Trích xuất 104 đỉnh đường bao thực tế của Sông Sài Gòn từ OSM GeoPackage, dựng mặt nước uốn lượn tự nhiên theo bờ kè Bến Bạch Đằng, Tôn Đức Thắng đến Bến Vân Đồn trên cả không gian 3D lẫn Minimap 2D.

### 18.3 Hệ Thống Cây Xanh Mở Rộng & Dao Động Kích Thước 75% - 125% ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js))
- Nâng số lượng cây xanh lên hơn $250+$ cây, phủ xanh đại lộ Nguyễn Huệ, Lê Lợi, Hàm Nghi, rặng dừa Bến Bạch Đằng, Công viên 23/9 và Công viên Tao Đàn.
- Mỗi cây được gán ngẫu nhiên tỉ lệ co giãn $\text{scale} \in [0.75, 1.25]$ ($75\% - 125\%$) cùng góc xoay tự nhiên, xóa bỏ sự rập khuôn của mô hình máy móc.

### 18.4 Cập Nhật Vị Trí & Kiến Trúc Cầu Ba Son (Thủ Thiêm 2) ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js))
- Xóa bỏ khối dầm cầu lơ lửng sai góc $0.55\text{ rad}$ và sai cao độ cũ.
- Tái cấu trúc chuẩn xác theo tọa độ tim đường OSM bắc qua sông từ $(551, -775)$ sang Thủ Thiêm $(990, -525)$ với góc nghiêng $1.05\text{ rad}$.
- Dựng trụ tháp cánh cung nghiêng trắng muốt cao 76m tại trụ mố $(620, -735)$, hệ thống 16 dây văng rẻ quạt và lan can bảo vệ hai bên thành cầu.

---

## 19. KẾ HOẠCH TRIỂN KHAI SPRINT 13 (EXPANSIVE METROPOLITAN SAIGON MAP 11KM X 11KM - 13,400+ ROADS)

### 19.1 Mở Rộng Dữ Liệu Bản Đồ Đô Thị Cực Đại 11km × 11km ([`saigon-d1-data.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/assets/saigon-d1-data.js))
- Trích xuất toàn diện mạng lưới giao thông từ file GeoPackage gốc với hơn **13,431 cung đường thực tế** phủ khắp diện tích $121\text{ km}^2$.
- Kết nối thông suốt toàn bộ Quận 1, Quận 3, Quận 4, Quận 5 (Chợ Lớn), Quận 7 (Phú Mỹ Hưng), Quận 10, Bình Thạnh, Phú Nhuận và toàn bộ bán đảo Thủ Thiêm qua các đại lộ lớn: Mai Chí Thọ, Võ Văn Kiệt, Xa Lộ Hà Nội, Điện Biên Phủ, Nguyễn Văn Linh.
- Dung lượng file tối ưu chỉ **4.22 MB**, nạp tức thì trong vòng 0.3s.

### 19.2 Phân Ô Không Gian Spatial Chunk Cho Toàn Bộ 13,400+ Mặt Đường ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Nhúng các dải mặt đường và vạch kẻ tim đường vào trực tiếp lưới ô không gian `chunk.group` ($250\text{m} \times 250\text{m}$).
- Thuật toán `updateCulling` tự động ẩn toàn bộ các mặt đường và khối nhà nằm ngoài phạm vi $1.2\text{km}$ quanh xe người chơi, cắt giảm draw calls từ 25,000+ xuống ~1,200, đảm bảo $60\text{ FPS}$ tuyệt đối.

### 19.3 Mở Rộng Nền Đất 20km × 20km & Cắt Tỉa Radar Minimap Siêu Tốc ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js), [`minimap.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/ui/minimap.js))
- Mở rộng tấm nền địa hình từ $4.2\text{km}$ lên $20.0\text{km} \times 20.0\text{km}$, đảm bảo không bao giờ bị hụt chân trời khi phóng xe xuyên các quận.
- Minimap 2D tích hợp bộ lọc nhanh `Math.abs(rd.midX - car.x) > maxRadarDist`, chỉ vẽ ~200 con đường quanh xe thay vì vẽ cả 13,400 đường, giữ thời gian render của radar dưới $0.1\text{ms}$.

---

## 20. KẾ HOẠCH TRIỂN KHAI SPRINT 14 (AUTOMATED PROCEDURAL BUILDINGS, SCALED TREES & LANDMARK ORIENTATION)

### 20.1 Xóa Sạch Nhà Cũ & Căn Chỉnh Hướng 6 Biểu Tượng Sài Gòn ([`map-saigon.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/map-saigon.js), [`saigon-d1-data.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/assets/saigon-d1-data.js))
- Trút bỏ hoàn toàn 3,359 polygon nhà tĩnh trong `saigon-d1-data.js` (file giảm còn 3.21 MB).
- Căn chỉnh hướng và vị trí 6 Landmark theo thực địa:
  - Bitexco: Helipad quay hướng $0.78\text{ rad}$ ra sông Sài Gòn.
  - Chợ Bến Thành: Tháp đồng hồ hướng $2.1\text{ rad}$ ra Lê Lợi / Quách Thị Trang.
  - Nhà thờ Đức Bà: Tháp chuông hướng $-0.78\text{ rad}$ về Đồng Khởi.
  - Bưu điện Trung tâm: Mặt tiền hướng $-\pi/2$ vào công viên.
  - Dinh Độc Lập: Mặt tiền lớn hướng $2.14\text{ rad}$ xuống Lê Duẩn.
  - Cầu Ba Son: Nhịp nghiêng $1.05\text{ rad}$ từ Tôn Đức Thắng sang Thủ Thiêm.

### 20.2 Tự Động Sinh Nhà Phố & Tòa Nhà Dọc Toàn Bộ Cung Đường ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Dựng tự động 13,796 nhà phố và cao ốc dọc hai bên đường trên toàn bộ 13,431 cung đường khắp 7 quận.
- Mặt tiền xoay theo góc đường `rd.angle`, tạo thành các tuyến phố sầm uất liên tục.
- 7 biến thể kiến trúc phong phú (bồn nước Tân Á, chuồng cọp, mái tôn xanh, ngói Pháp cổ, ban công, cửa cuốn mái hiên, khối kính).
- Phân vào 1,844 ô Spatial Chunks ($250\text{m} \times 250\text{m}$) với bán kính culling $1.2\text{km}$.

### 20.3 Tự Động Trồng Cây Trên Các Tuyến Đại Lộ Lớn ($\ge 4$ Làn Đường) ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Tự động nhận diện đường $w \ge 18\text{m}$ (`primary`, `secondary`, `tertiary`, `trunk`).
- Trồng 8,109 cây xanh đô thị dọc vỉa hè.
- Kích thước dao động ngẫu nhiên $75\% - 125\%$ (`scale = 0.75 - 1.25`), góc xoay $360^\circ$.
- Đa dạng chủng loại: Xà cừ, Phượng vĩ hoa đỏ, Dừa ven sông.

### 20.4 Tối Ưu Hóa Tuyệt Đối Va Chạm Xe ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicle/car.js))
- Bổ sung bộ lọc khoảng cách AABB nhanh $35\text{m}$ trong vòng lặp va chạm, giúp xử lý 21,900+ collider trong thành phố chỉ tốn $0.07\text{ms/frame}$.

---

## 21. KẾ HOẠCH TRIỂN KHAI SPRINT 15 (REAL TRAFFIC SIGNALS, MAP BUILDINGS, STREET-FACING ORIENTATION & OBB COLLISION)

### 21.1 Đèn Giao Thông Thực Tế Từ Dữ Liệu OSM ([`saigon-signals-data.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/assets/saigon-signals-data.js), [`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Trích xuất 1,448 vị trí đèn giao thông (`traffic_signals`) từ GeoPackage trong vùng 11km × 11km.
- Cột đèn 3 màu được đặt đúng tọa độ ngã tư, xoay hướng đón làn xe chạy.

### 21.2 Nhà Bản Đồ & Tự Động Bù Lấp Nhà Phố ([`saigon-buildings-data.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/assets/saigon-buildings-data.js), [`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Trích xuất 4,555 khối nhà thực tế từ OSM đa giác.
- Tự động fill nhà phố dọc các cung đường còn trống dữ liệu, phân vào Spatial Chunks với 7 biến thể.

### 21.3 Sửa Lỗi Hướng Nhà: Quay Vuông Góc Ra Mặt Đường ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Bên trái đường: $\theta = \text{angle} - \pi/2$ (mặt tiền quay vào lòng đường).
- Bên phải đường: $\theta = \text{angle} + \pi/2$ (mặt tiền quay vào lòng đường).

### 21.4 Đèn Đường Cao Áp & Cây Cối Lề Đường ([`osm-loader.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/world/osm-loader.js))
- Cột đèn cao áp thép 9m đặt trên mép vỉa hè (`offset = (w/2) + 1.2m`), cần vươn ra lòng đường.
- Cây cối đặt trên vỉa hè (`offset = (w/2) + 2.2m`), dao động kích thước 75% - 125%, xoay 360 độ.

### 21.5 Hệ Thống Va Chạm Oriented Bounding Box (OBB) ([`car.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/vehicle/car.js))
- Chiếu vị trí xe vào hệ tọa độ cục bộ của khối nhà bằng ma trận xoay 2D `cosA, sinA`.
- Kiểm tra va chạm chính xác theo từng mép tường xoay, triệt tiêu hoàn toàn lỗi đâm phải khoảng không vô hình ("chưa chạm đã đụng").





