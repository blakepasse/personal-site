// Wireframe globe in the style of paradigm.xyz's "crypto networks" view: an orthographic
// sphere with front/back great circles, one □ marker per real location, green
// links from the focused place, and a callout with a dashed leader line.

import WORLD from "./world.js";

const DEG = Math.PI / 180;
const INK = "#111111";
const FAINT = "#c4c4c4";
const GREEN = "#4fd92a";
const BORDER = "#dcdcdc"; // country borders + coastlines: a faint trace, never competing with the marks
const AUTO_SPIN = 0.06; // rad/s
const CYCLE_MS = 3600;

const toVec = (lat, lon) => [
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
];

function slerp(a, b, t) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(dot);
  if (om < 1e-6) return a;
  const s = Math.sin(om);
  const ka = Math.sin((1 - t) * om) / s,
    kb = Math.sin(t * om) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

export function createGlobe({ canvas, callout, places, avoid = null, reduceMotion = false }) {
  const ctx = canvas.getContext("2d");

  // One marker per location. Places are grouped by `area` if set (e.g. three Minnesota towns
  // too close to tell apart), otherwise by `where`. The marker sits at the entries' centroid,
  const keys = [];
  for (const p of places) {
    const where = p.area ?? p.where;
    let k = keys.find((g) => g.where === where);
    if (!k) {
      k = { id: where.toLowerCase().replace(/[^a-z0-9]+/g, "-"), where, entries: [] };
      keys.push(k);
    }
    k.entries.push(p);
  }
  for (const k of keys) {
    const sum = k.entries.map((e) => toVec(e.lat, e.lon)).reduce((a, v) => a.map((c, i) => c + v[i]));
    const len = Math.hypot(...sum);
    k.v = sum.map((c) => c / len);
    k.lat = Math.asin(k.v[1]) / DEG;
    k.lon = Math.atan2(k.v[0], k.v[2]) / DEG;
  }

  // Country outlines as unit vectors, computed once.
  const world = WORLD.map((line) => {
    const out = [];
    for (let i = 0; i < line.length; i += 2) out.push(toVec(line[i + 1], line[i]));
    return out;
  });

  // Center the continental US and tilt the north toward the viewer.
  let yaw = 88 * DEG,
    pitch = 32 * DEG;
  let vYaw = 0,
    vPitch = 0,
    targetYaw = null,
    targetPitch = 0;
  let w = 0,
    h = 0,
    R = 0,
    cx = 0,
    cy = 0;
  let dragging = null,
    hoverId = null,
    pinnedId = null,
    focusId = null,
    cycleIdx = 0,
    lastCycle = 0,
    lastT = 0;

  function project(v) {
    const ca = Math.cos(yaw),
      sa = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const x1 = v[0] * ca + v[2] * sa;
    const z1 = v[2] * ca - v[0] * sa;
    const y2 = v[1] * cp - z1 * sp;
    const z2 = v[1] * sp + z1 * cp;
    return { x: cx + R * x1, y: cy - R * y2, z: z2 };
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(w * 0.45, h * 0.33);
    cx = w / 2;
    // sit below the headline; on phones pull the globe up so the callout fits underneath it
    cy = w < 640 ? Math.min(h / 2 + 36, 180 + R) : h / 2 + 36;
  }

  // ---- drawing ----
  function mark(p, size, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
    ctx.stroke();
  }

  function ring(vecAt) {
    // Draw a great circle: solid where it faces us, dashed and faint behind.
    const N = 160;
    const pts = Array.from({ length: N + 1 }, (_, i) => project(vecAt((i / N) * Math.PI * 2)));
    for (const front of [false, true]) {
      ctx.setLineDash(front ? [] : [4, 4]);
      ctx.strokeStyle = front ? INK : FAINT;
      ctx.beginPath();
      let pen = false;
      for (const p of pts) {
        if (p.z >= 0 === front) {
          pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function arc(a, b) {
    // Great-circle arc lifted off the surface, drawn only while in front.
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40,
        v = slerp(a, b, t),
        lift = 1 + 0.12 * Math.sin(Math.PI * t);
      const p = project([v[0] * lift, v[1] * lift, v[2] * lift]);
      // lifted points near the horizon would project outside the sphere; clip at the silhouette
      if (p.z > 0 && Math.hypot(p.x - cx, p.y - cy) <= R) {
        pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        pen = true;
      } else pen = false;
    }
    ctx.stroke();
  }

  function setCallout(k) {
    if (!k) {
      callout.hidden = true;
      return;
    }
    callout.hidden = false;
    callout.replaceChildren(
      ...[
        k.id.toUpperCase(),
        // skip the plain-name line when it would just repeat the id (e.g. MINNESOTA / Minnesota)
        k.id !== k.where.toLowerCase() && k.where,
        // name the town when several towns share one marker
        ...k.entries.map((e) =>
          [e.name, e.role, e.when, e.where !== k.where && e.where.split(",")[0]].filter(Boolean).join(" · "),
        ),
      ]
        .filter(Boolean)
        .map((s) => {
          const d = document.createElement("div");
          d.textContent = s;
          return d;
        }),
    );
  }

  function visible(k) {
    return project(k.v).z > 0.15;
  }

  function chooseFocus(now) {
    const byId = (id) => keys.find((k) => k.id === id);
    if (hoverId) return byId(hoverId);
    if (pinnedId && visible(byId(pinnedId))) return byId(pinnedId);
    const cur = byId(focusId);
    if (!cur || !visible(cur) || now - lastCycle > (reduceMotion ? CYCLE_MS * 2 : CYCLE_MS)) {
      for (let n = 1; n <= keys.length; n++) {
        const k = keys[(cycleIdx + n) % keys.length];
        if (visible(k)) {
          cycleIdx = keys.indexOf(k);
          lastCycle = now;
          return k;
        }
      }
      return null;
    }
    return cur;
  }

  function draw(now) {
    const dt = lastT ? Math.min(now - lastT, 64) / 1000 : 0;
    lastT = now;

    if (targetYaw != null) {
      const d = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
      const dp = targetPitch - pitch;
      const ease = reduceMotion ? 1 : Math.min(1, dt * 4);
      yaw += d * ease;
      pitch += dp * ease;
      if (Math.abs(d) < 0.002 && Math.abs(dp) < 0.002) targetYaw = null;
    } else if (!dragging) {
      yaw += vYaw + (reduceMotion ? 0 : AUTO_SPIN * dt);
      pitch = Math.max(-1.2, Math.min(1.2, pitch + vPitch));
      vYaw *= 0.94;
      vPitch *= 0.94;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;

    // country trace, front hemisphere only
    ctx.strokeStyle = BORDER;
    ctx.beginPath();
    for (const line of world) {
      let pen = false;
      for (const v of line) {
        const p = project(v);
        if (p.z > 0) {
          pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
    }
    ctx.stroke();

    // silhouette + wireframe
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ring((a) => [Math.cos(a), 0, Math.sin(a)]); // equator
    ring((a) => [Math.sin(a) * Math.cos(-40 * DEG), Math.cos(a), Math.sin(a) * Math.sin(-40 * DEG)]);
    ring((a) => [Math.sin(a) * Math.cos(50 * DEG), Math.cos(a), Math.sin(a) * Math.sin(50 * DEG)]);

    // back-side marks first, then front, so front always sits on top
    const all = [];
    for (const k of keys) all.push({ p: project(k.v), size: 5 });
    all.sort((a, b) => a.p.z - b.p.z);
    for (const m of all) mark(m.p, m.size, m.p.z > 0 ? INK : FAINT);

    // focus: green links + callout
    const f = chooseFocus(now);
    if ((f?.id ?? null) !== focusId) {
      focusId = f?.id ?? null;
      setCallout(f);
    }
    if (!f) return;
    const fp = project(f.v);
    ctx.strokeStyle = GREEN;
    ctx.globalAlpha = 0.7;
    for (const k of keys) if (k !== f) arc(f.v, k.v);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.4;
    mark(fp, 8, INK);
    ctx.lineWidth = 1;

    // callout sits left of the globe, or below it on narrow screens (the headline owns the top)
    const cw = callout.offsetWidth,
      ch = callout.offsetHeight;
    // Phones: below the globe. Wider screens: to the left, overlapping the globe's edge if it
    // must, but always clear of the headline (top) and the legend (bottom-left).
    const narrow = w < 640;
    const lx = narrow ? 16 : Math.max(16, cx - R - cw - 40);
    // never let the callout run into the element below it (the legend sentence)
    const floor = avoid ? avoid.offsetTop - 8 : h - 150;
    const ly = narrow
      ? Math.max(0, Math.min(cy + R + 14, floor - ch))
      : Math.min(Math.max(140, fp.y - ch / 2), floor - ch);
    callout.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px)`;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(narrow ? lx + 8 : lx + cw + 6, narrow ? ly - 4 : ly + ch / 2);
    ctx.lineTo(fp.x - 9, fp.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- interaction ----
  function nearest(x, y) {
    let best = null,
      bd = 22;
    for (const k of keys) {
      const p = project(k.v);
      const d = Math.hypot(p.x - x, p.y - y);
      if (p.z > 0 && d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }
  const local = (e) => {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };

  canvas.addEventListener("pointerdown", (e) => {
    const [x, y] = local(e);
    dragging = { x, y, x0: x, y0: y };
    targetYaw = null;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const [x, y] = local(e);
    if (dragging) {
      // cap per-event velocity so a fast flick (or a coarse pointer) can't fling the globe
      vYaw = Math.max(-0.06, Math.min(0.06, (x - dragging.x) * 0.006));
      vPitch = Math.max(-0.06, Math.min(0.06, (y - dragging.y) * 0.006));
      yaw += vYaw;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + vPitch));
      dragging.x = x;
      dragging.y = y;
      return;
    }
    const k = nearest(x, y);
    hoverId = k?.id ?? null;
    canvas.style.cursor = k ? "pointer" : "grab";
  });
  const release = (e) => {
    if (!dragging) return;
    const [x, y] = local(e);
    if (Math.hypot(x - dragging.x0, y - dragging.y0) < 5) {
      // a tap: pin the tapped place, or unpin on empty space
      pinnedId = nearest(x, y)?.id ?? null;
      vYaw = vPitch = 0;
    }
    dragging = null;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => {
    hoverId = null;
  });

  // Rotate a place to the front and pin it (used by find + arrow keys).
  // Accepts a location id or the id of any place at that location.
  function select(id) {
    const k = keys.find((g) => g.id === id || g.entries.some((e) => e.id === id));
    if (!k) return;
    pinnedId = k.id;
    hoverId = null;
    // turn the place to face the viewer: longitude via yaw, latitude via pitch
    targetYaw = -k.lon * DEG;
    targetPitch = Math.max(-1.2, Math.min(1.2, k.lat * DEG));
    vYaw = vPitch = 0;
    cycleIdx = keys.indexOf(k);
  }
  function step(dir) {
    const i = keys.findIndex((k) => k.id === (pinnedId ?? focusId));
    select(keys[(i + dir + keys.length) % keys.length].id);
  }

  return {
    resize,
    draw,
    select,
    step,
    get focusId() {
      return focusId;
    },
  };
}
