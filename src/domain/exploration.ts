import { explorationTemplates, vehicles, world } from './fixtures';
import type {
  Asset,
  DerivationContext,
  ExplorationBatch,
  ExplorationRequestInput,
  ExplorationState,
  RequestRecord,
  RouteRecord,
  StoryEvent,
  Guard,
} from './types';

const HANDLING_CLASSES = ['ordinary', 'bulky', 'specialist'] as const;
type HandlingClass = (typeof HANDLING_CLASSES)[number];
type Point = [number, number];

/** ISO date arithmetic is performed at noon UTC, independent of host timezone/DST. */
function nextDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function appendLeg(path: Point[], target: Point): void {
  const from = path[path.length - 1];
  if (from[0] !== target[0]) path.push([target[0], from[1]]);
  if (path[path.length - 1][1] !== target[1]) path.push([...target]);
}

function round(value: number, places = 3): number {
  return Number(value.toFixed(places));
}

export function createExplorationState(): ExplorationState {
  return { batches: [], reservations: [], requestCount: 0 };
}

function earliestBatchDate(state: ExplorationState): string {
  const latestReserved = [
    ...state.reservations.map((reservation) => reservation.date),
    ...state.batches.flatMap((batch) => batch.windows.map((window) => window.date)),
  ].reduce((latest, date) => (date > latest ? date : latest), explorationTemplates.canonicalReservedThrough);
  const next = nextDate(latestReserved);
  return next > explorationTemplates.windowStartDate ? next : explorationTemplates.windowStartDate;
}

/** A new request is appended to the most recent batch only while it is unstarted. */
export function addExplorationRequest(
  state: ExplorationState,
  input: ExplorationRequestInput,
): { ok: true; state: ExplorationState; requestId: string; batchId: string } | { ok: false; reason: string } {
  const requestCount = state.batches.reduce((sum, batch) => sum + batch.requests.length, 0);
  if (requestCount >= explorationTemplates.maxAdditionalRequests)
    return { ok: false, reason: 'request_limit' };
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > explorationTemplates.maxAssetsPerRequest
  ) {
    return { ok: false, reason: 'invalid_asset_count' };
  }
  if ((input.addressAlias?.trim().length ?? 0) > 300 || (input.contactAlias?.trim().length ?? 0) > 300) {
    return { ok: false, reason: 'invalid_alias' };
  }
  const household = input.addressId
    ? world.households.find((home) => home.id === input.addressId && home.active)
    : world.households.filter((home) => home.active)[
        requestCount % world.households.filter((home) => home.active).length
      ];
  if (!household) return { ok: false, reason: 'invalid_household' };

  // Validate the entire input before constructing any state or reserving a date.
  const resolved = input.items.map((item) => {
    const template = explorationTemplates.templates.find((entry) => entry.category === item.category);
    if (!template) return null;
    const disposition = template.conditionToDisposition[item.condition];
    if (!disposition) return null;
    const destinationId = template.destinationByDisposition[disposition];
    const vehicleId = explorationTemplates.physicalVehicleIds[template.handlingClass as HandlingClass];
    const vehicle = vehicles.find((entry) => entry.id === vehicleId);
    if (!vehicle || template.massKg > vehicle.capacityKg || !destinationId) return null;
    return { item, template, disposition, destinationId };
  });
  if (resolved.some((item) => item === null)) return { ok: false, reason: 'invalid_category_or_condition' };

  const batches = state.batches.map((batch) => ({
    ...batch,
    requests: [...batch.requests],
    assets: [...batch.assets],
    windows: batch.windows.map((window) => ({ ...window, assetIds: [...window.assetIds] })),
  }));
  let batch = batches[batches.length - 1];
  if (!batch || batch.started) {
    const number = batches.length + 1;
    const id = `EXP-${number}`;
    batch = {
      id,
      started: false,
      requests: [],
      assets: [],
      windows: [{ id: `${id}-W1`, date: earliestBatchDate(state), assetIds: [] }],
    };
    batches.push(batch);
  }
  const requestIndex = batch.requests.length + 1;
  const batchNumber = batches.length;
  const requestId = `EXP-${batchNumber}-${requestIndex}`;
  const requestAssets: Asset[] = resolved.map((resolvedItem, index) => {
    const { item, template, disposition, destinationId } = resolvedItem!;
    const id = `EXP-A-${batchNumber}-${requestIndex}-${index + 1}`;
    return {
      id,
      requestId,
      householdId: household.id,
      category: template.category,
      catalogVariant: 1,
      massKg: template.massKg,
      baseRecoveredValueIdr: template.baseRecoveredValueIdr,
      components: [...template.components],
      dataBearing: template.dataBearing,
      handlingClass: template.handlingClass,
      condition: item.condition,
      batteryRisk:
        template.handlingClass === 'specialist'
          ? item.condition === 'damaged'
            ? 'damaged'
            : 'specialist'
          : 'none',
      plannedDisposition: disposition,
      destinationId,
      initialStatus: 'requested',
      scenarioRecordId: `EXP-REC-${batchNumber}-${requestIndex}-${index + 1}`,
      routeId: '',
      collectionStorySecond: 0,
      receivedStorySecond: explorationTemplates.milestones.received,
    };
  });

  // FIFO: preserve all previous allocations, then place each new asset into its
  // earliest compatible existing or subsequent daily window.
  for (const asset of requestAssets) {
    let windowIndex = 0;
    const handling = asset.handlingClass as HandlingClass;
    const vehicle = vehicles.find((entry) => entry.id === explorationTemplates.physicalVehicleIds[handling])!;
    for (;;) {
      if (!batch.windows[windowIndex]) {
        batch.windows.push({
          id: `${batch.id}-W${windowIndex + 1}`,
          date: nextDate(batch.windows[windowIndex - 1].date),
          assetIds: [],
        });
      }
      const window = batch.windows[windowIndex];
      const allocated = batch.assets.filter((entry) => window.assetIds.includes(entry.id));
      const classAssets = allocated.filter((entry) => entry.handlingClass === handling);
      const destinationCount = allocated.filter(
        (entry) => entry.destinationId === asset.destinationId,
      ).length;
      const destinationLimit = (
        explorationTemplates.availableDestinationSlotsPerWindow as Record<string, number>
      )[asset.destinationId];
      const classLimit = Math.min(
        explorationTemplates.availableVehicleSlotsPerWindow[handling],
        vehicle.capacityAssets,
      );
      const massFits =
        classAssets.reduce((sum, entry) => sum + entry.massKg, 0) + asset.massKg <= vehicle.capacityKg;
      if (classAssets.length < classLimit && destinationCount < destinationLimit && massFits) {
        window.assetIds.push(asset.id);
        batch.assets.push(asset);
        break;
      }
      windowIndex += 1;
    }
  }

  const requestWindows = batch.windows.filter((window) =>
    window.assetIds.some((id) => requestAssets.some((asset) => asset.id === id)),
  );
  const request: RequestRecord = {
    id: requestId,
    householdId: household.id,
    assetIds: requestAssets.map((asset) => asset.id),
    pickupWindow: explorationTemplates.windowTime,
    date: requestWindows[0].date,
    timezone: 'Asia/Jakarta',
    initiallySubmitted: true,
    hero: false,
    addressAlias: input.addressAlias?.trim() || household.label,
    contactAlias: input.contactAlias?.trim() || 'Warga Jakarta',
    batchId: batch.id,
    windowIds: requestWindows.map((window) => window.id),
  };
  batch.requests.push(request);
  const reservations = batches.flatMap((entry) =>
    entry.windows.map((window) => ({
      batchId: entry.id,
      windowId: window.id,
      date: window.date,
      assetIds: [...window.assetIds],
    })),
  );
  return {
    ok: true,
    state: { ...state, batches, reservations, requestCount: requestCount + 1 },
    requestId,
    batchId: batch.id,
  };
}

export function markBatchStarted(state: ExplorationState, batchId: string): ExplorationState {
  if (!state.batches.some((batch) => batch.id === batchId && !batch.started)) return state;
  return {
    ...state,
    batches: state.batches.map((batch) => (batch.id === batchId ? { ...batch, started: true } : batch)),
  };
}

function routeForClass(
  batch: ExplorationBatch,
  windowId: string,
  assets: Asset[],
  handling: HandlingClass,
): RouteRecord | null {
  const classAssets = assets.filter((asset) => asset.handlingClass === handling);
  if (!classAssets.length) return null;
  const hub = [...world.hub.position] as Point;
  const path: Point[] = [hub];
  const orderedHomes = [...new Set(classAssets.map((asset) => asset.householdId))];
  let last = hub;
  let distance = 0;
  const start = explorationTemplates.routeStartSeconds[handling];
  const end = explorationTemplates.routeEndSecond;
  const stops = orderedHomes.map((householdId) => {
    const position = [...world.households.find((home) => home.id === householdId)!.position] as Point;
    distance += manhattan(last, position);
    appendLeg(path, position);
    last = position;
    return {
      householdId,
      position,
      distanceFromStartUnits: distance,
      assetIds: classAssets.filter((asset) => asset.householdId === householdId).map((asset) => asset.id),
      arrivalStorySecond: 0,
    };
  });
  distance += manhattan(last, hub);
  appendLeg(path, hub);
  for (const stop of stops)
    stop.arrivalStorySecond = round(
      start + (end - start) * (distance ? stop.distanceFromStartUnits / distance : 0),
    );
  return {
    id: `${batch.id}-${windowId}-RT-${handling}`,
    vehicleId: explorationTemplates.physicalVehicleIds[handling],
    handlingClass: handling,
    mode: handling === 'specialist' ? 'specialist' : 'grouped_reverse',
    assetIds: classAssets.map((asset) => asset.id),
    stops,
    path,
    distanceKm: round(distance * world.coordinateUnitKm),
    startStorySecond: start,
    endStorySecond: end,
    loadKg: round(classAssets.reduce((sum, asset) => sum + asset.massKg, 0)),
    guard: handling === 'specialist' ? 'specialist_approved' : null,
  };
}

function eventsForWindow(assets: Asset[], routes: RouteRecord[]): StoryEvent[] {
  const milestones = explorationTemplates.milestones;
  const events: StoryEvent[] = [];
  const append = (
    assetId: string | null,
    kind: string,
    atSecond: number,
    guard: Guard | null = null,
    payload = {},
  ) => {
    events.push({ id: `EXP-EV-${assetId || 'window'}-${kind}`, atSecond, kind, assetId, guard, payload });
  };
  for (const asset of assets) {
    const specialist = asset.handlingClass === 'specialist';
    const guard = specialist ? 'specialist_approved' : null;
    const route = routes.find((entry) => entry.assetIds.includes(asset.id))!;
    const stop = route.stops.find((entry) => entry.assetIds.includes(asset.id))!;
    append(asset.id, 'validated', milestones.validated);
    if (specialist) append(asset.id, 'safety_hold', 42);
    append(asset.id, 'scheduled', specialist ? milestones.specialistScheduled : milestones.scheduled, guard);
    append(asset.id, 'assigned', specialist ? milestones.specialistAssigned : milestones.assigned, guard);
    append(asset.id, 'collected', stop.arrivalStorySecond, guard);
    append(asset.id, 'received', milestones.received, guard);
    append(asset.id, 'triaged', milestones.triaged, guard, { disposition: asset.plannedDisposition });
    if (asset.dataBearing) append(asset.id, 'data_cleared', milestones.dataCleared, 'data_release_approved');
    append(asset.id, 'routed', milestones.routed, guard, {
      destinationId: asset.destinationId,
      requiresDataClearance: asset.dataBearing,
    });
    append(asset.id, 'completed', milestones.completed, guard, {
      recordId: asset.scenarioRecordId,
      requiresDataClearance: asset.dataBearing,
    });
  }
  if (assets.some((asset) => asset.handlingClass === 'specialist')) {
    append(null, 'checkpoint_specialist', 74, null, {
      action: 'review_specialist',
      pause: true,
      allowedDecisions: ['approve', 'retain_hold'],
    });
    events[events.length - 1].kind = 'checkpoint';
  }
  if (assets.some((asset) => asset.dataBearing)) {
    append(null, 'checkpoint_data', 130, null, {
      action: 'review_data_release',
      pause: true,
      allowedDecisions: ['approve', 'retain_hold'],
    });
    events[events.length - 1].kind = 'checkpoint';
  }
  return events.sort((a, b) => a.atSecond - b.atSecond || a.id.localeCompare(b.id));
}

/** Rebuilding a view never mutates reservations or another batch/window's state. */
export function buildExplorationContext(
  state: ExplorationState,
  batchId: string,
  windowId: string,
): DerivationContext {
  const batch = state.batches.find((entry) => entry.id === batchId);
  const window = batch?.windows.find((entry) => entry.id === windowId);
  if (!batch || !window) throw new Error('Exploration batch/window not found');
  const currentAssets = batch.assets.filter((asset) => window.assetIds.includes(asset.id));
  const routes = HANDLING_CLASSES.map((handling) =>
    routeForClass(batch, windowId, currentAssets, handling),
  ).filter((route): route is RouteRecord => route !== null);
  const assets = batch.assets.map((asset) => {
    const route = routes.find((entry) => entry.assetIds.includes(asset.id));
    const stop = route?.stops.find((entry) => entry.assetIds.includes(asset.id));
    return route && stop
      ? { ...asset, routeId: route.id, collectionStorySecond: stop.arrivalStorySecond }
      : { ...asset };
  });
  const eligibleAssets = assets.filter((asset) => window.assetIds.includes(asset.id));
  return {
    batchId,
    windowId,
    serviceDate: window.date,
    seed: assets,
    requests: batch.requests,
    activeRoutes: routes,
    eventOverrides: [],
    events: eventsForWindow(eligibleAssets, routes),
    eligibleAssetIds: [...window.assetIds],
    destinationCapacity: { ...explorationTemplates.availableDestinationSlotsPerWindow },
    funding: { serviceContractFeeIdr: 0, communityAccessSponsorIdr: 0 },
    gates: [
      ...(eligibleAssets.some((asset) => asset.handlingClass === 'specialist')
        ? ['specialist' as const]
        : []),
      ...(eligibleAssets.some((asset) => asset.dataBearing) ? ['data' as const] : []),
    ],
  };
}
