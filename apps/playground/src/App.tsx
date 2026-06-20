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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import fixture from "../../../tests/fixtures/100-nodes.json";

type TextFormat = Extract<ImportFormat, "json" | "markdown" | "mermaid">;
type DataTab = TextFormat | "outline";

function formatError(error: MindMapError): string {
  return `${error.code}: ${error.message}`;
}

function getTextareaLabel(format: TextFormat): string {
  if (format === "json") return "Mind map JSON";
  if (format === "markdown") return "Mind map Markdown";
  return "Mind map Mermaid";
}

function looksLikeMarkdown(value: string): boolean {
  return /^\s{0,3}#{1,6}\s+\S/m.test(value) || /^\s*(?:[-*+]|\d+\.)\s+\S/m.test(value);
}

function looksLikeMermaid(value: string): boolean {
  return /^\s*(?:```mermaid\s*)?mindmap\s*$/im.test(value);
}

function applyBranchPresentation(document: MindMapDocument): MindMapDocument {
  const next = cloneDocument(document);
  next.layout = { direction: "right", gapX: 180, gapY: 88 };
  if (!next.theme) {
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
  }

  const root = next.nodes[next.rootId];
  if (!root) return next;

  root.style = {
    ...root.style,
    fontWeight: "bold",
    scale: 1.25,
  };

  const pivot = Math.ceil(root.children.length / 2);

  const paintBranch = (nodeId: NodeId, side: "left" | "right") => {
    const node = next.nodes[nodeId];
    if (!node) return;
    node.style = {
      ...node.style,
      fontWeight: "medium",
    };
    node.metadata = {
      ...node.metadata,
      branchSide: side,
    };
    for (const childId of node.children) {
      paintBranch(childId, side);
    }
  };

  root.children.forEach((childId, index) => paintBranch(childId, index < pivot ? "left" : "right"));
  return applyLayoutResult(next, simpleTreeLayout(next));
}

export default function App() {
  const readonlyMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("readonly") === "1";
  }, []);
  const initialDocument = useMemo(() => {
    const parsed = parseDocument(JSON.stringify(fixture));
    if (!parsed.ok) throw new Error(parsed.error.message);
    return applyBranchPresentation(parsed.value);
  }, []);
  const [document, setDocument] = useState<MindMapDocument>(() => {
    return initialDocument;
  });
  const [tab, setTab] = useState<DataTab>("json");
  const [editorText, setEditorText] = useState(() => serializeDocument(initialDocument));
  const [error, setError] = useState<string | undefined>();
  const lastSyncedTextRef = useRef(serializeDocument(initialDocument));
  const lastImportedTextRef = useRef(serializeDocument(initialDocument));

  useEffect(() => {
    let cancelled = false;

    if (tab === "outline") return;

    if (tab === "json") {
      const serialized = serializeDocument(document);
      lastSyncedTextRef.current = serialized;
      setEditorText(serialized);
      return;
    }

    const syncText = async () => {
      const result = await exportMindMap(document, tab);
      if (cancelled) return;
      if (result.ok) {
        const text = String(result.value);
        lastSyncedTextRef.current = text;
        setEditorText(text);
      } else {
        setError(formatError(result.error));
      }
    };

    void syncText();

    return () => {
      cancelled = true;
    };
  }, [document, tab]);

  const updateDocument = useCallback((next: MindMapDocument) => {
    setDocument(next);
    setError(undefined);
  }, []);

  const selectTab = useCallback((nextTab: DataTab) => {
    setTab(nextTab);
    setError(undefined);
  }, []);

  const importEditorText = useCallback(async (text: string, force = false) => {
    if (tab === "outline") return;

    if (!force && (text === lastSyncedTextRef.current || text === lastImportedTextRef.current)) {
      return;
    }

    let parsed = await importMindMap(text, tab);
    if (!parsed.ok) {
      const fallbackFormat =
        tab !== "mermaid" && looksLikeMermaid(text)
          ? "mermaid"
          : tab !== "markdown" && looksLikeMarkdown(text)
            ? "markdown"
            : undefined;
      if (fallbackFormat) {
        parsed = await importMindMap(text, fallbackFormat);
        if (parsed.ok) setTab(fallbackFormat);
      }
    }

    if (!parsed.ok) {
      setError(formatError(parsed.error));
      return;
    }

    lastImportedTextRef.current = text;
    updateDocument(applyBranchPresentation(parsed.value));
  }, [tab, updateDocument]);

  useEffect(() => {
    if (tab === "outline") return;

    const timer = setTimeout(() => {
      void importEditorText(editorText, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [editorText, importEditorText, tab]);

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
              aria-selected={tab === "mermaid"}
              onClick={() => selectTab("mermaid")}
            >
              Mermaid
            </button>
            <button
              type="button"
              aria-selected={tab === "outline"}
              onClick={() => selectTab("outline")}
            >
              Outline
            </button>
          </div>
          {tab === "json" || tab === "markdown" || tab === "mermaid" ? (
            <>
              <textarea
                aria-label={getTextareaLabel(tab)}
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
                spellCheck={false}
              />
              <div className="actions">
                <button type="button" onClick={() => void importEditorText(editorText, true)}>
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
            readonly={readonlyMode}
            breadcrumbs={{ hidden: true }}
            inspector={{ hidden: true }}
            toolbar={{
              controls: ["theme", "search", "fullscreen", "zoomOut", "zoomIn", "fitView", "export"],
            }}
            onChange={readonlyMode ? undefined : updateDocument}
            onError={(mindMapError) => setError(`${mindMapError.code}: ${mindMapError.message}`)}
          />
        </section>
      </section>
    </main>
  );
}
