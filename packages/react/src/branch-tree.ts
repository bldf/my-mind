import type { MindMapDocument, NodeId } from "@my-mind-node/core";

export interface BranchTreeItem {
  nodeId: NodeId;
  depth: 1 | 2 | 3;
  childItems: BranchTreeItem[];
  hasDocumentChildren: boolean;
  fallbackLeaf?: boolean;
}

export function buildBranchTreeItems(
  document: MindMapDocument,
  options?: { maxDepth?: 3 },
): BranchTreeItem[] {
  const maxDepth = options?.maxDepth ?? 3;
  if (!document || !document.rootId || !document.nodes) return [];
  const root = document.nodes[document.rootId];
  if (!root) return [];

  const rootChildren = (root.children || []).filter((id) => document.nodes[id]);

  const buildTree = (
    nodeId: NodeId,
    depth: 1 | 2 | 3,
    isFallbackParent = false,
  ): BranchTreeItem | null => {
    const node = document.nodes[nodeId];
    if (!node) return null;

    const hasDocumentChildren = Array.isArray(node.children) && node.children.length > 0;
    const childItems: BranchTreeItem[] = [];

    if (depth < maxDepth && hasDocumentChildren && !isFallbackParent) {
      const validChildren = node.children.filter((id) => document.nodes[id]);
      const childrenWithSubchildren = validChildren.filter((id) => {
        const childNode = document.nodes[id];
        return childNode && Array.isArray(childNode.children) && childNode.children.length > 0;
      });
      const childDepth = (depth + 1) as 2 | 3;
      const shouldUseFallbackLeaves = childrenWithSubchildren.length === 0;

      for (const childId of validChildren) {
        const t = buildTree(childId, childDepth, shouldUseFallbackLeaves);
        if (t) childItems.push(t);
      }
    }

    return {
      nodeId,
      depth,
      childItems,
      hasDocumentChildren,
      fallbackLeaf: isFallbackParent ? true : undefined,
    };
  };

  const result: BranchTreeItem[] = [];
  for (const id of rootChildren) {
    const item = buildTree(id, 1);
    if (item) {
      result.push(item);
    }
  }
  return result;
}
