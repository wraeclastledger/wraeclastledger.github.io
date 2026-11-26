// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CovensEvidence } from '../components/covens-evidence';
import PrototypeDetail from '../components/prototype-detail';
import catalogue from '../lib/vendor/covens-catalogue.json';
import { atlasChoiceLabel, covensItemName } from '../lib/covens-labels';
import { historicalCostRows } from '../lib/presentation';
import type { EvidencePage, StrategyDetail } from '../lib/model';
import type { CovensFields } from '../lib/vendor/covens-reader.mjs';
import { detail, evidence } from './fixtures.mjs';

function single() {
  const s = detail() as StrategyDetail;
  const e = evidence() as EvidencePage;
  e.runs = e.runs.slice(0, 1);
  const r = e.runs[0];
  s.league = 'Covens';
  s.coverage.run_count = 1;
  s.coverage.map_count = r.observed.map_count = 6;
  s.economics.all_in_cost_per_map_chaos = 14;
  s.setup = { ...s.setup, chisel: null, scarabs: [], astrolabe: null, delirium: null };
  r.setup = { ...r.setup, chisel: null, scarabs: [], astrolabe: null, delirium: null };
  r.cost_breakdown = { scarabs: [], chisel: null, delirium: null, astrolabe: null };
  const covens: CovensFields = { version: 1, atlas_drops: null, more_threads: null,
    atlas: null, delirium: null, encounters: null, orbs: [], threads: [
      { slot: 1, id: 'bestiary-thread', paid: 1, granted: 2, paused: false, price_each: { amount: 10, unit: 'chaos' } },
      { slot: 2, id: 'ritual-thread', paid: 3, granted: 0, paused: true, price_each: { amount: 8, unit: 'chaos' } },
    ], ember: { id: 'allflame-ember-of-flesh', price_each: { amount: 0.04, unit: 'divine' } } };
  r.covens = covens;
  return { s, e, r, covens };
}
const rendered = (view: React.ReactNode) => {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(view);
  return host.textContent;
};
it('itemizes a matching run’s Thread quotes and Ember without billing grants or paused slots', () => {
  const { s, e, r } = single();
  for (const legacy of [r.cost_breakdown, null]) {
    r.cost_breakdown = legacy;
    const text = rendered(<PrototypeDetail strategy={s} evidence={e} onCopy={() => {}} copyBusy={false} />);
    expect(text).toContain('Bestiary Thread');
    expect(text).toContain('10c/map before Atlas savings');
    expect(text).toContain('Allflame Ember of Flesh');
    expect(text).not.toContain('24c/map');
    expect(text).not.toContain('No item setup recorded');
    const rows = historicalCostRows(s, e);
    expect(rows).toContainEqual({ name: 'Allflame Ember of Flesh', value: 4 });
    expect(rows.some(row => row.name === 'Base map + rolling costs')).toBe(false);
    expect(rows.reduce((total, row) => total + row.value, 0)).toBe(14);
  }
  expect(historicalCostRows(s, { ...e, revision: 999 })).toEqual([]);
});
it.each([
  [{ unit: 'divine', amount: 0.04 }, '0.04d each'],
  [{ unit: 'chaos', amount: 0 }, '0c each'],
  [null, 'Price unknown'],
] as const)('shows the authored Ember quote beside the setup item', (quote, expected) => {
  const { s, e, covens, r } = single();
  covens.ember!.price_each = quote;
  r.economics.divine_price_chaos = null;
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(<PrototypeDetail strategy={s} evidence={e} onCopy={() => {}} copyBusy={false} />);
  const row = [...host.querySelectorAll('.wl-setup-pane:first-child .wl-setup-line')]
    .find(item => item.querySelector('span')?.textContent === 'Allflame Ember of Flesh');
  expect(row?.querySelector('strong')?.textContent).toBe(expected);
});
it('distinguishes partial, missing and zero spend, using each run’s Divine rate', () => {
  const { e, r, covens } = single();
  covens.orbs = [{ id: 'deli-threaded', used: 5, price_each: { unit: 'chaos', amount: 2 } },
    { id: 'deli-fine', used: 1, price_each: null }];
  const text = () => rendered(<CovensEvidence evidence={e} />);
  expect(text()).toContain('Recorded orb spend at least 10c');
  expect(text()).toContain('Fine Delirium Orb · 1 used at price unknown');
  e.runs.push({ ...r, ordinal: 2, economics: { ...r.economics, divine_price_chaos: 150 },
    covens: { ...covens, orbs: [{ id: 'deli-fine', used: 2, price_each: { unit: 'divine', amount: 1 } }] } });
  expect(text()).toContain('at least 310c');
  e.runs.pop();
  r.economics.divine_price_chaos = null;
  covens.orbs = [{ id: 'deli-fine', used: 1, price_each: { unit: 'divine', amount: 1 } }];
  expect(text()).toContain('Recorded orb spend unknown');
  covens.orbs = null;
  expect(text()).toContain('Recorded orb spend unknown');
  covens.orbs = [];
  expect(text()).toContain('Recorded orb spend 0c');
});
it('keeps the quoted Thread amount separate when the recorded all-in reflects savings', () => {
  const { s, e, covens } = single();
  s.economics.all_in_cost_per_map_chaos = 11;
  const rows = historicalCostRows(s, e);
  expect(rows).toEqual([
    { name: 'Threads and other unitemized costs', value: 7 },
    { name: 'Allflame Ember of Flesh', value: 4 },
  ]);
  covens.threads![0].paid = 0;
  covens.threads![0].price_each = null;
  covens.ember!.price_each = null;
  expect(historicalCostRows(s, e)).toEqual([{ name: 'Other costs · not itemized', value: 11 }]);
  expect(rendered(<PrototypeDetail strategy={s} evidence={e} onCopy={() => {}} copyBusy={false} />)).toContain('0c/map');
});
it('covers the complete versioned catalogue and does not reuse labels from a different tree', () => {
  for (const id of [...catalogue.threads, ...catalogue.embers, ...catalogue.orbs]) {
    expect(covensItemName(id)).toMatch(/^[A-Z]/);
  }
  for (const [node, options] of Object.entries(catalogue.choices)) {
    for (const option of options) {
      expect(atlasChoiceLabel(catalogue.tree, Number(node), option)).not.toContain('Unknown');
    }
  }
  expect(atlasChoiceLabel('other-tree', 712, 50999)).toContain('Unknown Atlas node');
});
it('labels the Atlas node and its option, including missing and unfamiliar selections', () => {
  const { e, covens } = single();
  covens.atlas = { version: '3.30.0-atlas', choices: [
    { node: 712, option: 50999 }, { node: 12887, option: null }, { node: 9876, option: 54321 },
  ] };
  const text = rendered(<CovensEvidence evidence={e} />);
  expect(text).toContain('Outside Entities');
  expect(text).toContain('Buried Sentinel');
  expect(text).toContain('Blended Realities → Selection unknown');
  expect(text).toContain('Unknown Atlas node (9876) → Unknown option (54321)');
});
