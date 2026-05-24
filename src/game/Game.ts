import { AudioFx } from "./Audio";
import { Board } from "./Board";
import { COLS, PIECE_IDS, SCORE_TABLE, type PieceId } from "./constants";
import { Input, type Action } from "./Input";
import { Piece } from "./Piece";
import { Renderer } from "./Renderer";
import { Storage } from "./Storage";
import { UI } from "./UI";

export interface GameSnapshot {
  score: number;
  highScore: number;
  level: number;
  lines: number;
  hold: Piece | null;
  next: Piece[];
}

type GameState = "menu" | "playing" | "paused" | "gameover";

export class Game {
  private board = new Board();
  private renderer: Renderer;
  private ui: UI;
  private input: Input;
  private audio = new AudioFx();
  private active: Piece | null = null;
  private queue: PieceId[] = [];
  private holdId: PieceId | null = null;
  private canHold = true;
  private score = 0;
  private lines = 0;
  private level = 1;
  private highScore = Storage.getHighScore();
  private state: GameState = "menu";
  private lastTime = 0;
  private dropAccumulator = 0;
  private clearRows: number[] = [];
  private clearTimer = 0;
  private hardDropFlash = 0;

  constructor(private root: HTMLElement) {
    const temp = document.createElement("div");
    this.renderer = new Renderer(temp);
    this.ui = new UI(root, this.renderer);
    this.input = new Input(this.ui.root, (action) => this.handleAction(action));
    this.showMenu();
  }

  start(): void {
    requestAnimationFrame((time) => this.loop(time));
  }

  private showMenu(): void {
    this.state = "menu";
    this.ui.showOverlay(
      "Block Drop Puzzle",
      "Clear full rows, hold a piece, use ghost placement, and survive the rising speed. Desktop: arrows, Z/X, Space, C, P. Mobile: use the big buttons.",
      "Start Game",
      () => this.restart()
    );
    this.updateUi();
  }

  private restart(): void {
    this.board.reset();
    this.queue = [];
    this.holdId = null;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropAccumulator = 0;
    this.clearRows = [];
    this.clearTimer = 0;
    this.hardDropFlash = 0;
    this.state = "playing";
    this.ui.hideOverlay();
    this.refillQueue();
    this.spawnPiece();
    this.updateUi();
  }

  private loop(time: number): void {
    const delta = Math.min(50, time - this.lastTime || 16.67);
    this.lastTime = time;
    this.update(delta);
    this.renderer.render(this.board, this.active, this.getGhostPiece(), this.clearRows, this.hardDropFlash);
    requestAnimationFrame((next) => this.loop(next));
  }

  private update(deltaMs: number): void {
    this.hardDropFlash = Math.max(0, this.hardDropFlash - deltaMs / 180);
    if (this.clearTimer > 0) {
      this.clearTimer -= deltaMs;
      if (this.clearTimer <= 0) this.clearRows = [];
    }
    if (this.state !== "playing" || !this.active) return;

    this.dropAccumulator += deltaMs;
    if (this.dropAccumulator >= this.dropInterval()) {
      this.dropAccumulator = 0;
      this.stepDown(false);
    }
  }

  private handleAction(action: Action): void {
    if (action === "restart") {
      this.restart();
      return;
    }
    if (action === "pause") {
      this.togglePause();
      return;
    }
    if (this.state !== "playing" || !this.active) return;

    if (action === "left") this.move(-1);
    if (action === "right") this.move(1);
    if (action === "down") this.stepDown(true);
    if (action === "rotate") this.rotate(true);
    if (action === "rotateCCW") this.rotate(false);
    if (action === "drop") this.hardDrop();
    if (action === "hold") this.hold();
    this.updateUi();
  }

  private move(dir: -1 | 1): void {
    if (!this.active) return;
    if (this.board.isValid(this.active, this.active.x + dir, this.active.y)) {
      this.active.x += dir;
      this.audio.play("move");
    }
  }

  private stepDown(manual: boolean): boolean {
    if (!this.active) return false;
    if (this.board.isValid(this.active, this.active.x, this.active.y + 1)) {
      this.active.y += 1;
      if (manual) this.score += 1;
      return true;
    }
    this.lockPiece();
    return false;
  }

  private rotate(clockwise: boolean): void {
    if (!this.active) return;
    const matrix = clockwise ? this.active.rotateClockwise() : this.active.rotateCounterClockwise();
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (this.board.isValid(this.active, this.active.x + kick, this.active.y, matrix)) {
        this.active.x += kick;
        this.active.matrix = matrix;
        this.audio.play("rotate");
        return;
      }
    }
  }

  private hardDrop(): void {
    if (!this.active) return;
    let distance = 0;
    while (this.board.isValid(this.active, this.active.x, this.active.y + 1)) {
      this.active.y += 1;
      distance += 1;
    }
    this.score += distance * 2;
    this.hardDropFlash = 1;
    this.audio.play("drop");
    this.lockPiece();
  }

  private hold(): void {
    if (!this.active || !this.canHold) return;
    const current = this.active.id;
    if (this.holdId) {
      this.active = new Piece(this.holdId);
      this.holdId = current;
      if (!this.board.isValid(this.active)) this.endGame();
    } else {
      this.holdId = current;
      this.spawnPiece();
    }
    this.canHold = false;
    this.audio.play("move");
  }

  private lockPiece(): void {
    if (!this.active) return;
    this.board.lock(this.active);
    const cleared = this.board.clearFullLines();
    if (cleared.length > 0) {
      this.clearRows = cleared;
      this.clearTimer = 220;
      this.lines += cleared.length;
      this.level = Math.floor(this.lines / 10) + 1;
      this.score += SCORE_TABLE[cleared.length] * this.level;
      this.audio.play("clear");
    }
    this.canHold = true;
    this.spawnPiece();
    this.updateUi();
  }

  private spawnPiece(): void {
    this.refillQueue();
    const id = this.queue.shift();
    if (!id) throw new Error("Piece queue failed");
    this.active = new Piece(id);
    this.refillQueue();
    if (!this.board.isValid(this.active)) this.endGame();
  }

  private refillQueue(): void {
    while (this.queue.length < 7) {
      const bag = [...PIECE_IDS];
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.queue.push(...bag);
    }
  }

  private getGhostPiece(): Piece | null {
    if (!this.active) return null;
    const ghost = this.active.clone();
    while (this.board.isValid(ghost, ghost.x, ghost.y + 1)) ghost.y += 1;
    return ghost;
  }

  private togglePause(): void {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.showOverlay("Paused", "Take a breath. Press P or tap Resume to continue.", "Resume", () => this.togglePause());
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.hideOverlay();
    } else if (this.state === "menu" || this.state === "gameover") {
      this.restart();
    }
  }

  private endGame(): void {
    this.state = "gameover";
    this.audio.play("gameover");
    if (this.score > this.highScore) {
      this.highScore = this.score;
      Storage.setHighScore(this.score);
    }
    this.ui.showOverlay("Game Over", `Score ${this.score}. High Score ${this.highScore}.`, "Restart", () => this.restart());
    this.updateUi();
  }

  private dropInterval(): number {
    return Math.max(70, 920 - (this.level - 1) * 70);
  }

  private updateUi(): void {
    this.ui.update({
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      lines: this.lines,
      hold: this.holdId ? new Piece(this.holdId) : null,
      next: this.queue.slice(0, 3).map((id) => new Piece(id))
    });
  }
}
