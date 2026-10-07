/**
 * SpiderHero - Procedural Superhero Character Controller & Renderer
 * Delivers dynamic superhero postures, athletic lean, squash & stretch,
 * motion trails, and malfunction reactions without generic rectangles.
 */
class SpiderHero {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    // Dimensions & Pose
    this.width = 36;
    this.height = 54;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
    this.facing = 1; // 1 = right, -1 = left
    this.isGrounded = false;

    // Pose states
    this.pose = 'IDLE'; // IDLE, RUN, DIVE, SWING, RELEASE_AERIAL, MALFUNCTION_STAGGER, RECOVERY_GRAB, WRIST_EXAMINE
    this.animTimer = 0;

    // Motion Trail / Ghost system
    this.trailHistory = [];
    this.trailGfx = scene.add.graphics().setDepth(11);

    // Main character graphics container
    this.container = scene.add.container(x, y).setDepth(12);
    this.charGfx = scene.add.graphics();
    this.container.add(this.charGfx);

    // High-Resolution Sprite Texture if available
    const initialKey = 'spiderman_' + this.pose.toLowerCase();
    if (scene.textures.exists(initialKey)) {
      this.sprite = scene.add.image(0, -6, initialKey).setOrigin(0.5, 0.58).setDisplaySize(86, 86);
      this.container.add(this.sprite);
    }

    // Dedicated 13-state Kinematic Character Animator
    this.animator = new SpiderManAnimator(this, scene);

    // Initial render
    this.renderPose();
  }

  setPose(pose) {
    if (this.pose !== pose) {
      this.pose = pose;
      this.animTimer = 0;

      // Sync with kinematic animator state
      if (this.animator) {
        if (pose === 'IDLE') this.animator.setState('IDLE');
        else if (pose === 'RUN') this.animator.setState('RUN');
        else if (pose === 'SWING') this.animator.setState('SWING_LOOP');
        else if (pose === 'DIVE') this.animator.setState('FALL');
        else if (pose === 'RELEASE_AERIAL') this.animator.setState('SWING_RELEASE');
        else if (pose === 'MALFUNCTION_STAGGER') this.animator.setState('RECOVERY');
        else if (pose === 'RECOVERY_GRAB') this.animator.setState('LAND');
        else if (pose === 'WRIST_EXAMINE') this.animator.setState('RECOVERY');
      }

      let key = 'spiderman_' + pose.toLowerCase();
      if (!this.scene.textures.exists(key)) {
        if (pose === 'RELEASE_AERIAL') {
          key = 'spiderman_dive';
        } else if (pose === 'RUN' && this.scene.textures.exists('spiderman_sprint')) {
          key = 'spiderman_sprint';
        }
      }
      if (this.scene.textures.exists(key)) {
        if (!this.sprite) {
          this.sprite = this.scene.add.image(0, -6, key).setOrigin(0.5, 0.58).setDisplaySize(86, 86);
          this.container.add(this.sprite);
        } else {
          this.sprite.setTexture(key);
          this.sprite.setVisible(true);
        }
      }
      this.renderPose();
    }
  }

  update(dt, input, isSwinging, swingAngle) {
    this.animTimer += dt;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    // Update Kinematic Animator
    if (this.animator) {
      this.animator.update(dt, speed, isSwinging, swingAngle);
    }

    // Update Motion Trail when moving fast
    if (speed > 480) {
      this.trailHistory.unshift({
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        pose: this.pose,
        facing: this.facing,
        alpha: 0.45
      });
      if (this.trailHistory.length > 5) this.trailHistory.pop();
    } else {
      if (this.trailHistory.length > 0) this.trailHistory.shift();
    }
    this.renderTrail();

    // Determine facing direction
    if (this.vx > 20) this.facing = 1;
    else if (this.vx < -20) this.facing = -1;

    // Body Tilt & Aerodynamic Lean based on state
    if (this.pose === 'SWING') {
      this.rotation = Phaser.Math.Linear(this.rotation, swingAngle * 0.75, 0.2);
      this.scaleX = 1.05;
      this.scaleY = 0.95;
    } else if (this.pose === 'DIVE') {
      const targetAngle = Math.atan2(this.vy, this.vx * 0.7);
      this.rotation = Phaser.Math.Linear(this.rotation, targetAngle, 0.15);
      this.scaleX = 1.15;
      this.scaleY = 0.85;
    } else if (this.pose === 'RELEASE_AERIAL') {
      this.rotation += dt * 7.5 * this.facing;
      this.scaleX = 1.0;
      this.scaleY = 1.0;
    } else if (this.pose === 'MALFUNCTION_STAGGER') {
      this.rotation = Math.sin(this.animTimer * 14) * 0.25;
      this.scaleX = 0.95;
      this.scaleY = 1.05;
    } else if (this.pose === 'WRIST_EXAMINE') {
      this.rotation = 0;
      this.scaleX = 1;
      this.scaleY = 1;
    } else if (this.isGrounded) {
      this.rotation = 0;
      if (Math.abs(this.vx) > 30) {
        this.scaleX = 1.0 + Math.sin(this.animTimer * 16) * 0.08;
        this.scaleY = 1.0 - Math.sin(this.animTimer * 16) * 0.08;
      } else {
        this.scaleY = 1.0 + Math.sin(this.animTimer * 3) * 0.04;
        this.scaleX = 1.0 - Math.sin(this.animTimer * 3) * 0.02;
      }
    }

    // Apply joint dynamics to container
    const j = this.animator ? this.animator.joints : { torsoY: 0, torsoTilt: 0, torsoScaleX: 1, torsoScaleY: 1 };
    this.container.setPosition(this.x, this.y + j.torsoY);
    this.container.setRotation(this.rotation + j.torsoTilt * 0.4 * this.facing);
    this.container.setScale(this.facing * this.scaleX * j.torsoScaleX, this.scaleY * j.torsoScaleY);

    if (this.sprite) {
      this.sprite.setY(-6 + j.torsoY * 0.5);
      this.sprite.setRotation(j.torsoTilt * 0.3);
    }

    this.renderPose();
  }

  renderTrail() {
    this.trailGfx.clear();
    for (const ghost of this.trailHistory) {
      ghost.alpha *= 0.78;
      if (ghost.alpha < 0.05) continue;
      this.trailGfx.fillStyle(CONFIG.COLORS.TECH_CYAN, ghost.alpha * 0.4);
      this.trailGfx.fillCircle(ghost.x, ghost.y - 10, 16);
      this.trailGfx.fillStyle(CONFIG.COLORS.SPIDER_RED, ghost.alpha * 0.5);
      this.trailGfx.fillCircle(ghost.x, ghost.y, 14);
    }
  }

  renderPose() {
    // If high-resolution sprite texture is active, hide vector base or enhance
    let currentKey = 'spiderman_' + this.pose.toLowerCase();
    if (this.pose === 'RELEASE_AERIAL') currentKey = 'spiderman_dive';

    if (this.animator) {
      if (this.sprite) {
        this.sprite.setVisible(false);
      }
      this.animator.render(this.charGfx, this.facing);
      return;
    }
    this._vectorCleared = false;

    const g = this.charGfx;
    g.clear();

    const RED = CONFIG.COLORS.SPIDER_RED;
    const BLUE = CONFIG.COLORS.SPIDER_BLUE;
    const BLACK = CONFIG.COLORS.SPIDER_BLACK;
    const WHITE = CONFIG.COLORS.WEB_WHITE;
    const t = this.animTimer;

    if (this.pose === 'WRIST_EXAMINE') {
      // Task 3: Believable Wrist Preparation Kinematics (arm lifts, wrist rotates, hand adjusts)
      const prep = (typeof this.wristPrepProgress === 'number') ? this.wristPrepProgress : 1.0;
      
      // Legs (Perched balanced stance on fire escape)
      g.fillStyle(BLUE, 1);
      g.fillRect(-14, 8, 12, 18);
      g.fillRect(2, 8, 12, 18);
      // Red boots
      g.fillStyle(RED, 1);
      g.fillRect(-15, 22, 14, 10);
      g.fillRect(1, 22, 14, 10);

      // Torso angled toward camera
      g.fillStyle(RED, 1);
      g.fillRect(-14, -18, 28, 28);
      g.fillStyle(BLUE, 1);
      g.fillRect(-14, -8, 6, 18);
      g.fillRect(8, -8, 6, 18);

      // Spider emblem
      g.fillStyle(BLACK, 1);
      g.fillCircle(0, -6, 4);

      // Head tilting down toward the lifting wrist
      const headTiltY = -28 + prep * 2;
      g.fillStyle(RED, 1);
      g.fillCircle(0, headTiltY, 12);
      // Angled expressive white lenses focused directly on the shooter
      g.fillStyle(WHITE, 1);
      g.lineStyle(1.5, BLACK, 1);
      g.fillTriangle(-2, headTiltY - 3, -8, headTiltY + 2, -1, headTiltY + 2);
      g.strokeTriangle(-2, headTiltY - 3, -8, headTiltY + 2, -1, headTiltY + 2);
      g.fillTriangle(2, headTiltY - 3, 8, headTiltY + 2, 1, headTiltY + 2);
      g.strokeTriangle(2, headTiltY - 3, 8, headTiltY + 2, 1, headTiltY + 2);

      // Supporting Right Hand (stabilizes forearm)
      const rightHandX = Phaser.Math.Linear(-8, 4, prep);
      const rightHandY = Phaser.Math.Linear(0, -8, prep);
      g.lineStyle(5, RED, 1);
      g.lineBetween(6, -10, rightHandX, rightHandY);

      // Articulated Left Arm: Shoulder -> Elbow -> Wrist (Physically lifts and rotates!)
      const shoulderX = -6;
      const shoulderY = -12;
      const elbowX = Phaser.Math.Linear(0, 10, prep);
      const elbowY = Phaser.Math.Linear(2, -6, prep);
      const wristX = Phaser.Math.Linear(8, 18, prep);
      const wristY = Phaser.Math.Linear(8, -16, prep);

      // Shoulder to elbow
      g.lineStyle(6, RED, 1);
      g.lineBetween(shoulderX, shoulderY, elbowX, elbowY);
      // Forearm (elbow to wrist)
      g.lineStyle(5.5, RED, 1);
      g.lineBetween(elbowX, elbowY, wristX, wristY);

      // Left Hand & Subtle Finger Motion
      const fingerFlex = Math.sin(t * 6) * 1.5;
      const handEndX = wristX + 6 + fingerFlex * 0.5;
      const handEndY = wristY - 4 - fingerFlex;
      g.lineStyle(4, RED, 1);
      g.lineBetween(wristX, wristY, handEndX, handEndY);

      // Web Shooter Gauntlet (Physically anchored to wrist)
      g.fillStyle(0x1a2638, 1);
      g.fillRect(wristX - 3, wristY - 6, 12, 10);
      g.lineStyle(1.5, 0x3d506d, 1);
      g.strokeRect(wristX - 3, wristY - 6, 12, 10);

      // Gauntlet Titanium Emitter Latch & LED
      g.fillStyle(0x00f0ff, 0.95);
      g.fillCircle(wristX + 7, wristY - 1, 2.5);

      // Flickering red error spark
      if (Math.sin(t * 26) > 0.1) {
        g.fillStyle(CONFIG.COLORS.WARN_RED, 1);
        g.fillCircle(wristX + 9, wristY - 2, 3.5);
      }

      this.lastGauntletPos = { x: this.x + (wristX + 4) * this.facing, y: this.y + (wristY - 1) };
      return;
    }

    if (this.pose === 'SWING') {
      // Dynamic Web Swing Arc Pose
      // Arm raised up holding web line
      g.lineStyle(6, RED, 1);
      g.lineBetween(2, -14, 12, -38); // Reaching up
      // Web shooter on wrist
      g.fillStyle(0x223344, 1);
      g.fillRect(10, -36, 5, 5);

      // Free arm trailed backwards for balance
      g.lineStyle(5, RED, 1);
      g.lineBetween(-8, -12, -26, -4);

      // Torso curved into momentum
      g.fillStyle(RED, 1);
      g.fillRect(-12, -18, 24, 26);
      g.fillStyle(BLUE, 1);
      g.fillRect(-12, -6, 6, 14);
      g.fillRect(6, -6, 6, 14);

      // Spider emblem
      g.fillStyle(BLACK, 1);
      g.fillCircle(0, -6, 3.5);

      // Head tilted up toward target
      g.fillStyle(RED, 1);
      g.fillCircle(4, -28, 11);
      // Expressive eyes
      g.fillStyle(WHITE, 1);
      g.lineStyle(1.5, BLACK, 1);
      g.fillTriangle(2, -30, 9, -27, 4, -25);
      g.strokeTriangle(2, -30, 9, -27, 4, -25);

      // Trailing acrobatic legs
      g.lineStyle(6, BLUE, 1);
      g.lineBetween(-6, 8, -20, 22);
      g.lineBetween(4, 8, -10, 28);
      // Boots
      g.lineStyle(6, RED, 1);
      g.lineBetween(-20, 22, -28, 28);
      g.lineBetween(-10, 28, -16, 36);
      return;
    }

    if (this.pose === 'DIVE') {
      // Aerodynamic High-Speed Dive Pose
      // Head down
      g.fillStyle(RED, 1);
      g.fillCircle(14, -4, 11);
      g.fillStyle(WHITE, 1);
      g.fillTriangle(14, -7, 22, -4, 16, -1);

      // Torso streamlined horizontally
      g.fillStyle(RED, 1);
      g.fillRect(-14, -12, 28, 20);
      g.fillStyle(BLUE, 1);
      g.fillRect(-14, -12, 28, 6);

      // Arms tucked alongside torso
      g.lineStyle(5, RED, 1);
      g.lineBetween(6, -6, -18, -12);
      g.lineBetween(6, 4, -18, 8);

      // Extended legs behind
      g.lineStyle(6, BLUE, 1);
      g.lineBetween(-14, -4, -34, -2);
      g.lineStyle(6, RED, 1);
      g.lineBetween(-34, -2, -46, -1);
      return;
    }

    if (this.pose === 'MALFUNCTION_STAGGER') {
      // Flailing Stagger Freefall Pose (Web failed, clutching wrist)
      g.fillStyle(RED, 1);
      g.fillCircle(0, -26, 12);
      // Wide startled eyes
      g.fillStyle(WHITE, 1);
      g.lineStyle(1.5, BLACK, 1);
      g.fillCircle(-4, -26, 4);
      g.strokeCircle(-4, -26, 4);
      g.fillCircle(4, -26, 4);
      g.strokeCircle(4, -26, 4);

      // Torso
      g.fillStyle(RED, 1);
      g.fillRect(-13, -16, 26, 26);
      g.fillStyle(BLUE, 1);
      g.fillRect(-13, -6, 6, 16);
      g.fillRect(7, -6, 6, 16);

      // Right arm clutching left wrist
      g.lineStyle(5, RED, 1);
      g.lineBetween(6, -10, -4, 0);
      // Left arm extended out with sparking shooter
      g.lineBetween(-6, -10, -22, -2);

      // Sparking shooter
      g.fillStyle(0x334455, 1);
      g.fillRect(-26, -5, 6, 6);
      g.fillStyle(CONFIG.COLORS.WARN_RED, 1);
      g.fillCircle(-23, -2, 4 + Math.random() * 3);

      // Flailing bent legs
      g.lineStyle(6, BLUE, 1);
      g.lineBetween(-6, 10, -18, 24);
      g.lineBetween(6, 10, 16, 20);
      g.lineStyle(6, RED, 1);
      g.lineBetween(-18, 24, -26, 20);
      g.lineBetween(16, 20, 24, 28);
      return;
    }

    if (this.pose === 'RECOVERY_GRAB') {
      // Clinging firmly to fire escape railing / landing crouch
      g.fillStyle(RED, 1);
      g.fillCircle(0, -16, 11);
      g.fillStyle(WHITE, 1);
      g.fillTriangle(-2, -18, 6, -16, 0, -13);

      g.fillStyle(RED, 1);
      g.fillRect(-12, -8, 24, 20);
      g.fillStyle(BLUE, 1);
      g.fillRect(-12, 0, 6, 12);
      g.fillRect(6, 0, 6, 12);

      // Deep crouch legs
      g.lineStyle(6, BLUE, 1);
      g.lineBetween(-8, 10, -18, 16);
      g.lineBetween(8, 10, 18, 16);
      g.lineStyle(6, RED, 1);
      g.lineBetween(-18, 16, -14, 26);
      g.lineBetween(18, 16, 14, 26);

      // Both hands gripping ledge
      g.lineStyle(5, RED, 1);
      g.lineBetween(-10, -2, -22, 10);
      g.lineBetween(10, -2, 22, 10);
      return;
    }

    // Default: IDLE or SPRINT
    const runCycle = Math.sin(t * 18);
    // Head
    g.fillStyle(RED, 1);
    g.fillCircle(0, -26, 11);
    g.fillStyle(WHITE, 1);
    g.lineStyle(1.5, BLACK, 1);
    g.fillTriangle(-2, -29, 6, -26, 0, -23);
    g.strokeTriangle(-2, -29, 6, -26, 0, -23);

    // Torso
    g.fillStyle(RED, 1);
    g.fillRect(-11, -16, 22, 24);
    g.fillStyle(BLUE, 1);
    g.fillRect(-11, -6, 5, 14);
    g.fillRect(6, -6, 5, 14);

    // Spider chest emblem
    g.fillStyle(BLACK, 1);
    g.fillCircle(0, -6, 3);

    // Limbs based on running vs idle
    if (Math.abs(this.vx) > 30) {
      // Running legs
      g.lineStyle(5, BLUE, 1);
      g.lineBetween(-5, 8, -14 * runCycle, 20);
      g.lineBetween(5, 8, 14 * runCycle, 20);
      g.lineStyle(5, RED, 1);
      g.lineBetween(-14 * runCycle, 20, -18 * runCycle, 28);
      g.lineBetween(14 * runCycle, 20, 18 * runCycle, 28);

      // Running arms
      g.lineStyle(4.5, RED, 1);
      g.lineBetween(-8, -10, 14 * runCycle, 0);
      g.lineBetween(8, -10, -14 * runCycle, 0);
    } else {
      // Idle Rooftop Stance
      g.fillStyle(BLUE, 1);
      g.fillRect(-10, 8, 9, 14);
      g.fillRect(1, 8, 9, 14);
      g.fillStyle(RED, 1);
      g.fillRect(-11, 22, 10, 6);
      g.fillRect(1, 22, 10, 6);

      // Arms at sides
      g.lineStyle(4.5, RED, 1);
      g.lineBetween(-8, -10, -13, 4);
      g.lineBetween(8, -10, 13, 4);
    }
  }

  destroy() {
    if (this.trailGfx) this.trailGfx.destroy();
    if (this.container) this.container.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.SpiderHero = SpiderHero;
}
