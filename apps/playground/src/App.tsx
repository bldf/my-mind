import {
  applyLayoutResult,
  cloneDocument,
  parseDocument,
  serializeDocument,
  simpleTreeLayout,
  type MindMapDocument,
  type NodeId,
} from "@my-mind-node/core";
import { exportMindMap } from "@my-mind-node/exporters";
import { importMindMap } from "@my-mind-node/importers";
import { MindMapEditor, OutlineEditor } from "@my-mind-node/react";
import { useMemo, useState } from "react";
import fixture from "../../../tests/fixtures/100-nodes.json";

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
  const [json, setJson] = useState(() => serializeDocument(document));
  const [error, setError] = useState<string | undefined>();
  const [tab, setTab] = useState<"json" | "outline">("json");

  const updateDocument = (next: MindMapDocument) => {
    setDocument(next);
    setJson(serializeDocument(next));
    setError(undefined);
  };

  const applyJson = () => {
    const parsed = parseDocument(json);
    if (!parsed.ok) {
      setError(`${parsed.error.code}: ${parsed.error.message}`);
      return;
    }
    updateDocument(parsed.value);
  };

  return (
    <main className="playground">
      <section className="workspace" aria-label="Mind map playground">
        <aside className="data-pane">
          <div className="segmented" role="tablist" aria-label="Data mode">
            <button type="button" aria-selected={tab === "json"} onClick={() => setTab("json")}>
              JSON
            </button>
            <button type="button" aria-selected={tab === "outline"} onClick={() => setTab("outline")}>
              Outline
            </button>
          </div>
          {tab === "json" ? (
            <>
              <textarea aria-label="Mind map JSON" value={json} onChange={(event) => setJson(event.target.value)} spellCheck={false} />
              <div className="actions">
                <button type="button" onClick={applyJson}>
                  Apply
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await importMindMap(json, "json");
                    if (result.ok) updateDocument(result.value);
                    else setError(result.error.message);
                  }}
                >
                  Import
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await exportMindMap(document, "markdown");
                    if (result.ok) setJson(String(result.value));
                    else setError(result.error.message);
                  }}
                >
                  Markdown
                </button>
              </div>
              {error ? <p className="error">{error}</p> : null}
            </>
          ) : (
            <OutlineEditor value={document} onChange={updateDocument} />
          )}
        </aside>
        <section className="canvas-pane">
          <MindMapEditor
            value={document}
            height="100%"
            breadcrumbs={{ hidden: true }}
            inspector={{ hidden: true }}
            toolbar={{ controls: ["theme", "search", "fullscreen", "zoomOut", "zoomIn", "fitView", "export"] }}
            onChange={updateDocument}
            onError={(mindMapError) => setError(`${mindMapError.code}: ${mindMapError.message}`)}
          />
        </section>
      </section>
    </main>
  );
}
