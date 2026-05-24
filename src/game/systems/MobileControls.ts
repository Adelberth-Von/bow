import Phaser from "phaser";

export class MobileControls {
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor(
    private scene: Phaser.Scene,
    private onDodge: () => void,
    private onSwitch: () => void,
    private onPause: () => void
  ) {
    this.createButtons();
    scene.scale.on("resize", this.layout, this);
  }

  destroy(): void {
    this.scene.scale.off("resize", this.layout, this);
    this.buttons.forEach((button) => button.destroy());
  }

  private createButtons(): void {
    this.buttons.push(this.makeButton(88, 0, "DODGE", this.onDodge));
    this.buttons.push(this.makeButton(0, 0, "TYPE", this.onSwitch));
    this.buttons.push(this.makeButton(0, 74, "PAUSE", this.onPause));
    this.layout();
  }

  private makeButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const circle = this.scene.add.circle(0, 0, 42, 0x111827, 0.72).setStrokeStyle(2, 0x6ebeff, 0.65);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: "system-ui",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#f4f7fb"
    }).setOrigin(0.5);
    const c = this.scene.add.container(x, y, [circle, text]).setScrollFactor(0).setDepth(1000);
    c.setSize(84, 84).setInteractive({ useHandCursor: true });
    c.on("pointerdown", callback);
    return c;
  }

  private layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.buttons[0].setPosition(86, height - 82);
    this.buttons[1].setPosition(width - 88, height - 82);
    this.buttons[2].setPosition(width - 80, 76);
  }
}
