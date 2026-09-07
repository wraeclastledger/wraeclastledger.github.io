import type { EvidencePage, ListPage, StrategyDetail, Query } from './model';
import { queryParams, UUID } from './routes';
import { SORTS } from './model';
import { emptyPreferences, type Preferences } from './community-preferences';
import { preferenceParams, validateCommunity, validateCommunityPage, validateDiscoveryResponse, type Community, type CommunityPage } from './discovery';
export class ApiError extends Error {
  constructor(
    public kind:
      | 'offline'
      | 'timeout'
      | 'unavailable'
      | 'rate_limit'
      | 'changed'
      | 'invalid'
      | 'server',
    public retryAfter = 0,
  ) {
    super(kind);
  }
}
export const errorText = (error: ApiError) =>
  ({
    offline:
      'Could not reach the strategy service. Check your connection and retry.',
    timeout: 'The strategy service took too long to respond. Please retry.',
    unavailable: 'This strategy is no longer available.',
    rate_limit: error.retryAfter
      ? `Too many requests. Retry in ${error.retryAfter} seconds.`
      : 'Too many requests. Please wait before retrying.',
    changed:
      'The results changed while you were browsing. Reload the latest view to continue.',
    invalid: 'The strategy service returned an unsupported response.',
    server: 'The strategy service is unavailable. Please retry.',
  })[error.kind];
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
function safeTree(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number')
    return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  if (typeof value === 'string') return value.length <= 16000;
  if (Array.isArray(value))
    return value.length <= 100 && value.every((v) => safeTree(v, depth + 1));
  return (
    object(value) &&
    Object.keys(value).length <= 80 &&
    Object.values(value).every((v) => safeTree(v, depth + 1))
  );
}
function metrics(v: unknown): boolean {
  return (
    object(v) &&
    Object.values(v).every(
      (n) => n === null || (typeof n === 'number' && Number.isFinite(n)),
    )
  );
}
const metric = (v: unknown) =>
  v === null || (typeof v === 'number' && Number.isFinite(v));
const text = (v: unknown, max = 16000) =>
  v === null || (typeof v === 'string' && v.length <= max);
const date = (v: unknown) =>
  v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
const price = (v: unknown) =>
  object(v) && typeof v.name === 'string' && metric(v.price_each_chaos);
const cursor = (v: unknown) =>
  v === null || (typeof v === 'string' && v.length > 0 && v.length <= 2048);
function costs(v: unknown): boolean {
  return (
    v === null ||
    (object(v) &&
      (v.chisel === null || price(v.chisel)) &&
      Array.isArray(v.scarabs) &&
      v.scarabs.length <= 5 &&
      v.scarabs.every(price) &&
      (v.delirium === null ||
        (object(v.delirium) &&
          text(v.delirium.type) &&
          metric(v.delirium.count_per_map) &&
          metric(v.delirium.price_each_chaos))) &&
      (v.astrolabe === null ||
        (object(v.astrolabe) &&
          text(v.astrolabe.type) &&
          metric(v.astrolabe.count) &&
          metric(v.astrolabe.price_each_chaos))))
  );
}
function observedDelirium(v: unknown, maps: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (
    !object(v) ||
    !Number.isSafeInteger(v.sample_size) ||
    Number(v.sample_size) < 1 ||
    typeof maps !== 'number' ||
    Number(v.sample_size) > maps ||
    !Array.isArray(v.levels) ||
    v.levels.length < 1 ||
    v.levels.length > 11 ||
    !Array.isArray(v.rewards) ||
    v.rewards.length > 16
  )
    return false;
  const sample = Number(v.sample_size);
  return (
    v.levels.every(
      (l) =>
        object(l) &&
        Number.isSafeInteger(l.percentage) &&
        Number(l.percentage) >= 0 &&
        Number(l.percentage) <= 100 &&
        Number.isSafeInteger(l.count) &&
        Number(l.count) > 0 &&
        Number(l.count) <= sample,
    ) &&
    new Set(v.levels.map((l) => l.percentage)).size === v.levels.length &&
    v.levels.reduce((sum, l) => sum + Number(l.count), 0) === sample &&
    v.rewards.every(
      (r) =>
        object(r) &&
        typeof r.name === 'string' &&
        r.name.length > 0 &&
        r.name.length <= 64 &&
        Number.isSafeInteger(r.count) &&
        Number(r.count) > 0 &&
        Number(r.count) <= sample * 10,
    )
  );
}
function common(v: unknown): boolean {
  return (
    object(v) &&
    v.schema_version === 1 &&
    typeof v.id === 'string' &&
    UUID.test(v.id) &&
    text(v.league, 80) &&
    v.community === null &&
    v.attribution === null &&
    metric(v.score) &&
    date(v.published_at) &&
    date(v.updated_at) &&
    (v.title === null || typeof v.title === 'string') &&
    Array.isArray(v.tags) &&
    v.tags.length <= 24 &&
    v.tags.every((t) => typeof t === 'string' && t.length <= 48) &&
    metrics(v.observed)
  );
}
function setup(v: unknown): boolean {
  return (
    object(v) &&
    text(v.map_type, 32) &&
    text(v.chisel, 200) &&
    text(v.astrolabe, 200) &&
    (v.group_play === null || typeof v.group_play === 'boolean') &&
    metric(v.party_size) &&
    (v.delirium === null ||
      (object(v.delirium) &&
        text(v.delirium.type, 200) &&
        metric(v.delirium.count_per_map))) &&
    (v.multiplying_modifiers === null ||
      (object(v.multiplying_modifiers) &&
        (v.multiplying_modifiers.allocated === null ||
          typeof v.multiplying_modifiers.allocated === 'boolean') &&
        metric(v.multiplying_modifiers.fragment_count))) &&
    Array.isArray(v.scarabs) &&
    v.scarabs.length <= 5 &&
    v.scarabs.every((s) => typeof s === 'string' || price(s)) &&
    object(v.game_data) &&
    metric(v.game_data.revision) &&
    text(v.game_data.patch_version, 40)
  );
}
function loot(v: unknown): boolean {
  return (
    v === null ||
    (object(v) &&
      Array.isArray(v.rows) &&
      v.rows.length <= 30 &&
      v.rows.every(
        (r) =>
          object(r) &&
          typeof r.name === 'string' &&
          typeof r.category === 'string' &&
          typeof r.quantity === 'number' &&
          typeof r.value_chaos === 'number' &&
          text(r.note) &&
          typeof r.source === 'string' &&
          (r.valuation === null || metrics(r.valuation)) &&
          (r.identity === null ||
            (object(r.identity) &&
              typeof r.identity.kind === 'string' &&
              (!Object.hasOwn(r.identity, 'memory_strands') ||
                metric(r.identity.memory_strands)))),
      ) &&
      Array.isArray(v.categories) &&
      v.categories.every(
        (c) =>
          object(c) &&
          typeof c.category === 'string' &&
          typeof c.value_chaos === 'number',
      ))
  );
}
export function validateResponse(
  value: unknown,
  kind: 'list' | 'detail' | 'evidence',
): void {
  let valid = object(value) && value.schema_version === 1 && safeTree(value);
  if (valid && object(value)) {
    if (kind === 'list')
      valid =
        Array.isArray(value.strategies) &&
        value.strategies.length <= 25 &&
        new Set(value.strategies.map((r) => (object(r) ? r.id : null))).size ===
          value.strategies.length &&
        value.strategies.every(
          (r) =>
            common(r) && object(r) && metrics(r.results) && metrics(r.evidence),
        ) &&
        Number.isSafeInteger(value.total) &&
        Number(value.total) >= 0 &&
        cursor(value.next_cursor);
    if (kind === 'detail')
      valid =
        common(value) &&
        setup(value.setup) &&
        object(value.setup) &&
        object(value.setup.atlas) &&
        text(value.setup.atlas.url) &&
        metric(value.setup.atlas.points) &&
        metric(value.setup.atlas.points_max) &&
        text(value.setup.run_regex) &&
        text(value.setup.slam_regex) &&
        metrics(value.economics) &&
        object(value.coverage) &&
        Object.entries(value.coverage).every(([key, v]) =>
          key === 'loot_available' ? typeof v === 'boolean' : metric(v),
        ) &&
        loot(value.loot) &&
        (value.notes === null || typeof value.notes === 'string') &&
        (value.revision === null ||
          (Number.isSafeInteger(value.revision) && Number(value.revision) > 0));
    if (kind === 'evidence')
      valid =
        typeof value.strategy_id === 'string' &&
        UUID.test(value.strategy_id) &&
        Number.isSafeInteger(value.revision) &&
        Number(value.revision) > 0 &&
        Array.isArray(value.runs) &&
        value.runs.length <= 50 &&
        value.runs.every(
          (r) =>
            object(r) &&
            r.schema_version === 1 &&
            Number.isSafeInteger(r.ordinal) &&
            Number(r.ordinal) > 0 &&
            setup(r.setup) &&
            metrics(r.observed) &&
            metrics(r.economics) &&
            metrics(r.timing) &&
            date(r.contributed_on) &&
            costs(r.cost_breakdown) &&
            (r.display_cost_breakdown === undefined ||
              costs(r.display_cost_breakdown)) &&
            observedDelirium(
              r.observed_delirium,
              object(r.observed) ? r.observed.map_count : null,
            ) &&
            loot(r.loot),
        ) &&
        cursor(value.next_cursor);
  }
  if (!valid) throw new ApiError('invalid');
}
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}
export class PublicApi {
  preferences: Preferences = emptyPreferences();
  constructor(
    private base: string,
    private fetcher: typeof fetch = globalThis.fetch,
    private timeout = 15000,
    readonly discovery = false,
  ) {
    if (
      base.startsWith('//') ||
      base.includes('\\') ||
      !base ||
      /[?#]/.test(base)
    )
      throw new Error('Invalid API URL');
    if (!base.startsWith('/')) {
      const u = new URL(base);
      if (
        u.username ||
        u.password ||
        u.search ||
        u.hash ||
        !(
          u.protocol === 'https:' ||
          (u.protocol === 'http:' &&
            ['127.0.0.1', 'localhost'].includes(u.hostname))
        )
      )
        throw new Error('API URL must be public HTTPS or local loopback');
    }
    this.base = base.replace(/\/$/, '');
  }
  private async read<T>(
    path: string,
    kind: 'list' | 'detail' | 'evidence' | ((value: unknown) => void),
    signal: AbortSignal,
  ): Promise<T> {
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) ctrl.abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, this.timeout);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const fetcher = this.fetcher;
      const response = await withAbort(
        fetcher(this.base + path, {
          signal: ctrl.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'error',
          headers: { Accept: 'application/json' },
        }),
        ctrl.signal,
      );
      if (!response.ok) {
        const retry = response.headers.get('Retry-After');
        const seconds = retry
          ? Number(retry) || Math.ceil((Date.parse(retry) - Date.now()) / 1000)
          : 0;
        throw new ApiError(
          response.status === 404
            ? 'unavailable'
            : response.status === 429
              ? 'rate_limit'
              : response.status === 409
                ? 'changed'
                : 'server',
          Math.min(3600, Math.max(0, seconds || 0)),
        );
      }
      if (
        !response.headers.get('content-type')?.includes('application/json') ||
        !response.body
      )
        throw new ApiError('invalid');
      reader = response.body.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const chunk = await withAbort(reader.read(), ctrl.signal);
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 2 * 1024 * 1024) {
          void reader.cancel().catch(() => {});
          throw new ApiError('invalid');
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let data: unknown;
      try {
        data = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new ApiError('invalid');
      }
      if (typeof kind === 'function') kind(data);
      else if (this.discovery) validateDiscoveryResponse(data, kind);
      else validateResponse(data, kind);
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError('timeout');
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      throw new ApiError('offline');
    } finally {
      clearTimeout(timer);
      void reader?.cancel().catch(() => {});
      signal.removeEventListener('abort', abort);
    }
  }
  async list(query: Query, cursor: string | null, signal: AbortSignal) {
    const p = queryParams(query);
    if (this.discovery) preferenceParams(this.preferences).forEach((v, k) => p.set(k, v));
    else if (query.scope || query.community_id) throw new ApiError('unavailable');
    p.set('limit', '25');
    if (cursor) p.set('cursor', cursor);
    const page = await this.read<ListPage>((this.discovery ? '/discovery' : '') + '/strategies?' + p, 'list', signal);
    if (
      page.sort !== query.sort ||
      page.order !== query.order ||
      page.limit !== 25 ||
      !Object.hasOwn(SORTS, page.sort)
    )
      throw new ApiError('invalid');
    return page;
  }
  detail(id: string, signal: AbortSignal) {
    if (!UUID.test(id)) throw new ApiError('invalid');
    return this.read<StrategyDetail>((this.discovery ? '/discovery' : '') + '/strategies/' + id, 'detail', signal);
  }
  evidence(id: string, cursor: string | null, signal: AbortSignal) {
    if (!UUID.test(id)) throw new ApiError('invalid');
    const p = new URLSearchParams({ limit: '50' });
    if (cursor) p.set('cursor', cursor);
    return this.read<EvidencePage>(
      (this.discovery ? '/discovery' : '') + '/strategies/' + id + '/evidence?' + p,
      'evidence',
      signal,
    );
  }
  communities(search: string, league: string, cursor: string | null, signal: AbortSignal) {
    if (!this.discovery) throw new ApiError('unavailable');
    const p = preferenceParams(this.preferences);
    p.set('search', search.slice(0, 120)); p.set('league', league); p.set('limit', '25');
    if (cursor) p.set('cursor', cursor);
    return this.read<CommunityPage>('/discovery/communities?' + p, validateCommunityPage, signal);
  }
  community(id: string, league: string, signal: AbortSignal) {
    if (!this.discovery || !UUID.test(id)) throw new ApiError('unavailable');
    return this.read<Community>('/discovery/communities/' + id + '?' + new URLSearchParams({ league }), validateCommunity, signal);
  }
}
