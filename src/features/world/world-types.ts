import type { Asset, AssetSnapshot, Snapshot, RouteRecord } from '../../domain/types';
import type { LiveOperationsFrame } from '../../domain/live-operations';
export type WorldMode = 'city' | 'hub' | 'device';
export interface PerformanceSample {
  scene: WorldMode;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  frames: number;
  durationSeconds: number;
  averageFps: number;
  p95FrameMs: number;
  dpr: number;
  viewport: string;
  quality: string;
}
export type SelectKind = 'household' | 'vehicle' | 'hub' | 'destination' | 'zone' | 'asset' | 'district';
export interface WorldCanvasProps {
  mode: WorldMode;
  snapshot: Snapshot;
  routes: readonly RouteRecord[];
  cursor: number;
  liveFrame?: LiveOperationsFrame;
  quality?: 'auto' | 'low' | 'lite' | 'standard' | 'high';
  selectedId?: string | null;
  onSelect: (id: string, kind?: SelectKind) => void;
  asset?: Asset | AssetSnapshot | null;
  exploded?: boolean;
  selectedComponent?: string | null;
  onComponentSelect?: (component: string) => void;
  focusTarget?: string | null;
  cameraReset?: number;
  reducedMotion?: boolean;
  roofVisible?: boolean;
  language?: 'id' | 'en';
  paused?: boolean;
  liveSpeed?: number;
  /** Called only after the renderer has completed an actual scene draw. */
  onReady?: () => void;
  onError?: (message: string) => void;
  onPerformance?: (sample: PerformanceSample) => void;
}
