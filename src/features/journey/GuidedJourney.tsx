import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  MapPin,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { Button, Chip, IconButton } from '../../components/ui';
import GateDialog from '../../components/GateDialog';
import { useAppStore, useSnapshot } from '../../state/store';
import { useNetworkStore } from '../../state/network-store';
import { useLocale } from '../../i18n';
import type { GateId } from '../../domain/types';
import { canContinueJourney, JOURNEY_STEPS, journeyStepAtCursor } from './journey-model';

/** Explanatory steps are user-controlled. Seeking a view never grants a review decision. */
export default function GuidedJourney() {
  const s = useAppStore();
  const snap = useSnapshot();
  const { t, number, money } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [gate, setGate] = useState<GateId | null>(null);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const wasActive = useRef(false);
  const step = JOURNEY_STEPS[stepIndex];
  const actions = s.session.decisions.map((decision) => decision.action);
  const ready = canContinueJourney(stepIndex, actions);
  const submitted = actions.includes('submit_hero');

  const focusStep = (index: number, focusHeading = true) => {
    const target = JOURNEY_STEPS[index];
    s.pause();
    s.seek(target.cursor);
    s.setSceneMode(target.scene);
    useNetworkStore.getState().setView('tutorial');
    const query =
      target.scene === 'device'
        ? '?asset=JB-A036'
        : target.scene === 'hub'
          ? '?mode=hub'
          : index === 0
            ? '?request=JB-R036'
            : '';
    navigate('/network' + query, { replace: true });
    setStepIndex(index);
    setError('');
    setGate(null);
    if (focusHeading) requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (s.journeyActive && (!wasActive.current || s.cursor === 0))
      focusStep(journeyStepAtCursor(s.cursor), false);
    if (!s.journeyActive) setGate(null);
    wasActive.current = s.journeyActive;
  }, [s.journeyActive, s.cursor]);

  useEffect(() => {
    if (!s.journeyActive) return;
    // Leaving through normal navigation is always allowed and ends the guide cleanly.
    if (location.pathname !== '/network') {
      s.pause();
      s.setJourneyActive(false);
      useNetworkStore.getState().setView('live');
    } else if (!s.paused) s.pause();
  }, [location.pathname, s.journeyActive, s.paused]);

  if (!s.journeyActive || location.pathname !== '/network') return null;
  const finish = () => {
    s.pause();
    s.setJourneyActive(false);
    useNetworkStore.getState().setView('live');
    s.setSceneMode('city');
    navigate('/network', { replace: true });
  };
  const submit = () => {
    s.reviewGate('hero');
    const result = useAppStore.getState().submitHero();
    if (!result.ok)
      setError(
        t(
          'Permintaan belum terkirim. Coba tinjau kembali.',
          'The request was not submitted. Please review it again.',
        ),
      );
  };
  const review = () => {
    if (step.gate && step.gate !== 'hero') {
      // Opening a review is reversible. The dialog separately explains and authorizes any rewind.
      setGate(step.gate);
    }
  };
  return (
    <>
      <section className="guided-story" aria-label={t('Panduan satu perangkat', 'One-device walkthrough')}>
        <div className="guided-story-top">
          <span className="guided-story-label">
            <Compass size={15} />
            {t('SATU PERANGKAT. SATU PERJALANAN.', 'ONE DEVICE. ONE JOURNEY.')}
          </span>
          <IconButton size="sm" label={t('Akhiri panduan', 'End guided journey')} onClick={finish}>
            <X size={17} />
          </IconButton>
        </div>
        <ol className="guided-story-progress" aria-label={t('Tahap panduan', 'Journey steps')}>
          {JOURNEY_STEPS.map((item, index) => (
            <li
              key={item.id}
              className={index === stepIndex ? 'current' : index < stepIndex ? 'visited' : ''}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <span>{index < stepIndex ? <Check size={11} /> : index + 1}</span>
              <span>{t(...item.title)}</span>
            </li>
          ))}
        </ol>
        <div className="guided-story-body">
          <div className="guided-story-copy">
            <div className="guided-story-meta">
              {t(
                `Langkah ${stepIndex + 1} dari 5 · Anda mengatur langkahnya`,
                `Step ${stepIndex + 1} of 5 · At your pace`,
              )}
            </div>
            <h2 ref={heading} tabIndex={-1}>
              {t(...step.title)}
            </h2>
            <p>{t(...step.copy)}</p>
            <span className="guided-story-hint">
              <MapPin size={14} />
              {t(
                'Anda tetap di jaringan. Jelajahi dunia di bawah bila ingin.',
                'You stay in the network. Explore the world below whenever you like.',
              )}
            </span>
          </div>
          <div className="guided-story-card">
            {stepIndex === 0 ? (
              <>
                <div className="guided-story-device">
                  <Smartphone size={27} />
                  <div>
                    <strong>{t('Ponsel lama · JB-A036', 'Old phone · JB-A036')}</strong>
                    <span>
                      {t('Contoh rumah tangga · permintaan JB-R036', 'Sample household · request JB-R036')}
                    </span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>{t('Tujuan', 'Purpose')}</dt>
                    <dd>{t('Penilaian guna ulang', 'Reuse assessment')}</dd>
                  </div>
                  <div>
                    <dt>{t('Penyimpanan data', 'Data storage')}</dt>
                    <dd>{t('Perlu tinjauan', 'Review required')}</dd>
                  </div>
                </dl>
                {submitted ? (
                  <Chip tone="success">
                    <CheckCircle2 size={13} /> {t('Permintaan contoh terkirim', 'Sample request submitted')}
                  </Chip>
                ) : (
                  <Button size="sm" onClick={submit}>
                    {t('Kirim permintaan contoh', 'Submit sample request')}
                  </Button>
                )}
              </>
            ) : stepIndex === 1 || stepIndex === 3 ? (
              <>
                {stepIndex === 1 && (
                  <dl className="guided-readiness">
                    <div>
                      <dt>{t('Pembeli layanan', 'Service buyer')}</dt>
                      <dd>{t('Institusi / program komunitas', 'Institution / community program')}</dd>
                    </div>
                    <div>
                      <dt>{t('Pendanaan contoh', 'Sample funding')}</dt>
                      <dd>
                        {money(snap.metrics.serviceContractFeeIdr + snap.metrics.communityAccessSponsorIdr)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('Kapasitas tujuan', 'Receiving capacity')}</dt>
                      <dd>{t('Diperiksa oleh aturan skenario', 'Checked by scenario rules')}</dd>
                    </div>
                    <div>
                      <dt>{t('Penanganan khusus', 'Specialist handling')}</dt>
                      <dd>
                        {ready
                          ? t('Keputusan tercatat', 'Decision recorded')
                          : t('Menunggu keputusan Anda', 'Awaiting your decision')}
                      </dd>
                    </div>
                  </dl>
                )}
                <div className="guided-story-device">
                  <ShieldCheck size={27} />
                  <div>
                    <strong>
                      {stepIndex === 1
                        ? t('Penanganan khusus', 'Specialist handling')
                        : t('Pemeriksaan pengamanan data', 'Data-clearance review')}
                    </strong>
                    <span>{t('Keputusan Anda diperlukan', 'Your decision is required')}</span>
                  </div>
                </div>
                <p>
                  {ready
                    ? t(
                        'Keputusan tercatat. Anda dapat melanjutkan atau meninjau ulang.',
                        'Decision recorded. Continue or review it again.',
                      )
                    : t(
                        'Lihat syarat dan daftar perangkat sebelum memilih. Sistem tidak menyetujui atas nama Anda.',
                        'Inspect the requirements and manifest before choosing. The system does not approve for you.',
                      )}
                </p>
                <Button size="sm" variant={ready ? 'secondary' : 'primary'} onClick={review}>
                  {ready
                    ? t('Tinjau ulang keputusan', 'Review decision again')
                    : t('Tinjau dan pilih', 'Review and choose')}
                </Button>
              </>
            ) : stepIndex === 2 ? (
              <>
                <strong>{t('Penerimaan → pemeriksaan → penyaluran', 'Intake → inspection → routing')}</strong>
                <p>
                  {t(
                    'Pilih stasiun di hub untuk melihat antrean. Detail opsional; Anda dapat langsung melanjutkan.',
                    'Select a hub station to inspect its queue. This is optional; continue whenever you are ready.',
                  )}
                </p>
                <Chip tone="info">
                  {number(snap.metrics.collectedAssets)} {t('perangkat dijemput', 'devices collected')}
                </Chip>
              </>
            ) : (
              <>
                <div className="guided-story-results">
                  <div>
                    <strong>{number(snap.metrics.completedAssets)}</strong>
                    <span>{t('selesai', 'completed')}</span>
                  </div>
                  <div>
                    <strong>{number(snap.metrics.heldAtHub + snap.metrics.heldUncollected)}</strong>
                    <span>{t('masih ditahan', 'still held')}</span>
                  </div>
                </div>
                <p>
                  {t(
                    'Rincian biaya dan hasil tetap tersedia setelah panduan.',
                    'Detailed costs and outcomes remain available after the walkthrough.',
                  )}
                </p>
                <Link to="/impact?dataset=tutorial" className="guided-story-link">
                  {t('Buka rincian hasil', 'Open outcome details')} <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
        {error && (
          <p className="guided-story-error" role="alert">
            {error}
          </p>
        )}
        <div className="guided-story-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => focusStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            icon={<ArrowLeft size={15} />}
          >
            {t('Kembali', 'Back')}
          </Button>
          <button className="guided-story-exit" onClick={finish}>
            {t('Lewati panduan', 'Skip walkthrough')}
          </button>
          <Button
            size="sm"
            onClick={() => (stepIndex === JOURNEY_STEPS.length - 1 ? finish() : focusStep(stepIndex + 1))}
            disabled={!ready}
            icon={<ArrowRight size={15} />}
          >
            {stepIndex === JOURNEY_STEPS.length - 1
              ? t('Selesai, jelajahi jaringan', 'Finish and explore')
              : t('Lanjut', 'Next step')}
          </Button>
        </div>
        {!ready && (
          <p className="guided-story-required" role="status">
            {t(
              'Selesaikan keputusan di atas untuk melanjutkan. Anda selalu dapat keluar.',
              'Complete the decision above to continue. You can always exit.',
            )}
          </p>
        )}
      </section>
      {gate && <GateDialog key={gate} gate={gate} open onClose={() => setGate(null)} />}
    </>
  );
}
