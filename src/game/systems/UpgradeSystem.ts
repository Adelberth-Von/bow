import type { UpgradeState } from "../types";

export class UpgradeSystem {
  state: UpgradeState = {
    maxHpBonus: 0,
    maxStaminaBonus: 0,
    damageMultiplier: 1,
    drawSpeedMultiplier: 1,
    penetrationMultiplier: 1
  };

  coins = 0;
  highScore = Number(localStorage.getItem("physicsBowDuelHighScore") ?? 0);

  addCoins(amount: number): void {
    this.coins += amount;
  }

  buy(index: number): boolean {
    const cost = 2 + index;
    if (this.coins < cost) return false;
    this.coins -= cost;
    if (index === 0) this.state.maxHpBonus += 10;
    if (index === 1) this.state.maxStaminaBonus += 10;
    if (index === 2) this.state.damageMultiplier += 0.1;
    if (index === 3) this.state.drawSpeedMultiplier += 0.1;
    if (index === 4) this.state.penetrationMultiplier += 0.1;
    return true;
  }

  saveScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
      localStorage.setItem("physicsBowDuelHighScore", String(score));
    }
  }
}
