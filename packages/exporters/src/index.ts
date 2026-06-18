import { exportIndentedText, serializeDocument } from "@my-mind-node/core";
import type { MindMapDocument, MindMapError, NodeId } from "@my-mind-node/core";

export type ExportFormat = "json" | "markdown" | "opml" | "indented-text" | "png" | "svg";

export interface ExportOptions {
  title?: string;
  includeRoot?: boolean;
  backgroundColor?: string;
  pixelRatio?: number;
  viewport?: "current" | "full";
  element?: HTMLElement;
}

export type ExportResult = { ok: true; value: Blob | string } | { ok: false; error: MindMapError };

function fail(code: string, message: string): ExportResult {
  return { ok: false, error: { code, message, recoverable: true } };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportMarkdownNode(document: MindMapDocument, nodeId: NodeId, depth: number, lines: string[]) {
  const node = document.nodes[nodeId];
  if (!node) return;
  if (depth === 0) lines.push(`# ${node.title}`);
  else lines.push(`${"  ".repeat(depth - 1)}- ${node.title}`);
  if (node.note) lines.push(`${"  ".repeat(depth)}${node.note}`);
  for (const link of node.links) {
    lines.push(`${"  ".repeat(depth)}- [${link.label ?? link.url}](${link.url})`);
  }
  for (const childId of node.children) exportMarkdownNode(document, childId, depth + 1, lines);
}

function exportOpmlNode(document: MindMapDocument, nodeId: NodeId, depth: number, lines: string[]) {
  const node = document.nodes[nodeId];
  if (!node) return;
  const indent = "  ".repeat(depth);
  if (node.children.length === 0) {
    lines.push(`${indent}<outline text="${escapeXml(node.title)}" />`);
    return;
  }
  lines.push(`${indent}<outline text="${escapeXml(node.title)}">`);
  for (const childId of node.children) exportOpmlNode(document, childId, depth + 1, lines);
  lines.push(`${indent}</outline>`);
}

function exportSvg(document: MindMapDocument, options: ExportOptions = {}): string {
  const nodes = Object.values(document.nodes);
  const minX = Math.min(...nodes.map((node) => node.position.x), 0) - 120;
  const minY = Math.min(...nodes.map((node) => node.position.y), 0) - 80;
  const maxX = Math.max(...nodes.map((node) => node.position.x), 600) + 240;
  const maxY = Math.max(...nodes.map((node) => node.position.y), 400) + 140;
  const width = maxX - minX;
  const height = maxY - minY;
  const background = options.backgroundColor ?? document.theme?.colors.canvas ?? "#f7f8fb";
  const nodeFill = document.theme?.colors.node ?? "#ffffff";
  const nodeText = document.theme?.colors.nodeText ?? "#111827";
  const edge = document.theme?.colors.edge ?? "#758195";

  const edgeMarkup = Object.values(document.nodes)
    .flatMap((node) =>
      node.children.flatMap((childId) => {
        const target = document.nodes[childId];
        return target ? ([[node, target]] as const) : [];
      }),
    )
    .map(([source, target]) => {
      const sx = source.position.x - minX + 176;
      const sy = source.position.y - minY + 30;
      const tx = target.position.x - minX;
      const ty = target.position.y - minY + 30;
      const mid = (sx + tx) / 2;
      return `<path d="M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}" fill="none" stroke="${edge}" stroke-width="2" />`;
    })
    .join("\n");

  const nodeMarkup = nodes
    .map((node) => {
      const x = node.position.x - minX;
      const y = node.position.y - minY;
      return `<g transform="translate(${x} ${y})"><rect width="176" height="58" rx="8" fill="${node.style.backgroundColor ?? nodeFill}" stroke="${node.style.borderColor ?? edge}" /><text x="14" y="34" fill="${node.style.color ?? nodeText}" font-size="14" font-family="Inter, sans-serif">${escapeXml(node.title)}</text></g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(document.title)}"><rect width="100%" height="100%" fill="${background}" />${edgeMarkup}${nodeMarkup}</svg>`;
}

async function svgToPng(svg: string): Promise<ExportResult> {
  if (typeof document === "undefined") {
    return fail("BROWSER_REQUIRED", "PNG export requires a browser environment");
  }
  const image = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
    });
    image.src = url;
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) return fail("CANVAS_UNAVAILABLE", "Canvas context is unavailable");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? { ok: true, value: blob } : fail("PNG_EXPORT_FAILED", "Canvas did not produce a PNG blob");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportMindMap(
  document: MindMapDocument,
  format: ExportFormat,
  options: ExportOptions = {},
): Promise<ExportResult> {
  try {
    if (format === "json") return { ok: true, value: serializeDocument(document) };
    if (format === "indented-text") return { ok: true, value: exportIndentedText(document, options) };
    if (format === "markdown") {
      const lines: string[] = [];
      exportMarkdownNode(document, document.rootId, 0, lines);
      return { ok: true, value: lines.join("\n") };
    }
    if (format === "opml") {
      const lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<opml version=\"2.0\">", `<head><title>${escapeXml(document.title)}</title></head>`, "<body>"];
      exportOpmlNode(document, document.rootId, 1, lines);
      lines.push("</body>", "</opml>");
      return { ok: true, value: lines.join("\n") };
    }
    if (format === "svg") return { ok: true, value: exportSvg(document, options) };
    if (format === "png") return svgToPng(exportSvg(document, options));
    return fail("UNSUPPORTED_EXPORT_FORMAT", `Unsupported export format ${format}`);
  } catch (error) {
    return fail("EXPORT_FAILED", error instanceof Error ? error.message : "Export failed");
  }
}
