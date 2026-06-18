import { asDocumentId, asNodeId, cloneDocument, createNode } from "./document";
import type {
  ConnectionId,
  MindMapConnection,
  MindMapDocument,
  MindMapError,
  MindMapNode,
  MindMapTag,
  NodeId,
  ParseResult,
  TagId,
  ValidationResult,
} from "./types";

function error(code: string, message: string, path?: string, details?: unknown): MindMapError {
  return { code, message, path, details, recoverable: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFinitePoint(value: unknown): value is { x: number; y: number } {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

function normalizeNode(value: unknown, key: string): ParseResult<MindMapNode> {
  if (!isRecord(value)) {
    return { ok: false, error: error("INVALID_NODE", "Node must be an object", `nodes.${key}`) };
  }

  if (typeof value.title !== "string") {
    return { ok: false, error: error("INVALID_NODE_TITLE", "Node title must be a string", `nodes.${key}.title`) };
  }

  if (!isFinitePoint(value.position)) {
    return { ok: false, error: error("INVALID_POSITION", "Node position must contain finite x and y", `nodes.${key}.position`) };
  }

  const id = asNodeId(typeof value.id === "string" ? value.id : key);
  const children = Array.isArray(value.children) ? value.children : [];
  if (!children.every((child) => typeof child === "string")) {
    return { ok: false, error: error("INVALID_CHILDREN", "Node children must be string ids", `nodes.${key}.children`) };
  }

  const links = Array.isArray(value.links)
    ? value.links.filter(isRecord).map((link) => ({
        url: String(link.url ?? ""),
        label: typeof link.label === "string" ? link.label : undefined,
      }))
    : [];

  const tagIds = Array.isArray(value.tagIds) ? value.tagIds.filter((tagId): tagId is string => typeof tagId === "string") : [];

  return {
    ok: true,
    value: createNode({
      id,
      parentId: typeof value.parentId === "string" ? asNodeId(value.parentId) : null,
      children: children.map(asNodeId),
      title: value.title,
      note: typeof value.note === "string" ? value.note : undefined,
      links,
      tagIds: tagIds.map((tagId) => tagId as TagId),
      task: isRecord(value.task)
        ? {
            status:
              value.task.status === "doing" ||
              value.task.status === "done" ||
              value.task.status === "blocked"
                ? value.task.status
                : "todo",
            assignee: typeof value.task.assignee === "string" ? value.task.assignee : undefined,
            dueDate: typeof value.task.dueDate === "string" ? value.task.dueDate : undefined,
          }
        : undefined,
      icon: typeof value.icon === "string" ? value.icon : undefined,
      image: isRecord(value.image)
        ? {
            src: String(value.image.src ?? ""),
            alt: typeof value.image.alt === "string" ? value.image.alt : undefined,
          }
        : undefined,
      collapsed: Boolean(value.collapsed),
      position: { x: value.position.x, y: value.position.y },
      style: isRecord(value.style) ? { ...value.style } : {},
      metadata: isRecord(value.metadata) ? { ...value.metadata } : {},
    }),
  };
}

function normalizeConnection(value: unknown, index: number): ParseResult<MindMapConnection> {
  if (!isRecord(value)) {
    return { ok: false, error: error("INVALID_CONNECTION", "Connection must be an object", `connections.${index}`) };
  }

  if (typeof value.sourceId !== "string" || typeof value.targetId !== "string") {
    return {
      ok: false,
      error: error("INVALID_CONNECTION_ENDPOINT", "Connection endpoints must be node ids", `connections.${index}`),
    };
  }

  return {
    ok: true,
    value: {
      id: String(value.id ?? `connection-${index}`) as ConnectionId,
      sourceId: asNodeId(value.sourceId),
      targetId: asNodeId(value.targetId),
      label: typeof value.label === "string" ? value.label : undefined,
      style: isRecord(value.style) ? { ...value.style } : undefined,
      metadata: isRecord(value.metadata) ? { ...value.metadata } : {},
    },
  };
}

function normalizeTag(value: unknown, index: number): ParseResult<MindMapTag> {
  if (!isRecord(value) || typeof value.label !== "string") {
    return { ok: false, error: error("INVALID_TAG", "Tag must contain a label", `tags.${index}`) };
  }
  return {
    ok: true,
    value: {
      id: String(value.id ?? `tag-${index}`) as TagId,
      label: value.label,
      color: typeof value.color === "string" ? value.color : undefined,
      metadata: isRecord(value.metadata) ? { ...value.metadata } : {},
    },
  };
}

function validateReferences(document: MindMapDocument): MindMapError | undefined {
  if (!document.nodes[document.rootId]) {
    return error("INVALID_ROOT", "Document rootId must reference an existing node", "rootId");
  }

  const tagSet = new Set(document.tags.map((tag) => tag.id));
  for (const node of Object.values(document.nodes)) {
    for (const childId of node.children) {
      const child = document.nodes[childId];
      if (!child) {
        return error("UNKNOWN_CHILD", "Node children must reference existing nodes", `nodes.${node.id}.children`);
      }
      if (child.parentId !== node.id) {
        return error("PARENT_CHILD_MISMATCH", "Child parentId must point back to parent", `nodes.${child.id}.parentId`);
      }
    }
    if (node.parentId && !document.nodes[node.parentId]) {
      return error("UNKNOWN_PARENT", "Node parentId must reference an existing node", `nodes.${node.id}.parentId`);
    }
    for (const tagId of node.tagIds) {
      if (!tagSet.has(tagId)) {
        return error("UNKNOWN_TAG", "Node tagIds must reference existing tags", `nodes.${node.id}.tagIds`);
      }
    }
    if (node.style.scale !== undefined && (!Number.isFinite(node.style.scale) || node.style.scale <= 0)) {
      return error("INVALID_STYLE", "Node style.scale must be a positive number", `nodes.${node.id}.style.scale`);
    }
  }

  for (const connection of document.connections) {
    if (!document.nodes[connection.sourceId] || !document.nodes[connection.targetId]) {
      return error("INVALID_CONNECTION_ENDPOINT", "Connection endpoints must reference existing nodes", `connections.${connection.id}`);
    }
  }

  return undefined;
}

function validateTree(document: MindMapDocument): MindMapError | undefined {
  const visiting = new Set<NodeId>();
  const visited = new Set<NodeId>();

  const visit = (nodeId: NodeId): MindMapError | undefined => {
    if (visiting.has(nodeId)) {
      return error("CYCLE_DETECTED", "Document tree must not contain cycles", `nodes.${nodeId}`);
    }
    if (visited.has(nodeId)) return undefined;
    visiting.add(nodeId);
    const node = document.nodes[nodeId];
    if (!node) {
      return error("UNKNOWN_NODE", "Tree references a missing node", `nodes.${nodeId}`);
    }
    for (const childId of node.children) {
      const childError = visit(childId);
      if (childError) return childError;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return undefined;
  };

  const rootError = visit(document.rootId);
  if (rootError) return rootError;

  for (const nodeId of Object.keys(document.nodes)) {
    if (!visited.has(asNodeId(nodeId))) {
      return error("UNREACHABLE_NODE", "All nodes must be reachable from rootId", `nodes.${nodeId}`);
    }
  }

  return undefined;
}

export function validateDocument(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, error: error("INVALID_DOCUMENT", "Document must be an object") };
  }

  if (input.schemaVersion !== "1.0") {
    return { ok: false, error: error("UNSUPPORTED_SCHEMA", "Only schemaVersion 1.0 is supported", "schemaVersion") };
  }

  if (typeof input.id !== "string" || typeof input.title !== "string" || typeof input.rootId !== "string") {
    return { ok: false, error: error("INVALID_DOCUMENT", "Document id, title and rootId are required") };
  }

  if (!isRecord(input.nodes)) {
    return { ok: false, error: error("INVALID_NODES", "Document nodes must be an object", "nodes") };
  }

  const nodes: Record<string, MindMapNode> = {};
  for (const [key, value] of Object.entries(input.nodes)) {
    const node = normalizeNode(value, key);
    if (!node.ok) return node;
    nodes[key] = node.value;
  }

  const connectionsInput = Array.isArray(input.connections) ? input.connections : [];
  const connections: MindMapConnection[] = [];
  for (let index = 0; index < connectionsInput.length; index += 1) {
    const connection = normalizeConnection(connectionsInput[index], index);
    if (!connection.ok) return connection;
    connections.push(connection.value);
  }

  const tagsInput = Array.isArray(input.tags) ? input.tags : [];
  const tags: MindMapTag[] = [];
  for (let index = 0; index < tagsInput.length; index += 1) {
    const tag = normalizeTag(tagsInput[index], index);
    if (!tag.ok) return tag;
    tags.push(tag.value);
  }

  const document: MindMapDocument = {
    schemaVersion: "1.0",
    id: asDocumentId(input.id),
    title: input.title,
    rootId: asNodeId(input.rootId),
    nodes,
    connections,
    tags,
    theme: isRecord(input.theme)
      ? {
          id: String(input.theme.id ?? "custom"),
          name: String(input.theme.name ?? "Custom"),
          mode:
            input.theme.mode === "dark" || input.theme.mode === "system" || input.theme.mode === "light"
              ? input.theme.mode
              : "light",
          colors: {
            canvas: String((input.theme.colors as Record<string, unknown> | undefined)?.canvas ?? "#f8fafc"),
            node: String((input.theme.colors as Record<string, unknown> | undefined)?.node ?? "#ffffff"),
            nodeText: String((input.theme.colors as Record<string, unknown> | undefined)?.nodeText ?? "#111827"),
            edge: String((input.theme.colors as Record<string, unknown> | undefined)?.edge ?? "#64748b"),
            selected: String((input.theme.colors as Record<string, unknown> | undefined)?.selected ?? "#2563eb"),
            accent: String((input.theme.colors as Record<string, unknown> | undefined)?.accent ?? "#0f766e"),
          },
        }
      : undefined,
    layout: isRecord(input.layout)
      ? {
          direction:
            input.layout.direction === "left" ||
            input.layout.direction === "down" ||
            input.layout.direction === "up"
              ? input.layout.direction
              : "right",
          gapX: typeof input.layout.gapX === "number" ? input.layout.gapX : 220,
          gapY: typeof input.layout.gapY === "number" ? input.layout.gapY : 96,
        }
      : { direction: "right", gapX: 220, gapY: 96 },
    revision: typeof input.revision === "number" ? input.revision : 0,
    metadata: isRecord(input.metadata) ? { ...input.metadata } : {},
  };

  const referenceError = validateReferences(document);
  if (referenceError) return { ok: false, error: referenceError };

  const treeError = validateTree(document);
  if (treeError) return { ok: false, error: treeError };

  return { ok: true, value: cloneDocument(document) };
}

export function parseDocument(json: string): ValidationResult {
  try {
    return validateDocument(JSON.parse(json));
  } catch (parseError) {
    return {
      ok: false,
      error: error("INVALID_JSON", "Input must be valid JSON", undefined, parseError),
    };
  }
}
