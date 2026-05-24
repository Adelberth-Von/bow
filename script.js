"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const streakText = document.getElementById("streakText");
const attemptText = document.getElementById("attemptText");
const enemyHpText = document.getElementById("enemyHpText");
const menuOverlay = document.getElementById("menuOverlay");
const messageOverlay = document.getElementById("messageOverlay");
const messageTitle = document.getElementById("messageTitle");
const messageBody = document.getElementById("messageBody");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const resetBtn = document.getElementById("resetBtn");
const pauseBtn = document.getElementById("pauseBtn");
const nextBtn = document.getElementById("nextBtn");

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const GRAVITY = 940;
const AIR_DRAG = 0.999;
const MIN_POWER = 300;
const MAX_POWER = 1180;
const MAX_PULL = 190;
const ARROW_LENGTH = 68;
const AIM_EASE = 0.22;

const levels = [
  { enemyX: 780, platformY: 570, hp: 60, scale: 1, obstacles: [] },
  { enemyX: 860, platformY: 570, hp: 70, scale: 1, obstacles: [] },
  { enemyX: 900, platformY: 520, hp: 80, scale: 1, obstacles: [] },
  { enemyX: 980, platformY: 500, hp: 90, scale: 1, obstacles: [] },
  { enemyX: 940, platformY: 570, hp: 100, scale: 1, obstacles: [{ x: 585, y: 398, w: 46, h: 172 }] },
  { enemyX: 955, platformY: 458, hp: 110, scale: 1, obstacles: [{ x: 640, y: 350, w: 54, h: 178 }] },
  { enemyX: 1040, platformY: 545, hp: 120, scale: 0.92, obstacles: [{ x: 675, y: 440, w: 52, h: 130 }] },
  { enemyX: 1000, platformY: 485, hp: 130, scale: 0.96, obstacles: [{ x: 565, y: 470, w: 52, h: 112 }, { x: 760, y: 292, w: 46, h: 118 }] },
  { enemyX: 1080, platformY: 455, hp: 150, scale: 0.94, obstacles: [{ x: 600, y: 428, w: 54, h: 150 }, { x: 825, y: 250, w: 54, h: 138 }] },
  { enemyX: 1060, platformY: 530, hp: 220, scale: 1.16, boss: true, obstacles: [{ x: 645, y: 410, w: 56, h: 162 }, { x: 850, y: 214, w: 58, h: 154 }] }
];

const state = {
  mode: "menu",
  levelIndex: 0,
  score: 0,
  streak: 0,
  attempts: 0,
  totalAttempts: 0,
  enemy: null,
  arrow: null,
  stuckArrows: [],
  particles: [],
  feedback: [],
  dust: [],
  missBanner: null,
  isAiming: false,
  pointerId: null,
  pointerPoint: null,
  easedPull: { x: 0, y: 0, length: 0 },
  screenShake: 0,
  playerRecoil: 0,
  lastTime: 0,
  dpr: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

const player = {
  x: 214,
  platformY: 572,
  scale: 1,
  facing: 1
};

function initGame() {
  createDust();
  resizeCanvas();
  loadLevel(0);
  updateHud();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  state.mode = "playing";
  state.levelIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.attempts = 0;
  state.totalAttempts = 0;
  loadLevel(0);
  menuOverlay.classList.add("hidden");
  hideMessage();
  updateHud();
}

function loadLevel(levelIndex) {
  const level = levels[levelIndex];
  state.enemy = {
    x: level.enemyX,
    platformY: level.platformY,
    hp: level.hp,
    maxHp: level.hp,
    scale: level.scale,
    boss: Boolean(level.boss),
    hitReact: 0,
    lean: 0,
    headKnock: { x: 0, y: 0 }
  };
  state.arrow = null;
  state.stuckArrows = [];
  state.particles = [];
  state.feedback = [];
  state.missBanner = null;
  state.isAiming = false;
  state.pointerId = null;
  state.pointerPoint = null;
  state.easedPull = { x: 0, y: 0, length: 0 };
  state.playerRecoil = 0;
  state.screenShake = 0;
  updateHud();
}

function restartLevel() {
  if (state.mode === "menu") return;
  state.mode = "playing";
  state.streak = 0;
  state.attempts = 0;
  loadLevel(state.levelIndex);
  hideMessage();
}

function resetGame() {
  state.mode = "menu";
  state.levelIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.attempts = 0;
  state.totalAttempts = 0;
  loadLevel(0);
  menuOverlay.classList.remove("hidden");
  hideMessage();
  updateHud();
}

function nextLevel() {
  if (state.mode === "finished") {
    startGame();
    return;
  }
  if (state.levelIndex >= levels.length - 1) {
    finishGame("VICTORY!");
    return;
  }
  state.levelIndex += 1;
  state.mode = "playing";
  state.attempts = 0;
  loadLevel(state.levelIndex);
  hideMessage();
}

function togglePause() {
  if (state.mode === "playing") {
    state.mode = "paused";
    pauseBtn.textContent = "Resume";
    setMessage("Paused", "Take a breath. The range can wait.", false);
  } else if (state.mode === "paused") {
    state.mode = "playing";
    pauseBtn.textContent = "Pause";
    hideMessage();
  }
}

function finishGame(title) {
  state.mode = "finished";
  pauseBtn.textContent = "Pause";
  messageTitle.textContent = title;
  messageBody.textContent = `Final Score: ${state.score} | Total Attempts: ${state.totalAttempts}`;
  nextBtn.textContent = "Play Again";
  nextBtn.classList.remove("hidden");
  messageOverlay.classList.remove("hidden");
}

function update(deltaTime) {
  updateAimEasing();
  if (state.mode === "playing") {
    updateArrow(deltaTime);
    updateEnemy(deltaTime);
  }
  updateEffects(deltaTime);
}

function draw() {
  const shakeX = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake : 0;
  const shakeY = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake : 0;

  ctx.setTransform(
    state.dpr * state.scale,
    0,
    0,
    state.dpr * state.scale,
    state.dpr * (state.offsetX + shakeX),
    state.dpr * (state.offsetY + shakeY)
  );
  ctx.clearRect(-40, -40, BASE_WIDTH + 80, BASE_HEIGHT + 80);

  drawBackground();
  drawPlatforms();
  drawObstacles();
  drawPlayer();
  drawEnemy();
  drawTrajectoryPreview();
  drawArrow(state.arrow);
  for (const stuck of state.stuckArrows) drawArrow(stuck);
  drawParticles();
  drawFeedback();
  drawMissBanner();
  drawEnemyHpBar();
  drawAimMeter();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
  gradient.addColorStop(0, "#07080d");
  gradient.addColorStop(0.55, "#121622");
  gradient.addColorStop(1, "#06070c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.save();
  for (const mote of state.dust) {
    ctx.globalAlpha = mote.alpha;
    ctx.fillStyle = mote.color;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = 0; x <= BASE_WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= BASE_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BASE_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatforms() {
  const level = levels[state.levelIndex];
  drawPlatform(70, player.platformY, 330, "#202632");
  drawPlatform(level.enemyX - 150, level.platformY, 300, level.boss ? "#33242b" : "#202632");
}

function drawPlatform(x, y, width, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, 28);
  ctx.strokeRect(x, y, width, 28);
  ctx.fillStyle = "rgba(255, 191, 77, 0.42)";
  ctx.fillRect(x, y, width, 3);
  ctx.restore();
}

function drawPlayer() {
  const t = performance.now() / 1000;
  const joints = getStickmanJoints(player.x - state.playerRecoil * 10, player.platformY, 1, 1, Math.sin(t * 2.5) * 2, 0, false);
  drawStickman(joints, {
    skin: "#f4f7fb",
    line: "#e7edf7",
    joint: "#61b6ff",
    head: "#f4f7fb"
  });
  drawBow();
}

function drawEnemy() {
  const t = performance.now() / 1000;
  const enemy = state.enemy;
  const idle = Math.sin(t * 2.2 + state.levelIndex) * 2.5;
  const joints = getEnemyJoints(idle);
  drawStickman(joints, {
    skin: enemy.boss ? "#ffd6d6" : "#f4f7fb",
    line: enemy.boss ? "#ff8f9b" : "#e7edf7",
    joint: "#ff4f5f",
    head: enemy.boss ? "#ffd6d6" : "#f4f7fb"
  });
}

function drawStickman(j, colors) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = colors.line;
  ctx.fillStyle = colors.joint;
  ctx.lineWidth = 8 * j.scale;
  drawSegment(j.neck, j.hip);
  drawSegment(j.leftShoulder, j.leftElbow);
  drawSegment(j.leftElbow, j.leftHand);
  drawSegment(j.rightShoulder, j.rightElbow);
  drawSegment(j.rightElbow, j.rightHand);
  drawSegment(j.hip, j.leftKnee);
  drawSegment(j.leftKnee, j.leftFoot);
  drawSegment(j.hip, j.rightKnee);
  drawSegment(j.rightKnee, j.rightFoot);

  for (const p of [j.neck, j.hip, j.leftElbow, j.leftHand, j.rightElbow, j.rightHand, j.leftKnee, j.rightKnee]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 * j.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.head;
  ctx.strokeStyle = colors.joint;
  ctx.lineWidth = 3 * j.scale;
  ctx.beginPath();
  ctx.arc(j.head.x, j.head.y, j.head.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBow() {
  const origin = getBowOrigin();
  const pull = state.isAiming ? state.easedPull : { x: 0, y: 0, length: 0 };
  const stringPoint = { x: origin.x - pull.x, y: origin.y - pull.y };
  const arcX = origin.x + 8;
  const arcY = origin.y;
  const radius = 60;

  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#ffbf4d";
  ctx.strokeStyle = "#ffbf4d";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(arcX, arcY, radius, -Math.PI * 0.56, Math.PI * 0.56);
  ctx.stroke();

  const top = { x: arcX + 32, y: arcY - radius * 0.82 };
  const bottom = { x: arcX + 32, y: arcY + radius * 0.82 };
  ctx.shadowBlur = state.isAiming ? 14 : 0;
  ctx.strokeStyle = state.isAiming ? "#f4f7fb" : "rgba(244, 247, 251, 0.78)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(stringPoint.x, stringPoint.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.stroke();

  if (state.isAiming) {
    const aim = getAim();
    drawArrow({
      x: origin.x + Math.cos(aim.angle) * 26,
      y: origin.y + Math.sin(aim.angle) * 26,
      angle: aim.angle,
      trail: [],
      alpha: 0.92
    });
  }
  ctx.restore();
}

function drawArrow(arrow) {
  if (!arrow) return;
  ctx.save();

  if (arrow.trail) {
    for (let i = 0; i < arrow.trail.length; i += 1) {
      const p = arrow.trail[i];
      ctx.fillStyle = `rgba(97, 182, 255, ${(i + 1) / arrow.trail.length * 0.22})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = arrow.alpha ?? 1;
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(arrow.angle);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#f4f7fb";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-ARROW_LENGTH / 2, 0);
  ctx.lineTo(ARROW_LENGTH / 2 - 10, 0);
  ctx.stroke();

  ctx.fillStyle = "#ffbf4d";
  ctx.beginPath();
  ctx.moveTo(ARROW_LENGTH / 2, 0);
  ctx.lineTo(ARROW_LENGTH / 2 - 15, -7);
  ctx.lineTo(ARROW_LENGTH / 2 - 11, 0);
  ctx.lineTo(ARROW_LENGTH / 2 - 15, 7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#61b6ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-ARROW_LENGTH / 2 + 8, 0);
  ctx.lineTo(-ARROW_LENGTH / 2 - 6, -9);
  ctx.moveTo(-ARROW_LENGTH / 2 + 8, 0);
  ctx.lineTo(-ARROW_LENGTH / 2 - 6, 9);
  ctx.stroke();
  ctx.restore();
}

function drawTrajectoryPreview() {
  if (!state.isAiming) return;
  const aim = getAim();
  if (aim.power < MIN_POWER) return;

  let x = aim.startX;
  let y = aim.startY;
  let vx = Math.cos(aim.angle) * aim.power;
  let vy = Math.sin(aim.angle) * aim.power;
  const stepTime = 0.065;

  ctx.save();
  for (let i = 0; i < 32; i += 1) {
    vy += GRAVITY * stepTime;
    vx *= AIR_DRAG;
    vy *= AIR_DRAG;
    x += vx * stepTime;
    y += vy * stepTime;
    const alpha = 1 - i / 34;
    ctx.fillStyle = `rgba(97, 182, 255, ${alpha * 0.82})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, 4 - i * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function shootArrow() {
  // The string eases visually, but release uses the latest raw pull so quick flicks keep their intended power.
  state.easedPull = getRawPull();
  const aim = getAim();
  state.isAiming = false;
  state.pointerPoint = null;
  state.easedPull = { x: 0, y: 0, length: 0 };

  if (aim.power < MIN_POWER || state.arrow) return;

  state.attempts += 1;
  state.totalAttempts += 1;
  state.playerRecoil = 1;
  state.arrow = {
    x: aim.startX,
    y: aim.startY,
    vx: Math.cos(aim.angle) * aim.power,
    vy: Math.sin(aim.angle) * aim.power,
    ax: 0,
    ay: GRAVITY,
    angle: aim.angle,
    active: true,
    stuck: false,
    stuckTimer: 0,
    life: 0,
    trail: []
  };
  updateHud();
}

function updateArrow(deltaTime) {
  if (!state.arrow) {
    updateStuckArrows(deltaTime);
    return;
  }

  const arrow = state.arrow;
  if (arrow.stuck) {
    arrow.stuckTimer -= deltaTime;
    if (arrow.stuckTimer <= 0) state.arrow = null;
    return;
  }

  arrow.life += deltaTime;
  arrow.vx += arrow.ax * deltaTime;
  arrow.vy += arrow.ay * deltaTime;
  arrow.vx *= AIR_DRAG;
  arrow.vy *= AIR_DRAG;
  arrow.x += arrow.vx * deltaTime;
  arrow.y += arrow.vy * deltaTime;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
  arrow.trail.push({ x: arrow.x, y: arrow.y });
  if (arrow.trail.length > 16) arrow.trail.shift();

  checkCollisions();

  const tip = getArrowTip(arrow);
  if (state.arrow && !arrow.stuck && (tip.x > BASE_WIDTH + 80 || tip.x < -100 || tip.y > BASE_HEIGHT + 80 || tip.y < -160 || arrow.life > 4.2)) {
    miss(["YOU MISS", "GRAVITY WINS", "TRY AGAIN", "ALMOST"][Math.floor(Math.random() * 4)]);
  }

  updateStuckArrows(deltaTime);
}

function checkCollisions() {
  if (!state.arrow || state.arrow.stuck) return;
  const tip = getArrowTip(state.arrow);
  const level = levels[state.levelIndex];

  for (const obstacle of level.obstacles) {
    if (pointInRect(tip, obstacle)) {
      stickArrow("obstacle");
      miss("BLOCKED!");
      return;
    }
  }

  const hit = getEnemyHit(tip);
  if (hit) {
    applyDamage(hit);
  }
}

function checkCircleCollision(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.r;
}

function checkSegmentCollision(point, a, b, radius) {
  return distanceToSegment(point, a, b) <= radius;
}

function applyDamage(bodyPart) {
  const arrow = state.arrow;
  const tip = getArrowTip(arrow);
  let damage = 15;
  let score = 75;
  let label = "HIT!";
  let color = "#61b6ff";

  if (bodyPart.part === "head") {
    const perfect = bodyPart.distance <= bodyPart.radius * 0.4;
    damage = perfect ? 60 : 48;
    score = perfect ? 300 : 250;
    label = perfect ? "PERFECT!" : "HEADSHOT!";
    color = perfect ? "#ffbf4d" : "#ff4f5f";
    state.screenShake = perfect ? 17 : 11;
  } else if (bodyPart.part === "torso") {
    damage = 32;
    score = 150;
    label = "GOOD!";
    color = "#f4f7fb";
  } else {
    damage = 16;
    score = 75;
    label = "HIT!";
  }

  state.streak += 1;
  if (state.streak === 2) score += 50;
  if (state.streak >= 3) score += 100;
  state.score += score;
  state.enemy.hp = Math.max(0, state.enemy.hp - damage);
  state.enemy.hitReact = 1;
  state.enemy.lean = bodyPart.part === "head" ? 0.22 : 0.12;
  state.enemy.headKnock = { x: bodyPart.part === "head" ? 10 : 3, y: bodyPart.part === "head" ? -5 : 0 };

  createParticles(tip.x, tip.y, color);
  showFeedback(label, tip.x, tip.y - 34, color);
  showFeedback(`-${damage} HP`, tip.x, tip.y - 5, "#ff4f5f");
  stickArrow("enemy");
  updateHud();

  if (state.enemy.hp <= 0) {
    clearLevel(label);
  }
}

function showFeedback(text, x, y, color = "#f4f7fb") {
  state.feedback.push({ text, x, y, color, life: 1.05, maxLife: 1.05 });
}

function createParticles(x, y, color = "#61b6ff") {
  for (let i = 0; i < 28; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 260;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      color,
      life: 0.65 + Math.random() * 0.45,
      maxLife: 1.1
    });
  }
}

function drawObstacles() {
  ctx.save();
  for (const obstacle of levels[state.levelIndex].obstacles) {
    ctx.fillStyle = "#161a22";
    ctx.strokeStyle = "rgba(255, 191, 77, 0.48)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "rgba(255, 79, 95, 0.45)";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  }
  ctx.restore();
}

function drawEnemyHpBar() {
  const enemy = state.enemy;
  if (!enemy) return;
  const width = enemy.boss ? 190 : 150;
  const height = 14;
  const x = enemy.x - width / 2;
  const y = enemy.platformY - 205 * enemy.scale;
  const fill = enemy.hp / enemy.maxHp;

  ctx.save();
  ctx.fillStyle = "rgba(7, 9, 15, 0.82)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fill > 0.35 ? "#ff4f5f" : "#ffbf4d";
  ctx.fillRect(x, y, width * fill, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const p of state.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFeedback() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const item of state.feedback) {
    const alpha = clamp(item.life / item.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = "900 27px system-ui, sans-serif";
    ctx.fillStyle = item.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.restore();
}

function drawMissBanner() {
  if (!state.missBanner) return;
  const alpha = clamp(state.missBanner.life / state.missBanner.maxLife, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = "#ff4f5f";
  ctx.font = "900 96px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.missBanner.text, BASE_WIDTH / 2, BASE_HEIGHT / 2);
  ctx.restore();
}

function drawAimMeter() {
  if (!state.isAiming) return;
  const aim = getAim();
  const percent = clamp((aim.power - MIN_POWER) / (MAX_POWER - MIN_POWER), 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(7, 9, 15, 0.78)";
  ctx.strokeStyle = "rgba(97, 182, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.fillRect(32, 32, 188, 44);
  ctx.strokeRect(32, 32, 188, 44);
  ctx.fillStyle = "#9ba6b8";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText("POWER", 48, 59);
  ctx.fillStyle = percent > 0.72 ? "#ffbf4d" : "#61b6ff";
  ctx.fillRect(110, 47, 88 * percent, 11);
  ctx.strokeStyle = "rgba(244, 247, 251, 0.32)";
  ctx.strokeRect(110, 47, 88, 11);
  ctx.restore();
}

function clearLevel(lastHitLabel) {
  state.arrow = null;
  state.score += 500;
  updateHud();
  const title = state.levelIndex === levels.length - 1 ? "FINAL SHOT!" : "Level Complete!";
  state.mode = "levelComplete";

  window.setTimeout(() => {
    if (state.levelIndex === levels.length - 1) {
      finishGame(lastHitLabel === "PERFECT!" ? "VICTORY!" : title);
    } else if (state.mode === "levelComplete") {
      messageTitle.textContent = "Level Complete!";
      messageBody.textContent = `Score: ${state.score} | Streak: ${state.streak}`;
      nextBtn.textContent = "Next Level";
      nextBtn.classList.remove("hidden");
      messageOverlay.classList.remove("hidden");
    }
  }, 650);
}

function miss(text) {
  if (state.arrow && !state.arrow.stuck) stickArrow("miss");
  state.streak = 0;
  state.missBanner = { text, life: 1.2, maxLife: 1.2 };
  showFeedback(text, BASE_WIDTH / 2, BASE_HEIGHT * 0.42, "#ff4f5f");
  updateHud();
}

function stickArrow(kind) {
  if (!state.arrow) return;
  state.arrow.stuck = true;
  state.arrow.active = false;
  state.arrow.vx = 0;
  state.arrow.vy = 0;
  state.arrow.stuckTimer = kind === "enemy" ? 0.55 : 0.75;
}

function updateStuckArrows(deltaTime) {
  for (const arrow of state.stuckArrows) arrow.stuckTimer -= deltaTime;
  state.stuckArrows = state.stuckArrows.filter((arrow) => arrow.stuckTimer > 0);
}

function updateEffects(deltaTime) {
  state.screenShake = Math.max(0, state.screenShake - deltaTime * 46);
  state.playerRecoil = Math.max(0, state.playerRecoil - deltaTime * 6);

  for (const mote of state.dust) {
    mote.x += mote.vx * deltaTime;
    mote.y += mote.vy * deltaTime;
    if (mote.y > BASE_HEIGHT + 10) mote.y = -10;
    if (mote.x < -10) mote.x = BASE_WIDTH + 10;
    if (mote.x > BASE_WIDTH + 10) mote.x = -10;
  }

  for (const p of state.particles) {
    p.life -= deltaTime;
    p.vy += GRAVITY * 0.35 * deltaTime;
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  for (const item of state.feedback) {
    item.life -= deltaTime;
    item.y -= 34 * deltaTime;
  }
  state.feedback = state.feedback.filter((item) => item.life > 0);

  if (state.missBanner) {
    state.missBanner.life -= deltaTime;
    if (state.missBanner.life <= 0) state.missBanner = null;
  }
}

function updateEnemy(deltaTime) {
  if (!state.enemy) return;
  state.enemy.hitReact = Math.max(0, state.enemy.hitReact - deltaTime * 2.5);
  state.enemy.lean *= Math.pow(0.02, deltaTime);
  state.enemy.headKnock.x *= Math.pow(0.03, deltaTime);
  state.enemy.headKnock.y *= Math.pow(0.03, deltaTime);
}

function updateAimEasing() {
  if (!state.isAiming || !state.pointerPoint) return;
  const pull = getRawPull();
  state.easedPull.x += (pull.x - state.easedPull.x) * AIM_EASE;
  state.easedPull.y += (pull.y - state.easedPull.y) * AIM_EASE;
  state.easedPull.length = Math.hypot(state.easedPull.x, state.easedPull.y);
}

function getAim() {
  const origin = getBowOrigin();
  const pull = state.isAiming ? state.easedPull : getRawPull();
  const length = clamp(pull.length, 0, MAX_PULL);
  const angle = Math.atan2(pull.y, pull.x);
  const power = length < 10 ? 0 : MIN_POWER + (length / MAX_PULL) * (MAX_POWER - MIN_POWER);
  return { startX: origin.x, startY: origin.y, angle, power, pullLength: length };
}

function getRawPull() {
  const origin = getBowOrigin();
  if (!state.pointerPoint) return { x: 0, y: 0, length: 0 };
  const dx = origin.x - state.pointerPoint.x;
  const dy = origin.y - state.pointerPoint.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0, length: 0 };
  const capped = Math.min(length, MAX_PULL);
  return {
    x: (dx / length) * capped,
    y: (dy / length) * capped,
    length: capped
  };
}

function getBowOrigin() {
  return {
    x: player.x + 46 - state.playerRecoil * 12,
    y: player.platformY - 104 + Math.sin(performance.now() / 430) * 1.5
  };
}

function getStickmanJoints(x, platformY, scale, facing, idle, lean, boss) {
  const s = scale;
  const footY = platformY - 2;
  const hip = { x, y: footY - 74 * s + idle };
  const neck = { x: x + lean * 35 * s, y: hip.y - 82 * s };
  const head = { x: neck.x + lean * 16 * s, y: neck.y - 38 * s, r: (boss ? 26 : 23) * s };
  const shoulderSpread = 29 * s;
  const leftShoulder = { x: neck.x - shoulderSpread * facing, y: neck.y + 12 * s };
  const rightShoulder = { x: neck.x + shoulderSpread * facing, y: neck.y + 12 * s };
  const leftElbow = { x: leftShoulder.x - 30 * facing * s, y: leftShoulder.y + 32 * s };
  const leftHand = { x: leftElbow.x - 30 * facing * s, y: leftElbow.y + 28 * s };
  const rightElbow = { x: rightShoulder.x + 38 * facing * s, y: rightShoulder.y + 10 * s };
  const rightHand = { x: rightElbow.x + 32 * facing * s, y: rightElbow.y + 18 * s };
  const leftKnee = { x: hip.x - 24 * facing * s, y: hip.y + 58 * s };
  const rightKnee = { x: hip.x + 27 * facing * s, y: hip.y + 58 * s };
  const leftFoot = { x: leftKnee.x - 22 * facing * s, y: footY };
  const rightFoot = { x: rightKnee.x + 22 * facing * s, y: footY };

  return {
    scale: s,
    head,
    neck,
    hip,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
    leftKnee,
    rightKnee,
    leftFoot,
    rightFoot
  };
}

function getEnemyJoints(idle = 0) {
  const enemy = state.enemy;
  const facing = -1;
  const j = getStickmanJoints(enemy.x, enemy.platformY, enemy.scale, facing, idle, enemy.lean, enemy.boss);
  j.head.x += enemy.headKnock.x;
  j.head.y += enemy.headKnock.y;
  j.leftElbow.y += Math.sin(enemy.hitReact * Math.PI) * 13;
  j.rightKnee.x += Math.sin(enemy.hitReact * Math.PI) * 10;
  return j;
}

function getEnemyHit(point) {
  const j = getEnemyJoints(0);
  if (checkCircleCollision(point, j.head)) {
    return { part: "head", distance: Math.hypot(point.x - j.head.x, point.y - j.head.y), radius: j.head.r };
  }

  const torsoRadius = 15 * j.scale;
  if (checkSegmentCollision(point, j.neck, j.hip, torsoRadius)) return { part: "torso" };

  const limbRadius = 11 * j.scale;
  const arms = [
    [j.leftShoulder, j.leftElbow],
    [j.leftElbow, j.leftHand],
    [j.rightShoulder, j.rightElbow],
    [j.rightElbow, j.rightHand]
  ];
  for (const [a, b] of arms) {
    if (checkSegmentCollision(point, a, b, limbRadius)) return { part: "arm" };
  }

  const legs = [
    [j.hip, j.leftKnee],
    [j.leftKnee, j.leftFoot],
    [j.hip, j.rightKnee],
    [j.rightKnee, j.rightFoot]
  ];
  for (const [a, b] of legs) {
    if (checkSegmentCollision(point, a, b, limbRadius)) return { part: "leg" };
  }
  return null;
}

function getArrowTip(arrow) {
  return {
    x: arrow.x + Math.cos(arrow.angle) * (ARROW_LENGTH / 2),
    y: arrow.y + Math.sin(arrow.angle) * (ARROW_LENGTH / 2)
  };
}

function drawSegment(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function distanceToSegment(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function createDust() {
  state.dust = [];
  for (let i = 0; i < 90; i += 1) {
    state.dust.push({
      x: Math.random() * BASE_WIDTH,
      y: Math.random() * BASE_HEIGHT,
      vx: -8 + Math.random() * 18,
      vy: 10 + Math.random() * 26,
      size: 1 + Math.random() * 2.2,
      alpha: 0.08 + Math.random() * 0.18,
      color: Math.random() > 0.7 ? "#ffbf4d" : "#ffffff"
    });
  }
}

function updateHud() {
  levelText.textContent = String(Math.min(state.levelIndex + 1, levels.length));
  scoreText.textContent = String(state.score);
  streakText.textContent = String(state.streak);
  attemptText.textContent = String(state.attempts);
  enemyHpText.textContent = state.enemy ? `${Math.ceil(state.enemy.hp)}/${state.enemy.maxHp}` : "0";
}

function setMessage(title, body, showButton) {
  messageTitle.textContent = title;
  messageBody.textContent = body;
  nextBtn.classList.toggle("hidden", !showButton);
  messageOverlay.classList.remove("hidden");
}

function hideMessage() {
  messageOverlay.classList.add("hidden");
  nextBtn.textContent = "Next Level";
  pauseBtn.textContent = "Pause";
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.max(1, Math.round(rect.width * state.dpr));
  canvas.height = Math.max(1, Math.round(rect.height * state.dpr));
  state.scale = Math.min(rect.width / BASE_WIDTH, rect.height / BASE_HEIGHT);
  state.offsetX = (rect.width - BASE_WIDTH * state.scale) / 2;
  state.offsetY = (rect.height - BASE_HEIGHT * state.scale) / 2;
}

function toWorldPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - state.offsetX) / state.scale,
    y: (event.clientY - rect.top - state.offsetY) / state.scale
  };
}

function isNearPlayer(point) {
  const origin = getBowOrigin();
  return Math.hypot(point.x - origin.x, point.y - origin.y) <= 150;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function onPointerDown(event) {
  if (state.mode !== "playing" || state.arrow) return;
  const point = toWorldPoint(event);
  if (!isNearPlayer(point)) return;

  state.isAiming = true;
  state.pointerId = event.pointerId;
  state.pointerPoint = point;
  state.easedPull = getRawPull();
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!state.isAiming || event.pointerId !== state.pointerId) return;
  state.pointerPoint = toWorldPoint(event);
}

function onPointerUp(event) {
  if (!state.isAiming || event.pointerId !== state.pointerId) return;
  shootArrow();
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  state.pointerId = null;
}

function onPointerCancel(event) {
  if (event.pointerId !== state.pointerId) return;
  state.isAiming = false;
  state.pointerPoint = null;
  state.pointerId = null;
}

function gameLoop(timestamp) {
  const deltaTime = Math.min((timestamp - state.lastTime) / 1000 || 0, 0.033);
  state.lastTime = timestamp;
  update(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartLevel);
resetBtn.addEventListener("click", resetGame);
pauseBtn.addEventListener("click", togglePause);
nextBtn.addEventListener("click", nextLevel);

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerCancel);
window.addEventListener("resize", resizeCanvas);

initGame();
