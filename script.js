"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const streakText = document.getElementById("streakText");
const attemptText = document.getElementById("attemptText");
const menuOverlay = document.getElementById("menuOverlay");
const messageOverlay = document.getElementById("messageOverlay");
const messageTitle = document.getElementById("messageTitle");
const messageBody = document.getElementById("messageBody");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const resetBtn = document.getElementById("resetBtn");
const nextBtn = document.getElementById("nextBtn");

const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;
const GRAVITY = 540;
const MAX_PULL = 150;
const POWER_SCALE = 6.1;
const AIR_DRAG = 0.999;

const levels = [
  { x: 660, y: 286, r: 56, obstacles: [] },
  { x: 735, y: 278, r: 52, obstacles: [] },
  { x: 760, y: 284, r: 43, obstacles: [] },
  { x: 750, y: 190, r: 43, obstacles: [] },
  { x: 820, y: 370, r: 40, obstacles: [] },
  { x: 780, y: 274, r: 39, obstacles: [{ x: 455, y: 250, w: 48, h: 150 }] },
  { x: 805, y: 170, r: 33, obstacles: [{ x: 515, y: 310, w: 58, h: 132 }] },
  { x: 855, y: 265, r: 34, obstacles: [{ x: 600, y: 335, w: 50, h: 132 }] },
  { x: 865, y: 215, r: 32, obstacles: [{ x: 520, y: 310, w: 46, h: 120 }, { x: 690, y: 82, w: 46, h: 96 }] },
  { x: 875, y: 190, r: 28, obstacles: [{ x: 545, y: 322, w: 46, h: 128 }, { x: 735, y: 82, w: 42, h: 78 }] }
];

const state = {
  mode: "menu",
  levelIndex: 0,
  score: 0,
  streak: 0,
  attempts: 0,
  arrow: null,
  isDragging: false,
  pointerId: null,
  pullPoint: null,
  feedback: [],
  particles: [],
  missBanner: null,
  levelCompleteTimer: 0,
  lastTime: 0,
  dpr: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

const bow = {
  x: 132,
  y: 300,
  radius: 82
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.round(rect.width * state.dpr);
  canvas.height = Math.round(rect.height * state.dpr);
  state.scale = Math.min(rect.width / BASE_WIDTH, rect.height / BASE_HEIGHT);
  state.offsetX = (rect.width - BASE_WIDTH * state.scale) / 2;
  state.offsetY = (rect.height - BASE_HEIGHT * state.scale) / 2;
  ctx.setTransform(state.dpr * state.scale, 0, 0, state.dpr * state.scale, state.dpr * state.offsetX, state.dpr * state.offsetY);
}

function toWorldPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - state.offsetX) / state.scale,
    y: (event.clientY - rect.top - state.offsetY) / state.scale
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function currentLevel() {
  return levels[state.levelIndex];
}

function updateHud() {
  levelText.textContent = Math.min(state.levelIndex + 1, levels.length).toString();
  scoreText.textContent = state.score.toString();
  streakText.textContent = state.streak.toString();
  attemptText.textContent = state.attempts.toString();
}

function setMessage(title, body, showNext) {
  messageTitle.textContent = title;
  messageBody.textContent = body;
  nextBtn.classList.toggle("hidden", !showNext);
  messageOverlay.classList.remove("hidden");
}

function hideMessage() {
  messageOverlay.classList.add("hidden");
}

function startGame() {
  state.mode = "playing";
  state.levelIndex = 0;
  state.score = 0;
  state.streak = 0;
  resetLevelRuntime();
  menuOverlay.classList.add("hidden");
  hideMessage();
  updateHud();
}

function resetLevelRuntime() {
  state.attempts = 0;
  state.arrow = null;
  state.isDragging = false;
  state.pointerId = null;
  state.pullPoint = null;
  state.feedback = [];
  state.particles = [];
  state.missBanner = null;
  state.levelCompleteTimer = 0;
}

function restartLevel() {
  if (state.mode === "menu") return;
  state.mode = "playing";
  state.streak = 0;
  resetLevelRuntime();
  hideMessage();
  updateHud();
}

function resetGame() {
  state.mode = "menu";
  state.levelIndex = 0;
  state.score = 0;
  state.streak = 0;
  resetLevelRuntime();
  menuOverlay.classList.remove("hidden");
  hideMessage();
  updateHud();
}

function nextLevel() {
  if (state.levelIndex >= levels.length - 1) {
    finishGame();
    return;
  }
  state.levelIndex += 1;
  state.mode = "playing";
  resetLevelRuntime();
  hideMessage();
  updateHud();
}

function finishGame() {
  state.mode = "finished";
  setMessage("Victory!", `Final score: ${state.score}. The dark range is yours.`, false);
}

function isNearBow(point) {
  return distance(point, bow) < 125;
}

function getPullVector() {
  if (!state.pullPoint) return { x: 0, y: 0, length: 0 };
  const raw = {
    x: bow.x - state.pullPoint.x,
    y: bow.y - state.pullPoint.y
  };
  const length = Math.min(Math.hypot(raw.x, raw.y), MAX_PULL);
  if (length === 0) return { x: 0, y: 0, length: 0 };
  return {
    x: (raw.x / Math.hypot(raw.x, raw.y)) * length,
    y: (raw.y / Math.hypot(raw.x, raw.y)) * length,
    length
  };
}

function launchArrow() {
  const pull = getPullVector();
  if (pull.length < 14) {
    state.isDragging = false;
    state.pullPoint = null;
    return;
  }

  state.attempts += 1;
  state.arrow = {
    x: bow.x,
    y: bow.y,
    vx: pull.x * POWER_SCALE,
    vy: pull.y * POWER_SCALE,
    angle: Math.atan2(pull.y, pull.x),
    active: true,
    trail: []
  };
  state.isDragging = false;
  state.pullPoint = null;
  updateHud();
}

function addFeedback(text, x, y, color) {
  state.feedback.push({ text, x, y, color, life: 1.15, maxLife: 1.15 });
}

function addMiss(message) {
  state.streak = 0;
  state.missBanner = { text: message, life: 1.35, maxLife: 1.35 };
  addFeedback(message, BASE_WIDTH * 0.5, BASE_HEIGHT * 0.42, "#ff6a9f");
  state.arrow = null;
  updateHud();
}

function addParticles(x, y, color) {
  for (let i = 0; i < 42; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 250;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.75 + Math.random() * 0.55,
      maxLife: 1.2,
      size: 2 + Math.random() * 4,
      color
    });
  }
}

function scoreHit(hitDistance, targetRadius) {
  const normalized = hitDistance / targetRadius;
  let label = "Good!";
  let points = 100;
  let color = "#39f5d4";

  if (normalized <= 0.22) {
    label = state.streak >= 2 ? "Bullseye!" : "Perfect!";
    points = 250;
    color = "#ffd166";
  } else if (normalized <= 0.52) {
    label = "Great!";
    points = 150;
    color = "#ff4fd8";
  }

  state.streak += 1;
  if (state.streak === 2) points += 50;
  if (state.streak >= 3) points += 100;
  state.score += points;

  return { label, points, color };
}

function completeLevel(hitDistance) {
  const level = currentLevel();
  const result = scoreHit(hitDistance, level.r);
  addParticles(level.x, level.y, result.color);
  addFeedback(`${result.label} +${result.points}`, level.x - 18, level.y - level.r - 30, result.color);
  state.arrow = null;
  state.mode = "levelComplete";
  state.levelCompleteTimer = 0.9;
  updateHud();

  if (state.levelIndex === levels.length - 1) {
    window.setTimeout(finishGame, 850);
  } else {
    window.setTimeout(() => {
      if (state.mode === "levelComplete") {
        setMessage("Level Complete!", `${result.label} Ready for level ${state.levelIndex + 2}.`, true);
      }
    }, 760);
  }
}

function arrowTip(arrow) {
  return {
    x: arrow.x + Math.cos(arrow.angle) * 31,
    y: arrow.y + Math.sin(arrow.angle) * 31
  };
}

function rectContains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function updateArrow(dt) {
  if (!state.arrow || !state.arrow.active) return;

  const arrow = state.arrow;
  arrow.vy += GRAVITY * dt;
  arrow.vx *= AIR_DRAG;
  arrow.vy *= AIR_DRAG;
  arrow.x += arrow.vx * dt;
  arrow.y += arrow.vy * dt;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
  arrow.trail.push({ x: arrow.x, y: arrow.y });
  if (arrow.trail.length > 12) arrow.trail.shift();

  const tip = arrowTip(arrow);
  const level = currentLevel();
  const hitDistance = Math.hypot(tip.x - level.x, tip.y - level.y);

  if (hitDistance <= level.r) {
    completeLevel(hitDistance);
    return;
  }

  for (const obstacle of level.obstacles) {
    if (rectContains(obstacle, tip)) {
      addMiss("Blocked!");
      return;
    }
  }

  if (tip.x < -80 || tip.x > BASE_WIDTH + 100 || tip.y > BASE_HEIGHT + 90 || tip.y < -130) {
    const misses = ["You Miss!", "Try Again!", "Gravity Wins!", "Almost!"];
    addMiss(misses[Math.floor(Math.random() * misses.length)]);
  }
}

function updateEffects(dt) {
  for (const item of state.feedback) {
    item.life -= dt;
    item.y -= 22 * dt;
  }
  state.feedback = state.feedback.filter((item) => item.life > 0);

  for (const particle of state.particles) {
    particle.life -= dt;
    particle.vy += GRAVITY * 0.42 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.missBanner) {
    state.missBanner.life -= dt;
    if (state.missBanner.life <= 0) state.missBanner = null;
  }
}

function update(dt) {
  if (state.mode === "playing" || state.mode === "levelComplete") {
    updateArrow(dt);
  }
  updateEffects(dt);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
  gradient.addColorStop(0, "#080b17");
  gradient.addColorStop(0.52, "#101525");
  gradient.addColorStop(1, "#070811");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = "#39f5d4";
  ctx.lineWidth = 1;
  for (let x = 0; x <= BASE_WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= BASE_HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BASE_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(57, 245, 212, 0.12)";
  ctx.fillRect(0, BASE_HEIGHT - 34, BASE_WIDTH, 2);
}

function drawBow() {
  const pull = getPullVector();
  const stringPoint = state.isDragging ? { x: bow.x - pull.x, y: bow.y - pull.y } : bow;

  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#39f5d4";
  ctx.strokeStyle = "#39f5d4";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(bow.x - 18, bow.y, bow.radius, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();

  ctx.shadowBlur = state.isDragging ? 20 : 6;
  ctx.strokeStyle = state.isDragging ? "#ffd166" : "rgba(239, 247, 255, 0.82)";
  ctx.lineWidth = 2.5;
  const top = { x: bow.x + 30, y: bow.y - bow.radius * 0.82 };
  const bottom = { x: bow.x + 30, y: bow.y + bow.radius * 0.82 };
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(stringPoint.x, stringPoint.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.stroke();

  if (state.isDragging) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(stringPoint.x, stringPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTrajectory() {
  if (!state.isDragging || !state.pullPoint) return;
  const pull = getPullVector();
  if (pull.length < 12) return;

  let x = bow.x;
  let y = bow.y;
  let vx = pull.x * POWER_SCALE;
  let vy = pull.y * POWER_SCALE;
  const step = 0.075;

  ctx.save();
  for (let i = 0; i < 28; i += 1) {
    vy += GRAVITY * step;
    x += vx * step;
    y += vy * step;
    const alpha = 1 - i / 30;
    ctx.fillStyle = `rgba(57, 245, 212, ${alpha * 0.75})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, 4 - i * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArrow(arrow) {
  if (!arrow) return;
  ctx.save();

  for (let i = 0; i < arrow.trail.length; i += 1) {
    const point = arrow.trail[i];
    ctx.fillStyle = `rgba(57, 245, 212, ${i / arrow.trail.length * 0.24})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(arrow.angle);
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#39f5d4";
  ctx.strokeStyle = "#eff7ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.lineTo(28, 0);
  ctx.stroke();

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(35, 0);
  ctx.lineTo(20, -7);
  ctx.lineTo(23, 0);
  ctx.lineTo(20, 7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ff4fd8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-42, -8);
  ctx.moveTo(-30, 0);
  ctx.lineTo(-42, 8);
  ctx.stroke();
  ctx.restore();
}

function drawTarget() {
  const level = currentLevel();
  const rings = [
    { factor: 1, color: "#eff7ff" },
    { factor: 0.78, color: "#ff4fd8" },
    { factor: 0.56, color: "#101525" },
    { factor: 0.34, color: "#39f5d4" },
    { factor: 0.17, color: "#ffd166" }
  ];

  ctx.save();
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#ff4fd8";
  for (const ring of rings) {
    ctx.fillStyle = ring.color;
    ctx.beginPath();
    ctx.arc(level.x, level.y, level.r * ring.factor, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(level.x, level.y, level.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawObstacles() {
  ctx.save();
  for (const obstacle of currentLevel().obstacles) {
    const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    gradient.addColorStop(0, "rgba(255, 79, 216, 0.84)");
    gradient.addColorStop(1, "rgba(57, 245, 212, 0.58)");
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff4fd8";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.46)";
    ctx.lineWidth = 2;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
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
    ctx.font = "800 32px system-ui, sans-serif";
    ctx.fillStyle = item.color;
    ctx.shadowBlur = 24;
    ctx.shadowColor = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.restore();

  if (state.missBanner) {
    const alpha = clamp(state.missBanner.life / state.missBanner.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = "#ff6a9f";
    ctx.font = "900 86px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.missBanner.text.toUpperCase(), BASE_WIDTH / 2, BASE_HEIGHT / 2);
    ctx.restore();
  }
}

function drawAimPower() {
  if (!state.isDragging || !state.pullPoint) return;
  const pull = getPullVector();
  const percent = Math.round((pull.length / MAX_PULL) * 100);
  ctx.save();
  ctx.fillStyle = "rgba(8, 11, 21, 0.72)";
  ctx.strokeStyle = "rgba(57, 245, 212, 0.42)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(28, 28, 168, 42, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#94a2b8";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText("POWER", 44, 54);
  ctx.fillStyle = "#39f5d4";
  ctx.fillRect(101, 43, 72 * (percent / 100), 10);
  ctx.strokeStyle = "rgba(239, 247, 255, 0.38)";
  ctx.strokeRect(101, 43, 72, 10);
  ctx.restore();
}

function render() {
  ctx.setTransform(state.dpr * state.scale, 0, 0, state.dpr * state.scale, state.dpr * state.offsetX, state.dpr * state.offsetY);
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  drawBackground();
  drawTarget();
  drawObstacles();
  drawTrajectory();
  drawBow();
  drawArrow(state.arrow);
  drawParticles();
  drawFeedback();
  drawAimPower();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - state.lastTime) / 1000 || 0, 0.033);
  state.lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function onPointerDown(event) {
  if (state.mode !== "playing" || state.arrow) return;
  const point = toWorldPoint(event);
  if (!isNearBow(point)) return;

  state.isDragging = true;
  state.pointerId = event.pointerId;
  state.pullPoint = point;
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!state.isDragging || event.pointerId !== state.pointerId) return;
  const point = toWorldPoint(event);
  const dx = point.x - bow.x;
  const dy = point.y - bow.y;
  const length = Math.hypot(dx, dy);

  if (length > MAX_PULL) {
    state.pullPoint = {
      x: bow.x + (dx / length) * MAX_PULL,
      y: bow.y + (dy / length) * MAX_PULL
    };
  } else {
    state.pullPoint = point;
  }
}

function onPointerUp(event) {
  if (!state.isDragging || event.pointerId !== state.pointerId) return;
  launchArrow();
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  state.pointerId = null;
}

function onPointerCancel(event) {
  if (event.pointerId !== state.pointerId) return;
  state.isDragging = false;
  state.pullPoint = null;
  state.pointerId = null;
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartLevel);
resetBtn.addEventListener("click", resetGame);
nextBtn.addEventListener("click", nextLevel);

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerCancel);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateHud();
requestAnimationFrame(loop);
