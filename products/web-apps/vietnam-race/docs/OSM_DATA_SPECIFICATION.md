# QUY CHUẨN ĐẶC TẢ DỮ LIỆU BẢN ĐỒ OPENSTREETMAP: VIETNAM RACE 3D
> **Tài liệu đặc tả kỹ thuật:** Toàn bộ thông tin trích xuất từ dữ liệu OpenStreetMap (OSM GeoPackage), cơ chế chuyển đổi không gian 3D và danh mục các trường thông tin tiềm năng.

---

## 1. TỔNG QUAN VỀ DỮ LIỆU BẢN ĐỒ (OSM ARCHITECTURE)

File dữ liệu bản đồ mở `planet_106.64_10.722_a6f6683e.osm.geopackage` thực chất là một cơ sở dữ liệu địa lý tiêu chuẩn **SQLite 3**, lưu trữ toàn bộ hệ thống thực thể không gian của vùng đô thị TP. Hồ Chí Minh ($33\text{km} \times 24\text{km}$, diện tích $> 700\text{ km}^2$).

Dữ liệu được tổ chức thành 4 bảng chính:
1. **`lines` (121,264 đối tượng):** Chứa toàn bộ mạng lưới tim đường giao thông, cầu cống, đường ray tàu hỏa/metro, ranh giới hành chính, bờ kè.
2. **`multipolygons` (84,790 đối tượng):** Chứa đa giác móng nhà, công trình kiến trúc, mặt nước sông hồ, công viên, khu công nghiệp, cảng biển.
3. **`points` (hàng chục nghìn điểm):** Chứa tọa độ các tiện ích đơn lẻ: cây xăng, cột đèn tín hiệu giao thông, trạm xe buýt, camera tốc độ, điểm ngắm cảnh.
4. **`other_relations`:** Chứa quan hệ phân luồng tuyến xe buýt, quan hệ hạn chế rẽ tại ngã tư.

---

## 2. NHỮNG THÔNG TIN ĐANG ĐƯỢC ĐỌC & DỰNG VÀO GAME HIỆN TẠI

### 2.1 Mạng Lưới Giao Thông & Phân Cấp Làn Đường (`lines`)

Mỗi con đường được lưu trữ dưới dạng một chuỗi tọa độ `LineString` kèm thuộc tính phân cấp:

| Thuộc tính OSM | Định nghĩa thực tế | Chiều rộng trong game | Số làn & Phân cấp kỹ thuật |
| :--- | :--- | :--- | :--- |
| `highway: 'motorway'` / `'trunk'` | Cao tốc, Đại lộ trục chính (Võ Văn Kiệt, Mai Chí Thọ) | **$24.0\text{m}$** | $6 - 8$ làn xe, tốc độ $80 - 120\text{ km/h}$, dải phân cách cứng giữa. |
| `highway: 'primary'` | Trục xuyên tâm huyết mạch (Lê Lợi, Tôn Đức Thắng, Điện Biên Phủ) | **$24.0\text{m}$** | $6$ làn xe, có vạch sơn vàng phân cách ngược chiều. |
| `highway: 'secondary'` / `'tertiary'` | Đường liên quận/phường (Hai Bà Trưng, Pasteur, Nam Kỳ Khởi Nghĩa) | **$18.0\text{m}$** | $4$ làn xe tiêu chuẩn nội đô. |
| `highway: 'residential'` / `'service'` | Đường khu dân cư, ngõ hẻm lớn | **$12.0\text{m}$** | $2$ làn xe hỗn hợp. |
| `highway: 'pedestrian'` | Phố đi bộ quảng trường (Nguyễn Huệ) | **$26.0\text{m}$** | Dải quảng trường trung tâm $12\text{m}$ lát đá hoa cương, 2 làn xe rìa. |
| `name` | Tên đường chính thức | Gắn vào HUD hiển thị tên phố và làm khóa tìm đường ngã tư. |

#### Thuật toán quy đổi tọa độ GPS sang mét 3D:
Dữ liệu GPS $(\text{lon}, \text{lat})$ được chiếu phẳng theo hệ trục Descartes với gốc tọa độ đặt tại UBND TP.HCM ($106.7035^\circ\text{E}, 10.7735^\circ\text{N}$):
$$X = (\text{lon} - 106.7035) \times 109,380\text{m}$$
$$Z = -(\text{lat} - 10.7735) \times 111,320\text{m}$$
Tại mỗi phân đoạn $P_1 \to P_2$, engine tính vector hướng, chiều dài $L$ và góc phương vị $\theta = \text{atan2}(\Delta X, \Delta Z)$ để sinh `THREE.PlaneGeometry(width, L)`.

---

### 2.2 Công Trình Nhà Cửa & Quy Chuẩn Kích Thước (`multipolygons`)

Mỗi căn nhà được lưu trữ bằng một đa giác khép kín (`Polygon`) mô tả chính xác móng nhà:

1. **Kích thước mặt bằng (Footprint Bounding Box):**
   - Chiều ngang: $w = \max(x) - \min(x)$.
   - Chiều sâu: $d = \max(z) - \min(z)$.
   - Nhà ống/nhà phố: $w \approx 5\text{m} - 15\text{m}$, $d \approx 12\text{m} - 25\text{m}$.
   - Tòa nhà thương mại / chung cư: $w \approx 40\text{m} - 75\text{m}$, $d \approx 40\text{m} - 75\text{m}$.

2. **Chiều cao & Số tầng (`building:levels`):**
   - Đọc trực tiếp số tầng thực tế từ OSM:
     $$H_{\text{tòa nhà}} = \text{levels} \times 3.6\text{m}$$
   - Nếu dữ liệu khuyết số tầng: Công trình có tên $\to 6$ tầng ($21.6\text{m}$); nhà dân vô danh $\to 3 - 5$ tầng ngẫu nhiên ($10.8\text{m} - 18.0\text{m}$).

3. **7 Biến thể kiến trúc Việt Nam:**
   Tự động sinh chi tiết trên nóc: bồn nước inox Tân Á, chuồng cọp sắt phơi đồ, mái tôn dốc xanh/đỏ, ban công đua ra ngoài ngõ, biển hiệu quảng cáo tầng trệt.

4. **Hành lang an toàn giao thông (Road Clearance Guard):**
   Mỗi khối nhà bắt buộc thỏa mãn điều kiện cách tim đường:
   $$\text{Dist}(P_{\text{nhà}}, P_{\text{đường}}) \ge \frac{W_{\text{đường}}}{2} + \frac{\max(w, d)}{2} + 2.0\text{m (khoảng lùi vỉa hè)}$$
   Bảo đảm 100% không có bất kỳ khối nhà nào mọc lấn vào lòng đường.

---

### 2.3 Phân Định Mặt Nước & Đất Liền (`natural: 'water'`)

- **Vùng nước:** Trích xuất các đa giác có thẻ `natural = 'water'`, `waterway = 'riverbank'` hoặc `name = 'Sông Sài Gòn'`.
- Dựng thành đa giác mặt nước uốn lượn 104 đỉnh (`THREE.ShapeGeometry`) cao độ $Y = 0.02\text{m}$, có độ nhám $0.15$ và độ phản chiếu kim loại $0.65$ màu xanh sẫm `#1f4e5b`.
- **Đất liền:** Toàn bộ vùng không có nước được bao phủ bởi tấm nền đô thị phẳng $20\text{km} \times 20\text{km}$.

---

### 2.4 Cầu Vượt Sông (`bridge: 'yes'`)

- Lọc các tuyến đường vượt sông có thuộc tính `bridge = 'yes'` và nhận diện `Cầu Ba Son` kết nối bờ Q1 $(551, -775)$ với bờ Thủ Thiêm $(990, -525)$.
- Góc phương vị $\theta = 1.05\text{ rad}$ ($60.3^\circ$), dựng trụ tháp cánh cung nghiêng $76\text{m}$, 16 dây văng đối xứng và hệ lan can bảo vệ hai bên thành cầu.

---

## 3. CÁC THÔNG TIN TIỀM NĂNG TRONG FILE CHƯA ĐƯỢC LIỆT KÊ & KHAI THÁC

Trong file `.gpkg` còn chứa **rất nhiều trường thông tin giá trị cao** mà các hệ thống game đua xe thế giới mở (như GTA hay Need For Speed) có thể tận dụng tiếp:

---

### 3.1 Nhóm Thuộc Tính Giao Thông Nâng Cao (Advanced Traffic Attributes)

1. **Đường Một Chiều (`oneway: 'yes'` / `'no'` / `'-1'`):**
   - **Thực tế Sài Gòn:** Trung tâm Q1 có mạng lưới đường 1 chiều dày đặc (Lý Tự Trọng, Lê Thánh Tôn, Nguyễn Du, Pasteur, Nam Kỳ Khởi Nghĩa...).
   - **Ứng dụng:** Ép toàn bộ luồng xe NPC AI chỉ được phép chạy đúng một chiều quy định, người chơi nếu chạy ngược chiều sẽ kích hoạt cảnh báo vi phạm giao thông hoặc tăng độ khó va chạm.

2. **Giới Hạn Tốc Độ (`maxspeed`):**
   - Ví dụ: `maxspeed: '80'` trên Đại lộ Võ Văn Kiệt / Mai Chí Thọ; `maxspeed: '50'` trong nội đô; `maxspeed: '120'` trên cao tốc Long Thành.
   - **Ứng dụng:** Đồng hồ HUD hiển thị biển báo tốc độ tối đa của từng đoạn đường; xe NPC tự động điều chỉnh tốc độ tuần tra bám sát biển báo.

3. **Chất Liệu Mặt Đường (`surface`):**
   - `surface: 'asphalt'` (nhựa đường): Hệ số ma sát cao, xe chạy êm, tiếng lốp rít mượt.
   - `surface: 'paving_stones'` (đá lát hoa cương phố đi bộ): Ma sát thấp hơn, tiếng lốp lộc cộc.
   - `surface: 'concrete'` (đường bê tông): Độ bám đường trung bình, tạo cảm giác dằn nhẹ.
   - `surface: 'unpaved'` / `'ground'` (đường đất ngoại thành): Hệ số ma sát giảm mạnh, xe dễ drift trượt bánh và tung bụi đất mịt mù.

4. **Hầm Chui Ngầm (`tunnel: 'yes'`, `layer: '-1'`):**
   - **Điển hình:** **Hầm Thủ Thiêm (Hầm vượt sông Sài Gòn)** dài 1,490m nối Quận 1 với Bán đảo Thủ Thiêm.
   - **Ứng dụng:** Khi xe chạy vào hầm ngầm, hạ cao độ $Y$ xuống âm ($-5.0\text{m}$ đến $-8.0\text{m}$), tắt ánh sáng mặt trời, bật hệ thống đèn chiếu sáng vòm hầm màu cam vàng và hiệu ứng tiếng pô xe dội âm vang (Reverb).

5. **Cầu Vượt Thép Trên Cao (`layer: '1'`, `layer: '2'`):**
   - Các nút giao cầu vượt thép: Cầu vượt Hàng Xanh, Cầu vượt Lăng Cha Cả, Cầu vượt Nguyễn Tri Phương.
   - **Ứng dụng:** Nâng cao độ mặt cầu lên $+6.0\text{m} \to +10.0\text{m}$ so với mặt đường bên dưới, tạo ra các tầng giao thông đan xen lập thể nhiều tầng.

6. **Phân Luồng Phương Tiện Chi Tiết (`motorcycle`, `motorcar`, `bicycle`):**
   - `motorcycle: 'designated'`: Làn đường dành riêng cho xe máy (như làn xe máy dải phân cách riêng trên đường Võ Văn Kiệt).
   - `motorcar: 'no'`: Cấm ô tô (ngõ nhỏ hoặc cầu sắt cũ như Cầu Mống).
   - **Ứng dụng:** Ngăn ô tô AI đi vào ngõ hẹp, tập trung mật độ xe máy lạng lách trên các làn hỗn hợp.

---

### 3.2 Nhóm Tiện Ích & Điểm Tương Tác Đường Phố (Street Furniture & POIs)

Bảng `points` và `amenity` chứa tọa độ hàng nghìn tiện ích thực:

1. **Đèn Tín Hiệu Giao Thông (`highway: 'traffic_signals'`):**
   - Tọa độ chính xác của mọi cụm đèn giao thông tại các ngã tư ngã năm ngã sáu.
   - **Ứng dụng:** Dựng cột đèn tín hiệu 3 màu (Xanh - Vàng - Đỏ) hoạt động theo chu kỳ đếm ngược thời gian thực, xe AI dừng chờ đèn đỏ và phóng đi khi đèn xanh.

2. **Vạch Sang Đường Cho Người Đi Bộ (`highway: 'crossing'`):**
   - Vị trí vạch sơn ngựa vằn qua đường.
   - **Ứng dụng:** Vẽ vạch sơn trắng sang đường và bố trí người đi bộ (Pedestrians) qua đường.

3. **Cây Xăng / Trạm Nhiên Liệu (`amenity: 'fuel'`):**
   - Các cây xăng Petrolimex, Comeco, Mipec dọc các trục đường lớn.
   - **Ứng dụng:** Trở thành trạm nạp đầy bình Nitro (Boost Refill) và trạm sửa chữa hồi phục máu ($100\%$ HP) khi xe bị va quẹt hư hỏng.

4. **Bãi Đỗ Xe (`amenity: 'parking'`):**
   - Vị trí các bãi đỗ xe ô tô công cộng hoặc tầng hầm.
   - **Ứng dụng:** Khu vực spawn các dòng siêu xe thể thao hiếm cho người chơi đổi xe dọc đường.

5. **Camera Bắn Tốc Độ (`highway: 'speed_camera'`):**
   - Vị trí các camera giám sát giao thông thực tế của CSGT TP.HCM.
   - **Ứng dụng:** Kích hoạt cảnh báo tốc độ trên HUD khi xe chạy quá tốc độ quy định.

6. **Trạm Dừng Xe Buýt (`highway: 'bus_stop'`):**
   - Điểm dừng xe buýt nội đô.
   - **Ứng dụng:** Dựng nhà chờ xe buýt có mái che màu xanh lá cây đặc trưng TP.HCM, làm điểm đón trả khách.

---

### 3.3 Nhóm Phân Khu Chức Năng & Địa Cảnh Sinh Thái (Zoning & Landuse)

Bảng `multipolygons` chứa ranh giới các phân khu đô thị lớn:

1. **Công Viên Cây Xanh (`leisure: 'park'`, `landuse: 'grass'`):**
   - Đa giác ranh giới của: **Công viên Tao Đàn, Công viên 23/9, Công viên Lê Văn Tám, Thảo Cầm Viên, Công viên Bến Bạch Đằng**.
   - **Ứng dụng:** Trải thảm cỏ xanh mướt và tự động rải cây bóng mát rậm rạp theo đúng ranh giới công viên ngoài đời thực.

2. **Khu Cảng Biển & Công Nghiệp Logistics (`landuse: 'industrial'`):**
   - Ranh giới Cảng Khánh Hội, Cảng Tân Thuận ven sông Sài Gòn.
   - **Ứng dụng:** Dựng các dãy cẩu giàn container (Gantry Cranes), các khối container đủ màu sắc và nhà kho bãi cảng biển.

3. **Công Trình Tôn Giáo & Văn Hóa Lịch Sử (`amenity: 'place_of_worship'`, `historic: 'monument'`):**
   - Chùa Vĩnh Nghiêm, Chùa Ngọc Hoàng, Chợ hoa Hồ Thị Kỷ, Tượng đài Trần Hưng Đạo tại Công trường Mê Linh.
   - **Ứng dụng:** Đặt các mô hình văn hóa truyền thống đặc sắc, tăng tính nhận diện bản địa cho từng góc phố.

4. **Tuyến Tàu Điện / Metro Tuyến Số 1 (`railway: 'subway'` / `'rail'`):**
   - Hướng tuyến Metro Bến Thành - Suối Tiên (đi ngầm từ Chợ Bến Thành qua Nhà hát TP, Ba Son rồi ngoi lên cao chạy dọc Xa Lộ Hà Nội).
   - **Ứng dụng:** Dựng đường ray trên cao và cho đoàn tàu Metro 3 toa xanh dương chạy song hành cùng xe người chơi trên Xa lộ Hà Nội.

---

## 4. TỔNG KẾT BẢNG ÁNH XẠ DỮ LIỆU (DATA MAPPING DICTIONARY)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OPENSTREETMAP DATA SOURCE                       │
│  (121,264 Lines | 84,790 MultiPolygons | Points | 70MB SQLite GeoPackage)
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│    ROADS     │             │  BUILDINGS   │             │ WATER & LAND │
│ (13,431 QL)  │             │ (3,359 Nhà)  │             │  (Sông SG)   │
├──────────────┤             ├──────────────┤             ├──────────────┤
│• highway     │             │• building    │             │• natural     │
│• name        │             │• levels      │             │• waterway    │
│• width / lane│             │• footprint   │             │• ground plane│
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              VIETNAM RACE 3D WEB ENGINE (THREE.JS PROCEDURAL)          │
│  • Spatial Chunk Culling 250m x 250m (< 1,200 draw calls @ 60 FPS)     │
│  • GTA-Style Traffic Bubble 48 xe tuần tra liên tục                    │
│  • Radar Minimap Zoom thích ứng vận tốc (1.0x - 2.0x)                  │
│  • Bản đồ mở rộng 11km x 11km kết nối 7 quận Sài Gòn                   │
└────────────────────────────────────────────────────────────────────────┘
```
