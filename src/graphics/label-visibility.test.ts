import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { isLabelBlocker, settleLabelVisibility, type SettledVisibility } from './label-visibility';
import { getAmbientTrafficPose } from './vehicle-motion';

const solid = () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
describe('physical annotation visibility', () => {
  it('uses buildings while ignoring trees, roads, moving vehicles, and the owning entity', () => {
    const building = solid();
    building.userData.labelOccluder = true;
    const road = solid();
    const tree = solid();
    const vehicle = solid();
    vehicle.userData.labelOccluder = false;
    expect(isLabelBlocker(building)).toBe(true);
    for (const decoration of [road, tree, vehicle]) expect(isLabelBlocker(decoration)).toBe(false);
    const owner = new THREE.Group();
    owner.userData.labelOccluder = true;
    owner.add(building);
    expect(isLabelBlocker(building, owner)).toBe(false);
    expect(isLabelBlocker(building)).toBe(true);
    expect(building.visible).toBe(true);
    expect(vehicle.visible).toBe(true);
    owner.visible = false;
    expect(isLabelBlocker(building)).toBe(false);
  });
  it('depth-tests an architectural instance without hiding the vehicle mesh', () => {
    const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 1);
    wall.userData.labelOccluder = true;
    wall.setMatrixAt(0, new THREE.Matrix4().makeScale(4, 4, 1));
    wall.computeBoundingSphere();
    const truck = solid();
    truck.position.z = -3;
    const scene = new THREE.Scene();
    scene.add(wall, truck);
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1), 0, 7.8);
    const occluders = scene.children.filter((object) => isLabelBlocker(object));
    expect(ray.intersectObjects(occluders, false)[0]?.instanceId).toBe(0);
    expect(truck.visible).toBe(true);
    wall.position.x = 10;
    scene.updateMatrixWorld(true);
    expect(ray.intersectObjects(occluders, false)).toHaveLength(0);
    expect(truck.visible).toBe(true);
  });
  it('does not strobe on a brief wall-edge hit and waits for a stable clearing', () => {
    let state: SettledVisibility = { visible: true, pending: true, since: 0 };
    state = settleLabelVisibility(state, false, 100);
    state = settleLabelVisibility(state, false, 180);
    expect(state.visible).toBe(true);
    state = settleLabelVisibility(state, true, 200);
    expect(state.visible).toBe(true);
    state = settleLabelVisibility(state, false, 250);
    state = settleLabelVisibility(state, false, 380);
    expect(state.visible).toBe(false);
    state = settleLabelVisibility(state, true, 450);
    state = settleLabelVisibility(state, true, 700);
    expect(state.visible).toBe(false);
    state = settleLabelVisibility(state, true, 740);
    expect(state.visible).toBe(true);
  });
});

describe('continuous ambient traffic', () => {
  it('has no teleport at any corner or the repeating loop boundary', () => {
    for (const speed of [1, 10, 30]) {
      let previous = getAmbientTrafficPose(0);
      for (let frame = 1; frame <= 60 * 190; frame++) {
        const elapsed = (frame / 60) * speed;
        const pose = getAmbientTrafficPose(elapsed);
        expect(Math.hypot(pose.x - previous.x, pose.z - previous.z)).toBeLessThanOrEqual(
          (2 * speed) / 60 + 1e-8,
        );
        expect(pose.x).toBeGreaterThanOrEqual(-57);
        expect(pose.x).toBeLessThanOrEqual(48);
        expect(pose.z).toBeGreaterThanOrEqual(-34);
        expect(pose.z).toBeLessThanOrEqual(41);
        previous = pose;
      }
    }
  });
});
