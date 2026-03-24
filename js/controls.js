import * as THREE from 'three';

export class CarControls {
    constructor(car, sceneManager) {
        this.car = car;
        this.sceneManager = sceneManager;
        
        this.enabled = false;
        
        // Movement properties
        this.speed = 0;
        this.maxSpeed = 372; // km/h
        this.acceleration = 60; // Increased slightly for snappier feel
        this.deceleration = 30;
        this.brakeForce = 100;
        this.turnSpeed = 0;
        this.maxTurnSpeed = 2.5;
        
        // RPM and Gear
        this.rpm = 1000;
        this.maxRpm = 15000;
        this.gear = 0; // 0 = N, 1-8 = gears, -1 = R
        this.gearRatios = [0, 0.15, 0.28, 0.42, 0.55, 0.68, 0.79, 0.88, 1.0];
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            handbrake: false,
            boost: false
        };
        
        // Physics
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        
        // Boost
        this.boostActive = false;
        this.boostMultiplier = 1.8;
        
        // Drift
        this.isDrifting = false;
        this.driftFactor = 0;
        
        // Camera State
        this.cameraOffset = new THREE.Vector3();
    }

    enable() {
        this.enabled = true;
        this.reset();
    }

    disable() {
        this.enabled = false;
        this.reset();
        // Reset inputs to prevent stuck keys
        this.keys = { forward: false, backward: false, left: false, right: false, handbrake: false, boost: false };
    }

    reset() {
        this.speed = 0;
        this.rpm = 1000;
        this.gear = 0;
        this.turnSpeed = 0;
        this.rotation = 0;
        this.isDrifting = false;
        
        // Reset car rotation if car exists
        if(this.car) {
            this.rotation = this.car.rotation.y;
        }
    }

    handleKeyDown(event) {
        if (!this.enabled) return;

        switch (event.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.keys.forward = true;
                break;
            case 's':
            case 'arrowdown':
                this.keys.backward = true;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.left = true;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = true;
                break;
            case ' ':
                this.keys.handbrake = true;
                break;
            case 'shift':
                this.keys.boost = true;
                this.boostActive = true;
                break;
            case 'c': // Camera toggle
                if(this.sceneManager && this.sceneManager.cycleCamera) {
                    this.sceneManager.cycleCamera();
                }
                break;
        }
    }

    handleKeyUp(event) {
        if (!this.enabled) return;

        switch (event.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.keys.forward = false;
                break;
            case 's':
            case 'arrowdown':
                this.keys.backward = false;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = false;
                break;
            case ' ':
                this.keys.handbrake = false;
                break;
            case 'shift':
                this.keys.boost = false;
                this.boostActive = false;
                break;
        }
    }

    update(delta) {
        if (!this.enabled || !this.car) return;

        // --- Acceleration Logic ---
        if (this.keys.forward) {
            const accel = this.boostActive ? 
                this.acceleration * this.boostMultiplier : 
                this.acceleration;
            this.speed += accel * delta;
        } else if (this.keys.backward) {
            if (this.speed > 0) {
                // Braking
                this.speed -= this.brakeForce * delta;
            } else {
                // Reverse (Cap reverse speed)
                if(this.speed > -50) {
                    this.speed -= this.acceleration * 0.6 * delta;
                }
            }
        } else {
            // Natural deceleration (rolling resistance)
            if (this.speed > 0) {
                this.speed -= this.deceleration * delta;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.deceleration * delta;
                if (this.speed > 0) this.speed = 0;
            }
        }

        // --- Handbrake Logic ---
        if (this.keys.handbrake) {
            this.speed *= 0.95; // Rapid deceleration
            if(Math.abs(this.speed) > 30) {
                this.isDrifting = true;
                this.driftFactor = Math.min(this.driftFactor + delta * 2, 1);
            }
        } else {
            this.isDrifting = false;
            this.driftFactor = Math.max(this.driftFactor - delta * 3, 0);
        }

        // Clamp max speed
        const currentMaxSpeed = this.boostActive ? this.maxSpeed * 1.2 : this.maxSpeed;
        this.speed = Math.max(-60, Math.min(this.speed, currentMaxSpeed));

        // --- Steering Logic ---
        // Steering becomes less sensitive as speed increases
        const speedFactor = Math.min(Math.abs(this.speed) / 200, 1);
        const steerSensitivity = 3.0 - (speedFactor * 1.5); 

        if (this.keys.left) {
            this.turnSpeed += steerSensitivity * delta;
        } else if (this.keys.right) {
            this.turnSpeed -= steerSensitivity * delta;
        } else {
            // Return steering to center
            this.turnSpeed += (0 - this.turnSpeed) * 5 * delta;
        }

        // Clamp turn speed
        this.turnSpeed = Math.max(-this.maxTurnSpeed, Math.min(this.turnSpeed, this.maxTurnSpeed));

        // Apply rotation only if moving (or moving very slowly)
        if (Math.abs(this.speed) > 1) {
            // Direction multiplier: reverse steering when going backward
            const dir = this.speed > 0 ? 1 : -1;
            const turnAmount = this.turnSpeed * (Math.abs(this.speed) / this.maxSpeed) * 2.0 * delta * dir;
            
            // Apply drift to rotation
            const driftEffect = this.isDrifting ? this.driftFactor * (this.keys.left ? 0.5 : -0.5) : 0;
            
            this.rotation += turnAmount + driftEffect;
            this.car.rotation.y = this.rotation;
        }

        // --- Position Calculation ---
        const speedMs = this.speed / 3.6; // Convert km/h to m/s for physics
        
        // Calculate velocity vector based on rotation
        // driftFactor adds 'slip' to the movement vector vs the rotation vector
        const moveAngle = this.rotation - (this.turnSpeed * this.driftFactor * 0.2);
        
        this.velocity.x = Math.sin(moveAngle) * speedMs;
        this.velocity.z = Math.cos(moveAngle) * speedMs;

        // Apply movement
        this.car.position.x += this.velocity.x * delta;
        this.car.position.z += this.velocity.z * delta;

        // Update visuals
        this.updateWheels(delta);
        this.updateRPMAndGear();
        this.updateCameraFollow(delta);
    }

    updateWheels(delta) {
        if (!this.sceneManager || !this.sceneManager.wheels) return;

        // Wheel rotation speed (Visual only)
        const wheelRotation = (this.speed / 10) * delta;
        
        this.sceneManager.wheels.forEach((wheel, index) => {
            // Rotate wheels on X axis (Rolling)
            wheel.rotation.x += wheelRotation;

            // Steer front wheels (Index 0 and 1 usually)
            if (index < 2) { 
                // Visual steering angle
                const targetSteer = this.turnSpeed * 0.2;
                wheel.rotation.y = targetSteer;
            }
        });
    }

    updateRPMAndGear() {
        const absSpeed = Math.abs(this.speed);
        const speedPercent = absSpeed / this.maxSpeed;
        
        // --- Gear Logic ---
        if (this.speed < -1) {
            this.gear = -1; // Reverse
        } else if (absSpeed < 1) {
            this.gear = 0; // Neutral/Idle
        } else {
            // Simple automatic gear shifting based on speed percentage
            if (speedPercent < 0.10) this.gear = 1;
            else if (speedPercent < 0.22) this.gear = 2;
            else if (speedPercent < 0.35) this.gear = 3;
            else if (speedPercent < 0.48) this.gear = 4;
            else if (speedPercent < 0.60) this.gear = 5;
            else if (speedPercent < 0.75) this.gear = 6;
            else if (speedPercent < 0.88) this.gear = 7;
            else this.gear = 8;
        }

        // --- RPM Logic ---
        if (this.gear > 0) {
            // Calculate where we are in the current gear's range
            const prevRatio = this.gearRatios[this.gear - 1] || 0;
            const currentRatio = this.gearRatios[this.gear];
            const range = currentRatio - prevRatio;
            const progressInGear = (speedPercent - prevRatio) / range;
            
            // Map progress to RPM (approx 4000 to 15000)
            this.rpm = 4000 + (progressInGear * 11000);
            
            // Add some noise/jitter to RPM for realism
            this.rpm += (Math.random() - 0.5) * 100;
        } else if (this.gear === -1) {
            // Reverse RPM
            this.rpm = 2000 + (absSpeed / 50) * 6000;
        } else {
            // Idle RPM
            this.rpm = 1000 + (Math.random() * 100);
            // Rev engine if gas is pressed in neutral (optional, good for waiting at start)
            if(this.keys.forward) this.rpm = 4000;
        }

        // Clamp RPM
        this.rpm = Math.max(1000, Math.min(this.rpm, this.maxRpm));
    }

    updateCameraFollow(delta) {
        if (!this.sceneManager || !this.sceneManager.camera || !this.sceneManager.controls || !this.car) return;

        // Only hijack controls if we are in "Chase" mode (implied by driving enabled)
        // You might want to check a flag from SceneManager like `currentCam === 'chase'`
        
        const camera = this.sceneManager.camera;
        const controls = this.sceneManager.controls;
        const carPos = this.car.position;

        // Disable manual orbit controls
        controls.enabled = false;

        // 1. Calculate ideal camera position (behind and above car)
        // We use the car's rotation to place the camera behind it
        const dist = 7.0; // Distance behind
        const height = 2.5; // Height above
        
        // Add a bit of lag to the rotation for dynamic feel
        const angle = this.rotation; 
        
        const idealX = carPos.x - Math.sin(angle) * dist;
        const idealZ = carPos.z - Math.cos(angle) * dist;
        const idealY = carPos.y + height;

        const idealPos = new THREE.Vector3(idealX, idealY, idealZ);

        // 2. Smoothly move camera towards ideal position
        // Lower factor = smoother/sluggish, Higher = snappy
        const smoothFactor = 4.0 * delta; 
        camera.position.lerp(idealPos, smoothFactor);

        // 3. Set LookAt target
        // Look slightly ahead of the car
        const lookAheadDist = 5.0;
        const targetX = carPos.x + Math.sin(angle) * lookAheadDist;
        const targetZ = carPos.z + Math.cos(angle) * lookAheadDist;
        const targetPos = new THREE.Vector3(targetX, carPos.y + 1.0, targetZ);

        controls.target.lerp(targetPos, smoothFactor * 2);
        controls.update();
    }

    // --- Getters for UI ---

    getGearString() {
        if (this.gear === 0) return 'N';
        if (this.gear === -1) return 'R';
        return this.gear.toString();
    }

    getSpeedKmh() {
        return Math.abs(Math.round(this.speed));
    }

    getRpmPercent() {
        return (this.rpm / this.maxRpm) * 100;
    }
}