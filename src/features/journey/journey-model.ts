import type { DecisionAction, GateId } from '../../domain/types';

export const JOURNEY_STEPS: readonly {
  id: string;
  cursor: number;
  scene: 'city' | 'hub' | 'device';
  gate?: GateId;
  title: [string, string];
  copy: [string, string];
}[] = [
  {
    id: 'request',
    cursor: 32,
    scene: 'city',
    gate: 'hero',
    title: ['Mulai dari satu perangkat.', 'Start with one device.'],
    copy: [
      'Sebuah keluarga ingin menyerahkan ponsel lama. Periksa contoh permintaan di bawah, lalu kirim saat Anda siap.',
      'A household wants to return an old phone. Review the sample request below and submit when you are ready.',
    ],
  },
  {
    id: 'readiness',
    cursor: 74,
    scene: 'city',
    gate: 'specialist',
    title: ['Satu permintaan, satu batch terencana.', 'One request, one coordinated batch.'],
    copy: [
      'Permintaan digabungkan sesuai kendaraan, kapasitas tujuan, dan kebutuhan penanganan. Dua perangkat pada batch ini perlu keputusan khusus. Penahanan adalah pilihan yang sah.',
      'Requests are grouped by vehicle, receiving capacity, and handling requirements. Two devices in this batch need a specialist decision. Retaining a hold is a valid choice.',
    ],
  },
  {
    id: 'collection',
    cursor: 108,
    scene: 'hub',
    title: ['Dijemput bukan berarti selesai.', 'Collected does not mean complete.'],
    copy: [
      'Hub menghubungkan penerimaan, pemeriksaan, dan penyaluran. Antrean dan serah terima mengikuti perangkat yang benar-benar mencapai tahap ini.',
      'The hub connects intake, inspection, and routing. Queues and custody records follow the devices that have actually reached this stage.',
    ],
  },
  {
    id: 'inspection',
    cursor: 130,
    scene: 'device',
    gate: 'data',
    title: ['Nilai dijaga. Data juga.', 'Protect the value. Protect the data.'],
    copy: [
      'Ponsel dan perangkat penyimpan data tetap memerlukan pemeriksaan sebelum dilepas. Tinjau keputusan batch: setujui jika syarat terpenuhi, atau biarkan tetap ditahan.',
      'Phones and other data-bearing devices require review before release. Review the batch decision: approve when requirements are satisfied, or keep the devices on hold.',
    ],
  },
  {
    id: 'outcome',
    cursor: 180,
    scene: 'city',
    title: ['Hasil mengikuti keputusan Anda.', 'Outcomes follow your decisions.'],
    copy: [
      'Lihat jumlah selesai dan yang masih ditahan. Angka ini berasal dari skenario contoh; keputusan penahanan tetap terlihat dan tidak dihitung sebagai hasil selesai.',
      'Review completed and held devices. These figures come from the sample scenario; holds stay visible and do not count as completed outcomes.',
    ],
  },
];

const gateActions: Record<GateId, readonly DecisionAction[]> = {
  hero: ['submit_hero'],
  specialist: ['approve_specialist', 'retain_specialist_hold'],
  data: ['approve_data_release', 'retain_data_hold'],
};

export function canContinueJourney(stepIndex: number, actions: readonly DecisionAction[]): boolean {
  const step = JOURNEY_STEPS[stepIndex];
  if (!step) return false;
  return !step.gate || gateActions[step.gate].some((action) => actions.includes(action));
}

export function journeyStepAtCursor(cursor: number): number {
  const index = JOURNEY_STEPS.findIndex((step) => cursor <= step.cursor);
  return index < 0 ? JOURNEY_STEPS.length - 1 : index;
}
