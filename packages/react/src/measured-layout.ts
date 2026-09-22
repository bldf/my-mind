import { setNodeCollapsed, type LayoutNodeSize, type MindMapDocument } from "@my-mind-node/core";
import type { Node, NodeChange } from "@xyflow/react";

export type NodeSizeMap = Record<string, LayoutNodeSize>;
export type CollapsedOverrides = Record<string, { collapsed?: boolean; left?: boolean; right?: boolean }>;

/** 小于该差值的尺寸抖动不触发重新排布，避免亚像素测量导致的循环。 */
const SIZE_CHANGE_TOLERANCE_PX = 0.5;

function isSizeChanged(previous: LayoutNodeSize | undefined, next: LayoutNodeSize): boolean {
  if (!previous) return true;
  return (
    Math.abs(previous.width - next.width) > SIZE_CHANGE_TOLERANCE_PX ||
    Math.abs(previous.height - next.height) > SIZE_CHANGE_TOLERANCE_PX
  );
}

/**
 * 从 React Flow 的 dimensions 变更中收集节点尺寸。
 * 尺寸无实质变化时返回原对象，便于调用方跳过重排。
 */
export function collectMeasuredNodeSizes<NodeType extends Node>(
  changes: Array<NodeChange<NodeType>>,
  current: NodeSizeMap,
): NodeSizeMap {
  let next = current;
  for (const change of changes) {
    if (change.type !== "dimensions" || !change.dimensions) continue;
    const { width, height } = change.dimensions;
    if (!(width > 0) || !(height > 0)) continue;
    const size = { width, height };
    if (!isSizeChanged(next[change.id], size)) continue;
    if (next === current) next = { ...current };
    next[change.id] = size;
  }
  return next;
}

export function hasAllNodeSizes(nodeIds: string[], sizes: NodeSizeMap): boolean {
  return nodeIds.every((nodeId) => sizes[nodeId] !== undefined);
}

/**
 * 将只读视图中的折叠状态叠加到文档上；无覆盖时返回原文档。
 */
export function applyCollapsedOverrides(
  document: MindMapDocument,
  overrides: CollapsedOverrides,
): MindMapDocument {
  const entries = Object.entries(overrides);
  if (entries.length === 0) return document;

  let changed = false;
  const nodes = { ...document.nodes };

  for (const [nodeId, override] of entries) {
    const node = nodes[nodeId];
    if (!node) continue;
    let next = node;
    if (override.collapsed !== undefined) next = setNodeCollapsed(next, override.collapsed);
    if (override.left !== undefined) next = setNodeCollapsed(next, override.left, "left");
    if (override.right !== undefined) next = setNodeCollapsed(next, override.right, "right");
    if (next.collapsed !== node.collapsed ||
        next.metadata.collapsedLeft !== node.metadata.collapsedLeft ||
        next.metadata.collapsedRight !== node.metadata.collapsedRight) {
      nodes[nodeId] = next;
      changed = true;
    }
  }

  return changed ? { ...document, nodes } : document;
}
