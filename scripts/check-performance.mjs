import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const DIST_DIR = new URL('../dist/', import.meta.url).pathname;
const budgets = {
  '.js': { file: 500 * 1024, gzip: 150 * 1024 },
  '.css': { file: 20 * 1024, gzip: 10 * 1024 },
  '.jpg': { file: 450 * 1024 },
  '.png': { file: 450 * 1024 },
};

const files = [];
const visit = (directory) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) visit(path);
    else files.push(path);
  }
};

visit(DIST_DIR);
const failures = [];
const measured = files
  .map((path) => {
    const extension = extname(path);
    const budget = budgets[extension];
    if (!budget) return null;
    const bytes = readFileSync(path);
    const result = { path: relative(DIST_DIR, path), size: bytes.length, gzip: extension === '.js' || extension === '.css' ? gzipSync(bytes).length : null };
    if (result.size > budget.file) failures.push(`${result.path} is ${(result.size / 1024).toFixed(1)} kB (budget ${(budget.file / 1024).toFixed(0)} kB)`);
    if (budget.gzip && result.gzip > budget.gzip) failures.push(`${result.path} gzip is ${(result.gzip / 1024).toFixed(1)} kB (budget ${(budget.gzip / 1024).toFixed(0)} kB)`);
    return result;
  })
  .filter(Boolean)
  .sort((a, b) => b.size - a.size);

console.table(measured.map((item) => ({
  asset: item.path,
  'size kB': (item.size / 1024).toFixed(1),
  'gzip kB': item.gzip == null ? 'n/a' : (item.gzip / 1024).toFixed(1),
})));

if (failures.length) {
  console.error(`Performance budget failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Performance budget passed.');
}
