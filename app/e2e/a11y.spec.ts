import { expect, test } from '@playwright/test';
import { begin } from './helpers';

test('the document is in Spanish and every screen has a heading', async ({ page }) => {
  await begin(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('dialogs trap focus and close on Escape', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: /^1\. Centro de Atención:/ }).click();
  await page.getByRole('button', { name: 'Explorar' }).click();
  await page.getByRole('button', { name: 'Monitor de chat', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // The explored hotspot is marked as such for screen readers.
  await expect(page.getByRole('button', { name: 'Monitor de chat (✓)' })).toBeVisible();
});

test('submitting a decision needs a choice and a confirmation', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: /^2\. Desarrollo:/ }).click();
  await page.getByRole('button', { name: 'Explorar' }).click();
  await page.getByRole('button', { name: 'Decidir' }).click();

  const submit = page.getByRole('button', { name: 'Enviar decisión' });
  await expect(submit).toBeDisabled();
  await page.getByRole('radio').nth(1).click();
  await expect(page.getByRole('radio').nth(1)).toHaveAttribute('aria-checked', 'true');
  await submit.click();
  await page.getByRole('button', { name: 'Revisar de nuevo' }).click();
  await expect(page.getByRole('heading', { name: '¿Qué haces?' })).toBeVisible();
});
