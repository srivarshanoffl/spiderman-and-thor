/**
 * BirdTarget - Intelligent Avian Target & Chase Director
 * Manages the fast-moving golden cyber-falcon that Spider-Man pursues across Manhattan.
 * Features:
 * - Multi-frame wing flapping state machine (up, glide, down, tuck, perch)
 * - Spline/waypoint path trajectory through skyscrapers and rooftop structures
 * - Dynamic chase assist (modulates speed so the bird remains catchable without frustration)
 * - Glowing golden feather & speed-streak particle trail
 * - Playful, harmless web capture animation and landing sequence
 */
class BirdTarget {
  constructor(scene, startX = 450, startY = 320) {
    this.scene = scene;
    this.x = startX;
    this.y = startY;
    this.vx = CONFIG.BIRD.BASE_SPEED;
    this.vy = 0;
    this.facing = 1;
    this.rotation = 0;

    // Flight state: FLYING, HOVERING, EVADING, CAUGHT, PERCHED
    this.state = 'FLYING';
    this.flightTime = 0;
    this.flapTimer = 0;
    this.flapFrame = 0; // 0=up, 1=glide, 2=down, 3=tuck

    // Capture physics & animation
    this.isCaptured = false;
    this.isPerched = false;
    this.captureProgress = 0.0;
    this.landingProgress = 0.0;

    // Golden flight trail particles
    this.trailHistory = [];
    this.trailGfx = scene.add.graphics().setDepth(13);

    // Main sprite container
    this.container = scene.add.container(this.x, this.y).setDepth(15);

    // Dedicated Bird Kinematic Flight Animator
    this.animator = new BirdAnimator(this, scene);

    // Glowing aura behind bird
    this.glowAura = scene.add.image(0, 0, 'particle_glow')
      .setDisplaySize(80, 80)
      .setTint(0xffb914)
      .setAlpha(0.65);
    this.container.add(this.glowAura);

    // Procedural articulated golden cyber-falcon graphics
    this.birdGfx = scene.add.graphics();
    this.container.add(this.birdGfx);

    // Bird Sprite (kept hidden to avoid overlapping double-render with BirdAnimator)
    this.sprite = scene.add.image(0, 0, 'bird_fly_1')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(72, 72)
      .setVisible(false);
    this.container.add(this.sprite);

    // Waypoint Navigation System (Task 8 & 12)
    this.waypoints = [
      { x: 500, y: 320, speed: 300, desc: 'Intro flight over starting rooftop' },
      { x: 1200, y: 260, speed: 340, desc: 'Climb over Stark water tower' },
      { x: 2100, y: 340, speed: 360, desc: 'Swoop down through skyscraper canyon' },
      { x: 2900, y: 240, speed: 380, desc: 'High crest over Daily Bugle sign' },
      { x: 3750, y: 330, speed: 320, desc: 'Hero chase corner: near-catch before malfunction' },
      { x: 4400, y: 220, speed: 180, desc: 'Hovering in distance during repair' },
      { x: 5200, y: 290, speed: 350, desc: 'Resume chase after web repair' },
      { x: 6100, y: 360, speed: 280, desc: 'Final catch zone over Oscorp Summit' }
    ];
    this.currentWaypointIndex = 0;
  }

  update(dt, hero) {
    this.flightTime += dt;
    this.flapTimer += dt;

    if (this.state === 'CAUGHT') {
      this.updateCapturedState(dt, hero);
      return;
    }

    // Determine current navigation target
    const targetWp = this.waypoints[this.currentWaypointIndex];
    if (targetWp) {
      const dx = targetWp.x - this.x;
      const dy = targetWp.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120 && this.currentWaypointIndex < this.waypoints.length - 1) {
        this.currentWaypointIndex++;
      }
    }

    // Task 9: Dynamic Chase Assist
    // Maintain a fun, readable distance window (160px - 400px ahead of Spider-Man)
    const distanceToHero = this.x - hero.x;
    let desiredSpeed = targetWp ? targetWp.speed : CONFIG.BIRD.BASE_SPEED;

    if (distanceToHero > CONFIG.BIRD.CHASE_ASSIST_MAX) {
      // Spider-Man fell behind: bird glides slower so player catches up
      desiredSpeed = Math.max(CONFIG.BIRD.MIN_SPEED, desiredSpeed * 0.72);
    } else if (distanceToHero < CONFIG.BIRD.CHASE_ASSIST_MIN && this.x < CONFIG.BIRD.FINAL_CATCH_X) {
      // Spider-Man is getting close before the scripted moment: bird accelerates with evasive flutter
      desiredSpeed = Math.min(CONFIG.BIRD.MAX_SPEED, desiredSpeed * 1.35);
    }

    // Smooth acceleration toward desired speed
    this.vx = Phaser.Math.Linear(this.vx, desiredSpeed, 0.05);

    // Vertical flight bobbing & target alignment
    const targetY = targetWp ? targetWp.y : 300;
    const verticalBob = Math.sin(this.flightTime * 4.5) * 25;
    const prevY = this.y;
    this.y = Phaser.Math.Linear(this.y, targetY + verticalBob, 0.035);
    if (dt > 0) {
      this.vy = (this.y - prevY) / dt;
    }

    // Advance horizontal position
    this.x += this.vx * dt;

    // Directional bank & rotation
    const bankAngle = Math.atan2(this.vy + Math.cos(this.flightTime * 4.5) * 80, this.vx) * 0.35;
    this.rotation = Phaser.Math.Linear(this.rotation, bankAngle, 0.12);

    // Drive Kinematic Avian Animator
    if (this.animator) {
      this.animator.turnRate = (targetY - this.y) * 0.01;
      this.animator.update(dt, this.vx, this.vy, this.isPerched);
      this.animator.renderProcedural(this.birdGfx, this.facing);
    }

    // Update container transform with non-linear avian body lift & roll
    const liftY = this.animator ? this.animator.bodyLiftY : 0;
    const roll = this.animator ? this.animator.bodyRoll : 0;
    this.container.setPosition(this.x, this.y + liftY);
    this.container.setRotation(this.rotation + roll);

    // Aura pulse
    this.glowAura.setScale(1.0 + Math.sin(this.flightTime * 6) * 0.15);

    // Trail generation
    this.updateTrail(dt);
  }

  updateTrail(dt) {
    // Add golden flight streak particles
    if (Math.random() < 0.6) {
      this.trailHistory.unshift({
        x: this.x - 20,
        y: this.y + (Math.random() * 12 - 6),
        alpha: 0.8,
        size: 7 + Math.random() * 6
      });
    }

    if (this.trailHistory.length > 12) this.trailHistory.pop();

    this.trailGfx.clear();
    for (const p of this.trailHistory) {
      p.alpha *= 0.84;
      p.size *= 0.94;
      if (p.alpha < 0.05) continue;
      this.trailGfx.fillStyle(CONFIG.COLORS.GOLD_BIRD, p.alpha * 0.7);
      this.trailGfx.fillCircle(p.x, p.y, p.size);
      this.trailGfx.fillStyle(CONFIG.COLORS.TECH_CYAN, p.alpha * 0.5);
      this.trailGfx.fillCircle(p.x + 4, p.y, p.size * 0.5);
    }
  }

  // Task 39 & 41: Harmless Web Catch & Playful Landing Animation
  triggerCapture(hero, onComplete) {
    this.state = 'CAUGHT';
    this.isCaptured = true;
    this.trailGfx.clear();

    if (this.scene.audio) {
      this.scene.audio.playBirdCatch();
    }

    // Tween bird gently closer to Spider-Man
    this.scene.tweens.add({
      targets: this,
      captureProgress: 1.0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        // Smoothly reel bird toward Spider-Man's hand/shoulder
        const targetX = hero.x + 36;
        const targetY = hero.y - 18;
        this.x = Phaser.Math.Linear(this.x, targetX, 0.12);
        this.y = Phaser.Math.Linear(this.y, targetY, 0.12);
        this.container.setPosition(this.x, this.y);
        this.rotation = Phaser.Math.Linear(this.rotation, 0, 0.1);
        this.container.setRotation(this.rotation);
      },
      onComplete: () => {
        // Bird perches happily on Spider-Man's hand!
        if (this.scene.textures.exists('bird_perch')) {
          this.sprite.setTexture('bird_perch');
        }
        this.isPerched = true;
        this.glowAura.setTint(0x30d158); // Gentle green success glow

        // Gentle wing flutter loop
        this.scene.tweens.add({
          targets: this.sprite,
          scaleY: 0.92,
          yoyo: true,
          repeat: 4,
          duration: 140
        });

        if (onComplete) onComplete();
      }
    });
  }

  updateCapturedState(dt, hero) {
    if (this.captureProgress >= 1.0) {
      // Anchored to Spider-Man's shoulder/wrist
      this.x = hero.x + 34;
      this.y = hero.y - 16;
      this.container.setPosition(this.x, this.y);
      this.container.setRotation(0);
    }
  }

  destroy() {
    if (this.container) this.container.destroy();
    if (this.trailGfx) this.trailGfx.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.BirdTarget = BirdTarget;
}
