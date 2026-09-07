// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Home from '../app/page';
import { preferenceKey } from '../lib/community-preferences';
import {
  communityId as cid,
  discoveryResponse,
} from './community-fixtures.mjs';
let host: HTMLDivElement,
  root: Root,
  mode = 'normal';
const settle = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 65));
  });
};
const button = (name: string, within: Element = host) =>
  [...within.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name,
  )!;
const card = (name: string) =>
  host.querySelector(`.community-card[aria-label="${name}"]`)!;
const click = async (el: Element) => {
  expect(el).toBeTruthy();
  await act(async () => (el as HTMLElement).click());
  await settle();
};
const mount = async () => {
  await act(async () =>
    root.render(<Home communityReview defaultCommunity={cid(1)} />),
  );
  await settle();
};
beforeEach(() => {
  mode = 'normal';
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) =>
    setTimeout(() => fn(performance.now()), 5),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  localStorage.clear();
  history.replaceState(null, '', '/?design=prototype#/communities');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      const r = discoveryResponse(String(url), mode);
      return new Response(JSON.stringify(r.body), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('follows, changes Home, persists across remount, protects Home and removes unfollowed feed rows', async () => {
  await mount();
  expect(button('Unfollow', card('WraeclastLedger'))).toBeUndefined();
  await click(button('Follow', card('Allflame Farmers')));
  await click(button('Set as Home', card('Allflame Farmers')));
  expect(card('Allflame Farmers').textContent).toContain('Always included');
  expect(card('WraeclastLedger').textContent).toContain('Following');
  expect(JSON.parse(localStorage.getItem(preferenceKey)!)).toEqual({
    home: cid(2),
    following: [cid(1)],
  });
  await act(async () => {
    root.unmount();
    root = createRoot(host);
  });
  await mount();
  expect(card('Allflame Farmers').textContent).toContain('Always included');
  await click(button('Unfollow', card('WraeclastLedger')));
  await click(button('My Feed'));
  expect(host.querySelectorAll('tbody tr').length).toBe(10);
  expect(
    [...host.querySelectorAll('tbody tr')].every((r) =>
      r.textContent?.includes('Allflame Farmers'),
    ),
  ).toBe(true);
});
it('restores the second directory page and its opener after visiting a community', async () => {
  await mount();
  await click(button('Load more communities'));
  expect(host.querySelectorAll('.community-card')).toHaveLength(31);
  expect(location.hash).toContain('pages=2');
  const opener = card('Mapmakers').querySelector('a')!;
  opener.focus();
  await click(opener);
  expect(host.textContent).toContain('Mapmakers');
  await click(button('Back to directory'));
  await settle();
  expect(host.querySelectorAll('.community-card')).toHaveLength(31);
  expect(document.activeElement?.textContent).toBe('Mapmakers');
});
it('handles an empty feed and an unavailable saved community without discarding preferences', async () => {
  localStorage.setItem(
    preferenceKey,
    JSON.stringify({ home: cid(3), following: [] }),
  );
  mode = 'unavailable';
  await mount();
  expect(card('Beast Bureau').textContent).toContain('unavailable');
  await click(button('My Feed'));
  expect(host.querySelectorAll('tbody tr')).toHaveLength(0);
  expect(JSON.parse(localStorage.getItem(preferenceKey)!).home).toBe(cid(3));
  await click(button('Browse communities'));
  await click(button('Set as Home', card('Community 06')));
  await click(button('My Feed'));
  expect(host.querySelectorAll('tbody tr')).toHaveLength(0);
});
it('keeps changes usable in the tab when browser storage rejects writes', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('denied');
  });
  await mount();
  await click(button('Follow', card('Beast Bureau')));
  expect(host.textContent).toContain('tab only');
  expect(card('Beast Bureau').textContent).toContain('Following');
  await click(button('My Feed'));
  expect(host.querySelectorAll('tbody tr')).toHaveLength(17);
});
it('updates a displayed feed when another tab changes the saved relationships', async () => {
  history.replaceState(null, '', '/?design=prototype#/my-feed');
  await mount();
  expect(host.querySelectorAll('tbody tr')).toHaveLength(9);
  await act(async () => {
    localStorage.setItem(
      preferenceKey,
      JSON.stringify({ home: cid(2), following: [] }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: preferenceKey }));
  });
  await settle();
  expect(host.querySelectorAll('tbody tr')).toHaveLength(10);
  expect(
    [...host.querySelectorAll('tbody tr')].every((r) =>
      r.textContent?.includes('Allflame Farmers'),
    ),
  ).toBe(true);
});

it('preserves a directory search draft across relationship changes and offers an explicit clear', async () => {
  await mount();
  const input = host.querySelector(
    '.community-search input',
  ) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, 'Beast');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click(button('Follow', card('Allflame Farmers')));
  expect(
    (host.querySelector('.community-search input') as HTMLInputElement).value,
  ).toBe('Beast');
  await click(button('Search communities'));
  expect(host.querySelectorAll('.community-card')).toHaveLength(1);
  expect(card('Beast Bureau')).toBeTruthy();
  await click(button('Clear search'));
  expect(host.querySelectorAll('.community-card')).toHaveLength(25);
});

it('names the community in the detail Back action', async () => {
  await mount();
  await click(card('Beast Bureau').querySelector('a')!);
  expect(host.querySelector('h1')?.textContent).toBe('Beast Bureau');
  await click(host.querySelector('tbody th a')!);
  expect(button('Back to Beast Bureau')).toBeTruthy();
});
