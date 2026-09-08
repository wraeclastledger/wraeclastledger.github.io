import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { decodeStrategySetupCode, encodeStrategySetupCode, publicStrategySetup } from '../lib/vendor/strategy-setup';
import { detail, evidence } from './fixtures.mjs';

it('uses the recorded shared codec artifact', () => {
  const provenance = JSON.parse(readFileSync(new URL('../lib/vendor/strategy-setup.provenance.json', import.meta.url), 'utf8'));
  expect(createHash('sha256').update(readFileSync(new URL('../lib/vendor/strategy-setup.js', import.meta.url))).digest('hex')).toBe(provenance.bundleSha256);
});
it('carries optional inspection history without Discord authority or a financial completeness requirement', () => {
  const d = detail(3), e = evidence(3);
  const setup = publicStrategySetup(d, e)!;
  expect(setup).not.toBeNull();
  const decoded = decodeStrategySetupCode(encodeStrategySetupCode(setup));
  expect(decoded).toEqual(setup);
  expect(decoded?.history?.costPerMap).toBeNull();
  expect(decoded?.notes).toBe(d.notes);
  expect(decoded).not.toHaveProperty('id');
  expect(decoded).not.toHaveProperty('raw_export');
});
it('rejects stale revision evidence while permitting detail-only codes', () => {
  expect(publicStrategySetup(detail(), { ...evidence(), revision: 99 })).toBeNull();
  expect(publicStrategySetup(detail())?.history?.netProfit).toBeNull();
  expect(publicStrategySetup(detail())?.scarabs).toHaveLength(2);
});
