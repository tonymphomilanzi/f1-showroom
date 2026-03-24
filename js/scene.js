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
        
        // Camera presets
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
        this.rotationSpeed = 0.002; // Slower, more premium rotation
    }
    
    async init() {
        // 1. Create Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 40);
        
        // 2. Create Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(5, 3, 8);
        
        // 3. Create Renderer (Fixed for new Three.js version)
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // FIXED: New color space encoding
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; 
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        const container = document.getElementById('canvas-container');
        if(container) container.appendChild(this.renderer.domElement);

        // 4. Environment
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        
        // 5. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.target.set(0, 0.5, 0);
        
        // 6. Setup Content
        this.setupLighting();
        this.setupShowroom();
        this.setupParticles();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    // --- Missing Method Fixed Here ---
    toggleRotation(bool) {
        this.isRotating = bool;
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambient);
        
        const mainSpot = new THREE.SpotLight(0xffffff, 2.5);
        mainSpot.position.set(5, 12, 5);
        mainSpot.angle = Math.PI / 4;
        mainSpot.penumbra = 0.5;
        mainSpot.castShadow = true;
        mainSpot.shadow.bias = -0.0001; 
        mainSpot.shadow.mapSize.set(2048, 2048);
        this.scene.add(mainSpot);
        this.showroomLights.push(mainSpot);
        
        const blueRim = new THREE.SpotLight(0x0066ff, 5);
        blueRim.position.set(-5, 2, -5);
        blueRim.lookAt(0,0,0);
        this.scene.add(blueRim);
        
        const redRim = new THREE.SpotLight(0xe10600, 5);
        redRim.position.set(5, 2, -5);
        redRim.lookAt(0,0,0);
        this.scene.add(redRim);

        const rectLight = new THREE.RectAreaLight(0xffffff, 1, 10, 2);
        rectLight.position.set(0, 5, 0);
        rectLight.lookAt(0, 0, 0);
        this.scene.add(rectLight);
    }
    
    setupShowroom() {
        this.floorGroup = new THREE.Group();
        this.scene.add(this.floorGroup);

        // Floor
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(20, 64),
            new THREE.MeshStandardMaterial({ 
                color: 0x050505, 
                metalness: 0.5, 
                roughness: 0.1 
            })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.floorGroup.add(floor);
        
        // Platform Group
        this.platform = new THREE.Group();
        this.scene.add(this.platform);

        // Visual Platform Cylinder
        const platGeo = new THREE.CylinderGeometry(4.5, 4.8, 0.2, 64);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
        const platformMesh = new THREE.Mesh(platGeo, platMat);
        
        // Cylinder is 0.2 high. 
        // Position at Y=0.1 means it occupies Y=0.0 to Y=0.2.
        platformMesh.position.y = 0.1; 
        platformMesh.receiveShadow = true;
        this.floorGroup.add(platformMesh); // Add visual to static floor group

        // Glowing Ring
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
        for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * 30;
        
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
                
                // Fake loading for UI experience
                let p = 0;
                const i = setInterval(() => {
                    p += 0.1;
                    if(onProgress) onProgress(p);
                    if(p>=1) { clearInterval(i); resolve(); }
                }, 50);
                return;
            }
            
            const loader = new GLTFLoader();
            loader.load(modelPath, (gltf) => {
                this.car = gltf.scene;
                
                // Shadow & Env Map setup
                this.car.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if(node.material) node.material.envMapIntensity = 1.0;
                    }
                });

                // Correct Rotation
                this.car.rotation.y = Math.PI;

                // --- Height & Scale Calculation ---
                // 1. Scale relative to world
                const box = new THREE.Box3().setFromObject(this.car);
                const size = box.getSize(new THREE.Vector3());
                const scaleFactor = 4.8 / Math.max(size.x, size.z); // Fit to platform width
                this.car.scale.setScalar(scaleFactor);

                // 2. Re-measure after scaling
                box.setFromObject(this.car);
                const center = box.getCenter(new THREE.Vector3());
                
                // 3. Center X/Z
                this.car.position.x -= center.x;
                this.car.position.z -= center.z;

                // 4. Fix Height (Crucial Step)
                // box.min.y is the lowest point of the car (tires).
                // We want box.min.y to equal the top of the platform.
                // The platform visual is from Y=0 to Y=0.2. So Top is Y=0.2.
                
                // Move car down so its bottom is at 0
                this.car.position.y -= box.min.y;
                
                // Move car up to platform height
                this.car.position.y += 0.2;

                // Add to the rotating platform group
                this.platform.add(this.car);
                
                resolve(this.car);
            }, 
            (xhr) => { if (xhr.lengthComputable && onProgress) onProgress(xhr.loaded / xhr.total); },
            (err) => reject(err));
        });
    }

    createPlaceholderCar() {
        this.car = new THREE.Group();
        
        // Materials
        this.carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xe10600, metalness: 0.6, roughness: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.5 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 3.5), this.carBodyMaterial);
        body.position.y = 0.5; 
        body.castShadow = true;
        this.car.add(body);

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
        const wheelPositions = [{ x: 0.9, z: 1.2 }, { x: -0.9, z: 1.2 }, { x: 0.95, z: -1.2 }, { x: -0.95, z: -1.2 }];
        this.wheels = []; 

        wheelPositions.forEach(pos => {
            const grp = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 32), tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            grp.add(tire);
            
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.31, 16), rimMat);
            rim.rotation.z = Math.PI / 2;
            grp.add(rim);

            grp.position.set(pos.x, 0.35, pos.z); // Radius is 0.35, so center at 0.35 puts bottom at 0
            this.wheels.push(grp);
            this.car.add(grp);
        });

        // Place on platform (Platform top is at Y=0.2)
        this.car.position.y = 0.2; 
        this.platform.add(this.car);
    }
    
    // --- Interaction Methods ---
    setCarColor(colorHex) {
        if (!this.carBodyMaterial && this.car) {
            this.car.traverse(c => {
                // Heuristic to find body parts on imported models
                if(c.isMesh && c.material && (c.material.name.toLowerCase().includes('body') || c.material.name.toLowerCase().includes('paint'))) {
                    gsap.to(c.material.color, { r: new THREE.Color(colorHex).r, g: new THREE.Color(colorHex).g, b: new THREE.Color(colorHex).b, duration: 0.5 });
                }
            });
            return;
        }
        if(this.carBodyMaterial) {
            const c = new THREE.Color(colorHex);
            gsap.to(this.carBodyMaterial.color, { r: c.r, g: c.g, b: c.b, duration: 0.5 });
        }
    }

    setCarMaterial(type) {
        let m = 0.5, r = 0.5;
        if(type === 'glossy') { m = 0.6; r = 0.1; }
        if(type === 'matte') { m = 0.1; r = 0.9; }
        if(type === 'metallic') { m = 1.0; r = 0.2; }
        
        if (this.carBodyMaterial) {
            gsap.to(this.carBodyMaterial, { metalness: m, roughness: r, duration: 0.5 });
        }
    }

    setCameraPosition(key) {
        const data = this.cameraPositions[key];
        if(!data) return;
        gsap.to(this.camera.position, { x: data.position.x, y: data.position.y, z: data.position.z, duration: 1.5, ease: "power2.inOut" });
        gsap.to(this.controls.target, { x: data.target.x, y: data.target.y, z: data.target.z, duration: 1.5, ease: "power2.inOut", onUpdate: () => this.controls.update() });
    }
    
    onWindowResize() {
        if(!this.camera || !this.renderer) return;
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