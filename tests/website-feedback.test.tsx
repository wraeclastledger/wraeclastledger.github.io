// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Home from '../app/page';
import { CopyNotice } from '../components/copy-notice';
import { decodeStrategySetupCode } from '../lib/vendor/strategy-setup';
import { detail, evidence, id, page, row } from './fixtures.mjs';

let root: Root;
let host: HTMLDivElement;
const respond = (value: unknown) => new Response(JSON.stringify(value), {
  headers: { 'Content-Type': 'application/json' },
});
const advance = async (ms: number) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
};
const input = async (value: string) => {
  const field = host.querySelector('#strategy-search') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const requestUrl = (url: RequestInfo | URL) => new URL(
  typeof url === 'string' ? url : url instanceof URL ? url.href : url.url, 'http://localhost');
const requests = () => vi.mocked(fetch).mock.calls.map(([url]) => requestUrl(url));
const mount = async () => {
  await act(async () => root.render(<Home />));
  await advance(30);
  vi.mocked(fetch).mockClear();
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 1));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  localStorage.clear();
  history.replaceState(null, '', '/#/?league=');
  vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
    const u = new URL(String(url), 'http://localhost');
    const term = (u.searchParams.get('search') || '').toLowerCase();
    return respond(u.pathname.endsWith('/evidence') ? evidence()
      : u.pathname.endsWith('/' + id(1)) ? detail()
      : page([row(1), row(2)].filter((r) => r.title.toLowerCase().includes(term)), {
        sort: u.searchParams.get('sort') || 'activity',
        order: u.searchParams.get('order') || 'desc',
      }));
  }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('debounces search, matches while deleting, restores all matches at empty and keeps focus/history stable', async () => {
  await mount();
  const field = host.querySelector('#strategy-search') as HTMLInputElement;
  field.focus();
  const depth = history.state.depth;
  const length = history.length;
  await input('Best');
  await advance(200);
  await input('Bestiary');
  await advance(299);
  expect(requests()).toHaveLength(0);
  await advance(1);
  expect(requests()).toHaveLength(1);
  expect(requests()[0].searchParams.get('search')).toBe('Bestiary');
  expect(host.querySelectorAll('tbody tr')).toHaveLength(1);
  await input('Best');
  await advance(300);
  expect(requests().at(-1)?.searchParams.get('search')).toBe('Best');
  await input('');
  await advance(300);
  expect(requests().at(-1)?.searchParams.has('search')).toBe(false);
  expect(host.querySelectorAll('tbody tr')).toHaveLength(2);
  expect(document.activeElement).toBe(field);
  expect(history.length).toBe(length);
  expect(history.state.depth).toBe(depth);
});

it('applies a pending search with another filter and cancels it when filters are cleared', async () => {
  await mount();
  await input('Best');
  const select = host.querySelector('#filter-map_type') as HTMLSelectElement;
  await act(async () => {
    select.value = '8-mod';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(requests().at(-1)?.searchParams.get('search')).toBe('Best');
  expect(requests().at(-1)?.searchParams.get('map_type')).toBe('8-mod');
  await advance(350);
  expect(requests()).toHaveLength(1);
  await input('Harvest');
  await act(async () => (host.querySelector('.clear-filters') as HTMLButtonElement).click());
  const count = requests().length;
  await advance(350);
  expect(requests()).toHaveLength(count);
  expect(requests().at(-1)?.searchParams.has('search')).toBe(false);
  expect((host.querySelector('#strategy-search') as HTMLInputElement).value).toBe('');
});

it('does not let pending typing navigate back from another page', async () => {
  await mount();
  await input('Best');
  await act(async () => (host.querySelector('footer a[href="#/privacy"]') as HTMLAnchorElement).click());
  await advance(350);
  expect(requests()).toHaveLength(0);
  expect(location.hash).toBe('#/privacy');
});

it('waits for composition completion and lets Enter flush a pending search once', async () => {
  await mount();
  const field = host.querySelector('#strategy-search')!;
  await act(async () => field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await input('森');
  await advance(400);
  expect(requests()).toHaveLength(0);
  await act(async () => field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await advance(300);
  expect(requests().at(-1)?.searchParams.get('search')).toBe('森');
  await input('Bestiary');
  await act(async () => field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  const count = requests().length;
  await advance(350);
  expect(requests()).toHaveLength(count);
  expect(requests().at(-1)?.searchParams.get('search')).toBe('Bestiary');
});

it('copies reusable setup and available history even when structured run costs are missing', async () => {
  const e = evidence();
  e.runs = e.runs.map((run) => ({ ...run, cost_breakdown: null })) as never;
  vi.mocked(fetch).mockImplementation(async (url) => respond(requestUrl(url).pathname.endsWith('/evidence') ? e : detail()));
  history.replaceState(null, '', '#/strategy/' + id(1));
  await mount();
  const copy = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Copy setup code'))!;
  expect(copy.disabled).toBe(false);
  expect(copy.getAttribute('aria-describedby')).toBe('setup-code-version');
  expect(host.querySelector('#setup-code-version')?.textContent).toContain('1.0.97');
  expect(host.querySelector('a[href^="https://pathofpathing.com/"]')).not.toBeNull();
  expect(host.querySelector('.toast')).toBeNull();
  const writeText = vi.fn(async (_text: string) => {});
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  await act(async () => copy.click());
  const decoded = decodeStrategySetupCode(writeText.mock.calls[0][0]);
  expect(decoded?.scarabs).toEqual(detail().setup.scarabs.map((s) => s.name));
  expect(decoded?.history).toMatchObject({ scarabPrices: [4, 8], totalInvest: 400, netProfit: -100 });
  expect(host.querySelector('.toast')?.textContent).toContain('Copied');
  await advance(5000);
  expect(host.querySelector('.toast')).toBeNull();
});

it('keeps Copy enabled when a complete run exists', async () => {
  history.replaceState(null, '', '#/strategy/' + id(1));
  await mount();
  const copy = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Copy setup code'))!;
  expect(copy.disabled).toBe(false);
  expect(host.querySelector('#setup-code-unavailable')).toBeNull();
});

it('renders the privacy spacing and a private email contact', async () => {
  history.replaceState(null, '', '#/privacy');
  await mount();
  expect(host.textContent).toContain('Clearing browser storage removes your theme choice.');
  expect(host.querySelector('article a[href="mailto:wraeclastledger@gmail.com"]')?.textContent).toBe('wraeclastledger@gmail.com');
  expect(host.querySelector('article a[href$="/issues"]')).toBeNull();
});

it('dismisses success after five seconds, pauses while focused, and keeps manual-copy notices available', async () => {
  const dismiss = vi.fn();
  await act(async () => root.render(<CopyNotice message="Copied to clipboard." persistent={false} onDismiss={dismiss} />));
  await advance(4999);
  expect(dismiss).not.toHaveBeenCalled();
  await act(async () => host.querySelector('button')!.focus());
  await advance(6000);
  expect(dismiss).not.toHaveBeenCalled();
  await act(async () => host.querySelector('button')!.blur());
  await advance(5000);
  expect(dismiss).toHaveBeenCalledTimes(1);
  dismiss.mockClear();
  await act(async () => root.render(<CopyNotice message="Select and copy the text." persistent onDismiss={dismiss} />));
  await advance(20000);
  expect(dismiss).not.toHaveBeenCalled();
  await act(async () => host.querySelector('button')!.click());
  expect(dismiss).toHaveBeenCalledTimes(1);
});
