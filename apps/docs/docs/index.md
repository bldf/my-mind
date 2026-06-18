# My Mind Node

Build an editable mind map into a React product without sending user content to a backend.

```tsx
import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapEditor } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";

export default function Example() {
  return <MindMapEditor defaultValue={createEmptyDocument()} height={640} />;
}
```

The public beta includes a framework-independent core, React editor and viewer,
outline editing, search, optional import/export packages, and static examples.
