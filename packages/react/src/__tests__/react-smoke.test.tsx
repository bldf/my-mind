import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { asNodeId, createEmptyDocument, createNode, type MindMapNode } from "@my-mind-node/core";
import { documentToFlow } from "../document-to-flow";
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

  it("assigns automatic branch colors without overriding custom node colors", () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    const root = document.nodes[document.rootId]!;
    const firstId = asNodeId("first");
    const secondId = asNodeId("second");
    const customId = asNodeId("custom");
    root.children = [firstId, secondId, customId];
    document.nodes[firstId] = createNode({
      id: firstId,
      parentId: document.rootId,
      title: "First",
    });
    document.nodes[secondId] = createNode({
      id: secondId,
      parentId: document.rootId,
      title: "Second",
    });
    document.nodes[customId] = createNode({
      id: customId,
      parentId: document.rootId,
      title: "Custom",
      style: { backgroundColor: "#123456", borderColor: "#654321", color: "#f8fafc" },
    });

    const flow = documentToFlow(document);
    const getFlowNode = (id: string) => flow.nodes.find((node) => node.id === id)!.data.node as MindMapNode;

    expect(getFlowNode("first").style.backgroundColor).toBeTruthy();
    expect(getFlowNode("first").style.backgroundColor).not.toBe(getFlowNode("second").style.backgroundColor);
    expect(getFlowNode("custom").style.backgroundColor).toBe("#123456");
    expect(getFlowNode("custom").style.borderColor).toBe("#654321");
    expect(getFlowNode("custom").style.color).toBe("#f8fafc");
  });
});
