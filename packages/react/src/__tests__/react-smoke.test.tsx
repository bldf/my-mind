import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  asNodeId,
  createEmptyDocument,
  createNode,
  type MindMapDocument,
  type MindMapNode,
} from "@my-mind-node/core";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import {
  getDropGeometry,
  getDropIntentLabel,
  getDropValidationReason,
  getSortInsertionIndex,
  getTopLevelMovableNodeIds,
  isMoveNoOp,
} from "../drag-interactions";
import { documentToFlow } from "../document-to-flow";
import { isTextInputActive, MindMapEditor } from "../MindMapEditor";
import { MindMapViewer } from "../MindMapViewer";
import { MindNode, type MindNodeData } from "../nodes/MindNode";
import { OutlineEditor } from "../OutlineEditor";
import { defaultThemes } from "../themes";

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

function createDeepBranchListDocument(): MindMapDocument {
  const doc = createEmptyDocument({ rootTitle: "Root" });
  const rootId = doc.rootId;
  const branchA = createNode({ id: asNodeId("branch-a"), parentId: rootId, title: "Branch A" });
  const branchB = createNode({ id: asNodeId("branch-b"), parentId: rootId, title: "Branch B" });
  const leafA = createNode({ id: asNodeId("leaf-a"), parentId: branchA.id, title: "Leaf A" });
  const leafB = createNode({ id: asNodeId("leaf-b"), parentId: branchB.id, title: "Leaf B" });

  doc.nodes[rootId]!.children = [branchA.id, branchB.id];
  branchA.children = [leafA.id];
  branchB.children = [leafB.id];
  doc.nodes[branchA.id] = branchA;
  doc.nodes[branchB.id] = branchB;
  doc.nodes[leafA.id] = leafA;
  doc.nodes[leafB.id] = leafB;
  return doc;
}

function createBranchExpansionCycleDocument(): MindMapDocument {
  const doc = createEmptyDocument({ rootTitle: "Root" });
  const rootId = doc.rootId;
  const branch = createNode({ id: asNodeId("branch-a"), parentId: rootId, title: "Branch A" });
  const parent = createNode({ id: asNodeId("parent-a"), parentId: branch.id, title: "Parent A" });
  const leaf = createNode({ id: asNodeId("leaf-a"), parentId: parent.id, title: "Leaf A" });

  doc.nodes[rootId]!.children = [branch.id];
  branch.children = [parent.id];
  parent.children = [leaf.id];
  doc.nodes[branch.id] = branch;
  doc.nodes[parent.id] = parent;
  doc.nodes[leaf.id] = leaf;
  return doc;
}

function createTwoBranchExpansionCycleDocument(): MindMapDocument {
  const doc = createBranchExpansionCycleDocument();
  const rootId = doc.rootId;
  const branch = createNode({ id: asNodeId("branch-b"), parentId: rootId, title: "Branch B" });
  const parent = createNode({ id: asNodeId("parent-b"), parentId: branch.id, title: "Parent B" });
  const leaf = createNode({ id: asNodeId("leaf-b"), parentId: parent.id, title: "Leaf B" });

  doc.nodes[rootId]!.children.push(branch.id);
  branch.children = [parent.id];
  parent.children = [leaf.id];
  doc.nodes[branch.id] = branch;
  doc.nodes[parent.id] = parent;
  doc.nodes[leaf.id] = leaf;
  return doc;
}

function createNoSingleCountCollapseDocument(): MindMapDocument {
  const doc = createBranchExpansionCycleDocument();
  const child = createNode({
    id: asNodeId("leaf-a-child"),
    parentId: asNodeId("leaf-a"),
    title: "Leaf A Child",
  });

  doc.nodes[asNodeId("leaf-a")]!.children = [child.id];
  doc.nodes[child.id] = child;
  return doc;
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
  it("detects active text inputs from the container document", () => {
    const iframe = globalThis.document.createElement("iframe");
    globalThis.document.body.append(iframe);
    const iframeDocument = iframe.contentDocument!;
    const container = iframeDocument.createElement("div");
    const textarea = iframeDocument.createElement("textarea");
    container.append(textarea);
    iframeDocument.body.append(container);

    textarea.focus();

    expect(isTextInputActive(container)).toBe(true);
    iframe.remove();
  });

  it("renders a readonly viewer", () => {
    const document = createEmptyDocument({ rootTitle: "Viewer root" });
    const { container } = render(<MindMapViewer value={document} height={360} />);
    expect(screen.getByLabelText("Mind map tools")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Redo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    expect(container.querySelector(".react-flow__controls")).toBeNull();
  });

  it("keeps MiniMap opt-in for editors and viewers", () => {
    const document = createEmptyDocument({ rootTitle: "MiniMap root" });
    const editor = render(<MindMapEditor value={document} />);
    expect(editor.container.querySelector(".react-flow__minimap")).toBeNull();
    editor.unmount();

    const viewer = render(<MindMapViewer value={document} />);
    expect(viewer.container.querySelector(".react-flow__minimap")).toBeNull();
    viewer.unmount();

    const enabled = render(<MindMapEditor value={document} minimap={{ visible: true }} />);
    expect(enabled.container.querySelector(".react-flow__minimap")).toBeTruthy();
  });

  it("filters hidden search and readonly history controls from explicit toolbars", () => {
    const document = createEmptyDocument({ rootTitle: "Filtered toolbar" });
    render(
      <MindMapViewer
        value={document}
        search={{ hidden: true }}
        toolbar={{ controls: ["search", "undo", "redo", "reset", "fullscreen"] }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Redo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy();
  });

  it("updates toolbar history state and resets to the mount document", async () => {
    const document = createEmptyDocument({ rootTitle: "Initial title" });
    render(<MindMapEditor defaultValue={document} />);

    const undoButton = screen.getByRole<HTMLButtonElement>("button", { name: "Undo" });
    const redoButton = screen.getByRole<HTMLButtonElement>("button", { name: "Redo" });
    const resetButton = screen.getByRole<HTMLButtonElement>("button", { name: "Reset" });
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);
    expect(resetButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Title for Initial title"), {
      target: { value: "Edited title" },
    });
    fireEvent.blur(screen.getByLabelText("Title for Initial title"));

    await waitFor(() => expect(undoButton.disabled).toBe(false));
    expect(resetButton.disabled).toBe(false);

    fireEvent.click(undoButton);
    await waitFor(() => expect(screen.getByLabelText("Title for Initial title")).toBeTruthy());
    expect(redoButton.disabled).toBe(false);

    fireEvent.click(redoButton);
    await waitFor(() => expect(screen.getByLabelText("Title for Edited title")).toBeTruthy());

    fireEvent.click(resetButton);
    await waitFor(() => expect(screen.getByLabelText("Title for Initial title")).toBeTruthy());
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);
    expect(resetButton.disabled).toBe(true);
  });

  it("requests the mount document through onChange when a controlled editor resets", async () => {
    const initialDocument = createEmptyDocument({ rootTitle: "Controlled initial" });
    const onChange = vi.fn();

    function ControlledEditor() {
      const [value, setValue] = useState(initialDocument);
      return (
        <MindMapEditor
          value={value}
          onChange={(nextDocument) => {
            onChange(nextDocument);
            setValue(nextDocument);
          }}
        />
      );
    }

    render(<ControlledEditor />);
    fireEvent.change(screen.getByLabelText("Title for Controlled initial"), {
      target: { value: "Controlled edit" },
    });
    fireEvent.blur(screen.getByLabelText("Title for Controlled initial"));
    await waitFor(() => expect(screen.getByLabelText("Title for Controlled edit")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() => expect(screen.getByLabelText("Title for Controlled initial")).toBeTruthy());
    expect(onChange.mock.lastCall?.[0]).toEqual(initialDocument);
  });

  it("syncs fullscreen toolbar state for button and external exits", async () => {
    const mindMap = createEmptyDocument({ rootTitle: "Fullscreen root" });
    const { container } = render(<MindMapEditor value={mindMap} />);
    const editor = container.querySelector<HTMLElement>(".mmn-editor")!;
    let fullscreenElement: Element | null = null;

    Object.defineProperty(globalThis.document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(editor, "requestFullscreen", {
      configurable: true,
      value: vi.fn(async () => {
        fullscreenElement = editor;
        globalThis.document.dispatchEvent(new Event("fullscreenchange"));
      }),
    });
    Object.defineProperty(globalThis.document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(async () => {
        fullscreenElement = null;
        globalThis.document.dispatchEvent(new Event("fullscreenchange"));
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeTruthy(),
    );

    fullscreenElement = null;
    globalThis.document.dispatchEvent(new Event("fullscreenchange"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy());
  });

  it("uses the Graphite canvas token and cleans up resize observation", () => {
    const instances: ResizeObserverTestDouble[] = [];
    const originalResizeObserver = globalThis.ResizeObserver;
    class ResizeObserverTestDouble {
      observedElements: Element[] = [];
      disconnect = vi.fn();
      unobserve = vi.fn();

      constructor(_callback: ResizeObserverCallback) {
        instances.push(this);
      }

      observe = vi.fn((element: Element) => {
        this.observedElements.push(element);
      });
    }
    globalThis.ResizeObserver =
      ResizeObserverTestDouble as unknown as typeof globalThis.ResizeObserver;

    try {
      const document = createEmptyDocument({ rootTitle: "Graphite root" });
      const graphite = defaultThemes.find((theme) => theme.id === "graphite")!;
      const editor = render(<MindMapEditor value={document} theme={graphite} />);
      const editorElement = editor.container.querySelector<HTMLElement>(".mmn-editor")!;
      const editorObserver = instances.find((instance) =>
        instance.observedElements.includes(editorElement),
      );
      expect(editorElement.style.getPropertyValue("--mmn-canvas")).toBe("#10172a");
      expect(editorObserver).toBeTruthy();

      editor.rerender(<MindMapEditor value={createDocumentWithRootChildren()} theme={graphite} />);
      expect(
        instances.filter((instance) => instance.observedElements.includes(editorElement)),
      ).toHaveLength(1);
      expect(editorObserver!.disconnect).not.toHaveBeenCalled();

      editor.unmount();
      expect(editorObserver!.disconnect).toHaveBeenCalledOnce();

      const instanceCount = instances.length;
      const disabled = render(
        <MindMapEditor value={document} viewport={{ fitViewOnResize: false }} />,
      );
      const disabledEditor = disabled.container.querySelector<HTMLElement>(".mmn-editor")!;
      expect(
        instances
          .slice(instanceCount)
          .some((instance) => instance.observedElements.includes(disabledEditor)),
      ).toBe(false);
      disabled.unmount();
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
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

  it("opens readonly link nodes without bubbling pointer, mouse, or click events", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "Topic 88",
      links: [{ url: "https://example.com", label: "Example" }],
    });
    const onOpenLink = vi.fn();
    const onParentPointerDown = vi.fn();
    const onParentMouseDown = vi.fn();
    const onParentClick = vi.fn();
    const props = {
      id: String(node.id),
      type: "mindNode",
      selected: false,
      data: {
        node,
        readonly: true,
        link: { url: "https://example.com", label: "Example" },
        onOpenLink,
      },
    } as unknown as NodeProps;

    render(
      <div
        onPointerDown={onParentPointerDown}
        onMouseDown={onParentMouseDown}
        onClick={onParentClick}
      >
        <ReactFlowProvider>
          <MindNode {...props} />
        </ReactFlowProvider>
      </div>,
    );

    const linkButton = screen.getByRole("button", {
      name: "Open link Example from Topic 88",
    });
    linkButton.focus();
    expect(document.activeElement).toBe(linkButton);

    fireEvent.pointerDown(linkButton);
    fireEvent.mouseDown(linkButton);
    fireEvent.click(linkButton);

    expect(onOpenLink).toHaveBeenCalledWith("https://example.com", node);
    expect(onParentPointerDown).not.toHaveBeenCalled();
    expect(onParentMouseDown).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("keeps readonly non-link nodes entering node view", () => {
    const node = createNode({ id: asNodeId("first"), title: "First" });
    const onEnterNodeView = vi.fn();

    renderMindNode({ node, readonly: true, onEnterNodeView });

    fireEvent.click(screen.getByRole("button", { name: "First" }));

    expect(onEnterNodeView).toHaveBeenCalledWith(asNodeId("first"));
  });

  it("does not open link data from the editable title textarea", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "First",
      links: [{ url: "https://example.com" }],
    });
    const onOpenLink = vi.fn();

    renderMindNode({
      node,
      link: { url: "https://example.com" },
      onOpenLink,
    });

    fireEvent.click(screen.getByLabelText("Title for First"));

    expect(onOpenLink).not.toHaveBeenCalled();
  });

  it("opens link data from the editable title textarea when clicked with meta/ctrl key", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "First",
      links: [{ url: "https://example.com" }],
    });
    const onOpenLink = vi.fn();

    renderMindNode({
      node,
      link: { url: "https://example.com" },
      onOpenLink,
    });

    const textarea = screen.getByLabelText("Title for First");
    fireEvent.click(textarea, { metaKey: true });

    expect(onOpenLink).toHaveBeenCalledWith("https://example.com", node);
  });

  it("opens link data from the floating link button in editor mode", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "First",
      links: [{ url: "https://example.com" }],
    });
    const onOpenLink = vi.fn();

    renderMindNode({
      node,
      link: { url: "https://example.com" },
      onOpenLink,
    });

    const linkBtn = screen.getByRole("button", {
      name: "Open link https://example.com from First",
    });
    fireEvent.click(linkBtn);

    expect(onOpenLink).toHaveBeenCalledWith("https://example.com", node);
  });

  it("marks only multiline default node titles for left alignment", () => {
    const singleLineNode = createNode({ id: asNodeId("first"), title: "First" });
    renderMindNode({ node: singleLineNode });

    const singleLineTitle = screen.getByLabelText("Title for First");
    expect(singleLineTitle.classList.contains("mmn-node__title--multiline")).toBe(false);

    fireEvent.change(singleLineTitle, { target: { value: "First line\nSecond line" } });
    expect(singleLineTitle.classList.contains("mmn-node__title--multiline")).toBe(true);

    cleanup();
    const readonlyNode = createNode({
      id: asNodeId("readonly"),
      title: "Readonly line one\nReadonly line two",
    });
    renderMindNode({ node: readonlyNode, readonly: true, onEnterNodeView: vi.fn() });

    expect(
      screen
        .getByRole("button", { name: /Readonly line one\s+Readonly line two/ })
        .classList.contains("mmn-node__title--multiline"),
    ).toBe(true);
  });

  it("keeps multiline alignment classes out of custom node renderers", () => {
    const node = createNode({
      id: asNodeId("custom"),
      title: "Custom line one\nCustom line two",
    });
    const renderNode = vi.fn(() => <span>Custom renderer</span>);
    const { container } = renderMindNode({ node, renderNode });

    expect(container.querySelector(".mmn-node__custom")).toBeTruthy();
    expect(container.querySelector(".mmn-node__title--multiline")).toBeNull();
  });

  it("derives link data in flow nodes without wrapping custom renderers", () => {
    const document = createEmptyDocument({ rootTitle: "https://root.example" });
    const childId = asNodeId("child");
    document.nodes[document.rootId]!.children = [childId];
    document.nodes[childId] = createNode({
      id: childId,
      parentId: document.rootId,
      title: "Child",
      links: [{ url: "https://example.com", label: "Example" }],
    });
    const onOpenLink = vi.fn();
    const renderNode = vi.fn(() => <span>Custom</span>);

    const flow = documentToFlow(document, { onOpenLink, renderNode });
    const root = flow.nodes.find((node) => node.id === document.rootId)!;
    const child = flow.nodes.find((node) => node.id === "child")!;

    expect(root.data.link).toEqual({
      url: "https://root.example",
      label: "https://root.example",
    });
    expect(child.data.link).toEqual({
      url: "https://example.com",
      label: "Example",
    });
    expect(child.data.onOpenLink).toBe(onOpenLink);
    expect(child.data.renderNode).toBe(renderNode);
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

  it("shows reset scale control only for selected nodes with quick controls enabled", () => {
    const node = createNode({
      id: asNodeId("first"),
      title: "First",
      style: { scale: 1.4 },
    });
    const onResizeCommit = vi.fn();

    renderMindNode({ node, onResizeCommit }, false);
    expect(screen.queryByRole("button", { name: "Reset scale of First to default" })).toBeNull();

    cleanup();
    renderMindNode({ node, onResizeCommit, showNodeResizeControls: false }, true);
    expect(screen.queryByRole("button", { name: "Reset scale of First to default" })).toBeNull();

    cleanup();
    renderMindNode({ node, onResizeCommit }, true);
    fireEvent.click(screen.getByRole("button", { name: "Reset scale of First to default" }));

    expect(onResizeCommit).toHaveBeenCalledWith(asNodeId("first"), 1);
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

  it("does not relayout node positions when editing a title", () => {
    const document = createEmptyDocument({ rootTitle: "Root" });
    document.nodes[document.rootId]!.position = { x: 42, y: -18 };
    const onChange = vi.fn();
    render(<MindMapEditor value={document} onChange={onChange} />);

    const title = screen.getByLabelText("Title for Root");
    fireEvent.change(title, {
      target: { value: "Root with a much longer title\nthat should not resize the canvas" },
    });
    fireEvent.blur(title);

    const nextDocument = onChange.mock.calls.at(-1)?.[0] as MindMapDocument;
    expect(nextDocument.nodes[nextDocument.rootId]!.position).toEqual({ x: 42, y: -18 });
  });

  it("handles continuous 1:1 dragging and commits the scale value on release", () => {
    const node = createNode({ id: asNodeId("first"), title: "First" });
    const onResizeProgress = vi.fn();
    const onResizeCommit = vi.fn();

    renderMindNode(
      {
        node,
        onResizeProgress,
        onResizeCommit,
        nodeMinScale: 0.5,
        nodeMaxScale: 2.0,
        nodeResizeStep: 0.1,
      },
      true,
    );

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

    renderMindNode(
      {
        node,
        onResizeProgress,
        onResizeCommit,
        nodeMinScale: 0.5,
        nodeMaxScale: 2.0,
        nodeResizeStep: 0.15,
      },
      true,
    );

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

  it("correctly identifies no-op moves and suppresses getDropIntentLabel", () => {
    const document = createDocumentWithRootChildren();
    // document.rootId has children: ["first", "second"]

    // Moving "first" before "second" is a no-op (result would still be ["first", "second"])
    expect(isMoveNoOp(document, [asNodeId("first")], document.rootId, 0)).toBe(true);

    // Moving "second" before "first" is NOT a no-op (result would be ["second", "first"])
    expect(isMoveNoOp(document, [asNodeId("second")], document.rootId, 0)).toBe(false);

    // Reparenting "second" under its current parent at the end of children list is a no-op
    // because it's already the last child.
    expect(isMoveNoOp(document, [asNodeId("second")], document.rootId, undefined)).toBe(true);

    // Reparenting "first" under its current parent at the end of children list is NOT a no-op
    // because it moves "first" from index 0 to index 1.
    expect(isMoveNoOp(document, [asNodeId("first")], document.rootId, undefined)).toBe(false);

    // Check that drop label is undefined when noOp is true
    expect(
      getDropIntentLabel({ type: "sort-before", targetId: asNodeId("second"), noOp: true }),
    ).toBeUndefined();
    expect(
      getDropIntentLabel({ type: "reparent", targetId: asNodeId("root"), noOp: true }),
    ).toBeUndefined();
  });

  it("shows branch list toggle button only when eligible", () => {
    // 1. Shallow document: depth < 3
    const doc2 = createEmptyDocument();
    const rootId = doc2.rootId;
    const nodeA = createNode({ id: asNodeId("node-a"), parentId: rootId });
    doc2.nodes[rootId]!.children.push(nodeA.id);
    doc2.nodes[nodeA.id] = nodeA;

    const { container: container1, unmount: unmount1 } = render(<MindMapEditor value={doc2} />);
    expect(container1.querySelector(".mmn-branch-toggle-btn")).toBeNull();
    unmount1();

    // 2. Deep document: depth >= 3
    const nodeB = createNode({ id: asNodeId("node-b"), parentId: nodeA.id });
    doc2.nodes[nodeA.id]!.children.push(nodeB.id);
    doc2.nodes[nodeB.id] = nodeB;

    const { container: container2, unmount: unmount2 } = render(<MindMapEditor value={doc2} />);
    expect(container2.querySelector(".mmn-branch-toggle-btn")).toBeTruthy();
    unmount2();

    // 3. Deep document with hidden: true in branchListLayout
    const { container: container3, unmount: unmount3 } = render(
      <MindMapEditor value={doc2} branchListLayout={{ hidden: true }} />,
    );
    expect(container3.querySelector(".mmn-branch-toggle-btn")).toBeNull();
    unmount3();
  });

  it("enters split layout and switches branch without triggering onChange", async () => {
    const doc = createDeepBranchListDocument();
    const onChange = vi.fn();
    const { container } = render(
      <MindMapEditor value={doc} onChange={onChange} branchListLayout={{ defaultOpen: true }} />,
    );

    // Click toggle button to exit split layout, then click it again to enter it
    const toggleBtn = container.querySelector(".mmn-branch-toggle-btn");
    expect(toggleBtn).toBeTruthy();
    fireEvent.click(toggleBtn!); // Exit split layout
    expect(container.querySelector(".mmn-branch-layout")).toBeNull();
    fireEvent.click(toggleBtn!); // Enter split layout again

    // Should render split shell and side panel
    expect(container.querySelector(".mmn-branch-layout")).toBeTruthy();
    expect(container.querySelector(".mmn-branch-list-panel")).toBeTruthy();

    // By default first level-1 child is selected (Branch A)
    const listItems = container.querySelectorAll(".mmn-branch-list-item");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]?.getAttribute("aria-current")).toBe("page");

    // Click Branch B in list to switch
    fireEvent.click(listItems[1]!);
    expect(listItems[1]?.getAttribute("aria-current")).toBe("page");

    // Confirm that onChange was never called for this layout navigation
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens default split layout on the first branch subtree", async () => {
    const doc = createDeepBranchListDocument();
    const { container } = render(
      <MindMapEditor value={doc} branchListLayout={{ defaultOpen: true }} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".mmn-branch-layout")).toBeTruthy();
      expect(
        container.querySelectorAll(".mmn-branch-list-item")[0]?.getAttribute("aria-current"),
      ).toBe("page");
      expect(screen.getByLabelText("Title for Branch A")).toBeTruthy();
      expect(screen.getByLabelText("Title for Leaf A")).toBeTruthy();
      expect(screen.queryByLabelText("Title for Branch B")).toBeNull();
    });
  });

  it("temporarily previews a collapsed branch list and pins it from the overlay", () => {
    const doc = createDeepBranchListDocument();
    const { container } = render(<MindMapEditor value={doc} />);

    fireEvent.click(container.querySelector(".mmn-branch-toggle-btn")!);
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByLabelText("Root branches")).toBeNull();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Show branch list" }));
    const previewPanel = screen.getByLabelText("Root branches");
    expect(previewPanel).toBeTruthy();
    fireEvent.mouseLeave(previewPanel);
    expect(screen.queryByLabelText("Root branches")).toBeNull();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Show branch list" }));
    fireEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));
    expect(screen.getByLabelText("Root branches")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show branch list" })).toBeNull();

    fireEvent.mouseLeave(screen.getByLabelText("Root branches"));
    expect(screen.getByLabelText("Root branches")).toBeTruthy();
  });

  it("supports split layout in readonly viewer", () => {
    const doc = createDeepBranchListDocument();
    const { container } = render(<MindMapViewer value={doc} />);
    const toggleBtn = container.querySelector(".mmn-branch-toggle-btn");
    expect(toggleBtn).toBeTruthy();

    fireEvent.click(toggleBtn!);
    expect(container.querySelector(".mmn-branch-layout")).toBeTruthy();
    expect(container.querySelector(".mmn-branch-list-panel")).toBeTruthy();
  });

  it("supports copying data from the toolbar copy dropdown", async () => {
    const doc = createDeepBranchListDocument();
    const onCopyData = vi.fn().mockImplementation(({ format }) => {
      if (format === "json") return "mock-json";
      return "mock-format";
    });
    const onCopySuccess = vi.fn();
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => {},
        },
        writable: true,
        configurable: true,
      });
    }
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    const { container } = render(
      <MindMapEditor value={doc} onCopyData={onCopyData} onCopySuccess={onCopySuccess} />,
    );

    const copyContainer = container.querySelector(".mmn-toolbar__copy-container");
    expect(copyContainer).toBeTruthy();

    const mainBtn = copyContainer!.querySelector("button");
    expect(mainBtn).toBeTruthy();

    fireEvent.mouseEnter(copyContainer!);
    const dropdown = copyContainer!.querySelector(".mmn-toolbar__copy-menu");
    expect(dropdown).toBeTruthy();

    const formatButtons = dropdown!.querySelectorAll("button");
    expect(formatButtons).toHaveLength(3);
    expect(formatButtons[2]!.textContent).toBe("MERMAID");

    fireEvent.click(formatButtons[2]!);
    await waitFor(() => {
      expect(onCopyData).toHaveBeenCalledWith({ format: "mermaid", document: doc });
      expect(writeTextSpy).toHaveBeenCalledWith("mock-format");
      expect(onCopySuccess).toHaveBeenCalledWith("mermaid");
      expect(screen.getByRole("status").textContent).toBe("Copied MERMAID");
    });
    writeTextSpy.mockRestore();
  });

  it("keeps the toolbar copy dropdown open while moving from the trigger to the menu", () => {
    vi.useFakeTimers();
    try {
      const doc = createDeepBranchListDocument();
      const { container } = render(<MindMapEditor value={doc} />);

      const copyContainer = container.querySelector(".mmn-toolbar__copy-container");
      expect(copyContainer).toBeTruthy();

      fireEvent.mouseEnter(copyContainer!);
      expect(copyContainer!.querySelector(".mmn-toolbar__copy-menu")).toBeTruthy();

      fireEvent.mouseLeave(copyContainer!);
      expect(copyContainer!.querySelector(".mmn-toolbar__copy-menu")).toBeTruthy();

      fireEvent.mouseEnter(copyContainer!);
      act(() => vi.advanceTimersByTime(200));
      expect(copyContainer!.querySelector(".mmn-toolbar__copy-menu")).toBeTruthy();

      fireEvent.mouseLeave(copyContainer!);
      act(() => vi.advanceTimersByTime(200));
      expect(copyContainer!.querySelector(".mmn-toolbar__copy-menu")).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the branch tree with single-count parents collapsed by default", () => {
    const doc = createDeepBranchListDocument();
    const { container } = render(<MindMapEditor value={doc} />);

    fireEvent.click(container.querySelector(".mmn-branch-toggle-btn")!);

    expect(container.querySelector(".mmn-branch-list-panel")).toBeTruthy();
    expect(container.querySelectorAll(".mmn-branch-list-item")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Expand all branches" })).toBeTruthy();
  });

  it("cycles branch tree expansion through default, expanded, compact, and collapsed states", () => {
    const doc = createBranchExpansionCycleDocument();
    const { container } = render(
      <MindMapEditor value={doc} branchListLayout={{ defaultOpen: true }} />,
    );

    const getItems = () => container.querySelectorAll(".mmn-branch-list-item");
    const getCountLabels = () => {
      return Array.from(container.querySelectorAll(".mmn-branch-list-item__count")).map(
        (element) => element.textContent,
      );
    };

    expect(getItems()).toHaveLength(2);
    expect(getCountLabels()).toEqual(["3", "2"]);

    fireEvent.click(screen.getByRole("button", { name: "Expand all branches" }));
    expect(getItems()).toHaveLength(3);
    expect(getCountLabels()).toEqual(["3", "2"]);

    fireEvent.click(screen.getByRole("button", { name: "Collapse single-count branches" }));
    expect(getItems()).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all branches" }));
    expect(getItems()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Restore default branch expansion" }));
    expect(getItems()).toHaveLength(2);
  });

  it("keeps expanded branch tree state synced when the document changes", () => {
    const getBranchTitles = (container: HTMLElement) => {
      return Array.from(container.querySelectorAll(".mmn-branch-list-item__title")).map(
        (element) => element.textContent,
      );
    };

    const { container, rerender } = render(
      <MindMapEditor
        value={createBranchExpansionCycleDocument()}
        branchListLayout={{ defaultOpen: true }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand all branches" }));
    expect(getBranchTitles(container)).toEqual(["Branch A", "Parent A", "Leaf A"]);

    rerender(
      <MindMapEditor
        value={createTwoBranchExpansionCycleDocument()}
        branchListLayout={{ defaultOpen: true }}
      />,
    );

    expect(getBranchTitles(container)).toEqual([
      "Branch A",
      "Parent A",
      "Leaf A",
      "Branch B",
      "Parent B",
      "Leaf B",
    ]);
    expect(screen.getByRole("button", { name: "Collapse single-count branches" })).toBeTruthy();
  });

  it("skips the compact branch tree expansion step when no parent has only single-count children", () => {
    const doc = createNoSingleCountCollapseDocument();
    const { container } = render(
      <MindMapEditor value={doc} branchListLayout={{ defaultOpen: true }} />,
    );

    expect(container.querySelectorAll(".mmn-branch-list-item")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Expand all branches" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all branches" }));
    expect(container.querySelectorAll(".mmn-branch-list-item")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Restore default branch expansion" }));
    expect(container.querySelectorAll(".mmn-branch-list-item")).toHaveLength(3);
  });

  it("supports tree folding in the branch sidebar", () => {
    const doc = createDeepBranchListDocument();
    const { container } = render(
      <MindMapEditor value={doc} branchListLayout={{ defaultOpen: true }} />,
    );

    expect(container.querySelector(".mmn-branch-list-panel")).toBeTruthy();

    let listItems = container.querySelectorAll(".mmn-branch-list-item");
    expect(listItems).toHaveLength(2);

    const toggleBtn = container.querySelector(".mmn-branch-list-item__toggle");
    expect(toggleBtn).toBeTruthy();

    fireEvent.click(toggleBtn!);

    listItems = container.querySelectorAll(".mmn-branch-list-item");
    expect(listItems).toHaveLength(3); // Leaf A is visible under Branch A

    fireEvent.keyDown(listItems[0]!, { key: "ArrowLeft" });
    expect(container.querySelectorAll(".mmn-branch-list-item")).toHaveLength(2);
  });
});
