import { useRef, createContext, useContext, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '../domain/types';
import { Box, Batch, Label, type Point } from './primitives';
interface DeviceProps {
  asset: Asset;
  exploded: boolean;
  selectedComponent?: string | null;
  onComponentSelect?: (component: string) => void;
  reducedMotion: boolean;
  language?: 'id' | 'en';
}
const partNames: Record<string, [string, string]> = {
  screen: ['Layar', 'Screen'],
  display: ['Layar', 'Display'],
  battery: ['Baterai', 'Battery'],
  mainboard: ['Papan utama', 'Mainboard'],
  shell: ['Casing', 'Shell'],
  keyboard: ['Papan ketik', 'Keyboard'],
  storage: ['Penyimpanan', 'Storage'],
  antenna: ['Antena', 'Antenna'],
  powerModule: ['Modul daya', 'Power module'],
  connector: ['Konektor', 'Connector'],
  conductor: ['Konduktor', 'Conductor'],
  insulation: ['Isolasi', 'Insulation'],
  motor: ['Motor', 'Motor'],
  controlBoard: ['Papan kontrol', 'Control board'],
  backlight: ['Lampu latar', 'Backlight'],
  stand: ['Penyangga', 'Stand'],
  paperPath: ['Jalur kertas', 'Paper path'],
  drumOrCabinet: ['Drum / kabinet', 'Drum / cabinet'],
  protectiveShell: ['Pelindung', 'Protective shell'],
  cells: ['Kelompok sel', 'Cell group'],
};
function Round({
  p = [0, 0, 0],
  s = [1, 1, 1],
  color = '#d0d1c5',
  radius = 0.1,
  metalness = 0.1,
}: {
  p?: Point;
  s?: Point;
  color?: string;
  radius?: number;
  metalness?: number;
}) {
  return (
    <RoundedBox
      position={p}
      args={s}
      radius={Math.min(radius, Math.min(...s) * 0.48)}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.45} metalness={metalness} />
    </RoundedBox>
  );
}
function Cylinder({
  p = [0, 0, 0],
  radius = 0.5,
  height = 0.5,
  color = '#82968b',
  rotation = [0, 0, 0],
}: {
  p?: Point;
  radius?: number;
  height?: number;
  color?: string;
  rotation?: Point;
}) {
  return (
    <mesh position={p} rotation={rotation} castShadow>
      <cylinderGeometry args={[radius, radius, height, 28]} />
      <meshStandardMaterial color={color} roughness={0.44} metalness={0.25} />
    </mesh>
  );
}
function Board({ w = 1.4, h = 1.3 }: { w?: number; h?: number }) {
  return (
    <>
      <Round s={[w, h, 0.09]} radius={0.02} color="#427d67" />
      <Batch
        items={[
          ...Array.from({ length: 6 }, (_, i) => ({
            p: [-w * 0.3 + (i % 3) * w * 0.3, -h * 0.2 + Math.floor(i / 3) * h * 0.45, 0.07] as Point,
            s: [w * 0.19, h * 0.22, 0.09] as Point,
            color: i % 3 ? '#9eaa8e' : '#263d35',
          })),
          ...Array.from({ length: 12 }, (_, i) => ({
            p: [-w * 0.44 + (i % 6) * w * 0.15, -h * 0.42 + Math.floor(i / 6) * h * 0.8, 0.066] as Point,
            s: [w * 0.05, h * 0.055, 0.04] as Point,
            color: '#c7b77b',
          })),
          ...Array.from({ length: 4 }, (_, i) => ({
            p: [-w * 0.37 + i * w * 0.23, 0, 0.05] as Point,
            s: [0.018, h * 0.72, 0.012] as Point,
            color: '#91af8c',
          })),
          { p: [w * 0.43, 0, 0.08] as Point, s: [0.04, h * 0.75, 0.04] as Point, color: '#d3bf78' },
        ]}
      />
    </>
  );
}
function Part({
  id,
  offset,
  exploded,
  selected,
  onSelect,
  children,
  reducedMotion,
  label,
  language,
}: {
  id: string;
  offset: Point;
  exploded: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  children: ReactNode;
  reducedMotion: boolean;
  label?: Point;
  language?: 'id' | 'en';
}) {
  const ref = useRef<THREE.Group>(null!),
    target = useRef(new THREE.Vector3());
  target.current.set(...(exploded ? offset : ([0, 0, 0] as Point)));
  useFrame((state, delta) => {
    if (ref.current) {
      if (reducedMotion) ref.current.position.copy(target.current);
      else {
        ref.current.position.lerp(target.current, 1 - Math.exp(-Math.min(delta, 0.05) * 8));
        if (ref.current.position.distanceToSquared(target.current) > 0.0001) state.invalidate();
      }
    }
  });
  return (
    <group
      ref={ref}
      userData={{ labelOwner: true }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {children}
      {selected && (
        <Label position={label || [0, 1.8, 0]} accent onClick={() => onSelect?.(id)}>
          {partNames[id]?.[language === 'en' ? 1 : 0] || id}
        </Label>
      )}
    </group>
  );
}
const DeviceContext = createContext<Omit<DeviceProps, 'asset'>>({ exploded: false, reducedMotion: false });
function P({
  id,
  offset,
  children,
  label,
}: {
  id: string;
  offset: Point;
  children: ReactNode;
  label?: Point;
}) {
  const c = useContext(DeviceContext);
  return (
    <Part
      id={id}
      offset={offset}
      exploded={c.exploded}
      selected={c.selectedComponent === id}
      onSelect={c.onComponentSelect}
      reducedMotion={c.reducedMotion}
      language={c.language}
      label={label}
    >
      {children}
    </Part>
  );
}
export default function DeviceScene(props: DeviceProps) {
  const { asset, ...context } = props;
  const category = asset.category;
  return (
    <DeviceContext.Provider value={context}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#e8e4d7" roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[3.3, 3.5, 0.12, 64]} />
        <meshStandardMaterial color="#ddd9c8" roughness={0.8} />
      </mesh>
      <group position={[0, 0.6, 0]} rotation={[0, -0.15, 0]} userData={{ labelOccluder: true }}>
        {(category === 'phone' || category === 'tablet') && (
          <group
            position={[0, 1.75, 0]}
            rotation={[-0.12, 0, 0]}
            scale={category === 'tablet' ? [1.3, 1.05, 1] : [1, 1, 1]}
          >
            <P id="shell" offset={[-4.5, 0, 0]}>
              <Round s={[1.85, 3.45, 0.22]} color="#c7cabe" radius={0.14} metalness={0.4} />
              <Batch
                items={[
                  { p: [0.945, 0.6, 0] as Point, s: [0.035, 0.35, 0.1] as Point, color: '#8c9e90' },
                  { p: [-0.945, 0.4, 0] as Point, s: [0.035, 0.55, 0.1] as Point, color: '#8c9e90' },
                  { p: [0, -1.73, 0] as Point, s: [0.3, 0.025, 0.08] as Point, color: '#485f54' },
                ]}
              />
              <Round p={[-0.55, 1.27, -0.15]} s={[0.46, 0.56, 0.07]} color="#7d8e80" radius={0.1} />
              <Cylinder
                p={[-0.55, 1.31, -0.21]}
                radius={0.13}
                height={0.03}
                rotation={[Math.PI / 2, 0, 0]}
                color="#263c34"
              />
            </P>
            <P id="mainboard" offset={[3.9, 0.35, 0]}>
              <group position={[0.22, 0.72, 0.12]}>
                <Board w={1.25} h={1.22} />
              </group>
            </P>
            <P id="battery" offset={[-1.8, 0.15, 0]}>
              <Round p={[0, -0.48, 0.13]} s={[1.5, 1.68, 0.1]} radius={0.04} color="#9cae91" />
              <Box p={[0, -0.35, 0.2]} s={[0.75, 0.035, 0.01]} color="#dfe6cf" />
              <Box p={[0, -0.5, 0.2]} s={[0.45, 0.035, 0.01]} color="#dfe6cf" />
            </P>
            <P id="screen" offset={[1.1, 0, 0]}>
              <Round p={[0, 0, 0.25]} s={[1.76, 3.34, 0.13]} color="#263e36" radius={0.13} />
              <Round p={[0, 0, 0.325]} s={[1.57, 3.05, 0.02]} color="#7ba493" radius={0.1} />
              <Round p={[0, -0.52, 0.34]} s={[1.15, 1.35, 0.012]} color="#aec3a4" radius={0.08} />
              <Round p={[-0.4, 0.7, 0.34]} s={[0.35, 0.35, 0.012]} color="#e9d9a8" radius={0.05} />
              <Round p={[0.07, 0.7, 0.34]} s={[0.35, 0.35, 0.012]} color="#d7e2c8" radius={0.05} />
              <Round p={[0, 1.42, 0.35]} s={[0.42, 0.055, 0.014]} color="#345346" radius={0.02} />
            </P>
          </group>
        )}
        {category === 'laptop' && (
          <group position={[0, 0.55, 0]}>
            <P id="shell" offset={[0, -0.5, 0]}>
              <Round s={[3.8, 0.18, 2.45]} radius={0.08} color="#b6beb1" />
            </P>
            <P id="keyboard" offset={[0, 0.7, 1.65]}>
              <Round p={[0, 0.13, 0]} s={[3.65, 0.08, 2.35]} color="#cbd1c2" radius={0.04} />
              <Batch
                items={Array.from({ length: 48 }, (_, i) => ({
                  p: [-1.48 + (i % 12) * 0.27, 0.185, -0.78 + Math.floor(i / 12) * 0.245] as Point,
                  s: [0.21, 0.035, 0.18] as Point,
                  color: i > 35 ? '#5e7565' : '#3c5548',
                }))}
              />
              <Batch
                items={[
                  { p: [0, 0.185, 0.24] as Point, s: [1.4, 0.035, 0.16] as Point, color: '#536c5a' },
                  ...[-1.7, 1.7].flatMap((x) =>
                    Array.from({ length: 8 }, (_, i) => ({
                      p: [x, 0.182, -0.8 + i * 0.12] as Point,
                      s: [0.025, 0.015, 0.055] as Point,
                      color: '#748a77',
                    })),
                  ),
                  ...[-1.3, 1.3].map((x) => ({
                    p: [x, 0.14, -1.11] as Point,
                    s: [0.4, 0.1, 0.12] as Point,
                    color: '#748a77',
                  })),
                ]}
              />
              <Round p={[0, 0.18, 0.55]} s={[1.1, 0.02, 0.6]} color="#a6b4a4" radius={0.04} />
            </P>
            <P id="display" offset={[0, 1.8, -0.5]}>
              <group position={[0, 1.17, -1.2]} rotation={[-0.15, 0, 0]}>
                <Round s={[3.8, 2.4, 0.13]} color="#546f61" radius={0.08} />
                <Round p={[0, 0.06, 0.08]} s={[3.5, 2.08, 0.025]} color="#8fb4a1" radius={0.035} />
                <Box p={[0, -0.45, 0.1]} s={[2.8, 0.04, 0.008]} color="#d8e3c7" />
                <Box p={[-0.55, 0.2, 0.1]} s={[1.7, 0.7, 0.008]} color="#bfcfb0" />
              </group>
            </P>
            <P id="battery" offset={[-2.6, 0.45, 0.3]}>
              <Round p={[-0.8, 0.03, 0.4]} s={[1.4, 0.12, 0.9]} radius={0.03} color="#7d9175" />
            </P>
            <P id="mainboard" offset={[2.3, 1, 0]}>
              <group position={[0.55, 0.02, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
                <Board w={1.5} h={1.1} />
              </group>
            </P>
            <P id="storage" offset={[2.4, 0.25, 1.4]}>
              <Round p={[1.2, 0.03, 0.7]} s={[0.5, 0.09, 0.8]} radius={0.02} color="#a89c70" />
            </P>
          </group>
        )}
        {category === 'router' && (
          <group position={[0, 1, 0]}>
            <P id="shell" offset={[0, 1.45, 0]}>
              <Round s={[3, 0.48, 2]} radius={0.14} color="#e3e2d4" />
              {[0, 1, 2, 3].map((i) => (
                <Box
                  key={i}
                  p={[-0.75 + i * 0.5, -0.05, 1.01]}
                  s={[0.09, 0.05, 0.018]}
                  color={i === 3 ? '#b6b49c' : '#4d8c63'}
                />
              ))}
            </P>
            <P id="mainboard" offset={[0, 0.25, 0]}>
              <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <Board w={2.6} h={1.6} />
              </group>
            </P>
            <P id="antenna" offset={[-1.6, 0.7, -0.6]}>
              {[-1.2, 1.2].map((x) => (
                <group key={x} position={[x, 1, -0.7]} rotation={[0, 0, x * 0.16]}>
                  <Round s={[0.16, 2.1, 0.16]} radius={0.07} color="#748773" />
                </group>
              ))}
            </P>
            <P id="powerModule" offset={[2.3, 0.2, 1]}>
              <Round p={[1, -0.08, -0.5]} s={[0.55, 0.28, 0.65]} radius={0.03} color="#374e41" />
            </P>
          </group>
        )}
        {category === 'monitor' && (
          <group position={[0, 1.9, 0]}>
            <P id="shell" offset={[0, 0, -1.5]}>
              <Round s={[4.3, 2.7, 0.24]} color="#607e6a" radius={0.12} />
            </P>
            <P id="display" offset={[0, 0, 1.4]}>
              <Round p={[0, 0.02, 0.16]} s={[4.08, 2.44, 0.06]} color="#8eb3a1" radius={0.04} />
              <Box p={[-0.95, 0.3, 0.2]} s={[1.6, 1.2, 0.008]} color="#c8d5b7" />
              <Box p={[0.95, 0.63, 0.2]} s={[1.4, 0.16, 0.008]} color="#d4d9bd" />
              <Box p={[0.95, 0.2, 0.2]} s={[1.4, 0.09, 0.008]} color="#b4c7ad" />
            </P>
            <P id="backlight" offset={[0, 0, 0.7]}>
              <Round p={[0, 0, 0.08]} s={[3.95, 2.3, 0.04]} color="#edf0db" radius={0.03} />
            </P>
            <P id="controlBoard" offset={[2.6, -0.25, -0.5]}>
              <group position={[0, 0, -0.1]}>
                <Board w={1.5} h={0.9} />
              </group>
            </P>
            <P id="stand" offset={[0, -0.45, 0]}>
              <Round p={[0, -1.65, -0.05]} s={[0.3, 1.3, 0.3]} color="#9cae9a" radius={0.05} />
              <Round p={[0, -2.2, 0.1]} s={[1.65, 0.13, 1.1]} color="#9cae9a" radius={0.06} />
            </P>
          </group>
        )}
        {category === 'printer' && (
          <group position={[0, 1.25, 0]}>
            <P id="shell" offset={[0, 1.6, 0]}>
              <Round s={[3.4, 1.9, 2.6]} color="#d5d9cb" radius={0.18} />
              <Round p={[0, 0.99, -0.05]} s={[3.1, 0.12, 2.25]} color="#829480" radius={0.06} />
              <Round p={[0, -0.25, 1.32]} s={[2.55, 0.38, 0.04]} color="#445c4c" radius={0.04} />
              <Round p={[0.93, 0.5, 1.34]} s={[0.8, 0.38, 0.05]} color="#4e7261" radius={0.04} />
            </P>
            <P id="paperPath" offset={[0, -0.1, 2]}>
              <Round p={[0, -0.54, 1]} s={[2.6, 0.07, 2]} color="#a7b4a0" radius={0.03} />
              <Box p={[0, -0.48, 1.4]} s={[2.15, 0.035, 1.8]} color="#f3eedc" />
              {[-0.8, 0.8].map((x) => (
                <Cylinder
                  key={x}
                  p={[x, 0, 0]}
                  radius={0.13}
                  height={1.8}
                  rotation={[0, 0, Math.PI / 2]}
                  color="#5b6d5d"
                />
              ))}
            </P>
            <P id="motor" offset={[-2.5, 0, 0]}>
              <Cylinder p={[-1, 0, 0]} radius={0.35} height={0.6} rotation={[0, 0, Math.PI / 2]} />
            </P>
            <P id="controlBoard" offset={[2.5, 0.3, 0]}>
              <group position={[1, 0, 0]}>
                <Board w={1} h={1.2} />
              </group>
            </P>
            <P id="powerModule" offset={[1.5, -0.3, -1.8]}>
              <Round p={[0, -0.4, -0.7]} s={[1, 0.45, 0.65]} radius={0.05} color="#53664e" />
            </P>
          </group>
        )}
        {category === 'large_appliance' && (
          <group position={[0, 1.75, 0]}>
            <P id="shell" offset={[0, 1.8, -1]}>
              <Round s={[3.2, 3.5, 2.8]} color="#d7ddd0" radius={0.12} />
              <Box p={[0, 1.2, 1.42]} s={[3, 0.65, 0.05]} color="#96aa94" />
              <Cylinder
                p={[0.8, 1.22, 1.49]}
                radius={0.24}
                height={0.06}
                rotation={[Math.PI / 2, 0, 0]}
                color="#526d57"
              />
              <Round p={[-0.65, 1.22, 1.47]} s={[1.3, 0.29, 0.04]} color="#557b66" radius={0.02} />
            </P>
            <P id="drumOrCabinet" offset={[0, 0.1, 2]}>
              <Cylinder
                p={[0, -0.25, 1.4]}
                radius={1.1}
                height={0.15}
                rotation={[Math.PI / 2, 0, 0]}
                color="#9cae9e"
              />
              <Cylinder
                p={[0, -0.25, 1.5]}
                radius={0.85}
                height={0.17}
                rotation={[Math.PI / 2, 0, 0]}
                color="#446c5b"
              />
              <Cylinder
                p={[0, -0.25, 0.25]}
                radius={0.85}
                height={2.2}
                rotation={[Math.PI / 2, 0, 0]}
                color="#b6c0ac"
              />
            </P>
            <P id="motor" offset={[-2.5, -0.3, 0]}>
              <Cylinder p={[-0.75, -1, 0]} radius={0.45} height={0.8} color="#6d8570" />
            </P>
            <P id="controlBoard" offset={[2.5, 0.7, 0]}>
              <group position={[0.2, 1.1, 0.9]}>
                <Board w={1.5} h={0.6} />
              </group>
            </P>
            <P id="powerModule" offset={[1.7, -0.4, -1.4]}>
              <Round p={[0.8, -1.2, -0.6]} s={[0.6, 0.45, 0.8]} color="#4f684e" radius={0.04} />
            </P>
          </group>
        )}
        {category === 'small_appliance' && (
          <group position={[0, 1.2, 0]}>
            <P id="shell" offset={[0, 1.7, 0]}>
              <Round s={[2.2, 1.7, 2]} color="#b5c5a6" radius={0.22} />
              <Cylinder p={[0, 1.7, 0]} radius={0.7} height={1.7} color="#c2d7c7" />
              <Cylinder p={[0, 2.6, 0]} radius={0.8} height={0.15} color="#738d70" />
              <Round p={[0, -0.2, 1.02]} s={[1.4, 0.5, 0.06]} color="#789674" radius={0.07} />
            </P>
            <P id="motor" offset={[-2, 0, 0]}>
              <Cylinder radius={0.65} height={1.1} color="#809685" />
              <Cylinder p={[0, 0.85, 0]} radius={0.08} height={0.75} color="#c3c3b3" />
            </P>
            <P id="controlBoard" offset={[2, 0.4, 1]}>
              <group position={[0.5, 0, 0.7]}>
                <Board w={0.9} h={0.8} />
              </group>
            </P>
            <P id="powerModule" offset={[1.6, -0.6, -1]}>
              <Round p={[0.4, -0.65, 0]} s={[0.7, 0.3, 0.9]} radius={0.04} color="#526649" />
            </P>
          </group>
        )}
        {category === 'accessories' && (
          <group position={[0, 1.2, 0]}>
            <P id="insulation" offset={[0, 0, -0.85]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1, 0.12, 10, 48]} />
                <meshStandardMaterial color="#557964" roughness={0.65} />
              </mesh>
              <Round p={[1.1, 0, 1.1]} s={[0.45, 0.22, 0.7]} radius={0.06} color="#567961" />
            </P>
            <P id="conductor" offset={[0, 0.65, 0.65]}>
              {[-0.1, 0, 0.1].map((x) => (
                <mesh key={x} position={[0, x, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[1, 0.028, 5, 48]} />
                  <meshStandardMaterial color="#ba9761" />
                </mesh>
              ))}
            </P>
            <P id="connector" offset={[1.4, 0.4, 1]}>
              <Round p={[1.1, 0, 1.56]} s={[0.36, 0.14, 0.3]} radius={0.025} color="#c7cbbb" />
              <Round p={[-1, 0, 0.8]} s={[0.35, 0.17, 0.6]} radius={0.035} color="#c7cbbb" />
            </P>
          </group>
        )}
        {category === 'battery' && (
          <group position={[0, 1.2, 0]}>
            <P id="protectiveShell" offset={[0, 0, -1.35]}>
              <Round s={[2.8, 1.85, 0.75]} radius={0.14} color="#788d69" />
              <Box p={[0, 0.1, 0.39]} s={[1.4, 0.06, 0.02]} color="#e5e1bd" />
              <Box p={[0, -0.1, 0.39]} s={[0.8, 0.05, 0.02]} color="#e5e1bd" />
            </P>
            <P id="cells" offset={[0, 0.6, 1.2]}>
              {[-0.85, 0, 0.85].map((x) => (
                <Cylinder key={x} p={[x, 0, 0]} radius={0.32} height={1.4} color="#a4b790" />
              ))}
            </P>
            <P id="connector" offset={[1.8, 1.1, 0]}>
              <Round p={[0.9, 1, 0]} s={[0.55, 0.25, 0.4]} color="#bda76c" radius={0.03} />
            </P>
          </group>
        )}
      </group>
    </DeviceContext.Provider>
  );
}
