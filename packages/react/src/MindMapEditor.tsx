import "@xyflow/react/dist/style.css";
import "./styles.css";

import {
  applyOperation,
  applyLayoutResult,
  asNodeId,
  createEmptyDocument,
  dispatchCommand,
  getAncestorIds,
  simpleTreeLayout,
  type MindMapDocument,
  type MindMapError,
  type MindMapOperation,
  type MindMapTheme,
  type NodeId,
  type SelectionState,
} from "@my-mind-node/core";
import {
  applyNodeChanges,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  type Node,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  EMPTY_DROP_INTENT,
  getDropValidationReason,
  getDropZone,
  getSortInsertionIndex,
  getTopLevelMovableNodeIds,
  type DropIntent,
} from "./drag-interactions";
import { documentToFlow, type FlowConversionResult } from "./document-to-flow";
import { BezierEdge } from "./edges/BezierEdge";
import { MindNode, type MindNodeData } from "./nodes/MindNode";
import { resolveTheme, defaultThemes } from "./themes";
import type { MindMapEditorProps, ViewToolbarControl } from "./types";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { InspectorPanel } from "./components/InspectorPanel";
import { SearchPanel } from "./components/SearchPanel";
import { ThemePanel } from "./components/ThemePanel";
import { Toolbar } from "./components/Toolbar";

const nodeTypes = { mindNode: MindNode };
const edgeTypes = { mindBezier: BezierEdge };
const DEFAULT_TOOLBAR: ViewToolbarControl[] = ["theme", "search", "inspector", "fullscreen", "zoomOut", "zoomIn", "fitView"];

interface HistoryState {
  past: MindMapOperation[];
  future: MindMapOperation[];
}

type MindFlowNode = Node<MindNodeData, "mindNode">;

interface DragInteractionSettings {
  enabled: boolean;
  reparentDwellMs: number;
  sortZoneRatio: number;
  flashDurationMs: number;
  autoLayoutOnDrop: boolean;
  showAddChildControl: boolean;
  showCollapseControl: boolean;
}

interface DragSession {
  nodeIds: NodeId[];
}

function resolveDragInteractionSettings(config: MindMapEditorProps["dragInteraction"]): DragInteractionSettings {
  return {
    enabled: config?.enabled ?? true,
    reparentDwellMs: config?.reparentDwellMs ?? 2000,
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
  const escape = "CSS" in globalThis && typeof CSS.escape === "function" ? CSS.escape(nodeId) : nodeId.replace(/"/g, '\\"');
  return container.querySelector<HTMLElement>(`.react-flow__node[data-id="${escape}"]`);
}

function mergeFlowNodeData(nextData: FlowConversionResult, currentNodes: MindFlowNode[], keepPositions: boolean): MindFlowNode[] {
  if (!keepPositions) return nextData.nodes;
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  return nextData.nodes.map((nextNode) => {
    const currentNode = currentById.get(nextNode.id);
    return currentNode
      ? {
          ...nextNode,
          position: currentNode.position,
          selected: currentNode.selected,
        }
      : nextNode;
  });
}

function EditorCanvas(props: MindMapEditorProps) {
  const controlled = props.value !== undefined;
  const [internalDocument, setInternalDocument] = useState(() => props.defaultValue ?? createEmptyDocument());
  const document = props.value ?? internalDocument;
  const readonly = Boolean(props.readonly);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], connectionIds: [] });
  const [viewRootId, setViewRootId] = useState<NodeId>(document.rootId);
  const [themePanelOpen, setThemePanelOpen] = useState(Boolean(props.themePanel?.defaultOpen));
  const [searchOpen, setSearchOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(!props.inspector?.hidden);
  const [localTheme, setLocalTheme] = useState<MindMapTheme | undefined>(props.theme);
  const history = useRef<HistoryState>({ past: [], future: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoFitKey = useRef("");
  const flow = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const theme = resolveTheme(localTheme ?? props.theme, document.theme);
  const themes = props.themePanel?.themes ?? defaultThemes;
  const selectedNodeId = selection.nodeIds[0];
  const dragSettings = useMemo(() => resolveDragInteractionSettings(props.dragInteraction), [props.dragInteraction]);
  const dragSession = useRef<DragSession | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTargetId = useRef<NodeId | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent>(EMPTY_DROP_INTENT);
  const dropIntentRef = useRef<DropIntent>(EMPTY_DROP_INTENT);
  const [flashNodeId, setFlashNodeId] = useState<NodeId | undefined>();
  const [flowNodes, setFlowNodes] = useState<MindFlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowConversionResult["edges"]>([]);

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

  const commitSelection = useCallback(
    (nextSelection: SelectionState) => {
      setSelection(nextSelection);
      props.onSelectionChange?.(nextSelection);
    },
    [props],
  );

  const autoLayoutDocument = useCallback((nextDocument: MindMapDocument) => {
    return applyLayoutResult(nextDocument, simpleTreeLayout(nextDocument));
  }, []);

  const clearDwellTimer = useCallback(() => {
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
    dwellTargetId.current = null;
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
      flashTimer.current = setTimeout(() => setFlashNodeId(undefined), dragSettings.flashDurationMs);
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
      const nextDocument = options.autoLayout && result.operation ? autoLayoutDocument(result.document) : result.document;
      if (result.selection) commitSelection(result.selection);
      if (result.operation) {
        history.current.past.push({ ...result.operation, after: nextDocument });
        history.current.future = [];
      }
      if (nextDocument !== document) commitDocument(nextDocument);
      return { ...result, document: nextDocument };
    },
    [autoLayoutDocument, commitDocument, commitSelection, document, readonly, reportError],
  );

  const addChildNode = useCallback(
    (parentId: NodeId) => {
      if (readonly) return;
      const previousChildren = new Set(document.nodes[parentId]?.children ?? []);
      const result = runCommand(
        { type: "node.create", parentId, title: "New child", meta: { source: "canvas", label: "Add child" } },
        { autoLayout: true },
      );
      if (!result?.ok) return;
      const createdNodeId = result.document.nodes[parentId]?.children.find((childId) => !previousChildren.has(childId));
      if (createdNodeId) {
        commitSelection({ nodeIds: [createdNodeId], connectionIds: [], anchorNodeId: createdNodeId });
      }
    },
    [commitSelection, document.nodes, readonly, runCommand],
  );

  const toggleNodeCollapse = useCallback(
    (nodeId: NodeId) => {
      const node = document.nodes[nodeId];
      if (!node || readonly) return;
      runCommand(
        { type: "node.collapse", nodeIds: [nodeId], collapsed: !node.collapsed, meta: { source: "canvas", label: "Toggle collapse" } },
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
  }, [commitDocument]);

  const redo = useCallback(() => {
    const operation = history.current.future.shift();
    if (!operation) return;
    history.current.past.push(operation);
    commitDocument(applyOperation(operation, "forward"));
  }, [commitDocument]);

  const enterViewRoot = useCallback(
    (nodeId: NodeId) => {
      if (!document.nodes[nodeId]) return;
      setViewRootId(nodeId);
      props.onViewRootChange?.(nodeId);
    },
    [document.nodes, props],
  );

  const resizeNodes = useCallback(
    (nodeIds: NodeId[], delta: number) => {
      runCommand({
        type: "node.resize",
        nodeIds,
        delta,
        minScale: props.nodeSizing?.minScale,
        maxScale: props.nodeSizing?.maxScale,
      });
    },
    [props.nodeSizing?.maxScale, props.nodeSizing?.minScale, runCommand],
  );

  const onTitleCommit = useCallback(
    (nodeId: NodeId, title: string) => {
      runCommand({ type: "node.update", nodeId, patch: { title }, meta: { source: "canvas", label: "Rename node" } });
    },
    [runCommand],
  );

  const flowData = useMemo(
    () =>
      documentToFlow(document, {
        viewRootId,
        selectedNodeIds: selection.nodeIds,
        readonly,
        dropIntent,
        flashNodeId,
        showAddChildControl: dragSettings.showAddChildControl,
        showCollapseControl: dragSettings.showCollapseControl,
        onTitleCommit,
        onEnterNodeView: enterViewRoot,
        onResizeNode: resizeNodes,
        onAddChild: addChildNode,
        onToggleCollapse: toggleNodeCollapse,
        renderNode: props.renderNode,
      }),
    [
      addChildNode,
      document,
      dragSettings.showAddChildControl,
      dragSettings.showCollapseControl,
      dropIntent,
      enterViewRoot,
      flashNodeId,
      onTitleCommit,
      props.renderNode,
      readonly,
      resizeNodes,
      selection.nodeIds,
      toggleNodeCollapse,
      viewRootId,
    ],
  );

  useEffect(() => {
    setFlowEdges(flowData.edges);
    setFlowNodes((currentNodes) => mergeFlowNodeData(flowData, currentNodes, Boolean(dragSession.current)));
  }, [flowData]);

  const onNodesChange = useCallback<OnNodesChange<MindFlowNode>>((changes) => {
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const getDropIntentAtPoint = useCallback(
    (point: { x: number; y: number }, movingNodeIds: NodeId[]): DropIntent => {
      const container = containerRef.current;
      if (!container) return EMPTY_DROP_INTENT;

      const movingSet = new Set(movingNodeIds.map(String));
      const hitTargets = flowNodes.flatMap((flowNode) => {
        if (movingSet.has(flowNode.id)) return [];
        const element = getNodeElement(container, flowNode.id);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        const containsPoint = point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
        return containsPoint ? [{ id: asNodeId(flowNode.id), rect, area: rect.width * rect.height }] : [];
      });

      const hitTarget = hitTargets.sort((a, b) => a.area - b.area)[0];
      if (!hitTarget) return EMPTY_DROP_INTENT;

      const zone = getDropZone(point.y, hitTarget.rect.top, hitTarget.rect.height, dragSettings.sortZoneRatio);
      const mode = zone === "center" ? "reparent" : "sort";
      const reason = getDropValidationReason(document, movingNodeIds, hitTarget.id, mode);
      if (reason) return { type: "invalid", targetId: hitTarget.id, reason };
      if (zone === "center") return { type: "reparent", targetId: hitTarget.id, armed: false };
      return { type: zone === "before" ? "sort-before" : "sort-after", targetId: hitTarget.id };
    },
    [document, dragSettings.sortZoneRatio, flowNodes],
  );

  const updateDropIntent = useCallback(
    (nextIntent: DropIntent) => {
      if (nextIntent.type !== "reparent") {
        clearDwellTimer();
        commitDropIntent(nextIntent);
        return;
      }

      const currentIntent = dropIntentRef.current;
      if (currentIntent.type === "reparent" && currentIntent.targetId === nextIntent.targetId && currentIntent.armed) {
        commitDropIntent(currentIntent);
        return;
      }

      commitDropIntent(nextIntent);
      if (dwellTargetId.current === nextIntent.targetId) return;
      clearDwellTimer();
      dwellTargetId.current = nextIntent.targetId;
      dwellTimer.current = setTimeout(() => {
        dwellTimer.current = null;
        dwellTargetId.current = null;
        const latestIntent = dropIntentRef.current;
        if (latestIntent.type === "reparent" && latestIntent.targetId === nextIntent.targetId && !latestIntent.armed) {
          commitDropIntent({ ...latestIntent, armed: true });
          flashDropTarget(nextIntent.targetId);
        }
      }, dragSettings.reparentDwellMs);
    },
    [clearDwellTimer, commitDropIntent, dragSettings.reparentDwellMs, flashDropTarget],
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
        reportDropError("DROP_TARGET_REQUIRED", "Drop on another node to move or sort this selection");
        return false;
      }
      if (intent.type === "invalid") {
        reportDropError("INVALID_DROP_TARGET", intent.reason, { targetId: intent.targetId });
        return false;
      }
      if (intent.type === "reparent") {
        if (!intent.armed) {
          reportDropError("DROP_DWELL_REQUIRED", "Hold over the node center for 2 seconds to add as a child", { targetId: intent.targetId });
          return false;
        }
        const reason = getDropValidationReason(document, movingNodeIds, intent.targetId, "reparent");
        if (reason) {
          reportDropError("INVALID_DROP_TARGET", reason, { targetId: intent.targetId });
          return false;
        }
        const result = runCommand(
          { type: "node.moveMany", nodeIds: movingNodeIds, parentId: intent.targetId, meta: { source: "canvas", label: "Move nodes" } },
          { autoLayout: dragSettings.autoLayoutOnDrop },
        );
        return Boolean(result?.ok);
      }

      const target = document.nodes[intent.targetId];
      const parentId = target?.parentId;
      const reason = getDropValidationReason(document, movingNodeIds, intent.targetId, "sort");
      const index = getSortInsertionIndex(document, intent.targetId, movingNodeIds, intent.type === "sort-before" ? "before" : "after");
      if (reason || !parentId || index === undefined) {
        reportDropError("INVALID_DROP_TARGET", reason ?? "Sort target is not available", { targetId: intent.targetId });
        return false;
      }
      const result = runCommand(
        {
          type: "node.moveMany",
          nodeIds: movingNodeIds,
          parentId,
          index,
          meta: { source: "canvas", label: intent.type === "sort-before" ? "Sort before node" : "Sort after node" },
        },
        { autoLayout: dragSettings.autoLayoutOnDrop },
      );
      return Boolean(result?.ok);
    },
    [document, dragSettings.autoLayoutOnDrop, reportDropError, runCommand],
  );

  const onNodeDragStart = useCallback<OnNodeDrag<MindFlowNode>>(
    (_event, node) => {
      if (readonly || !dragSettings.enabled) return;
      const nodeId = asNodeId(node.id);
      const selectedNodeIds = selection.nodeIds.includes(nodeId) ? selection.nodeIds : [nodeId];
      const movingNodeIds = getTopLevelMovableNodeIds(document, selectedNodeIds);
      dragSession.current = { nodeIds: movingNodeIds };
      clearDwellTimer();
      commitDropIntent(EMPTY_DROP_INTENT);
      if (!selection.nodeIds.includes(nodeId)) {
        commitSelection({ nodeIds: [nodeId], connectionIds: [], anchorNodeId: nodeId });
      }
    },
    [clearDwellTimer, commitDropIntent, commitSelection, document, dragSettings.enabled, readonly, selection.nodeIds],
  );

  const onNodeDrag = useCallback<OnNodeDrag<MindFlowNode>>(
    (event) => {
      if (readonly || !dragSettings.enabled || !dragSession.current) return;
      const point = getEventClientPoint(event);
      if (!point) return;
      updateDropIntent(getDropIntentAtPoint(point, dragSession.current.nodeIds));
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
      const resolvedIntent = point ? getDropIntentAtPoint(point, session.nodeIds) : currentIntent;
      const finalIntent = currentIntent.type === "none" ? resolvedIntent : currentIntent;
      dragSession.current = null;
      clearDwellTimer();
      const committed = commitDrop(finalIntent, session.nodeIds);
      commitDropIntent(EMPTY_DROP_INTENT);
      if (!committed) {
        setFlowEdges(flowData.edges);
        setFlowNodes(flowData.nodes);
      }
    },
    [clearDwellTimer, commitDrop, commitDropIntent, dragSettings.enabled, flowData.edges, flowData.nodes, getDropIntentAtPoint, readonly],
  );

  const onToolbarAction = useCallback(
    async (control: ViewToolbarControl) => {
      if (control === "theme") setThemePanelOpen((open) => !open);
      if (control === "search") setSearchOpen((open) => !open);
      if (control === "inspector") setInspectorOpen((open) => !open);
      if (control === "zoomIn") flow.zoomIn();
      if (control === "zoomOut") flow.zoomOut();
      if (control === "fitView") flow.fitView({ padding: 0.18 });
      if (control === "fullscreen") {
        const target = containerRef.current;
        if (!target || !target.requestFullscreen) {
          reportError({ code: "FULLSCREEN_UNAVAILABLE", message: "Fullscreen API is not available", recoverable: true });
          return;
        }
        await target.requestFullscreen().catch((error: unknown) =>
          reportError({
            code: "FULLSCREEN_FAILED",
            message: error instanceof Error ? error.message : "Fullscreen request failed",
            recoverable: true,
          }),
        );
      }
      if (control === "export") {
        reportError({ code: "EXPORT_NOT_CONFIGURED", message: "Provide @my-mind-node/exporters to enable toolbar export", recoverable: true });
      }
    },
    [flow, reportError],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const selected = selection.nodeIds[0] ?? viewRootId;
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
        runCommand({ type: "node.create", parentId: selected, title: "New child", meta: { source: "keyboard" } });
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runCommand({ type: "node.create", parentId, title: "New sibling", meta: { source: "keyboard" } });
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
    [commitSelection, document.nodes, document.rootId, readonly, redo, runCommand, selection.nodeIds, undo, viewRootId],
  );

  const style = {
    "--mmn-canvas": theme.colors.canvas,
    "--mmn-node": theme.colors.node,
    "--mmn-node-text": theme.colors.nodeText,
    "--mmn-edge": theme.colors.edge,
    "--mmn-selected": theme.colors.selected,
    "--mmn-accent": theme.colors.accent,
    "--mmn-drop-dwell-duration": `${dragSettings.reparentDwellMs}ms`,
    "--mmn-drop-flash-duration": `${dragSettings.flashDurationMs}ms`,
    height: props.height ?? 640,
  } as CSSProperties;

  const controls = props.toolbar?.controls ?? DEFAULT_TOOLBAR;
  const autoFitKey = `${document.id}:${viewRootId}:${flowData.nodes.length}`;
  const renderedNodes = flowNodes.length > 0 || flowData.nodes.length === 0 ? flowNodes : flowData.nodes;
  const renderedEdges = flowEdges.length > 0 || flowData.edges.length === 0 ? flowEdges : flowData.edges;

  useEffect(() => {
    if (props.viewport?.fitViewOnInit === false || !nodesInitialized || flowData.nodes.length === 0) return;
    if (lastAutoFitKey.current === autoFitKey) return;
    lastAutoFitKey.current = autoFitKey;

    const frame = requestAnimationFrame(() => flow.fitView({ padding: 0.12 }));
    return () => cancelAnimationFrame(frame);
  }, [autoFitKey, flow, flowData.nodes.length, nodesInitialized, props.viewport?.fitViewOnInit]);

  useEffect(() => {
    return () => {
      clearDwellTimer();
      clearFlashTimer();
    };
  }, [clearDwellTimer, clearFlashTimer]);

  return (
    <div ref={containerRef} className={["mmn-editor", props.className].filter(Boolean).join(" ")} style={style} onKeyDown={onKeyDown} tabIndex={0}>
      {!props.breadcrumbs?.hidden ? <Breadcrumbs document={document} viewRootId={viewRootId} onNavigate={enterViewRoot} /> : null}
      {!props.toolbar?.hidden ? <Toolbar controls={controls} onAction={onToolbarAction} /> : null}
      {Object.keys(document.nodes).length === 0 ? (
        <div className="mmn-empty">Start with a root node or import structured text.</div>
      ) : (
        <ReactFlow
          nodes={renderedNodes}
          edges={renderedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={props.viewport?.fitViewOnInit ?? true}
          minZoom={0.08}
          zoomOnScroll={props.viewport?.zoomOnScroll ?? false}
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
            enterViewRoot(selection.nodeIds[0] ?? viewRootId);
          }}
        >
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
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
            runCommand({ type: "theme.set", theme: nextTheme, meta: { source: "toolbar", label: "Set theme" } });
          }
          props.onThemeChange?.(nextTheme);
        }}
      />
      <SearchPanel
        document={document}
        open={searchOpen && !props.search?.hidden}
        onResultClick={(result) => {
          const ancestors = getAncestorIds(document, result.nodeId);
          enterViewRoot(ancestors[ancestors.length - 1] ?? document.rootId);
          commitSelection({ nodeIds: [result.nodeId], connectionIds: [], anchorNodeId: result.nodeId });
          props.onSearchResultClick?.(result);
        }}
      />
      {inspectorOpen && !props.inspector?.hidden ? (
        <InspectorPanel
          document={document}
          selectedNodeId={selectedNodeId}
          readonly={readonly}
          onOpenLink={props.onOpenLink}
          onPatchNode={(nodeId, patch) => runCommand({ type: "node.update", nodeId, patch, meta: { source: "toolbar", label: "Inspect node" } })}
        />
      ) : null}
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
