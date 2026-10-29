import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Plus,
  Minus,
  PackageCheck,
  LockKeyhole,
  Truck,
} from 'lucide-react';
import { Button, Chip } from '../../components/ui';
import { useLocale } from '../../i18n';
import { addExplorationRequest, explorationTemplates } from '../../domain';
import { useAppStore } from '../../state/store';
import ItemIllustration from './ItemIllustration';
import { categoryLabels, conditionLabels, translated } from './labels';
import s from './household.module.css';

type DraftItem = { category: string; condition: string };
type Draft = {
  step: number;
  items: DraftItem[];
  addressAlias: string;
  addressId: string;
  confirmed: boolean;
};
const DRAFT_KEY = 'jejak-balik-household-draft-v1';
const initialDraft: Draft = {
  step: 0,
  items: [{ category: 'phone', condition: 'functional' }],
  addressAlias: 'Jl. Seruni 6, Jakarta',
  addressId: 'HH-036',
  confirmed: false,
};
function restoreDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (
      value &&
      Array.isArray(value.items) &&
      value.items.length >= 1 &&
      value.items.length <= 3 &&
      value.items.every((x: DraftItem) =>
        explorationTemplates.templates.some(
          (q) => q.category === x.category && Object.keys(q.conditionToDisposition).includes(x.condition),
        ),
      )
    )
      return {
        ...initialDraft,
        items: value.items,
        step: Math.min(3, Math.max(0, Math.floor(Number(value.step) || 0))),
        addressAlias:
          typeof value.addressAlias === 'string'
            ? value.addressAlias.slice(0, 120)
            : initialDraft.addressAlias,
        addressId: initialDraft.addressId,
        confirmed: value.confirmed === true,
      };
  } catch {
    /* A malformed browser draft safely returns to the sample. */
  }
  return initialDraft;
}

export default function RequestForm() {
  const { t, locale, date, money, number } = useLocale();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const hero = search.get('hero') === '1';
  const app = useAppStore();
  const [draft, setDraft] = useState<Draft>(() => {
    if (hero) return initialDraft;
    const category = search.get('category');
    return category && explorationTemplates.templates.some((x) => x.category === category)
      ? {
          ...initialDraft,
          items: [{ category, condition: category === 'battery' ? 'intact' : 'functional' }],
        }
      : restoreDraft();
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const set = (part: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...part }));
    setError('');
  };
  useEffect(() => {
    if (!hero)
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* The in-memory draft remains usable. */
      }
  }, [draft, hero]);
  useEffect(() => {
    if (draft.step > 0) titleRef.current?.focus();
  }, [draft.step]);

  const previewWindows = useMemo(() => {
    if (hero) return [{ id: 'canonical', date: '2026-10-19', count: 1 }];
    const preview = addExplorationRequest(app.exploration, {
      items: draft.items,
      addressId: draft.addressId,
      addressAlias: draft.addressAlias,
    });
    if (!preview.ok) return [];
    const batch = preview.state.batches.find((x) => x.id === preview.batchId)!;
    const request = batch.requests.find((x) => x.id === preview.requestId)!;
    return batch.windows
      .map((window) => ({
        id: window.id,
        date: window.date,
        count: window.assetIds.filter((x) => request.assetIds.includes(x)).length,
      }))
      .filter((x) => x.count > 0);
  }, [app.exploration, draft.items, draft.addressId, draft.addressAlias, hero]);
  const availableDate = previewWindows[0]?.date ?? '2026-10-21';
  const hasSpecialist = draft.items.some((x) => x.category === 'battery');
  const hasBulky = draft.items.some((x) => x.category === 'large_appliance');
  const hasData = draft.items.some((x) => ['phone', 'laptop', 'tablet'].includes(x.category));
  const atCap = !hero && app.exploration.requestCount >= 6;
  const waitingForHero =
    hero &&
    app.journeyActive &&
    !(
      app.activeBatchId === 'canonical' &&
      app.cursor === 32 &&
      app.paused &&
      app.session.reviewToken?.gateId === 'hero'
    );
  const steps = [
    t('Perangkat', 'Your items'),
    t('Kondisi', 'Condition'),
    t('Penjemputan', 'Pickup'),
    t('Konfirmasi', 'Review'),
  ];
  const headings = [
    t('Beri ruang untuk yang berikutnya.', 'Make room for what comes next.'),
    t('Kenali perangkat Anda.', 'A closer look at your items.'),
    t('Kami jemput dari lingkungan Anda.', 'We collect from your neighborhood.'),
    t('Sudah sesuai? Mari dijemput.', 'All set? Let’s arrange your pickup.'),
  ];
  const descriptions = [
    t(
      'Pilih contoh perangkat. Anda bisa mengajukan 1–3 perangkat dalam satu permintaan.',
      'Choose a sample item. Add 1–3 items to one pickup request.',
    ),
    t(
      'Kondisi yang tepat membantu tim menentukan jalur penanganan.',
      'The right condition helps the team find a suitable recovery pathway.',
    ),
    t(
      'Alamat contoh sudah tersedia. Tidak perlu nomor telepon atau lokasi perangkat Anda.',
      'A sample address is ready. No phone number or device location is needed.',
    ),
    t(
      'Periksa perangkat, alamat, dan jadwal sebelum mengirim permintaan.',
      'Check your items, address, and pickup window before sending your request.',
    ),
  ];

  function changeStep(step: number) {
    if (step > draft.step && draft.step === 2 && !draft.addressAlias.trim()) {
      setError(
        t(
          'Isi nama lingkungan atau gunakan alamat contoh.',
          'Enter a neighborhood name or use the sample address.',
        ),
      );
      document.getElementById('pickup-address')?.focus();
      return;
    }
    set({ step });
  }
  function add(category: string) {
    if (draft.items.length >= 3) return;
    set({
      items: [...draft.items, { category, condition: category === 'battery' ? 'intact' : 'functional' }],
    });
  }
  function submit() {
    if (submitted.current || submitting) return;
    const current = useAppStore.getState();
    if (
      hero &&
      current.journeyActive &&
      !(
        current.activeBatchId === 'canonical' &&
        current.cursor === 32 &&
        current.paused &&
        current.session.reviewToken?.gateId === 'hero'
      )
    )
      return;
    if (!draft.confirmed) {
      setError(
        t(
          'Konfirmasikan informasi penjemputan untuk melanjutkan.',
          'Confirm the pickup details to continue.',
        ),
      );
      document.getElementById('confirm-pickup')?.focus();
      return;
    }
    if (atCap) {
      setError(
        t(
          'Enam permintaan sudah dibuat. Tinjau permintaan Anda atau reset sesi melalui pengaturan.',
          'You have created six requests. Review your requests or reset the session in settings.',
        ),
      );
      return;
    }
    submitted.current = true;
    setSubmitting(true);
    if (hero) {
      if (!app.journeyActive) {
        if (app.activeBatchId !== 'canonical') app.selectBatch('canonical');
        app.reviewGate('hero');
      }
      const result = app.submitHero();
      if (result.ok) {
        app.play();
        navigate('/household/requests/JB-R036');
      } else {
        submitted.current = false;
        setSubmitting(false);
        setError(
          t(
            'Tinjau kembali permintaan untuk mengonfirmasi penjemputan.',
            'Review the request again to confirm your pickup.',
          ),
        );
      }
      return;
    }
    const result = app.addRequest({
      items: draft.items,
      addressId: draft.addressId,
      addressAlias: draft.addressAlias.trim(),
      contactAlias: 'Warga Seruni',
    });
    if (result.ok && result.requestId) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* No persistence available. */
      }
      navigate(`/household/requests/${result.requestId}`);
    } else {
      submitted.current = false;
      setSubmitting(false);
      setError(
        t(
          'Permintaan belum tersimpan. Periksa jumlah perangkat dan batas enam permintaan, lalu coba lagi.',
          'Your request was not saved. Check the item count and six-request limit, then try again.',
        ),
      );
    }
  }

  return (
    <div className={s.page}>
      <Link to="/household" className={s.backLink}>
        <ArrowLeft size={16} />
        {t('Rumah tangga', 'Household')}
      </Link>
      <div className={s.formProgress} aria-label={t('Tahap pengajuan', 'Request steps')}>
        {steps.map((name, i) => (
          <button
            type="button"
            key={i}
            onClick={() => {
              if (i < draft.step) changeStep(i);
            }}
            disabled={i > draft.step}
            aria-current={draft.step === i ? 'step' : undefined}
            className={`${s.step} ${draft.step === i ? s.stepActive : ''} ${draft.step > i ? s.stepDone : ''}`}
          >
            <span>{draft.step > i ? <Check size={15} /> : i + 1}</span>
            <b>{name}</b>
          </button>
        ))}
      </div>
      <div className={s.formLayout}>
        <div className={s.formMain}>
          <header className={s.formHeading}>
            <p className={s.eyebrow}>{t('PENJEMPUTAN PERANGKAT', 'DEVICE PICKUP')}</p>
            <h1 tabIndex={-1} ref={titleRef}>
              {headings[draft.step]}
            </h1>
            <p>{descriptions[draft.step]}</p>
          </header>
          {atCap && (
            <div className={s.warning}>
              <PackageCheck size={20} />
              <div>
                <strong>{t('Enam permintaan sudah tersedia.', 'Six requests are already available.')}</strong>
                <p>
                  {t(
                    'Tinjau status penjemputan Anda. Untuk memulai ulang, gunakan Reset eksplorasi di menu pengaturan.',
                    'Review your pickup status. To start over, use Reset exploration in the settings menu.',
                  )}
                </p>
                <Link to="/household">
                  {t('Lihat permintaan', 'View requests')} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.step < 3) changeStep(draft.step + 1);
              else submit();
            }}
          >
            {draft.step === 0 && (
              <>
                <div className={s.selectionHeader}>
                  <h2>{t('Perangkat yang dipilih', 'Selected items')}</h2>
                  <span>{draft.items.length} / 3</span>
                </div>
                <div className={s.selectedItems}>
                  {draft.items.map((item, i) => (
                    <div className={s.selectedItem} key={`${item.category}-${i}`}>
                      <div className={s.smallProduct}>
                        <ItemIllustration category={item.category} />
                      </div>
                      <div>
                        <strong>{translated(categoryLabels, item.category, locale)}</strong>
                        <small>
                          {t('Contoh perangkat', 'Sample item')} · 1 {t('unit', 'item')}
                        </small>
                      </div>
                      {!hero && draft.items.length > 1 && (
                        <button
                          className={s.removeButton}
                          type="button"
                          aria-label={`${t('Hapus', 'Remove')} ${translated(categoryLabels, item.category, locale)} ${i + 1}`}
                          onClick={() => set({ items: draft.items.filter((_, index) => i !== index) })}
                        >
                          <Minus size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!hero && (
                  <>
                    <div className={s.selectionHeader}>
                      <h2>{t('Tambahkan perangkat', 'Add an item')}</h2>
                      <span>{t('10 kategori', '10 categories')}</span>
                    </div>
                    <div className={s.categoryGrid}>
                      {explorationTemplates.templates.map((item) => (
                        <button
                          className={s.categoryTile}
                          key={item.category}
                          type="button"
                          disabled={draft.items.length >= 3}
                          onClick={() => add(item.category)}
                          aria-label={`${t('Tambahkan', 'Add')} ${translated(categoryLabels, item.category, locale)}`}
                        >
                          <ItemIllustration category={item.category} />
                          <span>{translated(categoryLabels, item.category, locale)}</span>
                          <Plus size={14} className={s.tilePlus} />
                        </button>
                      ))}
                    </div>
                    {draft.items.length === 3 && (
                      <p className={s.fieldHint}>
                        {t(
                          'Maksimal tiga perangkat. Hapus satu perangkat untuk mengganti pilihan.',
                          'Up to three items. Remove an item to choose another.',
                        )}
                      </p>
                    )}
                  </>
                )}
                {hero && (
                  <div className={s.infoNote}>
                    <CheckCircle2 size={19} />
                    <p>
                      {t(
                        'Ponsel contoh sudah siap. Tinjau kondisinya sebelum menentukan jadwal.',
                        'Your sample phone is ready. Review its condition before confirming pickup.',
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
            {draft.step === 1 && (
              <div className={s.conditionList}>
                {draft.items.map((item, index) => {
                  const template = explorationTemplates.templates.find((x) => x.category === item.category)!;
                  return (
                    <section className={s.conditionCard} key={index}>
                      <div className={s.conditionIdentity}>
                        <div className={s.smallProduct}>
                          <ItemIllustration category={item.category} />
                        </div>
                        <div>
                          <h2>{translated(categoryLabels, item.category, locale)}</h2>
                          <small>
                            {t('Perangkat', 'Item')} {index + 1} · {number(template.massKg, 2)} kg
                          </small>
                        </div>
                      </div>
                      <label htmlFor={`condition-${index}`}>
                        {t('Kondisi perangkat', 'Device condition')}
                      </label>
                      <select
                        id={`condition-${index}`}
                        value={item.condition}
                        disabled={hero}
                        onChange={(event) =>
                          set({
                            items: draft.items.map((x, j) =>
                              index === j ? { ...x, condition: event.target.value } : x,
                            ),
                          })
                        }
                      >
                        {Object.keys(template.conditionToDisposition).map((key) => (
                          <option key={key} value={key}>
                            {translated(conditionLabels, key, locale)}
                          </option>
                        ))}
                      </select>
                      <div className={s.deviceFacts}>
                        <div>
                          <ShieldCheck size={16} />
                          <span>
                            {item.category === 'battery'
                              ? t('Penjemputan oleh tim khusus', 'Collected by a specialist team')
                              : t('Penanganan standar', 'Standard handling')}
                          </span>
                        </div>
                        <div>
                          <LockKeyhole size={16} />
                          <span>
                            {template.dataBearing
                              ? t('Menyimpan data pribadi', 'Stores personal data')
                              : t('Tidak menyimpan data pribadi', 'Does not store personal data')}
                          </span>
                        </div>
                      </div>
                      {template.dataBearing && (
                        <p className={s.fieldHint}>
                          {t(
                            'Baterai contoh dalam kondisi normal. Pelepasan data akan ditinjau sebelum perangkat diteruskan.',
                            'The sample battery is in normal condition. Data release is reviewed before this item moves onward.',
                          )}
                        </p>
                      )}
                      {item.category === 'battery' && (
                        <div className={s.warning}>
                          <ShieldCheck size={18} />
                          <p>
                            {t(
                              'Baterai ditangani terpisah oleh tim khusus. Jangan masukkan bersama perangkat lain atau mencoba membongkarnya.',
                              'Batteries are handled separately by a specialist team. Do not pack with other items or attempt to open them.',
                            )}
                          </p>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
            {draft.step === 2 && (
              <>
                <section className={s.formSection}>
                  <div className={s.sectionIcon}>
                    <MapPin size={20} />
                    <h2>{t('Lokasi penjemputan', 'Pickup location')}</h2>
                  </div>
                  <label htmlFor="pickup-address">
                    {t('Nama alamat / lingkungan', 'Address / neighborhood name')}
                  </label>
                  <input
                    id="pickup-address"
                    value={draft.addressAlias}
                    readOnly={hero}
                    maxLength={120}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'address-hint form-error' : 'address-hint'}
                    onChange={(event) => set({ addressAlias: event.target.value })}
                  />
                  <p id="address-hint" className={s.fieldHint}>
                    {t(
                      'Gunakan nama lingkungan saja. Alamat rumah dan data pribadi tidak diperlukan.',
                      'A neighborhood name is enough. A home address and personal details are not required.',
                    )}
                  </p>
                  {!hero && (
                    <button
                      className={s.textButton}
                      type="button"
                      onClick={() =>
                        set({ addressAlias: initialDraft.addressAlias, addressId: initialDraft.addressId })
                      }
                    >
                      {t('Gunakan alamat contoh', 'Use sample address')}
                    </button>
                  )}
                </section>
                <section className={s.formSection}>
                  <div className={s.sectionIcon}>
                    <CalendarDays size={20} />
                    <h2>{t('Jadwal tersedia', 'Available window')}</h2>
                  </div>
                  <label className={s.windowChoice}>
                    <input type="radio" name="window" checked readOnly />
                    <div>
                      <strong>
                        {date(availableDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </strong>
                      <span>{t('09.00–11.00 WIB', '09:00–11:00 WIB')}</span>
                      <small>{t('Rute lingkungan terjadwal', 'Scheduled neighborhood route')}</small>
                    </div>
                    <Chip tone="success">{t('Program didanai', 'Funded program')}</Chip>
                  </label>
                  <p className={s.fieldHint}>
                    {t(
                      'Perangkat mendapat slot sesuai kapasitas kendaraan dan tujuan. Jika penuh, sisa perangkat dijadwalkan pada hari berikutnya.',
                      'Items receive slots based on vehicle and destination capacity. Overflow items are scheduled on the next available day.',
                    )}
                  </p>
                  {(hasSpecialist || hasBulky) && (
                    <div className={s.infoNote}>
                      <Truck size={18} />
                      <p>
                        {t(
                          'Perangkat besar dan baterai memakai kendaraan yang sesuai. Satu permintaan dapat memiliki beberapa jadwal penjemputan.',
                          'Large items and batteries use compatible vehicles. One request may have more than one pickup window.',
                        )}
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}
            {draft.step === 3 && (
              <>
                <section className={s.reviewSection}>
                  <div className={s.selectionHeader}>
                    <h2>{t('Perangkat', 'Items')}</h2>
                    <button type="button" className={s.textButton} onClick={() => changeStep(1)}>
                      {t('Ubah', 'Edit')}
                    </button>
                  </div>
                  {draft.items.map((item, index) => (
                    <div className={s.reviewItem} key={index}>
                      <div className={s.smallProduct}>
                        <ItemIllustration category={item.category} />
                      </div>
                      <div>
                        <strong>{translated(categoryLabels, item.category, locale)}</strong>
                        <small>{translated(conditionLabels, item.condition, locale)}</small>
                      </div>
                      <span>1×</span>
                    </div>
                  ))}
                </section>
                <section className={s.reviewSection}>
                  <div className={s.selectionHeader}>
                    <h2>{t('Penjemputan', 'Pickup')}</h2>
                    <button type="button" className={s.textButton} onClick={() => changeStep(2)}>
                      {t('Ubah', 'Edit')}
                    </button>
                  </div>
                  <p className={s.iconLine}>
                    <MapPin size={17} />
                    {draft.addressAlias}
                  </p>
                  <p className={s.iconLine}>
                    <CalendarDays size={17} />
                    {date(availableDate, { day: 'numeric', month: 'long' })} ·{' '}
                    {t('09.00–11.00 WIB', '09:00–11:00 WIB')}
                  </p>
                  <div className={s.costLine}>
                    <span>{t('Biaya penjemputan standar', 'Standard pickup fee')}</span>
                    <strong>{money(0)}</strong>
                  </div>
                </section>
                <label className={s.confirmation}>
                  <input
                    id="confirm-pickup"
                    type="checkbox"
                    checked={draft.confirmed}
                    aria-invalid={!!error && !draft.confirmed}
                    aria-describedby={error ? 'form-error' : undefined}
                    onChange={(event) => set({ confirmed: event.target.checked })}
                  />
                  <span>
                    {t(
                      'Informasi perangkat dan penjemputan sudah sesuai.',
                      'The item and pickup details are correct.',
                    )}
                  </span>
                </label>
                {hasData && (
                  <p className={s.fieldHint}>
                    {t(
                      'Pengajuan ini bukan persetujuan pelepasan data. Tim akan meninjau gerbang data secara terpisah.',
                      'Submitting this request does not approve data release. The team reviews the data gate separately.',
                    )}
                  </p>
                )}
                {waitingForHero && (
                  <p className={s.infoNote} role="status">
                    {app.cursor < 32
                      ? t(
                          `Siap dikirim dalam ${Math.ceil(32 - app.cursor)} detik perjalanan.`,
                          `Ready to send in ${Math.ceil(32 - app.cursor)} journey seconds.`,
                        )
                      : t(
                          'Lanjutkan perjalanan ke langkah pengajuan untuk mengirim.',
                          'Continue to the request step in the journey to send.',
                        )}
                  </p>
                )}
              </>
            )}
            {error && (
              <div id="form-error" className={s.formError} role="alert">
                {error}
              </div>
            )}
            <div className={s.formActions}>
              {draft.step > 0 ? (
                <Button variant="secondary" type="button" onClick={() => changeStep(draft.step - 1)}>
                  <ArrowLeft size={16} />
                  {t('Kembali', 'Back')}
                </Button>
              ) : (
                <span className={s.savedHint}>
                  {t('Pilihan tersimpan otomatis', 'Your choices are saved')}
                </span>
              )}
              <Button
                type="submit"
                disabled={atCap || submitting || (draft.step === 3 && waitingForHero)}
                busy={submitting}
              >
                {draft.step === 3
                  ? t('Jadwalkan penjemputan', 'Schedule pickup')
                  : t('Lanjutkan', 'Continue')}
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </div>
        <aside className={s.formAside}>
          <div className={s.asideArt}>
            <ItemIllustration category={draft.items[0]?.category} />
            <span className={s.circularBadge}>
              <PackageCheck size={24} />
            </span>
          </div>
          <p className={s.eyebrow}>{t('LANGKAH KECIL, JEJAK BERARTI', 'SMALL STEP. LASTING IMPACT.')}</p>
          <h2>{t('Barang lama, kemungkinan baru.', 'Old devices. New possibilities.')}</h2>
          <p>
            {t(
              'Dari rumah Anda ke jalur pemulihan yang sesuai. Setiap perpindahan tercatat, setiap perangkat bisa ditelusuri.',
              'From your home to a suitable recovery pathway. Each handoff is recorded, and every item stays traceable.',
            )}
          </p>
          <ul>
            <li>
              <CheckCircle2 size={17} />
              {t('Tanpa biaya dalam jadwal program didanai', 'No charge within funded program windows')}
            </li>
            <li>
              <CheckCircle2 size={17} />
              {t('Kondisi ditinjau satu per satu', 'Each item reviewed individually')}
            </li>
            <li>
              <CheckCircle2 size={17} />
              {t('Lihat hasil akhir perangkat', 'See your item’s final outcome')}
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
