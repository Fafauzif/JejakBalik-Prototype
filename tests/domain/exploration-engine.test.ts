import { describe, expect, it } from 'vitest';
import {
  addExplorationRequest,
  buildExplorationContext,
  createExplorationState,
  markBatchStarted,
} from '../../src/domain/exploration';
import { deriveSnapshot } from '../../src/domain/engine';
import { makeSession, recordDecision, reviewGate, sessionKey } from '../../src/domain/session';
import { validateImportedSession } from '../../src/domain/persistence';
import type {
  DecisionAction,
  DerivationContext,
  ExplorationState,
  WindowSession,
} from '../../src/domain/types';

function submit(state: ExplorationState, category: string, condition: string, count = 3): ExplorationState {
  const result = addExplorationRequest(state, {
    items: Array.from({ length: count }, () => ({ category, condition })),
  });
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function contextFor(state: ExplorationState, batchIndex = 0, windowIndex = 0): DerivationContext {
  const batch = state.batches[batchIndex];
  return buildExplorationContext(state, batch.id, batch.windows[windowIndex].id);
}

function act(session: WindowSession, action: DecisionAction): WindowSession {
  const gate = action.includes('specialist') ? 'specialist' : 'data';
  const result = recordDecision(action, reviewGate(gate, session));
  if (!result.ok) throw new Error('Explicit review must accept matching action');
  return result.session;
}

function finish(context: DerivationContext, session?: WindowSession) {
  return deriveSnapshot(context.seed, context.events, session?.decisions ?? [], 180, 'exploration', context);
}

describe('exploration engine outcomes', () => {
  it.each([
    ['large_appliance', 'functional', 4, 14],
    ['battery', 'damaged', 2, 16],
    ['phone', 'functional', 12, 6],
  ])(
    'completes only %s first-window allocation with explicit approvals',
    (category, condition, completed, deferred) => {
      let state = createExplorationState();
      for (let index = 0; index < 6; index++) state = submit(state, category as string, condition as string);
      const context = contextFor(state);
      let session = makeSession('exploration', context.batchId, context.windowId);
      if (context.gates.includes('specialist')) session = act(session, 'approve_specialist');
      if (context.gates.includes('data')) session = act(session, 'approve_data_release');
      const snapshot = finish(context, session);
      expect(snapshot.pendingCheckpoint).toBeNull();
      expect(snapshot.metrics.batchAssets).toBe(18);
      expect(snapshot.metrics.windowEligibleAssets).toBe(completed);
      expect(snapshot.metrics.collectedAssets).toBe(completed);
      expect(snapshot.metrics.completedAssets).toBe(completed);
      expect(snapshot.metrics.deferredAssets).toBe(deferred);
      expect(snapshot.metrics.currentWindowFulfillmentPercent).toBe(100);
      expect(snapshot.metrics.serviceContractFeeIdr).toBe(0);
      expect(snapshot.metrics.communityAccessSponsorIdr).toBe(0);
    },
  );

  it('retained specialist hold yields no dispatch, processing, recovery, or collection charge', () => {
    const context = contextFor(submit(createExplorationState(), 'battery', 'damaged'));
    expect(finish(context).pendingCheckpoint).toBe('specialist');
    const session = act(
      makeSession('exploration', context.batchId, context.windowId),
      'retain_specialist_hold',
    );
    const snapshot = finish(context, session);
    expect(snapshot.pendingCheckpoint).toBeNull();
    expect(snapshot.routes).toHaveLength(0);
    expect(snapshot.metrics).toMatchObject({
      collectedAssets: 0,
      completedAssets: 0,
      groupedRouteSegments: 0,
      groupedCollectionCostIdr: 0,
      processingCostIdr: 0,
      dataClearanceCostIdr: 0,
      grossRecoveredValueIdr: 0,
      recoveredValueIdr: 0,
      batchOperatingContributionIdr: 0,
      dedicatedTrips: 0,
      dedicatedCollectionCostIdr: 0,
      heldUncollected: 2,
      deferredAssets: 1,
    });
  });

  it('retained data hold charges collection alone and earns no recovery value', () => {
    const context = contextFor(submit(createExplorationState(), 'phone', 'functional'));
    expect(finish(context).pendingCheckpoint).toBe('data');
    const session = act(makeSession('exploration', context.batchId, context.windowId), 'retain_data_hold');
    const snapshot = finish(context, session);
    expect(snapshot.pendingCheckpoint).toBeNull();
    expect(snapshot.metrics).toMatchObject({
      collectedAssets: 3,
      completedAssets: 0,
      dataClearedAssets: 0,
      dataClearanceCostIdr: 0,
      processingCostIdr: 0,
      grossRecoveredValueIdr: 0,
      recoveredValueIdr: 0,
      heldAtHub: 3,
    });
    expect(snapshot.metrics.groupedCollectionCostIdr).toBeGreaterThan(0);
    expect(snapshot.metrics.batchOperatingContributionIdr).toBe(-snapshot.metrics.groupedCollectionCostIdr);
  });

  it('does not create irrelevant data or specialist checkpoints', () => {
    const ordinary = contextFor(submit(createExplorationState(), 'router', 'functional'));
    expect(ordinary.gates).toEqual([]);
    expect(finish(ordinary).pendingCheckpoint).toBeNull();
    const specialist = contextFor(submit(createExplorationState(), 'battery', 'intact'));
    expect(specialist.gates).toEqual(['specialist']);
    const data = contextFor(submit(createExplorationState(), 'laptop', 'repairable'));
    expect(data.gates).toEqual(['data']);
  });

  it('scopes decisions to one window and one batch, including saved later windows', () => {
    let state = submit(createExplorationState(), 'battery', 'damaged');
    state = markBatchStarted(state, state.batches[0].id);
    state = submit(state, 'battery', 'damaged');
    const first = contextFor(state);
    const later = contextFor(state, 0, 1);
    const newBatch = contextFor(state, 1);
    const session = act(makeSession('exploration', first.batchId, first.windowId), 'approve_specialist');
    expect(finish(first, session).metrics.completedAssets).toBe(2);
    expect(finish(later, session).metrics.completedAssets).toBe(0);
    expect(finish(newBatch, session).metrics.completedAssets).toBe(0);
    expect(finish(later, session).pendingCheckpoint).toBe('specialist');
    expect(finish(newBatch, session).pendingCheckpoint).toBe('specialist');
  });
});

describe('exploration persistence compatibility', () => {
  it('round-trips real mixed exploration batches and complete reservation history', () => {
    let exploration = submit(createExplorationState(), 'battery', 'intact');
    exploration = submit(exploration, 'phone', 'functional');
    exploration = markBatchStarted(exploration, exploration.batches[0].id);
    exploration = submit(exploration, 'large_appliance', 'worn');
    const context = contextFor(exploration, 1);
    const active = makeSession('exploration', context.batchId, context.windowId);
    const imported = validateImportedSession(
      JSON.parse(
        JSON.stringify({
          schemaVersion: 1,
          scenarioId: 'exploration',
          activeBatchId: active.batchId,
          activeWindowId: active.windowId,
          sessions: { [sessionKey(active)]: active },
          exploration,
          locale: 'id',
          quality: 'auto',
          speed: 1,
          reducedMotion: false,
          selection: null,
          serviceTimezone: 'Asia/Jakarta',
          savedAt: '2026-10-16T20:00:00Z',
        }),
      ),
    );
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.session.exploration).toEqual(exploration);
      const restored = contextFor(imported.session.exploration, 1);
      expect(finish(restored).metrics).toEqual(finish(context).metrics);
    }
  });
});
