import { estimateLayoutNodeWidth, getNodeWidthOverride, type MindMapNode, type NodeId } from "@my-mind-node/core";
import { ChevronLeft, ChevronRight, Minus, MoveRight, Plus } from "lucide-react";
import { memo, useState } from "react";
import type { ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getDropIntentLabel, type DropIntent, type MindNodeBranchSide } from "../drag-interactions";

export interface MindNodeData extends Record<string, unknown> {
  node: MindMapNode;
  highlighted?: boolean;
  flash?: boolean;
  readonly?: boolean;
  branchSide?: MindNodeBranchSide;
  dropIntent?: DropIntent;
  showAddChildControl?: boolean;
  showCollapseControl?: boolean;
  onTitleCommit?: (nodeId: NodeId, title: string) => void;
  onEnterNodeView?: (nodeId: NodeId) => void;
  onResizeNode?: (nodeIds: NodeId[], delta: number) => void;
  onAddChild?: (nodeId: NodeId) => void;
  onToggleCollapse?: (nodeId: NodeId) => void;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
}

function getNodeWidth(node: MindMapNode, readonly: boolean): number | undefined {
  if (readonly && getNodeWidthOverride(node) === undefined) return undefined;
  return estimateLayoutNodeWidth(node);
}

export const MindNode = memo(function MindNode(props: NodeProps) {
  const data = props.data as MindNodeData;
  const node = data.node;
  const [draft, setDraft] = useState(node.title);
  const scale = node.style.scale ?? 1;
  const dropLabel = data.dropIntent ? getDropIntentLabel(data.dropIntent) : undefined;
  const canShowAddChild = !data.readonly && data.showAddChildControl !== false && Boolean(data.onAddChild);
  const canShowCollapse =
    !data.readonly && data.showCollapseControl !== false && node.children.length > 0 && Boolean(data.onToggleCollapse);
  const collapseLabel = node.collapsed ? "Expand node" : "Collapse node";

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
        width: getNodeWidth(node, Boolean(data.readonly)),
        transform: `scale(${scale})`,
        borderColor: node.style.borderColor,
        background: node.style.backgroundColor,
        color: node.style.color,
        fontWeight: node.style.fontWeight,
      }}
      data-node-id={node.id}
    >
      <Handle id="target-top" className="mmn-node__handle" type="target" position={Position.Top} />
      <Handle id="target-right" className="mmn-node__handle" type="target" position={Position.Right} />
      <Handle id="target-bottom" className="mmn-node__handle" type="target" position={Position.Bottom} />
      <Handle id="target-left" className="mmn-node__handle" type="target" position={Position.Left} />
      {data.renderNode ? (
        <div className="mmn-node__custom">{data.renderNode(node, Boolean(props.selected))}</div>
      ) : data.readonly ? (
        <button className="mmn-node__title mmn-node__title--readonly" type="button" onClick={() => data.onEnterNodeView?.(node.id)}>
          {node.title}
        </button>
      ) : (
        <input
          className="mmn-node__title"
          value={draft}
          aria-label={`Title for ${node.title}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => data.onTitleCommit?.(node.id, draft.trim() || "Untitled")}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
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
        <span className="mmn-node__insert-line mmn-node__insert-line--before" role="status" aria-label="Insert before this node">
          Before
        </span>
      ) : null}
      {data.dropIntent?.type === "sort-after" ? (
        <span className="mmn-node__insert-line mmn-node__insert-line--after" role="status" aria-label="Insert after this node">
          After
        </span>
      ) : null}
      {canShowAddChild ? (
        <button
          className="mmn-node__control mmn-node__control--add nodrag nopan"
          type="button"
          title="Add child"
          aria-label={`Add child to ${node.title}`}
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
          onClick={(event) => {
            event.stopPropagation();
            data.onToggleCollapse?.(node.id);
          }}
        >
          {node.collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      ) : null}
      {props.selected && !data.readonly ? (
        <div className="mmn-node__quick" aria-label="Node size controls">
          <button type="button" title="Shrink node" aria-label="Shrink node" onClick={() => data.onResizeNode?.([node.id], -0.1)}>
            <Minus size={14} />
          </button>
          <button type="button" title="Grow node" aria-label="Grow node" onClick={() => data.onResizeNode?.([node.id], 0.1)}>
            <Plus size={14} />
          </button>
          <button type="button" title="Enter node view" aria-label="Enter node view" onClick={() => data.onEnterNodeView?.(node.id)}>
            <MoveRight size={14} />
          </button>
        </div>
      ) : null}
      <Handle id="source-top" className="mmn-node__handle" type="source" position={Position.Top} />
      <Handle id="source-right" className="mmn-node__handle" type="source" position={Position.Right} />
      <Handle id="source-bottom" className="mmn-node__handle" type="source" position={Position.Bottom} />
      <Handle id="source-left" className="mmn-node__handle" type="source" position={Position.Left} />
    </div>
  );
});
