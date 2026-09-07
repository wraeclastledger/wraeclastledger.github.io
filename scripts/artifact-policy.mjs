import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { assertBuildEnvironment, PAGES_API_URL, WEBSITE_ORIGIN } from './build-policy.mjs';

const forbidden = ['Synthetic C1 review', 'synthetic local review data',
  'Bestiary · Dunes farming', '11111111-1111-4111-8111-000000000001',
  '22222222-2222-4222-8222-000000000001', 'Allflame Farmers', '/control?mode',
  'DROP-OWNER', 'DROP-DISCORD', 'api.example.test'];

export function inspectArtifact(directory, profile) {
  const root = directory instanceof URL ? fileURLToPath(directory) : directory;
  const { apiUrl } = assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: profile });
  const manifest = [];
  const html = [];
  let compiledPagesApi = false;
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = path.posix.join(relative, entry.name);
      const full = path.join(root, file);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1))) {
        throw new Error(`Unsupported linked or special artifact entry: ${file}`);
      }
      if (stat.isDirectory()) { visit(file); continue; }
      if (/\.map$|(^|\/)(?:fixtures|tests|node_modules|server)(\/|$)|service.worker|(^|\/)\.env|\.(?:pem|key)$/i.test(file)) {
        throw new Error(`Test/source/private asset in export: ${file}`);
      }
      const bytes = fs.readFileSync(full);
      if (/\.(js|json|html|txt|css|rsc)$/.test(file)) {
        const content = bytes.toString('utf8');
        for (const text of forbidden) if (content.includes(text)) throw new Error(`Unexpected artifact content: ${text}`);
        for (const match of content.matchAll(/https?:\/\/[^\s"'<>`\\]+\/web\/v1/g)) {
          if (profile !== 'pages' || match[0] !== PAGES_API_URL) throw new Error(`Unapproved API address in export: ${file}`);
        }
        if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?=[:/])|[A-Z]:[\\/]Users[\\/]|BEGIN (?:RSA |EC )?PRIVATE KEY/i.test(content)) {
          throw new Error(`Local address, workstation path or private key in export: ${file}`);
        }
        if (content.includes(PAGES_API_URL)) {
          if (profile !== 'pages') throw new Error('Pages API compiled into same-origin export');
          if (file.endsWith('.js')) compiledPagesApi = true;
        }
        if (file.endsWith('.html')) html.push(content);
      }
      manifest.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  visit('');
  if (!manifest.some(v => v.file === 'index.html') || !manifest.some(v => v.file.endsWith('.wasm'))) {
    throw new Error('Missing static entry or browser compression asset');
  }
  if (profile === 'pages' && !compiledPagesApi) throw new Error('Pages API missing from compiled JavaScript');
  const headers = artifactHeaders(html, profile);
  return { profile, apiUrl, manifest: manifest.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0), headers };
}

// Values for a separately applied response-header rule, NOT a Pages _headers file.
export function artifactHeaders(documents, profile) {
  assertBuildEnvironment({ WEBSITE_BUILD_PROFILE: profile });
  const hashes = new Set();
  for (const html of documents) {
    const dom = new JSDOM(html);
    try {
      for (const el of dom.window.document.querySelectorAll('*')) {
        if ([...el.attributes].some(a => /^on/i.test(a.name))) throw new Error('Inline event handler needs removal before strict CSP');
      }
      for (const script of dom.window.document.querySelectorAll('script')) {
        if (script.hasAttribute('src') && new URL(script.getAttribute('src'), WEBSITE_ORIGIN).origin !== WEBSITE_ORIGIN) {
          throw new Error('External script in static artifact');
        }
        if (script.textContent) hashes.add(`'sha256-${createHash('sha256').update(script.textContent).digest('base64')}'`);
      }
    } finally { dom.window.close(); }
  }
  const csp = ["default-src 'self'", `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'", "img-src 'self' https://web.poecdn.com",
    `connect-src 'self'${profile === 'pages' ? ' ' + new URL(PAGES_API_URL).origin : ''}`,
    "worker-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'none'"].join('; ');
  if (Buffer.byteLength(csp) > 4096) throw new Error('CSP exceeds the Cloudflare 4 KiB response-header limit');
  return { 'Content-Security-Policy': csp, 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'clipboard-write=(self)' };
}
