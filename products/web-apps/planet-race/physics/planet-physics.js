/**
 * Planet Race - Cannon.js Real Physics Engine & RaycastVehicle Ground Manifold
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRacePhysics = {
  PLANET_RADIUS: 1000.0,
  RIDE_HEIGHT: 0.68,

  gravityPresets: {
    kaio: { name: 'Kaio 10G (Mặc định)', g: 98.1, label: '10.0 G' },
    earth: { name: 'Trái Đất 1G', g: 9.81, label: '1.0 G' },
    moon: { name: 'Mặt Trăng 0.16G', g: 1.62, label: '0.16 G' },
    micro: { name: 'Vi Trọng Lực 0.05G', g: 0.50, label: '0.05 G' }
  },
  currentGravityKey: 'kaio',
  g0: 98.1,

  // Cannon.js Rigid Body & Vehicle Entities
  world: null,
  planetBody: null,
  planetShape: null,
  chassisBody: null,
  vehicle: null,
  rampBodies: [],
  activeSpec: null,
  isInitialized: false,

  init(spec) {
    if (typeof CANNON === 'undefined') {
      console.warn('Cannon.js not loaded yet');
      return;
    }
    this.activeSpec = spec || {};

    // 1. Setup Cannon Physics World (Spherical Radial Gravity)
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // Radial gravity applied per substep in preStep
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = 0.5;

    // 2. Planet Analytical Ground Body (Raycast target, collisionResponse false so chassis isn't blocked by R=1000)
    this.planetBody = new CANNON.Body({ mass: 0 });
    this.planetShape = new CANNON.Sphere(this.PLANET_RADIUS);
    this.planetBody.addShape(this.planetShape);
    this.planetBody.collisionResponse = false;
    this.world.addBody(this.planetBody);

    // 3. Register preStep Listener (Applies continuous forces on EVERY physics substep)
    this.world.addEventListener('preStep', () => {
      this.applyPreStepForces();
    });

    // 4. Build RaycastVehicle Chassis & Wheels
    this.buildVehicle(this.activeSpec);
    this.isInitialized = true;
  },

  buildVehicle(spec) {
    if (typeof CANNON === 'undefined' || !this.world) return;
    this.activeSpec = spec || {};

    if (this.vehicle && this.vehicle.world) {
      this.vehicle.removeFromWorld(this.world);
    }
    if (this.chassisBody) {
      this.world.remove(this.chassisBody);
    }

    const dims = spec.dimensions || { width: 1.82, length: 4.25, height: 1.35 };
    const mass = spec.massKg || 1400;

    // Chassis Rigid Body with anti-wobble damping
    const halfExtents = new CANNON.Vec3(dims.width * 0.5, dims.height * 0.35, dims.length * 0.5);
    const chassisShape = new CANNON.Box(halfExtents);
    this.chassisBody = new CANNON.Body({ mass });
    this.chassisBody.addShape(chassisShape);
    this.chassisBody.linearDamping = 0.05;
    this.chassisBody.angularDamping = 0.5; // Quenches torsional oscillations and seesaw rocking

    // Initial Placement above local ground elevation
    let hSpawn = 0;
    if (window.PlanetRaceTerrain && window.PlanetRaceTerrain.getElevation) {
      hSpawn = window.PlanetRaceTerrain.getElevation({ x: 0, y: 0, z: 1 }, false);
    }
    this.chassisBody.position.set(0, 0, this.PLANET_RADIUS + hSpawn + this.RIDE_HEIGHT);
    this.chassisBody.quaternion.set(0.5, 0.5, 0.5, 0.5); // Maps Three.js basis to Cannon frame
    this.world.addBody(this.chassisBody);

    // Standard RaycastVehicle setup
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,   // Local X
      indexUpAxis: 1,      // Local Y
      indexForwardAxis: 2  // Local Z
    });

    // Proportional Spring Stiffness & Critical Damping (Tuned for Zero Jitter & Anti-Bottoming)
    const k = Math.max(15.0, this.g0 / 0.60);
    const dComp = Math.max(4.0, 1.2 * Math.sqrt(k));
    const dRel = dComp * 1.25;

    const wheelOptions = {
      radius: 0.35,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: k,
      suspensionRestLength: 0.52,
      frictionSlip: 3.5,
      dampingRelaxation: dRel,
      dampingCompression: dComp,
      maxSuspensionForce: 300000,
      rollInfluence: 0.05,
      axleLocal: new CANNON.Vec3(1, 0, 0),
      maxSuspensionTravel: 0.45,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    const wX = dims.width * 0.54;
    const wZ = dims.length * 0.32;

    // 0: FL, 1: FR, 2: RL, 3: RR
    this.vehicle.addWheel(Object.assign({}, wheelOptions, { chassisConnectionPointLocal: new CANNON.Vec3(wX, -0.1, wZ) }));
    this.vehicle.addWheel(Object.assign({}, wheelOptions, { chassisConnectionPointLocal: new CANNON.Vec3(-wX, -0.1, wZ) }));
    this.vehicle.addWheel(Object.assign({}, wheelOptions, { chassisConnectionPointLocal: new CANNON.Vec3(wX, -0.1, -wZ) }));
    this.vehicle.addWheel(Object.assign({}, wheelOptions, { chassisConnectionPointLocal: new CANNON.Vec3(-wX, -0.1, -wZ) }));

    this.vehicle.addToWorld(this.world);

    // 5. Procedural & Sculpted Ground Raycaster: Wheels track real 3D terrain height & slope
    const origCastRay = this.vehicle.castRay.bind(this.vehicle);
    const vVelPoint = new CANNON.Vec3();

    this.vehicle.castRay = (wheel) => {
      const origDist = origCastRay(wheel);
      // Let ramp / obstacle rigid bodies maintain priority
      if (wheel.raycastResult.body && wheel.raycastResult.body !== this.planetBody) {
        return origDist;
      }

      const pWorld = wheel.chassisConnectionPointWorld;
      const len = Math.hypot(pWorld.x, pWorld.y, pWorld.z);
      if (len < 1.0) return origDist;

      const nx = pWorld.x / len;
      const ny = pWorld.y / len;
      const nz = pWorld.z / len;

      let hTerrain = 0;
      if (window.PlanetRaceTerrain && window.PlanetRaceTerrain.getElevation) {
        hTerrain = window.PlanetRaceTerrain.getElevation({ x: nx, y: ny, z: nz }, false);
      }

      const groundR = this.PLANET_RADIUS + hTerrain;
      const distToGround = len - groundR;
      const rayMaxDist = wheel.suspensionRestLength + wheel.radius;

      if (distToGround <= rayMaxDist) {
        const effectiveDist = Math.max(0.01, distToGround);
        wheel.raycastResult.hasHit = true;
        wheel.raycastResult.body = this.planetBody;
        wheel.raycastResult.distance = effectiveDist;
        wheel.raycastResult.hitPointWorld.set(nx * groundR, ny * groundR, nz * groundR);

        // Exact Surface Normal from local terrain polygon gradient
        if (window.PlanetRaceTerrain && window.PlanetRaceTerrain.getSurfaceNormal && typeof THREE !== 'undefined') {
          const sNorm = window.PlanetRaceTerrain.getSurfaceNormal(new THREE.Vector3(nx, ny, nz));
          wheel.raycastResult.hitNormalWorld.set(sNorm.x, sNorm.y, sNorm.z);
        } else {
          wheel.raycastResult.hitNormalWorld.set(nx, ny, nz);
        }

        wheel.isInContact = true;
        wheel.suspensionLength = effectiveDist - wheel.radius;

        const minTravel = wheel.suspensionRestLength - wheel.maxSuspensionTravel;
        const maxTravel = wheel.suspensionRestLength + wheel.maxSuspensionTravel;
        if (wheel.suspensionLength < minTravel) wheel.suspensionLength = minTravel;
        if (wheel.suspensionLength > maxTravel) {
          wheel.suspensionLength = maxTravel;
          wheel.raycastResult.reset();
          wheel.isInContact = false;
          return -1;
        }

        // Relative Suspension Velocity & Contact Projection for Critical Damping
        const b = wheel.raycastResult.hitNormalWorld.dot(wheel.directionWorld);
        this.chassisBody.getVelocityAtWorldPoint(wheel.raycastResult.hitPointWorld, vVelPoint);
        const N = wheel.raycastResult.hitNormalWorld.dot(vVelPoint);
        if (b >= -0.1) {
          wheel.suspensionRelativeVelocity = 0;
          wheel.clippedInvContactDotSuspension = 10;
        } else {
          const g = -1 / b;
          wheel.suspensionRelativeVelocity = N * g;
          wheel.clippedInvContactDotSuspension = g;
        }
        return effectiveDist;
      } else {
        wheel.raycastResult.reset();
        wheel.suspensionLength = wheel.suspensionRestLength;
        wheel.suspensionRelativeVelocity = 0;
        wheel.clippedInvContactDotSuspension = 1;
        wheel.isInContact = false;
        return -1;
      }
    };
  },

  applyPreStepForces() {
    if (!this.chassisBody) return;

    const pos = this.chassisBody.position;
    const dist = pos.length();
    if (dist < 10.0) return;

    const normal = pos.unit();

    let hFloor = 0;
    if (window.PlanetRaceTerrain && window.PlanetRaceTerrain.getElevation) {
      hFloor = window.PlanetRaceTerrain.getElevation(normal, false);
    }

    // Absolute Floor Collision Safeguard: Follows real procedural & sculpted terrain surface
    const minDist = this.PLANET_RADIUS + hFloor + 0.40;
    if (dist < minDist) {
      pos.copy(normal.scale(minDist));
      const vRad = this.chassisBody.velocity.dot(normal);
      if (vRad < 0) {
        this.chassisBody.velocity.vsub(normal.scale(vRad), this.chassisBody.velocity);
      }
    }

    const gCur = this.g0 * Math.pow(this.PLANET_RADIUS / dist, 2);

    // 1. Radial Gravity towards (0, 0, 0) - Active on EVERY physics substep
    const fGravity = normal.scale(-this.chassisBody.mass * gCur);
    this.chassisBody.applyForce(fGravity, pos);

    // 2. Aerodynamic Downforce (Keeps chassis glued to road at high velocities)
    const curSpd = this.chassisBody.velocity.length();
    const frontalArea = (this.activeSpec && this.activeSpec.frontalArea) || 2.0;
    const downforce = 0.5 * 1.15 * frontalArea * curSpd * curSpd * 0.45;
    this.chassisBody.applyForce(normal.scale(-downforce), pos);

    // 3. Horizon Upright Stabilizer with Angular Damping (Prevents seesaw hopping)
    const localUp = this.chassisBody.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0));
    const tiltAxis = localUp.cross(normal);
    const uprightTorque = tiltAxis.scale(this.chassisBody.mass * 20.0);
    this.chassisBody.torque.vadd(uprightTorque, this.chassisBody.torque);
  },

  setGravity(key) {
    if (this.gravityPresets[key]) {
      this.currentGravityKey = key;
      this.setGravityG(this.gravityPresets[key].g / 9.81);
      return this.gravityPresets[key];
    }
    return this.gravityPresets[this.currentGravityKey];
  },

  setPlanetRadius(r) {
    this.PLANET_RADIUS = Math.max(30.0, Number(r) || 1000.0);
    if (this.planetShape && this.planetBody) {
      this.planetShape.radius = this.PLANET_RADIUS;
      this.planetShape.updateBoundingSphereRadius();
      this.planetBody.updateBoundingRadius();
      this.planetBody.aabbNeedsUpdate = true;
    }
    return this.PLANET_RADIUS;
  },

  setGravityG(gInG) {
    const gVal = Math.max(0.01, Number(gInG) || 1.0);
    this.g0 = gVal * 9.81;
    this.currentGravityKey = 'custom';

    // Auto-tune spring stiffness and damping across 4 wheels
    if (this.vehicle && this.vehicle.wheelInfos) {
      const k = Math.max(15.0, this.g0 / 0.60);
      const dComp = Math.max(4.0, 1.2 * Math.sqrt(k));
      const dRel = dComp * 1.25;
      this.vehicle.wheelInfos.forEach((w) => {
        w.suspensionStiffness = k;
        w.dampingCompression = dComp;
        w.dampingRelaxation = dRel;
      });
    }
    return this.g0;
  },

  registerColliders(colliders) {
    if (!this.world || !colliders || !colliders.length) return;

    this.rampBodies.forEach((rb) => this.world.remove(rb));
    this.rampBodies = [];

    colliders.forEach((c) => {
      if (c.isRamp && c.pos) {
        const rampBody = new CANNON.Body({ mass: 0 });
        rampBody.addShape(new CANNON.Box(new CANNON.Vec3(4.0, 0.6, 4.0)));
        rampBody.position.set(c.pos.x, c.pos.y, c.pos.z);
        if (c.quat) {
          rampBody.quaternion.set(c.quat.x, c.quat.y, c.quat.z, c.quat.w);
        }
        this.world.addBody(rampBody);
        this.rampBodies.push(rampBody);
      }
    });
  },

  respawn(state) {
    if (!this.chassisBody) return;
    let hSpawn = 0;
    if (window.PlanetRaceTerrain && window.PlanetRaceTerrain.getElevation) {
      hSpawn = window.PlanetRaceTerrain.getElevation({ x: 0, y: 0, z: 1 }, false);
    }
    const spawnR = this.PLANET_RADIUS + hSpawn + this.RIDE_HEIGHT;
    this.chassisBody.position.set(0, 0, spawnR);
    this.chassisBody.quaternion.set(0.5, 0.5, 0.5, 0.5);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);

    if (state) {
      state.position.set(0, 0, spawnR);
      state.quaternion.set(0.5, 0.5, 0.5, 0.5);
      state.velocity.set(0, 0, 0);
      state.steerAngle = 0;
      state.speedKmH = 0;
      state.tangentSpeedKmH = 0;
      state.isGrounded = true;
      state.isNitro = false;
      state.altitude = 0;
    }
  },

  getOrbitalSpeedKmH(radius) {
    const r = radius || this.PLANET_RADIUS;
    const gAtR = this.g0 * Math.pow(this.PLANET_RADIUS / r, 2);
    return Math.round(Math.sqrt(gAtR * r) * 3.6);
  },

  getEscapeSpeedKmH(radius) {
    return Math.round(this.getOrbitalSpeedKmH(radius) * Math.SQRT2);
  },

  step(state, spec, input, dt) {
    if (!this.isInitialized) {
      this.init(spec);
    }
    if (!this.chassisBody || !this.vehicle) return;
    this.activeSpec = spec || {};

    const pos = this.chassisBody.position;
    const dist = pos.length();

    // 1. Safety Core Clamp
    if (dist < 10.0) {
      this.respawn(state);
      return;
    }

    const curSpd = this.chassisBody.velocity.length();
    const gCur = this.g0 * Math.pow(this.PLANET_RADIUS / dist, 2);
    state.currentG = gCur / 9.81;

    // 2. Steering Input (Correct Sign: Left turns +Y/Left, Right turns -Y/Right)
    let steerInput = 0;
    if (input.left || input.touchLeft) steerInput += 1;
    if (input.right || input.touchRight) steerInput -= 1;

    const speedKmH = curSpd * 3.6;
    const steerDamping = 1.0 / (1.0 + Math.pow(speedKmH / 90.0, 1.4));
    const maxSteerRad = (spec.maxSteerAngleDeg || 32) * (Math.PI / 180);
    const minSteerRad = (spec.minSteerAngleDeg || 8) * (Math.PI / 180);
    const targetSteerAngle = steerInput * (minSteerRad + (maxSteerRad - minSteerRad) * steerDamping);

    state.steerAngle = (state.steerAngle || 0) + (targetSteerAngle - (state.steerAngle || 0)) * 14.0 * dt;
    this.vehicle.setSteeringValue(state.steerAngle, 0);
    this.vehicle.setSteeringValue(state.steerAngle, 1);

    // 3. Engine Throttle & Reverse Dynamics (4WD All-Wheel-Drive Traction)
    const isThrottle = !!(input.up || input.touchThrottle);
    const isReverse = !!(input.down || input.touchBrake);
    const isHandbrake = !!(input.handbrake || input.touchHandbrake);
    const isNitro = !!(input.nitro || input.touchNitro);
    state.isNitro = isNitro;

    const drivePower = spec.powerWatts || 180000;
    const effSpeed = Math.max(curSpd, 3.0);
    let engineForce = 0;

    if (isThrottle) {
      const thrust = Math.min((drivePower / effSpeed) * 0.20, this.chassisBody.mass * 6.5);
      engineForce = -thrust * 0.5; // Distributed across wheels (negative is forward)
    } else if (isReverse) {
      const revThrust = Math.min((drivePower * 0.45 / effSpeed) * 0.20, this.chassisBody.mass * 3.5);
      engineForce = revThrust * 0.5;
    }

    // Nitro Rocket Boost
    if (isNitro) {
      engineForce *= 2.0;
      const nitroWatts = spec.nitroWatts || 320000;
      const nitroThrust = Math.min((nitroWatts / Math.max(curSpd, 4.0)) * 0.25, this.chassisBody.mass * 15.0);
      const fwd = this.chassisBody.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
      this.chassisBody.applyForce(fwd.scale(nitroThrust), pos);
    }

    // 4WD Traction Drive: Apply engine power to all 4 wheels for instant acceleration
    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(engineForce, i);
    }

    // 4. Braking System
    let brakeForce = 0;
    if (isHandbrake) {
      brakeForce = 90;
    } else if (isReverse && curSpd > 2.0 && this.chassisBody.velocity.dot(this.chassisBody.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1))) > 0.5) {
      brakeForce = 55;
    }

    for (let i = 0; i < 4; i++) {
      this.vehicle.setBrake(brakeForce, i);
    }
    state.isBraking = brakeForce > 0;

    // 5. Physics Substep Advance
    const subDt = Math.min(dt, 0.05);
    this.world.step(1/60, subDt, 3);

    // 6. Synchronize State with Three.js
    state.position.set(this.chassisBody.position.x, this.chassisBody.position.y, this.chassisBody.position.z);
    state.quaternion.set(
      this.chassisBody.quaternion.x,
      this.chassisBody.quaternion.y,
      this.chassisBody.quaternion.z,
      this.chassisBody.quaternion.w
    );
    state.velocity.set(this.chassisBody.velocity.x, this.chassisBody.velocity.y, this.chassisBody.velocity.z);

    const speedMps = this.chassisBody.velocity.length();
    state.speedKmH = Math.round(speedMps * 3.6);
    state.tangentSpeedKmH = state.speedKmH;

    // Normal force & Ground contact telemetry
    let totalSuspensionForce = 0;
    let groundContactCount = 0;
    this.vehicle.wheelInfos.forEach((w) => {
      totalSuspensionForce += (w.suspensionForce || 0);
      if (w.isInContact) groundContactCount++;
    });

    state.normalForce = totalSuspensionForce;
    state.isGrounded = groundContactCount > 0;

    let hCenter = 0;
    if (window.PlanetRaceTerrain && window.PlanetRaceTerrain.getElevation) {
      const normal = pos.unit();
      hCenter = window.PlanetRaceTerrain.getElevation(normal, false);
    }
    state.altitude = Math.max(0, dist - (this.PLANET_RADIUS + hCenter) - this.RIDE_HEIGHT);
  }
};
