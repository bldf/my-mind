import type { LayoutNodeSize, MindMapDocument } from "@my-mind-node/core";
import type { Node, NodeChange } from "@xyflow/react";

export type NodeSizeMap = Record<string, LayoutNodeSize>;
export type CollapsedOverrides = Record<string, boolean>;

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
  const entries = Object.entries(overrides).filter(
    ([nodeId, collapsed]) => document.nodes[nodeId] && document.nodes[nodeId]!.collapsed !== collapsed,
  );
  if (entries.length === 0) return document;

  const nodes = { ...document.nodes };
  for (const [nodeId, collapsed] of entries) {
    nodes[nodeId] = { ...nodes[nodeId]!, collapsed };
  }
  return { ...document, nodes };
}
