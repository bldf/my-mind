const WHEEL_IGNORE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  ".mmn-toolbar",
  ".mmn-theme-panel",
  ".mmn-search-panel",
  ".mmn-inspector",
  ".mmn-breadcrumbs",
  ".mmn-node__resize-handle",
  ".mmn-node__link-btn",
].join(",");

export { WHEEL_IGNORE_SELECTOR };

export function normalizeWheelDelta(value: number, deltaMode: number): number {
  if (deltaMode === 1) return value * 16;
  if (deltaMode === 2) return value * 160;
  return value;
}

export function isPinchLikeWheel(event: WheelEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

export function isScrollableWheelTarget(target: Element, boundary: HTMLElement): boolean {
  let element: Element | null = target;
  while (element && element !== boundary) {
    if (element instanceof HTMLElement) {
      const style = element.ownerDocument.defaultView?.getComputedStyle(element);
      const overflowX = style?.overflowX ?? "";
      const overflowY = style?.overflowY ?? "";
      const canScrollX =
        element.scrollWidth > element.clientWidth && /auto|scroll|overlay/.test(overflowX);
      const canScrollY =
        element.scrollHeight > element.clientHeight && /auto|scroll|overlay/.test(overflowY);
      if (canScrollX || canScrollY) return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function shouldIgnoreViewportWheel(event: WheelEvent, boundary: HTMLElement): boolean {
  if (!(event.target instanceof Element)) return false;
  if (event.target.closest(".mmn-node__title") !== null) {
    return isScrollableWheelTarget(event.target, boundary);
  }
  return (
    event.target.closest(WHEEL_IGNORE_SELECTOR) !== null ||
    isScrollableWheelTarget(event.target, boundary)
  );
}
