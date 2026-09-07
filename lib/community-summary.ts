import type { PublicApi } from './api';

export interface CommunitySummary {
  strategies: number;
  covered: number;
  net: number | null;
  maps: number;
  runs: number;
  map_covered: number;
  run_covered: number;
}

// One bounded response from the server's single-snapshot aggregate. Never fan
// out to detail records or turn unavailable history into a zero total.
export async function loadCommunitySummary(
  api: Pick<PublicApi, 'summary'>,
  signal: AbortSignal,
  league: string = '',
): Promise<CommunitySummary> {
  signal.throwIfAborted();
  const summary = await api.summary(league, signal);
  signal.throwIfAborted();
  return summary;
}
