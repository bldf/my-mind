import { importIndentedText, parseDocument, validateDocument } from "@my-mind-node/core";
import type { MindMapDocument, ParseResult } from "@my-mind-node/core";

export type ImportFormat = "json" | "markdown" | "opml" | "indented-text";

export interface ImportOptions {
  title?: string;
  rootTitle?: string;
}

function escapeError(code: string, message: string): ParseResult<MindMapDocument> {
  return { ok: false, error: { code, message, recoverable: true } };
}

function markdownToIndentedText(markdown: string): string {
  const lines: string[] = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const depth = (heading[1] ?? "#").length - 1;
      lines.push(`${"  ".repeat(depth)}${(heading[2] ?? "").trim()}`);
      continue;
    }
    const list = /^(\s*)([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (list) {
      const depth = (list[1] ?? "").replace(/\t/g, "  ").length / 2;
      lines.push(`${"  ".repeat(depth)}${(list[3] ?? "").trim()}`);
    }
  }
  return lines.join("\n");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
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
    return escapeError("UNSAFE_OPML", "OPML must not contain external entities") as ParseResult<string>;
  }

  const tokens = opml.match(/<\/?outline\b[^>]*\/?>/gi) ?? [];
  if (tokens.length === 0) {
    return { ok: false, error: { code: "EMPTY_OPML", message: "OPML contains no outline nodes", recoverable: true } };
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
  if (format === "markdown") {
    const indented = markdownToIndentedText(text);
    if (!indented.trim()) return escapeError("EMPTY_MARKDOWN", "Markdown contains no headings or list items");
    return importIndentedText(indented, options);
  }
  if (format === "opml") {
    const indented = opmlToIndentedText(text);
    if (!indented.ok) return indented;
    return importIndentedText(indented.value, options);
  }

  return escapeError("UNSUPPORTED_IMPORT_FORMAT", `Unsupported import format ${format}`);
}

export function importMindMapSync(input: string, format: ImportFormat, options: ImportOptions = {}): ParseResult<MindMapDocument> {
  if (format === "json") return parseDocument(input);
  if (format === "indented-text") return importIndentedText(input, options);
  if (format === "markdown") return importIndentedText(markdownToIndentedText(input), options);
  if (format === "opml") {
    const indented = opmlToIndentedText(input);
    if (!indented.ok) return indented;
    return importIndentedText(indented.value, options);
  }
  return validateDocument(input);
}
