import Phaser from "phaser";
import type { ArrowType } from "../types";
import type { PlayerArcher } from "../entities/PlayerArcher";
import type { Arrow } from "../entities/Arrow";

export class InputSystem {
  private pointerWorld = new Phaser.Math.Vector2();
  arrowTypes: ArrowType[] = ["normal", "heavy", "triple", "fire", "poison"];
  arrowIndex = 0;

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerArcher,
    private onShoot: (arrows: Arrow[]) => void,
    private canPlay: () => boolean
  ) {
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.keyboard?.on("keydown-SPACE", () => this.player.jumpDodge());
    scene.input.keyboard?.on("keydown-R", () => scene.events.emit("restart-request"));
    scene.input.keyboard?.on("keydown-Q", () => this.switchArrow());
  }

  get currentArrowType(): ArrowType {
    return this.arrowTypes[this.arrowIndex];
  }

  switchArrow(): void {
    this.arrowIndex = (this.arrowIndex + 1) % this.arrowTypes.length;
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.canPlay()) return;
    this.pointerWorld.set(pointer.worldX, pointer.worldY);
    if (this.pointerWorld.distance(this.player.getBowOrigin()) < 190) {
      this.player.startDraw(this.pointerWorld);
    }
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.canPlay()) return;
    this.pointerWorld.set(pointer.worldX, pointer.worldY);
    this.player.updateDraw(this.pointerWorld);
  }

  private onUp(): void {
    if (!this.canPlay()) return;
    this.onShoot(this.player.releaseArrow(this.currentArrowType));
  }
}
