import * as THREE from 'three';
import { ThorModel } from './ThorModel';
import { CharacterAnimator } from './CharacterAnimator';
import { SoundSystem } from '../audio/SoundSystem';
import { FXSystem } from '../effects/FXSystem';

export class ThorCharacter {
  public model: ThorModel;
  public animator: CharacterAnimator;
  public position: THREE.Vector3 = new THREE.Vector3(-4.0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  
  public hp: number = 1000;
  public maxHp: number = 1000;
  public isGrounded: boolean = true;
  public facingRight: boolean = true;
  public comboStep: number = 0;
  public lastAttackTime: number = 0;
  public isInvulnerable: boolean = false;

  // Ability Cooldowns
  public lightningCooldown: number = 0;
  public ultimateCooldown: number = 0;
  private sound: SoundSystem;
  private fx: FXSystem;

  constructor(scene: THREE.Scene, sound: SoundSystem, fx: FXSystem) {
    this.sound = sound;
    this.fx = fx;
    this.model = new ThorModel();
    this.animator = new CharacterAnimator(this.model.rig, true);
    this.model.rig.root.position.copy(this.position);
    scene.add(this.model.rig.root);

    this.animator.play('IDLE', 1.5, true);
  }

  public update(delta: number, doomPos: THREE.Vector3, input: { left: boolean; right: boolean; jump: boolean; dodge: boolean }) {
    // 1. Ability Cooldown timers
    if (this.lightningCooldown > 0) this.lightningCooldown -= delta;
    if (this.ultimateCooldown > 0) this.ultimateCooldown -= delta;

    // 2. Spatial recognition & facing
    const targetFacingRight = doomPos.x > this.position.x;
    this.facingRight = targetFacingRight;
    const targetRotY = this.facingRight ? Math.PI * 0.42 : -Math.PI * 0.42;
    this.model.rig.root.rotation.y = THREE.MathUtils.lerp(this.model.rig.root.rotation.y, targetRotY, delta * 12);

    // Dynamic head tracking toward Doom
    this.model.rig.targetLookAt = doomPos.clone().add(new THREE.Vector3(0, 1.4, 0));

    // 3. Movement Physics (only if not locked in heavy attack)
    if (!this.animator.isLocked) {
      const speed = 5.5;
      if (input.left) {
        this.velocity.x = -speed;
        if (this.isGrounded) this.animator.play('RUN', 0.6, true);
      } else if (input.right) {
        this.velocity.x = speed;
        if (this.isGrounded) this.animator.play('RUN', 0.6, true);
      } else {
        this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 12, delta);
        if (this.isGrounded && this.animator.currentState === 'RUN') {
          this.animator.play('IDLE', 1.5, true);
        }
      }

      // Jump
      if (input.jump && this.isGrounded) {
        this.velocity.y = 8.5;
        this.isGrounded = false;
        this.sound.playWhoosh(1.2);
        this.animator.play('JUMP_START', 0.3, false, false, () => {
          this.animator.play('JUMP_AIR', 0.8, true);
        });
      }

      // Dodge
      if (input.dodge && this.isGrounded) {
        this.performDodge();
      }
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 8, delta);
    }

    // Gravity
    this.velocity.y -= 22 * delta;
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;

    // Arena boundary clamp
    this.position.x = THREE.MathUtils.clamp(this.position.x, -14, 14);

    // Ground collision
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (!this.isGrounded) {
        this.isGrounded = true;
        if (this.animator.currentState === 'JUMP_AIR') {
          this.animator.play('LANDING', 0.25, false, false, () => {
            this.animator.play('IDLE', 1.5, true);
          });
        }
      }
      this.velocity.y = 0;
    }

    this.model.rig.root.position.copy(this.position);

    // Update animations, rig spring dynamics, and cape physics
    this.animator.update(delta);
    this.model.update(delta, this.velocity);
  }

  public performLightAttack(onHitDoom: (damage: number) => void, doomPos: THREE.Vector3) {
    if (this.animator.isLocked) return;

    const now = performance.now();
    // Wider combo window: 1300ms for easier chaining
    if (now - this.lastAttackTime < 1300) {
      this.comboStep = (this.comboStep + 1) % 3;
    } else {
      this.comboStep = 0;
    }
    this.lastAttackTime = now;

    const states = ['LIGHT_ATTACK_1', 'LIGHT_ATTACK_2', 'LIGHT_ATTACK_3'] as const;
    const animState = states[this.comboStep];
    const duration = this.comboStep === 2 ? 0.55 : 0.38;

    this.animator.play(animState, duration, false, true, () => {
      this.animator.play('IDLE', 1.5, true);
    });

    this.sound.playWhoosh(1.0 + this.comboStep * 0.2);

    // Impact keyframe: 50% — generous 3.5-unit hit range
    this.animator.addKeyframeTrigger(0.5, () => {
      const dist = this.position.distanceTo(doomPos);
      if (dist < 3.5) {
        const dmg = this.comboStep === 2 ? 120 : 70; // Boosted: was 85/45
        this.sound.playHeavyAxeImpact();
        this.fx.spawnHitSparks(doomPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x55ccff, 24);
        onHitDoom(dmg);
      }
    });
  }

  public performHeavyStrike(onHitDoom: (damage: number) => void, doomPos: THREE.Vector3) {
    if (this.animator.isLocked) return;

    this.animator.play('HEAVY_STRIKE', 0.85, false, true, () => {
      this.animator.play('IDLE', 1.5, true);
    });

    this.sound.playWhoosh(0.7);

    // Impact at 55%
    this.animator.addKeyframeTrigger(0.55, () => {
      this.sound.playHeavyAxeImpact();
      this.sound.playThunderCrack();
      
      const impactPos = this.position.clone().add(new THREE.Vector3(this.facingRight ? 1.4 : -1.4, 0, 0));
      this.fx.spawnGroundShockwave(impactPos, 0x66ddff);
      this.fx.spawnLightningBolt(impactPos.clone().add(new THREE.Vector3(0, 7, 0)), impactPos);

      const dist = this.position.distanceTo(doomPos);
      if (dist < 4.5) { // Wider heavy strike range
        this.fx.spawnHitSparks(doomPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xaaddff, 36);
        onHitDoom(200); // Boosted: was 140
      }
    });
  }

  public performLightningSlam(onHitDoom: (damage: number) => void, doomPos: THREE.Vector3): boolean {
    if (this.animator.isLocked || this.lightningCooldown > 0) return false;
    this.lightningCooldown = 2.0; // Reduced from 3.5 — faster recharge

    this.model.setLightningAura(true, 1.5);

    this.animator.play('SPECIAL_LIGHTNING', 1.0, false, true, () => {
      this.model.setLightningAura(false);
      this.animator.play('IDLE', 1.5, true);
    });

    this.sound.playThunderCrack();

    // Impact at 55%
    this.animator.addKeyframeTrigger(0.55, () => {
      this.sound.playHeavyAxeImpact();
      this.sound.playThunderCrack();

      const impactPos = this.position.clone();
      this.fx.spawnGroundShockwave(impactPos, 0x44ccff);
      
      // Sky lightning bolts striking Doom and surroundings
      this.fx.spawnLightningBolt(new THREE.Vector3(doomPos.x, 9, 0), doomPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      this.fx.spawnLightningBolt(new THREE.Vector3(impactPos.x, 8, 0), impactPos);

      const dist = this.position.distanceTo(doomPos);
      if (dist < 7.0) { // Wide area — almost always hits
        onHitDoom(280); // Boosted: was 220
      }
    });

    return true;
  }

  public performUltimate(onHitDoom: (damage: number) => void, doomPos: THREE.Vector3, triggerShake: () => void): boolean {
    if (this.animator.isLocked || this.ultimateCooldown > 0) return false;
    this.ultimateCooldown = 6.0; // Reduced from 9.0 — recharges faster

    this.model.setLightningAura(true, 3.0);

    this.animator.play('ULTIMATE', 2.0, false, true, () => {
      this.model.setLightningAura(false);
      this.animator.play('IDLE', 1.5, true);
    });

    this.sound.playThunderCrack();
    triggerShake();

    // Thunder gathering at 40%
    this.animator.addKeyframeTrigger(0.4, () => {
      const axeTip = this.position.clone().add(new THREE.Vector3(0, 3.0, 0));
      this.fx.spawnLightningBolt(new THREE.Vector3(axeTip.x + 1, 12, 0), axeTip);
      this.sound.playThunderCrack();
      triggerShake();
    });

    // Massive impact discharge at 65%
    this.animator.addKeyframeTrigger(0.65, () => {
      this.sound.playThunderCrack();
      triggerShake();
      
      // Multiversal lightning fissures across entire arena
      for (let x = -8; x <= 8; x += 2.5) {
        this.fx.spawnLightningBolt(new THREE.Vector3(x, 10, 0), new THREE.Vector3(x, 0, 0));
        this.fx.spawnGroundShockwave(new THREE.Vector3(x, 0, 0), 0x77eeff);
      }
      this.fx.spawnLightningBolt(new THREE.Vector3(doomPos.x, 12, 0), doomPos.clone().add(new THREE.Vector3(0, 1.2, 0)));

      onHitDoom(400);
    });

    return true;
  }

  public performDodge() {
    this.isInvulnerable = true;
    this.velocity.x = this.facingRight ? 9.0 : -9.0;
    this.sound.playWhoosh(1.5);
    
    this.animator.play('DODGE', 0.35, false, true, () => {
      this.isInvulnerable = false;
      this.animator.play('IDLE', 1.5, true);
    });
  }

  public takeDamage(amount: number) {
    if (this.isInvulnerable) return;

    this.hp = Math.max(0, this.hp - amount);
    this.sound.playHitImpact();

    if (this.hp > 0) {
      this.animator.play('HIT_REACT', 0.28, false, true, () => {
        this.animator.play('IDLE', 1.5, true);
      });
    } else {
      this.animator.play('KNOCKDOWN', 1.8, false, true);
    }
  }

  public triggerVictory() {
    this.animator.play('VICTORY', 3.0, true, true);
    this.model.setLightningAura(true, 1.5);
  }
}
