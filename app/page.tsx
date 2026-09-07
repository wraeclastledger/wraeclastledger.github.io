'use client';
import {displayedMod} from '../lib/presentation';
import { LeagueFilter } from '../components/league-filter';
import { CommunitySummary } from '../components/community-summary';
import { CommunityChoices, CommunityDirectory, CommunityOverview, useCommunityPreferences } from '../components/community-discovery';
import { relationship } from '../lib/community-preferences';
import PrototypeDetail from '../components/prototype-detail';

import {
  useEffectEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Search,
  Copy,
  X,
  BookOpen,
} from 'lucide-react';

import { PublicApi, ApiError, errorText } from '../lib/api';

import { BrowserController } from '../lib/browser-controller';

import {
  DEFAULT_QUERY,
  SORTS,
  defaultOrder,
  money,
  number,
  signedClass,
  type Query,
  type SortKey,
} from '../lib/model';

import { parseRoute, routeUrl, routeLabel, type Route } from '../lib/routes';

import { generatePublicStrategySetupCode } from '../lib/vendor/setup-code.js';

import { encodePayload, writeClipboard } from '../lib/copy';

import { Table } from '../components/ui/table';

import { NativeSelect } from '../components/ui/native-select';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

import {
  navigationDefault,
  readNavigation,
  type Navigation,
} from '../lib/navigation';

import { DisclosureContext } from '../lib/disclosures';

import { MechanicFilter } from '../components/mechanic-filter';

import { Tags, RunEvidence } from '../components/strategy-detail';

const initialRoute: Route = {
  view: 'list',

  query: { ...DEFAULT_QUERY },

  pages: 1,
};

const themeKey = 'wraeclastledger-web-theme-v1';

function ErrorNotice({ error, retry }: { error: ApiError; retry: () => void }) {
  const [remaining, setRemaining] = useState(error.retryAfter);

  useEffect(() => {
    setRemaining(error.retryAfter);

    if (!error.retryAfter) return;

    const end = Date.now() + error.retryAfter * 1000;

    const timer = setInterval(
      () => setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000))),

      1000,
    );

    return () => clearInterval(timer);
  }, [error]);

  return (
    <div className="notice error" role="alert">
      <span>{errorText(error)}</span>

      {error.kind !== 'unavailable' && (
        <button disabled={remaining > 0} onClick={retry}>
          {remaining
            ? `Retry in ${remaining}s`
            : error.kind === 'changed'
              ? 'Reload latest'
              : 'Retry'}
        </button>
      )}
    </div>
  );
}

export default function Home({ communityReview = import.meta.env.VITE_COMMUNITY_REVIEW === '1', defaultCommunity = import.meta.env.VITE_REVIEW_HOME_COMMUNITY || '' }: { communityReview?: boolean; defaultCommunity?: string } = {}) {
  const [initialized, setInitialized] = useState(false);

  const communityState = useCommunityPreferences(communityReview, defaultCommunity);
  const [api] = useState(() => new PublicApi(import.meta.env.VITE_PUBLIC_API_URL || '/web/v1', undefined, 15000, communityReview));
  api.preferences = communityState.preferences;
  const [controller] = useState(
    () =>
      new BrowserController(api),
  );

  const state = useSyncExternalStore(
    controller.subscribe,

    controller.snapshot,

    controller.snapshot,
  );

  const [route, setRoute] = useState<Route>(initialRoute);

  const routeRef = useRef<Route>(initialRoute);

  const [nav, setNav] = useState<Navigation>(navigationDefault);
  const [directoryReady, setDirectoryReady] = useState(false);
  const [communityName, setCommunityName] = useState('');

  const [theme, setTheme] = useState('dark');

  const [storageWarning, setStorageWarning] = useState('');

  const [notice, setNotice] = useState('');

  const [copyBusy, setCopyBusy] = useState(false);

  const [manual, setManual] = useState('');

  const copyOwner = useRef(new AbortController());

  const restore = useRef<Navigation | null>(null);

  const opener = useRef<HTMLElement | null>(null);

  const [search, setSearch] = useState('');

  const [league, setLeague] = useState('');
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  useEffect(() => {
    if (!refreshCooldown) return;
    const timer = setTimeout(
      () => setRefreshCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [refreshCooldown]);
  const [knownLeagues, setKnownLeagues] = useState<string[]>([]);
  useEffect(() => {
    const found =
      state.page?.strategies
        .map((s) => s.league)
        .filter((s): s is string => !!s) || [];
    if (found.length)
      setKnownLeagues((old) => [...new Set([...old, ...found])].slice(0, 100));
  }, [state.page]);

  const snapshot = (): Navigation => ({
    ...readNavigation(history.state),

    marker: 'wl-c1',

    scroll: window.scrollY,

    focus: document.activeElement?.getAttribute('data-focus') || '',

    tableScroll:
      document.querySelector('.strategy-table-wrap')?.scrollLeft || 0,
  });

  const clearCopy = () => {
    copyOwner.current.abort();

    copyOwner.current = new AbortController();

    setCopyBusy(false);

    setManual('');

    setNotice('');
  };

  const applyRoute = (next: Route) => {
    clearCopy();
    setDirectoryReady(false);
    setCommunityName('');
    if (!communityReview && (next.view === 'directory' || (next.view === 'list' || next.view === 'community') && next.query.scope)) next = { view: 'missing' };
    if (communityReview && next.view === 'community' && !next.query.community_id && communityState.preferences.home)
      next = { ...next, query: { ...next.query, scope: 'community', community_id: communityState.preferences.home } };

    routeRef.current = next;

    setRoute(next);

    if (next.view === 'list' || next.view === 'community') {
      setSearch(next.query.search);

      setLeague(next.query.league);
    }

    if (!communityReview || communityState.ready) void controller.open(next);
  };

  const navigate = (next: Route, preservePosition = false) => {
    if (routeUrl(next) === routeUrl(routeRef.current)) {
      if (next.view === 'about' || next.view === 'privacy') {
        document

          .querySelector<HTMLElement>('main h1')

          ?.focus({ preventScroll: true });

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }

      return;
    }

    if (
      ['about', 'privacy'].includes(next.view) &&
      ['about', 'privacy'].includes(routeRef.current.view)
    ) {
      const updated = {
        ...readNavigation(history.state),

        scroll: 0,

        focus: '',
      };

      history.replaceState(updated, '', routeUrl(next));

      setNav(updated);

      restore.current = updated;

      applyRoute(next);

      return;
    }

    history.replaceState(snapshot(), '', location.href);

    const previous = history.state as Navigation;

    const updated = {
      ...navigationDefault,

      depth: (previous?.depth || 0) + 1,

      backLabel: communityReview && routeRef.current.view === 'community' && communityName ? communityName.slice(0, 64) : routeLabel(routeRef.current),

      ...(preservePosition ? { scroll: window.scrollY } : {}),
    };

    history.pushState(updated, '', routeUrl(next));

    setNav(updated);

    restore.current = preservePosition ? null : updated;

    applyRoute(next);
  };

  const syncRoute = useEffectEvent(applyRoute);

  useEffect(() => {
    let saved: string | null = null;

    try {
      saved = localStorage.getItem(themeKey);

      if (saved && saved !== 'dark' && saved !== 'light')
        setStorageWarning(
          'Saved theme could not be read. Dark is shown until you choose a theme.',
        );
    } catch {
      setStorageWarning(
        'Saved theme could not be read. Your choice will apply in this tab.',
      );
    }

    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);

      document.documentElement.dataset.theme = saved;
    }

    const first = parseRoute(location.hash);

    const entry: Navigation = readNavigation(history.state);

    history.replaceState(entry, '', routeUrl(first));

    setNav(entry);

    restore.current = entry;

    syncRoute(first);

    setInitialized(true);

    let lastPop = '';

    const pop = () => {
      const identity = location.hash + JSON.stringify(history.state);

      if (lastPop === identity) return;

      lastPop = identity;

      const entry = readNavigation(history.state);

      setNav(entry);

      restore.current = entry;

      syncRoute(parseRoute(location.hash));
    };

    const scroll = () => {
      if (!restore.current && history.state?.marker === 'wl-c1')
        history.replaceState(
          { ...history.state, scroll: window.scrollY },

          '',

          location.href,
        );
    };

    window.addEventListener('popstate', pop);

    window.addEventListener('hashchange', pop);

    window.addEventListener('scroll', scroll, { passive: true });

    history.scrollRestoration = 'manual';

    return () => {
      window.removeEventListener('popstate', pop);

      window.removeEventListener('hashchange', pop);

      window.removeEventListener('scroll', scroll);

      copyOwner.current.abort();

      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    if (!communityReview || !communityState.ready || !initialized) return;
    const current = routeRef.current;
    if (current.view !== 'list' && current.view !== 'community') return;
    const next = { ...current, pages: 1, query: { ...current.query } };
    if (next.view === 'community' && !next.query.community_id && communityState.preferences.home) {
      next.query.scope = 'community'; next.query.community_id = communityState.preferences.home;
    }
    routeRef.current = next; setRoute(next);
    history.replaceState({ ...readNavigation(history.state), scroll: 0 }, '', routeUrl(next));
    void controller.open(next, false);
  }, [communityState.preferences, communityState.ready, initialized, communityReview, controller]);

  useEffect(() => {
    if (state.loading || !restore.current || route.view === 'directory' && !directoryReady) return;

    const target = restore.current;

    const frame = requestAnimationFrame(() => {
      restore.current = null;

      const element = Array.from(
        document.querySelectorAll<HTMLElement>('[data-focus]'),
      ).find((el) => el.dataset.focus === target.focus);

      (element || document.querySelector<HTMLElement>('main h1'))?.focus({
        preventScroll: true,
      });

      window.scrollTo({ top: target.scroll, left: 0, behavior: 'instant' });

      const table = document.querySelector('.strategy-table-wrap');

      if (table) table.scrollLeft = target.tableScroll;
    });

    return () => cancelAnimationFrame(frame);
  }, [route, state.loading, state.page, state.detail, directoryReady]);

  const changeDisclosure = (key: string, value: boolean) => {
    const entry = readNavigation(history.state);

    const updated = {
      ...entry,

      disclosures: { ...entry.disclosures, [key]: value },
    };

    history.replaceState(updated, '', location.href);

    setNav(updated);
  };

  const chooseTheme = (value: string) => {
    setTheme(value);

    document.documentElement.dataset.theme = value;

    try {
      localStorage.setItem(themeKey, value);

      setStorageWarning('');
    } catch {
      setStorageWarning(
        'Theme changed for this tab only. Browser storage is unavailable.',
      );
    }
  };

  const changeQuery = (patch: Partial<Query>) => {
    if (route.view === 'list' || route.view === 'community')
      navigate(
        { ...route, pages: 1, query: { ...route.query, ...patch } },
        true,
      );
  };

  const changeSort = (sort: SortKey) => {
    if (route.view === 'list' || route.view === 'community')
      changeQuery({
        sort,

        order:
          route.query.sort === sort
            ? route.query.order === 'asc'
              ? 'desc'
              : 'asc'
            : defaultOrder(sort),
      });
  };

  const reload = () => {
    clearCopy();

    if (route.view === 'list' || route.view === 'community') {
      const next = { ...route, pages: 1 };

      history.replaceState({ ...snapshot(), scroll: 0 }, '', routeUrl(next));

      applyRoute(next);
    } else void controller.open(route);
  };

  const more = async () => {
    const generation = controller.state.generation;

    await controller.more();

    if (generation !== controller.state.generation) return;

    if (
      routeRef.current.view === 'list' ||
      routeRef.current.view === 'community'
    ) {
      const next = { ...routeRef.current, pages: controller.state.pages || 1 };

      routeRef.current = next;

      setRoute(next);

      history.replaceState(snapshot(), '', routeUrl(next));
    }
  };

  const copy = async (text: string) => {
    const owner = copyOwner.current;

    opener.current = document.activeElement as HTMLElement;

    setCopyBusy(true);

    const ok = await writeClipboard(text, (v) =>
      navigator.clipboard.writeText(v),
    );

    if (owner.signal.aborted) return;

    setCopyBusy(false);

    if (ok) setNotice('Copied to clipboard.');
    else {
      setNotice(
        'Automatic copy was unavailable. Select and copy the text below.',
      );

      setManual(text);
    }
  };

  const copySetup = async () => {
    const detail = state.detail;

    const evidence = state.evidence;

    if (!detail || !evidence || evidence.next_cursor || state.evidenceError)
      return;

    const owner = copyOwner.current;

    setCopyBusy(true);

    setNotice('Preparing setup code…');

    const result = await generatePublicStrategySetupCode(
      detail,

      evidence,

      (payload) => encodePayload(payload, owner.signal),
    );

    if (owner.signal.aborted) return;

    if (result.status === 'unavailable') {
      setCopyBusy(false);

      setNotice(
        result.reason === 'incomplete_safe_source'
          ? 'A setup code is unavailable: exact setup and price evidence is incomplete.'
          : 'The setup code could not be prepared within its limits. Please retry.',
      );

      return;
    }

    await copy(result.code);
  };

  const back = () => {
    if (nav.depth > 0) history.back();
    else navigate(initialRoute);
  };

  const closeManual = () => {
    setManual('');

    opener.current?.focus();
  };

  const listRoute =
    initialized && (route.view === 'list' || route.view === 'community')
      ? route
      : null;

  return (
    <div
      id="wl-pages-review"
      className="site wl-page"
    >
      <a
        className="skip"

        href="#main-content"

        onClick={(e) => {
          e.preventDefault();

          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to strategies
      </a>

      <header className="topbar">
        <a
          aria-label="WraeclastLedger home"

          className="brand"

          href="#/"

          onClick={(e) => {
            if (
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            )
              return;

            e.preventDefault();

            navigate(initialRoute);
          }}
        >
          <img src="./ledger.png" width="40" height="40" alt="" />

          <span>
            <strong>WraeclastLedger</strong>

            <small>Public strategy browser</small>
          </span>
        </a>

        <nav aria-label="Main navigation">
          <fieldset className="theme" aria-label="Color theme">
            <button
              aria-pressed={theme === 'light'}

              aria-label="Light theme"

              onClick={() => chooseTheme('light')}
            >
              Light
            </button>

            <button
              aria-pressed={theme === 'dark'}

              aria-label="Dark theme"

              onClick={() => chooseTheme('dark')}
            >
              Dark
            </button>
          </fieldset>

          <a
            className="button download"

            href="https://github.com/gund0lf/wraeclastledger_react/releases/latest"

            target="_blank"

            rel="noopener noreferrer"
          >
            <Download size={16} />
            Desktop app
          </a>
        </nav>
      </header>

      {storageWarning && (
        <output className="notice warning">{storageWarning}</output>
      )}
      {communityReview && <div className="notice community-review-notice">Local community workflow review · synthetic data · no production connection</div>}
      {communityReview && communityState.warning && <output className="notice warning">{communityState.warning}</output>}
      {communityReview && <nav className="community-navigation" aria-label="Community browsing">
        <button aria-pressed={route.view === 'list' && route.query.scope !== 'feed'} onClick={() => navigate({ view: 'list', query: { ...DEFAULT_QUERY, league: 'query' in route ? route.query.league : DEFAULT_QUERY.league }, pages: 1 })}>All Communities</button>
        <button aria-pressed={route.view === 'list' && route.query.scope === 'feed'} onClick={() => navigate({ view: 'list', query: { ...DEFAULT_QUERY, ...('query' in route ? route.query : {}), scope: 'feed', community_id: undefined }, pages: 1 })}>My Feed</button>
        <button aria-pressed={route.view === 'directory'} onClick={() => navigate({ view: 'directory', query: { ...DEFAULT_QUERY, league: 'query' in route ? route.query.league : DEFAULT_QUERY.league }, pages: 1 })}>Browse communities</button>
      </nav>}

      <div className="page-return">
        {' '}
        {route.view !== 'list' && (
          <button className="back text-button" onClick={back}>
            <ArrowLeft size={16} />

            {nav.depth && nav.backLabel
              ? `Back to ${nav.backLabel}`
              : 'Browse strategies'}
          </button>
        )}
      </div>

      <main
        id="main-content"

        aria-label="Strategy content"

        className={
          route.view === 'about' || route.view === 'privacy'
            ? 'reading-page'
            : undefined
        }

        tabIndex={-1}
      >
        {!initialized && (
          <output className="notice">Opening Strategy Browser…</output>
        )}
        {communityReview && initialized && route.view === 'directory' && communityState.ready && <CommunityDirectory
          api={api} query={route.query} pages={route.pages} preferences={communityState.preferences} update={communityState.update}
          navigate={navigate} ready={() => setDirectoryReady(true)} loaded={pages => {
            if (routeRef.current.view !== 'directory') return;
            const next = { ...routeRef.current, pages };
            routeRef.current = next; setRoute(next); history.replaceState(snapshot(), '', routeUrl(next));
          }} />}

        {listRoute && (
          <>
            <div className="browser-title">
              <div>
                <p className="eyebrow">
                  {listRoute.view === 'community'
                    ? communityReview ? relationship(communityState.preferences, listRoute.query.community_id || '') || 'Public community' : 'Home community'
                    : 'Public strategies'}
                </p>

                <h1 tabIndex={-1}>
                  {listRoute.view === 'community'
                    ? communityReview ? communityName || 'Community' : 'WraeclastLedger community'
                    : listRoute.query.scope === 'feed' ? 'My Feed' : communityReview ? 'All Communities' : 'Public strategies'}
                </h1>
              </div>

              <button
                aria-label="Refresh strategies"

                disabled={state.loading || refreshCooldown > 0}
                title={
                  refreshCooldown
                    ? `Refresh available in ${refreshCooldown}s`
                    : 'Refresh strategies'
                }
                onClick={() => {
                  if (refreshCooldown) return;
                  setRefreshCooldown(3);
                  reload();
                }}
              >
                <RefreshCw size={17} />
              </button>
            </div>

            {listRoute.view === 'community' && !communityReview && (
              <CommunitySummary
                key={listRoute.query.league}
                league={listRoute.query.league}
              />
            )}
            {communityReview && listRoute.view === 'community' && listRoute.query.community_id && <CommunityOverview
              api={api} id={listRoute.query.community_id} league={listRoute.query.league}
              preferences={communityState.preferences} update={communityState.update} named={setCommunityName} />}
            {communityReview && listRoute.view === 'list' && <CommunityChoices api={api} preferences={communityState.preferences} league={listRoute.query.league} navigate={navigate} />}
            {communityReview && <p className="footnote">{listRoute.query.scope === 'feed' ? 'Publications from Home and Following. ' : ''}
              {listRoute.query.search ? 'Matching Home results appear first, then Following, then others; your sort applies within each group. ' : ''}
              Community choices are saved only in this browser. Clearing site data removes them.</p>}
            <div className="browse-context">
              <span className="count">
                {state.page
                  ? `${number(state.page.total, 0)} strategies`
                  : 'Current publications'}
              </span>

              <span>Author-reported results · Score is read-only</span>

              <output className="refresh-status">
                {state.retainedPage
                  ? state.loading
                    ? 'Updating results… Previous results remain visible.'
                    : 'Update failed. Previous results remain visible.'
                  : ''}
              </output>
            </div>

            <form
              className="filters"

              onSubmit={(e) => {
                e.preventDefault();

                changeQuery({ search, league });
              }}
            >
              <label className="search">
                <span>Search strategies</span>

                <div>
                  <Search size={16} />

                  <input
                    value={search}

                    maxLength={120}

                    onChange={(e) => setSearch(e.target.value)}

                    placeholder="Name, notes or setup…"
                  />

                  <button type="submit">Search</button>
                </div>
              </label>

              <LeagueFilter
                value={listRoute.query.league}
                leagues={knownLeagues}
                onChange={(value) => {
                  setLeague(value);
                  changeQuery({ league: value });
                }}
              />

              <label htmlFor="filter-map_type">
                <span>Map setup</span>

                <NativeSelect
                  id="filter-map_type"

                  value={listRoute.query.map_type}

                  onChange={(e) => changeQuery({ map_type: e.target.value })}
                >
                  <option value="">Any setup</option>

                  <option value="6-mod">6-mod</option>

                  <option value="8-mod">8-mod</option>
                </NativeSelect>
              </label>

              <MechanicFilter
                value={listRoute.query.tags}
                onChange={(tags) => changeQuery({ tags })}
              />

              <label htmlFor="filter-group">
                <span>Party</span>

                <NativeSelect
                  id="filter-group"

                  value={listRoute.query.group}

                  onChange={(e) => changeQuery({ group: e.target.value })}
                >
                  <option value="all">Solo & group</option>

                  <option value="solo">Solo</option>

                  <option value="group">Group</option>
                </NativeSelect>
              </label>

              <label htmlFor="filter-since">
                <span>Activity</span>

                <NativeSelect
                  id="filter-since"

                  value={listRoute.query.since}

                  onChange={(e) => changeQuery({ since: e.target.value })}
                >
                  <option value="all">All time</option>

                  {['1d', '3d', '7d', '30d'].map((x) => (
                    <option key={x} value={x}>
                      Last {x.slice(0, -1)} {x === '1d' ? 'day' : 'days'}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <div className="sort-select">
                <label htmlFor="filter-sort">
                  <span>Sort results</span>
                </label>

                <div className="sort-input">
                  <NativeSelect
                    id="filter-sort"

                    value={listRoute.query.sort}

                    onChange={(e) => {
                      const sort = e.target.value as SortKey;

                      changeQuery({ sort, order: defaultOrder(sort) });
                    }}
                  >
                    {Object.entries(SORTS).map(([key, text]) => (
                      <option key={key} value={key}>
                        {text}
                      </option>
                    ))}
                  </NativeSelect>

                  <button
                    type="button"

                    title={
                      listRoute.query.order === 'asc'
                        ? 'Ascending; switch to descending'
                        : 'Descending; switch to ascending'
                    }

                    aria-label={`Sort ${listRoute.query.order === 'asc' ? 'descending' : 'ascending'}`}

                    onClick={() =>
                      changeQuery({
                        order: listRoute.query.order === 'asc' ? 'desc' : 'asc',
                      })
                    }
                  >
                    {listRoute.query.order === 'asc' ? (
                      <ArrowUp size={16} />
                    ) : (
                      <ArrowDown size={16} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"

                className="clear-filters"

                onClick={() => changeQuery({ ...DEFAULT_QUERY })}
              >
                Clear filters
              </button>
            </form>

            {state.loading && !state.page && (
              <output className="notice">Loading current strategies…</output>
            )}

            {state.error && <ErrorNotice error={state.error} retry={reload} />}

            {state.page && (
              <>
                <div
                  className="table-scroll strategy-table-wrap"
                  aria-busy={state.loading}
                >
                  <Table className="strategy-table">
                    <colgroup>
                      {[20, 10, 30, 5, 5, 6, 7, 4, 5, 8].map((width, i) => (
                        <col key={i} style={{ width: width + '%' }} />
                      ))}
                    </colgroup>

                    <caption className="sr-only">
                      Published strategies with authored results and read-only
                      community scores
                    </caption>

                    <thead>
                      <tr>
                        {[
                          ['title', 'Strategy'],

                          ['', 'Community'],

                          ['', 'Tags'],

                          ['mod', 'Mod'],

                          ['maps', 'Maps'],

                          ['cost_per_map', 'Cost / map'],

                          ['profit_per_map', 'Profit / map'],

                          ['score', 'Score'],

                          ['div_per_hour', 'Div / hr'],

                          ['activity', 'Updated'],
                        ].map(([key, text], i) => (
                          <th
                            key={i}

                            scope="col"

                            aria-sort={
                              key === state.page?.sort
                                ? state.page?.order === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : undefined
                            }
                          >
                            {key ? (
                              <button
                                onClick={() => changeSort(key as SortKey)}
                              >
                                {text}

                                {key === state.page?.sort ? (
                                  <span aria-hidden="true">
                                    {' '}
                                    {state.page?.order === 'asc' ? '↑' : '↓'}
                                  </span>
                                ) : null}
                              </button>
                            ) : (
                              text
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {state.page.strategies.map((s) => (
                        <tr key={s.id}>
                          <th scope="row">
                            <a
                              data-focus={s.id}

                              href={'#/strategy/' + s.id}

                              onClick={(e) => {
                                if (
                                  e.button !== 0 ||
                                  e.metaKey ||
                                  e.ctrlKey ||
                                  e.shiftKey ||
                                  e.altKey
                                )
                                  return;

                                e.preventDefault();

                                navigate({ view: 'detail', id: s.id });
                              }}
                            >
                              {s.title || 'Untitled strategy'}
                            </a>

                            <small>
                              {s.league || 'League not recorded'} ·{' '}
                              {number(s.evidence.run_count, 0)}{' '}
                              {s.evidence.run_count === 1 ? 'run' : 'runs'}
                            </small>
                          </th>

                          <td>
                            <a
                              href={routeUrl({
                                view: 'community',
                                query: s.community ? { ...listRoute.query, scope: 'community', community_id: s.community.id } : listRoute.query,
                                pages: 1,
                              })}

                              onClick={(e) => {
                                if (
                                  e.button !== 0 ||
                                  e.metaKey ||
                                  e.ctrlKey ||
                                  e.shiftKey ||
                                  e.altKey
                                )
                                  return;

                                e.preventDefault();

                                navigate({
                                  view: 'community',

                                  query: s.community ? { ...listRoute.query, scope: 'community', community_id: s.community.id } : listRoute.query,

                                  pages: 1,
                                });
                              }}
                            >
                              {s.community?.name || 'WraeclastLedger'}
                            </a>
                            {communityReview && s.community && <small className="community-row-relationship">{relationship(communityState.preferences, s.community.id)}</small>}
                          </td>

                          <td>
                            <Tags
                              tags={s.tags}

                              compact

                              title={s.title || 'Untitled strategy'}
                            />
                          </td>

                          <td title={displayedMod(s.observed.mod_average,s.map_type).title}>{displayedMod(s.observed.mod_average,s.map_type).value}</td>

                          <td>{number(s.observed.map_count, 0)}</td>

                          <td>{money(s.results.all_in_cost_per_map_chaos)}</td>

                          <td
                            className={signedClass(
                              s.results.net_per_map_divines,
                            )}
                          >
                            {money(s.results.net_per_map_divines, 'd')}
                          </td>

                          <td>{number(s.score, 0)}</td>

                          <td
                            title={`Timed coverage: ${number(s.evidence.timed_run_count, 0)} ${s.evidence.timed_run_count === 1 ? 'run' : 'runs'} / ${number(s.evidence.timed_map_count, 0)} maps`}
                          >
                            {number(s.results.net_divines_per_hour, 2)}
                          </td>

                          <td>
                            <time
                              dateTime={s.updated_at || undefined}

                              title={
                                s.updated_at
                                  ? new Date(s.updated_at).toUTCString()
                                  : 'No date recorded'
                              }
                            >
                              {s.updated_at
                                ? new Date(s.updated_at).toLocaleDateString(
                                    'en-GB',

                                    {
                                      timeZone: 'UTC',

                                      day: 'numeric',

                                      month: 'short',

                                      year: 'numeric',
                                    },
                                  )
                                : '—'}
                            </time>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {!state.page.strategies.length && !state.loading && (
                  <div className="empty">
                    <BookOpen size={28} />

                    <h2>No matching strategies</h2>

                    <p>Try another league or clear your filters.</p>
                  </div>
                )}

                <div className="pagination">
                  <span>
                    Showing {number(state.page.strategies.length, 0)} of{' '}
                    {number(state.page.total, 0)}
                  </span>

                  {state.page.next_cursor && (
                    <button
                      disabled={
                        state.retainedPage ||
                        state.loading ||
                        state.moreLoading ||
                        state.pages >= 10 ||
                        state.error?.kind === 'changed'
                      }

                      onClick={() => void more()}
                    >
                      {state.moreLoading
                        ? 'Loading…'
                        : state.pages >= 10
                          ? 'Refine filters to see more'
                          : 'Load more strategies'}
                    </button>
                  )}
                </div>
              </>
            )}

            <p className="footnote browse-footnote">
              {!communityReview && <>Currently showing the WraeclastLedger home community. Other
              community browsing follows when supported. </>}Missing values mean
              unrecorded; zero and losses remain visible.
            </p>
          </>
        )}

        {route.view === 'detail' && (
          <>
            {state.loading && !state.detail && (
              <output className="notice">Loading strategy…</output>
            )}
            {state.error && <ErrorNotice error={state.error} retry={reload} />}{' '}
            {state.detail && (
              <DisclosureContext.Provider
                value={{ values: nav.disclosures, change: changeDisclosure }}
              >
                <PrototypeDetail
                  strategy={state.detail}
                  evidence={state.evidence}

                  onCopy={(text) => void copy(text)}

                  copyBusy={copyBusy}
                />

                {state.detail.coverage.run_count !== 1 && (
                  <section className="section">
                    <div className="section-heading">
                      <h2>Contributed runs</h2>
                    </div>
                    <p className="footnote">
                      Desktop Import can inspect this history. Load applies only
                      reusable setup to a new run; enter your own current
                      prices. Exact setup and cost proof is required for a code.
                    </p>
                    {state.loading && (
                      <output>Loading contributed evidence…</output>
                    )}
                    {state.evidenceError && (
                      <ErrorNotice error={state.evidenceError} retry={reload} />
                    )}{' '}
                    {state.evidence?.runs.map((run) => (
                      <RunEvidence key={run.ordinal} run={run} />
                    ))}
                    {state.evidence && !state.evidence.runs.length && (
                      <p className="muted">
                        No structured runs available. A safe setup code cannot
                        be generated.
                      </p>
                    )}
                    {state.evidence?.next_cursor && (
                      <>
                        <button
                          disabled={state.moreLoading}

                          onClick={() => void more()}
                        >
                          {state.moreLoading
                            ? 'Loading…'
                            : 'Load more evidence'}
                        </button>

                        <p className="footnote">
                          Load the remaining evidence before copying the newest
                          complete setup.
                        </p>
                      </>
                    )}
                  </section>
                )}

                <aside className="import-panel">
                  <div>
                    <h2>Track your own run</h2>

                    <p>
                      Import this setup into WraeclastLedger to record your
                      maps, costs and returns. Enter your own current prices.
                    </p>
                  </div>

                  <div className="import-actions">
                    {' '}
                    <button
                      disabled={
                        copyBusy ||
                        state.loading ||
                        !!state.evidenceError ||
                        !state.evidence ||
                        !!state.evidence.next_cursor
                      }

                      onClick={() => void copySetup()}
                    >
                      <Copy size={16} />

                      {copyBusy ? 'Preparing…' : 'Copy setup code'}
                    </button>
                    <a
                      className="button"

                      href="https://github.com/gund0lf/wraeclastledger_react/releases/latest"

                      target="_blank"

                      rel="noopener noreferrer"
                    >
                      Download app
                    </a>
                  </div>
                </aside>
              </DisclosureContext.Provider>
            )}
          </>
        )}

        {(route.view === 'about' || route.view === 'privacy') && (
          <article className="prose">
            <p className="eyebrow">WraeclastLedger</p>

            <h1 tabIndex={-1}>
              {route.view === 'about'
                ? 'About the Strategy Browser'
                : 'Privacy and public data'}
            </h1>

            {route.view === 'about' ? (
              <>
                <p>
                  Inspect community-published Path of Exile farming setups and
                  their contributed results, then copy a reusable setup into the
                  WraeclastLedger desktop app.
                </p>

                <p>
                  Results and prices are author-reported historical evidence.
                  They are not forecasts or current replacement costs. Score is
                  an aggregate community signal, not a count of people.
                </p>

                <p>
                  The website is read-only. Publication and strategy changes
                  remain with the Discord bot and desktop workflow.
                </p>

                <h2>Source and support</h2>

                <p>
                  <a
                    href="https://github.com/gund0lf/wraeclastledger_react"

                    target="_blank"

                    rel="noopener noreferrer"
                  >
                    Desktop source
                  </a>{' '}
                  ·{' '}
                  <a
                    href="https://github.com/gund0lf/wraeclastledger_react/issues"

                    target="_blank"

                    rel="noopener noreferrer"
                  >
                    Report a problem
                  </a>
                </p>

                <p>
                  Path of Exile and its item artwork belong to Grinding Gear
                  Games. WraeclastLedger is an independent community project.
                </p>
              </>
            ) : (
              <>
                <p>
                  This website reads public strategy fields through a dedicated
                  safe API. It does not display Discord usernames, source-post
                  links, private exports or voting credentials.
                </p>

                <p>
                  Older desktop API routes still expose identifying information
                  for existing publications during their compatibility
                  transition. The website does not make those older records
                  anonymous across endpoints.
                </p>

                <h2>Your browser</h2>

                <p>
                  {communityReview ? 'Your Light/Dark choice, Home community and Following list are saved locally. Home and Following IDs are sent to the local review service to filter and rank results; they are not credentials or access permissions. ' : 'Only your explicit Light/Dark choice is saved locally. '}
                  Navigation keeps filters, page depth, expanded sections and
                  scroll position in the address and browser history. No session
                  exports, loot snapshots or credentials are stored by this
                  site.
                </p>

                <p>
                  There is no website sign-in, vote casting or analytics
                  integration in this frontend. Clearing browser storage removes
                  {communityReview ? 'your theme and community choices. ' : 'your theme choice. '} A storage failure is shown and your choice
                  applies only in the current tab.
                </p>

                <h2>Network requests</h2>

                <p>
                  The website requests strategy data from its configured
                  service. Item images, when available, load from an approved
                  artwork host. Opening the desktop download, source or Atlas
                  Tree makes a request to that destination.
                </p>

                <p>
                  The public website uses GitHub Pages for static hosting and
                  Cloudflare for delivery and the API connection. These providers
                  and the API operator may retain network request logs, including
                  IP addresses. This site makes no promise of zero provider
                  logging or a fixed retention period. Item artwork is requested
                  from web.poecdn.com.
                </p>

                <p>
                  <a
                    href="https://github.com/gund0lf/wraeclastledger_react/issues"

                    target="_blank"

                    rel="noopener noreferrer"
                  >
                    Report a website or data concern
                  </a>
                  ; avoid posting private exports or credentials.
                </p>
              </>
            )}
          </article>
        )}

        {route.view === 'missing' && (
          <div className="empty">
            <h1 tabIndex={-1}>Page unavailable</h1>

            <p>This link is not a supported public strategy page.</p>

            <button onClick={() => navigate(initialRoute)}>
              Browse strategies
            </button>
          </div>
        )}
      </main>

      <footer>
        <a
          href="#/about"

          onClick={(e) => {
            if (
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            )
              return;

            e.preventDefault();

            navigate({ view: 'about' });
          }}
        >
          About
        </a>

        <span>WraeclastLedger · Read-only community results</span>

        <a
          href="#/privacy"

          onClick={(e) => {
            if (
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            )
              return;

            e.preventDefault();

            navigate({ view: 'privacy' });
          }}
        >
          Privacy
        </a>

        <a
          href="https://github.com/gund0lf/wraeclastledger_react"

          target="_blank"

          rel="noopener noreferrer"
        >
          Desktop source
        </a>
      </footer>

      {notice && (
        <output className="toast">
          <span>{notice}</span>

          <button
            aria-label="Dismiss copy notice"

            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </output>
      )}

      <Dialog
        open={!!manual}

        onOpenChange={(open) => {
          if (!open) closeManual();
        }}
      >
        <DialogContent
          className="manual-dialog"

          showCloseButton={false}

          finalFocus={() => opener.current}
        >
          <DialogTitle>Copy manually</DialogTitle>

          <DialogDescription>
            Select this text and use your browser’s Copy action.
          </DialogDescription>

          <textarea
            aria-label="Text to copy"

            readOnly

            value={manual}

            onFocus={(e) => e.currentTarget.select()}
          />

          <button onClick={closeManual}>Done</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
