import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Expand,
  Layers3,
  List,
  MapPin,
  Package,
  Pause,
  Play,
  RotateCcw,
  Route,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
  ZoomIn,
  SkipForward,
} from 'lucide-react';
import { Button, Chip, Dialog, EmptyState, IconButton, Tabs } from '../../components/ui';
import GateDialog from '../../components/GateDialog';
import { useAppStore, useSnapshot } from '../../state/store';
import { useNetworkStore } from '../../state/network-store';
import { getLiveOperationsFrame } from '../../domain/live-operations';
import { PLAYBACK_SPEEDS } from '../../domain/playback';
import { getPartnerStyle } from '../../graphics/partner-styles';
import {
  LiveOverview,
  LiveStatusStrip,
  LiveCadenceBar,
  livePhaseLabel,
  liveVehicleLabel,
} from './LiveOperations';
import { useLocale, categoryNames, statusNames, dispositionNames, localizedPair } from '../../i18n';
import { world, partners, vehicles, catalog } from '../../domain';
import type { GateId } from '../../domain';
import { HUB_ZONES, getHubZoneAssets } from '../../graphics/hub-data';
import './network.css';
import ProgressiveWorldCanvas from '../world/ProgressiveWorldCanvas';
import ProgramLab from '../program/ProgramLab';
import AssistantPanel from '../assistant/AssistantPanel';
const componentLabels: Record<string, [string, string]> = {
  screen: ['Layar', 'Screen'],
  battery: ['Baterai', 'Battery'],
  mainboard: ['Papan utama', 'Mainboard'],
  shell: ['Cangkang', 'Shell'],
  display: ['Panel layar', 'Display'],
  keyboard: ['Papan ketik', 'Keyboard'],
  storage: ['Penyimpanan', 'Storage'],
  antenna: ['Antena', 'Antenna'],
  powerModule: ['Modul daya', 'Power module'],
  connector: ['Konektor', 'Connector'],
  conductor: ['Konduktor', 'Conductor'],
  insulation: ['Isolasi', 'Insulation'],
  motor: ['Motor', 'Motor'],
  controlBoard: ['Papan kontrol', 'Control board'],
  backlight: ['Lampu latar', 'Backlight'],
  stand: ['Dudukan', 'Stand'],
  paperPath: ['Jalur kertas', 'Paper path'],
  drumOrCabinet: ['Tabung dan kabinet', 'Drum and cabinet'],
  protectiveShell: ['Pelindung', 'Protective shell'],
  cells: ['Sel baterai', 'Battery cells'],
};
const stageNames = [
  ['Permintaan', 'Request'],
  ['Validasi', 'Validation'],
  ['Penjadwalan', 'Scheduling'],
  ['Penjemputan', 'Collection'],
  ['Penerimaan', 'Intake'],
  ['Pemeriksaan', 'Triage'],
  ['Penyaluran', 'Routing'],
  ['Hasil', 'Outcome'],
];
export default function NetworkPage() {
  const { t, locale, number, money, date } = useLocale(),
    s = useAppStore(),
    tutorialSnapshot = useSnapshot(),
    navigate = useNavigate();
  const network = useNetworkStore();
  const isLive = network.view === 'live' && !s.journeyActive;
  const frameTime = isLive ? network.elapsedSeconds : 0;
  const liveFrame = useMemo(() => getLiveOperationsFrame(frameTime), [frameTime]);
  const snapshot = isLive ? liveFrame.snapshot : tutorialSnapshot;
  const [params, setParams] = useSearchParams();
  const [localSelection, setLocalSelection] = useState<{ id: string; kind: string } | null>(null),
    [entityTab, setEntityTab] = useState('routes'),
    [listOpen, setListOpen] = useState(false),
    [resetCamera, setResetCamera] = useState(0),
    [roof, setRoof] = useState(false),
    [component, setComponent] = useState<string | null>(null),
    [gate, setGate] = useState<GateId | null>(null),
    [help, setHelp] = useState(false);
  const assetId = params.get('asset'),
    exploded = params.get('explode') === '1',
    asset =
      snapshot.assets[assetId || ''] ||
      (s.sceneMode === 'device' ? snapshot.assets['JB-A036'] || snapshot.assetList[0] : null);
  const selected = assetId
    ? { id: assetId, kind: 'asset' }
    : params.get('route')
      ? { id: params.get('route')!, kind: 'route' }
      : params.get('partner')
        ? { id: params.get('partner')!, kind: 'destination' }
        : params.get('request')
          ? {
              id: snapshot.requests.find((r) => r.id === params.get('request'))?.householdId || '',
              kind: 'household',
            }
          : localSelection;
  const mode = s.sceneMode,
    m = snapshot.metrics;
  useEffect(() => {
    document.title = t('Jaringan Jakarta · Jejak Balik', 'Jakarta network · Jejak Balik');
  }, [t]);
  useEffect(() => {
    if (window.location.hash === '#program-model') {
      const frame = requestAnimationFrame(() =>
        document.getElementById('program-model')?.scrollIntoView({ block: 'start' }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    if (assetId) {
      s.setSceneMode('device');
      setComponent(null);
    } else if (params.get('mode') === 'hub') s.setSceneMode('hub');
    else if (params.get('route') || params.get('partner') || params.get('request')) s.setSceneMode('city');
  }, [params.toString()]);
  useEffect(() => {
    if (isLive && !params.toString()) s.setSceneMode('city');
  }, [isLive, params.toString()]);
  const select = (id: string, kind = 'asset') => {
    if (kind === 'zone') setRoof(false);
    if (kind === 'hub') {
      s.setSceneMode('hub');
      setParams({ mode: 'hub' });
      setLocalSelection(null);
      setListOpen(false);
      return;
    }
    setLocalSelection({ id, kind });
    if (kind === 'asset') {
      setParams({ asset: id });
      s.select({ type: 'asset', id });
      s.setSceneMode('device');
    } else {
      setParams({});
      const type =
        kind === 'destination'
          ? 'partner'
          : kind === 'zone'
            ? 'hub'
            : kind === 'district'
              ? 'household'
              : kind;
      s.select({ type: type as 'household', id });
    }
    setListOpen(false);
    setComponent(null);
  };
  const switchMode = (value: string) => {
    s.setSceneMode(value as 'city');
    setParams(
      value === 'device' ? { asset: asset?.asset.id || 'JB-A036' } : value === 'hub' ? { mode: 'hub' } : {},
    );
    setLocalSelection(null);
  };
  const start = () => {
    network.setView('tutorial');
    s.setScenario('circular_day');
    s.reset();
    s.setJourneyActive(true);
    s.pause();
    navigate('/network');
  };
  const changeView = (view: 'live' | 'tutorial') => {
    s.pause();
    s.setJourneyActive(false);
    network.setView(view);
    s.setSceneMode('city');
    setParams({});
    setLocalSelection(null);
  };
  const label = (map: Record<string, [string, string]>, key: string) => localizedPair(map, key, locale);
  const liveVehicle = isLive
    ? liveFrame.vehicles.find((v) => v.vehicleId === selected?.id || v.routeId === selected?.id)
    : undefined;
  const route =
    (selected?.kind === 'vehicle' ? liveVehicle?.route : undefined) ||
    snapshot.routes.find((r) => r.id === selected?.id || r.vehicleId === selected?.id);
  const household = world.households.find((h) => h.id === selected?.id);
  const request = snapshot.requests.find((r) => r.householdId === household?.id);
  const partner = partners.find((p) => p.id === selected?.id);
  const district = world.districts.find((d) => d.id === selected?.id);
  const zone = HUB_ZONES.find((z) => z.id === selected?.id);
  const currentEvents = snapshot.assetList
    .flatMap((a) => a.custodyEvents.map((e) => ({ ...e, device: a.asset.id })))
    .sort((a, b) => b.atSecond - a.atSecond)
    .slice(0, 4);
  const name =
    asset && mode === 'device'
      ? label(categoryNames, asset.asset.category)
      : route
        ? route.id
        : household?.label ||
          partner?.name ||
          district?.name ||
          (zone && (locale === 'id' ? zone.name : zone.en)) ||
          (mode === 'hub'
            ? t('Pusat Konsolidasi Jakarta', 'Jakarta consolidation hub')
            : isLive
              ? t('Armada di lapangan', 'Fleet in motion')
              : t('Jakarta, bergerak kembali', 'Jakarta, coming full circle'));
  const pending = snapshot.pendingCheckpoint;
  if (assetId && !snapshot.assets[assetId])
    return (
      <div className="page-wrap">
        <EmptyState
          title={t('Perangkat tidak ditemukan', 'Device not found')}
          description={t(
            'ID perangkat ini tidak tersedia dalam batch aktif. Pilih batch yang sesuai di Pengaturan atau buka daftar perangkat.',
            'This device ID is not available in the active batch. Select its batch in Settings or open the asset list.',
          )}
          action={
            <Button onClick={() => navigate('/assets')}>
              {t('Buka daftar perangkat', 'Open asset list')}
            </Button>
          }
        />
      </div>
    );
  return (
    <div
      className={`network-page ${isLive ? 'is-live' : 'is-tutorial'} ${s.journeyActive ? 'is-guided' : ''}`}
      data-operation-mode={isLive ? 'live' : 'tutorial'}
      data-live-elapsed={Math.floor(network.elapsedSeconds)}
      data-story-cursor={Math.floor(s.cursor)}
    >
      <div className="network-heading">
        <div>
          <h1>
            {isLive
              ? t('Elektronik kembali bernilai.', 'Electronics, brought back to value.')
              : t('Kehidupan kedua dimulai di sini.', 'A second life starts here.')}
          </h1>
          <p>
            {isLive
              ? t(
                  'Kampus, kantor, dan komunitas membiayai pengumpulan yang terjadwal dan dapat ditelusuri.',
                  'Campuses, workplaces and communities fund scheduled collection with traceable outcomes.',
                )
              : t(
                  'Dari sudut rumah, kembali memberi manfaat.',
                  'From a corner of your home to a useful new beginning.',
                )}
          </p>
        </div>
        <div className="network-header-actions journey-start-actions">
          <div
            className="network-view-switch"
            role="group"
            aria-label={t('Tampilan jaringan', 'Network view')}
          >
            <button type="button" aria-pressed={isLive} onClick={() => changeView('live')}>
              {t('Jaringan aktif', 'Active network')}
            </button>
            <button type="button" aria-pressed={!isLive} onClick={() => changeView('tutorial')}>
              {t('Skenario keputusan', 'Decision scenario')}
            </button>
          </div>
          {!isLive &&
            s.cursor > 0 &&
            s.cursor < 180 &&
            !s.journeyActive &&
            s.activeBatchId === 'canonical' && (
              <Button
                variant="secondary"
                onClick={() => {
                  s.setJourneyActive(true);
                  s.pause();
                }}
              >
                {t('Lanjutkan panduan', 'Resume journey')}
              </Button>
            )}
          <Button
            variant={isLive ? 'secondary' : 'primary'}
            icon={<Play size={15} fill="currentColor" />}
            onClick={start}
          >
            {t('Ikuti perjalanan', 'Take the journey')}
            <span className="button-duration">5 {t('langkah', 'steps')}</span>
          </Button>
        </div>
      </div>
      <div className="network-wayfinding" aria-label={t('Mulai di sini', 'Start here')}>
        <span>
          {t(
            'Mulai dari satu perangkat, pahami seluruh jaringan.',
            'Start with one device. Understand the whole network.',
          )}
        </span>
        <Link to="/household/request">
          {t('Ajukan penyerahan', 'Create a return')} <ArrowRight size={14} />
        </Link>
        <a href="#program-model">
          {t('Siapa yang membiayai?', 'Who funds it?')} <ArrowRight size={14} />
        </a>
      </div>
      {isLive && <LiveStatusStrip frame={liveFrame} paused={network.livePaused} />}
      <div className="network-workspace">
        <section
          className="world-panel"
          aria-label={t('Jaringan dan tampilan perangkat', 'Network and device views')}
        >
          <div className="world-toolbar">
            <Tabs
              label={t('Tingkat penjelajahan', 'Inspection level')}
              value={mode}
              onChange={switchMode}
              items={[
                { value: 'city', label: t('Kota', 'City') },
                { value: 'hub', label: 'Hub' },
                { value: 'device', label: t('Perangkat', 'Device') },
              ]}
            />
            <div className="world-tools">
              <IconButton
                label={t('Daftar entitas', 'Entity list')}
                onClick={() => setListOpen(!listOpen)}
                aria-expanded={listOpen}
              >
                <List size={18} />
              </IconButton>
              <IconButton
                label={t('Atur ulang kamera', 'Reset camera')}
                onClick={() => setResetCamera((v) => v + 1)}
              >
                <Expand size={17} />
              </IconButton>
              <IconButton label={t('Bantuan navigasi', 'Navigation help')} onClick={() => setHelp(!help)}>
                <CircleHelp size={17} />
              </IconButton>
            </div>
          </div>
          <div className="world-scene">
            <ProgressiveWorldCanvas
              mode={mode}
              snapshot={snapshot}
              routes={snapshot.routes}
              cursor={isLive ? liveFrame.elapsedSeconds : s.cursor}
              liveFrame={isLive ? liveFrame : undefined}
              liveSpeed={network.liveSpeed}
              quality={s.quality}
              selectedId={selected?.id}
              onSelect={select}
              asset={asset}
              exploded={exploded}
              selectedComponent={component}
              onComponentSelect={setComponent}
              focusTarget={selected?.id}
              cameraReset={resetCamera}
              reducedMotion={s.reducedMotion}
              roofVisible={roof}
              language={locale}
              paused={isLive ? network.livePaused : s.paused}
            />
            <div className="world-location">
              <MapPin size={14} />
              <strong>
                {mode === 'city'
                  ? 'Jakarta'
                  : mode === 'hub'
                    ? t('Pusat Konsolidasi', 'Consolidation hub')
                    : asset?.asset.id}
              </strong>
              <span>
                {isLive
                  ? t('Shift bergulir', 'Rolling shift')
                  : date(snapshot.serviceDate, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {mode === 'city' && (
              <div className="world-legend">
                <span>
                  <i className="legend-home" />
                  {t('Rumah', 'Homes')}
                </span>
                <span>
                  <i className="legend-route" />
                  {t('Rute balik', 'Return routes')}
                </span>
                <span>
                  <i className="legend-hub" />
                  Hub
                </span>
              </div>
            )}
            {mode === 'hub' && (
              <Button
                className="scene-bottom-button"
                size="sm"
                variant="secondary"
                icon={<Layers3 size={15} />}
                onClick={() => setRoof(!roof)}
              >
                {roof ? t('Buka potongan hub', 'Open cutaway') : t('Tampilkan atap', 'Show roof')}
              </Button>
            )}
            {mode === 'device' && asset && (
              <Button
                className="scene-bottom-button"
                size="sm"
                variant={exploded ? 'primary' : 'secondary'}
                icon={<Layers3 size={16} />}
                onClick={() => {
                  setParams({ asset: asset.asset.id, ...(!exploded ? { explode: '1' } : {}) });
                  setComponent(null);
                }}
              >
                {exploded ? t('Rakit kembali', 'Reassemble') : t('Pisahkan komponen', 'Explode components')}
              </Button>
            )}
            {help && (
              <div className="scene-help">
                <strong>{t('Jelajahi dari dekat', 'Take a closer look')}</strong>
                <p>
                  {t(
                    'Seret untuk memutar. Gulir atau cubit untuk memperbesar. Pilih penanda atau buka daftar entitas.',
                    'Drag to orbit. Scroll or pinch to zoom. Select a marker or open the entity list.',
                  )}
                </p>
              </div>
            )}
            {listOpen && (
              <div className="entity-drawer">
                <div className="drawer-heading">
                  <strong>{t('Jelajahi jaringan', 'Explore the network')}</strong>
                  <IconButton label={t('Tutup daftar', 'Close list')} onClick={() => setListOpen(false)}>
                    <X size={16} />
                  </IconButton>
                </div>
                <Tabs
                  value={entityTab}
                  onChange={setEntityTab}
                  label={t('Jenis entitas', 'Entity type')}
                  items={[
                    { value: 'routes', label: t('Rute', 'Routes') },
                    { value: 'homes', label: t('Rumah', 'Homes') },
                    { value: 'places', label: t('Tujuan', 'Places') },
                  ]}
                />
                <div className="entity-drawer-list">
                  {entityTab === 'routes' ? (
                    snapshot.routes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          s.setSceneMode('city');
                          select(r.id, 'route');
                        }}
                      >
                        <Truck size={15} />
                        <span>
                          {r.id}
                          <small>
                            {r.assetIds.length} {t('perangkat', 'devices')} · {number(r.distanceKm, 1)} km
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))
                  ) : entityTab === 'homes' ? (
                    world.households.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          s.setSceneMode('city');
                          select(h.id, 'household');
                        }}
                      >
                        <HouseIcon />
                        <span>
                          {h.label}
                          <small>{h.id}</small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          switchMode('hub');
                          setListOpen(false);
                        }}
                      >
                        <Building2 size={16} />
                        <span>
                          {t('Pusat Konsolidasi', 'Consolidation hub')}
                          <small>8 {t('zona kerja', 'working zones')}</small>
                        </span>
                      </button>
                      {partners.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            s.setSceneMode('city');
                            select(p.id, 'destination');
                          }}
                        >
                          <MapPin size={16} />
                          <span>
                            {p.name}
                            <small>
                              {p.capacityAssets} {t('kapasitas perangkat', 'device capacity')}
                            </small>
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="network-metrics">
            <div>
              <span>{t('Permintaan', 'Requests')}</span>
              <strong>
                {number(m.requests)}
                <small> / {snapshot.context.requests.length}</small>
              </strong>
            </div>
            <div>
              <span>{t('Dijemput', 'Collected')}</span>
              <strong>
                {number(m.collectedAssets)}
                <small> / {m.batchAssets}</small>
              </strong>
            </div>
            <div>
              <span>{t('Kembali bermanfaat', 'Recovered')}</span>
              <strong>
                {number(m.completedAssets)}
                <small> {t('perangkat', 'devices')}</small>
              </strong>
            </div>
            <div>
              <span>{t('Massa dijemput', 'Collected mass')}</span>
              <strong>
                {number(m.collectedMassKg, 1)}
                <small> kg</small>
              </strong>
            </div>
          </div>
        </section>
        <Inspector
          live={isLive}
          guided={s.journeyActive}
          key={selected?.id || 'overview'}
          selected={!!selected}
          title={name}
          onClose={() => {
            setParams({});
            setLocalSelection(null);
            s.select(null);
            if (mode === 'device') s.setSceneMode('city');
          }}
        >
          {(!isLive || !!selected || mode !== 'city') && (
            <div className="inspector-heading">
              <span className="eyebrow">
                {mode === 'device'
                  ? t('Paspor perangkat', 'Device passport')
                  : route
                    ? t('Rute penjemputan', 'Collection route')
                    : zone
                      ? t('Zona hub', 'Hub zone')
                      : household
                        ? t('Titik penjemputan', 'Pickup point')
                        : partner
                          ? t('Mitra pemulihan', 'Recovery partner')
                          : mode === 'hub'
                            ? t('Alur pemrosesan', 'Processing flow')
                            : t('Gambaran jaringan', 'Network overview')}
              </span>
              {selected && (
                <IconButton
                  size="sm"
                  label={t('Hapus pilihan', 'Clear selection')}
                  onClick={() => {
                    setParams({});
                    setLocalSelection(null);
                    s.select(null);
                    if (mode === 'device') s.setSceneMode('city');
                  }}
                >
                  <X size={16} />
                </IconButton>
              )}
            </div>
          )}
          <h2>{name}</h2>
          {mode === 'device' && asset ? (
            <>
              <div className="inspector-chips">
                <Chip tone={asset.held ? 'warning' : asset.status === 'completed' ? 'success' : 'neutral'}>
                  {asset.held
                    ? t('Ditahan', 'Held')
                    : asset.deferred
                      ? t('Dijadwalkan ulang', 'Deferred')
                      : label(statusNames, asset.status)}
                </Chip>
                <Chip>{number(asset.asset.massKg, 2)} kg</Chip>
              </div>
              <div className="inspector-facts">
                <div>
                  <span>{t('Kondisi perangkat', 'Device condition')}</span>
                  <strong>{conditionText(asset.asset.condition, t)}</strong>
                </div>
                <div>
                  <span>{t('Penanganan baterai', 'Battery handling')}</span>
                  <strong>
                    {asset.asset.batteryRisk === 'none'
                      ? t('Tidak ada risiko khusus tercatat', 'No special risk recorded')
                      : asset.asset.batteryRisk === 'damaged'
                        ? t('Baterai rusak · jalur khusus', 'Damaged battery · specialist pathway')
                        : t('Penanganan khusus diperlukan', 'Specialist handling required')}
                  </strong>
                </div>
                <div>
                  <span>
                    {asset.status === 'completed'
                      ? t('Hasil tercatat', 'Recorded outcome')
                      : t('Rencana pemulihan', 'Planned pathway')}
                  </span>
                  <strong>{label(dispositionNames, asset.asset.plannedDisposition)}</strong>
                </div>
                <div>
                  <span>{t('Tujuan', 'Destination')}</span>
                  <strong>{partners.find((p) => p.id === asset.asset.destinationId)?.name}</strong>
                </div>
                <div>
                  <span>{t('Perlindungan data', 'Data protection')}</span>
                  <strong>
                    {!asset.asset.dataBearing
                      ? t('Tidak menyimpan data', 'No data storage')
                      : asset.dataCleared
                        ? t('Dilepas setelah tinjauan', 'Released after review')
                        : t('Menunggu pelepasan', 'Awaiting release')}
                  </strong>
                </div>
              </div>
              <p className="triage-rationale">{rationaleText(asset.asset.plannedDisposition, t)}</p>
              {asset.status !== 'completed' && (
                <p className="muted">
                  {t(
                    'Hasil akhir tersedia setelah serah terima pemulihan selesai.',
                    'The final outcome becomes available after the recovery handoff is complete.',
                  )}
                </p>
              )}
              <h3>{t('Komponen', 'Components')}</h3>
              <div className="component-list">
                {asset.asset.components.map((c) => (
                  <button
                    key={c}
                    aria-pressed={component === c}
                    onClick={() => {
                      setComponent(c);
                      setParams({ asset: asset.asset.id, explode: '1' });
                    }}
                  >
                    {component === c ? <Check size={14} /> : <Boxes size={14} />}
                    <span>{componentLabels[c] ? t(...componentLabels[c]) : c}</span>
                  </button>
                ))}
              </div>
              {component && (
                <p className="component-note">
                  {componentLabels[component] ? t(...componentLabels[component]) : component} ·{' '}
                  {t(
                    'Dinilai berdasarkan kondisi untuk pemanfaatan atau pemulihan material.',
                    'Assessed by condition for reuse or material recovery.',
                  )}
                </p>
              )}
              <h3>{t('Catatan serah terima', 'Custody record')}</h3>
              <ol className="custody-list">
                {asset.custodyEvents.length ? (
                  asset.custodyEvents.map((e) => (
                    <li key={e.id}>
                      <span>
                        {isLive
                          ? `${Math.max(0, Math.floor(liveFrame.elapsedSeconds - e.atSecond))} ${t('dtk lalu', 'sec ago')}`
                          : `${Math.round(e.atSecond)}s`}
                      </span>
                      <strong>{eventLabel(e.kind, t)}</strong>
                    </li>
                  ))
                ) : (
                  <li>{t('Menunggu permintaan diajukan.', 'Awaiting request submission.')}</li>
                )}
              </ol>
              {!isLive && (
                <Link className="inspector-link" to={`/household/requests/${asset.asset.requestId}`}>
                  {t('Lihat hasil rumah tangga', 'View household outcome')}
                  <ArrowUpRight size={15} />
                </Link>
              )}
            </>
          ) : route ? (
            <>
              {liveVehicle && (
                <div className="inspector-chips">
                  <Chip tone="success">{livePhaseLabel(liveVehicle.phase, t)}</Chip>
                  <Chip>{liveVehicle.vehicleId}</Chip>
                </div>
              )}
              {liveVehicle && (
                <div className="inspector-facts">
                  <div>
                    <span>{t('Operator mitra', 'Partner operator')}</span>
                    <strong>{t(liveVehicle.profile.operator.id, liveVehicle.profile.operator.en)}</strong>
                  </div>
                  <div>
                    <span>{t('Peran perjalanan', 'Trip role')}</span>
                    <strong>{t(liveVehicle.profile.role.id, liveVehicle.profile.role.en)}</strong>
                  </div>
                  <div>
                    <span>{t('Titik asal', 'Operating origin')}</span>
                    <strong>
                      {t(liveVehicle.profile.origin.label.id, liveVehicle.profile.origin.label.en)}
                    </strong>
                  </div>
                </div>
              )}
              <Chip>
                {route.mode === 'specialist'
                  ? t('Penanganan khusus', 'Specialist handling')
                  : route.mode === 'backhaul'
                    ? t('Perjalanan balik', 'Backhaul')
                    : t('Penjemputan gabungan', 'Grouped collection')}
              </Chip>
              <div className="route-summary">
                <div>
                  <strong>
                    {number(route.distanceKm, 1)}
                    <small> km</small>
                  </strong>
                  <span>{t('Panjang rute', 'Route distance')}</span>
                </div>
                <div>
                  <strong>{route.assetIds.length}</strong>
                  <span>{t('Perangkat', 'Devices')}</span>
                </div>
              </div>
              <p>
                {isLive
                  ? liveVehicleLabel(route.vehicleId, t)
                  : vehicles.find((v) => v.id === route.vehicleId)?.label}{' '}
                · {number(route.loadKg, 2)} kg
              </p>
              {liveVehicle && (
                <p className="muted">
                  {t('Muatan saat ini', 'Current load')}: {liveVehicle.loadAssets} {t('perangkat', 'devices')}{' '}
                  · {number(liveVehicle.loadKg, 2)} kg
                </p>
              )}
              <h3>{t('Urutan pemberhentian', 'Stop sequence')}</h3>
              <ol className="route-stops">
                {route.stops.map((stop, i) => (
                  <li key={stop.householdId}>
                    <span>{i + 1}</span>
                    <button onClick={() => select(stop.householdId, 'household')}>
                      {world.households.find((h) => h.id === stop.householdId)?.label}
                      <small>
                        {stop.assetIds.length} {t('perangkat', 'devices')}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
              <Button variant="secondary" size="sm" onClick={() => select(route.vehicleId, 'vehicle')}>
                {t('Ikuti kendaraan', 'Follow vehicle')}
              </Button>
            </>
          ) : household ? (
            <>
              <Chip>{request?.pickupWindow || t('Titik lingkungan', 'Neighborhood point')}</Chip>
              <p>{request?.addressAlias || household.label}</p>
              {request && (
                <>
                  <h3>{t('Perangkat terdaftar', 'Registered devices')}</h3>
                  <div className="simple-asset-list">
                    {request.assetIds.map((id) => {
                      const a = snapshot.assets[id];
                      return (
                        a && (
                          <button key={id} onClick={() => select(id, 'asset')}>
                            <Smartphone size={17} />
                            <span>
                              {label(categoryNames, a.asset.category)}
                              <small>{id}</small>
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        )
                      );
                    })}
                  </div>
                  {!isLive && (
                    <Link className="inspector-link" to={`/household/requests/${request.id}`}>
                      {t('Buka permintaan', 'Open request')}
                      <ArrowUpRight size={15} />
                    </Link>
                  )}
                </>
              )}
            </>
          ) : zone ? (
            <>
              <p>
                {t(
                  'Antrean saat ini di zona ini. Pilih perangkat untuk melihat catatan dan komponennya.',
                  'Current queue in this zone. Select a device to inspect its history and components.',
                )}
              </p>
              <Chip>
                {getHubZoneAssets(snapshot, zone.id, isLive ? liveFrame : undefined).length} / {zone.capacity}{' '}
                {t('perangkat', 'devices')}
              </Chip>
              <div className="simple-asset-list">
                {getHubZoneAssets(snapshot, zone.id, isLive ? liveFrame : undefined).map((a) => (
                  <button key={a.asset.id} onClick={() => select(a.asset.id, 'asset')}>
                    <Package size={16} />
                    <span>
                      {label(categoryNames, a.asset.category)}
                      <small>{a.asset.id}</small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
              {!getHubZoneAssets(snapshot, zone.id, isLive ? liveFrame : undefined).length && (
                <p className="muted">
                  {t(
                    'Belum ada perangkat di zona ini pada waktu yang dipilih.',
                    'No devices are in this zone at the selected time.',
                  )}
                </p>
              )}
            </>
          ) : partner ? (
            <>
              <span
                className="partner-role-badge"
                style={{
                  background: `${getPartnerStyle(partner.id).color}20`,
                  color: getPartnerStyle(partner.id).ink,
                  borderColor: getPartnerStyle(partner.id).color,
                }}
              >
                <span aria-hidden="true" style={{ background: getPartnerStyle(partner.id).color }} />
                {t(getPartnerStyle(partner.id).role.id, getPartnerStyle(partner.id).role.en)}
              </span>
              <p>{partner.acceptedDispositions.map((d) => label(dispositionNames, d)).join(' · ')}</p>
              <div className="route-summary">
                <div>
                  <strong>
                    {
                      snapshot.assetList.filter(
                        (a) => a.asset.destinationId === partner.id && a.status === 'completed',
                      ).length
                    }
                  </strong>
                  <span>{t('Serah terima selesai', 'Handoffs complete')}</span>
                </div>
                <div>
                  <strong>{partner.capacityAssets}</strong>
                  <span>{t('Kapasitas perangkat', 'Device capacity')}</span>
                </div>
              </div>
              <div className="simple-asset-list">
                {snapshot.assetList
                  .filter((a) => a.asset.destinationId === partner.id)
                  .slice(0, 8)
                  .map((a) => (
                    <button key={a.asset.id} onClick={() => select(a.asset.id, 'asset')}>
                      <Package size={16} />
                      <span>
                        {label(categoryNames, a.asset.category)}
                        <small>
                          {a.asset.id} · {label(statusNames, a.status)}
                        </small>
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  ))}
              </div>
            </>
          ) : district ? (
            <>
              <p>
                {t(
                  'Lingkungan dengan titik penjemputan dan jalur balik yang terhubung.',
                  'A neighborhood with connected pickup points and return routes.',
                )}
              </p>
              <div className="simple-asset-list">
                {world.households
                  .filter((h) => h.districtId === district.id)
                  .map((h) => (
                    <button key={h.id} onClick={() => select(h.id, 'household')}>
                      <HouseIcon />
                      <span>{h.label}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
              </div>
            </>
          ) : mode === 'hub' ? (
            <>
              <p>
                {t(
                  'Delapan zona kerja menjaga setiap perangkat tetap pada jalur yang tepat.',
                  'Eight working zones keep every device on its proper pathway.',
                )}
              </p>
              <div className="hub-zone-list">
                {HUB_ZONES.map((z) => (
                  <button key={z.id} onClick={() => select(z.id, 'zone')}>
                    <span style={{ background: z.color }} />
                    <strong>{locale === 'id' ? z.name : z.en}</strong>
                    <em>{getHubZoneAssets(snapshot, z.id, isLive ? liveFrame : undefined).length}</em>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </>
          ) : isLive ? (
            <LiveOverview frame={liveFrame} select={select} selectedId={selected?.id} />
          ) : (
            <>
              <p>
                {t(
                  'Satu jaringan menghubungkan rumah, rute balik, dan tempat pemulihan. Pilih bagian kota untuk melihat jejaknya.',
                  'One network connects homes, return routes, and recovery destinations. Select a part of the city to follow its story.',
                )}
              </p>
              <div className="network-story-card">
                <img src="/agents/kendali.webp" alt="Kendali" />
                <div>
                  <strong>{t('Setiap langkah tersambung.', 'Every step, connected.')}</strong>
                  <p>
                    {t(
                      'Tim siap menjaga perjalanan perangkat Anda.',
                      'Your team is ready to guide each device home.',
                    )}
                  </p>
                  <Link to="/team">
                    {t('Temui tim', 'Meet the team')}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
              <div className="overview-counts">
                <span>
                  <strong>12</strong>
                  {t('lingkungan', 'neighborhoods')}
                </span>
                <span>
                  <strong>{snapshot.routes.length}</strong>
                  {t('rute terencana', 'planned routes')}
                </span>
                <span>
                  <strong>4</strong>
                  {t('tujuan pemulihan', 'recovery partners')}
                </span>
              </div>
              <h3>{t('Jejak terbaru', 'Recent activity')}</h3>
              <div className="activity-list">
                {currentEvents.length ? (
                  currentEvents.map((e) => (
                    <div key={e.id}>
                      <span className="activity-dot" />
                      <p>
                        <strong>{eventLabel(e.kind, t)}</strong>
                        <small>
                          {e.device} · {Math.round(e.atSecond)}s
                        </small>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    {t(
                      'Jaringan siap. Mulai perjalanan atau jalankan lini waktu.',
                      'The network is ready. Start the journey or play the timeline.',
                    )}
                  </p>
                )}
              </div>
              <Link className="inspector-link" to="/impact">
                {t('Lihat dampak jaringan', 'View network impact')}
                <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </Inspector>
      </div>
      {isLive ? (
        <LiveCadenceBar
          paused={network.livePaused}
          toggle={network.toggleLive}
          frame={liveFrame}
          speed={network.liveSpeed}
          setSpeed={network.setLiveSpeed}
        />
      ) : (
        <section className="timeline-panel" aria-label={t('Lini waktu operasi', 'Operations timeline')}>
          <div className="timeline-top">
            <div className="timeline-actions">
              <IconButton
                label={
                  s.paused ? t('Putar lini waktu', 'Play timeline') : t('Jeda lini waktu', 'Pause timeline')
                }
                variant="primary"
                onClick={s.paused ? s.play : s.pause}
              >
                {s.paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
              </IconButton>
              <strong>
                {Math.floor(s.cursor / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {Math.floor(s.cursor % 60)
                  .toString()
                  .padStart(2, '0')}
              </strong>
              <span>/ 03:00</span>
              <select
                aria-label={t('Kecepatan pemutaran', 'Playback speed')}
                value={s.speed}
                onChange={(e) => s.setSpeed(Number(e.target.value))}
              >
                {PLAYBACK_SPEEDS.map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}×
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                icon={<SkipForward size={15} />}
                onClick={() => {
                  const result = s.advanceNext();
                  if (result.gate === 'hero') navigate('/household/request?hero=1');
                  else if (result.gate) setGate(result.gate);
                }}
              >
                {t('Tahap berikutnya', 'Next stage')}
              </Button>
            </div>
            <div className="timeline-context">
              {pending && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<ShieldCheck size={14} />}
                  onClick={() =>
                    pending === 'hero' ? navigate('/household/request?hero=1') : setGate(pending)
                  }
                >
                  {pending === 'hero'
                    ? t('Lengkapi permintaan', 'Complete request')
                    : t('Keputusan diperlukan', 'Decision required')}
                </Button>
              )}
              <label className="sr-only" htmlFor="scenario">
                {t('Skenario', 'Scenario')}
              </label>
              <select
                id="scenario"
                value={s.scenarioId}
                onChange={(e) => {
                  s.setJourneyActive(false);
                  s.setScenario(e.target.value as 'circular_day');
                  setParams({});
                  setLocalSelection(null);
                }}
              >
                {s.scenarioId === 'exploration' && (
                  <option value="exploration">{t('Batch tambahan', 'Additional batch')}</option>
                )}
                <option value="circular_day">{t('Satu hari sirkular', 'A circular day')}</option>
                <option value="battery_review">{t('Pemeriksaan baterai', 'Battery review')}</option>
                <option value="capacity_shift">{t('Kapasitas & jadwal', 'Capacity & scheduling')}</option>
              </select>
            </div>
          </div>
          <input
            className="timeline-range"
            type="range"
            min={0}
            max={180}
            step={1}
            value={s.cursor}
            onChange={(e) => s.seek(Number(e.target.value))}
            aria-label={t('Waktu operasi dalam detik', 'Operation time in seconds')}
            style={{ '--progress': `${(s.cursor / 180) * 100}%` } as React.CSSProperties}
          />
          <div className="timeline-stages" tabIndex={0} aria-label={t('Tahap lini waktu', 'Timeline stages')}>
            {stageNames.map(([id, en], i) => (
              <span key={en} className={s.cursor >= i * 23 ? 'is-past' : ''}>
                {t(id, en)}
              </span>
            ))}
          </div>
        </section>
      )}
      {!isLive && gate && <GateDialog open={!!gate} onClose={() => setGate(null)} gate={gate} />}
      <div id="program-model">
        <ProgramLab />
      </div>
      <AssistantPanel />
    </div>
  );
}
function HouseIcon() {
  return <Building2 size={16} />;
}
function eventLabel(kind: string, t: (id: string, en: string) => string) {
  const labels: Record<string, [string, string]> = {
    request_submitted: ['Permintaan diterima', 'Request received'],
    validated: ['Perangkat diperiksa', 'Device validated'],
    scheduled: ['Jadwal ditetapkan', 'Pickup scheduled'],
    assigned: ['Kendaraan ditugaskan', 'Vehicle assigned'],
    collected: ['Perangkat dijemput', 'Device collected'],
    received: ['Diterima di hub', 'Received at hub'],
    triaged: ['Pemeriksaan selesai', 'Triage completed'],
    routed: ['Tujuan ditetapkan', 'Destination assigned'],
    completed: ['Pemulihan selesai', 'Recovery completed'],
    data_cleared: ['Pelepasan data disetujui', 'Data release approved'],
  };
  const k = kind.replace('asset_', '');
  return labels[k] ? t(...labels[k]) : t('Catatan serah terima', 'Custody event');
}

function conditionText(condition: string, t: (id: string, en: string) => string) {
  const c: Record<string, [string, string]> = {
    functional: ['Masih berfungsi', 'Still works'],
    needs_review: ['Memerlukan pemeriksaan', 'Needs review'],
    requires_assessment: ['Memerlukan penilaian lanjutan', 'Needs further assessment'],
    repairable: ['Perlu perbaikan', 'Needs repair'],
    worn: ['Berfungsi, kondisi aus', 'Works with wear'],
    parts_only: ['Untuk komponen', 'For parts'],
    nonfunctional: ['Tidak berfungsi', 'Not working'],
    intact: ['Utuh', 'Intact'],
    damaged: ['Rusak atau menggembung', 'Damaged or swollen'],
  };
  return c[condition] ? t(...c[condition]) : condition;
}
function rationaleText(disposition: string, t: (id: string, en: string) => string) {
  const c: Record<string, [string, string]> = {
    reuse: [
      'Fungsi dan kondisi mendukung pemanfaatan kembali setelah pemeriksaan.',
      'Function and condition support reuse after inspection.',
    ],
    repair: [
      'Potensi fungsi dipertahankan melalui perbaikan bagian yang membutuhkan penanganan.',
      'Functional value can be retained by repairing the affected parts.',
    ],
    refurbishment: [
      'Pemulihan kondisi dan pengujian menyeluruh menyiapkan perangkat untuk penggunaan berikutnya.',
      'Condition recovery and full checks prepare the device for its next use.',
    ],
    parts: [
      'Komponen yang masih bernilai dipisahkan untuk mendukung perbaikan perangkat lain.',
      'Usable components can support the repair of other devices.',
    ],
    material: [
      'Perangkat diarahkan ke pemulihan material setelah penilaian kelayakan pemanfaatan.',
      'The device is assigned to material recovery after reuse suitability assessment.',
    ],
    specialist: [
      'Kebutuhan penanganan khusus memerlukan jalur terpisah dan persetujuan keselamatan.',
      'Specialist handling requires a separated pathway and a safety approval.',
    ],
  };
  return t(...c[disposition]);
}

function Inspector({
  children,
  live = false,
  guided = false,
  selected,
  title,
  onClose,
}: {
  children: React.ReactNode;
  live?: boolean;
  guided?: boolean;
  selected: boolean;
  title: string;
  onClose: () => void;
}) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width:760px)').matches);
  const [sheetOpen, setSheetOpen] = useState(selected);
  const { t } = useLocale();
  useEffect(() => {
    const q = window.matchMedia('(max-width:760px)');
    const listener = () => setMobile(q.matches);
    q.addEventListener('change', listener);
    return () => q.removeEventListener('change', listener);
  }, []);
  if (mobile && selected && !guided)
    return (
      <>
        <Button
          className="mobile-open-inspector"
          onClick={() => setSheetOpen(true)}
          icon={<List size={16} />}
        >
          {t('Lihat detail', 'View details')}
        </Button>
        <Dialog
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={title}
          className="mobile-inspector"
        >
          <div className="sheet-handle" />
          <section className={`network-inspector ${live ? 'network-inspector--live' : ''}`}>
            {children}
          </section>
        </Dialog>
      </>
    );
  return (
    <aside
      className={`network-inspector ${live ? 'network-inspector--live' : ''}`}
      aria-label={t('Detail pilihan', 'Selection details')}
    >
      {children}
    </aside>
  );
}
