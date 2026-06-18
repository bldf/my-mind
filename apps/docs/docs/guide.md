# Quick Start

Install the core and React packages:

```bash
pnpm add @my-mind-node/core @my-mind-node/react
```

Render the editor:

```tsx
import { useState } from "react";
import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapEditor } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";

export function MindMapField() {
  const [document, setDocument] = useState(() => createEmptyDocument());
  return <MindMapEditor value={document} onChange={setDocument} height={640} />;
}
```

Data stays in the host application. The default components do not make network
requests or persist to browser storage.
