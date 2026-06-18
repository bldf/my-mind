import type { MindMapTheme } from "@my-mind-node/core";
import { Check } from "lucide-react";

export interface ThemePanelProps {
  open: boolean;
  themes: MindMapTheme[];
  activeThemeId?: string;
  onClose: () => void;
  onSelect: (theme: MindMapTheme) => void;
}

export function ThemePanel({ open, themes, activeThemeId, onClose, onSelect }: ThemePanelProps) {
  if (!open) return null;

  return (
    <aside className="mmn-theme-panel" aria-label="Theme panel">
      <div className="mmn-panel__header">
        <h2>Themes</h2>
        <button type="button" aria-label="Close theme panel" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="mmn-theme-list">
        {themes.map((theme) => (
          <button key={theme.id} type="button" className="mmn-theme-option" onClick={() => onSelect(theme)}>
            <span className="mmn-theme-swatch" style={{ background: theme.colors.canvas }}>
              <span style={{ background: theme.colors.node, borderColor: theme.colors.edge }} />
            </span>
            <span>{theme.name}</span>
            {theme.id === activeThemeId ? <Check size={16} /> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
