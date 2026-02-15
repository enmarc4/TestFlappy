import { FIXED_DT, GAME_CONFIG } from "./config.js";
import { createGameAudio } from "./audio.js";
import { setupInput } from "./input.js";
import { renderGame } from "./render.js";
import { createInitialState } from "./state.js";
import { createTelemetryStore } from "./telemetry.js";
import {
  consumeRuntimeEvents,
  getTextSnapshot,
  resetRound,
  resizeWorld,
  restartFromGameOver,
  setScoreForTesting,
  setSyncDebug,
  startGame,
  triggerFlap,
  togglePause,
  updateGame,
} from "./systems.js";
import { attachTestingHooks } from "./testing-hooks.js";

const canvas = document.getElementById("game-canvas");
const modeValue = document.getElementById("mode-value");
const scoreValue = document.getElementById("score-value");
const phaseValue = document.getElementById("phase-value");
const environmentValue = document.getElementById("environment-value");
const progressValue = document.getElementById("progress-value");
const syncValue = document.getElementById("sync-value");
const chainValue = document.getElementById("chain-value");
const multiplierValue = document.getElementById("multiplier-value");
const linkedValue = document.getElementById("linked-value");
const passiveValue = document.getElementById("passive-value");
const heatFill = document.getElementById("heat-fill");
const assistHint = document.getElementById("assist-hint");
const phaseProgressFill = document.getElementById("phase-progress-fill");
const phaseProgressLabel = document.getElementById("phase-progress-label");
const runsValue = document.getElementById("runs-value");
const avgDurationValue = document.getElementById("avg-duration-value");
const avgSyncValue = document.getElementById("avg-sync-value");
const avgChainValue = document.getElementById("avg-chain-value");
const avgLinkedValue = document.getElementById("avg-linked-value");
const ctaValue = document.getElementById("cta-value");
const ctaButtons = Array.from(document.querySelectorAll(".hero-actions .btn"));

if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(modeValue instanceof HTMLElement) ||
  !(scoreValue instanceof HTMLElement) ||
  !(phaseValue instanceof HTMLElement) ||
  !(environmentValue instanceof HTMLElement) ||
  !(progressValue instanceof HTMLElement) ||
  !(syncValue instanceof HTMLElement) ||
  !(chainValue instanceof HTMLElement) ||
  !(multiplierValue instanceof HTMLElement) ||
  !(linkedValue instanceof HTMLElement) ||
  !(passiveValue instanceof HTMLElement) ||
  !(heatFill instanceof HTMLElement) ||
  !(assistHint instanceof HTMLElement) ||
  !(phaseProgressFill instanceof HTMLElement) ||
  !(phaseProgressLabel instanceof HTMLElement) ||
  !(runsValue instanceof HTMLElement) ||
  !(avgDurationValue instanceof HTMLElement) ||
  !(avgSyncValue instanceof HTMLElement) ||
  !(avgChainValue instanceof HTMLElement) ||
  !(avgLinkedValue instanceof HTMLElement) ||
  !(ctaValue instanceof HTMLElement)
) {
  throw new Error("Game DOM not found");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas context could not be created");
}

const state = createInitialState();
const telemetry = createTelemetryStore();
const audio = createGameAudio();

function setupMobileZoomGuard() {
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (!hasCoarsePointer) {
    return;
  }

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = performance.now();
      if (now - lastTouchEnd < 280) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener(
    "gesturestart",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0.0s";
  }
  return `${seconds.toFixed(1)}s`;
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }
  return `${Math.round(value * 100)}%`;
}

function syncTelemetryUi() {
  const snapshot = telemetry.snapshot();
  runsValue.textContent = String(snapshot.runStarts);
  avgDurationValue.textContent = formatDuration(snapshot.avgRunDurationSec);
  avgSyncValue.textContent = formatPercent(snapshot.avg_sync_accuracy);
  avgChainValue.textContent = String(snapshot.avg_chain_peak.toFixed(1));
  avgLinkedValue.textContent = formatPercent(snapshot.linked_sector_rate);
  ctaValue.textContent = String(snapshot.ctaClicks);
}

function trackCtaClick() {
  telemetry.trackCtaClick();
  syncTelemetryUi();
}

for (const button of ctaButtons) {
  button.addEventListener("click", trackCtaClick);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(180, Math.round(rect.height));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeWorld(state, width, height, dpr);
}

function restartToMenu() {
  resetRound(state, "menu");
}

function restartPlaying() {
  restartFromGameOver(state);
}

function handleRestartAction() {
  if (state.mode === "menu") {
    startGame(state);
    triggerFlap(state);
    return;
  }
  restartPlaying();
}

function handleFlapAction() {
  if (state.mode === "gameover") {
    restartPlaying();
    triggerFlap(state);
    return;
  }

  if (state.mode === "paused") {
    togglePause(state);
  }

  if (state.mode === "menu") {
    startGame(state);
  }

  triggerFlap(state);
}

function handlePauseAction() {
  togglePause(state);
}

function getModeLabel() {
  if (state.mode === "playing") return "En joc";
  if (state.mode === "paused") return "Pausat";
  if (state.mode === "gameover") return "Game Over";
  return "Menu";
}

function getHint() {
  if (state.mode === "menu") return "Pulsa Space o toca el canvas per comencar.";
  if (state.mode === "paused") return "Pausa activa. Pulsa P, Space o tap per continuar.";
  if (state.mode === "gameover") return "Run acabada. Space/tap per reintentar.";
  if (state.overheatTimer > 0) return `Overheat actiu: ${state.overheatTimer.toFixed(1)}s. Redueix taps offbeat.`;
  if (state.sync.offbeatStreak >= GAME_CONFIG.sync.offbeatBreakThreshold) {
    return "Atencio: massa taps offbeat. Busca un Perfect per salvar la cadena.";
  }
  return "Tip: cada 50 punts canvia l'ambient. Els aros estabilitzen la cadena.";
}

function syncUi() {
  const environment = GAME_CONFIG.environments[state.environment.activeIndex] ?? GAME_CONFIG.environments[0];
  const step = GAME_CONFIG.progression.scorePerEnvironment;
  const progressPoints = state.score % step;
  const pointsToNext = Math.max(0, state.environment.nextMilestone - state.score);
  const linkedRate = state.chain.totalSectors > 0 ? state.chain.linkedSectors / state.chain.totalSectors : 0;

  modeValue.textContent = getModeLabel();
  scoreValue.textContent = String(state.score);
  phaseValue.textContent = String(state.difficultyPhase);
  environmentValue.textContent = environment.label;
  progressValue.textContent = `${progressPoints}/${step}`;
  syncValue.textContent = `${state.sync.tapQuality} (${state.sync.lastTapDeltaMs.toFixed(0)}ms)`;
  chainValue.textContent = `${state.chain.streak} (max ${state.chain.bestStreak})`;
  multiplierValue.textContent = `x${state.chain.multiplier.toFixed(2)}`;
  linkedValue.textContent = formatPercent(linkedRate);
  passiveValue.textContent = state.passives.activeLabel;

  phaseProgressFill.style.width = `${Math.round(state.environment.progressToNext * 100)}%`;
  phaseProgressFill.parentElement?.setAttribute(
    "aria-valuenow",
    String(Math.round(state.environment.progressToNext * 100))
  );
  phaseProgressLabel.textContent = `Ambient ${state.environment.activeIndex + 1}: ${environment.label} · ${pointsToNext} pts per canvi`;

  const heatPercent = Math.max(0, Math.min(100, (state.heat / GAME_CONFIG.heat.max) * 100));
  heatFill.style.width = `${heatPercent}%`;
  heatFill.parentElement?.setAttribute("aria-valuenow", String(Math.round(heatPercent)));
  assistHint.textContent = getHint();
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await canvas.requestFullscreen();
}

function flushRuntimeEvents() {
  const events = consumeRuntimeEvents(state);
  for (const event of events) {
    if (event.type === "flap") {
      audio.playFlap();
      continue;
    }

    if (event.type === "sync-perfect") {
      audio.playSyncPerfect();
      continue;
    }

    if (event.type === "sync-offbeat") {
      audio.playSyncOffbeat();
      continue;
    }

    if (event.type === "sync-anchor") {
      audio.playPickup();
      continue;
    }

    if (event.type === "chain-break") {
      audio.playChainBreak();
      continue;
    }

    if (event.type === "passive-trigger") {
      audio.playPassiveTrigger();
      continue;
    }

    if (event.type === "shield-hit") {
      audio.playShieldHit();
      continue;
    }

    if (event.type === "gameover") {
      audio.playGameOver();
      telemetry.trackRunEnd({
        durationSec: event.runDuration,
        syncAccuracy: event.syncAccuracy,
        chainPeak: event.chainPeak,
        linkedSectorRate: event.linkedSectorRate,
      });
      syncTelemetryUi();
      continue;
    }

    if (event.type === "run-aborted") {
      telemetry.trackRunEnd({
        durationSec: event.runDuration,
        syncAccuracy: event.syncAccuracy,
        chainPeak: event.chainPeak,
        linkedSectorRate: event.linkedSectorRate,
      });
      syncTelemetryUi();
      continue;
    }

    if (event.type === "run-start") {
      telemetry.trackRunStart();
      syncTelemetryUi();
    }
  }
}

setupInput({
  state,
  canvas,
  onFlap: handleFlapAction,
  onRestart: handleRestartAction,
  onTogglePause: handlePauseAction,
  onToggleFullscreen: toggleFullscreen,
  onUserInteraction: () => {
    audio.unlock();
  },
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("fullscreenchange", resizeCanvas);

let accumulator = 0;
let lastTimestamp = 0;

function advanceByMs(ms) {
  const steps = Math.max(1, Math.round(ms / (FIXED_DT * 1000)));
  for (let i = 0; i < steps; i += 1) {
    updateGame(state, FIXED_DT);
  }

  flushRuntimeEvents();
  renderGame(ctx, state);
  syncUi();
}

function frame(timestamp) {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp;
  }

  const elapsed = Math.min(100, timestamp - lastTimestamp);
  lastTimestamp = timestamp;
  accumulator += elapsed / 1000;

  while (accumulator >= FIXED_DT) {
    updateGame(state, FIXED_DT);
    accumulator -= FIXED_DT;
  }

  flushRuntimeEvents();
  renderGame(ctx, state);
  syncUi();
  window.requestAnimationFrame(frame);
}

attachTestingHooks({
  getSnapshot: () => ({
    ...getTextSnapshot(state),
    telemetry: telemetry.snapshot(),
  }),
  advanceByMs,
  resetToMenu: restartToMenu,
  setDebugScore: (score) => setScoreForTesting(state, score),
  setDebugSync: (payload) => setSyncDebug(state, payload),
});

resizeCanvas();
resetRound(state, "menu");
setupMobileZoomGuard();
syncTelemetryUi();
syncUi();
window.requestAnimationFrame(frame);
