// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Home from '../app/page';
import { page, row, detail, evidence, id } from './fixtures.mjs';
let root: Root;
let host: HTMLDivElement;
const response = (v: unknown) =>
  new Response(JSON.stringify(v), {
    headers: { 'Content-Type': 'application/json' },
  });
const settle = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 35));
  });
};
const click = async (el: Element | null) => {
  expect(el).not.toBeNull();
  await act(async () => {
    (el as HTMLElement).click();
  });
  await settle();
};
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) =>
    setTimeout(() => fn(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
  history.replaceState(null, '', '/#/');
  localStorage.clear();
  document.documentElement.dataset.theme = 'dark';
  vi.stubGlobal(
    'fetch',
    vi.fn((url: unknown) => {
      const u = new URL(String(url), 'http://localhost');
      return Promise.resolve(
        response(
          u.pathname.endsWith('/evidence')
            ? evidence()
            : u.pathname.endsWith('/' + id(1))
              ? detail()
              : page([row(1), row(2)], {
                  sort: u.searchParams.get('sort') || 'activity',
                  order: u.searchParams.get('order') || 'desc',
                }),
        ),
      );
    }),
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const mount = async () => {
  await act(async () => root.render(<Home />));
  await settle();
};
describe.each(['default', 'legacy prototype link'])(
  '%s rendered browser interactions',
  (design) => {
    beforeEach(() => {
      history.replaceState(
        null,
        '',
        design === 'legacy prototype link' ? '/?design=prototype#/' : '/#/',
      );
    });
    it('renders the preferred layout on direct detail links without a design switch', async () => {
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      expect(host.querySelector('.site.wl-page')).not.toBeNull();
      expect(host.querySelector('.wl-section')).not.toBeNull();
      expect(host.querySelector('.wl-metric')).not.toBeNull();
    });
    it('keeps a manual refresh on cooldown after a fast response', async () => {
      await mount();
      const refresh = host.querySelector(
        'button[aria-label="Refresh strategies"]',
      ) as HTMLButtonElement;
      await click(refresh);
      expect(refresh.disabled).toBe(true);
      expect(refresh.title).toContain('Refresh available in');
      const count = vi.mocked(fetch).mock.calls.length;
      await click(refresh);
      expect(vi.mocked(fetch).mock.calls.length).toBe(count);
    });
    it('omits duplicate contributed runs for a single-run strategy', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn((url: unknown) => {
          const s = detail();
          s.coverage.run_count = 1;
          const e = evidence();
          e.runs = e.runs.slice(0, 1);
          return Promise.resolve(
            response(String(url).endsWith('/evidence') ? e : s),
          );
        }),
      );
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      expect(host.textContent).not.toContain('Contributed runs');
      expect(host.querySelector('.loot')).not.toBeNull();
    });
    it('uses recorded prices for the loot-unit switch and preserves category proportions', async () => {
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      const before = host.querySelector('.category-core small')?.textContent;
      await click(host.querySelector('.loot-units button:nth-child(2)'));
      expect(host.querySelector('.category-core strong')?.textContent).toBe(
        '0.4d',
      );
      expect(host.querySelector('.category-core small')?.textContent).toBe(
        before,
      );
      await click(host.querySelector('.loot-units button:first-child'));
      expect(host.querySelector('.category-core strong')?.textContent).toBe(
        '40c',
      );
      expect(host.textContent).toContain('Contributed runs');
    });
    it('keeps dropdown and metric-header sorting in sync', async () => {
      await mount();
      await click(
        [...host.querySelectorAll('thead button')].find(
          (el) => el.textContent === 'Cost / map',
        )!,
      );
      expect(
        (host.querySelector('#filter-sort') as HTMLSelectElement).value,
      ).toBe('cost_per_map');
      expect(
        host.querySelector('th[aria-sort]')?.getAttribute('aria-sort'),
      ).toBe('ascending');
      await click(
        [...host.querySelectorAll('thead button')].find((el) =>
          el.textContent?.startsWith('Cost / map'),
        )!,
      );
      expect(
        host.querySelector('th[aria-sort]')?.getAttribute('aria-sort'),
      ).toBe('descending');
    });
    it('opens a detail with a truthful Back label and ignores repeated community clicks', async () => {
      await mount();
      await click(host.querySelector('tbody td a'));
      expect(host.querySelector('h1')?.textContent).toBe(
        'WraeclastLedger community',
      );
      const depth = history.state.depth;
      await click(host.querySelector('tbody td a'));
      expect(history.state.depth).toBe(depth);
      await click(host.querySelector('tbody th a'));
      expect(host.querySelector('.back')?.textContent).toBe(
        'Back to WraeclastLedger community',
      );
    });
    it('supports direct detail entry and a skip link without changing the route', async () => {
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      expect(host.querySelector('h1')?.textContent).toBe(detail().title);
      expect(host.querySelector('.back')?.textContent).toBe(
        'Browse strategies',
      );
      const hash = location.hash;
      await click(host.querySelector('.skip'));
      expect(location.hash).toBe(hash);
      expect(document.activeElement?.tagName).toBe('MAIN');
    });
    it('shows clipboard denial in a selectable modal and returns focus', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockRejectedValue(Error('denied')) },
      });
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      const button = host.querySelector(
        '[aria-label="Copy Run regex"]',
      ) as HTMLButtonElement;
      button.focus();
      await click(button);
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      expect(
        (document.querySelector('textarea') as HTMLTextAreaElement).value,
      ).toBe(detail().setup.run_regex);
      expect(document.body.textContent).toContain(
        'Automatic copy was unavailable',
      );
      await click(
        [...document.querySelectorAll('button')].find(
          (b) => b.textContent === 'Done',
        )!,
      );
      expect(document.querySelector('[role=dialog]')).toBeNull();
      expect(document.activeElement).toBe(button);
    });
    it('does not open an old clipboard-failure dialog after navigation', async () => {
      let reject!: (error: Error) => void;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () =>
            new Promise<void>((_, r) => {
              reject = r;
            }),
        },
      });
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      await click(host.querySelector('[aria-label="Copy Run regex"]'));
      await click(host.querySelector('footer a[href="#/about"]'));
      await act(async () => reject(Error('late')));
      expect(document.querySelector('[role=dialog]')).toBeNull();
      expect(host.querySelector('h1')?.textContent).toBe(
        'About the Strategy Browser',
      );
    });
    it('uses an explicit saved theme and discloses storage failure', async () => {
      localStorage.setItem('wraeclastledger-web-theme-v1', 'light');
      await mount();
      expect(document.documentElement.dataset.theme).toBe('light');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw Error('blocked');
      });
      await click(host.querySelector('[aria-label="Dark theme"]'));
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(host.textContent).toContain('Theme changed for this tab only');
    });
    it('deduplicates paired popstate/hashchange events', async () => {
      await mount();
      const fetcher = vi.mocked(fetch);
      fetcher.mockClear();
      history.replaceState(null, '', '#/about');
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(host.querySelector('h1')?.textContent).toBe(
        'About the Strategy Browser',
      );
      history.replaceState(null, '', '#/');
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      await settle();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('keeps five inline tags and labels the remaining-tag trigger for its strategy', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(response(page([row(6)])))),
      );
      await mount();
      const hash = location.hash;
      const tags = host.querySelector('.tags-compact')!;
      expect(tags.querySelectorAll('.tag')).toHaveLength(5);
      const opener = tags.querySelector('button') as HTMLButtonElement;
      expect(opener.getAttribute('aria-label')).toBe('Show 7 more tags for Community strategy 06');
      expect(opener.getAttribute('aria-expanded')).toBe('false');
      expect(document.querySelector('.tag-popover')).toBeNull();
      expect(location.hash).toBe(hash);
    });
    it('treats About and Privacy as one detour and restores expanded evidence on Back', async () => {
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      await click(
        [...host.querySelectorAll('button')].find(
          (b) => b.textContent === 'Show item breakdown (2 rows)',
        )!,
      );
      expect(history.state.disclosures.pooled).toBe(true);
      await click(host.querySelector('footer a[href="#/about"]'));
      const depth = history.state.depth;
      await click(host.querySelector('footer a[href="#/privacy"]'));
      expect(history.state.depth).toBe(depth);
      expect(host.querySelector('.back')?.textContent).toBe('Back to strategy');
      expect(window.scrollTo).toHaveBeenLastCalledWith({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      await click(host.querySelector('.back'));
      await settle();
      expect(location.hash).toBe('#/strategy/' + id(1));
      expect(host.querySelector('.loot-table')).not.toBeNull();
    });

    it('retains the full long title behind its disclosure', async () => {
      const title = 'A deliberately long strategy title '.repeat(15);
      vi.stubGlobal(
        'fetch',
        vi.fn((url: unknown) =>
          Promise.resolve(
            response(
              String(url).endsWith('/evidence')
                ? evidence()
                : { ...detail(), title },
            ),
          ),
        ),
      );
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      expect(host.querySelector('h1')?.textContent).toBe(title);
      expect(
        host.querySelector('h1')?.classList.contains('clamped-title'),
      ).toBe(true);
      await click(
        [...host.querySelectorAll('button')].find(
          (b) => b.textContent === 'Show full title',
        )!,
      );
      expect(
        host.querySelector('h1')?.classList.contains('clamped-title'),
      ).toBe(false);
      expect(history.state.disclosures.title).toBe(true);
    });
    it('keeps the visible table and sort-button focus while refreshing', async () => {
      await mount();
      let resolve!: (v: Response) => void;
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      );
      const toggle = host.querySelector(
        'button[aria-label="Sort ascending"]',
      ) as HTMLButtonElement;
      toggle.focus();
      await click(toggle);
      expect(host.querySelectorAll('tbody tr')).toHaveLength(2);
      expect(document.activeElement).toBe(toggle);
      expect(
        host.querySelector('.strategy-table-wrap')?.getAttribute('aria-busy'),
      ).toBe('true');
      expect(host.textContent).toContain('Previous results remain visible.');
      await act(async () =>
        resolve(response(page([row(2)], { order: 'asc' }))),
      );
      await settle();
      expect(host.querySelectorAll('tbody tr')).toHaveLength(1);
    });
    it('keeps negative category values visible without inventing positive proportions', async () => {
      const sample = structuredClone(detail());
      sample.loot.categories[0].value_chaos = -40;
      vi.stubGlobal(
        'fetch',
        vi.fn((url: unknown) =>
          Promise.resolve(
            response(String(url).endsWith('/evidence') ? evidence() : sample),
          ),
        ),
      );
      history.replaceState(null, '', '#/strategy/' + id(1));
      await mount();
      expect(host.querySelector('.loot-bar')).toBeNull();
      expect(host.querySelector('.category-grid .negative')?.textContent).toBe(
        '-40c',
      );
    });
  },
);
