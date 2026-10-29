export interface VisualClockSample {
  elapsedSeconds: number;
  /** The monotonic time at which elapsedSeconds was measured, before React renders. */
  sampledAt: number | null;
  liveSpeed: number;
  livePaused: boolean;
}

/**
 * Project the shared operating sample to a display frame. Keeping the original
 * timestamp makes a delayed React render harmless, including at 30× playback.
 */
export function getVisualElapsedSeconds(sample: VisualClockSample, now: number): number {
  if (sample.livePaused || sample.sampledAt === null || !Number.isFinite(now)) return sample.elapsedSeconds;
  return sample.elapsedSeconds + (Math.max(0, now - sample.sampledAt) / 1000) * sample.liveSpeed;
}
