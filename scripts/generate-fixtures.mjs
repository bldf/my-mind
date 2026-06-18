import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "tests", "fixtures");

function createFixture(count) {
  const rootId = "node-0";
  const nodes = {
    [rootId]: {
      id: rootId,
      parentId: null,
      children: [],
      title: `${count} node map`,
      links: [],
      tagIds: [],
      collapsed: false,
      position: { x: 0, y: 0 },
      style: {},
      metadata: {},
    },
  };

  for (let index = 1; index < count; index += 1) {
    const id = `node-${index}`;
    const parentIndex = Math.max(0, Math.floor((index - 1) / 4));
    const parentId = `node-${parentIndex}`;
    nodes[parentId].children.push(id);
    nodes[id] = {
      id,
      parentId,
      children: [],
      title: `Topic ${index}`,
      note: index % 7 === 0 ? `Research note ${index}` : undefined,
      links: index % 11 === 0 ? [{ url: "https://example.com", label: "Example" }] : [],
      tagIds: index % 5 === 0 ? ["tag-priority"] : [],
      task: index % 9 === 0 ? { status: "todo" } : undefined,
      collapsed: false,
      position: {
        x: (Math.floor(Math.log2(index + 1)) + 1) * 220,
        y: (index % 20) * 92,
      },
      style: {},
      metadata: {},
    };
  }

  return {
    schemaVersion: "1.0",
    id: `fixture-${count}`,
    title: `${count} Node Fixture`,
    rootId,
    nodes,
    connections: [],
    tags: [{ id: "tag-priority", label: "Priority", color: "#0f766e", metadata: {} }],
    layout: { direction: "right", gapX: 220, gapY: 96 },
    revision: 0,
    metadata: { generated: true, count },
  };
}

await mkdir(OUT_DIR, { recursive: true });
for (const count of [100, 500, 1000]) {
  await writeFile(join(OUT_DIR, `${count}-nodes.json`), `${JSON.stringify(createFixture(count), null, 2)}\n`);
}
