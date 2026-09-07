import { describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { PublicApi } from '../lib/api';
import { DEFAULT_QUERY } from '../lib/model';
import { PAGES_API_URL } from '../scripts/build-policy.mjs';
import { page, detail, evidence, id } from './fixtures.mjs';

describe('website API transport', () => {
  it('uses the exact base for all three reads without credentials or redirects', async () => {
    const fetcher = vi.fn();
    for (const body of [page(), detail(), evidence()]) fetcher.mockResolvedValueOnce(new Response(JSON.stringify(body), {headers:{'Content-Type':'application/json'}}));
    const api = new PublicApi(PAGES_API_URL, fetcher);
    const signal = new AbortController().signal;
    await api.list(DEFAULT_QUERY, null, signal);
    await api.detail(id(1), signal);
    await api.evidence(id(1), null, signal);
    expect(fetcher.mock.calls.map(call => String(call[0]).split('?')[0])).toEqual([
      PAGES_API_URL + '/strategies', PAGES_API_URL + '/strategies/' + id(1), PAGES_API_URL + '/strategies/' + id(1) + '/evidence',
    ]);
    for (const [, options] of fetcher.mock.calls) expect(options).toMatchObject({credentials:'omit', referrerPolicy:'no-referrer', redirect:'error', headers:{Accept:'application/json'}});
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
      const api = new PublicApi(`http://127.0.0.1:${address.port}/web/v1`);
      await expect(api.detail(id(1), new AbortController().signal)).rejects.toMatchObject({kind:'offline'});
      expect(redirected).toBe(false);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
  });
});
