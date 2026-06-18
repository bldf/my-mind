import {
  asNodeId,
  createEmptyDocument,
  dispatchCommand,
  type MindMapDocument,
  type NodeId,
  type SelectionState,
} from "@my-mind-node/core";
import { ChevronDown, ChevronRight, GripVertical, ListTree, Minus, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import type { OutlineEditorProps } from "./types";

function OutlineRow({
  document,
  nodeId,
  depth,
  readonly,
  selectedNodeIds,
  onCommand,
  onSelect,
}: {
  document: MindMapDocument;
  nodeId: NodeId;
  depth: number;
  readonly?: boolean;
  selectedNodeIds: NodeId[];
  onCommand: (command: Parameters<typeof dispatchCommand>[1]) => void;
  onSelect: (selection: SelectionState) => void;
}) {
  const node = document.nodes[nodeId];
  const selected = selectedNodeIds.includes(nodeId);
  if (!node) return null;

  return (
    <>
      <div className={selected ? "mmn-outline-row mmn-outline-row--selected" : "mmn-outline-row"} style={{ paddingLeft: depth * 18 }}>
        <button type="button" aria-label={node.collapsed ? "Expand node" : "Collapse node"} onClick={() => onCommand({ type: "node.collapse", nodeIds: [node.id], collapsed: !node.collapsed })}>
          {node.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </button>
        <GripVertical size={14} aria-hidden="true" />
        <input
          value={node.title}
          readOnly={readonly}
          aria-label={`Outline title for ${node.title}`}
          onFocus={() => onSelect({ nodeIds: [node.id], connectionIds: [], anchorNodeId: node.id })}
          onChange={(event) => onCommand({ type: "node.update", nodeId: node.id, patch: { title: event.target.value }, meta: { source: "outline" } })}
          onKeyDown={(event) => {
            if (readonly) return;
            if (event.key === "Tab") {
              event.preventDefault();
              const parent = document.nodes[node.parentId ?? document.rootId];
              const index = parent?.children.indexOf(node.id) ?? -1;
              const siblingBefore = index > 0 ? parent?.children[index - 1] : undefined;
              if (event.shiftKey && node.parentId && node.parentId !== document.rootId) {
                const grandParent = document.nodes[node.parentId]?.parentId ?? document.rootId;
                onCommand({ type: "node.move", nodeId: node.id, parentId: grandParent, meta: { source: "outline", label: "Outdent node" } });
              } else if (siblingBefore) {
                onCommand({ type: "node.move", nodeId: node.id, parentId: siblingBefore, meta: { source: "outline", label: "Indent node" } });
              }
            }
          }}
        />
        {!readonly ? (
          <span className="mmn-outline-row__actions">
            <button type="button" title="Add child" aria-label="Add child" onClick={() => onCommand({ type: "node.create", parentId: node.id })}>
              <Plus size={14} />
            </button>
            {node.id !== document.rootId ? (
              <button type="button" title="Delete" aria-label="Delete" onClick={() => onCommand({ type: "node.delete", nodeId: node.id })}>
                <Minus size={14} />
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      {!node.collapsed
        ? node.children.map((childId) => (
            <OutlineRow
              key={childId}
              document={document}
              nodeId={childId}
              depth={depth + 1}
              readonly={readonly}
              selectedNodeIds={selectedNodeIds}
              onCommand={onCommand}
              onSelect={onSelect}
            />
          ))
        : null}
    </>
  );
}

export function OutlineEditor(props: OutlineEditorProps) {
  const controlled = props.value !== undefined;
  const [internalDocument, setInternalDocument] = useState(() => props.defaultValue ?? createEmptyDocument());
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: props.selectedNodeIds ?? [], connectionIds: [] });
  const document = props.value ?? internalDocument;

  const commitSelection = useCallback(
    (nextSelection: SelectionState) => {
      setSelection(nextSelection);
      props.onSelectionChange?.(nextSelection);
    },
    [props],
  );

  const runCommand = useCallback(
    (command: Parameters<typeof dispatchCommand>[1]) => {
      if (props.readonly) return;
      const result = dispatchCommand(document, command);
      if (!result.ok) {
        props.onError?.(result.error);
        return;
      }
      if (!controlled) setInternalDocument(result.document);
      props.onChange?.(result.document);
    },
    [controlled, document, props],
  );

  return (
    <section className={["mmn-outline", props.className].filter(Boolean).join(" ")} aria-label="Outline editor">
      <header>
        <ListTree size={17} />
        <h2>Outline</h2>
        {!props.readonly ? (
          <button type="button" title="Add root child" aria-label="Add root child" onClick={() => runCommand({ type: "node.create", parentId: asNodeId(document.rootId) })}>
            <Plus size={15} />
          </button>
        ) : null}
      </header>
      <OutlineRow
        document={document}
        nodeId={document.rootId}
        depth={0}
        readonly={props.readonly}
        selectedNodeIds={selection.nodeIds}
        onCommand={runCommand}
        onSelect={commitSelection}
      />
    </section>
  );
}
