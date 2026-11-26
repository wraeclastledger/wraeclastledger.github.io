import { expect, it } from 'vitest';
import { MECHANICS } from '../components/mechanic-filter';

it('offers confirmed encounter families, Rush strategies and distinct Astrolabes in Mechanics', () => {
  expect(MECHANICS).toEqual(expect.arrayContaining([
    'sentinel', 'mirage', 'mirage-rush', 'wildwood', 'shrine', 'beyond', 'delirium',
    'torment', 'harbinger', 'metamorph', 'titanic',
    'astrolabe-immortal', 'astrolabe-feral', 'astrolabe-royal', 'astrolabe-cryptic',
  ]));
  expect(new Set(MECHANICS).size).toBe(MECHANICS.length);
});
