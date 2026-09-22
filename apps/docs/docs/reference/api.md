# API Reference

## Stable

- `MindMapDocument`
- `MindMapNode`
- `MindMapConnection`
- `MindMapTag`
- `MindMapEditor`
- `MindMapViewer`
- `ViewportConfig`
- `MiniMapConfig`
- `ToolbarConfig`
- `OutlineEditor`
- `validateDocument`
- `parseDocument`
- `dispatchCommand`
- `HistoryManager`
- `importMindMap`
- `exportMindMap`

## React callbacks

### `onOpenLink`

`MindMapEditor` and `MindMapViewer` call `onOpenLink(url, node)` when a readonly
node title or inspector link is opened. If the host omits this callback, safe
absolute `http:`, `https:`, `mailto:`, and `tel:` URLs open in a new tab with
`noopener,noreferrer`; unsafe or unsupported URLs report a recoverable error
through `onError`.

## React viewport and controls

`ViewportConfig` supports `panOnScroll`, `wheelPanSensitivity`, `zoomOnPinch`,
`zoomOnScroll`, `panOnDrag`, `fitViewOnInit`, `fitViewOnResize`,
`wheelZoomSensitivity`, and `wheelZoomMaxStep`. Ordinary wheel and trackpad
scroll pan by default. Pinch-like wheel and touch pinch zoom by default;
`zoomOnScroll` preserves the legacy ordinary-wheel zoom path when
`panOnScroll: false`. `fitViewOnResize` preserves the current zoom and only
recenters when the container size changes.

`MiniMapConfig` is opt-in:

```tsx
<MindMapEditor
  viewport={{ panOnScroll: true, zoomOnPinch: true, fitViewOnResize: true }}
  minimap={{ visible: true, pannable: true, zoomable: true }}
/>
```

Editable toolbars accept `undo`, `redo`, and `reset` controls. Reset restores
the document snapshot captured when the editor mounted and clears local
undo/redo history. Readonly editors filter these controls automatically.

## Measured layout

`simpleTreeLayout(document, rootId?, options?)` accepts
`options.nodeSizes: Record<NodeId, { width; height }>`. When a node has a valid
entry, the layout uses that size (still multiplied by `style.scale`) instead of
the title-based estimate. Core stays DOM-free; the host supplies the sizes.

`MindMapEditor` and `MindMapViewer` accept a `layout` prop with `measured: true` for
nodes whose content height is not known ahead of time (for example a
`renderNode` that renders rich markdown):

- React Flow measures every rendered node; when a size changes by more than
  half a pixel the tree is laid out again with those sizes, so tall siblings do
  not overlap.
- The canvas stays hidden (`.mmn-editor--measuring`, `aria-busy`) until every
  visible node has been measured and sizes stayed unchanged for 200ms (async
  content such as highlighted code or images can resize nodes), then the
  initial fit runs. A 1.5s fallback reveals the canvas if sizes never settle.
- Measured mode always auto-lays out the displayed tree; manual node positions
  in the document are ignored for display.
- Readonly nodes without a `metadata.nodeWidth` size to their content; cap the
  width from host CSS (for example `.my-host .mmn-node { max-width: 520px; }`).

`readonlyCollapsible` lets a readonly editor or viewer collapse and expand
branches. The collapsed state is local view state: `onChange` is not called and
the `value` document is not modified. It resets when `value.id` changes.

```tsx
<MindMapViewer
  value={document}
  layout={{ measured: true }}
  readonlyCollapsible
  viewport={{ fitViewOnInit: true }}
  renderNode={(node) => <RichContent node={node} />}
/>
```

## Experimental

- `renderNode`
- `layout.measured`
- `readonlyCollapsible`
- `dragInteraction`
- `ThemePanelConfig`
- `NodeSizingConfig`
- worker layout scheduler options
- provider, plugin, and collaboration adapter extension points

Experimental APIs may change during beta with a changeset and migration note.
