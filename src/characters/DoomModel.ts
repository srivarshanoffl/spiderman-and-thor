import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

export class DoomModel {
  public rig: CharacterRig;
  public cloakMesh: THREE.Group;
  public hoodMesh: THREE.Group;
  public forceField: THREE.Mesh;
  public mysticGlyphs: THREE.Group;
  public repulsorGlows: THREE.MeshStandardMaterial[] = [];

  // Face / Mask elements
  public leftEyeSensor!: THREE.Mesh;
  public rightEyeSensor!: THREE.Mesh;
  public maskBrow!: THREE.Mesh;
  public chestCoreGlow!: THREE.PointLight;

  // Eye tracking & pulse timers
  private eyePulseTimer: number = 0;

  constructor() {
    this.rig = new CharacterRig('Doom');
    this.cloakMesh = this.createCloak();
    this.hoodMesh = new THREE.Group();
    this.forceField = this.createForceField();
    this.mysticGlyphs = this.createMysticGlyphs();

    this.rig.root.add(this.forceField);
    this.rig.root.add(this.mysticGlyphs);

    this.buildCharacterMesh();
  }

  private createMaterials() {
    // 1. Latverian Cold Forged Titanium Armor — brilliant specular reflections
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xb2c2d4,
      metalness: 0.98,
      roughness: 0.14,
      envMapIntensity: 2.6
    });

    // 2. Dark Latverian Steel Under-Armor & Frame
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x161c28,
      metalness: 0.94,
      roughness: 0.32
    });

    // 3. Regal Latverian Emerald Velvet Cloak & Hood
    const emeraldCloakMat = new THREE.MeshStandardMaterial({
      color: 0x186b32,
      emissive: 0x072b14,
      emissiveIntensity: 0.45,
      roughness: 0.75,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    // 4. Burnished Gold Medallions & Chain Clasp
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf0c842,
      emissive: 0x886010,
      emissiveIntensity: 0.35,
      metalness: 0.96,
      roughness: 0.16,
      envMapIntensity: 2.2
    });

    // 5. Intense Emerald Technomagic Plasma
    const plasmaMat = new THREE.MeshStandardMaterial({
      color: 0x44ff77,
      emissive: 0x22ff55,
      emissiveIntensity: 4.5,
      metalness: 0.15,
      roughness: 0.05
    });
    this.repulsorGlows.push(plasmaMat);

    // 6. Glowing Green Sensor Slits for Mask Eyes
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x66ff99
    });

    // 7. Rivet & Brass Stud Material
    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0x8898a8,
      metalness: 0.92,
      roughness: 0.25
    });

    return {
      titaniumMat,
      darkSteelMat,
      emeraldCloakMat,
      goldMat,
      plasmaMat,
      eyeMat,
      rivetMat
    };
  }

  private buildCharacterMesh() {
    const mats = this.createMaterials();
    const { joints } = this.rig;

    // Imposing, intimidating Doctor Doom stature
    this.rig.root.scale.set(1.24, 1.24, 1.24);

    // ==========================================
    // 1. CHEST & TORSO (HEAVY LATVERIAN BATTLEPLATE)
    // ==========================================
    const chestGroup = new THREE.Group();

    // Main contoured titanium breastplate
    const breastplateGeom = new THREE.CylinderGeometry(0.38, 0.28, 0.44, 14);
    const breastplate = new THREE.Mesh(breastplateGeom, mats.titaniumMat);
    breastplate.castShadow = true;
    chestGroup.add(breastplate);

    // Lateral rib plates & center Latverian sternum ribbing
    const centerRib = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.38, 0.06), mats.darkSteelMat);
    centerRib.position.set(0, 0, 0.28);
    chestGroup.add(centerRib);

    // Pectoral titanium armor shields
    [-0.14, 0.14].forEach(px => {
      const pecPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), mats.titaniumMat);
      pecPlate.position.set(px, 0.08, 0.24);
      pecPlate.rotation.y = px > 0 ? 0.22 : -0.22;
      chestGroup.add(pecPlate);
    });

    // Emerald Technomagic Chest Core / Latverian Arc Emitter
    const coreRim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 20), mats.goldMat);
    coreRim.position.set(0, 0.02, 0.30);
    const coreLens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), mats.plasmaMat);
    coreLens.position.set(0, 0.02, 0.31);
    chestGroup.add(coreRim, coreLens);

    const chestGlow = new THREE.PointLight(0x22ff55, 3.8, 3.0);
    chestGlow.position.set(0, 0.02, 0.36);
    chestGroup.add(chestGlow);
    this.chestCoreGlow = chestGlow;

    // Gold Cloak Medallions (Twin Latverian Lion Clasps)
    const medallionGeom = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16);
    medallionGeom.rotateX(Math.PI / 2);

    [-0.20, 0.20].forEach(mx => {
      const med = new THREE.Mesh(medallionGeom, mats.goldMat);
      med.position.set(mx, 0.16, 0.24);
      // Lion emblem ring
      const innerEmblem = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 12), mats.darkSteelMat);
      innerEmblem.position.set(0, 0, 0.02);
      med.add(innerEmblem);
      chestGroup.add(med);
    });

    // Connecting golden chain across chest
    const chainGeom = new THREE.TorusGeometry(0.20, 0.02, 8, 20, Math.PI);
    const chain = new THREE.Mesh(chainGeom, mats.goldMat);
    chain.position.set(0, 0.16, 0.22);
    chain.rotation.x = Math.PI / 2;
    chestGroup.add(chain);

    joints.chest.add(chestGroup);

    // ==========================================
    // 2. ABDOMEN & ARTICULATED STEEL PLATES
    // ==========================================
    const spineGroup = new THREE.Group();
    const spineBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.25, 12), mats.darkSteelMat);
    spineBase.castShadow = true;
    spineGroup.add(spineBase);

    for (let i = 0; i < 3; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.045), mats.titaniumMat);
      plate.position.set(0, 0.07 - i * 0.065, 0.13);
      spineGroup.add(plate);
    }
    joints.spine.add(spineGroup);

    // ==========================================
    // 3. HIPS, FAULDS & WAR BELT
    // ==========================================
    const hipsGroup = new THREE.Group();
    const hipGeom = new THREE.CylinderGeometry(0.24, 0.22, 0.2, 12);
    const hipMesh = new THREE.Mesh(hipGeom, mats.darkSteelMat);
    hipMesh.castShadow = true;
    hipsGroup.add(hipMesh);

    // Emerald tunic skirt / fauld hanging between legs
    const fauldGeom = new THREE.BoxGeometry(0.24, 0.30, 0.035);
    const fauld = new THREE.Mesh(fauldGeom, mats.emeraldCloakMat);
    fauld.position.set(0, -0.11, 0.13);
    fauld.castShadow = true;
    // Gold hem on fauld
    const fauldHem = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.04), mats.goldMat);
    fauldHem.position.set(0, -0.14, 0.005);
    fauld.add(fauldHem);
    hipsGroup.add(fauld);

    // Dark steel war belt with gold Latverian techno-buckle
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.25, 0.08, 14), mats.darkSteelMat);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), mats.goldMat);
    buckle.position.set(0, 0, 0.25);
    belt.add(buckle);
    hipsGroup.add(belt);

    joints.hips.add(hipsGroup);

    // ==========================================
    // 4. ICONIC DOCTOR DOOM MASK & DEEP HOOD
    // ==========================================
    const headGroup = new THREE.Group();
    headGroup.name = 'Doom_Head';

    // 1. Titanium Mask Base Cylinder / Skull Shell
    const maskBaseGeom = new THREE.CylinderGeometry(0.13, 0.115, 0.24, 14);
    const maskBase = new THREE.Mesh(maskBaseGeom, mats.titaniumMat);
    maskBase.castShadow = true;
    headGroup.add(maskBase);

    // 2. Chiseled Faceplate & Stern Menacing Brow
    const browPlate = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.09), mats.titaniumMat);
    browPlate.position.set(0, 0.065, 0.115);
    // Brow scowl angle
    browPlate.rotation.x = 0.12;
    headGroup.add(browPlate);
    this.maskBrow = browPlate;

    // 3. Angular Chiseled Cheekbones with Rivet Seams
    [-0.075, 0.075].forEach(cx => {
      const cheekGeom = new THREE.BoxGeometry(0.065, 0.11, 0.055);
      const cheek = new THREE.Mesh(cheekGeom, mats.titaniumMat);
      cheek.position.set(cx, -0.015, 0.118);
      cheek.rotation.y = cx > 0 ? 0.22 : -0.22;

      // Seam rivets along cheek edge
      for (let r = 0; r < 3; r++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), mats.rivetMat);
        rivet.position.set(0, -0.035 + r * 0.035, 0.03);
        cheek.add(rivet);
      }

      headGroup.add(cheek);
    });

    // 4. Riveted Vertical Mouth Respirator Grille (Iconic Doom Breathing Plate)
    const mouthGrille = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.065), mats.darkSteelMat);
    mouthGrille.position.set(0, -0.068, 0.115);

    // 5 Slotted Vertical Respirator Vents
    for (let i = -2; i <= 2; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.07, 0.025), mats.titaniumMat);
      slot.position.set(i * 0.02, 0, 0.038);
      mouthGrille.add(slot);
    }
    // Brass corner studs on mouthplate
    [-0.045, 0.045].forEach(sx => {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), mats.goldMat);
      stud.position.set(sx, 0.035, 0.036);
      mouthGrille.add(stud);
    });
    headGroup.add(mouthGrille);

    // 5. Deep Shadow Eye Sockets with Piercing Glowing Green Sensor Eyes
    const eyeSocket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.05), mats.darkSteelMat);
    eyeSocket.position.set(0, 0.038, 0.12);
    headGroup.add(eyeSocket);

    // Left and Right Sensor Slits
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.013, 0.025), mats.eyeMat);
    leftEye.position.set(0.048, 0.038, 0.138);
    this.leftEyeSensor = leftEye;

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.013, 0.025), mats.eyeMat);
    rightEye.position.set(-0.048, 0.038, 0.138);
    this.rightEyeSensor = rightEye;

    headGroup.add(leftEye, rightEye);

    // 6. Deep Volumetric Emerald Hood (Casting Dramatic Shadows Over Face)
    const hoodGroup = new THREE.Group();
    hoodGroup.name = 'Doom_Hood';

    // Outer spherical hood shell
    const hoodGeom = new THREE.SphereGeometry(0.19, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.72);
    const hood = new THREE.Mesh(hoodGeom, mats.emeraldCloakMat);
    hood.position.set(0, 0.035, -0.02);
    hood.castShadow = true;
    hoodGroup.add(hood);

    // Hood cowl draping forward over the brow
    const cowlGeom = new THREE.CylinderGeometry(0.21, 0.23, 0.20, 14, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
    const cowl = new THREE.Mesh(cowlGeom, mats.emeraldCloakMat);
    cowl.position.set(0, -0.045, 0.045);
    cowl.rotation.x = 0.28;
    hoodGroup.add(cowl);

    headGroup.add(hoodGroup);
    this.hoodMesh = hoodGroup;
    joints.head.add(headGroup);

    // Neck
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.18, 12), mats.darkSteelMat);
    joints.neck.add(neckMesh);

    // ==========================================
    // 5. SHOULDERS & ARMORED GAUNTLETS
    // ==========================================
    const shoulderPlateGeom = new THREE.SphereGeometry(0.14, 10, 8);
    shoulderPlateGeom.scale(1.15, 0.85, 1.15);

    const leftPaul = new THREE.Mesh(shoulderPlateGeom, mats.titaniumMat);
    leftPaul.castShadow = true;
    joints.leftShoulder.add(leftPaul);

    const rightPaul = new THREE.Mesh(shoulderPlateGeom, mats.titaniumMat);
    rightPaul.castShadow = true;
    joints.rightShoulder.add(rightPaul);

    // Upper Arms (Titanium Armor Sleeves)
    const armGeom = new THREE.CylinderGeometry(0.09, 0.08, 0.32, 12);
    const leftArm = new THREE.Mesh(armGeom, mats.titaniumMat);
    leftArm.castShadow = true;
    joints.leftUpperArm.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, mats.titaniumMat);
    rightArm.castShadow = true;
    joints.rightUpperArm.add(rightArm);

    // Forearms with Heavy Armored Gauntlets
    const gauntletGeom = new THREE.CylinderGeometry(0.09, 0.075, 0.3, 12);
    const leftGauntlet = new THREE.Mesh(gauntletGeom, mats.titaniumMat);
    leftGauntlet.castShadow = true;
    joints.leftForearm.add(leftGauntlet);

    const rightGauntlet = new THREE.Mesh(gauntletGeom, mats.titaniumMat);
    rightGauntlet.castShadow = true;
    joints.rightForearm.add(rightGauntlet);

    // Palm Repulsor Emitters (Intense Emerald Technomagic Ports)
    const palmEmitterGeom = new THREE.CylinderGeometry(0.028, 0.028, 0.016, 10);
    palmEmitterGeom.rotateX(Math.PI / 2);

    const leftHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.115, 0.055), mats.darkSteelMat);
    const leftPalm = new THREE.Mesh(palmEmitterGeom, mats.plasmaMat);
    leftPalm.position.set(0, 0, 0.038);
    leftHandMesh.add(leftPalm);
    joints.leftHand.add(leftHandMesh);

    const rightHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.115, 0.055), mats.darkSteelMat);
    const rightPalm = new THREE.Mesh(palmEmitterGeom, mats.plasmaMat);
    rightPalm.position.set(0, 0, 0.038);
    rightHandMesh.add(rightPalm);
    joints.rightHand.add(rightHandMesh);

    // ==========================================
    // 6. LEGS & ARMORED SABATONS
    // ==========================================
    const thighGeom = new THREE.CylinderGeometry(0.12, 0.095, 0.44, 12);
    const leftThigh = new THREE.Mesh(thighGeom, mats.titaniumMat);
    leftThigh.castShadow = true;
    joints.leftThigh.add(leftThigh);

    const rightThigh = new THREE.Mesh(thighGeom, mats.titaniumMat);
    rightThigh.castShadow = true;
    joints.rightThigh.add(rightThigh);

    // Shins & Dark Steel Knee Guards
    const greaveGeom = new THREE.CylinderGeometry(0.095, 0.08, 0.44, 12);
    const kneeGeom = new THREE.BoxGeometry(0.11, 0.11, 0.07);

    const leftShin = new THREE.Mesh(greaveGeom, mats.titaniumMat);
    const leftKnee = new THREE.Mesh(kneeGeom, mats.darkSteelMat);
    leftKnee.position.set(0, 0.19, 0.075);
    leftShin.add(leftKnee);
    leftShin.castShadow = true;
    joints.leftShin.add(leftShin);

    const rightShin = new THREE.Mesh(greaveGeom, mats.titaniumMat);
    const rightKnee = new THREE.Mesh(kneeGeom, mats.darkSteelMat);
    rightKnee.position.set(0, 0.19, 0.075);
    rightShin.add(rightKnee);
    rightShin.castShadow = true;
    joints.rightShin.add(rightShin);

    // Spiked Armored Sabatons (Heavy Battle Boots)
    const sabatonGeom = new THREE.BoxGeometry(0.12, 0.14, 0.26);
    const leftFoot = new THREE.Mesh(sabatonGeom, mats.titaniumMat);
    leftFoot.castShadow = true;
    joints.leftFoot.add(leftFoot);

    const rightFoot = new THREE.Mesh(sabatonGeom, mats.titaniumMat);
    rightFoot.castShadow = true;
    joints.rightFoot.add(rightFoot);
  }

  // ==========================================
  // REGAL EMERALD CLOAK RIGGING
  // ==========================================
  private createCloak(): THREE.Group {
    const cloakGroup = new THREE.Group();
    cloakGroup.name = 'Doom_Cloak';

    const cloakMat = new THREE.MeshStandardMaterial({
      color: 0x124a21,
      roughness: 0.82,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    const widths = [0.48, 0.56, 0.65, 0.74];
    const segmentHeight = 0.40;

    for (let i = 0; i < 4; i++) {
      const segGeom = new THREE.PlaneGeometry(widths[i], segmentHeight, 6, 2);
      segGeom.translate(0, -segmentHeight / 2, 0);
      const segMesh = new THREE.Mesh(segGeom, cloakMat);
      segMesh.castShadow = true;

      this.rig.joints.capeBones[i].add(segMesh);
    }

    return cloakGroup;
  }

  // ==========================================
  // TECHNOMAGIC FORCE FIELD
  // ==========================================
  private createForceField(): THREE.Mesh {
    const shieldGeom = new THREE.SphereGeometry(1.45, 24, 20);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    const field = new THREE.Mesh(shieldGeom, shieldMat);
    field.position.set(0, 1.0, 0);
    field.name = 'Doom_ForceField';
    return field;
  }

  // ==========================================
  // MYSTIC GROUND GLYPHS
  // ==========================================
  private createMysticGlyphs(): THREE.Group {
    const glyphs = new THREE.Group();
    glyphs.position.set(0, 0.02, 0);
    glyphs.rotation.x = -Math.PI / 2;
    glyphs.visible = false;

    const ringGeom = new THREE.RingGeometry(0.85, 1.25, 32);
    const glyphMat = new THREE.MeshBasicMaterial({
      color: 0x33ff66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeom, glyphMat);
    glyphs.add(ring);

    // Inner rune circle
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 20), glyphMat);
    glyphs.add(innerRing);

    return glyphs;
  }

  public setShieldActive(active: boolean) {
    const mat = this.forceField.material as THREE.MeshBasicMaterial;
    mat.opacity = active ? 0.45 : 0.0;
  }

  public setMysticGlyphsActive(active: boolean) {
    this.mysticGlyphs.visible = active;
  }

  public update(delta: number, worldVelocity: THREE.Vector3) {
    this.rig.update(delta, worldVelocity);

    // Pulse Doom's emerald eye sensor slits and chest core
    this.eyePulseTimer += delta * 4;
    const pulse = 0.85 + Math.sin(this.eyePulseTimer) * 0.15;
    if (this.leftEyeSensor && this.rightEyeSensor) {
      this.leftEyeSensor.scale.set(1, pulse, 1);
      this.rightEyeSensor.scale.set(1, pulse, 1);
    }
    if (this.chestCoreGlow) {
      this.chestCoreGlow.intensity = 3.2 + Math.sin(this.eyePulseTimer) * 0.8;
    }

    // Rotate mystic glyphs if active
    if (this.mysticGlyphs.visible) {
      this.mysticGlyphs.rotation.z += delta * 1.6;
    }

    // Forcefield pulse
    if ((this.forceField.material as THREE.MeshBasicMaterial).opacity > 0) {
      const fPulse = 1.35 + Math.sin(performance.now() * 0.008) * 0.06;
      this.forceField.scale.set(fPulse, fPulse, fPulse);
    }
  }
}
