# BẢN QUY CHUẨN LOGIC KHÔNG GIAN, HÌNH HỌC & VẬT LÝ VŨ TRỤ: KAIO PLANET RACE 3D

> **Mục đích:** Tài liệu thiết lập các **quy tắc logic không gian bất khả xâm phạm** (Spatial & Physics Rules), hệ thống phân định hướng mọc (Orientation Normals), cơ chế cắm móng triệt tiêu lơ lửng (Foundation Anchoring), và danh bạ quy chuẩn mã Model ID cho toàn bộ hệ sinh thái Web App `planet-race`.

---

## 1. QUY TẮC HƯỚNG MỌC & CẮM MÓNG CỦA VẬT THỂ (SPATIAL ORIENTATION & FOUNDATION RULES)

Khi địa hình hành tinh Kaio bị biến dạng bởi thuật toán Simplex Noise (núi, đồi lượn sóng, hố sâu) hoặc do người chơi tự điêu khắc (Sculpt Brush), mọi vật thể trên bề mặt **BẮT BUỘC** phải tuân thủ nghiêm ngặt 2 phân loại logic sau:

```
                  ▲ N_surface (Pháp tuyến mặt dốc)
                 /
          ┌─────┴─────┐
          │  CÂY CỐI  │  --> Mọc VUÔNG GÓC với vector mặt polygon địa hình!
          └─────┬─────┘
   ─────────────────────────── [Bề mặt sườn đồi dốc nghiêng]
                │
                ▼ Rễ cắm nhẹ 0.4m

========================================================================

                ▲ n_radial (Vector xuyên tâm cầu)
                │
         ┌──────┴──────┐
         │ ĐÁ/NHÀ/ĐÈN  │  --> Mọc THEO TÂM HÀNH TINH (Trọng lực xuyên tâm)!
         └──────┬──────┘
   ─────────────┼───────────── [Mặt đất gồ ghề / nghiêng lệch]
         ┌──────┴──────┐
         │  MÓNG SÂU   │  --> Cắm ngầm 1.2m - 3.5m triệt tiêu hoàn toàn lơ lửng!
         └─────────────┘
```

### 1.1 Quy tắc 1: Cây cối (Nature / Trees)
* **Vector định hướng (Up Vector):** Bắt buộc mọc vuông góc với **vector pháp tuyến bề mặt polygon địa hình** ($\vec{N}_{\text{surface}} \perp \text{Polygon Face}$).
* **Công thức toán học:** Lấy đạo hàm gradient vi phân vi mô tại tọa độ bề mặt:
  $$\vec{p}_0 = \vec{n}_0 \cdot (R + h(\vec{n}_0)), \quad \vec{p}_1 = (\vec{n}_0 + \epsilon \vec{t}_1) \cdot (R + h_1), \quad \vec{p}_2 = (\vec{n}_0 + \epsilon \vec{t}_2) \cdot (R + h_2)$$
  $$\vec{N}_{\text{surface}} = \frac{(\vec{p}_1 - \vec{p}_0) \times (\vec{p}_2 - \vec{p}_0)}{|(\vec{p}_1 - \vec{p}_0) \times (\vec{p}_2 - \vec{p}_0)|}$$
* **Hành vi thẩm mỹ:** Khi sườn đồi dốc nghiêng $20^\circ$, thân cây nghiêng theo độ dốc đó như cây mọc trên vách đá tự nhiên.
* **Cắm chân rễ:** Chân gốc cây có chùm rễ mở rộng chìm $0.4\text{m}$ dưới lớp cỏ để không bao giờ thấy khe hở chân đế.

### 1.2 Quy tắc 2: Tảng đá vũ trụ (Cosmic Boulders)
* **Vector định hướng (Up Vector):** Dựa hoàn toàn vào **tâm của hành tinh** ($\vec{n}_{\text{radial}} = \frac{\vec{P}}{|\vec{P}|}$).
* **Cơ chế chôn móng sâu:** Khối đá có tâm chìm sâu $45\% - 50\%$ bán kính danh định vào lòng đất. Phần đế ngầm (Subterranean Stone Plug) kéo dài thêm $1.4\text{m} - 2.0\text{m}$ xuống dưới. Dù sườn đồi có dốc gắt thì bên dưới vẫn là đá đặc, triệt tiêu $100\%$ hiện tượng hổng đáy lơ lửng.

### 1.3 Quy tắc 3: Kiến trúc & Thánh địa (Architecture / Kaio Sanctuary)
* **Vector định hướng (Up Vector):** Dựa vào **tâm của hành tinh** ($\vec{n}_{\text{radial}}$) để cột ăng-ten thập tự luôn vươn thẳng lên bầu trời vũ trụ.
* **Móng trụ đá sâu:** Trang bị khối móng trụ đá nguyên khối đường kính $16.4\text{m}$, cắm sâu $3.5\text{m}$ âm dưới mặt đất. Công trình đứng vững chãi không phụ thuộc vào độ lồi lõm của địa hình xung quanh.

### 1.4 Quy tắc 4: Cột đèn cao áp vũ trụ (Street Lanterns)
* **Vị trí quy hoạch:** Đặt cách mép ngoài của vỉa hè đường đua $0.8\text{m}$, so le đều đặn hai bên Bắc - Nam với cự ly $130\text{m}$/cột dọc theo chu vi xích đạo $6.283\text{m}$.
* **Vector định hướng:** Mọc theo tâm hành tinh ($\vec{n}_{\text{radial}}$).
* **Móng bê tông âm đất:** Chân đế bê tông đúc khối $0.9\text{m} \times 0.9\text{m} \times 1.8\text{m}$, trong đó $1.4\text{m}$ nằm chìm hoàn toàn trong lòng đất.
* **Cần đèn:** Cần thép vươn ngang $2.2\text{m}$ hướng thẳng vào tim đường xích đạo với bóng phát quang ánh vàng năng lượng vũ trụ.

### 1.5 Quy tắc 5: Bàn đạp phóng quỹ đạo (Stunt Launch Ramps)
* **Định vị & Hướng quay:** 6 bàn đạp bố trí dọc xích đạo. Trục $Y$ (Up) bắt buộc mọc hướng tâm hành tinh ($\vec{n}_{\text{radial}}$), trục $Z$ (Forward) trùng tiếp tuyến chạy thẳng của đường đua. Dùng ma trận cơ sở trực chuẩn `makeBasis(right, normal, fwdTangent)`, triệt tiêu hoàn toàn lỗi nghiêng lệch méo mó.
* **Hình học nêm dốc 3D (Wedge):** Mép vào dốc nằm phẳng sát mặt đường ($0.02\text{m}$), vách thành cắm sâu âm đất $0.6\text{m}$. Xe leo lên êm ái, không bị cản bởi gờ bậc thang.
* **Cơ chế kích hoạt một lần (One-shot Cooldown):** Cơ chế kích nổ lực phóng có thời gian hồi $2.0\text{s}$, kích hoạt duy nhất một lần khi xe chạy qua, triệt tiêu $100\%$ lỗi kẹt xe và lặp lực phóng làm vận tốc tăng vô hạn.

---

## 2. QUY CHUẨN ĐỘNG LỰC HỌC CẦU & BẢO TOÀN THOÁT LY (ORBITAL MECHANICS)

### 2.1 Tích phân trắc địa bám đất (Geodesic Arc Manifold Integration)
* Khi xe ở trạng thái bám đất ($F_N > 0$), việc cộng vector tiếp tuyến phẳng Euler thông thường $\vec{p}_{t+1} = \vec{p}_t + \vec{v}\Delta t$ sinh ra sai số lệch tâm $\Delta h \approx \frac{v^2 \Delta t^2}{2R}$. Ở trọng lực thấp (0.16G, 1G), sai số này làm xe bị văng ảo như vừa lao qua một cái dốc.
* **Quy chuẩn sửa lỗi:** Khi bám đất, xe di chuyển theo cung đại lộ trắc địa (Great Circle Arc):
  $$\Delta \theta = \frac{v_{\text{tangent}} \Delta t}{R_{\text{ground}}}, \quad \vec{n}_{t+1} = \mathbf{Rot}(\vec{n}_t \times \vec{v}, \Delta \theta) \cdot \vec{n}_t$$
  Xe luôn bám sát mặt cầu hình học lý tưởng kết hợp với cao độ $h(\vec{n})$ mà không bị ảnh hưởng bởi độ phân giải đa giác (polygon count).

### 2.2 Vận tốc bay quỹ đạo ($v_{\text{orb}}$) & Vận tốc thoát ly ($v_{\text{esc}}$)
* Gia tốc ly tâm: $a_c = \frac{v^2}{R}$.
* Lực bám pháp tuyến: $F_N = m \cdot (g(r) - a_c)$.
* **Ngưỡng bay quỹ đạo (Orbital Threshold):**
  $$v_{\text{orb}} = \sqrt{g \cdot R}$$
  Tại vận tốc này, $a_c = g \implies F_N = 0$. Xe tự động chuyển sang cơ chế bay đạn đạo vũ trụ 3D không quán tính.
* **Ngưỡng thoát ly hành tinh (Escape Threshold):**
  $$v_{\text{esc}} = \sqrt{2 \cdot g \cdot R} = \sqrt{2} \cdot v_{\text{orb}}$$
  Nếu xe kích hoạt Nitro vượt qua vận tốc $v_{\text{esc}}$, năng lượng động năng vượt qua thế năng hấp dẫn, xe sẽ thoát ly hoàn toàn khỏi hành tinh Kaio vào không gian sâu.

### 2.3 Cơ chế Nitro phản lực vô điều kiện
* Trạng thái Nitro (`state.isNitro`) được kiểm tra và cập nhật **vô điều kiện mỗi frame** cho dù xe đang bám đất hay đang trôi ngoài không gian.
* Nhấn phím `Shift` $\implies$ Phụt lửa Nitro, tăng tốc.
* Buông phím `Shift` $\implies$ Ngắt ngay lập tức, triệt tiêu $100\%$ lỗi kẹt nitro.
* Khi ở trên không: Giữ `Shift` tạo thêm lực đẩy tên lửa (Rocket Thruster) đẩy xe bay thẳng tới trước.

### 2.4 Lõi vật lý Cannon.js & RaycastVehicle (Rigid Body Dynamics)
* **Khắc phục triệt để lỗi va chạm & gờ đa giác polygon:** Thay vì tự viết các phép tính hình chiếu thủ công, toàn bộ động lực học xe và va chạm được chuyển sang sử dụng engine vật lý **Cannon.js** chuyên dụng.
* **Mặt cầu giải tích trơn tuyệt đối (`CANNON.Sphere`):** Mặt đường chạy sử dụng khối cầu giải tích của engine vật lý, triệt tiêu $100\%$ tình trạng các mép tam giác polygon hất văng xe khi chạy ở lực G thấp.
* **Hệ thống treo 4 phuộc nhún lò xo (`CANNON.RaycastVehicle`):** 4 bánh xe có độ cứng lò xo ($k$) và độ giảm chấn (damping) tự động đồng bộ theo lực trọng trường $g(r)$, ôm sát mặt cầu, tự do nhún êm ái khi tăng tốc hay phanh gấp.
* **Bệ phóng Stunt Ramp thực thụ:** Bệ phóng được mô hình hóa thành Static Box Collider trong không gian 3D. Xe phi lên dốc sẽ cất cánh tự nhiên theo đúng định luật bảo toàn động lượng của Newton.

### 2.5 Quy chuẩn góc nhìn Camera & Phím liếc nhìn Q / E (Orbit Camera & Peek Controls)
* **Quy tắc ổn định đường chân trời:** Vector `camera.up` của camera góc nhìn thứ 3 (Chase Cam) và góc nhìn nắp capo (Hood FPV) **BẮT BUỘC** luôn khóa theo vector pháp tuyến xuyên tâm hành tinh ($\vec{n}_{\text{planet}}$ từ tâm khối cầu).
* **Không chao đảo theo thân xe:** Khi xe phi qua ổ gà, dốc mấp mô hoặc nghiêng thân theo góc 4 bánh xe, thân xe sẽ nhún và nghiêng tự nhiên trước màn hình người chơi, trong khi đường chân trời và góc quay của camera vẫn giữ vững vàng theo phương trọng trường thẳng đứng của vũ trụ, triệt tiêu $100\%$ hiện tượng camera bị nghiêng vặn vẹo gây chóng mặt.
* **Tương tác chuột tự do (Top View Only):**
  * **Chế độ Top View (Satellite):** Duy nhất chế độ này được giữ Free Camera xoay 360° bằng chuột và cuộn chuột (scroll) để zoom toàn cảnh hành tinh, kèm cơ chế tự động hồi phục sau 3.0s ngừng tương tác (`idleTimer >= 3.0s`).
  * **Chế độ 3rd (Chase Cam) & 1st (Hood FPV):** Khóa cứng phía sau xe để điều khiển ổn định, không bị xê dịch góc nhìn do vô tình quẹt chuột.
* **Cơ chế liếc nhìn thông minh (Peek Look Q / E):**
  * Giữ phím `Q`: Liếc nhìn góc $90^\circ$ sang sườn trái xe.
  * Giữ phím `E`: Liếc nhìn góc $90^\circ$ sang sườn phải xe.
  * Giữ đồng thời `Q` và `E`: Quay góc nhìn $180^\circ$ ra phía sau xe (Rear-view mirror view).
  * Buông phím: Camera tự động lướt mượt mà $0.15\text{s}$ về lại góc nhìn thẳng phía trước.

### 2.6 Bám địa hình thực tế (Procedural & Sculpted Terrain Manifold)
* **Bắn tia Raycast theo cao độ thực:** Cannon.js `RaycastVehicle` mặc định chỉ raycast vào quả cầu phẳng $R=1000$. Hệ thống đã được nâng cấp với hàm `castRay(wheel)` tùy biến, trực tiếp nội suy cao độ Simplex Noise và các vết điêu khắc nắn đắp (`PlanetRaceTerrain.getElevation`) và vector pháp tuyến mặt dốc (`PlanetRaceTerrain.getSurfaceNormal`).
* **Đường đua lượn sóng & Chạy việt dã (Off-road):** Khi bật đường đua lượn sóng hoặc lái xe ra bãi cỏ dốc, 4 phuộc nhún bám sát 100% hình dạng đồi núi thực tế. Xe leo dốc cao, đổ đèo, vượt hố mấp mô thực thụ chứ không còn chạy như hình cầu phẳng.
* **Lưới an toàn chống lọt đất âm:** Ngưỡng chạm đáy tuyệt đối (`minDist`) tự động nâng hạ theo $R + h(\vec{n}) + 0.40\text{m}$, bảo đảm xe không bao giờ bị chui tụt xuống lòng đất ở bất kỳ lực G nào.

---

## 3. DANH BẠ QUY CHUẨN MODEL ID & SHOWROOM ASSET CATALOG

Bảng định danh tra cứu thống nhất giữa mã nguồn ([`assets.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/planet-race/world/assets.js)), Showroom 3D Inspector ([`showroom.js`](file:///d:/Installer/tranthangminh.github.io/products/web-apps/planet-race/ui/showroom.js)) và yêu cầu của người dùng:

| Model ID | Tên hiển thị | Nhóm danh mục | Kích thước chuẩn (Dài × Rộng × Cao) | Quy tắc hướng mọc & Cắm móng |
| :--- | :--- | :--- | :--- | :--- |
| `tree_kaio` | Cây Thần Cổ Thụ Kaio | Cảnh quan thiên nhiên | $6.20\text{m} \times 6.20\text{m} \times 8.50\text{m}$ | Mọc $\perp$ vector mặt polygon địa hình. Chân rễ âm đất $0.4\text{m}$. |
| `boulder_cosmic` | Tảng Đá Vũ Trụ Đa Diện | Cảnh quan thiên nhiên | $4.80\text{m} \times 4.80\text{m} \times 4.00\text{m}$ | Mọc theo tâm hành tinh ($\vec{n}_{\text{radial}}$). Móng chôn sâu $45\%$ ($2.0\text{m}$). |
| `street_lantern_kaio` | Đèn Đường Vũ Trụ Cao Áp | Đạo cụ & Tiện ích | $2.20\text{m} \times 0.90\text{m} \times 7.20\text{m}$ | Mọc theo tâm hành tinh. Móng bê tông đúc sâu $1.5\text{m}$ âm đất. |
| `ramp_orbital_stunt` | Bàn Đạp Phóng Quỹ Đạo | Đạo cụ & Tiện ích | $10.50\text{m} \times 8.00\text{m} \times 2.80\text{m}$ | Mọc theo tâm hành tinh, tiếp tuyến đường đua. Chân đế âm đất $0.8\text{m}$. |
| `kaio_sanctuary` | Thánh Địa Thần Vũ Trụ | Kiến trúc & Thánh địa | $15.60\text{m} \times 15.60\text{m} \times 14.50\text{m}$ | Mọc theo tâm hành tinh. Móng trụ đá nguyên khối âm đất $3.5\text{m}$. |
| `player_sport` | Sedan Thể Thao R-Line | Xe đua người chơi | $4.25\text{m} \times 1.82\text{m} \times 1.35\text{m}$ | Động lực học 4 bánh, công suất 245 HP, khối lượng 1400 kg. |
| `player_supercar` | Hypercar Quỹ Đạo V-12 | Xe đua người chơi | $4.60\text{m} \times 1.98\text{m} \times 1.15\text{m}$ | Động lực học Downforce, công suất 1200 HP, khối lượng 1100 kg. |
| `player_kaio_classic` | Roadster Kaio Cổ Điển | Xe đua người chơi | $3.90\text{m} \times 1.70\text{m} \times 1.25\text{m}$ | Khung mui trần Kaio nguyên bản Dragon Ball, 210 HP, khối lượng 950 kg. |

---

## 4. HƯỚNG DẪN GỌI TÊN ĐIỀU CHỈNH QUA CHAT

Khi người dùng muốn thay đổi thẩm mỹ hoặc kích thước của bất kỳ vật thể nào:
1. Mở Showroom bằng nút **`🏛️ SHOWROOM`** trên thanh công cụ góc trên màn hình.
2. Xoay 360° và cuộn phóng to để kiểm tra chi tiết vật thể.
3. Nhấn nút **`📋 Copy`** cạnh Model ID (ví dụ: `tree_kaio` hoặc `street_lantern_kaio`).
4. Gửi yêu cầu qua chat kèm mã ID:
   * *Ví dụ:* "Sửa `tree_kaio` cho tán lá bự gấp rưỡi và thân ngoằn ngoèo hơn".
   * *Ví dụ:* "Tăng chiều cao cột đèn `street_lantern_kaio` lên 9 mét".
   * *Ví dụ:* "Chỉnh mui xe `player_kaio_classic` sang màu vàng".
