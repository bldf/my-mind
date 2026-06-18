import { parseDocument, validateDocument } from "./validation";
import type { MindMapDocument, ParseResult } from "./types";

export function serializeDocument(document: MindMapDocument, space = 2): string {
  const validation = validateDocument(document);
  if (!validation.ok) {
    throw new Error(`${validation.error.code}: ${validation.error.message}`);
  }
  return JSON.stringify(validation.value, null, space);
}

export function migrateDocument(input: unknown): ParseResult<MindMapDocument> {
  return validateDocument(input);
}

export function parseSerializedDocument(input: string): ParseResult<MindMapDocument> {
  return parseDocument(input);
}
