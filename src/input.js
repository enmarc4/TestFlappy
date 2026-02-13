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
  powerButton,
  onFlap,
  onPower,
  onRestart,
  onTogglePause,
  onToggleFullscreen,
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

    if (event.code === "Space") {
      event.preventDefault();
      usePrimaryAction();
      return;
    }

    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      event.preventDefault();
      onPower();
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
    canvas.focus({ preventScroll: true });
    usePrimaryAction();
  }

  function handlePowerPointerDown(event) {
    event.preventDefault();
    onPower();
  }

  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  powerButton.addEventListener("pointerdown", handlePowerPointerDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    canvas.removeEventListener("pointerdown", handleCanvasPointerDown);
    powerButton.removeEventListener("pointerdown", handlePowerPointerDown);
  };
}
