import { describe, expect, it } from "vitest";
import { createEmptyDocument, createNode, asNodeId } from "@my-mind-node/core";
import { getTreeMaxDepth, getRootBranchIdForNode } from "../layout-helpers";

describe("layout-helpers", () => {
  describe("getTreeMaxDepth", () => {
    it("returns 1 for document with only root node", () => {
      const doc = createEmptyDocument();
      expect(getTreeMaxDepth(doc)).toBe(1);
    });

    it("returns 2 for document with level-1 children", () => {
      const doc = createEmptyDocument();
      const rootId = doc.rootId;

      const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
      doc.nodes[rootId]!.children.push(nodeA.id);
      doc.nodes[nodeA.id] = nodeA;

      expect(getTreeMaxDepth(doc)).toBe(2);
    });

    it("returns 3 for document with level-2 children", () => {
      const doc = createEmptyDocument();
      const rootId = doc.rootId;

      const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
      doc.nodes[rootId]!.children.push(nodeA.id);
      doc.nodes[nodeA.id] = nodeA;

      const nodeB = createNode({ id: asNodeId("node-b"), parentId: nodeA.id });
      doc.nodes[nodeA.id]!.children.push(nodeB.id);
      doc.nodes[nodeB.id] = nodeB;

      expect(getTreeMaxDepth(doc)).toBe(3);
    });
  });

  describe("getRootBranchIdForNode", () => {
    it("returns undefined for root node itself", () => {
      const doc = createEmptyDocument();
      expect(getRootBranchIdForNode(doc, doc.rootId)).toBeUndefined();
    });

    it("returns node ID for direct level-1 children of root", () => {
      const doc = createEmptyDocument();
      const rootId = doc.rootId;

      const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
      doc.nodes[rootId]!.children.push(nodeA.id);
      doc.nodes[nodeA.id] = nodeA;

      expect(getRootBranchIdForNode(doc, nodeA.id)).toBe(nodeA.id);
    });

    it("returns level-1 ancestor for nested level-2 children", () => {
      const doc = createEmptyDocument();
      const rootId = doc.rootId;

      const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
      doc.nodes[rootId]!.children.push(nodeA.id);
      doc.nodes[nodeA.id] = nodeA;

      const nodeB = createNode({ id: asNodeId("node-b"), parentId: nodeA.id });
      doc.nodes[nodeA.id]!.children.push(nodeB.id);
      doc.nodes[nodeB.id] = nodeB;

      expect(getRootBranchIdForNode(doc, nodeB.id)).toBe(nodeA.id);
    });
  });
});
