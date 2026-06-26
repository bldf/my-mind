import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyOperation,
  cloneDocument,
  type MindMapDocument,
  type MindMapOperation,
} from "@my-mind-node/core";
import { documentsEqual } from "../editor-utils";

interface HistoryState {
  past: MindMapOperation[];
  future: MindMapOperation[];
}

interface HistoryAvailability {
  canUndo: boolean;
  canRedo: boolean;
}

interface UseHistoryOptions {
  document: MindMapDocument;
  initialDocumentRef: React.RefObject<MindMapDocument | null>;
  commitDocument: (document: MindMapDocument) => void;
  readonly: boolean;
}

export function useHistory({
  document,
  initialDocumentRef,
  commitDocument,
  readonly,
}: UseHistoryOptions) {
  const history = useRef<HistoryState>({ past: [], future: [] });
  const [historyAvailability, setHistoryAvailability] = useState<HistoryAvailability>({
    canUndo: false,
    canRedo: false,
  });

  const syncHistoryAvailability = useCallback(() => {
    setHistoryAvailability({
      canUndo: history.current.past.length > 0,
      canRedo: history.current.future.length > 0,
    });
  }, []);

  const canReset = useMemo(
    () => !documentsEqual(document, initialDocumentRef.current!),
    [document, initialDocumentRef],
  );

  const undo = useCallback(() => {
    const operation = history.current.past.pop();
    if (!operation) return;
    history.current.future.unshift(operation);
    commitDocument(applyOperation(operation, "inverse"));
    syncHistoryAvailability();
  }, [commitDocument, syncHistoryAvailability]);

  const redo = useCallback(() => {
    const operation = history.current.future.shift();
    if (!operation) return;
    history.current.past.push(operation);
    commitDocument(applyOperation(operation, "forward"));
    syncHistoryAvailability();
  }, [commitDocument, syncHistoryAvailability]);

  const resetToInitialDocument = useCallback(() => {
    if (readonly || !canReset) return;
    history.current = { past: [], future: [] };
    syncHistoryAvailability();
    commitDocument(cloneDocument(initialDocumentRef.current!));
  }, [canReset, commitDocument, initialDocumentRef, readonly, syncHistoryAvailability]);

  return {
    history,
    historyAvailability,
    syncHistoryAvailability,
    canReset,
    undo,
    redo,
    resetToInitialDocument,
  };
}
