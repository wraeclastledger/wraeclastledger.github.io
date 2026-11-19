import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { artifactHeaders, inspectArtifact } from '../scripts/artifact-policy.mjs';
import { PAGES_API_URL, PAGES_SUMMARY_API_URL } from '../scripts/build-policy.mjs';
import { retainBuildMetadata } from '../scripts/static-metadata.mjs';
const roots: string[] = [];
function artifact(api = PAGES_API_URL, summary = PAGES_SUMMARY_API_URL) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-artifact-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'index.html'), '<script>window.example=1;</script>');
  fs.writeFileSync(path.join(root, 'app.js'), `const api=${JSON.stringify(api)};const summary=${JSON.stringify(summary)};`);
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
  it('keeps build metadata out of the exact deployable manifest', () => {
    const root = artifact();
    const reports = artifact();
    fs.mkdirSync(path.join(root, '.vite'));
    fs.writeFileSync(path.join(root, '.vite', 'manifest.json'), '{"entry":"app.js"}');
    expect(() => inspectArtifact(root, 'pages')).toThrow('Hidden asset');
    retainBuildMetadata(root, reports);
    expect(fs.readFileSync(path.join(reports, 'vite-build-manifest.json'), 'utf8')).toBe('{"entry":"app.js"}');
    expect(fs.existsSync(path.join(root, '.vite'))).toBe(false);
    expect(inspectArtifact(root, 'pages').manifest.map(row => row.file)).not.toContain('.vite/manifest.json');
  });
  it('retains both exact metadata files byte-for-byte outside the artifact', () => {
    const root = artifact(), reports = artifact();
    fs.mkdirSync(path.join(root, '.vite'));
    const manifest = Buffer.from('{ "entry": "app.js" }\r\n');
    const references = Buffer.from('{"references":["client.tsx"]}\n');
    fs.writeFileSync(path.join(root, '.vite', 'manifest.json'), manifest);
    fs.writeFileSync(path.join(root, '.vite', 'vinext-client-reference-sources.json'), references);
    retainBuildMetadata(root, reports);
    expect(fs.readFileSync(path.join(reports, 'vite-build-manifest.json')).equals(manifest)).toBe(true);
    expect(fs.readFileSync(path.join(reports, 'vinext-client-reference-sources.json')).equals(references)).toBe(true);
    expect(fs.existsSync(path.join(root, '.vite'))).toBe(false);
    expect(inspectArtifact(root, 'pages').manifest.map(row => path.basename(row.file))).not.toContain('manifest.json');
    expect(inspectArtifact(root, 'pages').manifest.map(row => path.basename(row.file))).not.toContain('vinext-client-reference-sources.json');
  });
  it.each(['unknown', 'malformed-primary', 'malformed-secondary', 'hardlink', 'directory', 'missing-required'])('refuses %s metadata without copying or removing either file', (mode) => {
    const root = artifact(), reports = artifact();
    const directory = path.join(root, '.vite');
    fs.mkdirSync(directory);
    const first = path.join(directory, 'manifest.json');
    const second = path.join(directory, 'vinext-client-reference-sources.json');
    if (mode !== 'missing-required') fs.writeFileSync(first, mode === 'malformed-primary' ? '{' : '{"entry":"app.js"}');
    if (mode === 'hardlink') fs.linkSync(first, second);
    else if (mode === 'directory') fs.mkdirSync(second);
    else fs.writeFileSync(second, mode === 'malformed-secondary' ? '{' : '{"references":[]}');
    if (mode === 'unknown') fs.writeFileSync(path.join(directory, 'unexpected.json'), '{}');
    const names = fs.readdirSync(directory).sort();
    const bytes = names.filter(name => fs.lstatSync(path.join(directory, name)).isFile())
      .map(name => [name, fs.readFileSync(path.join(directory, name))] as const);
    expect(() => retainBuildMetadata(root, reports)).toThrow();
    expect(fs.readdirSync(directory).sort()).toEqual(names);
    for (const [name, before] of bytes) expect(fs.readFileSync(path.join(directory, name)).equals(before)).toBe(true);
    expect(fs.existsSync(path.join(reports, 'vite-build-manifest.json'))).toBe(false);
    expect(fs.existsSync(path.join(reports, 'vinext-client-reference-sources.json'))).toBe(false);
  });
  it('refuses a symlinked metadata entry before moving the valid manifest', () => {
    const root = artifact(), reports = artifact();
    const directory = path.join(root, '.vite');
    fs.mkdirSync(directory);
    const first = path.join(directory, 'manifest.json');
    const second = path.join(directory, 'vinext-client-reference-sources.json');
    fs.writeFileSync(first, '{"entry":"app.js"}');
    // Directory junctions exercise lstat's symlink rejection on Windows without
    // requiring the privilege needed to create a file symbolic link.
    fs.symlinkSync(reports, second, 'junction');
    expect(() => retainBuildMetadata(root, reports)).toThrow('Linked Vite metadata');
    expect(fs.readFileSync(first, 'utf8')).toBe('{"entry":"app.js"}');
    expect(fs.lstatSync(second).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(path.join(reports, 'vite-build-manifest.json'))).toBe(false);
  });
  it.each(['manifest.json', 'vinext-client-reference-sources.json'])('refuses retained metadata %s anywhere in the published artifact', (name) => {
    const root = artifact();
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'assets', name), '{}');
    expect(() => inspectArtifact(root, 'pages')).toThrow('Build metadata must remain outside');
  });
  it('refuses an artifact-local retention destination before copying or removing metadata', () => {
    const root = artifact();
    fs.mkdirSync(path.join(root, '.vite'));
    const first = path.join(root, '.vite', 'manifest.json');
    fs.writeFileSync(first, '{}');
    expect(() => retainBuildMetadata(root, root)).toThrow('outside the artifact');
    expect(fs.readFileSync(first, 'utf8')).toBe('{}');
    expect(fs.existsSync(path.join(root, 'vite-build-manifest.json'))).toBe(false);
  });
  it('refuses dangling metadata directory links instead of treating them as absent', () => {
    const root = artifact(), reports = artifact();
    fs.symlinkSync(path.join(reports, 'absent'), path.join(root, '.vite'), 'junction');
    expect(() => retainBuildMetadata(root, reports)).toThrow('Invalid Vite metadata directory');
    expect(fs.lstatSync(path.join(root, '.vite')).isSymbolicLink()).toBe(true);
  });
  it.each(['hardlink', 'dangling-link'])('refuses a %s destination without partial copies or removals', (mode) => {
    const root = artifact(), reports = artifact();
    const directory = path.join(root, '.vite');
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'manifest.json'), '{"entry":"app.js"}');
    fs.writeFileSync(path.join(directory, 'vinext-client-reference-sources.json'), '{}');
    const destination = path.join(reports, 'vinext-client-reference-sources.json');
    if (mode === 'hardlink') fs.linkSync(path.join(reports, 'app.js'), destination);
    else fs.symlinkSync(path.join(reports, 'absent'), destination, 'junction');
    expect(() => retainBuildMetadata(root, reports)).toThrow('Linked retained Vite metadata');
    expect(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')).toBe('{"entry":"app.js"}');
    expect(fs.readFileSync(path.join(directory, 'vinext-client-reference-sources.json'), 'utf8')).toBe('{}');
    expect(fs.existsSync(path.join(reports, 'vite-build-manifest.json'))).toBe(false);
  });
  it('rejects unexpected hidden assets and refuses to remove unknown metadata', () => {
    const root = artifact();
    fs.mkdirSync(path.join(root, '.private'));
    expect(() => inspectArtifact(root, 'pages')).toThrow('Hidden asset');
    fs.mkdirSync(path.join(root, '.vite'));
    fs.writeFileSync(path.join(root, '.vite', 'unexpected.json'), '{}');
    expect(() => retainBuildMetadata(root, root)).toThrow('Unexpected Vite');
    expect(fs.existsSync(path.join(root, '.vite', 'unexpected.json'))).toBe(true);
  });
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
    expect(() => inspectArtifact(artifact('/web/v2', '/web/v1'), 'pages')).toThrow('API missing');
    expect(() => inspectArtifact(artifact(), 'same-origin')).toThrow();
    expect(inspectArtifact(artifact('/web/v2', '/web/v1'), 'same-origin')).toMatchObject({ apiUrl: '/web/v2', summaryApiUrl: '/web/v1' });
  });
  it('requires both compiled endpoints', () => {
    expect(() => inspectArtifact(artifact(PAGES_API_URL, ''), 'pages')).toThrow('API missing');
    expect(() => inspectArtifact(artifact('', PAGES_SUMMARY_API_URL), 'pages')).toThrow('API missing');
    expect(() => inspectArtifact(artifact('/web/v2', ''), 'same-origin')).toThrow('API missing');
  });
  it.each(['http://127.0.0.1:43128/web/v1', 'http://localhost:9999/web/v2', 'http://[::1]:43121/web/v2',
    'https://unapproved.test/web/v1', 'https://unapproved.test/web/v2', 'https://api.wraeclastledger.com/web/v3',
    'VITE_SAFE_READER_REVIEW', 'VITE_COMMUNITY_REVIEW', 'DROP-DISCORD', '-----BEGIN PRIVATE KEY-----'])('rejects sensitive/review payload %s', (payload) => {
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
