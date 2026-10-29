import { describe, expect, it } from 'vitest';
import {
  addExplorationRequest,
  buildExplorationContext,
  createExplorationState,
  markBatchStarted,
} from '../../src/domain/exploration';
import { vehicles } from '../../src/domain/fixtures';
import { canonicalContext } from '../../src/domain/context';
import { deriveSnapshot } from '../../src/domain/engine';
import { makeSession, recordDecision, reviewGate } from '../../src/domain/session';
import type { ExplorationRequestInput, ExplorationState } from '../../src/domain/types';

function submit(
  state: ExplorationState,
  items: ExplorationRequestInput['items'],
  addressId = 'HH-001',
): ExplorationState {
  const result = addExplorationRequest(state, { items, addressId });
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function eighteen(category: string, condition: string): ExplorationState {
  let state = createExplorationState();
  for (let request = 0; request < 6; request++) {
    state = submit(
      state,
      Array.from({ length: 3 }, () => ({ category, condition })),
      `HH-${String(request + 1).padStart(3, '0')}`,
    );
  }
  return state;
}

describe('bounded exploration allocation', () => {
  it.each([
    ['large_appliance', 'functional', 4, 14, 5],
    ['battery', 'damaged', 2, 16, 9],
    ['phone', 'functional', 12, 6, 2],
  ])(
    'allocates 18 %s assets FIFO without borrowing later capacity',
    (category, condition, first, deferred, days) => {
      const state = eighteen(category as string, condition as string);
      const batch = state.batches[0];
      const context = buildExplorationContext(state, batch.id, batch.windows[0].id);
      expect(batch.requests).toHaveLength(6);
      expect(batch.assets).toHaveLength(18);
      expect(batch.windows).toHaveLength(days as number);
      expect(context.eligibleAssetIds).toHaveLength(first as number);
      expect(context.seed.length - context.eligibleAssetIds.length).toBe(deferred);
      expect(context.serviceDate).toBe('2026-10-21');
      expect(batch.windows.flatMap((window) => window.assetIds)).toEqual(
        batch.assets.map((asset) => asset.id),
      );
      expect(new Set(batch.assets.map((asset) => asset.id)).size).toBe(18);
      expect(state.reservations).toHaveLength(days as number);
      expect(
        context.events.every(
          (event) => event.assetId === null || context.eligibleAssetIds.includes(event.assetId),
        ),
      ).toBe(true);
    },
  );

  it('rejects the seventh request and leaves the source state unchanged', () => {
    const state = eighteen('phone', 'functional');
    const before = JSON.stringify(state);
    expect(
      addExplorationRequest(state, { items: [{ category: 'router', condition: 'functional' }] }),
    ).toEqual({ ok: false, reason: 'request_limit' });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rejects invalid category, condition, asset count, and sample address atomically', () => {
    const state = createExplorationState();
    for (const input of [
      { items: [] },
      { items: Array.from({ length: 4 }, () => ({ category: 'phone', condition: 'functional' })) },
      { items: [{ category: 'unknown', condition: 'functional' }] },
      { items: [{ category: 'accessories', condition: 'repairable' }] },
      { items: [{ category: 'battery', condition: 'functional' }] },
      { addressId: 'not-a-sample', items: [{ category: 'phone', condition: 'functional' }] },
    ])
      expect(addExplorationRequest(state, input).ok).toBe(false);
    expect(state).toEqual({ batches: [], reservations: [], requestCount: 0 });
  });

  it('respects receiving capacity across classes and permits partial household windows', () => {
    let state = createExplorationState();
    state = submit(
      state,
      Array.from({ length: 3 }, () => ({ category: 'phone', condition: 'parts_only' })),
    );
    state = submit(
      state,
      Array.from({ length: 3 }, () => ({ category: 'monitor', condition: 'parts_only' })),
      'HH-002',
    );
    state = submit(
      state,
      [
        { category: 'large_appliance', condition: 'parts_only' },
        { category: 'battery', condition: 'intact' },
        { category: 'router', condition: 'functional' },
      ],
      'HH-003',
    );
    const batch = state.batches[0];
    const first = buildExplorationContext(state, batch.id, batch.windows[0].id);
    expect(first.eligibleAssetIds).toHaveLength(8);
    expect(batch.windows[1].assetIds).toHaveLength(1);
    const split = batch.requests[2];
    expect(split.windowIds).toHaveLength(2);
    expect(split.date).toBe('2026-10-21');
    expect(batch.windows[0].assetIds.filter((id) => split.assetIds.includes(id))).toHaveLength(2);
    expect(first.activeRoutes.map((route) => route.handlingClass)).toEqual(['ordinary', 'specialist']);
    expect(first.gates).toEqual(['specialist', 'data']);
  });

  it('uses physical mass constraints in addition to available slots', () => {
    const vehicle = vehicles.find((entry) => entry.id === 'V03')!;
    const oldCapacity = vehicle.capacityKg;
    try {
      vehicle.capacityKg = 60;
      const state = submit(
        createExplorationState(),
        Array.from({ length: 3 }, () => ({ category: 'large_appliance', condition: 'functional' })),
      );
      expect(state.batches[0].windows.map((window) => window.assetIds.length)).toEqual([1, 1, 1]);
    } finally {
      vehicle.capacityKg = oldCapacity;
    }
  });

  it('never rewinds started history or reuses dates reserved by its deferred windows', () => {
    let state = createExplorationState();
    state = submit(
      state,
      Array.from({ length: 3 }, () => ({ category: 'battery', condition: 'damaged' })),
    );
    state = submit(
      state,
      Array.from({ length: 3 }, () => ({ category: 'battery', condition: 'intact' })),
      'HH-002',
    );
    expect(state.batches).toHaveLength(1);
    expect(state.batches[0].windows.map((window) => window.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]);
    state = markBatchStarted(state, state.batches[0].id);
    const history = JSON.stringify(state.batches[0]);
    state = submit(state, [{ category: 'router', condition: 'functional' }]);
    expect(state.batches).toHaveLength(2);
    expect(state.batches[1].windows[0].date).toBe('2026-10-24');
    expect(JSON.stringify(state.batches[0])).toBe(history);
    const reservations = JSON.stringify(state.reservations);
    buildExplorationContext(state, state.batches[0].id, state.batches[0].windows[2].id);
    expect(JSON.stringify(state.reservations)).toBe(reservations);
    state = submit(state, [{ category: 'phone', condition: 'functional' }]);
    expect(state.batches).toHaveLength(2);
    expect(state.batches[1].requests).toHaveLength(2);
    expect(state.batches[1].windows[0].date).toBe('2026-10-24');
  });
});

describe('exploration context and authored routes', () => {
  it('is fresh at zero with no hero gate or base funding and only relevant gates', () => {
    const state = submit(createExplorationState(), [{ category: 'router', condition: 'functional' }]);
    const batch = state.batches[0];
    const context = buildExplorationContext(state, batch.id, batch.windows[0].id);
    expect(context.requests[0].initiallySubmitted).toBe(true);
    expect(context.seed[0].initialStatus).toBe('requested');
    expect(context.gates).toEqual([]);
    expect(context.events.find((event) => event.kind === 'checkpoint')).toBeUndefined();
    expect(context.funding).toEqual({ serviceContractFeeIdr: 0, communityAccessSponsorIdr: 0 });
    expect(context.events.find((event) => event.kind === 'completed')?.atSecond).toBe(166);
  });

  it('collapses repeated household/class stops with Manhattan paths and matching collection times', () => {
    let state = submit(createExplorationState(), [{ category: 'router', condition: 'functional' }]);
    state = submit(state, [{ category: 'phone', condition: 'nonfunctional' }]);
    state = submit(state, [{ category: 'printer', condition: 'functional' }], 'HH-003');
    const batch = state.batches[0];
    const context = buildExplorationContext(state, batch.id, batch.windows[0].id);
    expect(context.activeRoutes).toHaveLength(1);
    const route = context.activeRoutes[0];
    expect(route.stops).toHaveLength(2);
    expect(route.stops.map((stop) => stop.householdId)).toEqual(['HH-001', 'HH-003']);
    expect(route.stops[0].assetIds).toHaveLength(2);
    expect(route.path[0]).toEqual([0, 0]);
    expect(route.path.at(-1)).toEqual([0, 0]);
    let units = 0;
    for (let index = 1; index < route.path.length; index++) {
      const a = route.path[index - 1],
        b = route.path[index];
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
      units += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }
    expect(route.distanceKm).toBeCloseTo(units * 0.1);
    for (const stop of route.stops) {
      expect(stop.arrivalStorySecond).toBeGreaterThan(route.startStorySecond);
      expect(stop.arrivalStorySecond).toBeLessThan(route.endStorySecond);
      for (const id of stop.assetIds) {
        expect(
          context.events.find((event) => event.assetId === id && event.kind === 'collected')?.atSecond,
        ).toBe(stop.arrivalStorySecond);
        expect(context.seed.find((asset) => asset.id === id)?.collectionStorySecond).toBe(
          stop.arrivalStorySecond,
        );
      }
    }
    expect(context.gates).toEqual(['data']);
    expect(new Set(context.events.map((event) => event.id)).size).toBe(context.events.length);
  });

  it('guards every specialist lifecycle transition after validation and gates data clearance', () => {
    const state = submit(createExplorationState(), [
      { category: 'battery', condition: 'damaged' },
      { category: 'laptop', condition: 'functional' },
    ]);
    const batch = state.batches[0];
    const context = buildExplorationContext(state, batch.id, batch.windows[0].id);
    const specialistId = context.seed.find((asset) => asset.handlingClass === 'specialist')!.id;
    const laptopId = context.seed.find((asset) => asset.dataBearing)!.id;
    const specialistEvents = context.events.filter(
      (event) => event.assetId === specialistId && !['validated', 'safety_hold'].includes(event.kind),
    );
    expect(
      specialistEvents.every((event) => event.guard === 'specialist_approved' && event.atSecond > 74),
    ).toBe(true);
    expect(
      context.events.find((event) => event.assetId === laptopId && event.kind === 'data_cleared'),
    ).toMatchObject({ atSecond: 132, guard: 'data_release_approved' });
    expect(
      context.events.filter((event) => event.kind === 'checkpoint').map((event) => event.atSecond),
    ).toEqual([74, 130]);
    expect(context.activeRoutes.find((route) => route.handlingClass === 'specialist')).toMatchObject({
      guard: 'specialist_approved',
      vehicleId: 'V05',
      startStorySecond: 78,
      endStorySecond: 104,
    });
  });
});

describe('exploration engine integration', () => {
  it('starts a usable fresh progression after canonical completion and preserves canonical results', () => {
    const canonical = canonicalContext();
    let session = makeSession();
    for (const [gate, action] of [
      ['hero', 'submit_hero'],
      ['specialist', 'approve_specialist'],
      ['data', 'approve_data_release'],
    ] as const) {
      const accepted = recordDecision(action, reviewGate(gate, session));
      if (!accepted.ok) throw new Error('Expected explicit gate approval');
      session = accepted.session;
    }
    const before = deriveSnapshot(
      canonical.seed,
      canonical.events,
      session.decisions,
      180,
      'circular_day',
      canonical,
    );
    expect(before.metrics.completedAssets).toBe(48);
    const state = submit(createExplorationState(), [{ category: 'router', condition: 'functional' }]);
    const batch = state.batches[0];
    const context = buildExplorationContext(state, batch.id, batch.windows[0].id);
    const start = deriveSnapshot(context.seed, context.events, [], 0, 'exploration', context);
    const end = deriveSnapshot(context.seed, context.events, [], 180, 'exploration', context);
    expect(start.metrics.requests).toBe(1);
    expect(start.metrics.collectedAssets).toBe(0);
    expect(start.assetList[0].status).toBe('requested');
    expect(end.metrics.completedAssets).toBe(1);
    expect(end.metrics.serviceContractFeeIdr).toBe(0);
    expect(end.metrics.communityAccessSponsorIdr).toBe(0);
    expect(end.metrics.batchOperatingContributionIdr).toBeLessThan(0);
    const after = deriveSnapshot(
      canonical.seed,
      canonical.events,
      session.decisions,
      180,
      'circular_day',
      canonical,
    );
    expect(after.metrics).toEqual(before.metrics);
  });

  it('keeps data held at the hub until the current window explicitly grants clearance', () => {
    const state = submit(createExplorationState(), [
      { category: 'phone', condition: 'functional' },
      { category: 'router', condition: 'functional' },
    ]);
    const batch = state.batches[0];
    const context = buildExplorationContext(state, batch.id, batch.windows[0].id);
    const held = deriveSnapshot(context.seed, context.events, [], 180, 'exploration', context);
    expect(held.metrics.collectedAssets).toBe(2);
    expect(held.metrics.completedAssets).toBe(1);
    expect(held.assetList.find((asset) => asset.asset.dataBearing)).toMatchObject({
      held: true,
      holdReason: 'data',
      status: 'triaged',
      dataCleared: false,
    });
    const session = makeSession('exploration', batch.id, batch.windows[0].id);
    const accepted = recordDecision('approve_data_release', reviewGate('data', session));
    if (!accepted.ok) throw new Error('Expected explicit data approval');
    const completed = deriveSnapshot(
      context.seed,
      context.events,
      accepted.session.decisions,
      180,
      'exploration',
      context,
    );
    expect(completed.metrics.completedAssets).toBe(2);
    expect(completed.metrics.dataClearedAssets).toBe(1);
    const foreign = accepted.session.decisions.map((decision) => ({ ...decision, batchId: 'canonical' }));
    expect(
      deriveSnapshot(context.seed, context.events, foreign, 180, 'exploration', context).metrics
        .completedAssets,
    ).toBe(1);
  });

  it('keeps a split request partial in each selected window and requires separate specialist approval', () => {
    const state = submit(
      createExplorationState(),
      Array.from({ length: 3 }, () => ({ category: 'battery', condition: 'damaged' })),
    );
    const batch = state.batches[0];
    const first = buildExplorationContext(state, batch.id, batch.windows[0].id);
    const second = buildExplorationContext(state, batch.id, batch.windows[1].id);
    const approval = recordDecision(
      'approve_specialist',
      reviewGate('specialist', makeSession('exploration', batch.id, first.windowId)),
    );
    if (!approval.ok) throw new Error('Expected explicit specialist approval');
    const firstEnd = deriveSnapshot(
      first.seed,
      first.events,
      approval.session.decisions,
      180,
      'exploration',
      first,
    );
    expect(firstEnd.metrics.completedAssets).toBe(2);
    expect(firstEnd.metrics.deferredAssets).toBe(1);
    expect(
      firstEnd.assetList.filter((asset) => asset.deferred).every((asset) => asset.status === 'requested'),
    ).toBe(true);
    const secondEnd = deriveSnapshot(
      second.seed,
      second.events,
      approval.session.decisions,
      180,
      'exploration',
      second,
    );
    expect(secondEnd.metrics.completedAssets).toBe(0);
    expect(secondEnd.metrics.heldUncollected).toBe(1);
    expect(secondEnd.pendingCheckpoint).toBe('specialist');
  });
});
