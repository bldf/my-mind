import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  asNodeId,
  createEmptyDocument,
  createNode,
  type MindMapDocument,
  type MindMapNode,
} from "@my-mind-node/core";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import {
  getDropGeometry,
  getDropIntentLabel,
  getDropValidationReason,
  getSortInsertionIndex,
  getTopLevelMovableNodeIds,
} from "../drag-interactions";
import { documentToFlow } from "../document-to-flow";
import { MindMapEditor } from "../MindMapEditor";
import { MindMapViewer } from "../MindMapViewer";
import { MindNode, type MindNodeData } from "../nodes/MindNode";
import { OutlineEditor } from "../OutlineEditor";

afterEach(() => cleanup());

if (typeof window.PointerEvent === "undefined") {
  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    writable: true,
    value: MouseEvent as unknown as typeof PointerEvent,
  });
}

function createDocumentWithRootChildren(): MindMapDocument {
  const document = createEmptyDocument({ rootTitle: "Root" });
  const root = document.nodes[document.rootId]!;
  const firstId = asNodeId("first");
  const secondId = asNodeId("second");
  root.children = [firstId, secondId];
  document.nodes[firstId] = createNode({ id: firstId, parentId: document.rootId, title: "First" });
  document.nodes[secondId] = createNode({
    id: secondId,
    parentId: document.rootId,
    title: "Second",
  });
  return document;
}

function renderMindNode(data: MindNodeData, selected = false) {
  const props = {
    id: String(data.node.id),
    type: "mindNode",
    selected,
    data,
  } as unknown as NodeProps;

  return render(
    <ReactFlowProvider>
      <MindNode {...props} />
    </ReactFlowProvider>,
  );
}

describe("@my-mind-node/react", () => {
  it("renders a readonly viewer", () => {
    const document = createEmptyDocument({ rootTitle: "Viewer root" });
    render(<MindMapViewer value={document} height={360} />);
    expect(screen.getByLabelText("Mind map tools")).toBeTruthy();
  });

  it("renders a controlled document after its root id changes", async () => {
    const firstDocument = createEmptyDocument({ rootTitle: "First root" });
    const nextDocument = createEmptyDocument({ rootTitle: "Next root" });
    const { rerender } = render(<MindMapEditor value={firstDocument} />);

    expect(screen.getByLabelText("Title for First root")).toBeTruthy();

    rerender(<MindMapEditor value={nextDocument} />);

    await waitFor(() => expect(screen.getByLabelText("Title for Next root")).toBeTruthy());
    expect(screen.queryByLabelText("Title for First root")).toBeNull();
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
    document.nodes.hidden = createNode({
      id: asNodeId("hidden"),
      parentId: asNodeId("first"),
      title: "Hidden child",
    });
    const flow = documentToFlow(document, { showAddChildControl: true });
    const collapsed = flow.nodes.find((node) => node.id === "first")!;

    expect(collapsed.data.showAddChildControl).toBe(false);
  });

  it("counts all hidden descendants for collapsed visible nodes", () => {
    const document = createDocumentWithRootChildren();
    const childId = asNodeId("hidden-child");
    const grandchildId = asNodeId("hidden-grandchild");
    document.nodes.first!.collapsed = true;
    document.nodes.first!.children = [childId];
    document.nodes[childId] = createNode({
      id: childId,
      parentId: asNodeId("first"),
      title: "Hidden child",
      children: [grandchildId],
    });
    document.nodes[grandchildId] = createNode({
      id: grandchildId,
      parentId: childId,
      title: "Hidden grandchild",
    });

    const flow = documentToFlow(document);
    const collapsed = flow.nodes.find((node) => node.id === "first")!;

    expect(collapsed.data.collapsedHiddenCount).toBe(2);
    expect(flow.nodes.some((node) => node.id === "hidden-child")).toBe(false);
  });

  it("renders collapsed hidden counts as the expand entry without a duplicate hover expand button", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "First",
      collapsed: true,
      children: [asNodeId("child")],
    });
    const onExpandCollapsed = vi.fn();
    const onToggleCollapse = vi.fn();

    renderMindNode({ node, collapsedHiddenCount: 2, onExpandCollapsed, onToggleCollapse });

    fireEvent.click(screen.getByRole("button", { name: "Expand First, 2 hidden nodes" }));
    expect(onExpandCollapsed).toHaveBeenCalledWith(asNodeId("first"));
    expect(screen.queryByRole("button", { name: "Expand node First" })).toBeNull();
  });

  it("shows readonly collapsed counts as non-mutating status text", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "First",
      collapsed: true,
      children: [asNodeId("child")],
    });

    renderMindNode({ node, readonly: true, collapsedHiddenCount: 2, onExpandCollapsed: vi.fn() });

    expect(screen.getByLabelText("First has 2 hidden nodes")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Expand First, 2 hidden nodes" })).toBeNull();
  });

  it("exposes drag flash settings to CSS animations", () => {
    const document = createDocumentWithRootChildren();
    const { container } = render(
      <MindMapEditor
        value={document}
        dragInteraction={{ reparentDwellMs: 1234, flashDurationMs: 456 }}
      />,
    );
    const editor = container.querySelector<HTMLElement>(".mmn-editor")!;

    expect(editor.style.getPropertyValue("--mmn-drop-flash-duration")).toBe("456ms");
  });

  it("describes center drop as immediate child movement", () => {
    expect(getDropIntentLabel({ type: "reparent", targetId: asNodeId("target") })).toBe(
      "Drop to add as child",
    );
  });

  it("separates overlap reparenting from outside before and after sort zones", () => {
    const targetRect = { left: 100, top: 100, right: 200, bottom: 150, width: 100, height: 50 };
    const base = {
      targetRect,
      layoutDirection: "right" as const,
      sortGapPx: 48,
      overlapRatio: 0.3,
    };

    expect(
      getDropGeometry({
        ...base,
        movingRect: { left: 120, top: 108, right: 180, bottom: 148, width: 60, height: 40 },
      }).type,
    ).toBe("reparent");
    expect(
      getDropGeometry({
        ...base,
        movingRect: { left: 120, top: 64, right: 180, bottom: 104, width: 60, height: 40 },
      }).type,
    ).toBe("sort-before");
    expect(
      getDropGeometry({
        ...base,
        movingRect: { left: 120, top: 146, right: 180, bottom: 186, width: 60, height: 40 },
      }).type,
    ).toBe("sort-after");
    expect(
      getDropGeometry({
        ...base,
        movingRect: { left: 260, top: 64, right: 320, bottom: 104, width: 60, height: 40 },
      }).type,
    ).toBe("none");
  });

  it("renders selected node resize handles without the old bottom shrink and grow buttons", () => {
    const node = createNode({ id: asNodeId("first"), title: "First" });
    const onResizeNode = vi.fn();

    renderMindNode({ node, onResizeNode, nodeResizeStep: 0.2 }, true);

    expect(screen.getAllByRole("button", { name: /^Resize First from/ })).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Shrink node" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Grow node" })).toBeNull();

    fireEvent.keyDown(screen.getByRole("button", { name: "Resize First from top left" }), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Resize First from top left" }), {
      key: "Enter",
    });
    expect(onResizeNode).toHaveBeenNthCalledWith(1, [asNodeId("first")], -0.2);
    expect(onResizeNode).toHaveBeenNthCalledWith(2, [asNodeId("first")], 0.2);
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
    const getFlowNode = (id: string) =>
      flow.nodes.find((node) => node.id === id)!.data.node as MindMapNode;

    expect(getFlowNode("first").style.backgroundColor).toBeTruthy();
    expect(getFlowNode("first").style.backgroundColor).not.toBe(
      getFlowNode("second").style.backgroundColor,
    );
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
    document.nodes[childId] = createNode({
      id: childId,
      parentId: asNodeId("first"),
      title: "Child",
    });

    expect(getTopLevelMovableNodeIds(document, [asNodeId("first"), childId])).toEqual([
      asNodeId("first"),
    ]);
    expect(getDropValidationReason(document, [asNodeId("first")], childId, "reparent")).toMatch(
      /descendant/,
    );
    expect(getSortInsertionIndex(document, asNodeId("second"), [asNodeId("first")], "before")).toBe(
      0,
    );
    expect(getSortInsertionIndex(document, asNodeId("second"), [asNodeId("first")], "after")).toBe(
      1,
    );
  });

  it("preserves newline titles from the node title editor", () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    const onChange = vi.fn();
    render(<MindMapEditor value={document} onChange={onChange} />);

    const title = screen.getByLabelText("Title for Root");
    fireEvent.change(title, { target: { value: "Line one\nLine two" } });
    fireEvent.blur(title);

    const nextDocument = onChange.mock.calls.at(-1)?.[0] as MindMapDocument;
    expect(nextDocument.nodes[nextDocument.rootId]!.title).toBe("Line one\nLine two");
  });

  it("handles continuous 1:1 dragging and commits the scale value on release", () => {
    const node = createNode({ id: asNodeId("first"), title: "First" });
    const onResizeProgress = vi.fn();
    const onResizeCommit = vi.fn();

    renderMindNode({
      node,
      onResizeProgress,
      onResizeCommit,
      nodeMinScale: 0.5,
      nodeMaxScale: 2.0,
      nodeResizeStep: 0.1,
    }, true);

    const handle = screen.getByRole("button", { name: "Resize First from top left" });

    const nodeElement = handle.closest(".mmn-node")!;
    nodeElement.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      right: 200,
      bottom: 200,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 });
    fireEvent(window, new PointerEvent("pointermove", { clientX: 50, clientY: 50 }));

    expect(onResizeProgress).toHaveBeenCalledWith(asNodeId("first"), 2.0);

    fireEvent(window, new PointerEvent("pointerup"));
    expect(onResizeCommit).toHaveBeenCalledWith(asNodeId("first"), 2.0);
  });

  it("commits a single step increase on a simple click click/pointerup without movement", () => {
    const node = createNode({ id: asNodeId("first"), title: "First" });
    const onResizeProgress = vi.fn();
    const onResizeCommit = vi.fn();

    renderMindNode({
      node,
      onResizeProgress,
      onResizeCommit,
      nodeMinScale: 0.5,
      nodeMaxScale: 2.0,
      nodeResizeStep: 0.15,
    }, true);

    const handle = screen.getByRole("button", { name: "Resize First from top left" });

    const nodeElement = handle.closest(".mmn-node")!;
    nodeElement.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      right: 200,
      bottom: 200,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 });
    fireEvent(window, new PointerEvent("pointerup"));

    expect(onResizeProgress).not.toHaveBeenCalled();
    expect(onResizeCommit).toHaveBeenCalledWith(asNodeId("first"), 1.15);
  });

  it("assigns automatic branch colors and root styles under dark theme", () => {
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

    const darkTheme = {
      id: "graphite",
      name: "Graphite",
      mode: "dark" as const,
      colors: {
        canvas: "#111315",
        node: "#1f242a",
        nodeText: "#f8fafc",
        edge: "#8b98a9",
        selected: "#38bdf8",
        accent: "#f59e0b",
      },
    };

    const flow = documentToFlow(document, { theme: darkTheme });
    const getFlowNode = (id: string) =>
      flow.nodes.find((node) => node.id === id)!.data.node as MindMapNode;

    const rootNode = getFlowNode(String(document.rootId));
    expect(rootNode.style.backgroundColor).toBe("#1f242a");
    expect(rootNode.style.color).toBe("#f8fafc");

    expect(getFlowNode("first").style.backgroundColor).toBe("#13383e");
    expect(getFlowNode("second").style.backgroundColor).toBe("#211d4d");
    expect(getFlowNode("custom").style.backgroundColor).toBe("#123456");
    expect(getFlowNode("custom").style.borderColor).toBe("#654321");
    expect(getFlowNode("custom").style.color).toBe("#f8fafc");
  });
});
