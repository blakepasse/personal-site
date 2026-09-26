// Content invariants. These catch the mistakes an agent (or a human) makes when editing data.js.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PROJECTS, RESUME } from "../data.js";

const PATTERNS = ["grid", "dots", "radar", "bars", "contour", "waves"];

test("project ids are unique kebab-case", () => {
  const ids = PROJECTS.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("project ids do not collide with view routes", () => {
  for (const p of PROJECTS) expect(["about", "resume", "contact"]).not.toContain(p.id);
});

test("every project has required fields and a known pattern", () => {
  for (const p of PROJECTS) {
    for (const k of ["title", "when", "kind", "body"]) expect(p[k], `${p.id}.${k}`).toBeTruthy();
    expect(p.points.length, `${p.id}.points`).toBeGreaterThan(0);
    expect(PATTERNS, `${p.id}.pattern`).toContain(p.pattern);
  }
});

test("resume entries only link to projects that exist", () => {
  const ids = new Set(PROJECTS.map((p) => p.id));
  for (const r of Object.values(RESUME).flat()) if (r.proj) expect(ids, r.org).toContain(r.proj);
});

test("index.html has no inline scripts, styles, or handlers (required by the CSP in vercel.json)", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
  expect(html).not.toMatch(/<style[\s>]/);
  expect(html).not.toMatch(/\sstyle="/);
  expect(html).not.toMatch(/\son[a-z]+="/);
});

test("no phone number is published", () => {
  for (const f of ["index.html", "data.js", "app.js"]) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    expect(src, f).not.toMatch(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
  }
});
