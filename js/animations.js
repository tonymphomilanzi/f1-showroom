import { gsap } from 'gsap';

export class AnimationManager {
    constructor() {
        this.ctx = gsap.context(() => {});
        this.isMobile = window.innerWidth <= 768;
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }

    playOpeningSequence(onComplete) {
        const curtainLeft = document.querySelector('.curtain-left');
        const curtainRight = document.querySelector('.curtain-right');
        const preloader = document.getElementById('preloader');
        const app = document.getElementById('app');

        this.ctx.add(() => {
            const tl = gsap.timeline({
                onComplete: () => {
                    document.getElementById('curtain').style.display = 'none';
                    if (onComplete) onComplete();
                }
            });

            // 1. Instant Setup
            tl.set(app, { opacity: 1 }); // Make app visible behind curtain
            
            // 2. Fade out loading text
            tl.to('.loader-content', { opacity: 0, duration: 0.5 });
            tl.to(preloader, { opacity: 0, duration: 0.2 }, "-=0.2");
            tl.set(preloader, { display: 'none' });

            // 3. Open Curtains TOGETHER (Position parameter 0 ensures sync)
            tl.to(curtainLeft, { x: '-100%', duration: 1.5, ease: 'power4.inOut' }, "open");
            tl.to(curtainRight, { x: '100%', duration: 1.5, ease: 'power4.inOut' }, "open");

            // 4. Interface Slide In
            tl.fromTo('#header', { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.5");
            tl.fromTo('#footer', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "<");
        });
    }

    animatePanel(panelId, state, options = {}) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        this.ctx.add(() => {
            if (state === 'show') {
                // IMPORTANT: Remove hidden class BEFORE animating
                panel.classList.remove('hidden');
                
                // Reset standard CSS properties to ensure visibility
                gsap.set(panel, { clearProps: 'all' }); 
                
                const startVars = this.isMobile 
                    ? { y: 100, opacity: 0 } 
                    : { x: options.side === 'left' ? -50 : 50, opacity: 0 };

                gsap.fromTo(panel, 
                    startVars,
                    { 
                        x: 0, y: 0, opacity: 1, 
                        duration: 0.5, 
                        ease: 'power3.out', 
                        delay: options.delay || 0 
                    }
                );
            } else {
                // HIDE
                gsap.to(panel, {
                    opacity: 0,
                    x: this.isMobile ? 0 : (options.side === 'left' ? -50 : 50),
                    y: this.isMobile ? 100 : 0,
                    duration: 0.3,
                    onComplete: () => panel.classList.add('hidden')
                });
            }
        });
    }

    hideAllPanels() {
        ['info-panel', 'controls-panel', 'customize-panel', 'specs-panel'].forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.classList.contains('hidden')) {
                el.classList.add('hidden'); // Force hide immediately to prevent overlaps
            }
        });
        
        // Hide specific UI elements
        const map = document.getElementById('mini-map');
        if(map) map.classList.add('hidden');
    }

    showShowroomView() {
        this.hideAllPanels();
        this.animatePanel('info-panel', 'show', { side: 'left', delay: 0.2 });
        this.animateUIElement('#camera-controls', 'show', { delay: 0.4 });
        this.animateStats();
    }

    showDriveView() {
        this.hideAllPanels();
        
        // 1. Show Controls Panel
        this.animatePanel('controls-panel', 'show', { side: 'right', delay: 0.1 });
        
        // 2. Show Speedometer specifically
        const speedo = document.querySelector('.speedometer');
        if(speedo) {
            gsap.fromTo(speedo, 
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, delay: 0.3, ease: 'back.out(1.5)' }
            );
        }

        // 3. Show Mini Map
        this.animateUIElement('#mini-map', 'show', { delay: 0.5 });
    }

    showSpecsView() {
        this.hideAllPanels();
        this.animatePanel('specs-panel', 'show', { side: 'right' });
    }

    showCustomizeView() {
        this.hideAllPanels();
        this.animatePanel('customize-panel', 'show', { side: 'right' });
    }

    animateUIElement(selector, state, options = {}) {
        const el = document.querySelector(selector);
        if (!el) return;

        if (state === 'show') {
            el.classList.remove('hidden');
            gsap.fromTo(el, 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, delay: options.delay || 0 }
            );
        } else {
            el.classList.add('hidden');
        }
    }
    
    animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(stat => {
            const target = parseFloat(stat.dataset.value);
            const obj = { val: 0 };
            gsap.to(obj, {
                val: target,
                duration: 1.5,
                ease: 'power2.out',
                onUpdate: () => stat.textContent = Math.round(obj.val)
            });
        });
    }
}