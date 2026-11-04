import type { Point } from './types';
/** Extra traversals relative to the original journey. Shared edges retain their traversal counts. */
export function additionalSegments(original: Point[], planned: Point[]): [Point, Point][] {
  const edges = (path: Point[]): [Point, Point][] => {
    const result: [Point, Point][] = [];
    for (let i = 1; i < path.length; i++) {
      let current: Point = [...path[i - 1]];
      const end = path[i];
      while (current[0] !== end[0] || current[1] !== end[1]) {
        const next: Point =
          current[0] !== end[0]
            ? [
                current[0] + Math.sign(end[0] - current[0]) * Math.min(12, Math.abs(end[0] - current[0])),
                current[1],
              ]
            : [
                current[0],
                current[1] + Math.sign(end[1] - current[1]) * Math.min(12, Math.abs(end[1] - current[1])),
              ];
        result.push([current, next]);
        current = next;
      }
    }
    return result;
  };
  const key = ([a, b]: [Point, Point]) => [a.join(','), b.join(',')].sort().join('|');
  const counts = new Map<string, number>();
  for (const edge of edges(original)) counts.set(key(edge), (counts.get(key(edge)) || 0) + 1);
  return edges(planned).filter((edge) => {
    const k = key(edge),
      n = counts.get(k) || 0;
    if (n) {
      counts.set(k, n - 1);
      return false;
    }
    return true;
  });
}
