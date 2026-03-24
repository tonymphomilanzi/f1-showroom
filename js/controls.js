import * as THREE from 'three';

const CONFIG = {
    MAX_SPEED: 372,        // km/h
    ACCELERATION: 75,      // m/s^2
    DECELERATION: 40,      // Rolling resistance
    BRAKE_FORCE: 120,      // Stopping power
    REVERSE_SPEED: 80,     // Max reverse
    MAX_STEER: 0.6,        // Max wheel turn angle
    STEER_SPEED: 5.0,      // How fast steering returns to center
    DRIFT_SLIP: 0.96,      // Higher = more sliding
    BODY_ROLL_MAX: 0.08,   // Visual tilt intensity
};

export class CarControls {
    constructor(car, sceneManager) {
        this.car = car;
        this.sceneManager = sceneManager;
        this.enabled = false;

        // Core Physics State
        this.speed = 0;
        this.velocity = new THREE.Vector3();
        this.steeringAngle = 0;
        this.rotationY = 0;
        
        // Engine State
        this.rpm = 1000;
        this.gear = 0;
        this.gearRatios = [0, 0.12, 0.25, 0.40, 0.55, 0.70, 0.82, 0.92, 1.0];

        // Visuals
        this.bodyRoll = 0;
        this.wheels = [];

        // Input Buffer
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            handbrake: false,
            boost: false
        };

        this.init();
    }

    init() {
        if (this.car) {
            this.rotationY = this.car.rotation.y;
            // Find wheels once to avoid traversing every frame
            this.car.traverse(obj => {
                if (obj.name.toLowerCase().includes('wheel')) {
                    this.wheels.push(obj);
                }
            });
        }
    }

    enable() {
        this.enabled = true;
        this.reset();
    }

    disable() {
        this.enabled = false;
        this.reset();
    }

    reset() {
        this.speed = 0;
        this.velocity.set(0, 0, 0);
        this.steeringAngle = 0;
        this.bodyRoll = 0;
        if (this.car) {
            this.car.rotation.z = 0; // Reset roll
            this.car.rotation.x = 0; // Reset pitch
        }
        Object.keys(this.keys).forEach(k => this.keys[k] = false);
    }

    handleKeyDown(e) {
        this._toggleKey(e.code, true);
    }

    handleKeyUp(e) {
        this._toggleKey(e.code, false);
    }

    _toggleKey(code, isPressed) {
        switch (code) {
            case 'ArrowUp':    case 'KeyW': this.keys.forward = isPressed; break;
            case 'ArrowDown':  case 'KeyS': this.keys.backward = isPressed; break;
            case 'ArrowLeft':  case 'KeyA': this.keys.left = isPressed; break;
            case 'ArrowRight': case 'KeyD': this.keys.right = isPressed; break;
            case 'Space':                   this.keys.handbrake = isPressed; break;
            case 'ShiftLeft':               this.keys.boost = isPressed; break;
        }
    }

    update(delta) {
        if (!this.enabled || !this.car) return;

        this._updatePhysics(delta);
        this._updateVisuals(delta);
        this._updateEngineData();
        this._updateCamera(delta);
    }

    _updatePhysics(delta) {
        // 1. Longitudinal Forces (Accel / Brake)
        const isReversing = this.speed < 0;
        const currentMax = this.keys.boost ? CONFIG.MAX_SPEED * 1.1 : CONFIG.MAX_SPEED;

        if (this.keys.forward) {
            const force = isReversing ? CONFIG.BRAKE_FORCE : CONFIG.ACCELERATION;
            this.speed += force * delta;
        } else if (this.keys.backward) {
            const force = isReversing ? CONFIG.ACCELERATION * 0.5 : CONFIG.BRAKE_FORCE;
            this.speed -= force * delta;
        } else {
            // Natural Friction
            this.speed -= Math.sign(this.speed) * CONFIG.DECELERATION * delta;
            if (Math.abs(this.speed) < 1) this.speed = 0;
        }

        // Clamp Speed
        this.speed = THREE.MathUtils.clamp(this.speed, -CONFIG.REVERSE_SPEED, currentMax);

        // 2. Steering Logic
        // Speed-sensitive steering: harder to turn at high speeds
        const steerSpeedFactor = THREE.MathUtils.clamp(1 - (Math.abs(this.speed) / (CONFIG.MAX_SPEED * 0.8)), 0.2, 1.0);
        const targetSteer = (this.keys.left ? 1 : 0) - (this.keys.right ? 1 : 0);
        
        this.steeringAngle = THREE.MathUtils.lerp(
            this.steeringAngle, 
            targetSteer * CONFIG.MAX_STEER * steerSpeedFactor, 
            CONFIG.STEER_SPEED * delta
        );

        // 3. Rotation and Drift
        if (Math.abs(this.speed) > 1) {
            const direction = this.speed > 0 ? 1 : -1;
            const turnRadius = this.steeringAngle * (Math.abs(this.speed) / 150) * direction;
            
            // Handbrake "Slip" logic
            const slip = this.keys.handbrake ? CONFIG.DRIFT_SLIP : 1.0;
            this.rotationY += turnRadius * slip;
            this.car.rotation.y = this.rotationY;
        }

        // 4. Movement Vector
        const speedMS = this.speed / 3.6;
        this.velocity.set(
            Math.sin(this.rotationY) * speedMS,
            0,
            Math.cos(this.rotationY) * speedMS
        );

        this.car.position.addScaledVector(this.velocity, delta);
    }

    _updateVisuals(delta) {
        // 1. Wheel Rotation (Visual only)
        const wheelRollSpeed = (this.speed / 10);
        
        // Assuming your GLTF has wheel objects or you passed them in
        // Usually index 0,1 are front, 2,3 are rear
        this.wheels.forEach((wheel, i) => {
            wheel.rotation.x += wheelRollSpeed * delta;
            
            // Front wheel steering visual
            if (i < 2) {
                wheel.rotation.y = this.steeringAngle * 1.5;
            }
        });

        // 2. Body Roll (Chassis Tilt)
        // Tilt the car based on turn intensity and speed
        const rollTarget = -this.steeringAngle * (Math.abs(this.speed) / CONFIG.MAX_SPEED) * CONFIG.BODY_ROLL_MAX;
        this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, rollTarget, 5 * delta);
        this.car.rotation.z = this.bodyRoll;
        
        // 3. Pitch (Nose dive on brake)
        const pitchTarget = this.keys.forward ? -0.01 : (this.keys.backward ? 0.02 : 0);
        this.car.rotation.x = THREE.MathUtils.lerp(this.car.rotation.x, pitchTarget, 4 * delta);
    }

    _updateEngineData() {
        const absSpeed = Math.abs(this.speed);
        const speedRatio = absSpeed / CONFIG.MAX_SPEED;

        // Gear calculation
        if (this.speed < -1) this.gear = -1;
        else if (absSpeed < 1) this.gear = 0;
        else {
            this.gear = this.gearRatios.findIndex(ratio => speedRatio <= ratio);
            if (this.gear === -1) this.gear = 8;
        }

        // RPM simulation
        if (this.gear > 0) {
            const min = this.gearRatios[this.gear - 1];
            const max = this.gearRatios[this.gear];
            const gearPercent = (speedRatio - min) / (max - min);
            this.rpm = THREE.MathUtils.lerp(3000, 15000, gearPercent) + (Math.random() * 50);
        } else {
            this.rpm = this.keys.forward ? 4000 : 1000 + (Math.random() * 100);
        }
    }

    _updateCamera(delta) {
        if (!this.sceneManager?.camera || !this.sceneManager?.controls) return;

        const camera = this.sceneManager.camera;
        const controls = this.sceneManager.controls;
        
        // Smoothly follow behind the car
        const cameraDistance = 7.5 + (this.speed / 100); // Zoom out slightly at speed
        const cameraHeight = 2.2;
        
        // Calculate offset position based on car rotation
        const offset = new THREE.Vector3(
            -Math.sin(this.rotationY) * cameraDistance,
            cameraHeight,
            -Math.cos(this.rotationY) * cameraDistance
        );

        const idealPosition = this.car.position.clone().add(offset);
        
        // Lerp camera position for "soft" follow
        camera.position.lerp(idealPosition, 5 * delta);

        // Look slightly ahead of the car for racing feel
        const lookAtOffset = new THREE.Vector3(
            Math.sin(this.rotationY) * 10,
            1.0,
            Math.cos(this.rotationY) * 10
        );
        const target = this.car.position.clone().add(lookAtOffset);
        
        controls.target.lerp(target, 8 * delta);
        controls.update();
    }

    // UI Helpers
    getDisplaySpeed() { return Math.abs(Math.round(this.speed)); }
    getDisplayRPM() { return Math.round(this.rpm); }
    getGear() { 
        if (this.gear === 0) return 'N';
        if (this.gear === -1) return 'R';
        return this.gear;
    }
}