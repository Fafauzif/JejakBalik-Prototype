import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  BatteryWarning,
  Box,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ListFilter,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  X,
} from 'lucide-react';
import { Button, Card, Chip, EmptyState, EntityHeader, Metric, Tabs } from '../../components/ui';
import { encodeCsv, type AssetSnapshot } from '../../domain';
import {
  getOperatingAsset,
  operatingAssetsCsv,
  operatingPeriods,
  selectOperatingPeriod,
  type OperatingAsset,
} from '../../domain/operating-history';
import { categoryNames, dispositionNames, localizedPair, statusNames, useLocale } from '../../i18n';
import { useSnapshot } from '../../state/store';
import ItemIllustration from '../household/ItemIllustration';
import s from './AssetsPage.module.css';

const PAGE_SIZE = 12;
const conditions: Record<string, [string, string]> = {
  functional: ['Masih berfungsi', 'Still works'],
  needs_review: ['Perlu pemeriksaan', 'Needs inspection'],
  requires_assessment: ['Perlu penilaian', 'Needs assessment'],
  repairable: ['Perlu perbaikan', 'Needs repair'],
  worn: ['Berfungsi, kondisi aus', 'Works, with wear'],
  parts_only: ['Untuk komponen', 'For parts'],
  nonfunctional: ['Tidak berfungsi', 'Not working'],
  intact: ['Utuh', 'Intact'],
  damaged: ['Rusak / menggembung', 'Damaged / swollen'],
};
const states = [
  'draft',
  'requested',
  'validated',
  'scheduled',
  'assigned',
  'collected',
  'received',
  'triaged',
  'routed',
  'completed',
  'held',
  'deferred',
];
const effectiveStatus = (item: AssetSnapshot) =>
  item.deferred ? 'deferred' : item.held ? 'held' : item.status;
const toneFor = (item: AssetSnapshot) =>
  item.held
    ? 'warning'
    : item.status === 'completed'
      ? 'success'
      : item.deferred
        ? 'neutral'
        : ['collected', 'received', 'triaged', 'routed'].includes(item.status)
          ? 'info'
          : 'neutral';

export default function AssetsPage() {
  const tutorialSnapshot = useSnapshot();
  const { locale, t, number, date } = useLocale();
  const [params, setParams] = useSearchParams();
  const [downloadNotice, setDownloadNotice] = useState(false);
  const tutorial = params.get('dataset') === 'tutorial';
  const history = useMemo(
    () => selectOperatingPeriod(params.get('period') || '2026'),
    [params.get('period')],
  );
  const snapshot = tutorial
    ? tutorialSnapshot
    : {
        ...tutorialSnapshot,
        assetList: history.assets,
        requests: [],
        serviceDate: history.asOf,
        batchId: history.period,
        metrics: { ...tutorialSnapshot.metrics, dataClearedAssets: history.metrics.dataClearedAssets },
      };
  const assetLink = (id: string) =>
    tutorial
      ? `/network?mode=tutorial&asset=${encodeURIComponent(id)}`
      : `/assets/${encodeURIComponent(id)}?period=${history.period}`;
  const query = params.get('q') || '';
  const category = params.get('category') || 'all';
  const status = params.get('status') || 'all';
  const requestedTab = params.get('tab') || 'all';
  const tab = ['all', 'progress', 'attention', 'completed'].includes(requestedTab) ? requestedTab : 'all';
  const sort = params.get('sort') === 'mass' ? 'mass' : 'id';
  const requestedPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  const categoryLabel = (key: string) => localizedPair(categoryNames, key, locale);
  const statusLabel = (item: AssetSnapshot) => localizedPair(statusNames, effectiveStatus(item), locale);
  const conditionLabel = (key: string) => localizedPair(conditions, key, locale);
  const dispositionLabel = (key: string) => localizedPair(dispositionNames, key, locale);
  const categoryOptions = useMemo(
    () => [...new Set(snapshot.assetList.map((item) => item.asset.category))],
    [snapshot.assetList],
  );
  const counts = useMemo(
    () => ({
      all: snapshot.assetList.length,
      completed: snapshot.assetList.filter((item) => item.status === 'completed').length,
      attention: snapshot.assetList.filter((item) => item.held || item.deferred).length,
      progress: snapshot.assetList.filter(
        (item) => !item.held && !item.deferred && !['draft', 'completed'].includes(item.status),
      ).length,
      data: snapshot.assetList.filter((item) => item.asset.dataBearing).length,
      drafts: snapshot.assetList.filter((item) => item.status === 'draft').length,
    }),
    [snapshot.assetList],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return snapshot.assetList
      .filter((item) => {
        const asset = item.asset;
        if (category !== 'all' && asset.category !== category) return false;
        if (status !== 'all' && effectiveStatus(item) !== status) return false;
        if (tab === 'completed' && item.status !== 'completed') return false;
        if (tab === 'attention' && !item.held && !item.deferred) return false;
        if (
          tab === 'progress' &&
          (item.held || item.deferred || ['draft', 'completed'].includes(item.status))
        )
          return false;
        return (
          !needle ||
          [
            asset.id,
            asset.requestId,
            asset.householdId,
            asset.category,
            categoryNames[asset.category]?.join(' '),
            'addressAlias' in item
              ? String(item.addressAlias)
              : snapshot.requests.find((request) => request.id === asset.requestId)?.addressAlias,
          ]
            .join(' ')
            .toLocaleLowerCase(locale)
            .includes(needle)
        );
      })
      .sort((a, b) =>
        sort === 'mass'
          ? b.asset.massKg - a.asset.massKg || a.asset.id.localeCompare(b.asset.id)
          : a.asset.id.localeCompare(b.asset.id),
      );
  }, [snapshot.assetList, snapshot.requests, query, category, status, tab, sort, locale]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = !!query || category !== 'all' || status !== 'all' || tab !== 'all';

  function update(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params);
    if (value === 'all' || !value || (key === 'sort' && value === 'id') || (key === 'page' && value === '1'))
      next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace, preventScrollReset: true });
  }
  function clearFilters() {
    const next = new URLSearchParams(params);
    ['q', 'category', 'status', 'tab', 'page'].forEach((key) => next.delete(key));
    setParams(next, { preventScrollReset: true });
  }
  function exportCsv() {
    const csv = !tutorial
      ? operatingAssetsCsv(filtered as OperatingAsset[])
      : encodeCsv([
          [
            t('ID perangkat', 'Asset ID'),
            t('Permintaan', 'Request'),
            t('Kategori', 'Category'),
            t('Status', 'Status'),
            t('Kondisi', 'Condition'),
            t('Massa (kg)', 'Mass (kg)'),
            t('Jalur yang direncanakan', 'Planned pathway'),
            t('Hasil akhir', 'Final outcome'),
            t('Mengandung data', 'Data bearing'),
            t('Data diselesaikan', 'Data cleared'),
            t('Tanggal layanan', 'Service date'),
          ],
          ...filtered.map((item) => [
            item.asset.id,
            item.asset.requestId,
            categoryLabel(item.asset.category),
            statusLabel(item),
            conditionLabel(item.asset.condition),
            item.asset.massKg,
            dispositionLabel(item.asset.plannedDisposition),
            item.status === 'completed' ? dispositionLabel(item.asset.plannedDisposition) : '',
            item.asset.dataBearing ? t('Ya', 'Yes') : t('Tidak', 'No'),
            item.dataCleared ? t('Ya', 'Yes') : t('Tidak', 'No'),
            'serviceDate' in item ? String(item.serviceDate) : snapshot.serviceDate,
          ]),
        ]);
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Jejak_Balik_${snapshot.batchId}_assets_${locale}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadNotice(true);
  }
  function flags(item: AssetSnapshot) {
    return (
      <div className={s.flags}>
        {item.asset.dataBearing && (
          <Chip tone={item.dataCleared ? 'success' : 'info'}>
            {item.dataCleared ? (
              <ShieldCheck size={12} aria-hidden="true" />
            ) : (
              <ShieldEllipsis size={12} aria-hidden="true" />
            )}
            {item.dataCleared ? t('Data selesai', 'Data cleared') : t('Mengandung data', 'Data bearing')}
          </Chip>
        )}
        {item.asset.batteryRisk !== 'none' && (
          <Chip tone="warning">
            <BatteryWarning size={12} aria-hidden="true" />
            {t('Penanganan khusus', 'Special handling')}
          </Chip>
        )}
        {!item.asset.dataBearing && item.asset.batteryRisk === 'none' && (
          <span className={s.standardHandling}>
            {item.asset.handlingClass === 'bulky'
              ? t('Perangkat besar', 'Bulky item')
              : t('Penanganan standar', 'Standard handling')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`page-wrap ${s.page}`}>
      <EntityHeader
        eyebrow={t('Setiap perangkat, satu jejak', 'Every item, a traceable journey')}
        title={t('Daftar perangkat', 'Asset registry')}
        subtitle={t(
          'Temukan perangkat dan ikuti perjalanannya, dari penjemputan hingga pemulihan.',
          'Find an item and follow its journey, from collection to recovery.',
        )}
        action={
          <Button
            variant="secondary"
            icon={<ArrowDownToLine size={16} />}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            {t('Unduh CSV', 'Download CSV')}
          </Button>
        }
      />

      <div className={s.datasetBar}>
        <Tabs
          label={t('Sumber catatan', 'Record source')}
          value={tutorial ? 'tutorial' : 'history'}
          onChange={(value) => {
            const next = new URLSearchParams();
            if (value === 'tutorial') next.set('dataset', 'tutorial');
            else next.set('period', history.period);
            setParams(next);
          }}
          items={[
            { value: 'history', label: t('Riwayat operasi', 'Operating history') },
            { value: 'tutorial', label: t('Batch tutorial', 'Tutorial batch') },
          ]}
        />
        {!tutorial && (
          <label className={s.periodLabel}>
            {t('Periode layanan', 'Service period')}
            <select
              aria-label={t('Periode layanan', 'Service period')}
              value={history.period}
              onChange={(e) => update('period', e.target.value)}
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
        )}
        <Chip tone="info">
          {tutorial
            ? t('Satu batch terpandu', 'One guided batch')
            : t('Layanan berkelanjutan · 24/7', 'Continuous service · 24/7')}
        </Chip>
      </div>
      <Card className={s.summary}>
        <Metric
          label={t('Perangkat terdaftar', 'Registered items')}
          value={number(counts.all)}
          detail={
            counts.drafts
              ? t(
                  `${number(counts.drafts)} draf belum diajukan`,
                  `${number(counts.drafts)} draft not yet submitted`,
                )
              : tutorial
                ? t('Seluruh perangkat dalam batch', 'All items in this batch')
                : t(
                    `${history.batches.length} batch dalam periode`,
                    `${history.batches.length} batches in this period`,
                  )
          }
          icon={<Box size={15} />}
        />
        <Metric
          label={t('Pemulihan tuntas', 'Recovery completed')}
          value={number(counts.completed)}
          detail={t('Hasil akhir sudah tercatat', 'Final outcomes recorded')}
          icon={<CheckCheck size={15} />}
        />
        <Metric
          label={t('Mengandung data', 'Data-bearing items')}
          value={number(counts.data)}
          detail={t(
            `${number(snapshot.metrics.dataClearedAssets)} pelepasan data selesai`,
            `${number(snapshot.metrics.dataClearedAssets)} data releases cleared`,
          )}
          icon={<ShieldCheck size={15} />}
        />
        <Metric
          label={t('Perlu perhatian', 'Needs attention')}
          value={number(counts.attention)}
          detail={t('Tinjauan atau jadwal berikutnya', 'Review or next service window')}
          icon={<CircleHelp size={15} />}
        />
      </Card>

      <section className={s.registry} aria-label={t('Daftar dan filter perangkat', 'Asset list and filters')}>
        <div className={s.listHeading}>
          <div>
            <span className={s.serviceDot} aria-hidden="true" />
            {tutorial ? t('Jendela layanan', 'Service window') : t('Catatan hingga', 'Records through')}{' '}
            <strong>{date(snapshot.serviceDate)}</strong>
          </div>
          <span>{t('Pusat Konsolidasi Jakarta', 'Jakarta Consolidation Hub')}</span>
        </div>
        <Tabs
          label={t('Kelompok status perangkat', 'Asset status groups')}
          value={tab}
          onChange={(value) => update('tab', value)}
          items={[
            { value: 'all', label: t('Semua perangkat', 'All items'), count: counts.all },
            { value: 'progress', label: t('Dalam perjalanan', 'In progress'), count: counts.progress },
            { value: 'attention', label: t('Perlu perhatian', 'Needs attention'), count: counts.attention },
            { value: 'completed', label: t('Tuntas', 'Completed'), count: counts.completed },
          ]}
        />
        <div className={s.filterBar}>
          <div className={s.searchField}>
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="asset-search">
              {t('Cari perangkat, permintaan, atau alamat', 'Search items, requests, or addresses')}
            </label>
            <input
              id="asset-search"
              value={query}
              onChange={(event) => update('q', event.target.value, true)}
              placeholder={t('Cari perangkat, ID, atau alamat…', 'Search items, IDs, or addresses…')}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                aria-label={t('Hapus pencarian', 'Clear search')}
                onClick={() => update('q', '', true)}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className={s.selectField}>
            <label className="sr-only" htmlFor="asset-category">
              {t('Kategori perangkat', 'Asset category')}
            </label>
            <select
              id="asset-category"
              value={category}
              onChange={(event) => update('category', event.target.value)}
            >
              <option value="all">{t('Semua kategori', 'All categories')}</option>
              {categoryOptions.map((key) => (
                <option key={key} value={key}>
                  {categoryLabel(key)}
                </option>
              ))}
            </select>
          </div>
          <div className={s.selectField}>
            <label className="sr-only" htmlFor="asset-status">
              {t('Status perangkat', 'Asset status')}
            </label>
            <select
              id="asset-status"
              value={status}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="all">{t('Semua status', 'All statuses')}</option>
              {states.map((key) => (
                <option key={key} value={key}>
                  {localizedPair(statusNames, key, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className={`${s.selectField} ${s.sort}`}>
            <ListFilter size={15} aria-hidden="true" />
            <label className="sr-only" htmlFor="asset-sort">
              {t('Urutkan perangkat', 'Sort assets')}
            </label>
            <select id="asset-sort" value={sort} onChange={(event) => update('sort', event.target.value)}>
              <option value="id">{t('ID perangkat', 'Asset ID')}</option>
              <option value="mass">{t('Massa tertinggi', 'Highest mass')}</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className={s.activeFilters}>
            <span>
              {t(
                `${number(filtered.length)} perangkat sesuai filter`,
                `${number(filtered.length)} items match your filters`,
              )}
            </span>
            <Button size="sm" variant="ghost" onClick={clearFilters} icon={<X size={13} />}>
              {t('Hapus filter', 'Clear filters')}
            </Button>
          </div>
        )}

        {visible.length ? (
          <>
            <div className={s.desktopTable}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th scope="col">{t('Perangkat', 'Item')}</th>
                    <th scope="col">{t('Kondisi & penanganan', 'Condition & handling')}</th>
                    <th scope="col">{t('Status', 'Status')}</th>
                    <th scope="col">{t('Jalur pemulihan', 'Recovery pathway')}</th>
                    <th scope="col" className={s.massColumn}>
                      {t('Massa', 'Mass')}
                    </th>
                    <th scope="col">
                      <span className="sr-only">{t('Lihat perangkat', 'Inspect item')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.asset.id}>
                      <th scope="row">
                        <Link to={assetLink(item.asset.id)} className={s.itemLink}>
                          <span className={s.thumbnail}>
                            <ItemIllustration category={item.asset.category} />
                          </span>
                          <span>
                            <strong>{categoryLabel(item.asset.category)}</strong>
                            <small>
                              {item.asset.id} <span aria-hidden="true">·</span> {item.asset.requestId}
                            </small>
                          </span>
                        </Link>
                      </th>
                      <td>
                        <span className={s.condition}>{conditionLabel(item.asset.condition)}</span>
                        {flags(item)}
                      </td>
                      <td>
                        <Chip tone={toneFor(item)}>
                          <span className={s.statusDot} aria-hidden="true" />
                          {statusLabel(item)}
                        </Chip>
                        {item.held && (
                          <small className={s.holdReason}>
                            {item.holdReason === 'data'
                              ? t('Pelepasan data', 'Data release')
                              : t('Tinjauan keselamatan', 'Safety review')}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={s.pathway}>{dispositionLabel(item.asset.plannedDisposition)}</span>
                        <small className={s.pathwayLabel}>
                          {item.status === 'completed'
                            ? t('Hasil akhir', 'Final outcome')
                            : t('Direncanakan', 'Planned')}
                        </small>
                      </td>
                      <td className={s.massColumn}>
                        {number(item.asset.massKg, 2)} <span>kg</span>
                      </td>
                      <td>
                        <Link
                          className={s.inspectLink}
                          to={assetLink(item.asset.id)}
                          aria-label={t(
                            `Lihat ${categoryLabel(item.asset.category)} ${item.asset.id}`,
                            `Inspect ${categoryLabel(item.asset.category)} ${item.asset.id}`,
                          )}
                        >
                          <ArrowRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={s.mobileCards}>
              {visible.map((item) => (
                <article className={s.assetCard} key={item.asset.id}>
                  <div className={s.cardTop}>
                    <Link to={assetLink(item.asset.id)} className={s.itemLink}>
                      <span className={s.thumbnail}>
                        <ItemIllustration category={item.asset.category} />
                      </span>
                      <span>
                        <strong>{categoryLabel(item.asset.category)}</strong>
                        <small>
                          {item.asset.id} · {item.asset.requestId}
                        </small>
                      </span>
                    </Link>
                    <span className={s.cardMass}>{number(item.asset.massKg, 2)} kg</span>
                  </div>
                  <div className={s.cardStatus}>
                    <Chip tone={toneFor(item)}>
                      <span className={s.statusDot} aria-hidden="true" />
                      {statusLabel(item)}
                    </Chip>
                    <span>{conditionLabel(item.asset.condition)}</span>
                  </div>
                  {flags(item)}
                  <div className={s.cardBottom}>
                    <div>
                      <small>
                        {item.status === 'completed'
                          ? t('Hasil akhir', 'Final outcome')
                          : t('Jalur yang direncanakan', 'Planned pathway')}
                      </small>
                      <strong>{dispositionLabel(item.asset.plannedDisposition)}</strong>
                    </div>
                    <Link to={assetLink(item.asset.id)} className={s.mobileInspect}>
                      {t('Lihat', 'Inspect')}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <footer className={s.pagination}>
              <p>
                {t(
                  `${number((page - 1) * PAGE_SIZE + 1)}–${number(Math.min(page * PAGE_SIZE, filtered.length))} dari ${number(filtered.length)} perangkat`,
                  `${number((page - 1) * PAGE_SIZE + 1)}–${number(Math.min(page * PAGE_SIZE, filtered.length))} of ${number(filtered.length)} items`,
                )}
              </p>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => update('page', String(page - 1))}
                  aria-label={t('Halaman sebelumnya', 'Previous page')}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span aria-live="polite">
                  {t(
                    `Halaman ${number(page)} dari ${number(pages)}`,
                    `Page ${number(page)} of ${number(pages)}`,
                  )}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === pages}
                  onClick={() => update('page', String(page + 1))}
                  aria-label={t('Halaman berikutnya', 'Next page')}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <EmptyState
            icon={<Search size={24} />}
            title={t('Belum ada perangkat yang sesuai', 'No matching items')}
            description={
              hasFilters
                ? t(
                    'Coba kata pencarian lain atau hapus filter untuk melihat semua perangkat.',
                    'Try a different search or clear the filters to see every item.',
                  )
                : t(
                    'Perangkat dari permintaan penjemputan akan tampil di sini.',
                    'Items from collection requests will appear here.',
                  )
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  {t('Hapus filter', 'Clear filters')}
                </Button>
              ) : (
                <Link to="/household/request" className="button button--primary">
                  {t('Ajukan penjemputan', 'Request a collection')}
                </Link>
              )
            }
          />
        )}
      </section>
      <div className={s.footnote}>
        <ShieldCheck size={15} aria-hidden="true" />
        <p>
          {t(
            tutorial
              ? 'Status mengikuti posisi perjalanan batch tutorial.'
              : 'Setiap perangkat memiliki tanggal layanan, jalur pemulihan, dan catatan serah terima. Ekspor mengikuti periode dan filter yang dipilih.',
            tutorial
              ? 'Status follows the tutorial batch journey position.'
              : 'Each item has a service date, recovery pathway, and custody record. Exports follow your selected period and filters.',
          )}
        </p>
      </div>
      <span className="sr-only" role="status">
        {downloadNotice ? t('File CSV telah diunduh.', 'Your CSV file has been downloaded.') : ''}
      </span>
    </div>
  );
}

export function HistoricalAssetPage() {
  const { id = '' } = useParams();
  const { t, locale, number, date } = useLocale();
  const [params] = useSearchParams();
  const item = getOperatingAsset(id);
  const back = `/assets?period=${params.get('period') || item?.serviceDate.slice(0, 7) || '2026'}`;
  if (!item)
    return (
      <div className="page-wrap">
        <EmptyState
          title={t('Perangkat tidak ditemukan', 'Item not found')}
          description={t(
            'Periksa ID atau kembali ke daftar perangkat.',
            'Check the ID or return to the asset registry.',
          )}
          action={
            <Link className="button button--secondary" to={back}>
              {t('Daftar perangkat', 'Asset registry')}
            </Link>
          }
        />
      </div>
    );
  const { asset } = item;
  return (
    <div className={`page-wrap ${s.detailPage}`}>
      <Link className={s.backLink} to={back}>
        <ChevronLeft size={16} />
        {t('Daftar perangkat', 'Asset registry')}
      </Link>
      <EntityHeader
        eyebrow={asset.id}
        title={localizedPair(categoryNames, asset.category, locale)}
        subtitle={`${item.batchId} · ${date(item.serviceDate)} · ${item.addressAlias}`}
        action={<Chip tone={toneFor(item)}>{localizedPair(statusNames, effectiveStatus(item), locale)}</Chip>}
      />
      <div className={s.detailGrid}>
        <Card className={s.passport}>
          <div className={s.detailIllustration}>
            <ItemIllustration category={asset.category} />
          </div>
          <h2>{t('Paspor perangkat', 'Asset passport')}</h2>
          <dl>
            {[
              [t('Massa', 'Mass'), `${number(asset.massKg, 2)} kg`],
              [t('Kondisi', 'Condition'), localizedPair(conditions, asset.condition, locale)],
              [t('Permintaan', 'Request'), asset.requestId],
              [
                t('Jalur pemulihan', 'Recovery pathway'),
                localizedPair(dispositionNames, asset.plannedDisposition, locale),
              ],
              [
                t('Pelepasan data', 'Data clearance'),
                !asset.dataBearing
                  ? t('Tidak diperlukan', 'Not required')
                  : item.dataCleared
                    ? t('Selesai', 'Cleared')
                    : t('Menunggu pemeriksaan', 'Awaiting review'),
              ],
              [
                t('Hasil akhir', 'Final outcome'),
                item.completedDate
                  ? localizedPair(dispositionNames, asset.plannedDisposition, locale)
                  : t('Belum tuntas', 'In progress'),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className={s.custody}>
          <h2>{t('Jejak serah terima', 'Custody trail')}</h2>
          <p>
            {t(
              'Dari permintaan menuju pemulihan. Setiap langkah tetap terhubung dengan identitas perangkat.',
              'From request to recovery. Every step stays connected to the asset identity.',
            )}
          </p>
          <ol>
            {item.custodyEvents.map((event, index) => (
              <li key={event.id}>
                <span className={s.stepDot}>{index + 1}</span>
                <div>
                  <strong>{localizedPair(statusNames, event.kind, locale)}</strong>
                  <small>
                    {date(item.serviceDate)} · {event.id}
                  </small>
                </div>
                <CheckCheck size={17} />
              </li>
            ))}
          </ol>
          {item.held && (
            <Chip tone="warning">
              {t('Menunggu tinjauan sebelum langkah berikutnya', 'Awaiting review before the next step')}
            </Chip>
          )}
        </Card>
      </div>
    </div>
  );
}
