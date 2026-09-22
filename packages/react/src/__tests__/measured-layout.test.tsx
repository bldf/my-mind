import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { asNodeId, createEmptyDocument, createNode, type MindMapDocument } from "@my-mind-node/core";
import type { Node, NodeChange } from "@xyflow/react";
import { MindMapViewer } from "../MindMapViewer";
import { defaultThemes } from "../themes";
import { applyCollapsedOverrides, collectMeasuredNodeSizes, hasAllNodeSizes } from "../measured-layout";

const TALL_NODE_HEIGHT = 320;
const DEFAULT_NODE_SIZE = { width: 120, height: 40 };

function createBranchDocument(): MindMapDocument {
  const document = createEmptyDocument({ rootTitle: "Root" });
  const rootId = document.rootId;
  const parentId = asNodeId("parent");
  const tallId = asNodeId("tall");
  const nextId = asNodeId("next");
  document.id = "measured-doc" as MindMapDocument["id"];
  document.nodes[rootId]!.children = [parentId];
  document.nodes[parentId] = createNode({ id: parentId, parentId: rootId, title: "Parent", children: [tallId, nextId] });
  document.nodes[tallId] = createNode({ id: tallId, parentId, title: "Tall" });
  document.nodes[nextId] = createNode({ id: nextId, parentId, title: "Next" });
  return document;
}

function getNodeTranslateY(container: HTMLElement, nodeId: string): number {
  const element = container.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`);
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(element?.style.transform ?? "");
  if (!match) throw new Error(`node ${nodeId} has no transform`);
  return Number(match[2]);
}

describe("measured layout helpers", () => {
  it("collects dimension changes and keeps the same map when sizes are stable", () => {
    const changes: Array<NodeChange<Node>> = [
      { id: "a", type: "dimensions", dimensions: { width: 100, height: 50 } },
      { id: "b", type: "select", selected: true },
    ];
    const first = collectMeasuredNodeSizes(changes, {});
    expect(first).toEqual({ a: { width: 100, height: 50 } });

    const jitter: Array<NodeChange<Node>> = [{ id: "a", type: "dimensions", dimensions: { width: 100.2, height: 50.3 } }];
    expect(collectMeasuredNodeSizes(jitter, first)).toBe(first);
  });

  it("ignores empty dimensions", () => {
    const changes: Array<NodeChange<Node>> = [{ id: "a", type: "dimensions", dimensions: { width: 0, height: 0 } }];
    const current = {};
    expect(collectMeasuredNodeSizes(changes, current)).toBe(current);
  });

  it("checks every node has a size", () => {
    expect(hasAllNodeSizes(["a", "b"], { a: DEFAULT_NODE_SIZE })).toBe(false);
    expect(hasAllNodeSizes(["a"], { a: DEFAULT_NODE_SIZE })).toBe(true);
  });

  it("applies collapsed overrides without mutating the source document", () => {
    const document = createBranchDocument();
    expect(applyCollapsedOverrides(document, {})).toBe(document);

    const collapsed = applyCollapsedOverrides(document, { parent: { collapsed: true } });
    expect(collapsed.nodes[asNodeId("parent")]!.collapsed).toBe(true);
    expect(document.nodes[asNodeId("parent")]!.collapsed).toBe(false);
  });
});

describe("MindMapViewer layout.measured", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

  const getMockSize = (element: HTMLElement) => {
    if (!element.classList.contains("react-flow__node")) return { width: 0, height: 0 };
    return element.dataset.id === "tall" ? { width: 200, height: TALL_NODE_HEIGHT } : DEFAULT_NODE_SIZE;
  };

  beforeEach(() => {
    if (typeof window.DOMMatrixReadOnly !== "function") {
      // React Flow 通过 transform 矩阵读取缩放值；jsdom 未实现
      class IdentityDOMMatrix {
        m22 = 1;
      }
      Object.defineProperty(window, "DOMMatrixReadOnly", { configurable: true, value: IdentityDOMMatrix });
    }
    class MeasuringResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        queueMicrotask(() =>
          this.callback(
            [{ target, contentRect: { width: 800, height: 600 } } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          ),
        );
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = MeasuringResizeObserver as unknown as typeof ResizeObserver;
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return getMockSize(this).width;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get(this: HTMLElement) {
        return getMockSize(this).height;
      },
    });
  });

  afterEach(() => {
    cleanup();
    globalThis.ResizeObserver = originalResizeObserver;
    if (originalOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
  });

  it("hides the canvas until measured, then stacks siblings by real height", async () => {
    const { container } = render(
      <MindMapViewer value={createBranchDocument()} layout={{ measured: true }} viewport={{ fitViewOnInit: true }} />,
    );
    const editor = container.querySelector(".mmn-editor")!;
    expect(editor.classList.contains("mmn-editor--measuring")).toBe(true);

    await waitFor(() => expect(editor.classList.contains("mmn-editor--measuring")).toBe(false));
    await waitFor(() =>
      expect(getNodeTranslateY(container, "next")).toBeGreaterThanOrEqual(
        getNodeTranslateY(container, "tall") + TALL_NODE_HEIGHT,
      ),
    );
  });

  it("keeps the estimated layout when measured mode is off", async () => {
    const { container } = render(<MindMapViewer value={createBranchDocument()} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector(".mmn-editor--measuring")).toBeNull();
  });
});

describe("MindMapViewer readonlyCollapsible", () => {
  afterEach(() => cleanup());

  it("collapses and expands branches without editing the document", async () => {
    const document = createBranchDocument();
    render(<MindMapViewer value={document} readonlyCollapsible />);

    fireEvent.click(await screen.findByLabelText("Collapse node Parent"));
    await waitFor(() => expect(screen.queryByText("Tall")).toBeNull());
    expect(document.nodes[asNodeId("parent")]!.collapsed).toBe(false);

    fireEvent.click(screen.getByLabelText("Expand Parent, 2 hidden nodes"));
    expect(await screen.findByText("Tall")).toBeTruthy();
  });

  it("does not show collapse controls in plain readonly mode", async () => {
    render(<MindMapViewer value={createBranchDocument()} />);
    await screen.findByText("Parent");
    expect(screen.queryByLabelText("Collapse node Parent")).toBeNull();
  });
});

describe("MindMapViewer theme prop", () => {
  afterEach(() => cleanup());

  it("follows theme prop changes after mount", () => {
    const document = createBranchDocument();
    const [lightTheme, darkTheme] = defaultThemes;
    const { container, rerender } = render(<MindMapViewer value={document} theme={lightTheme} />);
    const editor = container.querySelector(".mmn-editor")!;
    expect(editor.getAttribute("data-theme-mode")).toBe(lightTheme!.mode ?? "light");

    rerender(<MindMapViewer value={document} theme={darkTheme} />);
    expect(editor.getAttribute("data-theme-mode")).toBe("dark");

    rerender(<MindMapViewer value={document} theme={lightTheme} />);
    expect(editor.getAttribute("data-theme-mode")).toBe(lightTheme!.mode ?? "light");
  });
});
