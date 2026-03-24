// js/ui.js

export class UIManager {
    constructor(app) {
        this.app = app;
        this.interactionEnabled = false;
        this.fpsHistory = [];
        this.lastFrameTime = performance.now();
    }

    enableInteraction() {
        this.interactionEnabled = true;
        document.body.style.cursor = 'default';
    }

    disableInteraction() {
        this.interactionEnabled = false;
        document.body.style.cursor = 'wait';
    }

    showNotification(message, duration = 2000) {
        const notification = document.getElementById('notification');
        const text = notification.querySelector('.notification-text');

        text.textContent = message;
        notification.classList.remove('hidden');

        // Animate in
        gsap.fromTo(notification,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
        );

        // Auto hide
        setTimeout(() => {
            gsap.to(notification, {
                opacity: 0,
                y: -10,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    notification.classList.add('hidden');
                }
            });
        }, duration);
    }

    updateSpeedometer(speed, rpm, gear) {
        const speedElement = document.getElementById('currentSpeed');
        const rpmFill = document.getElementById('rpmFill');
        const gearElement = document.getElementById('currentGear');

        if (speedElement) {
            speedElement.textContent = Math.abs(Math.round(speed));
        }

        if (rpmFill) {
            const rpmPercent = (rpm / 15000) * 100;
            rpmFill.style.width = `${rpmPercent}%`;

            // Change color based on RPM
            if (rpmPercent > 90) {
                rpmFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #ffff00 50%, #ff0000 80%, #ff0000 100%)';
            } else if (rpmPercent > 70) {
                rpmFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #ffff00 60%, #ff6600 100%)';
            } else {
                rpmFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #ffff00 50%, #ff0000 100%)';
            }
        }

        if (gearElement) {
            let gearString;
            if (gear === 0) gearString = 'N';
            else if (gear === -1) gearString = 'R';
            else gearString = gear.toString();
            
            gearElement.textContent = gearString;
        }
    }

    updateFPS() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        const fps = Math.round(1000 / delta);
        this.fpsHistory.push(fps);

        if (this.fpsHistory.length > 60) {
            this.fpsHistory.shift();
        }

        // Calculate average FPS
        const avgFps = Math.round(
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        );

        const fpsElement = document.getElementById('fpsValue');
        if (fpsElement) {
            fpsElement.textContent = avgFps;

            // Color code FPS
            if (avgFps >= 55) {
                fpsElement.style.color = '#00ff00';
            } else if (avgFps >= 30) {
                fpsElement.style.color = '#ffff00';
            } else {
                fpsElement.style.color = '#ff0000';
            }
        }
    }

    updateMiniMap(carPosition, carRotation) {
        const mapCanvas = document.getElementById('mapCanvas');
        if (!mapCanvas) return;

        const ctx = mapCanvas.getContext('2d');
        const width = mapCanvas.width;
        const height = mapCanvas.height;

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);

        // Draw track outline (simple circle for demo)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Draw car position
        const scale = 2;
        const carX = width / 2 + carPosition.x * scale;
        const carY = height / 2 - carPosition.z * scale;

        // Draw car indicator
        ctx.save();
        ctx.translate(carX, carY);
        ctx.rotate(-carRotation);

        ctx.fillStyle = '#e10600';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-4, 6);
        ctx.lineTo(4, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Draw glow effect
        ctx.shadowColor = '#e10600';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#e10600';
        ctx.beginPath();
        ctx.arc(carX, carY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    highlightControl(key) {
        const keyElement = document.querySelector(`.key[data-key="${key.toUpperCase()}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
            
            gsap.to(keyElement, {
                scale: 0.95,
                duration: 0.1,
                ease: 'power2.out'
            });
        }
    }

    unhighlightControl(key) {
        const keyElement = document.querySelector(`.key[data-key="${key.toUpperCase()}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
            
            gsap.to(keyElement, {
                scale: 1,
                duration: 0.1,
                ease: 'power2.out'
            });
        }
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.disableInteraction();
            document.body.classList.add('loading');
        } else {
            this.enableInteraction();
            document.body.classList.remove('loading');
        }
    }

    updateProgress(percent, message = '') {
        const loadingBar = document.querySelector('.loading-bar');
        const loadingText = document.querySelector('.loading-text');
        const loadingPercent = document.querySelector('.loading-percent');

        if (loadingBar) {
            loadingBar.style.width = `${percent}%`;
        }

        if (loadingText && message) {
            loadingText.textContent = message;
        }

        if (loadingPercent) {
            loadingPercent.textContent = `${Math.round(percent)}%`;
        }
    }

    togglePanel(panelId, show) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        if (show) {
            panel.classList.remove('hidden');
            gsap.fromTo(panel,
                { opacity: 0, x: 50 },
                { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }
            );
        } else {
            gsap.to(panel, {
                opacity: 0,
                x: 50,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    panel.classList.add('hidden');
                }
            });
        }
    }

    // Color picker helper
    createColorPicker(container, colors, onSelect) {
        colors.forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.background = color;
            btn.dataset.color = color;
            btn.addEventListener('click', () => {
                container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                onSelect(color);
            });
            container.appendChild(btn);
        });
    }
}