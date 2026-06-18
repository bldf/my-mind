import { parseDocument, serializeDocument, type MindMapDocument } from "@my-mind-node/core";
import { exportMindMap } from "@my-mind-node/exporters";
import { importMindMap } from "@my-mind-node/importers";
import { MindMapEditor, OutlineEditor } from "@my-mind-node/react";
import { useMemo, useState } from "react";
import fixture from "../../../tests/fixtures/100-nodes.json";

export default function App() {
  const initialDocument = useMemo(() => parseDocument(JSON.stringify(fixture)), []);
  const [document, setDocument] = useState<MindMapDocument>(() => {
    if (!initialDocument.ok) throw new Error(initialDocument.error.message);
    return initialDocument.value;
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
              <textarea value={json} onChange={(event) => setJson(event.target.value)} spellCheck={false} />
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
            toolbar={{ controls: ["theme", "search", "inspector", "fullscreen", "zoomOut", "zoomIn", "fitView", "export"] }}
            onChange={updateDocument}
            onError={(mindMapError) => setError(`${mindMapError.code}: ${mindMapError.message}`)}
          />
        </section>
      </section>
    </main>
  );
}
