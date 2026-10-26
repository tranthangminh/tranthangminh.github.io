/**
 * Planet Race - Vehicle Tuning Specs & Gravity Profiles
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceVehicleSpecs = {
  // 1. Sport Sedan (VinFast Lux A2.0 Sport Style - Adapted from Vietnam Race)
  player_sport: {
    id: 'player_sport',
    name: 'Sedan Thể Thao R-Line',
    category: 'sports_sedan',
    horsepowerHP: 245,              // 245 HP Engine
    nitroHorsepower: 450,           // Nitro boost +450 HP (Total 695 HP)
    massKg: 1540,                   // Curb weight
    dragCoeff: 0.31,
    frontalArea: 2.15,
    tireGrip: 1.10,                 // Adhesion friction coefficient mu
    maxSteerAngleDeg: 32,
    minSteerAngleDeg: 8.0,
    turnSpeed: 2.4,
    nominalTopKmH: 230,
    nominalNitroKmH: 360,
    dimensions: { width: 1.82, length: 4.25, height: 1.35 },
    color: 0xd63031,                // Sport Crimson Red
    hornTone: 'dual'
  },

  // 2. Hypercar Độc Bản (W16 Quad-Turbo - Adapted from Vietnam Race)
  player_supercar: {
    id: 'player_supercar',
    name: 'Hypercar Quỹ Đạo V-16',
    category: 'supercar',
    horsepowerHP: 1200,             // 1200 HP Hypercar
    nitroHorsepower: 1200,          // Nitro booster +1200 HP (Total 2400 HP)
    massKg: 1320,
    dragCoeff: 0.26,
    frontalArea: 1.95,
    tireGrip: 1.30,                 // Slick racing tire grip
    maxSteerAngleDeg: 28,
    minSteerAngleDeg: 6.0,
    turnSpeed: 2.6,
    nominalTopKmH: 380,
    nominalNitroKmH: 520,
    dimensions: { width: 1.98, length: 4.60, height: 1.15 },
    color: 0x0984e3,                // Electric Blue
    hornTone: 'dual'
  },

  // 3. Kaio Classic Roadster (Chiếc xe đỏ cổ điển của Thần Vũ Trụ)
  player_kaio_classic: {
    id: 'player_kaio_classic',
    name: 'Roadster Cổ Điển Kaio',
    category: 'classic',
    horsepowerHP: 210,              // Vintage Twin-Cam
    nitroHorsepower: 380,           // Nitro booster +380 HP (Total 590 HP)
    massKg: 980,                    // Ultra-lightweight classic chassis
    dragCoeff: 0.38,
    frontalArea: 1.85,
    tireGrip: 1.15,
    maxSteerAngleDeg: 35,
    minSteerAngleDeg: 9.0,
    turnSpeed: 2.8,
    nominalTopKmH: 195,
    nominalNitroKmH: 310,
    dimensions: { width: 1.70, length: 3.90, height: 1.25 },
    color: 0xe84118,                // Kaio Cherry Red
    hornTone: 'high'
  },

  /**
   * Calculate derived physics constants from power and aerodynamics
   */
  getTunedProfile(specId) {
    const raw = this[specId] || this.player_sport;
    const powerWatts = raw.horsepowerHP * 745.7; // 1 HP = 745.7 Watts
    const nitroWatts = (raw.nitroHorsepower || 0) * 745.7;
    // Air resistance factor in planet atmosphere: 0.5 * rho * Cd * A (rho = 1.15 kg/m^3 in Kaio micro-atmosphere)
    const aeroDragFactor = 0.5 * 1.15 * raw.dragCoeff * raw.frontalArea;
    const rollingResistanceCoeff = 0.018;

    return {
      ...raw,
      powerWatts,
      nitroWatts,
      aeroDragFactor,
      rollingResistanceCoeff
    };
  }
};
