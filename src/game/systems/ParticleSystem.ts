import Phaser from "phaser";
import type { EffectType } from "../types";

interface Particle {
  pos: Phaser.Math.Vector2;
  vel: Phaser.Math.Vector2;
  life: number;
  max: number;
  color: number;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  constructor(private scene: Phaser.Scene) {}

  spawn(x: number, y: number, type: EffectType, count = 12): void {
    if (type === "none") return;
    const color = type === "blood" ? 0xc8212f : type === "spark" ? 0xffd166 : 0xb8844c;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, type === "blood" ? 280 : 220);
      this.particles.push({
        pos: new Phaser.Math.Vector2(x, y),
        vel: new Phaser.Math.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
        life: Phaser.Math.FloatBetween(0.35, 0.85),
        max: 0.85,
        color,
        size: Phaser.Math.FloatBetween(2, 5)
      });
    }
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vel.y += 480 * dt;
      p.pos.add(p.vel.clone().scale(dt));
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(g: Phaser.GameObjects.Graphics): void {
    for (const p of this.particles) {
      g.fillStyle(p.color, Phaser.Math.Clamp(p.life / p.max, 0, 1));
      g.fillCircle(p.pos.x, p.pos.y, p.size);
    }
  }
}
