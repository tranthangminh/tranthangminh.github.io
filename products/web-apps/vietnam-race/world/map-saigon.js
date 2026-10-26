/**
 * Vietnam Race - Saigon District 1 Real World Architecture & Real Landmark Map
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceSaigonRiverCoords = [
  [1798,-1264],[1741,-1223],[1669,-1226],[1574,-1216],[1513,-1205],[1454,-1183],[1377,-1168],[1291,-1147],
  [1237,-1128],[1146,-1061],[1032,-1014],[963,-922],[909,-852],[872,-776],[844,-728],[796,-618],
  [753,-537],[717,-444],[714,-382],[690,-314],[677,-227],[661,-162],[642,-79],[640,-9],
  [637,64],[654,165],[664,229],[676,306],[689,367],[731,406],[718,499],[744,575],
  [783,627],[812,674],[844,722],[877,769],[903,830],[949,872],[995,904],[1034,947],
  [1083,989],[1159,1038],[1212,1065],[1259,1093],[1325,1125],[1471,1203],[1534,1233],[1587,1254],
  [1697,1291],[1782,1323],[1795,1699],[1738,1671],[1665,1623],[1590,1593],[1506,1547],[1400,1495],
  [1337,1460],[1260,1418],[1156,1368],[1058,1316],[989,1268],[940,1233],[859,1165],[802,1111],
  [732,1049],[678,986],[636,934],[595,875],[557,829],[528,767],[498,702],[452,606],
  [405,549],[330,425],[333,369],[329,306],[340,229],[351,151],[362,84],[375,0],
  [385,-72],[376,-143],[406,-226],[378,-277],[396,-379],[413,-441],[431,-504],[451,-577],
  [475,-664],[503,-760],[549,-811],[585,-959],[631,-1025],[681,-1053],[748,-1163],[822,-1203],
  [976,-1327],[1016,-1366],[1067,-1421],[1240,-1472],[1530,-1513],[1589,-1524],[1689,-1559],[1790,-1601]
];

window.VietnamRaceMap = {
  roads: [],
  landmarks: [],
  colliders: [],

  createWorld(scene) {
    const worldGroup = new THREE.Group();
    worldGroup.name = 'saigon_real_world';
    this.roads = [];
    this.landmarks = [];
    this.colliders = [];

    // 1. Terrain Ground Base (Expansive Metropolitan Plain 20km x 20km)
    const groundGeo = new THREE.PlaneGeometry(20000, 20000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xd6dbdf });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // 2. Real Curved Sông Sài Gòn
    const riverCoords = window.VietnamRaceSaigonRiverCoords;
    if (riverCoords && riverCoords.length) {
      const riverShape = new THREE.Shape();
      riverCoords.forEach((p, idx) => {
        if (idx === 0) riverShape.moveTo(p[0], p[1]);
        else riverShape.lineTo(p[0], p[1]);
      });
      riverShape.closePath();
      const riverGeo = new THREE.ShapeGeometry(riverShape);
      riverGeo.rotateX(-Math.PI / 2);
      const riverMat = new THREE.MeshStandardMaterial({
        color: 0x1f4e5b,
        roughness: 0.15,
        metalness: 0.65
      });
      const river = new THREE.Mesh(riverGeo, riverMat);
      river.position.y = 0.02;
      worldGroup.add(river);
    }

    // 3. Iconic Saigon Landmarks (Accurately Oriented in Real 3D Space)
    this.buildBitexco(worldGroup);
    this.buildBenThanhMarket(worldGroup);
    this.buildNotreDameCathedral(worldGroup);
    this.buildCentralPostOffice(worldGroup);
    this.buildIndependencePalace(worldGroup);
    this.buildBaSonBridge(worldGroup);

    // 4. Build Real Roads, Automated Procedural Buildings & Trees via OSM Loader
    if (window.VietnamRaceOsmLoader) {
      window.VietnamRaceOsmLoader.buildRealMap(worldGroup);
    }

    scene.add(worldGroup);
    return worldGroup;
  },

  // 1. Tháp Bitexco (Helipad faces East-Northeast towards Saigon River)
  buildBitexco(group) {
    const tower = new THREE.Group();
    tower.position.set(108.6, 0, 219.7);
    tower.rotation.y = 0.78; // Oriented facing Saigon River

    const baseGeo = new THREE.CylinderGeometry(14, 20, 180, 16);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x2980b9,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88
    });
    const base = new THREE.Mesh(baseGeo, glassMat);
    base.position.y = 90;
    base.castShadow = true;
    tower.add(base);

    const spireGeo = new THREE.ConeGeometry(14, 50, 16);
    const spire = new THREE.Mesh(spireGeo, glassMat);
    spire.position.y = 205;
    spire.castShadow = true;
    tower.add(spire);

    // Iconic cantilevered Helipad on Floor 52
    const padGeo = new THREE.CylinderGeometry(12, 12, 2.5, 16);
    const padMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(16, 138, 0);
    pad.castShadow = true;
    tower.add(pad);

    group.add(tower);
    this.landmarks.push({ name: 'Tháp Bitexco', x: 108.6, z: 219.7, radius: 36 });
    this.colliders.push({ type: 'box', x: 108.6, z: 219.7, hw: 14, hd: 14, cosA: Math.cos(0.78), sinA: Math.sin(0.78) });
  },

  // 2. Chợ Bến Thành (South Gate Clock Tower faces Quách Thị Trang / Lê Lợi)
  buildBenThanhMarket(group) {
    const market = new THREE.Group();
    market.position.set(-672.6, 0, 77.7);
    market.rotation.y = 2.1; // Facing Lê Lợi boulevard

    const bodyGeo = new THREE.BoxGeometry(60, 10, 70);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 5;
    body.castShadow = true;
    body.receiveShadow = true;
    market.add(body);

    const roofGeo = new THREE.ConeGeometry(45, 8, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 14;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    market.add(roof);

    // 4-sided Clock Tower on South Gate
    const towerGeo = new THREE.BoxGeometry(14, 28, 14);
    const towerMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 14, 32);
    tower.castShadow = true;
    market.add(tower);

    const pyramidGeo = new THREE.ConeGeometry(10, 7, 4);
    const pyramid = new THREE.Mesh(pyramidGeo, roofMat);
    pyramid.position.set(0, 31.5, 32);
    pyramid.rotation.y = Math.PI / 4;
    market.add(pyramid);

    group.add(market);
    this.landmarks.push({ name: 'Chợ Bến Thành', x: -672.6, z: 77.7, radius: 46 });
    this.colliders.push({ type: 'box', x: -672.6, z: 77.7, hw: 30, hd: 35, cosA: Math.cos(2.1), sinA: Math.sin(2.1) });
  },

  // 3. Nhà thờ Đức Bà (Twin spires face Southwest down Đồng Khởi / Công xã Paris)
  buildNotreDameCathedral(group) {
    const church = new THREE.Group();
    church.position.set(-447.8, 0, -681.2);
    church.rotation.y = -0.78; // Aligned with Đồng Khởi axis

    const brickMat = new THREE.MeshLambertMaterial({ color: 0xd35400 });
    const naveGeo = new THREE.BoxGeometry(32, 24, 70);
    const nave = new THREE.Mesh(naveGeo, brickMat);
    nave.position.y = 12;
    nave.castShadow = true;
    nave.receiveShadow = true;
    church.add(nave);

    const ironMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    [-11, 11].forEach((offsetX) => {
      const towerGeo = new THREE.BoxGeometry(10, 48, 12);
      const tower = new THREE.Mesh(towerGeo, brickMat);
      tower.position.set(offsetX, 24, 30);
      tower.castShadow = true;
      church.add(tower);

      const spireGeo = new THREE.ConeGeometry(6.5, 18, 4);
      const spire = new THREE.Mesh(spireGeo, ironMat);
      spire.position.set(offsetX, 57, 30);
      spire.rotation.y = Math.PI / 4;
      spire.castShadow = true;
      church.add(spire);
    });

    group.add(church);
    this.landmarks.push({ name: 'Nhà thờ Đức Bà', x: -447.8, z: -681.2, radius: 40 });
    this.colliders.push({ type: 'box', x: -447.8, z: -681.2, hw: 16, hd: 35, cosA: Math.cos(-0.78), sinA: Math.sin(-0.78) });
  },

  // 4. Bưu điện Trung tâm (Grand colonial facade faces West into the square)
  buildCentralPostOffice(group) {
    const po = new THREE.Group();
    po.position.set(-359.8, 0, -692.7);
    po.rotation.y = -Math.PI / 2; // Facing West toward Notre-Dame park

    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    const bodyGeo = new THREE.BoxGeometry(48, 16, 35);
    const body = new THREE.Mesh(bodyGeo, yellowMat);
    body.position.y = 8;
    body.castShadow = true;
    body.receiveShadow = true;
    po.add(body);

    const roofGeo = new THREE.CylinderGeometry(18, 18, 48, 16, 1, false, 0, Math.PI);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 16, 0);
    roof.rotation.z = Math.PI / 2;
    roof.castShadow = true;
    po.add(roof);

    const clockArch = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 4), trimMat);
    clockArch.position.set(0, 18, 18);
    po.add(clockArch);

    group.add(po);
    this.landmarks.push({ name: 'Bưu điện Trung tâm', x: -359.8, z: -692.7, radius: 32 });
    this.colliders.push({ type: 'box', x: -359.8, z: -692.7, hw: 24, hd: 17.5, cosA: Math.cos(-Math.PI / 2), sinA: Math.sin(-Math.PI / 2) });
  },

  // 5. Dinh Độc Lập (Grand facade & oval lawn face Southeast down Lê Duẩn)
  buildIndependencePalace(group) {
    const palace = new THREE.Group();
    palace.position.set(-869.8, 0, -410.7);
    palace.rotation.y = 2.14; // Aligned straight down Lê Duẩn boulevard

    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });
    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(75, 14, 45), whiteMat);
    mainBlock.position.y = 7;
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    palace.add(mainBlock);

    const louverMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
    const louverMesh = new THREE.Mesh(new THREE.BoxGeometry(65, 8, 2), louverMat);
    louverMesh.position.set(0, 7, 23);
    palace.add(louverMesh);

    const roofPavilion = new THREE.Mesh(new THREE.BoxGeometry(28, 5, 20), whiteMat);
    roofPavilion.position.set(0, 14.5, 0);
    palace.add(roofPavilion);

    group.add(palace);
    this.landmarks.push({ name: 'Dinh Độc Lập', x: -869.8, z: -410.7, radius: 52 });
    this.colliders.push({ type: 'box', x: -869.8, z: -410.7, hw: 37.5, hd: 25, cosA: Math.cos(2.14), sinA: Math.sin(2.14) });
  },

  // 6. Cầu Ba Son (Thủ Thiêm 2) - Anchored directly to real bridge trajectory across Saigon River
  buildBaSonBridge(group) {
    const bridge = new THREE.Group();
    bridge.name = 'landmark_bason_bridge';
    const bridgeAngle = 1.05; // Radian trajectory of real bridge span from D1 to Thu Thiem

    // 1. Curved White Main Pylon at (620, -735)
    const pylonGeo = new THREE.CylinderGeometry(2.2, 5.0, 76, 12);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.2 });
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(620, 36, -735);
    pylon.rotation.y = bridgeAngle;
    pylon.rotation.z = -0.28; // Tilted backwards towards D1
    pylon.castShadow = true;
    bridge.add(pylon);

    // Pylon Pier Base
    const pierGeo = new THREE.BoxGeometry(16, 8, 26);
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(620, 1.5, -735);
    pier.rotation.y = bridgeAngle;
    bridge.add(pier);

    // 2. Radiating Stay Cables along road axis
    const cableMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const fwdX = Math.sin(bridgeAngle);
    const fwdZ = Math.cos(bridgeAngle);
    const perpX = -Math.cos(bridgeAngle);
    const perpZ = Math.sin(bridgeAngle);

    for (let i = 1; i <= 8; i++) {
      const distAlong = i * 42;
      const deckX = 620 + fwdX * distAlong;
      const deckZ = -735 + fwdZ * distAlong;
      const topX = 620 - fwdX * (15 - i * 1.5);
      const topY = 32 + (8 - i) * 3.8;
      const topZ = -735 - fwdZ * (15 - i * 1.5);

      [-10, 10].forEach((sideOffset) => {
        const cableGeo = new THREE.CylinderGeometry(0.12, 0.12, Math.hypot(deckX - topX, topY - 1.0, deckZ - topZ), 4);
        const cable = new THREE.Mesh(cableGeo, cableMat);
        const midX = (deckX + perpX * sideOffset + topX) / 2;
        const midY = (1.0 + topY) / 2;
        const midZ = (deckZ + perpZ * sideOffset + topZ) / 2;
        cable.position.set(midX, midY, midZ);
        cable.lookAt(deckX + perpX * sideOffset, 1.0, deckZ + perpZ * sideOffset);
        cable.rotateX(Math.PI / 2);
        bridge.add(cable);
      });
    }

    // 3. Side Guardrails along Bridge Road (551, -775 -> 990, -525)
    const spanLen = Math.hypot(990 - 551, -525 - (-775));
    const barrierGeo = new THREE.BoxGeometry(0.8, 1.2, spanLen);
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    [-11.5, 11.5].forEach((side) => {
      const b = new THREE.Mesh(barrierGeo, barrierMat);
      b.position.set((551 + 990) / 2 + perpX * side, 0.6, (-775 + -525) / 2 + perpZ * side);
      b.rotation.y = bridgeAngle;
      bridge.add(b);
    });

    group.add(bridge);
    this.landmarks.push({ name: 'Cầu Ba Son', x: 620, z: -735, radius: 55 });
  }
};
