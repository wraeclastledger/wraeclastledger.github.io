export const PAGES_API_URL = 'https://api.wraeclastledger.com/web/v1';
export const WEBSITE_ORIGIN = 'https://wraeclastledger.com';

// Profile selection prepares an artifact; it never authorizes publication.
export function assertBuildEnvironment(env) {
  const profile = env.WEBSITE_BUILD_PROFILE || 'same-origin';
  if (!['same-origin', 'pages'].includes(profile)) {
    throw new Error('Unknown WEBSITE_BUILD_PROFILE. Use same-origin or pages.');
  }
  for (const key of ['C1_LOCAL_API', 'VITE_COMMUNITY_REVIEW']) {
    if (env[key] && env[key] !== '0') {
      throw new Error(`Cannot export a review build: clear ${key}. Use the review dev command instead.`);
    }
  }
  if (env.VITE_REVIEW_HOME_COMMUNITY) {
    throw new Error('Cannot export review community identity: clear VITE_REVIEW_HOME_COMMUNITY.');
  }
  const apiUrl = profile === 'pages' ? PAGES_API_URL : '/web/v1';
  if (env.VITE_PUBLIC_API_URL && env.VITE_PUBLIC_API_URL !== apiUrl) {
    throw new Error(`The ${profile} export requires exactly ${apiUrl}.`);
  }
  return { profile, apiUrl };
}
