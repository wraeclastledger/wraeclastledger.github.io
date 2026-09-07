import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const expectedHash = '041e7ddafe22518a9a7de0046619aa3b297943fdde9c7cbfc4d7dca6ae2db789';

// Only the two reviewed, inert documents may enter the withdrawal package.
export function inspectMaintenance(root) {
  const directory = fs.lstatSync(root);
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw Error('Invalid maintenance directory');
  const files = fs.readdirSync(root).sort();
  if (JSON.stringify(files) !== JSON.stringify(['404.html', 'index.html'])) throw Error('Unexpected maintenance files');
  return files.map(file => {
    const filename = path.join(root, file);
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw Error('Linked maintenance file');
    const bytes = fs.readFileSync(filename);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== expectedHash) throw Error('Maintenance content differs from reviewed bytes');
    return { file, bytes: bytes.length, sha256 };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw Error('No arguments accepted');
  console.log(JSON.stringify(inspectMaintenance(fileURLToPath(new URL('../ops/maintenance/', import.meta.url))), null, 2));
}
