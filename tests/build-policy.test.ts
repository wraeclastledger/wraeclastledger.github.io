import { describe, expect, it } from 'vitest';
import { assertBuildEnvironment, PAGES_API_URL, PAGES_SUMMARY_API_URL } from '../scripts/build-policy.mjs';

describe('export configuration boundary', () => {
  it('permits unconfigured and explicit same-origin C1 exports', () => {
    expect(() => assertBuildEnvironment({})).not.toThrow();
    expect(assertBuildEnvironment({ C1_LOCAL_API: '0', VITE_COMMUNITY_REVIEW: '0', VITE_PUBLIC_API_URL: '/web/v2', VITE_SUMMARY_API_URL: '/web/v1' }))
      .toEqual({ profile: 'same-origin', apiUrl: '/web/v2', summaryApiUrl: '/web/v1' });
  });
  it('selects the exact Pages API only with its explicit profile', () => {
    expect(assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: 'pages' })).toEqual({ profile: 'pages', apiUrl: PAGES_API_URL, summaryApiUrl: PAGES_SUMMARY_API_URL });
    expect(assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: 'pages', VITE_PUBLIC_API_URL: PAGES_API_URL }).apiUrl).toBe(PAGES_API_URL);
    expect(() => assertBuildEnvironment({ VITE_PUBLIC_API_URL: PAGES_API_URL })).toThrow();
  });
  it.each(['/web/v1', PAGES_API_URL + '/', PAGES_API_URL + '?key=x', PAGES_API_URL + '#x',
    'https://api.wraeclastledger.com.evil.test/web/v1', 'http://api.wraeclastledger.com/web/v1',
    'https://user@api.wraeclastledger.com/web/v1', 'https://api.wraeclastledger.com:443/web/v1'])('rejects a changed Pages API: %s', (url) => {
    expect(() => assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: 'pages', VITE_PUBLIC_API_URL: url })).toThrow();
  });
  it('does not weaken review exclusions in the Pages profile', () => {
    expect(() => assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: 'pages', VITE_COMMUNITY_REVIEW: '1' })).toThrow();
    expect(() => assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: 'production' })).toThrow();
  });
  it.each(['/web/v2', PAGES_API_URL, 'https://unapproved.test/web/v1', PAGES_SUMMARY_API_URL + '/',
    'https://api.wraeclastledger.com.evil.test/web/v1', 'http://127.0.0.1:43121/web/v1'])('rejects a changed summary API: %s', (url) => {
    expect(() => assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: 'pages', VITE_SUMMARY_API_URL: url })).toThrow();
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
    { VITE_SAFE_READER_REVIEW: '1' },
    { VITE_SUMMARY_API_URL: PAGES_SUMMARY_API_URL },
    { VITE_PUBLIC_API_URL: '/web/v1' },
  ])('rejects preview or unapproved export configuration: %j', (env) => {
    expect(() => assertBuildEnvironment(env)).toThrow();
  });
});
