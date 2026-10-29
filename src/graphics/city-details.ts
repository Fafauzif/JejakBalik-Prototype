import type { Instance, Point } from './city-geometry';

/** Detail is derived after route clearance, so it cannot leave a floating facade in a road.
 * All detail shares three instanced draws, independently of the building count. */
export function makeCityDetails(bodies: readonly Instance[], lite: boolean) {
  const trim: Instance[] = [],
    glazing: Instance[] = [],
    roofEquipment: Instance[] = [];
  const add = (list: Instance[], p: Point, s: Point, color: string) => list.push({ p, s, color });
  bodies.forEach((body, i) => {
    const [x, y, z] = body.p,
      [w, h, d] = body.s;
    const base = y - h / 2,
      top = y + h / 2;
    // A darker shopfront or recessed lobby grounds the miniature in its street.
    add(
      glazing,
      [x, base + Math.min(0.65, h * 0.3), z + d / 2 + 0.018],
      [w * 0.6, Math.min(0.72, h * 0.38), 0.028],
      i % 4 === 0 ? '#728c82' : '#829e98',
    );
    if (lite) return;
    add(trim, [x, base + 0.11, z], [w + 0.12, 0.18, d + 0.12], '#d0c5ad');
    if (h < 4.3) {
      // Shophouse awnings and terracotta eaves provide scale without textures.
      add(
        trim,
        [x, base + Math.min(1.3, h * 0.65), z + d / 2 + 0.09],
        [w * 0.91, 0.12, 0.28],
        i % 3 === 0 ? '#a45f46' : '#6e8c77',
      );
      add(trim, [x, top + 0.42, z], [w * 0.8, 0.13, d * 0.85], '#c5997b');
      if (i % 3 === 0) add(roofEquipment, [x + w * 0.2, top + 0.58, z], [w * 0.25, 0.3, d * 0.3], '#dcd3bb');
    } else {
      // Window grids are pale tinted ceramic/glass rather than highly reflective planes.
      const floors = Math.min(7, Math.floor(h / 1.35));
      for (let f = 1; f <= floors; f++) {
        const level = base + 0.5 + f * ((h - 1) / (floors + 1));
        add(glazing, [x + w / 2 + 0.018, level, z], [0.028, 0.32, d * 0.68], '#8ba8a3');
        if (i % 2 === 0) add(trim, [x, level - 0.23, z + d / 2 + 0.04], [w * 0.84, 0.065, 0.13], '#e5dfce');
      }
      add(trim, [x, top + 0.43, z + d * 0.44], [w, 0.24, 0.1], '#c4c5b4');
      add(trim, [x + w * 0.45, top + 0.43, z], [0.1, 0.24, d], '#c4c5b4');
      if (i % 3 === 0) {
        add(roofEquipment, [x - w * 0.1, top + 0.53, z], [w * 0.47, 0.48, d * 0.44], '#b2b9a9');
        add(roofEquipment, [x + w * 0.22, top + 0.42, z - d * 0.22], [w * 0.3, 0.06, d * 0.3], '#5d7b80');
      }
    }
  });
  return { trim, glazing, roofEquipment };
}
