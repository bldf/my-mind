import { getAncestorIds } from "@my-mind-node/core";
import type { MindMapDocument, NodeId } from "@my-mind-node/core";

export interface BreadcrumbsProps {
  document: MindMapDocument;
  viewRootId: NodeId;
  onNavigate: (nodeId: NodeId) => void;
}

export function Breadcrumbs({ document, viewRootId, onNavigate }: BreadcrumbsProps) {
  const ids = [...getAncestorIds(document, viewRootId), viewRootId];

  return (
    <nav className="mmn-breadcrumbs" aria-label="Node path">
      {ids.map((nodeId, index) => {
        const node = document.nodes[nodeId];
        if (!node) return null;
        return (
          <button key={nodeId} type="button" aria-current={nodeId === viewRootId ? "page" : undefined} onClick={() => onNavigate(nodeId)}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {node.title}
          </button>
        );
      })}
    </nav>
  );
}
