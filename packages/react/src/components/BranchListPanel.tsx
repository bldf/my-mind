import { getDescendantIds } from "@my-mind-node/core";
import type { MindMapDocument, NodeId } from "@my-mind-node/core";
import { PanelLeftClose, Pin, PinOff } from "lucide-react";
import { AUTO_BRANCH_PALETTES, AUTO_BRANCH_PALETTES_DARK } from "../document-to-flow";

export interface BranchListPanelProps {
  document: MindMapDocument;
  branchIds: NodeId[];
  selectedBranchId?: NodeId;
  collapsed: boolean;
  previewOpen: boolean;
  pinned: boolean;
  themeMode?: "light" | "dark";
  onSelectBranch: (nodeId: NodeId) => void;
  onCollapse: () => void;
  onPin: () => void;
  onMouseLeave?: React.MouseEventHandler;
}

export function BranchListPanel({
  document,
  branchIds,
  selectedBranchId,
  collapsed: _collapsed,
  previewOpen,
  pinned,
  themeMode = "light",
  onSelectBranch,
  onCollapse,
  onPin,
  onMouseLeave,
}: BranchListPanelProps) {
  const isDark = themeMode === "dark";
  const palettes = isDark ? AUTO_BRANCH_PALETTES_DARK : AUTO_BRANCH_PALETTES;

  return (
    <aside
      className={[
        "mmn-branch-list-panel",
        previewOpen && "mmn-branch-list-panel--preview",
        pinned && "mmn-branch-list-panel--pinned",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Root branches"
      onMouseLeave={onMouseLeave}
    >
      <div className="mmn-branch-list-panel__header">
        <h2 className="mmn-branch-list-panel__title">Branches</h2>
        <div className="mmn-branch-list-panel__actions">
          {(!pinned || previewOpen) && (
            <button
              type="button"
              className="mmn-branch-list-panel__action-btn"
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
              onClick={onPin}
            >
              {pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
          )}
          {!previewOpen && (
            <button
              type="button"
              className="mmn-branch-list-panel__action-btn"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              onClick={onCollapse}
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
      </div>
      <nav className="mmn-branch-list-panel__list">
        {branchIds.map((branchId, index) => {
          const node = document.nodes[branchId];
          if (!node) return null;

          const isSelected = selectedBranchId === branchId;
          const descendantCount = getDescendantIds(document, branchId).length;
          const totalNodes = 1 + descendantCount;

          const palette = palettes[index % palettes.length];
          const swatchColor =
            node.style?.borderColor ??
            node.style?.backgroundColor ??
            palette?.border ??
            palette?.node ??
            "#758195";

          return (
            <button
              key={branchId}
              type="button"
              className={[
                "mmn-branch-list-item",
                isSelected && "mmn-branch-list-item--selected",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isSelected ? "page" : undefined}
              onClick={() => onSelectBranch(branchId)}
              title={node.title}
            >
              <span
                className="mmn-branch-list-item__swatch"
                style={{ backgroundColor: swatchColor }}
              />
              <span className="mmn-branch-list-item__title">{node.title}</span>
              <span className="mmn-branch-list-item__count">
                {totalNodes} {totalNodes === 1 ? "node" : "nodes"}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
