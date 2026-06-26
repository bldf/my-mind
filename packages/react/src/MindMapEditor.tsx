import "@xyflow/react/dist/style.css";
import "./styles.css";

import {
  applyOperation,
  applyLayoutResult,
  asNodeId,
  cloneDocument,
  createEmptyDocument,
  dispatchCommand,
  getAncestorIds,
  getVisibleNodeIds,
  simpleTreeLayout,
  type MindMapDocument,
  type MindMapError,
  type MindMapNode,
  type MindMapOperation,
  type MindMapTheme,
  type NodeId,
  type SelectionState,
} from "@my-mind-node/core";
import {
  applyNodeChanges,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  type Node,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  EMPTY_DROP_INTENT,
  getDropGeometry,
  getDropValidationReason,
  getSortInsertionIndex,
  getTopLevelMovableNodeIds,
  isMoveNoOp,
  type DropRect,
  type DropIntent,
} from "./drag-interactions";
import { documentToFlow, type FlowConversionResult } from "./document-to-flow";
import { BezierEdge } from "./edges/BezierEdge";
import { isSafeExternalUrl, openSafeExternalUrl } from "./link-utils";
import { MindNode, type MindNodeData } from "./nodes/MindNode";
import { resolveTheme, defaultThemes } from "./themes";
import type { MindMapEditorProps, ViewToolbarControl } from "./types";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { InspectorPanel } from "./components/InspectorPanel";
import { SearchPanel } from "./components/SearchPanel";
import { ThemePanel } from "./components/ThemePanel";
import { BranchListPanel } from "./components/BranchListPanel";
import { BranchListToggleButton } from "./components/BranchListToggleButton";
import { Toolbar } from "./components/Toolbar";
import { getTreeMaxDepth, getRootBranchIdForNode } from "./layout-helpers";
import { PanelLeftOpen } from "lucide-react";

const nodeTypes = { mindNode: MindNode };
const edgeTypes = { mindBezier: BezierEdge };
const DEFAULT_EDITABLE_TOOLBAR: ViewToolbarControl[] = [
  "theme",
  "undo",
  "redo",
  "reset",
  "search",
  "inspector",
  "fullscreen",
  "zoomOut",
  "zoomIn",
  "fitView",
];
const DEFAULT_READONLY_TOOLBAR: ViewToolbarControl[] = [
  "theme",
  "search",
  "fullscreen",
  "zoomOut",
  "zoomIn",
  "fitView",
];
const DROP_OVERLAP_RATIO = 0.3;
const CANVAS_MIN_ZOOM = 0.08;
const CANVAS_MAX_ZOOM = 2;
const DEFAULT_WHEEL_ZOOM_SENSITIVITY = 0.001;
const DEFAULT_WHEEL_ZOOM_MAX_STEP = 0.18;
const DEFAULT_WHEEL_PAN_SENSITIVITY = 1;
const DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES = 6;
const EDIT_HISTORY_CONTROLS = new Set<ViewToolbarControl>(["undo", "redo", "reset"]);
const WHEEL_IGNORE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  ".mmn-toolbar",
  ".mmn-theme-panel",
  ".mmn-search-panel",
  ".mmn-inspector",
  ".mmn-breadcrumbs",
  ".mmn-node__resize-handle",
  ".mmn-node__link-btn",
].join(",");

interface HistoryState {
  past: MindMapOperation[];
  future: MindMapOperation[];
}

interface HistoryAvailability {
  canUndo: boolean;
  canRedo: boolean;
}

type MindFlowNode = Node<MindNodeData, "mindNode">;

interface DragInteractionSettings {
  enabled: boolean;
  sortZoneRatio: number;
  flashDurationMs: number;
  autoLayoutOnDrop: boolean;
  showAddChildControl: boolean;
  showCollapseControl: boolean;
}

interface DragSession {
  commitNodeIds: NodeId[];
  visualNodeIds: NodeId[];
  startPositions: Record<string, { x: number; y: number }>;
}

type ViewportUpdateAction = "fit" | "fit1to1" | "center";

interface ViewportUpdateOptions {
  waitForNodeId?: NodeId;
  maxWaitFrames?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWheelDelta(value: number, deltaMode: number): number {
  if (deltaMode === 1) return value * 16;
  if (deltaMode === 2) return value * 160;
  return value;
}

function isPinchLikeWheel(event: WheelEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

function isScrollableWheelTarget(target: Element, boundary: HTMLElement): boolean {
  let element: Element | null = target;
  while (element && element !== boundary) {
    if (element instanceof HTMLElement) {
      const style = element.ownerDocument.defaultView?.getComputedStyle(element);
      const overflowX = style?.overflowX ?? "";
      const overflowY = style?.overflowY ?? "";
      const canScrollX =
        element.scrollWidth > element.clientWidth && /auto|scroll|overlay/.test(overflowX);
      const canScrollY =
        element.scrollHeight > element.clientHeight && /auto|scroll|overlay/.test(overflowY);
      if (canScrollX || canScrollY) return true;
    }
    element = element.parentElement;
  }
  return false;
}

function shouldIgnoreViewportWheel(event: WheelEvent, boundary: HTMLElement): boolean {
  if (!(event.target instanceof Element)) return false;
  if (event.target.closest(".mmn-node__title") !== null) {
    return isScrollableWheelTarget(event.target, boundary);
  }
  return (
    event.target.closest(WHEEL_IGNORE_SELECTOR) !== null ||
    isScrollableWheelTarget(event.target, boundary)
  );
}

function documentsEqual(first: MindMapDocument, second: MindMapDocument): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function normalizeToolbarControls(
  controls: ViewToolbarControl[],
  options: { readonly: boolean; searchHidden: boolean },
): ViewToolbarControl[] {
  return controls.filter((control) => {
    if (control === "search" && options.searchHidden) return false;
    if (options.readonly && EDIT_HISTORY_CONTROLS.has(control)) return false;
    return true;
  });
}

export function isTextInputActive(container: HTMLElement): boolean {
  const activeElement = container.ownerDocument.activeElement;
  if (!activeElement || !container.contains(activeElement)) return false;
  return (
    activeElement.matches(
      "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
    ) || activeElement.closest(".mmn-node__resize-handle") !== null
  );
}

function getVisibleSubtreeNodeIds(
  document: MindMapDocument,
  rootIds: NodeId[],
  viewRootId: NodeId,
): NodeId[] {
  const visibleSet = new Set(getVisibleNodeIds(document, viewRootId));
  const result: NodeId[] = [];
  const seen = new Set<NodeId>();

  const visit = (nodeId: NodeId) => {
    if (seen.has(nodeId) || !visibleSet.has(nodeId)) return;
    const node = document.nodes[nodeId];
    if (!node) return;
    seen.add(nodeId);
    result.push(nodeId);
    if (node.collapsed) return;
    for (const childId of node.children) visit(childId);
  };

  for (const rootId of rootIds) visit(rootId);
  return result;
}

function getFlowNodeStartPositions(
  nodes: MindFlowNode[],
  nodeIds: NodeId[],
): Record<string, { x: number; y: number }> {
  const nodeIdSet = new Set(nodeIds.map(String));
  return Object.fromEntries(
    nodes.filter((node) => nodeIdSet.has(node.id)).map((node) => [node.id, { ...node.position }]),
  );
}

function resolveDragInteractionSettings(
  config: MindMapEditorProps["dragInteraction"],
): DragInteractionSettings {
  return {
    enabled: config?.enabled ?? true,
    sortZoneRatio: config?.sortZoneRatio ?? 0.3,
    flashDurationMs: config?.flashDurationMs ?? 320,
    autoLayoutOnDrop: config?.autoLayoutOnDrop ?? true,
    showAddChildControl: config?.showAddChildControl ?? true,
    showCollapseControl: config?.showCollapseControl ?? true,
  };
}

function getEventClientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } | undefined {
  if ("clientX" in event) return { x: event.clientX, y: event.clientY };
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : undefined;
}

function getNodeElement(container: HTMLElement, nodeId: string): HTMLElement | null {
  const escape =
    "CSS" in globalThis && typeof CSS.escape === "function"
      ? CSS.escape(nodeId)
      : nodeId.replace(/"/g, '\\"');
  return container.querySelector<HTMLElement>(`.react-flow__node[data-id="${escape}"]`);
}

function toDropRect(rect: DOMRect): DropRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function getSyntheticMovingRect(point: { x: number; y: number }): DropRect {
  return {
    left: point.x - 1,
    top: point.y - 1,
    right: point.x + 1,
    bottom: point.y + 1,
    width: 2,
    height: 2,
  };
}

function getUnionRect(rects: DropRect[]): DropRect | undefined {
  if (rects.length === 0) return undefined;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function placeMeasuredRectAtPoint(
  point: { x: number; y: number },
  measuredRect: DropRect,
): DropRect {
  const centerX = point.x;
  const centerY = point.y;
  const left = centerX - measuredRect.width / 2;
  const top = centerY - measuredRect.height / 2;
  return {
    left,
    top,
    right: left + measuredRect.width,
    bottom: top + measuredRect.height,
    width: measuredRect.width,
    height: measuredRect.height,
  };
}

function getMovingNodesRect(container: HTMLElement, movingNodeIds: NodeId[]): DropRect | undefined {
  return getUnionRect(
    movingNodeIds.flatMap((nodeId) => {
      const element = getNodeElement(container, String(nodeId));
      return element ? [toDropRect(element.getBoundingClientRect())] : [];
    }),
  );
}

function getSortGapPx(document: MindMapDocument, sortZoneRatio: number): number {
  const axisGap =
    document.layout.direction === "left" || document.layout.direction === "right"
      ? document.layout.gapY
      : document.layout.gapX;
  return Math.max(32, Math.min(96, axisGap * (0.35 + sortZoneRatio)));
}

function mergeFlowNodeData(
  nextData: FlowConversionResult,
  currentNodes: MindFlowNode[],
  keepPositions: boolean,
): MindFlowNode[] {
  if (!keepPositions) return nextData.nodes;
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  return nextData.nodes.map((nextNode) => {
    const currentNode = currentById.get(nextNode.id);
    if (!currentNode) return nextNode;

    const dataChanged = currentNode.data !== nextNode.data;
    const styleChanged = currentNode.style !== nextNode.style;

    if (!dataChanged && !styleChanged) {
      return currentNode;
    }

    return {
      ...currentNode,
      style: nextNode.style,
      data: nextNode.data,
    };
  });
}

function EditorCanvas(props: MindMapEditorProps) {
  const controlled = props.value !== undefined;
  const initialDocumentRef = useRef<MindMapDocument | null>(null);
  const [internalDocument, setInternalDocument] = useState(() => {
    const initialDocument = props.defaultValue ?? createEmptyDocument();
    if (props.value === undefined) {
      initialDocumentRef.current = cloneDocument(initialDocument);
    }
    return initialDocument;
  });
  const document = props.value ?? internalDocument;
  if (initialDocumentRef.current === null) {
    initialDocumentRef.current = cloneDocument(document);
  }
  const readonly = Boolean(props.readonly);
  const onViewRootChange = props.onViewRootChange;
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], connectionIds: [] });
  const [viewRootId, setViewRootId] = useState<NodeId>(document.rootId);

  // branchListLayout configuration
  const branchListLayout = props.branchListLayout;
  const isBranchListHidden = branchListLayout?.hidden === true;
  const autoShowDepth = branchListLayout?.autoShowDepth ?? 3;

  const treeDepth = useMemo(() => getTreeMaxDepth(document), [document]);
  const rootBranchIds = useMemo(() => {
    const root = document.nodes[document.rootId];
    return root ? root.children.filter((id) => document.nodes[id]) : [];
  }, [document]);

  const isBranchListEligible = useMemo(() => {
    return !isBranchListHidden && treeDepth >= autoShowDepth && rootBranchIds.length > 0;
  }, [isBranchListHidden, treeDepth, autoShowDepth, rootBranchIds]);

  const [splitMode, setSplitMode] = useState<"normal" | "split">(
    isBranchListEligible && branchListLayout?.defaultOpen ? "split" : "normal",
  );
  const [selectedBranchId, setSelectedBranchId] = useState<NodeId | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreviewOpen, setSidebarPreviewOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(branchListLayout?.defaultSidebarWidth ?? 280);

  // Restore viewRootId on exit
  const previousViewRootIdRef = useRef<NodeId>(document.rootId);
  const pendingBranchViewportUpdateRef = useRef(false);

  const effectiveViewRootId = useMemo(() => {
    if (document.nodes[viewRootId]) return viewRootId;
    if (splitMode === "split" && selectedBranchId && document.nodes[selectedBranchId]) {
      return selectedBranchId;
    }
    return document.rootId;
  }, [document.nodes, viewRootId, splitMode, selectedBranchId, document.rootId]);

  const exitSplitMode = useCallback(() => {
    setSplitMode("normal");
    const prevId = previousViewRootIdRef.current;
    const nextRootId = document.nodes[prevId] ? prevId : document.rootId;
    setViewRootId(nextRootId);
    onViewRootChange?.(nextRootId);
    setSidebarPreviewOpen(false);
  }, [document, onViewRootChange]);

  const enterSplitMode = useCallback(
    (initialBranchId?: NodeId) => {
      previousViewRootIdRef.current = effectiveViewRootId;

      let branchId = initialBranchId;
      if (!branchId) {
        const ancestors = getAncestorIds(document, effectiveViewRootId);
        if (ancestors.length > 1 && ancestors[0] === document.rootId) {
          branchId = ancestors[1];
        } else if (rootBranchIds.includes(effectiveViewRootId)) {
          branchId = effectiveViewRootId;
        } else {
          branchId = rootBranchIds[0];
        }
      }

      if (branchId) {
        setSelectedBranchId(branchId);
        setSplitMode("split");

        const isDescendant =
          effectiveViewRootId === branchId ||
          getAncestorIds(document, effectiveViewRootId).includes(branchId);
        const nextViewRootId = isDescendant ? effectiveViewRootId : branchId;

        setViewRootId(nextViewRootId);
        onViewRootChange?.(nextViewRootId);
      }
    },
    [document, effectiveViewRootId, rootBranchIds, onViewRootChange],
  );

  const handleToggleMode = useCallback(() => {
    if (splitMode === "split") {
      exitSplitMode();
    } else {
      enterSplitMode();
    }
  }, [splitMode, enterSplitMode, exitSplitMode]);

  const enterViewRoot = useCallback(
    (nodeId: NodeId) => {
      if (!document.nodes[nodeId]) return;
      if (splitMode === "split") {
        if (nodeId === document.rootId) {
          exitSplitMode();
          return;
        }
        const branchId = getRootBranchIdForNode(document, nodeId);
        if (branchId && branchId !== selectedBranchId) {
          setSelectedBranchId(branchId);
        }
      }
      setViewRootId(nodeId);
      onViewRootChange?.(nodeId);
    },
    [document, splitMode, selectedBranchId, exitSplitMode, onViewRootChange],
  );

  const [themePanelOpen, setThemePanelOpen] = useState(Boolean(props.themePanel?.defaultOpen));
  const [searchOpen, setSearchOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(!props.inspector?.hidden);
  const [localTheme, setLocalTheme] = useState<MindMapTheme | undefined>(props.theme);
  const [historyAvailability, setHistoryAvailability] = useState<HistoryAvailability>({
    canUndo: false,
    canRedo: false,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const history = useRef<HistoryState>({ past: [], future: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoFitKey = useRef("");
  const fitViewFrame = useRef<number | null>(null);
  const pendingViewportAction = useRef<ViewportUpdateAction | null>(null);
  const nodeResizeActive = useRef(false);
  const nodesInitializedRef = useRef(false);
  const renderedNodeCountRef = useRef(0);
  const flow = useReactFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const nodesInitialized = useNodesInitialized();
  const theme = resolveTheme(localTheme ?? props.theme, document.theme);
  const themes = props.themePanel?.themes ?? defaultThemes;
  const selectedNodeId = selection.nodeIds.find((nodeId) => document.nodes[nodeId]);
  const dragSettings = useMemo(
    () => resolveDragInteractionSettings(props.dragInteraction),
    [props.dragInteraction],
  );
  const dragSession = useRef<DragSession | null>(null);
  const didInitialFlowDataSync = useRef(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent>(EMPTY_DROP_INTENT);
  const dropIntentRef = useRef<DropIntent>(EMPTY_DROP_INTENT);
  const [flashNodeId, setFlashNodeId] = useState<NodeId | undefined>();
  const [flowNodes, setFlowNodes] = useState<MindFlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowConversionResult["edges"]>([]);
  const [prevFlowData, setPrevFlowData] = useState<FlowConversionResult | null>(null);
  const canReset = useMemo(
    () => !documentsEqual(document, initialDocumentRef.current!),
    [document],
  );

  const clearFitViewFrame = useCallback(() => {
    if (fitViewFrame.current !== null) {
      cancelAnimationFrame(fitViewFrame.current);
      fitViewFrame.current = null;
    }
  }, []);

  const centerViewAtCurrentZoom = useCallback(() => {
    const container = containerRef.current;
    const flowElement = container?.querySelector<HTMLElement>(".react-flow") ?? container;
    if (!flowElement) return;

    const nodes = flowRef.current.getNodes();
    if (nodes.length === 0) return;

    const bounds = flowRef.current.getNodesBounds(nodes);
    const viewport = flowRef.current.getViewport();
    const rect = flowElement.getBoundingClientRect();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    void flowRef.current.setViewport({
      x: rect.width / 2 - centerX * viewport.zoom,
      y: rect.height / 2 - centerY * viewport.zoom,
      zoom: viewport.zoom,
    });
  }, []);

  const scheduleViewportUpdate = useCallback(
    (action: ViewportUpdateAction, options: ViewportUpdateOptions = {}) => {
      clearFitViewFrame();

      const waitForNodeId = options.waitForNodeId;
      const maxWaitFrames = options.maxWaitFrames ?? DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES;

      const scheduleFrame = (attempt: number) => {
        fitViewFrame.current = requestAnimationFrame(() => {
          fitViewFrame.current = null;
          const container = containerRef.current;
          if (
            dragSession.current ||
            nodeResizeActive.current ||
            (container && isTextInputActive(container))
          ) {
            pendingViewportAction.current = action;
            return;
          }

          const renderedWaitNode =
            waitForNodeId && container
              ? Array.from(container.querySelectorAll<HTMLElement>(".react-flow__node")).some(
                  (element) => {
                    const rect = element.getBoundingClientRect();
                    return (
                      element.dataset.id === String(waitForNodeId) &&
                      rect.width > 0 &&
                      rect.height > 0
                    );
                  },
                )
              : true;
          const nodes = flowRef.current.getNodes();
          if (
            waitForNodeId &&
            (!renderedWaitNode || !nodes.some((node) => node.id === String(waitForNodeId))) &&
            attempt < maxWaitFrames
          ) {
            scheduleFrame(attempt + 1);
            return;
          }

          pendingViewportAction.current = null;
          if (action === "fit") {
            void flowRef.current.fitView({ padding: 0.18 });
          } else if (action === "fit1to1") {
            const containerEl = containerRef.current;
            const flowElement =
              containerEl?.querySelector<HTMLElement>(".react-flow") ?? containerEl;
            if (flowElement) {
              const rect = flowElement.getBoundingClientRect();
              const targetNodeId = waitForNodeId ?? effectiveViewRootId;
              const rootNode = nodes.find((node) => node.id === String(targetNodeId));
              let centerX = 0;
              let centerY = 0;
              if (rootNode) {
                const bounds = flowRef.current.getNodesBounds([rootNode]);
                centerX = bounds.x + bounds.width / 2;
                centerY = bounds.y + bounds.height / 2;
              } else if (nodes.length > 0) {
                const bounds = flowRef.current.getNodesBounds(nodes);
                centerX = bounds.x + bounds.width / 2;
                centerY = bounds.y + bounds.height / 2;
              }
              void flowRef.current.setViewport({
                x: rect.width / 2 - centerX,
                y: rect.height / 2 - centerY,
                zoom: 1,
              });
            }
          } else {
            centerViewAtCurrentZoom();
          }
        });
      };

      scheduleFrame(0);
    },
    [centerViewAtCurrentZoom, clearFitViewFrame, effectiveViewRootId],
  );

  const scheduleFitView = useCallback(
    (options?: ViewportUpdateOptions) => scheduleViewportUpdate("fit", options),
    [scheduleViewportUpdate],
  );

  const scheduleFit1to1View = useCallback(
    (options?: ViewportUpdateOptions) => scheduleViewportUpdate("fit1to1", options),
    [scheduleViewportUpdate],
  );

  const scheduleCenterView = useCallback(
    () => scheduleViewportUpdate("center"),
    [scheduleViewportUpdate],
  );

  const scheduleCenterViewRef = useRef(scheduleCenterView);
  scheduleCenterViewRef.current = scheduleCenterView;

  const flushPendingViewportUpdate = useCallback(() => {
    const action = pendingViewportAction.current;
    if (action) scheduleViewportUpdate(action);
  }, [scheduleViewportUpdate]);

  const handleSelectBranch = useCallback(
    (branchId: NodeId) => {
      pendingBranchViewportUpdateRef.current = true;
      setSelectedBranchId(branchId);
      setViewRootId(branchId);
      onViewRootChange?.(branchId);
      const viewportOptions = {
        waitForNodeId: branchId,
        maxWaitFrames: DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES * 4,
      };
      const ownerWindow = containerRef.current?.ownerDocument.defaultView ?? window;
      const scheduleBranchViewportUpdate = () => {
        if (!containerRef.current) return;
        if (props.viewport?.fitViewOnInit === true) {
          scheduleFitView(viewportOptions);
        } else {
          scheduleFit1to1View(viewportOptions);
        }
      };
      ownerWindow.setTimeout(scheduleBranchViewportUpdate, 0);
      ownerWindow.setTimeout(scheduleBranchViewportUpdate, 80);
    },
    [onViewRootChange, props.viewport?.fitViewOnInit, scheduleFit1to1View, scheduleFitView],
  );

  const syncHistoryAvailability = useCallback(() => {
    setHistoryAvailability({
      canUndo: history.current.past.length > 0,
      canRedo: history.current.future.length > 0,
    });
  }, []);

  const commitDocument = useCallback(
    (nextDocument: MindMapDocument) => {
      if (!controlled) setInternalDocument(nextDocument);
      props.onChange?.(nextDocument);
    },
    [controlled, props],
  );

  const reportError = useCallback(
    (error: MindMapError) => {
      props.onError?.(error);
    },
    [props],
  );

  const openNodeLink = useCallback(
    (url: string, node: MindMapNode) => {
      if (props.onOpenLink) {
        props.onOpenLink(url, node);
        return;
      }

      if (!isSafeExternalUrl(url)) {
        reportError({
          code: "UNSAFE_LINK_URL",
          message: "Link URL is not allowed",
          details: { nodeId: node.id },
          recoverable: true,
        });
        return;
      }

      if (!openSafeExternalUrl(url)) {
        reportError({
          code: "OPEN_LINK_FAILED",
          message: "Link could not be opened",
          details: { nodeId: node.id },
          recoverable: true,
        });
      }
    },
    [props, reportError],
  );

  const commitSelection = useCallback(
    (nextSelection: SelectionState) => {
      setSelection(nextSelection);
      props.onSelectionChange?.(nextSelection);
    },
    [props],
  );

  useEffect(() => {
    if (viewRootId === effectiveViewRootId) return;
    setViewRootId(effectiveViewRootId);
    onViewRootChange?.(effectiveViewRootId);
  }, [effectiveViewRootId, onViewRootChange, viewRootId]);

  useEffect(() => {
    if (splitMode === "split") {
      const ancestors = getAncestorIds(document, effectiveViewRootId);
      let branchId: NodeId | undefined;
      if (ancestors.length > 1 && ancestors[0] === document.rootId) {
        branchId = ancestors[1];
      } else if (rootBranchIds.includes(effectiveViewRootId)) {
        branchId = effectiveViewRootId;
      }
      if (branchId && rootBranchIds.includes(branchId) && branchId !== selectedBranchId) {
        setSelectedBranchId(branchId);
      }
    }
  }, [splitMode, effectiveViewRootId, document, rootBranchIds, selectedBranchId]);

  useEffect(() => {
    if (!isBranchListEligible && splitMode === "split") {
      exitSplitMode();
    }
  }, [isBranchListEligible, splitMode, exitSplitMode]);

  useEffect(() => {
    if (splitMode !== "split") return;
    if (selectedBranchId && rootBranchIds.includes(selectedBranchId)) {
      if (effectiveViewRootId === document.rootId) {
        setViewRootId(selectedBranchId);
        onViewRootChange?.(selectedBranchId);
      }
      return;
    }

    if (rootBranchIds.length > 0) {
      const fallback = rootBranchIds[0] as NodeId;
      setSelectedBranchId(fallback);
      setViewRootId(fallback);
      onViewRootChange?.(fallback);
    } else {
      exitSplitMode();
    }
  }, [
    document.rootId,
    effectiveViewRootId,
    exitSplitMode,
    onViewRootChange,
    rootBranchIds,
    selectedBranchId,
    splitMode,
  ]);

  useEffect(() => {
    if (props.search?.hidden) setSearchOpen(false);
  }, [props.search?.hidden]);

  const autoLayoutDocument = useCallback((nextDocument: MindMapDocument) => {
    return applyLayoutResult(nextDocument, simpleTreeLayout(nextDocument));
  }, []);

  const clearFlashTimer = useCallback(() => {
    if (flashTimer.current) {
      clearTimeout(flashTimer.current);
      flashTimer.current = null;
    }
  }, []);

  const commitDropIntent = useCallback((nextIntent: DropIntent) => {
    dropIntentRef.current = nextIntent;
    setDropIntent(nextIntent);
  }, []);

  const flashDropTarget = useCallback(
    (nodeId: NodeId) => {
      clearFlashTimer();
      setFlashNodeId(nodeId);
      flashTimer.current = setTimeout(
        () => setFlashNodeId(undefined),
        dragSettings.flashDurationMs,
      );
    },
    [clearFlashTimer, dragSettings.flashDurationMs],
  );

  const runCommand = useCallback(
    (command: Parameters<typeof dispatchCommand>[1], options: { autoLayout?: boolean } = {}) => {
      if (readonly && !command.type.startsWith("selection.")) return;
      const result = dispatchCommand(document, command);
      if (!result.ok) {
        reportError(result.error);
        return;
      }
      const nextDocument =
        options.autoLayout && result.operation
          ? autoLayoutDocument(result.document)
          : result.document;
      if (result.selection) commitSelection(result.selection);
      if (result.operation) {
        history.current.past.push({ ...result.operation, after: nextDocument });
        history.current.future = [];
        syncHistoryAvailability();
      }
      if (nextDocument !== document) commitDocument(nextDocument);
      return { ...result, document: nextDocument };
    },
    [
      autoLayoutDocument,
      commitDocument,
      commitSelection,
      document,
      readonly,
      reportError,
      syncHistoryAvailability,
    ],
  );

  const addChildNode = useCallback(
    (parentId: NodeId) => {
      if (readonly) return;
      const previousChildren = new Set(document.nodes[parentId]?.children ?? []);
      const result = runCommand(
        {
          type: "node.create",
          parentId,
          title: "New child",
          meta: { source: "canvas", label: "Add child" },
        },
        { autoLayout: true },
      );
      if (!result?.ok) return;
      const createdNodeId = result.document.nodes[parentId]?.children.find(
        (childId) => !previousChildren.has(childId),
      );
      if (createdNodeId) {
        commitSelection({
          nodeIds: [createdNodeId],
          connectionIds: [],
          anchorNodeId: createdNodeId,
        });
      }
    },
    [commitSelection, document.nodes, readonly, runCommand],
  );

  const toggleNodeCollapse = useCallback(
    (nodeId: NodeId) => {
      const node = document.nodes[nodeId];
      if (!node || readonly) return;
      runCommand(
        {
          type: "node.collapse",
          nodeIds: [nodeId],
          collapsed: !node.collapsed,
          meta: { source: "canvas", label: "Toggle collapse" },
        },
        { autoLayout: true },
      );
    },
    [document.nodes, readonly, runCommand],
  );

  const expandCollapsedNode = useCallback(
    (nodeId: NodeId) => {
      const node = document.nodes[nodeId];
      if (!node || readonly || !node.collapsed) return;
      runCommand(
        {
          type: "node.collapse",
          nodeIds: [nodeId],
          collapsed: false,
          meta: { source: "canvas", label: "Expand collapsed branch" },
        },
        { autoLayout: true },
      );
    },
    [document.nodes, readonly, runCommand],
  );

  const undo = useCallback(() => {
    const operation = history.current.past.pop();
    if (!operation) return;
    history.current.future.unshift(operation);
    commitDocument(applyOperation(operation, "inverse"));
    syncHistoryAvailability();
  }, [commitDocument, syncHistoryAvailability]);

  const redo = useCallback(() => {
    const operation = history.current.future.shift();
    if (!operation) return;
    history.current.past.push(operation);
    commitDocument(applyOperation(operation, "forward"));
    syncHistoryAvailability();
  }, [commitDocument, syncHistoryAvailability]);

  const resetToInitialDocument = useCallback(() => {
    if (readonly || !canReset) return;
    history.current = { past: [], future: [] };
    syncHistoryAvailability();
    commitDocument(cloneDocument(initialDocumentRef.current!));
  }, [canReset, commitDocument, readonly, syncHistoryAvailability]);

  const resizeNodes = useCallback(
    (nodeIds: NodeId[], delta: number) => {
      runCommand(
        {
          type: "node.resize",
          nodeIds,
          delta,
          minScale: props.nodeSizing?.minScale,
          maxScale: props.nodeSizing?.maxScale,
        },
        { autoLayout: true },
      );
    },
    [props.nodeSizing?.maxScale, props.nodeSizing?.minScale, runCommand],
  );

  const onResizeProgress = useCallback((nodeId: NodeId, scale: number) => {
    nodeResizeActive.current = true;
    setFlowNodes((currentNodes) =>
      currentNodes.map((flowNode) => {
        if (flowNode.id === nodeId) {
          return {
            ...flowNode,
            data: {
              ...flowNode.data,
              node: {
                ...flowNode.data.node,
                style: {
                  ...flowNode.data.node.style,
                  scale,
                },
              },
            },
          };
        }
        return flowNode;
      }),
    );
  }, []);

  const onResizeCommit = useCallback(
    (nodeId: NodeId, scale: number) => {
      nodeResizeActive.current = false;
      flushPendingViewportUpdate();
      const node = document.nodes[nodeId];
      if (!node) return;
      const startScale = node.style.scale ?? 1;
      const delta = Number((scale - startScale).toFixed(2));
      if (delta !== 0) {
        resizeNodes([nodeId], delta);
      }
    },
    [document.nodes, flushPendingViewportUpdate, resizeNodes],
  );

  const onTitleCommit = useCallback(
    (nodeId: NodeId, title: string) => {
      runCommand({
        type: "node.update",
        nodeId,
        patch: { title },
        meta: { source: "canvas", label: "Rename node" },
      });
      flushPendingViewportUpdate();
    },
    [flushPendingViewportUpdate, runCommand],
  );

  const flowData = useMemo(
    () =>
      documentToFlow(document, {
        viewRootId: effectiveViewRootId,
        selectedNodeIds: selection.nodeIds,
        readonly,
        dropIntent,
        flashNodeId,
        showAddChildControl: dragSettings.showAddChildControl,
        showCollapseControl: dragSettings.showCollapseControl,
        showNodeResizeControls: props.nodeSizing?.showQuickControls !== false,
        nodeResizeStep: props.nodeSizing?.scaleStep,
        nodeMinScale: props.nodeSizing?.minScale,
        nodeMaxScale: props.nodeSizing?.maxScale,
        onTitleCommit,
        onEnterNodeView: enterViewRoot,
        onResizeNode: resizeNodes,
        onResizeProgress,
        onResizeCommit,
        onAddChild: addChildNode,
        onToggleCollapse: toggleNodeCollapse,
        onExpandCollapsed: expandCollapsedNode,
        onOpenLink: openNodeLink,
        renderNode: props.renderNode,
        theme,
      }),
    [
      addChildNode,
      document,
      dragSettings.showAddChildControl,
      dragSettings.showCollapseControl,
      dropIntent,
      effectiveViewRootId,
      enterViewRoot,
      expandCollapsedNode,
      flashNodeId,
      onTitleCommit,
      props.nodeSizing?.scaleStep,
      props.nodeSizing?.showQuickControls,
      props.nodeSizing?.minScale,
      props.nodeSizing?.maxScale,
      props.renderNode,
      readonly,
      resizeNodes,
      onResizeProgress,
      onResizeCommit,
      selection.nodeIds,
      openNodeLink,
      toggleNodeCollapse,
      theme,
    ],
  );

  if (prevFlowData !== null && flowData !== prevFlowData) {
    setPrevFlowData(flowData);
    setFlowEdges(flowData.edges);
    setFlowNodes((currentNodes) =>
      mergeFlowNodeData(flowData, currentNodes, Boolean(dragSession.current)),
    );
  }

  useEffect(() => {
    if (didInitialFlowDataSync.current) return;
    didInitialFlowDataSync.current = true;
    setPrevFlowData(flowData);
    setFlowEdges(flowData.edges);
    setFlowNodes((currentNodes) =>
      mergeFlowNodeData(flowData, currentNodes, Boolean(dragSession.current)),
    );
  }, [flowData]);

  const onViewportWheel = useCallback(
    (event: WheelEvent) => {
      const flowElement = event.currentTarget as HTMLElement | null;
      if (!flowElement || shouldIgnoreViewportWheel(event, flowElement)) return;

      const panOnScroll = props.viewport?.panOnScroll !== false;
      const pinchLikeWheel = isPinchLikeWheel(event);
      const shouldZoom =
        (pinchLikeWheel && props.viewport?.zoomOnPinch !== false) ||
        (!pinchLikeWheel && !panOnScroll && props.viewport?.zoomOnScroll === true);

      if (shouldZoom) {
        event.preventDefault();
        event.stopPropagation();

        const sensitivity = Math.max(
          0,
          props.viewport?.wheelZoomSensitivity ?? DEFAULT_WHEEL_ZOOM_SENSITIVITY,
        );
        const maxStep = clamp(
          props.viewport?.wheelZoomMaxStep ?? DEFAULT_WHEEL_ZOOM_MAX_STEP,
          0.01,
          0.95,
        );
        const delta = normalizeWheelDelta(event.deltaY, event.deltaMode);
        const step = clamp(-delta * sensitivity, -maxStep, maxStep);
        if (step === 0) return;

        const viewport = flow.getViewport();
        const nextZoom = clamp(viewport.zoom * (1 + step), CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM);
        if (nextZoom === viewport.zoom) return;

        const bounds = flowElement.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left;
        const pointerY = event.clientY - bounds.top;
        const flowX = (pointerX - viewport.x) / viewport.zoom;
        const flowY = (pointerY - viewport.y) / viewport.zoom;

        void flow.setViewport({
          x: pointerX - flowX * nextZoom,
          y: pointerY - flowY * nextZoom,
          zoom: nextZoom,
        });
        return;
      }

      if (pinchLikeWheel || !panOnScroll) return;

      const panSensitivity = Math.max(
        0,
        props.viewport?.wheelPanSensitivity ?? DEFAULT_WHEEL_PAN_SENSITIVITY,
      );
      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode) * panSensitivity;
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode) * panSensitivity;
      if (deltaX === 0 && deltaY === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const viewport = flow.getViewport();
      void flow.setViewport({
        x: viewport.x - deltaX,
        y: viewport.y - deltaY,
        zoom: viewport.zoom,
      });
    },
    [
      flow,
      props.viewport?.panOnScroll,
      props.viewport?.wheelPanSensitivity,
      props.viewport?.wheelZoomMaxStep,
      props.viewport?.wheelZoomSensitivity,
      props.viewport?.zoomOnPinch,
      props.viewport?.zoomOnScroll,
    ],
  );

  useEffect(() => {
    const flowElement = containerRef.current?.querySelector<HTMLElement>(".react-flow");
    const shouldHandleWheel =
      props.viewport?.panOnScroll !== false ||
      props.viewport?.zoomOnPinch !== false ||
      props.viewport?.zoomOnScroll === true;
    if (!flowElement || !shouldHandleWheel) return;

    flowElement.addEventListener("wheel", onViewportWheel, { capture: true, passive: false });
    return () => flowElement.removeEventListener("wheel", onViewportWheel, { capture: true });
  }, [
    flowData.nodes.length,
    onViewportWheel,
    props.viewport?.panOnScroll,
    props.viewport?.zoomOnPinch,
    props.viewport?.zoomOnScroll,
  ]);

  const onNodesChange = useCallback<OnNodesChange<MindFlowNode>>((changes) => {
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const getDropIntentAtPoint = useCallback(
    (point: { x: number; y: number }, session: DragSession): DropIntent => {
      const container = containerRef.current;
      if (!container) return EMPTY_DROP_INTENT;

      const movingSet = new Set(session.visualNodeIds.map(String));
      const measuredMovingRect = getMovingNodesRect(container, session.commitNodeIds);
      const movingRect = measuredMovingRect
        ? placeMeasuredRectAtPoint(point, measuredMovingRect)
        : getSyntheticMovingRect(point);
      const sortGapPx = getSortGapPx(document, dragSettings.sortZoneRatio);
      const hitTargets = flowNodes.flatMap((flowNode) => {
        if (movingSet.has(flowNode.id)) return [];
        const element = getNodeElement(container, flowNode.id);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        const geometry = getDropGeometry({
          movingRect,
          targetRect: toDropRect(rect),
          layoutDirection: document.layout.direction,
          sortGapPx,
          overlapRatio: DROP_OVERLAP_RATIO,
        });
        return geometry.type === "none"
          ? []
          : [{ id: asNodeId(flowNode.id), rect, area: rect.width * rect.height, geometry }];
      });

      const hitTarget = hitTargets.sort(
        (a, b) => a.geometry.distance - b.geometry.distance || a.area - b.area,
      )[0];
      if (!hitTarget) return EMPTY_DROP_INTENT;

      const mode = hitTarget.geometry.type === "reparent" ? "reparent" : "sort";
      const reason = getDropValidationReason(document, session.commitNodeIds, hitTarget.id, mode);
      if (reason) return { type: "invalid", targetId: hitTarget.id, reason };
      if (hitTarget.geometry.type === "reparent") {
        const noOp = isMoveNoOp(document, session.commitNodeIds, hitTarget.id);
        return { type: "reparent", targetId: hitTarget.id, noOp };
      }
      const placement = hitTarget.geometry.type === "sort-before" ? "before" : "after";
      const index = getSortInsertionIndex(document, hitTarget.id, session.commitNodeIds, placement);
      const parentId = document.nodes[hitTarget.id]?.parentId;
      const noOp =
        parentId && index !== undefined
          ? isMoveNoOp(document, session.commitNodeIds, parentId, index)
          : false;
      return { type: hitTarget.geometry.type, targetId: hitTarget.id, noOp };
    },
    [document, dragSettings.sortZoneRatio, flowNodes],
  );

  const updateDropIntent = useCallback(
    (nextIntent: DropIntent) => commitDropIntent(nextIntent),
    [commitDropIntent],
  );

  const reportDropError = useCallback(
    (code: string, message: string, details?: unknown) => {
      reportError({ code, message, details, recoverable: true });
    },
    [reportError],
  );

  const commitDrop = useCallback(
    (intent: DropIntent, movingNodeIds: NodeId[]) => {
      if (intent.type === "none") {
        reportDropError(
          "DROP_TARGET_REQUIRED",
          "Drop on another node to move or sort this selection",
        );
        return false;
      }
      if (intent.type === "invalid") {
        reportDropError("INVALID_DROP_TARGET", intent.reason, { targetId: intent.targetId });
        return false;
      }
      if (intent.type === "reparent") {
        const reason = getDropValidationReason(
          document,
          movingNodeIds,
          intent.targetId,
          "reparent",
        );
        if (reason) {
          reportDropError("INVALID_DROP_TARGET", reason, { targetId: intent.targetId });
          return false;
        }
        const result = runCommand(
          {
            type: "node.moveMany",
            nodeIds: movingNodeIds,
            parentId: intent.targetId,
            meta: { source: "canvas", label: "Move nodes" },
          },
          { autoLayout: dragSettings.autoLayoutOnDrop },
        );
        if (result?.ok) flashDropTarget(intent.targetId);
        return Boolean(result?.ok);
      }

      const target = document.nodes[intent.targetId];
      const parentId = target?.parentId;
      const reason = getDropValidationReason(document, movingNodeIds, intent.targetId, "sort");
      const index = getSortInsertionIndex(
        document,
        intent.targetId,
        movingNodeIds,
        intent.type === "sort-before" ? "before" : "after",
      );
      if (reason || !parentId || index === undefined) {
        reportDropError("INVALID_DROP_TARGET", reason ?? "Sort target is not available", {
          targetId: intent.targetId,
        });
        return false;
      }
      const result = runCommand(
        {
          type: "node.moveMany",
          nodeIds: movingNodeIds,
          parentId,
          index,
          meta: {
            source: "canvas",
            label: intent.type === "sort-before" ? "Sort before node" : "Sort after node",
          },
        },
        { autoLayout: dragSettings.autoLayoutOnDrop },
      );
      if (result?.ok) flashDropTarget(intent.targetId);
      return Boolean(result?.ok);
    },
    [document, dragSettings.autoLayoutOnDrop, flashDropTarget, reportDropError, runCommand],
  );

  const onNodeDragStart = useCallback<OnNodeDrag<MindFlowNode>>(
    (_event, node) => {
      if (readonly || !dragSettings.enabled) return;
      const nodeId = asNodeId(node.id);
      const selectedNodeIds = selection.nodeIds.includes(nodeId) ? selection.nodeIds : [nodeId];
      const movingNodeIds = getTopLevelMovableNodeIds(document, selectedNodeIds);
      const rendered = flowNodes.length > 0 ? flowNodes : flowData.nodes;
      const visualNodeIds = getVisibleSubtreeNodeIds(document, movingNodeIds, effectiveViewRootId);
      dragSession.current = {
        commitNodeIds: movingNodeIds,
        visualNodeIds,
        startPositions: getFlowNodeStartPositions(rendered, visualNodeIds),
      };
      commitDropIntent(EMPTY_DROP_INTENT);
      if (!selection.nodeIds.includes(nodeId)) {
        commitSelection({ nodeIds: [nodeId], connectionIds: [], anchorNodeId: nodeId });
      }
    },
    [
      commitDropIntent,
      commitSelection,
      document,
      dragSettings.enabled,
      effectiveViewRootId,
      flowData.nodes,
      flowNodes,
      readonly,
      selection.nodeIds,
    ],
  );

  const onNodeDrag = useCallback<OnNodeDrag<MindFlowNode>>(
    (event, node) => {
      if (readonly || !dragSettings.enabled || !dragSession.current) return;
      const session = dragSession.current;
      const start = session.startPositions[node.id];
      if (start) {
        const delta = {
          x: node.position.x - start.x,
          y: node.position.y - start.y,
        };
        const visualNodeSet = new Set(session.visualNodeIds.map(String));
        setFlowNodes((currentNodes) =>
          currentNodes.map((flowNode) => {
            const startPosition = session.startPositions[flowNode.id];
            if (!visualNodeSet.has(flowNode.id) || !startPosition) return flowNode;
            return {
              ...flowNode,
              position: {
                x: startPosition.x + delta.x,
                y: startPosition.y + delta.y,
              },
            };
          }),
        );
      }
      const point = getEventClientPoint(event);
      if (!point) return;
      updateDropIntent(getDropIntentAtPoint(point, session));
    },
    [dragSettings.enabled, getDropIntentAtPoint, readonly, updateDropIntent],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<MindFlowNode>>(
    (event) => {
      if (readonly || !dragSettings.enabled) return;
      const session = dragSession.current;
      if (!session) return;
      const point = getEventClientPoint(event);
      const currentIntent = dropIntentRef.current;
      const resolvedIntent = point ? getDropIntentAtPoint(point, session) : currentIntent;
      const finalIntent = point ? resolvedIntent : currentIntent;
      dragSession.current = null;
      const committed = commitDrop(finalIntent, session.commitNodeIds);
      commitDropIntent(EMPTY_DROP_INTENT);
      if (!committed) {
        requestAnimationFrame(() => {
          setFlowEdges(flowData.edges);
          setFlowNodes(flowData.nodes);
        });
      }
      flushPendingViewportUpdate();
    },
    [
      commitDrop,
      commitDropIntent,
      dragSettings.enabled,
      flowData.edges,
      flowData.nodes,
      flushPendingViewportUpdate,
      getDropIntentAtPoint,
      readonly,
    ],
  );

  const onToolbarAction = useCallback(
    async (control: ViewToolbarControl) => {
      if (readonly && EDIT_HISTORY_CONTROLS.has(control)) return;
      if (control === "theme") setThemePanelOpen((open) => !open);
      if (control === "undo") undo();
      if (control === "redo") redo();
      if (control === "reset") resetToInitialDocument();
      if (control === "search" && !props.search?.hidden) setSearchOpen((open) => !open);
      if (control === "inspector") setInspectorOpen((open) => !open);
      if (control === "zoomIn") flow.zoomIn();
      if (control === "zoomOut") flow.zoomOut();
      if (control === "fitView") {
        if (props.viewport?.fitViewOnInit === true) {
          scheduleFitView();
        } else {
          scheduleFit1to1View();
        }
      }
      if (control === "fullscreen") {
        const target = containerRef.current;
        const ownerDocument = target?.ownerDocument;
        if (!target || !ownerDocument) return;
        if (ownerDocument.fullscreenElement === target) {
          if (!ownerDocument.exitFullscreen) {
            reportError({
              code: "FULLSCREEN_EXIT_UNAVAILABLE",
              message: "Exit fullscreen API is not available",
              recoverable: true,
            });
            return;
          }
          await ownerDocument.exitFullscreen().catch((error: unknown) =>
            reportError({
              code: "FULLSCREEN_EXIT_FAILED",
              message: error instanceof Error ? error.message : "Fullscreen exit failed",
              recoverable: true,
            }),
          );
        } else if (!target.requestFullscreen) {
          reportError({
            code: "FULLSCREEN_UNAVAILABLE",
            message: "Fullscreen API is not available",
            recoverable: true,
          });
          return;
        } else {
          await target.requestFullscreen().catch((error: unknown) =>
            reportError({
              code: "FULLSCREEN_FAILED",
              message: error instanceof Error ? error.message : "Fullscreen request failed",
              recoverable: true,
            }),
          );
        }
      }
      if (control === "export") {
        reportError({
          code: "EXPORT_NOT_CONFIGURED",
          message: "Provide @my-mind-node/exporters to enable toolbar export",
          recoverable: true,
        });
      }
    },
    [
      flow,
      props.search?.hidden,
      props.viewport?.fitViewOnInit,
      readonly,
      redo,
      reportError,
      resetToInitialDocument,
      scheduleFit1to1View,
      scheduleFitView,
      undo,
    ],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      const selected = selectedNodeId ?? effectiveViewRootId;
      const parentId = document.nodes[selected]?.parentId ?? document.rootId;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (readonly) return;
      if (event.key === "Tab") {
        event.preventDefault();
        runCommand({
          type: "node.create",
          parentId: selected,
          title: "New child",
          meta: { source: "keyboard" },
        });
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runCommand({
          type: "node.create",
          parentId,
          title: "New sibling",
          meta: { source: "keyboard" },
        });
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        for (const nodeId of selection.nodeIds) {
          runCommand({ type: "node.delete", nodeId, meta: { source: "keyboard" } });
        }
      }
      if (event.key === "Escape") {
        commitSelection({ nodeIds: [], connectionIds: [] });
      }
    },
    [
      commitSelection,
      document.nodes,
      document.rootId,
      effectiveViewRootId,
      readonly,
      redo,
      runCommand,
      selectedNodeId,
      selection.nodeIds,
      undo,
    ],
  );

  const style = {
    "--mmn-canvas": theme.colors.canvas,
    "--mmn-node": theme.colors.node,
    "--mmn-node-text": theme.colors.nodeText,
    "--mmn-edge": theme.colors.edge,
    "--mmn-selected": theme.colors.selected,
    "--mmn-accent": theme.colors.accent,
    "--mmn-drop-flash-duration": `${dragSettings.flashDurationMs}ms`,
    height: props.height ?? 640,
  } as CSSProperties;

  const rawControls =
    props.toolbar?.controls ?? (readonly ? DEFAULT_READONLY_TOOLBAR : DEFAULT_EDITABLE_TOOLBAR);
  const controls = useMemo(
    () =>
      normalizeToolbarControls(rawControls, {
        readonly,
        searchHidden: Boolean(props.search?.hidden),
      }),
    [props.search?.hidden, rawControls, readonly],
  );
  const disabledControls = useMemo(
    () => ({
      undo: !historyAvailability.canUndo,
      redo: !historyAvailability.canRedo,
      reset: readonly || !canReset,
    }),
    [canReset, historyAvailability.canRedo, historyAvailability.canUndo, readonly],
  );
  const activeControls = useMemo(
    () => ({
      fullscreen: isFullscreen,
    }),
    [isFullscreen],
  );
  const toolbarLabels = useMemo(
    () => ({
      fullscreen: isFullscreen ? "Exit fullscreen" : "Fullscreen",
    }),
    [isFullscreen],
  );
  const autoFitKey = `${document.id}:${effectiveViewRootId}`;
  const renderedNodes =
    flowNodes.length > 0 || flowData.nodes.length === 0 ? flowNodes : flowData.nodes;
  const renderedEdges =
    flowEdges.length > 0 || flowData.edges.length === 0 ? flowEdges : flowData.edges;
  const renderedNodesContainEffectiveRoot = renderedNodes.some(
    (node) => node.id === String(effectiveViewRootId),
  );
  nodesInitializedRef.current = nodesInitialized;
  renderedNodeCountRef.current = renderedNodes.length;

  useEffect(() => {
    if (
      props.viewport?.fitViewOnInit === false ||
      flowData.nodes.length === 0 ||
      !renderedNodesContainEffectiveRoot
    )
      return;
    if (lastAutoFitKey.current === autoFitKey) return;
    lastAutoFitKey.current = autoFitKey;

    const viewportOptions = { waitForNodeId: effectiveViewRootId };
    if (props.viewport?.fitViewOnInit === true) {
      scheduleFitView(viewportOptions);
    } else {
      scheduleFit1to1View(viewportOptions);
    }
  }, [
    autoFitKey,
    effectiveViewRootId,
    flowData.nodes.length,
    props.viewport?.fitViewOnInit,
    renderedNodesContainEffectiveRoot,
    scheduleFitView,
    scheduleFit1to1View,
  ]);

  useEffect(() => {
    if (!pendingBranchViewportUpdateRef.current) return;
    if (splitMode !== "split" || renderedNodes.length === 0 || !renderedNodesContainEffectiveRoot)
      return;

    pendingBranchViewportUpdateRef.current = false;
    const viewportOptions = { waitForNodeId: effectiveViewRootId };
    if (props.viewport?.fitViewOnInit === true) {
      scheduleFitView(viewportOptions);
    } else {
      scheduleFit1to1View(viewportOptions);
    }
  }, [
    effectiveViewRootId,
    props.viewport?.fitViewOnInit,
    renderedNodes.length,
    renderedNodesContainEffectiveRoot,
    scheduleFit1to1View,
    scheduleFitView,
    splitMode,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ownerDocument = container.ownerDocument;
    setIsFullscreen(ownerDocument.fullscreenElement === container);

    const onFullscreenChange = () => {
      const nextIsFullscreen = ownerDocument.fullscreenElement === container;
      setIsFullscreen(nextIsFullscreen);
      if (props.viewport?.fitViewOnResize === false) return;

      scheduleCenterViewRef.current();
      const scheduleNextFrame =
        ownerDocument.defaultView?.requestAnimationFrame.bind(ownerDocument.defaultView) ??
        requestAnimationFrame;
      scheduleNextFrame(() => scheduleCenterViewRef.current());
    };

    ownerDocument.addEventListener("fullscreenchange", onFullscreenChange);
    return () => ownerDocument.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [props.viewport?.fitViewOnResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (
      props.viewport?.fitViewOnResize === false ||
      !container ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    let lastSize: { width: number; height: number } | undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = Math.round(entry?.contentRect.width ?? container.getBoundingClientRect().width);
      const height = Math.round(
        entry?.contentRect.height ?? container.getBoundingClientRect().height,
      );
      if (!lastSize) {
        lastSize = { width, height };
        return;
      }
      if (width === lastSize.width && height === lastSize.height) return;
      lastSize = { width, height };
      if (!nodesInitializedRef.current || renderedNodeCountRef.current === 0) return;
      scheduleCenterViewRef.current();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [props.viewport?.fitViewOnResize]);

  useEffect(() => {
    return () => {
      clearFlashTimer();
      clearFitViewFrame();
      pendingViewportAction.current = null;
    };
  }, [clearFitViewFrame, clearFlashTimer]);

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let newWidth = startWidth + deltaX;

        const minWidth = branchListLayout?.minSidebarWidth ?? 220;
        let maxWidth = 500;
        if (containerRef.current) {
          const containerWidth = containerRef.current.getBoundingClientRect().width;
          maxWidth = Math.round(containerWidth * (branchListLayout?.maxSidebarWidthRatio ?? 0.45));
        }

        newWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
        setSidebarWidth(newWidth);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        handle.releasePointerCapture(upEvent.pointerId);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);

        scheduleCenterView();
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
    },
    [sidebarWidth, branchListLayout, scheduleCenterView],
  );

  const handleCollapseSidebar = useCallback(() => {
    setSidebarCollapsed(true);
    setSidebarPreviewOpen(false);
    setSidebarPinned(false);
    scheduleCenterView();
  }, [scheduleCenterView]);

  const handlePreviewSidebar = useCallback(() => {
    if (!sidebarCollapsed) return;
    setSidebarPreviewOpen(true);
  }, [sidebarCollapsed]);

  const handlePreviewSidebarLeave = useCallback(() => {
    if (!sidebarCollapsed || sidebarPinned) return;
    setSidebarPreviewOpen(false);
  }, [sidebarCollapsed, sidebarPinned]);

  const handlePinSidebar = useCallback(() => {
    setSidebarPinned(true);
    setSidebarCollapsed(false);
    setSidebarPreviewOpen(false);
    scheduleCenterView();
  }, [scheduleCenterView]);

  useEffect(() => {
    if (!sidebarCollapsed || !sidebarPreviewOpen || sidebarPinned) return;
    const ownerDocument = containerRef.current?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (!ownerDocument || !ownerWindow) return;

    const closeWhenOutsidePreview = (event: PointerEvent | MouseEvent) => {
      const target = event.target;
      if (!(target instanceof ownerWindow.Element)) return;
      if (target.closest(".mmn-branch-list-panel, .mmn-branch-expand-btn")) return;
      setSidebarPreviewOpen(false);
    };

    ownerDocument.addEventListener("pointermove", closeWhenOutsidePreview);
    ownerDocument.addEventListener("mousemove", closeWhenOutsidePreview);
    return () => {
      ownerDocument.removeEventListener("pointermove", closeWhenOutsidePreview);
      ownerDocument.removeEventListener("mousemove", closeWhenOutsidePreview);
    };
  }, [sidebarCollapsed, sidebarPinned, sidebarPreviewOpen]);

  const isSplitMode = splitMode === "split";

  const renderCanvasContent = () => (
    <>
      {!props.breadcrumbs?.hidden || !props.toolbar?.hidden ? (
        <div className="mmn-editor__topbar">
          {!props.breadcrumbs?.hidden ? (
            <Breadcrumbs
              document={document}
              viewRootId={effectiveViewRootId}
              onNavigate={enterViewRoot}
            />
          ) : null}
          {!props.toolbar?.hidden ? (
            <Toolbar
              controls={controls}
              activeControls={activeControls}
              disabledControls={disabledControls}
              labels={toolbarLabels}
              onAction={onToolbarAction}
            />
          ) : null}
        </div>
      ) : null}
      {Object.keys(document.nodes).length === 0 ? (
        <div className="mmn-empty">Start with a root node or import structured text.</div>
      ) : (
        <ReactFlow
          nodes={renderedNodes}
          edges={renderedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          minZoom={CANVAS_MIN_ZOOM}
          maxZoom={CANVAS_MAX_ZOOM}
          zoomOnScroll={false}
          zoomOnPinch={props.viewport?.zoomOnPinch ?? true}
          panOnDrag={props.viewport?.panOnDrag ?? true}
          nodesDraggable={!readonly && dragSettings.enabled}
          nodesConnectable={false}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(event, node) => {
            const append = event.shiftKey || event.metaKey || event.ctrlKey;
            const nodeId = asNodeId(node.id);
            const nodeIds = append
              ? selection.nodeIds.includes(nodeId)
                ? selection.nodeIds.filter((id) => id !== nodeId)
                : [...selection.nodeIds, nodeId]
              : [nodeId];
            commitSelection({ nodeIds, connectionIds: [], anchorNodeId: nodeId });
          }}
          onPaneClick={() => commitSelection({ nodeIds: [], connectionIds: [] })}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            enterViewRoot(selectedNodeId ?? effectiveViewRootId);
          }}
        >
          {props.minimap?.visible === true ? (
            <MiniMap
              pannable={props.minimap.pannable ?? true}
              zoomable={props.minimap.zoomable ?? true}
            />
          ) : null}
        </ReactFlow>
      )}
      <ThemePanel
        open={themePanelOpen}
        themes={themes}
        activeThemeId={theme.id}
        onClose={() => setThemePanelOpen(false)}
        onSelect={(nextTheme) => {
          if (readonly) {
            setLocalTheme(nextTheme);
          } else {
            runCommand({
              type: "theme.set",
              theme: nextTheme,
              meta: { source: "toolbar", label: "Set theme" },
            });
          }
          props.onThemeChange?.(nextTheme);
        }}
      />
      <SearchPanel
        document={document}
        open={searchOpen && !props.search?.hidden}
        onResultClick={(result) => {
          const ancestors = getAncestorIds(document, result.nodeId);
          let targetViewRootId = ancestors[ancestors.length - 1] ?? document.rootId;

          if (splitMode === "split") {
            const branchId = getRootBranchIdForNode(document, result.nodeId);
            if (branchId) {
              setSelectedBranchId(branchId);
              if (targetViewRootId === document.rootId) {
                targetViewRootId = branchId;
              }
            } else {
              if (selectedBranchId) {
                targetViewRootId = selectedBranchId;
              } else if (rootBranchIds.length > 0) {
                targetViewRootId = rootBranchIds[0] as NodeId;
              }
            }
          }

          enterViewRoot(targetViewRootId);
          commitSelection({
            nodeIds: [result.nodeId],
            connectionIds: [],
            anchorNodeId: result.nodeId,
          });
          props.onSearchResultClick?.(result);
        }}
      />
      {inspectorOpen && !props.inspector?.hidden ? (
        <InspectorPanel
          document={document}
          selectedNodeId={selectedNodeId}
          readonly={readonly}
          onOpenLink={openNodeLink}
          onPatchNode={(nodeId, patch) =>
            runCommand({
              type: "node.update",
              nodeId,
              patch,
              meta: { source: "toolbar", label: "Inspect node" },
            })
          }
        />
      ) : null}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={[
        "mmn-editor",
        props.className,
        isSplitMode && "mmn-editor--split-mode",
        sidebarCollapsed && "mmn-editor--sidebar-collapsed",
        sidebarPreviewOpen && "mmn-editor--sidebar-preview-open",
        sidebarPinned && "mmn-editor--sidebar-pinned",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onKeyDown={onKeyDown}
      tabIndex={0}
      data-theme-mode={theme.mode ?? "light"}
      data-has-breadcrumbs={props.breadcrumbs?.hidden ? undefined : "true"}
    >
      {isSplitMode ? (
        <div
          className="mmn-branch-layout"
          style={{ "--mmn-branch-sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        >
          {(!sidebarCollapsed || sidebarPreviewOpen) && (
            <BranchListPanel
              document={document}
              branchIds={rootBranchIds}
              selectedBranchId={selectedBranchId}
              collapsed={sidebarCollapsed}
              previewOpen={sidebarPreviewOpen}
              pinned={sidebarPinned}
              themeMode={theme.mode === "dark" ? "dark" : "light"}
              onSelectBranch={handleSelectBranch}
              onCollapse={handleCollapseSidebar}
              onPin={handlePinSidebar}
              onMouseLeave={handlePreviewSidebarLeave}
            />
          )}
          {!sidebarCollapsed && (
            <div
              className="mmn-branch-resize-handle"
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={sidebarWidth}
              aria-valuemin={branchListLayout?.minSidebarWidth ?? 220}
              aria-valuemax={
                containerRef.current
                  ? Math.round(
                      containerRef.current.getBoundingClientRect().width *
                        (branchListLayout?.maxSidebarWidthRatio ?? 0.45),
                    )
                  : 500
              }
              onPointerDown={handleResizePointerDown}
            />
          )}
          {sidebarCollapsed && !sidebarPreviewOpen && (
            <button
              type="button"
              className="mmn-branch-expand-btn"
              title="Show branch list"
              aria-label="Show branch list"
              onClick={handlePreviewSidebar}
              onFocus={handlePreviewSidebar}
              onMouseEnter={handlePreviewSidebar}
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <div className="mmn-branch-layout__canvas">{renderCanvasContent()}</div>
        </div>
      ) : (
        renderCanvasContent()
      )}

      {isBranchListEligible && (
        <BranchListToggleButton
          open={isSplitMode}
          onClick={handleToggleMode}
          editorContainer={containerRef.current}
        />
      )}
    </div>
  );
}

export function MindMapEditor(props: MindMapEditorProps) {
  return (
    <ReactFlowProvider>
      <EditorCanvas {...props} />
    </ReactFlowProvider>
  );
}
