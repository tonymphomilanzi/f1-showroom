
export class UIManager {
    constructor(app) {
        this.app = app;
        this.interactionEnabled = false;
        
        // FPS Calculation
        this.fpsHistory = [];
        this.lastFrameTime = performance.now();
        
        // Check for mobile state for animations
        this.isMobile = window.innerWidth <= 768;
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }

    enableInteraction() {
        this.interactionEnabled = true;
        document.body.style.cursor = 'default';
    }

    disableInteraction() {
        this.interactionEnabled = false;
        document.body.style.cursor = 'wait';
    }

    showNotification(message, duration = 3000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        const text = notification.querySelector('.notification-text');
        if (text) text.textContent = message;

        notification.classList.remove('hidden');

        // Kill existing tweens to prevent conflict
        gsap.killTweensOf(notification);

        // Animate in (Fade + Slide Down)
        gsap.fromTo(notification,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
        );

        // Auto hide
        gsap.to(notification, {
            delay: duration / 1000,
            opacity: 0,
            y: -10,
            duration: 0.4,
            ease: 'power2.in',
            onComplete: () => {
                notification.classList.add('hidden');
            }
        });
    }

    updateSpeedometer(speed, rpm, gear) {
        const speedElement = document.getElementById('currentSpeed');
        const rpmFill = document.getElementById('rpmFill');
        const gearElement = document.getElementById('currentGear');

        if (speedElement) {
            speedElement.textContent = Math.abs(Math.round(speed));
        }

        if (rpmFill) {
            // RPM is usually 0-15000 in F1
            const rpmPercent = Math.min((rpm / 15000) * 100, 100);
            rpmFill.style.width = `${rpmPercent}%`;

            // Dynamic Gradient based on load
            if (rpmPercent > 90) {
                rpmFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #ffff00 50%, #ff0000 80%, #ff0000 100%)';
                rpmFill.style.boxShadow = '0 0 10px #ff0000'; // Add glow at high RPM
            } else if (rpmPercent > 70) {
                rpmFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #ffff00 60%, #ff6600 100%)';
                rpmFill.style.boxShadow = 'none';
            } else {
                rpmFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #ffff00 50%, #ff0000 100%)';
                rpmFill.style.boxShadow = 'none';
            }
        }

        if (gearElement) {
            let gearString;
            if (gear === 0) gearString = 'N';
            else if (gear === -1) gearString = 'R';
            else gearString = gear.toString();
            
            gearElement.textContent = gearString;
            
            // Highlight gear change
            if (this.lastGear !== gear) {
                gsap.fromTo(gearElement, 
                    { scale: 1.5, color: '#fff' }, 
                    { scale: 1, color: '#ffd700', duration: 0.2 }
                );
                this.lastGear = gear;
            }
        }
    }

    updateFPS() {
        const fpsElement = document.getElementById('fpsValue');
        if (!fpsElement) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        const fps = Math.round(1000 / delta);
        this.fpsHistory.push(fps);

        if (this.fpsHistory.length > 30) { // Reduced sample size for snappier updates
            this.fpsHistory.shift();
        }

        const avgFps = Math.round(
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        );

        fpsElement.textContent = avgFps;

        // Color code FPS
        if (avgFps >= 55) fpsElement.style.color = '#00ff00';
        else if (avgFps >= 30) fpsElement.style.color = '#ffff00';
        else fpsElement.style.color = '#ff0000';
    }

    updateMiniMap(carPosition, carRotation) {
        const mapCanvas = document.getElementById('mapCanvas');
        if (!mapCanvas || mapCanvas.offsetParent === null) return; // Don't draw if hidden

        const ctx = mapCanvas.getContext('2d');
        
        // Match canvas internal resolution to CSS display size for sharpness
        const rect = mapCanvas.getBoundingClientRect();
        mapCanvas.width = rect.width;
        mapCanvas.height = rect.height;

        const width = mapCanvas.width;
        const height = mapCanvas.height;

        // Clear canvas
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.fillRect(0, 0, width, height);

        // Draw track outline (Simple circle for demo, represents bounds)
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Dynamic radius based on canvas size
        const radius = Math.min(width, height) / 2 - 20;
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Calculate Car Position (Mock scaling for demo)
        // In a real app, you'd map world coordinates to map coordinates
        const mapScale = 4; 
        const carX = width / 2 + carPosition.x * mapScale;
        const carY = height / 2 - carPosition.z * mapScale;

        // Draw Car Arrow
        ctx.save();
        ctx.translate(carX, carY);
        ctx.rotate(-carRotation); // Rotate arrow to match car heading

        ctx.fillStyle = '#e10600';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-5, 6);
        ctx.lineTo(0, 4); // Indent at bottom
        ctx.lineTo(5, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    highlightControl(key) {
        if (!key) return;
        // Escape special characters if necessary, though single letters are fine
        const keyElement = document.querySelector(`.key[data-key="${key.toUpperCase()}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
            gsap.to(keyElement, { scale: 0.9, duration: 0.1 });
        }
    }

    unhighlightControl(key) {
        if (!key) return;
        const keyElement = document.querySelector(`.key[data-key="${key.toUpperCase()}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
            gsap.to(keyElement, { scale: 1, duration: 0.1 });
        }
    }

    updateProgress(percent, message = '') {
        const loadingBar = document.querySelector('.loading-bar');
        const loadingText = document.querySelector('.loading-text');
        const loadingPercent = document.querySelector('.loading-percent');

        if (loadingBar) loadingBar.style.width = `${percent}%`;
        if (loadingText && message) loadingText.textContent = message;
        if (loadingPercent) loadingPercent.textContent = `${Math.round(percent)}%`;
    }

    /**
     * Logic to toggle panels.
     * Updated to handle Mobile Bottom Sheets vs Desktop Side Panels
     */
    togglePanel(panelId, show) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Reset any running animations on this element
        gsap.killTweensOf(panel);

        if (show) {
            panel.classList.remove('hidden');
            
            // Animation configuration based on device
            const initialVars = this.isMobile 
                ? { y: '100%', x: 0, opacity: 0 }  // Slide up from bottom on mobile
                : { x: 50, y: 0, opacity: 0 };     // Slide left from side on desktop

            const targetVars = { 
                opacity: 1, 
                x: 0, 
                y: 0, 
                duration: 0.5, 
                ease: 'power3.out' 
            };

            gsap.fromTo(panel, initialVars, targetVars);
        } else {
            // Exit animation
            const exitVars = this.isMobile
                ? { y: '100%', opacity: 0 }
                : { x: 50, opacity: 0 };

            gsap.to(panel, {
                ...exitVars,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    panel.classList.add('hidden');
                }
            });
        }
    }

    /**
     * Setups up listeners for existing Color/Rim/Material buttons in the DOM
     */
    setupOptionSelectors(selectorClass, onSelect) {
        const buttons = document.querySelectorAll(selectorClass);
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI Update
                buttons.forEach(b => b.classList.remove('active'));
                
                // Handle button click or svg click bubbling
                const targetBtn = e.target.closest('button');
                if(targetBtn) targetBtn.classList.add('active');

                // Logic Callback
                // Determine what data attribute to pass back based on class
                if (selectorClass.includes('color')) {
                    onSelect(targetBtn.dataset.color);
                } else if (selectorClass.includes('material')) {
                    onSelect(targetBtn.dataset.material);
                } else if (selectorClass.includes('rim')) {
                    onSelect(targetBtn.dataset.rim);
                }
            });
        });
    }
}