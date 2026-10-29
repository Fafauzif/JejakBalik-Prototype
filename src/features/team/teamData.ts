import type { Snapshot } from '../../domain/types';
export type TeamId = 'scout' | 'route' | 'liaison' | 'triage' | 'impact' | 'guardian' | 'orchestrator';
export const teamRoster: Array<{
  id: TeamId;
  name: string;
  image: string;
  role: [string, string];
  artifact: [string, string];
  color: string;
}> = [
  {
    id: 'scout',
    name: 'Scout',
    image: 'scout',
    role: ['Pemeriksaan permintaan', 'Pickup intelligence'],
    artifact: ['Tinjauan perangkat', 'Item review'],
    color: '#E6BE67',
  },
  {
    id: 'route',
    name: 'Rute',
    image: 'rute',
    role: ['Perencanaan rute balik', 'Reverse-route planning'],
    artifact: ['Usulan rute', 'Route proposal'],
    color: '#A8CAD4',
  },
  {
    id: 'liaison',
    name: 'Mitra',
    image: 'mitra',
    role: ['Koordinasi kapasitas', 'Partner coordination'],
    artifact: ['Manifest serah terima', 'Handoff manifest'],
    color: '#E6B29A',
  },
  {
    id: 'triage',
    name: 'Pilah',
    image: 'pilah',
    role: ['Penilaian perangkat', 'Device triage'],
    artifact: ['Hasil pemilahan', 'Triage assessment'],
    color: '#C4B5D9',
  },
  {
    id: 'impact',
    name: 'Dampak',
    image: 'dampak',
    role: ['Pelaporan hasil', 'Outcome reporting'],
    artifact: ['Laporan batch', 'Batch report'],
    color: '#A9C9B1',
  },
  {
    id: 'guardian',
    name: 'Jaga',
    image: 'jaga',
    role: ['Keselamatan dan data', 'Safety and data'],
    artifact: ['Tinjauan penahanan', 'Hold review'],
    color: '#D8C787',
  },
  {
    id: 'orchestrator',
    name: 'Kendali',
    image: 'kendali',
    role: ['Koordinasi operasi', 'Operations coordination'],
    artifact: ['Koordinasi batch', 'Batch coordination'],
    color: '#DCD6BC',
  },
];
export { categoryNames as deviceNames, statusNames, dispositionNames } from '../../i18n';
export function getAgentStatus(
  id: TeamId,
  s: Snapshot,
): [string, string, 'success' | 'warning' | 'neutral' | 'info'] {
  const m = s.metrics;
  const held = s.assetList.some((a) => a.held);
  const allDone = m.batchAssets > 0 && m.completedAssets === m.batchAssets;
  if (id === 'guardian')
    return s.pendingCheckpoint === 'specialist' || s.pendingCheckpoint === 'data'
      ? ['Menunggu Anda', 'Waiting for you', 'warning']
      : held
        ? ['Menjaga penahanan', 'Holding assets', 'warning']
        : ['Memantau', 'Monitoring', 'success'];
  if (id === 'orchestrator')
    return s.pendingCheckpoint
      ? ['Menunggu Anda', 'Waiting for you', 'warning']
      : allDone
        ? ['Selesai', 'Complete', 'success']
        : ['Mengoordinasikan', 'Coordinating', 'info'];
  if (id === 'scout')
    return s.pendingCheckpoint === 'hero'
      ? ['Menunggu permintaan', 'Awaiting request', 'warning']
      : s.cursor > 15
        ? ['Tinjauan siap', 'Review ready', 'success']
        : ['Memeriksa', 'Reviewing', 'info'];
  if (id === 'route')
    return allDone
      ? ['Rute selesai', 'Routes complete', 'success']
      : m.collectedAssets > 0
        ? ['Rute berjalan', 'Routes active', 'info']
        : ['Rencana siap', 'Plan ready', 'success'];
  if (id === 'liaison')
    return m.completedAssets > 0
      ? ['Serah terima berjalan', 'Handoffs active', 'info']
      : m.collectedAssets > 0
        ? ['Kapasitas tersedia', 'Capacity ready', 'success']
        : ['Menunggu penjemputan', 'Awaiting collection', 'neutral'];
  if (id === 'triage')
    return allDone
      ? ['Pemilahan selesai', 'Triage complete', 'success']
      : s.assetList.some((a) => ['received', 'triaged', 'routed'].includes(a.status))
        ? ['Sedang memilah', 'Triage in progress', 'info']
        : ['Menunggu perangkat', 'Awaiting devices', 'neutral'];
  return allDone
    ? ['Laporan lengkap', 'Report complete', 'success']
    : m.completedAssets > 0
      ? ['Mencatat hasil', 'Recording outcomes', 'info']
      : ['Menunggu hasil', 'Awaiting outcomes', 'neutral'];
}
