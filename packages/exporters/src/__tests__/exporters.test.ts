import { createEmptyDocument } from "@my-mind-node/core";
import { describe, expect, it } from "vitest";
import { exportMindMap } from "../index";

describe("@my-mind-node/exporters", () => {
  it("exports json and svg", async () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    await expect(exportMindMap(document, "json")).resolves.toMatchObject({ ok: true });
    const svg = await exportMindMap(document, "svg");
    expect(svg.ok).toBe(true);
    if (svg.ok) expect(String(svg.value)).toContain("<svg");
  });
});
