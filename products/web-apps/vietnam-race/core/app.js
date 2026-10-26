/**
 * Vietnam Race - Main Controller & Game Loop
 * Conforms to: products/web-apps/_RULE-web-apps.md
 */
window.VietnamRaceApp = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  // Mode & Camera Settings
  currentMode: 'saigon', // 'saigon' or 'showroom'
  saigonWorldGroup: null,
  cameraMode: 0, // 0: Chase, 1: Top-down, 2: Hood FPV
  camOffset: new THREE.Vector3(),
  camLookAt: new THREE.Vector3(),

  // Input State
  keys: {
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false,
    nitro: false,
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

    // 1. Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe3f7); // Tropical Saigon Sunny Sky
    this.scene.fog = new THREE.FogExp2(0xbfe3f7, 0.0022);

    // 2. Camera Setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1500);
    this.camera.position.set(0, 15, -65);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting (Saigon Sunlight)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
    sunLight.position.set(200, 350, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    const d = 120;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // 5. Build Saigon Map & Player Car
    if (window.VietnamRaceMap) {
      this.saigonWorldGroup = window.VietnamRaceMap.createWorld(this.scene);
    }
    if (window.VietnamRaceCar) {
      window.VietnamRaceCar.createCar(this.scene);
    }
    // AI Traffic Simulation
    if (window.VietnamRaceTraffic) {
      window.VietnamRaceTraffic.init(this.scene);
    }
    // Real Map OSM / GeoJSON Loader
    if (window.VietnamRaceOsmLoader) {
      window.VietnamRaceOsmLoader.init(this.scene);
    }

    // 6. Audio Engine Init
    if (window.VietnamRaceAudio) {
      window.VietnamRaceAudio.init();
    }

    // 7. Event Listeners & Resize
    this.clock = new THREE.Clock();
    this.bindEvents();
    this.setupTouchControls();
    window.addEventListener('resize', () => this.onResize());

    // 8. Start Loop
    this.animate();
  },

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.handleKey(e.code, true);

      // Audio engine start on first user interaction
      if (window.VietnamRaceAudio) {
        window.VietnamRaceAudio.startEngine();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });

    // Language Toggle
    const langBtn = document.getElementById('langFlagBtn');
    if (langBtn && window.VietnamRaceI18n) {
      langBtn.addEventListener('click', () => window.VietnamRaceI18n.toggle());
    }

    // Audio Toggle
    const muteBtn = document.getElementById('audioToggleBtn');
    if (muteBtn && window.VietnamRaceAudio) {
      muteBtn.addEventListener('click', () => {
        const isMuted = window.VietnamRaceAudio.toggleMute();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Camera Switch Button
    const camBtn = document.getElementById('btnSwitchCam');
    if (camBtn) {
      camBtn.addEventListener('click', () => this.switchCamera());
    }

    // Reset Car Button
    const resetBtn = document.getElementById('btnResetCar');
    if (resetBtn && window.VietnamRaceCar) {
      resetBtn.addEventListener('click', () => window.VietnamRaceCar.respawn());
    }

    // Showroom / Saigon Mode Toggle Button
    const modeBtn = document.getElementById('btnModeToggle');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => this.toggleMode());
    }

    // Direct URL parameter support (?mode=showroom)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'showroom') {
      this.toggleMode();
    }
  },

  toggleMode() {
    this.currentMode = (this.currentMode === 'saigon') ? 'showroom' : 'saigon';
    const modeBtn = document.getElementById('btnModeToggle');
    const hudLayer = document.querySelector('.hud-layer');
    const touchLayer = document.querySelector('.touch-controls');
    const showroomUI = document.getElementById('showroomUI');

    if (this.currentMode === 'showroom') {
      if (this.saigonWorldGroup) this.saigonWorldGroup.visible = false;
      if (window.VietnamRaceTraffic?.vehicles) {
        window.VietnamRaceTraffic.vehicles.forEach((v) => (v.mesh.visible = false));
      }
      if (window.VietnamRaceCar?.mesh) {
        window.VietnamRaceCar.mesh.visible = false;
      }
      if (window.VietnamRaceShowroom) {
        window.VietnamRaceShowroom.init(this.scene, document.getElementById('canvasContainer'));
        if (window.VietnamRaceShowroom.studioGroup) {
          window.VietnamRaceShowroom.studioGroup.visible = true;
        }
      }
      if (hudLayer) hudLayer.style.display = 'none';
      if (touchLayer) touchLayer.style.display = 'none';
      if (showroomUI) showroomUI.style.display = 'flex';
      if (modeBtn) modeBtn.textContent = '🏎️ LÁI XE SÀI GÒN';
    } else {
      if (this.saigonWorldGroup) this.saigonWorldGroup.visible = true;
      if (window.VietnamRaceTraffic?.vehicles) {
        window.VietnamRaceTraffic.vehicles.forEach((v) => (v.mesh.visible = true));
      }
      if (window.VietnamRaceCar?.mesh) {
        window.VietnamRaceCar.mesh.visible = true;
      }
      if (window.VietnamRaceShowroom?.studioGroup) {
        window.VietnamRaceShowroom.studioGroup.visible = false;
      }
      if (hudLayer) hudLayer.style.display = 'block';
      if (touchLayer) touchLayer.style.display = '';
      if (showroomUI) showroomUI.style.display = 'none';
      if (window.VietnamRaceCar) window.VietnamRaceCar.respawn();
      if (modeBtn) modeBtn.textContent = '🏛️ SHOWROOM';
    }
  },

  handleKey(code, isDown, e) {
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
      case 'KeyM':
      case 'Tab':
        if (isDown) {
          if (e) e.preventDefault();
          this.toggleMode();
        }
        break;
      case 'KeyH':
        if (isDown && window.VietnamRaceAudio) window.VietnamRaceAudio.playHorn();
        break;
      case 'KeyC':
        if (isDown) this.switchCamera();
        break;
      case 'KeyR':
        if (isDown && window.VietnamRaceCar) window.VietnamRaceCar.respawn();
        break;
    }
  },

  setupTouchControls() {
    const bindBtn = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys[keyName] = true;
        if (window.VietnamRaceAudio) window.VietnamRaceAudio.startEngine();
      });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
      });
      el.addEventListener('mousedown', () => {
        this.keys[keyName] = true;
        if (window.VietnamRaceAudio) window.VietnamRaceAudio.startEngine();
      });
      el.addEventListener('mouseup', () => {
        this.keys[keyName] = false;
      });
    };

    bindBtn('touchGas', 'touchThrottle');
    bindBtn('touchBrake', 'touchBrake');
    bindBtn('touchLeft', 'touchLeft');
    bindBtn('touchRight', 'touchRight');
    bindBtn('touchHandbrake', 'touchHandbrake');
    bindBtn('touchBoost', 'touchNitro');

    const touchHorn = document.getElementById('touchHorn');
    if (touchHorn && window.VietnamRaceAudio) {
      touchHorn.addEventListener('click', () => window.VietnamRaceAudio.playHorn());
    }
  },

  switchCamera() {
    this.cameraMode = (this.cameraMode + 1) % 3;
    const modeLabel = document.getElementById('hudCamMode');
    if (modeLabel && window.VietnamRaceI18n) {
      const labels = ['camBehind', 'camTop', 'camHood'];
      modeLabel.textContent = window.VietnamRaceI18n.t('hud.' + labels[this.cameraMode]);
    }
  },

  updateCamera(car) {
    if (!this.camera || !car) return;
    if (isNaN(car.x) || isNaN(car.z) || isNaN(car.yaw)) return;

    // Dynamic FOV Warp Effect when Boosting > 110 km/h up to 699 km/h
    const spd = car.getSpeedKmH ? car.getSpeedKmH() : 0;
    if (spd > 110) {
      const targetFov = 60 + Math.min(spd - 110, 580) * 0.038; // Up to ~82 deg at 699km/h!
      this.camera.fov += (targetFov - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
    } else if (this.camera.fov > 60.1) {
      this.camera.fov += (60 - this.camera.fov) * 0.08;
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraMode === 0) {
      // 3rd Person Smooth Chase Camera Behind Car
      const behindDist = 9.5;
      const height = 4.2;
      const targetX = car.x - Math.sin(car.yaw) * behindDist;
      const targetZ = car.z - Math.cos(car.yaw) * behindDist;
      const targetY = car.y + height;

      this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.12);
      this.camera.lookAt(car.x, car.y + 1.2, car.z);
    } else if (this.cameraMode === 1) {
      // Top-Down Bird View
      this.camera.position.set(car.x, 85, car.z - 15);
      this.camera.lookAt(car.x, 0, car.z);
    } else {
      // FPV Hood View
      const hoodX = car.x + Math.sin(car.yaw) * 1.5;
      const hoodZ = car.z + Math.cos(car.yaw) * 1.5;
      this.camera.position.set(hoodX, car.y + 1.35, hoodZ);
      const lookDist = 20;
      this.camera.lookAt(
        car.x + Math.sin(car.yaw) * lookDist,
        car.y + 1.0,
        car.z + Math.cos(car.yaw) * lookDist
      );
    }
  },

  updateHUD(car) {
    const speedEl = document.getElementById('hudSpeed');
    const gearEl = document.getElementById('hudGear');
    const landmarkEl = document.getElementById('hudNearLandmark');

    if (speedEl && car) {
      const spd = car.getSpeedKmH();
      speedEl.textContent = spd;
      // Hyper glow when over 150 km/h or Nitro active
      if (spd > 150 || car.isNitro) {
        speedEl.classList.add('speed-nitro-glow');
      } else {
        speedEl.classList.remove('speed-nitro-glow');
      }
    }

    if (gearEl && car) {
      if (car.isNitro) {
        gearEl.textContent = 'NITRO 🚀';
        gearEl.style.background = '#00d2d3';
      } else {
        gearEl.style.background = '#ef4444';
        if (car.speed > 0.5) gearEl.textContent = 'D';
        else if (car.speed < -0.5) gearEl.textContent = 'R';
        else gearEl.textContent = 'P';
      }
    }

    // Vehicle Health Bar & Destroyed Overlay
    const hpFill = document.getElementById('hudHealthFill');
    const hpVal = document.getElementById('hudHealthVal');
    const destroyedEl = document.getElementById('destroyedAlert');

    if (hpFill && hpVal && car) {
      if (window.VietnamRaceSettings && window.VietnamRaceSettings.get('godMode')) {
        hpFill.style.width = '100%';
        hpFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        hpVal.textContent = '∞ GOD';
      } else {
        const hp = Math.max(0, Math.round(car.health ?? 100));
        hpFill.style.width = hp + '%';
        hpVal.textContent = hp + '%';
        if (hp > 50) {
          hpFill.style.background = '#10b981';
        } else if (hp > 25) {
          hpFill.style.background = '#f59e0b';
        } else {
          hpFill.style.background = '#ef4444';
        }
      }
    }

    if (destroyedEl && car) {
      destroyedEl.style.display = car.isDead ? 'flex' : 'none';
    }

    // Nearby Landmark & Real Street Detection
    if (landmarkEl && this.currentMode === 'saigon' && window.VietnamRaceMap && car) {
      let nearest = null;
      let minDist = 140;
      window.VietnamRaceMap.landmarks.forEach((lm) => {
        const d = Math.hypot(car.x - lm.x, car.z - lm.z);
        if (d < minDist) {
          minDist = d;
          nearest = lm.name;
        }
      });
      if (!nearest && window.VietnamRaceMap.roads) {
        let minRdDist = 32;
        window.VietnamRaceMap.roads.forEach((rd) => {
          if (rd.name && rd.name !== 'Đường phố') {
            const d = Math.hypot(car.x - rd.midX, car.z - rd.midZ);
            if (d < minRdDist) {
              minRdDist = d;
              nearest = rd.name;
            }
          }
        });
      }
      landmarkEl.textContent = nearest ? '📍 ' + nearest : '📍 Sài Gòn Q1';
    }

    // Update Minimap
    this.renderMinimap(car);
  },

  renderMinimap(car) {
    if (window.VietnamRaceMinimap) {
      window.VietnamRaceMinimap.render(car);
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
      if (window.VietnamRaceShowroom) {
        window.VietnamRaceShowroom.update(dt, this.camera);
      }
    } else {
      if (window.VietnamRaceCar) {
        const colliders = window.VietnamRaceMap ? window.VietnamRaceMap.colliders : [];
        window.VietnamRaceCar.update(dt, this.keys, colliders);
        this.updateCamera(window.VietnamRaceCar);
        this.updateHUD(window.VietnamRaceCar);

        // Spatial Chunk Culling: keep 60 FPS across 3,000+ buildings
        if (window.VietnamRaceOsmLoader?.updateCulling) {
          window.VietnamRaceOsmLoader.updateCulling(window.VietnamRaceCar.x, window.VietnamRaceCar.z, 1200);
        }
      }
      if (window.VietnamRaceTraffic) {
        window.VietnamRaceTraffic.update(dt);
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.VietnamRaceI18n) window.VietnamRaceI18n.init();
  if (window.VietnamRaceApp) window.VietnamRaceApp.init();
});
