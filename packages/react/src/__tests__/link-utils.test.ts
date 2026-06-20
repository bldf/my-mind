import { describe, expect, it, vi } from "vitest";
import { createNode } from "@my-mind-node/core";
import {
  getPrimaryNodeLink,
  getTitleUrlLink,
  isSafeExternalUrl,
  openSafeExternalUrl,
} from "../link-utils";

describe("link-utils", () => {
  it("uses the first non-empty node link before a URL title", () => {
    const node = createNode({
      title: "https://title.example",
      links: [
        { url: "   " },
        { url: " https://link.example/docs ", label: "Docs" },
      ],
    });

    expect(getPrimaryNodeLink(node)).toEqual({
      url: "https://link.example/docs",
      label: "Docs",
    });
  });

  it("derives a link from a safe URL title when no node links exist", () => {
    const node = createNode({ title: "https://example.com" });

    expect(getTitleUrlLink(node)).toEqual({
      url: "https://example.com",
      label: "https://example.com",
    });
    expect(getPrimaryNodeLink(node)).toEqual({
      url: "https://example.com",
      label: "https://example.com",
    });
  });

  it("does not derive links from empty, relative, or unsafe titles", () => {
    expect(getTitleUrlLink(createNode({ title: "   " }))).toBeUndefined();
    expect(getTitleUrlLink(createNode({ title: "/docs" }))).toBeUndefined();
    expect(getTitleUrlLink(createNode({ title: "javascript:alert(1)" }))).toBeUndefined();
  });

  it("allows only explicit safe external protocols", () => {
    expect(isSafeExternalUrl("https://example.com")).toBe(true);
    expect(isSafeExternalUrl("http://example.com")).toBe(true);
    expect(isSafeExternalUrl("mailto:hello@example.com")).toBe(true);
    expect(isSafeExternalUrl("tel:+1234567890")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,<h1>x</h1>")).toBe(false);
    expect(isSafeExternalUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeExternalUrl("example.com")).toBe(false);
  });

  it("opens safe URLs with noopener and noreferrer", () => {
    const opener = {
      open: vi.fn(() => ({}) as Window),
    };

    expect(openSafeExternalUrl(" https://example.com ", opener)).toBe(true);
    expect(opener.open).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("treats null noopener results as successfully delegated opens", () => {
    const opener = {
      open: vi.fn(() => null),
    };

    expect(openSafeExternalUrl("https://example.com", opener)).toBe(true);
    expect(opener.open).toHaveBeenCalledTimes(1);
  });

  it("does not open unsafe URLs and reports opener exceptions", () => {
    const opener = {
      open: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(openSafeExternalUrl("javascript:alert(1)", opener)).toBe(false);
    expect(opener.open).not.toHaveBeenCalled();

    expect(openSafeExternalUrl("https://example.com", opener)).toBe(false);
    expect(opener.open).toHaveBeenCalledTimes(1);
  });
});
