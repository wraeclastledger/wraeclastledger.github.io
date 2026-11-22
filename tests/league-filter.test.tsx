// @vitest-environment jsdom
import { act, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { Popover } from '@base-ui/react/popover';
import { expect, it, vi } from 'vitest';
import { LeagueFilter } from '../components/league-filter';

vi.mock('../components/ui/popover', async importOriginal => {
  const original = await importOriginal<typeof import('../components/ui/popover')>();
  return {
    ...original,
    // Exercise the actual trigger and portal without measuring popup bounds in jsdom.
    PopoverContent: ({ children }: PropsWithChildren) => <Popover.Portal>{children}</Popover.Portal>,
  };
});

it('opens the league menu in release order, including when browsing an older league', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  try {
    await act(async () => root.render(
      <LeagueFilter value="Allflame" leagues={['Mirage', 'Allflame']} onChange={vi.fn()} />,
    ));
    expect(document.querySelector('.league-options')).toBeNull();
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="League: Allflame"]');
    expect(trigger).toBeTruthy();
    await act(async () => trigger!.click());
    const options = document.querySelectorAll('.league-options button');
    expect(Array.from(options, option => option.textContent?.trim()))
      .toEqual(['All leagues', 'Covens', 'Allflame', 'Mirage']);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
