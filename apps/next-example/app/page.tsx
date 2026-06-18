"use client";

import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapEditor } from "@my-mind-node/react";

export default function Page() {
  return <MindMapEditor defaultValue={createEmptyDocument({ rootTitle: "Next.js SSR-safe import" })} height={640} />;
}
