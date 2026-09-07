import { describe, expect, it } from 'vitest';
import { leagueOptions } from '../lib/league-options';

describe('league choices across filtered result pages', () => {
  it.each([{observed: []}, {observed: ['Allflame']}, {observed: ['Mirage']}])('retains the supported catalogue with observed rows $observed', ({observed}) => {
    expect(leagueOptions(observed, 'Allflame')).toEqual(['Allflame', 'Mirage']);
    expect(leagueOptions(observed, 'Mirage')).toEqual(['Allflame', 'Mirage']);
    expect(leagueOptions(observed, '')).toEqual(['Allflame', 'Mirage']);
  });
  it('retains additional discovered and bookmarked leagues without duplicating options', () => {
    expect(leagueOptions(['Mirage', 'Historical event', 'Mirage', ''], 'Bookmarked event'))
      .toEqual(['Allflame', 'Bookmarked event', 'Historical event', 'Mirage']);
  });
});
