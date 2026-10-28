import { describe, expect, it } from 'vitest';
import { AREA_IDS, OPTION_IDS } from '../game/types';
import { STORIES } from './index';
import { cycleContent, validateStory } from './schema';
import type { Story } from './schema';

describe('story files', () => {
  for (const [locale, story] of Object.entries(STORIES)) {
    it(`${locale} passes structural validation`, () => {
      expect(validateStory(story, locale)).toEqual([]);
    });

    it(`${locale} has one right answer in every area and cycle`, () => {
      for (const area of AREA_IDS) {
        for (const cycle of [1, 2, 3] as const) {
          const options = cycleContent(story, area, cycle).options;
          expect(OPTION_IDS.filter((id) => options[id].correct)).toHaveLength(1);
        }
      }
    });
  }

  it('catches a second correct answer and a blank line', () => {
    const broken = structuredClone(STORIES.es) as Story;
    broken.areas.atencion.cycles['1'].options.B.correct = true;
    broken.areas.finanzas.cycles['2'].intro = '  ';
    const problems = validateStory(broken, 'broken');
    expect(problems.some((p) => p.includes('atencion.cycles.1 must have exactly one correct option'))).toBe(true);
    expect(problems.some((p) => p.includes('finanzas.cycles.2.intro is empty'))).toBe(true);
  });

  it('catches a cycle with the wrong number of hotspots', () => {
    const broken = structuredClone(STORIES.es) as Story;
    broken.areas.operaciones.cycles['3'].hotspots.pop();
    expect(validateStory(broken, 'broken').join()).toMatch(/operaciones\.cycles\.3 has 4 hotspots/);
  });

  it('catches a template that lost its placeholder', () => {
    const broken = structuredClone(STORIES.es) as Story;
    broken.hud.round = 'Ronda';
    expect(validateStory(broken, 'broken').join()).toMatch(/hud\.round must contain \{round\}/);
  });

  it('every translation matches the Spanish original wherever the game or tracking reads it', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
    // Same keys, same list lengths, same placeholders, and identical ids, icons and right answers.
    const differences = (es: unknown, other: unknown, path: string): string[] => {
      if (typeof es === 'string') {
        if (typeof other !== 'string') return [`${path} is not text`];
        if (/(^|\.)(id|icon)$/.test(path) && es !== other) return [`${path} differs`];
        return placeholders(es) === placeholders(other) ? [] : [`${path} placeholders differ`];
      }
      if (typeof es === 'boolean') return es === other ? [] : [`${path} differs`];
      if (Array.isArray(es)) {
        if (!Array.isArray(other) || other.length !== es.length) return [`${path} has a different length`];
        return es.flatMap((item, i) => differences(item, other[i], `${path}[${i}]`));
      }
      const a = es as Record<string, unknown>;
      const b = (other ?? {}) as Record<string, unknown>;
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      return keys.flatMap((key) =>
        key in a && key in b ? differences(a[key], b[key], path ? `${path}.${key}` : key) : [`${path}.${key} missing on one side`],
      );
    };
    for (const [locale, story] of Object.entries(STORIES)) {
      if (locale !== 'es') expect(differences(STORIES.es, story, '')).toEqual([]);
    }
  });
});
