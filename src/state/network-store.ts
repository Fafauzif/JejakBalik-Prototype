import { create } from 'zustand';
import { PLAYBACK_SPEEDS } from '../domain/playback';
import { getVisualElapsedSeconds } from '../graphics/visual-clock';

export type NetworkView = 'live' | 'tutorial';
interface NetworkState {
  view: NetworkView;
  elapsedSeconds: number;
  sampledAt: number | null;
  livePaused: boolean;
  liveSpeed: number;
  setLiveSpeed: (speed: number) => void;
  setView: (view: NetworkView) => void;
  tick: (deltaSeconds: number) => void;
  advanceClock: (sampledAt: number) => void;
  toggleLive: () => void;
}

/** The continuous operating clock never writes to the user's authored story session. */
export const useNetworkStore = create<NetworkState>((set, get) => ({
  view: 'live',
  elapsedSeconds: 0,
  sampledAt: null,
  livePaused: false,
  liveSpeed: 1,
  setLiveSpeed: (liveSpeed) => {
    if (!(PLAYBACK_SPEEDS as readonly number[]).includes(liveSpeed)) return;
    const state = get();
    const now = performance.now();
    set({
      elapsedSeconds: getVisualElapsedSeconds(state, now),
      sampledAt: state.sampledAt === null ? null : now,
      liveSpeed,
    });
  },
  setView: (view) => set({ view }),
  tick: (deltaSeconds) => {
    if (get().livePaused || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    set((state) => ({
      elapsedSeconds: state.elapsedSeconds + deltaSeconds * state.liveSpeed,
      sampledAt: state.sampledAt === null ? null : performance.now(),
    }));
  },
  advanceClock: (sampledAt) => {
    if (!Number.isFinite(sampledAt)) return;
    const state = get();
    // A paused view should not rerender the application on every clock sample.
    if (state.livePaused) return;
    if (state.sampledAt !== null && sampledAt < state.sampledAt) return;
    set({ elapsedSeconds: getVisualElapsedSeconds(state, sampledAt), sampledAt });
  },
  toggleLive: () => {
    const state = get();
    const now = performance.now();
    set({
      elapsedSeconds: getVisualElapsedSeconds(state, now),
      sampledAt: state.sampledAt === null ? null : now,
      livePaused: !state.livePaused,
    });
  },
}));

/** The fleet, follow camera, hub and compatibility view share one display time. */
export function readLiveVisualSeconds(reducedMotion = false): number {
  const sample = useNetworkStore.getState();
  return reducedMotion ? sample.elapsedSeconds : getVisualElapsedSeconds(sample, performance.now());
}
