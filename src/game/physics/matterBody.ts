import Phaser from "phaser";

export const MatterBody = (Phaser.Physics.Matter as unknown as { Matter: { Body: Record<string, (...args: never[]) => unknown> } }).Matter.Body as unknown as {
  setVelocity: (body: MatterJS.BodyType, velocity: MatterJS.Vector) => void;
  setAngle: (body: MatterJS.BodyType, angle: number) => void;
  setStatic: (body: MatterJS.BodyType, isStatic: boolean) => void;
  setAngularVelocity: (body: MatterJS.BodyType, velocity: number) => void;
  setPosition: (body: MatterJS.BodyType, position: MatterJS.Vector) => void;
  set: (body: MatterJS.BodyType, settings: Record<string, unknown>) => void;
  applyForce: (body: MatterJS.BodyType, position: MatterJS.Vector, force: MatterJS.Vector) => void;
};
