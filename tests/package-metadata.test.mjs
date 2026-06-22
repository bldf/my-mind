import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PACKAGE_NAMES = ['core', 'react', 'importers', 'exporters'];
const DECLARATION_ENTRY = './dist/index.d.ts';

for (const packageName of PACKAGE_NAMES) {
  test(`@my-mind-node/${packageName} exposes declarations to legacy TypeScript resolution`, async () => {
    const manifestUrl = new URL(`../packages/${packageName}/package.json`, import.meta.url);
    const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

    assert.equal(manifest.types, DECLARATION_ENTRY);
    assert.equal(manifest.exports['.'].types, DECLARATION_ENTRY);
  });
}
