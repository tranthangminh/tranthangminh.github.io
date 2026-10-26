/**
 * Planet Race - Heads-Up Display (HUD) & Left Cosmic Sidebar Dashboard
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceHUD = {
  elements: {},

  init() {
    this.elements = {
      speedVal: document.getElementById('hudSpeed'),
      gearVal: document.getElementById('hudGear'),
      altVal: document.getElementById('hudAltitude'),
      altBadge: document.getElementById('hudAltBadge'),
      vOrbVal: document.getElementById('hudVOrb'),
      gVal: document.getElementById('hudGForce'),
      normalForceFill: document.getElementById('hudNormalForceFill'),
      normalForceVal: document.getElementById('hudNormalForceVal'),
      vehicleSelect: document.getElementById('vehiclePresetSelect'),

      // Left Docked Cosmic Sidebar
      sidebar: document.getElementById('cosmicSidebar'),
      btnToggleSidebar: document.getElementById('btnToggleSidebar'),
      toggleArrow: document.getElementById('sidebarToggleArrow'),
      rangeRadius: document.getElementById('rangeRadius'),
      txtRadiusVal: document.getElementById('txtRadiusVal'),
      txtRadiusInfo: document.getElementById('txtRadiusInfo'),
      rangeGravity: document.getElementById('rangeGravity'),
      txtGravityVal: document.getElementById('txtGravityVal'),
      txtCalcVorb: document.getElementById('txtCalcVorb'),
      txtCalcVesc: document.getElementById('txtCalcVesc'),
      btnApplyRadius: document.getElementById('btnApplyRadius'),

      // Terrain Controls
      rangeAmplitude: document.getElementById('rangeAmplitude'),
      txtAmplitudeVal: document.getElementById('txtAmplitudeVal'),
      btnRandomTerrain: document.getElementById('btnRandomTerrain'),
      btnToggleRollercoaster: document.getElementById('btnToggleRollercoaster'),
      btnToggleSculpt: document.getElementById('btnToggleSculpt')
    };

    this.bindEvents();
    this.bindCosmicSidebar();
  },

  bindEvents() {
    if (this.elements.vehicleSelect) {
      this.elements.vehicleSelect.addEventListener('change', (e) => {
        if (window.PlanetRaceCar) {
          window.PlanetRaceCar.applyProfile(e.target.value);
        }
      });
    }
  },

  bindCosmicSidebar() {
    const el = this.elements;
    if (!el.sidebar) return;

    // 1. Expand / Collapse Sidebar Toggle
    if (el.btnToggleSidebar) {
      el.btnToggleSidebar.addEventListener('click', () => {
        const isCollapsed = el.sidebar.classList.toggle('collapsed');
        if (el.toggleArrow) {
          el.toggleArrow.textContent = isCollapsed ? '▶' : '◀';
        }
      });
    }

    // Helper: Real-Time UI Calculations
    const updateCalculations = () => {
      const r = Number(el.rangeRadius?.value || 1000);
      const gInG = Number(el.rangeGravity?.value || 10);
      const gMps = gInG * 9.81;

      if (el.txtRadiusVal) {
        const kmStr = (r >= 1000) ? `${(r / 1000).toFixed(1)} km` : `${r} m`;
        el.txtRadiusVal.textContent = `${r.toLocaleString('vi-VN')} m (${kmStr})`;
      }
      if (el.txtRadiusInfo) {
        const circum = Math.round(2 * Math.PI * r);
        const circumKm = (circum / 1000).toFixed(2);
        el.txtRadiusInfo.textContent = `Chu vi: ${circum.toLocaleString('vi-VN')} m (${circumKm} km) | Đường kính: ${(r * 2).toLocaleString('vi-VN')} m`;
      }

      if (el.txtGravityVal) {
        el.txtGravityVal.textContent = `${gInG.toFixed(2)} G (${gMps.toFixed(1)} m/s²)`;
      }

      const vOrbMps = Math.sqrt(gMps * r);
      const vOrbKmH = Math.round(vOrbMps * 3.6);
      const vEscKmH = Math.round(vOrbKmH * Math.SQRT2);

      if (el.txtCalcVorb) el.txtCalcVorb.textContent = `${vOrbKmH.toLocaleString('vi-VN')} km/h`;
      if (el.txtCalcVesc) el.txtCalcVesc.textContent = `${vEscKmH.toLocaleString('vi-VN')} km/h`;
      if (el.vOrbVal) el.vOrbVal.textContent = `${vOrbKmH.toLocaleString('vi-VN')} km/h`;
    };

    // Helper: Rebuild Planet Radius & Terrain
    const applyRadiusChange = (newRadius) => {
      const r = Number(newRadius || el.rangeRadius?.value || 1000);
      if (window.PlanetRacePhysics) {
        window.PlanetRacePhysics.setPlanetRadius(r);
      }
      if (window.PlanetRaceWorld && window.PlanetRaceApp?.scene) {
        window.PlanetRaceWorld.rebuild(r, window.PlanetRaceApp.scene);
      }
      if (window.PlanetRaceCar) {
        window.PlanetRaceCar.respawn();
      }
      if (window.PlanetRaceCamera) {
        window.PlanetRaceCamera.resetSnap();
      }
      updateCalculations();
    };

    // 2. Real-Time Gravity Slider (Instant Effect)
    if (el.rangeGravity) {
      el.rangeGravity.addEventListener('input', () => {
        const gVal = Number(el.rangeGravity.value);
        if (window.PlanetRacePhysics) {
          window.PlanetRacePhysics.setGravityG(gVal);
        }
        document.querySelectorAll('[data-gravity]').forEach((p) => p.classList.remove('preset-pill--active'));
        updateCalculations();
      });
    }

    // 3. Radius Slider Input & Change
    if (el.rangeRadius) {
      el.rangeRadius.addEventListener('input', () => {
        document.querySelectorAll('[data-radius]').forEach((p) => p.classList.remove('preset-pill--active'));
        updateCalculations();
      });
      el.rangeRadius.addEventListener('change', () => {
        applyRadiusChange(el.rangeRadius.value);
      });
    }

    if (el.btnApplyRadius) {
      el.btnApplyRadius.addEventListener('click', () => {
        applyRadiusChange(el.rangeRadius?.value);
      });
    }

    // 4. Preset Pills for Radius & Gravity
    document.querySelectorAll('.preset-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        if (pill.dataset.radius && el.rangeRadius) {
          el.rangeRadius.value = pill.dataset.radius;
          document.querySelectorAll('[data-radius]').forEach((p) => p.classList.remove('preset-pill--active'));
          pill.classList.add('preset-pill--active');
          applyRadiusChange(pill.dataset.radius);
        } else if (pill.dataset.gravity && el.rangeGravity) {
          el.rangeGravity.value = pill.dataset.gravity;
          document.querySelectorAll('[data-gravity]').forEach((p) => p.classList.remove('preset-pill--active'));
          pill.classList.add('preset-pill--active');
          if (window.PlanetRacePhysics) {
            window.PlanetRacePhysics.setGravityG(Number(pill.dataset.gravity));
          }
          updateCalculations();
        } else if (pill.dataset.ampl && el.rangeAmplitude) {
          const ampl = Number(pill.dataset.ampl);
          el.rangeAmplitude.value = ampl;
          document.querySelectorAll('[data-ampl]').forEach((p) => p.classList.remove('preset-pill--active'));
          pill.classList.add('preset-pill--active');
          updateAmplitude(ampl);
        }
      });
    });

    // 5. Terrain Amplitude & Procedural Bumps
    const updateAmplitude = (val) => {
      const ampl = Number(val);
      if (window.PlanetRaceTerrain) {
        window.PlanetRaceTerrain.amplitude = ampl;
      }
      if (el.txtAmplitudeVal) {
        const desc = ampl === 0 ? 'Phẳng' : (ampl < 10 ? 'Đồi nhẹ' : (ampl < 20 ? 'Lượn sóng' : 'Dốc gắt'));
        el.txtAmplitudeVal.textContent = `${ampl} m (${desc})`;
      }
      applyRadiusChange();
    };

    if (el.rangeAmplitude) {
      el.rangeAmplitude.addEventListener('input', () => {
        const ampl = Number(el.rangeAmplitude.value);
        if (el.txtAmplitudeVal) {
          const desc = ampl === 0 ? 'Phẳng' : (ampl < 10 ? 'Đồi nhẹ' : (ampl < 20 ? 'Lượn sóng' : 'Dốc gắt'));
          el.txtAmplitudeVal.textContent = `${ampl} m (${desc})`;
        }
        document.querySelectorAll('[data-ampl]').forEach((p) => p.classList.remove('preset-pill--active'));
      });
      el.rangeAmplitude.addEventListener('change', () => {
        updateAmplitude(el.rangeAmplitude.value);
      });
    }

    if (el.btnRandomTerrain) {
      el.btnRandomTerrain.addEventListener('click', () => {
        if (window.PlanetRaceTerrain) {
          window.PlanetRaceTerrain.randomize();
          if (window.PlanetRaceTerrain.amplitude === 0) {
            window.PlanetRaceTerrain.amplitude = 12;
            if (el.rangeAmplitude) el.rangeAmplitude.value = 12;
            if (el.txtAmplitudeVal) el.txtAmplitudeVal.textContent = '12 m (Lượn sóng)';
          }
        }
        applyRadiusChange();
      });
    }

    if (el.btnToggleRollercoaster) {
      el.btnToggleRollercoaster.addEventListener('click', () => {
        if (window.PlanetRaceTerrain) {
          window.PlanetRaceTerrain.roadConform = !window.PlanetRaceTerrain.roadConform;
          el.btnToggleRollercoaster.textContent = window.PlanetRaceTerrain.roadConform
            ? '🎢 ĐƯỜNG ĐUA: LƯỢN SÓNG'
            : '🎢 ĐƯỜNG ĐUA: PHẲNG';
        }
        applyRadiusChange();
      });
    }

    // 6. Terrain Sculpting Tool
    const canvasContainer = document.getElementById('canvasContainer');
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleSculpt = (e) => {
      if (!window.PlanetRaceTerrain || !window.PlanetRaceTerrain.isBrushActive) return;
      if (!window.PlanetRaceApp?.camera || !window.PlanetRaceWorld?.planetGroup) return;

      const rect = canvasContainer.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, window.PlanetRaceApp.camera);
      const intersects = raycaster.intersectObjects(window.PlanetRaceWorld.planetGroup.children, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const normal = hit.point.clone().normalize();
        const deltaH = (e.button === 2 || e.shiftKey) ? -window.PlanetRaceTerrain.brushStrength : window.PlanetRaceTerrain.brushStrength;
        window.PlanetRaceTerrain.addBrushStroke(normal, deltaH);
        applyRadiusChange();
      }
    };

    if (el.btnToggleSculpt) {
      el.btnToggleSculpt.addEventListener('click', () => {
        if (window.PlanetRaceTerrain) {
          window.PlanetRaceTerrain.isBrushActive = !window.PlanetRaceTerrain.isBrushActive;
          el.btnToggleSculpt.classList.toggle('active', window.PlanetRaceTerrain.isBrushActive);
          el.btnToggleSculpt.textContent = window.PlanetRaceTerrain.isBrushActive
            ? '🖌️ ĐANG BẬT CỌ (CLICK ĐẮP / SHIFT GỌT)'
            : '🖌️ CHẾ ĐỘ SỬA ĐỊA HÌNH (SCULPT)';
          if (canvasContainer) {
            canvasContainer.classList.toggle('sculpting-active', window.PlanetRaceTerrain.isBrushActive);
          }
        }
      });
    }

    if (canvasContainer) {
      canvasContainer.addEventListener('pointerdown', (e) => {
        if (window.PlanetRaceTerrain?.isBrushActive && e.target.tagName === 'CANVAS') {
          handleSculpt(e);
        }
      });
      canvasContainer.addEventListener('contextmenu', (e) => {
        if (window.PlanetRaceTerrain?.isBrushActive) e.preventDefault();
      });
    }

    updateCalculations();
  },

  update(car) {
    if (!car || !car.state) return;
    const st = car.state;
    const el = this.elements;

    if (el.speedVal) {
      el.speedVal.textContent = st.speedKmH;
      if (st.speedKmH > 180 || st.isNitro) {
        el.speedVal.classList.add('hud-speed--nitro');
      } else {
        el.speedVal.classList.remove('hud-speed--nitro');
      }
    }

    if (el.gearVal) {
      if (st.isNitro) {
        el.gearVal.textContent = 'NITRO 🚀';
        el.gearVal.className = 'hud-badge hud-badge--nitro';
      } else if (st.speedKmH < 1.0) {
        el.gearVal.textContent = 'P';
        el.gearVal.className = 'hud-badge';
      } else if (car.state.velocity.dot(new THREE.Vector3(0,0,1).applyQuaternion(st.quaternion)) < -0.4) {
        el.gearVal.textContent = 'R';
        el.gearVal.className = 'hud-badge hud-badge--reverse';
      } else {
        el.gearVal.textContent = 'D';
        el.gearVal.className = 'hud-badge hud-badge--drive';
      }
    }

    if (el.altVal && el.altBadge) {
      const altM = Math.max(0, st.altitude || 0);
      if (st.isGrounded) {
        el.altVal.textContent = '0.0 m';
        el.altBadge.textContent = 'BÁM ĐẤT';
        el.altBadge.className = 'hud-status-pill hud-status--ground';
      } else {
        el.altVal.textContent = `+${altM.toFixed(1)} m`;
        el.altBadge.textContent = 'BAY QUỸ ĐẠO 🚀';
        el.altBadge.className = 'hud-status-pill hud-status--orbit';
      }
    }

    if (el.gVal) {
      el.gVal.textContent = `${(st.currentG || 10.0).toFixed(1)} G`;
    }

    if (el.normalForceFill && el.normalForceVal) {
      const mass = (car.spec ? car.spec.massKg : 1400);
      const baseWeight = mass * (st.currentG * 9.81);
      const ratio = Math.max(0, Math.min(1.0, st.normalForce / Math.max(1, baseWeight)));
      const pct = Math.round(ratio * 100);

      el.normalForceFill.style.width = `${pct}%`;
      el.normalForceVal.textContent = `${pct}%`;

      if (pct > 50) {
        el.normalForceFill.style.background = '#26de81';
      } else if (pct > 20) {
        el.normalForceFill.style.background = '#fed330';
      } else {
        el.normalForceFill.style.background = '#ff4757';
      }
    }
  }
};
