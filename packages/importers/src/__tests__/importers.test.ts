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

  it("imports mermaid mindmap syntax", () => {
    const result = importMindMapSync(
      [
        "mindmap",
        "  root((Enterprise AIGC season 2))",
        "    Professional terminal",
        "      Ghostty",
        "      btop system monitor",
        "    Claude environment",
        "      Bedrock AWS service",
      ].join("\n"),
      "mermaid",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const root = result.value.nodes[result.value.rootId];
    expect(root?.title).toBe("Enterprise AIGC season 2");
    const terminal = root?.children[0] ? result.value.nodes[root.children[0]] : undefined;
    expect(terminal?.title).toBe("Professional terminal");
    const ghostty = terminal?.children[0] ? result.value.nodes[terminal.children[0]] : undefined;
    expect(ghostty?.title).toBe("Ghostty");
    const claude = root?.children[1] ? result.value.nodes[root.children[1]] : undefined;
    expect(claude?.title).toBe("Claude environment");
  });

  it("imports fenced mermaid mindmaps and skips decorators", () => {
    const result = importMindMapSync(
      "```mermaid\nmindmap\n  root((Roadmap))\n    Research<br/>notes\n      ::icon(fa fa-book)\n      node1[Beta]\n```",
      "mermaid",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const root = result.value.nodes[result.value.rootId];
    const research = root?.children[0] ? result.value.nodes[root.children[0]] : undefined;
    expect(research?.title).toBe("Research notes");
    const beta = research?.children[0] ? result.value.nodes[research.children[0]] : undefined;
    expect(beta?.title).toBe("Beta");
  });

  it("imports quoted mermaid labels with delimiter characters", () => {
    const result = importMindMapSync(
      'mindmap\n  root["Root [docs] )) &amp; &quot;quotes&quot;"]\n    node1["Child [x] ] and ))"]',
      "mermaid",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const root = result.value.nodes[result.value.rootId];
    expect(root?.title).toBe('Root [docs] )) & "quotes"');
    const child = root?.children[0] ? result.value.nodes[root.children[0]] : undefined;
    expect(child?.title).toBe("Child [x] ] and ))");
  });

  it("rejects unsafe opml entities", () => {
    const result = importMindMapSync("<!DOCTYPE foo><opml />", "opml");
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported mermaid diagram types", () => {
    const result = importMindMapSync("flowchart TD\n  A --> B", "mermaid");
    expect(result.ok).toBe(false);
  });
});
