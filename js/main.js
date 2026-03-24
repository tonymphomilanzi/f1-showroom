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
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize managers
            this.sceneManager = new SceneManager();
            this.animationManager = new AnimationManager();
            this.uiManager = new UIManager(this);
            
            // Setup scene
            await this.sceneManager.init();
            
            // Load the F1 car model
            await this.loadCar();
            
            // Initialize car controls
            this.carControls = new CarControls(this.sceneManager.car, this.sceneManager);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start the opening animation
            this.startOpeningSequence();
            
            // Start render loop
            this.animate();
            
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }
    
    async loadCar() {
        const loadingBar = document.querySelector('.loading-bar');
        const loadingPercent = document.querySelector('.loading-percent');
        const loadingText = document.querySelector('.loading-text');
        
        try {
            // ============================================
            // MODEL PATH CONFIGURATION
            // ============================================
            // Option 1: Use a real model (uncomment and set path)
             const modelPath = './models/f1_car/scene.gltf';
            // const modelPath = './models/f1_car/scene.glb';
            
            // Option 2: Use placeholder (no model needed)
            //const modelPath = null;
            // ============================================
            
            await this.sceneManager.loadCarModel(
                modelPath,
                (progress) => {
                    const percent = Math.round(progress * 100);
                    loadingBar.style.width = `${percent}%`;
                    loadingPercent.textContent = `${percent}%`;
                    
                    // Update loading message
                    if (percent < 30) {
                        loadingText.textContent = 'Loading Assets...';
                    } else if (percent < 60) {
                        loadingText.textContent = 'Building Car Model...';
                    } else if (percent < 90) {
                        loadingText.textContent = 'Applying Materials...';
                    } else {
                        loadingText.textContent = 'Finalizing...';
                    }
                }
            );
            
            this.isLoaded = true;
            
        } catch (error) {
            console.error('Error loading car:', error);
            loadingText.textContent = 'Using placeholder model...';
            
            // Create a placeholder car if model fails to load
            this.sceneManager.createPlaceholderCar();
            loadingBar.style.width = '100%';
            loadingPercent.textContent = '100%';
            this.isLoaded = true;
        }
    }
    
    startOpeningSequence() {
        this.animationManager.playOpeningSequence(() => {
            // Callback when opening is complete
            this.uiManager.enableInteraction();
            // Start auto-rotation
            this.sceneManager.toggleRotation(true);
        });
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // Explore button
        document.getElementById('exploreBtn')?.addEventListener('click', () => {
            this.switchView('drive');
        });
        
        // Back to showroom
        document.getElementById('backToShowroom')?.addEventListener('click', () => {
            this.switchView('showroom');
        });
        
        // Camera controls
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cam = e.target.dataset.cam;
                this.changeCameraView(cam);
            });
        });
        
        // Color customization
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.changeCarColor(color);
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Material customization
        document.querySelectorAll('.material-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const material = e.target.dataset.material;
                this.changeCarMaterial(material);
                document.querySelectorAll('.material-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Fullscreen
        document.getElementById('fullscreenToggle')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Sound toggle
        document.getElementById('soundToggle')?.addEventListener('click', () => {
            this.toggleSound();
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });
        
        // Keyboard controls for driving
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
  switchView(view) {
    if (view === this.currentView) return;
    
    this.currentView = view;
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === view);
    });
    
    this.animationManager.hidePanels();

    // ✅ Reset platform rotation when entering drive mode
    this.sceneManager.platform.rotation.y = 0;

    switch(view) {
        case 'showroom':
            this.isDriving = false;
            this.carControls?.disable();
            this.sceneManager.controls.enabled = true;
            this.sceneManager.toggleRotation(true);
            this.animationManager.showShowroomView();
            break;
            
        case 'drive':
            this.isDriving = true;
            this.sceneManager.toggleRotation(false);
            this.carControls.reset();
            this.carControls.enable();
            this.sceneManager.controls.enabled = false;
            this.animationManager.showDriveView();
            break;
            
        case 'specs':
            this.isDriving = false;
            this.carControls?.disable();
            this.sceneManager.controls.enabled = true;
            this.sceneManager.toggleRotation(true);
            this.animationManager.showSpecsView();
            break;
            
        case 'customize':
            this.isDriving = false;
            this.carControls?.disable();
            this.sceneManager.controls.enabled = true;
            this.sceneManager.toggleRotation(true);
            this.sceneManager.setCameraPosition('side');
            this.animationManager.showCustomizeView();
            break;
    }
}
    
    changeCameraView(cam) {
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cam === cam);
        });
        
        this.sceneManager.setCameraPosition(cam);
    }
    
    changeCarColor(color) {
        this.sceneManager.setCarColor(color);
        this.uiManager.showNotification(`Color changed`);
    }
    
    changeCarMaterial(material) {
        this.sceneManager.setCarMaterial(material);
        this.uiManager.showNotification(`Finish changed to ${material}`);
    }
    
    handleKeyDown(e) {
        if (!this.isDriving) return;
        
        this.carControls?.handleKeyDown(e);
        
        // Visual feedback for controls
        const key = document.querySelector(`.key[data-key="${e.key.toUpperCase()}"]`);
        if (key) key.classList.add('active');
    }
    
    handleKeyUp(e) {
        if (!this.isDriving) return;
        
        this.carControls?.handleKeyUp(e);
        
        // Remove visual feedback
        const key = document.querySelector(`.key[data-key="${e.key.toUpperCase()}"]`);
        if (key) key.classList.remove('active');
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.uiManager.showNotification('Fullscreen Mode');
        } else {
            document.exitFullscreen();
            this.uiManager.showNotification('Exited Fullscreen');
        }
    }
    
    toggleSound() {
        const icon = document.querySelector('.sound-icon');
        if (icon.textContent === '🔊') {
            icon.textContent = '🔇';
            this.uiManager.showNotification('Sound Off');
        } else {
            icon.textContent = '🔊';
            this.uiManager.showNotification('Sound On');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.sceneManager.clock.getDelta();
        
        // Update car controls if driving
        if (this.isDriving && this.carControls) {
            this.carControls.update(delta);
            this.uiManager.updateSpeedometer(
                this.carControls.speed, 
                this.carControls.rpm, 
                this.carControls.gear
            );
            
            // Update mini map
            if (this.sceneManager.car) {
                this.uiManager.updateMiniMap(
                    this.sceneManager.car.position,
                    this.sceneManager.car.rotation.y
                );
            }
        }
        
        // Update scene
        this.sceneManager.update();
        
        // Update FPS counter
        this.uiManager.updateFPS();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new F1ShowroomApp();
});