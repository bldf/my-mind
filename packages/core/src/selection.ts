import { getDescendantIds } from "./document";
import type { ConnectionId, MindMapDocument, NodeId, SelectionState } from "./types";

export function createSelection(nodeIds: NodeId[] = [], connectionIds: ConnectionId[] = []): SelectionState {
  return {
    nodeIds: [...new Set(nodeIds)],
    connectionIds: [...new Set(connectionIds)],
    anchorNodeId: nodeIds[0],
  };
}

export function toggleNodeSelection(selection: SelectionState, nodeId: NodeId): SelectionState {
  const exists = selection.nodeIds.includes(nodeId);
  const nodeIds = exists ? selection.nodeIds.filter((id) => id !== nodeId) : [...selection.nodeIds, nodeId];
  return {
    ...selection,
    nodeIds,
    anchorNodeId: nodeIds[0],
  };
}

export function getTopLevelSelectedNodes(document: MindMapDocument, selection: SelectionState): NodeId[] {
  return selection.nodeIds.filter((nodeId) => {
    const descendants = getDescendantIds(document, nodeId);
    return !selection.nodeIds.some((selectedId) => descendants.includes(selectedId));
  });
}
