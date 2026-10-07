import * as THREE from 'three';

export interface RigJoints {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  
  leftShoulder: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  leftHand: THREE.Group;

  rightShoulder: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  rightHand: THREE.Group;
  weaponSocket: THREE.Group;

  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  leftFoot: THREE.Group;

  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  rightFoot: THREE.Group;

  capeBones: THREE.Group[];
}

export class CharacterRig {
  public root: THREE.Group;
  public joints: RigJoints;
  
  // Cape physics state
  private capeVelocities: THREE.Vector3[] = [];
  private capePositions: THREE.Vector3[] = [];
  private prevRootPos: THREE.Vector3 = new THREE.Vector3();
  
  // Look-at state
  public targetLookAt: THREE.Vector3 | null = null;
  public name: string;

  constructor(name: string) {
    this.name = name;
    this.root = new THREE.Group();
    this.root.name = `${name}_RigRoot`;

    // Build hierarchical skeleton
    const hips = new THREE.Group(); hips.name = `${name}_Hips`;
    const spine = new THREE.Group(); spine.name = `${name}_Spine`;
    const chest = new THREE.Group(); chest.name = `${name}_Chest`;
    const neck = new THREE.Group(); neck.name = `${name}_Neck`;
    const head = new THREE.Group(); head.name = `${name}_Head`;

    const leftShoulder = new THREE.Group(); leftShoulder.name = `${name}_L_Shoulder`;
    const leftUpperArm = new THREE.Group(); leftUpperArm.name = `${name}_L_UpperArm`;
    const leftForearm = new THREE.Group(); leftForearm.name = `${name}_L_Forearm`;
    const leftHand = new THREE.Group(); leftHand.name = `${name}_L_Hand`;

    const rightShoulder = new THREE.Group(); rightShoulder.name = `${name}_R_Shoulder`;
    const rightUpperArm = new THREE.Group(); rightUpperArm.name = `${name}_R_UpperArm`;
    const rightForearm = new THREE.Group(); rightForearm.name = `${name}_R_Forearm`;
    const rightHand = new THREE.Group(); rightHand.name = `${name}_R_Hand`;
    const weaponSocket = new THREE.Group(); weaponSocket.name = `${name}_WeaponSocket`;

    const leftThigh = new THREE.Group(); leftThigh.name = `${name}_L_Thigh`;
    const leftShin = new THREE.Group(); leftShin.name = `${name}_L_Shin`;
    const leftFoot = new THREE.Group(); leftFoot.name = `${name}_L_Foot`;

    const rightThigh = new THREE.Group(); rightThigh.name = `${name}_R_Thigh`;
    const rightShin = new THREE.Group(); rightShin.name = `${name}_R_Shin`;
    const rightFoot = new THREE.Group(); rightFoot.name = `${name}_R_Foot`;

    // Hierarchy assembly
    this.root.add(hips);
    hips.add(spine);
    spine.add(chest);
    chest.add(neck);
    neck.add(head);

    chest.add(leftShoulder);
    leftShoulder.add(leftUpperArm);
    leftUpperArm.add(leftForearm);
    leftForearm.add(leftHand);

    chest.add(rightShoulder);
    rightShoulder.add(rightUpperArm);
    rightUpperArm.add(rightForearm);
    rightForearm.add(rightHand);
    rightHand.add(weaponSocket);

    hips.add(leftThigh);
    leftThigh.add(leftShin);
    leftShin.add(leftFoot);

    hips.add(rightThigh);
    rightThigh.add(rightShin);
    rightShin.add(rightFoot);

    // Cape / Cloak bones chain
    const capeBones: THREE.Group[] = [];
    let prevBone: THREE.Group = chest;
    for (let i = 0; i < 4; i++) {
      const cb = new THREE.Group();
      cb.name = `${name}_Cape_${i}`;
      cb.position.set(0, i === 0 ? 0.35 : -0.35, -0.15);
      prevBone.add(cb);
      capeBones.push(cb);
      prevBone = cb;
      this.capeVelocities.push(new THREE.Vector3());
      this.capePositions.push(new THREE.Vector3(0, -0.35 * (i + 1), -0.15));
    }

    this.joints = {
      root: this.root,
      hips,
      spine,
      chest,
      neck,
      head,
      leftShoulder,
      leftUpperArm,
      leftForearm,
      leftHand,
      rightShoulder,
      rightUpperArm,
      rightForearm,
      rightHand,
      weaponSocket,
      leftThigh,
      leftShin,
      leftFoot,
      rightThigh,
      rightShin,
      rightFoot,
      capeBones
    };

    // Set default anatomical pivot positions (scale: ~2m human)
    this.setupDefaultRestPose();
  }

  public setupDefaultRestPose() {
    this.joints.hips.position.set(0, 0.95, 0);
    this.joints.spine.position.set(0, 0.22, 0);
    this.joints.chest.position.set(0, 0.25, 0);
    this.joints.neck.position.set(0, 0.22, 0);
    this.joints.head.position.set(0, 0.12, 0);

    // Arms
    this.joints.leftShoulder.position.set(0.28, 0.15, 0);
    this.joints.leftUpperArm.position.set(0.08, -0.05, 0);
    this.joints.leftForearm.position.set(0, -0.28, 0);
    this.joints.leftHand.position.set(0, -0.26, 0);

    this.joints.rightShoulder.position.set(-0.28, 0.15, 0);
    this.joints.rightUpperArm.position.set(-0.08, -0.05, 0);
    this.joints.rightForearm.position.set(0, -0.28, 0);
    this.joints.rightHand.position.set(0, -0.26, 0);
    this.joints.weaponSocket.position.set(0, -0.05, 0.12);

    // Legs
    this.joints.leftThigh.position.set(0.18, -0.08, 0);
    this.joints.leftShin.position.set(0, -0.42, 0);
    this.joints.leftFoot.position.set(0, -0.42, 0.06);

    this.joints.rightThigh.position.set(-0.18, -0.08, 0);
    this.joints.rightShin.position.set(0, -0.42, 0);
    this.joints.rightFoot.position.set(0, -0.42, 0.06);
  }

  public update(delta: number, worldVelocity: THREE.Vector3) {
    // 1. Cape physical spring dynamics
    const dt = Math.min(delta, 0.05);
    const speed = worldVelocity.length();
    const velInfluence = worldVelocity.clone().multiplyScalar(-0.12);

    for (let i = 0; i < this.joints.capeBones.length; i++) {
      const bone = this.joints.capeBones[i];
      
      // Wind oscillation and motion sway
      const windAngle = performance.now() * 0.005 + i * 0.6;
      const windZ = Math.sin(windAngle) * 0.08 + (speed * 0.1);
      const windX = Math.cos(windAngle * 0.7) * 0.04;

      // Rest rotation target
      const targetRotX = THREE.MathUtils.clamp(velInfluence.z * 1.5 + windZ + (speed > 1 ? 0.35 : 0.08), -0.2, 1.2);
      const targetRotZ = THREE.MathUtils.clamp(velInfluence.x * 1.2 + windX, -0.4, 0.4);

      // Spring-damper to target rotation
      bone.rotation.x = THREE.MathUtils.damp(bone.rotation.x, targetRotX, 10, dt);
      bone.rotation.z = THREE.MathUtils.damp(bone.rotation.z, targetRotZ, 10, dt);
      bone.rotation.y = THREE.MathUtils.damp(bone.rotation.y, windX * 0.5, 6, dt);
    }

    // 2. Head look-at opponent target
    if (this.targetLookAt) {
      const headWorldPos = new THREE.Vector3();
      this.joints.head.getWorldPosition(headWorldPos);
      
      const dir = this.targetLookAt.clone().sub(headWorldPos).normalize();
      
      // Pitch angle
      const pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.8, 0.8));

      // Limit range to natural anatomical boundaries
      const clampedPitch = THREE.MathUtils.clamp(pitch, -0.4, 0.5);
      const targetEuler = new THREE.Euler(clampedPitch, 0, 0);

      this.joints.head.rotation.x = THREE.MathUtils.damp(this.joints.head.rotation.x, targetEuler.x, 6, dt);
    }

    this.prevRootPos.copy(this.root.position);
  }
}
