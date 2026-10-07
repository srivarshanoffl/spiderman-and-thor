/**
 * SpiderManAnimator - High-Fidelity Character Animation Engine
 *
 * Implements full 13-state kinematic animation state machine:
 * IDLE, RUN, JUMP, FALL, WEB_SHOOT, WEB_ATTACH, SWING_START,
 * SWING_LOOP, SWING_FAST, SWING_RELEASE, RECOVERY, LAND, CATCH
 *
 * Features:
 * - Dynamic gait synthesis with contralateral limb swinging and double-bob torso bounce
 * - Natural breathing, chest expansion, and shoulder roll in idle
 * - Procedural pendulum hanging postures reacting to web rope angle & centripetal G-force
 * - Web shooting recoil sequence (aim -> wrist rotate -> shooter fire -> recoil -> follow-through)
 * - Acrobatic aerial flips & aerodynamic velocity-based streamlining
 * - Expressive cowl eye lenses (squint on speed, wide on surprise, focused on targets)
 * - Secondary motion: suit ripples, athletic muscles, wind trails
 */
class SpiderManAnimator {
  constructor(hero, scene) {
    this.hero = hero;
    this.scene = scene;

    // Active Animation State
    this.state = 'IDLE';
    this.previousState = 'IDLE';
    this.stateTime = 0;
    this.transitionProgress = 1.0;
    this.transitionDuration = 0.15;

    // Kinematic Joint Hierarchy (radians & offsets)
    this.joints = {
      torsoY: 0,
      torsoTilt: 0,
      torsoScaleX: 1.0,
      torsoScaleY: 1.0,
      headAngle: 0,
      headY: -28,
      leftArmAngle: 0,
      leftForearmAngle: 0.2,
      rightArmAngle: 0,
      rightForearmAngle: 0.2,
      leftThighAngle: 0,
      leftKneeAngle: 0,
      rightThighAngle: 0,
      rightKneeAngle: 0,
      lensSquint: 0, // 0 = normal, 1 = narrow/intense, -1 = surprised/wide
      cowlTiltX: 0
    };

    // Target Joint Angles for Blending
    this.targetJoints = { ...this.joints };

    // Shooting Sub-Sequence Timer
    this.shootSequenceTime = 0;
    this.isShooting = false;
    this.shootAngle = 0;

    // Web Attach Shock Timer
    this.attachShockTime = 0;

    // Landing Compression Timer
    this.landingTime = 0;

    // Release Flip Angle
    this.releaseFlipAngle = 0;

    // Secondary motion trackers
    this.gaitPhase = 0;
    this.breathingPhase = 0;
    this.speedTrailTimer = 0;
  }

  setState(newState, force = false) {
    if (this.state === newState && !force) return;
    this.previousState = this.state;
    this.state = newState;
    this.stateTime = 0;
    this.transitionProgress = 0;

    if (newState === 'WEB_SHOOT') {
      this.shootSequenceTime = 0;
      this.isShooting = true;
    } else if (newState === 'WEB_ATTACH') {
      this.attachShockTime = 0;
    } else if (newState === 'LAND') {
      this.landingTime = 0;
    } else if (newState === 'SWING_RELEASE') {
      this.releaseFlipAngle = 0;
    }
  }

  triggerShoot(targetAngle = -0.6) {
    this.shootAngle = targetAngle;
    this.setState('WEB_SHOOT', true);
  }

  triggerAttach() {
    this.setState('WEB_ATTACH', true);
  }

  triggerRelease() {
    this.setState('SWING_RELEASE', true);
  }

  triggerLand() {
    this.setState('LAND', true);
  }

  update(dt, heroSpeed, isSwinging, swingAngle, angularVelocity = 0) {
    this.stateTime += dt;
    this.breathingPhase += dt * 2.8;

    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + dt / this.transitionDuration);
    }

    // Determine State automatically based on physics if not in locked action
    this.evaluateAutomaticState(heroSpeed, isSwinging);

    // Compute joint angles for current state
    switch (this.state) {
      case 'IDLE':
        this.updateIdle(dt);
        break;
      case 'RUN':
        this.updateRun(dt, heroSpeed);
        break;
      case 'JUMP':
        this.updateJump(dt);
        break;
      case 'FALL':
        this.updateFall(dt);
        break;
      case 'WEB_SHOOT':
        this.updateWebShoot(dt);
        break;
      case 'WEB_ATTACH':
        this.updateWebAttach(dt);
        break;
      case 'SWING_START':
        this.updateSwingStart(dt, swingAngle);
        break;
      case 'SWING_LOOP':
        this.updateSwingLoop(dt, swingAngle, angularVelocity);
        break;
      case 'SWING_FAST':
        this.updateSwingFast(dt, swingAngle, angularVelocity, heroSpeed);
        break;
      case 'SWING_RELEASE':
        this.updateSwingRelease(dt);
        break;
      case 'RECOVERY':
        this.updateRecovery(dt);
        break;
      case 'LAND':
        this.updateLand(dt);
        break;
      case 'CATCH':
        this.updateCatch(dt);
        break;
    }

    // Smoothly interpolate current joints toward targets
    const lerpSpeed = Math.min(1.0, dt * 18);
    for (const key in this.joints) {
      if (typeof this.joints[key] === 'number' && typeof this.targetJoints[key] === 'number') {
        this.joints[key] = Phaser.Math.Linear(this.joints[key], this.targetJoints[key], lerpSpeed);
      }
    }
  }

  evaluateAutomaticState(speed, isSwinging) {
    // Locked states that manage their own duration
    if (this.state === 'WEB_SHOOT' && this.isShooting) return;
    if (this.state === 'RECOVERY') return;
    if (this.state === 'CATCH') return;
    if (this.state === 'LAND' && this.stateTime < 0.22) return;

    if (isSwinging) {
      if (this.state === 'WEB_ATTACH' && this.stateTime < 0.16) return;
      if (speed > 520) {
        this.setState('SWING_FAST');
      } else if (this.stateTime < 0.3 && this.previousState !== 'SWING_LOOP') {
        this.setState('SWING_START');
      } else {
        this.setState('SWING_LOOP');
      }
      return;
    }

    // Airborne / Grounded States
    if (this.hero.isGrounded) {
      if (Math.abs(this.hero.vx) > 35) {
        this.setState('RUN');
      } else {
        this.setState('IDLE');
      }
    } else {
      if (this.state === 'SWING_RELEASE' && this.stateTime < 0.28) {
        // Keep release aerial flip
        return;
      }
      if (this.hero.vy < -80) {
        this.setState('JUMP');
      } else {
        this.setState('FALL');
      }
    }
  }

  // 1. IDLE: Natural breathing, chest heave, weight shift, mask scanning
  updateIdle(dt) {
    const breath = Math.sin(this.breathingPhase);
    const slowSway = Math.sin(this.breathingPhase * 0.45);

    this.targetJoints.torsoY = breath * 1.5;
    this.targetJoints.torsoScaleY = 1.0 + breath * 0.035;
    this.targetJoints.torsoScaleX = 1.0 - breath * 0.02;
    this.targetJoints.torsoTilt = slowSway * 0.04;

    this.targetJoints.headAngle = slowSway * 0.08 + Math.sin(this.stateTime * 1.2) * 0.03;
    this.targetJoints.headY = -28 + breath * 1.2;

    // Relaxed arms at sides with slight thumb flex
    this.targetJoints.leftArmAngle = 0.25 + breath * 0.04;
    this.targetJoints.leftForearmAngle = 0.35 + breath * 0.06;
    this.targetJoints.rightArmAngle = -0.25 - breath * 0.04;
    this.targetJoints.rightForearmAngle = 0.35 + breath * 0.06;

    // Balanced athletic stance
    this.targetJoints.leftThighAngle = 0.12;
    this.targetJoints.leftKneeAngle = 0.15;
    this.targetJoints.rightThighAngle = -0.12;
    this.targetJoints.rightKneeAngle = 0.15;
    this.targetJoints.lensSquint = 0;
  }

  // 2. RUN: True athletic stride cycle synchronized with forward speed
  updateRun(dt, speed) {
    const strideFreq = Math.max(6, Math.min(18, speed * 0.024));
    this.gaitPhase += dt * strideFreq;

    const phase = this.gaitPhase;
    const sin1 = Math.sin(phase);
    const cos1 = Math.cos(phase);
    const doubleBob = Math.abs(Math.sin(phase)); // Torso dips twice per stride

    // Forward athletic lean proportional to sprint velocity
    const leanAngle = Math.min(0.38, Math.max(0.12, speed / 1100));
    this.targetJoints.torsoTilt = leanAngle;
    this.targetJoints.torsoY = doubleBob * 4 - 2;
    this.targetJoints.torsoScaleY = 0.96 + doubleBob * 0.08;
    this.targetJoints.torsoScaleX = 1.04 - doubleBob * 0.08;

    // Focused head angle looking forward into sprint path
    this.targetJoints.headAngle = -leanAngle * 0.65;
    this.targetJoints.headY = -26 + doubleBob * 2;
    this.targetJoints.lensSquint = 0.35; // Intense squint

    // Contralateral arm pump: Left arm swings with Right leg
    this.targetJoints.leftArmAngle = -sin1 * 0.85;
    this.targetJoints.leftForearmAngle = 0.8 + sin1 * 0.3;
    this.targetJoints.rightArmAngle = sin1 * 0.85;
    this.targetJoints.rightForearmAngle = 0.8 - sin1 * 0.3;

    // Leg driving kinematics
    this.targetJoints.leftThighAngle = sin1 * 0.95;
    this.targetJoints.leftKneeAngle = Math.max(0, -cos1 * 1.1);
    this.targetJoints.rightThighAngle = -sin1 * 0.95;
    this.targetJoints.rightKneeAngle = Math.max(0, cos1 * 1.1);
  }

  // 3. JUMP: Explosive upward launch extension
  updateJump(dt) {
    this.targetJoints.torsoTilt = -0.15;
    this.targetJoints.torsoScaleY = 1.18;
    this.targetJoints.torsoScaleX = 0.88;
    this.targetJoints.headAngle = -0.3;
    this.targetJoints.lensSquint = 0.5;

    // Arms reaching upward & forward
    this.targetJoints.leftArmAngle = -1.2;
    this.targetJoints.leftForearmAngle = 0.3;
    this.targetJoints.rightArmAngle = -1.0;
    this.targetJoints.rightForearmAngle = 0.4;

    // Knees tucked slightly for acrobatics
    this.targetJoints.leftThighAngle = -0.4;
    this.targetJoints.leftKneeAngle = 0.8;
    this.targetJoints.rightThighAngle = -0.2;
    this.targetJoints.rightKneeAngle = 0.6;
  }

  // 4. FALL: Aerodynamic dive / descent stabilization
  updateFall(dt) {
    this.targetJoints.torsoTilt = 0.35;
    this.targetJoints.torsoScaleY = 1.12;
    this.targetJoints.torsoScaleX = 0.92;
    this.targetJoints.headAngle = 0.2;
    this.targetJoints.lensSquint = 0.4;

    // Arms swept back like wings
    this.targetJoints.leftArmAngle = 0.9;
    this.targetJoints.leftForearmAngle = 0.4;
    this.targetJoints.rightArmAngle = 0.9;
    this.targetJoints.rightForearmAngle = 0.4;

    // Legs trailing behind
    this.targetJoints.leftThighAngle = 0.3;
    this.targetJoints.leftKneeAngle = 0.3;
    this.targetJoints.rightThighAngle = 0.4;
    this.targetJoints.rightKneeAngle = 0.2;
  }

  // 5. WEB_SHOOT: Dedicated multi-frame sequence (aim -> wrist snap -> fire flash -> recoil)
  updateWebShoot(dt) {
    this.shootSequenceTime += dt;
    const t = this.shootSequenceTime;

    if (t < 0.06) {
      // Phase 1: Aim & anticipation (arm whips toward target)
      this.targetJoints.leftArmAngle = this.shootAngle - 0.2;
      this.targetJoints.leftForearmAngle = 0.1;
      this.targetJoints.torsoTilt = 0.1;
      this.targetJoints.lensSquint = 0.8;
    } else if (t < 0.14) {
      // Phase 2: Wrist snap & web blast recoil
      this.targetJoints.leftArmAngle = this.shootAngle + 0.15; // Recoil bump
      this.targetJoints.leftForearmAngle = 0.05;
      this.targetJoints.torsoTilt = -0.08;
      this.targetJoints.lensSquint = 1.0;
    } else {
      // Phase 3: Follow-through into flight
      this.isShooting = false;
    }
  }

  // 6. WEB_ATTACH: Sudden rope tension shock absorption
  updateWebAttach(dt) {
    this.attachShockTime += dt;
    const jolt = Math.sin(this.attachShockTime * 25) * Math.exp(-this.attachShockTime * 8);

    // Torso compresses along web tension vector
    this.targetJoints.torsoScaleY = 0.92 + jolt * 0.15;
    this.targetJoints.torsoScaleX = 1.08 - jolt * 0.15;
    this.targetJoints.torsoTilt = -0.2 + jolt * 0.2;

    // Leading arm grips taut filament overhead
    this.targetJoints.leftArmAngle = -1.6;
    this.targetJoints.leftForearmAngle = 0.15;
    // Trailing arm extends for balance
    this.targetJoints.rightArmAngle = 0.6;
    this.targetJoints.rightForearmAngle = 0.5;

    // Knees pull up to absorb tension impact
    this.targetJoints.leftThighAngle = -0.6;
    this.targetJoints.leftKneeAngle = 1.2;
    this.targetJoints.rightThighAngle = -0.3;
    this.targetJoints.rightKneeAngle = 0.9;
  }

  // 7. SWING_START: Initial entry into pendulum arc
  updateSwingStart(dt, swingAngle) {
    this.targetJoints.torsoTilt = swingAngle * 0.8;
    this.targetJoints.leftArmAngle = -1.45;
    this.targetJoints.leftForearmAngle = 0.2;
    this.targetJoints.rightArmAngle = 0.4;
    this.targetJoints.rightForearmAngle = 0.6;
    this.targetJoints.leftThighAngle = -0.3;
    this.targetJoints.leftKneeAngle = 0.7;
    this.targetJoints.rightThighAngle = -0.1;
    this.targetJoints.rightKneeAngle = 0.4;
    this.targetJoints.lensSquint = 0.5;
  }

  // 8. SWING_LOOP: Dynamic posture reacting to pendulum arc angle & centripetal acceleration
  updateSwingLoop(dt, swingAngle, omega) {
    // Hang angle matches web tangent
    this.targetJoints.torsoTilt = swingAngle * 0.85;

    // Centripetal compression at bottom of arc (swingAngle near 0)
    const bottomFactor = Math.max(0, 1.0 - Math.abs(swingAngle) * 1.4);
    this.targetJoints.torsoScaleY = 1.0 - bottomFactor * 0.12;
    this.targetJoints.torsoScaleX = 1.0 + bottomFactor * 0.12;

    // Head looks ahead toward apex of swing
    this.targetJoints.headAngle = swingAngle * 0.4 - 0.2;
    this.targetJoints.lensSquint = 0.6;

    // Gripping arm aligns with web strand overhead
    this.targetJoints.leftArmAngle = -1.55 + swingAngle * 0.15;
    this.targetJoints.leftForearmAngle = 0.15;

    // Trailing arm provides athletic balance
    this.targetJoints.rightArmAngle = 0.5 - swingAngle * 0.4;
    this.targetJoints.rightForearmAngle = 0.4;

    // Dynamic legs: Kick forward on upswing, trail aerodynamically on downswing
    if (swingAngle > 0) {
      // Upswing: Legs drive upward preparing for launch
      this.targetJoints.leftThighAngle = -0.7 - swingAngle * 0.5;
      this.targetJoints.leftKneeAngle = 0.9;
      this.targetJoints.rightThighAngle = -0.4 - swingAngle * 0.4;
      this.targetJoints.rightKneeAngle = 0.6;
    } else {
      // Downswing: Body extends into gravity drop
      this.targetJoints.leftThighAngle = 0.2 - swingAngle * 0.3;
      this.targetJoints.leftKneeAngle = 0.3;
      this.targetJoints.rightThighAngle = 0.4 - swingAngle * 0.2;
      this.targetJoints.rightKneeAngle = 0.2;
    }
  }

  // 9. SWING_FAST: High-speed streamlined tuck with heavy aerodynamic lean
  updateSwingFast(dt, swingAngle, omega, speed) {
    this.updateSwingLoop(dt, swingAngle, omega);

    // Extreme streamline tuck
    this.targetJoints.torsoScaleY = 1.15;
    this.targetJoints.torsoScaleX = 0.88;
    this.targetJoints.torsoTilt = swingAngle * 0.95 + 0.15;
    this.targetJoints.headAngle = -0.35;
    this.targetJoints.lensSquint = 1.0; // Narrow hawk-eyed focus

    // Both legs tight and aerodynamic
    this.targetJoints.leftThighAngle = -0.8;
    this.targetJoints.leftKneeAngle = 1.3;
    this.targetJoints.rightThighAngle = -0.5;
    this.targetJoints.rightKneeAngle = 1.0;
  }

  // 10. SWING_RELEASE: Uncoil -> acrobatic leap / flip into free flight
  updateSwingRelease(dt) {
    this.releaseFlipAngle += dt * 9.5;

    this.targetJoints.torsoTilt = this.releaseFlipAngle;
    this.targetJoints.torsoScaleY = 1.05;
    this.targetJoints.torsoScaleX = 0.98;

    // Aerodynamic limbs uncoiling from release
    this.targetJoints.leftArmAngle = -0.8;
    this.targetJoints.leftForearmAngle = 0.4;
    this.targetJoints.rightArmAngle = 0.8;
    this.targetJoints.rightForearmAngle = 0.4;

    this.targetJoints.leftThighAngle = 0.4;
    this.targetJoints.leftKneeAngle = 0.3;
    this.targetJoints.rightThighAngle = -0.3;
    this.targetJoints.rightKneeAngle = 0.5;
    this.targetJoints.lensSquint = 0.7;
  }

  // 11. RECOVERY: Surprise flail -> emergency grab -> wrist inspection
  updateRecovery(dt) {
    const t = this.stateTime;
    if (t < 0.4) {
      // Surprise & tumble flail
      this.targetJoints.torsoTilt = Math.sin(t * 16) * 0.4;
      this.targetJoints.headAngle = -0.4;
      this.targetJoints.lensSquint = -1.0; // Wide surprised lenses!
      this.targetJoints.leftArmAngle = Math.sin(t * 18) * 0.8;
      this.targetJoints.rightArmAngle = -Math.sin(t * 18) * 0.8;
    } else {
      // Perched wrist inspection
      this.targetJoints.torsoTilt = 0.22;
      this.targetJoints.headAngle = 0.35;
      this.targetJoints.headY = -24;
      this.targetJoints.lensSquint = 0.85;

      // Forearm raised in front of eyes to examine shooter
      this.targetJoints.leftArmAngle = -0.6;
      this.targetJoints.leftForearmAngle = 1.6;
      this.targetJoints.rightArmAngle = 0.3;
      this.targetJoints.rightForearmAngle = 0.8;

      // Stable perched knees
      this.targetJoints.leftThighAngle = -0.6;
      this.targetJoints.leftKneeAngle = 1.4;
      this.targetJoints.rightThighAngle = 0.4;
      this.targetJoints.rightKneeAngle = 1.2;
    }
  }

  // 12. LAND: Deep 3-point superhero impact compression
  updateLand(dt) {
    this.landingTime += dt;
    const impactProg = Math.min(1.0, this.landingTime / 0.22);
    const squish = Math.sin(impactProg * Math.PI);

    this.targetJoints.torsoY = squish * 10;
    this.targetJoints.torsoScaleY = 0.75 + (1 - squish) * 0.25;
    this.targetJoints.torsoScaleX = 1.25 - (1 - squish) * 0.25;
    this.targetJoints.torsoTilt = 0.3;

    // Right arm touches ground in classic 3-point stance
    this.targetJoints.rightArmAngle = 0.9;
    this.targetJoints.rightForearmAngle = 0.8;
    this.targetJoints.leftArmAngle = -0.4;
    this.targetJoints.leftForearmAngle = 0.6;

    // Knees deeply bent
    this.targetJoints.leftThighAngle = -0.9;
    this.targetJoints.leftKneeAngle = 1.7;
    this.targetJoints.rightThighAngle = 0.6;
    this.targetJoints.rightKneeAngle = 1.8;
    this.targetJoints.lensSquint = 0.9;
  }

  // 13. CATCH: Relaxed victory stance on Oscorp Summit
  updateCatch(dt) {
    const breath = Math.sin(this.breathingPhase * 0.7);
    this.targetJoints.torsoTilt = 0;
    this.targetJoints.torsoY = breath * 1.2;
    this.targetJoints.headAngle = -0.15; // Looking admiringly at falcon
    this.targetJoints.lensSquint = 0.1;

    // Left arm gently extended forward as golden falcon perch
    this.targetJoints.leftArmAngle = -0.85;
    this.targetJoints.leftForearmAngle = 0.45;
    this.targetJoints.rightArmAngle = 0.2;
    this.targetJoints.rightForearmAngle = 0.3;

    this.targetJoints.leftThighAngle = 0.1;
    this.targetJoints.leftKneeAngle = 0.15;
    this.targetJoints.rightThighAngle = -0.1;
    this.targetJoints.rightKneeAngle = 0.15;
  }

  /**
   * Render procedural animated superhero vector character
   * Layered with articulated limbs, muscular suit topology,
   * animated web-shooters, expressive cowl lenses, and secondary suit dynamics.
   */
  render(gfx, facing = 1) {
    if (!gfx) return;
    gfx.clear();

    const j = this.joints;
    const RED = CONFIG.COLORS.SPIDER_RED || 0xd41c30;
    const BLUE = CONFIG.COLORS.SPIDER_BLUE || 0x183b6b;
    const BLACK = CONFIG.COLORS.SPIDER_BLACK || 0x090e18;
    const WHITE = CONFIG.COLORS.WEB_WHITE || 0xf5f8ff;
    const CYAN = CONFIG.COLORS.TECH_CYAN || 0x00f0ff;

    // Torso Center
    const tx = 0;
    const ty = j.torsoY;

    // 1. Back Arm (Right Arm)
    const rightShoulderX = tx - 8 * facing;
    const rightShoulderY = ty - 12;
    const rArmLen = 14;
    const rForeLen = 14;

    const rElbowX = rightShoulderX + Math.sin(j.rightArmAngle) * rArmLen * facing;
    const rElbowY = rightShoulderY + Math.cos(j.rightArmAngle) * rArmLen;
    const rHandX = rElbowX + Math.sin(j.rightArmAngle + j.rightForearmAngle) * rForeLen * facing;
    const rHandY = rElbowY + Math.cos(j.rightArmAngle + j.rightForearmAngle) * rForeLen;

    // Back arm upper & lower
    gfx.lineStyle(5.5, 0x8a101e, 1.0); // Shadowed red
    gfx.lineBetween(rightShoulderX, rightShoulderY, rElbowX, rElbowY);
    gfx.lineBetween(rElbowX, rElbowY, rHandX, rHandY);
    gfx.fillStyle(0x8a101e, 1.0);
    gfx.fillCircle(rHandX, rHandY, 3.5);

    // 2. Back Leg (Right Leg)
    const rHipX = tx - 5 * facing;
    const rHipY = ty + 10;
    const thighLen = 16;
    const calfLen = 17;

    const rKneeX = rHipX + Math.sin(j.rightThighAngle) * thighLen * facing;
    const rKneeY = rHipY + Math.cos(j.rightThighAngle) * thighLen;
    const rFootX = rKneeX + Math.sin(j.rightThighAngle + j.rightKneeAngle) * calfLen * facing;
    const rFootY = rKneeY + Math.cos(j.rightThighAngle + j.rightKneeAngle) * calfLen;

    gfx.lineStyle(6.5, 0x102444, 1.0); // Shadowed blue thigh
    gfx.lineBetween(rHipX, rHipY, rKneeX, rKneeY);
    gfx.lineStyle(5.5, 0x8a101e, 1.0); // Shadowed red boot
    gfx.lineBetween(rKneeX, rKneeY, rFootX, rFootY);
    gfx.fillStyle(0x8a101e, 1.0);
    gfx.fillRect(rFootX - 4 * facing, rFootY - 2, 9 * facing, 5);

    // 3. Pelvis & Main Torso
    gfx.fillStyle(BLUE, 1.0);
    gfx.fillRect(tx - 9, ty + 2, 18, 12); // Blue hips

    // Muscular Red Torso
    gfx.fillStyle(RED, 1.0);
    gfx.fillRect(tx - 12, ty - 18, 24, 22);

    // Blue Torso Side Panels
    gfx.fillStyle(BLUE, 1.0);
    gfx.fillRect(tx - 12, ty - 10, 5, 14);
    gfx.fillRect(tx + 7, ty - 10, 5, 14);

    // Iconic Black Spider Chest Emblem
    gfx.fillStyle(BLACK, 1.0);
    gfx.fillCircle(tx, ty - 8, 3.5);
    // Emblem legs
    gfx.lineStyle(1.5, BLACK, 1.0);
    gfx.lineBetween(tx - 3, ty - 10, tx - 7, ty - 13);
    gfx.lineBetween(tx + 3, ty - 10, tx + 7, ty - 13);
    gfx.lineBetween(tx - 3, ty - 6, tx - 8, ty - 4);
    gfx.lineBetween(tx + 3, ty - 6, tx + 8, ty - 4);

    // 4. Front Leg (Left Leg)
    const lHipX = tx + 5 * facing;
    const lHipY = ty + 10;
    const lKneeX = lHipX + Math.sin(j.leftThighAngle) * thighLen * facing;
    const lKneeY = lHipY + Math.cos(j.leftThighAngle) * thighLen;
    const lFootX = lKneeX + Math.sin(j.leftThighAngle + j.leftKneeAngle) * calfLen * facing;
    const lFootY = lKneeY + Math.cos(j.leftThighAngle + j.leftKneeAngle) * calfLen;

    gfx.lineStyle(7.0, BLUE, 1.0); // Blue thigh
    gfx.lineBetween(lHipX, lHipY, lKneeX, lKneeY);
    gfx.lineStyle(6.0, RED, 1.0);  // Red boot
    gfx.lineBetween(lKneeX, lKneeY, lFootX, lFootY);
    gfx.fillStyle(RED, 1.0);
    gfx.fillRect(lFootX - 4 * facing, lFootY - 2, 11 * facing, 6);

    // 5. Head / Cowl with Articulated Lenses
    const hx = tx + Math.sin(j.headAngle) * 4 * facing;
    const hy = j.headY;

    // Red Cowl
    gfx.fillStyle(RED, 1.0);
    gfx.fillCircle(hx, hy, 12.5);

    // Web patterning subtle lines on mask
    gfx.lineStyle(1.0, 0x9e1220, 0.7);
    gfx.lineBetween(hx, hy - 12, hx, hy + 12);
    gfx.lineBetween(hx - 12, hy, hx + 12, hy);

    // Expressive Reflective White Lenses with Black Borders
    const eyeSquint = j.lensSquint; // -1 to 1
    const eyeH = Math.max(3, 7 - eyeSquint * 3.5);
    const eyeW = Math.max(4, 8 + eyeSquint * 1.5);

    // Front Eye Lens
    const frontEyeX = hx + 4 * facing;
    const backEyeX = hx - 5 * facing;
    const eyeY = hy - 1;

    // Black lens rims
    gfx.fillStyle(BLACK, 1.0);
    gfx.fillRect(frontEyeX - 1, eyeY - eyeH * 0.5 - 1, eyeW + 2, eyeH + 2);
    gfx.fillRect(backEyeX - 1, eyeY - eyeH * 0.5 - 1, eyeW * 0.75 + 2, eyeH + 2);

    // White reflective interior
    gfx.fillStyle(WHITE, 1.0);
    gfx.fillRect(frontEyeX, eyeY - eyeH * 0.5, eyeW, eyeH);
    gfx.fillRect(backEyeX, eyeY - eyeH * 0.5, eyeW * 0.75, eyeH);

    // 6. Front Arm (Left Arm)
    const leftShoulderX = tx + 8 * facing;
    const leftShoulderY = ty - 12;

    const lElbowX = leftShoulderX + Math.sin(j.leftArmAngle) * rArmLen * facing;
    const lElbowY = leftShoulderY + Math.cos(j.leftArmAngle) * rArmLen;
    const lHandX = lElbowX + Math.sin(j.leftArmAngle + j.leftForearmAngle) * rForeLen * facing;
    const lHandY = lElbowY + Math.cos(j.leftArmAngle + j.leftForearmAngle) * rForeLen;

    gfx.lineStyle(6.0, RED, 1.0); // Upper arm
    gfx.lineBetween(leftShoulderX, leftShoulderY, lElbowX, lElbowY);
    gfx.lineStyle(5.5, RED, 1.0); // Forearm
    gfx.lineBetween(lElbowX, lElbowY, lHandX, lHandY);

    // Web Shooter Gauntlet on wrist
    gfx.fillStyle(0x1a2638, 1.0);
    gfx.fillRect(lHandX - 3, lHandY - 4, 7, 7);
    gfx.fillStyle(CYAN, 0.95);
    gfx.fillCircle(lHandX, lHandY, 2.0); // Cyan indicator LED

    // Firing Muzzle Flash if shooting
    if (this.state === 'WEB_SHOOT' && this.shootSequenceTime < 0.12) {
      gfx.fillStyle(WHITE, 1.0);
      gfx.fillCircle(lHandX + 4 * facing, lHandY, 5);
      gfx.fillStyle(CYAN, 0.85);
      gfx.fillCircle(lHandX + 6 * facing, lHandY, 8);
    }

    // Hand Clenched / Trigger Finger
    gfx.fillStyle(RED, 1.0);
    gfx.fillCircle(lHandX, lHandY, 4.0);
  }
}

if (typeof window !== 'undefined') {
  window.SpiderManAnimator = SpiderManAnimator;
}
