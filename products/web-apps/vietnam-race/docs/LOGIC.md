# BẢN QUY CHUẨN LOGIC KHÔNG GIAN & KÍCH THƯỚC: VIETNAM RACE 3D

> **Mục đích:** Tài liệu này thiết lập các **quy tắc logic không gian bất khả xâm phạm** (Spatial Rules), hệ thống phân vùng an toàn (Clearance Masks) và bảng đối chiếu **kích thước thực tế vs kích thước trong game** nhằm giải quyết triệt để các lỗi: nhà mọc trên đường, cây đâm giữa tim đường, kích thước xe/nhà/cây không cân xứng.

---

## 1. ĐỐI CHIẾU KÍCH THƯỚC: THỰC TẾ VS GAME HIỆN TẠI

### 1.1 Bảng phân tích chi tiết

| Thực thể (Entity) | Kích thước Thực tế (Real Life) | Kích thước Prototype Hiện tại | Đánh giá & Chuẩn hóa lại |
| :--- | :--- | :--- | :--- |
| **Xe người chơi (Sedan/SUV)** | - Dài: $4.0\text{m} - 4.5\text{m}$<br/>- Rộng: $1.7\text{m} - 1.85\text{m}$<br/>- Cao: $1.45\text{m} - 1.6\text{m}$<br/>- Bánh xe: $\varnothing 0.60\text{m} - 0.70\text{m}$ | - Dài: $4.4\text{m}$<br/>- Rộng: $2.1\text{m}$<br/>- Cao: $1.55\text{m}$<br/>- Bánh: $\varnothing 0.84\text{m}$ | ⚠️ **Hơi bè ngang và bánh hơi to** (kiểu xe đua drag).<br/>👉 **Chuẩn hóa:** Rộng $1.8\text{m}$, Bánh $\varnothing 0.68\text{m}$ (bán kính $0.34\text{m}$). |
| **Làn đường (Road Lane)** | - Làn ô tô tiêu chuẩn: $3.5\text{m} - 3.75\text{m}$<br/>- Làn hỗn hợp nội đô: $3.0\text{m} - 3.25\text{m}$<br/>- Làn xe máy riêng: $1.8\text{m} - 2.5\text{m}$ | - Đường Nguyễn Huệ: $34\text{m}$<br/>- Đường Lê Lợi: $26\text{m}$<br/>- Đường Đồng Khởi: $18\text{m}$ | ✅ **Rất sát thực tế**.<br/>Đồng Khởi thực tế lòng đường 11m + 2 vỉa hè 3.5m = 18m. Nguyễn Huệ thực tế tổng lộ giới 64m (thu hẹp lại 34m trong game để không bị quá loãng tầm nhìn là hợp lý). |
| **Nhà ống dân cư (Shophouse)** | - Mặt tiền: $4.0\text{m} - 5.5\text{m}$<br/>- Chiều sâu: $12\text{m} - 20\text{m}$<br/>- Tầng: $3.3\text{m} - 3.6\text{m}$/tầng<br/>(Nhà 4 tầng $\approx 14\text{m} - 15\text{m}$) | - Rộng: $12\text{m} - 18\text{m}$<br/>- Sâu: $12\text{m} - 18\text{m}$<br/>- Cao: $14\text{m} - 36\text{m}$ | ⚠️ **Mặt tiền đang to gấp 3 lần nhà ống thật** (đang vẽ thành khối hộp chung 3-4 căn ghép lại).<br/>👉 **Chuẩn hóa:** Chia thành các ô hẹp $4.5\text{m} \times 16\text{m}$ san sát nhau. |
| **Cây xanh đô thị (Xà cừ)** | - Chiều cao: $14\text{m} - 22\text{m}$<br/>- Thân cây: $\varnothing 0.8\text{m} - 1.4\text{m}$<br/>- Tán xòe rộng: $\varnothing 10\text{m} - 16\text{m}$ | - Cao: $6.0\text{m}$<br/>- Thân: $\varnothing 0.6\text{m}$<br/>- Tán: $\varnothing 5.0\text{m}$ | ❌ **Quá bé!** Cây trong prototype như cây non mới trồng cao ngang tầng 2 nhà ống.<br/>👉 **Chuẩn hóa:** Tăng chiều cao lên $12\text{m} - 16\text{m}$, tán rộng $\varnothing 10\text{m} - 12\text{m}$. |
| **Cột đèn cao áp** | - Chiều cao: $8\text{m} - 11\text{m}$<br/>- Cần đèn vươn ra: $1.5\text{m} - 2.0\text{m}$ | - Chưa có kích thước chuẩn | 👉 **Chuẩn hóa:** Cột cao $9.5\text{m}$, chân cột đặt trên vỉa hè cách mép đường $0.5\text{m}$. |
| **Tháp Bitexco** | - Chiều cao thực: **262m** (68 tầng)<br/>- Sân đỗ trực thăng: Tầng 52 (độ cao ~191m) | - Cao: $180\text{m}$<br/>- Sân đỗ: $105\text{m}$ | ⚠️ **Hơi lùn (bằng 70% thực tế)**.<br/>👉 **Chuẩn hóa:** Nâng chiều cao lên $250\text{m} - 260\text{m}$ để tạo cảm giác chọc trời choáng ngợp. |
| **Nhà thờ Đức Bà** | - Tháp chuông cao: **60.5m**<br/>- Dài: 93m, Rộng: 35m | - Tháp chuông: $50\text{m}$<br/>- Thân nhà thờ: $32\text{m} \times 60\text{m}$ | ✅ **Khá chuẩn** (đạt 85% tỉ lệ thực tế). |
| **Chợ Bến Thành** | - Tháp đồng hồ: **28m**<br/>- Diện tích lồng chợ: $130\text{m} \times 100\text{m}$ | - Tháp đồng hồ: $29\text{m}$<br/>- Thân chợ: $45\text{m} \times 55\text{m}$ | ✅ **Tháp đồng hồ cực chuẩn**; thân chợ đang làm gọn lại để vừa ô cờ. |

---

## 2. NGUYÊN TẮC PHÂN VÙNG MẶT BẰNG & MẶT NẠ AN TOÀN (SPATIAL MASKS)

Không gian game chia làm 5 lớp mặt nạ (Layers):

```
┌─────────────────────────────────────────────────────────────┐
│ 5. VÙNG KHỐI NHÀ (BUILDINGS)                                │
│    Cách mép vỉa hè tối thiểu ≥ 1.0m (Khoảng lùi Setback)    │
│ ─────────────────────────────────────────────────────────── │
│ 4. VỈA HÈ (SIDEWALKS) - Rộng 2.5m - 5.0m                    │
│    NƠI DUY NHẤT ĐẶT: Cây xanh, Cột đèn, Thùng rác, Biển báo │
│ ─────────────────────────────────────────────────────────── │
│ 3. MẶT ĐƯỜNG CƠ GIỚI (ROAD CARRIAGEWAY)                     │
│    TUYỆT ĐỐI CẤM: Không nhà, Không cây, Không cột           │
│    Chỉ có: Xe người chơi, Xe AI, Vạch kẻ đường, Nắp cống    │
│ ─────────────────────────────────────────────────────────── │
│ 2. DẢI PHÂN CÁCH GIỮA (MEDIAN STRIP) - Rộng 1.5m - 3.0m     │
│    Chỉ có: Hàng rào bê tông Jersey, Cột đèn đôi, Bụi hoa    │
│ ─────────────────────────────────────────────────────────── │
│ 1. MẶT NƯỚC (WATER) / BỜ KÈ (EMBANKMENT)                    │
│    Cách mép đường tối thiểu ≥ 3.0m có lan can bảo vệ         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. LOGIC SINH NHÀ (BUILDING GENERATION & ROAD SETBACK)

### 3.1 Quy tắc 1: Kiểm tra khoảng cách hình học tới tim đường (Distance-to-Centerline Check)
Một tòa nhà có tọa độ tâm $(bx, bz)$ và bán kính đường bao $R_{building}$ **CHỈ ĐƯỢC PHÉP SINH RA** khi:
$$\text{Dist}(P_{bld}, \text{Segment}_{road}) \ge \frac{W_{road}}{2} + W_{sidewalk} + \text{Setback}$$
- $W_{road}$: Chiều rộng lòng đường cơ giới (ví dụ: Lê Lợi = 26m $\to W/2 = 13\text{m}$).
- $W_{sidewalk}$: Chiều rộng vỉa hè đô thị ($3.0\text{m} - 5.0\text{m}$).
- $\text{Setback}$ (Khoảng lùi xây dựng quy định): Tối thiểu $1.5\text{m}$.
- $\implies$ Khoảng cách tối thiểu từ tâm đường đến chân tường nhà: $\ge 13 + 3.5 + 1.5 = 18.0\text{m}$.
- **Hành động khi vi phạm:** Bỏ qua hoàn toàn (Skip) không render khối nhà đó, hoặc xén đa giác (Polygon Clipping).

### 3.2 Quy tắc 2: Vùng cấm Landmark (Landmark Exclusion Zone)
- Các công trình đặc biệt (Bitexco, Chợ Bến Thành, Nhà thờ Đức Bà) có bán kính bảo vệ $R_{clearance}$ ($35\text{m} - 60\text{m}$).
- Mọi thuật toán sinh nhà ngẫu nhiên nếu có tâm nằm trong hình tròn:
  $$(bx - lx)^2 + (bz - lz)^2 < R_{clearance}^2$$
  $\implies$ **Bắt buộc bị hủy bỏ ngay lập tức** để tránh nhà ngẫu nhiên đâm xuyên vào Landmark.

---

## 4. LOGIC ĐẶT CÂY XANH & TIỆN ÍCH ĐƯỜNG PHỐ (STREET FURNITURE)

### 4.1 Quy tắc 1: Cây ven đường CHỈ ĐƯỢC NẰM TRÊN VỈA HÈ
- **Vị trí hợp lệ:** Nằm trên đường song song với tim đường, có độ lệch ngang (lateral offset):
  $$\text{Offset}_{tree} = \pm \left( \frac{W_{road}}{2} + 0.8\text{m} \right)$$
  *(Đặt cách mép bó vỉa $0.8\text{m}$ về phía vỉa hè, thẳng hàng với dải cây).*
- **Khoảng cách dọc giữa 2 cây (Longitudinal Spacing):** $15\text{m} - 25\text{m}$/cây đối với cây xà cừ lớn, không trồng quá sát ngã tư làm che khuất tầm nhìn xe rẽ.

### 4.2 Quy tắc 2: Cột đèn đường cao áp
- Đặt so le hai bên vỉa hè hoặc đặt dọc theo dải phân cách giữa (Median strip).
- Khoảng cách dọc chuẩn: $30\text{m} - 40\text{m}$/cột.
- Đèn vươn cần chìa bóng sáng vào phía lòng đường góc nghiêng $15^\circ$.

---

## 5. LOGIC PHÂN CẤP ĐƯỜNG & CAO ĐỘ (ELEVATION & BRIDGES)

### 5.1 Quy tắc ưu tiên cao độ tại nút giao (Intersection Layering)
Khi hai con đường cắt nhau không cùng mức:
- **Đường cấp cao hơn nằm trên:** Đường cao tốc / Cầu vượt thép (`layer = 1`, cao độ $+6.0\text{m}$ đến $+12.0\text{m}$) nằm trên đường nội bộ mặt đất (`layer = 0`, cao độ $0.05\text{m}$).
- **Hầm chui ngầm (`layer = -1`):** Cao độ dốc xuống $-5.5\text{m}$ đến $-7.0\text{m}$.
- **Tránh nhấp nháy đa giác (Z-Fighting) khi cùng mức:** Dùng `polygonOffset` hoặc cộng chênh lệch cao độ $0.01\text{m}$ giữa các cấp đường:
  - Cao tốc/Trục chính: $Y = 0.07\text{m}$
  - Đường liên quận: $Y = 0.06\text{m}$
  - Phố nhánh: $Y = 0.05\text{m}$
  - Ngõ hẹp: $Y = 0.04\text{m}$

---

## 6. LOGIC VẬT LÝ XE & HỆ THỐNG GIAO THÔNG AI (PHYSICS & TRAFFIC LOGIC)

### 6.1 Mô hình Động lực học Thuần Lực (Pure Force-based Physics Core)
Mọi chuyển động của xe tuân thủ 100% định luật 2 Newton, **tuyệt đối không dùng hàm kẹp tốc độ nhân tạo (`clamp speed`) hay hãm cứng**:
$$\sum F = F_{drive} + F_{nitro} - F_{drag} - F_{roll} - F_{brake}$$
$$a = \frac{\sum F}{m}, \quad v_{next} = v + a \cdot \Delta t$$

1. **A. LOGIC CHUNG (Universal Physics - Quy luật tự nhiên áp dụng cho mọi xe):**
   - **Tốc độ tối đa là điểm cân bằng tự nhiên:** Khi $F_{drive} = F_{drag} + F_{roll} \implies a = 0$. Không hardcode trần tốc độ. Khi xuống dốc hay xuôi gió, xe sẽ tự nhiên vượt ngưỡng danh định.
   - **Lực cản không khí bậc 2 ($F_{drag} = \frac{1}{2} \rho C_d A v^2$):**
     - Ở tốc độ cao ($> 400 - 600\text{ km/h}$): $F_{drag}$ cực lớn $\implies$ khi nhả ga / nhả nitro, gió ghì xe giảm tốc rất nhanh tự nhiên ($600 \to 400 \to 250\text{ km/h}$).
     - Ở tốc độ đô thị ($< 60\text{ km/h}$): $F_{drag}$ tiệm cận 0, xe trôi trớn từ từ êm ái hàng chục mét mới dừng.
   - **Lực ma sát lăn ($F_{roll} = C_{rr} \cdot m \cdot g$):** Giúp xe dừng hẳn khi trôi về $0$.
   - **Quán tính phanh & Giới hạn bám lốp ($F_{brake} = \min(F_{pedal}, \mu_{tire} \cdot m \cdot g)$):**
     - Xe $1.5$ tấn ở $669\text{ km/h}$ có động năng khổng lồ ($E_k = 26.5\text{ MJ}$). Lực phanh tối đa bị chặn bởi độ bám lốp cao su trên đường nhựa ($\sim 1.0g \approx 9.8\text{ m/s}^2$).
     - Xe cần $15 - 20\text{ giây}$ và quãng đường trượt phanh $1.2 - 1.8\text{ km}$ mới dừng hẳn, tuyệt đối không có chuyện phanh đứng khựng lại tức thì!
   - **Hệ thống lái biến thiên theo tốc độ (Speed-Sensitive Steering):**
     - Tốc độ thấp: Góc lái tối đa $30^\circ$, vô lăng nhạy.
     - Tốc độ cao: Góc lái tự động hãm xuống còn $6.5^\circ - 10^\circ$, vô lăng đầm chắc chống lật xe.

2. **B. LOGIC RIÊNG (Vehicle-Specific Profiles - Cấu hình riêng từng xe trong `vehicles-config.js`):**
   - **Mã lực động cơ (`horsepowerHP`):** Chuyển hóa thành lực kéo bánh xe: $F_{drive} = \frac{P_{engine}}{\max(|v|, 3.0)}$.
   - **Mã lực Nitro phản lực (`nitroHorsepower`):** Bổ sung tương đương $+3.500\text{ HP}$ động cơ phản lực.
   - **Khối lượng (`massKg`):** $115\text{ kg}$ (xe máy) đến $9.500\text{ kg}$ (xe buýt), quyết định quán tính đà trôi và phản lực va chạm.
   - **Khí động học (`dragCoeff` $C_d$ & Diện tích cản gió `frontalArea` $A$):** Siêu xe lướt gió xé gió, xe buýt cản gió cực mạnh.
   - **Độ bám lốp (`tireGrip` $\mu$):** Lốp thể thao cao cấp bám đường tốt hơn lốp phổ thông.

### 6.2 Hệ thống Máu xe, Sát thương & Hiệu ứng Khói Lửa (Vehicle Health & Fire FX)
1. **Chỉ số độ bền xe (Vehicle Health: 100%):**
   - Sát thương tính theo độ biến thiên vận tốc $\Delta v$ và khối lượng vật va chạm:
     $$\text{Damage} = K \times (\Delta v)^{1.6}$$
   - Va quẹt nhẹ ($< 15\text{ km/h}$): Mất $2\% - 5\%$ HP.
   - Tông trung bình ($30 - 60\text{ km/h}$): Mất $12\% - 25\%$ HP.
   - Tông mạnh trực diện ($> 100\text{ km/h}$): Mất $40\% - 70\%$ HP.
   - Tông ở tốc độ Nitro ($> 300\text{ km/h}$): Mất $100\%$ HP lập tức.
2. **Hiệu ứng 3D trực quan theo cấp độ hư hỏng (Damage Particle FX):**
   - $HP > 50\%$: Xe bình thường.
   - $25\% \le HP \le 50\%$: Khói xám mỏng bốc lên từ nắp capo trước.
   - $0\% < HP < 25\%$: Khói đen đặc cuồn cuộn bốc lên, động cơ nổ lụp bụp.
   - $HP = 0\%$: **Xe bốc cháy ngùn ngụt** (ngọn lửa đỏ cam + khói đen mù mịt). Xe chết máy hoàn toàn (vận tốc về 0, ngắt toàn bộ chân ga), HUD báo động *"XE BỊ PHÁ HỦY - BẤM R ĐỂ HỒI SINH"*.

### 6.3 Vật lý va chạm theo Động lượng & Khối lượng (Momentum Conservation $p = m \cdot v$)
Áp dụng định luật bảo toàn động lượng:
$$m_1 \vec{v}_1 + m_2 \vec{v}_2 = m_1 \vec{v}_1' + m_2 \vec{v}_2'$$
- **Xe hơi ($1.540\text{ kg}$) tông Xe máy ($115\text{ kg}$):** Tỷ lệ khối lượng $\approx 13.4$. Xe hơi hầu như không bị giảm tốc ($\sim 5\%$), xe máy bị xung lực cực mạnh **bắn văng $10 - 15\text{m}$** sang lề đường.
- **Xe hơi ($1.540\text{ kg}$) tông Xe buýt ($9.500\text{ kg}$):** Xe buýt nặng gấp $6.2$ lần, gần như không dịch chuyển; xe hơi bị dội ngược lại và chịu sát thương nặng.
- **Tông Tường nhà / Bờ kè ($M = \infty$):** 100% phản lực dội ngược lại xe người chơi.

### 6.4 Quy tắc làn đường Việt Nam (Right-Hand Traffic) & AI Tự Né Vượt
1. **Làn chuẩn bên phải (Right-Hand Traffic Rule):**
   - Xe cộ tại Việt Nam bắt buộc di chuyển ở nửa bên phải của chiều đi theo tim đường.
   - Vector chuyển vị ngang tính theo góc đường $\theta$:
     $$V_{\text{right}} = (-\cos\theta, \sin\theta)$$
   - Chiều thuận ($dir = +1$): lệch dương theo $V_{\text{right}}$ (bám làn phải).
   - Chiều nghịch ($dir = -1$): lệch âm theo $V_{\text{right}}$ (bám làn phải đối diện).
2. **AI Né Vượt (Overtaking & Swerving):**
   - Khi phát hiện xe phía trước (xe người chơi hoặc xe NPC khác) có tốc độ thấp hơn trong tầm quét $12\text{m}$:
   - AI tự động đánh lái mượt mà sang làn bên cạnh (`currentLaneOffset \pm 3.2\text{m}`) để vượt qua.
   - Sau khi vượt qua chướng ngại vật, AI tự động hồi lái nhập lại làn tiêu chuẩn (`baseLaneOffset`).

### 6.5 Mô hình Va chạm Hộp Sát Mép (AABB & Oriented Box Collider)
1. **Khắc phục lỗi "đụng vô hình cách 7m":**
   - Đo khoảng cách chính xác từ tâm xe $(px, pz)$ tới mép hộp chữ nhật $(cx, cz, w, d)$:
     $$\Delta x = \max(0, |px - cx| - w/2), \quad \Delta z = \max(0, |pz - cz| - d/2)$$
     $$\text{Dist}^2 = \Delta x^2 + \Delta z^2 < R_{car}^2 \quad (R_{car} = 0.95\text{m})$$
   - Xe cọ sát mép tường $0.15\text{m} - 0.20\text{m}$ cực kỳ chân thực.
2. **Xe NPC:** Hộp va chạm dẹp theo thân xe ($0.8\text{m} \times 1.8\text{m}$ cho xe máy; $1.8\text{m} \times 4.3\text{m}$ cho taxi), cho phép xe người chơi lách qua khe hẹp giữa 2 xe máy.

---

## 7. QUY CHUẨN ĐÈN TÍN HIỆU GIAO THÔNG TẠI NÚT GIAO (INTERSECTION SIGNALS)
1. **Tọa độ đặt đèn:** Đèn giao thông CHỈ ĐƯỢC PHÉP ĐẶT tại góc vỉa hè các ngã ba, ngã tư giao nhau:
   - Lê Lợi $\times$ Nguyễn Huệ: $(-140, -375)$
   - Hàm Nghi $\times$ Tôn Đức Thắng: $(70, -25)$
   - Lê Lợi $\times$ Nam Kỳ Khởi Nghĩa: $(-230, -335)$
   - Lê Lợi $\times$ Pasteur: $(-160, -365)$
   - Vòng xoay Quách Thị Trang $\times$ Chợ Bến Thành: $(-350, -260)$
   - Nguyễn Huệ $\times$ Tôn Đức Thắng: $(20, -20)$
2. **Cần đèn vươn:** Cột đèn đặt trên vỉa hè cách tim nút giao $\frac{W_{road}}{2} + 0.8\text{m}$, tay cần đèn vươn ra lòng đường quay mặt đèn đối diện dòng phương tiện đang chạy tới.

---

## 8. KIẾN TRÚC 3D ASSET STUDIO / MODEL INSPECTOR
1. **Không dùng file HTML riêng:** Tích hợp trực tiếp chế độ Studio trong [`showroom.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/showroom.js), hỗ trợ mở nhanh qua URL `vietnam-race.html?mode=showroom`.
2. **Sidebar danh mục bên hông:** Nhóm thành 5 nhóm trực quan (Cây cối, Đạo cụ đường phố, Phương tiện AI, 7 Biến thể nhà ống, Landmark).
3. **Bệ xoay tương tác 360° (Orbit Turntable):**
   - Kéo chuột trái: Xoay tự do xung quanh model.
   - Lăn chuột: Phóng to / Thu nhỏ (Zoom in/out).
   - Nút `Auto Spin`: Bật/tắt tự động xoay tròn.
4. **Thẻ thông số kỹ thuật (Spec Inspector Card):** Hiển thị Asset ID, kích thước $D \times R \times C$, nút Copy ID để phục vụ việc sửa code và tích hợp file `.glb` sau này.

---

## 7. QUY CHUẨN TÀI NGUYÊN 3D (ASSETS ARCHITECTURE)

### 7.1 Phân định rạch ròi: File 3D (.glb) vs Code Thủ Tục (Procedural Assets)

1. **Nhóm BẮT BUỘC dùng Code Thủ Tục (`assets.js`):**
   - **Nhà cửa thông thường:** Phải đùn móng (Extrude) từ tọa độ đa giác OSM, không dùng model tĩnh vì móng đất thực tế không vuông vức.
   - **Cây xanh & Cột đèn:** Rải hàng chục nghìn thực thể qua `InstancedMesh` để giữ Draw Call = 1.
   - **Xe cộ AI:** Dựng Low-Poly hình học để chạy mượt cả dòng xe máy.
2. **Nhóm NÊN dùng File 3D (.glb) ngoài (`assets/models/`):**
   - **Xe chính của người chơi (Hero Car):** Thiết kế chi tiết bằng Blender, có nội thất, mâm xe, tem xe.
   - **Landmark độc bản:** Bitexco, Chợ Bến Thành, Nhà thờ Đức Bà, Cầu Ba Son (đường cong phức tạp).

### 7.2 Bảng ngân sách đa giác (Triangle Budget) & Quy ước đặt tên

| Loại đối tượng | Quy ước đặt tên file | Ngân sách Polycount tối đa | Quy cách nạp |
| :--- | :--- | :--- | :--- |
| **Xe người chơi** | `car_[loại]_[tên].glb`<br/>*(VD: `car_player_vf3.glb`)* | $< 5.000$ tris, $< 500\text{KB}$ | GLTFLoader (Async, có fallback xe đỏ) |
| **Landmark lớn** | `landmark_[hcm/hn]_[tên].glb`<br/>*(VD: `landmark_hcm_bitexco.glb`)* | $< 8.000$ tris, $< 1\text{MB}$ | GLTFLoader theo tọa độ mốc |
| **Phụ kiện đặc biệt** | `prop_[tên].glb`<br/>*(VD: `prop_tea_stall.glb`)* | $< 300$ tris | Tùy chọn nạp ngoài |
| **Xe AI giao thông** | Sinh qua code `createTrafficScooter()` | $< 150$ tris | Procedural Geometry |
| **Cây cối** | Sinh qua code `createTreeXacu()` | $< 50$ tris | `InstancedMesh` |
| **Cột đèn đường** | Sinh qua code `createStreetLamp()` | $< 30$ tris | `InstancedMesh` |

---

## 9. QUY CHUẨN LƯU TRỮ VÀ BẢNG THÔNG SỐ TÙY CHỈNH (SETTINGS & PERSISTENCE)

### 9.1 Chuẩn Lưu Trữ Trạng Thái (Theo `_MAX-RULES.md` Mục 5)
1. **Single Source of Truth (`DEFAULT_SETTINGS`):**
   ```javascript
   const DEFAULT_SETTINGS = Object.freeze({
     trafficDensity: 'normal', // 'none' | 'low' | 'normal' | 'dense'
     godMode: false            // boolean: true (bất tử) | false (nhận sát thương)
   });
   ```
2. **Safe Merger:** Nạp qua `localStorage.getItem('vietnam_race_settings')`, luôn hợp nhất trên nền `DEFAULT_SETTINGS` để chống lỗi `undefined` khi cập nhật mở rộng.
3. **Hot-Reloading (Không cần tải lại trang):**
   - Đổi `trafficDensity` $\to$ gọi `VietnamRaceTraffic.reloadTraffic(scene, density)`.
   - Bật `godMode` $\to$ hồi phục ngay $100\%$ máu, xóa khói/lửa, tắt thông báo hỏng xe.

### 9.2 Bảng Chế Độ Mật Độ Giao Thông (Traffic Density Modes)
| Mức Tùy Chọn | Hệ số số lượng | Số xe ước tính | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **`none` (Không xe)** | $0\times$ | $0$ phương tiện | Thử nghiệm tốc độ cực đại $699\text{ km/h}$, đường đua phẳng lặng không chướng ngại. |
| **`low` (Thưa thớt)** | $0.5\times$ | $\approx 14$ phương tiện | Dạo phố đêm, vắng xe, dễ lách làn và drift tốc độ cao. |
| **`normal` (Bình thường)** | $1.0\times$ | $\approx 28$ phương tiện | Trải nghiệm giao thông đô thị tiêu chuẩn Sài Gòn ban ngày. |
| **`dense` (Giờ cao điểm)** | $2.0\times$ | $\approx 56$ phương tiện | Giờ tan tầm kẹt xe, đòi hỏi kỹ năng lạng lách qua biển xe máy và xe buýt. |

### 9.3 Cơ chế Xe Bất Tử (God Mode)
1. **Bảo vệ toàn diện:** Bỏ qua hoàn toàn việc trừ máu khi va chạm tường, cột đèn, xe buýt hay xe taxi ở mọi tốc độ ($0 - 699\text{ km/h}$).
2. **Động cơ vĩnh cửu:** Xe không bao giờ bốc khói đen hay bốc cháy động cơ, không bị ngắt ga (cutoff) khi va đập mạnh.
3. **Phản hồi HUD:** Thanh đo máu chuyển sang dải gradient ánh vàng hoàng kim với chữ hiển thị `∞ GOD`.

---

## 10. QUY CHUẨN ĐỘNG LỰC HỌC HÃM PHI TUYẾN & BẢO VỆ KHÔNG GIAN (NON-LINEAR DECELERATION & NAN RESILIENCE)

### 10.1 Khắc Phục Triệt Để Lỗi Ma Trận Không Gian (NaN Crash Prevention)
1. **Nguyên nhân cốt lõi:** Lỗi đánh máy biến `turnSpeed` thành `TURN_SPEED` trong công thức tính góc lệch đầu xe:
   $$\text{yaw} \mathrel{+}= \text{steerAngle} \times \text{turnSpeed} \times \text{dir} \times \text{dt}$$
   Khi gọi nhầm biến chữ hoa `TURN_SPEED`, phép nhân trả về `NaN`, làm vỡ ma trận góc quay `yaw`, tọa độ `(x, z)` và ma trận ViewMatrix của camera Three.js, khiến toàn bộ màn hình 3D biến mất trắng xóa ngay khi xe vừa lăn bánh.
2. **Giải pháp 3 lớp bảo vệ:**
   - Sửa chuẩn xác sang `this.turnSpeed` với cơ chế fallback tự động `(this.turnSpeed || this.TURN_SPEED || 2.2)`.
   - Tự động gọi `this.applyProfile('player_sport')` ngay lúc khởi tạo `createCar()`.
   - Thiết lập chốt an toàn **NaN Safety Guard**: Nếu phát hiện `NaN` trong bất kỳ trạng thái nào (`x, z, yaw, speed`), hệ thống tự động kích hoạt `respawn()` đưa xe về vị trí xuất phát an toàn thay vì làm sập viewport.

### 10.2 Mô Hình Giảm Tốc Phi Tuyến 3 Tầng Khi Thả Ga (Coasting Deceleration)
$$a_{\text{coast}}(v) = a_{\text{roll}} + a_{\text{engine\_brake}}(v) + a_{\text{aero\_drag}}(v)$$
1. **Lực cản không khí & Sóng xung kích siêu tốc Nitro ($a_{\text{aero}}$):**
   $$a_{\text{aero}}(v) = \frac{1}{m} \left(\frac{1}{2}\rho C_d A v^2\right) \cdot \left[1 + k_{\text{hyper}} \cdot \max\left(0, \frac{v - v_{\text{top}}}{v_{\text{top}}}\right)^{1.6}\right]$$
   - Khi nhả Nitro ở $600\text{ km/h}$: Gia tốc ghì lên tới $25 - 35\text{ m/s}^2$ $\implies$ tốc độ tụt dốc cực nhanh **$90 - 120\text{ km/h/s}$**.
   - Khi về dải $200\text{ km/h}$: Tốc độ giảm vừa phải $\sim 25\text{ km/h/s}$.
2. **Hãm động cơ nén xi-lanh phi tuyến ($a_{\text{engine\_brake}}$):**
   $$a_{\text{engine}}(v) = k_{\text{eng}} \cdot \left(\frac{v}{28.0}\right)^{1.35} \cdot \text{clamp}\left(\frac{v_{\text{km/h}} - 12.0}{24.0}, 0, 1\right)$$
   - Vòng tua cao: Lực hãm máy ghì xe mạnh mẽ.
   - Vận tốc $< 36\text{ km/h}$: Bộ ly hợp tự động nhả êm dịu, triệt tiêu lực hãm động cơ để xe trôi trớn tự nhiên.
3. **Cản lăn cơ học ($a_{\text{roll}}$):**
   $a_{\text{roll}} = C_{rr} \times 9.81 \approx 0.15\text{ m/s}^2$, cho phép xe lăn êm ái thêm $20 - 30\text{m}$ ở dải tốc độ dạo phố trước khi dừng hẳn tại $0\text{ km/h}$.

### 10.3 Phanh Động Lực Khí Động (Dynamic Aero-Assisted Braking)
$$a_{\text{brake\_total}}(v) = a_{\text{tire\_friction}} + a_{\text{aero\_drag}}(v) + a_{\text{aero\_assist}}(v)$$
- Ở tốc độ siêu cao: Lực phanh đĩa kết hợp áp lực gió ghì xe khẩn cấp ($130 - 160\text{ km/h/s}$).
- Ở tốc độ đô thị: Hãm mượt mà theo độ bám lốp Michelin $\sim 10.5\text{ m/s}^2$ ($38\text{ km/h/s}$).
- Chống giật lùi (Anti-Instant Reverse): Giữ phanh khi xe đang chạy chỉ làm xe dừng về $0$, xe đứng yên hoàn toàn mới chuyển sang số lùi $R$.

### 10.4 Khắc Phục Lỗi Hiển Thị Xe AI Giao Thông (NPC Traffic Visibility Fix)
1. **Nguyên nhân gốc rễ:**
   - Trong [`traffic.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/vietnam-race/traffic/traffic.js), code cũ tham chiếu thuộc tính `prof.PHYSICS_MAX_SPEED` (thuộc tính cũ từ prototype). Thuộc tính này trả về `undefined` do cấu hình mới trong `vehicles-config.js` đã chuyển sang chuẩn `prof.nominalTopKmH`.
   - Phép tính `speed = undefined * factor` sinh ra `speed = NaN`.
   - Khi chạy `update(dt)`, tọa độ di chuyển `progress` và `mesh.position` bị biến thành `NaN`, làm toàn bộ xe NPC biến mất khỏi tầm nhìn 3D và không thể vẽ chấm radar trên Minimap 2D.
2. **Khắc phục:**
   - Đồng bộ sang chuẩn tốc độ thực tế `nominalMps = (prof.nominalTopKmH || 45) / 3.6`.
   - Định vị tọa độ 3D và góc quay của xe ngay khi khởi tạo trong `init()`.
   - Bổ sung luồng xe chạy trực tiếp trên **Đại lộ Nguyễn Huệ** (nơi xe người chơi xuất phát), giúp người chơi thấy ngay cảnh tượng xe máy và taxi lướt qua ngay khi vừa vào game.
   - Bổ sung chốt an toàn `NaN Protection Guard` cho mảng phương tiện AI.

---

## 11. QUY CHUẨN VẬT LÝ TƯƠNG TÁC VA CHẠM BAY 3D (3D RAGDOLL FLIGHT & MOMENTUM PHYSICS)

### 11.1 Phân Bổ Xung Lực Theo Động Lượng ($p = m \cdot v$)
$$\text{massRatio}_{\text{NPC}} = \frac{m_{\text{player}}}{m_{\text{player}} + m_{\text{NPC}}}, \quad \text{massRatio}_{\text{Player}} = \frac{m_{\text{NPC}}}{m_{\text{player}} + m_{\text{NPC}}}$$
1. **Xe máy ($115\text{ kg}$ vs $1.540\text{ kg}$):**
   - Xe máy nhận $\approx \mathbf{93\%}$ xung lực va chạm $\implies$ Bị bắn vút lên không trung!
   - Xe người chơi chỉ nhận $7\%$ phản lực $\implies$ Giữ được $93.6\%$ vận tốc, lướt qua như một cỗ xe tăng.
2. **Xe buýt ($9.500\text{ kg}$ vs $1.540\text{ kg}$):**
   - Xe buýt chỉ nhận $\approx 14\%$ xung lực $\implies$ Hầu như đứng yên sừng sững.
   - Xe người chơi nhận $86\%$ phản lực $\implies$ Mất $80\%$ vận tốc, bị khựng lại và dội ngược ra sau!
3. **Xe taxi ($1.420\text{ kg}$ vs $1.540\text{ kg}$):**
   - Cả hai xe chia đều $\sim 50\%$ xung lực $\implies$ Cùng bị va đập, trượt bánh và quay ngang $180^\circ$.

### 11.2 Quỹ Đạo Bay Parabol 3D & Nhào Lộn (Tumbling 3D Flight)
Khi vận tốc va chạm $\Delta v > 10\text{ km/h}$:
1. **Vận tốc phóng thẳng đứng ($v_y$):**
   $$v_y = \min\left(24.0, \frac{\Delta v_{\text{km/h}}}{15.0} \times 4.4 \times \text{massRatio}_{\text{NPC}} \times k_{\text{type}}\right)$$
   - Xe máy ($k_{\text{type}} = 1.0$): Ở $80\text{ km/h}$, $v_y \approx 18\text{ m/s}$ (bay bổng cao $3 - 6\text{m}$); ở tốc độ Nitro $300 - 699\text{ km/h}$, xe máy bị hất tung cao **$8 - 14\text{m}$** lên tận tầng 3 các tòa nhà!
   - Taxi ($k_{\text{type}} = 0.35$): Nhấc bổng nhẹ $1 - 2\text{m}$.
   - Xe buýt ($k_{\text{type}} = 0.04$): Không phóng bổng.
2. **Gia tốc trọng trường snappy:**
   $$g_{\text{flight}} = 25.0\text{ m/s}^2$$
3. **Mô-men xoay nhào lộn 3 trục:**
   $\omega_x, \omega_y, \omega_z$ xoay tự do từ $16 - 24\text{ rad/s}$ tạo cảm giác nhào lộn cực kỳ kịch tính.

### 11.3 Đập Đất Đàn Hồi & Nằm Bẹp Hiện Trường
1. **Va chạm mặt đường ($y \le 0$):**
   - Đàn hồi nảy bật: $v_y = -v_y \times 0.35$.
   - Kích hoạt âm thanh rầm rầm kim loại va đập (`VietnamRaceAudio.playCrash()`).
2. **Trượt dừng & Nằm đổ xe:**
   - Ma sát mặt đường ghì tốc độ trượt: $v_{\text{horiz}} \mathrel{*}= 0.91$.
   - Khi hết đà nảy, xe máy đổ bẹp nghiêng $85^\circ$ trên mặt đường (`rotZ = 1.45 rad`).
3. **Tự động khôi phục (Auto-Recovery):**
   - Sau $4.5\text{ giây}$ hoặc khi người chơi chạy xa quá $75\text{m}$, xe máy tự động dựng dậy và nhập lại làn đường tiếp tục lưu thông bình thường.

---

## 12. QUY CHUẨN KỸ THUẬT NẠP BẢN ĐỒ THỰC TẾ (REAL MAP OSM/GEOJSON PIPELINE)

### 12.1 Hệ Chiếu Tọa Độ GPS Sang 3D Metric (Local Equirectangular / Web Mercator)
Để ánh xạ chính xác vị trí GPS từ vệ tinh ($lat, lon$) sang không gian Three.js ($x, y, z$) tính bằng mét:
1. **Điểm Gốc Neo Tâm (Anchor Origin):**
   $$\text{lat}_0 = 10.7735^\circ\text{ N}, \quad \text{lon}_0 = 106.7035^\circ\text{ E}$$
   *(Tọa độ ngã tư Nguyễn Huệ – Lê Lợi – Chợ Bến Thành, Quận 1, TP.HCM)*
2. **Hệ Số Tỉ Lệ Mét/Độ Vĩ và Kinh Tuyến:**
   $$\text{scale}_{\text{lat}} = 111.320\text{ m/deg}$$
   $$\text{scale}_{\text{lon}} = \cos(10.7735^\circ) \times 111.320 \approx 109.380\text{ m/deg}$$
3. **Chuyển Đổi Không Gian:**
   $$x = (\text{lon} - \text{lon}_0) \times 109.380$$
   $$z = -(\text{lat} - \text{lat}_0) \times 111.320 \quad (\text{Trong Three.js, hướng Bắc là trục } -z)$$
   $$y = 0.05\text{ m (Cao độ mặt đường)}$$

### 12.2 Phân Cấp Bề Rộng Mặt Đường & Vạch Kẻ (`highway`)
- `motorway` / `trunk` / `primary`: Bề rộng mặt đường $w = 24\text{m} - 32\text{m}$ (Nguyễn Huệ, Lê Lợi, Tôn Đức Thắng, Võ Văn Kiệt).
- `secondary` / `tertiary`: Bề rộng $w = 16\text{m} - 20\text{m}$ (Pasteur, Nam Kỳ Khởi Nghĩa, Đồng Khởi, Hai Bà Trưng).
- `residential` / `living_street`: Bề rộng $w = 10\text{m} - 12\text{m}$.
- `pedestrian` / `footway`: Bề rộng $w = 8\text{m}$.
- Mặt đường nhựa Three.js MeshLambertMaterial màu than `#22313f` kết hợp vạch kẻ tâm màu vàng `#f1c40f` dày $0.3\text{m}$.

### 12.3 Đùn Khối 3D Tòa Nhà (`building`)
- Chiều cao tòa nhà: Lấy từ tag `building:levels` ($h = \text{levels} \times 3.5\text{m}$) hoặc tag `height`. Nếu không có, gán ngẫu nhiên từ $14\text{m} - 40\text{m}$ đặc trưng cho nhà phố & cao ốc Sài Gòn.
- Tự động nạp vào mảng vật cản `VietnamRaceMap.colliders` để xe không thể xuyên tường.

### 12.4 Cơ Chế Kéo Thả (Drag & Drop) & Preset Quận 1
- Sự kiện `dragover` và `drop` toàn cục cho phép người chơi kéo trực tiếp file `.geojson`, `.osm`, hoặc `.json` vào trình duyệt.
- Tùy chọn "Mở rộng 20+ tuyến phố Q1" cho phép trải nghiệm ngay tức thì 20 cung đường thực tế mà không cần chờ nạp file ngoại vi.

---

## 13. QUY CHUẨN THUẬT TOÁN BẢO VỆ MẶT ĐƯỜNG THÔNG THOÁNG (ROAD CLEARANCE GUARD)

### 13.1 Đo Khoảng Cách Hình Học Từ Điểm Tới Đoạn Thẳng (Point-to-Segment Distance)
Cho điểm tâm tòa nhà $P(c_x, c_z)$ và đoạn tim đường nối $A(x_1, z_1)$ tới $B(x_2, z_2)$:
$$\vec{v} = B - A, \quad \vec{u} = P - A$$
$$t = \text{clamp}\left(\frac{\vec{u} \cdot \vec{v}}{|\vec{v}|^2}, 0, 1\right)$$
$$P_{\text{proj}} = A + t \cdot \vec{v}$$
$$d = |P - P_{\text{proj}}| = \sqrt{(c_x - x_{\text{proj}})^2 + (c_z - z_{\text{proj}})^2}$$

### 13.2 Điều Kiện Loại Bỏ Xung Đột Nhà Lấn Lòng Đường
Một tòa nhà có kích thước $w_{\text{bld}} \times d_{\text{bld}}$ (bán kính ngoại tiếp $r_{\text{half}} = \frac{\max(w, d)}{2}$) trên đoạn đường có bề rộng $w_{\text{road}}$:
$$\text{Nếu } d < \frac{w_{\text{road}}}{2} + r_{\text{half}} + 2.0\text{m} \implies \text{HỦY BỎ (DROPPED)}$$
- **Kết quả nghiệm thu**: 936 khối nhà lấn đường hoặc dính tim đường bị loại bỏ hoàn toàn.
- Giữ lại 1.215 tòa nhà nằm an toàn $100\%$ trên vỉa hè và trong các ô phố, đảm bảo toàn bộ mặt đường thông thoáng tuyệt đối.

### 13.3 Tọa Độ Mốc Thực Tế Của Các Địa Danh Biểu Tượng
| Địa danh | Kinh độ, Vĩ độ GPS | Tọa độ 3D game $(x, z)$ |
|---|---|---|
| **Tháp Bitexco** | $106.7045^\circ\text{E}, 10.7715^\circ\text{N}$ | $(108.6, 219.7)$ |
| **Chợ Bến Thành** | $106.6973^\circ\text{E}, 10.7728^\circ\text{N}$ | $(-672.6, 77.7)$ |
| **Nhà thờ Đức Bà** | $106.6994^\circ\text{E}, 10.7796^\circ\text{N}$ | $(-447.8, -681.2)$ |
| **Bưu điện Trung tâm TP** | $106.7002^\circ\text{E}, 10.7797^\circ\text{N}$ | $(-359.8, -692.7)$ |
| **Dinh Độc Lập** | $106.6955^\circ\text{E}, 10.7772^\circ\text{N}$ | $(-869.8, -410.7)$ |
| **Cầu Ba Son** | $106.7085^\circ\text{E}, 10.7805^\circ\text{N}$ | $(551.2, -775.2)$ |
| **Xuất phát Nguyễn Huệ (UBND)** | $106.7019^\circ\text{E}, 10.7755^\circ\text{N}$ | $(-160.0, -220.0)$ |

---

## 14. QUY CHUẨN ĐIỀU HƯỚNG MẠNG LƯỚI GIAO THÔNG & CHUYỂN LÀN HỮU CƠ

### 14.1 Chuyển Tiếp Ngã Tư (Network Intersection Graph Traversal)
Tại mút cuối đoạn đường $P(x_{\text{end}}, z_{\text{end}})$ khi $\text{progress} \ge 1.0$ hoặc $\le 0.0$:
$$\text{candidates} = \{ r \in \text{Roads} \setminus \{r_{\text{cur}}\} \mid \min(|P - r_{\text{start}}|, |P - r_{\text{end}}|) < 16.0\text{m} \}$$
1. Nếu $\text{candidates} \neq \emptyset$:
   - Chọn ưu tiên cùng tên phố ($\text{prob} = 72\%$) $\implies$ chạy thẳng không đổi tên đường.
   - Hoặc rẽ vào đường nhánh giao cắt ($\text{prob} = 28\%$).
   - Thiết lập điểm xuất phát $progress_{\text{new}}$ và hướng di chuyển $dir_{\text{new}}$ tương ứng.
2. Nếu là ngõ cụt ($\text{candidates} = \emptyset$):
   - Đảo chiều xe: $dir = -dir$.

### 14.2 Mượt Hóa Xoay Đầu Xe Tại Góc Cua ($\text{Angular Lerp}$)
$$\Delta\theta = \text{atan2}(\sin(\theta_{\text{target}} - \theta_{\text{cur}}), \cos(\theta_{\text{target}} - \theta_{\text{cur}}))$$
$$\theta_{\text{cur}} \leftarrow \theta_{\text{cur}} + \Delta\theta \times \min(1.0, 9.0 \cdot dt)$$
Xe rẽ mượt mà $90^\circ$ hoặc $45^\circ$ theo đường cong hình học, không bị hiện tượng dịch chuyển tức thời.

### 14.3 Chuyển Làn Tự Nhiên & Độ Nghiêng Xe Máy
- Khoảng thời gian đổi làn: $\Delta t_{\text{lane}} \in [3.5\text{s}, 8.5\text{s}]$.
- Độ lệch làn mục tiêu: $offset = dir \cdot w_{\text{road}} \cdot \text{span}$ (với $\text{span}_{\text{scooter}} \in [0.22, 0.38]$, $\text{span}_{\text{car}} \in [0.12, 0.26]$).
- Xe máy tự động nghiêng thân:
  $$\text{tilt}_Z = \text{clamp}(-0.10, 0.10, -(\text{offset}_{\text{target}} - \text{offset}_{\text{cur}}) \times 0.04)$$

---

## 15. QUY CHUẨN HIỂN THỊ VẬN TỐC ÂM & KHÓA AN TOÀN NITRO

### 15.1 Vận Tốc Số Lùi Có Dấu (Signed Reverse Speed)
$$v_{\text{display}} = \text{round}(v \times 3.6)$$
- Khi $v < 0$ (xe đang lùi): Đồng hồ HUD hiển thị trực tiếp số âm (ví dụ: `-12` KM/H, `-28` KM/H), tương ứng với vị trí tay số `R`.
- Khi $v > 0$ (xe tiến): Đồng hồ hiển thị số dương, tương ứng vị trí tay số `D`.

### 15.2 Phản Lực Tên Lửa Nitro Mọi Lúc & Luôn Hướng Về Phía Trước (Forward Rocket Thrust)
$$\vec{F}_{\text{nitro}} = \vec{d}_{\text{forward}} \times \min(F_{\text{thrust}}, m \times 55.0)$$
- Nitro kích hoạt mọi lúc khi phím `Shift` hoặc `touchNitro` được nhấn, ngay cả khi vận tốc hiện tại đang bằng 0 hoặc xe đang dừng.
- Lực đẩy luôn hướng về phía đầu xe theo vector chỉ hướng $\vec{d}_{\text{forward}}$, mang lại trải nghiệm bứt tốc tên lửa uy lực.

---

## 16. QUY CHUẨN LƯỚI KHÔNG GIAN (SPATIAL CHUNK CULLING) & BONG BÓNG GIAO THÔNG GTA

### 16.1 Lưới Ô Không Gian $250\text{m} \times 250\text{m}$ (Spatial Chunk Partitioning)
- Toạ độ ô lưới:
  $$g_x = \lfloor \frac{x}{250} \rfloor, \quad g_z = \lfloor \frac{z}{250} \rfloor$$
- Mỗi ô lưới là một nhóm riêng `THREE.Group` quản lý toàn bộ các tòa nhà trong diện tích $250\text{m} \times 250\text{m}$.
- Kiểm tra culling động theo bán kính $R_{\text{cull}} = 1200\text{m}$:
  $$\text{visible} = (x_{\text{player}} - x_{\text{chunk}})^2 + (z_{\text{player}} - z_{\text{chunk}})^2 \le 1200^2$$
- Giảm thiểu hơn $80\%$ số lệnh vẽ (draw calls) và số đỉnh đa giác cần xử lý, đảm bảo $60\text{ FPS}$ mượt mà với hơn 3,000 công trình nhà cửa chi tiết.

### 16.2 Bong Bóng Giao Thông Kiểu GTA (Dynamic Traffic Bubble)
- Bán kính bong bóng hoạt động: $R_{\text{bubble}} = 420\text{m}$.
- Khi xe NPC có khoảng cách đến người chơi:
  $$d_{\text{player}} > 420\text{m} \land \neg\text{isAirborne}$$
- Thuật toán tái sinh (Recycle) chọn ngẫu nhiên một cung đường trong hình nón quan sát phía trước người chơi:
  $$d \in [100\text{m}, 380\text{m}], \quad \frac{\vec{\Delta P} \cdot \vec{d}_{\text{fwd}}}{d} \ge -0.2$$
- Đặt lại tiến trình, làn đường và vận tốc ban đầu, duy trì liên tục $45 - 64$ phương tiện bao quanh xe người chơi trên mọi nẻo đường thành phố.

---

## 17. QUY CHUẨN RADAR THÍCH ỨNG VẬN TỐC, ĐA GIÁC SÔNG SÀI GÒN & KIẾN TRÚC CẦU BA SON

### 17.1 Thuật Toán Thu Phóng Radar Thích Ứng Vận Tốc (Speed-Adaptive Radar Zoom)
$$\text{targetZoom} = 1.0 + \min\left(1.0, \frac{|v_{\text{km/h}}|}{130.0}\right)$$
$$\text{zoomFactor} \leftarrow \text{zoomFactor} + (\text{targetZoom} - \text{zoomFactor}) \times 0.06$$
$$\text{scale} = \frac{\text{scale}_{\text{base}}}{\text{zoomFactor}}$$
- Tại vận tốc $0\text{ km/h}$: $\text{zoomFactor} = 1.0$, tỉ lệ $\text{scale} = 0.38\text{ px/m}$, bán kính quan sát xung quanh $R \approx 350\text{m}$.
- Khi bứt tốc $\ge 130\text{ km/h}$ hoặc kích hoạt Nitro: $\text{zoomFactor} \to 2.0$, tỉ lệ $\text{scale} = 0.19\text{ px/m}$, radar tự động mở rộng gấp đôi phạm vi quan sát phía trước lên $R \approx 700\text{m}$, hỗ trợ phản xạ cua lái ở tốc độ cao.

### 17.2 Tái Dựng Hình Học Đa Giác Sông Sài Gòn (OSM Polygon Boundary)
Mặt nước Sông Sài Gòn được tái tạo bằng `THREE.ShapeGeometry` từ tập hợp 104 đỉnh tọa độ thực tế:
$$\mathcal{P}_{\text{river}} = \{ (x_i, z_i) \mid i = 1, \dots, 104 \}$$
Chạy uốn lượn tự nhiên từ mạn Bắc ($Z = -1600\text{m}$) qua Bến Bạch Đằng ($X = 329\text{m}, Z = 306\text{m}$), Cột cờ Thủ Ngữ ($X = 330\text{m}, Z = 425\text{m}$) xuống phía Nam cảng Khánh Hội ($Z = +1700\text{m}$).

### 17.3 Dao Động Tỉ Lệ Cây Xanh Hữu Cơ (Foliage Scale Variance)
$$s_{\text{tree}} = 0.75 + \text{rand}(0, 1) \times 0.50 \quad \implies \quad s_{\text{tree}} \in [75\%, 125\%]$$
$$\theta_{\text{tree}} = \text{rand}(0, 1) \times 2\pi$$
Mỗi cây xanh trong số 250+ cây đô thị được phân bổ độ cao và đường kính tán ngẫu nhiên trong dải từ $75\%$ đến $125\%$, kết hợp góc xoay ngẫu nhiên toàn phần tạo nên cảnh quan sinh thái tự nhiên và sống động.

### 17.4 Trục Tim Đường & Kết Cấu Cầu Ba Son (Ba Son Bridge Vector Alignment)
- Điểm đầu mố cầu (Bờ Q1): $P_1(551.0, -775.0)$
- Điểm cuối mố cầu (Bờ Thủ Thiêm): $P_2(990.0, -525.0)$
- Góc phương vị trục cầu:
  $$\theta_{\text{bridge}} = \text{atan2}(990 - 551, -525 - (-775)) = \text{atan2}(439, 250) \approx 1.05\text{ rad} \ (60.3^\circ)$$
- Trụ tháp cánh cung chính nghiêng $0.28\text{ rad}$ đặt tại $P_{\text{pylon}}(620.0, -735.0)$ cao $76\text{m}$, kết hợp 16 dây văng đối xứng và hệ lan can chạy dọc theo chiều dài nhịp $L \approx 505\text{m}$.

---

## 18. QUY CHUẨN MẠNG LƯỚI ĐÔ THỊ ĐẠI SÀI GÒN 11KM X 11KM (METROPOLITAN ROAD NETWORK)

### 18.1 Phạm Vi Không Gian Mở Rộng 121 km² (Spatial Extents)
$$\Delta X \in [-5500\text{m}, +5500\text{m}], \quad \Delta Z \in [-5500\text{m}, +5500\text{m}]$$
$$\text{Area} = 11.0\text{km} \times 11.0\text{km} = 121.0\text{ km}^2$$
Hệ thống kết nối liên hoàn 13,431 cung đường qua 7 quận trọng điểm:
- **Trục Đông - Tây:** Đại lộ Võ Văn Kiệt $\leftrightarrow$ Hầm Thủ Thiêm / Cầu Ba Son $\leftrightarrow$ Đại lộ Mai Chí Thọ.
- **Trục Bắc - Nam:** Điện Biên Phủ $\leftrightarrow$ Cầu Sài Gòn $\leftrightarrow$ Xa Lộ Hà Nội $\leftrightarrow$ Nguyễn Tất Thành $\leftrightarrow$ Nguyễn Văn Linh (Q7).

### 18.2 Tối Ưu Hóa Phân Ô Mặt Đường & Culling Động (Road Surface Chunking)
$$\text{ChunkKey} = \left\lfloor \frac{midX}{250} \right\rfloor \_ \left\lfloor \frac{midZ}{250} \right\rfloor$$
Mỗi đoạn đường được tự động phân vào lưới ô $250\text{m} \times 250\text{m}$.
Thuật toán culling ẩn $85\%$ số ô nằm xa hơn $1200\text{m}$, cho phép nạp hàng chục nghìn con đường mà vẫn đảm bảo render dưới $16\text{ms}$ (chuẩn $60\text{ FPS}$).

---

## 19. QUY CHUẨN TỰ ĐỘNG SINH NHÀ PHỐ, HÀNG CÂY ĐẠI LỘ & ĐỊNH HƯỚNG LANDMARK

### 19.1 Tọa Độ & Góc Xoay Chuẩn Thực Địa Của 6 Biểu Tượng Sài Gòn
| Biểu tượng Landmark | Tọa độ $(X, Z)$ | Bán kính an toàn | Góc xoay $\theta_y$ | Định hướng thực địa |
| :--- | :--- | :--- | :--- | :--- |
| **Tháp Bitexco** | $(108.6, 219.7)$ | $36\text{m}$ | $+0.78\text{ rad}$ ($45^\circ$) | Sân trực thăng tầng 52 vươn hướng Đông Bắc đón sông Sài Gòn |
| **Chợ Bến Thành** | $(-672.6, 77.7)$ | $46\text{m}$ | $+2.10\text{ rad}$ ($120^\circ$) | Tháp đồng hồ Cửa Nam nhìn thẳng ra vòng xoay Quách Thị Trang / Lê Lợi |
| **Nhà thờ Đức Bà** | $(-447.8, -681.2)$ | $40\text{m}$ | $-0.78\text{ rad}$ ($-45^\circ$) | Đôi tháp chuông 57m hướng thẳng Tây Nam đón trục Đồng Khởi |
| **Bưu điện Trung tâm** | $(-359.8, -692.7)$ | $32\text{m}$ | $-\pi/2$ ($-90^\circ$) | Mặt tiền vàng thuộc địa quay Tây thẳng vào công viên Nhà thờ Đức Bà |
| **Dinh Độc Lập** | $(-869.8, -410.7)$ | $52\text{m}$ | $+2.14\text{ rad}$ ($122.6^\circ$) | Khối nhà chính và bãi cỏ oval hướng Đông Nam nhìn thẳng xuống Lê Duẩn |
| **Cầu Ba Son** | $(620.0, -735.0)$ | $55\text{m}$ | $+1.05\text{ rad}$ ($60.3^\circ$) | Trụ tháp nghiêng nối từ Tôn Đức Thắng (Q1) sang bán đảo Thủ Thiêm |

### 19.2 Thuật Toán Tự Động Sinh Nhà Phố Bám Trục Đường (Corridor-Facing Procedural Buildings)
Với mỗi đoạn đường từ $P_1(x_1, z_1)$ tới $P_2(x_2, z_2)$ có độ dài $L \ge 30\text{m}$ (không phải cao tốc / cầu):
- Vector đơn vị dọc đường: $\vec{f} = \frac{(dx, dz)}{L}$
- Vector pháp tuyến vuông góc: $\vec{n} = \left(-\frac{dz}{L}, \frac{dx}{L}\right)$
- Khoảng cách lùi từ tim đường tới tâm nhà:
  $$\text{offset}_{\text{bld}} = \frac{W_{\text{road}}}{2} + \frac{D_{\text{bld}}}{2} + 2.2\text{m}$$
- Vị trí tâm nhà hai bên mép đường:
  $$P_{\text{left}} = P(t) + \vec{n} \cdot \text{offset}_{\text{bld}}, \quad P_{\text{right}} = P(t) - \vec{n} \cdot \text{offset}_{\text{bld}}$$
- Góc xoay mặt tiền nhà: $\theta = \text{atan2}(dx, dz)$, đảm bảo mặt tiền luôn song song và hướng ra đường phố.
- Áp dụng 7 biến thể ngẫu nhiên chân thực (bồn nước inox Tân Á, chuồng cọp phơi đồ, mái tôn dốc xanh, ngói Pháp cổ, ban công đua, cửa cuốn mái hiên di động, khối kính văn phòng).

### 19.3 Phân Bố Cây Xanh Đại Lộ ($\ge 4$ Làn Đường)
- Điều kiện kích hoạt: Lòng đường $W \ge 18\text{m}$ (`primary`, `secondary`, `tertiary`, `trunk`) và $L \ge 32\text{m}$.
- Khoảng cách đặt trên vỉa hè: $\text{offset}_{\text{tree}} = \frac{W}{2} + 2.2\text{m}$.
- Tỉ lệ kích thước dao động ngẫu nhiên: $s \in [0.75, 1.25]$ ($75\% - 125\%$).
- Góc xoay ngẫu nhiên $360^\circ$ ($\theta \in [0, 2\pi]$).
- Tùy biến sinh thái: Cây dừa ven sông Sài Gòn, Cây phượng vĩ hoa đỏ rực và Cây xà cừ đại thụ rợp bóng mát.

### 19.4 Tối Ưu Hóa Tuyệt Đối Va Chạm Xe (Fast AABB Proximity Filter)
Trong vòng lặp kiểm tra va chạm xe với 21,900+ collider trong thành phố:
```javascript
if (Math.abs(nextX - c.x) > 35 || Math.abs(nextZ - c.z) > 35) continue;
```
Bộ lọc loại trừ 99.8% các vật cản cách xa hơn $35\text{m}$ chỉ bằng 2 phép so sánh cơ bản, giữ thời gian xử lý vật lý dưới $0.07\text{ms/frame}$, triệt tiêu 100% hiện tượng khựng khung hình.

---

## 20. QUY CHUẨN VA CHẠM OBB, ĐÈN GIAO THÔNG BẢN ĐỒ & ĐỊNH HƯỚNG MẶT TIỀN

### 20.1 Toán Học Va Chạm Hộp Xoay Hướng (Oriented Bounding Box - OBB)
Mỗi khối nhà / Landmark lưu tọa độ tâm $(c_x, c_z)$, nửa chiều rộng $hw$, nửa chiều sâu $hd$, và ma trận xoay:
$$\cos A = \cos(\theta), \quad \sin A = \sin(\theta)$$
Vector khoảng cách từ tâm tới vị trí tiếp theo của xe trong không gian thế giới:
$$\vec{\Delta} = (nextX - c_x, nextZ - c_z)$$
Phép chiếu vào hệ tọa độ cục bộ (Local Space) của khối nhà:
$$lx = \Delta_x \cdot \cos A - \Delta_z \cdot \sin A$$
$$lz = \Delta_x \cdot \sin A + \Delta_z \cdot \cos A$$
Khoảng cách từ điểm tới biên hình chữ nhật cục bộ:
$$dx = \max(0, |lx| - hw), \quad dz = \max(0, |lz| - hd)$$
Điều kiện va chạm với bán kính đệm xe $r_{\text{car}} = 0.85\text{m}$:
$$dx^2 + dz^2 < r_{\text{car}}^2$$
$\implies$ Giải quyết triệt để lỗi "chưa chạm đã đụng", đảm bảo va chạm khít khao đúng mép tường 3D dù nhà xoay bất kỳ góc nghiêng nào.

### 20.2 Định Hướng Vuông Góc Mặt Tiền Ra Lòng Đường (Perpendicular Street Frontage)
Với đoạn đường có góc phương vị $\theta_{\text{road}} = \text{atan2}(dx, dz)$:
- Mặt tiền nhà bên trái lề đường:
  $$\theta_{\text{left}} = \theta_{\text{road}} - \frac{\pi}{2}$$
- Mặt tiền nhà bên phải lề đường:
  $$\theta_{\text{right}} = \theta_{\text{road}} + \frac{\pi}{2}$$
Đảm bảo toàn bộ ban công, mái hiên di động, biển hiệu quán phở, cửa cuốn tầng trệt đều hướng thẳng 100% ra mặt đường.

### 20.3 Đèn Đường Cao Áp & Đèn Tín Hiệu Giao Thông Bản Đồ
- **Đèn đường cao áp vỉa hè (`createStreetLamp`):**
  - Đặt tại mép vỉa hè: $offset = \frac{W}{2} + 1.2\text{m}$.
  - Góc xoay cần đèn vươn vào lòng đường: $\theta_{\text{lamp}} = \theta_{\text{road}} - \pi$.
- **Đèn giao thông OpenStreetMap (`traffic_signals`):**
  - Đặt tại 1,448 tọa độ nút giao trích xuất trực tiếp từ bảng `points` của OSM GeoPackage.
  - Xoay hướng đón luồng phương tiện đang lưu thông trên trục đường gần nhất.









