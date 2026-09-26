import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PROJECTS } from "../data.js";

let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
});
test.afterEach(() => expect(errors, "console / page errors").toEqual([]));

test("loads on the projects view with the first project current", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`#${PROJECTS[0].id}$`));
  await expect(page.locator(".card.current .cap")).toHaveText(PROJECTS[0].title);
});

test("deep link opens the right project", async ({ page }) => {
  const p = PROJECTS[1];
  await page.goto(`/#${p.id}`);
  await expect(page.locator(".card.current .cap")).toHaveText(p.title);
});

for (const [key, hash, id] of [
  ["2", "about", "#v2"],
  ["3", "resume", "#v3"],
  ["4", "contact", "#v4"],
  ["1", PROJECTS[0].id, "#v1"],
]) {
  test(`keyboard ${key} switches to ${hash}`, async ({ page }) => {
    await page.goto("/#contact");
    await page.keyboard.press(key);
    await expect(page.locator(id)).toHaveClass(/active/);
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
  });
}

test("switcher buttons work by click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View 3: Resume" }).click();
  await expect(page.locator("#v3")).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
});

test("project panel opens, closes on Escape, and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.locator(".card.current").click();
  const panel = page.locator("#panel");
  await expect(panel).toHaveClass(/open/);
  await expect(page.locator("#pTitle")).toHaveText(PROJECTS[0].title);
  await expect(page.locator("#panelClose")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).not.toHaveClass(/open/);
});

test("carousel arrows wrap around", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Previous project" }).click();
  await expect(page.locator(".card.current .cap")).toHaveText(PROJECTS.at(-1).title);
});

test("find palette searches and navigates", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("f");
  await expect(page.locator("#findInput")).toBeFocused();
  await page.keyboard.type("oddz");
  await expect(page.locator("#findList li").first()).toContainText("Oddz");
  await page.keyboard.press("Enter");
  await expect(page.locator("#pTitle")).toHaveText("Oddz for iMessage");
});

test("menu toggles with M and links navigate", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("m");
  await expect(page.locator("#menu")).toHaveClass(/open/);
  await page.locator("#menu").getByRole("button", { name: "Contact" }).click();
  await expect(page.locator("#v4")).toHaveClass(/active/);
  await expect(page.locator("#menu")).not.toHaveClass(/open/);
});

test("contact links point to the right places", async ({ page, request }) => {
  await page.goto("/#contact");
  const v4 = page.locator("#v4");
  await expect(v4.getByRole("link", { name: /blakepasse@gmail.com/ })).toHaveAttribute(
    "href",
    "mailto:blakepasse@gmail.com",
  );
  await expect(v4.getByRole("link", { name: /blake-passe/ })).toHaveAttribute(
    "href",
    /linkedin\.com\/in\/blake-passe$/,
  );
  const pdf = await request.get("/resume.pdf");
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toContain("pdf");
});

test("no horizontal overflow on any view", async ({ page }) => {
  for (const h of ["about", "resume", "contact"]) {
    await page.goto(`/#${h}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, h).toBeLessThanOrEqual(0);
  }
});

for (const h of ["resume", "contact"]) {
  test(`no serious accessibility violations on ${h}`, async ({ page }) => {
    await page.goto(`/#${h}`);
    await page.waitForTimeout(400); // let the fade-in finish so axe sees final colors
    const { violations } = await new AxeBuilder({ page }).include(`#v${h === "resume" ? 3 : 4}`).analyze();
    const serious = violations.filter((v) => ["serious", "critical"].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
