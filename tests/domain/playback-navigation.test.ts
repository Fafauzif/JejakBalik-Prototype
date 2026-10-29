import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore, exportSessionJson, importSessionJson, snapshotForState } from '../../src/state/store';
import { useNetworkStore } from '../../src/state/network-store';
import { nextProgressionTime } from '../../src/domain/playback';

beforeEach(() => {
  const store = useAppStore.getState();
  store.setScenario('circular_day');
  useAppStore.getState().reset();
  useAppStore.getState().setSpeed(1);
  useNetworkStore.setState({ view: 'live', elapsedSeconds: 0, livePaused: false, liveSpeed: 1 });
});
function submit() {
  useAppStore.getState().reviewGate('hero');
  expect(useAppStore.getState().submitHero().ok).toBe(true);
}

describe('visitor-controlled progression', () => {
  it('Next traverses narrative points and stops at a fresh unapproved checkpoint', () => {
    useAppStore.getState().setJourneyActive(true);
    expect(useAppStore.getState().advanceNext().cursor).toBe(8);
    expect(useAppStore.getState().advanceNext().cursor).toBe(18);
    const result = useAppStore.getState().advanceNext();
    expect(result).toEqual({ ok: false, reason: 'checkpoint', gate: 'hero', cursor: 32 });
    expect(useAppStore.getState().session.decisions).toEqual([]);
    expect(useAppStore.getState().session.reviewToken?.gateId).toBe('hero');
    expect(useAppStore.getState().paused).toBe(true);
  });
  it('30x cannot jump over specialist review, or infer a current-user decision', () => {
    submit();
    useAppStore.getState().setSpeed(30);
    useAppStore.getState().seek(65);
    useAppStore.getState().play();
    useAppStore.getState().tick(0.5);
    expect(useAppStore.getState().cursor).toBe(74);
    expect(useAppStore.getState().paused).toBe(true);
    expect(useAppStore.getState().session.decisions.map((decision) => decision.action)).toEqual([
      'submit_hero',
    ]);
    expect(useAppStore.getState().session.reviewToken?.gateId).toBe('specialist');
  });
  it('high-speed guided playback stops exactly at the artifact interaction until acknowledged', () => {
    submit();
    useAppStore.getState().setJourneyActive(true);
    useAppStore.getState().setSpeed(30);
    useAppStore.getState().seek(45);
    useAppStore.getState().play();
    useAppStore.getState().tick(0.5);
    expect(useAppStore.getState().cursor).toBe(50);
    useAppStore.getState().play();
    useAppStore.getState().tick(0.5);
    expect(useAppStore.getState().cursor).toBe(50);
    useAppStore.getState().acknowledgeJourneyCue(50);
    useAppStore.getState().play();
    useAppStore.getState().tick(0.5);
    expect(useAppStore.getState().cursor).toBe(65);
  });
  it('household Next targets that request’s actual transition while approvals remain explicit', () => {
    submit();
    const before = snapshotForState(useAppStore.getState());
    const target = nextProgressionTime(before, 'JB-R036');
    const result = useAppStore.getState().advanceNext('JB-R036');
    expect(result.cursor).toBe(Math.min(target, 74));
    expect(useAppStore.getState().session.decisions.map((decision) => decision.action)).toEqual([
      'submit_hero',
    ]);
    expect(result.cursor).toBeGreaterThan(32);
  });
  it('new speeds survive export/import and live speed never advances the tutorial clock', () => {
    useAppStore.getState().setSpeed(30);
    const data = JSON.parse(exportSessionJson());
    expect(importSessionJson(JSON.stringify(data)).ok).toBe(true);
    expect(useAppStore.getState().speed).toBe(30);
    useNetworkStore.getState().setLiveSpeed(10);
    useNetworkStore.getState().tick(2);
    expect(useNetworkStore.getState().elapsedSeconds).toBe(20);
    expect(useAppStore.getState().cursor).toBe(0);
    expect(useAppStore.getState().session.decisions).toEqual([]);
  });
});
