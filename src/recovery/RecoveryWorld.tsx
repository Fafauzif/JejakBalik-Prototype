import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Layers2, Box, RotateCcw, MousePointer2 } from 'lucide-react';
import type { RecoveryWorldProps, Point } from './types';
import './world-style.css';
import { additionalSegments } from './world-paths';

const Scene = lazy(() => import('./world-scene'));
const axes = [-36, -24, -12, 0, 12, 24, 36];
const p = ([x, z]: Point) => [480 + x * 9.2, 326 + z * 6.5];
const line = (points: Point[]) => points.map((v, i) => `${i ? 'L' : 'M'} ${p(v).join(' ')}`).join(' ');
function fixedPath(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const prev = out.at(-1);
    if (prev && prev[0] !== point[0] && prev[1] !== point[1]) out.push([point[0], prev[1]]);
    out.push(point);
  }
  return out;
}
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function FlatWorld(props: RecoveryWorldProps) {
  const { scenario, plan, selected, onSelect, locale } = props;
  const activeJourney =
    selected?.kind === 'journey'
      ? selected.id
      : selected?.kind === 'request'
        ? plan.assignments.find((a) => a.requestId === selected.id)?.journeyId
        : undefined;
  const selectKey = (event: React.KeyboardEvent, kind: 'request' | 'journey' | 'receiver', id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect({ kind, id });
    }
  };
  return (
    <svg
      viewBox="0 0 960 660"
      className="recovery-flat-map"
      role="group"
      aria-label={locale === 'id' ? 'Peta jaringan interaktif' : 'Interactive network map'}
    >
      <defs>
        <filter id="map-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#243c2e" floodOpacity=".1" />
        </filter>
      </defs>
      <rect x="40" y="30" width="880" height="600" rx="32" fill="#e9ecdf" />
      {axes.slice(0, -1).flatMap((x, i) =>
        axes.slice(0, -1).map((z, j) => {
          const [xx, yy] = p([x + 6, z + 6]);
          return (
            <g key={`${i}-${j}`} opacity=".8">
              <rect
                x={xx - 40}
                y={yy - 24}
                width="80"
                height="48"
                rx="5"
                fill={i === 2 && j === 2 ? '#becba9' : (i + j) % 4 === 0 ? '#d5d8bd' : '#dedcc9'}
              />
              {[0, 1, 2].map((n) => (
                <rect
                  key={n}
                  x={xx - 32 + n * 24}
                  y={yy - 16}
                  width="17"
                  height="29"
                  rx="2"
                  fill={(i + j) % 3 === 0 ? '#b6c7bb' : '#c9bfa8'}
                />
              ))}
            </g>
          );
        }),
      )}
      {axes.map((a) => (
        <g key={a}>
          <path
            d={line([
              [a, -40],
              [a, 40],
            ])}
            stroke="#b6beb0"
            strokeWidth="17"
          />
          <path
            d={line([
              [-40, a],
              [40, a],
            ])}
            stroke="#b6beb0"
            strokeWidth="17"
          />
          <path
            d={line([
              [a, -40],
              [a, 40],
            ])}
            stroke="#e9e8d9"
            strokeWidth="1.2"
            strokeDasharray="6 8"
          />
          <path
            d={line([
              [-40, a],
              [40, a],
            ])}
            stroke="#e9e8d9"
            strokeWidth="1.2"
            strokeDasharray="6 8"
          />
        </g>
      ))}
      {scenario.journeys.map((j) => {
        const route = plan.routes.find((r) => r.journeyId === j.id);
        const color = scenario.providers.find((pr) => pr.id === j.providerId)?.color || '#2d6753';
        const original = route?.originalPath || fixedPath([j.origin, ...j.stops, j.destination]);
        return (
          <g
            key={j.id}
            opacity={!j.available?.valueOf() ? 0.14 : activeJourney && activeJourney !== j.id ? 0.14 : 0.8}
          >
            <path d={line(original)} stroke={color} strokeWidth="2.4" strokeDasharray="7 7" fill="none" />
            {route && (
              <path
                d={line(route.path)}
                stroke={color}
                strokeWidth={activeJourney === j.id ? 5 : 2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {route &&
              activeJourney === j.id &&
              additionalSegments(original, route.path).map((segment, index) => (
                <path
                  key={`extra-${index}`}
                  d={line(segment)}
                  fill="none"
                  stroke="#b46f43"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              ))}
            <g
              transform={`translate(${p(j.origin).join(' ')})`}
              className="world-svg-action"
              tabIndex={0}
              role="button"
              aria-label={j.name}
              onClick={() => onSelect({ kind: 'journey', id: j.id })}
              onKeyDown={(e) => selectKey(e, 'journey', j.id)}
            >
              <rect
                x="-12"
                y="-8"
                width="24"
                height="16"
                rx="4"
                fill={color}
                stroke="#fffefa"
                strokeWidth="2"
              />
              <path d="M-6-5H0V0H-6Z" fill="#d7e9e4" />
              <title>{j.name}</title>
            </g>
          </g>
        );
      })}
      {scenario.receivers.map((receiver) => {
        const [x, y] = p(receiver.position);
        const isSelected = selected?.id === receiver.id;
        return (
          <g
            key={receiver.id}
            transform={`translate(${x} ${y})`}
            className="world-svg-action"
            tabIndex={0}
            role="button"
            aria-label={receiver.name}
            onClick={() => onSelect({ kind: 'receiver', id: receiver.id })}
            onKeyDown={(e) => selectKey(e, 'receiver', receiver.id)}
            filter="url(#map-shadow)"
          >
            {isSelected && <circle r="27" fill="none" stroke="#a95135" strokeWidth="2" />}
            <rect
              x="-19"
              y="-20"
              width="38"
              height="34"
              rx="5"
              fill={receiver.available ? '#f9f6e9' : '#d3c8b8'}
              stroke="#557c61"
              strokeWidth="2"
            />
            <path d="M-23-14L0-28L23-14Z" fill="#557c61" />
            <rect x="-11" y="-4" width="9" height="18" fill="#b5c4b5" />
            <rect x="3" y="-4" width="9" height="18" fill="#b5c4b5" />
            <title>{receiver.name}</title>
            <text y="-37" textAnchor="middle" className="world-svg-label">
              {receiver.name}
            </text>
          </g>
        );
      })}
      {scenario.requests.map((request, i) => {
        const [x, y] = p(request.position),
          isSelected = selected?.kind === 'request' && selected.id === request.id,
          assigned = plan.assignments.some((a) => a.requestId === request.id);
        return (
          <g
            key={request.id}
            transform={`translate(${x} ${y})`}
            className="world-svg-action"
            tabIndex={0}
            role="button"
            aria-label={`${request.id}: ${request.label}`}
            onClick={() => onSelect({ kind: 'request', id: request.id })}
            onKeyDown={(e) => selectKey(e, 'request', request.id)}
          >
            {isSelected && <circle r="19" fill="#fffefa" stroke="#a95135" strokeWidth="2" />}
            <circle
              r={isSelected ? 10 : 7}
              fill={request.phase === 'completed' ? '#467658' : assigned ? '#fffefa' : '#ad734b'}
              stroke={isSelected ? '#a95135' : '#467658'}
              strokeWidth="2"
            />
            {isSelected && (
              <text y="-27" textAnchor="middle" className="world-svg-label">
                {request.id}
              </text>
            )}
            <title>{request.label}</title>
          </g>
        );
      })}
    </svg>
  );
}
export default function RecoveryWorld(props: RecoveryWorldProps) {
  const [flat, setFlat] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [resetKey, setResetKey] = useState(0),
    [attempt, setAttempt] = useState(0),
    [exploded, setExploded] = useState(false);
  const useFlat = !!props.force2D || flat || failed;
  useEffect(() => setExploded(false), [props.selected?.id]);
  useEffect(() => {
    setReady(false);
  }, [attempt]);
  useEffect(() => {
    if (ready || useFlat) return;
    const timeout = window.setTimeout(() => {
      setFailed(true);
      setReady(false);
    }, 20000);
    return () => window.clearTimeout(timeout);
  }, [ready, useFlat, attempt]);
  const selectedLabel =
    props.selected?.kind === 'request'
      ? props.scenario.requests.find((r) => r.id === props.selected?.id)?.label
      : props.selected?.kind === 'journey'
        ? props.scenario.journeys.find((j) => j.id === props.selected?.id)?.name
        : props.scenario.receivers.find((r) => r.id === props.selected?.id)?.name;
  return (
    <div
      className={`recovery-world ${ready && !useFlat ? 'is-3d' : 'is-map'}`}
      data-renderer={ready && !useFlat ? 'webgl' : 'map'}
      data-view={props.view}
    >
      <div className="world-map-layer" aria-hidden={ready && !useFlat} inert={ready && !useFlat}>
        <FlatWorld {...props} />
      </div>
      {!useFlat && (
        <div className="world-canvas-layer">
          <SceneBoundary
            key={attempt}
            onFailure={() => {
              setFailed(true);
              setReady(false);
            }}
          >
            <Suspense fallback={null}>
              <Scene
                {...props}
                resetKey={resetKey}
                exploded={exploded}
                onReady={() => setReady(true)}
                onFailure={() => {
                  setFailed(true);
                  setReady(false);
                }}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      {props.view === 'device' && ready && !useFlat && (
        <div className="world-device-tools">
          <button
            type="button"
            className="world-device-button"
            onClick={() => setExploded((v) => !v)}
            aria-pressed={exploded}
          >
            {props.locale === 'id'
              ? exploded
                ? 'Rakit tampilan'
                : 'Lihat komponen'
              : exploded
                ? 'Assembled view'
                : 'Inspect components'}
          </button>
        </div>
      )}
      <div className="world-tools" aria-label={props.locale === 'id' ? 'Kontrol tampilan' : 'View controls'}>
        <button
          type="button"
          aria-pressed={!useFlat}
          disabled={props.force2D}
          title={
            props.force2D
              ? props.locale === 'id'
                ? 'Ubah preferensi 2D di Pengaturan'
                : 'Change the 2D preference in Settings'
              : undefined
          }
          onClick={() => {
            setFlat(false);
            setFailed(false);
            setAttempt((v) => v + 1);
          }}
        >
          <Box size={15} />
          3D
        </button>
        <button type="button" aria-pressed={useFlat} onClick={() => setFlat(true)}>
          <Layers2 size={15} />
          {props.locale === 'id' ? 'Peta' : 'Map'}
        </button>
        {!useFlat && (
          <button
            type="button"
            aria-label={props.locale === 'id' ? 'Atur ulang kamera' : 'Reset camera'}
            onClick={() => setResetKey((v) => v + 1)}
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
      {useFlat && props.view !== 'city' && (
        <div className="world-map-context">
          {props.locale === 'id' ? 'Peta konteks' : 'Context map'}
          <strong>
            {selectedLabel ||
              (props.locale === 'id' ? 'Pilih objek untuk diperiksa' : 'Select an object to inspect')}
          </strong>
        </div>
      )}
      {(props.view === 'city' || !ready || useFlat) && (
        <div className="world-legend">
          <span>
            <i className="world-line-original" />
            {props.locale === 'id' ? 'Perjalanan awal' : 'Original journey'}
          </span>
          <span>
            <i className="world-line-recovery" />
            {props.locale === 'id' ? 'Rencana pengambilan' : 'Recovery plan'}
          </span>
          <span>
            <i className="world-line-additional" />
            {props.locale === 'id' ? 'Lintasan tambahan' : 'Additional traversal'}
          </span>
        </div>
      )}
      {props.force2D === undefined && (
        <div className="world-interaction-hint">
          <MousePointer2 size={13} />
          {props.locale === 'id'
            ? 'Pilih kendaraan, perangkat, atau tujuan'
            : 'Select a vehicle, device, or receiver'}
        </div>
      )}
      {!ready && !useFlat && (
        <div className="world-render-notice" role="status">
          {props.locale === 'id'
            ? 'Menyiapkan kota 3D. Peta tetap dapat digunakan.'
            : 'Preparing 3D. The map is ready to use.'}
        </div>
      )}
      {failed && (
        <div className="world-render-notice" role="status">
          {props.locale === 'id' ? 'Peta interaktif aktif.' : 'Interactive map active.'}
        </div>
      )}
    </div>
  );
}
