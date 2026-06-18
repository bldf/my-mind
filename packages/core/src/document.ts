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

export function getVisibleNodeIds(document: MindMapDocument, rootId: NodeId = document.rootId): NodeId[] {
  const result: NodeId[] = [];
  const visit = (id: NodeId) => {
    const node = document.nodes[id];
    if (!node) return;
    result.push(id);
    if (node.collapsed) return;
    for (const childId of node.children) {
      visit(childId);
    }
  };
  visit(rootId);
  return result;
}
