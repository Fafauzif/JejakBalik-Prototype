import {
  assets,
  requests,
  routes,
  events,
  partners,
  financialAssumptions,
  scenarioPlanOverrides,
} from './fixtures';
import type { DerivationContext, ScenarioId, RouteRecord, StoryEvent } from './types';
export function canonicalContext(scenarioId: ScenarioId = 'circular_day'): DerivationContext {
  const override = scenarioId === 'capacity_shift' ? scenarioPlanOverrides.capacity_shift : null;
  const deferred = new Set(override?.deferredRequestIds ?? []);
  const activeRoutes = routes.map(
    (route) => (override?.routeOverrides.find((r) => r.id === route.id) ?? route) as RouteRecord,
  );
  const eventOverrides = events
    .filter((e) => override?.eventOverrides.some((o) => o.assetId === e.assetId && o.kind === e.kind))
    .map((e) => ({
      ...e,
      atSecond: override!.eventOverrides.find((o) => o.assetId === e.assetId && o.kind === e.kind)!.atSecond,
    })) as StoryEvent[];
  return {
    batchId: 'canonical',
    windowId: '2026-10-19',
    serviceDate: '2026-10-19',
    seed: assets,
    requests,
    activeRoutes,
    eventOverrides,
    events,
    eligibleAssetIds: assets.filter((a) => !deferred.has(a.requestId)).map((a) => a.id),
    destinationCapacity: Object.fromEntries(partners.map((p) => [p.id, p.capacityAssets])),
    funding: {
      serviceContractFeeIdr: financialAssumptions.serviceContractFeeIdr,
      communityAccessSponsorIdr: financialAssumptions.communityAccessSponsorIdr,
    },
    gates: ['hero', 'specialist', 'data'],
  };
}
