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

`ViewportConfig` supports `zoomOnScroll`, `panOnDrag`, `fitViewOnInit`,
`fitViewOnResize`, `wheelZoomSensitivity`, and `wheelZoomMaxStep`.
`fitViewOnResize` preserves the current zoom and only recenters when the
container size changes.

`MiniMapConfig` is opt-in:

```tsx
<MindMapEditor
  viewport={{ zoomOnScroll: true, fitViewOnResize: true }}
  minimap={{ visible: true, pannable: true, zoomable: true }}
/>
```

Editable toolbars accept `undo`, `redo`, and `reset` controls. Reset restores
the document snapshot captured when the editor mounted and clears local
undo/redo history. Readonly editors filter these controls automatically.

## Experimental

- `renderNode`
- `dragInteraction`
- `ThemePanelConfig`
- `NodeSizingConfig`
- worker layout scheduler options
- provider, plugin, and collaboration adapter extension points

Experimental APIs may change during beta with a changeset and migration note.
