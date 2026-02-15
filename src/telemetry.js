import { STORAGE_KEYS } from "./config.js";

function safeParse(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readTelemetry() {
  const fallback = {
    ctaClicks: 0,
    runStarts: 0,
    completedRuns: 0,
    totalRunDurationSec: 0,
    avgRunDurationSec: 0,
  };

  try {
    const parsed = safeParse(window.localStorage.getItem(STORAGE_KEYS.telemetry));
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const ctaClicks = Number(parsed.ctaClicks);
    const runStarts = Number(parsed.runStarts);
    const completedRuns = Number(parsed.completedRuns);
    const totalRunDurationSec = Number(parsed.totalRunDurationSec);

    return {
      ctaClicks: Number.isFinite(ctaClicks) && ctaClicks >= 0 ? ctaClicks : 0,
      runStarts: Number.isFinite(runStarts) && runStarts >= 0 ? runStarts : 0,
      completedRuns: Number.isFinite(completedRuns) && completedRuns >= 0 ? completedRuns : 0,
      totalRunDurationSec: Number.isFinite(totalRunDurationSec) && totalRunDurationSec >= 0 ? totalRunDurationSec : 0,
      avgRunDurationSec: 0,
    };
  } catch {
    return fallback;
  }
}

function normalizeSnapshot(data) {
  const completed = Math.max(0, data.completedRuns);
  const total = Math.max(0, data.totalRunDurationSec);
  const avgRunDurationSec = completed > 0 ? total / completed : 0;

  return {
    ctaClicks: Math.max(0, Math.round(data.ctaClicks)),
    runStarts: Math.max(0, Math.round(data.runStarts)),
    completedRuns: completed,
    totalRunDurationSec: total,
    avgRunDurationSec,
  };
}

export function createTelemetryStore() {
  let data = normalizeSnapshot(readTelemetry());

  function persist() {
    data = normalizeSnapshot(data);
    try {
      window.localStorage.setItem(STORAGE_KEYS.telemetry, JSON.stringify(data));
    } catch {
      // Telemetry persistence is optional.
    }
    return data;
  }

  return {
    snapshot() {
      return normalizeSnapshot(data);
    },
    trackCtaClick() {
      data.ctaClicks += 1;
      return persist();
    },
    trackRunStart() {
      data.runStarts += 1;
      return persist();
    },
    trackRunEnd(durationSec) {
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return normalizeSnapshot(data);
      }

      data.completedRuns += 1;
      data.totalRunDurationSec += durationSec;
      return persist();
    },
  };
}
