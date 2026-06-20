# API Reference

## Stable

- `MindMapDocument`
- `MindMapNode`
- `MindMapConnection`
- `MindMapTag`
- `MindMapEditor`
- `MindMapViewer`
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

## Experimental

- `renderNode`
- `dragInteraction`
- `ThemePanelConfig`
- `NodeSizingConfig`
- worker layout scheduler options
- provider, plugin, and collaboration adapter extension points

Experimental APIs may change during beta with a changeset and migration note.
