import { describe, expect, it } from "vitest";
import {
  computeBoundingBox,
  createEmptyDocument,
  dispatchCommand,
  documentToLayoutGraph,
  estimateLayoutNodeHeight,
  estimateLayoutTitleWidth,
  exportIndentedText,
  countSideDescendants,
  getVisibleNodeIds,
  importIndentedText,
  isNodeSideCollapsed,
  isNodeTwoSided,
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

  describe("simpleTreeLayout nodeSizes", () => {
    const createSiblingDocument = () => {
      let document = createEmptyDocument({ rootTitle: "Root" });
      const result = dispatchCommand(document, { type: "node.create", parentId: document.rootId, title: "Parent" });
      if (!result.ok) throw new Error("command failed");
      document = result.document;
      const parentId = document.nodes[document.rootId]!.children[0]!;
      for (const title of ["Tall", "Next"]) {
        const r = dispatchCommand(document, { type: "node.create", parentId, title });
        if (!r.ok) throw new Error("command failed");
        document = r.document;
      }
      const [tallId, nextId] = document.nodes[parentId]!.children;
      return { document, parentId, tallId: tallId!, nextId: nextId! };
    };

    it("stacks siblings by measured heights so tall nodes do not overlap", () => {
      const { document, tallId, nextId } = createSiblingDocument();
      const layout = simpleTreeLayout(document, document.rootId, {
        nodeSizes: { [tallId]: { width: 320, height: 400 } },
      });
      const tall = layout.positions[tallId]!;
      const next = layout.positions[nextId]!;

      expect(next.y).toBeGreaterThanOrEqual(tall.y + 400);
    });

    it("places children beyond the measured parent width", () => {
      const { document, parentId, tallId } = createSiblingDocument();
      const layout = simpleTreeLayout(document, document.rootId, {
        nodeSizes: { [parentId]: { width: 500, height: 40 } },
      });
      const parent = layout.positions[parentId]!;

      expect(layout.positions[tallId]!.x).toBeGreaterThan(parent.x + 500);
    });

    it("falls back to estimated sizes for missing or invalid entries", () => {
      const { document, tallId } = createSiblingDocument();
      const estimated = simpleTreeLayout(document);
      const withInvalidSize = simpleTreeLayout(document, document.rootId, {
        nodeSizes: { [tallId]: { width: 0, height: Number.NaN } },
      });

      expect(withInvalidSize.positions).toEqual(estimated.positions);
    });

    it("applies node scale on top of measured sizes", () => {
      const { document, tallId, nextId } = createSiblingDocument();
      document.nodes[tallId]!.style.scale = 2;
      const layout = simpleTreeLayout(document, document.rootId, {
        nodeSizes: { [tallId]: { width: 100, height: 100 } },
      });

      expect(layout.positions[nextId]!.y).toBeGreaterThanOrEqual(layout.positions[tallId]!.y + 200);
    });
  });

  describe("independent left/right branch collapse", () => {
    function createTwoSidedDocument() {
      let doc = createEmptyDocument({ title: "Map", rootTitle: "Root" });
      const rootId = doc.rootId;
      // create 4 children: 2 left (c0, c1), 2 right (c2, c3)
      for (let i = 0; i < 4; i++) {
        doc = dispatchCommand(doc, { type: "node.create", parentId: rootId, title: `Child ${i}` }).document;
      }
      const [c0, c1, c2, c3] = doc.nodes[rootId]!.children;
      // create grandchild under c0
      doc = dispatchCommand(doc, { type: "node.create", parentId: c0, title: "Grandchild 0" }).document;
      return { doc, rootId, c0: c0!, c1: c1!, c2: c2!, c3: c3! };
    }

    it("identifies two-sided root node", () => {
      const { doc, rootId, c0 } = createTwoSidedDocument();
      expect(isNodeTwoSided(doc, doc.nodes[rootId]!)).toBe(true);
      expect(isNodeTwoSided(doc, doc.nodes[c0]!)).toBe(false);
    });

    it("collapses left side without affecting right side", () => {
      const { doc, rootId, c0, c1, c2, c3 } = createTwoSidedDocument();
      const collapsedLeftDoc = dispatchCommand(doc, {
        type: "node.collapse",
        nodeIds: [rootId],
        collapsed: true,
        side: "left",
      }).document;

      expect(isNodeSideCollapsed(collapsedLeftDoc.nodes[rootId]!, "left")).toBe(true);
      expect(isNodeSideCollapsed(collapsedLeftDoc.nodes[rootId]!, "right")).toBe(false);
      expect(collapsedLeftDoc.nodes[rootId]!.collapsed).toBe(false);

      const visibleIds = getVisibleNodeIds(collapsedLeftDoc);
      // Left children c0, c1 and grandchild under c0 should NOT be visible
      expect(visibleIds).not.toContain(c0);
      expect(visibleIds).not.toContain(c1);
      // Right children c2, c3 should be visible
      expect(visibleIds).toContain(c2);
      expect(visibleIds).toContain(c3);
      expect(visibleIds).toContain(rootId);

      // Layout should only position root and right children
      const layout = simpleTreeLayout(collapsedLeftDoc);
      expect(layout.positions[c0]).toBeUndefined();
      expect(layout.positions[c1]).toBeUndefined();
      expect(layout.positions[c2]).toBeDefined();
      expect(layout.positions[c3]).toBeDefined();
    });

    it("collapses right side without affecting left side", () => {
      const { doc, rootId, c0, c1, c2, c3 } = createTwoSidedDocument();
      const collapsedRightDoc = dispatchCommand(doc, {
        type: "node.collapse",
        nodeIds: [rootId],
        collapsed: true,
        side: "right",
      }).document;

      expect(isNodeSideCollapsed(collapsedRightDoc.nodes[rootId]!, "left")).toBe(false);
      expect(isNodeSideCollapsed(collapsedRightDoc.nodes[rootId]!, "right")).toBe(true);
      expect(collapsedRightDoc.nodes[rootId]!.collapsed).toBe(false);

      const visibleIds = getVisibleNodeIds(collapsedRightDoc);
      // Left children should be visible
      expect(visibleIds).toContain(c0);
      expect(visibleIds).toContain(c1);
      // Right children should NOT be visible
      expect(visibleIds).not.toContain(c2);
      expect(visibleIds).not.toContain(c3);
    });

    it("counts side descendants accurately", () => {
      const { doc, rootId } = createTwoSidedDocument();
      // Left has c0 (with 1 grandchild) and c1 -> total 3
      expect(countSideDescendants(doc, doc.nodes[rootId]!, "left")).toBe(3);
      // Right has c2 and c3 -> total 2
      expect(countSideDescendants(doc, doc.nodes[rootId]!, "right")).toBe(2);
    });

    it.each([1, 2])("keeps visibility and layout consistent with %i children on the collapsed side", (remaining) => {
      const { doc, rootId, c0, c1, c2, c3 } = createTwoSidedDocument();
      for (const id of [c0, c1]) doc.nodes[id]!.metadata.branchSide = "left";
      for (const id of [c2, c3]) doc.nodes[id]!.metadata.branchSide = "right";
      let current = dispatchCommand(doc, { type: "node.collapse", nodeIds: [rootId], collapsed: true, side: "left" }).document;
      for (const id of [c2, c3, ...(remaining === 1 ? [c1] : [])]) {
        current = dispatchCommand(current, { type: "node.delete", nodeId: id }).document;
      }
      expect(getVisibleNodeIds(current)).toEqual([rootId]);
      expect(Object.keys(simpleTreeLayout(current).positions)).toEqual([rootId]);
      current = dispatchCommand(current, { type: "node.collapse", nodeIds: [rootId], collapsed: false, side: "left" }).document;
      expect(getVisibleNodeIds(current)).toContain(c0);
      expect(simpleTreeLayout(current).positions[c0]!.x).toBeLessThan(simpleTreeLayout(current).positions[rootId]!.x);
    });

    it("expands left side when both sides were collapsed", () => {
      const { doc, rootId, c0, c1, c2, c3 } = createTwoSidedDocument();
      // Fully collapse root
      let current = dispatchCommand(doc, {
        type: "node.collapse",
        nodeIds: [rootId],
        collapsed: true,
      }).document;
      expect(current.nodes[rootId]!.collapsed).toBe(true);

      // Expand left side only
      current = dispatchCommand(current, {
        type: "node.collapse",
        nodeIds: [rootId],
        collapsed: false,
        side: "left",
      }).document;

      expect(isNodeSideCollapsed(current.nodes[rootId]!, "left")).toBe(false);
      expect(isNodeSideCollapsed(current.nodes[rootId]!, "right")).toBe(true);
      expect(current.nodes[rootId]!.collapsed).toBe(false);

      const visible = getVisibleNodeIds(current);
      expect(visible).toContain(c0);
      expect(visible).toContain(c1);
      expect(visible).not.toContain(c2);
      expect(visible).not.toContain(c3);
    });
  });
});
