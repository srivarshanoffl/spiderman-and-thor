import * as THREE from 'three';
import { DoomModel } from './DoomModel';
import { CharacterAnimator } from './CharacterAnimator';
import { SoundSystem } from '../audio/SoundSystem';
import { FXSystem } from '../effects/FXSystem';

export class DoomCharacter {
  public model: DoomModel;
  public animator: CharacterAnimator;
  public position: THREE.Vector3 = new THREE.Vector3(4.0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3();

  public hp: number = 2200;
  public maxHp: number = 2200;
  public facingRight: boolean = false;
  public isShielded: boolean = false;

  // AI Decision Timing
  private aiActionTimer: number = 0;
  private currentAIState: 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEFENDING' = 'IDLE';
  private sound: SoundSystem;
  private fx: FXSystem;

  constructor(scene: THREE.Scene, sound: SoundSystem, fx: FXSystem) {
    this.sound = sound;
    this.fx = fx;
    this.model = new DoomModel();
    this.animator = new CharacterAnimator(this.model.rig, false);
    this.model.rig.root.position.copy(this.position);
    scene.add(this.model.rig.root);

    this.animator.play('IDLE', 2.0, true);
  }

  public update(delta: number, thorPos: THREE.Vector3, onHitThor: (damage: number) => void, triggerShake: () => void) {
    // 1. Spatially face Thor
    const targetFacingRight = thorPos.x > this.position.x;
    this.facingRight = targetFacingRight;
    const targetRotY = this.facingRight ? Math.PI * 0.42 : -Math.PI * 0.42;
    this.model.rig.root.rotation.y = THREE.MathUtils.lerp(this.model.rig.root.rotation.y, targetRotY, delta * 8);

    // Dynamic head tracking toward Thor
    this.model.rig.targetLookAt = thorPos.clone().add(new THREE.Vector3(0, 1.4, 0));

    // 2. AI Decision Loop — generous 3.8s gap between attacks (easy mode)
    this.aiActionTimer += delta;
    if (this.aiActionTimer >= 3.8 && !this.animator.isLocked && this.hp > 0) {
      this.aiActionTimer = 0;
      this.executeAIBehavior(thorPos, onHitThor, triggerShake);
    }

    // Move smoothly if in moving state
    if (this.currentAIState === 'MOVING' && !this.animator.isLocked) {
      this.position.x += this.velocity.x * delta;
      this.position.x = THREE.MathUtils.clamp(this.position.x, -13, 13);
    }

    this.model.rig.root.position.copy(this.position);

    // 3. Update animator, cloak cloth dynamics, and shield
    this.animator.update(delta);
    this.model.update(delta, this.velocity);
  }

  private executeAIBehavior(thorPos: THREE.Vector3, onHitThor: (damage: number) => void, triggerShake: () => void) {
    const dist = this.position.distanceTo(thorPos);

    // Random choice based on tactical situation
    const roll = Math.random();

    // Easy mode: Doom mostly fires telegraphed blasts, rarely shields or teleports
    if (dist < 3.2 && roll < 0.2) {
      // Close range: Infrequent shield (only 20% chance)
      this.activateForceField();
    } else if (dist > 9.0 && roll < 0.2) {
      // Far range: Rarely teleports
      this.performTeleport(thorPos.x + (this.facingRight ? -5 : 5));
    } else if (roll < 0.65) {
      // Mostly fires energy blasts — highly telegraphed, slow
      this.fireEnergyBlast(thorPos, onHitThor);
    } else if (roll < 0.85) {
      // Occasional mystic eruption
      this.castMysticEruption(thorPos, onHitThor, triggerShake);
    } else {
      // Menacing walk — just repositions
      this.currentAIState = 'MOVING';
      const moveDir = Math.random() > 0.5 ? (this.facingRight ? 1 : -1) : (this.facingRight ? -1 : 1);
      this.velocity.x = moveDir * 1.4;
      this.animator.play('WALK', 1.2, true, false, () => {
        this.currentAIState = 'IDLE';
        this.animator.play('IDLE', 1.5, true);
      });
    }
  }

  public fireEnergyBlast(thorPos: THREE.Vector3, onHitThor: (damage: number) => void) {
    this.currentAIState = 'ATTACKING';
    this.animator.play('DOOM_BLAST', 0.9, false, true, () => {
      this.currentAIState = 'IDLE';
      this.animator.play('IDLE', 1.5, true);
    });

    // Sound & anticipation glow
    this.sound.playDoomShieldHum();

    // Impact / Release at 45% of animation
    this.animator.addKeyframeTrigger(0.45, () => {
      this.sound.playDoomPlasmaBlast();

      const spawnPos = this.position.clone().add(new THREE.Vector3(this.facingRight ? 0.9 : -0.9, 1.4, 0));
      const targetPos = thorPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      const dir = targetPos.clone().sub(spawnPos).normalize();

      const proj = this.fx.spawnDoomPlasmaBlast(spawnPos, dir);

      // Check collision with Thor in tick loop
      const checkHit = setInterval(() => {
        if (!proj.mesh.parent) {
          clearInterval(checkHit);
          return;
        }
        // Hit window increased to give player time to dodge (1.8 radius)
        if (proj.mesh.position.distanceTo(targetPos) < 1.8) {
          this.fx.spawnHitSparks(targetPos, 0x44ff77, 24);
          onHitThor(30); // Reduced: was 60
          proj.life = proj.maxLife;
          clearInterval(checkHit);
        }
      }, 30);
    });
  }

  public castMysticEruption(thorPos: THREE.Vector3, onHitThor: (damage: number) => void, triggerShake: () => void) {
    this.currentAIState = 'ATTACKING';
    this.model.setMysticGlyphsActive(true);

    this.animator.play('DOOM_MYSTIC', 1.4, false, true, () => {
      this.model.setMysticGlyphsActive(false);
      this.currentAIState = 'IDLE';
      this.animator.play('IDLE', 1.5, true);
    });

    this.sound.playMysticChant();

    // Trigger green mystic eruption at Thor's ground position at 55%
    this.animator.addKeyframeTrigger(0.55, () => {
      const trapPos = thorPos.clone();
      trapPos.y = 0;
      this.sound.playDoomPlasmaBlast();
      triggerShake();

      this.fx.spawnGroundShockwave(trapPos, 0x33ff66);
      this.fx.spawnCosmicBeam(trapPos.clone().add(new THREE.Vector3(0, 8, 0)), trapPos, 0x33ff77, 0.7);

      // Wide-area eruption but low damage — gives time to dodge
      if (thorPos.distanceTo(trapPos) < 1.6) {
        onHitThor(55); // Reduced: was 110
      }
    });
  }

  public activateForceField() {
    this.currentAIState = 'DEFENDING';
    this.isShielded = true;
    this.model.setShieldActive(true);
    this.sound.playDoomShieldHum();

    this.animator.play('DOOM_SHIELD', 1.2, false, true, () => {
      this.isShielded = false;
      this.model.setShieldActive(false);
      this.currentAIState = 'IDLE';
      this.animator.play('IDLE', 1.5, true);
    });
  }

  public performTeleport(targetX: number) {
    this.animator.play('DOOM_TELEPORT', 0.6, false, true, () => {
      this.position.x = THREE.MathUtils.clamp(targetX, -12, 12);
      this.sound.playWhoosh(1.4);
      this.fx.spawnGroundShockwave(this.position, 0x44ff88);
      this.animator.play('IDLE', 1.5, true);
    });
  }

  public takeDamage(amount: number) {
    if (this.isShielded) {
      // Mitigate 80% damage
      this.hp = Math.max(0, this.hp - Math.floor(amount * 0.2));
      this.sound.playDoomShieldHum();
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.sound.playHitImpact();

    if (this.hp > 0) {
      this.animator.play('HIT_REACT', 0.25, false, true, () => {
        this.animator.play('IDLE', 1.5, true);
      });
    } else {
      this.animator.play('VICTORY', 3.0, true, true);
    }
  }
}
