import { useState, useMemo, useCallback, useEffect } from "react";
import { getDescendantIds, getAncestorIds } from "@my-mind-node/core";
import type { MindMapDocument, NodeId } from "@my-mind-node/core";
import { PanelLeftClose, Pin, PinOff, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp } from "lucide-react";
import { AUTO_BRANCH_PALETTES, AUTO_BRANCH_PALETTES_DARK } from "../document-to-flow";
import { buildBranchTreeItems, type BranchTreeItem } from "../branch-tree";

export interface BranchListPanelProps {
  document: MindMapDocument;
  branchIds: NodeId[];
  selectedBranchId?: NodeId;
  selectedNodeId?: NodeId;
  collapsed: boolean;
  previewOpen: boolean;
  pinned: boolean;
  themeMode?: "light" | "dark";
  onSelectBranch: (nodeId: NodeId) => void;
  onCollapse: () => void;
  onPin: () => void;
  onMouseLeave?: React.MouseEventHandler;
}

function getExpandableNodeIds(items: BranchTreeItem[]): Set<NodeId> {
  const ids = new Set<NodeId>();
  const visit = (item: BranchTreeItem) => {
    if (item.childItems.length > 0) {
      ids.add(item.nodeId);
      item.childItems.forEach(visit);
    }
  };
  items.forEach(visit);
  return ids;
}

export function BranchListPanel({
  document,
  branchIds,
  selectedBranchId,
  selectedNodeId,
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

  const treeItems = useMemo(() => buildBranchTreeItems(document), [document]);

  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<NodeId>>(() => {
    return getExpandableNodeIds(buildBranchTreeItems(document));
  });

  // Auto-expand ancestors of selectedNodeId so the selected node is visible in the tree
  useEffect(() => {
    if (selectedNodeId) {
      const ancestors = getAncestorIds(document, selectedNodeId);
      if (ancestors.length > 0) {
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const ancestorId of ancestors) {
            if (ancestorId !== document.rootId && !next.has(ancestorId)) {
              next.add(ancestorId);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
  }, [selectedNodeId, document]);

  const expandAll = useCallback(() => {
    setExpandedNodeIds(getExpandableNodeIds(treeItems));
  }, [treeItems]);

  const collapseAll = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  const toggleCollapse = useCallback((nodeId: NodeId) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const renderTreeItem = (item: BranchTreeItem) => {
    const node = document.nodes[item.nodeId];
    if (!node) return null;

    const isSelected = selectedNodeId === item.nodeId;
    const isAncestor =
      selectedBranchId === item.nodeId ||
      (selectedNodeId && getAncestorIds(document, selectedNodeId).includes(item.nodeId));
    const hasChildren = item.childItems.length > 0;
    const isExpanded = expandedNodeIds.has(item.nodeId);

    const descendantCount = getDescendantIds(document, item.nodeId).length;
    const totalNodes = 1 + descendantCount;

    let swatchColor = "#758195";
    if (item.depth === 1) {
      const index = branchIds.indexOf(item.nodeId);
      const palette = index >= 0 ? palettes[index % palettes.length] : undefined;
      swatchColor =
        node.style?.borderColor ??
        node.style?.backgroundColor ??
        palette?.border ??
        palette?.node ??
        "#758195";
    }

    const handleTreeItemKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelectBranch(item.nodeId);
        return;
      }
      if (event.key === "ArrowRight" && hasChildren && !isExpanded) {
        event.preventDefault();
        toggleCollapse(item.nodeId);
        return;
      }
      if (event.key === "ArrowLeft" && hasChildren && isExpanded) {
        event.preventDefault();
        toggleCollapse(item.nodeId);
      }
    };

    return (
      <div key={item.nodeId} className="mmn-branch-tree-node-wrapper" role="none">
        <div
          className={[
            "mmn-branch-list-item",
            `mmn-branch-list-item--depth-${item.depth}`,
            isSelected && "mmn-branch-list-item--selected",
            isAncestor && "mmn-branch-list-item--ancestor",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            paddingLeft: `${(item.depth - 1) * 16 + 8}px`,
          }}
          role="treeitem"
          aria-level={item.depth}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-current={isSelected ? "page" : undefined}
          aria-selected={isSelected}
          onClick={() => onSelectBranch(item.nodeId)}
          onKeyDown={handleTreeItemKeyDown}
          tabIndex={0}
          title={node.title}
        >
          {hasChildren ? (
            <span
              className="mmn-branch-list-item__toggle"
              aria-hidden="true"
              onClick={(event) => {
                event.stopPropagation();
                toggleCollapse(item.nodeId);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="mmn-branch-list-item__toggle-placeholder" />
          )}

          {item.depth === 1 && (
            <span
              className="mmn-branch-list-item__swatch"
              style={{ backgroundColor: swatchColor }}
            />
          )}
          <span className="mmn-branch-list-item__title">{node.title}</span>
          <span className="mmn-branch-list-item__count">{totalNodes}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="mmn-branch-tree-node-children" role="group">
            {item.childItems.map((child) => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

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
          <button
            type="button"
            className="mmn-branch-list-panel__action-btn"
            title="Expand all"
            aria-label="Expand all"
            onClick={expandAll}
          >
            <ChevronsDown size={16} />
          </button>
          <button
            type="button"
            className="mmn-branch-list-panel__action-btn"
            title="Collapse all"
            aria-label="Collapse all"
            onClick={collapseAll}
          >
            <ChevronsUp size={16} />
          </button>
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
      <nav className="mmn-branch-list-panel__list" role="tree" aria-label="Branch tree">
        {treeItems.map((item) => renderTreeItem(item))}
      </nav>
    </aside>
  );
}
