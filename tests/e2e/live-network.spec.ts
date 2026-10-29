import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

const canonicalKey = 'circular_day/canonical/2026-10-19';
const network = (page: Page) => page.locator('.network-page');
const mapVehicles = (page: Page) => page.locator('[data-live-vehicle-map]');
async function positions(page: Page) {
  const mapButton = page.getByRole('button', { name: /^(Gunakan 2D|Use 2D)$/ });
  if (await mapButton.isVisible()) await mapButton.click();
  await expect(mapVehicles(page)).toHaveCount(6);
  return mapVehicles(page).evaluateAll((items) =>
    items.map((item) => ({
      id: item.getAttribute('data-live-vehicle-map'),
      x: item.getAttribute('data-x'),
      z: item.getAttribute('data-z'),
    })),
  );
}
async function elapsed(page: Page) {
  return Number(await network(page).getAttribute('data-live-elapsed'));
}
async function navigation(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name, exact: true })
    .click();
}
async function exportSession(page: Page) {
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor sesi JSON', exact: true }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).not.toBeNull();
  const result = JSON.parse(await readFile(path!, 'utf8'));
  await page
    .getByRole('dialog', { name: 'Pengaturan ruang kerja' })
    .getByRole('button', { name: 'Tutup', exact: true })
    .click();
  return result;
}
async function tutorial(page: Page) {
  await page.getByRole('button', { name: 'Skenario keputusan', exact: true }).click();
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'tutorial');
}
async function live(page: Page) {
  await page.getByRole('button', { name: 'Jaringan aktif', exact: true }).click();
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/network');
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
  // These workflow assertions inspect SVG vehicle positions. Choose the map
  // explicitly: a healthy 3D view correctly unmounts the compatibility map.
  await page.getByRole('button', { name: 'Gunakan 2D', exact: true }).click();
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', '2d');
});

test('fresh Network opens mid-shift and its rendered trucks and hub keep working', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Elektronik kembali bernilai.' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveCount(0);
  await expect(page.locator('[data-live-vehicle]')).toHaveCount(6);
  const before = await positions(page);
  expect(new Set(before.map(({ x, z }) => `${x}/${z}`)).size).toBeGreaterThan(1);
  expect(before.some(({ z }) => z !== '4.000')).toBe(true);
  await page.clock.runFor(5_000);
  await expect.poll(() => elapsed(page)).toBeGreaterThanOrEqual(5);
  const after = await positions(page);
  expect(after.some((pose, index) => pose.x !== before[index].x || pose.z !== before[index].z)).toBe(true);
  await expect(page.getByRole('complementary', { name: 'Detail pilihan' })).toContainText(
    'Serah terima terbaru',
  );
  await page.getByRole('button', { name: 'Lihat aktivitas hub', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Hub', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
  await page.getByRole('tab', { name: 'Kota', exact: true }).click();
  await page.setViewportSize({ width: 360, height: 844 });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Electronics, brought back to value.' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .include('.network-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('live operation survives 26 virtual hours and repeated cadences without tutorial gates or authorization', async ({
  page,
}) => {
  const before = await exportSession(page);
  const firstClock = await page.getByLabel('Jam operasi Jakarta', { exact: true }).textContent();
  await page.clock.fastForward(26 * 3_600_000 + 193_000);
  await expect.poll(() => elapsed(page)).toBeGreaterThan(26 * 3_600);
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
  await expect(network(page)).toHaveAttribute('data-story-cursor', '0');
  await expect(page).toHaveURL('/network');
  await expect(page.locator('[data-live-vehicle]')).toHaveCount(6);
  await expect(page.getByLabel('Jam operasi Jakarta', { exact: true })).not.toHaveText(firstClock!);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Keputusan diperlukan', exact: true })).toHaveCount(0);
  await expect(page.locator('.journey-strip')).toHaveCount(0);
  const after = await exportSession(page);
  expect(after.sessions).toEqual(before.sessions);
  expect(after.sessions[canonicalKey].decisions).toEqual([]);
  expect(after.sessions[canonicalKey].reviewToken).toBeNull();
});

test('live pause freezes trucks and resume survives navigation without restarting the shift', async ({
  page,
}) => {
  await page.clock.runFor(9_000);
  await page.getByRole('button', { name: 'Jeda tampilan operasi', exact: true }).click();
  const pausedAt = await elapsed(page);
  const pausedPoses = await positions(page);
  await page.clock.fastForward(10 * 60_000);
  expect(await elapsed(page)).toBe(pausedAt);
  expect(await positions(page)).toEqual(pausedPoses);
  await expect(page.getByText('Tampilan dijeda', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lanjutkan operasi', exact: true }).click();
  await page.clock.runFor(3_000);
  await expect.poll(() => elapsed(page)).toBeGreaterThan(pausedAt);
  const beforeAway = await elapsed(page);
  await navigation(page, 'Tim');
  await page.clock.runFor(7_000);
  await navigation(page, 'Jaringan');
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
  expect(await elapsed(page)).toBeGreaterThanOrEqual(beforeAway + 7);
  expect(await positions(page)).not.toEqual(pausedPoses);
  await expect(page.getByRole('button', { name: 'Jeda tampilan operasi', exact: true })).toBeVisible();
});

test('self-paced guide leaves the live clock separate and returns without decisions', async ({ page }) => {
  await page.clock.runFor(12_000);
  const liveBefore = await elapsed(page);
  await tutorial(page);
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue('0');
  await page.getByRole('button', { name: /Ikuti perjalanan/ }).click();
  await page.clock.runFor(3_000);
  await expect(page).toHaveURL(/\/network\?request=JB-R036/);
  await expect(page.getByRole('region', { name: 'Panduan satu perangkat' })).toBeVisible();
  const pausedCheckpoint = await exportSession(page);
  expect(pausedCheckpoint.sessions[canonicalKey].cursor).toBe(32);
  expect(pausedCheckpoint.sessions[canonicalKey].decisions).toEqual([]);
  await page.getByRole('button', { name: 'Akhiri panduan', exact: true }).click();
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
  expect(await elapsed(page)).toBeGreaterThanOrEqual(liveBefore + 3);
  await expect(network(page)).toHaveAttribute('data-story-cursor', '32');
  const after = await exportSession(page);
  expect(after.sessions[canonicalKey].decisions).toEqual([]);
});

test('observing live hours cannot approve a pending story review or alter an existing user decision', async ({
  page,
}) => {
  await tutorial(page);
  // Choose the authored hero request through its explicit network checkpoint.
  await page.getByRole('slider', { name: 'Waktu operasi dalam detik' }).fill('32');
  await page.getByRole('button', { name: 'Lengkapi permintaan', exact: true }).click();
  for (let step = 0; step < 3; step++)
    await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
  await page.getByLabel('Informasi perangkat dan penjemputan sudah sesuai.').check();
  await page.getByRole('button', { name: 'Jadwalkan penjemputan', exact: true }).click();
  await navigation(page, 'Jaringan');
  const pause = page.getByRole('button', { name: 'Jeda lini waktu', exact: true });
  if (await pause.isVisible()) await pause.click();
  await page.getByRole('slider', { name: 'Waktu operasi dalam detik' }).fill('180');
  await expect(page.getByRole('button', { name: 'Keputusan diperlukan', exact: true })).toBeVisible();
  const before = await exportSession(page);
  expect(before.sessions[canonicalKey].decisions.map((d: { action: string }) => d.action)).toEqual([
    'submit_hero',
  ]);
  await live(page);
  await page.clock.fastForward(6 * 3_600_000 + 123_000);
  await expect(network(page)).toHaveAttribute('data-operation-mode', 'live');
  await expect(page.getByRole('button', { name: 'Keputusan diperlukan', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Setujui pelepasan', exact: true })).toHaveCount(0);
  const after = await exportSession(page);
  expect(after.sessions[canonicalKey].decisions).toEqual(before.sessions[canonicalKey].decisions);
  expect(after.sessions[canonicalKey].cursor).toBe(180);
  expect(after.sessions[canonicalKey].reviewToken).toBeNull();
  await tutorial(page);
  await expect(page.getByRole('button', { name: 'Keputusan diperlukan', exact: true })).toBeVisible();
});
