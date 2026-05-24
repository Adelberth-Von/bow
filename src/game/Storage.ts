import { STORAGE_KEY } from "./constants";

export class Storage {
  static getHighScore(): number {
    return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
  }

  static setHighScore(score: number): void {
    localStorage.setItem(STORAGE_KEY, String(score));
  }
}
