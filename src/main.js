import { FIXED_DT } from "./config.js";
import { setupInput } from "./input.js";
import { renderGame } from "./render.js";
import { createInitialState } from "./state.js";
import {
  getTextSnapshot,
  resetRound,
  resizeWorld,
  restartFromGameOver,
  startGame,
  triggerFlap,
  tryActivatePowerUp,
  togglePause,
  updateGame,
} from "./systems.js";
import { attachTestingHooks } from "./testing-hooks.js";

const canvas = document.getElementById("game-canvas");
const powerButton = document.getElementById("power-btn");
const modeValue = document.getElementById("mode-value");
const scoreValue = document.getElementById("score-value");
const phaseValue = document.getElementById("phase-value");
const chargesValue = document.getElementById("charges-value");
const powerValue = document.getElementById("power-value");
const heatFill = document.getElementById("heat-fill");
const assistHint = document.getElementById("assist-hint");

if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(powerButton instanceof HTMLButtonElement) ||
  !(modeValue instanceof HTMLElement) ||
  !(scoreValue instanceof HTMLElement) ||
  !(phaseValue instanceof HTMLElement) ||
  !(chargesValue instanceof HTMLElement) ||
  !(powerValue instanceof HTMLElement) ||
  !(heatFill instanceof HTMLElement) ||
  !(assistHint instanceof HTMLElement)
) {
  throw new Error("Game DOM not found");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas context could not be created");
}

const state = createInitialState();

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

function handlePowerAction() {
  tryActivatePowerUp(state);
}

function handlePauseAction() {
  togglePause(state);
}

function getModeLabel() {
  if (state.mode === "playing") return "En juego";
  if (state.mode === "paused") return "Pausado";
  if (state.mode === "gameover") return "Game Over";
  return "Menú";
}

function getHint() {
  if (state.mode === "menu") return "Pulsa Space o toca el canvas para empezar.";
  if (state.mode === "paused") return "Juego pausado. Pulsa P, Space o toca para continuar.";
  if (state.mode === "gameover") return "Run terminada. Space/tap para reintentar al instante.";
  if (state.overheatTimer > 0) return `Overheat activo: ${state.overheatTimer.toFixed(1)}s. Juega defensivo.`;
  return "Tip: guarda una carga para fases de alta presión.";
}

function syncUi() {
  modeValue.textContent = getModeLabel();
  scoreValue.textContent = String(state.score);
  phaseValue.textContent = String(state.difficultyPhase);
  chargesValue.textContent = `${state.charges}/2`;
  powerValue.textContent = state.ui.activePowerLabel;
  const heatPercent = Math.max(0, Math.min(100, state.heat));
  heatFill.style.width = `${heatPercent}%`;
  heatFill.parentElement?.setAttribute("aria-valuenow", String(Math.round(heatPercent)));

  const canUsePower = state.mode === "playing" && state.charges > 0 && state.overheatTimer <= 0 && !state.activePowerUp;
  powerButton.disabled = !canUsePower;
  powerButton.textContent = canUsePower ? "Power" : state.mode === "paused" ? "Pausa" : "Lock";
  assistHint.textContent = getHint();
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await canvas.requestFullscreen();
}

setupInput({
  state,
  canvas,
  powerButton,
  onFlap: handleFlapAction,
  onPower: handlePowerAction,
  onRestart: handleRestartAction,
  onTogglePause: handlePauseAction,
  onToggleFullscreen: toggleFullscreen,
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

  renderGame(ctx, state);
  syncUi();
  window.requestAnimationFrame(frame);
}

attachTestingHooks({
  getSnapshot: () => getTextSnapshot(state),
  advanceByMs,
  resetToMenu: restartToMenu,
});

resizeCanvas();
resetRound(state, "menu");
syncUi();
window.requestAnimationFrame(frame);
