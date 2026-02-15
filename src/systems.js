import { GAME_CONFIG, STORAGE_KEYS } from "./config.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizePhase(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  const wrapped = raw % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function getPlayerHitbox(player) {
  return {
    cx: player.x + GAME_CONFIG.player.hitboxOffsetX,
    cy: player.y,
    rx: player.radius * GAME_CONFIG.player.hitboxRadiusXFactor,
    ry: player.radius * GAME_CONFIG.player.hitboxRadiusYFactor,
  };
}

function collidesEllipseRect(hitbox, rect) {
  const closestX = clamp(hitbox.cx, rect.x, rect.x + rect.width);
  const closestY = clamp(hitbox.cy, rect.y, rect.y + rect.height);
  const dx = (hitbox.cx - closestX) / hitbox.rx;
  const dy = (hitbox.cy - closestY) / hitbox.ry;
  return dx * dx + dy * dy <= 1;
}

function hashSeed(seedValue) {
  const text = String(seedValue ?? "0");
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextDebugPhase(state) {
  if (!Number.isFinite(state.sync.debugSeed)) {
    return null;
  }
  const next = (Math.imul(state.sync.debugSeed, 1664525) + 1013904223) >>> 0;
  state.sync.debugSeed = next;
  return next / 4294967296;
}

function getEnvironmentTier(score) {
  const step = GAME_CONFIG.progression.scorePerEnvironment;
  return Math.floor(score / step);
}

function getEnvironmentIndexFromTier(tier) {
  const environmentCount = GAME_CONFIG.environments.length;
  if (environmentCount <= 0) {
    return 0;
  }
  return tier % environmentCount;
}

function getDifficulty(state) {
  const phaseIndex = clamp(
    state.environment.activeIndex,
    0,
    Math.max(0, GAME_CONFIG.difficulty.environments.length - 1)
  );
  const profile = GAME_CONFIG.difficulty.environments[phaseIndex] ?? GAME_CONFIG.difficulty.environments[0];
  return {
    phase: phaseIndex + 1,
    ...profile,
  };
}

function getSyncProfile(state) {
  const index = clamp(state.environment.activeIndex, 0, GAME_CONFIG.sync.bpmByEnvironment.length - 1);
  const bpm = GAME_CONFIG.sync.bpmByEnvironment[index] ?? GAME_CONFIG.sync.bpmByEnvironment[0] ?? 110;
  const basePerfect = GAME_CONFIG.sync.perfectWindowMsByEnvironment[index] ?? 70;
  const baseSync = GAME_CONFIG.sync.syncWindowMsByEnvironment[index] ?? 140;
  const overheatFactor = state.overheatTimer > 0 ? 0.88 : 1;

  return {
    bpm,
    beatIntervalMs: 60000 / Math.max(1, bpm),
    perfectWindowMs: basePerfect * overheatFactor,
    syncWindowMs: baseSync * overheatFactor,
  };
}

function emitRuntimeEvent(state, type, data = {}) {
  state.events.push({
    type,
    at: Number(state.totalTime.toFixed(3)),
    ...data,
  });
}

function writeHighScore(score) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.highScore, String(score));
  } catch {
    // Local storage can fail in private/strict modes.
  }
}

function getSyncAccuracy(state) {
  if (state.sync.tapsTotal <= 0) {
    return 0;
  }
  return state.sync.tapsInWindow / state.sync.tapsTotal;
}

function getLinkedSectorRate(state) {
  if (state.chain.totalSectors <= 0) {
    return 0;
  }
  return state.chain.linkedSectors / state.chain.totalSectors;
}

function buildRunSummary(state) {
  return {
    score: state.score,
    runDuration: Number(state.runTime.toFixed(3)),
    syncAccuracy: Number(getSyncAccuracy(state).toFixed(4)),
    chainPeak: state.chain.bestStreak,
    linkedSectorRate: Number(getLinkedSectorRate(state).toFixed(4)),
  };
}

function addScore(state, amount, source) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  state.score += amount;
  emitRuntimeEvent(state, "score-gain", {
    amount,
    source,
    score: state.score,
  });
  syncEnvironmentFromScore(state);
}

function applyWorldResync(state) {
  const player = state.player;
  player.baseX = state.world.width * GAME_CONFIG.player.baseXFactor;
  player.x = clamp(player.x, player.radius + 12, state.world.width * GAME_CONFIG.player.maxXFactor);
  player.y = clamp(player.y, player.radius + 1, state.world.height - player.radius - 1);
}

function syncEnvironmentFromScore(state, { force = false } = {}) {
  const step = GAME_CONFIG.progression.scorePerEnvironment;
  const tier = getEnvironmentTier(state.score);
  const nextIndex = getEnvironmentIndexFromTier(tier);
  const progressToNext = (state.score % step) / step;
  const nextMilestone = (tier + 1) * step;

  state.environment.currentTier = tier;
  state.environment.progressToNext = progressToNext;
  state.environment.nextMilestone = nextMilestone;

  if (force) {
    state.environment.previousIndex = nextIndex;
    state.environment.activeIndex = nextIndex;
    state.environment.transitionTimer = 0;
    state.environment.transitionProgress = 1;
    state.environment.labelTimer = 0;
    return;
  }

  if (nextIndex === state.environment.activeIndex) {
    return;
  }

  const fromIndex = state.environment.activeIndex;
  state.environment.previousIndex = fromIndex;
  state.environment.activeIndex = nextIndex;
  state.environment.transitionTimer = GAME_CONFIG.progression.transitionDuration;
  state.environment.transitionProgress = 0;
  state.environment.labelTimer = GAME_CONFIG.progression.labelDuration;

  emitRuntimeEvent(state, "environment-shift", {
    fromIndex,
    toIndex: nextIndex,
    tier,
    score: state.score,
  });
}

function resetSectorState(state) {
  state.chain.currentSector.perfect = 0;
  state.chain.currentSector.sync = 0;
  state.chain.currentSector.offbeat = 0;
}

function applyHeatDelta(state, delta) {
  if (!Number.isFinite(delta) || delta === 0) {
    return;
  }

  state.heat = clamp(state.heat + delta, 0, GAME_CONFIG.heat.max);
  if (state.heat >= GAME_CONFIG.heat.max && state.overheatTimer <= 0) {
    state.overheatTimer = GAME_CONFIG.heat.overheatDurationSec;
    emitRuntimeEvent(state, "overheat-start");
  }
}

function resolvePassiveLabel(state) {
  if (state.passives.fluxTimer > 0) {
    state.passives.activeLabel = `Flux Boost ${state.passives.fluxTimer.toFixed(1)}s`;
    return;
  }

  if (state.passives.gapTimer > 0) {
    state.passives.activeLabel = `Gap Widen ${state.passives.gapTimer.toFixed(1)}s`;
    return;
  }

  if (state.passives.shieldCharges > 0) {
    state.passives.activeLabel = `Pulse Shield x${state.passives.shieldCharges}`;
    return;
  }

  state.passives.activeLabel = "-";
}

function activateGapPassive(state) {
  if (state.passives.gapCooldown > 0) {
    return false;
  }
  state.passives.gapTimer = GAME_CONFIG.chainPassives.gap.duration;
  state.passives.gapCooldown = GAME_CONFIG.chainPassives.gap.cooldown;
  emitRuntimeEvent(state, "passive-trigger", { passive: "gap" });
  return true;
}

function activateFluxPassive(state) {
  if (state.passives.fluxCooldown > 0) {
    return false;
  }

  state.passives.fluxTimer = GAME_CONFIG.chainPassives.flux.duration;
  state.passives.fluxCooldown = GAME_CONFIG.chainPassives.flux.cooldown;
  state.player.vx = Math.max(state.player.vx, GAME_CONFIG.chainPassives.flux.push);
  state.player.vy *= 0.8;
  emitRuntimeEvent(state, "passive-trigger", { passive: "flux" });
  return true;
}

function grantShieldPassive(state) {
  const maxCharges = GAME_CONFIG.chainPassives.shield.maxCharges;
  const next = clamp(state.passives.shieldCharges + 1, 0, maxCharges);
  if (next === state.passives.shieldCharges) {
    return false;
  }
  state.passives.shieldCharges = next;
  emitRuntimeEvent(state, "passive-trigger", { passive: "shield", charges: next });
  return true;
}

function resolveSector(state) {
  const sector = state.chain.currentSector;
  const anchorGrace = state.chain.anchorStabilityTimer > 0 ? 1 : 0;
  const offbeatThreshold = GAME_CONFIG.chain.brokenOffbeatThreshold + anchorGrace;
  const hasPerfect =
    sector.perfect >= GAME_CONFIG.chain.linkedPerfectRequired || state.sync.recentPerfectTimer > 0;
  const linked = hasPerfect && sector.offbeat <= offbeatThreshold;

  state.chain.totalSectors += 1;
  state.chain.sectorQuality = linked ? "Linked Sector" : "Broken Sector";

  if (linked) {
    state.chain.streak += 1;
    state.chain.bestStreak = Math.max(state.chain.bestStreak, state.chain.streak);
    state.chain.linkedSectors += 1;
    state.chain.linkedSinceShield += 1;
    state.chain.multiplier = clamp(
      1 + (state.chain.streak - 1) * GAME_CONFIG.chain.multiplierPerLinkedSector,
      1,
      GAME_CONFIG.chain.multiplierMax
    );

    if (state.chain.linkedSinceShield >= GAME_CONFIG.chainPassives.shield.linkedEvery) {
      state.chain.linkedSinceShield = 0;
      grantShieldPassive(state);
    }

    if (state.chain.streak >= GAME_CONFIG.chainPassives.gap.streakThreshold) {
      activateGapPassive(state);
    }
  } else {
    if (state.chain.streak > 0) {
      emitRuntimeEvent(state, "chain-break", {
        streak: state.chain.streak,
      });
    }
    state.chain.streak = 0;
    state.chain.multiplier = 1;
    state.chain.linkedSinceShield = 0;
  }

  const isPerfectSector =
    linked &&
    sector.perfect >= GAME_CONFIG.sync.sectorPerfectForFlux &&
    sector.offbeat === 0;
  if (isPerfectSector) {
    activateFluxPassive(state);
  }

  const anchorBonus = state.chain.anchorStabilityTimer > 0 ? GAME_CONFIG.chain.anchorMultiplierBonus : 0;
  const effectiveMultiplier = state.chain.multiplier + anchorBonus;
  const scoreGain = Math.max(1, Math.round(GAME_CONFIG.chain.baseSectorScore * effectiveMultiplier));
  addScore(state, scoreGain, linked ? "linked-sector" : "broken-sector");

  emitRuntimeEvent(state, "sector-resolved", {
    quality: state.chain.sectorQuality,
    gain: scoreGain,
    multiplier: Number(effectiveMultiplier.toFixed(2)),
    perfectTaps: sector.perfect,
    syncTaps: sector.sync,
    offbeatTaps: sector.offbeat,
  });

  resetSectorState(state);
}

function syncBeatClock(state) {
  const profile = getSyncProfile(state);
  state.sync.beatIntervalMs = profile.beatIntervalMs;

  if (Number.isFinite(state.sync.debugPhaseOverride)) {
    state.sync.beatPhase = normalizePhase(state.sync.debugPhaseOverride);
    state.sync.beatMsToNext = Number((profile.beatIntervalMs * (1 - state.sync.beatPhase)).toFixed(1));
    return profile;
  }

  const phase = normalizePhase((state.runTime * 1000) / profile.beatIntervalMs);
  state.sync.beatPhase = phase;
  state.sync.beatMsToNext = Number(((1 - phase) * profile.beatIntervalMs).toFixed(1));
  return profile;
}

export function evaluateTapSync(state) {
  const profile = getSyncProfile(state);
  let phase;
  if (Number.isFinite(state.sync.debugPhaseOverride)) {
    phase = normalizePhase(state.sync.debugPhaseOverride);
  } else {
    const debugPhase = nextDebugPhase(state);
    if (debugPhase !== null) {
      phase = debugPhase;
    } else {
      phase = normalizePhase((state.runTime * 1000) / profile.beatIntervalMs);
    }
  }

  const centered = phase > 0.5 ? phase - 1 : phase;
  const deltaMs = centered * profile.beatIntervalMs;
  const absDelta = Math.abs(deltaMs);
  let quality = "offbeat";

  if (absDelta <= profile.perfectWindowMs) {
    quality = "perfect";
  } else if (absDelta <= profile.syncWindowMs) {
    quality = "sync";
  }

  state.sync.lastTapDeltaMs = Number(deltaMs.toFixed(1));
  state.sync.tapQuality = quality;
  state.sync.tapsTotal += 1;

  if (quality === "perfect" || quality === "sync") {
    state.sync.tapsInWindow += 1;
  }

  if (quality === "perfect") {
    state.sync.perfectTaps += 1;
    state.sync.offbeatStreak = 0;
    state.sync.recentPerfectTimer = GAME_CONFIG.sync.recentPerfectWindowSec;
    state.sync.perfectPulseTimer = GAME_CONFIG.sync.perfectPulseSec;
    state.chain.currentSector.perfect += 1;
    applyHeatDelta(state, -GAME_CONFIG.sync.perfectHeatRelief);
    emitRuntimeEvent(state, "sync-perfect", { deltaMs: state.sync.lastTapDeltaMs });
    return quality;
  }

  if (quality === "sync") {
    state.sync.offbeatStreak = 0;
    state.chain.currentSector.sync += 1;
    applyHeatDelta(state, -GAME_CONFIG.sync.syncHeatRelief);
    emitRuntimeEvent(state, "sync-hit", { deltaMs: state.sync.lastTapDeltaMs });
    return quality;
  }

  state.sync.offbeatStreak += 1;
  state.chain.currentSector.offbeat += 1;
  const penaltyScale = state.chain.anchorStabilityTimer > 0 ? 0.68 : 1;
  applyHeatDelta(state, GAME_CONFIG.sync.offbeatHeatPenalty * penaltyScale);
  emitRuntimeEvent(state, "sync-offbeat", {
    deltaMs: state.sync.lastTapDeltaMs,
    streak: state.sync.offbeatStreak,
  });

  return quality;
}

function spawnObstacle(state, difficulty) {
  const width = clamp(
    state.world.width * 0.09,
    GAME_CONFIG.spawn.obstacleWidthMin,
    GAME_CONFIG.spawn.obstacleWidthMax
  );

  const gapHeight = clamp(
    difficulty.gapHeight + (state.passives.gapTimer > 0 ? GAME_CONFIG.chainPassives.gap.widenAmount : 0),
    128,
    state.world.height - 126
  );
  const halfGap = gapHeight * 0.5;
  const minCenter = halfGap + 30;
  const maxCenter = state.world.height - halfGap - 30;
  const gapY = clamp(minCenter + Math.random() * (maxCenter - minCenter), minCenter, maxCenter);

  const previous = state.obstacles[state.obstacles.length - 1];
  const spawnStart = state.world.width + width;
  const x = previous
    ? Math.max(spawnStart, previous.x + previous.width + GAME_CONFIG.spawn.obstacleSpacingMin)
    : spawnStart;

  state.obstacles.push({
    x,
    width,
    gapY,
    baseGapY: gapY,
    minGapCenter: minCenter,
    maxGapCenter: maxCenter,
    wobbleAmp: difficulty.nervousGapWobble || 0,
    wobbleFreq: difficulty.nervousGapFreq || 0,
    wobblePhase: Math.random() * Math.PI * 2,
    gapHeight,
    themeIndex: state.environment.activeIndex,
    scored: false,
  });

  if (Math.random() > difficulty.collectibleChance) {
    return;
  }

  const collectibleRadius = GAME_CONFIG.spawn.collectibleRadius;
  const minCollectibleY = collectibleRadius + GAME_CONFIG.spawn.edgeMargin;
  const maxCollectibleY = state.world.height - collectibleRadius - GAME_CONFIG.spawn.edgeMargin;
  const gapTop = clamp(gapY - halfGap, minCollectibleY, maxCollectibleY);
  const gapBottom = clamp(gapY + halfGap, minCollectibleY, maxCollectibleY);

  const placements = [
    {
      weight: 0.34,
      y: gapTop + collectibleRadius + Math.random() * Math.max(14, halfGap * 0.24),
    },
    {
      weight: 0.26,
      y: gapY + (Math.random() - 0.5) * Math.max(18, halfGap * 0.18),
    },
    {
      weight: 0.4,
      y: gapBottom - collectibleRadius - Math.random() * Math.max(14, halfGap * 0.24),
    },
  ];

  const totalPlacementWeight = placements.reduce((sum, item) => sum + item.weight, 0);
  let placementCursor = Math.random() * totalPlacementWeight;
  let selectedY = placements[placements.length - 1].y;
  for (const placement of placements) {
    placementCursor -= placement.weight;
    if (placementCursor <= 0) {
      selectedY = placement.y;
      break;
    }
  }

  const collectibleY = clamp(
    selectedY,
    collectibleRadius + GAME_CONFIG.spawn.edgeMargin,
    state.world.height - collectibleRadius - GAME_CONFIG.spawn.edgeMargin
  );
  const collectibleXOffset = width * (0.35 + Math.random() * 0.3);

  state.collectibles.push({
    x: x + collectibleXOffset,
    y: collectibleY,
    radius: collectibleRadius,
  });
}

function triggerGameOver(state) {
  if (state.mode === "gameover") {
    return;
  }

  state.mode = "gameover";
  emitRuntimeEvent(state, "gameover", buildRunSummary(state));

  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
}

function tryConsumeImpact(state) {
  if (state.passives.shieldCharges <= 0) {
    return false;
  }

  state.passives.shieldCharges -= 1;
  state.invulnerabilityTimer = GAME_CONFIG.chainPassives.shield.invulnerabilitySec;
  emitRuntimeEvent(state, "shield-hit", {
    chargesLeft: state.passives.shieldCharges,
  });
  return true;
}

function updateTimers(state, dt) {
  state.heat = Math.max(0, state.heat - GAME_CONFIG.heat.dissipatePerSec * dt);

  if (state.overheatTimer > 0) {
    state.overheatTimer = Math.max(0, state.overheatTimer - dt);
  }

  if (state.invulnerabilityTimer > 0) {
    state.invulnerabilityTimer = Math.max(0, state.invulnerabilityTimer - dt);
  }

  if (state.sync.recentPerfectTimer > 0) {
    state.sync.recentPerfectTimer = Math.max(0, state.sync.recentPerfectTimer - dt);
  }

  if (state.sync.perfectPulseTimer > 0) {
    state.sync.perfectPulseTimer = Math.max(0, state.sync.perfectPulseTimer - dt);
  }

  if (state.chain.anchorStabilityTimer > 0) {
    state.chain.anchorStabilityTimer = Math.max(0, state.chain.anchorStabilityTimer - dt);
  }

  if (state.passives.gapTimer > 0) {
    state.passives.gapTimer = Math.max(0, state.passives.gapTimer - dt);
  }

  if (state.passives.gapCooldown > 0) {
    state.passives.gapCooldown = Math.max(0, state.passives.gapCooldown - dt);
  }

  if (state.passives.fluxTimer > 0) {
    state.passives.fluxTimer = Math.max(0, state.passives.fluxTimer - dt);
  }

  if (state.passives.fluxCooldown > 0) {
    state.passives.fluxCooldown = Math.max(0, state.passives.fluxCooldown - dt);
  }

  if (state.environment.transitionTimer > 0) {
    state.environment.transitionTimer = Math.max(0, state.environment.transitionTimer - dt);
    const duration = GAME_CONFIG.progression.transitionDuration || 0.001;
    state.environment.transitionProgress = 1 - state.environment.transitionTimer / duration;
    if (state.environment.transitionTimer <= 0) {
      state.environment.transitionProgress = 1;
      state.environment.previousIndex = state.environment.activeIndex;
    }
  } else {
    state.environment.transitionProgress = 1;
  }

  if (state.environment.labelTimer > 0) {
    state.environment.labelTimer = Math.max(0, state.environment.labelTimer - dt);
  }

  resolvePassiveLabel(state);
}

function updatePlayer(state, dt) {
  const { player } = state;
  const fluxGravityMultiplier = state.passives.fluxTimer > 0 ? GAME_CONFIG.physics.fluxGravityMultiplier : 1;
  const overheatGravityMultiplier = state.overheatTimer > 0 ? GAME_CONFIG.physics.overheatGravityMultiplier : 1;
  const gravityMultiplier = fluxGravityMultiplier * overheatGravityMultiplier;

  player.vy += GAME_CONFIG.physics.gravity * gravityMultiplier * dt;
  player.vy = Math.min(player.vy, GAME_CONFIG.physics.maxFallSpeed);
  player.y += player.vy * dt;

  if (state.passives.fluxTimer > 0) {
    player.vx += 40 * dt;
  }

  player.vx *= Math.exp(-GAME_CONFIG.player.horizontalDrag * dt);
  player.x += player.vx * dt;
  player.x += (player.baseX - player.x) * GAME_CONFIG.player.horizontalSpring * dt;

  const minX = player.radius + 12;
  const maxX = state.world.width * GAME_CONFIG.player.maxXFactor;
  player.x = clamp(player.x, minX, maxX);
}

function updateObstacles(state, dt, difficulty) {
  for (const obstacle of state.obstacles) {
    obstacle.x -= difficulty.obstacleSpeed * dt;
    if (obstacle.wobbleAmp > 0 && obstacle.wobbleFreq > 0) {
      obstacle.gapY = clamp(
        obstacle.baseGapY + Math.sin(state.runTime * obstacle.wobbleFreq + obstacle.wobblePhase) * obstacle.wobbleAmp,
        obstacle.minGapCenter,
        obstacle.maxGapCenter
      );
    }
  }

  for (const collectible of state.collectibles) {
    collectible.x -= difficulty.obstacleSpeed * dt;
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
  const hitbox = getPlayerHitbox(state.player);
  for (const obstacle of state.obstacles) {
    if (!obstacle.scored && obstacle.x + obstacle.width < hitbox.cx - hitbox.rx) {
      obstacle.scored = true;
      resolveSector(state);
    }
  }
}

function collectSyncAnchors(state) {
  const hitbox = getPlayerHitbox(state.player);
  const collectRadius = Math.max(hitbox.rx, hitbox.ry);

  state.collectibles = state.collectibles.filter((collectible) => {
    const dx = collectible.x - hitbox.cx;
    const dy = collectible.y - hitbox.cy;
    const distanceSquared = dx * dx + dy * dy;
    const minDistance = collectible.radius + collectRadius;
    if (distanceSquared > minDistance * minDistance) {
      return true;
    }

    state.chain.anchorStabilityTimer = Math.max(
      state.chain.anchorStabilityTimer,
      GAME_CONFIG.sync.anchorStabilitySec
    );
    addScore(state, GAME_CONFIG.chain.anchorScoreBonus, "sync-anchor");
    emitRuntimeEvent(state, "sync-anchor", {
      multiplierBonus: GAME_CONFIG.chain.anchorMultiplierBonus,
      anchorWindow: GAME_CONFIG.sync.anchorStabilitySec,
    });
    return false;
  });
}

function checkBoundsCollision(state) {
  const player = state.player;
  const hitbox = getPlayerHitbox(player);
  if (hitbox.cy - hitbox.ry >= 0 && hitbox.cy + hitbox.ry <= state.world.height) {
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
  if (state.mode !== "playing" || state.invulnerabilityTimer > 0) {
    return;
  }

  const player = state.player;
  const hitbox = getPlayerHitbox(player);
  for (const obstacle of state.obstacles) {
    const overlapX = hitbox.cx + hitbox.rx > obstacle.x && hitbox.cx - hitbox.rx < obstacle.x + obstacle.width;
    if (!overlapX) {
      continue;
    }

    const gapTop = obstacle.gapY - obstacle.gapHeight * 0.5;
    const gapBottom = obstacle.gapY + obstacle.gapHeight * 0.5;

    const collidesTop = collidesEllipseRect(hitbox, {
      x: obstacle.x,
      y: 0,
      width: obstacle.width,
      height: gapTop,
    });
    const collidesBottom = collidesEllipseRect(hitbox, {
      x: obstacle.x,
      y: gapBottom,
      width: obstacle.width,
      height: state.world.height - gapBottom,
    });
    if (!collidesTop && !collidesBottom) {
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

export function resizeWorld(state, width, height, dpr) {
  state.world.width = width;
  state.world.height = height;
  state.world.dpr = dpr;
  applyWorldResync(state);
}

export function resetRound(state, mode = "menu") {
  state.events = [];
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
  state.heat = 0;
  state.overheatTimer = 0;
  state.invulnerabilityTimer = 0;

  state.sync.beatIntervalMs = 0;
  state.sync.beatPhase = 0;
  state.sync.beatMsToNext = 0;
  state.sync.lastTapDeltaMs = 0;
  state.sync.tapQuality = "-";
  state.sync.offbeatStreak = 0;
  state.sync.recentPerfectTimer = 0;
  state.sync.perfectPulseTimer = 0;
  state.sync.tapsTotal = 0;
  state.sync.tapsInWindow = 0;
  state.sync.perfectTaps = 0;

  state.chain.streak = 0;
  state.chain.bestStreak = 0;
  state.chain.multiplier = 1;
  state.chain.sectorQuality = "-";
  state.chain.linkedSectors = 0;
  state.chain.totalSectors = 0;
  state.chain.anchorStabilityTimer = 0;
  state.chain.linkedSinceShield = 0;
  resetSectorState(state);

  state.passives.shieldCharges = 0;
  state.passives.gapTimer = 0;
  state.passives.gapCooldown = 0;
  state.passives.fluxTimer = 0;
  state.passives.fluxCooldown = 0;
  state.passives.activeLabel = "-";

  state.environment.activeIndex = 0;
  state.environment.previousIndex = 0;
  state.environment.currentTier = 0;
  state.environment.nextMilestone = GAME_CONFIG.progression.scorePerEnvironment;
  state.environment.progressToNext = 0;
  state.environment.transitionTimer = 0;
  state.environment.transitionProgress = 1;
  state.environment.labelTimer = 0;

  state.ui.lastTapQuality = "-";
  syncEnvironmentFromScore(state, { force: true });
}

export function startGame(state) {
  if (state.mode === "playing") {
    return;
  }

  if (state.mode === "paused") {
    state.mode = "playing";
    return;
  }

  resetRound(state, "playing");
  emitRuntimeEvent(state, "run-start");
}

export function triggerFlap(state) {
  if (state.mode === "menu") {
    startGame(state);
  }

  if (state.mode !== "playing") {
    return;
  }

  const quality = evaluateTapSync(state);
  state.ui.lastTapQuality = quality;

  let impulseScale = 1;
  if (quality === "perfect") {
    impulseScale = 1.06;
    state.player.vx += 38;
  } else if (quality === "sync") {
    impulseScale = 1;
    state.player.vx += 18;
  } else {
    impulseScale = 0.92;
  }

  state.player.vy = GAME_CONFIG.physics.flapImpulse * impulseScale;
  emitRuntimeEvent(state, "flap", { quality });
}

export function togglePause(state) {
  if (state.mode === "playing") {
    state.mode = "paused";
    return true;
  }

  if (state.mode === "paused") {
    state.mode = "playing";
    return true;
  }

  return false;
}

export function setSyncDebug(state, payload) {
  if (payload == null) {
    state.sync.debugPhaseOverride = null;
    state.sync.debugSeed = null;
    return;
  }

  if (typeof payload === "number" || typeof payload === "string") {
    state.sync.debugPhaseOverride = normalizePhase(Number(payload));
    state.sync.debugSeed = null;
    return;
  }

  if (typeof payload !== "object") {
    return;
  }

  if (Object.hasOwn(payload, "phase")) {
    state.sync.debugPhaseOverride = normalizePhase(Number(payload.phase));
    state.sync.debugSeed = null;
    return;
  }

  if (Object.hasOwn(payload, "seed")) {
    state.sync.debugSeed = hashSeed(payload.seed);
    state.sync.debugPhaseOverride = null;
  }
}

export function updateGame(state, dt) {
  state.totalTime += dt;
  syncBeatClock(state);
  updateTimers(state, dt);

  if (state.mode !== "playing") {
    return;
  }

  state.runTime += dt;
  const difficulty = getDifficulty(state);
  state.difficultyPhase = difficulty.phase;

  updatePlayer(state, dt);
  updateObstacles(state, dt, difficulty);
  scorePassedObstacles(state);
  collectSyncAnchors(state);
  checkBoundsCollision(state);
  checkObstacleCollision(state);
}

export function restartFromGameOver(state) {
  if (state.mode === "playing" && state.runTime > 0.2) {
    emitRuntimeEvent(state, "run-aborted", buildRunSummary(state));
  }

  resetRound(state, "playing");
  emitRuntimeEvent(state, "run-start");
}

export function consumeRuntimeEvents(state) {
  const events = state.events;
  state.events = [];
  return events;
}

export function setScoreForTesting(state, score) {
  const parsed = Math.max(0, Math.floor(Number(score) || 0));
  state.score = parsed;
  syncEnvironmentFromScore(state);
}

export function getTextSnapshot(state) {
  const activeEnvironment =
    GAME_CONFIG.environments[state.environment.activeIndex] ?? GAME_CONFIG.environments[0] ?? null;
  const controlsHint =
    state.mode === "playing"
      ? "Desktop: Space=flap, P=pause, R=restart, F=fullscreen. Mobile: tap=flap."
      : "Start with click/tap or Space.";

  return {
    mode: state.mode,
    coreMode: GAME_CONFIG.gameplay.coreMode,
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
      themeIndex: obstacle.themeIndex ?? state.environment.activeIndex,
    })),
    syncAnchors: state.collectibles.map((collectible) => ({
      x: Number(collectible.x.toFixed(1)),
      y: Number(collectible.y.toFixed(1)),
      r: collectible.radius,
    })),
    sync: {
      tapQuality: state.sync.tapQuality,
      beatPhase: Number(state.sync.beatPhase.toFixed(3)),
      beatMsToNext: Number(state.sync.beatMsToNext.toFixed(1)),
      lastTapDeltaMs: Number(state.sync.lastTapDeltaMs.toFixed(1)),
      offbeatStreak: state.sync.offbeatStreak,
      accuracy: Number(getSyncAccuracy(state).toFixed(4)),
    },
    chain: {
      streak: state.chain.streak,
      bestStreak: state.chain.bestStreak,
      multiplier: Number(state.chain.multiplier.toFixed(2)),
      sectorQuality: state.chain.sectorQuality,
      linkedSectorRate: Number(getLinkedSectorRate(state).toFixed(4)),
    },
    passives: {
      active: state.passives.activeLabel,
      shieldCharges: state.passives.shieldCharges,
      gapTimeLeft: Number(state.passives.gapTimer.toFixed(2)),
      fluxTimeLeft: Number(state.passives.fluxTimer.toFixed(2)),
      anchorStability: Number(state.chain.anchorStabilityTimer.toFixed(2)),
    },
    heat: Number(state.heat.toFixed(1)),
    overheatTimeLeft: Number(state.overheatTimer.toFixed(2)),
    score: state.score,
    highScore: state.highScore,
    phase: state.difficultyPhase,
    environment: {
      index: state.environment.activeIndex + 1,
      name: activeEnvironment?.label ?? "N/A",
      tier: state.environment.currentTier,
      progressToNext: Number(state.environment.progressToNext.toFixed(2)),
      nextMilestone: state.environment.nextMilestone,
      pointsToNext: Math.max(0, state.environment.nextMilestone - state.score),
    },
    controlsHint,
  };
}
