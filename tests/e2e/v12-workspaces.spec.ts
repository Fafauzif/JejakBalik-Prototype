import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

const canonicalKey = 'circular_day/canonical/2026-10-19';
async function navigation(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name, exact: true })
    .click();
}
async function downloadText(page: Page, name: string | RegExp) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!, 'utf8');
}
function csvRows(text: string) {
  return text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','));
}
async function exportSession(page: Page) {
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  const value = JSON.parse(await downloadText(page, 'Ekspor sesi JSON'));
  await page
    .getByRole('dialog', { name: 'Pengaturan ruang kerja' })
    .getByRole('button', { name: 'Tutup', exact: true })
    .click();
  return value.sessions[canonicalKey];
}
async function finishHeroForm(page: Page) {
  for (let step = 0; step < 3; step++)
    await page.locator('form').getByRole('button', { name: 'Lanjutkan', exact: true }).click();
  await page.getByLabel('Informasi perangkat dan penjemputan sudah sesuai.').check();
  await page.getByRole('button', { name: 'Jadwalkan penjemputan', exact: true }).click();
  await expect(page).toHaveURL(/\/household\/requests\/JB-R036/);
}
async function approve(page: Page, kind: 'specialist' | 'data') {
  const dialog = page.getByRole('dialog', {
    name: kind === 'specialist' ? 'Tinjau penanganan khusus' : 'Tinjau pelepasan data',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const rewind = dialog.getByRole('button', { name: 'Tinjau dari titik keputusan', exact: true });
  if (await rewind.isVisible()) await rewind.click();
  await dialog.getByRole('button', { name: 'Setujui pelepasan', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function axe(page: Page, scope: string) {
  const result = await new AxeBuilder({ page })
    .include(scope)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}

test('10× and 30× live speed share elapsed time while accelerated Tutorial still stops at the request gate', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/network');
  const network = page.locator('.network-page');
  const elapsed = async () => Number(await network.getAttribute('data-live-elapsed'));
  await page.getByLabel('Kecepatan operasi', { exact: true }).selectOption('10');
  const first = await elapsed();
  await page.clock.runFor(2_000);
  const ten = await elapsed();
  expect(ten - first).toBeGreaterThanOrEqual(20);
  await page.getByLabel('Kecepatan operasi', { exact: true }).selectOption('30');
  await page.clock.runFor(2_000);
  expect((await elapsed()) - ten).toBeGreaterThanOrEqual(60);
  await page.getByRole('button', { name: 'Jeda tampilan operasi', exact: true }).click();
  const paused = await elapsed();
  await page.clock.fastForward(60_000);
  expect(await elapsed()).toBe(paused);
  await page.getByRole('button', { name: 'Skenario keputusan', exact: true }).click();
  await page.getByLabel('Kecepatan pemutaran', { exact: true }).selectOption('30');
  await page.getByRole('button', { name: 'Putar lini waktu', exact: true }).click();
  await page.clock.runFor(3_000);
  await expect(network).toHaveAttribute('data-story-cursor', '32');
  await expect(page.getByRole('button', { name: 'Lengkapi permintaan', exact: true })).toBeVisible();
  const session = await exportSession(page);
  expect(session.cursor).toBe(32);
  expect(session.decisions).toEqual([]);
  await page.getByRole('button', { name: 'Jaringan aktif', exact: true }).click();
  expect(await elapsed()).toBe(paused);
  await expect(page.getByLabel('Kecepatan operasi', { exact: true })).toHaveValue('30');
});

test('guided steps require deliberate reviews and never navigate to another workspace', async ({ page }) => {
  await page.goto('/network');
  await page.getByRole('button', { name: /Ikuti perjalanan/ }).click();
  const guide = page.getByRole('region', { name: 'Panduan satu perangkat' });
  await guide.getByRole('button', { name: 'Kirim permintaan contoh', exact: true }).click();
  await guide.getByRole('button', { name: 'Lanjut', exact: true }).click();
  expect((await exportSession(page)).decisions.map((x: { action: string }) => x.action)).toEqual([
    'submit_hero',
  ]);
  await guide.getByRole('button', { name: 'Tinjau dan pilih', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tutup', exact: true }).click();
  expect((await exportSession(page)).decisions.map((x: { action: string }) => x.action)).toEqual([
    'submit_hero',
  ]);
  await guide.getByRole('button', { name: 'Tinjau dan pilih', exact: true }).click();
  await approve(page, 'specialist');
  await guide.getByRole('button', { name: 'Lanjut', exact: true }).click();
  await expect(page).toHaveURL(/\/network\?mode=hub/);
  await guide.getByRole('button', { name: 'Lanjut', exact: true }).click();
  await guide.getByRole('button', { name: 'Tinjau dan pilih', exact: true }).click();
  await approve(page, 'data');
  await guide.getByRole('button', { name: 'Lanjut', exact: true }).click();
  await expect(page).toHaveURL(/\/network$/);
  const completed = await exportSession(page);
  expect(completed.cursor).toBe(180);
  expect(completed.decisions).toHaveLength(3);
});

test('default asset history exports selected periods and filters and opens the matching historical passport', async ({
  page,
}) => {
  await page.goto('/assets');
  await expect(page.getByRole('tab', { name: 'Riwayat operasi', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('Periode layanan', { exact: true })).toHaveValue('2026');
  const year = csvRows(await downloadText(page, 'Unduh CSV'));
  expect(year).toHaveLength(2812);
  expect(new Set(year.map((row) => row[0])).size).toBe(2812);
  expect(year.every((row) => /^JB26-\d{2}-\d{5}$/.test(row[0]))).toBe(true);
  await page.getByLabel('Periode layanan', { exact: true }).selectOption('2026-01');
  const january = csvRows(await downloadText(page, 'Unduh CSV'));
  expect(january).toHaveLength(188);
  expect(january.every((row) => row[2].startsWith('2026-01'))).toBe(true);
  await page.getByLabel('Cari perangkat, permintaan, atau alamat', { exact: true }).fill('JB26-01-00001');
  const filtered = csvRows(await downloadText(page, 'Unduh CSV'));
  expect(filtered).toHaveLength(1);
  expect(filtered[0][0]).toBe('JB26-01-00001');
  await page.locator('a[href^="/assets/JB26-01-00001"]:visible').first().click();
  await expect(page).toHaveURL(/\/assets\/JB26-01-00001\?period=2026-01/);
  await expect(page.getByRole('heading', { name: 'Paspor perangkat', exact: true })).toBeVisible();
  await expect(page.getByText('JB26-01-00001', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jejak serah terima', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Daftar perangkat', exact: true }).click();
  await expect(page.getByLabel('Periode layanan', { exact: true })).toHaveValue('2026-01');
});

test('Impact period CSV, JSON and report reconcile completed outcomes and retained economics', async ({
  page,
}) => {
  await page.goto('/impact');
  await expect(page.getByRole('tab', { name: 'Riwayat operasi', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('Periode dampak', { exact: true })).toHaveValue('2026');
  await page.getByLabel('Periode dampak', { exact: true }).selectOption('2026-10');
  await page.getByRole('button', { name: 'Ekspor laporan', exact: true }).click();
  const assets = csvRows(await downloadText(page, /Daftar perangkat · CSV/));
  expect(assets).toHaveLength(284);
  const records = JSON.parse(await downloadText(page, /Catatan periode · JSON/));
  expect(records.period).toBe('2026-10');
  expect(records.assets).toHaveLength(284);
  const completed = assets.filter((row) => row[6] === 'completed');
  expect(records.metrics.completedAssets).toBe(completed.length);
  expect(records.metrics.activeAssets).toBe(284 - completed.length);
  expect(records.metrics.recoveredMassKg).toBeCloseTo(
    completed.reduce((sum, row) => sum + Number(row[5]), 0),
    2,
  );
  expect(records.metrics.revenueIdr - records.metrics.expensesIdr).toBeCloseTo(
    records.metrics.operatingContributionIdr,
    2,
  );
  const monthly = csvRows(await downloadText(page, /Ringkasan bulanan · CSV/));
  expect(monthly).toHaveLength(1);
  expect(monthly[0][0]).toBe('2026-10');
  const popupPending = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Laporan periode \/ PDF/ }).click();
  const popup = await popupPending;
  await expect(
    popup.getByRole('heading', { name: 'Laporan dampak & ekonomi layanan', exact: true }),
  ).toBeVisible();
  await expect(popup.getByText(/Periode: 2026-10/)).toBeVisible();
  await popup.close();
  await page.getByRole('link', { name: 'Model layanan', exact: true }).click();
  await expect(page).toHaveURL('/impact/economics?period=2026-10');
  await expect(page.getByLabel('Periode dampak', { exact: true })).toHaveValue('2026-10');
  await page.setViewportSize({ width: 360, height: 844 });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await axe(page, '[aria-label="Impact and outcomes"]');
});

test('Team bubbles change with shared operations and pause consistently with Network', async ({ page }) => {
  await page.clock.install();
  await page.goto('/team');
  const canvas = page.locator('[data-clock]');
  const bubbles = page.locator('[data-team-task]');
  await expect(bubbles).toHaveCount(7);
  const before = await bubbles.allTextContents();
  await page.clock.runFor(9_000);
  expect(await bubbles.allTextContents()).not.toEqual(before);
  await page.getByRole('button', { name: 'Jeda', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-live-paused', 'true');
  const pausedClock = await canvas.getAttribute('data-clock');
  const pausedTasks = await bubbles.allTextContents();
  await page.clock.fastForward(60_000);
  await expect(canvas).toHaveAttribute('data-clock', pausedClock!);
  expect(await bubbles.allTextContents()).toEqual(pausedTasks);
  await navigation(page, 'Jaringan');
  await expect(page.locator('.network-page')).toHaveAttribute('data-live-elapsed', pausedClock!);
  await expect(page.getByRole('button', { name: 'Lanjutkan operasi', exact: true })).toBeVisible();
  await navigation(page, 'Tim');
  await page.getByLabel('Laju operasi', { exact: true }).selectOption('10');
  await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
  await page.clock.runFor(2_000);
  expect(Number(await canvas.getAttribute('data-clock'))).toBeGreaterThanOrEqual(Number(pausedClock) + 20);
  await page.locator('[data-team-agent="guardian"]').click();
  await expect(
    page.locator('#team-artifact').getByRole('button', { name: 'Tinjau', exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 844 });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await axe(page, '[aria-label="Operations team"]');
});

test('Household Next advances only its one-item activity counts and requires explicit reviews before completion', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/household/request?hero=1');
  await finishHeroForm(page);
  const region = page.getByRole('region', { name: 'Sedang berlangsung', exact: true });
  const pause = region.getByRole('button', { name: 'Jeda', exact: true });
  if (await pause.isVisible()) await pause.click();
  const count = (name: string) => region.getByText(name, { exact: true }).locator('..').locator('dd');
  await expect(count('Dijemput')).toHaveText('0 / 1');
  await expect(count('Di hub')).toHaveText('0 / 1');
  await expect(count('Selesai')).toHaveText('0 / 1');
  await page.getByLabel('Kecepatan penjemputan', { exact: true }).selectOption('30');
  const next = () => region.getByRole('button', { name: 'Tahap berikutnya', exact: true }).click();
  for (let step = 0; step < 4; step++) await next();
  await expect(page.getByRole('dialog', { name: 'Tinjau penanganan khusus', exact: true })).toBeVisible();
  await approve(page, 'specialist');
  await next();
  await expect(count('Dijemput')).toHaveText('1 / 1');
  await next();
  await expect(count('Di hub')).toHaveText('1 / 1');
  await next();
  await next();
  await expect(page.getByRole('dialog', { name: 'Tinjau pelepasan data', exact: true })).toBeVisible();
  await expect(count('Selesai')).toHaveText('0 / 1');
  await approve(page, 'data');
  await next();
  await next();
  await next();
  await expect(count('Selesai')).toHaveText('1 / 1');
  const record = JSON.parse(await downloadText(page, /Unduh catatan penjemputan/));
  expect(record.requestId).toBe('JB-R036');
  expect(record.totalItems).toBe(1);
  expect(record.completedItems).toBe(1);
  expect(record.assets).toHaveLength(1);
  expect(record.assets[0].assetId).toBe('JB-A036');
  expect(record.assets[0].dataCleared).toBe(true);
});
