import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { artifactHeaders, inspectArtifact } from '../scripts/artifact-policy.mjs';
import { PAGES_API_URL } from '../scripts/build-policy.mjs';
const roots: string[] = [];
function artifact(api = PAGES_API_URL) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-artifact-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'index.html'), '<script>window.example=1;</script>');
  fs.writeFileSync(path.join(root, 'app.js'), `const api=${JSON.stringify(api)};`);
  fs.writeFileSync(path.join(root, 'codec.wasm'), Buffer.from([0, 97, 115, 109]));
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('wl-artifact-')) throw Error('Unexpected test directory');
    fs.rmSync(root, { recursive: true });
  }
});
describe('artifact and response policy', () => {
  it('binds generated headers and the manifest to the actual bytes', () => {
    const root = artifact();
    const before = inspectArtifact(root, 'pages');
    const hash = createHash('sha256').update('window.example=1;').digest('base64');
    expect(before.headers['Content-Security-Policy']).toContain(`'sha256-${hash}'`);
    expect(before.headers['Content-Security-Policy']).toContain("connect-src 'self' https://api.wraeclastledger.com");
    expect(before.headers['Permissions-Policy']).toBe('clipboard-write=(self)');
    fs.writeFileSync(path.join(root, 'index.html'), '<script>window.example=2;</script>');
    const after = inspectArtifact(root, 'pages');
    expect(after.headers).not.toEqual(before.headers);
    expect(after.manifest).not.toEqual(before.manifest);
  });
  it('rejects either profile being mistaken for the other', () => {
    expect(() => inspectArtifact(artifact('/web/v1'), 'pages')).toThrow('Pages API missing');
    expect(() => inspectArtifact(artifact(), 'same-origin')).toThrow();
    expect(inspectArtifact(artifact('/web/v1'), 'same-origin').apiUrl).toBe('/web/v1');
  });
  it.each(['http://127.0.0.1:43128/web/v1', 'http://localhost:9999/web/v1', 'https://unapproved.test/web/v1', 'DROP-DISCORD', '-----BEGIN PRIVATE KEY-----'])('rejects sensitive/review payload %s', (payload) => {
    const root = artifact();
    fs.writeFileSync(path.join(root, 'unexpected.txt'), payload);
    expect(() => inspectArtifact(root, 'pages')).toThrow();
  });
  it.each(['app.js.map', '.env', 'origin.pem'])('rejects forbidden asset %s', (name) => {
    const root = artifact(); fs.writeFileSync(path.join(root, name), 'x');
    expect(() => inspectArtifact(root, 'pages')).toThrow('asset');
  });
  it('rejects a hard-linked artifact file', () => {
    const root = artifact(); fs.linkSync(path.join(root, 'app.js'), path.join(root, 'copy.js'));
    expect(() => inspectArtifact(root, 'pages')).toThrow('linked');
  });
  it('rejects external scripts, inline handlers and oversized CSP', () => {
    expect(() => artifactHeaders(['<script src="//external.test/script.js"></script>'], 'pages')).toThrow('External script');
    expect(() => artifactHeaders(['<body onload="run()">'], 'pages')).toThrow('Inline event');
    expect(() => artifactHeaders([Array.from({length:100}, (_,i) => `<script>const x=${i}</script>`).join('')], 'pages')).toThrow('4 KiB');
  });
});
