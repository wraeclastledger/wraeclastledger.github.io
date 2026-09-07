export type Metric = number | null;
export interface Observed {
  map_count: Metric;
  mod_average: Metric;
  mod_sample_size: Metric;
  quantity_average?: Metric;
  rarity_average?: Metric;
  pack_size_average?: Metric;
  currency_average?: Metric;
  multiplier?: Metric;
  multiplier_average?: Metric;
}
export interface Economics {
  recurring_cost_per_map_chaos: Metric;
  total_invest_chaos: Metric;
  net_profit_chaos: Metric;
  net_per_map_divines: Metric;
  divine_price_chaos: Metric;
}
export interface StrategyEconomics {
  all_in_cost_per_map_chaos: Metric;
  recurring_cost_per_map_chaos: Metric;
  net_per_map_divines: Metric;
  historical_net_divines: Metric;
  historical_invest_divines: Metric;
}
export interface Price {
  name: string;
  price_each_chaos: Metric;
}
export interface Setup {
  map_type: string | null;
  group_play: boolean | null;
  party_size: Metric;
  chisel: string | null;
  scarabs: Price[] | string[];
  delirium: { type: string | null; count_per_map: Metric } | null;
  astrolabe: string | null;
  multiplying_modifiers: {
    allocated: boolean | null;
    fragment_count: Metric;
  } | null;
  atlas?: { url: string | null; points: Metric; points_max: Metric };
  run_regex?: string | null;
  slam_regex?: string | null;
  game_data: { revision: Metric; patch_version: string | null };
}
export interface LootRow {
  name: string;
  category: string;
  source: string;
  quantity: number;
  value_chaos: number;
  note: string | null;
  valuation: {
    baseline_quantity: number;
    current_quantity: number;
    baseline_value_chaos: number;
    current_value_chaos: number;
  } | null;
  identity: {
    kind: string;
    base?: string | null;
    chart?: string | null;
    member?: string;
    quality?: number;
    memory_strands?: Metric;
  } | null;
}
export interface Loot {
  rows: LootRow[];
  categories: { category: string; value_chaos: number }[];
  has_baseline: boolean;
  manual_total_chaos: Metric;
  inventory_flow_chaos: Metric;
  market_revaluation_chaos: Metric;
  omitted_csv_rows: Metric;
  omitted_csv_value_chaos: Metric;
  omitted_manual_rows: Metric;
  omitted_manual_value_chaos: Metric;
}
export interface StrategyRow {
  schema_version: 1;
  id: string;
  title: string | null;
  tags: string[];
  league: string | null;
  community: { id: string; name: string } | null;
  attribution: null;
  published_at: string | null;
  updated_at: string | null;
  score: Metric;
  map_type: string | null;
  observed: Observed;
  results: {
    all_in_cost_per_map_chaos: Metric;
    net_per_map_divines: Metric;
    net_divines_per_hour: Metric;
  };
  evidence: {
    run_count: Metric;
    timed_run_count: Metric;
    timed_map_count: Metric;
  };
}
export interface StrategyDetail extends Omit<
  StrategyRow,
  'results' | 'map_type' | 'evidence'
> {
  revision: Metric;
  notes: string | null;
  setup: Setup;
  economics: StrategyEconomics;
  coverage: {
    run_count: Metric;
    map_count: Metric;
    timed_run_count: Metric;
    timed_map_count: Metric;
    timed_minutes: Metric;
    net_divines_per_hour: Metric;
    loot_available: boolean;
  };
  loot: Loot | null;
}
export interface EvidenceRun {
  schema_version: 1;
  ordinal: number;
  contributed_on: string | null;
  setup: Setup;
  observed: Observed;
  economics: Economics;
  timing: { reported_minutes: Metric };
  /** Legacy authored prices for display only, never setup-code proof. */
  display_cost_breakdown?: EvidenceRun['cost_breakdown'];
  observed_delirium?: {
    sample_size: number;
    levels: Array<{ percentage: number; count: number }>;
    rewards: Array<{ name: string; count: number }>;
  } | null;
  cost_breakdown: {
    chisel: Price | null;
    scarabs: Price[];
    delirium: {
      type: string;
      count_per_map: number;
      price_each_chaos: number;
    } | null;
    astrolabe: { type: string; count: number; price_each_chaos: number } | null;
  } | null;
  loot: Loot | null;
}
export interface ListPage {
  schema_version: 1;
  total: number;
  limit: number;
  sort: SortKey;
  order: 'asc' | 'desc';
  strategies: StrategyRow[];
  next_cursor: string | null;
}
export interface EvidencePage {
  schema_version: 1;
  strategy_id: string;
  revision: number;
  runs: EvidenceRun[];
  next_cursor: string | null;
}
export const SORTS = {
  activity: 'Latest activity',
  title: 'Strategy name',
  mod: 'Observed Mod',
  maps: 'Maps',
  cost_per_map: 'Cost / map',
  profit_per_map: 'Profit / map',
  score: 'Score',
  div_per_hour: 'Div / hr',
} as const;
export type SortKey = keyof typeof SORTS;
export const defaultOrder = (sort: SortKey): 'asc' | 'desc' =>
  sort === 'title' || sort === 'cost_per_map' ? 'asc' : 'desc';
export interface Query {
  scope?: 'all' | 'feed' | 'community';
  community_id?: string;
  search: string;
  league: string;
  map_type: string;
  tags: string;
  group: string;
  since: string;
  sort: SortKey;
  order: 'asc' | 'desc';
}
// Release configuration: keep aligned with the desktop current-league fallback.
export const CURRENT_LEAGUE =
  import.meta.env.VITE_CURRENT_LEAGUE?.trim() || 'Allflame';
// Supported catalogue, independent of filtered/paginated strategy results.
// Retain historical entries when adding a new league at rollover.
export const KNOWN_LEAGUES = [...new Set([CURRENT_LEAGUE, 'Allflame', 'Mirage'])];
export const DEFAULT_QUERY: Query = {
  search: '',
  league: CURRENT_LEAGUE,
  map_type: '',
  tags: '',
  group: 'all',
  since: 'all',
  sort: 'activity',
  order: 'desc',
};
export const number = (value: Metric | undefined, digits = 1) =>
  value == null
    ? '—'
    : value.toLocaleString('en-US', { maximumFractionDigits: digits });
export const money = (value: Metric | undefined, unit = 'c') =>
  value == null ? '—' : `${number(value, unit === 'd' ? 3 : 1)}${unit}`;
export const signedClass = (value: Metric | undefined) =>
  value == null || value === 0 ? '' : value < 0 ? 'negative' : 'positive';
export const label = (value: string | null | undefined) =>
  value ? value.replaceAll('_', ' ').replaceAll('-', ' ') : 'Not recorded';
