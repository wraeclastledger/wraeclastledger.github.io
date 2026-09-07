// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectMaintenance } from '../scripts/check-maintenance.mjs';

const roots: string[] = [];
function candidate() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-maintenance-'));
  roots.push(root);
  for (const name of ['index.html', '404.html']) fs.copyFileSync(`ops/maintenance/${name}`, path.join(root, name));
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('wl-maintenance-')) throw Error('Unexpected test directory');
    fs.rmSync(root, { recursive: true });
  }
});

describe('first-launch maintenance package', () => {
  it('contains identical, inert entry and missing-route documents', () => {
    const result = inspectMaintenance(candidate());
    expect(result).toHaveLength(2);
    expect(result[0].sha256).toBe(result[1].sha256);
    const doc = new DOMParser().parseFromString(fs.readFileSync('ops/maintenance/index.html', 'utf8'), 'text/html');
      expect(doc.querySelector('h1')?.textContent).toContain('temporarily unavailable');
      expect(doc.querySelectorAll('script, style, link, img, iframe, form, object, embed, a, audio, video')).toHaveLength(0);
      expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("default-src 'none'");
      expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });
  it('rejects unexpected artifacts and changed HTML', () => {
    const extra = candidate();
    fs.writeFileSync(path.join(extra, 'private.txt'), 'not for publication');
    expect(() => inspectMaintenance(extra)).toThrow('Unexpected');
    const altered = candidate();
    fs.appendFileSync(path.join(altered, 'index.html'), '<script src="https://example.invalid/app.js"></script>');
    expect(() => inspectMaintenance(altered)).toThrow('reviewed bytes');
  });
  it('rejects hard-linked HTML before packaging', () => {
    const root = candidate();
    fs.unlinkSync(path.join(root, '404.html'));
    fs.linkSync(path.join(root, 'index.html'), path.join(root, '404.html'));
    expect(() => inspectMaintenance(root)).toThrow('Linked');
  });
});
