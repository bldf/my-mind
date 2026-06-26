import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAncestorIds,
  type MindMapDocument,
  type NodeId,
} from "@my-mind-node/core";
import { getRootBranchIdForNode } from "../layout-helpers";

type ScheduledAnimationFrame = {
  ownerWindow: Window;
  frameId: number;
};

type ScheduledTimeout = {
  ownerWindow: Window;
  timeoutId: number;
};

interface BranchViewportOptions {
  waitForNodeId?: NodeId;
  maxWaitFrames?: number;
  shouldRun?: () => boolean;
  onSettled?: () => void;
}

interface UseBranchListStateOptions {
  document: MindMapDocument;
  rootBranchIds: NodeId[];
  isBranchListEligible: boolean;
  branchListLayout?:
    | {
        hidden?: boolean;
        autoShowDepth?: number;
        defaultOpen?: boolean;
        defaultSidebarWidth?: number;
        minSidebarWidth?: number;
        maxSidebarWidthRatio?: number;
      }
    | undefined;
  onViewRootChange?: (nodeId: NodeId) => void;
  scheduleFitView: (options?: BranchViewportOptions) => void;
  scheduleFit1to1View: (options?: BranchViewportOptions) => void;
  scheduleCenterView: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewportFitViewOnInit?: boolean;
}

const DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES = 6;

export function useBranchListState({
  document,
  rootBranchIds,
  isBranchListEligible,
  branchListLayout,
  onViewRootChange,
  scheduleFitView,
  scheduleFit1to1View,
  scheduleCenterView,
  containerRef,
  viewportFitViewOnInit,
}: UseBranchListStateOptions) {
  const [viewRootId, setViewRootId] = useState<NodeId>(document.rootId);
  const [splitMode, setSplitMode] = useState<"normal" | "split">(
    isBranchListEligible && branchListLayout?.defaultOpen ? "split" : "normal",
  );
  const [selectedBranchId, setSelectedBranchId] = useState<NodeId | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreviewOpen, setSidebarPreviewOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(branchListLayout?.defaultSidebarWidth ?? 280);
  const [branchSwitchPending, setBranchSwitchPending] = useState(false);

  const previousViewRootIdRef = useRef<NodeId>(document.rootId);
  const pendingBranchViewportUpdateRef = useRef(false);
  const branchSwitchTokenRef = useRef(0);
  const branchSwitchFrameRef = useRef<ScheduledAnimationFrame | null>(null);
  const branchSwitchTimeoutRef = useRef<ScheduledTimeout | null>(null);
  const splitModeRef = useRef(splitMode);
  splitModeRef.current = splitMode;

  const clearBranchSwitchFrame = useCallback(() => {
    const frame = branchSwitchFrameRef.current;
    if (frame) {
      frame.ownerWindow.cancelAnimationFrame(frame.frameId);
      branchSwitchFrameRef.current = null;
    }
  }, []);

  const clearBranchSwitchTimeout = useCallback(() => {
    const timeout = branchSwitchTimeoutRef.current;
    if (timeout) {
      timeout.ownerWindow.clearTimeout(timeout.timeoutId);
      branchSwitchTimeoutRef.current = null;
    }
  }, []);

  const cancelBranchSwitch = useCallback(() => {
    branchSwitchTokenRef.current += 1;
    pendingBranchViewportUpdateRef.current = false;
    setBranchSwitchPending(false);
    clearBranchSwitchFrame();
    clearBranchSwitchTimeout();
  }, [clearBranchSwitchFrame, clearBranchSwitchTimeout]);

  const effectiveViewRootId = useMemo(() => {
    if (document.nodes[viewRootId]) return viewRootId;
    if (splitMode === "split" && selectedBranchId && document.nodes[selectedBranchId]) {
      return selectedBranchId;
    }
    return document.rootId;
  }, [document.nodes, viewRootId, splitMode, selectedBranchId, document.rootId]);

  const exitSplitMode = useCallback(() => {
    cancelBranchSwitch();
    splitModeRef.current = "normal";
    setSplitMode("normal");
    const prevId = previousViewRootIdRef.current;
    const nextRootId = document.nodes[prevId] ? prevId : document.rootId;
    setViewRootId(nextRootId);
    onViewRootChange?.(nextRootId);
    setSidebarPreviewOpen(false);
  }, [cancelBranchSwitch, document, onViewRootChange]);

  const enterSplitMode = useCallback(
    (initialBranchId?: NodeId) => {
      previousViewRootIdRef.current = effectiveViewRootId;

      let branchId = initialBranchId;
      if (!branchId) {
        const ancestors = getAncestorIds(document, effectiveViewRootId);
        if (ancestors.length > 1 && ancestors[0] === document.rootId) {
          branchId = ancestors[1];
        } else if (rootBranchIds.includes(effectiveViewRootId)) {
          branchId = effectiveViewRootId;
        } else {
          branchId = rootBranchIds[0];
        }
      }

      if (branchId) {
        setSelectedBranchId(branchId);
        setSplitMode("split");

        const isDescendant =
          effectiveViewRootId === branchId ||
          getAncestorIds(document, effectiveViewRootId).includes(branchId);
        const nextViewRootId = isDescendant ? effectiveViewRootId : branchId;

        setViewRootId(nextViewRootId);
        onViewRootChange?.(nextViewRootId);
      }
    },
    [document, effectiveViewRootId, rootBranchIds, onViewRootChange],
  );

  const handleToggleMode = useCallback(() => {
    if (splitMode === "split") {
      exitSplitMode();
    } else {
      enterSplitMode();
    }
  }, [splitMode, enterSplitMode, exitSplitMode]);

  const enterViewRoot = useCallback(
    (nodeId: NodeId) => {
      if (!document.nodes[nodeId]) return;
      if (splitMode === "split") {
        if (nodeId === document.rootId) {
          exitSplitMode();
          return;
        }
        const branchId = getRootBranchIdForNode(document, nodeId);
        if (branchId && branchId !== selectedBranchId) {
          setSelectedBranchId(branchId);
        }
      }
      setViewRootId(nodeId);
      onViewRootChange?.(nodeId);
    },
    [document, splitMode, selectedBranchId, exitSplitMode, onViewRootChange],
  );

  const handleSelectBranch = useCallback(
    (branchId: NodeId) => {
      const switchToken = branchSwitchTokenRef.current + 1;
      branchSwitchTokenRef.current = switchToken;
      clearBranchSwitchFrame();
      clearBranchSwitchTimeout();
      setBranchSwitchPending(true);
      pendingBranchViewportUpdateRef.current = true;
      setSelectedBranchId(branchId);
      setViewRootId(branchId);
      onViewRootChange?.(branchId);
      const ownerWindow = containerRef.current?.ownerDocument.defaultView ?? window;
      const isCurrentBranchSwitch = () =>
        branchSwitchTokenRef.current === switchToken &&
        splitModeRef.current === "split" &&
        containerRef.current !== null;
      const scheduleBranchViewport = () => {
        branchSwitchFrameRef.current = null;
        if (!isCurrentBranchSwitch()) return;

        pendingBranchViewportUpdateRef.current = false;
        const viewportOptions = {
          waitForNodeId: branchId,
          maxWaitFrames: DEFAULT_VIEWPORT_UPDATE_WAIT_FRAMES * 4,
          shouldRun: isCurrentBranchSwitch,
          onSettled: () => {
            if (branchSwitchTokenRef.current === switchToken) {
              clearBranchSwitchTimeout();
              setBranchSwitchPending(false);
            }
          },
        };
        if (viewportFitViewOnInit === true) {
          scheduleFitView(viewportOptions);
        } else {
          scheduleFit1to1View(viewportOptions);
        }
      };
      const firstFrameId = ownerWindow.requestAnimationFrame(() => {
        if (branchSwitchFrameRef.current?.frameId === firstFrameId) {
          branchSwitchFrameRef.current = null;
        }
        if (!isCurrentBranchSwitch()) return;

        const secondFrameId = ownerWindow.requestAnimationFrame(scheduleBranchViewport);
        branchSwitchFrameRef.current = { ownerWindow, frameId: secondFrameId };
      });
      branchSwitchFrameRef.current = { ownerWindow, frameId: firstFrameId };
      const timeoutId = ownerWindow.setTimeout(() => {
        if (branchSwitchTokenRef.current === switchToken) {
          branchSwitchTimeoutRef.current = null;
          pendingBranchViewportUpdateRef.current = false;
          setBranchSwitchPending(false);
        }
      }, 600);
      branchSwitchTimeoutRef.current = { ownerWindow, timeoutId };
    },
    [
      clearBranchSwitchFrame,
      clearBranchSwitchTimeout,
      containerRef,
      onViewRootChange,
      scheduleFit1to1View,
      scheduleFitView,
      viewportFitViewOnInit,
    ],
  );

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let newWidth = startWidth + deltaX;

        const minWidth = branchListLayout?.minSidebarWidth ?? 220;
        let maxWidth = 500;
        if (containerRef.current) {
          const containerWidth = containerRef.current.getBoundingClientRect().width;
          maxWidth = Math.round(containerWidth * (branchListLayout?.maxSidebarWidthRatio ?? 0.45));
        }

        newWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
        setSidebarWidth(newWidth);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        handle.releasePointerCapture(upEvent.pointerId);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);

        scheduleCenterView();
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
    },
    [sidebarWidth, branchListLayout, containerRef, scheduleCenterView],
  );

  const handleCollapseSidebar = useCallback(() => {
    setSidebarCollapsed(true);
    setSidebarPreviewOpen(false);
    setSidebarPinned(false);
    scheduleCenterView();
  }, [scheduleCenterView]);

  const handlePreviewSidebar = useCallback(() => {
    if (!sidebarCollapsed) return;
    setSidebarPreviewOpen(true);
  }, [sidebarCollapsed]);

  const handlePreviewSidebarLeave = useCallback(() => {
    if (!sidebarCollapsed || sidebarPinned) return;
    setSidebarPreviewOpen(false);
  }, [sidebarCollapsed, sidebarPinned]);

  const handlePinSidebar = useCallback(() => {
    setSidebarPinned(true);
    setSidebarCollapsed(false);
    setSidebarPreviewOpen(false);
    scheduleCenterView();
  }, [scheduleCenterView]);

  // Sync viewRootId when effectiveViewRootId changes
  useEffect(() => {
    if (viewRootId === effectiveViewRootId) return;
    setViewRootId(effectiveViewRootId);
    onViewRootChange?.(effectiveViewRootId);
  }, [effectiveViewRootId, onViewRootChange, viewRootId]);

  // Sync selectedBranchId in split mode
  useEffect(() => {
    if (splitMode === "split") {
      const ancestors = getAncestorIds(document, effectiveViewRootId);
      let branchId: NodeId | undefined;
      if (ancestors.length > 1 && ancestors[0] === document.rootId) {
        branchId = ancestors[1];
      } else if (rootBranchIds.includes(effectiveViewRootId)) {
        branchId = effectiveViewRootId;
      }
      if (branchId && rootBranchIds.includes(branchId) && branchId !== selectedBranchId) {
        setSelectedBranchId(branchId);
      }
    }
  }, [splitMode, effectiveViewRootId, document, rootBranchIds, selectedBranchId]);

  // Exit split mode when branch list is no longer eligible
  useEffect(() => {
    if (!isBranchListEligible && splitMode === "split") {
      exitSplitMode();
    }
  }, [isBranchListEligible, splitMode, exitSplitMode]);

  // Ensure selectedBranchId is valid in split mode
  useEffect(() => {
    if (splitMode !== "split") return;
    if (selectedBranchId && rootBranchIds.includes(selectedBranchId)) {
      if (effectiveViewRootId === document.rootId) {
        setViewRootId(selectedBranchId);
        onViewRootChange?.(selectedBranchId);
      }
      return;
    }

    if (rootBranchIds.length > 0) {
      const fallback = rootBranchIds[0] as NodeId;
      setSelectedBranchId(fallback);
      setViewRootId(fallback);
      onViewRootChange?.(fallback);
    } else {
      exitSplitMode();
    }
  }, [
    document.rootId,
    effectiveViewRootId,
    exitSplitMode,
    onViewRootChange,
    rootBranchIds,
    selectedBranchId,
    splitMode,
  ]);

  // Close sidebar preview when clicking outside
  useEffect(() => {
    if (!sidebarCollapsed || !sidebarPreviewOpen || sidebarPinned) return;
    const ownerDocument = containerRef.current?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (!ownerDocument || !ownerWindow) return;

    const closeWhenOutsidePreview = (event: PointerEvent | MouseEvent) => {
      const target = event.target;
      if (!(target instanceof ownerWindow.Element)) return;
      if (target.closest(".mmn-branch-list-panel, .mmn-branch-expand-btn")) return;
      setSidebarPreviewOpen(false);
    };

    ownerDocument.addEventListener("pointermove", closeWhenOutsidePreview);
    ownerDocument.addEventListener("mousemove", closeWhenOutsidePreview);
    return () => {
      ownerDocument.removeEventListener("pointermove", closeWhenOutsidePreview);
      ownerDocument.removeEventListener("mousemove", closeWhenOutsidePreview);
    };
  }, [containerRef, sidebarCollapsed, sidebarPinned, sidebarPreviewOpen]);

  return {
    viewRootId,
    setViewRootId,
    effectiveViewRootId,
    splitMode,
    selectedBranchId,
    sidebarCollapsed,
    sidebarPreviewOpen,
    sidebarPinned,
    sidebarWidth,
    branchSwitchPending,
    pendingBranchViewportUpdateRef,
    handleSelectBranch,
    handleToggleMode,
    enterViewRoot,
    enterSplitMode,
    exitSplitMode,
    handleResizePointerDown,
    handleCollapseSidebar,
    handlePreviewSidebar,
    handlePreviewSidebarLeave,
    handlePinSidebar,
    clearBranchSwitchFrame,
    clearBranchSwitchTimeout,
  };
}
