import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  LockKeyhole,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Button, Chip } from '../../components/ui';
import GateDialog from '../../components/GateDialog';
import { useLocale } from '../../i18n';
import { useAppStore, useSnapshot } from '../../state/store';
import { useNetworkStore } from '../../state/network-store';
import { useOperatingFrame } from '../../state/use-operating-frame';
import { getLiveTeamActivity } from './liveTeamData';
import { partners, vehicles } from '../../domain';
import type { GateId } from '../../domain/types';
import {
  teamRoster,
  dispositionNames,
  deviceNames,
  statusNames,
  getAgentStatus,
  type TeamId,
} from './teamData';
import styles from './TeamPage.module.css';

export default function TeamPage() {
  const { t, number, date } = useLocale();
  const tutorialSnapshot = useSnapshot();
  const liveFrame = useOperatingFrame();
  const view = useNetworkStore((state) => state.view);
  const livePaused = useNetworkStore((state) => state.livePaused);
  const liveSpeed = useNetworkStore((state) => state.liveSpeed);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const isLive = view === 'live';
  const snapshot = isLive ? liveFrame.snapshot : tutorialSnapshot;
  const activity = getLiveTeamActivity(liveFrame);
  const batchLabel = isLive
    ? t('Beban berjalan', 'Rolling workload')
    : snapshot.batchId === 'canonical'
      ? t('Operasi utama', 'Main operations')
      : snapshot.batchId;
  const [search, setSearch] = useSearchParams();
  const current = search.get('agent');
  const [selected, setSelected] = useState<TeamId>(
    teamRoster.some((a) => a.id === current) ? (current as TeamId) : 'orchestrator',
  );
  const [gate, setGate] = useState<GateId | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inspectorRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const teammate = teamRoster.find((a) => a.id === selected)!;
  const status = isLive ? activity.tasks[selected].status : getAgentStatus(selected, snapshot);
  const m = snapshot.metrics;
  const held = snapshot.assetList.filter((a) => a.held);
  const safety = snapshot.assetList.filter((a) => a.asset.handlingClass === 'specialist');
  const data = snapshot.assetList.filter((a) => a.asset.dataBearing);
  const pending = snapshot.pendingCheckpoint;
  const currentRoute = isLive
    ? snapshot.routes.find((route) => route.id === activity.routeId)
    : snapshot.routes.find(
        (route) => route.startStorySecond <= snapshot.cursor && route.endStorySecond >= snapshot.cursor,
      ) || snapshot.routes[0];
  const liveRoute = liveFrame.routes.find((route) => route.routeId === currentRoute?.id);
  const openTutorial = () => {
    useNetworkStore.getState().setView('tutorial');
    setGate(null);
  };
  const select = (id: TeamId) => {
    setSelected(id);
    setShowAll(false);
    setSearch({ agent: id }, { replace: true });
    if (window.matchMedia('(max-width:1020px)').matches)
      requestAnimationFrame(() => inspectorRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }));
  };
  useEffect(() => {
    if (current && teamRoster.some((a) => a.id === current)) setSelected(current as TeamId);
  }, [current]);
  useEffect(() => {
    document.title = t('Tim operasi · Jejak Balik', 'Operations team · Jejak Balik');
  }, [t]);
  useEffect(() => {
    setGate(null);
  }, [snapshot.scenarioId, snapshot.batchId, snapshot.windowId, view]);
  const openReview = (id: GateId) => {
    if (!isLive) setGate(id);
  };
  const dialogue = isLive
    ? t(...activity.tasks[selected].detail)
    : (() => {
        switch (selected) {
          case 'scout':
            return t(
              `${m.requests} permintaan sudah masuk. Saya cocokkan jenis dan kebutuhan penanganannya.`,
              `${m.requests} requests received. I’m checking device types and handling needs.`,
            );
          case 'route':
            return t(
              `${snapshot.routes.length} rute menjaga perangkat tetap sesuai kendaraan dan jadwalnya.`,
              `${snapshot.routes.length} routes keep devices matched to vehicles and collection windows.`,
            );
          case 'liaison':
            return t(
              'Setiap tujuan menerima manifest yang sesuai kapasitas dan jalur pemulihannya.',
              'Each destination gets a manifest matched to capacity and recovery pathway.',
            );
          case 'triage':
            return t(
              `${m.completedAssets} perangkat telah menyelesaikan jalur pemulihannya.`,
              `${m.completedAssets} devices have completed their recovery pathway.`,
            );
          case 'impact':
            return t(
              'Saya hanya menghitung hasil yang sudah tercatat dalam serah terima.',
              'I count only outcomes supported by the custody record.',
            );
          case 'guardian':
            return held.length
              ? t(
                  `${held.length} perangkat ditahan. Buka tinjauan untuk melihat syarat pelepasannya.`,
                  `${held.length} devices held. Open the review to see release conditions.`,
                )
              : t(
                  'Jalur keselamatan dan data dipantau pada setiap serah terima.',
                  'Safety and data gates are checked at every handoff.',
                );
          default:
            return pending
              ? t(
                  'Ada satu keputusan yang perlu Anda tinjau sebelum pekerjaan terkait berlanjut.',
                  'One decision needs your review before the affected work continues.',
                )
              : t(
                  'Semua rekan menggunakan catatan batch yang sama. Pilih rekan untuk melihat hasil kerjanya.',
                  'Everyone works from the same batch record. Select a teammate to see their work.',
                );
        }
      })();
  const assetsForReview =
    selected === 'guardian'
      ? held
      : selected === 'triage'
        ? snapshot.assetList.filter((a) => ['received', 'triaged', 'routed', 'completed'].includes(a.status))
        : snapshot.assetList;
  const rows = showAll ? assetsForReview : assetsForReview.slice(0, 4);
  const handoffPath: Record<TeamId, string> = {
    scout: 'M115 130 C195 140 195 95 290 110',
    route: 'M290 110 C420 130 505 115 600 155',
    liaison: 'M600 155 C660 240 650 295 585 370',
    triage: 'M585 370 C500 440 235 480 125 468',
    guardian: 'M125 468 C170 390 220 340 305 330',
    impact: 'M305 330 C300 440 370 490 415 525',
    orchestrator: 'M415 525 C250 515 80 300 115 130',
  };
  return (
    <section className={styles.page} aria-label={t('Tim operasi', 'Operations team')}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t('RUANG KERJA TIM', 'TEAM WORKSPACE')}</p>
          <h1>{t('Tujuh rekan. Satu arah.', 'Seven teammates. One purpose.')}</h1>
          <p>
            {t(
              'Dari pintu rumah menuju kesempatan berikutnya. Anda tetap memegang kendali.',
              'From the doorstep to the next opportunity. You stay in control.',
            )}
          </p>
        </div>
        <Link className={styles.headerLink} to="/twin">
          {t('Lihat operasi', 'View operations')}
          <ArrowUpRight size={17} />
        </Link>
      </header>
      <div className={styles.operationToolbar}>
        <div className={styles.viewSwitch} role="group" aria-label={t('Tampilan tim', 'Team view')}>
          <Button
            size="sm"
            variant={isLive ? 'primary' : 'ghost'}
            aria-pressed={isLive}
            onClick={() => useNetworkStore.getState().setView('live')}
          >
            {t('Operasi berjalan', 'Live operations')}
          </Button>
          <Button
            size="sm"
            variant={!isLive ? 'primary' : 'ghost'}
            aria-pressed={!isLive}
            onClick={openTutorial}
          >
            Tutorial
          </Button>
        </div>
        {isLive ? (
          <div className={styles.liveControls}>
            <span className={styles.clockLabel}>
              <span className={styles.liveDot} />
              {livePaused ? t('Dijeda', 'Paused') : t('Operasi berjalan', 'Live operations')}{' '}
              <time>{liveFrame.serviceClock}</time> WIB
            </span>
            <Button
              size="sm"
              variant="secondary"
              icon={livePaused ? <Play size={14} /> : <Pause size={14} />}
              onClick={() => useNetworkStore.getState().toggleLive()}
            >
              {livePaused ? t('Lanjutkan', 'Resume') : t('Jeda', 'Pause')}
            </Button>
            <label className={styles.speedControl}>
              <span id="team-speed-label">{t('Laju operasi', 'Operation speed')}</span>
              <select
                aria-labelledby="team-speed-label"
                value={liveSpeed}
                onChange={(event) => useNetworkStore.getState().setLiveSpeed(Number(event.target.value))}
              >
                {[0.5, 1, 2, 5, 10, 30].map((speed) => (
                  <option key={speed} value={speed}>
                    {number(speed, 1)}×
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className={styles.tutorialContext}>
            {t('Catatan tutorial dan keputusan Anda', 'Tutorial records and your decisions')} · {batchLabel}
          </p>
        )}
      </div>
      <div className={styles.workspace}>
        <section
          ref={canvasRef}
          className={styles.constellation}
          aria-label={t('Pilih rekan tim', 'Select a teammate')}
        >
          <div className={styles.canvasMeta}>
            <span>
              <span className={styles.liveDot} />
              {isLive
                ? t('Pekerjaan tim saat ini', 'Current team activity')
                : t('Tim tutorial', 'Tutorial team')}
            </span>
            <span>
              {batchLabel} · {date(snapshot.serviceDate)}
            </span>
          </div>
          <div
            className={`${styles.canvas} ${isLive ? styles.liveCanvas : ''}`}
            data-live-paused={livePaused}
            data-reduced-motion={reducedMotion}
            data-clock={isLive ? Math.floor(liveFrame.elapsedSeconds) : undefined}
          >
            <svg viewBox="0 0 800 650" className={styles.connections} aria-hidden="true">
              <path d="M115 130 C195 140 195 95 290 110 S420 130 505 115 S630 120 690 210" />
              <path d="M115 130 C80 300 170 380 270 355 S445 265 490 350 S650 360 690 210" />
              <path d="M270 355 C300 440 370 490 400 515 M490 350 C480 440 440 475 400 515 M400 515 C250 515 140 460 110 410" />
              <path
                className={styles.activeLine}
                d={handoffPath[isLive ? activity.handoff[0] : selected]}
                style={
                  isLive && !reducedMotion ? { strokeDashoffset: -liveFrame.elapsedSeconds * 5 } : undefined
                }
              />
            </svg>
            <div className={styles.canvasWatermark} aria-hidden="true">
              jb.
            </div>
            {teamRoster.map((a, index) => {
              const state = isLive ? activity.tasks[a.id].status : getAgentStatus(a.id, snapshot);
              const active = isLive && activity.active.includes(a.id);
              const phase = liveFrame.elapsedSeconds * 1.25 + index * 1.1;
              const moving = isLive && !reducedMotion;
              const characterStyle = {
                '--character-color': a.color,
                '--agent-y': `${moving ? Math.sin(phase) * (active ? 3 : 1.7) : 0}px`,
                '--agent-turn': `${moving ? Math.sin(phase * 0.65) * (active ? 1.5 : 0.65) : 0}deg`,
                '--beacon-opacity': active && moving ? 0.65 + (Math.sin(phase * 2) + 1) * 0.175 : 1,
              } as CSSProperties;
              return (
                <button
                  type="button"
                  key={a.id}
                  className={`${styles.teammate} ${styles[a.id]} ${selected === a.id ? styles.selected : ''} ${active ? styles.working : ''}`}
                  onClick={() => select(a.id)}
                  aria-pressed={selected === a.id}
                  aria-controls="team-artifact"
                  data-team-agent={a.id}
                  style={characterStyle}
                >
                  {isLive && (
                    <span
                      className={`${styles.taskBubble} ${active ? styles.taskBubbleActive : ''}`}
                      aria-hidden={!active}
                      data-team-task={a.id}
                      data-active={active}
                    >
                      <span>
                        {a.name} · {t('Sekarang', 'Now')}
                      </span>
                      <strong>{t(...activity.tasks[a.id].task)}</strong>
                    </span>
                  )}
                  <span className={styles.characterSurface}>
                    <img src={`/agents/${a.image}.webp`} alt="" loading="eager" />
                    <span className={`${styles.beacon} ${state[2] === 'warning' ? styles.warning : ''}`} />
                  </span>
                  <span className={styles.agentText}>
                    <strong data-team-label="name">{a.name}</strong>
                    <span data-team-label="role" className={styles.agentRole}>
                      {t(...a.role)}
                    </span>
                    <small data-team-label="status">{t(state[0], state[1])}</small>
                  </span>
                </button>
              );
            })}
            <div className={styles.teamNote}>
              <Sparkles size={15} />
              <span>{t('Pekerjaan mengikuti arus perangkat.', 'Work follows the flow of devices.')}</span>
            </div>
          </div>
          <nav className={styles.handoff} aria-label={t('Alur serah terima', 'Handoff trail')}>
            <span>{isLive ? t('Serah terima aktif', 'Active handoff') : t('Alur kerja', 'Handoff')}</span>
            {(
              (isLive
                ? ['scout', 'route', 'liaison', 'triage', 'guardian', 'impact', 'orchestrator']
                : ['scout', 'route', 'liaison', 'triage', 'impact']) as TeamId[]
            ).map((id, i) => {
              const a = teamRoster.find((a) => a.id === id)!;
              return (
                <span key={id} className={styles.handoffStep}>
                  {i > 0 && <ArrowRight size={13} />}
                  <button
                    onClick={() => select(id)}
                    className={
                      (isLive ? activity.active.includes(id) : selected === id) ? styles.threadSelected : ''
                    }
                  >
                    {a.name}
                  </button>
                </span>
              );
            })}
          </nav>
        </section>
        <aside
          id="team-artifact"
          ref={inspectorRef}
          className={styles.inspector}
          aria-label={t('Hasil kerja rekan', 'Teammate work artifact')}
        >
          <button
            className={styles.backToTeam}
            onClick={() => canvasRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })}
          >
            {t('← Kembali ke tim', '← Back to the team')}
          </button>
          <div className={styles.inspectorIdentity}>
            <div className={styles.portrait} style={{ backgroundColor: teammate.color + '33' }}>
              <img src={`/agents/${teammate.image}.webp`} alt={teammate.name} />
            </div>
            <div>
              <p className={styles.eyebrow}>{t(...teammate.role)}</p>
              <h2>{teammate.name}</h2>
              <Chip tone={status[2]}>{t(status[0], status[1])}</Chip>
            </div>
          </div>
          {isLive && (
            <div className={styles.currentTask} data-current-team-task={selected}>
              <span>{t('Tugas saat ini', 'Current task')}</span>
              <strong>{t(...activity.tasks[selected].task)}</strong>
            </div>
          )}
          <p className={styles.dialogue}>{dialogue}</p>
          <div className={styles.artifactTitle}>
            <FileText size={16} />
            <h3>{t(...teammate.artifact)}</h3>
            <span>{batchLabel}</span>
          </div>
          {selected === 'orchestrator' && (
            <>
              <div className={styles.miniStats}>
                <div>
                  <strong>{number(m.requests)}</strong>
                  <span>{t('permintaan', 'requests')}</span>
                </div>
                <div>
                  <strong>
                    {number(m.collectedAssets)}/{number(m.batchAssets)}
                  </strong>
                  <span>{t('dijemput', 'collected')}</span>
                </div>
                <div>
                  <strong>{number(m.completedAssets)}</strong>
                  <span>{t('selesai', 'complete')}</span>
                </div>
              </div>
              <ol className={styles.dependencies}>
                {[
                  {
                    done: m.requests > 0,
                    label: t('Permintaan dan jenis perangkat', 'Requests and device types'),
                    detail: t(
                      'Scout menyiapkan kebutuhan penanganan',
                      'Scout prepares handling requirements',
                    ),
                    id: 'scout',
                  },
                  {
                    done: m.collectedAssets > 0,
                    label: t('Penjemputan dan kapasitas', 'Collection and capacity'),
                    detail: t(
                      'Rute dan Mitra menghubungkan serah terima',
                      'Rute and Mitra connect the handoff',
                    ),
                    id: 'route',
                  },
                  {
                    done: m.completedAssets > 0,
                    label: t('Pemilahan dan catatan hasil', 'Triage and outcome records'),
                    detail: t(
                      'Pilah dan Dampak menutup rantai serah terima',
                      'Pilah and Dampak complete the custody trail',
                    ),
                    id: 'triage',
                  },
                ].map((item, i) => (
                  <li key={item.id}>
                    <span className={item.done ? styles.doneMarker : styles.stepMarker}>
                      {item.done ? <Check size={12} /> : i + 1}
                    </span>
                    <button onClick={() => select(item.id as TeamId)}>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </button>
                  </li>
                ))}
              </ol>
              {isLive ? (
                <div className={styles.calmNote}>
                  <ShieldCheck size={17} />
                  <span>
                    {t(
                      'Serah terima berjalan dari catatan periode ini.',
                      'Handoffs follow this period’s records.',
                    )}
                  </span>
                </div>
              ) : pending ? (
                <div className={styles.gateCallout}>
                  <ShieldAlert size={21} />
                  <div>
                    <strong>{t('Keputusan operator diperlukan', 'Operator decision needed')}</strong>
                    <p>
                      {pending === 'hero'
                        ? t(
                            'Konfirmasi permintaan rumah tangga untuk memulai batch lengkap.',
                            'Confirm the household request to start the full batch.',
                          )
                        : pending === 'specialist'
                          ? t(
                              'Tinjau penanganan khusus sebelum penjemputan.',
                              'Review specialist handling before collection.',
                            )
                          : t(
                              'Tinjau pelepasan data sebelum perangkat diteruskan.',
                              'Review data release before devices move onward.',
                            )}
                    </p>
                    {pending === 'hero' ? (
                      <Link to="/household" className={styles.textLink}>
                        {t('Buka permintaan', 'Open request')}
                        <ArrowRight size={15} />
                      </Link>
                    ) : (
                      <Button onClick={() => openReview(pending)}>
                        {t('Tinjau keputusan', 'Review decision')}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.calmNote}>
                  <ShieldCheck size={17} />
                  {t('Tidak ada keputusan tertunda pada tahap ini.', 'No pending decision at this stage.')}
                </div>
              )}
            </>
          )}
          {(selected === 'scout' || selected === 'triage') && (
            <>
              <div className={styles.artifactContext}>
                <span>{t('Masukan', 'Inputs')}</span>
                <p>
                  {selected === 'scout'
                    ? t(
                        'Jenis perangkat, kondisi, jadwal, dan kelas penanganan.',
                        'Device type, condition, pickup window, and handling class.',
                      )
                    : t(
                        'Kondisi saat diterima, kebutuhan data, dan tujuan pemulihan.',
                        'Intake condition, data needs, and recovery destination.',
                      )}
                </p>
              </div>
              <div className={styles.assetList}>
                {rows.map((a) => (
                  <Link
                    key={a.asset.id}
                    to={`/twin?asset=${encodeURIComponent(a.asset.id)}`}
                    className={styles.assetRow}
                  >
                    <span className={styles.deviceIcon}>
                      {a.held ? <LockKeyhole size={17} /> : <FileText size={17} />}
                    </span>
                    <span>
                      <strong>
                        {t(
                          (deviceNames[a.asset.category] || [a.asset.category, a.asset.category])[0],
                          (deviceNames[a.asset.category] || [a.asset.category, a.asset.category])[1],
                        )}{' '}
                        <small>{a.asset.id}</small>
                      </strong>
                      <small>
                        {selected === 'triage'
                          ? t(
                              dispositionNames[a.asset.plannedDisposition][0],
                              dispositionNames[a.asset.plannedDisposition][1],
                            )
                          : t(...statusNames[a.status])}
                        {a.held ? ' · ' + t('Ditahan', 'Held') : ''}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </Link>
                ))}
              </div>
              {!rows.length && (
                <p className={styles.empty}>
                  {t(
                    'Perangkat belum tiba di pemilahan. Ikuti perjalanan dari ruang operasi.',
                    'Devices have not reached triage yet. Follow the journey in operations.',
                  )}
                </p>
              )}
              {assetsForReview.length > 4 && (
                <Button variant="ghost" onClick={() => setShowAll(!showAll)}>
                  {showAll
                    ? t('Tampilkan lebih sedikit', 'Show less')
                    : t(
                        `Lihat ${assetsForReview.length} perangkat`,
                        `View ${assetsForReview.length} devices`,
                      )}
                </Button>
              )}
              <div className={styles.nextHandoff}>
                <span>{t('Serah terima berikutnya', 'Next handoff')}</span>
                <button onClick={() => select(selected === 'scout' ? 'route' : 'impact')}>
                  {selected === 'scout' ? 'Rute' : 'Dampak'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {selected === 'route' && (
            <>
              {currentRoute ? (
                <>
                  <div className={styles.routeSummary}>
                    <Truck size={20} />
                    <div>
                      <strong>{currentRoute.id}</strong>
                      <span>
                        {currentRoute.vehicleId} · {number(currentRoute.distanceKm, 1)} km
                      </span>
                    </div>
                    <Chip tone="info">
                      {isLive ? t('Rute berjalan', 'Active route') : t('Rute gabungan', 'Grouped route')}
                    </Chip>
                  </div>
                  <div className={styles.capacityBar}>
                    <div>
                      <span>
                        {isLive ? t('Muatan saat ini', 'Current load') : t('Muatan rencana', 'Planned load')}
                      </span>
                      <strong>
                        {number(
                          isLive
                            ? (liveFrame.vehicles.find((vehicle) => vehicle.routeId === currentRoute.id)
                                ?.loadKg ?? 0)
                            : currentRoute.loadKg,
                          2,
                        )}{' '}
                        / {vehicles.find((v) => v.id === currentRoute.vehicleId)?.capacityKg ?? '—'} kg
                      </strong>
                    </div>
                    <meter
                      aria-label={
                        isLive
                          ? t('Muatan rute saat ini', 'Current route load')
                          : t('Muatan rencana rute', 'Planned route load')
                      }
                      min={0}
                      max={vehicles.find((v) => v.id === currentRoute.vehicleId)?.capacityKg || 100}
                      value={
                        isLive
                          ? (liveFrame.vehicles.find((vehicle) => vehicle.routeId === currentRoute.id)
                              ?.loadKg ?? 0)
                          : currentRoute.loadKg
                      }
                    />
                  </div>
                  {isLive && liveRoute && (
                    <p className={styles.routeProgress}>
                      {number(liveRoute.collectedAssets)}/{number(currentRoute.assetIds.length)}{' '}
                      {t('dijemput pada putaran ini', 'collected this round')}
                    </p>
                  )}
                  <div className={styles.stops}>
                    {currentRoute.stops.map((stop, i) => (
                      <Link key={`${stop.householdId}-${i}`} to={`/twin?household=${stop.householdId}`}>
                        <span>{i + 1}</span>
                        <div>
                          <strong>
                            {snapshot.requests.find((r) => r.householdId === stop.householdId)
                              ?.addressAlias || stop.householdId}
                          </strong>
                          <small>
                            {stop.householdId} · {stop.assetIds.length} {t('perangkat', 'devices')}
                          </small>
                        </div>
                        <MapPin size={15} />
                      </Link>
                    ))}
                  </div>
                  <Link className={styles.textLink} to={`/twin?route=${currentRoute.id}`}>
                    {t('Ikuti rute', 'Follow route')}
                    <ArrowUpRight size={16} />
                  </Link>
                </>
              ) : (
                <p className={styles.empty}>
                  {t('Belum ada rute pada jendela ini.', 'No route in this window yet.')}
                </p>
              )}
              <div className={styles.nextHandoff}>
                <span>{t('Serah terima berikutnya', 'Next handoff')}</span>
                <button onClick={() => select('liaison')}>
                  Mitra
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {selected === 'liaison' && (
            <>
              <div className={styles.artifactContext}>
                <span>{t('Tujuan dan kapasitas', 'Destinations and capacity')}</span>
                <p>
                  {t(
                    'Kapasitas ditampilkan untuk perangkat pada batch terpilih.',
                    'Capacity shown for devices in the selected batch.',
                  )}
                </p>
              </div>
              {partners.map((p) => {
                const allocated = snapshot.assetList.filter(
                  (a) => a.asset.destinationId === p.id && !a.deferred,
                );
                const complete = allocated.filter((a) => a.status === 'completed').length;
                return (
                  <div className={styles.partner} key={p.id}>
                    <Link to={`/twin?partner=${p.id}`}>
                      <strong>{p.name}</strong>
                      <ArrowUpRight size={15} />
                    </Link>
                    <div>
                      <span>
                        {p.id} · {complete} {t('selesai', 'complete')}
                      </span>
                      <strong>
                        {allocated.length}/{p.capacityAssets}
                      </strong>
                    </div>
                    <meter
                      aria-label={`${p.name} ${t('kapasitas tujuan', 'destination capacity')}`}
                      min={0}
                      max={p.capacityAssets}
                      value={allocated.length}
                    />
                  </div>
                );
              })}
              <div className={styles.nextHandoff}>
                <span>{t('Serah terima berikutnya', 'Next handoff')}</span>
                <button onClick={() => select('triage')}>
                  Pilah
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {selected === 'impact' && (
            <>
              <div className={styles.miniStats}>
                <div>
                  <strong>{number(m.completedAssets)}</strong>
                  <span>{t('hasil selesai', 'completed outcomes')}</span>
                </div>
                <div>
                  <strong>{number(m.valueRetainedAssets)}</strong>
                  <span>{t('kembali berguna', 'returned to use')}</span>
                </div>
              </div>
              {Object.entries(m.completedDispositions).map(([d, n]) => (
                <div className={styles.resultRow} key={d}>
                  <span>
                    {t(
                      dispositionNames[d as keyof typeof dispositionNames][0],
                      dispositionNames[d as keyof typeof dispositionNames][1],
                    )}
                  </span>
                  <strong>{n}</strong>
                </div>
              ))}
              <p className={styles.calmNote}>
                <CheckCircle2 size={17} />
                {t(
                  `${m.completedAssets} dari ${m.collectedAssets} perangkat dijemput memiliki rantai serah terima lengkap.`,
                  `${m.completedAssets} of ${m.collectedAssets} collected devices have a complete custody trail.`,
                )}
              </p>
              <Link to="/impact" className={styles.primaryLink}>
                {t('Buka laporan hasil', 'Open impact report')}
                <ArrowUpRight size={16} />
              </Link>
            </>
          )}
          {selected === 'guardian' && isLive && (
            <>
              <div className={styles.guardSummary}>
                <ShieldCheck size={28} />
                <div>
                  <strong>{t('Riwayat pengamanan tercatat', 'Safeguard history recorded')}</strong>
                  <p>
                    {t(
                      'Prasyarat keselamatan dan data pada serah terima terdahulu tetap terlihat.',
                      'Safety and data prerequisites from earlier handoffs remain visible.',
                    )}
                  </p>
                </div>
              </div>
              <div className={styles.resultRow}>
                <span>{t('Penanganan khusus dalam beban', 'Specialist devices in workload')}</span>
                <strong>{number(safety.length)}</strong>
              </div>
              <div className={styles.resultRow}>
                <span>{t('Catatan pelepasan data', 'Recorded data releases')}</span>
                <strong>
                  {number(m.dataClearedAssets)}/{number(data.length)}
                </strong>
              </div>
              {snapshot.assetList
                .filter((item) => item.asset.dataBearing || item.asset.handlingClass === 'specialist')
                .slice(0, 3)
                .map((item) => (
                  <Link
                    key={item.asset.id}
                    className={styles.assetRow}
                    to={`/network?asset=${item.asset.id}`}
                  >
                    <ShieldCheck size={17} />
                    <span>
                      <strong>{item.asset.id}</strong>
                      <small>
                        {item.dataCleared
                          ? t('Pelepasan data tercatat', 'Data release recorded')
                          : t('Catatan pengamanan serah terima', 'Handoff safeguard record')}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </Link>
                ))}
              <div className={styles.tutorialDecision}>
                <p>
                  {t(
                    'Keputusan baru ditinjau dalam tutorial Anda.',
                    'New decisions are reviewed in your tutorial.',
                  )}
                </p>
                <Button variant="secondary" onClick={openTutorial}>
                  {t('Buka keputusan tutorial', 'Open tutorial decisions')}
                  <ArrowRight size={15} />
                </Button>
              </div>
            </>
          )}
          {selected === 'guardian' && !isLive && (
            <>
              <div className={styles.guardSummary}>
                <ShieldCheck size={28} />
                <div>
                  <strong>
                    {held.length
                      ? `${held.length} ${t('perangkat ditahan', 'devices held')}`
                      : t('Jalur terlindungi', 'Protected pathways')}
                  </strong>
                  <p>
                    {t(
                      'Keselamatan dan data diperiksa secara terpisah.',
                      'Safety and data are reviewed separately.',
                    )}
                  </p>
                </div>
              </div>
              <div className={styles.reviewRow}>
                <div>
                  <strong>{t('Penanganan khusus', 'Specialist handling')}</strong>
                  <small>
                    {safety.length} {t('perangkat dalam batch', 'devices in batch')}
                  </small>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => openReview('specialist')}
                  disabled={!snapshot.context.gates.includes('specialist')}
                >
                  {t('Tinjau', 'Review')}
                </Button>
              </div>
              <div className={styles.reviewRow}>
                <div>
                  <strong>{t('Pelepasan data', 'Data release')}</strong>
                  <small>
                    {m.dataClearedAssets}/{data.length} {t('sudah dilepas', 'cleared')}
                  </small>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => openReview('data')}
                  disabled={!snapshot.context.gates.includes('data')}
                >
                  {t('Tinjau', 'Review')}
                </Button>
              </div>
              {held.slice(0, 4).map((a) => (
                <Link key={a.asset.id} className={styles.assetRow} to={`/twin?asset=${a.asset.id}`}>
                  <LockKeyhole size={17} />
                  <span>
                    <strong>{a.asset.id}</strong>
                    <small>
                      {a.holdReason === 'safety'
                        ? t('Memerlukan persetujuan penanganan khusus', 'Specialist approval required')
                        : t('Memerlukan persetujuan pelepasan data', 'Data-release approval required')}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </Link>
              ))}
            </>
          )}
        </aside>
      </div>
      <div className={styles.footerNote}>
        <ShieldCheck size={16} />
        <span>
          {t(
            'Setiap serah terima memiliki catatan. Setiap keputusan memiliki pemilik.',
            'Every handoff has a record. Every decision has an owner.',
          )}
        </span>
        <Link to="/impact">
          {t('Lihat catatan batch', 'View batch record')}
          <ArrowRight size={14} />
        </Link>
      </div>
      <GateDialog open={!isLive && gate !== null} onClose={() => setGate(null)} gate={gate || 'specialist'} />
    </section>
  );
}
