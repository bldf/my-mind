import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import type { ViewToolbarControl, ToolbarCopyConfig, CopyDataFormat } from "../types";
import {
  Download,
  Expand,
  Maximize,
  Minimize,
  Minus,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Undo2,
  Copy,
} from "lucide-react";

const iconMap = {
  theme: Palette,
  undo: Undo2,
  redo: Redo2,
  reset: RotateCcw,
  fullscreen: Maximize,
  zoomOut: Minus,
  zoomIn: Plus,
  fitView: Expand,
  export: Download,
  search: Search,
  inspector: SlidersHorizontal,
  copy: Copy,
} satisfies Record<ViewToolbarControl, typeof Palette>;

const activeIconMap: Partial<Record<ViewToolbarControl, typeof Palette>> = {
  fullscreen: Minimize,
};

const labelMap = {
  theme: "Themes",
  undo: "Undo",
  redo: "Redo",
  reset: "Reset",
  fullscreen: "Fullscreen",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  fitView: "Fit view",
  export: "Export",
  search: "Search",
  inspector: "Inspector",
  copy: "Copy",
} satisfies Record<ViewToolbarControl, string>;

export interface ToolbarProps {
  controls: ViewToolbarControl[];
  activeControls?: Partial<Record<ViewToolbarControl, boolean>>;
  disabledControls?: Partial<Record<ViewToolbarControl, boolean>>;
  labels?: Partial<Record<ViewToolbarControl, string>>;
  onAction: (control: ViewToolbarControl) => void;
  copyConfig?: ToolbarCopyConfig;
  onCopyAction?: (format: CopyDataFormat) => void;
}
export function Toolbar({
  controls,
  activeControls,
  disabledControls,
  labels,
  onAction,
  copyConfig,
  onCopyAction,
}: ToolbarProps) {
  const [copyOpen, setCopyOpen] = useState(false);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const closeCopyMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyFormats: CopyDataFormat[] = copyConfig?.formats ?? ["json", "markdown", "mermaid"];
  const disabled = Boolean(disabledControls?.copy || copyConfig?.disabled);

  const clearCloseCopyMenuTimer = useCallback(() => {
    if (closeCopyMenuTimerRef.current) {
      clearTimeout(closeCopyMenuTimerRef.current);
      closeCopyMenuTimerRef.current = null;
    }
  }, []);

  const openCopyMenu = useCallback(() => {
    if (disabled) return;
    clearCloseCopyMenuTimer();
    setCopyOpen(true);
  }, [clearCloseCopyMenuTimer, disabled]);

  const closeCopyMenu = useCallback(() => {
    clearCloseCopyMenuTimer();
    setCopyOpen(false);
  }, [clearCloseCopyMenuTimer]);

  const scheduleCloseCopyMenu = useCallback(() => {
    clearCloseCopyMenuTimer();
    closeCopyMenuTimerRef.current = setTimeout(() => {
      setCopyOpen(false);
      closeCopyMenuTimerRef.current = null;
    }, 160);
  }, [clearCloseCopyMenuTimer]);

  useEffect(() => clearCloseCopyMenuTimer, [clearCloseCopyMenuTimer]);

  useEffect(() => {
    if (disabled) closeCopyMenu();
  }, [closeCopyMenu, disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeCopyMenu();
      copyButtonRef.current?.focus();
    }
  };

  const handleCopyBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeCopyMenu();
    }
  };

  return (
    <div className="mmn-toolbar" role="toolbar" aria-label="Mind map tools">
      {controls.map((control) => {
        if (control === "copy") {
          const Icon = iconMap.copy;
          const label = labels?.copy ?? labelMap.copy;
          return (
            <div
              key="copy"
              className={[
                "mmn-toolbar__copy-container",
                copyOpen && "mmn-toolbar__copy-container--open",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={openCopyMenu}
              onMouseLeave={scheduleCloseCopyMenu}
              onFocus={openCopyMenu}
              onBlur={handleCopyBlur}
              onKeyDown={handleKeyDown}
            >
              <button
                ref={copyButtonRef}
                type="button"
                title={label}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={copyOpen}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  clearCloseCopyMenuTimer();
                  setCopyOpen((open) => !open);
                }}
              >
                <Icon size={17} />
              </button>
              {copyOpen && (
                <div className="mmn-toolbar__copy-menu" role="menu" aria-label="Copy formats">
                  {copyFormats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onCopyAction?.(format);
                        closeCopyMenu();
                      }}
                    >
                      {copyConfig?.labels?.[format] ?? format.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        const active = Boolean(activeControls?.[control]);
        const disabledCtrl = Boolean(disabledControls?.[control]);
        const Icon = active ? (activeIconMap[control] ?? iconMap[control]) : iconMap[control];
        const label = labels?.[control] ?? labelMap[control];
        return (
          <button
            key={control}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active ? true : undefined}
            disabled={disabledCtrl}
            onClick={() => onAction(control)}
          >
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
}
