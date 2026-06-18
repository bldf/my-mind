import { cloneDocument } from "./document";
import type { LayoutGraph, LayoutResult, MindMapDocument, NodeId, Point } from "./types";

export function documentToLayoutGraph(document: MindMapDocument): LayoutGraph {
  const nodes = Object.values(document.nodes).map((node) => {
    const scale = node.style.scale ?? 1;
    return {
      id: node.id,
      parentId: node.parentId,
      width: Math.max(140, node.title.length * 8 + 48) * scale,
      height: 56 * scale,
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
