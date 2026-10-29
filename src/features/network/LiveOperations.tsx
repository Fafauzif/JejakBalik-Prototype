import { ArrowRight, Bike, Building2, Pause, Play, ShieldCheck, Truck } from 'lucide-react';
import { Chip, IconButton } from '../../components/ui';
import { useLocale } from '../../i18n';
import { LIVE_PHASE_LABELS, type LiveOperationsFrame, type LivePhase } from '../../domain/live-operations';
import { vehicles, world, partners } from '../../domain';
import { PLAYBACK_SPEEDS } from '../../domain/playback';
import { getLiveVehicleProfile } from '../../domain/partner-logistics';

type Translate = (id: string, en: string) => string;
export function livePhaseLabel(phase: LivePhase, t: Translate) {
  const label = LIVE_PHASE_LABELS[phase];
  return t(label.id, label.en);
}
export function liveVehicleLabel(id: string, t: Translate) {
  const item = vehicles.find((v) => v.id === id);
  const profile = getLiveVehicleProfile(id);
  if (profile) return t(profile.operator.id, profile.operator.en);
  const number = id.replace(/^V0?/, '');
  return t(
    item?.label || id,
    item?.handlingClass === 'bulky'
      ? `Large-item truck ${number}`
      : item?.handlingClass === 'specialist'
        ? `Specialist vehicle ${number}`
        : `Collection van ${number}`,
  );
}
function targetName(id: string, t: Translate) {
  return (
    world.households.find((h) => h.id === id)?.label ||
    partners.find((p) => p.id === id)?.name ||
    t('Pusat Konsolidasi', 'Consolidation hub')
  );
}
export function LiveStatusStrip({ frame, paused }: { frame: LiveOperationsFrame; paused: boolean }) {
  const { t } = useLocale();
  return (
    <section
      className="network-live-strip"
      aria-label={t('Status operasi berjalan', 'Live operation status')}
    >
      <div>
        <span className="live-status-label">
          <span className={`status-dot ${paused ? 'is-paused' : ''}`} />
          {paused
            ? t('Tampilan dijeda', 'View paused')
            : t('Model jaringan berjalan', 'Network model running')}
        </span>
        <p>
          {frame.fleet.movingVehicles} {t('kendaraan di perjalanan', 'vehicles on the move')} ·{' '}
          {frame.fleet.hubAssets} {t('perangkat di hub', 'devices at the hub')}
        </p>
      </div>
      <div className="live-clock">
        <span className="live-clock-value" aria-label={t('Jam operasi Jakarta', 'Jakarta operation clock')}>
          {frame.serviceClock}
        </span>
        <small>Jakarta · WIB</small>
      </div>
    </section>
  );
}
export function LiveOverview({
  frame,
  select,
  selectedId,
}: {
  frame: LiveOperationsFrame;
  select: (id: string, kind: string) => void;
  selectedId?: string;
}) {
  const { t, locale } = useLocale();
  return (
    <>
      <p>
        {t(
          'Armada mitra dan warga menjemput perangkat pada rute balik, putaran bersama, atau janji khusus. Pilih kendaraan untuk melihat perannya.',
          'Partner and community vehicles collect devices on return routes, shared rounds, or specialist appointments. Select a vehicle to inspect its role.',
        )}
      </p>
      <div className="live-fleet-list" aria-label={t('Armada aktif', 'Active fleet')}>
        {frame.vehicles.map((v) => (
          <button
            key={v.vehicleId}
            type="button"
            aria-pressed={selectedId === v.vehicleId}
            onClick={() => select(v.vehicleId, 'vehicle')}
            data-live-vehicle={v.vehicleId}
            data-phase={v.phase}
          >
            <span className="live-fleet-icon" style={{ color: v.profile.color }}>
              {v.profile.visualKind === 'cargo_bike' ? (
                <Bike size={18} strokeWidth={1.6} />
              ) : v.profile.visualKind === 'specialist' ? (
                <ShieldCheck size={18} strokeWidth={1.6} />
              ) : (
                <Truck size={18} strokeWidth={1.6} />
              )}
            </span>
            <span className="live-fleet-copy">
              <strong>{liveVehicleLabel(v.vehicleId, t)}</strong>
              <small>{livePhaseLabel(v.phase, t)}</small>
              <span className="live-fleet-progress" aria-hidden="true">
                <i style={{ transform: `scaleX(${v.progress})`, width: '100%', transformOrigin: 'left' }} />
              </span>
            </span>
            <span className="live-fleet-meta">
              <strong>{v.vehicleId}</strong>
              <small>
                {v.loadAssets} {t('perangkat', 'devices')}
              </small>
              {v.forwardLoadUnits > 0 && (
                <small>
                  {v.forwardLoadUnits} {t('paket antar', 'deliveries')}
                </small>
              )}
            </span>
          </button>
        ))}
      </div>
      <h3>{t('Serah terima terbaru', 'Latest handoffs')}</h3>
      <ol className="live-activity-list">
        {frame.activityFeed.slice(0, 3).map((event) => (
          <li key={event.id}>
            <span className="activity-dot" />
            <p>
              <strong>{locale === 'id' ? event.labelId : event.labelEn}</strong>
              <small>
                {event.vehicleId} · {targetName(event.targetId, t)} ·{' '}
                {Math.max(0, Math.floor(frame.elapsedSeconds - event.atElapsedSecond))}{' '}
                {t('dtk lalu', 'sec ago')}
              </small>
            </p>
          </li>
        ))}
      </ol>
      <button type="button" className="inspector-link live-hub-link" onClick={() => select('H01', 'hub')}>
        <Building2 size={15} />
        {t('Lihat aktivitas hub', 'View hub activity')}
        <ArrowRight size={15} />
      </button>
    </>
  );
}
export function LiveCadenceBar({
  paused,
  toggle,
  frame,
  speed,
  setSpeed,
}: {
  paused: boolean;
  toggle: () => void;
  frame: LiveOperationsFrame;
  speed: number;
  setSpeed: (value: number) => void;
}) {
  const { t } = useLocale();
  return (
    <section
      className="network-cadence-bar"
      aria-label={t('Kontrol operasi berjalan', 'Live operation controls')}
    >
      <div>
        <IconButton
          variant="primary"
          label={
            paused
              ? t('Lanjutkan operasi', 'Resume operations')
              : t('Jeda tampilan operasi', 'Pause operations view')
          }
          onClick={toggle}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </IconButton>
        <div>
          <strong>
            {paused
              ? t('Tampilan operasi dijeda', 'Operations view paused')
              : t('Ritme kota, terus berjalan.', 'The city keeps moving.')}
          </strong>
          <p>
            {t(
              'Antar mitra → jemput balik → konsolidasi → pemulihan.',
              'Partner delivery → return pickup → consolidation → recovery.',
            )}
          </p>
        </div>
      </div>
      <label className="network-speed-field">
        <span>{t('Laju operasi', 'Operation speed')}</span>
        <select
          aria-label={t('Kecepatan operasi', 'Operation speed')}
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          {PLAYBACK_SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>
      <Chip>
        {t('Beban kerja bergulir', 'Rolling workload')} · {frame.snapshot.assetList.length}{' '}
        {t('perangkat', 'devices')}
      </Chip>
    </section>
  );
}
