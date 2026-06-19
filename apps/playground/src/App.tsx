import {
  applyLayoutResult,
  cloneDocument,
  parseDocument,
  serializeDocument,
  simpleTreeLayout,
  type MindMapDocument,
  type MindMapError,
  type NodeId,
} from "@my-mind-node/core";
import { exportMindMap } from "@my-mind-node/exporters";
import { importMindMap, type ImportFormat } from "@my-mind-node/importers";
import { MindMapEditor, OutlineEditor } from "@my-mind-node/react";
import { useEffect, useMemo, useState } from "react";
import fixture from "../../../tests/fixtures/100-nodes.json";

type TextFormat = Extract<ImportFormat, "json" | "markdown">;
type DataTab = TextFormat | "outline";

const BRANCH_PALETTES = {
  left: {
    node: "#80d0dc",
    border: "#6fc4d1",
    edge: "#68c2cf",
    text: "#0f2530",
  },
  right: {
    node: "#ebb0db",
    border: "#df9bcf",
    edge: "#e0a0d2",
    text: "#301428",
  },
};

function formatError(error: MindMapError): string {
  return `${error.code}: ${error.message}`;
}

function getTextareaLabel(format: TextFormat): string {
  return format === "json" ? "Mind map JSON" : "Mind map Markdown";
}

function looksLikeMarkdown(value: string): boolean {
  return /^\s{0,3}#{1,6}\s+\S/m.test(value) || /^\s*(?:[-*+]|\d+\.)\s+\S/m.test(value);
}

function applyBranchPresentation(document: MindMapDocument): MindMapDocument {
  const next = cloneDocument(document);
  next.layout = { direction: "right", gapX: 180, gapY: 88 };
  next.theme = {
    id: "showcase",
    name: "Showcase",
    mode: "light",
    colors: {
      canvas: "#f3f4f6",
      node: "#ffffff",
      nodeText: "#111827",
      edge: "#ccd4df",
      selected: "#2563eb",
      accent: "#0f766e",
    },
  };

  const root = next.nodes[next.rootId];
  if (!root) return next;

  root.style = {
    ...root.style,
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
    color: "#111827",
    fontWeight: "bold",
    scale: 1.25,
  };

  const pivot = Math.ceil(root.children.length / 2);

  const paintBranch = (nodeId: NodeId, side: "left" | "right") => {
    const node = next.nodes[nodeId];
    if (!node) return;
    const palette = BRANCH_PALETTES[side];
    node.style = {
      ...node.style,
      backgroundColor: palette.node,
      borderColor: palette.border,
      color: palette.text,
      fontWeight: "medium",
    };
    node.metadata = {
      ...node.metadata,
      branchSide: side,
      branchEdgeColor: palette.edge,
    };
    for (const childId of node.children) {
      paintBranch(childId, side);
    }
  };

  root.children.forEach((childId, index) => paintBranch(childId, index < pivot ? "left" : "right"));
  return applyLayoutResult(next, simpleTreeLayout(next));
}

export default function App() {
  const initialDocument = useMemo(() => {
    const parsed = parseDocument(JSON.stringify(fixture));
    if (!parsed.ok) throw new Error(parsed.error.message);
    return applyBranchPresentation(parsed.value);
  }, []);
  const [document, setDocument] = useState<MindMapDocument>(() => {
    return initialDocument;
  });
  const [editorText, setEditorText] = useState(() => serializeDocument(document));
  const [error, setError] = useState<string | undefined>();
  const [tab, setTab] = useState<DataTab>("json");

  useEffect(() => {
    let cancelled = false;

    if (tab === "outline") return;

    if (tab === "json") {
      setEditorText(serializeDocument(document));
      return;
    }

    const syncMarkdown = async () => {
      const result = await exportMindMap(document, "markdown");
      if (cancelled) return;
      if (result.ok) setEditorText(String(result.value));
      else setError(formatError(result.error));
    };

    void syncMarkdown();

    return () => {
      cancelled = true;
    };
  }, [document, tab]);

  const updateDocument = (next: MindMapDocument) => {
    setDocument(next);
    setError(undefined);
  };

  const selectTab = (nextTab: DataTab) => {
    setTab(nextTab);
    setError(undefined);
  };

  const applyEditorText = async () => {
    if (tab === "outline") return;

    let parsed = await importMindMap(editorText, tab);
    if (
      !parsed.ok &&
      tab === "json" &&
      parsed.error.code === "INVALID_JSON" &&
      looksLikeMarkdown(editorText)
    ) {
      parsed = await importMindMap(editorText, "markdown");
      if (parsed.ok) setTab("markdown");
    }

    if (!parsed.ok) {
      setError(formatError(parsed.error));
      return;
    }
    updateDocument(parsed.value);
  };

  return (
    <main className="playground">
      <section className="workspace" aria-label="Mind map playground">
        <aside className="data-pane">
          <div className="segmented" role="tablist" aria-label="Data mode">
            <button type="button" aria-selected={tab === "json"} onClick={() => selectTab("json")}>
              JSON
            </button>
            <button
              type="button"
              aria-selected={tab === "markdown"}
              onClick={() => selectTab("markdown")}
            >
              Markdown
            </button>
            <button
              type="button"
              aria-selected={tab === "outline"}
              onClick={() => selectTab("outline")}
            >
              Outline
            </button>
          </div>
          {tab === "json" || tab === "markdown" ? (
            <>
              <textarea
                aria-label={getTextareaLabel(tab)}
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
                spellCheck={false}
              />
              <div className="actions">
                <button type="button" onClick={applyEditorText}>
                  Apply
                </button>
                <button type="button" onClick={applyEditorText}>
                  Import
                </button>
              </div>
            </>
          ) : (
            <OutlineEditor value={document} onChange={updateDocument} />
          )}
          {error ? <p className="error">{error}</p> : null}
        </aside>
        <section className="canvas-pane">
          <MindMapEditor
            value={document}
            height="100%"
            breadcrumbs={{ hidden: true }}
            inspector={{ hidden: true }}
            toolbar={{
              controls: ["theme", "search", "fullscreen", "zoomOut", "zoomIn", "fitView", "export"],
            }}
            onChange={updateDocument}
            onError={(mindMapError) => setError(`${mindMapError.code}: ${mindMapError.message}`)}
          />
        </section>
      </section>
    </main>
  );
}
