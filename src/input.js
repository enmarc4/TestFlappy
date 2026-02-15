function isTypingElement(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function setupInput({
  state,
  canvas,
  onFlap,
  onRestart,
  onTogglePause,
  onToggleFullscreen,
  onUserInteraction,
}) {
  function usePrimaryAction() {
    if (state.mode === "gameover") {
      onFlap();
      return;
    }

    onFlap();
  }

  function handleKeyDown(event) {
    if (event.repeat || isTypingElement(event.target)) {
      return;
    }

    onUserInteraction?.();

    if (event.code === "Space") {
      event.preventDefault();
      usePrimaryAction();
      return;
    }

    if (event.code === "KeyR") {
      event.preventDefault();
      onRestart();
      return;
    }

    if (event.code === "KeyP") {
      event.preventDefault();
      onTogglePause();
      return;
    }

    if (event.code === "KeyF") {
      event.preventDefault();
      onToggleFullscreen();
    }
  }

  function handleCanvasPointerDown(event) {
    event.preventDefault();
    onUserInteraction?.();
    canvas.focus({ preventScroll: true });
    usePrimaryAction();
  }

  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("pointerdown", handleCanvasPointerDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    canvas.removeEventListener("pointerdown", handleCanvasPointerDown);
  };
}
