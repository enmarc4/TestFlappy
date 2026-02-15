function safeAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    return null;
  }

  try {
    return new Ctx();
  } catch {
    return null;
  }
}

function playTone(ctx, {
  type = "sine",
  frequency = 440,
  endFrequency = frequency,
  duration = 0.12,
  gain = 0.08,
  attack = 0.004,
  release = 0.08,
  when = 0,
}) {
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(30, frequency), now);
  osc.frequency.linearRampToValueAtTime(Math.max(30, endFrequency), now + duration);

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(gain, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + 0.01, duration + release));

  osc.connect(amp);
  amp.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + release + 0.02);
}

export function createGameAudio() {
  let context = null;
  let enabled = true;

  function ensureContext() {
    if (!enabled) {
      return null;
    }

    if (!context) {
      context = safeAudioContext();
    }

    return context;
  }

  async function unlock() {
    const ctx = ensureContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        enabled = false;
      }
    }
  }

  function playFlap() {
    const ctx = ensureContext();
    playTone(ctx, {
      type: "triangle",
      frequency: 360,
      endFrequency: 520,
      duration: 0.08,
      gain: 0.048,
      release: 0.06,
    });
  }

  function playPickup() {
    const ctx = ensureContext();
    playTone(ctx, {
      type: "sine",
      frequency: 580,
      endFrequency: 770,
      duration: 0.08,
      gain: 0.06,
      release: 0.08,
    });
    playTone(ctx, {
      type: "triangle",
      frequency: 760,
      endFrequency: 940,
      duration: 0.09,
      gain: 0.045,
      when: 0.05,
      release: 0.1,
    });
  }

  function playShieldHit() {
    const ctx = ensureContext();
    playTone(ctx, {
      type: "square",
      frequency: 280,
      endFrequency: 170,
      duration: 0.11,
      gain: 0.055,
      release: 0.12,
    });
  }

  function playGameOver() {
    const ctx = ensureContext();
    playTone(ctx, {
      type: "sawtooth",
      frequency: 210,
      endFrequency: 90,
      duration: 0.32,
      gain: 0.065,
      release: 0.22,
    });
  }

  return {
    unlock,
    playFlap,
    playPickup,
    playShieldHit,
    playGameOver,
  };
}
