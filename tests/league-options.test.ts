import { describe, expect, it, vi } from 'vitest';
import { leagueOptions } from '../lib/league-options';
import { parseRoute } from '../lib/routes';

describe('league choices across filtered result pages', () => {
  it('defaults fresh strategy and community visits to Covens and keeps explicit Allflame and All leagues links', () => {
    for (const route of ['#/', '#/community/home']) {
      expect(parseRoute(route)).toMatchObject({ query: { league: 'Covens' } });
      expect(parseRoute(route + '?league=Allflame')).toMatchObject({ query: { league: 'Allflame' } });
      expect(parseRoute(route + '?league=')).toMatchObject({ query: { league: '' } });
    }
  });
  it.each([{observed: []}, {observed: ['Covens']}, {observed: ['Allflame']}, {observed: ['Mirage']}])('retains the supported catalogue with observed rows $observed', ({observed}) => {
    for (const selected of ['Covens', 'Allflame', 'Mirage', '']) {
      expect(leagueOptions(observed, selected)).toEqual(['Allflame', 'Covens', 'Mirage']);
    }
  });
  it('retains additional discovered and bookmarked leagues without duplicating options', () => {
    expect(leagueOptions(['Mirage', 'Historical event', 'Mirage', ''], 'Bookmarked event'))
      .toEqual(['Allflame', 'Bookmarked event', 'Covens', 'Historical event', 'Mirage']);
  });
  it.each([
    ['', 'Covens', ['Covens', 'Allflame', 'Mirage']],
    [' Event ', 'Event', ['Event', 'Covens', 'Allflame', 'Mirage']],
    ['Allflame', 'Allflame', ['Allflame', 'Covens', 'Mirage']],
  ] as const)('keeps the catalogue when the build-time override is %j', async (override, current, catalogue) => {
    vi.stubEnv('VITE_CURRENT_LEAGUE', override);
    vi.resetModules();
    try {
      const { CURRENT_LEAGUE, DEFAULT_QUERY, KNOWN_LEAGUES } = await import('../lib/model');
      expect(CURRENT_LEAGUE).toBe(current);
      expect(DEFAULT_QUERY.league).toBe(current);
      expect(KNOWN_LEAGUES).toEqual(catalogue);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
