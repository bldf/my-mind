import {
  asNodeId,
  createEmptyDocument,
  createId,
  createNode,
  importIndentedText,
  parseDocument,
  validateDocument,
} from "@my-mind-node/core";
import type { MindMapDocument, NodeId, ParseResult } from "@my-mind-node/core";

export type ImportFormat = "json" | "markdown" | "mermaid" | "opml" | "indented-text";

export interface ImportOptions {
  title?: string;
  rootTitle?: string;
  includeRoot?: boolean;
  indentSize?: number;
}

function escapeError<T = MindMapDocument>(code: string, message: string): ParseResult<T> {
  return { ok: false, error: { code, message, recoverable: true } };
}

type MarkdownEntry =
  | { kind: "node"; level: number; title: string; line: number }
  | { kind: "link"; label: string; level: number; line: number; url: string };

type MermaidEntry = { indent: number; line: number; title: string };

function parseMarkdownLink(value: string): { label: string; url: string } | undefined {
  const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(value.trim());
  return link ? { label: link[1] ?? link[2] ?? "", url: link[2] ?? "" } : undefined;
}

function markdownToEntries(markdown: string): { entries: MarkdownEntry[]; includeRoot: boolean } {
  const entries: MarkdownEntry[] = [];
  let currentHeadingDepth: number | undefined;
  let includeRoot = false;
  let lineNumber = 0;

  for (const rawLine of markdown.split(/\r?\n/)) {
    lineNumber += 1;
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const depth = (heading[1] ?? "#").length - 1;
      if (entries.length === 0 && depth === 0) includeRoot = true;
      currentHeadingDepth = depth;
      entries.push({
        kind: "node",
        level: depth,
        line: lineNumber,
        title: (heading[2] ?? "").trim(),
      });
      continue;
    }

    const list = /^(\s*)([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (list) {
      const listDepth = (list[1] ?? "").replace(/\t/g, "  ").length / 2;
      const headingOffset = currentHeadingDepth === undefined ? 0 : currentHeadingDepth + 1;
      const depth = headingOffset + listDepth;
      const text = (list[3] ?? "").trim();
      const link = parseMarkdownLink(text);
      entries.push(
        link
          ? { kind: "link", level: depth, line: lineNumber, ...link }
          : { kind: "node", level: depth, line: lineNumber, title: text },
      );
    }
  }

  return { entries, includeRoot };
}

function importMarkdown(
  markdown: string,
  options: ImportOptions = {},
): ParseResult<MindMapDocument> {
  const parsed = markdownToEntries(markdown);
  if (parsed.entries.length === 0) {
    return escapeError("EMPTY_MARKDOWN", "Markdown contains no headings or list items");
  }

  const includeRoot = options.includeRoot ?? parsed.includeRoot;
  const rootEntry =
    includeRoot && parsed.entries[0]?.kind === "node" ? parsed.entries[0] : undefined;
  const document = createEmptyDocument({
    title: options.title ?? "Imported mind map",
    rootTitle: rootEntry?.title ?? options.rootTitle ?? "Imported topics",
  });
  const stack: NodeId[] = [document.rootId];
  const startIndex = rootEntry ? 1 : 0;

  for (let index = startIndex; index < parsed.entries.length; index += 1) {
    const entry = parsed.entries[index];
    if (!entry) continue;
    if (!Number.isInteger(entry.level)) {
      return {
        ok: false,
        error: {
          code: "INDENTATION_ERROR",
          message: `Line ${entry.line} indentation must be a multiple of 2 spaces`,
          path: `line.${entry.line}`,
          recoverable: true,
        },
      };
    }
    if (entry.level > stack.length) {
      return {
        ok: false,
        error: {
          code: "INDENTATION_JUMP",
          message: `Line ${entry.line} skips an indentation level`,
          path: `line.${entry.line}`,
          recoverable: true,
        },
      };
    }

    const parentId = stack[entry.level] ?? document.rootId;
    const parent = document.nodes[parentId];
    if (!parent) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_PARENT",
          message: `Line ${entry.line} cannot find parent for indentation level ${entry.level}`,
          path: `line.${entry.line}`,
          recoverable: true,
        },
      };
    }

    if (entry.kind === "link") {
      parent.links.push({ label: entry.label, url: entry.url });
      stack.length = Math.min(stack.length, entry.level + 1);
      continue;
    }

    const nodeId = asNodeId(createId("node"));
    const node = createNode({
      id: nodeId,
      parentId,
      title: entry.title,
      position: {
        x: (entry.level + 1) * document.layout.gapX,
        y: parent.children.length * document.layout.gapY,
      },
    });
    document.nodes[nodeId] = node;
    parent.children.push(nodeId);
    stack[entry.level + 1] = nodeId;
    stack.length = entry.level + 2;
  }

  return validateDocument(document);
}

function stripCodeFence(value: string): string {
  const fenced = /^```(?:mermaid)?\s*\r?\n([\s\S]*?)\r?\n```$/i.exec(value.trim());
  return fenced ? fenced[1] ?? "" : value;
}

function countLeadingSpaces(value: string, indentSize: number): number {
  return (value.match(/^\s*/)?.[0] ?? "").replace(/\t/g, " ".repeat(indentSize)).length;
}

function stripSurroundingQuotes(value: string): string {
  const text = value.trim();
  const first = text[0];
  const last = text[text.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function cleanMermaidNodeTitle(value: string): string {
  const text = value
    .trim()
    .replace(/\s*:::[A-Za-z0-9_-]+\s*$/, "")
    .replace(/<br\s*\/?>/gi, " ");
  const id = "[A-Za-z_][\\w-]*";
  const shapePatterns = [
    new RegExp(`^(?:${id})?\\(\\((.+)\\)\\)$`),
    new RegExp(`^(?:${id})?\\[\\[(.+)\\]\\]$`),
    new RegExp(`^(?:${id})?\\{\\{(.+)\\}\\}$`),
    new RegExp(`^(?:${id})?\\)\\)(.+)\\(\\($`),
    new RegExp(`^(?:${id})?\\[(.+)\\]$`),
    new RegExp(`^(?:${id})?\\)(.+)\\($`),
    new RegExp(`^(?:${id})?\\((.+)\\)$`),
  ];

  for (const pattern of shapePatterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return decodeEntities(stripSurroundingQuotes(match[1])) || "Untitled";
  }

  return decodeEntities(stripSurroundingQuotes(text)) || "Untitled";
}

function mermaidToEntries(mermaid: string, indentSize: number): ParseResult<MermaidEntry[]> {
  const entries: MermaidEntry[] = [];
  let foundMindmap = false;
  let lineNumber = 0;

  for (const rawLine of stripCodeFence(mermaid).split(/\r?\n/)) {
    lineNumber += 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;

    if (!foundMindmap) {
      if (/^mindmap\s*$/i.test(trimmed)) {
        foundMindmap = true;
        continue;
      }
      return escapeError("UNSUPPORTED_MERMAID", "Mermaid import currently supports mindmap diagrams");
    }

    if (trimmed.startsWith("::") || /^class(?:Def)?\b/.test(trimmed)) continue;
    entries.push({
      indent: countLeadingSpaces(rawLine, indentSize),
      line: lineNumber,
      title: cleanMermaidNodeTitle(trimmed),
    });
  }

  if (!foundMindmap) return escapeError("EMPTY_MERMAID", "Mermaid input must start with a mindmap diagram");
  if (entries.length === 0) return escapeError("EMPTY_MERMAID", "Mermaid mindmap contains no nodes");
  return { ok: true, value: entries };
}

function importMermaid(
  mermaid: string,
  options: ImportOptions = {},
): ParseResult<MindMapDocument> {
  const parsed = mermaidToEntries(mermaid, options.indentSize ?? 2);
  if (!parsed.ok) return parsed;

  const includeRoot = options.includeRoot ?? true;
  const rootEntry = parsed.value[0];
  if (!rootEntry) return escapeError("EMPTY_MERMAID", "Mermaid mindmap contains no nodes");

  const document = createEmptyDocument({
    title: options.title ?? "Imported mind map",
    rootTitle: includeRoot ? rootEntry.title : options.rootTitle ?? "Imported topics",
  });
  const stack: Array<{ indent: number; nodeId: NodeId }> = [
    { indent: includeRoot ? rootEntry.indent : Number.NEGATIVE_INFINITY, nodeId: document.rootId },
  ];
  const startIndex = includeRoot ? 1 : 0;

  for (let index = startIndex; index < parsed.value.length; index += 1) {
    const entry = parsed.value[index];
    if (!entry) continue;

    while (stack.length > 0 && (stack[stack.length - 1]?.indent ?? 0) >= entry.indent) {
      stack.pop();
    }

    const parentRef = stack[stack.length - 1];
    if (!parentRef) {
      return {
        ok: false,
        error: {
          code: "MERMAID_ROOT_SIBLING",
          message: `Line ${entry.line} must be nested under the mindmap root`,
          path: `line.${entry.line}`,
          recoverable: true,
        },
      };
    }

    const parent = document.nodes[parentRef.nodeId];
    if (!parent) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_PARENT",
          message: `Line ${entry.line} cannot find parent for indentation level`,
          path: `line.${entry.line}`,
          recoverable: true,
        },
      };
    }

    const level = Math.max(0, stack.length - 1);
    const nodeId = asNodeId(createId("node"));
    const node = createNode({
      id: nodeId,
      parentId: parentRef.nodeId,
      title: entry.title,
      position: {
        x: (level + 1) * document.layout.gapX,
        y: parent.children.length * document.layout.gapY,
      },
    });
    document.nodes[nodeId] = node;
    parent.children.push(nodeId);
    stack.push({ indent: entry.indent, nodeId });
  }

  return validateDocument(document);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseOutlineText(tag: string): string {
  const text = /\b(text|title)=["']([^"']*)["']/i.exec(tag);
  return text ? decodeEntities(text[2] ?? "Untitled") : "Untitled";
}

function opmlToIndentedText(opml: string): ParseResult<string> {
  if (/<!ENTITY/i.test(opml) || /<!DOCTYPE/i.test(opml)) {
    return escapeError(
      "UNSAFE_OPML",
      "OPML must not contain external entities",
    ) as ParseResult<string>;
  }

  const tokens = opml.match(/<\/?outline\b[^>]*\/?>/gi) ?? [];
  if (tokens.length === 0) {
    return {
      ok: false,
      error: { code: "EMPTY_OPML", message: "OPML contains no outline nodes", recoverable: true },
    };
  }

  let depth = 0;
  const lines: string[] = [];
  for (const token of tokens) {
    if (/^<\//.test(token)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    lines.push(`${"  ".repeat(depth)}${parseOutlineText(token)}`);
    if (!/\/>$/.test(token)) depth += 1;
  }
  return { ok: true, value: lines.join("\n") };
}

async function readInput(input: string | File): Promise<string> {
  if (typeof input === "string") return input;
  return input.text();
}

export async function importMindMap(
  input: string | File,
  format: ImportFormat,
  options: ImportOptions = {},
): Promise<ParseResult<MindMapDocument>> {
  const text = await readInput(input);

  if (format === "json") return parseDocument(text);
  if (format === "indented-text") return importIndentedText(text, options);
  if (format === "markdown") return importMarkdown(text, options);
  if (format === "mermaid") return importMermaid(text, options);
  if (format === "opml") {
    const indented = opmlToIndentedText(text);
    if (!indented.ok) return indented;
    return importIndentedText(indented.value, options);
  }

  return escapeError("UNSUPPORTED_IMPORT_FORMAT", `Unsupported import format ${format}`);
}

export function importMindMapSync(
  input: string,
  format: ImportFormat,
  options: ImportOptions = {},
): ParseResult<MindMapDocument> {
  if (format === "json") return parseDocument(input);
  if (format === "indented-text") return importIndentedText(input, options);
  if (format === "markdown") return importMarkdown(input, options);
  if (format === "mermaid") return importMermaid(input, options);
  if (format === "opml") {
    const indented = opmlToIndentedText(input);
    if (!indented.ok) return indented;
    return importIndentedText(indented.value, options);
  }
  return validateDocument(input);
}
