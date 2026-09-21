import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw Error('Pass the desktop source checkout.');
const client = path.resolve(process.argv[2]);
const require = createRequire(path.join(client, 'package.json'));
const { build } = require('esbuild'), ts = require('typescript');
const entry = 'src/shared/safeStrategy.ts';
const result = await build({ absWorkingDir: client, entryPoints: [entry], bundle: true,
  platform: 'browser', format: 'esm', target: 'es2022', minify: true, write: false, metafile: true });
const program = ts.createProgram([path.join(client, entry)], { target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  declaration: true, emitDeclarationOnly: true, strict: true, skipLibCheck: true });
let declaration;
const emitted = program.emit(undefined, (file, text) => {
  if (file.replaceAll('\\', '/').endsWith('/shared/safeStrategy.d.ts')) declaration = text;
});
if (emitted.emitSkipped || !declaration) throw Error('Safe reader declarations could not be generated.');
// Only the setup-code type survives in the emitted public reader declaration.
declaration = declaration.replace("'./strategySetupCode'", "'./strategy-setup'");
declaration = declaration.replace(/^export \{\};\r?\n?$/m, '');
if (/from ['"]\.\/(?!strategy-setup['"])/.test(declaration)) throw Error('Unexpected reader type dependency.');
const output = path.join(site, 'lib/vendor');
const fixturePath = 'src/renderer/src/utils/__fixtures__/safe-strategy-v2.json';
const fixture = fs.readFileSync(path.join(client, fixturePath));
fs.writeFileSync(path.join(site, 'tests/safe-strategy-v2.json'), fixture);
fs.writeFileSync(path.join(output, 'safe-reader.js'), result.outputFiles[0].contents);
fs.writeFileSync(path.join(output, 'safe-reader.d.ts'), declaration);
fs.writeFileSync(path.join(output, 'safe-reader.provenance.json'), JSON.stringify({
  source: 'gund0lf/wraeclastledger_react',
  bundleSha256: createHash('sha256').update(result.outputFiles[0].contents).digest('hex'),
  fixture: { path: fixturePath, sha256: createHash('sha256').update(fixture).digest('hex') },
  sources: Object.keys(result.metafile.inputs).sort().map(file => ({ path: file.replaceAll('\\', '/'),
    sha256: createHash('sha256').update(fs.readFileSync(path.resolve(client, file))).digest('hex') })),
}, null, 2) + '\n');
console.log('Generated shared safe reader and inferred declarations.');
