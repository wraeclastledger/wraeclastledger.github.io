// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PrototypeDetail from '../components/prototype-detail';
import { displayedCosts, historicalCostRows } from '../lib/presentation';
import { validateResponse } from '../lib/api';
import { generatePublicStrategySetupCode } from '../lib/vendor/setup-code.js';
import type { StrategyDetail, EvidencePage } from '../lib/model';
import { detail, evidence } from './fixtures.mjs';

// Constructed test data. No saved publication, author, Atlas allocation or loot capture.
function publishedRun() {
  const s = structuredClone(detail()) as StrategyDetail;
  const e = structuredClone(evidence()) as EvidencePage;
  s.title = 'Synthetic historical cost example';
  s.notes = null;
  s.setup.scarabs = [{ name: 'Bestiary Scarab', price_each_chaos: 6 }, { name: 'Bestiary Scarab of the Herd', price_each_chaos: 7 }, { name: 'Bestiary Scarab of the Herd', price_each_chaos: 7 }];
  s.setup.chisel = 'Divination';
  s.setup.delirium = null;
  s.setup.astrolabe = null;
  s.setup.atlas = { url: null, points: null, points_max: null };
  s.loot = null;
  s.coverage = { ...s.coverage, run_count: 1, map_count: 40, timed_run_count: 0, timed_map_count: 0, timed_minutes: null, net_divines_per_hour: null, loot_available: false };
  s.observed = { ...s.observed, map_count: 40, mod_sample_size: 40 };
  s.economics = { all_in_cost_per_map_chaos: 36.325, recurring_cost_per_map_chaos: 36.325, net_per_map_divines: 0.1, historical_net_divines: 4, historical_invest_divines: 14.53 };
  e.runs = e.runs.slice(0, 1);
  const run = e.runs[0];
  run.setup = { ...run.setup, chisel: 'divination', scarabs: s.setup.scarabs.map(item => typeof item === 'string' ? item : item.name), delirium: { type: 'fine', count_per_map: 1 }, astrolabe: 'templar astrolabe' };
  run.observed = { ...run.observed, map_count: 40, mod_sample_size: 40 };
  run.economics = { recurring_cost_per_map_chaos: 36.325, total_invest_chaos: 1453, net_profit_chaos: 400, net_per_map_divines: 0.1, divine_price_chaos: 100 };
  run.timing.reported_minutes = null;
  run.cost_breakdown = null;
  run.loot = null;
  run.display_cost_breakdown = {
    chisel: { name: 'Divination', price_each_chaos: 9 },
    scarabs: s.setup.scarabs as Exclude<typeof s.setup.scarabs, string[]>,
    delirium: { type: 'Fine', count_per_map: 1, price_each_chaos: 4 },
    astrolabe: { type: 'Templar Astrolabe', count: 3, price_each_chaos: 11 },
  };
  run.observed_delirium = {
    sample_size: 40,
    levels: [{ percentage: 20, count: 40 }],
    rewards: [{ name: 'Currency', count: 40 }],
  };
  return { s, e };
}
describe('published historical setup display', () => {
  it('separates every authored item cost and preserves the combined map/rolling remainder', () => {
    const { s, e } = publishedRun(),
      rows = historicalCostRows(s, e);
    expect(rows.map((r) => r.name)).toEqual([
      'Base map + rolling costs',
      'Scarabs',
      "Maven's Chisel of Divination",
      'Fine Delirium Orb',
      'Templar Astrolabe',
    ]);
    expect(rows[0].value).toBeCloseTo(2.5, 1);
    expect(rows[1].value).toBeCloseTo(20);
    expect(rows[2].value).toBe(9);
    expect(rows[3].value).toBe(4);
    expect(rows[4].value).toBeCloseTo(33 / 40);
    expect(rows.reduce((sum, r) => sum + r.value, 0)).toBeCloseTo(
      s.economics.all_in_cost_per_map_chaos!,
    );
  });
  it('renders prices and observations in the preferred detail layout', () => {
    const { s, e } = publishedRun(),
      host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(
      <PrototypeDetail
        strategy={s}
        evidence={e}
        onCopy={() => {}}
        copyBusy={false}
      />,
    );
    const text = host.textContent;
    expect(text).toContain("Maven's Chisel of Divination");
    expect(text).toContain('9c');
    expect(text).toContain('4c each');
    expect(text).toContain('3 × 11c each');
    expect(text).toContain('40/40 maps');
    expect(text).toContain('0.8c');
    expect(text).not.toContain('Other costs · not itemized');
  });
  it('never upgrades legacy display prices into copy-code authority or another run', async () => {
    const { s, e } = publishedRun();
    expect(
      await generatePublicStrategySetupCode(s, e, async () => {
        throw Error('must not encode');
      }),
    ).toMatchObject({
      status: 'unavailable',
      reason: 'incomplete_safe_source',
    });
    expect(displayedCosts(s, { ...e, revision: 99 })).toBeNull();
    e.runs[0].observed.map_count = 500;
    expect(displayedCosts(s, e)).toBeNull();
  });
  it('rejects malformed additive observations and cost fields', () => {
    const { e } = publishedRun();
    expect(() => validateResponse(e, 'evidence')).not.toThrow();
    e.runs[0].observed_delirium!.sample_size = 41;
    expect(() => validateResponse(e, 'evidence')).toThrow();
    delete e.runs[0].observed_delirium;
    e.runs[0].display_cost_breakdown!.scarabs = 'bad' as never;
    expect(() => validateResponse(e, 'evidence')).toThrow();
  });
});
