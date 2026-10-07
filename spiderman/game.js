/**
 * SPIDER-MAN: WEB CHASE - Main Game Scene & 14-State Orchestrator
 *
 * Implements the full cinematic narrative:
 * 1. BOOT & TITLE: Mission briefing, golden cyber-falcon target pursuit
 * 2. CHASE_INTRO & CHASE: 5-stage swinging chase across layered Manhattan with dynamic chase assist
 * 3. WEB_MALFUNCTION: Hero chase corner near-catch, web shooter misfire & retracting fizzle
 * 4. RECOVERY: Emergency ledge grab on fire escape, bird glides ahead, Spider-Man stabilizes
 * 5. WEB_SHOOTER_INSPECTION & DIAGNOSTICS: 3D perspective exploded view, real DOM workbench
 * 6. DEBUGGING & REPAIR: Player rectifies #web-fire-trigger -> fireWeb(), solenoid unjams, 450 PSI
 * 7. SYSTEM_TEST & TEST_FIRE: 7-point self-test, wide camera test shot, active reassembly
 * 8. CHASE_RESUME & FINAL CHASE: High-speed pursuit to Oscorp Summit with repaired web-shooter
 * 9. BIRD_CAUGHT & MISSION_COMPLETE: Harmless web wrap, perched cyber-falcon, full mission victory
 */

class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainGameScene' });
  }

  preload() {
    // High-Resolution Background & Landmarks
    this.load.image('skyline_twilight', 'assets/skyline_twilight.jpg');
    this.load.image('prop_water_tower', 'assets/prop_water_tower.png');
    this.load.image('prop_daily_bugle', 'assets/prop_daily_bugle.png');
    this.load.image('prop_stark_logo', 'assets/prop_stark_logo.png');
    this.load.image('prop_hvac', 'assets/prop_hvac.png');
    this.load.image('particle_glow', 'assets/particle_glow.png');

    // Spider-Man HD Sprite Poses
    this.load.image('spiderman_idle', 'assets/spiderman_idle.png');
    this.load.image('spiderman_sprint', 'assets/spiderman_sprint.png');
    this.load.image('spiderman_run', 'assets/spiderman_sprint.png');
    this.load.image('spiderman_swing', 'assets/spiderman_swing.png');
    this.load.image('spiderman_dive', 'assets/spiderman_dive.png');
    this.load.image('spiderman_malfunction_stagger', 'assets/spiderman_malfunction_stagger.png');
    this.load.image('spiderman_recovery_grab', 'assets/spiderman_recovery_grab.png');
    this.load.image('spiderman_wrist_examine', 'assets/spiderman_wrist_examine.png');

    // Golden Cyber-Falcon Multi-Frame Animation Poses
    this.load.image('bird_fly_0', 'assets/bird_fly_0.png');
    this.load.image('bird_fly_1', 'assets/bird_fly_1.png');
    this.load.image('bird_fly_2', 'assets/bird_fly_2.png');
    this.load.image('bird_fly_3', 'assets/bird_fly_3.png');
    this.load.image('bird_perch', 'assets/bird_perch.png');
  }

  create() {
    this.gameState = CONFIG.STATES.BOOT;
    this.swingCount = 0;
    this.distanceTraveled = 0;
    this.misfireAttemptCount = 0;
    this.hasCaughtBird = false;

    // 1. Audio & Input Managers
    this.audio = new AudioManager();
    this.inputMgr = new InputManager(this);

    // 2. Layered Parallax City Environment (Tasks 2, 3, 4)
    this.city = new ParallaxCity(this);
    this.anchors = new AnchorSystem(this);
    this.fx = new FXManager(this);
    this.cameraCtrl = new CameraController(this);
    this.swingSystem = new SwingSystem();

    // 3. Spider-Man Hero (Starts on rooftop at X=160, Y=420)
    this.hero = new SpiderHero(this, 160, 420);
    this.hero.isGrounded = true;

    // 4. Golden Falcon Target AI (Starts ahead at X=520, Y=310) (Task 6 & 8)
    this.bird = new BirdTarget(this, 520, 310);

    // 4b. Dedicated Chase Leader & Speed Governor System (Part 1)
    this.chaseCtrl = new ChaseController(this, this.bird, this.hero, {
      minLeadDistance: 190,
      idealLeadDistance: 270,
      maxLeadDistance: 500,
      birdBaseSpeed: (CONFIG.BIRD && CONFIG.BIRD.BASE_SPEED) || 320,
      birdMaxSpeed: 950
    });

    // 5. 3D Web Shooter Diagnostic & Real DOM Debugging Workbench (Tasks 18 - 34)
    this.webShooterDiag = new WebShooterDiagnostic(this);
    this.debugUI = new DebugInterface(this.audio, this, () => {
      this.handleRepairContinue();
    });

    // 6. Web Visual Graphics (Active swing filament, travel line, capture cocoon)
    this.webGfx = this.add.graphics().setDepth(14);
    this.misfireGfx = this.add.graphics().setDepth(14);

    // 7. Emergency Recovery Platform Anchor (X=3980, Y=360)
    this.recoveryPlatform = {
      x: 3980,
      y: 360,
      width: 140,
      height: 20
    };

    // 8. Bind HTML UI Overlays
    this.bindDomElements();

    // 9. Register Global Testing API for Puppeteer Automation (Task 49 & 50)
    this.initTestingApi();

    // 10. Start in Title State
    this.setGameState(CONFIG.STATES.TITLE);
  }

  bindDomElements() {
    this.domTitleOverlay = document.getElementById('title-overlay');
    this.domCompleteOverlay = document.getElementById('complete-overlay');
    this.domGameHud = document.getElementById('game-hud');
    this.domStartBtn = document.getElementById('btn-start-chase');
    this.domReplayBtn = document.getElementById('btn-replay-chase');
    this.domMeterDistText = document.getElementById('meter-dist-text');
    this.domMeterFillBar = document.getElementById('meter-fill-bar');
    this.domShooterDot = document.getElementById('hud-status-dot');
    this.domShooterLabel = document.getElementById('hud-status-label');
    this.domPromptBanner = document.getElementById('hud-prompt-banner');
    this.domPromptKey = document.getElementById('hud-prompt-key');
    this.domPromptText = document.getElementById('hud-prompt-text');

    if (this.domStartBtn) {
      this.domStartBtn.addEventListener('click', () => {
        this.startChaseMission();
      });
    }

    if (this.domReplayBtn) {
      this.domReplayBtn.addEventListener('click', () => {
        this.restartMission();
      });
    }

    // Keyboard restart listener (Task 56)
    if (this.inputMgr) {
      this.inputMgr.onRestart = () => this.restartMission();
    }
  }

  setGameState(newState) {
    console.log(`[SPIDER-CHASE] Transitioning State: ${this.gameState} -> ${newState}`);
    this.gameState = newState;

    switch (newState) {
      case CONFIG.STATES.TITLE:
        if (this.domTitleOverlay) this.domTitleOverlay.classList.remove('screen-hidden');
        if (this.domGameHud) this.domGameHud.classList.add('screen-hidden');
        if (this.domCompleteOverlay) this.domCompleteOverlay.classList.add('screen-hidden');
        this.hero.setPose('IDLE');
        break;

      case CONFIG.STATES.CHASE_INTRO:
      case CONFIG.STATES.CHASE:
        if (this.domTitleOverlay) this.domTitleOverlay.classList.add('screen-hidden');
        if (this.domGameHud) this.domGameHud.classList.remove('screen-hidden');
        this.updateHudPrompt('SPACE / CLICK', 'AIM NEAR HIGHLIGHTED WEB ANCHORS TO SWING');
        this.updateShooterStatus(true, 'WEB SHOOTER: NOMINAL');
        if (this.chaseCtrl) this.chaseCtrl.startChase();
        break;

      case CONFIG.STATES.WEB_MALFUNCTION:
        if (this.chaseCtrl) this.chaseCtrl.pauseChase();
        this.updateShooterStatus(false, 'WEB SHOOTER: HANDLER ABNORMAL');
        this.updateHudPrompt('SPACE', 'EMERGENCY RECOVERY // AIM FOR EMERGENCY FIRE ESCAPE');
        if (this.domPromptBanner) this.domPromptBanner.classList.add('hud-prompt-warn');
        break;

      case CONFIG.STATES.RECOVERY:
        if (this.chaseCtrl) this.chaseCtrl.pauseChase();
        this.hero.setPose('WRIST_EXAMINE');
        this.hero.vx = 0;
        this.hero.vy = 0;
        this.hero.isGrounded = true;
        this.updateHudPrompt('E / CLICK', 'INSPECT WEB SHOOTER DIAGNOSTICS');
        if (this.domPromptBanner) this.domPromptBanner.classList.remove('hud-prompt-warn');
        break;

      case CONFIG.STATES.WEB_SHOOTER_INSPECTION:
        this.startWebShooterReveal();
        break;

      case CONFIG.STATES.DIAGNOSTICS:
      case CONFIG.STATES.DEBUGGING:
        if (this.debugUI) this.debugUI.show();
        break;

      case CONFIG.STATES.REPAIR:
      case CONFIG.STATES.SYSTEM_TEST:
        // Managed sequentially by debug interface
        break;

      case CONFIG.STATES.CHASE_RESUME:
        if (this.debugUI) this.debugUI.hide();
        if (this.domGameHud) this.domGameHud.classList.remove('screen-hidden');
        if (this.chaseCtrl) this.chaseCtrl.resumeChase();
        if (this.cameraCtrl) this.cameraCtrl.unlockCinematic();
        this.updateShooterStatus(true, 'WEB SHOOTER: RESTORED (450 PSI)');
        this.updateHudPrompt('SPACE / CLICK', 'RESUME PURSUIT // INTERCEPT FALCON AT OSCORP SUMMIT');
        // Hero leaps with explosive forward boost!
        this.hero.setPose('SWING');
        this.hero.isGrounded = false;
        const maxSpd = (CONFIG.PHYSICS && CONFIG.PHYSICS.MAX_SPEED) || 950;
        this.hero.vx = Math.min(maxSpd, 520);
        this.hero.vy = Math.max(-maxSpd, -340);
        if (this.audio) this.audio.playRelease();
        break;

      case CONFIG.STATES.BIRD_CAUGHT:
        this.updateHudPrompt('✦ SUCCESS', 'TARGET CAPTURED SAFELY');
        this.updateShooterStatus(true, 'MISSION ACCOMPLISHED');
        break;

      case CONFIG.STATES.MISSION_COMPLETE:
        if (this.domCompleteOverlay) this.domCompleteOverlay.classList.remove('screen-hidden');
        if (this.domGameHud) this.domGameHud.classList.add('screen-hidden');
        break;
    }

    // Manage tester toolbar visibility: hide during chase & diagnostic modes to avoid overlap
    const testerBar = document.getElementById('tester-bar');
    if (testerBar) {
      const isDiagOrChase = (
        newState === CONFIG.STATES.CHASE ||
        newState === CONFIG.STATES.CHASE_INTRO ||
        newState === CONFIG.STATES.CHASE_RESUME ||
        newState === CONFIG.STATES.WEB_MALFUNCTION ||
        newState === CONFIG.STATES.WEB_SHOOTER_INSPECTION ||
        newState === CONFIG.STATES.DIAGNOSTICS ||
        newState === CONFIG.STATES.DEBUGGING ||
        newState === CONFIG.STATES.REPAIR ||
        newState === CONFIG.STATES.SYSTEM_TEST
      );
      testerBar.style.display = isDiagOrChase ? 'none' : 'flex';
    }

    // Hide context prompt banner when diagnostic overlay or mission complete is active
    if (this.domPromptBanner) {
      const isDiag = (
        newState === CONFIG.STATES.WEB_SHOOTER_INSPECTION ||
        newState === CONFIG.STATES.DIAGNOSTICS ||
        newState === CONFIG.STATES.DEBUGGING ||
        newState === CONFIG.STATES.REPAIR ||
        newState === CONFIG.STATES.SYSTEM_TEST ||
        newState === CONFIG.STATES.MISSION_COMPLETE
      );
      this.domPromptBanner.style.display = isDiag ? 'none' : 'flex';
    }
  }

  startChaseMission() {
    if (this.audio && typeof this.audio.ensureContext === 'function') {
      this.audio.ensureContext();
    }
    this.setGameState(CONFIG.STATES.CHASE);
  }

  update(time, delta) {
    const dt = Math.min(delta * 0.001, 0.033);
    this.inputMgr.update();

    // 1. City & Audio Updates
    this.city.update(this.cameras.main.scrollX, this.cameras.main.scrollY);
    const heroSpeed = Math.sqrt(this.hero.vx * this.hero.vx + this.hero.vy * this.hero.vy);
    const speedRatio = Math.min(heroSpeed / CONFIG.PHYSICS.MAX_SPEED, 1.0);
    this.fx.update(dt, speedRatio, this.swingSystem.isAttached);
    if (this.audio) this.audio.updateWind(speedRatio);

    // 2. Bird AI & Chase Leader Controller
    const isChaseActive = (
      this.gameState === CONFIG.STATES.CHASE ||
      this.gameState === CONFIG.STATES.CHASE_INTRO ||
      this.gameState === CONFIG.STATES.CHASE_RESUME
    );
    if (this.chaseCtrl && isChaseActive) {
      this.chaseCtrl.update(dt);
    }

    const isFlightActive = isChaseActive || (
      this.gameState === CONFIG.STATES.WEB_MALFUNCTION ||
      this.gameState === CONFIG.STATES.RECOVERY ||
      this.gameState === CONFIG.STATES.BIRD_CAUGHT
    );
    if (this.bird && isFlightActive) {
      this.bird.update(dt, this.hero);
      this.updateChaseHud();
    }

    // 3. State-Specific Simulation
    switch (this.gameState) {
      case CONFIG.STATES.TITLE:
        this.updateTitleState(dt);
        break;

      case CONFIG.STATES.CHASE_INTRO:
      case CONFIG.STATES.CHASE:
        this.updateChaseState(dt);
        break;

      case CONFIG.STATES.WEB_MALFUNCTION:
        this.updateMalfunctionState(dt);
        break;

      case CONFIG.STATES.RECOVERY:
        this.updateRecoveryState(dt);
        break;

      case CONFIG.STATES.WEB_SHOOTER_INSPECTION:
      case CONFIG.STATES.DIAGNOSTICS:
      case CONFIG.STATES.DEBUGGING:
      case CONFIG.STATES.REPAIR:
      case CONFIG.STATES.SYSTEM_TEST:
        if (this.webShooterDiag) this.webShooterDiag.update(dt);
        break;

      case CONFIG.STATES.CHASE_RESUME:
        this.updateResumeChaseState(dt);
        break;

      case CONFIG.STATES.BIRD_CAUGHT:
        this.updateBirdCaughtState(dt);
        break;

      case CONFIG.STATES.MISSION_COMPLETE:
        // Victory state: simulation frozen, HUD complete overlay visible
        break;
    }

    // 4. Multi-Target Cinematic Camera Choreography
    if (this.cameraCtrl && this.gameState !== CONFIG.STATES.WEB_SHOOTER_INSPECTION && this.gameState !== CONFIG.STATES.DIAGNOSTICS && this.gameState !== CONFIG.STATES.DEBUGGING) {
      this.cameraCtrl.update(dt, this.hero, speedRatio, this.swingSystem.isAttached, this.bird);
    }

    // 5. Render Web Strings
    this.renderWebString();
  }

  updateTitleState(dt) {
    this.hero.setPose('IDLE');
    this.hero.update(dt, this.inputMgr, false, 0);
  }

  // Tasks 7, 10, 11, 12: Playable Web Chase Gameplay Loop
  updateChaseState(dt) {
    if (this.gameState !== CONFIG.STATES.CHASE && this.gameState !== CONFIG.STATES.CHASE_INTRO) return;

    // Check for Malfunction Trigger Zone (Hero Chase Moment, Task 13)
    if (this.hero.x >= CONFIG.BIRD.MALFUNCTION_TRIGGER_X) {
      this.triggerMalfunctionSequence();
      return;
    }

    // Anchor Targeting
    const nearestAnchor = this.anchors.findBestAnchor(this.hero.x, this.hero.y, this.hero.vx, this.hero.vy);
    this.anchors.update(this.hero.x, this.hero.y, nearestAnchor);

    // Player Trigger Web Shot Input
    if (this.inputMgr.justPressedSpace || this.inputMgr.justClicked) {
      if (!this.swingSystem.isAttached) {
        if (nearestAnchor) {
          this.shootWebAtAnchor(nearestAnchor);
        } else {
          if (this.audio) this.audio.playDud();
          this.flashNoAnchorPrompt();
        }
      }
    }

    // Player Release Web Input
    if (this.inputMgr.justReleasedSpace || this.inputMgr.justReleasedClick) {
      if (this.swingSystem.isAttached) {
        this.releaseWeb();
      }
    }

    // Physics Simulation
    if (this.swingSystem.isAttached) {
      const swingResult = this.swingSystem.update(dt, this.hero, this.inputMgr);
      if (swingResult && swingResult.released) {
        this.hero.setPose('DIVE');
        if (this.audio) this.audio.playRelease();
        this.fx.spawnWebSnap(this.hero.x, this.hero.y);
      } else {
        this.hero.setPose('SWING');
      }
      this.hero.update(dt, this.inputMgr, this.swingSystem.isAttached, this.swingSystem.angle);
    } else {
      this.updateAirborneMovement(dt);
      this.hero.update(dt, this.inputMgr, false, 0);
    }
  }

  flashNoAnchorPrompt() {
    if (this.domPromptBanner) {
      this.domPromptBanner.classList.add('hud-prompt-warn');
      if (this.domPromptText) {
        const orig = this.domPromptText.textContent;
        this.domPromptText.textContent = 'NO ANCHOR IN RANGE // MOVE CLOSER';
        this.time.delayedCall(700, () => {
          if (this.domPromptBanner) this.domPromptBanner.classList.remove('hud-prompt-warn');
          if (this.domPromptText && this.gameState === CONFIG.STATES.CHASE) {
            this.domPromptText.textContent = orig;
          }
        });
      }
    }
  }

  shootWebAtAnchor(anchor) {
    const shootAngle = Math.atan2(anchor.x - this.hero.x, -(anchor.y - this.hero.y));
    if (this.hero.animator) {
      this.hero.animator.triggerShoot(shootAngle);
    }
    this.swingSystem.attach(this.hero, anchor);
    this.swingCount++;
    if (this.chaseCtrl) {
      this.chaseCtrl.notifySwingComplete();
    }
    if (this.audio) this.audio.playShoot();
    this.fx.spawnWebSparks(anchor.x, anchor.y);
  }

  releaseWeb() {
    const releaseRes = this.swingSystem.release(this.hero);
    if (this.chaseCtrl && releaseRes) {
      this.chaseCtrl.notifySwingRelease(releaseRes.launchVx);
    }
    if (this.hero.animator) {
      this.hero.animator.triggerRelease();
    }
    if (this.audio) this.audio.playRelease();
    this.hero.setPose('RELEASE_AERIAL');
    this.time.delayedCall(220, () => {
      if (!this.swingSystem.isAttached && this.gameState === CONFIG.STATES.CHASE) {
        this.hero.setPose('DIVE');
      }
    });
  }

  updateAirborneMovement(dt) {
    // Air steering
    if (this.inputMgr.horizontal !== 0) {
      this.hero.vx += this.inputMgr.horizontal * CONFIG.PHYSICS.RUN_ACCEL * dt * 0.7;
    }

    // Drag and Gravity
    this.hero.vx *= CONFIG.PHYSICS.AIR_DRAG;
    this.hero.vy += CONFIG.PHYSICS.GRAVITY * dt;

    // Advance position
    this.hero.x += this.hero.vx * dt;
    this.hero.y += this.hero.vy * dt;

    // Rooftop floor collision check
    const floorY = 460;
    if (this.hero.y >= floorY) {
      this.hero.y = floorY;
      this.hero.vy = 0;
      this.hero.isGrounded = true;
      if (Math.abs(this.hero.vx) > 30) {
        this.hero.setPose('RUN');
      } else {
        this.hero.setPose('IDLE');
      }
    } else {
      this.hero.isGrounded = false;
      if (this.hero.vy > 100) {
        this.hero.setPose('DIVE');
      }
    }
  }

  // Task 13, 14, 15: Interactive Web Shooter Malfunction
  triggerMalfunctionSequence() {
    if (this.gameState === CONFIG.STATES.WEB_MALFUNCTION) return;

    if (this.swingSystem.isAttached) {
      this.swingSystem.release(this.hero);
    }

    this.setGameState(CONFIG.STATES.WEB_MALFUNCTION);
    this.hero.setPose('MALFUNCTION_STAGGER');
    this.hero.vx = 280;
    this.hero.vy = -160;

    if (this.audio) this.audio.playMalfunction();
    this.fx.spawnMalfunctionSparks(this.hero.x, this.hero.y);

    // Camera brief dramatic shudder
    if (this.cameras.main) {
      this.cameras.main.shake(320, 0.015);
    }
  }

  updateMalfunctionState(dt) {
    this.misfireGfx.clear();

    // Player attempts to shoot web again during malfunction (Task 14 & 15)
    if (this.inputMgr.justPressedSpace || this.inputMgr.justClicked) {
      this.misfireAttemptCount++;
      if (this.audio) this.audio.playMisfire();
      this.fx.spawnMalfunctionSparks(this.hero.x, this.hero.y);

      // Render weak sputtering filament fizzling out
      this.misfireGfx.lineStyle(2, 0xff2a45, 0.85);
      this.misfireGfx.beginPath();
      this.misfireGfx.moveTo(this.hero.x, this.hero.y);
      this.misfireGfx.lineTo(this.hero.x + 80 + Math.random() * 40, this.hero.y - 40 + Math.random() * 20);
      this.misfireGfx.strokePath();

      this.time.delayedCall(160, () => {
        this.misfireGfx.clear();
      });
    }

    // Apply staggered falling physics
    this.hero.vx *= 0.985;
    this.hero.vy += CONFIG.PHYSICS.GRAVITY * dt * 0.85;
    this.hero.x += this.hero.vx * dt;
    this.hero.y += this.hero.vy * dt;

    this.hero.update(dt, this.inputMgr, false, 0);

    // Task 16: Emergency Recovery onto Fire Escape / Perch
    const plat = this.recoveryPlatform;
    if (this.hero.vy > 0 && (
      (this.hero.x >= plat.x - 70 && this.hero.x <= plat.x + plat.width + 80 && this.hero.y >= plat.y - 15 && this.hero.y <= plat.y + 70) ||
      (this.hero.x >= plat.x - 30 && this.hero.y >= 440) ||
      (this.hero.y >= 440)
    )) {
      this.triggerRecoveryPerch();
    }
  }

  triggerRecoveryPerch() {
    this.setGameState(CONFIG.STATES.RECOVERY);
    this.hero.x = this.recoveryPlatform.x + 20;
    this.hero.y = this.recoveryPlatform.y;
    this.hero.vx = 0;
    this.hero.vy = 0;
    this.hero.setPose('RECOVERY_GRAB');
    if (this.audio) this.audio.playLand();

    this.time.delayedCall(800, () => {
      if (this.gameState === CONFIG.STATES.RECOVERY) {
        this.hero.setPose('WRIST_EXAMINE');
      }
    });
  }

  updateRecoveryState(dt) {
    this.hero.update(dt, this.inputMgr, false, 0);

    // Player presses E or space to inspect (Task 17 & 18)
    if (this.inputMgr.justPressedE || this.inputMgr.justPressedSpace || this.inputMgr.justClicked) {
      this.setGameState(CONFIG.STATES.WEB_SHOOTER_INSPECTION);
    }
  }

  // Tasks 18 - 21: Wrist Close-Up & 3D Exploded Reveal
  startWebShooterReveal() {
    if (this.cameraCtrl) {
      this.cameraCtrl.setCinematicFocus(this.hero.x, this.hero.y, 2.1);
    }

    if (this.webShooterDiag) {
      this.webShooterDiag.triggerRevealSequence(() => {
        if (this.gameState === CONFIG.STATES.WEB_SHOOTER_INSPECTION) {
          this.setGameState(CONFIG.STATES.DIAGNOSTICS);
        }
      });
    }
  }

  handleRepairContinue() {
    this.setGameState(CONFIG.STATES.CHASE_RESUME);
  }

  // Tasks 37 & 38: Repaired High-Speed Chase Resumption
  updateResumeChaseState(dt) {
    const nearestAnchor = this.anchors.findBestAnchor(this.hero.x, this.hero.y, this.hero.vx, this.hero.vy);
    this.anchors.update(this.hero.x, this.hero.y, nearestAnchor);

    // Playable Swings with Repaired Shooter
    if (this.inputMgr.justPressedSpace || this.inputMgr.justClicked) {
      if (!this.swingSystem.isAttached) {
        if (nearestAnchor) {
          this.shootWebAtAnchor(nearestAnchor);
        } else {
          if (this.audio) this.audio.playDud();
          this.flashNoAnchorPrompt();
        }
      }
    }

    if (this.inputMgr.justReleasedSpace || this.inputMgr.justReleasedClick) {
      if (this.swingSystem.isAttached) {
        this.releaseWeb();
      }
    }

    if (this.swingSystem.isAttached) {
      const swingResult = this.swingSystem.update(dt, this.hero, this.inputMgr);
      if (swingResult && swingResult.released) {
        this.hero.setPose('DIVE');
        if (this.audio) this.audio.playRelease();
        this.fx.spawnWebSnap(this.hero.x, this.hero.y);
      } else {
        this.hero.setPose('SWING');
      }
      this.hero.update(dt, this.inputMgr, this.swingSystem.isAttached, this.swingSystem.angle);
    } else {
      this.updateAirborneMovement(dt);
      this.hero.update(dt, this.inputMgr, false, 0);
    }

    // Task 39: Final Proximity Check to Catch Bird
    const distToBird = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, this.bird.x, this.bird.y);
    if (this.bird.x >= CONFIG.BIRD.FINAL_CATCH_X - 180 && distToBird <= CONFIG.BIRD.CATCH_DISTANCE + 80) {
      this.triggerBirdCatch();
    }
  }

  // Tasks 39 - 41: Harmless Web Catch & Playful Falcon Landing
  triggerBirdCatch() {
    if (this.hasCaughtBird) return;
    this.hasCaughtBird = true;
    this.setGameState(CONFIG.STATES.BIRD_CAUGHT);

    if (this.swingSystem.isAttached) {
      this.swingSystem.release(this.hero);
    }

    // Spider-Man lands gracefully on Oscorp Tower Summit
    this.hero.vx = 0;
    this.hero.vy = 0;
    this.hero.isGrounded = true;
    this.hero.setPose('IDLE');

    // Camera zooms gently into superhero and falcon
    if (this.cameraCtrl) {
      this.cameraCtrl.setCinematicFocus(this.hero.x + 40, this.hero.y - 10, 1.6);
    }

    // Shoot gentle web filament to reel bird in safely
    if (this.audio) this.audio.playShoot();
    this.bird.triggerCapture(this.hero, () => {
      // Falcon perched happily on gauntlet!
      this.time.delayedCall(1200, () => {
        this.setGameState(CONFIG.STATES.MISSION_COMPLETE);
      });
    });
  }

  updateBirdCaughtState(dt) {
    this.hero.update(dt, this.inputMgr, false, 0);
  }

  renderWebString() {
    this.webGfx.clear();
    const time = this.time.now * 0.001;

    // 1. Swing strand
    if (this.swingSystem.isAttached && this.swingSystem.anchor) {
      const anchor = this.swingSystem.anchor;
      const facing = this.hero.facing || 1;
      const startX = this.hero.x + 10 * facing;
      const startY = this.hero.y - 10;

      // Handle deployment shoot travel animation
      const prog = (typeof this.swingSystem.webProgress === 'number') ? this.swingSystem.webProgress : 1.0;
      const endX = startX + (anchor.x - startX) * prog;
      const endY = startY + (anchor.y - startY) * prog;

      // Taut tension vibration during high-speed arc
      const heroSpd = Math.sqrt(this.hero.vx * this.hero.vx + this.hero.vy * this.hero.vy);
      const isHighTension = (heroSpd > 450 && prog >= 0.95);
      const vibAmp = isHighTension ? Math.sin(time * 35) * 2.2 : 0;

      // Outer braided filament
      this.webGfx.lineStyle(3.5, 0xf5f8ff, 0.95);
      this.webGfx.beginPath();
      this.webGfx.moveTo(startX, startY);
      if (vibAmp !== 0) {
        const midX = (startX + endX) * 0.5;
        const midY = (startY + endY) * 0.5 + vibAmp;
        this.webGfx.lineTo(midX, midY);
      }
      this.webGfx.lineTo(endX, endY);
      this.webGfx.strokePath();

      // High-tensile Core cyan glow
      this.webGfx.lineStyle(1.8, 0x00f0ff, 0.85);
      this.webGfx.beginPath();
      this.webGfx.moveTo(startX, startY);
      if (vibAmp !== 0) {
        const midX = (startX + endX) * 0.5;
        const midY = (startY + endY) * 0.5 + vibAmp;
        this.webGfx.lineTo(midX, midY);
      }
      this.webGfx.lineTo(endX, endY);
      this.webGfx.strokePath();

      // Anchor attachment point energy node
      if (prog >= 0.95) {
        this.webGfx.fillStyle(0x00f0ff, 0.9);
        this.webGfx.fillCircle(anchor.x, anchor.y, 4.5);
      }
    }

    // 2. Final Catch Web Strand (Task 39)
    if (this.gameState === CONFIG.STATES.BIRD_CAUGHT && this.bird && !this.bird.isPerched) {
      this.webGfx.lineStyle(2.5, 0xffffff, 0.95);
      this.webGfx.beginPath();
      this.webGfx.moveTo(this.hero.x + 28, this.hero.y - 12);
      this.webGfx.lineTo(this.bird.x, this.bird.y);
      this.webGfx.strokePath();
    }
  }

  updateChaseHud() {
    if (!this.bird || !this.domMeterDistText || !this.domMeterFillBar) return;
    const distanceMeters = Math.max(0, Math.round((this.bird.x - this.hero.x) * 0.8));
    this.domMeterDistText.textContent = `${distanceMeters} M`;

    // 0m = 100% full, 500m = 10% full
    const pct = Math.max(10, Math.min(100, Math.round(100 - (distanceMeters / 500) * 90)));
    this.domMeterFillBar.style.width = `${pct}%`;
  }

  updateHudPrompt(key, text) {
    if (this.domPromptKey) this.domPromptKey.textContent = key;
    if (this.domPromptText) this.domPromptText.textContent = text;
  }

  updateShooterStatus(isOk, labelText) {
    if (this.domShooterDot) {
      if (isOk) {
        this.domShooterDot.className = 'status-indicator-dot';
      } else {
        this.domShooterDot.className = 'status-indicator-dot status-fault-dot';
      }
    }
    if (this.domShooterLabel) {
      this.domShooterLabel.textContent = labelText;
    }
  }

  restartMission() {
    if (this.debugUI) this.debugUI.destroy();
    if (this.webShooterDiag) this.webShooterDiag.destroy();
    if (this.inputMgr) this.inputMgr.destroy();
    this.scene.restart();
  }

  // Task 49 & 50: Deterministic Testing API for Puppeteer Automation
  initTestingApi() {
    window.spidermanChase = {
      scene: this,
      hero: this.hero,
      bird: this.bird,
      chaseCtrl: this.chaseCtrl,
      animator: this.hero ? this.hero.animator : null,
      birdAnimator: this.bird ? this.bird.animator : null,
      webShooterDiag: this.webShooterDiag,
      debugInterface: this.debugUI,

      getState: () => this.gameState,
      setState: (s) => this.setGameState(s),
      getLeadDistance: () => (this.bird && this.hero) ? (this.bird.x - this.hero.x) : 0,
      getMinLeadDistance: () => this.chaseCtrl ? this.chaseCtrl.minLeadDistance : 190,

      // Deterministic Automation Actions
      startChase: () => {
        this.startChaseMission();
      },

      triggerMalfunction: () => {
        this.hero.x = CONFIG.BIRD.MALFUNCTION_TRIGGER_X + 20;
        this.triggerMalfunctionSequence();
      },

      triggerRecovery: () => {
        this.triggerRecoveryPerch();
      },

      openShooter: () => {
        this.setGameState(CONFIG.STATES.WEB_SHOOTER_INSPECTION);
      },

      openDiagnostics: () => {
        this.setGameState(CONFIG.STATES.DIAGNOSTICS);
        if (this.debugUI) this.debugUI.show();
      },

      selectTrigger: () => {
        if (this.debugUI) this.debugUI.selectSubsystem('trigger');
      },

      applyRepair: () => {
        if (this.debugUI) {
          this.debugUI.handleApplyCorrection();
        }
      },

      runSelfTest: () => {
        if (this.debugUI) {
          this.debugUI.runSystemSelfTest();
        }
      },

      testFire: () => {
        if (this.debugUI) {
          this.debugUI.handleTestFire();
        }
      },

      resumeChase: () => {
        this.setGameState(CONFIG.STATES.CHASE_RESUME);
        if (this.debugUI) {
          this.debugUI.hide();
        }
        if (this.webShooterDiag) {
          this.webShooterDiag.triggerReassembly();
        }
      },

      catchBird: () => {
        this.hero.x = 6450;
        this.hero.y = 390;
        this.bird.x = 6500;
        this.bird.y = 360;
        this.triggerBirdCatch();
      },

      completeMission: () => {
        this.setGameState(CONFIG.STATES.MISSION_COMPLETE);
      },

      restart: () => {
        this.restartMission();
      }
    };

    window.debugWebshooter = () => {
      this.quickDebugWebshooter();
    };

    const btnTester = document.getElementById('btn-quick-debug-shooter');
    if (btnTester) {
      btnTester.addEventListener('click', () => {
        if (window.debugWebshooter) window.debugWebshooter();
      });
    }
  }

  quickDebugWebshooter() {
    console.log('[DEBUG] Quick bypassing web shooter diagnostics...');

    // UI Toast
    const toast = document.getElementById('tester-toast');
    if (toast) {
      toast.textContent = '⚡ Web Shooter Debugged (450 PSI) - Resuming!';
      toast.classList.add('toast-show');
      setTimeout(() => toast.classList.remove('toast-show'), 2500);
    }

    const btn = document.getElementById('btn-quick-debug-shooter');
    if (btn) btn.classList.add('repaired');

    // State fixes
    if (this.webShooterDiag) {
      this.webShooterDiag.isRepaired = true;
      this.webShooterDiag.manifoldPressure = 450;
      this.webShooterDiag.solenoidTravel = 1.0;
    }

    if (this.debugUI) {
      this.debugUI.quickDebugAndPass();
    } else {
      this.setGameState(CONFIG.STATES.CHASE_RESUME);
    }
  }
}

// Phaser 4.2.1 Game Initialization
window.addEventListener('DOMContentLoaded', () => {
  const gameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: CONFIG.CANVAS_WIDTH,
    height: CONFIG.CANVAS_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    render: {
      pixelArt: false,
      antialias: true,
      powerPreference: 'high-performance'
    },
    scene: [MainGameScene]
  };

  window.gameInstance = new Phaser.Game(gameConfig);
});
