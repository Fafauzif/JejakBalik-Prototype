import { describe, expect, it } from 'vitest';
import {
  getHubConveyorPose,
  getHubCartPose,
  getHubHandoffPose,
  HUB_ZONES,
} from '../../src/graphics/hub-data';

const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, axis) => value - b[axis]));

describe('continuous hub handling paths', () => {
  it('conveyor totes and carts never jump across the floor at a path wrap', () => {
    for (let time = 0; time < 240; time += 0.017) {
      for (const index of [0, 1, 7]) {
        const before = getHubConveyorPose(time, index, 8);
        const after = getHubConveyorPose(time + 0.017, index, 8);
        expect(distance(before.p, after.p)).toBeLessThan(0.024);
      }
      for (const index of [0, 1]) {
        const before = getHubCartPose(time, index);
        const after = getHubCartPose(time + 0.017, index);
        expect(distance(before.p, after.p)).toBeLessThan(0.017);
      }
    }
  });

  it('handoff containers remain present and return continuously instead of vanishing between trips', () => {
    HUB_ZONES.forEach((_, zoneIndex) => {
      for (let time = 0; time < 30; time += 0.017) {
        const before = getHubHandoffPose(time, zoneIndex, 0);
        const after = getHubHandoffPose(time + 0.017, zoneIndex, 0);
        expect(before.scale).toBe(1);
        expect(after.scale).toBe(1);
        expect(distance(before.p, after.p)).toBeLessThan(0.032);
      }
    });
  });
});
