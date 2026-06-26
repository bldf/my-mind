# React Integration

`MindMapEditor` supports controlled and uncontrolled usage. `MindMapViewer` uses
the same viewport and selection model while disabling document edits.

The editable toolbar includes themes, undo, redo, reset-to-mount-state,
fullscreen, zoom, fit view, search, and the inspector. Readonly editors and
`MindMapViewer` omit editing history controls. Setting `search.hidden` removes
the search entry even when a custom toolbar control list includes it.

Wheel zoom is opt-in with `viewport.zoomOnScroll`. It uses pointer-anchored
linear scaling, with `wheelZoomSensitivity` and `wheelZoomMaxStep` available for
host tuning. Container resize automatically recenters the visible map at the
current zoom unless `fitViewOnResize` is false, and pauses while dragging,
resizing, or editing inside the canvas.

MiniMap is hidden by default. Enable it explicitly; `pannable` and `zoomable`
default to true:

```tsx
<MindMapEditor minimap={{ visible: true }} />
```

Node sizing writes to `node.style.scale`, so it is distinct from canvas zoom
and can be undone.

Desktop editing includes live subtree drag previews, immediate
drop-to-reparent on a node center, upper/lower sibling sort zones, and hover
controls for adding a child or toggling a branch. Use the experimental
`dragInteraction` prop to tune or disable those defaults.

`OutlineEditor` can be used beside the canvas. Both views update the same
`MindMapDocument` through core commands.

Readonly nodes with `node.links[0]` are rendered as link buttons. If a node has
no links but its title is a safe absolute URL, the title is treated as the
primary link. Use `onOpenLink` to route links through host navigation,
permissions, analytics, or custom security checks.
