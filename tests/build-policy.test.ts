import { describe, expect, it } from 'vitest';
import { assertBuildEnvironment } from '../scripts/build-policy.mjs';

describe('export configuration boundary', () => {
  it('permits unconfigured and explicit same-origin C1 exports', () => {
    expect(() => assertBuildEnvironment({})).not.toThrow();
    expect(() => assertBuildEnvironment({ C1_LOCAL_API: '0', VITE_COMMUNITY_REVIEW: '0', VITE_PUBLIC_API_URL: '/web/v1' })).not.toThrow();
  });
  it.each([
    { C1_LOCAL_API: '1' },
    { VITE_COMMUNITY_REVIEW: '1' },
    { VITE_COMMUNITY_REVIEW: 'true' },
    { VITE_REVIEW_HOME_COMMUNITY: '22222222-2222-4222-8222-000000000001' },
    { VITE_PUBLIC_API_URL: 'http://127.0.0.1:43128/web/v1' },
    { VITE_PUBLIC_API_URL: 'https://api.example.test/web/v1' },
    { VITE_PUBLIC_API_URL: '//example.com/web/v1' },
    { VITE_PUBLIC_API_URL: '/strategies' },
  ])('rejects preview or unapproved export configuration: %j', (env) => {
    expect(() => assertBuildEnvironment(env)).toThrow();
  });
});
