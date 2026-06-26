import { getVisibleNodeIds, type MindMapDocument, type NodeId } from "@my-mind-node/core";
import type { Node } from "@xyflow/react";
import type { FlowConversionResult } from "./document-to-flow";
import type { MindNodeData } from "./nodes/MindNode";
import type { MindMapEditorProps, ViewToolbarControl } from "./types";

export type MindFlowNode = Node<MindNodeData, "mindNode">;

export interface DragInteractionSettings {
  enabled: boolean;
  sortZoneRatio: number;
  flashDurationMs: number;
  autoLayoutOnDrop: boolean;
  showAddChildControl: boolean;
  showCollapseControl: boolean;
}

export const EDIT_HISTORY_CONTROLS = new Set<ViewToolbarControl>(["undo", "redo", "reset"]);

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function documentsEqual(first: MindMapDocument, second: MindMapDocument): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function normalizeToolbarControls(
  controls: ViewToolbarControl[],
  options: { readonly: boolean; searchHidden: boolean },
): ViewToolbarControl[] {
  return controls.filter((control) => {
    if (control === "search" && options.searchHidden) return false;
    if (options.readonly && EDIT_HISTORY_CONTROLS.has(control)) return false;
    return true;
  });
}

export function isTextInputActive(container: HTMLElement): boolean {
  const activeElement = container.ownerDocument.activeElement;
  if (!activeElement || !container.contains(activeElement)) return false;
  return (
    activeElement.matches(
      "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
    ) || activeElement.closest(".mmn-node__resize-handle") !== null
  );
}

export function getVisibleSubtreeNodeIds(
  document: MindMapDocument,
  rootIds: NodeId[],
  viewRootId: NodeId,
): NodeId[] {
  const visibleSet = new Set(getVisibleNodeIds(document, viewRootId));
  const result: NodeId[] = [];
  const seen = new Set<NodeId>();

  const visit = (nodeId: NodeId) => {
    if (seen.has(nodeId) || !visibleSet.has(nodeId)) return;
    const node = document.nodes[nodeId];
    if (!node) return;
    seen.add(nodeId);
    result.push(nodeId);
    if (node.collapsed) return;
    for (const childId of node.children) visit(childId);
  };

  for (const rootId of rootIds) visit(rootId);
  return result;
}

export function getFlowNodeStartPositions(
  nodes: MindFlowNode[],
  nodeIds: NodeId[],
): Record<string, { x: number; y: number }> {
  const nodeIdSet = new Set(nodeIds.map(String));
  return Object.fromEntries(
    nodes.filter((node) => nodeIdSet.has(node.id)).map((node) => [node.id, { ...node.position }]),
  );
}

export function resolveDragInteractionSettings(
  config: MindMapEditorProps["dragInteraction"],
): DragInteractionSettings {
  return {
    enabled: config?.enabled ?? true,
    sortZoneRatio: config?.sortZoneRatio ?? 0.3,
    flashDurationMs: config?.flashDurationMs ?? 320,
    autoLayoutOnDrop: config?.autoLayoutOnDrop ?? true,
    showAddChildControl: config?.showAddChildControl ?? true,
    showCollapseControl: config?.showCollapseControl ?? true,
  };
}

export function getSortGapPx(document: MindMapDocument, sortZoneRatio: number): number {
  const axisGap =
    document.layout.direction === "left" || document.layout.direction === "right"
      ? document.layout.gapY
      : document.layout.gapX;
  return Math.max(32, Math.min(96, axisGap * (0.35 + sortZoneRatio)));
}

export function mergeFlowNodeData(
  nextData: FlowConversionResult,
  currentNodes: MindFlowNode[],
  keepPositions: boolean,
): MindFlowNode[] {
  if (!keepPositions) return nextData.nodes;
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  return nextData.nodes.map((nextNode) => {
    const currentNode = currentById.get(nextNode.id);
    if (!currentNode) return nextNode;

    const dataChanged = currentNode.data !== nextNode.data;
    const styleChanged = currentNode.style !== nextNode.style;

    if (!dataChanged && !styleChanged) {
      return currentNode;
    }

    return {
      ...currentNode,
      style: nextNode.style,
      data: nextNode.data,
    };
  });
}
