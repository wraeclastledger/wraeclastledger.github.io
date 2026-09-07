import { KNOWN_LEAGUES } from './model';

export function leagueOptions(observed: string[], selected: string): string[] {
  return [...new Set([...KNOWN_LEAGUES, ...observed, selected].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}
