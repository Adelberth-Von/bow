import { COLS, PIECES, type PieceId } from "./constants";

export class Piece {
  matrix: number[][];
  x = 0;
  y = 0;

  constructor(public id: PieceId) {
    this.matrix = Piece.cloneMatrix(PIECES[id].matrix);
    this.x = Math.floor((COLS - this.matrix[0].length) / 2);
    this.y = -this.matrix.length;
  }

  get color(): string {
    return PIECES[this.id].color;
  }

  get glow(): string {
    return PIECES[this.id].glow;
  }

  clone(): Piece {
    const p = new Piece(this.id);
    p.matrix = Piece.cloneMatrix(this.matrix);
    p.x = this.x;
    p.y = this.y;
    return p;
  }

  rotateClockwise(): number[][] {
    const h = this.matrix.length;
    const w = this.matrix[0].length;
    const rotated = Array.from({ length: w }, () => Array(h).fill(0));
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        rotated[x][h - 1 - y] = this.matrix[y][x];
      }
    }
    return rotated;
  }

  rotateCounterClockwise(): number[][] {
    const h = this.matrix.length;
    const w = this.matrix[0].length;
    const rotated = Array.from({ length: w }, () => Array(h).fill(0));
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        rotated[w - 1 - x][y] = this.matrix[y][x];
      }
    }
    return rotated;
  }

  static cloneMatrix(matrix: number[][]): number[][] {
    return matrix.map((row) => [...row]);
  }
}
