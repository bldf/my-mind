import { describe, expect, it } from "vitest";
import {
  computeBoundingBox,
  createEmptyDocument,
  dispatchCommand,
  documentToLayoutGraph,
  estimateLayoutNodeHeight,
  estimateLayoutTitleWidth,
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

  it("does not record operations for idempotent node updates", () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    const result = dispatchCommand(document, {
      type: "node.update",
      nodeId: document.rootId,
      patch: { title: "Root" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation).toBeUndefined();
    expect(result.document).toBe(document);
    expect(result.document.revision).toBe(document.revision);
    expect(result.document.nodes[document.rootId]?.title).toBe("Root");
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

  it("adapts estimated node width to mixed-language titles", () => {
    let document = createEmptyDocument({ rootTitle: "Root" });
    for (const title of ["IP", "agents客户端"]) {
      const result = dispatchCommand(document, { type: "node.create", parentId: document.rootId, title });
      if (!result.ok) throw new Error("command failed");
      document = result.document;
    }

    const graph = documentToLayoutGraph(document);
    const compact = graph.nodes.find((node) => node.data.title === "IP")!;
    const mixed = graph.nodes.find((node) => node.data.title === "agents客户端")!;

    expect(compact.width).toBeLessThan(mixed.width);
    expect(compact.width).toBeLessThan(80);
  });

  it("uses explicit title line breaks when estimating layout size", () => {
    const singleLineDocument = createEmptyDocument({ rootTitle: "Alpha Beta" });
    const multiLineDocument = createEmptyDocument({ rootTitle: "Alpha\nBeta" });
    const singleLine = singleLineDocument.nodes[singleLineDocument.rootId]!;
    const multiLine = multiLineDocument.nodes[multiLineDocument.rootId]!;

    expect(estimateLayoutTitleWidth("Alpha\nBeta")).toBe(estimateLayoutTitleWidth("Alpha"));
    expect(estimateLayoutNodeHeight(multiLine)).toBeGreaterThan(estimateLayoutNodeHeight(singleLine));
  });

  it("correctly estimates layout width and height for long URLs", () => {
    const url = "https://weixin.qq.com/https://weixin.qq.com/";
    const document = createEmptyDocument({ rootTitle: url });
    const node = document.nodes[document.rootId]!;

    const estimatedWidth = estimateLayoutTitleWidth(url);
    expect(estimatedWidth).toBeLessThan(300);

    const height = estimateLayoutNodeHeight(node);
    expect(height).toBe(46);
  });

  it("centers single-child subtree when root has only one child", () => {
    let document = createEmptyDocument({ rootTitle: "Root" });

    // 添加唯一子节点
    const result = dispatchCommand(document, { type: "node.create", parentId: document.rootId, title: "Only Child" });
    if (!result.ok) throw new Error("command failed");
    document = result.document;

    // 为子节点添加多个孙节点使子树偏向一侧
    const childId = document.nodes[document.rootId]!.children[0]!;
    for (const title of ["Grand 1", "Grand 2", "Grand 3"]) {
      const r = dispatchCommand(document, { type: "node.create", parentId: childId, title });
      if (!r.ok) throw new Error("command failed");
      document = r.document;
    }

    const layout = simpleTreeLayout(document);
    const bounds = computeBoundingBox(layout.positions, document);

    // 包围盒中心应在原点 (0, 0) 附近
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    expect(Math.abs(centerX)).toBeLessThan(5);
    expect(Math.abs(centerY)).toBeLessThan(5);
  });

  it("does not center (keeps split) when root has multiple children", () => {
    let document = createEmptyDocument({ rootTitle: "Root" });
    for (const title of ["Left", "Right"]) {
      const result = dispatchCommand(document, { type: "node.create", parentId: document.rootId, title });
      if (!result.ok) throw new Error("command failed");
      document = result.document;
    }

    const layout = simpleTreeLayout(document);
    const root = layout.positions[document.rootId]!;
    const children = document.nodes[document.rootId]!.children;

    // 多子节点时保持分裂，根节点在原点
    expect(Math.abs(root.x)).toBeLessThan(100);
    // 子节点分列左右两侧
    expect(layout.positions[children[0]!]!.x).toBeLessThan(root.x);
    expect(layout.positions[children[1]!]!.x).toBeGreaterThan(root.x);
  });
});
