import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { AssetSnapshot, Snapshot } from '../domain/types';
import { getLiveVehiclePose, type LiveOperationsFrame } from '../domain/live-operations';
import { getLiveVehicleProfile } from '../domain/partner-logistics';
import { Box, Batch, Label, Ring, FleetVan, type Point, type Instance } from './primitives';
import { readLiveVisualSeconds } from '../state/network-store';
import type { SelectKind } from './CityScene';
import {
  HUB_ZONES,
  getHubZoneAssets,
  getHubConveyorPose,
  getHubHandoffPose,
  getHubCartPose,
  getHubDockPose,
} from './hub-data';
export { HUB_ZONES, getHubZoneAssets } from './hub-data';

type HubSelect = (id: string, kind?: SelectKind) => void;
interface PickInstance extends Instance {
  assetId: string;
}
interface ActorPart extends Instance {
  /** A local moving arm rather than a second animated mesh. */
  arm?: -1 | 1;
}
interface Actor {
  kind: 'tote' | 'worker' | 'cart' | 'handoff';
  index: number;
  zoneIndex?: number;
  assetId?: string;
  p?: Point;
  parts: ActorPart[];
}
const material = { roughness: 0.88 };
const toteColors = ['#719a87', '#bb9271', '#8cabb6', '#b9ad76'];
const tmpObject = new THREE.Object3D();
const tmpColor = new THREE.Color();
const box = (p: Point, s: Point, color: string): Instance => ({ p, s, color });
const offset = (p: Point, d: Point): Point => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];

function makeFurniture() {
  const items: Instance[] = [
    box([0, -0.24, 0], [35, 0.4, 23], '#e2decd'),
    box([0, -0.02, 0], [26, 0.16, 17], '#eae5d6'),
    box([-18.2, -0.05, 0], [10, 0.14, 19], '#d1d2c3'),
    box([0, 2.65, -8.3], [25, 0.7, 0.04], '#3d6950'),
    box([0, 0.14, 0], [26, 0.03, 2.3], '#d4d1bb'),
    // Two conveyor lanes share one frame; their contrasting rims explain the loop.
    box([0, 0.63, 0], [24, 0.2, 1.6], '#7d9382'),
    box([0, 0.76, -0.84], [24, 0.12, 0.11], '#c0bba3'),
    box([0, 0.76, 0.84], [24, 0.12, 0.11], '#c0bba3'),
    box([0, 0.76, 0], [22.4, 0.1, 0.06], '#dfd9bf'),
  ];
  for (let x = -11.5; x <= 11.5; x += 0.5) items.push(box([x, 0.76, 0], [0.12, 0.11, 1.52], '#aeb4a1'));
  for (let x = -10.5; x <= 10.5; x += 3) items.push(box([x, 0.38, 0], [0.12, 0.6, 1.22], '#687f6e'));
  for (let i = 0; i < 6; i++) {
    const z = -6.35 + i * 2.55;
    items.push(box([-15.45, 0.03, z - 1.1], [4.2, 0.025, 0.055], '#f5f0d5'));
    items.push(box([-13.35, 0.19, z], [0.8, 0.2, 1.55], '#a99b7b'));
  }
  HUB_ZONES.forEach((zone, index) => {
    const add = (p: Point, s: Point, color: string) => items.push(box(offset(zone.p, p), s, color));
    if ([0, 4, 5, 6, 7].includes(index)) {
      for (let i = 0; i < 3; i++) {
        add([-1.5 + i * 1.4, 1.15, -1.6], [0.08, 2.3, 0.08], '#748875');
        add([-1.5 + i * 1.4, 1.15, -0.6], [0.08, 2.3, 0.08], '#748875');
      }
      for (let y = 0; y < 3; y++) add([-0.1, 0.25 + y * 0.8, -1.1], [3.2, 0.1, 1.15], '#a9ad95');
    } else {
      add([0, 1, -1.2], [3.8, 0.2, 1.2], '#bdac8d');
      add([-1.6, 0.5, -1.2], [0.14, 1, 0.9], '#7a907d');
      add([1.6, 0.5, -1.2], [0.14, 1, 0.9], '#7a907d');
      if (index === 3) {
        add([0, 1.6, -1.4], [1.15, 0.9, 0.12], '#3c5f52');
        add([0, 1.1, -0.9], [1, 0.06, 0.4], '#d6d1c2');
        add([1.2, 1.4, -1.2], [0.4, 0.6, 0.5], '#536b5d');
      } else {
        add([-0.8, 1.18, -1.2], [0.65, 0.15, 0.8], '#535c54');
        add([0.8, 1.3, -1.2], [0.8, 0.4, 0.6], index === 2 ? '#b4c3cb' : '#6f9d89');
      }
    }
  });
  // Painted pedestrian lanes, station dividers and staging bollards share this draw.
  for (let x = -11; x <= 11; x += 1.4) {
    items.push(box([x, 0.075, 2.0], [0.65, 0.015, 0.12], '#f6efd5'));
    items.push(box([x, 0.075, -2.0], [0.65, 0.015, 0.12], '#f6efd5'));
  }
  for (const z of [-6.3, -3.8, -1.2, 1.3, 3.8, 6.3]) {
    items.push(box([-12.7, 0.34, z], [0.17, 0.65, 0.17], '#d2ae59'));
    items.push(box([-12.7, 0.41, z], [0.18, 0.1, 0.18], '#435e4f'));
  }
  HUB_ZONES.forEach((zone) => {
    items.push(box(offset(zone.p, [0, 0.18, -2.75]), [2.6, 0.06, 0.24], '#719781'));
  });
  return items;
}
const furniture = makeFurniture();
// Walls block annotations; conveyor totes, operators, benches and the floor do not.
const architecture = [
  box([0, 1.8, -8.5], [26, 3.6, 0.3], '#d2d4c2'),
  box([13, 1.8, 0], [0.3, 3.6, 17], '#b6c3ae'),
  box([-13, 0.35, 0], [0.3, 0.7, 17], '#d2d4c2'),
  box([0, 0.35, 8.5], [26, 0.7, 0.3], '#d2d4c2'),
  ...[-6, 0, 6].map((x) => box([x, 0.85, -4], [0.16, 1.7, 7], '#e5dfcc')),
  box([6, 0.8, 4], [0.16, 1.6, 7], '#e5dfcc'),
];
const roof = [box([0, 4.2, 0], [27, 0.35, 18], '#52735c')];
for (let i = 0; i < 13; i++) roof.push(box([-12 + i * 2, 4.4, 0], [0.06, 0.05, 18], '#77947a'));
for (let x = -9; x <= 9; x += 3)
  for (let z = -5; z <= 5; z += 3) roof.push(box([x, 4.49, z], [2.4, 0.06, 2.2], '#496c76'));

function makeDevice(item: AssetSnapshot, p: Point): PickInstance[] {
  const parts: PickInstance[] = [];
  const add = (local: Point, s: Point, color: string) =>
    parts.push({ p: offset(p, local), s, color, assetId: item.asset.id });
  const category = item.asset.category;
  add([0, 0.04, 0], [0.78, 0.08, 0.76], '#bbae8c');
  if (category === 'monitor') {
    add([0, 0.5, 0], [0.65, 0.45, 0.12], '#354d41');
    add([0, 0.5, 0.069], [0.53, 0.33, 0.025], '#9bbcb6');
    add([0, 0.25, 0], [0.12, 0.35, 0.13], '#54695a');
  } else if (category === 'large_appliance') {
    add([0, 0.48, 0], [0.64, 0.85, 0.62], '#e7e2d5');
    add([0, 0.48, 0.32], [0.4, 0.4, 0.025], '#839d98');
    add([0, 0.77, 0.325], [0.46, 0.08, 0.025], '#bcc6ba');
  } else {
    const phone = category === 'phone';
    const color = item.held ? '#b99351' : phone || category === 'laptop' ? '#4d665b' : '#b8c2af';
    add([0, 0.16, 0], [phone ? 0.26 : 0.6, category === 'printer' ? 0.4 : 0.16, phone ? 0.45 : 0.5], color);
    if (phone || category === 'laptop')
      add([0, 0.247, 0], [phone ? 0.2 : 0.5, 0.02, phone ? 0.34 : 0.36], '#a9c0b1');
  }
  return parts;
}

/** Every visible part keeps its asset identity, while the devices use one draw call. */
function DeviceBatch({ items, onSelect }: { items: PickInstance[]; onSelect: HubSelect }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    items.forEach((part, index) => {
      tmpObject.position.set(...part.p);
      tmpObject.scale.set(...part.s);
      tmpObject.rotation.set(0, 0, 0);
      tmpObject.updateMatrix();
      mesh.current!.setMatrixAt(index, tmpObject.matrix);
      mesh.current!.setColorAt(index, tmpColor.set(part.color!));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      castShadow
      receiveShadow
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const item = items[event.instanceId ?? -1];
        if (item) {
          event.stopPropagation();
          onSelect(item.assetId, 'asset');
        }
      }}
    >
      <boxGeometry />
      <meshStandardMaterial {...material} />
    </instancedMesh>
  );
}

function toteParts(color: string, load = true): ActorPart[] {
  const parts: ActorPart[] = [
    box([0, 0, 0], [0.61, 0.08, 0.57], color),
    box([-0.28, 0.14, 0], [0.06, 0.28, 0.57], color),
    box([0.28, 0.14, 0], [0.06, 0.28, 0.57], color),
    box([0, 0.14, -0.26], [0.5, 0.28, 0.06], color),
    box([0, 0.14, 0.26], [0.5, 0.28, 0.06], color),
  ];
  if (load) parts.push(box([0, 0.16, 0], [0.32, 0.18, 0.33], '#ded7bd'));
  return parts;
}
function workerParts(index: number): ActorPart[] {
  const uniform = index === 7 ? '#b99a53' : index === 3 ? '#6b90a0' : '#547b65';
  return [
    box([0, 0.89, 0], [0.43, 0.63, 0.32], uniform),
    box([0, 1.38, 0], [0.33, 0.35, 0.33], index % 2 ? '#bf936c' : '#a97b54'),
    box([0, 1.59, 0], [0.38, 0.1, 0.36], '#e5d9b8'),
    box([-0.12, 0.39, 0], [0.15, 0.48, 0.18], '#4d5c50'),
    box([0.12, 0.39, 0], [0.15, 0.48, 0.18], '#4d5c50'),
    box([0, 0.98, -0.17], [0.26, 0.13, 0.035], '#e8dcae'),
    { ...box([-0.3, 0.94, -0.12], [0.14, 0.45, 0.16], uniform), arm: -1 },
    { ...box([0.3, 0.94, -0.12], [0.14, 0.45, 0.16], uniform), arm: 1 },
  ];
}
function cartParts(index: number): ActorPart[] {
  return [
    box([0, 0.17, 0], [0.8, 0.28, 0.98], '#6f8b77'),
    box([0, 0.34, 0], [0.9, 0.08, 1.04], '#b8b79d'),
    box([0, 0.37, 0.47], [0.22, 0.07, 0.06], '#e7c776'),
    ...[-0.37, 0.37].flatMap((x) => [-0.3, 0.3].map((z) => box([x, 0.11, z], [0.14, 0.2, 0.24], '#48594d'))),
    ...toteParts(toteColors[index], true).map((part) => ({ ...part, p: offset(part.p, [0, 0.43, 0]) })),
  ];
}

function makeActors(zoneItems: AssetSnapshot[][]): Actor[] {
  const actors: Actor[] = [];
  const flowAssets = zoneItems.flat().slice(0, 16);
  flowAssets.forEach((item, index) =>
    actors.push({ kind: 'tote', index, assetId: item.asset.id, parts: toteParts(toteColors[index % 4]) }),
  );
  // Return empty handling containers even when the hub has no device inventory.
  for (let index = flowAssets.length; index < 8; index++)
    actors.push({ kind: 'tote', index, parts: toteParts(toteColors[index % 4], false) });
  [1, 2, 3, 5, 6, 7].forEach((index) => {
    const zone = HUB_ZONES[index];
    actors.push({ kind: 'worker', index, p: offset(zone.p, [0.5, 0.15, 0.12]), parts: workerParts(index) });
  });
  [0, 1].forEach((index) => actors.push({ kind: 'cart', index, parts: cartParts(index) }));
  zoneItems.forEach((items, zoneIndex) => {
    items.slice(0, 2).forEach((item, index) =>
      actors.push({
        kind: 'handoff',
        index,
        zoneIndex,
        assetId: item.asset.id,
        parts: toteParts(HUB_ZONES[zoneIndex].color),
      }),
    );
  });
  return actors;
}

function OperationsBatch({
  actors,
  time,
  onSelect,
}: {
  actors: Actor[];
  time: MutableRefObject<number>;
  onSelect: HubSelect;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(
    () => actors.flatMap((actor) => actor.parts.map((part) => ({ actor, part }))),
    [actors],
  );
  const beltCount = actors.filter((actor) => actor.kind === 'tote').length;
  const updatePoses = () => {
    if (!mesh.current) return;
    const elapsed = time.current;
    let instance = 0;
    actors.forEach((actor) => {
      let p: Point;
      let heading = 0;
      let scale = 1;
      if (actor.kind === 'tote') {
        ({ p, heading } = getHubConveyorPose(elapsed, actor.index, beltCount));
      } else if (actor.kind === 'handoff') {
        ({ p, heading, scale } = getHubHandoffPose(elapsed, actor.zoneIndex!, actor.index));
      } else if (actor.kind === 'cart') {
        ({ p, heading } = getHubCartPose(elapsed, actor.index));
      } else {
        const step = Math.sin(elapsed * 0.9 + actor.index * 1.7);
        p = offset(actor.p!, [step * 0.22, 0, 0]);
        heading = step * 0.08;
      }
      const sin = Math.sin(heading);
      const cos = Math.cos(heading);
      actor.parts.forEach((part) => {
        const reach = part.arm ? Math.max(0, Math.sin(elapsed * 1.55 + actor.index)) * 0.19 : 0;
        const x = part.p[0];
        const z = part.p[2] - reach;
        tmpObject.position.set(
          p[0] + (x * cos + z * sin) * scale,
          p[1] + (part.p[1] + reach * 0.45) * scale,
          p[2] + (z * cos - x * sin) * scale,
        );
        tmpObject.rotation.set(part.arm ? -reach * 1.7 : 0, heading, part.arm ? part.arm * reach * 0.45 : 0);
        tmpObject.scale.set(part.s[0] * scale, part.s[1] * scale, part.s[2] * scale);
        tmpObject.updateMatrix();
        mesh.current!.setMatrixAt(instance++, tmpObject.matrix);
      });
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    if (!mesh.current) return;
    mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parts.forEach(({ part }, index) => mesh.current!.setColorAt(index, tmpColor.set(part.color!)));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    // Inventory can resize this mesh. Its new instances need their real poses
    // before the first paint, including when reduced motion uses demand frames.
    updatePoses();
  }, [parts]);
  useFrame(updatePoses);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, parts.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
      userData={{
        hubMotion: 'handling',
        toteCount: beltCount,
        loadedToteCount: actors.filter((actor) => actor.kind === 'tote' && actor.assetId).length,
        operatorCount: actors.filter((actor) => actor.kind === 'worker').length,
        cartCount: actors.filter((actor) => actor.kind === 'cart').length,
        handoffCount: actors.filter((actor) => actor.kind === 'handoff').length,
        instanceRoles: parts.map(({ actor }) => actor.kind),
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const assetId = parts[event.instanceId ?? -1]?.actor.assetId;
        if (assetId) {
          event.stopPropagation();
          onSelect(assetId, 'asset');
        }
      }}
    >
      <boxGeometry />
      <meshStandardMaterial {...material} />
    </instancedMesh>
  );
}

function DockVehicle({
  vehicleId,
  index,
  time,
  selected,
  onSelect,
}: {
  vehicleId: string;
  index: number;
  time: MutableRefObject<number>;
  selected: boolean;
  onSelect: HubSelect;
}) {
  const group = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const profile = getLiveVehicleProfile(vehicleId);
  const first = getLiveVehiclePose(vehicleId, time.current);
  const initial = first ? getHubDockPose(first, index) : null;
  useFrame(() => {
    if (!group.current) return;
    const pose = getLiveVehiclePose(vehicleId, time.current);
    if (!pose) return;
    const dock = getHubDockPose(pose, index);
    group.current.visible = dock.visible;
    group.current.position.set(...dock.p);
    group.current.rotation.y = dock.heading;
    if (beacon.current) {
      beacon.current.visible = dock.unloading;
      beacon.current.scale.setScalar(0.9 + Math.sin(time.current * 3) * 0.1);
    }
  });
  return (
    <group
      ref={group}
      position={initial?.p ?? [-20, 0, 0]}
      rotation={[0, -Math.PI / 2, 0]}
      visible={initial?.visible ?? false}
      scale={1.12}
      userData={{ hubMotion: 'dockVehicle', vehicleId }}
    >
      <FleetVan
        color={profile?.color}
        visualKind={profile?.visualKind}
        onClick={() => onSelect(vehicleId, 'vehicle')}
      />
      <mesh ref={beacon} position={[0, 1.5, -0.65]} visible={initial?.unloading ?? false}>
        <boxGeometry args={[0.2, 0.1, 0.2]} />
        <meshStandardMaterial color="#e2bc65" emissive="#c39b43" emissiveIntensity={0.35} />
      </mesh>
      {selected && <Ring position={[0, 0.04, 0]} radius={1.65} />}
    </group>
  );
}

export default function HubScene({
  snapshot,
  selectedId,
  onSelect,
  roofVisible = false,
  language = 'id',
  liveFrame,
  paused = false,
  reducedMotion = false,
  cursor,
}: {
  snapshot: Snapshot;
  selectedId?: string | null;
  onSelect: HubSelect;
  roofVisible?: boolean;
  language?: 'id' | 'en';
  liveFrame?: LiveOperationsFrame;
  paused?: boolean;
  reducedMotion?: boolean;
  liveSpeed?: number;
  cursor?: number;
}) {
  const incomingTime = liveFrame?.elapsedSeconds ?? cursor ?? snapshot.cursor;
  const clock = useRef(incomingTime);
  const stillTime = useRef(0);
  if (!liveFrame || paused || reducedMotion) clock.current = incomingTime;
  useFrame(() => {
    if (liveFrame && !paused) clock.current = readLiveVisualSeconds(reducedMotion);
  }, -3);
  const zoneItems = useMemo(
    () => HUB_ZONES.map((zone) => getHubZoneAssets(snapshot, zone.id, liveFrame)),
    [snapshot, liveFrame],
  );
  const devices = useMemo(
    () =>
      zoneItems.flatMap((items, index) =>
        index === 0
          ? []
          : items
              .slice(0, 20)
              .flatMap((item, j) =>
                makeDevice(
                  item,
                  offset(HUB_ZONES[index].p, [-1.8 + (j % 5) * 0.85, 0.18, 1 + Math.floor(j / 5) * 0.75]),
                ),
              ),
      ),
    [zoneItems],
  );
  const actors = useMemo(() => makeActors(zoneItems), [zoneItems]);
  return (
    <group>
      <Batch items={furniture} />
      <Batch items={architecture} labelOccluder />
      {HUB_ZONES.map((zone, index) => {
        const items = zoneItems[index];
        const selected = zone.id === selectedId;
        return (
          <group key={zone.id} position={zone.p}>
            <Box
              p={[0, 0.13, 0]}
              s={[5.65, 0.08, 6.7]}
              color={selected ? '#d7e1bf' : zone.color}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onSelect(zone.id, 'zone');
              }}
            />
            <Label
              id={`zone-${zone.id}`}
              priority={50 + Math.min(items.length, 20)}
              position={[0, 2.8, -2.7]}
              selected={selected}
              onClick={() => onSelect(zone.id, 'zone')}
            >
              {language === 'en' ? zone.en : zone.name}{' '}
              <span style={{ marginLeft: 6, opacity: 0.65 }}>{items.length}</span>
            </Label>
            {selected && <Ring position={[0, 0.24, 0]} radius={2.7} />}
          </group>
        );
      })}
      <DeviceBatch items={devices} onSelect={onSelect} />
      <OperationsBatch actors={actors} time={reducedMotion ? stillTime : clock} onSelect={onSelect} />
      {liveFrame ? (
        liveFrame.vehicles.map((vehicle, index) => (
          <DockVehicle
            key={vehicle.vehicleId}
            vehicleId={vehicle.vehicleId}
            index={index}
            time={clock}
            selected={selectedId === vehicle.vehicleId}
            onSelect={onSelect}
          />
        ))
      ) : (
        <>
          <group position={[-16.15, 0.16, -4]} rotation={[0, -Math.PI / 2, 0]} scale={1.25}>
            <FleetVan bulky />
          </group>
          <group position={[-16.15, 0.16, 4]} rotation={[0, -Math.PI / 2, 0]} scale={1.1}>
            <FleetVan />
          </group>
        </>
      )}
      {roofVisible && <Batch items={roof} labelOccluder />}
    </group>
  );
}
