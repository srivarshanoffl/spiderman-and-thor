/**
 * AnchorSystem - Manages valid city web attachment points and targeting indicators.
 * Provides clear visual feedback, agency choices, and malfunction progression.
 */
class AnchorSystem {
  constructor(scene) {
    this.scene = scene;
    this.anchors = [];
    this.activeTarget = null;
    this.reticleGfx = scene.add.graphics().setDepth(15);
    this.initAnchors();
  }

  initAnchors() {
    // Curated high-impact anchors across the city swing sequence
    this.anchors = [
      { id: 'anchor-01', x: 650, y: 190, name: 'DAILY BUGLE TOWER CORNICE', stage: 1, type: 'cornice', label: 'WEB [SPACE]' },
      { id: 'anchor-01b', x: 1050, y: 210, name: 'TRIBECA TOWER ARCH', stage: 1, type: 'cornice', label: 'ANCHOR' },
      { id: 'anchor-02', x: 1450, y: 160, name: 'BAXTER PLAZA SPIRE', stage: 2, type: 'spire', label: 'ANCHOR' },
      { id: 'anchor-02b', x: 1880, y: 190, name: 'PARK AVENUE CABLE', stage: 2, type: 'cable', label: 'ANCHOR' },
      // Choice stage (Stage 3): Two valid branching anchors!
      { id: 'anchor-03-left', x: 2320, y: 140, name: 'OSCORP TOWER (HIGH ARC)', stage: 3, branch: 'left', type: 'billboard', label: 'HIGH ROUTE' },
      { id: 'anchor-03-right', x: 2380, y: 250, name: 'METRO CRANE BOOM (FAST SPEED)', stage: 3, branch: 'right', type: 'crane', label: 'LOW DIVE' },
      { id: 'anchor-03b', x: 2800, y: 180, name: 'CHELSEA WATER TOWER', stage: 3, type: 'cornice', label: 'ANCHOR' },
      // Speed swings
      { id: 'anchor-04', x: 3250, y: 180, name: 'CHRYSLER CORNICE', stage: 4, type: 'cornice', label: 'ANCHOR' },
      { id: 'anchor-04b', x: 3700, y: 170, name: 'MIDTOWN OVERPASS', stage: 4, type: 'cable', label: 'ANCHOR' },
      { id: 'anchor-05', x: 4180, y: 150, name: 'AVENUE SKYBRIDGE CABLE', stage: 5, type: 'cable', label: 'ANCHOR' },
      { id: 'anchor-05b', x: 4680, y: 180, name: 'BROADWAY THEATER MARQUEE', stage: 5, type: 'cornice', label: 'ANCHOR' },
      // Long Hero Swing: Epic skyscraper pinnacle
      { id: 'anchor-06-hero', x: 5200, y: 110, name: 'STARK METROPOLIS PINNACLE', stage: 6, isHero: true, type: 'pinnacle', label: 'HERO SWING' },
      { id: 'anchor-06b', x: 5750, y: 170, name: 'HERALD SQUARE BEACON', stage: 6, type: 'spire', label: 'ANCHOR' },
      // Malfunction target (when player tries to fire after hero swing)
      { id: 'anchor-07-misfire', x: 6250, y: 200, name: 'CENTRAL SPIRE', stage: 7, isMisfireTrigger: true, type: 'spire', label: 'TARGET' },
      // Emergency recovery perch (fire escape & balcony)
      { id: 'anchor-emergency', x: 6450, y: 430, name: 'EMERGENCY FIRE ESCAPE PERCH', stage: 8, isRecovery: true, type: 'fire_escape', label: 'GRAB [SPACE]' },
      // Post-repair victory anchors (Stage 9)
      { id: 'anchor-post-01', x: 6900, y: 170, name: 'BROADWAY MONOLITH SPIRE', stage: 9, type: 'spire', label: 'WEB [SPACE]' },
      { id: 'anchor-post-02', x: 7350, y: 150, name: 'METROPOLIS TRANSMITTER BEACON', stage: 9, type: 'cable', label: 'WEB [SPACE]' },
      { id: 'anchor-post-03', x: 7800, y: 130, name: 'OSCORP SUMMIT PINNACLE', stage: 9, type: 'pinnacle', label: 'SUMMIT' }
    ];
  }

  positionEmergencyAnchor(x, y) {
    let emergency = this.anchors.find(a => a.isRecovery);
    if (!emergency) {
      emergency = {
        id: 'anchor-emergency',
        x: x,
        y: y,
        name: 'EMERGENCY FIRE ESCAPE PERCH',
        stage: 8,
        isRecovery: true,
        type: 'fire_escape',
        label: 'GRAB [SPACE/CLICK]'
      };
      this.anchors.push(emergency);
    } else {
      emergency.x = x;
      emergency.y = y;
    }
  }

  findBestAnchor(playerX, playerY, vx, vy) {
    const stage = Math.max(1, Math.min(9, Math.floor(playerX / 750) + 1));
    return this.getBestAnchor(playerX, playerY, null, null, stage, false);
  }

  // Find best anchor ahead of player in range
  getBestAnchor(playerX, playerY, pointerWorldX, pointerWorldY, currentStage, isMalfunction) {
    if (isMalfunction) {
      // Return emergency recovery anchor if in recovery stage
      const emergency = this.anchors.find(a => a.isRecovery);
      if (emergency) {
        return emergency;
      }
      return null;
    }

    let candidates = this.anchors.filter(a => !a.isRecovery);
    const stage = (typeof currentStage === 'number' && !isNaN(currentStage)) 
      ? currentStage 
      : Math.max(1, Math.min(9, Math.floor(playerX / 750) + 1));

    // Prefer anchors that are ahead or near the current stage
    let bestAnchor = null;
    let minScore = Infinity;

    for (const anchor of candidates) {
      const dx = anchor.x - playerX;
      const dy = anchor.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Relaxed range check so player never feels dead drops
      if (dist > CONFIG.WEB_RANGE * 1.4) continue;
      if (dx < -100) continue; // Behind player

      let mouseBias = 0;
      if (typeof pointerWorldX === 'number' && typeof pointerWorldY === 'number') {
        const mouseDist = Phaser.Math.Distance.Between(pointerWorldX, pointerWorldY, anchor.x, anchor.y);
        mouseBias = mouseDist * 0.25;
      }

      // Prioritize anchors matching current or upcoming progression
      const stageDiff = Math.abs(anchor.stage - stage);
      const score = dist + mouseBias + stageDiff * 100;

      if (score < minScore) {
        minScore = score;
        bestAnchor = anchor;
      }
    }

    // Safety fallback: if no anchor in range, find the nearest forward anchor within reasonable range
    if (!bestAnchor) {
      let forwardCandidates = candidates.filter(a => a.x > playerX - 50);
      if (forwardCandidates.length > 0) {
        forwardCandidates.sort((a, b) => {
          return Phaser.Math.Distance.Between(playerX, playerY, a.x, a.y) - Phaser.Math.Distance.Between(playerX, playerY, b.x, b.y);
        });
        const nearest = forwardCandidates[0];
        const dist = Phaser.Math.Distance.Between(playerX, playerY, nearest.x, nearest.y);
        if (dist <= CONFIG.WEB_RANGE * 1.8) {
          bestAnchor = nearest;
        }
      }
    }

    return bestAnchor;
  }

  update(playerX, playerY, arg3, pointerWorldY, currentStage, isMalfunction) {
    if (arg3 && typeof arg3 === 'object' && typeof arg3.id === 'string') {
      // Direct anchor object passed
      this.activeTarget = arg3;
    } else {
      this.activeTarget = this.getBestAnchor(playerX, playerY, arg3, pointerWorldY, currentStage, isMalfunction);
    }
    this.renderReticles(playerX, playerY, isMalfunction);
  }

  renderReticles(playerX, playerY, isMalfunction) {
    this.reticleGfx.clear();
    const time = this.scene.time.now * 0.004;

    for (const anchor of this.anchors) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, anchor.x, anchor.y);
      if (dist > CONFIG.WEB_RANGE * 1.25) continue;

      const isTarget = (this.activeTarget && this.activeTarget.id === anchor.id);

      // Draw anchor marker
      if (isTarget) {
        // Active locked diamond reticle
        const color = isMalfunction ? CONFIG.COLORS.WARN_RED : CONFIG.COLORS.TECH_CYAN;
        const pulse = Math.sin(time * 3) * 3;
        const size = 16 + pulse;

        // Outer rotating brackets
        this.reticleGfx.lineStyle(2, color, 0.9);
        this.reticleGfx.strokeRect(anchor.x - size, anchor.y - size, size * 2, size * 2);

        // Center dot
        this.reticleGfx.fillStyle(color, 1.0);
        this.reticleGfx.fillCircle(anchor.x, anchor.y, 4);

        // Subtle range guide line from player to anchor
        this.reticleGfx.lineStyle(1, color, 0.25);
        this.reticleGfx.lineBetween(playerX, playerY, anchor.x, anchor.y);
      } else {
        // Passive subtle anchor dot
        this.reticleGfx.fillStyle(0x7090b0, 0.45);
        this.reticleGfx.fillCircle(anchor.x, anchor.y, 3);
        this.reticleGfx.lineStyle(1, 0x406080, 0.3);
        this.reticleGfx.strokeCircle(anchor.x, anchor.y, 9);
      }
    }
  }

  destroy() {
    if (this.reticleGfx) {
      this.reticleGfx.destroy();
    }
  }
}

if (typeof window !== 'undefined') {
  window.AnchorSystem = AnchorSystem;
}
