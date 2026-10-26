/**
 * Vietnam Race - OpenStreetMap Real World Loader & Spatial Chunk Culling Engine
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceOsmLoader = {
  ORIGIN_LAT: 10.7735,
  ORIGIN_LON: 106.7035,
  METERS_PER_LAT: 111320,
  METERS_PER_LON: 109380,

  customMapGroup: null,
  chunks: new Map(),
  CHUNK_SIZE: 250,

  gpsToMeters(lon, lat) {
    return {
      x: (lon - this.ORIGIN_LON) * this.METERS_PER_LON,
      z: -(lat - this.ORIGIN_LAT) * this.METERS_PER_LAT
    };
  },

  distToSegment(px, pz, x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projZ = z1 + t * dz;
    return Math.hypot(px - projX, pz - projZ);
  },

  getChunk(cx, cz, parentGroup) {
    const gx = Math.floor(cx / this.CHUNK_SIZE);
    const gz = Math.floor(cz / this.CHUNK_SIZE);
    const key = `${gx}_${gz}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      const chunkGroup = new THREE.Group();
      chunkGroup.name = `chunk_${key}`;
      parentGroup.add(chunkGroup);
      chunk = {
        group: chunkGroup,
        x: gx * this.CHUNK_SIZE + (this.CHUNK_SIZE / 2),
        z: gz * this.CHUNK_SIZE + (this.CHUNK_SIZE / 2),
        bldCount: 0,
        treeCount: 0,
        lampCount: 0
      };
      this.chunks.set(key, chunk);
    }
    return chunk;
  },

  updateCulling(playerX, playerZ, maxDist = 1200) {
    if (!this.chunks || !this.chunks.size) return;
    const maxSq = maxDist * maxDist;
    for (const chunk of this.chunks.values()) {
      const dx = playerX - chunk.x;
      const dz = playerZ - chunk.z;
      chunk.group.visible = (dx * dx + dz * dz <= maxSq);
    }
  },

  init(scene) {
    this.scene = scene;
    this.setupFileDrop();
    this.setupFileInput();
  },

  // Core Builder: Instantiates Real Roads, Sidewalk Props, Traffic Signals & Oriented Buildings
  buildRealMap(group) {
    const data = window.VietnamRaceSaigonMapData;
    if (!data || !data.features) {
      console.warn('[VietnamRaceOsmLoader] No saigon-d1-data found, retrying...');
      return;
    }

    this.chunks.clear();

    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x22313f });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const pedMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
    const bldColors = [0xecf0f1, 0xdfe6e9, 0xb2bec3, 0xfce4ec, 0xfff9c4, 0xd7ccc8, 0xcfd8dc];
    const landmarks = window.VietnamRaceMap.landmarks || [];
    const assets = window.VietnamRaceAssets;
    const ignoredHw = new Set(['footway', 'steps', 'path', 'construction', 'proposed', 'track', 'service']);

    const roads = [];
    let totalBlds = 0, totalTrees = 0, totalLamps = 0, totalSignals = 0;

    // Step A: Parse and Render Real Roads across all 7 districts
    data.features.forEach((f, idx) => {
      const props = f.properties || {};
      const hw = props.highway;
      if (!hw || ignoredHw.has(hw) || f.geometry.type !== 'LineString') return;

      const coords = f.geometry.coordinates;
      let w = 12;
      if (hw.includes('primary') || hw.includes('trunk')) w = 24;
      else if (hw.includes('secondary') || hw.includes('tertiary')) w = 18;
      else if (hw === 'pedestrian') w = 26;

      const name = props.name || 'Đường phố';

      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = this.gpsToMeters(coords[i][0], coords[i][1]);
        const p2 = this.gpsToMeters(coords[i + 1][0], coords[i + 1][1]);
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz);
        if (len < 6.0 || len > 2200) continue;

        const angle = Math.atan2(dx, dz);
        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;
        const nx = -dz / len;
        const nz = dx / len;

        const chunk = this.getChunk(midX, midZ, group);

        // Road Surface Ribbon
        const roadGeo = new THREE.PlaneGeometry(w, len);
        roadGeo.rotateX(-Math.PI / 2);
        const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
        roadMesh.position.set(midX, 0.05, midZ);
        roadMesh.rotation.y = angle + Math.PI;
        roadMesh.receiveShadow = true;
        chunk.group.add(roadMesh);

        // Yellow Divider Stripe
        const stripeGeo = new THREE.PlaneGeometry(0.35, len * 0.95);
        stripeGeo.rotateX(-Math.PI / 2);
        const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        stripeMesh.position.set(midX, 0.07, midZ);
        stripeMesh.rotation.y = angle + Math.PI;
        chunk.group.add(stripeMesh);

        // Pedestrian Promenade on Nguyen Hue Walking Street
        if (name.includes('Nguyễn Huệ')) {
          const pedGeo = new THREE.PlaneGeometry(12, len * 0.92);
          pedGeo.rotateX(-Math.PI / 2);
          const pedMesh = new THREE.Mesh(pedGeo, pedMat);
          pedMesh.position.set(midX, 0.09, midZ);
          pedMesh.rotation.y = angle + Math.PI;
          chunk.group.add(pedMesh);
        }

        const rdObj = { x1: p1.x, z1: p1.z, x2: p2.x, z2: p2.z, w, name, midX, midZ, len, angle };
        roads.push(rdObj);
        window.VietnamRaceMap.roads.push(rdObj);

        // Step B: Sidewalk Street Lamps & Scaled Trees along Corridors
        if (len >= 35 && assets) {
          // 1. Street Lamps (pole on curb, arm arches into street)
          if (chunk.lampCount < 4) {
            const lampOffset = (w / 2) + 1.2;
            const lx = midX + nx * lampOffset;
            const lz = midZ + nz * lampOffset;
            const lamp = assets.createStreetLamp();
            lamp.position.set(lx, 0, lz);
            lamp.rotation.y = angle - Math.PI; // Arm reaches into street
            chunk.group.add(lamp);
            chunk.lampCount++;
            totalLamps++;
            window.VietnamRaceMap.colliders.push({ type: 'circle', x: lx, z: lz, r: 0.25 });
          }

          // 2. Scaled Trees on Major Roads (>= 4 lanes: w >= 18m)
          if (w >= 18 && chunk.treeCount < 6) {
            const treeSteps = Math.min(2, Math.floor(len / 45));
            for (let s = 1; s <= treeSteps; s++) {
              const t = s / (treeSteps + 1);
              const px = p1.x + dx * t;
              const pz = p1.z + dz * t;
              const treeOffset = (w / 2) + 2.2;

              for (const side of [1, -1]) {
                const tx = px + nx * treeOffset * side;
                const tz = pz + nz * treeOffset * side;

                let nearLm = false;
                for (const lm of landmarks) {
                  if (Math.hypot(tx - lm.x, tz - lm.z) < lm.radius + 15) { nearLm = true; break; }
                }
                if (nearLm) continue;

                const isNearRiver = Math.abs(tx - 650) < 350 && Math.abs(tz) < 1200;
                let tree;
                if (isNearRiver && (s + side) % 2 === 0) tree = assets.createTreeDua();
                else if ((s + side) % 2 === 0) tree = assets.createTreePhuong();
                else tree = assets.createTreeXacu();

                const scale = 0.75 + Math.random() * 0.5; // 75% - 125% scale variation
                tree.scale.set(scale, scale, scale);
                tree.rotation.y = Math.random() * Math.PI * 2;
                tree.position.set(tx, 0, tz);

                chunk.group.add(tree);
                chunk.treeCount++;
                totalTrees++;
                window.VietnamRaceMap.colliders.push({ type: 'circle', x: tx, z: tz, r: 0.6 * scale });
              }
            }
          }
        }

        // Step C: Procedural Infill Shophouses Facing Street
        const isNotHighway = (hw !== 'motorway' && hw !== 'motorway_link' && props.bridge !== 'yes');
        if (isNotHighway && len >= 32 && chunk.bldCount < 6) {
          const bldSteps = Math.min(2, Math.max(1, Math.floor(len / 52)));
          for (let s = 0; s < bldSteps; s++) {
            const t = (s + 0.5) / bldSteps;
            const px = p1.x + dx * t;
            const pz = p1.z + dz * t;
            const bldW = 14 + ((idx + s) % 8);
            const bldD = 16 + (((idx * 3) + s) % 8);
            const bldOffset = (w / 2) + (bldD / 2) + 2.2;

            for (const side of [1, -1]) {
              if (chunk.bldCount >= 6) break;
              const bx = px + nx * bldOffset * side;
              const bz = pz + nz * bldOffset * side;

              let nearLm = false;
              for (const lm of landmarks) {
                if (Math.hypot(bx - lm.x, bz - lm.z) < lm.radius + 15) { nearLm = true; break; }
              }
              if (nearLm) continue;

              const levels = 3 + ((idx + s) % 5);
              const height = levels * 3.8;
              const colHex = bldColors[(idx + s) % bldColors.length];

              let bldMesh;
              if (window.VietnamRaceBuildings) {
                bldMesh = window.VietnamRaceBuildings.createBuildingMesh(bldW, height, bldD, idx + s, colHex);
              } else {
                const geo = new THREE.BoxGeometry(bldW, height, bldD);
                bldMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colHex }));
                bldMesh.position.y = height / 2;
              }

              bldMesh.position.set(bx, 0, bz);
              // Crucial Orientation Fix: Face squarely into the street!
              const rotY = side > 0 ? (angle - Math.PI / 2) : (angle + Math.PI / 2);
              bldMesh.rotation.y = rotY;

              chunk.group.add(bldMesh);
              chunk.bldCount++;
              totalBlds++;

              // Precise Oriented Bounding Box (OBB) Collider
              window.VietnamRaceMap.colliders.push({
                type: 'box', x: bx, z: bz,
                hw: bldW * 0.5, hd: bldD * 0.5,
                cosA: Math.cos(rotY), sinA: Math.sin(rotY)
              });
            }
          }
        }
      }
    });

    // Step D: Real Map Buildings from OpenStreetMap
    const mapBlds = window.VietnamRaceMapBuildings;
    if (mapBlds && mapBlds.length) {
      mapBlds.forEach(([cx, cz, bw, bd, ang], idx) => {
        let nearLm = false;
        for (const lm of landmarks) {
          if (Math.hypot(cx - lm.x, cz - lm.z) < lm.radius + 15) { nearLm = true; break; }
        }
        if (nearLm) return;

        const chunk = this.getChunk(cx, cz, group);
        if (chunk.bldCount >= 10) return; // Cap chunk density for 60 FPS

        const levels = 3 + (idx % 5);
        const height = levels * 3.8;
        const colHex = bldColors[idx % bldColors.length];

        let bldMesh;
        if (window.VietnamRaceBuildings) {
          bldMesh = window.VietnamRaceBuildings.createBuildingMesh(bw, height, bd, idx, colHex);
        } else {
          const geo = new THREE.BoxGeometry(bw, height, bd);
          bldMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colHex }));
          bldMesh.position.y = height / 2;
        }

        bldMesh.position.set(cx, 0, cz);
        bldMesh.rotation.y = ang;
        chunk.group.add(bldMesh);
        chunk.bldCount++;
        totalBlds++;

        window.VietnamRaceMap.colliders.push({
          type: 'box', x: cx, z: cz,
          hw: bw * 0.5, hd: bd * 0.5,
          cosA: Math.cos(ang), sinA: Math.sin(ang)
        });
      });
    }

    // Step E: Real Traffic Signals from OpenStreetMap
    const signals = window.VietnamRaceTrafficSignals;
    if (signals && signals.length && assets) {
      signals.forEach(([sx, sz], sIdx) => {
        let nearLm = false;
        for (const lm of landmarks) {
          if (Math.hypot(sx - lm.x, sz - lm.z) < lm.radius + 12) { nearLm = true; break; }
        }
        if (nearLm) return;

        const chunk = this.getChunk(sx, sz, group);
        const signal = assets.createTrafficLight();
        signal.position.set(sx, 0, sz);

        // Find nearest road to orient traffic light facing oncoming traffic
        let nearestAng = 0, minDistSq = Infinity;
        for (let r = 0; r < Math.min(roads.length, 400); r++) {
          const rd = roads[r];
          const dSq = (sx - rd.midX) * (sx - rd.midX) + (sz - rd.midZ) * (sz - rd.midZ);
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearestAng = rd.angle;
          }
        }
        signal.rotation.y = nearestAng;

        chunk.group.add(signal);
        totalSignals++;
        window.VietnamRaceMap.colliders.push({ type: 'circle', x: sx, z: sz, r: 0.3 });
      });
    }

    console.log(`[VietnamRaceOsmLoader] Map Built: ${roads.length} roads, ${totalBlds} buildings, ${totalTrees} trees, ${totalLamps} lamps, ${totalSignals} signals in ${this.chunks.size} chunks.`);
  },

  // 2. File Drag & Drop & Upload Fallback
  setupFileDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });
  },

  setupFileInput() {
    const input = document.getElementById('osmFileInput');
    if (input) {
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFile(e.target.files[0]);
        }
      });
    }
  },

  handleFile(file) {
    this.showToast(`⏳ Đang đọc file: ${file.name}...`, 3000);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let json;
        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          json = JSON.parse(text);
        } else {
          this.showToast('⚠️ Vui lòng nạp file GeoJSON hoặc OSM JSON', 4000);
          return;
        }
        window.VietnamRaceSaigonMapData = json;
        if (this.scene) {
          const old = this.scene.getObjectByName('saigon_real_world');
          if (old) this.scene.remove(old);
          window.VietnamRaceMap.createWorld(this.scene);
        }
        this.showToast(`🎉 Đã nạp thành công bản đồ từ ${file.name}!`, 4000);
      } catch (err) {
        this.showToast(`❌ Lỗi đọc file: ${err.message}`, 5000);
      }
    };
    reader.readAsText(file);
  },

  showToast(message, duration = 4000) {
    let toast = document.getElementById('mapToastNotice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mapToastNotice';
      toast.className = 'map-toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }
};
