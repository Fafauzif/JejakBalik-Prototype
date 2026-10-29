import { partners } from '../../domain';
import type { LiveOperationsFrame } from '../../domain/live-operations';
import type { TeamId } from './teamData';

type Pair = [string, string];
export interface LiveTeamTask {
  status: [string, string, 'success' | 'info' | 'neutral'];
  task: Pair;
  detail: Pair;
  reference: string;
}

const handoffs: Array<[TeamId, TeamId]> = [
  ['scout', 'route'],
  ['route', 'liaison'],
  ['liaison', 'triage'],
  ['triage', 'guardian'],
  ['guardian', 'impact'],
  ['impact', 'orchestrator'],
  ['orchestrator', 'scout'],
];

/** Authored work captions derived from the same operational frame as the fleet. */
export function getLiveTeamActivity(frame: LiveOperationsFrame) {
  const beat = Math.floor(frame.elapsedSeconds / 7);
  const pick = <T>(items: T[]) => items[beat % items.length];
  const incoming = frame.snapshot.assetList.filter((item) => ['scheduled', 'assigned'].includes(item.status));
  const intake = frame.snapshot.assetList.filter((item) => ['received', 'triaged'].includes(item.status));
  const firstAsset = frame.snapshot.assetList[0];
  const incomingAsset = pick(incoming) ?? firstAsset;
  const hubAsset = pick(intake) ?? firstAsset;
  const routeVehicle = pick(frame.vehicles.filter((vehicle) => vehicle.moving)) ?? frame.vehicles[0];
  const partnerVehicle =
    pick(frame.vehicles.filter((vehicle) => ['delivering', 'partner_handoff'].includes(vehicle.phase))) ??
    frame.vehicles[0];
  const lastHandoff = frame.activityFeed.find((event) => event.kind === 'partner_handoff');
  const partner =
    partners.find((item) => item.id === partnerVehicle?.targetId) ??
    partners.find((item) => item.id === lastHandoff?.targetId) ??
    partners[beat % partners.length];
  const partnerItems = frame.snapshot.assetList.filter((item) => item.asset.destinationId === partner.id);
  const safetyItems = frame.snapshot.assetList.filter(
    (item) => item.asset.handlingClass === 'specialist' || item.asset.dataBearing,
  );
  const guardedAsset = pick(safetyItems) ?? firstAsset;
  const dataChecks = frame.snapshot.assetList.filter((item) => item.dataCleared).length;
  const checkingData = beat % 2 === 0;
  const recentOutcome = lastHandoff && frame.elapsedSeconds - lastHandoff.atElapsedSecond < 12;
  const task: Record<TeamId, LiveTeamTask> = {
    scout: {
      status: incoming.length
        ? ['Meninjau permintaan', 'Reviewing requests', 'info']
        : ['Daftar jemput siap', 'Pickup list ready', 'success'],
      task: incoming.length
        ? [`Cek kebutuhan ${incomingAsset.asset.id}`, `Check needs for ${incomingAsset.asset.id}`]
        : ['Siapkan daftar jemput berikutnya', 'Prepare the next pickup list'],
      detail: [
        `${incoming.length} perangkat menunggu penjemputan. Jenis dan kelas penanganan tercatat untuk Rute.`,
        `${incoming.length} devices await collection. Device types and handling classes are recorded for Rute.`,
      ],
      reference: incomingAsset.asset.id,
    },
    route: {
      status:
        routeVehicle.phase === 'returning' || routeVehicle.phase === 'repositioning'
          ? ['Memeriksa rute balik', 'Checking return legs', 'info']
          : routeVehicle.phase === 'outbound'
            ? ['Mengarahkan penjemputan', 'Routing pickups', 'info']
            : ['Mencocokkan serah terima', 'Matching handoffs', 'info'],
      task: [
        `Cocokkan ${routeVehicle.vehicleId} · ${routeVehicle.routeId}`,
        `Match ${routeVehicle.vehicleId} · ${routeVehicle.routeId}`,
      ],
      detail: [
        `${frame.fleet.movingVehicles} kendaraan bergerak. Muatan dan rute balik dicocokkan dengan kelas kendaraan.`,
        `${frame.fleet.movingVehicles} vehicles are moving. Loads and return routes are matched to vehicle class.`,
      ],
      reference: routeVehicle.routeId,
    },
    liaison: {
      status:
        partnerVehicle.phase === 'partner_handoff'
          ? ['Memeriksa manifest', 'Checking manifests', 'info']
          : partnerVehicle.phase === 'delivering'
            ? ['Menyiapkan penerimaan', 'Preparing receipt', 'info']
            : ['Menyelaraskan kapasitas', 'Aligning capacity', 'info'],
      task: [`Cek kapasitas ${partner.id}`, `Check ${partner.id} capacity`],
      detail: [
        `${partner.name} menerima ${partnerItems.length} perangkat dari beban berjalan, dengan kapasitas ${partner.capacityAssets} perangkat.`,
        `${partner.name} has ${partnerItems.length} devices in the rolling workload, against capacity of ${partner.capacityAssets} devices.`,
      ],
      reference: partner.id,
    },
    triage: {
      status: intake.length
        ? ['Memilah di pusat', 'Triaging at the hub', 'info']
        : ['Penerimaan siap', 'Intake ready', 'success'],
      task: intake.length
        ? [`Pilah ${hubAsset.asset.id}`, `Triage ${hubAsset.asset.id}`]
        : ['Cek antrean masuk pusat', 'Check the hub intake queue'],
      detail: [
        `${intake.length} perangkat berada di penerimaan dan pemilahan. Tujuan pemulihan mengikuti kondisi perangkat.`,
        `${intake.length} devices are at intake and triage. Recovery destinations follow device condition.`,
      ],
      reference: intake.length ? hubAsset.asset.id : 'HUB-01',
    },
    impact: {
      status: recentOutcome
        ? ['Mencatat hasil periode', 'Recording period outcomes', 'info']
        : ['Merekonsiliasi hasil', 'Reconciling outcomes', 'info'],
      task: [
        `Cocokkan ${frame.metrics.completedAssets} hasil tercatat`,
        `Reconcile ${frame.metrics.completedAssets} recorded outcomes`,
      ],
      detail: [
        `${frame.metrics.completedAssets} hasil selesai dalam beban berjalan, didukung catatan serah terima periode ini.`,
        `${frame.metrics.completedAssets} outcomes are complete in the rolling workload, supported by this period’s handoff records.`,
      ],
      reference: lastHandoff?.routeId ?? frame.routes[0].routeId,
    },
    guardian: {
      status: checkingData
        ? ['Memeriksa riwayat data', 'Checking data history', 'info']
        : ['Memeriksa riwayat keselamatan', 'Checking safety history', 'info'],
      task: [`Cek jejak ${guardedAsset.asset.id}`, `Check ${guardedAsset.asset.id} safeguards`],
      detail: [
        `Pemeriksaan riwayat keselamatan dan data: ${dataChecks} perangkat memiliki catatan pelepasan data. Keputusan tutorial tetap ditinjau terpisah.`,
        `Historical safety and data checks: ${dataChecks} devices have data-release records. Tutorial decisions remain separately reviewed.`,
      ],
      reference: guardedAsset.asset.id,
    },
    orchestrator: {
      status:
        frame.fleet.collectingVehicles > 0
          ? ['Mengoordinasikan jemput', 'Coordinating pickups', 'info']
          : frame.fleet.hubVehicles > 0
            ? ['Menyambungkan pekerjaan pusat', 'Coordinating hub work', 'info']
            : ['Menyambungkan serah terima', 'Coordinating handoffs', 'info'],
      task: [
        `Sinkronkan ${frame.fleet.totalVehicles} kendaraan`,
        `Coordinate ${frame.fleet.totalVehicles} vehicles`,
      ],
      detail: [
        `${frame.fleet.collectingVehicles} kendaraan mengambil perangkat, ${frame.fleet.hubVehicles} di pusat, dan ${frame.fleet.downstreamVehicles} melayani mitra.`,
        `${frame.fleet.collectingVehicles} vehicles are collecting, ${frame.fleet.hubVehicles} are at the hub, and ${frame.fleet.downstreamVehicles} are serving partners.`,
      ],
      reference: routeVehicle.vehicleId,
    },
  };
  const handoff = handoffs[beat % handoffs.length];
  // A single anchored caption passes from sender to receiver without covering another caption.
  const active = [frame.elapsedSeconds % 7 < 3 ? handoff[0] : handoff[1]];
  return { tasks: task, active, handoff, routeId: routeVehicle.routeId };
}
