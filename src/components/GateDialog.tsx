import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, CheckCircle2 } from 'lucide-react';
import { Button, Dialog, Chip } from './ui';
import { useAppStore, useSnapshot } from '../state/store';
import { useLocale, categoryNames, localizedPair } from '../i18n';
import type { GateId, DecisionAction } from '../domain';
export default function GateDialog({
  open,
  onClose,
  gate,
}: {
  open: boolean;
  onClose: () => void;
  gate: GateId;
}) {
  const { t, locale } = useLocale();
  const s = useAppStore();
  const snapshot = useSnapshot();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ready =
    s.session.reviewToken?.gateId === gate &&
    s.session.reviewToken.revision === s.session.revision &&
    s.paused;
  const items = snapshot.assetList.filter((a) =>
    gate === 'hero'
      ? a.asset.requestId === 'JB-R036'
      : snapshot.submittedRequestIds.includes(a.asset.requestId) &&
        snapshot.context.eligibleAssetIds.includes(a.asset.id) &&
        (gate === 'specialist' ? a.asset.handlingClass === 'specialist' : a.asset.dataBearing),
  );
  const act = (action: DecisionAction) => {
    const r = s.decide(action);
    if (r.ok) {
      setError('');
      onClose();
    } else
      setError(
        t(
          'Otorisasi tinjauan telah berubah. Tinjau kembali titik keputusan.',
          'The review authorization changed. Review the checkpoint again.',
        ),
      );
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        gate === 'specialist'
          ? t('Tinjau penanganan khusus', 'Review specialist handling')
          : gate === 'data'
            ? t('Tinjau pelepasan data', 'Review data release')
            : t('Lengkapi permintaan penjemputan', 'Complete pickup request')
      }
      description={t(
        'Keputusan berlaku pada batch dan jendela layanan yang sedang dibuka.',
        'Your decision applies to this batch and service window.',
      )}
      footer={
        !ready ? (
          <Button
            onClick={() => {
              s.reviewGate(gate);
              setError('');
            }}
          >
            {t('Tinjau dari titik keputusan', 'Review from checkpoint')}
          </Button>
        ) : gate === 'hero' ? (
          <Button
            onClick={() => {
              onClose();
              navigate('/household/request?hero=1');
            }}
          >
            {t('Buka formulir permintaan', 'Open request form')}
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => act(gate === 'specialist' ? 'retain_specialist_hold' : 'retain_data_hold')}
            >
              {t('Pertahankan penahanan', 'Retain hold')}
            </Button>
            <Button
              onClick={() => act(gate === 'specialist' ? 'approve_specialist' : 'approve_data_release')}
              icon={<CheckCircle2 size={16} />}
            >
              {t('Setujui pelepasan', 'Approve release')}
            </Button>
          </>
        )
      }
    >
      <div className="gate-symbol">
        {gate === 'data' ? <LockKeyhole /> : <ShieldCheck />}
        <Chip tone="warning">{t('Persetujuan manusia', 'Human approval')}</Chip>
      </div>
      <p>
        {gate === 'specialist'
          ? t(
              `${items.length} perangkat memerlukan kendaraan khusus, wadah terpisah, dan serah terima ke jalur spesialis. Perangkat tetap belum dijemput jika penahanan dipertahankan.`,
              `${items.length} ${items.length === 1 ? 'device requires' : 'devices require'} a specialist vehicle, separated containers, and a specialist handoff. Retaining the hold leaves these devices uncollected.`,
            )
          : gate === 'data'
            ? t(
                'Pelepasan perangkat penyimpan data memerlukan persetujuan pemeriksaan pengamanan data. Jika ditahan, perangkat tetap di hub dan belum menghasilkan nilai pemulihan.',
                'Data-bearing devices require approval of their data-clearance review. Retaining the hold keeps them at the hub with no recovered value yet.',
              )
            : t(
                'Tinjau perangkat, kondisi, alamat, dan jendela penjemputan sebelum mengirimkan permintaan.',
                'Review the device, condition, address, and pickup window before submitting.',
              )}
      </p>
      {!ready && (
        <p className="notice">
          {t(
            'Peninjauan kembali memundurkan waktu ke titik keputusan dan membatalkan keputusan setelahnya.',
            'Reviewing again rewinds to the checkpoint and clears later decisions.',
          )}
        </p>
      )}
      <div className="gate-checks">
        <span>✓ {t('Jalur penanganan sesuai', 'Handling pathway matched')}</span>
        <span>✓ {t('Daftar perangkat tercatat', 'Device manifest recorded')}</span>
        <span>✓ {t('Tujuan dan kapasitas tersedia', 'Destination and capacity available')}</span>
      </div>
      <div className="gate-assets">
        {items.map((a) => (
          <div key={a.asset.id}>
            <span>{localizedPair(categoryNames, a.asset.category, locale)}</span>
            <code>{a.asset.id}</code>
          </div>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </Dialog>
  );
}
