export function attachTestingHooks({ getSnapshot, advanceByMs, resetToMenu, setDebugScore }) {
  window.render_game_to_text = () => JSON.stringify(getSnapshot());
  window.advanceTime = (ms) => {
    const parsed = Number(ms);
    const safeMs = Number.isFinite(parsed) ? parsed : 16;
    advanceByMs(Math.max(1, safeMs));
  };
  window.resetGame = () => {
    resetToMenu();
  };

  if (typeof setDebugScore === "function") {
    window.setDebugScore = (score) => {
      setDebugScore(score);
    };
  }
}
