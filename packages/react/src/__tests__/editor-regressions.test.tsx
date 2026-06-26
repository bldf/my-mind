import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asNodeId, createEmptyDocument, createNode, type MindMapDocument } from "@my-mind-node/core";
import { MindMapEditor } from "../MindMapEditor";

type FakeFlowNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  selected?: boolean;
  data?: {
    node?: { title?: string };
  };
};

const fakeFlowState = vi.hoisted(() => {
  const state = {
    latestNodes: [] as FakeFlowNode[],
    props: undefined as
      | {
          onNodeDragStart?: (event: MouseEvent, node: FakeFlowNode) => void;
          onNodeDrag?: (event: MouseEvent, node: FakeFlowNode) => void;
          onNodeDragStop?: (event: MouseEvent, node: FakeFlowNode) => void;
        }
      | undefined,
    viewport: { x: 0, y: 0, zoom: 1 },
    setViewport: vi.fn((nextViewport: { x: number; y: number; zoom: number }) => {
      state.viewport = nextViewport;
      return Promise.resolve();
    }),
    fitView: vi.fn(() => Promise.resolve()),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    reset() {
      state.latestNodes = [];
      state.props = undefined;
      state.viewport = { x: 0, y: 0, zoom: 1 };
      state.setViewport.mockClear();
      state.fitView.mockClear();
      state.zoomIn.mockClear();
      state.zoomOut.mockClear();
    },
  };
  return state;
});

vi.mock("@xyflow/react", async () => {
  const React = await import("react");

  const setRect = (element: HTMLElement | null, rect: DOMRectInit) => {
    if (!element) return;
    element.getBoundingClientRect = () =>
      ({
        left: rect.x ?? 0,
        top: rect.y ?? 0,
        right: (rect.x ?? 0) + (rect.width ?? 0),
        bottom: (rect.y ?? 0) + (rect.height ?? 0),
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        x: rect.x ?? 0,
        y: rect.y ?? 0,
        toJSON: () => undefined,
      }) as DOMRect;
  };

  const getNodeRect = (node: FakeFlowNode): DOMRectInit => ({
    x: node.position.x,
    y: node.position.y,
    width: 100,
    height: 50,
  });

  const getNodesBounds = (nodes: FakeFlowNode[]) => {
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const rects = nodes.map(getNodeRect);
    const minX = Math.min(...rects.map((rect) => rect.x ?? 0));
    const minY = Math.min(...rects.map((rect) => rect.y ?? 0));
    const maxX = Math.max(...rects.map((rect) => (rect.x ?? 0) + (rect.width ?? 0)));
    const maxY = Math.max(...rects.map((rect) => (rect.y ?? 0) + (rect.height ?? 0)));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  return {
    applyNodeChanges: (_changes: unknown[], nodes: FakeFlowNode[]) => nodes,
    Handle: () => React.createElement("span", { className: "react-flow__handle" }),
    MiniMap: () => React.createElement("div", { className: "react-flow__minimap" }),
    Position: {
      Bottom: "bottom",
      Left: "left",
      Right: "right",
      Top: "top",
    },
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    ReactFlow: ({
      children,
      nodeTypes,
      nodes,
      onNodeDrag,
      onNodeDragStart,
      onNodeDragStop,
    }: {
      children?: React.ReactNode;
      nodeTypes?: Record<string, React.ComponentType<Record<string, unknown>>>;
      nodes: FakeFlowNode[];
      onNodeDrag?: (event: MouseEvent, node: FakeFlowNode) => void;
      onNodeDragStart?: (event: MouseEvent, node: FakeFlowNode) => void;
      onNodeDragStop?: (event: MouseEvent, node: FakeFlowNode) => void;
    }) => {
      fakeFlowState.latestNodes = nodes;
      fakeFlowState.props = { onNodeDrag, onNodeDragStart, onNodeDragStop };

      return React.createElement(
        "div",
        {
          className: "react-flow",
          ref: (element: HTMLElement | null) =>
            setRect(element, { x: 0, y: 0, width: 800, height: 600 }),
        },
        nodes.map((node) => {
          const NodeComponent = nodeTypes?.[node.type ?? ""];
          return React.createElement(
            "div",
            {
              className: "react-flow__node",
              "data-id": node.id,
              "data-testid": `flow-node-${node.id}`,
              key: node.id,
              ref: (element: HTMLElement | null) => setRect(element, getNodeRect(node)),
            },
            NodeComponent
              ? React.createElement(NodeComponent, {
                  data: node.data,
                  id: node.id,
                  selected: Boolean(node.selected),
                  type: node.type,
                })
              : (node.data?.node?.title ?? node.id),
          );
        }),
        children,
      );
    },
    useNodesInitialized: () => true,
    useReactFlow: () => ({
      fitView: fakeFlowState.fitView,
      getNodes: () => fakeFlowState.latestNodes,
      getNodesBounds,
      getViewport: () => fakeFlowState.viewport,
      setViewport: fakeFlowState.setViewport,
      zoomIn: fakeFlowState.zoomIn,
      zoomOut: fakeFlowState.zoomOut,
    }),
  };
});

function createPositionedDocument(): MindMapDocument {
  const document = createEmptyDocument({ rootTitle: "Root" });
  const root = document.nodes[document.rootId]!;
  const first = createNode({
    id: asNodeId("first"),
    parentId: document.rootId,
    position: { x: 1000, y: 0 },
    title: "First",
  });
  const second = createNode({
    id: asNodeId("second"),
    parentId: document.rootId,
    position: { x: 2000, y: 0 },
    title: "Second",
  });

  root.children = [first.id, second.id];
  root.position = { x: 0, y: 0 };
  document.nodes[first.id] = first;
  document.nodes[second.id] = second;
  return document;
}

function getFlowNode(id: string): FakeFlowNode {
  const node = fakeFlowState.latestNodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Missing flow node ${id}`);
  return node;
}

beforeEach(() => {
  fakeFlowState.reset();
  vi.stubGlobal("CSS", { escape: (value: string) => value });
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MindMapEditor regression coverage", () => {
  it("rolls an invalid drag back to canonical flow positions", async () => {
    render(<MindMapEditor value={createPositionedDocument()} viewport={{ fitViewOnInit: false }} />);
    await waitFor(() => expect(getFlowNode("first").position).toEqual({ x: 1000, y: 0 }));

    const startNode = getFlowNode("first");
    const draggedNode = { ...startNode, position: { x: 1120, y: 90 } };

    act(() => {
      fakeFlowState.props?.onNodeDragStart?.(
        new MouseEvent("mousedown", { clientX: 1000, clientY: 0 }),
        startNode,
      );
    });
    act(() => {
      fakeFlowState.props?.onNodeDrag?.(
        new MouseEvent("mousemove", { clientX: 5000, clientY: 5000 }),
        draggedNode,
      );
    });

    await waitFor(() => expect(getFlowNode("first").position).toEqual({ x: 1120, y: 90 }));

    act(() => {
      fakeFlowState.props?.onNodeDragStop?.(
        new MouseEvent("mouseup", { clientX: 5000, clientY: 5000 }),
        getFlowNode("first"),
      );
    });

    await waitFor(() => expect(getFlowNode("first").position).toEqual({ x: 1000, y: 0 }));
  });

  it("keeps deferred one-to-one viewport updates centered on visible nodes", async () => {
    render(<MindMapEditor value={createPositionedDocument()} viewport={{ fitViewOnInit: false }} />);
    const rootTitle = await screen.findByLabelText("Title for Root");
    fakeFlowState.setViewport.mockClear();

    rootTitle.focus();
    expect(document.activeElement).toBe(rootTitle);
    fireEvent.click(screen.getByRole("button", { name: "Fit view" }));
    expect(fakeFlowState.setViewport).not.toHaveBeenCalled();

    act(() => {
      rootTitle.blur();
    });

    await waitFor(() => expect(fakeFlowState.setViewport).toHaveBeenCalled());
    expect(fakeFlowState.setViewport).toHaveBeenLastCalledWith({ x: -650, y: 275, zoom: 1 });
  });
});
