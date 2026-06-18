import { searchDocument } from "@my-mind-node/core";
import type { MindMapDocument, SearchResult } from "@my-mind-node/core";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export interface SearchPanelProps {
  document: MindMapDocument;
  open: boolean;
  onResultClick: (result: SearchResult) => void;
}

export function SearchPanel({ document, open, onResultClick }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchDocument(document, { query, limit: 20 }), [document, query]);
  if (!open) return null;

  return (
    <section className="mmn-search-panel" aria-label="Search panel">
      <label className="mmn-search-box">
        <Search size={15} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes" />
      </label>
      <div className="mmn-search-results">
        {results.map((result) => (
          <button key={`${result.nodeId}-${result.field}-${result.snippet}`} type="button" onClick={() => onResultClick(result)}>
            <strong>{document.nodes[result.nodeId]?.title}</strong>
            <span>{result.field}: {result.snippet}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
