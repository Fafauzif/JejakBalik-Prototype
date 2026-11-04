import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Download,
  Expand,
  FileText,
  Layers3,
  Leaf,
  ListFilter,
  MapPin,
  Minus,
  Network,
  Package,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Upload,
  UsersRound,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Button, Dialog, IconButton } from '../components/ui';
import { useLocale, categoryNames, localizedPair } from '../i18n';
import { useAppStore } from '../state/store';
import AssistantPanel from '../features/assistant/AssistantPanel';
import {
  addRequest,
  advanceService,
  approvePlan,
  changeScenario,
  createScenario,
  reasonText,
  getPhysicalHoldReason,
} from './model';
import { exportScenario, importScenario, loadScenario, saveScenario } from './persistence';
import type { DeviceCategory, Plan, RecoveryRequest, Scenario, SelectedEntity } from './types';
import './recovery.css';
import { usePlanning } from './usePlanning';
const RecoveryWorld = lazy(() => import('./RecoveryWorld'));
const categoryList: DeviceCategory[] = [
  'phone',
  'laptop',
  'tablet',
  'router',
  'accessories',
  'small_appliance',
  'monitor',
  'printer',
  'large_appliance',
  'battery',
];
const phaseLabels: Record<string, [string, string]> = {
  requested: ['Menunggu rencana', 'Awaiting plan'],
  assigned: ['Dijadwalkan', 'Assigned'],
  collected: ['Dalam perjalanan', 'In transit'],
  received: ['Diterima mitra', 'Received'],
  completed: ['Tuntas', 'Completed'],
};
const explainCodes: Record<string, [string, string]> = {
  budget: ['Anggaran tidak cukup untuk penanganan ini.', 'The budget does not cover this handling.'],
  no_vehicle: ['Tidak ada kendaraan yang sesuai.', 'No compatible vehicle is available.'],
  capacity: ['Kapasitas yang sesuai sudah terpakai.', 'Compatible capacity has been used.'],
  receiver_capacity: ['Kapasitas penerima belum tersedia.', 'Receiving capacity is unavailable.'],
  receiver_closed: [
    'Penerima tidak tersedia pada jendela ini.',
    'The receiver is unavailable in this window.',
  ],
  consent: ['Persetujuan pemilik diperlukan.', 'Owner permission is required.'],
  time_window: ['Jadwal penjemputan tidak cocok.', 'The pickup window is incompatible.'],
  detour: ['Tambahan waktu melampaui batas perjalanan.', 'The additional time exceeds the journey limit.'],
};
function saveDownload(name: string, body: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function RecoveryApp() {
  const { t, locale, money, number } = useLocale();
  const setLocale = useAppStore((s) => s.setLocale);
  const quality = useAppStore((s) => s.quality);
  const setQuality = useAppStore((s) => s.setQuality);
  const [scenario, setScenario] = useState<Scenario>(() => loadScenario() || createScenario());
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const planning = usePlanning(scenario, preferences, selected?.kind === 'request' ? selected.id : null);
  const plan = planning.plan;
  const [worldView, setWorldView] = useState<'city' | 'vehicle' | 'hub' | 'device'>('city');
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [force2D, setForce2D] = useState(false);
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [addOpen, setAddOpen] = useState(false),
    [settings, setSettings] = useState(false),
    [about, setAbout] = useState(false),
    [reset, setReset] = useState(false);
  const [approval, setApproval] = useState<Plan | null>(null),
    [reviewRequest, setReviewRequest] = useState<string | null>(null),
    [mobileInspector, setMobileInspector] = useState(false);
  const [notice, setNotice] = useState(() =>
      scenario.events.length
        ? t(
            'Skenario dipulihkan. Tinjau ulang rencana sebelum melanjutkan layanan.',
            'Scenario restored. Review the plan again before advancing service.',
          )
        : '',
    ),
    [storageError, setStorageError] = useState(false);
  const [guide, setGuide] = useState<number | null>(null);
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(0);
  const [importError, setImportError] = useState('');
  const upload = useRef<HTMLInputElement>(null);
  const addDeviceTrigger = useRef<HTMLButtonElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const location = useLocation(),
    navigate = useNavigate();
  const section =
    location.pathname.startsWith('/requests') ||
    location.pathname.startsWith('/household') ||
    location.pathname.startsWith('/assets')
      ? 'requests'
      : location.pathname.startsWith('/decisions') || location.pathname.startsWith('/team')
        ? 'decisions'
        : location.pathname.startsWith('/results') || location.pathname.startsWith('/impact')
          ? 'results'
          : 'network';
  const select = (entity: SelectedEntity) => {
    setSelected(entity);
    if (window.innerWidth < 900 && entity) setMobileInspector(true);
  };
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('Jejak Balik | Ruang untuk kembali', 'Jejak Balik | Room for the return');
  }, [locale, t]);
  useEffect(() => {
    setStorageError(!saveScenario(scenario));
  }, [scenario]);
  useEffect(() => {
    setPage(0);
  }, [search, filter]);
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = setInterval(() => setTime((v) => Math.min(240, v + 0.25)), 250);
    return () => clearInterval(timer);
  }, [playing, reduced]);
  useEffect(() => {
    if (time >= 240) setPlaying(false);
  }, [time]);
  useEffect(() => {
    setMobileInspector(false);
  }, [section]);
  const announce = (id: string, en: string) => setNotice(t(id, en));
  const update = (mutation: (draft: Scenario) => void, message?: [string, string]) => {
    try {
      setScenario(changeScenario(scenario, mutation));
      setPreferences({});
      if (message) setNotice(t(...message));
    } catch {
      announce(
        'Perubahan belum dapat diterapkan. Tinjau perjalanan yang sedang berlangsung.',
        'This change cannot be applied. Review the journey in progress.',
      );
    }
  };
  const doApprove = () => {
    if (!approval || planning.pending || planning.failed) return;
    try {
      setScenario(approvePlan(scenario, approval));
      setApproval(null);
      setTime(scenario.serviceMinute);
      setPlaying(false);
      announce(
        'Rencana disetujui. Gunakan Lanjutkan layanan untuk mencatat tahap berikutnya.',
        'Plan approved. Use Advance service to record the next stage.',
      );
    } catch {
      setApproval(null);
      announce(
        'Rencana berubah. Tinjau dan setujui usulan terbaru.',
        'The plan changed. Review and approve the latest proposal.',
      );
    }
  };
  const advance = () => {
    try {
      const next = advanceService(scenario);
      setScenario(next);
      setTime(next.serviceMinute);
      if (next === scenario) {
        announce(
          'Tidak ada tahap baru yang dapat dicatat. Tinjau keputusan yang tertunda.',
          'No new stage can be recorded. Review pending decisions.',
        );
        return;
      }
      announce(
        'Tahap layanan diperbarui. Perangkat dengan tinjauan data tetap menunggu.',
        'Service stage updated. Devices awaiting data review remain held.',
      );
    } catch {
      announce('Tinjau rencana sebelum melanjutkan layanan.', 'Review the plan before advancing service.');
    }
  };
  const currentRequest =
    selected?.kind === 'request' ? scenario.requests.find((r) => r.id === selected.id) : null;
  const currentJourney =
    selected?.kind === 'journey' ? scenario.journeys.find((j) => j.id === selected.id) : null;
  const currentReceiver =
    selected?.kind === 'receiver' ? scenario.receivers.find((r) => r.id === selected.id) : null;
  const selectedRoute =
    selected?.kind === 'journey'
      ? plan.routes.find((r) => r.journeyId === selected.id)
      : currentRequest
        ? plan.routes.find((r) => r.requestIds.includes(currentRequest.id))
        : null;
  const selectedAssignment = currentRequest
    ? plan.assignments.find((a) => a.requestId === currentRequest.id)
    : null;
  const candidates = planning.options;
  const outstanding = scenario.requests.filter((r) => r.phase !== 'completed');
  const dataHolds = scenario.requests.filter(
    (r) => r.dataBearing && !r.dataCleared && r.phase === 'received',
  );
  const noConsent = scenario.requests.filter((r) => !r.consent && r.phase === 'requested');
  const physicalHolds = scenario.requests
    .map((request) => ({ request, code: getPhysicalHoldReason(scenario, request) }))
    .filter((entry): entry is { request: RecoveryRequest; code: string } => !!entry.code);
  const rejectionCases = plan.rejections.filter(
    (r) =>
      !noConsent.some((n) => n.id === r.requestId) &&
      !physicalHolds.some((h) => h.request.id === r.requestId),
  );
  const completed = scenario.requests.filter((r) => r.phase === 'completed').length;
  const approved = !!scenario.approvedPlan && scenario.approvedPlan.id === plan.id;
  const phase = (s: string) => phaseLabels[s]?.[locale === 'en' ? 1 : 0] || s;
  const device = (c: string) => localizedPair(categoryNames, c, locale);
  const minute = (m: number) =>
    `${String(9 + Math.floor(m / 60)).padStart(2, '0')}.${String(Math.round(m % 60)).padStart(2, '0')}`;
  const reason = (code: string, detail: string) => {
    const translations: Record<string, [string, string]> = {
      carrier_unavailable: ['Penyedia perjalanan tidak tersedia.', 'The carrier is unavailable.'],
      owner_consent: ['Persetujuan pemilik belum diberikan.', 'Owner permission is not recorded.'],
      handling_incompatible: [
        'Jenis penanganan tidak cocok dengan kendaraan.',
        'Handling requirements do not match this vehicle.',
      ],
      receiver_incompatible: [
        'Tujuan tidak menerima jenis perangkat ini.',
        'The receiver does not accept this device.',
      ],
      receiver_unavailable: ['Tujuan penerima tidak tersedia.', 'The receiver is unavailable.'],
      vehicle_capacity: ['Kapasitas kendaraan tidak cukup.', 'Vehicle capacity is insufficient.'],
      pickup_window: ['Jendela penjemputan tidak terpenuhi.', 'The pickup window cannot be met.'],
      receiver_window: ['Waktu penerimaan tidak terpenuhi.', 'The receiving window cannot be met.'],
      journey_window: ['Perjalanan akan melewati batas waktu.', 'The journey would exceed its time window.'],
      detour_limit: [
        'Tambahan waktu melebihi batas penyedia.',
        'Additional time exceeds the provider limit.',
      ],
      receiver_capacity: ['Kapasitas penerima telah terpakai.', 'Receiving capacity is already committed.'],
      budget: [
        'Anggaran tidak cukup untuk kewajiban tambahan.',
        'The budget does not cover additional obligations.',
      ],
      journey_departed: ['Jendela penjemputan sudah berlalu.', 'The pickup window has already passed.'],
      no_journey: [
        'Belum ada perjalanan yang memenuhi semua syarat.',
        'No journey currently satisfies all requirements.',
      ],
      custody_locked: [
        'Perangkat tetap pada pembawa yang telah menerima serah terima.',
        'The device remains with the carrier that accepted custody.',
      ],
    };
    const match =
      translations[code] || Object.entries(translations).find(([key]) => reasonText(key) === detail)?.[1];
    return (
      match?.[locale === 'en' ? 1 : 0] ||
      explainCodes[code]?.[locale === 'en' ? 1 : 0] ||
      (locale === 'en' ? 'Review the journey constraints.' : detail.replaceAll('_', ' '))
    );
  };
  const providerFor = (id: string) => scenario.providers.find((p) => p.id === id);
  const guideSteps = [
    [
      t('Satu perangkat memulai perjalanan.', 'One device starts the journey.'),
      t(
        'Pilih rumah atau tambahkan perangkat. Setiap permintaan punya kebutuhan yang berbeda.',
        'Select a home or add a device. Every request has different handling needs.',
      ),
    ],
    [
      t('Temukan perjalanan yang sudah ada.', 'Find a journey already happening.'),
      t(
        'Pilih perangkat lalu bandingkan pilihan. Rute putus-putus menunjukkan perjalanan awal.',
        'Select a device and compare options. The dashed route shows the original journey.',
      ),
    ],
    [
      t('Tinjau sebelum menjanjikan penjemputan.', 'Review before promising a pickup.'),
      t(
        'Lihat tambahan jarak, biaya, kapasitas penerima, dan perangkat yang belum terlayani.',
        'Check additional distance, cost, receiving capacity, and requests still unserved.',
      ),
    ],
    [
      t('Ubah keadaan. Lihat responsnya.', 'Change the conditions. See the response.'),
      t(
        'Nonaktifkan kendaraan atau kurangi kapasitas penerima. Pilihan dihitung kembali.',
        'Disable a vehicle or reduce receiving capacity. The options are recalculated.',
      ),
    ],
    [
      t('Ikuti sampai serah terima.', 'Follow through to the handoff.'),
      t(
        'Setujui rencana, lanjutkan tahap layanan, lalu tinjau catatan dan kewajiban yang tersisa.',
        'Approve the plan, advance service, and review records and remaining obligations.',
      ),
    ],
  ];
  const startGuide = () => {
    setGuide(0);
    navigate('/network');
    setPlaying(false);
    setSelected({ kind: 'request', id: scenario.requests[0]?.id });
  };
  const nextGuide = () => {
    if (guide === null || planning.pending) return;
    if (guide >= 4) {
      setGuide(null);
      return;
    }
    setGuide(guide + 1);
    if (guide === 0) {
      const r = scenario.requests.find((r) => r.category === 'laptop') || scenario.requests[0];
      setSelected({ kind: 'request', id: r.id });
    }
    if (guide === 1) setApproval(plan);
  };
  const nav = [
    ['/network', t('Jaringan', 'Network'), Network],
    ['/requests', t('Permintaan', 'Requests'), Package],
    ['/decisions', t('Keputusan', 'Decisions'), ClipboardCheck],
    ['/results', t('Hasil', 'Results'), Leaf],
  ] as const;
  const title =
    section === 'requests'
      ? t('Setiap perangkat punya tujuan.', 'Every device has a destination.')
      : section === 'decisions'
        ? t('Keputusan yang menggerakkan layanan.', 'Decisions that move the service.')
        : section === 'results'
          ? t('Lihat apa yang berubah.', 'See what changes.')
          : t('Perjalanan pulang, punya ruang.', 'The return journey has room.');
  const queryRequests = scenario.requests.filter(
    (r) =>
      (filter === 'all' ||
        (filter === 'unassigned'
          ? !plan.assignments.some((a) => a.requestId === r.id)
          : r.phase === filter)) &&
      `${r.id} ${r.label} ${r.neighborhood} ${device(r.category)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const exportCSV = () => {
    const rows = [
      [
        'source',
        'request_id',
        'device',
        'category',
        'phase',
        'journey',
        'receiver',
        'mass_kg',
        'consent',
        'data_cleared',
      ],
      ...scenario.requests.map((r) => [
        'fictional_scenario',
        r.id,
        r.label,
        r.category,
        r.phase,
        plan.assignments.find((a) => a.requestId === r.id)?.journeyId || '',
        r.receiverId,
        r.massKg,
        r.consent,
        r.dataCleared,
      ]),
    ];
    const enc = (v: unknown) =>
      '"' +
      String(v)
        .replaceAll('"', '""')
        .replace(/^[=+@-]/, "'$&") +
      '"';
    saveDownload(
      'JejakBalik_requests.csv',
      '\uFEFF' + rows.map((r) => r.map(enc).join(',')).join('\r\n'),
      'text/csv;charset=utf-8',
    );
  };
  const inspector = (modal = false): ReactNode => (
    <div className="recovery-inspector-inner">
      <div className="recovery-inspector-top">
        <span>{t('Pilihan Anda', 'Your selection')}</span>
        {!modal && (
          <IconButton label={t('Tutup pilihan', 'Clear selection')} onClick={() => setSelected(null)}>
            <X size={17} />
          </IconButton>
        )}
      </div>
      {currentRequest ? (
        <>
          <div className="recovery-object-icon">
            <Package size={27} />
          </div>
          <p className="recovery-id">{currentRequest.id}</p>
          <h2>{currentRequest.label}</h2>
          <p className="recovery-muted">
            {device(currentRequest.category)} · {currentRequest.neighborhood}
          </p>
          <span className={`recovery-status status-${currentRequest.phase}`}>
            {phase(currentRequest.phase)}
          </span>
          <div className="recovery-object-facts">
            <span>
              {t('Bobot', 'Mass')}
              <b>{number(currentRequest.massKg, 1)} kg</b>
            </span>
            <span>
              {t('Jendela', 'Window')}
              <b>
                {minute(currentRequest.window[0])}-{minute(currentRequest.window[1])}
              </b>
            </span>
          </div>
          <details className="recovery-edit-conditions">
            <summary>{t('Ubah jendela pengumpulan', 'Edit collection window')}</summary>
            <div className="recovery-input-pair">
              <label>
                {t('Mulai (menit dari 09.00)', 'Start (minutes from 09:00)')}
                <input
                  type="number"
                  min="0"
                  max={currentRequest.window[1] - 1}
                  step="5"
                  disabled={['collected', 'received', 'completed'].includes(currentRequest.phase)}
                  value={currentRequest.window[0]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0 && n < currentRequest.window[1])
                      update((d) => {
                        const r = d.requests.find((r) => r.id === currentRequest.id);
                        if (r) r.window[0] = n;
                      });
                  }}
                />
              </label>
              <label>
                {t('Selesai (menit dari 09.00)', 'End (minutes from 09:00)')}
                <input
                  type="number"
                  min={currentRequest.window[0] + 1}
                  max="240"
                  step="5"
                  disabled={['collected', 'received', 'completed'].includes(currentRequest.phase)}
                  value={currentRequest.window[1]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n <= 240 && n > currentRequest.window[0])
                      update((d) => {
                        const r = d.requests.find((r) => r.id === currentRequest.id);
                        if (r) r.window[1] = n;
                      });
                  }}
                />
              </label>
            </div>
          </details>
          <div className="recovery-inline-actions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setWorldView('device');
                setMobileInspector(false);
              }}
            >
              {t('Lihat perangkat', 'Inspect device')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setWorldView('hub');
                setMobileInspector(false);
              }}
            >
              {t('Lihat penerima', 'Inspect receiver')}
              <ArrowUpRight size={14} />
            </Button>
          </div>
          {currentRequest.dataBearing && !currentRequest.dataCleared && (
            <div className="recovery-warning">
              <ShieldCheck size={17} />
              <span>
                {t(
                  'Tinjauan data diperlukan sebelum penanganan akhir.',
                  'Data review is required before final disposition.',
                )}
              </span>
            </div>
          )}
          {getPhysicalHoldReason(scenario, currentRequest) && (
            <div className="recovery-warning">
              <Truck size={17} />
              <span>
                {t(
                  'Penyelesaian logistik tertunda. Perangkat tetap pada pembawa yang telah menerima serah terima.',
                  'Logistics resolution is pending. The device remains with its recorded custodian.',
                )}
              </span>
            </div>
          )}
          <div className="recovery-divider" />
          <h3>{t('Perjalanan yang sesuai', 'Journey options')}</h3>
          <p className="recovery-small">
            {t(
              'Tambahan jarak dan biaya seluruh rute gabungan jika pilihan ini digunakan.',
              'Additional travel and cost for the complete grouped route with this option.',
            )}
          </p>
          {planning.pending && (
            <p role="status" className="recovery-small">
              {t('Menghitung pilihan untuk perangkat ini…', 'Calculating options for this device…')}
            </p>
          )}
          <div className="recovery-options" aria-busy={planning.pending}>
            {(planning.pending ? [] : candidates).map((o) => {
              const j = scenario.journeys.find((j) => j.id === o.journeyId);
              const p = j && providerFor(j.providerId);
              return (
                <button
                  key={o.journeyId}
                  disabled={!o.feasible || planning.pending || planning.failed}
                  className={`recovery-option ${selectedAssignment?.journeyId === o.journeyId ? 'chosen' : ''}`}
                  onClick={() => {
                    setPreferences((v) => ({ ...v, [currentRequest.id]: o.journeyId }));
                    announce(
                      'Pilihan dipratinjau. Tinjau rencana sebelum menyetujui.',
                      'Option previewed. Review the plan before approval.',
                    );
                  }}
                >
                  <span className="recovery-option-heading">
                    <i style={{ background: p?.color }} />
                    <b>{j?.name || o.journeyId}</b>
                    {selectedAssignment?.journeyId === o.journeyId && <Check size={15} />}
                  </span>
                  {o.feasible ? (
                    <span className="recovery-option-meta">
                      +{number(o.addedKm, 1)} km{' '}
                      <span>
                        +{number(o.addedMinutes, 0)} {t('mnt', 'min')}
                      </span>
                      <strong>{money(o.costIdr)}</strong>
                    </span>
                  ) : (
                    <small>{reason(o.reason, o.reason)}</small>
                  )}
                </button>
              );
            })}
          </div>
          {!planning.pending && !planning.failed && !candidates.some((o) => o.feasible) && (
            <p className="recovery-warning">
              {t(
                'Belum ada pilihan dalam kondisi saat ini. Ubah jendela, kapasitas, atau anggaran.',
                'No option fits current conditions. Change the window, capacity, or budget.',
              )}
            </p>
          )}
          {selectedAssignment && (
            <div className="recovery-receiver-line">
              <MapPin size={16} />
              <div>
                <span>{t('Penerima', 'Receiver')}</span>
                <strong>
                  {scenario.receivers.find((r) => r.id === selectedAssignment.receiverId)?.name}
                </strong>
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setReviewRequest(currentRequest.id);
              setMobileInspector(false);
            }}
          >
            {t('Tinjau persetujuan & data', 'Review permission & data')}
          </Button>
          <div className="recovery-custody">
            <h3>{t('Jejak serah terima', 'Custody trail')}</h3>
            {scenario.events.filter((e) => e.requestId === currentRequest.id).length ? (
              scenario.events
                .filter((e) => e.requestId === currentRequest.id)
                .map((e) => (
                  <div key={e.id}>
                    <span />
                    <p>
                      <b>{phase(e.kind === 'approved' ? 'assigned' : e.kind)}</b>
                      <small>
                        {minute(e.atMinute)} WIB · {e.actor}
                      </small>
                    </p>
                  </div>
                ))
            ) : (
              <p className="recovery-small">
                {t('Catatan muncul setelah rencana disetujui.', 'Records appear after plan approval.')}
              </p>
            )}
          </div>
        </>
      ) : currentJourney ? (
        <>
          <div
            className="recovery-object-icon"
            style={{ color: providerFor(currentJourney.providerId)?.color }}
          >
            <Truck size={30} />
          </div>
          <p className="recovery-id">{currentJourney.id}</p>
          <h2>{currentJourney.name}</h2>
          <p className="recovery-muted">{providerFor(currentJourney.providerId)?.name}</p>
          <span
            className={`recovery-status ${currentJourney.available ? 'status-completed' : 'status-requested'}`}
          >
            {currentJourney.available ? t('Tersedia', 'Available') : t('Tidak tersedia', 'Unavailable')}
          </span>
          <div className="recovery-object-facts">
            <span>
              {t('Kapasitas bobot', 'Mass capacity')}
              <b>{number(currentJourney.capacityKg)} kg</b>
            </span>
            <span>
              {t('Ruang perangkat', 'Device capacity')}
              <b>
                {currentJourney.capacitySlots} {t('slot', 'slots')}
              </b>
            </span>
            <span>
              {t('Mulai', 'Starts')}
              <b>{minute(currentJourney.startMinute)}</b>
            </span>
            <span>
              {t('Batas tambahan', 'Extra-time limit')}
              <b>
                {currentJourney.maxExtraMinutes} {t('mnt', 'min')}
              </b>
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setWorldView('vehicle');
              setMobileInspector(false);
            }}
          >
            {t('Periksa kendaraan', 'Inspect vehicle')}
            <Expand size={15} />
          </Button>
          <div className="recovery-divider" />
          <h3>{t('Rencana perjalanan', 'Journey plan')}</h3>
          <dl className="recovery-detail-list">
            <div>
              <dt>{t('Perjalanan awal', 'Original journey')}</dt>
              <dd>{number(selectedRoute?.originalKm || 0, 1)} km</dd>
            </div>
            <div>
              <dt>{t('Tambahan jarak', 'Added distance')}</dt>
              <dd>+{number(selectedRoute?.addedKm || 0, 1)} km</dd>
            </div>
            <div>
              <dt>{t('Tambahan waktu', 'Added time')}</dt>
              <dd>
                +{number(selectedRoute?.addedMinutes || 0, 0)} {t('mnt', 'min')}
              </dd>
            </div>
            <div>
              <dt>{t('Perangkat terjadwal', 'Assigned devices')}</dt>
              <dd>{selectedRoute?.requestIds.length || 0}</dd>
            </div>
            <div>
              <dt>{t('Kompensasi perjalanan', 'Journey compensation')}</dt>
              <dd>{money(selectedRoute?.driverPaymentIdr || 0)}</dd>
            </div>
          </dl>
          <label className="recovery-range">
            {t('Batas tambahan waktu', 'Additional time limit')}{' '}
            <b>
              {currentJourney.maxExtraMinutes} {t('mnt', 'min')}
            </b>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={currentJourney.maxExtraMinutes}
              disabled={scenario.serviceMinute > currentJourney.startMinute}
              onChange={(e) =>
                update((d) => {
                  const j = d.journeys.find((j) => j.id === currentJourney.id);
                  if (j) j.maxExtraMinutes = Number(e.target.value);
                })
              }
            />
          </label>
          <details className="recovery-edit-conditions">
            <summary>{t('Kapasitas & kompensasi', 'Capacity & compensation')}</summary>
            <p className="recovery-small">
              {scenario.serviceMinute > currentJourney.startMinute
                ? t(
                    'Perjalanan sudah berangkat. Kondisi muatan tidak dapat diubah.',
                    'The journey has departed. Load conditions cannot be changed.',
                  )
                : t(
                    'Perubahan menghitung ulang usulan sebelum perjalanan dimulai.',
                    'Changes recalculate the proposal before departure.',
                  )}
            </p>
            <div className="recovery-input-pair">
              <label>
                {t('Kapasitas (kg)', 'Capacity (kg)')}
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  disabled={scenario.serviceMinute > currentJourney.startMinute}
                  value={currentJourney.capacityKg}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0 && n <= 1000)
                      update((d) => {
                        const j = d.journeys.find((j) => j.id === currentJourney.id);
                        if (j) j.capacityKg = n;
                      });
                  }}
                />
              </label>
              <label>
                {t('Slot perangkat', 'Device slots')}
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  disabled={scenario.serviceMinute > currentJourney.startMinute}
                  value={currentJourney.capacitySlots}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 0 && n <= 200)
                      update((d) => {
                        const j = d.journeys.find((j) => j.id === currentJourney.id);
                        if (j) j.capacitySlots = n;
                      });
                  }}
                />
              </label>
            </div>
            <label className="recovery-number-label">
              {t('Kompensasi per menit tambahan (Rp)', 'Compensation per added minute (Rp)')}
              <input
                type="number"
                min="0"
                max="100000"
                step="100"
                disabled={scenario.serviceMinute > currentJourney.startMinute}
                value={currentJourney.perMinuteIdr}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0 && n <= 100000)
                    update((d) => {
                      const j = d.journeys.find((j) => j.id === currentJourney.id);
                      if (j) j.perMinuteIdr = n;
                    });
                }}
              />
            </label>
          </details>
          <Button
            variant={currentJourney.available ? 'secondary' : 'primary'}
            onClick={() =>
              update(
                (d) => {
                  const j = d.journeys.find((j) => j.id === currentJourney.id);
                  if (j) j.available = !j.available;
                },
                [
                  'Ketersediaan berubah. Rencana dihitung kembali.',
                  'Availability changed. The plan has been recalculated.',
                ],
              )
            }
          >
            {currentJourney.available
              ? t('Batalkan perjalanan ini', 'Cancel this journey')
              : t('Aktifkan perjalanan', 'Enable journey')}
          </Button>
          <div className="recovery-manifest">
            {selectedRoute?.requestIds.map((id) => {
              const r = scenario.requests.find((r) => r.id === id)!;
              return (
                <button key={id} onClick={() => select({ kind: 'request', id })}>
                  <Package size={15} />
                  <span>{r?.label || id}</span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
        </>
      ) : currentReceiver ? (
        <>
          <div className="recovery-object-icon">
            <Layers3 size={30} />
          </div>
          <p className="recovery-id">{currentReceiver.id}</p>
          <h2>{currentReceiver.name}</h2>
          <p className="recovery-muted">
            {currentReceiver.kind === 'reuse'
              ? t('Pemeriksaan & penggunaan kembali', 'Inspection & reuse')
              : currentReceiver.kind === 'material'
                ? t('Pemulihan material', 'Material recovery')
                : t('Penanganan khusus', 'Specialist handling')}
          </p>
          <div className="recovery-object-facts">
            <span>
              {t('Kapasitas', 'Capacity')}
              <b>
                {currentReceiver.capacitySlots} {t('slot', 'slots')}
              </b>
            </span>
            <span>
              {t('Jendela penerimaan', 'Receiving window')}
              <b>
                {minute(currentReceiver.window[0])}-{minute(currentReceiver.window[1])}
              </b>
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setWorldView('hub');
              setMobileInspector(false);
            }}
          >
            {t('Masuk ke fasilitas', 'Inspect facility')}
            <ArrowUpRight size={15} />
          </Button>
          <label className="recovery-range">
            {t('Kapasitas penerimaan', 'Receiving capacity')} <b>{currentReceiver.capacitySlots}</b>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={currentReceiver.capacitySlots}
              onChange={(e) =>
                update((d) => {
                  const r = d.receivers.find((r) => r.id === currentReceiver.id);
                  if (r) r.capacitySlots = Number(e.target.value);
                })
              }
            />
          </label>
          <Button
            variant="secondary"
            onClick={() =>
              update((d) => {
                const r = d.receivers.find((r) => r.id === currentReceiver.id);
                if (r) r.available = !r.available;
              })
            }
          >
            {currentReceiver.available
              ? t('Tutup penerimaan', 'Close receiving')
              : t('Buka penerimaan', 'Open receiving')}
          </Button>
          <div className="recovery-divider" />
          <h3>{t('Perangkat menuju fasilitas', 'Incoming devices')}</h3>
          <div className="recovery-manifest">
            {plan.assignments
              .filter((a) => a.receiverId === currentReceiver.id)
              .map((a) => (
                <button key={a.requestId} onClick={() => select({ kind: 'request', id: a.requestId })}>
                  <Package size={15} />
                  <span>{scenario.requests.find((r) => r.id === a.requestId)?.label}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <h2>{t('Lihat lebih dekat.', 'Take a closer look.')}</h2>
          <p>
            {t(
              'Pilih rumah, kendaraan, atau penerima untuk menjelajahi rencana.',
              'Select a home, vehicle, or receiver to explore the plan.',
            )}
          </p>
        </>
      )}
    </div>
  );
  return (
    <div className="recovery-app">
      <a className="skip-link" href="#recovery-main">
        {t('Lewati ke konten', 'Skip to content')}
      </a>
      <header className="recovery-header">
        <NavLink to="/network" className="recovery-brand" aria-label="Jejak Balik">
          <img src="/brand/logo.svg" alt="Jejak Balik" />
        </NavLink>
        <nav aria-label={t('Navigasi utama', 'Main navigation')}>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              className={() =>
                (path === '/network' && section === 'network') ||
                (path === '/requests' && section === 'requests') ||
                (path === '/decisions' && section === 'decisions') ||
                (path === '/results' && section === 'results')
                  ? 'active'
                  : ''
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="recovery-header-tools">
          <div className="recovery-language">
            <button
              aria-label="Bahasa Indonesia"
              aria-pressed={locale === 'id'}
              onClick={() => setLocale('id')}
            >
              ID
            </button>
            <span>/</span>
            <button aria-label="English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
              EN
            </button>
          </div>
          <IconButton
            label={t('Tentang demonstrasi', 'About this demonstration')}
            onClick={() => setAbout(true)}
          >
            <CircleHelp size={19} />
          </IconButton>
          <IconButton
            ref={settingsTrigger}
            label={t('Pengaturan', 'Settings')}
            onClick={() => setSettings(true)}
          >
            <Settings2 size={19} />
          </IconButton>
        </div>
      </header>
      <main id="recovery-main" tabIndex={-1}>
        <div className="recovery-page-heading">
          <div>
            <h1>{title}</h1>
            <p>
              {section === 'network'
                ? t(
                    'Hubungkan elektronik yang menunggu dengan perjalanan yang sudah ada.',
                    'Connect electronics waiting for a return with journeys already happening.',
                  )
                : section === 'requests'
                  ? t(
                      'Tinjau kebutuhan, jadwal, dan jejak setiap penyerahan.',
                      'Review the needs, schedules, and records of each return.',
                    )
                  : section === 'decisions'
                    ? t(
                        'Tinjau pilihan. Atasi perubahan. Anda memegang persetujuan.',
                        'Review options. Resolve changes. You hold approval.',
                      )
                    : t(
                        'Bandingkan layanan, tambahan perjalanan, dan kewajiban yang masih terbuka.',
                        'Compare coverage, additional travel, and obligations still outstanding.',
                      )}
            </p>
          </div>
          <div className="recovery-heading-actions">
            {section === 'network' && (
              <Button variant="ghost" onClick={startGuide}>
                {t('Ikuti satu perjalanan', 'Follow one return')}
                <ArrowUpRight size={15} />
              </Button>
            )}
            <Button ref={addDeviceTrigger} icon={<Plus size={17} />} onClick={() => setAddOpen(true)}>
              {t('Tambah perangkat', 'Add device')}
            </Button>
          </div>
        </div>
        {planning.pending && section !== 'network' && (
          <div className="recovery-notice" role="status">
            {t(
              'Menghitung ulang rencana. Hasil menunggu sampai perhitungan selesai.',
              'Recalculating the plan. Results remain pending until this completes.',
            )}
          </div>
        )}
        {(notice || storageError) && (
          <div className={`recovery-notice ${storageError ? 'warning' : ''}`} role="status">
            <Check size={16} />
            <span>
              {storageError
                ? t(
                    'Penyimpanan browser tidak tersedia. Ekspor untuk menyimpan skenario.',
                    'Browser storage is unavailable. Export to retain this scenario.',
                  )
                : notice}
            </span>
            <IconButton
              label={t('Tutup pemberitahuan', 'Dismiss notice')}
              onClick={() => {
                setNotice('');
                setStorageError(false);
              }}
            >
              <X size={15} />
            </IconButton>
          </div>
        )}
        {guide !== null && (
          <div className="recovery-guide">
            <span className="recovery-guide-count">
              {guide + 1}
              <small>/ 5</small>
            </span>
            <div>
              <strong>{guideSteps[guide][0]}</strong>
              <p>{guideSteps[guide][1]}</p>
            </div>
            <div className="recovery-guide-actions">
              <IconButton
                label={t('Langkah sebelumnya', 'Previous step')}
                disabled={guide === 0}
                onClick={() => setGuide((v) => Math.max(0, (v || 0) - 1))}
              >
                <ChevronLeft size={17} />
              </IconButton>
              <Button size="sm" disabled={planning.pending} onClick={nextGuide}>
                {guide === 4 ? t('Selesai', 'Finish') : t('Lanjut', 'Next')}
                <ArrowRight size={14} />
              </Button>
              <IconButton label={t('Keluar panduan', 'Exit guide')} onClick={() => setGuide(null)}>
                <X size={16} />
              </IconButton>
            </div>
          </div>
        )}
        {section === 'network' && (
          <>
            <div className="recovery-workspace">
              <aside className="recovery-network-rail">
                <div className="recovery-rail-title">
                  <h2>{t('Jaringan hari ini', 'Today’s network')}</h2>
                  <span>
                    {scenario.journeys.filter((j) => j.available).length}/{scenario.journeys.length}
                  </span>
                </div>
                <p className="recovery-small">
                  {t('Ubah ketersediaan. Rencana mengikuti.', 'Change availability. The plan follows.')}
                </p>
                <div className="recovery-provider-list">
                  {scenario.providers.map((p) => (
                    <section key={p.id}>
                      <div className="recovery-provider-heading">
                        <i style={{ background: p.color }} />
                        <div>
                          <h3>{p.name}</h3>
                          <p>{p.description[locale === 'en' ? 1 : 0]}</p>
                        </div>
                      </div>
                      {scenario.journeys
                        .filter((j) => j.providerId === p.id)
                        .map((j) => (
                          <div
                            key={j.id}
                            className={`recovery-journey-row ${selected?.id === j.id ? 'selected' : ''}`}
                          >
                            <button
                              className="recovery-journey-select"
                              onClick={() => {
                                select({ kind: 'journey', id: j.id });
                                setWorldView('city');
                              }}
                            >
                              <Truck size={16} />
                              <span>
                                <b>{j.name}</b>
                                <small>
                                  {minute(j.startMinute)} · {j.capacityKg} kg
                                </small>
                              </span>
                            </button>
                            <button
                              role="switch"
                              aria-checked={j.available}
                              aria-label={`${t('Ketersediaan', 'Availability')} ${j.name}`}
                              className="recovery-switch"
                              onClick={() =>
                                update(
                                  (d) => {
                                    const v = d.journeys.find((x) => x.id === j.id);
                                    if (v) v.available = !v.available;
                                  },
                                  [
                                    'Jaringan berubah. Rencana dihitung kembali.',
                                    'Network changed. The plan has been recalculated.',
                                  ],
                                )
                              }
                            >
                              <span />
                            </button>
                          </div>
                        ))}
                    </section>
                  ))}
                </div>
                <div className="recovery-rail-budget">
                  <div>
                    <Wallet size={17} />
                    <h3>{t('Anggaran layanan', 'Service budget')}</h3>
                  </div>
                  <strong>{money(scenario.budgetIdr)}</strong>
                  <input
                    aria-label={t('Anggaran layanan', 'Service budget')}
                    type="range"
                    min="0"
                    max="1500000"
                    step="25000"
                    value={scenario.budgetIdr}
                    onChange={(e) =>
                      update((d) => {
                        d.budgetIdr = Number(e.target.value);
                      })
                    }
                  />
                  <p>
                    {t(
                      'Mendanai perjalanan dan penanganan. Nilai perangkat bukan penerimaan kas.',
                      'Funds travel and handling. Device value is not cash received.',
                    )}
                  </p>
                </div>
                <button className="recovery-text-link" onClick={() => setAbout(true)}>
                  {t('Bagaimana perhitungannya?', 'How is this calculated?')}
                  <ArrowUpRight size={14} />
                </button>
              </aside>
              <div className={`recovery-stage ${selected ? 'has-selection' : ''}`}>
                {planning.pending && (
                  <div className="recovery-planning-status" role="status">
                    {t('Menghitung pilihan jaringan saat ini…', 'Calculating current network options…')}
                  </div>
                )}
                {planning.failed && (
                  <div className="recovery-planning-status warning" role="alert">
                    {t(
                      'Perhitungan tidak dapat diselesaikan. Ubah kondisi atau mulai ulang skenario.',
                      'Planning could not complete. Change conditions or reset the scenario.',
                    )}
                  </div>
                )}
                <div className="recovery-stage-toolbar">
                  <div className="recovery-world-tabs">
                    {(['city', 'vehicle', 'hub', 'device'] as const).map((v) => (
                      <button
                        key={v}
                        aria-pressed={worldView === v}
                        onClick={() => {
                          setWorldView(v);
                          if (v === 'vehicle' && selected?.kind !== 'journey')
                            setSelected({ kind: 'journey', id: scenario.journeys[0].id });
                          if (v === 'device' && selected?.kind !== 'request')
                            setSelected({ kind: 'request', id: scenario.requests[0].id });
                          if (v === 'hub' && !selected)
                            setSelected({ kind: 'receiver', id: scenario.receivers[0].id });
                        }}
                      >
                        {v === 'city'
                          ? t('Kota', 'City')
                          : v === 'vehicle'
                            ? t('Kendaraan', 'Vehicle')
                            : v === 'hub'
                              ? t('Fasilitas', 'Facility')
                              : t('Perangkat', 'Device')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="recovery-world-surface">
                  <Suspense
                    fallback={
                      <div className="recovery-world-loading" role="status">
                        <Network size={28} />
                        <span>{t('Menyiapkan jaringan…', 'Preparing the network…')}</span>
                      </div>
                    }
                  >
                    <RecoveryWorld
                      scenario={scenario}
                      plan={plan}
                      selected={selected}
                      onSelect={select}
                      locale={locale}
                      reducedMotion={reduced}
                      playing={playing}
                      time={time}
                      view={worldView}
                      force2D={force2D}
                      quality={quality}
                    />
                  </Suspense>
                </div>
                <div className="recovery-playback">
                  <IconButton
                    label={playing ? t('Jeda gerakan', 'Pause motion') : t('Putar gerakan', 'Play motion')}
                    onClick={() => setPlaying((v) => !v)}
                  >
                    {playing ? <Pause size={17} /> : <Play size={17} />}
                  </IconButton>
                  <span>
                    {t('Pratinjau perjalanan', 'Journey preview')}
                    <small>
                      {t('Gerakan tidak mengesahkan serah terima', 'Animation does not approve handoffs')}
                    </small>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      !scenario.approvedPlan ||
                      scenario.approvedPlan.revision !== scenario.revision ||
                      planning.pending ||
                      planning.failed
                    }
                    onClick={advance}
                  >
                    {t('Lanjutkan layanan', 'Advance service')}
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
              {selected && <aside className="recovery-inspector">{inspector()}</aside>}
            </div>
            <div
              className={`recovery-plan-strip ${planning.pending ? 'is-pending' : ''}`}
              aria-busy={planning.pending}
            >
              <div className="recovery-plan-label">
                <span className="recovery-plan-symbol">
                  <ArrowDownLeft size={23} />
                </span>
                <div>
                  <strong>
                    {approved
                      ? t('Rencana disetujui', 'Approved plan')
                      : t('Usulan yang dapat ditinjau', 'A proposal to review')}
                  </strong>
                  <small>
                    {t(
                      'Dihitung dari kondisi jaringan saat ini',
                      'Calculated from current network conditions',
                    )}
                  </small>
                </div>
              </div>
              <div>
                <b>
                  {plan.served}
                  <small>/{scenario.requests.length}</small>
                </b>
                <span>{t('perangkat dalam rencana', 'devices in plan')}</span>
              </div>
              <div>
                <b>
                  +{number(plan.addedKm, 1)}
                  <small> km</small>
                </b>
                <span>{t('tambahan perjalanan', 'additional travel')}</span>
              </div>
              <div>
                <b>{money(plan.totalCostIdr)}</b>
                <span>{t('biaya layanan model', 'modeled service cost')}</span>
              </div>
              <Button
                disabled={plan.served === 0 || planning.pending || planning.failed}
                onClick={() => {
                  if (!planning.pending && !planning.failed) setApproval(plan);
                }}
              >
                {t('Tinjau rencana', 'Review plan')}
                <ArrowRight size={16} />
              </Button>
            </div>
            <div className="recovery-below">
              <div className="recovery-request-preview">
                <div>
                  <h2>{t('Menunggu untuk kembali', 'Waiting for a return')}</h2>
                  <button className="recovery-text-link" onClick={() => navigate('/requests')}>
                    {t('Semua permintaan', 'All requests')}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="recovery-preview-list">
                  {scenario.requests.slice(0, 6).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        select({ kind: 'request', id: r.id });
                        setWorldView('city');
                        window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
                      }}
                    >
                      <span className={`recovery-device-stamp ${r.handling}`}>
                        <Package size={19} />
                      </span>
                      <span>
                        <strong>{r.label}</strong>
                        <small>{r.neighborhood}</small>
                      </span>
                      <span className="recovery-preview-phase">{phase(r.phase)}</span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="recovery-partnership-note">
                <Network size={25} />
                <h2>{t('Berbeda perjalanan. Bertemu tujuan.', 'Different journeys. Shared purpose.')}</h2>
                <p>
                  {t(
                    'Penyedia logistik menyumbang kapasitas perjalanan. Penerima menyumbang jalur penanganan. Jejak Balik menghubungkan keputusan di antaranya.',
                    'Logistics providers contribute journey capacity. Receivers contribute handling pathways. Jejak Balik connects the decisions between them.',
                  )}
                </p>
                <button className="recovery-text-link" onClick={() => setAbout(true)}>
                  {t('Kenali cara kerja', 'Explore the mechanism')}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
        {section === 'requests' && (
          <div className="recovery-content-grid">
            <section className="recovery-registry">
              <div className="recovery-registry-tools">
                <div className="recovery-search">
                  <Search size={17} />
                  <input
                    aria-label={t('Cari permintaan', 'Search requests')}
                    placeholder={t(
                      'Cari perangkat, ID, atau lingkungan',
                      'Search device, ID, or neighborhood',
                    )}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <IconButton label={t('Hapus pencarian', 'Clear search')} onClick={() => setSearch('')}>
                      <X size={15} />
                    </IconButton>
                  )}
                </div>
                <select
                  aria-label={t('Saring status', 'Filter status')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">{t('Semua status', 'All statuses')}</option>
                  <option value="unassigned">{t('Belum terlayani', 'Unserved')}</option>
                  {Object.entries(phaseLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v[locale === 'en' ? 1 : 0]}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={planning.pending || planning.failed}
                  icon={<Download size={15} />}
                  onClick={exportCSV}
                >
                  CSV
                </Button>
              </div>
              <div className="recovery-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Perangkat', 'Device')}</th>
                      <th>{t('Lingkungan', 'Neighborhood')}</th>
                      <th>{t('Status', 'Status')}</th>
                      <th>{t('Perjalanan', 'Journey')}</th>
                      <th>{t('Bobot', 'Mass')}</th>
                      <th>
                        <span className="sr-only">{t('Buka', 'Open')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryRequests.slice(page * 10, page * 10 + 10).map((r) => (
                      <tr key={r.id} className={selected?.id === r.id ? 'selected' : ''}>
                        <td>
                          <button
                            className="recovery-device-link"
                            onClick={() => select({ kind: 'request', id: r.id })}
                          >
                            <span className="recovery-device-stamp">
                              <Package size={18} />
                            </span>
                            <span>
                              <b>{r.label}</b>
                              <small>
                                {r.id} · {device(r.category)}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>{r.neighborhood}</td>
                        <td>
                          <span className={`recovery-status status-${r.phase}`}>{phase(r.phase)}</span>
                        </td>
                        <td>
                          {plan.assignments.find((a) => a.requestId === r.id)?.journeyId ||
                            t('Belum ada', 'Unassigned')}
                        </td>
                        <td>{number(r.massKg, 1)} kg</td>
                        <td>
                          <IconButton
                            label={`${t('Buka', 'Open')} ${r.label}`}
                            onClick={() => select({ kind: 'request', id: r.id })}
                          >
                            <ArrowUpRight size={16} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!queryRequests.length && (
                  <div className="recovery-empty">
                    <Search size={26} />
                    <h3>{t('Tidak ada permintaan yang cocok.', 'No matching requests.')}</h3>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch('');
                        setFilter('all');
                      }}
                    >
                      {t('Hapus penyaring', 'Clear filters')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="recovery-pagination">
                <span>
                  {queryRequests.length
                    ? `${page * 10 + 1}-${Math.min(page * 10 + 10, queryRequests.length)}`
                    : '0'}{' '}
                  {t('dari', 'of')} {queryRequests.length}
                </span>
                <div>
                  <IconButton
                    label={t('Halaman sebelumnya', 'Previous page')}
                    disabled={page === 0}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    <ChevronLeft size={17} />
                  </IconButton>
                  <IconButton
                    label={t('Halaman berikutnya', 'Next page')}
                    disabled={(page + 1) * 10 >= queryRequests.length}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    <ChevronRight size={17} />
                  </IconButton>
                </div>
              </div>
            </section>
            {selected && <aside className="recovery-inspector registry-inspector">{inspector()}</aside>}
          </div>
        )}
        {section === 'decisions' && (
          <div className="recovery-decisions">
            <section className="recovery-case-main">
              <div className="recovery-section-heading">
                <h2>{t('Yang memerlukan keputusan', 'What needs a decision')}</h2>
                <span>
                  {rejectionCases.length +
                    dataHolds.length +
                    noConsent.length +
                    physicalHolds.length +
                    (!scenario.approvedPlan && plan.served > 0 ? 1 : 0)}
                </span>
              </div>
              <div className="recovery-role-strip">
                <img
                  src="/agents/jaga.webp"
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <p>
                  {t(
                    'Satu catatan bersama. Setiap usulan memiliki alasan, dampak, dan penanggung jawab.',
                    'One shared record. Every proposal has a reason, a consequence, and an accountable owner.',
                  )}
                </p>
              </div>
              {!scenario.approvedPlan && plan.served > 0 && (
                <div className="recovery-case">
                  <span className="recovery-case-icon">
                    <ClipboardCheck size={23} />
                  </span>
                  <div>
                    <span className="recovery-id">{t('Rencana jaringan', 'Network proposal')}</span>
                    <h3>{t('Usulan siap Anda tinjau.', 'A proposal is ready for review.')}</h3>
                    <p>
                      {plan.served}{' '}
                      {t('perangkat dapat dijadwalkan dengan biaya', 'devices can be scheduled at a cost of')}{' '}
                      {money(plan.totalCostIdr)}.
                    </p>
                    <Button
                      size="sm"
                      disabled={planning.pending || planning.failed}
                      onClick={() => {
                        if (!planning.pending && !planning.failed) setApproval(plan);
                      }}
                    >
                      {t('Bandingkan & setujui', 'Compare & approve')}
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
              {physicalHolds.map(({ request: r, code }) => (
                <div className="recovery-case" key={`physical-${r.id}`}>
                  <span className="recovery-case-icon amber">
                    <Truck size={23} />
                  </span>
                  <div>
                    <span className="recovery-id">{r.id}</span>
                    <h3>
                      {t(
                        'Serah terima menunggu penyelesaian logistik.',
                        'Handoff awaits logistics resolution.',
                      )}
                    </h3>
                    <p>
                      {r.label}: {reason(code, code)}
                    </p>
                    <p className="recovery-small">
                      {t('Penanggung jawab saat ini', 'Current responsible party')}:{' '}
                      {scenario.approvedPlan?.assignments.find((a) => a.requestId === r.id)?.journeyId ||
                        t('Tinjau catatan serah terima', 'Review custody records')}
                      .{' '}
                      {t(
                        'Perangkat tetap pada pembawa yang menerima serah terima.',
                        'The device remains with the carrier that accepted custody.',
                      )}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelected({ kind: 'request', id: r.id });
                        navigate('/network');
                      }}
                    >
                      {t('Tinjau catatan & kondisi', 'Review records & conditions')}
                      <ArrowUpRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {dataHolds.map((r) => (
                <div className="recovery-case" key={`data-${r.id}`}>
                  <span className="recovery-case-icon amber">
                    <ShieldCheck size={23} />
                  </span>
                  <div>
                    <span className="recovery-id">{r.id}</span>
                    <h3>
                      {t(
                        'Tinjauan data menahan penanganan akhir.',
                        'Data review is holding final disposition.',
                      )}
                    </h3>
                    <p>
                      {r.label} ·{' '}
                      {t(
                        'Perangkat telah diterima; pelepasan data belum dicatat.',
                        'The device is received; data clearance is not recorded.',
                      )}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setReviewRequest(r.id)}>
                      {t('Tinjau perangkat', 'Review device')}
                    </Button>
                  </div>
                </div>
              ))}
              {noConsent.map((r) => (
                <div className="recovery-case" key={`consent-${r.id}`}>
                  <span className="recovery-case-icon amber">
                    <UsersRound size={23} />
                  </span>
                  <div>
                    <span className="recovery-id">{r.id}</span>
                    <h3>{t('Persetujuan pemilik belum dicatat.', 'Owner permission is not recorded.')}</h3>
                    <p>{r.label}</p>
                    <Button variant="secondary" size="sm" onClick={() => setReviewRequest(r.id)}>
                      {t('Tinjau persetujuan', 'Review permission')}
                    </Button>
                  </div>
                </div>
              ))}
              {rejectionCases.map((r) => (
                <div className="recovery-case" key={r.requestId}>
                  <span className="recovery-case-icon amber">
                    <SlidersHorizontal size={23} />
                  </span>
                  <div>
                    <span className="recovery-id">{r.requestId}</span>
                    <h3>{scenario.requests.find((a) => a.id === r.requestId)?.label}</h3>
                    <p>{reason(r.code, r.detail)}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelected({ kind: 'request', id: r.requestId });
                        navigate('/network');
                      }}
                    >
                      {t('Lihat pilihan jaringan', 'Inspect network options')}
                      <ArrowUpRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {scenario.approvedPlan && !plan.rejections.length && !dataHolds.length && !noConsent.length && (
                <div className="recovery-empty">
                  <ShieldCheck size={32} />
                  <h3>{t('Tidak ada tinjauan yang tertunda.', 'No reviews are pending.')}</h3>
                  <p>
                    {t(
                      'Lanjutkan tahap layanan atau uji perubahan pada jaringan.',
                      'Advance service or test a change in the network.',
                    )}
                  </p>
                  <Button onClick={advance}>{t('Lanjutkan layanan', 'Advance service')}</Button>
                </div>
              )}
            </section>
            <aside className="recovery-decision-side">
              <h2>{t('Uji respons jaringan', 'Test the network response')}</h2>
              <p>
                {t(
                  'Setiap perubahan di sini benar-benar menghitung ulang pilihan.',
                  'Every change here genuinely recalculates the options.',
                )}
              </p>
              <div className="recovery-scenario-actions">
                {scenario.journeys.slice(0, 3).map((j) => (
                  <button
                    key={j.id}
                    onClick={() =>
                      update((d) => {
                        const v = d.journeys.find((v) => v.id === j.id);
                        if (v) v.available = !v.available;
                      })
                    }
                  >
                    <Truck size={18} />
                    <span>
                      <strong>
                        {j.available ? t('Batalkan', 'Cancel') : t('Aktifkan', 'Enable')} {j.name}
                      </strong>
                      <small>
                        {j.available
                          ? t('Periksa penugasan pengganti', 'Inspect replacement assignments')
                          : t('Kembalikan kapasitas perjalanan', 'Restore journey capacity')}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                {scenario.receivers.slice(0, 1).map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      update((d) => {
                        const v = d.receivers.find((v) => v.id === r.id);
                        if (v) v.capacitySlots = v.capacitySlots > 2 ? 2 : 20;
                      })
                    }
                  >
                    <Layers3 size={18} />
                    <span>
                      <strong>{t('Ubah kapasitas penerima', 'Change receiving capacity')}</strong>
                      <small>
                        {r.name}: {r.capacitySlots} {t('slot', 'slots')}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
              <div className="recovery-divider" />
              <AssistantPanel />
            </aside>
          </div>
        )}
        {section === 'results' && (
          <div className="recovery-results">
            <div className="recovery-result-hero">
              <div>
                <span className="recovery-result-count">
                  {completed}
                  <small>/{scenario.requests.length}</small>
                </span>
                <h2>{t('perangkat menuntaskan alur model', 'devices completed the modeled workflow')}</h2>
                <p>
                  {t(
                    'Hasil mengikuti catatan layanan pada skenario yang sedang Anda jelajahi.',
                    'Results follow service records in the scenario you are exploring.',
                  )}
                </p>
              </div>
              <div className="recovery-result-progress">
                <div>
                  <span>{t('Terhubung ke rencana', 'Linked to plan')}</span>
                  <b>{plan.served}</b>
                </div>
                <div>
                  <span>{t('Belum terlayani', 'Unserved')}</span>
                  <b>{plan.rejections.length}</b>
                </div>
                <div>
                  <span>{t('Diterima, menunggu data', 'Received, awaiting data')}</span>
                  <b>{dataHolds.length}</b>
                </div>
                <div>
                  <span>{t('Menunggu penyelesaian logistik', 'Awaiting logistics resolution')}</span>
                  <b>{physicalHolds.length}</b>
                </div>
                <div>
                  <span>{t('Pekerjaan belum selesai', 'Unfinished work')}</span>
                  <b>{outstanding.length}</b>
                </div>
              </div>
            </div>
            <div className="recovery-result-columns">
              <section>
                <h2>{t('Tambahan perjalanan yang dibutuhkan', 'The additional travel required')}</h2>
                <p className="recovery-muted">
                  {t(
                    'Pengumpulan khusus sudah dikelompokkan. Periksa cakupannya sebelum membandingkan jarak.',
                    'Dedicated collection is already pooled. Check its service coverage before comparing distance.',
                  )}
                </p>
                <div className="recovery-comparison">
                  <div>
                    <span>{t('Pengumpulan terjadwal', 'Scheduled collection')}</span>
                    <strong>
                      {number(plan.baselineKm, 1)}
                      <small> km</small>
                    </strong>
                    <div
                      className="recovery-comparison-line"
                      style={{ width: '100%', background: '#c5c8bd' }}
                    />
                  </div>
                  <div>
                    <span>{t('Tambahan pada perjalanan yang ada', 'Added to existing journeys')}</span>
                    <strong>
                      {number(plan.addedKm, 1)}
                      <small> km</small>
                    </strong>
                    <div
                      className="recovery-comparison-line"
                      style={{
                        width: `${plan.baselineKm ? Math.max(3, Math.min(100, (plan.addedKm / plan.baselineKm) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="recovery-small">
                  {t('Cakupan baseline', 'Baseline coverage')}: {plan.baselineServed ?? plan.served}/
                  {plan.served} {t('perangkat dalam kelompok pembanding', 'devices in the comparison cohort')}
                  .{' '}
                  {plan.baselineFeasible === false
                    ? t(
                        'Baseline tidak memenuhi semua batas layanan; angka jarak tidak menunjukkan penghematan untuk layanan setara.',
                        'The baseline does not meet every service constraint; distance does not establish savings for equivalent service.',
                      )
                    : t(
                        'Kedua pilihan menggunakan kelompok perangkat terjadwal yang sama.',
                        'Both options use the same scheduled device cohort.',
                      )}
                </p>
                <p className="recovery-small">
                  {t('Tambahan waktu model', 'Modeled extra time')}: {number(plan.addedMinutes, 0)}{' '}
                  {t(
                    'menit. Waktu mencakup perjalanan dan penanganan sesuai asumsi.',
                    'minutes. Time includes travel and handling under the assumptions.',
                  )}
                </p>
              </section>
              <section>
                <h2>{t('Biaya & kewajiban', 'Costs & obligations')}</h2>
                <dl className="recovery-finance">
                  <div>
                    <dt>{t('Anggaran tersedia', 'Available budget')}</dt>
                    <dd>{money(scenario.budgetIdr)}</dd>
                  </div>
                  <div>
                    <dt>{t('Kompensasi perjalanan', 'Journey compensation')}</dt>
                    <dd>{money(plan.routes.reduce((n, r) => n + r.driverPaymentIdr, 0))}</dd>
                  </div>
                  <div>
                    <dt>{t('Penanganan perangkat', 'Device handling')}</dt>
                    <dd>{money(plan.routes.reduce((n, r) => n + r.handlingCostIdr, 0))}</dd>
                  </div>
                  <div className="total">
                    <dt>{t('Biaya layanan model', 'Modeled service cost')}</dt>
                    <dd>{money(plan.totalCostIdr)}</dd>
                  </div>
                  <div>
                    <dt>{t('Kewajiban terbuka', 'Outstanding obligations')}</dt>
                    <dd>{money(plan.outstandingCostIdr)}</dd>
                  </div>
                </dl>
                <p className="recovery-small">
                  {t(
                    'Nilai perangkat dan hasil penjualan tidak dianggap sebagai kas layanan. Angka biaya adalah asumsi perencanaan, belum termasuk biaya umum dan modal.',
                    'Device value and sale proceeds are not treated as service cash. Costs are planning assumptions and exclude overhead and capital.',
                  )}
                </p>
              </section>
            </div>
            <section className="recovery-records">
              <div className="recovery-section-heading">
                <h2>{t('Catatan yang dapat diperiksa', 'Records you can inspect')}</h2>
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={planning.pending || planning.failed}
                    onClick={exportCSV}
                  >
                    CSV
                    <Download size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => saveDownload('JejakBalik_scenario.json', exportScenario(scenario))}
                  >
                    JSON
                    <Download size={14} />
                  </Button>
                </div>
              </div>
              {scenario.events.length ? (
                <div className="recovery-events">
                  {scenario.events
                    .slice(-12)
                    .reverse()
                    .map((e) => (
                      <div key={e.id}>
                        <span className="recovery-event-time">{minute(e.atMinute)}</span>
                        <span>
                          <b>{scenario.requests.find((r) => r.id === e.requestId)?.label}</b>
                          <small>
                            {e.requestId} · {e.actor}
                          </small>
                        </span>
                        <span className="recovery-status">
                          {phase(e.kind === 'approved' ? 'assigned' : e.kind)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="recovery-empty">
                  <FileText size={28} />
                  <p>
                    {t(
                      'Setujui rencana dan lanjutkan layanan untuk membentuk catatan serah terima.',
                      'Approve a plan and advance service to create handoff records.',
                    )}
                  </p>
                  <Button variant="secondary" onClick={() => navigate('/network')}>
                    {t('Kembali ke jaringan', 'Return to network')}
                  </Button>
                </div>
              )}
            </section>
            <div className="recovery-evidence-note">
              <ShieldCheck size={20} />
              <p>
                {t(
                  'Demonstrasi ini memakai mitra, lokasi, perangkat, dan transaksi fiktif. Catatan menggambarkan perilaku perangkat lunak, bukan pengumpulan, penghapusan data, sertifikasi, atau dampak lingkungan di lapangan.',
                  'This demonstration uses fictional partners, locations, devices, and transactions. Records describe software behavior, not field collection, data erasure, certification, or environmental impact.',
                )}
              </p>
            </div>
          </div>
        )}
        <footer className="recovery-footer">
          <span>Jejak Balik</span>
          <p>{t('Ruang untuk kembali.', 'Room for the return.')}</p>
          <button onClick={() => setAbout(true)}>
            {t('Tentang model ini', 'About this model')}
            <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      <Dialog
        open={!!selected && mobileInspector}
        onClose={() => setMobileInspector(false)}
        title={t('Detail pilihan', 'Selection details')}
        className="recovery-dialog recovery-mobile-detail"
      >
        {inspector(true)}
      </Dialog>
      <Dialog
        open={addOpen}
        returnFocusRef={addDeviceTrigger}
        onClose={() => setAddOpen(false)}
        title={t('Tambahkan perangkat untuk kembali', 'Add a device for a return')}
        description={t(
          'Gunakan contoh perangkat. Tidak diperlukan alamat atau data pribadi.',
          'Use a sample device. No address or personal data is required.',
        )}
        className="recovery-dialog"
      >
        <RequestForm
          locale={locale}
          scenario={scenario}
          onCancel={() => setAddOpen(false)}
          onSubmit={(input) => {
            try {
              const next = addRequest(scenario, input);
              setScenario(next);
              setPreferences({});
              setAddOpen(false);
              setSelected({ kind: 'request', id: next.requests.at(-1)!.id });
              navigate('/network');
              announce(
                'Permintaan ditambahkan. Tinjau persetujuan pemilik untuk mencari perjalanan.',
                'Request added. Review owner permission to find a journey.',
              );
            } catch {
              announce(
                'Permintaan belum dapat ditambahkan. Periksa isi formulir.',
                'The request could not be added. Check the form.',
              );
            }
          }}
        />
      </Dialog>
      <Dialog
        open={!!approval}
        onClose={() => setApproval(null)}
        title={t('Tinjau rencana pengumpulan', 'Review the collection plan')}
        description={t(
          'Persetujuan ini berlaku untuk usulan yang ditampilkan. Perubahan jaringan memerlukan tinjauan baru.',
          'Approval applies to the displayed proposal. Network changes require another review.',
        )}
        className="recovery-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproval(null)}>
              {t('Kembali', 'Back')}
            </Button>
            <Button disabled={!approval?.served || planning.pending || planning.failed} onClick={doApprove}>
              {t('Setujui rencana ini', 'Approve this plan')}
              <Check size={16} />
            </Button>
          </>
        }
      >
        {approval && (
          <>
            <div className="recovery-approval-summary">
              <div>
                <span>{t('Terjadwal', 'Planned')}</span>
                <strong>
                  {approval.served}/{scenario.requests.length}
                </strong>
              </div>
              <div>
                <span>{t('Tambahan jarak', 'Added distance')}</span>
                <strong>{number(approval.addedKm, 1)} km</strong>
              </div>
              <div>
                <span>{t('Biaya layanan', 'Service cost')}</span>
                <strong>{money(approval.totalCostIdr)}</strong>
              </div>
            </div>
            <div className="recovery-approval-routes">
              {approval.routes
                .filter((r) => r.requestIds.length)
                .map((r) => (
                  <div key={r.journeyId}>
                    <Truck size={18} />
                    <span>
                      <b>{scenario.journeys.find((j) => j.id === r.journeyId)?.name}</b>
                      <small>
                        {r.requestIds.length} {t('perangkat', 'devices')} · +{number(r.addedMinutes, 0)}{' '}
                        {t('mnt', 'min')}
                      </small>
                    </span>
                    <strong>{money(r.costIdr)}</strong>
                  </div>
                ))}
            </div>
            {approval.rejections.length > 0 && (
              <p className="recovery-warning">
                {approval.rejections.length}{' '}
                {t(
                  'permintaan tetap belum terlayani. Catatan dan kebutuhannya tetap terlihat.',
                  'requests remain unserved. Their records and needs remain visible.',
                )}
              </p>
            )}
            <p className="recovery-small">
              {t(
                'Ini persetujuan pada skenario demonstrasi; tidak memesan kendaraan atau mengesahkan tindakan di lapangan.',
                'This approves the demonstration scenario; it does not book a vehicle or authorize field work.',
              )}
            </p>
          </>
        )}
      </Dialog>
      <PermissionReview
        request={scenario.requests.find((r) => r.id === reviewRequest) || null}
        locale={locale}
        onClose={() => setReviewRequest(null)}
        onSave={(consent, dataCleared) => {
          if (!reviewRequest) return;
          update(
            (d) => {
              const r = d.requests.find((r) => r.id === reviewRequest);
              if (r) {
                r.consent = consent;
                r.dataCleared = dataCleared;
              }
            },
            ['Tinjauan dicatat pada skenario.', 'Review recorded in the scenario.'],
          );
          setReviewRequest(null);
        }}
      />
      <Dialog
        open={settings}
        returnFocusRef={settingsTrigger}
        onClose={() => setSettings(false)}
        title={t('Pengaturan & skenario', 'Settings & scenario')}
        className="recovery-dialog"
      >
        <div className="recovery-settings">
          <div className="recovery-form">
            <label htmlFor="recovery-quality">{t('Kualitas tampilan 3D', '3D display quality')}</label>
            <select
              id="recovery-quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value as 'auto' | 'low' | 'high')}
            >
              <option value="auto">{t('Otomatis', 'Automatic')}</option>
              <option value="low">{t('Ringan', 'Light')}</option>
              <option value="high">{t('Tinggi', 'High')}</option>
            </select>
          </div>
          <label>
            <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />
            {t('Kurangi gerakan', 'Reduce motion')}
          </label>
          <label>
            <input type="checkbox" checked={force2D} onChange={(e) => setForce2D(e.target.checked)} />
            {t('Gunakan peta 2D', 'Use the 2D map')}
          </label>
          <Button
            variant="secondary"
            onClick={() => saveDownload('JejakBalik_scenario.json', exportScenario(scenario))}
          >
            <Download size={16} />
            {t('Ekspor skenario', 'Export scenario')}
          </Button>
          <Button variant="secondary" onClick={() => upload.current?.click()}>
            <Upload size={16} />
            {t('Impor skenario', 'Import scenario')}
          </Button>
          <input
            type="file"
            accept=".json,application/json"
            hidden
            ref={upload}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1000000) {
                setImportError(t('Berkas terlalu besar.', 'The file is too large.'));
                return;
              }
              const imported = importScenario(await file.text());
              if (imported) {
                setScenario(imported);
                setTime(imported.serviceMinute);
                setPlaying(false);
                setSelected(null);
                setPreferences({});
                setImportError('');
                announce(
                  'Skenario diimpor. Tinjau ulang rencana sebelum melanjutkan layanan.',
                  'Scenario imported. Review the plan again before advancing service.',
                );
              } else
                setImportError(
                  t(
                    'Berkas tidak valid. Skenario aktif tetap disimpan.',
                    'Invalid file. The active scenario is preserved.',
                  ),
                );
              e.target.value = '';
            }}
          />
          {importError && (
            <p role="alert" className="recovery-warning">
              {importError}
            </p>
          )}
          <p className="recovery-small">
            {t(
              'Skenario tersimpan pada browser ini. Ekspor untuk memindahkannya.',
              'The scenario is saved in this browser. Export to move it.',
            )}
          </p>
          <Button
            variant="danger"
            onClick={() => {
              setSettings(false);
              setReset(true);
            }}
          >
            <RotateCcw size={16} />
            {t('Mulai ulang skenario', 'Reset scenario')}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={reset}
        returnFocusRef={settingsTrigger}
        onClose={() => setReset(false)}
        title={t('Mulai ulang skenario?', 'Reset the scenario?')}
        description={t(
          'Permintaan tambahan, keputusan, dan catatan pada skenario ini akan diganti dengan contoh awal.',
          'Additional requests, decisions, and records in this scenario will be replaced with the original example.',
        )}
        className="recovery-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReset(false)}>
              {t('Batal', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setScenario(createScenario());
                setPreferences({});
                setSelected(null);
                setWorldView('city');
                setTime(0);
                setPlaying(false);
                setReset(false);
                setGuide(null);
                announce('Skenario awal dipulihkan.', 'Original scenario restored.');
              }}
            >
              {t('Mulai ulang', 'Reset scenario')}
            </Button>
          </>
        }
      >
        {t(
          'Ekspor skenario terlebih dahulu jika ingin menyimpan perubahan.',
          'Export the scenario first to retain your changes.',
        )}
      </Dialog>
      <Dialog
        open={about}
        onClose={() => setAbout(false)}
        title={t('Bagaimana Jejak Balik bekerja', 'How Jejak Balik works')}
        className="recovery-dialog recovery-about"
      >
        <div className="recovery-about-lead">
          <Network size={28} />
          <p>
            {t(
              'Kapasitas yang tersedia pada perjalanan yang sudah ada dapat membuka jalur kembali untuk elektronik.',
              'Available capacity on existing journeys can open a return pathway for electronics.',
            )}
          </p>
        </div>
        <h3>{t('Satu jaringan, tanggung jawab berbeda', 'One network, distinct responsibilities')}</h3>
        <p>
          {t(
            'Tiga penyedia logistik menawarkan perjalanan dan kapasitas. Fasilitas penerima menetapkan jenis, kapasitas, dan jadwal penanganan. Institusi membiayai ruang lingkup layanan. Pemilik memberikan persetujuan.',
            'Three logistics providers offer journeys and capacity. Receiving facilities define handling categories, capacity, and windows. An institution funds the service scope. Owners give permission.',
          )}
        </p>
        <h3>{t('Yang dihitung', 'What is calculated')}</h3>
        <p>
          {t(
            'Perencana menyisipkan penjemputan dan penerimaan pada jaringan jalan tetap. Pilihan diperiksa terhadap waktu, bobot, slot, kompatibilitas, penerima, dan anggaran. Permintaan yang tidak sesuai tetap terlihat.',
            'The planner inserts pickups and receiving stops on a fixed road network. Options are checked against time, mass, slots, compatibility, receivers, and budget. Infeasible requests remain visible.',
          )}
        </p>
        <h3>{t('Membaca hasil dengan tepat', 'Interpreting the results')}</h3>
        <p>
          {t(
            'Semua mitra, rute, perangkat, dan transaksi pada demonstrasi ini fiktif. Biaya merupakan asumsi perencanaan. Perbandingan menggunakan kelompok perangkat yang sama. Catatan perangkat lunak tidak membuktikan pengumpulan nyata, sanitasi data, atau pemulihan material.',
            'All partners, routes, devices, and transactions in this demonstration are fictional. Costs are planning assumptions. Comparisons use the same device cohort. Software records do not establish real collection, data sanitization, or material recovery.',
          )}
        </p>
        <p>
          {t(
            'Penugasan baru dihitung sebelum perjalanan berangkat. Setelah serah terima, perangkat tetap terikat pada pembawanya; pembatalan menjadi pekerjaan tertunda yang perlu diselesaikan, bukan pemindahan otomatis ke kendaraan lain.',
            'New assignments are planned before departure. After handover, a device remains bound to its carrier; a cancellation creates an outstanding obligation, not an automatic transfer to another vehicle.',
          )}
        </p>
        <h3>{t('Dari demonstrasi ke layanan', 'From demonstration to service')}</h3>
        <p>
          {t(
            'Penerapan memerlukan kesepakatan ruang lingkup, penerimaan mitra, kompensasi, penanggung jawab serah terima, dan anggaran berkelanjutan. Kinerja dibandingkan dengan koordinasi pengumpulan terjadwal yang sudah berjalan.',
            'Implementation requires agreed scope, partner acceptance, compensation, accountable handoffs, and continuing funding. Performance is compared with existing scheduled-collection coordination.',
          )}
        </p>
        <div className="recovery-source-list">
          <a
            href="https://www.lintasarta.net/berita/official-fact-sheet-pengelolaan-perangkat-elektronik-dan-e-waste-di-lintasarta/"
            target="_blank"
            rel="noreferrer"
          >
            {t('Rujukan resmi #AksiCintaBumi', 'Official #AksiCintaBumi reference')}
            <ArrowUpRight size={15} />
          </a>
          <a href="https://arxiv.org/abs/2203.14719" target="_blank" rel="noreferrer">
            {t('Penelitian perjalanan bersama', 'Shared-trip delivery research')}
            <ArrowUpRight size={15} />
          </a>
          <a href="https://ewasterj.com/" target="_blank" rel="noreferrer">
            {t('Contoh ekosistem pengelolaan', 'Example recovery ecosystem')}
            <ArrowUpRight size={15} />
          </a>
        </div>
      </Dialog>
    </div>
  );
}
function RequestForm({
  locale,
  scenario,
  onCancel,
  onSubmit,
}: {
  locale: 'id' | 'en';
  scenario: Scenario;
  onCancel: () => void;
  onSubmit: (
    input: Partial<RecoveryRequest> & Pick<RecoveryRequest, 'category' | 'label' | 'position'>,
  ) => void;
}) {
  const t = (id: string, en: string) => (locale === 'en' ? en : id);
  const [label, setLabel] = useState(''),
    [category, setCategory] = useState<DeviceCategory>('laptop'),
    [home, setHome] = useState('0'),
    [intent, setIntent] = useState<'reuse' | 'repair' | 'recycle'>('reuse'),
    [permission, setPermission] = useState(false),
    [error, setError] = useState(''),
    [windowStart, setWindowStart] = useState(0),
    [windowEnd, setWindowEnd] = useState(180);
  const input = useRef<HTMLInputElement>(null);
  const homes = Array.from(
    new Map(
      scenario.requests.map((r) => [r.neighborhood, { name: r.neighborhood, position: r.position }]),
    ).values(),
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (label.trim().length < 3 || label.trim().length > 70) {
      setError(
        t(
          'Gunakan nama perangkat sepanjang 3 sampai 70 karakter.',
          'Use a device name from 3 to 70 characters.',
        ),
      );
      input.current?.focus();
      return;
    }
    const h = homes[Number(home)] || homes[0];
    onSubmit({
      category,
      label: label.trim(),
      position: h.position,
      neighborhood: h.name,
      intent,
      consent: permission,
      window: [windowStart, windowEnd],
    });
  };
  return (
    <form className="recovery-form" noValidate onSubmit={submit}>
      <label htmlFor="recovery-device-name">{t('Nama perangkat', 'Device name')}</label>
      <input
        id="recovery-device-name"
        ref={input}
        value={label}
        maxLength={70}
        onChange={(e) => {
          setLabel(e.target.value);
          setError('');
        }}
        placeholder={t('Contoh: laptop kuliah lama', 'Example: old study laptop')}
        aria-invalid={!!error}
        aria-describedby={error ? 'recovery-form-error' : undefined}
      />
      {error && (
        <p id="recovery-form-error" role="alert" className="recovery-field-error">
          {error}
        </p>
      )}
      <div className="recovery-form-pair">
        <div>
          <label htmlFor="recovery-device-category">{t('Jenis', 'Category')}</label>
          <select
            id="recovery-device-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as DeviceCategory)}
          >
            {categoryList.map((c) => (
              <option key={c} value={c}>
                {localizedPair(categoryNames, c, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="recovery-neighborhood">{t('Lingkungan contoh', 'Sample neighborhood')}</label>
          <select id="recovery-neighborhood" value={home} onChange={(e) => setHome(e.target.value)}>
            {homes.map((h, i) => (
              <option key={i} value={i}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label htmlFor="recovery-device-intent">{t('Tujuan pemilik', 'Owner’s intent')}</label>
      <select
        id="recovery-device-intent"
        value={intent}
        onChange={(e) => setIntent(e.target.value as typeof intent)}
      >
        <option value="reuse">{t('Tawarkan untuk penggunaan kembali', 'Offer for reuse')}</option>
        <option value="repair">{t('Minta pemeriksaan/perbaikan', 'Seek inspection/repair')}</option>
        <option value="recycle">{t('Serahkan untuk pengolahan', 'Return for treatment')}</option>
      </select>
      <div className="recovery-form-pair">
        <div>
          <label htmlFor="recovery-window-start">{t('Awal pengumpulan', 'Collection starts')}</label>
          <select
            id="recovery-window-start"
            value={windowStart}
            onChange={(e) => {
              const n = Number(e.target.value);
              setWindowStart(n);
              if (windowEnd <= n) setWindowEnd(Math.min(240, n + 60));
            }}
          >
            {[0, 30, 60, 90, 120, 150, 180].map((n) => (
              <option key={n} value={n}>
                {String(9 + Math.floor(n / 60)).padStart(2, '0')}.{String(n % 60).padStart(2, '0')} WIB
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="recovery-window-end">{t('Akhir pengumpulan', 'Collection ends')}</label>
          <select
            id="recovery-window-end"
            value={windowEnd}
            onChange={(e) => setWindowEnd(Number(e.target.value))}
          >
            {[30, 60, 90, 120, 150, 180, 210, 240]
              .filter((n) => n > windowStart)
              .map((n) => (
                <option key={n} value={n}>
                  {String(9 + Math.floor(n / 60)).padStart(2, '0')}.{String(n % 60).padStart(2, '0')} WIB
                </option>
              ))}
          </select>
        </div>
      </div>
      <label className="recovery-consent">
        <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} />
        <span>
          {t('Catat persetujuan pemilik pada contoh ini.', 'Record owner permission for this example.')}
          <small>
            {t(
              'Tanpa persetujuan, permintaan tetap dapat dicatat tetapi belum dijadwalkan.',
              'Without permission, the request can be recorded but remains unscheduled.',
            )}
          </small>
        </span>
      </label>
      <div className="recovery-form-footer">
        <Button variant="secondary" onClick={onCancel}>
          {t('Batal', 'Cancel')}
        </Button>
        <Button type="submit">
          {t('Tambahkan permintaan', 'Add request')}
          <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
function PermissionReview({
  request,
  locale,
  onClose,
  onSave,
}: {
  request: RecoveryRequest | null;
  locale: 'id' | 'en';
  onClose: () => void;
  onSave: (consent: boolean, dataCleared: boolean) => void;
}) {
  const t = (id: string, en: string) => (locale === 'en' ? en : id);
  const [consent, setConsent] = useState(false),
    [cleared, setCleared] = useState(false);
  useEffect(() => {
    setConsent(request?.consent || false);
    setCleared(request?.dataCleared || false);
  }, [request?.id, request?.consent, request?.dataCleared]);
  return (
    <Dialog
      open={!!request}
      onClose={onClose}
      title={t('Tinjauan perangkat', 'Device review')}
      description={request?.label}
      className="recovery-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Batal', 'Cancel')}
          </Button>
          <Button disabled={request?.phase === 'completed'} onClick={() => onSave(consent, cleared)}>
            {t('Catat hasil tinjauan', 'Record review')}
          </Button>
        </>
      }
    >
      {request && (
        <div className="recovery-settings">
          <label>
            <input
              type="checkbox"
              checked={consent}
              disabled={request.phase !== 'requested'}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t('Persetujuan penyerahan pemilik tercatat', 'Owner handover permission recorded')}
          </label>
          {request.dataBearing && (
            <label>
              <input
                type="checkbox"
                checked={cleared}
                disabled={request.phase !== 'received'}
                onChange={(e) => setCleared(e.target.checked)}
              />
              {t(
                'Pelepasan data ditinjau pada fasilitas penerima',
                'Data clearance reviewed at the receiving facility',
              )}
            </label>
          )}
          {request.phase === 'completed' && (
            <p className="recovery-small">
              {t('Catatan yang telah tuntas hanya dapat dibaca.', 'This completed record is read-only.')}
            </p>
          )}
          {request.dataBearing && request.phase !== 'received' && request.phase !== 'completed' && (
            <p className="recovery-small">
              {t(
                'Tinjauan pelepasan data tersedia setelah perangkat diterima.',
                'Data-clearance review becomes available after receipt.',
              )}
            </p>
          )}
          <p className="recovery-warning">
            {t(
              'Tindakan ini mencatat keputusan dalam demonstrasi. Tindakan ini tidak menghapus data perangkat nyata atau menerbitkan sertifikat.',
              'This records a decision in the demonstration. It does not erase a real device or issue a certificate.',
            )}
          </p>
        </div>
      )}
    </Dialog>
  );
}
