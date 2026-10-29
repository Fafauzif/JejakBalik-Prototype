import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { RouteRecord } from '../../domain/types';
import { getVehiclePose } from '../../domain';
import { getLiveVehiclePose, type LiveOperationsFrame } from '../../domain/live-operations';
import { readLiveVisualSeconds } from '../../state/network-store';
import CityScene from '../../graphics/CityScene';
import HubScene, { HUB_ZONES } from '../../graphics/HubScene';
import DeviceScene from '../../graphics/DeviceScene';
import SceneFallback from '../../graphics/SceneFallback';
import world from '../../graphics/world-data.json';
import partners from '../../domain/data/PARTNERS.json';
export { HUB_ZONES, getHubZoneAssets } from '../../graphics/hub-data';
import type { WorldCanvasProps, WorldMode, PerformanceSample } from './world-types';
export type { WorldCanvasProps, WorldMode, PerformanceSample } from './world-types';
class CanvasBoundary extends Component<
  { children: ReactNode; onError?: (message: string) => void; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error.message);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const tmp = new THREE.Vector3();
function ContextHealth({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}
/** Suspense has committed and the renderer has drawn, rather than merely acquired a context. */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const { gl, invalidate } = useThree();
  const sent = useRef(false);
  const frame = useRef<number | undefined>(undefined);
  useEffect(() => {
    invalidate();
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [invalidate]);
  useFrame(() => {
    if (sent.current || frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      if (gl.info.render.frame > 0 && !gl.getContext().isContextLost()) {
        sent.current = true;
        onReady?.();
      } else invalidate();
    });
  });
  return null;
}
function CameraRig({
  mode,
  focusTarget,
  cameraReset,
  exploded,
  reducedMotion,
  routes,
  cursor,
  liveFrame,
  paused,
  liveSpeed = 1,
}: {
  mode: WorldMode;
  focusTarget?: string | null;
  cameraReset?: number;
  exploded: boolean;
  reducedMotion: boolean;
  routes: readonly RouteRecord[];
  cursor: number;
  liveFrame?: LiveOperationsFrame;
  paused?: boolean;
  liveSpeed?: number;
}) {
  const controls = useRef<any>(null),
    { camera, size, invalidate } = useThree();
  const desired = useRef(new THREE.Vector3(90, 85, 95)),
    target = useRef(new THREE.Vector3()),
    flying = useRef(true),
    manual = useRef(false),
    previousReset = useRef(cameraReset);
  useEffect(() => {
    const isReset = previousReset.current !== cameraReset;
    previousReset.current = cameraReset;
    const focus = isReset ? null : focusTarget;
    manual.current = isReset;
    const aspect = size.width / Math.max(1, size.height),
      mobile = size.width < 600 || aspect < 0.85;
    let p: [number, number, number],
      t: [number, number, number] = [0, 0, 0];
    if (mode === 'hub') {
      p = mobile ? [40, 39, 46] : [28, 29, 34];
      const z = HUB_ZONES.find((z) => z.id === focus);
      if (z) {
        t = [z.p[0], 0.5, z.p[2]];
        p = [t[0] + 12, 15, t[2] + 16];
      }
    } else if (mode === 'device') {
      t = [0, 2.2, 0];
      p = exploded ? (mobile ? [18, 10, 24] : [9, 6.7, 12]) : mobile ? [8, 5, 11] : [6.5, 4.6, 8.8];
    } else {
      p = mobile ? [157, 147, 165] : [111, 110, 122];
      t = [0, 0, 3];
      const district = world.districts.find((d) => d.id === focus),
        house = world.households.find((h) => h.id === focus),
        partner = partners.find((d) => d.id === focus);
      const r = routes.find((r) => r.id === focus || r.vehicleId === focus);
      const entity =
        house?.position || district?.center || partner?.position || (focus === 'H01' ? [0, -3] : null);
      if (entity) {
        t = [entity[0], 0, entity[1]];
        const d = house ? 15 : district ? 28 : 20;
        p = [t[0] + d, t[1] + d * 1.1, t[2] + d];
      } else if (r) {
        const pose = liveFrame
          ? liveFrame.vehicles.find((v) => v.vehicleId === (focus?.startsWith('V') ? focus : r.vehicleId)) ||
            getVehiclePose(r, cursor)
          : getVehiclePose(r, cursor);
        t = [pose.position[0], 0, pose.position[1]];
        p = [t[0] + 18, 23, t[2] + 23];
      }
    }
    desired.current.set(...p);
    target.current.set(...t);
    flying.current = true;
    if (reducedMotion) {
      camera.position.copy(desired.current);
      controls.current?.target.copy(target.current);
      camera.lookAt(target.current);
      controls.current?.update();
      flying.current = false;
    }
    invalidate();
    // Cursor changes move vehicles, not the viewer; follow is updated independently below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, focusTarget, cameraReset, exploded, size.width, size.height, reducedMotion]);
  useFrame((state, delta) => {
    if (!controls.current) return;
    if (mode === 'city' && focusTarget?.startsWith('V') && !manual.current) {
      if (liveFrame) {
        const time = readLiveVisualSeconds(reducedMotion);
        const pose = getLiveVehiclePose(focusTarget, time);
        if (pose) {
          target.current.set(pose.position[0], 0, pose.position[1]);
          desired.current.set(pose.position[0] + 18, 23, pose.position[1] + 23);
          flying.current = true;
        }
      } else {
        const r = routes.find(
          (r) => r.vehicleId === focusTarget && cursor >= r.startStorySecond && cursor < r.endStorySecond,
        );
        if (r) {
          const pose = getVehiclePose(r, cursor);
          target.current.set(pose.position[0], 0, pose.position[1]);
          desired.current.set(pose.position[0] + 18, 23, pose.position[1] + 23);
          flying.current = true;
        }
      }
    }
    if (flying.current) {
      const speed = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 4.8);
      camera.position.lerp(desired.current, speed);
      controls.current.target.lerp(target.current, speed);
      controls.current.update();
      if (
        camera.position.distanceToSquared(desired.current) < 0.01 &&
        controls.current.target.distanceToSquared(target.current) < 0.01
      )
        flying.current = false;
      else state.invalidate();
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={mode === 'city' ? 10 : mode === 'hub' ? 8 : 4}
      maxDistance={mode === 'city' ? 330 : mode === 'hub' ? 100 : 38}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={0.15}
      enablePan={mode !== 'device'}
      rotateSpeed={0.65}
      zoomSpeed={0.8}
      onStart={() => {
        flying.current = false;
        manual.current = true;
      }}
      target={[0, 0, 0]}
    />
  );
}
function Metrics({
  mode,
  quality,
  onPerformance,
  onAdaptiveDpr,
}: {
  mode: WorldMode;
  quality: string;
  onPerformance?: WorldCanvasProps['onPerformance'];
  onAdaptiveDpr: (dpr: number) => void;
}) {
  const { gl, size } = useThree(),
    adapted = useRef(false),
    frames = useRef<number[]>([]),
    duration = useRef(0),
    lastReport = useRef(0),
    scene = useRef(mode);
  useFrame((_, delta) => {
    if (scene.current !== mode) {
      scene.current = mode;
      frames.current = [];
      duration.current = 0;
      lastReport.current = 0;
    }
    duration.current += delta;
    if (delta < 2) frames.current.push(delta * 1000);
    if (frames.current.length > 6000) frames.current.shift();
    if (duration.current - lastReport.current >= 1) {
      lastReport.current = duration.current;
      const values = [...frames.current].sort((a, b) => a - b),
        sum = frames.current.reduce((a, b) => a + b, 0);
      const sample: PerformanceSample = {
        scene: mode,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        frames: frames.current.length,
        durationSeconds: duration.current,
        averageFps: sum ? frames.current.length / (sum / 1000) : 0,
        p95FrameMs: values[Math.floor(values.length * 0.95)] || 0,
        dpr: gl.getPixelRatio(),
        viewport: `${size.width}×${size.height}`,
        quality,
      };
      if (quality === 'auto' && duration.current > 4 && !adapted.current && sample.averageFps < 28) {
        onAdaptiveDpr(0.85);
        adapted.current = true;
      } else if (quality === 'auto' && adapted.current && duration.current > 14 && sample.averageFps > 50) {
        onAdaptiveDpr(1.1);
        adapted.current = false;
      }
      (window as any).__JEJAK_PERF = sample;
      onPerformance?.(sample);
    }
  });
  return null;
}
/** A context alone is insufficient: wait until a previous frame actually drew scene geometry. */
function FirstRenderedFrame({ onReady }: { onReady?: () => void }) {
  const sawFrame = useRef(false);
  const reported = useRef(false);
  useFrame(({ gl, invalidate }) => {
    if (reported.current) return;
    if (sawFrame.current && gl.info.render.calls > 0 && !gl.getContext().isContextLost()) {
      reported.current = true;
      onReady?.();
    } else {
      sawFrame.current = true;
      // Demand/reduced-motion scenes also need a second frame to confirm the first draw.
      invalidate();
    }
  });
  return null;
}
export function WorldCanvas(props: WorldCanvasProps) {
  const {
    mode,
    snapshot,
    routes,
    cursor,
    liveFrame,
    onSelect,
    selectedId,
    asset,
    exploded = false,
    selectedComponent,
    onComponentSelect,
    focusTarget,
    cameraReset = 0,
    roofVisible = false,
    language = 'id',
    onError,
    onPerformance,
  } = props;
  const prefersReduced = useMemo(
      () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      [],
    ),
    reducedMotion = props.reducedMotion ?? prefersReduced;
  const [failed, setFailed] = useState(false);
  const quality = props.quality || 'auto';
  const [autoDpr, setAutoDpr] = useState<number | null>(null);
  const lite = quality === 'low' || quality === 'lite';
  const shadows = !lite && !(quality === 'auto' && autoDpr !== null && autoDpr < 1);
  const dpr =
    quality === 'high'
      ? 1.5
      : lite
        ? 1
        : quality === 'auto' && autoDpr !== null
          ? autoDpr
          : quality === 'auto'
            ? 1
            : Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 1.25);
  const item = asset && 'asset' in asset ? asset.asset : asset;
  const fallback = <SceneFallback {...props} reducedMotion={reducedMotion} />;
  if (failed) return fallback;
  return (
    <CanvasBoundary fallback={fallback} onError={onError}>
      <Canvas
        shadows={shadows}
        dpr={dpr}
        frameloop={mode !== 'device' && !reducedMotion && !props.paused ? 'always' : 'demand'}
        camera={{ position: [100, 99, 110], fov: 35, near: 0.1, far: 600 }}
        gl={{ antialias: !lite, alpha: false, powerPreference: 'default' }}
        fallback={
          <span>{language === 'en' ? 'Interactive network view' : 'Tampilan jaringan interaktif'}</span>
        }
        onCreated={({ gl }) => {
          gl.setClearColor('#edeadf');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.03;
        }}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={['#edeadf']} />
        <fog attach="fog" args={['#edeadf', mode === 'city' ? 330 : 80, mode === 'city' ? 600 : 190]} />
        <ambientLight intensity={0.55} />
        <ContextHealth
          onLost={() => {
            setFailed(true);
            onError?.('WebGL context lost');
          }}
        />
        <hemisphereLight args={['#fff8e9', '#a6b5a7', 1.5]} />
        <directionalLight position={[45, 24, -40]} intensity={0.65} color="#c9e2e0" />
        <directionalLight
          castShadow={shadows}
          position={[-35, 65, 25]}
          intensity={2.4}
          color="#fff2d8"
          shadow-mapSize={[quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024]}
          shadow-camera-left={-85}
          shadow-camera-right={85}
          shadow-camera-top={85}
          shadow-camera-bottom={-85}
          shadow-camera-far={180}
          shadow-normalBias={0.05}
          shadow-bias={-0.0005}
        />
        <Suspense fallback={null}>
          {mode === 'city' ? (
            <CityScene
              snapshot={snapshot}
              routes={routes}
              cursor={cursor}
              liveFrame={liveFrame}
              paused={props.paused}
              liveSpeed={props.liveSpeed}
              selectedId={selectedId}
              onSelect={onSelect}
              quality={quality}
              reducedMotion={reducedMotion}
              focusTarget={focusTarget}
              language={language}
            />
          ) : mode === 'hub' ? (
            <HubScene
              snapshot={snapshot}
              cursor={cursor}
              liveFrame={liveFrame}
              paused={props.paused}
              liveSpeed={props.liveSpeed}
              reducedMotion={reducedMotion}
              selectedId={selectedId}
              onSelect={onSelect}
              roofVisible={roofVisible}
              language={language}
            />
          ) : item ? (
            <DeviceScene
              asset={item}
              exploded={exploded}
              selectedComponent={selectedComponent}
              onComponentSelect={onComponentSelect}
              reducedMotion={reducedMotion}
              language={language}
            />
          ) : null}
          <FirstFrame onReady={props.onReady} />
          <FirstRenderedFrame onReady={props.onReady} />
        </Suspense>
        <CameraRig
          mode={mode}
          focusTarget={focusTarget}
          cameraReset={cameraReset}
          exploded={exploded}
          reducedMotion={reducedMotion}
          routes={routes}
          cursor={cursor}
          liveFrame={liveFrame}
          paused={props.paused}
          liveSpeed={props.liveSpeed}
        />
        <Metrics mode={mode} quality={quality} onPerformance={onPerformance} onAdaptiveDpr={setAutoDpr} />
      </Canvas>
    </CanvasBoundary>
  );
}
export default WorldCanvas;
