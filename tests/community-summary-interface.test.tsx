// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CommunitySummary } from '../components/community-summary';
let host: HTMLDivElement, root: Root;
const data = { strategies: 75, covered: 70, net: -17.125, maps: 1500, runs: 150, map_covered: 75, run_covered: 75 };
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
});
it('keeps the totals card, discloses missing coverage and never shows old totals under a new league', async () => {
  let finish: ((r: Response) => void) | undefined;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('league=Mirage')) return Response.json({ schema_version: 1, summary: data });
    return new Promise<Response>(resolve => { finish = resolve; });
  }));
  await act(async () => root.render(<CommunitySummary league="Mirage" />));
  expect(host.textContent).toContain('Generational wealth');
  expect(host.textContent).toContain('-17.125d');
  expect(host.textContent).toContain('70/75 strategies with totals');
  expect(host.textContent).toContain('Incomplete coverage');
  await act(async () => root.render(<CommunitySummary league="Allflame" />));
  expect(host.textContent).toContain('Loading recorded community totals');
  expect(host.textContent).not.toContain('-17.125d');
  await act(async () => finish!(Response.json({ schema_version: 1, summary: { ...data, covered: 0, net: null, map_covered: 74 } })));
  expect(host.textContent).toContain('No historical profit totals are recorded');
  expect(host.textContent).toContain('74/75 strategies (maps)');
  expect(host.textContent).not.toContain('0d');
});
