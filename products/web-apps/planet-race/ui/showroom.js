/**
 * Planet Race - 3D Asset Showroom & Interactive Model Inspector
 * Features 360-degree Orbit & Zoom controls, Turntable lighting, Categorized Sidebar & Spec Telemetry
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceShowroom = {
  studioGroup: null,
  currentModel: null,
  turntable: null,
  activeItem: null,
  autoSpin: true,

  // Camera Orbit State
  orbitYaw: 0.6,
  orbitPitch: 0.38,
  orbitDist: 12.0,
  orbitTarget: { x: 0, y: 1.5, z: 0 },
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  hasEvents: false,

  init(scene, container) {
    if (this.studioGroup) return;

    const group = new THREE.Group();
    group.name = 'showroomStudio';
    this.studioGroup = group;

    // 1. Sleek Studio Turntable Platform
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.75 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.45, 48), tableMat);
    table.position.y = -0.22;
    table.receiveShadow = true;
    group.add(table);
    this.turntable = table;

    // Neon Cyan Ring around turntable edge
    const ringGeo = new THREE.RingGeometry(8.4, 8.8, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00d2d3, side: THREE.DoubleSide }));
    ring.position.y = 0.02;
    group.add(ring);

    // Studio Floor Grid Helper
    const grid = new THREE.GridHelper(45, 45, 0x00d2d3, 0x1e293b);
    grid.position.y = -0.24;
    group.add(grid);

    // 2. Studio 3-Point Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(16, 22, 16);
    group.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d2d3, 1.1);
    rimLight.position.set(-18, 14, -16);
    group.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffbe76, 0.6);
    fillLight.position.set(12, -4, -12);
    group.add(fillLight);

    group.add(new THREE.AmbientLight(0xffffff, 0.8));
    scene.add(group);

    // 3. Setup Orbit Controls & Sidebar
    this.setupOrbitEvents(container || document.getElementById('canvasContainer'));
    this.renderSidebar();

    const defaultItem = this.getAssetList()[0];
    this.selectItem(defaultItem);
  },

  setupOrbitEvents(container) {
    if (!container || this.hasEvents) return;
    this.hasEvents = true;

    container.addEventListener('pointerdown', (e) => {
      if (window.PlanetRaceApp?.currentMode !== 'showroom') return;
      if (e.target.tagName !== 'CANVAS') return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || window.PlanetRaceApp?.currentMode !== 'showroom') return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.orbitYaw -= dx * 0.008;
      this.orbitPitch = Math.max(0.05, Math.min(1.45, this.orbitPitch + dy * 0.008));
    });

    window.addEventListener('pointerup', () => (this.isDragging = false));

    container.addEventListener('wheel', (e) => {
      if (window.PlanetRaceApp?.currentMode !== 'showroom') return;
      e.preventDefault();
      const zoomSpeed = this.orbitDist * 0.08;
      this.orbitDist = Math.max(2.5, Math.min(75.0, this.orbitDist + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed)));
    }, { passive: false });
  },

  getAssetList() {
    const assets = window.PlanetRaceAssets || {};
    const car = window.PlanetRaceCar || {};
    const specs = window.PlanetRaceVehicleSpecs?.profiles || {};

    return [
      // 1. Xe Đua (Vehicles)
      {
        id: 'player_sport',
        name: 'Sedan Thể Thao R-Line',
        catKey: 'cars',
        catName: '🏎️ Xe Đua',
        dims: { length: 4.25, width: 1.82, height: 1.35 },
        rule: 'Khối động lực học bánh xe 4WD, trọng tâm thấp, bám cung đại lộ Geodesic.',
        desc: 'Mẫu xe sedan tiêu chuẩn 245 HP, cân bằng giữa tốc độ và khả năng bám cua xích đạo.',
        fn: () => car.createStandaloneMesh?.('player_sport')
      },
      {
        id: 'player_supercar',
        name: 'Hypercar Quỹ Đạo V-12',
        catKey: 'cars',
        catName: '🏎️ Xe Đua',
        dims: { length: 4.60, width: 1.98, height: 1.15 },
        rule: 'Khối khí động học siêu nhẹ 1100kg, cánh gió tạo lực ép Downforce.',
        desc: 'Chiến mã 1200 HP, tốc độ tối đa 420 km/h, dễ dàng vượt ngưỡng Vorb để bay quỹ đạo.',
        fn: () => car.createStandaloneMesh?.('player_supercar')
      },
      {
        id: 'player_kaio_classic',
        name: 'Roadster Kaio Cổ Điển',
        catKey: 'cars',
        catName: '🏎️ Xe Đua',
        dims: { length: 3.90, width: 1.70, height: 1.25 },
        rule: 'Khung mui trần phong cách Dragon Ball thần vũ trụ, 210 HP.',
        desc: 'Chiếc xe mui trần cổ điển màu đỏ của Thần Vũ Trụ King Kai.',
        fn: () => car.createStandaloneMesh?.('player_kaio_classic')
      },

      // 2. Thiên Nhiên & Cảnh Quan (Nature)
      {
        id: 'tree_kaio',
        name: 'Cây Thần Cổ Thụ Kaio',
        catKey: 'nature',
        catName: '🌲 Cảnh Quan Thiên Nhiên',
        dims: { length: 6.20, width: 6.20, height: 8.50 },
        rule: 'QUY TẮC: Mọc vuông góc với vector bề mặt polygon địa hình (N_surface ⟂ Slope).',
        desc: 'Thân gỗ uốn cong nghệ thuật với 2 chùm tán ngọc bích. Rễ cắm nhẹ 0.4m chống trôi dốc.',
        fn: () => assets.createKaioTree?.()
      },
      {
        id: 'boulder_cosmic',
        name: 'Tảng Đá Vũ Trụ Đa Diện',
        catKey: 'nature',
        catName: '🌲 Cảnh Quan Thiên Nhiên',
        dims: { length: 4.80, width: 4.80, height: 4.00 },
        rule: 'QUY TẮC: Mọc theo tâm hành tinh (Radial Normal), móng chôn sâu 45% tránh lơ lửng.',
        desc: 'Khối đá đa diện Dodecahedron gồ ghề. Đế đá ngầm sâu 2.0m cắm xuyên qua sườn đồi dốc.',
        fn: () => assets.createCosmicBoulder?.(2.4)
      },

      // 3. Đạo Cụ & Giao Thông Vũ Trụ (Props)
      {
        id: 'street_lantern_kaio',
        name: 'Đèn Đường Vũ Trụ Cao Áp',
        catKey: 'props',
        catName: '💡 Đạo Cụ & Tiện Ích',
        dims: { length: 2.20, width: 0.90, height: 7.20 },
        rule: 'QUY TẮC: Mọc theo tâm hành tinh, móng bê tông đúc sâu 1.5m âm đất.',
        desc: 'Cột đèn cao tốc vũ trụ vươn cần 2.2m vào lòng đường. Bóng vàng năng lượng vĩnh cửu.',
        fn: () => assets.createStreetLantern?.()
      },
      {
        id: 'ramp_orbital_stunt',
        name: 'Bàn Đạp Phóng Quỹ Đạo',
        catKey: 'props',
        catName: '💡 Đạo Cụ & Tiện Ích',
        dims: { length: 10.50, width: 8.00, height: 2.80 },
        rule: 'QUY TẮC: Mọc theo tâm hành tinh, tiếp tuyến đường đua, đế âm đất 0.8m chống gờ.',
        desc: 'Bàn phóng dốc cam cảnh báo sọc chevron. Kích hoạt xung lực đẩy xe vọt lên không trung 24 m/s.',
        fn: () => assets.createStuntRamp?.()
      },

      // 4. Kiến Trúc (Architecture)
      {
        id: 'kaio_sanctuary',
        name: 'Thánh Địa Thần Vũ Trụ',
        catKey: 'architecture',
        catName: '🏛️ Kiến Trúc & Thánh Địa',
        dims: { length: 15.60, width: 15.60, height: 14.50 },
        rule: 'QUY TẮC: Mọc theo tâm hành tinh, móng trụ đá âm đất 3.5m cắm lõi vững chắc.',
        desc: 'Nhà trụ tròn mái vòm đỏ đặc trưng của King Kai. Cột ăng-ten liên lạc ngân hà cao 14.5m.',
        fn: () => assets.createKaioSanctuary?.()
      }
    ];
  },

  renderSidebar() {
    const listContainer = document.getElementById('showroomAssetList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const items = this.getAssetList();

    // Group by Category
    const groups = {};
    items.forEach((item) => {
      if (!groups[item.catKey]) {
        groups[item.catKey] = { name: item.catName, items: [] };
      }
      groups[item.catKey].items.push(item);
    });

    Object.keys(groups).forEach((catKey) => {
      const g = groups[catKey];
      const header = document.createElement('div');
      header.className = 'showroom-cat-header';
      header.textContent = g.name;
      listContainer.appendChild(header);

      g.items.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'showroom-item-btn';
        btn.dataset.id = item.id;
        btn.innerHTML = `
          <div class="showroom-item-title">${item.name}</div>
          <div class="showroom-item-code">${item.id}</div>
        `;
        btn.addEventListener('click', () => this.selectItem(item));
        listContainer.appendChild(btn);
      });
    });

    // Auto Spin Toggle Button
    const btnSpin = document.getElementById('btnToggleAutoSpin');
    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        this.autoSpin = !this.autoSpin;
        btnSpin.textContent = this.autoSpin ? '🔄 XOAY: BẬT' : '⏸️ XOAY: TẮT';
        btnSpin.classList.toggle('active', this.autoSpin);
      });
    }

    // Copy ID Button
    const btnCopy = document.getElementById('btnCopyAssetId');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (!this.activeItem) return;
        navigator.clipboard.writeText(this.activeItem.id);
        const originalText = btnCopy.textContent;
        btnCopy.textContent = '✅ ĐÃ COPY!';
        setTimeout(() => (btnCopy.textContent = originalText), 1400);
      });
    }
  },

  selectItem(item) {
    if (!item) return;
    this.activeItem = item;

    if (this.currentModel && this.studioGroup) {
      this.studioGroup.remove(this.currentModel);
      this.currentModel = null;
    }

    if (item.fn) {
      try {
        const model = item.fn();
        this.currentModel = model;

        // Auto center bounding box above turntable
        const bbox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        bbox.getCenter(center);
        bbox.getSize(size);

        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= bbox.min.y; // Sits flush on turntable top

        this.studioGroup.add(model);

        const maxDim = Math.max(size.x, size.y, size.z);
        this.orbitTarget.y = Math.min(size.y * 0.45, 12);
        this.orbitDist = Math.max(4.0, maxDim * 1.65);
      } catch (err) {
        console.error('Showroom load error:', item.name, err);
      }
    }

    document.querySelectorAll('.showroom-item-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === item.id);
    });

    this.updateSpecCard(item);
  },

  updateSpecCard(item) {
    const titleEl = document.getElementById('specItemTitle');
    const idEl = document.getElementById('specItemId');
    const dimsEl = document.getElementById('specItemDims');
    const ruleEl = document.getElementById('specItemRule');
    const descEl = document.getElementById('specItemDesc');

    if (titleEl) titleEl.textContent = item.name;
    if (idEl) idEl.textContent = item.id;
    if (dimsEl && item.dims) {
      dimsEl.textContent = `${item.dims.length}m (Dài) × ${item.dims.width}m (Rộng) × ${item.dims.height}m (Cao)`;
    }
    if (ruleEl) ruleEl.textContent = item.rule || 'Không có';
    if (descEl) descEl.textContent = item.desc || '';
  },

  update(dt, camera) {
    if (!camera) return;

    if (this.autoSpin && !this.isDragging) {
      this.orbitYaw += dt * 0.35;
    }

    // Spherical orbit calculation around studio origin
    const cx = this.orbitTarget.x + this.orbitDist * Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch);
    const cy = this.orbitTarget.y + this.orbitDist * Math.sin(this.orbitPitch);
    const cz = this.orbitTarget.z + this.orbitDist * Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch);

    camera.position.set(cx, cy, cz);
    camera.up.set(0, 1, 0); // Strict vertical Up axis (fixes 90 degree sideways tilt)
    camera.lookAt(this.orbitTarget.x, this.orbitTarget.y, this.orbitTarget.z);
  }
};
