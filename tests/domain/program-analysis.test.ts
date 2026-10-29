import { describe, expect, it } from 'vitest';
import { analyzeFunding, improveVisitOrder } from '../../src/domain/program-analysis';

describe('program funding', () => {
  it('reconciles contribution and exposes the unfunded case', () => {
    expect(analyzeFunding({ service: true, sponsor: true, recovery: 100 }).contribution).toBe(1678174);
    expect(analyzeFunding({ service: false, sponsor: false, recovery: 100 }).contribution).toBe(-821826);
    expect(analyzeFunding({ service: true, sponsor: false, recovery: 100 }).contribution).toBe(978174);
  });
  it('keeps outstanding obligations separate from spent costs', () => {
    const r = analyzeFunding({ service: true, sponsor: true, recovery: 100, specialistHeld: true });
    expect(r.contribution).toBe(1951974);
    expect(r.outstanding).toBe(273800);
    expect(r.afterObligations).toBe(1678174);
  });
  it('clamps and rejects invalid numeric scenarios', () => {
    expect(analyzeFunding({ service: false, sponsor: false, recovery: NaN }).grossValue).toBe(0);
    expect(analyzeFunding({ service: true, sponsor: true, recovery: 1000 }).grossValue).toBe(15244370 * 1.5);
  });
});
describe('route ordering proposal', () => {
  const stops = [
    { id: 'A', position: [8, 0] as const },
    { id: 'B', position: [0, 8] as const },
    { id: 'C', position: [7, 0] as const },
    { id: 'D', position: [0, 7] as const },
  ];
  it('visits the identical cohort once while reducing a crossing route', () => {
    const r = improveVisitOrder(stops, [0, 0], [0, 0]);
    expect(r.proposedDistance).toBeLessThan(r.originalDistance);
    expect(r.stops.map((x) => x.id).sort()).toEqual(['A', 'B', 'C', 'D']);
  });
  it('is deterministic and never makes an existing order worse', () => {
    const a = improveVisitOrder(stops, [2, 2], [4, 4]);
    expect(a).toEqual(improveVisitOrder(stops, [2, 2], [4, 4]));
    expect(a.proposedDistance).toBeLessThanOrEqual(a.originalDistance);
    expect(improveVisitOrder([], [0, 0], [1, 1]).stops).toEqual([]);
  });
});
