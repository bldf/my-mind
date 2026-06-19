import { expect, test } from "@playwright/test";

async function getPlaygroundDocument(page: import("@playwright/test").Page) {
  return JSON.parse(await page.getByLabel("Mind map JSON").inputValue()) as {
    rootId: string;
    nodes: Record<string, { parentId: string | null; children: string[]; title: string; collapsed: boolean }>;
  };
}

async function getNodeBox(page: import("@playwright/test").Page, nodeId: string) {
  const locator = page.locator(`.react-flow__node[data-id="${nodeId}"]`);
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Node ${nodeId} is not visible`);
  return { locator, box };
}

async function dragNodeToNode(
  page: import("@playwright/test").Page,
  sourceId: string,
  targetId: string,
  options: { targetY?: "top" | "center" | "bottom"; dropText?: string } = {},
) {
  const source = await getNodeBox(page, sourceId);
  const target = await getNodeBox(page, targetId);
  const sourceX = source.box.x + source.box.width / 2;
  const sourceY = source.box.y + source.box.height / 2;
  const targetX = target.box.x + target.box.width / 2;
  const targetY =
    options.targetY === "top"
      ? target.box.y + target.box.height * 0.08
      : options.targetY === "bottom"
        ? target.box.y + target.box.height * 0.92
        : target.box.y + target.box.height / 2;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  if (options.dropText) await expect(page.locator(".mmn-node__drop-label", { hasText: options.dropText })).toBeVisible();
  await page.mouse.up();
}

async function expectNodeInsideCanvas(page: import("@playwright/test").Page, nodeId: string) {
  await expect.poll(async () => {
    const node = await getNodeBox(page, nodeId);
    const canvas = await page.locator(".react-flow").boundingBox();
    if (!canvas) return false;
    return (
      node.box.x >= canvas.x &&
      node.box.y >= canvas.y &&
      node.box.x + node.box.width <= canvas.x + canvas.width &&
      node.box.y + node.box.height <= canvas.y + canvas.height
    );
  }).toBe(true);
}

test("playground renders editor, JSON pane and toolbar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Mind map playground")).toBeVisible();
  await expect(page.getByLabel("Mind map tools")).toBeVisible();
  await expect(page.getByRole("button", { name: "Themes" })).toBeVisible();
});

test("json parse errors are visible", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Mind map JSON").fill("{");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/INVALID_JSON/)).toBeVisible();
});

test("dragging a node follows the pointer and then returns to the stable layout", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop mouse drag behavior is covered separately from mobile touch basics.");

  await page.goto("/");
  const source = await getNodeBox(page, "node-1");
  const startX = source.box.x;
  const startY = source.box.y;

  await page.mouse.move(source.box.x + source.box.width / 2, source.box.y + source.box.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.box.x + source.box.width / 2 + 80, source.box.y + source.box.height / 2 + 24, { steps: 8 });
  await expect.poll(async () => Math.round(((await source.locator.boundingBox())?.x ?? startX) - startX)).toBeGreaterThan(20);
  await page.mouse.up();

  await expect.poll(async () => Math.abs(Math.round(((await source.locator.boundingBox())?.x ?? startX) - startX))).toBeLessThan(30);
  await expect.poll(async () => Math.abs(Math.round(((await source.locator.boundingBox())?.y ?? startY) - startY))).toBeLessThan(30);
});

test("dragging to node center reparents as a child on release", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop mouse drag behavior is covered separately from mobile touch basics.");

  await page.goto("/");
  await dragNodeToNode(page, "node-1", "node-2", { targetY: "center", dropText: "Drop to add as child" });

  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.parentId).toBe("node-2");
});

test("dragging away from a target before release does not commit the stale drop intent", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop mouse drag behavior is covered separately from mobile touch basics.");

  await page.goto("/");
  const source = await getNodeBox(page, "node-1");
  const target = await getNodeBox(page, "node-2");
  const canvas = await page.locator(".react-flow").boundingBox();
  if (!canvas) throw new Error("React Flow canvas is not visible");

  const before = await getPlaygroundDocument(page);
  await page.mouse.move(source.box.x + source.box.width / 2, source.box.y + source.box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.box.x + target.box.width / 2, target.box.y + target.box.height / 2, { steps: 12 });
  await expect(page.locator(".mmn-node__drop-label", { hasText: "Drop to add as child" })).toBeVisible();
  await page.mouse.move(canvas.x + canvas.width - 24, canvas.y + canvas.height - 24, { steps: 8 });
  await expect(page.locator(".mmn-node__drop-label", { hasText: "Drop to add as child" })).toBeHidden();
  await page.mouse.up();

  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.parentId).toBe(before.nodes["node-1"]!.parentId);
  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-0"]!.children.join(",")).toBe(before.nodes["node-0"]!.children.join(","));
});

test("dragging to upper and lower target zones sorts siblings", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop mouse drag behavior is covered separately from mobile touch basics.");

  await page.goto("/");
  await dragNodeToNode(page, "node-2", "node-1", { targetY: "top", dropText: "Insert before this node" });
  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-0"]!.children.slice(0, 2).join(",")).toBe("node-2,node-1");

  await dragNodeToNode(page, "node-2", "node-1", { targetY: "bottom", dropText: "Insert after this node" });
  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-0"]!.children.slice(0, 2).join(",")).toBe("node-1,node-2");
});

test("hover controls add child and toggle collapse", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop hover controls are covered separately from mobile touch basics.");

  await page.goto("/");
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await node.hover();
  await node.getByRole("button", { name: /^Add child to Topic 1$/ }).click();
  await expect
    .poll(async () => Object.values((await getPlaygroundDocument(page)).nodes).some((node) => node.parentId === "node-1" && node.title === "New child"))
    .toBe(true);

  await node.hover();
  await node.getByRole("button", { name: /^Collapse node Topic 1$/ }).click();
  await expect(page.locator('.mmn-node[data-node-id="node-5"]')).toBeHidden();

  await node.hover();
  await node.getByRole("button", { name: /^Expand node Topic 1$/ }).click();
  await expect(page.locator('.mmn-node[data-node-id="node-5"]')).toBeVisible();
});

test("multiline and long titles are saved and keep the root fully visible", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop text editing and viewport fitting are covered separately from mobile touch basics.");

  await page.goto("/");
  const root = page.locator('.react-flow__node[data-id="node-0"]');
  const title = root.getByLabel(/^Title for 100 node map$/);
  const nextTitle = "100 node map\nwith a long root title that should remain fully visible after editing";

  await title.fill(nextTitle);
  await page.getByRole("button", { name: "Themes" }).focus();

  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-0"]?.title).toBe(nextTitle);
  await expect(root.locator("textarea")).toHaveValue(nextTitle);
  await expectNodeInsideCanvas(page, "node-0");
});
