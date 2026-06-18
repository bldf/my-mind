# Next.js Example

This example validates that `@my-mind-node/core` can be imported during SSR and that
`@my-mind-node/react` can be used from a client component.

```tsx
"use client";

import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapEditor } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";

export default function Page() {
  return <MindMapEditor defaultValue={createEmptyDocument()} height={640} />;
}
```
