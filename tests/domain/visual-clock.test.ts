import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVisualElapsedSeconds, type VisualClockSample } from '../../src/graphics/visual-clock';
import { getLiveVehiclePose } from '../../src/domain/live-operations';
import { vehicles } from '../../src/domain/fixtures';
import { readLiveVisualSeconds, useNetworkStore } from '../../src/state/network-store';

let now = 0;

beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  useNetworkStore.setState({
    view: 'live',
    elapsedSeconds: 0,
    sampledAt: null,
    livePaused: false,
    liveSpeed: 1,
  });
});

afterEach(() => {
  useNetworkStore.setState({ elapsedSeconds: 0, sampledAt: null, livePaused: false, liveSpeed: 1 });
  vi.restoreAllMocks();
});

describe('shared visual operating clock', () => {
  it.each([1, 2, 5, 10, 30])('preserves fleet positions through 80ms delayed renders at %i×', (speed) => {
    const sample: VisualClockSample = {
      elapsedSeconds: 93,
      sampledAt: 1000,
      liveSpeed: speed,
      livePaused: false,
    };
    // React may consume this sample at 1080ms. Its timestamp remains 1000ms.
    const beforeReactCommit = getVisualElapsedSeconds(sample, 1079.9);
    const afterReactCommit = getVisualElapsedSeconds({ ...sample }, 1080.1);
    expect(afterReactCommit).toBeGreaterThan(beforeReactCommit);
    expect(afterReactCommit - beforeReactCommit).toBeCloseTo((0.2 / 1000) * speed, 10);
    for (const vehicle of vehicles) {
      const before = getLiveVehiclePose(vehicle.id, beforeReactCommit)!;
      const after = getLiveVehiclePose(vehicle.id, afterReactCommit)!;
      expect(
        Math.hypot(before.position[0] - after.position[0], before.position[1] - after.position[1]),
      ).toBeLessThan(0.05);
    }
    expect(getVisualElapsedSeconds(sample, 1080)).toBeCloseTo(93 + 0.08 * speed, 10);
  });

  it('keeps every renderer continuous through authoritative 100ms source samples at 30×', () => {
    useNetworkStore.getState().setLiveSpeed(30);
    useNetworkStore.getState().advanceClock(0);
    let previous = 0;
    for (now = 1; now <= 60_000; now++) {
      if (now % 100 === 0) useNetworkStore.getState().advanceClock(now);
      const displayTime = readLiveVisualSeconds();
      expect(displayTime).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(displayTime).toBeCloseTo(now * 0.03, 7);
      previous = displayTime;
    }
    expect(useNetworkStore.getState().elapsedSeconds).toBe(1800);
  });

  it('changes speed between source ticks without counting the prior interval at the new speed', () => {
    useNetworkStore.getState().advanceClock(now);
    now = 50;
    expect(readLiveVisualSeconds()).toBeCloseTo(0.05);
    useNetworkStore.getState().setLiveSpeed(30);
    expect(readLiveVisualSeconds()).toBeCloseTo(0.05);
    now = 100;
    useNetworkStore.getState().advanceClock(now);
    expect(readLiveVisualSeconds()).toBeCloseTo(1.55);
    now = 170;
    useNetworkStore.getState().setLiveSpeed(2);
    expect(readLiveVisualSeconds()).toBeCloseTo(3.65);
    now = 200;
    useNetworkStore.getState().advanceClock(now);
    expect(readLiveVisualSeconds()).toBeCloseTo(3.71);
  });

  it('freezes the exact displayed position on pause and resumes without a catch-up jump', () => {
    useNetworkStore.getState().setLiveSpeed(30);
    useNetworkStore.getState().advanceClock(now);
    now = 80;
    const beforePause = readLiveVisualSeconds();
    useNetworkStore.getState().toggleLive();
    expect(readLiveVisualSeconds()).toBe(beforePause);
    const pausedState = useNetworkStore.getState();
    now = 10_000;
    useNetworkStore.getState().advanceClock(now);
    expect(useNetworkStore.getState()).toBe(pausedState);
    expect(readLiveVisualSeconds()).toBe(beforePause);
    now = 10_050;
    useNetworkStore.getState().toggleLive();
    expect(readLiveVisualSeconds()).toBe(beforePause);
    now = 10_100;
    useNetworkStore.getState().advanceClock(now);
    expect(readLiveVisualSeconds()).toBeCloseTo(beforePause + 1.5);
  });

  it('rejects old samples and invalid timestamps without moving backwards or corrupting the clock', () => {
    useNetworkStore.getState().advanceClock(0);
    now = 150;
    useNetworkStore.getState().advanceClock(now);
    const before = useNetworkStore.getState();
    for (const invalid of [100, Number.NaN, Number.POSITIVE_INFINITY])
      useNetworkStore.getState().advanceClock(invalid);
    expect(useNetworkStore.getState()).toBe(before);
    expect(readLiveVisualSeconds()).toBeCloseTo(0.15);
  });

  it('retains deterministic manual stepping and a still reduced-motion frame', () => {
    useNetworkStore.getState().setLiveSpeed(10);
    useNetworkStore.getState().tick(2);
    expect(useNetworkStore.getState().elapsedSeconds).toBe(20);
    useNetworkStore.getState().advanceClock(now);
    now = 90;
    expect(readLiveVisualSeconds()).toBeCloseTo(20.9);
    expect(readLiveVisualSeconds(true)).toBe(20);
  });
});
