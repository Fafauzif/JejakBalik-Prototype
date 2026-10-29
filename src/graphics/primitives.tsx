import React, { useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { LiveVehicleVisualKind } from '../domain/partner-logistics';
import { layoutLabels, type LabelCandidate, type LabelPlacement, type LabelRect } from './label-layout';
import { isLabelBlocker, settleLabelVisibility, type SettledVisibility } from './label-visibility';
export type Point = [number, number, number];
export interface Instance {
  p: Point;
  s: Point;
  color?: string;
  r?: number;
}
const object = new THREE.Object3D();
export function Batch({
  items,
  shape = 'box',
  shadow = true,
  labelOccluder = false,
}: {
  items: Instance[];
  shape?: 'box' | 'tree' | 'trunk' | 'roof';
  shadow?: boolean;
  /** Only architectural solids participate in annotation occlusion. */
  labelOccluder?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const scene = useThree((state) => state.scene);
  useLayoutEffect(() => {
    if (!ref.current) return;
    items.forEach((item, i) => {
      object.position.set(...item.p);
      object.scale.set(...item.s);
      object.rotation.set(0, item.r || 0, 0);
      object.updateMatrix();
      ref.current.setMatrixAt(i, object.matrix);
      ref.current.setColorAt(i, new THREE.Color(item.color || '#ddd5be'));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
    if (labelOccluder) scene.userData.labelOcclusionVersion = (scene.userData.labelOcclusionVersion || 0) + 1;
    return () => {
      if (labelOccluder)
        scene.userData.labelOcclusionVersion = (scene.userData.labelOcclusionVersion || 0) + 1;
    };
  }, [items, labelOccluder, scene]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow={shadow}
      receiveShadow
      userData={{ labelOccluder }}
    >
      {shape === 'box' ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : shape === 'tree' ? (
        <icosahedronGeometry args={[0.65, 1]} />
      ) : shape === 'roof' ? (
        <cylinderGeometry args={[0, 0.72, 1, 4]} />
      ) : (
        <cylinderGeometry args={[0.13, 0.18, 1, 5]} />
      )}
      <meshStandardMaterial roughness={0.92} />
    </instancedMesh>
  );
}
export function Box({
  p = [0, 0, 0],
  s = [1, 1, 1],
  color = '#e6dfcf',
  r = 0,
  ...props
}: {
  p?: Point;
  s?: Point;
  color?: string;
  r?: number;
  [key: string]: any;
}) {
  return (
    <mesh position={p} scale={s} rotation={[0, r, 0]} castShadow receiveShadow {...props}>
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}
export function Ring({
  position,
  color = '#36755d',
  radius = 2,
}: {
  position: Point;
  color?: string;
  radius?: number;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.88, radius, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}
interface ProjectedLabel extends LabelCandidate {
  host: HTMLDivElement;
  button: HTMLButtonElement;
  dirty: boolean;
  mobileHidden: boolean;
  focused: boolean;
  worldAnchor: THREE.Vector3;
  lastOcclusionAt: number;
  occluded: boolean;
  occlusionVisibility: SettledVisibility;
  layoutVisibility: SettledVisibility;
  owner: THREE.Object3D | null;
  lastRayAnchor: THREE.Vector3;
  cameraMatrix: number[];
  geometryVersion: number;
  fadingUntil: number;
}
interface LabelRegistry {
  entries: Map<string, ProjectedLabel>;
  previous: Map<string, LabelPlacement>;
  queued: boolean;
  width: number;
  height: number;
  lastExclusionsAt: number;
  exclusions: LabelRect[];
  occluders: THREE.Object3D[];
  lastMeshScanAt: number;
  raycaster: THREE.Raycaster;
  cameraPosition: THREE.Vector3;
  direction: THREE.Vector3;
  geometryVersion: number;
  invalidate: () => void;
  motionPreference: MediaQueryList;
  occlusionTimer?: ReturnType<typeof setTimeout>;
}
const labelRegistries = new WeakMap<HTMLElement, LabelRegistry>();
function registryFor(parent: HTMLElement) {
  let registry = labelRegistries.get(parent);
  if (!registry) {
    registry = {
      entries: new Map(),
      previous: new Map(),
      queued: false,
      width: 0,
      height: 0,
      lastExclusionsAt: -Infinity,
      exclusions: [],
      occluders: [],
      lastMeshScanAt: -Infinity,
      raycaster: new THREE.Raycaster(),
      cameraPosition: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      geometryVersion: -1,
      invalidate: () => {},
      motionPreference: window.matchMedia('(prefers-reduced-motion: reduce)'),
    };
    labelRegistries.set(parent, registry);
  }
  return registry;
}
/** Raycast only authored opaque structures, including individual building instances.
 * Decorative/moving meshes never turn a vehicle label into a blinking marker. */
function anchorIsOccluded(
  registry: LabelRegistry,
  item: ProjectedLabel,
  scene: THREE.Scene,
  camera: THREE.Camera,
  invalidate: () => void,
) {
  const now = performance.now();
  const geometryVersion = Number(scene.userData.labelOcclusionVersion || 0);
  const geometryChanged = item.geometryVersion !== geometryVersion;
  const changed =
    item.lastRayAnchor.distanceToSquared(item.worldAnchor) > 0.0001 ||
    camera.matrixWorld.elements.some(
      (value, index) => Math.abs(value - (item.cameraMatrix[index] ?? Infinity)) > 0.0001,
    );
  if (!geometryChanged && !changed && now - item.lastOcclusionAt < 250) return item.occluded;
  if (!geometryChanged && now - item.lastOcclusionAt < 125) {
    if (!registry.occlusionTimer)
      registry.occlusionTimer = setTimeout(
        () => {
          registry.occlusionTimer = undefined;
          if (registry.entries.size) invalidate();
        },
        130 - (now - item.lastOcclusionAt),
      );
    return item.occluded;
  }
  item.lastOcclusionAt = now;
  item.lastRayAnchor.copy(item.worldAnchor);
  item.cameraMatrix = [...camera.matrixWorld.elements];
  item.geometryVersion = geometryVersion;
  if (registry.geometryVersion !== geometryVersion || now - registry.lastMeshScanAt > 500) {
    // Demand-rendered scenes also need current transforms before their first depth test.
    scene.updateMatrixWorld(true);
    registry.occluders = [];
    scene.traverse((object) => {
      if (isLabelBlocker(object)) registry.occluders.push(object);
    });
    registry.lastMeshScanAt = now;
    registry.geometryVersion = geometryVersion;
  }
  camera.getWorldPosition(registry.cameraPosition);
  registry.direction.subVectors(item.worldAnchor, registry.cameraPosition);
  const distance = registry.direction.length();
  registry.raycaster.set(registry.cameraPosition, registry.direction.normalize());
  registry.raycaster.near = 0.05;
  // A small endpoint tolerance prevents a marker sitting on a roof from occluding itself.
  registry.raycaster.far = Math.max(0, distance - 0.18);
  const hit = registry.raycaster
    .intersectObjects(
      registry.occluders.filter((object) => isLabelBlocker(object, item.owner)),
      false,
    )
    .find(({ object }) => isLabelBlocker(object, item.owner));
  item.occluded = !!hit;
  item.host.dataset.worldOccluded = String(item.occluded);
  item.host.dataset.worldAnchor = item.worldAnchor
    .toArray()
    .map((value) => value.toFixed(3))
    .join(',');
  item.host.dataset.occlusionDistance = hit ? hit.distance.toFixed(3) : '';
  item.host.dataset.occlusionInstance = hit?.instanceId === undefined ? '' : String(hit.instanceId);
  return item.occluded;
}
function scheduleLabelLayout(parent: HTMLElement, registry: LabelRegistry, width: number, height: number) {
  if (registry.width !== width || registry.height !== height) {
    registry.lastExclusionsAt = -Infinity;
    for (const item of registry.entries.values()) item.dirty = true;
  }
  registry.width = width;
  registry.height = height;
  if (registry.queued) return;
  registry.queued = true;
  queueMicrotask(() => {
    registry.queued = false;
    if (!parent.isConnected || !registry.entries.size) return;
    const { width, height } = registry;
    const now = performance.now();
    if (now - registry.lastExclusionsAt > 180) {
      const bounds = parent.getBoundingClientRect();
      const scene = parent.closest('.world-scene') || parent;
      registry.exclusions = [
        ...scene.querySelectorAll<HTMLElement>(
          '.world-location, .world-legend, .scene-bottom-button, .scene-help, [data-world-exclusion]',
        ),
        ...document.querySelectorAll<HTMLElement>('.main-nav'),
      ]
        .filter(
          (element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden',
        )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left - bounds.left,
            top: rect.top - bounds.top,
            width: rect.width,
            height: rect.height,
          };
        });
      registry.lastExclusionsAt = now;
    }
    for (const item of registry.entries.values()) {
      if (item.dirty) {
        item.button.style.minHeight = width < 600 ? '44px' : '28px';
        item.button.style.maxWidth = `${Math.min(260, width - 24)}px`;
        item.width = item.button.offsetWidth;
        item.height = item.button.offsetHeight;
        item.dirty = false;
      }
    }
    // Reserve the last footprint during a physical fade. Other labels can use
    // that space once the fade finishes, never while both would be readable.
    const fadingRects: LabelRect[] = [];
    for (const item of registry.entries.values()) {
      if (!item.visible && item.occluded && item.layoutVisibility.visible) {
        item.fadingUntil = now + 160;
        item.layoutVisibility = { visible: false, pending: false, since: now };
      }
      const old = registry.previous.get(item.id);
      if (old && item.fadingUntil > now) fadingRects.push(old);
    }
    const placements = layoutLabels(
      Array.from(registry.entries.values()).filter(
        (item) => !(width < 600 && item.mobileHidden && !item.selected && !item.focused),
      ),
      {
        width,
        height,
        previous: registry.previous,
        exclusions: [...registry.exclusions, ...fadingRects],
        limit: width < 600 ? 5 : undefined,
      },
    );
    for (const item of registry.entries.values()) {
      const placement = placements.get(item.id);
      // A label must have a stable free slot before returning. Layout rejection
      // hides immediately so fading neighbours never overlap scene controls.
      item.layoutVisibility = settleLabelVisibility(item.layoutVisibility, !!placement, now, {
        hideDelay: 0,
        revealDelay: item.selected || item.focused ? 0 : 160,
      });
      const shown = !!placement && item.layoutVisibility.visible;
      const interactive = shown && !item.occluded;
      item.retained = shown;
      item.host.style.transition = registry.motionPreference.matches
        ? 'none'
        : `opacity 160ms ease, visibility 0s ${item.fadingUntil > now ? '160ms' : '0s'}`;
      item.host.style.visibility = shown ? 'visible' : 'hidden';
      item.host.style.opacity = shown ? '1' : '0';
      item.host.dataset.worldLabelVisible = String(shown);
      item.host.style.pointerEvents = interactive ? 'auto' : 'none';
      item.button.tabIndex = interactive ? 0 : -1;
      item.button.setAttribute('aria-hidden', interactive ? 'false' : 'true');
      if (placement) {
        item.host.style.transform = `translate(${Math.round(placement.left * 4) / 4}px, ${Math.round(placement.top * 4) / 4}px)`;
        item.host.style.zIndex = item.selected || item.focused ? '12' : '10';
      }
    }
    // Keep the last good slot across a brief occlusion instead of restarting
    // the placement search at a different side of a moving vehicle.
    for (const [id, placement] of placements) registry.previous.set(id, placement);
    if (
      [...registry.entries.values()].some(
        (item) => item.layoutVisibility.pending !== item.layoutVisibility.visible || item.fadingUntil > now,
      )
    )
      scheduleVisibilityRefresh(registry);
  });
}
function scheduleVisibilityRefresh(registry: LabelRegistry, invalidate?: () => void) {
  if (registry.occlusionTimer) return;
  registry.occlusionTimer = setTimeout(() => {
    registry.occlusionTimer = undefined;
    if (registry.entries.size) (invalidate || registry.invalidate)();
  }, 80);
}
function annotationText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(annotationText).filter(Boolean).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return annotationText(node.props.children);
  return '';
}
export function Label({
  position,
  children,
  onClick,
  selected = false,
  accent = false,
  offset = [0, -8],
  mobileHidden = false,
  priority = 30,
  id: suppliedId,
  tone,
  badge,
}: {
  position: Point;
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  accent?: boolean;
  offset?: [number, number];
  mobileHidden?: boolean;
  priority?: number;
  id?: string;
  tone?: string;
  badge?: string;
}) {
  const { gl, camera, size, invalidate, scene } = useThree();
  const generatedId = useId(),
    id = suppliedId || generatedId;
  const host = useRef<HTMLDivElement | null>(null);
  const group = useRef<THREE.Group>(null!);
  const button = useRef<HTMLButtonElement | null>(null);
  const point = useMemo(() => new THREE.Vector3(), []);
  const entry = useRef<ProjectedLabel | null>(null);
  const clickHandler = useRef(onClick);
  clickHandler.current = onClick;
  const content = annotationText(children),
    interactive = !!onClick;
  useEffect(() => {
    const parent = gl.domElement.parentElement!;
    const registry = registryFor(parent);
    registry.invalidate = invalidate;
    const container = document.createElement('div');
    container.style.cssText =
      'position:absolute;top:0;left:0;visibility:hidden;opacity:0;pointer-events:none;user-select:none;will-change:transform;transition:opacity 160ms ease;';
    if (registry.motionPreference.matches) container.style.transition = 'none';
    container.dataset.worldLabel = id;
    parent.appendChild(container);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'world-label-button';
    marker.tabIndex = -1;
    marker.onclick = () => clickHandler.current?.();
    container.appendChild(marker);
    host.current = container;
    button.current = marker;
    const item: ProjectedLabel = {
      id,
      host: container,
      button: marker,
      dirty: true,
      mobileHidden,
      focused: false,
      worldAnchor: new THREE.Vector3(),
      lastOcclusionAt: -Infinity,
      occluded: true,
      occlusionVisibility: { visible: false, pending: false, since: performance.now() },
      layoutVisibility: { visible: false, pending: false, since: performance.now() },
      owner: null,
      lastRayAnchor: new THREE.Vector3(Infinity, Infinity, Infinity),
      cameraMatrix: [],
      geometryVersion: -1,
      fadingUntil: 0,
      x: -1,
      y: -1,
      width: 0,
      height: 0,
      priority,
      selected,
      visible: false,
    };
    entry.current = item;
    registry.entries.set(id, item);
    registry.lastMeshScanAt = -Infinity;
    marker.onfocus = () => {
      item.focused = true;
      marker.style.outline = '3px solid #226B55';
      marker.style.outlineOffset = '3px';
      invalidate();
    };
    marker.onblur = () => {
      item.focused = false;
      marker.style.outline = '';
      invalidate();
    };
    const observer = new ResizeObserver(() => {
      item.dirty = true;
      invalidate();
    });
    observer.observe(marker);
    const scrolled = () => {
      registry.lastExclusionsAt = -Infinity;
      invalidate();
    };
    window.addEventListener('scroll', scrolled, true);
    invalidate();
    return () => {
      host.current = null;
      button.current = null;
      marker.onclick = null;
      marker.onfocus = null;
      marker.onblur = null;
      observer.disconnect();
      window.removeEventListener('scroll', scrolled, true);
      entry.current = null;
      registry.entries.delete(id);
      if (!registry.entries.size && registry.occlusionTimer) {
        clearTimeout(registry.occlusionTimer);
        registry.occlusionTimer = undefined;
      }
      registry.previous.delete(id);
      container.remove();
    };
  }, [gl, invalidate, id]);
  useFrame(() => {
    if (!host.current || !group.current || !entry.current) return;
    const item = entry.current;
    const registry = registryFor(gl.domElement.parentElement!);
    item.owner = null;
    for (let node = group.current.parent; node; node = node.parent) {
      if (node.userData.labelOwner) {
        item.owner = node;
        break;
      }
    }
    group.current.getWorldPosition(item.worldAnchor);
    point.copy(item.worldAnchor).project(camera);
    item.x = (point.x * 0.5 + 0.5) * size.width + offset[0];
    item.y = (-point.y * 0.5 + 0.5) * size.height + offset[1];
    const inFront = point.z >= -1 && point.z <= 1;
    const depthVisible = inFront && !anchorIsOccluded(registry, item, scene, camera, invalidate);
    item.occlusionVisibility = settleLabelVisibility(
      item.occlusionVisibility,
      depthVisible,
      performance.now(),
    );
    item.visible = inFront && item.occlusionVisibility.visible;
    if (item.occlusionVisibility.pending !== item.occlusionVisibility.visible)
      scheduleVisibilityRefresh(registry, invalidate);
    item.selected = selected || item.focused;
    item.mobileHidden = mobileHidden;
    item.priority = priority;
    scheduleLabelLayout(gl.domElement.parentElement!, registry, size.width, size.height);
  });
  useEffect(() => {
    if (!button.current) return;
    const marker = button.current;
    marker.textContent = badge ? `${badge} · ${content}` : content;
    marker.setAttribute('aria-label', badge ? `${content} · ${badge}` : content);
    Object.assign(marker.style, {
      fontFamily: 'inherit',
      fontSize: '11px',
      fontWeight: '700',
      whiteSpace: 'nowrap',
      color: accent ? '#fff' : '#2e493c',
      border: selected ? '2px solid #a95135' : '1px solid rgba(45,103,83,.12)',
      borderRadius: '8px',
      borderLeft: tone ? `4px solid ${tone}` : undefined,
      boxShadow: '0 2px 12px #3a493a12',
      padding: '6px 9px',
      background: accent ? '#2d6753' : 'rgba(255,254,250,.94)',
      cursor: interactive ? 'pointer' : 'default',
      maxWidth: '260px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    marker.title = marker.textContent || '';
    if (entry.current) entry.current.dirty = true;
    invalidate();
  }, [content, interactive, selected, accent, invalidate, id, gl, tone, badge]);
  return <group ref={group} position={position} />;
}
export function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function ribbon(points: number[][], width: number, y = 0) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)],
      next = points[Math.min(points.length - 1, i + 1)],
      dx = next[0] - prev[0],
      dz = next[1] - prev[1],
      len = Math.hypot(dx, dz) || 1;
    vertices.push(
      points[i][0] - ((dz / len) * width) / 2,
      y,
      points[i][1] + ((dx / len) * width) / 2,
      points[i][0] + ((dz / len) * width) / 2,
      y,
      points[i][1] - ((dx / len) * width) / 2,
    );
    if (i < points.length - 1) {
      let a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function FleetVan({
  color = '#35735b',
  bulky = false,
  specialist = false,
  visualKind,
  onClick,
}: {
  color?: string;
  bulky?: boolean;
  specialist?: boolean;
  visualKind?: LiveVehicleVisualKind;
  onClick?: () => void;
}) {
  const kind = visualKind || (specialist ? 'specialist' : bulky ? 'bulky_truck' : 'partner_van');
  const parts = useMemo(() => {
    const boxes: Instance[] = [];
    const add = (p: Point, s: Point, tone: string) => boxes.push({ p, s, color: tone });
    if (kind === 'cargo_bike') {
      add([0, 0.39, 0.12], [0.1, 0.12, 2.1], color);
      add([0, 0.62, 0], [0.13, 0.55, 0.11], color);
      add([0, 0.77, 0.25], [0.12, 0.1, 0.7], color);
      add([0, 0.6, 1], [0.82, 0.68, 0.8], color);
      add([0, 0.99, 1], [0.87, 0.08, 0.86], '#f1dfba');
      add([0, 0.89, -0.3], [0.36, 0.13, 0.3], '#42584d');
      add([0, 1.2, -0.28], [0.32, 0.53, 0.25], '#547864');
      add([0, 1.61, -0.28], [0.25, 0.26, 0.25], '#c59770');
      add([-0.16, 0.73, -0.22], [0.13, 0.52, 0.13], '#43584f');
      add([0.16, 0.73, -0.22], [0.13, 0.52, 0.13], '#43584f');
      add([0, 1.02, 0.43], [0.63, 0.07, 0.08], '#3a5146');
      return boxes;
    }
    const isBulky = kind === 'bulky_truck';
    const pickup = kind === 'community_pickup';
    const boxTruck = kind === 'delivery_box' || isBulky;
    const bodyHeight = isBulky ? 1.45 : kind === 'delivery_box' ? 1.25 : 0.91;
    const bodyLength = isBulky ? 2.45 : 1.85;
    const wheelX = isBulky ? 0.7 : 0.59;
    for (const x of [-wheelX, wheelX])
      for (const z of [-0.82, 0.91]) add([x, 0.23, z], [0.25, 0.44, 0.48], '#36433c');
    add([0, 0.43, -0.23], [isBulky ? 1.42 : 1.22, 0.21, bodyLength], color);
    if (pickup) {
      add([-0.55, 0.73, -0.3], [0.14, 0.48, 1.85], color);
      add([0.55, 0.73, -0.3], [0.14, 0.48, 1.85], color);
      add([0, 0.73, -1.16], [1.2, 0.48, 0.13], color);
      add([0, 0.71, -0.28], [0.75, 0.44, 0.94], '#ded2a8');
      add([0, 0.95, -0.28], [0.78, 0.07, 0.96], '#647c65');
    } else {
      add(
        [0, 0.5 + bodyHeight / 2, -0.25],
        [isBulky ? 1.42 : 1.18, bodyHeight, bodyLength],
        kind === 'partner_van' ? color : kind === 'specialist' ? '#e1bc71' : '#f5efd9',
      );
      add([0, 0.66, -0.25], [isBulky ? 1.45 : 1.2, 0.18, bodyLength + 0.02], color);
      // Operator stripe makes partner-owned vehicles legible at miniature scale.
      add([-0.61, 1.02, -0.2], [0.035, 0.15, 1.2], color);
      add([0.61, 1.02, -0.2], [0.035, 0.15, 1.2], color);
    }
    add([0, 0.77, 1.05], [isBulky ? 1.35 : 1.13, 0.9, 0.82], color);
    add([0, 1.02, 1.47], [isBulky ? 1.08 : 0.91, 0.35, 0.035], '#b7d0cc');
    add([0, 0.43, 1.51], [isBulky ? 1.32 : 1.13, 0.16, 0.13], '#e8dfc9');
    for (const x of [-0.43, 0.43]) add([x, 0.64, 1.51], [0.16, 0.14, 0.035], '#f4df9e');
    // Shaped cabin glazing, door seams and reflective fleet details remain one batch.
    for (const x of [-0.575, 0.575]) {
      add([x, 1.04, 1.03], [0.035, 0.32, 0.53], '#9abdb6');
      add([x, 0.76, 0.86], [0.045, 0.04, 0.17], '#d9ddc8');
      add([x * 1.18, 0.95, 1.28], [0.16, 0.14, 0.12], '#3d5348');
    }
    for (const x of [-0.43, 0.43]) {
      add([x, 0.68, -bodyLength / 2 - 0.27], [0.14, 0.18, 0.03], '#b8664c');
      add([x, 1.08, -bodyLength / 2 - 0.27], [0.055, 0.42, 0.025], '#c0ccbd');
    }
    add([0, 0.43, 1.585], [0.36, 0.09, 0.025], '#4a584e');
    if (!pickup) add([0, bodyHeight + 0.53, -0.3], [0.74, 0.055, bodyLength * 0.62], '#d0dac8');
    if (boxTruck) add([0, 1.27, 1.05], [isBulky ? 1.4 : 1.2, 0.13, 0.93], color);
    if (kind === 'specialist') {
      add([0, 1.54, -0.25], [0.25, 0.16, 0.25], '#c17c33');
      add([0.614, 1.11, -0.2], [0.04, 0.38, 0.35], '#795628');
      add([0.64, 1.11, -0.2], [0.035, 0.26, 0.08], '#f7e1a2');
    }
    return boxes;
  }, [color, kind]);
  return (
    <group
      userData={{ vehicleVisualKind: kind, labelOccluder: false }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <Batch items={parts} />
      {kind === 'cargo_bike' &&
        [-0.67, 1.09].map((z) => (
          <mesh key={z} position={[0, 0.31, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.13, 10]} />
            <meshStandardMaterial color="#35483e" roughness={0.9} />
          </mesh>
        ))}
    </group>
  );
}
