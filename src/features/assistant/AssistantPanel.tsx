import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import { Button, Chip } from '../../components/ui';
import { useLocale } from '../../i18n';
import { validateSuggestion, type Suggestion } from './contract';
import { localSuggestion } from './local';
import './assistant.css';
const fieldLabels: Record<string, [string, string]> = {
  owner_intent: ['Tujuan pemilik', 'Owner’s intent'],
  ownership: ['Kewenangan pemilik', 'Ownership authority'],
  condition: ['Kondisi aktual', 'Actual condition'],
  battery_condition: ['Kondisi baterai', 'Battery condition'],
  data_backup: ['Cadangan data', 'Data backup'],
  quantity: ['Jumlah perangkat', 'Device quantity'],
  receiver_acceptance: ['Penerimaan mitra', 'Receiver acceptance'],
  data_review: ['Tinjauan data', 'Data review'],
  specialist_review: ['Tinjauan khusus', 'Specialist review'],
  ownership_review: ['Tinjauan kepemilikan', 'Ownership review'],
  condition_unknown: ['Kondisi belum pasti', 'Condition unconfirmed'],
  capacity_review: ['Tinjauan kapasitas', 'Capacity review'],
};
const categories: Record<string, [string, string]> = {
  phone: ['Ponsel', 'Phone'],
  laptop: ['Laptop', 'Laptop'],
  tablet: ['Tablet', 'Tablet'],
  router: ['Router', 'Router'],
  accessories: ['Aksesori', 'Accessories'],
  appliance: ['Peralatan', 'Appliance'],
  battery: ['Baterai', 'Battery'],
  unknown: ['Belum diketahui', 'Unknown'],
};
export default function AssistantPanel() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(
    'Laptop lama saya masih menyala, tetapi foto pribadi masih tersimpan di dalamnya.',
  );
  const [access, setAccess] = useState('');
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ suggestion: Suggestion; source: 'ai' | 'local' } | null>(null);
  const request = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Suggestion>());
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setResult(null);
    setError('');
  }, [text, locale]);
  const label = (map: Record<string, [string, string]>, key: string) =>
    map[key]?.[locale === 'en' ? 1 : 0] ?? key;
  const review = async () => {
    if (text.trim().length < 3 || busy) return;
    setError('');
    if (!live) {
      setResult({ source: 'local', suggestion: localSuggestion({ task: 'intake', text, locale }) });
      return;
    }
    const key = JSON.stringify([locale, text]);
    const cached = cache.current.get(key);
    if (cached) {
      setResult({ source: 'ai', suggestion: cached });
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Demo-Access': access },
        body: JSON.stringify({ task: 'intake', text, locale }),
      });
      if (!response.ok) {
        if (response.status === 401)
          throw new Error(
            t(
              'Kode akses belum sesuai. Periksa kembali atau gunakan tinjauan lokal.',
              'The access code was not accepted. Check it or use local review.',
            ),
          );
        if (response.status === 429)
          throw new Error(
            t(
              'Batas demo tercapai. Tinjauan lokal tetap tersedia.',
              'The demo limit has been reached. Local review remains available.',
            ),
          );
        throw new Error(
          t(
            'AI belum tersedia. Gunakan tinjauan lokal untuk melanjutkan.',
            'AI is unavailable. Use local review to continue.',
          ),
        );
      }
      const data = await response.json();
      const suggestion = validateSuggestion(data?.suggestion);
      if (!suggestion || data?.source !== 'ai')
        throw new Error(
          t(
            'Jawaban belum dapat divalidasi. Coba tinjauan lokal.',
            'The response could not be validated. Try local review.',
          ),
        );
      if (request.current !== controller) return;
      cache.current.set(key, suggestion);
      setResult({ source: 'ai', suggestion });
    } catch (e) {
      if (request.current !== controller) return;
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : t('AI belum tersedia.', 'AI is unavailable.'));
      else
        setError(
          t('Waktu tunggu habis. Gunakan tinjauan lokal.', 'The request timed out. Use local review.'),
        );
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  };
  return (
    <section
      className="assistant-panel"
      aria-label={t('Asisten tinjauan opsional', 'Optional review assistant')}
    >
      <button
        type="button"
        className="assistant-toggle"
        aria-expanded={open}
        aria-controls="assistant-content"
        onClick={() => {
          if (open) {
            setAccess('');
            request.current?.abort();
            request.current = null;
            setBusy(false);
          }
          setOpen(!open);
        }}
      >
        <span className="assistant-icon">
          <Sparkles size={18} />
        </span>
        <span>
          <strong>{t('Butuh bantuan meninjau perangkat?', 'Need help reviewing a device?')}</strong>
          <small>
            {t(
              'Tinjauan singkat, keputusan tetap di tangan operator.',
              'A short review. The operator stays in control.',
            )}
          </small>
        </span>
        <ChevronDown size={18} className={open ? 'assistant-chevron-open' : ''} />
      </button>
      {open && (
        <div id="assistant-content" className="assistant-content">
          <div className="assistant-intro">
            <Chip tone="info">{t('Opsional', 'Optional')}</Chip>
            <p>
              {t(
                'Coba deskripsi contoh. Tinjauan tidak mengubah jadwal, persetujuan, atau hasil perangkat.',
                'Try a sample description. A review does not change schedules, approvals, or device outcomes.',
              )}
            </p>
          </div>
          <label className="assistant-label" htmlFor="assistant-description">
            {t('Deskripsi perangkat', 'Device description')}
          </label>
          <textarea
            className="resize-none"
            id="assistant-description"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            disabled={busy}
          />
          <div className="assistant-input-meta">
            <span>
              {t(
                'Gunakan contoh tanpa nama, alamat, atau data pribadi.',
                'Use examples without names, addresses, or personal data.',
              )}
            </span>
            <span>{text.length}/2000</span>
          </div>
          <div className="assistant-mode">
            <label>
              <input
                type="checkbox"
                checked={live}
                disabled={busy}
                onChange={(e) => {
                  setLive(e.target.checked);
                  setResult(null);
                  setError('');
                }}
              />
              {t('Gunakan AI langsung · akses demo', 'Use live AI · demo access')}
            </label>
            {!live && <span>{t('Tinjauan lokal · tanpa kredit', 'Local review · no credits')}</span>}
          </div>
          {live && (
            <div className="assistant-access">
              <label className="assistant-label" htmlFor="assistant-access">
                {t('Kode akses demo', 'Demo access code')}
              </label>
              <input
                id="assistant-access"
                type="password"
                value={access}
                autoComplete="off"
                maxLength={256}
                disabled={busy}
                onChange={(e) => setAccess(e.target.value)}
              />
              <small>
                {t(
                  'Masukkan kode demo, bukan API key OpenRouter. Kode hanya disimpan sementara di memori halaman ini.',
                  'Enter the demo code, not the OpenRouter API key. It stays only in memory on this page.',
                )}
              </small>
            </div>
          )}
          <div className="assistant-actions">
            <Button
              onClick={review}
              busy={busy}
              disabled={text.trim().length < 3 || (live && !access)}
              icon={<ArrowRight size={15} />}
            >
              {t('Tinjau deskripsi', 'Review description')}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setText(
                  locale === 'en'
                    ? 'An old laptop still turns on, but my private photos are on it.'
                    : 'Laptop lama saya masih menyala, tetapi foto pribadi masih tersimpan di dalamnya.',
                );
                setResult(null);
                setError('');
              }}
              icon={<RotateCcw size={14} />}
            >
              {t('Contoh', 'Example')}
            </Button>
          </div>
          {error && (
            <div className="assistant-error" role="alert">
              <p>{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLive(false);
                  setError('');
                  setResult({
                    source: 'local',
                    suggestion: localSuggestion({ task: 'intake', text, locale }),
                  });
                }}
              >
                {t('Gunakan tinjauan lokal', 'Use local review')}
              </Button>
            </div>
          )}
          {result && (
            <article className="assistant-result" aria-live="polite">
              <div className="assistant-result-heading">
                <ShieldCheck size={17} />
                <strong>{t('Usulan tinjauan', 'Review suggestion')}</strong>
                <Chip tone={result.source === 'ai' ? 'info' : 'neutral'}>
                  {result.source === 'ai' ? t('AI langsung', 'Live AI') : t('Aturan lokal', 'Local rules')}
                </Chip>
              </div>
              <p>{result.suggestion.summary}</p>
              <dl>
                <div>
                  <dt>{t('Kategori sementara', 'Provisional category')}</dt>
                  <dd>{label(categories, result.suggestion.category)}</dd>
                </div>
                <div>
                  <dt>{t('Perlu dikonfirmasi', 'Confirm next')}</dt>
                  <dd>
                    {result.suggestion.missingFields.length
                      ? result.suggestion.missingFields.map((k) => label(fieldLabels, k)).join(' · ')
                      : t(
                          'Konfirmasi operator tetap diperlukan.',
                          'Operator confirmation is still required.',
                        )}
                  </dd>
                </div>
              </dl>
              <div className="assistant-flags">
                {result.suggestion.flags.map((k) => (
                  <Chip key={k} tone="warning">
                    {label(fieldLabels, k)}
                  </Chip>
                ))}
              </div>
              <div className="assistant-next">
                <strong>{t('Langkah berikutnya', 'Next step')}</strong>
                <p>{result.suggestion.nextStep}</p>
              </div>
              <small>
                {t(
                  'Usulan awal. Kondisi fisik, kapasitas mitra, dan bukti penanganan harus diverifikasi terpisah.',
                  'Preliminary suggestion. Physical condition, partner capacity, and handling evidence require separate verification.',
                )}
              </small>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
