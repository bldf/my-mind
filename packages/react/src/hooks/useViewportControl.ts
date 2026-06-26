import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow, useNodesInitialized } from "@xyflow/react";
import type { NodeId } from "@my-mind-node/core";
import { clamp, isTextInputActive } from "../editor-utils";
import {
  isPinchLikeWheel,
  normalizeWheelDelta,
  shouldIgnoreViewportWheel,
} from "../viewport-utils";
import type { DragSession } from "./useDragInteraction";

const CANVAS_MIN_ZOOM = 0.08;
const CANVAS_MAX_ZOOM = 2;
const DEFAULT_WHEEL_ZOOM_SENSITIVITY = 0.001;
const DEFAULT_WHEEL_ZOOM_MAX_STEP = 0.18;
const DEFAULT_WHEEL_PAN_SENSITIVITY = 1;
const DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES = 6;

type ViewportUpdateAction = "fit" | "fit1to1" | "center";

interface ViewportUpdateOptions {
  waitForNodeId?: NodeId;
  maxWaitFrames?: number;
  shouldRun?: () => boolean;
  onSettled?: () => void;
}

interface PendingViewportUpdate {
  action: ViewportUpdateAction;
  options: ViewportUpdateOptions;
}

interface UseViewportControlOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  dragSessionRef: React.RefObject<DragSession | null>;
  nodeResizeActiveRef: React.MutableRefObject<boolean>;
  flowDataNodesLength: number;
  viewportProps?:
    | {
        panOnScroll?: boolean;
        zoomOnPinch?: boolean;
        zoomOnScroll?: boolean;
        wheelZoomSensitivity?: number;
        wheelZoomMaxStep?: number;
        wheelPanSensitivity?: number;
        fitViewOnInit?: boolean;
        fitViewOnResize?: boolean;
      }
    | undefined;
}

export function useViewportControl({
  containerRef,
  dragSessionRef,
  nodeResizeActiveRef,
  flowDataNodesLength,
  viewportProps,
}: UseViewportControlOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pendingViewportUpdate = useRef<PendingViewportUpdate | null>(null);
  const fitViewFrame = useRef<number | null>(null);
  const nodesInitializedRef = useRef(false);
  const renderedNodeCountRef = useRef(0);
  const flow = useReactFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const nodesInitialized = useNodesInitialized();

  const clearFitViewFrame = useCallback(() => {
    if (fitViewFrame.current !== null) {
      cancelAnimationFrame(fitViewFrame.current);
      fitViewFrame.current = null;
    }
  }, []);

  const centerViewAtCurrentZoom = useCallback(() => {
    const container = containerRef.current;
    const flowElement = container?.querySelector<HTMLElement>(".react-flow") ?? container;
    if (!flowElement) return;

    const nodes = flowRef.current.getNodes();
    if (nodes.length === 0) return;

    const bounds = flowRef.current.getNodesBounds(nodes);
    const viewport = flowRef.current.getViewport();
    const rect = flowElement.getBoundingClientRect();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    void flowRef.current.setViewport({
      x: rect.width / 2 - centerX * viewport.zoom,
      y: rect.height / 2 - centerY * viewport.zoom,
      zoom: viewport.zoom,
    });
  }, [containerRef]);

  const scheduleViewportUpdate = useCallback(
    (action: ViewportUpdateAction, options: ViewportUpdateOptions = {}) => {
      clearFitViewFrame();

      const waitForNodeId = options.waitForNodeId;
      const maxWaitFrames = options.maxWaitFrames ?? DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES;
      const shouldRun = options.shouldRun;
      const onSettled = options.onSettled;

      const scheduleFrame = (attempt: number) => {
        fitViewFrame.current = requestAnimationFrame(() => {
          fitViewFrame.current = null;
          if (shouldRun && !shouldRun()) return;

          const container = containerRef.current;
          if (
            dragSessionRef.current ||
            nodeResizeActiveRef.current ||
            (container && isTextInputActive(container))
          ) {
            pendingViewportUpdate.current = { action, options };
            return;
          }

          const renderedWaitNode =
            waitForNodeId && container
              ? Array.from(container.querySelectorAll<HTMLElement>(".react-flow__node")).some(
                  (element) => {
                    const rect = element.getBoundingClientRect();
                    return (
                      element.dataset.id === String(waitForNodeId) &&
                      rect.width > 0 &&
                      rect.height > 0
                    );
                  },
                )
              : true;
          const nodes = flowRef.current.getNodes();
          if (
            waitForNodeId &&
            (!renderedWaitNode || !nodes.some((node) => node.id === String(waitForNodeId))) &&
            attempt < maxWaitFrames
          ) {
            scheduleFrame(attempt + 1);
            return;
          }
          if (shouldRun && !shouldRun()) return;

          pendingViewportUpdate.current = null;
          if (action === "fit") {
            void flowRef.current.fitView({ padding: 0.18 });
          } else if (action === "fit1to1") {
            const containerEl = containerRef.current;
            const flowElement =
              containerEl?.querySelector<HTMLElement>(".react-flow") ?? containerEl;
            if (flowElement) {
              const rect = flowElement.getBoundingClientRect();
              const targetNodeId = waitForNodeId;
              const rootNode = nodes.find((node) => node.id === String(targetNodeId));
              let centerX = 0;
              let centerY = 0;
              if (rootNode) {
                const bounds = flowRef.current.getNodesBounds([rootNode]);
                centerX = bounds.x + bounds.width / 2;
                centerY = bounds.y + bounds.height / 2;
              } else if (nodes.length > 0) {
                const bounds = flowRef.current.getNodesBounds(nodes);
                centerX = bounds.x + bounds.width / 2;
                centerY = bounds.y + bounds.height / 2;
              }
              void flowRef.current.setViewport({
                x: rect.width / 2 - centerX,
                y: rect.height / 2 - centerY,
                zoom: 1,
              });
            }
          } else {
            centerViewAtCurrentZoom();
          }
          onSettled?.();
        });
      };

      scheduleFrame(0);
    },
    [centerViewAtCurrentZoom, clearFitViewFrame, containerRef, dragSessionRef, nodeResizeActiveRef],
  );

  const scheduleFitView = useCallback(
    (options?: ViewportUpdateOptions) => scheduleViewportUpdate("fit", options),
    [scheduleViewportUpdate],
  );

  const scheduleFit1to1View = useCallback(
    (options?: ViewportUpdateOptions) => scheduleViewportUpdate("fit1to1", options),
    [scheduleViewportUpdate],
  );

  const scheduleCenterView = useCallback(
    () => scheduleViewportUpdate("center"),
    [scheduleViewportUpdate],
  );

  const scheduleCenterViewRef = useRef(scheduleCenterView);
  scheduleCenterViewRef.current = scheduleCenterView;

  const flushPendingViewportUpdate = useCallback(() => {
    const pending = pendingViewportUpdate.current;
    if (pending) scheduleViewportUpdate(pending.action, pending.options);
  }, [scheduleViewportUpdate]);

  const onViewportWheel = useCallback(
    (event: WheelEvent) => {
      const flowElement = event.currentTarget as HTMLElement | null;
      if (!flowElement || shouldIgnoreViewportWheel(event, flowElement)) return;

      const panOnScroll = viewportProps?.panOnScroll !== false;
      const pinchLikeWheel = isPinchLikeWheel(event);
      const shouldZoom =
        (pinchLikeWheel && viewportProps?.zoomOnPinch !== false) ||
        (!pinchLikeWheel && !panOnScroll && viewportProps?.zoomOnScroll === true);

      if (shouldZoom) {
        event.preventDefault();
        event.stopPropagation();

        const sensitivity = Math.max(
          0,
          viewportProps?.wheelZoomSensitivity ?? DEFAULT_WHEEL_ZOOM_SENSITIVITY,
        );
        const maxStep = clamp(
          viewportProps?.wheelZoomMaxStep ?? DEFAULT_WHEEL_ZOOM_MAX_STEP,
          0.01,
          0.95,
        );
        const delta = normalizeWheelDelta(event.deltaY, event.deltaMode);
        const step = clamp(-delta * sensitivity, -maxStep, maxStep);
        if (step === 0) return;

        const viewport = flow.getViewport();
        const nextZoom = clamp(viewport.zoom * (1 + step), CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM);
        if (nextZoom === viewport.zoom) return;

        const bounds = flowElement.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left;
        const pointerY = event.clientY - bounds.top;
        const flowX = (pointerX - viewport.x) / viewport.zoom;
        const flowY = (pointerY - viewport.y) / viewport.zoom;

        void flow.setViewport({
          x: pointerX - flowX * nextZoom,
          y: pointerY - flowY * nextZoom,
          zoom: nextZoom,
        });
        return;
      }

      if (pinchLikeWheel || !panOnScroll) return;

      const panSensitivity = Math.max(
        0,
        viewportProps?.wheelPanSensitivity ?? DEFAULT_WHEEL_PAN_SENSITIVITY,
      );
      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode) * panSensitivity;
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode) * panSensitivity;
      if (deltaX === 0 && deltaY === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const viewport = flow.getViewport();
      void flow.setViewport({
        x: viewport.x - deltaX,
        y: viewport.y - deltaY,
        zoom: viewport.zoom,
      });
    },
    [flow, viewportProps?.panOnScroll, viewportProps?.wheelPanSensitivity, viewportProps?.wheelZoomMaxStep, viewportProps?.wheelZoomSensitivity, viewportProps?.zoomOnPinch, viewportProps?.zoomOnScroll],
  );

  useEffect(() => {
    const flowElement = containerRef.current?.querySelector<HTMLElement>(".react-flow");
    const shouldHandleWheel =
      viewportProps?.panOnScroll !== false ||
      viewportProps?.zoomOnPinch !== false ||
      viewportProps?.zoomOnScroll === true;
    if (!flowElement || !shouldHandleWheel) return;

    flowElement.addEventListener("wheel", onViewportWheel, { capture: true, passive: false });
    return () => flowElement.removeEventListener("wheel", onViewportWheel, { capture: true });
  }, [
    containerRef,
    flowDataNodesLength,
    onViewportWheel,
    viewportProps?.panOnScroll,
    viewportProps?.zoomOnPinch,
    viewportProps?.zoomOnScroll,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ownerDocument = container.ownerDocument;
    setIsFullscreen(ownerDocument.fullscreenElement === container);

    const onFullscreenChange = () => {
      const nextIsFullscreen = ownerDocument.fullscreenElement === container;
      setIsFullscreen(nextIsFullscreen);
      if (viewportProps?.fitViewOnResize === false) return;

      scheduleCenterViewRef.current();
      const scheduleNextFrame =
        ownerDocument.defaultView?.requestAnimationFrame.bind(ownerDocument.defaultView) ??
        requestAnimationFrame;
      scheduleNextFrame(() => scheduleCenterViewRef.current());
    };

    ownerDocument.addEventListener("fullscreenchange", onFullscreenChange);
    return () => ownerDocument.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [containerRef, viewportProps?.fitViewOnResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (
      viewportProps?.fitViewOnResize === false ||
      !container ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    let lastSize: { width: number; height: number } | undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = Math.round(entry?.contentRect.width ?? container.getBoundingClientRect().width);
      const height = Math.round(
        entry?.contentRect.height ?? container.getBoundingClientRect().height,
      );
      if (!lastSize) {
        lastSize = { width, height };
        return;
      }
      if (width === lastSize.width && height === lastSize.height) return;
      lastSize = { width, height };
      if (!nodesInitializedRef.current || renderedNodeCountRef.current === 0) return;
      scheduleCenterViewRef.current();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, viewportProps?.fitViewOnResize]);

  useEffect(() => {
    return () => {
      clearFitViewFrame();
      pendingViewportUpdate.current = null;
    };
  }, [clearFitViewFrame]);

  nodesInitializedRef.current = nodesInitialized;

  return {
    isFullscreen,
    nodesInitializedRef,
    renderedNodeCountRef,
    pendingViewportUpdate,
    scheduleFitView,
    scheduleFit1to1View,
    scheduleCenterView,
    flushPendingViewportUpdate,
    clearFitViewFrame,
  };
}
