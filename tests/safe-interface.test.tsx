// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Home from '../app/page';
import fixture from './safe-strategy-v2.json';
let root: Root;
let host: HTMLDivElement;
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 60)); });
beforeEach(() => {
  vi.stubEnv('DEV', true); vi.stubEnv('VITE_SAFE_READER_REVIEW', '1');
  vi.stubEnv('VITE_PUBLIC_API_URL', '/web/v2');
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  Object.defineProperty(window, 'matchMedia', { configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  localStorage.clear(); history.replaceState(null, '', '/#/');
  const name = 'किं'.repeat(32);
  vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
    const u = new URL(String(url), 'http://localhost');
    const value = u.pathname.endsWith('/evidence') ? {
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
