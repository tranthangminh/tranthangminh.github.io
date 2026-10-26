/**
 * Planet Race - 3D Procedural Assets & Foundation Architecture Engine
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceAssets = {
  materials: {
    trunk: null,
    leaves: null,
    leavesAlt: null,
    rock: null,
    rockFoundation: null,
    sanctuaryWall: null,
    sanctuaryRoof: null,
    antenna: null,
    woodDoor: null,
    concreteBase: null,
    lanternPole: null,
    lanternBulb: null,
    rampMat: null,
    rampChevron: null
  },

  initMaterials() {
    if (this.materials.trunk) return;
    this.materials.trunk = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85, metalness: 0.05 });
    this.materials.leaves = new THREE.MeshStandardMaterial({ color: 0x1abc9c, roughness: 0.65 });
    this.materials.leavesAlt = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 });
    this.materials.rock = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.9, flatShading: true });
    this.materials.rockFoundation = new THREE.MeshStandardMaterial({ color: 0x576574, roughness: 0.95 });
    this.materials.sanctuaryWall = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.35, metalness: 0.05 });
    this.materials.sanctuaryRoof = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 });
    this.materials.antenna = new THREE.MeshBasicMaterial({ color: 0xdfe6e9 });
    this.materials.woodDoor = new THREE.MeshLambertMaterial({ color: 0x795548 });
    this.materials.concreteBase = new THREE.MeshStandardMaterial({ color: 0x8395a7, roughness: 0.9 });
    this.materials.lanternPole = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.6 });
    this.materials.lanternBulb = new THREE.MeshBasicMaterial({ color: 0xf6e58d });
    this.materials.rampMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.4 });
    this.materials.rampChevron = new THREE.MeshBasicMaterial({ color: 0x1e272e });
  },

  /**
   * CÂY THẦN CỔ THỤ (Bent Kaio Tree)
   * QUY TẮC: Mọc vuông góc với vector bề mặt polygon địa hình (Surface Normal)
   * Kích thước: Cao ~8.5m, Tán rộng 6.2m, Thân gốc Ø0.9m
   */
  createKaioTree() {
    this.initMaterials();
    const group = new THREE.Group();
    group.name = 'tree_kaio';

    // 1. Chân rễ bám đất (Root Base anchor)
    const rootGeo = new THREE.CylinderGeometry(0.7, 1.1, 1.2, 8);
    const roots = new THREE.Mesh(rootGeo, this.materials.trunk);
    roots.position.y = -0.4; // Cắm nhẹ 0.4m xuống lớp cỏ
    roots.receiveShadow = true;
    group.add(roots);

    // 2. Thân cây uốn lượn đặc trưng Dragon Ball (Trunk)
    const trunkGeo = new THREE.CylinderGeometry(0.48, 0.75, 6.2, 8);
    trunkGeo.rotateZ(0.22); // Nghiêng tự nhiên
    const trunk = new THREE.Mesh(trunkGeo, this.materials.trunk);
    trunk.position.set(-0.6, 2.9, 0);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 3. Tán lá chính xanh ngọc bích (Main Emerald Canopy)
    const canopyMain = new THREE.Mesh(new THREE.SphereGeometry(3.1, 12, 10), this.materials.leaves);
    canopyMain.position.set(-1.8, 6.4, 0);
    canopyMain.scale.set(1.1, 0.95, 1.05);
    canopyMain.castShadow = true;
    group.add(canopyMain);

    // 4. Búi tán phụ phía trên (Secondary Top Puff)
    const canopyTop = new THREE.Mesh(new THREE.SphereGeometry(2.1, 10, 8), this.materials.leavesAlt);
    canopyTop.position.set(-2.4, 8.2, 0.4);
    canopyTop.castShadow = true;
    group.add(canopyTop);

    return group;
  },

  /**
   * TẢNG ĐÁ VŨ TRỤ (Cosmic Boulder)
   * QUY TẮC: Mọc hướng tâm hành tinh (Radial Normal), móng chôn sâu 45% tránh lơ lửng
   * Kích thước: Rộng ~4.8m, Cao nổi ~2.5m, Móng chôn sâu ~2.0m
   */
  createCosmicBoulder(radius = 2.4) {
    this.initMaterials();
    const group = new THREE.Group();
    group.name = 'boulder_cosmic';

    // 1. Khối đá nổi chính trên mặt đất
    const rockGeo = new THREE.DodecahedronGeometry(radius, 1);
    const rock = new THREE.Mesh(rockGeo, this.materials.rock);
    rock.position.y = radius * 0.25;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // 2. Móng đá sâu ngầm (Deep Subterranean Foundation Anchor)
    // Ngăn tình trạng sườn đồi dốc làm hở khe không khí dưới chân đá
    const anchorGeo = new THREE.CylinderGeometry(radius * 0.85, radius * 0.6, radius * 1.4, 8);
    const anchor = new THREE.Mesh(anchorGeo, this.materials.rockFoundation);
    anchor.position.y = -radius * 0.65;
    anchor.receiveShadow = true;
    group.add(anchor);

    return group;
  },

  /**
   * CỘT ĐÈN ĐƯỜNG VŨ TRỤ (Cosmic Street Lantern)
   * QUY TẮC: Mọc hướng tâm hành tinh, móng bê tông đúc sâu 1.5m âm đất
   * Kích thước: Cao 7.2m, Vươn cần 2.2m, Móng sâu 1.5m
   */
  createStreetLantern() {
    this.initMaterials();
    const group = new THREE.Group();
    group.name = 'street_lantern_kaio';

    // 1. Móng bê tông đúc sâu âm đất (Deep Foundation Footing)
    const footingGeo = new THREE.BoxGeometry(0.9, 1.8, 0.9);
    const footing = new THREE.Mesh(footingGeo, this.materials.concreteBase);
    footing.position.y = -0.7; // 1.4m nằm âm trong lòng đất
    footing.receiveShadow = true;
    group.add(footing);

    // 2. Đế thép neo bu lông trên mặt đất
    const baseGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.4, 8);
    const base = new THREE.Mesh(baseGeo, this.materials.lanternPole);
    base.position.y = 0.2;
    group.add(base);

    // 3. Thân cột đèn thẳng đứng
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.lanternPole);
    pole.position.y = 3.3;
    pole.castShadow = true;
    group.add(pole);

    // 4. Cần đèn vươn ngang về phía lòng đường
    const armGeo = new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8);
    armGeo.rotateZ(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, this.materials.lanternPole);
    arm.position.set(1.0, 6.2, 0);
    group.add(arm);

    // 5. Chụp đèn & Bóng phát quang năng lượng vũ trụ
    const capGeo = new THREE.ConeGeometry(0.45, 0.35, 8);
    const cap = new THREE.Mesh(capGeo, this.materials.lanternPole);
    cap.position.set(2.0, 6.1, 0);
    group.add(cap);

    const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bulb = new THREE.Mesh(bulbGeo, this.materials.lanternBulb);
    bulb.position.set(2.0, 5.85, 0);
    group.add(bulb);

    return group;
  },

  /**
   * THÁNH ĐỊA THẦN VŨ TRỤ (Kaio Sanctuary House)
   * QUY TẮC: Mọc hướng tâm hành tinh, móng trụ đá nguyên khối sâu 3.5m cắm lõi
   * Kích thước: Đường kính 15.6m, Cao tổng thể 14.5m
   */
  createKaioSanctuary() {
    this.initMaterials();
    const group = new THREE.Group();
    group.name = 'kaio_sanctuary';

    // 1. Móng trụ đá nguyên khối âm đất (Deep Foundation Plinth)
    const foundationGeo = new THREE.CylinderGeometry(8.2, 8.6, 4.0, 24);
    const foundation = new THREE.Mesh(foundationGeo, this.materials.rockFoundation);
    foundation.position.y = -1.8; // 3.6m nằm chìm dưới mặt đất, triệt tiêu lơ lửng
    foundation.receiveShadow = true;
    group.add(foundation);

    // 2. Thân nhà trụ tròn màu trắng (Main Rotunda Wall)
    const baseGeo = new THREE.CylinderGeometry(7.5, 7.5, 5.5, 24);
    const base = new THREE.Mesh(baseGeo, this.materials.sanctuaryWall);
    base.position.y = 2.75;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 3. Mái vòm bán cầu đỏ tươi (Red Hemisphere Dome)
    const roofGeo = new THREE.SphereGeometry(7.8, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const roof = new THREE.Mesh(roofGeo, this.materials.sanctuaryRoof);
    roof.position.y = 5.5;
    roof.castShadow = true;
    group.add(roof);

    // 4. Cột ăng-ten thập tự liên lạc ngân hà (Cosmic Cross Antenna)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8), this.materials.antenna);
    pole.position.y = 12.8;
    group.add(pole);

    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 8), this.materials.antenna);
    cross.rotateZ(Math.PI / 2);
    cross.position.y = 13.8;
    group.add(cross);

    // 5. Cửa chính gỗ sồi nâu & Bậc tam cấp
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.35), this.materials.woodDoor);
    door.position.set(0, 1.6, 7.4);
    group.add(door);

    const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 1.2), this.materials.concreteBase);
    step.position.set(0, 0.18, 7.8);
    step.receiveShadow = true;
    group.add(step);

    return group;
  },

  /**
   * BÀN ĐẠP PHÓNG QUỸ ĐẠO (Orbital Stunt Launch Ramp)
   * QUY TẮC: Mọc hướng tâm, tiếp tuyến đường đua, vuốt dốc êm không gờ cản
   * Kích thước: Dài 12.0m, Rộng 7.6m, Cao đỉnh 2.2m
   */
  createStuntRamp() {
    this.initMaterials();
    const group = new THREE.Group();
    group.name = 'ramp_orbital_stunt';

    const w = 7.6;
    const l = 12.0;
    const h = 2.2;
    const halfW = w * 0.5;
    const halfL = l * 0.5;

    // Nêm dốc khí động học 3D (Mép vào z = -halfL nằm sát mặt đường y = 0.02)
    const vertices = [
      // Mặt dốc chính (Top ramp slope)
      -halfW, 0.02, -halfL,
       halfW, 0.02, -halfL,
      -halfW, h,     halfL,

       halfW, 0.02, -halfL,
       halfW, h,     halfL,
      -halfW, h,     halfL,

      // Vách thành bên trái (âm đất -0.6m chống hở khe)
      -halfW, -0.6, -halfL,
      -halfW, 0.02, -halfL,
      -halfW, h,     halfL,

      -halfW, -0.6, -halfL,
      -halfW, h,     halfL,
      -halfW, -0.6,  halfL,

      // Vách thành bên phải
       halfW, 0.02, -halfL,
       halfW, -0.6, -halfL,
       halfW, h,     halfL,

       halfW, -0.6, -halfL,
       halfW, -0.6,  halfL,
       halfW, h,     halfL,

      // Vách đứng phía sau (Back drop wall)
      -halfW, -0.6, halfL,
      -halfW, h,    halfL,
       halfW, h,    halfL,

      -halfW, -0.6, halfL,
       halfW, h,    halfL,
       halfW, -0.6, halfL
    ];

    const rampGeo = new THREE.BufferGeometry();
    rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    rampGeo.computeVertexNormals();

    const rampMesh = new THREE.Mesh(rampGeo, this.materials.rampMat);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    group.add(rampMesh);

    // Vạch kẻ sơn cảnh báo mũi tên đen trên mặt dốc
    const chevronGeo = new THREE.PlaneGeometry(6.2, 1.4);
    chevronGeo.rotateX(-Math.atan2(h - 0.02, l));
    const chevron = new THREE.Mesh(chevronGeo, this.materials.rampChevron);
    chevron.position.set(0, h * 0.5 + 0.04, 0);
    group.add(chevron);

    return group;
  }
};
