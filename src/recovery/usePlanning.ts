import { useEffect, useRef, useState } from 'react';
import { journeyOptions, planScenario } from './model';
import type { Plan, Scenario } from './types';
type Option = ReturnType<typeof journeyOptions>[number];
const empty: Plan = {
  id: 'pending',
  revision: 0,
  assignments: [],
  routes: [],
  rejections: [],
  totalCostIdr: 0,
  addedKm: 0,
  addedMinutes: 0,
  served: 0,
  baselineKm: 0,
  baselineCostIdr: 0,
  outstandingCostIdr: 0,
};
interface Result {
  plan: Plan;
  options: Option[];
  key: string;
  failed: boolean;
  fallback: boolean;
}
/** Isolate bounded route searches from interaction/rendering. Each result belongs to exact inputs. */
export function usePlanning(
  scenario: Scenario,
  preferences: Record<string, string>,
  requestId: string | null,
) {
  const key = JSON.stringify([scenario, preferences, requestId]);
  const [result, setResult] = useState<Result>({
    plan: empty,
    options: [],
    key: '',
    failed: false,
    fallback: false,
  });
  const worker = useRef<Worker | null>(null),
    sequence = useRef(0),
    workerFailed = useRef(false);
  useEffect(() => {
    try {
      if (typeof Worker !== 'undefined')
        worker.current = new Worker(new URL('./planning.worker.ts', import.meta.url), { type: 'module' });
      else workerFailed.current = true;
    } catch {
      workerFailed.current = true;
    }
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);
  useEffect(() => {
    const id = ++sequence.current;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fallback = () => {
      clearTimeout(timer);
      workerFailed.current = true;
      worker.current?.terminate();
      worker.current = null;
      timer = setTimeout(() => {
        if (!active) return;
        try {
          const plan = planScenario(scenario, preferences),
            options = requestId ? journeyOptions(scenario, requestId) : [];
          if (active && sequence.current === id)
            setResult({ plan, options, key, failed: false, fallback: true });
        } catch {
          if (active && sequence.current === id)
            setResult({ plan: empty, options: [], key, failed: true, fallback: true });
        }
      }, 30);
    };
    if (worker.current && !workerFailed.current) {
      const w = worker.current;
      w.onmessage = (
        event: MessageEvent<{ sequence: number; plan?: Plan; options?: Option[]; error?: string }>,
      ) => {
        if (!active || event.data.sequence !== sequence.current || event.data.sequence !== id) return;
        clearTimeout(timer);
        if (event.data.error || !event.data.plan) {
          setResult({ plan: empty, options: [], key, failed: true, fallback: false });
          return;
        }
        setResult({
          plan: event.data.plan,
          options: event.data.options || [],
          key,
          failed: false,
          fallback: false,
        });
      };
      w.onerror = () => {
        if (active) fallback();
      };
      timer = setTimeout(() => {
        if (active) fallback();
      }, 15000);
      w.postMessage({ sequence: id, scenario, preferences, requestId });
    } else fallback();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key]);
  return { ...result, pending: result.key !== key };
}
