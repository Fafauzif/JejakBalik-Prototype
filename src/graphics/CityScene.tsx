import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { RouteRecord, Snapshot } from '../domain/types';
import { getVehiclePose } from '../domain';
import { getLiveVehiclePose, liveRoadPaths, type LiveOperationsFrame } from '../domain/live-operations';
import world from './world-data.json';
import partners from '../domain/data/PARTNERS.json';
import { getLiveVehicleProfile } from '../domain/partner-logistics';
import { getPartnerStyle } from './partner-styles';
import { getAmbientTrafficPose } from './vehicle-motion';
import { readLiveVisualSeconds } from '../state/network-store';
import { Batch, Box, FleetVan, Label, Ring, ribbon, type Instance, type Point } from './primitives';
import { allRoads, makeCity, adaptCityToRoads, riverDistance } from './city-geometry';
import { makeCityDetails } from './city-details';
import type { SelectKind } from '../features/world/world-types';
export type { SelectKind } from '../features/world/world-types';
export { allRoads, makeCity, adaptCityToRoads } from './city-geometry';
export interface CityProps {
  snapshot: Snapshot;
  routes: readonly RouteRecord[];
  cursor: number;
  liveFrame?: LiveOperationsFrame;
  paused?: boolean;
  liveSpeed?: number;
  selectedId?: string | null;
  onSelect: (id: string, kind?: SelectKind) => void;
  quality: string;
  reducedMotion: boolean;
  focusTarget?: string | null;
  language?: 'id' | 'en';
}
function RoadNetwork({ routes, live = false }: { routes: readonly RouteRecord[]; live?: boolean }) {
  const { roadItems, lines, bridges } = useMemo(() => {
    const unique = new Set<string>(),
      items: Instance[] = [],
      lines: Instance[] = [],
      bridges: Instance[] = [];
    [...allRoads, ...(live ? liveRoadPaths : routes.map((r) => r.path))].forEach((path, pi) => {
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1],
          b = path[i],
          key = [a.join(','), b.join(',')].sort().join(':');
        if (unique.has(key)) continue;
        unique.add(key);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.01) continue;
        let width = pi >= 7 ? 2.6 : 1.3;
        const x = (a[0] + b[0]) / 2,
          z = (a[1] + b[1]) / 2,
          rotation = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        items.push({
          p: [x, 0.13, z],
          s: [len, 0.14, width],
          r: rotation,
          color: pi >= 7 ? '#b9bfb3' : '#c7c9b9',
        });
        if (len > 8)
          for (let d = 1; d < len; d += 3.2) {
            const u = d / len;
            lines.push({
              p: [a[0] + (b[0] - a[0]) * u, 0.212, a[1] + (b[1] - a[1]) * u],
              s: [1.3, 0.012, 0.07],
              r: rotation,
              color: '#ecebdb',
            });
          }
        for (let d = 0; d < len; d += 1.5) {
          const u = d / len,
            xx = a[0] + (b[0] - a[0]) * u,
            zz = a[1] + (b[1] - a[1]) * u;
          if (riverDistance(xx, zz) < 2.9) {
            bridges.push({
              p: [xx, 0.31, zz - width / 2],
              s: [1.6, 0.18, 0.12],
              r: rotation,
              color: '#e8dfc9',
            });
            bridges.push({
              p: [xx, 0.31, zz + width / 2],
              s: [1.6, 0.18, 0.12],
              r: rotation,
              color: '#e8dfc9',
            });
          }
        }
      }
    });
    return { roadItems: items, lines, bridges };
  }, [live, JSON.stringify(routes.map((r) => r.path))]);
  return (
    <>
      <Batch items={roadItems} shadow={false} />
      <Batch items={lines} shadow={false} />
      <Batch items={bridges} />
    </>
  );
}
function Landmark({ type, position }: { type: number; position: Point }) {
  return (
    <group position={position} userData={{ labelOccluder: true }}>
      {type === 0 ? (
        <>
          <Box p={[0, 1, 0]} s={[4, 2, 4]} color="#dacba9" />
          <Box p={[0, 7, 0]} s={[1.2, 12, 1.2]} color="#eae2cc" />
          <mesh position={[0, 14, 0]} castShadow>
            <coneGeometry args={[0.7, 2, 5]} />
            <meshStandardMaterial color="#bb9958" />
          </mesh>
          <Box p={[0, 0.1, 0]} s={[9, 0.25, 9]} color="#d1c6aa" />
        </>
      ) : type === 1 ? (
        <>
          <Box p={[0, 6, 0]} s={[3, 12, 4]} color="#b3c8c2" />
          <Box p={[3, 9, -1]} s={[2, 18, 3]} color="#c6d6cd" />
          <Box p={[-2, 4, 2]} s={[2, 8, 3]} color="#e5dcc7" />
          <Box p={[1.5, 12.7, -0.8]} s={[4, 0.45, 3]} color="#eee5d3" />
        </>
      ) : (
        <>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[3, 4, 6, 16]} />
            <meshStandardMaterial color="#d6c5a5" />
          </mesh>
          <mesh position={[0, 6, 0]} castShadow>
            <sphereGeometry args={[3.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a6b4a1" />
          </mesh>
        </>
      )}
    </group>
  );
}
function Depot({
  onSelect,
  selected,
  language,
}: {
  onSelect: CityProps['onSelect'];
  selected: boolean;
  language?: 'id' | 'en';
}) {
  const rafters: Instance[] = Array.from({ length: 9 }, (_, i) => ({
    p: [-4 + i, 3.9, -3.5] as Point,
    s: [0.09, 0.08, 6] as Point,
    color: '#66846e',
  }));
  return (
    <group
      userData={{ labelOccluder: true, labelOwner: true }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect('H01', 'hub');
      }}
    >
      <Box p={[0, 0.04, -3.5]} s={[12, 0.12, 11]} color="#d1d3bc" />
      <Box p={[0, 1.7, -3.6]} s={[8.5, 3.4, 5.8]} color="#e8dfc8" />
      <Box p={[0, 3.6, -3.5]} s={[9.3, 0.4, 6.5]} color="#57785f" />
      <Batch items={rafters} />
      <Batch
        items={[
          ...[-2.7, -0.9, 0.9, 2.7].flatMap((x) =>
            [-4.6, -2.7].map((z) => ({
              p: [x, 3.84, z] as Point,
              s: [1.5, 0.06, 1.35] as Point,
              color: '#496a70',
            })),
          ),
          ...[-4.5, 4.5].map((x) => ({
            p: [x, 2.1, -0.4] as Point,
            s: [0.12, 2.8, 0.12] as Point,
            color: '#3c6650',
          })),
          { p: [0, 3.2, -0.1] as Point, s: [9.4, 0.15, 1.3] as Point, color: '#749278' },
          ...[-3.7, -2.1, -0.5, 1.1, 2.7].map((x) => ({
            p: [x, 0.12, 2.7] as Point,
            s: [0.7, 0.035, 1.3] as Point,
            color: '#f1e8c8',
          })),
          ...[-4.7, 4.7].flatMap((x) =>
            [0.7, 1.5].map((z) => ({
              p: [x, 0.48, z] as Point,
              s: [0.65, 0.8, 0.65] as Point,
              color: z === 0.7 ? '#64917c' : '#c29768',
            })),
          ),
        ]}
      />
      <Box p={[0, 2.1, -0.63]} s={[8.6, 0.65, 0.12]} color="#355f4b" />
      <Batch
        items={[-2.8, 0, 2.8].flatMap((x) => [
          { p: [x, 1, -0.62] as Point, s: [1.7, 1.7, 0.1] as Point, color: '#84958a' },
          { p: [x, 0.07, 1] as Point, s: [2.2, 0.03, 2.4] as Point, color: '#ded4ab' },
        ])}
      />
      {selected && <Ring position={[0, 0.25, -3]} radius={7} />}
      <Label
        id="hub-H01"
        priority={90}
        position={[0, 5, -3]}
        onClick={() => onSelect('H01', 'hub')}
        accent
        selected={selected}
      >
        {language === 'en' ? 'CONSOLIDATION HUB' : 'PUSAT KONSOLIDASI'} ↗
      </Label>
    </group>
  );
}
function Partner({
  p,
  index,
  onSelect,
  selected,
  language,
}: {
  p: (typeof partners)[number];
  index: number;
  onSelect: CityProps['onSelect'];
  selected: boolean;
  language?: 'id' | 'en';
}) {
  const style = getPartnerStyle(p.id);
  return (
    <group
      userData={{ labelOccluder: true, labelOwner: true }}
      position={[p.position[0], 0, p.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(p.id, 'destination');
      }}
    >
      <Box p={[0, 0.15, 0]} s={[7, 0.2, 6]} color="#d8d6c3" />
      <Box p={[0, 1.3, 0]} s={[5.5, 2.6, 4]} color="#e6ddc9" />
      <Box p={[0, 2.7, 0]} s={[6, 0.25, 4.5]} color={style.color} />
      {index === 2 ? (
        <>
          <mesh position={[2, 2.8, -1]} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 5, 10]} />
            <meshStandardMaterial color="#bbbcae" />
          </mesh>
          <Box p={[-1, 1, 2.4]} s={[2, 1.8, 0.8]} color="#a0b9b2" />
        </>
      ) : index === 0 ? (
        <>
          <Box p={[0, 1.3, 2.04]} s={[4.5, 1.6, 0.05]} color="#aac4bb" />
          <Box p={[0, 2.85, 0]} s={[1, 0.1, 1]} color="#eadbb1" />
        </>
      ) : (
        <Box p={[0, 1, 2.04]} s={[2.6, 1.8, 0.05]} color="#a5ad9a" />
      )}
      <Batch
        items={[
          { p: [0, 2.08, 2.045], s: [4.8, 0.35, 0.045], color: style.color },
          { p: [0, 2.99, 0], s: [1.1, 0.36, 1.1], color: style.color },
          ...(index === 1
            ? [-1.6, 0, 1.6].map((x) => ({
                p: [x, 2.86, -0.7] as Point,
                s: [1.1, 0.1, 1.2] as Point,
                color: '#6b6280',
              }))
            : []),
          ...(index === 3
            ? [-1.7, 1.7].map((x) => ({
                p: [x, 2.96, 0] as Point,
                s: [0.7, 0.3, 1.4] as Point,
                color: '#ddc68c',
              }))
            : []),
        ]}
      />
      <Batch
        items={[
          ...[-1.8, 0, 1.8].map((x) => ({
            p: [x, 0.55, 2.07] as Point,
            s: [0.8, 0.08, 0.045] as Point,
            color: '#c8d4bd',
          })),
          { p: [-2.55, 1.25, 2.08] as Point, s: [0.15, 2.4, 0.14] as Point, color: style.color },
          { p: [2.55, 1.25, 2.08] as Point, s: [0.15, 2.4, 0.14] as Point, color: style.color },
          { p: [0, 1.92, 2.24] as Point, s: [5.8, 0.1, 0.6] as Point, color: style.color },
          ...[-1.6, 0, 1.6].map((x) => ({
            p: [x, 0.5, -2.3] as Point,
            s: [0.75, 0.7, 0.75] as Point,
            color: index === 3 ? '#c5a467' : '#88a391',
          })),
        ]}
      />
      {selected && <Ring position={[0, 0.29, 0]} radius={5} color={style.ink} />}
      <Label
        id={`partner-${p.id}`}
        priority={45}
        position={[0, 3.75, 0]}
        offset={[0, -8]}
        tone={style.color}
        badge={`${style.badge} ${style.role[language === 'en' ? 'en' : 'id']}`}
        mobileHidden
        selected={selected}
        onClick={() => onSelect(p.id, 'destination')}
      >
        {p.name}
      </Label>
    </group>
  );
}
function Traffic({
  reducedMotion,
  paused = false,
  liveSpeed = 1,
}: {
  reducedMotion: boolean;
  paused?: boolean;
  liveSpeed?: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (reducedMotion || paused || !ref.current) return;
    time.current += delta * liveSpeed;
    const pose = getAmbientTrafficPose(time.current);
    ref.current.position.set(pose.x, 0.22, pose.z);
    ref.current.rotation.y = pose.heading;
  }, -2);
  return (
    <group ref={ref} position={[-40, 0.22, -34]} scale={0.68} userData={{ labelOccluder: false }}>
      <Box p={[0, 0.42, 0]} s={[1, 0.65, 2]} color="#c7bbaa" />
      <Box p={[0, 0.83, -0.1]} s={[0.8, 0.32, 1]} color="#9eafa7" />
    </group>
  );
}
function LiveFleetVehicle({
  vehicleId,
  elapsedSeconds,
  paused,
  reducedMotion,
  selected,
  onSelect,
  liveSpeed = 1,
  language,
}: {
  vehicleId: string;
  elapsedSeconds: number;
  paused?: boolean;
  reducedMotion: boolean;
  selected: boolean;
  onSelect: CityProps['onSelect'];
  liveSpeed?: number;
  language?: 'id' | 'en';
}) {
  const profile = getLiveVehicleProfile(vehicleId);
  const group = useRef<THREE.Group>(null);
  const first = getLiveVehiclePose(vehicleId, elapsedSeconds)!;
  useFrame(() => {
    if (!group.current) return;
    const elapsed = readLiveVisualSeconds(reducedMotion);
    const pose = getLiveVehiclePose(vehicleId, elapsed);
    if (!pose) return;
    group.current.position.set(pose.position[0], 0.3, pose.position[1]);
    group.current.rotation.y = pose.heading;
  }, -2);
  return (
    <group
      ref={group}
      userData={{ labelOwner: true, liveVehicleId: vehicleId }}
      position={[first.position[0], 0.3, first.position[1]]}
      rotation={[0, first.heading, 0]}
      scale={vehicleId === 'V03' ? 1.25 : vehicleId === 'V04' ? 1.35 : 1.15}
    >
      <FleetVan
        visualKind={profile?.visualKind}
        color={profile?.color}
        onClick={() => onSelect(vehicleId, 'vehicle')}
      />
      <Label
        id={`vehicle-${vehicleId}`}
        priority={70}
        tone={profile?.color}
        position={[0, 2.8, 0]}
        selected={selected}
        onClick={() => onSelect(vehicleId, 'vehicle')}
      >
        {vehicleId}
        {selected && profile ? ` · ${profile.role[language === 'en' ? 'en' : 'id']}` : ''}
      </Label>
      {selected && <Ring position={[0, 0.05, 0]} radius={2} />}
    </group>
  );
}
export default function CityScene({
  snapshot,
  routes,
  cursor,
  liveFrame,
  paused,
  liveSpeed = 1,
  selectedId,
  onSelect,
  quality,
  reducedMotion,
  focusTarget,
  language,
}: CityProps) {
  const city = useMemo(
    () =>
      adaptCityToRoads(
        makeCity(quality === 'lite' || quality === 'low'),
        liveFrame ? liveRoadPaths : routes.map((r) => r.path),
      ),
    [quality === 'lite' || quality === 'low', !!liveFrame, JSON.stringify(routes.map((r) => r.path))],
  );
  const details = useMemo(
    () => makeCityDetails(city.bodies, quality === 'lite' || quality === 'low'),
    [city.bodies, quality],
  );
  const river = useMemo(() => ribbon(world.riverPolyline, 5.6, 0.035), []),
    banks = useMemo(() => ribbon(world.riverPolyline, 6.5, 0.018), []);
  const selectedDistrict = world.districts.find((d) => d.id === selectedId || d.id === focusTarget),
    house = world.households.find((h) => h.id === selectedId || h.id === focusTarget);
  const visibleDistrict = selectedDistrict?.id || house?.districtId;
  const homes = useMemo(
    () =>
      world.households.map((h, i) => ({
        p: [h.position[0], 0.74, h.position[1] + (i % 6 < 3 ? -0.88 : 0.88)] as Point,
        s: [0.9, 1.1, 0.7] as Point,
        color: i % 5 === 0 ? '#d4bd8f' : '#f0e6ce',
      })),
    [],
  );
  const roofs = useMemo(
    () =>
      homes.map((h) => ({
        ...h,
        p: [h.p[0], 1.48, h.p[2]] as Point,
        s: [1.05, 0.45, 0.88] as Point,
        color: '#b68a6d',
        r: Math.PI / 4,
      })),
    [homes],
  );
  const grouped = Array.from({ length: 6 }, (_, i) => `V0${i + 1}`).map((vehicleId, i) => {
    const vr = routes.filter((r) => r.vehicleId === vehicleId);
    const active = vr.find((r) => cursor >= r.startStorySecond && cursor < r.endStorySecond);
    const future = vr.find((r) => cursor < r.startStorySecond);
    const r = active || future || vr[vr.length - 1];
    const staged = !active;
    const pose = active ? getVehiclePose(active, cursor) : null;
    return {
      id: vehicleId,
      route: r,
      position: pose
        ? ([pose.position[0], 0.25, pose.position[1]] as Point)
        : ([-4 + i * 1.6, 0.25, 4] as Point),
      heading: pose?.heading || Math.PI,
      staged,
    };
  });
  const selectedRoute = routes.find(
    (r) =>
      r.id === selectedId || r.vehicleId === selectedId || r.stops.some((s) => s.householdId === selectedId),
  );
  return (
    <>
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <boxGeometry args={[136, 0.4, 124]} />
        <meshStandardMaterial color="#dfdfcc" roughness={0.95} />
      </mesh>
      <Box p={[0, -0.58, 0]} s={[137, 0.25, 125]} color="#c8c2ad" />
      <mesh geometry={banks}>
        <meshStandardMaterial color="#cbd1b6" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={river}>
        <meshStandardMaterial color="#83b0a5" roughness={0.3} metalness={0.12} side={THREE.DoubleSide} />
      </mesh>
      <RoadNetwork routes={routes} live={!!liveFrame} />
      <Batch
        shadow={false}
        items={[-45, 36].flatMap((x) =>
          [-34, -3, 41].flatMap((z) =>
            Array.from({ length: 5 }, (_, i) => ({
              p: [x - 1.6 + i * 0.75, 0.218, z + 2] as Point,
              s: [0.42, 0.012, 1.2] as Point,
              color: '#f2ecda',
            })),
          ),
        )}
      />
      <Box p={[-4, 2.7, -37]} s={[93, 0.28, 2.2]} color="#c3c2ac" />
      <Batch
        items={Array.from({ length: 9 }, (_, i) => ({
          p: [-44 + i * 10, 1.3, -37] as Point,
          s: [0.55, 2.6, 0.6] as Point,
          color: '#c2c4ae',
        }))}
      />
      <Batch items={city.park} shadow={false} />
      <Batch items={city.bodies} labelOccluder />
      <Batch items={city.roofs} labelOccluder />
      <Batch items={city.windows} shadow={false} />
      <Batch items={details.trim} />
      <Batch items={details.glazing} shadow={false} />
      {details.roofEquipment.length > 0 && <Batch items={details.roofEquipment} />}
      <Batch items={city.trunks} shape="trunk" />
      <Batch items={city.trees} shape="tree" />
      <Batch items={homes} labelOccluder />
      <Batch
        items={homes.flatMap((h) => [
          { p: [h.p[0], 0.6, h.p[2] + 0.36] as Point, s: [0.2, 0.65, 0.035] as Point, color: '#698273' },
          {
            p: [h.p[0] + 0.27, 0.9, h.p[2] + 0.36] as Point,
            s: [0.22, 0.26, 0.035] as Point,
            color: '#94b5ae',
          },
        ])}
        shadow={false}
      />
      <Batch items={roofs} shape="roof" labelOccluder />
      <Landmark type={0} position={[-9, 0, -32]} />
      <Landmark type={1} position={[39, 0, 37]} />
      <Landmark type={2} position={[-49, 0, -6]} />
      <Depot onSelect={onSelect} selected={selectedId === 'H01'} language={language} />
      {partners.map((p, i) => (
        <Partner
          p={p}
          index={i}
          key={p.id}
          onSelect={onSelect}
          selected={selectedId === p.id}
          language={language}
        />
      ))}
      {world.districts
        .filter((d) => d.active)
        .map((d, i) => (
          <group
            key={d.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(d.id, 'district');
            }}
          >
            <Label
              id={`district-${d.id}`}
              priority={20}
              position={[d.center[0], 2.5, d.center[1] + 5]}
              selected={selectedId === d.id}
              mobileHidden
              onClick={() => onSelect(d.id, 'district')}
            >
              <span style={{ color: '#8a9c67', marginRight: 4 }}>●</span>
              {d.name} <span style={{ opacity: 0.5, marginLeft: 3 }}>06</span>
            </Label>
            <Ring
              position={[d.center[0], 0.23, d.center[1]]}
              radius={visibleDistrict === d.id ? 5 : 1}
              color={visibleDistrict === d.id ? '#a95135' : '#8da685'}
            />
          </group>
        ))}
      {world.households
        .filter((h) => h.districtId === visibleDistrict)
        .map((h) => (
          <group key={h.id}>
            <mesh
              position={[h.position[0], 2, h.position[1]]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(h.id, 'household');
              }}
            >
              <sphereGeometry args={[0.45, 12, 8]} />
              <meshStandardMaterial color={h.id === selectedId ? '#a95135' : '#37735a'} />
            </mesh>
            <Label
              id={`household-${h.id}`}
              priority={55}
              position={[h.position[0], 3, h.position[1]]}
              onClick={() => onSelect(h.id, 'household')}
              selected={h.id === selectedId}
            >
              {h.id}
            </Label>
          </group>
        ))}
      {routes.map((r) => (
        <Line
          key={r.id}
          points={r.path.map((p) => [p[0], 0.26, p[1]] as Point)}
          color={r.guard ? '#b58c42' : r === selectedRoute ? '#a95135' : '#45866c'}
          transparent
          opacity={selectedRoute ? (r === selectedRoute ? 0.95 : 0.09) : 0.24}
          lineWidth={r === selectedRoute ? 3 : 1.25}
        />
      ))}
      {selectedRoute?.stops.map((s, i) => (
        <group key={s.householdId}>
          <Ring position={[s.position[0], 0.3, s.position[1]]} radius={0.8} color="#a95135" />
          <mesh
            position={[s.position[0], 0.6, s.position[1]]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(s.householdId, 'household');
            }}
          >
            <sphereGeometry args={[0.25, 10, 8]} />
            <meshBasicMaterial color="#a95135" />
          </mesh>
        </group>
      ))}
      {liveFrame
        ? liveFrame.vehicles.map((v) => (
            <LiveFleetVehicle
              key={v.vehicleId}
              vehicleId={v.vehicleId}
              elapsedSeconds={liveFrame.elapsedSeconds}
              paused={paused}
              liveSpeed={liveSpeed}
              language={language}
              reducedMotion={reducedMotion}
              selected={selectedId === v.vehicleId}
              onSelect={onSelect}
            />
          ))
        : grouped.map((v, i) => (
            <group
              key={v.id}
              position={v.position}
              rotation={[0, v.heading, 0]}
              scale={v.id === 'V03' ? 1.1 : 0.88}
            >
              <FleetVan
                visualKind={getLiveVehicleProfile(v.id)?.visualKind}
                color={getLiveVehicleProfile(v.id)?.color}
                onClick={() => onSelect(v.id, 'vehicle')}
              />
              {selectedId === v.id && <Ring position={[0, 0.05, 0]} radius={2} />}
            </group>
          ))}
      <Traffic reducedMotion={reducedMotion} paused={paused} liveSpeed={liveSpeed} />
    </>
  );
}
