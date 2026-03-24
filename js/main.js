// js/main.js
import { SceneManager } from './scene.js';
import { CarControls } from './controls.js';
import { AnimationManager } from './animations.js';
import { UIManager } from './ui.js';

class F1ShowroomApp {
    constructor() {
        // App State
        this.state = {
            view: 'showroom',
            isLoaded: false,
            isDriving: false,
            isMuted: false
        };

        // Configuration
        this.config = {
            modelPath: './models/f1_car/scene.gltf',
            fallbackModel: null // Set to null to trigger procedural placeholder
        };

        this.init();
    }
    
    async init() {
        try {
            // 1. Core Systems
            this.sceneManager = new SceneManager();
            this.animationManager = new AnimationManager();
            this.uiManager = new UIManager(this);
            
            await this.sceneManager.init();
            
            // 2. Load Car
            await this.handleLoading();
            
            // 3. Post-Load Setup
            this.carControls = new CarControls(this.sceneManager.car, this.sceneManager);
            this.setupEventListeners();
            this.startApp();
            
        } catch (error) {
            console.error('App Init Error:', error);
            this.uiManager?.showNotification('Failed to load. Refreshing...', 'error');
        }
    }

    // main.js
async handleLoading() {
    const updateUI = (p) => this.uiManager.updateLoader(p);

    try {
        await this.sceneManager.loadCarModel(this.config.modelPath, updateUI);
        
        // IMPORTANT: Initialize controls ONLY after car is loaded
        this.carControls = new CarControls(this.sceneManager.car, this.sceneManager);
        
    } catch (e) {
        console.warn("Loading error, using placeholder.", e);
        this.sceneManager.createPlaceholderCar();
        this.carControls = new CarControls(this.sceneManager.car, this.sceneManager);
        updateUI(1);
    }
    
    this.state.isLoaded = true;
}

startApp() {
    this.animate();
    
    this.animationManager.playOpeningSequence(() => {
        this.uiManager.enableInteraction();
        this.sceneManager.toggleRotation(true);
        this.switchView('showroom');
        
        // START MUSIC on first interaction
        document.addEventListener('click', () => {
            if (this.sceneManager.sound && !this.sceneManager.sound.isPlaying) {
                this.sceneManager.sound.play();
            }
        }, { once: true });
    });
}

// Update the sound toggle listener
toggleSound() {
    this.state.isMuted = !this.state.isMuted;
    if (this.sceneManager.sound) {
        if (this.state.isMuted) this.sceneManager.sound.setVolume(0);
        else this.sceneManager.sound.setVolume(0.4);
    }
    this.uiManager.showNotification(this.state.isMuted ? 'Audio Muted' : 'Audio Online');
}
    startApp() {
        // Start Loops
        this.animate();
        
        // UI Entrance
        this.animationManager.playOpeningSequence(() => {
            this.uiManager.enableInteraction();
            this.sceneManager.toggleRotation(true);
            this.switchView('showroom');
        });
    }
    
    setupEventListeners() {
        // Navigation & Buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const value = btn.dataset.value;

            switch(action) {
                case 'switch-view': this.switchView(value); break;
                case 'camera':     this.sceneManager.setCameraPosition(value); break;
                case 'color':      this.sceneManager.setCarColor(value); break;
                case 'material':   this.sceneManager.setCarMaterial(value); break;
            }
        });

        // Keyboard Logic
        document.addEventListener('keydown', (e) => this.handleInputs(e, true));
        document.addEventListener('keyup', (e) => this.handleInputs(e, false));

        // Window Resize
        window.addEventListener('resize', () => this.sceneManager.onWindowResize());
    }

    switchView(viewName) {
        this.state.view = viewName;
        this.state.isDriving = (viewName === 'drive');

        // Logic branching
        const isOrbiting = (viewName === 'showroom' || viewName === 'customize');
        this.sceneManager.toggleRotation(isOrbiting);
        this.sceneManager.controls.enabled = !this.state.isDriving;

        // Visual Updates
        this.animationManager.transitionTo(viewName);
        this.uiManager.updateActiveNav(viewName);

        // Specific View Logic
        if (viewName === 'drive') {
            if (this.sceneManager.platform) this.sceneManager.platform.rotation.y = 0;
            this.sceneManager.setCameraPosition('orbit'); 
        }
    }

    handleInputs(event, isDown) {
        if (event.repeat) return;

        // Drive Controls
        if (this.state.isDriving && this.carControls) {
            isDown ? this.carControls.handleKeyDown(event) : this.carControls.handleKeyUp(event);
            this.uiManager.toggleKeyVisual(event.key, isDown);
        }

        // Global Shortcuts
        if (isDown) {
            if (event.key === 'f') this.toggleFullscreen();
            if (event.key === 'Escape' && this.state.isDriving) this.switchView('showroom');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.sceneManager.clock.getDelta();
        
        if (this.state.isDriving && this.carControls) {
            this.carControls.update(delta);
            this.uiManager.syncDashboard(this.carControls);
        }
        
        this.sceneManager.update();
    }

    // System Helpers
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new F1ShowroomApp();
});