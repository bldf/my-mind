# Import And Export Adapters

> Last updated: 2026-06-26  
> Primary sources: `packages/importers/src/index.ts`, `packages/exporters/src/index.ts`

## 1 Overview

Importers and exporters are optional adapter packages over `@my-mind-node/core`. They convert external text/file formats into `MindMapDocument` values and convert documents back into portable output formats without becoming part of the default React package path.

> Sources: `packages/importers/package.json:21`, `packages/exporters/package.json:21`, `packages/react/package.json:22`, `scripts/lint-deps.mjs:71`

## 2 Import Formats

| Format | Entry | Notes |
| --- | --- | --- |
| `json` | `parseDocument` | Delegates to core validation |
| `indented-text` | `importIndentedText` | Delegates to core text parser |
| `markdown` | `importMarkdown` | Parses headings, lists, and links |
| `mermaid` | `importMermaid` | Supports Mermaid `mindmap` diagrams |
| `opml` | OPML to indented text | Rejects external entities and doctypes |

> Sources: `packages/importers/src/index.ts:12`, `packages/importers/src/index.ts:79`, `packages/importers/src/index.ts:206`, `packages/importers/src/index.ts:237`, `packages/importers/src/index.ts:324`, `packages/importers/src/index.ts:358`

## 3 Export Formats

| Format | Entry | Notes |
| --- | --- | --- |
| `json` | `serializeDocument` | Delegates to core serialization |
| `indented-text` | `exportIndentedText` | Delegates to core text exporter |
| `markdown` | `exportMarkdownNode` | Emits heading/list structure |
| `mermaid` | `exportMermaidNode` | Emits Mermaid mindmap text |
| `opml` | `exportOpmlNode` | Emits XML OPML text |
| `svg` | `exportSvg` | Uses document positions and theme colors |
| `png` | `svgToPng` | Requires browser canvas APIs |

> Sources: `packages/exporters/src/index.ts:4`, `packages/exporters/src/index.ts:29`, `packages/exporters/src/index.ts:41`, `packages/exporters/src/index.ts:58`, `packages/exporters/src/index.ts:80`, `packages/exporters/src/index.ts:121`, `packages/exporters/src/index.ts:148`

## 4 Error Handling

Importers return `ParseResult<MindMapDocument>` and exporters return `ExportResult`. Unsupported formats, unsafe OPML, browser-only PNG export, and unexpected export failures produce recoverable `MindMapError` values.

> Sources: `packages/importers/src/index.ts:21`, `packages/importers/src/index.ts:324`, `packages/importers/src/index.ts:375`, `packages/exporters/src/index.ts:15`, `packages/exporters/src/index.ts:17`, `packages/exporters/src/index.ts:121`, `packages/exporters/src/index.ts:174`

## 5 Playground Integration

The playground imports all four public packages, detects Markdown/Mermaid fallback formats, applies presentation/layout after import, and exports active tab text from the current document.

> Sources: `apps/playground/src/App.tsx:1`, `apps/playground/src/App.tsx:11`, `apps/playground/src/App.tsx:12`, `apps/playground/src/App.tsx:30`, `apps/playground/src/App.tsx:132`, `apps/playground/src/App.tsx:161`
