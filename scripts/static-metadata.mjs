import fs from 'node:fs';
import path from 'node:path';

function optionalStat(file) {
  try { return fs.lstatSync(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Build metadata is for tooling, not the static browser application.
// Validate the entire set before retaining it outside the deployment directory.
export function retainBuildMetadata(root, output) {
  const directory = path.join(root, '.vite');
  const stat = optionalStat(directory);
  if (!stat) return;
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Invalid Vite metadata directory');
  const entries = fs.readdirSync(directory);
  const retainedNames = new Map([
    ['manifest.json', 'vite-build-manifest.json'],
    ['vinext-client-reference-sources.json', 'vinext-client-reference-sources.json'],
  ]);
  if (!entries.includes('manifest.json') || entries.some(name => !retainedNames.has(name))) throw Error('Unexpected Vite metadata files');
  const retained = entries.map(name => {
    const file = path.join(directory, name);
    const fileStat = fs.lstatSync(file);
    if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.nlink !== 1) throw Error('Linked Vite metadata');
    const bytes = fs.readFileSync(file);
    JSON.parse(bytes.toString('utf8'));
    return { file, bytes, destination: path.join(output, retainedNames.get(name)) };
  });
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(output));
  if (!relative || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))) throw Error('Vite metadata output must be outside the artifact');
  for (const { destination } of retained) {
    const existing = optionalStat(destination);
    if (existing && (!existing.isFile() || existing.isSymbolicLink() || existing.nlink !== 1)) throw Error('Linked retained Vite metadata');
  }
  for (const { bytes, destination } of retained) {
    fs.writeFileSync(destination, bytes);
    if (!fs.readFileSync(destination).equals(bytes)) throw Error('Vite metadata copy mismatch');
  }
  for (const { file } of retained) fs.unlinkSync(file);
  fs.rmdirSync(directory);
}
