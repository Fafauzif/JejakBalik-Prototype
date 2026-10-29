import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Route, ShieldCheck, Wallet } from 'lucide-react';
import { useLocale } from '../../i18n';
import { routes, world } from '../../domain/fixtures';
import { analyzeFunding, improveVisitOrder } from '../../domain/program-analysis';
import './program.css';

export default function ProgramLab() {
  const { t, money, number } = useLocale();
  const [service, setService] = useState(true),
    [sponsor, setSponsor] = useState(true),
    [recovery, setRecovery] = useState(100),
    [held, setHeld] = useState(false),
    [routeId, setRouteId] = useState(routes[0].id);
  const f = analyzeFunding({ service, sponsor, recovery, specialistHeld: held });
  const route = routes.find((r) => r.id === routeId)!;
  const plan = useMemo(
    () =>
      improveVisitOrder(
        route.stops.map((s) => ({ id: s.householdId, position: s.position })),
        route.path[0] || world.hub.position,
        route.path.at(-1) || world.hub.position,
      ),
    [route],
  );
  const km = (v: number) => number(v * world.coordinateUnitKm, 1);
  return (
    <section className="program-lab" aria-label={t('Rancang program komunitas', 'Community program studio')}>
      <div className="program-intro">
        <span className="program-eyebrow">{t('MODEL LAYANAN', 'SERVICE MODEL')}</span>
        <h2>
          {t('Gratis bagi warga. Terencana bagi pengelola.', 'Free for residents. Planned for operators.')}
        </h2>
        <p>
          {t(
            'Institusi membiayai akses pengumpulan. Mitra menerima batch sesuai kapasitas. Setiap hasil memiliki catatan.',
            'Institutions fund collection access. Partners accept batches within capacity. Every outcome has a record.',
          )}
        </p>
      </div>
      <div className="program-promise">
        {[
          [
            Wallet,
            t('Program didanai', 'Funded program'),
            t('Anggaran layanan + akses komunitas', 'Service budget + community access'),
          ],
          [
            Route,
            t('Pengumpulan terjadwal', 'Scheduled collection'),
            t('Gabungkan permintaan dalam satu jangkauan', 'Group requests within one service area'),
          ],
          [
            ShieldCheck,
            t('Hasil dapat ditelusuri', 'Accountable outcomes'),
            t('Tahan perangkat saat bukti belum lengkap', 'Hold devices when evidence is incomplete'),
          ],
        ].map(([Icon, title, body], i) => {
          const I = Icon as typeof Wallet;
          return (
            <div key={i}>
              <I size={20} />
              <strong>{title as string}</strong>
              <span>{body as string}</span>
            </div>
          );
        })}
      </div>
      <details className="program-details">
        <summary>
          {t('Uji pendanaan & rencana rute', 'Explore funding & route planning')}
          <ArrowRight size={17} />
        </summary>
        <p className="program-note">
          {t(
            'Laboratorium skenario • 48 perangkat, 189,64 kg. Angka merupakan asumsi ilustratif, bukan hasil lapangan atau penawaran mitra. Perubahan di sini tidak mengubah operasi.',
            'Scenario lab • 48 devices, 189.64 kg. Figures are illustrative assumptions, not field results or partner quotations. Changes here do not change operations.',
          )}
        </p>
        <div className="program-lab-grid">
          <div className="program-workbench">
            <h3>{t('Siapa membiayai pengumpulan?', 'Who funds collection?')}</h3>
            <label className="program-check">
              <input type="checkbox" checked={service} onChange={(e) => setService(e.target.checked)} />
              <span>
                {t('Kontrak layanan institusi', 'Institutional service contract')}
                <small>{money(1800000)}</small>
              </span>
            </label>
            <label className="program-check">
              <input type="checkbox" checked={sponsor} onChange={(e) => setSponsor(e.target.checked)} />
              <span>
                {t('Dukungan akses komunitas', 'Community access funding')}
                <small>{money(700000)}</small>
              </span>
            </label>
            <label className="program-range">
              {t('Nilai pemulihan dibanding asumsi awal', 'Recovery value compared with original assumption')}{' '}
              <strong>{recovery}%</strong>
              <input
                aria-label={t('Nilai pemulihan', 'Recovery value')}
                type="range"
                min="0"
                max="150"
                step="5"
                value={recovery}
                onChange={(e) => setRecovery(Number(e.target.value))}
              />
            </label>
            <label className="program-check">
              <input type="checkbox" checked={held} onChange={(e) => setHeld(e.target.checked)} />
              <span>
                {t('Dua perangkat spesialis tetap ditahan', 'Keep two specialist devices on hold')}
                <small>
                  {t(
                    'Biaya tindak lanjut tetap menjadi kewajiban',
                    'Follow-up treatment remains an obligation',
                  )}
                </small>
              </span>
            </label>
            <dl className="program-ledger">
              <div>
                <dt>{t('Nilai kotor taksiran', 'Estimated gross value')}</dt>
                <dd>{money(f.grossValue)}</dd>
              </div>
              <div>
                <dt>{t('Bagian non-platform (80%)', 'Non-platform portion (80%)')}</dt>
                <dd>{money(f.grossValue * 0.8)}</dd>
              </div>
              <div>
                <dt>{t('Bagian platform (20%)', 'Platform share (20%)')}</dt>
                <dd>{money(f.share)}</dd>
              </div>
              <div>
                <dt>{t('Layanan + dukungan akses', 'Service + access funding')}</dt>
                <dd>{money(f.service + f.sponsor)}</dd>
              </div>
              <div>
                <dt>{t('Pengumpulan + proses + data', 'Collection + processing + data')}</dt>
                <dd>−{money(f.collection + f.processing + f.clearance)}</dd>
              </div>
              <div>
                <dt>{t('Kontribusi sebelum biaya umum', 'Contribution before overhead')}</dt>
                <dd>{money(f.contribution)}</dd>
              </div>
              <div>
                <dt>{t('Cadangan kewajiban tertunda', 'Outstanding obligation reserve')}</dt>
                <dd>−{money(f.outstanding)}</dd>
              </div>
            </dl>
            <div className={`program-result ${f.afterObligations < 0 ? 'negative' : ''}`}>
              <span>{t('Setelah cadangan kewajiban', 'After outstanding obligations')}</span>
              <strong>{money(f.afterObligations)}</strong>
              <small>
                {t(
                  'Belum mencakup biaya umum, modal, pajak, dan modal kerja.',
                  'Excludes overhead, capital equipment, tax and working capital.',
                )}
              </small>
            </div>
            <p className="program-note">
              {t(
                'Sisa 80% nilai pemulihan harus disepakati bersama pemilik dan mitra. Nilai taksiran belum berarti uang yang diterima.',
                'The remaining 80% requires an owner/partner settlement agreement. Estimated value is not cash received.',
              )}
            </p>
          </div>
          <div className="program-workbench">
            <h3>{t('Rute yang bisa dijelaskan', 'A plan you can inspect')}</h3>
            <label className="program-select">
              {t('Kelompok pengumpulan', 'Collection group')}
              <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} · {r.stops.length} {t('titik', 'stops')}
                  </option>
                ))}
              </select>
            </label>
            <div className="program-compare">
              <div>
                <span>{t('Urutan awal', 'Original order')}</span>
                <strong>
                  {km(plan.originalDistance)} <small>km</small>
                </strong>
              </div>
              <ArrowRight size={22} />
              <div>
                <span>{t('Usulan urutan lokal', 'Local ordering proposal')}</span>
                <strong>
                  {km(plan.proposedDistance)} <small>km</small>
                </strong>
              </div>
            </div>
            <p className="program-note">
              {t(
                'Bandingkan kelompok titik yang sama, bukan penjemputan satu per satu. Algoritma nearest-neighbour + 2-opt mempertahankan anggota kelompok dan tujuan.',
                'Compare the same grouped stops, not individual dedicated trips. Nearest-neighbour + 2-opt keeps route membership and endpoints unchanged.',
              )}
            </p>
            <div className="program-stops">
              <strong>{t('Urutan usulan', 'Proposed visit order')}</strong>
              <ol>
                {plan.stops.map((s) => (
                  <li key={s.id}>{s.id}</li>
                ))}
              </ol>
            </div>
            <div className="program-invariant">
              <CheckCircle2 size={18} />
              {t('Kelompok yang sama • tanpa persetujuan otomatis', 'Same cohort • no automatic approvals')}
            </div>
            <p className="program-note">
              {t(
                'Geometri kota ilustratif. Waktu jalan, lalu lintas, waktu layanan, dan jadwal belum dioptimalkan. Ini usulan urutan, bukan perintah penjemputan atau bukti penghematan backhaul.',
                'Illustrative city geometry. Travel time, traffic, service duration and schedules are not optimized. This is an ordering proposal, not a dispatch instruction or verified backhaul saving.',
              )}
            </p>
          </div>
        </div>
      </details>
      <details className="program-details program-evidence">
        <summary>
          {t('Ruang lingkup pilot & dasar gagasan', 'Pilot scope & evidence')}
          <ArrowRight size={17} />
        </summary>
        <h3>{t('Mulai dari satu institusi.', 'Start with one institution.')}</h3>
        <p className="program-note">
          {t(
            'Usulan pilot: satu kampus atau lingkungan kantor, titik serah terima dengan penanggung jawab, kategori yang disepakati, anggaran tertutup, serta kapasitas penerima yang dikonfirmasi sebelum jadwal dijanjikan. Institusi membeli penjadwalan, koordinasi, rekonsiliasi serah terima, dan laporan; warga mendapat akses dalam lingkup program.',
            'Proposed pilot: one campus or workplace community, staffed handover points, agreed categories, a bounded budget, and receiving capacity confirmed before promising a window. The institution buys scheduling, coordination, reconciled handoffs and reporting; residents receive access within that program.',
          )}
        </p>
        <h3>{t('Siapa menerima nilai pemulihan?', 'Who receives recovery proceeds?')}</h3>
        <p className="program-note">
          {t(
            'Persetujuan pemilik → pemeriksaan → persetujuan biaya → guna ulang / penjualan / pengolahan → bukti hasil dan pembayaran → pembagian nilai. Pembagian 80% antara pemilik dan mitra belum dikontrakkan. Donasi dan pengembalian hasil perbaikan tidak otomatis menghasilkan pendapatan penjualan.',
            'Owner consent → inspection → cost approval → reuse / sale / treatment → outcome and payment evidence → settlement. The 80% split among owner and partners is not contracted. Donation and repair-and-return do not automatically generate sales revenue.',
          )}
        </p>
        <h3>{t('Hipotesis yang perlu diuji.', 'A hypothesis to test.')}</h3>
        <p className="program-note">
          {t(
            'Layanan pengumpulan dan pelacakan sudah tersedia. JejakBalik perlu membuktikan apakah konfirmasi penerimaan, pengelompokan permintaan, dan tindak lanjut bukti mengurangi kerja koordinasi dibanding WhatsApp + spreadsheet. Penghematan model belum membuktikan keunggulan terhadap layanan pengumpulan terjadwal yang ada.',
            'Collection and tracking services already exist. JejakBalik must test whether receiver acceptance, pooled requests and evidence follow-up reduce coordination work compared with WhatsApp + spreadsheets. Modeled savings do not establish superiority over existing scheduled collection.',
          )}
        </p>
        <div className="program-source-links">
          <a href="https://lingkunganhidup.jakarta.go.id/layanan/ewaste" target="_blank" rel="noreferrer">
            {t('Layanan e-waste DLH Jakarta', 'Jakarta DLH e-waste service')} ↗
          </a>
          <a href="https://ewasterj.com/" target="_blank" rel="noreferrer">
            {t('Layanan EwasteRJ', 'EwasteRJ services')} ↗
          </a>
          <a
            href="https://www.lintasarta.net/berita/official-fact-sheet-pengelolaan-perangkat-elektronik-dan-e-waste-di-lintasarta/"
            target="_blank"
            rel="noreferrer"
          >
            {t('Rujukan resmi #AksiCintaBumi', 'Official #AksiCintaBumi reference')} ↗
          </a>
        </div>
      </details>
    </section>
  );
}
