# THƯ MỤC CHỨA FILE 3D (.GLB / .GLTF) - VIETNAM RACE 3D

Thư mục này dùng để lưu trữ các **file mô hình 3D độc bản** được xuất từ Blender (định dạng `.glb` được khuyến nghị vì nén nhẹ nhất).

## QUY TẮC ĐẶT TÊN FILE (NAMING CONVENTION)

### 1. Xe người chơi: `car_[loại]_[tên].glb`
- `car_player_vf3.glb` - Mô hình xe VinFast VF3
- `car_player_sport.glb` - Xe đua thể thao
- `car_player_hover.glb` - Xe bay phản lực VTOL

### 2. Công trình biểu tượng (Landmarks): `landmark_[thành_phố]_[tên].glb`
- `landmark_hcm_bitexco.glb` - Tòa tháp Bitexco (Quận 1)
- `landmark_hcm_benthanh.glb` - Chợ Bến Thành
- `landmark_hcm_notredame.glb` - Nhà thờ Đức Bà
- `landmark_hcm_bason.glb` - Cầu Ba Son (Thủ Thiêm 2)
- `landmark_hn_longbien.glb` - Cầu Long Biên (Hà Nội)

### 3. Phụ kiện đặc biệt (Props): `prop_[tên].glb`
- `prop_tea_stall.glb` - Quán cóc vỉa hè
- `prop_barrier_locot.glb` - Lô cốt rào tôn xanh

## TIÊU CHUẨN ĐỒ HỌA
- **Polycount:**
  - Xe người chơi: $< 5.000$ đa giác (triangles).
  - Landmark lớn: $< 8.000$ đa giác.
  - Phụ kiện nhỏ: $< 300$ đa giác.
- **Texture:** Ưu tiên Texture Atlas đơn ($512 \times 512$ hoặc $1024 \times 1024$) hoặc Vertex Colors để giữ dung lượng file $< 500\text{KB}$.
