import { describe, it, expect, vi } from 'vitest';
import { PublicApi, ApiError, validateResponse } from '../lib/api';
import { BrowserController } from '../lib/browser-controller';
import { DEFAULT_QUERY } from '../lib/model';
import { parseRoute, routeUrl, type Route } from '../lib/routes';
import { readNavigation } from '../lib/navigation';
import { writeClipboard } from '../lib/copy';
import { artwork } from '../lib/artwork';
import { page, row, detail, evidence, id } from './fixtures.mjs';
const list = (search = ''): Route => ({
  view: 'list',
  query: { ...DEFAULT_QUERY, search },
  pages: 1,
});
const reply = (v: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(v), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (v: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
describe('request ownership', () => {
  it.each(['success', 'failure'] as const)(
    'ignores stale list %s and finally when a newer query is pending',
    async (outcome) => {
      const a = deferred<Response>(),
        b = deferred<Response>();
      const fetcher = vi
        .fn()
        .mockReturnValueOnce(a.promise)
        .mockReturnValueOnce(b.promise);
      const c = new BrowserController(new PublicApi('/web/v1', fetcher));
      const old = c.open(list('old'));
      const current = c.open(list('new'));
      if (outcome === 'success') a.resolve(reply(page([row(1)])));
      else a.reject(Error('late'));
      await old;
      expect(c.state.loading).toBe(true);
      expect(c.state.error).toBeNull();
      expect(c.state.page).toBeNull();
      b.resolve(reply(page([row(2)])));
      await current;
      expect(c.state.page?.strategies[0].id).toBe(id(2));
      expect(c.state.loading).toBe(false);
    },
  );
  it('does not revive a detail or launch evidence after leaving it', async () => {
    const a = deferred<Response>();
    const f = vi.fn().mockReturnValue(a.promise);
    const c = new BrowserController(new PublicApi('/web/v1', f));
    const old = c.open({ view: 'detail', id: id(1) });
    await c.open({ view: 'about' });
    a.resolve(reply(detail()));
    await old;
    expect(f).toHaveBeenCalledTimes(1);
    expect(c.state.detail).toBeNull();
  });
  it('contains late evidence failure after a new detail succeeds', async () => {
    const delayed = deferred<Response>();
    const f = vi
      .fn()
      .mockResolvedValueOnce(reply(detail(1)))
      .mockReturnValueOnce(delayed.promise)
      .mockResolvedValueOnce(reply(detail(2)))
      .mockResolvedValueOnce(reply(evidence(2)));
    const c = new BrowserController(new PublicApi('/web/v1', f));
    const old = c.open({ view: 'detail', id: id(1) });
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    await c.open({ view: 'detail', id: id(2) });
    delayed.reject(Error('old'));
    await old;
    expect(c.state.detail?.id).toBe(id(2));
    expect(c.state.evidenceError).toBeNull();
  });
  it('rejects evidence from a changed revision while keeping the visible detail', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(reply(detail()))
      .mockResolvedValueOnce(reply({ ...evidence(), revision: 4 }));
    const c = new BrowserController(new PublicApi('/web/v1', f));
    await c.open({ view: 'detail', id: id(1) });
    expect(c.state.detail).not.toBeNull();
    expect(c.state.evidence).toBeNull();
    expect(c.state.evidenceError?.kind).toBe('changed');
  });
  it('prevents overlapping pagination and ignores its late response after sorting', async () => {
    const d = deferred<Response>();
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        reply(page([row(1)], { total: 2, next_cursor: 'one' })),
      )
      .mockReturnValueOnce(d.promise)
      .mockResolvedValueOnce(reply(page([row(3)])));
    const c = new BrowserController(new PublicApi('/web/v1', f));
    await c.open(list());
    const more = c.more();
    await c.more();
    expect(f).toHaveBeenCalledTimes(2);
    await c.open(list('new'));
    d.resolve(reply(page([row(2)], { total: 2 })));
    await more;
    expect(c.state.page?.strategies.map((r) => r.id)).toEqual([id(3)]);
    expect(c.state.moreLoading).toBe(false);
  });
  it('restores page depth by replaying bound cursors', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        reply(page([row(1)], { total: 2, next_cursor: 'bound' })),
      )
      .mockResolvedValueOnce(reply(page([row(2)], { total: 2 })));
    const c = new BrowserController(new PublicApi('/web/v1', f));
    await c.open({ ...list('same'), pages: 2 } as Route);
    expect(c.state.pages).toBe(2);
    expect(String(f.mock.calls[1][0])).toContain('cursor=bound');
    expect(c.state.page?.strategies).toHaveLength(2);
  });
  it.each(['duplicate', 'repeated_cursor', 'changed_total'])(
    'rejects %s pagination',
    async (kind) => {
      const next = page([row(kind === 'duplicate' ? 1 : 2)], {
        total: kind === 'changed_total' ? 3 : 2,
        next_cursor: kind === 'repeated_cursor' ? 'one' : null,
      });
      const f = vi
        .fn()
        .mockResolvedValueOnce(
          reply(page([row(1)], { total: 2, next_cursor: 'one' })),
        )
        .mockResolvedValueOnce(reply(next));
      const c = new BrowserController(new PublicApi('/web/v1', f));
      await c.open(list());
      await c.more();
      expect(c.state.error?.kind).toBe('changed');
      expect(c.state.page?.strategies).toHaveLength(1);
    },
  );
});
describe('HTTP and untrusted responses', () => {
  it('calls native fetch without a receiver and omits credentials/referrers', async () => {
    const f = function (this: unknown, _url: unknown, init?: RequestInit) {
      expect(this).toBeUndefined();
      expect(init?.credentials).toBe('omit');
      expect(init?.referrerPolicy).toBe('no-referrer');
      return Promise.resolve(reply(page()));
    };
    await new PublicApi('/web/v1', f).list(
      DEFAULT_QUERY,
      null,
      new AbortController().signal,
    );
  });
  it.each([
    [404, 'unavailable'],
    [409, 'changed'],
    [429, 'rate_limit'],
    [503, 'server'],
  ] as const)('classifies HTTP %s', async (status, kind) => {
    const api = new PublicApi(
      '/web/v1',
      vi.fn().mockResolvedValue(reply({}, status, { 'Retry-After': '2' })),
    );
    await expect(
      api.detail(id(1), new AbortController().signal),
    ).rejects.toMatchObject({ kind });
  });
  it('bounds timeout with native abort semantics', async () => {
    const f = vi.fn(
      (_u, init) =>
        new Promise<Response>((_r, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        ),
    );
    await expect(
      new PublicApi('/web/v1', f, 5).detail(
        id(1),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });
  it('rejects oversized response bodies', async () => {
    const f = vi
      .fn()
      .mockResolvedValue(
        new Response(' '.repeat(2 * 1024 * 1024 + 1), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    await expect(
      new PublicApi('/web/v1', f).detail(id(1), new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid' });
  });
  it.each(['body', 'content-type', 'sort', 'duplicate'] as const)(
    'rejects malformed %s',
    async (kind) => {
      const response =
        kind === 'body'
          ? new Response('{', {
              headers: { 'Content-Type': 'application/json' },
            })
          : kind === 'content-type'
            ? new Response('{}')
            : kind === 'sort'
              ? reply(page([row(1)], { sort: 'title' }))
              : reply(page([row(1), row(1)]));
      await expect(
        new PublicApi('/web/v1', vi.fn().mockResolvedValue(response)).list(
          DEFAULT_QUERY,
          null,
          new AbortController().signal,
        ),
      ).rejects.toBeInstanceOf(ApiError);
    },
  );
  it.each([
    '//evil.test',
    '/\\evil.test',
    'http://evil.test',
    'https://u:p@evil.test',
    'https://evil.test?x=y',
  ])('rejects unsafe API base %s', (base) =>
    expect(() => new PublicApi(base)).toThrow(),
  );
  it.each(['score', 'notes', 'setup', 'coverage', 'loot'])(
    'rejects invalid renderable %s',
    (field) => {
      const d = detail();
      Object.assign(d, { [field]: { unexpected: true } });
      expect(() => validateResponse(d, 'detail')).toThrow();
    },
  );
  it('rejects malformed nested contributed costs', () => {
    const e = evidence();
    e.runs[0].cost_breakdown!.scarabs = 'bad' as never;
    expect(() => validateResponse(e, 'evidence')).toThrow();
  });
  it('accepts nullable metrics and negative/zero evidence', () => {
    expect(() => validateResponse(detail(3), 'detail')).not.toThrow();
    expect(() =>
      validateResponse(page([row(1), row(3), row(5)]), 'list'),
    ).not.toThrow();
  });
});
describe('navigation, artwork and clipboard', () => {
  it('round-trips filtered, sorted pagination and bounds malformed input', () => {
    const r = parseRoute(
      '#/community/home?league=Mirage&search=test&sort=cost_per_map&order=asc&pages=3',
    );
    expect(parseRoute(routeUrl(r))).toEqual(r);
    expect(parseRoute('#http://[')).toEqual({ view: 'missing' });
    expect(parseRoute('#https://evil.test/')).toEqual({ view: 'missing' });
    expect(parseRoute('#/?pages=99999')).toMatchObject({ pages: 10 });
  });
  it('bounds external history values without restoring arbitrary data', () => {
    expect(
      readNavigation({
        marker: 'wl-c1',
        depth: Infinity,
        scroll: -2,
        focus: {},
        backLabel: 'x'.repeat(1000),
        token: 'private',
      }),
    ).toEqual({
      marker: 'wl-c1',
      depth: 0,
      scroll: 0,
      tableScroll: 0,
      disclosures: {},
      focus: '',
      backLabel: 'x'.repeat(80),
    });
  });
  it('only resolves exact artwork identities', () => {
    expect(artwork('Chaos Orb')).toMatch(/^https:\/\/web.poecdn.com\//);
    expect(artwork('chaos')).toBeNull();
    expect(artwork('Unknown authored item')).toBeNull();
  });
  it('reports clipboard denial rather than a false success', async () => {
    expect(
      await writeClipboard('text', () => Promise.reject(Error('denied'))),
    ).toBe(false);
    expect(await writeClipboard('text', () => Promise.resolve())).toBe(true);
  });
});

describe('stable visible results', () => {
  it('retains the last page through repeated sorting and rejects late results', async () => {
    const a = deferred<Response>(),
      b = deferred<Response>();
    const f = vi
      .fn()
      .mockResolvedValueOnce(reply(page([row(1)])))
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const c = new BrowserController(new PublicApi('/web/v1', f));
    await c.open(list());
    const old = c.open(list('old'));
    const latest = c.open(list('latest'));
    expect(c.state.page?.strategies[0].id).toBe(id(1));
    expect(c.state.retainedPage).toBe(true);
    a.resolve(reply(page([row(2)])));
    await old;
    expect(c.state.loading).toBe(true);
    expect(c.state.page?.strategies[0].id).toBe(id(1));
    b.resolve(reply(page([row(3)])));
    await latest;
    expect(c.state.retainedPage).toBe(false);
    expect(c.state.page?.strategies[0].id).toBe(id(3));
  });
  it('retains and labels failed refresh results but never paginates their old cursor', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        reply(page([row(1)], { total: 2, next_cursor: 'old' })),
      )
      .mockRejectedValueOnce(Error('offline'));
    const c = new BrowserController(new PublicApi('/web/v1', f));
    await c.open(list());
    await c.open(list('new'));
    await c.more();
    expect(f).toHaveBeenCalledTimes(2);
    expect(c.state.retainedPage).toBe(true);
    expect(c.state.error).not.toBeNull();
    await c.open({ view: 'about' });
    expect(c.state.page).toBeNull();
    expect(c.state.retainedPage).toBe(false);
  });
  it('round trips multiple mechanics within the server bounds', () => {
    const r = parseRoute('#/?tags=bestiary,harvest,bestiary');
    expect(r).toMatchObject({ query: { tags: 'bestiary,harvest' } });
    expect(parseRoute(routeUrl(r))).toEqual(r);
    expect(parseRoute('#/?tags=bad%20tag,harvest')).toMatchObject({
      query: { tags: 'harvest' },
    });
  });
});
