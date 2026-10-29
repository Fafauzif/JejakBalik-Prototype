import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('program lab exposes funding dependence and retains deferred obligations', async ({ page }) => {
  await page.goto('/network');
  await page.getByText('Uji pendanaan & rencana rute', { exact: true }).click();
  const lab = page.getByRole('region', { name: 'Rancang program komunitas' });
  await expect(lab.locator('.program-result strong')).toContainText('1.678.174');
  await lab.getByLabel('Kontrak layanan institusi').uncheck();
  await lab.getByLabel('Dukungan akses komunitas').uncheck();
  await expect(lab.locator('.program-result')).toHaveClass(/negative/);
  await expect(lab.locator('.program-result strong')).toContainText('821.826');
  await lab.getByLabel('Dua perangkat spesialis tetap ditahan').check();
  await expect(lab.locator('.program-ledger')).toContainText('273.800');
  await expect(lab.locator('.program-result strong')).toContainText('821.826');
  await page.screenshot({ path: 'test-results/v2-program-desktop.png', fullPage: true });
});

test('local assistant needs no credits and rejects no operational decisions', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/assistant', async (route) => {
    calls++;
    await route.fulfill({ status: 503, body: '{}' });
  });
  await page.goto('/network');
  await page.getByRole('button', { name: /Butuh bantuan meninjau perangkat/ }).click();
  const assistant = page.getByRole('region', { name: 'Asisten tinjauan opsional' });
  await assistant.getByRole('button', { name: 'Tinjau deskripsi', exact: true }).click();
  await expect(assistant.locator('.assistant-result')).toContainText('Aturan lokal');
  await expect(assistant.locator('.assistant-result')).toContainText('Tinjauan data');
  expect(calls).toBe(0);
  await assistant.getByLabel('Gunakan AI langsung · akses demo').check();
  await assistant.getByLabel('Kode akses demo').fill('controlled-demo-code-for-testing');
  await assistant.getByRole('button', { name: 'Tinjau deskripsi', exact: true }).click();
  await expect(assistant.getByRole('alert')).toBeVisible();
  await assistant.getByRole('button', { name: 'Gunakan tinjauan lokal', exact: true }).click();
  await expect(assistant.locator('.assistant-result')).toContainText('Aturan lokal');
});

test('changing locale cancels a stale AI response and collapsing clears the presenter code', async ({
  page,
}) => {
  await page.route('**/api/assistant', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'ai',
        suggestion: {
          summary: 'STALE_RESPONSE',
          category: 'laptop',
          missingFields: ['ownership'],
          nextStep: 'Review ownership',
          flags: ['data_review'],
        },
      }),
    });
  });
  await page.goto('/network');
  await page.getByRole('button', { name: /Butuh bantuan meninjau perangkat/ }).click();
  await page.getByLabel('Gunakan AI langsung · akses demo').check();
  await page.getByLabel('Kode akses demo').fill('controlled-demo-code-for-testing');
  await page.getByRole('button', { name: 'Tinjau deskripsi', exact: true }).click();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review description', exact: true })).toBeEnabled();
  await expect(page.getByText('STALE_RESPONSE', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Need help reviewing a device/ }).click();
  await page.getByRole('button', { name: /Need help reviewing a device/ }).click();
  await expect(page.getByLabel('Demo access code')).toHaveValue('');
});

test('mobile entry, expanded controls, and keyboard focus remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/network');
  await page.getByText('Uji pendanaan & rencana rute', { exact: true }).click();
  await page.getByRole('button', { name: /Butuh bantuan meninjau perangkat/ }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const axe = await new AxeBuilder({ page })
    .include('#program-model')
    .include('.assistant-panel')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/v2-mobile.png', fullPage: true });
});
