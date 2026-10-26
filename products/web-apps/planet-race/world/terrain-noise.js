/**
 * Planet Race - Procedural 3D Simplex Terrain Noise & Sculpting Engine
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceTerrain = {
  amplitude: 0.0,       // Default 0m (smooth sphere), adjustable 0 - 35m
  frequency: 0.0035,    // Hill wave frequency on 1km planet
  seed: 42,
  roadConform: true,    // If true, equator highway rolls over hills like a rollercoaster
  brushRadius: 60.0,    // Sculpt brush radius in meters
  brushStrength: 4.0,   // Sculpt height delta in meters
  isBrushActive: false,
  edits: [],            // Custom user sculpted mounds and craters

  // Permutation table for fast noise
  _perm: null,
  _grad3: [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ],

  init() {
    this.setSeed(this.seed);
  },

  setSeed(seedVal) {
    this.seed = Number(seedVal) || 42;
    // Pseudorandom Linear Congruential Generator
    let s = Math.abs(this.seed);
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    this._perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this._perm[i] = p[i & 255];
    }
  },

  randomize() {
    this.setSeed(Math.floor(Math.random() * 1000000));
    this.edits = [];
    return this.seed;
  },

  // 3D Simplex Noise (-1.0 to 1.0)
  noise3D(xin, yin, zin) {
    if (!this._perm) this.init();
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;

    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3, y2 = y0 - j2 + 2.0 * G3, z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3, y3 = y0 - 1.0 + 3.0 * G3, z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;
    const gi0 = this._perm[ii + this._perm[jj + this._perm[kk]]] % 12;
    const gi1 = this._perm[ii + i1 + this._perm[jj + j1 + this._perm[kk + k1]]] % 12;
    const gi2 = this._perm[ii + i2 + this._perm[jj + j2 + this._perm[kk + k2]]] % 12;
    const gi3 = this._perm[ii + 1 + this._perm[jj + 1 + this._perm[kk + 1]]] % 12;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (this._grad3[gi0][0] * x0 + this._grad3[gi0][1] * y0 + this._grad3[gi0][2] * z0); }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (this._grad3[gi1][0] * x1 + this._grad3[gi1][1] * y1 + this._grad3[gi1][2] * z1); }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (this._grad3[gi2][0] * x2 + this._grad3[gi2][1] * y2 + this._grad3[gi2][2] * z2); }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { t3 *= t3; n3 = t3 * t3 * (this._grad3[gi3][0] * x3 + this._grad3[gi3][1] * y3 + this._grad3[gi3][2] * z3); }

    return 32.0 * (n0 + n1 + n2 + n3);
  },

  /**
   * Returns elevation in meters for a given normalized surface vector (nx, ny, nz)
   * isRoad: boolean if querying highway elevation
   */
  getElevation(normal, isRoad = false) {
    if (!normal) return 0;
    const nx = normal.x, ny = normal.y, nz = normal.z;

    // Road smoothing near Equator (Y = 0) unless user wants rollercoaster highway
    let roadFactor = 1.0;
    if (!this.roadConform) {
      const distFromEquator = Math.abs(ny); // 0 at equator, 1 at poles
      if (isRoad || distFromEquator < 0.005) {
        roadFactor = 0.0; // Highway stays perfectly planar on R
      } else {
        roadFactor = Math.min(1.0, Math.pow((distFromEquator - 0.005) / 0.040, 1.8));
      }
    }

    let h = 0;
    if (this.amplitude > 0.001) {
      // Octave 1: Major rolling hills
      const f1 = this.frequency * 1000.0;
      const n1 = this.noise3D(nx * f1, ny * f1, nz * f1);

      // Octave 2: Secondary undulations
      const f2 = f1 * 2.2;
      const n2 = this.noise3D(nx * f2 + 15.3, ny * f2 + 37.1, nz * f2 + 82.5);

      const rawNoise = (n1 * 0.75 + n2 * 0.25);
      h = rawNoise * this.amplitude * roadFactor;
    }

    // Apply manual user brush sculpted mounds/craters
    if (this.edits && this.edits.length > 0) {
      const R = window.PlanetRacePhysics ? window.PlanetRacePhysics.PLANET_RADIUS : 1000.0;
      for (let i = 0; i < this.edits.length; i++) {
        const e = this.edits[i];
        const dot = nx * e.normal.x + ny * e.normal.y + nz * e.normal.z;
        const angDist = Math.acos(Math.max(-1, Math.min(1, dot)));
        const arcDist = angDist * R;
        if (arcDist < e.radius) {
          const w = 0.5 * (1.0 + Math.cos((arcDist / e.radius) * Math.PI)); // Cosine smooth bell
          h += e.deltaH * w;
        }
      }
    }

    return h;
  },

  /**
   * Adds a sculpted mound (raise > 0) or crater (raise < 0)
   */
  addBrushStroke(hitNormal, deltaH) {
    if (!hitNormal) return;
    this.edits.push({
      normal: hitNormal.clone().normalize(),
      radius: this.brushRadius,
      deltaH: Number(deltaH) || this.brushStrength
    });
  },

  /**
   * Computes the exact surface normal vector perpendicular to the local terrain polygon/slope
   */
  getSurfaceNormal(radialNormal) {
    if (!radialNormal) return new THREE.Vector3(0, 1, 0);
    const n0 = radialNormal.clone().normalize();
    const R = window.PlanetRacePhysics ? window.PlanetRacePhysics.PLANET_RADIUS : 1000.0;

    const ref = Math.abs(n0.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const t1 = new THREE.Vector3().crossVectors(n0, ref).normalize();
    const t2 = new THREE.Vector3().crossVectors(n0, t1).normalize();

    const eps = 0.002;
    const p0 = n0.clone().multiplyScalar(R + this.getElevation(n0, false));

    const n1 = n0.clone().addScaledVector(t1, eps).normalize();
    const p1 = n1.clone().multiplyScalar(R + this.getElevation(n1, false));

    const n2 = n0.clone().addScaledVector(t2, eps).normalize();
    const p2 = n2.clone().multiplyScalar(R + this.getElevation(n2, false));

    const dp1 = p1.sub(p0);
    const dp2 = p2.sub(p0);
    const surfNorm = new THREE.Vector3().crossVectors(dp1, dp2).normalize();

    if (surfNorm.dot(n0) < 0) {
      surfNorm.negate();
    }
    return surfNorm;
  }
};

window.PlanetRaceTerrain.init();
