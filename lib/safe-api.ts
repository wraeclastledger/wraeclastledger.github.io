import { parseSafeDetail, parseSafeEvidence, parseSafeList, parseSafeCatalogue } from './vendor/safe-reader';
import { validCovens, type CovensFields } from './vendor/covens-reader.mjs';
import type { EvidencePage, ListPage, StrategyDetail, StrategyRow } from './model';
import { isStrategySetupCode, publicStrategySetup, type StrategySetupCode } from './vendor/strategy-setup';

export function safeList(value: unknown, snapshot: string | null = null): ListPage {
  const page = parseSafeList(value);
  if (page.scope !== (snapshot ? 'frozen' : 'current') || page.snapshot_key !== snapshot
    || page.strategies.length > page.limit || page.strategies.length > page.total
    || new Set(page.strategies.map(r => r.id)).size !== page.strategies.length
    || page.strategies.some(r => r.community !== null || r.scope !== page.scope || r.snapshot_key !== snapshot))
    throw Error('Invalid strategy page identity');
  return page as ListPage;
}
export function safeDetail(value: unknown, id: string, snapshot: string | null = null): StrategyDetail {
  let enrichedSetup: StrategySetupCode | undefined;
  if (value && typeof value === 'object' && 'reusable_setup' in value) {
    const setup = value.reusable_setup;
    if (setup && typeof setup === 'object' && 'value' in setup && setup.value &&
      typeof setup.value === 'object' && 'covens' in setup.value) {
      if (!isStrategySetupCode(setup.value) || !('league' in value) || setup.value.league !== value.league)
        throw Error('Invalid Covens setup');
      enrichedSetup = setup.value;
      const { covens: _covens, deliriumOrbTypes: _orbTypes, ...base } = enrichedSetup;
      value = { ...value, reusable_setup: { ...setup, value: base } };
    }
  }
  const detail = parseSafeDetail(value);
  if (detail.id !== id || detail.community !== null || detail.scope !== (snapshot ? 'frozen' : 'current')
    || detail.snapshot_key !== snapshot || detail.lifecycle.state !== detail.scope
    || (snapshot !== null && (detail.continuation_setup.status !== 'unavailable'
      || detail.continuation_setup.reason !== 'frozen' || detail.lifecycle.continuation_reason !== 'frozen')))
    throw Error('Invalid strategy identity');
  if (enrichedSetup && detail.reusable_setup.status === 'available') detail.reusable_setup.value = enrichedSetup;
  return { ...detail, safe: detail } as StrategyDetail;
}
export function safeEvidence(value: unknown, detail: StrategyDetail): EvidencePage {
  const extensions: (CovensFields | null | undefined)[] = [];
  if (value && typeof value === 'object' && 'runs' in value && Array.isArray(value.runs)) {
    if (value.runs.length > 100) throw Error('Invalid evidence page size');
    value = { ...value, runs: value.runs.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('covens' in entry)) {
        extensions.push(undefined);
        return entry;
      }
      const { covens, ...run } = entry;
      const observed = 'observed' in run ? run.observed : null;
      const maps = observed && typeof observed === 'object' && 'map_count' in observed ? observed.map_count : null;
      if (covens !== null && !validCovens(covens, maps)) throw Error('Invalid Covens observations');
      extensions.push(covens);
      return run;
    }) };
  }
  const page = parseSafeEvidence(value);
  if (detail.schema_version !== 2 || (detail.scope !== 'current' && !(detail.scope === 'frozen' && detail.snapshot_key)) || page.strategy_id !== detail.id
    || page.revision !== detail.revision || page.read_version !== detail.read_version
    || page.runs.some((r, i) => i > 0 && r.ordinal <= page.runs[i - 1].ordinal))
    throw Error('Invalid evidence identity');
  return { ...page, runs: page.runs.map((run,i) => extensions[i] === undefined
    ? run : { ...run, covens: extensions[i] }) } as EvidencePage;
}
export function safeCatalogue(value: unknown) {
  const catalogue = parseSafeCatalogue(value);
  if (new Set(catalogue.snapshots.map(s => s.snapshot_key)).size !== catalogue.snapshots.length)
    throw Error('Duplicate snapshot identity');
  return catalogue;
}
/** Public names are display text, not links to an identity directory. */
export const ANONYMOUS_AUTHOR_TOOLTIP = 'No public author name displayed';
export function anonymousAuthor(row: Pick<StrategyRow, 'schema_version' | 'attribution'>): boolean {
  return row.schema_version === 2 && !(row.attribution?.status === 'active' && row.attribution.display_name);
}
export function authorLabel(row: Pick<StrategyRow, 'schema_version' | 'attribution'>): string | null {
  if (row.schema_version !== 2) return null;
  const author = row.attribution;
  if (author?.status === 'active' && author.display_name) return `By ${author.display_name}`;
  return 'By Anonymous';
}

/** Keep the canonical price-free setup; adapt only optional inspection history. */
export function websiteSetup(detail: StrategyDetail, evidence: EvidencePage | null): StrategySetupCode | null {
  if (detail.schema_version === 1) return publicStrategySetup(detail, evidence);
  if (!detail.safe || detail.safe.reusable_setup.status !== 'available') return null;
  const reusable = detail.safe.reusable_setup.value;
  if (evidence && (evidence.strategy_id !== detail.id
    || evidence.revision !== detail.revision || evidence.read_version !== detail.read_version)) return null;
  // The existing history adapter consumes v1 vocabulary. This explicit projection
  // changes no recorded number and never manufactures an evidence run for a snapshot.
  const projected = publicStrategySetup({ ...detail, schema_version: 1 }, evidence && !evidence.next_cursor ? {
    ...evidence, schema_version: 1, runs: evidence.runs.map(r => ({ ...r, schema_version: 1 })),
  } : null);
  if (!projected?.history) return reusable;
  const history = { ...projected.history };
  if (detail.scope === 'frozen') {
    // These are complete-only snapshot totals, never a live evidence lookup.
    history.totalInvest = detail.safe.economics.total_invest_chaos;
    history.netProfit = detail.safe.economics.net_profit_chaos;
    const authored = detail.safe.authored_history;
    history.divinePrice = detail.coverage.run_count === 1
      && authored?.observed.map_count === detail.coverage.map_count
      && authored.economics.divine_price_chaos !== null && authored.economics.divine_price_chaos > 0
      ? authored.economics.divine_price_chaos : null;
  }
  return { ...reusable, history };
}
