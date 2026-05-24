import Phaser from "phaser";
import type { DamageResult, HitInfo } from "../types";

const bodyPartMultiplier = {
  head: 2.25,
  torso: 1,
  upperArm: 0.38,
  forearm: 0.34,
  upperLeg: 0.55,
  lowerLeg: 0.48
};

export class DamageSystem {
  calculateDamage(hit: HitInfo): DamageResult {
    const arrow = hit.arrow;
    const speedFactor = Phaser.Math.Clamp(hit.speed / 900, 0.35, 1.45);
    const base = arrow.damageBase * speedFactor;
    const penetration = arrow.penetrationPower * speedFactor;

    if (hit.armor === "shield") {
      return {
        finalDamage: 0,
        armorDamage: Math.max(1, penetration * 0.85),
        effectType: "wood",
        label: "BLOCKED"
      };
    }

    if (hit.armor === "helmet" && hit.archer.helmetDurability > 0) {
      if (penetration < hit.archer.helmetDurability * 28) {
        return {
          finalDamage: 0,
          armorDamage: Math.max(1, penetration * 0.7),
          effectType: "spark",
          label: "HELM"
        };
      }

      return {
        finalDamage: Math.round(base * 0.35),
        armorDamage: penetration,
        effectType: "spark",
        label: "CRACK"
      };
    }

    const part = hit.bodyPart ?? "torso";
    let damage = base * bodyPartMultiplier[part];

    if (hit.armor === "torsoArmor" && part === "torso") {
      damage *= 0.3;
      return {
        finalDamage: Math.round(damage),
        armorDamage: penetration * 0.4,
        effectType: damage > 4 ? "blood" : "spark",
        label: "ARMOR"
      };
    }

    let label = "HIT";
    if (part === "head") label = damage > 95 ? "CRITICAL" : "HEADSHOT";
    if (part === "torso") label = "BODY HIT";
    if (part.includes("Arm")) label = "ARM HIT";
    if (part.includes("Leg")) label = "LEG HIT";

    return {
      finalDamage: Math.round(damage),
      armorDamage: 0,
      effectType: "blood",
      label
    };
  }
}
