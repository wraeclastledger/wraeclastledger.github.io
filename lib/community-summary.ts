import { ApiError, type PublicApi } from './api';
import { DEFAULT_QUERY, type StrategyRow } from './model';
export interface CommunitySummary {
  strategies: number;
  covered: number;
  net: number;
  maps: number;
  runs: number;
}
// Local home-community preview only. A bounded reader, never a writer or an
// estimate from rounded d/map. Larger catalogues need a server aggregate endpoint.
export async function loadCommunitySummary(
  api: Pick<PublicApi, 'list' | 'detail'>,
  signal: AbortSignal,
  league: string = '',
): Promise<CommunitySummary> {
  const query = { ...DEFAULT_QUERY, league };
  const page = await api.list(query, null, signal);
  signal.throwIfAborted();
  if (page.total > 50) throw new Error('aggregate-needed');
  const rows: StrategyRow[] = [...page.strategies];
  let cursor = page.next_cursor;
  for (let i = 1; cursor && i < 2; i++) {
    const next = await api.list(query, cursor, signal);
    signal.throwIfAborted();
    if (next.total !== page.total) throw new ApiError('changed');
    rows.push(...next.strategies);
    cursor = next.next_cursor;
  }
  if (
    cursor ||
    rows.length !== page.total ||
    new Set(rows.map((s) => s.id)).size !== rows.length
  )
    throw new ApiError('changed');
  const result = {
    strategies: rows.length,
    covered: 0,
    net: 0,
    maps: 0,
    runs: 0,
  };
  let index = 0;
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (index < rows.length) {
        signal.throwIfAborted();
        const row = rows[index++];
        const detail = await api.detail(row.id, signal);
        signal.throwIfAborted();
        if (detail.id !== row.id || detail.updated_at !== row.updated_at)
          throw new ApiError('changed');
        if (detail.economics.historical_net_divines != null) {
          result.net += detail.economics.historical_net_divines;
          result.covered++;
        }
        result.maps += detail.coverage.map_count ?? 0;
        result.runs += detail.coverage.run_count ?? 0;
      }
    }),
  );
  signal.throwIfAborted();
  // Detect admissions/removals/updates while the bounded snapshot was read.
  const final = await api.list(query, null, signal);
  signal.throwIfAborted();
  if (
    final.total !== page.total ||
    JSON.stringify(final.strategies) !== JSON.stringify(page.strategies)
  )
    throw new ApiError('changed');
  return result;
}
