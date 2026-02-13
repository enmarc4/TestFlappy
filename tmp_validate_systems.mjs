import assert from 'node:assert/strict';

function makeWindowStub() {
  const storage = new Map();
  return {
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    },
    matchMedia() {
      return { matches: false };
    },
  };
}

globalThis.window = makeWindowStub();

const { createInitialState } = await import('./src/state.js');
const {
  resizeWorld,
  startGame,
  triggerFlap,
  updateGame,
  tryActivatePowerUp,
  getTextSnapshot,
} = await import('./src/systems.js');
const { FIXED_DT } = await import('./src/config.js');

const state = createInitialState();
resizeWorld(state, 960, 540, 1);
assert.equal(state.mode, 'menu');

startGame(state);
assert.equal(state.mode, 'playing');
triggerFlap(state);
assert.ok(state.player.vy < 0, 'flap should apply upward impulse');

for (let i = 0; i < 30; i += 1) {
  updateGame(state, FIXED_DT);
}
assert.ok(state.runTime > 0, 'runTime should advance while playing');

state.spawnTimer = 0;
state.player.y = state.world.height * 0.45;
state.player.vy = 0;
updateGame(state, FIXED_DT);
assert.ok(state.obstacles.length > 0, 'obstacles should spawn when timer reaches zero');

// Score increments when an obstacle is passed.
state.obstacles.push({ x: state.player.x - 120, width: 50, gapY: 260, gapHeight: 180, scored: false });
const beforeScore = state.score;
updateGame(state, FIXED_DT);
assert.equal(state.score, beforeScore + 1, 'score should increase when passing an obstacle');

state.player.y = state.world.height + 100;
state.player.vy = 0;
updateGame(state, FIXED_DT);
assert.equal(state.mode, 'gameover', 'crossing world bounds should trigger game over');

startGame(state);
assert.equal(state.mode, 'playing', 'should restart from game over');

// Power-up activation contract.
state.charges = 2;
state.heat = 70;
state.overheatTimer = 0;
state.activePowerUp = null;
const activated = tryActivatePowerUp(state);
assert.equal(activated, true, 'power-up should activate with charges available');
assert.equal(state.charges, 1, 'activating should consume one charge');
assert.ok(state.heat >= 100 || state.overheatTimer > 0, 'heat should rise and trigger overheat threshold behavior');

const reactivated = tryActivatePowerUp(state);
assert.equal(reactivated, false, 'cannot activate while another power-up or overheat is active');

const heatBeforeDecay = state.heat;
updateGame(state, FIXED_DT * 60);
assert.ok(state.heat < heatBeforeDecay, 'heat should dissipate over time');

const snap = getTextSnapshot(state);
for (const key of ['mode', 'time', 'player', 'obstacles', 'collectibles', 'activePowerUp', 'charges', 'heat', 'score', 'highScore', 'controlsHint', 'coordSystem']) {
  assert.ok(Object.prototype.hasOwnProperty.call(snap, key), `snapshot missing key: ${key}`);
}

console.log('tmp_validate_systems: OK');
