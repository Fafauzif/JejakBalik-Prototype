import {
  createContext,
  useContext,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { RecoveryWorldProps, Point, Journey, Receiver, RecoveryRequest } from './types';
import type { Asset } from '../domain/types';
import DeviceScene from '../graphics/DeviceScene';
import { additionalSegments } from './world-paths';

type P3 = [number, number, number];
type Block = { p: P3; s: P3; color: string; rotation?: number };
type Props = RecoveryWorldProps & {
  onReady: () => void;
  onFailure: () => void;
  resetKey: number;
  exploded: boolean;
};
const AXES = [-36, -24, -12, 0, 12, 24, 36];
const LightweightGeometry = createContext(false);
const clay = '#b57858',
  cream = '#f0e9d8',
  forest = '#426d56',
  glass = '#91b2ad',
  ink = '#2f453d';
function Brick({
  p = [0, 0, 0],
  s = [1, 1, 1],
  color = cream,
  r = 0,
  roughness = 0.8,
  ...props
}: {
  p?: P3;
  s?: P3;
  color?: string;
  r?: number;
  roughness?: number;
  [key: string]: any;
}) {
  return (
    <mesh position={p} scale={s} rotation={[0, r, 0]} castShadow receiveShadow {...props}>
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}
function Soft({
  p = [0, 0, 0],
  s = [1, 1, 1],
  color = cream,
  radius = 0.12,
  metalness = 0.05,
  ...props
}: {
  p?: P3;
  s?: P3;
  color?: string;
  radius?: number;
  metalness?: number;
  [key: string]: any;
}) {
  const lightweight = useContext(LightweightGeometry);
  return (
    <RoundedBox
      position={p}
      args={s}
      radius={Math.min(radius, Math.min(...s) * 0.4)}
      smoothness={lightweight ? 1 : 2}
      castShadow
      receiveShadow
      {...props}
    >
      <meshStandardMaterial color={color} roughness={0.55} metalness={metalness} />
    </RoundedBox>
  );
}
function Batch({
  items,
  shape = 'box',
  roughness = 0.88,
}: {
  items: Block[];
  shape?: 'box' | 'tree' | 'roof';
  roughness?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lightweight = useContext(LightweightGeometry);
  const object = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    items.forEach((b, i) => {
      object.position.set(...b.p);
      object.scale.set(...b.s);
      object.rotation.set(0, b.rotation || 0, 0);
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
      mesh.current!.setColorAt(i, new THREE.Color(b.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items, object]);
  if (!items.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {shape === 'tree' ? (
        <icosahedronGeometry args={[1, lightweight ? 0 : 1]} />
      ) : shape === 'roof' ? (
        <cylinderGeometry args={[0, 1, 1, 4]} />
      ) : (
        <boxGeometry />
      )}
      <meshStandardMaterial roughness={roughness} />
    </instancedMesh>
  );
}
function Pin({
  position,
  children,
  selected = false,
}: {
  position: P3;
  children: ReactNode;
  selected?: boolean;
}) {
  const { gl, camera, size } = useThree();
  const element = useMemo(() => document.createElement('div'), []);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const object = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    element.className = `world-pin ${selected ? 'selected' : ''}`;
    element.style.cssText = 'position:absolute;left:0;top:0;z-index:2;pointer-events:none;width:max-content;';
    element.replaceChildren();
    const append = (node: ReactNode, parent: HTMLElement) => {
      if (node === null || node === undefined || typeof node === 'boolean') return;
      if (typeof node === 'string' || typeof node === 'number') {
        parent.appendChild(document.createTextNode(String(node)));
        return;
      }
      if (Array.isArray(node)) {
        node.forEach((n) => append(n, parent));
        return;
      }
      if (isValidElement<{ children?: ReactNode }>(node)) {
        const child = document.createElement(node.type === 'small' ? 'small' : 'span');
        append(node.props.children, child);
        parent.appendChild(child);
      }
    };
    append(children, element);
  }, [element, children, selected]);
  useEffect(() => {
    gl.domElement.parentElement?.appendChild(element);
    return () => element.remove();
  }, [gl, element]);
  useFrame(() => {
    if (!object.current) return;
    object.current.updateWorldMatrix(true, false);
    anchor.setFromMatrixPosition(object.current.matrixWorld).project(camera);
    const visible = anchor.z >= -1 && anchor.z <= 1 && Math.abs(anchor.x) < 1.2 && Math.abs(anchor.y) < 1.2;
    element.style.display = visible ? 'block' : 'none';
    if (visible)
      element.style.transform = `translate3d(${(anchor.x * 0.5 + 0.5) * size.width}px,${(-anchor.y * 0.5 + 0.5) * size.height}px,0) translate(-50%,-100%)`;
  });
  return <group ref={object} position={position} />;
}
function SelectionRing({ p, r = 1.5, color = '#a95135' }: { p: P3; r?: number; color?: string }) {
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.87, r, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}
function Wheel({ p, r = 0.4 }: { p: P3; r?: number }) {
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, 0.24, 16]} />
        <meshStandardMaterial color="#344139" roughness={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[r * 0.48, r * 0.48, 0.25, 12]} />
        <meshStandardMaterial color="#b4bbaa" metalness={0.65} roughness={0.35} />
      </mesh>
    </group>
  );
}
export function Vehicle({
  kind,
  color,
  cutaway = false,
  load = 0,
}: {
  kind: Journey['vehicle'];
  color: string;
  cutaway?: boolean;
  load?: number;
}) {
  if (kind === 'bike')
    return (
      <group>
        <Wheel p={[0, 0.45, 0.95]} r={0.42} />
        <Wheel p={[0, 0.45, -0.95]} r={0.42} />
        <Soft p={[0, 0.82, 0]} s={[0.6, 0.4, 1.45]} color={color} />
        <Brick p={[0, 1.08, -0.2]} s={[0.62, 0.18, 0.8]} color={ink} />
        <Brick p={[0, 1.25, 0.8]} s={[0.12, 0.8, 0.12]} r={0.15} color="#829184" />
        <Brick p={[0, 1.68, 0.85]} s={[0.95, 0.08, 0.09]} color={ink} />
        {!cutaway ? (
          <Soft p={[0, 1.5, -0.95]} s={[1.15, 1.05, 1.15]} color={color} radius={0.07} />
        ) : (
          <group>
            <Brick p={[0, 1.05, -0.95]} s={[1.15, 0.12, 1.15]} color={color} />
            <Brick p={[-0.54, 1.4, -0.95]} s={[0.1, 0.7, 1.15]} color={color} />
            <Brick p={[0, 1.4, -1.5]} s={[1.15, 0.7, 0.1]} color={color} />
            {Array.from({ length: Math.min(4, Math.max(0, load)) }, (_, i) => (
              <Soft
                key={i}
                p={[(i % 2 ? 1 : -1) * 0.25, 1.32 + Math.floor(i / 2) * 0.35, -0.9]}
                s={[0.4, 0.34, 0.65]}
                color="#cfb993"
                radius={0.02}
              />
            ))}
          </group>
        )}
        <Brick p={[0, 1.5, -0.36]} s={[0.8, 0.12, 0.02]} color="#f5f0d9" />
        <mesh position={[0, 1.1, 1.1]}>
          <sphereGeometry args={[0.17, 12, 8]} />
          <meshStandardMaterial color="#faf0be" emissive="#ecdca0" emissiveIntensity={0.15} />
        </mesh>
      </group>
    );
  const truck = kind === 'truck',
    w = truck ? 2.5 : 2.05,
    l = truck ? 5.7 : 4.7;
  return (
    <group>
      <Soft p={[0, 0.6, 0]} s={[w, 0.35, l]} color="#48554b" radius={0.1} />
      <Soft p={[0, 1.46, 1.1]} s={[w, 1.7, 2.15]} color={color} radius={0.2} />
      <Soft p={[0, 1.03, 2.05]} s={[w, 0.8, 0.7]} color={color} radius={0.18} />
      <Brick p={[0, 1.9, 2.19]} s={[w * 0.85, 0.7, 0.035]} color={glass} roughness={0.2} />
      <Brick p={[-w / 2 - 0.015, 1.9, 1.2]} s={[0.035, 0.65, 1.3]} color={glass} roughness={0.2} />
      <Brick p={[w / 2 + 0.015, 1.9, 1.2]} s={[0.035, 0.65, 1.3]} color={glass} roughness={0.2} />
      <Brick p={[0, 0.67, 2.42]} s={[w * 0.95, 0.18, 0.15]} color="#d5d4c4" roughness={0.4} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Brick p={[side * w * 0.35, 1, 2.41]} s={[0.35, 0.18, 0.035]} color="#f2e5b2" />
          <Brick p={[side * (w / 2 + 0.17), 1.95, 1.85]} s={[0.24, 0.25, 0.18]} color="#526456" />
          <Wheel p={[(side * w) / 2, 0.65, 1.4]} r={0.52} />
          <Wheel p={[(side * w) / 2, 0.65, -1.6]} r={0.52} />
        </group>
      ))}
      <Brick p={[0, 1.05, -1.5]} s={[w, 0.12, l - 2.05]} color="#d1c3a4" />
      {!cutaway && (
        <>
          <Soft p={[0, 2.05, -1.3]} s={[w, 1.85, l - 2.2]} color={truck ? '#efeddf' : color} radius={0.13} />
          <Brick p={[0, 2, -l / 2 - 0.01]} s={[w * 0.85, 1.5, 0.05]} color="#e4dfcf" />
          <Brick p={[0, 1.92, -l / 2 - 0.04]} s={[0.035, 1.65, 0.035]} color="#9bada1" />
          <Brick p={[w / 2 + 0.01, 2, -1.1]} s={[0.025, 0.38, 1.7]} color={cream} />
        </>
      )}
      {cutaway && (
        <>
          <Brick p={[-w / 2 + 0.07, 1.5, -1.35]} s={[0.13, 0.8, l - 2.1]} color={color} />
          <Brick p={[0, 1.5, -l / 2 + 0.05]} s={[w, 0.8, 0.12]} color={color} />
          <Brick p={[0, 1.4, -0.1]} s={[w, 0.65, 0.12]} color={color} />
        </>
      )}
      {cutaway &&
        Array.from({ length: Math.min(12, Math.max(0, load)) }, (_, i) => (
          <Soft
            key={i}
            p={[
              (i % 2 ? 1 : -1) * w * 0.23,
              1.5 + Math.floor(i / 4) * 0.68,
              -0.65 - Math.floor((i % 4) / 2) * 0.85,
            ]}
            s={[w * 0.4, 0.7, 0.73]}
            radius={0.04}
            color={i % 3 === 0 ? '#7f9d8c' : '#c6ad83'}
          />
        ))}
    </group>
  );
}
function buildNeighborhoods() {
  const masonry: Block[] = [],
    roofs: Block[] = [],
    glazing: Block[] = [],
    details: Block[] = [],
    foliage: Block[] = [],
    trunks: Block[] = [],
    verges: Block[] = [];
  const add = (list: Block[], p: P3, s: P3, color: string, rotation?: number) =>
    list.push({ p, s, color, rotation });
  AXES.slice(0, -1).forEach((x, i) =>
    AXES.slice(0, -1).forEach((z, j) => {
      const cx = x + 6,
        cz = z + 6;
      add(verges, [cx, 0.08, cz], [9.6, 0.18, 9.6], (i + j) % 5 === 0 ? '#c1d0ad' : '#dedfca');
      const park = (i === 2 && j === 2) || (i === 4 && j === 1) || (i === 0 && j === 4);
      if (i === 1 && j === 2) return; // A deliberately reserved campus block.
      if (!park) {
        const tall = i >= 3 && j >= 3,
          store = (i + j) % 3 === 0;
        for (let n = 0; n < (tall ? 2 : 3); n++) {
          const bx = cx - 2.7 + n * (tall ? 4.8 : 2.7),
            bz = cz + (n % 2 ? 0.8 : -0.6),
            h = tall ? 7 + ((i + j + n) % 4) * 1.25 : store ? 3.8 : 2.1 + ((n + i) % 2) * 0.5;
          const width = tall ? 3.4 : 2.15,
            depth = store ? 5.2 : tall ? 4 : 3.3;
          add(
            masonry,
            [bx, 0.3 + h / 2, bz],
            [width, h, depth],
            ['#eee5d0', '#d6d8c5', '#d5c8af', '#b9c8bd'][(i + j + n) % 4],
          );
          add(details, [bx, 0.36, bz], [width + 0.2, 0.23, depth + 0.2], '#bcb9a0');
          if (!tall && !store)
            add(
              roofs,
              [bx, h + 0.85, bz],
              [width * 0.85, 1.3, depth * 0.7],
              ['#b77f61', '#9d7157', '#ab8267'][(i + n) % 3],
              Math.PI / 4,
            );
          else {
            add(
              details,
              [bx, h + 0.45, bz],
              [width + 0.18, 0.27, depth + 0.18],
              store ? '#58816b' : '#dce0ce',
            );
            add(details, [bx, h + 0.75, bz - 0.8], [width * 0.55, 0.45, depth * 0.35], '#9aaea3');
          }
          const rows = tall ? Math.floor(h / 1.45) : 1;
          for (let f = 0; f < rows; f++) {
            add(
              glazing,
              [bx, 0.9 + f * 1.4, bz + depth / 2 + 0.025],
              [width * 0.73, tall ? 0.5 : 0.8, 0.04],
              glass,
            );
            add(
              glazing,
              [bx + width / 2 + 0.025, 0.9 + f * 1.4, bz],
              [0.04, tall ? 0.5 : 0.8, depth * 0.65],
              '#b1c7be',
            );
          }
          if (store) {
            add(details, [bx, 1.8, bz + depth / 2 + 0.45], [width + 0.15, 0.18, 1.1], n % 2 ? clay : forest);
            add(details, [bx, 0.9, bz + depth / 2 + 0.025], [width * 0.6, 1.2, 0.05], '#698378');
          } else add(details, [bx - 0.6, 0.9, bz + depth / 2 + 0.04], [0.45, 1.2, 0.05], '#78957e');
        }
      }
      const count = park ? 7 : 2;
      for (let t = 0; t < count; t++) {
        const tx = cx - 3.6 + (t % 3) * 3.2,
          tz = park ? cz - 3 + Math.floor(t / 3) * 2.9 : cz - 3.6,
          h = 1.8 + ((i + j + t) % 3) * 0.25;
        add(trunks, [tx, h / 2, tz], [0.22, h, 0.22], '#9b8264');
        add(
          foliage,
          [tx, h + 0.65, tz],
          [1.25, 1.7, 1.2],
          ['#7c9a71', '#a8bc8b', '#5f8967'][(i + j + t) % 3],
        );
      }
      if (park) {
        add(details, [cx, 0.17, cz], [1, 0.08, 8.5], '#e5dcc0');
        add(details, [cx, 0.17, cz], [8.5, 0.08, 0.8], '#e5dcc0');
        for (const side of [-1, 1]) add(details, [cx + side * 2.2, 0.7, cz], [1.4, 0.2, 0.45], '#a08a67');
      }
    }),
  );
  return { masonry, roofs, glazing, details, foliage, trunks, verges };
}
const neighborhood = buildNeighborhoods();
function Streets() {
  const { roads, markings, crossings } = useMemo(() => {
    const roads: Block[] = [],
      markings: Block[] = [],
      crossings: Block[] = [];
    AXES.forEach((a) => {
      roads.push(
        { p: [a, 0.16, 0], s: [2.35, 0.18, 84], color: '#aeb9aa' },
        { p: [0, 0.15, a], s: [84, 0.18, 2.35], color: '#aeb9aa' },
      );
      for (let d = -40; d <= 40; d += 3) {
        if (AXES.some((v) => Math.abs(v - d) < 1.5)) continue;
        markings.push(
          { p: [a, 0.26, d], s: [0.08, 0.015, 1.05], color: '#eee9d7' },
          { p: [d, 0.26, a], s: [1.05, 0.015, 0.08], color: '#eee9d7' },
        );
      }
    });
    for (const x of [-24, 0, 24])
      for (const z of [-24, 0, 24])
        for (let i = 0; i < 4; i++)
          crossings.push({ p: [x - 1.9 + i * 0.42, 0.27, z + 1.8], s: [0.23, 0.025, 1], color: '#f4f0df' });
    return { roads, markings, crossings };
  }, []);
  return (
    <>
      <Batch items={roads} />
      <Batch items={markings} />
      <Batch items={crossings} />
    </>
  );
}
function Campus() {
  return (
    <group position={[-18, 0, -6]}>
      <Brick p={[0, 0.2, 0]} s={[9, 0.3, 9]} color="#d4dac0" />
      <Brick p={[0, 2.25, -1.2]} s={[7, 4.2, 4]} color="#f1e7d0" />
      <Brick p={[0, 4.5, -1.2]} s={[7.7, 0.35, 4.7]} color={forest} />
      <Brick p={[0, 3.5, 0.83]} s={[5.7, 0.65, 0.05]} color={glass} />
      <Brick p={[0, 1.7, 1]} s={[6.2, 2.7, 1.4]} color="#d4d7be" />
      {[-2.5, -1.25, 0, 1.25, 2.5].map((x) => (
        <Brick key={x} p={[x, 1.7, 1.8]} s={[0.18, 2.9, 0.18]} color="#f5ecd7" />
      ))}
      <Brick p={[0, 0.4, 2.2]} s={[7, 0.2, 1.5]} color="#b6bea4" />
      <Brick p={[0, 0.25, 3.4]} s={[4, 0.13, 1.4]} color="#dfd7bc" />
      <Brick p={[-3.5, 1.1, 3]} s={[0.14, 2, 0.14]} color="#8f9a87" />
      <Brick p={[-2.9, 1.7, 3]} s={[1.1, 0.6, 0.08]} color={clay} />
    </group>
  );
}
function ReceiverBuilding({
  receiver,
  selected,
  onSelect,
  locale,
}: {
  receiver: Receiver;
  selected: boolean;
  onSelect: () => void;
  locale: 'id' | 'en';
}) {
  const color = receiver.kind === 'reuse' ? forest : receiver.kind === 'specialist' ? '#a68850' : '#9a755b';
  const [hover, setHover] = useState(false);
  const site: Point =
    receiver.kind === 'reuse' ? [-43, 24] : receiver.kind === 'material' ? [43, 18] : [30, 43];
  const [x, z] = site;
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <group position={[x, 0, z]}>
        <Brick p={[0, 0.15, 0]} s={[8, 0.25, 8]} color="#cbd2b9" />
        <Soft p={[0, 1.75, -0.5]} s={[6.6, 3.4, 4.8]} color="#ece4cf" radius={0.12} />
        <Brick p={[0, 3.6, -0.5]} s={[7.2, 0.35, 5.4]} color={color} />
        <Brick p={[0, 2.8, 1.95]} s={[6.65, 0.55, 0.1]} color={color} />
        {[-1.9, 1.9].map((n) => (
          <group key={n}>
            <Brick p={[n, 1.25, 1.94]} s={[2.5, 2.3, 0.08]} color="#8fa394" />
            <Brick p={[n, 0.32, 2.8]} s={[2.8, 0.15, 1.5]} color="#e5dcc3" />
            {[-0.6, -0.2, 0.2, 0.6].map((a) => (
              <Brick key={a} p={[n, 1.2 + a, 2]} s={[2.35, 0.035, 0.02]} color="#b5c2af" />
            ))}
          </group>
        ))}
        {[-2.7, 0, 2.7].map((n) => (
          <Brick key={n} p={[n, 3.95, -0.6]} s={[1.8, 0.08, 3.1]} color="#6d8d8d" roughness={0.4} />
        ))}
        <Brick p={[-3.4, 1.9, 2.8]} s={[0.14, 3.4, 0.14]} color={color} />
        <Brick p={[3.4, 1.9, 2.8]} s={[0.14, 3.4, 0.14]} color={color} />
        <Brick p={[0, 3.3, 2.8]} s={[7.3, 0.18, 1.6]} color={color} />
        {receiver.kind === 'material' && (
          <>
            <mesh position={[2.6, 4.3, -1.8]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 1.3, 12]} />
              <meshStandardMaterial color="#93a28f" />
            </mesh>
            <Soft p={[-2.5, 0.9, 3]} s={[1, 1.3, 1]} color="#bd9870" radius={0.05} />
          </>
        )}
        {receiver.kind === 'reuse' && (
          <>
            <Brick p={[0, 1.4, 2.05]} s={[0.6, 0.75, 0.07]} color="#d7debf" />
            <Brick p={[0, 1.4, 2.11]} s={[0.38, 0.5, 0.04]} color={forest} />
          </>
        )}
        {receiver.kind === 'specialist' && (
          <>
            <Soft p={[-2, 0.8, 3]} s={[0.85, 1.2, 0.85]} color="#bd9b5f" radius={0.08} />
            <Soft p={[-0.9, 0.8, 3]} s={[0.85, 1.2, 0.85]} color="#bd9b5f" radius={0.08} />
          </>
        )}
        <Pin position={[0, 5.7, 0]} selected={selected}>
          {receiver.name}
          {(selected || hover) && (
            <small>
              {locale === 'id' ? 'Pilih untuk melihat penerimaan' : 'Select to inspect receiving'}
            </small>
          )}
        </Pin>
      </group>
      <Line
        points={[
          [receiver.position[0], 0.29, receiver.position[1]],
          [x, 0.29, z],
        ]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      {selected && <SelectionRing p={[x, 0.29, z]} r={5.4} />}
      <mesh position={[receiver.position[0], 0.4, receiver.position[1]]}>
        <cylinderGeometry args={[0.55, 0.7, 0.25, 20]} />
        <meshStandardMaterial color={receiver.available ? color : '#a49c89'} />
      </mesh>
    </group>
  );
}
function localPath(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    const prev = result.at(-1);
    if (prev && prev[0] !== p[0] && prev[1] !== p[1]) result.push([p[0], prev[1]]);
    result.push(p);
  }
  return result;
}
function poseAt(path: Point[], progress: number) {
  if (!path.length) return { p: [0, 0] as Point, heading: 0 };
  const lengths = path.slice(1).map((b, i) => Math.abs(b[0] - path[i][0]) + Math.abs(b[1] - path[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let d = Math.min(1, Math.max(0, progress)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const a = path[i],
        b = path[i + 1],
        t = lengths[i] ? Math.min(1, d / lengths[i]) : 0;
      return {
        p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as Point,
        heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
      };
    }
    d -= lengths[i];
  }
  return { p: path[0], heading: 0 };
}
function MovingVehicle({
  journey,
  color,
  path,
  finish,
  time,
  selected,
  onSelect,
  reducedMotion,
}: {
  journey: Journey;
  color: string;
  path: Point[];
  finish: number;
  time: number;
  selected: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const { invalidate } = useThree();
  const pose = poseAt(path, (time - journey.startMinute) / Math.max(1, finish - journey.startMinute));
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = new THREE.Vector3(pose.p[0], 0.32, pose.p[1]);
    if (reducedMotion) ref.current.position.copy(target);
    else ref.current.position.lerp(target, 1 - Math.exp(-Math.min(delta, 0.1) * 9));
    let difference = pose.heading - ref.current.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    ref.current.rotation.y += difference * (reducedMotion ? 1 : 1 - Math.exp(-delta * 10));
    if (
      !reducedMotion &&
      (ref.current.position.distanceToSquared(target) > 0.0001 || Math.abs(difference) > 0.001)
    )
      invalidate();
  });
  if (!journey.available) return null;
  return (
    <group
      ref={ref}
      position={[journey.origin[0], 0.32, journey.origin[1]]}
      rotation={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <Vehicle kind={journey.vehicle} color={color} />
      {selected && <SelectionRing p={[0, -0.02, 0]} r={3.5} />}
      {(selected || hover) && (
        <Pin position={[0, 4.7, 0]} selected={selected}>
          {journey.name}
        </Pin>
      )}
    </group>
  );
}
function City(props: Props) {
  const { scenario, plan, selected, onSelect, locale, time, reducedMotion } = props;
  const selectedJourney =
    selected?.kind === 'journey'
      ? selected.id
      : selected?.kind === 'request'
        ? plan.assignments.find((a) => a.requestId === selected.id)?.journeyId
        : undefined;
  return (
    <>
      <Soft p={[0, -0.5, 0]} s={[104, 1.5, 104]} color="#d8d4bf" radius={1} />
      <Soft p={[0, 0.02, 0]} s={[102, 0.28, 102]} color="#d8dfc9" radius={0.8} />
      <Batch items={neighborhood.verges} />
      <Streets />
      <Batch items={neighborhood.masonry} />
      <Batch items={neighborhood.roofs} shape="roof" />
      <Batch items={neighborhood.glazing} roughness={0.25} />
      <Batch items={neighborhood.details} />
      <Batch items={neighborhood.trunks} />
      <Batch items={neighborhood.foliage} shape="tree" />
      <Campus />
      {scenario.journeys.map((j) => {
        const route = plan.routes.find((r) => r.journeyId === j.id),
          color = scenario.providers.find((pr) => pr.id === j.providerId)?.color || forest,
          original = route?.originalPath || localPath([j.origin, ...j.stops, j.destination]),
          active = !selectedJourney || selectedJourney === j.id,
          opacity = j.available ? (active ? 0.7 : 0.08) : 0.035;
        return (
          <group key={j.id}>
            <Line
              points={original.map((p) => [p[0], 0.33, p[1]] as P3)}
              color={color}
              dashed
              dashSize={0.7}
              gapSize={0.5}
              lineWidth={active ? 1.6 : 1}
              transparent
              opacity={opacity}
            />
            {route && route.path.length > 1 && (
              <Line
                points={route.path.map((p) => [p[0], 0.39, p[1]] as P3)}
                color={color}
                lineWidth={selectedJourney === j.id ? 3.5 : 1.8}
                transparent
                opacity={active ? 0.9 : 0.08}
              />
            )}
            {route &&
              selectedJourney === j.id &&
              additionalSegments(original, route.path).map((segment, index) => (
                <Line
                  key={`additional-${index}`}
                  points={segment.map((p) => [p[0], 0.44, p[1]] as P3)}
                  color="#b46f43"
                  lineWidth={4.5}
                  transparent
                  opacity={0.95}
                />
              ))}
            <MovingVehicle
              journey={j}
              path={route?.path || original}
              finish={route?.finishMinute || j.endMinute}
              time={time}
              selected={selectedJourney === j.id}
              onSelect={() => onSelect({ kind: 'journey', id: j.id })}
              color={color}
              reducedMotion={reducedMotion}
            />
          </group>
        );
      })}
      {scenario.receivers.map((r) => (
        <ReceiverBuilding
          key={r.id}
          receiver={r}
          selected={selected?.kind === 'receiver' && selected.id === r.id}
          onSelect={() => onSelect({ kind: 'receiver', id: r.id })}
          locale={locale}
        />
      ))}
      {scenario.requests.map((request, i) => {
        const active = selected?.kind === 'request' && selected.id === request.id,
          assigned = plan.assignments.some((a) => a.requestId === request.id),
          color = active
            ? '#a95135'
            : request.phase === 'completed'
              ? '#7b966b'
              : assigned
                ? forest
                : '#b78a56';
        return (
          <group
            key={request.id}
            position={[request.position[0], 0, request.position[1]]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ kind: 'request', id: request.id });
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            <mesh position={[0, active ? 2.3 : 1.75, 0]} castShadow>
              <sphereGeometry args={[active ? 0.75 : 0.55, 16, 12]} />
              <meshStandardMaterial color={color} roughness={0.55} />
            </mesh>
            <Brick p={[0, 0.95, 0]} s={[0.12, 1.7, 0.12]} color={color} />
            <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[active ? 1 : 0.7, 24]} />
              <meshBasicMaterial color="#fffefa" />
            </mesh>
            {active && (
              <>
                <SelectionRing p={[0, 0.29, 0]} r={1.4} />
                <Pin position={[0, 3, 0]} selected>
                  {request.id}
                  <small>{request.label}</small>
                </Pin>
              </>
            )}
          </group>
        );
      })}
    </>
  );
}
function StudioFloor() {
  return (
    <>
      <Soft p={[0, -0.4, 0]} s={[34, 0.8, 26]} color="#dedcca" radius={0.7} />
      <Brick p={[0, 0.02, 0]} s={[32, 0.1, 24]} color="#e8e5d6" />
    </>
  );
}
function VehicleStudio({
  journey,
  color,
  load,
  locale,
}: {
  journey: Journey;
  color: string;
  load: number;
  locale: 'id' | 'en';
}) {
  return (
    <>
      <StudioFloor />
      <group scale={2.5} rotation={[0, 0.3, 0]}>
        <Vehicle kind={journey.vehicle} color={color} cutaway load={load} />
      </group>
      <SelectionRing p={[0, 0.12, 0]} r={9} color="#9fb393" />
      <Pin position={[0, 10, 0]}>
        {journey.name}
        <small>
          {locale === 'id'
            ? `Manifest rencana: ${load} perangkat. Peti bersifat skematis.`
            : `Planned manifest: ${load} devices. Crates are schematic.`}
        </small>
      </Pin>
    </>
  );
}
function HubStudio({
  receiver,
  requests,
  locale,
  onSelect,
}: {
  receiver: Receiver;
  requests: RecoveryRequest[];
  locale: 'id' | 'en';
  onSelect: Props['onSelect'];
}) {
  const color = receiver.kind === 'reuse' ? forest : receiver.kind === 'specialist' ? '#a68850' : '#9a755b';
  const zones = [
    [-10, -6],
    [-3, -6],
    [4, -6],
    [10, -6],
    [-8, 5],
    [0, 5],
    [8, 5],
  ];
  return (
    <>
      <StudioFloor />
      <Brick p={[0, 2.4, -11]} s={[31, 4.8, 0.4]} color="#ccd5c1" />
      <Brick p={[15.5, 2.4, 0]} s={[0.4, 4.8, 22]} color="#bbcbb8" />
      <Brick p={[0, 4, -10.7]} s={[31, 0.65, 0.1]} color={color} />
      <Brick p={[0, 0.15, 0]} s={[29, 0.08, 2.5]} color="#cdd2bb" />
      <Brick p={[0, 0.8, 0]} s={[28, 0.23, 1.6]} color="#7b9380" />
      <Brick p={[0, 0.98, -0.85]} s={[28, 0.18, 0.12]} color="#b5bba5" />
      <Brick p={[0, 0.98, 0.85]} s={[28, 0.18, 0.12]} color="#b5bba5" />
      {Array.from({ length: 40 }, (_, i) => (
        <Brick key={i} p={[-13.5 + i * 0.7, 0.98, 0]} s={[0.12, 0.09, 1.5]} color="#aab6a3" />
      ))}
      {zones.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Brick p={[0, 1.2, 0]} s={[4, 0.22, 2.5]} color="#b9aa88" />
          {[-1.65, 1.65].map((a) => (
            <Brick key={a} p={[a, 0.6, 0]} s={[0.16, 1.2, 2]} color="#75907a" />
          ))}
          {i < 4 ? (
            <>
              <Brick p={[0, 2.1, -0.8]} s={[1.7, 1.1, 0.15]} color={ink} />
              <Brick p={[0, 2.1, -0.7]} s={[1.5, 0.9, 0.04]} color={glass} />
              <Brick p={[0, 1.36, 0.3]} s={[1.6, 0.1, 0.5]} color="#7c9280" />
            </>
          ) : (
            <>
              <Brick p={[0, 2.2, -0.7]} s={[4, 0.12, 0.9]} color="#b7b99f" />
              <Brick p={[-1.8, 2, -0.7]} s={[0.1, 2, 0.1]} color="#75907a" />
              <Brick p={[1.8, 2, -0.7]} s={[0.1, 2, 0.1]} color="#75907a" />
            </>
          )}
        </group>
      ))}
      {requests.slice(0, 12).map((request, i) => (
        <group
          key={request.id}
          position={[-11 + (i % 6) * 4.3, 1.3, i < 6 ? -4.3 : 4.3]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect({ kind: 'request', id: request.id });
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <Soft
            p={[0, 0, 0]}
            s={[1.5, 0.25, 1.2]}
            color={request.dataBearing && !request.dataCleared ? '#b58b4f' : '#698f7d'}
            radius={0.07}
          />
          {request.category === 'laptop' && <Brick p={[0, 0.5, -0.5]} s={[1.45, 1, 0.07]} color={ink} />}
        </group>
      ))}
      {[-9, 0, 9].map((x, i) => (
        <group key={i} position={[x, 0, i % 2 ? -2.7 : 2.7]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.3, 12, 10]} />
            <meshStandardMaterial color="#c1a582" />
          </mesh>
          <Soft p={[0, 1.15, 0]} s={[0.6, 0.8, 0.4]} color={i % 2 ? clay : forest} radius={0.1} />
          <Brick p={[-0.17, 0.45, 0]} s={[0.2, 0.7, 0.25]} color="#647364" />
          <Brick p={[0.17, 0.45, 0]} s={[0.2, 0.7, 0.25]} color="#647364" />
        </group>
      ))}
      <Pin position={[0, 6, -10]}>
        {receiver.name}
        <small>
          {locale === 'id'
            ? 'Penerimaan, pemeriksaan, dan penyaluran'
            : 'Receiving, inspection, and onward handling'}
        </small>
      </Pin>
      {[
        [-10, -6, locale === 'id' ? 'Penerimaan' : 'Receiving'],
        [-3, -6, locale === 'id' ? 'Pemeriksaan' : 'Inspection'],
        [4, -6, locale === 'id' ? 'Tinjauan data' : 'Data review'],
        [10, -6, locale === 'id' ? 'Penyaluran' : 'Outbound'],
      ].map(([x, z, label], i) => (
        <Pin key={i} position={[Number(x), 4, Number(z)]}>
          {label}
        </Pin>
      ))}
    </>
  );
}
function DeviceStudio({
  request,
  locale,
  reducedMotion,
  exploded,
}: {
  request: RecoveryRequest;
  locale: 'id' | 'en';
  reducedMotion: boolean;
  exploded: boolean;
}) {
  const [component, setComponent] = useState<string | null>(null);
  useEffect(() => {
    setComponent(null);
  }, [request.id]);
  const asset: Asset = {
    id: request.id,
    requestId: request.id,
    householdId: request.id,
    category: request.category,
    catalogVariant: 0,
    massKg: request.massKg,
    baseRecoveredValueIdr: 0,
    components: [],
    plannedDisposition:
      request.intent === 'recycle' ? 'material' : request.intent === 'repair' ? 'repair' : 'reuse',
    dataBearing: request.dataBearing,
    batteryRisk: request.handling === 'specialist' ? 'specialist' : 'none',
    handlingClass: request.handling,
    condition: 'illustrative',
    destinationId: request.receiverId,
    initialStatus: 'requested',
    scenarioRecordId: 'recovery-v3',
    routeId: '',
    collectionStorySecond: 0,
    receivedStorySecond: 0,
  };
  return (
    <>
      <group scale={2.1}>
        <DeviceScene
          asset={asset}
          exploded={exploded}
          selectedComponent={component}
          onComponentSelect={setComponent}
          reducedMotion={reducedMotion}
          language={locale}
        />
      </group>
    </>
  );
}
function Camera({
  view,
  selected,
  scenario,
  plan,
  resetKey,
  reducedMotion,
}: {
  view: Props['view'];
  selected: Props['selected'];
  scenario: Props['scenario'];
  plan: Props['plan'];
  resetKey: number;
  reducedMotion: boolean;
}) {
  const controls = useRef<any>(null);
  const { camera, size, invalidate } = useThree();
  const target = useRef(new THREE.Vector3()),
    position = useRef(new THREE.Vector3(90, 95, 110)),
    zoom = useRef(5),
    moving = useRef(true);
  useEffect(() => {
    let center: P3 = [0, 0, 0],
      span = 130;
    if (view === 'vehicle') {
      center = [0, 2, 0];
      span = 39;
    } else if (view === 'hub') {
      center = [0, 1, 0];
      span = 43;
    } else if (view === 'device') {
      center = [0, 4, 0];
      span = 26;
    } else if (selected) {
      const request = scenario.requests.find((r) => selected.kind === 'request' && r.id === selected.id),
        receiver = scenario.receivers.find((r) => selected.kind === 'receiver' && r.id === selected.id),
        journey = scenario.journeys.find((j) => selected.kind === 'journey' && j.id === selected.id);
      if (request) {
        center = [request.position[0], 0, request.position[1]];
        span = 50;
      } else if (receiver) {
        const site: Point =
          receiver.kind === 'reuse' ? [-43, 24] : receiver.kind === 'material' ? [43, 18] : [30, 43];
        center = [site[0], 0, site[1]];
        span = 48;
      } else if (journey) {
        const r = plan.routes.find((r) => r.journeyId === journey.id),
          points = r?.path || [journey.origin, ...journey.stops, journey.destination];
        const minX = Math.min(...points.map((p) => p[0])),
          maxX = Math.max(...points.map((p) => p[0])),
          minZ = Math.min(...points.map((p) => p[1])),
          maxZ = Math.max(...points.map((p) => p[1]));
        center = [(minX + maxX) / 2, 0, (minZ + maxZ) / 2];
        span = Math.max(45, maxX - minX + (maxZ - minZ)) * 0.95;
      }
    }
    target.current.set(...center);
    position.current.set(center[0] + 90, center[1] + 95, center[2] + 110);
    zoom.current = Math.min(size.width / (span * 1.15), size.height / (span * 0.8));
    moving.current = true;
    if (reducedMotion) {
      camera.position.copy(position.current);
      camera.zoom = zoom.current;
      camera.updateProjectionMatrix();
      controls.current?.target.copy(target.current);
      controls.current?.update();
      moving.current = false;
    }
    invalidate();
  }, [view, selected?.id, resetKey, size.width, size.height, reducedMotion]);
  useFrame((_, delta) => {
    if (!controls.current || !moving.current) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 6);
    camera.position.lerp(position.current, k);
    controls.current.target.lerp(target.current, k);
    camera.zoom += (zoom.current - camera.zoom) * k;
    camera.updateProjectionMatrix();
    controls.current.update();
    if (
      camera.position.distanceToSquared(position.current) < 0.01 &&
      Math.abs(camera.zoom - zoom.current) < 0.002
    )
      moving.current = false;
    else invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minZoom={2}
      maxZoom={35}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.2}
      onStart={() => {
        moving.current = false;
      }}
      enablePan
      zoomSpeed={0.65}
      rotateSpeed={0.5}
    />
  );
}
function Health({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) {
  const { gl, invalidate } = useThree();
  const ready = useRef(false),
    frames = useRef(0),
    pendingSample = useRef<number | null>(null);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    invalidate();
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      if (pendingSample.current !== null) cancelAnimationFrame(pendingSample.current);
    };
  }, [gl, onFailure, invalidate]);
  useFrame(() => {
    frames.current++;
    if (!ready.current && frames.current > 1 && gl.info.render.calls > 0) {
      ready.current = true;
      onReady();
    } else if (!ready.current) invalidate();
    if (pendingSample.current === null)
      pendingSample.current = requestAnimationFrame(() => {
        pendingSample.current = null;
        (window as any).__JEJAK_V3_GPU = {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          dpr: gl.getPixelRatio(),
          shadows: gl.shadowMap.enabled,
        };
      });
  });
  return null;
}
function FrameBudget({ enabled, onConstrained }: { enabled: boolean; onConstrained: () => void }) {
  const sample = useRef({ duration: 0, frames: 0, done: false });
  useEffect(() => {
    sample.current = { duration: 0, frames: 0, done: false };
  }, [enabled]);
  useFrame((_, delta) => {
    const s = sample.current;
    if (!enabled || s.done || delta > 1) return;
    s.duration += delta;
    s.frames++;
    if (s.duration >= 4 && s.frames >= 24) {
      s.done = true;
      if (s.frames / s.duration < 24) onConstrained();
    }
  });
  return null;
}
export default function RecoveryScene(props: Props) {
  const { scenario, selected, plan, view, locale, reducedMotion } = props;
  const quality = props.quality || 'auto';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700);
  const [constrained, setConstrained] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width:700px)');
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => setConstrained(false), [quality]);
  const lightweight = quality === 'low' || (quality === 'auto' && (narrow || constrained));
  const shadows = quality === 'high' || (quality === 'auto' && !lightweight);
  const pixelRatio =
    quality === 'high'
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : quality === 'auto' && constrained
        ? 0.85
        : 1;
  const request =
    scenario.requests.find((r) => selected?.kind === 'request' && r.id === selected.id) ||
    scenario.requests[0];
  const assigned = plan.assignments.find((a) => a.requestId === request?.id);
  const journey =
    scenario.journeys.find((j) =>
      selected?.kind === 'journey' ? j.id === selected.id : j.id === assigned?.journeyId,
    ) || scenario.journeys[0];
  const receiver =
    scenario.receivers.find((r) =>
      selected?.kind === 'receiver' ? r.id === selected.id : r.id === request?.receiverId,
    ) || scenario.receivers[0];
  const color = scenario.providers.find((p) => p.id === journey?.providerId)?.color || forest;
  return (
    <Canvas
      orthographic
      shadows={shadows}
      dpr={pixelRatio}
      camera={{ position: [90, 95, 110], zoom: 5, near: 0.1, far: 600 }}
      gl={{
        antialias: quality !== 'low',
        alpha: false,
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
      }}
      frameloop={!reducedMotion && props.playing ? 'always' : 'demand'}
      onCreated={({ gl }) => {
        gl.setClearColor('#e9ede2');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <LightweightGeometry.Provider value={lightweight}>
        <color attach="background" args={['#e9ede2']} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#fff8e8', '#9db69b', 1.5]} />
        <directionalLight position={[40, 25, -50]} intensity={0.6} color="#c7e1e0" />
        <directionalLight
          castShadow={shadows}
          position={[-40, 75, 30]}
          intensity={2.5}
          color="#fff0d3"
          shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]}
          shadow-camera-left={-65}
          shadow-camera-right={65}
          shadow-camera-top={65}
          shadow-camera-bottom={-65}
          shadow-camera-far={200}
          shadow-bias={-0.0004}
          shadow-normalBias={0.05}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]} receiveShadow>
          <planeGeometry args={[800, 800]} />
          <meshStandardMaterial color="#e9ede2" roughness={1} />
        </mesh>
        {view === 'city' ? (
          <City {...props} />
        ) : view === 'vehicle' && journey ? (
          <VehicleStudio
            journey={journey}
            color={color}
            load={plan.routes.find((r) => r.journeyId === journey.id)?.requestIds.length || 0}
            locale={locale}
          />
        ) : view === 'hub' && receiver ? (
          <HubStudio
            receiver={receiver}
            requests={scenario.requests.filter(
              (r) => r.receiverId === receiver.id && (r.phase === 'received' || r.phase === 'completed'),
            )}
            onSelect={props.onSelect}
            locale={locale}
          />
        ) : request ? (
          <DeviceStudio
            request={request}
            locale={locale}
            reducedMotion={reducedMotion}
            exploded={props.exploded}
          />
        ) : null}
        <Camera
          view={view}
          selected={selected}
          scenario={scenario}
          plan={plan}
          resetKey={props.resetKey}
          reducedMotion={reducedMotion}
        />
        <Health onReady={props.onReady} onFailure={props.onFailure} />
        <FrameBudget
          enabled={quality === 'auto' && !lightweight}
          onConstrained={() => setConstrained(true)}
        />
      </LightweightGeometry.Provider>
    </Canvas>
  );
}
