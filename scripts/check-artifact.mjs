import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectArtifact } from './artifact-policy.mjs';
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--profile')) {
  throw new Error('Usage: node scripts/check-artifact.mjs [--profile same-origin|pages]');
}
const profile = args[1] || 'same-origin';
const root = new URL('../dist/client/', import.meta.url);
const result = inspectArtifact(root, profile);
const manifestText = JSON.stringify(result.manifest, null, 2) + '\n';
const output = new URL(`../outputs/${profile}/`, import.meta.url);
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(new URL('artifact-manifest.json', output), manifestText);
fs.writeFileSync(new URL('release-policy.json', output), JSON.stringify({
  profile, apiUrl: result.apiUrl,
  artifactId: createHash('sha256').update(manifestText).digest('hex'),
  headers: result.headers,
  deploymentStatus: 'prepared-only',
}, null, 2) + '\n');
fs.writeFileSync(new URL('../tests/artifact-manifest.json', import.meta.url), manifestText);
console.log(`Static ${profile} artifact: ${result.manifest.length} files; content/profile checks passed. Header policy prepared, not applied.`);
