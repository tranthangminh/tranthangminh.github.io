/**
 * Vietnam Race - Pure Force Vehicle Tuning Specs & Physics Profiles
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceVehicleSpecs = {
  // 1. Hero Player Vehicle: Sport Sedan (VinFast Lux A2.0 Sport Style)
  player_sport: {
    id: 'player_sport',
    name: 'Sedan Thể Thao R-Line',
    category: 'sports_sedan',
    horsepowerHP: 245,              // 2.0L Turbo (245 HP)
    nitroHorsepower: 3600,          // Rocket booster thrust (~3600 HP)
    massKg: 1540,                   // Curb weight
    dragCoeff: 0.31,                // Drag coefficient Cd
    frontalArea: 2.15,              // Frontal area in m^2
    tireGrip: 1.05,                 // Michelin Pilot Sport friction coeff mu
    maxSteerAngleDeg: 30,           // Steering lock at low speed
    minSteerAngleDeg: 6.5,          // High speed steering damping
    turnSpeed: 2.2,
    maxHealth: 100,
    dimensions: { width: 1.82, length: 4.25, height: 1.35 },
    nominalTopKmH: 228,
    nominalNitroKmH: 699,
    engineBrakeCoeff: 3.8,          // High-RPM engine retarding force
    hyperAeroCoeff: 4.2,            // Shockwave drag boost above nominal speed
    hornTone: 'dual'
  },

  // 2. High-Speed Hypercar (W16 Quad-Turbo 1200 HP)
  player_supercar: {
    id: 'player_supercar',
    name: 'Hypercar Độc Bản Sài Gòn',
    category: 'supercar',
    horsepowerHP: 1200,             // 1200 HP Hypercar
    nitroHorsepower: 4500,          // Hyper booster thrust
    massKg: 1320,
    dragCoeff: 0.27,                // Extreme aerodynamic shape
    frontalArea: 1.95,
    tireGrip: 1.25,                 // Slick racing tire grip
    maxSteerAngleDeg: 28,
    minSteerAngleDeg: 5.5,
    turnSpeed: 2.4,
    maxHealth: 100,
    dimensions: { width: 1.98, length: 4.60, height: 1.15 },
    nominalTopKmH: 380,
    nominalNitroKmH: 699,
    engineBrakeCoeff: 4.5,
    hyperAeroCoeff: 4.8,
    hornTone: 'dual'
  },

  // 3. AI Traffic Scooter (Honda Vision / Lead)
  traffic_scooter: {
    id: 'traffic_scooter',
    name: 'Xe Máy Đô Thị',
    category: 'motorcycle',
    horsepowerHP: 11,               // 125cc single cylinder
    nitroHorsepower: 0,
    massKg: 115,
    dragCoeff: 0.65,                // Upright rider posture has high drag
    frontalArea: 0.72,
    tireGrip: 0.82,
    maxSteerAngleDeg: 42,
    minSteerAngleDeg: 15,
    turnSpeed: 3.2,
    maxHealth: 45,
    dimensions: { width: 0.75, length: 1.85, height: 1.10 },
    nominalTopKmH: 45,
    nominalNitroKmH: 45,
    hornTone: 'high'
  },

  // 4. AI Delivery Scooter (Honda Wave Thồ Hàng)
  traffic_delivery: {
    id: 'traffic_delivery',
    name: 'Xe Thồ Hàng Đô Thị',
    category: 'motorcycle',
    horsepowerHP: 9,
    nitroHorsepower: 0,
    massKg: 180,
    dragCoeff: 0.75,
    frontalArea: 0.95,
    tireGrip: 0.78,
    maxSteerAngleDeg: 36,
    minSteerAngleDeg: 12,
    turnSpeed: 2.6,
    maxHealth: 60,
    dimensions: { width: 0.95, length: 2.10, height: 1.25 },
    nominalTopKmH: 40,
    nominalNitroKmH: 40,
    hornTone: 'high'
  },

  // 5. AI Traffic Taxi (Xanh SM VF e34 / Vios)
  traffic_taxi: {
    id: 'traffic_taxi',
    name: 'Taxi Đô Thị',
    category: 'taxi',
    horsepowerHP: 147,
    nitroHorsepower: 0,
    massKg: 1450,
    dragCoeff: 0.32,
    frontalArea: 2.10,
    tireGrip: 0.92,
    maxSteerAngleDeg: 32,
    minSteerAngleDeg: 8,
    turnSpeed: 1.9,
    maxHealth: 100,
    dimensions: { width: 1.76, length: 4.30, height: 1.48 },
    nominalTopKmH: 65,
    nominalNitroKmH: 65,
    hornTone: 'dual'
  },

  // 6. AI City Bus (Samco / Thaco City Bus)
  traffic_bus: {
    id: 'traffic_bus',
    name: 'Xe Buýt Thành Phố',
    category: 'bus',
    horsepowerHP: 280,              // Heavy Diesel Engine
    nitroHorsepower: 0,
    massKg: 9500,                   // 9.5 Tons
    dragCoeff: 0.78,                // Giant box frontal wall
    frontalArea: 7.20,
    tireGrip: 0.72,
    maxSteerAngleDeg: 24,
    minSteerAngleDeg: 6,
    turnSpeed: 1.1,
    maxHealth: 350,
    dimensions: { width: 2.50, length: 9.60, height: 3.20 },
    nominalTopKmH: 50,
    nominalNitroKmH: 50,
    hornTone: 'airhorn'
  },

  /**
   * Helper: Calculate real physics constants from pure horsepower & aerodynamics
   */
  getTunedProfile(specId) {
    const raw = this[specId] || this.player_sport;
    const powerWatts = raw.horsepowerHP * 745.7; // 1 HP = 745.7 Watts
    const nitroWatts = (raw.nitroHorsepower || 0) * 745.7;
    // Air resistance factor: 0.5 * rho * Cd * A (air density rho = 1.225 kg/m^3)
    const aeroDragFactor = 0.5 * 1.225 * raw.dragCoeff * raw.frontalArea;
    const maxBrakeDecel = raw.tireGrip * 9.81; // Max deceleration allowed by tire adhesion (m/s^2)
    const engineBrakeCoeff = raw.engineBrakeCoeff || 3.5;
    const hyperAeroCoeff = raw.hyperAeroCoeff || 4.0;

    return {
      ...raw,
      powerWatts,
      nitroWatts,
      aeroDragFactor,
      maxBrakeDecel,
      engineBrakeCoeff,
      hyperAeroCoeff,
      rollingResistanceCoeff: 0.015 // Standard asphalt rolling friction
    };
  }
};
