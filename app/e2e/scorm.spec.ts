import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ALL, passConsole, passDebrief, playRound } from './helpers';

/**
 * The packaged SCORM 2004 course, launched the way Workday launches it on
 * desktop: an LMS page holding `window.API_1484_11` opens `launcher.html` in a
 * new window, the launcher forwards to `scormcontent/index.html`, and the
 * driver finds the API through `window.opener`. The package is served from
 * `dist-scorm/` on port 4174 (see `playwright.config.ts`).
 */
const ORIGIN = 'http://localhost:4174';

/** A small but strict SCORM 2004 runtime: it keeps `_count`s and logs every call. */
const LMS_PAGE = `<!doctype html><meta charset="utf-8"><title>LMS</title>
<button id="launch">Launch</button>
<script>
  const store = { 'cmi.entry': 'ab-initio', 'cmi.learner_name': 'Pérez, Ana', 'cmi.mode': 'normal' };
  const calls = [];
  let open = false;
  const count = (k) => {
    const m = /^cmi\\.(interactions|objectives)\\.(\\d+)\\.id$/.exec(k);
    if (m) store['cmi.' + m[1] + '._count'] = String(Math.max(+(store['cmi.' + m[1] + '._count'] || 0), +m[2] + 1));
  };
  window.lms = { store, calls };
  window.API_1484_11 = {
    Initialize() { calls.push('Initialize'); open = true; return 'true'; },
    Terminate() { calls.push('Terminate'); open = false; return 'true'; },
    GetValue(k) { return k in store ? store[k] : (k.endsWith('._count') ? '0' : ''); },
    SetValue(k, v) { if (!open) return 'false'; calls.push('SetValue ' + k); store[k] = String(v); count(k); return 'true'; },
    Commit() { calls.push('Commit'); return 'true'; },
    GetLastError() { return '0'; },
    GetErrorString() { return ''; },
    GetDiagnostic() { return ''; },
  };
  document.getElementById('launch').onclick = () => window.open('launcher.html', 'sco');
</script>`;

async function launch(page: Page) {
  await page.route(`${ORIGIN}/lms.html`, (route) => route.fulfill({ contentType: 'text/html', body: LMS_PAGE }));
  await page.goto(`${ORIGIN}/lms.html`);
  const [course] = await Promise.all([page.waitForEvent('popup'), page.click('#launch')]);
  await course.waitForURL(/scormcontent\/index\.html/);
  // Same window, so `window.opener` (the LMS) stays; `?fast=1` shortens the timed beats.
  await course.goto(`${ORIGIN}/scormcontent/index.html?fast=1`);
  return course;
}

const store = (page: Page) => page.evaluate(() => (window as unknown as { lms: { store: Record<string, string> } }).lms.store);
const calls = (page: Page) => page.evaluate(() => (window as unknown as { lms: { calls: string[] } }).lms.calls);

test('reports a full winning run to a SCORM 2004 LMS', async ({ page }) => {
  const course = await launch(page);
  await course.getByRole('button', { name: 'Iniciar' }).click();
  await course.getByRole('button', { name: 'Saltar intro' }).click();
  await course.getByRole('button', { name: 'Entendido' }).click();

  await playRound(course, 1, ALL);
  let lms = await store(page);
  expect(lms['cmi.completion_status']).toBe('incomplete');
  expect(lms['cmi.location']).toBe('console:r1');
  expect(lms['cmi.interactions._count']).toBe('4');
  expect(JSON.parse(lms['cmi.suspend_data'])).toMatchObject({ v: 1, state: { phase: 'console' } });

  await passConsole(course);
  await passDebrief(course);
  await course.getByLabel(/más difícil de decidir/).fill('La de Desarrollo, porque el compañero era de confianza y tenía mucha prisa.');
  await course.getByRole('button', { name: 'Enviar', exact: true }).click();
  await course.getByRole('button', { name: 'Falso' }).click();

  // The LMS knows the learner, so the certificate is issued in their name straight away.
  await expect(course.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible();

  lms = await store(page);
  expect(lms).toMatchObject({
    'cmi.completion_status': 'completed',
    'cmi.success_status': 'passed',
    'cmi.score.raw': '100',
    'cmi.score.min': '0',
    'cmi.score.max': '100',
    'cmi.progress_measure': '1',
    'cmi.objectives._count': '4',
    'cmi.interactions._count': '6',
    'cmi.interactions.4.type': 'long-fill-in',
    'cmi.interactions.5.type': 'true-false',
  });

  await course.close({ runBeforeUnload: true });
  await expect.poll(async () => (await calls(page)).at(-1)).toBe('Terminate');
  const log = await calls(page);
  expect(log.indexOf('SetValue cmi.score.raw')).toBeLessThan(log.indexOf('SetValue cmi.success_status', log.indexOf('SetValue cmi.score.raw')));
  expect((await store(page))['cmi.exit']).toBe('normal');
  expect((await store(page))['cmi.session_time']).toMatch(/^PT\d+H\d+M[\d.]+S$/);
});

test('suspends mid-run and resumes from the LMS on the next launch', async ({ page }) => {
  const course = await launch(page);
  await course.getByRole('button', { name: 'Iniciar' }).click();
  await course.getByRole('button', { name: 'Saltar intro' }).click();
  await course.getByRole('button', { name: 'Entendido' }).click();
  await expect(course.getByRole('heading', { name: 'Elige un área' })).toBeVisible();

  // Closing the LMS window mid-run raises no "leave site?" prompt and suspends.
  let prompted = false;
  course.on('dialog', (dialog) => {
    prompted = true;
    void dialog.accept();
  });
  await course.close({ runBeforeUnload: true });
  await expect.poll(async () => (await calls(page)).at(-1)).toBe('Terminate');
  expect(prompted).toBe(false);
  expect((await store(page))['cmi.exit']).toBe('suspend');

  // Relaunch: the LMS hands the data back with entry = resume.
  await page.evaluate(() => {
    (window as unknown as { lms: { store: Record<string, string> } }).lms.store['cmi.entry'] = 'resume';
  });
  const [again] = await Promise.all([page.waitForEvent('popup'), page.click('#launch')]);
  await again.waitForURL(/scormcontent\/index\.html/);
  await again.getByRole('button', { name: 'Continuar donde me quedé' }).click();
  await expect(again.getByRole('heading', { name: 'Elige un área' })).toBeVisible();
});
