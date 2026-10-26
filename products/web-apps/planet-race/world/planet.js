/**
 * Planet Race - Kaio 1km Planet World Geometry & Highway System
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceWorld = {
  planetGroup: null,
  colliders: [],
  R: 1000.0, // Scaled to 1km radius (Diameter 2km, Circumference 6.28km)

  createWorld(scene) {
    this.planetGroup = new THREE.Group();
    this.colliders = [];

    const R = this.R;

    // 1. Lush Green Planetary Sphere (Anime Emerald Grass - 128x96 Smooth Subdivision)
    const planetGeo = new THREE.SphereGeometry(R, 128, 96);
    
    // Deform vertices by terrain heightmap
    const posAttr = planetGeo.attributes.position;
    const vTemp = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      vTemp.fromBufferAttribute(posAttr, i).normalize();
      let h = 0;
      if (window.PlanetRaceTerrain) {
        h = window.PlanetRaceTerrain.getElevation(vTemp, false);
      }
      const rTotal = R + h;
      posAttr.setXYZ(i, vTemp.x * rTotal, vTemp.y * rTotal, vTemp.z * rTotal);
    }
    planetGeo.computeVertexNormals();

    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,       // Iconic Dragon Ball Kaio Grass
      roughness: 0.7,
      metalness: 0.04
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.name = 'planetMesh';
    planetMesh.receiveShadow = true;
    this.planetGroup.add(planetMesh);

    // 2. Spherical Band Equator Race Track (6.28km highway loop)
    this.buildSphericalEquatorCircuit(R);

    // 3. King Kai's Sanctuary & Vintage Garage (Just North of Equator Road)
    this.buildKaioSanctuary(R);

    // 4. Stunt Jump Launch Ramps (6 orbital ramps around the 6.28km equator)
    this.buildStuntRamps(R);

    // 5. Cosmic Street Lanterns with deep concrete footings along highway
    this.buildStreetLanterns(R);

    // 6. Scenery: Bent Kaio Trees (Polygon Normal) & Cosmic Boulders (Radial Center)
    this.buildVegetationAndProps(R);

    // Register colliders with Cannon.js physics engine
    if (window.PlanetRacePhysics && window.PlanetRacePhysics.registerColliders) {
      window.PlanetRacePhysics.registerColliders(this.colliders);
    }

    scene.add(this.planetGroup);
    return this.planetGroup;
  },

  rebuild(newR, scene) {
    this.R = Math.max(30.0, Number(newR) || 1000.0);
    if (this.planetGroup && scene) {
      scene.remove(this.planetGroup);
      this.planetGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
    return this.createWorld(scene);
  },

  buildSphericalEquatorCircuit(R) {
    const segments = 256;
    const rTrack = R + 0.15;
    const halfWidth = 4.25; // Highway width 8.5m
    const angHalf = halfWidth / rTrack;
    const vTemp = new THREE.Vector3();

    // Road Mesh Ribbon
    const pos = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // North edge (lat = +angHalf)
      const yN0 = rTrack * Math.sin(angHalf);
      const rN0 = rTrack * Math.cos(angHalf);
      vTemp.set(rN0 * sinT, yN0, rN0 * cosT).normalize();
      const hN = window.PlanetRaceTerrain ? window.PlanetRaceTerrain.getElevation(vTemp, true) : 0;
      pos.push(vTemp.x * (rTrack + hN), vTemp.y * (rTrack + hN), vTemp.z * (rTrack + hN));
      uvs.push(0, i / segments * 60);

      // South edge (lat = -angHalf)
      const yS0 = rTrack * Math.sin(-angHalf);
      const rS0 = rTrack * Math.cos(-angHalf);
      vTemp.set(rS0 * sinT, yS0, rS0 * cosT).normalize();
      const hS = window.PlanetRaceTerrain ? window.PlanetRaceTerrain.getElevation(vTemp, true) : 0;
      pos.push(vTemp.x * (rTrack + hS), vTemp.y * (rTrack + hS), vTemp.z * (rTrack + hS));
      uvs.push(1, i / segments * 60);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.55,
      side: THREE.DoubleSide
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.planetGroup.add(roadMesh);

    // Dashed Yellow Centerline
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const angDash = 0.22 / rTrack;

    for (let i = 0; i < segments; i += 2) {
      const th1 = (i / segments) * Math.PI * 2;
      const th2 = ((i + 0.85) / segments) * Math.PI * 2;

      const dPos = [];
      [th1, th2].forEach((th) => {
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const yN = (rTrack + 0.03) * Math.sin(angDash);
        const rN = (rTrack + 0.03) * Math.cos(angDash);
        const yS = (rTrack + 0.03) * Math.sin(-angDash);
        const rS = (rTrack + 0.03) * Math.cos(-angDash);
        dPos.push(rN * st, yN, rN * ct);
        dPos.push(rS * st, yS, rS * ct);
      });

      const dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
      dGeo.setIndex([0, 1, 2, 1, 3, 2]);
      dGeo.computeVertexNormals();
      this.planetGroup.add(new THREE.Mesh(dGeo, stripeMat));
    }

    // Red & White Curb Edges
    const curbRedMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const curbWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const curbW = 0.45 / rTrack;

    for (let i = 0; i < segments; i++) {
      const th1 = (i / segments) * Math.PI * 2;
      const th2 = ((i + 1) / segments) * Math.PI * 2;
      const mat = (i % 2 === 0) ? curbRedMat : curbWhiteMat;

      // North Curb
      const ncPos = [];
      [th1, th2].forEach((th) => {
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const y1 = (rTrack + 0.04) * Math.sin(angHalf);
        const r1 = (rTrack + 0.04) * Math.cos(angHalf);
        const y2 = (rTrack + 0.04) * Math.sin(angHalf + curbW);
        const r2 = (rTrack + 0.04) * Math.cos(angHalf + curbW);
        ncPos.push(r1 * st, y1, r1 * ct);
        ncPos.push(r2 * st, y2, r2 * ct);
      });
      const ncGeo = new THREE.BufferGeometry();
      ncGeo.setAttribute('position', new THREE.Float32BufferAttribute(ncPos, 3));
      ncGeo.setIndex([0, 1, 2, 1, 3, 2]);
      this.planetGroup.add(new THREE.Mesh(ncGeo, mat));

      // South Curb
      const scPos = [];
      [th1, th2].forEach((th) => {
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const y1 = (rTrack + 0.04) * Math.sin(-angHalf - curbW);
        const r1 = (rTrack + 0.04) * Math.cos(-angHalf - curbW);
        const y2 = (rTrack + 0.04) * Math.sin(-angHalf);
        const r2 = (rTrack + 0.04) * Math.cos(-angHalf);
        scPos.push(r1 * st, y1, r1 * ct);
        scPos.push(r2 * st, y2, r2 * ct);
      });
      const scGeo = new THREE.BufferGeometry();
      scGeo.setAttribute('position', new THREE.Float32BufferAttribute(scPos, 3));
      scGeo.setIndex([0, 1, 2, 1, 3, 2]);
      this.planetGroup.add(new THREE.Mesh(scGeo, mat));
    }
  },

  buildKaioSanctuary(R) {
    // Placed 45m North of the Equator Road at lon = 0.08
    const lat = 0.045;
    const lon = 0.08;
    const housePos = new THREE.Vector3(
      R * Math.cos(lat) * Math.sin(lon),
      R * Math.sin(lat),
      R * Math.cos(lat) * Math.cos(lon)
    );

    const normal = housePos.clone().normalize();
    const h = window.PlanetRaceTerrain ? window.PlanetRaceTerrain.getElevation(normal, false) : 0;
    housePos.copy(normal).multiplyScalar(R + h);

    const houseGroup = new THREE.Group();
    houseGroup.position.copy(housePos);
    // QUY TẮC: Nhà mọc theo tâm hành tinh (Radial Normal), móng đá sâu 3.5m cắm ngầm
    houseGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    if (window.PlanetRaceAssets) {
      const sanctuaryModel = window.PlanetRaceAssets.createKaioSanctuary();
      houseGroup.add(sanctuaryModel);
    }

    // Driveway pad with parked classic roadster
    const driveGeo = new THREE.CylinderGeometry(5.5, 5.5, 0.4, 16);
    const driveMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, roughness: 0.9 });
    const drive = new THREE.Mesh(driveGeo, driveMat);
    drive.position.set(11.5, -0.1, 3.8); // Móng sâu 0.4m
    drive.receiveShadow = true;
    houseGroup.add(drive);

    const propCar = new THREE.Group();
    propCar.position.set(11.5, 0.45, 3.8);
    const propBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.8, 4.6),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 })
    );
    propCar.add(propBody);
    houseGroup.add(propCar);

    this.planetGroup.add(houseGroup);

    this.colliders.push({
      pos: housePos.clone().add(normal.clone().multiplyScalar(3.0)),
      radius: 8.5,
      name: 'Thánh Địa Thần Vũ Trụ (Kaio Sanctuary)'
    });
  },

  buildStuntRamps(R) {
    const rampCount = 6;
    for (let i = 0; i < rampCount; i++) {
      const th = (i / rampCount) * Math.PI * 2 + 0.15;
      const rampGroup = new THREE.Group();
      const pos = new THREE.Vector3(R * Math.sin(th), 0, R * Math.cos(th));
      const normal = pos.clone().normalize();
      const hRamp = window.PlanetRaceTerrain ? window.PlanetRaceTerrain.getElevation(normal, true) : 0;
      pos.copy(normal).multiplyScalar(R + hRamp);
      rampGroup.position.copy(pos);

      // QUY TẮC BẤT KHẢ XÂM PHẠM: Trục UP hướng thẳng TÂM HÀNH TINH (Radial Normal), tiếp tuyến đường đua
      const fwdTangent = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th)).normalize();
      const right = new THREE.Vector3().crossVectors(normal, fwdTangent).normalize();
      const m = new THREE.Matrix4().makeBasis(right, normal, fwdTangent);
      rampGroup.quaternion.setFromRotationMatrix(m);

      if (window.PlanetRaceAssets) {
        rampGroup.add(window.PlanetRaceAssets.createStuntRamp());
      }

      this.planetGroup.add(rampGroup);

      this.colliders.push({
        pos,
        quat: rampGroup.quaternion.clone(),
        radius: 3.5,
        isRamp: true,
        name: `Bàn Đạp Bay Quỹ Đạo ${i + 1}`
      });
    }
  },

  buildStreetLanterns(R) {
    const lanternCount = 48;
    const rTrack = R + 0.15;
    const halfWidth = 4.25;
    const angHalf = halfWidth / rTrack;

    for (let i = 0; i < lanternCount; i++) {
      const th = (i / lanternCount) * Math.PI * 2 + 0.08;
      const isNorth = (i % 2 === 0);
      const latOffset = isNorth ? (angHalf + 0.0016) : (-angHalf - 0.0016);

      const pos = new THREE.Vector3(
        rTrack * Math.cos(latOffset) * Math.sin(th),
        rTrack * Math.sin(latOffset),
        rTrack * Math.cos(latOffset) * Math.cos(th)
      );

      const normal = pos.clone().normalize();
      const h = window.PlanetRaceTerrain ? window.PlanetRaceTerrain.getElevation(normal, true) : 0;
      pos.copy(normal).multiplyScalar(rTrack + h);

      const group = new THREE.Group();
      group.position.copy(pos);
      // QUY TẮC: Đèn đường mọc theo tâm hành tinh (Radial Normal), móng bê tông âm đất 1.5m
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      if (window.PlanetRaceAssets) {
        const lantern = window.PlanetRaceAssets.createStreetLantern();
        // Cần đèn vươn về phía lòng đường
        lantern.rotation.y = isNorth ? -Math.PI / 2 : Math.PI / 2;
        group.add(lantern);
      }

      this.planetGroup.add(group);
      this.colliders.push({
        pos: pos.clone().add(normal.clone().multiplyScalar(3.0)),
        radius: 0.8,
        name: `Cột Đèn Cao Tốc Vũ Trụ ${i + 1}`
      });
    }
  },

  buildVegetationAndProps(R) {
    // Generate 48 scenic landmarks (Trees & Boulders) along both sides of highway
    for (let i = 0; i < 48; i++) {
      const theta = (i / 48) * Math.PI * 2 + (Math.sin(i * 99) * 0.05);
      const side = (i % 2 === 0) ? 1 : -1;
      const latOffset = side * (0.012 + (Math.abs(Math.cos(i * 33))) * 0.038); // 12m to 50m off-road

      const pos = new THREE.Vector3(
        R * Math.cos(latOffset) * Math.sin(theta),
        R * Math.sin(latOffset),
        R * Math.cos(latOffset) * Math.cos(theta)
      );

      const radialNormal = pos.clone().normalize();
      const hProp = window.PlanetRaceTerrain ? window.PlanetRaceTerrain.getElevation(radialNormal, false) : 0;
      pos.copy(radialNormal).multiplyScalar(R + hProp);

      const group = new THREE.Group();
      group.position.copy(pos);

      if (i % 3 !== 0) {
        // --- QUY TẮC CÂY THẦN: Mọc vuông góc với VECTOR BỀ MẶT POLYGON ĐỊA HÌNH ---
        const surfNormal = window.PlanetRaceTerrain
          ? window.PlanetRaceTerrain.getSurfaceNormal(radialNormal)
          : radialNormal;
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfNormal);

        if (window.PlanetRaceAssets) {
          group.add(window.PlanetRaceAssets.createKaioTree());
        }
        this.colliders.push({
          pos: pos.clone().add(radialNormal.clone().multiplyScalar(2.2)),
          radius: 2.2,
          name: 'Cây Thần Cổ Thụ'
        });
      } else {
        // --- QUY TẮC ĐÁ VŨ TRỤ: Mọc theo TÂM HÀNH TINH, móng chôn sâu tránh lơ lửng ---
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radialNormal);

        const rockRadius = 2.2 + (i % 4) * 0.4;
        if (window.PlanetRaceAssets) {
          group.add(window.PlanetRaceAssets.createCosmicBoulder(rockRadius));
        }
        this.colliders.push({
          pos: pos.clone().add(radialNormal.clone().multiplyScalar(1.2)),
          radius: rockRadius,
          name: 'Tảng Đá Vũ Trụ'
        });
      }

      this.planetGroup.add(group);
    }
  }
};
