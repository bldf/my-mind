import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapViewer } from "../MindMapViewer";
import { OutlineEditor } from "../OutlineEditor";

describe("@my-mind-node/react", () => {
  it("renders a readonly viewer", () => {
    const document = createEmptyDocument({ rootTitle: "Viewer root" });
    render(<MindMapViewer value={document} height={360} />);
    expect(screen.getByLabelText("Mind map tools")).toBeTruthy();
  });

  it("renders an outline editor", () => {
    const document = createEmptyDocument({ rootTitle: "Outline root" });
    render(<OutlineEditor value={document} />);
    expect(screen.getByLabelText("Outline editor")).toBeTruthy();
  });
});
