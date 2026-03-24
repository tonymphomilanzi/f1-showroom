
export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.car = null;
        this.wheels = []; // Store wheel references for rotation
        this.clock = new THREE.Clock();
        
        // Defined Camera Views
        this.cameraPositions = {
            front: { position: { x: 0, y: 1.5, z: 6 }, target: { x: 0, y: 0.5, z: 0 } },
            side: { position: { x: 6, y: 1.5, z: 0 }, target: { x: 0, y: 0.5, z: 0 } },
            rear: { position: { x: 0, y: 1.5, z: -6 }, target: { x: 0, y: 0.5, z: 0 } },
            top: { position: { x: 0, y: 8, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            cockpit: { position: { x: 0, y: 1.05, z: -0.5 }, target: { x: 0, y: 0.9, z: 3 } }, // Adjusted for F1 low seating
            orbit: { position: { x: 5, y: 3, z: 5 }, target: { x: 0, y: 0.5, z: 0 } }
        };
        
        this.showroomLights = [];
        this.isRotating = false;
        this.rotationSpeed = 0.005;
    }
    
    async init() {
        // 1. Create Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 40);
        
        // 2. Create Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 3, 8);
        
        // 3. Create Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // 4. Environment (Critical for Car Reflections)
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        
        // 5. Create Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going under floor
        this.controls.target.set(0, 0.5, 0);
        
        // 6. Setup Scene Elements
        this.setupLighting();
        this.setupShowroom();
        this.setupParticles();
        
        // 7. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // Ambient - low base light
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambient);
        
        // Key Light (Spot)
        const mainSpot = new THREE.SpotLight(0xffffff, 2);
        mainSpot.position.set(5, 12, 5);
        mainSpot.angle = Math.PI / 4;
        mainSpot.penumbra = 0.3;
        mainSpot.decay = 2;
        mainSpot.distance = 50;
        mainSpot.castShadow = true;
        mainSpot.shadow.bias = -0.0001; // Fix shadow acne on car
        mainSpot.shadow.mapSize.width = 2048;
        mainSpot.shadow.mapSize.height = 2048;
        this.scene.add(mainSpot);
        this.showroomLights.push(mainSpot);
        
        // Rim Light (Blue)
        const blueRim = new THREE.SpotLight(0x0066ff, 5);
        blueRim.position.set(-5, 2, -5);
        blueRim.lookAt(0,0,0);
        this.scene.add(blueRim);
        
        // Rim Light (Red)
        const redRim = new THREE.SpotLight(0xe10600, 5);
        redRim.position.set(5, 2, -5);
        redRim.lookAt(0,0,0);
        this.scene.add(redRim);
        
        // Fill Light
        const fillLight = new THREE.RectAreaLight(0xffffff, 1, 10, 10);
        fillLight.position.set(0, 5, 5);
        fillLight.lookAt(0, 0, 0);
        this.scene.add(fillLight);
    }
    
    setupShowroom() {
        // Floor Group
        this.floorGroup = new THREE.Group();
        this.scene.add(this.floorGroup);

        // 1. Dark Reflective Floor
        const floorGeo = new THREE.CircleGeometry(20, 64);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            metalness: 0.5,
            roughness: 0.1, // Shiny
            envMapIntensity: 1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.floorGroup.add(floor);
        
        // 2. Grid Helper (Subtle)
        const grid = new THREE.GridHelper(40, 40, 0x333333, 0x111111);
        grid.position.y = 0.01;
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.floorGroup.add(grid);

        // 3. Platform (The Rotating Stage)
        this.platform = new THREE.Group();
        this.scene.add(this.platform);

        // Platform base visual
        const platGeo = new THREE.CylinderGeometry(4.5, 4.8, 0.2, 64);
        const platMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2
        });
        const platformMesh = new THREE.Mesh(platGeo, platMat);
        platformMesh.position.y = 0.1;
        platformMesh.receiveShadow = true;
        this.floorGroup.add(platformMesh);

        // Glowing Ring
        const ringGeo = new THREE.TorusGeometry(4.8, 0.05, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xe10600 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.15;
        this.floorGroup.add(ring);
    }
    
    setupParticles() {
        const count = 300;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        
        for(let i=0; i<count*3; i++) {
            pos[i] = (Math.random() - 0.5) * 30;
        }
        
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.05,
            color: 0xffffff,
            transparent: true,
            opacity: 0.4
        });
        
        this.particles = new THREE.Points(geom, mat);
        this.scene.add(this.particles);
    }
    
    async loadCarModel(modelPath, onProgress) {
        return new Promise((resolve, reject) => {
            if (!modelPath) {
                // If no path provided, use internal placeholder
                this.createPlaceholderCar();
                
                // Simulate loading for UI
                let p = 0;
                const i = setInterval(() => {
                    p += 0.1;
                    onProgress(p);
                    if(p>=1) { clearInterval(i); resolve(); }
                }, 50);
                return;
            }
            
            const loader = new GLTFLoader();
            
            loader.load(
                modelPath,
                (gltf) => {
                    this.car = gltf.scene;
                    
                    // 1. Shadow & Material Setup
                    this.car.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            
                            // Enhance materials if they exist
                            if(node.material) {
                                node.material.envMapIntensity = 1.0; // Ensure reflections
                                node.material.needsUpdate = true;
                            }
                        }
                    });

                    // 2. Rotation Fix (Many F1 models face backwards)
                    // Rotate BEFORE calculating bounding box to get correct X/Z dimensions
                    this.car.rotation.y = Math.PI;

                    // 3. Scaling & Centering Logic (The Fix for Sinking)
                    const box = new THREE.Box3().setFromObject(this.car);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());

                    // Scale to fit stage (approx 5 units long)
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scaleFactor = 5 / maxDim;
                    this.car.scale.setScalar(scaleFactor);

                    // Re-calculate box after scaling
                    box.setFromObject(this.car);
                    box.getCenter(center);
                    
                    // A. Center X and Z on the platform
                    this.car.position.x -= center.x;
                    this.car.position.z -= center.z;

                    // B. Fix Y Height (Crucial Step)
                    // Calculate distance from center.y to min.y (the bottom of wheels)
                    const bottomY = box.min.y;
                    
                    // Shift entire car up by that amount so min.y becomes 0
                    this.car.position.y -= bottomY;
                    
                    // Add tiny offset to sit ON the floor, not IN it
                    this.car.position.y += 0.2; // 0.2 to sit on top of the 0.2 high platform

                    // Add to rotating platform group
                    this.platform.add(this.car);
                    
                    resolve(this.car);
                },
                (xhr) => {
                    if (xhr.lengthComputable) {
                        onProgress(xhr.loaded / xhr.total);
                    }
                },
                (err) => reject(err)
            );
        });
    }

    createPlaceholderCar() {
        this.car = new THREE.Group();
        
        // Materials
        this.carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xe10600, metalness: 0.7, roughness: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.5 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });

        // Chassis
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 3.5), this.carBodyMaterial);
        body.position.y = 0.5; // Lift body
        body.castShadow = true;
        this.car.add(body);

        // Cockpit
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.0), darkMat);
        cockpit.position.set(0, 0.7, 0.2);
        this.car.add(cockpit);

        // Wings
        const fWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.5), darkMat);
        fWing.position.set(0, 0.2, 2.0);
        fWing.castShadow = true;
        this.car.add(fWing);

        const rWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.4), darkMat);
        rWing.position.set(0, 1.0, -1.6);
        rWing.castShadow = true;
        this.car.add(rWing);

        // Wheels
        const wheelRadius = 0.35;
        const wheelPositions = [
            { x: 0.9, z: 1.2 }, { x: -0.9, z: 1.2 }, // Front
            { x: 0.95, z: -1.2 }, { x: -0.95, z: -1.2 } // Rear
        ];

        this.wheels = []; // Clear array

        wheelPositions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            // Tire Mesh
            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 32),
                tireMat
            );
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            // Rim Mesh
            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(wheelRadius * 0.7, wheelRadius * 0.7, 0.31, 16),
                rimMat
            );
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            // Positioning:
            // Y position = wheelRadius. This puts the bottom of the tire exactly at 0 local Y.
            // Since we add this to 'this.car', and 'this.car' sits on the platform...
            wheelGroup.position.set(pos.x, wheelRadius, pos.z);
            
            this.wheels.push(wheelGroup);
            this.car.add(wheelGroup);
        });

        // Add to platform (Platform is at Y=0.1, visual height 0.2)
        // We lift the car slightly so tires touch the top of the platform
        this.car.position.y = 0.2; 
        this.platform.add(this.car);
    }
    
    // --- Interaction Methods ---

    setCarColor(colorHex) {
        if (!this.carBodyMaterial) {
            // If loaded model, traverse and find body parts (heuristics)
            if(this.car) {
                this.car.traverse(c => {
                    if(c.isMesh && c.material && c.material.name.toLowerCase().includes('body')) {
                        gsap.to(c.material.color, { r: new THREE.Color(colorHex).r, g: new THREE.Color(colorHex).g, b: new THREE.Color(colorHex).b, duration: 0.5 });
                    }
                });
            }
            return;
        }
        
        // If placeholder
        const c = new THREE.Color(colorHex);
        gsap.to(this.carBodyMaterial.color, {
            r: c.r, g: c.g, b: c.b,
            duration: 0.5
        });
    }

    setCarMaterial(type) {
        // Logic to swap roughness/metalness
        let m = 0.5, r = 0.5;
        if(type === 'glossy') { m = 0.7; r = 0.1; }
        if(type === 'matte') { m = 0.1; r = 0.9; }
        if(type === 'metallic') { m = 1.0; r = 0.2; }

        if (this.carBodyMaterial) {
            gsap.to(this.carBodyMaterial, { metalness: m, roughness: r, duration: 0.5 });
        }
    }

    setCameraPosition(key) {
        const data = this.cameraPositions[key];
        if(!data) return;

        // Use GSAP to animate camera and controls target together
        gsap.to(this.camera.position, {
            x: data.position.x, y: data.position.y, z: data.position.z,
            duration: 1.2,
            ease: "power2.inOut"
        });

        gsap.to(this.controls.target, {
            x: data.target.x, y: data.target.y, z: data.target.z,
            duration: 1.2,
            ease: "power2.inOut",
            onUpdate: () => this.controls.update() // Keep orbit controls synced
        });
    }

    cycleCamera() {
        // Helper for keyboard controls
        const keys = Object.keys(this.cameraPositions);
        let current = keys.findIndex(k => 
            Math.abs(this.camera.position.x - this.cameraPositions[k].position.x) < 0.5
        );
        let next = (current + 1) % keys.length;
        this.setCameraPosition(keys[next]);
    }

    // --- Update Loop ---

    update() {
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        
        // 1. Controls
        if (this.controls.enabled) this.controls.update();

        // 2. Platform Rotation (Showroom Mode)
        if (this.isRotating && this.platform) {
            this.platform.rotation.y += this.rotationSpeed;
        }

        // 3. Floating Particles
        if (this.particles) {
            this.particles.rotation.y = elapsed * 0.05;
            // Gentle wave effect
            this.particles.position.y = Math.sin(elapsed * 0.5) * 0.5;
        }
        
        // 4. Render
        this.renderer.render(this.scene, this.camera);
    }
    
    // Cleanup
    dispose() {
        this.renderer.dispose();
        // Traverse and dispose geometries/materials...
    }
}