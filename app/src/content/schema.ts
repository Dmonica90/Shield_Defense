import { AREA_IDS, OPTION_IDS } from '../game/types';
import type { AreaId, Cycle, Level, OptionId } from '../game/types';

/**
 * Shape of a localized script. Everything the player reads lives here, so a new
 * language is a new JSON file and a script change never touches the code.
 */

export type Hotspot = {
  /** Stable id, used for tracking; unique within its cycle. */
  id: string;
  label: string;
  icon: string;
  text: string;
};

export type Option = {
  text: string;
  correct: boolean;
  /** Shown only at the end of a failed round, never at decision time. */
  consequences: string[];
  why: string;
};

export type CycleContent = {
  intro: string;
  /** Only the harder cycles have one: the reveal that reframes the situation. */
  twist?: string;
  pressure: string[];
  hotspots: Hotspot[];
  question: string;
  options: Record<OptionId, Option>;
};

export type AreaContent = {
  name: string;
  title: string;
  setting: string;
  fragment: { icon: string; name: string };
  cycles: Record<'1' | '2' | '3', CycleContent>;
};

export type DebriefCard = { title: string; lines: string[]; source?: string };

export type Story = {
  locale: string;
  languageName: string;
  meta: { brand: string; title: string; tagline: string; duration: string };
  loading: Record<'loadingLabel' | 'start' | 'resumeTitle' | 'resumeBody' | 'resume' | 'restart', string>;
  intro: {
    label: string;
    lines: string[];
    scenes: Record<AreaId, string>;
    continue: string;
    skip: string;
    videoErrorTitle: string;
    videoErrorBody: string;
    videoRetry: string;
    videoSkip: string;
    videoExit: string;
  };
  rules: {
    label: string;
    title: string;
    subtitle: string;
    items: { title: string; question: string; text: string }[];
    howTitle: string;
    how: string[];
    continue: string;
    skip: string;
  };
  levels: Record<Level, { name: string; description: string }>;
  hud: Record<'fragments' | 'failures' | 'round' | 'mute' | 'unmute', string>;
  areaSelect: Record<
    'label' | 'title' | 'hint' | 'roundHint' | 'time' | 'pending' | 'held' | 'secured' | 'fragmentLabel',
    string
  >;
  area: Record<
    | 'explore'
    | 'exploreTitle'
    | 'exploreHint'
    | 'exploredCount'
    | 'decide'
    | 'question'
    | 'submit'
    | 'backToScene'
    | 'confirmTitle'
    | 'confirmBody'
    | 'confirmOk'
    | 'confirmCancel'
    | 'fragmentTitle'
    | 'fragmentBody'
    | 'continue'
    | 'close'
    | 'pressure'
    | 'twist',
    string
  >;
  console: Record<
    'system' | 'verifying' | 'genuine' | 'false' | 'successTitle' | 'successBody' | 'failTitle' | 'failBody' | 'continue',
    string
  >;
  roundEnd: Record<'label' | 'title' | 'body' | 'youChose' | 'consequences' | 'why' | 'failures' | 'next' | 'cta', string>;
  debrief: { label: string; next: string; finish: string; cards: DebriefCard[] };
  evaluation: Record<
    | 'label'
    | 'q1'
    | 'q1Note'
    | 'q1Placeholder'
    | 'q1Counter'
    | 'q1TooShort'
    | 'submit'
    | 'skip'
    | 'q2'
    | 'q2Note'
    | 'trueLabel'
    | 'falseLabel'
    | 'wrong'
    | 'right',
    string
  >;
  certificate: Record<
    | 'label'
    | 'namePrompt'
    | 'namePlaceholder'
    | 'nameConfirm'
    | 'fallbackName'
    | 'completed'
    | 'date'
    | 'time'
    | 'duration'
    | 'status'
    | 'statusValue'
    | 'score'
    | 'scoreValue'
    | 'fragments'
    | 'badge'
    | 'badgeLabel'
    | 'credit'
    | 'download'
    | 'close'
    | 'closed',
    string
  >;
  gameOver: Record<'label' | 'title' | 'body' | 'failures' | 'fragments' | 'wrong' | 'retry' | 'exit' | 'exited', string>;
  session: Record<'idleTitle' | 'idleBody' | 'resume' | 'exit' | 'exited', string>;
  areas: Record<AreaId, AreaContent>;
};

/** How many hotspots each cycle must offer: the design's escalation, 3 → 4–5 → 5. */
const HOTSPOT_RANGE: Record<Cycle, [number, number]> = { 1: [3, 3], 2: [4, 5], 3: [5, 5] };

/** Placeholders a template must keep, or the screen would print a raw `{name}`. */
const PLACEHOLDERS: [string, string[]][] = [
  ['hud.round', ['round']],
  ['areaSelect.roundHint', ['round']],
  ['area.exploredCount', ['done', 'total']],
  ['area.fragmentBody', ['fragment']],
  ['console.failBody', ['count']],
  ['roundEnd.failures', ['failures', 'max']],
  ['roundEnd.next', ['round', 'level']],
  ['evaluation.q1Counter', ['count', 'max']],
  ['evaluation.q1TooShort', ['missing']],
  ['certificate.scoreValue', ['score']],
  ['gameOver.failures', ['failures', 'max']],
  ['gameOver.fragments', ['count']],
  ['gameOver.wrong', ['count']],
];

/**
 * Structural check for a story file. Content is authored by hand in JSON, so a
 * blank line or a second "correct" answer should fail loudly in tests rather
 * than reach a learner.
 */
export function validateStory(story: Story, label: string): string[] {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(`${label}: ${message}`);

  // Every string anywhere in the file must have text in it.
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (value.trim() === '') fail(`${path} is empty`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) fail(`${path} is an empty list`);
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(story, '');

  if (story.rules?.items?.length !== 5) fail('rules.items must have the 5 Zero Trust principles');
  if (story.debrief?.cards?.length !== 6) fail('debrief.cards must have 6 cards');

  for (const area of AREA_IDS) {
    const content = story.areas?.[area];
    if (!content) {
      fail(`areas.${area} missing`);
      continue;
    }
    if (!story.intro?.scenes?.[area]) fail(`intro.scenes.${area} missing`);

    for (const cycle of [1, 2, 3] as const) {
      const where = `areas.${area}.cycles.${cycle}`;
      const c = content.cycles?.[String(cycle) as '1' | '2' | '3'];
      if (!c) {
        fail(`${where} missing`);
        continue;
      }

      const [min, max] = HOTSPOT_RANGE[cycle];
      const count = c.hotspots?.length ?? 0;
      if (count < min || count > max) fail(`${where} has ${count} hotspots, expected ${min}–${max}`);
      const ids = (c.hotspots ?? []).map((h) => h.id);
      if (new Set(ids).size !== ids.length) fail(`${where} has duplicate hotspot ids`);

      const keys = Object.keys(c.options ?? {}).sort();
      if (keys.join() !== [...OPTION_IDS].join()) fail(`${where}.options must be exactly A, B, C`);
      const correct = OPTION_IDS.filter((id) => c.options?.[id]?.correct === true);
      if (correct.length !== 1) fail(`${where} must have exactly one correct option (has ${correct.length})`);
    }
  }

  for (const [path, keys] of PLACEHOLDERS) {
    const text = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], story);
    for (const key of keys) {
      if (typeof text !== 'string' || !text.includes(`{${key}}`)) fail(`${path} must contain {${key}}`);
    }
  }

  return problems;
}

/** The script for one area at one cycle. */
export function cycleContent(story: Story, area: AreaId, cycle: Cycle): CycleContent {
  return story.areas[area].cycles[String(cycle) as '1' | '2' | '3'];
}

/** The option id the script marks as right. */
export function correctOption(content: CycleContent): OptionId {
  return OPTION_IDS.find((id) => content.options[id].correct) ?? 'A';
}

/** Substitutes `{name}`-style placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}
