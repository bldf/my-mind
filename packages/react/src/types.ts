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
  | "undo"
  | "redo"
  | "reset"
  | "fullscreen"
  | "zoomOut"
  | "zoomIn"
  | "fitView"
  | "export"
  | "search"
  | "inspector"
  | "copy";

export type CopyDataFormat = "json" | "markdown" | "mermaid";

export interface CopyDataRequest {
  format: CopyDataFormat;
  document: MindMapDocument;
}

export type CopyDataResult =
  | { ok: true; text: string }
  | { ok: false; error: MindMapError };

export interface ToolbarCopyConfig {
  formats?: CopyDataFormat[];
  disabled?: boolean;
  labels?: Partial<Record<CopyDataFormat, string>>;
}

export interface ToolbarConfig {
  controls?: ViewToolbarControl[];
  hidden?: boolean;
  copy?: ToolbarCopyConfig;
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
  zoomOnPinch?: boolean;
  panOnDrag?: boolean;
  panOnScroll?: boolean;
  fitViewOnInit?: boolean;
  fitViewOnResize?: boolean;
  wheelZoomSensitivity?: number;
  wheelZoomMaxStep?: number;
  wheelPanSensitivity?: number;
}

export interface MiniMapConfig {
  visible?: boolean;
  pannable?: boolean;
  zoomable?: boolean;
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

export interface BranchListLayoutConfig {
  hidden?: boolean;
  autoShowDepth?: number;
  defaultOpen?: boolean;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidthRatio?: number;
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
  minimap?: MiniMapConfig;
  inspector?: InspectorConfig;
  search?: SearchConfig;
  dragInteraction?: DragInteractionConfig;
  branchListLayout?: BranchListLayoutConfig;
  className?: string;
  renderNode?: (node: MindMapNode, selected: boolean) => ReactNode;
  onChange?: (document: MindMapDocument) => void;
  onThemeChange?: (theme: MindMapTheme) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onViewRootChange?: (nodeId: NodeId) => void;
  onSearchResultClick?: (result: SearchResult) => void;
  onError?: (error: MindMapError) => void;
  onOpenLink?: (url: string, node: MindMapNode) => void;
  onCopyData?: (
    request: CopyDataRequest,
  ) => string | CopyDataResult | Promise<string | CopyDataResult>;
  onCopySuccess?: (format: CopyDataFormat) => void;
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
