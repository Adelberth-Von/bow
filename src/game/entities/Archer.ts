import Phaser from "phaser";
import { Arrow } from "./Arrow";
import { Ragdoll } from "../physics/Ragdoll";
import type { ArrowType, EnemyConfig, Team, UpgradeState } from "../types";

export interface BowState {
  isDrawing: boolean;
  drawPower: number;
  aimAngle: number;
  drawPoint: Phaser.Math.Vector2;
  recoil: number;
}

export class Archer {
  id: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  ragdoll: Ragdoll;
  bowState: BowState;
  isDead = false;
  helmetDurability = 0;
  shieldDurability = 0;
  hasTorsoArmor = false;
  poisonTimer = 0;
  fireTimer = 0;
  arrowDamageBonus = 1;
  penetrationBonus = 1;
  drawSpeed = 1;

  constructor(
    protected scene: Phaser.Scene,
    public team: Team,
    x: number,
    public groundY: number,
    public facing: number,
    config?: Partial<EnemyConfig>,
    upgrades?: UpgradeState
  ) {
    this.id = `${team}-${Phaser.Math.RND.uuid()}`;
    const hpBonus = team === "player" ? upgrades?.maxHpBonus ?? 0 : 0;
    const staminaBonus = team === "player" ? upgrades?.maxStaminaBonus ?? 0 : 0;
    this.maxHp = (config?.hp ?? 100) + hpBonus;
    this.hp = this.maxHp;
    this.maxStamina = 100 + staminaBonus;
    this.stamina = this.maxStamina;
    this.arrowDamageBonus = upgrades?.damageMultiplier ?? 1;
    this.penetrationBonus = upgrades?.penetrationMultiplier ?? 1;
    this.drawSpeed = upgrades?.drawSpeedMultiplier ?? 1;

    this.ragdoll = new Ragdoll(scene, this, x, groundY, config?.scale ?? 1, facing, Boolean(config?.torsoArmor));
    this.helmetDurability = config?.helmet ?? 0;
    this.shieldDurability = config?.shield ?? 0;
    this.hasTorsoArmor = Boolean(config?.torsoArmor);
    this.ragdoll.setArmorVisuals(this.helmetDurability > 0, this.shieldDurability > 0, this.hasTorsoArmor);

    this.bowState = {
      isDrawing: false,
      drawPower: 0,
      aimAngle: facing > 0 ? 0 : Math.PI,
      drawPoint: new Phaser.Math.Vector2(x, groundY - 110),
      recoil: 0
    };
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    if (!this.isDead) {
      this.ragdoll.updateAliveStabilizer(dt);
      this.stamina = Math.min(this.maxStamina, this.stamina + 15 * dt);
      this.bowState.recoil = Math.max(0, this.bowState.recoil - dt * 5);
      this.updateStatusEffects(dt);
    }
  }

  startDraw(point: Phaser.Math.Vector2): void {
    if (this.isDead) return;
    this.bowState.isDrawing = true;
    this.updateDraw(point);
  }

  updateDraw(point: Phaser.Math.Vector2): void {
    if (!this.bowState.isDrawing || this.isDead) return;
    const origin = this.getBowOrigin();
    const drag = origin.clone().subtract(point);
    const maxPull = Phaser.Math.Linear(80, 190, this.stamina / this.maxStamina);
    const len = Phaser.Math.Clamp(drag.length(), 0, maxPull);
    const angle = drag.lengthSq() > 1 ? drag.angle() : this.bowState.aimAngle;
    this.bowState.aimAngle = angle;
    this.bowState.drawPower = Phaser.Math.Linear(this.bowState.drawPower, len / maxPull, 0.38 * this.drawSpeed);
    this.bowState.drawPoint = origin.clone().subtract(new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(len));
    this.stamina = Math.max(0, this.stamina - 7 / 60);
  }

  releaseArrow(type: ArrowType): Arrow[] {
    if (this.isDead || this.bowState.drawPower < 0.08) return [];
    const origin = this.getBowOrigin();
    const basePower = Phaser.Math.Linear(360, 1220, this.bowState.drawPower);
    const angle = this.bowState.aimAngle;
    const types = type === "triple" ? [-0.07, 0, 0.07] : [0];
    const arrows = types.map((spread) => {
      const vel = new Phaser.Math.Vector2(Math.cos(angle + spread), Math.sin(angle + spread)).scale(basePower);
      const arrow = new Arrow(this.scene, origin.x, origin.y, vel, this.team, type === "triple" ? "triple" : type);
      arrow.damageBase *= this.arrowDamageBonus;
      arrow.penetrationPower *= this.penetrationBonus;
      return arrow;
    });
    this.bowState.isDrawing = false;
    this.bowState.drawPower = 0;
    this.bowState.recoil = 1;
    return arrows;
  }

  takeDamage(amount: number): void {
    if (this.isDead || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.bowState.isDrawing = false;
    this.ragdoll.die();
  }

  applyImpulse(body: MatterJS.BodyType, powerX: number, powerY: number): void {
    this.ragdoll.applyImpulse(body, powerX, powerY);
  }

  getBowOrigin(): Phaser.Math.Vector2 {
    const torso = this.ragdoll.torso.position;
    return new Phaser.Math.Vector2(
      torso.x + this.facing * (40 - this.bowState.recoil * 12),
      torso.y - 30
    );
  }

  private updateStatusEffects(dt: number): void {
    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.takeDamage(5 * dt);
    }
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
      this.takeDamage(7 * dt);
    }
  }
}
