// js/controls.js

export class CarControls {
    constructor(car, sceneManager) {
        this.car = car;
        this.sceneManager = sceneManager;
        
        this.enabled = false;
        
        // Movement properties
        this.speed = 0;
        this.maxSpeed = 372; // km/h
        this.acceleration = 50;
        this.deceleration = 30;
        this.brakeForce = 80;
        this.turnSpeed = 0;
        this.maxTurnSpeed = 2;
        
        // RPM and Gear
        this.rpm = 0;
        this.maxRpm = 15000;
        this.gear = 0; // 0 = N, 1-8 = gears, -1 = R
        this.gearRatios = [0, 0.2, 0.35, 0.5, 0.65, 0.78, 0.88, 0.95, 1.0];
        
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
        this.velocity = { x: 0, z: 0 };
        this.rotation = 0;
        this.wheelRotation = 0;
        
        // Boost
        this.boostActive = false;
        this.boostMultiplier = 1.5;
        
        // Drift
        this.isDrifting = false;
        this.driftFactor = 0;
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
        this.rpm = 0;
        this.gear = 0;
        this.turnSpeed = 0;
        this.velocity = { x: 0, z: 0 };
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            handbrake: false,
            boost: false
        };
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

        // Acceleration
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
                // Reverse
                this.speed -= this.acceleration * 0.5 * delta;
            }
        } else {
            // Natural deceleration
            if (this.speed > 0) {
                this.speed -= this.deceleration * delta;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.deceleration * delta;
                if (this.speed > 0) this.speed = 0;
            }
        }

        // Handbrake
        if (this.keys.handbrake) {
            this.speed *= 0.95;
            this.isDrifting = Math.abs(this.speed) > 50;
            this.driftFactor = Math.min(this.driftFactor + delta * 2, 1);
        } else {
            this.isDrifting = false;
            this.driftFactor = Math.max(this.driftFactor - delta * 3, 0);
        }

        // Clamp speed
        const maxSpd = this.boostActive ? this.maxSpeed * 1.2 : this.maxSpeed;
        this.speed = Math.max(-50, Math.min(this.speed, maxSpd));

        // Steering
        const speedFactor = Math.min(Math.abs(this.speed) / 100, 1);
        const steerSensitivity = 3 - speedFactor * 1.5; // Less sensitive at high speed

        if (this.keys.left) {
            this.turnSpeed += steerSensitivity * delta;
        } else if (this.keys.right) {
            this.turnSpeed -= steerSensitivity * delta;
        } else {
            // Return to center
            this.turnSpeed *= 0.9;
        }

        // Clamp turn speed
        this.turnSpeed = Math.max(-this.maxTurnSpeed, Math.min(this.turnSpeed, this.maxTurnSpeed));

        // Apply rotation based on speed
        if (Math.abs(this.speed) > 1) {
            const turnAmount = this.turnSpeed * (this.speed / this.maxSpeed) * delta;
            this.rotation += turnAmount;
            
            if (this.car) {
                this.car.rotation.y = this.rotation;
            }
        }

        // Calculate velocity
        const speedMs = this.speed / 3.6; // Convert km/h to m/s
        this.velocity.x = Math.sin(this.rotation) * speedMs;
        this.velocity.z = Math.cos(this.rotation) * speedMs;

        // Apply drift
        if (this.isDrifting) {
            const driftAngle = this.turnSpeed * this.driftFactor * 0.5;
            this.velocity.x += Math.sin(this.rotation + driftAngle) * speedMs * 0.3;
            this.velocity.z += Math.cos(this.rotation + driftAngle) * speedMs * 0.3;
        }

        // Move car
        if (this.car) {
            this.car.position.x += this.velocity.x * delta;
            this.car.position.z += this.velocity.z * delta;

            // Rotate wheels
            this.updateWheels(delta);
        }

        // Update RPM and gear
        this.updateRPMAndGear();

        // Update camera follow
        this.updateCameraFollow();
    }

    updateWheels(delta) {
        if (!this.sceneManager.wheels) return;

        const wheelRotationSpeed = (this.speed / 20) * delta;
        
        this.sceneManager.wheels.forEach((wheel, index) => {
            // Rotate wheels forward/backward
            wheel.rotation.x += wheelRotationSpeed;

            // Steer front wheels
            if (index < 2) { // Front wheels
                const steerAngle = this.turnSpeed * 0.3;
                wheel.rotation.y = steerAngle;
            }
        });
    }

    updateRPMAndGear() {
        // Calculate RPM based on speed and gear
        const speedPercent = Math.abs(this.speed) / this.maxSpeed;
        
        // Auto gear shifting
        if (this.speed <= 0) {
            this.gear = this.speed < -1 ? -1 : 0; // R or N
        } else {
            // Determine gear based on speed
            if (speedPercent < 0.15) this.gear = 1;
            else if (speedPercent < 0.25) this.gear = 2;
            else if (speedPercent < 0.38) this.gear = 3;
            else if (speedPercent < 0.52) this.gear = 4;
            else if (speedPercent < 0.66) this.gear = 5;
            else if (speedPercent < 0.80) this.gear = 6;
            else if (speedPercent < 0.92) this.gear = 7;
            else this.gear = 8;
        }

        // Calculate RPM
        if (this.gear > 0) {
            const gearRatio = this.gearRatios[this.gear];
            const gearSpeedRange = gearRatio - (this.gearRatios[this.gear - 1] || 0);
            const speedInGear = speedPercent - (this.gearRatios[this.gear - 1] || 0);
            const rpmPercent = speedInGear / gearSpeedRange;
            this.rpm = 3000 + (rpmPercent * (this.maxRpm - 3000));
        } else if (this.gear === -1) {
            this.rpm = 3000 + (Math.abs(this.speed) / 50) * 5000;
        } else {
            this.rpm = 1000; // Idle
        }

        this.rpm = Math.min(this.rpm, this.maxRpm);
    }

    updateCameraFollow() {
    if (!this.sceneManager || !this.car) return;

    const camera = this.sceneManager.camera;
    const controls = this.sceneManager.controls;

    // Fully disable orbit controls while driving
    controls.enabled = false;

    // Camera tuning - adjust these to feel right
    const cameraDistance = 7;
    const cameraHeight = 2.2;
    const smoothness = 0.08; 

    /* Tuning guide:
    smoothness: lower = smoother / higher = more responsive
    🎮 Arcade game: 0.08
    🏎️ Sim racing: 0.03
    🎬 Cinematic: 0.015
    */

    // Calculate ideal position behind the car
    const idealOffset = new THREE.Vector3(
        -Math.sin(this.rotation) * cameraDistance,
        cameraHeight,
        -Math.cos(this.rotation) * cameraDistance
    );

    // Correctly get car position even inside platform group
    const carWorldPosition = new THREE.Vector3();
    this.car.getWorldPosition(carWorldPosition);

    idealOffset.add(carWorldPosition);

    // Smoothly interpolate camera position
    camera.position.lerp(idealOffset, smoothness);

    // Look slightly ahead in direction of travel
    const lookAhead = new THREE.Vector3(
        Math.sin(this.rotation) * 1,
        1,
        Math.cos(this.rotation) * 1
    );
    lookAhead.add(carWorldPosition);

    // Also smooth the look target
    controls.target.lerp(lookAhead, smoothness);
}

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