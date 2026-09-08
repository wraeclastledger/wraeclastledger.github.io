import { expect, it, vi } from 'vitest';
import { setupEvidence } from '../lib/setup-evidence';
import { publicStrategySetup } from '../lib/vendor/strategy-setup';
import { displayedSetup } from '../lib/presentation';
import { detail as fixtureDetail, evidence as fixtureEvidence } from './fixtures.mjs';
import type { StrategyDetail, EvidencePage } from '../lib/model';
const detail = () => fixtureDetail() as StrategyDetail;
const evidence = () => fixtureEvidence() as EvidencePage;

it('collects every page before copying, retaining the same pooled setup as the page', async () => {
  const d = detail(), e = evidence();
  d.setup.delirium = null; d.setup.astrolabe = null;
  const first = { ...e, runs: [e.runs[0]], next_cursor: 'next' };
  const api = { evidence: vi.fn(async () => ({ ...e, runs: [e.runs[1]] })) };
  const complete = await setupEvidence(api, d, first, new AbortController().signal);
  expect(api.evidence).toHaveBeenCalledOnce();
  expect(complete.runs).toHaveLength(2);
  const imported = publicStrategySetup(d, complete)!;
  const shown = displayedSetup(d, complete);
  expect(imported.delirium).toEqual({ type: shown.delirium?.type, countPerMap: shown.delirium?.count_per_map });
  expect(imported.astrolabe).toBe(shown.astrolabe);
  expect(imported.multiplyingModifiers).toEqual({ allocated: true, fragmentCount: 4 });
});

it('rejects revision changes, duplicate runs and repeated cursors instead of mixing snapshots', async () => {
  const d = detail(), e = evidence(), signal = new AbortController().signal;
  const first = { ...e, runs: [e.runs[0]], next_cursor: 'next' };
  for (const page of [{ ...e, revision: e.revision + 1 }, { ...e, runs: [e.runs[0]] },
    { ...e, runs: [], next_cursor: 'next' }]) {
    await expect(setupEvidence({ evidence: vi.fn(async () => page) }, d, first, signal)).rejects.toThrow();
  }
});

it('retains missing cost evidence without removing configured pooled Delirium or Astrolabe', () => {
  const d = detail(), e = evidence();
  d.setup.delirium = null; d.setup.astrolabe = null;
  e.runs = e.runs.map((run) => ({ ...run, cost_breakdown: null }));
  expect(publicStrategySetup(d, e)).toMatchObject({ delirium: { type: 'fine', countPerMap: 2 }, astrolabe: 'grasping astrolabe' });
});

it('does not silently pick a conflicting run setup', () => {
  const d = detail(), e = evidence();
  d.setup.delirium = null;
  e.runs[1].setup.delirium = { type: 'fine', count_per_map: 3 };
  expect(publicStrategySetup(d, e)).toBeNull();
});
