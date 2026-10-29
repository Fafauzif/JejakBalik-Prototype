import { partners, world } from './fixtures';
import type { Vec2 } from './types';

export interface LocalizedLogisticsLabel {
  id: string;
  en: string;
}
export type LiveVehicleVisualKind =
  'partner_van' | 'delivery_box' | 'cargo_bike' | 'community_pickup' | 'bulky_truck' | 'specialist';
export interface LiveVehicleProfile {
  id: string;
  operator: LocalizedLogisticsLabel;
  visualKind: LiveVehicleVisualKind;
  role: LocalizedLogisticsLabel;
  origin: {
    id: string;
    label: LocalizedLogisticsLabel;
    position: Vec2;
    kind: 'partner_depot' | 'neighborhood';
  };
  pickupLabel: LocalizedLogisticsLabel;
  backhaulLabel: LocalizedLogisticsLabel;
  color: string;
  /** Ordinary partner deliveries are illustrative, outside the 48 recovery-asset cohort. */
  carriesOrdinaryDeliveries: boolean;
}
const label = (id: string, en: string): LocalizedLogisticsLabel => ({ id, en });
const depot = (id: string): LiveVehicleProfile['origin'] => {
  const partner = partners.find((item) => item.id === id)!;
  return {
    id,
    label: label(`Depo ${partner.name}`, `${partner.name} depot`),
    position: [partner.position[0], partner.position[1]],
    kind: 'partner_depot',
  };
};
const neighborhood = (id: string, name: string): LiveVehicleProfile['origin'] => {
  const household = world.households.find((item) => item.id === id)!;
  return {
    id,
    label: label(`Titik lingkungan ${name}`, `${name} neighborhood point`),
    position: [household.position[0], household.position[1]],
    kind: 'neighborhood',
  };
};

/** Fictional operating roles, not claims of real carrier or retail partnerships. */
export const liveVehicleProfiles: readonly LiveVehicleProfile[] = [
  {
    id: 'V01',
    operator: label('Kembali Guna · armada mitra', 'Kembali Guna · partner fleet'),
    visualKind: 'partner_van',
    role: label('Antar mitra + penjemputan balik', 'Partner delivery + backhaul pickup'),
    origin: depot('P01'),
    pickupLabel: label('Jemput pada rute balik mitra', 'Pickup on the partner return route'),
    backhaulLabel: label(
      'Antar biasa → jemput balik → pusat → mitra',
      'Ordinary delivery → backhaul pickup → hub → partner',
    ),
    color: '#e5a657',
    carriesOrdinaryDeliveries: true,
  },
  {
    id: 'V02',
    operator: label('Sirkula Komponen · armada mitra', 'Sirkula Komponen · partner fleet'),
    visualKind: 'delivery_box',
    role: label('Antar komponen + muatan balik', 'Component delivery + return load'),
    origin: depot('P02'),
    pickupLabel: label('Gabung penjemputan setelah antar biasa', 'Compatible pickup after ordinary delivery'),
    backhaulLabel: label(
      'Depo mitra → antar biasa → koleksi → pusat',
      'Partner depot → ordinary delivery → collection → hub',
    ),
    color: '#b69bd6',
    carriesOrdinaryDeliveries: true,
  },
  {
    id: 'V03',
    operator: label('Pulih Material · pengangkut terjadwal', 'Pulih Material · appointment carrier'),
    visualKind: 'bulky_truck',
    role: label('Penjemputan barang besar sesuai janji', 'Bulky pickup by appointment'),
    origin: depot('P03'),
    pickupLabel: label('Janji angkut perangkat besar', 'Booked bulky-device collection'),
    backhaulLabel: label(
      'Depo → janji angkut → pusat → mitra pemulihan',
      'Depot → booked pickup → hub → recovery partner',
    ),
    color: '#cc8461',
    carriesOrdinaryDeliveries: false,
  },
  {
    id: 'V04',
    operator: label('Ronda lingkungan · sepeda kargo', 'Neighborhood round · cargo bike'),
    visualKind: 'cargo_bike',
    role: label('Antar lokal + koleksi searah', 'Local delivery + compatible collection'),
    origin: neighborhood('HH-025', 'Tenggara'),
    pickupLabel: label('Koleksi perangkat kecil searah', 'Compatible small-device collection'),
    backhaulLabel: label(
      'Antar lokal → jemput searah → pusat → mitra',
      'Local delivery → compatible pickup → hub → partner',
    ),
    color: '#75bea9',
    carriesOrdinaryDeliveries: true,
  },
  {
    id: 'V05',
    operator: label('Jaga Residu · armada khusus', 'Jaga Residu · specialist fleet'),
    visualKind: 'specialist',
    role: label('Pengangkut khusus · muatan terpisah', 'Specialist carrier · segregated load'),
    origin: depot('P04'),
    pickupLabel: label(
      'Penjemputan khusus dengan prasyarat keselamatan',
      'Specialist pickup with safety prerequisites',
    ),
    backhaulLabel: label(
      'Depo khusus → jemput aman → pusat → Jaga Residu',
      'Specialist depot → safe pickup → hub → Jaga Residu',
    ),
    color: '#da9a77',
    carriesOrdinaryDeliveries: false,
  },
  {
    id: 'V06',
    operator: label('Ronda koleksi warga', 'Community collection round'),
    visualKind: 'community_pickup',
    role: label('Putaran koleksi bersama warga', 'Shared community collection round'),
    origin: neighborhood('HH-033', 'Barat Daya'),
    pickupLabel: label('Koleksi gabungan dari lingkungan', 'Grouped neighborhood collection'),
    backhaulLabel: label(
      'Titik warga → putaran koleksi → pusat → mitra',
      'Community point → collection round → hub → partner',
    ),
    color: '#89a8cf',
    carriesOrdinaryDeliveries: false,
  },
];
const profileById = new Map(liveVehicleProfiles.map((profile) => [profile.id, profile]));
export const getLiveVehicleProfile = (id: string): LiveVehicleProfile | undefined => profileById.get(id);
