import { CharacterRig } from './CharacterRig';

export type AnimationState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'JUMP_START'
  | 'JUMP_AIR'
  | 'LANDING'
  | 'LIGHT_ATTACK_1'
  | 'LIGHT_ATTACK_2'
  | 'LIGHT_ATTACK_3'
  | 'HEAVY_STRIKE'
  | 'SPECIAL_LIGHTNING'
  | 'ULTIMATE'
  | 'WEAPON_THROW'
  | 'WEAPON_RECALL'
  | 'DODGE'
  | 'HIT_REACT'
  | 'KNOCKDOWN'
  | 'VICTORY'
  | 'DOOM_BLAST'
  | 'DOOM_BEAM'
  | 'DOOM_SHIELD'
  | 'DOOM_MYSTIC'
  | 'DOOM_TELEPORT'
  | 'DOOM_GAS_CAST'
  | 'DOOM_FINAL_DEFENSE'
  | 'DOOM_DEFEAT'
  | 'THOR_FINAL_BUILDUP'
  | 'THOR_FINAL_STRIKE'
  | 'THOR_LOOK_SKY';

export interface AnimationCallback {
  timeFraction: number; // 0.0 to 1.0
  executed: boolean;
  callback: () => void;
}

export class CharacterAnimator {
  public rig: CharacterRig;
  public isThor: boolean;
  public currentState: AnimationState = 'IDLE';
  public stateTime: number = 0;
  public stateDuration: number = 1.0;
  public isLooping: boolean = true;
  public isLocked: boolean = false; // Cannot interrupt during commitment window

  private callbacks: AnimationCallback[] = [];
  private onComplete: (() => void) | null = null;

  constructor(rig: CharacterRig, isThor: boolean) {
    this.rig = rig;
    this.isThor = isThor;
  }

  public play(
    state: AnimationState,
    duration = 1.0,
    loop = false,
    lock = false,
    onComplete?: () => void
  ) {
    if (this.isLocked && this.currentState !== state) {
      return false; // Still committing to previous attack/reaction
    }

    this.currentState = state;
    this.stateTime = 0;
    this.stateDuration = Math.max(duration, 0.05);
    this.isLooping = loop;
    this.isLocked = lock;
    this.callbacks = [];
    this.onComplete = onComplete || null;

    return true;
  }

  public addKeyframeTrigger(timeFraction: number, callback: () => void) {
    this.callbacks.push({
      timeFraction,
      executed: false,
      callback
    });
  }

  public update(delta: number) {
    this.stateTime += delta;
    const progress = Math.min(this.stateTime / this.stateDuration, 1.0);

    // Fire registered impact/VFX keyframe callbacks
    for (const cb of this.callbacks) {
      if (!cb.executed && progress >= cb.timeFraction) {
        cb.executed = true;
        cb.callback();
      }
    }

    // Apply procedural skeletal pose
    if (this.isThor) {
      this.applyThorPose(this.currentState, progress, this.stateTime);
    } else {
      this.applyDoomPose(this.currentState, progress, this.stateTime);
    }

    if (progress >= 1.0) {
      if (this.isLooping) {
        this.stateTime = 0;
        this.callbacks.forEach(cb => (cb.executed = false));
      } else {
        this.isLocked = false;
        if (this.onComplete) {
          const comp = this.onComplete;
          this.onComplete = null;
          comp();
        } else {
          this.play('IDLE', 1.5, true, false);
        }
      }
    }
  }

  // ==========================================
  // THOR PROCEDURAL SKELETAL ANIMATIONS
  // ==========================================
  private applyThorPose(state: AnimationState, p: number, t: number) {
    const j = this.rig.joints;

    switch (state) {
      case 'IDLE': {
        // Breathing, heroic Asgardian combat stance
        const breath = Math.sin(t * 3.5);
        j.chest.scale.set(1.0 + breath * 0.03, 1.0 + breath * 0.04, 1.0 + breath * 0.03);
        j.hips.position.y = 0.95 + breath * 0.015;

        // Torso posture
        j.spine.rotation.set(0.04, 0.1, 0);
        j.chest.rotation.set(-0.02, 0.05, 0);

        // Left arm ready/braced
        j.leftUpperArm.rotation.set(0.2, 0.1, -0.2);
        j.leftForearm.rotation.set(-0.5, 0, 0);

        // Right arm holding Stormbreaker firmly
        j.rightUpperArm.rotation.set(-0.25, -0.2, 0.3);
        j.rightForearm.rotation.set(-0.7, 0.3, 0);
        j.weaponSocket.rotation.set(0, 0, 0);

        // Legs planted
        j.leftThigh.rotation.set(-0.05, 0, -0.08);
        j.rightThigh.rotation.set(0.05, 0, 0.08);
        j.leftShin.rotation.set(0.08, 0, 0);
        j.rightShin.rotation.set(0.08, 0, 0);
        break;
      }

      case 'RUN': {
        // Dynamic Asgardian forward charge
        const cycle = t * 12;
        const legSwing = Math.sin(cycle) * 0.75;
        const armSwing = Math.sin(cycle + Math.PI) * 0.65;

        // Forward lean
        j.hips.position.y = 0.92 + Math.abs(Math.sin(cycle)) * 0.06;
        j.spine.rotation.set(0.22, Math.sin(cycle) * 0.08, 0);
        j.chest.rotation.set(0.1, -Math.sin(cycle) * 0.08, 0);

        // Legs cycling with knee flexion
        j.leftThigh.rotation.set(legSwing, 0, 0);
        j.rightThigh.rotation.set(-legSwing, 0, 0);
        j.leftShin.rotation.set(legSwing > 0 ? 0.8 : 0.1, 0, 0);
        j.rightShin.rotation.set(-legSwing > 0 ? 0.8 : 0.1, 0, 0);

        // Arms driving momentum
        j.leftUpperArm.rotation.set(-armSwing, 0, -0.2);
        j.leftForearm.rotation.set(-0.8, 0, 0);
        j.rightUpperArm.rotation.set(armSwing * 0.5 - 0.2, 0, 0.3);
        j.rightForearm.rotation.set(-0.6, 0, 0);
        break;
      }

      case 'JUMP_START': {
        // Crouch compression
        j.hips.position.y = 0.8;
        j.spine.rotation.set(0.3, 0, 0);
        j.leftThigh.rotation.set(-0.4, 0, 0);
        j.rightThigh.rotation.set(-0.4, 0, 0);
        j.leftShin.rotation.set(0.7, 0, 0);
        j.rightShin.rotation.set(0.7, 0, 0);
        break;
      }

      case 'JUMP_AIR': {
        // Airborne heroic ascent
        j.hips.position.y = 1.0;
        j.spine.rotation.set(-0.1, 0, 0);
        j.leftThigh.rotation.set(0.3, 0, -0.2);
        j.rightThigh.rotation.set(-0.2, 0, 0.2);
        j.leftShin.rotation.set(0.5, 0, 0);
        j.rightShin.rotation.set(0.4, 0, 0);
        j.rightUpperArm.rotation.set(-1.2, 0, 0.4); // Weapon raised
        break;
      }

      case 'LANDING': {
        // Heavy impact crouch & recovery
        const blend = Math.sin(p * Math.PI);
        j.hips.position.y = 0.95 - blend * 0.25;
        j.spine.rotation.set(blend * 0.35, 0, 0);
        j.leftThigh.rotation.set(-blend * 0.5, 0, 0);
        j.rightThigh.rotation.set(-blend * 0.5, 0, 0);
        j.leftShin.rotation.set(blend * 0.8, 0, 0);
        j.rightShin.rotation.set(blend * 0.8, 0, 0);
        break;
      }

      case 'LIGHT_ATTACK_1': {
        // Anticipation (0.0-0.3) -> Action (0.3-0.5) -> Impact (0.5) -> Recovery (0.5-1.0)
        if (p < 0.3) {
          const tAnt = p / 0.3;
          // Coils back, turns torso
          j.spine.rotation.set(0, -0.4 * tAnt, 0);
          j.rightUpperArm.rotation.set(-0.6 * tAnt, -0.4 * tAnt, 0.8 * tAnt);
          j.rightForearm.rotation.set(-0.4 * tAnt, 0, 0);
        } else if (p < 0.55) {
          const tAct = (p - 0.3) / 0.25;
          // Powerful horizontal axe slash
          j.spine.rotation.set(0.1, -0.4 + 0.8 * tAct, 0);
          j.rightUpperArm.rotation.set(0.2, 0.6 * tAct, -0.2);
          j.rightForearm.rotation.set(-0.8 + 0.5 * tAct, 0.8 * tAct, 0);
        } else {
          const tRec = (p - 0.55) / 0.45;
          // Recovers smoothly
          j.spine.rotation.set(0.1 * (1 - tRec), 0.4 * (1 - tRec), 0);
          j.rightUpperArm.rotation.set(-0.25 * tRec, -0.2 * tRec, 0.3 * tRec);
        }
        break;
      }

      case 'LIGHT_ATTACK_2': {
        // Upward diagonal cleave
        if (p < 0.3) {
          j.spine.rotation.set(0.2, 0.3 * (p / 0.3), 0);
          j.rightUpperArm.rotation.set(0.6, 0, 0.2);
        } else if (p < 0.6) {
          const tAct = (p - 0.3) / 0.3;
          j.spine.rotation.set(-0.15, -0.5 * tAct, 0);
          j.rightUpperArm.rotation.set(-1.4 * tAct, -0.4 * tAct, 0.6);
          j.rightForearm.rotation.set(-0.3, 0, 0);
        } else {
          const tRec = (p - 0.6) / 0.4;
          j.spine.rotation.set(-0.15 * (1 - tRec), -0.5 * (1 - tRec), 0);
        }
        break;
      }

      case 'LIGHT_ATTACK_3': {
        // 360 Whirlwind cleave
        const rot = p * Math.PI * 2;
        j.root.rotation.y = rot;
        j.rightUpperArm.rotation.set(0, 0, 1.4); // Extends Stormbreaker horizontally
        j.rightForearm.rotation.set(0, 0, 0);
        j.leftUpperArm.rotation.set(0, 0, -1.2);
        break;
      }

      case 'HEAVY_STRIKE': {
        // Two-handed overhead thunder smash
        if (p < 0.4) {
          // Anticipation: raises Stormbreaker high overhead with both hands
          const tAnt = p / 0.4;
          j.spine.rotation.set(-0.3 * tAnt, 0, 0);
          j.rightUpperArm.rotation.set(-2.2 * tAnt, 0.2, 0.2);
          j.leftUpperArm.rotation.set(-2.0 * tAnt, -0.2, -0.2);
          j.rightForearm.rotation.set(-0.8 * tAnt, 0, 0);
          j.leftForearm.rotation.set(-0.8 * tAnt, 0, 0);
        } else if (p < 0.65) {
          // Action: devastating downward smash
          const tAct = (p - 0.4) / 0.25;
          j.spine.rotation.set(0.45 * tAct, 0, 0);
          j.hips.position.y = 0.95 - 0.25 * tAct;
          j.rightUpperArm.rotation.set(0.8 * tAct, 0, 0);
          j.leftUpperArm.rotation.set(0.8 * tAct, 0, 0);
          j.leftShin.rotation.set(0.6 * tAct, 0, 0);
          j.rightShin.rotation.set(0.6 * tAct, 0, 0);
        } else {
          // Impact hold and slow recovery
          const tRec = (p - 0.65) / 0.35;
          j.hips.position.y = 0.7 + 0.25 * tRec;
          j.spine.rotation.set(0.45 * (1 - tRec), 0, 0);
        }
        break;
      }

      case 'SPECIAL_LIGHTNING': {
        // Ground Slam Leap & Lightning Eruption
        if (p < 0.35) {
          // Airborne surge
          j.hips.position.y = 1.6 * (p / 0.35);
          j.rightUpperArm.rotation.set(-2.4, 0, 0.3);
        } else if (p < 0.55) {
          // Dive crash down
          j.hips.position.y = 0.65;
          j.spine.rotation.set(0.5, 0, 0);
          j.rightUpperArm.rotation.set(0.9, 0, 0);
        } else {
          // Electricity crackling through pose
          j.hips.position.y = 0.65 + 0.3 * ((p - 0.55) / 0.45);
        }
        break;
      }

      case 'ULTIMATE': {
        // Act 1 Cinematic Ultimate: Thunder God Descends
        if (p < 0.4) {
          // Levitates slightly, holds Stormbreaker pointed at the sky
          j.hips.position.y = 1.3;
          j.spine.rotation.set(-0.25, 0, 0);
          j.rightUpperArm.rotation.set(-2.8, 0, 0.1); // Points straight up
          j.leftUpperArm.rotation.set(-0.8, 0, -1.0); // Hand open
        } else if (p < 0.7) {
          // Huge lightning discharge pose
          j.hips.position.y = 1.4;
          j.rightUpperArm.rotation.set(-1.5, 0.5, 0.2);
          j.leftUpperArm.rotation.set(-1.5, -0.5, -0.2);
        } else {
          j.hips.position.y = 0.95;
          j.spine.rotation.set(0.1, 0, 0);
        }
        break;
      }

      case 'DODGE': {
        // Fast evasive slide/roll
        j.hips.position.y = 0.55;
        j.spine.rotation.set(0.5, 0, 0);
        j.leftThigh.rotation.set(-0.8, 0, 0);
        j.rightThigh.rotation.set(0.8, 0, 0);
        break;
      }

      case 'HIT_REACT': {
        // Body knocked back by impact
        const bump = Math.sin(p * Math.PI);
        j.hips.position.y = 0.95 - bump * 0.08;
        j.spine.rotation.set(-bump * 0.4, bump * 0.2, 0);
        j.neck.rotation.set(bump * 0.3, 0, 0);
        j.leftUpperArm.rotation.set(bump * 0.6, 0, -bump * 0.4);
        j.rightUpperArm.rotation.set(bump * 0.4, 0, bump * 0.4);
        break;
      }

      case 'KNOCKDOWN': {
        if (p < 0.4) {
          // Falling to ground
          j.root.rotation.z = p * Math.PI * 1.2;
          j.hips.position.y = 0.95 - p * 1.5;
        } else if (p < 0.75) {
          // Flat on back
          j.root.rotation.z = Math.PI / 2;
          j.hips.position.y = 0.2;
        } else {
          // Getting back up
          const tUp = (p - 0.75) / 0.25;
          j.root.rotation.z = (Math.PI / 2) * (1 - tUp);
          j.hips.position.y = 0.2 + 0.75 * tUp;
        }
        break;
      }

      case 'VICTORY': {
        // Raises Stormbreaker triumphantly with Asgardian roar
        j.spine.rotation.set(-0.15, 0, 0);
        j.rightUpperArm.rotation.set(-2.6, 0, 0.4);
        j.leftUpperArm.rotation.set(-0.8, 0, -0.6);
        j.head.rotation.set(-0.3, 0, 0); // Looks up
        break;
      }

      case 'THOR_FINAL_BUILDUP': {
        // Determined heroic stance, raises Stormbreaker as lightning gathers
        const tAnt = Math.min(p, 1.0);
        j.hips.position.y = 0.92;
        j.spine.rotation.set(-0.18 * tAnt, -0.15 * tAnt, 0);
        j.chest.rotation.set(-0.1 * tAnt, 0, 0);
        j.leftThigh.rotation.set(-0.25, 0, -0.2);
        j.rightThigh.rotation.set(0.15, 0, 0.2);
        j.rightUpperArm.rotation.set(-2.4 * tAnt, -0.3 * tAnt, 0.5 * tAnt);
        j.rightForearm.rotation.set(-0.6 * tAnt, 0.2, 0);
        j.leftUpperArm.rotation.set(-1.2 * tAnt, 0.2, -0.5 * tAnt);
        j.leftForearm.rotation.set(-0.8 * tAnt, 0, 0);
        break;
      }

      case 'THOR_FINAL_STRIKE': {
        // Massive forward launch & devastating downward cleave connecting with Doom
        if (p < 0.3) {
          // Coiled leap forward
          const tL = p / 0.3;
          j.hips.position.y = 0.95 + 0.4 * tL;
          j.spine.rotation.set(-0.3, 0, 0);
          j.rightUpperArm.rotation.set(-2.8, 0, 0.3);
          j.leftUpperArm.rotation.set(-1.2, 0, -0.6);
        } else if (p < 0.6) {
          // Crushing impact strike
          const tAct = (p - 0.3) / 0.3;
          j.hips.position.y = 0.75 - 0.15 * tAct;
          j.spine.rotation.set(0.45 * tAct, 0.2 * tAct, 0);
          j.rightUpperArm.rotation.set(0.9 * tAct, 0.2, 0);
          j.leftUpperArm.rotation.set(0.4 * tAct, -0.3, 0);
          j.leftShin.rotation.set(0.7, 0, 0);
          j.rightShin.rotation.set(0.7, 0, 0);
        } else {
          // Tremendous impact hold
          const tHold = (p - 0.6) / 0.4;
          j.hips.position.y = 0.6 + 0.35 * tHold;
          j.spine.rotation.set(0.45 * (1 - tHold), 0, 0);
        }
        break;
      }

      case 'THOR_LOOK_SKY': {
        // Stands proudly, slowly tilts head and neck upward toward the sky
        const tLook = Math.min(p, 1.0);
        j.hips.position.y = 0.96;
        j.spine.rotation.set(-0.08, 0, 0);
        j.chest.rotation.set(-0.05, 0, 0);
        j.head.rotation.set(-0.45 * tLook, 0.1 * tLook, 0);
        j.rightUpperArm.rotation.set(-0.3, -0.1, 0.25);
        j.leftUpperArm.rotation.set(0.1, 0, -0.15);
        break;
      }

      default:
        break;
    }
  }

  // ==========================================
  // DOCTOR DOOM PROCEDURAL SKELETAL ANIMATIONS
  // ==========================================
  private applyDoomPose(state: AnimationState, p: number, t: number) {
    const j = this.rig.joints;

    switch (state) {
      case 'IDLE': {
        // Controlled, imposing, regal Latverian stance
        const hover = Math.sin(t * 2.0);
        j.hips.position.y = 0.95 + hover * 0.01;
        j.spine.rotation.set(-0.02, 0.05, 0);
        j.chest.rotation.set(0.04, 0, 0);

        // Left arm tucked behind cloak
        j.leftUpperArm.rotation.set(0.1, 0.2, -0.15);
        j.leftForearm.rotation.set(-0.4, 0.6, 0);

        // Right arm poised, palm repulsor angled slightly forward
        j.rightUpperArm.rotation.set(0.15, -0.1, 0.15);
        j.rightForearm.rotation.set(-0.5, 0, 0);

        // Stately leg stance
        j.leftThigh.rotation.set(0, 0, -0.06);
        j.rightThigh.rotation.set(0, 0, 0.06);
        break;
      }

      case 'WALK': {
        // Deliberate, intimidating ruler stride
        const cycle = t * 6;
        const swing = Math.sin(cycle) * 0.45;

        j.hips.position.y = 0.95 + Math.abs(Math.sin(cycle)) * 0.03;
        j.spine.rotation.set(0.05, Math.sin(cycle) * 0.05, 0);

        j.leftThigh.rotation.set(swing, 0, 0);
        j.rightThigh.rotation.set(-swing, 0, 0);
        j.leftShin.rotation.set(swing > 0 ? 0.4 : 0.05, 0, 0);
        j.rightShin.rotation.set(-swing > 0 ? 0.4 : 0.05, 0, 0);

        // Minimal arm swing (ruler poise)
        j.leftUpperArm.rotation.set(-swing * 0.2, 0, -0.1);
        j.rightUpperArm.rotation.set(swing * 0.2, 0, 0.1);
        break;
      }

      case 'DOOM_BLAST': {
        // Palm repulsor energy blast
        if (p < 0.35) {
          // Anticipation: raises right arm forward, palm aligns with target
          const tAnt = p / 0.35;
          j.spine.rotation.set(0, 0.2 * tAnt, 0);
          j.rightUpperArm.rotation.set(-1.4 * tAnt, -0.2 * tAnt, 0);
          j.rightForearm.rotation.set(-0.2 * tAnt, 0, 0);
          j.rightHand.rotation.set(0.8 * tAnt, 0, 0); // Palm faces enemy
        } else if (p < 0.6) {
          // Action & recoil of blast
          const tRec = (p - 0.35) / 0.25;
          j.spine.rotation.set(0, 0.2 - 0.1 * tRec, 0);
          j.rightUpperArm.rotation.set(-1.4 - 0.2 * Math.sin(tRec * Math.PI), 0, 0);
        } else {
          // Controlled recovery
          const tDone = (p - 0.6) / 0.4;
          j.rightUpperArm.rotation.set(-1.4 * (1 - tDone), 0, 0);
        }
        break;
      }

      case 'DOOM_BEAM': {
        // Sustained technomagic arm cannon beam
        j.spine.rotation.set(0, 0.15, 0);
        j.rightUpperArm.rotation.set(-1.5, 0, 0);
        j.leftUpperArm.rotation.set(-1.2, 0.3, 0); // Left hand supports right arm
        j.rightHand.rotation.set(1.0, 0, 0);
        break;
      }

      case 'DOOM_SHIELD': {
        // Techno-barrier defense
        j.spine.rotation.set(-0.1, 0, 0);
        j.leftUpperArm.rotation.set(-1.2, 0.5, -0.4);
        j.rightUpperArm.rotation.set(-1.2, -0.5, 0.4);
        j.leftForearm.rotation.set(-1.2, 0, 0);
        j.rightForearm.rotation.set(-1.2, 0, 0);
        break;
      }

      case 'DOOM_MYSTIC': {
        // Latin spellcasting / ground trap eruption
        if (p < 0.45) {
          // Raises both arms high to gather cosmic energy
          const tAnt = p / 0.45;
          j.spine.rotation.set(-0.2 * tAnt, 0, 0);
          j.leftUpperArm.rotation.set(-2.2 * tAnt, 0.4 * tAnt, -0.4 * tAnt);
          j.rightUpperArm.rotation.set(-2.2 * tAnt, -0.4 * tAnt, 0.4 * tAnt);
        } else {
          // Slams energy to ground / directs glyphs
          const tAct = (p - 0.45) / 0.55;
          j.spine.rotation.set(0.3 * (1 - tAct), 0, 0);
          j.leftUpperArm.rotation.set(0.4 * (1 - tAct), 0, 0);
          j.rightUpperArm.rotation.set(0.4 * (1 - tAct), 0, 0);
        }
        break;
      }

      case 'DOOM_TELEPORT': {
        // Crosses arms, digital-mystic dematerialization
        j.spine.rotation.set(0.1, 0, 0);
        j.leftUpperArm.rotation.set(-0.6, 0.6, -0.5);
        j.rightUpperArm.rotation.set(-0.6, -0.6, 0.5);
        break;
      }

      case 'ULTIMATE': {
        // Siphon Protocol / Cosmic Overlord
        if (p < 0.4) {
          // Levitation & cloak flare
          j.hips.position.y = 1.4;
          j.spine.rotation.set(-0.2, 0, 0);
          j.leftUpperArm.rotation.set(-1.8, 0, -0.8);
          j.rightUpperArm.rotation.set(-1.8, 0, 0.8);
        } else if (p < 0.75) {
          // Dual hand beam convergence
          j.hips.position.y = 1.4;
          j.leftUpperArm.rotation.set(-1.5, 0.3, 0);
          j.rightUpperArm.rotation.set(-1.5, -0.3, 0);
        } else {
          j.hips.position.y = 0.95;
        }
        break;
      }

      case 'HIT_REACT': {
        const bump = Math.sin(p * Math.PI);
        j.spine.rotation.set(-bump * 0.25, -bump * 0.1, 0);
        j.head.rotation.set(bump * 0.2, 0, 0);
        break;
      }

      case 'VICTORY': {
        // Iconic Victor Von Doom ruler pose with crossed arms
        j.spine.rotation.set(-0.05, 0, 0);
        j.leftUpperArm.rotation.set(-0.5, 0.7, -0.4);
        j.rightUpperArm.rotation.set(-0.5, -0.7, 0.4);
        j.leftForearm.rotation.set(-1.1, 0, 0);
        j.rightForearm.rotation.set(-1.1, 0, 0);
        break;
      }

      case 'DOOM_GAS_CAST': {
        // Latverian dark sorcery spell preparation and gas release
        if (p < 0.45) {
          // Slowly raises both arms outward and upward, head tilts back
          const tAnt = p / 0.45;
          j.spine.rotation.set(-0.25 * tAnt, 0, 0);
          j.chest.rotation.set(-0.15 * tAnt, 0, 0);
          j.head.rotation.set(-0.35 * tAnt, 0, 0);
          j.leftUpperArm.rotation.set(-1.8 * tAnt, 0.5 * tAnt, -0.8 * tAnt);
          j.rightUpperArm.rotation.set(-1.8 * tAnt, -0.5 * tAnt, 0.8 * tAnt);
          j.leftForearm.rotation.set(-0.5 * tAnt, 0, 0);
          j.rightForearm.rotation.set(-0.5 * tAnt, 0, 0);
        } else if (p < 0.75) {
          // Thrusts arms forward, releasing dark green mystical miasma
          const tRel = (p - 0.45) / 0.3;
          j.spine.rotation.set(0.15 * tRel, 0, 0);
          j.chest.rotation.set(0.1 * tRel, 0, 0);
          j.head.rotation.set(0.1 * tRel, 0, 0);
          j.leftUpperArm.rotation.set(-1.4, 0.2, -0.2);
          j.rightUpperArm.rotation.set(-1.4, -0.2, 0.2);
          j.leftForearm.rotation.set(-0.2, 0, 0);
          j.rightForearm.rotation.set(-0.2, 0, 0);
        } else {
          // Holds menacing spell posture
          j.spine.rotation.set(0.05, 0, 0);
        }
        break;
      }

      case 'DOOM_FINAL_DEFENSE': {
        // Braces for impact, raises both gauntlets with forcefield humming
        const tDef = Math.min(p, 1.0);
        j.hips.position.y = 0.88;
        j.spine.rotation.set(0.15 * tDef, 0, 0);
        j.leftThigh.rotation.set(-0.3, 0, -0.15);
        j.rightThigh.rotation.set(0.3, 0, 0.15);
        j.leftUpperArm.rotation.set(-1.6 * tDef, 0.4 * tDef, -0.4 * tDef);
        j.rightUpperArm.rotation.set(-1.6 * tDef, -0.4 * tDef, 0.4 * tDef);
        j.leftForearm.rotation.set(-1.3 * tDef, 0, 0);
        j.rightForearm.rotation.set(-1.3 * tDef, 0, 0);
        break;
      }

      case 'DOOM_DEFEAT': {
        // Violently thrown backward and falls motionless on the battlefield
        if (p < 0.35) {
          // Thrown back by Stormbreaker blow
          const tBlow = p / 0.35;
          j.root.rotation.z = -tBlow * Math.PI * 0.45;
          j.hips.position.y = 0.95 - tBlow * 0.7;
          j.spine.rotation.set(-0.4 * tBlow, 0, 0);
          j.leftUpperArm.rotation.set(0.8, 0, -0.6);
          j.rightUpperArm.rotation.set(0.8, 0, 0.6);
        } else {
          // Motionless on the ground
          j.root.rotation.z = -Math.PI * 0.48;
          j.hips.position.y = 0.18;
          j.spine.rotation.set(-0.2, 0, 0);
          j.head.rotation.set(0.3, 0, 0);
          j.leftUpperArm.rotation.set(0.5, 0, -0.3);
          j.rightUpperArm.rotation.set(0.5, 0, 0.3);
        }
        break;
      }

      default:
        break;
    }
  }
}
