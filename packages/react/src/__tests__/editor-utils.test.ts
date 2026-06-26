import { describe, expect, it } from "vitest";
import { createEmptyDocument, dispatchCommand, type MindMapDocument, type NodeId } from "@my-mind-node/core";
import {
  clamp,
  documentsEqual,
  EDIT_HISTORY_CONTROLS,
  getFlowNodeStartPositions,
  getSortGapPx,
  getVisibleSubtreeNodeIds,
  isTextInputActive,
  mergeFlowNodeData,
  normalizeToolbarControls,
  resolveDragInteractionSettings,
  type MindFlowNode,
} from "../editor-utils";
import type { FlowConversionResult } from "../document-to-flow";

describe("editor-utils", () => {
  describe("clamp", () => {
    it("clamps value within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(11, 0, 10)).toBe(10);
    });

    it("handles edge cases", () => {
      expect(clamp(0, 0, 0)).toBe(0);
      expect(clamp(10, 10, 20)).toBe(10);
      expect(clamp(20, 10, 20)).toBe(20);
    });
  });

  describe("documentsEqual", () => {
    it("returns true for identical documents", () => {
      const doc1 = createEmptyDocument({ rootTitle: "Root" });
      const doc2: MindMapDocument = JSON.parse(JSON.stringify(doc1));
      expect(documentsEqual(doc1, doc2)).toBe(true);
    });

    it("returns false for different documents", () => {
      const doc1 = createEmptyDocument({ rootTitle: "Root" });
      const doc2 = createEmptyDocument({ rootTitle: "Different" });
      expect(documentsEqual(doc1, doc2)).toBe(false);
    });

    it("returns true for same reference", () => {
      const doc = createEmptyDocument();
      expect(documentsEqual(doc, doc)).toBe(true);
    });
  });

  describe("normalizeToolbarControls", () => {
    it("filters out search when searchHidden is true", () => {
      const controls = ["theme", "search", "fitView"] as const;
      const result = normalizeToolbarControls([...controls], { readonly: false, searchHidden: true });
      expect(result).not.toContain("search");
      expect(result).toContain("theme");
      expect(result).toContain("fitView");
    });

    it("keeps search when searchHidden is false", () => {
      const controls = ["theme", "search", "fitView"] as const;
      const result = normalizeToolbarControls([...controls], { readonly: false, searchHidden: false });
      expect(result).toContain("search");
    });

    it("filters out edit history controls in readonly mode", () => {
      const controls = ["theme", "undo", "redo", "reset", "fitView"] as const;
      const result = normalizeToolbarControls([...controls], { readonly: true, searchHidden: false });
      expect(result).not.toContain("undo");
      expect(result).not.toContain("redo");
      expect(result).not.toContain("reset");
      expect(result).toContain("theme");
      expect(result).toContain("fitView");
    });

    it("keeps edit history controls in editable mode", () => {
      const controls = ["undo", "redo", "reset"] as const;
      const result = normalizeToolbarControls([...controls], { readonly: false, searchHidden: false });
      expect(result).toContain("undo");
      expect(result).toContain("redo");
      expect(result).toContain("reset");
    });
  });

  describe("EDIT_HISTORY_CONTROLS", () => {
    it("contains undo, redo, reset", () => {
      expect(EDIT_HISTORY_CONTROLS.has("undo")).toBe(true);
      expect(EDIT_HISTORY_CONTROLS.has("redo")).toBe(true);
      expect(EDIT_HISTORY_CONTROLS.has("reset")).toBe(true);
    });

    it("does not contain other controls", () => {
      expect(EDIT_HISTORY_CONTROLS.has("theme")).toBe(false);
      expect(EDIT_HISTORY_CONTROLS.has("search")).toBe(false);
      expect(EDIT_HISTORY_CONTROLS.has("fitView")).toBe(false);
    });
  });

  describe("isTextInputActive", () => {
    it("returns false when no active element", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      expect(isTextInputActive(container)).toBe(false);
      container.remove();
    });

    it("returns true when active element is an input inside container", () => {
      const container = document.createElement("div");
      const input = document.createElement("input");
      container.appendChild(input);
      document.body.appendChild(container);
      input.focus();
      expect(isTextInputActive(container)).toBe(true);
      container.remove();
    });

    it("returns false when active element is outside container", () => {
      const container = document.createElement("div");
      const outside = document.createElement("input");
      document.body.appendChild(container);
      document.body.appendChild(outside);
      outside.focus();
      expect(isTextInputActive(container)).toBe(false);
      container.remove();
      outside.remove();
    });
  });

  describe("getVisibleSubtreeNodeIds", () => {
    function makeDoc(): MindMapDocument {
      let doc = createEmptyDocument({ rootTitle: "Root" });
      const r1 = dispatchCommand(doc, { type: "node.create", parentId: doc.rootId, title: "A" });
      if (!r1.ok) throw new Error("failed");
      doc = r1.document;
      const r2 = dispatchCommand(doc, { type: "node.create", parentId: doc.rootId, title: "B" });
      if (!r2.ok) throw new Error("failed");
      doc = r2.document;
      const childA = doc.nodes[doc.rootId]!.children[0]!;
      const r3 = dispatchCommand(doc, { type: "node.create", parentId: childA, title: "A1" });
      if (!r3.ok) throw new Error("failed");
      doc = r3.document;
      return doc;
    }

    it("returns all visible nodes in subtree", () => {
      const doc = makeDoc();
      const root = doc.rootId;
      const result = getVisibleSubtreeNodeIds(doc, [root], root);
      expect(result.length).toBe(4);
    });

    it("returns only subtree nodes for a branch root", () => {
      const doc = makeDoc();
      const childA = doc.nodes[doc.rootId]!.children[0]!;
      const result = getVisibleSubtreeNodeIds(doc, [childA], doc.rootId);
      expect(result.length).toBe(2);
    });
  });

  describe("getFlowNodeStartPositions", () => {
    it("returns positions for matching node ids", () => {
      const nodes: MindFlowNode[] = [
        { id: "1", position: { x: 10, y: 20 }, data: {} as never, type: "mindNode" },
        { id: "2", position: { x: 30, y: 40 }, data: {} as never, type: "mindNode" },
        { id: "3", position: { x: 50, y: 60 }, data: {} as never, type: "mindNode" },
      ] as MindFlowNode[];
      const result = getFlowNodeStartPositions(nodes, ["1" as NodeId, "3" as NodeId]);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["1"]).toEqual({ x: 10, y: 20 });
      expect(result["3"]).toEqual({ x: 50, y: 60 });
    });

    it("returns empty object for no matching ids", () => {
      const nodes: MindFlowNode[] = [
        { id: "1", position: { x: 10, y: 20 }, data: {} as never, type: "mindNode" },
      ] as MindFlowNode[];
      const result = getFlowNodeStartPositions(nodes, ["999" as NodeId]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("resolveDragInteractionSettings", () => {
    it("returns defaults when config is undefined", () => {
      const result = resolveDragInteractionSettings(undefined);
      expect(result.enabled).toBe(true);
      expect(result.sortZoneRatio).toBe(0.3);
      expect(result.flashDurationMs).toBe(320);
      expect(result.autoLayoutOnDrop).toBe(true);
      expect(result.showAddChildControl).toBe(true);
      expect(result.showCollapseControl).toBe(true);
    });

    it("overrides defaults with provided config", () => {
      const result = resolveDragInteractionSettings({
        enabled: false,
        sortZoneRatio: 0.5,
        flashDurationMs: 500,
        autoLayoutOnDrop: false,
        showAddChildControl: false,
        showCollapseControl: false,
      });
      expect(result.enabled).toBe(false);
      expect(result.sortZoneRatio).toBe(0.5);
      expect(result.flashDurationMs).toBe(500);
      expect(result.autoLayoutOnDrop).toBe(false);
      expect(result.showAddChildControl).toBe(false);
      expect(result.showCollapseControl).toBe(false);
    });
  });

  describe("getSortGapPx", () => {
    it("returns clamped gap for left direction", () => {
      const doc = createEmptyDocument();
      doc.layout.direction = "left";
      doc.layout.gapY = 100;
      const result = getSortGapPx(doc, 0.3);
      expect(result).toBeGreaterThanOrEqual(32);
      expect(result).toBeLessThanOrEqual(96);
    });

    it("returns clamped gap for right direction", () => {
      const doc = createEmptyDocument();
      doc.layout.direction = "right";
      doc.layout.gapY = 50;
      const result = getSortGapPx(doc, 0.3);
      expect(result).toBeGreaterThanOrEqual(32);
      expect(result).toBeLessThanOrEqual(96);
    });
  });

  describe("mergeFlowNodeData", () => {
    it("returns nextData nodes when keepPositions is false", () => {
      const nextData = {
        nodes: [
          { id: "1", position: { x: 1, y: 1 }, data: {} as never, type: "mindNode" },
        ] as MindFlowNode[],
        edges: [],
      } as FlowConversionResult;
      const currentNodes: MindFlowNode[] = [];
      const result = mergeFlowNodeData(nextData, currentNodes, false);
      expect(result).toBe(nextData.nodes);
    });

    it("preserves positions when keepPositions is true and data unchanged", () => {
      const currentNode: MindFlowNode = {
        id: "1",
        position: { x: 100, y: 200 },
        data: { node: {} as never } as never,
        style: { fill: "#fff" },
        type: "mindNode",
      } as MindFlowNode;
      const nextData = {
        nodes: [
          {
            id: "1",
            position: { x: 0, y: 0 },
            data: currentNode.data,
            style: currentNode.style,
            type: "mindNode",
          } as MindFlowNode,
        ],
        edges: [],
      } as FlowConversionResult;
      const result = mergeFlowNodeData(nextData, [currentNode], true);
      expect(result[0]).toBe(currentNode);
    });
  });
});
