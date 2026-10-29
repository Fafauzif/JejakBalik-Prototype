import { Component, useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button, LoadingSurface } from '../components/ui';
import './recovery.css';

export const ROUTE_STARTUP_TIMEOUT_MS = 12_000;

function RecoverySurface({ english = false, slow = false }: { english?: boolean; slow?: boolean }) {
  return (
    <section className="recovery-surface" role="alert">
      <img src="/brand/mark.svg" alt="" width="40" height="40" />
      <h2>
        {slow
          ? english
            ? 'This page is taking longer to open.'
            : 'Halaman ini memerlukan waktu lebih lama.'
          : english
            ? 'This page could not open.'
            : 'Halaman belum dapat dibuka.'}
      </h2>
      <p>
        {english
          ? 'Check your connection, then reload to continue. Your saved session stays in this browser.'
          : 'Periksa koneksi, lalu muat ulang untuk melanjutkan. Sesi tersimpan tetap ada di browser ini.'}
      </p>
      <div className="recovery-surface__actions">
        <Button icon={<RotateCcw size={16} />} onClick={() => window.location.reload()}>
          {english ? 'Reload workspace' : 'Muat ulang ruang kerja'}
        </Button>
        <a className="recovery-link" href="/network">
          {english ? 'Open network' : 'Buka jaringan'} <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}

/** A failed route keeps the shell and its other destinations usable. */
export class RecoveryBoundary extends Component<
  { children: ReactNode; english?: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <RecoverySurface english={this.props.english} /> : this.props.children;
  }
}

/** Bounded feedback also covers a request that never resolves or rejects. */
export function RouteLoading({ english = false }: { english?: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), ROUTE_STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  return slow ? <RecoverySurface slow english={english} /> : <LoadingSurface />;
}
