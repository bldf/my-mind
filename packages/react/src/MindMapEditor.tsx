import "@xyflow/react/dist/style.css";
import "./styles.css";

import {
  applyOperation,
  asNodeId,
  createEmptyDocument,
  dispatchCommand,
  getAncestorIds,
  type MindMapDocument,
  type MindMapError,
  type MindMapNode,
  type MindMapOperation,
  type MindMapTheme,
  type NodeId,
  type SelectionState,
} from "@my-mind-node/core";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { documentToFlow } from "./document-to-flow";
import { BezierEdge } from "./edges/BezierEdge";
import { MindNode } from "./nodes/MindNode";
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

  const runCommand = useCallback(
    (command: Parameters<typeof dispatchCommand>[1]) => {
      if (readonly && !command.type.startsWith("selection.")) return;
      const result = dispatchCommand(document, command);
      if (!result.ok) {
        reportError(result.error);
        return;
      }
      if (result.selection) commitSelection(result.selection);
      if (result.operation) {
        history.current.past.push(result.operation);
        history.current.future = [];
      }
      if (result.document !== document) commitDocument(result.document);
    },
    [commitDocument, commitSelection, document, readonly, reportError],
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
        onTitleCommit,
        onEnterNodeView: enterViewRoot,
        onResizeNode: resizeNodes,
        renderNode: props.renderNode,
      }),
    [document, enterViewRoot, onTitleCommit, props.renderNode, readonly, resizeNodes, selection.nodeIds, viewRootId],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: { id: string; position: { x: number; y: number } }) => {
      if (readonly) return;
      runCommand({
        type: "node.update",
        nodeId: asNodeId(node.id),
        patch: { position: { x: node.position.x, y: node.position.y } } as Partial<MindMapNode>,
        meta: { source: "canvas", label: "Move node" },
      });
    },
    [readonly, runCommand],
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
    height: props.height ?? 640,
  } as CSSProperties;

  const controls = props.toolbar?.controls ?? DEFAULT_TOOLBAR;
  const autoFitKey = `${document.id}:${viewRootId}:${flowData.nodes.length}`;

  useEffect(() => {
    if (props.viewport?.fitViewOnInit === false || !nodesInitialized || flowData.nodes.length === 0) return;
    if (lastAutoFitKey.current === autoFitKey) return;
    lastAutoFitKey.current = autoFitKey;

    const frame = requestAnimationFrame(() => flow.fitView({ padding: 0.12 }));
    return () => cancelAnimationFrame(frame);
  }, [autoFitKey, flow, flowData.nodes.length, nodesInitialized, props.viewport?.fitViewOnInit]);

  return (
    <div ref={containerRef} className={["mmn-editor", props.className].filter(Boolean).join(" ")} style={style} onKeyDown={onKeyDown} tabIndex={0}>
      {!props.breadcrumbs?.hidden ? <Breadcrumbs document={document} viewRootId={viewRootId} onNavigate={enterViewRoot} /> : null}
      {!props.toolbar?.hidden ? <Toolbar controls={controls} onAction={onToolbarAction} /> : null}
      {Object.keys(document.nodes).length === 0 ? (
        <div className="mmn-empty">Start with a root node or import structured text.</div>
      ) : (
        <ReactFlow
          nodes={flowData.nodes}
          edges={flowData.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={props.viewport?.fitViewOnInit ?? true}
          minZoom={0.08}
          zoomOnScroll={props.viewport?.zoomOnScroll ?? false}
          panOnDrag={props.viewport?.panOnDrag ?? true}
          nodesDraggable={!readonly}
          nodesConnectable={false}
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
          <Background color={theme.colors.edge} gap={24} />
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
