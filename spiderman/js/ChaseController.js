/**
 * ChaseController - Adaptive Chase Leader & Speed Governor System
 *
 * Guarantees that the Golden Cyber-Falcon always maintains a controlled forward lead
 * over Spider-Man throughout the active chase, regardless of swing momentum, boost,
 * release velocity, or frame rate.
 *
 * Key Capabilities:
 * 1. Adaptive speed matching with predictive position adjustments (no visible teleportation)
 * 2. Player speed governor that gracefully soft-scales forward momentum
 * 3. Swing release impulse dampening and matching
 * 4. Explicit chase phase state machine
 * 5. Deterministic story-driven malfunction trigger when approaching target
 * 6. Smooth final catch approach at Oscorp Summit
 */
class ChaseController {
  constructor(scene, bird, player, config = {}) {
    this.scene = scene;
    this.bird = bird;
    this.player = player;

    // Configurable Lead Boundaries (in world units)
    this.minLeadDistance = config.minLeadDistance || 180;    // Absolute minimum separation (160 - 220)
    this.idealLeadDistance = config.idealLeadDistance || 270; // Target cinematic separation (220 - 320)
    this.maxLeadDistance = config.maxLeadDistance || 500;    // Maximum catchup boundary (450 - 550)

    // Dynamic speeds & accelerations
    this.birdBaseSpeed = config.birdBaseSpeed || (CONFIG.BIRD ? CONFIG.BIRD.BASE_SPEED : 320) || 320;
    this.birdMaxSpeed = config.birdMaxSpeed || 950;
    this.catchupSpeed = config.catchupSpeed || 1400; // Bird acceleration capacity
    this.slowdownSpeed = config.slowdownSpeed || 280; // Bird gentle coasting deceleration

    // State Tracking
    this.chaseActive = false;
    this.currentLead = this.idealLeadDistance;
    this.swingsCompleted = 0;
    this.boostActive = false;
    this.lastReleaseTime = 0;

    // Explicit Chase Phases:
    // CHASE_START, CHASE_PROGRESS, CHASE_TIGHT, CHASE_MALFUNCTION_TRIGGER, CHASE_PAUSED, REPAIR, CHASE_RESUME, FINAL_CATCH
    this.phase = 'CHASE_START';

    // Telemetry log for QA & headless assertions
    this.telemetry = {
      playerSpeed: 0,
      birdSpeed: 0,
      leadDistance: this.idealLeadDistance,
      minLeadViolations: 0,
      lastAdjustmentType: 'nominal'
    };
  }

  startChase() {
    this.chaseActive = true;
    this.phase = 'CHASE_START';
    this.swingsCompleted = 0;

    // Ensure initial separation without jumping
    if (this.bird.x < this.player.x + this.idealLeadDistance) {
      this.bird.x = this.player.x + this.idealLeadDistance;
    }
    this.bird.vx = Math.max(this.birdBaseSpeed, this.player.vx + 60);
  }

  pauseChase() {
    this.chaseActive = false;
    this.phase = 'CHASE_PAUSED';
  }

  resumeChase() {
    this.chaseActive = true;
    this.phase = 'CHASE_RESUME';
    // Ensure healthy lead on resumption
    if (this.bird.x < this.player.x + this.idealLeadDistance) {
      this.bird.x = this.player.x + this.idealLeadDistance;
    }
    this.bird.vx = Math.max(this.birdBaseSpeed + 120, this.player.vx + 80);
  }

  notifySwingComplete() {
    this.swingsCompleted++;
  }

  notifySwingRelease(releaseVx) {
    this.lastReleaseTime = this.scene.time.now;
    // When player executes a powerful release leap, immediately prepare bird acceleration
    if (releaseVx > this.bird.vx) {
      const urgency = (releaseVx - this.bird.vx) * 0.85;
      this.bird.vx += urgency;
      this.telemetry.lastAdjustmentType = 'release_boost_match';
    }
  }

  update(dt) {
    if (!this.chaseActive || !this.bird || !this.player) return;

    // Calculate real-time distance
    this.currentLead = this.bird.x - this.player.x;
    const playerVx = Math.max(0, this.player.vx);
    const birdVx = Math.max(0, this.bird.vx);

    // Update phase progression
    this.updatePhase();

    // 1. Dynamic Bird Velocity Calculation
    let targetBirdSpeed = this.birdBaseSpeed;

    if (this.phase === 'FINAL_CATCH') {
      // In final catch, let bird glide smoothly at Oscorp Summit so player reels in
      targetBirdSpeed = 160;
      this.bird.vx = Phaser.Math.Linear(this.bird.vx, targetBirdSpeed, dt * 2.5);
      return;
    }

    // Adaptive velocity matching: Bird must always respect player's speed
    if (playerVx > 0) {
      targetBirdSpeed = Math.max(targetBirdSpeed, playerVx + 40);
    }

    // Lead Distance Error Correction (P-Controller with velocity feedforward)
    if (this.currentLead < this.idealLeadDistance) {
      // Player is closing in: Increase bird speed proportionally
      const urgency = (this.idealLeadDistance - this.currentLead) / (this.idealLeadDistance - this.minLeadDistance);
      const clampedUrgency = Math.max(0, Math.min(2.5, urgency));
      targetBirdSpeed += clampedUrgency * 380;

      // Imminent minimum lead threat: Emergency acceleration burst
      if (this.currentLead < this.minLeadDistance + 45) {
        targetBirdSpeed = Math.max(targetBirdSpeed, playerVx + 240);
        this.telemetry.lastAdjustmentType = 'emergency_accel_burst';
      }
    } else if (this.currentLead > this.idealLeadDistance + 60) {
      // Player fell behind: Ease bird speed gently so player can catch up
      const excess = Math.min(1.0, (this.currentLead - this.idealLeadDistance) / (this.maxLeadDistance - this.idealLeadDistance));
      targetBirdSpeed = Math.max(CONFIG.BIRD.MIN_SPEED || 180, targetBirdSpeed - excess * 180);
      this.telemetry.lastAdjustmentType = 'catchup_slowdown';
    }

    // Smoothly apply acceleration/deceleration
    if (this.bird.vx < targetBirdSpeed) {
      this.bird.vx = Math.min(this.birdMaxSpeed, this.bird.vx + this.catchupSpeed * dt);
    } else {
      this.bird.vx = Math.max(CONFIG.BIRD.MIN_SPEED || 180, this.bird.vx - this.slowdownSpeed * dt);
    }

    // 2. Spider-Man Speed Governor
    // Smoothly soft-scales player forward momentum when closing uncomfortably into min lead
    if (this.currentLead < this.idealLeadDistance) {
      const marginRatio = Math.max(0, (this.currentLead - this.minLeadDistance) / (this.idealLeadDistance - this.minLeadDistance));
      // Allowed forward speed curves smoothly down toward bird speed as margin narrows
      const maxAllowedSpeed = this.bird.vx + (marginRatio * 0.8 - 0.3) * 120;
      if (this.player.vx > maxAllowedSpeed && maxAllowedSpeed > 100) {
        this.player.vx = Phaser.Math.Linear(this.player.vx, maxAllowedSpeed, dt * 7.5);
      }
    }

    // 3. Predictive No-Overtake Safety Layer
    // Calculate predicted positions for upcoming frame
    const predPlayerX = this.player.x + this.player.vx * dt;
    const predBirdX = this.bird.x + this.bird.vx * dt;
    const predLead = predBirdX - predPlayerX;

    if (predLead < this.minLeadDistance) {
      // Compensate immediately: inject necessary delta into bird velocity
      const deficit = this.minLeadDistance - predLead;
      this.bird.vx += deficit / dt;
      // Also scale player forward velocity slightly to prevent clipping
      this.player.vx = Math.max(0, (predBirdX - this.minLeadDistance - this.player.x) / dt);
      this.telemetry.minLeadViolations++;
      this.telemetry.lastAdjustmentType = 'predictive_lead_clamp';
    }

    // Absolute fallback guarantee: Bird position can NEVER be behind or inside min lead
    if (this.bird.x < this.player.x + this.minLeadDistance) {
      this.bird.x = this.player.x + this.minLeadDistance;
      this.bird.vx = Math.max(this.bird.vx, this.player.vx + 60);
    }

    // 4. Update Telemetry
    this.telemetry.playerSpeed = Math.round(this.player.vx);
    this.telemetry.birdSpeed = Math.round(this.bird.vx);
    this.telemetry.leadDistance = Math.round(this.currentLead);

    // 5. Malfunction Trigger Check
    this.checkMalfunctionTrigger();
  }

  updatePhase() {
    if (this.phase === 'CHASE_RESUME') {
      if (this.bird.x >= (CONFIG.BIRD.FINAL_CATCH_X || 6200) - 200) {
        this.phase = 'FINAL_CATCH';
      }
      return;
    }

    if (this.phase === 'FINAL_CATCH' || this.phase === 'CHASE_PAUSED') return;

    if (this.player.x > 800 && this.phase === 'CHASE_START') {
      this.phase = 'CHASE_PROGRESS';
    }

    if (this.player.x >= 2400 && this.phase === 'CHASE_PROGRESS') {
      this.phase = 'CHASE_TIGHT';
    }
  }

  checkMalfunctionTrigger() {
    if (this.phase !== 'CHASE_TIGHT' && this.phase !== 'CHASE_PROGRESS') return;

    // Narrative trigger: Player is actively pursuing, closing in, has executed swings,
    // and crosses into the cinematic corner zone
    const triggerX = (CONFIG.BIRD && CONFIG.BIRD.MALFUNCTION_TRIGGER_X) || 3800;
    const isNearTriggerZone = (this.player.x >= triggerX - 250);
    const isClosingIn = (this.currentLead <= this.idealLeadDistance + 30);
    const hasSufficientSwings = (this.swingsCompleted >= 2 || this.player.x >= triggerX);

    if (isNearTriggerZone && (isClosingIn || hasSufficientSwings)) {
      this.phase = 'CHASE_MALFUNCTION_TRIGGER';
      this.chaseActive = false;
      if (this.scene && typeof this.scene.triggerMalfunctionSequence === 'function') {
        this.scene.triggerMalfunctionSequence();
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.ChaseController = ChaseController;
}
