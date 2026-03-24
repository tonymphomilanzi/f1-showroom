// Configuration
const HEADS = ['cat-head', 'orange-head', 'fox-head'];
const BODIES = ['blue-body', 'police-body', 'muscle-body'];

// Resizing Logic: This makes sure it works on Mobile and Desktop
function resizeGame() {
    const game = document.getElementById('game-scaler');
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Target ratio (9:16)
    const targetWidth = 1080;
    const targetHeight = 1920;
    
    const scale = Math.min(windowWidth / targetWidth, windowHeight / targetHeight);
    
    game.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeGame);
window.addEventListener('load', resizeGame);

// Game Logic
const btn = document.getElementById('red-push-button');
const signal = document.getElementById('no-signal');
const slotHead = document.getElementById('slot-head');
const slotBody = document.getElementById('slot-body');

btn.addEventListener('click', () => {
    // 1. Play glitch effect
    signal.classList.add('show-glitch');
    
    // 2. Randomize parts while screen is "broken"
    setTimeout(() => {
        const randomHead = HEADS[Math.floor(Math.random() * HEADS.length)];
        const randomBody = BODIES[Math.floor(Math.random() * BODIES.length)];
        
        // Update screen slots (use your sprite images here)
        slotHead.style.backgroundImage = `url('assets/${randomHead}.png')`;
        slotBody.style.backgroundImage = `url('assets/${randomBody}.png')`;
        
        // Update top character
        document.getElementById('char-head').className = `part ${randomHead}`;
        document.getElementById('char-body').className = `part ${randomBody}`;
        
        // Remove glitch
        signal.classList.remove('show-glitch');
        
        // Add a "Bounce" effect to the character
        const char = document.getElementById('main-char');
        char.style.animation = 'none';
        void char.offsetWidth; // Trigger reflow
        char.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }, 500); // Glitch lasts 0.5 seconds
});