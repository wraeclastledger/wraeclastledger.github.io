import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createReviewServer } from './review-api.mjs';
import { PublicApi } from '../lib/api';
import { DEFAULT_QUERY } from '../lib/model';
import { safeDetail, safeEvidence, safeList } from '../lib/safe-api';
import { detail, evidence, id, page, row } from './safe-fixtures.mjs';

let server: Server, base: string;
const signal = () => new AbortController().signal;
const mode = async (value: string) => {
  const response = await fetch(base + '/control?mode=' + value, { method: 'POST' });
  expect(response.status).toBe(200);
};
const api = (timeout = 3000) => new PublicApi(base + '/web/v2', undefined, timeout, false, true);
beforeEach(async () => {
  server = createReviewServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
it('validates every synthetic v2 detail, byline and exact evidence fixture', () => {
  for (let n = 1; n <= 67; n++) {
    safeList(page([row(n)]));
    safeEvidence(evidence(n), safeDetail(detail(n), id(n)));
  }
});
it('serves v2 pagination, pinned detail/evidence and independent closed v1 totals', async () => {
  const client = api(), first = await client.list({ ...DEFAULT_QUERY, league: '' }, null, signal());
  expect(first.total).toBe(67); expect(first.strategies).toHaveLength(25);
  const second = await client.list({ ...DEFAULT_QUERY, league: '' }, first.next_cursor, signal());
  expect(second.strategies.some(r => first.strategies.some(firstRow => r.id === firstRow.id))).toBe(false);
  const d = await client.detail(id(1), signal());
  expect(await client.evidence(id(1), null, signal(), d)).toMatchObject({read_version:d.read_version, revision:d.revision});
  expect(await new PublicApi(base + '/web/v1').summary('', signal())).toMatchObject({ strategies:67, maps:1340 });
  expect((await fetch(base + '/web/v1/strategies')).status).toBe(404);
  expect((await fetch(base + '/web/v1/strategies/' + id(1))).status).toBe(404);
});
it.each([['delay', 'timeout'], ['hanging', 'timeout'], ['dropped', 'offline'], ['offline', 'temporary'], ['update', 'update_required']])
  ('handles real loopback %s timing and recovers on an explicit retry', async (failure, kind) => {
    await mode(failure);
    await expect(api(80).list(DEFAULT_QUERY, null, signal())).rejects.toMatchObject({kind});
    await mode('normal');
    expect((await api().list({ ...DEFAULT_QUERY, league: '' }, null, signal())).total).toBe(67);
  });
it('distinguishes unavailable history from changed exact-generation evidence', async () => {
  const client = api(), d = await client.detail(id(1), signal());
  await mode('history-unavailable');
  await expect(client.evidence(id(1), null, signal(), d)).rejects.toMatchObject({kind:'temporary'});
  await mode('history-changed');
  await expect(client.evidence(id(1), null, signal(), d)).rejects.toMatchObject({kind:'changed'});
});
