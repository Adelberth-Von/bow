import type { EnemyKind } from "../types";

export class WaveSystem {
  wave = 1;
  kills = 0;

  nextEnemyKind(): EnemyKind {
    if (this.wave % 7 === 0) return "heavy";
    if (this.wave >= 5 && Math.random() < 0.28) return "armored";
    if (this.wave >= 4 && Math.random() < 0.35) return "shield";
    if (this.wave >= 3 && Math.random() < 0.35) return "helmet";
    return "basic";
  }

  recordKill(): void {
    this.kills += 1;
    if (this.kills % 3 === 0) this.wave += 1;
  }

  reset(): void {
    this.wave = 1;
    this.kills = 0;
  }
}
