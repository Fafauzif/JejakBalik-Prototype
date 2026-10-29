import { afterEach, describe, expect, it, vi } from 'vitest';
import { RENDERER_STARTUP_TIMEOUT_MS, startRendererAttempt } from './renderer-startup';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(() => vi.useRealTimers());
describe('bounded optional renderer startup', () => {
  it('does not mistake a downloaded module or created context for a rendered frame', async () => {
    vi.useFakeTimers();
    const onImported = vi.fn();
    const onFailure = vi.fn();
    startRendererAttempt({ importRenderer: async () => 'renderer', onImported, onFailure });
    await flush();
    expect(onImported).toHaveBeenCalledWith('renderer');
    expect(onFailure).not.toHaveBeenCalled();
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS);
    expect(onFailure).toHaveBeenCalledExactlyOnceWith('timeout');
  });
  it('bounds a stalled import and discards its eventual completion', async () => {
    vi.useFakeTimers();
    const pending = deferred<string>();
    const onImported = vi.fn();
    const onFailure = vi.fn();
    const attempt = startRendererAttempt({ importRenderer: () => pending.promise, onImported, onFailure });
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS);
    pending.resolve('late renderer');
    await flush();
    expect(onFailure).toHaveBeenCalledExactlyOnceWith('timeout');
    expect(onImported).not.toHaveBeenCalled();
    expect(attempt.ready()).toBe(false);
  });
  it('reports an import rejection once and cancels its deadline', async () => {
    vi.useFakeTimers();
    const onFailure = vi.fn();
    startRendererAttempt({
      importRenderer: () => Promise.reject(new Error('chunk offline')),
      onImported: vi.fn(),
      onFailure,
    });
    await flush();
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS * 2);
    expect(onFailure).toHaveBeenCalledExactlyOnceWith('import');
  });
  it('handles a synchronous importer failure without an unhandled rejection', async () => {
    vi.useFakeTimers();
    const onFailure = vi.fn();
    startRendererAttempt({
      importRenderer: () => {
        throw new Error('blocked module');
      },
      onImported: vi.fn(),
      onFailure,
    });
    await flush();
    expect(onFailure).toHaveBeenCalledExactlyOnceWith('import');
  });
  it('keeps a healthy rendered view ready after the startup deadline', async () => {
    vi.useFakeTimers();
    const onFailure = vi.fn();
    const attempt = startRendererAttempt({
      importRenderer: async () => 'renderer',
      onImported: vi.fn(),
      onFailure,
    });
    await flush();
    expect(attempt.ready()).toBe(true);
    expect(attempt.ready()).toBe(false);
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS * 5);
    expect(onFailure).not.toHaveBeenCalled();
  });
  it('leaves an intentional 2D choice alone when its canceled 3D download finishes', async () => {
    vi.useFakeTimers();
    const pending = deferred<string>();
    const onImported = vi.fn();
    const onFailure = vi.fn();
    const attempt = startRendererAttempt({ importRenderer: () => pending.promise, onImported, onFailure });
    await flush();
    attempt.cancel();
    pending.resolve('renderer');
    await flush();
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS * 2);
    expect(onImported).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
    expect(attempt.ready()).toBe(false);
  });
  it('allows a fresh attempt after a failure without accepting the old attempt', async () => {
    vi.useFakeTimers();
    const old = startRendererAttempt({
      importRenderer: () => new Promise<string>(() => {}),
      onImported: vi.fn(),
      onFailure: vi.fn(),
    });
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS);
    const onImported = vi.fn();
    const onFailure = vi.fn();
    const next = startRendererAttempt({
      importRenderer: async () => 'fresh renderer',
      onImported,
      onFailure,
    });
    await flush();
    expect(old.ready()).toBe(false);
    expect(next.ready()).toBe(true);
    expect(onImported).toHaveBeenCalledExactlyOnceWith('fresh renderer');
    vi.advanceTimersByTime(RENDERER_STARTUP_TIMEOUT_MS);
    expect(onFailure).not.toHaveBeenCalled();
  });
});
