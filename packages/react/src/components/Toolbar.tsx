import type { ViewToolbarControl } from "../types";
import { Download, Expand, Maximize, Minus, Palette, Plus, Search, SlidersHorizontal } from "lucide-react";

const iconMap = {
  theme: Palette,
  fullscreen: Maximize,
  zoomOut: Minus,
  zoomIn: Plus,
  fitView: Expand,
  export: Download,
  search: Search,
  inspector: SlidersHorizontal,
} satisfies Record<ViewToolbarControl, typeof Palette>;

const labelMap = {
  theme: "Themes",
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
  onAction: (control: ViewToolbarControl) => void;
}

export function Toolbar({ controls, onAction }: ToolbarProps) {
  return (
    <div className="mmn-toolbar" role="toolbar" aria-label="Mind map tools">
      {controls.map((control) => {
        const Icon = iconMap[control];
        return (
          <button key={control} type="button" title={labelMap[control]} aria-label={labelMap[control]} onClick={() => onAction(control)}>
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
}
