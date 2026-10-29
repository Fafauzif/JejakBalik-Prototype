import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { Chip } from '../../components/ui';
import { useLocale } from '../../i18n';
import { useRequestDirectory } from '../../state/store';
import { assets, requests, type AssetSnapshot } from '../../domain';
import ItemIllustration from './ItemIllustration';
import RequestForm from './RequestForm';
import RequestTracking from './RequestTracking';
import { categoryLabels, statusLabels, translated } from './labels';
import s from './household.module.css';

function HouseholdHome() {
  const { t, locale, date } = useLocale();
  const directory = useRequestDirectory();
  const personalRequests = directory.filter((x) => x.request.hero || x.batchId !== 'canonical').reverse();
  if (!personalRequests.some((x) => x.request.hero)) {
    const request = requests.find((x) => x.hero)!;
    personalRequests.push({
      request,
      batchId: 'canonical',
      windows: [{ id: request.date, date: request.date, assetIds: request.assetIds }],
      assets: request.assetIds.map(
        (id) =>
          ({
            asset: assets.find((x) => x.id === id)!,
            status: 'draft',
            held: false,
            holdReason: null,
            deferred: false,
            dataCleared: false,
            custodyEventIds: [],
            custodyEvents: [],
          }) as AssetSnapshot,
      ),
      completed: 0,
      total: request.assetIds.length,
    });
  }
  const categories = [
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
  return (
    <div className={s.page}>
      <div className={s.homeGreeting}>
        <span>
          <MapPin size={15} />
          {t('Lingkungan Seruni, Jakarta', 'Seruni neighborhood, Jakarta')}
        </span>
        <span>{t('Untuk rumah tangga', 'For households')}</span>
      </div>
      <section className={s.homeHero}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>{t('JEJAK BARU DIMULAI DARI RUMAH', 'A NEW JOURNEY STARTS AT HOME')}</p>
          <h1>
            {t('Elektronik lama,', 'Old electronics,')}
            <br />
            <em>{t('cerita berikutnya.', 'their next chapter.')}</em>
          </h1>
          <p>
            {t(
              'Beri kesempatan baru untuk perangkat yang tak lagi dipakai. Kami jemput, pilah, dan bantu temukan tujuan yang tepat.',
              'Give unused devices another opportunity. We collect, sort, and help find the right place for what comes next.',
            )}
          </p>
          <Link to="/household/request" className={s.primaryLink}>
            {t('Jadwalkan penjemputan', 'Schedule pickup')}
            <ArrowRight size={18} />
          </Link>
          <span className={s.heroNote}>
            <CheckCircle2 size={15} />
            {t(
              'Tanpa biaya dalam jadwal program yang didanai. Perjalanannya bisa ditelusuri.',
              'No charge within funded program windows. A journey you can follow.',
            )}
          </span>
        </div>
        <div className={s.householdArt} aria-hidden="true">
          <div className={s.artSun} />
          <div className={s.artRing} />
          <div className={s.artShelf} />
          <div className={s.artLaptop}>
            <ItemIllustration category="laptop" />
          </div>
          <div className={s.artPhone}>
            <ItemIllustration category="phone" />
          </div>
          <div className={s.artPlant}>
            <i />
            <i />
            <i />
            <span />
          </div>
          <div className={s.artLabel}>
            <span>
              <PackageCheck size={19} />
            </span>
            <div>
              <strong>{t('Masih bernilai.', 'Still valuable.')}</strong>
              <small>{t('Siap melanjutkan cerita.', 'Ready for another chapter.')}</small>
            </div>
          </div>
          <div className={s.artSpark}>✳</div>
        </div>
      </section>
      <div className={s.promiseStrip}>
        <div>
          <PackageCheck size={23} />
          <span>
            <strong>{t('Pilih perangkat', 'Choose your items')}</strong>
            <small>{t('Satu permintaan, hingga 3 perangkat', 'One request, up to 3 items')}</small>
          </span>
        </div>
        <ArrowRight size={17} />
        <div>
          <Route size={23} />
          <span>
            <strong>{t('Dijemput bersama', 'Collected together')}</strong>
            <small>{t('Rute yang sesuai di lingkungan Anda', 'A compatible neighborhood route')}</small>
          </span>
        </div>
        <ArrowRight size={17} />
        <div>
          <ShieldCheck size={23} />
          <span>
            <strong>{t('Lihat hasilnya', 'See the outcome')}</strong>
            <small>{t('Setiap serah terima tercatat', 'Every handoff recorded')}</small>
          </span>
        </div>
      </div>
      <section className={s.requestsSection}>
        <div className={s.sectionHeading}>
          <div>
            <h2>{t('Penjemputan Anda', 'Your pickups')}</h2>
            <p>
              {t(
                'Ikuti cerita perangkat yang sudah Anda kirimkan.',
                'Follow the next chapter for the items you send.',
              )}
            </p>
          </div>
          <span>
            {personalRequests.length}{' '}
            {t('permintaan', personalRequests.length === 1 ? 'request' : 'requests')}
          </span>
        </div>
        <div className={s.requestList}>
          {personalRequests.length === 0 ? (
            <div className={s.emptyRequests}>
              <PackageCheck size={28} />
              <div>
                <h3>{t('Perjalanan pertama menunggu.', 'Your first journey awaits.')}</h3>
                <p>
                  {t(
                    'Gunakan contoh ponsel untuk memulai penjemputan.',
                    'Use the sample phone to start a pickup.',
                  )}
                </p>
                <Link to="/household/request">
                  {t('Jadwalkan penjemputan', 'Schedule pickup')}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            personalRequests.map((entry) => {
              const first = entry.assets[0];
              const complete = entry.completed === entry.total && entry.total > 0;
              const held = entry.assets.some((x) => x.held);
              const draft = first?.status === 'draft';
              return (
                <Link
                  className={s.requestRow}
                  key={entry.request.id}
                  to={draft ? '/household/request?hero=1' : `/household/requests/${entry.request.id}`}
                >
                  <div className={s.requestThumb}>
                    <ItemIllustration category={first?.asset.category} />
                  </div>
                  <div className={s.requestIdentity}>
                    <small>{entry.request.id}</small>
                    <h3>
                      {entry.assets
                        .map((x) => translated(categoryLabels, x.asset.category, locale))
                        .join(' + ')}
                    </h3>
                    <span>
                      <CalendarDays size={13} />
                      {date(entry.request.date, { day: 'numeric', month: 'short' })} ·{' '}
                      {t('09.00–11.00 WIB', '09:00–11:00 WIB')}
                    </span>
                  </div>
                  <div className={s.requestState}>
                    <Chip tone={complete ? 'success' : held ? 'warning' : draft ? 'neutral' : 'info'}>
                      {complete
                        ? t('Hasil tersedia', 'Outcome ready')
                        : held
                          ? t('Perlu tinjauan', 'Needs review')
                          : entry.completed > 0
                            ? t('Sebagian selesai', 'Partly complete')
                            : translated(statusLabels, first?.status ?? 'requested', locale)}
                    </Chip>
                    <small>
                      {draft
                        ? t('Siap diajukan', 'Ready to submit')
                        : `${entry.completed} / ${entry.total} ${t('perangkat selesai', entry.total === 1 ? 'item complete' : 'items complete')}`}
                    </small>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              );
            })
          )}
        </div>
      </section>
      <section className={s.acceptedSection}>
        <div className={s.sectionHeading}>
          <div>
            <h2>{t('Kecil atau besar, ada jalurnya.', 'Big or small, there’s a pathway.')}</h2>
            <p>
              {t(
                'Kategori perangkat yang bisa Anda ajukan untuk penjemputan.',
                'Device categories you can submit for collection.',
              )}
            </p>
          </div>
        </div>
        <div className={s.acceptedGrid}>
          {categories.map((category) => (
            <Link key={category} to={`/household/request?category=${category}`} className={s.acceptedItem}>
              <ItemIllustration category={category} />
              <span>{translated(categoryLabels, category, locale)}</span>
            </Link>
          ))}
        </div>
        <p className={s.acceptedNote}>
          <ShieldCheck size={15} />
          {t(
            'Baterai dan perangkat besar dijemput melalui penanganan yang sesuai.',
            'Batteries and large appliances are collected through compatible handling.',
          )}
        </p>
      </section>
    </div>
  );
}

export default function HouseholdPage() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  useEffect(() => {
    document.title = `${t('Penjemputan rumah tangga', 'Household pickups')} · Jejak Balik`;
  }, [t, pathname]);
  if (pathname === '/household/request') return <RequestForm />;
  if (pathname.startsWith('/household/requests/')) return <RequestTracking />;
  return <HouseholdHome />;
}
