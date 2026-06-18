import type { MindMapDocument, MindMapNode, NodeId, NodeTaskStatus } from "@my-mind-node/core";

export interface InspectorPanelProps {
  document: MindMapDocument;
  selectedNodeId?: NodeId;
  readonly?: boolean;
  onPatchNode: (nodeId: NodeId, patch: Partial<MindMapNode>) => void;
  onOpenLink?: (url: string, node: MindMapNode) => void;
}

export function InspectorPanel({ document, selectedNodeId, readonly, onPatchNode, onOpenLink }: InspectorPanelProps) {
  const node = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
  if (!node) {
    return (
      <aside className="mmn-inspector" aria-label="Inspector">
        <p>No node selected</p>
      </aside>
    );
  }

  return (
    <aside className="mmn-inspector" aria-label="Inspector">
      <h2>{node.title}</h2>
      <label>
        Note
        <textarea
          value={node.note ?? ""}
          readOnly={readonly}
          onChange={(event) => onPatchNode(node.id, { note: event.target.value })}
        />
      </label>
      <label>
        Task
        <select
          value={node.task?.status ?? "todo"}
          disabled={readonly}
          onChange={(event) =>
            onPatchNode(node.id, {
              task: {
                ...node.task,
                status: event.target.value as NodeTaskStatus,
              },
            })
          }
        >
          <option value="todo">Todo</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>
      </label>
      <label>
        Color
        <input
          type="color"
          value={node.style.backgroundColor ?? "#ffffff"}
          disabled={readonly}
          onChange={(event) => onPatchNode(node.id, { style: { ...node.style, backgroundColor: event.target.value } })}
        />
      </label>
      <div className="mmn-inspector__links">
        <span>Links</span>
        {node.links.length === 0 ? <small>No links</small> : null}
        {node.links.map((link) => (
          <button key={link.url} type="button" onClick={() => onOpenLink?.(link.url, node)}>
            {link.label ?? link.url}
          </button>
        ))}
      </div>
    </aside>
  );
}
