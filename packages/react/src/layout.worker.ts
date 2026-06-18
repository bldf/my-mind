import { simpleTreeLayout, validateDocument } from "@my-mind-node/core";
import type { LayoutWorkerRequest, LayoutWorkerResponse } from "@my-mind-node/core";

self.onmessage = (event: MessageEvent<LayoutWorkerRequest>) => {
  try {
    const graph = event.data.graph;
    const documentLike = {
      schemaVersion: "1.0",
      id: "worker-doc",
      title: "Worker layout",
      rootId: graph.rootId,
      nodes: Object.fromEntries(
        graph.nodes.map((node) => [
          node.id,
          {
            id: node.id,
            parentId: node.parentId,
            children: graph.edges.filter((edge) => edge.sourceId === node.id).map((edge) => edge.targetId),
            title: node.data.title,
            collapsed: node.data.collapsed,
            position: node.position,
            links: [],
            tagIds: [],
            style: {},
            metadata: {},
          },
        ]),
      ),
      connections: [],
      tags: [],
      layout: graph.settings,
      revision: 0,
      metadata: {},
    };
    const document = validateDocument(documentLike);
    const response: LayoutWorkerResponse = document.ok
      ? { requestId: event.data.requestId, result: simpleTreeLayout(document.value) }
      : { requestId: event.data.requestId, error: document.error };
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      requestId: event.data.requestId,
      error: {
        code: "LAYOUT_WORKER_ERROR",
        message: error instanceof Error ? error.message : "Layout worker failed",
      },
    });
  }
};
