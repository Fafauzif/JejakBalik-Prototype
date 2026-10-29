import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import WorldCanvas from './WorldCanvas';
import { deriveSnapshot, assets, events } from '../../domain';
const snap = deriveSnapshot(assets, events, [], 120, 'circular_day');
function Preview() {
  const [mode, setMode] = useState<'city' | 'hub' | 'device'>('city'),
    [sel, setSel] = useState<string | null>(null),
    [cat, setCat] = useState('phone'),
    [exploded, setExploded] = useState(false);
  return (
    <>
      <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 100 }}>
        {(['city', 'hub', 'device'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          {[...new Set(assets.map((a) => a.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => setExploded(!exploded)}>explode</button>
      </div>
      <div style={{ width: '100vw', height: '100vh' }}>
        <WorldCanvas
          mode={mode}
          snapshot={snap}
          routes={snap.routes}
          cursor={120}
          quality="standard"
          selectedId={sel}
          onSelect={(id) => setSel(id)}
          asset={assets.find((a) => a.category === cat)}
          exploded={exploded}
        />
      </div>
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
