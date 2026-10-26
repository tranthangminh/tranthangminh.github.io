/**
 * Vietnam Race - Game Settings & Persistence Manager
 * Conforms to: _MAX-RULES.md (Section 5: Storage & State Schema Standard)
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */

const DEFAULT_SETTINGS = Object.freeze({
  trafficDensity: 'normal', // 'none' | 'low' | 'normal' | 'dense'
  godMode: false            // boolean: true (invulnerable) | false
});

window.VietnamRaceSettings = {
  current: { ...DEFAULT_SETTINGS },
  modalEl: null,
  isOpen: false,

  init() {
    this.load();
    this.bindDOM();
    this.syncUI();
  },

  load() {
    try {
      const saved = localStorage.getItem('vietnam_race_settings');
      this.current = {
        ...DEFAULT_SETTINGS,
        ...(saved ? JSON.parse(saved) : {})
      };
    } catch (e) {
      console.warn('[VietnamRaceSettings] Failed to parse saved settings, falling back to defaults:', e);
      this.current = { ...DEFAULT_SETTINGS };
    }
    return this.current;
  },

  save() {
    try {
      localStorage.setItem('vietnam_race_settings', JSON.stringify(this.current));
    } catch (e) {
      console.warn('[VietnamRaceSettings] Failed to save settings to localStorage:', e);
    }
  },

  get(key) {
    if (this.current && this.current[key] !== undefined) return this.current[key];
    return DEFAULT_SETTINGS[key];
  },

  set(key, value) {
    this.current[key] = value;
    this.save();
    this.onSettingChanged(key, value);
    this.syncUI();
  },

  onSettingChanged(key, value) {
    if (key === 'trafficDensity') {
      if (window.VietnamRaceTraffic) {
        window.VietnamRaceTraffic.reloadTraffic(null, value);
      }
    } else if (key === 'godMode') {
      if (value === true && window.VietnamRaceCar) {
        window.VietnamRaceCar.health = window.VietnamRaceCar.maxHealth || 100;
        window.VietnamRaceCar.isDead = false;
        if (window.VietnamRaceCar.smokeParticles) {
          window.VietnamRaceCar.smokeParticles.forEach((sp) => {
            if (sp.mesh) sp.mesh.visible = false;
          });
        }
        if (window.VietnamRaceCar.fireParticles) {
          window.VietnamRaceCar.fireParticles.forEach((fp) => {
            if (fp.mesh) fp.mesh.visible = false;
          });
        }
        const alertEl = document.getElementById('destroyedAlert');
        if (alertEl) alertEl.style.display = 'none';
      }
    }
  },

  bindDOM() {
    this.modalEl = document.getElementById('settingsModal');
    const openBtn = document.getElementById('btnSettings');
    const closeBtn = document.getElementById('btnCloseSettings');
    const dismissBtn = document.getElementById('btnDismissSettings');
    const backdrop = document.getElementById('settingsBackdrop');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.open());
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.close());
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => this.close());
    }

    // Traffic Density Option Buttons
    const densityBtns = document.querySelectorAll('.density-option-btn');
    densityBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-density');
        if (val) this.set('trafficDensity', val);
      });
    });

    // God Mode Toggle
    const godModeCheckbox = document.getElementById('chkGodMode');
    if (godModeCheckbox) {
      godModeCheckbox.addEventListener('change', (e) => {
        this.set('godMode', e.target.checked);
      });
    }

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  syncUI() {
    const density = this.get('trafficDensity');
    const densityBtns = document.querySelectorAll('.density-option-btn');
    densityBtns.forEach((btn) => {
      if (btn.getAttribute('data-density') === density) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const godModeCheckbox = document.getElementById('chkGodMode');
    if (godModeCheckbox) {
      godModeCheckbox.checked = !!this.get('godMode');
    }
  },

  open() {
    if (!this.modalEl) this.modalEl = document.getElementById('settingsModal');
    if (this.modalEl) {
      this.syncUI();
      this.modalEl.style.display = 'flex';
      this.isOpen = true;
    }
  },

  close() {
    if (!this.modalEl) this.modalEl = document.getElementById('settingsModal');
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
      this.isOpen = false;
    }
  }
};

// Auto initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.VietnamRaceSettings.init());
} else {
  window.VietnamRaceSettings.init();
}
