import { GAME_CONFIG, STORAGE_KEYS } from "./config.js";

function readHighScore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.highScore);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function createInitialState() {
  const state = {
    mode: "menu",
    runTime: 0,
    totalTime: 0,
    world: {
      width: 960,
      height: 540,
      dpr: 1,
    },
    difficultyPhase: 1,
    player: {
      x: 270,
      y: 270,
      vx: 0,
      vy: 0,
      radius: GAME_CONFIG.player.radius,
      baseX: 270,
    },
    obstacles: [],
    collectibles: [],
    score: 0,
    highScore: readHighScore(),
    events: [],
    spawnTimer: 0,
    heat: 0,
    overheatTimer: 0,
    invulnerabilityTimer: 0,
    sync: {
      beatIntervalMs: 0,
      beatPhase: 0,
      beatMsToNext: 0,
      lastTapDeltaMs: 0,
      tapQuality: "-",
      offbeatStreak: 0,
      recentPerfectTimer: 0,
      perfectPulseTimer: 0,
      tapsTotal: 0,
      tapsInWindow: 0,
      perfectTaps: 0,
      debugPhaseOverride: null,
      debugSeed: null,
    },
    chain: {
      streak: 0,
      bestStreak: 0,
      multiplier: 1,
      sectorQuality: "-",
      linkedSectors: 0,
      totalSectors: 0,
      anchorStabilityTimer: 0,
      linkedSinceShield: 0,
      currentSector: {
        perfect: 0,
        sync: 0,
        offbeat: 0,
      },
    },
    passives: {
      shieldCharges: 0,
      gapTimer: 0,
      gapCooldown: 0,
      fluxTimer: 0,
      fluxCooldown: 0,
      activeLabel: "-",
    },
    environment: {
      activeIndex: 0,
      previousIndex: 0,
      currentTier: 0,
      nextMilestone: GAME_CONFIG.progression.scorePerEnvironment,
      progressToNext: 0,
      transitionTimer: 0,
      transitionProgress: 1,
      labelTimer: 0,
    },
    ui: {
      isTouchPrimary: window.matchMedia("(pointer: coarse)").matches,
      lastTapQuality: "-",
    },
  };

  return state;
}
