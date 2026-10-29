import { useMemo } from 'react';
import { getLiveOperationsFrame } from '../domain/live-operations';
import { useNetworkStore } from './network-store';

/** Shared authored operating clock; no scenario decision or persistence side effects. */
export function useOperatingFrame() {
  const elapsed = useNetworkStore((state) => state.elapsedSeconds);
  return useMemo(() => getLiveOperationsFrame(elapsed), [elapsed]);
}
