import type { AssetSnapshot, Snapshot } from '../domain/types';
import type { LiveVehiclePose, LiveOperationsFrame } from '../domain/live-operations';
import { world } from '../domain/fixtures';
import type { Point } from './primitives';
export const HUB_ZONES = [
  {
    id: 'inbound',
    name: 'Dok masuk',
    en: 'Inbound dock',
    color: '#a9c3bf',
    p: [-9, 0, -4] as Point,
    capacity: 16,
  },
  {
    id: 'intake',
    name: 'Penerimaan & pindai',
    en: 'Intake & scan',
    color: '#c4d0ac',
    p: [-3, 0, -4] as Point,
    capacity: 48,
  },
  {
    id: 'triage',
    name: 'Pemeriksaan',
    en: 'Triage benches',
    color: '#c2b2d0',
    p: [3, 0, -4] as Point,
    capacity: 48,
  },
  {
    id: 'data',
    name: 'Pengamanan data',
    en: 'Data clearance',
    color: '#adbdcd',
    p: [9, 0, -4] as Point,
    capacity: 18,
  },
  {
    id: 'outbound',
    name: 'Dok keluar',
    en: 'Outbound loading',
    color: '#a6c4ad',
    p: [-9, 0, 4] as Point,
    capacity: 48,
  },
  {
    id: 'repair',
    name: 'Perbaikan & komponen',
    en: 'Repair & parts',
    color: '#ddc49e',
    p: [-3, 0, 4] as Point,
    capacity: 40,
  },
  {
    id: 'material',
    name: 'Pemulihan material',
    en: 'Material staging',
    color: '#b8c5b1',
    p: [3, 0, 4] as Point,
    capacity: 25,
  },
  {
    id: 'specialist',
    name: 'Penanganan khusus',
    en: 'Specialist hold',
    color: '#dcc28a',
    p: [9, 0, 4] as Point,
    capacity: 6,
  },
];
export function getHubZoneAssets(
  snapshot: Snapshot,
  zoneId: string,
  liveFrame?: LiveOperationsFrame,
): AssetSnapshot[] {
  // The live model keeps collection/delivery custody while a truck is travelling.
  // Only its unloading load is physically at the inbound dock; routed loads leave
  // the outbound queue as soon as their downstream vehicle departs.
  const unloadingIds = liveFrame
    ? new Set(
        liveFrame.vehicles
          .filter((vehicle) => vehicle.phase === 'unloading')
          .flatMap((vehicle) => vehicle.loadAssetIds),
      )
    : null;
  const departedIds = liveFrame
    ? new Set(
        liveFrame.vehicles
          .filter((vehicle) => ['delivering', 'partner_handoff'].includes(vehicle.phase))
          .flatMap((vehicle) => vehicle.loadAssetIds),
      )
    : null;
  return Object.values(snapshot.assets).filter((item) => {
    const { status, asset, held, holdReason, dataCleared } = item;
    if (
      status === 'completed' ||
      ['draft', 'requested', 'validated', 'scheduled', 'assigned'].includes(status)
    )
      return false;
    if (status === 'collected') return zoneId === 'inbound' && (!unloadingIds || unloadingIds.has(asset.id));
    if (held && holdReason === 'safety') return zoneId === 'specialist';
    if (held && holdReason === 'data') return zoneId === 'data';
    if (status === 'received') return zoneId === 'intake';
    if (status === 'routed') return zoneId === 'outbound' && !departedIds?.has(asset.id);
    if (status === 'triaged') {
      if (asset.dataBearing && !dataCleared) return zoneId === 'data';
      if (asset.plannedDisposition === 'specialist') return zoneId === 'specialist';
      if (asset.plannedDisposition === 'material') return zoneId === 'material';
      if (['repair', 'parts', 'refurbishment'].includes(asset.plannedDisposition)) return zoneId === 'repair';
      return zoneId === 'triage';
    }
    return false;
  });
}

/** Physical diagram paths. They describe handling motion, never extra inventory. */
export const HUB_CONVEYOR = { left: -11.4, right: 11.4, lane: 0.43, height: 0.91 };
const wrap = (n: number, length: number) => ((n % length) + length) % length;
export function getHubConveyorPose(elapsed: number, index: number, count: number) {
  const { left, right, lane, height } = HUB_CONVEYOR;
  const length = right - left;
  const perimeter = 2 * length + 4 * lane;
  const progress = wrap(elapsed * 1.32 + (index * perimeter) / Math.max(1, count), perimeter);
  if (progress < length) return { p: [left + progress, height, -lane] as Point, heading: Math.PI / 2 };
  if (progress < length + 2 * lane)
    return { p: [right, height, -lane + progress - length] as Point, heading: 0 };
  if (progress < 2 * length + 2 * lane)
    return {
      p: [right - (progress - length - 2 * lane), height, lane] as Point,
      heading: -Math.PI / 2,
    };
  return {
    p: [left, height, lane - (progress - 2 * length - 2 * lane)] as Point,
    heading: Math.PI,
  };
}

/** A zone's visible queue is a bounded sample of its actual records. */
export function getHubHandoffPose(elapsed: number, zoneIndex: number, queueIndex: number) {
  const zone = HUB_ZONES[zoneIndex];
  const progress = wrap(elapsed * 0.23 + queueIndex * 0.49 + zoneIndex * 0.17, 1);
  const direction = zone.p[2] < 0 ? -1 : 1;
  const destination = zone.id === 'outbound' ? 0 : direction * 2.1;
  const origin = zone.id === 'outbound' ? direction * 2.1 : 0;
  // A handling container travels out, pauses, and returns on the same track.
  // Shrinking it to zero at the end of every trip looked like a rendering fault,
  // especially at 10–30×. Both position and size now remain continuous at wrap.
  const leg =
    progress < 0.42 ? progress / 0.42 : progress < 0.5 ? 1 : progress < 0.92 ? (0.92 - progress) / 0.42 : 0;
  const moving = leg * leg * (3 - 2 * leg);
  return {
    p: [zone.p[0] - 0.65 + queueIndex * 1.3, 0.92, origin + (destination - origin) * moving] as Point,
    heading: direction < 0 ? Math.PI : 0,
    scale: 1,
  };
}

export function getHubCartPose(elapsed: number, index: number) {
  const length = 23.6;
  const width = 3.1;
  const perimeter = 2 * (length + width);
  const progress = wrap(elapsed * 0.9 + (index * perimeter) / 2, perimeter);
  if (progress < length) return { p: [-11.8 + progress, 0.1, 1.55] as Point, heading: Math.PI / 2 };
  if (progress < length + width)
    return { p: [11.8, 0.1, 1.55 - (progress - length)] as Point, heading: Math.PI };
  if (progress < 2 * length + width)
    return {
      p: [11.8 - (progress - length - width), 0.1, -1.55] as Point,
      heading: -Math.PI / 2,
    };
  return { p: [-11.8, 0.1, -1.55 + progress - 2 * length - width] as Point, heading: 0 };
}

export function getHubDockPose(pose: LiveVehiclePose, index: number) {
  const distance = Math.hypot(
    pose.position[0] - world.hub.position[0],
    pose.position[1] - world.hub.position[1],
  );
  const atDock = ['unloading', 'processing'].includes(pose.phase);
  const approaching = ['returning'].includes(pose.phase);
  const leaving = ['delivering'].includes(pose.phase);
  return {
    visible: atDock || ((approaching || leaving) && distance < 18),
    p: [-16.15 - (atDock ? 0 : Math.min(18, distance) * 0.54), 0.16, -6.35 + index * 2.55] as Point,
    heading: -Math.PI / 2,
    docking: atDock,
    unloading: pose.phase === 'unloading',
  };
}
