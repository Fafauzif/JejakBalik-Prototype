import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Network,
  UsersRound,
  Boxes,
  ChartNoAxesCombined,
  House,
  Settings2,
  RotateCcw,
  Download,
  Upload,
  Check,
} from 'lucide-react';
import { Button, Dialog, EmptyState, IconButton } from '../components/ui';
import { RecoveryBoundary, RouteLoading } from './Recovery';
import GuidedJourney from '../features/journey/GuidedJourney';
import {
  useAppStore,
  useSnapshot,
  exportSessionJson,
  importSessionJson,
  exportAssetsCsv,
} from '../state/store';
import { useLocale } from '../i18n';
import { useNetworkStore } from '../state/network-store';
const NetworkPage = lazy(() => import('../features/network/NetworkPage'));
const TeamPage = lazy(() => import('../features/team/TeamPage'));
const ImpactPage = lazy(() => import('../features/impact/ImpactPage'));
const AssetsPage = lazy(() => import('../features/assets/AssetsPage'));
const HistoricalAssetPage = lazy(() =>
  import('../features/assets/AssetsPage').then((module) => ({ default: module.HistoricalAssetPage })),
);
const HouseholdPage = lazy(() => import('../features/household/HouseholdPage'));
function download(name: string, content: string, type = 'application/json') {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function Clock() {
  useEffect(() => {
    let last = performance.now();
    useNetworkStore.getState().advanceClock(last);
    const id = setInterval(() => {
      const now = performance.now();
      useAppStore.getState().tick((now - last) / 1000);
      useNetworkStore.getState().advanceClock(now);
      last = now;
    }, 100);
    return () => clearInterval(id);
  }, []);
  return null;
}
export default function App() {
  const { locale, t } = useLocale(),
    s = useAppStore(),
    snapshot = useSnapshot(),
    location = useLocation();
  const [settings, setSettings] = useState(false),
    [reset, setReset] = useState(false),
    [resetExtras, setResetExtras] = useState(false),
    [notice, setNotice] = useState(''),
    [importError, setImportError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
  }, [location.pathname]);
  const nav = [
    ['/network', t('Jaringan', 'Network'), Network],
    ['/team', t('Tim', 'Team'), UsersRound],
    ['/assets', t('Perangkat', 'Assets'), Boxes],
    ['/impact', t('Dampak', 'Impact'), ChartNoAxesCombined],
    ['/household', t('Rumah tangga', 'Household'), House],
  ] as const;
  return (
    <div className="app-shell">
      <Clock />
      <a href="#main-content" className="skip-link">
        {t('Lewati ke konten', 'Skip to content')}
      </a>
      <header className="app-header">
        <NavLink to="/network" className="brand" aria-label="Jejak Balik">
          <img className="brand-lockup" src="/brand/logo.svg" alt="Jejak Balik" />
        </NavLink>
        <nav className="main-nav" aria-label={t('Navigasi utama', 'Main navigation')}>
          {nav.map(([path, label, Icon]) => (
            <NavLink key={path} to={path}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="header-tools">
          <div className="locale-switch" aria-label={t('Bahasa', 'Language')}>
            <button aria-pressed={locale === 'id'} onClick={() => s.setLocale('id')}>
              ID
            </button>
            <button aria-pressed={locale === 'en'} onClick={() => s.setLocale('en')}>
              EN
            </button>
          </div>
          <IconButton label={t('Pengaturan', 'Settings')} onClick={() => setSettings(true)}>
            <Settings2 size={19} />
          </IconButton>
          <span className="profile-avatar" title={t('Ruang kerja Jakarta', 'Jakarta workspace')}>
            JB
          </span>
        </div>
      </header>
      <GuidedJourney />
      {(s.restoreNotice || notice) && (
        <div className="session-notice" role="status">
          <Check size={15} />
          <span>
            {notice ||
              (s.restoreNotice === 'recovered'
                ? t(
                    'Sesi tersimpan tidak dapat dibaca. Ruang kerja baru sudah siap.',
                    'The saved session could not be read. A fresh workspace is ready.',
                  )
                : t(
                    'Sesi tersimpan dibuka dalam keadaan dijeda.',
                    'Your saved session is restored and paused.',
                  ))}
          </span>
          <button
            onClick={() => {
              s.clearRestoreNotice();
              setNotice('');
            }}
            aria-label={t('Tutup pemberitahuan', 'Dismiss notice')}
          >
            ×
          </button>
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        <RecoveryBoundary key={location.pathname} english={locale === 'en'}>
          <Suspense fallback={<RouteLoading english={locale === 'en'} />}>
            <Routes>
              <Route path="/" element={<Navigate to="/network" replace />} />
              <Route path="/twin" element={<NetworkPage />} />
              <Route path="/network" element={<NetworkPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/assets/:id" element={<AssetRoute />} />
              <Route path="/impact/*" element={<ImpactPage />} />
              <Route path="/household/*" element={<HouseholdPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RecoveryBoundary>
      </main>
      <Dialog
        open={settings}
        onClose={() => setSettings(false)}
        title={t('Pengaturan ruang kerja', 'Workspace settings')}
        description={t(
          'Atur tampilan, batch aktif, dan sesi tersimpan.',
          'Manage display, active batches, and your saved session.',
        )}
      >
        <div className="settings-grid">
          {importError && (
            <p className="notice" role="alert">
              {importError}
            </p>
          )}
          <label>
            {t('Kualitas tampilan 3D', '3D display quality')}
            <select value={s.quality} onChange={(e) => s.setQuality(e.target.value as 'auto')}>
              <option value="auto">{t('Otomatis', 'Automatic')}</option>
              <option value="low">{t('Ringan', 'Light')}</option>
              <option value="high">{t('Tinggi', 'High')}</option>
            </select>
          </label>
          <label className="check-setting">
            <input
              type="checkbox"
              checked={s.reducedMotion}
              onChange={(e) => s.setReducedMotion(e.target.checked)}
            />
            {t('Kurangi gerakan', 'Reduce motion')}
          </label>
          <label>
            {t('Batch aktif', 'Active batch')}
            <select
              value={`${s.activeBatchId}/${s.activeWindowId}`}
              onChange={(e) => {
                const [batch, ...window] = e.target.value.split('/');
                s.selectBatch(batch, window.join('/'));
              }}
            >
              <option value="canonical/2026-10-19">{t('Operasi 19 Oktober', '19 October operations')}</option>
              {s.exploration.batches.flatMap((b) =>
                b.windows.map((w) => (
                  <option key={`${b.id}/${w.id}`} value={`${b.id}/${w.id}`}>
                    {b.id} · {w.date}
                  </option>
                )),
              )}
            </select>
          </label>
          <div className="settings-actions">
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => download('Jejak_Balik_Session.json', exportSessionJson())}
            >
              {t('Ekspor sesi JSON', 'Export session JSON')}
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() =>
                download('Jejak_Balik_Assets.csv', exportAssetsCsv(snapshot), 'text/csv;charset=utf-8')
              }
            >
              {t('Ekspor perangkat CSV', 'Export assets CSV')}
            </Button>
            <Button variant="secondary" icon={<Upload size={16} />} onClick={() => file.current?.click()}>
              {t('Impor sesi JSON', 'Import session JSON')}
            </Button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const result = importSessionJson(await f.text());
                if (result.ok) {
                  setImportError('');
                  setNotice(t('Sesi berhasil diimpor dan dijeda.', 'Session imported and paused.'));
                } else
                  setImportError(
                    t(
                      'Berkas tidak valid. Sesi aktif tetap tersimpan.',
                      'Invalid file. Your current session is preserved.',
                    ),
                  );
                e.target.value = '';
                if (result.ok) setSettings(false);
              }}
            />
          </div>
          <p className="muted">
            {t(
              'Sesi dan preferensi tersimpan di browser ini.',
              'Your session and preferences are saved in this browser.',
            )}
          </p>
          <Button variant="danger" icon={<RotateCcw size={15} />} onClick={() => setReset(true)}>
            {t('Mulai ulang skenario aktif', 'Restart active scenario')}
          </Button>
          <Button variant="secondary" onClick={() => setResetExtras(true)}>
            {t('Hapus permintaan tambahan', 'Reset exploration')}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={resetExtras}
        onClose={() => setResetExtras(false)}
        title={t('Hapus semua permintaan tambahan?', 'Clear all additional requests?')}
        description={t(
          'Permintaan tambahan dan reservasi kapasitasnya akan dihapus dari browser ini. Operasi utama tetap tersimpan.',
          'Additional requests and their capacity reservations will be cleared from this browser. Main operations remain saved.',
        )}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetExtras(false)}>
              {t('Batal', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                s.resetExploration();
                setResetExtras(false);
                setSettings(false);
              }}
            >
              {t('Hapus permintaan', 'Clear requests')}
            </Button>
          </>
        }
      >
        {t(
          'Ekspor sesi terlebih dahulu jika Anda ingin menyimpan riwayatnya.',
          'Export your session first if you want to keep its history.',
        )}
      </Dialog>
      <Dialog
        open={reset}
        onClose={() => setReset(false)}
        title={t('Mulai ulang skenario?', 'Restart this scenario?')}
        description={t(
          'Waktu dan keputusan pada jendela aktif akan dihapus. Batch lain tetap tersimpan.',
          'The active window’s timeline and decisions will be cleared. Other batches remain saved.',
        )}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReset(false)}>
              {t('Batal', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                s.reset();
                setReset(false);
                setSettings(false);
              }}
            >
              {t('Mulai ulang', 'Restart')}
            </Button>
          </>
        }
      >
        {t(
          'Anda dapat mengekspor sesi terlebih dahulu dari pengaturan.',
          'You can export the session from settings first.',
        )}
      </Dialog>
    </div>
  );
}

function AssetRoute() {
  const { id } = useParams();
  if (id?.startsWith('JB26-')) return <HistoricalAssetPage />;
  return <Navigate to={'/network?asset=' + encodeURIComponent(id || '')} replace />;
}

function NotFoundPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = t('Halaman tidak ditemukan · Jejak Balik', 'Page not found · Jejak Balik');
  }, [t]);
  return (
    <div className="page-wrap">
      <EmptyState
        title={t('Halaman tidak ditemukan', 'Page not found')}
        description={t(
          'Alamat ini tidak tersedia. Kembali ke jaringan untuk melanjutkan penjelajahan.',
          'This address is unavailable. Return to the network to continue exploring.',
        )}
        action={
          <Button onClick={() => navigate('/network')}>
            {t('Kembali ke jaringan', 'Return to network')}
          </Button>
        }
      />
    </div>
  );
}
