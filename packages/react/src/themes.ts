import type { MindMapTheme } from "@my-mind-node/core";

export const defaultThemes: MindMapTheme[] = [
  {
    id: "paper",
    name: "Paper",
    mode: "light",
    colors: {
      canvas: "#f7f8fb",
      node: "#ffffff",
      nodeText: "#111827",
      edge: "#758195",
      selected: "#2563eb",
      accent: "#0f766e",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    mode: "dark",
    colors: {
      canvas: "#111315",
      node: "#1f242a",
      nodeText: "#f8fafc",
      edge: "#8b98a9",
      selected: "#38bdf8",
      accent: "#f59e0b",
    },
  },
  {
    id: "field",
    name: "Field",
    mode: "light",
    colors: {
      canvas: "#f3f7f1",
      node: "#fffffb",
      nodeText: "#1e293b",
      edge: "#6f7f68",
      selected: "#16a34a",
      accent: "#b45309",
    },
  },
];

export function resolveTheme(theme?: MindMapTheme, documentTheme?: MindMapTheme): MindMapTheme {
  return theme ?? documentTheme ?? defaultThemes[0]!;
}
