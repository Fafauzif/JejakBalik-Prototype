import { beforeEach, describe, expect, it } from 'vitest';
import {
  useAppStore,
  snapshotForState,
  serializeSession,
  exportSessionJson,
  importSessionJson,
  exportAssetsCsv,
  exportCustodyCsv,
  requestDirectory,
} from '../../src/state/store';
import { validateImportedSession, csvCell } from '../../src/domain/persistence';
import { makeSession, sessionKey } from '../../src/domain/session';
import { createExplorationState } from '../../src/domain/exploration';
import type { DecisionAction, GateId } from '../../src/domain/types';
function decide(gate: GateId, action: DecisionAction) {
  useAppStore.getState().reviewGate(gate);
  expect(useAppStore.getState().decide(action).ok).toBe(true);
}
beforeEach(() => {
  const session = makeSession();
  useAppStore.setState({
    scenarioId: 'circular_day',
    activeBatchId: 'canonical',
    activeWindowId: '2026-10-19',
    session,
    sessions: { [sessionKey(session)]: session },
    cursor: 0,
    paused: true,
    exploration: createExplorationState(),
    locale: 'id',
    speed: 1,
  });
});
describe('single active operational store', () => {
  it('play arrives at every undecided checkpoint and waits for explicit action', () => {
    const s = () => useAppStore.getState();
    s().play();
    for (let i = 0; i < 80; i++) s().tick(0.5);
    expect(s().cursor).toBe(32);
    expect(s().paused).toBe(true);
    expect(s().session.reviewToken?.gateId).toBe('hero');
    expect(s().submitHero().ok).toBe(true);
    s().play();
    for (let i = 0; i < 100; i++) s().tick(0.5);
    expect(s().cursor).toBe(74);
    expect(s().session.reviewToken?.gateId).toBe('specialist');
    expect(s().decide('approve_specialist').ok).toBe(true);
    s().play();
    for (let i = 0; i < 120; i++) s().tick(0.5);
    expect(s().cursor).toBe(130);
    expect(s().decide('approve_data_release').ok).toBe(true);
    s().play();
    for (let i = 0; i < 110; i++) s().tick(0.5);
    expect(s().cursor).toBe(180);
    expect(snapshotForState(s()).metrics.completedAssets).toBe(48);
  });
  it('direct seek invalidates the review token, repeated actions cannot duplicate custody', () => {
    decide('hero', 'submit_hero');
    useAppStore.getState().reviewGate('specialist');
    useAppStore.getState().seek(74);
    expect(useAppStore.getState().decide('approve_specialist').ok).toBe(false);
    decide('specialist', 'approve_specialist');
    expect(useAppStore.getState().decide('approve_specialist').ok).toBe(false);
    decide('data', 'approve_data_release');
    useAppStore.getState().seek(180);
    const first = exportCustodyCsv();
    useAppStore.getState().seek(20);
    useAppStore.getState().seek(180);
    expect(exportCustodyCsv()).toBe(first);
  });
  it('switching context pauses previous window and invalidates live reviews', () => {
    decide('hero', 'submit_hero');
    useAppStore.getState().reviewGate('specialist');
    useAppStore.getState().setScenario('battery_review');
    expect(useAppStore.getState().sessions['circular_day/canonical/2026-10-19'].reviewToken).toBeNull();
    useAppStore.getState().setScenario('circular_day');
    expect(useAppStore.getState().session.reviewToken).toBeNull();
    expect(useAppStore.getState().decide('approve_specialist').ok).toBe(false);
    expect(useAppStore.getState().session.decisions).toHaveLength(1);
  });
  it('new request after 180 runs freshly; another after start is a separate future batch', () => {
    decide('hero', 'submit_hero');
    decide('specialist', 'approve_specialist');
    decide('data', 'approve_data_release');
    useAppStore.getState().seek(180);
    const first = useAppStore.getState().addRequest({
      items: [
        { category: 'battery', condition: 'damaged' },
        { category: 'battery', condition: 'damaged' },
        { category: 'battery', condition: 'damaged' },
      ],
    });
    expect(first.ok).toBe(true);
    useAppStore.getState().selectBatch(first.batchId!);
    expect(useAppStore.getState().cursor).toBe(0);
    useAppStore.getState().play();
    useAppStore.getState().tick(0.5);
    const second = useAppStore
      .getState()
      .addRequest({ items: [{ category: 'phone', condition: 'functional' }] });
    expect(second.batchId).not.toBe(first.batchId);
    expect(useAppStore.getState().exploration.batches[1].windows[0].date).toBe('2026-10-23');
    expect(useAppStore.getState().cursor).toBe(0.5);
    useAppStore.getState().selectBatch('canonical');
    expect(useAppStore.getState().cursor).toBe(180);
    expect(snapshotForState(useAppStore.getState()).metrics.completedAssets).toBe(48);
  });
  it('request directory aggregates completed history across split windows honestly', () => {
    const added = useAppStore.getState().addRequest({
      items: [
        { category: 'battery', condition: 'damaged' },
        { category: 'battery', condition: 'damaged' },
        { category: 'battery', condition: 'damaged' },
      ],
    });
    useAppStore.getState().selectBatch(added.batchId!);
    decide('specialist', 'approve_specialist');
    useAppStore.getState().seek(180);
    const entry = requestDirectory(useAppStore.getState()).find((e) => e.request.id === added.requestId)!;
    expect(entry.completed).toBe(2);
    expect(entry.total).toBe(3);
    useAppStore.getState().selectBatch(added.batchId!, entry.windows[1].id);
    decide('specialist', 'approve_specialist');
    useAppStore.getState().seek(180);
    expect(
      requestDirectory(useAppStore.getState()).find((e) => e.request.id === added.requestId)!.completed,
    ).toBe(3);
  });
  it('exploration reset clears future date reservations and operational history together', () => {
    const result = useAppStore
      .getState()
      .addRequest({ items: [{ category: 'battery', condition: 'intact' }] });
    useAppStore.getState().selectBatch(result.batchId!);
    decide('specialist', 'approve_specialist');
    useAppStore.getState().resetExploration();
    expect(useAppStore.getState().activeBatchId).toBe('canonical');
    expect(useAppStore.getState().exploration).toEqual(createExplorationState());
    expect(Object.values(useAppStore.getState().sessions).every((s) => s.batchId === 'canonical')).toBe(true);
  });
});
describe('validated JSON and readable real exports', () => {
  it('round-trips decisions/history/reservations and expires live tokens', () => {
    decide('hero', 'submit_hero');
    const added = useAppStore.getState().addRequest({
      items: [{ category: 'phone', condition: 'functional' }],
      contactAlias: 'Warga, Jakarta',
      addressAlias: 'Jalan "Mentari"',
    });
    useAppStore.getState().selectBatch(added.batchId!);
    useAppStore.getState().reviewGate('data');
    const json = exportSessionJson();
    expect(importSessionJson(json).ok).toBe(true);
    expect(useAppStore.getState().session.reviewToken).toBeNull();
    expect(useAppStore.getState().paused).toBe(true);
    expect(useAppStore.getState().exploration.reservations).toHaveLength(1);
    expect(useAppStore.getState().decide('approve_data_release').ok).toBe(false);
  });
  it('rejects corrupt schemas, missing entity references, forged decision scope and capacity reservations atomically', () => {
    const start = exportSessionJson();
    expect(importSessionJson('{bad').ok).toBe(false);
    expect(importSessionJson('{"schemaVersion":99}').ok).toBe(false);
    const added = useAppStore
      .getState()
      .addRequest({ items: [{ category: 'phone', condition: 'functional' }] });
    useAppStore.getState().selectBatch(added.batchId!);
    const payload = serializeSession();
    for (const mutate of [
      (p: any) => (p.exploration.batches[0].assets[0].massKg = 999),
      (p: any) => (p.exploration.batches[0].requests[0].assetIds = ['missing']),
      (p: any) => (p.exploration.reservations[0].date = '2026-10-19'),
      (p: any) => (p.sessions[Object.keys(p.sessions)[0]].cursor = 181),
    ]) {
      const broken = JSON.parse(JSON.stringify(payload));
      mutate(broken);
      expect(validateImportedSession(broken).ok).toBe(false);
    }
    expect(importSessionJson(start).ok).toBe(true);
  });
  it('CSV contains current rows and stable unique custody records with safe Indonesian encoding', () => {
    decide('hero', 'submit_hero');
    decide('specialist', 'approve_specialist');
    decide('data', 'approve_data_release');
    useAppStore.getState().seek(180);
    const csv = exportAssetsCsv();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split('\r\n')).toHaveLength(49);
    expect(csv).toContain('JB-A036,JB-R036,phone,0.18,completed');
    const custody = exportCustodyCsv();
    const lines = custody.split('\r\n');
    expect(new Set(lines).size).toBe(lines.length);
    expect(custody).toContain('canonical/2026-10-19/EV-0304');
    expect(csvCell('Warga, "Mentari"')).toBe('"Warga, ""Mentari"""');
    expect(csvCell('=SUM(A1:A3)')).toBe("'=SUM(A1:A3)");
  });
});
