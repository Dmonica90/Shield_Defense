import { expect, test } from '@playwright/test';
import { areaButton, begin, playArea } from './helpers';

test('the first screen offers Spanish and English before starting', async ({ page }) => {
  await page.goto('/?fast=1');
  const switcher = page.getByRole('group', { name: 'Idioma' });
  await expect(switcher.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');

  await switcher.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
});

test('switching language mid-area keeps the game state', async ({ page }) => {
  await begin(page);
  await playArea(page, 'finanzas', 1, true);
  await areaButton(page, 'atencion').click();
  await page.getByRole('button', { name: 'Explorar' }).click();
  await page.getByRole('button', { name: /Monitor de chat/ }).click();
  await page.getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'English' }).click();

  // Same area, same step, same hotspot already explored — only the words changed.
  await expect(page.getByText('Customer service center, 2:30 p.m.')).toBeVisible();
  await expect(page.getByText('1 of 3 explored')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Decide' })).toBeVisible();

  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Español' }).click();
  await expect(page.getByText('Centro de atención, 14:30 horas')).toBeVisible();
  await expect(page.getByText('1 de 3 explorados')).toBeVisible();
});

test('screens without the HUD still have the switch', async ({ page }) => {
  await page.goto('/?fast=1');
  await page.getByRole('button', { name: 'Iniciar' }).click();
  await page.getByRole('button', { name: 'Saltar intro' }).click();

  await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: '5 principles of Data Loss Prevention (DLP)' })).toBeVisible();
});

test('the language choice survives a reload', async ({ page }) => {
  await page.goto('/?fast=1');
  await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'English' }).click();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
});

test('the browser language decides when nothing is stored', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/?fast=1');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await context.close();
});
