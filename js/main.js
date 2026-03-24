// js/main.js

import { SceneManager } from './scene.js';
import { CarControls } from './controls.js';
import { AnimationManager } from './animations.js';
import { UIManager } from './ui.js';

class F1ShowroomApp {
    constructor() {
        this.sceneManager = null;
        this.carControls = null;
        this.animationManager = null;
        this.uiManager = null;
        
        this.currentView = 'showroom';
        this.isLoaded = false;
        this.isDriving = false;
        this.isMuted = false;
        
        // Initialize the app
        this.init();
    }
    
    async init() {
        try {
            // 1. Initialize Managers
            this.sceneManager = new SceneManager();
            this.animationManager = new AnimationManager();
            this.uiManager = new UIManager(this);
            
            // 2. Setup Three.js Scene
            await this.sceneManager.init();
            
            // 3. Setup UI Events (Listeners)
            this.setupEventListeners();

            // 4. Load Content (Car)
            await this.loadCar();
            
            // 5. Initialize Car Physics/Controls (Requires Car to be loaded)
            this.carControls = new CarControls(this.sceneManager.car, this.sceneManager);
            
            // 6. Start the Game Loop
            this.animate();
            
            // 7. Play Opening Animation
            this.startOpeningSequence();
            
        } catch (error) {
            console.error('CRITICAL ERROR:', error);
            alert('Failed to initialize application. See console for details.');
        }
    }
    
    async loadCar() {
        // UI References
        const loadingBar = document.querySelector('.loading-bar');
        const loadingPercent = document.querySelector('.loading-percent');
        const loadingText = document.querySelector('.loading-text');
        
        // ============================================
        // 🔧 CONFIG: Set your model path here
        // ============================================
        // If null, it loads the internal placeholder car
        //const modelPath = null; 
         const modelPath = './models/f1_car/scene.gltf'; 
        // ============================================

        try {
            await this.sceneManager.loadCarModel(
                modelPath,
                (progress) => {
                    // Update Loading UI
                    const percent = Math.round(progress * 100);
                    if (loadingBar) loadingBar.style.width = `${percent}%`;
                    if (loadingPercent) loadingPercent.textContent = `${percent}%`;
                    
                    if (loadingText) {
                        if (percent < 30) loadingText.textContent = 'Loading Assets...';
                        else if (percent < 60) loadingText.textContent = 'Assembling Chassis...';
                        else if (percent < 90) loadingText.textContent = 'Painting Bodywork...';
                        else loadingText.textContent = 'Final Polish...';
                    }
                }
            );
            
            this.isLoaded = true;
            
        } catch (error) {
            console.warn('Model load failed, falling back to placeholder:', error);
            if (loadingText) loadingText.textContent = 'Loading Backup Car...';
            
            // Fallback to procedural car
            this.sceneManager.createPlaceholderCar();
            
            if (loadingBar) loadingBar.style.width = '100%';
            if (loadingPercent) loadingPercent.textContent = '100%';
            this.isLoaded = true;
        }
    }
    
    startOpeningSequence() {
        this.animationManager.playOpeningSequence(() => {
            // Enable interaction only after curtain rises
            this.uiManager.enableInteraction();
            this.sceneManager.toggleRotation(true);
            
            // Show initial view elements
            this.animationManager.showShowroomView();
        });
    }
    
    setupEventListeners() {
        // --- Navigation ---
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // --- Action Buttons ---
        document.getElementById('exploreBtn')?.addEventListener('click', () => {
            this.switchView('drive');
        });
        
        document.getElementById('backToShowroom')?.addEventListener('click', () => {
            this.switchView('showroom');
        });
        
        // --- Camera System ---
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cam = e.target.dataset.cam;
                
                // Update UI active state
                document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.sceneManager.setCameraPosition(cam);
            });
        });
        
        // --- Customization (Colors/Materials) ---
        // Using helper from UIManager to keep code clean
        this.uiManager.setupOptionSelectors('.color-btn', (val) => this.changeCarColor(val));
        this.uiManager.setupOptionSelectors('.material-btn', (val) => this.changeCarMaterial(val));
        this.uiManager.setupOptionSelectors('.rim-btn', (val) => console.log('Rim style:', val)); // Placeholder logic
        
        // --- Global Toggles ---
        document.getElementById('fullscreenToggle')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('soundToggle')?.addEventListener('click', () => this.toggleSound());
        
        // --- Input Handling ---
        // Bind 'this' to methods to preserve class context
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    switchView(view) {
        if (view === this.currentView) return;
        
        // Update Nav UI
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === view);
        });
        
        this.currentView = view;
        this.animationManager.hideAllPanels();

        switch(view) {
            case 'showroom':
                this.setDrivingMode(false);
                this.sceneManager.toggleRotation(true);
                this.sceneManager.setCameraPosition('orbit');
                this.animationManager.showShowroomView();
                break;
                
            case 'drive':
                this.setDrivingMode(true);
                this.sceneManager.toggleRotation(false);
                // Ensure platform aligns with road before driving off
                if(this.sceneManager.platform) {
                    this.sceneManager.platform.rotation.y = 0; 
                }
                this.animationManager.showDriveView();
                break;
                
            case 'specs':
                this.setDrivingMode(false);
                this.sceneManager.toggleRotation(true);
                this.sceneManager.setCameraPosition('side'); // Good angle for specs
                this.animationManager.showSpecsView();
                break;
                
            case 'customize':
                this.setDrivingMode(false);
                this.sceneManager.toggleRotation(true);
                this.sceneManager.setCameraPosition('front'); // Good angle for details
                this.animationManager.showCustomizeView();
                break;
        }
    }

    setDrivingMode(enabled) {
        this.isDriving = enabled;
        
        if (enabled) {
            this.carControls.enable();
            // In driving mode, we disable OrbitControls so the mouse doesn't spin the camera
            this.sceneManager.controls.enabled = false; 
        } else {
            this.carControls.disable();
            this.sceneManager.controls.enabled = true;
        }
    }
    
    // --- Customization Wrappers ---
    changeCarColor(color) {
        this.sceneManager.setCarColor(color);
        this.uiManager.showNotification('Color Applied');
    }
    
    changeCarMaterial(material) {
        this.sceneManager.setCarMaterial(material);
        this.uiManager.showNotification(`Finish: ${material.charAt(0).toUpperCase() + material.slice(1)}`);
    }
    
    // --- Input Handlers ---
    handleKeyDown(e) {
        // Global Shortcuts
        if (e.key === 'f') this.toggleFullscreen();
        if (e.key === 'm') this.toggleSound();
        if (e.key === 'Escape' && this.isDriving) this.switchView('showroom');

        // Driving Controls
        if (this.isDriving && this.carControls) {
            this.carControls.handleKeyDown(e);
            this.uiManager.highlightControl(e.key);
        }
    }
    
    handleKeyUp(e) {
        if (this.isDriving && this.carControls) {
            this.carControls.handleKeyUp(e);
            this.uiManager.unhighlightControl(e.key);
        }
    }
    
    // --- System Toggles ---
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
            this.uiManager.showNotification('Fullscreen Enabled');
        } else {
            document.exitFullscreen();
            this.uiManager.showNotification('Fullscreen Disabled');
        }
    }
    
    toggleSound() {
        this.isMuted = !this.isMuted;
        
        // Visual Update
        const btn = document.getElementById('soundToggle');
        if (btn) {
            btn.style.opacity = this.isMuted ? '0.5' : '1';
        }

        // Logic (Placeholder for actual audio implementation)
        // if(this.audioManager) this.audioManager.setMute(this.isMuted);
        
        this.uiManager.showNotification(this.isMuted ? 'Sound Muted' : 'Sound Enabled');
    }
    
    // --- Main Loop ---
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 1. Get Time Delta
        const delta = this.sceneManager.clock.getDelta();
        
        // 2. Physics & Logic
        if (this.isDriving && this.carControls) {
            this.carControls.update(delta);
            
            // Update UI Elements tied to physics
            this.uiManager.updateSpeedometer(
                this.carControls.speed, 
                this.carControls.rpm, 
                this.carControls.gear
            );
            
            if (this.sceneManager.car) {
                this.uiManager.updateMiniMap(
                    this.sceneManager.car.position,
                    this.sceneManager.car.rotation.y
                );
            }
        }
        
        // 3. Render Scene
        this.sceneManager.update();
        
        // 4. Performance Monitoring
        this.uiManager.updateFPS();
    }
}

// Start App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new F1ShowroomApp(); // Assign to window for debugging
});