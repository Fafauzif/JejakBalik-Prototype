import { describe, it, expect } from 'vitest';
import { assets, events, routes, vehicles } from '../../src/domain/fixtures';
import { canonicalContext } from '../../src/domain/context';
import { deriveSnapshot } from '../../src/domain/engine';
import { getVehiclePose } from '../../src/domain/routing';
import { makeSession, reviewGate, recordDecision } from '../../src/domain/session';
import type { DecisionAction, ScenarioId, WindowSession } from '../../src/domain/types';
import branches from '../../src/domain/data/EXPECTED_BRANCH_METRICS.json';

function decide(session: WindowSession, action: DecisionAction) {
  const gate = action === 'submit_hero' ? 'hero' : action.includes('specialist') ? 'specialist' : 'data';
  const result = recordDecision(action, reviewGate(gate, session));
  if (!result.ok) throw Error('decision rejected');
  return result.session;
}
function branchSession(scenario: ScenarioId, id: string) {
  let s = decide(makeSession(scenario), 'submit_hero');
  s = decide(s, id === 'specialist_held' ? 'retain_specialist_hold' : 'approve_specialist');
  return decide(s, id === 'data_held' ? 'retain_data_hold' : 'approve_data_release');
}
describe('authored canonical branch reconciliation', () => {
  for (const expected of branches) {
    it(`recomputes every ${expected.id} outcome and financial line from eligible events`, () => {
      const scenario = expected.scenarioId as ScenarioId;
      const context = canonicalContext(scenario);
      const session = branchSession(scenario, expected.id);
      const snapshot = deriveSnapshot(assets, events, session.decisions, 180, scenario, context);
      for (const [key, value] of Object.entries(expected.metrics)) {
        const actual = snapshot.metrics[key as keyof typeof snapshot.metrics];
        if (typeof value === 'number') expect(actual, `${expected.id}.${key}`).toBeCloseTo(value, 2);
        else expect(actual, `${expected.id}.${key}`).toEqual(value);
      }
      expect(snapshot.routes.map((r) => r.id)).toEqual(expected.activeRoutes.map((r) => r.id));
      for (const route of snapshot.routes) {
        const target = expected.activeRoutes.find((r) => r.id === route.id)!;
        expect(route.assetIds).toEqual(target.assetIds);
        expect(route.distanceKm).toBeCloseTo(target.distanceKm, 3);
      }
      expect(snapshot.assetList.flatMap((a) => a.custodyEventIds).length).toBe(
        new Set(snapshot.assetList.flatMap((a) => a.custodyEventIds)).size,
      );
    });
  }
  it('has 35 submitted requests/47 assets before explicit hero submission', () => {
    const c = canonicalContext();
    const s = deriveSnapshot(assets, events, [], 0, 'circular_day', c);
    expect(s.metrics.requests).toBe(35);
    expect(s.metrics.batchAssets).toBe(47);
    expect(s.assets['JB-A036'].status).toBe('draft');
    expect(s.metrics.custodyCompletionCollectedPercent).toBeNull();
  });
  it('seek to the end never grants specialist or data permission and excludes the hero draft', () => {
    const c = canonicalContext();
    const s = deriveSnapshot(assets, events, [], 180, 'circular_day', c);
    expect(s.pendingCheckpoint).toBe('hero');
    expect(s.assets['JB-A036'].status).toBe('draft');
    expect(s.assets['JB-A047'].status).toBe('validated');
    expect(s.assets['JB-A047'].held).toBe(true);
    expect(s.metrics.dataClearedAssets).toBe(0);
    expect(s.metrics.completedAssets).toBe(28);
  });
  it('rewind restores seed state and immutable custody remains exactly stable across repeated reads', () => {
    const c = canonicalContext();
    const session = branchSession('circular_day', 'positive');
    const before = JSON.stringify(assets);
    const first = deriveSnapshot(assets, events, session.decisions, 180, 'circular_day', c);
    for (let i = 0; i < 6; i++) {
      deriveSnapshot(assets, events, session.decisions, 20, 'circular_day', c);
      const again = deriveSnapshot(assets, events, session.decisions, 180, 'circular_day', c);
      expect(again).toEqual(first);
    }
    expect(JSON.stringify(assets)).toBe(before);
    const early = deriveSnapshot(assets, events, session.decisions, 31, 'circular_day', c);
    expect(early.assets['JB-A036'].status).toBe('draft');
    expect(early.metrics.collectedAssets).toBe(0);
  });
  it('cannot use decisions from another scenario/window and rejects fabricated late decisions', () => {
    const c = canonicalContext();
    const s = branchSession('circular_day', 'positive');
    for (const decisions of [
      s.decisions.map((d) => ({ ...d, batchId: 'other' })),
      s.decisions.map((d) => ({ ...d, windowId: 'other' })),
      s.decisions.map((d) => ({ ...d, scenarioId: 'battery_review' as ScenarioId })),
      s.decisions.map((d) => ({ ...d, atSecond: 180 })),
    ]) {
      const result = deriveSnapshot(assets, events, decisions, 180, 'circular_day', c);
      expect(result.metrics.dataClearedAssets).toBe(0);
      expect(result.assets['JB-A036'].status).toBe('draft');
    }
  });
  it('capacity override suppresses every lifecycle event of both deferred devices', () => {
    const c = canonicalContext('capacity_shift');
    const session = branchSession('capacity_shift', 'positive');
    const s = deriveSnapshot(assets, events, session.decisions, 180, 'capacity_shift', c);
    for (const id of ['JB-A023', 'JB-A024']) {
      expect(s.assets[id].deferred).toBe(true);
      expect(s.assets[id].status).toBe('requested');
      expect(s.assets[id].custodyEventIds).toEqual([]);
    }
    expect(s.metrics.batchAssets).toBe(48);
    expect(s.metrics.windowEligibleAssets).toBe(46);
    expect(s.metrics.currentWindowFulfillmentPercent).toBe(100);
    expect(s.metrics.collectionCoveragePercent).toBeCloseTo(95.8333, 3);
  });
  it('vehicle arrives at the actual stop when collection is recorded and V01 does not overlap routes', () => {
    for (const route of routes) {
      for (const stop of route.stops) {
        const pose = getVehiclePose(route, stop.arrivalStorySecond);
        expect(pose.position[0]).toBeCloseTo(stop.position[0], 1);
        expect(pose.position[1]).toBeCloseTo(stop.position[1], 1);
      }
      expect(getVehiclePose(route, 0).position).toEqual(route.path[0]);
      expect(getVehiclePose(route, 180).position).toEqual(route.path.at(-1));
      const vehicle = vehicles.find((v) => v.id === route.vehicleId)!;
      expect(route.loadKg).toBeLessThanOrEqual(vehicle.capacityKg);
      expect(route.assetIds.length).toBeLessThanOrEqual(vehicle.capacityAssets);
    }
    const van = routes.filter((r) => r.vehicleId === 'V01');
    expect(van[0].endStorySecond).toBeLessThanOrEqual(van[1].startStorySecond);
  });
});

describe('shared lifecycle and receiving preconditions', () => {
  it('an approval cannot bypass missing collection or produce data clearance at the household', () => {
    const context = canonicalContext();
    const session = branchSession('circular_day', 'positive');
    const withoutCollection = events.filter((event) => event.kind !== 'collected');
    const snapshot = deriveSnapshot(
      assets,
      withoutCollection,
      session.decisions,
      180,
      'circular_day',
      context,
    );
    expect(snapshot.metrics.collectedAssets).toBe(0);
    expect(snapshot.metrics.completedAssets).toBe(0);
    expect(snapshot.metrics.dataClearedAssets).toBe(0);
    expect(snapshot.metrics.groupedCollectionCostIdr).toBe(0);
    expect(snapshot.assetList.every((record) => record.status === 'assigned')).toBe(true);
  });
  it('routing respects receiving slots and declared destination compatibility', () => {
    const context = canonicalContext();
    const session = branchSession('circular_day', 'positive');
    const noSlots = { ...context, destinationCapacity: { P01: 0, P02: 0, P03: 0, P04: 0 } };
    const held = deriveSnapshot(assets, events, session.decisions, 180, 'circular_day', noSlots);
    expect(held.metrics.collectedAssets).toBe(48);
    expect(held.metrics.completedAssets).toBe(0);
    expect(held.metrics.processingCostIdr).toBe(0);
    const incompatible = assets.map((asset) => ({ ...asset, destinationId: 'P04' }));
    const snapshot = deriveSnapshot(incompatible, events, session.decisions, 180, 'circular_day', {
      ...context,
      seed: incompatible,
    });
    expect(snapshot.metrics.completedAssets).toBe(2);
    expect(
      snapshot.assetList
        .filter((record) => record.status === 'completed')
        .every((record) => record.asset.plannedDisposition === 'specialist'),
    ).toBe(true);
  });
});

describe('single-use exact-time review tokens', () => {
  it('rejects late approval without review and then permits the reviewed path', () => {
    let s = { ...makeSession(), cursor: 180 };
    expect(recordDecision('approve_specialist', s)).toEqual({ ok: false, reason: 'needs_gate_review' });
    s = reviewGate('hero', s);
    const hero = recordDecision('submit_hero', s);
    expect(hero.ok).toBe(true);
    if (!hero.ok) return;
    s = reviewGate('specialist', hero.session);
    expect(s.cursor).toBe(74);
    const approved = recordDecision('approve_specialist', s);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    s = reviewGate('data', approved.session);
    const data = recordDecision('approve_data_release', s);
    expect(data.ok).toBe(true);
    if (!data.ok) return;
    const c = canonicalContext();
    expect(
      deriveSnapshot(assets, events, data.session.decisions, 180, 'circular_day', c).metrics.completedAssets,
    ).toBe(48);
  });
  it('consumes its token; direct seek to an existing gate cannot reverse approval', () => {
    let s = branchSession('circular_day', 'positive');
    s = { ...s, cursor: 74, reviewToken: null };
    expect(recordDecision('retain_specialist_hold', s).ok).toBe(false);
    expect(s.decisions).toHaveLength(3);
    const reviewed = reviewGate('specialist', s);
    expect(reviewed.decisions.map((d) => d.action)).toEqual(['submit_hero']);
    const held = recordDecision('retain_specialist_hold', reviewed);
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    expect(recordDecision('approve_specialist', held.session).ok).toBe(false);
  });
  it('rejects stale revisions, another context token, unpaused state and an incorrect exact time', () => {
    const reviewed = reviewGate('specialist', makeSession());
    for (const broken of [
      { ...reviewed, revision: reviewed.revision + 1 },
      { ...reviewed, batchId: 'EXP-1' },
      { ...reviewed, windowId: 'EXP-1-W1' },
      { ...reviewed, scenarioId: 'battery_review' as ScenarioId },
      { ...reviewed, paused: false },
      { ...reviewed, cursor: 74.01 },
    ])
      expect(recordDecision('approve_specialist', broken).ok).toBe(false);
  });
  it('retained holds reverse only through review, with downstream decisions invalidated', () => {
    let s = branchSession('battery_review', 'specialist_held');
    const c = canonicalContext('battery_review');
    expect(
      deriveSnapshot(assets, events, s.decisions, 180, 'battery_review', c).metrics.completedAssets,
    ).toBe(46);
    s = reviewGate('specialist', s);
    expect(s.decisions.map((d) => d.action)).toEqual(['submit_hero']);
    const approved = recordDecision('approve_specialist', s);
    if (!approved.ok) throw Error();
    s = decide(approved.session, 'approve_data_release');
    expect(
      deriveSnapshot(assets, events, s.decisions, 180, 'battery_review', c).metrics.completedAssets,
    ).toBe(48);
  });
});
