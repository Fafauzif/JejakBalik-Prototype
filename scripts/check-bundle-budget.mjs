import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

// Run against an actual production build. These are compressed transfer budgets,
// not frame-rate, network-time, or hardware-performance claims.
const limits = {
  bootstrapJavaScriptGzip: 12_000,
  appJavaScriptGzip: 175_000,
  networkJavaScriptGzip: 210_000,
  deferredRendererJavaScriptGzip: 330_000,
};
const args = process.argv.slice(2);
let buildDirectory = 'dist';
let output;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--dir' && args[index + 1]) buildDirectory = args[++index];
  else if (args[index] === '--json' && args[index + 1]) output = args[++index];
  else throw new Error(`Unknown or incomplete argument: ${args[index]}`);
}
const root = resolve(buildDirectory);
const manifest = JSON.parse(await readFile(resolve(root, '.vite/manifest.json'), 'utf8'));
const boundaries = JSON.parse(await readFile(resolve(root, '.vite/renderer-boundaries.json'), 'utf8'));
const entries = Object.keys(manifest).filter((key) => manifest[key].isEntry);
if (entries.length !== 1) throw new Error(`Expected one HTML entry; found ${entries.length}`);
const main = Object.keys(manifest).find((key) => key === 'src/main.tsx');
const network = Object.keys(manifest).find((key) => key.endsWith('/network/NetworkPage.tsx'));
const renderer = Object.keys(manifest).find((key) => key.endsWith('/world/WorldCanvas.tsx'));
if (!main || !network || !renderer)
  throw new Error('Expected independently loaded app, Network, and WebGL renderer entries.');

function dependencyFiles(keys) {
  const files = new Set();
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const record = manifest[key];
    if (!record) throw new Error(`Manifest dependency missing: ${key}`);
    files.add(record.file);
    for (const imported of record.imports || []) visit(imported);
  }
  keys.forEach(visit);
  return [...files].filter((file) => file.endsWith('.js')).sort();
}
const sizeCache = new Map();
async function summarize(files) {
  const sizes = await Promise.all(
    files.map(async (file) => {
      if (!sizeCache.has(file)) {
        const bytes = await readFile(resolve(root, file));
        sizeCache.set(file, { file, raw: bytes.byteLength, gzip: gzipSync(bytes).byteLength });
      }
      return sizeCache.get(file);
    }),
  );
  return {
    raw: sizes.reduce((total, item) => total + item.raw, 0),
    gzip: sizes.reduce((total, item) => total + item.gzip, 0),
    files: sizes,
  };
}
const startupFiles = dependencyFiles([...entries, main]);
const networkFiles = dependencyFiles([...entries, main, network]);
const bootstrap = await summarize(dependencyFiles(entries));
const app = await summarize(startupFiles);
const firstNetwork = await summarize(networkFiles);
const deferredRenderer = await summarize([manifest[renderer].file]);
const gpuBoundaryLeaks = boundaries.chunks.filter(
  (chunk) => networkFiles.includes(chunk.file) && chunk.gpuModules.length > 0,
);
const checks = [
  ['bootstrapJavaScriptGzip', bootstrap.gzip],
  ['appJavaScriptGzip', app.gzip],
  ['networkJavaScriptGzip', firstNetwork.gzip],
  ['deferredRendererJavaScriptGzip', deferredRenderer.gzip],
].map(([name, measured]) => ({ name, measured, limit: limits[name], passed: measured <= limits[name] }));
checks.push({
  name: 'gpuRemainsDeferred',
  measured: gpuBoundaryLeaks.length,
  limit: 0,
  passed: gpuBoundaryLeaks.length === 0,
});
const result = {
  schemaVersion: 1,
  method:
    'Node gzipSync default compression; sum of unique static import files; dynamic WebGL excluded from first Network.',
  buildDirectory: relative(process.cwd(), root) || '.',
  passed: checks.every((check) => check.passed),
  checks,
  bootstrap,
  app,
  firstNetwork,
  deferredRenderer,
  gpuBoundaryLeaks,
};
if (output) await writeFile(resolve(output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
