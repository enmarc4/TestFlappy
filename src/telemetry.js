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
    totalSyncAccuracy: 0,
    totalChainPeak: 0,
    totalLinkedSectorRate: 0,
    avgRunDurationSec: 0,
    avg_sync_accuracy: 0,
    avg_chain_peak: 0,
    linked_sector_rate: 0,
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
    const totalSyncAccuracy = Number(parsed.totalSyncAccuracy);
    const totalChainPeak = Number(parsed.totalChainPeak);
    const totalLinkedSectorRate = Number(parsed.totalLinkedSectorRate);

    return {
      ctaClicks: Number.isFinite(ctaClicks) && ctaClicks >= 0 ? ctaClicks : 0,
      runStarts: Number.isFinite(runStarts) && runStarts >= 0 ? runStarts : 0,
      completedRuns: Number.isFinite(completedRuns) && completedRuns >= 0 ? completedRuns : 0,
      totalRunDurationSec: Number.isFinite(totalRunDurationSec) && totalRunDurationSec >= 0 ? totalRunDurationSec : 0,
      totalSyncAccuracy: Number.isFinite(totalSyncAccuracy) && totalSyncAccuracy >= 0 ? totalSyncAccuracy : 0,
      totalChainPeak: Number.isFinite(totalChainPeak) && totalChainPeak >= 0 ? totalChainPeak : 0,
      totalLinkedSectorRate:
        Number.isFinite(totalLinkedSectorRate) && totalLinkedSectorRate >= 0 ? totalLinkedSectorRate : 0,
      avgRunDurationSec: 0,
      avg_sync_accuracy: 0,
      avg_chain_peak: 0,
      linked_sector_rate: 0,
    };
  } catch {
    return fallback;
  }
}

function normalizeSnapshot(data) {
  const completed = Math.max(0, data.completedRuns);
  const total = Math.max(0, data.totalRunDurationSec);
  const avgRunDurationSec = completed > 0 ? total / completed : 0;
  const totalSyncAccuracy = Math.max(0, data.totalSyncAccuracy);
  const totalChainPeak = Math.max(0, data.totalChainPeak);
  const totalLinkedSectorRate = Math.max(0, data.totalLinkedSectorRate);
  const avgSyncAccuracy = completed > 0 ? totalSyncAccuracy / completed : 0;
  const avgChainPeak = completed > 0 ? totalChainPeak / completed : 0;
  const linkedSectorRate = completed > 0 ? totalLinkedSectorRate / completed : 0;

  return {
    ctaClicks: Math.max(0, Math.round(data.ctaClicks)),
    runStarts: Math.max(0, Math.round(data.runStarts)),
    completedRuns: completed,
    totalRunDurationSec: total,
    totalSyncAccuracy,
    totalChainPeak,
    totalLinkedSectorRate,
    avgRunDurationSec,
    avg_sync_accuracy: avgSyncAccuracy,
    avg_chain_peak: avgChainPeak,
    linked_sector_rate: linkedSectorRate,
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
    trackRunEnd(summary) {
      let durationSec = 0;
      let syncAccuracy = 0;
      let chainPeak = 0;
      let linkedSectorRate = 0;

      if (typeof summary === "number") {
        durationSec = Number(summary);
      } else if (summary && typeof summary === "object") {
        durationSec = Number(summary.durationSec ?? summary.runDuration);
        syncAccuracy = Number(summary.syncAccuracy);
        chainPeak = Number(summary.chainPeak);
        linkedSectorRate = Number(summary.linkedSectorRate);
      }

      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return normalizeSnapshot(data);
      }

      data.completedRuns += 1;
      data.totalRunDurationSec += durationSec;
      data.totalSyncAccuracy += Number.isFinite(syncAccuracy) && syncAccuracy > 0 ? syncAccuracy : 0;
      data.totalChainPeak += Number.isFinite(chainPeak) && chainPeak > 0 ? chainPeak : 0;
      data.totalLinkedSectorRate +=
        Number.isFinite(linkedSectorRate) && linkedSectorRate > 0 ? linkedSectorRate : 0;
      return persist();
    },
  };
}
