// Serves pages with the exact Content-Security-Policy from vercel.json, so a CSP break is
// caught locally and in CI instead of as a blank page in production.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy").value;

test("site runs under the production CSP with no violations", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), "content-security-policy": csp } });
  });
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__cspViolations.push(`${e.violatedDirective}: ${e.blockedURI}`),
    );
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.locator("#globeCallout")).not.toBeEmpty(); // app.js + globe.js executed
  for (const k of ["2", "3", "1", "f"]) await page.keyboard.press(k);
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
  expect(errors).toEqual([]);
});
