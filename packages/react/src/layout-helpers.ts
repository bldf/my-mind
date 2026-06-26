import { getAncestorIds } from "@my-mind-node/core";
import type { MindMapDocument, NodeId } from "@my-mind-node/core";

/**
 * Calculates the maximum depth of the mind map tree.
 * Root node is depth 1, level-1 child is depth 2, etc.
 */
export function getTreeMaxDepth(document: MindMapDocument): number {
  const rootId = document.rootId;
  if (!rootId || !document.nodes[rootId]) return 0;

  const getDepth = (nodeId: NodeId, currentDepth: number): number => {
    const node = document.nodes[nodeId];
    if (!node || node.children.length === 0) return currentDepth;
    let max = currentDepth;
    for (const childId of node.children) {
      max = Math.max(max, getDepth(childId, currentDepth + 1));
    }
    return max;
  };

  return getDepth(rootId, 1);
}

/**
 * Finds the level-1 branch NodeId that is an ancestor of target nodeId.
 * If nodeId is the level-1 branch itself, returns nodeId.
 * If nodeId is rootId, returns undefined.
 */
export function getRootBranchIdForNode(
  document: MindMapDocument,
  nodeId: NodeId,
): NodeId | undefined {
  const rootId = document.rootId;
  if (nodeId === rootId) return undefined;

  const ancestors = getAncestorIds(document, nodeId);
  if (ancestors.length > 0 && ancestors[0] === rootId) {
    return ancestors[1] ?? nodeId;
  }

  // Fallback: check if the node is a direct child of the root node
  const root = document.nodes[rootId];
  if (root && root.children.includes(nodeId)) {
    return nodeId;
  }

  return undefined;
}
