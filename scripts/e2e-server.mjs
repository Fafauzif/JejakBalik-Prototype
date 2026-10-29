import os from 'node:os';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

// Some constrained executors cannot enumerate interfaces. Loopback still works.
try {
  os.networkInterfaces();
} catch {
  os.networkInterfaces = () => ({});
}
const server = await createServer({
  server: {
    host: '127.0.0.1',
    port: Number(process.env.E2E_PORT || 4397),
    strictPort: true,
    fs: { allow: [process.cwd(), realpathSync(path.resolve('node_modules'))] },
  },
});
await server.listen();
server.printUrls();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
