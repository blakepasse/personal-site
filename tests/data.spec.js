// Content invariants. These catch the mistakes an agent (or a human) makes when editing data.js.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PROJECTS, RESUME, PLACES } from "../data.js";

const PATTERNS = ["grid", "dots", "radar", "bars", "contour", "waves"];

test("project ids are unique kebab-case", () => {
  const ids = PROJECTS.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("project ids do not collide with view routes", () => {
  for (const p of PROJECTS) expect(["home", "resume", "contact"]).not.toContain(p.id);
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

test("globe places have unique ids and valid coordinates", () => {
  const ids = PLACES.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const p of PLACES) {
    expect(p.lat, p.id).toBeGreaterThanOrEqual(-90);
    expect(p.lat, p.id).toBeLessThanOrEqual(90);
    expect(p.lon, p.id).toBeGreaterThanOrEqual(-180);
    expect(p.lon, p.id).toBeLessThanOrEqual(180);
    for (const k of ["name", "where", "role"]) expect(p[k], `${p.id}.${k}`).toBeTruthy();
    expect(typeof p.when, `${p.id}.when`).toBe("string");
  }
});
