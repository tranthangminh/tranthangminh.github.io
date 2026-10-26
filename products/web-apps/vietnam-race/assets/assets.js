/**
 * Vietnam Race - Centralized Asset Registry & Procedural Generator
 * Conforms to: products/web-apps/_RULE-web-apps.md
 */
window.VietnamRaceAssets = {
  // Shared Cached Materials to minimize GPU memory & State switches
  materials: {
    trunk: null,
    canopyGreen: null,
    canopyRed: null,
    canopyPine: null,
    metalGray: null,
    metalSilver: null,
    plasticRed: null,
    plasticBlue: null,
    tinBlue: null,
    asphaltDark: null
  },

  initMaterials() {
    if (this.materials.trunk || !window.THREE) return;
    this.materials.trunk = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    this.materials.canopyGreen = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    this.materials.canopyRed = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    this.materials.canopyPine = new THREE.MeshLambertMaterial({ color: 0x1b4d3e });
    this.materials.metalGray = new THREE.MeshLambertMaterial({ color: 0x4b6584 });
    this.materials.metalSilver = new THREE.MeshStandardMaterial({ color: 0xd1d8e0, metalness: 0.85, roughness: 0.2 });
    this.materials.plasticRed = new THREE.MeshLambertMaterial({ color: 0xeb3b5a });
    this.materials.plasticBlue = new THREE.MeshLambertMaterial({ color: 0x3867d6 });
    this.materials.tinBlue = new THREE.MeshLambertMaterial({ color: 0x2d98da });
    this.materials.asphaltDark = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  },

  // =========================================================================
  // 1. CÂY CỐI ĐÔ THỊ & TỰ NHIÊN (TREES FACTORY)
  // =========================================================================

  // Cây xà cừ cổ thụ (To cao, tán rợp bóng)
  createTreeXacu() {
    this.initMaterials();
    const group = new THREE.Group();

    // Thân cây to cao 6m
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.65, 6, 6),
      this.materials.trunk
    );
    trunk.position.y = 3;
    trunk.castShadow = true;
    group.add(trunk);

    // Tán lá xà cừ phân tầng tròn
    const mainCanopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.2, 1),
      this.materials.canopyGreen
    );
    mainCanopy.position.y = 7.8;
    mainCanopy.castShadow = true;
    group.add(mainCanopy);

    const subCanopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.8, 1),
      this.materials.canopyGreen
    );
    subCanopy.position.set(1.6, 9.2, -1.2);
    group.add(subCanopy);

    return group;
  },

  // Cây hoa phượng vĩ (Tán xòe ngang điểm hoa đỏ)
  createTreePhuong() {
    this.initMaterials();
    const group = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 5, 6),
      this.materials.trunk
    );
    trunk.position.y = 2.5;
    group.add(trunk);

    // Tán lá xanh xòe
    const greenCanopy = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 1.5, 2.2, 8),
      this.materials.canopyGreen
    );
    greenCanopy.position.y = 5.8;
    group.add(greenCanopy);

    // Chùm hoa phượng đỏ rực trên đỉnh
    const redFlowers = new THREE.Mesh(
      new THREE.ConeGeometry(3.6, 1.4, 7),
      this.materials.canopyRed
    );
    redFlowers.position.y = 7.0;
    group.add(redFlowers);

    return group;
  },

  // Cây dừa / cọ nghiêng ven sông
  createTreeDua() {
    this.initMaterials();
    const group = new THREE.Group();

    // Thân dừa cong nghiêng
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.32, 7, 6),
      this.materials.trunk
    );
    trunk.position.set(0.6, 3.4, 0);
    trunk.rotation.z = -0.16; // Nghiêng nhẹ
    group.add(trunk);

    // Chùm lá dừa tỏa tròn
    const fronds = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 1.2, 6),
      this.materials.canopyGreen
    );
    fronds.position.set(1.2, 7.0, 0);
    fronds.rotation.x = Math.PI; // Chúc xuống
    group.add(fronds);

    return group;
  },

  // =========================================================================
  // 2. PHỤ KIỆN ĐƯỜNG PHỐ & VĂN HÓA VỈA HÈ (STREET FURNITURE & PROPS)
  // =========================================================================

  // Cột đèn cao áp đô thị (Cột thép vươn cần chìa bóng đèn)
  createStreetLamp() {
    this.initMaterials();
    const group = new THREE.Group();

    // Thân cột cao 9m
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.22, 9, 8),
      this.materials.metalGray
    );
    pole.position.y = 4.5;
    group.add(pole);

    // Cần đèn cong vươn ra
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 0.12),
      this.materials.metalGray
    );
    arm.position.set(1.2, 8.9, 0);
    arm.rotation.z = 0.12;
    group.add(arm);

    // Hộp đèn chiếu sáng vàng
    const lampHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.18, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xfffa65 })
    );
    lampHead.position.set(2.3, 9.0, 0);
    group.add(lampHead);

    return group;
  },

  // Quán trà đá / Cà phê cóc vỉa hè (Đặc trưng Việt Nam)
  createTeaStall() {
    this.initMaterials();
    const group = new THREE.Group();

    // Bàn trà vuông thấp
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.55, 0.9),
      this.materials.tinBlue
    );
    table.position.y = 0.275;
    group.add(table);

    // Ấm trà / hộp xốp trên bàn
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.22, 6),
      this.materials.metalSilver
    );
    pot.position.set(0, 0.66, 0);
    group.add(pot);

    // 4 ghế nhựa đỏ & xanh con quanh bàn
    const stoolOffsets = [
      [-0.8, -0.4, this.materials.plasticRed],
      [-0.8, 0.4, this.materials.plasticBlue],
      [0.8, -0.4, this.materials.plasticBlue],
      [0.8, 0.4, this.materials.plasticRed]
    ];
    stoolOffsets.forEach(([ox, oz, mat]) => {
      const stool = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.3, 0.35),
        mat
      );
      stool.position.set(ox, 0.15, oz);
      group.add(stool);
    });

    return group;
  },

  // Lô cốt công trình quây tôn xanh (Chướng ngại vật đào đường)
  createConstructionBarrier() {
    this.initMaterials();
    const group = new THREE.Group();

    // Khối quây tôn xanh chữ nhật
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.9, 2.0),
      this.materials.tinBlue
    );
    wall.position.y = 0.95;
    group.add(wall);

    // Đèn chớp cảnh báo vàng trên nóc
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.3, 8),
      new THREE.MeshBasicMaterial({ color: 0xf39c12 })
    );
    beacon.position.set(0, 2.05, 0);
    group.add(beacon);

    return group;
  },

  // =========================================================================
  // 3. CHI TIẾT NÓC NHÀ VIỆT NAM (ROOFTOP DETAILS)
  // =========================================================================

  // Bồn nước inox Tân Á / Sơn Hà nằm ngang có chân giá
  createWaterTank() {
    this.initMaterials();
    const group = new THREE.Group();

    // Thân bồn inox trụ tròn nằm ngang
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.8, 12),
      this.materials.metalSilver
    );
    tank.rotation.z = Math.PI / 2;
    tank.position.y = 0.8;
    group.add(tank);

    // Chân giá sắt đỡ bồn
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.35, 0.9),
      this.materials.metalGray
    );
    legs.position.y = 0.18;
    group.add(legs);

    return group;
  },

  // Chuồng cọp sắt phơi quần áo
  createTigerCage(w = 3.5, h = 2.2, d = 2.0) {
    this.initMaterials();
    const cageGeo = new THREE.BoxGeometry(w, h, d);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x718093,
      wireframe: true // Khung lưới mắt cáo
    });
    const cage = new THREE.Mesh(cageGeo, cageMat);
    cage.position.y = h / 2;
    return cage;
  },

  // =========================================================================
  // 4. PHƯƠNG TIỆN GIAO THÔNG AI (TRAFFIC VEHICLES FACTORY)
  // =========================================================================

  // Xe máy AI (Scooter / Wave) kèm người lái áo chống nắng / áo ôm công nghệ
  createTrafficScooter(shirtColorHex = 0x27ae60) { // Mặc định xanh lá Grab
    const group = new THREE.Group();

    // Khung thân xe máy
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.5, 1.7),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 })
    );
    body.position.y = 0.45;
    group.add(body);

    // 2 Bánh xe máy
    const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 10);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [-0.6, 0.6].forEach((zOff) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.26, zOff);
      group.add(wheel);
    });

    // Người lái (Thân áo màu công nghệ + Mũ bảo hiểm)
    const rider = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.6, 0.35),
      new THREE.MeshLambertMaterial({ color: shirtColorHex })
    );
    rider.position.set(0, 0.95, -0.1);
    group.add(rider);

    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshLambertMaterial({ color: shirtColorHex })
    );
    helmet.position.set(0, 1.35, -0.1);
    group.add(helmet);

    return group;
  },

  // Taxi AI (Xanh SM, Mai Linh, Vinasun)
  createTrafficTaxi(brand = 'xanh_sm') {
    const group = new THREE.Group();
    let bodyColor = 0x00b894; // Xanh SM ngọc
    if (brand === 'mailinh') bodyColor = 0x2ecc71; // Xanh lá
    if (brand === 'vinasun') bodyColor = 0xecf0f1; // Trắng đỏ

    // Thân taxi
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 4.0),
      new THREE.MeshLambertMaterial({ color: bodyColor })
    );
    body.position.y = 0.5;
    group.add(body);

    // Mào taxi trên nóc (Hộp đèn Taxi phát sáng)
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xf1c40f })
    );
    taxiSign.position.set(0, 1.25, -0.2);
    group.add(taxiSign);

    return group;
  },

  // Xe máy thồ hàng (Wave / Dream chở thùng hàng to đằng sau)
  createTrafficDeliveryScooter() {
    const group = this.createTrafficScooter(0xf39c12); // Áo vàng / cam Be / Shopee

    // Thùng carton hàng to đằng sau xe
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.55, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xd35400 })
    );
    box.position.set(0, 0.9, -0.65);
    group.add(box);

    return group;
  },

  // Xe buýt đô thị (Bus Hà Nội vàng-đỏ hoặc Bus TP.HCM xanh lá)
  createTrafficBus(isHanoi = false) {
    const group = new THREE.Group();
    const busColor = isHanoi ? 0xd63031 : 0x27ae60; // Đỏ hoặc xanh lá

    // Thân xe buýt lớn dài 9.5m, rộng 2.4m, cao 2.9m
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.6, 9.5),
      new THREE.MeshLambertMaterial({ color: busColor })
    );
    body.position.y = 1.6;
    group.add(body);

    // Kính xe đen chạy ngang
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.44, 0.9, 8.8),
      new THREE.MeshBasicMaterial({ color: 0x1e272e })
    );
    glass.position.set(0, 2.0, 0);
    group.add(glass);

    // Bánh xe lớn
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [-3.2, 3.2].forEach((zOff) => {
      [-1.2, 1.2].forEach((xOff) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(xOff, 0.48, zOff);
        group.add(wheel);
      });
    });

    return group;
  },

  // Dải phân cách bê tông (Jersey Barrier)
  createJerseyBarrier(len = 4.0) {
    this.initMaterials();
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.85, len),
      new THREE.MeshLambertMaterial({ color: 0x95a5a6 })
    );
    barrier.position.y = 0.425;
    return barrier;
  },

  // Cột đèn giao thông 3 màu (Traffic Light)
  createTrafficLight() {
    this.initMaterials();
    const group = new THREE.Group();

    // Cột thép cao 4.5m
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 4.5, 8),
      this.materials.metalGray
    );
    pole.position.y = 2.25;
    group.add(pole);

    // Hộp đèn 3 ô
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.0, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x1e272e })
    );
    box.position.set(0, 3.8, 0.2);
    group.add(box);

    // 3 Mắt đèn: Đỏ, Vàng, Xanh
    const lampGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12);
    const colors = [0xe74c3c, 0xf1c40f, 0x2ecc71];
    [-0.3, 0, 0.3].forEach((yOff, idx) => {
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: colors[idx] }));
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(0, 3.8 + yOff, 0.36);
      group.add(lamp);
    });

    return group;
  }
};
