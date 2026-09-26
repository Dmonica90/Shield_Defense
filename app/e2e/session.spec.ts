import { expect, test } from '@playwright/test';
import { areaButton, begin, playArea } from './helpers';

test('a reload mid-run offers to continue where the player left off', async ({ page }) => {
  await begin(page);
  await playArea(page, 'finanzas', 1, true);

  await page.reload();
  await page.getByRole('button', { name: 'Continuar donde me quedé' }).click();

  await expect(page.getByRole('heading', { name: 'Elige un área' })).toBeVisible();
  await expect(areaButton(page, 'finanzas')).toContainText('Fragmento obtenido');
  await expect(areaButton(page, 'finanzas')).toBeDisabled();
});

test('starting over discards the saved run', async ({ page }) => {
  await begin(page);
  await playArea(page, 'atencion', 1, false);

  await page.reload();
  await page.getByRole('button', { name: 'Empezar de nuevo' }).click();
  await page.getByRole('button', { name: 'Saltar intro' }).click();
  await page.getByRole('button', { name: 'Entendido' }).click();
  await expect(areaButton(page, 'atencion')).toContainText('Pendiente');
});

test('the options are not always in the order the script lists them', async ({ page }) => {
  // With the right answer always first, "pick A" would win. Across a few runs
  // the first option shown must not always be the right one.
  const firsts = new Set<string>();
  for (let run = 0; run < 6 && firsts.size < 2; run += 1) {
    // Each run starts fresh: drop the save the previous one left behind.
    if (run > 0) await page.evaluate(() => localStorage.clear());
    await begin(page);
    await areaButton(page, 'atencion').click();
    await page.getByRole('button', { name: 'Explorar' }).click();
    await page.getByRole('button', { name: 'Decidir' }).click();
    firsts.add((await page.getByRole('radio').first().textContent()) ?? '');
  }
  expect(firsts.size).toBeGreaterThan(1);
});
