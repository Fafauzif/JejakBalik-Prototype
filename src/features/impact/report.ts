import type { Snapshot } from '../../domain/types';
import { categoryNames, dispositionNames, statusNames } from '../../i18n';

export function downloadContent(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const escape = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function buildBatchReport(snapshot: Snapshot, locale: 'id' | 'en', logoUrl = '/brand/logo.svg') {
  const t = (id: string, en: string) => (locale === 'en' ? en : id);
  const lang = locale === 'en' ? 'en-GB' : 'id-ID';
  const n = (value: number, d = 0) => new Intl.NumberFormat(lang, { maximumFractionDigits: d }).format(value);
  const money = (v: number) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const label = (map: Record<string, [string, string]>, key: string) =>
    map[key]?.[locale === 'en' ? 1 : 0] || key.replaceAll('_', ' ');
  const m = snapshot.metrics;
  const date = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(snapshot.serviceDate));
  const line = (name: string, value: string) =>
    `<tr><td>${escape(name)}</td><td class="number">${escape(value)}</td></tr>`;
  const batch =
    snapshot.batchId === 'canonical'
      ? t('Operasi utama', 'Main operations')
      : t('Batch mandiri', 'Your batch');
  const meta = `${batch} · ${date}`;
  const scenario = label(
    {
      circular_day: ['Satu hari sirkular', 'A circular day'],
      battery_review: ['Pemeriksaan baterai', 'Battery review'],
      capacity_shift: ['Kapasitas dan jadwal', 'Capacity and scheduling'],
      exploration: ['Batch mandiri', 'Your batch'],
    },
    snapshot.scenarioId,
  );
  const outcomes = Object.entries(m.completedDispositions)
    .map(([key, count]) => line(label(dispositionNames, key), n(count)))
    .join('');
  const devices = snapshot.assetList
    .filter((s) => snapshot.submittedRequestIds.includes(s.asset.requestId))
    .map(
      (s) =>
        `<tr><td>${escape(s.asset.id)}<small>${escape(s.asset.requestId)}</small></td><td>${escape(label(categoryNames, s.asset.category))}</td><td class="number">${n(s.asset.massKg, 2)}</td><td>${escape(s.deferred ? t('Jadwal berikutnya', 'Next window') : s.held ? t('Ditahan', 'Held') : label(statusNames, s.status))}</td><td>${escape(s.status === 'completed' ? label(dispositionNames, s.asset.plannedDisposition) : t('Belum selesai', 'Not complete'))}</td><td>${escape(s.asset.dataBearing ? (s.dataCleared ? t('Dilepas', 'Cleared') : t('Menunggu', 'Pending')) : t('Tidak diperlukan', 'Not required'))}</td><td>${s.custodyEventIds.length}</td></tr>`,
    )
    .join('');
  const decisions = snapshot.decisions
    .map(
      (d) =>
        `<tr><td>${escape(d.id)}</td><td>${escape(({ submit_hero: t('Permintaan dikonfirmasi', 'Request confirmed'), approve_specialist: t('Penanganan khusus disetujui', 'Specialist handling approved'), retain_specialist_hold: t('Penahanan khusus dipertahankan', 'Specialist hold retained'), approve_data_release: t('Pelepasan data disetujui', 'Data release approved'), retain_data_hold: t('Penahanan data dipertahankan', 'Data hold retained') } as Record<string, string>)[d.action] || d.action)}</td><td>${n(d.atSecond, 1)} s</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jejak Balik — ${escape(meta)}</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f3eb;color:#25352d;font:13px/1.6 Arial,sans-serif}.report{max-width:900px;margin:32px auto;background:#fffefa;padding:48px}.brand{display:block;width:156px;height:auto}header{border-bottom:2px solid #2d6753;padding-bottom:22px;margin-bottom:25px}.eyebrow{font-size:10px;letter-spacing:1.5px;color:#59675e;text-transform:uppercase;margin:22px 0 5px}h1{font-size:28px;line-height:1.25;letter-spacing:-.8px;margin:0 0 15px}h2{font-size:16px;margin:26px 0 12px;break-after:avoid}p{margin:8px 0}.muted{color:#59675e}.metadata{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:11px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:25px 0}.kpi{border-left:2px solid #a9c9b1;padding:0 12px}.kpi strong{font-size:25px;display:block;font-weight:600}.kpi span{font-size:10px;color:#59675e}.columns{display:grid;grid-template-columns:1fr 1fr;gap:25px}.number{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px}th{font-size:10px;font-weight:600;text-align:left;color:#59675e;border-bottom:1px solid #9eae9e;padding:9px 6px}td{border-bottom:1px solid #e3e7dc;padding:8px 6px;vertical-align:top}td small{display:block;font-size:9px;color:#74816d}thead{display:table-header-group}tr{break-inside:avoid}.total{background:#e9efe3;font-weight:700}.note{font-size:11px;color:#59675e;border-left:2px solid #dddcd2;padding-left:12px;margin:18px 0}.decisions-table{table-layout:fixed}.decisions-table td:first-child,.decisions-table th:first-child{width:36%;overflow-wrap:anywhere}.asset-table{font-size:9px}.asset-table td,.asset-table th{padding:7px 4px}.footer{margin-top:28px;border-top:1px solid #dddcd2;padding-top:12px;font-size:10px;color:#59675e}.print-tools{max-width:900px;margin:25px auto;text-align:right}button{border:0;border-radius:8px;background:#2d6753;color:white;padding:12px 18px;font:600 13px Arial,sans-serif;cursor:pointer}.print-tools p{font:12px Arial,sans-serif;color:#59675e}.page-break{break-before:page}@page{size:A4;margin:16mm}@media print{body{background:white;font-size:10px}.report{max-width:none;margin:0;padding:0}.print-tools{display:none}.kpis{margin:17px 0}.kpi strong{font-size:21px}h1{font-size:24px}h2{font-size:14px}.columns{gap:20px}table{font-size:10px}.asset-table{font-size:8px}a{color:inherit;text-decoration:none}.footer{position:static}.report{padding:0!important}header{margin-bottom:14px;padding-bottom:14px}.eyebrow{margin:13px 0 4px}h1{margin-bottom:10px}h2{margin:16px 0 8px}td{padding:5px 6px}.note{font-size:9px;margin:12px 0;line-height:1.5}.asset-table td{padding:4px;line-height:1.4}.asset-table td small{font-size:8px}}@media screen and (max-width:650px){.report{padding:22px;margin:15px}.columns{grid-template-columns:1fr}.kpis{grid-template-columns:1fr 1fr}.asset-wrap{overflow-x:auto}.print-tools{margin:20px}}</style></head><body><div class="print-tools"><button onclick="window.print()">${t('Cetak / simpan PDF', 'Print / save PDF')}</button><p>${t('Pilih “Simpan sebagai PDF” pada dialog cetak untuk mengunduh laporan.', 'Choose “Save as PDF” in the print dialog to download the report.')}</p></div><main class="report"><header><img class="brand" src="${escape(logoUrl)}" alt="Jejak Balik"><p class="eyebrow">${t('CATATAN OPERASI', 'OPERATIONS RECORD')}</p><h1>${t('Laporan hasil batch', 'Batch outcome report')}</h1><div class="metadata"><strong>${escape(meta)}</strong><span>Asia/Jakarta</span></div><p class="muted">${escape(t('Ringkasan penjemputan, jalur pemulihan, dan serah terima pada posisi perjalanan terpilih.', 'Collection, recovery, and custody summary at the selected journey position.'))}</p><p class="metadata">${t('Skenario', 'Scenario')}: ${escape(scenario)} · ${t('Posisi perjalanan', 'Journey position')}: ${n(snapshot.cursor, 1)} s</p></header><section class="kpis"><div class="kpi"><strong>${n(m.householdsServed)}</strong><span>${t('Rumah tangga dilayani', 'Households served')}</span></div><div class="kpi"><strong>${n(m.collectedMassKg, 2)} kg</strong><span>${t('Massa dijemput', 'Collected mass')}</span></div><div class="kpi"><strong>${n(m.valueRetainedAssets)}</strong><span>${t('Perangkat kembali berguna', 'Devices returned to use')}</span></div><div class="kpi"><strong>${n(m.completedAssets)}/${n(m.collectedAssets)}</strong><span>${t('Rantai serah terima lengkap', 'Complete custody chains')}</span></div></section><p class="note">${n(m.requests)} ${t('permintaan', 'requests')} · ${n(m.batchAssets)} ${t('perangkat dalam batch', 'batch devices')} · ${n(m.collectedAssets)} ${t('dijemput', 'collected')} · ${n(m.deferredAssets)} ${t('dijadwalkan berikutnya', 'deferred')} · ${n(m.heldUncollected + m.heldAtHub)} ${t('ditahan', 'held')}</p><div class="columns"><section><h2>${t('Hasil pemulihan selesai', 'Completed recovery outcomes')}</h2><table><tbody>${outcomes}<tr class="total"><td>${t('Total selesai', 'Total completed')}</td><td class="number">${n(m.completedAssets)}</td></tr></tbody></table><p class="note">${t('Pelepasan data adalah syarat terpisah, bukan kategori pemulihan.', 'Data clearance is a separate gate, not a recovery category.')} ${n(m.dataClearedAssets)}/${n(m.collectedDataBearingAssets)} ${t('perangkat penyimpan data yang dijemput telah dilepas.', 'collected data-bearing devices cleared.')}</p></section><section><h2>${t('Perbandingan penjemputan', 'Collection comparison')}</h2><table><thead><tr><th>${t('Ukuran', 'Metric')}</th><th class="number">${t('Terpisah', 'Dedicated')}</th><th class="number">${t('Gabungan', 'Grouped')}</th></tr></thead><tbody><tr><td>${t('Jarak', 'Distance')}</td><td class="number">${n(m.dedicatedDistanceKm, 1)} km</td><td class="number">${n(m.groupedDistanceKm, 1)} km</td></tr><tr><td>${t('Perjalanan / segmen', 'Trips / segments')}</td><td class="number">${n(m.dedicatedTrips)}</td><td class="number">${n(m.groupedRouteSegments)}</td></tr><tr><td>${t('Biaya', 'Cost')}</td><td class="number">${money(m.dedicatedCollectionCostIdr)}</td><td class="number">${money(m.groupedCollectionCostIdr)}</td></tr></tbody></table><p class="note">${t('Kedua pilihan mencakup perangkat yang sama yang telah dijemput, kelas penanganan yang sesuai, dan perjalanan rumah–hub. Perjalanan lanjutan berada di luar perbandingan.', 'Both alternatives cover the same collected devices, compatible handling classes, and household–hub journeys. Downstream legs are outside this comparison.')}</p></section></div><h2>${t('Ekonomi batch', 'Batch economics')}</h2><table><tbody>${line(t('Pendanaan kontrak layanan', 'Service-contract funding'), money(m.serviceContractFeeIdr))}${line(t('Dukungan akses komunitas', 'Community-access support'), money(m.communityAccessSponsorIdr))}${line(t('Bagian nilai pulih platform (20%)', 'Platform recovered-value share (20%)'), money(m.recoveredValueIdr))}${line(t('Biaya penjemputan', 'Collection cost'), money(-m.groupedCollectionCostIdr))}${line(t('Biaya pemrosesan', 'Processing cost'), money(-m.processingCostIdr))}${line(t('Biaya pelepasan data', 'Data-clearance cost'), money(-m.dataClearanceCostIdr))}<tr class="total"><td>${t('Kontribusi batch', 'Batch contribution')}</td><td class="number">${money(m.batchOperatingContributionIdr)}</td></tr></tbody></table><p class="note">${t('Nilai pulih bruto', 'Gross recovered value')}: ${money(m.grossRecoveredValueIdr)}. ${t('Nilai bruto tidak ditambahkan lagi sebagai pendapatan platform. Kontribusi batch belum memperhitungkan overhead, modal, pajak, dan modal kerja. Penjemputan standar bagi rumah tangga Rp0.', 'Gross value is not added again as platform revenue. Batch contribution excludes overhead, capital, tax, and working capital. Standard household collection costs Rp0.')}</p><section class="page-break"><h2>${t('Daftar perangkat dan serah terima', 'Asset and custody summary')}</h2><p class="muted">${escape(meta)} · ${n(m.batchAssets)} ${t('perangkat', 'devices')}</p><div class="asset-wrap"><table class="asset-table"><thead><tr><th>ID</th><th>${t('Perangkat', 'Device')}</th><th class="number">kg</th><th>${t('Status', 'Status')}</th><th>${t('Hasil', 'Outcome')}</th><th>${t('Data', 'Data')}</th><th>${t('Catatan', 'Events')}</th></tr></thead><tbody>${devices}</tbody></table></div><h2>${t('Keputusan operator pada jendela ini', 'Operator decisions in this window')}</h2>${decisions ? `<table class="decisions-table"><thead><tr><th>ID</th><th>${t('Keputusan', 'Decision')}</th><th>${t('Posisi', 'Position')}</th></tr></thead><tbody>${decisions}</tbody></table>` : `<p>${t('Belum ada keputusan tercatat pada posisi perjalanan ini.', 'No decisions recorded at this journey position.')}</p>`}</section><footer class="footer">Jejak Balik · ${escape(meta)}<br>${t('Catatan operasional internal. Dokumen ini bukan sertifikat pemrosesan atau sertifikat penghapusan data.', 'Internal operational record. This document is not a processing certificate or a data-erasure certificate.')}</footer></main></body></html>`;
}
export function openBatchReport(snapshot: Snapshot, locale: 'id' | 'en'): boolean {
  const report = window.open('', '_blank');
  if (!report) return false;
  report.document.open();
  report.document.write(buildBatchReport(snapshot, locale, `${window.location.origin}/brand/logo.svg`));
  report.document.close();
  return true;
}
