import { deriveSnapshot } from './engine';
import type { Snapshot } from './types';

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 30] as const;
export const JOURNEY_STEPS = [8, 18, 32, 38, 50, 62, 74, 86, 108, 115, 130, 138, 158, 166, 180] as const;
export const JOURNEY_INTERACTIONS = [50, 115, 166] as const;

/** Next meaningful state change, scoped to one household when requested. Never grants a decision. */
export function nextProgressionTime(snapshot: Snapshot, requestId?: string, guided = false) {
  if (guided || !requestId) return JOURNEY_STEPS.find((at) => at > snapshot.cursor + 0.001) ?? 180;
  const items = snapshot.assetList.filter((item) => item.asset.requestId === requestId);
  if (!items.length) return 180;
  const ids = new Set(items.map((item) => item.asset.id));
  const override = new Map(
    snapshot.context.eventOverrides.map((event) => [`${event.assetId}/${event.kind}`, event]),
  );
  const candidates = new Set<number>([180]);
  for (const original of snapshot.context.events) {
    if (!original.assetId || !ids.has(original.assetId)) continue;
    const event = override.get(`${original.assetId}/${original.kind}`) ?? original;
    const at =
      event.kind === 'collected'
        ? snapshot.assets[event.assetId!].asset.collectionStorySecond
        : event.atSecond;
    if (Number.isFinite(at) && at > snapshot.cursor + 0.001 && at <= 180) candidates.add(at);
  }
  const signature = (value: Snapshot) =>
    items
      .map((item) => {
        const record = value.assets[item.asset.id];
        return `${record.status}/${record.held}/${record.deferred}/${record.dataCleared}`;
      })
      .join('|');
  const current = signature(snapshot);
  for (const at of [...candidates].sort((a, b) => a - b)) {
    const future = deriveSnapshot(
      snapshot.context.seed,
      snapshot.context.events,
      snapshot.decisions,
      at,
      snapshot.scenarioId,
      snapshot.context,
    );
    if (signature(future) !== current) return at;
  }
  return 180;
}
