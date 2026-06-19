import { asNodeId, cloneDocument, createId, createNode, getAncestorIds, getDescendantIds } from "./document";
import { validateDocument } from "./validation";
import type {
  CommandResult,
  ConnectionId,
  MindMapCommand,
  MindMapConnection,
  MindMapDocument,
  MindMapError,
  MindMapOperation,
  NodeId,
  OperationId,
  SelectionState,
} from "./types";

function commandError(document: MindMapDocument, code: string, message: string, path?: string): CommandResult {
  return { ok: false, document, error: { code, message, path, recoverable: true } };
}

function operation(before: MindMapDocument, after: MindMapDocument, command: MindMapCommand): MindMapOperation {
  return {
    id: createId("op") as OperationId,
    commandType: command.type,
    timestamp: new Date().toISOString(),
    before,
    after,
    meta: "meta" in command ? command.meta : undefined,
  };
}

function documentsEqual(left: MindMapDocument, right: MindMapDocument): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function finalize(before: MindMapDocument, after: MindMapDocument, command: MindMapCommand): CommandResult {
  const validation = validateDocument(after);
  if (!validation.ok) {
    return { ok: false, document: before, error: validation.error };
  }
  return { ok: true, document: validation.value, operation: operation(before, validation.value, command) };
}

function removeFromParent(document: MindMapDocument, nodeId: NodeId) {
  const parentId = document.nodes[nodeId]?.parentId;
  if (!parentId) return;
  const parent = document.nodes[parentId];
  if (parent) {
    parent.children = parent.children.filter((childId) => childId !== nodeId);
  }
}

function insertChild(document: MindMapDocument, parentId: NodeId, childId: NodeId, index?: number) {
  const parent = document.nodes[parentId];
  if (!parent) return;
  const children = parent.children.filter((id) => id !== childId);
  const safeIndex = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(safeIndex, 0, childId);
  parent.children = children;
}

function applyDocumentCommand(document: MindMapDocument, command: Exclude<MindMapCommand, { type: "batch" }>): CommandResult {
  if (command.type === "selection.set") {
    return { ok: true, document, selection: command.selection };
  }

  if (command.type === "selection.toggleNode") {
    const selection: SelectionState = { nodeIds: [command.nodeId], connectionIds: [], anchorNodeId: command.nodeId };
    return { ok: true, document, selection };
  }

  const before = cloneDocument(document);
  const next = cloneDocument(document);

  switch (command.type) {
    case "node.create": {
      const parentId = command.parentId ?? next.rootId;
      if (!next.nodes[parentId]) return commandError(before, "UNKNOWN_PARENT", "Parent node does not exist");
      const node = createNode({
        id: asNodeId(createId("node")),
        parentId,
        title: command.title ?? "New idea",
        position: {
          x: next.nodes[parentId].position.x + next.layout.gapX,
          y: next.nodes[parentId].position.y + next.nodes[parentId].children.length * next.layout.gapY,
        },
      });
      next.nodes[node.id] = node;
      insertChild(next, parentId, node.id, command.index);
      break;
    }
    case "node.update": {
      const node = next.nodes[command.nodeId];
      if (!node) return commandError(before, "UNKNOWN_NODE", "Node does not exist", `nodes.${command.nodeId}`);
      next.nodes[command.nodeId] = {
        ...node,
        ...command.patch,
        id: node.id,
        parentId: command.patch.parentId ?? node.parentId,
        children: command.patch.children ? [...command.patch.children] : node.children,
        links: command.patch.links ? [...command.patch.links] : node.links,
        tagIds: command.patch.tagIds ? [...command.patch.tagIds] : node.tagIds,
        position: command.patch.position ? { ...command.patch.position } : node.position,
        style: command.patch.style ? { ...node.style, ...command.patch.style } : node.style,
        metadata: command.patch.metadata ? { ...node.metadata, ...command.patch.metadata } : node.metadata,
      };
      break;
    }
    case "node.delete": {
      if (command.nodeId === next.rootId) {
        return commandError(before, "ROOT_DELETE_FORBIDDEN", "Root node cannot be deleted", "rootId");
      }
      if (!next.nodes[command.nodeId]) return commandError(before, "UNKNOWN_NODE", "Node does not exist");
      const subtree = [command.nodeId, ...getDescendantIds(next, command.nodeId)];
      removeFromParent(next, command.nodeId);
      for (const nodeId of subtree) {
        delete next.nodes[nodeId];
      }
      next.connections = next.connections.filter(
        (connection) => !subtree.includes(connection.sourceId) && !subtree.includes(connection.targetId),
      );
      break;
    }
    case "node.move": {
      if (command.nodeId === next.rootId) return commandError(before, "ROOT_MOVE_FORBIDDEN", "Root node cannot be moved");
      if (!next.nodes[command.nodeId] || !next.nodes[command.parentId]) {
        return commandError(before, "UNKNOWN_NODE", "Move source and target parent must exist");
      }
      const descendants = getDescendantIds(next, command.nodeId);
      if (descendants.includes(command.parentId) || command.nodeId === command.parentId) {
        return commandError(before, "INVALID_MOVE_TARGET", "Node cannot be moved under itself or a descendant");
      }
      removeFromParent(next, command.nodeId);
      next.nodes[command.nodeId]!.parentId = command.parentId;
      insertChild(next, command.parentId, command.nodeId, command.index);
      break;
    }
    case "node.moveMany": {
      const candidates = command.nodeIds.filter((nodeId) => nodeId !== next.rootId && next.nodes[nodeId]);
      const topLevel = candidates.filter((nodeId) => {
        const ancestors = getAncestorIds(next, nodeId);
        return !candidates.some((otherId) => ancestors.includes(otherId));
      });
      let index = command.index;
      for (const nodeId of topLevel) {
        const moveResult = applyDocumentCommand(next, {
          type: "node.move",
          nodeId,
          parentId: command.parentId,
          index,
          meta: command.meta,
        });
        if (!moveResult.ok) return moveResult;
        Object.assign(next, cloneDocument(moveResult.document));
        index = index === undefined ? undefined : index + 1;
      }
      break;
    }
    case "node.translate": {
      for (const nodeId of command.nodeIds) {
        const node = next.nodes[nodeId];
        if (node) {
          node.position = {
            x: node.position.x + command.delta.x,
            y: node.position.y + command.delta.y,
          };
        }
      }
      break;
    }
    case "node.resize": {
      const minScale = command.minScale ?? 0.5;
      const maxScale = command.maxScale ?? 2;
      for (const nodeId of command.nodeIds) {
        const node = next.nodes[nodeId];
        if (!node) continue;
        const current = node.style.scale ?? 1;
        const scale = Number((current + command.delta).toFixed(2));
        if (scale < minScale || scale > maxScale) {
          return commandError(before, "NODE_SCALE_OUT_OF_RANGE", "Node scale is outside the configured range");
        }
        node.style = { ...node.style, scale };
      }
      break;
    }
    case "node.collapse": {
      for (const nodeId of command.nodeIds) {
        const node = next.nodes[nodeId];
        if (node) node.collapsed = command.collapsed;
      }
      break;
    }
    case "tag.upsert": {
      const tag = { ...command.tag, metadata: { ...command.tag.metadata } };
      const index = next.tags.findIndex((item) => item.id === tag.id);
      if (index >= 0) next.tags[index] = tag;
      else next.tags.push(tag);
      break;
    }
    case "tag.remove": {
      next.tags = next.tags.filter((tag) => tag.id !== command.tagId);
      for (const node of Object.values(next.nodes)) {
        node.tagIds = node.tagIds.filter((tagId) => tagId !== command.tagId);
      }
      break;
    }
    case "connection.create": {
      const connection: MindMapConnection = {
        id: command.connection.id ?? (createId("connection") as ConnectionId),
        sourceId: command.connection.sourceId,
        targetId: command.connection.targetId,
        label: command.connection.label,
        style: command.connection.style,
        metadata: command.connection.metadata ?? {},
      };
      next.connections.push(connection);
      break;
    }
    case "connection.remove": {
      next.connections = next.connections.filter((connection) => connection.id !== command.connectionId);
      break;
    }
    case "theme.set": {
      next.theme = { ...command.theme, colors: { ...command.theme.colors } };
      break;
    }
    default: {
      return commandError(before, "UNKNOWN_COMMAND", "Unsupported command");
    }
  }

  if (documentsEqual(before, next)) {
    return { ok: true, document };
  }

  next.revision += 1;
  return finalize(before, next, command);
}

export function dispatchCommand(document: MindMapDocument, command: MindMapCommand): CommandResult {
  if (command.type !== "batch") {
    return applyDocumentCommand(document, command);
  }

  const before = cloneDocument(document);
  let current = cloneDocument(document);
  let selection: SelectionState | undefined;
  for (const childCommand of command.commands) {
    const result = dispatchCommand(current, childCommand);
    if (!result.ok) return { ok: false, document: before, error: result.error };
    current = result.document;
    selection = result.selection ?? selection;
  }

  if (documentsEqual(before, current)) {
    return { ok: true, document, selection };
  }

  return {
    ok: true,
    document: current,
    selection,
    operation: operation(before, current, command),
  };
}

export function applyOperation(operation: MindMapOperation, direction: "forward" | "inverse" = "forward"): MindMapDocument {
  return cloneDocument(direction === "forward" ? operation.after : operation.before);
}

export function isMindMapError(value: unknown): value is MindMapError {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}
