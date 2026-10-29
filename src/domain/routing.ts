import type { Asset, RouteRecord, RouteStop, Vec2 } from './types';
import { world } from './fixtures';

export const distance = (a: Vec2, b: Vec2) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function buildRoadPath(
  positions: readonly Vec2[],
  origin: Vec2 = world.hub.position,
  terminus: Vec2 = origin,
): Vec2[] {
  const path: Vec2[] = [origin];
  for (const target of [...positions, terminus]) {
    const previous = path[path.length - 1];
    if (previous[0] !== target[0]) path.push([target[0], previous[1]]);
    if (path[path.length - 1][1] !== target[1]) path.push([target[0], target[1]]);
  }
  return path;
}
export function pathLength(path: readonly Vec2[]) {
  return path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0);
}
/** Rebuild only when cohort changes: preserve authored geometry and arrival precision otherwise. */
export function filterRoute(
  route: RouteRecord,
  ids: ReadonlySet<string>,
  seed: readonly Asset[],
): RouteRecord | null {
  const assetIds = route.assetIds.filter((id) => ids.has(id));
  if (!assetIds.length) return null;
  if (assetIds.length === route.assetIds.length)
    return {
      ...route,
      assetIds: [...route.assetIds],
      stops: route.stops.map((s) => ({ ...s, assetIds: [...s.assetIds] })),
      path: [...route.path],
    };
  const stops = route.stops
    .map((s) => ({ ...s, assetIds: s.assetIds.filter((id) => ids.has(id)) }))
    .filter((s) => s.assetIds.length);
  const origin = route.path[0] ?? world.hub.position;
  const terminus = route.path.at(-1) ?? origin;
  const path = buildRoadPath(
    stops.map((s) => s.position),
    origin,
    terminus,
  );
  const total = pathLength(path);
  let travelled = 0;
  let previous: Vec2 = origin;
  const revised: RouteStop[] = stops.map((stop) => {
    travelled += Math.abs(stop.position[0] - previous[0]) + Math.abs(stop.position[1] - previous[1]);
    previous = stop.position;
    return {
      ...stop,
      distanceFromStartUnits: travelled,
      arrivalStorySecond: Number(
        (
          route.startStorySecond +
          (total ? travelled / total : 0) * (route.endStorySecond - route.startStorySecond)
        ).toFixed(3),
      ),
    };
  });
  return {
    ...route,
    assetIds,
    stops: revised,
    path,
    distanceKm: total * world.coordinateUnitKm,
    loadKg: seed.filter((a) => ids.has(a.id) && assetIds.includes(a.id)).reduce((n, a) => n + a.massKg, 0),
  };
}
export function filterRoutes(
  routes: readonly RouteRecord[],
  ids: ReadonlySet<string>,
  seed: readonly Asset[],
): RouteRecord[] {
  return routes.map((r) => filterRoute(r, ids, seed)).filter((r): r is RouteRecord => !!r);
}
export function getVehiclePose(
  route: RouteRecord,
  cursor: number,
): { position: Vec2; heading: number; progress: number } {
  const progress = Math.min(
    1,
    Math.max(0, (cursor - route.startStorySecond) / (route.endStorySecond - route.startStorySecond)),
  );
  const total = pathLength(route.path);
  let remaining = total * progress;
  for (let i = 1; i < route.path.length; i++) {
    const a = route.path[i - 1],
      b = route.path[i];
    const length = distance(a, b);
    if (remaining <= length || i === route.path.length - 1) {
      const t = length ? Math.min(1, remaining / length) : 0;
      return {
        position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
        progress,
      };
    }
    remaining -= length;
  }
  return { position: route.path[0] ?? [0, 0], heading: 0, progress };
}
