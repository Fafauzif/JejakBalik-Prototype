import { describe, expect, it } from 'vitest';
import { makeCityDetails } from './city-details';
import { makeCity, adaptCityToRoads } from './city-geometry';

describe('miniature architectural detail', () => {
  it('derives details only from the surviving architectural footprint', () => {
    const cleared = adaptCityToRoads(makeCity(false), [
      [
        [-65, 0],
        [65, 0],
      ],
    ]);
    const details = makeCityDetails(cleared.bodies, false);
    expect(details.trim.length).toBeGreaterThan(0);
    for (const part of [...details.trim, ...details.glazing, ...details.roofEquipment]) {
      expect(
        cleared.bodies.some(
          (b) =>
            Math.abs(b.p[0] - part.p[0]) <= b.s[0] / 2 + 0.3 &&
            Math.abs(b.p[2] - part.p[2]) <= b.s[2] / 2 + 0.3,
        ),
      ).toBe(true);
      expect(part.p.every(Number.isFinite)).toBe(true);
    }
  });
  it('keeps low-quality architecture legible with fewer decorative instances', () => {
    const bodies = makeCity(true).bodies;
    const low = makeCityDetails(bodies, true);
    const rich = makeCityDetails(bodies, false);
    expect(low.glazing.length).toBeGreaterThan(0);
    expect(low.roofEquipment.length).toBe(0);
    expect(low.trim.length + low.glazing.length).toBeLessThan(
      rich.trim.length + rich.glazing.length + rich.roofEquipment.length,
    );
    expect(makeCityDetails(bodies, false)).toEqual(rich);
  });
});
