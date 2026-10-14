import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const files = [];
const visit = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(js|css|svg|webp|png|ogg|webmanifest)$/.test(path) && entry.name !== 'sw.js') files.push(path);
  }
};
visit(root);
files.sort();
const revision = createHash('sha256').update(readFileSync(join(root, 'index.html')));
for (const file of files) revision.update(readFileSync(file));
const assets = ['/', ...files.map(file => `/${relative(root, file)}`)];
const workerPath = join(root, 'sw.js');
const worker = readFileSync(workerPath, 'utf8')
  .replace('__BUILD_ID__', revision.digest('hex').slice(0, 12))
  .replace('[] /* BUILD_ASSETS */', JSON.stringify(assets));
writeFileSync(workerPath, worker);
console.log(`Offline shell: ${assets.length} local assets, including lazy views and sounds.`);
