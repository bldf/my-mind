import {
  applyLayoutResult,
  createLayoutWorkerRequest,
  documentToLayoutGraph,
  simpleTreeLayout,
} from "@my-mind-node/core";
import type { LayoutResult, MindMapDocument, MindMapError } from "@my-mind-node/core";

export interface LayoutSchedulerOptions {
  debounceMs?: number;
  timeoutMs?: number;
  worker?: Worker;
  onError?: (error: MindMapError) => void;
}

export interface LayoutScheduler {
  schedule(document: MindMapDocument): Promise<MindMapDocument>;
  dispose(): void;
}

export function createLayoutScheduler(options: LayoutSchedulerOptions = {}): LayoutScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeRequestId = "";
  const debounceMs = options.debounceMs ?? 80;
  const timeoutMs = options.timeoutMs ?? 2500;

  return {
    schedule(document) {
      if (timer) clearTimeout(timer);
      activeRequestId = `layout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return new Promise((resolve) => {
        const requestId = activeRequestId;
        timer = setTimeout(() => {
          if (!options.worker) {
            resolve(applyLayoutResult(document, simpleTreeLayout(document)));
            return;
          }

          const timeout = setTimeout(() => {
            options.onError?.({
              code: "LAYOUT_TIMEOUT",
              message: "Layout worker did not respond before timeout",
              recoverable: true,
            });
            resolve(document);
          }, timeoutMs);

          options.worker.onmessage = (event: MessageEvent<{ requestId: string; result?: LayoutResult; error?: MindMapError }>) => {
            if (event.data.requestId !== activeRequestId || event.data.requestId !== requestId) return;
            clearTimeout(timeout);
            if (event.data.error) {
              options.onError?.(event.data.error);
              resolve(document);
              return;
            }
            resolve(event.data.result ? applyLayoutResult(document, event.data.result) : document);
          };

          options.worker.onerror = () => {
            clearTimeout(timeout);
            options.onError?.({
              code: "LAYOUT_WORKER_ERROR",
              message: "Layout worker failed",
              recoverable: true,
            });
            resolve(document);
          };

          options.worker.postMessage(createLayoutWorkerRequest(document, requestId));
        }, debounceMs);
      });
    },
    dispose() {
      if (timer) clearTimeout(timer);
      options.worker?.terminate();
    },
  };
}

export function layoutGraphInWorker(document: MindMapDocument): LayoutResult {
  const graph = documentToLayoutGraph(document);
  const positions = Object.fromEntries(graph.nodes.map((node) => [node.id, node.position]));
  return { positions };
}
