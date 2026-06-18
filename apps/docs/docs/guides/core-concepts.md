# Core Concepts

`MindMapDocument` is the stable exchange model. It stores nodes, connections,
tags, theme, layout settings, revision metadata, and per-node style.

The core package is DOM-free and exposes:

- `validateDocument` and `parseDocument` for untrusted input.
- `dispatchCommand` for serializable edits.
- `HistoryManager` for undo and redo.
- `importIndentedText` and `exportIndentedText` for lightweight text workflows.
- `searchDocument` for title, note, and tag search.
