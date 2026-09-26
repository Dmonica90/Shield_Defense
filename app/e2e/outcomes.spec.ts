import { expect, test } from '@playwright/test';
import {
  ALL,
  areaButton,
  begin,
  optionText,
  passConsole,
  passDebrief,
  playArea,
  playRound,
  press,
} from './helpers';

const REFLECTION = 'La de operaciones: el manager confiaba en un script que llevaba años sin revisión.';

test('route A: every decision right, all the way to the certificate, by keyboard only', async ({ page }) => {
  const kb = true;
  await begin(page, kb);
  await playRound(page, 1, ALL, [], kb);

  await expect(page.getByText('PROTOCOLO ZERO-TRUST ACTIVADO')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('[CORRUPTO]')).toHaveCount(0);
  await passConsole(page, kb);
  await passDebrief(page, kb);

  // Reflection: the counter holds Submit back until 50 characters.
  const submit = page.getByRole('button', { name: 'Enviar', exact: true });
  await page.getByLabel(/más difícil de decidir/).fill('corta');
  await expect(submit).toBeDisabled();
  await expect(page.getByText(/Faltan 45 caracteres/)).toBeVisible();
  await page.getByLabel(/más difícil de decidir/).fill(REFLECTION);
  await press(page, submit, kb);

  // "True" explains and asks again; only "false" moves on.
  await press(page, page.getByRole('button', { name: 'Verdadero' }), kb);
  await expect(page.getByText(/El DLP no está para espiarte/)).toBeVisible();
  await press(page, page.getByRole('button', { name: 'Falso' }), kb);

  await page.getByLabel(/A nombre de quién/).fill('Ana Pérez');
  await press(page, page.getByRole('button', { name: 'Generar certificado' }), kb);
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible();
  await expect(page.getByText('PASS (100)')).toBeVisible();
  await expect(page.getByText('«Zero Trust Defender»')).toBeVisible();

  await press(page, page.getByRole('button', { name: /Cerrar/ }), kb);
  await expect(page.getByText('Curso completado')).toBeVisible();
});

test('route B: a false fragment is only revealed at the console, then that area is replayed harder', async ({ page }) => {
  await begin(page);

  // Wrong in Desarrollo — but nothing says so yet: the HUD still counts it.
  await playArea(page, 'desarrollo', 1, false);
  await expect(areaButton(page, 'desarrollo')).toContainText('Fragmento obtenido');
  await expect(page.getByRole('group', { name: 'Fragmentos: 1/4' })).toBeVisible();

  await playRound(page, 1, ['atencion', 'finanzas', 'operaciones']);
  await expect(page.getByText('ACCESO NO AUTORIZADO')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('[CORRUPTO]')).toHaveCount(1);
  await passConsole(page);

  // The consequences appear here, and only here.
  await expect(page.getByRole('heading', { name: 'No lograste asegurar el sistema' })).toBeVisible();
  await expect(page.getByText('Fallos: 1 de 3')).toBeVisible();
  await expect(page.getByText(optionText('desarrollo', 1, false))).toBeVisible();
  await expect(page.getByRole('group', { name: 'Fragmentos: 3/4' })).toBeVisible();
  await expect(page.getByText('Lo que pasó')).toBeVisible();
  await page.getByRole('button', { name: 'Regresar' }).click();

  // Round 2 (medium): only Desarrollo is open.
  await expect(page.getByText('Ronda 2 · Intermedio')).toBeVisible();
  await expect(areaButton(page, 'desarrollo')).toBeEnabled();
  for (const area of ['atencion', 'finanzas', 'operaciones'] as const) {
    await expect(areaButton(page, area)).toBeDisabled();
  }

  await playRound(page, 2, ['desarrollo']);
  await expect(page.getByText('PROTOCOLO ZERO-TRUST ACTIVADO')).toBeVisible({ timeout: 10_000 });
  await passConsole(page);
  await expect(page.getByRole('heading', { name: 'Factor humano' })).toBeVisible();
});

test('route C: three failed verifications end the run, and retry starts over', async ({ page }) => {
  await begin(page);
  await playRound(page, 1, ALL, ['finanzas']);
  await passConsole(page);
  await page.getByRole('button', { name: 'Regresar' }).click();

  await playRound(page, 2, ['finanzas'], ['finanzas']);
  await passConsole(page);
  await expect(page.getByText('Fallos: 2 de 3')).toBeVisible();
  await page.getByRole('button', { name: 'Regresar' }).click();

  await expect(page.getByText('Ronda 3 · Difícil')).toBeVisible();
  await playRound(page, 3, ['finanzas'], ['finanzas']);
  await passConsole(page);

  await expect(page.getByRole('heading', { name: '❌ Ataque iniciado' })).toBeVisible();
  await expect(page.getByText('Fragmentos genuinos: 3 de 4')).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar' }).click();

  await expect(page.getByRole('heading', { name: 'Elige un área' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Fallos: 0/3' })).toBeVisible();
  for (const area of ALL) await expect(areaButton(page, area)).toBeEnabled();
});
