const ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const FOLLOW_LIMIT = 200;
export const preferenceKey = 'wraeclastledger-web-community-review-v1';
export interface Preferences {
  home: string | null;
  following: string[];
}
export const emptyPreferences = (): Preferences => ({
  home: null,
  following: [],
});
export function normalizePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return emptyPreferences();
  const raw = value as Record<string, unknown>;
  const home =
    typeof raw.home === 'string' && ID.test(raw.home)
      ? raw.home.toLowerCase()
      : null;
  const following = Array.isArray(raw.following)
    ? [
        ...new Set(
          raw.following
            .filter((id): id is string => typeof id === 'string' && ID.test(id))
            .map((id) => id.toLowerCase()),
        ),
      ]
        .filter((id) => id !== home)
        .slice(0, FOLLOW_LIMIT)
    : [];
  return { home, following };
}
export function changeRelationship(
  prefs: Preferences,
  id: string,
  action: 'follow' | 'unfollow' | 'home',
): Preferences {
  if (!ID.test(id)) throw Error('Invalid community');
  id = id.toLowerCase();
  if (id === prefs.home) return prefs;
  if (action === 'unfollow')
    return { ...prefs, following: prefs.following.filter((x) => x !== id) };
  if (action === 'follow') {
    if (prefs.following.includes(id)) return prefs;
    if (prefs.following.length >= FOLLOW_LIMIT)
      throw Error('You can follow up to 200 communities. Unfollow one first.');
    return { ...prefs, following: [...prefs.following, id] };
  }
  const following = prefs.following.filter((x) => x !== id);
  if (prefs.home) {
    if (following.length >= FOLLOW_LIMIT)
      throw Error(
        'Unfollow one community before changing Home so your previous Home can stay followed.',
      );
    following.push(prefs.home);
  }
  return { home: id, following };
}
export const relationship = (prefs: Preferences, id: string) =>
  id === prefs.home ? 'Home' : prefs.following.includes(id) ? 'Following' : '';

// Browser preferences only. No desktop session storage, credentials or syncing.
export function loadPreferences(storage: Pick<Storage, 'getItem'>): {
  preferences: Preferences;
  warning: string;
} {
  try {
    const text = storage.getItem(preferenceKey);
    if (!text) return { preferences: emptyPreferences(), warning: '' };
    if (text.length > 16000) throw Error('Oversized preferences');
    const raw = JSON.parse(text);
    const preferences = normalizePreferences(raw);
    const altered =
      JSON.stringify({ home: raw?.home, following: raw?.following }) !==
      JSON.stringify(preferences);
    return {
      preferences,
      warning: altered
        ? 'Some saved community choices were invalid and could not be restored.'
        : '',
    };
  } catch {
    return {
      preferences: emptyPreferences(),
      warning:
        'Saved communities could not be read. Changes will apply in this tab if browser storage remains unavailable.',
    };
  }
}
export function savePreferences(
  storage: Pick<Storage, 'setItem'>,
  preferences: Preferences,
): string {
  try {
    storage.setItem(preferenceKey, JSON.stringify(preferences));
    return '';
  } catch {
    return 'Community choices changed for this tab only. Browser storage is unavailable.';
  }
}
