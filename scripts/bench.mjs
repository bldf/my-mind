import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const ROOT = process.cwd();
const COUNTS = [100, 500, 1000];
const rows = [];

for (const count of COUNTS) {
  const started = performance.now();
  const raw = await readFile(join(ROOT, "tests", "fixtures", `${count}-nodes.json`), "utf8");
  const parsed = JSON.parse(raw);
  const nodes = Object.values(parsed.nodes);
  const searchHits = nodes.filter((node) => node.title.includes("Topic")).length;
  const ended = performance.now();
  rows.push({ count, parseAndSearchMs: Number((ended - started).toFixed(2)), searchHits });
}

const markdown = [
  "# Performance Bench",
  "",
  "| Nodes | Parse + Search (ms) | Hits |",
  "| --- | ---: | ---: |",
  ...rows.map((row) => `| ${row.count} | ${row.parseAndSearchMs} | ${row.searchHits} |`),
  "",
  "The browser render, drag, and export P95 measurements are tracked in `tests/bench/performance-report.md`.",
  "",
].join("\n");

await writeFile(join(ROOT, "tests", "bench", "bench-results.md"), markdown);
console.log(markdown);
