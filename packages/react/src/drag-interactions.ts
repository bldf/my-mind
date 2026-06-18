import { getAncestorIds, getDescendantIds, type MindMapDocument, type NodeId } from "@my-mind-node/core";

export type DropIntent =
  | { type: "none" }
  | { type: "reparent"; targetId: NodeId; armed: boolean }
  | { type: "sort-before"; targetId: NodeId }
  | { type: "sort-after"; targetId: NodeId }
  | { type: "invalid"; targetId?: NodeId; reason: string };

export type DropMode = "reparent" | "sort";
export type DropZone = "before" | "center" | "after";
export type MindNodeBranchSide = "left" | "right" | "up" | "down";

export const EMPTY_DROP_INTENT: DropIntent = { type: "none" };

export function getDropZone(clientY: number, top: number, height: number, sortZoneRatio: number): DropZone {
  const ratio = Math.min(0.45, Math.max(0.12, sortZoneRatio));
  const offset = height <= 0 ? 0.5 : (clientY - top) / height;
  if (offset < ratio) return "before";
  if (offset > 1 - ratio) return "after";
  return "center";
}

function getDocumentOrder(document: MindMapDocument): NodeId[] {
  const result: NodeId[] = [];
  const visit = (nodeId: NodeId) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    result.push(nodeId);
    for (const childId of node.children) visit(childId);
  };
  visit(document.rootId);
  return result;
}

export function getTopLevelMovableNodeIds(document: MindMapDocument, nodeIds: NodeId[]): NodeId[] {
  const uniqueNodeIds = Array.from(new Set(nodeIds)).filter((nodeId) => document.nodes[nodeId]);
  const topLevelNodeIds = uniqueNodeIds.filter((nodeId) => {
    const ancestors = getAncestorIds(document, nodeId);
    return !uniqueNodeIds.some((otherId) => ancestors.includes(otherId));
  });
  const order = new Map(getDocumentOrder(document).map((nodeId, index) => [nodeId, index]));
  return topLevelNodeIds.sort((a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER));
}

export function getDropValidationReason(
  document: MindMapDocument,
  movingNodeIds: NodeId[],
  targetId: NodeId | undefined,
  mode: DropMode,
): string | undefined {
  if (movingNodeIds.length === 0) return "No movable nodes are selected";
  if (movingNodeIds.includes(document.rootId)) return "Root node cannot be moved";
  if (!targetId || !document.nodes[targetId]) return "Drop target does not exist";

  const movingSet = new Set(movingNodeIds);
  if (movingSet.has(targetId)) return "Node cannot be dropped onto itself";

  for (const nodeId of movingNodeIds) {
    if (getDescendantIds(document, nodeId).includes(targetId)) {
      return "Node cannot be dropped onto its own descendant";
    }
  }

  if (mode === "sort") {
    const target = document.nodes[targetId];
    if (!target?.parentId) return "Root node cannot be used as a sort target";
    if (movingSet.has(target.parentId)) return "Node cannot be sorted inside the dragged selection";
  }

  return undefined;
}

export function getSortInsertionIndex(
  document: MindMapDocument,
  targetId: NodeId,
  movingNodeIds: NodeId[],
  placement: "before" | "after",
): number | undefined {
  const target = document.nodes[targetId];
  if (!target?.parentId) return undefined;
  const parent = document.nodes[target.parentId];
  if (!parent) return undefined;
  const movingSet = new Set(movingNodeIds);
  const siblingsWithoutMovingNodes = parent.children.filter((childId) => !movingSet.has(childId));
  const targetIndex = siblingsWithoutMovingNodes.indexOf(targetId);
  if (targetIndex < 0) return undefined;
  return placement === "before" ? targetIndex : targetIndex + 1;
}

export function getDropIntentLabel(intent: DropIntent): string | undefined {
  if (intent.type === "reparent") return intent.armed ? "Drop to add as child" : "Hold to add as child";
  if (intent.type === "sort-before") return "Insert before this node";
  if (intent.type === "sort-after") return "Insert after this node";
  if (intent.type === "invalid") return intent.reason;
  return undefined;
}
