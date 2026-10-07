/**
 * FXManager - Superhero Visual Effects Engine
 * Renders dynamic tensioned web lines, attachment flashes, wind streams,
 * electrical misfire sparks, speed lines, and smoke dissolution.
 */
class FXManager {
  constructor(scene) {
    this.scene = scene;
    this.webGfx = scene.add.graphics().setDepth(14);
    this.particlesGfx = scene.add.graphics().setDepth(16);
    this.speedLinesGfx = scene.add.graphics().setDepth(17).setScrollFactor(0);

    // Particle pools
    this.sparks = [];
    this.windParticles = [];
    this.impactParticles = [];

    this.initWindParticles();
  }

  initWindParticles() {
    for (let i = 0; i < CONFIG.WIND_PARTICLE_COUNT; i++) {
      this.windParticles.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        length: 20 + Math.random() * 40,
        speed: 400 + Math.random() * 500,
        alpha: 0.15 + Math.random() * 0.35
      });
    }
  }

  // Draw Dynamic Web Strand with Realistic Catenary Droop / Tension
  renderWeb(heroX, heroY, anchorX, anchorY, progress = 1.0, isFlickering = false) {
    this.webGfx.clear();
    if (!anchorX || !anchorY || progress <= 0) return;

    // If flickering during malfunction, randomly drop frames or flash red
    if (isFlickering) {
      if (Math.random() < 0.4) return; // Drop frame flicker
      this.webGfx.lineStyle(2, CONFIG.COLORS.WARN_RED, 0.8);
    }

    // Hand origin position on Spider-Man (wrist offset)
    const startX = heroX + 6;
    const startY = heroY - 24;

    // Interpolate end point towards anchor based on deployment progress
    const endX = startX + (anchorX - startX) * progress;
    const endY = startY + (anchorY - startY) * progress;

    // Draw multi-segment catenary curve
    const segments = 10;
    const points = [];
    const sag = (1.0 - progress) * 25 + Math.sin(this.scene.time.now * 0.015) * 4;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = startX + (endX - startX) * t;
      // Parabolic sag
      const py = startY + (endY - startY) * t + Math.sin(t * Math.PI) * sag;
      points.push({ x: px, y: py });
    }

    // Outer subtle cyan/blue glow
    this.webGfx.lineStyle(4, isFlickering ? CONFIG.COLORS.WARN_RED : 0x77bbee, 0.35);
    this.webGfx.beginPath();
    this.webGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.webGfx.lineTo(points[i].x, points[i].y);
    }
    this.webGfx.strokePath();

    // Bright white high-tensile core
    this.webGfx.lineStyle(2, isFlickering ? 0xffaaaa : CONFIG.COLORS.WEB_WHITE, 0.95);
    this.webGfx.beginPath();
    this.webGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.webGfx.lineTo(points[i].x, points[i].y);
    }
    this.webGfx.strokePath();

    // Anchor attachment anchor flash
    if (progress >= 0.95 && !isFlickering) {
      this.webGfx.fillStyle(0xffffff, 0.9);
      this.webGfx.fillCircle(anchorX, anchorY, 4.5);
      this.webGfx.lineStyle(1.5, 0x88ccff, 0.7);
      this.webGfx.strokeCircle(anchorX, anchorY, 9);
    }
  }

  clearWeb() {
    this.webGfx.clear();
  }

  // Burst of sparks when web shooter misfires
  triggerMisfireSparks(x, y) {
    for (let i = 0; i < CONFIG.SPARK_BURST_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 450;
      this.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color: (Math.random() > 0.4) ? CONFIG.COLORS.WARN_RED : 0xffcc00,
        size: 2 + Math.random() * 3,
        life: 0.25 + Math.random() * 0.4,
        maxLife: 0.65
      });
    }
  }

  // Anchor contact puff / spark
  triggerAnchorImpact(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.impactParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 140,
        vy: Math.sin(angle) * 140,
        color: 0x99ddff,
        life: 0.18,
        size: 3
      });
    }
  }

  // Rooftop landing dust
  triggerLandingDust(x, y) {
    for (let i = 0; i < 10; i++) {
      this.impactParticles.push({
        x: x + (Math.random() * 30 - 15),
        y: y - 2,
        vx: (Math.random() - 0.5) * 180,
        vy: -Math.random() * 80,
        color: 0x8090a8,
        life: 0.25,
        size: 4
      });
    }
  }

  spawnMalfunctionSparks(x, y) {
    this.triggerMisfireSparks(x, y);
  }

  spawnWebSparks(x, y) {
    this.triggerAnchorImpact(x, y);
  }

  update(dt, speedRatio, isHeroSwing) {
    this.particlesGfx.clear();
    this.speedLinesGfx.clear();

    // 1. Update and render Misfire Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 650 * dt; // Gravity on sparks

      const alpha = s.life / s.maxLife;
      this.particlesGfx.fillStyle(s.color, alpha);
      this.particlesGfx.fillCircle(s.x, s.y, s.size);
    }

    // 2. Update Impact Particles
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const p = this.impactParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.impactParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.particlesGfx.fillStyle(p.color, p.life * 4);
      this.particlesGfx.fillCircle(p.x, p.y, p.size);
    }

    // 3. Update Dynamic Wind Streams (Screen-Space overlay)
    if (speedRatio > 0.4) {
      const windSpeed = 600 * speedRatio;
      this.speedLinesGfx.lineStyle(1.5, 0xd0e8ff, Math.min(speedRatio * 0.4, 0.5));
      for (const w of this.windParticles) {
        w.x -= (w.speed + windSpeed) * dt;
        if (w.x < -100) {
          w.x = CONFIG.CANVAS_WIDTH * 1.25 + Math.random() * 120;
          w.y = Math.random() * CONFIG.CANVAS_HEIGHT;
        }
        this.speedLinesGfx.lineBetween(w.x, w.y, w.x + w.length * speedRatio, w.y);
      }
    }

    // 4. Hero Swing Radial Speed Lines
    if (isHeroSwing) {
      this.speedLinesGfx.lineStyle(2, 0xffffff, 0.45);
      const cx = CONFIG.CANVAS_WIDTH * 0.5;
      const cy = CONFIG.CANVAS_HEIGHT * 0.5;
      for (let k = 0; k < 12; k++) {
        const angle = (k / 12) * Math.PI * 2 + (this.scene.time.now * 0.002);
        const r1 = 300 + Math.random() * 50;
        const r2 = 720;
        this.speedLinesGfx.lineBetween(
          cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1,
          cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2
        );
      }
    }
  }

  destroy() {
    if (this.webGfx) this.webGfx.destroy();
    if (this.particlesGfx) this.particlesGfx.destroy();
    if (this.speedLinesGfx) this.speedLinesGfx.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.FXManager = FXManager;
}
