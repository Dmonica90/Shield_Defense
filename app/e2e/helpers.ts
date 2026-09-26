import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import story from '../src/content/story.es.json' with { type: 'json' };

export type Area = 'atencion' | 'desarrollo' | 'finanzas' | 'operaciones';
type Cycle = 1 | 2 | 3;
type Options = Record<'A' | 'B' | 'C', { text: string; correct: boolean }>;

const areas = story.areas as unknown as Record<
  Area,
  { name: string; cycles: Record<string, { hotspots: { label: string }[]; options: Options }> }
>;

export const areaName = (area: Area) => areas[area].name;

/** The text of the right answer, or of a wrong one, for an area and cycle. */
export function optionText(area: Area, cycle: Cycle, right: boolean): string {
  const options = Object.values(areas[area].cycles[String(cycle)].options);
  return options.find((o) => o.correct === right)!.text;
}

/** Click, or focus and press Enter for the keyboard-only run. */
export async function press(page: Page, target: Locator, keyboard = false) {
  if (keyboard) {
    await target.focus();
    await page.keyboard.press('Enter');
  } else {
    await target.click();
  }
}

/**
 * Loads the course in test mode (`?fast=1` shortens the fixed-length beats and
 * holds the glitch still) and gets to the area selector. Leaving mid-run raises
 * the beforeunload prompt, so reloads in the tests accept it.
 */
const accepting = new WeakSet<Page>();

export async function begin(page: Page, keyboard = false) {
  if (!accepting.has(page)) {
    accepting.add(page);
    page.on('dialog', (dialog) => void dialog.accept());
  }
  await page.goto('/?fast=1');
  await press(page, page.getByRole('button', { name: 'Iniciar' }), keyboard);
  await press(page, page.getByRole('button', { name: 'Saltar intro' }), keyboard);
  await press(page, page.getByRole('button', { name: 'Entendido' }), keyboard);
  await expect(page.getByRole('heading', { name: 'Elige un área' })).toBeVisible();
}

export function areaButton(page: Page, area: Area) {
  return page.getByRole('button', { name: new RegExp(`^\\d\\. ${areaName(area)}:`) });
}

/** Plays one area: explore a hotspot, choose, confirm, collect the fragment. */
export async function playArea(page: Page, area: Area, cycle: Cycle, right: boolean, keyboard = false) {
  await press(page, areaButton(page, area), keyboard);
  await press(page, page.getByRole('button', { name: 'Explorar' }), keyboard);

  const hotspot = areas[area].cycles[String(cycle)].hotspots[0].label;
  await press(page, page.getByRole('button', { name: hotspot, exact: true }), keyboard);
  await expect(page.getByRole('dialog')).toBeVisible();
  await press(page, page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }), keyboard);

  await press(page, page.getByRole('button', { name: 'Decidir' }), keyboard);
  await press(page, page.getByRole('radio', { name: optionText(area, cycle, right) }), keyboard);
  await press(page, page.getByRole('button', { name: 'Enviar decisión' }), keyboard);
  await press(page, page.getByRole('button', { name: 'Sí, enviar' }), keyboard);

  // The same screen whether the call was right or wrong.
  await expect(page.getByRole('heading', { name: 'Fragmento obtenido' })).toBeVisible();
  await press(page, page.getByRole('button', { name: 'Continuar' }), keyboard);
}

export const ALL: Area[] = ['atencion', 'desarrollo', 'finanzas', 'operaciones'];

/** Plays every listed area in a round; `wrong` lists the ones to miss. */
export async function playRound(page: Page, cycle: Cycle, list: Area[], wrong: Area[] = [], keyboard = false) {
  for (const area of list) await playArea(page, area, cycle, !wrong.includes(area), keyboard);
  await expect(page.getByText('> VERIFICANDO FRAGMENTOS…')).toBeVisible();
}

/** Waits out the console and continues. */
export async function passConsole(page: Page, keyboard = false) {
  const next = page.getByRole('status').getByRole('button', { name: 'Continuar' });
  await expect(next).toBeVisible({ timeout: 10_000 });
  await press(page, next, keyboard);
}

/** Reads all six debrief cards and moves on. */
export async function passDebrief(page: Page, keyboard = false) {
  const finish = page.getByRole('button', { name: 'Continuar a la evaluación' });
  await expect(finish).toBeVisible({ timeout: 10_000 });
  await press(page, finish, keyboard);
}
