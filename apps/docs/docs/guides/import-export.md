# Import and Export

Importers and exporters are optional packages:

```ts
import { importMindMap } from "@my-mind-node/importers";
import { exportMindMap } from "@my-mind-node/exporters";
```

Supported import formats are JSON, Markdown, Mermaid mindmap, OPML, and
indented text. Supported export formats are JSON, Markdown, Mermaid mindmap,
OPML, indented text, SVG, and PNG. Browser image export returns structured
errors when DOM or Canvas APIs are unavailable.
