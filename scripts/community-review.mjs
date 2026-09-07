// Separate opt-in preview. Use Vite directly: vinext CLI permits one dev process per root.
import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', '43127'],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      C1_LOCAL_API: '0',
      VITE_COMMUNITY_REVIEW: '1',
      VITE_PUBLIC_API_URL: '/web/v1',
      VITE_REVIEW_HOME_COMMUNITY: '22222222-2222-4222-8222-000000000001',
    },
  },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
