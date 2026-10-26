/**
 * Vietnam Race - App-Scoped Bilingual Dictionary
 * Conforms to: products/web-apps/_RULE-web-apps.md
 */
const VIETNAM_RACE_I18N = {
  vi: {
    brand: {
      documentTitle: 'Vietnam Race 3D - Khám Phá Sài Gòn',
      appTitle: 'VIETNAM RACE 3D',
      subTitle: 'Khu vực Sài Gòn (Quận 1)'
    },
    hud: {
      speedUnit: 'KM/H',
      gearD: 'D',
      gearR: 'R',
      gearP: 'P',
      location: 'Vị trí hiện tại',
      district1: 'Quận 1, TP. Hồ Chí Minh',
      cameraMode: 'Camera: Sau xe',
      camBehind: 'Sau xe',
      camTop: 'Toàn cảnh',
      camHood: 'Mũi xe',
      horn: 'CÒI',
      boost: 'TĂNG TỐC'
    },
    landmarks: {
      bitexco: 'Tháp Bitexco (Tầng 52)',
      benThanh: 'Chợ Bến Thành',
      notreDame: 'Nhà thờ Đức Bà',
      baSonBridge: 'Cầu Ba Son (Thủ Thiêm 2)',
      nguyenHue: 'Phố đi bộ Nguyễn Huệ',
      saigonRiver: 'Bến Bạch Đằng & Sông Sài Gòn'
    },
    controls: {
      title: 'HƯỚNG DẪN LÁI XE',
      drive: 'W / ↑ : Tiến',
      reverse: 'S / ↓ : Lùi / Phanh',
      steer: 'A / D / ← / → : Rẽ trái / phải',
      handbrake: 'Space : Phanh tay / Drift',
      horn: 'H : Bấm còi bim bim',
      camera: 'C : Đổi góc nhìn camera',
      respawn: 'R : Đặt lại xe'
    },
    settings: {
      title: 'CÀI ĐẶT TRÒ CHƠI',
      trafficDensity: 'MẬT ĐỘ XE NPC',
      trafficNone: 'Không xe (0)',
      trafficLow: 'Thưa thớt',
      trafficNormal: 'Bình thường',
      trafficDense: 'Giờ cao điểm',
      godMode: 'XE BẤT TỬ (GOD MODE)',
      godModeDesc: 'Không nhận sát thương khi va chạm tốc độ cao, không cháy nổ xe.',
      realMap: 'BẢN ĐỒ THỰC TẾ SÀI GÒN',
      mapStatusActive: 'Đang kích hoạt: Bản đồ vệ tinh Quận 1 (3.400+ đường & cao ốc)',
      uploadMap: 'Nạp file bản đồ khác (.geojson / .osm)',
      dragDropHint: '💡 Mẹo: Bạn có thể kéo thả trực tiếp file bản đồ vào màn hình game bất cứ lúc nào!',
      close: 'ĐÓNG'
    }
  },
  en: {
    brand: {
      documentTitle: 'Vietnam Race 3D - Explore Saigon',
      appTitle: 'VIETNAM RACE 3D',
      subTitle: 'Saigon District 1 Sandbox'
    },
    hud: {
      speedUnit: 'KM/H',
      gearD: 'D',
      gearR: 'R',
      gearP: 'P',
      location: 'Current Location',
      district1: 'District 1, Ho Chi Minh City',
      cameraMode: 'Camera: Behind',
      camBehind: 'Behind',
      camTop: 'Bird View',
      camHood: 'Hood View',
      horn: 'HORN',
      boost: 'BOOST'
    },
    landmarks: {
      bitexco: 'Bitexco Financial Tower',
      benThanh: 'Ben Thanh Market',
      notreDame: 'Notre-Dame Cathedral Basilica',
      baSonBridge: 'Ba Son Bridge (Thu Thiem 2)',
      nguyenHue: 'Nguyen Hue Walking Street',
      saigonRiver: 'Bach Dang Wharf & Saigon River'
    },
    controls: {
      title: 'DRIVING CONTROLS',
      drive: 'W / ↑ : Throttle',
      reverse: 'S / ↓ : Brake / Reverse',
      steer: 'A / D / ← / → : Steer Left / Right',
      handbrake: 'Space : Handbrake / Drift',
      horn: 'H : Honk Horn',
      camera: 'C : Switch Camera',
      respawn: 'R : Reset Car'
    },
    settings: {
      title: 'GAME SETTINGS',
      trafficDensity: 'NPC TRAFFIC DENSITY',
      trafficNone: 'No Traffic (0)',
      trafficLow: 'Sparse',
      trafficNormal: 'Normal',
      trafficDense: 'Rush Hour',
      godMode: 'GOD MODE (INVULNERABLE)',
      godModeDesc: 'Zero collision damage at high speeds, engine never catches fire.',
      realMap: 'SAIGON REAL WORLD MAP',
      mapStatusActive: 'Active: District 1 Satellite Map (3,400+ streets & buildings)',
      uploadMap: 'Upload Custom Map (.geojson / .osm)',
      dragDropHint: '💡 Tip: You can drag & drop your map file directly onto the game window anytime!',
      close: 'CLOSE'
    }
  }
};

window.VietnamRaceI18n = {
  currentLang: 'vi',
  init() {
    const saved = localStorage.getItem('portfolio-lang');
    this.currentLang = (saved === 'en' || saved === 'vi') ? saved : 'vi';
    this.apply();
  },
  setLang(lang) {
    this.currentLang = lang;
    localStorage.setItem('portfolio-lang', lang);
    this.apply();
  },
  toggle() {
    this.setLang(this.currentLang === 'vi' ? 'en' : 'vi');
  },
  t(path) {
    const keys = path.split('.');
    let val = VIETNAM_RACE_I18N[this.currentLang];
    for (const k of keys) {
      if (!val || val[k] === undefined) return path;
      val = val[k];
    }
    return val;
  },
  apply() {
    document.documentElement.lang = this.currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text && text !== key) {
        el.textContent = text;
      }
    });
    const docTitle = this.t('brand.documentTitle');
    if (docTitle) document.title = docTitle;
    const flagBtn = document.getElementById('langFlagBtn');
    const flagCode = document.getElementById('langFlagCode');
    const flagIcon = document.getElementById('langFlagIcon');
    if (flagCode && flagIcon) {
      if (this.currentLang === 'vi') {
        flagCode.textContent = 'EN';
        flagIcon.className = 'lang-flag lang-flag--en';
      } else {
        flagCode.textContent = 'VN';
        flagIcon.className = 'lang-flag lang-flag--vi';
      }
    }
  }
};
