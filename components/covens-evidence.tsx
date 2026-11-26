import type { EvidencePage } from '../lib/model';
import { summarizeCovens } from '../lib/covens-summary';
import { atlasChoiceLabel, covensItemName } from '../lib/covens-labels';
import type { CovensFields } from '../lib/vendor/covens-reader.mjs';

const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const percent = (n: number | null) => n === null ? 'Unknown' : number.format(n) + '%';
const label = (id: string) => id.replace(/^deli-/, '').replaceAll('-', ' ');
function quote(price: NonNullable<CovensFields['orbs']>[number]['price_each']) {
  return price ? number.format(price.amount) + (price.unit === 'divine' ? 'd' : 'c') : 'price unknown';
}
export function CovensEvidence({ evidence }: { evidence: EvidencePage }) {
  const summary = summarizeCovens(evidence.runs);
  if (!summary) return null;
  return <section className="section">
    <h2>Covens map evidence</h2>
    {evidence.next_cursor && <p>Showing {evidence.runs.length} loaded runs.</p>}
    <p>Atlas Drops {percent(summary.atlasDrops)} · More Threads {percent(summary.moreThreads)}</p>
    <p>Confirmed modifiers across {summary.readable} readable maps · {summary.unknown} unknown
      {summary.unknownMapTotals > 0 && ` · map total unknown for ${summary.unknownMapTotals} runs`}</p>
    {summary.readable > 0 && <p>{Object.entries(summary.confirmed).map(([id,count]) =>
      `${label(id)} ${count}/${summary.readable}`).join(' · ')}</p>}
    <p>Recorded orb spend {summary.unknownOrbRuns === 0 ? `${number.format(summary.knownOrbSpend)}c`
      : summary.knownOrbSpend > 0 ? `at least ${number.format(summary.knownOrbSpend)}c` : 'unknown'}
      {summary.unknownOrbRuns > 0 && ` · incomplete price or spend data for ${summary.unknownOrbRuns} ${summary.unknownOrbRuns === 1 ? 'run' : 'runs'}`}</p>
    {evidence.runs.map(({ ordinal, covens }) => covens && <details key={ordinal}>
      <summary>Run {ordinal} setup and spend</summary>
      {covens.threads?.map(t => <p key={t.slot}>Slot {t.slot} · {covensItemName(t.id)} · {t.paid} paid at {quote(t.price_each)} · {t.granted} granted{t.paused && ' · paused'}</p>)}
      {covens.ember && <p>Ember · {covensItemName(covens.ember.id)} · {quote(covens.ember.price_each)}</p>}
      {covens.atlas && <div>Atlas {covens.atlas.version}
        <ul>{covens.atlas.choices.map(c => <li key={c.node}>{atlasChoiceLabel(covens.atlas!.version, c.node, c.option)}</li>)}</ul>
      </div>}
      {covens.orbs?.map(o => <p key={o.id}>{covensItemName(o.id)} · {o.used} used at {quote(o.price_each)}</p>)}
      {covens.delirium && <p>Observed Delirium · {covens.delirium.levels.map(([v,n]) =>
        `${covens.delirium?.resolution === 'bands' && v ? `${v-9}–` : ''}${v}% × ${n}`).concat(
        covens.delirium.rewards.map(([name,n]) => `${name} × ${n}`)).join(' · ')}</p>}
    </details>)}
  </section>;
}
