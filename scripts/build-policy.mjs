// Exported C1 candidates use same-origin reads until production routing is approved.
// Development previews retain their separately configured live/loopback endpoints.
export function assertBuildEnvironment(env) {
  for (const key of ['C1_LOCAL_API', 'VITE_COMMUNITY_REVIEW']) {
    if (env[key] && env[key] !== '0') {
      throw new Error(`Cannot export a review build: clear ${key}. Use the review dev command instead.`);
    }
  }
  if (env.VITE_REVIEW_HOME_COMMUNITY) {
    throw new Error('Cannot export review community identity: clear VITE_REVIEW_HOME_COMMUNITY.');
  }
  if (env.VITE_PUBLIC_API_URL && env.VITE_PUBLIC_API_URL !== '/web/v1') {
    throw new Error('C1 exports require same-origin /web/v1. Production API routing needs a separately reviewed configuration.');
  }
}
