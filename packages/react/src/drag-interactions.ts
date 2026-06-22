import {
  getAncestorIds,
  getDescendantIds,
  type MindMapDocument,
  type NodeId,
} from "@my-mind-node/core";

export type DropIntent =
  | { type: "none"; noOp?: boolean }
  | { type: "reparent"; targetId: NodeId; armed?: boolean; noOp?: boolean }
  | { type: "sort-before"; targetId: NodeId; noOp?: boolean }
  | { type: "sort-after"; targetId: NodeId; noOp?: boolean }
  | { type: "invalid"; targetId?: NodeId; reason: string; noOp?: boolean };

export type DropMode = "reparent" | "sort";
export type DropZone = "before" | "center" | "after";
export type DropGeometryIntent = "reparent" | "sort-before" | "sort-after" | "none";
export type MindNodeBranchSide = "left" | "right" | "up" | "down";

export const EMPTY_DROP_INTENT: DropIntent = { type: "none" };

export interface DropRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface DropGeometryInput {
  movingRect: DropRect;
  targetRect: DropRect;
  layoutDirection: MindMapDocument["layout"]["direction"];
  sortGapPx: number;
  overlapRatio: number;
}

export interface DropGeometryResult {
  type: DropGeometryIntent;
  distance: number;
}

export function getDropZone(
  clientY: number,
  top: number,
  height: number,
  sortZoneRatio: number,
): DropZone {
  const ratio = Math.min(0.45, Math.max(0.12, sortZoneRatio));
  const offset = height <= 0 ? 0.5 : (clientY - top) / height;
  if (offset < ratio) return "before";
  if (offset > 1 - ratio) return "after";
  return "center";
}

function getRectCenter(rect: DropRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function containsPoint(rect: DropRect, point: { x: number; y: number }): boolean {
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

function getIntersectionArea(first: DropRect, second: DropRect): number {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  );
  return width * height;
}

function getOverlapRatio(first: DropRect, second: DropRect): number {
  const smallestArea = Math.max(
    1,
    Math.min(first.width * first.height, second.width * second.height),
  );
  return getIntersectionArea(first, second) / smallestArea;
}

function getSortGap(sortGapPx: number): number {
  return Math.max(8, sortGapPx);
}

function isVerticalSiblingAxis(direction: MindMapDocument["layout"]["direction"]): boolean {
  return direction === "left" || direction === "right";
}

function getCrossAxisOverlapRatio(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): number {
  const overlap = Math.max(0, Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart));
  const shortest = Math.max(1, Math.min(firstEnd - firstStart, secondEnd - secondStart));
  return overlap / shortest;
}

export function getDropGeometry(input: DropGeometryInput): DropGeometryResult {
  const movingCenter = getRectCenter(input.movingRect);
  const targetCenter = getRectCenter(input.targetRect);
  const overlapRatio = getOverlapRatio(input.movingRect, input.targetRect);
  if (containsPoint(input.targetRect, movingCenter) || overlapRatio >= input.overlapRatio) {
    return {
      type: "reparent",
      distance: Math.hypot(movingCenter.x - targetCenter.x, movingCenter.y - targetCenter.y),
    };
  }

  const sortGap = getSortGap(input.sortGapPx);
  if (isVerticalSiblingAxis(input.layoutDirection)) {
    const crossAxisOverlap = getCrossAxisOverlapRatio(
      input.movingRect.left,
      input.movingRect.right,
      input.targetRect.left,
      input.targetRect.right,
    );
    if (crossAxisOverlap < 0.35) return { type: "none", distance: Number.POSITIVE_INFINITY };

    const beforeDistance = input.targetRect.top - movingCenter.y;
    if (beforeDistance > 0 && beforeDistance <= sortGap) {
      return { type: "sort-before", distance: beforeDistance };
    }

    const afterDistance = movingCenter.y - input.targetRect.bottom;
    if (afterDistance > 0 && afterDistance <= sortGap) {
      return { type: "sort-after", distance: afterDistance };
    }
  } else {
    const crossAxisOverlap = getCrossAxisOverlapRatio(
      input.movingRect.top,
      input.movingRect.bottom,
      input.targetRect.top,
      input.targetRect.bottom,
    );
    if (crossAxisOverlap < 0.35) return { type: "none", distance: Number.POSITIVE_INFINITY };

    const beforeDistance = input.targetRect.left - movingCenter.x;
    if (beforeDistance > 0 && beforeDistance <= sortGap) {
      return { type: "sort-before", distance: beforeDistance };
    }

    const afterDistance = movingCenter.x - input.targetRect.right;
    if (afterDistance > 0 && afterDistance <= sortGap) {
      return { type: "sort-after", distance: afterDistance };
    }
  }

  return { type: "none", distance: Number.POSITIVE_INFINITY };
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
  return topLevelNodeIds.sort(
    (a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
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

export function isMoveNoOp(
  document: MindMapDocument,
  movingNodeIds: NodeId[],
  parentId: NodeId,
  index?: number,
): boolean {
  const topLevel = getTopLevelMovableNodeIds(document, movingNodeIds);
  if (topLevel.length === 0) return true;

  const parentChildren: Record<NodeId, NodeId[]> = {};
  const getChildren = (pId: NodeId) => {
    if (!parentChildren[pId]) {
      parentChildren[pId] = [...(document.nodes[pId]?.children ?? [])];
    }
    return parentChildren[pId];
  };

  // Simulate removals
  for (const nodeId of topLevel) {
    const currentParentId = document.nodes[nodeId]?.parentId;
    if (!currentParentId) return false;
    const children = getChildren(currentParentId);
    parentChildren[currentParentId] = children.filter((id) => id !== nodeId);
  }

  // Simulate insertions
  let insertIndex = index;
  for (const nodeId of topLevel) {
    const children = getChildren(parentId);
    const safeIndex =
      insertIndex === undefined
        ? children.length
        : Math.max(0, Math.min(insertIndex, children.length));
    children.splice(safeIndex, 0, nodeId);
    parentChildren[parentId] = children;
    if (insertIndex !== undefined) {
      insertIndex++;
    }
  }

  // Compare children of all affected parents
  for (const pId of Object.keys(parentChildren)) {
    const original = document.nodes[pId as NodeId]?.children ?? [];
    const modified = parentChildren[pId as NodeId];
    if (!modified || original.length !== modified.length) return false;
    for (let i = 0; i < original.length; i++) {
      if (original[i] !== modified[i]) return false;
    }
  }

  return true;
}

export function getDropIntentLabel(intent: DropIntent): string | undefined {
  if (intent.noOp) return undefined;
  if (intent.type === "reparent") return "Drop to add as child";
  if (intent.type === "sort-before") return "Insert before this node";
  if (intent.type === "sort-after") return "Insert after this node";
  if (intent.type === "invalid") return intent.reason;
  return undefined;
}
