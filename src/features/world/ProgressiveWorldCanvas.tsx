import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import SceneFallback from '../../graphics/SceneFallback';
import { Button } from '../../components/ui';
import { startRendererAttempt, type RendererAttempt } from './renderer-startup';
import type { WorldCanvasProps } from './world-types';
import './world-loader.css';

type Renderer = ComponentType<WorldCanvasProps>;
type ViewState = 'loading' | 'ready' | 'timeout' | 'error' | '2d';
class RendererBoundary extends Component<
  { children: ReactNode; onFailure: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onFailure(error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The map and controls never wait for the optional GPU renderer. */
export default function ProgressiveWorldCanvas(props: WorldCanvasProps) {
  const [Renderer, setRenderer] = useState<Renderer | null>(null);
  const [state, setState] = useState<ViewState>('loading');
  const [attemptNumber, setAttemptNumber] = useState(0);
  const attempt = useRef<RendererAttempt | null>(null);
  const acceptFailures = useRef(true);
  const latestProps = useRef(props);
  latestProps.current = props;
  useEffect(() => {
    setState('loading');
    setRenderer(null);
    acceptFailures.current = true;
    if (typeof WebGL2RenderingContext === 'undefined') {
      setState('error');
      return;
    }
    const current = startRendererAttempt({
      importRenderer: () => import('./WorldCanvas'),
      onImported: (module) => setRenderer(() => module.default),
      onFailure: (reason) => {
        acceptFailures.current = false;
        setRenderer(null);
        setState(reason === 'timeout' ? 'timeout' : 'error');
        latestProps.current.onError?.(
          reason === 'timeout' ? '3D startup exceeded 12 seconds' : '3D renderer could not be downloaded',
        );
      },
    });
    attempt.current = current;
    return () => {
      acceptFailures.current = false;
      current.cancel();
    };
  }, [attemptNumber]);
  const rendered = useCallback(() => {
    if (attempt.current?.ready()) {
      setState('ready');
      latestProps.current.onReady?.();
    }
  }, []);
  const failed = useCallback((message: string) => {
    if (!acceptFailures.current) return;
    acceptFailures.current = false;
    attempt.current?.cancel();
    setRenderer(null);
    setState('error');
    latestProps.current.onError?.(message);
  }, []);
  const use2D = () => {
    acceptFailures.current = false;
    attempt.current?.cancel();
    setRenderer(null);
    setState('2d');
  };
  const retry = () => {
    attempt.current?.cancel();
    setState('loading');
    setRenderer(null);
    setAttemptNumber((value) => value + 1);
  };
  const en = props.language === 'en';
  const ready = state === 'ready';
  const message =
    state === 'loading'
      ? en
        ? 'Interactive map ready. Preparing 3D…'
        : 'Peta interaktif siap. Menyiapkan 3D…'
      : ready
        ? en
          ? '3D view'
          : 'Tampilan 3D'
        : state === '2d'
          ? en
            ? 'Interactive 2D view'
            : 'Tampilan 2D interaktif'
          : en
            ? '3D could not start. You can keep using the map.'
            : '3D belum dapat dibuka. Peta tetap bisa digunakan.';
  return (
    <div className="progressive-world" data-renderer-state={state}>
      {!ready && <SceneFallback {...props} />}
      {Renderer && (
        <div
          className={`progressive-world-canvas${ready ? ' is-ready' : ''}`}
          aria-hidden={!ready}
          inert={!ready}
        >
          <RendererBoundary key={attemptNumber} onFailure={failed}>
            <Renderer {...props} onReady={rendered} onError={failed} />
          </RendererBoundary>
        </div>
      )}
      <section
        className={`world-renderer-control${ready || state === '2d' ? ' is-compact' : ''}`}
        aria-label={en ? 'Map display' : 'Tampilan peta'}
        data-world-exclusion
      >
        <p role="status">{message}</p>
        <div>
          {state !== 'loading' && !ready && (
            <Button variant="secondary" size="sm" onClick={retry}>
              {en ? (state === '2d' ? 'Try 3D' : 'Retry 3D') : 'Coba 3D'}
            </Button>
          )}
          {state !== '2d' && (
            <Button variant="secondary" size="sm" onClick={use2D}>
              {en ? 'Use 2D' : 'Gunakan 2D'}
            </Button>
          )}
          {state === 'error' && (
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              {en ? 'Reload' : 'Muat ulang'}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
