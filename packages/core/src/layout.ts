import { cloneDocument } from "./document";
import type { LayoutGraph, LayoutResult, MindMapDocument, MindMapNode, NodeId, Point } from "./types";

export const MIN_NODE_WIDTH = 56;
export const MAX_NODE_WIDTH = 360;
export const NODE_HORIZONTAL_PADDING = 32;
const NODE_BASE_HEIGHT = 46;
const NODE_LINE_HEIGHT = 18;
const CHARACTER_WIDTH = 8;
const WIDE_LATIN_CHARACTER_WIDTH = 10.2;
const NODE_WIDTH_SAFETY = 8;

interface LayoutBox {
  id: NodeId;
  side: -1 | 1;
  width: number;
  height: number;
  subtreeHeight: number;
  children: LayoutBox[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMetadataNumber(node: Pick<MindMapNode, "metadata">, key: string): number | undefined {
  const value = node.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getTitleCharacterWidth(character: string): number {
  const codePoint = character.codePointAt(0) ?? 0;
  if (
    (codePoint >= 0x2e80 && codePoint <= 0x9fff) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
    (codePoint >= 0xff01 && codePoint <= 0xff60)
  ) {
    return 14;
  }
  if (/\s/.test(character)) return 4;
  if (character === "/" || /[iljtfrI.,:;!\\|\-_()[\]{}]/.test(character)) return 4.5;
  if (/[mw]/i.test(character)) return WIDE_LATIN_CHARACTER_WIDTH;
  if (/[A-Z0-9]/.test(character)) return 8.2;
  return CHARACTER_WIDTH;
}

export function estimateLayoutTitleWidth(title: string): number {
  const lineWidths = title.split(/\r\n|\r|\n/).map((line) => Array.from(line).reduce((total, character) => total + getTitleCharacterWidth(character), 0));
  return Math.max(0, ...lineWidths);
}

export function getNodeWidthOverride(node: Pick<MindMapNode, "metadata">): number | undefined {
  return getMetadataNumber(node, "nodeWidth");
}

export function estimateLayoutNodeWidth(node: Pick<MindMapNode, "metadata" | "title">): number {
  return clamp(
    getNodeWidthOverride(node) ??
      estimateLayoutTitleWidth(node.title) + NODE_HORIZONTAL_PADDING + NODE_WIDTH_SAFETY,
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
  );
}

export function estimateLayoutNodeHeight(node: Pick<MindMapNode, "metadata" | "style" | "task" | "title">): number {
  const width = estimateLayoutNodeWidth(node);
  const contentWidth = Math.max(1, width - NODE_HORIZONTAL_PADDING);
  const lineCount = node.title
    .split(/\r\n|\r|\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(estimateLayoutTitleWidth(line) / contentWidth)), 0);
  const statusHeight = node.task ? 20 : 0;

  return NODE_BASE_HEIGHT + (lineCount - 1) * NODE_LINE_HEIGHT + statusHeight;
}

function estimateNodeSize(node: MindMapNode) {
  const scale = node.style.scale ?? 1;
  const width = estimateLayoutNodeWidth(node);
  const height = estimateLayoutNodeHeight(node);

  return {
    width: width * scale,
    height: height * scale,
  };
}

function stackHeight(children: LayoutBox[], gapY: number): number {
  if (children.length === 0) return 0;
  return children.reduce((total, child) => total + child.subtreeHeight, 0) + (children.length - 1) * gapY;
}

function buildLayoutBox(document: MindMapDocument, nodeId: NodeId, side: -1 | 1, gapY: number): LayoutBox {
  const node = document.nodes[nodeId];
  if (!node) {
    return { id: nodeId, side, width: MIN_NODE_WIDTH, height: NODE_BASE_HEIGHT, subtreeHeight: NODE_BASE_HEIGHT, children: [] };
  }

  const size = estimateNodeSize(node);
  const children = node.collapsed ? [] : node.children.map((childId) => buildLayoutBox(document, childId, side, gapY));
  const childrenHeight = stackHeight(children, gapY);

  return {
    id: node.id,
    side,
    width: size.width,
    height: size.height,
    subtreeHeight: Math.max(size.height, childrenHeight),
    children,
  };
}

function placeLayoutBox(
  box: LayoutBox,
  centerX: number,
  centerY: number,
  gapX: number,
  gapY: number,
  positions: Record<string, Point>,
) {
  positions[box.id] = {
    x: Math.round(centerX - box.width / 2),
    y: Math.round(centerY - box.height / 2),
  };

  if (box.children.length === 0) return;

  const totalHeight = stackHeight(box.children, gapY);
  let cursorY = centerY - totalHeight / 2;
  for (const child of box.children) {
    const childCenterY = cursorY + child.subtreeHeight / 2;
    const childCenterX = centerX + child.side * (box.width / 2 + gapX + child.width / 2);
    placeLayoutBox(child, childCenterX, childCenterY, gapX, gapY, positions);
    cursorY += child.subtreeHeight + gapY;
  }
}

function simpleDirectionalLayout(document: MindMapDocument, rootId: NodeId, started: number): LayoutResult {
  const positions: Record<string, Point> = {};
  const { gapX, gapY, direction } = document.layout;
  let row = 0;

  const visit = (nodeId: NodeId, depth: number) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    const axisX = direction === "left" ? -depth * gapX : direction === "right" ? depth * gapX : row * gapX;
    const axisY = direction === "up" ? -depth * gapY : direction === "down" ? depth * gapY : row * gapY;
    positions[nodeId] = { x: axisX, y: axisY };
    row += 1;
    if (node.collapsed) return;
    for (const childId of node.children) {
      visit(childId, depth + 1);
    }
  };

  visit(rootId, 0);
  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { positions, durationMs: ended - started };
}

export function documentToLayoutGraph(document: MindMapDocument): LayoutGraph {
  const nodes = Object.values(document.nodes).map((node) => {
    const scale = node.style.scale ?? 1;
    return {
      id: node.id,
      parentId: node.parentId,
      width: estimateLayoutNodeWidth(node) * scale,
      height: estimateLayoutNodeHeight(node) * scale,
      position: { ...node.position },
      data: {
        title: node.title,
        collapsed: node.collapsed,
      },
    };
  });

  const treeEdges = Object.values(document.nodes).flatMap((node) =>
    node.children.map((childId) => ({
      id: `${node.id}->${childId}`,
      sourceId: node.id,
      targetId: childId,
    })),
  );

  const connections = document.connections.map((connection) => ({
    id: connection.id,
    sourceId: connection.sourceId,
    targetId: connection.targetId,
  }));

  return {
    rootId: document.rootId,
    nodes,
    edges: [...treeEdges, ...connections],
    settings: { ...document.layout },
  };
}

export function applyLayoutResult(document: MindMapDocument, layout: LayoutResult): MindMapDocument {
  const next = cloneDocument(document);
  for (const [nodeId, position] of Object.entries(layout.positions)) {
    const node = next.nodes[nodeId];
    if (node) {
      node.position = { ...position };
    }
  }
  next.revision += 1;
  return next;
}

export function simpleTreeLayout(document: MindMapDocument, rootId: NodeId = document.rootId): LayoutResult {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const positions: Record<string, Point> = {};
  const { gapX, gapY, direction } = document.layout;

  if (direction === "up" || direction === "down") {
    return simpleDirectionalLayout(document, rootId, started);
  }

  const root = document.nodes[rootId];
  if (!root) {
    const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
    return { positions, durationMs: ended - started };
  }

  const compactGapX = clamp(gapX * 0.52, 88, 180);
  const compactGapY = clamp(gapY * 0.32, 18, 42);
  const rootSize = estimateNodeSize(root);

  positions[root.id] = {
    x: Math.round(-rootSize.width / 2),
    y: Math.round(-rootSize.height / 2),
  };

  if (!root.collapsed) {
    const shouldSplitRoot = rootId === document.rootId && root.children.length > 1;
    const pivot = shouldSplitRoot ? Math.ceil(root.children.length / 2) : root.children.length;
    const firstSide: -1 | 1 = shouldSplitRoot ? (direction === "left" ? 1 : -1) : direction === "left" ? -1 : 1;
    const secondSide: -1 | 1 = firstSide === -1 ? 1 : -1;
    const firstBranch = root.children.slice(0, pivot).map((childId) => buildLayoutBox(document, childId, firstSide, compactGapY));
    const secondBranch = shouldSplitRoot
      ? root.children.slice(pivot).map((childId) => buildLayoutBox(document, childId, secondSide, compactGapY))
      : [];

    for (const branch of [firstBranch, secondBranch]) {
      if (branch.length === 0) continue;
      const totalHeight = stackHeight(branch, compactGapY);
      let cursorY = -totalHeight / 2;
      for (const child of branch) {
        const childCenterY = cursorY + child.subtreeHeight / 2;
        const childCenterX = child.side * (rootSize.width / 2 + compactGapX + child.width / 2);
        placeLayoutBox(child, childCenterX, childCenterY, compactGapX, compactGapY, positions);
        cursorY += child.subtreeHeight + compactGapY;
      }
    }
  }

  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { positions, durationMs: ended - started };
}

export interface LayoutWorkerRequest {
  requestId: string;
  graph: LayoutGraph;
}

export interface LayoutWorkerResponse {
  requestId: string;
  result?: LayoutResult;
  error?: { code: string; message: string };
}

export function createLayoutWorkerRequest(document: MindMapDocument, requestId: string): LayoutWorkerRequest {
  return {
    requestId,
    graph: documentToLayoutGraph(document),
  };
}
