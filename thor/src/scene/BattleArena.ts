import * as THREE from 'three';

export class BattleArena {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public groundMesh: THREE.Mesh;

  // Camera shake state
  private shakeIntensity: number = 0;
  private shakeDecay: number = 5;
  private baseCameraPos: THREE.Vector3 = new THREE.Vector3(0, 2.2, 7.5);
  private cameraLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1.4, 0);

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060912);
    this.scene.fog = new THREE.FogExp2(0x080d1a, 0.035);

    // Camera setup for 2.5D side presentation
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(this.cameraLookTarget);

    // WebGL Renderer with PBR support & shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    container.appendChild(this.renderer.domElement);

    this.groundMesh = this.buildEnvironment();
    this.setupLighting();

    window.addEventListener('resize', () => this.onResize(container));
  }

  private setupLighting() {
    // 1. Hemisphere light (sky vs ground fill)
    const hemiLight = new THREE.HemisphereLight(0xe8f0fe, 0x1b2838, 2.0);
    this.scene.add(hemiLight);

    // 2. Front Camera Key Light (illuminating characters from gameplay perspective)
    const frontKey = new THREE.DirectionalLight(0xffffff, 2.6);
    frontKey.position.set(0, 5, 9);
    this.scene.add(frontKey);

    // 3. Main Overhead Directional Sunlight with Shadows
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    dirLight.position.set(4, 12, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // 4. Thor Asgardian Blue Rim Light (Left)
    const thorRim = new THREE.DirectionalLight(0x55bbee, 2.2);
    thorRim.position.set(-9, 4, -2);
    this.scene.add(thorRim);

    // 5. Doom Latverian Emerald Rim Light (Right)
    const doomRim = new THREE.DirectionalLight(0x44ff77, 2.2);
    doomRim.position.set(9, 4, -2);
    this.scene.add(doomRim);
  }

  private buildEnvironment(): THREE.Mesh {
    // --- GROUND ARENA ---
    const groundGeom = new THREE.BoxGeometry(40, 1.0, 14);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a212d,
      roughness: 0.85,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.set(0, -0.5, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Fractured rune grid & Asgardian stone slabs
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x242d3d,
      roughness: 0.7,
      metalness: 0.3
    });
    for (let x = -16; x <= 16; x += 3.2) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 10), slabMat);
      slab.position.set(x, 0.02, 0);
      slab.receiveShadow = true;
      this.scene.add(slab);
    }

    // Glowing fissure lines in arena floor
    const fissureMat = new THREE.MeshBasicMaterial({ color: 0x33aaff });
    const fissure = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.06), fissureMat);
    fissure.rotation.x = -Math.PI / 2;
    fissure.position.set(0, 0.05, 0.4);
    this.scene.add(fissure);

    // --- BACKGROUND RUINS & PILLARS ---
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1f2735,
      roughness: 0.8,
      metalness: 0.1
    });

    // Colossal Asgardian / Latverian broken pillars in background
    for (let i = -4; i <= 4; i++) {
      if (Math.abs(i) < 1) continue;
      const height = 6 + Math.random() * 4;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, height, 8), pillarMat);
      pillar.position.set(i * 3.8, height / 2 - 0.5, -4.5 + (Math.random() - 0.5));
      pillar.rotation.z = (Math.random() - 0.5) * 0.15;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    }

    // Floating celestial / Latverian monolith fragments
    const monolithGeom = new THREE.DodecahedronGeometry(1.2);
    for (let k = 0; k < 6; k++) {
      const monolith = new THREE.Mesh(monolithGeom, pillarMat);
      monolith.position.set((k - 2.5) * 5.5, 5 + Math.random() * 3, -7);
      monolith.rotation.set(Math.random(), Math.random(), 0);
      this.scene.add(monolith);
    }

    // --- COSMIC MULTIVERSAL FRACTURE IN THE SKY (ACT 3 CLIFFHANGER) ---
    this.multiversalFracture = new THREE.Group();
    this.multiversalFracture.position.set(0, 8.2, -7.0);
    this.multiversalFracture.visible = false;

    // Glowing cosmic rift lines
    const fractureMat = new THREE.MeshBasicMaterial({
      color: 0xff33cc,
      wireframe: true,
      transparent: true,
      opacity: 0.95
    });

    const riftCore = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.12, 8, 30, Math.PI * 1.5), fractureMat);
    riftCore.rotation.z = Math.PI * 0.25;
    this.multiversalFracture.add(riftCore);

    // Branching cracks
    for (let b = 0; b < 6; b++) {
      const branchGeom = new THREE.PlaneGeometry(0.08, 2.5 + b * 0.4);
      const branchMat = new THREE.MeshBasicMaterial({
        color: b % 2 === 0 ? 0x9933ff : 0x00f0ff,
        side: THREE.DoubleSide
      });
      const branch = new THREE.Mesh(branchGeom, branchMat);
      branch.rotation.z = (b / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      this.multiversalFracture.add(branch);
    }

    // Cosmic fracture point light
    const riftLight = new THREE.PointLight(0xff33cc, 4.0, 20);
    this.multiversalFracture.add(riftLight);
    this.scene.add(this.multiversalFracture);

    return ground;
  }

  public multiversalFracture!: THREE.Group;

  public setFractureActive(active: boolean) {
    if (this.multiversalFracture) {
      this.multiversalFracture.visible = active;
    }
  }

  public triggerScreenShake(intensity = 0.4) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public customCameraPos: THREE.Vector3 | null = null;
  public customLookTarget: THREE.Vector3 | null = null;
  public cameraLerpSpeed: number = 3.5;

  public setCameraOverride(pos: THREE.Vector3 | null, target: THREE.Vector3 | null, lerpSpeed = 3.5) {
    this.customCameraPos = pos;
    this.customLookTarget = target;
    this.cameraLerpSpeed = lerpSpeed;
  }

  public updateCamera(thorPos: THREE.Vector3, doomPos: THREE.Vector3, delta: number, isCinematic = false) {
    if (this.customCameraPos && this.customLookTarget) {
      // Custom cinematic or close-up inspection camera
      this.baseCameraPos.lerp(this.customCameraPos, delta * this.cameraLerpSpeed);
      this.cameraLookTarget.lerp(this.customLookTarget, delta * (this.cameraLerpSpeed + 1));
    } else {
      // 2.5D Camera Tracking midpoint between characters
      const midX = (thorPos.x + doomPos.x) / 2;
      const dist = Math.abs(thorPos.x - doomPos.x);

      // Dynamic framing distance
      const targetZ = isCinematic ? 4.8 : THREE.MathUtils.clamp(6.2 + dist * 0.35, 6.0, 11.0);
      const targetY = isCinematic ? 1.6 : 2.1 + (dist * 0.08);

      this.baseCameraPos.x = THREE.MathUtils.lerp(this.baseCameraPos.x, midX, delta * 3.5);
      this.baseCameraPos.y = THREE.MathUtils.lerp(this.baseCameraPos.y, targetY, delta * 3.5);
      this.baseCameraPos.z = THREE.MathUtils.lerp(this.baseCameraPos.z, targetZ, delta * 3.5);

      this.cameraLookTarget.x = THREE.MathUtils.lerp(this.cameraLookTarget.x, midX, delta * 4);
      this.cameraLookTarget.y = THREE.MathUtils.lerp(this.cameraLookTarget.y, 1.4, delta * 4);
      this.cameraLookTarget.z = THREE.MathUtils.lerp(this.cameraLookTarget.z, 0, delta * 4);
    }

    // Apply Screen Shake
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.set(
        this.baseCameraPos.x + sx,
        this.baseCameraPos.y + sy,
        this.baseCameraPos.z
      );
      this.shakeIntensity -= this.shakeDecay * delta;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;
    } else {
      this.camera.position.copy(this.baseCameraPos);
    }

    // Animate multiversal fracture if active
    if (this.multiversalFracture && this.multiversalFracture.visible) {
      this.multiversalFracture.rotation.z += delta * 0.35;
    }

    this.camera.lookAt(this.cameraLookTarget);
  }

  private onResize(container: HTMLElement) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
