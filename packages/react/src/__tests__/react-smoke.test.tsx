import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { asNodeId, createEmptyDocument, createNode, type MindMapDocument, type MindMapNode } from "@my-mind-node/core";
import { getDropValidationReason, getSortInsertionIndex, getTopLevelMovableNodeIds } from "../drag-interactions";
import { documentToFlow } from "../document-to-flow";
import { MindMapEditor } from "../MindMapEditor";
import { MindMapViewer } from "../MindMapViewer";
import { OutlineEditor } from "../OutlineEditor";

afterEach(() => cleanup());

function createDocumentWithRootChildren(): MindMapDocument {
  const document = createEmptyDocument({ rootTitle: "Root" });
  const root = document.nodes[document.rootId]!;
  const firstId = asNodeId("first");
  const secondId = asNodeId("second");
  root.children = [firstId, secondId];
  document.nodes[firstId] = createNode({ id: firstId, parentId: document.rootId, title: "First" });
  document.nodes[secondId] = createNode({ id: secondId, parentId: document.rootId, title: "Second" });
  return document;
}

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

  it("wires editable hover callbacks through flow node data", () => {
    const document = createDocumentWithRootChildren();
    const onAddChild = vi.fn();
    const onToggleCollapse = vi.fn();
    const flow = documentToFlow(document, {
      onAddChild,
      onToggleCollapse,
      showAddChildControl: true,
      showCollapseControl: true,
    });
    const root = flow.nodes.find((node) => node.id === document.rootId)!;

    root.data.onAddChild?.(document.rootId);
    root.data.onToggleCollapse?.(document.rootId);
    expect(onAddChild).toHaveBeenCalledWith(document.rootId);
    expect(onToggleCollapse).toHaveBeenCalledWith(document.rootId);
    expect(root.data.showAddChildControl).toBe(true);
    expect(root.data.showCollapseControl).toBe(true);
  });

  it("marks readonly flow node data so structure controls stay hidden", () => {
    const document = createDocumentWithRootChildren();
    const flow = documentToFlow(document, { readonly: true });
    const root = flow.nodes.find((node) => node.id === document.rootId)!;
    expect(root.data.readonly).toBe(true);
  });

  it("hides add-child flow controls for collapsed nodes", () => {
    const document = createDocumentWithRootChildren();
    document.nodes.first!.collapsed = true;
    document.nodes.first!.children = [asNodeId("hidden")];
    document.nodes.hidden = createNode({ id: asNodeId("hidden"), parentId: asNodeId("first"), title: "Hidden child" });
    const flow = documentToFlow(document, { showAddChildControl: true });
    const collapsed = flow.nodes.find((node) => node.id === "first")!;

    expect(collapsed.data.showAddChildControl).toBe(false);
  });

  it("exposes drag timing settings to CSS animations", () => {
    const document = createDocumentWithRootChildren();
    const { container } = render(<MindMapEditor value={document} dragInteraction={{ reparentDwellMs: 1234, flashDurationMs: 456 }} />);
    const editor = container.querySelector<HTMLElement>(".mmn-editor")!;

    expect(editor.style.getPropertyValue("--mmn-drop-dwell-duration")).toBe("1234ms");
    expect(editor.style.getPropertyValue("--mmn-drop-flash-duration")).toBe("456ms");
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

  it("marks drop intent data on the target flow node", () => {
    const document = createDocumentWithRootChildren();
    const flow = documentToFlow(document, {
      dropIntent: { type: "sort-before", targetId: asNodeId("second") },
      flashNodeId: asNodeId("second"),
    });

    const target = flow.nodes.find((node) => node.id === "second")!;
    const source = flow.nodes.find((node) => node.id === "first")!;
    expect(target.data.dropIntent?.type).toBe("sort-before");
    expect(target.data.flash).toBe(true);
    expect(source.data.dropIntent).toBeUndefined();
  });

  it("validates illegal drop targets and adjusted sort indexes", () => {
    const document = createDocumentWithRootChildren();
    const childId = asNodeId("child");
    document.nodes.first!.children = [childId];
    document.nodes[childId] = createNode({ id: childId, parentId: asNodeId("first"), title: "Child" });

    expect(getTopLevelMovableNodeIds(document, [asNodeId("first"), childId])).toEqual([asNodeId("first")]);
    expect(getDropValidationReason(document, [asNodeId("first")], childId, "reparent")).toMatch(/descendant/);
    expect(getSortInsertionIndex(document, asNodeId("second"), [asNodeId("first")], "before")).toBe(0);
    expect(getSortInsertionIndex(document, asNodeId("second"), [asNodeId("first")], "after")).toBe(1);
  });
});
