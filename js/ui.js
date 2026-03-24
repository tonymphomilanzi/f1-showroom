import { gsap } from 'gsap';

export class UIManager {
    constructor(app) {
        this.app = app;
        
        // 1. DOM Cache (Crucial for performance)
        this.elements = {
            speed: document.getElementById('currentSpeed'),
            gear: document.getElementById('currentGear'),
            rpmFill: document.getElementById('rpmFill'),
            fps: document.getElementById('fpsValue'),
            notification: document.getElementById('notification'),
            notifText: document.querySelector('.notification-text'),
            loadingBar: document.querySelector('.loading-bar'),
            loadingText: document.querySelector('.loading-text'),
            loadingPercent: document.querySelector('.loading-percent'),
            mapCanvas: document.getElementById('mapCanvas')
        };

        // 2. State
        this.lastGear = null;
        this.fpsHistory = [];
        this.lastFrameTime = performance.now();
        this.isMobile = window.innerWidth <= 768;

        this.init();
    }

    init() {
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this._resizeCanvas();
        });
        this._resizeCanvas();
    }

    /**
     * Dashboard: Updates Speed, Gear, and RPM bar
     */
    syncDashboard(carControls) {
        if (!carControls) return;

        // Speed
        if (this.elements.speed) {
            this.elements.speed.textContent = carControls.getDisplaySpeed();
        }

        // Gear Logic
        if (this.elements.gear) {
            const gearStr = carControls.getGear();
            if (this.lastGear !== gearStr) {
                this.elements.gear.textContent = gearStr;
                this._animateGearChange();
                this.lastGear = gearStr;
            }
        }

        // RPM Logic
        if (this.elements.rpmFill) {
            const rpmPct = (carControls.rpm / 15000) * 100;
            this.elements.rpmFill.style.width = `${Math.min(rpmPct, 100)}%`;
            
            // Dynamic Color Coding
            if (rpmPct > 92) {
                this.elements.rpmFill.style.background = '#ff0000'; // Redline
                this.elements.rpmFill.classList.add('rpm-blink');
            } else if (rpmPct > 75) {
                this.elements.rpmFill.style.background = '#ffcc00'; // Shift zone
                this.elements.rpmFill.classList.remove('rpm-blink');
            } else {
                this.elements.rpmFill.style.background = '#00ff44'; // Safe zone
                this.elements.rpmFill.classList.remove('rpm-blink');
            }
        }
    }

    _animateGearChange() {
        gsap.fromTo(this.elements.gear, 
            { scale: 1.6, filter: 'brightness(2)' },
            { scale: 1, filter: 'brightness(1)', duration: 0.3, ease: "back.out(2)" }
        );
    }

    /**
     * Notifications: Premium toast system
     */
    showNotification(message, type = 'info') {
        const el = this.elements.notification;
        if (!el) return;

        if (this.elements.notifText) this.elements.notifText.textContent = message;
        
        el.classList.remove('hidden');
        gsap.killTweensOf(el);

        const tl = gsap.timeline();
        tl.fromTo(el, 
            { y: -50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)" }
        );
        
        tl.to(el, {
            y: -20, opacity: 0, duration: 0.4, delay: 2.5,
            onComplete: () => el.classList.add('hidden')
        });
    }

    /**
     * MiniMap: High-performance canvas drawing
     */
    updateMiniMap(carPosition, carRotation) {
        const canvas = this.elements.mapCanvas;
        if (!canvas || canvas.offsetParent === null) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // 1. Clear with slight trail effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Bounds
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.setLineDash([]);

        // 3. Map World -> UI Coordinates
        // Scale car position to fit 200x200 map
        const mapCenterX = width / 2;
        const mapCenterY = height / 2;
        const scale = 2.5; 

        const uiX = mapCenterX + (carPosition.x * scale);
        const uiY = mapCenterY + (carPosition.z * scale);

        // 4. Draw Player Arrow
        ctx.save();
        ctx.translate(uiX, uiY);
        ctx.rotate(-carRotation); 

        // Arrow shadow/glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e10600';

        ctx.fillStyle = '#e10600';
        ctx.beginPath();
        ctx.moveTo(0, -10); // Nose
        ctx.lineTo(-7, 8);  // Left wing
        ctx.lineTo(0, 4);   // Exhaust
        ctx.lineTo(7, 8);   // Right wing
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _resizeCanvas() {
        const canvas = this.elements.mapCanvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    /**
     * Loading System
     */
    updateLoader(progress) {
        const pct = Math.round(progress * 100);
        if (this.elements.loadingBar) this.elements.loadingBar.style.width = `${pct}%`;
        if (this.elements.loadingPercent) this.elements.loadingPercent.textContent = `${pct}%`;
        
        if (this.elements.loadingText) {
            if (pct < 40) this.elements.loadingText.textContent = 'Optimizing Aerodynamics...';
            else if (pct < 80) this.elements.loadingText.textContent = 'Tuning Engine...';
            else this.elements.loadingText.textContent = 'Ready to Race';
        }
    }

    /**
     * FPS & Performance
     */
    updateFPS() {
        if (!this.elements.fps) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        const fps = Math.round(1000 / delta);
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) this.fpsHistory.shift();

        const avg = Math.round(this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length);
        
        this.elements.fps.textContent = avg;
        this.elements.fps.style.color = avg > 50 ? '#00ff44' : (avg > 30 ? '#ffcc00' : '#ff4444');
    }

    /**
     * Keyboard Visual Feedback
     */
    toggleKeyVisual(key, isActive) {
        const k = key.toLowerCase() === ' ' ? 'space' : key.toLowerCase();
        const el = document.querySelector(`.key-hint[data-key="${k}"]`);
        if (!el) return;

        if (isActive) {
            el.classList.add('active');
            gsap.to(el, { scale: 0.9, duration: 0.1 });
        } else {
            el.classList.remove('active');
            gsap.to(el, { scale: 1, duration: 0.1 });
        }
    }

    updateActiveNav(viewName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.action === 'switch-view' && link.dataset.value === viewName);
        });
    }

    enableInteraction() {
        document.body.classList.remove('loading');
        this.showNotification('System Online - Welcome, Pilot');
    }
}