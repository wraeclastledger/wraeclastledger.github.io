// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Home from '../app/page';
import fixture from './safe-strategy-v2.json';
import { decodeStrategySetupCode } from '../lib/vendor/strategy-setup';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
// Load the file-backed shared fixture as Node ESM, not a jsdom URL transform.
const { buildPresentationFixtures } = createRequire(pathToFileURL(`${process.cwd()}/package.json`))(
  './tests/safe-strategy-presentation.mjs',
) as typeof import('./safe-strategy-presentation.mjs');
let root: Root;
let host: HTMLDivElement;
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 60)); });
const requestUrl = (url: RequestInfo | URL) => new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url, 'http://localhost');
beforeEach(() => {
  vi.stubEnv('DEV', false); vi.stubEnv('VITE_SAFE_READER_REVIEW', '');
  vi.stubEnv('VITE_PUBLIC_API_URL', '/web/v2');
  vi.stubEnv('VITE_SUMMARY_API_URL', '/web/v1');
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  Object.defineProperty(window, 'matchMedia', { configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  localStorage.clear(); history.replaceState(null, '', '/#/');
  const name = 'किं'.repeat(32);
  vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
    const u = new URL(String(url), 'http://localhost');
    const value = u.searchParams.get('summary') === 'community' ? {
      schema_version: 1, summary: { strategies: 75, covered: 70, net: -17.125, maps: 1500, runs: 150, map_covered: 75, run_covered: 75 },
    } : u.pathname.endsWith('/evidence') ? {
      schema_version: 2, strategy_id: fixture.detail.id, revision: fixture.detail.revision,
      read_version: fixture.detail.read_version, runs: [fixture.run], next_cursor: null,
    } : u.pathname.endsWith('/' + fixture.detail.id) ? {
      ...fixture.detail, attribution: { ...fixture.detail.attribution, display_name: name },
    } : {
      schema_version: 2, scope: 'current', snapshot_key: null, read_version: fixture.detail.read_version,
      total: 1, limit: 25, sort: u.searchParams.get('sort'), order: u.searchParams.get('order'),
      strategies: [{ ...fixture.row, attribution: { ...fixture.row.attribution, display_name: name } }], next_cursor: null,
    };
    return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  }));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
it('renders the successor list name as wrapping text, without an identity link', async () => {
  await act(async () => root.render(<Home />)); await settle();
  const name = [...host.querySelectorAll('span')].find(el => el.textContent === 'By ' + 'किं'.repeat(32));
  expect(name).toBeTruthy(); expect(name?.style.overflowWrap).toBe('anywhere');
  expect(name?.closest('a')).toBeNull();
  const reads = vi.mocked(fetch).mock.calls.map(([url]) => typeof url === 'string' ? url : '');
  expect(reads.some(url => url.startsWith('/web/v2/strategies?'))).toBe(true);
  expect(reads.some(url => url.startsWith('/strategies'))).toBe(false);
});
it('renders the successor detail and pins its evidence generation', async () => {
  history.replaceState(null, '', '#/strategy/' + fixture.detail.id);
  await act(async () => root.render(<Home />)); await settle();
  expect(host.textContent).toContain('By ' + 'किं'.repeat(32));
  expect(host.querySelector('.wl-metric')).not.toBeNull();
  expect(vi.mocked(fetch).mock.calls.some(([url]) => {
    const u = new URL(typeof url === 'string' ? url : '', 'http://localhost');
    return u.pathname.endsWith('/evidence') && u.searchParams.get('revision') === '2'
      && u.searchParams.get('read_version') === fixture.detail.read_version;
  })).toBe(true);
  expect(host.textContent).not.toContain('unsupported response');
});
it.each(['__proto__', 'constructor', 'toString', 'Unknown category'])
  ('renders the shared long-name detail with category %s safely', async categoryName => {
  const { entries, readVersion } = buildPresentationFixtures();
  const entry = entries.find(entry => entry.detail.loot?.categories.some((category: { category: string }) => category.category === '__proto__'))!;
  expect(entry).toBeTruthy();
  entry.detail.loot.categories.find((category: { category: string }) => category.category === '__proto__').category = categoryName;
  vi.mocked(fetch).mockImplementation(async url => Response.json(
    requestUrl(url).pathname.endsWith('/evidence') ? {
      schema_version: 2, strategy_id: entry.row.id, revision: entry.row.revision,
      read_version: readVersion, runs: entry.runs, next_cursor: null,
    } : entry.detail,
  ));
  history.replaceState(null, '', '#/strategy/' + entry.row.id);
  await act(async () => root.render(<Home />)); await settle();
  expect(host.querySelector('#detail-title')?.textContent).toBe(entry.row.title);
  expect(host.textContent).toContain(entry.row.attribution.display_name);
  expect(host.querySelector('.category-grid')?.textContent).toContain(categoryName);
});
it('uses the production reader and independent summary together without review activation', async () => {
  history.replaceState(null, '', '#/community/home');
  await act(async () => root.render(<Home />)); await settle();
  expect(host.textContent).toContain('By ' + 'किं'.repeat(32));
  expect(host.textContent).toContain('-17.125d');
  const reads = vi.mocked(fetch).mock.calls.map(([url]) => requestUrl(url));
  expect(reads.some(u => u.pathname === '/web/v2/strategies')).toBe(true);
  expect(reads.filter(u => u.pathname.startsWith('/web/v1'))).toHaveLength(1);
  expect(reads.find(u => u.pathname.startsWith('/web/v1'))?.searchParams.get('summary')).toBe('community');
});
it.each([[null, 'By Anonymous'], [{ ...fixture.detail.attribution, status: 'retired', display_name: null }, 'By Anonymous']])
  ('renders Anonymous without changing absent/retired attribution state', async (attribution, label) => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...fixture.detail, attribution }));
    history.replaceState(null, '', '#/strategy/' + fixture.detail.id);
    await act(async () => root.render(<Home />)); await settle();
    expect(host.textContent).toContain(label);
    expect(host.textContent).not.toContain(fixture.detail.attribution.display_name);
    const fallback = host.querySelector('[title="No public author name displayed"]') as HTMLElement;
    expect(fallback.style.fontStyle).toBe('italic');
    expect(fallback.style.color).toBe('var(--muted)');
    expect(fallback.getAttribute('aria-label')).toBe('By Anonymous — No public author name displayed');
  });
it.each([[503, 'temporarily unavailable', 'Retry'], [410, 'no longer supported', 'Reload website']])
  ('explains HTTP %i without fallback requests', async (status, label, button) => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({error:'held'}, {status:Number(status)}));
    await act(async () => root.render(<Home />)); await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(label);
    expect(host.querySelector('[title="No public author name displayed"]')).toBeNull();
    expect([...host.querySelectorAll('button')].some(b => b.textContent === button)).toBe(true);
    expect(vi.mocked(fetch).mock.calls.every(([url]) => requestUrl(url).pathname.startsWith('/web/v2/'))).toBe(true);
  });
it.each(['complete', 'unavailable', 'changed', 'invalid', 'removed'])('copies only safe setup/history for %s evidence', async (mode) => {
  vi.mocked(fetch).mockImplementation(async (url: unknown) => {
    if (!new URL(String(url), 'http://localhost').pathname.endsWith('/evidence')) return Response.json(fixture.detail);
    if (mode === 'unavailable') return Response.json({error:'held'}, {status:503});
    if (mode === 'removed') return Response.json({error:'unavailable'}, {status:404});
    if (mode === 'changed') return Response.json({error:'changed'}, {status:409});
    return Response.json({ schema_version: 2, strategy_id: fixture.detail.id, revision: fixture.detail.revision,
      read_version: fixture.detail.read_version, runs: [fixture.run], next_cursor: null,
      ...(mode === 'invalid' ? {private_field:'must reject'} : {}) });
  });
  const writeText = vi.fn(async (_value: string) => {});
  Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{writeText} });
  history.replaceState(null, '', '#/strategy/' + fixture.detail.id);
  await act(async () => root.render(<Home />)); await settle();
  const button = [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Copy setup code'))!;
  await act(async () => button.click()); await settle();
  if (mode === 'changed' || mode === 'invalid' || mode === 'removed') {
    expect(writeText).not.toHaveBeenCalled();
    expect(host.textContent).toContain(mode === 'changed' ? 'results changed' : mode === 'removed' ? 'no longer available' : 'unsupported response');
  } else {
    const result = decodeStrategySetupCode(writeText.mock.calls[0][0]);
    if (mode === 'complete') expect(result?.history).toMatchObject({totalInvest:0, netProfit:-2, divinePrice:200});
    else {
      expect(result).toEqual(fixture.detail.reusable_setup.value);
      expect(host.textContent).toContain('Optional run history was unavailable');
    }
  }
});
