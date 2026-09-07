import { describe, expect, it, vi } from 'vitest';
import {
  changeRelationship,
  normalizePreferences,
  loadPreferences,
  savePreferences,
  FOLLOW_LIMIT,
} from '../lib/community-preferences';
import { PublicApi, validateResponse } from '../lib/api';
import { validateDiscoveryResponse } from '../lib/discovery';
import { BrowserController } from '../lib/browser-controller';
import { DEFAULT_QUERY } from '../lib/model';
import { parseRoute, routeUrl, type Route } from '../lib/routes';
import {
  communityId as cid,
  discoveryResponse,
} from './community-fixtures.mjs';
const signal = () => new AbortController().signal;
const fetcher = async (url: unknown) => {
  const r = discoveryResponse(String(url));
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
const api = () => new PublicApi('/web/v1', fetcher, 1000, true);

describe('browser community choices', () => {
  it('keeps exactly one Home, protects it from unfollow and retains the previous Home', () => {
    const original = { home: cid(1), following: [cid(2)] };
    expect(changeRelationship(original, cid(1), 'unfollow')).toBe(original);
    const next = changeRelationship(original, cid(2), 'home');
    expect(next).toEqual({ home: cid(2), following: [cid(1)] });
    expect(changeRelationship(next, cid(1), 'unfollow')).toEqual({
      home: cid(2),
      following: [],
    });
    expect(original.following).toEqual([cid(2)]);
  });
  it('bounds follows without silently discarding the old Home at the limit', () => {
    const full = {
      home: cid(1),
      following: Array.from({ length: FOLLOW_LIMIT }, (_, n) => cid(n + 2)),
    };
    expect(() => changeRelationship(full, cid(999), 'follow')).toThrow('200');
    expect(() => changeRelationship(full, cid(999), 'home')).toThrow(
      'previous Home',
    );
    expect(changeRelationship(full, cid(2), 'home').following).toHaveLength(
      200,
    );
  });
  it('repairs malformed choices but retains well-formed IDs even when unavailable', () => {
    expect(
      normalizePreferences({
        home: cid(1),
        following: [cid(1), cid(900), 'bad', cid(900)],
      }),
    ).toEqual({ home: cid(1), following: [cid(900)] });
    expect(loadPreferences({ getItem: () => '{broken' }).warning).toBeTruthy();
    expect(
      loadPreferences({ getItem: () => ' '.repeat(16001) }).warning,
    ).toBeTruthy();
    expect(
      loadPreferences({
        getItem: () => JSON.stringify({ home: cid(1), following: [cid(900)] }),
      }).warning,
    ).toBe('');
  });
  it('round-trips choices and reports storage failures instead of pretending persistence', () => {
    let stored = '';
    const prefs = { home: cid(2), following: [cid(1)] };
    expect(
      savePreferences(
        {
          setItem: (_k, v) => {
            stored = v;
          },
        },
        prefs,
      ),
    ).toBe('');
    expect(loadPreferences({ getItem: () => stored }).preferences).toEqual(
      prefs,
    );
    expect(
      savePreferences(
        {
          setItem: () => {
            throw Error('Quota');
          },
        },
        prefs,
      ),
    ).toContain('tab only');
  });
});
describe('local discovery adapter and service contract', () => {
  it('does not relax the deployed API validator or call a discovery endpoint by default', async () => {
    const body = discoveryResponse('/web/v1/discovery/strategies').body;
    expect(() => validateResponse(body, 'list')).toThrow();
    expect(() => validateDiscoveryResponse(body, 'list')).not.toThrow();
    const fetch = vi.fn();
    const normal = new PublicApi('/web/v1', fetch);
    await expect(
      normal.list({ ...DEFAULT_QUERY, scope: 'feed' }, null, signal()),
    ).rejects.toMatchObject({ kind: 'unavailable' });
    expect(fetch).not.toHaveBeenCalled();
    const bad = structuredClone(body);
    bad.strategies[0].community.owner_id = 'private';
    expect(() => validateDiscoveryResponse(bad, 'list')).toThrow();
  });
  it('includes community-only publications in Feed and their community, but not All Communities', async () => {
    const a = api();
    a.preferences = { home: cid(2), following: [] };
    const all = await a.list({ ...DEFAULT_QUERY, league: '' }, null, signal());
    const feed = await a.list(
      { ...DEFAULT_QUERY, league: '', scope: 'feed' },
      null,
      signal(),
    );
    expect(feed.strategies.every((r) => r.community?.id === cid(2))).toBe(true);
    expect(feed.strategies.some((r) => Number(r.id.slice(-12)) === 7)).toBe(
      true,
    );
    expect(all.strategies.some((r) => Number(r.id.slice(-12)) === 7)).toBe(
      false,
    );
    const selected = await a.list(
      {
        ...DEFAULT_QUERY,
        league: '',
        scope: 'community',
        community_id: cid(2),
      },
      null,
      signal(),
    );
    expect(selected.total).toBe(feed.total);
  });
  it('filters matching search results before relationship ranking and ranks before pagination', async () => {
    const a = api();
    a.preferences = { home: cid(1), following: [cid(2)] };
    const q = { ...DEFAULT_QUERY, league: '', search: 'LOCAL TEST' };
    const first = await a.list(q, null, signal());
    expect(first.strategies[0].community?.id).toBe(cid(1));
    const second = await a.list(q, first.next_cursor, signal());
    const ranks = [...first.strategies, ...second.strategies].map((r) =>
      r.community?.id === cid(1) ? 0 : r.community?.id === cid(2) ? 1 : 2,
    );
    expect(ranks).toEqual(ranks.toSorted((a, b) => a - b));
    const exact = await a.list(
      { ...q, search: 'careful start' },
      null,
      signal(),
    );
    expect(exact.total).toBe(1);
    expect(exact.strategies[0].community?.id).toBe(cid(2));
    a.preferences = { home: cid(3), following: [] };
    await expect(a.list(q, first.next_cursor, signal())).rejects.toMatchObject({
      kind: 'changed',
    });
  });
  it('paginates directory matches and preserves unavailable saved choices', async () => {
    const a = api();
    a.preferences = { home: cid(1), following: [cid(3)] };
    const first = await a.communities('', 'Allflame', null, signal());
    expect(first.communities.slice(0, 2).map((c) => c.id)).toEqual([
      cid(1),
      cid(3),
    ]);
    const second = await a.communities(
      '',
      'Allflame',
      first.next_cursor,
      signal(),
    );
    expect(
      new Set([...first.communities, ...second.communities].map((c) => c.id))
        .size,
    ).toBe(31);
    const only = await a.communities('Mapmakers', '', null, signal());
    expect(only.communities.map((c) => c.id)).toEqual([cid(4)]);
    const unavailable = discoveryResponse(
      `/web/v1/discovery/communities?home=${cid(1)}&following=${cid(3)}`,
      'unavailable',
    ).body;
    expect(
      unavailable.communities.find(
        (c: { id: string; available: boolean }) => c.id === cid(3),
      )?.available,
    ).toBe(false);
    expect(
      (await a.communities('no such community', '', null, signal())).total,
    ).toBe(0);
  });
  it('round-trips feed, scoped community and paged directory routes without carrying preferences in URLs', () => {
    for (const hash of [
      '#/my-feed?league=Mirage',
      `#/community/${cid(2)}?league=`,
      '#/communities?search=Community&pages=2',
    ]) {
      const r = parseRoute(hash);
      expect(parseRoute(routeUrl(r))).toEqual(r);
      expect(routeUrl(r)).not.toContain('following=');
      expect(routeUrl(r)).not.toContain('home=');
    }
    expect(parseRoute('#/community/not-an-id').view).toBe('missing');
  });
  it('clears the previous audience while a changed feed request is pending', async () => {
    const a = api(),
      c = new BrowserController(a);
    a.preferences = { home: cid(1), following: [] };
    const route: Route = {
      view: 'list',
      query: { ...DEFAULT_QUERY, scope: 'feed' },
      pages: 1,
    };
    await c.open(route);
    expect(c.state.page?.total).toBeGreaterThan(0);
    a.preferences = { home: cid(2), following: [] };
    const pending = c.open(route, false);
    expect(c.state.page).toBeNull();
    await pending;
    expect(
      c.state.page?.strategies.every((r) => r.community?.id === cid(2)),
    ).toBe(true);
  });
});
