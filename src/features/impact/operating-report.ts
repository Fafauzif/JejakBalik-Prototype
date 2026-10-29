import { financialAssumptions } from '../../domain/fixtures';
import { encodeCsv } from '../../domain/persistence';
import {
  selectOperatingPeriod,
  OPERATING_SOURCE_STATUS,
  OPERATING_MASS_DEFINITION,
} from '../../domain/operating-history';
import { dispositionNames } from '../../i18n';
import type { Language } from '../../domain/types';
export type OperatingView = ReturnType<typeof selectOperatingPeriod>;
const escape = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function operatingSummaryCsv(view: OperatingView) {
  return encodeCsv([
    [
      'period',
      ...Object.keys(view.metrics).filter((k) => !['completedDispositions', 'dispositionMassKg'].includes(k)),
      'source_status',
      'mass_definition',
    ],
    ...view.months.map((month) => [
      month.period,
      ...Object.entries(month.metrics)
        .filter(([k]) => !['completedDispositions', 'dispositionMassKg'].includes(k))
        .map(([, value]) => value),
      OPERATING_SOURCE_STATUS,
      OPERATING_MASS_DEFINITION,
    ]),
  ]);
}
export function operatingJson(view: OperatingView) {
  return JSON.stringify(
    {
      schemaVersion: 'jejak-balik-operating-period-v1',
      sourceStatus: OPERATING_SOURCE_STATUS,
      massDefinition: OPERATING_MASS_DEFINITION,
      period: view.period,
      asOf: view.asOf,
      currency: 'IDR',
      comparisonBoundary: financialAssumptions.comparisonBoundary,
      assumptions: financialAssumptions,
      metrics: view.metrics,
      months: view.months,
      batches: view.batches,
      assets: view.assets,
    },
    null,
    2,
  );
}
export function buildOperatingReportHtml(view: OperatingView, locale: Language) {
  const t = (id: string, en: string) => (locale === 'en' ? en : id);
  const number = (n: number, decimals = 0) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'id-ID', { maximumFractionDigits: decimals }).format(n);
  const money = (n: number) => `Rp ${number(n)}`;
  const m = view.metrics;
  const row = (label: string, value: string) =>
    `<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td></tr>`;
  const title = t('Laporan dampak & ekonomi layanan', 'Service impact & economics report');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jejak Balik · ${escape(view.period)} · ${title}</title><style>*{box-sizing:border-box}body{font:14px/1.65 system-ui,sans-serif;color:#253b30;background:#f7f5ec;margin:0}main{max-width:900px;padding:48px;margin:auto;background:#fffefa}header{border-bottom:3px solid #326e56;padding-bottom:22px;margin-bottom:30px}h1{font-size:32px;line-height:1.2;margin:16px 0}h2{font-size:20px;margin-top:34px}p{color:#5c6b60}table{width:100%;border-collapse:collapse;margin:18px 0;font-size:12px}th,td{padding:10px;text-align:left;border-bottom:1px solid #dcded1}td:last-child{text-align:right}th{font-weight:600}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.metrics div{padding:15px;background:#eef2e5}.metrics b{display:block;font-size:25px}.metrics small{display:block;font-size:12px}button{padding:12px 20px;font:inherit;background:#326e56;color:white;border:0;border-radius:7px;cursor:pointer}.top{padding:16px;text-align:center}@page{size:A4;margin:15mm}@media print{body,main{background:white}main{padding:0;max-width:none}.top{display:none}h2{break-after:avoid}tr{break-inside:avoid}header{margin-bottom:20px}.metrics{break-inside:avoid}}</style></head><body><div class="top"><button onclick="window.print()">${t('Cetak / Simpan PDF', 'Print / Save PDF')}</button></div><main><header><strong>JEJAK BALIK</strong><h1>${title}</h1><p><strong>${t('Skenario ilustratif — bukan hasil lapangan yang diamati.', 'Illustrative scenario — not observed field results.')}</strong></p><p>${t('Massa yang ditampilkan adalah massa awal perangkat dengan penanganan selesai, bukan hasil atau rendemen material pulih.', 'Displayed mass is full input-device mass for completed dispositions, not recovered material output or yield.')}</p><p>${t('Periode', 'Period')}: ${escape(view.period)} · ${t('Catatan hingga', 'Records through')} ${view.asOf} · ${view.batches.length} ${t('batch layanan', 'service batches')}</p></header><div class="metrics"><div><b>${number(m.recoveredMassKg, 2)} kg</b><small>${t('Massa perangkat yang selesai ditangani', 'Mass of devices with completed disposition')}</small></div><div><b>${number(m.completedAssets)}</b><small>${t('Perangkat tuntas', 'Completed devices')}</small></div><div><b>${number(m.householdsServed)}</b><small>${t('Rumah tangga dilayani', 'Households served')}</small></div></div><h2>${t('Hasil pemulihan', 'Recovery outcomes')}</h2><table><thead><tr><th>${t('Jalur', 'Pathway')}</th><th>${t('Perangkat', 'Devices')}</th><th>kg</th></tr></thead><tbody>${Object.entries(
    m.completedDispositions,
  )
    .map(
      ([d, count]) =>
        `<tr><th>${escape(dispositionNames[d][locale === 'en' ? 1 : 0])}</th><td>${number(count)}</td><td>${number(m.dispositionMassKg[d as keyof typeof m.dispositionMassKg], 2)}</td></tr>`,
    )
    .join(
      '',
    )}</tbody></table><p>${number(m.activeAssets)} ${t('perangkat masih dalam proses; belum dihitung sebagai hasil pemulihan.', 'devices remain in progress and are excluded from completed recovery outcomes.')}</p><h2>${t('Penjemputan: pekerjaan yang setara', 'Collection: equal work')}</h2><p>${t('Kedua pilihan membawa perangkat yang sama dari rumah ke hub, menggunakan kelas kendaraan dan tarif yang sama. Jarak adalah jalur tegak lurus. Perjalanan lanjutan hub–tujuan tidak termasuk pada kedua pilihan.', 'Both alternatives bring the same devices from homes to the hub using the same vehicle classes and rates. Distances use orthogonal paths. Downstream hub-to-destination legs are excluded from both alternatives.')}</p><table>${row(t('Perangkat dijemput', 'Collected devices'), number(m.collectedAssets))}${row(t('Rute gabungan', 'Grouped routes'), `${number(m.groupedRoutes)} · ${number(m.groupedDistanceKm, 2)} km · ${money(m.groupedCollectionCostIdr)}`)}${row(t('Perjalanan terpisah', 'Dedicated trips'), `${number(m.dedicatedTrips)} · ${number(m.dedicatedDistanceKm, 2)} km · ${money(m.dedicatedCollectionCostIdr)}`)}${row(t('Pengurangan jarak', 'Distance reduction'), `${number(m.distanceReductionPercent, 1)}%`)}${row(t('Penghematan penjemputan', 'Collection savings'), money(m.dedicatedCollectionCostIdr - m.groupedCollectionCostIdr))}</table><h2>${t('Pendanaan dan ekonomi layanan', 'Funding and service economics')}</h2><table>${row(t('Kontrak layanan', 'Service contracts'), money(m.serviceContractFeeIdr))}${row(t('Dukungan akses komunitas', 'Community-access support'), money(m.communityAccessSponsorIdr))}${row(t('Nilai pulih bruto', 'Gross recovered value'), money(m.grossRecoveredValueIdr))}${row(t('Bagian platform (20% bruto)', 'Platform share (20% of gross)'), money(m.recoveredValueIdr))}${row(t('Total pendapatan & pendanaan', 'Total revenue & funding'), money(m.revenueIdr))}${row(t('Penjemputan gabungan', 'Grouped collection'), money(m.groupedCollectionCostIdr))}${row(t('Pemrosesan perangkat', 'Device processing'), money(m.processingCostIdr))}${row(t('Pelepasan data', 'Data clearance'), money(m.dataClearanceCostIdr))}${row(t('Total biaya operasi', 'Total operating costs'), money(m.expensesIdr))}${row(t('Kontribusi operasi', 'Operating contribution'), money(m.operatingContributionIdr))}</table><p>${t('Nilai bruto berada di hilir; hanya bagian platform 20% masuk pendapatan. Kontribusi operasi belum termasuk overhead perusahaan, modal, pajak, dan modal kerja.', 'Gross value sits downstream; only the 20% platform share enters revenue. Operating contribution excludes corporate overhead, capital, taxes, and working capital.')}</p><h2>${t('Rincian bulanan', 'Monthly breakdown')}</h2><table><thead><tr><th>${t('Bulan', 'Month')}</th><th>${t('Tuntas', 'Complete')}</th><th>kg</th><th>${t('Kontribusi operasi', 'Operating contribution')}</th></tr></thead><tbody>${view.months.map(({ period, metrics: x }) => `<tr><th>${period}</th><td>${number(x.completedAssets)}</td><td>${number(x.recoveredMassKg, 2)}</td><td>${money(x.operatingContributionIdr)}</td></tr>`).join('')}</tbody></table><footer><p>${t('Semua angka mengikuti catatan perangkat, rute, biaya, dan pendanaan dalam periode yang dipilih. CSV perangkat dan JSON periode menyediakan rincian pembentuk laporan.', 'All figures follow device, route, cost, and funding records in the selected period. The asset CSV and period JSON contain the records behind this report.')}</p></footer></main></body></html>`;
}
export function openOperatingReport(view: OperatingView, locale: Language) {
  const tab = window.open('', '_blank');
  if (!tab) return false;
  tab.opener = null;
  tab.document.open();
  tab.document.write(buildOperatingReportHtml(view, locale));
  tab.document.close();
  return true;
}
