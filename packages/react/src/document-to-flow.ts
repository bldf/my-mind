import { getVisibleNodeIds } from "@my-mind-node/core";
import type { MindMapDocument, MindMapNode, NodeId } from "@my-mind-node/core";
import type { ReactNode } from "react";
import type { Edge, Node } from "@xyflow/react";

export interface FlowConversionOptions {
  viewRootId?: NodeId;
  selectedNodeIds?: NodeId[];
  highlightedNodeIds?: NodeId[];
  readonly?: boolean;
  onTitleCommit?: (nodeId: NodeId, title: string) => void;
  onEnterNodeView?: (nodeId: NodeId) => void;
  onResizeNode?: (nodeIds: NodeId[], delta: number) => void;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
}

function getMetadataString(node: MindMapNode, key: string): string | undefined {
  const value = node.metadata[key];
  return typeof value === "string" ? value : undefined;
}

function getEdgeColor(source: MindMapNode, target: MindMapNode): string | undefined {
  return (
    getMetadataString(target, "branchEdgeColor") ??
    getMetadataString(source, "branchEdgeColor") ??
    target.style.borderColor ??
    source.style.borderColor
  );
}

function getTreeEdgeHandles(source: MindMapNode, target: MindMapNode) {
  const deltaX = target.position.x - source.position.x;

  return deltaX < 0
    ? { sourceHandle: "source-left", targetHandle: "target-right" }
    : { sourceHandle: "source-right", targetHandle: "target-left" };
}

export function documentToFlow(document: MindMapDocument, options: FlowConversionOptions = {}) {
  const viewRootId = options.viewRootId ?? document.rootId;
  const selected = new Set(options.selectedNodeIds ?? []);
  const highlighted = new Set(options.highlightedNodeIds ?? []);
  const visibleIds = getVisibleNodeIds(document, viewRootId);
  const visibleSet = new Set(visibleIds);

  const nodes: Node[] = visibleIds.flatMap((nodeId) => {
    const node = document.nodes[nodeId];
    if (!node) return [];
    return {
      id: node.id,
      type: "mindNode",
      position: { ...node.position },
      selected: selected.has(node.id),
      data: {
        node,
        highlighted: highlighted.has(node.id),
        readonly: options.readonly,
        onTitleCommit: options.onTitleCommit,
        onEnterNodeView: options.onEnterNodeView,
        onResizeNode: options.onResizeNode,
        renderNode: options.renderNode,
      },
    };
  });

  const treeEdges: Edge[] = visibleIds.flatMap((nodeId) => {
    const node = document.nodes[nodeId];
    if (!node) return [];
    return node.children
      .filter((childId) => visibleSet.has(childId))
      .flatMap((childId) => {
        const child = document.nodes[childId];
        if (!child) return [];
        const edgeColor = getEdgeColor(node, child);
        return {
          id: `${node.id}->${childId}`,
          source: node.id,
          target: childId,
          type: "mindBezier",
          ...getTreeEdgeHandles(node, child),
          style: edgeColor ? { stroke: edgeColor } : undefined,
          data: {
            label: "",
          },
        };
      });
  });

  const connectionEdges: Edge[] = document.connections
    .filter((connection) => visibleSet.has(connection.sourceId) && visibleSet.has(connection.targetId))
    .flatMap((connection) => {
      const source = document.nodes[connection.sourceId];
      const target = document.nodes[connection.targetId];
      if (!source || !target) return [];
      const edgeColor = connection.style?.borderColor ?? getEdgeColor(source, target);
      return {
        id: connection.id,
        source: connection.sourceId,
        target: connection.targetId,
        type: "mindBezier",
        label: connection.label,
        ...getTreeEdgeHandles(source, target),
        style: edgeColor ? { stroke: edgeColor } : undefined,
        data: {
          label: connection.label,
          connection,
        },
      };
    });

  return {
    nodes,
    edges: [...treeEdges, ...connectionEdges],
  };
}
