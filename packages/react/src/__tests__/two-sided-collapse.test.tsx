import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  asNodeId,
  createEmptyDocument,
  createNode,
  dispatchCommand,
  type MindMapDocument,
} from "@my-mind-node/core";
import { MindMapEditor } from "../MindMapEditor";
import { MindMapViewer } from "../MindMapViewer";

function createTwoSidedMap(): MindMapDocument {
  const document = createEmptyDocument({ title: "Two-sided map", rootTitle: "Root" });
  const rootId = document.rootId;
  const left1 = asNodeId("left-1");
  const left2 = asNodeId("left-2");
  const right1 = asNodeId("right-1");
  const right2 = asNodeId("right-2");

  document.nodes[rootId]!.children = [left1, left2, right1, right2];
  document.nodes[left1] = createNode({
    id: left1,
    parentId: rootId,
    title: "Left 1",
    metadata: { branchSide: "left" },
  });
  document.nodes[left2] = createNode({
    id: left2,
    parentId: rootId,
    title: "Left 2",
    metadata: { branchSide: "left" },
  });
  document.nodes[right1] = createNode({
    id: right1,
    parentId: rootId,
    title: "Right 1",
    metadata: { branchSide: "right" },
  });
  document.nodes[right2] = createNode({
    id: right2,
    parentId: rootId,
    title: "Right 2",
    metadata: { branchSide: "right" },
  });

  return document;
}

describe("two-sided independent left/right branch collapse in MindMapEditor", () => {
  afterEach(() => cleanup());

  it("preserves colon-containing IDs for side and whole-node readonly collapse", async () => {
    const document = createTwoSidedMap();
    const oldRoot = document.rootId;
    const rootId = asNodeId("topic:root");
    document.rootId = rootId;
    document.nodes[rootId] = { ...document.nodes[oldRoot]!, id: rootId };
    delete document.nodes[oldRoot];
    for (const childId of document.nodes[rootId]!.children) document.nodes[childId]!.parentId = rootId;
    const childId = asNodeId("topic:child");
    document.nodes[childId] = createNode({ id: childId, parentId: asNodeId("right-1"), title: "Grandchild" });
    document.nodes[asNodeId("right-1")]!.children = [childId];
    document.nodes[childId]!.children = [asNodeId("leaf")];
    document.nodes.leaf = createNode({ id: asNodeId("leaf"), parentId: childId, title: "Leaf" });
    render(<MindMapViewer value={document} readonlyCollapsible branchListLayout={{ hidden: true }} />);
    fireEvent.click(await screen.findByLabelText("Collapse left branch of Root"));
    await waitFor(() => expect(screen.queryByText("Left 1")).toBeNull());
    expect(screen.getByText("Right 1")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Collapse node Grandchild"));
    await waitFor(() => expect(screen.queryByText("Leaf")).toBeNull());
    fireEvent.click(screen.getByLabelText("Expand Grandchild, 1 hidden nodes"));
    expect(await screen.findByText("Leaf")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Expand left branch of Root, 2 hidden nodes"));
    expect(await screen.findByText("Left 1")).toBeTruthy();
    expect(document.nodes[rootId]!.metadata.collapsedLeft).toBeUndefined();
  });

  it.each([1, 2])("keeps a collapsed side recoverable with %i remaining children", async (remaining) => {
    let document = createTwoSidedMap();
    document = dispatchCommand(document, { type: "node.collapse", nodeIds: [document.rootId], side: "left", collapsed: true }).document;
    for (const id of ["right-1", "right-2", ...(remaining === 1 ? ["left-2"] : [])]) {
      document = dispatchCommand(document, { type: "node.delete", nodeId: asNodeId(id) }).document;
    }
    render(<MindMapEditor defaultValue={document} />);
    expect(screen.queryByText("Left 1")).toBeNull();
    fireEvent.click(await screen.findByLabelText(`Expand left branch of Root, ${remaining} hidden nodes`));
    expect(await screen.findByText("Left 1")).toBeTruthy();
  });

  it("collapses and expands left and right branches independently in MindMapEditor", async () => {
    const document = createTwoSidedMap();
    render(<MindMapEditor defaultValue={document} />);

    // Initially all 4 children are visible
    expect(await screen.findByText("Left 1")).toBeTruthy();
    expect(screen.getByText("Left 2")).toBeTruthy();
    expect(screen.getByText("Right 1")).toBeTruthy();
    expect(screen.getByText("Right 2")).toBeTruthy();

    // Both left and right collapse buttons should exist on the root node
    const collapseLeftBtn = screen.getByLabelText("Collapse left branch of Root");
    const collapseRightBtn = screen.getByLabelText("Collapse right branch of Root");
    expect(collapseLeftBtn).toBeTruthy();
    expect(collapseRightBtn).toBeTruthy();

    // 1. Click collapse left branch
    fireEvent.click(collapseLeftBtn);

    // Left children should disappear, right children should stay visible
    await waitFor(() => expect(screen.queryByText("Left 1")).toBeNull());
    expect(screen.queryByText("Left 2")).toBeNull();
    expect(screen.getByText("Right 1")).toBeTruthy();
    expect(screen.getByText("Right 2")).toBeTruthy();

    // Left side shows expand count button, right side still shows collapse button
    expect(screen.getByLabelText(/^Expand left branch of Root, 2 hidden nodes$/)).toBeTruthy();
    expect(screen.getByLabelText("Collapse right branch of Root")).toBeTruthy();

    // 2. Click collapse right branch
    fireEvent.click(screen.getByLabelText("Collapse right branch of Root"));

    // Now right children should also disappear
    await waitFor(() => expect(screen.queryByText("Right 1")).toBeNull());
    expect(screen.queryByText("Right 2")).toBeNull();

    // Both left and right show expand count buttons
    expect(screen.getByLabelText(/^Expand left branch of Root, 2 hidden nodes$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Expand right branch of Root, 2 hidden nodes$/)).toBeTruthy();

    // 3. Click expand left branch
    fireEvent.click(screen.getByLabelText(/^Expand left branch of Root, 2 hidden nodes$/));

    // Left children reappear, right children remain hidden
    expect(await screen.findByText("Left 1")).toBeTruthy();
    expect(screen.getByText("Left 2")).toBeTruthy();
    expect(screen.queryByText("Right 1")).toBeNull();
    expect(screen.queryByText("Right 2")).toBeNull();

    // Left side now has collapse button again, right side still has expand button
    expect(screen.getByLabelText("Collapse left branch of Root")).toBeTruthy();
    expect(screen.getByLabelText(/^Expand right branch of Root, 2 hidden nodes$/)).toBeTruthy();

    // 4. Click expand right branch
    fireEvent.click(screen.getByLabelText(/^Expand right branch of Root, 2 hidden nodes$/));

    // Both sides are now visible again
    expect(await screen.findByText("Right 1")).toBeTruthy();
    expect(screen.getByText("Right 2")).toBeTruthy();
    expect(screen.getByText("Left 1")).toBeTruthy();
    expect(screen.getByText("Left 2")).toBeTruthy();
  });

  it("supports independent left/right branch collapse in MindMapViewer with readonlyCollapsible", async () => {
    const document = createTwoSidedMap();
    render(<MindMapViewer value={document} readonlyCollapsible />);

    expect(await screen.findByText("Left 1")).toBeTruthy();
    expect(screen.getByText("Right 1")).toBeTruthy();

    // Collapse left side in readonly viewer
    fireEvent.click(screen.getByLabelText("Collapse left branch of Root"));

    await waitFor(() => expect(screen.queryByText("Left 1")).toBeNull());
    expect(screen.getByText("Right 1")).toBeTruthy();
    expect(document.nodes[asNodeId("left-1")]!.collapsed).toBe(false);

    // Expand left side in readonly viewer
    fireEvent.click(screen.getByLabelText(/^Expand left branch of Root, 2 hidden nodes$/));
    expect(await screen.findByText("Left 1")).toBeTruthy();
    expect(screen.getByText("Right 1")).toBeTruthy();
  });
});
