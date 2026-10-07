import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

export class ThorModel {
  public rig: CharacterRig;
  public stormbreaker: THREE.Group;
  public capeMesh: THREE.Group;
  public lightningAura: THREE.Group;
  public runesEmissive: THREE.MeshStandardMaterial[] = [];

  // Facial animation elements
  public leftUpperEyelid!: THREE.Mesh;
  public rightUpperEyelid!: THREE.Mesh;
  public leftEyePupil!: THREE.Mesh;
  public rightEyePupil!: THREE.Mesh;
  public browRidge!: THREE.Group;
  public jawGroup!: THREE.Group;
  public beardMesh!: THREE.Group;

  // Facial micro-animation timers
  private blinkTimer: number = 0;
  private nextBlinkInterval: number = 3.5;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;

  constructor() {
    this.rig = new CharacterRig('Thor');
    this.stormbreaker = this.createStormbreaker();
    this.rig.joints.weaponSocket.add(this.stormbreaker);
    this.capeMesh = this.createCape();
    this.lightningAura = this.createLightningAura();
    this.rig.root.add(this.lightningAura);

    this.buildCharacterMesh();
  }

  // Create PBR materials — vivid cinematic Marvel Avengers: Doomsday aesthetic
  private createMaterials() {
    // 1. Asgardian Midnight Royal Blue Battleplate
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x142e58,
      metalness: 0.88,
      roughness: 0.22,
      envMapIntensity: 2.2
    });

    // 2. Burnished Asgardian Gold Filigree & Armor Trim
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5c242,
      emissive: 0x664400,
      emissiveIntensity: 0.35,
      metalness: 0.94,
      roughness: 0.18,
      envMapIntensity: 2.4
    });

    // 3. Glowing Norse Rune Discs & Lightning Conduits
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x90f0ff,
      emissive: 0x22ccee,
      emissiveIntensity: 3.2,
      metalness: 0.3,
      roughness: 0.12
    });
    this.runesEmissive.push(runeMat);

    // 4. Heroic Asgardian Skin — warm flesh tones, chiseled contours
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdf9e78,
      roughness: 0.52,
      metalness: 0.04
    });

    // 5. Lip Material — natural Asgardian tone
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xc47768,
      roughness: 0.6,
      metalness: 0.02
    });

    // 6. Sculpted Warrior Hair & Beard — rich auburn with golden highlights
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x7a3d16,
      roughness: 0.78,
      metalness: 0.08
    });

    const hairHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x9a5824,
      roughness: 0.72,
      metalness: 0.1
    });

    // 7. Dark Leather War Straps & Harness
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x2d1a0e,
      roughness: 0.82,
      metalness: 0.12
    });

    // 8. Silver-Dark Chainmail Undersuit
    const chainmailMat = new THREE.MeshStandardMaterial({
      color: 0x2a3848,
      metalness: 0.8,
      roughness: 0.38
    });

    // 9. Vivid Crimson Velvet Cape
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xb50e1e,
      emissive: 0x330005,
      emissiveIntensity: 0.22,
      roughness: 0.72,
      metalness: 0.06,
      side: THREE.DoubleSide
    });

    // 10. Eye Materials: Sclera, Iris, Pupil
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xf4f7fa,
      roughness: 0.15,
      metalness: 0.0
    });

    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x48b8ff,
      emissive: 0x0088dd,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.2
    });

    const pupilMat = new THREE.MeshBasicMaterial({
      color: 0x050c18
    });

    return {
      armorMat,
      goldMat,
      runeMat,
      skinMat,
      lipMat,
      hairMat,
      hairHighlightMat,
      leatherMat,
      chainmailMat,
      capeMat,
      scleraMat,
      irisMat,
      pupilMat
    };
  }

  private buildCharacterMesh() {
    const mats = this.createMaterials();
    const { joints } = this.rig;

    // Scale rig for an imposing, cinematic superhero physique (Chris Hemsworth proportions)
    this.rig.root.scale.set(1.22, 1.22, 1.22);

    // ==========================================
    // 1. CHEST & TORSO (AVENGERS: DOOMSDAY ARMOR)
    // ==========================================
    const chestGroup = new THREE.Group();

    // Muscular V-taper breastplate
    const chestGeom = new THREE.CylinderGeometry(0.40, 0.28, 0.44, 16);
    const chestMesh = new THREE.Mesh(chestGeom, mats.armorMat);
    chestMesh.castShadow = true;
    chestGroup.add(chestMesh);

    // Anatomical pectoral plates
    const pecGeom = new THREE.BoxGeometry(0.29, 0.18, 0.16);
    const leftPec = new THREE.Mesh(pecGeom, mats.armorMat);
    leftPec.position.set(0.15, 0.09, 0.17);
    leftPec.rotation.y = 0.2;
    leftPec.rotation.z = -0.05;

    const rightPec = new THREE.Mesh(pecGeom, mats.armorMat);
    rightPec.position.set(-0.15, 0.09, 0.17);
    rightPec.rotation.y = -0.2;
    rightPec.rotation.z = 0.05;
    chestGroup.add(leftPec, rightPec);

    // Golden pectoral accent rims
    const pecTrimGeom = new THREE.BoxGeometry(0.28, 0.02, 0.04);
    const leftPecTrim = new THREE.Mesh(pecTrimGeom, mats.goldMat);
    leftPecTrim.position.set(0.15, 0.18, 0.25);
    leftPecTrim.rotation.y = 0.2;
    const rightPecTrim = new THREE.Mesh(pecTrimGeom, mats.goldMat);
    rightPecTrim.position.set(-0.15, 0.18, 0.25);
    rightPecTrim.rotation.y = -0.2;
    chestGroup.add(leftPecTrim, rightPecTrim);

    // 6 Iconic Asgardian Power Discs with Tiered Golden Rings & Inlaid Norse Runes
    const discBaseGeom = new THREE.CylinderGeometry(0.088, 0.088, 0.038, 20);
    discBaseGeom.rotateX(Math.PI / 2);
    const discInnerGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.045, 18);
    discInnerGeom.rotateX(Math.PI / 2);
    const discRimGeom = new THREE.TorusGeometry(0.092, 0.016, 12, 24);

    const discPositions = [
      [0.16, 0.11, 0.25],
      [-0.16, 0.11, 0.25],
      [0.15, -0.05, 0.24],
      [-0.15, -0.05, 0.24],
      [0.11, -0.19, 0.22],
      [-0.11, -0.19, 0.22]
    ];

    discPositions.forEach(([x, y, z]) => {
      const discGroup = new THREE.Group();
      discGroup.position.set(x, y, z);

      const baseDisc = new THREE.Mesh(discBaseGeom, mats.goldMat);
      const innerCore = new THREE.Mesh(discInnerGeom, mats.runeMat);
      const rim = new THREE.Mesh(discRimGeom, mats.goldMat);

      // Carved Futhark-style rune cross on each disc
      const runeCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), mats.goldMat);
      runeCrossH.position.z = 0.024;
      const runeCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.01), mats.goldMat);
      runeCrossV.position.z = 0.024;

      discGroup.add(baseDisc, innerCore, rim, runeCrossH, runeCrossV);
      chestGroup.add(discGroup);
    });

    // Chest blue lightning illumination
    const chestGlow = new THREE.PointLight(0x44ccff, 2.8, 2.5);
    chestGlow.position.set(0, 0, 0.32);
    chestGroup.add(chestGlow);

    // Asgardian Royal Gorget Collar & Eagle Trim
    const collarGeom = new THREE.TorusGeometry(0.24, 0.032, 10, 24, Math.PI);
    const collar = new THREE.Mesh(collarGeom, mats.goldMat);
    collar.position.set(0, 0.22, 0.05);
    collar.rotation.x = Math.PI / 2;
    chestGroup.add(collar);

    joints.chest.add(chestGroup);

    // ==========================================
    // 2. SPINE / ABDOMEN
    // ==========================================
    const spineGroup = new THREE.Group();
    const absGeom = new THREE.CylinderGeometry(0.25, 0.23, 0.26, 12);
    const absMesh = new THREE.Mesh(absGeom, mats.chainmailMat);
    absMesh.castShadow = true;
    spineGroup.add(absMesh);

    // Articulated Midnight-Blue & Gold Abdominal Segment Plates
    for (let i = 0; i < 3; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.045), mats.armorMat);
      plate.position.set(0, 0.07 - i * 0.065, 0.13);
      const plateTrim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.05), mats.goldMat);
      plateTrim.position.set(0, 0.07 - i * 0.065 + 0.02, 0.132);
      spineGroup.add(plate, plateTrim);
    }
    joints.spine.add(spineGroup);

    // ==========================================
    // 3. HIPS & ASGARDIAN WAR BELT
    // ==========================================
    const hipsGroup = new THREE.Group();
    const hipsGeom = new THREE.CylinderGeometry(0.24, 0.21, 0.2, 12);
    const hipsMesh = new THREE.Mesh(hipsGeom, mats.chainmailMat);
    hipsMesh.castShadow = true;
    hipsGroup.add(hipsMesh);

    // Heavy War Belt
    const beltGeom = new THREE.CylinderGeometry(0.26, 0.25, 0.1, 14);
    const belt = new THREE.Mesh(beltGeom, mats.leatherMat);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.06), mats.goldMat);
    buckle.position.set(0, 0, 0.25);
    // Asgardian knotwork medallion on buckle
    const buckleKnot = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), mats.runeMat);
    buckleKnot.position.set(0, 0, 0.285);
    belt.add(buckle, buckleKnot);
    hipsGroup.add(belt);

    // Side Leather War Tassets with Gold Trim
    [-0.23, 0.23].forEach(x => {
      const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.03), mats.leatherMat);
      tasset.position.set(x, -0.06, 0);
      const tassetTrim = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.035), mats.goldMat);
      tassetTrim.position.set(0, -0.1, 0);
      tasset.add(tassetTrim);
      hipsGroup.add(tasset);
    });

    joints.hips.add(hipsGroup);

    // ==========================================
    // 4. HIGH QUALITY CINEMATIC THOR HEAD & FACE
    // ==========================================
    const headGroup = new THREE.Group();
    headGroup.name = 'Thor_Head';

    // A. Sculpted Cranium (anatomical superhero head shape)
    const craniumGeom = new THREE.SphereGeometry(0.138, 24, 20);
    craniumGeom.scale(0.96, 1.16, 1.06);
    const cranium = new THREE.Mesh(craniumGeom, mats.skinMat);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // B. Chiseled Zygomatic Cheekbones
    [-0.105, 0.105].forEach(x => {
      const cheekGeom = new THREE.BoxGeometry(0.045, 0.07, 0.07);
      const cheek = new THREE.Mesh(cheekGeom, mats.skinMat);
      cheek.position.set(x, 0.01, 0.10);
      cheek.rotation.y = x > 0 ? -0.35 : 0.35;
      cheek.rotation.z = x > 0 ? -0.2 : 0.2;
      headGroup.add(cheek);
    });

    // C. Strong Masculine Jaw & Chin Group
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.065, 0.06);

    // Jawbone rami
    const jawGeom = new THREE.BoxGeometry(0.145, 0.08, 0.11);
    const jawMesh = new THREE.Mesh(jawGeom, mats.skinMat);
    jawGroup.add(jawMesh);

    // Chiseled square chin with subtle cleft
    const chinGeom = new THREE.BoxGeometry(0.095, 0.07, 0.09);
    const chin = new THREE.Mesh(chinGeom, mats.skinMat);
    chin.position.set(0, -0.02, 0.045);
    jawGroup.add(chin);

    const chinCleft = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.02), mats.hairMat);
    chinCleft.position.set(0, -0.02, 0.092);
    jawGroup.add(chinCleft);

    headGroup.add(jawGroup);
    this.jawGroup = jawGroup;

    // D. Realistic Warrior Nose (bridge, tip, nostrils, philtrum)
    const noseGroup = new THREE.Group();
    noseGroup.position.set(0, 0.02, 0.14);

    // Nasal bridge
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.06, 0.03), mats.skinMat);
    noseBridge.rotation.x = -0.15;

    // Sculpted tip
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), mats.skinMat);
    noseTip.position.set(0, -0.025, 0.02);

    // Left and right nostrils
    [-0.018, 0.018].forEach(nx => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), mats.skinMat);
      nostril.position.set(nx, -0.028, 0.012);
      noseGroup.add(nostril);
    });

    noseGroup.add(noseBridge, noseTip);
    headGroup.add(noseGroup);

    // E. Natural Lips & Philtrum
    const upperLipGeom = new THREE.BoxGeometry(0.068, 0.018, 0.022);
    const upperLip = new THREE.Mesh(upperLipGeom, mats.lipMat);
    upperLip.position.set(0, -0.038, 0.138);

    const lowerLipGeom = new THREE.BoxGeometry(0.062, 0.022, 0.026);
    const lowerLip = new THREE.Mesh(lowerLipGeom, mats.lipMat);
    lowerLip.position.set(0, -0.058, 0.136);
    headGroup.add(upperLip, lowerLip);

    // F. Realistic Anatomical Eyes (Sclera, Blue Iris, Pupil, Blinking Eyelids)
    const eyeGeom = new THREE.SphereGeometry(0.024, 14, 12);
    const irisGeom = new THREE.CircleGeometry(0.014, 16);
    const pupilGeom = new THREE.CircleGeometry(0.007, 12);
    const eyelidGeom = new THREE.SphereGeometry(0.026, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);

    // Left Eye
    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(0.048, 0.045, 0.125);

    const leftSclera = new THREE.Mesh(eyeGeom, mats.scleraMat);
    const leftIris = new THREE.Mesh(irisGeom, mats.irisMat);
    leftIris.position.set(0, 0, 0.023);
    const leftPupil = new THREE.Mesh(pupilGeom, mats.pupilMat);
    leftPupil.position.set(0, 0, 0.024);
    this.leftEyePupil = leftPupil;

    // Specular eye glint
    const eyeGlint = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eyeGlint.position.set(0.004, 0.005, 0.0245);

    // Articulated upper eyelid for blinking
    const leftUpperLid = new THREE.Mesh(eyelidGeom, mats.skinMat);
    leftUpperLid.position.set(0, 0.006, 0);
    leftUpperLid.rotation.x = -Math.PI * 0.42; // Open state
    this.leftUpperEyelid = leftUpperLid;

    leftEyeGroup.add(leftSclera, leftIris, leftPupil, eyeGlint, leftUpperLid);
    headGroup.add(leftEyeGroup);

    // Right Eye
    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(-0.048, 0.045, 0.125);

    const rightSclera = new THREE.Mesh(eyeGeom, mats.scleraMat);
    const rightIris = new THREE.Mesh(irisGeom, mats.irisMat);
    rightIris.position.set(0, 0, 0.023);
    const rightPupil = new THREE.Mesh(pupilGeom, mats.pupilMat);
    rightPupil.position.set(0, 0, 0.024);
    this.rightEyePupil = rightPupil;

    const rightEyeGlint = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    rightEyeGlint.position.set(0.004, 0.005, 0.0245);

    const rightUpperLid = new THREE.Mesh(eyelidGeom, mats.skinMat);
    rightUpperLid.position.set(0, 0.006, 0);
    rightUpperLid.rotation.x = -Math.PI * 0.42; // Open state
    this.rightUpperEyelid = rightUpperLid;

    rightEyeGroup.add(rightSclera, rightIris, rightPupil, rightEyeGlint, rightUpperLid);
    headGroup.add(rightEyeGroup);

    // G. Expressive Brow Ridge & Sculpted Eyebrows
    const browGroup = new THREE.Group();
    browGroup.position.set(0, 0.076, 0.125);

    const browBone = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.05), mats.skinMat);

    // Left and right textured eyebrows (with individual hair tilt)
    [-0.05, 0.05].forEach(bx => {
      const browHair = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, 0.02), mats.hairMat);
      browHair.position.set(bx, 0.002, 0.022);
      browHair.rotation.z = bx > 0 ? -0.12 : 0.12;
      browGroup.add(browHair);
    });

    browGroup.add(browBone);
    headGroup.add(browGroup);
    this.browRidge = browGroup;

    // H. Detailed Layered Asgardian Warrior Beard & Mustache
    const beardGroup = new THREE.Group();

    // 1. Full groomed jawline beard fringe
    const jawBeard = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.10, 0.10), mats.hairMat);
    jawBeard.position.set(0, -0.09, 0.075);
    beardGroup.add(jawBeard);

    // 2. Sculpted chin goatee with Asgardian braid/taper
    const chinGoateeGeom = new THREE.ConeGeometry(0.045, 0.12, 6);
    const chinGoatee = new THREE.Mesh(chinGoateeGeom, mats.hairMat);
    chinGoatee.position.set(0, -0.145, 0.10);
    chinGoatee.rotation.x = 0.2;
    // Golden Asgardian beard clasp ring
    const goateeRing = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 12), mats.goldMat);
    goateeRing.position.set(0, -0.13, 0.10);
    goateeRing.rotation.x = Math.PI / 2;
    beardGroup.add(chinGoatee, goateeRing);

    // 3. Layered warrior mustache with curved tips
    const stacheGeom = new THREE.BoxGeometry(0.11, 0.032, 0.038);
    const mustache = new THREE.Mesh(stacheGeom, mats.hairMat);
    mustache.position.set(0, -0.028, 0.146);

    [-0.05, 0.05].forEach(mx => {
      const stacheTip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 5), mats.hairMat);
      stacheTip.position.set(mx, -0.038, 0.142);
      stacheTip.rotation.z = mx > 0 ? -1.1 : 1.1;
      beardGroup.add(stacheTip);
    });
    beardGroup.add(mustache);

    // 4. Sideburns connecting seamlessly to hairline
    [-0.115, 0.115].forEach(sx => {
      const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.05), mats.hairMat);
      sideburn.position.set(sx, -0.02, 0.06);
      beardGroup.add(sideburn);
    });

    headGroup.add(beardGroup);
    this.beardMesh = beardGroup;

    // I. Short Warrior Hair (Detailed Swept Waves & Highlights)
    const hairGroup = new THREE.Group();

    // Base volumetric cranial hair
    const hairBaseGeom = new THREE.SphereGeometry(0.146, 16, 14);
    hairBaseGeom.scale(1.02, 0.95, 1.08);
    const hairBase = new THREE.Mesh(hairBaseGeom, mats.hairMat);
    hairBase.position.set(0, 0.055, -0.015);
    hairGroup.add(hairBase);

    // Swept-back textured locks with golden-brown highlights
    for (let row = 0; row < 3; row++) {
      for (let col = -3; col <= 3; col++) {
        const lockGeom = new THREE.ConeGeometry(0.028, 0.12 + row * 0.02, 5);
        const lockMat = Math.abs(col) % 2 === 0 ? mats.hairHighlightMat : mats.hairMat;
        const lock = new THREE.Mesh(lockGeom, lockMat);
        lock.position.set(col * 0.028, 0.14 + row * 0.015, 0.07 - row * 0.06);
        lock.rotation.x = -Math.PI * 0.35 - row * 0.15;
        lock.rotation.z = col * -0.08;
        hairGroup.add(lock);
      }
    }
    headGroup.add(hairGroup);

    // J. Iconic Asgardian Winged Temple Circlet
    const circletGeom = new THREE.TorusGeometry(0.148, 0.016, 8, 24);
    const circlet = new THREE.Mesh(circletGeom, mats.goldMat);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.set(0, 0.065, 0);
    headGroup.add(circlet);

    // Silver-white feathered temple wings flaring backward
    [-1, 1].forEach(side => {
      const wingGroup = new THREE.Group();
      wingGroup.position.set(side * 0.145, 0.085, -0.01);
      wingGroup.rotation.y = side * 0.32;
      wingGroup.rotation.z = side * -0.25;

      for (let f = 0; f < 4; f++) {
        const feather = new THREE.Mesh(
          new THREE.ConeGeometry(0.024, 0.18 + f * 0.04, 5),
          mats.runeMat
        );
        feather.position.set(side * (f * 0.022), f * 0.055, -f * 0.038);
        feather.rotation.z = side * (-0.45 - f * 0.12);
        feather.rotation.x = -0.35;
        wingGroup.add(feather);
      }
      headGroup.add(wingGroup);
    });

    joints.head.add(headGroup);

    // Defined Muscular Neck
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.19, 12), mats.skinMat);
    neckMesh.castShadow = true;
    joints.neck.add(neckMesh);

    // ==========================================
    // 5. SHOULDERS, ARMS & GAUNTLETS
    // ==========================================
    // Layered Asgardian Midnight-Blue Pauldrons with Gold Crests
    const pauldronGeom = new THREE.SphereGeometry(0.15, 12, 10);
    pauldronGeom.scale(1.22, 0.85, 1.15);

    const leftPaul = new THREE.Mesh(pauldronGeom, mats.armorMat);
    leftPaul.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 6, 16), mats.goldMat));
    leftPaul.castShadow = true;
    joints.leftShoulder.add(leftPaul);

    const rightPaul = new THREE.Mesh(pauldronGeom, mats.armorMat);
    rightPaul.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 6, 16), mats.goldMat));
    rightPaul.castShadow = true;
    joints.rightShoulder.add(rightPaul);

    // Muscular Biceps (Godly vascular definition)
    const bicepGeom = new THREE.CylinderGeometry(0.098, 0.088, 0.32, 12);
    const leftArmMesh = new THREE.Mesh(bicepGeom, mats.skinMat);
    leftArmMesh.castShadow = true;
    joints.leftUpperArm.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(bicepGeom, mats.skinMat);
    rightArmMesh.castShadow = true;
    joints.rightUpperArm.add(rightArmMesh);

    // Forearms with Asgardian Dark Steel & Gold Bracers
    const bracerGeom = new THREE.CylinderGeometry(0.09, 0.076, 0.3, 12);
    const leftForearmMesh = new THREE.Mesh(bracerGeom, mats.armorMat);
    leftForearmMesh.add(new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.016, 6, 14), mats.goldMat));
    leftForearmMesh.castShadow = true;
    joints.leftForearm.add(leftForearmMesh);

    const rightForearmMesh = new THREE.Mesh(bracerGeom, mats.armorMat);
    rightForearmMesh.add(new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.016, 6, 14), mats.goldMat));
    rightForearmMesh.castShadow = true;
    joints.rightForearm.add(rightForearmMesh);

    // Armored Gauntlet Hands
    const handGeom = new THREE.BoxGeometry(0.095, 0.125, 0.065);
    const leftHandMesh = new THREE.Mesh(handGeom, mats.leatherMat);
    leftHandMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.065, 0.035), mats.armorMat));
    joints.leftHand.add(leftHandMesh);

    const rightHandMesh = new THREE.Mesh(handGeom, mats.leatherMat);
    rightHandMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.065, 0.035), mats.armorMat));
    joints.rightHand.add(rightHandMesh);

    // ==========================================
    // 6. LEGS, GREAVES & BATTLE BOOTS
    // ==========================================
    const thighGeom = new THREE.CylinderGeometry(0.125, 0.105, 0.44, 12);
    const leftThighMesh = new THREE.Mesh(thighGeom, mats.chainmailMat);
    leftThighMesh.castShadow = true;
    joints.leftThigh.add(leftThighMesh);

    const rightThighMesh = new THREE.Mesh(thighGeom, mats.chainmailMat);
    rightThighMesh.castShadow = true;
    joints.rightThigh.add(rightThighMesh);

    // Shins & Layered Golden Kneecaps
    const shinGeom = new THREE.CylinderGeometry(0.105, 0.085, 0.44, 12);
    const kneeGeom = new THREE.SphereGeometry(0.07, 10, 8);

    const leftShinMesh = new THREE.Mesh(shinGeom, mats.armorMat);
    const leftKnee = new THREE.Mesh(kneeGeom, mats.goldMat);
    leftKnee.position.set(0, 0.19, 0.085);
    leftShinMesh.add(leftKnee);
    leftShinMesh.castShadow = true;
    joints.leftShin.add(leftShinMesh);

    const rightShinMesh = new THREE.Mesh(shinGeom, mats.armorMat);
    const rightKnee = new THREE.Mesh(kneeGeom, mats.goldMat);
    rightKnee.position.set(0, 0.19, 0.085);
    rightShinMesh.add(rightKnee);
    rightShinMesh.castShadow = true;
    joints.rightShin.add(rightShinMesh);

    // Heavy Armored Battle Boots
    const bootGeom = new THREE.BoxGeometry(0.125, 0.145, 0.25);
    const leftBoot = new THREE.Mesh(bootGeom, mats.leatherMat);
    leftBoot.add(new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.055, 0.23), mats.armorMat));
    leftBoot.castShadow = true;
    joints.leftFoot.add(leftBoot);

    const rightBoot = new THREE.Mesh(bootGeom, mats.leatherMat);
    rightBoot.add(new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.055, 0.23), mats.armorMat));
    rightBoot.castShadow = true;
    joints.rightFoot.add(rightBoot);
  }

  // ==========================================
  // STORMBREAKER WEAPON (AUTHENTIC AVENGERS MODEL)
  // ==========================================
  private createStormbreaker(): THREE.Group {
    const stormbreaker = new THREE.Group();
    stormbreaker.name = 'Stormbreaker';

    const uruBladeMat = new THREE.MeshStandardMaterial({
      color: 0xa8bccf,
      metalness: 0.96,
      roughness: 0.16,
      envMapIntensity: 2.2
    });

    const hammerHeadMat = new THREE.MeshStandardMaterial({
      color: 0x6e7884,
      metalness: 0.90,
      roughness: 0.32
    });

    const woodHandleMat = new THREE.MeshStandardMaterial({
      color: 0x422d1b,
      roughness: 0.88,
      metalness: 0.06
    });

    const electricRuneMat = new THREE.MeshStandardMaterial({
      color: 0x88eeff,
      emissive: 0x00b4ff,
      emissiveIntensity: 3.5
    });
    this.runesEmissive.push(electricRuneMat);

    // 1. Groot Branch Handle (intertwined organic haft)
    const handleGeom = new THREE.CylinderGeometry(0.032, 0.04, 1.4, 10);
    const handle = new THREE.Mesh(handleGeom, woodHandleMat);
    handle.position.set(0, 0.22, 0);
    handle.castShadow = true;
    stormbreaker.add(handle);

    // Living Bark Tendrils wrapping handle
    for (let i = 0; i < 5; i++) {
      const vineGeom = new THREE.TorusGeometry(0.042, 0.013, 6, 14);
      const vine = new THREE.Mesh(vineGeom, woodHandleMat);
      vine.position.set(0, -0.22 + i * 0.25, 0);
      vine.rotation.x = Math.PI / 4 + i * 0.2;
      stormbreaker.add(vine);
    }

    // 2. Central Forged Uru Collar
    const collarGeom = new THREE.CylinderGeometry(0.075, 0.075, 0.2, 12);
    const collar = new THREE.Mesh(collarGeom, uruBladeMat);
    collar.position.set(0, 0.76, 0);
    stormbreaker.add(collar);

    // 3. Razor-Sharp Curved Uru Axe Blade (Left Side)
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.16);
    bladeShape.lineTo(0.38, -0.34);
    bladeShape.quadraticCurveTo(0.60, 0.0, 0.42, 0.36);
    bladeShape.lineTo(0, 0.20);
    bladeShape.closePath();

    const extrudeSettings = {
      depth: 0.045,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.022,
      bevelThickness: 0.018
    };

    const axeGeom = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    axeGeom.center();
    const axeBlade = new THREE.Mesh(axeGeom, uruBladeMat);
    axeBlade.position.set(0.26, 0.76, 0);
    axeBlade.castShadow = true;
    stormbreaker.add(axeBlade);

    // Inlaid Glowing Blue Lightning Rune Line
    const runeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.022, 0.065), electricRuneMat);
    runeStrip.position.set(0.30, 0.76, 0);
    stormbreaker.add(runeStrip);

    // 4. Heavy Blunt Hammer Sledge (Right Side)
    const hammerGeom = new THREE.BoxGeometry(0.28, 0.24, 0.18);
    const hammer = new THREE.Mesh(hammerGeom, hammerHeadMat);
    hammer.position.set(-0.20, 0.76, 0);
    hammer.castShadow = true;
    stormbreaker.add(hammer);

    // Hammer Impact Face Bevel
    const hammerFace = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.20), uruBladeMat);
    hammerFace.position.set(-0.33, 0.76, 0);
    stormbreaker.add(hammerFace);

    // Orientation in Thor's hand
    stormbreaker.rotation.set(0, 0, -Math.PI / 8);
    stormbreaker.position.set(0, -0.26, 0);

    return stormbreaker;
  }

  // ==========================================
  // ROYAL CRIMSON CAPE WITH MULTI-SEGMENT CLOTH
  // ==========================================
  private createCape(): THREE.Group {
    const capeGroup = new THREE.Group();
    capeGroup.name = 'Thor_Cape';

    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xaa0e1c,
      roughness: 0.82,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    const goldBorderMat = new THREE.MeshStandardMaterial({
      color: 0xf5c242,
      metalness: 0.85,
      roughness: 0.25
    });

    const widths = [0.46, 0.55, 0.64, 0.72];
    const segmentHeight = 0.38;

    for (let i = 0; i < 4; i++) {
      const segGeom = new THREE.PlaneGeometry(widths[i], segmentHeight, 6, 2);
      segGeom.translate(0, -segmentHeight / 2, 0);
      const segMesh = new THREE.Mesh(segGeom, capeMat);
      segMesh.castShadow = true;

      // Golden bottom border
      const trimGeom = new THREE.BoxGeometry(widths[i], 0.022, 0.015);
      const trim = new THREE.Mesh(trimGeom, goldBorderMat);
      trim.position.set(0, -segmentHeight, 0.01);
      segMesh.add(trim);

      this.rig.joints.capeBones[i].add(segMesh);
    }

    return capeGroup;
  }

  // ==========================================
  // LIGHTNING AURA SYSTEM
  // ==========================================
  private createLightningAura(): THREE.Group {
    const aura = new THREE.Group();
    aura.visible = false;
    aura.name = 'Thor_LightningAura';

    const lightningMat = new THREE.MeshBasicMaterial({
      color: 0x88eeff,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 6; i++) {
      const boltGeom = new THREE.IcosahedronGeometry(0.35 + i * 0.16, 1);
      const bolt = new THREE.Mesh(boltGeom, lightningMat);
      bolt.position.set(0, 1.15, 0);
      aura.add(bolt);
    }

    return aura;
  }

  public setLightningAura(active: boolean, intensity = 1.0) {
    this.lightningAura.visible = active;
    this.runesEmissive.forEach(mat => {
      mat.emissiveIntensity = active ? 4.0 * intensity : 1.4;
    });
  }

  // Facial and Micro-Animation Updates
  public updateFacialAnimation(delta: number, combatExpression: boolean = false) {
    // 1. Natural periodic eye blinking
    this.blinkTimer += delta;
    if (this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkProgress = 0;
      this.nextBlinkInterval = 2.8 + Math.random() * 2.5;
    }

    if (this.isBlinking) {
      this.blinkProgress += delta * 12.0; // Fast realistic 0.15s blink
      const lidAngle = -Math.PI * 0.42 + Math.sin(this.blinkProgress * Math.PI) * 0.85;

      if (this.leftUpperEyelid && this.rightUpperEyelid) {
        this.leftUpperEyelid.rotation.x = lidAngle;
        this.rightUpperEyelid.rotation.x = lidAngle;
      }

      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        if (this.leftUpperEyelid && this.rightUpperEyelid) {
          this.leftUpperEyelid.rotation.x = -Math.PI * 0.42;
          this.rightUpperEyelid.rotation.x = -Math.PI * 0.42;
        }
      }
    }

    // 2. Dynamic Eyebrow expression (combat furrowed vs determined heroic)
    if (this.browRidge) {
      const targetPitch = combatExpression ? 0.08 : 0.0;
      this.browRidge.rotation.x = THREE.MathUtils.lerp(this.browRidge.rotation.x, targetPitch, delta * 6);
    }

    // 3. Subtle breathing & jaw pulse
    if (this.jawGroup) {
      const breath = Math.sin(performance.now() * 0.003) * 0.012;
      this.jawGroup.position.y = -0.065 + breath;
    }
  }

  public update(delta: number, worldVelocity: THREE.Vector3) {
    this.rig.update(delta, worldVelocity);
    this.updateFacialAnimation(delta, Math.abs(worldVelocity.x) > 0.5);

    // Animate lightning aura if active
    if (this.lightningAura.visible) {
      this.lightningAura.children.forEach((child, i) => {
        child.rotation.x += (i + 1) * delta * 4;
        child.rotation.y += (i + 2) * delta * 3;
        const scale = 1 + Math.sin(performance.now() * 0.01 + i) * 0.22;
        child.scale.set(scale, scale, scale);
      });
    }
  }
}
