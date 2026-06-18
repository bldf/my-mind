import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapEditor } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";

export default function App() {
  return (
    <MindMapEditor
      defaultValue={createEmptyDocument({ title: "Custom nodes", rootTitle: "Custom renderer hook" })}
      height={560}
      renderNode={(node) => <strong>{node.icon ?? "•"} {node.title}</strong>}
    />
  );
}
