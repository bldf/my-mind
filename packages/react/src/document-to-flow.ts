import { getVisibleNodeIds } from "@my-mind-node/core";
import type { MindMapDocument, MindMapNode, NodeId } from "@my-mind-node/core";
import type { ReactNode } from "react";
import type { Edge, Node } from "@xyflow/react";

interface BranchPalette {
  node: string;
  border: string;
  edge: string;
  text: string;
}

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

const ROOT_PRESENTATION = {
  backgroundColor: "#ffffff",
  borderColor: "#ffffff",
  color: "#111827",
} as const;

const AUTO_BRANCH_PALETTES: BranchPalette[] = [
  {
    node: "#80d0dc",
    border: "#70c4d0",
    edge: "#6fc7d2",
    text: "#0f2530",
  },
  {
    node: "#b8b6ff",
    border: "#aaa8f3",
    edge: "#aaa8ff",
    text: "#1e1b4b",
  },
  {
    node: "#ebb0db",
    border: "#df9bcf",
    edge: "#e4a3d4",
    text: "#301428",
  },
  {
    node: "#f7c982",
    border: "#efb95f",
    edge: "#edbd6b",
    text: "#35210a",
  },
  {
    node: "#9ed8ac",
    border: "#87c999",
    edge: "#89ce9c",
    text: "#102515",
  },
];

function getMetadataString(node: MindMapNode, key: string): string | undefined {
  const value = node.metadata[key];
  return typeof value === "string" ? value : undefined;
}

function getBranchPaletteByNodeId(document: MindMapDocument, viewRootId: NodeId): Map<NodeId, BranchPalette> {
  const result = new Map<NodeId, BranchPalette>();
  const viewRoot = document.nodes[viewRootId];
  if (!viewRoot) return result;

  const paint = (nodeId: NodeId, palette: BranchPalette) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    result.set(nodeId, palette);
    if (node.collapsed) return;
    for (const childId of node.children) paint(childId, palette);
  };

  viewRoot.children.forEach((childId, index) => paint(childId, AUTO_BRANCH_PALETTES[index % AUTO_BRANCH_PALETTES.length]!));
  return result;
}

function applyDefaultPresentation(node: MindMapNode, palette: BranchPalette | undefined, isViewRoot: boolean): MindMapNode {
  const style = {
    ...node.style,
    backgroundColor: node.style.backgroundColor ?? (isViewRoot ? ROOT_PRESENTATION.backgroundColor : palette?.node),
    borderColor: node.style.borderColor ?? (isViewRoot ? ROOT_PRESENTATION.borderColor : palette?.border),
    color: node.style.color ?? (isViewRoot ? ROOT_PRESENTATION.color : palette?.text),
    fontWeight: node.style.fontWeight ?? (isViewRoot ? "bold" : palette ? "medium" : undefined),
  };

  const shouldAddBranchEdgeColor = Boolean(palette && !node.style.borderColor && !getMetadataString(node, "branchEdgeColor"));
  const metadata = shouldAddBranchEdgeColor ? { ...node.metadata, branchEdgeColor: palette!.edge } : node.metadata;

  return {
    ...node,
    style,
    metadata,
  };
}

function getEdgeColor(source: MindMapNode, target: MindMapNode): string | undefined {
  return getMetadataString(target, "branchEdgeColor") ?? getMetadataString(source, "branchEdgeColor") ?? target.style.borderColor ?? source.style.borderColor;
}

function getTreeEdgeHandles(source: MindMapNode, target: MindMapNode) {
  const deltaX = target.position.x - source.position.x;

  return deltaX < 0 ? { sourceHandle: "source-left", targetHandle: "target-right" } : { sourceHandle: "source-right", targetHandle: "target-left" };
}

export function documentToFlow(document: MindMapDocument, options: FlowConversionOptions = {}) {
  const viewRootId = options.viewRootId ?? document.rootId;
  const selected = new Set(options.selectedNodeIds ?? []);
  const highlighted = new Set(options.highlightedNodeIds ?? []);
  const visibleIds = getVisibleNodeIds(document, viewRootId);
  const visibleSet = new Set(visibleIds);
  const branchPaletteByNodeId = getBranchPaletteByNodeId(document, viewRootId);
  const presentationNodes = new Map(
    visibleIds.flatMap((nodeId) => {
      const node = document.nodes[nodeId];
      if (!node) return [];
      return [[nodeId, applyDefaultPresentation(node, branchPaletteByNodeId.get(nodeId), nodeId === viewRootId)]];
    }),
  );

  const nodes: Node[] = visibleIds.flatMap((nodeId) => {
    const node = presentationNodes.get(nodeId);
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
    const node = presentationNodes.get(nodeId);
    if (!node) return [];
    return node.children
      .filter((childId) => visibleSet.has(childId))
      .flatMap((childId) => {
        const child = presentationNodes.get(childId);
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
      const source = presentationNodes.get(connection.sourceId);
      const target = presentationNodes.get(connection.targetId);
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
