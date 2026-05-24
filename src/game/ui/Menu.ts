import Phaser from "phaser";

export class Menu {
  container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onStart: () => void, onHow: () => void, onSound: () => void, onFull: () => void) {
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;
    const panel = scene.add.rectangle(0, 0, 520, 360, 0x0f1420, 0.88).setStrokeStyle(2, 0x6ebeff, 0.35);
    const title = scene.add.text(0, -120, "Physics Bow Duel", {
      fontFamily: "system-ui",
      fontSize: "42px",
      fontStyle: "900",
      color: "#f4f7fb"
    }).setOrigin(0.5);
    const sub = scene.add.text(0, -70, "Original procedural ragdoll archer survival", {
      fontFamily: "system-ui",
      fontSize: "15px",
      color: "#9ba6b8"
    }).setOrigin(0.5);
    this.container = scene.add.container(cx, cy, [panel, title, sub]).setDepth(1200).setScrollFactor(0);
    this.container.add(this.button(scene, 0, -15, "Start", onStart));
    this.container.add(this.button(scene, 0, 52, "How to Play", onHow));
    this.container.add(this.button(scene, -112, 122, "Sound", onSound, 180));
    this.container.add(this.button(scene, 112, 122, "Fullscreen", onFull, 180));
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private button(scene: Phaser.Scene, x: number, y: number, label: string, cb: () => void, w = 260): Phaser.GameObjects.Container {
    const bg = scene.add.rectangle(0, 0, w, 48, 0x151d2b, 0.95).setStrokeStyle(2, 0xffbf4d, 0.5);
    const tx = scene.add.text(0, 0, label, {
      fontFamily: "system-ui",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f4f7fb"
    }).setOrigin(0.5);
    const c = scene.add.container(x, y, [bg, tx]).setSize(w, 48).setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    return c;
  }
}
