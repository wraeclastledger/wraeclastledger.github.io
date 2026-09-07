import { ApiError, PublicApi } from './api';
import type { ListPage, StrategyDetail, EvidencePage } from './model';
import type { Route } from './routes';
export interface BrowserState {
  generation: number;
  loading: boolean;
  moreLoading: boolean;
  error: ApiError | null;
  page: ListPage | null;
  retainedPage: boolean;
  detail: StrategyDetail | null;
  evidence: EvidencePage | null;
  evidenceError: ApiError | null;
  pages: number;
}
export class BrowserController {
  state: BrowserState = {
    generation: 0,
    loading: false,
    moreLoading: false,
    error: null,
    page: null,
    retainedPage: false,
    detail: null,
    evidence: null,
    evidenceError: null,
    pages: 0,
  };
  private ctrl = new AbortController();
  private route: Route = { view: 'missing' };
  private listeners = new Set<() => void>();
  constructor(private api: PublicApi) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private set(patch: Partial<BrowserState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  invalidate() {
    this.ctrl.abort();
    this.ctrl = new AbortController();
    this.set({
      generation: this.state.generation + 1,
      loading: false,
      moreLoading: false,
    });
  }
  dispose() {
    this.invalidate();
    this.listeners.clear();
  }
  async open(route: Route, retain = true) {
    const retained =
      (route.view === 'list' || route.view === 'community') &&
      retain && route.view === this.route.view &&
      (this.route.view === 'list' || this.route.view === 'community') &&
      route.query.scope === this.route.query.scope && route.query.community_id === this.route.query.community_id
        ? this.state.page
        : null;
    this.invalidate();
    this.route = route;
    const generation = this.state.generation;
    const signal = this.ctrl.signal;
    const owns = () => generation === this.state.generation && !signal.aborted;
    this.set({
      page: retained,
      retainedPage: !!retained,
      detail: null,
      evidence: null,
      error: null,
      evidenceError: null,
      pages: 0,
      loading:
        route.view === 'list' ||
        route.view === 'community' ||
        route.view === 'detail',
    });
    try {
      if (route.view === 'list' || route.view === 'community') {
        let page = await this.api.list(route.query, null, signal);
        if (!owns()) return;
        let pages = 1;
        this.set({ page, pages, retainedPage: false });
        while (pages < route.pages && page.next_cursor) {
          const next = await this.api.list(
            route.query,
            page.next_cursor,
            signal,
          );
          if (!owns()) return;
          page = this.mergePage(page, next);
          pages++;
          this.set({ page, pages, retainedPage: false });
        }
      } else if (route.view === 'detail') {
        const detail = await this.api.detail(route.id, signal);
        if (!owns()) return;
        if (detail.id !== route.id) throw new ApiError('invalid');
        this.set({ detail });
        try {
          const evidence = await this.api.evidence(route.id, null, signal);
          if (!owns()) return;
          this.validateEvidence(detail, evidence);
          this.set({ evidence });
        } catch (error) {
          if (owns()) this.set({ evidenceError: this.error(error) });
        }
      }
    } catch (error) {
      if (owns()) this.set({ error: this.error(error) });
    } finally {
      if (owns()) this.set({ loading: false });
    }
  }
  private error(value: unknown) {
    return value instanceof ApiError ? value : new ApiError('server');
  }
  private mergePage(page: ListPage, next: ListPage) {
    if (
      next.sort !== page.sort ||
      next.order !== page.order ||
      next.total !== page.total ||
      (!!next.next_cursor && next.next_cursor === page.next_cursor) ||
      page.strategies.length + next.strategies.length > next.total ||
      next.strategies.some((n) => page.strategies.some((p) => p.id === n.id))
    )
      throw new ApiError('changed');
    return { ...next, strategies: [...page.strategies, ...next.strategies] };
  }
  private validateEvidence(detail: StrategyDetail, page: EvidencePage) {
    if (page.strategy_id !== detail.id || page.revision !== detail.revision)
      throw new ApiError('changed');
    const ordinals = page.runs.map((r) => r.ordinal);
    if (
      new Set(ordinals).size !== ordinals.length ||
      ordinals.some((v, i) => i > 0 && v <= ordinals[i - 1])
    )
      throw new ApiError('invalid');
  }
  async more() {
    if (
      this.state.retainedPage ||
      this.state.loading ||
      this.state.moreLoading ||
      this.state.pages >= 10
    )
      return;
    const { page, detail, evidence, generation } = this.state;
    const route = this.route;
    const signal = this.ctrl.signal;
    const owns = () => generation === this.state.generation && !signal.aborted;
    if (!(page?.next_cursor || evidence?.next_cursor)) return;
    this.set({ moreLoading: true, error: null, evidenceError: null });
    try {
      if (
        page?.next_cursor &&
        (route.view === 'list' || route.view === 'community')
      ) {
        const next = await this.api.list(route.query, page.next_cursor, signal);
        if (owns())
          this.set({
            page: this.mergePage(page, next),
            pages: this.state.pages + 1,
          });
      } else if (detail && evidence?.next_cursor) {
        const next = await this.api.evidence(
          detail.id,
          evidence.next_cursor,
          signal,
        );
        if (!owns()) return;
        this.validateEvidence(detail, next);
        if (
          evidence.runs.length + next.runs.length > 100 ||
          (next.next_cursor && next.next_cursor === evidence.next_cursor)
        )
          throw new ApiError('invalid');
        if (
          next.runs.some(
            (r) => r.ordinal <= (evidence.runs.at(-1)?.ordinal || 0),
          )
        )
          throw new ApiError('changed');
        this.set({
          evidence: { ...next, runs: [...evidence.runs, ...next.runs] },
        });
      }
    } catch (error) {
      if (owns())
        this.set(
          detail
            ? { evidenceError: this.error(error) }
            : { error: this.error(error) },
        );
    } finally {
      if (owns()) this.set({ moreLoading: false });
    }
  }
}
