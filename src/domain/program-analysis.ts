import type { Vec2 } from './types';

/** Illustrative canonical cohort; this lab never writes custody, approvals or dispatch. */
export function analyzeFunding(input: {
  service: boolean;
  sponsor: boolean;
  recovery: number;
  specialistHeld?: boolean;
}) {
  const factor = Number.isFinite(input.recovery) ? Math.min(150, Math.max(0, input.recovery)) / 100 : 0;
  const grossValue = 15244370 * factor;
  const collection = input.specialistHeld ? 493900 : 637700;
  const processing = input.specialistHeld ? 3040000 : 3170000;
  const clearance = 63000;
  const service = input.service ? 1800000 : 0;
  const sponsor = input.sponsor ? 700000 : 0;
  const share = grossValue * 0.2;
  const contribution = Math.round(share + service + sponsor - collection - processing - clearance);
  const outstanding = input.specialistHeld ? 273800 : 0;
  return {
    grossValue,
    share,
    service,
    sponsor,
    collection,
    processing,
    clearance,
    contribution,
    outstanding,
    afterObligations: contribution - outstanding,
  };
}
export interface Visit {
  id: string;
  position: Vec2;
}
const leg = (a: Vec2, b: Vec2) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
function length(stops: readonly Visit[], origin: Vec2, end: Vec2) {
  let p = origin,
    total = 0;
  for (const s of stops) {
    total += leg(p, s.position);
    p = s.position;
  }
  return total + leg(p, end);
}
/** Bounded nearest-neighbour + 2-opt; route membership and endpoints remain fixed. */
export function improveVisitOrder(stops: readonly Visit[], origin: Vec2, end: Vec2) {
  const originalDistance = length(stops, origin, end);
  const pending = [...stops];
  const candidate: Visit[] = [];
  let p = origin;
  while (pending.length) {
    pending.sort((a, b) => leg(p, a.position) - leg(p, b.position) || a.id.localeCompare(b.id));
    const n = pending.shift()!;
    candidate.push(n);
    p = n.position;
  }
  let best = length(candidate, origin, end),
    improved = true,
    round = 0;
  while (improved && round++ < 30) {
    improved = false;
    for (let i = 0; i < candidate.length - 1; i++)
      for (let j = i + 1; j < candidate.length; j++) {
        const next = [
          ...candidate.slice(0, i),
          ...candidate.slice(i, j + 1).reverse(),
          ...candidate.slice(j + 1),
        ];
        const d = length(next, origin, end);
        if (d < best - 1e-9) {
          candidate.splice(0, candidate.length, ...next);
          best = d;
          improved = true;
        }
      }
  }
  return best < originalDistance
    ? { stops: candidate, originalDistance, proposedDistance: best }
    : { stops: [...stops], originalDistance, proposedDistance: originalDistance };
}
