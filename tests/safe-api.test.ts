import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import fixture from './safe-strategy-v2.json';
import listContract from './safe-strategy-list-v2.json';
import { buildPresentationFixtures } from './safe-strategy-presentation.mjs';
import { anonymousAuthor } from '../lib/safe-api';
import { safeDetail, safeList, safeEvidence, safeCatalogue, authorLabel, websiteSetup } from '../lib/safe-api';
import { PublicApi, validateResponse } from '../lib/api';
import { DEFAULT_QUERY, type EvidencePage } from '../lib/model';
import { BrowserController } from '../lib/browser-controller';
import { setupEvidence } from '../lib/setup-evidence';
import { decodeStrategySetupCode, encodeStrategySetupCode } from '../lib/vendor/strategy-setup';
import { assertBuildEnvironment } from '../scripts/build-policy.mjs';
const signal = () => new AbortController().signal;
const list = () => ({ schema_version: 2, scope: 'current', snapshot_key: null, read_version: fixture.detail.read_version,
  total: 1, limit: 25, sort: 'activity', order: 'desc', strategies: [structuredClone(fixture.row)], next_cursor: null });
const evidence = (): EvidencePage => ({ schema_version: 2, strategy_id: fixture.detail.id, revision: fixture.detail.revision,
  read_version: fixture.detail.read_version, runs: [{ ...structuredClone(fixture.run), schema_version: 2 }], next_cursor: null });
const response = (v: unknown) => new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json' } });

describe('shared safe website reader', () => {
  it('verifies generated bundle provenance and keeps the released validator closed to v2', () => {
    const root = new URL('../lib/vendor/', import.meta.url);
    const provenance = JSON.parse(readFileSync(new URL('safe-reader.provenance.json', root), 'utf8'));
    expect(createHash('sha256').update(readFileSync(new URL('safe-reader.js', root))).digest('hex')).toBe(provenance.bundleSha256);
    expect(createHash('sha256').update(readFileSync(new URL('./safe-strategy-v2.json', import.meta.url))).digest('hex')).toBe(provenance.fixture.sha256);
    expect(createHash('sha256').update(readFileSync(new URL('./safe-strategy-list-v2.json', import.meta.url))).digest('hex')).toBe(provenance.listFixture.sha256);
    expect(createHash('sha256').update(readFileSync(new URL('./safe-strategy-presentation.mjs', import.meta.url))).digest('hex')).toBe(provenance.presentation.sha256);
    expect(() => validateResponse(list(), 'list')).toThrow();
    expect(() => validateResponse(fixture.detail, 'detail')).toThrow();
  });
  it('preserves exact setup across current, partial-price and frozen records', () => {
    for (const raw of [fixture.detail, fixture.partialDetail, fixture.richDetail, fixture.frozen]) {
      const d = safeDetail(raw, raw.id, raw.scope === 'frozen' ? raw.snapshot_key : null);
      const setup = websiteSetup(d, null);
      if (raw.reusable_setup.status === 'available') {
        expect(setup).toBeTruthy();
        const { history: _history, ...reusable } = decodeStrategySetupCode(encodeStrategySetupCode(setup!))!;
        expect(reusable).toEqual(raw.reusable_setup.value);
      } else expect(setup).toBeNull();
    }
  });
  it('keeps zero, loss, duplicate slots and mixed Divine quotes honest', () => {
    const d = safeDetail(fixture.detail, fixture.detail.id), page = safeEvidence(evidence(), d);
    const setup = websiteSetup(d, page)!;
    expect(setup.scarabs.filter(s => s === 'Bestiary Scarab of the Herd')).toHaveLength(2);
    expect(setup.history).toMatchObject({ totalInvest: 0, netProfit: -2, divinePrice: 200 });
    d.coverage = { ...d.coverage, run_count: 2, map_count: 4 };
    page.runs.push({ ...page.runs[0], ordinal: 2, economics: { ...page.runs[0].economics, divine_price_chaos: 400 } });
    expect(websiteSetup(d, page)!.history).toMatchObject({ totalInvest: 0, netProfit: -4, divinePrice: null });
    expect(websiteSetup(d, { ...page, next_cursor: 'next' })!.history).toMatchObject({ totalInvest: null, netProfit: null });
  });
  it('rejects unknown/private fields, malformed aliases, unsafe URLs and wrong scope', () => {
    const raw = structuredClone(fixture.detail);
    for (const value of [{ ...raw, raw_export: 'private' }, { ...raw, community: { id: raw.id, name: 'not enabled' } },
      { ...raw, attribution: { ...raw.attribution, discord_user_id: 'private' } },
      { ...raw, setup: { ...raw.setup, atlas: { ...raw.setup.atlas, url: 'https://evil.test/' } } }])
      expect(() => safeDetail(value, raw.id)).toThrow();
    expect(() => safeDetail(fixture.frozen, fixture.frozen.id)).toThrow();
    expect(() => safeList({ ...list(), strategies: [fixture.frozen] })).toThrow();
    expect(() => safeList({ ...list(), total: 2, strategies: [fixture.row, fixture.row] })).toThrow();
    raw.attribution.display_name = 'किं'.repeat(32);
    expect(authorLabel(safeDetail(raw, raw.id))).toBe('By ' + raw.attribution.display_name);
    expect(authorLabel({ schema_version: 1, attribution: null })).toBeNull();
    expect(authorLabel({ schema_version: 2, attribution: null })).toBe('By Anonymous');
    expect(authorLabel({ schema_version: 2, attribution: { ...raw.attribution, status: 'retired' } })).toBe('By Anonymous');
    expect(anonymousAuthor({ schema_version: 2, attribution: { ...raw.attribution, status: 'active', display_name: 'Anonymous' } })).toBe(false);
  });
  it('accepts the exact shared server/desktop list contract, including frozen unknowns', () => {
    for (const { expected } of listContract.cases) {
      const page = { ...list(), scope: expected.scope, snapshot_key: expected.snapshot_key, strategies: [expected] };
      const { snapshot_schema_version: _snapshotVersion, ...display } = expected;
      expect(safeList(page, expected.snapshot_key).strategies[0]).toEqual(display);
      expect(() => safeList({ ...page, strategies: [{ ...expected, discord_username: 'PRIVATE' }] }, expected.snapshot_key)).toThrow();
    }
  });
  it('validates the same realistic presentation data as the desktop', () => {
    for (const { row, detail, runs } of buildPresentationFixtures().entries) {
      expect(safeList({ ...list(), strategies: [row] }).strategies[0]).toEqual(row);
      const d = safeDetail(detail, detail.id);
      expect(safeEvidence({ ...evidence(), strategy_id: d.id, revision: d.revision, read_version: d.read_version, runs }, d).runs).toEqual(runs);
    }
  });
  it('pins evidence requests to the current detail and never falls back to v1', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(list())).mockResolvedValueOnce(response(fixture.detail)).mockResolvedValueOnce(response(evidence()));
    const api = new PublicApi('/web/v2', fetcher, 15000, false, true);
    await api.list(DEFAULT_QUERY, null, signal());
    const d = await api.detail(fixture.detail.id, signal());
    await api.evidence(d.id, null, signal(), d);
    expect(String(fetcher.mock.calls[2][0])).toContain('format=covens-v1');
    expect(String(fetcher.mock.calls[2][0])).toContain('revision=2&read_version=' + d.read_version);
    for (const [url, options] of fetcher.mock.calls) {
      expect(url).toMatch(/^\/web\/v2\//); expect(options).toMatchObject({ cache: 'no-store', credentials: 'omit', redirect: 'error' });
    }
    expect(() => api.evidence(d.id, null, signal())).toThrow();
    fetcher.mockResolvedValue(response({ ...evidence(), read_version: fixture.snapshot }));
    await expect(api.evidence(d.id, null, signal(), d)).rejects.toMatchObject({ kind: 'invalid' });
  });
  it('rejects a same-revision evidence generation change, including setup copies', async () => {
    const d = safeDetail(fixture.detail, fixture.detail.id);
    const bad = { ...evidence(), read_version: fixture.snapshot };
    expect(() => safeEvidence(bad, d)).toThrow();
    await expect(setupEvidence({ evidence: vi.fn().mockResolvedValue(bad) }, d, null, signal())).rejects.toMatchObject({ kind: 'changed' });
    expect(websiteSetup(d, bad)).toBeNull();
  });
  it('does not merge list pages from a changed generation even with unchanged counts', async () => {
    const first = { ...list(), total: 2, next_cursor: 'next' };
    const second = { ...first, read_version: fixture.snapshot, next_cursor: null, strategies: [{ ...fixture.row, id: fixture.snapshot }] };
    const fetcher = vi.fn().mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response(second));
    const controller = new BrowserController(new PublicApi('/web/v2', fetcher, 15000, false, true));
    try {
      await controller.open({ view: 'list', query: DEFAULT_QUERY, pages: 1 }); await controller.more();
      expect(controller.state.error?.kind).toBe('changed'); expect(controller.state.page?.strategies).toHaveLength(1);
    } finally { controller.dispose(); }
  });
  it('keeps catalogue and frozen reads in their explicit namespace', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ schema_version: 2, snapshots: [] }))
      .mockResolvedValueOnce(response(fixture.frozen));
    const api = new PublicApi('/web/v2', fetcher, 15000, false, true);
    await api.catalogue(signal()); const d = await api.frozenDetail(fixture.snapshot, fixture.frozen.id, signal());
    expect(d.scope).toBe('frozen');
    const page = { ...evidence(), strategy_id: d.id, revision: d.revision, read_version: d.read_version };
    fetcher.mockResolvedValueOnce(response(page));
    await expect(api.evidence(d.id, null, signal(), d)).resolves.toMatchObject({ strategy_id: d.id });
    expect(fetcher.mock.calls[2][0]).toContain(`/retrospectives/${fixture.snapshot}/strategies/${d.id}/evidence?`);
    fetcher.mockResolvedValueOnce(response({ ...page, read_version: fixture.snapshot }));
    await expect(api.evidence(d.id, null, signal(), d)).rejects.toMatchObject({ kind: 'invalid' });
    expect(fetcher.mock.calls[1][0]).toBe(`/web/v2/retrospectives/${fixture.snapshot}/strategies/${d.id}?format=covens-v1`);
  });
  it('retains only recorded frozen totals and never assigns one quote to a pool', () => {
    const raw = structuredClone(fixture.frozen);
    raw.economics.total_invest_chaos = 0; raw.economics.net_profit_chaos = -2;
    const d = safeDetail(raw, raw.id, raw.snapshot_key);
    expect(websiteSetup(d, null)?.history).toMatchObject({ totalInvest: 0, netProfit: -2 });
    d.coverage.run_count = 2;
    expect(websiteSetup(d, null)?.history?.divinePrice).toBeNull();
    expect(() => safeDetail({ ...raw, continuation_setup: fixture.detail.continuation_setup }, raw.id, raw.snapshot_key)).toThrow();
  });
  it('validates opt-in Covens observations while preserving the closed legacy projection', () => {
    const raw = structuredClone(fixture.detail);
    const base = raw.reusable_setup.value;
    const next = { ...base, league: 'Covens', scarabs: [], delirium: null,
      covens: { version: 1, atlas: null, ember: 'allflame-ember-of-resplendence', threads: [] } };
    const enrichedDetail = safeDetail({ ...raw, league: 'Covens', reusable_setup: { status: 'available', value: next } }, raw.id);
    expect(websiteSetup(enrichedDetail, null)?.covens?.ember).toBe('allflame-ember-of-resplendence');
    const d = safeDetail(fixture.detail, fixture.detail.id);
    const original = evidence();
    const run = original.runs[0];
    const fields = { version: 1, atlas_drops: { sum: 0, count: 1 }, more_threads: null,
      threads: [], atlas: null, ember: null, orbs: [], delirium: null, encounters: null };
    const enriched = (covens: unknown) => ({ ...original, runs: [{ ...run, covens }] });
    expect(safeEvidence(enriched(fields), d).runs[0]).toHaveProperty('covens', fields);
    expect(() => safeEvidence(enriched({ ...fields, internal_note: 'synthetic' }), d)).toThrow();
  });
  it('bounds the catalogue and rejects repeated snapshot identities', async () => {
    const snapshot = { snapshot_key: fixture.snapshot, read_version: fixture.detail.read_version,
      league: 'Synthetic', cutoff_utc: null, frozen_at: null, strategy_count: 0 };
    expect(() => safeCatalogue({ schema_version: 2, snapshots: [snapshot, snapshot] })).toThrow();
    const fetcher = vi.fn().mockResolvedValue(response({ schema_version: 2, snapshots: [], padding: 'x'.repeat(256 * 1024) }));
    await expect(new PublicApi('/web/v2', fetcher, 15000, false, true).catalogue(signal())).rejects.toMatchObject({ kind: 'invalid' });
  });
  it('continues rejecting obsolete review flags in exports', () => {
    expect(() => assertBuildEnvironment({ VITE_SAFE_READER_REVIEW: '1' })).toThrow();
  });
});
