import type { MindMapNode, NodeLink } from "@my-mind-node/core";

const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function normalizeUrl(url: string): string {
  return url.trim();
}

function parseAbsoluteUrl(url: string): URL | undefined {
  const normalized = normalizeUrl(url);
  if (!normalized) return undefined;

  try {
    return new URL(normalized);
  } catch {
    return undefined;
  }
}

export function isSafeExternalUrl(url: string): boolean {
  const parsed = parseAbsoluteUrl(url);
  return parsed ? SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol) : false;
}

export function getTitleUrlLink(node: MindMapNode): NodeLink | undefined {
  const title = normalizeUrl(node.title);
  if (!isSafeExternalUrl(title)) return undefined;
  return { url: title, label: title };
}

export function getPrimaryNodeLink(node: MindMapNode): NodeLink | undefined {
  const firstLink = node.links.find((link) => normalizeUrl(link.url).length > 0);
  if (firstLink) {
    return {
      ...firstLink,
      url: normalizeUrl(firstLink.url),
    };
  }

  return getTitleUrlLink(node);
}

export function openSafeExternalUrl(
  url: string,
  targetWindow?: Pick<Window, "open">,
): boolean {
  const normalized = normalizeUrl(url);
  if (!isSafeExternalUrl(normalized)) return false;

  const opener =
    targetWindow ??
    (typeof window === "undefined" ? undefined : (window as Pick<Window, "open">));
  if (!opener) return false;

  try {
    opener.open(normalized, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}
