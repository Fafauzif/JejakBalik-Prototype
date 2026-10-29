import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  FileJson,
  FileSpreadsheet,
  Leaf,
  Printer,
  ShieldCheck,
  Truck,
  Wallet,
  Weight,
  Home,
} from 'lucide-react';
import { Button, Card, Chip, Dialog, EntityHeader, Metric } from '../../components/ui';
import { dispositionNames, useLocale } from '../../i18n';
import { operatingAssetsCsv, operatingPeriods, selectOperatingPeriod } from '../../domain/operating-history';
import { financialAssumptions } from '../../domain/fixtures';
import { downloadContent } from './report';
import { openOperatingReport, operatingJson, operatingSummaryCsv } from './operating-report';
import s from './ImpactPage.module.css';
import h from './OperatingImpact.module.css';
const colors: Record<string, string> = {
  reuse: '#387157',
  repair: '#71956a',
  refurbishment: '#a7b88a',
  parts: '#c2b57f',
  material: '#cda27c',
  specialist: '#a66e59',
};
export default function OperatingImpact({
  period,
  onPeriodChange,
}: {
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  const { t, locale, number, money, date } = useLocale();
  const view = selectOperatingPeriod(period),
    m = view.metrics;
  const economics = useLocation().pathname.endsWith('/economics');
  const [exportOpen, setExportOpen] = useState(false),
    [methodOpen, setMethodOpen] = useState(false),
    [feedbackKey, setFeedback] = useState<'' | 'download' | 'report' | 'blocked'>('');
  const feedback =
    feedbackKey === 'download'
      ? t('Berkas periode siap diunduh.', 'Period download is ready.')
      : feedbackKey === 'report'
        ? t(
            'Laporan terbuka di tab baru. Cetak untuk menyimpan PDF.',
            'Report opened in a new tab. Print to save a PDF.',
          )
        : feedbackKey === 'blocked'
          ? t(
              'Tab laporan diblokir. Izinkan pop-up lalu coba lagi.',
              'Report tab blocked. Allow pop-ups and try again.',
            )
          : '';
  const pct = (n: number) => `${number(n, 1)}%`;
  const periodLabel =
    view.period === '2026'
      ? t('2026 · tahun berjalan', '2026 · year to date')
      : date(view.period + '-01', { day: undefined, month: 'long', year: 'numeric' });
  const exportFile = (kind: 'assets' | 'summary' | 'json') => {
    downloadContent(
      kind === 'json'
        ? operatingJson(view)
        : kind === 'assets'
          ? operatingAssetsCsv(view.assets)
          : operatingSummaryCsv(view),
      `Jejak_Balik_${view.period}_${kind}.${kind === 'json' ? 'json' : 'csv'}`,
      kind === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8',
    );
    setFeedback('download');
  };
  const print = () => {
    const ok = openOperatingReport(view, locale);
    setFeedback(ok ? 'report' : 'blocked');
    if (ok) setExportOpen(false);
  };
  const maxMass = Math.max(...view.months.map((x) => x.metrics.recoveredMassKg), 1);
  return (
    <section className={s.page} aria-label={t('Dampak dan hasil', 'Impact and outcomes')}>
      <EntityHeader
        eyebrow={t('DAMPAK & HASIL', 'IMPACT & OUTCOMES')}
        title={t('Nilai yang kembali.', 'Value, brought back.')}
        subtitle={t(
          'Penjemputan yang digabung. Perangkat yang kembali berguna. Layanan yang terus berjalan.',
          'Collections brought together. Devices returned to use. A service that keeps going.',
        )}
        action={
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
        }
      />
      <div className={h.periodBar}>
        <div>
          <span className={s.contextDot} />
          <strong>{t('Model operasi ilustratif · 2026', 'Illustrative operating model · 2026')}</strong>
          <span>
            {t('Catatan hingga', 'Records through')} {date(view.asOf)}
          </span>
        </div>
        <label>
          {t('Periode', 'Period')}
          <select
            aria-label={t('Periode dampak', 'Impact period')}
            value={view.period}
            onChange={(e) => onPeriodChange(e.target.value)}
          >
            {operatingPeriods.map((p) => (
              <option value={p} key={p}>
                {p === '2026'
                  ? t('2026 · tahun berjalan', '2026 · year to date')
                  : date(p + '-01', { day: undefined, month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className={s.tabs} aria-label={t('Tampilan dampak', 'Impact view')}>
        <Link
          className={!economics ? s.tabActive : ''}
          aria-current={!economics ? 'page' : undefined}
          to={`/impact?period=${view.period}`}
        >
          {t('Hasil pemulihan', 'Recovery outcomes')}
        </Link>
        <Link
          className={economics ? s.tabActive : ''}
          aria-current={economics ? 'page' : undefined}
          to={`/impact/economics?period=${view.period}`}
        >
          {t('Model layanan', 'Service model')}
        </Link>
      </nav>
      <section className={s.metrics} aria-label={t('Ringkasan periode', 'Period summary')}>
        <Metric
          label={t('Massa perangkat yang selesai ditangani', 'Mass of devices with completed disposition')}
          value={
            <>
              {number(m.recoveredMassKg / 1000, 2)}
              <small> t</small>
            </>
          }
          detail={t(
            `${number(m.completedAssets)} perangkat · massa awal, bukan material pulih`,
            `${number(m.completedAssets)} devices · input mass, not material output`,
          )}
          icon={<Weight size={16} />}
        />
        <Metric
          label={t('Kembali berguna', 'Returned to use')}
          value={number(m.valueRetainedAssets)}
          detail={t('Guna ulang, perbaikan, rekondisi', 'Reuse, repair, refurbishment')}
          icon={<Leaf size={16} />}
        />
        <Metric
          label={t('Rumah tangga dilayani', 'Households served')}
          value={number(m.householdsServed)}
          detail={t(
            `${view.batches.length} batch dalam periode`,
            `${view.batches.length} batches in this period`,
          )}
          icon={<Home size={16} />}
        />
        <Metric
          label={t('Biaya penjemputan berkurang', 'Collection costs reduced')}
          value={pct(m.costReductionPercent)}
          detail={t('Dibanding perjalanan terpisah setara', 'Compared with equal-work dedicated trips')}
          icon={<Truck size={16} />}
        />
      </section>
      {!economics ? (
        <>
          <div className={h.resultGrid}>
            <Card className={s.recoveryCard}>
              <div className={s.sectionHeading}>
                <div>
                  <p className={s.eyebrow}>{t('KESEMPATAN BERIKUTNYA', 'THE NEXT OPPORTUNITY')}</p>
                  <h2>{t('Bukan akhir perjalanan.', 'Another useful chapter.')}</h2>
                </div>
                <Leaf className={s.leafIcon} size={23} />
              </div>
              <p className={s.description}>
                {t(
                  'Dahulukan umur guna. Pulihkan komponen dan material ketika perangkat tidak lagi dapat digunakan.',
                  'Keep devices useful first. Recover components and materials when whole-device use is no longer possible.',
                )}
              </p>
              <div className={s.retentionMetric}>
                <strong>
                  {pct(m.completedAssets ? (m.valueRetainedAssets / m.completedAssets) * 100 : 0)}
                </strong>
                <div>
                  {t('nilai guna dipertahankan', 'useful life retained')}
                  <small>
                    {number(m.valueRetainedAssets)} / {number(m.completedAssets)}{' '}
                    {t('perangkat tuntas', 'completed devices')}
                  </small>
                </div>
              </div>
              <div
                className={s.stackedBar}
                aria-label={t('Proporsi jalur pemulihan', 'Recovery pathway proportions')}
              >
                {Object.entries(m.completedDispositions).map(([d, count]) => (
                  <span
                    key={d}
                    style={{
                      width: `${m.completedAssets ? (count / m.completedAssets) * 100 : 0}%`,
                      background: colors[d],
                    }}
                  />
                ))}
              </div>
              <div className={s.outcomeList}>
                {Object.entries(m.completedDispositions).map(([d, count]) => (
                  <div key={d}>
                    <span className={s.outcomeLabel}>
                      <i style={{ background: colors[d] }} />
                      {dispositionNames[d][locale === 'en' ? 1 : 0]}
                    </span>
                    <strong>{number(count)}</strong>
                    <small>{pct(m.completedAssets ? (count / m.completedAssets) * 100 : 0)}</small>
                  </div>
                ))}
              </div>
              <p className={s.inlineNote}>
                {t(
                  'Persentase memakai perangkat selesai sebagai pembagi. Material dan penanganan khusus tidak dihitung sebagai kembali berguna.',
                  'Percentages use completed devices as the denominator. Material recovery and specialist treatment are excluded from returned-to-use devices.',
                )}
              </p>
            </Card>
            <div className={h.rightStack}>
              <Card className={`${s.custodyCard} ${h.trendCard}`}>
                <div className={s.sectionHeading}>
                  <div>
                    <p className={s.eyebrow}>{periodLabel}</p>
                    <h2>{t('Pemulihan yang terus bertumbuh.', 'Recovery, month after month.')}</h2>
                  </div>
                  <Weight size={21} />
                </div>
                <p className={s.description}>
                  {t(
                    'Massa perangkat dengan hasil pemulihan selesai, per bulan.',
                    'Device mass with completed recovery outcomes, by month.',
                  )}
                </p>
                <div
                  className={h.trend}
                  role="img"
                  aria-label={view.months
                    .map((x) => `${x.period}: ${number(x.metrics.recoveredMassKg, 1)} kg`)
                    .join('; ')}
                >
                  {view.months.map(({ period: p, metrics: x }) => (
                    <button
                      key={p}
                      onClick={() => onPeriodChange(p)}
                      aria-label={`${date(p + '-01', { day: undefined, month: 'long', year: 'numeric' })}: ${number(x.recoveredMassKg, 1)} kg`}
                    >
                      <strong>{number(x.recoveredMassKg, 0)}</strong>
                      <span>
                        <i style={{ height: `${Math.max(2, (x.recoveredMassKg / maxMass) * 100)}%` }} />
                      </span>
                      <small>{date(p + '-01', { day: undefined, month: 'short', year: undefined })}</small>
                    </button>
                  ))}
                </div>
                <div className={h.trendFoot}>
                  <span>
                    {t(
                      'Satuan: kg massa awal perangkat selesai · pilih bulan untuk detail',
                      'Unit: kg input mass of completed devices · select a month for details',
                    )}
                  </span>
                  <span>{t('Oktober masih berjalan', 'October is in progress')}</span>
                </div>
                <details className={h.dataDetails}>
                  <summary>{t('Lihat tabel bulanan', 'View monthly table')}</summary>
                  <div
                    className={h.tableScroll}
                    role="region"
                    tabIndex={0}
                    aria-label={t('Tabel rincian perhitungan', 'Calculation details table')}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>{t('Bulan', 'Month')}</th>
                          <th>{t('Tuntas', 'Complete')}</th>
                          <th>kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.months.map((x) => (
                          <tr key={x.period}>
                            <th>{x.period}</th>
                            <td>{number(x.metrics.completedAssets)}</td>
                            <td>{number(x.metrics.recoveredMassKg, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </Card>
              <Card className={h.traceCard}>
                <ShieldCheck size={25} />
                <div>
                  <h3>{t('Setiap perangkat, ada jejaknya.', 'Every item has a trace.')}</h3>
                  <p>
                    {t(
                      `${number(m.dataClearedAssets)} pelepasan data selesai. ${number(m.activeAssets)} perangkat masih dalam proses, terpisah dari hasil pemulihan tuntas.`,
                      `${number(m.dataClearedAssets)} data clearances completed. ${number(m.activeAssets)} devices remain in progress, separate from completed recovery outcomes.`,
                    )}
                  </p>
                  <Link className={s.textLink} to={`/assets?period=${view.period}`}>
                    {t('Telusuri catatan perangkat', 'Explore asset records')}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
          <Card className={s.comparisonCard}>
            <div className={s.sectionHeading}>
              <div>
                <p className={s.eyebrow}>{t('LEBIH SEDIKIT PERJALANAN', 'FEWER TRIPS')}</p>
                <h2>
                  {t('Dijemput bersama. Dampaknya berbeda.', 'Collected together. A different impact.')}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMethodOpen(true)}>
                {t('Lihat perhitungan', 'View calculation')}
                <ArrowUpRight size={15} />
              </Button>
            </div>
            <p className={s.description}>
              {t(
                `${number(m.collectedAssets)} perangkat yang sama, ${number(m.householdsServed)} rumah tangga yang sama, kelas penanganan yang sama.`,
                `${number(m.collectedAssets)} identical devices, ${number(m.householdsServed)} identical households, identical handling classes.`,
              )}
            </p>
            <div className={s.comparisonGrid}>
              {[
                {
                  title: t('Jarak penjemputan', 'Collection distance'),
                  unit: ' km',
                  dedicated: m.dedicatedDistanceKm,
                  grouped: m.groupedDistanceKm,
                  reduction: m.distanceReductionPercent,
                  cost: false,
                },
                {
                  title: t('Biaya penjemputan', 'Collection cost'),
                  unit: '',
                  dedicated: m.dedicatedCollectionCostIdr,
                  grouped: m.groupedCollectionCostIdr,
                  reduction: m.costReductionPercent,
                  cost: true,
                },
              ].map((x) => (
                <section key={x.title}>
                  <div className={s.chartTitle}>
                    <h3>{x.title}</h3>
                    <span>
                      {pct(x.reduction)} {t('lebih hemat', 'saved')}
                    </span>
                  </div>
                  {[
                    {
                      label: t('Perjalanan terpisah', 'Dedicated trips'),
                      value: x.dedicated,
                      css: s.dedicatedBar,
                    },
                    { label: t('Rute gabungan', 'Grouped routes'), value: x.grouped, css: s.groupedBar },
                  ].map((line) => (
                    <div className={s.barGroup} key={line.label}>
                      <div>
                        <span>{line.label}</span>
                        <strong>{x.cost ? money(line.value) : number(line.value, 1) + x.unit}</strong>
                      </div>
                      <div className={s.barTrack}>
                        <span
                          className={line.css}
                          style={{ width: `${x.dedicated ? (line.value / x.dedicated) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className={s.chartFoot}>
                    {x.cost
                      ? t(
                          'Tarif kendaraan dan biaya keberangkatan sama untuk kedua pilihan.',
                          'Both alternatives use identical vehicle and dispatch rates.',
                        )
                      : t(
                          `${number(m.groupedRoutes)} rute gabungan menggantikan ${number(m.dedicatedTrips)} perjalanan terpisah.`,
                          `${number(m.groupedRoutes)} grouped routes replace ${number(m.dedicatedTrips)} dedicated trips.`,
                        )}
                  </p>
                </section>
              ))}
            </div>
            <p className={s.inlineNote}>
              {t(
                'Batas perbandingan: rumah ke hub. Perjalanan lanjutan dari hub dikecualikan pada kedua pilihan. Model membandingkan perjalanan terpisah dengan pengumpulan gabungan; bukan bukti keunggulan terhadap layanan terjadwal yang sudah ada.',
                'Comparison boundary: home to hub. Downstream legs from the hub are excluded from both alternatives. This models separate trips against grouped collection, not a measured advantage over an existing scheduled service.',
              )}
            </p>
            <Link className={s.textLink} to="/network#program-model">
              {t(
                'Bandingkan urutan rute dalam kelompok yang sama',
                'Compare ordering within the same grouped route',
              )}{' '}
              <ArrowRight size={14} />
            </Link>
          </Card>
          <Card className={h.modelTeaser}>
            <Wallet size={28} />
            <div>
              <h2>
                {t(
                  'Akses Rp0 dalam program didanai. Bagaimana layanan bertahan?',
                  'Rp0 within funded programs. What keeps the service going?',
                )}
              </h2>
              <p>
                {t(
                  'Kontrak layanan dan dukungan akses menopang pengumpulan. Bagian 20% dari nilai pulih mendukung operasi berikutnya.',
                  'Service contracts and access support fund collection. A 20% share of recovered value helps fund the next operation.',
                )}
              </p>
              <Link className={s.textLink} to={`/impact/economics?period=${view.period}`}>
                {t('Buka model layanan & biaya', 'Explore the service model & costs')}
                <ArrowRight size={15} />
              </Link>
            </div>
          </Card>
        </>
      ) : (
        <>
          <section className={s.economicsHero}>
            <div>
              <span className={s.eyebrow}>
                {t('KONTRIBUSI OPERASI PERIODE', 'PERIOD OPERATING CONTRIBUTION')}
              </span>
              <h2>{money(m.operatingContributionIdr)}</h2>
              <p>
                {t(
                  'Pendanaan dan bagian nilai pulih, dikurangi penjemputan, pemrosesan, dan pelepasan data.',
                  'Funding and recovered-value share, less collection, processing, and data clearance.',
                )}
              </p>
              <span className={s.modelBoundary}>
                {t(
                  'Belum termasuk overhead, modal, pajak, dan modal kerja.',
                  'Excludes overhead, capital, tax, and working capital.',
                )}
              </span>
            </div>
            <div className={s.economicsHeroSide}>
              <div>
                <span>{t('Pendapatan & pendanaan', 'Revenue & funding')}</span>
                <strong>{money(m.revenueIdr)}</strong>
              </div>
              <div>
                <span>{t('Biaya operasi', 'Operating costs')}</span>
                <strong>{money(m.expensesIdr)}</strong>
              </div>
              <Chip tone="success">{t('Rp0 dalam program yang didanai', 'Rp0 within funded programs')}</Chip>
            </div>
          </section>
          <div className={s.economicColumns}>
            <Card className={s.financeCard}>
              <div className={s.sectionHeading}>
                <h2>{t('Sumber pendanaan', 'How the service is funded')}</h2>
                <Wallet size={22} />
              </div>
              <p className={s.description}>
                {t(
                  'Tiga sumber menjaga akses pengumpulan dan nilai pemulihan.',
                  'Three sources sustain collection access and recovery value.',
                )}
              </p>
              {[
                {
                  label: t('Kontrak layanan', 'Service contracts'),
                  detail: t('Pendanaan pengumpulan per batch', 'Collection funding per batch'),
                  value: m.serviceContractFeeIdr,
                },
                {
                  label: t('Dukungan akses komunitas', 'Community-access support'),
                  detail: t('Mendukung akses penjemputan rumah tangga', 'Supports household pickup access'),
                  value: m.communityAccessSponsorIdr,
                },
                {
                  label: t('Bagian nilai pulih platform', 'Platform recovered-value share'),
                  detail: t('20% dari nilai pulih bruto', '20% of gross recovered value'),
                  value: m.recoveredValueIdr,
                },
              ].map((line, i) => (
                <div className={s.financeLine} key={line.label}>
                  <span className={s.flowNumber}>{i + 1}</span>
                  <div>
                    <strong>{line.label}</strong>
                    <small>{line.detail}</small>
                  </div>
                  <b>{money(line.value)}</b>
                </div>
              ))}
              <div className={s.financeTotal}>
                <span>{t('Total pendapatan & pendanaan', 'Total revenue & funding')}</span>
                <strong>{money(m.revenueIdr)}</strong>
              </div>
              <div className={s.grossValue}>
                <span>{t('Nilai pulih bruto', 'Gross recovered value')}</span>
                <strong>{money(m.grossRecoveredValueIdr)}</strong>
                <p>
                  {t(
                    'Nilai bruto berada di hilir. Hanya bagian platform 20% yang masuk pendapatan.',
                    'Gross value sits downstream. Only the platform’s 20% share enters revenue.',
                  )}
                </p>
              </div>
            </Card>
            <Card className={s.financeCard}>
              <div className={s.sectionHeading}>
                <h2>{t('Biaya yang diperhitungkan', 'What the service pays for')}</h2>
                <Truck size={22} />
              </div>
              <p className={s.description}>
                {t(
                  'Biaya tetap terlihat, termasuk untuk perangkat yang tidak memiliki nilai jual.',
                  'Costs remain visible, including for devices with no resale value.',
                )}
              </p>
              {[
                {
                  label: t('Penjemputan gabungan', 'Grouped collection'),
                  detail: `${number(m.groupedRoutes)} ${t('rute', 'routes')} · ${number(m.groupedDistanceKm, 1)} km`,
                  value: m.groupedCollectionCostIdr,
                },
                {
                  label: t('Pemrosesan perangkat', 'Device processing'),
                  detail: `${number(m.completedAssets)} ${t('perangkat tuntas', 'completed devices')}`,
                  value: m.processingCostIdr,
                },
                {
                  label: t('Pelepasan data', 'Data clearance'),
                  detail: `${number(m.dataClearedAssets)} × ${money(financialAssumptions.dataClearanceCostPerAssetIdr)}`,
                  value: m.dataClearanceCostIdr,
                },
              ].map((line) => (
                <div className={s.financeLine} key={line.label}>
                  <span className={s.costMark}>−</span>
                  <div>
                    <strong>{line.label}</strong>
                    <small>{line.detail}</small>
                  </div>
                  <b>{money(line.value)}</b>
                </div>
              ))}
              <div className={s.financeTotal}>
                <span>{t('Total biaya operasi', 'Total operating cost')}</span>
                <strong>{money(m.expensesIdr)}</strong>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMethodOpen(true)}>
                {t('Periksa perhitungan rute', 'Inspect route calculation')}
                <ArrowRight size={15} />
              </Button>
            </Card>
          </div>
          <Card className={s.processingCard}>
            <div className={s.sectionHeading}>
              <div>
                <p className={s.eyebrow}>{t('BIAYA PEMULIHAN', 'RECOVERY COSTS')}</p>
                <h2>{t('Jalur yang tepat, biaya yang terlihat.', 'The right pathway, visible costs.')}</h2>
              </div>
              <CheckCheck size={22} />
            </div>
            <div
              className={s.tableScroll}
              role="region"
              tabIndex={0}
              aria-label={t('Biaya pemrosesan per jalur pemulihan', 'Processing costs by recovery pathway')}
            >
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{t('Jalur pemulihan', 'Recovery pathway')}</th>
                    <th>{t('Tuntas', 'Complete')}</th>
                    <th>{t('Biaya / perangkat', 'Cost / device')}</th>
                    <th>{t('Biaya pemrosesan', 'Processing cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(m.completedDispositions).map(([d, count]) => (
                    <tr key={d}>
                      <td>
                        <span className={s.pathway}>
                          <i style={{ background: colors[d] }} />
                          {dispositionNames[d][locale === 'en' ? 1 : 0]}
                        </span>
                      </td>
                      <td>{number(count)}</td>
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
              </table>
            </div>
          </Card>
        </>
      )}
      <footer className={s.footer}>
        <ShieldCheck size={15} />
        <span>
          {t(
            'Dihitung dari catatan perangkat, rute, dan pendanaan pada periode yang sama.',
            'Calculated from device, route, and funding records in the same period.',
          )}
        </span>
        <Link to={`/assets?period=${view.period}`}>
          {t('Lihat perangkat', 'View assets')}
          <ArrowRight size={14} />
        </Link>
      </footer>
      {feedback && (
        <p className={s.feedback} role="status">
          {feedback}
        </p>
      )}
      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t('Bawa catatannya bersama Anda.', 'Take the record with you.')}
        description={`${periodLabel} · ${number(m.completedAssets)} ${t('perangkat tuntas', 'completed devices')}`}
      >
        <div className={s.exportOptions}>
          {[
            {
              icon: Printer,
              title: t('Laporan periode / PDF', 'Period report / PDF'),
              detail: t(
                'Hasil, perbandingan, ekonomi, dan rincian bulanan',
                'Outcomes, comparison, economics, and monthly breakdown',
              ),
              action: print,
            },
            {
              icon: FileSpreadsheet,
              title: t('Daftar perangkat · CSV', 'Asset registry · CSV'),
              detail: t(
                'Seluruh perangkat dalam periode, termasuk yang belum tuntas',
                'Every device in the period, including those still in progress',
              ),
              action: () => exportFile('assets'),
            },
            {
              icon: FileSpreadsheet,
              title: t('Ringkasan bulanan · CSV', 'Monthly summary · CSV'),
              detail: t(
                'Angka pembentuk tren dan ekonomi layanan',
                'Figures behind the trend and service economics',
              ),
              action: () => exportFile('summary'),
            },
            {
              icon: FileJson,
              title: t('Catatan periode · JSON', 'Period records · JSON'),
              detail: t(
                'Perangkat, batch, rute, pendanaan, dan asumsi',
                'Devices, batches, routes, funding, and assumptions',
              ),
              action: () => exportFile('json'),
            },
          ].map((option) => (
            <button key={option.title} onClick={option.action}>
              <span>
                <option.icon size={23} />
              </span>
              <div>
                <strong>{option.title}</strong>
                <small>{option.detail}</small>
              </div>
              <ArrowDownToLine size={17} />
            </button>
          ))}
        </div>
        {feedback && (
          <p role="status" className={s.feedback}>
            {feedback}
          </p>
        )}
      </Dialog>
      <Dialog
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        title={t('Pekerjaan setara, perhitungan terbuka', 'Equal work, transparent calculation')}
        description={t(
          'Perangkat dan kelas kendaraan sama pada kedua pilihan.',
          'The same devices and vehicle classes in both alternatives.',
        )}
      >
        <div className={s.methodBody}>
          <div className={s.methodFacts}>
            <div>
              <span>{t('Perangkat dijemput', 'Collected devices')}</span>
              <strong>{number(m.collectedAssets)}</strong>
            </div>
            <div>
              <span>{t('Rumah tangga', 'Households')}</span>
              <strong>{number(m.householdsServed)}</strong>
            </div>
            <div>
              <span>{t('Rute gabungan', 'Grouped routes')}</span>
              <strong>{number(m.groupedRoutes)}</strong>
            </div>
          </div>
          <h3>{t('Apa yang dibandingkan?', 'What is compared?')}</h3>
          <p>
            {t(
              'Perjalanan terpisah membawa satu rumah tangga dan satu kelas penanganan dari hub ke rumah lalu kembali. Rute gabungan menyatukan beberapa rumah tangga dalam batas massa dan jumlah perangkat kendaraan. Kelas biasa, besar, dan khusus memakai kendaraan yang sesuai.',
              'A dedicated trip serves one household and one handling class from hub to home and back. Grouped routes combine households within vehicle mass and device-count limits. Ordinary, bulky, and specialist classes use suitable vehicles.',
            )}
          </p>
          <div className={s.formula}>
            {t(
              'Biaya = jarak × tarif kendaraan + biaya keberangkatan',
              'Cost = distance × vehicle rate + dispatch fee',
            )}
          </div>
          <p>
            {t(
              'Jarak mengikuti jalur tegak lurus antara koordinat rumah dan hub. Kedua pilihan memakai tarif yang sama. Pemrosesan dan pelepasan data dihitung terpisah.',
              'Distances follow orthogonal paths between household and hub coordinates. Both alternatives use the same rates. Processing and data clearance are counted separately.',
            )}
          </p>
          <div
            className={h.tableScroll}
            role="region"
            tabIndex={0}
            aria-label={t('Tabel rincian perhitungan', 'Calculation details table')}
          >
            <table>
              <thead>
                <tr>
                  <th>{t('Kelas', 'Class')}</th>
                  <th>Rp/km</th>
                  <th>{t('Keberangkatan', 'Dispatch')}</th>
                  <th>{t('Maks. kg / perangkat', 'Max. kg / items')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [t('Biasa', 'Ordinary'), 4500, 25000, '80 / 12'],
                  [t('Besar', 'Bulky'), 6500, 45000, '240 / 4'],
                  [t('Khusus', 'Specialist'), 6000, 50000, '30 / 6'],
                ].map((row) => (
                  <tr key={String(row[0])}>
                    {row.map((v, i) => (
                      <td key={i}>{typeof v === 'number' ? number(v) : v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.inlineNote}>
            {t(
              'Batas: rumah–hub untuk perangkat yang sudah dijemput. Rute lanjutan hub–tujuan dikecualikan pada kedua pilihan. Rincian setiap rute tersedia dalam JSON periode.',
              'Boundary: home-to-hub for already collected devices. Downstream hub-to-destination legs are excluded from both alternatives. Individual route records are included in the period JSON.',
            )}
          </p>
        </div>
      </Dialog>
    </section>
  );
}
