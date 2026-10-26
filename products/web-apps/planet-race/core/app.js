/**
 * Planet Race - Master Game Controller & Render Loop
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceApp = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  currentMode: 'game', // 'game' or 'showroom'

  keys: {
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false,
    nitro: false,
    lookLeft: false,
    lookRight: false,
    touchThrottle: false,
    touchBrake: false,
    touchLeft: false,
    touchRight: false,
    touchHandbrake: false,
    touchNitro: false
  },

  init() {
    const container = document.getElementById('canvasContainer');
    if (!container || !window.THREE) return;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913); // Deep cosmic void
    this.scene.fog = new THREE.FogExp2(0x060913, 0.00008);

    // 2. Camera Setup (Scale far plane to 16,000m for 1km planet visibility)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 16000);
    this.camera.position.set(0, 35, 1020);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Initialize Subsystems
    if (window.PlanetRaceSpace) {
      window.PlanetRaceSpace.init(this.scene);
    }
    if (window.PlanetRaceWorld) {
      window.PlanetRaceWorld.createWorld(this.scene);
    }
    if (window.PlanetRaceCar) {
      window.PlanetRaceCar.init(this.scene, 'player_sport');
    }
    if (window.PlanetRaceCamera) {
      window.PlanetRaceCamera.init(this.camera, container);
    }
    if (window.PlanetRaceAudio) {
      window.PlanetRaceAudio.init();
    }
    if (window.PlanetRaceHUD) {
      window.PlanetRaceHUD.init();
    }

    // 5. Input & Events
    this.clock = new THREE.Clock();
    this.bindEvents();
    this.setupTouchControls();
    window.addEventListener('resize', () => this.onResize());

    // 6. Start 60 FPS Render Loop
    this.animate();
  },

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.handleKey(e.code, true);

      // Start audio on first key press
      if (window.PlanetRaceAudio) {
        window.PlanetRaceAudio.startEngine();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });

    // Reset Button
    const resetBtn = document.getElementById('btnResetCar');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (window.PlanetRaceCar) window.PlanetRaceCar.respawn();
        if (window.PlanetRaceCamera) window.PlanetRaceCamera.resetSnap();
      });
    }

    // Camera Switch Button
    const camBtn = document.getElementById('btnSwitchCam');
    if (camBtn) {
      camBtn.addEventListener('click', () => {
        if (window.PlanetRaceCamera) window.PlanetRaceCamera.switchMode();
      });
    }

    // Audio Mute Button
    const muteBtn = document.getElementById('btnToggleAudio');
    if (muteBtn && window.PlanetRaceAudio) {
      muteBtn.addEventListener('click', () => {
        const muted = window.PlanetRaceAudio.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
      });
    }

    // Showroom Toggle Buttons
    const showroomBtn = document.getElementById('btnToggleShowroom');
    if (showroomBtn) {
      showroomBtn.addEventListener('click', () => this.toggleShowroom());
    }

    const exitShowroomBtn = document.getElementById('btnExitShowroom');
    if (exitShowroomBtn) {
      exitShowroomBtn.addEventListener('click', () => this.toggleShowroom());
    }
  },

  toggleShowroom() {
    this.currentMode = (this.currentMode === 'game') ? 'showroom' : 'game';
    const isShowroom = (this.currentMode === 'showroom');

    const appHeader = document.querySelector('.app-header');
    const showroomUI = document.getElementById('showroomUI');
    const toggleBtn = document.getElementById('btnToggleShowroom');
    const cosmicSidebar = document.getElementById('cosmicSidebar');
    const telemetryCard = document.querySelector('.telemetry-card');
    const speedometer = document.querySelector('.hud-speedometer');
    const hints = document.querySelector('.control-hints');
    const touchCtrl = document.querySelector('.touch-controls');

    if (isShowroom) {
      if (showroomUI) showroomUI.style.display = 'flex';
      if (appHeader) appHeader.style.display = 'none'; // Hide main game header to prevent overlap!
      if (toggleBtn) toggleBtn.textContent = '🏎️ VÀO ĐUA XE';
      if (cosmicSidebar) cosmicSidebar.style.display = 'none';
      if (telemetryCard) telemetryCard.style.display = 'none';
      if (speedometer) speedometer.style.display = 'none';
      if (hints) hints.style.display = 'none';
      if (touchCtrl) touchCtrl.style.display = 'none';

      if (window.PlanetRaceWorld?.planetGroup) window.PlanetRaceWorld.planetGroup.visible = false;
      if (window.PlanetRaceCar?.mesh) window.PlanetRaceCar.mesh.visible = false;

      this.camera.up.set(0, 1, 0); // Strict Y-up vertical axis for studio turntable!

      if (window.PlanetRaceShowroom) {
        window.PlanetRaceShowroom.init(this.scene, document.getElementById('canvasContainer'));
        if (window.PlanetRaceShowroom.studioGroup) {
          window.PlanetRaceShowroom.studioGroup.visible = true;
        }
      }
    } else {
      if (showroomUI) showroomUI.style.display = 'none';
      if (appHeader) appHeader.style.display = 'flex'; // Restore main game header!
      if (toggleBtn) toggleBtn.textContent = '🏛️ SHOWROOM';
      if (cosmicSidebar) cosmicSidebar.style.display = '';
      if (telemetryCard) telemetryCard.style.display = '';
      if (speedometer) speedometer.style.display = '';
      if (hints) hints.style.display = '';
      if (touchCtrl) touchCtrl.style.display = '';

      if (window.PlanetRaceWorld?.planetGroup) window.PlanetRaceWorld.planetGroup.visible = true;
      if (window.PlanetRaceCar?.mesh) window.PlanetRaceCar.mesh.visible = true;

      if (window.PlanetRaceShowroom?.studioGroup) {
        window.PlanetRaceShowroom.studioGroup.visible = false;
      }
      if (window.PlanetRaceCamera) {
        window.PlanetRaceCamera.resetSnap();
      }
    }
  },

  handleKey(code, isDown) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.up = isDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.down = isDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = isDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = isDown;
        break;
      case 'Space':
        this.keys.handbrake = isDown;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.nitro = isDown;
        break;
      case 'KeyQ':
        this.keys.lookLeft = isDown;
        break;
      case 'KeyE':
        this.keys.lookRight = isDown;
        break;
      case 'KeyR':
        if (isDown) {
          if (window.PlanetRaceCar) window.PlanetRaceCar.respawn();
          if (window.PlanetRaceCamera) window.PlanetRaceCamera.resetSnap();
        }
        break;
      case 'KeyC':
        if (isDown && window.PlanetRaceCamera) window.PlanetRaceCamera.switchMode();
        break;
      case 'KeyH':
        if (isDown && window.PlanetRaceAudio) window.PlanetRaceAudio.playHorn();
        break;
    }
  },

  setupTouchControls() {
    const bindTouch = (id, keyName) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys[keyName] = true;
        if (window.PlanetRaceAudio) window.PlanetRaceAudio.startEngine();
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
      });
      btn.addEventListener('touchcancel', () => {
        this.keys[keyName] = false;
      });
    };

    bindTouch('touchGas', 'touchThrottle');
    bindTouch('touchBrake', 'touchBrake');
    bindTouch('touchLeft', 'touchLeft');
    bindTouch('touchRight', 'touchRight');
    bindTouch('touchBoost', 'touchNitro');
    bindTouch('touchHandbrake', 'touchHandbrake');

    const hornBtn = document.getElementById('touchHorn');
    if (hornBtn && window.PlanetRaceAudio) {
      hornBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.PlanetRaceAudio.playHorn();
      });
    }
  },

  onResize() {
    const container = document.getElementById('canvasContainer');
    if (!container || !this.camera || !this.renderer) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.currentMode === 'showroom') {
      if (window.PlanetRaceShowroom) {
        window.PlanetRaceShowroom.update(dt, this.camera);
      }
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Cosmic Skybox Rotation & Focused Sun Tracking
    if (window.PlanetRaceSpace) {
      const carPos = window.PlanetRaceCar ? window.PlanetRaceCar.state.position : null;
      window.PlanetRaceSpace.update(dt, carPos);
    }

    // 2. Vehicle Physics & Motion
    if (window.PlanetRaceCar) {
      const colliders = window.PlanetRaceWorld ? window.PlanetRaceWorld.colliders : [];
      window.PlanetRaceCar.update(dt, this.keys, colliders);

      // 3. Camera Tracking
      if (window.PlanetRaceCamera) {
        window.PlanetRaceCamera.update(window.PlanetRaceCar, dt);
      }

      // 4. HUD Dashboard
      if (window.PlanetRaceHUD) {
        window.PlanetRaceHUD.update(window.PlanetRaceCar);
      }
    }

    // 5. Render Three.js Scene
    this.renderer.render(this.scene, this.camera);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.PlanetRaceApp.init();
});
