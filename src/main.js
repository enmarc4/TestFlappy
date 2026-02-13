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
  updateGame,
} from "./systems.js";
import { attachTestingHooks } from "./testing-hooks.js";

const canvas = document.getElementById("game-canvas");
const powerButton = document.getElementById("power-btn");

if (!(canvas instanceof HTMLCanvasElement) || !(powerButton instanceof HTMLButtonElement)) {
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

  if (state.mode === "menu") {
    startGame(state);
  }

  triggerFlap(state);
}

function handlePowerAction() {
  tryActivatePowerUp(state);
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
  window.requestAnimationFrame(frame);
}

attachTestingHooks({
  getSnapshot: () => getTextSnapshot(state),
  advanceByMs,
  resetToMenu: restartToMenu,
});

resizeCanvas();
resetRound(state, "menu");
window.requestAnimationFrame(frame);
