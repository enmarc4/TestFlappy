import { GAME_CONFIG, STORAGE_KEYS } from "./config.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickWeightedPowerUp() {
  const pool = GAME_CONFIG.powerUps.pool;
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of pool) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }

  return pool[pool.length - 1];
}

function getDifficulty(runTime) {
  if (runTime < GAME_CONFIG.difficulty.phase1.until) {
    return { phase: 1, ...GAME_CONFIG.difficulty.phase1 };
  }

  if (runTime < GAME_CONFIG.difficulty.phase2.until) {
    return { phase: 2, ...GAME_CONFIG.difficulty.phase2 };
  }

  return { phase: 3, ...GAME_CONFIG.difficulty.phase3 };
}

function getObstacleWidth(worldWidth) {
  return clamp(worldWidth * 0.09, GAME_CONFIG.spawn.obstacleWidthMin, GAME_CONFIG.spawn.obstacleWidthMax);
}

function writeHighScore(score) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.highScore, String(score));
  } catch {
    // Local storage can fail in strict/private contexts; gameplay continues.
  }
}

function applyWorldResync(state) {
  const player = state.player;
  player.baseX = state.world.width * GAME_CONFIG.player.baseXFactor;
  player.x = clamp(player.x, player.radius + 12, state.world.width * GAME_CONFIG.player.maxXFactor);
  player.y = clamp(player.y, player.radius + 1, state.world.height - player.radius - 1);
}

export function resizeWorld(state, width, height, dpr) {
  state.world.width = width;
  state.world.height = height;
  state.world.dpr = dpr;
  applyWorldResync(state);
}

export function resetRound(state, mode = "menu") {
  state.mode = mode;
  state.runTime = 0;
  state.difficultyPhase = 1;
  state.player.x = state.world.width * GAME_CONFIG.player.baseXFactor;
  state.player.baseX = state.player.x;
  state.player.y = state.world.height * 0.48;
  state.player.vx = 0;
  state.player.vy = 0;
  state.obstacles = [];
  state.collectibles = [];
  state.score = 0;
  state.spawnTimer = 0.16;
  state.charges = 0;
  state.heat = 0;
  state.overheatTimer = 0;
  state.invulnerabilityTimer = 0;
  state.activePowerUp = null;
  state.shieldHitsRemaining = 0;
  state.gapWidenTimer = 0;
  state.fluxBoostTimer = 0;
  state.ui.activePowerLabel = "-";
}

export function startGame(state) {
  if (state.mode === "playing") {
    return;
  }

  resetRound(state, "playing");
}

export function triggerFlap(state) {
  if (state.mode === "menu") {
    startGame(state);
  }

  if (state.mode !== "playing") {
    return;
  }

  state.player.vy = GAME_CONFIG.physics.flapImpulse;
}

function setPowerLabel(state, type) {
  if (!type) {
    state.ui.activePowerLabel = "-";
    return;
  }

  const power = GAME_CONFIG.powerUps.pool.find((candidate) => candidate.type === type);
  state.ui.activePowerLabel = power ? power.label : "-";
}

function consumeShield(state) {
  state.shieldHitsRemaining = 0;
  state.invulnerabilityTimer = GAME_CONFIG.player.invulnerabilityAfterShield;

  if (state.activePowerUp?.type === "shield") {
    state.activePowerUp = null;
    setPowerLabel(state, null);
  }
}

function activateOverheat(state) {
  state.overheatTimer = GAME_CONFIG.powerUps.overheatDuration;
}

export function tryActivatePowerUp(state) {
  if (state.mode !== "playing") {
    return false;
  }

  if (state.charges <= 0 || state.overheatTimer > 0 || state.activePowerUp) {
    return false;
  }

  const selected = pickWeightedPowerUp();
  state.charges -= 1;
  state.heat = clamp(state.heat + GAME_CONFIG.powerUps.heatPerUse, 0, GAME_CONFIG.powerUps.overheatThreshold);

  if (state.heat >= GAME_CONFIG.powerUps.overheatThreshold) {
    activateOverheat(state);
  }

  state.activePowerUp = {
    type: selected.type,
    label: selected.label,
    timeLeft: selected.duration,
  };

  if (selected.type === "shield") {
    state.shieldHitsRemaining = 1;
  }

  if (selected.type === "gap") {
    state.gapWidenTimer = Math.max(state.gapWidenTimer, selected.duration);
  }

  if (selected.type === "flux") {
    state.fluxBoostTimer = Math.max(state.fluxBoostTimer, selected.duration);
    state.player.vx = Math.max(state.player.vx, GAME_CONFIG.player.fluxPush);
    state.player.vy *= 0.78;
  }

  setPowerLabel(state, selected.type);
  state.ui.lastPowerActivationTime = state.totalTime;

  return true;
}

function spawnObstacle(state, difficulty) {
  const width = getObstacleWidth(state.world.width);
  const gapHeightBase = difficulty.gapHeight;
  const gapHeight = clamp(
    gapHeightBase + (state.gapWidenTimer > 0 ? 46 : 0),
    130,
    state.world.height - 130
  );
  const halfGap = gapHeight * 0.5;
  const minCenter = halfGap + 30;
  const maxCenter = state.world.height - halfGap - 30;
  const gapY = clamp(
    minCenter + Math.random() * (maxCenter - minCenter),
    minCenter,
    maxCenter
  );

  const previous = state.obstacles[state.obstacles.length - 1];
  const spawnStart = state.world.width + width;
  const x = previous
    ? Math.max(spawnStart, previous.x + previous.width + GAME_CONFIG.spawn.obstacleSpacingMin)
    : spawnStart;

  const obstacle = {
    x,
    width,
    gapY,
    gapHeight,
    scored: false,
  };

  state.obstacles.push(obstacle);

  if (Math.random() > difficulty.collectibleChance) {
    return;
  }

  const collectibleRadius = GAME_CONFIG.spawn.collectibleRadius;
  const edgeOffset = Math.max(halfGap - collectibleRadius - 8, 10);
  const direction = Math.random() < 0.5 ? -1 : 1;
  const collectibleY = clamp(
    gapY + direction * edgeOffset,
    collectibleRadius + GAME_CONFIG.spawn.edgeMargin,
    state.world.height - collectibleRadius - GAME_CONFIG.spawn.edgeMargin
  );

  state.collectibles.push({
    x: x + width * 0.5,
    y: collectibleY,
    radius: collectibleRadius,
    bonus: GAME_CONFIG.spawn.collectibleBonus,
  });
}

function triggerGameOver(state) {
  state.mode = "gameover";
  state.activePowerUp = null;
  setPowerLabel(state, null);

  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
}

function tryConsumeImpact(state) {
  if (state.shieldHitsRemaining > 0) {
    consumeShield(state);
    return true;
  }

  return false;
}

function updateTimers(state, dt) {
  if (state.heat > 0) {
    state.heat = Math.max(0, state.heat - GAME_CONFIG.powerUps.heatDissipationPerSec * dt);
  }

  if (state.overheatTimer > 0) {
    state.overheatTimer = Math.max(0, state.overheatTimer - dt);
  }

  if (state.invulnerabilityTimer > 0) {
    state.invulnerabilityTimer = Math.max(0, state.invulnerabilityTimer - dt);
  }

  if (state.gapWidenTimer > 0) {
    state.gapWidenTimer = Math.max(0, state.gapWidenTimer - dt);
  }

  if (state.fluxBoostTimer > 0) {
    state.fluxBoostTimer = Math.max(0, state.fluxBoostTimer - dt);
  }

  if (state.activePowerUp) {
    state.activePowerUp.timeLeft = Math.max(0, state.activePowerUp.timeLeft - dt);
    if (state.activePowerUp.timeLeft <= 0) {
      if (state.activePowerUp.type === "shield" && state.shieldHitsRemaining > 0) {
        state.shieldHitsRemaining = 0;
      }
      state.activePowerUp = null;
      setPowerLabel(state, null);
    }
  }
}

function updatePlayer(state, dt) {
  const { player } = state;
  const gravityMultiplier =
    (state.fluxBoostTimer > 0 ? GAME_CONFIG.physics.fluxGravityMultiplier : 1) *
    (state.overheatTimer > 0 ? GAME_CONFIG.physics.overheatGravityMultiplier : 1);

  player.vy += GAME_CONFIG.physics.gravity * gravityMultiplier * dt;
  player.vy = Math.min(player.vy, GAME_CONFIG.physics.maxFallSpeed);
  player.y += player.vy * dt;

  if (state.fluxBoostTimer > 0) {
    player.vx += 38 * dt;
  }

  player.vx *= Math.exp(-GAME_CONFIG.player.horizontalDrag * dt);
  player.x += player.vx * dt;
  player.x += (player.baseX - player.x) * GAME_CONFIG.player.horizontalSpring * dt;

  const minX = player.radius + 12;
  const maxX = state.world.width * GAME_CONFIG.player.maxXFactor;
  player.x = clamp(player.x, minX, maxX);
}

function updateObstacles(state, dt, difficulty) {
  const speed = difficulty.obstacleSpeed;

  for (const obstacle of state.obstacles) {
    obstacle.x -= speed * dt;
  }

  for (const collectible of state.collectibles) {
    collectible.x -= speed * dt;
  }

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -100);
  state.collectibles = state.collectibles.filter((collectible) => collectible.x + collectible.radius > -80);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObstacle(state, difficulty);
    state.spawnTimer += difficulty.spawnInterval;
  }
}

function scorePassedObstacles(state) {
  for (const obstacle of state.obstacles) {
    if (!obstacle.scored && obstacle.x + obstacle.width < state.player.x - state.player.radius) {
      obstacle.scored = true;
      state.score += 1;
    }
  }
}

function collectCharges(state) {
  const player = state.player;

  state.collectibles = state.collectibles.filter((collectible) => {
    const dx = collectible.x - player.x;
    const dy = collectible.y - player.y;
    const distanceSquared = dx * dx + dy * dy;
    const minDistance = collectible.radius + player.radius;

    if (distanceSquared <= minDistance * minDistance) {
      state.charges = Math.min(GAME_CONFIG.powerUps.maxCharges, state.charges + 1);
      state.score += collectible.bonus;
      return false;
    }

    return true;
  });
}

function checkBoundsCollision(state) {
  const player = state.player;

  if (player.y - player.radius >= 0 && player.y + player.radius <= state.world.height) {
    return;
  }

  if (state.invulnerabilityTimer <= 0 && tryConsumeImpact(state)) {
    player.y = clamp(player.y, player.radius + 2, state.world.height - player.radius - 2);
    player.vy *= GAME_CONFIG.physics.groundBounceDamping;
    return;
  }

  triggerGameOver(state);
}

function checkObstacleCollision(state) {
  if (state.mode !== "playing") {
    return;
  }

  if (state.invulnerabilityTimer > 0) {
    return;
  }

  const player = state.player;

  for (const obstacle of state.obstacles) {
    const overlapX = player.x + player.radius > obstacle.x && player.x - player.radius < obstacle.x + obstacle.width;

    if (!overlapX) {
      continue;
    }

    const gapTop = obstacle.gapY - obstacle.gapHeight * 0.5;
    const gapBottom = obstacle.gapY + obstacle.gapHeight * 0.5;

    const collides = player.y - player.radius < gapTop || player.y + player.radius > gapBottom;
    if (!collides) {
      continue;
    }

    if (tryConsumeImpact(state)) {
      player.x = obstacle.x - player.radius - 2;
      player.vx *= 0.25;
      return;
    }

    triggerGameOver(state);
    return;
  }
}

export function updateGame(state, dt) {
  state.totalTime += dt;

  if (state.mode !== "playing") {
    return;
  }

  state.runTime += dt;

  const difficulty = getDifficulty(state.runTime);
  state.difficultyPhase = difficulty.phase;

  updateTimers(state, dt);
  updatePlayer(state, dt);
  updateObstacles(state, dt, difficulty);
  scorePassedObstacles(state);
  collectCharges(state);
  checkBoundsCollision(state);
  checkObstacleCollision(state);
}

export function restartFromGameOver(state) {
  resetRound(state, "playing");
}

export function getTextSnapshot(state) {
  const controlsHint =
    state.mode === "playing"
      ? "Desktop: Space=flap, Shift=power, F=fullscreen. Movil: tap=flap, boton Power=power."
      : "Inicia con click/tap o Space.";

  return {
    mode: state.mode,
    time: Number(state.runTime.toFixed(2)),
    coordSystem: "origin-top-left, +x right, +y down, units in CSS pixels",
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      vx: Number(state.player.vx.toFixed(1)),
      vy: Number(state.player.vy.toFixed(1)),
      r: state.player.radius,
    },
    obstacles: state.obstacles.map((obstacle) => ({
      x: Number(obstacle.x.toFixed(1)),
      w: Number(obstacle.width.toFixed(1)),
      gapY: Number(obstacle.gapY.toFixed(1)),
      gapH: Number(obstacle.gapHeight.toFixed(1)),
    })),
    collectibles: state.collectibles.map((collectible) => ({
      x: Number(collectible.x.toFixed(1)),
      y: Number(collectible.y.toFixed(1)),
      r: collectible.radius,
    })),
    activePowerUp: state.activePowerUp
      ? {
          type: state.activePowerUp.type,
          label: state.activePowerUp.label,
          timeLeft: Number(state.activePowerUp.timeLeft.toFixed(2)),
        }
      : null,
    charges: state.charges,
    heat: Number(state.heat.toFixed(1)),
    overheatTimeLeft: Number(state.overheatTimer.toFixed(2)),
    score: state.score,
    highScore: state.highScore,
    phase: state.difficultyPhase,
    controlsHint,
  };
}
