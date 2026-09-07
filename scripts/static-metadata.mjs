import fs from 'node:fs';
import path from 'node:path';

// Vite's build manifest is for tooling, not the static browser application.
// Retain it outside the deployment directory before hashing the actual website.
export function retainBuildMetadata(root, output) {
  const directory = path.join(root, '.vite');
  if (!fs.existsSync(directory)) return;
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Invalid Vite metadata directory');
  const entries = fs.readdirSync(directory);
  if (entries.length !== 1 || entries[0] !== 'manifest.json') throw Error('Unexpected Vite metadata files');
  const file = path.join(directory, 'manifest.json');
  const fileStat = fs.lstatSync(file);
  if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.nlink !== 1) throw Error('Linked Vite metadata');
  const bytes = fs.readFileSync(file);
  JSON.parse(bytes.toString('utf8'));
  fs.copyFileSync(file, path.join(output, 'vite-build-manifest.json'));
  fs.unlinkSync(file);
  fs.rmdirSync(directory);
}
