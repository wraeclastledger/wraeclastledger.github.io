import { useEffect, useRef, useState, useEffectEvent } from 'react';
import { House, Bookmark } from 'lucide-react';
import { PublicApi, ApiError, errorText } from '../lib/api';
import { type Community, type CommunityPage } from '../lib/discovery';
import {
  changeRelationship,
  emptyPreferences,
  loadPreferences,
  savePreferences,
  relationship,
  preferenceKey,
  type Preferences,
} from '../lib/community-preferences';
import { UUID, routeUrl, type Route } from '../lib/routes';
import {
  DEFAULT_QUERY,
  money,
  number,
  signedClass,
  type Query,
} from '../lib/model';
import { LeagueFilter } from './league-filter';
import { SemanticIcon } from './semantic-icon';

export function useCommunityPreferences(enabled: boolean, defaultHome: string) {
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
  const [warning, setWarning] = useState('');
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    const read = () => {
      let result;
      try {
        result = loadPreferences(window.localStorage);
      } catch {
        result = {
          preferences: emptyPreferences(),
          warning:
            'Browser storage is unavailable. Community choices apply in this tab only.',
        };
      }
      if (!result.preferences.home && UUID.test(defaultHome))
        result.preferences.home = defaultHome;
      setPreferences(result.preferences);
      setWarning(result.warning);
      setReady(true);
    };
    read();
    const storage = (e: StorageEvent) => {
      if (e.key === preferenceKey || e.key === null) read();
    };
    window.addEventListener('storage', storage);
    return () => window.removeEventListener('storage', storage);
  }, [enabled, defaultHome]);
  const update = (id: string, action: 'home' | 'follow' | 'unfollow') => {
    try {
      const next = changeRelationship(preferences, id, action);
      if (next === preferences) return;
      setPreferences(next);
      try {
        setWarning(savePreferences(window.localStorage, next));
      } catch {
        setWarning(
          'Community choices changed for this tab only. Browser storage is unavailable.',
        );
      }
    } catch (error) {
      setWarning(
        error instanceof Error
          ? error.message
          : 'Community choices could not be changed.',
      );
    }
  };
  return { preferences, warning, ready, update };
}
type Actions = {
  preferences: Preferences;
  update: (id: string, action: 'home' | 'follow' | 'unfollow') => void;
};
export function CommunityChoices({
  api,
  preferences,
  league,
  navigate,
}: {
  api: PublicApi;
  preferences: Preferences;
  league: string;
  navigate: (route: Route) => void;
}) {
  const [home, setHome] = useState<Community | null>(null),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    let active = true;
    // External request identity changed: do not display the previous Home while loading.
    // eslint-disable-next-line react/react-compiler
    setHome(null);
    setUnavailable(false);
    if (preferences.home)
      api
        .community(preferences.home, league, ctrl.signal)
        .then((c) => {
          if (active) {
            setHome(c);
            setUnavailable(!c.available);
          }
        })
        .catch(() => {
          if (active) setUnavailable(true);
        });
    return () => {
      active = false;
      ctrl.abort();
    };
  }, [api, preferences.home, league]);
  return (
    <div className="community-choice-summary">
      <span>
        <SemanticIcon name="home" size={24} fallback={<House size={16} />} />{' '}
        Home:{' '}
        {preferences.home ? (
          <button
            className="text-button"
            onClick={() =>
              navigate({
                view: 'community',
                query: {
                  ...DEFAULT_QUERY,
                  league,
                  scope: 'community',
                  community_id: preferences.home!,
                },
                pages: 1,
              })
            }
          >
            {home?.name || (unavailable ? 'Unavailable community' : 'Loading…')}
          </button>
        ) : (
          'Not selected'
        )}
      </span>
      <span>
        <Bookmark size={16} /> Following: {preferences.following.length}
      </span>
      {unavailable && (
        <output>
          Home is unavailable. Your saved choice is retained; you can choose
          another from Browse communities.
        </output>
      )}
    </div>
  );
}
export function CommunityActions({
  community,
  preferences,
  update,
}: { community: Community } & Actions) {
  const state = relationship(preferences, community.id);
  return (
    <div className="community-actions">
      <span className="community-relationship">
        {state === 'Home' ? (
          <SemanticIcon name="home" size={24} fallback={<House size={16} />} />
        ) : state === 'Following' ? (
          <Bookmark size={16} />
        ) : null}
        {state || 'Not followed'}
      </span>
      {state === 'Home' ? (
        <small>Always included in My Feed</small>
      ) : (
        <>
          <button
            type="button"
            disabled={!community.available && state !== 'Following'}
            onClick={() =>
              update(
                community.id,
                state === 'Following' ? 'unfollow' : 'follow',
              )
            }
          >
            {state === 'Following' ? 'Unfollow' : 'Follow'}
          </button>
          <button
            type="button"
            disabled={!community.available}
            onClick={() => update(community.id, 'home')}
          >
            Set as Home
          </button>
        </>
      )}
    </div>
  );
}
export function CommunityOverview({
  api,
  id,
  league,
  preferences,
  update,
  named,
}: {
  api: PublicApi;
  id: string;
  league: string;
  named: (name: string) => void;
} & Actions) {
  const [data, setData] = useState<Community | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const onNamed = useEffectEvent(named);
  useEffect(() => {
    const ctrl = new AbortController();
    let active = true;
    // Clear the previous external response when its community/league identity changes.
    // eslint-disable-next-line react/react-compiler
    setData(null);
    setError('');
    api
      .community(id, league, ctrl.signal)
      .then((d) => {
        if (active) {
          setData(d);
          onNamed(d.name);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError ? errorText(e) : 'Community unavailable.',
          );
      });
    return () => {
      active = false;
      ctrl.abort();
    };
  }, [api, id, league, retry]);
  if (error)
    return (
      <div className="notice" role="alert">
        {error} Your saved community choices are retained.{' '}
        <button onClick={() => setRetry((n) => n + 1)}>Retry community</button>
      </div>
    );
  if (!data) return <output>Loading community…</output>;
  return (
    <section
      className="community-summary"
      aria-label={`${data.name} community overview`}
    >
      <div>
        <p>
          {league || 'All leagues'} · {number(data.strategies, 0)} public
          strategies · {number(data.maps, 0)} maps · {number(data.runs, 0)}{' '}
          contributed runs
        </p>
        {!data.available && (
          <output>
            This community is unavailable. Your saved choice is retained.
          </output>
        )}
        <CommunityActions
          community={data}
          preferences={preferences}
          update={update}
        />
      </div>
      <div className="community-wealth">
        <span>Generational wealth</span>
        <strong className={signedClass(data.net_divines)}>
          {money(data.net_divines, 'd')}
        </strong>
        <small>
          Recorded net profit · {data.covered}/{data.strategies} strategies with
          totals
        </small>
        <small>
          {data.covered < data.strategies
            ? 'Incomplete coverage — known subtotal. '
            : ''}
          Historical Divine values; losses included.
        </small>
      </div>
    </section>
  );
}
export function CommunityDirectory({
  api,
  query,
  pages,
  preferences,
  update,
  navigate,
  ready,
  loaded,
}: {
  api: PublicApi;
  query: Query;
  pages: number;
  navigate: (route: Route) => void;
  ready: () => void;
  loaded: (pages: number) => void;
} & Actions) {
  const [search, setSearch] = useState(query.search),
    [data, setData] = useState<CommunityPage | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const owner = useRef(0),
    abort = useRef<AbortController | null>(null);
  const searchQuery = useRef(query.search);
  const pageCount = useRef(1),
    previousPreferences = useRef(JSON.stringify(preferences));
  const preferenceToken = JSON.stringify(preferences);
  const onReady = useEffectEvent(ready);
  const onLoaded = useEffectEvent(loaded);
  const requestedPages = useEffectEvent(() => pages);
  useEffect(() => {
    if (data || error) onReady();
  }, [data, error]);
  useEffect(() => {
    const generation = ++owner.current,
      ctrl = new AbortController();
    abort.current = ctrl;
    // Synchronize the route-owned search and invalidate the old server query's rows.
    // eslint-disable-next-line react/react-compiler
    if (searchQuery.current !== query.search) {
      setSearch(query.search);
      searchQuery.current = query.search;
    }
    // The preceding query's rows must not remain visible during the new request.
    // eslint-disable-next-line react/react-compiler
    setData(null);
    setError('');
    setBusy(true);
    const target =
      previousPreferences.current === preferenceToken ? requestedPages() : 1;
    previousPreferences.current = preferenceToken;
    (async () => {
      let combined = await api.communities(
          query.search,
          query.league,
          null,
          ctrl.signal,
        ),
        count = 1;
      while (combined.next_cursor && count < Math.min(10, target)) {
        if (generation !== owner.current || ctrl.signal.aborted) return;
        const next = await api.communities(
          query.search,
          query.league,
          combined.next_cursor,
          ctrl.signal,
        );
        if (
          next.total !== combined.total ||
          next.next_cursor === combined.next_cursor ||
          next.communities.some((c) =>
            combined.communities.some((p) => p.id === c.id),
          )
        )
          throw new ApiError('changed');
        combined = {
          ...next,
          communities: [...combined.communities, ...next.communities],
        };
        count++;
      }
      if (generation === owner.current && !ctrl.signal.aborted) {
        pageCount.current = count;
        setData(combined);
        onLoaded(count);
      }
    })()
      .catch((e) => {
        if (generation === owner.current && !ctrl.signal.aborted)
          setError(
            e instanceof ApiError
              ? errorText(e)
              : 'Could not load communities.',
          );
      })
      .finally(() => {
        if (generation === owner.current && !ctrl.signal.aborted)
          setBusy(false);
      });
    return () => {
      ctrl.abort();
    };
  }, [api, query.search, query.league, preferenceToken, retry]);
  const more = async () => {
    if (busy || !data?.next_cursor || !abort.current) return;
    const generation = owner.current,
      signal = abort.current.signal;
    setBusy(true);
    setError('');
    try {
      const next = await api.communities(
        query.search,
        query.league,
        data.next_cursor,
        signal,
      );
      if (generation !== owner.current || signal.aborted) return;
      if (
        next.total !== data.total ||
        (next.next_cursor && next.next_cursor === data.next_cursor) ||
        next.communities.some((c) =>
          data.communities.some((p) => p.id === c.id),
        )
      )
        throw new ApiError('changed');
      setData({
        ...next,
        communities: [...data.communities, ...next.communities],
      });
      pageCount.current++;
      loaded(pageCount.current);
    } catch (e) {
      if (generation === owner.current && !signal.aborted)
        setError(
          e instanceof ApiError ? errorText(e) : 'Could not load communities.',
        );
    } finally {
      if (generation === owner.current && !signal.aborted) setBusy(false);
    }
  };
  const choose = (patch: Partial<Query>) =>
    navigate({ view: 'directory', query: { ...query, ...patch }, pages: 1 });
  return (
    <>
      <h1 tabIndex={-1}>Browse communities</h1>
      <p>
        Choose one Home and follow other communities. These choices stay in this
        browser.
      </p>
      <form
        className="community-search"
        onSubmit={(e) => {
          e.preventDefault();
          choose({ search });
        }}
      >
        <label>
          Search communities
          <input
            maxLength={120}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button>Search communities</button>
        {(search || query.search) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              choose({ search: '' });
            }}
          >
            Clear search
          </button>
        )}
        <LeagueFilter
          value={query.league}
          leagues={['Allflame', 'Mirage']}
          onChange={(league) => choose({ league })}
        />
      </form>
      {error && (
        <div className="notice" role="alert">
          {error}{' '}
          <button onClick={() => setRetry((n) => n + 1)}>
            Reload communities
          </button>
        </div>
      )}
      {busy && !data && <output>Loading communities…</output>}
      {data && (
        <>
          <output className="community-result-count">
            {data.total} communities · Home, Following, then others
          </output>
          {!data.communities.length && (
            <p>No matching communities. Try another name.</p>
          )}
          <div className="community-directory">
            {data.communities.map((c) => (
              <section
                key={c.id}
                className="community-card"
                aria-label={c.name}
              >
                <a
                  href={routeUrl({
                    view: 'community',
                    query: {
                      ...DEFAULT_QUERY,
                      league: query.league,
                      scope: 'community',
                      community_id: c.id,
                    },
                    pages: 1,
                  })}
                  data-focus={`community-${c.id}`}
                  onClick={(e) => {
                    if (
                      e.button ||
                      e.ctrlKey ||
                      e.metaKey ||
                      e.shiftKey ||
                      e.altKey
                    )
                      return;
                    e.preventDefault();
                    navigate({
                      view: 'community',
                      query: {
                        ...DEFAULT_QUERY,
                        league: query.league,
                        scope: 'community',
                        community_id: c.id,
                      },
                      pages: 1,
                    });
                  }}
                >
                  <strong>{c.name}</strong>
                </a>
                <p>
                  {c.available
                    ? `${c.strategies} public strategies · ${c.maps} maps · ${c.runs} runs`
                    : 'Community unavailable · saved choice retained'}
                </p>
                <CommunityActions
                  community={c}
                  preferences={preferences}
                  update={update}
                />
              </section>
            ))}
          </div>
          {data.next_cursor && pages < 10 && (
            <button disabled={busy} onClick={() => void more()}>
              {busy ? 'Loading…' : 'Load more communities'}
            </button>
          )}
        </>
      )}
    </>
  );
}
