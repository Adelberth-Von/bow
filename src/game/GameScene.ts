import Phaser from "phaser";
import { PlayerArcher } from "./entities/PlayerArcher";
import { EnemyArcher } from "./entities/EnemyArcher";
import { Arrow } from "./entities/Arrow";
import { Pickup, type PickupKind } from "./entities/Pickup";
import { DamageSystem } from "./physics/DamageSystem";
import { InputSystem } from "./systems/InputSystem";
import { EnemyAI } from "./systems/EnemyAI";
import { ParticleSystem } from "./systems/ParticleSystem";
import { WaveSystem } from "./systems/WaveSystem";
import { UpgradeSystem } from "./systems/UpgradeSystem";
import { MobileControls } from "./systems/MobileControls";
import { HUD } from "./ui/HUD";
import { Menu } from "./ui/Menu";
import { UpgradeMenu } from "./ui/UpgradeMenu";
import type { Archer } from "./entities/Archer";
import type { ArmorKind, ArrowBodyData, BodyPartData, EffectType, HelmetData, ShieldData } from "./types";

const WORLD_W = 1280;
const WORLD_H = 720;
const GROUND_Y = 642;

type SceneState = "menu" | "playing" | "paused" | "upgrade" | "gameOver";

export class GameScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private player?: PlayerArcher;
  private enemy?: EnemyArcher;
  private arrows: Arrow[] = [];
  private pickups: Pickup[] = [];
  private inputSystem?: InputSystem;
  private mobileControls?: MobileControls;
  private enemyAI?: EnemyAI;
  private particles!: ParticleSystem;
  private damageSystem = new DamageSystem();
  private wave = new WaveSystem();
  private upgrades = new UpgradeSystem();
  private hud?: HUD;
  private menu?: Menu;
  private upgradeMenu?: UpgradeMenu;
  private state: SceneState = "menu";
  private score = 0;
  private soundEnabled = true;
  private overlayText?: Phaser.GameObjects.Text;
  private groundBody?: MatterJS.BodyType;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.matter.world.setBounds(0, 0, WORLD_W, WORLD_H + 300, 64, true, true, false, true);
    this.groundBody = this.matter.add.rectangle(WORLD_W / 2, GROUND_Y + 44, WORLD_W + 140, 88, {
      isStatic: true,
      label: "ground"
    }) as MatterJS.BodyType;
    this.graphics = this.add.graphics();
    this.particles = new ParticleSystem(this);
    this.hud = new HUD(this);

    this.events.on("restart-request", () => this.restartRun());
    this.scale.on("resize", this.resizeCamera, this);
    this.resizeCamera();
    this.createMenu();

    this.matter.world.on("collisionstart", (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) this.handleCollision(pair.bodyA as MatterJS.BodyType, pair.bodyB as MatterJS.BodyType);
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.graphics.clear();
    this.drawWorld();

    if (this.state === "playing") {
      this.player?.update(deltaMs);
      this.enemy?.update(deltaMs);
      this.enemyAI?.update(dt);
      this.updateArrows();
      this.updatePickups();
      this.checkDeaths();
    }

    this.particles.update(dt);
    this.drawActors();
    this.drawArrows();
    this.drawPickups();
    this.particles.draw(this.graphics);

    if (this.player && this.hud) {
      this.hud.update(
        this.player,
        this.enemy,
        this.score,
        this.wave.wave,
        this.wave.kills,
        this.inputSystem?.currentArrowType ?? "normal",
        this.upgrades.coins
      );
    }
  }

  private createMenu(): void {
    this.state = "menu";
    this.menu?.destroy();
    this.menu = new Menu(
      this,
      () => this.startRun(),
      () => this.showMessage("How to Play", "Drag backward to draw the bow. Aim for unarmored body parts. Space or DODGE hops. Q or TYPE switches arrows.", true),
      () => {
        this.soundEnabled = !this.soundEnabled;
        this.showFloating(this.soundEnabled ? "Sound on" : "Sound off", WORLD_W / 2, 170, 0xffbf4d);
      },
      () => {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      }
    );
  }

  private startRun(): void {
    this.menu?.destroy();
    this.menu = undefined;
    this.overlayText?.destroy();
    this.overlayText = undefined;
    this.clearWorldEntities();
    this.wave.reset();
    this.score = 0;
    this.state = "playing";
    this.spawnPlayer();
    this.spawnEnemy();
    this.setupControls();
  }

  private restartRun(): void {
    this.overlayText?.destroy();
    this.overlayText = undefined;
    this.upgradeMenu?.destroy();
    this.upgradeMenu = undefined;
    this.startRun();
  }

  private spawnPlayer(): void {
    this.player = new PlayerArcher(this, 220, GROUND_Y, this.upgrades.state);
  }

  private spawnEnemy(): void {
    const kind = this.wave.nextEnemyKind();
    const x = Phaser.Math.Between(930, 1080);
    this.enemy = new EnemyArcher(this, x, GROUND_Y, kind, this.wave.wave);
    if (this.player) {
      this.enemyAI = new EnemyAI(this.enemy, this.player, (arrows) => this.addArrows(arrows));
    }
    this.showFloating(kind.toUpperCase(), x, 150, 0xffbf4d);
  }

  private setupControls(): void {
    if (!this.player) return;
    this.inputSystem?.destroy();
    this.mobileControls?.destroy();
    this.inputSystem = new InputSystem(this, this.player, (arrows) => this.addArrows(arrows), () => this.state === "playing");
    this.mobileControls = new MobileControls(
      this,
      () => this.player?.jumpDodge(),
      () => this.inputSystem?.switchArrow(),
      () => this.togglePause()
    );
  }

  private togglePause(): void {
    if (this.state === "playing") {
      this.state = "paused";
      this.showMessage("Paused", "Tap PAUSE again to resume.", false);
    } else if (this.state === "paused") {
      this.state = "playing";
      this.overlayText?.destroy();
      this.overlayText = undefined;
    }
  }

  private addArrows(arrows: Arrow[]): void {
    this.arrows.push(...arrows);
    if (arrows.length > 0) this.playTone(260, 0.045, "triangle", 0.05);
    while (this.arrows.length > 42) {
      this.arrows.shift()?.destroy();
    }
  }

  private updateArrows(): void {
    this.arrows = this.arrows.filter((arrow) => {
      const alive = arrow.update();
      if (!alive) arrow.destroy();
      return alive;
    });
  }

  private updatePickups(): void {
    this.pickups = this.pickups.filter((pickup) => {
      const alive = pickup.update();
      if (!alive) pickup.destroy();
      return alive;
    });
  }

  private checkDeaths(): void {
    if (this.player?.isDead && this.state === "playing") {
      this.state = "gameOver";
      this.upgrades.saveScore(this.score);
      this.showMessage(`Game Over`, `Score ${this.score} | High ${this.upgrades.highScore}. Press R or tap Restart.`, true, () => this.restartRun());
    }

    if (this.enemy?.isDead && this.state === "playing") {
      const oldWave = this.wave.wave;
      const reward = this.enemy.coins;
      this.upgrades.addCoins(reward);
      this.score += 100 + this.wave.wave * 20 + reward * 35;
      this.wave.recordKill();
      this.spawnPickupChance();
      this.enemy = undefined;
      this.enemyAI = undefined;

      if (this.wave.wave !== oldWave) {
        this.state = "upgrade";
        this.showUpgradeMenu();
      } else {
        this.time.delayedCall(850, () => {
          if (this.state === "playing") this.spawnEnemy();
        });
      }
    }
  }

  private showUpgradeMenu(): void {
    this.upgradeMenu?.destroy();
    this.upgradeMenu = new UpgradeMenu(this, this.upgrades, () => {
      this.upgradeMenu?.destroy();
      this.upgradeMenu = undefined;
      if (this.player) {
        this.player.maxHp = 100 + this.upgrades.state.maxHpBonus;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 28);
        this.player.maxStamina = 100 + this.upgrades.state.maxStaminaBonus;
        this.player.stamina = this.player.maxStamina;
      }
      this.state = "playing";
      this.spawnEnemy();
    });
  }

  private spawnPickupChance(): void {
    if (Math.random() > 0.55) return;
    const kinds: PickupKind[] = ["heal", "energy", "gold"];
    const kind = kinds[Phaser.Math.Between(0, kinds.length - 1)];
    this.pickups.push(new Pickup(this, kind, Phaser.Math.Between(470, 790), Phaser.Math.Between(250, 420)));
  }

  private handleCollision(a: MatterJS.BodyType, b: MatterJS.BodyType): void {
    const arrow = this.readArrow(a) ?? this.readArrow(b);
    if (!arrow || arrow.hasHit) return;
    const other = arrow.body === a ? b : a;

    const pickup = other.plugin?.pickup as Pickup | undefined;
    if (pickup && arrow.owner === "player" && this.player) {
      pickup.apply(this.player);
      this.pickups = this.pickups.filter((p) => p !== pickup);
      pickup.destroy();
      arrow.stickTo();
      this.particles.spawn(arrow.body.position.x, arrow.body.position.y, "spark", 18);
      this.showFloating("PICKUP", arrow.body.position.x, arrow.body.position.y - 22, 0x65e878);
      return;
    }

    if (other.label === "ground") {
      arrow.stickTo();
      this.particles.spawn(arrow.body.position.x, arrow.body.position.y, "wood", 8);
      return;
    }

    const shield = other.plugin?.shieldData as ShieldData | undefined;
    if (shield && shield.archer.team !== arrow.owner) {
      this.applyHit(arrow, shield.archer, other, undefined, "shield");
      return;
    }

    const helmet = other.plugin?.helmetData as HelmetData | undefined;
    if (helmet && helmet.archer.team !== arrow.owner) {
      this.applyHit(arrow, helmet.archer, other, "head", "helmet");
      return;
    }

    const part = other.plugin?.partData as BodyPartData | undefined;
    if (part && part.archer.team !== arrow.owner) {
      this.applyHit(arrow, part.archer, other, part.kind, part.armor);
    }
  }

  private applyHit(arrow: Arrow, target: Archer, body: MatterJS.BodyType, bodyPart?: BodyPartData["kind"], armor?: ArmorKind): void {
    const result = this.damageSystem.calculateDamage({
      arrow,
      archer: target,
      bodyPart,
      armor,
      speed: arrow.impactSpeed()
    });

    if (armor === "helmet") target.helmetDurability = Math.max(0, target.helmetDurability - result.armorDamage);
    if (armor === "shield") target.shieldDurability = Math.max(0, target.shieldDurability - result.armorDamage);
    if (result.finalDamage > 0) {
      target.takeDamage(result.finalDamage);
      if (arrow.type === "poison") target.poisonTimer = 4;
      if (arrow.type === "fire") target.fireTimer = 3.2;
    }

    const impulseScale = Phaser.Math.Clamp(arrow.impactSpeed() / 48000, 0.002, 0.018);
    target.applyImpulse(body, arrow.body.velocity.x * impulseScale, arrow.body.velocity.y * impulseScale);
    arrow.stickTo(body);
    this.particles.spawn(arrow.body.position.x, arrow.body.position.y, result.effectType, result.finalDamage > 65 ? 30 : 16);
    this.showFloating(result.finalDamage > 0 ? `${result.label} -${result.finalDamage}` : result.label, arrow.body.position.x, arrow.body.position.y - 24, result.effectType === "blood" ? 0xff4f5f : 0xffbf4d);
    this.playTone(result.effectType === "blood" ? 140 : 520, 0.06, result.effectType === "blood" ? "sawtooth" : "square", 0.035);
  }

  private readArrow(body: MatterJS.BodyType): Arrow | undefined {
    return (body.plugin?.arrowData as ArrowBodyData | undefined)?.arrow;
  }

  private drawWorld(): void {
    this.graphics.fillGradientStyle(0x07080d, 0x111827, 0x101624, 0x07080d, 1);
    this.graphics.fillRect(0, 0, WORLD_W, WORLD_H);
    this.graphics.lineStyle(1, 0xffffff, 0.07);
    for (let x = 0; x <= WORLD_W; x += 80) {
      this.graphics.lineBetween(x, 0, x, WORLD_H);
    }
    this.graphics.fillStyle(0x1f2937, 1).fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
    this.graphics.fillStyle(0xffbf4d, 0.35).fillRect(0, GROUND_Y, WORLD_W, 4);
    this.graphics.fillStyle(0x0b1020, 0.6).fillRoundedRect(76, GROUND_Y - 24, 270, 24, 4);
    this.graphics.fillRoundedRect(900, GROUND_Y - 24, 280, 24, 4);
  }

  private drawActors(): void {
    if (this.player) this.drawArcher(this.player, 0x6ebeff);
    if (this.enemy) this.drawArcher(this.enemy, 0xff4f5f);
  }

  private drawArcher(archer: PlayerArcher | EnemyArcher, accent: number): void {
    const g = this.graphics;
    for (const part of archer.ragdoll.parts) {
      const b = part.body;
      g.save();
      g.translateCanvas(b.position.x, b.position.y);
      g.rotateCanvas(b.angle);
      if (part.kind === "head") {
        g.fillStyle(0xf4f7fb, 1).fillCircle(0, 0, part.radius);
        g.lineStyle(3, accent, 0.9).strokeCircle(0, 0, part.radius);
      } else {
        const color = part.armor === "torsoArmor" ? 0x8391a8 : 0xf4f7fb;
        g.lineStyle(Math.max(5, part.radius * 1.45), color, 0.95).lineBetween(-part.length / 2, 0, part.length / 2, 0);
      }
      g.restore();
    }

    if (archer.ragdoll.helmetBody && archer.helmetDurability > 0) {
      const h = archer.ragdoll.helmetBody;
      g.save().translateCanvas(h.position.x, h.position.y).rotateCanvas(h.angle);
      g.fillStyle(0xb9c3d4, 1).fillRoundedRect(-26, -7, 52, 14, 4);
      g.restore();
    }

    if (archer.ragdoll.shieldBody && archer.shieldDurability > 0) {
      const s = archer.ragdoll.shieldBody;
      g.save().translateCanvas(s.position.x, s.position.y).rotateCanvas(s.angle);
      g.fillStyle(0x6ebeff, 0.28).fillRoundedRect(-11, -40, 22, 80, 10);
      g.lineStyle(3, 0x6ebeff, 0.75).strokeRoundedRect(-11, -40, 22, 80, 10);
      g.restore();
    }

    this.drawBow(archer, accent);
  }

  private drawBow(archer: PlayerArcher | EnemyArcher, accent: number): void {
    const origin = archer.getBowOrigin();
    const angle = archer.bowState.aimAngle;
    const draw = archer.bowState.drawPower;
    const tangent = new Phaser.Math.Vector2(Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2));
    const pull = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(-draw * 46);
    const top = origin.clone().add(tangent.clone().scale(34));
    const bot = origin.clone().add(tangent.clone().scale(-34));
    const mid = origin.clone().add(pull);

    this.graphics.lineStyle(5, accent, 0.96).lineBetween(top.x, top.y, origin.x + Math.cos(angle) * 14, origin.y + Math.sin(angle) * 14);
    this.graphics.lineBetween(bot.x, bot.y, origin.x + Math.cos(angle) * 14, origin.y + Math.sin(angle) * 14);
    this.graphics.lineStyle(2, 0xf4f7fb, 0.88).lineBetween(top.x, top.y, mid.x, mid.y).lineBetween(mid.x, mid.y, bot.x, bot.y);

    if (archer.bowState.isDrawing) {
      this.graphics.lineStyle(3, 0xffbf4d, 0.9).lineBetween(mid.x, mid.y, origin.x + Math.cos(angle) * 52, origin.y + Math.sin(angle) * 52);
    }
  }

  private drawArrows(): void {
    for (const arrow of this.arrows) {
      const b = arrow.body;
      this.graphics.save().translateCanvas(b.position.x, b.position.y).rotateCanvas(b.angle);
      this.graphics.lineStyle(4, arrow.color, 0.96).lineBetween(-24, 0, 22, 0);
      this.graphics.fillStyle(arrow.owner === "player" ? 0xffbf4d : 0xff4f5f, 1).fillTriangle(28, 0, 15, -6, 15, 6);
      this.graphics.lineStyle(2, 0x6ebeff, 0.8).lineBetween(-24, 0, -35, -7).lineBetween(-24, 0, -35, 7);
      this.graphics.restore();
    }
  }

  private drawPickups(): void {
    for (const pickup of this.pickups) {
      const color = pickup.kind === "heal" ? 0xff4f5f : pickup.kind === "energy" ? 0x65e878 : 0xffbf4d;
      this.graphics.fillStyle(color, 0.85).fillCircle(pickup.body.position.x, pickup.body.position.y, 15);
      this.graphics.lineStyle(2, 0xffffff, 0.5).strokeCircle(pickup.body.position.x, pickup.body.position.y, 18);
    }
  }

  private showFloating(text: string, x: number, y: number, color: number): void {
    const t = this.add.text(x, y, text, {
      fontFamily: "system-ui",
      fontSize: "18px",
      fontStyle: "900",
      color: `#${color.toString(16).padStart(6, "0")}`
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 1050, onComplete: () => t.destroy() });
  }

  private showMessage(title: string, body: string, button: boolean, cb?: () => void): void {
    this.overlayText?.destroy();
    this.overlayText = this.add.text(this.scale.width / 2, this.scale.height / 2, `${title}\n\n${body}${button ? "\n\nTap here" : ""}`, {
      fontFamily: "system-ui",
      fontSize: "26px",
      fontStyle: "bold",
      align: "center",
      color: "#f4f7fb",
      backgroundColor: "rgba(15,20,32,0.86)",
      padding: { x: 28, y: 24 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1400);
    if (button) this.overlayText.setInteractive({ useHandCursor: true }).once("pointerdown", cb ?? (() => this.overlayText?.destroy()));
  }

  private resizeCamera(): void {
    const zoom = Math.min(this.scale.width / WORLD_W, this.scale.height / WORLD_H);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setScroll((WORLD_W - this.scale.width / zoom) / 2, (WORLD_H - this.scale.height / zoom) / 2);
  }

  private clearWorldEntities(): void {
    this.inputSystem?.destroy();
    this.mobileControls?.destroy();
    this.arrows.forEach((arrow) => arrow.destroy());
    this.pickups.forEach((pickup) => pickup.destroy());
    this.arrows = [];
    this.pickups = [];
    const localWorld = this.matter.world.localWorld as unknown as { bodies: MatterJS.BodyType[]; constraints: MatterJS.ConstraintType[] };
    for (const body of [...localWorld.bodies]) {
      if (body !== this.groundBody) this.matter.world.remove(body);
    }
    for (const constraint of [...localWorld.constraints]) {
      this.matter.world.remove(constraint);
    }
    this.player = undefined;
    this.enemy = undefined;
    this.enemyAI = undefined;
  }

  private playTone(freq: number, dur: number, type: OscillatorType, gainValue: number): void {
    if (!this.soundEnabled) return;
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = gainValue;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
  }
}
