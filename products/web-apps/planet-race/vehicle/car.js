/**
 * Planet Race - Player Vehicle 3D Model & Dynamic Driving Entity
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceCar = {
  mesh: null,
  wheels: [],
  tailLights: [],
  nitroFlames: [],
  headlights: [],
  spec: null,
  rampCooldown: 0,

  // Vehicle Kinematic State
  state: {
    position: new THREE.Vector3(0, 0, 1000.68), // Spawn on Equator surface (1km radius)
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(),
    steerAngle: 0,
    speedKmH: 0,
    tangentSpeedKmH: 0,
    isGrounded: true,
    isNitro: false,
    isBraking: false,
    altitude: 0,
    normalForce: 0,
    centrifugalAcc: 0,
    currentG: 10.0,
    health: 100
  },

  init(scene, specId = 'player_sport') {
    this.applyProfile(specId);
    this.createModel(scene);
    this.respawn();
  },

  applyProfile(specId) {
    if (!window.PlanetRaceVehicleSpecs) return;
    this.spec = window.PlanetRaceVehicleSpecs.getTunedProfile(specId);
    if (window.PlanetRacePhysics && window.PlanetRacePhysics.buildVehicle) {
      window.PlanetRacePhysics.buildVehicle(this.spec);
    }
    if (this.mesh) {
      // Re-color car body if mesh exists
      const bodyMesh = this.mesh.getObjectByName('carBody');
      if (bodyMesh && bodyMesh.material) {
        bodyMesh.material.color.setHex(this.spec.color || 0xd63031);
      }
    }
  },

  createStandaloneMesh(specId = 'player_sport') {
    const spec = window.PlanetRaceVehicleSpecs ? window.PlanetRaceVehicleSpecs.getTunedProfile(specId) : {};
    const dims = spec.dimensions || { width: 1.82, length: 4.25, height: 1.35 };
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: spec.color || 0xd63031,
      roughness: 0.28,
      metalness: 0.65
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(dims.width, dims.height * 0.45, dims.length), bodyMat);
    body.position.y = dims.height * 0.38;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width * 0.82, dims.height * 0.42, dims.length * 0.52),
      new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.1, metalness: 0.9 })
    );
    cabin.position.set(0, dims.height * 0.72, -dims.length * 0.04);
    cabin.castShadow = true;
    group.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });
    const wX = dims.width * 0.54;
    const wY = 0.35;
    const wZ = dims.length * 0.32;
    [[-wX, wY, wZ], [wX, wY, wZ], [-wX, wY, -wZ], [wX, wY, -wZ]].forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, y, z);
      group.add(w);
    });

    return group;
  },

  createModel(scene) {
    if (this.mesh) scene.remove(this.mesh);

    const carGroup = new THREE.Group();
    const dims = this.spec.dimensions || { width: 1.82, length: 4.25, height: 1.35 };

    // 1. Lower Body Chassis
    const bodyGeo = new THREE.BoxGeometry(dims.width, dims.height * 0.45, dims.length);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.spec.color || 0xd63031,
      roughness: 0.28,
      metalness: 0.65
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'carBody';
    body.position.y = dims.height * 0.38;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Front Aerodynamic Splitter Bumper
    const bumperGeo = new THREE.BoxGeometry(dims.width * 0.95, dims.height * 0.25, 0.9);
    const bumperMat = new THREE.MeshLambertMaterial({ color: 0x1e272e });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, dims.height * 0.2, dims.length * 0.48);
    carGroup.add(bumper);

    // 2. Tinted Glass Cabin Cockpit
    const cabinGeo = new THREE.BoxGeometry(dims.width * 0.82, dims.height * 0.45, dims.length * 0.52);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x11141a,
      roughness: 0.1,
      metalness: 0.9
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, dims.height * 0.82, -dims.length * 0.05);
    carGroup.add(cabin);

    // 3. Headlights & Night Spotlights
    this.headlights = [];
    const lightGeo = new THREE.BoxGeometry(0.35, 0.16, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });

    [-dims.width * 0.38, dims.width * 0.38].forEach((xOff) => {
      const hl = new THREE.Mesh(lightGeo, lightMat);
      hl.position.set(xOff, dims.height * 0.42, dims.length * 0.51);
      carGroup.add(hl);

      // Night Spotlight Projector (Casting light onto dark side of planet)
      const spot = new THREE.SpotLight(0xfff7c2, 1.4, 45, Math.PI / 6, 0.4);
      spot.position.set(xOff, dims.height * 0.42, dims.length * 0.51);
      spot.target.position.set(xOff, 0, dims.length * 0.51 + 18);
      carGroup.add(spot);
      carGroup.add(spot.target);
      this.headlights.push({ mesh: hl, spot });
    });

    // 4. Taillights (Red LED Strips)
    this.tailLights = [];
    const tailGeo = new THREE.BoxGeometry(0.42, 0.14, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    [-dims.width * 0.38, dims.width * 0.38].forEach((xOff) => {
      const tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(xOff, dims.height * 0.45, -dims.length * 0.51);
      carGroup.add(tl);
      this.tailLights.push(tl);
    });

    // 5. Wheels (Diameter ~0.70m, radius 0.35m, axle along local X)
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2); // Permanently orient cylinder along X-axis (axle)

    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.29, 8);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xdcdde1 });

    const wheelOffsets = [
      { x: -dims.width * 0.52, z: dims.length * 0.32, isFront: true },
      { x: dims.width * 0.52, z: dims.length * 0.32, isFront: true },
      { x: -dims.width * 0.52, z: -dims.length * 0.32, isFront: false },
      { x: dims.width * 0.52, z: -dims.length * 0.32, isFront: false }
    ];

    wheelOffsets.forEach((pos) => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(pos.x, 0.35, pos.z);

      // Spinner group rolls forward around local X axis
      const spinner = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      spinner.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      spinner.add(rim);

      wheelHub.add(spinner);
      carGroup.add(wheelHub);
      this.wheels.push({ hub: wheelHub, spinner, isFront: pos.isFront });
    });

    // 6. Dual Cyan Nitro Rocket Exhausts
    this.nitroFlames = [];
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.35, 10);
    const nozzleMat = new THREE.MeshLambertMaterial({ color: 0x2d3436 });
    const flameGeo = new THREE.ConeGeometry(0.18, 1.6, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 }); // Cyan plasma flame

    [-0.38, 0.38].forEach((xOff) => {
      const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(xOff, dims.height * 0.32, -dims.length * 0.52);
      carGroup.add(nozzle);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.rotation.x = -Math.PI / 2; // Point rearward
      flame.position.set(xOff, dims.height * 0.32, -dims.length * 0.52 - 0.9);
      flame.visible = false;
      carGroup.add(flame);
      this.nitroFlames.push(flame);
    });

    scene.add(carGroup);
    this.mesh = carGroup;
    return carGroup;
  },

  respawn() {
    if (window.PlanetRacePhysics && window.PlanetRacePhysics.respawn) {
      window.PlanetRacePhysics.respawn(this.state);
    } else {
      const R = window.PlanetRacePhysics ? window.PlanetRacePhysics.PLANET_RADIUS : 1000.0;
      const h = window.PlanetRacePhysics ? window.PlanetRacePhysics.RIDE_HEIGHT : 0.68;
      const groundR = R + h;
      this.state.position.set(0, 0, groundR);
      this.state.velocity.set(0, 0, 0);
      const forward = new THREE.Vector3(1, 0, 0);
      const normal = new THREE.Vector3(0, 0, 1);
      const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
      const m = new THREE.Matrix4().makeBasis(right, normal, forward);
      this.state.quaternion.setFromRotationMatrix(m);
      this.state.steerAngle = 0;
      this.state.speedKmH = 0;
      this.state.tangentSpeedKmH = 0;
      this.state.isGrounded = true;
      this.state.isNitro = false;
      this.state.altitude = 0;
    }

    this.state.health = 100;
    this.rampCooldown = 0;

    if (this.mesh) {
      this.mesh.position.copy(this.state.position);
      this.mesh.quaternion.copy(this.state.quaternion);
    }
  },

  update(dt, input, colliders) {
    if (!this.mesh || !window.PlanetRacePhysics) return;

    // 1. Advance Physics Step
    window.PlanetRacePhysics.step(this.state, this.spec, input, dt);

    // 2. Synchronize 3D Mesh
    this.mesh.position.copy(this.state.position);
    this.mesh.quaternion.copy(this.state.quaternion);

    // 3. Wheel Spin & Steering Rotation
    const fwdVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.state.quaternion);
    const forwardSpeed = this.state.velocity.dot(fwdVec);
    const wheelRoll = (forwardSpeed / 0.35) * dt;

    this.wheels.forEach((w) => {
      // Clean forward rolling around local X-axis (axle)
      w.spinner.rotation.x += wheelRoll;
      // Front wheel steer pivot around local Y-axis
      if (w.isFront) {
        w.hub.rotation.y = this.state.steerAngle;
      }
    });

    // 4. Nitro Booster Flames & Audio
    if (this.state.isNitro) {
      this.nitroFlames.forEach((flame) => {
        flame.visible = true;
        flame.scale.set(1.0 + Math.random() * 0.4, 1.2 + Math.random() * 0.8, 1.0 + Math.random() * 0.4);
      });
      if (window.PlanetRaceAudio?.startNitro) window.PlanetRaceAudio.startNitro();
    } else {
      this.nitroFlames.forEach((flame) => (flame.visible = false));
      if (window.PlanetRaceAudio?.stopNitro) window.PlanetRaceAudio.stopNitro();
    }

    // 5. Engine Sound Pitch Modulation
    if (window.PlanetRaceAudio?.updateEngine) {
      window.PlanetRaceAudio.updateEngine(this.state.speedKmH, this.spec.nominalTopKmH || 250);
    }

    // 6. Check Obstacle Collisions
    if (this.rampCooldown > 0) {
      this.rampCooldown -= dt;
    }

    if (colliders && colliders.length) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        const dist = this.state.position.distanceTo(c.pos);
        if (dist < c.radius + 1.2) {
          if (c.isRamp) {
            // One-shot launch kick with 2.0s cooldown (strictly prevents infinite velocity loop)
            if (this.rampCooldown <= 0) {
              const normal = this.state.position.clone().normalize();
              const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.state.quaternion);
              this.state.velocity.addScaledVector(normal, 18.0).addScaledVector(fwd, 6.0);
              if (window.PlanetRacePhysics?.chassisBody) {
                window.PlanetRacePhysics.chassisBody.velocity.set(
                  this.state.velocity.x,
                  this.state.velocity.y,
                  this.state.velocity.z
                );
              }
              this.state.isGrounded = false;
              this.rampCooldown = 2.0;
              if (window.PlanetRaceAudio?.playCrash) window.PlanetRaceAudio.playCrash();
            }
          } else if (this.state.isGrounded) {
            // Solid Obstacle: Bounce back and scrub speed
            const pushDir = this.state.position.clone().sub(c.pos).normalize();
            this.state.position.addScaledVector(pushDir, 0.8);
            this.state.velocity.reflect(pushDir).multiplyScalar(0.4);
            if (window.PlanetRacePhysics?.chassisBody) {
              window.PlanetRacePhysics.chassisBody.position.set(
                this.state.position.x,
                this.state.position.y,
                this.state.position.z
              );
              window.PlanetRacePhysics.chassisBody.velocity.set(
                this.state.velocity.x,
                this.state.velocity.y,
                this.state.velocity.z
              );
            }
            if (window.PlanetRaceAudio?.playCrash) window.PlanetRaceAudio.playCrash();
            break;
          }
        }
      }
    }
  }
};
