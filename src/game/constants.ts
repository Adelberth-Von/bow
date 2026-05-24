export const COLS = 10;
export const ROWS = 20;
export const CELL = 32;
export const BOARD_WIDTH = COLS * CELL;
export const BOARD_HEIGHT = ROWS * CELL;

export const SCORE_TABLE = [0, 100, 300, 500, 800];
export const STORAGE_KEY = "blockDropPuzzleHighScore";

export type PieceId = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface PieceDefinition {
  id: PieceId;
  color: string;
  glow: string;
  matrix: number[][];
}

export const PIECES: Record<PieceId, PieceDefinition> = {
  I: {
    id: "I",
    color: "#58e6ff",
    glow: "rgba(88, 230, 255, 0.42)",
    matrix: [[1, 1, 1, 1]]
  },
  O: {
    id: "O",
    color: "#ffc857",
    glow: "rgba(255, 200, 87, 0.42)",
    matrix: [
      [1, 1],
      [1, 1]
    ]
  },
  T: {
    id: "T",
    color: "#b77bff",
    glow: "rgba(183, 123, 255, 0.42)",
    matrix: [
      [0, 1, 0],
      [1, 1, 1]
    ]
  },
  S: {
    id: "S",
    color: "#65e878",
    glow: "rgba(101, 232, 120, 0.42)",
    matrix: [
      [0, 1, 1],
      [1, 1, 0]
    ]
  },
  Z: {
    id: "Z",
    color: "#ff5c7a",
    glow: "rgba(255, 92, 122, 0.42)",
    matrix: [
      [1, 1, 0],
      [0, 1, 1]
    ]
  },
  J: {
    id: "J",
    color: "#5c8dff",
    glow: "rgba(92, 141, 255, 0.42)",
    matrix: [
      [1, 0, 0],
      [1, 1, 1]
    ]
  },
  L: {
    id: "L",
    color: "#ff9f43",
    glow: "rgba(255, 159, 67, 0.42)",
    matrix: [
      [0, 0, 1],
      [1, 1, 1]
    ]
  }
};

export const PIECE_IDS = Object.keys(PIECES) as PieceId[];
