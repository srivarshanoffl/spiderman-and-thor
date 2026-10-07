/**
 * WebShooterDiagnostic - Next-Generation Cinematic 2.5D Mechanical Web Shooter Engine
 *
 * Implements a complete high-precision mechanical simulation & cinematic inspection sequence:
 * - Real 3D Perspective Projection Engine with directional lighting, specular highlights & camera orbit
 * - Realistic Spider-Man articulated arm, wrist, and hand rig physically anchored to the gauntlet
 * - City skyline environment maintained in background with dynamic atmospheric lighting
 * - Multi-stage mechanical sequence:
 *   1. Wrist preparation (forearm lifts, wrist rotates inward, fingers flex)
 *   2. Device wake-up (micro-LED boot sequence, power traces, small mechanical click)
 *   3. Mechanical unlock (locking pins retract, titanium lugs disengage, dovetail rails slide open)
 *   4. Controlled exploded view along telescoping chrome guide rods and braided hydraulic conduits
 *   5. Physical fault behavior (solenoid gate jam, 18% travel stutter, 14 PSI starved manifold)
 *   6. Traveling laser diagnostic scan plane with per-component slice highlights
 *   7. Physically anchored 3D leader lines & technical telemetry callouts
 *   8. Interactive hero inspection (selected component moves forward into hero focus)
 *   9. Live interactive repair (PWM frequency tune -> gate pin snap -> fluid surge -> 450 PSI climb)
 *   10. Sequential 6-point hardware self-test
 *   11. Cinematic test fire web projectile with skyscraper impact and taut elastic physics
 *   12. Active mechanical reassembly returning device to wrist before gameplay reentry
 */

class WebShooterDiagnostic {
  constructor(scene) {
    this.scene = scene;

    // Main container anchored in screen space (ScrollFactor 0)
    this.container = scene.add.container(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2)
      .setDepth(30)
      .setScrollFactor(0);
    this.container.setVisible(false);

    // Multi-layer graphics pipelines for optimal 2.5D depth rendering
    this.bgGfx = scene.add.graphics();
    this.armGfx = scene.add.graphics();
    this.guideGfx = scene.add.graphics();
    this.chassisGfx = scene.add.graphics();
    this.internalsGfx = scene.add.graphics();
    this.foregroundGfx = scene.add.graphics();
    this.holoGfx = scene.add.graphics();
    this.calloutGfx = scene.add.graphics();
    this.fxGfx = scene.add.graphics();

    this.container.add([
      this.bgGfx,
      this.armGfx,
      this.guideGfx,
      this.chassisGfx,
      this.internalsGfx,
      this.foregroundGfx,
      this.holoGfx,
      this.calloutGfx,
      this.fxGfx
    ]);

    // Mechanical State & Cinematic Sequence Timers
    this.isActive = false;
    this.isRestored = false;
    this.selectedSubsystem = 'solenoid';
    this.hoveredSubsystem = null;

    // Sequence Progression Controllers (0.0 to 1.0)
    this.wristPrepProgress = 0.0;    // Forearm lift & wrist rotate
    this.wakeProgress = 0.0;         // Device indicator wake-up
    this.unlockProgress = 0.0;       // Locking pins & latch disengage
    this.shellOpenProgress = 0.0;    // Armor cowlings slide outward on dovetails
    this.explodedProgress = 0.0;     // Depth separation along telescoping guide rails
    this.scanProgress = 0.0;         // Traveling diagnostic laser plane
    this.repairProgress = 0.0;       // Physical solenoid unlock & pressure rise
    this.testFireProgress = 0.0;     // Web filament deployment
    this.reassemblyProgress = 0.0;   // Reverse active mechanical latching

    // Live state-driven telemetry
    this.currentPSI = 14;            // Fault = 14 PSI, Restored = 450 PSI
    this.solenoidPinOffset = 0;      // 0 = jammed (0px), 1 = released (-16px)
    this.irisAperture = 0.25;        // 0.25 = restricted, 1.0 = nominal open

    // 3D Perspective & Camera Orbit Parameters
    this.focalLength = 540;
    this.cameraYaw = 0.08;           // Horizontal angle in radians
    this.cameraPitch = 0.05;         // Vertical angle in radians
    this.cameraDistance = 580;
    this.orbitTime = 0;
    this.isOrbiting = true;
    this.orbitIntensity = 1.0;
    this.centerScreenOffset = { x: -40, y: 0 }; // Balanced hero center leaving room for orbital UI

    // Micro-animation timers
    this.timeAccum = 0;
    this.lastSparkTime = 0;
    this.particles = [];

    // Directional Lighting Model (Key Light + Cyan Rim Light)
    this.keyLight = { x: -0.55, y: -0.70, z: 0.45 };
    const klLen = Math.sqrt(this.keyLight.x * this.keyLight.x + this.keyLight.y * this.keyLight.y + this.keyLight.z * this.keyLight.z);
    this.keyLight.x /= klLen;
    this.keyLight.y /= klLen;
    this.keyLight.z /= klLen;

    // Hardware Subsystem Definitions (Coordinates in local 3D device space)
    this.subsystems = {
      solenoid: {
        id: 'solenoid',
        name: 'SOLENOID VALVE GATE',
        short: 'SOLENOID',
        x: 15, y: -8, z: 0,
        width: 60, height: 44, depth: 38,
        status: 'LOCKED // 18% TRAVEL',
        color: 0xff2a45,
        targetPSI: 14,
        description: 'Micro-solenoid coil & gate pin. Mechanical jam detected at 18% travel.'
      },
      pressure: {
        id: 'pressure',
        name: 'PRESSURE MANIFOLD',
        short: 'PRESSURE',
        x: -50, y: -6, z: 20,
        width: 52, height: 64, depth: 42,
        status: 'STARVED // 14 PSI',
        color: 0xffaa00,
        targetPSI: 14,
        description: 'Titanium compression chamber & Bourdon gauge. Starved due to upstream gate lockout.'
      },
      nozzle: {
        id: 'nozzle',
        name: 'LAUNCHER SPINNERET NOZZLE',
        short: 'NOZZLE',
        x: 115, y: -4, z: 80,
        width: 58, height: 58, depth: 48,
        status: 'RESTRICTED // APERTURE 25%',
        color: 0x00f0ff,
        targetPSI: 0,
        description: '6-blade titanium iris spinneret tip with laser targeting & fluid guides.'
      },
      reservoir: {
        id: 'reservoir',
        name: 'POLYMER FLUID RESERVOIR',
        short: 'RESERVOIR',
        x: -125, y: -4, z: -50,
        width: 72, height: 40, depth: 40,
        status: 'NOMINAL // 92% VOL',
        color: 0x00f0ff,
        targetPSI: 450,
        description: 'High-tensile Oscorp polymer fluid ampoule. Fluid viscosity & pressure ready.'
      },
      trigger: {
        id: 'trigger',
        name: 'PIEZO IGNITER TRIGGER',
        short: 'TRIGGER',
        x: -20, y: 44, z: -35,
        width: 44, height: 32, depth: 26,
        status: 'NOMINAL // 3.2V',
        color: 0x00f0ff,
        targetPSI: 0,
        description: 'Dual palm-stud microswitch. Signal continuity verified 3.2V nominal.'
      },
      actuator: {
        id: 'actuator',
        name: 'MICRO-ACTUATOR SERVO',
        short: 'ACTUATOR',
        x: -16, y: -44, z: -10,
        width: 48, height: 36, depth: 32,
        status: 'DESYNCHRONIZED',
        color: 0xffaa00,
        targetPSI: 0,
        description: 'High-torque brass gear train. Awaiting gate alignment frequency.'
      }
    };

    // Interactive pointer tracking
    this.setupPointerListeners();
  }

  setupPointerListeners() {
    this.handlePointerMove = (pointer) => {
      if (!this.isActive || this.explodedProgress < 0.25) return;
      this.checkPointerHover(pointer);
    };

    this.handlePointerDown = (pointer) => {
      if (!this.isActive || this.explodedProgress < 0.25) return;
      this.checkPointerClick(pointer);
    };

    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerdown', this.handlePointerDown);
  }

  checkPointerHover(pointer) {
    const localX = pointer.x - (CONFIG.CANVAS_WIDTH / 2 + this.centerScreenOffset.x);
    const localY = pointer.y - (CONFIG.CANVAS_HEIGHT / 2 + this.centerScreenOffset.y);

    let closestId = null;
    let minDist = 58;

    for (const key of Object.keys(this.subsystems)) {
      const sub = this.subsystems[key];
      const proj = this.project3D(this.getSubsystem3DPos(sub));
      const dist = Phaser.Math.Distance.Between(localX, localY, proj.x, proj.y);
      if (dist < minDist) {
        minDist = dist;
        closestId = key;
      }
    }

    if (this.hoveredSubsystem !== closestId) {
      this.hoveredSubsystem = closestId;
      if (closestId && this.scene.audio) {
        this.scene.audio.playDiagnosticStep();
      }
    }
  }

  checkPointerClick(pointer) {
    if (this.hoveredSubsystem) {
      this.selectSubsystem(this.hoveredSubsystem);
      if (this.scene.debugUI) {
        this.scene.debugUI.selectSubsystem(this.hoveredSubsystem);
      }
    }
  }

  // =========================================================================
  // CINEMATIC SEQUENCE TIMELINE (TASKS 2, 3, 4, 5, 6, 8)
  triggerRevealSequence(onReady) {
    this.show(onReady);
  }

  triggerPhysicalRestoration(onComplete) {
    this.triggerPhysicalRepair(onComplete);
  }

  show(onReady) {
    this.isActive = true;
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.resetState();

    // Fade in container gently over the darkened city
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 650,
      ease: 'Power2'
    });

    // 1. Task 3: Wrist Preparation (Arm lifts, wrist rotates, hand adjusts)
    this.scene.tweens.add({
      targets: this,
      wristPrepProgress: 1.0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // 2. Task 4: Device Wake-Up (Micro-LED boot sequence, power traces, small mechanical click)
        if (this.scene.audio) this.scene.audio.playServoExpand();
        this.scene.tweens.add({
          targets: this,
          wakeProgress: 1.0,
          duration: 400,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            // 3. Task 5: Mechanical Unlock (Locking pins retract, titanium lugs disengage)
            if (this.scene.audio) this.scene.audio.playUnlockLatch();
            this.scene.tweens.add({
              targets: this,
              unlockProgress: 1.0,
              duration: 400,
              ease: 'Back.easeOut',
              onComplete: () => {
                // 4. Task 5: Armor Cowlings Slide Outward on Dovetail Rails
                if (this.scene.audio) this.scene.audio.playRailSlide();
                this.scene.tweens.add({
                  targets: this,
                  shellOpenProgress: 1.0,
                  duration: 450,
                  ease: 'Power2',
                  onComplete: () => {
                    // 5. Task 6: Controlled 2.5D Exploded Mechanical View along Guide Rails
                    this.scene.tweens.add({
                      targets: this,
                      explodedProgress: 1.0,
                      duration: 600,
                      ease: 'Cubic.easeInOut',
                      onComplete: () => {
                        // 6. Task 11: Traveling Diagnostic Laser Scan
                        this.startDiagnosticScan(() => {
                          if (onReady) onReady();
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  resetState() {
    this.wristPrepProgress = 0.0;
    this.wakeProgress = 0.0;
    this.unlockProgress = 0.0;
    this.shellOpenProgress = 0.0;
    this.explodedProgress = 0.0;
    this.scanProgress = 0.0;
    this.repairProgress = 0.0;
    this.testFireProgress = 0.0;
    this.reassemblyProgress = 0.0;
    this.currentPSI = 14;
    this.solenoidPinOffset = 0;
    this.irisAperture = 0.25;
    this.isRestored = false;
    this.selectedSubsystem = 'solenoid';
    this.particles = [];
  }

  // Task 11: Traveling Diagnostic Scan Animation
  startDiagnosticScan(onComplete) {
    this.scanProgress = 0;
    if (this.scene.audio) this.scene.audio.playHoloHum();

    this.scene.tweens.add({
      targets: this,
      scanProgress: 1.0,
      duration: 750,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Solenoid fault warning buzz
        if (!this.isRestored && this.scene.audio) {
          this.scene.audio.playSolenoidJam();
        }
        if (onComplete) onComplete();
      }
    });
  }

  highlightSubsystem(id) {
    if (this.subsystems[id]) {
      this.selectedSubsystem = id;
    }
  }

  selectSubsystem(id) {
    if (this.subsystems[id]) {
      this.selectedSubsystem = id;
      if (this.scene.audio) this.scene.audio.playUIClick();
    }
  }

  // Task 25, 26, 27: Physical Mechanical Repair Sequence
  triggerPhysicalRepair(onComplete) {
    if (this.scene.audio) {
      this.scene.audio.playGatePinSnap();
      this.scene.audio.playPressureSurge();
    }

    this.repairProgress = 0.0;

    this.scene.tweens.add({
      targets: this,
      repairProgress: 1.0,
      duration: 800,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        // Dynamically drive state-based values
        this.currentPSI = Math.round(Phaser.Math.Linear(14, 450, this.repairProgress));
        this.solenoidPinOffset = this.repairProgress;
        this.irisAperture = Phaser.Math.Linear(0.25, 1.0, this.repairProgress);

        // Spawn energetic repair restoration particles
        if (Math.random() < 0.45) {
          this.spawnParticle(15 + Math.random() * 20, -8, 0, 0x00f0ff);
        }
      },
      onComplete: () => {
        this.isRestored = true;
        this.currentPSI = 450;
        this.subsystems.solenoid.status = 'NOMINAL (ALIGNED)';
        this.subsystems.solenoid.color = 0x00f0ff;
        this.subsystems.pressure.status = 'NOMINAL (450 PSI)';
        this.subsystems.pressure.color = 0x00f0ff;
        this.subsystems.nozzle.status = 'READY (100%)';
        this.subsystems.actuator.status = 'SYNCHRONIZED';
        this.subsystems.actuator.color = 0x00f0ff;

        if (this.scene.audio) {
          this.scene.audio.playRestoredFanfare();
        }
        if (onComplete) onComplete();
      }
    });
  }

  // Task 29: Cinematic Test Fire Web Shot Animation
  triggerTestFire(onComplete) {
    this.testFireProgress = 0.0;
    if (this.scene.audio) this.scene.audio.playTestFire();

    // Pulse manifold pressure to 485 PSI spike then settle
    this.currentPSI = 485;

    this.scene.tweens.add({
      targets: this,
      testFireProgress: 1.0,
      duration: 650,
      ease: 'Power2',
      onUpdate: (tween, target) => {
        if (target.testFireProgress > 0.4 && target.testFireProgress < 0.45) {
          if (this.scene.audio) this.scene.audio.playWebTaut();
        }
      },
      onComplete: () => {
        this.currentPSI = 450;
        if (onComplete) onComplete();
      }
    });
  }

  // Task 30: Active Mechanical Reassembly Sequence
  triggerReassembly(onComplete) {
    if (this.scene.audio) this.scene.audio.playReassemble();

    // Collapse exploded depth, draw side plates inward, lock pins
    this.scene.tweens.add({
      targets: this,
      reassemblyProgress: 1.0,
      explodedProgress: 0.0,
      shellOpenProgress: 0.0,
      unlockProgress: 0.0,
      duration: 650,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.hide(onComplete);
      }
    });
  }

  setRestored() {
    this.isRestored = true;
    this.currentPSI = 450;
    this.solenoidPinOffset = 1.0;
    this.irisAperture = 1.0;
  }

  hide(onComplete) {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.isActive = false;
        this.container.setVisible(false);
        if (onComplete) onComplete();
      }
    });
  }

  // =========================================================================
  // 3D PERSPECTIVE ENGINE & COORDINATE PROJECTION
  // =========================================================================

  update(dt) {
    if (!this.isActive) return;

    this.timeAccum += dt;
    this.orbitTime += dt * 0.42;

    // Subtle sinusoidal camera orbit to reveal 3D parallax depth (Task 9)
    if (this.isOrbiting && this.explodedProgress > 0.1) {
      const targetYaw = Math.sin(this.orbitTime) * 0.15 * this.orbitIntensity;
      const targetPitch = Math.cos(this.orbitTime * 0.75) * 0.08 * this.orbitIntensity;
      this.cameraYaw = Phaser.Math.Linear(this.cameraYaw, targetYaw, 0.04);
      this.cameraPitch = Phaser.Math.Linear(this.cameraPitch, targetPitch, 0.04);
    }

    // Micro-motion: Solenoid fault twitch vs Restored pulse (Task 16 & 18)
    if (!this.isRestored && this.explodedProgress > 0.4) {
      if (this.timeAccum - this.lastSparkTime > 0.42 && Math.random() < 0.65) {
        this.lastSparkTime = this.timeAccum;
        this.spawnParticle(15 + (Math.random() * 14 - 7), -8, 0, 0xff2a45);
      }
    }

    // Update particles
    this.updateParticles(dt);

    // Render Multi-Layer Pipeline
    this.renderBackgroundVignette();
    this.renderSpiderArmAndWrist();
    this.renderGuideRodsAndConduits();
    this.renderMechanicalChassis();
    this.renderInternalMechanisms();
    this.renderForegroundArmor();
    this.renderHoloDiagnostics();
    this.renderPhysicalCallouts();
    this.renderTestFireFilament();
    this.renderParticles();
  }

  // 3D -> 2D Perspective Projection Formula with focal depth
  project3D(pos3D) {
    // 1. Rotate around Y axis (Yaw)
    const cosY = Math.cos(this.cameraYaw);
    const sinY = Math.sin(this.cameraYaw);
    const x1 = pos3D.x * cosY - pos3D.z * sinY;
    const z1 = pos3D.x * sinY + pos3D.z * cosY;

    // 2. Rotate around X axis (Pitch)
    const cosP = Math.cos(this.cameraPitch);
    const sinP = Math.sin(this.cameraPitch);
    const y2 = pos3D.y * cosP - z1 * sinP;
    const z2 = pos3D.y * sinP + z1 * cosP;

    // 3. Perspective divide
    const effectiveZ = this.cameraDistance + z2;
    const scale = Math.max(0.2, this.focalLength / effectiveZ);

    const screenX = this.centerScreenOffset.x + x1 * scale;
    const screenY = this.centerScreenOffset.y + y2 * scale;

    return { x: screenX, y: screenY, scale, z: z2 };
  }

  getSubsystem3DPos(sub) {
    // Calculate dynamic 3D position accounting for exploded offsets & hero inspection
    const exp = this.explodedProgress;
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;

    switch (sub.id) {
      case 'nozzle':
        offsetX = exp * 72;
        offsetZ = exp * 90;
        break;
      case 'pressure':
        offsetX = -exp * 32;
        offsetZ = exp * 38;
        break;
      case 'solenoid':
        offsetZ = exp * 18;
        // Selected solenoid moves forward into hero inspection view! (Task 14)
        if (this.selectedSubsystem === 'solenoid' && exp > 0.35) {
          offsetZ += 48;
          offsetY -= 14;
        }
        break;
      case 'reservoir':
        offsetX = -exp * 70;
        offsetZ = -exp * 45;
        break;
      case 'trigger':
        offsetY = exp * 38;
        offsetZ = -exp * 28;
        break;
      case 'actuator':
        offsetY = -exp * 38;
        offsetZ = exp * 12;
        break;
    }

    // Hover lifts component slightly toward camera (Task 13)
    if (this.hoveredSubsystem === sub.id) {
      offsetZ += 22;
    }

    return {
      x: sub.x + offsetX,
      y: sub.y + offsetY,
      z: sub.z + offsetZ
    };
  }

  // Compute shaded directional lighting color
  shadeColor(baseHex, normal) {
    const dot = normal.x * this.keyLight.x + normal.y * this.keyLight.y + normal.z * this.keyLight.z;
    const factor = Math.max(0.18, Math.min(1.35, 0.55 + dot * 0.65));

    const r = Math.min(255, Math.floor(((baseHex >> 16) & 0xff) * factor));
    const g = Math.min(255, Math.floor(((baseHex >> 8) & 0xff) * factor));
    const b = Math.min(255, Math.floor((baseHex & 0xff) * factor));

    return (r << 16) | (g << 8) | b;
  }

  // =========================================================================
  // GRAPHICS RENDERING PIPELINE
  // =========================================================================

  // Task 2 & 39: Background Darkening & Focused Technical Spotlight (City stays visible)
  renderBackgroundVignette() {
    const g = this.bgGfx;
    g.clear();

    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    // Dark cinematic technical vignette over city skyline
    g.fillStyle(0x060c18, 0.78);
    g.fillRect(-w / 2, -h / 2, w, h);

    // Subtle isometric technical grid
    g.lineStyle(1, 0x0f223a, 0.22);
    for (let x = -w / 2; x < w / 2; x += 80) {
      g.lineBetween(x, -h / 2, x, h / 2);
    }
    for (let y = -h / 2; y < h / 2; y += 80) {
      g.lineBetween(-w / 2, y, w / 2, y);
    }

    // Concentric hero spotlight focused on the wrist
    const spotProj = this.project3D({ x: -20, y: 0, z: -30 });
    g.fillStyle(0x00f0ff, 0.04);
    g.fillCircle(spotProj.x, spotProj.y, 240);
    g.fillStyle(0x00f0ff, 0.02);
    g.fillCircle(spotProj.x, spotProj.y, 380);
  }

  // Task 3: Believable Spider-Man Arm, Wrist & Hand Articulated Kinematics Rig
  renderSpiderArmAndWrist() {
    const g = this.armGfx;
    g.clear();

    const prep = this.wristPrepProgress;
    const t = this.timeAccum;

    // Forearm 3D trajectory anchored into scene
    // Lift arm and rotate wrist inward as prep advances
    const forearmRoot3D = { x: -220, y: 110 - prep * 30, z: -170 };
    const wristCenter3D = { x: -40, y: 8 - prep * 12, z: -110 };
    const handCenter3D = { x: 55, y: -6 - prep * 8, z: -85 };

    const pRoot = this.project3D(forearmRoot3D);
    const pWrist = this.project3D(wristCenter3D);
    const pHand = this.project3D(handCenter3D);

    const rs = pRoot.scale;
    const ws = pWrist.scale;
    const hs = pHand.scale;

    // 1. Muscular Forearm Base (Stark Red & Navy Suit Fabric)
    // Dark Blue Underside Panel
    g.fillStyle(0x091428, 0.98);
    g.beginPath();
    g.moveTo(pRoot.x - 70 * rs, pRoot.y + 40 * rs);
    g.lineTo(pWrist.x - 38 * ws, pWrist.y + 24 * ws);
    g.lineTo(pWrist.x + 36 * ws, pWrist.y + 24 * ws);
    g.lineTo(pRoot.x + 65 * rs, pRoot.y + 40 * rs);
    g.closePath();
    g.fillPath();

    // Red Ballistic Muscle Belly (Top Forearm)
    g.fillStyle(0xba1424, 1);
    g.beginPath();
    g.moveTo(pRoot.x - 65 * rs, pRoot.y - 35 * rs);
    g.lineTo(pWrist.x - 35 * ws, pWrist.y - 20 * ws);
    g.lineTo(pWrist.x + 35 * ws, pWrist.y + 20 * ws);
    g.lineTo(pRoot.x + 60 * rs, pRoot.y + 35 * rs);
    g.closePath();
    g.fillPath();
    g.lineStyle(2 * ws, 0xd41c30, 0.9);
    g.strokePath();

    // Black Web Pattern Stitching on Forearm
    g.lineStyle(1.5 * ws, 0x111111, 0.85);
    for (let wLine = 0; wLine < 4; wLine++) {
      const frac = 0.2 + wLine * 0.22;
      const lx1 = Phaser.Math.Linear(pRoot.x - 65 * rs, pWrist.x - 35 * ws, frac);
      const ly1 = Phaser.Math.Linear(pRoot.y - 35 * rs, pWrist.y - 20 * ws, frac);
      const lx2 = Phaser.Math.Linear(pRoot.x + 60 * rs, pWrist.x + 35 * ws, frac);
      const ly2 = Phaser.Math.Linear(pRoot.y + 35 * rs, pWrist.y + 20 * ws, frac);
      g.lineBetween(lx1, ly1, lx2, ly2);
    }

    // 2. Gloved Hand & Articulated Fingers (Micro-motion adjustments)
    const fingerWave = Math.sin(t * 3.5) * 2 * hs;
    // Palm Mass
    g.fillStyle(0xba1424, 1);
    g.fillRoundedRect(pHand.x - 24 * hs, pHand.y - 18 * hs, 48 * hs, 36 * hs, 8 * hs);
    g.lineStyle(2 * hs, 0xd41c30, 1);
    g.strokeRoundedRect(pHand.x - 24 * hs, pHand.y - 18 * hs, 48 * hs, 36 * hs, 8 * hs);

    // Curled Fingers resting naturally under the gauntlet
    g.fillStyle(0x8a0f1b, 1);
    for (let f = 0; f < 4; f++) {
      const fx = pHand.x + (16 + f * 9) * hs;
      const fy = pHand.y + (-4 + f * 4 + fingerWave * (f === 1 ? 1.5 : 0.6)) * hs;
      g.fillRoundedRect(fx, fy, 11 * hs, 18 * hs, 4 * hs);
      g.lineStyle(1.5 * hs, 0x111111, 0.85);
      g.strokeRoundedRect(fx, fy, 11 * hs, 18 * hs, 4 * hs);
    }
    // Thumb resting against side
    g.fillRoundedRect(pHand.x - 14 * hs, pHand.y + 12 * hs, 22 * hs, 12 * hs, 4 * hs);
  }

  // Telescoping Chrome Guide Rails & Braided Hydraulic Fluid Conduits (Tasks 5, 6, 35)
  renderGuideRodsAndConduits() {
    const g = this.guideGfx;
    g.clear();

    const exp = this.explodedProgress;
    const t = this.timeAccum;

    // Dual Polished Chrome Telescoping Guide Rods
    // Rod 1 (Top Guide), Rod 2 (Bottom Guide)
    const zBack = -90;
    const zFront = 80 + exp * 90;

    const pRod1Back = this.project3D({ x: 0, y: -28, z: zBack });
    const pRod1Front = this.project3D({ x: 10 + exp * 72, y: -28, z: zFront });
    const pRod2Back = this.project3D({ x: 0, y: 28, z: zBack });
    const pRod2Front = this.project3D({ x: 10 + exp * 72, y: 28, z: zFront });

    const s = pRod1Back.scale;

    // Chrome Guide Rod 1
    g.lineStyle(4 * s, 0x9eb1c7, 0.95);
    g.lineBetween(pRod1Back.x, pRod1Back.y, pRod1Front.x, pRod1Front.y);
    g.lineStyle(1.5 * s, 0xffffff, 0.9); // Specular reflection
    g.lineBetween(pRod1Back.x, pRod1Back.y - 1, pRod1Front.x, pRod1Front.y - 1);

    // Chrome Guide Rod 2
    g.lineStyle(4 * s, 0x9eb1c7, 0.95);
    g.lineBetween(pRod2Back.x, pRod2Back.y, pRod2Front.x, pRod2Front.y);
    g.lineStyle(1.5 * s, 0xffffff, 0.9);
    g.lineBetween(pRod2Back.x, pRod2Back.y - 1, pRod2Front.x, pRod2Front.y - 1);

    // Telescoping Brass Collar Bushings that slide with exploded carriage
    if (exp > 0.05) {
      const pCollar1 = this.project3D({ x: 5 + exp * 35, y: -28, z: 0 + exp * 30 });
      const pCollar2 = this.project3D({ x: 5 + exp * 35, y: 28, z: 0 + exp * 30 });
      const cs = pCollar1.scale;

      g.fillStyle(0xd4a017, 1); // Polished brass bushing
      g.fillRoundedRect(pCollar1.x - 8 * cs, pCollar1.y - 5 * cs, 16 * cs, 10 * cs, 2 * cs);
      g.fillRoundedRect(pCollar2.x - 8 * cs, pCollar2.y - 5 * cs, 16 * cs, 10 * cs, 2 * cs);
      g.lineStyle(1.5 * cs, 0x5a4208, 1);
      g.strokeRoundedRect(pCollar1.x - 8 * cs, pCollar1.y - 5 * cs, 16 * cs, 10 * cs, 2 * cs);
      g.strokeRoundedRect(pCollar2.x - 8 * cs, pCollar2.y - 5 * cs, 16 * cs, 10 * cs, 2 * cs);
    }

    // Flexible Braided Stainless-Steel Hydraulic Fluid Lines
    // Conduit: Reservoir -> Solenoid -> Manifold -> Nozzle
    const pRes = this.project3D(this.getSubsystem3DPos(this.subsystems.reservoir));
    const pSol = this.project3D(this.getSubsystem3DPos(this.subsystems.solenoid));
    const pPress = this.project3D(this.getSubsystem3DPos(this.subsystems.pressure));
    const pNoz = this.project3D(this.getSubsystem3DPos(this.subsystems.nozzle));

    // Outer Braided Mesh Sleeve
    g.lineStyle(3.5 * s, 0x3d4f68, 0.9);
    g.lineBetween(pRes.x, pRes.y, pSol.x - 15 * s, pSol.y);
    g.lineBetween(pSol.x + 15 * s, pSol.y, pPress.x, pPress.y);
    g.lineBetween(pPress.x, pPress.y, pNoz.x - 18 * s, pNoz.y);

    // Glowing Internal Polymer Fluid Core (Pulses with pressure state)
    const fluidColor = (this.isRestored || this.repairProgress > 0.3) ? 0x00f0ff : 0x007799;
    const fluidAlpha = (this.isRestored || this.repairProgress > 0.3) ? (0.7 + Math.sin(t * 8) * 0.2) : 0.45;
    g.lineStyle(1.8 * s, fluidColor, fluidAlpha);
    g.lineBetween(pRes.x, pRes.y, pSol.x - 15 * s, pSol.y);
    if (this.isRestored || this.repairProgress > 0.4) {
      g.lineBetween(pSol.x + 15 * s, pSol.y, pPress.x, pPress.y);
      g.lineBetween(pPress.x, pPress.y, pNoz.x - 18 * s, pNoz.y);
    }
  }

  // Base Wrist Cuff, Titanium Locking Lugs, Retracting Guide Pins (Task 4 & 5)
  renderMechanicalChassis() {
    const g = this.chassisGfx;
    g.clear();

    const cuffProj = this.project3D({ x: -40, y: 0, z: -110 });
    const s = cuffProj.scale;

    // 1. Heavy-duty Ballistic Carbon-Mesh Wrist Cuff
    g.fillStyle(0x0a101b, 0.98);
    g.fillRoundedRect(cuffProj.x - 128 * s, cuffProj.y - 72 * s, 256 * s, 144 * s, 16 * s);
    g.lineStyle(2.5 * s, 0x223552, 1);
    g.strokeRoundedRect(cuffProj.x - 128 * s, cuffProj.y - 72 * s, 256 * s, 144 * s, 16 * s);

    // Red Spider-Man ballistic reinforcement bands
    g.fillStyle(CONFIG.COLORS.SPIDER_RED, 0.9);
    g.fillRect(cuffProj.x - 125 * s, cuffProj.y - 70 * s, 14 * s, 140 * s);
    g.fillRect(cuffProj.x + 111 * s, cuffProj.y - 70 * s, 14 * s, 140 * s);

    // 2. Titanium Locking Ring & Retracting Pins (Task 5: Pins physically retract!)
    const pinRetract = this.unlockProgress * 15 * s;
    const ringProj = this.project3D({ x: -20, y: 0, z: -85 });
    const rs = ringProj.scale;

    // Top & Bottom Titanium Locking Lugs
    g.fillStyle(0x384a66, 1);
    g.fillRoundedRect(ringProj.x - 90 * rs, ringProj.y - 68 * rs - pinRetract, 24 * rs, 18 * rs, 3 * rs);
    g.fillRoundedRect(ringProj.x - 90 * rs, ringProj.y + 50 * rs + pinRetract, 24 * rs, 18 * rs, 3 * rs);
    g.lineStyle(1.8 * rs, 0x6e8cae, 1);
    g.strokeRoundedRect(ringProj.x - 90 * rs, ringProj.y - 68 * rs - pinRetract, 24 * rs, 18 * rs, 3 * rs);
    g.strokeRoundedRect(ringProj.x - 90 * rs, ringProj.y + 50 * rs + pinRetract, 24 * rs, 18 * rs, 3 * rs);

    // Micro Hex Screws on Lugs
    g.fillStyle(0x111111, 1);
    g.fillCircle(ringProj.x - 78 * rs, ringProj.y - 59 * rs - pinRetract, 2.5 * rs);
    g.fillCircle(ringProj.x - 78 * rs, ringProj.y + 59 * rs + pinRetract, 2.5 * rs);
  }

  // Reservoir, Logic PCB, Actuator, Bourdon Gauge, Solenoid Gate (Tasks 16, 18, 19, 20)
  renderInternalMechanisms() {
    const g = this.internalsGfx;
    g.clear();

    const t = this.timeAccum;

    // 1. Polymer Reservoir (Heavy-Wall Borosilicate Ampoule)
    const resPos = this.getSubsystem3DPos(this.subsystems.reservoir);
    const rp = this.project3D(resPos);
    const rs = rp.scale;

    // Ampoule outer glass casing
    g.fillStyle(0x0c1626, 0.95);
    g.fillRoundedRect(rp.x - 38 * rs, rp.y - 20 * rs, 76 * rs, 40 * rs, 8 * rs);
    g.lineStyle(2 * rs, 0x486c96, 0.9);
    g.strokeRoundedRect(rp.x - 38 * rs, rp.y - 20 * rs, 76 * rs, 40 * rs, 8 * rs);

    // Cyan Polymer fluid with dynamic meniscus wave
    const fluidColor = (this.isRestored || this.repairProgress > 0.4) ? 0x00f0ff : 0x0088aa;
    g.fillStyle(fluidColor, 0.88);
    const wave = Math.sin(t * 3.5) * 1.5 * rs;
    g.fillRect(rp.x - 34 * rs, rp.y - 14 * rs + wave, 68 * rs, 30 * rs - wave);

    // Ampoule measurement calibration ticks
    g.lineStyle(1 * rs, 0xffffff, 0.75);
    for (let k = -26; k <= 26; k += 8) {
      g.lineBetween(rp.x + k * rs, rp.y - 16 * rs, rp.x + k * rs, rp.y - 9 * rs);
    }

    // 2. Logic Board & Micro-Controllers (Gold circuit traces & SMD micro-LEDs)
    const pcbProj = this.project3D({ x: -10, y: 18, z: -30 });
    const ps = pcbProj.scale;
    g.fillStyle(0x081422, 1);
    g.fillRect(pcbProj.x - 48 * ps, pcbProj.y - 14 * ps, 96 * ps, 28 * ps);
    g.lineStyle(1.5 * ps, 0xd4a017, 0.85); // Gold traces
    g.strokeRect(pcbProj.x - 48 * ps, pcbProj.y - 14 * ps, 96 * ps, 28 * ps);
    g.lineBetween(pcbProj.x - 38 * ps, pcbProj.y, pcbProj.x + 38 * ps, pcbProj.y);

    // Diagnostic micro-LEDs (Sequential boot in wake -> Status indicator)
    if (this.wakeProgress > 0.05) {
      const ledColor = this.isRestored ? 0x00f0ff : (Math.sin(t * 12) > 0 ? 0xff2a45 : 0x550010);
      g.fillStyle(0x30d158, 1); // PWR (Green)
      g.fillCircle(pcbProj.x - 30 * ps, pcbProj.y - 4 * ps, 2.5 * ps);
      g.fillStyle(0x00f0ff, 1); // BUS (Blue)
      g.fillCircle(pcbProj.x - 12 * ps, pcbProj.y - 4 * ps, 2.5 * ps);
      g.fillStyle(ledColor, 1); // SENS / FAULT
      g.fillCircle(pcbProj.x + 12 * ps, pcbProj.y - 4 * ps, 3 * ps);
      g.fillCircle(pcbProj.x + 30 * ps, pcbProj.y - 4 * ps, 3 * ps);
    }

    // 3. Micro-Actuator Servo Gearbox (Brass Planetary Gears that physically rotate)
    const actPos = this.getSubsystem3DPos(this.subsystems.actuator);
    const ap = this.project3D(actPos);
    const as = ap.scale;
    g.fillStyle(0x19273c, 1);
    g.fillRoundedRect(ap.x - 24 * as, ap.y - 18 * as, 48 * as, 36 * as, 5 * as);
    g.lineStyle(1.8 * as, 0x4f709c, 1);
    g.strokeRoundedRect(ap.x - 24 * as, ap.y - 18 * as, 48 * as, 36 * as, 5 * as);

    // Rotating planetary gear teeth (Task 18 & 19)
    const gearRot = (this.isRestored || this.repairProgress > 0) ? t * 6.5 : (Math.sin(t * 14) * 0.22);
    g.lineStyle(2.2 * as, 0xcc9933, 1); // Brass gear
    g.strokeCircle(ap.x, ap.y, 9 * as);
    for (let a = 0; a < 6; a++) {
      const ang = gearRot + (a * Math.PI / 3);
      g.lineBetween(ap.x, ap.y, ap.x + Math.cos(ang) * 12 * as, ap.y + Math.sin(ang) * 12 * as);
    }

    // 4. Pressure Manifold & Analog Bourdon Dial Gauge (Task 19 & 20)
    const pressPos = this.getSubsystem3DPos(this.subsystems.pressure);
    const pp = this.project3D(pressPos);
    const pps = pp.scale;

    // High pressure alloy chamber block
    g.fillStyle(0x121d30, 1);
    g.fillRoundedRect(pp.x - 26 * pps, pp.y - 32 * pps, 52 * pps, 64 * pps, 7 * pps);
    g.lineStyle(2 * pps, 0x416290, 1);
    g.strokeRoundedRect(pp.x - 26 * pps, pp.y - 32 * pps, 52 * pps, 64 * pps, 7 * pps);

    // Circular Analog Bourdon Dial Gauge with Knurled Bezel
    g.fillStyle(0x070e1c, 1);
    g.fillCircle(pp.x, pp.y, 18 * pps);
    g.lineStyle(2 * pps, 0x00f0ff, 0.75);
    g.strokeCircle(pp.x, pp.y, 18 * pps);

    // Gauge Tick Marks (0, 100, 200, 300, 400, 500 PSI)
    g.lineStyle(1 * pps, 0x7090b8, 0.8);
    for (let deg = -135; deg <= 135; deg += 45) {
      const rad = deg * Math.PI / 180;
      g.lineBetween(pp.x + Math.cos(rad) * 14 * pps, pp.y + Math.sin(rad) * 14 * pps,
                    pp.x + Math.cos(rad) * 17 * pps, pp.y + Math.sin(rad) * 17 * pps);
    }

    // Dial Needle (Points to 14 PSI in fault -> 450 PSI in nominal)
    const psiRatio = Math.min(1.0, Math.max(0.0, this.currentPSI / 450));
    const needleAngle = -Math.PI * 0.75 + psiRatio * Math.PI * 1.5;
    const needleColor = this.currentPSI >= 400 ? 0x00f0ff : 0xff2a45;
    g.lineStyle(2.2 * pps, needleColor, 1);
    g.lineBetween(pp.x, pp.y, pp.x + Math.cos(needleAngle) * 14 * pps, pp.y + Math.sin(needleAngle) * 14 * pps);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(pp.x, pp.y, 2.5 * pps);

    // 5. SOLENOID VALVE GATE (THE HERO FAULT ROOT CAUSE) (Task 16 & 27)
    const solPos = this.getSubsystem3DPos(this.subsystems.solenoid);
    const sp = this.project3D(solPos);
    const ss = sp.scale;

    // Solenoid bracket frame
    g.fillStyle(0x142238, 1);
    g.fillRoundedRect(sp.x - 30 * ss, sp.y - 22 * ss, 60 * ss, 44 * ss, 7 * ss);
    const bracketStroke = (this.selectedSubsystem === 'solenoid' ? 0x00f0ff : 0x4f709c);
    g.lineStyle(2.2 * ss, bracketStroke, 1);
    g.strokeRoundedRect(sp.x - 30 * ss, sp.y - 22 * ss, 60 * ss, 44 * ss, 7 * ss);

    // Precision Wound Copper Solenoid Coil Windings (5 distinct turns)
    const coilColor = this.isRestored ? 0x00f0ff : 0xb86b24;
    g.fillStyle(coilColor, 1);
    for (let c = 0; c < 5; c++) {
      g.fillRect(sp.x - 24 * ss + c * 9 * ss, sp.y - 15 * ss, 6 * ss, 30 * ss);
    }

    // Sliding Titanium Valve Gate Pin (Task 16: Shudders on fault! Snaps on repair!)
    let pinJitter = 0;
    if (!this.isRestored) {
      // 18% travel fault vibration
      pinJitter = Math.sin(t * 38) * 1.4 * ss;
    }
    const pinTravel = -this.solenoidPinOffset * 15 * ss + pinJitter;
    g.fillStyle(0xdde5ee, 1); // Polished titanium pin
    g.fillRoundedRect(sp.x + 20 * ss + pinTravel, sp.y - 9 * ss, 9 * ss, 18 * ss, 2 * ss);
    g.lineStyle(1.2 * ss, 0x111111, 1);
    g.strokeRoundedRect(sp.x + 20 * ss + pinTravel, sp.y - 9 * ss, 9 * ss, 18 * ss, 2 * ss);
  }

  // Sliding Armor Cowlings on Dovetails & 6-Blade Iris Spinneret Nozzle (Task 5, 6, 7)
  renderForegroundArmor() {
    const g = this.foregroundGfx;
    g.clear();

    const t = this.timeAccum;

    // 1. Sliding Titanium Armor Cowlings (Task 5: Dovetails slide out!)
    const shellOffset = this.shellOpenProgress * 48;
    const topShellProj = this.project3D({ x: -20, y: -48 - shellOffset, z: 25 });
    const botShellProj = this.project3D({ x: -20, y: 48 + shellOffset, z: 25 });
    const ts = topShellProj.scale;
    const bs = botShellProj.scale;

    // Top Armor Plate (Brushed Titanium with red Stark accent & serial)
    g.fillStyle(0x1d2a3e, 0.96);
    g.fillRoundedRect(topShellProj.x - 90 * ts, topShellProj.y - 18 * ts, 180 * ts, 36 * ts, 6 * ts);
    g.lineStyle(2 * ts, 0x50709c, 1);
    g.strokeRoundedRect(topShellProj.x - 90 * ts, topShellProj.y - 18 * ts, 180 * ts, 36 * ts, 6 * ts);
    g.fillStyle(CONFIG.COLORS.SPIDER_RED, 1);
    g.fillRect(topShellProj.x - 75 * ts, topShellProj.y - 4 * ts, 55 * ts, 6 * ts);

    // Bottom Armor Plate
    g.fillStyle(0x1d2a3e, 0.96);
    g.fillRoundedRect(botShellProj.x - 90 * bs, botShellProj.y - 18 * bs, 180 * bs, 36 * bs, 6 * bs);
    g.lineStyle(2 * bs, 0x50709c, 1);
    g.strokeRoundedRect(botShellProj.x - 90 * bs, botShellProj.y - 18 * bs, 180 * bs, 36 * bs, 6 * bs);
    g.fillStyle(CONFIG.COLORS.SPIDER_RED, 1);
    g.fillRect(botShellProj.x - 75 * bs, botShellProj.y - 2 * bs, 55 * bs, 6 * bs);

    // 2. LAUNCHER SPINNERET NOZZLE & 6-BLADE MECHANICAL IRIS (Task 6 & 19)
    const nozPos = this.getSubsystem3DPos(this.subsystems.nozzle);
    const np = this.project3D(nozPos);
    const ns = np.scale;

    // Outer Nozzle Collar Ring
    g.fillStyle(0x18263c, 1);
    g.fillCircle(np.x, np.y, 28 * ns);
    g.lineStyle(2.5 * ns, 0x5276a4, 1);
    g.strokeCircle(np.x, np.y, 28 * ns);

    // Rotating Calibration Vernier Ring
    const calibRot = (this.isRestored || this.repairProgress > 0) ? t * 2.8 : 0;
    g.lineStyle(1.8 * ns, 0x00f0ff, 0.85);
    for (let i = 0; i < 8; i++) {
      const ang = calibRot + (i * Math.PI / 4);
      g.lineBetween(np.x + Math.cos(ang) * 23 * ns, np.y + Math.sin(ang) * 23 * ns,
                    np.x + Math.cos(ang) * 27 * ns, np.y + Math.sin(ang) * 27 * ns);
    }

    // 6-Blade Mechanical Iris Aperture (Physically opens/closes from 0.25 to 1.0)
    const irisR = 8 * ns + this.irisAperture * 9 * ns;
    g.fillStyle(0x060c18, 1);
    g.fillCircle(np.x, np.y, irisR);

    // Overlapping Titanium Iris Blades
    g.lineStyle(1.5 * ns, 0x8aa6c8, 0.75);
    for (let b = 0; b < 6; b++) {
      const bladeAngle = calibRot + (b * Math.PI / 3);
      g.lineBetween(np.x + Math.cos(bladeAngle) * irisR, np.y + Math.sin(bladeAngle) * irisR,
                    np.x + Math.cos(bladeAngle + 0.6) * 26 * ns, np.y + Math.sin(bladeAngle + 0.6) * 26 * ns);
    }

    // Central Emitter Core Diode Glow
    const coreColor = this.isRestored ? 0x00f0ff : CONFIG.COLORS.WARN_RED;
    g.fillStyle(coreColor, 1);
    g.fillCircle(np.x, np.y, 5 * ns);
    g.lineStyle(2 * ns, 0xffffff, 0.9);
    g.strokeCircle(np.x, np.y, 5 * ns);
  }

  // Traveling Laser Scan Plane, Energy Flow Paths & Holographic Rings (Tasks 10, 11, 15)
  renderHoloDiagnostics() {
    const h = this.holoGfx;
    h.clear();

    if (this.explodedProgress < 0.2) return;

    const t = this.timeAccum;

    // 1. Traveling Laser Diagnostic Scan Plane (Task 11)
    if (this.scanProgress > 0.01 && this.scanProgress < 0.99) {
      const scanX3D = -150 + this.scanProgress * 300;
      const pTop = this.project3D({ x: scanX3D, y: -80, z: 0 });
      const pBot = this.project3D({ x: scanX3D, y: 80, z: 0 });

      // Luminous laser plane
      const scanColor = (scanX3D > -15 && scanX3D < 65 && !this.isRestored) ? 0xff2a45 : 0x00f0ff;
      h.lineStyle(3, scanColor, 0.88);
      h.lineBetween(pTop.x, pTop.y, pBot.x, pBot.y);

      h.fillStyle(scanColor, 0.12);
      h.fillRect(pTop.x - 22, pTop.y, 44, pBot.y - pTop.y);
    }

    // 2. Holographic Scan Arc around Emitter Nozzle
    const nozPos = this.getSubsystem3DPos(this.subsystems.nozzle);
    const np = this.project3D(nozPos);
    const ns = np.scale;

    const holoColor = this.isRestored ? 0x00f0ff : CONFIG.COLORS.WARN_RED;
    h.lineStyle(1.8 * ns, holoColor, 0.7);
    h.strokeCircle(np.x, np.y, 40 * ns);

    // Rotating dashed target arc
    const arcStart = t * 2.8;
    h.lineStyle(2.5 * ns, holoColor, 0.95);
    h.beginPath();
    h.arc(np.x, np.y, 46 * ns, arcStart, arcStart + 1.8, false);
    h.strokePath();

    // 3. System Dependency Energy Flow Path (Task 15)
    // TRIGGER -> MCU -> SOLENOID -> PRESSURE -> NOZZLE
    if (this.selectedSubsystem === 'solenoid' || this.isRestored) {
      const pTrig = this.project3D(this.getSubsystem3DPos(this.subsystems.trigger));
      const pPcb = this.project3D({ x: -10, y: 18, z: -30 });
      const pSol = this.project3D(this.getSubsystem3DPos(this.subsystems.solenoid));
      const pPress = this.project3D(this.getSubsystem3DPos(this.subsystems.pressure));
      const pNoz = this.project3D(this.getSubsystem3DPos(this.subsystems.nozzle));

      // Path 1: Trigger -> MCU -> Solenoid (Nominal Cyan)
      h.lineStyle(2, 0x00f0ff, 0.85);
      h.lineBetween(pTrig.x, pTrig.y, pPcb.x, pPcb.y);
      h.lineBetween(pPcb.x, pPcb.y, pSol.x, pSol.y);

      // Path 2: Solenoid -> Pressure -> Nozzle (Fault = Broken Red / Restored = Solid Cyan)
      if (this.isRestored) {
        h.lineStyle(2.5, 0x00f0ff, 0.9);
        h.lineBetween(pSol.x, pSol.y, pPress.x, pPress.y);
        h.lineBetween(pPress.x, pPress.y, pNoz.x, pNoz.y);
      } else {
        // Interrupted dashed path stopping at jammed solenoid
        h.lineStyle(2, 0xff2a45, 0.65);
        h.lineBetween(pSol.x, pSol.y, pPress.x, pPress.y);
        // Warning X indicator at solenoid
        h.fillStyle(0xff2a45, 1);
        h.fillCircle(pSol.x + 20, pSol.y, 5);
      }
    }
  }

  // Physically-Anchored Technical Callout Lines & Telemetry Badges (Task 12, 13, 14)
  renderPhysicalCallouts() {
    const c = this.calloutGfx;
    c.clear();

    if (this.explodedProgress < 0.35) return;

    for (const key of Object.keys(this.subsystems)) {
      const sub = this.subsystems[key];
      const isSelected = (this.selectedSubsystem === key);
      const isHovered = (this.hoveredSubsystem === key);
      const isFault = (key === 'solenoid' && !this.isRestored);

      // Hierarchy: Non-selected subsystems stay subtle; selected/fault pop! (Task 41)
      if (!isSelected && !isHovered && !isFault) continue;

      const subPos = this.getSubsystem3DPos(sub);
      const proj = this.project3D(subPos);
      const color = isFault ? 0xff2a45 : (isSelected ? 0x00f0ff : 0x7090b8);
      const alpha = isSelected ? 1.0 : (isHovered ? 0.85 : 0.6);

      // 1. Anchor Dot on physical component
      c.fillStyle(color, alpha);
      c.fillCircle(proj.x, proj.y, isSelected ? 4.5 : 3.5);

      // 2. Right-angle leader line extending outward
      const leaderY = proj.y < 0 ? proj.y - 42 : proj.y + 42;
      const leaderX = proj.x > 0 ? proj.x + 68 : proj.x - 68;

      c.lineStyle(1.6, color, alpha);
      c.lineBetween(proj.x, proj.y, proj.x, leaderY);
      c.lineBetween(proj.x, leaderY, leaderX, leaderY);

      // 3. Anchor bounding bracket around component
      if (isSelected || isHovered) {
        const bw = (sub.width / 2) * proj.scale;
        const bh = (sub.height / 2) * proj.scale;
        c.lineStyle(1.6, color, alpha * 0.85);
        c.strokeRect(proj.x - bw, proj.y - bh, bw * 2, bh * 2);
      }
    }
  }

  // Cinematic Test Fire Web Filament & Skyscraper Impact (Task 29)
  renderTestFireFilament() {
    if (this.testFireProgress <= 0.01) return;

    const g = this.fxGfx;
    g.clear();

    const nozPos = this.getSubsystem3DPos(this.subsystems.nozzle);
    const startProj = this.project3D(nozPos);

    // Target skyscraper building facade across twilight city
    const targetX = startProj.x + 600;
    const targetY = startProj.y - 130;

    const curX = Phaser.Math.Linear(startProj.x, targetX, this.testFireProgress);
    const curY = Phaser.Math.Linear(startProj.y, targetY, this.testFireProgress);

    // High-tensile white/cyan web filament
    g.lineStyle(5, 0xffffff, 0.98);
    g.lineBetween(startProj.x, startProj.y, curX, curY);

    g.lineStyle(14, 0x00f0ff, 0.45);
    g.lineBetween(startProj.x, startProj.y, curX, curY);

    // Leading aerodynamic projectile head
    g.fillStyle(0x00f0ff, 1);
    g.fillCircle(curX, curY, 9);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(curX, curY, 5);

    // High-impact burst when hitting target skyscraper (Task 29)
    if (this.testFireProgress >= 0.9) {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(targetX, targetY, 20);
      g.lineStyle(3, 0x00f0ff, 0.8);
      g.strokeCircle(targetX, targetY, 32);
    }
  }

  // =========================================================================
  // PARTICLE SYSTEM (HIGH-PRECISION ELECTRICAL SPARKS & RESTORATION PULSES)
  // =========================================================================

  spawnParticle(x3D, y3D, z3D, color) {
    if (this.particles.length > 60) this.particles.shift();
    this.particles.push({
      x: x3D,
      y: y3D,
      z: z3D,
      vx: (Math.random() - 0.5) * 65,
      vy: (Math.random() - 0.5) * 65,
      vz: (Math.random() - 0.5) * 45,
      color: color,
      alpha: 1.0,
      life: 0.5 + Math.random() * 0.4
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.8);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  renderParticles() {
    if (this.particles.length === 0) return;
    const g = this.fxGfx;
    for (const p of this.particles) {
      const proj = this.project3D(p);
      g.fillStyle(p.color, p.alpha);
      g.fillCircle(proj.x, proj.y, 2.5 * proj.scale);
    }
  }

  destroy() {
    if (this.scene && this.scene.input) {
      if (this.handlePointerMove) this.scene.input.off('pointermove', this.handlePointerMove);
      if (this.handlePointerDown) this.scene.input.off('pointerdown', this.handlePointerDown);
    }
    if (this.container) this.container.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.WebShooterDiagnostic = WebShooterDiagnostic;
}
