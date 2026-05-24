import Phaser from "phaser";
import { MatterBody } from "../physics/matterBody";
import type { ArrowBodyData, ArrowType, Team } from "../types";

const arrowStats: Record<ArrowType, { damage: number; penetration: number; speed: number; ttl: number; color: number }> = {
  normal: { damage: 42, penetration: 38, speed: 1, ttl: 6500, color: 0xf4f7fb },
  heavy: { damage: 62, penetration: 70, speed: 0.78, ttl: 7000, color: 0xffbf4d },
  triple: { damage: 30, penetration: 28, speed: 0.95, ttl: 5600, color: 0x9bd3ff },
  fire: { damage: 32, penetration: 34, speed: 0.9, ttl: 6000, color: 0xff6a32 },
  poison: { damage: 26, penetration: 32, speed: 0.94, ttl: 6000, color: 0x65e878 }
};

export class Arrow {
  body: MatterJS.BodyType;
  damageBase: number;
  penetrationPower: number;
  hasHit = false;
  stuckTo?: MatterJS.BodyType;
  createdAt = 0;
  ttl: number;
  poisonTime = 0;
  fireTime = 0;
  color: number;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    velocity: Phaser.Math.Vector2,
    public owner: Team,
    public type: ArrowType
  ) {
    const stat = arrowStats[type];
    const length = type === "heavy" ? 58 : 48;
    const height = type === "heavy" ? 7 : 5;
    this.damageBase = stat.damage;
    this.penetrationPower = stat.penetration;
    this.ttl = stat.ttl;
    this.color = stat.color;
    this.createdAt = scene.time.now;

    this.body = scene.matter.add.rectangle(x, y, length, height, {
      frictionAir: 0.002,
      friction: 0.2,
      restitution: 0.05,
      label: `${owner}-arrow`
    }) as MatterJS.BodyType;
    const data: ArrowBodyData = { arrow: this };
    this.body.plugin = { ...(this.body.plugin ?? {}), arrowData: data };
    MatterBody.setVelocity(this.body, {
      x: velocity.x * stat.speed,
      y: velocity.y * stat.speed
    });
    MatterBody.setAngle(this.body, velocity.angle());
  }

  update(): boolean {
    if (!this.hasHit) {
      const velocity = this.body.velocity;
      if (Math.abs(velocity.x) + Math.abs(velocity.y) > 0.8) {
        MatterBody.setAngle(this.body, Math.atan2(velocity.y, velocity.x));
      }
    } else if (this.stuckTo) {
      MatterBody.setVelocity(this.body, this.stuckTo.velocity);
    }

    return this.scene.time.now - this.createdAt < this.ttl;
  }

  impactSpeed(): number {
    return Math.hypot(this.body.velocity.x, this.body.velocity.y) * 60;
  }

  stickTo(body?: MatterJS.BodyType): void {
    if (this.hasHit) return;
    this.hasHit = true;
    this.stuckTo = body;
    MatterBody.setStatic(this.body, Boolean(!body));
    MatterBody.setVelocity(this.body, { x: 0, y: 0 });
  }

  destroy(): void {
    this.scene.matter.world.remove(this.body);
  }
}
