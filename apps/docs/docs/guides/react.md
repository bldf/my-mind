# React Integration

`MindMapEditor` supports controlled and uncontrolled usage. `MindMapViewer` uses
the same viewport and selection model while disabling document edits.

The default toolbar includes themes, fullscreen, zoom, fit view, search, and the
inspector. Node sizing writes to `node.style.scale`, so it is distinct from
canvas zoom and can be undone.

Desktop editing includes live drag previews, drop-to-reparent after a dwell on a
node center, upper/lower sibling sort zones, and hover controls for adding a
child or toggling a branch. Use the experimental `dragInteraction` prop to tune
or disable those defaults.

`OutlineEditor` can be used beside the canvas. Both views update the same
`MindMapDocument` through core commands.
