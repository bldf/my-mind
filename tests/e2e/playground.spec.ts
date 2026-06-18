import { expect, test } from "@playwright/test";

async function getPlaygroundDocument(page: import("@playwright/test").Page) {
  return JSON.parse(await page.locator("textarea").inputValue()) as {
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
  options: { targetY?: "top" | "center" | "bottom"; holdMs?: number; dropText?: string } = {},
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
  if (options.holdMs) await page.waitForTimeout(options.holdMs);
  await page.mouse.up();
}

test("playground renders editor, JSON pane and toolbar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Mind map playground")).toBeVisible();
  await expect(page.getByLabel("Mind map tools")).toBeVisible();
  await expect(page.getByRole("button", { name: "Themes" })).toBeVisible();
});

test("json parse errors are visible", async ({ page }) => {
  await page.goto("/");
  await page.locator("textarea").fill("{");
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

test("dragging to node center for 2 seconds reparents as a child", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop mouse drag behavior is covered separately from mobile touch basics.");

  await page.goto("/");
  await dragNodeToNode(page, "node-1", "node-2", { targetY: "center", holdMs: 2150, dropText: "Hold to add as child" });

  await expect.poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.parentId).toBe("node-2");
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
