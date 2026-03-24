import { gsap } from 'gsap';

export class AnimationManager {
    constructor() {
        // Create a global context for cleanup (Vanilla equivalent of useGSAP hook)
        this.ctx = gsap.context(() => {});
        this.currentViewTimeline = null;
        
        // Responsive state check
        this.isMobile = window.innerWidth <= 768;
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }

    /**
     * Cleans up all active animations.
     * Call this before destroying the scene or major transitions.
     */
    cleanup() {
        this.ctx.revert();
    }

    playOpeningSequence(onComplete) {
        const preloader = document.getElementById('preloader');
        const curtainLeft = document.querySelector('.curtain-left');
        const curtainRight = document.querySelector('.curtain-right');
        const curtain = document.getElementById('curtain');
        const app = document.getElementById('app');
        const header = document.getElementById('header');
        const footer = document.getElementById('footer');

        // Add to context for safe cleanup
        this.ctx.add(() => {
            const tl = gsap.timeline({
                onComplete: () => {
                    if (curtain) curtain.style.display = 'none';
                    if (onComplete) onComplete();
                }
            });

            // 1. Fade out preloader contents
            tl.to('.loader-content', { opacity: 0, duration: 0.5, ease: 'power2.out' })
              .to(preloader, { opacity: 0, duration: 0.2 }, "-=0.2")
              .set(preloader, { display: 'none' });

            // 2. Open Curtains
            tl.to(curtainLeft, { x: '-100%', duration: 1.4, ease: 'expo.inOut' }, "curtain")
              .to(curtainRight, { x: '100%', duration: 1.4, ease: 'expo.inOut' }, "curtain<");

            // 3. Reveal App UI
            tl.set(app, { opacity: 1 }, "-=1.0")
              .fromTo(header, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, "-=0.8")
              .fromTo(footer, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, "<");
        });
    }

    /**
     * unified handler for showing/hiding panels based on device type
     */
    animatePanel(panelId, state, options = {}) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        this.ctx.add(() => {
            if (state === 'show') {
                panel.classList.remove('hidden');

                // Determine entrance vector
                let startVars = {};
                if (this.isMobile) {
                    startVars = { y: '100%', x: 0, opacity: 0 }; // Bottom sheet
                } else {
                    // Desktop: Slide from left or right based on options
                    startVars = { x: options.side === 'left' ? -50 : 50, y: 0, opacity: 0 };
                }

                gsap.fromTo(panel, 
                    startVars,
                    { 
                        x: 0, 
                        y: 0, 
                        opacity: 1, 
                        duration: 0.6, 
                        ease: this.isMobile ? 'power4.out' : 'power3.out', // Snappier on mobile
                        delay: options.delay || 0
                    }
                );
            } else {
                // HIDE
                let endVars = {};
                if (this.isMobile) {
                    endVars = { y: '100%', opacity: 0 };
                } else {
                    endVars = { x: options.side === 'left' ? -50 : 50, opacity: 0 };
                }

                gsap.to(panel, {
                    ...endVars,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: () => panel.classList.add('hidden')
                });
            }
        });
    }

    hideAllPanels() {
        const panels = ['info-panel', 'controls-panel', 'customize-panel', 'specs-panel'];
        panels.forEach(id => this.animatePanel(id, 'hide'));
    }

    // --- Specific View Transitions ---

    showShowroomView() {
        this.hideAllPanels();
        
        // Show Info Panel (Left on Desktop, Bottom on Mobile)
        this.animatePanel('info-panel', 'show', { side: 'left', delay: 0.3 });

        // Show Camera Controls
        this.animateUIElement('#camera-controls', 'show', { delay: 0.4 });
        
        // Hide Map
        this.animateUIElement('#mini-map', 'hide');

        // Animate Stats inside the info panel
        setTimeout(() => this.animateStats(), 500);
    }

    showDriveView() {
        this.hideAllPanels();
        
        // Show Controls (Right on Desktop, Bottom on Mobile)
        this.animatePanel('controls-panel', 'show', { side: 'right', delay: 0.3 });
        
        // Show Map
        this.animateUIElement('#mini-map', 'show', { delay: 0.5 });
        
        // Hide Camera Controls (optional, or keep them)
        this.animateUIElement('#camera-controls', 'show', { delay: 0.4 });

        // Animate Speedometer specific elements
        this.ctx.add(() => {
            gsap.fromTo('.speedometer', 
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, delay: 0.6, ease: 'back.out(1.7)' }
            );
        });
    }

    showSpecsView() {
        this.hideAllPanels();
        this.animatePanel('specs-panel', 'show', { side: 'right', delay: 0.3 });

        // Stagger list items
        this.ctx.add(() => {
            gsap.fromTo('.specs-category li',
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, delay: 0.5 }
            );
        });
    }

    showCustomizeView() {
        this.hideAllPanels();
        this.animatePanel('customize-panel', 'show', { side: 'right', delay: 0.3 });

        // Stagger buttons
        this.ctx.add(() => {
            gsap.fromTo('.color-btn',
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.5)', delay: 0.5 }
            );
        });
    }

    // --- Helper Animations ---

    animateUIElement(selector, state, options = {}) {
        const el = document.querySelector(selector);
        if (!el) return;

        this.ctx.add(() => {
            if (state === 'show') {
                el.classList.remove('hidden');
                gsap.fromTo(el, 
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, delay: options.delay || 0, ease: 'power2.out' }
                );
            } else {
                gsap.to(el, {
                    opacity: 0,
                    y: 20,
                    duration: 0.3,
                    onComplete: () => el.classList.add('hidden')
                });
            }
        });
    }

    animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues.length === 0) return;

        this.ctx.add(() => {
            statValues.forEach(stat => {
                // Ensure we read the value correctly, removing any non-numeric chars if present
                const rawVal = stat.dataset.value; 
                const targetValue = parseFloat(rawVal);
                
                // Create a proxy object to tween
                const proxy = { val: 0 };

                gsap.to(proxy, {
                    val: targetValue,
                    duration: 1.5,
                    ease: 'power2.out',
                    onUpdate: () => {
                        // Check if it needs decimals (e.g., 2.6s) or integer (950hp)
                        if (rawVal.includes('.')) {
                            stat.textContent = proxy.val.toFixed(1);
                        } else {
                            stat.textContent = Math.round(proxy.val);
                        }
                    }
                });
            });
        });
    }

    animateCameraTransition(camera, targetPos, duration = 1.5) {
        return new Promise(resolve => {
            this.ctx.add(() => {
                gsap.to(camera.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: duration,
                    ease: 'power3.inOut',
                    onComplete: resolve
                });
            });
        });
    }

    // Car Reveal (Scale up)
    playCarReveal(car) {
        if (!car) return;
        this.ctx.add(() => {
            gsap.fromTo(car.scale, 
                { x: 0, y: 0, z: 0 },
                { x: 1, y: 1, z: 1, duration: 1.2, ease: 'elastic.out(1, 0.75)' }
            );
            
            // Subtle rotation entrance
            gsap.fromTo(car.rotation,
                { y: Math.PI },
                { y: 0, duration: 1.5, ease: 'power3.out' }
            );
        });
    }
}