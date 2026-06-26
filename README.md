# My Mind Node

Embeddable React mind map editor and framework-independent core for validating,
editing, importing, exporting, and documenting structured mind map data.

## Architecture

This repository is a pnpm workspace:

- `packages/core` — DOM-free schema, validation, commands, history, layout graph conversion, search, JSON and indented-text serialization.
- `packages/react` — React Flow editor/viewer, anchored wheel zoom, responsive recentering, fullscreen toggle, subtree drag previews, history controls, opt-in MiniMap, safe hyperlink nodes, themes, outline editing, search, inspector, node sizing, and E2E-facing styles.
- `packages/importers` — optional JSON, Markdown, OPML, and indented-text import package.
- `packages/exporters` — optional JSON, Markdown, OPML, indented-text, SVG, and browser PNG export package.
- `apps/playground` — Vite playground with JSON editing and live preview.
- `apps/docs` — VitePress docs site.
- `tests` — fixtures, benchmark reports, accessibility notes, and Playwright E2E specs.

The core package has no React, React Flow, DOM, ELK, importer, or exporter runtime dependency. Import/export packages are optional so they do not enter the default React bundle path.

## Quick Start

```bash
pnpm install
pnpm fixtures
pnpm build
pnpm test
pnpm e2e
```

Run the playground:

```bash
pnpm --filter @my-mind-node/playground dev
```

Use the React editor:

```tsx
import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapEditor } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";

export function Example() {
  return (
    <MindMapEditor
      defaultValue={createEmptyDocument()}
      height={640}
      viewport={{ zoomOnScroll: true }}
    />
  );
}
```

The editable toolbar includes undo, redo, and reset-to-mount-state controls.
`MindMapViewer` omits editing history controls. MiniMap is hidden by default and
can be enabled with `minimap={{ visible: true }}`.

## Verification

- `pnpm typecheck` — package and playground TypeScript checks.
- `pnpm test` — package unit tests and fixture bench.
- `pnpm build` — packages, playground, and docs static build.
- `pnpm lint` — ESLint for source files.
- `pnpm bundle` — gzip budget checks.
- `pnpm e2e` — Playwright matrix for Chromium, Firefox, WebKit, and mobile WebKit.

Playwright browsers may need to be installed once with `pnpm exec playwright install chromium firefox webkit`.

## Deployment

GitHub Pages deployment is configured in `.github/workflows/pages.yml`. The workflow builds the docs site and publishes the playground under `/playground/`.

- **Docs**: https://bldf.github.io/my-mind/
- **Playground**: https://bldf.github.io/my-mind/playground/

For npm package releases, see `apps/docs/docs/reference/npm-publishing.md`.
