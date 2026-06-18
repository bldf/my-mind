import { asNodeId, createEmptyDocument, createId, createNode } from "./document";
import { validateDocument } from "./validation";
import type { IndentedTextOptions, MindMapDocument, NodeId, ParseResult } from "./types";

function stripBullet(line: string): string {
  return line.replace(/^(\s*)([-*+]|\d+\.)\s+/, "$1");
}

function countIndent(line: string, indentSize: number): number | undefined {
  const rawIndent = line.match(/^\s*/)?.[0] ?? "";
  const spaces = rawIndent.replace(/\t/g, " ".repeat(indentSize)).length;
  if (spaces % indentSize !== 0) return undefined;
  return spaces / indentSize;
}

export function importIndentedText(text: string, options: IndentedTextOptions = {}): ParseResult<MindMapDocument> {
  const indentSize = options.indentSize ?? 2;
  const lines = text
    .split(/\r?\n/)
    .map(stripBullet)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      error: { code: "EMPTY_TEXT", message: "Indented text must contain at least one non-empty line", recoverable: true },
    };
  }

  const document = createEmptyDocument({
    title: options.title ?? "Imported mind map",
    rootTitle: options.includeRoot ? lines[0]!.trim() : options.rootTitle ?? "Imported topics",
  });
  const rootId = document.rootId;
  const stack: NodeId[] = [rootId];
  const startIndex = options.includeRoot ? 1 : 0;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const level = countIndent(line, indentSize);
    if (level === undefined) {
      return {
        ok: false,
        error: {
          code: "INDENTATION_ERROR",
          message: `Line ${index + 1} indentation must be a multiple of ${indentSize} spaces`,
          path: `line.${index + 1}`,
          recoverable: true,
        },
      };
    }
    if (level > stack.length) {
      return {
        ok: false,
        error: {
          code: "INDENTATION_JUMP",
          message: `Line ${index + 1} skips an indentation level`,
          path: `line.${index + 1}`,
          recoverable: true,
        },
      };
    }

    const parentId = stack[level] ?? rootId;
    const nodeId = asNodeId(createId("node"));
    const parent = document.nodes[parentId];
    if (!parent) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_PARENT",
          message: `Line ${index + 1} cannot find parent for indentation level ${level}`,
          path: `line.${index + 1}`,
          recoverable: true,
        },
      };
    }
    const node = createNode({
      id: nodeId,
      parentId,
      title: line.trim(),
      position: {
        x: (level + 1) * document.layout.gapX,
        y: parent.children.length * document.layout.gapY,
      },
    });
    document.nodes[nodeId] = node;
    parent.children.push(nodeId);
    stack[level + 1] = nodeId;
    stack.length = level + 2;
  }

  return validateDocument(document);
}

export function exportIndentedText(document: MindMapDocument, options: IndentedTextOptions = {}): string {
  const indentSize = options.indentSize ?? 2;
  const lines: string[] = [];
  const write = (nodeId: NodeId, depth: number) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    lines.push(`${" ".repeat(depth * indentSize)}${node.title}`);
    for (const childId of node.children) {
      write(childId, depth + 1);
    }
  };

  if (options.includeRoot) {
    write(document.rootId, 0);
  } else {
    for (const childId of document.nodes[document.rootId]?.children ?? []) {
      write(childId, 0);
    }
  }
  return lines.join("\n");
}
