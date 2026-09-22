import type { DocumentId, LayoutSettings, MindMapDocument, MindMapNode, NodeId } from "./types";

const DEFAULT_LAYOUT: LayoutSettings = {
  direction: "right",
  gapX: 220,
  gapY: 96,
};

let idSequence = 0;

export function createId(prefix: string): string {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(idSequence += 1).toString(36)}`;
  return `${prefix}-${randomId}`;
}

export function asDocumentId(value: string): DocumentId {
  return value as DocumentId;
}

export function asNodeId(value: string): NodeId {
  return value as NodeId;
}

export function createNode(input: Partial<MindMapNode> & { id?: NodeId; title?: string }): MindMapNode {
  return {
    id: input.id ?? asNodeId(createId("node")),
    parentId: input.parentId ?? null,
    children: input.children ? [...input.children] : [],
    title: input.title ?? "New node",
    note: input.note,
    links: input.links ? [...input.links] : [],
    tagIds: input.tagIds ? [...input.tagIds] : [],
    task: input.task,
    icon: input.icon,
    image: input.image,
    collapsed: input.collapsed ?? false,
    position: input.position ? { ...input.position } : { x: 0, y: 0 },
    style: input.style ? { ...input.style } : {},
    metadata: input.metadata ? { ...input.metadata } : {},
  };
}

export function createEmptyDocument(options: { title?: string; rootTitle?: string } = {}): MindMapDocument {
  const rootId = asNodeId(createId("root"));
  const root = createNode({
    id: rootId,
    title: options.rootTitle ?? "Central topic",
    position: { x: 0, y: 0 },
  });

  return {
    schemaVersion: "1.0",
    id: asDocumentId(createId("doc")),
    title: options.title ?? "Untitled mind map",
    rootId,
    nodes: {
      [rootId]: root,
    },
    connections: [],
    tags: [],
    layout: { ...DEFAULT_LAYOUT },
    revision: 0,
    metadata: {},
  };
}

export function cloneDocument(document: MindMapDocument): MindMapDocument {
  return {
    ...document,
    nodes: Object.fromEntries(
      Object.entries(document.nodes).map(([id, node]) => [
        id,
        {
          ...node,
          children: [...node.children],
          links: node.links.map((link) => ({ ...link })),
          tagIds: [...node.tagIds],
          task: node.task ? { ...node.task } : undefined,
          image: node.image ? { ...node.image } : undefined,
          position: { ...node.position },
          style: { ...node.style },
          metadata: { ...node.metadata },
        },
      ]),
    ),
    connections: document.connections.map((connection) => ({
      ...connection,
      style: connection.style ? { ...connection.style } : undefined,
      metadata: { ...connection.metadata },
    })),
    tags: document.tags.map((tag) => ({ ...tag, metadata: { ...tag.metadata } })),
    theme: document.theme ? { ...document.theme, colors: { ...document.theme.colors } } : undefined,
    layout: { ...document.layout },
    metadata: { ...document.metadata },
  };
}

export function getNode(document: MindMapDocument, nodeId: NodeId): MindMapNode | undefined {
  return document.nodes[nodeId];
}

export function getDescendantIds(document: MindMapDocument, nodeId: NodeId): NodeId[] {
  const result: NodeId[] = [];
  const visit = (id: NodeId) => {
    const node = document.nodes[id];
    if (!node) return;
    for (const childId of node.children) {
      result.push(childId);
      visit(childId);
    }
  };
  visit(nodeId);
  return result;
}

export function getAncestorIds(document: MindMapDocument, nodeId: NodeId): NodeId[] {
  const result: NodeId[] = [];
  let current = document.nodes[nodeId]?.parentId ?? null;
  while (current) {
    result.unshift(current);
    current = document.nodes[current]?.parentId ?? null;
  }
  return result;
}

export function isNodeSideCollapsed(node: MindMapNode, side: "left" | "right"): boolean {
  if (node.collapsed) return true;
  if (side === "left") return Boolean(node.metadata?.collapsedLeft);
  if (side === "right") return Boolean(node.metadata?.collapsedRight);
  return false;
}

/** 统一编辑命令和只读视图的折叠状态转换。 */
export function setNodeCollapsed(node: MindMapNode, collapsed: boolean, side?: "left" | "right"): MindMapNode {
  if (side) {
    const otherSide = side === "left" ? "right" : "left";
    const otherCollapsed = isNodeSideCollapsed(node, otherSide);
    return {
      ...node,
      collapsed: collapsed && otherCollapsed,
      metadata: {
        ...node.metadata,
        collapsedLeft: side === "left" ? collapsed : otherCollapsed,
        collapsedRight: side === "right" ? collapsed : otherCollapsed,
      },
    };
  }
  const hasSideState = node.metadata.collapsedLeft !== undefined || node.metadata.collapsedRight !== undefined;
  return {
    ...node,
    collapsed,
    metadata: hasSideState ? { ...node.metadata, collapsedLeft: collapsed, collapsedRight: collapsed } : node.metadata,
  };
}

export function getNodeChildBranchSide(
  document: MindMapDocument,
  parentNode: MindMapNode,
  childId: NodeId,
): "left" | "right" {
  const child = document.nodes[childId];
  if (child?.metadata?.branchSide === "left" || child?.metadata?.branchSide === "right") {
    return child.metadata.branchSide;
  }
  if (parentNode.parentId !== null) {
    if (parentNode.metadata?.branchSide === "left" || parentNode.metadata?.branchSide === "right") {
      return parentNode.metadata.branchSide;
    }
  }
  const direction = document.layout?.direction;
  const isLeftDirection = direction === "left";
  if (parentNode.children.length <= 1) {
    return isLeftDirection ? "left" : "right";
  }
  const pivot = Math.ceil(parentNode.children.length / 2);
  const index = parentNode.children.indexOf(childId);
  if (isLeftDirection) {
    return index < pivot ? "right" : "left";
  }
  return index < pivot ? "left" : "right";
}

export function isNodeTwoSided(document: MindMapDocument, node: MindMapNode): boolean {
  if (node.id !== document.rootId && node.parentId !== null) return false;
  const direction = document.layout?.direction;
  if (direction === "up" || direction === "down") return false;
  if (node.children.length <= 1) return false;
  let hasLeft = false;
  let hasRight = false;
  for (const childId of node.children) {
    const side = getNodeChildBranchSide(document, node, childId);
    if (side === "left") hasLeft = true;
    if (side === "right") hasRight = true;
    if (hasLeft && hasRight) return true;
  }
  return false;
}

/** 删除或移动另一侧后，仍保留已有侧折叠状态及其展开入口。 */
export function usesNodeSideCollapse(document: MindMapDocument, node: MindMapNode): boolean {
  if (node.id !== document.rootId || node.children.length === 0) return false;
  if (document.layout.direction === "up" || document.layout.direction === "down") return false;
  return isNodeTwoSided(document, node) ||
    node.metadata.collapsedLeft !== undefined || node.metadata.collapsedRight !== undefined;
}

export function getVisibleChildIds(document: MindMapDocument, node: MindMapNode): NodeId[] {
  if (node.collapsed) return [];
  if (!usesNodeSideCollapse(document, node)) return node.children;
  return node.children.filter((childId) => !isNodeSideCollapsed(node, getNodeChildBranchSide(document, node, childId)));
}

export function countDescendants(document: MindMapDocument, nodeId: NodeId): number {
  const node = document.nodes[nodeId];
  if (!node) return 0;
  return node.children.reduce(
    (total, childId) =>
      total + (document.nodes[childId] ? 1 + countDescendants(document, childId) : 0),
    0,
  );
}

export function countSideDescendants(
  document: MindMapDocument,
  parentNode: MindMapNode,
  side: "left" | "right",
): number {
  return parentNode.children.reduce((total, childId) => {
    const childSide = getNodeChildBranchSide(document, parentNode, childId);
    if (childSide !== side) return total;
    return total + (document.nodes[childId] ? 1 + countDescendants(document, childId) : 0);
  }, 0);
}

export function getVisibleNodeIds(document: MindMapDocument, rootId: NodeId = document.rootId): NodeId[] {
  const result: NodeId[] = [];
  const rootNode = document.nodes[rootId];
  if (!rootNode) return result;

  const visit = (id: NodeId) => {
    const node = document.nodes[id];
    if (!node) return;
    result.push(id);
    for (const childId of getVisibleChildIds(document, node)) {
      visit(childId);
    }
  };
  visit(rootId);
  return result;
}
