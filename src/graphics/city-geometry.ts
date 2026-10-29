import world from './world-data.json';
import roads from './roads-data.json';
import partners from '../domain/data/PARTNERS.json';
export type Point = [number, number, number];
export interface Instance {
  p: Point;
  s: Point;
  color?: string;
  r?: number;
}
export function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const palette = ['#e5dac5', '#d8c8ae', '#eae2d3', '#c6cebf', '#cdbdaf', '#e5d4b5', '#bad1cb'];
export const allRoads: number[][][] = [
  ...roads.map((r) => r.path),
  [
    [-57, -34],
    [48, -34],
    [48, 41],
    [-57, 41],
    [-57, -34],
  ],
  [
    [-57, -3],
    [49, -3],
  ],
  [
    [36, -44],
    [36, 42],
  ],
  [
    [-45, 42],
    [-45, -34],
  ],
  [
    [0, -49],
    [0, -34],
  ],
  [
    [-50, -37],
    [42, -37],
  ],
];
function distanceSegment(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDistance(x: number, z: number) {
  let min = 100;
  for (const p of allRoads)
    for (let i = 1; i < p.length; i++) min = Math.min(min, distanceSegment(x, z, p[i - 1], p[i]));
  return min;
}
export function riverDistance(x: number, z: number) {
  let min = 100;
  for (let i = 1; i < world.riverPolyline.length; i++)
    min = Math.min(min, distanceSegment(x, z, world.riverPolyline[i - 1], world.riverPolyline[i]));
  return min;
}
export function makeCity(lite: boolean) {
  const rand = seeded(1824),
    bodies: Instance[] = [],
    roofs: Instance[] = [],
    windows: Instance[] = [],
    trees: Instance[] = [],
    trunks: Instance[] = [],
    park: Instance[] = [];
  for (let d = 0; d < 12; d++) {
    const district = world.districts[d],
      [cx, cz] = district.center;
    let n = 0;
    for (let attempt = 0; attempt < 1400 && n < (lite ? 18 : 27); attempt++) {
      const x = cx + (rand() - 0.5) * 23,
        z = cz + (rand() - 0.5) * 19,
        wx = 1.2 + rand() * 2,
        wz = 1.1 + rand() * 2;
      if (
        roadDistance(x, z) < Math.max(wx, wz) * 0.6 + 1 ||
        riverDistance(x, z) < 4.2 ||
        Math.hypot(x, z) < 8 ||
        partners.some((p) => Math.hypot(x - p.position[0], z - p.position[1]) < 5) ||
        world.households.some((h) => Math.hypot(x - h.position[0], z - h.position[1]) < 1.8) ||
        bodies.some(
          (b) =>
            Math.abs(b.p[0] - x) < (b.s[0] + wx) / 2 + 0.3 && Math.abs(b.p[2] - z) < (b.s[2] + wz) / 2 + 0.3,
        )
      )
        continue;
      let h = (d === 10 ? 2 : d > 5 ? 3 : 1.1) + rand() * (d > 5 ? 8 : 3.7);
      if (rand() > 0.94) h *= 1.45;
      const color = palette[Math.floor(rand() * palette.length)];
      bodies.push({ p: [x, h / 2 + 0.2, z], s: [wx, h, wz], color });
      roofs.push({
        p: [x, h + 0.29, z],
        s: [wx + 0.12, 0.2, wz + 0.12],
        color: d < 6 && h < 3 ? '#bf8b6d' : '#d3d1c0',
      });
      if (h > 3) {
        windows.push({ p: [x, h * 0.68, z + wz / 2 + 0.025], s: [wx * 0.76, 0.24, 0.04], color: '#a4b7b1' });
        if (h > 5)
          windows.push({ p: [x, h * 0.4, z + wz / 2 + 0.025], s: [wx * 0.76, 0.22, 0.04], color: '#a4b7b1' });
      }
      n++;
    }
  }
  for (let i = 0, attempt = 0; i < (lite ? 145 : 220) && attempt < 5000; attempt++) {
    const x = (rand() - 0.5) * 115,
      z = (rand() - 0.5) * 103;
    if (
      roadDistance(x, z) < 1 ||
      riverDistance(x, z) < 3 ||
      Math.hypot(x, z) < 8 ||
      bodies.some(
        (b) => Math.abs(b.p[0] - x) < b.s[0] / 2 + 0.5 && Math.abs(b.p[2] - z) < b.s[2] / 2 + 0.5,
      ) ||
      partners.some((p) => Math.hypot(x - p.position[0], z - p.position[1]) < 5)
    )
      continue;
    const h = 1.35 + rand() * 1.5;
    trunks.push({ p: [x, h * 0.35, z], s: [1, h * 0.8, 1], color: '#987e57' });
    trees.push({
      p: [x, h, z],
      s: [1.15, h * 0.65, 1.15],
      color: ['#7e9971', '#9bb484', '#6e8d69', '#adc08b'][i % 4],
    });
    i++;
  }
  for (const [x, z, s] of [
    [-7, 34, 7],
    [27, -39, 6],
    [-44, 13, 5],
    [20, 38, 4],
  ])
    park.push({ p: [x, 0.05, z], s: [s, 0.1, s * 0.75], color: '#c2cfab' });
  return { bodies, roofs, windows, trees, trunks, park };
}
export function adaptCityToRoads(
  city: ReturnType<typeof makeCity>,
  paths: readonly (readonly (readonly number[])[])[],
) {
  const clear = (p: Point, margin: number) =>
    paths.every((path) =>
      path.every(
        (b, i) => i === 0 || distanceSegment(p[0], p[2], path[i - 1] as number[], b as number[]) > margin,
      ),
    );
  const buildings = city.bodies
    .map((b, i) => ({ b, r: city.roofs[i] }))
    .filter(({ b }) => clear(b.p, Math.max(b.s[0], b.s[2]) * 0.55 + 0.68));
  const treeIndices = city.trees
    .map((t, i) => ({ t, stem: city.trunks[i] }))
    .filter(({ t }) => clear(t.p, 0.9));
  return {
    ...city,
    bodies: buildings.map((v) => v.b),
    roofs: buildings.map((v) => v.r),
    windows: city.windows.filter((w) => clear(w.p, 1.8)),
    trees: treeIndices.map((v) => v.t),
    trunks: treeIndices.map((v) => v.stem),
  };
}
