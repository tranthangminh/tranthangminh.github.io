/**
 * Planet Race - Deep Space Skybox, Starfield & Vibrant Cosmic Lighting (1km Scale)
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.PlanetRaceSpace = {
  group: null,
  sunLight: null,
  ambientLight: null,
  hemiLight: null,
  sunMesh: null,
  starsMesh: null,
  sunDir: new THREE.Vector3(0.55, 0.45, 0.70).normalize(),

  init(scene) {
    this.group = new THREE.Group();

    // 1. Starfield Particles (4,000 stars distributed 3,500m to 8,000m away)
    const starCount = 4000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x70a1ff),
      new THREE.Color(0xffa502),
      new THREE.Color(0x2ed573),
      new THREE.Color(0xff6b81)
    ];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const dist = 3800 + Math.random() * 4200;

      positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = dist * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    this.starsMesh = new THREE.Points(starGeo, starMat);
    this.group.add(this.starsMesh);

    // 2. High-Visibility Ambient & Hemisphere Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.group.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x2ecc71, 0.45);
    this.group.add(this.hemiLight);

    // 3. Focused Solar Directional Light (Follows car position for crisp dynamic shadows)
    this.sunLight = new THREE.DirectionalLight(0xfff9e6, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;

    const d = 50; // 50m radius around car for razor-sharp vehicle shadow
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.05;

    // Initial position relative to origin
    this.sunLight.position.copy(this.sunDir).multiplyScalar(150);
    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);

    // 4. Distant Giant Solar Star Visual
    const sunVisualPos = this.sunDir.clone().multiplyScalar(4500);
    const sunGeo = new THREE.SphereGeometry(150, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(sunVisualPos);
    this.group.add(this.sunMesh);

    // Sun Corona Glow
    const haloGeo = new THREE.SphereGeometry(220, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff7f50,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide
    });
    this.sunMesh.add(new THREE.Mesh(haloGeo, haloMat));

    scene.add(this.group);
    return this.group;
  },

  update(dt, carPos) {
    if (this.starsMesh) {
      this.starsMesh.rotation.y += 0.0004 * dt;
    }

    // Keep directional sunlight focused right above the car for optimal shadow fidelity
    if (this.sunLight && carPos) {
      this.sunLight.target.position.copy(carPos);
      this.sunLight.position.copy(carPos).addScaledVector(this.sunDir, 120);
    }
  }
};
