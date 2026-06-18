import { expect, test } from "@playwright/test";

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
