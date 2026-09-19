/**
 * Dice Roller - Three.js 3D WebGL Graphic Engine
 * Renders authentic traditional D6 with carved pips (nút xí ngầu)
 * and polyhedral RPG dice (D8, D10, D12, D20) with engraved numbers.
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

class Dice3DEngine {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.diceMeshes = [];
        this.currentTheme = 'ivory';
        this.currentType = 'd6';
        this.animationFrameId = null;

        this.trayWidth = 20;
        this.trayDepth = 15;
    }

    init(containerElement) {
        if (!containerElement || typeof THREE === 'undefined') return;

        this.container = containerElement;
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x131716);

        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 100);
        this.updateCamera(width, height);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.buildTray();
        this.setDiceType('d6', 6);

        window.addEventListener('resize', () => this.onResize());
        this.startLoop();
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.68));

        const mainLight = new THREE.DirectionalLight(0xfffaed, 0.95);
        mainLight.position.set(12, 28, 14);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 5;
        mainLight.shadow.camera.far = 55;
        mainLight.shadow.bias = -0.0005;

        const d = 14;
        mainLight.shadow.camera.left = -d;
        mainLight.shadow.camera.right = d;
        mainLight.shadow.camera.top = d;
        mainLight.shadow.camera.bottom = -d;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x8bc34a, 0.25);
        fillLight.position.set(-14, 18, -10);
        this.scene.add(fillLight);
    }

    buildTray() {
        const floorGeo = new THREE.PlaneGeometry(this.trayWidth, this.trayDepth);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x184232, roughness: 0.85 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        const rimMat = new THREE.MeshStandardMaterial({ color: 0x2e1911, roughness: 0.45, metalness: 0.15 });
        const hw = this.trayWidth / 2, hd = this.trayDepth / 2;
        const borders = [
            { w: 0.8, h: 2.5, d: this.trayDepth + 1.6, x: -hw - 0.4, z: 0 },
            { w: 0.8, h: 2.5, d: this.trayDepth + 1.6, x: hw + 0.4, z: 0 },
            { w: this.trayWidth, h: 2.5, d: 0.8, x: 0, z: -hd - 0.4 },
            { w: this.trayWidth, h: 2.5, d: 0.8, x: 0, z: hd + 0.4 }
        ];

        borders.forEach(b => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), rimMat);
            m.position.set(b.x, 1.25, b.z);
            m.castShadow = true;
            m.receiveShadow = true;
            this.scene.add(m);
        });
    }

    /**
     * D10 Pentagonal Trapezohedron Geometry
     */
    createD10Geometry(r = 1.45) {
        const verts = [0, r * 1.25, 0, 0, -r * 1.25, 0];
        const h = r * 0.35;
        for (let i = 0; i < 5; i++) {
            const a1 = (i * 72 * Math.PI) / 180;
            verts.push(r * Math.cos(a1), h, r * Math.sin(a1));
        }
        for (let i = 0; i < 5; i++) {
            const a2 = ((i * 72 + 36) * Math.PI) / 180;
            verts.push(r * Math.cos(a2), -h, r * Math.sin(a2));
        }

        const idx = [];
        for (let i = 0; i < 5; i++) {
            const t1 = 2 + i, t2 = 2 + ((i + 1) % 5);
            const b1 = 7 + i, b2 = 7 + ((i + 4) % 5);
            idx.push(0, t1, b1, 0, b1, t2, 1, b1, t1, 1, t1, b2);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    /**
     * Draw authentic traditional carved pips (nút xí ngầu) for D6
     */
    createD6FaceCanvas(val, theme) {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 256;
        const ctx = cv.getContext('2d');

        let bg1 = '#faf7f2', bg2 = '#e8e2d8';
        let pipColor = '#1e1e1e';
        let isRed = (theme === 'ivory' && (val === 1 || val === 4));

        if (theme === 'dark') {
            bg1 = '#242424'; bg2 = '#141414';
            pipColor = '#e5c158';
        } else if (theme === 'ruby') {
            bg1 = '#991b1b'; bg2 = '#580808';
            pipColor = '#ffffff';
        }

        const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 160);
        grad.addColorStop(0, bg1); grad.addColorStop(1, bg2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        ctx.strokeStyle = theme === 'ivory' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, 248, 248);

        const drawPip = (x, y, r, red) => {
            ctx.beginPath();
            ctx.arc(x, y, r + 2, 0, Math.PI * 2);
            ctx.fillStyle = theme === 'ivory' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.45)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            const pGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
            if (red) {
                pGrad.addColorStop(0, '#ff4d4d'); pGrad.addColorStop(1, '#d62828');
            } else {
                pGrad.addColorStop(0, theme === 'dark' ? '#ffdf78' : '#3a3a3a');
                pGrad.addColorStop(1, pipColor);
            }
            ctx.fillStyle = pGrad;
            ctx.fill();
        };

        const c = 128, l = 68, r = 188;
        switch (val) {
            case 1: drawPip(c, c, 38, true); break; // Nút 1 đỏ to tướng
            case 2: drawPip(l, l, 22, false); drawPip(r, r, 22, false); break;
            case 3: drawPip(l, l, 21, false); drawPip(c, c, 21, false); drawPip(r, r, 21, false); break;
            case 4:
                drawPip(l, l, 22, isRed); drawPip(r, l, 22, isRed);
                drawPip(l, r, 22, isRed); drawPip(r, r, 22, isRed);
                break;
            case 5:
                drawPip(l, l, 21, false); drawPip(r, l, 21, false);
                drawPip(c, c, 21, false);
                drawPip(l, r, 21, false); drawPip(r, r, 21, false);
                break;
            case 6:
                drawPip(l, 60, 20, false); drawPip(l, c, 20, false); drawPip(l, 196, 20, false);
                drawPip(r, 60, 20, false); drawPip(r, c, 20, false); drawPip(r, 196, 20, false);
                break;
        }
        return cv;
    }

    createD6Materials(theme) {
        // Match Cannon.js face vectors: +X:2, -X:5, +Y:3, -Y:4, +Z:1, -Z:6
        const faceOrder = [2, 5, 3, 4, 1, 6];
        return faceOrder.map(val => {
            const cv = this.createD6FaceCanvas(val, theme);
            const tex = new THREE.CanvasTexture(cv);
            return new THREE.MeshStandardMaterial({
                map: tex,
                roughness: theme === 'dark' ? 0.25 : 0.22,
                metalness: theme === 'dark' ? 0.35 : 0.08
            });
        });
    }

    /**
     * Polyhedron data & number decal texture generator for D6..D20
     */
    buildPolyhedronData(type) {
        let geometry = null, faceCount = 6;
        if (type === 'd6') { geometry = new THREE.BoxGeometry(2.0, 2.0, 2.0); faceCount = 6; }
        else if (type === 'd8') { geometry = new THREE.OctahedronGeometry(1.45); faceCount = 8; }
        else if (type === 'd10') { geometry = this.createD10Geometry(1.45); faceCount = 10; }
        else if (type === 'd12') { geometry = new THREE.DodecahedronGeometry(1.35); faceCount = 12; }
        else if (type === 'd20') { geometry = new THREE.IcosahedronGeometry(1.35); faceCount = 20; }
        else { geometry = new THREE.BoxGeometry(2.0, 2.0, 2.0); faceCount = 6; }

        const nonIndexed = geometry.toNonIndexed();
        const pos = nonIndexed.attributes.position;
        const faces = [];

        for (let i = 0; i < pos.count; i += 3) {
            const vA = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
            const vB = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
            const vC = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
            const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(vB, vA), new THREE.Vector3().subVectors(vC, vA)).normalize();
            const c = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3);

            let existing = faces.find(f => f.normal.dot(n) > 0.98);
            if (existing) existing.centers.push(c);
            else faces.push({ normal: n, centers: [c] });
        }

        const planarFaces = faces.slice(0, faceCount).map((f, idx) => {
            const avg = new THREE.Vector3();
            f.centers.forEach(c => avg.add(c));
            avg.divideScalar(f.centers.length);
            return { value: idx + 1, normal: f.normal, center: avg };
        });

        const uniqueVerts = [], vertMap = new Map(), cannonFaces = [];
        for (let i = 0; i < pos.count; i += 3) {
            const tri = [];
            for (let j = 0; j < 3; j++) {
                const idx = i + j;
                const key = `${Math.round(pos.getX(idx) * 1000)},${Math.round(pos.getY(idx) * 1000)},${Math.round(pos.getZ(idx) * 1000)}`;
                let vIdx = vertMap.get(key);
                if (vIdx === undefined) {
                    vIdx = uniqueVerts.length;
                    vertMap.set(key, vIdx);
                    uniqueVerts.push({ x: pos.getX(idx), y: pos.getY(idx), z: pos.getZ(idx) });
                }
                tri.push(vIdx);
            }
            cannonFaces.push(tri);
        }

        return { geometry, planarFaces, polyData: { vertices: uniqueVerts, faces: cannonFaces } };
    }

    createNumberDecalTexture(val, theme) {
        const cv = document.createElement('canvas');
        cv.width = 128; cv.height = 128;
        const ctx = cv.getContext('2d');

        let textColor = (theme === 'dark') ? '#e5c158' : (theme === 'ruby' ? '#ffffff' : '#222222');
        ctx.beginPath();
        ctx.arc(64, 64, 52, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'ivory' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.25)';
        ctx.fill();

        ctx.font = 'bold 54px "Montserrat", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.fillText(String(val), 64, 62);
        if (val === 6 || val === 9) ctx.fillRect(44, 94, 40, 5);

        const tex = new THREE.CanvasTexture(cv);
        tex.generateMipmaps = true;
        return tex;
    }

    createDieMesh(polyInfo, theme) {
        // For classic D6, use authentic carved pips (nút xí ngầu)
        if (this.currentType === 'd6') {
            const materials = this.createD6Materials(theme);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), materials);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }

        // For polyhedral D8..D20, use body mesh with engraved decals
        let bodyColor = 0xf5f2ec;
        if (theme === 'dark') bodyColor = 0x1a1a1a;
        else if (theme === 'ruby') bodyColor = 0x800808;

        const baseMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: theme === 'dark' ? 0.25 : 0.22,
            metalness: theme === 'dark' ? 0.45 : 0.08
        });

        const rootMesh = new THREE.Mesh(polyInfo.geometry, baseMat);
        rootMesh.castShadow = true;
        rootMesh.receiveShadow = true;

        const decalGeo = new THREE.PlaneGeometry(1.05, 1.05);
        polyInfo.planarFaces.forEach(face => {
            const decalMat = new THREE.MeshBasicMaterial({
                map: this.createNumberDecalTexture(face.value, theme),
                transparent: true,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1
            });
            const decalMesh = new THREE.Mesh(decalGeo, decalMat);
            decalMesh.position.copy(face.center).addScaledVector(face.normal, 0.02);
            decalMesh.lookAt(new THREE.Vector3().addVectors(decalMesh.position, face.normal));
            rootMesh.add(decalMesh);
        });

        return rootMesh;
    }

    setDiceType(type, count = 6) {
        this.currentType = type;
        const polyInfo = this.buildPolyhedronData(type);

        this.diceMeshes.forEach(m => this.scene.remove(m));
        this.diceMeshes = [];

        for (let i = 0; i < count; i++) {
            const mesh = this.createDieMesh(polyInfo, this.currentTheme);
            this.scene.add(mesh);
            this.diceMeshes.push(mesh);
        }

        if (window.dicePhysics) {
            window.dicePhysics.rebuildBodies(type, polyInfo.polyData, count);

            let cannonNormals;
            if (type === 'd6') {
                // Exact BoxGeometry material mapping: +X:2, -X:5, +Y:3, -Y:4, +Z:1, -Z:6
                cannonNormals = [
                    { value: 2, localNormal: new CANNON.Vec3(1, 0, 0) },
                    { value: 5, localNormal: new CANNON.Vec3(-1, 0, 0) },
                    { value: 3, localNormal: new CANNON.Vec3(0, 1, 0) },
                    { value: 4, localNormal: new CANNON.Vec3(0, -1, 0) },
                    { value: 1, localNormal: new CANNON.Vec3(0, 0, 1) },
                    { value: 6, localNormal: new CANNON.Vec3(0, 0, -1) }
                ];
            } else {
                cannonNormals = polyInfo.planarFaces.map(f => ({
                    value: f.value,
                    localNormal: new CANNON.Vec3(f.normal.x, f.normal.y, f.normal.z)
                }));
            }
            window.dicePhysics.setFaceNormals(cannonNormals);
        }
    }

    setTheme(newTheme) {
        if (this.currentTheme === newTheme) return;
        this.currentTheme = newTheme;
        this.setDiceType(this.currentType, this.diceMeshes.length || 6);
    }

    updateCamera(w, h) {
        if (!this.camera) return;
        const aspect = w / h;
        this.camera.aspect = aspect;

        if (aspect < 1.0) {
            // Mobile Portrait: wider FOV to fit width 20, shift lookAt downward so top rim avoids top HUD
            this.camera.fov = 48;
            this.camera.position.set(0, 28, 22);
            this.camera.lookAt(0, -3.8, 0);
        } else {
            // Desktop / Landscape
            this.camera.fov = 40;
            this.camera.position.set(0, 24, 18);
            this.camera.lookAt(0, 0, 0);
        }

        this.camera.updateProjectionMatrix();
    }

    onResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.updateCamera(w, h);
        this.renderer.setSize(w, h);
    }

    startLoop() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            const dt = this.clock.getDelta();

            if (window.dicePhysics) {
                window.dicePhysics.update(dt);
                const activeCount = window.dicePhysics.activeCount;
                const bodies = window.dicePhysics.diceBodies;

                for (let i = 0; i < this.diceMeshes.length; i++) {
                    const mesh = this.diceMeshes[i];
                    const body = bodies[i];
                    if (body && i < activeCount) {
                        mesh.visible = true;
                        mesh.position.copy(body.position);
                        mesh.quaternion.copy(body.quaternion);
                    } else {
                        mesh.visible = false;
                    }
                }
            }

            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }
}

// Global Singleton
window.dice3DEngine = new Dice3DEngine();
