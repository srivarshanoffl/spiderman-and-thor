import * as THREE from 'three';
import { BattleArena } from './scene/BattleArena';
import { SoundSystem } from './audio/SoundSystem';
import { FXSystem } from './effects/FXSystem';
import { GreenGasSystem } from './effects/GreenGasSystem';
import { ThorCharacter } from './characters/ThorCharacter';
import { DoomCharacter } from './characters/DoomCharacter';
import { BattleHUD } from './ui/BattleHUD';

class GameController {
  private arena: BattleArena;
  private sound: SoundSystem;
  private fx: FXSystem;
  private greenGas: GreenGasSystem;
  private hud: BattleHUD;

  private thor: ThorCharacter;
  private doom: DoomCharacter;

  // Act State Machine
  private currentAct: 1 | 2 | 3 = 1;
  private isBattleActive = false;
  private isGameOver = false;
  private isCinematicActive = false;
  private lastTime = performance.now();

  // Input State
  private input = {
    left: false,
    right: false,
    jump: false,
    dodge: false
  };

  constructor() {
    const container = document.getElementById('game-container')!;
    this.arena = new BattleArena(container);
    this.sound = new SoundSystem();
    this.fx = new FXSystem(this.arena.scene);
    this.greenGas = new GreenGasSystem(this.arena.scene);
    this.hud = new BattleHUD();

    this.thor = new ThorCharacter(this.arena.scene, this.sound, this.fx);
    this.doom = new DoomCharacter(this.arena.scene, this.sound, this.fx);

    this.setupInputs();
    this.setupUI();

    // Start render loop
    requestAnimationFrame((t) => this.tick(t));
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Inspection Camera Hotkeys (Checkpoints 1-4)
      if (key === '1') {
        // Thor Face Close-Up
        this.arena.setCameraOverride(
          new THREE.Vector3(this.thor.position.x + 0.35, 1.95, 1.45),
          new THREE.Vector3(this.thor.position.x, 1.90, 0),
          6.0
        );
        return;
      } else if (key === '2') {
        // Thor Complete Character
        this.arena.setCameraOverride(
          new THREE.Vector3(this.thor.position.x, 1.35, 3.8),
          new THREE.Vector3(this.thor.position.x, 1.2, 0),
          6.0
        );
        return;
      } else if (key === '3') {
        // Doom Mask Close-Up
        this.arena.setCameraOverride(
          new THREE.Vector3(this.doom.position.x - 0.35, 1.95, 1.45),
          new THREE.Vector3(this.doom.position.x, 1.90, 0),
          6.0
        );
        return;
      } else if (key === '4') {
        // Doom Complete Character
        this.arena.setCameraOverride(
          new THREE.Vector3(this.doom.position.x, 1.35, 3.8),
          new THREE.Vector3(this.doom.position.x, 1.2, 0),
          6.0
        );
        return;
      } else if (key === '0') {
        // Return to normal 2.5D gameplay camera
        this.arena.setCameraOverride(null, null);
        return;
      }

      // Checkpoint Jump / Test Keys
      if (key === '7' && this.isBattleActive && this.currentAct === 1) {
        // Direct jump to Act 2 Green Gas sequence
        this.triggerAct2GreenGas();
        return;
      } else if (key === '8' && this.isBattleActive && (this.currentAct === 1 || this.currentAct === 2)) {
        // Direct jump to Act 3 Final Blow sequence
        this.greenGas.forceReset();
        this.hud.hideSolveBugButton();
        this.triggerAct3FinalBlow();
        return;
      } else if (key === '9') {
        // Emergency reality / bug safety force reset
        this.greenGas.forceReset();
        this.hud.hideSolveBugButton();
        this.arena.setCameraOverride(null, null);
        this.isCinematicActive = false;
        return;
      }

      if (!this.isBattleActive || this.isGameOver || this.isCinematicActive) return;

      // Movement
      if (key === 'a' || key === 'arrowleft') this.input.left = true;
      if (key === 'd' || key === 'arrowright') this.input.right = true;
      if (key === ' ' || key === 'w' || key === 'arrowup') this.input.jump = true;
      if (key === 'shift' || key === 's' || key === 'arrowdown') this.input.dodge = true;

      // Abilities (Act 1 combat)
      if (key === 'e') {
        this.thor.performLightningSlam((dmg) => this.damageDoom(dmg), this.doom.position);
      }
      if (key === 'f') {
        if (this.currentAct === 3) {
          this.executeFinalBlowSequence();
        } else {
          this.thor.performUltimate(
            (dmg) => this.damageDoom(dmg),
            this.doom.position,
            () => this.arena.triggerScreenShake(0.6)
          );
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') this.input.left = false;
      if (key === 'd' || key === 'arrowright') this.input.right = false;
      if (key === ' ' || key === 'w' || key === 'arrowup') this.input.jump = false;
      if (key === 'shift' || key === 's' || key === 'arrowdown') this.input.dodge = false;
    });

    // Mouse combat attacks
    window.addEventListener('mousedown', (e) => {
      if (!this.isBattleActive || this.isGameOver || this.isCinematicActive) return;

      if (e.button === 0) {
        // LMB: Light Attack 3-hit combo
        this.thor.performLightAttack((dmg) => this.damageDoom(dmg), this.doom.position);
      } else if (e.button === 2) {
        // RMB: Heavy Overhead Strike
        this.thor.performHeavyStrike((dmg) => this.damageDoom(dmg), this.doom.position);
      }
    });

    // Prevent right-click context menu in battle
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupUI() {
    const startBtn = document.getElementById('start-btn');
    const introCinematic = document.getElementById('intro-cinematic');
    const uiLayer = document.getElementById('ui-layer');

    startBtn?.addEventListener('click', () => {
      introCinematic?.classList.add('hidden');
      uiLayer?.classList.remove('hidden');
      this.isBattleActive = true;
      this.currentAct = 1;
      this.sound.playThunderCrack();
      this.arena.triggerScreenShake(0.5);
      this.hud.showActBanner('ACT 1: MULTIVERSAL CLASH', 'THE GOD OF THUNDER VS DOCTOR DOOM');
    });
  }

  private damageDoom(amount: number) {
    if (this.doom.hp <= 0 || this.isCinematicActive) return;

    this.doom.takeDamage(amount);
    this.hud.registerHit();
    this.hud.updateHealth(this.thor.hp, this.thor.maxHp, this.doom.hp, this.doom.maxHp);
    this.hud.spawnDamageNumber(this.doom.position, amount, this.arena.camera, amount >= 60);
    this.arena.triggerScreenShake(amount >= 80 ? 0.45 : 0.22);

    // ACT 1 CLIMAX: When Doom drops to <= 500 HP, transition smoothly into Act 2 Green Gas!
    if (this.currentAct === 1 && this.doom.hp <= 500) {
      this.triggerAct2GreenGas();
    }
  }

  private damageThor(amount: number) {
    if (this.thor.hp <= 0 || this.isCinematicActive) return;

    this.thor.takeDamage(amount);
    this.hud.updateHealth(this.thor.hp, this.thor.maxHp, this.doom.hp, this.doom.maxHp);
    this.hud.spawnPlayerDamageNumber(this.thor.position, amount, this.arena.camera);
    this.arena.triggerScreenShake(0.35);

    if (this.thor.hp <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      setTimeout(() => {
        this.hud.showBanner('DEFEAT', 'DOOM PREVAILS OVER THE GOD OF THUNDER');
      }, 1000);
    }
  }

  // ==========================================
  // ACT 2: DOOM'S MAGICAL GREEN GAS SEQUENCE
  // ==========================================
  private triggerAct2GreenGas() {
    this.currentAct = 2;
    this.isCinematicActive = true;

    // 1. Doom stops normal combat and faces Thor
    this.doom.model.setShieldActive(false);
    this.input.left = false;
    this.input.right = false;

    // 2. Announce Act 2
    this.hud.showActBanner('ACT 2: LATVERIAN DARK SORCERY', 'DOOM RELEASES THE MAGICAL GREEN GAS');
    this.sound.playDoomShieldHum();

    // 3. Camera zooms to emphasize Doom casting
    this.arena.setCameraOverride(
      new THREE.Vector3(this.doom.position.x - 1.4, 1.8, 3.4),
      new THREE.Vector3(this.doom.position.x, 1.6, 0),
      4.0
    );

    // 4. CHECKPOINT 8: Doom visibly performs spell before gas appears
    this.doom.animator.play('DOOM_GAS_CAST', 3.0, false, true);

    // 5. At 1.2s into casting: Green gas erupts from Doom and spreads
    setTimeout(() => {
      this.sound.playDoomPlasmaBlast();
      this.arena.triggerScreenShake(0.6);

      // CHECKPOINT 9: Gas visibly expands from Doom across the arena
      this.greenGas.startSpread(this.doom.position, () => {
        // CHECKPOINT 10: Maximum Gas reached — normal gameplay stopped, UI responsive
        this.onMaximumGasReached();
      });

      // Ease camera back to wide framing to show full arena engulfment
      setTimeout(() => {
        this.arena.setCameraOverride(
          new THREE.Vector3(0, 2.4, 8.5),
          new THREE.Vector3(0, 1.5, 0),
          1.8
        );
      }, 1200);
    }, 1200);
  }

  // Maximum gas density reached: display SOLVE THE BUG button
  private onMaximumGasReached() {
    // Both characters maintain animated combat idle / breathing posture behind the mist
    this.thor.animator.play('IDLE', 1.5, true);
    this.doom.animator.play('IDLE', 2.0, true);

    // CHECKPOINT 11 & 12: Display SOLVE THE BUG button
    this.hud.showSolveBugButton(() => {
      this.executeSolveTheBug();
    });
  }

  // "SOLVE THE BUG" button clicked
  private executeSolveTheBug() {
    this.hud.hideSolveBugButton();
    this.sound.playThunderCrack();
    this.arena.triggerScreenShake(0.5);

    // Animated gas reversal sequence
    this.greenGas.solveBugClear(() => {
      this.onGasCleared();
    });
  }

  // Gas successfully cleared: reveal characters and transition to Act 3
  private onGasCleared() {
    // CHECKPOINT 13: Act 2 End
    // Both characters revealed in animated idle/posture
    this.thor.animator.play('VICTORY', 2.0, false);
    this.doom.animator.play('IDLE', 2.0, true);
    this.sound.playThunderCrack();

    // Camera pushes toward Thor raising Stormbreaker
    this.arena.setCameraOverride(
      new THREE.Vector3(this.thor.position.x + 0.8, 1.8, 3.2),
      new THREE.Vector3(this.thor.position.x, 1.6, 0),
      4.0
    );

    this.hud.showBanner('REALITY RESTORED', 'DOOM\'S SPELL COLLAPSED — PREPARE FOR FINAL STRIKE');

    // Smooth transition to Act 3 after 2.2 seconds
    setTimeout(() => {
      const banner = document.querySelector('.victory-banner');
      banner?.remove();
      this.triggerAct3FinalBlow();
    }, 2200);
  }

  // ==========================================
  // ACT 3: THOR'S FINAL BLOW SEQUENCE
  // ==========================================
  private triggerAct3FinalBlow() {
    this.currentAct = 3;
    this.isCinematicActive = false; // Allow F press or prompt click
    this.arena.setCameraOverride(null, null); // Return to dynamic combat camera

    // Announce Act 3
    this.hud.showActBanner('ACT 3: THE FINAL BLOW', 'ONE DECISIVE STORMBREAKER STRIKE');

    // Display action prompt overlay
    this.hud.showActionPrompt('PRESS [F]', 'UNLEASH THE GOD OF THUNDER', () => {
      this.executeFinalBlowSequence();
    });
  }

  // Execute the single decisive blow
  private executeFinalBlowSequence() {
    if (this.isGameOver) return;
    this.isCinematicActive = true;
    this.hud.hideActionPrompt();

    // 1. CHECKPOINT 14: Final Attack Preparation
    // Thor enters determined stance, Stormbreaker glows intensely
    this.thor.animator.play('THOR_FINAL_BUILDUP', 1.8, false, true);
    this.thor.model.setLightningAura(true, 3.0);
    this.sound.playThunderCrack();

    // Doom braces for desperate defense with forcefield
    this.doom.animator.play('DOOM_FINAL_DEFENSE', 2.0, false, true);
    this.doom.model.setShieldActive(true);

    // Dramatic low-angle cinematic camera tracking Thor
    this.arena.setCameraOverride(
      new THREE.Vector3(this.thor.position.x - 1.2, 0.9, 2.8),
      new THREE.Vector3(this.thor.position.x + 1.2, 1.6, 0),
      5.0
    );

    // 2. Launch Forward & Massive One-Blow Strike
    setTimeout(() => {
      this.sound.playWhoosh(1.8);

      // Thor launches forward across battlefield toward Doom
      this.thor.animator.play('THOR_FINAL_STRIKE', 1.2, false, true);

      // Fast forward launch interpolation
      const startX = this.thor.position.x;
      const targetX = this.doom.position.x - 1.6;
      const launchDuration = 450;
      const launchStart = performance.now();

      const launchAnim = () => {
        const elapsed = performance.now() - launchStart;
        const p = Math.min(elapsed / launchDuration, 1.0);
        this.thor.position.x = THREE.MathUtils.lerp(startX, targetX, p);
        if (p < 1.0) {
          requestAnimationFrame(launchAnim);
        } else {
          // CHECKPOINT 15 & 16: FINAL IMPACT AT IMPACT FRAME
          this.onFinalImpact();
        }
      };
      requestAnimationFrame(launchAnim);
    }, 1200);
  }

  // Impact frame of the final strike
  private onFinalImpact() {
    this.isGameOver = true;

    // Colossal Impact Effects
    this.arena.triggerScreenShake(1.4);
    this.sound.playThunderCrack();
    this.sound.playHeavyAxeImpact();

    // Lightning explosion & ground shockwave
    this.fx.spawnGroundShockwave(this.doom.position, 0x55ccff);
    this.fx.spawnHitSparks(this.doom.position, 0x88eeff, 48);
    this.fx.spawnHitSparks(this.doom.position, 0xffd700, 32);
    this.fx.spawnLightningBolt(
      new THREE.Vector3(this.doom.position.x, 8.0, 0),
      this.doom.position,
      0x88ffff
    );

    // Impact damage popup & health zeroed
    this.doom.hp = 0;
    this.hud.updateHealth(this.thor.hp, this.thor.maxHp, 0, this.doom.maxHp);
    this.hud.spawnDamageNumber(this.doom.position, 9999, this.arena.camera, true);

    // Doom defeated: violently thrown back and falls motionless
    this.doom.model.setShieldActive(false);
    this.doom.animator.play('DOOM_DEFEAT', 3.5, false, true);

    // CHECKPOINT 17 & 18: Post-Defeat Cinematics (Scenes 1 to 10)
    this.playPostDefeatCinematics();
  }

  // 10 Sequential Post-Defeat Animated Scenes
  private playPostDefeatCinematics() {
    // SCENE 1 & 2: Doom thrown backward and falls motionless on the battlefield
    // Impact camera zoom
    this.arena.setCameraOverride(
      new THREE.Vector3(this.doom.position.x - 0.5, 1.2, 3.2),
      new THREE.Vector3(this.doom.position.x, 0.4, 0),
      6.0
    );

    // SCENE 3: Stormbreaker returns to Thor (caught securely)
    setTimeout(() => {
      this.sound.playWhoosh(1.4);
      this.thor.animator.play('IDLE', 1.5, true);
    }, 1400);

    // SCENE 4 & 5: Thor stands in destroyed battlefield, lightning aura gradually disappears
    setTimeout(() => {
      this.thor.model.setLightningAura(false);
      this.arena.setCameraOverride(
        new THREE.Vector3(this.thor.position.x - 1.2, 1.4, 3.8),
        new THREE.Vector3(this.thor.position.x, 1.4, 0),
        3.5
      );
    }, 2800);

    // SCENE 6: Thor slowly looks toward the sky
    setTimeout(() => {
      this.thor.animator.play('THOR_LOOK_SKY', 2.5, false, true);
    }, 4200);

    // SCENE 7 & 8: Multiversal Cosmic Fracture appears in the sky & Thor notices it
    setTimeout(() => {
      this.arena.setFractureActive(true);
      this.sound.playThunderCrack();
      this.arena.triggerScreenShake(0.6);
      this.hud.showActBanner('REALITY TEAR DETECTED', 'A MULTIVERSAL FRACTURE PIERCES THE SKY');
    }, 5600);

    // SCENE 9: Grand wide battlefield camera pullback showing Thor, defeated Doom, and fracture
    setTimeout(() => {
      this.arena.setCameraOverride(
        new THREE.Vector3(0, 4.2, 12.0),
        new THREE.Vector3(0, 3.2, -2.0),
        1.2
      );
    }, 7200);

    // SCENE 10: Final heroic shot & Victory Banner
    setTimeout(() => {
      this.hud.showBanner(
        'VICTORY: DOCTOR DOOM DEFEATED',
        'THE MULTIVERSE AWAKENS... TO BE CONTINUED'
      );
    }, 9500);
  }

  private tick(now: number) {
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.isBattleActive && !this.isGameOver && !this.isCinematicActive) {
      // 1. Update Thor
      this.thor.update(delta, this.doom.position, this.input);

      // 2. Update Doom AI (Act 1 combat)
      if (this.currentAct === 1) {
        this.doom.update(
          delta,
          this.thor.position,
          (dmg) => this.damageThor(dmg),
          () => this.arena.triggerScreenShake(0.4)
        );
      } else {
        // Idle AI in Act 2/3
        this.doom.animator.update(delta);
        this.doom.model.update(delta, new THREE.Vector3());
      }

      // 3. Update Visual Effects & Projectiles
      this.fx.update(delta);

      // 4. Update HUD
      this.hud.update(delta);
      this.hud.updateCooldowns(this.thor.lightningCooldown, 2.0, this.thor.ultimateCooldown, 6.0);

      // 5. Update Dynamic 2.5D Camera
      this.arena.updateCamera(this.thor.position, this.doom.position, delta);
    } else {
      // Cinematic / Post-Defeat / Idle state: update character models & animations without gameplay AI
      this.thor.animator.update(delta);
      this.doom.animator.update(delta);
      this.thor.model.update(delta, new THREE.Vector3());
      this.doom.model.update(delta, new THREE.Vector3());
      this.fx.update(delta);
      this.hud.update(delta);

      // Camera update (obeys camera overrides during cinematics)
      this.arena.updateCamera(this.thor.position, this.doom.position, delta, true);
    }

    // Update Green Gas System
    this.greenGas.update(delta);

    // Render Scene
    this.arena.render();

    requestAnimationFrame((t) => this.tick(t));
  }
}

// Instantiate game controller
window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
