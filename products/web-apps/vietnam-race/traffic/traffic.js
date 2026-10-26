/**
 * Vietnam Race - Dynamic GTA-Style Traffic Simulation with Spatial Bubble & Ragdoll Physics
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceTraffic = {
  scene: null,
  vehicles: [],
  lastHonkTime: 0,

  clear() {
    if (this.scene && this.vehicles) {
      this.vehicles.forEach((v) => {
        if (v.mesh) this.scene.remove(v.mesh);
      });
    }
    this.vehicles = [];
  },

  reloadTraffic(scene, density) {
    this.init(scene || this.scene, density);
  },

  createVehicleRecord(type, road, progress, dir, idx) {
    const assets = window.VietnamRaceAssets;
    const specs = window.VietnamRaceVehicleSpecs;
    if (!assets || !road) return null;

    let mesh = null;
    let speed = 9.0;
    let colWidth = 1.6;
    let colLength = 4.0;
    let massKg = 115;
    let specKey = 'traffic_scooter';
    let laneFactor = 0.32;

    if (type === 'scooter') {
      specKey = 'traffic_scooter';
      const colors = [0x27ae60, 0xf1c40f, 0xe67e22, 0x8e44ad, 0xe74c3c, 0x3498db];
      mesh = assets.createTrafficScooter(colors[idx % colors.length]);
      laneFactor = 0.33;
    } else if (type === 'delivery') {
      specKey = 'traffic_delivery';
      mesh = assets.createTrafficDeliveryScooter();
      laneFactor = 0.30;
    } else if (type === 'taxi') {
      specKey = 'traffic_taxi';
      const brands = ['xanh_sm', 'mailinh', 'vinasun'];
      mesh = assets.createTrafficTaxi(brands[idx % brands.length]);
      laneFactor = 0.16;
    } else if (type === 'bus') {
      specKey = 'traffic_bus';
      mesh = assets.createTrafficBus(false);
      laneFactor = 0.20;
    }

    if (specs && specs[specKey]) {
      const prof = specs.getTunedProfile(specKey);
      const nominalMps = (prof.nominalTopKmH || 45) / 3.6;
      speed = nominalMps * (0.82 + Math.random() * 0.32);
      colWidth = prof.dimensions ? prof.dimensions.width : 1.6;
      colLength = prof.dimensions ? prof.dimensions.length : 4.0;
      massKg = prof.massKg || 115;
    }

    const laneOffset = (dir > 0 ? 1 : -1) * (road.w * laneFactor + (Math.random() * 0.6 - 0.3));
    const rx = road.x1 + progress * (road.x2 - road.x1);
    const rz = road.z1 + progress * (road.z2 - road.z1);
    const perpX = -Math.cos(road.angle);
    const perpZ = Math.sin(road.angle);
    const baseAngle = road.angle + Math.PI;
    const yaw = dir > 0 ? baseAngle : baseAngle + Math.PI;

    mesh.position.set(rx + perpX * laneOffset, 0, rz + perpZ * laneOffset);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);

    return {
      mesh,
      road,
      progress,
      baseSpeed: speed,
      currentSpeed: speed,
      dir,
      baseLaneOffset: laneOffset,
      currentLaneOffset: laneOffset,
      targetLaneOffset: laneOffset,
      laneTimer: 2.0 + Math.random() * 5.0,
      currentYaw: yaw,
      colWidth,
      colLength,
      massKg,
      tiltZ: 0,
      type,
      isAirborne: false,
      isWrecked: false,
      airX: rx + perpX * laneOffset,
      airY: 0,
      airZ: rz + perpZ * laneOffset,
      velX: 0,
      velY: 0,
      velZ: 0,
      spinX: 0,
      spinY: 0,
      spinZ: 0,
      crashTime: 0,
      rotX: 0,
      rotY: yaw,
      rotZ: 0
    };
  },

  recycleVehicle(v, playerX, playerZ, playerYaw) {
    const roads = window.VietnamRaceMap?.roads;
    if (!roads || !roads.length) return;

    // Filter candidate roads within 120m - 380m around player, preferentially in forward heading
    const fwdX = Math.sin(playerYaw || 0);
    const fwdZ = Math.cos(playerYaw || 0);
    const candidates = [];

    for (let i = 0; i < roads.length; i++) {
      const r = roads[i];
      const dx = r.midX - playerX;
      const dz = r.midZ - playerZ;
      const d = Math.hypot(dx, dz);
      if (d >= 100 && d <= 380) {
        const dot = (dx * fwdX + dz * fwdZ) / (d || 1);
        if (dot >= -0.2) candidates.push(r);
      }
    }

    const road = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : roads[Math.floor(Math.random() * roads.length)];

    const dir = Math.random() < 0.5 ? 1 : -1;
    const progress = 0.15 + Math.random() * 0.7;

    v.road = road;
    v.progress = progress;
    v.dir = dir;
    v.isAirborne = false;
    v.isWrecked = false;
    v.velX = 0;
    v.velY = 0;
    v.velZ = 0;
    v.currentSpeed = v.baseSpeed;

    const isScooter = v.type === 'scooter' || v.type === 'delivery';
    const laneSpan = isScooter ? (0.24 + Math.random() * 0.12) : (0.14 + Math.random() * 0.10);
    v.baseLaneOffset = (v.dir > 0 ? 1 : -1) * (v.road.w * laneSpan);
    v.currentLaneOffset = v.baseLaneOffset;
    v.targetLaneOffset = v.baseLaneOffset;

    const baseAngle = v.road.angle + Math.PI;
    v.currentYaw = v.dir > 0 ? baseAngle : baseAngle + Math.PI;
    v.rotX = 0;
    v.rotY = v.currentYaw;
    v.rotZ = 0;

    const rx = road.x1 + progress * (road.x2 - road.x1);
    const rz = road.z1 + progress * (road.z2 - road.z1);
    const perpX = -Math.cos(road.angle);
    const perpZ = Math.sin(road.angle);
    v.mesh.position.set(rx + perpX * v.currentLaneOffset, 0, rz + perpZ * v.currentLaneOffset);
    v.mesh.rotation.set(0, v.currentYaw, 0);
  },

  init(scene, densityOverride) {
    if (scene) this.scene = scene;
    if (!this.scene) return;
    this.clear();
    const roads = window.VietnamRaceMap?.roads;
    if (!roads || !roads.length) return;

    const density = densityOverride || (window.VietnamRaceSettings ? window.VietnamRaceSettings.get('trafficDensity') : 'normal');
    if (density === 'none') return;

    // High Density Traffic Bubble: maintains 48 vehicles around player
    const totalCount = density === 'low' ? 24 : (density === 'dense' ? 64 : 48);
    const player = window.VietnamRaceCar || { x: 0, z: -50 };

    // Select candidate roads around player start
    const nearRoads = roads.filter((r) => Math.hypot(r.midX - player.x, r.midZ - player.z) < 450);
    const pool = nearRoads.length >= 12 ? nearRoads : roads;

    const types = ['scooter', 'scooter', 'scooter', 'delivery', 'taxi', 'bus'];

    for (let i = 0; i < totalCount; i++) {
      const type = types[i % types.length];
      const road = pool[i % pool.length];
      const dir = (i % 2 === 0) ? 1 : -1;
      const progress = ((i / totalCount) + Math.random() * 0.15) % 1.0;
      const v = this.createVehicleRecord(type, road, progress, dir, i);
      if (v) this.vehicles.push(v);
    }
  },

  update(dt) {
    if (!this.vehicles.length) return;
    const player = window.VietnamRaceCar;
    const now = Date.now();

    for (let idx = 0; idx < this.vehicles.length; idx++) {
      const v = this.vehicles[idx];

      if (isNaN(v.progress) || isNaN(v.currentSpeed)) {
        v.progress = Math.random();
        v.currentSpeed = v.baseSpeed || 10.0;
      }

      // A. Airborne / Wrecked Ragdoll Flight Update
      if (v.isAirborne || v.isWrecked) {
        if (v.isAirborne) {
          v.velY -= 25.0 * dt;
          v.airY += v.velY * dt;
          v.airX += v.velX * dt;
          v.airZ += v.velZ * dt;

          v.rotX += v.spinX * dt;
          v.rotY += v.spinY * dt;
          v.rotZ += v.spinZ * dt;

          if (v.airY <= 0) {
            v.airY = 0;
            v.velY = -v.velY * 0.35;
            v.velX *= 0.88;
            v.velZ *= 0.88;
            v.spinX *= 0.72;
            v.spinY *= 0.72;
            v.spinZ *= 0.72;

            if (window.VietnamRaceAudio?.playCrash && Math.abs(v.velY) > 2.0) {
              window.VietnamRaceAudio.playCrash();
            }

            if (Math.abs(v.velY) < 1.2 && Math.hypot(v.velX, v.velZ) < 2.0) {
              v.isAirborne = false;
              v.isWrecked = true;
              v.velY = 0;
              if (v.type === 'scooter' || v.type === 'delivery') {
                v.rotZ = (v.spinZ > 0 ? 1 : -1) * 1.45;
                v.rotX = 0;
              }
            }
          }
        } else if (v.isWrecked) {
          v.airX += v.velX * dt;
          v.airZ += v.velZ * dt;
          v.velX *= Math.max(0, 1.0 - 5.0 * dt);
          v.velZ *= Math.max(0, 1.0 - 5.0 * dt);

          const distToPlayer = player ? Math.hypot(player.x - v.airX, player.z - v.airZ) : 100;
          if (now - v.crashTime > 4500 || distToPlayer > 80) {
            v.isWrecked = false;
            v.isAirborne = false;
            v.rotX = 0;
            v.rotZ = 0;
            v.currentSpeed = v.baseSpeed;
            const dx = v.road.x2 - v.road.x1;
            const dz = v.road.z2 - v.road.z1;
            const proj = ((v.airX - v.road.x1) * dx + (v.airZ - v.road.z1) * dz) / (v.road.len * v.road.len);
            v.progress = Math.max(0, Math.min(1.0, isNaN(proj) ? v.progress : proj));
            v.currentLaneOffset = v.baseLaneOffset;
          }
        }

        v.mesh.position.set(v.airX, v.airY, v.airZ);
        v.mesh.rotation.set(v.rotX, v.rotY, v.rotZ);
        continue;
      }

      // 1. Calculate 3D Position & Heading Vectors
      const rx = v.road.x1 + v.progress * (v.road.x2 - v.road.x1);
      const rz = v.road.z1 + v.progress * (v.road.z2 - v.road.z1);
      const perpX = -Math.cos(v.road.angle);
      const perpZ = Math.sin(v.road.angle);
      const fwdX = Math.sin(v.road.angle) * v.dir;
      const fwdZ = Math.cos(v.road.angle) * v.dir;

      const curX = rx + perpX * v.currentLaneOffset;
      const curZ = rz + perpZ * v.currentLaneOffset;

      // Dynamic Traffic Bubble: Recycle if drifting > 420m away from player
      if (player) {
        const distToPlayer = Math.hypot(player.x - curX, player.z - curZ);
        if (distToPlayer > 420) {
          this.recycleVehicle(v, player.x, player.z, player.yaw);
          continue;
        }
      }

      // 2. Obstacle Sensing, Collision & Overtaking Logic
      let obstacleAhead = false;
      let targetSpeed = v.baseSpeed;
      let wantOvertake = false;

      if (player) {
        const relX = player.x - curX;
        const relZ = player.z - curZ;
        const distFwd = Math.abs(relX * fwdX + relZ * fwdZ);
        const distLat = Math.abs(relX * perpX + relZ * perpZ);

        // A. Tight Physical Collision with Momentum Physics
        const colFwdThreshold = (v.colLength * 0.5) + 1.2;
        const colLatThreshold = (v.colWidth * 0.5) + 0.65;

        if (distFwd < colFwdThreshold && distLat < colLatThreshold) {
          const mPlayer = player.massKg || 1540;
          const mNPC = v.massKg || 115;
          const totalMass = mPlayer + mNPC;
          const massRatioPlayer = mNPC / totalMass;
          const massRatioNPC = mPlayer / totalMass;

          const relSpeedKmH = Math.abs(player.speed - v.currentSpeed) * 3.6;

          const speedRetention = Math.max(0.12, 1.0 - massRatioPlayer * 0.92);
          player.speed *= speedRetention;
          player.x += (relX > 0 ? 0.35 : -0.35) * massRatioPlayer;
          player.z += (relZ > 0 ? 0.35 : -0.35) * massRatioPlayer;

          if (player.takeDamage && relSpeedKmH > 15) {
            const dmg = Math.min(100, Math.pow(relSpeedKmH / 18.0, 1.45) * massRatioPlayer * 8.5);
            player.takeDamage(dmg);
          }

          if (relSpeedKmH > 10 && !v.isAirborne) {
            v.isAirborne = true;
            v.isWrecked = false;
            v.crashTime = now;
            v.airX = curX;
            v.airY = 0.25;
            v.airZ = curZ;

            const fwdLaunch = Math.max(9.0, Math.abs(player.speed) * 0.88) * massRatioNPC;
            const latLaunch = (relX * perpX + relZ * perpZ > 0 ? -1.0 : 1.0) * (relSpeedKmH > 40 ? 7.0 : 4.0) * massRatioNPC;

            v.velX = fwdX * fwdLaunch + perpX * latLaunch;
            v.velZ = fwdZ * fwdLaunch + perpZ * latLaunch;

            const isTwoWheeler = v.type === 'scooter' || v.type === 'delivery';
            const upwardFactor = isTwoWheeler ? 1.0 : (v.type === 'taxi' ? 0.35 : 0.04);
            v.velY = Math.min(24.0, (relSpeedKmH / 15.0) * 4.4 * massRatioNPC * upwardFactor);

            v.spinX = (Math.random() - 0.5) * (isTwoWheeler ? 20.0 : 6.0) * massRatioNPC;
            v.spinY = (Math.random() - 0.5) * 24.0 * massRatioNPC;
            v.spinZ = (Math.random() - 0.5) * (isTwoWheeler ? 18.0 : 4.0) * massRatioNPC;
            v.rotX = 0;
            v.rotY = v.mesh.rotation.y;
            v.rotZ = 0;

            if (window.VietnamRaceAudio?.playCrash) window.VietnamRaceAudio.playCrash();
          }

          if (window.VietnamRaceAudio && now - this.lastHonkTime > 1200) {
            window.VietnamRaceAudio.playHorn();
            this.lastHonkTime = now;
          }
        } else {
          const dPlayer = Math.hypot(relX, relZ);
          const fwdDot = relX * fwdX + relZ * fwdZ;
          if (dPlayer < 13.0 && fwdDot > 0.5) {
            obstacleAhead = true;
            targetSpeed = Math.min(targetSpeed, Math.max(0, player.speed * 0.88));
            wantOvertake = true;
          }
        }
      }

      // Check distance to other NPCs ahead
      for (let j = 0; j < this.vehicles.length; j++) {
        if (j === idx) continue;
        const other = this.vehicles[j];
        if (other.road === v.road && other.dir === v.dir) {
          const dOther = Math.hypot(other.mesh.position.x - curX, other.mesh.position.z - curZ);
          const progressDiff = (other.progress - v.progress) * v.dir;
          if (dOther < 11.0 && progressDiff > 0 && progressDiff < 0.13) {
            obstacleAhead = true;
            targetSpeed = Math.min(targetSpeed, other.currentSpeed * 0.88);
            if (v.currentSpeed > other.currentSpeed * 0.92) wantOvertake = true;
          }
        }
      }

      // 3. Dynamic Organic Lane Changing (Chuyển làn tự nhiên)
      v.laneTimer -= dt;
      if (v.laneTimer <= 0) {
        v.laneTimer = 3.5 + Math.random() * 5.0;
        const isScooter = v.type === 'scooter' || v.type === 'delivery';
        const laneSpan = isScooter ? (0.22 + Math.random() * 0.16) : (0.12 + Math.random() * 0.14);
        v.targetLaneOffset = (v.dir > 0 ? 1 : -1) * (v.road.w * laneSpan);
      }

      if (wantOvertake) {
        const swerveDir = (v.currentLaneOffset * v.dir > v.road.w * 0.22) ? -1 : 1;
        const targetOffset = v.baseLaneOffset + swerveDir * v.dir * 2.8;
        v.currentLaneOffset += (targetOffset - v.currentLaneOffset) * 2.8 * dt;
        if (v.type === 'scooter') v.tiltZ = -swerveDir * 0.08;
      } else {
        const diff = v.targetLaneOffset - v.currentLaneOffset;
        v.currentLaneOffset += diff * 1.8 * dt;
        if (v.type === 'scooter') v.tiltZ = Math.max(-0.1, Math.min(0.1, -diff * 0.04));
      }

      // 4. Smooth Acceleration / Deceleration
      if (obstacleAhead) {
        v.currentSpeed += (targetSpeed - v.currentSpeed) * 6.5 * dt;
      } else {
        v.currentSpeed += (v.baseSpeed - v.currentSpeed) * 3.0 * dt;
      }

      v.tiltZ *= Math.max(0, 1.0 - 4.0 * dt);

      // 5. Progress Position & Network Intersection Navigation
      const step = (v.currentSpeed * dt) / v.road.len;
      v.progress += v.dir * step;

      if (v.progress > 1.0 || v.progress < 0.0) {
        this.transitionToNextRoad(v, player);
      }

      const nextX = rx + perpX * v.currentLaneOffset;
      const nextZ = rz + perpZ * v.currentLaneOffset;
      v.mesh.position.set(nextX, 0, nextZ);

      const baseAngle = v.road.angle + Math.PI;
      const targetYaw = v.dir > 0 ? baseAngle : baseAngle + Math.PI;
      let diffYaw = targetYaw - v.currentYaw;
      while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
      while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
      v.currentYaw += diffYaw * Math.min(1.0, 9.0 * dt);

      v.mesh.rotation.y = v.currentYaw;
      v.mesh.rotation.z = v.tiltZ;
    }
  },

  // 6. Network Intersection Navigation & Dynamic Road Branching
  transitionToNextRoad(v, player) {
    const roads = window.VietnamRaceMap?.roads;
    if (!roads || !roads.length) {
      v.dir = -v.dir;
      return;
    }
    const endPt = v.dir > 0 ? { x: v.road.x2, z: v.road.z2 } : { x: v.road.x1, z: v.road.z1 };
    const candidates = [];

    for (let i = 0; i < roads.length; i++) {
      const r = roads[i];
      if (r === v.road) continue;
      if (Math.abs(endPt.x - r.x1) < 18 && Math.abs(endPt.z - r.z1) < 18) {
        if (Math.hypot(endPt.x - r.x1, endPt.z - r.z1) < 16.0) {
          candidates.push({ road: r, startProgress: 0.02, dir: 1, sameStreet: r.name === v.road.name });
        }
      } else if (Math.abs(endPt.x - r.x2) < 18 && Math.abs(endPt.z - r.z2) < 18) {
        if (Math.hypot(endPt.x - r.x2, endPt.z - r.z2) < 16.0) {
          candidates.push({ road: r, startProgress: 0.98, dir: -1, sameStreet: r.name === v.road.name });
        }
      }
    }

    if (!candidates.length) {
      // If at a dead end and player is active, 45% chance to recycle ahead of player
      if (player && Math.random() < 0.45) {
        this.recycleVehicle(v, player.x, player.z, player.yaw);
        return;
      }
      v.dir = -v.dir;
      v.progress = v.dir > 0 ? 0.05 : 0.95;
      return;
    }

    const sameStreets = candidates.filter((c) => c.sameStreet);
    const chosen = (sameStreets.length && Math.random() < 0.72)
      ? sameStreets[Math.floor(Math.random() * sameStreets.length)]
      : candidates[Math.floor(Math.random() * candidates.length)];

    v.road = chosen.road;
    v.progress = chosen.startProgress;
    v.dir = chosen.dir;

    const isScooter = v.type === 'scooter' || v.type === 'delivery';
    const laneSpan = isScooter ? (0.24 + Math.random() * 0.14) : (0.14 + Math.random() * 0.12);
    v.baseLaneOffset = (v.dir > 0 ? 1 : -1) * (v.road.w * laneSpan);
    v.targetLaneOffset = v.baseLaneOffset;
  }
};
