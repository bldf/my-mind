import {
  MAX_NODE_WIDTH,
  NODE_HORIZONTAL_PADDING,
  estimateLayoutNodeWidth,
  estimateLayoutTitleWidth,
  getNodeWidthOverride,
  type MindMapNode,
  type NodeId,
} from "@my-mind-node/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getDropIntentLabel, type DropIntent, type MindNodeBranchSide } from "../drag-interactions";

export interface MindNodeData extends Record<string, unknown> {
  node: MindMapNode;
  highlighted?: boolean;
  flash?: boolean;
  readonly?: boolean;
  branchSide?: MindNodeBranchSide;
  dropIntent?: DropIntent;
  collapsedHiddenCount?: number;
  showAddChildControl?: boolean;
  showCollapseControl?: boolean;
  showNodeResizeControls?: boolean;
  nodeResizeStep?: number;
  onTitleCommit?: (nodeId: NodeId, title: string) => void;
  onEnterNodeView?: (nodeId: NodeId) => void;
  onResizeNode?: (nodeIds: NodeId[], delta: number) => void;
  onAddChild?: (nodeId: NodeId) => void;
  onToggleCollapse?: (nodeId: NodeId) => void;
  onExpandCollapsed?: (nodeId: NodeId) => void;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
}

type ResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const RESIZE_CORNERS: ResizeCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const RESIZE_PIXEL_STEP = 18;

function getNodeWidth(node: MindMapNode, readonly: boolean): number | undefined {
  if (readonly && getNodeWidthOverride(node) === undefined) return undefined;
  return estimateLayoutNodeWidth(node);
}

function getTextareaRows(value: string, width = MAX_NODE_WIDTH): number {
  const contentWidth = Math.max(1, width - NODE_HORIZONTAL_PADDING);
  return value
    .split(/\r\n|\r|\n/)
    .reduce(
      (total, line) =>
        total + Math.max(1, Math.ceil(estimateLayoutTitleWidth(line) / contentWidth)),
      0,
    );
}

function getCommittedTitle(value: string): string {
  return value.trim().length > 0 ? value : "Untitled";
}

function getResizeCornerLabel(corner: ResizeCorner): string {
  return corner.replace("-", " ");
}

function getDistanceToPoint(
  clientX: number,
  clientY: number,
  point: { x: number; y: number },
): number {
  return Math.hypot(clientX - point.x, clientY - point.y);
}

function getElementCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export const MindNode = memo(function MindNode(props: NodeProps) {
  const data = props.data as MindNodeData;
  const node = data.node;
  const [draft, setDraft] = useState(node.title);
  const resizeCleanup = useRef<(() => void) | null>(null);
  const scale = node.style.scale ?? 1;
  const nodeWidth = getNodeWidth(node, Boolean(data.readonly));
  const dropLabel = data.dropIntent ? getDropIntentLabel(data.dropIntent) : undefined;
  const collapsedHiddenCount = data.collapsedHiddenCount ?? 0;
  const hasCollapsedHiddenCount = collapsedHiddenCount > 0;
  const canShowAddChild =
    !data.readonly && data.showAddChildControl !== false && Boolean(data.onAddChild);
  const canShowCollapse =
    !data.readonly &&
    !hasCollapsedHiddenCount &&
    data.showCollapseControl !== false &&
    node.children.length > 0 &&
    Boolean(data.onToggleCollapse);
  const canExpandCollapsed =
    hasCollapsedHiddenCount && !data.readonly && Boolean(data.onExpandCollapsed);
  const canShowResizeControls =
    props.selected &&
    !data.readonly &&
    data.showNodeResizeControls !== false &&
    Boolean(data.onResizeNode);
  const collapseLabel = node.collapsed ? "Expand node" : "Collapse node";
  const resizeStep = data.nodeResizeStep ?? 0.1;

  useEffect(() => {
    setDraft(node.title);
  }, [node.id, node.title]);

  useEffect(() => {
    return () => {
      resizeCleanup.current?.();
    };
  }, []);

  const commitResizeStep = useCallback(
    (delta: number) => {
      data.onResizeNode?.([node.id], delta);
    },
    [data, node.id],
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const nodeElement = event.currentTarget.closest<HTMLElement>(".mmn-node");
      const ownerWindow = event.currentTarget.ownerDocument.defaultView;
      if (!nodeElement || !ownerWindow) return;

      resizeCleanup.current?.();

      const center = getElementCenter(nodeElement);
      const startDistance = getDistanceToPoint(event.clientX, event.clientY, center);
      const startX = event.clientX;
      const startY = event.clientY;
      let appliedSteps = 0;
      let moved = false;

      const cleanup = () => {
        ownerWindow.removeEventListener("pointermove", onPointerMove);
        ownerWindow.removeEventListener("pointerup", onPointerUp);
        ownerWindow.removeEventListener("pointercancel", onPointerUp);
        if (resizeCleanup.current === cleanup) resizeCleanup.current = null;
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 3) moved = true;

        const currentDistance = getDistanceToPoint(moveEvent.clientX, moveEvent.clientY, center);
        const nextSteps = Math.trunc((currentDistance - startDistance) / RESIZE_PIXEL_STEP);
        const stepDelta = nextSteps - appliedSteps;
        if (stepDelta === 0) return;

        appliedSteps = nextSteps;
        commitResizeStep(Number((stepDelta * resizeStep).toFixed(2)));
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        upEvent.preventDefault();
        upEvent.stopPropagation();
        if (!moved && appliedSteps === 0) {
          commitResizeStep(resizeStep);
        }
        cleanup();
      };

      ownerWindow.addEventListener("pointermove", onPointerMove);
      ownerWindow.addEventListener("pointerup", onPointerUp);
      ownerWindow.addEventListener("pointercancel", onPointerUp);
      resizeCleanup.current = cleanup;
    },
    [commitResizeStep, resizeStep],
  );

  const onResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const delta =
        event.key === "ArrowDown" || event.key === "ArrowLeft"
          ? -resizeStep
          : event.key === "ArrowUp" ||
              event.key === "ArrowRight" ||
              event.key === "Enter" ||
              event.key === " "
            ? resizeStep
            : undefined;

      if (delta === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      commitResizeStep(delta);
    },
    [commitResizeStep, resizeStep],
  );

  return (
    <div
      className={[
        "mmn-node",
        props.selected ? "mmn-node--selected" : "",
        data.highlighted ? "mmn-node--highlighted" : "",
        data.flash ? "mmn-node--drop-flash" : "",
        data.branchSide ? `mmn-node--branch-${data.branchSide}` : "",
        data.dropIntent?.type === "reparent" ? "mmn-node--drop-reparent" : "",
        data.dropIntent?.type === "reparent" && data.dropIntent.armed ? "mmn-node--drop-armed" : "",
        data.dropIntent?.type === "sort-before" ? "mmn-node--sort-before" : "",
        data.dropIntent?.type === "sort-after" ? "mmn-node--sort-after" : "",
        data.dropIntent?.type === "invalid" ? "mmn-node--drop-invalid" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: nodeWidth,
        transform: `scale(${scale})`,
        borderColor: node.style.borderColor,
        background: node.style.backgroundColor,
        color: node.style.color,
        fontWeight: node.style.fontWeight,
      }}
      data-node-id={node.id}
    >
      <Handle id="target-top" className="mmn-node__handle" type="target" position={Position.Top} />
      <Handle
        id="target-right"
        className="mmn-node__handle"
        type="target"
        position={Position.Right}
      />
      <Handle
        id="target-bottom"
        className="mmn-node__handle"
        type="target"
        position={Position.Bottom}
      />
      <Handle
        id="target-left"
        className="mmn-node__handle"
        type="target"
        position={Position.Left}
      />
      {data.renderNode ? (
        <div className="mmn-node__custom">{data.renderNode(node, Boolean(props.selected))}</div>
      ) : data.readonly ? (
        <button
          className="mmn-node__title mmn-node__title--readonly"
          type="button"
          onClick={() => data.onEnterNodeView?.(node.id)}
        >
          {node.title}
        </button>
      ) : (
        <textarea
          className="mmn-node__title mmn-node__title--editable"
          value={draft}
          rows={getTextareaRows(draft, nodeWidth)}
          aria-label={`Title for ${node.title}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => data.onTitleCommit?.(node.id, getCommittedTitle(draft))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      )}
      {node.task ? <span className="mmn-node__status">{node.task.status}</span> : null}
      {dropLabel ? (
        <span className="mmn-node__drop-label" role="status" aria-label={dropLabel}>
          {dropLabel}
        </span>
      ) : null}
      {data.dropIntent?.type === "sort-before" ? (
        <span
          className="mmn-node__insert-line mmn-node__insert-line--before"
          role="status"
          aria-label="Insert before this node"
        >
          Before
        </span>
      ) : null}
      {data.dropIntent?.type === "sort-after" ? (
        <span
          className="mmn-node__insert-line mmn-node__insert-line--after"
          role="status"
          aria-label="Insert after this node"
        >
          After
        </span>
      ) : null}
      {canShowAddChild ? (
        <button
          className="mmn-node__control mmn-node__control--add nodrag nopan"
          type="button"
          title="Add child"
          aria-label={`Add child to ${node.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            data.onAddChild?.(node.id);
          }}
        >
          <Plus size={15} />
        </button>
      ) : null}
      {canShowCollapse ? (
        <button
          className="mmn-node__control mmn-node__control--collapse nodrag nopan"
          type="button"
          title={collapseLabel}
          aria-label={`${collapseLabel} ${node.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            data.onToggleCollapse?.(node.id);
          }}
        >
          {node.collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      ) : null}
      {hasCollapsedHiddenCount ? (
        canExpandCollapsed ? (
          <button
            className="mmn-node__collapsed-count nodrag nopan"
            type="button"
            title={`Expand ${node.title}`}
            aria-label={`Expand ${node.title}, ${collapsedHiddenCount} hidden nodes`}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              data.onExpandCollapsed?.(node.id);
            }}
          >
            +{collapsedHiddenCount}
          </button>
        ) : (
          <span
            className="mmn-node__collapsed-count mmn-node__collapsed-count--readonly"
            aria-label={`${node.title} has ${collapsedHiddenCount} hidden nodes`}
          >
            +{collapsedHiddenCount}
          </span>
        )
      ) : null}
      {canShowResizeControls ? (
        <>
          {RESIZE_CORNERS.map((corner) => (
            <button
              key={corner}
              className={`mmn-node__resize-handle mmn-node__resize-handle--${corner} nodrag nopan`}
              type="button"
              title={`Resize ${node.title} from ${getResizeCornerLabel(corner)}`}
              aria-label={`Resize ${node.title} from ${getResizeCornerLabel(corner)}`}
              onPointerDown={startResize}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={onResizeKeyDown}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </>
      ) : null}
      <Handle id="source-top" className="mmn-node__handle" type="source" position={Position.Top} />
      <Handle
        id="source-right"
        className="mmn-node__handle"
        type="source"
        position={Position.Right}
      />
      <Handle
        id="source-bottom"
        className="mmn-node__handle"
        type="source"
        position={Position.Bottom}
      />
      <Handle
        id="source-left"
        className="mmn-node__handle"
        type="source"
        position={Position.Left}
      />
    </div>
  );
});
