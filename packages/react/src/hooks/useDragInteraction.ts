import { useCallback, useRef, useState } from "react";
import {
  asNodeId,
  type MindMapDocument,
  type MindMapError,
  type NodeId,
  type SelectionState,
} from "@my-mind-node/core";
import type { OnNodeDrag } from "@xyflow/react";
import {
  EMPTY_DROP_INTENT,
  getDropGeometry,
  getDropValidationReason,
  getSortInsertionIndex,
  getTopLevelMovableNodeIds,
  isMoveNoOp,
  type DropIntent,
} from "../drag-interactions";
import {
  getEventClientPoint,
  getMovingNodesRect,
  getNodeElement,
  getSyntheticMovingRect,
  placeMeasuredRectAtPoint,
  toDropRect,
} from "../drag-geometry";
import {
  getFlowNodeStartPositions,
  getSortGapPx,
  getVisibleSubtreeNodeIds,
  type DragInteractionSettings,
  type MindFlowNode,
} from "../editor-utils";
import type { FlowConversionResult } from "../document-to-flow";

const DROP_OVERLAP_RATIO = 0.3;

export interface DragSession {
  commitNodeIds: NodeId[];
  visualNodeIds: NodeId[];
  startPositions: Record<string, { x: number; y: number }>;
}

interface UseDragInteractionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  flowNodes: MindFlowNode[];
  flowDataRef: React.RefObject<FlowConversionResult>;
  document: MindMapDocument;
  dragSettings: DragInteractionSettings;
  selectionNodeIds: NodeId[];
  effectiveViewRootId: NodeId;
  readonly: boolean;
  dragSessionRef: React.RefObject<DragSession | null>;
  flushPendingViewportUpdate: () => void;
  runCommand: (
    command: Parameters<typeof import("@my-mind-node/core").dispatchCommand>[1],
    options?: { autoLayout?: boolean },
  ) => { ok: boolean; document: MindMapDocument } | undefined;
  commitSelection: (nextSelection: SelectionState) => void;
  reportError: (error: MindMapError) => void;
  setFlowNodes: React.Dispatch<React.SetStateAction<MindFlowNode[]>>;
  setFlowEdges: React.Dispatch<React.SetStateAction<FlowConversionResult["edges"]>>;
}

export function useDragInteraction({
  containerRef,
  flowNodes,
  flowDataRef,
  document,
  dragSettings,
  selectionNodeIds,
  effectiveViewRootId,
  readonly,
  dragSessionRef,
  flushPendingViewportUpdate,
  runCommand,
  commitSelection,
  reportError,
  setFlowNodes,
  setFlowEdges,
}: UseDragInteractionOptions) {
  const [dropIntent, setDropIntent] = useState<DropIntent>(EMPTY_DROP_INTENT);
  const dropIntentRef = useRef<DropIntent>(EMPTY_DROP_INTENT);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashNodeId, setFlashNodeId] = useState<NodeId | undefined>();

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

  const reportDropError = useCallback(
    (code: string, message: string, details?: unknown) => {
      reportError({ code, message, details, recoverable: true });
    },
    [reportError],
  );

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
    [containerRef, document, dragSettings.sortZoneRatio, flowNodes],
  );

  const updateDropIntent = useCallback(
    (nextIntent: DropIntent) => commitDropIntent(nextIntent),
    [commitDropIntent],
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
      const selectedNodeIds = selectionNodeIds.includes(nodeId) ? selectionNodeIds : [nodeId];
      const movingNodeIds = getTopLevelMovableNodeIds(document, selectedNodeIds);
      const rendered = flowNodes.length > 0 ? flowNodes : flowDataRef.current.nodes;
      const visualNodeIds = getVisibleSubtreeNodeIds(document, movingNodeIds, effectiveViewRootId);
      dragSessionRef.current = {
        commitNodeIds: movingNodeIds,
        visualNodeIds,
        startPositions: getFlowNodeStartPositions(rendered, visualNodeIds),
      };
      commitDropIntent(EMPTY_DROP_INTENT);
      if (!selectionNodeIds.includes(nodeId)) {
        commitSelection({ nodeIds: [nodeId], connectionIds: [], anchorNodeId: nodeId });
      }
    },
    [
      commitDropIntent,
      commitSelection,
      document,
      dragSettings.enabled,
      dragSessionRef,
      effectiveViewRootId,
      flowDataRef,
      flowNodes,
      readonly,
      selectionNodeIds,
    ],
  );

  const onNodeDrag = useCallback<OnNodeDrag<MindFlowNode>>(
    (event, node) => {
      if (readonly || !dragSettings.enabled || !dragSessionRef.current) return;
      const session = dragSessionRef.current;
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
    [dragSettings.enabled, dragSessionRef, getDropIntentAtPoint, readonly, setFlowNodes, updateDropIntent],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<MindFlowNode>>(
    (event) => {
      if (readonly || !dragSettings.enabled) return;
      const session = dragSessionRef.current;
      if (!session) return;
      const point = getEventClientPoint(event);
      const currentIntent = dropIntentRef.current;
      const resolvedIntent = point ? getDropIntentAtPoint(point, session) : currentIntent;
      const finalIntent = point ? resolvedIntent : currentIntent;
      dragSessionRef.current = null;
      const committed = commitDrop(finalIntent, session.commitNodeIds);
      const rollbackFlowData = flowDataRef.current;
      commitDropIntent(EMPTY_DROP_INTENT);
      if (!committed) {
        requestAnimationFrame(() => {
          setFlowEdges(rollbackFlowData.edges);
          setFlowNodes(rollbackFlowData.nodes);
        });
      }
      flushPendingViewportUpdate();
    },
    [
      commitDrop,
      commitDropIntent,
      dragSettings.enabled,
      dragSessionRef,
      flowDataRef,
      flushPendingViewportUpdate,
      getDropIntentAtPoint,
      readonly,
      setFlowEdges,
      setFlowNodes,
    ],
  );

  return {
    dropIntent,
    flashNodeId,
    clearFlashTimer,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  };
}
