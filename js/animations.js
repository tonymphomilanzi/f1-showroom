// js/animations.js

export class AnimationManager {
    constructor() {
        this.isAnimating = false;
        this.timeline = null;
    }

    playOpeningSequence(onComplete) {
        const preloader = document.getElementById('preloader');
        const curtainLeft = document.querySelector('.curtain-left');
        const curtainRight = document.querySelector('.curtain-right');
        const curtain = document.getElementById('curtain');
        const app = document.getElementById('app');
        const header = document.getElementById('header');
        const footer = document.getElementById('footer');
        const infoPanel = document.getElementById('info-panel');
        const cameraControls = document.getElementById('camera-controls');

        this.timeline = gsap.timeline({
            onComplete: () => {
                if (onComplete) onComplete();
            }
        });

        // Fade out preloader
        this.timeline.to(preloader, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => {
                preloader.style.display = 'none';
            }
        });

        // Open curtains
        this.timeline.to(curtainLeft, {
            x: '-100%',
            duration: 1.2,
            ease: 'power3.inOut'
        }, '-=0.2');

        this.timeline.to(curtainRight, {
            x: '100%',
            duration: 1.2,
            ease: 'power3.inOut'
        }, '<');

        // Show app
        this.timeline.to(app, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
        }, '-=0.6');

        // Animate header in
        this.timeline.to(header, {
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.4');

        // Animate footer in
        this.timeline.to(footer, {
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, '<');

        // Animate info panel
        this.timeline.to(infoPanel, {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.5');

        // Animate camera controls
        this.timeline.to(cameraControls, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.6');

        // Animate stats numbers
        this.timeline.add(() => {
            this.animateStats();
        }, '-=0.4');

        // Clean up curtain
        this.timeline.add(() => {
            curtain.style.display = 'none';
        });

        return this.timeline;
    }

    animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        
        statValues.forEach(stat => {
            const targetValue = parseFloat(stat.dataset.value);
            const isDecimal = targetValue % 1 !== 0;
            const startValue = { val: 0 };

            gsap.to(startValue, {
                val: targetValue,
                duration: 2,
                ease: 'power2.out',
                onUpdate: () => {
                    if (isDecimal) {
                        stat.textContent = startValue.val.toFixed(1);
                    } else {
                        stat.textContent = Math.round(startValue.val);
                    }
                }
            });
        });
    }

    hidePanels() {
        const panels = [
            'info-panel',
            'controls-panel',
            'customize-panel',
            'specs-panel'
        ];

        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel && !panel.classList.contains('hidden')) {
                gsap.to(panel, {
                    opacity: 0,
                    x: panelId === 'info-panel' ? -50 : 50,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: () => {
                        panel.classList.add('hidden');
                    }
                });
            }
        });
    }

    showPanel(panelId, direction = 'right') {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        panel.classList.remove('hidden');
        
        const xStart = direction === 'left' ? -50 : 50;

        gsap.fromTo(panel,
            {
                opacity: 0,
                x: xStart
            },
            {
                opacity: 1,
                x: 0,
                duration: 0.5,
                ease: 'power3.out'
            }
        );
    }

    showShowroomView() {
        // Show info panel
        this.showPanel('info-panel', 'left');

        // Hide mini map
        const miniMap = document.getElementById('mini-map');
        if (miniMap) miniMap.classList.add('hidden');

        // Show camera controls
        const cameraControls = document.getElementById('camera-controls');
        if (cameraControls) {
            cameraControls.classList.remove('hidden');
            gsap.to(cameraControls, {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: 'power3.out'
            });
        }
    }

    showDriveView() {
        // Show controls panel
        this.showPanel('controls-panel', 'right');

        // Show mini map
        const miniMap = document.getElementById('mini-map');
        if (miniMap) {
            miniMap.classList.remove('hidden');
            gsap.fromTo(miniMap,
                { opacity: 0, scale: 0.8 },
                { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
            );
        }

        // Animate speedometer entrance
        const speedometer = document.querySelector('.speedometer');
        if (speedometer) {
            gsap.fromTo(speedometer,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.3 }
            );
        }
    }

    showSpecsView() {
        this.showPanel('specs-panel', 'right');

        // Animate spec items
        const specItems = document.querySelectorAll('.specs-category li');
        gsap.fromTo(specItems,
            { opacity: 0, x: 20 },
            {
                opacity: 1,
                x: 0,
                duration: 0.4,
                stagger: 0.05,
                ease: 'power2.out',
                delay: 0.3
            }
        );
    }

    showCustomizeView() {
        this.showPanel('customize-panel', 'right');

        // Animate color buttons
        const colorBtns = document.querySelectorAll('.color-btn');
        gsap.fromTo(colorBtns,
            { opacity: 0, scale: 0 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                stagger: 0.05,
                ease: 'back.out(1.7)',
                delay: 0.2
            }
        );

        // Animate material buttons
        const materialBtns = document.querySelectorAll('.material-btn');
        gsap.fromTo(materialBtns,
            { opacity: 0, y: 10 },
            {
                opacity: 1,
                y: 0,
                duration: 0.3,
                stagger: 0.1,
                ease: 'power2.out',
                delay: 0.4
            }
        );
    }

    // Camera transition animation
    animateCameraTransition(camera, targetPosition, targetLookAt, duration = 1.5) {
        return new Promise((resolve) => {
            gsap.to(camera.position, {
                x: targetPosition.x,
                y: targetPosition.y,
                z: targetPosition.z,
                duration: duration,
                ease: 'power2.inOut',
                onComplete: resolve
            });
        });
    }

    // Car reveal animation
    playCarReveal(car) {
        if (!car) return;

        // Scale up from 0
        car.scale.set(0, 0, 0);
        
        gsap.to(car.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.2,
            ease: 'elastic.out(1, 0.5)'
        });

        // Rotate for dramatic effect
        car.rotation.y = -Math.PI;
        gsap.to(car.rotation, {
            y: 0,
            duration: 1.5,
            ease: 'power3.out'
        });
    }

    // Pulse animation for highlights
    pulseElement(element, color = '#e10600') {
        gsap.to(element, {
            boxShadow: `0 0 30px ${color}`,
            duration: 0.5,
            yoyo: true,
            repeat: 3,
            ease: 'power2.inOut'
        });
    }

    // Shake animation for errors
    shakeElement(element) {
        gsap.to(element, {
            x: [-10, 10, -10, 10, 0],
            duration: 0.5,
            ease: 'power2.out'
        });
    }

    // Notification animation
    showNotificationAnimation(notification) {
        gsap.fromTo(notification,
            {
                opacity: 0,
                y: -20,
                scale: 0.9
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'back.out(1.7)'
            }
        );
    }

    hideNotificationAnimation(notification) {
        return gsap.to(notification, {
            opacity: 0,
            y: -10,
            duration: 0.3,
            ease: 'power2.in'
        });
    }

    // Loading animation
    playLoadingAnimation(element) {
        return gsap.to(element, {
            rotation: 360,
            duration: 1,
            repeat: -1,
            ease: 'linear'
        });
    }

    // Stop all animations
    stopAll() {
        if (this.timeline) {
            this.timeline.kill();
        }
        gsap.killTweensOf('*');
    }
}