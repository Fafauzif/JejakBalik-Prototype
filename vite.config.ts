import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Keep a small, machine-readable boundary record for the production budget check.
// A filename check alone misses accidental Three imports hoisted into shared chunks.
function rendererBoundaries(): Plugin {
  return {
    name: 'jejak-renderer-boundaries',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((chunk) => chunk.type === 'chunk')
        .map((chunk) => ({
          file: chunk.fileName,
          gpuModules: Object.entries(chunk.modules)
            .filter(
              ([id, module]) =>
                module.renderedLength > 0 &&
                /\/node_modules\/(?:three|three-stdlib|@react-three\/(?:fiber|drei))\//.test(
                  id.replaceAll('\\', '/'),
                ),
            )
            .map(([id]) => id.replaceAll('\\', '/').split('/node_modules/').at(-1)),
        }));
      this.emitFile({
        type: 'asset',
        fileName: '.vite/renderer-boundaries.json',
        source: JSON.stringify({ chunks }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), rendererBoundaries()],
  server: { host: '0.0.0.0', port: 4173, allowedHosts: ['terminal.local'] },
  build: { chunkSizeWarningLimit: 1400, manifest: true },
  test: { include: ['tests/domain/**/*.test.ts', 'src/**/*.test.ts'], environment: 'node' },
});
