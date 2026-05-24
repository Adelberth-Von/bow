import Phaser from "phaser";
import { MatterBody } from "../physics/matterBody";
import type { PlayerArcher } from "./PlayerArcher";

export type PickupKind = "heal" | "energy" | "gold";

export class Pickup {
  body: MatterJS.BodyType;
  born = 0;

  constructor(private scene: Phaser.Scene, public kind: PickupKind, x: number, y: number) {
    this.body = scene.matter.add.circle(x, y, 16, {
      isSensor: true,
      ignoreGravity: true,
      label: `pickup-${kind}`
    }) as MatterJS.BodyType;
    this.body.plugin = { ...(this.body.plugin ?? {}), pickup: this };
    this.born = scene.time.now;
  }

  update(): boolean {
    const t = (this.scene.time.now - this.born) / 1000;
    MatterBody.setVelocity(this.body, {
      x: Math.sin(t * 1.7) * 0.28,
      y: Math.cos(t * 2.1) * 0.22
    });
    return t < 13;
  }

  apply(player: PlayerArcher): void {
    if (this.kind === "heal" || this.kind === "gold") {
      player.hp = Math.min(player.maxHp, player.hp + (this.kind === "gold" ? 35 : 24));
    }
    if (this.kind === "energy" || this.kind === "gold") {
      player.stamina = Math.min(player.maxStamina, player.stamina + (this.kind === "gold" ? 45 : 35));
    }
  }

  destroy(): void {
    this.scene.matter.world.remove(this.body);
  }
}
