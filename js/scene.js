import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.car = null;
        this.platform = null;
        this.floorGroup = null;
        this.wheels = [];
        this.clock = new THREE.Clock();

        this.cameraPositions = {
            front: { position: { x: 0, y: 1.2, z: 5.5 }, target: { x: 0, y: 0.4, z: 0 } },
            side: { position: { x: 5.5, y: 1.2, z: 0 }, target: { x: 0, y: 0.4, z: 0 } },
            rear: { position: { x: 0, y: 1.5, z: -5.5 }, target: { x: 0, y: 0.4, z: 0 } },
            top: { position: { x: 0, y: 7, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            cockpit: { position: { x: 0, y: 0.9, z: -0.2 }, target: { x: 0, y: 0.8, z: 3 } },
            orbit: { position: { x: 4.5, y: 2.5, z: 4.5 }, target: { x: 0, y: 0.5, z: 0 } }
        };

        this.showroomLights = [];
        this.isRotating = false;
        this.rotationSpeed = 0.002;
        this.platformTopY = 0.2;
    }

    async init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 40);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(5, 3, 8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.target.set(0, 0.5, 0);

        this.setupLighting();
        this.setupShowroom();
        this.setupParticles();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    toggleRotation(bool) {
        this.isRotating = bool;
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambient);

        const mainSpot = new THREE.SpotLight(0xffffff, 2.5);
        mainSpot.position.set(5, 12, 5);
        mainSpot.castShadow = true;
        mainSpot.shadow.mapSize.set(2048, 2048);
        this.scene.add(mainSpot);

        const blueRim = new THREE.SpotLight(0x0066ff, 5);
        blueRim.position.set(-5, 2, -5);
        blueRim.lookAt(0, 0, 0);
        this.scene.add(blueRim);

        const redRim = new THREE.SpotLight(0xe10600, 5);
        redRim.position.set(5, 2, -5);
        redRim.lookAt(0, 0, 0);
        this.scene.add(redRim);
    }

    setupShowroom() {
        this.floorGroup = new THREE.Group();
        this.scene.add(this.floorGroup);

        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(20, 64),
            new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.5, roughness: 0.1 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.floorGroup.add(floor);

        this.platform = new THREE.Group();
        this.scene.add(this.platform);

        const platformHeight = 0.2;
        const platGeo = new THREE.CylinderGeometry(4.5, 4.8, platformHeight, 64);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
        const platformMesh = new THREE.Mesh(platGeo, platMat);
        platformMesh.position.y = platformHeight / 2;
        platformMesh.receiveShadow = true;
        this.floorGroup.add(platformMesh);

        this.platformTopY = platformHeight;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(4.8, 0.05, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0xe10600 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.15;
        this.floorGroup.add(ring);
    }

    setupParticles() {
        const count = 300;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 30;

        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.particles = new THREE.Points(
            geom,
            new THREE.PointsMaterial({ size: 0.05, color: 0xffffff, opacity: 0.3, transparent: true })
        );
        this.scene.add(this.particles);
    }

    async loadCarModel(modelPath, onProgress) {
        return new Promise((resolve, reject) => {
            if (!modelPath) {
                this.createPlaceholderCar();

                let p = 0;
                const i = setInterval(() => {
                    p += 0.1;
                    if (onProgress) onProgress(p);
                    if (p >= 1) { clearInterval(i); resolve(); }
                }, 50);
                return;
            }

            const loader = new GLTFLoader();
            loader.load(modelPath, (gltf) => {
                this.car = gltf.scene;

                this.car.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material) node.material.envMapIntensity = 1.0;
                    }
                });

                this.car.rotation.y = Math.PI;

                // Step 1: Reset position to origin before any calculations
                this.car.position.set(0, 0, 0);

                // Step 2: Get initial bounding box to determine size
                const box = new THREE.Box3().setFromObject(this.car);
                const size = box.getSize(new THREE.Vector3());

                // Step 3: Scale to fit platform
                const scaleFactor = 4.8 / Math.max(size.x, size.z);
                this.car.scale.setScalar(scaleFactor);

                // Step 4: Recalculate bounding box AFTER scaling
                box.setFromObject(this.car);
                const center = box.getCenter(new THREE.Vector3());

                // Step 5: Center horizontally (X and Z)
                this.car.position.x = -center.x;
                this.car.position.z = -center.z;

                // Step 6: Recalculate bounding box AFTER repositioning X/Z
                // This is critical because moving the car changes the bounding box
                box.setFromObject(this.car);

                // Step 7: Ground the car on the platform
                // box.min.y is now the world-space bottom of the car (bottom of tires)
                // We want that bottom to sit exactly at platformTopY (0.2)
                this.car.position.y = this.platformTopY - box.min.y;

                this.platform.add(this.car);
                resolve(this.car);
            },
            (xhr) => { if (xhr.lengthComputable && onProgress) onProgress(xhr.loaded / xhr.total); },
            (err) => reject(err));
        });
    }

    createPlaceholderCar() {
        this.car = new THREE.Group();

        const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xe10600, metalness: 0.6, roughness: 0.2 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });

        // Body - positioned so bottom of body sits above wheel tops
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 3.5), carBodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        this.car.add(body);

        // Wheels
        const wheelRadius = 0.35;
        const wheelPositions = [
            { x: 0.9, z: 1.2 },
            { x: -0.9, z: 1.2 },
            { x: 0.95, z: -1.2 },
            { x: -0.95, z: -1.2 }
        ];
        this.wheels = [];

        wheelPositions.forEach(pos => {
            const grp = new THREE.Group();
            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 32),
                tireMat
            );
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            grp.add(tire);

            // Position wheel group so tire center is at wheelRadius height
            // This means tire bottom touches y=0 of the car group
            grp.position.set(pos.x, wheelRadius, pos.z);
            this.wheels.push(grp);
            this.car.add(grp);
        });

        this.carBodyMaterial = carBodyMaterial;

        // Place car group on platform
        // The car's local y=0 is the bottom of the tires
        // Platform top is at this.platformTopY (0.2)
        this.car.position.y = this.platformTopY;
        this.platform.add(this.car);
    }

    // --- Interaction Methods ---
    setCarColor(colorHex) {
        if (!this.carBodyMaterial && this.car) {
            this.car.traverse(c => {
                if (c.isMesh && c.material && (c.material.name.toLowerCase().includes('body') || c.material.name.toLowerCase().includes('paint'))) {
                    gsap.to(c.material.color, { r: new THREE.Color(colorHex).r, g: new THREE.Color(colorHex).g, b: new THREE.Color(colorHex).b, duration: 0.5 });
                }
            });
            return;
        }
        if (this.carBodyMaterial) {
            const c = new THREE.Color(colorHex);
            gsap.to(this.carBodyMaterial.color, { r: c.r, g: c.g, b: c.b, duration: 0.5 });
        }
    }

    setCarMaterial(type) {
        let m = 0.5, r = 0.5;
        if (type === 'glossy') { m = 0.6; r = 0.1; }
        if (type === 'matte') { m = 0.1; r = 0.9; }
        if (type === 'metallic') { m = 1.0; r = 0.2; }

        if (this.carBodyMaterial) {
            gsap.to(this.carBodyMaterial, { metalness: m, roughness: r, duration: 0.5 });
        }
    }

    setCameraPosition(key) {
        const data = this.cameraPositions[key];
        if (!data) return;
        gsap.to(this.camera.position, { x: data.position.x, y: data.position.y, z: data.position.z, duration: 1.5, ease: "power2.inOut" });
        gsap.to(this.controls.target, { x: data.target.x, y: data.target.y, z: data.target.z, duration: 1.5, ease: "power2.inOut", onUpdate: () => this.controls.update() });
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        const elapsed = this.clock.getElapsedTime();
        if (this.controls) this.controls.update();
        if (this.isRotating && this.platform) this.platform.rotation.y += this.rotationSpeed;
        if (this.particles) {
            this.particles.rotation.y = elapsed * 0.05;
            this.particles.position.y = Math.sin(elapsed * 0.3) * 0.5;
        }
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }
}