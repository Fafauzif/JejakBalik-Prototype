import { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { WorldCanvasProps } from '../features/world/world-types';
import { makeCity, allRoads, adaptCityToRoads } from './city-geometry';
import { getVehiclePose } from '../domain';
import { getLiveVehiclePose, liveRoadPaths } from '../domain/live-operations';
import { HUB_ZONES, getHubZoneAssets, getHubConveyorPose, getHubCartPose, getHubDockPose } from './hub-data';
import world from './world-data.json';
import partners from '../domain/data/PARTNERS.json';
import { getLiveVehicleProfile } from '../domain/partner-logistics';
import { getPartnerStyle } from './partner-styles';
import type { Point } from './city-geometry';
import { layoutLabels, type LabelPlacement, type LabelRect } from './label-layout';
import { settleLabelVisibility, type SettledVisibility } from './label-visibility';
import { readLiveVisualSeconds } from '../state/network-store';
type Project = (p: Point) => [number, number];
const cityProject: Project = ([x, y, z]) => [600 + (x - z) * 4.65, 340 + (x + z) * 2.15 - y * 5.9];
const hubProject: Project = ([x, y, z]) => [610 + (x - z) * 18, 330 + (x + z) * 8.3 - y * 19];
function useVisualTime(props: WorldCanvasProps) {
  const incoming = props.liveFrame?.elapsedSeconds ?? props.cursor;
  const [time, setTime] = useState(incoming);
  const running = !!props.liveFrame && !props.paused && !props.reducedMotion;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = -Infinity;
    const update = (now: number) => {
      if (now - last >= 1000 / 30) {
        setTime(readLiveVisualSeconds());
        last = now;
      }
      frame = requestAnimationFrame(update);
    };
    setTime(readLiveVisualSeconds());
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  return running ? time : incoming;
}
type MapBlocker = { p: Point; s: Point };
/** The compatibility view is a fixed orthographic projection: ray/AABB tests match its drawn boxes. */
function mapAnchorOccluded(anchor: Point, blockers: readonly MapBlocker[], project: Project) {
  const direction = project === hubProject ? [1, 16.6 / 19, 1] : [1, 4.3 / 5.9, 1];
  return blockers.some((box) => {
    let near = 0.12,
      far = Infinity;
    for (let axis = 0; axis < 3; axis++) {
      const min = box.p[axis] - box.s[axis] / 2;
      const max = box.p[axis] + box.s[axis] / 2;
      near = Math.max(near, (min - anchor[axis]) / direction[axis]);
      far = Math.min(far, (max - anchor[axis]) / direction[axis]);
    }
    return far >= near;
  });
}
function points(points: Point[], project: Project) {
  return points
    .map(project)
    .map((p) => p.join(','))
    .join(' ');
}
function IsoBox({
  p,
  s,
  color,
  project = cityProject,
  onClick,
}: {
  p: Point;
  s: Point;
  color: string;
  project?: Project;
  onClick?: () => void;
}) {
  const [x, y, z] = p,
    [w, h, d] = s;
  const a: [number, number, number] = [x - w / 2, y + h / 2, z - d / 2],
    b: Point = [x + w / 2, y + h / 2, z - d / 2],
    c: Point = [x + w / 2, y + h / 2, z + d / 2],
    e: Point = [x - w / 2, y + h / 2, z + d / 2],
    f: Point = [x + w / 2, y - h / 2, z - d / 2],
    g: Point = [x + w / 2, y - h / 2, z + d / 2],
    j: Point = [x - w / 2, y - h / 2, z + d / 2];
  return (
    <g onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <polygon points={points([b, c, g, f], project)} fill={color} style={{ filter: 'brightness(.85)' }} />
      <polygon points={points([c, e, j, g], project)} fill={color} style={{ filter: 'brightness(.95)' }} />
      <polygon points={points([a, b, c, e], project)} fill={color} />
    </g>
  );
}
interface MapAnnotation {
  id: string;
  p: Point;
  label: string;
  onClick: () => void;
  accent?: boolean;
  selected?: boolean;
  priority?: number;
  tone?: string;
}
let labelMeasureContext: CanvasRenderingContext2D | null = null;
function measureMapText(text: string, font: number) {
  if (!labelMeasureContext && typeof document !== 'undefined')
    labelMeasureContext = document.createElement('canvas').getContext('2d');
  if (!labelMeasureContext) return text.length * font * 0.66;
  labelMeasureContext.font = `650 ${font}px "Plus Jakarta Sans", sans-serif`;
  return labelMeasureContext.measureText(text).width;
}
function MapLabels({
  labels,
  project = cityProject,
  blockers = [],
}: {
  labels: MapAnnotation[];
  project?: Project;
  blockers?: readonly MapBlocker[];
}) {
  const layer = useRef<SVGGElement>(null);
  const previous = useRef(new Map<string, LabelPlacement>());
  const visibility = useRef(new Map<string, SettledVisibility>());
  const [, recheckVisibility] = useState(0);
  const [viewport, setViewport] = useState({
    width: 1200,
    height: 700,
    scale: 1,
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    exclusions: [] as LabelRect[],
  });
  const measure = () => {
    const svg = layer.current?.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect(),
      box = svg.viewBox.baseVal;
    const scale = Math.min(rect.width / box.width, rect.height / box.height);
    if (!scale) return;
    const exclusions = [
      ...(svg.closest('.world-scene') || svg).querySelectorAll<HTMLElement>(
        '.world-location, .world-legend, .scene-bottom-button, .scene-help, .world-renderer-control, [data-world-exclusion]',
      ),
      ...document.querySelectorAll<HTMLElement>('.main-nav'),
    ]
      .filter(
        (element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden',
      )
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left - rect.left,
          top: bounds.top - rect.top,
          width: bounds.width,
          height: bounds.height,
        };
      });
    const next = {
      width: rect.width,
      height: rect.height,
      scale,
      x: box.x,
      y: box.y,
      offsetX: (rect.width - box.width * scale) / 2,
      offsetY: (rect.height - box.height * scale) / 2,
      exclusions,
    };
    setViewport((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
  };
  useLayoutEffect(measure, []);
  useEffect(() => {
    const svg = layer.current?.ownerSVGElement;
    if (!svg) return;
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    for (const element of (svg.closest('.world-scene') || svg).querySelectorAll(
      '.world-location, .world-legend, .scene-bottom-button, .scene-help, .world-renderer-control, [data-world-exclusion]',
    ))
      observer.observe(element);
    const viewBoxObserver = new MutationObserver(measure);
    viewBoxObserver.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
    window.addEventListener('scroll', measure, true);
    document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      viewBoxObserver.disconnect();
      window.removeEventListener('scroll', measure, true);
    };
  }, []);
  const font = 11;
  const height = viewport.width < 600 ? 44 : 30;
  const candidates = labels.map((label) => {
    const [x, y] = project(label.p);
    const clear = !mapAnchorOccluded(label.p, blockers, project);
    const state = settleLabelVisibility(
      visibility.current.get(label.id) ?? { visible: clear, pending: clear, since: performance.now() },
      clear,
      performance.now(),
    );
    visibility.current.set(label.id, state);
    return {
      ...label,
      x: viewport.offsetX + (x - viewport.x) * viewport.scale,
      y: viewport.offsetY + (y - viewport.y) * viewport.scale,
      width: Math.min(viewport.width - 24, Math.max(58, measureMapText(label.label, font) + 24)),
      height,
      visible: state.visible,
    };
  });
  const placements = layoutLabels(candidates, {
    width: viewport.width,
    height: viewport.height,
    previous: previous.current,
    exclusions: viewport.exclusions,
    limit: viewport.width < 600 ? 5 : undefined,
  });
  useEffect(() => {
    const activeIds = new Set(labels.map((label) => label.id));
    for (const id of visibility.current.keys()) if (!activeIds.has(id)) visibility.current.delete(id);
    if (![...visibility.current.values()].some((state) => state.visible !== state.pending)) return;
    // A paused/tutorial map may not receive another operating-clock update.
    const timer = window.setTimeout(() => recheckVisibility((value) => value + 1), 300);
    return () => window.clearTimeout(timer);
  });
  useLayoutEffect(() => {
    previous.current = placements;
  });
  return (
    <g ref={layer}>
      {candidates.map((item) => {
        const placement = placements.get(item.id);
        if (!placement) return null;
        const x = viewport.x + (placement.x - viewport.offsetX) / viewport.scale;
        const y = viewport.y + (placement.y - viewport.offsetY) / viewport.scale;
        let text = item.label;
        while (text.length > 1 && measureMapText(text, font) > placement.width - 24)
          text = text.slice(0, text.endsWith('…') ? -2 : -1) + '…';
        return (
          <g
            key={item.id}
            transform={`translate(${x},${y}) scale(${1 / viewport.scale})`}
            onClick={item.onClick}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={item.label}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                item.onClick();
              }
            }}
          >
            <title>{item.label}</title>
            {Math.hypot(placement.x - item.x, placement.y - item.y) > 5 && (
              <line
                x1={item.x - placement.x}
                y1={item.y - placement.y}
                x2={0}
                y2={0}
                stroke="#607c69"
                strokeWidth="1"
                opacity=".45"
                pointerEvents="none"
              />
            )}
            <g data-world-label={item.id}>
              <rect
                x={-placement.width / 2}
                y={-height / 2}
                rx={8}
                width={placement.width}
                height={height}
                fill={item.accent ? '#2d6753' : '#fffdf4'}
                stroke={item.selected ? '#a95135' : item.accent ? '#2d6753' : '#d7dcc8'}
                strokeWidth={item.selected ? 2 : 1}
              />
              {item.tone && (
                <rect
                  x={-placement.width / 2}
                  y={-height / 2 + 5}
                  width={4}
                  height={height - 10}
                  rx={2}
                  fill={item.tone}
                />
              )}
              <text
                y={4}
                textAnchor="middle"
                fontSize={font}
                fontWeight="650"
                fill={item.accent ? '#fff' : '#38553f'}
              >
                {text}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
function CityFallback(props: WorldCanvasProps) {
  const visualTime = useVisualTime(props);
  const [suppressed, setSuppressed] = useState(false);
  useEffect(() => {
    if (props.cameraReset) setSuppressed(true);
  }, [props.cameraReset]);
  useEffect(() => {
    setSuppressed(false);
  }, [props.focusTarget]);
  const city = useMemo(
      () =>
        adaptCityToRoads(makeCity(false), props.liveFrame ? liveRoadPaths : props.routes.map((r) => r.path)),
      [!!props.liveFrame, JSON.stringify(props.routes.map((r) => r.path))],
    ),
    { onSelect, selectedId, routes, cursor } = props;
  const focusTarget = suppressed ? null : props.focusTarget;
  const selectedRoute = routes.find(
    (r) =>
      r.id === selectedId || r.vehicleId === selectedId || r.stops.some((s) => s.householdId === selectedId),
  );
  const allBuildings = useMemo(
    () =>
      city.bodies
        .map((b, i) => ({ b, r: city.roofs[i] }))
        .sort((a, b) => a.b.p[0] + a.b.p[2] - b.b.p[0] - b.b.p[2]),
    [city],
  );
  const district = world.districts.find((d) => d.id === focusTarget),
    hh = world.households.find((h) => h.id === focusTarget),
    partner = partners.find((p) => p.id === focusTarget),
    focus = hh?.position || district?.center || partner?.position;
  const center = focus ? cityProject([focus[0], 0, focus[1]]) : null;
  const viewBox = center ? `${center[0] - 300} ${center[1] - 220} 600 440` : '0 0 1200 700';
  const cityArtwork = useMemo(
    () => (
      <>
        <defs>
          <marker
            id="route-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="2.5"
            refY="2.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0 0 L5 2.5 L0 5Z" fill="#a95135" />
          </marker>
          <filter id="map-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <linearGradient id="map-bg" x2="0" y2="1">
            <stop stopColor="#f1eee3" />
            <stop offset="1" stopColor="#e1e0cd" />
          </linearGradient>
        </defs>
        <rect x="-1000" y="-1000" width="4000" height="4000" fill="url(#map-bg)" />
        <ellipse cx="610" cy="390" rx="475" ry="205" fill="#6d7860" opacity=".08" filter="url(#map-shadow)" />
        <polygon
          points={points(
            [
              [-66, 0, -58],
              [66, 0, -58],
              [66, 0, 58],
              [-66, 0, 58],
            ],
            cityProject,
          )}
          fill="#e4e2ce"
        />
        {city.park.map((b, i) => (
          <IsoBox key={'p' + i} p={b.p} s={b.s} color={b.color!} />
        ))}
        <polyline
          points={world.riverPolyline.map(([x, z]) => cityProject([x, 0, z]).join(',')).join(' ')}
          fill="none"
          stroke="#c7cfb5"
          strokeWidth="31"
          strokeLinejoin="round"
        />
        <polyline
          points={world.riverPolyline.map(([x, z]) => cityProject([x, 0, z]).join(',')).join(' ')}
          fill="none"
          stroke="#9dbdb1"
          strokeWidth="24"
          strokeLinejoin="round"
        />
        <polyline
          points={world.riverPolyline.map(([x, z]) => cityProject([x, 0, z]).join(',')).join(' ')}
          fill="none"
          stroke="#bdd1bf"
          strokeWidth="1.2"
          strokeDasharray="16 30"
          opacity=".6"
        />
        {[...allRoads, ...(props.liveFrame ? liveRoadPaths : routes.map((r) => r.path))].map((r, i) => (
          <g key={i}>
            <polyline
              points={r.map(([x, z]) => cityProject([x, 0.1, z]).join(',')).join(' ')}
              fill="none"
              stroke={i >= 7 ? '#b8bdac' : '#c3c6b3'}
              strokeWidth={i >= 7 ? 10 : 5.5}
              strokeLinejoin="round"
            />
            {i >= 7 && (
              <polyline
                points={r.map(([x, z]) => cityProject([x, 0.1, z]).join(',')).join(' ')}
                fill="none"
                stroke="#f0ecda"
                strokeWidth=".65"
                strokeDasharray="7 8"
              />
            )}
          </g>
        ))}
        {routes.map((r) => (
          <polyline
            key={r.id}
            points={r.path.map(([x, z]) => cityProject([x, 0.15, z]).join(',')).join(' ')}
            fill="none"
            stroke={r.guard ? '#b58d4a' : r === selectedRoute ? '#a95135' : '#4e8b66'}
            strokeWidth={r === selectedRoute ? 3.2 : 1.6}
            opacity={selectedRoute ? (r === selectedRoute ? 1 : 0.18) : 0.4}
            strokeLinejoin="round"
            markerMid={r === selectedRoute ? 'url(#route-arrow)' : undefined}
          />
        ))}
        {allBuildings.map(({ b, r }, i) => (
          <g key={i}>
            <IsoBox p={b.p} s={b.s} color={b.color!} />
            <IsoBox p={r.p} s={r.s} color={r.color!} />
            {b.s[1] > 4 &&
              [0.4, 0.7].map((t) => {
                const [x, y] = cityProject([b.p[0] + 0.1, b.s[1] * t, b.p[2] + b.s[2] / 2 + 0.01]);
                return (
                  <path
                    key={t}
                    d={`M ${x - 3} ${y - 1.3} l 6 2.7`}
                    stroke="#8dada0"
                    strokeWidth="1.3"
                    opacity=".6"
                  />
                );
              })}
          </g>
        ))}
        {city.trees.map((tree, i) => {
          const [x, y] = cityProject(tree.p),
            [tx, ty] = cityProject([tree.p[0], 0, tree.p[2]]);
          return (
            <g key={'t' + i}>
              <path d={`M${tx},${ty} L${x},${y}`} stroke="#9c8b69" strokeWidth="1.7" />
              <ellipse cx={x} cy={y} rx="4.6" ry={tree.s[1] * 4.5} fill={tree.color} />
              <ellipse cx={x - 1.3} cy={y - 1.4} rx="2.5" ry={tree.s[1] * 3} fill="#d3d7b5" opacity=".18" />
            </g>
          );
        })}
        {!props.reducedMotion && !props.paused && (
          <g opacity=".75">
            <animateTransform
              attributeName="transform"
              type="translate"
              from="493 144"
              to="980 370"
              dur="58s"
              repeatCount="indefinite"
            />
            <polygon points="0,-4 7,0 1,4 -6,0" fill="#b5ac94" />
            <polygon points="-6,0 1,4 1,8 -6,4" fill="#9e9b88" />
            <polygon points="1,4 7,0 7,4 1,8" fill="#7f8c7b" />
          </g>
        )}
        {world.households.map((h, i) => (
          <g key={h.id} onClick={() => onSelect(h.id, 'household')} style={{ cursor: 'pointer' }}>
            <IsoBox p={[h.position[0], 0.7, h.position[1] + 0.8]} s={[0.9, 1.2, 0.75]} color="#eaddbf" />
            <IsoBox p={[h.position[0], 1.4, h.position[1] + 0.8]} s={[1.1, 0.28, 0.9]} color="#b98e6c" />
            {h.id === selectedId && (
              <ellipse
                cx={cityProject([h.position[0], 0, h.position[1]])[0]}
                cy={cityProject([h.position[0], 0, h.position[1]])[1]}
                rx="10"
                ry="5"
                fill="none"
                stroke="#a95135"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
        <IsoBox p={[-4, 2.7, -37]} s={[93, 0.28, 2.2]} color="#c3c2ac" />
        {Array.from({ length: 9 }, (_, i) => (
          <IsoBox key={'pier' + i} p={[-44 + i * 10, 1.3, -37]} s={[0.55, 2.6, 0.6]} color="#c2c4ae" />
        ))}
        <IsoBox p={[-49, 2, -6]} s={[6, 4, 6]} color="#d6c6aa" />
        <g transform={`translate(${cityProject([-49, 4, -6]).join(',')})`}>
          <path d="M-20 0 A20 20 0 0 1 20 0 Q0 15 -20 0" fill="#a8b49d" />
        </g>
        <IsoBox p={[-9, 1, -32]} s={[6, 2, 6]} color="#d5c8a5" />
        <IsoBox p={[-9, 8, -32]} s={[1.3, 13, 1.3]} color="#eee4cc" />
        <IsoBox p={[-9, 15, -32]} s={[0.7, 1.4, 0.7]} color="#bb9b5e" />
        <IsoBox p={[39, 6, 37]} s={[3, 12, 4]} color="#acc3b9" />
        <IsoBox p={[42, 9, 36]} s={[2, 18, 3]} color="#c5d4c7" />
        <IsoBox p={[40, 12, 36]} s={[5, 0.4, 3]} color="#e8dfc9" />
        {partners.map((p, i) => (
          <g key={p.id}>
            <IsoBox p={[p.position[0], 0.1, p.position[1]]} s={[7, 0.2, 6]} color="#d4d1bb" />
            <IsoBox
              p={[p.position[0], 1.3, p.position[1]]}
              s={[5.5, 2.6, 4]}
              color="#e4dbc5"
              onClick={() => onSelect(p.id, 'destination')}
            />
            <IsoBox
              p={[p.position[0], 2.7, p.position[1]]}
              s={[6, 0.3, 4.5]}
              color={getPartnerStyle(p.id).color}
            />
          </g>
        ))}
        <IsoBox p={[0, 0.08, -3]} s={[12, 0.16, 10]} color="#ccd2b7" />
        <IsoBox
          p={[0, 1.7, -3.6]}
          s={[8.5, 3.4, 5.8]}
          color="#e6dcc3"
          onClick={() => onSelect('H01', 'hub')}
        />
        <IsoBox p={[0, 3.6, -3.6]} s={[9.3, 0.35, 6.5]} color="#51795c" />
        {[-2.7, 0, 2.7].map((x) => (
          <IsoBox key={x} p={[x, 1, -0.65]} s={[1.8, 1.9, 0.15]} color="#8c9d8c" />
        ))}
      </>
    ),
    [city, routes, selectedRoute, props.reducedMotion, props.paused, onSelect, selectedId],
  );
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-label={
        props.language === 'en' ? 'Interactive isometric city map' : 'Peta kota isometrik interaktif'
      }
      style={{ display: 'block', minHeight: 280, background: '#ebe8db' }}
    >
      {cityArtwork}
      {Array.from({ length: 6 }, (_, i) => `V0${i + 1}`).map((id, i) => {
        const r = routes.find(
            (r) => r.vehicleId === id && cursor >= r.startStorySecond && cursor < r.endStorySecond,
          ),
          pose =
            (props.liveFrame ? getLiveVehiclePose(id, visualTime) : null) ||
            (r ? getVehiclePose(r, cursor) : null);
        const [x, z] = pose?.position || [-4 + i * 1.65, 4];
        const angle = pose?.heading || Math.PI;
        const profile = getLiveVehicleProfile(id);
        const bike = profile?.visualKind === 'cargo_bike';
        const pickup = profile?.visualKind === 'community_pickup';
        const vanProject: Project = ([vx, vy, vz]) =>
          cityProject([
            x + Math.cos(angle) * vx + Math.sin(angle) * vz,
            vy,
            z - Math.sin(angle) * vx + Math.cos(angle) * vz,
          ]);
        return (
          <g
            key={id}
            data-live-vehicle-map={id}
            data-x={x.toFixed(3)}
            data-z={z.toFixed(3)}
            onClick={() => onSelect(id, 'vehicle')}
            style={{ cursor: 'pointer' }}
          >
            <IsoBox
              p={[0, 0.65, 0]}
              s={
                bike
                  ? [0.66, 0.6, 0.8]
                  : pickup
                    ? [1.15, 0.5, 1.8]
                    : id === 'V03'
                      ? [1.4, 1.5, 2.3]
                      : [1.15, 1.1, 1.8]
              }
              color={profile?.color || '#eae6d7'}
              project={vanProject}
            />
            <IsoBox
              p={[0, bike ? 0.95 : 0.52, bike ? -0.4 : 0.95]}
              s={bike ? [0.28, 0.8, 0.3] : [1.1, 0.82, 0.65]}
              color={profile?.color || '#3f7658'}
              project={vanProject}
            />
            {id === selectedId && (
              <ellipse
                cx={cityProject([x, 0, z])[0]}
                cy={cityProject([x, 0, z])[1]}
                rx="12"
                ry="6"
                fill="none"
                stroke="#a95135"
                strokeWidth="2"
              />
            )}
          </g>
        );
      })}
      <MapLabels
        blockers={[
          ...city.bodies,
          ...city.roofs,
          { p: [0, 1.7, -3.6], s: [8.5, 3.4, 5.8] },
          { p: [0, 3.6, -3.6], s: [9.3, 0.35, 6.5] },
          ...partners.map((p) => ({
            p: [p.position[0], 1.3, p.position[1]] as Point,
            s: [5.5, 2.6, 4] as Point,
          })),
        ]}
        labels={[
          {
            id: 'hub-H01',
            p: [0, 5, -3],
            label: props.language === 'en' ? 'CONSOLIDATION HUB ↗' : 'PUSAT KONSOLIDASI ↗',
            onClick: () => onSelect('H01', 'hub'),
            accent: true,
            selected: selectedId === 'H01',
            priority: 90,
          },
          ...(props.liveFrame?.vehicles || []).map((vehicle) => ({
            id: `vehicle-${vehicle.vehicleId}`,
            p: [
              getLiveVehiclePose(vehicle.vehicleId, visualTime)?.position[0] ?? vehicle.position[0],
              2.8,
              getLiveVehiclePose(vehicle.vehicleId, visualTime)?.position[1] ?? vehicle.position[1],
            ] as Point,
            label: vehicle.vehicleId,
            onClick: () => onSelect(vehicle.vehicleId, 'vehicle'),
            selected: selectedId === vehicle.vehicleId,
            priority: 70,
          })),
          ...partners.map((partner) => ({
            id: `partner-${partner.id}`,
            p: [partner.position[0], 3.75, partner.position[1]] as Point,
            tone: getPartnerStyle(partner.id).color,
            label: `${getPartnerStyle(partner.id).badge} ${getPartnerStyle(partner.id).role[props.language === 'en' ? 'en' : 'id']} · ${partner.name}`,
            onClick: () => onSelect(partner.id, 'destination'),
            selected: selectedId === partner.id,
            priority: 45,
          })),
          ...world.districts.map((district) => ({
            id: `district-${district.id}`,
            p: [district.center[0], 6, district.center[1] + 5] as Point,
            label: district.active ? `${district.name} · 06` : district.name,
            onClick: () => onSelect(district.id, 'district'),
            selected: selectedId === district.id,
            priority: district.active ? 20 : 5,
          })),
          ...world.households
            .filter((household) => household.id === selectedId)
            .map((household) => ({
              id: `household-${household.id}`,
              p: [household.position[0], 3, household.position[1]] as Point,
              label: household.id,
              onClick: () => onSelect(household.id, 'household'),
              selected: true,
              priority: 55,
            })),
        ]}
      />
    </svg>
  );
}
function HubFallback(props: WorldCanvasProps) {
  const visualTime = useVisualTime(props);
  const { snapshot, onSelect, selectedId, roofVisible } = props;
  const motionTime = props.reducedMotion ? 0 : visualTime;
  const zoneItems = HUB_ZONES.map((zone) => getHubZoneAssets(snapshot, zone.id, props.liveFrame));
  const flowAssets = zoneItems.flat().slice(0, 16);
  const toteCount = Math.max(8, flowAssets.length);
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', minHeight: 280, background: '#ebe8db' }}
      aria-label={props.language === 'en' ? 'Interactive hub floor plan' : 'Denah hub interaktif'}
    >
      <IsoBox p={[0, -0.25, 0]} s={[33, 0.5, 22]} color="#d5d4bf" project={hubProject} />
      <IsoBox p={[0, 1.8, -8.5]} s={[26, 3.6, 0.25]} color="#c4cfb6" project={hubProject} />
      <IsoBox p={[13, 1.8, 0]} s={[0.25, 3.6, 17]} color="#afbfa4" project={hubProject} />
      {HUB_ZONES.map((zone, i) => {
        const items = zoneItems[i],
          [x, , z] = zone.p;
        return (
          <g key={zone.id}>
            <IsoBox
              p={[x, 0.05, z]}
              s={[5.7, 0.1, 6.7]}
              color={selectedId === zone.id ? '#cfdcab' : zone.color}
              project={hubProject}
              onClick={() => onSelect(zone.id, 'zone')}
            />
            {[0, 4, 5, 6, 7].includes(i) ? (
              [0, 0.8, 1.6].map((y, j) => (
                <IsoBox
                  key={y}
                  p={[x, y + 0.4, z - 1.4]}
                  s={[3.7, 0.15, 1.2]}
                  color={j === 2 ? '#b7b99c' : '#8d9f82'}
                  project={hubProject}
                />
              ))
            ) : (
              <>
                <IsoBox p={[x, 1, z - 1.3]} s={[4, 0.18, 1.2]} color="#b5a78a" project={hubProject} />
                <IsoBox p={[x - 1.5, 0.5, z - 1.3]} s={[0.15, 1, 1]} color="#84967e" project={hubProject} />
                <IsoBox p={[x + 1.5, 0.5, z - 1.3]} s={[0.15, 1, 1]} color="#84967e" project={hubProject} />
                <IsoBox p={[x, 1.45, z - 1.4]} s={[1, 0.8, 0.1]} color="#53735d" project={hubProject} />
              </>
            )}
            {(zone.id === 'inbound' ? [] : items).slice(0, 20).map((item, j) => (
              <IsoBox
                key={item.asset.id}
                p={[x - 1.8 + (j % 5) * 0.85, 0.4, z + 0.6 + Math.floor(j / 5) * 0.65]}
                s={[0.65, item.asset.category === 'large_appliance' ? 0.9 : 0.35, 0.55]}
                color={item.held ? '#bda35f' : '#768e71'}
                project={hubProject}
                onClick={() => onSelect(item.asset.id, 'asset')}
              />
            ))}
          </g>
        );
      })}
      <IsoBox p={[0, 0.08, 0]} s={[26, 0.05, 1.2]} color="#e1ddc5" project={hubProject} />
      {[-6, 0, 6].map((x) => (
        <IsoBox key={x} p={[x, 0.75, -4]} s={[0.15, 1.5, 7]} color="#e6dfca" project={hubProject} />
      ))}
      <IsoBox p={[6, 0.75, 4]} s={[0.15, 1.5, 7]} color="#e6dfca" project={hubProject} />
      <IsoBox p={[0, 0.63, 0]} s={[24, 0.2, 1.6]} color="#789081" project={hubProject} />
      {Array.from({ length: toteCount }, (_, index) => {
        const { p, heading } = getHubConveyorPose(motionTime, index, toteCount);
        const toteProject: Project = ([x, y, z]) =>
          hubProject([
            p[0] + Math.cos(heading) * x + Math.sin(heading) * z,
            p[1] + y,
            p[2] - Math.sin(heading) * x + Math.cos(heading) * z,
          ]);
        const loaded = index < flowAssets.length;
        return (
          <g
            key={`tote-${index}`}
            data-hub-motion="tote"
            data-x={p[0].toFixed(3)}
            data-z={p[2].toFixed(3)}
            data-loaded={loaded}
          >
            <IsoBox
              p={[0, 0.14, 0]}
              s={[0.61, 0.28, 0.57]}
              color={['#d0a566', '#a18ac1', '#75a78e'][index % 3]}
              project={toteProject}
            />
            <IsoBox p={[0, 0.29, 0]} s={[0.49, 0.015, 0.45]} color="#667b68" project={toteProject} />
            {loaded && (
              <IsoBox p={[0, 0.35, 0]} s={[0.32, 0.18, 0.33]} color="#f0dfb7" project={toteProject} />
            )}
          </g>
        );
      })}
      {[0, 1, 2, 3].map((index) => {
        const x = -7.5 + index * 5 + Math.sin(motionTime * 0.3 + index) * 0.6;
        const z = index % 2 ? 5.3 : -2.2;
        return (
          <g key={`operator-${index}`} data-hub-motion="operator" data-x={x.toFixed(3)}>
            <IsoBox p={[x, 0.8, z]} s={[0.43, 1.3, 0.38]} color="#567e63" project={hubProject} />
            <IsoBox p={[x, 1.58, z]} s={[0.31, 0.31, 0.31]} color="#c89e76" project={hubProject} />
          </g>
        );
      })}
      {[0, 1].map((index) => {
        const { p } = getHubCartPose(motionTime, index);
        return (
          <g key={`cart-${index}`} data-hub-motion="cart" data-x={p[0].toFixed(3)} data-z={p[2].toFixed(3)}>
            <IsoBox p={[p[0], 0.32, p[2]]} s={[1.25, 0.45, 0.9]} color="#567e70" project={hubProject} />
            <IsoBox p={[p[0], 0.77, p[2]]} s={[0.75, 0.45, 0.65]} color="#d5b17b" project={hubProject} />
          </g>
        );
      })}
      {(props.liveFrame?.vehicles || []).map((vehicle, index) => {
        const pose = getLiveVehiclePose(vehicle.vehicleId, visualTime) || vehicle;
        const dock = getHubDockPose(pose, index);
        if (!dock.visible) return null;
        const [x, , z] = dock.p;
        const tone = getLiveVehicleProfile(vehicle.vehicleId)?.color || '#668e72';
        return (
          <g
            key={vehicle.vehicleId}
            data-hub-motion="truck"
            data-vehicle-id={vehicle.vehicleId}
            data-x={x.toFixed(3)}
            data-z={z.toFixed(3)}
          >
            <IsoBox p={[x, 0.8, z]} s={[3.5, 1.6, 1.5]} color="#e9dfc5" project={hubProject} />
            <IsoBox p={[x + 2.2, 0.8, z]} s={[1.2, 1.6, 1.5]} color={tone} project={hubProject} />
          </g>
        );
      })}
      {roofVisible && <IsoBox p={[0, 4.2, 0]} s={[27, 0.3, 18]} color="#5c805f" project={hubProject} />}
      <MapLabels
        blockers={roofVisible ? [{ p: [0, 4.2, 0], s: [27, 0.3, 18] }] : []}
        project={hubProject}
        labels={HUB_ZONES.map((zone) => ({
          id: `zone-${zone.id}`,
          p: [zone.p[0], 3.6, zone.p[2] - 2],
          label: `${props.language === 'en' ? zone.en : zone.name} · ${getHubZoneAssets(snapshot, zone.id, props.liveFrame).length}`,
          onClick: () => onSelect(zone.id, 'zone'),
          accent: selectedId === zone.id,
          selected: selectedId === zone.id,
          priority: 50 + Math.min(getHubZoneAssets(snapshot, zone.id, props.liveFrame).length, 20),
        }))}
      />
    </svg>
  );
}
const labels: Record<string, string> = {
  screen: 'Layar',
  display: 'Layar',
  battery: 'Baterai',
  mainboard: 'Papan utama',
  shell: 'Casing',
  keyboard: 'Papan ketik',
  storage: 'Penyimpanan',
  antenna: 'Antena',
  powerModule: 'Modul daya',
  connector: 'Konektor',
  conductor: 'Konduktor',
  insulation: 'Isolasi',
  motor: 'Motor',
  controlBoard: 'Papan kontrol',
  backlight: 'Lampu latar',
  stand: 'Penyangga',
  paperPath: 'Jalur kertas',
  drumOrCabinet: 'Drum / kabinet',
  protectiveShell: 'Pelindung',
  cells: 'Kelompok sel',
};
function DeviceFallback(props: WorldCanvasProps) {
  const asset = props.asset && 'asset' in props.asset ? props.asset.asset : props.asset;
  if (!asset) return null;
  const category = asset.category,
    ex = props.exploded;
  const cx = 500,
    cy = 310;
  const click = (c: string) => props.onComponentSelect?.(c);
  const buttons = asset.components;
  const main = buttons[0];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1000 650"
      style={{ display: 'block', minHeight: 280, background: '#ebe8db' }}
      aria-label={`${category} ${props.language === 'en' ? 'component illustration' : 'ilustrasi komponen'}`}
    >
      <defs>
        <linearGradient id="device-glass" x2="1" y2="1">
          <stop stopColor="#a9c4ad" />
          <stop offset="1" stopColor="#557a61" />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy="520" rx="230" ry="30" fill="#929e80" opacity=".1" />
      {!ex && (
        <g transform={`translate(${cx},${cy})`} onClick={() => click(main)} style={{ cursor: 'pointer' }}>
          {['phone', 'tablet'].includes(category) ? (
            <g transform={category === 'tablet' ? 'scale(1.5,.95)' : 'scale(1)'}>
              <rect x="-98" y="-175" width="196" height="350" rx="25" fill="#768d75" />
              <rect x="-88" y="-166" width="176" height="330" rx="18" fill="#293f34" />
              <rect x="-80" y="-145" width="160" height="292" rx="12" fill="url(#device-glass)" />
              <rect x="-25" y="-155" width="50" height="6" rx="3" fill="#7e8f7a" />
              <rect x="-57" y="-20" width="114" height="140" rx="12" fill="#b7c9a6" />
              <circle cx="-38" cy="-82" r="19" fill="#e2cd95" />
              <circle cx="17" cy="-82" r="19" fill="#c7d9bd" />
            </g>
          ) : category === 'monitor' || category === 'laptop' ? (
            <g>
              <rect x="-180" y="-140" width="360" height="230" rx="14" fill="#5e7c61" />
              <rect x="-167" y="-126" width="334" height="201" rx="5" fill="url(#device-glass)" />
              <rect x="-145" y="-99" width="160" height="140" rx="9" fill="#becfad" />
              <path d="M 40 -86 h105 M40 -55 h105 M40 -24 h80" stroke="#d6dfbd" strokeWidth="8" />
              {category === 'monitor' ? (
                <>
                  <rect x="-15" y="90" width="30" height="74" fill="#8d9f84" />
                  <rect x="-87" y="164" width="174" height="15" rx="7" fill="#7f9677" />
                </>
              ) : (
                <>
                  <path d="M-180 95 H180 L225 173 H-225Z" fill="#b4c2a9" />
                  <path d="M-150 110 H150 M-160 125 H160" stroke="#6c8668" strokeWidth="8" />
                  <rect x="-50" y="143" width="100" height="19" rx="4" fill="#94a88a" />
                </>
              )}
            </g>
          ) : category === 'large_appliance' ? (
            <g>
              <rect x="-140" y="-180" width="280" height="360" rx="15" fill="#cbd4bd" />
              <rect x="-126" y="-162" width="252" height="65" rx="7" fill="#a2b596" />
              <circle cx="82" cy="-129" r="18" fill="#537558" />
              <rect x="-104" y="-145" width="110" height="30" rx="4" fill="#547c5c" />
              <circle cy="30" r="100" fill="#9caf97" />
              <circle cy="30" r="79" fill="url(#device-glass)" />
            </g>
          ) : category === 'printer' ? (
            <g>
              <rect x="-185" y="-110" width="370" height="245" rx="24" fill="#c7d1b9" />
              <rect x="-175" y="-140" width="350" height="48" rx="8" fill="#7e9676" />
              <rect x="-140" y="40" width="280" height="45" rx="9" fill="#4d6c50" />
              <path d="M -110 67 H110 L130 180 H-130Z" fill="#faf5de" />
              <rect x="72" y="-60" width="85" height="44" rx="5" fill="#65856c" />
            </g>
          ) : category === 'router' ? (
            <g>
              <path
                d="M-125 -30 L-150 -190 M125 -30 L150 -190"
                stroke="#6b8568"
                strokeWidth="17"
                strokeLinecap="round"
              />
              <rect x="-185" y="-30" width="370" height="140" rx="26" fill="#d3dac4" />
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={-60 + i * 40} cy="80" r="6" fill="#59865d" />
              ))}
            </g>
          ) : category === 'small_appliance' ? (
            <g>
              <rect x="-90" y="45" width="180" height="150" rx="35" fill="#aabc97" />
              <path d="M -60 45 L-80 -170 H80 L60 45Z" fill="#adcbbb" />
              <rect x="-90" y="-190" width="180" height="22" rx="10" fill="#698c6b" />
              <rect x="-55" y="105" width="110" height="40" rx="13" fill="#748f69" />
            </g>
          ) : category === 'accessories' ? (
            <g>
              <ellipse rx="120" ry="85" fill="none" stroke="#5d815f" strokeWidth="18" />
              <path d="M100 50 L160 110 L140 145" fill="none" stroke="#5d815f" strokeWidth="18" />
              <rect x="119" y="132" width="42" height="65" rx="9" fill="#98ad8e" />
              <rect x="125" y="184" width="30" height="25" fill="#bcbfa6" />
            </g>
          ) : (
            <g>
              <rect x="-165" y="-100" width="330" height="220" rx="20" fill="#819a70" />
              <rect x="90" y="-120" width="55" height="25" rx="5" fill="#bca66f" />
              <path d="M-75 -25 H75 M-45 5 H45" stroke="#deddb3" strokeWidth="8" />
            </g>
          )}
        </g>
      )}
      {ex &&
        buttons.map((c, i) => {
          const cols = buttons.length > 4 ? 3 : 2,
            x = 290 + (i % cols) * 220,
            y = 160 + Math.floor(i / cols) * 200,
            isBoard = /board/i.test(c),
            isScreen = /screen|display|backlight/.test(c);
          return (
            <g
              key={c}
              transform={`translate(${x},${y})`}
              onClick={() => click(c)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={props.language === 'en' ? c : labels[c]}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') click(c);
              }}
            >
              <rect
                x="-85"
                y="-65"
                width="170"
                height="125"
                rx={isScreen ? 8 : 16}
                fill={
                  isBoard
                    ? '#588869'
                    : isScreen
                      ? 'url(#device-glass)'
                      : c === 'battery' || c === 'cells'
                        ? '#9caf83'
                        : '#c2ccb1'
                }
                stroke={props.selectedComponent === c ? '#a95135' : '#96aa89'}
                strokeWidth={props.selectedComponent === c ? 3 : 1}
              />
              {isBoard &&
                [0, 1, 2, 3, 4, 5].map((j) => (
                  <rect
                    key={j}
                    x={-62 + (j % 3) * 45}
                    y={-42 + Math.floor(j / 3) * 48}
                    width="27"
                    height="26"
                    rx="3"
                    fill={j % 2 ? '#bdc497' : '#344d3a'}
                  />
                ))}
              <text y="84" textAnchor="middle" fill="#38533e" fontSize="14">
                {props.language === 'en' ? c : labels[c] || c}
              </text>
            </g>
          );
        })}
      {props.selectedComponent && !ex && (
        <text x={cx} y="575" textAnchor="middle" fill="#365e40" fontSize="17" fontWeight="650">
          {props.language === 'en' ? props.selectedComponent : labels[props.selectedComponent]}
        </text>
      )}
    </svg>
  );
}
export default function SceneFallback(props: WorldCanvasProps) {
  return (
    <div
      className="scene-fallback"
      style={{ height: '100%', minHeight: 280, position: 'relative', overflow: 'hidden' }}
    >
      {props.mode === 'city' ? (
        <CityFallback {...props} />
      ) : props.mode === 'hub' ? (
        <HubFallback {...props} />
      ) : (
        <DeviceFallback {...props} />
      )}
    </div>
  );
}
