import Phaser from "phaser";
import { Archer } from "./Archer";
import { MatterBody } from "../physics/matterBody";
import type { UpgradeState } from "../types";

export class PlayerArcher extends Archer {
  constructor(scene: Phaser.Scene, x: number, groundY: number, upgrades: UpgradeState) {
    super(scene, "player", x, groundY, 1, { hp: 100, scale: 1 }, upgrades);
  }

  jumpDodge(): void {
    if (this.isDead) return;
    const torso = this.ragdoll.torso;
    if (torso.position.y > this.groundY - 150) {
      MatterBody.applyForce(torso, torso.position, { x: -0.018, y: -0.07 });
    }
  }
}
