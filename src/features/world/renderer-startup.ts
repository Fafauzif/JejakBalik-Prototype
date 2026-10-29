/** One bounded renderer attempt. Import completion alone is not a rendered-frame signal. */
export const RENDERER_STARTUP_TIMEOUT_MS = 12_000;
export type RendererStartupFailure = 'import' | 'timeout';
export interface RendererAttempt {
  ready: () => boolean;
  cancel: () => void;
}
export function startRendererAttempt<T>({
  importRenderer,
  onImported,
  onFailure,
  timeoutMs = RENDERER_STARTUP_TIMEOUT_MS,
}: {
  importRenderer: () => Promise<T>;
  onImported: (renderer: T) => void;
  onFailure: (reason: RendererStartupFailure) => void;
  timeoutMs?: number;
}): RendererAttempt {
  let active = true;
  let ready = false;
  const fail = (reason: RendererStartupFailure) => {
    if (!active || ready) return;
    active = false;
    clearTimeout(timer);
    onFailure(reason);
  };
  const timer = setTimeout(() => fail('timeout'), timeoutMs);
  // The microtask also turns a synchronous importer exception into a handled rejection.
  Promise.resolve()
    .then(importRenderer)
    .then(
      (renderer) => {
        if (active && !ready) onImported(renderer);
      },
      () => fail('import'),
    );
  return {
    ready: () => {
      if (!active || ready) return false;
      ready = true;
      clearTimeout(timer);
      return true;
    },
    cancel: () => {
      active = false;
      clearTimeout(timer);
    },
  };
}
