import { describe, expect, it } from 'vitest';
import {
  intersects,
  layoutLabels,
  type LabelCandidate,
  type LabelPlacement,
  type LabelRect,
} from './label-layout';

function assertClear(
  placed: Map<string, LabelPlacement>,
  width: number,
  height: number,
  exclusions: LabelRect[] = [],
) {
  const labels = [...placed.values()];
  for (const [index, label] of labels.entries()) {
    expect(label.left).toBeGreaterThanOrEqual(10);
    expect(label.top).toBeGreaterThanOrEqual(10);
    expect(label.left + label.width).toBeLessThanOrEqual(width - 10);
    expect(label.top + label.height).toBeLessThanOrEqual(height - 10);
    for (const other of labels.slice(index + 1)) expect(intersects(label, other, 6)).toBe(false);
    for (const excluded of exclusions) expect(intersects(label, excluded, 6)).toBe(false);
  }
}
describe('screen-space annotation layout', () => {
  it('gives selected labels first choice and culls labels outside the camera viewport', () => {
    const labels = layoutLabels(
      [
        { id: 'district', x: 180, y: 150, width: 120, height: 30, priority: 20 },
        { id: 'hub', x: 180, y: 150, width: 160, height: 30, priority: 90 },
        { id: 'selected-truck', x: 180, y: 150, width: 100, height: 30, selected: true },
        { id: 'offscreen', x: -1, y: 150, width: 120, height: 30, selected: true },
        { id: 'behind-camera', x: 200, y: 250, width: 120, height: 30, visible: false },
      ],
      { width: 360, height: 400 },
    );
    expect(labels.get('selected-truck')?.offsetIndex).toBe(0);
    expect(labels.has('offscreen')).toBe(false);
    expect(labels.has('behind-camera')).toBe(false);
    assertClear(labels, 360, 400);
  });
  it('retains valid placement slots during movement and clamps a selected label at the edge', () => {
    const initial = layoutLabels(
      [
        { id: 'hub', x: 170, y: 120, width: 150, height: 30, priority: 90 },
        { id: 'truck', x: 170, y: 120, width: 80, height: 30, priority: 70 },
      ],
      { width: 600, height: 400 },
    );
    const next = layoutLabels(
      [
        { id: 'hub', x: 172, y: 122, width: 150, height: 30, priority: 90 },
        { id: 'truck', x: 172, y: 122, width: 80, height: 30, priority: 70 },
        { id: 'selected-edge', x: 5, y: 260, width: 120, height: 30, selected: true },
      ],
      { width: 600, height: 400, previous: initial },
    );
    expect(next.get('truck')?.offsetIndex).toBe(initial.get('truck')?.offsetIndex);
    expect(next.get('selected-edge')?.left).toBe(10);
    assertClear(next, 600, 400);
  });
  it('keeps dense moving labels clear of each other and scene controls across responsive sizes', () => {
    for (const width of [320, 360, 390, 768, 1200]) {
      const height = 440;
      const exclusions = [
        { left: 12, top: 12, width: Math.min(width - 24, 220), height: 36 },
        { left: 12, top: 395, width: Math.min(width - 24, 280), height: 32 },
      ];
      let previous = new Map<string, LabelPlacement>();
      for (let frame = 0; frame < 60; frame++) {
        const candidates: LabelCandidate[] = Array.from({ length: 30 }, (_, index) => ({
          id: `label-${index}`,
          x: width * 0.5 + Math.sin(index * 1.7 + frame * 0.01) * width * 0.48,
          y: height * 0.5 + Math.cos(index * 2.3 + frame * 0.02) * height * 0.48,
          width: 68 + (index % 5) * 23,
          height: width < 600 ? 40 : 30,
          priority: index === 0 ? 90 : index < 7 ? 70 : 20,
          selected: index === 5,
        }));
        previous = layoutLabels(candidates, {
          width,
          height,
          exclusions,
          previous,
          limit: width < 600 ? 5 : undefined,
        });
        expect(previous.size).toBeGreaterThan(0);
        assertClear(previous, width, height, exclusions);
      }
    }
  });
  it('keeps an already readable moving label ahead of an equal-priority arrival', () => {
    const candidates = [
      { id: 'arrival-A', x: 180, y: 150, width: 170, height: 30, priority: 70 },
      { id: 'existing-Z', x: 180, y: 150, width: 170, height: 30, priority: 70, retained: true },
    ];
    const stable = layoutLabels(candidates, { width: 360, height: 300, limit: 1 });
    expect(stable.has('existing-Z')).toBe(true);
    expect(stable.has('arrival-A')).toBe(false);
    const selected = layoutLabels(
      candidates.map((candidate) => ({ ...candidate, selected: candidate.id === 'arrival-A' })),
      {
        width: 360,
        height: 300,
        limit: 1,
      },
    );
    expect(selected.has('arrival-A')).toBe(true);
    assertClear(selected, 360, 300);
  });
});
