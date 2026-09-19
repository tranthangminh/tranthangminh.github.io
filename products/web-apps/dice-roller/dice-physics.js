/**
 * Dice Roller - Cannon.js Physics Engine Module
 * Simulates heavy 3D rigid bodies (D6, D8, D10, D12, D20),
 * tray boundaries, restitution bounces, and universal face normal solver.
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

class DicePhysicsEngine {
    constructor() {
        this.world = null;
        this.diceBodies = [];
        this.activeCount = 2;
        this.currentDiceType = 'd6';
        this.isRolling = false;
        this.settledFrames = 0;
        this.rollStartTime = 0;
        this.onRollSettledCallback = null;

        // Registered face definitions for the active dice type
        // Array of { value: number, localNormal: CANNON.Vec3 }
        this.activeFaceNormals = [];

        // Tray boundaries
        this.trayWidth = 20;
        this.trayDepth = 15;
        this.dieSize = 2.0;
        this.halfDie = this.dieSize / 2;

        this.initWorld();
    }

    initWorld() {
        if (typeof CANNON === 'undefined') {
            console.error('Cannon.js library not loaded');
            return;
        }

        this.world = new CANNON.World();
        // Heavy, punchy gravity (falls fast and hits hard)
        this.world.gravity.set(0, -95, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 14;

        this.diceMaterial = new CANNON.Material('dice');
        this.floorMaterial = new CANNON.Material('floor');
        this.wallMaterial = new CANNON.Material('wall');

        // Dice vs Floor (heavy felt with good grip & controlled bounce)
        const diceFloorContact = new CANNON.ContactMaterial(this.diceMaterial, this.floorMaterial, {
            friction: 0.55,
            restitution: 0.35
        });
        this.world.addContactMaterial(diceFloorContact);

        // Dice vs Wall
        const diceWallContact = new CANNON.ContactMaterial(this.diceMaterial, this.wallMaterial, {
            friction: 0.3,
            restitution: 0.55
        });
        this.world.addContactMaterial(diceWallContact);

        // Dice vs Dice
        const diceDiceContact = new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
            friction: 0.35,
            restitution: 0.4
        });
        this.world.addContactMaterial(diceDiceContact);

        this.createTrayBoundaries();
    }

    createTrayBoundaries() {
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({
            mass: 0,
            material: this.floorMaterial,
            shape: floorShape
        });
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        floorBody.position.set(0, 0, 0);
        this.world.addBody(floorBody);

        const wallThickness = 1.0;
        const wallHeight = 10.0;
        const halfW = this.trayWidth / 2;
        const halfD = this.trayDepth / 2;

        const lrShape = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallHeight / 2, halfD));
        const leftWall = new CANNON.Body({ mass: 0, material: this.wallMaterial, shape: lrShape });
        leftWall.position.set(-halfW - wallThickness / 2, wallHeight / 2, 0);
        this.world.addBody(leftWall);

        const rightWall = new CANNON.Body({ mass: 0, material: this.wallMaterial, shape: lrShape });
        rightWall.position.set(halfW + wallThickness / 2, wallHeight / 2, 0);
        this.world.addBody(rightWall);

        const fbShape = new CANNON.Box(new CANNON.Vec3(halfW, wallHeight / 2, wallThickness / 2));
        const backWall = new CANNON.Body({ mass: 0, material: this.wallMaterial, shape: fbShape });
        backWall.position.set(0, wallHeight / 2, -halfD - wallThickness / 2);
        this.world.addBody(backWall);

        const frontWall = new CANNON.Body({ mass: 0, material: this.wallMaterial, shape: fbShape });
        frontWall.position.set(0, wallHeight / 2, halfD + wallThickness / 2);
        this.world.addBody(frontWall);
    }

    /**
     * Create physical shape corresponding to dice type
     */
    createShapeForType(type, customVertices, customFaces) {
        if (type === 'd6') {
            return new CANNON.Box(new CANNON.Vec3(this.halfDie, this.halfDie, this.halfDie));
        }

        if (customVertices && customFaces) {
            const cannonVerts = customVertices.map(v => new CANNON.Vec3(v.x, v.y, v.z));
            const poly = new CANNON.ConvexPolyhedron(cannonVerts, customFaces);
            poly.computeNormals();
            return poly;
        }

        // Fallback box
        return new CANNON.Box(new CANNON.Vec3(this.halfDie, this.halfDie, this.halfDie));
    }

    /**
     * Rebuild physics bodies when dice type changes (D6..D20)
     */
    rebuildBodies(type, polyData = null, maxDice = 6) {
        // Remove existing bodies
        this.diceBodies.forEach(b => this.world.remove(b));
        this.diceBodies = [];
        this.currentDiceType = type;

        const shape = this.createShapeForType(type, polyData ? polyData.vertices : null, polyData ? polyData.faces : null);

        for (let i = 0; i < maxDice; i++) {
            const body = new CANNON.Body({
                mass: 1.5, // Heavier mass feel
                shape: shape,
                material: this.diceMaterial,
                linearDamping: 0.28,  // Snappy deceleration
                angularDamping: 0.45  // Controlled tumbling
            });

            body.position.set((i - (maxDice - 1) / 2) * 2.8, this.halfDie + 0.2, 0);

            body.addEventListener('collide', (e) => {
                if (!this.isRolling) return;
                const relVel = e.contact.getImpactVelocityAlongNormal();
                if (relVel > 1.0) {
                    const isDiceContact = e.body.material === this.diceMaterial || e.target.material === this.diceMaterial;
                    if (window.soundEngine) {
                        if (isDiceContact && Math.random() > 0.4) {
                            window.soundEngine.playDiceHit(Math.min(relVel / 16, 1.0));
                        } else {
                            window.soundEngine.playBounce(Math.min(relVel / 15, 1.0));
                        }
                    }
                }
            });

            this.world.addBody(body);
            this.diceBodies.push(body);
        }
    }

    /**
     * Register the face normal definitions for the current dice type
     * @param {Array<{value: number, localNormal: CANNON.Vec3}>} normals
     */
    setFaceNormals(normals) {
        this.activeFaceNormals = normals || [];
    }

    /**
     * Throw active dice with fast, heavy velocity
     */
    throwDice(count, onSettled) {
        this.activeCount = Math.max(1, Math.min(6, count));
        this.onRollSettledCallback = onSettled || null;
        this.isRolling = true;
        this.settledFrames = 0;
        this.rollStartTime = performance.now();

        if (window.soundEngine) {
            window.soundEngine.playShake();
        }

        const spreadX = (this.activeCount - 1) * 1.8;

        for (let i = 0; i < this.diceBodies.length; i++) {
            const body = this.diceBodies[i];

            if (i < this.activeCount) {
                body.wakeUp();
                body.mass = 1.5;
                body.updateMassProperties();

                // Spawn high above tray
                const spawnX = (i * 3.2 - spreadX / 2) + (Math.random() - 0.5) * 2.2;
                const spawnY = 8.5 + Math.random() * 3.5;
                const spawnZ = (Math.random() - 0.5) * 3.5;
                body.position.set(spawnX, spawnY, spawnZ);

                // Initial random spin
                const qx = Math.random() * Math.PI * 2;
                const qy = Math.random() * Math.PI * 2;
                const qz = Math.random() * Math.PI * 2;
                body.quaternion.setFromEuler(qx, qy, qz);

                // Fast downward and spread trajectory (snappy launch)
                const vx = (Math.random() - 0.5) * 16;
                const vy = -4 - Math.random() * 8; // Initial downward thrust
                const vz = (Math.random() - 0.5) * 16;
                body.velocity.set(vx, vy, vz);

                // Punchy spin
                const wx = (Math.random() - 0.5) * 40;
                const wy = (Math.random() - 0.5) * 40;
                const wz = (Math.random() - 0.5) * 40;
                body.angularVelocity.set(wx, wy, wz);
            } else {
                body.sleep();
                body.position.set(0, -50, 0);
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
            }
        }
    }

    update(dt) {
        if (!this.world) return;
        const clampedDt = Math.min(dt, 0.04);
        this.world.step(1 / 60, clampedDt, 3);

        if (this.isRolling) {
            this.checkSettlement();
        }
    }

    checkSettlement() {
        const now = performance.now();
        const duration = now - this.rollStartTime;

        // Ensure at least 800ms of roll before checking settlement
        if (duration < 800) {
            this.settledFrames = 0;
            return;
        }

        let allSettled = true;

        for (let i = 0; i < this.activeCount; i++) {
            const body = this.diceBodies[i];
            const linSpeedSq = body.velocity.lengthSquared();
            const angSpeedSq = body.angularVelocity.lengthSquared();

            // Very strict: virtually 0 movement (<0.005) and die must be resting on the floor
            if (linSpeedSq > 0.005 || angSpeedSq > 0.015 || body.position.y > (this.halfDie + 0.35)) {
                allSettled = false;
                break;
            }
        }

        if (allSettled) {
            this.settledFrames++;
        } else {
            this.settledFrames = 0;
        }

        // Must remain strictly still for 22 consecutive frames (~360ms) OR fallback timeout (5.0s)
        if (this.settledFrames >= 22 || duration > 5000) {
            this.isRolling = false;
            this.settledFrames = 0;

            for (let i = 0; i < this.activeCount; i++) {
                const body = this.diceBodies[i];
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
                body.sleep();
            }

            const results = this.readResults();
            if (typeof this.onRollSettledCallback === 'function') {
                this.onRollSettledCallback(results);
            }
        }
    }

    /**
     * Universal face solver for D6, D8, D10, D12, D20
     */
    readResults() {
        const results = [];

        // Exact D6 fallback mapping matching BoxGeometry materials:
        // +X: 2, -X: 5, +Y: 3, -Y: 4, +Z: 1, -Z: 6
        const defaultD6Normals = [
            { value: 2, localNormal: new CANNON.Vec3(1, 0, 0) },
            { value: 5, localNormal: new CANNON.Vec3(-1, 0, 0) },
            { value: 3, localNormal: new CANNON.Vec3(0, 1, 0) },
            { value: 4, localNormal: new CANNON.Vec3(0, -1, 0) },
            { value: 1, localNormal: new CANNON.Vec3(0, 0, 1) },
            { value: 6, localNormal: new CANNON.Vec3(0, 0, -1) }
        ];

        const faceDefs = (this.activeFaceNormals && this.activeFaceNormals.length > 0)
            ? this.activeFaceNormals
            : defaultD6Normals;

        for (let i = 0; i < this.activeCount; i++) {
            const body = this.diceBodies[i];
            let bestValue = 1;
            let maxDotY = -Infinity;

            for (let f = 0; f < faceDefs.length; f++) {
                const def = faceDefs[f];
                const worldNormal = body.quaternion.vmult(def.localNormal);

                // All dice (D6, D8, D10, D12, D20) rest with winning face pointing straight UP
                if (worldNormal.y > maxDotY) {
                    maxDotY = worldNormal.y;
                    bestValue = def.value;
                }
            }
            results.push(bestValue);
        }

        return results;
    }
}

// Global Singleton
window.dicePhysics = new DicePhysicsEngine();
