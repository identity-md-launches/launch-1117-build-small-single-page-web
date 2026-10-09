import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = 'artifacts/submission-checks.json';
const files = [];
function walk(path = '') {
  for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
    const name = path ? `${path}/${entry.name}` : entry.name;
    if (name === '.git' || name === '.imd' || name === 'test/scratch' || name === reportPath) continue;
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${name}`);
    assert.ok(!['node_modules', '.github', '.cache'].includes(entry.name), `Unexpected directory: ${name}`);
    assert.ok(!/^\.env(?:\.|$)/.test(entry.name), `Unexpected environment file: ${name}`);
    assert.ok(!/\.(?:tgz|tar|zip|pack)$/.test(name), `Unnecessary archive: ${name}`);
    if (entry.isDirectory()) walk(name);
    else files.push({ path: name, bytes: statSync(join(root, name)).size });
  }
}
walk();
for (const name of ['dist/index.html', 'dist/favicon.svg', 'dist/THIRD_PARTY_LICENSES.txt', 'web/src/main.tsx', 'web/package.json', 'web/package-lock.json', 'DESIGN.md', 'README.md', 'artifacts/validation.md']) {
  assert.ok(files.some(f => f.path === name && f.bytes > 0), `Missing required output: ${name}`);
}
const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
const assetReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
for (const ref of assetReferences) {
  assert.ok(ref.startsWith('./'), `Nonrelative asset: ${ref}`);
  assert.ok(statSync(resolve(root, 'dist', ref)).isFile(), `Missing asset: ${ref}`);
}
assert.ok(html.includes("connect-src 'none'"));
const browser = JSON.parse(readFileSync(join(root, 'artifacts/browser-checks.json'), 'utf8'));
assert.equal(browser.status, 'passed');
const runtime = files.filter(f => f.path.startsWith('dist/')).map(f => ({ ...f, sha256: createHash('sha256').update(readFileSync(join(root, f.path))).digest('hex') }));
const payloadBytesExcludingThisReport = files.reduce((n, f) => n + f.bytes, 0);
const reservedReportAndMetadataBytes = 65536;
assert.ok(payloadBytesExcludingThisReport + reservedReportAndMetadataBytes < 8388608, 'Submission exceeds reserved budget');
const report = {
  status: 'passed', budgetBytes: 8388608, payloadBytesExcludingThisReport, reservedReportAndMetadataBytes,
  note: 'Raw deliverable bytes plus a 64 KiB allowance are below the submission limit. This is a payload check, not a network-generated Git bundle measurement. Inputs, Git metadata, and disposable test/scratch files are excluded.',
  runtimeBytes: runtime.reduce((n, f) => n + f.bytes, 0),
  relativeAssetReferences: assetReferences, runtimeFiles: runtime,
  noRepositoryDependenciesOrArchives: true, noIgnoreFileChanged: true,
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
};
writeFileSync(join(root, reportPath), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, runtimeBytes: report.runtimeBytes, payloadBytes: payloadBytesExcludingThisReport + statSync(join(root, reportPath)).size, budgetBytes: report.budgetBytes, files: files.length + 1 }, null, 2));
