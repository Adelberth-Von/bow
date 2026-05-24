import Phaser from "phaser";
import type { PlayerArcher } from "../entities/PlayerArcher";
import type { EnemyArcher } from "../entities/EnemyArcher";
import type { ArrowType } from "../types";

export class HUD {
  private graphics: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private rotateText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(900);
    this.text = scene.add.text(18, 16, "", {
      fontFamily: "system-ui",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f4f7fb"
    }).setScrollFactor(0).setDepth(901);
    this.rotateText = scene.add.text(scene.scale.width / 2, scene.scale.height - 24, "Rotate for best experience", {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffbf4d",
      backgroundColor: "rgba(7,8,13,0.6)",
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(901);
  }

  update(player: PlayerArcher, enemy: EnemyArcher | undefined, score: number, wave: number, kills: number, arrowType: ArrowType, coins: number): void {
    this.graphics.clear();
    this.bar(18, 54, 220, 14, player.hp / player.maxHp, 0xff4f5f);
    this.bar(18, 76, 220, 11, player.stamina / player.maxStamina, 0x65e878);
    if (enemy) {
      this.bar(this.scene.scale.width - 250, 54, 220, 14, enemy.hp / enemy.maxHp, 0xff4f5f);
      this.scene.add;
    }
    this.text.setText(`HP ${Math.ceil(player.hp)}/${player.maxHp}   STA ${Math.ceil(player.stamina)}   Wave ${wave}   Kills ${kills}   Score ${score}   Coins ${coins}   Arrow ${arrowType.toUpperCase()}`);
    this.rotateText.setVisible(this.scene.scale.height > this.scene.scale.width);
    this.rotateText.setPosition(this.scene.scale.width / 2, this.scene.scale.height - 24);
  }

  destroy(): void {
    this.graphics.destroy();
    this.text.destroy();
    this.rotateText.destroy();
  }

  private bar(x: number, y: number, w: number, h: number, fill: number, color: number): void {
    this.graphics.fillStyle(0x07080d, 0.82).fillRoundedRect(x, y, w, h, 4);
    this.graphics.fillStyle(color, 0.9).fillRoundedRect(x, y, Math.max(0, w * Phaser.Math.Clamp(fill, 0, 1)), h, 4);
    this.graphics.lineStyle(1, 0xffffff, 0.25).strokeRoundedRect(x, y, w, h, 4);
  }
}
