import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Home,
  Info,
  Leaf,
  Printer,
  ShieldCheck,
  Truck,
  Wallet,
  Weight,
} from 'lucide-react';
import { Button, Chip, Card, Dialog, Metric, Tabs } from '../../components/ui';
import { useLocale, dispositionNames } from '../../i18n';
import { useSnapshot, exportAssetsCsv, exportCustodyCsv, exportSessionJson } from '../../state/store';
import { financialAssumptions, vehicles, world, partners } from '../../domain';
import { filterRoutes } from '../../domain/routing';
import { openBatchReport, downloadContent } from './report';
import styles from './ImpactPage.module.css';
import OperatingImpact from './OperatingImpact';
const outcomeColors: Record<string, string> = {
  reuse: '#387157',
  repair: '#71956a',
  refurbishment: '#a7b88a',
  parts: '#c2b57f',
  material: '#cda27c',
  specialist: '#a66e59',
};

function TutorialImpactPage() {
  const { locale, t, number, money, date } = useLocale();
  const snapshot = useSnapshot();
  const m = snapshot.metrics;
  const batchLabel =
    snapshot.batchId === 'canonical' ? t('Operasi utama', 'Main operations') : snapshot.batchId;
  const location = useLocation();
  const economics = location.pathname.endsWith('/economics');
  const [methodOpen, setMethodOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const collected = snapshot.assetList.filter((a) =>
    ['collected', 'received', 'triaged', 'routed', 'completed'].includes(a.status),
  );
  const actualRoutes = filterRoutes(
    snapshot.context.activeRoutes,
    new Set(collected.map((a) => a.asset.id)),
    snapshot.context.seed,
  );
  const dedicatedTrips = new Map<
    string,
    { householdId: string; handling: string; distance: number; cost: number }
  >();
  for (const route of actualRoutes) {
    const vehicle = vehicles.find((v) => v.id === route.vehicleId)!;
    for (const stop of route.stops) {
      const key = `${stop.householdId}/${route.handlingClass}`;
      if (dedicatedTrips.has(key)) continue;
      const distance =
        2 *
        (Math.abs(stop.position[0] - world.hub.position[0]) +
          Math.abs(stop.position[1] - world.hub.position[1])) *
        world.coordinateUnitKm;
      dedicatedTrips.set(key, {
        householdId: stop.householdId,
        handling: route.handlingClass,
        distance,
        cost: distance * vehicle.ratePerKmIdr + vehicle.dispatchFeeIdr,
      });
    }
  }
  const revenue = m.serviceContractFeeIdr + m.communityAccessSponsorIdr + m.recoveredValueIdr;
  const expenses = m.groupedCollectionCostIdr + m.processingCostIdr + m.dataClearanceCostIdr;
  const pct = (value: number | null) => (value === null ? '—' : `${number(value, 1)}%`);
  const scenarioNames: Record<string, [string, string]> = {
    circular_day: ['Hari sirkular', 'Circular day'],
    battery_review: ['Tinjauan baterai', 'Battery review'],
    capacity_shift: ['Peralihan kapasitas', 'Capacity shift'],
    exploration: ['Batch mandiri', 'Your batch'],
  };
  const scenario = scenarioNames[snapshot.scenarioId] || scenarioNames.circular_day;
  useEffect(() => {
    document.title = t('Dampak & hasil · Jejak Balik', 'Impact & outcomes · Jejak Balik');
  }, [t]);
  const exportFile = (kind: 'assets' | 'custody' | 'json') => {
    const base = `jejak-balik_${snapshot.batchId}_${snapshot.windowId}`;
    const content =
      kind === 'json'
        ? exportSessionJson()
        : kind === 'assets'
          ? exportAssetsCsv(snapshot)
          : exportCustodyCsv(snapshot);
    downloadContent(
      content,
      `${base}_${kind}.${kind === 'json' ? 'json' : 'csv'}`,
      kind === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8',
    );
    setFeedback(
      t(
        'Berkas siap diunduh. Isinya mengikuti posisi perjalanan saat ini.',
        'Download prepared using the current journey position.',
      ),
    );
  };
  const printReport = () => {
    if (openBatchReport(snapshot, locale)) {
      setExportOpen(false);
      setFeedback(
        t(
          'Laporan terbuka di tab baru. Gunakan tombol cetak untuk menyimpan PDF.',
          'Report opened in a new tab. Use its print button to save a PDF.',
        ),
      );
    } else
      setFeedback(
        t(
          'Tab laporan diblokir browser. Izinkan pop-up, lalu buka laporan kembali.',
          'Your browser blocked the report tab. Allow pop-ups and open it again.',
        ),
      );
  };
  return (
    <section className={styles.page} aria-label={t('Dampak dan hasil', 'Impact and outcomes')}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t('DAMPAK & HASIL', 'IMPACT & OUTCOMES')}</p>
          <h1>{t('Nilai yang kembali.', 'Value, brought back.')}</h1>
          <p>
            {t(
              'Lihat apa yang sudah dijemput, dipulihkan, dan tercatat dengan baik.',
              'See what has been collected, recovered, and properly accounted for.',
            )}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<ArrowDownToLine size={16} />}
          onClick={() => {
            setExportOpen(true);
            setFeedback('');
          }}
        >
          {t('Ekspor laporan', 'Export report')}
        </Button>
      </header>
      <div className={styles.contextBar}>
        <span>
          <span className={styles.contextDot} />
          {t(...scenario)}
        </span>
        <span>{batchLabel}</span>
        <span>{date(snapshot.serviceDate)} · WIB</span>
        <Chip tone={m.completedAssets === m.batchAssets && m.batchAssets > 0 ? 'success' : 'info'}>
          {m.completedAssets === m.batchAssets && m.batchAssets > 0
            ? t('Batch selesai', 'Batch complete')
            : t('Hasil berjalan', 'In progress')}
        </Chip>
      </div>
      <nav className={styles.tabs} aria-label={t('Tampilan dampak', 'Impact view')}>
        <Link
          to="/impact?dataset=tutorial"
          aria-current={!economics ? 'page' : undefined}
          className={!economics ? styles.tabActive : ''}
        >
          {t('Hasil pemulihan', 'Recovery outcomes')}
        </Link>
        <Link
          to="/impact/economics?dataset=tutorial"
          aria-current={economics ? 'page' : undefined}
          className={economics ? styles.tabActive : ''}
        >
          {t('Ekonomi batch', 'Batch economics')}
        </Link>
      </nav>
      {!economics ? (
        <>
          <section className={styles.metrics} aria-label={t('Ringkasan hasil', 'Outcome summary')}>
            <Metric
              label={t('Rumah tangga dilayani', 'Households served')}
              value={number(m.householdsServed)}
              icon={<Home size={16} />}
              detail={t(`dari ${m.requests} permintaan`, `of ${m.requests} requests`)}
            />
            <Metric
              label={t('Massa dijemput', 'Collected mass')}
              value={
                <>
                  {number(m.collectedMassKg, 2)}
                  <small> kg</small>
                </>
              }
              icon={<Weight size={16} />}
              detail={t(`${m.collectedAssets} perangkat dijemput`, `${m.collectedAssets} devices collected`)}
            />
            <Metric
              label={t('Kembali berguna', 'Returned to use')}
              value={number(m.valueRetainedAssets)}
              icon={<Leaf size={16} />}
              detail={t('Guna ulang, perbaikan, rekondisi', 'Reuse, repair, refurbishment')}
            />
            <Metric
              label={t('Rantai serah terima lengkap', 'Complete custody chains')}
              value={pct(m.custodyCompletionCollectedPercent)}
              icon={<CheckCheck size={16} />}
              detail={t(
                `${m.completedAssets} dari ${m.collectedAssets} perangkat dijemput`,
                `${m.completedAssets} of ${m.collectedAssets} collected devices`,
              )}
            />
          </section>
          <div className={styles.outcomesGrid}>
            <Card className={styles.recoveryCard}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>{t('KESEMPATAN BERIKUTNYA', 'THE NEXT OPPORTUNITY')}</span>
                  <h2>{t('Bukan akhir perjalanan.', 'Not the end of the journey.')}</h2>
                </div>
                <Leaf size={22} className={styles.leafIcon} />
              </div>
              <p className={styles.description}>
                {t(
                  'Perangkat yang masih bernilai mendapat jalur untuk kembali digunakan.',
                  'Devices with remaining value get a pathway back into use.',
                )}
              </p>
              <div className={styles.retentionMetric}>
                <strong>{pct(m.valueRetentionPercent)}</strong>
                <div>
                  <span>{t('nilai guna dipertahankan', 'use value retained')}</span>
                  <small>
                    {m.valueRetainedAssets}/{m.completedAssets} {t('perangkat selesai', 'completed devices')}
                  </small>
                </div>
              </div>
              <div
                className={styles.stackedBar}
                role="img"
                aria-label={t(
                  'Proporsi hasil pemulihan perangkat selesai',
                  'Share of completed device recovery outcomes',
                )}
              >
                {m.completedAssets > 0 ? (
                  Object.entries(m.completedDispositions)
                    .filter(([, n]) => n > 0)
                    .map(([d, n]) => (
                      <span
                        key={d}
                        style={{
                          width: `${(n / m.completedAssets) * 100}%`,
                          backgroundColor: outcomeColors[d],
                        }}
                        title={`${t(dispositionNames[d][0], dispositionNames[d][1])}: ${n}`}
                      />
                    ))
                ) : (
                  <span className={styles.unfilled} />
                )}
              </div>
              <div className={styles.outcomeList}>
                {Object.entries(m.completedDispositions).map(([d, n]) => (
                  <div key={d}>
                    <span className={styles.outcomeLabel}>
                      <i style={{ backgroundColor: outcomeColors[d] }} />
                      {t(dispositionNames[d][0], dispositionNames[d][1])}
                    </span>
                    <strong>{number(n)}</strong>
                    <small>{m.completedAssets ? number((n / m.completedAssets) * 100, 1) + '%' : '—'}</small>
                  </div>
                ))}
              </div>
              <p className={styles.inlineNote}>
                {t(
                  'Bagian nilai guna dihitung dari guna ulang, perbaikan, dan rekondisi.',
                  'Use-value share includes reuse, repair, and refurbishment.',
                )}
              </p>
            </Card>
            <div className={styles.rightColumn}>
              <Card className={styles.custodyCard}>
                <div className={styles.sectionHeading}>
                  <h2>{t('Setiap perangkat, ada jejaknya.', 'Every device, accounted for.')}</h2>
                  <ShieldCheck size={21} />
                </div>
                <p className={styles.description}>
                  {t(
                    'Hasil selesai mengikuti syarat keselamatan, data, tujuan, dan serah terima.',
                    'Completed outcomes follow safety, data, destination, and custody requirements.',
                  )}
                </p>
                <div className={styles.progressRow}>
                  <div>
                    <span>{t('Cakupan penjemputan', 'Collection coverage')}</span>
                    <strong>
                      {m.collectedAssets}/{m.batchAssets}
                    </strong>
                  </div>
                  <progress
                    aria-label={t('Cakupan penjemputan', 'Collection coverage')}
                    max={m.batchAssets || 1}
                    value={m.collectedAssets}
                  />
                </div>
                <div className={styles.progressRow}>
                  <div>
                    <span>{t('Pelepasan data', 'Data clearance')}</span>
                    <strong>
                      {m.dataClearedAssets}/{m.collectedDataBearingAssets}
                    </strong>
                  </div>
                  <progress
                    aria-label={t('Pelepasan data', 'Data clearance')}
                    max={m.collectedDataBearingAssets || 1}
                    value={m.dataClearedAssets}
                  />
                  <small>
                    {t('Dari perangkat penyimpan data yang dijemput', 'Of collected data-bearing devices')}
                  </small>
                </div>
                <div className={styles.gateCounters}>
                  <div>
                    <strong>{m.heldUncollected + m.heldAtHub}</strong>
                    <span>{t('ditahan', 'on hold')}</span>
                  </div>
                  <div>
                    <strong>{m.deferredAssets}</strong>
                    <span>{t('jadwal berikutnya', 'next window')}</span>
                  </div>
                  <div>
                    <strong>{Math.max(0, m.collectedAssets - m.completedAssets)}</strong>
                    <span>{t('masih diproses', 'in progress')}</span>
                  </div>
                </div>
                <Link className={styles.textLink} to="/team?agent=guardian">
                  {t('Lihat tinjauan Jaga', 'View Jaga’s review')}
                  <ArrowUpRight size={15} />
                </Link>
              </Card>
              <div className={styles.reportInvite}>
                <img src="/agents/dampak.webp" alt="" />
                <div>
                  <span className={styles.eyebrow}>DAMPAK</span>
                  <h3>{t('Hasil yang bisa ditelusuri.', 'Outcomes you can trace.')}</h3>
                  <p>
                    {t(
                      'Unduh perangkat, catatan serah terima, atau satu laporan yang utuh.',
                      'Download the assets, custody record, or one complete report.',
                    )}
                  </p>
                  <button onClick={() => setExportOpen(true)}>
                    {t('Buka laporan batch', 'Open batch report')}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <Card className={styles.comparisonCard}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>
                  {t('PENJEMPUTAN YANG TERHUBUNG', 'CONNECTED COLLECTION')}
                </span>
                <h2>{t('Pekerjaan sama. Perjalanan lebih ringkas.', 'Same work. Fewer kilometres.')}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMethodOpen(true)} icon={<Info size={15} />}>
                {t('Dasar perbandingan', 'Comparison details')}
              </Button>
            </div>
            <p className={styles.description}>
              {t(
                `${m.collectedAssets} perangkat yang sama, kelas penanganan yang sesuai, dan tujuan hub yang sama.`,
                `${m.collectedAssets} matching devices, compatible handling classes, and the same hub destination.`,
              )}
            </p>
            <div className={styles.comparisonGrid}>
              <section>
                <div className={styles.chartTitle}>
                  <h3>{t('Jarak penjemputan', 'Collection distance')}</h3>
                  <span>
                    {m.distanceReductionPercent === null
                      ? '—'
                      : `${number(m.distanceReductionPercent, 1)}% ${t('lebih rendah', 'lower')}`}
                  </span>
                </div>
                <div className={styles.barGroup}>
                  <div>
                    <span>{t('Perjalanan terpisah', 'Dedicated trips')}</span>
                    <strong>{number(m.dedicatedDistanceKm, 1)} km</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <span
                      className={styles.dedicatedBar}
                      style={{ width: m.dedicatedDistanceKm ? '100%' : '0%' }}
                    />
                  </div>
                </div>
                <div className={styles.barGroup}>
                  <div>
                    <span>{t('Rute gabungan', 'Grouped routes')}</span>
                    <strong>{number(m.groupedDistanceKm, 1)} km</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <span
                      className={styles.groupedBar}
                      style={{
                        width: `${m.dedicatedDistanceKm ? Math.min(100, (m.groupedDistanceKm / m.dedicatedDistanceKm) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className={styles.chartFoot}>
                  {m.dedicatedTrips} {t('perjalanan terpisah', 'dedicated trips')} <ArrowRight size={13} />{' '}
                  {m.groupedRouteSegments} {t('segmen rute', 'route segments')} · {m.vehicles}{' '}
                  {t('kendaraan', 'vehicles')}
                </p>
              </section>
              <section>
                <div className={styles.chartTitle}>
                  <h3>{t('Biaya penjemputan', 'Collection cost')}</h3>
                  <span>
                    {m.collectionCostReductionPercent === null
                      ? '—'
                      : `${number(m.collectionCostReductionPercent, 1)}% ${t('lebih rendah', 'lower')}`}
                  </span>
                </div>
                <div className={styles.barGroup}>
                  <div>
                    <span>{t('Perjalanan terpisah', 'Dedicated trips')}</span>
                    <strong>{money(m.dedicatedCollectionCostIdr)}</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <span
                      className={styles.dedicatedBar}
                      style={{ width: m.dedicatedCollectionCostIdr ? '100%' : '0%' }}
                    />
                  </div>
                </div>
                <div className={styles.barGroup}>
                  <div>
                    <span>{t('Rute gabungan', 'Grouped routes')}</span>
                    <strong>{money(m.groupedCollectionCostIdr)}</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <span
                      className={styles.groupedBar}
                      style={{
                        width: `${m.dedicatedCollectionCostIdr ? Math.min(100, (m.groupedCollectionCostIdr / m.dedicatedCollectionCostIdr) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className={styles.chartFoot}>
                  {t(
                    'Tarif kelas kendaraan sama pada kedua pilihan.',
                    'Same vehicle-class rates for both alternatives.',
                  )}
                </p>
              </section>
            </div>
            {!m.collectedAssets && (
              <div className={styles.comparisonEmpty}>
                {t(
                  'Perbandingan terisi setelah perangkat dijemput. Mulai perjalanan untuk melihat hasilnya.',
                  'This comparison fills as devices are collected. Start the journey to see the results.',
                )}
                <Link to="/twin">
                  {t('Buka operasi', 'Open operations')}
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <section className={styles.economicsHero}>
            <div>
              <span className={styles.eyebrow}>{t('KONTRIBUSI BATCH', 'BATCH CONTRIBUTION')}</span>
              <h2>{money(m.batchOperatingContributionIdr)}</h2>
              <p>
                {t(
                  'Pendanaan dan bagian nilai pulih, dikurangi biaya operasi yang tercatat.',
                  'Funding and recovered-value share, less recorded operating costs.',
                )}
              </p>
              <span className={styles.modelBoundary}>
                {t(
                  'Belum termasuk overhead, modal, pajak, dan modal kerja.',
                  'Excludes overhead, capital, tax, and working capital.',
                )}
              </span>
            </div>
            <div className={styles.economicsHeroSide}>
              <div>
                <span>{t('Pendapatan & pendanaan', 'Revenue & funding')}</span>
                <strong>{money(revenue)}</strong>
              </div>
              <div>
                <span>{t('Biaya operasi tercatat', 'Recorded operating costs')}</span>
                <strong>{money(expenses)}</strong>
              </div>
              <Chip tone="success">{t('Rp0 dalam program yang didanai', 'Rp0 within funded programs')}</Chip>
            </div>
          </section>
          <div className={styles.economicColumns}>
            <Card className={styles.financeCard}>
              <div className={styles.sectionHeading}>
                <h2>{t('Sumber pendanaan', 'How the batch is funded')}</h2>
                <Wallet size={20} />
              </div>
              <p className={styles.description}>
                {t(
                  'Tiga sumber menopang layanan dan menjaga akses penjemputan.',
                  'Three sources support the service and keep pickup accessible.',
                )}
              </p>
              {[
                {
                  label: t('Kontrak layanan', 'Service contracts'),
                  detail: t('Pendanaan layanan pengumpulan', 'Collection-service funding'),
                  value: m.serviceContractFeeIdr,
                },
                {
                  label: t('Dukungan akses komunitas', 'Community-access support'),
                  detail: t('Dukungan akses bagi rumah tangga', 'Household access support'),
                  value: m.communityAccessSponsorIdr,
                },
                {
                  label: t('Bagian nilai pulih platform', 'Platform recovered-value share'),
                  detail: t('20% dari nilai pulih bruto', '20% of gross recovered value'),
                  value: m.recoveredValueIdr,
                },
              ].map((line, i) => (
                <div className={styles.financeLine} key={line.label}>
                  <span className={styles.flowNumber}>{i + 1}</span>
                  <div>
                    <strong>{line.label}</strong>
                    <small>{line.detail}</small>
                  </div>
                  <b>{money(line.value)}</b>
                </div>
              ))}
              <div className={styles.financeTotal}>
                <span>{t('Total pendapatan & pendanaan', 'Total revenue & funding')}</span>
                <strong>{money(revenue)}</strong>
              </div>
              <div className={styles.grossValue}>
                <span>{t('Nilai pulih bruto', 'Gross recovered value')}</span>
                <strong>{money(m.grossRecoveredValueIdr)}</strong>
                <p>
                  {t(
                    'Ditampilkan sebagai nilai di hilir. Hanya bagian platform 20% yang masuk pendapatan.',
                    'Shown as downstream value. Only the platform’s 20% share is included in revenue.',
                  )}
                </p>
              </div>
            </Card>
            <Card className={styles.financeCard}>
              <div className={styles.sectionHeading}>
                <h2>{t('Biaya yang diperhitungkan', 'What the batch pays for')}</h2>
                <Truck size={20} />
              </div>
              <p className={styles.description}>
                {t(
                  'Perangkat yang memerlukan penanganan tetap memiliki jalur, termasuk yang tidak menghasilkan nilai jual.',
                  'Devices still have a pathway when treatment costs money instead of generating resale value.',
                )}
              </p>
              {[
                {
                  label: t('Penjemputan gabungan', 'Grouped collection'),
                  detail: t(
                    `${m.groupedRouteSegments} segmen · ${number(m.groupedDistanceKm, 1)} km`,
                    `${m.groupedRouteSegments} segments · ${number(m.groupedDistanceKm, 1)} km`,
                  ),
                  value: m.groupedCollectionCostIdr,
                },
                {
                  label: t('Pemrosesan perangkat', 'Device processing'),
                  detail: t(
                    `${m.completedAssets} perangkat selesai`,
                    `${m.completedAssets} devices completed`,
                  ),
                  value: m.processingCostIdr,
                },
                {
                  label: t('Pelepasan data', 'Data clearance'),
                  detail: t(
                    `${m.dataClearedAssets} perangkat × ${money(financialAssumptions.dataClearanceCostPerAssetIdr)}`,
                    `${m.dataClearedAssets} devices × ${money(financialAssumptions.dataClearanceCostPerAssetIdr)}`,
                  ),
                  value: m.dataClearanceCostIdr,
                },
              ].map((line) => (
                <div className={styles.financeLine} key={line.label}>
                  <span className={styles.costMark}>−</span>
                  <div>
                    <strong>{line.label}</strong>
                    <small>{line.detail}</small>
                  </div>
                  <b>{money(line.value)}</b>
                </div>
              ))}
              <div className={styles.financeTotal}>
                <span>{t('Total biaya operasi', 'Total operating cost')}</span>
                <strong>{money(expenses)}</strong>
              </div>
              <button className={styles.methodLink} onClick={() => setMethodOpen(true)}>
                {t('Periksa biaya & tarif rute', 'Inspect route costs & rates')}
                <ArrowRight size={15} />
              </button>
            </Card>
          </div>
          <Card className={styles.processingCard}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>{t('PEMULIHAN & MITRA', 'RECOVERY & PARTNERS')}</span>
                <h2>{t('Jalur yang tepat, biaya yang terlihat.', 'The right pathway, visible costs.')}</h2>
              </div>
              <Link className={styles.textLink} to="/team?agent=liaison">
                {t('Lihat manifest Mitra', 'View Mitra’s manifest')}
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <div
              className={styles.tableScroll}
              role="region"
              aria-label={t('Biaya pemulihan per mitra', 'Recovery costs by partner')}
              tabIndex={0}
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('Jalur pemulihan', 'Recovery pathway')}</th>
                    <th>{t('Tujuan', 'Destination')}</th>
                    <th>{t('Selesai', 'Complete')}</th>
                    <th>{t('Biaya / perangkat', 'Fee / device')}</th>
                    <th>{t('Biaya pemrosesan', 'Processing cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(m.completedDispositions).map(([d, count]) => (
                    <tr key={d}>
                      <td>
                        <span className={styles.pathway}>
                          <i style={{ backgroundColor: outcomeColors[d] }} />
                          {t(dispositionNames[d][0], dispositionNames[d][1])}
                        </span>
                      </td>
                      <td>{partners.find((p) => p.acceptedDispositions.includes(d))?.name || '—'}</td>
                      <td>{count}</td>
                      <td>
                        {money(
                          financialAssumptions.processingCostPerAssetIdr[
                            d as keyof typeof financialAssumptions.processingCostPerAssetIdr
                          ],
                        )}
                      </td>
                      <td>
                        {money(
                          count *
                            financialAssumptions.processingCostPerAssetIdr[
                              d as keyof typeof financialAssumptions.processingCostPerAssetIdr
                            ],
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>{t('Total', 'Total')}</td>
                    <td>{m.completedAssets}</td>
                    <td>—</td>
                    <td>{money(m.processingCostIdr)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
      {feedback && (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      )}
      <footer className={styles.footer}>
        <ShieldCheck size={15} />
        <span>
          {t(
            'Dihitung dari catatan batch dan posisi perjalanan yang sedang dipilih.',
            'Calculated from the selected batch record and current journey position.',
          )}
        </span>
        <Link to="/twin">
          {t('Kembali ke operasi', 'Back to operations')}
          <ArrowRight size={14} />
        </Link>
      </footer>
      <Dialog
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        title={t('Pekerjaan setara, perhitungan terbuka', 'Equal work, transparent calculation')}
        description={t(
          'Perbandingan ini mencakup penjemputan dari rumah ke hub untuk perangkat yang sama.',
          'This comparison covers household-to-hub collection for the same devices.',
        )}
      >
        <div className={styles.methodBody}>
          <div className={styles.methodFacts}>
            <div>
              <span>{t('Perangkat tercakup', 'Included devices')}</span>
              <strong>{m.collectedAssets}</strong>
            </div>
            <div>
              <span>{t('Rumah tangga', 'Households')}</span>
              <strong>{m.householdsServed}</strong>
            </div>
            <div>
              <span>{t('Kelas penanganan', 'Handling classes')}</span>
              <strong>{new Set(collected.map((a) => a.asset.handlingClass)).size}</strong>
            </div>
          </div>
          <h3>{t('Apa yang dibandingkan?', 'What is compared?')}</h3>
          <p>
            {t(
              'Perjalanan terpisah berangkat dari hub ke satu rumah tangga dan kembali. Jika satu rumah memiliki kelas penanganan berbeda, perjalanan dipisah sesuai kendaraan yang kompatibel. Rute gabungan menghubungkan beberapa pemberhentian dengan kapasitas kendaraan yang sesuai.',
              'A dedicated trip leaves the hub for one household and returns. Different handling classes at the same household require separate compatible trips. Grouped routes connect several stops within vehicle capacity.',
            )}
          </p>
          <p>
            {t(
              `Jarak mengikuti jalur tegak lurus dengan skala ${world.coordinateUnitKm} km per satuan koordinat. Kedua pilihan menggunakan tarif kilometer dan biaya keberangkatan kelas kendaraan yang sama.`,
              `Distances follow orthogonal paths at ${world.coordinateUnitKm} km per coordinate unit. Both alternatives use the same vehicle-class kilometre rates and dispatch fees.`,
            )}
          </p>
          <div className={styles.formula}>
            {t(
              'Biaya = jarak × tarif kendaraan + biaya keberangkatan',
              'Cost = distance × vehicle rate + dispatch fee',
            )}
          </div>
          <h3>{t('Rute gabungan yang tercakup', 'Included grouped routes')}</h3>
          {actualRoutes.length ? (
            <div className={styles.methodRoutes}>
              {actualRoutes.map((r) => {
                const v = vehicles.find((v) => v.id === r.vehicleId)!;
                return (
                  <div key={r.id}>
                    <Link to={`/twin?route=${r.id}`}>
                      <strong>{r.id}</strong>
                      <ArrowUpRight size={13} />
                    </Link>
                    <span>
                      {r.stops.length} {t('pemberhentian', 'stops')} · {r.assetIds.length}{' '}
                      {t('perangkat', 'devices')} · {number(r.distanceKm, 1)} km
                    </span>
                    <small>
                      {money(v.ratePerKmIdr)}/km + {money(v.dispatchFeeIdr)} {t('keberangkatan', 'dispatch')}
                    </small>
                    <b>{money(r.distanceKm * v.ratePerKmIdr + v.dispatchFeeIdr)}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>
              {t(
                'Belum ada perangkat dijemput pada posisi perjalanan ini.',
                'No devices collected at this journey position.',
              )}
            </p>
          )}
          <details className={styles.dedicatedDetails}>
            <summary>
              {t(
                `Lihat ${dedicatedTrips.size} perjalanan terpisah`,
                `Inspect ${dedicatedTrips.size} dedicated trips`,
              )}
            </summary>
            <div className={styles.methodRoutes}>
              {[...dedicatedTrips.entries()].map(([key, trip]) => (
                <div key={key}>
                  <Link to={`/twin?household=${trip.householdId}`}>
                    <strong>{trip.householdId}</strong>
                    <ArrowUpRight size={13} />
                  </Link>
                  <span>
                    {trip.handling === 'specialist'
                      ? t('Penanganan khusus', 'Specialist')
                      : trip.handling === 'bulky'
                        ? t('Perangkat besar', 'Bulky devices')
                        : t('Perangkat standar', 'Standard devices')}{' '}
                    · {number(trip.distance, 1)} km
                  </span>
                  <b>{money(trip.cost)}</b>
                </div>
              ))}
            </div>
          </details>
          <p className={styles.inlineNote}>
            {t(
              'Biaya lanjutan dari hub ke mitra tidak termasuk pada kedua pilihan. Ini model perjalanan terpisah dibanding pengumpulan gabungan, bukan bukti keunggulan terhadap layanan terjadwal yang ada. Pemrosesan dan pelepasan data dihitung terpisah.',
              'Downstream hub-to-partner legs are outside both alternatives. This is a separate-trip versus grouping model, not measured superiority over an existing batched service. Processing and data clearance are counted separately.',
            )}
          </p>
        </div>
      </Dialog>
      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t('Bawa catatannya bersama Anda.', 'Take the record with you.')}
        description={`${batchLabel} · ${date(snapshot.serviceDate)} · ${m.collectedAssets} ${t('perangkat dijemput', 'collected devices')}`}
      >
        <div className={styles.exportOptions}>
          <button onClick={printReport}>
            <span>
              <Printer size={23} />
            </span>
            <div>
              <strong>{t('Laporan batch / PDF', 'Batch report / PDF')}</strong>
              <small>
                {t(
                  'Laporan lengkap, siap cetak atau simpan sebagai PDF',
                  'Complete report, ready to print or save as PDF',
                )}
              </small>
            </div>
            <ArrowUpRight size={18} />
          </button>
          <button onClick={() => exportFile('assets')}>
            <span>
              <FileSpreadsheet size={23} />
            </span>
            <div>
              <strong>{t('Ringkasan perangkat · CSV', 'Asset summary · CSV')}</strong>
              <small>
                {t(
                  'ID, massa, hasil, status, dan tujuan setiap perangkat',
                  'IDs, mass, outcomes, status, and destinations',
                )}
              </small>
            </div>
            <Download size={18} />
          </button>
          <button onClick={() => exportFile('custody')}>
            <span>
              <FileText size={23} />
            </span>
            <div>
              <strong>{t('Catatan serah terima · CSV', 'Custody trail · CSV')}</strong>
              <small>
                {t(
                  'Setiap peristiwa serah terima dan waktu perjalanannya',
                  'Every custody event and its journey time',
                )}
              </small>
            </div>
            <Download size={18} />
          </button>
          <button onClick={() => exportFile('json')}>
            <span>
              <FileJson size={23} />
            </span>
            <div>
              <strong>{t('Sesi lengkap · JSON', 'Full session · JSON')}</strong>
              <small>
                {t(
                  'Batch, jendela, keputusan, dan kapasitas yang tersimpan',
                  'Saved batches, windows, decisions, and capacity',
                )}
              </small>
            </div>
            <Download size={18} />
          </button>
        </div>
        {feedback && (
          <p className={styles.feedback} role="status">
            {feedback}
          </p>
        )}
      </Dialog>
    </section>
  );
}

export default function ImpactPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const tutorial = params.get('dataset') === 'tutorial';
  return (
    <>
      <div className={styles.datasetSelector}>
        <Tabs
          label={t('Sumber catatan', 'Record source')}
          value={tutorial ? 'tutorial' : 'history'}
          onChange={(value) => {
            const next = new URLSearchParams(params);
            if (value === 'tutorial') next.set('dataset', 'tutorial');
            else next.delete('dataset');
            setParams(next);
          }}
          items={[
            { value: 'history', label: t('Riwayat operasi', 'Operating history') },
            { value: 'tutorial', label: t('Batch tutorial', 'Tutorial batch') },
          ]}
        />
      </div>
      {tutorial ? (
        <TutorialImpactPage />
      ) : (
        <OperatingImpact
          period={params.get('period') || '2026'}
          onPeriodChange={(value) => {
            const next = new URLSearchParams(params);
            next.set('period', value);
            setParams(next, { preventScrollReset: true });
          }}
        />
      )}
    </>
  );
}
