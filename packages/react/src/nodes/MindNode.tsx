import type { MindMapNode, NodeId } from "@my-mind-node/core";
import { Minus, MoveRight, Plus } from "lucide-react";
import { memo, useState } from "react";
import type { ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface MindNodeData extends Record<string, unknown> {
  node: MindMapNode;
  highlighted?: boolean;
  readonly?: boolean;
  onTitleCommit?: (nodeId: NodeId, title: string) => void;
  onEnterNodeView?: (nodeId: NodeId) => void;
  onResizeNode?: (nodeIds: NodeId[], delta: number) => void;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
}

export const MindNode = memo(function MindNode(props: NodeProps) {
  const data = props.data as MindNodeData;
  const node = data.node;
  const [draft, setDraft] = useState(node.title);
  const scale = node.style.scale ?? 1;

  return (
    <div
      className={[
        "mmn-node",
        props.selected ? "mmn-node--selected" : "",
        data.highlighted ? "mmn-node--highlighted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transform: `scale(${scale})`,
        borderColor: node.style.borderColor,
        background: node.style.backgroundColor,
        color: node.style.color,
        fontWeight: node.style.fontWeight,
      }}
      data-node-id={node.id}
    >
      <Handle type="target" position={Position.Left} />
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
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
