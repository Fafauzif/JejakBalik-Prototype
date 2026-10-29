import { test, expect } from '@playwright/test';
test('review final desktop miniature, hub, device and mobile walkthrough', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/network');
  await expect(page.locator('.progressive-world')).toHaveAttribute('data-renderer-state', 'ready', {
    timeout: 20000,
  });
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/v2-city-final.png', fullPage: false });
  await page.getByRole('tab', { name: 'Hub', exact: true }).click();
  await page.screenshot({ path: 'test-results/v2-hub-final.png', fullPage: false });
  await page.getByRole('tab', { name: 'Perangkat', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/v2-device-final.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/network');
  await page.getByRole('button', { name: /Ikuti perjalanan/ }).click();
  const guide = page.getByRole('region', { name: 'Panduan satu perangkat' });
  await guide.getByRole('button', { name: 'Kirim permintaan contoh', exact: true }).click();
  await guide.getByRole('button', { name: 'Lanjut', exact: true }).click();
  await expect(guide).toContainText('Pembeli layanan');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
  await page.screenshot({ path: 'test-results/v2-guide-mobile-final.png', fullPage: false });
  expect(errors).toEqual([]);
});
