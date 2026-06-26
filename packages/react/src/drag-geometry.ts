import type { NodeId } from "@my-mind-node/core";
import type { DropRect } from "./drag-interactions";

export function getEventClientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } | undefined {
  if ("clientX" in event) return { x: event.clientX, y: event.clientY };
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : undefined;
}

export function getNodeElement(container: HTMLElement, nodeId: string): HTMLElement | null {
  const escape =
    "CSS" in globalThis && typeof CSS.escape === "function"
      ? CSS.escape(nodeId)
      : nodeId.replace(/"/g, '\\"');
  return container.querySelector<HTMLElement>(`.react-flow__node[data-id="${escape}"]`);
}

export function toDropRect(rect: DOMRect): DropRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function getSyntheticMovingRect(point: { x: number; y: number }): DropRect {
  return {
    left: point.x - 1,
    top: point.y - 1,
    right: point.x + 1,
    bottom: point.y + 1,
    width: 2,
    height: 2,
  };
}

export function getUnionRect(rects: DropRect[]): DropRect | undefined {
  if (rects.length === 0) return undefined;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function placeMeasuredRectAtPoint(
  point: { x: number; y: number },
  measuredRect: DropRect,
): DropRect {
  const centerX = point.x;
  const centerY = point.y;
  const left = centerX - measuredRect.width / 2;
  const top = centerY - measuredRect.height / 2;
  return {
    left,
    top,
    right: left + measuredRect.width,
    bottom: top + measuredRect.height,
    width: measuredRect.width,
    height: measuredRect.height,
  };
}

export function getMovingNodesRect(container: HTMLElement, movingNodeIds: NodeId[]): DropRect | undefined {
  return getUnionRect(
    movingNodeIds.flatMap((nodeId) => {
      const element = getNodeElement(container, String(nodeId));
      return element ? [toDropRect(element.getBoundingClientRect())] : [];
    }),
  );
}
