import { test, expect, type Page, type Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const STORE = 'jejak-balik.session.v1';
async function navigation(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name, exact: true })
    .click();
  if (name === 'Perangkat' || name === 'Dampak') {
    const source = page.getByRole('tab', { name: 'Batch tutorial', exact: true });
    await source.click();
    await expect(source).toHaveAttribute('aria-selected', 'true');
  }
}
async function tutorialView(page: Page) {
  await page.getByRole('button', { name: 'Skenario keputusan', exact: true }).click();
  await expect(page.locator('.network-page')).toHaveAttribute('data-operation-mode', 'tutorial');
}
async function submitHero(page: Page) {
  await page.goto('/household/request?hero=1');
  for (let step = 0; step < 3; step++)
    await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
  await page.getByLabel('Informasi perangkat dan penjemputan sudah sesuai.').check();
  await page.getByRole('button', { name: 'Jadwalkan penjemputan', exact: true }).click();
  await expect(page).toHaveURL(/\/household\/requests\/JB-R036/);
  await navigation(page, 'Jaringan');
  await tutorialView(page);
  const pause = page.getByRole('button', { name: 'Jeda lini waktu', exact: true });
  if (await pause.isVisible()) await pause.click();
}
async function seekEnd(page: Page) {
  const slider = page.getByRole('slider', { name: 'Waktu operasi dalam detik' });
  await slider.fill('180');
  await expect(slider).toHaveValue('180');
}
async function pendingDecision(page: Page, gate: 'specialist' | 'data', choice: 'approve' | 'hold') {
  await page.getByRole('button', { name: 'Keputusan diperlukan', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: gate === 'specialist' ? 'Tinjau penanganan khusus' : 'Tinjau pelepasan data',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Tinjau dari titik keputusan', exact: true }).click();
  await dialog
    .getByRole('button', {
      name: choice === 'approve' ? 'Setujui pelepasan' : 'Pertahankan penahanan',
      exact: true,
    })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue(
    gate === 'specialist' ? '74' : '130',
  );
}
async function downloadText(
  page: Page,
  buttonName: string | RegExp,
): Promise<{ text: string; download: Download }> {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { text: await readFile(path!, 'utf8'), download };
}
async function exportSession(page: Page) {
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  const result = await downloadText(page, 'Ekspor sesi JSON');
  await page
    .getByRole('dialog', { name: 'Pengaturan ruang kerja' })
    .getByRole('button', { name: 'Tutup', exact: true })
    .click();
  return JSON.parse(result.text);
}
async function complete(
  page: Page,
  scenario = 'circular_day',
  safety: 'approve' | 'hold' = 'approve',
  data: 'approve' | 'hold' = 'approve',
) {
  await page.goto('/network');
  await tutorialView(page);
  await page.getByLabel('Skenario', { exact: true }).selectOption(scenario);
  await submitHero(page);
  await seekEnd(page);
  await pendingDecision(page, 'specialist', safety);
  await seekEnd(page);
  await pendingDecision(page, 'data', data);
  await seekEnd(page);
}

test('guided entry stays in the network and requires explicit sample submission', async ({ page }) => {
  await page.clock.install();
  await page.goto('/network');
  await page.getByRole('button', { name: /Ikuti perjalanan/ }).click();
  await expect(page).toHaveURL(/\/network\?request=JB-R036/);
  const guide = page.getByRole('region', { name: 'Panduan satu perangkat' });
  await expect(guide.getByRole('button', { name: 'Lanjut', exact: true })).toBeDisabled();
  await page.clock.fastForward(35_000);
  await expect(page).toHaveURL(/\/network\?request=JB-R036/);
  const before = await exportSession(page);
  expect(before.sessions['circular_day/canonical/2026-10-19'].cursor).toBe(32);
  expect(before.sessions['circular_day/canonical/2026-10-19'].decisions).toHaveLength(0);
  await guide.getByRole('button', { name: 'Kirim permintaan contoh', exact: true }).click();
  const after = await exportSession(page);
  expect(
    after.sessions['circular_day/canonical/2026-10-19'].decisions.map((d: { action: string }) => d.action),
  ).toEqual(['submit_hero']);
  await expect(guide.getByRole('button', { name: 'Lanjut', exact: true })).toBeEnabled();
});

test('seek cannot grant approvals; explicit reviews reconcile household, asset and impact views', async ({
  page,
}) => {
  await submitHero(page);
  await seekEnd(page);
  await expect(page.getByRole('button', { name: 'Keputusan diperlukan' })).toBeVisible();
  const before = await exportSession(page);
  expect(
    before.sessions['circular_day/canonical/2026-10-19'].decisions.map((d: { action: string }) => d.action),
  ).toEqual(['submit_hero']);
  await pendingDecision(page, 'specialist', 'approve');
  await seekEnd(page);
  await pendingDecision(page, 'data', 'approve');
  await seekEnd(page);
  await expect(page.locator('.network-metrics').filter({ hasText: 'Dijemput' })).toContainText('48 / 48');
  await navigation(page, 'Perangkat');
  await page.getByLabel('Cari perangkat, permintaan, atau alamat', { exact: true }).fill('JB-A036');
  await page.locator('a[href*="asset=JB-A036"]:visible').first().click();
  await expect(page.getByRole('complementary', { name: 'Detail pilihan' })).toContainText('Tuntas');
  await expect(page.getByRole('complementary', { name: 'Detail pilihan' })).toContainText(
    'Dilepas setelah tinjauan',
  );
  await page.getByRole('link', { name: 'Lihat hasil rumah tangga' }).click();
  await expect(page).toHaveURL(/JB-R036/);
  await expect(page.getByText('JB-A036', { exact: true }).first()).toBeVisible();
  await navigation(page, 'Dampak');
  await expect(page.getByText('48 dari 48 perangkat dijemput', { exact: true })).toBeVisible();
  await expect(page.getByText('189,64').first()).toBeVisible();
  await page.getByRole('link', { name: 'Ekonomi batch', exact: true }).click();
  await expect(page).toHaveURL('/impact/economics?dataset=tutorial');
  await expect(page.getByText(/1[.]678[.]174/).first()).toBeVisible();
});

for (const branch of [
  {
    name: 'specialist hold',
    scenario: 'battery_review',
    safety: 'hold',
    data: 'approve',
    collected: 46,
    completed: 46,
    mass: '188,84',
  },
  {
    name: 'data hold',
    scenario: 'circular_day',
    safety: 'approve',
    data: 'hold',
    collected: 48,
    completed: 30,
    mass: '189,64',
  },
  {
    name: 'capacity deferral',
    scenario: 'capacity_shift',
    safety: 'approve',
    data: 'approve',
    collected: 46,
    completed: 46,
    mass: '180,14',
  },
] as const) {
  test(`authored ${branch.name} stays coherent across network and impact`, async ({ page }) => {
    await complete(page, branch.scenario, branch.safety, branch.data);
    await expect(page.locator('.network-metrics')).toContainText(`${branch.collected} / 48`);
    await navigation(page, 'Dampak');
    await expect(
      page.getByText(`${branch.completed} dari ${branch.collected} perangkat dijemput`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(branch.mass).first()).toBeVisible();
    await page.getByRole('button', { name: 'Ekspor laporan', exact: true }).click();
    const csv = await downloadText(page, /Ringkasan perangkat · CSV/);
    const rows = csv.text
      .trim()
      .split('\r\n')
      .slice(1)
      .map((row) => row.split(','));
    expect(rows).toHaveLength(48);
    expect(rows.filter((row) => row[7] === 'completed')).toHaveLength(branch.completed);
    if (branch.name === 'specialist hold')
      expect(rows.filter((row) => row[8] === 'true' && row[7] === 'validated')).toHaveLength(2);
    if (branch.name === 'data hold')
      expect(rows.filter((row) => row[8] === 'true' && row[7] === 'triaged')).toHaveLength(18);
    if (branch.name === 'capacity deferral')
      expect(rows.filter((row) => row[9] === 'true' && row[7] === 'requested')).toHaveLength(2);
  });
}

test('real downloads, reset, JSON import and reload preserve the reviewed session', async ({
  page,
}, testInfo) => {
  await complete(page);
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  const session = await downloadText(page, 'Ekspor sesi JSON');
  await session.download.saveAs(testInfo.outputPath('completed-session.json'));
  const parsed = JSON.parse(session.text);
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.sessions['circular_day/canonical/2026-10-19'].decisions).toHaveLength(3);
  const csv = await downloadText(page, 'Ekspor perangkat CSV');
  expect(csv.text.split('\r\n')).toHaveLength(49);
  expect(csv.text).toContain('JB-A036,JB-R036,phone,0.18,completed');
  await page.getByRole('button', { name: 'Mulai ulang skenario aktif', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Mulai ulang skenario?', exact: true })
    .getByRole('button', { name: 'Mulai ulang', exact: true })
    .click();
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue('0');
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'completed-session.json',
    mimeType: 'application/json',
    buffer: Buffer.from(session.text),
  });
  await expect(
    page.getByRole('status').filter({ hasText: 'Sesi berhasil diimpor dan dijeda.' }),
  ).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue('180');
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).sessions['circular_day/canonical/2026-10-19']?.cursor : null;
      }, STORE),
    )
    .toBe(180);
  await page.reload();
  await tutorialView(page);
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue('180');
  await expect(page.getByRole('button', { name: 'Putar lini waktu', exact: true })).toBeVisible();
  const again = await exportSession(page);
  expect(again.sessions['circular_day/canonical/2026-10-19'].reviewToken).toBeNull();
  expect(again.sessions['circular_day/canonical/2026-10-19'].decisions).toEqual(
    parsed.sessions['circular_day/canonical/2026-10-19'].decisions,
  );
});

test('invalid import preserves the current session; corrupted storage recovers to a usable workspace', async ({
  page,
}) => {
  await submitHero(page);
  await seekEnd(page);
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await expect(
    page
      .getByRole('dialog', { name: 'Pengaturan ruang kerja' })
      .getByRole('alert')
      .filter({ hasText: 'Berkas tidak valid. Sesi aktif tetap tersimpan.' }),
  ).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Pengaturan ruang kerja' })
    .getByRole('button', { name: 'Tutup', exact: true })
    .click();
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue('180');
  // Seed corrupted persisted input before the reload, not an operational state or approval.
  await page.addInitScript((key) => localStorage.setItem(key, '{not valid JSON'), STORE);
  await page.reload();
  await tutorialView(page);
  await expect(page.getByRole('slider', { name: 'Waktu operasi dalam detik' })).toHaveValue('0');
  await expect(
    page.getByText('Sesi tersimpan tidak dapat dibaca. Ruang kerja baru sudah siap.', { exact: true }),
  ).toBeVisible();
});

test('keyboard reaches main content, changes scene tabs, and dismisses focus-trapped settings', async ({
  page,
}) => {
  await page.goto('/network');
  // The HTML bootstrap loads React independently; begin keyboard assertions
  // after the workspace is ready rather than racing the static boot surface.
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Lewati ke konten' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  const tabs = page.getByRole('tablist', { name: 'Tingkat penjelajahan' });
  await tabs.getByRole('tab', { name: 'Kota', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Hub', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.getByRole('tab', { name: 'Hub', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Perangkat', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Pengaturan ruang kerja' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Impact', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Electronics, brought back to value.' })).toBeVisible();
});
