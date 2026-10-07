/**
 * CameraController - Cinematic Camera Dynamics
 * Implements smooth follow, velocity-based lead, dynamic zoom expansion,
 * malfunction shake, and close-up cinematic transitions with bulletproof fallback guards.
 */
class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    const baseZoom = CONFIG.CAMERA_BASE_ZOOM || (CONFIG.CAMERA && CONFIG.CAMERA.BASE_ZOOM) || 1.0;
    this.targetZoom = baseZoom;
    this.currentZoom = baseZoom;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.customTarget = null;
    this.isCinematicLock = false;

    this.cam.setRoundPixels(false);
    this.cam.setZoom(baseZoom);
  }

  setCinematicFocus(targetX, targetY, zoom = (CONFIG.CAMERA_REVEAL_ZOOM || 2.1)) {
    this.isCinematicLock = true;
    this.customTarget = { x: targetX, y: targetY };
    this.targetZoom = zoom;
  }

  unlockCinematic() {
    this.isCinematicLock = false;
    this.customTarget = null;
    this.targetZoom = CONFIG.CAMERA_BASE_ZOOM || (CONFIG.CAMERA && CONFIG.CAMERA.BASE_ZOOM) || 1.0;
  }

  triggerShake(intensity = 0.015, durationMs = 350) {
    this.cam.shake(durationMs, intensity);
  }

  triggerImpulse(dx, dy) {
    this.cam.scrollX += dx;
    this.cam.scrollY += dy;
  }

  update(dt, hero, speedRatio = 0, isSwinging = false, bird = null) {
    const curZoom = Math.max(0.2, this.cam.zoom || 1.0);
    const canvasW = CONFIG.CANVAS_WIDTH || 1280;
    const canvasH = CONFIG.CANVAS_HEIGHT || 720;
    const lerpX = CONFIG.CAMERA_LERP_X || 0.08;
    const lerpY = CONFIG.CAMERA_LERP_Y || 0.07;
    const leadLimit = CONFIG.CAMERA_LEAD_X || 160;
    const baseZoom = CONFIG.CAMERA_BASE_ZOOM || (CONFIG.CAMERA && CONFIG.CAMERA.BASE_ZOOM) || 1.0;
    const fastZoom = CONFIG.CAMERA_FAST_ZOOM || (CONFIG.CAMERA && CONFIG.CAMERA.FAST_ZOOM) || 0.85;

    if (this.isCinematicLock && this.customTarget) {
      // Cinematic close-up framing
      const targetCamX = this.customTarget.x - (canvasW / 2) / curZoom;
      const targetCamY = this.customTarget.y - (canvasH / 2) / curZoom;

      this.cam.scrollX = Phaser.Math.Linear(this.cam.scrollX, targetCamX, 0.06);
      this.cam.scrollY = Phaser.Math.Linear(this.cam.scrollY, targetCamY, 0.06);

      this.currentZoom = Phaser.Math.Linear(this.currentZoom, this.targetZoom, 0.04);
      this.cam.setZoom(this.currentZoom);
      return;
    }

    // Dynamic Multi-Target Chase Framing
    const heroVx = (hero && typeof hero.vx === 'number') ? hero.vx : 0;
    const heroX = (hero && typeof hero.x === 'number') ? hero.x : 160;
    const heroY = (hero && typeof hero.y === 'number') ? hero.y : 420;

    let targetFocalX;
    let targetFocalY;

    if (bird && bird.x > heroX && bird.x - heroX < 900) {
      // Composition framing: Spider-Man -> space -> bird
      // Weighted towards the bird ahead so the player always sees their objective clearly
      targetFocalX = heroX * 0.42 + bird.x * 0.58 + 40;
      targetFocalY = heroY * 0.65 + bird.y * 0.35 + 20;
    } else {
      const leadX = (heroVx > 0) ? Math.min(heroVx * 0.28, leadLimit) : -60;
      targetFocalX = heroX + leadX;
      targetFocalY = heroY + 40;
    }

    const targetCamX = targetFocalX - (canvasW / 2) / curZoom;
    const targetCamY = targetFocalY - (canvasH / 2) / curZoom;

    // Smooth Lerp
    this.cam.scrollX = Phaser.Math.Linear(this.cam.scrollX, targetCamX, lerpX);
    this.cam.scrollY = Phaser.Math.Linear(this.cam.scrollY, targetCamY, lerpY);

    // Prevent camera from dipping too far below city street floor
    if (this.cam.scrollY > 380) {
      this.cam.scrollY = 380;
    }

    // Dynamic Zoom:
    // When high speed: widen view to see upcoming skyline (fastZoom)
    // When close to bird: tighten view for dramatic tension (1.06x)
    if (bird && bird.x - heroX < 280 && bird.x > heroX) {
      // Dramatic near-catch tension tightening
      this.targetZoom = 1.08;
    } else if (isSwinging || speedRatio > 0.6) {
      const zoomFactor = Math.min(speedRatio, 1.4);
      this.targetZoom = Phaser.Math.Linear(baseZoom, fastZoom, zoomFactor);
    } else {
      this.targetZoom = baseZoom;
    }

    this.currentZoom = Phaser.Math.Linear(this.currentZoom, this.targetZoom, 0.04);
    this.cam.setZoom(this.currentZoom);
  }
}

if (typeof window !== 'undefined') {
  window.CameraController = CameraController;
}
