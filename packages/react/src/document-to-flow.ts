import { getVisibleNodeIds } from "@my-mind-node/core";
import type { MindMapDocument, MindMapNode, NodeId, MindMapTheme } from "@my-mind-node/core";
import type { ReactNode } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { DropIntent, MindNodeBranchSide } from "./drag-interactions";
import type { MindNodeData } from "./nodes/MindNode";

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
  dropIntent?: DropIntent;
  flashNodeId?: NodeId;
  showAddChildControl?: boolean;
  showCollapseControl?: boolean;
  onTitleCommit?: (nodeId: NodeId, title: string) => void;
  onEnterNodeView?: (nodeId: NodeId) => void;
  onResizeNode?: (nodeIds: NodeId[], delta: number) => void;
  onResizeProgress?: (nodeId: NodeId, scale: number) => void;
  onResizeCommit?: (nodeId: NodeId, scale: number) => void;
  onAddChild?: (nodeId: NodeId) => void;
  onToggleCollapse?: (nodeId: NodeId) => void;
  onExpandCollapsed?: (nodeId: NodeId) => void;
  showNodeResizeControls?: boolean;
  nodeResizeStep?: number;
  nodeMinScale?: number;
  nodeMaxScale?: number;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
  theme?: MindMapTheme;
}

export interface FlowConversionResult {
  nodes: Array<Node<MindNodeData, "mindNode">>;
  edges: Edge[];
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

const AUTO_BRANCH_PALETTES_DARK: BranchPalette[] = [
  {
    node: "#13383e",
    border: "#2aa6b8",
    edge: "#2aa6b8",
    text: "#e0f7fa",
  },
  {
    node: "#211d4d",
    border: "#7c77d6",
    edge: "#7c77d6",
    text: "#ede9fe",
  },
  {
    node: "#3b1d33",
    border: "#c773af",
    edge: "#c773af",
    text: "#fdf2f8",
  },
  {
    node: "#3d260f",
    border: "#cca05a",
    edge: "#cca05a",
    text: "#fffbeb",
  },
  {
    node: "#142d1b",
    border: "#5ea36f",
    edge: "#5ea36f",
    text: "#f0fdf4",
  },
];

function getMetadataString(node: MindMapNode, key: string): string | undefined {
  const value = node.metadata[key];
  return typeof value === "string" ? value : undefined;
}

function getBranchPaletteByNodeId(
  document: MindMapDocument,
  viewRootId: NodeId,
  theme?: MindMapTheme,
): Map<NodeId, BranchPalette> {
  const result = new Map<NodeId, BranchPalette>();
  const viewRoot = document.nodes[viewRootId];
  if (!viewRoot) return result;

  const palettes = theme?.mode === "dark" ? AUTO_BRANCH_PALETTES_DARK : AUTO_BRANCH_PALETTES;

  const paint = (nodeId: NodeId, palette: BranchPalette) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    result.set(nodeId, palette);
    if (node.collapsed) return;
    for (const childId of node.children) paint(childId, palette);
  };

  viewRoot.children.forEach((childId, index) =>
    paint(childId, palettes[index % palettes.length]!),
  );
  return result;
}

function applyDefaultPresentation(
  node: MindMapNode,
  palette: BranchPalette | undefined,
  isViewRoot: boolean,
  theme?: MindMapTheme,
): MindMapNode {
  const isDark = theme?.mode === "dark";
  const defaultRootBg = isDark && theme ? theme.colors.node : ROOT_PRESENTATION.backgroundColor;
  const defaultRootBorder = isDark && theme ? theme.colors.node : ROOT_PRESENTATION.borderColor;
  const defaultRootColor = isDark && theme ? theme.colors.nodeText : ROOT_PRESENTATION.color;

  const style = {
    ...node.style,
    backgroundColor:
      node.style.backgroundColor ??
      (isViewRoot ? defaultRootBg : palette?.node),
    borderColor:
      node.style.borderColor ?? (isViewRoot ? defaultRootBorder : palette?.border),
    color: node.style.color ?? (isViewRoot ? defaultRootColor : palette?.text),
    fontWeight: node.style.fontWeight ?? (isViewRoot ? "bold" : palette ? "medium" : undefined),
  };

  const shouldAddBranchEdgeColor = Boolean(
    palette && !node.style.borderColor && !getMetadataString(node, "branchEdgeColor"),
  );
  const metadata = shouldAddBranchEdgeColor
    ? { ...node.metadata, branchEdgeColor: palette!.edge }
    : node.metadata;

  return {
    ...node,
    style,
    metadata,
  };
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

function getLayoutBranchSide(
  direction: MindMapDocument["layout"]["direction"],
): MindNodeBranchSide {
  if (direction === "left") return "left";
  if (direction === "up") return "up";
  if (direction === "down") return "down";
  return "right";
}

function getBranchSide(
  document: MindMapDocument,
  node: MindMapNode,
  viewRootId: NodeId,
): MindNodeBranchSide {
  const metadataBranchSide = getMetadataString(node, "branchSide");
  if (
    metadataBranchSide === "left" ||
    metadataBranchSide === "right" ||
    metadataBranchSide === "up" ||
    metadataBranchSide === "down"
  ) {
    return metadataBranchSide;
  }
  if (node.id === viewRootId) return getLayoutBranchSide(document.layout.direction);
  const parent = node.parentId ? document.nodes[node.parentId] : undefined;
  if (!parent) return getLayoutBranchSide(document.layout.direction);
  if (document.layout.direction === "up" || document.layout.direction === "down") {
    return node.position.y < parent.position.y ? "up" : "down";
  }
  return node.position.x < parent.position.x ? "left" : "right";
}

function getNodeDropIntent(intent: DropIntent | undefined, nodeId: NodeId): DropIntent | undefined {
  if (!intent || intent.type === "none") return undefined;
  return intent.targetId === nodeId ? intent : undefined;
}

function countDescendants(document: MindMapDocument, nodeId: NodeId): number {
  const node = document.nodes[nodeId];
  if (!node) return 0;
  return node.children.reduce(
    (total, childId) =>
      total + (document.nodes[childId] ? 1 + countDescendants(document, childId) : 0),
    0,
  );
}

function getCollapsedHiddenCount(document: MindMapDocument, node: MindMapNode): number | undefined {
  if (!node.collapsed) return undefined;
  const count = countDescendants(document, node.id);
  return count > 0 ? count : undefined;
}

export function documentToFlow(
  document: MindMapDocument,
  options: FlowConversionOptions = {},
): FlowConversionResult {
  const viewRootId = options.viewRootId ?? document.rootId;
  const selected = new Set(options.selectedNodeIds ?? []);
  const highlighted = new Set(options.highlightedNodeIds ?? []);
  const visibleIds = getVisibleNodeIds(document, viewRootId);
  const visibleSet = new Set(visibleIds);
  const branchPaletteByNodeId = getBranchPaletteByNodeId(document, viewRootId, options.theme);
  const presentationNodes = new Map(
    visibleIds.flatMap((nodeId) => {
      const node = document.nodes[nodeId];
      if (!node) return [];
      return [
        [
          nodeId,
          applyDefaultPresentation(
            node,
            branchPaletteByNodeId.get(nodeId),
            nodeId === viewRootId,
            options.theme,
          ),
        ],
      ];
    }),
  );

  const nodes: Array<Node<MindNodeData, "mindNode">> = visibleIds.flatMap((nodeId) => {
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
        flash: options.flashNodeId === node.id,
        readonly: options.readonly,
        branchSide: getBranchSide(document, node, viewRootId),
        dropIntent: getNodeDropIntent(options.dropIntent, node.id),
        collapsedHiddenCount: getCollapsedHiddenCount(document, node),
        showAddChildControl: options.showAddChildControl !== false && !node.collapsed,
        showCollapseControl: options.showCollapseControl,
        showNodeResizeControls: options.showNodeResizeControls,
        nodeResizeStep: options.nodeResizeStep,
        nodeMinScale: options.nodeMinScale,
        nodeMaxScale: options.nodeMaxScale,
        onTitleCommit: options.onTitleCommit,
        onEnterNodeView: options.onEnterNodeView,
        onResizeNode: options.onResizeNode,
        onResizeProgress: options.onResizeProgress,
        onResizeCommit: options.onResizeCommit,
        onAddChild: options.onAddChild,
        onToggleCollapse: options.onToggleCollapse,
        onExpandCollapsed: options.onExpandCollapsed,
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
    .filter(
      (connection) => visibleSet.has(connection.sourceId) && visibleSet.has(connection.targetId),
    )
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
