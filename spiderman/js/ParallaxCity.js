/**
 * ParallaxCity - 10-Layer 2.5D New York Superhero Cityscape
 * Provides rich atmospheric depth, architectural silhouettes, lit windows,
 * animated aviation beacons, and rooftop landing colliders.
 */
class ParallaxCity {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this.rooftops = [];
    this.beacons = [];
    this.neonSigns = [];
    this.trafficLights = [];

    this.createSky();
    this.createDistantSkyline();
    this.createMidSkyline();
    this.createMainBuildings();
    this.createRooftopStructures();
    this.createForegroundStructures();
    this.createColliders();
  }

  createSky() {
    // Layer 0: High-Resolution Cinematic NYC Twilight Skyline
    if (this.scene.textures.exists('skyline_twilight')) {
      this.skylineBackdrop = this.scene.add.image(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'skyline_twilight')
        .setDepth(0)
        .setScrollFactor(0.04, 0.05)
        .setDisplaySize(CONFIG.CANVAS_WIDTH * 1.6, CONFIG.CANVAS_HEIGHT);
    } else {
      // Fallback Sky gradient & moon
      const skyGfx = this.scene.add.graphics().setDepth(0).setScrollFactor(0);
      skyGfx.fillGradientStyle(0x0a1024, 0x181032, 0x3d1448, 0x822a45, 1);
      skyGfx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      skyGfx.fillStyle(0xd5e2ff, 0.85);
      skyGfx.fillCircle(1050, 140, 32);
      skyGfx.fillStyle(0x7590d0, 0.15);
      skyGfx.fillCircle(1050, 140, 52);
    }

    // Atmospheric warm horizon fog & haze
    const hazeGfx = this.scene.add.graphics().setDepth(1).setScrollFactor(0);
    hazeGfx.fillGradientStyle(0x000000, 0x000000, 0x5a1836, 0x120820, 0.45);
    hazeGfx.fillRect(0, CONFIG.CANVAS_HEIGHT * 0.45, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT * 0.55);

    // Layer 2: Drifting clouds
    this.cloudsGfx = this.scene.add.graphics().setDepth(2);
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: (i * 550) - 400,
        y: 80 + (i % 4) * 45,
        w: 320 + (i % 3) * 120,
        h: 60 + (i % 2) * 25,
        speed: 0.12 + (i % 3) * 0.05
      });
    }
  }

  createDistantSkyline() {
    // Layer 3: Distant skyline silhouettes
    const distGfx = this.scene.add.graphics().setDepth(2).setScrollFactor(CONFIG.PARALLAX.DISTANT_SKYLINE, 0.1);
    distGfx.fillStyle(0x0e1424, 0.85);

    // Generate distant spires and towers
    for (let x = -200; x < 9000; x += 140) {
      const h = 260 + Math.sin(x * 0.005) * 120 + ((x * 13) % 110);
      distGfx.fillRect(x, CONFIG.CANVAS_HEIGHT - h, 130, h);

      // Spire pinnacle on some buildings
      if (x % 280 === 0) {
        distGfx.fillTriangle(
          x + 65, CONFIG.CANVAS_HEIGHT - h - 70,
          x + 50, CONFIG.CANVAS_HEIGHT - h,
          x + 80, CONFIG.CANVAS_HEIGHT - h
        );
      }
    }
  }

  createMidSkyline() {
    // Layer 4: Mid towers with lit windows and red radio beacons
    const midGfx = this.scene.add.graphics().setDepth(3).setScrollFactor(CONFIG.PARALLAX.MID_TOWERS, 0.2);

    // City tower silhouettes
    for (let x = -300; x < 9500; x += 190) {
      const w = 150 + ((x * 7) % 70);
      const h = 380 + Math.cos(x * 0.004) * 160 + ((x * 19) % 140);
      const y = CONFIG.CANVAS_HEIGHT - h + 60;

      // Dark blue-graphite tower body
      midGfx.fillStyle(0x131a2e, 0.95);
      midGfx.fillRect(x, y, w, h);

      // Windows pattern
      midGfx.fillStyle(0xffe699, 0.65);
      for (let wx = x + 16; wx < x + w - 16; wx += 24) {
        for (let wy = y + 30; wy < y + h - 40; wy += 32) {
          if (((wx * 3 + wy * 7) % 5) > 1) { // Random lit windows
            // Amber/cyan window light
            const isCyan = ((wx + wy) % 7 === 0);
            midGfx.fillStyle(isCyan ? 0x66ddff : 0xffcc66, 0.65);
            midGfx.fillRect(wx, wy, 8, 12);
          }
        }
      }

      // Radio antenna on top
      if (x % 380 === 0) {
        midGfx.lineStyle(2, 0x3a4868, 1);
        midGfx.lineBetween(x + w / 2, y, x + w / 2, y - 55);
        this.beacons.push({ x: x + w / 2, y: y - 55, factor: CONFIG.PARALLAX.MID_TOWERS });
      }
    }

    // Traffic light streaks at base
    for (let tx = 0; tx < 8000; tx += 600) {
      this.trafficLights.push({ x: tx, y: CONFIG.CANVAS_HEIGHT - 35, factor: CONFIG.PARALLAX.MID_TOWERS });
    }
  }

  createMainBuildings() {
    // Layer 5: Main play buildings (Sharp silhouettes, architectural cornices, billboards)
    const mainGfx = this.scene.add.graphics().setDepth(5).setScrollFactor(CONFIG.PARALLAX.MAIN_BUILDINGS, 0.4);

    for (let x = -200; x < 9500; x += 360) {
      const w = 290 + ((x * 3) % 90);
      const h = 480 + Math.sin(x * 0.003) * 140 + ((x * 11) % 90);
      const y = CONFIG.CANVAS_HEIGHT - h + 100;

      // Building facade
      mainGfx.fillStyle(0x182033, 1.0);
      mainGfx.fillRect(x, y, w, h);

      // Cornice trim
      mainGfx.fillStyle(0x2d3a58, 1.0);
      mainGfx.fillRect(x - 10, y, w + 20, 16);
      mainGfx.fillRect(x - 5, y + 20, w + 10, 8);

      // Windows
      for (let wx = x + 25; wx < x + w - 25; wx += 35) {
        for (let wy = y + 50; wy < y + h - 60; wy += 45) {
          if (((wx * 11 + wy * 13) % 7) > 2) {
            mainGfx.fillStyle(0xffe8a3, 0.75);
            mainGfx.fillRect(wx, wy, 14, 20);
          }
        }
      }
    }

    // Iconic Neon Billboards & Prop Signs
    this.createNeonSigns();
  }

  createNeonSigns() {
    // Neon signage positioned cleanly on upper building tiers
    const signs = [
      { text: 'DAILY BUGLE', propKey: 'prop_daily_bugle', x: 720, y: 180, color: 0xff3b30, w: 220, h: 55 },
      { text: 'OSCORP', x: 2320, y: 180, color: 0x30d158, w: 170, h: 40 },
      { text: 'STARK TECH', propKey: 'prop_stark_logo', x: 5240, y: 170, color: 0x0a84ff, w: 120, h: 120 }
    ];

    for (const sign of signs) {
      const container = this.scene.add.container(sign.x, sign.y).setDepth(6);
      container.setScrollFactor(CONFIG.PARALLAX.MAIN_BUILDINGS, 0.4);

      if (sign.propKey && this.scene.textures.exists(sign.propKey)) {
        const sprite = this.scene.add.image(0, 0, sign.propKey).setDisplaySize(sign.w, sign.h);
        container.add(sprite);
      } else {
        // Background plate
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0b101d, 0.9);
        bg.lineStyle(2, sign.color, 0.8);
        bg.fillRoundedRect(-sign.w / 2, -sign.h / 2, sign.w, sign.h, 6);
        bg.strokeRoundedRect(-sign.w / 2, -sign.h / 2, sign.w, sign.h, 6);
        container.add(bg);

        // Glowing text
        const txt = this.scene.add.text(0, 0, sign.text, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
          fontWeight: '900',
          color: Phaser.Display.Color.IntegerToColor(sign.color).rgba
        }).setOrigin(0.5);
        container.add(txt);
      }

      this.neonSigns.push({ container });
    }
  }

  createRooftopStructures() {
    // Layer 6: Rooftop tanks, fire escapes, antenna spires
    const roofGfx = this.scene.add.graphics().setDepth(7).setScrollFactor(CONFIG.PARALLAX.ROOFTOP_EQUIP, 0.6);

    for (let x = 200; x < 9000; x += 550) {
      const y = 380 + ((x * 7) % 90);

      // Water tower (using prop texture if loaded)
      if (this.scene.textures.exists('prop_water_tower')) {
        const wt = this.scene.add.image(x + 45, y - 40, 'prop_water_tower')
          .setDepth(7)
          .setScrollFactor(CONFIG.PARALLAX.ROOFTOP_EQUIP, 0.6)
          .setDisplaySize(90, 105);
      } else {
        roofGfx.fillStyle(0x38281d, 0.95);
        roofGfx.fillRect(x + 20, y - 60, 50, 45);
        roofGfx.fillStyle(0x241a12, 1.0);
        roofGfx.fillTriangle(x + 15, y - 60, x + 45, y - 85, x + 75, y - 60);
      }

      // AC ventilation unit
      if (this.scene.textures.exists('prop_hvac')) {
        this.scene.add.image(x + 140, y - 18, 'prop_hvac')
          .setDepth(7)
          .setScrollFactor(CONFIG.PARALLAX.ROOFTOP_EQUIP, 0.6)
          .setDisplaySize(65, 45);
      }
    }
  }

  createForegroundStructures() {
    // Layer 7: Clean atmospheric foreground without obstructive screen-crossing girders
    // Characters and flight paths remain completely visible and unobstructed
  }

  createColliders() {
    // Comprehensive rooftop platform course spanning the entire progression
    this.rooftops = [
      { id: 'start-rooftop', x: -100, y: 450, width: 620, height: 400, label: 'STARTING ROOFTOP' },
      { id: 'tribeca-lofts', x: 680, y: 520, width: 440, height: 350, label: 'TRIBECA LOFTS' },
      { id: 'midtown-roof', x: 1300, y: 480, width: 460, height: 350, label: 'MIDTOWN TOWER' },
      { id: 'baxter-balcony', x: 1950, y: 530, width: 420, height: 300, label: 'BAXTER PLAZA' },
      { id: 'oscorp-roof', x: 2550, y: 470, width: 480, height: 350, label: 'OSCORP TOWER ROOF' },
      { id: 'chelsea-lofts', x: 3250, y: 510, width: 440, height: 350, label: 'CHELSEA WAREHOUSE' },
      { id: 'stark-helipad', x: 3950, y: 450, width: 520, height: 350, label: 'STARK TOWER HELIPAD' },
      { id: 'theater-roof', x: 4700, y: 500, width: 460, height: 350, label: 'BROADWAY THEATER' },
      { id: 'herald-square', x: 5400, y: 470, width: 480, height: 350, label: 'HERALD SQUARE' },
      { id: 'recovery-perch', x: 6350, y: 440, width: 480, height: 400, isRecoveryPlatform: true, label: 'EMERGENCY FIRE ESCAPE' },
      { id: 'broadway-tower', x: 7000, y: 480, width: 460, height: 350, label: 'BROADWAY TOWER' },
      { id: 'oscorp-summit', x: 7650, y: 410, width: 720, height: 440, isSummit: true, label: 'OSCORP SUMMIT HELIPAD' }
    ];

    // Render physical rooftops
    this.platGfx = this.scene.add.graphics().setDepth(8);
    this.renderRooftops();

    // Dedicated graphic layer for the dynamic recovery platform
    this.recPlatformGfx = this.scene.add.graphics().setDepth(9);
  }

  renderRooftops() {
    this.platGfx.clear();
    for (const roof of this.rooftops) {
      // Concrete roof surface
      this.platGfx.fillStyle(0x1a2336, 1.0);
      this.platGfx.fillRect(roof.x, roof.y, roof.width, roof.height);

      // Ledge lip
      this.platGfx.fillStyle(0x354460, 1.0);
      this.platGfx.fillRect(roof.x - 5, roof.y, roof.width + 10, 14);

      if (roof.isRecoveryPlatform) {
        this.platGfx.lineStyle(3, 0xffaa00, 0.9);
        this.platGfx.strokeRect(roof.x + 10, roof.y - 32, roof.width - 20, 32);
        for (let rx = roof.x + 20; rx < roof.x + roof.width - 20; rx += 25) {
          this.platGfx.lineBetween(rx, roof.y - 32, rx, roof.y);
        }
      }

      if (roof.isSummit) {
        // High-tech illuminated Oscorp Summit Helipad
        const cx = roof.x + roof.width / 2;
        const cy = roof.y + 40;

        // Helipad yellow circle ring
        this.platGfx.lineStyle(4, 0xffd700, 0.9);
        this.platGfx.strokeCircle(cx, cy, 38);
        this.platGfx.lineStyle(2, 0x00f0ff, 0.7);
        this.platGfx.strokeCircle(cx, cy, 48);

        // Helipad 'H' letter
        this.platGfx.fillStyle(0xffd700, 0.95);
        this.platGfx.fillRect(cx - 18, cy - 20, 6, 40);
        this.platGfx.fillRect(cx + 12, cy - 20, 6, 40);
        this.platGfx.fillRect(cx - 14, cy - 4, 28, 8);

        // Cyan floodlights on perimeter
        this.platGfx.fillStyle(0x00f0ff, 1.0);
        this.platGfx.fillCircle(roof.x + 24, roof.y, 6);
        this.platGfx.fillCircle(roof.x + roof.width - 24, roof.y, 6);
      }
    }
  }

  positionRecoveryPlatform(x, y) {
    let rec = this.rooftops.find(r => r.isRecoveryPlatform);
    if (!rec) {
      rec = {
        id: 'recovery-perch',
        x: x,
        y: y,
        width: 480,
        height: 400,
        isRecoveryPlatform: true,
        label: 'EMERGENCY FIRE ESCAPE'
      };
      this.rooftops.push(rec);
    } else {
      rec.x = x;
      rec.y = y;
    }

    if (this.recPlatformGfx) {
      this.recPlatformGfx.clear();
      // Draw prominent illuminated emergency fire escape
      this.recPlatformGfx.fillStyle(0x1a1208, 0.98);
      this.recPlatformGfx.fillRect(rec.x, rec.y, rec.width, rec.height);

      // Hazard stripes on landing surface
      for (let sx = rec.x; sx < rec.x + rec.width; sx += 32) {
        this.recPlatformGfx.fillStyle(0xffaa00, 0.85);
        this.recPlatformGfx.fillRect(sx, rec.y, 16, 8);
      }

      // High-contrast industrial safety railing
      this.recPlatformGfx.lineStyle(3, 0xffaa00, 1.0);
      this.recPlatformGfx.strokeRect(rec.x + 6, rec.y - 36, rec.width - 12, 36);
      for (let rx = rec.x + 18; rx < rec.x + rec.width - 18; rx += 22) {
        this.recPlatformGfx.lineBetween(rx, rec.y - 36, rx, rec.y);
      }

      // Strobe warning beacons
      this.recPlatformGfx.fillStyle(0xff2a45, 1);
      this.recPlatformGfx.fillCircle(rec.x + 14, rec.y - 42, 7);
      this.recPlatformGfx.fillCircle(rec.x + rec.width - 14, rec.y - 42, 7);
      this.recPlatformGfx.fillStyle(0xffffff, 0.9);
      this.recPlatformGfx.fillCircle(rec.x + 14, rec.y - 42, 3);
      this.recPlatformGfx.fillCircle(rec.x + rec.width - 14, rec.y - 42, 3);
    }
  }

  update(cameraX, cameraY) {
    // Animate drifting clouds
    this.cloudsGfx.clear();
    const time = this.scene.time.now * 0.001;

    this.cloudsGfx.fillStyle(0x16223d, 0.22);
    const wrapWidth = 8000;
    for (const cloud of this.clouds) {
      const rawX = cloud.x + time * cloud.speed * 40 - cameraX * CONFIG.PARALLAX.CLOUDS;
      const cx = ((rawX % wrapWidth + wrapWidth) % wrapWidth) - 400;
      this.cloudsGfx.fillRoundedRect(cx, cloud.y, cloud.w, cloud.h, 24);
    }

    // Flicker neon signs subtly
    for (const sign of this.neonSigns) {
      if (sign.container && Math.random() < 0.02) {
        sign.container.setAlpha(0.75 + Math.random() * 0.25);
      }
    }
  }

  // Check if player stands on any rooftop
  checkRooftopCollision(px, py, prevY) {
    for (const roof of this.rooftops) {
      if (px >= roof.x - 15 && px <= roof.x + roof.width + 15) {
        // Did player fall onto roof surface this frame?
        if (prevY <= roof.y + 10 && py >= roof.y - 4) {
          return roof;
        }
      }
    }
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.ParallaxCity = ParallaxCity;
}
