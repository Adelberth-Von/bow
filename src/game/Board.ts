import { COLS, ROWS, type PieceId } from "./constants";
import type { Piece } from "./Piece";

export interface Cell {
  id: PieceId;
  color: string;
  glow: string;
}

export type BoardCell = Cell | null;

export class Board {
  grid: BoardCell[][] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.grid = Array.from({ length: ROWS }, () => Array<BoardCell>(COLS).fill(null));
  }

  isValid(piece: Piece, x = piece.x, y = piece.y, matrix = piece.matrix): boolean {
    for (let py = 0; py < matrix.length; py += 1) {
      for (let px = 0; px < matrix[py].length; px += 1) {
        if (!matrix[py][px]) continue;
        const bx = x + px;
        const by = y + py;
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        if (by >= 0 && this.grid[by][bx]) return false;
      }
    }
    return true;
  }

  lock(piece: Piece): void {
    for (let py = 0; py < piece.matrix.length; py += 1) {
      for (let px = 0; px < piece.matrix[py].length; px += 1) {
        if (!piece.matrix[py][px]) continue;
        const bx = piece.x + px;
        const by = piece.y + py;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          this.grid[by][bx] = { id: piece.id, color: piece.color, glow: piece.glow };
        }
      }
    }
  }

  clearFullLines(): number[] {
    const cleared: number[] = [];
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (this.grid[y].every(Boolean)) {
        cleared.push(y);
        this.grid.splice(y, 1);
        this.grid.unshift(Array<BoardCell>(COLS).fill(null));
        y += 1;
      }
    }
    return cleared;
  }
}
