/** Screen-space layout shared by WebGL annotations and the compatibility map. */
export interface LabelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface LabelCandidate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority?: number;
  selected?: boolean;
  visible?: boolean;
  /** Already readable peers keep their slot before a newly arriving peer. */
  retained?: boolean;
}
export interface LabelPlacement extends LabelRect {
  id: string;
  x: number;
  y: number;
  offsetIndex: number;
}
export interface LabelLayoutOptions {
  width: number;
  height: number;
  padding?: number;
  gap?: number;
  limit?: number;
  exclusions?: readonly LabelRect[];
  previous?: ReadonlyMap<string, LabelPlacement>;
}
export function intersects(a: LabelRect, b: LabelRect, gap = 0) {
  return (
    a.left < b.left + b.width + gap &&
    a.left + a.width + gap > b.left &&
    a.top < b.top + b.height + gap &&
    a.top + a.height + gap > b.top
  );
}
/** Higher priority labels claim space first. Lower priority labels yield rather than overlap. */
export function layoutLabels(candidates: readonly LabelCandidate[], options: LabelLayoutOptions) {
  const { width, height, previous, exclusions = [], padding = 10, gap = 6 } = options;
  const limit = options.limit ?? Math.max(3, Math.min(15, Math.floor((width * height) / 38000)));
  const placed = new Map<string, LabelPlacement>();
  const sorted = [...candidates].sort(
    (a, b) =>
      Number(!!b.selected) - Number(!!a.selected) ||
      (b.priority ?? 0) - (a.priority ?? 0) ||
      Number(!!b.retained) - Number(!!a.retained) ||
      a.id.localeCompare(b.id),
  );
  for (const item of sorted) {
    if (
      item.visible === false ||
      ![item.x, item.y, item.width, item.height].every(Number.isFinite) ||
      item.width <= 0 ||
      item.height <= 0 ||
      item.x < 0 ||
      item.x > width ||
      item.y < 0 ||
      item.y > height ||
      (!item.selected && placed.size >= limit)
    )
      continue;
    const offsets = [
      [0, 0],
      [0, -item.height - gap],
      [0, item.height + gap],
      [-Math.min(64, item.width * 0.55), 0],
      [Math.min(64, item.width * 0.55), 0],
    ];
    const oldIndex = previous?.get(item.id)?.offsetIndex;
    // Keep the last valid anchor slot while the camera or vehicle is moving.
    const order =
      oldIndex === undefined ? [0, 1, 2, 3, 4] : [oldIndex, ...[0, 1, 2, 3, 4].filter((i) => i !== oldIndex)];
    for (const offsetIndex of order) {
      let x = item.x + offsets[offsetIndex][0],
        y = item.y + offsets[offsetIndex][1];
      if (item.selected) {
        x = Math.max(padding + item.width / 2, Math.min(width - padding - item.width / 2, x));
        y = Math.max(padding + item.height / 2, Math.min(height - padding - item.height / 2, y));
      }
      const rect: LabelPlacement = {
        id: item.id,
        x,
        y,
        offsetIndex,
        left: x - item.width / 2,
        top: y - item.height / 2,
        width: item.width,
        height: item.height,
      };
      if (
        rect.left < padding ||
        rect.top < padding ||
        rect.left + rect.width > width - padding ||
        rect.top + rect.height > height - padding ||
        exclusions.some((excluded) => intersects(rect, excluded, gap)) ||
        [...placed.values()].some((other) => intersects(rect, other, gap))
      )
        continue;
      placed.set(item.id, rect);
      break;
    }
  }
  return placed;
}
