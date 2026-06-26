import type { ViewToolbarControl } from "../types";
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
} satisfies Record<ViewToolbarControl, string>;

export interface ToolbarProps {
  controls: ViewToolbarControl[];
  activeControls?: Partial<Record<ViewToolbarControl, boolean>>;
  disabledControls?: Partial<Record<ViewToolbarControl, boolean>>;
  labels?: Partial<Record<ViewToolbarControl, string>>;
  onAction: (control: ViewToolbarControl) => void;
}

export function Toolbar({
  controls,
  activeControls,
  disabledControls,
  labels,
  onAction,
}: ToolbarProps) {
  return (
    <div className="mmn-toolbar" role="toolbar" aria-label="Mind map tools">
      {controls.map((control) => {
        const active = Boolean(activeControls?.[control]);
        const disabled = Boolean(disabledControls?.[control]);
        const Icon = active ? (activeIconMap[control] ?? iconMap[control]) : iconMap[control];
        const label = labels?.[control] ?? labelMap[control];
        return (
          <button
            key={control}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active ? true : undefined}
            disabled={disabled}
            onClick={() => onAction(control)}
          >
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
}
