import { PROJECTS, RESUME, PLACES } from "./data.js";
import { createGlobe } from "./globe.js";

// Content is static and trusted, but escape anything interpolated into HTML anyway so a
// stray "<" or "&" in data.js can never break markup or become an injection vector.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ---------- generative duotone art ---------- */
function rand(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function drawArt(ctx, w, h, pattern, seed, t = 0) {
  const G = "#74ff4a",
    P = "#dcffcf",
    D = "#4fd92a";
  const r = rand(seed * 9973 + 7);
  ctx.fillStyle = P;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = G;
  ctx.strokeStyle = G;
  if (pattern === "grid") {
    const n = 14,
      cw = w / n,
      ch = h / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = Math.sin(i * 0.5 + t) * Math.cos(j * 0.4 - t * 0.7);
        if (v > -0.1) {
          ctx.globalAlpha = 0.35 + 0.65 * Math.abs(v);
          ctx.fillRect(i * cw + 1, j * ch + 1, cw - 2, ch - 2);
        }
      }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = D;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w, h * 0.25);
    ctx.stroke();
  } else if (pattern === "dots") {
    for (let i = 0; i < 18; i++)
      for (let j = 0; j < 16; j++) {
        const x = ((i + 0.5) * w) / 18,
          y = ((j + 0.5) * h) / 16;
        const d = Math.hypot(x - w * 0.5, y - h * 0.5) / (w * 0.5);
        const rad = Math.max(0, 7 * (1 - d) + 2 * Math.sin(t * 2 + i * 0.6 + j * 0.4));
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, 7);
        ctx.fill();
      }
  } else if (pattern === "radar") {
    ctx.lineWidth = 1.5;
    for (let k = 1; k < 9; k++) {
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, k * w * 0.06, 0, 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.arc(w * 0.5, h * 0.5, w * 0.5, t, t + 0.6);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = i % 4 ? G : D;
      ctx.fillRect(r() * w, r() * h, 6, 6);
    }
  } else if (pattern === "bars") {
    const n = 30;
    for (let i = 0; i < n; i++) {
      const bh = h * (0.15 + 0.7 * Math.abs(Math.sin(i * 0.37 + r() * 0.4 + t * 0.6)));
      ctx.globalAlpha = i % 3 ? 0.8 : 1;
      ctx.fillRect((i * w) / n + 1, h - bh, w / n - 3, bh);
    }
    ctx.globalAlpha = 1;
  } else if (pattern === "contour") {
    ctx.lineWidth = 2;
    for (let k = 0; k < 16; k++) {
      ctx.beginPath();
      for (let a = 0; a <= 64; a++) {
        const th = (a / 64) * Math.PI * 2;
        const rr = k * 11 + 10 + 8 * Math.sin(th * 3 + k * 0.3 + t) + 5 * Math.cos(th * 5 - t);
        const x = w * 0.5 + rr * Math.cos(th) * 1.1,
          y = h * 0.5 + rr * Math.sin(th);
        a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.globalAlpha = 1 - k / 20;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === "waves") {
    ctx.lineWidth = 3;
    for (let k = 0; k < 22; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = (k * h) / 21 + 10 * Math.sin(x * 0.025 + k * 0.45 + t) * Math.sin(k * 0.3 + t * 0.4);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = k % 5 ? G : D;
      ctx.stroke();
    }
  }
  // faint mono caption texture, a nod to Paradigm's overlaid text
  ctx.fillStyle = D;
  ctx.globalAlpha = 0.9;
  ctx.font = "500 9px IBM Plex Mono, monospace";
  ctx.fillText(pattern.toUpperCase() + " / " + String(seed).padStart(2, "0"), 10, h - 10);
  ctx.globalAlpha = 1;
}

/* ---------- project pages ---------- */
// Project write-ups are still in progress. While false, nothing links to them: no menu list,
// no resume links, no search results, no #project-id deep links. Flip to true to publish.
const SHOW_PROJECTS = false;

const menuProjects = document.getElementById("menuProjects");
if (SHOW_PROJECTS) {
  menuProjects.innerHTML = PROJECTS.map(
    (p, i) => `<button type="button" data-proj="${i}">${esc(p.title)}</button>`,
  ).join("");
} else menuProjects.parentElement.remove();

/* ---------- resume ---------- */
const rEl = document.getElementById("resumeEntries");
let rh = "";
for (const [sec, items] of Object.entries(RESUME)) {
  rh += `<div class="section-label">${esc(sec)}</div>`;
  for (const it of items) {
    rh += `<div class="row"><div class="when">${esc(it.when)}</div><div>
      <h3>${SHOW_PROJECTS && it.proj ? `<a class="plain" href="#${esc(it.proj)}" data-proj="${PROJECTS.findIndex((p) => p.id === it.proj)}">${esc(it.org)} ↗</a>` : esc(it.org)}</h3>
      <div class="role">${esc(it.role)}</div><ul>${it.pts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>`;
  }
}
rEl.innerHTML = rh;

/* ---------- views ---------- */
let view = 0;
const VIEW_HASHES = ["", "home", "resume", "contact"];
const switcher = document.querySelectorAll(".switcher button");
function go(n, hash) {
  view = n;
  document.querySelectorAll(".view").forEach((v, i) => {
    v.classList.toggle("active", i === n - 1);
    if (i === n - 1) v.scrollTop = 0; // every page opens at its top, whatever was scrolled before
  });
  switcher.forEach((b, i) => {
    if (i === n - 1) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  closeMenu();
  closePanel();
  history.replaceState(null, "", "#" + (hash || VIEW_HASHES[n]));
  if (n === 1) globe.resize();
}
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]");
  if (g) {
    e.preventDefault();
    go(+g.dataset.go);
    return;
  }
  const pr = e.target.closest("[data-proj]");
  if (pr) {
    e.preventDefault();
    closeMenu();
    openPanel(+pr.dataset.proj);
  }
});

/* ---------- menu ---------- */
const menu = document.getElementById("menu"),
  menuBtn = document.getElementById("menuBtn");
function openMenu() {
  menu.classList.add("open");
  menu.inert = false;
  menuBtn.textContent = "✕";
  menuBtn.setAttribute("aria-expanded", true);
  menuBtn.setAttribute("aria-label", "Close menu");
}
function closeMenu() {
  menu.classList.remove("open");
  menu.inert = true; // keeps the off-screen menu out of the tab order
  menuBtn.textContent = "[M]";
  menuBtn.setAttribute("aria-expanded", false);
  menuBtn.setAttribute("aria-label", "Open menu");
}
menuBtn.onclick = () => (menu.classList.contains("open") ? closeMenu() : openMenu());
menu.querySelector("[data-close-menu]").onclick = closeMenu;

/* ---------- panel ---------- */
const panel = document.getElementById("panel"),
  pctx = document.getElementById("panelArt").getContext("2d");
let panelIdx = -1,
  panelOpener = null;
function openPanel(i) {
  const p = PROJECTS[i];
  panelIdx = i;
  if (!panel.classList.contains("open")) panelOpener = document.activeElement;
  document.getElementById("pMeta").textContent = `${p.kind} · ${p.when}`;
  document.getElementById("pTitle").textContent = p.title;
  document.getElementById("pBody").textContent = p.body;
  document.getElementById("pPoints").innerHTML = p.points.map((x) => `<li>${esc(x)}</li>`).join("");
  document.getElementById("pTags").innerHTML = p.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join("");
  panel.classList.add("open");
  panel.inert = false;
  document.getElementById("panelClose").focus({ preventScroll: true });
}
function closePanel() {
  const wasOpen = panel.classList.contains("open");
  panel.classList.remove("open");
  panel.inert = true;
  panelIdx = -1;
  if (wasOpen && panelOpener?.isConnected) panelOpener.focus({ preventScroll: true });
  panelOpener = null;
}
document.getElementById("panelClose").onclick = closePanel;

/* ---------- find ---------- */
const find = document.getElementById("find"),
  fin = document.getElementById("findInput"),
  flist = document.getElementById("findList");
const INDEX = [
  ...(SHOW_PROJECTS ? PROJECTS : []).map((p, i) => ({
    label: p.title,
    type: "Project",
    text: [p.title, p.kind, p.body, ...p.tags].join(" "),
    act: () => openPanel(i),
  })),
  ...PLACES.map((p) => ({
    label: p.name,
    type: p.where,
    text: [p.name, p.where, p.area, p.role, "place"].filter(Boolean).join(" "),
    act: () => {
      go(1);
      globe.select(p.id);
    },
  })),
  ...RESUME.Experience.concat(RESUME.Education).map((r) => ({
    label: r.org,
    type: "Resume",
    text: [r.org, r.role, ...r.pts].join(" "),
    act: () => go(2),
  })),
  { label: "Home", type: "Page", text: "home about globe places map world", act: () => go(1) },
  { label: "Email", type: "Contact", text: "email mail contact", act: () => go(3) },
  { label: "LinkedIn", type: "Contact", text: "linkedin contact", act: () => go(3) },
];
let hits = [],
  sel = 0;
function renderFind() {
  const q = fin.value.trim().toLowerCase();
  hits = INDEX.filter((x) => !q || x.text.toLowerCase().includes(q)).slice(0, 12);
  sel = Math.min(sel, Math.max(hits.length - 1, 0));
  flist.innerHTML = hits.length
    ? hits
        .map(
          (h, i) =>
            `<li class="${i === sel ? "sel" : ""}" data-i="${i}"><span>${esc(h.label)}</span><span class="t">${esc(h.type)}</span></li>`,
        )
        .join("")
    : `<div class="empty">No results</div>`;
}
function openFind() {
  find.classList.add("open");
  fin.value = "";
  sel = 0;
  renderFind();
  fin.focus();
}
function closeFind() {
  find.classList.remove("open");
}
fin.addEventListener("input", () => {
  sel = 0;
  renderFind();
});
flist.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (li) {
    closeFind();
    hits[+li.dataset.i].act();
  }
});
find.addEventListener("click", (e) => {
  if (e.target === find) closeFind();
});
document.getElementById("findBtn").onclick = openFind;

/* ---------- keyboard ---------- */
document.addEventListener("keydown", (e) => {
  // ⌘K / Ctrl+K: the common "open search" shortcut; same as F, and toggles it closed again
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault(); // stop the browser's own Ctrl+K (focus address bar) from firing
    find.classList.contains("open") ? closeFind() : openFind();
    return;
  }
  if (find.classList.contains("open")) {
    if (e.key === "Escape") closeFind();
    else if (e.key === "ArrowDown") {
      sel = Math.min(sel + 1, hits.length - 1);
      renderFind();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      sel = Math.max(sel - 1, 0);
      renderFind();
      e.preventDefault();
    } else if (e.key === "Enter" && hits[sel]) {
      closeFind();
      hits[sel].act();
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === "escape") {
    closeMenu();
    closePanel();
  } else if (k === "m") menu.classList.contains("open") ? closeMenu() : openMenu();
  else if (k === "f") {
    e.preventDefault();
    openFind();
  } else if (["1", "2", "3"].includes(k)) go(+k);
  else if (view === 1 && e.key === "ArrowRight") globe.step(1);
  else if (view === 1 && e.key === "ArrowLeft") globe.step(-1);
});

/* ---------- globe ---------- */
const globe = createGlobe({
  canvas: document.getElementById("globe"),
  callout: document.getElementById("globeCallout"),
  avoid: document.querySelector("#v1 .legend"),
  places: PLACES,
  reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
document.getElementById("placesList").innerHTML = PLACES.map(
  (p) => `<li>${esc(p.name)}, ${esc(p.where)}: ${[p.role, p.when].filter(Boolean).map(esc).join(", ")}</li>`,
).join("");

/* ---------- animation loop ---------- */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let t0 = performance.now();
function frame(now) {
  const t = reduce ? 0 : (now - t0) / 1000;
  if (panelIdx >= 0) drawArt(pctx, 620, 560, PROJECTS[panelIdx].pattern, panelIdx + 1, t * 0.6);
  if (view === 1) globe.draw(now);
  requestAnimationFrame(frame);
}

/* ---------- clock ---------- */
const clock = document.getElementById("clock");
function tick() {
  clock.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}
setInterval(tick, 1000);
tick();

/* ---------- init ---------- */
addEventListener("resize", () => {
  if (view === 1) globe.resize();
});
function route() {
  const h = location.hash.slice(1);
  // old links (#about, #places, or a project id) still land somewhere sensible
  const pi = SHOW_PROJECTS ? PROJECTS.findIndex((p) => p.id === h) : -1;
  go({ resume: 2, contact: 3 }[h] || 1, pi >= 0 ? VIEW_HASHES[1] : undefined);
  if (pi >= 0) openPanel(pi);
}
addEventListener("hashchange", route);
route();
requestAnimationFrame(frame);
