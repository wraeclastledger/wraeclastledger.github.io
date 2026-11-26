import { expect, it } from 'vitest';
import { summarizeCovens } from '../lib/covens-summary';
import type { EvidenceRun } from '../lib/model';
import type { CovensFields } from '../lib/vendor/covens-reader.mjs';

const fields: CovensFields = { version: 1, atlas_drops: null, more_threads: null, threads: null, orbs: [],
  atlas: null, ember: null, delirium: null, encounters: null };
function run(maps: number, covens?: CovensFields) {
  return { observed: { map_count: maps }, economics: { divine_price_chaos: 200 }, covens } as EvidenceRun;
}
it('weights observations, keeps unknown maps separate and uses each run’s own prices', () => {
  const confirmed = { mirage: 7, sentinel: 3, beyond: 0, wildwood: 0, delirium: 0 };
  const summary = summarizeCovens([run(40, { ...fields, atlas_drops: { sum: 80, count: 1 },
    encounters: { readable: 40, unknown: 0, confirmed },
    orbs: [{ id: 'deli-threaded', used: 2, price_each: { unit: 'divine', amount: 0.5 } }] }),
    run(4, { ...fields, atlas_drops: { sum: 120, count: 3 }, more_threads: { sum: 0, count: 1 } }), run(6)]);
  expect(summary).toMatchObject({ atlasDrops: 50, moreThreads: 0, readable: 40, unknown: 10,
    confirmed, knownOrbSpend: 200, unknownOrbRuns: 1 });
  expect(summarizeCovens([run(1)])).toBeNull();
});
