import { describe, expect, it } from "vitest";
import {
  createEmptyDocument,
  dispatchCommand,
  exportIndentedText,
  importIndentedText,
  parseDocument,
  searchDocument,
  serializeDocument,
  simpleTreeLayout,
  validateDocument,
} from "../index";

describe("@my-mind-node/core", () => {
  it("creates and validates an empty document", () => {
    const document = createEmptyDocument({ title: "Spec", rootTitle: "Root" });
    expect(validateDocument(document).ok).toBe(true);
    expect(document.nodes[document.rootId]!.title).toBe("Root");
  });

  it("rejects unsafe malformed JSON", () => {
    const result = parseDocument("{");
    expect(result.ok).toBe(false);
  });

  it("dispatches serializable node commands", () => {
    const document = createEmptyDocument();
    const result = dispatchCommand(document, { type: "node.create", title: "Child" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation?.commandType).toBe("node.create");
    expect(Object.keys(result.document.nodes)).toHaveLength(2);
  });

  it("imports and exports indented text", () => {
    const imported = importIndentedText("Alpha\n  Beta\nGamma");
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(exportIndentedText(imported.value)).toContain("Beta");
  });

  it("searches titles and notes", () => {
    const document = createEmptyDocument();
    const result = dispatchCommand(document, { type: "node.create", title: "Launch checklist" });
    if (!result.ok) throw new Error("command failed");
    expect(searchDocument(result.document, { query: "launch" })).toHaveLength(1);
    expect(() => serializeDocument(result.document)).not.toThrow();
  });

  it("balances root branches across both sides", () => {
    let document = createEmptyDocument();
    for (const title of ["Left branch", "Right branch"]) {
      const result = dispatchCommand(document, { type: "node.create", parentId: document.rootId, title });
      if (!result.ok) throw new Error("command failed");
      document = result.document;
    }

    const layout = simpleTreeLayout(document);
    const root = layout.positions[document.rootId]!;
    const children = document.nodes[document.rootId]!.children;
    expect(children).toHaveLength(2);

    expect(layout.positions[children[0]!]!.x).toBeLessThan(root.x);
    expect(layout.positions[children[1]!]!.x).toBeGreaterThan(root.x);
  });
});
