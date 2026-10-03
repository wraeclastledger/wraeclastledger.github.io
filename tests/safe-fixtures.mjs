// Synthetic v2 variations for UI and loopback review; never production imports.
import * as legacy from './fixtures.mjs';
import { publicStrategySetup } from '../lib/vendor/strategy-setup.js';
export const id = legacy.id;
export const readVersion = '22222222-2222-4222-8222-222222222222';
const identity = { schema_version: 2, scope: 'current', snapshot_key: null, revision: 3, read_version: readVersion };
const attribution = n => n % 3 === 0 ? null : {
  registration_id: id(n), display_name: n % 3 === 2 ? null : `Example Author ${n}`,
  status: n % 3 === 2 ? 'retired' : 'active',
};
const safeLoot = value => value && ({ ...value, version: 1, row_limit: 30,
  csv_positive_chaos: 40, csv_negative_chaos: 0, csv_net_chaos: 40, csv_adjustment_chaos: 0,
  gem_correction_chaos: 0, investment_correction_chaos: 0, reported_return_chaos: 50 });
export const run = (ordinal = 1) => ({ ...legacy.run(ordinal), schema_version: 2,
  display_cost_breakdown: null, observed_delirium: null, loot: null });
export const detail = (n = 1) => {
  const d = legacy.detail(n);
  const { multiplier: _multiplier, ...observed } = d.observed;
  const { history: _history, ...setup } = publicStrategySetup(d, legacy.evidence(n));
  return { ...d, ...identity, attribution: attribution(n), observed,
    economics: { ...d.economics, total_invest_chaos: n === 3 ? null : 400, net_profit_chaos: n === 3 ? null : -100 },
    coverage: { ...d.coverage, timed_net_divines: -1 }, loot: safeLoot(d.loot),
    reusable_setup: { status: 'available', value: setup }, authored_history: null,
    ancillary: { excluded_drops: null, gem_leveling: null, observed_delirium: null },
    continuation_setup: { status: 'unavailable', reason: 'incomplete_seed' },
    lifecycle: { state: 'current', continuation_reason: 'incomplete_seed' } };
};
export const row = n => {
  const r = legacy.row(n), d = detail(n);
  return { ...r, ...identity, attribution: d.attribution, group_play: d.setup.group_play, party_size: d.setup.party_size,
    results: { ...r.results, total_invest_chaos: d.economics.total_invest_chaos, net_profit_chaos: d.economics.net_profit_chaos,
      historical_net_divines: d.economics.historical_net_divines, historical_invest_divines: d.economics.historical_invest_divines } };
};
export const evidence = (n = 1) => ({ schema_version: 2, strategy_id: id(n), revision: 3, read_version: readVersion,
  runs: [run(1), { ...run(2), loot: safeLoot(legacy.loot), cost_breakdown: n === 3 ? null : run(2).cost_breakdown }], next_cursor: null });
export const page = (rows = [row(1)], options = {}) => ({ schema_version: 2, scope: 'current', snapshot_key: null,
  read_version: readVersion, total: rows.length, limit: 25, sort: 'activity', order: 'desc', strategies: rows, next_cursor: null, ...options });
