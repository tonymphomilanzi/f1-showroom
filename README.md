## F1 3D Showroom & Test Drive Experience

![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js)
![JavaScript](https://img.shields.io/badge/ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![GSAP](https://img.shields.io/badge/GSAP-Animations-88CE02?style=for-the-badge&logo=greensock)

**An immersive 3D web experience built with Three.js.**  
This project demonstrates high-fidelity 3D rendering in the browser, featuring a cinematic showroom, real-time vehicle customization, and an arcade-style driving simulation with physics.

![Project Screenshot](https://via.placeholder.com/800x400?text=Replace+with+Your+Screenshot)
*(Replace the link above with a screenshot of your app)*

## ✨ Features

### 🎨 Visuals & Rendering
- **Photorealistic PBR Rendering:** Utilization of `RoomEnvironment` and `PMREMGenerator` for realistic metallic reflections and lighting.
- **Cinematic Intro:** GSAP-powered curtain reveal and camera fly-ins.
- **Dynamic Lighting:** Spotlights, rim lights, and volumetric fog effects.

### 🛠️ Customization
- **Livery Editor:** Change car body color in real-time.
- **Material Finishes:** Toggle between Glossy, Matte, and Metallic paint types.
- **Camera System:** Switch between Orbit, Side, Top, Front, and Cockpit views.

### 🎮 Driving Physics
- **Arcade Controls:** Acceleration, braking, steering, and handbrake logic.
- **Drift Mechanics:** Calculations for sliding friction and visual wheel turning.
- **HUD:** Real-time dash-display (km/h), RPM gauge with shift lights, and gear indicator.
- **Mini-Map:** 2D Canvas overlay tracking car position and rotation.

### 📱 Responsive Design
- **Mobile First:** UI transforms from desktop side-panels to mobile bottom-sheets.
- **Touch/Click Interactions:** Fully interactive UI elements.

## 🚀 Getting Started

### Prerequisites
Since this project uses ES6 Modules and loads external 3D assets (`.gltf`/`.glb`), you cannot simply open `index.html` directly from your file explorer due to browser CORS policies. **You need a local server.**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/f1-showroom.git
   cd f1-showroom