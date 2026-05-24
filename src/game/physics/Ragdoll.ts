import Phaser from "phaser";
import { MatterBody } from "./matterBody";
import { BodyPart } from "./BodyPart";
import type { Archer } from "../entities/Archer";
import type { ArmorKind } from "../types";

type JointPair = [MatterJS.BodyType, MatterJS.BodyType, number, number, number, number];

export class Ragdoll {
  parts: BodyPart[] = [];
  constraints: MatterJS.ConstraintType[] = [];
  shieldBody?: MatterJS.BodyType;
  helmetBody?: MatterJS.BodyType;
  alive = true;

  constructor(
    private scene: Phaser.Scene,
    private archer: Archer,
    x: number,
    y: number,
    scale: number,
    facing: number,
    torsoArmor: boolean
  ) {
    const matter = this.scene.matter;
    const group = matter.world.nextGroup(true);
    const opts = {
      collisionFilter: { group },
      frictionAir: 0.12,
      friction: 0.9,
      restitution: 0.08
    };

    const torso = matter.add.rectangle(x, y - 96 * scale, 26 * scale, 72 * scale, opts) as MatterJS.BodyType;
    const head = matter.add.circle(x, y - 160 * scale, 22 * scale, opts) as MatterJS.BodyType;
    const upperArmL = this.limb(x + 22 * facing * scale, y - 125 * scale, 38 * scale, 10 * scale, -0.45 * facing, opts);
    const forearmL = this.limb(x + 50 * facing * scale, y - 106 * scale, 38 * scale, 9 * scale, 0.15 * facing, opts);
    const upperArmR = this.limb(x - 22 * facing * scale, y - 124 * scale, 34 * scale, 9 * scale, 0.3 * facing, opts);
    const forearmR = this.limb(x - 42 * facing * scale, y - 100 * scale, 34 * scale, 8 * scale, 0.52 * facing, opts);
    const upperLegL = this.limb(x - 11 * scale, y - 48 * scale, 44 * scale, 11 * scale, 1.18, opts);
    const lowerLegL = this.limb(x - 23 * scale, y - 14 * scale, 42 * scale, 10 * scale, 1.4, opts);
    const upperLegR = this.limb(x + 13 * scale, y - 48 * scale, 44 * scale, 11 * scale, -1.05, opts);
    const lowerLegR = this.limb(x + 28 * scale, y - 13 * scale, 42 * scale, 10 * scale, -1.25, opts);

    this.parts = [
      new BodyPart(this.archer, "torso", torso, torsoArmor ? "torsoArmor" : "none", 16 * scale, 72 * scale),
      new BodyPart(this.archer, "head", head, "none", 22 * scale, 44 * scale),
      new BodyPart(this.archer, "upperArm", upperArmL, "none", 8 * scale, 38 * scale),
      new BodyPart(this.archer, "forearm", forearmL, "none", 8 * scale, 38 * scale),
      new BodyPart(this.archer, "upperArm", upperArmR, "none", 8 * scale, 34 * scale),
      new BodyPart(this.archer, "forearm", forearmR, "none", 8 * scale, 34 * scale),
      new BodyPart(this.archer, "upperLeg", upperLegL, "none", 10 * scale, 44 * scale),
      new BodyPart(this.archer, "lowerLeg", lowerLegL, "none", 9 * scale, 42 * scale),
      new BodyPart(this.archer, "upperLeg", upperLegR, "none", 10 * scale, 44 * scale),
      new BodyPart(this.archer, "lowerLeg", lowerLegR, "none", 9 * scale, 42 * scale)
    ];

    const joints: JointPair[] = [
      [head, torso, 0, 18 * scale, 0, -38 * scale],
      [upperArmL, torso, -16 * scale, 0, 12 * facing * scale, -28 * scale],
      [forearmL, upperArmL, -17 * scale, 0, 18 * scale, 0],
      [upperArmR, torso, 15 * scale, 0, -12 * facing * scale, -28 * scale],
      [forearmR, upperArmR, 16 * scale, 0, -17 * scale, 0],
      [upperLegL, torso, -18 * scale, 0, -8 * scale, 34 * scale],
      [lowerLegL, upperLegL, -19 * scale, 0, 19 * scale, 0],
      [upperLegR, torso, 17 * scale, 0, 8 * scale, 34 * scale],
      [lowerLegR, upperLegR, 19 * scale, 0, -19 * scale, 0]
    ];

    for (const [a, b, ax, ay, bx, by] of joints) {
      this.constraints.push(
        matter.add.constraint(a, b, 0, 0.82, {
          pointA: { x: ax, y: ay },
          pointB: { x: bx, y: by },
          damping: 0.18
        }) as MatterJS.ConstraintType
      );
    }
  }

  get torso(): MatterJS.BodyType {
    return this.parts[0].body;
  }

  get head(): MatterJS.BodyType {
    return this.parts[1].body;
  }

  setArmorVisuals(helmet: boolean, shield: boolean, armor: boolean): void {
    if (helmet && !this.helmetBody) {
      const h = this.scene.matter.add.rectangle(this.head.position.x, this.head.position.y - 18, 48, 12, {
        isSensor: false,
        frictionAir: 0.14
      }) as MatterJS.BodyType;
      h.label = `${this.archer.team}-helmet`;
      h.plugin = { ...(h.plugin ?? {}), helmetData: { archer: this.archer, armor: "helmet" as ArmorKind } };
      this.helmetBody = h;
      this.constraints.push(this.scene.matter.add.constraint(h, this.head, 0, 0.9, { damping: 0.25 }) as MatterJS.ConstraintType);
    }

    if (shield && !this.shieldBody) {
      const hand = this.parts[3].body;
      const sh = this.scene.matter.add.rectangle(hand.position.x + this.archer.facing * 28, hand.position.y, 18, 74, {
        frictionAir: 0.12
      }) as MatterJS.BodyType;
      sh.label = `${this.archer.team}-shield`;
      sh.plugin = { ...(sh.plugin ?? {}), shieldData: { archer: this.archer, armor: "shield" as const } };
      this.shieldBody = sh;
      this.constraints.push(this.scene.matter.add.constraint(sh, hand, 16, 0.8, { damping: 0.24 }) as MatterJS.ConstraintType);
    }

    if (armor) {
      this.parts[0].armor = "torsoArmor";
    }
  }

  updateAliveStabilizer(dt: number): void {
    if (!this.alive) return;
    const torso = this.torso;
    const uprightTorque = Phaser.Math.Angle.Wrap(0 - torso.angle) * 0.018;
    MatterBody.setAngularVelocity(torso, torso.angularVelocity + uprightTorque);
    MatterBody.setVelocity(torso, {
      x: torso.velocity.x * 0.94,
      y: torso.velocity.y
    });
    if (torso.position.y > this.archer.groundY - 88) {
      MatterBody.setPosition(torso, {
        x: torso.position.x,
        y: Phaser.Math.Linear(torso.position.y, this.archer.groundY - 104, dt * 4)
      });
    }
  }

  die(): void {
    this.alive = false;
    for (const p of this.parts) {
      MatterBody.set(p.body, { frictionAir: 0.035 });
    }
  }

  applyImpulse(body: MatterJS.BodyType, x: number, y: number): void {
    MatterBody.applyForce(body, body.position, { x, y });
  }

  private limb(
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number,
    opts: Phaser.Types.Physics.Matter.MatterBodyConfig
  ): MatterJS.BodyType {
    const body = this.scene.matter.add.rectangle(x, y, width, height, opts) as MatterJS.BodyType;
    MatterBody.setAngle(body, angle);
    return body;
  }
}
