import { financialAssumptions as f, vehicles as fixtureVehicles, world } from './fixtures';
import type { Snapshot, RouteRecord, Vehicle, Metrics, Disposition } from './types';
import { filterRoutes } from './routing';
const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);
const percent = (n: number, d: number) => (d ? (100 * n) / d : null);
const round = (n: number, d = 3) => Number(n.toFixed(d));
export function computeMetrics(
  snapshot: Snapshot,
  routePlan: readonly RouteRecord[] = snapshot.context.activeRoutes,
  vehicles: readonly Vehicle[] = fixtureVehicles,
): Metrics {
  const submitted = snapshot.assetList.filter((s) =>
    snapshot.submittedRequestIds.includes(s.asset.requestId),
  );
  const collected = submitted.filter((s) =>
    ['collected', 'received', 'triaged', 'routed', 'completed'].includes(s.status),
  );
  const completed = collected.filter((s) => s.status === 'completed');
  const selected = new Set(collected.map((s) => s.asset.id));
  const actualRoutes = filterRoutes(routePlan, selected, snapshot.context.seed);
  const completedDispositions: Record<Disposition, number> = {
    reuse: 0,
    repair: 0,
    refurbishment: 0,
    parts: 0,
    material: 0,
    specialist: 0,
  };
  completed.forEach((s) => completedDispositions[s.asset.plannedDisposition]++);
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const groupedDistanceKm = sum(actualRoutes.map((r) => r.distanceKm));
  const groupedCollectionCostIdr = sum(
    actualRoutes.map((r) => {
      const v = vehicleById.get(r.vehicleId)!;
      return r.distanceKm * v.ratePerKmIdr + v.dispatchFeeIdr;
    }),
  );
  const dedicated = new Map<string, { distance: number; cost: number }>();
  for (const route of actualRoutes) {
    const v = vehicleById.get(route.vehicleId)!;
    for (const stop of route.stops) {
      const key = `${stop.householdId}/${route.handlingClass}`;
      if (dedicated.has(key)) continue;
      const km =
        2 *
        (Math.abs(stop.position[0] - world.hub.position[0]) +
          Math.abs(stop.position[1] - world.hub.position[1])) *
        world.coordinateUnitKm;
      dedicated.set(key, { distance: km, cost: km * v.ratePerKmIdr + v.dispatchFeeIdr });
    }
  }
  const dedicatedDistanceKm = sum([...dedicated.values()].map((d) => d.distance));
  const dedicatedCollectionCostIdr = sum([...dedicated.values()].map((d) => d.cost));
  const grossRecoveredValueIdr = sum(
    completed.map((s) =>
      s.asset.plannedDisposition === 'material'
        ? s.asset.massKg * f.materialValuePerKgIdr
        : s.asset.baseRecoveredValueIdr * f.recoveredValueMultiplier[s.asset.plannedDisposition],
    ),
  );
  const recoveredValueIdr = grossRecoveredValueIdr * f.platformRecoveredValueShare;
  const processingCostIdr = sum(
    completed.map((s) => f.processingCostPerAssetIdr[s.asset.plannedDisposition]),
  );
  const dataClearedAssets = collected.filter((s) => s.dataCleared).length;
  const dataClearanceCostIdr = dataClearedAssets * f.dataClearanceCostPerAssetIdr;
  const valueRetainedAssets =
    completedDispositions.reuse + completedDispositions.repair + completedDispositions.refurbishment;
  const collectedMassKg = round(sum(collected.map((s) => s.asset.massKg)), 2);
  const eligible = submitted.filter((s) => !s.deferred);
  return {
    requests: snapshot.submittedRequestIds.length,
    batchAssets: submitted.length,
    windowEligibleAssets: eligible.length,
    householdsServed: new Set(collected.map((s) => s.asset.householdId)).size,
    collectedAssets: collected.length,
    completedAssets: completed.length,
    collectedMassKg,
    massKg: collectedMassKg,
    assets: submitted.length,
    completedDispositions,
    dispositions: completedDispositions,
    dataBearingAssets: submitted.filter((s) => s.asset.dataBearing).length,
    collectedDataBearingAssets: collected.filter((s) => s.asset.dataBearing).length,
    dataClearedAssets,
    valueRetainedAssets,
    valueRetentionPercent: percent(valueRetainedAssets, completed.length),
    groupedRouteSegments: actualRoutes.length,
    vehicles: new Set(actualRoutes.map((r) => r.vehicleId)).size,
    groupedDistanceKm: round(groupedDistanceKm),
    groupedCollectionCostIdr: Math.round(groupedCollectionCostIdr),
    dedicatedTrips: dedicated.size,
    dedicatedDistanceKm: round(dedicatedDistanceKm),
    dedicatedCollectionCostIdr: Math.round(dedicatedCollectionCostIdr),
    grossRecoveredValueIdr: Math.round(grossRecoveredValueIdr),
    platformRecoveredValueShare: f.platformRecoveredValueShare,
    recoveredValueIdr: Math.round(recoveredValueIdr),
    processingCostIdr,
    dataClearanceCostIdr,
    ...snapshot.context.funding,
    batchOperatingContributionIdr: Math.round(
      snapshot.context.funding.serviceContractFeeIdr +
        snapshot.context.funding.communityAccessSponsorIdr +
        recoveredValueIdr -
        groupedCollectionCostIdr -
        processingCostIdr -
        dataClearanceCostIdr,
    ),
    collectionCoveragePercent: percent(collected.length, submitted.length),
    currentWindowFulfillmentPercent: percent(collected.length, eligible.length),
    custodyCompletionCollectedPercent: percent(completed.length, collected.length),
    distanceReductionPercent: percent(dedicatedDistanceKm - groupedDistanceKm, dedicatedDistanceKm),
    collectionCostReductionPercent: percent(
      dedicatedCollectionCostIdr - groupedCollectionCostIdr,
      dedicatedCollectionCostIdr,
    ),
    deferredAssets: submitted.filter((s) => s.deferred).length,
    heldUncollected: submitted.filter((s) => s.held && !selected.has(s.asset.id)).length,
    heldAtHub: collected.filter((s) => s.held).length,
  };
}
