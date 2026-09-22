import { afterEach, expect, it, vi } from "vitest";
import { asNodeId, createEmptyDocument, createLayoutWorkerRequest, createNode, dispatchCommand, simpleTreeLayout, type LayoutWorkerRequest } from "@my-mind-node/core";

afterEach(() => vi.unstubAllGlobals());

it("preserves branch direction and side collapse through the actual worker handler", async () => {
  let document = createEmptyDocument();
  const rootId = document.rootId;
  for (const [id, side] of [["a", "right"], ["b", "left"], ["c", "right"]] as const) {
    document.nodes[id] = createNode({ id: asNodeId(id), parentId: rootId, title: id, metadata: { branchSide: side } });
    document.nodes[rootId]!.children.push(asNodeId(id));
  }
  document = dispatchCommand(document, { type: "node.collapse", nodeIds: [rootId], side: "left", collapsed: true }).document;
  const worker = { onmessage: null as null | ((event: MessageEvent<LayoutWorkerRequest>) => void), postMessage: vi.fn() };
  vi.stubGlobal("self", worker);
  await import("../layout.worker");
  worker.onmessage!(new MessageEvent("message", { data: createLayoutWorkerRequest(document, "review-regression") }));
  const response = worker.postMessage.mock.calls[0]![0];
  expect(response.error).toBeUndefined();
  expect(response.result.positions).toEqual(simpleTreeLayout(document).positions);
  expect(response.result.positions.b).toBeUndefined();
  expect(response.result.positions.a.x).toBeGreaterThan(response.result.positions[rootId].x);
});
