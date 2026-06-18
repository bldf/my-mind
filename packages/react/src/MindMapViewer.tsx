import type { MindMapViewerProps } from "./types";
import { MindMapEditor } from "./MindMapEditor";

export function MindMapViewer(props: MindMapViewerProps) {
  return (
    <MindMapEditor
      {...props}
      readonly
      value={props.value}
      toolbar={{
        ...props.toolbar,
        controls: props.toolbar?.controls ?? ["search", "fullscreen", "zoomOut", "zoomIn", "fitView"],
      }}
    />
  );
}
