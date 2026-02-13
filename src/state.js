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
    spawnTimer: 0,
    charges: 0,
    heat: 0,
    overheatTimer: 0,
    invulnerabilityTimer: 0,
    activePowerUp: null,
    shieldHitsRemaining: 0,
    gapWidenTimer: 0,
    fluxBoostTimer: 0,
    ui: {
      activePowerLabel: "-",
      isTouchPrimary: window.matchMedia("(pointer: coarse)").matches,
      lastPowerActivationTime: -999,
    },
  };

  return state;
}
