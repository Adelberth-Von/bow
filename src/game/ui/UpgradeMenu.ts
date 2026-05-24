import Phaser from "phaser";
import { UpgradeSystem } from "../systems/UpgradeSystem";

export class UpgradeMenu {
  container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, upgrades: UpgradeSystem, onContinue: () => void) {
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;
    const bg = scene.add.rectangle(0, 0, 580, 440, 0x0f1420, 0.92).setStrokeStyle(2, 0x65e878, 0.45);
    const title = scene.add.text(0, -180, `Upgrades   Coins: ${upgrades.coins}`, {
      fontFamily: "system-ui",
      fontSize: "30px",
      fontStyle: "bold",
      color: "#f4f7fb"
    }).setOrigin(0.5);
    this.container = scene.add.container(cx, cy, [bg, title]).setDepth(1300).setScrollFactor(0);

    const labels = ["Max HP +10", "Max stamina +10", "Arrow damage +10%", "Draw speed +10%", "Armor penetration +10%"];
    labels.forEach((label, i) => {
      this.container.add(this.button(scene, 0, -110 + i * 54, `${label}  (${2 + i} coins)`, () => {
        upgrades.buy(i);
        this.destroy();
        new UpgradeMenu(scene, upgrades, onContinue);
      }));
    });
    this.container.add(this.button(scene, 0, 178, "Continue", onContinue, 240, 0xffbf4d));
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private button(scene: Phaser.Scene, x: number, y: number, label: string, cb: () => void, w = 390, color = 0x6ebeff): Phaser.GameObjects.Container {
    const bg = scene.add.rectangle(0, 0, w, 42, 0x151d2b, 0.96).setStrokeStyle(2, color, 0.48);
    const tx = scene.add.text(0, 0, label, {
      fontFamily: "system-ui",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#f4f7fb"
    }).setOrigin(0.5);
    const c = scene.add.container(x, y, [bg, tx]).setSize(w, 42).setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    return c;
  }
}
