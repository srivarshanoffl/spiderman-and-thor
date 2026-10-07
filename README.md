# Spider-Man & Thor: Superhero Web Games Collection

This repository contains two complete Marvel superhero browser games, each housed in its own dedicated folder:

```
├── spiderman/     # Game 1: Spider-Man: Web Chase
├── thor/          # Game 2: Thor vs Doctor Doom (Multiversal Clash)
└── README.md      # Repository overview & quick start guide
```

---

## 🕷️ Game 1: Spider-Man: Web Chase (`spiderman/`)

### Overview
A cinematic 2.5D momentum-based web-swinging game across the Manhattan skyline built with Phaser. Spider-Man pursues a fast-moving Golden Cyber-Falcon through skyscraper anchor points until an unexpected web shooter hardware/event handler defect triggers an interactive diagnostic workbench repair, hardware self-test, test-fire calibration, and high-speed chase resumption to Oscorp Summit.

### Key Features
- **Dynamic Web Swinging & Momentum Physics**: Anchor reticles, high arcs, dive boosts, air steering.
- **AI Target Falcon Pursuer**: Smooth leader governor guarantee, aerial banking, and playful final catch.
- **Interactive 3D Web Shooter Workbench**: Real DOM inspection, 7-point hardware integrity self-test, 450 PSI manifold calibration, and test-firing.
- **Kinematic Multi-State Animations**: 13 character animation states and responsive camera choreography.

### How to Run Spider-Man
1. Navigate to the `spiderman/` folder:
   ```bash
   cd spiderman
   ```
2. Start the local server:
   ```bash
   node server.js
   ```
3. Open `http://127.0.0.1:8085/` (or open `spiderman/index.html` directly in your browser).

---

## ⚡ Game 2: Thor vs Doctor Doom: Multiversal Clash (`thor/`)

### Overview
A cinematic 3D arena action combat game built to capture the epic scale of Marvel Studios' *Avengers: Doomsday*. Face off against Doctor Doom in a low-poly stylized arena featuring dynamic lighting, lightning storms, particle FX, and Doom's toxic green gas system.

### Key Features
- **3D Battle Arena**: Low-poly stylized arena with dynamic lighting, thunderous storm particles, and green gas effects.
- **Hero Abilities**: Mjolnir throws, lightning strikes, shield blocks, and God of Thunder ultimate moves.
- **Full Rigged Animation**: Custom character rigs, hitboxes, combat states, and combos.
- **Battle HUD**: Responsive health bars, stamina gauges, cooldown timers, and combat logs.

### Player Controls (Thor)
- **WASD**: Move
- **Space**: Jump
- **Left Click**: Mjolnir Swing
- **E**: Lightning Strike
- **F**: Thunder Slam (Ultimate)

### How to Run Thor vs Doom Locally
1. Navigate to the `thor/` directory:
   ```bash
   cd thor
   npm install
   npm run dev
   ```
2. Open the local Vite URL (typically `http://localhost:5173/`).

---

## 📁 Repository Structure
```
.
├── .gitignore
├── README.md
├── spiderman/
│   ├── assets/
│   ├── audio/
│   ├── js/
│   ├── config.js
│   ├── game.js
│   ├── index.html
│   ├── server.js
│   ├── styles.css
│   └── README.md
└── thor/
    ├── public/
    ├── src/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    └── README.md
```
