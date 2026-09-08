import type { EvidencePage, StrategyDetail } from './model';
import { setupItemName } from './artwork';
export function matchingRuns(
  s: StrategyDetail,
  e: EvidencePage | null | undefined,
) {
  return e &&
    e.strategy_id === s.id &&
    e.revision === s.revision &&
    !e.next_cursor &&
    e.runs.length === s.coverage.run_count
    ? e.runs
    : null;
}
export function recordedDivinePrice(
  s: StrategyDetail,
  e: EvidencePage | null | undefined,
): number | null {
  const runs = matchingRuns(s, e);
  if (!runs?.length) return null;
  const price = runs[0].economics.divine_price_chaos;
  return typeof price === 'number' &&
    Number.isFinite(price) &&
    price > 0 &&
    runs.every((r) => r.economics.divine_price_chaos === price)
    ? price
    : null;
}
export function relativeActivity(
  value: string | null,
  now = Date.now(),
): string {
  if (!value) return 'date not recorded';
  const elapsed = Math.max(0, now - Date.parse(value));
  if (!Number.isFinite(elapsed)) return 'date not recorded';
  const mins = Math.floor(elapsed / 60000);
  return mins < 1
    ? 'just now'
    : mins < 60
      ? `${mins}m ago`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ago`
        : `${Math.floor(mins / 1440)}d ago`;
}
export function listedCostRows(s: StrategyDetail) {
  // A current setup price cannot itemize a pool of differently priced runs.
  if (
    s.coverage.run_count !== 1 ||
    !s.setup.scarabs.length ||
    s.economics.all_in_cost_per_map_chaos == null
  )
    return [];
  let scarabs = 0;
  for (const item of s.setup.scarabs) {
    if (
      typeof item === 'string' ||
      item.price_each_chaos == null ||
      item.price_each_chaos < 0
    )
      return [];
    scarabs += item.price_each_chaos;
  }
  const remainder = s.economics.all_in_cost_per_map_chaos - scarabs;
  if (!Number.isFinite(scarabs) || remainder < -0.01) return [];
  return [
    { name: 'Scarabs (listed prices)', value: scarabs },
    { name: 'Other costs · not itemized', value: Math.max(0, remainder) },
  ];
}

// Presentation-only recovery of setup metadata already supplied by a matching
// single immutable run. Copy-code proof continues to use the original DTOs.
export function displayedSetup(
  s: StrategyDetail,
  e: EvidencePage | null | undefined,
) {
  const runs = matchingRuns(s, e);
  if (!runs?.length || runs.reduce((sum, run) => sum + (run.observed.map_count ?? 0), 0) !== s.coverage.map_count) return s.setup;
  const normalize = (value: unknown) => JSON.stringify(value, (_key, item) => typeof item === 'string' ? item.trim().toLowerCase() : item);
  const same = (field: 'astrolabe' | 'delirium' | 'multiplying_modifiers') =>
    runs.every((run) => normalize(run.setup[field]) === normalize(runs[0].setup[field]));
  const run = runs[0];
  return {
    ...s.setup,
    astrolabe: s.setup.astrolabe ?? (same('astrolabe') ? run.setup.astrolabe : null),
    delirium:
      s.setup.delirium ??
      (same('delirium') && run.setup.delirium?.type ? run.setup.delirium : null),
    multiplying_modifiers:
      s.setup.multiplying_modifiers ?? (same('multiplying_modifiers') ? run.setup.multiplying_modifiers : null),
  };
}

export function displayedCosts(
  s: StrategyDetail,
  e: EvidencePage | null | undefined,
) {
  const runs = matchingRuns(s, e);
  const run = runs?.length === 1 ? runs[0] : null;
  if (!run || run.observed.map_count !== s.coverage.map_count) return null;
  return run.cost_breakdown ?? run.display_cost_breakdown ?? null;
}

export function displayedDelirium(
  s: StrategyDetail,
  e: EvidencePage | null | undefined,
) {
  const runs = matchingRuns(s, e),
    run = runs?.length === 1 ? runs[0] : null;
  return run && run.observed.map_count === s.coverage.map_count
    ? (run.observed_delirium ?? null)
    : null;
}

// Itemize only the matching single historical run. No current prices and no
// attribution of one run's setup prices to a differently priced pool.
export function historicalCostRows(
  s: StrategyDetail,
  e: EvidencePage | null | undefined,
) {
  const costs = displayedCosts(s, e),
    setup = displayedSetup(s, e);
  const maps = s.coverage.map_count,
    allIn = s.economics.all_in_cost_per_map_chaos;
  if (!costs || !maps || allIn == null) return listedCostRows(s);
  const rows: Array<{ name: string; value: number }> = [];
  const names = (items: Array<string | { name: string }>) =>
    items
      .map((i) => (typeof i === 'string' ? i : i.name).trim().toLowerCase())
      .sort()
      .join('|');
  let complete = names(costs.scarabs) === names(setup.scarabs);
  const preservation = costs.scarabs.some(
    (i) => i.name.toLowerCase() === 'horned scarab of preservation',
  );
  let scarabs = 0;
  for (const item of costs.scarabs) {
    if (item.price_each_chaos == null) {
      complete = false;
      continue;
    }
    scarabs +=
      item.price_each_chaos /
      (preservation &&
      item.name.toLowerCase() !== 'horned scarab of preservation'
        ? maps
        : 1);
  }
  if (costs.scarabs.length) rows.push({ name: 'Scarabs', value: scarabs });
  if (costs.chisel?.price_each_chaos != null)
    rows.push({
      name: setupItemName('chisel', costs.chisel.name)!,
      value: costs.chisel.price_each_chaos,
    });
  else if (setupItemName('chisel', setup.chisel)) complete = false;
  if (costs.delirium)
    rows.push({
      name: setupItemName('delirium', costs.delirium.type)!,
      value: costs.delirium.count_per_map * costs.delirium.price_each_chaos,
    });
  else if (setup.delirium?.type) complete = false;
  if (costs.astrolabe)
    rows.push({
      name: setupItemName('astrolabe', costs.astrolabe.type)!,
      value: (costs.astrolabe.count * costs.astrolabe.price_each_chaos) / maps,
    });
  else if (setup.astrolabe) complete = false;
  const remainder = allIn - rows.reduce((sum, r) => sum + r.value, 0);
  // Conflicting or impossible prices must not manufacture a negative map cost.
  if (!Number.isFinite(remainder) || remainder < -0.01)
    return listedCostRows(s);
  return [
    {
      name: complete
        ? 'Base map + rolling costs'
        : 'Other costs · not itemized',
      value: Math.max(0, remainder),
    },
    ...rows,
  ];
}
export function mapRequirementTiles(
  observed: StrategyDetail['observed'],
): Array<[string, number]> {
  const entries: Array<[string, number | null | undefined]> = [
    ['Quantity', observed.quantity_average],
    ['Rarity', observed.rarity_average],
    ['Pack size', observed.pack_size_average],
  ];
  if (observed.currency_average != null && observed.currency_average > 0)
    entries.push(['Currency', observed.currency_average]);
  return entries.filter((entry): entry is [string, number] => entry[1] != null);
}

export function displayedMod(average: number | null, mapType: string | null) {
  if (average != null)
    return {
      value: average.toFixed(1),
      title: 'Recorded average modifiers per map.',
    };
  const count = mapType === '8-mod' ? 8 : mapType === '6-mod' ? 6 : null;
  return {
    value: count == null ? '—' : count.toFixed(1),
    title:
      count == null
        ? 'No recorded Mod or 6/8-mod setup.'
        : `Published ${mapType} setup; used when a measured average is unavailable. Observed Mod sorting uses measured averages only.`,
  };
}
