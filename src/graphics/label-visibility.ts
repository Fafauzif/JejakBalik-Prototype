import * as THREE from 'three';

/** Labels are annotations, not physical objects. Only authored opaque structures
 * block them; passing vans, trees, road markings and their own entity do not. */
export function isLabelBlocker(object: THREE.Object3D, owner?: THREE.Object3D | null) {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh) return false;
  let tagged = false;
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.visible || node === owner || node.userData.labelOccluder === false) return false;
    if (node.userData.labelOccluder === true) tagged = true;
  }
  if (!tagged) return false;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => material.visible && !material.transparent && material.opacity >= 0.95);
}

export interface SettledVisibility {
  visible: boolean;
  pending: boolean;
  since: number;
}
/** Brief roof-edge hits cannot turn a moving marker into a strobe. Wall-clock
 * delays deliberately stay constant at every operational playback speed. */
export function settleLabelVisibility(
  state: SettledVisibility,
  visible: boolean,
  now: number,
  { hideDelay = 120, revealDelay = 280 } = {},
): SettledVisibility {
  if (visible === state.visible) return { visible, pending: visible, since: now };
  const since = visible === state.pending ? state.since : now;
  return now - since >= (visible ? revealDelay : hideDelay)
    ? { visible, pending: visible, since: now }
    : { ...state, pending: visible, since };
}
