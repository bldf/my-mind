import "@xyflow/react/dist/style.css";
import "./styles.css";

import {
  applyLayoutResult,
  asNodeId,
  cloneDocument,
  createEmptyDocument,
  dispatchCommand,
  getAncestorIds,
  serializeDocument,
  simpleTreeLayout,
  type MindMapDocument,
  type MindMapError,
  type MindMapNode,
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
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { documentToFlow, type FlowConversionResult } from "./document-to-flow";
import { BezierEdge } from "./edges/BezierEdge";
import { isSafeExternalUrl, openSafeExternalUrl } from "./link-utils";
import { MindNode } from "./nodes/MindNode";
import { resolveTheme, defaultThemes } from "./themes";
import type { MindMapEditorProps, ViewToolbarControl, CopyDataFormat } from "./types";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { InspectorPanel } from "./components/InspectorPanel";
import { SearchPanel } from "./components/SearchPanel";
import { ThemePanel } from "./components/ThemePanel";
import { BranchListPanel } from "./components/BranchListPanel";
import { BranchListToggleButton } from "./components/BranchListToggleButton";
import { Toolbar } from "./components/Toolbar";
import { getTreeMaxDepth, getRootBranchIdForNode } from "./layout-helpers";
import { PanelLeftOpen } from "lucide-react";
import {
  EDIT_HISTORY_CONTROLS,
  mergeFlowNodeData,
  normalizeToolbarControls,
  resolveDragInteractionSettings,
  type MindFlowNode,
} from "./editor-utils";
import { useViewportControl } from "./hooks/useViewportControl";
import { useHistory } from "./hooks/useHistory";
import { useDragInteraction, type DragSession } from "./hooks/useDragInteraction";
import { useBranchListState } from "./hooks/useBranchListState";

export { isTextInputActive } from "./editor-utils";

const nodeTypes = { mindNode: MindNode };
const edgeTypes = { mindBezier: BezierEdge };
const DEFAULT_EDITABLE_TOOLBAR: ViewToolbarControl[] = [
  "theme", "undo", "redo", "reset", "search", "inspector", "fullscreen", "zoomOut", "zoomIn", "fitView", "copy",
];
const DEFAULT_READONLY_TOOLBAR: ViewToolbarControl[] = [
  "theme", "search", "fullscreen", "zoomOut", "zoomIn", "fitView", "copy",
];
const CANVAS_MIN_ZOOM = 0.08;
const CANVAS_MAX_ZOOM = 2;

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

  // Branch list configuration
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

  // UI state
  const [themePanelOpen, setThemePanelOpen] = useState(Boolean(props.themePanel?.defaultOpen));
  const [searchOpen, setSearchOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(!props.inspector?.hidden);
  const [localTheme, setLocalTheme] = useState<MindMapTheme | undefined>(props.theme);
  const [copiedFormat, setCopiedFormat] = useState<CopyDataFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const didInitialFlowDataSync = useRef(false);
  const copyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flowNodes, setFlowNodes] = useState<MindFlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowConversionResult["edges"]>([]);
  const [prevFlowData, setPrevFlowData] = useState<FlowConversionResult | null>(null);
  const latestFlowDataRef = useRef<FlowConversionResult>({ nodes: [], edges: [] });

  // Shared refs
  const dragSessionRef = useRef<DragSession | null>(null);
  const nodeResizeActiveRef = useRef(false);

  // Theme
  const theme = resolveTheme(localTheme ?? props.theme, document.theme);
  const themes = props.themePanel?.themes ?? defaultThemes;
  const selectedNodeId = selection.nodeIds.find((nodeId) => document.nodes[nodeId]);
  const dragSettings = useMemo(
    () => resolveDragInteractionSettings(props.dragInteraction),
    [props.dragInteraction],
  );
  const flow = useReactFlow();

  // --- Viewport control hook ---
  const {
    isFullscreen,
    renderedNodeCountRef,
    scheduleFitView,
    scheduleFit1to1View,
    scheduleCenterView,
    flushPendingViewportUpdate,
    clearFitViewFrame,
  } = useViewportControl({
    containerRef,
    dragSessionRef,
    nodeResizeActiveRef,
    flowDataNodesLength: flowNodes.length,
    viewportProps: props.viewport,
  });

  // --- History hook ---
  const commitDocument = useCallback(
    (nextDocument: MindMapDocument) => {
      if (!controlled) setInternalDocument(nextDocument);
      props.onChange?.(nextDocument);
    },
    [controlled, props],
  );
  const reportError = useCallback(
    (error: MindMapError) => { props.onError?.(error); },
    [props],
  );
  const {
    history,
    historyAvailability,
    syncHistoryAvailability,
    canReset,
    undo,
    redo,
    resetToInitialDocument,
  } = useHistory({ document, initialDocumentRef, commitDocument, readonly });

  // --- Branch list state hook ---
  const {
    effectiveViewRootId,
    splitMode,
    selectedBranchId,
    sidebarCollapsed,
    sidebarPreviewOpen,
    sidebarPinned,
    sidebarWidth,
    branchSwitchPending,
    pendingBranchViewportUpdateRef,
    handleSelectBranch,
    handleToggleMode,
    enterViewRoot,
    handleResizePointerDown,
    handleCollapseSidebar,
    handlePreviewSidebar,
    handlePreviewSidebarLeave,
    handlePinSidebar,
    clearBranchSwitchFrame,
    clearBranchSwitchTimeout,
  } = useBranchListState({
    document,
    rootBranchIds,
    isBranchListEligible,
    branchListLayout,
    onViewRootChange,
    scheduleFitView,
    scheduleFit1to1View,
    scheduleCenterView,
    containerRef,
    viewportFitViewOnInit: props.viewport?.fitViewOnInit,
  });

  // --- Core callbacks ---
  const openNodeLink = useCallback(
    (url: string, node: MindMapNode) => {
      if (props.onOpenLink) { props.onOpenLink(url, node); return; }
      if (!isSafeExternalUrl(url)) {
        reportError({ code: "UNSAFE_LINK_URL", message: "Link URL is not allowed", details: { nodeId: node.id }, recoverable: true });
        return;
      }
      if (!openSafeExternalUrl(url)) {
        reportError({ code: "OPEN_LINK_FAILED", message: "Link could not be opened", details: { nodeId: node.id }, recoverable: true });
      }
    },
    [props, reportError],
  );
  const commitSelection = useCallback(
    (nextSelection: SelectionState) => { setSelection(nextSelection); props.onSelectionChange?.(nextSelection); },
    [props],
  );
  const autoLayoutDocument = useCallback(
    (nextDocument: MindMapDocument) => applyLayoutResult(nextDocument, simpleTreeLayout(nextDocument)),
    [],
  );
  const runCommand = useCallback(
    (command: Parameters<typeof dispatchCommand>[1], options: { autoLayout?: boolean } = {}) => {
      if (readonly && !command.type.startsWith("selection.")) return;
      const result = dispatchCommand(document, command);
      if (!result.ok) { reportError(result.error); return; }
      const nextDocument = options.autoLayout && result.operation ? autoLayoutDocument(result.document) : result.document;
      if (result.selection) commitSelection(result.selection);
      if (result.operation) {
        history.current.past.push({ ...result.operation, after: nextDocument });
        history.current.future = [];
        syncHistoryAvailability();
      }
      if (nextDocument !== document) commitDocument(nextDocument);
      return { ...result, document: nextDocument };
    },
    [autoLayoutDocument, commitDocument, commitSelection, document, history, readonly, reportError, syncHistoryAvailability],
  );

  // --- Drag interaction hook ---
  const {
    dropIntent,
    flashNodeId,
    clearFlashTimer,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  } = useDragInteraction({
    containerRef,
    flowNodes,
    flowDataRef: latestFlowDataRef,
    document,
    dragSettings,
    selectionNodeIds: selection.nodeIds,
    effectiveViewRootId,
    readonly,
    dragSessionRef,
    flushPendingViewportUpdate,
    runCommand,
    commitSelection,
    reportError,
    setFlowNodes,
    setFlowEdges,
  });

  // --- Node commands ---
  const addChildNode = useCallback(
    (parentId: NodeId) => {
      if (readonly) return;
      const previousChildren = new Set(document.nodes[parentId]?.children ?? []);
      const result = runCommand({ type: "node.create", parentId, title: "New child", meta: { source: "canvas", label: "Add child" } }, { autoLayout: true });
      if (!result?.ok) return;
      const createdNodeId = result.document.nodes[parentId]?.children.find((childId) => !previousChildren.has(childId));
      if (createdNodeId) commitSelection({ nodeIds: [createdNodeId], connectionIds: [], anchorNodeId: createdNodeId });
    },
    [commitSelection, document.nodes, readonly, runCommand],
  );
  const toggleNodeCollapse = useCallback(
    (nodeId: NodeId) => {
      const node = document.nodes[nodeId];
      if (!node || readonly) return;
      runCommand({ type: "node.collapse", nodeIds: [nodeId], collapsed: !node.collapsed, meta: { source: "canvas", label: "Toggle collapse" } }, { autoLayout: true });
    },
    [document.nodes, readonly, runCommand],
  );
  const expandCollapsedNode = useCallback(
    (nodeId: NodeId) => {
      const node = document.nodes[nodeId];
      if (!node || readonly || !node.collapsed) return;
      runCommand({ type: "node.collapse", nodeIds: [nodeId], collapsed: false, meta: { source: "canvas", label: "Expand collapsed branch" } }, { autoLayout: true });
    },
    [document.nodes, readonly, runCommand],
  );
  const resizeNodes = useCallback(
    (nodeIds: NodeId[], delta: number) => {
      runCommand({ type: "node.resize", nodeIds, delta, minScale: props.nodeSizing?.minScale, maxScale: props.nodeSizing?.maxScale }, { autoLayout: true });
    },
    [props.nodeSizing?.maxScale, props.nodeSizing?.minScale, runCommand],
  );
  const onResizeProgress = useCallback((nodeId: NodeId, scale: number) => {
    nodeResizeActiveRef.current = true;
    setFlowNodes((currentNodes) =>
      currentNodes.map((flowNode) => {
        if (flowNode.id === nodeId) {
          return { ...flowNode, data: { ...flowNode.data, node: { ...flowNode.data.node, style: { ...flowNode.data.node.style, scale } } } };
        }
        return flowNode;
      }),
    );
  }, []);
  const onResizeCommit = useCallback(
    (nodeId: NodeId, scale: number) => {
      nodeResizeActiveRef.current = false;
      flushPendingViewportUpdate();
      const node = document.nodes[nodeId];
      if (!node) return;
      const startScale = node.style.scale ?? 1;
      const delta = Number((scale - startScale).toFixed(2));
      if (delta !== 0) resizeNodes([nodeId], delta);
    },
    [document.nodes, flushPendingViewportUpdate, resizeNodes],
  );
  const onTitleCommit = useCallback(
    (nodeId: NodeId, title: string) => {
      runCommand({ type: "node.update", nodeId, patch: { title }, meta: { source: "canvas", label: "Rename node" } });
      flushPendingViewportUpdate();
    },
    [flushPendingViewportUpdate, runCommand],
  );

  // --- Flow data ---
  const flowData = useMemo(
    () => documentToFlow(document, {
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
    [addChildNode, document, dragSettings.showAddChildControl, dragSettings.showCollapseControl, dropIntent, effectiveViewRootId, enterViewRoot, expandCollapsedNode, flashNodeId, onTitleCommit, props.nodeSizing?.scaleStep, props.nodeSizing?.showQuickControls, props.nodeSizing?.minScale, props.nodeSizing?.maxScale, props.renderNode, readonly, resizeNodes, onResizeProgress, onResizeCommit, selection.nodeIds, openNodeLink, toggleNodeCollapse, theme],
  );
  latestFlowDataRef.current = flowData;

  if (prevFlowData !== null && flowData !== prevFlowData) {
    setPrevFlowData(flowData);
    setFlowEdges(flowData.edges);
    setFlowNodes((currentNodes) => mergeFlowNodeData(flowData, currentNodes, Boolean(dragSessionRef.current)));
  }
  useEffect(() => {
    if (didInitialFlowDataSync.current) return;
    didInitialFlowDataSync.current = true;
    setPrevFlowData(flowData);
    setFlowEdges(flowData.edges);
    setFlowNodes((currentNodes) => mergeFlowNodeData(flowData, currentNodes, Boolean(dragSessionRef.current)));
  }, [flowData]);

  // --- Search hidden sync ---
  useEffect(() => { if (props.search?.hidden) setSearchOpen(false); }, [props.search?.hidden]);

  // --- Auto-fit ---
  const autoFitKey = `${document.id}:${effectiveViewRootId}`;
  const renderedNodes = flowNodes.length > 0 || flowData.nodes.length === 0 ? flowNodes : flowData.nodes;
  const renderedEdges = flowEdges.length > 0 || flowData.edges.length === 0 ? flowEdges : flowData.edges;
  const renderedNodesContainEffectiveRoot = renderedNodes.some((node) => node.id === String(effectiveViewRootId));
  renderedNodeCountRef.current = renderedNodes.length;

  useEffect(() => {
    if (props.viewport?.fitViewOnInit === false || flowData.nodes.length === 0 || !renderedNodesContainEffectiveRoot) return;
    if (lastAutoFitKey.current === autoFitKey) return;
    if (pendingBranchViewportUpdateRef.current) return;
    lastAutoFitKey.current = autoFitKey;
    const viewportOptions = { waitForNodeId: effectiveViewRootId };
    if (props.viewport?.fitViewOnInit === true) scheduleFitView(viewportOptions);
    else scheduleFit1to1View(viewportOptions);
  }, [autoFitKey, effectiveViewRootId, flowData.nodes.length, props.viewport?.fitViewOnInit, renderedNodesContainEffectiveRoot, scheduleFitView, scheduleFit1to1View, pendingBranchViewportUpdateRef]);

  useEffect(() => {
    if (!pendingBranchViewportUpdateRef.current) return;
    if (splitMode !== "split" || renderedNodes.length === 0 || !renderedNodesContainEffectiveRoot) return;
    pendingBranchViewportUpdateRef.current = false;
  }, [effectiveViewRootId, renderedNodes.length, renderedNodesContainEffectiveRoot, splitMode, pendingBranchViewportUpdateRef]);

  // --- Cleanup ---
  const lastAutoFitKey = useRef("");
  useEffect(() => {
    return () => {
      clearFlashTimer();
      clearFitViewFrame();
      clearBranchSwitchFrame();
      clearBranchSwitchTimeout();
      if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current);
    };
  }, [clearBranchSwitchFrame, clearBranchSwitchTimeout, clearFitViewFrame, clearFlashTimer]);

  // --- Nodes change ---
  const onNodesChange = useCallback<OnNodesChange<MindFlowNode>>((changes) => {
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  // --- Copy action handler ---
  const onCopyData = props.onCopyData;
  const onCopySuccess = props.onCopySuccess;

  const handleCopyAction = useCallback(
    async (format: CopyDataFormat) => {
      setCopiedFormat(null);
      let text = "";
      if (onCopyData) {
        try {
          const result = await onCopyData({ format, document });
          if (typeof result === "string") {
            text = result;
          } else if (result && typeof result === "object") {
            if (!result.ok) {
              reportError(result.error);
              return;
            }
            text = result.text;
          }
        } catch (err) {
          reportError({
            code: "COPY_FAILED",
            message: err instanceof Error ? err.message : "Copy failed during callback execution",
            recoverable: true,
          });
          return;
        }
      } else {
        if (format === "json") {
          text = serializeDocument(document);
        } else {
          reportError({
            code: "COPY_NOT_CONFIGURED",
            message: `Provide onCopyData callback to support ${format} format copy`,
            recoverable: true,
          });
          return;
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current);
        setCopiedFormat(format);
        copyStatusTimerRef.current = setTimeout(() => {
          setCopiedFormat(null);
          copyStatusTimerRef.current = null;
        }, 1600);
        onCopySuccess?.(format);
      } catch (err) {
        reportError({
          code: "CLIPBOARD_WRITE_FAILED",
          message: err instanceof Error ? err.message : "Clipboard write permission denied or unavailable",
          recoverable: true,
        });
      }
    },
    [document, onCopyData, onCopySuccess, reportError],
  );

  // --- Toolbar & keyboard ---
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
        if (props.viewport?.fitViewOnInit === true) scheduleFitView();
        else scheduleFit1to1View({ waitForNodeId: effectiveViewRootId });
      }
      if (control === "fullscreen") {
        const target = containerRef.current;
        const ownerDocument = target?.ownerDocument;
        if (!target || !ownerDocument) return;
        if (ownerDocument.fullscreenElement === target) {
          if (!ownerDocument.exitFullscreen) { reportError({ code: "FULLSCREEN_EXIT_UNAVAILABLE", message: "Exit fullscreen API is not available", recoverable: true }); return; }
          await ownerDocument.exitFullscreen().catch((error: unknown) => reportError({ code: "FULLSCREEN_EXIT_FAILED", message: error instanceof Error ? error.message : "Fullscreen exit failed", recoverable: true }));
        } else if (!target.requestFullscreen) {
          reportError({ code: "FULLSCREEN_UNAVAILABLE", message: "Fullscreen API is not available", recoverable: true });
        } else {
          await target.requestFullscreen().catch((error: unknown) => reportError({ code: "FULLSCREEN_FAILED", message: error instanceof Error ? error.message : "Fullscreen request failed", recoverable: true }));
        }
      }
      if (control === "export") {
        reportError({ code: "EXPORT_NOT_CONFIGURED", message: "Provide @my-mind-node/exporters to enable toolbar export", recoverable: true });
      }
    },
    [flow, props.search?.hidden, props.viewport?.fitViewOnInit, readonly, redo, reportError, resetToInitialDocument, scheduleFit1to1View, scheduleFitView, undo, effectiveViewRootId],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const selected = selectedNodeId ?? effectiveViewRootId;
      const parentId = document.nodes[selected]?.parentId ?? document.rootId;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) { event.preventDefault(); redo(); return; }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); return; }
      if (readonly) return;
      if (event.key === "Tab") { event.preventDefault(); runCommand({ type: "node.create", parentId: selected, title: "New child", meta: { source: "keyboard" } }); }
      if (event.key === "Enter") { event.preventDefault(); runCommand({ type: "node.create", parentId, title: "New sibling", meta: { source: "keyboard" } }); }
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); for (const nodeId of selection.nodeIds) runCommand({ type: "node.delete", nodeId, meta: { source: "keyboard" } }); }
      if (event.key === "Escape") commitSelection({ nodeIds: [], connectionIds: [] });
    },
    [commitSelection, document.nodes, document.rootId, effectiveViewRootId, readonly, redo, runCommand, selectedNodeId, selection.nodeIds, undo],
  );

  // --- Render config ---
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
  const rawControls = props.toolbar?.controls ?? (readonly ? DEFAULT_READONLY_TOOLBAR : DEFAULT_EDITABLE_TOOLBAR);
  const controls = useMemo(() => normalizeToolbarControls(rawControls, { readonly, searchHidden: Boolean(props.search?.hidden) }), [props.search?.hidden, rawControls, readonly]);
  const disabledControls = useMemo(() => ({ undo: !historyAvailability.canUndo, redo: !historyAvailability.canRedo, reset: readonly || !canReset }), [canReset, historyAvailability.canRedo, historyAvailability.canUndo, readonly]);
  const activeControls = useMemo(() => ({ fullscreen: isFullscreen }), [isFullscreen]);
  const toolbarLabels = useMemo(() => ({ fullscreen: isFullscreen ? "Exit fullscreen" : "Fullscreen" }), [isFullscreen]);
  const isSplitMode = splitMode === "split";

  const renderCanvasContent = () => (
    <>
      {!props.breadcrumbs?.hidden || !props.toolbar?.hidden ? (
        <div className="mmn-editor__topbar">
          {!props.breadcrumbs?.hidden ? <Breadcrumbs document={document} viewRootId={effectiveViewRootId} onNavigate={enterViewRoot} /> : null}
          {!props.toolbar?.hidden ? (
            <div className="mmn-toolbar-stack">
              <Toolbar
                controls={controls}
                activeControls={activeControls}
                disabledControls={disabledControls}
                labels={toolbarLabels}
                onAction={onToolbarAction}
                copyConfig={props.toolbar?.copy}
                onCopyAction={handleCopyAction}
              />
              {copiedFormat ? (
                <div className="mmn-toolbar__copy-status" role="status" aria-live="polite">
                  Copied {copiedFormat.toUpperCase()}
                </div>
              ) : null}
            </div>
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
            const nodeIds = append ? selection.nodeIds.includes(nodeId) ? selection.nodeIds.filter((id) => id !== nodeId) : [...selection.nodeIds, nodeId] : [nodeId];
            commitSelection({ nodeIds, connectionIds: [], anchorNodeId: nodeId });
          }}
          onPaneClick={() => commitSelection({ nodeIds: [], connectionIds: [] })}
          onPaneContextMenu={(event) => { event.preventDefault(); enterViewRoot(selectedNodeId ?? effectiveViewRootId); }}
        >
          {props.minimap?.visible === true ? <MiniMap pannable={props.minimap.pannable ?? true} zoomable={props.minimap.zoomable ?? true} /> : null}
        </ReactFlow>
      )}
      <ThemePanel
        open={themePanelOpen}
        themes={themes}
        activeThemeId={theme.id}
        onClose={() => setThemePanelOpen(false)}
        onSelect={(nextTheme) => {
          if (readonly) setLocalTheme(nextTheme);
          else runCommand({ type: "theme.set", theme: nextTheme, meta: { source: "toolbar", label: "Set theme" } });
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
              if (targetViewRootId === document.rootId) targetViewRootId = branchId;
            } else if (selectedBranchId) {
              targetViewRootId = selectedBranchId;
            } else if (rootBranchIds.length > 0) {
              targetViewRootId = rootBranchIds[0] as NodeId;
            }
          }
          enterViewRoot(targetViewRootId);
          commitSelection({ nodeIds: [result.nodeId], connectionIds: [], anchorNodeId: result.nodeId });
          props.onSearchResultClick?.(result);
        }}
      />
      {inspectorOpen && !props.inspector?.hidden ? (
        <InspectorPanel
          document={document}
          selectedNodeId={selectedNodeId}
          readonly={readonly}
          onOpenLink={openNodeLink}
          onPatchNode={(nodeId, patch) => runCommand({ type: "node.update", nodeId, patch, meta: { source: "toolbar", label: "Inspect node" } })}
        />
      ) : null}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={["mmn-editor", props.className, isSplitMode && "mmn-editor--split-mode", branchSwitchPending && "mmn-editor--branch-switching", sidebarCollapsed && "mmn-editor--sidebar-collapsed", sidebarPreviewOpen && "mmn-editor--sidebar-preview-open", sidebarPinned && "mmn-editor--sidebar-pinned"].filter(Boolean).join(" ")}
      style={style}
      onKeyDown={onKeyDown}
      tabIndex={0}
      data-theme-mode={theme.mode ?? "light"}
      data-has-breadcrumbs={props.breadcrumbs?.hidden ? undefined : "true"}
    >
      {isSplitMode ? (
        <div className="mmn-branch-layout" style={{ "--mmn-branch-sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
          {(!sidebarCollapsed || sidebarPreviewOpen) && (
            <BranchListPanel
              document={document}
              branchIds={rootBranchIds}
              selectedBranchId={selectedBranchId}
              selectedNodeId={effectiveViewRootId}
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
              aria-valuemax={containerRef.current ? Math.round(containerRef.current.getBoundingClientRect().width * (branchListLayout?.maxSidebarWidthRatio ?? 0.45)) : 500}
              onPointerDown={handleResizePointerDown}
            />
          )}
          {sidebarCollapsed && !sidebarPreviewOpen && (
            <button type="button" className="mmn-branch-expand-btn" title="Show branch list" aria-label="Show branch list" onClick={handlePreviewSidebar} onFocus={handlePreviewSidebar} onMouseEnter={handlePreviewSidebar}>
              <PanelLeftOpen size={16} />
            </button>
          )}
          <div className="mmn-branch-layout__canvas">{renderCanvasContent()}</div>
        </div>
      ) : (
        renderCanvasContent()
      )}
      {isBranchListEligible && (
        <BranchListToggleButton open={isSplitMode} onClick={handleToggleMode} editorContainer={containerRef.current} />
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
