import { createEmptyDocument } from "@my-mind-node/core";
import { MindMapViewer } from "@my-mind-node/react";
import "@my-mind-node/react/styles.css";

export default function App() {
  return <MindMapViewer value={createEmptyDocument({ title: "Read only", rootTitle: "Read only map" })} height={560} />;
}
