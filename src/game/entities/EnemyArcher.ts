import type Phaser from "phaser";
import { Archer } from "./Archer";
import type { EnemyConfig, EnemyKind } from "../types";

export const enemyConfigs: Record<EnemyKind, EnemyConfig> = {
  basic: { kind: "basic", hp: 75, aimError: 0.22, cooldown: 1.6, drawTime: 1.2, scale: 1 },
  helmet: { kind: "helmet", hp: 90, aimError: 0.18, cooldown: 1.6, drawTime: 1.2, scale: 1, helmet: 95 },
  shield: { kind: "shield", hp: 105, aimError: 0.2, cooldown: 1.8, drawTime: 1.35, scale: 1, shield: 115 },
  armored: { kind: "armored", hp: 125, aimError: 0.16, cooldown: 1.9, drawTime: 1.35, scale: 1.04, torsoArmor: true },
  heavy: { kind: "heavy", hp: 220, aimError: 0.1, cooldown: 2.2, drawTime: 1.65, scale: 1.2, helmet: 130, shield: 150, torsoArmor: true }
};

export class EnemyArcher extends Archer {
  config: EnemyConfig;
  kind: EnemyKind;
  coins = 1;

  constructor(scene: Phaser.Scene, x: number, groundY: number, kind: EnemyKind, wave: number) {
    const base = enemyConfigs[kind];
    const scaled = {
      ...base,
      hp: Math.round(base.hp + wave * 8),
      aimError: Math.max(0.05, base.aimError - wave * 0.006)
    };
    super(scene, "enemy", x, groundY, -1, scaled);
    this.config = scaled;
    this.kind = kind;
    this.coins = kind === "heavy" ? 4 : kind === "armored" ? 3 : 1;
  }
}
