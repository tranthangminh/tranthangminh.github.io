/**
 * Vietnam Race - Player Car Model & Driving Physics
 * Conforms to: products/web-apps/_RULE-web-apps.md
 */
window.VietnamRaceCar = {
  mesh: null,
  wheels: [],
  tailLights: [],

  // Physics state (Spawn directly on Real Nguyen Hue Promenade at City Hall)
  x: -160,
  y: 0.5,
  z: -220,
  yaw: 0.82,
  speed: 0, // In meters per second
  steerAngle: 0,
  isBraking: false,
  isDrifting: false,
  health: 100,
  maxHealth: 100,
  isDead: false,
  massKg: 1540,
  powerWatts: 245 * 745.7,
  nitroWatts: 3600 * 745.7,
  aeroDragFactor: 0.5 * 1.225 * 0.31 * 2.15,
  maxBrakeDecel: 1.05 * 9.81,
  rollingResistanceCoeff: 0.015,
  maxSteerAngleDeg: 30,
  minSteerAngleDeg: 6.5,
  turnSpeed: 2.2,
  TURN_SPEED: 2.2,
  engineBrakeCoeff: 3.8,
  hyperAeroCoeff: 4.2,
  nominalTopKmH: 228,
  isNitro: false,
  smokeParticles: [],
  fireParticles: [],
  nitroFlames: [],

  applyProfile(specId = 'player_sport') {
    if (!window.VietnamRaceVehicleSpecs) return;
    const p = window.VietnamRaceVehicleSpecs.getTunedProfile(specId);
    this.currentProfile = p;
    this.massKg = p.massKg || 1540;
    this.powerWatts = p.powerWatts;
    this.nitroWatts = p.nitroWatts;
    this.aeroDragFactor = p.aeroDragFactor;
    this.maxBrakeDecel = p.maxBrakeDecel;
    this.engineBrakeCoeff = p.engineBrakeCoeff || 3.8;
    this.hyperAeroCoeff = p.hyperAeroCoeff || 4.2;
    this.nominalTopKmH = p.nominalTopKmH || 228;
    this.rollingResistanceCoeff = p.rollingResistanceCoeff || 0.015;
    this.maxSteerAngleDeg = p.maxSteerAngleDeg || 30;
    this.minSteerAngleDeg = p.minSteerAngleDeg || 6.5;
    this.turnSpeed = p.turnSpeed || 2.2;
    this.TURN_SPEED = this.turnSpeed;
    this.maxHealth = p.maxHealth || 100;
  },

  takeDamage(amount) {
    if (this.isDead) return;
    if (window.VietnamRaceSettings && window.VietnamRaceSettings.get('godMode')) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.speed = 0;
    }
  },

  createCar(scene) {
    this.applyProfile('player_sport');
    const carGroup = new THREE.Group();

    // 1. Lower Chassis (Sporty Low-Poly Red Body - Scaled to realistic 1.82m width)
    const bodyGeo = new THREE.BoxGeometry(1.82, 0.65, 4.25);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd63031, // Sporty Red
      roughness: 0.3,
      metalness: 0.6
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.52;
    body.castShadow = true;
    carGroup.add(body);

    // Front Bumper Wedge
    const bumperGeo = new THREE.BoxGeometry(1.78, 0.38, 0.85);
    const bumperMat = new THREE.MeshLambertMaterial({ color: 0x2d3436 });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, 0.32, 2.2);
    carGroup.add(bumper);

    // 2. Cabin & Windshield (Tinted Cockpit)
    const cabinGeo = new THREE.BoxGeometry(1.52, 0.62, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.1,
      metalness: 0.9
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.1, -0.2);
    carGroup.add(cabin);

    // 3. Headlights (Bright White/Yellow LED)
    const lightGeo = new THREE.BoxGeometry(0.36, 0.16, 0.1);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    [-0.68, 0.68].forEach((xOff) => {
      const hl = new THREE.Mesh(lightGeo, headLightMat);
      hl.position.set(xOff, 0.56, 2.15);
      carGroup.add(hl);
    });

    // 4. Taillights (Red LED strips)
    const tailGeo = new THREE.BoxGeometry(0.42, 0.15, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    this.tailLights = [];
    [-0.68, 0.68].forEach((xOff) => {
      const tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(xOff, 0.6, -2.15);
      carGroup.add(tl);
      this.tailLights.push(tl);
    });

    // 5. Four Wheels (Real-life 18-inch wheels: diameter ~0.70m, radius 0.35m)
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 14);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xdfe6e9 });

    const wheelOffsets = [
      { x: -0.92, z: 1.3, isFront: true },
      { x: 0.92, z: 1.3, isFront: true },
      { x: -0.92, z: -1.3, isFront: false },
      { x: 0.92, z: -1.3, isFront: false }
    ];

    wheelOffsets.forEach((pos) => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(pos.x, 0.35, pos.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      wheelHub.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.29, 6), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelHub.add(rim);

      carGroup.add(wheelHub);
      this.wheels.push({ group: wheelHub, isFront: pos.isFront, tire });
    });

    // 6. Dual Nitro Rocket Exhausts & Cyan Plasma Flames
    this.nitroFlames = [];
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.35, 10);
    const nozzleMat = new THREE.MeshLambertMaterial({ color: 0x2d3436 });
    const flameGeo = new THREE.ConeGeometry(0.18, 1.4, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 }); // Cyan rocket fire

    [-0.38, 0.38].forEach((xOff) => {
      const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(xOff, 0.42, -2.18);
      carGroup.add(nozzle);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.rotation.x = -Math.PI / 2; // Point backward
      flame.position.set(xOff, 0.42, -2.9);
      flame.visible = false;
      carGroup.add(flame);
      this.nitroFlames.push(flame);
    });

    // 7. Hood Smoke & Fire Particles (Dynamic Vehicle Damage Effects)
    this.smokeParticles = [];
    this.fireParticles = [];
    const smokeGeo = new THREE.SphereGeometry(0.26, 6, 6);
    const smokeMat = new THREE.MeshLambertMaterial({ color: 0x64748b, transparent: true, opacity: 0.65 });
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(smokeGeo, smokeMat);
      sp.position.set((Math.random() - 0.5) * 0.6, 0.8 + i * 0.25, 1.3 + (Math.random() - 0.5) * 0.4);
      sp.visible = false;
      carGroup.add(sp);
      this.smokeParticles.push({ mesh: sp, speed: 1.4 + Math.random() * 0.8 });
    }

    const fireGeo = new THREE.ConeGeometry(0.22, 0.7, 6);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
    for (let i = 0; i < 4; i++) {
      const fp = new THREE.Mesh(fireGeo, fireMat);
      fp.position.set((Math.random() - 0.5) * 0.6, 0.85, 1.25 + (Math.random() - 0.5) * 0.4);
      fp.visible = false;
      carGroup.add(fp);
      this.fireParticles.push({ mesh: fp, seed: Math.random() * 10 });
    }

    // Initial Spawn on Real Nguyen Hue Walking Street (Heading South-East toward Saigon River)
    this.x = -160;
    this.y = 0;
    this.z = -220;
    this.yaw = 0.82;
    carGroup.position.set(this.x, this.y, this.z);
    carGroup.rotation.y = this.yaw;

    scene.add(carGroup);
    this.mesh = carGroup;
    return carGroup;
  },

  update(dt, input, colliders) {
    if (!this.mesh) return;

    // Safety Guard: Auto-recover from any unexpected NaN state
    if (isNaN(this.x) || isNaN(this.z) || isNaN(this.yaw) || isNaN(this.speed)) {
      console.warn('[VietnamRaceCar] Auto-recovered from NaN physics state');
      this.respawn();
      return;
    }

    // If engine is destroyed: coast to a stop and update burning effects
    if (this.isDead) {
      this.speed *= Math.max(0, 1.0 - 2.5 * dt);
      this.updateDamageParticles(dt);
      const moveX = Math.sin(this.yaw) * this.speed * dt;
      const moveZ = Math.cos(this.yaw) * this.speed * dt;
      this.x += moveX;
      this.z += moveZ;
      this.mesh.position.set(this.x, 0, this.z);
      return;
    }

    // 1. Throttle, Brake & Nitro Boost States
    const isForward = input.up || input.touchThrottle;
    const isReverse = input.down || input.touchBrake;
    const isHandbrake = input.handbrake || input.touchHandbrake;
    const absV = Math.abs(this.speed);

    // Nitro can be fired ANYTIME (at 0 km/h, rolling, or high speed), always blasts forward!
    const isNitro = !!(input.nitro || input.touchNitro);
    this.isNitro = isNitro;

    // 2. Engine Driving Force (P = F * v => F = P / max(v, 2.5))
    let F_drive = 0;
    if (isForward && this.speed >= -1.0) {
      const effSpeed = Math.max(absV, 2.5);
      const thrust = this.powerWatts / effSpeed;
      F_drive = Math.min(thrust, this.massKg * 8.5); // Punchy launch traction
    } else if (isReverse && this.speed <= 0.4) {
      const effSpeed = Math.max(absV, 2.0);
      const revThrust = (this.powerWatts * 0.55) / effSpeed;
      F_drive = -Math.min(revThrust, this.massKg * 6.5); // Responsive, punchy reverse gear
    }

    // 3. Nitro Rocket Thrust Force (Always fires forward with massive rocket propulsion!)
    let F_nitro = 0;
    if (isNitro) {
      const effSpeed = Math.max(Math.max(0, this.speed), 3.0);
      const thrust = this.nitroWatts / effSpeed;
      F_nitro = Math.min(thrust, this.massKg * 55.0); // Heavy forward acceleration

      this.nitroFlames.forEach((flame) => {
        flame.visible = true;
        flame.scale.set(1.0 + Math.random() * 0.5, 1.0 + Math.random(), 1.0 + Math.random() * 0.5);
      });
      if (window.VietnamRaceAudio?.startNitro) window.VietnamRaceAudio.startNitro();
    } else {
      this.nitroFlames.forEach((flame) => (flame.visible = false));
      if (window.VietnamRaceAudio?.stopNitro) window.VietnamRaceAudio.stopNitro();
    }

    // 4. Non-Linear Retardation Forces (Air Drag, Shockwave Drag, Engine Braking, Rolling)
    const v = this.speed;
    const speedKmH = absV * 3.6;
    const nominalTopSpeed = (this.nominalTopKmH || 228) / 3.6;

    // A. Aerodynamic Drag with Hyper-Speed Shockwave Multiplier (Drops rapidly at 300-699 km/h)
    const hyperRatio = Math.max(0, (absV - nominalTopSpeed) / nominalTopSpeed);
    const hyperFactor = 1.0 + (this.hyperAeroCoeff || 4.2) * Math.pow(hyperRatio, 1.6);
    const F_drag = Math.sign(v) * this.aeroDragFactor * v * v * hyperFactor;

    // B. Non-Linear Engine Compression Braking (Hãm động cơ: ghì mạnh ở tốc độ cao, nhả ly hợp ở tốc độ chậm)
    let F_engine_brake = 0;
    if (!isForward && !isReverse && absV > 0.4) {
      const vNorm = absV / 28.0; // Normalized around ~100 km/h
      const clutch = Math.min(1.0, Math.max(0, (speedKmH - 12.0) / 24.0)); // Clutch disengages smoothly below ~36 km/h
      const engineDecel = (this.engineBrakeCoeff || 3.8) * Math.pow(vNorm, 1.35) * clutch;
      F_engine_brake = Math.sign(v) * this.massKg * engineDecel;
    }

    // C. Rolling Resistance (Minimal, enables smooth long coasting at low speeds)
    const F_roll = absV > 0.05 ? Math.sign(v) * this.rollingResistanceCoeff * this.massKg * 9.81 : 0;

    // 5. Dynamic Aero-Assisted Braking Force
    let F_brake = 0;
    const isFootBraking = (isReverse && this.speed > 0.4) || (isForward && this.speed < -0.4);
    if (isFootBraking || isHandbrake) {
      this.isBraking = true;
      const baseGrip = this.massKg * this.maxBrakeDecel;
      // High-speed air pressure assists brake down to tire grip
      const aeroBrakeAssist = this.massKg * Math.min(22.0, Math.pow(speedKmH / 110.0, 1.45) * 5.0);
      const totalBrakeForce = (isHandbrake ? baseGrip * 1.35 : baseGrip) + aeroBrakeAssist;
      F_brake = Math.sign(v) * totalBrakeForce;

      if (isHandbrake && absV > 5) {
        this.isDrifting = true;
        if (window.VietnamRaceAudio) window.VietnamRaceAudio.playSkid();
      } else {
        this.isDrifting = false;
      }
    } else {
      this.isBraking = false;
      this.isDrifting = false;
    }

    // 6. Net Force & Acceleration (Newton's 2nd Law: F = m * a => a = sum(F) / m)
    const F_retard = F_drag + F_engine_brake + F_roll + F_brake;
    const F_net = F_drive + F_nitro - F_retard;
    const accel = F_net / this.massKg;

    // Advance speed
    this.speed += accel * dt;

    // Clean zero stop: Prevent overshoot into reverse during forward braking
    if (isFootBraking && Math.sign(this.speed) !== Math.sign(v) && absV < 5.0) {
      this.speed = 0;
    }
    // Smooth resting stop (no micro vibration when stationary)
    if (!isForward && !isReverse && Math.abs(this.speed) < 0.12) {
      this.speed = 0;
    }

    // Steering with Speed-Sensitive Damping (High speed reduces steer lock)
    let steerInput = 0;
    if (input.left || input.touchLeft) steerInput += 1;
    if (input.right || input.touchRight) steerInput -= 1;

    const curSpeedKmH = Math.abs(this.speed * 3.6);
    const steerDamping = 1.0 / (1.0 + Math.pow(curSpeedKmH / 65.0, 1.25));
    const maxSteerRad = (this.maxSteerAngleDeg || 30) * (Math.PI / 180);
    const minSteerRad = (this.minSteerAngleDeg || 6.5) * (Math.PI / 180);
    const currentSteerRange = minSteerRad + (maxSteerRad - minSteerRad) * steerDamping;

    const targetSteer = steerInput * currentSteerRange;
    this.steerAngle += (targetSteer - this.steerAngle) * 8 * dt;

    // Yaw change depends on forward speed (Fixed: uses this.turnSpeed with fallback)
    if (Math.abs(this.speed) > 0.1) {
      const dir = this.speed >= 0 ? 1 : -1;
      const driftMultiplier = this.isDrifting ? 1.6 : 1.0;
      const turnRate = this.turnSpeed || this.TURN_SPEED || 2.2;
      this.yaw += this.steerAngle * turnRate * dir * driftMultiplier * dt;
    }

    // Calculate movement vector
    const moveX = Math.sin(this.yaw) * this.speed * dt;
    const moveZ = Math.cos(this.yaw) * this.speed * dt;

    const nextX = this.x + moveX;
    const nextZ = this.z + moveZ;

    // High-Precision Collision Check with Map Obstacles (AABB Box + Cylinder)
    let blocked = false;
    if (colliders && colliders.length) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (Math.abs(nextX - c.x) > 35 || Math.abs(nextZ - c.z) > 35) continue;
        if (c.hw || c.w) {
          // Precise Oriented Bounding Box (OBB) or Axis-Aligned Box (AABB)
          const hw = c.hw || (c.w * 0.5);
          const hd = c.hd || (c.d * 0.5);
          let dx, dz;
          if (c.cosA !== undefined) {
            const rx = nextX - c.x;
            const rz = nextZ - c.z;
            const lx = rx * c.cosA - rz * c.sinA;
            const lz = rx * c.sinA + rz * c.cosA;
            dx = Math.max(0, Math.abs(lx) - hw);
            dz = Math.max(0, Math.abs(lz) - hd);
          } else {
            dx = Math.max(0, Math.abs(nextX - c.x) - hw);
            dz = Math.max(0, Math.abs(nextZ - c.z) - hd);
          }
          if (dx * dx + dz * dz < 0.85 * 0.85) { // Snug 0.85m car buffer
            blocked = true;
            const impactKmH = Math.abs(this.speed * 3.6);
            if (impactKmH > 15) {
              const dmg = Math.min(100, Math.pow(impactKmH / 18.0, 1.5) * 4.2);
              this.takeDamage(dmg);
            }
            this.speed = -this.speed * 0.35; // Bounce off wall
            break;
          }
        } else {
          // Circular / Cylinder Collider for Trees, Lamp posts, Jersey barriers
          const distSq = (nextX - c.x) * (nextX - c.x) + (nextZ - c.z) * (nextZ - c.z);
          const minDist = (c.r || 0.6) + 0.85;
          if (distSq < minDist * minDist) {
            blocked = true;
            const impactKmH = Math.abs(this.speed * 3.6);
            if (impactKmH > 15) {
              const dmg = Math.min(100, Math.pow(impactKmH / 18.0, 1.5) * 4.2);
              this.takeDamage(dmg);
            }
            this.speed = -this.speed * 0.35;
            break;
          }
        }
      }
    }

    // Free Movement Across Infinite Real Map (Zero artificial boundaries)
    if (!blocked) {
      this.x = nextX;
      this.z = nextZ;
    }

    // Update 3D Mesh
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.yaw;

    // Steer front wheels & roll all wheels
    const rollSpeed = (this.speed / 0.35) * dt;
    this.wheels.forEach((w) => {
      w.tire.rotation.x += rollSpeed;
      if (w.isFront) {
        w.group.rotation.y = this.steerAngle;
      }
    });

    // Update Taillight glow on braking
    if (this.tailLights.length) {
      const colorHex = this.isBraking ? 0xff0000 : 0x771111;
      this.tailLights.forEach((tl) => tl.material.color.setHex(colorHex));
    }

    // Update Damage Particle FX (Smoke & Fire)
    this.updateDamageParticles(dt);

    // Update Audio
    if (window.VietnamRaceAudio) {
      window.VietnamRaceAudio.updateEngine(speedKmH, 115);
    }
  },

  updateDamageParticles(dt) {
    const isSmoking = this.health < 50;
    const isHeavySmoke = this.health < 25;
    const isBurning = this.health <= 0;

    this.smokeParticles.forEach((sp) => {
      sp.mesh.visible = isSmoking || isBurning;
      if (sp.mesh.visible) {
        sp.mesh.position.y += sp.speed * dt;
        sp.mesh.scale.setScalar(1.0 + (sp.mesh.position.y - 0.8) * 0.8);
        if (sp.mesh.position.y > 2.5) {
          sp.mesh.position.y = 0.8;
          sp.mesh.position.x = (Math.random() - 0.5) * 0.5;
        }
        sp.mesh.material.color.setHex(isHeavySmoke || isBurning ? 0x1e293b : 0x94a3b8);
      }
    });

    this.fireParticles.forEach((fp) => {
      fp.mesh.visible = isBurning;
      if (isBurning) {
        fp.seed += dt * 14;
        const scale = 0.8 + Math.sin(fp.seed) * 0.35;
        fp.mesh.scale.set(scale, scale * 1.3, scale);
      }
    });
  },

  respawn() {
    this.health = 100;
    this.isDead = false;
    this.smokeParticles.forEach((sp) => (sp.mesh.visible = false));
    this.fireParticles.forEach((fp) => (fp.mesh.visible = false));
    this.x = -160;
    this.y = 0;
    this.z = -220;
    this.yaw = 0.82;
    this.speed = 0;
    this.steerAngle = 0;
    if (this.mesh) {
      this.mesh.position.set(this.x, 0, this.z);
      this.mesh.rotation.y = this.yaw;
    }
  },

  getSpeedKmH() {
    return Math.round(this.speed * 3.6);
  }
};
