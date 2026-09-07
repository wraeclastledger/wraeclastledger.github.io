import { DEFAULT_QUERY, SORTS, defaultOrder, type Query } from './model';
export type Route =
  | { view: 'list' | 'community' | 'directory'; query: Query; pages: number }
  | { view: 'detail'; id: string }
  | { view: 'about' }
  | { view: 'privacy' }
  | { view: 'missing' };
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseRoute(hash: string): Route {
  let url: URL;
  try {
    url = new URL(hash.replace(/^#/, '') || '/', 'https://local.invalid');
  } catch {
    return { view: 'missing' };
  }
  if (url.origin !== 'https://local.invalid') return { view: 'missing' };
  if (url.pathname.startsWith('/strategy/')) {
    const id = url.pathname.slice(10);
    return UUID.test(id)
      ? { view: 'detail', id: id.toLowerCase() }
      : { view: 'missing' };
  }
  if (url.pathname === '/about' || url.pathname === '/privacy')
    return { view: url.pathname.slice(1) as 'about' | 'privacy' };
  const communityId = url.pathname.startsWith('/community/') ? url.pathname.slice(11) : '';
  if (!['/', '/community/home', '/my-feed', '/communities'].includes(url.pathname) && !UUID.test(communityId))
    return { view: 'missing' };
  const q = { ...DEFAULT_QUERY };
  if (url.pathname === '/my-feed') q.scope = 'feed';
  if (UUID.test(communityId)) { q.scope = 'community'; q.community_id = communityId.toLowerCase(); }
  for (const [name, max] of [
    ['search', 120],
    ['league', 80],
    ['map_type', 32],
  ] as const)
    q[name] = (url.searchParams.get(name) ?? q[name]).slice(0, max).trim();
  q.tags = [
    ...new Set(
      (url.searchParams.get('tags') || '')
        .split(',')
        .slice(0, 24)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => /^[a-z0-9][a-z0-9-]{0,47}$/.test(t)),
    ),
  ].join(',');
  for (const name of ['map_type'] as const)
    if (q[name] && !/^[a-z0-9][a-z0-9-]*$/.test(q[name])) q[name] = '';
  q.sort = Object.hasOwn(SORTS, url.searchParams.get('sort') || '')
    ? (url.searchParams.get('sort') as Query['sort'])
    : 'activity';
  q.order =
    url.searchParams.get('order') === 'asc'
      ? 'asc'
      : url.searchParams.get('order') === 'desc'
        ? 'desc'
        : defaultOrder(q.sort);
  q.group = ['solo', 'group'].includes(url.searchParams.get('group') || '')
    ? url.searchParams.get('group')!
    : 'all';
  q.since = ['1d', '3d', '7d', '30d'].includes(
    url.searchParams.get('since') || '',
  )
    ? url.searchParams.get('since')!
    : 'all';
  return {
    view: url.pathname === '/communities' ? 'directory' : url.pathname.startsWith('/community/') ? 'community' : 'list',
    query: q,
    pages: Math.min(
      10,
      Math.max(1, Math.floor(Number(url.searchParams.get('pages')) || 1)),
    ),
  };
}
export function queryParams(query: Query): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value) p.set(key, value);
  return p;
}
export function routeUrl(route: Route): string {
  if (route.view === 'detail') return '#/strategy/' + route.id;
  if (route.view === 'about' || route.view === 'privacy')
    return '#/' + route.view;
  if (route.view === 'missing') return '#/unavailable';
  const p = queryParams(route.query);
  p.delete('scope');
  p.delete('community_id');
  // An explicit empty league means All leagues; an absent choice means current.
  p.set("league", route.query.league);
  if (route.pages > 1) p.set('pages', String(route.pages));
  return (
    '#' +
    (route.view === 'directory' ? '/communities' : route.view === 'community' ? '/community/' + (route.query.community_id || 'home') : route.query.scope === 'feed' ? '/my-feed' : '/') +
    '?' +
    p.toString()
  );
}
export const routeLabel = (route: Route) =>
  route.view === 'community'
    ? route.query.community_id ? 'community' : 'WraeclastLedger community'
    : route.view === 'list'
      ? route.query.scope === 'feed' ? 'My Feed' : 'strategies'
      : route.view === 'detail'
        ? 'strategy'
        : route.view;
