import { assets, requests, routes, vehicles, world, partners } from './fixtures';
import { canonicalContext } from './context';
import { computeMetrics } from './metrics';
import { distance, pathLength } from './routing';
import { getLiveVehicleProfile, type LiveVehicleProfile } from './partner-logistics';
import type { AssetSnapshot, AssetStatus, Metrics, RouteRecord, Snapshot, StoryEvent, Vec2 } from './types';

/** One repeating operational cadence, independent of the gated 180-second tutorial. */
export const LIVE_PERIOD = 360;
export const LIVE_SERVICE_START = '2026-10-20T09:20:00+07:00';
export type LivePhase =
  | 'dispatching'
  | 'delivery_outbound'
  | 'delivery_stop'
  | 'outbound'
  | 'collecting'
  | 'returning'
  | 'unloading'
  | 'processing'
  | 'delivering'
  | 'partner_handoff'
  | 'repositioning';
export const LIVE_PHASE_LABELS: Record<LivePhase, { id: string; en: string }> = {
  dispatching: { id: 'Persiapan berangkat', en: 'Dispatching' },
  delivery_outbound: { id: 'Antar biasa dari mitra', en: 'Ordinary partner delivery' },
  delivery_stop: { id: 'Serah terima antar biasa', en: 'Ordinary delivery stop' },
  outbound: { id: 'Menuju penjemputan', en: 'Heading to pickup' },
  collecting: { id: 'Mengambil perangkat', en: 'Collecting devices' },
  returning: { id: 'Kembali ke pusat', en: 'Returning to hub' },
  unloading: { id: 'Menurunkan muatan', en: 'Unloading at hub' },
  processing: { id: 'Pemilahan di pusat', en: 'Hub processing' },
  delivering: { id: 'Antar perangkat pulihan ke mitra', en: 'Recovered devices to partner' },
  partner_handoff: { id: 'Serah terima mitra', en: 'Partner handoff' },
  repositioning: { id: 'Kembali ke depo / titik lingkungan', en: 'Returning to depot / neighborhood' },
};
export interface LiveVehiclePose {
  vehicleId: string;
  profile: LiveVehicleProfile;
  routeId: string;
  position: Vec2;
  heading: number;
  /** Progress through this vehicle's complete repeating operational cadence. */
  progress: number;
  routeProgress: number;
  phase: LivePhase;
  moving: boolean;
  loadAssets: number;
  loadKg: number;
  loadAssetIds: readonly string[];
  /** Ordinary delivery parcels are illustrative and excluded from recovery/custody metrics. */
  forwardLoadUnits: number;
  nextStopId: string | null;
  targetId: string;
  path: readonly Vec2[];
  route: RouteRecord;
  round: number;
}
export interface LiveRouteFrame {
  routeId: string;
  vehicleId: string;
  route: RouteRecord;
  active: boolean;
  progress: number;
  phase: LivePhase | 'completed';
  collectedAssets: number;
  completedAssets: number;
}
export interface LiveActivity {
  id: string;
  atElapsedSecond: number;
  vehicleId: string;
  routeId: string;
  kind: 'dispatch' | 'collection' | 'hub_received' | 'partner_handoff';
  targetId: string;
  assetCount: number;
  labelId: string;
  labelEn: string;
}
export interface LiveOperationsFrame {
  mode: 'live';
  scope: 'simulated-rolling-cohort';
  elapsedSeconds: number;
  cycle: number;
  cycleProgress: number;
  shift: number;
  shiftDay: number;
  serviceClock: string;
  serviceDate: string;
  serviceTimestamp: string;
  vehicles: LiveVehiclePose[];
  routes: LiveRouteFrame[];
  activityFeed: LiveActivity[];
  snapshot: Snapshot;
  metrics: Metrics;
  fleet: {
    totalVehicles: number;
    movingVehicles: number;
    collectingVehicles: number;
    hubVehicles: number;
    downstreamVehicles: number;
    onboardAssets: number;
    onboardMassKg: number;
    hubAssets: number;
    completedAssets: number;
  };
}
interface Segment {
  phase: LivePhase;
  path: Vec2[];
  pathStart: number;
  pathEnd: number;
  distance: number;
  dwell: number;
  start: number;
  end: number;
  targetId: string;
  nextStopId: string | null;
  loadIds: string[];
  forwardLoadUnits: number;
}
interface RunPlan {
  route: RouteRecord;
  start: number;
  end: number;
  segments: Segment[];
  collectionAt: Map<string, number>;
  receivedAt: number;
  triagedAt: number;
  routedAt: number;
  deliveredAt: Map<string, number>;
}
interface VehiclePlan {
  vehicleId: string;
  offset: number;
  runs: RunPlan[];
  segments: Array<Segment & { run: RunPlan }>;
}
const byAsset = new Map(assets.map((a) => [a.id, a]));
const byPartner = new Map(partners.map((p) => [p.id, p]));
// Authored, deliberately different departure offsets: the network opens mid-shift.
const offsets: Record<string, number> = { V01: 54, V02: 134, V03: 214, V04: 42, V05: 276, V06: 173 };
const hub = world.hub.position;
const finiteTime = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;
const mass = (ids: readonly string[]) =>
  Number(ids.reduce((n, id) => n + (byAsset.get(id)?.massKg ?? 0), 0).toFixed(2));
const copyPoint = (p: Vec2): Vec2 => [p[0], p[1]];

/** Connect real operating points along the authored orthogonal road convention. */
function roadBetween(origin: Vec2, target: Vec2): Vec2[] {
  const points: Vec2[] = [copyPoint(origin), [target[0], origin[1]], copyPoint(target)];
  return points.filter((point, index) => index === 0 || distance(points[index - 1], point) > 0);
}
/** Live collection starts at a partner/neighborhood; canonical tutorial geometry is untouched. */
export const liveRoutes: RouteRecord[] = routes.map((route) => {
  const origin = getLiveVehicleProfile(route.vehicleId)!.origin.position;
  const path: Vec2[] = [copyPoint(origin)];
  let previous: Vec2 = origin;
  let travelled = 0;
  const stops = route.stops.map((stop) => {
    const leg = roadBetween(previous, stop.position);
    path.push(...leg.slice(1));
    travelled += pathLength(leg);
    previous = stop.position;
    return { ...stop, assetIds: [...stop.assetIds], distanceFromStartUnits: travelled };
  });
  path.push(...roadBetween(previous, hub).slice(1));
  return {
    ...route,
    guard: null,
    assetIds: [...route.assetIds],
    stops,
    path,
    distanceKm: Number((pathLength(path) * world.coordinateUnitKm).toFixed(4)),
  };
});

function buildPlan(vehicleId: string): VehiclePlan {
  const profile = getLiveVehicleProfile(vehicleId)!;
  const assigned = liveRoutes.filter((route) => route.vehicleId === vehicleId);
  const runs: RunPlan[] = assigned.map((route) => {
    const segments: Segment[] = [];
    const add = (
      phase: LivePhase,
      path: Vec2[],
      from: number,
      to: number,
      dwell: number,
      targetId: string,
      loadIds: string[],
      nextStopId: string | null = null,
      forwardLoadUnits = 0,
    ) => {
      const segment: Segment = {
        phase,
        path,
        pathStart: from,
        pathEnd: to,
        distance: Math.max(0, to - from),
        dwell,
        start: 0,
        end: 0,
        targetId,
        nextStopId,
        loadIds: [...loadIds],
        forwardLoadUnits,
      };
      if (segment.distance || segment.dwell) segments.push(segment);
      return segment;
    };
    const run: RunPlan = {
      route,
      start: 0,
      end: 0,
      segments,
      collectionAt: new Map(),
      receivedAt: 0,
      triagedAt: 0,
      routedAt: 0,
      deliveredAt: new Map(),
    };
    const firstStop = route.stops[0];
    const forwardUnits = profile.carriesOrdinaryDeliveries ? 1 : 0;
    add(
      'dispatching',
      [copyPoint(profile.origin.position)],
      0,
      0,
      3,
      profile.origin.id,
      [],
      null,
      forwardUnits,
    );
    let previousDistance = 0;
    // A compatible pickup begins after the ordinary partner/local delivery has finished.
    // Those parcels originate at the partner/neighborhood, never at the recovery hub.
    if (forwardUnits) {
      add(
        'delivery_outbound',
        route.path,
        0,
        firstStop.distanceFromStartUnits,
        0,
        firstStop.householdId,
        [],
        firstStop.householdId,
        forwardUnits,
      );
      add(
        'delivery_stop',
        [firstStop.position],
        0,
        0,
        5,
        firstStop.householdId,
        [],
        firstStop.householdId,
        forwardUnits,
      );
      previousDistance = firstStop.distanceFromStartUnits;
    }
    let collected: string[] = [];
    for (const stop of route.stops) {
      add(
        'outbound',
        route.path,
        previousDistance,
        stop.distanceFromStartUnits,
        0,
        stop.householdId,
        collected,
        stop.householdId,
      );
      const dwell = route.handlingClass === 'specialist' ? 7 : route.handlingClass === 'bulky' ? 6 : 3.5;
      add('collecting', [stop.position], 0, 0, dwell, stop.householdId, collected, stop.householdId);
      collected = [...collected, ...stop.assetIds];
      previousDistance = stop.distanceFromStartUnits;
    }
    add('returning', route.path, previousDistance, pathLength(route.path), 0, world.hub.id, collected);
    add('unloading', [copyPoint(hub)], 0, 0, 9, world.hub.id, collected);
    add('processing', [copyPoint(hub)], 0, 0, 12, world.hub.id, []);
    let origin: Vec2 = hub;
    let remaining = [...collected];
    const destinations = [...new Set(route.assetIds.map((id) => byAsset.get(id)!.destinationId))];
    for (const destinationId of destinations) {
      const destination = byPartner.get(destinationId)!;
      const point: Vec2 = [destination.position[0], destination.position[1]];
      const path = roadBetween(origin, point);
      add('delivering', path, 0, pathLength(path), 0, destinationId, remaining);
      add('partner_handoff', [copyPoint(point)], 0, 0, 6, destinationId, remaining);
      remaining = remaining.filter((id) => byAsset.get(id)!.destinationId !== destinationId);
      origin = point;
    }
    const returnPath = roadBetween(origin, profile.origin.position);
    add('repositioning', returnPath, 0, pathLength(returnPath), 0, profile.origin.id, []);
    // Keep the final completed handoff observable before a new recovery cohort is assigned.
    add('repositioning', [copyPoint(profile.origin.position)], 0, 0, 5, profile.origin.id, []);
    return run;
  });
  const flat = runs.flatMap((run) => run.segments.map((segment) => ({ ...segment, run })));
  const dwell = flat.reduce((sum, s) => sum + s.dwell, 0);
  const metres = flat.reduce((sum, s) => sum + s.distance, 0);
  const secondsPerUnit = (LIVE_PERIOD - dwell) / metres;
  let cursor = 0;
  for (const run of runs) {
    run.start = cursor;
    for (const segment of run.segments) {
      segment.start = cursor;
      cursor += segment.dwell || segment.distance * secondsPerUnit;
      segment.end = cursor;
      if (segment.phase === 'collecting') {
        const stop = run.route.stops.find((s) => s.householdId === segment.targetId)!;
        for (const id of stop.assetIds) run.collectionAt.set(id, segment.end);
      }
      if (segment.phase === 'unloading') run.receivedAt = segment.end;
      if (segment.phase === 'processing') {
        run.triagedAt = segment.start + (segment.end - segment.start) / 2;
        run.routedAt = segment.end;
      }
      if (segment.phase === 'partner_handoff') {
        for (const id of run.route.assetIds)
          if (byAsset.get(id)!.destinationId === segment.targetId) run.deliveredAt.set(id, segment.end);
      }
    }
    run.end = cursor;
  }
  // The final endpoint and next dispatch share the same partner/neighborhood origin.
  runs[runs.length - 1].segments.at(-1)!.end = LIVE_PERIOD;
  runs[runs.length - 1].end = LIVE_PERIOD;
  return {
    vehicleId,
    offset: offsets[vehicleId],
    runs,
    segments: runs.flatMap((run) => run.segments.map((segment) => ({ ...segment, run }))),
  };
}
const plans = vehicles.map((vehicle) => buildPlan(vehicle.id));
/** All collection and downstream roads, including the inter-partner legs. */
export const liveRoadPaths: readonly (readonly Vec2[])[] = [
  ...liveRoutes.map((route) => route.path),
  ...plans.flatMap((plan) =>
    plan.segments
      .filter((segment) => segment.distance > 0 && ['delivering', 'repositioning'].includes(segment.phase))
      .map((segment) => segment.path),
  ),
];
const planByVehicle = new Map(plans.map((plan) => [plan.vehicleId, plan]));

/** Distance interpolation uses the same [x,z]/heading convention as the tutorial fleet. */
export function getLivePathPose(path: readonly Vec2[], distanceAlongPath: number) {
  let remaining = Math.max(0, distanceAlongPath);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      length = distance(a, b);
    if (remaining <= length || i === path.length - 1) {
      const progress = length ? Math.min(1, remaining / length) : 0;
      return {
        position: [a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress] as Vec2,
        heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
      };
    }
    remaining -= length;
  }
  return { position: path[0] ?? hub, heading: 0 };
}
function vehiclePose(plan: VehiclePlan, elapsed: number): LiveVehiclePose {
  const clock = elapsed + plan.offset;
  const local = mod(clock, LIVE_PERIOD);
  const segment = plan.segments.find((s) => local >= s.start && local < s.end) ?? plan.segments.at(-1)!;
  const progress = (local - segment.start) / (segment.end - segment.start || 1);
  const pathDistance = segment.pathStart + segment.distance * progress;
  const pose = getLivePathPose(segment.path, pathDistance);
  // Dwell headings retain the approach direction instead of snapping to north.
  if (!segment.distance) {
    const i = plan.segments.indexOf(segment);
    for (let offset = 1; offset <= plan.segments.length; offset++) {
      const previous = plan.segments[mod(i - offset, plan.segments.length)];
      if (previous.distance) {
        pose.heading = getLivePathPose(previous.path, previous.pathEnd).heading;
        break;
      }
    }
  }
  return {
    vehicleId: plan.vehicleId,
    profile: getLiveVehicleProfile(plan.vehicleId)!,
    routeId: segment.run.route.id,
    ...pose,
    progress: local / LIVE_PERIOD,
    routeProgress: (local - segment.run.start) / (segment.run.end - segment.run.start),
    phase: segment.phase,
    moving: segment.distance > 0,
    loadAssets: segment.loadIds.length,
    loadKg: mass(segment.loadIds),
    loadAssetIds: segment.loadIds,
    forwardLoadUnits: segment.forwardLoadUnits,
    nextStopId: segment.nextStopId,
    targetId: segment.targetId,
    path: segment.path,
    route: segment.run.route,
    round: Math.floor(clock / LIVE_PERIOD) + 1,
  };
}
export function getLiveVehiclePose(vehicleId: string, elapsedSeconds: number): LiveVehiclePose | null {
  const plan = planByVehicle.get(vehicleId);
  return plan ? vehiclePose(plan, finiteTime(elapsedSeconds)) : null;
}

function liveSnapshot(elapsed: number): Snapshot {
  const assetList: AssetSnapshot[] = [];
  for (const plan of plans) {
    const absolute = elapsed + plan.offset;
    const local = mod(absolute, LIVE_PERIOD);
    for (const run of plan.runs) {
      // A run not yet dispatched in this cadence still shows its previous completed cohort.
      const previousRound = local < run.start;
      const round = Math.floor(absolute / LIVE_PERIOD) - (previousRound ? 1 : 0);
      const observedTime = previousRound ? local + LIVE_PERIOD : local;
      const absoluteAt = (at: number) => round * LIVE_PERIOD + at - plan.offset;
      for (const id of run.route.assetIds) {
        const asset = { ...byAsset.get(id)! };
        const milestones: Array<[AssetStatus, number]> = [
          ['scheduled', run.start],
          ['assigned', run.segments[0].end],
          ['collected', run.collectionAt.get(id)!],
          ['received', run.receivedAt],
          ['triaged', run.triagedAt],
          ['routed', run.routedAt],
          ['completed', run.deliveredAt.get(id)!],
        ];
        const visible = milestones.filter(([, at]) => at <= observedTime);
        const custodyEvents: StoryEvent[] = visible.map(([status, at]) => ({
          id: `live/${run.route.id}/${round}/${id}/${status}`,
          atSecond: absoluteAt(at),
          kind: status,
          assetId: id,
          guard: null,
          payload: {
            source: 'simulated-live-operations',
            round: round + 1,
            routeId: run.route.id,
            destinationId: asset.destinationId,
            historicalSafetyAndDataPrerequisites: true,
          },
        }));
        assetList.push({
          asset,
          status: visible.at(-1)?.[0] ?? 'scheduled',
          held: false,
          holdReason: null,
          deferred: false,
          dataCleared: asset.dataBearing && observedTime >= run.routedAt,
          custodyEventIds: custodyEvents.map((event) => event.id),
          custodyEvents,
        });
      }
    }
  }
  const context = {
    ...canonicalContext(),
    batchId: 'live-operations',
    windowId: 'rolling-working-cohort',
    serviceDate: new Date(Date.parse(LIVE_SERVICE_START) + elapsed * 10_000 + 7 * 3_600_000)
      .toISOString()
      .slice(0, 10),
    requests: requests.map((request) => ({ ...request, initiallySubmitted: true, hero: false })),
    activeRoutes: liveRoutes,
    events: [],
    eventOverrides: [],
    gates: [],
  };
  const snapshot: Snapshot = {
    scenarioId: 'circular_day',
    batchId: context.batchId,
    windowId: context.windowId,
    serviceDate: context.serviceDate,
    cursor: elapsed,
    assets: Object.fromEntries(assetList.map((item) => [item.asset.id, item])),
    assetList,
    submittedRequestIds: context.requests.map((request) => request.id),
    requests: context.requests,
    pendingCheckpoint: null,
    metrics: {} as Metrics,
    decisions: [],
    routes: context.activeRoutes,
    context,
  };
  snapshot.metrics = computeMetrics(snapshot);
  return snapshot;
}
/** Read-only historical operation fixture. It never authorizes or alters a user's tutorial. */
export function getLiveSnapshot(elapsedSeconds: number): Snapshot {
  return liveSnapshot(finiteTime(elapsedSeconds));
}
function recentActivity(elapsed: number): LiveActivity[] {
  const feed: LiveActivity[] = [];
  for (const plan of plans) {
    const currentRound = Math.floor((elapsed + plan.offset) / LIVE_PERIOD);
    for (let round = currentRound - 1; round <= currentRound; round++) {
      for (const run of plan.runs) {
        const add = (
          at: number,
          kind: LiveActivity['kind'],
          targetId: string,
          assetCount: number,
          id: string,
          en: string,
        ) => {
          const absolute = round * LIVE_PERIOD + at - plan.offset;
          if (absolute <= elapsed && absolute > elapsed - LIVE_PERIOD)
            feed.push({
              id: `live/${plan.vehicleId}/${round}/${run.route.id}/${kind}/${targetId}`,
              atElapsedSecond: absolute,
              vehicleId: plan.vehicleId,
              routeId: run.route.id,
              kind,
              targetId,
              assetCount,
              labelId: id,
              labelEn: en,
            });
        };
        add(
          run.start,
          'dispatch',
          getLiveVehicleProfile(plan.vehicleId)!.origin.id,
          0,
          getLiveVehicleProfile(plan.vehicleId)!.carriesOrdinaryDeliveries
            ? 'Berangkat dari mitra / lingkungan untuk antar + jemput balik'
            : 'Berangkat dari depo / lingkungan untuk putaran koleksi',
          getLiveVehicleProfile(plan.vehicleId)!.carriesOrdinaryDeliveries
            ? 'Partner / neighborhood delivery + backhaul dispatched'
            : 'Depot / neighborhood collection round dispatched',
        );
        for (const stop of run.route.stops)
          add(
            run.collectionAt.get(stop.assetIds[0])!,
            'collection',
            stop.householdId,
            stop.assetIds.length,
            'Penjemputan selesai',
            'Pickup completed',
          );
        add(
          run.receivedAt,
          'hub_received',
          world.hub.id,
          run.route.assetIds.length,
          'Muatan diterima di pusat',
          'Load received at hub',
        );
        for (const destinationId of new Set(run.route.assetIds.map((id) => byAsset.get(id)!.destinationId))) {
          const ids = run.route.assetIds.filter((id) => byAsset.get(id)!.destinationId === destinationId);
          add(
            run.deliveredAt.get(ids[0])!,
            'partner_handoff',
            destinationId,
            ids.length,
            'Serah terima mitra selesai',
            'Partner handoff completed',
          );
        }
      }
    }
  }
  return feed.sort((a, b) => b.atElapsedSecond - a.atElapsedSecond || a.id.localeCompare(b.id)).slice(0, 8);
}
export function getLiveOperationsFrame(elapsedSeconds: number): LiveOperationsFrame {
  const elapsed = finiteTime(elapsedSeconds);
  const snapshot = liveSnapshot(elapsed);
  const fleet = plans.map((plan) => vehiclePose(plan, elapsed));
  const serviceMs = Date.parse(LIVE_SERVICE_START) + elapsed * 10_000;
  // UTC arithmetic after adding Jakarta's fixed offset avoids browser-locale dependencies.
  const jakarta = new Date(serviceMs + 7 * 60 * 60 * 1000);
  const iso = jakarta.toISOString();
  const serviceDate = iso.slice(0, 10);
  snapshot.serviceDate = serviceDate;
  snapshot.context.serviceDate = serviceDate;
  const routeFrames = liveRoutes.map((route): LiveRouteFrame => {
    const pose = fleet.find((vehicle) => vehicle.routeId === route.id);
    const items = snapshot.assetList.filter((item) => item.asset.routeId === route.id);
    return {
      routeId: route.id,
      vehicleId: route.vehicleId,
      route,
      active: !!pose,
      progress: pose?.routeProgress ?? 1,
      phase: pose?.phase ?? 'completed',
      collectedAssets: items.filter((item) =>
        ['collected', 'received', 'triaged', 'routed', 'completed'].includes(item.status),
      ).length,
      completedAssets: items.filter((item) => item.status === 'completed').length,
    };
  });
  return {
    mode: 'live',
    scope: 'simulated-rolling-cohort',
    elapsedSeconds: elapsed,
    cycle: Math.floor(elapsed / LIVE_PERIOD),
    cycleProgress: mod(elapsed, LIVE_PERIOD) / LIVE_PERIOD,
    shift: Math.floor(elapsed / (LIVE_PERIOD * 8)) + 1,
    shiftDay: Math.floor((serviceMs - Date.parse('2026-10-20T00:00:00+07:00')) / 86_400_000) + 1,
    serviceClock: iso.slice(11, 19),
    serviceDate,
    serviceTimestamp: `${iso.slice(0, 19)}+07:00`,
    vehicles: fleet,
    routes: routeFrames,
    activityFeed: recentActivity(elapsed),
    snapshot,
    metrics: snapshot.metrics,
    fleet: {
      totalVehicles: fleet.length,
      movingVehicles: fleet.filter((vehicle) => vehicle.moving).length,
      collectingVehicles: fleet.filter((vehicle) => vehicle.phase === 'collecting').length,
      hubVehicles: fleet.filter((vehicle) => ['unloading', 'processing'].includes(vehicle.phase)).length,
      downstreamVehicles: fleet.filter((vehicle) =>
        ['delivering', 'partner_handoff', 'repositioning'].includes(vehicle.phase),
      ).length,
      onboardAssets: fleet.reduce((sum, vehicle) => sum + vehicle.loadAssets, 0),
      onboardMassKg: Number(fleet.reduce((sum, vehicle) => sum + vehicle.loadKg, 0).toFixed(2)),
      hubAssets: snapshot.assetList.filter((item) => ['received', 'triaged'].includes(item.status)).length,
      completedAssets: snapshot.metrics.completedAssets,
    },
  };
}
