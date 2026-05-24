import type { Archer } from "./entities/Archer";
import type { Arrow } from "./entities/Arrow";

export type Team = "player" | "enemy";
export type BodyPartKind = "head" | "torso" | "upperArm" | "forearm" | "upperLeg" | "lowerLeg";
export type ArmorKind = "none" | "helmet" | "torsoArmor" | "shield";
export type ArrowType = "normal" | "heavy" | "triple" | "fire" | "poison";
export type EffectType = "blood" | "spark" | "wood" | "none";
export type EnemyKind = "basic" | "helmet" | "shield" | "armored" | "heavy";

export interface BodyPartData {
  archer: Archer;
  kind: BodyPartKind;
  armor: ArmorKind;
}

export interface ShieldData {
  archer: Archer;
  armor: "shield";
}

export interface HelmetData {
  archer: Archer;
  armor: "helmet";
}

export interface ArrowBodyData {
  arrow: Arrow;
}

export interface HitInfo {
  arrow: Arrow;
  archer: Archer;
  bodyPart?: BodyPartKind;
  armor?: ArmorKind;
  speed: number;
}

export interface DamageResult {
  finalDamage: number;
  armorDamage: number;
  effectType: EffectType;
  label: string;
}

export interface UpgradeState {
  maxHpBonus: number;
  maxStaminaBonus: number;
  damageMultiplier: number;
  drawSpeedMultiplier: number;
  penetrationMultiplier: number;
}

export interface EnemyConfig {
  kind: EnemyKind;
  hp: number;
  aimError: number;
  cooldown: number;
  drawTime: number;
  scale: number;
  helmet?: number;
  shield?: number;
  torsoArmor?: boolean;
}
