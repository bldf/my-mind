import { describe, expect, it } from "vitest";
import { createEmptyDocument, createNode, asNodeId } from "@my-mind-node/core";
import { buildBranchTreeItems } from "../branch-tree";

describe("branch-tree", () => {
  it("returns empty list for document with only root node", () => {
    const doc = createEmptyDocument();
    expect(buildBranchTreeItems(doc)).toEqual([]);
  });

  it("returns level-1 children with correct depth and properties", () => {
    const doc = createEmptyDocument();
    const rootId = doc.rootId;

    const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
    doc.nodes[rootId]!.children.push(nodeA.id);
    doc.nodes[nodeA.id] = nodeA;

    const items = buildBranchTreeItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0]!).toEqual({
      nodeId: nodeA.id,
      depth: 1,
      childItems: [],
      hasDocumentChildren: false,
      fallbackLeaf: undefined,
    });
  });

  it("applies level-1 fallback when no level-2 children have subchildren", () => {
    const doc = createEmptyDocument();
    const rootId = doc.rootId;

    const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
    doc.nodes[rootId]!.children.push(nodeA.id);
    doc.nodes[nodeA.id] = nodeA;

    const nodeB = createNode({ id: asNodeId("node-b"), parentId: nodeA.id });
    doc.nodes[nodeA.id]!.children.push(nodeB.id);
    doc.nodes[nodeB.id] = nodeB;

    const items = buildBranchTreeItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0]!.nodeId).toBe(nodeA.id);
    expect(items[0]!.childItems).toHaveLength(1);
    expect(items[0]!.childItems[0]!).toEqual({
      nodeId: nodeB.id,
      depth: 2,
      childItems: [],
      hasDocumentChildren: false,
      fallbackLeaf: true,
    });
  });

  it("keeps only parent level-2 nodes and filters out leaf level-2 nodes when parent exists", () => {
    const doc = createEmptyDocument();
    const rootId = doc.rootId;

    const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
    doc.nodes[rootId]!.children.push(nodeA.id);
    doc.nodes[nodeA.id] = nodeA;

    // nodeB is a leaf level-2
    const nodeB = createNode({ id: asNodeId("node-b"), parentId: nodeA.id });
    doc.nodes[nodeA.id]!.children.push(nodeB.id);
    doc.nodes[nodeB.id] = nodeB;

    // nodeC has a child nodeD (level-3), so nodeC is a parent level-2
    const nodeC = createNode({ id: asNodeId("node-c"), parentId: nodeA.id });
    doc.nodes[nodeA.id]!.children.push(nodeC.id);
    doc.nodes[nodeC.id] = nodeC;

    const nodeD = createNode({ id: asNodeId("node-d"), parentId: nodeC.id });
    doc.nodes[nodeC.id]!.children.push(nodeD.id);
    doc.nodes[nodeD.id] = nodeD;

    const items = buildBranchTreeItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0]!.childItems).toHaveLength(1);
    expect(items[0]!.childItems[0]!.nodeId).toBe(nodeC.id); // only nodeC, nodeB is filtered out
    expect(items[0]!.childItems[0]!.childItems).toHaveLength(1);
    expect(items[0]!.childItems[0]!.childItems[0]!).toEqual({
      nodeId: nodeD.id,
      depth: 3,
      childItems: [],
      hasDocumentChildren: false,
      fallbackLeaf: true, // fallback leaf for level-2 nodeC
    });
  });
});
