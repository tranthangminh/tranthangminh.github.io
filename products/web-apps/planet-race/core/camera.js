/**
 * Planet Race - Spherical Orbit & Interactive Chase Camera Controller
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceCamera = {
  camera: null,
  domElement: null,
  mode: 0, // 0: Chase Cam (3rd), 1: Satellite View (Top), 2: Hood FPV (1st)
  currentUp: new THREE.Vector3(0, 0, 1),
  targetPos: new THREE.Vector3(),
  lookTarget: new THREE.Vector3(),
  isSnapped: false,

  // Mouse Interaction State
  yawOffset: 0,       // Orbital horizontal angle (radians)
  pitchOffset: 0,     // Orbital vertical tilt (radians)
  zoomFactor: 1.0,    // Zoom multiplier (Top view only)
  idleTimer: 0,       // Timer tracking seconds of inactivity
  isInteracting: false,
  isMouseDown: false,
  lastMouseX: 0,
  lastMouseY: 0,
  hasBoundEvents: false,
  peekYaw: 0,         // Q/E peeking yaw angle (-PI/2: Left, +PI/2: Right, PI: Rear)

  init(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document.getElementById('canvasContainer') || window;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.isSnapped = false;
    this.resetOffsets();

    if (!this.hasBoundEvents) {
      this.bindMouseEvents();
      this.hasBoundEvents = true;
    }
  },

  resetOffsets() {
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.zoomFactor = 1.0;
    this.idleTimer = 0;
    this.isInteracting = false;
    this.peekYaw = 0;
  },

  switchMode() {
    this.mode = (this.mode + 1) % 3;
    this.resetOffsets();
    this.isSnapped = false;
    return this.mode;
  },

  resetSnap() {
    this.isSnapped = false;
    this.resetOffsets();
  },

  bindMouseEvents() {
    const target = this.domElement;

    // 1. Mouse Drag & Movement
    window.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('.app-header, .cosmic-sidebar, .showroom-overlay, .touch-controls')) {
        return;
      }
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      // Free camera on mouse move is strictly reserved for Top View (Mode 1) per user rule
      if (this.mode !== 1) return;

      // Don't intercept when interacting with UI sidebars/menus
      if (e.target && e.target.closest && e.target.closest('.app-header, .cosmic-sidebar, .showroom-overlay, .touch-controls')) {
        return;
      }

      // Supports active drag and free mouse navigation on canvas in Top View
      const dx = (e.movementX !== undefined && Math.abs(e.movementX) < 150)
        ? e.movementX
        : (e.clientX - this.lastMouseX);
      const dy = (e.movementY !== undefined && Math.abs(e.movementY) < 150)
        ? e.movementY
        : (e.clientY - this.lastMouseY);

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        const sens = 0.0035;
        this.yawOffset -= dx * sens;
        this.pitchOffset -= dy * sens;
        this.pitchOffset = Math.max(-0.80, Math.min(0.80, this.pitchOffset));

        // Active interaction detected: Reset 3s idle counter
        this.idleTimer = 0;
        this.isInteracting = true;
      }
    });

    // 2. Mouse Wheel Zoom (Top View Mode 1 only per user rule)
    window.addEventListener('wheel', (e) => {
      if (this.mode !== 1) return;

      if (e.target && e.target.closest && e.target.closest('.cosmic-sidebar, .showroom-sidebar')) {
        return; // Allow natural scrolling inside sidebars
      }

      const delta = e.deltaY * 0.0012;
      this.zoomFactor = Math.max(0.40, Math.min(3.20, this.zoomFactor + delta));
    }, { passive: false });
  },

  update(car, dt) {
    if (!this.camera || !car || !car.mesh) return;

    const carPos = car.state.position;
    const q = car.state.quaternion;
    const spd = car.state.speedKmH || 0;

    // 1. Q / E Peeking Input: Q = Left, E = Right, Q + E = Look Behind (Modes 0 & 2)
    const keys = window.PlanetRaceApp?.keys || {};
    const lookLeft = !!keys.lookLeft;
    const lookRight = !!keys.lookRight;

    let targetPeek = 0;
    if (lookLeft && lookRight) {
      targetPeek = Math.PI; // Rear-view (180 deg)
    } else if (lookLeft) {
      targetPeek = -Math.PI * 0.5; // Left-view (90 deg)
    } else if (lookRight) {
      targetPeek = Math.PI * 0.5; // Right-view (90 deg)
    }

    this.peekYaw += (targetPeek - this.peekYaw) * Math.min(1.0, 16.0 * dt);

    // 2. Idle Auto-Reset: Only active in Top View (Mode 1)
    if (this.mode === 1 && this.isInteracting) {
      this.idleTimer += dt;
      if (this.idleTimer >= 3.0) {
        const returnLerp = Math.min(1.0, 3.2 * dt);
        this.yawOffset += (0 - this.yawOffset) * returnLerp;
        this.pitchOffset += (0 - this.pitchOffset) * returnLerp;

        if (Math.abs(this.yawOffset) < 0.001 && Math.abs(this.pitchOffset) < 0.001) {
          this.yawOffset = 0;
          this.pitchOffset = 0;
          this.isInteracting = false;
        }
      }
    }

    // 3. Planet Center Radial Normal (Horizon anchor)
    const planetNormal = carPos.clone().normalize();

    // 4. Project Car Forward Tangent perpendicular to planetNormal
    const rotM = new THREE.Matrix4().makeRotationFromQuaternion(q);
    const carFwd = new THREE.Vector3().setFromMatrixColumn(rotM, 2).normalize();
    const tangentFwd = carFwd.clone().sub(planetNormal.clone().multiplyScalar(carFwd.dot(planetNormal))).normalize();
    if (tangentFwd.lengthSq() < 0.001) {
      tangentFwd.copy(carFwd);
    }
    const tangentRight = new THREE.Vector3().crossVectors(planetNormal, tangentFwd).normalize();

    // 5. Dynamic Speed FOV Warp Effect
    const baseFov = 60;
    if (spd > 120 || car.state.isNitro) {
      const targetFov = baseFov + Math.min((spd - 120) * 0.045 + (car.state.isNitro ? 8 : 0), 22);
      this.camera.fov += (targetFov - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
    } else if (this.camera.fov > 60.1) {
      this.camera.fov += (60 - this.camera.fov) * 0.08;
      this.camera.updateProjectionMatrix();
    }

    // 6. Camera Positioning Modes
    if (this.mode === 0) {
      // --- MODE 0: 3RD PERSON CHASE CAM (Q: Left, E: Right, Q+E: Rear-view) ---
      const baseDist = 8.5;
      const baseHeight = 3.6;

      // Orbit horizontal direction around vehicle up normal with peek
      const cosYaw = Math.cos(this.peekYaw);
      const sinYaw = Math.sin(this.peekYaw);
      const orbitDir = tangentFwd.clone().multiplyScalar(cosYaw).addScaledVector(tangentRight, sinYaw).normalize();

      this.targetPos.copy(carPos)
        .addScaledVector(orbitDir, -baseDist)
        .addScaledVector(planetNormal, baseHeight);

      this.lookTarget.copy(carPos)
        .addScaledVector(orbitDir, 4.0)
        .addScaledVector(planetNormal, 1.1);

      if (!this.isSnapped) {
        this.camera.position.copy(this.targetPos);
        this.currentUp.copy(planetNormal);
        this.camera.up.copy(this.currentUp);
        this.camera.lookAt(this.lookTarget);
        this.isSnapped = true;
      } else {
        this.camera.position.lerp(this.targetPos, Math.min(1.0, 14.0 * dt));
        this.currentUp.lerp(planetNormal, Math.min(1.0, 14.0 * dt)).normalize();
        this.camera.up.copy(this.currentUp);
        this.camera.lookAt(this.lookTarget);
      }

    } else if (this.mode === 1) {
      // --- MODE 1: SATELLITE GLOBAL PLANET VIEW (Top View: Free Mouse Orbit + Scroll Zoom + 3s Reset) ---
      const R = window.PlanetRacePhysics ? window.PlanetRacePhysics.PLANET_RADIUS : 1000.0;
      const normal = carPos.clone().normalize();
      const zoomDist = Math.max(120, R * 2.2) * this.zoomFactor;

      // Orbit satellite vector around vehicle/planet
      const satDir = normal.clone();
      satDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yawOffset);
      satDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitchOffset);

      this.targetPos.copy(satDir).multiplyScalar(zoomDist).add(new THREE.Vector3(0, R * 0.35, 0));
      this.camera.position.lerp(this.targetPos, Math.min(1.0, 6.0 * dt));
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 0, 0);

    } else {
      // --- MODE 2: HOOD FPV CAM (1st Person: Q: Left, E: Right, Q+E: Rear-view) ---
      const hoodOffset = 1.6;
      this.targetPos.copy(carPos)
        .addScaledVector(tangentFwd, hoodOffset)
        .addScaledVector(planetNormal, 1.25);

      this.camera.position.copy(this.targetPos);
      this.camera.up.copy(planetNormal);

      const cosYaw = Math.cos(this.peekYaw);
      const sinYaw = Math.sin(this.peekYaw);
      const lookDir = tangentFwd.clone().multiplyScalar(cosYaw)
        .addScaledVector(tangentRight, sinYaw)
        .normalize();

      this.lookTarget.copy(this.targetPos).addScaledVector(lookDir, 28.0);
      this.camera.lookAt(this.lookTarget);
    }
  }
};
