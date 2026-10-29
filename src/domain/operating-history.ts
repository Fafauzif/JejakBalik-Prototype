import { explorationTemplates, financialAssumptions } from './fixtures';
import { encodeCsv } from './persistence';
import type { Asset, AssetSnapshot, AssetStatus, Disposition, HandlingClass, StoryEvent } from './types';

export const OPERATING_SOURCE_STATUS = 'authored_scenario_not_field_results';
export const OPERATING_MASS_DEFINITION =
  'Full input-device mass for completed dispositions; not recovered material output or yield.';

/** Immutable authored operating history. Provenance and accounting boundary: docs/OPERATING_HISTORY.md. */
export interface OperatingAsset extends AssetSnapshot {
  source: 'history';
  batchId: string;
  serviceDate: string;
  collectionDate: string | null;
  completedDate: string | null;
  addressAlias: string;
}
export interface OperatingRoute {
  id: string;
  assetIds: string[];
  householdIds: string[];
  handlingClass: HandlingClass;
  distanceKm: number;
  dedicatedDistanceKm: number;
  dedicatedTrips: number;
  ratePerKmIdr: number;
  dispatchFeeIdr: number;
}
export interface OperatingBatch {
  id: string;
  serviceDate: string;
  status: 'completed' | 'active';
  assetIds: string[];
  routes: OperatingRoute[];
  funding: { serviceContractFeeIdr: number; communityAccessSponsorIdr: number };
}
export interface OperatingMetrics {
  registeredAssets: number;
  collectedAssets: number;
  completedAssets: number;
  activeAssets: number;
  householdsServed: number;
  collectedMassKg: number;
  recoveredMassKg: number;
  dataBearingAssets: number;
  dataClearedAssets: number;
  valueRetainedAssets: number;
  completedDispositions: Record<Disposition, number>;
  dispositionMassKg: Record<Disposition, number>;
  groupedRoutes: number;
  groupedDistanceKm: number;
  dedicatedTrips: number;
  dedicatedDistanceKm: number;
  groupedCollectionCostIdr: number;
  dedicatedCollectionCostIdr: number;
  grossRecoveredValueIdr: number;
  recoveredValueIdr: number;
  processingCostIdr: number;
  dataClearanceCostIdr: number;
  serviceContractFeeIdr: number;
  communityAccessSponsorIdr: number;
  revenueIdr: number;
  expensesIdr: number;
  operatingContributionIdr: number;
  distanceReductionPercent: number;
  costReductionPercent: number;
}
const round = (n: number) => Math.round(n * 100) / 100;
const dispositions: Disposition[] = ['reuse', 'repair', 'refurbishment', 'parts', 'material', 'specialist'];
const zeroDispositions = () =>
  Object.fromEntries(dispositions.map((d) => [d, 0])) as Record<Disposition, number>;
const collectedStates = new Set<AssetStatus>(['collected', 'received', 'triaged', 'routed', 'completed']);
const monthlyCounts = [188, 216, 240, 252, 276, 304, 328, 348, 376, 284];
const categoryMix = [
  'phone',
  'small_appliance',
  'laptop',
  'accessories',
  'monitor',
  'phone',
  'printer',
  'tablet',
  'large_appliance',
  'router',
  'battery',
  'small_appliance',
];
const conditions = [
  'functional',
  'repairable',
  'worn',
  'parts_only',
  'nonfunctional',
  'functional',
  'worn',
  'repairable',
  'nonfunctional',
  'parts_only',
];
const districts = ['Tebet', 'Pancoran', 'Setiabudi', 'Mampang', 'Pasar Minggu', 'Kebayoran'];
const classSettings = {
  ordinary: { count: 12, mass: 80, rate: 4500, dispatch: 25000 },
  bulky: { count: 4, mass: 240, rate: 6500, dispatch: 45000 },
  specialist: { count: 6, mass: 30, rate: 6000, dispatch: 50000 },
};
const distance = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const position = (householdId: string): number[] => {
  const n = Number(householdId.split('-').at(-1)?.replace('H', ''));
  return [1.4 + (n % 7) * 0.55, 1.1 + (Math.floor(n / 7) % 6) * 0.65];
};
function buildRoutes(items: OperatingAsset[], batchId: string): OperatingRoute[] {
  const result: OperatingRoute[] = [];
  for (const handlingClass of ['ordinary', 'bulky', 'specialist'] as HandlingClass[]) {
    const settings = classSettings[handlingClass];
    const eligible = items.filter(
      (a) => a.asset.handlingClass === handlingClass && collectedStates.has(a.status),
    );
    let group: OperatingAsset[] = [];
    function finish() {
      if (!group.length) return;
      const householdIds = [...new Set(group.map((a) => a.asset.householdId))];
      const hub = [0, 0];
      let prev = hub,
        km = 0;
      for (const household of householdIds) {
        const next = position(household);
        km += distance(prev, next);
        prev = next;
      }
      km += distance(prev, hub);
      const id = `${batchId}-${handlingClass}-${result.length + 1}`;
      group.forEach((a) => {
        a.asset.routeId = id;
      });
      result.push({
        id,
        handlingClass,
        assetIds: group.map((a) => a.asset.id),
        householdIds,
        distanceKm: round(km),
        dedicatedDistanceKm: round(householdIds.reduce((sum, h) => sum + 2 * distance(hub, position(h)), 0)),
        dedicatedTrips: householdIds.length,
        ratePerKmIdr: settings.rate,
        dispatchFeeIdr: settings.dispatch,
      });
      group = [];
    }
    const householdGroups = new Map<string, OperatingAsset[]>();
    for (const item of eligible)
      householdGroups.set(item.asset.householdId, [
        ...(householdGroups.get(item.asset.householdId) || []),
        item,
      ]);
    for (const householdItems of householdGroups.values()) {
      const householdMass = householdItems.reduce((n, item) => n + item.asset.massKg, 0);
      if (
        group.length &&
        (group.length + householdItems.length > settings.count ||
          group.reduce((sum, a) => sum + a.asset.massKg, 0) + householdMass > settings.mass)
      )
        finish();
      group.push(...householdItems);
    }
    finish();
  }
  return result;
}
function buildHistory() {
  const assets: OperatingAsset[] = [],
    batches: OperatingBatch[] = [];
  monthlyCounts.forEach((count, monthIndex) => {
    const month = String(monthIndex + 1).padStart(2, '0');
    let localIndex = 0;
    for (let cohort = 0; cohort < 4; cohort++) {
      const size = Math.floor(count / 4) + (cohort < count % 4 ? 1 : 0);
      const active = monthIndex === 9 && cohort === 3;
      const day = monthIndex === 9 ? [3, 8, 13, 20][cohort] : [3, 10, 17, 24][cohort];
      const serviceDate = `2026-${month}-${String(day).padStart(2, '0')}`;
      const batchId = `JB26-${month}-B${cohort + 1}`;
      const batchAssets: OperatingAsset[] = [];
      for (let i = 0; i < size; i++, localIndex++) {
        const serial = localIndex + 1;
        const n = monthIndex * 47 + localIndex;
        const category = categoryMix[n % categoryMix.length];
        const template = explorationTemplates.templates.find((t) => t.category === category)!;
        const conditionKeys = Object.keys(template.conditionToDisposition);
        const condition = conditionKeys.includes(conditions[(n * 3 + cohort) % conditions.length])
          ? conditions[(n * 3 + cohort) % conditions.length]
          : conditionKeys[n % conditionKeys.length];
        const disposition = template.conditionToDisposition[condition];
        const status: AssetStatus =
          !active || i < 12
            ? 'completed'
            : i < 24
              ? 'routed'
              : i < 36
                ? 'received'
                : i < 48
                  ? 'collected'
                  : i < 60
                    ? 'assigned'
                    : 'scheduled';
        const held = active && (i === 26 || i === 31);
        const householdId = `JB26-${month}-H${String(cohort * 100 + Math.floor(i / 2) + 1).padStart(3, '0')}`;
        const id = `JB26-${month}-${String(serial).padStart(5, '0')}`;
        const asset: Asset = {
          id,
          householdId,
          requestId: householdId.replace('-H', '-R'),
          category,
          catalogVariant: n % 3,
          massKg: round(template.massKg * [0.88, 1, 1.08, 1.18][n % 4]),
          baseRecoveredValueIdr: Math.round(template.baseRecoveredValueIdr * [0.8, 1, 1.1][n % 3]),
          components: [...template.components],
          plannedDisposition: disposition,
          dataBearing: template.dataBearing,
          batteryRisk: category === 'battery' ? (condition === 'damaged' ? 'damaged' : 'specialist') : 'none',
          handlingClass: template.handlingClass,
          condition,
          destinationId: template.destinationByDisposition[disposition],
          initialStatus: 'requested',
          scenarioRecordId: 'operating-history-2026',
          routeId: '',
          collectionStorySecond: 0,
          receivedStorySecond: 0,
        };
        const dataCleared = asset.dataBearing && (status === 'completed' || status === 'routed') && !held;
        const kinds = ['requested', 'collected', 'received', 'triaged', 'routed', 'completed'];
        const end = status === 'assigned' || status === 'scheduled' ? 1 : kinds.indexOf(status) + 1;
        const custodyEvents: StoryEvent[] = kinds.slice(0, Math.max(1, end)).map((kind, index) => ({
          id: `${id}-E${index + 1}`,
          atSecond: index * 60,
          kind,
          assetId: id,
          guard: null,
          payload: { serviceDate, batchId },
        }));
        batchAssets.push({
          source: 'history',
          batchId,
          serviceDate,
          collectionDate: collectedStates.has(status) ? serviceDate : null,
          completedDate: status === 'completed' ? serviceDate : null,
          addressAlias: `${districts[(n + cohort) % districts.length]} · ${householdId}`,
          asset,
          status,
          held,
          holdReason: held ? (asset.dataBearing ? 'data' : 'safety') : null,
          deferred: false,
          dataCleared,
          custodyEventIds: custodyEvents.map((e) => e.id),
          custodyEvents,
        });
      }
      const routes = buildRoutes(batchAssets, batchId);
      batches.push({
        id: batchId,
        serviceDate,
        status: active ? 'active' : 'completed',
        assetIds: batchAssets.map((a) => a.asset.id),
        routes,
        funding: {
          serviceContractFeeIdr: 500000 + size * 13000,
          communityAccessSponsorIdr: 180000 + Math.floor(size / 10) * 20000,
        },
      });
      assets.push(...batchAssets);
    }
  });
  return { assets, batches, asOf: '2026-10-20', startedAt: '2026-01-03' };
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(deepFreeze);
  }
  return value;
}
export const operatingLedger = deepFreeze(buildHistory());
export const operatingPeriods = [
  '2026',
  ...monthlyCounts.map((_, i) => `2026-${String(i + 1).padStart(2, '0')}`),
];
const assetIndex = new Map(operatingLedger.assets.map((a) => [a.asset.id, a]));
export const getOperatingAsset = (id: string) => assetIndex.get(id);
export function operatingMetrics(assets: OperatingAsset[], batches: OperatingBatch[]): OperatingMetrics {
  const completed = assets.filter((a) => a.status === 'completed');
  const collected = assets.filter((a) => collectedStates.has(a.status));
  const completedDispositions = zeroDispositions(),
    dispositionMassKg = zeroDispositions();
  let grossRecoveredValueIdr = 0,
    processingCostIdr = 0;
  for (const { asset } of completed) {
    const d = asset.plannedDisposition;
    completedDispositions[d]++;
    dispositionMassKg[d] += asset.massKg;
    grossRecoveredValueIdr +=
      d === 'material'
        ? asset.massKg * financialAssumptions.materialValuePerKgIdr
        : asset.baseRecoveredValueIdr * financialAssumptions.recoveredValueMultiplier[d];
    processingCostIdr += financialAssumptions.processingCostPerAssetIdr[d];
  }
  for (const d of dispositions) dispositionMassKg[d] = round(dispositionMassKg[d]);
  const routes = batches.flatMap((b) => b.routes);
  const sum = (fn: (r: OperatingRoute) => number) => round(routes.reduce((n, r) => n + fn(r), 0));
  const groupedDistanceKm = sum((r) => r.distanceKm),
    dedicatedDistanceKm = sum((r) => r.dedicatedDistanceKm);
  const groupedCollectionCostIdr = sum((r) => r.distanceKm * r.ratePerKmIdr + r.dispatchFeeIdr);
  const dedicatedCollectionCostIdr = sum(
    (r) => r.dedicatedDistanceKm * r.ratePerKmIdr + r.dedicatedTrips * r.dispatchFeeIdr,
  );
  const dataClearedAssets = assets.filter((a) => a.dataCleared).length;
  const recoveredValueIdr = round(grossRecoveredValueIdr * financialAssumptions.platformRecoveredValueShare);
  const dataClearanceCostIdr = dataClearedAssets * financialAssumptions.dataClearanceCostPerAssetIdr;
  const serviceContractFeeIdr = batches.reduce((n, b) => n + b.funding.serviceContractFeeIdr, 0);
  const communityAccessSponsorIdr = batches.reduce((n, b) => n + b.funding.communityAccessSponsorIdr, 0);
  const revenueIdr = serviceContractFeeIdr + communityAccessSponsorIdr + recoveredValueIdr;
  const expensesIdr = groupedCollectionCostIdr + processingCostIdr + dataClearanceCostIdr;
  return {
    registeredAssets: assets.length,
    collectedAssets: collected.length,
    completedAssets: completed.length,
    activeAssets: assets.length - completed.length,
    householdsServed: new Set(collected.map((a) => a.asset.householdId)).size,
    collectedMassKg: round(collected.reduce((n, a) => n + a.asset.massKg, 0)),
    recoveredMassKg: round(completed.reduce((n, a) => n + a.asset.massKg, 0)),
    dataBearingAssets: assets.filter((a) => a.asset.dataBearing).length,
    dataClearedAssets,
    valueRetainedAssets:
      completedDispositions.reuse + completedDispositions.repair + completedDispositions.refurbishment,
    completedDispositions,
    dispositionMassKg,
    groupedRoutes: routes.length,
    groupedDistanceKm,
    dedicatedTrips: sum((r) => r.dedicatedTrips),
    dedicatedDistanceKm,
    groupedCollectionCostIdr,
    dedicatedCollectionCostIdr,
    grossRecoveredValueIdr: round(grossRecoveredValueIdr),
    recoveredValueIdr,
    processingCostIdr,
    dataClearanceCostIdr,
    serviceContractFeeIdr,
    communityAccessSponsorIdr,
    revenueIdr: round(revenueIdr),
    expensesIdr: round(expensesIdr),
    operatingContributionIdr: round(revenueIdr - expensesIdr),
    distanceReductionPercent: dedicatedDistanceKm ? (1 - groupedDistanceKm / dedicatedDistanceKm) * 100 : 0,
    costReductionPercent: dedicatedCollectionCostIdr
      ? (1 - groupedCollectionCostIdr / dedicatedCollectionCostIdr) * 100
      : 0,
  };
}
export function selectOperatingPeriod(rawPeriod = '2026') {
  const period = operatingPeriods.includes(rawPeriod) ? rawPeriod : '2026';
  const assets = operatingLedger.assets.filter((a) => a.serviceDate.startsWith(period));
  const batches = operatingLedger.batches.filter((b) => b.serviceDate.startsWith(period));
  const months = operatingPeriods
    .slice(1)
    .filter((p) => p.startsWith(period))
    .map((p) => ({
      period: p,
      metrics: operatingMetrics(
        assets.filter((a) => a.serviceDate.startsWith(p)),
        batches.filter((b) => b.serviceDate.startsWith(p)),
      ),
    }));
  return {
    period,
    assets,
    batches,
    metrics: operatingMetrics(assets, batches),
    months,
    asOf: operatingLedger.asOf,
  };
}
export function operatingAssetsCsv(assets: OperatingAsset[]) {
  return encodeCsv([
    [
      'asset_id',
      'batch_id',
      'service_date',
      'request_id',
      'category',
      'mass_kg',
      'status',
      'held',
      'planned_outcome',
      'final_outcome',
      'data_bearing',
      'data_cleared',
      'destination',
      'source_status',
    ],
    ...assets.map((a) => [
      a.asset.id,
      a.batchId,
      a.serviceDate,
      a.asset.requestId,
      a.asset.category,
      a.asset.massKg,
      a.status,
      a.held,
      a.asset.plannedDisposition,
      a.status === 'completed' ? a.asset.plannedDisposition : '',
      a.asset.dataBearing,
      a.dataCleared,
      a.asset.destinationId,
      OPERATING_SOURCE_STATUS,
    ]),
  ]);
}
