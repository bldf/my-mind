import type { MindMapDocument, SearchOptions, SearchResult } from "./types";

function makeSnippet(value: string, query: string): string {
  const index = value.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return value.slice(0, 80);
  const start = Math.max(0, index - 24);
  const end = Math.min(value.length, index + query.length + 24);
  return value.slice(start, end);
}

export function searchDocument(document: MindMapDocument, options: SearchOptions): SearchResult[] {
  const query = options.query.trim().toLowerCase();
  if (!query) return [];

  const fields = options.fields ?? ["title", "note", "tag"];
  const tagById = new Map(document.tags.map((tag) => [tag.id, tag]));
  const results: SearchResult[] = [];

  for (const node of Object.values(document.nodes)) {
    if (fields.includes("title") && node.title.toLowerCase().includes(query)) {
      results.push({ nodeId: node.id, field: "title", snippet: makeSnippet(node.title, query), score: 3 });
    }
    if (fields.includes("note") && node.note?.toLowerCase().includes(query)) {
      results.push({ nodeId: node.id, field: "note", snippet: makeSnippet(node.note, query), score: 2 });
    }
    if (fields.includes("tag")) {
      for (const tagId of node.tagIds) {
        const tag = tagById.get(tagId);
        if (tag?.label.toLowerCase().includes(query)) {
          results.push({ nodeId: node.id, field: "tag", snippet: tag.label, score: 1 });
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, options.limit ?? 50);
}
