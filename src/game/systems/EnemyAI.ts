import Phaser from "phaser";
import type { ArrowType } from "../types";
import type { EnemyArcher } from "../entities/EnemyArcher";
import type { PlayerArcher } from "../entities/PlayerArcher";
import type { Arrow } from "../entities/Arrow";

type AIState = "idle" | "aiming" | "drawing" | "shooting" | "cooldown";

export class EnemyAI {
  state: AIState = "idle";
  timer = 0;
  targetPoint = new Phaser.Math.Vector2();

  constructor(private enemy: EnemyArcher, private player: PlayerArcher, private onShoot: (arrows: Arrow[]) => void) {
    this.timer = Phaser.Math.FloatBetween(0.6, 1.2);
  }

  update(dt: number): void {
    if (this.enemy.isDead || this.player.isDead) return;
    this.timer -= dt;

    if (this.state === "idle" && this.timer <= 0) {
      this.state = "aiming";
      this.timer = Phaser.Math.FloatBetween(0.25, 0.55);
    }

    if (this.state === "aiming" && this.timer <= 0) {
      this.targetPoint = this.player.ragdoll.torso.position
        ? new Phaser.Math.Vector2(this.player.ragdoll.torso.position.x, this.player.ragdoll.torso.position.y - 10)
        : new Phaser.Math.Vector2(220, 440);
      const aim = this.solveAim();
      this.enemy.startDraw(aim);
      this.state = "drawing";
      this.timer = this.enemy.config.drawTime;
    }

    if (this.state === "drawing") {
      this.enemy.updateDraw(this.solveAim());
      if (this.timer <= 0) {
        this.state = "shooting";
      }
    }

    if (this.state === "shooting") {
      const type: ArrowType = this.enemy.kind === "heavy" ? "heavy" : Math.random() < 0.18 ? "fire" : "normal";
      this.onShoot(this.enemy.releaseArrow(type));
      this.state = "cooldown";
      this.timer = this.enemy.config.cooldown + Phaser.Math.FloatBetween(0.1, 0.8);
    }

    if (this.state === "cooldown" && this.timer <= 0) {
      this.state = "idle";
      this.timer = Phaser.Math.FloatBetween(0.4, 0.9);
    }
  }

  private solveAim(): Phaser.Math.Vector2 {
    const origin = this.enemy.getBowOrigin();
    const dx = this.targetPoint.x - origin.x;
    const speed = Phaser.Math.Clamp(860 + Math.abs(dx) * 0.12, 720, 1160);
    const t = Phaser.Math.Clamp(Math.abs(dx) / speed, 0.7, 1.6);
    const vy = (this.targetPoint.y - origin.y - 0.5 * 980 * t * t) / t;
    const vx = dx / t;
    const angle = Math.atan2(vy, vx) + Phaser.Math.FloatBetween(-this.enemy.config.aimError, this.enemy.config.aimError);
    const pull = Phaser.Math.Clamp(speed / 6, 80, 180);
    return origin.clone().subtract(new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(pull));
  }
}
