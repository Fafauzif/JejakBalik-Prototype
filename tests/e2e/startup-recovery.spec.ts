import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/tmp/atma-chromium') ? '/tmp/atma-chromium' : undefined);
test.use({
  launchOptions: {
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
    ],
  },
});

test('entry download failure exposes recovery before React is available', async ({ page }) => {
  await page.route('**/src/bootstrap.ts*', (route) => route.abort('failed'));
  await page.goto('/network', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#boot-message')).toHaveText('Ruang kerja belum dapat dibuka.');
  await expect(page.getByRole('button', { name: 'Muat ulang ruang kerja' })).toBeVisible();
  await page.unroute('**/src/bootstrap.ts*');
  await page.getByRole('button', { name: 'Muat ulang ruang kerja' }).click();
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
});

test('a stalled main module has a bounded static loading state', async ({ page }) => {
  await page.clock.install();
  await page.route('**/src/main.tsx*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: 'await new Promise(() => {});' }),
  );
  await page.goto('/network', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#boot-message')).toHaveText('Menyiapkan ruang kerja…');
  await page.clock.fastForward(15_100);
  await expect(page.locator('#boot-recovery')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Muat ulang ruang kerja' })).toBeEnabled();
});

test('route download failure retains navigation and provides reload recovery', async ({ page }) => {
  await page.route('**/src/features/team/TeamPage.tsx*', (route) => route.abort('failed'));
  await page.goto('/team');
  await expect(page.getByRole('heading', { name: 'Halaman belum dapat dibuka.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Muat ulang ruang kerja' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Perangkat', exact: true })
    .click();
  await expect(page.locator('.recovery-surface')).toHaveCount(0);
  await expect(page).toHaveURL(/\/assets/);
  await expect(page.locator('main h1')).toBeVisible();
});

test('a stalled route stops spinning and leaves the rest of the workspace available', async ({ page }) => {
  await page.clock.install();
  await page.route('**/src/features/team/TeamPage.tsx*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: 'await new Promise(() => {});' }),
  );
  await page.goto('/team');
  await expect(page.locator('.loading-surface')).toBeVisible();
  await page.clock.fastForward(12_100);
  await expect(page.getByRole('heading', { name: 'Halaman ini memerlukan waktu lebih lama.' })).toBeVisible();
  await expect(page.locator('.loading-surface')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
});

test('renderer download failure leaves a working animated map and other views', async ({ page }) => {
  await page.route('**/src/features/world/WorldCanvas.tsx*', (route) => route.abort('failed'));
  await page.goto('/network');
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'error');
  await expect(page.locator('svg[aria-label="Peta kota isometrik interaktif"]')).toBeVisible();
  await expect(page.locator('[data-live-vehicle-map]')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Coba 3D', exact: true })).toBeEnabled();
  await page.getByRole('tab', { name: 'Hub', exact: true }).click();
  await expect(page.locator('svg[aria-label="Denah hub interaktif"]')).toBeVisible();
  await expect(page.locator('.network-page')).toHaveAttribute('data-operation-mode', 'live');
});

test('a stalled renderer reaches its deadline without blanking the working map', async ({ page }) => {
  await page.clock.install();
  await page.route('**/src/features/world/WorldCanvas.tsx*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: 'await new Promise(() => {});' }),
  );
  await page.goto('/network');
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'loading');
  await expect(page.locator('[data-live-vehicle-map]')).toHaveCount(6);
  await page.clock.fastForward(12_100);
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'timeout');
  await expect(page.getByRole('button', { name: 'Coba 3D', exact: true })).toBeVisible();
  await expect(page.locator('svg[aria-label="Peta kota isometrik interaktif"]')).toBeVisible();
});

test('unsupported mobile graphics skips the GPU download and keeps controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGL2RenderingContext', { configurable: true, value: undefined });
  });
  let rendererRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/world/WorldCanvas.tsx')) rendererRequests++;
  });
  await page.goto('/network');
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'error');
  await expect(page.locator('[data-live-vehicle-map]')).toHaveCount(6);
  expect(rendererRequests).toBe(0);
  await page.getByRole('button', { name: 'Gunakan 2D', exact: true }).click();
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', '2d');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test.describe('actual rendered-frame and context-loss recovery', () => {
  test('a first draw replaces the map and GPU loss restores it with a fresh 3D retry', async ({ page }) => {
    await page.goto('/network');
    await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'ready');
    await expect(page.locator('.progressive-world canvas')).toBeVisible();
    await expect(page.locator('.scene-fallback')).toHaveCount(0);
    await page.locator('.progressive-world canvas').evaluate((canvas) => {
      const context = (canvas as HTMLCanvasElement).getContext('webgl2');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Expected WEBGL_lose_context test support');
      extension.loseContext();
    });
    await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'error');
    await expect(page.locator('[data-live-vehicle-map]')).toHaveCount(6);
    await page.getByRole('button', { name: 'Coba 3D', exact: true }).click();
    await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'ready');
    const previousCanvas = await page.locator('.progressive-world canvas').elementHandle();
    await page.getByRole('button', { name: 'Gunakan 2D', exact: true }).click();
    await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', '2d');
    await previousCanvas?.evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
    await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', '2d');
    await expect(page.locator('[data-live-vehicle-map]')).toHaveCount(6);
  });
});
