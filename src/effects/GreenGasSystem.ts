import * as THREE from 'three';

export interface GasParticle {
  mesh: THREE.Mesh;
  basePos: THREE.Vector3;
  velocity: THREE.Vector3;
  rotSpeed: number;
  scale: number;
}

export class GreenGasSystem {
  public scene: THREE.Scene;
  public gasGroup: THREE.Group;
  public isActive: boolean = false;
  public isReversing: boolean = false;
  public density: number = 0.0; // 0.0 to 1.0

  // Meshes & particle layers
  private cloudClusters: THREE.Mesh[] = [];
  private floatingParticles: GasParticle[] = [];
  private mysticRunes: THREE.Mesh[] = [];
  private gasAmbientLight: THREE.AmbientLight;
  private gasPointLight: THREE.PointLight;

  // Fog reference
  private baseFogDensity: number = 0.035;
  private maxFogDensity: number = 0.22;

  // Callbacks
  private onMaxDensity: (() => void) | null = null;
  private onCleared: (() => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gasGroup = new THREE.Group();
    this.gasGroup.name = 'GreenGasSystem';
    this.gasGroup.visible = false;
    this.scene.add(this.gasGroup);

    // Green ambient & localized mystical lights
    this.gasAmbientLight = new THREE.AmbientLight(0x11ff44, 0.0);
    this.scene.add(this.gasAmbientLight);

    this.gasPointLight = new THREE.PointLight(0x22ff55, 0.0, 16);
    this.gasPointLight.position.set(0, 2.0, 1.0);
    this.scene.add(this.gasPointLight);

    this.buildGasMeshes();
  }

  private buildGasMeshes() {
    // 1. Swirling Volumetric Cloud Clusters (Layered soft gas clouds)
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x18cc48,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const clusterGeom = new THREE.DodecahedronGeometry(1.6, 1);

    // Spread across the battlefield depth planes
    for (let i = 0; i < 28; i++) {
      const cloud = new THREE.Mesh(clusterGeom, cloudMat.clone());
      const x = (Math.random() - 0.5) * 26;
      const y = 0.6 + Math.random() * 3.5;
      const z = -2.0 + Math.random() * 4.5;
      cloud.position.set(x, y, z);
      cloud.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      const s = 1.0 + Math.random() * 1.5;
      cloud.scale.set(s, s * 0.7, s);
      this.gasGroup.add(cloud);
      this.cloudClusters.push(cloud);
    }

    // 2. Floating Mystical Gas Particles (Rising & swirling embers)
    const particleGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x77ff99,
      transparent: true,
      opacity: 0.8
    });

    for (let k = 0; k < 60; k++) {
      const pMesh = new THREE.Mesh(particleGeom, particleMat);
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 24,
        0.2 + Math.random() * 4.0,
        -1.5 + Math.random() * 3.0
      );
      pMesh.position.copy(pos);
      this.gasGroup.add(pMesh);

      this.floatingParticles.push({
        mesh: pMesh,
        basePos: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0.4 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.4
        ),
        rotSpeed: (Math.random() - 0.5) * 3,
        scale: 0.8 + Math.random() * 0.8
      });
    }

    // 3. Mystical Runes & Sigils floating in the miasma
    const runeGeom = new THREE.RingGeometry(0.2, 0.35, 6);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x33ff66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });

    for (let r = 0; r < 8; r++) {
      const rune = new THREE.Mesh(runeGeom, runeMat.clone());
      rune.position.set(
        (r - 3.5) * 3.2,
        1.5 + Math.random() * 2.0,
        0.5 + (Math.random() - 0.5)
      );
      this.gasGroup.add(rune);
      this.mysticRunes.push(rune);
    }
  }

  // Start the spreading sequence originating from Doom
  public startSpread(originPos: THREE.Vector3, onMaxDensity: () => void) {
    this.isActive = true;
    this.isReversing = false;
    this.density = 0.0;
    this.onMaxDensity = onMaxDensity;
    this.gasGroup.visible = true;

    this.gasPointLight.position.copy(originPos).add(new THREE.Vector3(0, 1.5, 0));
  }

  // Animated clearing sequence when "SOLVE THE BUG" is clicked
  public solveBugClear(onCleared: () => void) {
    this.isReversing = true;
    this.onCleared = onCleared;
  }

  // Emergency safety fallback: instant full reset
  public forceReset() {
    this.isActive = false;
    this.isReversing = false;
    this.density = 0.0;
    this.gasGroup.visible = false;

    // Reset cloud opacities
    this.cloudClusters.forEach(c => {
      (c.material as THREE.MeshBasicMaterial).opacity = 0.0;
    });

    // Reset runes
    this.mysticRunes.forEach(r => {
      (r.material as THREE.MeshBasicMaterial).opacity = 0.0;
    });

    // Reset lights
    this.gasAmbientLight.intensity = 0.0;
    this.gasPointLight.intensity = 0.0;

    // Restore standard arena fog
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = this.baseFogDensity;
      this.scene.fog.color.setHex(0x080d1a);
    }
  }

  public update(delta: number) {
    if (!this.isActive) return;

    // 1. Density Progression
    if (!this.isReversing) {
      // Gradually spread gas from small cloud to full coverage (approx 4.5 seconds)
      if (this.density < 1.0) {
        this.density = Math.min(this.density + delta * 0.32, 1.0);
        if (this.density >= 1.0 && this.onMaxDensity) {
          const cb = this.onMaxDensity;
          this.onMaxDensity = null;
          cb();
        }
      }
    } else {
      // Reversing / collapsing gas effect smoothly (approx 1.8 seconds)
      if (this.density > 0.0) {
        this.density = Math.max(this.density - delta * 0.55, 0.0);
        if (this.density <= 0.0) {
          this.forceReset();
          if (this.onCleared) {
            const cb = this.onCleared;
            this.onCleared = null;
            cb();
          }
          return;
        }
      }
    }

    // 2. Update Fog & Environmental Lighting
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = THREE.MathUtils.lerp(
        this.baseFogDensity,
        this.maxFogDensity,
        this.density
      );

      // Shift fog color toward Latverian mystical emerald green
      const fogTargetColor = new THREE.Color(0x062810);
      const baseFogColor = new THREE.Color(0x080d1a);
      this.scene.fog.color.copy(baseFogColor).lerp(fogTargetColor, this.density * 0.9);
    }

    // Green ambient glow
    this.gasAmbientLight.intensity = this.density * 2.2;
    this.gasPointLight.intensity = this.density * 5.0;

    // 3. Animate Cloud Clusters
    const time = performance.now() * 0.001;
    this.cloudClusters.forEach((cloud, i) => {
      const mat = cloud.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(this.density * 0.82, 0.82);

      // Swirling rotation & organic breathing pulse
      cloud.rotation.z += (i % 2 === 0 ? 1 : -1) * delta * 0.35;
      cloud.rotation.y += delta * 0.2;
      const pulse = 1.0 + Math.sin(time * 1.5 + i) * 0.12;
      cloud.scale.set(cloud.scale.x, cloud.scale.y * pulse, cloud.scale.z);
    });

    // 4. Animate Floating Particles & Embers
    this.floatingParticles.forEach(p => {
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += p.rotSpeed * delta;
      p.mesh.rotation.y += p.rotSpeed * delta;

      // Wrap-around in arena bounds
      if (p.mesh.position.y > 4.5) {
        p.mesh.position.y = 0.2;
      }

      // If reversing, pull particles inward towards origin
      if (this.isReversing) {
        p.mesh.position.lerp(new THREE.Vector3(0, 1.5, 0), delta * 2.5);
      }
    });

    // 5. Animate Mystical Runes
    this.mysticRunes.forEach((rune, k) => {
      const rMat = rune.material as THREE.MeshBasicMaterial;
      rMat.opacity = this.density * 0.75;
      rune.rotation.z += (k % 2 === 0 ? 1 : -1) * delta * 1.2;
    });
  }
}
