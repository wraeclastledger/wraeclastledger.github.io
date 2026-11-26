import type { EvidenceRun } from './model';
import { orbSpend } from './vendor/covens-reader.mjs';

export function summarizeCovens(runs: EvidenceRun[]) {
  if (!runs.some(run => run.covens)) return null;
  function average(key: 'atlas_drops' | 'more_threads') {
    let sum = 0, count = 0;
    for (const run of runs) {
      const metric = run.covens?.[key];
      if (metric) { sum += metric.sum; count += metric.count; }
    }
    return count ? sum / count : null;
  }
  let readable = 0, unknown = 0, unknownMapTotals = 0, knownOrbSpend = 0, unknownOrbRuns = 0;
  const confirmed = { mirage: 0, beyond: 0, sentinel: 0, wildwood: 0, delirium: 0 };
  for (const run of runs) {
    const observations = run.covens?.encounters;
    if (observations) {
      readable += observations.readable;
      unknown += observations.unknown;
      for (const family of Object.keys(confirmed) as (keyof typeof confirmed)[])
        confirmed[family] += observations.confirmed[family];
    } else if (run.observed.map_count !== null) unknown += run.observed.map_count;
    else unknownMapTotals++;
    const orbs = run.covens?.orbs;
    let missingPrice = orbs == null;
    for (const orb of orbs ?? []) {
      const spend = orbSpend([orb], run.economics.divine_price_chaos);
      if (spend === null) missingPrice = true;
      else knownOrbSpend += spend;
    }
    if (missingPrice) unknownOrbRuns++;
  }
  return { atlasDrops: average('atlas_drops'), moreThreads: average('more_threads'), readable, unknown,
    unknownMapTotals, confirmed, knownOrbSpend, unknownOrbRuns };
}
