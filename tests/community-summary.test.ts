import { describe, it, expect, vi } from 'vitest';
import { PublicApi } from '../lib/api';
import { loadCommunitySummary } from '../lib/community-summary';

const summary = { strategies: 75, covered: 70, net: -17.125, maps: 1500, runs: 150, map_covered: 75, run_covered: 75 };
const response = (s: unknown = summary) => Response.json({ schema_version: 1, summary: s });
const signal = () => new AbortController().signal;

describe('production community totals', () => {
  it('uses one safe aggregate request beyond the old 50-strategy cap', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response());
    const api = new PublicApi('https://api.wraeclastledger.com/web/v1', fetcher);
    expect(await loadCommunitySummary(api, signal(), 'Mirage')).toEqual(summary);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('https://api.wraeclastledger.com/web/v1/strategies?summary=community&league=Mirage',
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', headers: { Accept: 'application/json' } }));
  });
  it('omits the league filter for All leagues and keeps unknown profit distinct from zero', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({ ...summary, covered: 0, net: null }));
    expect((await new PublicApi('/web/v1', fetcher).summary('', signal())).net).toBeNull();
    expect(fetcher.mock.calls[0][0]).toBe('/web/v1/strategies?summary=community');
    fetcher.mockImplementation(async () => response({ strategies: 0, covered: 0, net: 0, maps: 0, runs: 0, map_covered: 0, run_covered: 0 }));
    expect((await new PublicApi('/web/v1', fetcher).summary('', signal())).net).toBe(0);
  });
  it.each([
    { covered: 76 }, { net: '12' }, { strategies: -1 }, { maps: 1.5 },
    { runs: Number.MAX_SAFE_INTEGER + 1 }, { map_covered: 0 },
    { covered: 0 }, { net: null }, { discord_user_id: 'private' },
  ])('rejects invalid or identifying aggregate payloads: %j', async patch => {
    const api = new PublicApi('/web/v1', async () => response({ ...summary, ...patch }));
    await expect(api.summary('Mirage', signal())).rejects.toMatchObject({ kind: 'invalid' });
  });
  it('does not retry by fetching individual strategies when the endpoint is absent', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({}, { status: 400 }));
    await expect(loadCommunitySummary(new PublicApi('/web/v1', fetcher), signal())).rejects.toMatchObject({ kind: 'server' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects stale completion after the selected league changes', async () => {
    const ctrl = new AbortController();
    const api = { summary: vi.fn(async () => { ctrl.abort(); return summary; }) };
    await expect(loadCommunitySummary(api, ctrl.signal, 'Mirage')).rejects.toThrow();
  });
  it('does not start an already-aborted request or use the isolated discovery service', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response());
    const ctrl = new AbortController(); ctrl.abort();
    await expect(loadCommunitySummary(new PublicApi('/web/v1', fetcher), ctrl.signal)).rejects.toThrow();
    await expect(new PublicApi('/web/v1', fetcher, 15000, true).summary('', signal())).rejects.toMatchObject({ kind: 'unavailable' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
