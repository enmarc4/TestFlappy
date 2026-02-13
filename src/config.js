export const STORAGE_KEYS = {
  highScore: "skyCircuits.highScore.v1",
};

export const FIXED_DT = 1 / 60;

export const GAME_CONFIG = {
  physics: {
    gravity: 1200,
    flapImpulse: -420,
    maxFallSpeed: 620,
    fluxGravityMultiplier: 0.72,
    overheatGravityMultiplier: 1.2,
    groundBounceDamping: 0.12,
  },
  player: {
    radius: 16,
    hitboxRadiusXFactor: 0.72,
    hitboxRadiusYFactor: 0.8,
    hitboxOffsetX: -1,
    baseXFactor: 0.28,
    maxXFactor: 0.75,
    horizontalSpring: 3.2,
    horizontalDrag: 5.5,
    fluxPush: 320,
    invulnerabilityAfterShield: 0.35,
  },
  powerUps: {
    maxCharges: 2,
    heatPerUse: 35,
    heatDissipationPerSec: 18,
    overheatThreshold: 100,
    overheatDuration: 2.5,
    pool: [
      { type: "shield", label: "Pulse Shield", duration: 1.2, weight: 0.4 },
      { type: "gap", label: "Gap Widen", duration: 2.0, weight: 0.34 },
      { type: "flux", label: "Flux Boost", duration: 0.8, weight: 0.26 },
    ],
  },
  spawn: {
    obstacleWidthMin: 70,
    obstacleWidthMax: 96,
    obstacleSpacingMin: 225,
    edgeMargin: 24,
    collectibleRadius: 12,
    collectibleBonus: 2,
  },
  difficulty: {
    phase1: {
      until: 20,
      obstacleSpeed: 180,
      spawnInterval: 1.55,
      gapHeight: 192,
      collectibleChance: 0.58,
    },
    phase2: {
      until: 45,
      obstacleSpeed: 220,
      spawnInterval: 1.32,
      gapHeight: 170,
      collectibleChance: 0.66,
    },
    phase3: {
      until: Number.POSITIVE_INFINITY,
      obstacleSpeed: 258,
      spawnInterval: 1.08,
      gapHeight: 154,
      collectibleChance: 0.74,
    },
  },
};
