import { lazy, Suspense } from 'react';
import { RecoveryBoundary, RouteLoading } from './Recovery';

const RecoveryApp = lazy(() => import('../recovery/RecoveryApp'));

export default function App() {
  return (
    <RecoveryBoundary english={document.documentElement.lang === 'en'}>
      <Suspense fallback={<RouteLoading english={document.documentElement.lang === 'en'} />}>
        <RecoveryApp />
      </Suspense>
    </RecoveryBoundary>
  );
}
