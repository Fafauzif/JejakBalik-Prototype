import { describe, expect, it } from 'vitest';
import { additionalSegments } from './world-paths';

describe('journey difference overlay', () => {
  it('does not paint existing road traversals as additional collection travel', () => {
    expect(
      additionalSegments(
        [
          [0, 0],
          [24, 0],
        ],
        [
          [0, 0],
          [12, 0],
          [24, 0],
        ],
      ),
    ).toEqual([]);
  });
  it('retains both extra traversals when a detour returns over the same street', () => {
    expect(
      additionalSegments(
        [
          [0, 0],
          [12, 0],
          [12, 12],
        ],
        [
          [0, 0],
          [12, 0],
          [24, 0],
          [12, 0],
          [12, 12],
        ],
      ),
    ).toEqual([
      [
        [12, 0],
        [24, 0],
      ],
      [
        [24, 0],
        [12, 0],
      ],
    ]);
  });
  it('accounts for reverse travel against the same original physical edge', () => {
    expect(
      additionalSegments(
        [
          [0, 0],
          [12, 0],
        ],
        [
          [12, 0],
          [0, 0],
        ],
      ),
    ).toEqual([]);
  });
});
