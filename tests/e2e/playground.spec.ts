import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  page.goto = async (url: string, options?: Parameters<typeof originalGoto>[1]) => {
    const baseUrl = "http://localhost:5173";
    const absoluteUrl = new URL(url, baseUrl);
    if (!absoluteUrl.searchParams.has("fitViewOnInit")) {
      absoluteUrl.searchParams.set("fitViewOnInit", "1");
    }
    const finalUrl = url.startsWith("/")
      ? absoluteUrl.pathname + absoluteUrl.search + absoluteUrl.hash
      : absoluteUrl.toString();
    return originalGoto(finalUrl, options);
  };
});

async function getPlaygroundDocument(page: import("@playwright/test").Page) {
  return JSON.parse(await page.getByLabel("Mind map JSON").inputValue()) as {
    rootId: string;
    nodes: Record<
      string,
      {
        parentId: string | null;
        children: string[];
        links?: { label?: string; url: string }[];
        metadata?: Record<string, unknown>;
        position: { x: number; y: number };
        title: string;
        collapsed: boolean;
        style?: { scale?: number; backgroundColor?: string };
      }
    >;
  };
}

async function getNodeBox(page: import("@playwright/test").Page, nodeId: string) {
  const locator = page.locator(`.react-flow__node[data-id="${nodeId}"]`);
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Node ${nodeId} is not visible`);
  return { locator, box };
}

async function waitForViewportSettled(page: import("@playwright/test").Page) {
  let previousTransform = "";
  let stablePolls = 0;
  await expect
    .poll(
      async () => {
        const currentTransform = await getViewportTransform(page);
        stablePolls = currentTransform === previousTransform ? stablePolls + 1 : 0;
        previousTransform = currentTransform;
        return stablePolls;
      },
      { intervals: [100, 100, 100, 100, 100] },
    )
    .toBeGreaterThanOrEqual(2);
}

async function dragNodeToNode(
  page: import("@playwright/test").Page,
  sourceId: string,
  targetId: string,
  options: { targetY?: "top" | "center" | "bottom"; dropText?: string } = {},
) {
  await waitForViewportSettled(page);
  const source = await getNodeBox(page, sourceId);
  const target = await getNodeBox(page, targetId);
  const sourceX = source.box.x + source.box.width / 2;
  const sourceY = source.box.y + source.box.height / 2;
  const targetX = target.box.x + target.box.width / 2;
  const sortOffset = Math.min(44, Math.max(18, source.box.height / 2 + 4));
  const targetY =
    options.targetY === "top"
      ? target.box.y - sortOffset
      : options.targetY === "bottom"
        ? target.box.y + target.box.height + sortOffset
        : target.box.y + target.box.height / 2;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  if (options.dropText)
    await expect(
      page.locator(".mmn-node__drop-label", { hasText: options.dropText }),
    ).toBeVisible();
  await page.mouse.up();
}

async function getViewportTransform(page: import("@playwright/test").Page) {
  return page
    .locator(".react-flow__viewport")
    .evaluate((element) => getComputedStyle(element).transform);
}

async function getViewportState(page: import("@playwright/test").Page) {
  return page.locator(".react-flow__viewport").evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { x: matrix.e, y: matrix.f, zoom: matrix.a };
  });
}

async function dispatchPinchLikeWheel(
  page: import("@playwright/test").Page,
  point: { x: number; y: number },
  deltaY: number,
) {
  await page.locator(".react-flow").dispatchEvent("wheel", {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    ctrlKey: true,
    deltaY,
  });
}

async function expectNodeInsideCanvas(page: import("@playwright/test").Page, nodeId: string) {
  await expect
    .poll(async () => {
      const node = await getNodeBox(page, nodeId);
      const canvas = await page.locator(".react-flow").boundingBox();
      if (!canvas) return false;
      return (
        node.box.x >= canvas.x &&
        node.box.y >= canvas.y &&
        node.box.x + node.box.width <= canvas.x + canvas.width &&
        node.box.y + node.box.height <= canvas.y + canvas.height
      );
    })
    .toBe(true);
}

async function expectVisibleNodesCenteredInCanvas(
  page: import("@playwright/test").Page,
  maxDelta = 48,
) {
  await expect
    .poll(async () =>
      page.locator(".react-flow").evaluate((flowElement) => {
        const canvasRect = flowElement.getBoundingClientRect();
        const nodes = Array.from(flowElement.querySelectorAll<HTMLElement>(".react-flow__node"));
        if (nodes.length === 0) return Number.POSITIVE_INFINITY;

        const bounds = nodes.reduce(
          (current, node) => {
            const rect = node.getBoundingClientRect();
            return {
              left: Math.min(current.left, rect.left),
              top: Math.min(current.top, rect.top),
              right: Math.max(current.right, rect.right),
              bottom: Math.max(current.bottom, rect.bottom),
            };
          },
          {
            left: Number.POSITIVE_INFINITY,
            top: Number.POSITIVE_INFINITY,
            right: Number.NEGATIVE_INFINITY,
            bottom: Number.NEGATIVE_INFINITY,
          },
        );

        const nodeCenterX = (bounds.left + bounds.right) / 2;
        const nodeCenterY = (bounds.top + bounds.bottom) / 2;
        const canvasCenterX = canvasRect.left + canvasRect.width / 2;
        const canvasCenterY = canvasRect.top + canvasRect.height / 2;
        return Math.max(
          Math.abs(nodeCenterX - canvasCenterX),
          Math.abs(nodeCenterY - canvasCenterY),
        );
      }),
    )
    .toBeLessThan(maxDelta);
}

async function expectNodeTitleNotClipped(page: import("@playwright/test").Page, nodeId: string) {
  await expect
    .poll(async () =>
      page.locator(`.react-flow__node[data-id="${nodeId}"] textarea`).evaluate((textarea) => ({
        horizontal: textarea.scrollWidth <= textarea.clientWidth + 1,
        vertical: textarea.scrollHeight <= textarea.clientHeight + 1,
      })),
    )
    .toEqual({ horizontal: true, vertical: true });
}

async function loadSingleNodeResizeDocument(page: import("@playwright/test").Page) {
  await page.getByLabel("Mind map JSON").fill(`{
    "schemaVersion": "1.0",
    "id": "resize-doc",
    "title": "Resize map",
    "rootId": "resize-root",
    "nodes": {
      "resize-root": {
        "id": "resize-root",
        "parentId": null,
        "children": [],
        "title": "Resize map",
        "links": [],
        "tagIds": [],
        "collapsed": false,
        "position": { "x": 0, "y": 0 },
        "style": {},
        "metadata": {}
      }
    },
    "connections": [],
    "tags": [],
    "layout": { "direction": "right", "gapX": 180, "gapY": 88 },
    "revision": 0,
    "metadata": {}
  }`);
  await expect(page.getByLabel("Title for Resize map")).toBeVisible();
}

test("playground renders editor, JSON pane and toolbar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Mind map playground")).toBeVisible();
  await expect(page.getByLabel("Mind map tools")).toBeVisible();
  await expect(page.getByRole("button", { name: "Themes" })).toBeVisible();
  await expect(page.locator(".react-flow__controls")).toHaveCount(0);
  await expectNodeTitleNotClipped(page, "node-0");
});

test("toolbar and breadcrumbs stay inside a narrow editor without overlapping", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The narrow desktop embed is covered with an explicit viewport.");

  await page.setViewportSize({ width: 640, height: 820 });
  await page.goto("/?showBreadcrumbs=1");
  await expect(page.getByLabel("Node path")).toBeVisible();

  const selectedNode = await getNodeBox(page, "node-5");
  await selectedNode.locator.click();
  await page.locator(".react-flow__pane").click({
    button: "right",
    position: { x: 12, y: 12 },
  });
  await expect(page.getByLabel("Node path").getByRole("button")).toHaveCount(3);

  await expect
    .poll(async () =>
      page.locator(".mmn-editor").evaluate((editor) => {
        const toolbar = editor.querySelector<HTMLElement>(".mmn-toolbar");
        const breadcrumbs = editor.querySelector<HTMLElement>(".mmn-breadcrumbs");
        if (!toolbar || !breadcrumbs) return false;
        const editorRect = editor.getBoundingClientRect();
        const toolbarRect = toolbar.getBoundingClientRect();
        const breadcrumbsRect = breadcrumbs.getBoundingClientRect();
        const overlaps =
          toolbarRect.left < breadcrumbsRect.right &&
          toolbarRect.right > breadcrumbsRect.left &&
          toolbarRect.top < breadcrumbsRect.bottom &&
          toolbarRect.bottom > breadcrumbsRect.top;
        return (
          !overlaps &&
          toolbarRect.left >= editorRect.left &&
          toolbarRect.right <= editorRect.right &&
          breadcrumbsRect.left >= editorRect.left &&
          breadcrumbsRect.right <= editorRect.right
        );
      }),
    )
    .toBe(true);
});

test("hidden search configuration removes the toolbar entry", async ({ page }) => {
  await page.goto("/?hideSearch=1");
  await expect(page.getByLabel("Mind map tools")).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toHaveCount(0);
});

test("ordinary wheel input pans the viewport without changing zoom", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop wheel input is covered separately from mobile touch basics.");

  await page.goto("/");
  await waitForViewportSettled(page);
  const canvas = await page.locator(".react-flow").boundingBox();
  if (!canvas) throw new Error("React Flow canvas is not visible");
  const beforeViewport = await getViewportState(page);

  await page.mouse.move(canvas.x + canvas.width - 48, canvas.y + canvas.height - 48);
  await page.mouse.wheel(36, 72);

  await expect
    .poll(async () => {
      const viewport = await getViewportState(page);
      return Math.abs(viewport.x - beforeViewport.x) + Math.abs(viewport.y - beforeViewport.y);
    })
    .toBeGreaterThan(20);
  const afterViewport = await getViewportState(page);
  expect(afterViewport.zoom).toBeCloseTo(beforeViewport.zoom, 5);
  expect(afterViewport.x).toBeLessThan(beforeViewport.x);
  expect(afterViewport.y).toBeLessThan(beforeViewport.y);
});

test("ordinary wheel input over an editable node title still pans the viewport", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop wheel input is covered separately from mobile touch basics.");

  await page.goto("/");
  await waitForViewportSettled(page);
  const node = await getNodeBox(page, "node-1");
  const title = node.locator.locator("textarea");
  const titleBox = await title.boundingBox();
  if (!titleBox) throw new Error("Node title textarea is not visible");
  const beforeViewport = await getViewportState(page);

  await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
  await page.mouse.wheel(36, 72);

  await expect
    .poll(async () => {
      const viewport = await getViewportState(page);
      return Math.abs(viewport.x - beforeViewport.x) + Math.abs(viewport.y - beforeViewport.y);
    })
    .toBeGreaterThan(20);
  const afterViewport = await getViewportState(page);
  expect(afterViewport.zoom).toBeCloseTo(beforeViewport.zoom, 5);
  expect(afterViewport.x).toBeLessThan(beforeViewport.x);
  expect(afterViewport.y).toBeLessThan(beforeViewport.y);
});

test("pinch-like wheel deltas zoom smoothly around the pointer", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop wheel input is covered separately from mobile touch basics.");

  await page.goto("/");
  await waitForViewportSettled(page);
  const node = await getNodeBox(page, "node-1");
  const pointer = {
    x: node.box.x + node.box.width / 2,
    y: node.box.y + node.box.height / 2,
  };
  const beforeViewport = await getViewportState(page);
  const beforeBox = await node.locator.boundingBox();
  if (!beforeBox) throw new Error("Node box is unavailable before wheel zoom");

  await dispatchPinchLikeWheel(page, pointer, -20);

  await expect
    .poll(async () => (await getViewportState(page)).zoom)
    .toBeGreaterThan(beforeViewport.zoom);
  const afterViewport = await getViewportState(page);
  expect(afterViewport.zoom - beforeViewport.zoom).toBeLessThan(0.05);

  const afterBox = await node.locator.boundingBox();
  if (!afterBox) throw new Error("Node box is unavailable after wheel zoom");
  const beforeCenter = {
    x: beforeBox.x + beforeBox.width / 2,
    y: beforeBox.y + beforeBox.height / 2,
  };
  const afterCenter = {
    x: afterBox.x + afterBox.width / 2,
    y: afterBox.y + afterBox.height / 2,
  };
  expect(Math.abs(afterCenter.x - beforeCenter.x)).toBeLessThan(4);
  expect(Math.abs(afterCenter.y - beforeCenter.y)).toBeLessThan(4);
});

test("fullscreen toolbar button enters and exits the editor container", async ({ page }) => {
  await page.addInitScript(() => {
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {
        fullscreenElement = document.querySelector(".mmn-editor");
        document.dispatchEvent(new Event("fullscreenchange"));
      },
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: async () => {
        fullscreenElement = null;
        document.dispatchEvent(new Event("fullscreenchange"));
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
  await expect
    .poll(() =>
      page.locator(".mmn-editor").evaluate((element) => document.fullscreenElement === element),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test("json parse errors are visible", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Mind map JSON").fill("{");
  await expect(page.getByText(/INVALID_JSON/)).toBeVisible();
});

test("markdown data mode applies markdown instead of parsing it as json", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Markdown" }).click();
  await page.getByLabel("Mind map Markdown").fill("# Edited map\n- Alpha\n  - Beta");

  await expect(page.getByText(/INVALID_JSON/)).toHaveCount(0);
  await expect(page.getByLabel("Title for Edited map")).toBeVisible();
  await expect(page.getByLabel("Title for Alpha")).toBeVisible();
  await page.getByRole("button", { name: "JSON" }).click();
  await expect
    .poll(async () => {
      const document = await getPlaygroundDocument(page);
      const root = document.nodes[document.rootId];
      const alpha = root?.children[0] ? document.nodes[root.children[0]] : undefined;
      const beta = alpha?.children[0] ? document.nodes[alpha.children[0]] : undefined;
      return [root?.title, alpha?.title, beta?.title].join(">");
    })
    .toBe("Edited map>Alpha>Beta");
});

test("mermaid data mode applies mindmap syntax", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mermaid" }).click();
  await page
    .getByLabel("Mind map Mermaid")
    .fill("mindmap\n  root((Edited map))\n    Professional terminal\n      Ghostty");

  await expect(page.getByText(/UNSUPPORTED_MERMAID|EMPTY_MERMAID/)).toHaveCount(0);
  await expect(page.getByLabel("Title for Edited map")).toBeVisible();
  await expect(page.getByLabel("Title for Professional terminal")).toBeVisible();
  await expect(page.getByLabel("Title for Ghostty")).toBeVisible();
  await page.getByRole("button", { name: "JSON" }).click();
  await expect
    .poll(async () => {
      const document = await getPlaygroundDocument(page);
      const root = document.nodes[document.rootId];
      const terminal = root?.children[0] ? document.nodes[root.children[0]] : undefined;
      const ghostty = terminal?.children[0] ? document.nodes[terminal.children[0]] : undefined;
      return [root?.title, terminal?.title, ghostty?.title].join(">");
    })
    .toBe("Edited map>Professional terminal>Ghostty");
});

test("json data mode falls back to markdown when markdown is pasted", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Mind map JSON").fill(`# 100 node map
- Topssssic 1
  - Topic 5
    - Topic 21
      - Topic 88
        - [Example](https://example.com)
- Topic 2`);

  await expect(page.getByText(/INVALID_JSON/)).toHaveCount(0);
  await expect(page.getByLabel("Mind map Markdown")).toBeVisible();
  await expect(page.getByLabel("Title for 100 node map")).toBeVisible();
  await expect(page.getByLabel("Title for Topssssic 1")).toBeVisible();
  await page.getByRole("button", { name: "JSON" }).click();
  await expect
    .poll(async () => {
      const document = await getPlaygroundDocument(page);
      const topNode = Object.values(document.nodes).find((node) => node.title === "Topssssic 1");
      const topic2 = Object.values(document.nodes).find(
        (node) => node.parentId === document.rootId && node.title === "Topic 2",
      );
      const linkNode = Object.values(document.nodes).find((node) => node.title === "Topic 88");
      const root = document.nodes[document.rootId];
      return {
        leftBranch: root && topNode ? topNode.position.x < root.position.x : false,
        link: linkNode?.links?.[0]?.url,
        rightBranch: root && topic2 ? topic2.position.x > root.position.x : false,
        root: root?.title,
        rootScale: root?.style?.scale,
        topSide: topNode?.metadata?.branchSide,
        top: topNode?.title,
      };
    })
    .toEqual({
      leftBranch: true,
      link: "https://example.com",
      rightBranch: true,
      root: "100 node map",
      rootScale: 1.25,
      topSide: "left",
      top: "Topssssic 1",
    });
});

test("readonly markdown link nodes open through the safe default opener", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Readonly link navigation is covered in desktop browser E2E.");

  await page.addInitScript(() => {
    const openedLinks: Array<{ features?: string; target?: string; url: string }> = [];
    Object.defineProperty(window, "__openedLinks", {
      configurable: true,
      value: openedLinks,
    });
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      openedLinks.push({ url: String(url), target, features });
      return null;
    }) as typeof window.open;
  });

  await page.goto("/?readonly=1");
  await page.getByRole("button", { name: "Markdown" }).click();
  await page.getByLabel("Mind map Markdown").fill(`# Link map
- Topic 1
  - Topic 88
    - [Example](https://example.com)`);

  const linkNode = page.getByRole("button", { name: "Open link Example from Topic 88" });
  await expect(linkNode).toBeVisible();
  await linkNode.click();
  await expect(page.getByText(/OPEN_LINK_FAILED/)).toHaveCount(0);

  await expect
    .poll(async () =>
      page.evaluate(() => (window as unknown as { __openedLinks: unknown[] }).__openedLinks),
    )
    .toEqual([
      {
        url: "https://example.com",
        target: "_blank",
        features: "noopener,noreferrer",
      },
    ]);
});

test("invalid input does not cover valid document and error disappears on fix", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Title for 100 node map")).toBeVisible();

  // Fill invalid JSON
  await page.getByLabel("Mind map JSON").fill("{");
  await expect(page.getByText(/INVALID_JSON/)).toBeVisible();

  // Canvas should NOT be covered (the old node is still visible)
  await expect(page.getByLabel("Title for 100 node map")).toBeVisible();

  // Fix the JSON
  await page.getByLabel("Mind map JSON").fill(`{
    "schemaVersion": "1.0",
    "id": "test-doc",
    "title": "Fixed Map",
    "rootId": "node-0",
    "nodes": {
      "node-0": {
        "id": "node-0",
        "parentId": null,
        "children": [],
        "title": "Fixed Map",
        "links": [],
        "tagIds": [],
        "collapsed": false,
        "position": { "x": 0, "y": 0 },
        "style": {},
        "metadata": {}
      }
    },
    "connections": [],
    "tags": [],
    "layout": { "direction": "right", "gapX": 180, "gapY": 88 },
    "revision": 1,
    "metadata": {}
  }`);

  // Error should disappear and map should update
  await expect(page.getByText(/INVALID_JSON/)).toHaveCount(0);
  await expect(page.getByLabel("Title for Fixed Map")).toBeVisible();
});

test("Graphite theme dark mode visual style data-theme-mode is set", async ({ page }) => {
  await page.goto("/");

  // Open themes panel
  await page.getByRole("button", { name: "Themes" }).click();

  // Select Graphite
  await page.getByRole("button", { name: "Graphite" }).click();

  // Check that the data-theme-mode attribute is set on .mmn-editor
  const editor = page.locator(".mmn-editor");
  await expect(editor).toHaveAttribute("data-theme-mode", "dark");
  await expect(editor).toHaveCSS("background-color", "rgb(16, 23, 42)");
});

test("dragging a node follows the pointer and then returns to the stable layout", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop mouse drag behavior is covered separately from mobile touch basics.",
  );

  await page.goto("/");
  await waitForViewportSettled(page);
  await page.locator(".mmn-toolbar").getByRole("button", { name: "Zoom in" }).click();
  const viewportBeforeDrag = await getViewportTransform(page);
  const source = await getNodeBox(page, "node-1");
  const child = await getNodeBox(page, "node-5");
  const startX = source.box.x;
  const startY = source.box.y;
  const childStartX = child.box.x;
  const childStartY = child.box.y;
  const beforeDocument = await getPlaygroundDocument(page);

  await page.mouse.move(source.box.x + source.box.width / 2, source.box.y + source.box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    source.box.x + source.box.width / 2 + 80,
    source.box.y + source.box.height / 2 + 24,
    { steps: 8 },
  );
  await expect
    .poll(async () => Math.round(((await source.locator.boundingBox())?.x ?? startX) - startX))
    .toBeGreaterThan(20);
  await expect
    .poll(async () => {
      const sourceBox = await source.locator.boundingBox();
      const childBox = await child.locator.boundingBox();
      if (!sourceBox || !childBox) return false;
      const sourceDelta = { x: sourceBox.x - startX, y: sourceBox.y - startY };
      const childDelta = { x: childBox.x - childStartX, y: childBox.y - childStartY };
      return (
        childDelta.x > 20 &&
        Math.abs(childDelta.x - sourceDelta.x) < 8 &&
        Math.abs(childDelta.y - sourceDelta.y) < 8
      );
    })
    .toBe(true);
  const canvas = await page.locator(".react-flow").boundingBox();
  if (!canvas) throw new Error("React Flow canvas is not visible");
  await page.mouse.move(canvas.x + canvas.width - 120, canvas.y + canvas.height - 120, {
    steps: 8,
  });
  await page.mouse.up();

  await expect
    .poll(async () =>
      Math.abs(Math.round(((await source.locator.boundingBox())?.x ?? startX) - startX)),
    )
    .toBeLessThan(30);
  await expect
    .poll(async () =>
      Math.abs(Math.round(((await source.locator.boundingBox())?.y ?? startY) - startY)),
    )
    .toBeLessThan(30);
  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-5"]?.parentId)
    .toBe(beforeDocument.nodes["node-5"]!.parentId);
  await expect.poll(async () => getViewportTransform(page)).toBe(viewportBeforeDrag);
});

test("container resize recenters a single-node document", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop responsive canvas resizing is covered separately.");

  await page.goto("/");
  await loadSingleNodeResizeDocument(page);
  await page.getByRole("button", { name: "Zoom out" }).click();
  await waitForViewportSettled(page);

  const beforeViewport = await getViewportState(page);
  await page.locator(".workspace").evaluate((element) => {
    (element as HTMLElement).style.gridTemplateColumns = "520px minmax(0, 1fr)";
  });

  await expect
    .poll(async () => {
      const node = await getNodeBox(page, "resize-root");
      const canvas = await page.locator(".react-flow").boundingBox();
      if (!canvas) return Number.POSITIVE_INFINITY;
      const nodeCenterX = node.box.x + node.box.width / 2;
      const canvasCenterX = canvas.x + canvas.width / 2;
      return Math.abs(nodeCenterX - canvasCenterX);
    })
    .toBeLessThan(12);
  await expect.poll(async () => (await getViewportState(page)).x).not.toBe(beforeViewport.x);
  await expect
    .poll(async () => (await getViewportState(page)).zoom)
    .toBeCloseTo(beforeViewport.zoom, 5);
});

test("container resize waits for title editing to finish before recentering", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop responsive canvas resizing is covered separately.");

  await page.goto("/");
  await loadSingleNodeResizeDocument(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await waitForViewportSettled(page);

  const title = page.getByLabel("Title for Resize map");
  await title.focus();
  const viewportBeforeResize = await getViewportTransform(page);
  await page.locator(".workspace").evaluate((element) => {
    (element as HTMLElement).style.gridTemplateColumns = "520px minmax(0, 1fr)";
  });
  await page.waitForTimeout(250);
  expect(await getViewportTransform(page)).toBe(viewportBeforeResize);

  await title.blur();
  await expect
    .poll(async () => {
      const node = await getNodeBox(page, "resize-root");
      const canvas = await page.locator(".react-flow").boundingBox();
      if (!canvas) return Number.POSITIVE_INFINITY;
      const nodeCenterX = node.box.x + node.box.width / 2;
      const canvasCenterX = canvas.x + canvas.width / 2;
      return Math.abs(nodeCenterX - canvasCenterX);
    })
    .toBeLessThan(12);
});

test("title editing does not resize or relayout the canvas", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop title editing viewport stability is covered separately.");

  await page.goto("/");
  await loadSingleNodeResizeDocument(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await waitForViewportSettled(page);

  const beforeViewport = await getViewportTransform(page);
  const beforePosition = (await getPlaygroundDocument(page)).nodes["resize-root"]?.position;
  const title = page.getByLabel("Title for Resize map");
  await title.fill("Resize map\nwith a much longer edited title");
  await title.blur();

  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["resize-root"]?.title)
    .toBe("Resize map\nwith a much longer edited title");
  expect(await getViewportTransform(page)).toBe(beforeViewport);
  expect((await getPlaygroundDocument(page)).nodes["resize-root"]?.position).toEqual(
    beforePosition,
  );
});

test("node title alignment switches between single and multiline rows", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop title text rendering is covered separately.");

  await page.goto("/");
  const title = page.locator('.react-flow__node[data-id="node-0"] textarea');

  await expect(title).toHaveCSS("text-align", "center");
  await title.fill("A root title long enough to wrap across more than one visual line in the node");
  await expect(title).toHaveCSS("text-align", "left");
  await title.fill("Short root");
  await expect(title).toHaveCSS("text-align", "center");
});

test("dragging to node center reparents as a child on release", async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    "Desktop mouse drag behavior is covered separately from mobile touch basics.",
  );

  await page.goto("/");
  await page.locator(".mmn-toolbar").getByRole("button", { name: "Zoom in" }).click();
  const zoomedTransform = await getViewportTransform(page);
  await dragNodeToNode(page, "node-1", "node-2", {
    targetY: "center",
    dropText: "Drop to add as child",
  });

  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.parentId)
    .toBe("node-2");
  await expect.poll(async () => getViewportTransform(page)).toBe(zoomedTransform);
});

test("dragging away from a target before release does not commit the stale drop intent", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop mouse drag behavior is covered separately from mobile touch basics.",
  );

  await page.goto("/");
  await waitForViewportSettled(page);
  const source = await getNodeBox(page, "node-1");
  const target = await getNodeBox(page, "node-2");
  const canvas = await page.locator(".react-flow").boundingBox();
  if (!canvas) throw new Error("React Flow canvas is not visible");

  const before = await getPlaygroundDocument(page);
  await page.mouse.move(source.box.x + source.box.width / 2, source.box.y + source.box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.box.x + target.box.width / 2, target.box.y + target.box.height / 2, {
    steps: 12,
  });
  await expect(
    page.locator(".mmn-node__drop-label", { hasText: "Drop to add as child" }),
  ).toBeVisible();
  await page.mouse.move(canvas.x + canvas.width - 24, canvas.y + canvas.height - 24, { steps: 8 });
  await expect(
    page.locator(".mmn-node__drop-label", { hasText: "Drop to add as child" }),
  ).toBeHidden();
  await page.mouse.up();

  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.parentId)
    .toBe(before.nodes["node-1"]!.parentId);
  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-0"]!.children.join(","))
    .toBe(before.nodes["node-0"]!.children.join(","));
});

test("dragging to upper and lower target zones sorts siblings", async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    "Desktop mouse drag behavior is covered separately from mobile touch basics.",
  );

  await page.goto("/");
  await dragNodeToNode(page, "node-2", "node-1", {
    targetY: "top",
    dropText: "Insert before this node",
  });
  await expect
    .poll(async () =>
      (await getPlaygroundDocument(page)).nodes["node-0"]!.children.slice(0, 2).join(","),
    )
    .toBe("node-2,node-1");

  await page.goto("/");
  await dragNodeToNode(page, "node-1", "node-2", {
    targetY: "bottom",
    dropText: "Insert after this node",
  });
  await expect
    .poll(async () =>
      (await getPlaygroundDocument(page)).nodes["node-0"]!.children.slice(0, 2).join(","),
    )
    .toBe("node-2,node-1");
});

test("hover controls add child and toggle collapse", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop hover controls are covered separately from mobile touch basics.");

  await page.goto("/");
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await node.hover();
  await node.getByRole("button", { name: /^Add child to Topic 1$/ }).click();
  await expect
    .poll(async () =>
      Object.values((await getPlaygroundDocument(page)).nodes).some(
        (node) => node.parentId === "node-1" && node.title === "New child",
      ),
    )
    .toBe(true);

  await node.hover();
  await node.getByRole("button", { name: /^Collapse node Topic 1$/ }).click();
  await expect(page.locator('.mmn-node[data-node-id="node-5"]')).toBeHidden();
  await expect(
    node.getByRole("button", { name: /^Expand Topic 1, \d+ hidden nodes$/ }),
  ).toBeVisible();

  await node.hover();
  await node.getByRole("button", { name: /^Expand Topic 1, \d+ hidden nodes$/ }).click();
  await expect(page.locator('.mmn-node[data-node-id="node-5"]')).toBeVisible();
});

test("selected node uses corner resize handles instead of bottom shrink and grow buttons", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop mouse resize controls are covered separately from mobile touch basics.",
  );

  await page.goto("/");
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await node.click();

  await expect(node.getByRole("button", { name: "Resize Topic 1 from top left" })).toBeVisible();
  await expect(node.getByRole("button", { name: "Shrink node" })).toHaveCount(0);
  await expect(node.getByRole("button", { name: "Grow node" })).toHaveCount(0);

  const beforeScale = (await getPlaygroundDocument(page)).nodes["node-1"]?.style?.scale ?? 1;
  await node.getByRole("button", { name: "Resize Topic 1 from top right" }).click();
  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.style?.scale ?? 1)
    .toBeGreaterThan(beforeScale);
});

test("dragging corner resize handle scales the node 1:1 and commits once", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop mouse resize dragging is covered separately from mobile touch basics.",
  );

  await page.goto("/");
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  const renderedNode = page.locator('.mmn-node[data-node-id="node-1"]');
  await node.click();

  const handle = node.getByRole("button", { name: "Resize Topic 1 from bottom right" });
  await expect(handle).toBeVisible();

  const box = await handle.boundingBox();
  const beforeBox = await renderedNode.boundingBox();
  if (!box) throw new Error("Resize handle bounding box is not found");
  if (!beforeBox) throw new Error("Node bounding box is not found");

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const beforeScale = (await getPlaygroundDocument(page)).nodes["node-1"]?.style?.scale ?? 1;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 50, startY + 50, { steps: 10 });
  await expect
    .poll(async () => (await renderedNode.boundingBox())?.width ?? 0)
    .toBeGreaterThan(beforeBox.width);
  expect((await getPlaygroundDocument(page)).nodes["node-1"]?.style?.scale ?? 1).toBe(beforeScale);
  await page.mouse.up();

  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.style?.scale ?? 1)
    .toBeGreaterThan(beforeScale);

  await page.locator(".mmn-editor").focus();
  await expect
    .poll(async () =>
      page.locator(".mmn-editor").evaluate((element) => document.activeElement === element),
    )
    .toBe(true);
  await page.keyboard.press("Control+Z");
  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-1"]?.style?.scale ?? 1)
    .toBe(beforeScale);
});

test("multiline and long titles are saved and keep the root fully visible", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop text editing and viewport fitting are covered separately from mobile touch basics.",
  );

  await page.goto("/");
  const root = page.locator('.react-flow__node[data-id="node-0"]');
  const title = root.getByLabel(/^Title for 100 node map$/);
  const nextTitle =
    "100 node map\nwith a long root title that should remain fully visible after editing";

  await title.fill(nextTitle);
  await page.getByRole("button", { name: "Themes" }).focus();

  await expect
    .poll(async () => (await getPlaygroundDocument(page)).nodes["node-0"]?.title)
    .toBe(nextTitle);
  await expect(root.locator("textarea")).toHaveValue(nextTitle);
  await expectNodeInsideCanvas(page, "node-0");
});

test.describe("Branch List Focus Layout", () => {
  test("toggle button visibility depends on document depth", async ({ page }) => {
    // 1. Deep document (fixture loaded by default, depth >= 3)
    await page.goto("/");
    await expect(page.locator(".mmn-branch-toggle-btn")).toBeVisible();

    // 2. Shallow document (load single node document)
    await loadSingleNodeResizeDocument(page);
    await expect(page.locator(".mmn-branch-toggle-btn")).toBeHidden();
  });

  test("entering and exiting list layout via toggle button", async ({ page, isMobile }) => {
    test.skip(isMobile, "Split layout side panel is hidden by default on mobile viewports.");

    await page.goto("/");
    await expect(page.locator(".mmn-branch-toggle-btn")).toBeVisible();
    await expect(page.locator(".mmn-editor")).not.toHaveClass(/mmn-editor--split-mode/);
    await expect(page.locator(".mmn-branch-list-panel")).toBeHidden();

    // Enter split layout
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-editor")).toHaveClass(/mmn-editor--split-mode/);
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    // Exit split layout
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-editor")).not.toHaveClass(/mmn-editor--split-mode/);
    await expect(page.locator(".mmn-branch-list-panel")).toBeHidden();
  });

  test("clicking branch list item switches the view root node to the branch subtree", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Split layout side panel is hidden by default on mobile viewports.");

    // Enable breadcrumbs so we can verify path
    await page.goto("/?showBreadcrumbs=1");

    // Enter split mode
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    const rootItems = page.locator('.mmn-branch-list-item[aria-level="1"]');
    await expect(rootItems).toHaveCount(4);

    const firstItem = rootItems.first();
    const secondItem = rootItems.nth(1);

    // First item selected by default
    await expect(firstItem).toHaveClass(/mmn-branch-list-item--selected/);
    await expect(secondItem).not.toHaveClass(/mmn-branch-list-item--selected/);

    const secondTitle = await secondItem.locator(".mmn-branch-list-item__title").textContent();
    expect(secondTitle).toBeTruthy();

    // Click second branch item
    await secondItem.click();
    await expect(secondItem).toHaveClass(/mmn-branch-list-item--selected/);
    await expect(firstItem).not.toHaveClass(/mmn-branch-list-item--selected/);

    // Verify viewRootId switch via breadcrumbs: the breadcrumb path should end with the second branch's title
    const breadcrumbButtons = page.locator(".mmn-breadcrumbs button");
    await expect(breadcrumbButtons).toHaveCount(2); // Root + Selected Branch
    await expect(breadcrumbButtons.nth(1)).toContainText(secondTitle!);
  });

  test("clicking branch list item recenters the selected subtree", async ({ page, isMobile }) => {
    test.skip(isMobile, "Split layout side panel is hidden by default on mobile viewports.");

    await page.goto("/?fitViewOnInit=");
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    const secondItem = page.locator(".mmn-branch-list-item").nth(1);
    await secondItem.click();
    await expect(secondItem).toHaveClass(/mmn-branch-list-item--selected/);
    await expectVisibleNodesCenteredInCanvas(page, 12);
  });

  test("toolbar fit view recenters the selected branch subtree", async ({ page, isMobile }) => {
    test.skip(isMobile, "Split layout side panel is hidden by default on mobile viewports.");

    await page.goto("/?fitViewOnInit=");
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    const secondItem = page.locator(".mmn-branch-list-item").nth(1);
    await secondItem.click();
    await expect(secondItem).toHaveClass(/mmn-branch-list-item--selected/);
    await expectVisibleNodesCenteredInCanvas(page, 12);

    const canvas = await page.locator(".react-flow").boundingBox();
    if (!canvas) throw new Error("React Flow canvas is not visible");
    const beforePan = await getViewportState(page);
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(420, 260);
    await expect
      .poll(async () => {
        const viewport = await getViewportState(page);
        return Math.abs(viewport.x - beforePan.x) + Math.abs(viewport.y - beforePan.y);
      })
      .toBeGreaterThan(80);

    await page.getByRole("button", { name: "Fit view" }).click();
    await expectVisibleNodesCenteredInCanvas(page, 12);
  });

  test("fullscreen branch switching recenters the selected subtree", async ({ page, isMobile }) => {
    test.skip(isMobile, "Split layout side panel is hidden by default on mobile viewports.");

    await page.addInitScript(() => {
      let fullscreenElement: Element | null = null;
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: () => fullscreenElement,
      });
      Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
        configurable: true,
        value: async () => {
          const target = document.querySelector<HTMLElement>(".mmn-editor");
          fullscreenElement = target;
          if (target) {
            target.style.width = "1180px";
            target.style.height = "760px";
          }
          document.dispatchEvent(new Event("fullscreenchange"));
        },
      });
      Object.defineProperty(document, "exitFullscreen", {
        configurable: true,
        value: async () => {
          if (fullscreenElement instanceof HTMLElement) {
            fullscreenElement.style.width = "";
            fullscreenElement.style.height = "";
          }
          fullscreenElement = null;
          document.dispatchEvent(new Event("fullscreenchange"));
        },
      });
    });

    await page.goto("/?fitViewOnInit=");
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    await page.getByRole("button", { name: "Fullscreen" }).click();
    await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();

    const canvas = await page.locator(".react-flow").boundingBox();
    if (!canvas) throw new Error("React Flow canvas is not visible");
    const beforePan = await getViewportState(page);
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(420, 260);
    await expect
      .poll(async () => {
        const viewport = await getViewportState(page);
        return Math.abs(viewport.x - beforePan.x) + Math.abs(viewport.y - beforePan.y);
      })
      .toBeGreaterThan(80);

    const secondItem = page.locator(".mmn-branch-list-item").nth(1);
    await secondItem.click();
    await expect(secondItem).toHaveClass(/mmn-branch-list-item--selected/);
    await expectVisibleNodesCenteredInCanvas(page);
  });

  test("dragging resize handle adjusts sidebar width within constraints", async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Desktop resize handle dragging is covered separately from mobile touch basics.",
    );

    await page.goto("/");
    // Enter split mode
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-resize-handle")).toBeVisible();

    const layout = page.locator(".mmn-branch-layout");
    const handle = page.locator(".mmn-branch-resize-handle");

    // Check initial width via style custom property --mmn-branch-sidebar-width
    let styleStr = await layout.getAttribute("style");
    expect(styleStr).toContain("--mmn-branch-sidebar-width: 280px");

    // Drag right to expand
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY, { steps: 10 });
    await page.mouse.up();

    styleStr = await layout.getAttribute("style");
    // Width should now be around 380px
    expect(styleStr).toContain("--mmn-branch-sidebar-width: 380px");

    // Drag left beyond minimum constraint (min width is 220px)
    await page.mouse.move(startX + 100, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 200, startY, { steps: 10 });
    await page.mouse.up();

    styleStr = await layout.getAttribute("style");
    expect(styleStr).toContain("--mmn-branch-sidebar-width: 220px");
  });

  test("collapsed sidebar previews on edge hover and pins from the overlay", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    // Collapse sidebar
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeHidden();
    await expect(page.locator(".mmn-branch-expand-btn")).toBeVisible();

    // Hovering the left edge rail temporarily previews the sidebar
    await page.getByRole("button", { name: "Show branch list" }).hover();
    const previewPanel = page.locator(".mmn-branch-list-panel");
    await expect(previewPanel).toBeVisible();
    const previewBox = await previewPanel.boundingBox();
    if (!previewBox) throw new Error("Branch list preview is not visible");
    await page.mouse.move(
      previewBox.x + previewBox.width + 40,
      previewBox.y + previewBox.height / 2,
    );
    await expect(page.locator(".mmn-branch-list-panel")).toBeHidden();

    // Pinning the preview restores the fixed split layout
    await page.getByRole("button", { name: "Show branch list" }).hover();
    await page.getByRole("button", { name: "Pin sidebar" }).click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();
    await expect(page.locator(".mmn-branch-expand-btn")).toBeHidden();
  });

  test("snap toggle button to nearest edge on dragging", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop pointer dragging is covered separately from mobile touch basics.");

    await page.goto("/");
    const btn = page.locator(".mmn-branch-toggle-btn");
    await expect(btn).toBeVisible();

    const initialBox = await btn.boundingBox();
    expect(initialBox).toBeTruthy();

    // Drag toggle button to the middle-right area
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2,
      initialBox!.y + initialBox!.height / 2,
    );
    await page.mouse.down();
    // Move 500px right, 50px down
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2 + 500,
      initialBox!.y + initialBox!.height / 2 + 50,
      { steps: 10 },
    );
    await page.mouse.up();

    // Button should snap to the right edge
    const finalBox = await btn.boundingBox();
    expect(finalBox).toBeTruthy();
    expect(finalBox!.x).toBeGreaterThan(initialBox!.x + 400);

    // Verify it didn't trigger list layout since we dragged past the click threshold (4px)
    await expect(page.locator(".mmn-editor")).not.toHaveClass(/mmn-editor--split-mode/);
  });

  test("dark mode theme changes layout panels theme mode", async ({ page, isMobile }) => {
    test.skip(isMobile, "Split layout side panel is hidden by default on mobile viewports.");

    await page.goto("/");
    await page.locator(".mmn-branch-toggle-btn").click();
    await expect(page.locator(".mmn-branch-list-panel")).toBeVisible();

    // Toggle theme to Graphite (dark mode)
    await page.getByRole("button", { name: "Themes" }).click();
    await page.getByRole("button", { name: "Graphite" }).click();

    // Panel dark theme check (by looking at data-theme-mode on editor)
    const editor = page.locator(".mmn-editor");
    await expect(editor).toHaveAttribute("data-theme-mode", "dark");
  });
});
