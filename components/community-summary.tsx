import { useEffect, useState } from 'react';
import { PublicApi, ApiError, errorText } from '../lib/api';
import {
  loadCommunitySummary,
  type CommunitySummary as Summary,
} from '../lib/community-summary';
import { money, number, signedClass } from '../lib/model';
import { House } from 'lucide-react';
import { SemanticIcon } from './semantic-icon';
export function CommunitySummary({ league }: { league: string }) {
  const [state, setState] = useState<{
    league: string;
    data: Summary | null;
    error: string | null;
  }>({ league, data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      ctrl.abort();
      if (active)
        setState({
          league,
          data: null,
          error: 'The community summary took too long. Please retry.',
        });
    }, 25000);
    const api = new PublicApi(import.meta.env.VITE_PUBLIC_API_URL || '/web/v1');
    void loadCommunitySummary(api, ctrl.signal, league)
      .then((data) => {
        if (active && !ctrl.signal.aborted) setState({ league, data, error: null });
      })
      .catch((error) => {
        if (active && !ctrl.signal.aborted)
          setState({
            league,
            data: null,
            error:
              error instanceof ApiError
                ? errorText(error)
                : 'Community totals are unavailable. Please retry.',
          });
        ctrl.abort();
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [attempt, league]);
  const d = state.league === league ? state.data : null;
  const error = state.league === league ? state.error : null;
  return (
    <section
      className="community-summary"
      aria-label="WraeclastLedger community overview"
    >
      <div>
        <span className="community-kicker">
          <SemanticIcon name="home" size={28} fallback={<House size={15} />} /> Home community
        </span>
        <h2>WraeclastLedger</h2>
        <p>
          {league || 'All leagues'} · Shared mapping sessions and their recorded
          results.
        </p>
        {d && (
          <small>
            {number(d.strategies, 0)} public strategies · {number(d.maps, 0)}{' '}
            recorded maps · {number(d.runs, 0)} contributed runs
            {(d.map_covered < d.strategies || d.run_covered < d.strategies) && (
              <> · Counts reported for {number(d.map_covered, 0)}/{number(d.strategies, 0)} strategies (maps), {number(d.run_covered, 0)}/{number(d.strategies, 0)} (runs)</>
            )}
          </small>
        )}
      </div>
      <div className="community-wealth">
        <span>Generational wealth</span>
        {d ? (
          <>
            <strong className={signedClass(d.net)}>{money(d.net, 'd')}</strong>
            <small>
              Recorded net profit · {d.covered}/{d.strategies} strategies with
              totals
            </small>
            <small>
              Currently public strategies; losses included.{' '}
              {d.net === null ? 'No historical profit totals are recorded.' : d.covered < d.strategies
                ? 'Incomplete coverage — this is a known subtotal.'
                : 'Each run retains its authored Divine value.'}
            </small>
          </>
        ) : error ? (
          <>
            <output>{error}</output>
            <button
              onClick={() => {
                setState({ league, data: null, error: null });
                setAttempt((n) => n + 1);
              }}
            >
              Retry community summary
            </button>
          </>
        ) : (
          <output>Loading recorded community totals…</output>
        )}
      </div>
    </section>
  );
}
