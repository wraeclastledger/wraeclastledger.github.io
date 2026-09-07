// Loopback review service only. Never imported into website product code.
import { createHash } from 'node:crypto';
import { row, detail, evidence, page } from './fixtures.mjs';
export const communityId = (n) =>
  `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;
export const communities = Array.from({ length: 31 }, (_, i) => ({
  id: communityId(i + 1),
  name:
    [
      'WraeclastLedger',
      'Allflame Farmers',
      'Beast Bureau',
      'Mapmakers',
      'Quiet Exiles',
    ][i] ||
    (i === 30
      ? 'Z'.repeat(201)
      : `Community ${String(i + 1).padStart(2, '0')}`),
}));
const origin = (n) => communities[(n - 1) % 5];
const publicRow = (n) => ({
  ...row(n),
  title: `[LOCAL TEST] ${detail(n).title}`,
  league: n % 3 ? 'Allflame' : 'Mirage',
  community: origin(n),
});
const rows = Array.from({ length: 67 }, (_, i) => publicRow(i + 1));
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const rank = (community, home, following) =>
  community.id === home ? 0 : following.includes(community.id) ? 1 : 2;
export function discoveryResponse(url, mode = 'normal') {
  const u = new URL(url, 'http://127.0.0.1'),
    q = u.searchParams;
  const home = q.get('home') || '',
    following = (q.get('following') || '').split(',').filter(Boolean);
  if (
    (home && !uuid.test(home)) ||
    following.length > 200 ||
    following.some((x) => !uuid.test(x)) ||
    (q.get('search') || '').length > 120
  )
    return { status: 400, body: { error: 'invalid' } };
  const unavailable = (c) => mode === 'unavailable' && c.id === communityId(3);
  const visible = rows.filter((r) => !unavailable(r.community));
  const inLeague = (r) =>
    !q.get('league') ||
    r.league.toLowerCase() === q.get('league').toLowerCase();
  const summary = (c) => {
    const selected = visible.filter(
      (r) => r.community.id === c.id && inLeague(r),
    );
    const covered = selected.filter(
      (r) =>
        detail(Number(r.id.slice(-12))).economics.historical_net_divines !==
        null,
    );
    return {
      ...c,
      available: !unavailable(c),
      strategies: selected.length,
      maps: selected.reduce((n, r) => n + r.observed.map_count, 0),
      runs: selected.reduce((n, r) => n + r.evidence.run_count, 0),
      net_divines: covered.length
        ? covered.reduce(
            (n, r) =>
              n +
              detail(Number(r.id.slice(-12))).economics.historical_net_divines,
            0,
          )
        : selected.length
          ? null
          : 0,
      covered: covered.length,
    };
  };
  const bindingQuery = new URLSearchParams(q);
  bindingQuery.delete('cursor');
  bindingQuery.sort();
  const binding = createHash('sha256')
    .update(u.pathname + bindingQuery + mode)
    .digest('hex')
    .slice(0, 24);
  let offset = 0;
  if (q.has('cursor')) {
    const [token, position] = q.get('cursor').split(':');
    if (token !== binding || !/^\d+$/.test(position) || Number(position) > 1000)
      return { status: 409, body: { error: 'cursor_stale' } };
    offset = Number(position);
  }
  const nextCursor = (total) =>
    offset + 25 < total ? `${binding}:${offset + 25}` : null;
  if (u.pathname === '/web/v1/discovery/communities') {
    const term = (q.get('search') || '').trim().toLowerCase();
    const selected = communities
      .filter(
        (c) =>
          (!unavailable(c) || rank(c, home, following) < 2) &&
          (!term || c.name.toLowerCase().includes(term)),
      )
      .sort(
        (a, b) =>
          rank(a, home, following) - rank(b, home, following) ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      );
    return {
      status: 200,
      body: {
        schema_version: 1,
        communities: selected.slice(offset, offset + 25).map(summary),
        total: selected.length,
        next_cursor: nextCursor(selected.length),
      },
    };
  }
  const community = u.pathname.match(
    /^\/web\/v1\/discovery\/communities\/([^/]+)$/,
  );
  if (community) {
    const found = communities.find((c) => c.id === community[1]);
    return found
      ? { status: 200, body: summary(found) }
      : { status: 404, body: { error: 'unavailable' } };
  }
  if (u.pathname === '/web/v1/discovery/strategies') {
    const scope = q.get('scope') || 'all',
      term = (q.get('search') || '').trim().toLowerCase();
    if (!['all', 'feed', 'community'].includes(scope))
      return { status: 400, body: { error: 'invalid' } };
    if (
      scope === 'community' &&
      !communities.some(
        (c) => c.id === q.get('community_id') && !unavailable(c),
      )
    )
      return { status: 404, body: { error: 'unavailable' } };
    let selected = visible.filter(
      (r) =>
        inLeague(r) &&
        (scope === 'community'
          ? r.community.id === q.get('community_id')
          : scope === 'feed'
            ? rank(r.community, home, following) < 2
            : Number(r.id.slice(-12)) % 7 !== 0) &&
        (!term ||
          `${r.title} ${r.tags.join(' ')}`.toLowerCase().includes(term)) &&
        (!q.get('tags') ||
          q
            .get('tags')
            .split(',')
            .some((tag) => r.tags.includes(tag))) &&
        (!q.get('map_type') || r.map_type === q.get('map_type')) &&
        q.get('group') !== 'group',
    );
    const since = { '1d': 1, '3d': 3, '7d': 7, '30d': 30 }[q.get('since')];
    if (since)
      selected = selected.filter(
        (r) =>
          Date.parse(r.updated_at) >=
          Date.parse('2026-09-07T00:00:00Z') - since * 86400000,
      );
    const sort = q.get('sort') || 'activity',
      order = q.get('order') || 'desc';
    const pick = (r) =>
      ({
        activity: r.updated_at,
        title: r.title,
        mod: r.observed.mod_average,
        maps: r.observed.map_count,
        cost_per_map: r.results.all_in_cost_per_map_chaos,
        profit_per_map: r.results.net_per_map_divines,
        score: r.score,
        div_per_hour: r.results.net_divines_per_hour,
      })[sort];
    selected.sort((a, b) => {
      const priority = term
        ? rank(a.community, home, following) -
          rank(b.community, home, following)
        : 0;
      if (priority) return priority;
      const x = pick(a),
        y = pick(b);
      return x == null
        ? y == null
          ? a.id.localeCompare(b.id)
          : 1
        : y == null
          ? -1
          : (typeof x === 'string' ? x.localeCompare(y) : x - y) *
              (order === 'asc' ? 1 : -1) || a.id.localeCompare(b.id);
    });
    return {
      status: 200,
      body: page(selected.slice(offset, offset + 25), {
        total: selected.length,
        sort,
        order,
        next_cursor: nextCursor(selected.length),
      }),
    };
  }
  const strategy = u.pathname.match(
    /^\/web\/v1\/discovery\/strategies\/([^/]+)(\/evidence)?$/,
  );
  if (strategy) {
    const n = rows.findIndex((r) => r.id === strategy[1]) + 1;
    if (!n || unavailable(origin(n)))
      return { status: 404, body: { error: 'unavailable' } };
    return {
      status: 200,
      body: strategy[2]
        ? evidence(n)
        : {
            ...detail(n),
            title: publicRow(n).title,
            league: publicRow(n).league,
            community: origin(n),
          },
    };
  }
  return { status: 404, body: { error: 'unavailable' } };
}
