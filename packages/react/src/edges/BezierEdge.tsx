import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

export function BezierEdge(props: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath(props);
  const label = props.label ?? (props.data as { label?: string } | undefined)?.label;
  const style = props.selected ? { ...props.style, stroke: "var(--mmn-selected)" } : props.style;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={props.markerEnd}
        className={props.selected ? "mmn-edge mmn-edge--selected" : "mmn-edge"}
        style={style}
      />
      <path className="mmn-edge-hit-area" d={edgePath} />
      {label ? (
        <EdgeLabelRenderer>
          <span className="mmn-edge-label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            {String(label)}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
