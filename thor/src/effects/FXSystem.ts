import * as THREE from 'three';

export interface PlasmaProjectile {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ImpactParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class FXSystem {
  public scene: THREE.Scene;
  public plasmaProjectiles: PlasmaProjectile[] = [];
  public particles: ImpactParticle[] = [];
  public activeBeams: THREE.Mesh[] = [];
  public activeLightningBolts: THREE.Line[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // --- LIGHTNING BOLT ---
  public spawnLightningBolt(startPos: THREE.Vector3, endPos: THREE.Vector3, color = 0x66ddff): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 12;
    const diff = endPos.clone().sub(startPos);

    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const pt = startPos.clone().add(diff.clone().multiplyScalar(frac));
      if (i > 0 && i < segments) {
        // Random jagged offset
        pt.x += (Math.random() - 0.5) * 0.4;
        pt.z += (Math.random() - 0.5) * 0.4;
      }
      points.push(pt);
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      linewidth: 3,
      transparent: true,
      opacity: 1.0
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
    this.activeLightningBolts.push(line);

    // Auto-cleanup after brief flash
    setTimeout(() => {
      this.scene.remove(line);
      const idx = this.activeLightningBolts.indexOf(line);
      if (idx !== -1) this.activeLightningBolts.splice(idx, 1);
      geom.dispose();
      mat.dispose();
    }, 180);

    return line;
  }

  // --- DOOM PLASMA BLAST ---
  public spawnDoomPlasmaBlast(startPos: THREE.Vector3, direction: THREE.Vector3): PlasmaProjectile {
    const geom = new THREE.SphereGeometry(0.18, 12, 10);
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(startPos);

    // Dynamic light
    const light = new THREE.PointLight(0x33ff66, 3, 5);
    mesh.add(light);

    // Outer plasma glow shell
    const outerGeom = new THREE.SphereGeometry(0.26, 8, 8);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x22ee44,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    mesh.add(new THREE.Mesh(outerGeom, outerMat));

    this.scene.add(mesh);

    const projectile: PlasmaProjectile = {
      mesh,
      light,
      velocity: direction.clone().normalize().multiplyScalar(14),
      life: 0,
      maxLife: 2.5
    };

    this.plasmaProjectiles.push(projectile);
    return projectile;
  }

  // --- HIT SPARK BURST ---
  public spawnHitSparks(pos: THREE.Vector3, color = 0xffcc44, count = 16) {
    const sparkGeom = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const sparkMat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeom, sparkMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 4
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }
  }

  // --- GROUND SHOCKWAVE RING ---
  public spawnGroundShockwave(pos: THREE.Vector3, color = 0x55ccff) {
    const ringGeom = new THREE.RingGeometry(0.2, 0.4, 24);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(pos);
    ring.position.y += 0.03;
    this.scene.add(ring);

    const startTime = performance.now();
    const duration = 400;

    const animateRing = () => {
      const elapsed = performance.now() - startTime;
      const p = elapsed / duration;
      if (p < 1.0) {
        const s = 1.0 + p * 6.0;
        ring.scale.set(s, 1, s);
        ringMat.opacity = 0.9 * (1.0 - p);
        requestAnimationFrame(animateRing);
      } else {
        this.scene.remove(ring);
        ringGeom.dispose();
        ringMat.dispose();
      }
    };
    animateRing();
  }

  // --- SUSTAINED COSMIC BEAM ---
  public spawnCosmicBeam(startPos: THREE.Vector3, endPos: THREE.Vector3, color = 0x44ff77, duration = 0.8) {
    const dist = startPos.distanceTo(endPos);
    const beamGeom = new THREE.CylinderGeometry(0.25, 0.25, dist, 12);
    beamGeom.rotateX(Math.PI / 2);
    beamGeom.translate(0, 0, dist / 2);

    const beamMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.copy(startPos);
    beam.lookAt(endPos);
    this.scene.add(beam);

    setTimeout(() => {
      this.scene.remove(beam);
      beamGeom.dispose();
      beamMat.dispose();
    }, duration * 1000);
  }

  public update(delta: number) {
    // 1. Update Projectiles
    for (let i = this.plasmaProjectiles.length - 1; i >= 0; i--) {
      const p = this.plasmaProjectiles[i];
      p.life += delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.plasmaProjectiles.splice(i, 1);
      }
    }

    // 2. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life += delta;
      part.velocity.y -= 18 * delta; // Gravity
      part.mesh.position.addScaledVector(part.velocity, delta);

      const prog = part.life / part.maxLife;
      part.mesh.scale.setScalar(1 - prog);

      if (part.life >= part.maxLife) {
        this.scene.remove(part.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
