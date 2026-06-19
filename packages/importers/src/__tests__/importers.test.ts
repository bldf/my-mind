import { describe, expect, it } from "vitest";
import { importMindMapSync } from "../index";

describe("@my-mind-node/importers", () => {
  it("imports markdown headings and lists", () => {
    const result = importMindMapSync("# Roadmap\n## Alpha\n- Beta", "markdown");
    expect(result.ok).toBe(true);
  });

  it("imports exported markdown with root and nested list hierarchy", () => {
    const result = importMindMapSync("# Roadmap\n- Alpha\n  - Beta", "markdown");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const root = result.value.nodes[result.value.rootId];
    expect(root?.title).toBe("Roadmap");
    const alpha = root?.children[0] ? result.value.nodes[root.children[0]] : undefined;
    expect(alpha?.title).toBe("Alpha");
    const beta = alpha?.children[0] ? result.value.nodes[alpha.children[0]] : undefined;
    expect(beta?.title).toBe("Beta");
  });

  it("imports exported markdown links as node links", () => {
    const result = importMindMapSync(
      "# Roadmap\n- Alpha\n  - [Example](https://example.com)\n  - Beta",
      "markdown",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const root = result.value.nodes[result.value.rootId];
    const alpha = root?.children[0] ? result.value.nodes[root.children[0]] : undefined;
    expect(alpha?.links).toEqual([{ label: "Example", url: "https://example.com" }]);
    const beta = alpha?.children[0] ? result.value.nodes[alpha.children[0]] : undefined;
    expect(beta?.title).toBe("Beta");
  });

  it("rejects unsafe opml entities", () => {
    const result = importMindMapSync("<!DOCTYPE foo><opml />", "opml");
    expect(result.ok).toBe(false);
  });
});
