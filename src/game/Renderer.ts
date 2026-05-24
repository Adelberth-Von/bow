import { BOARD_HEIGHT, BOARD_WIDTH, CELL, COLS, ROWS } from "./constants";
import type { Board } from "./Board";
import type { Piece } from "./Piece";

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = BOARD_WIDTH;
    this.canvas.height = BOARD_HEIGHT;
    parent.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform((rect.width * this.dpr) / BOARD_WIDTH, 0, 0, (rect.height * this.dpr) / BOARD_HEIGHT, 0, 0);
  }

  render(board: Board, active: Piece | null, ghost: Piece | null, clearRows: number[], hardDropFlash: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    this.drawBackground(hardDropFlash);
    this.drawGrid();

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = board.grid[y][x];
        if (cell) this.drawBlock(x, y, cell.color, cell.glow, 1);
      }
    }

    if (ghost) this.drawPiece(ghost, 0.22, true);
    if (active) this.drawPiece(active, 1, false);

    for (const row of clearRows) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(0, row * CELL, BOARD_WIDTH, CELL);
    }
  }

  drawMini(canvas: HTMLCanvasElement, piece: Piece | null): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(5,8,17,0.65)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (!piece) return;

    const matrix = piece.matrix;
    const size = Math.min(rect.width / 5, rect.height / 5);
    const ox = (rect.width - matrix[0].length * size) / 2;
    const oy = (rect.height - matrix.length * size) / 2;
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        this.drawMiniBlock(ctx, ox + x * size, oy + y * size, size, piece.color);
      }
    }
  }

  private drawBackground(flash: number): void {
    const g = this.ctx.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    g.addColorStop(0, "#070913");
    g.addColorStop(1, "#0f172a");
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    if (flash > 0) {
      this.ctx.fillStyle = `rgba(255,200,87,${flash * 0.18})`;
      this.ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = "rgba(255,255,255,0.075)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CELL + 0.5, 0);
      this.ctx.lineTo(x * CELL + 0.5, BOARD_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CELL + 0.5);
      this.ctx.lineTo(BOARD_WIDTH, y * CELL + 0.5);
      this.ctx.stroke();
    }
  }

  private drawPiece(piece: Piece, alpha: number, ghost: boolean): void {
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) continue;
        const by = piece.y + y;
        if (by < 0) continue;
        this.drawBlock(piece.x + x, by, piece.color, piece.glow, alpha, ghost);
      }
    }
  }

  private drawBlock(x: number, y: number, color: string, glow: string, alpha: number, ghost = false): void {
    const px = x * CELL;
    const py = y * CELL;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = glow;
    ctx.shadowBlur = ghost ? 0 : 12;
    ctx.fillStyle = ghost ? "rgba(255,255,255,0.16)" : color;
    this.roundRect(ctx, px + 3, py + 3, CELL - 6, CELL - 6, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ghost ? color : "rgba(255,255,255,0.42)";
    ctx.lineWidth = ghost ? 2 : 1.5;
    this.roundRect(ctx, px + 3, py + 3, CELL - 6, CELL - 6, 6);
    ctx.stroke();
    ctx.restore();
  }

  private drawMiniBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    this.roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
