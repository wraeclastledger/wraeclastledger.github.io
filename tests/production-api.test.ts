import { describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { PublicApi } from '../lib/api';
import { DEFAULT_QUERY } from '../lib/model';
import { PAGES_API_URL, PAGES_SUMMARY_API_URL } from '../scripts/build-policy.mjs';
import { page, detail, evidence, id } from './safe-fixtures.mjs';

describe('website API transport', () => {
  it('uses the exact base for all three reads without credentials or redirects', async () => {
    const fetcher = vi.fn();
    for (const body of [page(), detail(), evidence()]) fetcher.mockResolvedValueOnce(new Response(JSON.stringify(body), {headers:{'Content-Type':'application/json'}}));
    const api = new PublicApi(PAGES_API_URL, fetcher, 15000, false, true);
    const signal = new AbortController().signal;
    await api.list(DEFAULT_QUERY, null, signal);
    const d = await api.detail(id(1), signal);
    await api.evidence(id(1), null, signal, d);
    expect(fetcher.mock.calls.map(call => String(call[0]).split('?')[0])).toEqual([
      PAGES_API_URL + '/strategies', PAGES_API_URL + '/strategies/' + id(1), PAGES_API_URL + '/strategies/' + id(1) + '/evidence',
    ]);
    for (const [, options] of fetcher.mock.calls) expect(options).toMatchObject({cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer', redirect:'error', headers:{Accept:'application/json'}});
    const summary = { strategies: 0, covered: 0, net: 0, maps: 0, runs: 0, map_covered: 0, run_covered: 0 };
    fetcher.mockResolvedValueOnce(Response.json({schema_version:1, summary}));
    expect(await new PublicApi(PAGES_SUMMARY_API_URL, fetcher).summary('', signal)).toEqual(summary);
    expect(String(fetcher.mock.calls[3][0])).toBe(PAGES_SUMMARY_API_URL + '/strategies?summary=community');
  });
  it.each([[404, 'unavailable'], [409, 'changed'], [410, 'update_required'], [503, 'temporary']] as const)
    ('never falls back to legacy reads after HTTP %i', async (status, kind) => {
      const fetcher = vi.fn<typeof fetch>(async () => Response.json({error:'unavailable'}, {status}));
      const api = new PublicApi(PAGES_API_URL, fetcher, 15000, false, true);
      await expect(api.list(DEFAULT_QUERY, null, new AbortController().signal)).rejects.toMatchObject({kind});
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/api\.wraeclastledger\.com\/web\/v2\//);
    });
  it('does not follow a real HTTP redirect away from the configured read route', async () => {
    let redirected = false;
    const server = http.createServer((req, res) => {
      if (req.url === '/unexpected') { redirected = true; res.end('{}'); }
      else { res.writeHead(302, {Location:'/unexpected'}); res.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address() as import('node:net').AddressInfo;
      const api = new PublicApi(`http://127.0.0.1:${address.port}/web/v2`, undefined, 15000, false, true);
      await expect(api.detail(id(1), new AbortController().signal)).rejects.toMatchObject({kind:'offline'});
      expect(redirected).toBe(false);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
  });
});
