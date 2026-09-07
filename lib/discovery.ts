import { ApiError, validateResponse } from './api';
import { UUID } from './routes';
import type { Preferences } from './community-preferences';
export interface CommunityRef {
  id: string;
  name: string;
}
export interface Community extends CommunityRef {
  available: boolean;
  strategies: number;
  maps: number;
  runs: number;
  net_divines: number | null;
  covered: number;
}
export interface CommunityPage {
  schema_version: 1;
  communities: Community[];
  total: number;
  next_cursor: string | null;
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const count = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
export function validCommunityRef(value: unknown): value is CommunityRef {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    UUID.test(value.id) &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.length <= 512 &&
    Object.keys(value).every((key) => ['id', 'name'].includes(key))
  );
}
export function validateCommunity(value: unknown): asserts value is Community {
  if (
    !record(value) ||
    !validCommunityRef({ id: value.id, name: value.name }) ||
    typeof value.available !== 'boolean' ||
    !['strategies', 'maps', 'runs', 'covered'].every((k) => count(value[k])) ||
    Number(value.covered) > Number(value.strategies) ||
    !(
      value.net_divines === null ||
      (typeof value.net_divines === 'number' &&
        Number.isFinite(value.net_divines))
    ) ||
    !Object.keys(value).every((k) =>
      [
        'id',
        'name',
        'available',
        'strategies',
        'maps',
        'runs',
        'covered',
        'net_divines',
      ].includes(k),
    )
  )
    throw new ApiError('invalid');
}
export function validateCommunityPage(value: unknown): void {
  if (
    !record(value) ||
    value.schema_version !== 1 ||
    !Array.isArray(value.communities) ||
    value.communities.length > 25 ||
    !count(value.total) ||
    Number(value.total) < value.communities.length ||
    !(
      value.next_cursor === null ||
      (typeof value.next_cursor === 'string' &&
        value.next_cursor.length <= 4096)
    )
  )
    throw new ApiError('invalid');
  value.communities.forEach(validateCommunity);
  if (
    new Set(value.communities.map((c) => c.id)).size !==
    value.communities.length
  )
    throw new ApiError('invalid');
}
// Proposed discovery envelope; existing /web/v1 validation remains unchanged.
// Only the explicit local review adapter accepts public community metadata.
export function validateDiscoveryResponse(
  value: unknown,
  kind: 'list' | 'detail' | 'evidence',
): void {
  if (!record(value)) throw new ApiError('invalid');
  if (kind === 'evidence') return validateResponse(value, kind);
  const strip = (row: unknown) => {
    if (!record(row) || !validCommunityRef(row.community))
      throw new ApiError('invalid');
    return { ...row, community: null };
  };
  validateResponse(
    kind === 'list' && Array.isArray(value.strategies)
      ? { ...value, strategies: value.strategies.map(strip) }
      : strip(value),
    kind,
  );
}
export function preferenceParams(preferences: Preferences): URLSearchParams {
  const p = new URLSearchParams();
  if (preferences.home) p.set('home', preferences.home);
  if (preferences.following.length)
    p.set('following', preferences.following.slice().sort().join(','));
  return p;
}
