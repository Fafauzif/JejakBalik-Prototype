import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  MapPin,
  PackageCheck,
  Play,
  ShieldCheck,
  Truck,
  LockKeyhole,
  Clock3,
  Pause,
  Route,
} from 'lucide-react';
import { Button, Chip } from '../../components/ui';
import GateDialog from '../../components/GateDialog';
import { useLocale } from '../../i18n';
import { snapshotForState, useAppStore, useRequestView, useSnapshot } from '../../state/store';
import {
  partners,
  vehicles,
  world,
  getVehiclePose,
  makeSession,
  LIFECYCLE,
  statusAtLeast,
  type AssetSnapshot,
  type GateId,
  type RouteRecord,
} from '../../domain';
import ItemIllustration from './ItemIllustration';
import { categoryLabels, dispositionLabels, statusLabels, translated } from './labels';
import s from './household.module.css';

const stageDetails: Record<string, [string, string]> = {
  draft: [
    'Lengkapi permintaan sebelum penjemputan dijadwalkan.',
    'Complete the request before a pickup is scheduled.',
  ],
  requested: [
    'Scout meninjau jenis, kondisi, dan kebutuhan penanganan perangkat.',
    'Scout is reviewing item types, condition, and handling needs.',
  ],
  validated: [
    'Rute memeriksa jadwal dan kapasitas kendaraan untuk penjemputan ini.',
    'Rute is checking the service window and vehicle capacity for this pickup.',
  ],
  scheduled: [
    'Jadwal tersedia. Tim menyiapkan penugasan dan daftar perangkat.',
    'The window is confirmed. The team is preparing the assignment and item manifest.',
  ],
  assigned: [
    'Kendaraan mengikuti rute menuju titik penjemputan. Perangkat belum tercatat dijemput.',
    'The vehicle follows its route to the pickup point. These items have not been collected yet.',
  ],
  collected: [
    'Serah terima penjemputan tercatat. Kendaraan membawa perangkat ke pusat konsolidasi.',
    'The pickup handoff is recorded. The vehicle is taking the items to the consolidation hub.',
  ],
  received: [
    'Perangkat diterima di pusat konsolidasi. Pilah menyiapkan pemeriksaan jalur pemulihan.',
    'The hub has received the items. Pilah is preparing their recovery-pathway assessment.',
  ],
  triaged: [
    'Hasil pemeriksaan menentukan jalur berikutnya. Perangkat dengan data menunggu pelepasan yang disetujui.',
    'The assessment determines the next pathway. Data-bearing items need approved release before moving on.',
  ],
  routed: [
    'Jalur pemulihan dan tujuan telah dicatat. Mitra menyiapkan hasil serah terima.',
    'The recovery pathway and destination are recorded. Mitra is preparing the handoff outcome.',
  ],
  completed: [
    'Hasil dan riwayat serah terima tersedia pada catatan setiap perangkat.',
    'Outcomes and custody history are available in each item record.',
  ],
};

function RoutePreview({
  route,
  householdId,
  cursor,
  showVehicle,
}: {
  route?: RouteRecord;
  householdId: string;
  cursor: number;
  showVehicle: boolean;
}) {
  const { t } = useLocale();
  const home = world.households.find((x) => x.id === householdId)?.position ?? [0, 0];
  const pts = route?.path ?? [[0, 0], [home[0], 0], home, [0, home[1]], [0, 0]];
  const xs = pts.map((x) => x[0]),
    ys = pts.map((x) => x[1]);
  const minX = Math.min(-8, ...xs) - 8,
    maxX = Math.max(8, ...xs) + 8,
    minY = Math.min(-8, ...ys) - 8,
    maxY = Math.max(8, ...ys) + 8;
  const p = (x: number, y: number) => [
    25 + ((x - minX) / (maxX - minX)) * 310,
    24 + ((maxY - y) / (maxY - minY)) * 142,
  ];
  const house = p(home[0], home[1]),
    hub = p(0, 0);
  const pose = route && showVehicle ? getVehiclePose(route, cursor) : null;
  const vehiclePosition = pose ? p(pose.position[0], pose.position[1]) : null;
  return (
    <div className={s.mapPreview}>
      <svg
        viewBox="0 0 360 195"
        role="img"
        aria-label={t(
          'Rute penjemputan dari lingkungan ke pusat konsolidasi',
          'Collection route between the neighborhood and consolidation hub',
        )}
      >
        <rect width="360" height="195" rx="12" fill="#E7EBDF" />
        {[35, 90, 145, 200, 255, 310].map((x) => (
          <path key={x} d={`M${x} 0V195`} stroke="#FFFEFA" strokeWidth="11" />
        ))}
        {[30, 85, 140].map((y) => (
          <path key={y} d={`M0 ${y}H360`} stroke="#FFFEFA" strokeWidth="11" />
        ))}
        <path d="M0 169Q80 120 135 178T360 163" fill="none" stroke="#B2CEC5" strokeWidth="14" />
        <polyline
          points={pts.map((point) => p(point[0], point[1]).join(',')).join(' ')}
          fill="none"
          stroke="#2D6753"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {world.households
          .filter((x) => x.active)
          .slice(0, 15)
          .map((x, i) => {
            const pos = p(x.position[0], x.position[1]);
            return pos[0] > 10 && pos[0] < 350 && pos[1] > 10 && pos[1] < 180 ? (
              <rect
                key={x.id}
                x={pos[0]}
                y={pos[1]}
                width={8 + (i % 3)}
                height="11"
                rx="2"
                fill={i % 2 ? '#BDCBB5' : '#D3C8B4'}
              />
            ) : null;
          })}
        <circle cx={house[0]} cy={house[1]} r="10" fill="#FFFEFA" stroke="#2D6753" strokeWidth="3" />
        <path
          d={`M${house[0] - 4} ${house[1] + 3}V${house[1] - 1}L${house[0]} ${house[1] - 4}L${house[0] + 4} ${house[1] - 1}V${house[1] + 3}Z`}
          fill="#2D6753"
        />
        <rect x={hub[0] - 11} y={hub[1] - 10} width="22" height="20" rx="5" fill="#A95135" />
        <path
          d={`M${hub[0] - 6} ${hub[1] + 4}V${hub[1] - 3}H${hub[0] + 6}V${hub[1] + 4}M${hub[0] - 2} ${hub[1] + 4}V${hub[1]}H${hub[0] + 2}V${hub[1] + 4}`}
          fill="none"
          stroke="#FFFEFA"
          strokeWidth="1.5"
        />
        {vehiclePosition && (
          <g transform={`translate(${vehiclePosition[0]} ${vehiclePosition[1]})`}>
            <circle r="13" fill="#FFFEFA" stroke="#2D6753" strokeWidth="2" />
            <path d="M-7-4H2V4H-7ZM2-1H5L8 2V4H2" fill="#2D6753" />
            <circle cx="-4" cy="5" r="2" fill="#25352D" />
            <circle cx="5" cy="5" r="2" fill="#25352D" />
          </g>
        )}
      </svg>
      <div className={s.mapLegend}>
        <span>
          <i />
          {t('Lingkungan Anda', 'Your neighborhood')}
        </span>
        <span className={s.hubLegend}>
          <i />
          {t('Pusat konsolidasi', 'Consolidation hub')}
        </span>
        {vehiclePosition && (
          <span>
            <Truck size={13} />
            {t('Kendaraan', 'Vehicle')}
          </span>
        )}
      </div>
    </div>
  );
}

function OutcomeCard({ item }: { item: AssetSnapshot }) {
  const { t, locale } = useLocale();
  const asset = item.asset;
  const destination = partners.find((x) => x.id === asset.destinationId);
  const complete = item.status === 'completed';
  return (
    <article className={s.outcomeCard}>
      <div className={s.outcomeImage}>
        <ItemIllustration category={asset.category} />
        {complete && (
          <span>
            <Check size={16} />
          </span>
        )}
      </div>
      <div className={s.outcomeContent}>
        <div className={s.outcomeTop}>
          <div>
            <small>{asset.id}</small>
            <h3>{translated(categoryLabels, asset.category, locale)}</h3>
          </div>
          <Chip tone={complete ? 'success' : item.held ? 'warning' : 'neutral'}>
            {complete
              ? t('Selesai', 'Complete')
              : item.deferred
                ? t('Jadwal berikutnya', 'Next window')
                : item.held
                  ? t('Perlu tinjauan', 'Review needed')
                  : t('Dalam proses', 'In progress')}
          </Chip>
        </div>
        <p className={s.outcomePath}>
          {translated(dispositionLabels, asset.plannedDisposition, locale)}
          <ArrowRight size={15} />
          <strong>{destination?.name ?? asset.destinationId}</strong>
        </p>
        <p>
          {complete
            ? t(
                'Perangkat telah menyelesaikan jalur pemulihannya. Riwayat serah terima tersedia di bawah.',
                'This item has completed its recovery pathway. Its custody history is available below.',
              )
            : item.held
              ? item.holdReason === 'data'
                ? t(
                    'Perangkat berada di pusat konsolidasi dan menunggu peninjauan pelepasan data.',
                    'This item is at the consolidation hub, awaiting data-release review.',
                  )
                : t(
                    'Penjemputan ditahan sampai penanganan khusus disetujui.',
                    'Collection remains on hold until specialist handling is approved.',
                  )
              : item.deferred
                ? t(
                    'Perangkat mendapat slot pada jadwal berikutnya. Hasilnya belum dihitung selesai.',
                    'This item has a place in a later window. Its outcome is not yet complete.',
                  )
                : translated(statusLabels, item.status, locale)}
        </p>
        {asset.dataBearing && (
          <div className={`${s.dataStatus} ${item.dataCleared ? s.dataCleared : ''}`}>
            <LockKeyhole size={15} />
            {item.dataCleared
              ? t('Pelepasan data tercatat', 'Data release recorded')
              : t('Gerbang data belum dilewati', 'Data gate pending')}
          </div>
        )}
        <details className={s.evidence}>
          <summary>
            {t('Lihat catatan perangkat', 'View item record')}
            <ChevronDown size={16} />
          </summary>
          <dl>
            <div>
              <dt>{t('Catatan pemrosesan', 'Processing record')}</dt>
              <dd>{asset.scenarioRecordId}</dd>
            </div>
            <div>
              <dt>{t('Tujuan', 'Destination')}</dt>
              <dd>{destination?.name}</dd>
            </div>
            <div>
              <dt>{t('Peristiwa penyelesaian', 'Completion event')}</dt>
              <dd>
                {item.custodyEvents.find((x) => x.kind === 'completed')?.id ??
                  t('Belum tersedia', 'Not available yet')}
              </dd>
            </div>
            {asset.dataBearing && (
              <div>
                <dt>{t('Peristiwa pelepasan data', 'Data-release event')}</dt>
                <dd>
                  {item.custodyEvents.find((x) => x.kind === 'data_cleared')?.id ??
                    t('Belum tersedia', 'Not available yet')}
                </dd>
              </div>
            )}
          </dl>
          <div className={s.eventList}>
            {item.custodyEvents.map((event) => (
              <div key={event.id}>
                <CheckCircle2 size={14} />
                <span>
                  {event.kind === 'data_cleared'
                    ? t('Pelepasan data tercatat', 'Data release recorded')
                    : translated(statusLabels, event.kind, locale)}
                </span>
                <code>{event.id}</code>
              </div>
            ))}
          </div>
          {item.custodyEvents.length === 0 && (
            <p>
              {t(
                'Catatan serah terima muncul ketika perangkat mulai ditangani.',
                'Custody records appear when handling begins.',
              )}
            </p>
          )}
        </details>
      </div>
    </article>
  );
}

export default function RequestTracking() {
  const [gate, setGate] = useState<GateId | null>(null);
  const navigate = useNavigate();
  const params = useParams();
  const { pathname } = useLocation();
  const id = params.id ?? pathname.split('/').filter(Boolean).at(-1) ?? '';
  const { t, locale, date, number } = useLocale();
  const app = useAppStore();
  const view = useRequestView(id);
  const snapshot = useSnapshot();
  if (!view)
    return (
      <div className={s.page}>
        <Link to="/household" className={s.backLink}>
          <ArrowLeft size={16} />
          {t('Rumah tangga', 'Household')}
        </Link>
        <div className={s.notFound}>
          <PackageCheck size={40} />
          <h1>{t('Permintaan tidak ditemukan', 'Request not found')}</h1>
          <p>
            {t(
              'Buka daftar penjemputan untuk memilih permintaan yang tersedia.',
              'Open your pickup list to choose an available request.',
            )}
          </p>
          <Link className={s.primaryLink} to="/household">
            {t('Lihat permintaan', 'View requests')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  const allDone = view.completed === view.total && view.total > 0;
  const anyHeld = view.assets.some((x) => x.held);
  const finishedSome = view.completed > 0 && !allDone;
  const activeForRequest =
    snapshot.batchId === view.batchId && view.windows.some((x) => x.id === snapshot.windowId);
  const outstandingWindow = view.windows.find((w) =>
    view.assets.some((item) => w.assetIds.includes(item.asset.id) && item.status !== 'completed'),
  );
  const window =
    (activeForRequest ? view.windows.find((x) => x.id === snapshot.windowId) : undefined) ??
    outstandingWindow ??
    view.windows[0];
  const scenarioId =
    view.batchId === 'canonical'
      ? app.scenarioId === 'exploration'
        ? 'circular_day'
        : app.scenarioId
      : 'exploration';
  const session = activeForRequest
    ? app.session
    : (app.sessions[`${scenarioId}/${view.batchId}/${window.id}`] ??
      makeSession(scenarioId, view.batchId, window.id));
  const tracking = activeForRequest
    ? snapshot
    : snapshotForState({
        session,
        scenarioId,
        activeBatchId: view.batchId,
        activeWindowId: window.id,
        exploration: app.exploration,
      });
  const windowItems = view.assets.filter((item) => window.assetIds.includes(item.asset.id));
  const unfinished = windowItems.filter((item) => item.status !== 'completed');
  const movingItems = unfinished.filter((item) => !item.held && !item.deferred);
  const focusItem = [...movingItems, ...unfinished, ...windowItems][0];
  const route =
    tracking.routes.find((r) => r.assetIds.includes(focusItem?.asset.id)) ??
    tracking.context.activeRoutes.find((r) => r.assetIds.includes(focusItem?.asset.id));
  const vehicle = vehicles.find((x) => x.id === route?.vehicleId);
  const vehicleLabel = vehicle
    ? locale === 'id'
      ? vehicle.label
      : vehicle.label
          .replace('Van koleksi', 'Collection van')
          .replace('Truk barang besar', 'Large-item truck')
          .replace('Kendaraan penanganan khusus', 'Specialist vehicle')
    : t('Belum ditugaskan', 'Not assigned yet');
  const pending = tracking.pendingCheckpoint;
  const retainedHold =
    unfinished.length > 0 && movingItems.length === 0 && unfinished.some((item) => item.held);
  const awaitingWindow = unfinished.length > 0 && unfinished.every((item) => item.deferred);
  const windowDone = windowItems.length > 0 && unfinished.length === 0;
  const nextWindow = windowDone ? outstandingWindow : undefined;
  const terminal = !nextWindow && (allDone || tracking.cursor >= 180);
  const collected = windowItems.filter((item) => statusAtLeast(item.status, 'collected')).length;
  const atHub = windowItems.filter((item) => ['received', 'triaged'].includes(item.status)).length;
  const completed = windowItems.filter((item) => item.status === 'completed').length;
  const heldCount = windowItems.filter((item) => item.held).length;
  const focusStatus =
    [...movingItems].sort((a, b) => LIFECYCLE.indexOf(a.status) - LIFECYCLE.indexOf(b.status))[0]?.status ??
    focusItem?.status ??
    'requested';
  const stageTitle = pending
    ? pending === 'hero'
      ? t('Permintaan menunggu konfirmasi', 'Request awaiting confirmation')
      : pending === 'specialist'
        ? t('Tinjauan penanganan khusus', 'Specialist handling review')
        : t('Tinjauan pelepasan data', 'Data-release review')
    : windowDone
      ? t('Jadwal ini selesai', 'This window is complete')
      : awaitingWindow
        ? t('Menunggu jadwal berikutnya', 'Awaiting the next window')
        : retainedHold
          ? t('Perangkat tetap ditahan', 'Items remain on hold')
          : translated(statusLabels, focusStatus, locale);
  const stageDetail = pending
    ? t(
        'Jadwal ini berhenti pada titik tinjauan. Buka catatan dan pilih keputusan untuk melanjutkan.',
        'This service window is paused at a review checkpoint. Open the record and choose a decision to continue.',
      )
    : awaitingWindow
      ? t(
          'Kapasitas jadwal ini telah terisi. Perangkat dialokasikan ke jendela layanan berikutnya dan belum memiliki hasil akhir.',
          'This window has reached capacity. The items are allocated to a later service window and have no final outcome yet.',
        )
      : retainedHold
        ? unfinished.every((item) => item.holdReason === 'data')
          ? t(
              'Perangkat tetap di pusat konsolidasi sampai pelepasan datanya disetujui. Hasil pemulihan belum tersedia.',
              'The items remain at the consolidation hub until data release is approved. Recovery outcomes are not available yet.',
            )
          : unfinished.every((item) => item.holdReason === 'safety')
            ? t(
                'Perangkat tetap di alamat penjemputan sampai penanganan khusus disetujui. Hasil pemulihan belum tersedia.',
                'The items remain at the pickup address until specialist handling is approved. Recovery outcomes are not available yet.',
              )
            : t(
                'Perangkat ditahan pada titik keselamatan dan data masing-masing. Hasil akhirnya belum tersedia.',
                'The items remain at their respective safety and data checkpoints. Final outcomes are not available yet.',
              )
        : focusStatus === 'assigned' && route && tracking.cursor < route.startStorySecond
          ? t(
              'Kendaraan masih di pusat konsolidasi. Tim menyiapkan keberangkatan sesuai rute yang ditugaskan.',
              'The vehicle is at the consolidation hub. The team is preparing to depart on its assigned route.',
            )
          : translated(stageDetails, windowDone ? 'completed' : focusStatus, locale);
  const custody = awaitingWindow
    ? t(
        'Belum ada serah terima untuk perangkat pada jadwal berikutnya.',
        'No handoff has occurred for the items allocated to the next window.',
      )
    : heldCount > 0
      ? t(
          `${heldCount} dari ${windowItems.length} perangkat tetap pada tahap aman. Perangkat lain mengikuti catatannya masing-masing.`,
          `${heldCount} of ${windowItems.length} items remain at their safe stage. Other items follow their own records.`,
        )
      : completed === windowItems.length
        ? t('Seluruh serah terima pada jadwal ini tercatat.', 'Every handoff in this window is recorded.')
        : collected === 0
          ? t(
              'Perangkat masih di alamat penjemputan. Belum ada serah terima koleksi.',
              'The items remain at the pickup address. No collection handoff has occurred yet.',
            )
          : atHub > 0
            ? t(
                `${atHub} perangkat berada di pusat konsolidasi untuk pemeriksaan.`,
                `${atHub} ${atHub === 1 ? 'item is' : 'items are'} at the consolidation hub for assessment.`,
              )
            : t(
                `${collected} dari ${windowItems.length} perangkat telah memiliki catatan penjemputan.`,
                `${collected} of ${windowItems.length} items have a collection handoff record.`,
              );
  const nextAction = pending
    ? t('Tinjau keputusan', 'Review decision')
    : nextWindow
      ? t('Ikuti jadwal berikutnya', 'Follow next window')
      : terminal && retainedHold
        ? t('Tinjau penahanan', 'Review hold')
        : t('Tahap berikutnya', 'Next stage');
  const minStage = Math.min(
    ...view.assets.map((x) =>
      [
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
      ].indexOf(x.status),
    ),
  );
  const ordered = [
    'requested',
    'validated',
    'scheduled',
    'assigned',
    'collected',
    'received',
    'triaged',
    'completed',
  ];
  const title = allDone
    ? t('Perjalanan selesai. Nilainya berlanjut.', 'Journey complete. Value carries on.')
    : finishedSome
      ? t('Sebagian selesai, sisanya kami pantau.', 'Some items are complete. We’re tracking the rest.')
      : anyHeld
        ? t('Ada satu langkah untuk ditinjau.', 'One step needs a closer look.')
        : t('Perangkat Anda punya tujuan berikutnya.', 'Your items have somewhere to go next.');
  const start = (windowId = outstandingWindow?.id ?? window?.id) => {
    if (!activeForRequest || app.activeWindowId !== windowId) app.selectBatch(view.batchId, windowId);
    useAppStore.getState().play();
  };
  const activate = () => {
    if (!activeForRequest) app.selectBatch(view.batchId, window.id);
  };
  const review = (reviewGate: GateId) => {
    activate();
    useAppStore.getState().reviewGate(reviewGate);
    if (reviewGate === 'hero') navigate('/household/request?hero=1');
    else setGate(reviewGate);
  };
  const advance = () => {
    if (nextWindow) {
      app.selectBatch(view.batchId, nextWindow.id);
      return;
    }
    if (terminal && retainedHold) {
      review(unfinished.some((item) => item.holdReason === 'safety') ? 'specialist' : 'data');
      return;
    }
    activate();
    const result = useAppStore.getState().advanceNext(view.request.id);
    if (result.gate) {
      if (result.gate === 'hero') navigate('/household/request?hero=1');
      else setGate(result.gate);
    }
  };
  function downloadRecord() {
    const payload = {
      recordType: 'Jejak Balik collection and processing record',
      requestId: view!.request.id,
      addressAlias: view!.request.addressAlias,
      windows: view!.windows,
      completedItems: view!.completed,
      totalItems: view!.total,
      assets: view!.assets.map((x) => ({
        assetId: x.asset.id,
        category: x.asset.category,
        status: x.status,
        disposition: x.asset.plannedDisposition,
        destination: partners.find((p) => p.id === x.asset.destinationId)?.name,
        recordId: x.asset.scenarioRecordId,
        dataCleared: x.dataCleared,
        events: x.custodyEvents,
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${view!.request.id}-collection-record.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className={s.page}>
      <Link to="/household" className={s.backLink}>
        <ArrowLeft size={16} />
        {t('Semua penjemputan', 'All pickups')}
      </Link>
      <header className={s.trackingHeader}>
        <div>
          <p className={s.eyebrow}>
            {view.request.id}{' '}
            <span>
              · {view.batchId === 'canonical' ? t('PENJEMPUTAN JAKARTA', 'JAKARTA COLLECTION') : view.batchId}
            </span>
          </p>
          <h1>{title}</h1>
          <p>
            {allDone
              ? t(
                  'Terima kasih sudah memberi kesempatan baru untuk perangkat Anda.',
                  'Thank you for giving your items a new opportunity.',
                )
              : t(
                  'Ikuti setiap langkah, dari penjemputan hingga hasil pemulihan.',
                  'Follow every step, from pickup to the recovery outcome.',
                )}
          </p>
        </div>
        <Chip tone={allDone ? 'success' : anyHeld ? 'warning' : 'info'}>
          {view.completed} / {view.total}{' '}
          {t('perangkat selesai', view.total === 1 ? 'item complete' : 'items complete')}
        </Chip>
      </header>
      <section
        className={`${s.progressCard} ${s.trackingOverview} ${allDone ? s.progressComplete : ''}`}
        aria-label={t('Progres penjemputan', 'Pickup progress')}
      >
        <div className={s.selectionHeader}>
          <h2>{t('Jejak penjemputan', 'Your collection journey')}</h2>
          {allDone ? <CheckCircle2 size={23} /> : <span>{view.request.id}</span>}
        </div>
        <div className={s.trackingVisualization}>
          <div className={s.routeActivity}>
            <div className={s.routeHeading}>
              <Route size={17} />
              <strong>{t('Rute penjemputan Anda', 'Your collection route')}</strong>
              <span>{date(window.date, { day: 'numeric', month: 'short' })}</span>
            </div>
            <RoutePreview
              route={route}
              householdId={view.request.householdId}
              cursor={tracking.cursor}
              showVehicle={!!route && tracking.routes.some((r) => r.id === route.id)}
            />
            <div className={s.vehicle}>
              <span>
                <Truck size={22} />
              </span>
              <div>
                <strong>{vehicleLabel}</strong>
                <small>
                  {route
                    ? `${route.id} · ${number(route.distanceKm, 1)} km`
                    : t('Penugasan menunggu peninjauan', 'Assignment awaits review')}
                </small>
              </div>
            </div>
          </div>
          <section className={s.liveActivity} aria-label={t('Sedang berlangsung', 'Happening now')}>
            <div className={s.activityHeading}>
              <span className={s.activityLabel}>{t('Sedang berlangsung', 'Happening now')}</span>
              <Chip
                tone={
                  pending || retainedHold
                    ? 'warning'
                    : windowDone
                      ? 'success'
                      : activeForRequest && !app.paused
                        ? 'info'
                        : 'neutral'
                }
              >
                {pending
                  ? t('Perlu keputusan', 'Decision needed')
                  : windowDone
                    ? t('Selesai', 'Complete')
                    : activeForRequest && !app.paused
                      ? t('Berjalan', 'Running')
                      : t('Dijeda', 'Paused')}
              </Chip>
            </div>
            <div className={s.currentActivity} role="status" aria-live="polite" aria-atomic="true">
              <h3>{stageTitle}</h3>
              <p>{stageDetail}</p>
            </div>
            <dl className={s.activityCounts}>
              <div>
                <dt>{t('Dijemput', 'Collected')}</dt>
                <dd>
                  {collected} / {windowItems.length}
                </dd>
              </div>
              <div>
                <dt>{t('Di hub', 'At hub')}</dt>
                <dd>
                  {atHub} / {windowItems.length}
                </dd>
              </div>
              <div>
                <dt>{t('Selesai', 'Complete')}</dt>
                <dd>
                  {completed} / {windowItems.length}
                </dd>
              </div>
            </dl>
            <p className={s.custodyNote}>
              <ShieldCheck size={16} />
              <span>{custody}</span>
            </p>
            <div className={s.playbackControls}>
              <Button
                size="sm"
                variant="secondary"
                disabled={!!pending || terminal || windowDone}
                onClick={() => {
                  if (activeForRequest && !app.paused) app.pause();
                  else start(window.id);
                }}
              >
                {activeForRequest && !app.paused ? <Pause size={15} /> : <Play size={15} />}
                {activeForRequest && !app.paused
                  ? t('Jeda', 'Pause')
                  : tracking.cursor > 0
                    ? t('Lanjutkan', 'Resume')
                    : t('Lihat penjemputan', 'Follow pickup')}
              </Button>
              <label className={s.speedControl}>
                <span>{t('Kecepatan', 'Speed')}</span>
                <select
                  aria-label={t('Kecepatan penjemputan', 'Pickup speed')}
                  value={app.speed}
                  onChange={(event) => app.setSpeed(Number(event.target.value))}
                >
                  {[0.5, 1, 2, 5, 10, 30].map((speed) => (
                    <option key={speed} value={speed}>
                      {number(speed, speed < 1 ? 1 : 0)}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!allDone && (
              <Button className={s.nextStage} onClick={advance} disabled={terminal && !retainedHold}>
                {nextAction}
                <ArrowRight size={16} />
              </Button>
            )}
            {!allDone && (
              <p className={s.nextStageNote}>
                {pending
                  ? t(
                      'Persetujuan tetap dipilih setelah catatan ditinjau.',
                      'Approval is chosen after reviewing the record.',
                    )
                  : nextWindow
                    ? t(
                        'Masih ada perangkat pada jadwal layanan berikutnya.',
                        'Some items are allocated to the next service window.',
                      )
                    : terminal
                      ? t(
                          'Perangkat yang ditahan belum dihitung selesai.',
                          'Held items are not counted as complete.',
                        )
                      : t(
                          'Lanjut langsung ke tahap berikutnya tanpa menunggu waktu berjalan.',
                          'Jump to the next stage without waiting for the clock.',
                        )}
              </p>
            )}
          </section>
        </div>
        <ol className={s.trackingSteps}>
          {ordered.map((status, i) => {
            const stage = [
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
            ].indexOf(status);
            const done = minStage >= stage;
            return (
              <li key={status} className={done ? s.trackingStepDone : ''}>
                <span>{done ? <Check size={12} /> : i + 1}</span>
                <b>{translated(statusLabels, status, locale)}</b>
              </li>
            );
          })}
        </ol>
        <div className={s.trackingActions}>
          <Link to="/network" onClick={() => app.selectBatch(view.batchId, window?.id)}>
            {t('Buka jaringan', 'Open network')}
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <div className={s.trackingLayout}>
        <div>
          {(finishedSome || view.windows.length > 1) && (
            <div className={s.infoNote}>
              <Clock3 size={19} />
              <p>
                {t(
                  'Satu permintaan, beberapa jalur. Permintaan selesai ketika seluruh perangkat mencapai hasil akhirnya.',
                  'One request, several pathways. Your request is complete when every item reaches its final outcome.',
                )}
              </p>
            </div>
          )}
          {anyHeld && (
            <div className={s.warning}>
              <ShieldCheck size={20} />
              <div>
                <strong>
                  {t('Tim perlu meninjau langkah berikutnya.', 'The team needs to review the next step.')}
                </strong>
                <p>
                  {t(
                    'Perangkat tetap berada pada tahap yang aman sampai keputusan penanganan atau pelepasan data tercatat.',
                    'Items remain at their safe stage until the handling or data-release decision is recorded.',
                  )}
                </p>
                <Link to="/team" onClick={() => app.selectBatch(view.batchId, window?.id)}>
                  {t('Buka tinjauan tim', 'Open team review')}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
          <div className={s.selectionHeader}>
            <h2>
              {allDone
                ? t('Hasil perangkat Anda', 'Your item outcomes')
                : t('Perangkat dalam permintaan ini', 'Items in this request')}
            </h2>
            <span>
              {view.total} {t('perangkat', view.total === 1 ? 'item' : 'items')}
            </span>
          </div>
          <div className={s.outcomeList}>
            {view.assets.map((item) => (
              <OutcomeCard key={item.asset.id} item={item} />
            ))}
          </div>
          <button className={s.recordDownload} type="button" onClick={downloadRecord}>
            <Download size={18} />
            <span>
              <strong>{t('Unduh catatan penjemputan', 'Download collection record')}</strong>
              <small>
                {t(
                  'Riwayat perangkat dan peristiwa serah terima · JSON',
                  'Item history and custody events · JSON',
                )}
              </small>
            </span>
            <ArrowRight size={17} />
          </button>
        </div>
        <aside className={s.trackingAside}>
          <section className={s.pickupCard}>
            <div className={s.sectionIcon}>
              <CalendarDays size={20} />
              <h2>{t('Jadwal penjemputan', 'Pickup schedule')}</h2>
            </div>
            {view.windows.map((w) => (
              <div className={s.pickupWindow} key={w.id}>
                <strong>{date(w.date, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                <span>
                  {t('09.00–11.00 WIB', '09:00–11:00 WIB')} ·{' '}
                  {w.assetIds.filter((assetId) => view.request.assetIds.includes(assetId)).length}{' '}
                  {t(
                    'perangkat',
                    w.assetIds.filter((assetId) => view.request.assetIds.includes(assetId)).length === 1
                      ? 'item'
                      : 'items',
                  )}
                </span>
                {view.windows.length > 1 && (
                  <button className={s.textButton} type="button" onClick={() => start(w.id)}>
                    {t('Ikuti jadwal ini', 'Follow this window')}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className={s.addressLine}>
              <MapPin size={17} />
              <span>{view.request.addressAlias}</span>
            </div>
          </section>
          <div className={s.helpCard}>
            <ShieldCheck size={23} />
            <h3>{t('Setiap perangkat, jalur yang tepat.', 'The right pathway for every item.')}</h3>
            <p>
              {t(
                'Perangkat dengan data pribadi dan baterai memiliki langkah peninjauan tersendiri sebelum diproses lebih lanjut.',
                'Items with personal data and batteries have their own review steps before moving forward.',
              )}
            </p>
          </div>
        </aside>
      </div>
      {gate && <GateDialog gate={gate} open={true} onClose={() => setGate(null)} />}
    </div>
  );
}
