import { describe, expect, it } from 'vitest';
import { assets as canonicalAssets, events, financialAssumptions } from '../../src/domain/fixtures';
import {
  getOperatingAsset,
  operatingAssetsCsv,
  operatingLedger,
  operatingPeriods,
  selectOperatingPeriod,
} from '../../src/domain/operating-history';
import {
  buildOperatingReportHtml,
  operatingJson,
  operatingSummaryCsv,
} from '../../src/features/impact/operating-report';

const round = (n: number) => Math.round(n * 100) / 100;
describe('authored operating history', () => {
  it('provides ten months, completed prior cohorts and one independent active cohort without changing canonical records', () => {
    expect(operatingPeriods).toHaveLength(11);
    expect(operatingLedger.assets).toHaveLength(2812);
    expect(operatingLedger.batches).toHaveLength(40);
    expect(operatingLedger.batches.filter((b) => b.status === 'active')).toHaveLength(1);
    expect(new Set(operatingLedger.assets.map((a) => a.asset.id)).size).toBe(2812);
    expect(operatingLedger.assets.every((a) => a.serviceDate <= '2026-10-20')).toBe(true);
    expect(
      operatingLedger.assets
        .filter((a) => a.serviceDate < '2026-10-20')
        .every((a) => a.status === 'completed'),
    ).toBe(true);
    expect(operatingLedger.assets.some((a) => a.status === 'collected')).toBe(true);
    expect(canonicalAssets).toHaveLength(48);
    expect(canonicalAssets.every((a) => !a.id.startsWith('JB26-'))).toBe(true);
    expect(events.every((e) => !e.id.startsWith('JB26-'))).toBe(true);
    expect(Object.isFrozen(operatingLedger.assets[0].asset)).toBe(true);
    expect(Object.isFrozen(operatingLedger.batches[0].routes[0])).toBe(true);
  });
  it('uses realistic per-unit category masses and resolves historical passports', () => {
    for (const a of operatingLedger.assets) {
      expect(a.asset.massKg).toBeGreaterThan(0);
      expect(a.asset.massKg).toBeLessThan(60);
      if (a.asset.category === 'phone') expect(a.asset.massKg).toBeLessThan(0.3);
      if (a.asset.category === 'large_appliance') expect(a.asset.massKg).toBeGreaterThan(30);
      expect(getOperatingAsset(a.asset.id)).toBe(a);
    }
    expect(getOperatingAsset('missing')).toBeUndefined();
    expect(
      Object.keys(selectOperatingPeriod().metrics.completedDispositions).filter(
        (k) => selectOperatingPeriod().metrics.completedDispositions[k as 'reuse'] > 0,
      ),
    ).toHaveLength(6);
  });
  it('reconciles annual outcomes, money and mass to its selected monthly records', () => {
    const annual = selectOperatingPeriod('2026');
    expect(selectOperatingPeriod('2026-01').assets).toHaveLength(188);
    expect(selectOperatingPeriod('2026-10').assets).toHaveLength(284);
    expect(selectOperatingPeriod('invalid').period).toBe('2026');
    const additive = [
      'registeredAssets',
      'completedAssets',
      'collectedAssets',
      'recoveredMassKg',
      'collectedMassKg',
      'serviceContractFeeIdr',
      'communityAccessSponsorIdr',
      'grossRecoveredValueIdr',
      'recoveredValueIdr',
      'processingCostIdr',
      'dataClearanceCostIdr',
      'groupedCollectionCostIdr',
      'dedicatedCollectionCostIdr',
      'operatingContributionIdr',
    ] as const;
    for (const key of additive)
      expect(round(annual.months.reduce((sum, x) => sum + x.metrics[key], 0))).toBe(annual.metrics[key]);
    const m = annual.metrics;
    expect(Object.values(m.completedDispositions).reduce((a, b) => a + b, 0)).toBe(m.completedAssets);
    expect(round(Object.values(m.dispositionMassKg).reduce((a, b) => a + b, 0))).toBe(m.recoveredMassKg);
    expect(m.registeredAssets - m.completedAssets).toBe(m.activeAssets);
    expect(m.recoveredValueIdr).toBe(round(m.grossRecoveredValueIdr * 0.2));
    expect(m.revenueIdr).toBe(m.serviceContractFeeIdr + m.communityAccessSponsorIdr + m.recoveredValueIdr);
    expect(m.expensesIdr).toBe(m.groupedCollectionCostIdr + m.processingCostIdr + m.dataClearanceCostIdr);
    expect(m.operatingContributionIdr).toBe(round(m.revenueIdr - m.expensesIdr));
    expect(m.dataClearanceCostIdr).toBe(
      m.dataClearedAssets * financialAssumptions.dataClearanceCostPerAssetIdr,
    );
  });
  it('compares identical collected assets and handling classes within vehicle capacities', () => {
    const annual = selectOperatingPeriod();
    const routeAssets = annual.batches.flatMap((b) => b.routes.flatMap((r) => r.assetIds));
    expect(new Set(routeAssets).size).toBe(annual.metrics.collectedAssets);
    expect(routeAssets.length).toBe(annual.metrics.collectedAssets);
    for (const batch of annual.batches) {
      const dedicatedPairs: string[] = [];
      for (const route of batch.routes) {
        const items = route.assetIds.map((id) => getOperatingAsset(id)!);
        expect(items.every((a) => a.asset.handlingClass === route.handlingClass)).toBe(true);
        const capacity =
          route.handlingClass === 'bulky'
            ? { count: 4, mass: 240 }
            : route.handlingClass === 'specialist'
              ? { count: 6, mass: 30 }
              : { count: 12, mass: 80 };
        expect(items.length).toBeLessThanOrEqual(capacity.count);
        expect(items.reduce((n, a) => n + a.asset.massKg, 0)).toBeLessThanOrEqual(capacity.mass);
        expect(route.distanceKm).toBeLessThanOrEqual(route.dedicatedDistanceKm);
        dedicatedPairs.push(...route.householdIds.map((h) => `${h}/${route.handlingClass}`));
      }
      expect(new Set(dedicatedPairs).size).toBe(dedicatedPairs.length);
    }
    expect(annual.metrics.costReductionPercent).toBeGreaterThan(20);
    expect(annual.metrics.distanceReductionPercent).toBeGreaterThan(20);
  });
  it('keeps authored provenance and input-mass definitions attached to every exported format', () => {
    const view = selectOperatingPeriod('2026-01');
    const json = JSON.parse(operatingJson(view));
    expect(json.sourceStatus).toBe('authored_scenario_not_field_results');
    expect(json.massDefinition).toContain('input-device mass');
    const assets = operatingAssetsCsv(view.assets).split('\n');
    expect(assets[0]).toContain('source_status');
    expect(assets.slice(1).every((row) => row.includes('authored_scenario_not_field_results'))).toBe(true);
    const summary = operatingSummaryCsv(view).split('\n');
    expect(summary[0]).toContain('source_status');
    expect(summary[1]).toContain('authored_scenario_not_field_results');
    const report = buildOperatingReportHtml(view, 'en');
    expect(report).toContain('Illustrative scenario');
    expect(report).toContain('not observed field results');
    expect(report).toContain('input-device mass');
    expect(report).toContain('Mass of devices with completed disposition');
    expect(report).not.toContain('Completed recovery mass');
    expect(buildOperatingReportHtml(view, 'id')).toContain('Skenario ilustratif');
    // The compatible field describes the full input mass of all completed device pathways.
    const inputMass = round(
      view.assets
        .filter((item) => item.status === 'completed')
        .reduce((sum, item) => sum + item.asset.massKg, 0),
    );
    expect(view.metrics.recoveredMassKg).toBe(inputMass);
  });
  it('exports selected period records, outcomes, financial inputs and a matching printable report', () => {
    const view = selectOperatingPeriod('2026-01');
    const json = JSON.parse(operatingJson(view));
    expect(json.period).toBe('2026-01');
    expect(json.assets).toHaveLength(188);
    expect(json.assets.every((a: { serviceDate: string }) => a.serviceDate.startsWith('2026-01'))).toBe(true);
    expect(json.metrics).toEqual(view.metrics);
    expect(operatingAssetsCsv(view.assets).split('\n')).toHaveLength(189);
    expect(operatingSummaryCsv(view).split('\n')).toHaveLength(2);
    const report = buildOperatingReportHtml(view, 'en');
    expect(report).toContain('2026-01');
    expect(report).toContain('188');
    expect(report).toContain('20%');
    expect(report).toContain('Print / Save PDF');
    expect(report).toContain('Monthly breakdown');
    expect(report).not.toContain('JB-A001');
  });
});
