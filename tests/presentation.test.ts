import {displayedMod} from '../lib/presentation';
import { displayedSetup, mapRequirementTiles } from '../lib/presentation';
import { parseRoute, routeUrl } from '../lib/routes';
import { CURRENT_LEAGUE, DEFAULT_QUERY } from '../lib/model';
import { describe, it, expect } from 'vitest';
import {
  recordedDivinePrice,
  relativeActivity,
  listedCostRows,
} from '../lib/presentation';
import {
  detail as fixtureDetail,
  evidence as fixtureEvidence,
} from './fixtures.mjs';
import type { StrategyDetail, EvidencePage } from '../lib/model';
const detail = (...args: Parameters<typeof fixtureDetail>) =>
  fixtureDetail(...args) as StrategyDetail;
const evidence = (...args: Parameters<typeof fixtureEvidence>) =>
  fixtureEvidence(...args) as EvidencePage;
describe('recorded presentation', () => {
  it('converts only a complete matching revision with a common recorded rate', () => {
    const s = detail(),
      e = evidence();
    expect(recordedDivinePrice(s, e)).toBe(100);
    expect(recordedDivinePrice(s, { ...e, revision: 9 })).toBeNull();
    expect(recordedDivinePrice(s, { ...e, next_cursor: 'more' })).toBeNull();
    const mixed = structuredClone(e);
    mixed.runs[1].economics.divine_price_chaos = 300;
    expect(recordedDivinePrice(s, mixed)).toBeNull();
    expect(
      recordedDivinePrice(s, { ...e, runs: e.runs.slice(0, 1) }),
    ).toBeNull();
  });
  it('keeps unitemized costs distinct from invented map or Astrolabe prices', () => {
    const s = detail();
    s.coverage.run_count = 1;
    expect(listedCostRows(s)).toEqual([
      { name: 'Scarabs (listed prices)', value: 12 },
      { name: 'Other costs · not itemized', value: 8 },
    ]);
    s.coverage.run_count = 2;
    expect(listedCostRows(s)).toEqual([]);
    s.coverage.run_count = 1;
    s.economics.all_in_cost_per_map_chaos = 1;
    expect(listedCostRows(s)).toEqual([]);
  });
  it('formats the restored relative activity without negative future ages', () => {
    const now = Date.parse('2026-09-07T12:00:00Z');
    expect(relativeActivity('2026-09-07T11:17:00Z', now)).toBe('43m ago');
    expect(relativeActivity('2026-09-08T00:00:00Z', now)).toBe('just now');
    expect(relativeActivity(null, now)).toBe('date not recorded');
  });
});

it('defaults fresh visits to current league while preserving explicit all and older leagues', () => {
  expect(parseRoute('#/')).toMatchObject({ query: { league: CURRENT_LEAGUE } });
  expect(parseRoute('#/community/home')).toMatchObject({
    query: { league: CURRENT_LEAGUE },
  });
  expect(parseRoute('#/?league=Mirage')).toMatchObject({
    query: { league: 'Mirage' },
  });
  const all = routeUrl({
    view: 'list',
    query: { ...DEFAULT_QUERY, league: '' },
    pages: 1,
  });
  expect(all).toContain('league=');
  expect(parseRoute(all)).toMatchObject({ query: { league: '' } });
});

it('matches desktop requirement cards and excludes only the nonpositive currency card', () => {
  const s = detail();
  s.observed.currency_average = 0;
  expect(mapRequirementTiles(s.observed).map(([n]) => n)).toEqual([
    'Quantity',
    'Rarity',
    'Pack size',
  ]);
  s.observed.currency_average = 42;
  expect(mapRequirementTiles(s.observed).at(-1)).toEqual(['Currency', 42]);
});
it('fills missing presentation metadata only from the exact matching single run', () => {
  const s = detail(),
    e = evidence();
  s.coverage.run_count = 1;
  e.runs = e.runs.slice(0, 1);
  s.coverage.map_count = e.runs[0].observed.map_count;
  s.setup.astrolabe = null;
  expect(displayedSetup(s, e).astrolabe).toBe(e.runs[0].setup.astrolabe);
  expect(s.setup.astrolabe).toBeNull();
  expect(
    displayedSetup(s, { ...e, revision: e.revision + 1 }).astrolabe,
  ).toBeNull();
  expect(
    displayedSetup(s, { ...e, strategy_id: 'different' }).astrolabe,
  ).toBeNull();
  s.coverage.map_count = 999;
  expect(displayedSetup(s, e).astrolabe).toBeNull();
});

it('matches the desktop Mod setup fallback without overriding an observed zero',()=>{
 expect(displayedMod(null,'8-mod').value).toBe('8.0');
 expect(displayedMod(null,'6-mod').value).toBe('6.0');
 expect(displayedMod(0,'8-mod').value).toBe('0.0');
 expect(displayedMod(null,'mixed').value).toBe('—');
});
