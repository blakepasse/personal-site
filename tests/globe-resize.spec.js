// Regression: if styles.css arrived after app.js measured the canvas, the globe was drawn at the
// canvas's default 300×150 size and then stretched full-screen (blurry, zoomed, off-center).
import { test, expect } from "@playwright/test";

const backingMatchesLayout = (page) =>
  page.locator("#globe").evaluate((c) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    return (
      Math.abs(c.width - Math.round(c.clientWidth * dpr)) <= 1 &&
      Math.abs(c.height - Math.round(c.clientHeight * dpr)) <= 1
    );
  });

test("globe renders sharp even when the stylesheet loads late", async ({ page }) => {
  await page.route("**/styles.css", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  expect(await backingMatchesLayout(page)).toBe(true);
});

test("globe re-sharpens after the viewport changes size", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 700, height: 500 });
  await page.waitForTimeout(300);
  expect(await backingMatchesLayout(page)).toBe(true);
});
