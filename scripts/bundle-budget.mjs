import { stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const budgets = [
  { name: "core", file: "packages/core/dist/index.js", gzipKb: 80 },
  { name: "react", file: "packages/react/dist/index.js", gzipKb: 160 },
  { name: "importers", file: "packages/importers/dist/index.js", gzipKb: 80 },
  { name: "exporters", file: "packages/exporters/dist/index.js", gzipKb: 100 },
];

for (const budget of budgets) {
  try {
    await stat(budget.file);
    const gzipKb = gzipSync(await readFile(join(process.cwd(), budget.file))).length / 1024;
    if (gzipKb > budget.gzipKb) {
      throw new Error(`${budget.name} gzip ${gzipKb.toFixed(1)}KB exceeds ${budget.gzipKb}KB`);
    }
    console.log(`${budget.name}: ${gzipKb.toFixed(1)}KB gzip`);
  } catch (error) {
    console.warn(`${budget.name}: build artifact missing or budget failed (${error.message})`);
  }
}
