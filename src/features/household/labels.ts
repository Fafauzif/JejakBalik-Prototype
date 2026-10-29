export const categoryLabels: Record<string, [string, string]> = {
  phone: ['Ponsel', 'Phone'],
  laptop: ['Laptop', 'Laptop'],
  tablet: ['Tablet', 'Tablet'],
  router: ['Router', 'Router'],
  accessories: ['Aksesori', 'Accessories'],
  small_appliance: ['Peralatan kecil', 'Small appliance'],
  monitor: ['Monitor', 'Monitor'],
  printer: ['Printer', 'Printer'],
  large_appliance: ['Peralatan besar', 'Large appliance'],
  battery: ['Baterai', 'Battery'],
};
export const conditionLabels: Record<string, [string, string]> = {
  functional: ['Masih berfungsi', 'Still works'],
  repairable: ['Perlu perbaikan', 'Needs repair'],
  worn: ['Berfungsi, kondisi aus', 'Works, with wear'],
  parts_only: ['Untuk komponen', 'For parts'],
  nonfunctional: ['Tidak berfungsi', 'Not working'],
  intact: ['Utuh', 'Intact'],
  damaged: ['Rusak / menggembung', 'Damaged / swollen'],
};
export const statusLabels: Record<string, [string, string]> = {
  draft: ['Belum diajukan', 'Not submitted'],
  requested: ['Permintaan diterima', 'Request received'],
  validated: ['Perangkat ditinjau', 'Item reviewed'],
  scheduled: ['Jadwal dikonfirmasi', 'Schedule confirmed'],
  assigned: ['Petugas ditugaskan', 'Collection assigned'],
  collected: ['Sudah dijemput', 'Collected'],
  received: ['Tiba di pusat konsolidasi', 'At the consolidation hub'],
  triaged: ['Sedang diproses', 'Processing'],
  routed: ['Menuju pemulihan', 'On the recovery pathway'],
  completed: ['Hasil sudah tersedia', 'Outcome ready'],
};
export const dispositionLabels: Record<string, [string, string]> = {
  reuse: ['Pemanfaatan kembali', 'Reuse'],
  repair: ['Perbaikan', 'Repair'],
  refurbishment: ['Rekondisi', 'Refurbishment'],
  parts: ['Pemulihan komponen', 'Parts recovery'],
  material: ['Pemulihan material', 'Material recovery'],
  specialist: ['Penanganan khusus', 'Specialist handling'],
};
export const translated = (labels: Record<string, [string, string]>, key: string, locale: string) =>
  labels[key]?.[locale === 'en' ? 1 : 0] ?? key;
