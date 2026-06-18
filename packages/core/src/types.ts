export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type DocumentId = Brand<string, "DocumentId">;
export type NodeId = Brand<string, "NodeId">;
export type TagId = Brand<string, "TagId">;
export type ConnectionId = Brand<string, "ConnectionId">;
export type OperationId = Brand<string, "OperationId">;

export type SchemaVersion = "1.0";

export interface Point {
  x: number;
  y: number;
}

export interface MindMapDocument {
  schemaVersion: SchemaVersion;
  id: DocumentId;
  title: string;
  rootId: NodeId;
  nodes: Record<string, MindMapNode>;
  connections: MindMapConnection[];
  tags: MindMapTag[];
  theme?: MindMapTheme;
  layout: LayoutSettings;
  revision: number;
  metadata: Record<string, unknown>;
}

export interface MindMapNode {
  id: NodeId;
  parentId: NodeId | null;
  children: NodeId[];
  title: string;
  note?: string;
  links: NodeLink[];
  tagIds: TagId[];
  task?: NodeTask;
  icon?: string;
  image?: NodeImage;
  collapsed: boolean;
  position: Point;
  style: NodeStyle;
  metadata: Record<string, unknown>;
}

export interface NodeLink {
  url: string;
  label?: string;
}

export interface NodeImage {
  src: string;
  alt?: string;
}

export type NodeTaskStatus = "todo" | "doing" | "done" | "blocked";

export interface NodeTask {
  status: NodeTaskStatus;
  assignee?: string;
  dueDate?: string;
}

export interface NodeStyle {
  scale?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontWeight?: "normal" | "medium" | "bold";
}

export interface MindMapConnection {
  id: ConnectionId;
  sourceId: NodeId;
  targetId: NodeId;
  label?: string;
  style?: NodeStyle;
  metadata: Record<string, unknown>;
}

export interface MindMapTag {
  id: TagId;
  label: string;
  color?: string;
  metadata: Record<string, unknown>;
}

export interface MindMapTheme {
  id: string;
  name: string;
  mode?: "light" | "dark" | "system";
  colors: {
    canvas: string;
    node: string;
    nodeText: string;
    edge: string;
    selected: string;
    accent: string;
  };
}

export interface LayoutSettings {
  direction: "right" | "left" | "down" | "up";
  gapX: number;
  gapY: number;
}

export interface MindMapError {
  code: string;
  message: string;
  path?: string;
  details?: unknown;
  recoverable?: boolean;
}

export type ParseResult<T> =
  | { ok: true; value: T; warnings?: MindMapError[] }
  | { ok: false; error: MindMapError };

export type ValidationResult = ParseResult<MindMapDocument>;

export interface SelectionState {
  nodeIds: NodeId[];
  connectionIds: ConnectionId[];
  anchorNodeId?: NodeId;
}

export interface ChangeMeta {
  source?: "keyboard" | "toolbar" | "outline" | "canvas" | "import" | "api";
  label?: string;
  timestamp?: string;
}

export type MindMapCommand =
  | { type: "batch"; commands: MindMapCommand[]; meta?: ChangeMeta }
  | { type: "node.create"; parentId?: NodeId; title?: string; index?: number; meta?: ChangeMeta }
  | { type: "node.update"; nodeId: NodeId; patch: Partial<MindMapNode>; meta?: ChangeMeta }
  | { type: "node.delete"; nodeId: NodeId; meta?: ChangeMeta }
  | { type: "node.move"; nodeId: NodeId; parentId: NodeId; index?: number; meta?: ChangeMeta }
  | { type: "node.moveMany"; nodeIds: NodeId[]; parentId: NodeId; index?: number; meta?: ChangeMeta }
  | { type: "node.translate"; nodeIds: NodeId[]; delta: Point; meta?: ChangeMeta }
  | { type: "node.resize"; nodeIds: NodeId[]; delta: number; minScale?: number; maxScale?: number; meta?: ChangeMeta }
  | { type: "node.collapse"; nodeIds: NodeId[]; collapsed: boolean; meta?: ChangeMeta }
  | { type: "tag.upsert"; tag: MindMapTag; meta?: ChangeMeta }
  | { type: "tag.remove"; tagId: TagId; meta?: ChangeMeta }
  | { type: "connection.create"; connection: Omit<MindMapConnection, "id" | "metadata"> & Partial<Pick<MindMapConnection, "id" | "metadata">>; meta?: ChangeMeta }
  | { type: "connection.remove"; connectionId: ConnectionId; meta?: ChangeMeta }
  | { type: "selection.set"; selection: SelectionState; meta?: ChangeMeta }
  | { type: "selection.toggleNode"; nodeId: NodeId; meta?: ChangeMeta }
  | { type: "theme.set"; theme: MindMapTheme; meta?: ChangeMeta };

export interface MindMapOperation {
  id: OperationId;
  commandType: MindMapCommand["type"];
  timestamp: string;
  before: MindMapDocument;
  after: MindMapDocument;
  meta?: ChangeMeta;
}

export type CommandResult =
  | {
      ok: true;
      document: MindMapDocument;
      operation?: MindMapOperation;
      selection?: SelectionState;
    }
  | { ok: false; document: MindMapDocument; error: MindMapError };

export interface LayoutNode {
  id: NodeId;
  parentId: NodeId | null;
  width: number;
  height: number;
  position: Point;
  data: {
    title: string;
    collapsed: boolean;
  };
}

export interface LayoutEdge {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
}

export interface LayoutGraph {
  rootId: NodeId;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  settings: LayoutSettings;
}

export interface LayoutResult {
  requestId?: string;
  positions: Record<string, Point>;
  durationMs?: number;
}

export interface IndentedTextOptions {
  title?: string;
  rootTitle?: string;
  indentSize?: number;
  includeRoot?: boolean;
}

export interface SearchOptions {
  query: string;
  fields?: Array<"title" | "note" | "tag">;
  limit?: number;
}

export interface SearchResult {
  nodeId: NodeId;
  field: "title" | "note" | "tag";
  snippet: string;
  score: number;
}
