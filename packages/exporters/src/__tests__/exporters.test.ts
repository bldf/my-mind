import { asNodeId, createEmptyDocument, createNode } from "@my-mind-node/core";
import { describe, expect, it } from "vitest";
import { exportMindMap } from "../index";

describe("@my-mind-node/exporters", () => {
  it("exports json and svg", async () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    await expect(exportMindMap(document, "json")).resolves.toMatchObject({ ok: true });
    const svg = await exportMindMap(document, "svg");
    expect(svg.ok).toBe(true);
    if (svg.ok) expect(String(svg.value)).toContain("<svg");
  });

  it("exports mermaid mindmap text", async () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    const mermaid = await exportMindMap(document, "mermaid");
    expect(mermaid.ok).toBe(true);
    if (mermaid.ok) {
      expect(String(mermaid.value)).toContain("mindmap");
      expect(String(mermaid.value)).toContain('root["Root"]');
    }
  });

  it("exports mermaid labels with delimiter characters intact", async () => {
    const document = createEmptyDocument({ rootTitle: 'Root [docs] )) & "quotes"' });
    const root = document.nodes[document.rootId];
    if (!root) throw new Error("Root node is missing");
    const childId = asNodeId("node-special-title");
    document.nodes[childId] = createNode({
      id: childId,
      parentId: document.rootId,
      title: "Child [x] ] and ))",
    });
    root.children.push(childId);

    const mermaid = await exportMindMap(document, "mermaid");
    expect(mermaid.ok).toBe(true);
    if (mermaid.ok) {
      expect(String(mermaid.value)).toContain('root["Root [docs] )) &amp; &quot;quotes&quot;"]');
      expect(String(mermaid.value)).toContain('node1["Child [x] ] and ))"]');
    }
  });
});
