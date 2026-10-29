import type {
  Asset,
  AssetSnapshot,
  StoryEvent,
  Decision,
  ScenarioId,
  DerivationContext,
  Snapshot,
  AssetStatus,
  Guard,
  GateId,
  Metrics,
} from './types';
import { canonicalContext } from './context';
import { computeMetrics } from './metrics';
import { filterRoutes } from './routing';
import { GATE_TIMES, ACTION_GATE } from './session';
import { partners } from './fixtures';
export const LIFECYCLE: AssetStatus[] = [
  'draft',
  'requested',
  'validated',
  'scheduled',
  'assigned',
  'collected',
  'received',
  'triaged',
  'routed',
  'completed',
];
export const statusAtLeast = (status: AssetStatus, minimum: AssetStatus) =>
  LIFECYCLE.indexOf(status) >= LIFECYCLE.indexOf(minimum);
/** Reconstruct every view from immutable inputs. Decisions authorize only their own exact story checkpoint. */
export function deriveSnapshot(
  seed: readonly Asset[],
  events: readonly StoryEvent[],
  decisions: readonly Decision[],
  cursor: number,
  scenarioId: ScenarioId,
  context: DerivationContext = canonicalContext(scenarioId),
): Snapshot {
  const time = Math.min(180, Math.max(0, Number.isFinite(cursor) ? cursor : 0));
  const scoped = decisions.filter(
    (d) =>
      d.scenarioId === scenarioId &&
      d.batchId === context.batchId &&
      d.windowId === context.windowId &&
      d.atSecond === GATE_TIMES[ACTION_GATE[d.action]] &&
      d.atSecond <= time,
  );
  const accepted = (action: Decision['action'], at = time) =>
    scoped.some((d) => d.action === action && d.atSecond <= at);
  const guardAllows = (guard: Guard | null, at: number) =>
    !guard ||
    (guard === 'hero_submitted'
      ? accepted('submit_hero', at)
      : guard === 'specialist_approved'
        ? accepted('approve_specialist', at)
        : accepted('approve_data_release', at));
  const submitted = context.requests.filter(
    (r) => r.initiallySubmitted || (r.hero && accepted('submit_hero')),
  );
  const submittedIds = new Set(submitted.map((r) => r.id));
  const eligibleIds = new Set(context.eligibleAssetIds);
  const includedIds = new Set(
    seed
      .filter(
        (a) =>
          submittedIds.has(a.requestId) &&
          eligibleIds.has(a.id) &&
          (a.handlingClass !== 'specialist' || accepted('approve_specialist')),
      )
      .map((a) => a.id),
  );
  const activeRoutes = filterRoutes(context.activeRoutes, includedIds, seed);
  const routeByAsset = new Map(activeRoutes.flatMap((r) => r.assetIds.map((id) => [id, r] as const)));
  const snapshotAssets: Record<string, AssetSnapshot> = Object.fromEntries(
    seed.map((asset) => {
      const route = routeByAsset.get(asset.id);
      const stop = route?.stops.find((s) => s.assetIds.includes(asset.id));
      const plannedAsset =
        route && stop
          ? { ...asset, routeId: route.id, collectionStorySecond: stop.arrivalStorySecond }
          : asset;
      return [
        asset.id,
        {
          asset: plannedAsset,
          status: submittedIds.has(asset.requestId) ? 'requested' : 'draft',
          held: false,
          holdReason: null,
          deferred: !eligibleIds.has(asset.id),
          dataCleared: false,
          custodyEventIds: [],
          custodyEvents: [],
        } as AssetSnapshot,
      ];
    }),
  );
  const overrideMap = new Map(context.eventOverrides.map((e) => [`${e.assetId}/${e.kind}`, e]));
  const chronological = events
    .map((original) => {
      let event = overrideMap.get(`${original.assetId}/${original.kind}`) ?? original;
      if (event.assetId && event.kind === 'collected') {
        const route = routeByAsset.get(event.assetId);
        const stop = route?.stops.find((s) => s.assetIds.includes(event.assetId!));
        if (stop) event = { ...event, atSecond: stop.arrivalStorySecond };
      }
      return event;
    })
    .sort((a, b) => a.atSecond - b.atSecond || a.id.localeCompare(b.id));
  const receivingUsed: Record<string, number> = {};
  for (const event of chronological) {
    if (event.atSecond > time || !event.assetId) continue;
    const record = snapshotAssets[event.assetId];
    if (!record || record.deferred || !submittedIds.has(record.asset.requestId)) continue;
    const a = record.asset;
    // Draft hero cannot inherit earlier events even if an imported decision had a later timestamp.
    if (a.initialStatus === 'draft' && !accepted('submit_hero', event.atSecond)) continue;
    if (!guardAllows(event.guard, event.atSecond)) continue;
    if (event.kind === 'safety_hold') continue;
    if (event.kind === 'data_cleared') {
      if (
        a.dataBearing &&
        statusAtLeast(record.status, 'received') &&
        accepted('approve_data_release', event.atSecond) &&
        !record.dataCleared
      ) {
        record.dataCleared = true;
        appendCustody(record, event, context);
      }
      continue;
    }
    const nextIndex = LIFECYCLE.indexOf(event.kind as AssetStatus);
    if (nextIndex < 2 || LIFECYCLE[nextIndex - 1] !== record.status) continue;
    if (
      a.handlingClass === 'specialist' &&
      nextIndex >= LIFECYCLE.indexOf('scheduled') &&
      !accepted('approve_specialist', event.atSecond)
    )
      continue;
    const route = routeByAsset.get(a.id);
    if (event.kind === 'collected') {
      const stop = route?.stops.find((s) => s.assetIds.includes(a.id));
      if (!route || !stop || event.atSecond < stop.arrivalStorySecond) continue;
    }
    if (event.kind === 'received' && (!route || event.atSecond < route.endStorySecond)) continue;
    if (event.kind === 'routed' || event.kind === 'completed') {
      const destination = partners.find((p) => p.id === a.destinationId);
      if (
        !destination ||
        !destination.acceptedDispositions.includes(a.plannedDisposition) ||
        (a.dataBearing && !record.dataCleared)
      )
        continue;
      if (event.kind === 'routed') {
        if ((receivingUsed[a.destinationId] ?? 0) >= (context.destinationCapacity[a.destinationId] ?? 0))
          continue;
        receivingUsed[a.destinationId] = (receivingUsed[a.destinationId] ?? 0) + 1;
      }
    }
    record.status = event.kind as AssetStatus;
    appendCustody(record, event, context);
  }
  for (const record of Object.values(snapshotAssets)) {
    if (record.deferred || record.status === 'draft') continue;
    if (record.asset.handlingClass === 'specialist' && time >= 42 && !accepted('approve_specialist')) {
      record.held = true;
      record.holdReason = 'safety';
    } else if (record.asset.dataBearing && statusAtLeast(record.status, 'triaged') && !record.dataCleared) {
      record.held = true;
      record.holdReason = 'data';
    }
  }
  const pending =
    context.gates.find((g) => time >= GATE_TIMES[g] && !scoped.some((d) => ACTION_GATE[d.action] === g)) ??
    null;
  const snapshot: Snapshot = {
    scenarioId,
    batchId: context.batchId,
    windowId: context.windowId,
    serviceDate: context.serviceDate,
    cursor: time,
    assets: snapshotAssets,
    assetList: Object.values(snapshotAssets),
    submittedRequestIds: [...submittedIds],
    requests: context.requests.map((r) => ({ ...r })),
    pendingCheckpoint: pending as GateId | null,
    metrics: {} as Metrics,
    decisions: scoped,
    routes: activeRoutes,
    context,
  };
  snapshot.metrics = computeMetrics(snapshot, context.activeRoutes);
  return snapshot;
}
function appendCustody(record: AssetSnapshot, event: StoryEvent, context: DerivationContext) {
  const id = `${context.batchId}/${context.windowId}/${event.id}`;
  if (record.custodyEventIds.includes(id)) return;
  record.custodyEventIds.push(id);
  record.custodyEvents.push({ ...event, id });
}
