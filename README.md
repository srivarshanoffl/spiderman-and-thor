# Thor vs Doctor Doom: Multiversal Clash (Act 1)

## Project Overview
This project is a cinematic 2.5D web action game built to capture the epic scale and multiversal atmosphere of Marvel Studios' *Avengers: Doomsday*. Act 1 focuses on an intense confrontation between Thor and Doctor Doom. 

The game is designed to be highly cinematic but **easy and beginner-friendly** to play, prioritizing spectacular visuals and forgiving hitboxes over complex combos.

## Tech Stack
- **Engine:** Phaser 3
- **Frontend Framework:** Vite
- **Language:** TypeScript
- **Styling:** Vanilla CSS (for cinematic UI overlays)

## Current Implementation Status
### 1. Scene Architecture (2.5D)
- Built using a layered parallax approach.
- Two high-quality AI-generated backgrounds successfully implemented:
  - `bg_sky.jpg`: Deep background featuring multiversal energy rifts and floating debris.
  - `bg_city.jpg`: Midground featuring destroyed futuristic buildings and smoke (set with additive blending).
- Game action happens on a flat 2D foreground plane.

### 2. Player Controls (Thor)
- **WASD:** Move
- **Space:** Jump
- **Left Click (Basic Attack):** Swings Mjolnir (generous hitbox, screen shake on impact).
- **E (Special Ability):** Lightning Strike. Calls down a vertical bolt directly onto Doom's position.
- **F (Ultimate):** Thunder Slam. Enters slow-motion, Thor leaps into the air, and smashes down with massive Area of Effect (AoE) damage and cinematic camera flash.

### 3. Boss AI (Doctor Doom)
Doom operates on an easy-to-read telegraphing AI loop:
- **Telegraphing:** Doom glows green before launching an attack, giving the player time to react.
- **Attack 1 (Energy Blast):** Shoots a linear projectile across the screen.
- **Attack 2 (Area Trap):** Places a targeted energy trap on the ground near Thor that explodes after a 1.5-second warning delay.
- **Damage Reaction:** Doom flashes white upon taking damage and has a visual health bar on the screen overlay.

### 4. Cinematic UI
- **Intro Screen:** Dark blurred overlay with dramatic typography ("The universe fractures. Reality bleeds.") that transitions into gameplay.
- **HUD:** Minimalist top-corner health bars with gradients, drop shadows, and character names. 
- **Defeat State:** When Doom's health reaches zero, time slows slightly and an "END OF ACT 1" cinematic text sequence triggers.

## File Structure
- `index.html`: Contains the canvas container and HTML/CSS based UI layers.
- `src/style.css`: Styles for the intro cinematic, typography, and health bars.
- `src/main.ts`: The core Phaser 3 game loop containing scene configuration, physics setup, ability logic, and boss AI.
- `public/assets/images/`: Contains the generated `bg_sky.jpg` and `bg_city.jpg`.

## Known Issues & Next Steps
- **Character Sprites:** Due to AI image generation rate limits during initial development, Thor and Doom are currently represented by stylized placeholder graphics (Blue/Grey block for Thor, Green block for Doom). 
- **Next Step:** Generate or import high-fidelity sprite sheets for Thor and Doom (Idle, Walk, Attack, Skill, Hit, Defeat).
- **Audio:** No sound effects or background music have been added yet. Needs epic orchestral tracks, lightning cracks, and heavy impacts.

## How to Run Locally
1. Open terminal in the project directory (`C:\Users\sriva\thor vs doom`).
2. Run `npm install` (if not already installed).
3. Run `npm run dev`.
4. Open the provided localhost URL (typically `http://localhost:5173/`) in your browser.
