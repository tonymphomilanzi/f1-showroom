import { gsap } from 'gsap';

export class AnimationManager {
    constructor() {
        this.ctx = gsap.context(() => {});
        this.isMobile = window.innerWidth <= 768;
        
        // Cache frequently used elements
        this.panels = '.ui-panel'; 
        this.header = '#header';
        this.footer = '#footer';
        
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }

    /**
     * Initial "Cinematic" reveal
     */
    playOpeningSequence(onComplete) {
        const tl = gsap.timeline({
            defaults: { ease: "expo.inOut" },
            onComplete: () => {
                gsap.set('#curtain', { display: 'none' });
                if (onComplete) onComplete();
            }
        });

        tl.to('.loader-content', { opacity: 0, y: -20, duration: 0.8 })
          .to('#preloader', { opacity: 0, duration: 0.5 }, "-=0.2")
          .set('#preloader', { display: 'none' })
          .set('#app', { opacity: 1 });

        // Open Curtains
        tl.to('.curtain-left', { xPercent: -100, duration: 1.8 }, "open")
          .to('.curtain-right', { xPercent: 100, duration: 1.8 }, "open");

        // Reveal Header & Footer with a slight "spring"
        tl.from([this.header, this.footer], {
            y: (i) => i === 0 ? -100 : 100,
            opacity: 0,
            duration: 1.2,
            ease: "back.out(1.2)",
            stagger: 0.1
        }, "-=1.0");

        // Stagger in the navigation links
        tl.from('.nav-link', {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out"
        }, "-=0.5");
    }

    /**
     * Centralized View Switcher
     */
    transitionTo(viewName) {
        // 1. Hide all active panels first
        this.hideAllPanels(() => {
            // 2. Route to specific view animations
            switch (viewName) {
                case 'showroom':  this._viewShowroom(); break;
                case 'drive':     this._viewDrive(); break;
                case 'specs':     this._viewSpecs(); break;
                case 'customize': this._viewCustomize(); break;
            }
        });
    }

    _viewShowroom() {
        this.animatePanel('info-panel', 'show', { side: 'left' });
        this.animateUIElement('#camera-controls', 'show', { delay: 0.3 });
        this.animateStats();
    }

    _viewDrive() {
        this.animatePanel('controls-panel', 'show', { side: 'right' });
        this.animateUIElement('#mini-map', 'show', { delay: 0.4 });
        
        // Punchy Speedometer reveal
        gsap.fromTo('.speedometer', 
            { scale: 0.5, opacity: 0, rotation: -45 },
            { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: "back.out(1.7)", delay: 0.2 }
        );
    }

    _viewSpecs() {
        this.animatePanel('specs-panel', 'show', { side: 'right' });
        // Stagger the spec items inside the panel
        gsap.from('.spec-item', {
            x: 30,
            opacity: 0,
            stagger: 0.05,
            duration: 0.5,
            delay: 0.2
        });
    }

    _viewCustomize() {
        this.animatePanel('customize-panel', 'show', { side: 'right' });
    }

    /**
     * Generic Panel Animator
     */
    animatePanel(panelId, state, options = {}) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        if (state === 'show') {
            panel.classList.remove('hidden');
            const xOffset = options.side === 'left' ? -100 : 100;

            gsap.fromTo(panel, 
                { x: this.isMobile ? 0 : xOffset, y: this.isMobile ? 50 : 0, opacity: 0 },
                { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "expo.out", delay: options.delay || 0 }
            );
        } else {
            return gsap.to(panel, {
                opacity: 0,
                x: options.side === 'left' ? -50 : 50,
                duration: 0.4,
                onComplete: () => panel.classList.add('hidden')
            });
        }
    }

    hideAllPanels(onComplete) {
        const activePanels = document.querySelectorAll(`${this.panels}:not(.hidden), .speedometer:not(.hidden), #mini-map:not(.hidden)`);
        
        if (activePanels.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        gsap.to(activePanels, {
            opacity: 0,
            y: 20,
            duration: 0.3,
            stagger: 0.05,
            onComplete: () => {
                activePanels.forEach(p => p.classList.add('hidden'));
                if (onComplete) onComplete();
            }
        });
    }

    animateUIElement(selector, state, options = {}) {
        const el = document.querySelector(selector);
        if (!el) return;

        if (state === 'show') {
            el.classList.remove('hidden');
            gsap.fromTo(el, 
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.5, delay: options.delay || 0 }
            );
        } else {
            el.classList.add('hidden');
        }
    }

    /**
     * Number counter for specs/info
     */
    animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(stat => {
            const target = parseFloat(stat.dataset.value) || 0;
            const obj = { val: 0 };
            
            gsap.to(obj, {
                val: target,
                duration: 2,
                ease: "power3.out",
                onUpdate: () => {
                    // Update text with comma formatting if needed
                    stat.textContent = Math.floor(obj.val).toLocaleString();
                }
            });
        });
    }

    /**
     * UI Feedback for button clicks
     */
    buttonFeedback(el) {
        gsap.to(el, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });
    }

    showNotification(message) {
        const toast = document.getElementById('notification');
        if (!toast) return;

        toast.textContent = message;
        const tl = gsap.timeline();
        tl.to(toast, { display: 'block', opacity: 1, y: 0, duration: 0.4 })
          .to(toast, { opacity: 0, y: -20, duration: 0.4, delay: 2, onComplete: () => {
              gsap.set(toast, { display: 'none' });
          }});
    }
}