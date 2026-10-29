import { describe, expect, it } from 'vitest';
import { assets, events, partners, requests, routes, vehicles, world } from '../../src/domain/fixtures';
import { getLiveVehicleProfile, liveVehicleProfiles } from '../../src/domain/partner-logistics';
import { computeMetrics } from '../../src/domain/metrics';
import { deriveSnapshot } from '../../src/domain/engine';
import { canonicalContext } from '../../src/domain/context';
import { filterRoute } from '../../src/domain/routing';
import {
  getLiveOperationsFrame,
  getLiveSnapshot,
  getLiveVehiclePose,
  liveRoadPaths,
  liveRoutes,
  LIVE_PERIOD,
  LIVE_PHASE_LABELS,
} from '../../src/domain/live-operations';

const separation = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('continuous operational cadence', () => {
  it('opens mid-shift with all six actual vehicles, all seven authored routes and a registered rolling cohort', () => {
    const frame = getLiveOperationsFrame(0);
    expect(frame.vehicles.map((pose) => pose.vehicleId)).toEqual(vehicles.map((v) => v.id));
    expect(frame.routes.map((route) => route.routeId)).toEqual(routes.map((r) => r.id));
    expect(frame.vehicles.filter((pose) => pose.moving).length).toBeGreaterThanOrEqual(3);
    expect(new Set(frame.vehicles.map((pose) => pose.position.join(','))).size).toBe(6);
    expect(frame.snapshot.metrics.batchAssets).toBe(48);
    expect(frame.snapshot.metrics.requests).toBe(36);
    expect(frame.fleet.hubAssets).toBeGreaterThan(0);
    expect(frame.snapshot.pendingCheckpoint).toBeNull();
    expect(frame.snapshot.decisions).toEqual([]);
    expect(frame.snapshot.context.gates).toEqual([]);
    expect(frame.activityFeed.length).toBe(8);
    expect(frame.serviceClock).toBe('09:20:00');
  });

  it('keeps moving beyond the old 180-second ending and continuously crosses each vehicle cadence seam', () => {
    const start = getLiveOperationsFrame(0);
    for (const vehicle of start.vehicles) {
      const samples = Array.from({ length: 721 }, (_, i) => getLiveVehiclePose(vehicle.vehicleId, i)!);
      expect(
        new Set(samples.map((pose) => pose.position.map((n) => n.toFixed(2)).join(','))).size,
      ).toBeGreaterThan(20);
      expect(samples.some((pose) => pose.phase === 'collecting')).toBe(true);
      expect(samples.some((pose) => pose.phase === 'unloading')).toBe(true);
      expect(samples.some((pose) => pose.phase === 'delivering')).toBe(true);
      // A cadence boundary returns to this operator's real origin without teleporting.
      const offset = vehicle.progress * LIVE_PERIOD;
      const boundary = LIVE_PERIOD - offset;
      const before = getLiveVehiclePose(vehicle.vehicleId, boundary - 0.001)!;
      const after = getLiveVehiclePose(vehicle.vehicleId, boundary + 0.001)!;
      expect(separation(before.position, after.position)).toBeLessThan(0.02);
      expect(separation(after.position, vehicle.profile.origin.position)).toBeLessThan(0.02);
      expect(after.round).toBe(before.round + 1);
      const latePositions = Array.from(
        { length: 60 },
        (_, i) => getLiveVehiclePose(vehicle.vehicleId, 180 + LIVE_PERIOD * 10 + i)!.position,
      );
      expect(new Set(latePositions.map((p) => p.join(','))).size).toBeGreaterThan(5);
    }
  });

  it('starts from six partner or neighborhood origins and keeps canonical tutorial routes intact', () => {
    expect(liveVehicleProfiles.map((profile) => profile.id)).toEqual(vehicles.map((vehicle) => vehicle.id));
    expect(new Set(liveVehicleProfiles.map((profile) => profile.visualKind)).size).toBe(6);
    expect(new Set(liveVehicleProfiles.map((profile) => profile.origin.position.join(','))).size).toBe(6);
    for (const profile of liveVehicleProfiles) {
      expect(getLiveVehicleProfile(profile.id)).toBe(profile);
      expect(separation(profile.origin.position, world.hub.position)).toBeGreaterThan(0);
      expect(
        profile.origin.kind === 'partner_depot'
          ? partners.some((partner) => partner.fictional && partner.id === profile.origin.id)
          : world.households.some((household) => household.id === profile.origin.id),
      ).toBe(true);
      for (const route of liveRoutes.filter((item) => item.vehicleId === profile.id)) {
        expect(route.path[0]).toEqual(profile.origin.position);
        expect(route.path.at(-1)).toEqual(world.hub.position);
        expect(route.stops.map((stop) => stop.householdId)).toEqual(
          routes.find((item) => item.id === route.id)!.stops.map((stop) => stop.householdId),
        );
        const partial = filterRoute(route, new Set([route.assetIds[0]]), assets)!;
        expect(partial.path[0]).toEqual(profile.origin.position);
        expect(partial.path.at(-1)).toEqual(world.hub.position);
      }
    }
    expect(routes.every((route) => separation(route.path[0], world.hub.position) === 0)).toBe(true);
  });

  it('finishes ordinary delivery before compatible recovery pickup and never loads forward parcels at the hub', () => {
    for (const profile of liveVehicleProfiles) {
      const initial = getLiveVehiclePose(profile.id, 0)!;
      const boundary = LIVE_PERIOD - initial.progress * LIVE_PERIOD;
      const samples = Array.from({ length: LIVE_PERIOD * 4 }, (_, i) =>
        getLiveVehiclePose(profile.id, boundary + i / 4 + 0.001)!,
      );
      const deliveryIndex = samples.findIndex((pose) => pose.phase === 'delivery_stop');
      const pickupIndex = samples.findIndex((pose) => pose.phase === 'collecting');
      expect(pickupIndex).toBeGreaterThanOrEqual(0);
      if (profile.carriesOrdinaryDeliveries) {
        expect(deliveryIndex).toBeGreaterThanOrEqual(0);
        expect(deliveryIndex).toBeLessThan(pickupIndex);
        expect(samples.some((pose) => pose.forwardLoadUnits > 0)).toBe(true);
      } else {
        expect(deliveryIndex).toBe(-1);
        expect(samples.every((pose) => pose.forwardLoadUnits === 0)).toBe(true);
      }
      for (const pose of samples) {
        if (pose.forwardLoadUnits) {
          expect(['dispatching', 'delivery_outbound', 'delivery_stop']).toContain(pose.phase);
          expect(pose.loadAssets).toBe(0);
          expect(pose.loadKg).toBe(0);
          expect(separation(pose.position, world.hub.position)).toBeGreaterThan(0);
        }
        if (pose.phase === 'delivering') {
          expect(pose.forwardLoadUnits).toBe(0);
          expect(pose.loadAssets).toBeGreaterThan(0);
          expect(partners.some((partner) => partner.id === pose.targetId)).toBe(true);
        }
      }
    }
  });

  it('reconciles every vehicle load with exact recovery-asset custody across all phases and cadence seams', () => {
    const completedIds = new Set<string>();
    for (let second = 0; second <= LIVE_PERIOD * 2; second += 1) {
      const frame = getLiveOperationsFrame(second);
      for (const item of frame.snapshot.assetList)
        if (item.status === 'completed') completedIds.add(item.asset.id);
      for (const pose of frame.vehicles) {
        const expected = frame.snapshot.assetList
          .filter(
            (item) => item.asset.routeId === pose.routeId && ['collected', 'routed'].includes(item.status),
          )
          .map((item) => item.asset.id)
          .sort();
        expect([...pose.loadAssetIds].sort()).toEqual(expected);
        expect(pose.loadAssets).toBe(pose.loadAssetIds.length);
        expect(pose.loadKg).toBeCloseTo(
          pose.loadAssetIds.reduce((sum, id) => sum + frame.snapshot.assets[id].asset.massKg, 0),
          2,
        );
        if (['unloading', 'processing'].includes(pose.phase))
          expect(pose.position).toEqual(world.hub.position);
        if (pose.phase === 'dispatching') expect(pose.position).toEqual(pose.profile.origin.position);
      }
    }
    expect([...completedIds].sort()).toEqual(assets.map((asset) => asset.id).sort());
  });

  it('never jumps across roads at intermediate travel and stop boundaries', () => {
    for (const vehicle of vehicles) {
      let previous = getLiveVehiclePose(vehicle.id, 0)!;
      for (let second = 0.5; second <= LIVE_PERIOD; second += 0.5) {
        const pose = getLiveVehiclePose(vehicle.id, second)!;
        expect(separation(previous.position, pose.position)).toBeLessThan(3);
        expect(Number.isFinite(pose.heading)).toBe(true);
        expect(pose.progress).toBeGreaterThanOrEqual(0);
        expect(pose.progress).toBeLessThan(1);
        expect(pose.loadAssets).toBeGreaterThanOrEqual(0);
        expect(pose.loadAssets).toBeLessThanOrEqual(vehicle.capacityAssets);
        expect(pose.loadKg).toBeLessThanOrEqual(vehicle.capacityKg);
        previous = pose;
      }
    }
    expect(liveRoadPaths.every((path) => path.length > 1)).toBe(true);
  });

  it('crosses every dispatch, stop, hub, handoff, depot and multi-run seam continuously', () => {
    const key = (vehicleId: string, second: number) => {
      const pose = getLiveVehiclePose(vehicleId, second)!;
      return `${pose.routeId}/${pose.phase}/${pose.targetId}/${pose.moving}/${pose.loadAssetIds.join(',')}/${pose.forwardLoadUnits}`;
    };
    for (const vehicle of vehicles) {
      let previousKey = key(vehicle.id, 0);
      let transitions = 0;
      for (let tick = 1; tick <= LIVE_PERIOD * 20; tick++) {
        const second = tick / 20;
        const currentKey = key(vehicle.id, second);
        if (currentKey === previousKey) continue;
        let low = second - 0.05;
        let high = second;
        for (let iteration = 0; iteration < 30; iteration++) {
          const mid = (low + high) / 2;
          if (key(vehicle.id, mid) === previousKey) low = mid;
          else high = mid;
        }
        const before = getLiveVehiclePose(vehicle.id, low - 0.000001)!;
        const after = getLiveVehiclePose(vehicle.id, high + 0.000001)!;
        expect(separation(before.position, after.position)).toBeLessThan(0.0001);
        for (const at of [low - 0.000001, high + 0.000001]) {
          const frame = getLiveOperationsFrame(at);
          const pose = frame.vehicles.find((item) => item.vehicleId === vehicle.id)!;
          const expectedIds = frame.snapshot.assetList
            .filter(
              (item) => item.asset.routeId === pose.routeId && ['collected', 'routed'].includes(item.status),
            )
            .map((item) => item.asset.id)
            .sort();
          expect([...pose.loadAssetIds].sort()).toEqual(expectedIds);
        }
        transitions++;
        previousKey = currentKey;
      }
      expect(transitions).toBeGreaterThan(10);
    }
  });

  it('derives all snapshot metrics and hub work from the exact same bounded observational cohort', () => {
    for (let second = 0; second < LIVE_PERIOD * 2; second += 7) {
      const frame = getLiveOperationsFrame(second);
      const snapshot = frame.snapshot;
      expect(snapshot.metrics).toEqual(computeMetrics(snapshot));
      expect(frame.metrics).toBe(snapshot.metrics);
      expect(snapshot.assetList.length).toBe(48);
      expect(new Set(snapshot.assetList.map((item) => item.asset.id)).size).toBe(48);
      expect(frame.fleet.hubAssets).toBe(
        snapshot.assetList.filter((item) => ['received', 'triaged'].includes(item.status)).length,
      );
      expect(frame.fleet.completedAssets).toBe(snapshot.metrics.completedAssets);
      expect(frame.fleet.onboardAssets).toBe(
        snapshot.assetList.filter((item) => ['collected', 'routed'].includes(item.status)).length,
      );
      expect(frame.fleet.onboardMassKg).toBeCloseTo(
        snapshot.assetList
          .filter((item) => ['collected', 'routed'].includes(item.status))
          .reduce((sum, item) => sum + item.asset.massKg, 0),
        2,
      );
      expect(snapshot.metrics.completedAssets).toBeLessThanOrEqual(snapshot.metrics.collectedAssets);
      expect(snapshot.metrics.dataClearedAssets).toBeLessThanOrEqual(
        snapshot.metrics.collectedDataBearingAssets,
      );
      expect(
        snapshot.assetList.every((item) => item.custodyEvents.every((event) => event.atSecond <= second)),
      ).toBe(true);
      expect(snapshot.assetList.flatMap((item) => item.custodyEvents).length).toBeLessThanOrEqual(48 * 7);
      expect(frame.activityFeed.length).toBeLessThanOrEqual(8);
      expect(frame.activityFeed.every((item) => item.atElapsedSecond <= second)).toBe(true);
    }
  });

  it('uses bounded data after days of running while service clock and round advance monotonically', () => {
    const initial = getLiveOperationsFrame(17.25);
    const daysLater = getLiveOperationsFrame(17.25 + LIVE_PERIOD * 10_000);
    expect(daysLater.vehicles.map((pose) => pose.position)).toEqual(
      initial.vehicles.map((pose) => pose.position),
    );
    expect(daysLater.snapshot.assetList.length).toBe(initial.snapshot.assetList.length);
    expect(daysLater.snapshot.routes).toBe(initial.snapshot.routes);
    expect(daysLater.activityFeed.length).toBe(8);
    expect(daysLater.cycle).toBe(initial.cycle + 10_000);
    expect(daysLater.shiftDay).toBeGreaterThan(initial.shiftDay);
    expect(daysLater.serviceTimestamp > initial.serviceTimestamp).toBe(true);
    expect(daysLater.vehicles[0].round).toBe(initial.vehicles[0].round + 10_000);
  });

  it('never mutates fixtures, historical approvals, or the canonical gated tutorial', () => {
    const before = JSON.stringify({ assets, events, requests, routes, vehicles });
    const canonical = deriveSnapshot(assets, events, [], 180, 'circular_day', canonicalContext());
    for (const second of [0, 179, 180, 360, 7_200]) getLiveOperationsFrame(second);
    expect(JSON.stringify({ assets, events, requests, routes, vehicles })).toBe(before);
    expect(deriveSnapshot(assets, events, [], 180, 'circular_day', canonicalContext())).toEqual(canonical);
    expect(canonical.pendingCheckpoint).toBe('hero');
    expect(canonical.assets['JB-A036'].status).toBe('draft');
    expect(canonical.assets['JB-A047'].held).toBe(true);
    expect(getLiveSnapshot(0).batchId).not.toBe(canonical.batchId);
  });

  it('provides localized phases and handles invalid elapsed time deterministically', () => {
    expect(getLiveOperationsFrame(Number.NaN)).toEqual(getLiveOperationsFrame(0));
    expect(getLiveOperationsFrame(-5)).toEqual(getLiveOperationsFrame(0));
    expect(getLiveOperationsFrame(Number.POSITIVE_INFINITY)).toEqual(getLiveOperationsFrame(0));
    expect(getLiveVehiclePose('missing', 0)).toBeNull();
    for (const labels of Object.values(LIVE_PHASE_LABELS)) {
      expect(labels.id.length).toBeGreaterThan(0);
      expect(labels.en.length).toBeGreaterThan(0);
    }
  });
});
