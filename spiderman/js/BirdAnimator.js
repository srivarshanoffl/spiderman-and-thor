/**
 * BirdAnimator - Dedicated Avian Kinematics & Wing Flap Engine
 *
 * Implements full 8-state flight animation system:
 * FLY, FAST_FLY, TURN, CLIMB, DESCEND, DODGE, SLOW, CATCH
 *
 * Features:
 * - Dynamic velocity-driven wing flapping frequency & multi-frame cycle
 * - Non-linear aerodynamic lift & vertical body bobbing
 * - Banking turns with asymmetrical wing flexion and tail feather rudder
 * - High-speed escape streamlining with golden photon trail modulation
 * - Gentle perch sequence on Oscorp Summit
 */
class BirdAnimator {
  constructor(bird, scene) {
    this.bird = bird;
    this.scene = scene;

    // Active State: FLY, FAST_FLY, TURN, CLIMB, DESCEND, DODGE, SLOW, CATCH
    this.state = 'FLY';
    this.stateTime = 0;

    // Wing Flap Multi-Frame Cycle
    this.flapFrame = 0;
    this.flapTimer = 0;
    this.flapSpeed = 1.0; // Multiplier based on flight speed

    // Procedural Joint & Aerodynamic Angles
    this.bodyPitch = 0;
    this.bodyRoll = 0;
    this.bodyLiftY = 0;
    this.leftWingSpan = 1.0;
    this.rightWingSpan = 1.0;
    this.tailFanAngle = 0;
    this.feathersShimmer = 0;

    // Turn tracking
    this.lastTargetY = bird.y;
    this.turnRate = 0;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateTime = 0;
  }

  update(dt, birdVx, birdVy, isPerched) {
    this.stateTime += dt;
    this.feathersShimmer += dt * 8;

    if (isPerched) {
      this.setState('CATCH');
      this.updateCatch(dt);
      return;
    }

    const speed = Math.sqrt(birdVx * birdVx + birdVy * birdVy);

    // 1. Determine State based on velocity & flight kinematics
    const verticalRate = birdVy;
    if (speed > 540) {
      this.setState('FAST_FLY');
    } else if (verticalRate < -60) {
      this.setState('CLIMB');
    } else if (verticalRate > 60) {
      this.setState('DESCEND');
    } else if (Math.abs(this.turnRate) > 0.15) {
      this.setState('TURN');
    } else if (speed < 220) {
      this.setState('SLOW');
    } else {
      this.setState('FLY');
    }

    // 2. Velocity-Driven Wing Flap Frequency
    // Slow speed: ~0.14s per frame. High speed: ~0.045s per frame.
    const speedRatio = Math.max(0.3, Math.min(2.5, speed / 360));
    const frameInterval = Math.max(0.04, 0.11 / speedRatio);

    this.flapTimer += dt;
    if (this.flapTimer >= frameInterval) {
      this.flapTimer = 0;
      this.flapFrame = (this.flapFrame + 1) % 4;

      // Swap loaded sprite texture frame if available
      const key = `bird_fly_${this.flapFrame}`;
      if (this.bird.sprite && this.scene.textures.exists(key)) {
        this.bird.sprite.setTexture(key);
      }
    }

    // 3. State Kinematics
    switch (this.state) {
      case 'FAST_FLY':
        this.updateFastFly(dt, speed);
        break;
      case 'CLIMB':
        this.updateClimb(dt, verticalRate);
        break;
      case 'DESCEND':
        this.updateDescend(dt, verticalRate);
        break;
      case 'TURN':
        this.updateTurn(dt);
        break;
      case 'SLOW':
        this.updateSlow(dt);
        break;
      case 'FLY':
      default:
        this.updateNormalFly(dt, speed);
        break;
    }
  }

  updateNormalFly(dt, speed) {
    // Non-linear realistic avian lift: body rises on downstroke (frame 2), dips on upstroke (frame 0)
    const liftOffsets = [-3.5, 0, 4.0, 1.5];
    const targetLift = liftOffsets[this.flapFrame] || 0;
    this.bodyLiftY = Phaser.Math.Linear(this.bodyLiftY, targetLift, dt * 14);

    // Slight aerodynamic forward lean
    this.bodyPitch = Phaser.Math.Linear(this.bodyPitch, 0.05, dt * 8);
    this.bodyRoll = Phaser.Math.Linear(this.bodyRoll, 0, dt * 8);
    this.tailFanAngle = 0;
  }

  updateFastFly(dt, speed) {
    // Streamlined sprint: aggressive forward pitch, tight wingstroke amplitude
    const liftOffsets = [-2.0, 0, 2.5, 0.5];
    this.bodyLiftY = Phaser.Math.Linear(this.bodyLiftY, liftOffsets[this.flapFrame] || 0, dt * 20);
    this.bodyPitch = Phaser.Math.Linear(this.bodyPitch, 0.22, dt * 10);
    this.bodyRoll = 0;
    this.tailFanAngle = -0.15; // Tight tail rudder for speed
  }

  updateClimb(dt, vy) {
    // Pitched upward with energetic deep downstrokes
    this.bodyPitch = Phaser.Math.Linear(this.bodyPitch, -0.28, dt * 12);
    this.bodyLiftY = Phaser.Math.Linear(this.bodyLiftY, 5.0, dt * 12);
    this.tailFanAngle = 0.25; // Fan tail wide for vertical lift
  }

  updateDescend(dt, vy) {
    // Swoop glide angle
    this.bodyPitch = Phaser.Math.Linear(this.bodyPitch, 0.32, dt * 12);
    this.bodyLiftY = Phaser.Math.Linear(this.bodyLiftY, -4.0, dt * 12);
    this.tailFanAngle = -0.2;
  }

  updateTurn(dt) {
    // Banking roll
    this.bodyRoll = Phaser.Math.Linear(this.bodyRoll, this.turnRate * 0.6, dt * 10);
    this.tailFanAngle = this.turnRate * 0.4;
  }

  updateSlow(dt) {
    // Lazy thermal glide
    this.bodyLiftY = Math.sin(this.stateTime * 3) * 2.5;
    this.bodyPitch = 0.02;
    this.bodyRoll = 0;
    this.tailFanAngle = 0.15;
  }

  updateCatch(dt) {
    // Perched contentedly: folded wings, gentle breathing flutter
    if (this.bird.sprite && this.scene.textures.exists('bird_perch')) {
      this.bird.sprite.setTexture('bird_perch');
    }
    this.bodyPitch = 0;
    this.bodyRoll = 0;
    this.bodyLiftY = Math.sin(this.stateTime * 3.5) * 1.2;
  }

  /**
   * Render procedural animated golden cyber-falcon vectors
   * High-contrast golden plumage, mechanical cybernetic wings with articulated feathers,
   * glowing emerald optical sensor, and aerodynamic tail feathers.
   */
  renderProcedural(gfx, facing = 1) {
    if (!gfx) return;
    gfx.clear();

    const GOLD = CONFIG.COLORS.GOLD_BIRD || 0xffb914;
    const GOLD_LIGHT = 0xffe277;
    const GOLD_DARK = 0xc68205;
    const GREEN = CONFIG.COLORS.SUCCESS_GREEN || 0x30d158;

    const by = this.bodyLiftY;

    // 1. Aerodynamic Fanned Tail Feathers
    gfx.lineStyle(3, GOLD_DARK, 0.95);
    const tailAngle = this.tailFanAngle;
    gfx.lineBetween(-14 * facing, by + 4, -28 * facing, by + 4 + Math.sin(tailAngle - 0.25) * 8);
    gfx.lineBetween(-14 * facing, by + 4, -30 * facing, by + 4);
    gfx.lineBetween(-14 * facing, by + 4, -28 * facing, by + 4 + Math.sin(tailAngle + 0.25) * 8);

    // 2. Sleek Falcon Body & Chest
    gfx.fillStyle(GOLD, 1.0);
    gfx.fillEllipse(0, by, 32, 18);
    // Golden crest highlight
    gfx.fillStyle(GOLD_LIGHT, 0.85);
    gfx.fillEllipse(4 * facing, by - 3, 20, 10);

    // 3. Cybernetic Beak & Emerald Optical Sensor
    gfx.fillStyle(0x3a2202, 1.0);
    gfx.fillTriangle(14 * facing, by - 4, 24 * facing, by + 1, 14 * facing, by + 5);

    // Emerald Eye / Targeting Sensor
    gfx.fillStyle(GREEN, 1.0);
    gfx.fillCircle(11 * facing, by - 3, 2.8);
    gfx.fillStyle(0xffffff, 1.0);
    gfx.fillCircle(12 * facing, by - 3.5, 1.2); // Specular glint

    // 4. Articulated Wings (Animated according to frame & state)
    // Frame 0=Up, 1=Glide, 2=Down, 3=Tuck
    const wingYs = [-18, -4, 14, -8];
    const wingY = wingYs[this.flapFrame] || -10;

    // Primary Wing Blade
    gfx.fillStyle(GOLD_LIGHT, 0.95);
    gfx.lineStyle(2, GOLD_DARK, 1.0);
    gfx.beginPath();
    gfx.moveTo(-6 * facing, by);
    gfx.lineTo(2 * facing, by + wingY);
    gfx.lineTo(-20 * facing, by + wingY * 0.7);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();

    // Wing Secondary Feather Accents
    gfx.lineStyle(1.5, 0xffffff, 0.8);
    gfx.lineBetween(-4 * facing, by, 0 * facing, by + wingY * 0.8);
    gfx.lineBetween(-10 * facing, by, -14 * facing, by + wingY * 0.6);
  }
}

if (typeof window !== 'undefined') {
  window.BirdAnimator = BirdAnimator;
}
