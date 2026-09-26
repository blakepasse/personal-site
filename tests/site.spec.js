import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PROJECTS, PLACES } from "../data.js";

let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
});
test.afterEach(() => expect(errors, "console / page errors").toEqual([]));

test("loads on home: headline above the globe", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#v1")).toHaveClass(/active/);
  await expect(page).toHaveURL(/#home$/);
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();
  const h1Box = await h1.boundingBox();
  const legend = await page.locator("#v1 .legend").boundingBox();
  expect(h1Box.y).toBeLessThan(legend.y);
});

for (const [key, hash, id] of [
  ["2", "resume", "#v2"],
  ["3", "contact", "#v3"],
  ["1", "home", "#v1"],
]) {
  test(`keyboard ${key} switches to ${hash}`, async ({ page }) => {
    await page.goto("/#contact");
    await page.keyboard.press(key);
    await expect(page.locator(id)).toHaveClass(/active/);
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
  });
}

test("only three views exist; 4 and 5 do nothing", async ({ page }) => {
  await page.goto("/#resume");
  await expect(page.locator(".switcher button")).toHaveCount(3);
  await page.keyboard.press("4");
  await page.keyboard.press("5");
  await expect(page.locator("#v2")).toHaveClass(/active/);
});

test("old links still land somewhere sensible", async ({ page }) => {
  await page.goto("/#about");
  await expect(page.locator("#v1")).toHaveClass(/active/);
  await page.goto(`/#${PROJECTS[1].id}`);
  await expect(page.locator("#v1")).toHaveClass(/active/);
  await expect(page.locator("#panel")).not.toHaveClass(/open/); // project pages are unpublished
});

test("switcher buttons work by click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View 2: Resume" }).click();
  await expect(page.locator("#v2")).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
});

test("project pages are unpublished: no links, menu entries, or search results", async ({ page }) => {
  await page.goto("/#resume");
  await expect(page.locator("[data-proj]")).toHaveCount(0);
  await page.keyboard.press("m");
  await expect(page.locator("#menu")).not.toContainText("Projects");
  await page.keyboard.press("Escape");
  await page.keyboard.press("f");
  await page.keyboard.type("project");
  await expect(page.locator("#findList")).not.toContainText("Project");
});

test("find palette navigates to a place on the globe", async ({ page }) => {
  await page.goto("/#resume");
  await page.keyboard.press("f");
  await expect(page.locator("#findInput")).toBeFocused();
  await page.keyboard.type("oddz");
  await expect(page.locator("#findList li").first()).toContainText("Oddz");
  await page.keyboard.press("Enter");
  await expect(page.locator("#v1")).toHaveClass(/active/);
  await expect(page.locator("#globeCallout")).toContainText("Oddz for iMessage");
});

test("menu toggles with M; links navigate", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("m");
  await expect(page.locator("#menu")).toHaveClass(/open/);
  await page.locator("#menu").getByRole("button", { name: "Contact" }).click();
  await expect(page.locator("#v3")).toHaveClass(/active/);
  await expect(page.locator("#menu")).not.toHaveClass(/open/);
});

test("contact links point to the right places", async ({ page, request }) => {
  await page.goto("/#contact");
  const v3 = page.locator("#v3");
  await expect(v3.getByRole("link", { name: /blakepasse@gmail.com/ })).toHaveAttribute(
    "href",
    "mailto:blakepasse@gmail.com",
  );
  await expect(v3.getByRole("link", { name: /blake-passe/ })).toHaveAttribute(
    "href",
    /linkedin\.com\/in\/blake-passe$/,
  );
  const portrait = v3.getByRole("img", { name: /Blake Passe/ });
  await expect(portrait).toBeVisible();
  expect(await portrait.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  // the resume PDF is intentionally unpublished
  await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
  expect((await request.get("/resume.pdf")).status()).toBe(404);
});

test("no horizontal overflow on any view", async ({ page }) => {
  for (const h of ["home", "resume", "contact"]) {
    await page.goto(`/#${h}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, h).toBeLessThanOrEqual(0);
  }
});

for (const [h, id] of [
  ["resume", "#v2"],
  ["contact", "#v3"],
]) {
  test(`no serious accessibility violations on ${h}`, async ({ page }) => {
    await page.goto(`/#${h}`);
    await page.waitForTimeout(400); // let the fade-in finish so axe sees final colors
    const { violations } = await new AxeBuilder({ page }).include(id).analyze();
    const serious = violations.filter((v) => ["serious", "critical"].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test("globe draws, and find rotates to and pins a place", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300);
  const inked = await page.evaluate(() => {
    const c = document.getElementById("globe");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(inked, "globe canvas has drawn pixels").toBeGreaterThan(1000);

  const oxford = PLACES.find((p) => p.id === "university-of-oxford");
  await page.keyboard.press("f");
  await page.keyboard.type("oxford");
  await expect(page.locator("#findList li").first()).toContainText(oxford.name);
  await page.keyboard.press("Enter");
  await expect(page.locator("#globeCallout")).toContainText(oxford.name);
  await expect(page.locator("#globeCallout")).toContainText(oxford.where);
});

test("arrow keys step through places on the globe", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ArrowRight");
  const first = await page.locator("#globeCallout").innerText();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#globeCallout")).not.toHaveText(first);
});

test("places are listed for screen readers", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#placesList li")).toHaveCount(PLACES.length);
});

test("globe callout never overlaps the headline or legend", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < new Set(PLACES.map((p) => p.area ?? p.where)).size; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    const [h1, co] = await Promise.all([
      page.getByRole("heading", { level: 1 }).boundingBox(),
      page.locator("#globeCallout").boundingBox(),
    ]);
    if (!co) continue;
    const legend = await page.locator("#v1 .legend").boundingBox();
    const hitsLegend = !(
      co.x + co.width <= legend.x ||
      legend.x + legend.width <= co.x ||
      co.y + co.height <= legend.y ||
      legend.y + legend.height <= co.y
    );
    expect(hitsLegend, `callout ${i} overlaps legend`).toBe(false);
    const overlap = !(
      co.x + co.width <= h1.x ||
      h1.x + h1.width <= co.x ||
      co.y + co.height <= h1.y ||
      h1.y + h1.height <= co.y
    );
    expect(overlap, `callout ${i} overlaps headline`).toBe(false);
  }
});
