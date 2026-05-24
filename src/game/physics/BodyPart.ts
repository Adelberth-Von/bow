import type { BodyPartData, BodyPartKind, ArmorKind } from "../types";
import type { Archer } from "../entities/Archer";

export class BodyPart {
  body: MatterJS.BodyType;
  kind: BodyPartKind;
  armor: ArmorKind;
  radius: number;
  length: number;

  constructor(
    public archer: Archer,
    kind: BodyPartKind,
    body: MatterJS.BodyType,
    armor: ArmorKind = "none",
    radius = 12,
    length = 30
  ) {
    this.kind = kind;
    this.body = body;
    this.armor = armor;
    this.radius = radius;
    this.length = length;
    const data: BodyPartData = { archer, kind, armor };
    body.label = `${archer.team}-${kind}`;
    body.plugin = { ...(body.plugin ?? {}), partData: data };
  }
}
