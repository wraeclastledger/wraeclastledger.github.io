import { ApiError, type PublicApi } from './api';
import type { EvidencePage, StrategyDetail } from './model';

/** Complete one revision before copying; never turn a partial pool into a setup. */
export async function setupEvidence(api: Pick<PublicApi, 'evidence'>, detail: StrategyDetail,
  initial: EvidencePage | null, signal: AbortSignal): Promise<EvidencePage> {
  let page = initial ?? await api.evidence(detail.id, null, signal);
  const runs: EvidencePage['runs'] = [];
  const cursors = new Set<string>();
  const ordinals = new Set<number>();
  for (;;) {
    if (signal.aborted) throw new ApiError('unavailable');
    if (page.strategy_id !== detail.id || page.revision !== detail.revision) throw new ApiError('changed');
    for (const run of page.runs) {
      if (ordinals.has(run.ordinal)) throw new ApiError('changed');
      ordinals.add(run.ordinal); runs.push(run);
    }
    if (runs.length > 100) throw new ApiError('invalid');
    if (!page.next_cursor) break;
    if (cursors.has(page.next_cursor) || cursors.size >= 100) throw new ApiError('invalid');
    cursors.add(page.next_cursor);
    page = await api.evidence(detail.id, page.next_cursor, signal);
  }
  if (detail.coverage.run_count != null && runs.length !== detail.coverage.run_count) throw new ApiError('changed');
  return { ...page, runs, next_cursor: null };
}
