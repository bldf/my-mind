import { describe, expect, it } from "vitest";
import { importMindMapSync } from "../index";

describe("@my-mind-node/importers", () => {
  it("imports markdown headings and lists", () => {
    const result = importMindMapSync("# Roadmap\n## Alpha\n- Beta", "markdown");
    expect(result.ok).toBe(true);
  });

  it("rejects unsafe opml entities", () => {
    const result = importMindMapSync("<!DOCTYPE foo><opml />", "opml");
    expect(result.ok).toBe(false);
  });
});
