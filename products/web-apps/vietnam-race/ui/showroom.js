/**
 * Vietnam Race - 3D Asset Studio & Interactive Model Inspector
 * Features 360-degree Orbit & Zoom controls, Turntable lighting, Categorized Sidebar & Spec Telemetry
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceShowroom = {
  studioGroup: null,
  currentModel: null,
  turntable: null,
  activeItem: null,
  autoSpin: true,

  // Camera Orbit State
  orbitYaw: 0.5,
  orbitPitch: 0.35,
  orbitDist: 8.0,
  orbitTarget: { x: 0, y: 1.2, z: 0 },
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,

  init(scene, container) {
    if (this.studioGroup) return;

    const group = new THREE.Group();
    this.studioGroup = group;

    // 1. Sleek Studio Turntable Platform
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.8 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.0, 0.4, 48), tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    group.add(table);
    this.turntable = table;

    // Neon Glow Ring around turntable edge
    const ringGeo = new THREE.RingGeometry(6.4, 6.7, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00d2d3, side: THREE.DoubleSide }));
    ring.position.y = 0.02;
    group.add(ring);

    // Studio Floor Grid Helper
    const grid = new THREE.GridHelper(36, 36, 0x00d2d3, 0x334155);
    grid.position.y = -0.21;
    group.add(grid);

    // 2. Studio 3-Point Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(12, 18, 14);
    group.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-14, 12, -14);
    group.add(rimLight);

    group.add(new THREE.AmbientLight(0xffffff, 0.7));
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

    container.addEventListener('mousedown', (e) => {
      if (window.VietnamRaceApp?.currentMode !== 'showroom') return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || window.VietnamRaceApp?.currentMode !== 'showroom') return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.orbitYaw -= dx * 0.008;
      this.orbitPitch = Math.max(0.05, Math.min(1.45, this.orbitPitch + dy * 0.008));
    });

    window.addEventListener('mouseup', () => (this.isDragging = false));

    container.addEventListener('wheel', (e) => {
      if (window.VietnamRaceApp?.currentMode !== 'showroom') return;
      e.preventDefault();
      const zoomSpeed = this.orbitDist * 0.08;
      this.orbitDist = Math.max(2.5, Math.min(85.0, this.orbitDist + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed)));
    }, { passive: false });
  },

  getAssetList() {
    const assets = window.VietnamRaceAssets || {};
    const bld = window.VietnamRaceBuildings || {};
    const map = window.VietnamRaceMap || {};
    const specs = window.VietnamRaceVehicleSpecs || {};

    const rawList = [
      // [id, name, catKey, dims, fn, specKey]
      ['player_sport', 'Sedan Thể Thao R-Line', 'cars', specs.player_sport?.dimensions || { width: 1.82, length: 4.25, height: 1.35 }, () => window.VietnamRaceCar?.createCar(new THREE.Group()), 'player_sport'],
      ['player_supercar', 'Hypercar Độc Bản Sài Gòn', 'cars', specs.player_supercar?.dimensions || { width: 1.98, length: 4.60, height: 1.15 }, () => window.VietnamRaceCar?.createCar(new THREE.Group()), 'player_supercar'],
      ['traffic_scooter_grab', 'Xe Máy Grab Xanh Lá', 'traffic', { width: 0.75, length: 1.85, height: 1.10 }, () => assets.createTrafficScooter(0x27ae60), 'traffic_scooter'],
      ['traffic_scooter_be', 'Xe Máy Be Vàng', 'traffic', { width: 0.75, length: 1.85, height: 1.10 }, () => assets.createTrafficScooter(0xf1c40f), 'traffic_scooter'],
      ['traffic_scooter_delivery', 'Xe Wave Thồ Hàng Cồng Kềnh', 'traffic', { width: 0.95, length: 2.10, height: 1.25 }, () => assets.createTrafficDeliveryScooter(), 'traffic_delivery'],
      ['traffic_taxi_xanhsm', 'Taxi Xanh SM Điện', 'traffic', { width: 1.76, length: 4.30, height: 1.48 }, () => assets.createTrafficTaxi('xanh_sm'), 'traffic_taxi'],
      ['traffic_taxi_mailinh', 'Taxi Mai Linh', 'traffic', { width: 1.76, length: 4.30, height: 1.48 }, () => assets.createTrafficTaxi('mailinh'), 'traffic_taxi'],
      ['traffic_taxi_vinasun', 'Taxi Vinasun', 'traffic', { width: 1.76, length: 4.30, height: 1.48 }, () => assets.createTrafficTaxi('vinasun'), 'traffic_taxi'],
      ['traffic_bus_city', 'Xe Buýt Thành Phố (9.6m)', 'traffic', { width: 2.50, length: 9.60, height: 3.20 }, () => assets.createTrafficBus(false), 'traffic_bus'],
      ['tree_xacu', 'Cây Xà Cừ Đô Thị (12m)', 'trees', { width: 8.4, length: 8.4, height: 12.0 }, () => assets.createTreeXacu()],
      ['tree_phuong', 'Cây Phượng Vĩ Tán Đỏ', 'trees', { width: 7.2, length: 7.2, height: 9.5 }, () => assets.createTreePhuong()],
      ['tree_dua', 'Cây Dừa Bến Bạch Đằng', 'trees', { width: 6.0, length: 6.0, height: 10.5 }, () => assets.createTreeDua()],
      ['lamp_post', 'Cột Đèn Cao Áp Vươn Cần', 'props', { width: 2.2, length: 0.6, height: 9.5 }, () => assets.createStreetLamp()],
      ['prop_tea_stall', 'Quán Trà Đá Vỉa Hè', 'props', { width: 2.2, length: 2.2, height: 0.85 }, () => assets.createTeaStall()],
      ['prop_barrier_locot', 'Lô Cốt Tôn Xanh', 'props', { width: 2.4, length: 2.4, height: 2.0 }, () => assets.createConstructionBarrier()],
      ['prop_jersey_barrier', 'Dải Phân Cách Bê Tông', 'props', { width: 0.6, length: 4.0, height: 0.85 }, () => assets.createJerseyBarrier(4.0)],
      ['prop_traffic_light', 'Cột Đèn Giao Thông 3 Mắt', 'props', { width: 2.8, length: 0.6, height: 6.2 }, () => assets.createTrafficLight()],
      ['bld_var_0_watertank', 'Nhà Ống: Bồn Nước Tân Á', 'buildings', { width: 8.0, length: 14.0, height: 16.0 }, () => bld.createBuildingMesh(8, 16, 14, 0, 0xecf0f1)],
      ['bld_var_1_tigercage', 'Nhà Ống: Chuồng Cọp Sắt', 'buildings', { width: 8.0, length: 14.0, height: 18.0 }, () => bld.createBuildingMesh(8, 18, 14, 1, 0xdfe6e9)],
      ['bld_var_2_metal_roof', 'Nhà Phố: Mái Tôn Xanh', 'buildings', { width: 8.0, length: 14.0, height: 15.0 }, () => bld.createBuildingMesh(8, 15, 14, 2, 0xfce4ec)],
      ['bld_var_3_french_tile', 'Nhà Phố: Mái Ngói Pháp Cổ', 'buildings', { width: 10.0, length: 14.0, height: 16.0 }, () => bld.createBuildingMesh(10, 16, 14, 3, 0xfff9c4)],
      ['bld_var_4_balconies', 'Nhà Ống: Ban Công Đua', 'buildings', { width: 8.0, length: 14.0, height: 19.0 }, () => bld.createBuildingMesh(8, 19, 14, 4, 0xecf0f1)],
      ['bld_var_5_shutter_awning', 'Shophouse: Cửa Cuốn Mái Hiên', 'buildings', { width: 8.0, length: 14.0, height: 16.0 }, () => bld.createBuildingMesh(8, 16, 14, 5, 0xb2bec3)],
      ['bld_var_6_glass_office', 'Cao Ốc Kính Văn Phòng', 'buildings', { width: 14.0, length: 16.0, height: 32.0 }, () => bld.createBuildingMesh(14, 32, 16, 6, 0x34495e)],
      ['landmark_bitexco', 'Tháp Bitexco (Sân Trực Thăng)', 'landmarks', { width: 35.0, length: 35.0, height: 180.0 }, () => {
        const g = new THREE.Group();
        map.buildBitexco?.(g);
        g.position.set(60, 0, 80);
        g.scale.setScalar(0.28);
        return g;
      }],
      ['landmark_benthanh', 'Chợ Bến Thành (Tháp Đồng Hồ)', 'landmarks', { width: 45.0, length: 55.0, height: 29.0 }, () => {
        const g = new THREE.Group();
        map.buildBenThanhMarket?.(g);
        g.position.set(360, 0, 280);
        g.scale.setScalar(0.4);
        return g;
      }],
      ['landmark_notredame', 'Nhà Thờ Đức Bà (Tháp Đôi)', 'landmarks', { width: 32.0, length: 60.0, height: 60.5 }, () => {
        const g = new THREE.Group();
        map.buildNotreDameCathedral?.(g);
        g.position.set(140, 0, 640);
        g.scale.setScalar(0.35);
        return g;
      }]
    ];

    return rawList.map(([id, name, catKey, dims, fn, specKey]) => ({ id, name, catKey, dims, fn, specKey }));
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

        const bbox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        bbox.getCenter(center);
        bbox.getSize(size);

        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= bbox.min.y;

        this.studioGroup.add(model);

        const maxDim = Math.max(size.x, size.y, size.z);
        this.orbitTarget.y = Math.min(size.y * 0.45, 12);
        this.orbitDist = Math.max(3.5, maxDim * 1.65);
      } catch (err) {
        console.error('Showroom load error:', item.name, err);
      }
    }

    document.querySelectorAll('.asset-item-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === item.id);
    });

    this.updateSpecCard(item);
  },

  updateSpecCard(item) {
    const titleEl = document.getElementById('specTitle');
    const idEl = document.getElementById('specAssetId');
    const dimsEl = document.getElementById('specDims');
    const perfEl = document.getElementById('specPerf');
    const actionEl = document.getElementById('specActionSlot');

    if (titleEl) titleEl.textContent = item.name;
    if (idEl) idEl.textContent = item.id;
    if (dimsEl && item.dims) {
      dimsEl.textContent = `${item.dims.length}m (Dài) × ${item.dims.width}m (Rộng) × ${item.dims.height}m (Cao)`;
    }

    if (perfEl) {
      if (item.specKey && window.VietnamRaceVehicleSpecs) {
        const prof = window.VietnamRaceVehicleSpecs.getTunedProfile(item.specKey);
        perfEl.innerHTML = `
          <div>🐎 Công suất: <b>${prof.horsepowerHP} HP</b> | Trọng lượng: <b>${prof.massKg} kg</b></div>
          <div>🏁 Tốc độ cân bằng: <b>~${prof.nominalTopKmH} km/h</b> (Nitro: <b>~${prof.nominalNitroKmH} km/h</b>)</div>
          <div>🛞 Độ bám lốp: <b>${prof.tireGrip}g</b> | Hệ số cản Cd: <b>${prof.dragCoeff}</b></div>
        `;
        perfEl.style.display = 'block';
      } else {
        perfEl.style.display = 'none';
      }
    }

    if (actionEl) {
      if (item.specKey && (item.id === 'player_sport' || item.id === 'player_supercar')) {
        actionEl.innerHTML = `<button id="btnDriveThisCar" class="btn-drive-car">🏎️ LÁI THỬ XE NÀY TRÊN PHỐ</button>`;
        const btn = document.getElementById('btnDriveThisCar');
        if (btn) {
          btn.onclick = () => {
            if (window.VietnamRaceCar) window.VietnamRaceCar.applyProfile(item.id);
            if (window.VietnamRaceApp) window.VietnamRaceApp.toggleMode();
          };
        }
      } else {
        actionEl.innerHTML = '';
      }
    }
  },

  renderSidebar() {
    const listContainer = document.getElementById('showroomAssetList');
    if (!listContainer) return;

    const items = this.getAssetList();
    const categories = [
      { key: 'cars', label: '🏎️ Xe Người Chơi' },
      { key: 'traffic', label: '🛵 Phương Tiện AI' },
      { key: 'trees', label: '🌳 Cây Cối Đô Thị' },
      { key: 'props', label: '🚦 Đạo Cụ Đường Phố' },
      { key: 'buildings', label: '🏢 Kiến Trúc Nhà Ống' },
      { key: 'landmarks', label: '🏛️ Landmark Sài Gòn' }
    ];

    let html = '';
    categories.forEach((cat) => {
      const catItems = items.filter((it) => it.catKey === cat.key);
      if (!catItems.length) return;

      html += `<div class="sidebar-category">
        <div class="sidebar-cat-title">${cat.label} (${catItems.length})</div>
        <div class="sidebar-cat-items">`;

      catItems.forEach((it) => {
        html += `<button class="asset-item-btn" data-id="${it.id}">
          <span class="asset-btn-name">${it.name}</span>
          <span class="asset-btn-id">${it.id}</span>
        </button>`;
      });

      html += `</div></div>`;
    });

    listContainer.innerHTML = html;

    listContainer.querySelectorAll('.asset-item-btn').forEach((btn) => {
      btn.onclick = () => {
        const it = items.find((x) => x.id === btn.dataset.id);
        if (it) this.selectItem(it);
      };
    });

    const copyBtn = document.getElementById('btnCopyAssetId');
    if (copyBtn) {
      copyBtn.onclick = () => {
        if (!this.activeItem) return;
        navigator.clipboard.writeText(this.activeItem.id);
        copyBtn.textContent = '✓ ĐÃ COPY!';
        setTimeout(() => (copyBtn.textContent = '📋 COPY ID'), 1500);
      };
    }

    const spinBtn = document.getElementById('btnToggleAutoSpin');
    if (spinBtn) {
      spinBtn.onclick = () => {
        this.autoSpin = !this.autoSpin;
        spinBtn.textContent = this.autoSpin ? '🔄 TỰ XOAY: BẬT' : '⏸️ TỰ XOAY: TẮT';
        spinBtn.classList.toggle('active', this.autoSpin);
      };
    }
  },

  update(dt, camera) {
    if (!camera) return;

    if (this.autoSpin && !this.isDragging) {
      this.orbitYaw += 0.35 * dt;
    }

    const cx = this.orbitTarget.x + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
    const cy = this.orbitTarget.y + Math.sin(this.orbitPitch) * this.orbitDist;
    const cz = this.orbitTarget.z + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;

    camera.position.set(cx, cy, cz);
    camera.lookAt(this.orbitTarget.x, this.orbitTarget.y, this.orbitTarget.z);
  }
};
