// js/scene.js

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.car = null;
        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        
        this.cameraPositions = {
            front: { position: { x: 0, y: 1.5, z: 6 }, target: { x: 0, y: 0.5, z: 0 } },
            side: { position: { x: 6, y: 1.5, z: 0 }, target: { x: 0, y: 0.5, z: 0 } },
            rear: { position: { x: 0, y: 1.5, z: -6 }, target: { x: 0, y: 0.5, z: 0 } },
            top: { position: { x: 0, y: 8, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            cockpit: { position: { x: 0, y: 1.2, z: 0.5 }, target: { x: 0, y: 1, z: 5 } },
            orbit: { position: { x: 5, y: 3, z: 5 }, target: { x: 0, y: 0.5, z: 0 } }
        };
        
        this.showroomLights = [];
        this.ambientParticles = [];
        this.isRotating = false;
        this.rotationSpeed = 0.005;
    }
    
    async init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 3, 8);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        // Create orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.target.set(0, 0.5, 0);
        
        // Setup lighting
        this.setupLighting();
        
        // Setup showroom environment
        this.setupShowroom();
        
        // Setup particles
        this.setupParticles();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);
        
        // Main spotlight (top)
        const mainSpot = new THREE.SpotLight(0xffffff, 2);
        mainSpot.position.set(0, 10, 0);
        mainSpot.angle = Math.PI / 4;
        mainSpot.penumbra = 0.5;
        mainSpot.decay = 2;
        mainSpot.distance = 50;
        mainSpot.castShadow = true;
        mainSpot.shadow.mapSize.width = 2048;
        mainSpot.shadow.mapSize.height = 2048;
        this.scene.add(mainSpot);
        this.showroomLights.push(mainSpot);
        
        // Red accent light (left)
        const redLight = new THREE.PointLight(0xe10600, 1, 20);
        redLight.position.set(-5, 3, 0);
        this.scene.add(redLight);
        this.showroomLights.push(redLight);
        
        // Blue accent light (right)
        const blueLight = new THREE.PointLight(0x0066ff, 0.5, 20);
        blueLight.position.set(5, 3, 0);
        this.scene.add(blueLight);
        this.showroomLights.push(blueLight);
        
        // Front fill light
        const frontFill = new THREE.DirectionalLight(0xffffff, 0.5);
        frontFill.position.set(0, 5, 10);
        this.scene.add(frontFill);
        
        // Rim lights
        const rimLight1 = new THREE.SpotLight(0xffffff, 1);
        rimLight1.position.set(-5, 5, -5);
        rimLight1.target.position.set(0, 0, 0);
        this.scene.add(rimLight1);
        this.scene.add(rimLight1.target);
        
        const rimLight2 = new THREE.SpotLight(0xffffff, 1);
        rimLight2.position.set(5, 5, -5);
        rimLight2.target.position.set(0, 0, 0);
        this.scene.add(rimLight2);
        this.scene.add(rimLight2.target);
    }
    
    setupShowroom() {
        // Floor
        const floorGeometry = new THREE.CircleGeometry(30, 64);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Turntable platform
        const platformGeometry = new THREE.CylinderGeometry(4, 4.2, 0.1, 64);
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.8,
            roughness: 0.2
        });
        this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
        this.platform.position.y = 0.05;
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);
        
        // Platform edge glow
        const edgeGeometry = new THREE.TorusGeometry(4, 0.02, 16, 100);
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xe10600 });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 0.1;
        this.scene.add(edge);
        
        // Grid helper
        const gridHelper = new THREE.GridHelper(30, 30, 0x333333, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
        
        // Background elements - abstract shapes
        this.createBackgroundElements();
    }
    
    createBackgroundElements() {
        // Create abstract geometric shapes in background
        const shapes = [];
        
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.BoxGeometry(
                Math.random() * 2 + 0.5,
                Math.random() * 5 + 2,
                Math.random() * 2 + 0.5
            );
            const material = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                metalness: 0.9,
                roughness: 0.3,
                transparent: true,
                opacity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            const angle = (i / 20) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            mesh.position.set(
                Math.cos(angle) * radius,
                Math.random() * 3,
                Math.sin(angle) * radius
            );
            mesh.rotation.y = Math.random() * Math.PI;
            
            shapes.push(mesh);
            this.scene.add(mesh);
        }
        
        this.backgroundShapes = shapes;
    }
    
    setupParticles() {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
            
            // Red or white particles
            if (Math.random() > 0.7) {
                colors[i * 3] = 0.88;
                colors[i * 3 + 1] = 0.02;
                colors[i * 3 + 2] = 0;
            } else {
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 1;
            }
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
async loadCarModel(modelPath, onProgress) {
    return new Promise((resolve, reject) => {
        if (!modelPath) {
            this.createPlaceholderCar();
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 0.05;
                if (progress >= 1) {
                    progress = 1;
                    clearInterval(interval);
                    resolve();
                }
                onProgress(progress);
            }, 50);
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            modelPath,
            (gltf) => {
                this.car = gltf.scene;

                this.car.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.metalness = mat.metalness !== undefined ? mat.metalness : 0.5;
                                    mat.roughness = mat.roughness !== undefined ? mat.roughness : 0.5;
                                });
                            } else {
                                child.material.metalness = child.material.metalness !== undefined ? child.material.metalness : 0.5;
                                child.material.roughness = child.material.roughness !== undefined ? child.material.roughness : 0.5;
                            }
                        }
                    }
                });

                // ✅ FIXED: Perfect centering for nested objects
                // Temporarily add to root scene to calculate true world bounds
                this.scene.add(this.car);

                const box = new THREE.Box3().setFromObject(this.car);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Scale to standard showroom size
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                this.car.scale.setScalar(scale);

                // Recenter perfectly at origin
                this.car.position.sub(center.multiplyScalar(scale));

                // Automatically fix model facing direction
                // Most sketchfab F1 models are exported backwards
                this.car.rotation.y = Math.PI;

                // Small lift to prevent z-fighting with floor
                this.car.position.y += 0.1;

                // Now safely move into platform group
                this.scene.remove(this.car);
                this.platform.add(this.car);

                console.log('Car loaded and centered correctly');
                resolve();
            },
            (xhr) => {
                if (xhr.lengthComputable) {
                    const progress = xhr.loaded / xhr.total;
                    onProgress(progress);
                }
            },
            (error) => {
                console.error('Error loading model:', error);
                reject(error);
            }
        );
    });
}
    
    createPlaceholderCar() {
        // Create a simple F1 car shape as placeholder
        this.car = new THREE.Group();
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.4, 3);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xe10600,
            metalness: 0.9,
            roughness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        this.car.add(body);
        
        // Nose cone
        const noseGeometry = new THREE.ConeGeometry(0.3, 1.5, 4);
        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0xe10600,
            metalness: 0.9,
            roughness: 0.1
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 0.35, 2.25);
        nose.castShadow = true;
        this.car.add(nose);
        
        // Cockpit
        const cockpitGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.8);
        const cockpitMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.5,
            roughness: 0.5
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.7, 0.3);
        this.car.add(cockpit);
        
        // Halo
        const haloGeometry = new THREE.TorusGeometry(0.35, 0.03, 8, 16, Math.PI);
        const haloMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.2
        });
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        halo.rotation.x = Math.PI / 2;
        halo.rotation.z = Math.PI;
        halo.position.set(0, 0.85, 0.3);
        this.car.add(halo);
        
        // Front wing
        const frontWingGeometry = new THREE.BoxGeometry(2, 0.05, 0.4);
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2
        });
        const frontWing = new THREE.Mesh(frontWingGeometry, wingMaterial);
        frontWing.position.set(0, 0.15, 2.5);
        frontWing.castShadow = true;
        this.car.add(frontWing);
        
        // Rear wing
        const rearWingGeometry = new THREE.BoxGeometry(1.4, 0.4, 0.1);
        const rearWing = new THREE.Mesh(rearWingGeometry, wingMaterial);
        rearWing.position.set(0, 0.8, -1.4);
        rearWing.castShadow = true;
        this.car.add(rearWing);
        
        // Rear wing supports
        const supportGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.3);
        const support1 = new THREE.Mesh(supportGeometry, wingMaterial);
        support1.position.set(0.5, 0.6, -1.3);
        this.car.add(support1);
        
        const support2 = new THREE.Mesh(supportGeometry, wingMaterial);
        support2.position.set(-0.5, 0.6, -1.3);
        this.car.add(support2);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.3,
            roughness: 0.8
        });
        
        const tireMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.1,
            roughness: 0.9
        });
        
        // Wheel positions
        const wheelPositions = [
            { x: 0.8, y: 0.35, z: 1.5 },   // Front right
            { x: -0.8, y: 0.35, z: 1.5 },  // Front left
            { x: 0.85, y: 0.35, z: -1 },   // Rear right
            { x: -0.85, y: 0.35, z: -1 }   // Rear left
        ];
        
        this.wheels = [];
        wheelPositions.forEach((pos, index) => {
            const wheel = new THREE.Group();
            
            // Tire
            const tireGeometry = new THREE.TorusGeometry(0.35, 0.12, 16, 32);
            const tire = new THREE.Mesh(tireGeometry, tireMaterial);
            tire.rotation.y = Math.PI / 2;
            wheel.add(tire);
            
            // Rim
            const rimGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
            const rimMaterial = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.9,
                roughness: 0.1
            });
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            wheel.add(rim);
            
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            
            this.wheels.push(wheel);
            this.car.add(wheel);
        });
        
        // Sidepods
        const sidepodGeometry = new THREE.BoxGeometry(0.3, 0.25, 1.2);
        const sidepodMaterial = new THREE.MeshStandardMaterial({
            color: 0xe10600,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const sidepod1 = new THREE.Mesh(sidepodGeometry, sidepodMaterial);
        sidepod1.position.set(0.6, 0.35, 0);
        sidepod1.castShadow = true;
        this.car.add(sidepod1);
        
        const sidepod2 = new THREE.Mesh(sidepodGeometry, sidepodMaterial);
        sidepod2.position.set(-0.6, 0.35, 0);
        sidepod2.castShadow = true;
        this.car.add(sidepod2);
        
        // Engine cover / airbox
        const airboxGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.3);
        const airbox = new THREE.Mesh(airboxGeometry, bodyMaterial);
        airbox.position.set(0, 0.8, -0.2);
        airbox.castShadow = true;
        this.car.add(airbox);
        
        // Position car on platform
        this.car.position.y = 0.1;
        this.platform.add(this.car);
        
        // Store body material for color changes
        this.carBodyMaterial = bodyMaterial;
    }
    
    setCarColor(colorHex) {
        if (!this.car) return;
        
        this.car.traverse((child) => {
            if (child.isMesh && child.material) {
                const color = new THREE.Color(colorHex);
                
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.color) {
                            gsap.to(mat.color, {
                                r: color.r,
                                g: color.g,
                                b: color.b,
                                duration: 0.5,
                                ease: 'power2.out'
                            });
                        }
                    });
                } else {
                    if (child.material.color) {
                        gsap.to(child.material.color, {
                            r: color.r,
                            g: color.g,
                            b: color.b,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    }
                }
            }
        });
    }
    
    setCarMaterial(type) {
        if (!this.car) return;
        
        const matProps = {
            glossy: { metalness: 0.9, roughness: 0.1, color: null },
            matte: { metalness: 0.3, roughness: 0.8, color: null },
            chrome: { metalness: 1.0, roughness: 0.0, color: 0xb4b4b4 },
            carbon: { metalness: 0.5, roughness: 0.4, color: 0x1a1a1a }
        };
        
        const props = matProps[type];
        if (!props) return;
        
        this.car.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                
                materials.forEach(mat => {
                    gsap.to(mat, {
                        metalness: props.metalness,
                        roughness: props.roughness,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                    
                    if (props.color && mat.color) {
                        const color = new THREE.Color(props.color);
                        gsap.to(mat.color, {
                            r: color.r,
                            g: color.g,
                            b: color.b,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    }
                });
            }
        });
    }
    
    setCameraPosition(positionName) {
        const pos = this.cameraPositions[positionName];
        if (!pos) return;
        
        gsap.to(this.camera.position, {
            x: pos.position.x,
            y: pos.position.y,
            z: pos.position.z,
            duration: 1.5,
            ease: 'power2.inOut'
        });
        
        gsap.to(this.controls.target, {
            x: pos.target.x,
            y: pos.target.y,
            z: pos.target.z,
            duration: 1.5,
            ease: 'power2.inOut'
        });
    }
    
    toggleRotation(enabled) {
        this.isRotating = enabled;
    }
    
    setRotationSpeed(speed) {
        this.rotationSpeed = speed;
    }
    
    resetCamera() {
        this.setCameraPosition('orbit');
    }
    
    zoomIn() {
        const direction = new THREE.Vector3();
        direction.subVectors(this.controls.target, this.camera.position).normalize();
        
        gsap.to(this.camera.position, {
            x: this.camera.position.x + direction.x * 2,
            y: this.camera.position.y + direction.y * 2,
            z: this.camera.position.z + direction.z * 2,
            duration: 0.5,
            ease: 'power2.out'
        });
    }
    
    zoomOut() {
        const direction = new THREE.Vector3();
        direction.subVectors(this.controls.target, this.camera.position).normalize();
        
        gsap.to(this.camera.position, {
            x: this.camera.position.x - direction.x * 2,
            y: this.camera.position.y - direction.y * 2,
            z: this.camera.position.z - direction.z * 2,
            duration: 0.5,
            ease: 'power2.out'
        });
    }
    
    setLightingPreset(preset) {
        const presets = {
            studio: [2, 1, 0.5],
            dramatic: [3, 2, 0.2],
            soft: [1, 0.5, 0.5],
            night: [0.5, 1.5, 1]
        };
        
        const intensities = presets[preset];
        if (!intensities) return;
        
        this.showroomLights.forEach((light, index) => {
            if (index < intensities.length) {
                gsap.to(light, {
                    intensity: intensities[index],
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        });
    }
    
    toggleWireframe(enabled) {
        if (this.car) {
            this.car.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.wireframe = enabled);
                    } else {
                        child.material.wireframe = enabled;
                    }
                }
            });
        }
    }
    
    explodeView(enabled) {
        if (!this.car) return;
        
        const explodeDistance = enabled ? 0.5 : 0;
        
        this.car.traverse((child) => {
            if (child.isMesh) {
                if (!child.userData.originalPosition) {
                    child.userData.originalPosition = child.position.clone();
                }
                
                const direction = new THREE.Vector3();
                direction.copy(child.userData.originalPosition).normalize();
                
                const targetX = child.userData.originalPosition.x + direction.x * explodeDistance;
                const targetY = child.userData.originalPosition.y + direction.y * explodeDistance;
                const targetZ = child.userData.originalPosition.z + direction.z * explodeDistance;
                
                gsap.to(child.position, {
                    x: targetX,
                    y: targetY,
                    z: targetZ,
                    duration: 1,
                    ease: 'power2.out'
                });
            }
        });
    }
    
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'f1-car-screenshot.png';
        link.href = dataURL;
        link.click();
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    update() {
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        
        // Update controls
        this.controls.update();
        
        // Rotate car if enabled
        if (this.isRotating && this.car) {
            this.car.rotation.y += this.rotationSpeed;
        }
        
        // Rotate platform
        if (this.isRotating && this.platform) {
            this.platform.rotation.y += this.rotationSpeed;
        }
        
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(elapsed + i) * 0.001;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += 0.0002;
        }
        
        // Animate background shapes
        if (this.backgroundShapes) {
            this.backgroundShapes.forEach((shape, index) => {
                shape.rotation.y += 0.001;
                shape.position.y = Math.sin(elapsed * 0.5 + index) * 0.2 + shape.userData.baseY || shape.position.y;
                if (!shape.userData.baseY) {
                    shape.userData.baseY = shape.position.y;
                }
            });
        }
        
        // Animate showroom lights
        this.showroomLights.forEach((light, index) => {
            if (light.isPointLight) {
                if (!light.userData.baseIntensity) {
                    light.userData.baseIntensity = light.intensity;
                }
                light.intensity = light.userData.baseIntensity + Math.sin(elapsed * 2 + index) * 0.2;
            }
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        this.renderer.dispose();
        this.controls.dispose();
        
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        window.removeEventListener('resize', this.onWindowResize);
    }
}