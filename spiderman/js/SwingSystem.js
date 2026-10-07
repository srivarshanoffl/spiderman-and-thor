/**
 * SwingSystem - Forgiving Custom Web Swing Physics
 * Simulates dynamic pendulum kinematics, tension, angular momentum,
 * player torque injection, and high-velocity forward release launches.
 */
class SwingSystem {
  constructor() {
    this.isAttached = false;
    this.anchor = null;
    this.length = 0;
    this.angle = 0; // angle in radians from vertical down (0 = straight down, positive = right)
    this.angularVelocity = 0;
    this.webProgress = 0; // 0 to 1 shoot animation
    this.isDeploying = false;
  }

  attach(hero, anchor) {
    this.anchor = anchor;
    this.isDeploying = true;
    this.webProgress = 0;

    // Calculate initial polar coordinates relative to anchor
    const dx = hero.x - anchor.x;
    const dy = hero.y - anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const minLen = CONFIG.SWING_MIN_LENGTH || 80;
    const maxLen = CONFIG.SWING_MAX_LENGTH || 580;
    this.length = Phaser.Math.Clamp(dist, minLen, maxLen);
    this.angle = Math.atan2(dx, dy); // 0 = straight down

    // Project player's current linear velocity onto perpendicular swing tangent
    // Tangent unit vector: (cos(angle), -sin(angle))
    const tangentX = Math.cos(this.angle);
    const tangentY = -Math.sin(this.angle);
    const tangentialSpeed = (hero.vx * tangentX + hero.vy * tangentY);

    // Initial angular velocity: omega = v / r
    this.angularVelocity = tangentialSpeed / (this.length || 100);

    // Ensure minimum momentum only when moving forward; allow natural backward swings
    if (hero.vx >= 0) {
      if (this.angularVelocity < 0.8 && this.angle < 0) {
        this.angularVelocity = 1.6;
      } else if (Math.abs(this.angularVelocity) < 0.6) {
        this.angularVelocity = 1.4;
      }
    } else {
      if (this.angularVelocity > -0.6 && this.angle > 0) {
        this.angularVelocity = -1.2;
      }
    }

    this.isAttached = true;
  }

  update(dt, hero, input) {
    if (!this.isAttached || !this.anchor) return null;

    // Web shoot interpolation animation
    if (this.isDeploying) {
      this.webProgress += dt * 12;
      if (this.webProgress >= 1) {
        this.webProgress = 1;
        this.isDeploying = false;
      }
    }

    // Pendulum physics equations:
    // theta'' = -(g / L) * sin(theta) + playerTorque
    const swingGravity = CONFIG.SWING_GRAVITY || 1250;
    const pushForce = CONFIG.SWING_PUSH_FORCE || 340;
    const swingDamping = CONFIG.SWING_DAMPING || 0.994;
    const autoReleaseAngle = CONFIG.FORGIVING_AUTO_RELEASE_ANGLE || 155;

    const gravityAccel = -(swingGravity / (this.length || 100)) * Math.sin(this.angle);

    // Player directional influence (pumping the swing with A/D or Left/Right)
    let playerTorque = 0;
    if (input && input.horizontal > 0) {
      // Pushing right / forward
      playerTorque = (pushForce / (this.length || 100));
      // Give bonus pump when swinging in matching direction
      if (this.angularVelocity > 0) playerTorque *= 1.35;
    } else if (input && input.horizontal < 0) {
      playerTorque = -(pushForce / (this.length || 100)) * 0.7; // Gentle back-swing
    }

    // Boost torque
    if (input && input.boostActive) {
      playerTorque *= 1.4;
    }

    // Integrate angular acceleration
    this.angularVelocity += (gravityAccel + playerTorque) * dt;
    this.angularVelocity *= Math.pow(swingDamping, dt * 60);

    // Integrate angle
    this.angle += this.angularVelocity * dt;

    // Compute updated position on arc
    const targetX = this.anchor.x + Math.sin(this.angle) * this.length;
    const targetY = this.anchor.y + Math.cos(this.angle) * this.length;

    // Tangential linear velocity
    const speed = this.angularVelocity * this.length;
    const tangentX = Math.cos(this.angle);
    const tangentY = -Math.sin(this.angle);

    hero.vx = tangentX * speed;
    hero.vy = tangentY * speed;
    hero.x = targetX;
    hero.y = targetY;

    // Auto-release if swing arc exceeds safe threshold so Spider-Man never stalls backwards
    const deg = Phaser.Math.RadToDeg(this.angle);
    if (deg > autoReleaseAngle) {
      return this.release(hero, true);
    }

    return {
      attached: true,
      angle: this.angle,
      length: this.length,
      anchor: this.anchor,
      speed: Math.abs(speed),
      webProgress: this.webProgress
    };
  }

  release(hero, isAuto = false) {
    if (!this.isAttached) return null;

    // Preserve tangential momentum and inject forward release leap
    const boostX = CONFIG.SWING_RELEASE_BOOST_X || 1.35;
    const boostY = CONFIG.SWING_RELEASE_BOOST_Y || 1.15;

    const tangentX = Math.cos(this.angle);
    const tangentY = -Math.sin(this.angle);
    const speed = this.angularVelocity * this.length;

    let launchVx = tangentX * speed * boostX;
    let launchVy = tangentY * speed * boostY;

    // Ensure forward launch boost
    if (launchVx < 320) launchVx = 380;
    // Upward pop if releasing on upswing
    if (this.angle > 0.1 && launchVy > -120) {
      launchVy = -260;
    }

    hero.vx = launchVx;
    hero.vy = launchVy;

    const previousAnchor = this.anchor;
    this.isAttached = false;
    this.anchor = null;
    this.webProgress = 0;
    this.isDeploying = false;

    return {
      released: true,
      isAuto: isAuto,
      previousAnchor: previousAnchor,
      launchVx: launchVx,
      launchVy: launchVy
    };
  }
}

if (typeof window !== 'undefined') {
  window.SwingSystem = SwingSystem;
}
