import type {
  MindMapDocument,
  MindMapError,
  MindMapNode,
  MindMapTheme,
  NodeId,
  SearchResult,
  SelectionState,
} from "@my-mind-node/core";
import type { ReactNode } from "react";

export type ViewToolbarControl =
  | "theme"
  | "fullscreen"
  | "zoomOut"
  | "zoomIn"
  | "fitView"
  | "export"
  | "search"
  | "inspector";

export interface ToolbarConfig {
  controls?: ViewToolbarControl[];
  hidden?: boolean;
}

export interface ThemePanelConfig {
  placement?: "right";
  themes?: MindMapTheme[];
  defaultOpen?: boolean;
  showSystemMode?: boolean;
}

export interface NodeSizingConfig {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  showQuickControls?: boolean;
}

export interface BreadcrumbConfig {
  hidden?: boolean;
}

export interface ViewportConfig {
  zoomOnScroll?: boolean;
  panOnDrag?: boolean;
  fitViewOnInit?: boolean;
}

export interface InspectorConfig {
  hidden?: boolean;
}

export interface SearchConfig {
  hidden?: boolean;
}

export interface DragInteractionConfig {
  enabled?: boolean;
  reparentDwellMs?: number;
  sortZoneRatio?: number;
  flashDurationMs?: number;
  autoLayoutOnDrop?: boolean;
  showAddChildControl?: boolean;
  showCollapseControl?: boolean;
}

export interface MindMapEditorProps {
  value?: MindMapDocument;
  defaultValue?: MindMapDocument;
  readonly?: boolean;
  height?: number | string;
  theme?: MindMapTheme;
  toolbar?: ToolbarConfig;
  themePanel?: ThemePanelConfig;
  nodeSizing?: NodeSizingConfig;
  breadcrumbs?: BreadcrumbConfig;
  viewport?: ViewportConfig;
  inspector?: InspectorConfig;
  search?: SearchConfig;
  dragInteraction?: DragInteractionConfig;
  className?: string;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
  onChange?: (document: MindMapDocument) => void;
  onThemeChange?: (theme: MindMapTheme) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onViewRootChange?: (nodeId: NodeId) => void;
  onSearchResultClick?: (result: SearchResult) => void;
  onError?: (error: MindMapError) => void;
  onOpenLink?: (url: string, node: MindMapNode) => void;
}

export interface MindMapViewerProps extends Omit<MindMapEditorProps, "readonly" | "onChange"> {
  value: MindMapDocument;
}

export interface OutlineEditorProps {
  value?: MindMapDocument;
  defaultValue?: MindMapDocument;
  readonly?: boolean;
  selectedNodeIds?: NodeId[];
  className?: string;
  onChange?: (document: MindMapDocument) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onError?: (error: MindMapError) => void;
}
