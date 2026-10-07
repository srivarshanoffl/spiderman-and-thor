# Spider-Man: Web Chase

## Project Context
"Spider-Man: Web Chase" is a premium, browser-based, event-quality 2.5D game built with HTML, CSS, JavaScript, and Phaser 4.2.1. The game combines high-speed, momentum-based swinging gameplay with an interactive "break-the-fourth-wall" cinematic diagnostic sequence.

This project was built to deliver a highly polished Marvel Cinematic experience directly in the browser, specifically designed to blend 2D canvas graphics with real DOM interfaces seamlessly.

## What We Built

### 1. Game Architecture & Core Mechanics
- **Engine:** Phaser 4 WebGL canvas paired with absolute-positioned DOM UI overlays.
- **Physics:** Custom momentum-based swinging physics (`SwingSystem.js`) and air-steering mechanics.
- **Environment:** Layered parallax Manhattan skyline (`ParallaxCity.js`) with responsive anchor targeting (`AnchorSystem.js`).
- **AI Target:** A Golden Cyber-Falcon (`BirdTarget.js`) that maintains a dynamic lead distance based on player skill.

### 2. Cinematic Narrative Flow (14 States)
1. **Title & Briefing:** Start screen overlay introducing the mission.
2. **The Chase:** High-speed pursuit across the city, requiring the player to latch onto web anchors to maintain momentum.
3. **The Malfunction:** At a specific point in the chase, the web-shooter fizzles out in mid-air, causing a dramatic camera shudder and forcing an emergency landing on a fire escape.
4. **The Diagnostic Reveal:** An intricate sequence where the game camera zooms in on Spider-Man's wrist, transitioning seamlessly into a 3D exploded view of the web-shooter (`WebShooterDiagnostic.js`).

### 3. The Interactive Workbench (Real DOM Debugging)
- While in the diagnostic state, a sophisticated "J.A.R.V.I.S." overlay appears (`DebugInterface.js`), built entirely in HTML/CSS.
- **The Bug:** The game simulates a real programming bug. The player discovers that the `#web-fire-trigger` event handler is incorrectly bound to `releaseWeb()` instead of `fireWeb()`.
- **The Repair:** Players use the UI to rewire the event handler, retune the PWM solenoid frequency to 450 Hz, and execute a 7-point hardware integrity self-test.
- **Test Fire & Reassembly:** Players initiate a test shot (which pans the canvas camera wide to show the filament deploying), then the mechanical parts snap back together.

### 4. The Grand Finale
- **Resume Chase:** Spider-Man launches off the fire escape with an explosive boost.
- **The Catch:** Upon reaching the Oscorp Summit, a final cinematic sequence plays out where the falcon is safely retrieved and perched on the gauntlet.

### 5. Developer & Testing Infrastructure
- **Tester Toolbar:** Added a quick bypass UI (top right corner) and a keyboard shortcut (`KeyB` / `F4`) that allows developers to instantly bypass the diagnostic sequence.
- **Puppeteer API:** Exposed `window.spidermanChase` and `window.debugWebshooter` global objects for automated browser testing and deterministic state control.
- **Project Cleanup:** Consolidated the deprecated `spiderman-web-error` proof-of-concept into the final `spiderman-web-chase` directory and purged unused placeholder assets.

## File Structure
- `index.html`: Main entry point, DOM UI, and game HUD.
- `styles.css`: Premium CSS styling for the title screen, HUD, and J.A.R.V.I.S. diagnostic workbench.
- `game.js`: The central `MainGameScene` orchestrator managing the 14-state game loop.
- `js/`: Modular class files separating concerns (Input, Physics, AI, Camera, Particles, Diagnostics, UI).
- `assets/`: Game sprites, background layers, and audio files.
