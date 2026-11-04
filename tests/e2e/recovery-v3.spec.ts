import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

const storageKey = 'jejak-balik.recovery.v3';
async function scenario(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').scenario, storageKey);
}
async function settled(page: Page) {
  await expect(page.locator('.recovery-plan-strip')).toHaveAttribute('aria-busy', 'false', {
    timeout: 40000,
  });
  await expect(page.getByRole('button', { name: 'Tinjau rencana', exact: true })).toBeEnabled();
}
async function approve(page: Page) {
  await settled(page);
  await page.getByRole('button', { name: 'Tinjau rencana', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tinjau rencana pengumpulan' })).toBeVisible();
  await page.getByRole('button', { name: 'Setujui rencana ini', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tinjau rencana pengumpulan' })).toBeHidden();
  await settled(page);
}
async function open(page: Page, path = '/network', webgl = false) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (path === '/network') {
    await settled(page);
    if (!webgl) {
      await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Gunakan peta 2D', exact: true }).check();
      await page.keyboard.press('Escape');
    }
  }
}

test('request form preserves unapproved intent, validates input, and supports keyboard cancellation', async ({
  page,
}) => {
  await open(page);
  const before = await scenario(page);
  await page.getByRole('button', { name: 'Tambah perangkat', exact: true }).click();
  await page.getByRole('button', { name: 'Tambahkan permintaan', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('3 sampai 70');
  await expect(page.getByLabel('Nama perangkat')).toBeFocused();
  await page.getByLabel('Nama perangkat').fill('Laptop QA tanpa persetujuan');
  await page.getByRole('button', { name: 'Tambahkan permintaan', exact: true }).click();
  await expect.poll(async () => (await scenario(page)).requests.length).toBe(before.requests.length + 1);
  const added = (await scenario(page)).requests.at(-1);
  expect(added.consent).toBe(false);
  expect(added.phase).toBe('requested');
  await settled(page);
  expect((await scenario(page)).approvedPlan).toBeNull();
  await page.getByRole('button', { name: 'Tambah perangkat', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Tambahkan perangkat untuk kembali' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Tambah perangkat', exact: true })).toBeFocused();
});

test('option preview and explicit approval are separate; cancellation invalidates approval', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: /Laptop kerja lama.*Ruko Selatan/ }).click();
  await expect(page.locator('.recovery-options')).toHaveAttribute('aria-busy', 'false', { timeout: 40000 });
  await page.locator('.recovery-options button:enabled').first().click();
  await settled(page);
  expect((await scenario(page)).approvedPlan).toBeNull();
  await page.getByRole('button', { name: 'Tinjau rencana', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Kembali', exact: true }).click();
  expect((await scenario(page)).approvedPlan).toBeNull();
  await approve(page);
  const approved = await scenario(page);
  expect(approved.approvedPlan.assignments.length).toBeGreaterThan(0);
  expect(approved.events.every((event: any) => event.kind === 'approved')).toBe(true);
  const assignedJourney = approved.journeys.find(
    (j: any) => j.id === approved.approvedPlan.assignments[0].journeyId,
  );
  await page.getByRole('switch', { name: `Ketersediaan ${assignedJourney.name}`, exact: true }).click();
  await settled(page);
  const changed = await scenario(page);
  expect(changed.revision).toBeGreaterThan(approved.revision);
  await expect(page.getByRole('button', { name: 'Lanjutkan layanan', exact: true })).toBeDisabled();
  await approve(page);
  const replanned = await scenario(page);
  expect(replanned.approvedPlan.assignments.some((a: any) => a.journeyId === assignedJourney.id)).toBe(false);
});

test('chronological custody preserves physical holds and requires data review before completion', async ({
  page,
}) => {
  test.setTimeout(240000);
  await open(page);
  await approve(page);
  await page.getByRole('button', { name: 'Lanjutkan layanan', exact: true }).click();
  await settled(page);
  let s = await scenario(page);
  const collected = s.requests.find((r: any) => r.phase === 'collected');
  expect(collected).toBeTruthy();
  const journeyId = s.approvedPlan.assignments.find((a: any) => a.requestId === collected.id).journeyId;
  const journey = s.journeys.find((j: any) => j.id === journeyId);
  const collectedEvent = s.events.find((e: any) => e.requestId === collected.id && e.kind === 'collected');
  await page.getByRole('switch', { name: `Ketersediaan ${journey.name}`, exact: true }).click();
  await settled(page);
  await page.getByRole('link', { name: 'Keputusan', exact: true }).click();
  await expect(
    page.getByText('Serah terima menunggu penyelesaian logistik.', { exact: true }).first(),
  ).toBeVisible();
  s = await scenario(page);
  expect(s.requests.find((r: any) => r.id === collected.id).phase).toBe('collected');
  expect(s.events.find((e: any) => e.requestId === collected.id && e.kind === 'collected')).toEqual(
    collectedEvent,
  );
  await page.getByRole('link', { name: 'Jaringan', exact: true }).click();
  await page.getByRole('switch', { name: `Ketersediaan ${journey.name}`, exact: true }).click();
  await approve(page);
  for (let n = 0; n < 40; n++) {
    s = await scenario(page);
    if (!s.requests.some((r: any) => r.phase === 'assigned' || r.phase === 'collected')) break;
    await page.getByRole('button', { name: 'Lanjutkan layanan', exact: true }).click();
    await settled(page);
  }
  s = await scenario(page);
  const held = s.requests.filter((r: any) => r.dataBearing && !r.dataCleared && r.phase === 'received');
  expect(held.length).toBeGreaterThan(0);
  expect(s.requests.some((r: any) => r.dataBearing && !r.dataCleared && r.phase === 'completed')).toBe(false);
  expect(s.events.map((e: any) => e.atMinute)).toEqual(
    s.events.map((e: any) => e.atMinute).sort((a: number, b: number) => a - b),
  );
  await page.getByRole('link', { name: 'Keputusan', exact: true }).click();
  await expect(
    page.getByText('Tinjauan data menahan penanganan akhir.', { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tinjau perangkat', exact: true }).first().click();
  await page
    .getByRole('checkbox', { name: 'Pelepasan data ditinjau pada fasilitas penerima', exact: true })
    .check();
  await page.getByRole('button', { name: 'Catat hasil tinjauan', exact: true }).click();
  await page.getByRole('link', { name: 'Jaringan', exact: true }).click();
  await approve(page);
  await page.getByRole('button', { name: 'Lanjutkan layanan', exact: true }).click();
  await settled(page);
  expect(
    (await scenario(page)).requests.some(
      (r: any) => r.dataBearing && r.dataCleared && r.phase === 'completed',
    ),
  ).toBe(true);
});

test('JSON and CSV retain provenance; invalid import preserves state and reload clears executable approvals', async ({
  page,
}) => {
  await open(page);
  await approve(page);
  await page.getByRole('link', { name: 'Hasil', exact: true }).click();
  const jsonEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  const download = await jsonEvent;
  const raw = await fs.readFile((await download.path())!, 'utf8');
  const exported = JSON.parse(raw);
  expect(exported.format).toBe('jejak-balik-recovery-v3');
  expect(exported.provenance).toContain('not field results');
  expect(exported.scenario.requests.length).toBeGreaterThan(0);
  const csvEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const csv = await fs.readFile((await (await csvEvent).path())!, 'utf8');
  expect(csv).toContain('request_id');
  expect(csv.split('\n').filter(Boolean).length).toBe(exported.scenario.requests.length + 1);
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"bad":true}'),
  });
  await expect(page.getByRole('alert')).toContainText('Berkas tidak valid');
  expect((await scenario(page)).requests.length).toBe(exported.scenario.requests.length);
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'scenario.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('link', { name: 'Jaringan', exact: true }).click();
  await settled(page);
  const restored = await scenario(page);
  expect(restored.approvedPlan).toBeNull();
  expect(restored.requests.every((r: any) => r.phase === 'requested')).toBe(true);
  await expect(page.getByRole('button', { name: 'Lanjutkan layanan', exact: true })).toBeDisabled();
});

test('desktop WebGL and all exploration views render without application errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, '/network', true);
  await expect(page.locator('[data-renderer]')).toHaveAttribute('data-renderer', 'webgl', { timeout: 40000 });
  await page.screenshot({ path: testInfo.outputPath('desktop-city.png'), fullPage: true });
  await page.locator('.recovery-journey-select').filter({ hasText: 'Putaran pasar' }).click();
  await page.getByRole('button', { name: 'Kendaraan', exact: true }).click();
  await expect(page.locator('[data-renderer]')).toHaveAttribute('data-renderer', 'webgl');
  await page.screenshot({ path: testInfo.outputPath('desktop-vehicle.png'), fullPage: true });
  await page.getByRole('button', { name: 'Fasilitas', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-hub.png'), fullPage: true });
  await page.getByRole('button', { name: 'Perangkat', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-device.png'), fullPage: true });
  await page.getByRole('button', { name: 'Kota', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-renderer]')).toHaveAttribute('data-renderer', 'webgl');
  await page.screenshot({ path: testInfo.outputPath('mobile-city-webgl.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('link', { name: 'Keputusan', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-decisions.png'), fullPage: true });
  await page.getByRole('link', { name: 'Hasil', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-results.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile, keyboard, locale, aliases, and forced renderer fallback remain usable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.getByRole('button', { name: 'Peta', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Peta jaringan interaktif' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-map.png'), fullPage: true });
  for (const label of ['Permintaan', 'Keputusan', 'Hasil', 'Jaringan']) {
    await page.getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Add device', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add device', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Add device', exact: true })).toBeFocused();
  for (const path of ['/twin', '/team', '/assets', '/household', '/impact']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('initial network and request dialog pass WCAG A/AA automated checks', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Peta', exact: true }).click();
  let audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  await page.getByRole('button', { name: 'Tambah perangkat', exact: true }).click();
  audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
});

test('WebGL initialization failure retains an interactive network and planning controls', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: any, ...args: any[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(kind)) return null;
      return (original as any).call(this, kind, ...args);
    } as typeof original;
  });
  await open(page, '/network', true);
  await expect(page.getByRole('group', { name: 'Peta jaringan interaktif' })).toBeVisible({ timeout: 40000 });
  await page.locator('.recovery-journey-select').filter({ hasText: 'Putaran pasar' }).click();
  await expect(page.locator('.recovery-inspector')).toContainText('Putaran pasar');
  await approve(page);
  await expect(page.getByRole('button', { name: 'Lanjutkan layanan', exact: true })).toBeEnabled();
});

test('actual WebGL context loss recovers through the interactive map and explicit retry', async ({
  page,
}) => {
  await open(page, '/network', true);
  await expect(page.locator('[data-renderer]')).toHaveAttribute('data-renderer', 'webgl', { timeout: 40000 });
  const supported = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(supported).toBe(true);
  await expect(page.getByRole('group', { name: 'Peta jaringan interaktif' })).toBeVisible({ timeout: 20000 });
  await page.locator('.recovery-journey-select').filter({ hasText: 'Putaran pasar' }).click();
  await expect(page.locator('.recovery-inspector')).toContainText('Putaran pasar');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('[data-renderer]')).toHaveAttribute('data-renderer', 'webgl', { timeout: 40000 });
});
