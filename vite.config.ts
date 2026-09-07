import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';
import { assertBuildEnvironment } from './scripts/build-policy.mjs';
// The isolated review service is opt-in and never part of an exported artifact.
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    assertBuildEnvironment({ ...loadEnv(mode, process.cwd(), ''), ...process.env });
  }
  return {
  plugins: [vinext()],
  server: {
    host: '127.0.0.1',
    port: 43120,
    strictPort: true,
    proxy:
      process.env.VITE_COMMUNITY_REVIEW === '1'
        ? { '/web/v1': 'http://127.0.0.1:43128' }
        : process.env.C1_LOCAL_API === '1'
        ? { '/web/v1': 'http://127.0.0.1:43121' }
        : undefined,
  },
  worker: { format: 'es' },
  };
});
